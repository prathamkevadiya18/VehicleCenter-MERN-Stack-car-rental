const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification identification
  notificationId: {
    type: String,
    unique: true,
    default: () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Notification type and category
  type: {
    type: String,
    required: true,
    enum: [
      'email', 'sms', 'push', 'in_app', 'webhook', 'system_alert'
    ]
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'booking', 'payment', 'user_account', 'system', 'marketing', 
      'security', 'maintenance', 'reminder', 'promotion', 'alert'
    ]
  },
  
  // Recipient information
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    phone: String,
    deviceToken: String, // for push notifications
    name: String
  },
  
  // Notification content
  content: {
    subject: {
      type: String,
      required: true,
      maxlength: 200
    },
    title: {
      type: String,
      maxlength: 100
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000
    },
    htmlContent: String, // for rich email content
    shortMessage: String, // for SMS/push (160 chars max)
    actionUrl: String,
    actionText: String,
    imageUrl: String,
    attachments: [{
      filename: String,
      url: String,
      contentType: String,
      size: Number
    }]
  },
  
  // Template information
  template: {
    templateId: String,
    templateName: String,
    variables: mongoose.Schema.Types.Mixed // template variables
  },
  
  // Scheduling and timing
  scheduling: {
    sendAt: {
      type: Date,
      default: Date.now
    },
    timezone: String,
    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly']
      },
      interval: Number, // every N days/weeks/months
      endDate: Date,
      daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
      dayOfMonth: Number, // 1-31
      nextRun: Date
    }
  },
  
  // Delivery status and tracking
  delivery: {
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'],
      default: 'pending'
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    failureReason: String,
    providerResponse: mongoose.Schema.Types.Mixed,
    trackingId: String, // external provider tracking ID
    messageId: String // provider message ID
  },
  
  // Priority and importance
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  importance: {
    type: String,
    enum: ['informational', 'important', 'critical'],
    default: 'informational'
  },
  
  // Personalization and targeting
  personalization: {
    language: {
      type: String,
      default: 'en'
    },
    locale: String,
    userSegment: String,
    tags: [String],
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Campaign and batch information
  campaign: {
    campaignId: String,
    campaignName: String,
    batchId: String,
    batchSize: Number,
    isTest: {
      type: Boolean,
      default: false
    }
  },
  
  // Compliance and consent
  compliance: {
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: Date,
    unsubscribeToken: String,
    gdprCompliant: {
      type: Boolean,
      default: true
    },
    canSpamCompliant: {
      type: Boolean,
      default: true
    }
  },
  
  // Analytics and metrics
  analytics: {
    deviceType: String,
    browser: String,
    os: String,
    location: {
      country: String,
      region: String,
      city: String
    },
    ipAddress: String,
    userAgent: String,
    referrer: String
  },
  
  // Related entities
  relatedEntities: {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car'
    },
    paymentId: String,
    orderId: String
  },
  
  // System metadata
  metadata: {
    source: {
      type: String,
      enum: ['system', 'admin', 'api', 'webhook', 'scheduled'],
      default: 'system'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'production'
    },
    version: String,
    correlationId: String,
    parentNotificationId: String
  },
  
  // Expiration and cleanup
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes for performance
notificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
notificationSchema.index({ 'recipient.email': 1, createdAt: -1 });
notificationSchema.index({ type: 1, 'delivery.status': 1 });
notificationSchema.index({ category: 1, createdAt: -1 });
notificationSchema.index({ 'delivery.status': 1, 'scheduling.sendAt': 1 });
notificationSchema.index({ 'campaign.campaignId': 1 });
notificationSchema.index({ 'scheduling.recurring.nextRun': 1 });
notificationSchema.index({ priority: 1, 'scheduling.sendAt': 1 });

// Static methods for creating notifications
notificationSchema.statics.createEmailNotification = async function(recipientData, content, options = {}) {
  const notification = new this({
    type: 'email',
    category: options.category || 'system',
    recipient: recipientData,
    content,
    priority: options.priority || 'normal',
    importance: options.importance || 'informational',
    scheduling: {
      sendAt: options.sendAt || new Date(),
      timezone: options.timezone
    },
    template: options.template,
    campaign: options.campaign,
    relatedEntities: options.relatedEntities,
    metadata: {
      source: options.source || 'system',
      createdBy: options.createdBy,
      correlationId: options.correlationId
    },
    expiresAt: options.expiresAt
  });
  
  return await notification.save();
};

notificationSchema.statics.createSMSNotification = async function(recipientData, content, options = {}) {
  const notification = new this({
    type: 'sms',
    category: options.category || 'system',
    recipient: recipientData,
    content: {
      subject: content.subject,
      message: content.shortMessage || content.message.substring(0, 160),
      shortMessage: content.shortMessage || content.message.substring(0, 160)
    },
    priority: options.priority || 'normal',
    importance: options.importance || 'informational',
    scheduling: {
      sendAt: options.sendAt || new Date(),
      timezone: options.timezone
    },
    campaign: options.campaign,
    relatedEntities: options.relatedEntities,
    metadata: {
      source: options.source || 'system',
      createdBy: options.createdBy,
      correlationId: options.correlationId
    },
    expiresAt: options.expiresAt
  });
  
  return await notification.save();
};

notificationSchema.statics.createPushNotification = async function(recipientData, content, options = {}) {
  const notification = new this({
    type: 'push',
    category: options.category || 'system',
    recipient: recipientData,
    content: {
      title: content.title,
      message: content.message,
      shortMessage: content.shortMessage || content.message.substring(0, 100),
      actionUrl: content.actionUrl,
      actionText: content.actionText,
      imageUrl: content.imageUrl
    },
    priority: options.priority || 'normal',
    importance: options.importance || 'informational',
    scheduling: {
      sendAt: options.sendAt || new Date(),
      timezone: options.timezone
    },
    campaign: options.campaign,
    relatedEntities: options.relatedEntities,
    metadata: {
      source: options.source || 'system',
      createdBy: options.createdBy,
      correlationId: options.correlationId
    },
    expiresAt: options.expiresAt
  });
  
  return await notification.save();
};

// Instance methods
notificationSchema.methods.markAsSent = function(providerResponse = {}) {
  this.delivery.status = 'sent';
  this.delivery.sentAt = new Date();
  this.delivery.providerResponse = providerResponse;
  this.delivery.trackingId = providerResponse.trackingId;
  this.delivery.messageId = providerResponse.messageId;
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function(reason) {
  this.delivery.status = 'failed';
  this.delivery.failureReason = reason;
  this.delivery.attempts += 1;
  return this.save();
};

notificationSchema.methods.markAsOpened = function(analyticsData = {}) {
  this.delivery.status = 'opened';
  this.delivery.openedAt = new Date();
  this.analytics = { ...this.analytics, ...analyticsData };
  return this.save();
};

notificationSchema.methods.markAsClicked = function(analyticsData = {}) {
  this.delivery.status = 'clicked';
  this.delivery.clickedAt = new Date();
  this.analytics = { ...this.analytics, ...analyticsData };
  return this.save();
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set expiration date if not provided
  if (!this.expiresAt) {
    const expirationDays = {
      'email': 90,
      'sms': 30,
      'push': 30,
      'in_app': 60,
      'webhook': 7,
      'system_alert': 30
    };
    
    const days = expirationDays[this.type] || 30;
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  
  // Generate unsubscribe token for email notifications
  if (this.type === 'email' && !this.compliance.unsubscribeToken) {
    this.compliance.unsubscribeToken = require('crypto')
      .randomBytes(32)
      .toString('hex');
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
