const express = require('express');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get all notifications with filtering and pagination
// @route   GET /api/admin/notifications
// @access  Private/Admin
router.get('/', async (req, res) => {
  try {
    const {
      type,
      category,
      status,
      priority,
      startDate,
      endDate,
      userId,
      campaignId,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    let query = {};
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query['delivery.status'] = status;
    if (priority) query.priority = priority;
    if (userId) query['recipient.userId'] = userId;
    if (campaignId) query['campaign.campaignId'] = campaignId;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .populate('recipient.userId', 'firstName lastName email')
      .populate('metadata.createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);

    // Get delivery statistics
    const deliveryStats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$delivery.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0
    };

    deliveryStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      stats,
      notifications
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
      error: error.message
    });
  }
});

// @desc    Get notification by ID
// @route   GET /api/admin/notifications/:id
// @access  Private/Admin
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('recipient.userId', 'firstName lastName email phone')
      .populate('metadata.createdBy', 'firstName lastName email')
      .populate('relatedEntities.bookingId')
      .populate('relatedEntities.carId');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Get notification by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification',
      error: error.message
    });
  }
});

// @desc    Create new notification
// @route   POST /api/admin/notifications
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const {
      type,
      category,
      recipient,
      content,
      priority = 'normal',
      importance = 'informational',
      scheduling,
      template,
      campaign,
      relatedEntities
    } = req.body;

    const notificationData = {
      type,
      category,
      recipient,
      content,
      priority,
      importance,
      scheduling: scheduling || { sendAt: new Date() },
      template,
      campaign,
      relatedEntities,
      metadata: {
        source: 'admin',
        createdBy: req.user.id
      }
    };

    let notification;
    
    switch (type) {
      case 'email':
        notification = await Notification.createEmailNotification(recipient, content, {
          category,
          priority,
          importance,
          scheduling,
          template,
          campaign,
          relatedEntities,
          source: 'admin',
          createdBy: req.user.id
        });
        break;
      case 'sms':
        notification = await Notification.createSMSNotification(recipient, content, {
          category,
          priority,
          importance,
          scheduling,
          campaign,
          relatedEntities,
          source: 'admin',
          createdBy: req.user.id
        });
        break;
      case 'push':
        notification = await Notification.createPushNotification(recipient, content, {
          category,
          priority,
          importance,
          scheduling,
          campaign,
          relatedEntities,
          source: 'admin',
          createdBy: req.user.id
        });
        break;
      default:
        notification = new Notification(notificationData);
        await notification.save();
    }

    // Log the notification creation
    await SystemLog.auditCreate('Notification', notification._id, notification, {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification',
      error: error.message
    });
  }
});

// @desc    Send notification immediately
// @route   POST /api/admin/notifications/:id/send
// @access  Private/Admin
router.post('/:id/send', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.delivery.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Notification has already been processed'
      });
    }

    // Simulate sending notification
    const mockResponse = {
      trackingId: `track_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      status: 'sent',
      timestamp: new Date()
    };

    await notification.markAsSent(mockResponse);

    // Log the send action
    await SystemLog.info('notification_sent', `Notification ${notification.notificationId} sent manually`, {
      category: 'notification',
      user: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      changes: {
        entity: 'Notification',
        entityId: notification._id,
        action: 'update'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      notification,
      providerResponse: mockResponse
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notification',
      error: error.message
    });
  }
});

// @desc    Bulk send notifications
// @route   POST /api/admin/notifications/bulk/send
// @access  Private/Admin
router.post('/bulk/send', async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification IDs provided'
      });
    }

    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      'delivery.status': 'pending'
    });

    const results = [];

    for (const notification of notifications) {
      try {
        const mockResponse = {
          trackingId: `track_${Date.now()}`,
          messageId: `msg_${Date.now()}`,
          status: 'sent',
          timestamp: new Date()
        };

        await notification.markAsSent(mockResponse);
        results.push({
          id: notification._id,
          status: 'sent',
          trackingId: mockResponse.trackingId
        });
      } catch (error) {
        results.push({
          id: notification._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    // Log bulk send action
    await SystemLog.info('notifications_bulk_sent', `Bulk sent ${successCount} notifications, ${failureCount} failed`, {
      category: 'notification',
      user: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

    res.status(200).json({
      success: true,
      message: `Bulk send completed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: notificationIds.length,
        sent: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Bulk send notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while bulk sending notifications',
      error: error.message
    });
  }
});

// @desc    Get notification analytics
// @route   GET /api/admin/notifications/analytics
// @access  Private/Admin
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { period = '7d', type, category } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    let matchQuery = { createdAt: { $gte: startDate } };
    if (type) matchQuery.type = type;
    if (category) matchQuery.category = category;

    // Delivery rate analytics
    const deliveryRates = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$delivery.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Type distribution
    const typeDistribution = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$delivery.status', 'delivered'] }, 1, 0]
            }
          },
          opened: {
            $sum: {
              $cond: [{ $eq: ['$delivery.status', 'opened'] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $eq: ['$delivery.status', 'clicked'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Timeline data
    const timeline = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: '$delivery.status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Campaign performance
    const campaignPerformance = await Notification.aggregate([
      { 
        $match: { 
          ...matchQuery,
          'campaign.campaignId': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$campaign.campaignId',
          campaignName: { $first: '$campaign.campaignName' },
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [{ $ne: ['$delivery.status', 'pending'] }, 1, 0]
            }
          },
          delivered: {
            $sum: {
              $cond: [{ $in: ['$delivery.status', ['delivered', 'opened', 'clicked']] }, 1, 0]
            }
          },
          opened: {
            $sum: {
              $cond: [{ $in: ['$delivery.status', ['opened', 'clicked']] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $eq: ['$delivery.status', 'clicked'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Calculate rates
    const totalNotifications = await Notification.countDocuments(matchQuery);
    const deliveryRate = deliveryRates.reduce((acc, curr) => {
      if (['delivered', 'opened', 'clicked'].includes(curr._id)) {
        return acc + curr.count;
      }
      return acc;
    }, 0) / totalNotifications * 100;

    const openRate = deliveryRates.find(d => ['opened', 'clicked'].includes(d._id))?.count || 0;
    const clickRate = deliveryRates.find(d => d._id === 'clicked')?.count || 0;

    res.status(200).json({
      success: true,
      period,
      analytics: {
        summary: {
          totalNotifications,
          deliveryRate: deliveryRate.toFixed(2),
          openRate: ((openRate / totalNotifications) * 100).toFixed(2),
          clickRate: ((clickRate / totalNotifications) * 100).toFixed(2)
        },
        deliveryRates,
        typeDistribution,
        timeline,
        campaignPerformance
      }
    });

  } catch (error) {
    console.error('Get notification analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating analytics',
      error: error.message
    });
  }
});

// @desc    Create notification template
// @route   POST /api/admin/notifications/templates
// @access  Private/Admin
router.post('/templates', async (req, res) => {
  try {
    const {
      name,
      type,
      category,
      subject,
      content,
      variables = [],
      isActive = true
    } = req.body;

    // This would typically be stored in a separate NotificationTemplate model
    // For now, we'll simulate template creation
    const template = {
      id: `template_${Date.now()}`,
      name,
      type,
      category,
      subject,
      content,
      variables,
      isActive,
      createdBy: req.user.id,
      createdAt: new Date()
    };

    // Log template creation
    await SystemLog.info('notification_template_created', `Notification template '${name}' created`, {
      category: 'notification',
      user: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

    res.status(201).json({
      success: true,
      message: 'Notification template created successfully',
      template
    });

  } catch (error) {
    console.error('Create notification template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification template',
      error: error.message
    });
  }
});

// @desc    Test notification delivery
// @route   POST /api/admin/notifications/test
// @access  Private/Admin
router.post('/test', async (req, res) => {
  try {
    const { type, recipient, content } = req.body;

    const testNotification = {
      type,
      category: 'system',
      recipient,
      content: {
        ...content,
        subject: `[TEST] ${content.subject}`
      },
      priority: 'normal',
      campaign: {
        campaignId: 'test_campaign',
        campaignName: 'Test Campaign',
        isTest: true
      },
      metadata: {
        source: 'admin',
        createdBy: req.user.id
      }
    };

    // Simulate sending test notification
    const mockResponse = {
      success: true,
      trackingId: `test_${Date.now()}`,
      messageId: `test_msg_${Date.now()}`,
      deliveryTime: Math.random() * 1000 + 500 // 500-1500ms
    };

    // Log test notification
    await SystemLog.info('test_notification_sent', `Test ${type} notification sent to ${recipient.email || recipient.phone}`, {
      category: 'notification',
      user: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

    res.status(200).json({
      success: true,
      message: `Test ${type} notification sent successfully`,
      testResult: mockResponse,
      notification: testNotification
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing notification',
      error: error.message
    });
  }
});

// @desc    Update notification delivery status (webhook endpoint)
// @route   POST /api/admin/notifications/:id/status
// @access  Private/Admin
router.post('/:id/status', async (req, res) => {
  try {
    const { status, analyticsData } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    switch (status) {
      case 'delivered':
        await notification.markAsDelivered();
        break;
      case 'opened':
        await notification.markAsOpened(analyticsData);
        break;
      case 'clicked':
        await notification.markAsClicked(analyticsData);
        break;
      case 'failed':
        await notification.markAsFailed(req.body.reason);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid status provided'
        });
    }

    res.status(200).json({
      success: true,
      message: `Notification status updated to ${status}`,
      notification
    });

  } catch (error) {
    console.error('Update notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification status',
      error: error.message
    });
  }
});

module.exports = router;
