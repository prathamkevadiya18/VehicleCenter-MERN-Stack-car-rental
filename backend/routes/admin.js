const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const SystemLog = require('../models/SystemLog');
const Notification = require('../models/Notification');
const backupManager = require('../utils/backupManager');
const maintenanceManager = require('../utils/maintenanceManager');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalCars = await Car.countDocuments({ isActive: true });
    const availableCars = await Car.countDocuments({ 
      isActive: true, 
      'availability.isAvailable': true,
      'availability.isUnderMaintenance': false
    });

    // Format booking stats
    const formattedBookingStats = {
      total: totalBookings,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    bookingStats.forEach(stat => {
      formattedBookingStats[stat._id.toLowerCase()] = stat.count;
    });

    // Calculate revenue (mock calculation)
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('user', 'firstName lastName email')
      .populate('car', 'name model')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      dashboard: {
        stats: {
          totalBookings,
          totalUsers,
          totalCars,
          availableCars,
          revenue
        },
        bookingStats: formattedBookingStats,
        recentBookings
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data',
      error: error.message
    });
  }
});

// @desc    Get all bookings for admin
// @route   GET /api/admin/bookings
// @access  Private/Admin
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email phone')
      .populate('car', 'name model brand')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      bookings
    });

  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
      error: error.message
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/admin/bookings/:id/status
// @access  Private/Admin
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const { status: inputStatus, adminNotes } = req.body;

    // Validate and normalize status
    if (!inputStatus || typeof inputStatus !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Status is required and must be a string',
        error: 'MissingOrInvalidStatus'
      });
    }
    
    const normalizedStatus = inputStatus.charAt(0).toUpperCase() + inputStatus.slice(1).toLowerCase();
    const allowedStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        error: `Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    // Build update object
    const updateData = { status: normalizedStatus };
    if (typeof adminNotes !== 'undefined') {
      updateData.adminNotes = adminNotes;
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user car');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    // Provide clearer feedback for common error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error during booking status update',
        errors: error.errors,
        error: error.message
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking id',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during booking status update',
      error: error.message
    });
  }
});

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;

    let query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      users
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
});

// @desc    Create new user (admin)
// @route   POST /api/admin/users
// @access  Private/Admin
router.post('/users', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      role,
      isActive: true,
      // Generate a temporary password (user will need to reset)
      password: 'temp123', // This should be changed on first login
      emailVerified: false
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating user',
      error: error.message
    });
  }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user status update',
      error: error.message
    });
  }
});

// @desc    Get all cars for admin
// @route   GET /api/admin/cars
// @access  Private/Admin
router.get('/cars', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isActive } = req.query;

    let query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const cars = await Car.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Car.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cars.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      cars
    });

  } catch (error) {
    console.error('Admin get cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cars',
      error: error.message
    });
  }
});

// @desc    Create new car (admin)
// @route   POST /api/admin/cars
// @access  Private/Admin
router.post('/cars', async (req, res) => {
  try {
    const { name, model, brand, category, location, pricePerDay, available = true } = req.body;

    // Create new car
    const car = new Car({
      name,
      model,
      brand,
      category,
      location,
      pricePerDay: Number(pricePerDay) || 0,
      isActive: true,
      availability: {
        isAvailable: available,
        isUnderMaintenance: false
      },
      features: [],
      images: [] // For now, we'll handle image upload separately
    });

    await car.save();

    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      car
    });

  } catch (error) {
    console.error('Create car error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating car',
      error: error.message
    });
  }
});

// @desc    Update car availability
// @route   PUT /api/admin/cars/:id/availability
// @access  Private/Admin
router.put('/cars/:id/availability', async (req, res) => {
  try {
    const { isAvailable, isUnderMaintenance } = req.body;

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { 
        'availability.isAvailable': isAvailable,
        'availability.isUnderMaintenance': isUnderMaintenance
      },
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Car availability updated successfully',
      car
    });

  } catch (error) {
    console.error('Update car availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during car availability update',
      error: error.message
    });
  }
});

// @desc    Get revenue reports
// @route   GET /api/admin/reports/revenue
// @access  Private/Admin
router.get('/reports/revenue', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let matchStage = { status: 'Completed' };
    let groupStage = {};

    // Define date grouping based on period
    if (period === 'day') {
      groupStage = {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        }
      };
    } else if (period === 'week') {
      groupStage = {
        _id: {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        }
      };
    } else {
      groupStage = {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        }
      };
    }

    const revenueData = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    const totalRevenue = await Booking.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      revenueData
    });

  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating revenue report',
      error: error.message
    });
  }
});

// @desc    Get system health status
// @route   GET /api/admin/system/health
// @access  Private/Admin
router.get('/system/health', async (req, res) => {
  try {
    const health = await maintenanceManager.getSystemHealth();
    
    res.status(200).json({
      success: true,
      health
    });

  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking system health',
      error: error.message
    });
  }
});

// @desc    Perform database maintenance
// @route   POST /api/admin/system/maintenance/database
// @access  Private/Admin
router.post('/system/maintenance/database', async (req, res) => {
  try {
    const result = await maintenanceManager.performDatabaseMaintenance();
    
    res.status(200).json({
      success: true,
      message: 'Database maintenance completed successfully',
      result
    });

  } catch (error) {
    console.error('Database maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during database maintenance',
      error: error.message
    });
  }
});

// @desc    Perform file system maintenance
// @route   POST /api/admin/system/maintenance/filesystem
// @access  Private/Admin
router.post('/system/maintenance/filesystem', async (req, res) => {
  try {
    const result = await maintenanceManager.performFileSystemMaintenance();
    
    res.status(200).json({
      success: true,
      message: 'File system maintenance completed successfully',
      result
    });

  } catch (error) {
    console.error('File system maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file system maintenance',
      error: error.message
    });
  }
});

// @desc    Perform security maintenance
// @route   POST /api/admin/system/maintenance/security
// @access  Private/Admin
router.post('/system/maintenance/security', async (req, res) => {
  try {
    const result = await maintenanceManager.performSecurityMaintenance();
    
    res.status(200).json({
      success: true,
      message: 'Security maintenance completed successfully',
      result
    });

  } catch (error) {
    console.error('Security maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during security maintenance',
      error: error.message
    });
  }
});

// @desc    Create system backup
// @route   POST /api/admin/system/backup/create
// @access  Private/Admin
router.post('/system/backup/create', async (req, res) => {
  try {
    const { type = 'database' } = req.body;
    
    let result;
    if (type === 'database') {
      result = await backupManager.createDatabaseBackup({ type: 'manual' });
    } else if (type === 'files') {
      result = await backupManager.createFilesBackup(['uploads', 'logs'], { type: 'manual' });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup type. Use "database" or "files"'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${type} backup created successfully`,
      backup: result
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating backup',
      error: error.message
    });
  }
});

// @desc    Get backup history
// @route   GET /api/admin/system/backup/history
// @access  Private/Admin
router.get('/system/backup/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const backups = await backupManager.getBackupHistory(Number(limit));
    
    res.status(200).json({
      success: true,
      count: backups.length,
      backups
    });

  } catch (error) {
    console.error('Get backup history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching backup history',
      error: error.message
    });
  }
});

// @desc    Restore from backup
// @route   POST /api/admin/system/backup/restore
// @access  Private/Admin
router.post('/system/backup/restore', async (req, res) => {
  try {
    const { backupFile, clearExisting = false } = req.body;
    
    if (!backupFile) {
      return res.status(400).json({
        success: false,
        message: 'Backup file path is required'
      });
    }
    
    const result = await backupManager.restoreDatabase(backupFile, { clearExisting });
    
    res.status(200).json({
      success: true,
      message: 'Database restored successfully',
      restore: result
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while restoring backup',
      error: error.message
    });
  }
});

// @desc    Get comprehensive admin dashboard with all system info
// @route   GET /api/admin/dashboard/comprehensive
// @access  Private/Admin
router.get('/dashboard/comprehensive', async (req, res) => {
  try {
    // Get existing dashboard data
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalCars = await Car.countDocuments({ isActive: true });
    const availableCars = await Car.countDocuments({ 
      isActive: true, 
      'availability.isAvailable': true,
      'availability.isUnderMaintenance': false
    });

    // Get system health
    const systemHealth = await maintenanceManager.getSystemHealth();
    
    // Get recent system logs
    const recentLogs = await SystemLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('level category event message createdAt');
    
    // Get notification stats
    const notificationStats = await Notification.aggregate([
      {
        $group: {
          _id: '$delivery.status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get system settings status
    const systemSettings = await SystemSettings.getSettings();
    
    // Get backup info
    const recentBackups = await backupManager.getBackupHistory(5);

    res.status(200).json({
      success: true,
      dashboard: {
        // Core business metrics
        business: {
          totalBookings,
          totalUsers,
          totalCars,
          availableCars,
          bookingStats
        },
        // System health and performance
        system: {
          health: systemHealth,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        },
        // Logs and monitoring
        monitoring: {
          recentLogs,
          totalLogs: await SystemLog.countDocuments(),
          errorLogs: await SystemLog.countDocuments({ level: 'error' }),
          warningLogs: await SystemLog.countDocuments({ level: 'warn' })
        },
        // Notifications
        notifications: {
          stats: notificationStats,
          total: await Notification.countDocuments(),
          pending: await Notification.countDocuments({ 'delivery.status': 'pending' }),
          failed: await Notification.countDocuments({ 'delivery.status': 'failed' })
        },
        // Backups and maintenance
        maintenance: {
          recentBackups,
          maintenanceMode: systemSettings.maintenance.maintenanceMode.enabled,
          autoBackup: systemSettings.maintenance.backupSettings.autoBackup,
          lastBackup: recentBackups[0]?.created || null
        },
        // Security
        security: {
          securityEvents: await SystemLog.countDocuments({ category: 'security' }),
          criticalEvents: await SystemLog.countDocuments({ 
            category: 'security', 
            'security.threatLevel': 'critical' 
          }),
          failedLogins: await SystemLog.countDocuments({ 
            category: 'authentication', 
            level: 'warn',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })
        }
      }
    });

  } catch (error) {
    console.error('Comprehensive dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching comprehensive dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
