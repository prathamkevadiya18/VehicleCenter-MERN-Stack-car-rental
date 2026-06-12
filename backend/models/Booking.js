const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  // Customer Information
  customerInfo: {
    name: {
      type: String,
      required: [true, 'Customer name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Customer last name is required']
    },
    email: {
      type: String,
      required: [true, 'Customer email is required']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required']
    },
    age: {
      type: Number,
      required: [true, 'Customer age is required'],
      min: [18, 'Customer must be at least 18 years old']
    },
    address: {
      type: String,
      required: [true, 'Customer address is required']
    },
    city: {
      type: String,
      required: [true, 'Customer city is required']
    },
    zipcode: {
      type: String,
      required: [true, 'Customer zipcode is required']
    }
  },
  // Booking Details
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    enum: ['Delhi', 'Mumbai', 'Kolkata', 'Bengaluru', 'Goa']
  },
  dropoffLocation: {
    type: String,
    required: [true, 'Dropoff location is required'],
    enum: ['Delhi', 'Mumbai', 'Kolkata', 'Bengaluru', 'Goa']
  },
  pickupDate: {
    type: Date,
    required: [true, 'Pickup date is required']
  },
  dropoffDate: {
    type: Date,
    required: [true, 'Dropoff date is required']
  },
  pickupTime: {
    type: String,
    required: [true, 'Pickup time is required']
  },
  dropoffTime: {
    type: String,
    required: [true, 'Dropoff time is required']
  },
  // Pricing
  pricePerHour: {
    type: Number,
    required: true
  },
  totalHours: {
    type: Number,
    default: 0
  },
  totalDays: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  // Additional Information
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'CNG', 'Electric'],
    required: true
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters']
  },
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Net Banking'],
    default: 'Cash'
  },
  // Admin Notes
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for booking duration in hours
bookingSchema.virtual('durationHours').get(function() {
  if (this.pickupDate && this.dropoffDate) {
    const diff = this.dropoffDate - this.pickupDate;
    return Math.ceil(diff / (1000 * 60 * 60));
  }
  return 0;
});

// Virtual for booking duration in days
bookingSchema.virtual('durationDays').get(function() {
  if (this.pickupDate && this.dropoffDate) {
    const diff = this.dropoffDate - this.pickupDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Indexes for better query performance
bookingSchema.index({ user: 1 });
bookingSchema.index({ car: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ pickupDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Pre-validate middleware to calculate totals and total amount
bookingSchema.pre('validate', function(next) {
  if (this.pickupDate && this.dropoffDate && this.pricePerHour) {
    const startDate = new Date(this.pickupDate);
    const endDate = new Date(this.dropoffDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    this.totalHours = diffHours;
    this.totalDays = diffDays;
    
    // Calculate total amount based on duration
    if (diffHours <= 24) {
      this.totalAmount = this.pricePerHour * diffHours;
    } else {
      this.totalAmount = this.pricePerHour * 24 * diffDays;
    }
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
