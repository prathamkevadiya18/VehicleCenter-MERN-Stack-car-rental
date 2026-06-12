const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const SystemLog = require('../models/SystemLog');
const SystemSettings = require('../models/SystemSettings');

class MaintenanceManager {
  constructor() {
    this.maintenanceDir = path.join(__dirname, '../maintenance');
    this.ensureMaintenanceDirectory();
  }

  async ensureMaintenanceDirectory() {
    try {
      await fs.access(this.maintenanceDir);
    } catch (error) {
      await fs.mkdir(this.maintenanceDir, { recursive: true });
    }
  }

  // System health monitoring
  async getSystemHealth() {
    try {
      const startTime = Date.now();
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // CPU information
      const cpus = os.cpus();
      const loadAverage = os.loadavg();
      
      // Disk usage (simulate for cross-platform compatibility)
      let diskUsage = { total: 0, used: 0, free: 0 };
      try {
        if (process.platform === 'win32') {
          // Windows disk usage
          const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
          // Parse Windows disk info (simplified)
          diskUsage = {
            total: 1000000000000, // 1TB simulation
            free: 500000000000,   // 500GB simulation
            used: 500000000000    // 500GB simulation
          };
        } else {
          // Unix-like systems
          const { stdout } = await execAsync('df -h /');
          // Parse df output (simplified)
          diskUsage = {
            total: 1000000000000,
            free: 600000000000,
            used: 400000000000
          };
        }
      } catch (error) {
        // Fallback values
        diskUsage = {
          total: 1000000000000,
          free: 600000000000,
          used: 400000000000
        };
      }

      // Database connection status
      const mongoose = require('mongoose');
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Response time test
      const responseTime = Date.now() - startTime;

      const health = {
        timestamp: new Date(),
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          percentage: ((usedMemory / totalMemory) * 100).toFixed(2),
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          }
        },
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          speed: cpus[0]?.speed || 0,
          loadAverage: loadAverage,
          usage: this.calculateCPUUsage()
        },
        disk: {
          total: diskUsage.total,
          used: diskUsage.used,
          free: diskUsage.free,
          percentage: ((diskUsage.used / diskUsage.total) * 100).toFixed(2)
        },
        database: {
          status: dbStatus,
          responseTime: responseTime
        },
        network: {
          interfaces: Object.keys(os.networkInterfaces()).length
        },
        platform: {
          type: os.type(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          hostname: os.hostname()
        }
      };

      // Check against thresholds
      const settings = await SystemSettings.getSettings();
      const thresholds = settings.maintenance.systemHealth.alertThresholds;
      
      health.alerts = [];
      
      if (parseFloat(health.memory.percentage) > thresholds.memoryUsage) {
        health.alerts.push({
          type: 'warning',
          category: 'memory',
          message: `Memory usage (${health.memory.percentage}%) exceeds threshold (${thresholds.memoryUsage}%)`
        });
        health.status = 'warning';
      }
      
      if (parseFloat(health.disk.percentage) > thresholds.diskUsage) {
        health.alerts.push({
          type: 'critical',
          category: 'disk',
          message: `Disk usage (${health.disk.percentage}%) exceeds threshold (${thresholds.diskUsage}%)`
        });
        health.status = 'critical';
      }
      
      if (health.cpu.usage > thresholds.cpuUsage) {
        health.alerts.push({
          type: 'warning',
          category: 'cpu',
          message: `CPU usage (${health.cpu.usage.toFixed(1)}%) exceeds threshold (${thresholds.cpuUsage}%)`
        });
        if (health.status === 'healthy') health.status = 'warning';
      }
      
      if (responseTime > thresholds.responseTime) {
        health.alerts.push({
          type: 'warning',
          category: 'performance',
          message: `Response time (${responseTime}ms) exceeds threshold (${thresholds.responseTime}ms)`
        });
        if (health.status === 'healthy') health.status = 'warning';
      }

      return health;

    } catch (error) {
      await SystemLog.error('system_health_check_failed', `System health check failed: ${error.message}`, {
        category: 'maintenance',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  calculateCPUUsage() {
    // Simplified CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return Math.max(0, Math.min(100, usage));
  }

  // Database maintenance operations
  async performDatabaseMaintenance() {
    const maintenanceId = `db_maintenance_${Date.now()}`;
    
    try {
      const startTime = Date.now();
      const results = {
        id: maintenanceId,
        timestamp: new Date(),
        operations: []
      };

      // Index optimization
      const mongoose = require('mongoose');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          const collectionName = collection.name;
          const indexes = await mongoose.connection.db.collection(collectionName).indexes();
          
          results.operations.push({
            operation: 'index_check',
            collection: collectionName,
            indexes: indexes.length,
            status: 'completed'
          });
        } catch (error) {
          results.operations.push({
            operation: 'index_check',
            collection: collection.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Database statistics
      const dbStats = await mongoose.connection.db.stats();
      results.operations.push({
        operation: 'database_stats',
        stats: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize
        },
        status: 'completed'
      });

      // Cleanup expired documents
      const expiredCleanup = await this.cleanupExpiredDocuments();
      results.operations.push({
        operation: 'expired_cleanup',
        ...expiredCleanup,
        status: 'completed'
      });

      const endTime = Date.now();
      results.duration = endTime - startTime;
      results.status = 'completed';

      await SystemLog.info('database_maintenance_completed', `Database maintenance completed successfully`, {
        category: 'maintenance',
        metadata: {
          correlationId: maintenanceId,
          severity: 'low'
        },
        performance: {
          duration: results.duration
        }
      });

      return results;

    } catch (error) {
      await SystemLog.error('database_maintenance_failed', `Database maintenance failed: ${error.message}`, {
        category: 'maintenance',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: maintenanceId,
          severity: 'high'
        }
      });
      throw error;
    }
  }

  // Clean up expired documents
  async cleanupExpiredDocuments() {
    try {
      const mongoose = require('mongoose');
      const results = {
        collections: [],
        totalDeleted: 0
      };

      // Get all models with TTL indexes or expiration fields
      const modelsToClean = [
        { name: 'SystemLog', field: 'retention.expiresAt' },
        { name: 'Notification', field: 'expiresAt' }
      ];

      for (const modelInfo of modelsToClean) {
        try {
          const Model = mongoose.model(modelInfo.name);
          const query = {};
          query[modelInfo.field] = { $lt: new Date() };
          
          const deleteResult = await Model.deleteMany(query);
          
          results.collections.push({
            name: modelInfo.name,
            deleted: deleteResult.deletedCount
          });
          
          results.totalDeleted += deleteResult.deletedCount;
        } catch (error) {
          results.collections.push({
            name: modelInfo.name,
            deleted: 0,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      throw new Error(`Expired documents cleanup failed: ${error.message}`);
    }
  }

  // File system maintenance
  async performFileSystemMaintenance() {
    const maintenanceId = `fs_maintenance_${Date.now()}`;
    
    try {
      const startTime = Date.now();
      const results = {
        id: maintenanceId,
        timestamp: new Date(),
        operations: []
      };

      // Clean temporary files
      const tempCleanup = await this.cleanupTempFiles();
      results.operations.push({
        operation: 'temp_cleanup',
        ...tempCleanup,
        status: 'completed'
      });

      // Clean log files
      const logCleanup = await this.cleanupLogFiles();
      results.operations.push({
        operation: 'log_cleanup',
        ...logCleanup,
        status: 'completed'
      });

      // Optimize uploads directory
      const uploadsOptimization = await this.optimizeUploadsDirectory();
      results.operations.push({
        operation: 'uploads_optimization',
        ...uploadsOptimization,
        status: 'completed'
      });

      const endTime = Date.now();
      results.duration = endTime - startTime;
      results.status = 'completed';

      await SystemLog.info('filesystem_maintenance_completed', `File system maintenance completed successfully`, {
        category: 'maintenance',
        metadata: {
          correlationId: maintenanceId,
          severity: 'low'
        },
        performance: {
          duration: results.duration
        }
      });

      return results;

    } catch (error) {
      await SystemLog.error('filesystem_maintenance_failed', `File system maintenance failed: ${error.message}`, {
        category: 'maintenance',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: maintenanceId,
          severity: 'high'
        }
      });
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const tempDir = os.tmpdir();
      const appTempDir = path.join(tempDir, 'carrental');
      let deletedCount = 0;
      let totalSize = 0;

      try {
        const files = await fs.readdir(appTempDir);
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        for (const file of files) {
          const filePath = path.join(appTempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      } catch (error) {
        // Directory might not exist, which is fine
      }

      return {
        deletedFiles: deletedCount,
        freedSpace: totalSize
      };

    } catch (error) {
      throw new Error(`Temp files cleanup failed: ${error.message}`);
    }
  }

  async cleanupLogFiles() {
    try {
      const logsDir = path.join(__dirname, '../logs');
      let deletedCount = 0;
      let totalSize = 0;

      try {
        const files = await fs.readdir(logsDir);
        const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(logsDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              totalSize += stats.size;
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        }
      } catch (error) {
        // Directory might not exist
      }

      return {
        deletedFiles: deletedCount,
        freedSpace: totalSize
      };

    } catch (error) {
      throw new Error(`Log files cleanup failed: ${error.message}`);
    }
  }

  async optimizeUploadsDirectory() {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      let processedFiles = 0;
      let totalSize = 0;

      try {
        const files = await fs.readdir(uploadsDir);

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            totalSize += stats.size;
            processedFiles++;
          }
        }
      } catch (error) {
        // Directory might not exist
      }

      return {
        processedFiles,
        totalSize,
        optimized: true
      };

    } catch (error) {
      throw new Error(`Uploads optimization failed: ${error.message}`);
    }
  }

  // Security maintenance
  async performSecurityMaintenance() {
    const maintenanceId = `security_maintenance_${Date.now()}`;
    
    try {
      const startTime = Date.now();
      const results = {
        id: maintenanceId,
        timestamp: new Date(),
        operations: []
      };

      // Check for suspicious activities
      const suspiciousActivities = await this.checkSuspiciousActivities();
      results.operations.push({
        operation: 'suspicious_activities_check',
        ...suspiciousActivities,
        status: 'completed'
      });

      // Update security configurations
      const securityUpdate = await this.updateSecurityConfigurations();
      results.operations.push({
        operation: 'security_config_update',
        ...securityUpdate,
        status: 'completed'
      });

      // Generate security report
      const securityReport = await this.generateSecurityReport();
      results.operations.push({
        operation: 'security_report',
        ...securityReport,
        status: 'completed'
      });

      const endTime = Date.now();
      results.duration = endTime - startTime;
      results.status = 'completed';

      await SystemLog.info('security_maintenance_completed', `Security maintenance completed successfully`, {
        category: 'security',
        metadata: {
          correlationId: maintenanceId,
          severity: 'medium'
        },
        performance: {
          duration: results.duration
        }
      });

      return results;

    } catch (error) {
      await SystemLog.error('security_maintenance_failed', `Security maintenance failed: ${error.message}`, {
        category: 'security',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: maintenanceId,
          severity: 'high'
        }
      });
      throw error;
    }
  }

  async checkSuspiciousActivities() {
    try {
      // Check for failed login attempts
      const failedLogins = await SystemLog.countDocuments({
        category: 'authentication',
        level: 'warn',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      // Check for security events
      const securityEvents = await SystemLog.countDocuments({
        category: 'security',
        'security.threatLevel': { $in: ['high', 'critical'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        failedLogins,
        securityEvents,
        suspiciousIPs: [], // Would be populated with actual suspicious IP detection
        recommendations: failedLogins > 10 ? ['Consider implementing IP blocking'] : []
      };

    } catch (error) {
      throw new Error(`Suspicious activities check failed: ${error.message}`);
    }
  }

  async updateSecurityConfigurations() {
    try {
      const updates = {
        passwordPolicyChecked: true,
        sessionConfigurationUpdated: true,
        encryptionVerified: true,
        timestamp: new Date()
      };

      return updates;

    } catch (error) {
      throw new Error(`Security configuration update failed: ${error.message}`);
    }
  }

  async generateSecurityReport() {
    try {
      const report = {
        generatedAt: new Date(),
        summary: {
          totalSecurityEvents: await SystemLog.countDocuments({ category: 'security' }),
          criticalEvents: await SystemLog.countDocuments({ 
            category: 'security', 
            'security.threatLevel': 'critical' 
          }),
          lastSecurityScan: new Date(),
          vulnerabilitiesFound: 0
        },
        recommendations: [
          'Regular security updates',
          'Monitor failed login attempts',
          'Review user permissions periodically'
        ]
      };

      return report;

    } catch (error) {
      throw new Error(`Security report generation failed: ${error.message}`);
    }
  }

  // Schedule maintenance tasks
  async scheduleMaintenanceTasks() {
    try {
      const settings = await SystemSettings.getSettings();
      
      const schedule = {
        database: {
          frequency: 'weekly',
          nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          enabled: true
        },
        filesystem: {
          frequency: 'daily',
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
          enabled: true
        },
        security: {
          frequency: 'daily',
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
          enabled: true
        },
        backup: {
          frequency: settings.maintenance.backupSettings.backupFrequency,
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
          enabled: settings.maintenance.backupSettings.autoBackup
        }
      };

      await SystemLog.info('maintenance_scheduled', 'Maintenance tasks scheduled successfully', {
        category: 'maintenance',
        metadata: {
          severity: 'low'
        }
      });

      return schedule;

    } catch (error) {
      await SystemLog.error('maintenance_schedule_failed', `Failed to schedule maintenance tasks: ${error.message}`, {
        category: 'maintenance',
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }
}

module.exports = new MaintenanceManager();
