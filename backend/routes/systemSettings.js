const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get all system settings
// @route   GET /api/admin/system-settings
// @access  Private/Admin
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system settings',
      error: error.message
    });
  }
});

// @desc    Get specific settings section
// @route   GET /api/admin/system-settings/:section
// @access  Private/Admin
router.get('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const settings = await SystemSettings.getSettings();
    
    if (!settings[section]) {
      return res.status(404).json({
        success: false,
        message: 'Settings section not found'
      });
    }
    
    res.status(200).json({
      success: true,
      section,
      settings: settings[section]
    });
  } catch (error) {
    console.error('Get settings section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching settings section',
      error: error.message
    });
  }
});

// @desc    Update system settings
// @route   PUT /api/admin/system-settings
// @access  Private/Admin
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    const settings = await SystemSettings.updateSettings(updates);
    
    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating system settings',
      error: error.message
    });
  }
});

// @desc    Update specific settings section
// @route   PUT /api/admin/system-settings/:section
// @access  Private/Admin
router.put('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const sectionUpdates = req.body;
    
    const settings = await SystemSettings.getSettings();
    
    if (!settings[section]) {
      return res.status(404).json({
        success: false,
        message: 'Settings section not found'
      });
    }
    
    // Deep merge the section updates
    settings[section] = { ...settings[section], ...sectionUpdates };
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `${section} settings updated successfully`,
      section,
      settings: settings[section]
    });
  } catch (error) {
    console.error('Update settings section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating settings section',
      error: error.message
    });
  }
});

// @desc    Reset settings to default
// @route   POST /api/admin/system-settings/reset
// @access  Private/Admin
router.post('/reset', async (req, res) => {
  try {
    const { section } = req.body;
    
    if (section) {
      // Reset specific section
      const settings = await SystemSettings.getSettings();
      const defaultSettings = new SystemSettings();
      settings[section] = defaultSettings[section];
      await settings.save();
      
      res.status(200).json({
        success: true,
        message: `${section} settings reset to default`,
        section,
        settings: settings[section]
      });
    } else {
      // Reset all settings
      await SystemSettings.deleteMany({});
      const newSettings = await SystemSettings.create({});
      
      res.status(200).json({
        success: true,
        message: 'All system settings reset to default',
        settings: newSettings
      });
    }
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting settings',
      error: error.message
    });
  }
});

// @desc    Test email configuration
// @route   POST /api/admin/system-settings/test-email
// @access  Private/Admin
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;
    const settings = await SystemSettings.getSettings();
    
    if (!settings.notifications.email.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Email notifications are disabled'
      });
    }
    
    // Here you would implement actual email sending logic
    // For now, we'll just simulate it
    const emailConfig = settings.notifications.email.smtpSettings;
    
    if (!emailConfig.host || !emailConfig.username) {
      return res.status(400).json({
        success: false,
        message: 'Email configuration is incomplete'
      });
    }
    
    // Simulate email test
    setTimeout(() => {
      res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        emailConfig: {
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure
        }
      });
    }, 1000);
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing email configuration',
      error: error.message
    });
  }
});

// @desc    Get system health status
// @route   GET /api/admin/system-settings/health
// @access  Private/Admin
router.get('/health/status', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Simulate system health metrics
    const healthMetrics = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        usage: Math.random() * 100,
        loadAverage: require('os').loadavg()
      },
      disk: {
        usage: Math.random() * 100,
        free: Math.random() * 1000000000
      },
      database: {
        status: 'connected',
        responseTime: Math.random() * 100
      },
      lastBackup: new Date(Date.now() - Math.random() * 86400000),
      activeUsers: Math.floor(Math.random() * 100),
      activeBookings: Math.floor(Math.random() * 50)
    };
    
    // Check against thresholds
    const thresholds = settings.maintenance.systemHealth.alertThresholds;
    const alerts = [];
    
    if (healthMetrics.cpu.usage > thresholds.cpuUsage) {
      alerts.push({
        type: 'warning',
        message: `CPU usage (${healthMetrics.cpu.usage.toFixed(1)}%) exceeds threshold (${thresholds.cpuUsage}%)`
      });
    }
    
    if (healthMetrics.disk.usage > thresholds.diskUsage) {
      alerts.push({
        type: 'critical',
        message: `Disk usage (${healthMetrics.disk.usage.toFixed(1)}%) exceeds threshold (${thresholds.diskUsage}%)`
      });
    }
    
    res.status(200).json({
      success: true,
      health: healthMetrics,
      alerts,
      monitoringEnabled: settings.maintenance.systemHealth.monitoringEnabled
    });
    
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking system health',
      error: error.message
    });
  }
});

// @desc    Toggle maintenance mode
// @route   POST /api/admin/system-settings/maintenance
// @access  Private/Admin
router.post('/maintenance/toggle', async (req, res) => {
  try {
    const { enabled, message, scheduledStart, scheduledEnd } = req.body;
    const settings = await SystemSettings.getSettings();
    
    settings.maintenance.maintenanceMode.enabled = enabled;
    if (message) settings.maintenance.maintenanceMode.message = message;
    if (scheduledStart) settings.maintenance.maintenanceMode.scheduledStart = scheduledStart;
    if (scheduledEnd) settings.maintenance.maintenanceMode.scheduledEnd = scheduledEnd;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      maintenanceMode: settings.maintenance.maintenanceMode
    });
    
  } catch (error) {
    console.error('Toggle maintenance mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling maintenance mode',
      error: error.message
    });
  }
});

// @desc    Create system backup
// @route   POST /api/admin/system-settings/backup
// @access  Private/Admin
router.post('/backup/create', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const backupConfig = settings.maintenance.backupSettings;
    
    if (!backupConfig.autoBackup) {
      return res.status(400).json({
        success: false,
        message: 'Backup system is disabled'
      });
    }
    
    // Simulate backup creation
    const backupId = `backup_${Date.now()}`;
    const backupInfo = {
      id: backupId,
      timestamp: new Date(),
      size: Math.floor(Math.random() * 1000000000), // Random size in bytes
      location: backupConfig.backupLocation,
      status: 'completed',
      tables: ['users', 'bookings', 'cars', 'systemsettings'],
      duration: Math.floor(Math.random() * 300) // Random duration in seconds
    };
    
    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      backup: backupInfo
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
// @route   GET /api/admin/system-settings/backup/history
// @access  Private/Admin
router.get('/backup/history', async (req, res) => {
  try {
    // Simulate backup history
    const backups = Array.from({ length: 10 }, (_, i) => ({
      id: `backup_${Date.now() - i * 86400000}`,
      timestamp: new Date(Date.now() - i * 86400000),
      size: Math.floor(Math.random() * 1000000000),
      status: Math.random() > 0.1 ? 'completed' : 'failed',
      duration: Math.floor(Math.random() * 300),
      type: i === 0 ? 'manual' : 'automatic'
    }));
    
    res.status(200).json({
      success: true,
      backups: backups.sort((a, b) => b.timestamp - a.timestamp)
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

// @desc    Export settings configuration
// @route   GET /api/admin/system-settings/export
// @access  Private/Admin
router.get('/export', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Remove sensitive information before export
    const exportData = JSON.parse(JSON.stringify(settings));
    
    // Remove sensitive fields
    if (exportData.notifications?.email?.smtpSettings) {
      delete exportData.notifications.email.smtpSettings.password;
    }
    if (exportData.payment?.paymentGateways) {
      Object.keys(exportData.payment.paymentGateways).forEach(gateway => {
        if (exportData.payment.paymentGateways[gateway].secretKey) {
          delete exportData.payment.paymentGateways[gateway].secretKey;
        }
        if (exportData.payment.paymentGateways[gateway].clientSecret) {
          delete exportData.payment.paymentGateways[gateway].clientSecret;
        }
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="system-settings-${Date.now()}.json"`);
    
    res.status(200).json({
      success: true,
      exportDate: new Date(),
      version: '1.0',
      settings: exportData
    });
    
  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting settings',
      error: error.message
    });
  }
});

// @desc    Import settings configuration
// @route   POST /api/admin/system-settings/import
// @access  Private/Admin
router.post('/import', async (req, res) => {
  try {
    const { settings: importedSettings, overwrite = false } = req.body;
    
    if (!importedSettings) {
      return res.status(400).json({
        success: false,
        message: 'No settings data provided for import'
      });
    }
    
    let settings;
    if (overwrite) {
      // Replace all settings
      await SystemSettings.deleteMany({});
      settings = await SystemSettings.create(importedSettings);
    } else {
      // Merge with existing settings
      settings = await SystemSettings.getSettings();
      Object.assign(settings, importedSettings);
      await settings.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Settings imported successfully',
      imported: Object.keys(importedSettings).length,
      settings
    });
    
  } catch (error) {
    console.error('Import settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while importing settings',
      error: error.message
    });
  }
});

module.exports = router;
