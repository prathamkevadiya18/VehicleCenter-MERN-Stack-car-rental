const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  // Log identification
  logId: {
    type: String,
    unique: true,
    default: () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Log level and type
  level: {
    type: String,
    required: true,
    enum: ['error', 'warn', 'info', 'debug', 'trace'],
    default: 'info'
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'authentication', 'authorization', 'booking', 'payment', 'user_management',
      'car_management', 'system_settings', 'backup', 'maintenance', 'security',
      'api_access', 'database', 'email', 'sms', 'file_upload', 'export_import',
      'admin_action', 'user_action', 'system_error', 'performance', 'audit'
    ]
  },
  
  // Event details
  event: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  description: {
    type: String,
    maxlength: 2000
  },
  
  // User and session information
  user: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    role: String,
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },
  
  // Request information
  request: {
    method: String,
    url: String,
    endpoint: String,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    responseStatus: Number,
    responseTime: Number // in milliseconds
  },
  
  // Data changes (for audit trail)
  changes: {
    entity: String, // e.g., 'User', 'Booking', 'Car', 'SystemSettings'
    entityId: String,
    action: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import']
    },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String] // fields that were changed
  },
  
  // Error information
  error: {
    name: String,
    message: String,
    stack: String,
    code: String,
    statusCode: Number
  },
  
  // System information
  system: {
    server: String,
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development'
    },
    version: String,
    nodeVersion: String,
    memory: {
      used: Number,
      total: Number,
      percentage: Number
    },
    cpu: {
      usage: Number,
      loadAverage: [Number]
    }
  },
  
  // Additional metadata
  metadata: {
    correlationId: String, // for tracking related events
    traceId: String, // for distributed tracing
    parentLogId: String, // for nested operations
    tags: [String],
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String
  },
  
  // Performance metrics
  performance: {
    duration: Number, // operation duration in ms
    memoryUsage: Number,
    dbQueries: Number,
    cacheHits: Number,
    cacheMisses: Number
  },
  
  // Security events
  security: {
    threatLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none'
    },
    attackType: String,
    blocked: Boolean,
    geoLocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  
  // Retention and archival
  retention: {
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }
    },
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: Date
  }
}, {
  timestamps: true,
  collection: 'systemlogs'
});

// Indexes for performance
systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ category: 1, createdAt: -1 });
systemLogSchema.index({ 'user.userId': 1, createdAt: -1 });
systemLogSchema.index({ 'user.ipAddress': 1, createdAt: -1 });
systemLogSchema.index({ 'changes.entity': 1, 'changes.entityId': 1 });
systemLogSchema.index({ 'metadata.correlationId': 1 });
systemLogSchema.index({ 'metadata.severity': 1, createdAt: -1 });
systemLogSchema.index({ 'security.threatLevel': 1, createdAt: -1 });

// Static methods for logging
systemLogSchema.statics.logEvent = async function(logData) {
  try {
    // Set default retention period based on level
    if (!logData.retention?.expiresAt) {
      const retentionDays = {
        'error': 365,
        'warn': 180,
        'info': 90,
        'debug': 30,
        'trace': 7
      };
      
      const days = retentionDays[logData.level] || 90;
      logData.retention = {
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      };
    }
    
    // Add system information
    logData.system = {
      ...logData.system,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create system log:', error);
    throw error;
  }
};

// Convenience methods for different log levels
systemLogSchema.statics.error = function(event, message, additionalData = {}) {
  return this.logEvent({
    level: 'error',
    event,
    message,
    ...additionalData
  });
};

systemLogSchema.statics.warn = function(event, message, additionalData = {}) {
  return this.logEvent({
    level: 'warn',
    event,
    message,
    ...additionalData
  });
};

systemLogSchema.statics.info = function(event, message, additionalData = {}) {
  return this.logEvent({
    level: 'info',
    event,
    message,
    ...additionalData
  });
};

systemLogSchema.statics.debug = function(event, message, additionalData = {}) {
  return this.logEvent({
    level: 'debug',
    event,
    message,
    ...additionalData
  });
};

// Audit trail specific methods
systemLogSchema.statics.auditCreate = function(entity, entityId, data, user, request = {}) {
  return this.logEvent({
    level: 'info',
    category: 'audit',
    event: `${entity}_created`,
    message: `${entity} created with ID: ${entityId}`,
    user,
    request,
    changes: {
      entity,
      entityId,
      action: 'create',
      after: data
    }
  });
};

systemLogSchema.statics.auditUpdate = function(entity, entityId, before, after, user, request = {}) {
  const changedFields = Object.keys(after).filter(key => 
    JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );
  
  return this.logEvent({
    level: 'info',
    category: 'audit',
    event: `${entity}_updated`,
    message: `${entity} updated with ID: ${entityId}. Fields changed: ${changedFields.join(', ')}`,
    user,
    request,
    changes: {
      entity,
      entityId,
      action: 'update',
      before,
      after,
      fields: changedFields
    }
  });
};

systemLogSchema.statics.auditDelete = function(entity, entityId, data, user, request = {}) {
  return this.logEvent({
    level: 'warn',
    category: 'audit',
    event: `${entity}_deleted`,
    message: `${entity} deleted with ID: ${entityId}`,
    user,
    request,
    changes: {
      entity,
      entityId,
      action: 'delete',
      before: data
    }
  });
};

// Security event methods
systemLogSchema.statics.securityEvent = function(event, message, threatLevel, user, request = {}) {
  return this.logEvent({
    level: threatLevel === 'critical' ? 'error' : 'warn',
    category: 'security',
    event,
    message,
    user,
    request,
    security: {
      threatLevel,
      blocked: threatLevel === 'high' || threatLevel === 'critical'
    },
    metadata: {
      severity: threatLevel
    }
  });
};

module.exports = mongoose.model('SystemLog', systemLogSchema);
