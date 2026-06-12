const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const SystemLog = require('../models/SystemLog');
const SystemSettings = require('../models/SystemSettings');

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  // Create full database backup
  async createDatabaseBackup(options = {}) {
    const backupId = `db_backup_${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_backup_${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    try {
      const startTime = Date.now();
      
      // Get all collections data
      const mongoose = require('mongoose');
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backupData = {
        metadata: {
          backupId,
          timestamp: new Date(),
          version: '1.0',
          collections: collections.length,
          mongoVersion: mongoose.version
        },
        data: {}
      };

      // Backup each collection
      for (const collection of collections) {
        const collectionName = collection.name;
        try {
          const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
          backupData.data[collectionName] = data;
          
          await SystemLog.info('collection_backed_up', `Collection ${collectionName} backed up (${data.length} documents)`, {
            category: 'backup',
            metadata: {
              correlationId: backupId,
              severity: 'low'
            }
          });
        } catch (error) {
          await SystemLog.error('collection_backup_failed', `Failed to backup collection ${collectionName}: ${error.message}`, {
            category: 'backup',
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            metadata: {
              correlationId: backupId,
              severity: 'high'
            }
          });
        }
      }

      // Write backup file
      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileStats = await fs.stat(filepath);

      const backupInfo = {
        id: backupId,
        filename,
        filepath,
        size: fileStats.size,
        duration,
        timestamp: new Date(),
        status: 'completed',
        collections: Object.keys(backupData.data).length,
        totalDocuments: Object.values(backupData.data).reduce((sum, docs) => sum + docs.length, 0),
        type: options.type || 'manual'
      };

      await SystemLog.info('database_backup_completed', `Database backup completed successfully`, {
        category: 'backup',
        metadata: {
          correlationId: backupId,
          severity: 'low'
        },
        performance: {
          duration,
          memoryUsage: process.memoryUsage().heapUsed
        }
      });

      return backupInfo;

    } catch (error) {
      await SystemLog.error('database_backup_failed', `Database backup failed: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: backupId,
          severity: 'critical'
        }
      });
      throw error;
    }
  }

  // Create files backup
  async createFilesBackup(directories = ['uploads', 'logs'], options = {}) {
    const backupId = `files_backup_${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `files_backup_${timestamp}.tar.gz`;
    const filepath = path.join(this.backupDir, filename);

    try {
      const startTime = Date.now();
      
      // Create tar.gz archive of specified directories
      const sourcePaths = directories.map(dir => path.join(__dirname, '../', dir)).filter(async (dirPath) => {
        try {
          await fs.access(dirPath);
          return true;
        } catch {
          return false;
        }
      });

      if (sourcePaths.length === 0) {
        throw new Error('No valid directories found to backup');
      }

      // Use tar command to create compressed archive
      const tarCommand = `tar -czf "${filepath}" -C "${path.dirname(sourcePaths[0])}" ${sourcePaths.map(p => path.basename(p)).join(' ')}`;
      
      await execAsync(tarCommand);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileStats = await fs.stat(filepath);

      const backupInfo = {
        id: backupId,
        filename,
        filepath,
        size: fileStats.size,
        duration,
        timestamp: new Date(),
        status: 'completed',
        directories: directories.length,
        type: 'files'
      };

      await SystemLog.info('files_backup_completed', `Files backup completed successfully`, {
        category: 'backup',
        metadata: {
          correlationId: backupId,
          severity: 'low'
        },
        performance: {
          duration,
          memoryUsage: process.memoryUsage().heapUsed
        }
      });

      return backupInfo;

    } catch (error) {
      await SystemLog.error('files_backup_failed', `Files backup failed: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: backupId,
          severity: 'high'
        }
      });
      throw error;
    }
  }

  // Restore database from backup
  async restoreDatabase(backupFilepath, options = {}) {
    const restoreId = `restore_${Date.now()}`;
    
    try {
      const startTime = Date.now();
      
      // Read backup file
      const backupContent = await fs.readFile(backupFilepath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      if (!backupData.data) {
        throw new Error('Invalid backup file format');
      }

      const mongoose = require('mongoose');
      const restoredCollections = [];

      // Clear existing data if specified
      if (options.clearExisting) {
        for (const collectionName of Object.keys(backupData.data)) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
        }
      }

      // Restore each collection
      for (const [collectionName, documents] of Object.entries(backupData.data)) {
        if (documents.length > 0) {
          await mongoose.connection.db.collection(collectionName).insertMany(documents);
          restoredCollections.push({
            name: collectionName,
            documents: documents.length
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const restoreInfo = {
        id: restoreId,
        backupFile: path.basename(backupFilepath),
        duration,
        timestamp: new Date(),
        status: 'completed',
        collections: restoredCollections.length,
        totalDocuments: restoredCollections.reduce((sum, col) => sum + col.documents, 0),
        restoredCollections
      };

      await SystemLog.info('database_restore_completed', `Database restore completed successfully`, {
        category: 'backup',
        metadata: {
          correlationId: restoreId,
          severity: 'medium'
        },
        performance: {
          duration,
          memoryUsage: process.memoryUsage().heapUsed
        }
      });

      return restoreInfo;

    } catch (error) {
      await SystemLog.error('database_restore_failed', `Database restore failed: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        metadata: {
          correlationId: restoreId,
          severity: 'critical'
        }
      });
      throw error;
    }
  }

  // Get backup history
  async getBackupHistory(limit = 50) {
    try {
      const backupFiles = await fs.readdir(this.backupDir);
      const backups = [];

      for (const filename of backupFiles) {
        const filepath = path.join(this.backupDir, filename);
        const stats = await fs.stat(filepath);
        
        backups.push({
          filename,
          filepath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          type: filename.includes('database') ? 'database' : 'files'
        });
      }

      return backups
        .sort((a, b) => b.created - a.created)
        .slice(0, limit);

    } catch (error) {
      await SystemLog.error('backup_history_failed', `Failed to get backup history: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  // Delete old backups based on retention policy
  async cleanupOldBackups(retentionDays = 30) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const backupFiles = await fs.readdir(this.backupDir);
      let deletedCount = 0;

      for (const filename of backupFiles) {
        const filepath = path.join(this.backupDir, filename);
        const stats = await fs.stat(filepath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      await SystemLog.info('backup_cleanup_completed', `Cleaned up ${deletedCount} old backup files`, {
        category: 'backup',
        metadata: {
          severity: 'low'
        }
      });

      return { deletedCount, cutoffDate };

    } catch (error) {
      await SystemLog.error('backup_cleanup_failed', `Backup cleanup failed: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  // Verify backup integrity
  async verifyBackup(backupFilepath) {
    try {
      const backupContent = await fs.readFile(backupFilepath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      const verification = {
        isValid: true,
        errors: [],
        metadata: backupData.metadata,
        collections: Object.keys(backupData.data || {}).length,
        totalDocuments: 0
      };

      if (!backupData.metadata) {
        verification.isValid = false;
        verification.errors.push('Missing backup metadata');
      }

      if (!backupData.data) {
        verification.isValid = false;
        verification.errors.push('Missing backup data');
      } else {
        verification.totalDocuments = Object.values(backupData.data)
          .reduce((sum, docs) => sum + (Array.isArray(docs) ? docs.length : 0), 0);
      }

      return verification;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Backup verification failed: ${error.message}`],
        metadata: null,
        collections: 0,
        totalDocuments: 0
      };
    }
  }

  // Schedule automatic backups
  async scheduleBackups() {
    try {
      const settings = await SystemSettings.getSettings();
      const backupConfig = settings.maintenance.backupSettings;

      if (!backupConfig.autoBackup) {
        return { message: 'Auto backup is disabled' };
      }

      // This would typically integrate with a job scheduler like node-cron
      // For now, we'll simulate the scheduling
      const schedule = {
        frequency: backupConfig.backupFrequency,
        nextRun: this.calculateNextRun(backupConfig.backupFrequency),
        retentionDays: backupConfig.retentionPeriod,
        location: backupConfig.backupLocation
      };

      await SystemLog.info('backup_scheduled', `Automatic backups scheduled (${backupConfig.backupFrequency})`, {
        category: 'backup',
        metadata: {
          severity: 'low'
        }
      });

      return schedule;

    } catch (error) {
      await SystemLog.error('backup_schedule_failed', `Failed to schedule backups: ${error.message}`, {
        category: 'backup',
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  calculateNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new BackupManager();
