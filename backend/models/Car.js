const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Car name is required'],
    trim: true,
    maxlength: [100, 'Car name cannot exceed 100 characters']
  },
  model: {
    type: String,
    required: [true, 'Car model is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Car brand is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Car year is required'],
    min: [2000, 'Car year must be 2000 or later'],
    max: [new Date().getFullYear() + 1, 'Car year cannot be in the future']
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: [0, 'Price cannot be negative']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price cannot be negative']
  },
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']
  },
  transmission: {
    type: String,
    required: [true, 'Transmission type is required'],
    enum: ['Manual', 'Automatic', 'CVT']
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Seating capacity is required'],
    min: [2, 'Minimum 2 seats required'],
    max: [8, 'Maximum 8 seats allowed']
  },
  category: {
    type: String,
    required: [true, 'Car category is required'],
    enum: ['Economy', 'Compact', 'Mid-size', 'Full-size', 'Premium', 'Luxury', 'SUV']
  },
  features: [{
    type: String,
    enum: ['AC', 'GPS', 'Bluetooth', 'USB Charging', 'Sunroof', 'Leather Seats', 'Backup Camera', 'Parking Sensors']
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Car image'
    }
  }],
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  specifications: {
    engine: String,
    mileage: String,
    topSpeed: String,
    acceleration: String
  },
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    availableLocations: [{
      type: String,
      enum: ['Delhi', 'Mumbai', 'Kolkata', 'Bengaluru', 'Goa']
    }],
    maintenanceSchedule: {
      lastService: Date,
      nextService: Date,
      isUnderMaintenance: {
        type: Boolean,
        default: false
      }
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  bookingCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for availability status
carSchema.virtual('availabilityStatus').get(function() {
  if (!this.isActive) return 'Inactive';
  if (this.availability.isUnderMaintenance) return 'Under Maintenance';
  if (!this.availability.isAvailable) return 'Booked';
  return 'Available';
});

// Indexes for better query performance
carSchema.index({ name: 1 });
carSchema.index({ brand: 1 });
carSchema.index({ category: 1 });
carSchema.index({ pricePerHour: 1 });
carSchema.index({ 'availability.isAvailable': 1 });
carSchema.index({ 'availability.availableLocations': 1 });
carSchema.index({ isActive: 1 });

// Static method to find available cars
carSchema.statics.findAvailable = function(location, startDate, endDate) {
  return this.find({
    isActive: true,
    'availability.isAvailable': true,
    'availability.isUnderMaintenance': false,
    'availability.availableLocations': location
  });
};

module.exports = mongoose.model('Car', carSchema);
