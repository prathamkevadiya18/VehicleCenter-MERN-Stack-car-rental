const express = require('express');
const SystemLog = require('../models/SystemLog');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get system logs with filtering and pagination
// @route   GET /api/admin/system-logs
// @access  Private/Admin
router.get('/', async (req, res) => {
  try {
    const {
      level,
      category,
      startDate,
      endDate,
      userId,
      entity,
      severity,
      page = 1,
      limit = 50,
      search
    } = req.query;

    // Build query
    let query = {};
    
    if (level) query.level = level;
    if (category) query.category = category;
    if (userId) query['user.userId'] = userId;
    if (entity) query['changes.entity'] = entity;
    if (severity) query['metadata.severity'] = severity;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Text search
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { event: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await SystemLog.find(query)
      .populate('user.userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SystemLog.countDocuments(query);

    // Get summary statistics
    const stats = await SystemLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]);

    const levelStats = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
      trace: 0
    };

    stats.forEach(stat => {
      levelStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      stats: levelStats,
      logs
    });

  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system logs',
      error: error.message
    });
  }
});

// @desc    Get specific log by ID
// @route   GET /api/admin/system-logs/:id
// @access  Private/Admin
router.get('/:id', async (req, res) => {
  try {
    const log = await SystemLog.findById(req.params.id)
      .populate('user.userId', 'firstName lastName email')
      .populate('metadata.resolvedBy', 'firstName lastName email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log entry not found'
      });
    }

    res.status(200).json({
      success: true,
      log
    });

  } catch (error) {
    console.error('Get log by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching log entry',
      error: error.message
    });
  }
});

// @desc    Get audit trail for specific entity
// @route   GET /api/admin/system-logs/audit/:entity/:entityId
// @access  Private/Admin
router.get('/audit/:entity/:entityId', async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const logs = await SystemLog.find({
      'changes.entity': entity,
      'changes.entityId': entityId
    })
      .populate('user.userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SystemLog.countDocuments({
      'changes.entity': entity,
      'changes.entityId': entityId
    });

    res.status(200).json({
      success: true,
      entity,
      entityId,
      count: logs.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      auditTrail: logs
    });

  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching audit trail',
      error: error.message
    });
  }
});

// @desc    Get system analytics and insights
// @route   GET /api/admin/system-logs/analytics
// @access  Private/Admin
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
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

    // Get log level distribution
    const levelDistribution = await SystemLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get category distribution
    const categoryDistribution = await SystemLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get timeline data
    const timeline = await SystemLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            level: '$level'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get top error messages
    const topErrors = await SystemLog.aggregate([
      { 
        $match: { 
          level: 'error',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$message',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get user activity
    const userActivity = await SystemLog.aggregate([
      { 
        $match: { 
          'user.userId': { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$user.userId',
          count: { $sum: 1 },
          email: { $first: '$user.email' },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get security events
    const securityEvents = await SystemLog.aggregate([
      { 
        $match: { 
          category: 'security',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$security.threatLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      period,
      analytics: {
        levelDistribution,
        categoryDistribution,
        timeline,
        topErrors,
        userActivity,
        securityEvents,
        totalLogs: await SystemLog.countDocuments({ createdAt: { $gte: startDate } })
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating analytics',
      error: error.message
    });
  }
});

// @desc    Resolve log entry (mark as resolved)
// @route   PUT /api/admin/system-logs/:id/resolve
// @access  Private/Admin
router.put('/:id/resolve', async (req, res) => {
  try {
    const { notes } = req.body;

    const log = await SystemLog.findByIdAndUpdate(
      req.params.id,
      {
        'metadata.resolved': true,
        'metadata.resolvedBy': req.user.id,
        'metadata.resolvedAt': new Date(),
        'metadata.notes': notes
      },
      { new: true }
    ).populate('metadata.resolvedBy', 'firstName lastName email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log entry not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Log entry resolved successfully',
      log
    });

  } catch (error) {
    console.error('Resolve log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving log entry',
      error: error.message
    });
  }
});

// @desc    Bulk resolve log entries
// @route   PUT /api/admin/system-logs/bulk/resolve
// @access  Private/Admin
router.put('/bulk/resolve', async (req, res) => {
  try {
    const { logIds, notes } = req.body;

    if (!Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log IDs provided'
      });
    }

    const result = await SystemLog.updateMany(
      { _id: { $in: logIds } },
      {
        'metadata.resolved': true,
        'metadata.resolvedBy': req.user.id,
        'metadata.resolvedAt': new Date(),
        'metadata.notes': notes
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} log entries resolved successfully`,
      resolved: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk resolve logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving log entries',
      error: error.message
    });
  }
});

// @desc    Delete old logs (cleanup)
// @route   DELETE /api/admin/system-logs/cleanup
// @access  Private/Admin
router.delete('/cleanup', async (req, res) => {
  try {
    const { olderThan = 90, level } = req.body; // days
    
    const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
    
    let query = { createdAt: { $lt: cutoffDate } };
    if (level) query.level = level;

    const result = await SystemLog.deleteMany(query);

    // Log the cleanup action
    await SystemLog.info('log_cleanup', `Cleaned up ${result.deletedCount} log entries older than ${olderThan} days`, {
      category: 'maintenance',
      user: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      metadata: {
        severity: 'low'
      }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} log entries deleted successfully`,
      deleted: result.deletedCount,
      cutoffDate
    });

  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cleaning up logs',
      error: error.message
    });
  }
});

// @desc    Export logs
// @route   GET /api/admin/system-logs/export
// @access  Private/Admin
router.get('/export/download', async (req, res) => {
  try {
    const {
      level,
      category,
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    // Build query
    let query = {};
    if (level) query.level = level;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await SystemLog.find(query)
      .populate('user.userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10000); // Limit for performance

    let exportData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Timestamp,Level,Category,Event,Message,User,IP Address\n';
      const csvData = logs.map(log => {
        const timestamp = log.createdAt.toISOString();
        const user = log.user?.email || 'System';
        const ip = log.user?.ipAddress || 'N/A';
        return `"${timestamp}","${log.level}","${log.category}","${log.event}","${log.message}","${user}","${ip}"`;
      }).join('\n');
      
      exportData = csvHeaders + csvData;
      contentType = 'text/csv';
      filename = `system-logs-${Date.now()}.csv`;
    } else {
      // JSON format
      exportData = JSON.stringify({
        exportDate: new Date(),
        totalLogs: logs.length,
        filters: { level, category, startDate, endDate },
        logs
      }, null, 2);
      contentType = 'application/json';
      filename = `system-logs-${Date.now()}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);

  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting logs',
      error: error.message
    });
  }
});

module.exports = router;
