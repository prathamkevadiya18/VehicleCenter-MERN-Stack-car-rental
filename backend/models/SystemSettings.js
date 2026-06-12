const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // General System Settings
  general: {
    siteName: {
      type: String,
      default: 'Vehicle Center Pro',
      required: true
    },
    siteDescription: {
      type: String,
      default: 'Professional Vehicle Center Management System'
    },
    contactEmail: {
      type: String,
      default: 'admin@carrental.com'
    },
    supportPhone: {
      type: String,
      default: '+1-800-CAR-RENT'
    },
    timezone: {
      type: String,
      default: 'UTC',
      enum: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'Asia/Kolkata']
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'hi', 'ja']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    }
  },

  // Business Settings
  business: {
    businessHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
    },
    minimumBookingDuration: {
      type: Number,
      default: 1, // hours
      min: 1
    },
    maximumBookingDuration: {
      type: Number,
      default: 720, // hours (30 days)
      min: 1
    },
    advanceBookingLimit: {
      type: Number,
      default: 90, // days
      min: 1
    },
    cancellationPolicy: {
      allowCancellation: { type: Boolean, default: true },
      cancellationDeadline: { type: Number, default: 24 }, // hours before pickup
      cancellationFee: { type: Number, default: 0 }, // percentage
      refundProcessingTime: { type: Number, default: 7 } // days
    },
    lateFees: {
      enabled: { type: Boolean, default: true },
      gracePerid: { type: Number, default: 30 }, // minutes
      hourlyRate: { type: Number, default: 25 }, // per hour
      dailyRate: { type: Number, default: 150 } // per day
    }
  },

  // Pricing Settings
  pricing: {
    taxRate: {
      type: Number,
      default: 8.5, // percentage
      min: 0,
      max: 50
    },
    serviceFee: {
      type: Number,
      default: 15, // flat fee
      min: 0
    },
    insuranceFee: {
      type: Number,
      default: 25, // per day
      min: 0
    },
    fuelPolicy: {
      type: String,
      default: 'full-to-full',
      enum: ['full-to-full', 'same-to-same', 'prepaid']
    },
    mileagePolicy: {
      unlimited: { type: Boolean, default: true },
      dailyLimit: { type: Number, default: 200 }, // miles per day
      overageRate: { type: Number, default: 0.25 } // per mile
    },
    discounts: {
      weeklyDiscount: { type: Number, default: 10 }, // percentage for 7+ days
      monthlyDiscount: { type: Number, default: 20 }, // percentage for 30+ days
      loyaltyDiscount: { type: Number, default: 5 }, // percentage for repeat customers
      seasonalDiscounts: [{
        name: String,
        startDate: Date,
        endDate: Date,
        discount: Number,
        isActive: { type: Boolean, default: true }
      }]
    }
  },

  // Security Settings
  security: {
    passwordPolicy: {
      minLength: { type: Number, default: 8, min: 6 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: true },
      passwordExpiry: { type: Number, default: 90 } // days
    },
    sessionSettings: {
      sessionTimeout: { type: Number, default: 30 }, // minutes
      maxConcurrentSessions: { type: Number, default: 3 },
      rememberMeDuration: { type: Number, default: 30 } // days
    },
    loginSecurity: {
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 15 }, // minutes
      twoFactorAuth: { type: Boolean, default: false },
      ipWhitelist: [String],
      allowedCountries: [String]
    },
    dataProtection: {
      dataRetentionPeriod: { type: Number, default: 365 }, // days
      anonymizeAfter: { type: Number, default: 730 }, // days
      encryptSensitiveData: { type: Boolean, default: true },
      gdprCompliance: { type: Boolean, default: true }
    }
  },

  // Notification Settings
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      smtpSettings: {
        host: String,
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        username: String,
        password: String
      },
      templates: {
        bookingConfirmation: { enabled: { type: Boolean, default: true }, subject: String, template: String },
        bookingReminder: { enabled: { type: Boolean, default: true }, subject: String, template: String },
        paymentConfirmation: { enabled: { type: Boolean, default: true }, subject: String, template: String },
        cancellationNotice: { enabled: { type: Boolean, default: true }, subject: String, template: String },
        welcomeEmail: { enabled: { type: Boolean, default: true }, subject: String, template: String }
      }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ['twilio', 'nexmo', 'aws-sns'] },
      apiKey: String,
      apiSecret: String,
      fromNumber: String
    },
    push: {
      enabled: { type: Boolean, default: false },
      firebaseKey: String,
      vapidKeys: {
        publicKey: String,
        privateKey: String
      }
    }
  },

  // Payment Settings
  payment: {
    acceptedMethods: {
      creditCard: { type: Boolean, default: true },
      debitCard: { type: Boolean, default: true },
      paypal: { type: Boolean, default: false },
      applePay: { type: Boolean, default: false },
      googlePay: { type: Boolean, default: false },
      bankTransfer: { type: Boolean, default: false }
    },
    paymentGateways: {
      stripe: {
        enabled: { type: Boolean, default: false },
        publicKey: String,
        secretKey: String,
        webhookSecret: String
      },
      paypal: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        sandboxMode: { type: Boolean, default: true }
      },
      razorpay: {
        enabled: { type: Boolean, default: false },
        keyId: String,
        keySecret: String
      }
    },
    depositSettings: {
      requireDeposit: { type: Boolean, default: true },
      depositAmount: { type: Number, default: 200 }, // flat amount
      depositPercentage: { type: Number, default: 0 }, // percentage of booking
      refundDeposit: { type: Boolean, default: true },
      refundProcessingTime: { type: Number, default: 7 } // days
    }
  },

  // Maintenance Settings
  maintenance: {
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'System is under maintenance. Please try again later.' },
      allowedIPs: [String],
      scheduledStart: Date,
      scheduledEnd: Date
    },
    backupSettings: {
      autoBackup: { type: Boolean, default: true },
      backupFrequency: { type: String, default: 'daily', enum: ['hourly', 'daily', 'weekly'] },
      retentionPeriod: { type: Number, default: 30 }, // days
      backupLocation: { type: String, default: 'local', enum: ['local', 's3', 'google-cloud'] },
      cloudConfig: {
        accessKey: String,
        secretKey: String,
        bucket: String,
        region: String
      }
    },
    systemHealth: {
      monitoringEnabled: { type: Boolean, default: true },
      alertThresholds: {
        cpuUsage: { type: Number, default: 80 }, // percentage
        memoryUsage: { type: Number, default: 85 }, // percentage
        diskUsage: { type: Number, default: 90 }, // percentage
        responseTime: { type: Number, default: 2000 } // milliseconds
      },
      alertEmails: [String]
    }
  },

  // API Settings
  api: {
    rateLimit: {
      enabled: { type: Boolean, default: true },
      requestsPerMinute: { type: Number, default: 100 },
      requestsPerHour: { type: Number, default: 1000 },
      requestsPerDay: { type: Number, default: 10000 }
    },
    cors: {
      enabled: { type: Boolean, default: true },
      allowedOrigins: [String],
      allowedMethods: { type: [String], default: ['GET', 'POST', 'PUT', 'DELETE'] },
      allowCredentials: { type: Boolean, default: true }
    },
    logging: {
      enabled: { type: Boolean, default: true },
      level: { type: String, default: 'info', enum: ['error', 'warn', 'info', 'debug'] },
      logRequests: { type: Boolean, default: true },
      logResponses: { type: Boolean, default: false },
      retentionPeriod: { type: Number, default: 30 } // days
    }
  },

  // Integration Settings
  integrations: {
    googleMaps: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      defaultLocation: {
        lat: { type: Number, default: 40.7128 },
        lng: { type: Number, default: -74.0060 }
      }
    },
    analytics: {
      googleAnalytics: {
        enabled: { type: Boolean, default: false },
        trackingId: String
      },
      facebookPixel: {
        enabled: { type: Boolean, default: false },
        pixelId: String
      }
    },
    socialMedia: {
      facebook: { enabled: { type: Boolean, default: false }, appId: String, appSecret: String },
      google: { enabled: { type: Boolean, default: false }, clientId: String, clientSecret: String },
      twitter: { enabled: { type: Boolean, default: false }, apiKey: String, apiSecret: String }
    }
  },

  // Advanced Settings
  advanced: {
    caching: {
      enabled: { type: Boolean, default: true },
      provider: { type: String, default: 'memory', enum: ['memory', 'redis', 'memcached'] },
      ttl: { type: Number, default: 3600 }, // seconds
      redisConfig: {
        host: String,
        port: Number,
        password: String,
        db: Number
      }
    },
    cdn: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ['cloudflare', 'aws-cloudfront', 'azure-cdn'] },
      endpoint: String,
      apiKey: String
    },
    search: {
      provider: { type: String, default: 'database', enum: ['database', 'elasticsearch', 'algolia'] },
      elasticsearchConfig: {
        host: String,
        port: Number,
        username: String,
        password: String
      },
      algoliaConfig: {
        appId: String,
        apiKey: String,
        indexName: String
      }
    }
  }
}, {
  timestamps: true,
  collection: 'systemsettings'
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

systemSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
