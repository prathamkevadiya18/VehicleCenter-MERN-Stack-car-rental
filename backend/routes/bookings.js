const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const { protect, authorize } = require('../middleware/auth');
const { autoCompleteBookings } = require('../utils/bookingHelper');
const router = express.Router();

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    await autoCompleteBookings();
    const {
      carType,
      pickUp,
      dropOff,
      pickTime,
      dropTime,
      pickUpTime,
      dropOffTime,
      name,
      lastName,
      phone,
      age,
      email,
      address,
      city,
      zipcode,
      fuelType,
      specialRequests
    } = req.body;

    // Basic required field validation
    const missing = [];
    const requiredMap = {
      carType,
      pickUp,
      dropOff,
      pickTime,
      dropTime,
      pickUpTime,
      dropOffTime,
      name,
      lastName,
      phone,
      age,
      email,
      address,
      city,
      zipcode,
      fuelType
    };
    Object.entries(requiredMap).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') missing.push(key);
    });
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        fields: missing
      });
    }

    // Validate dates (combine date + time into full ISO datetimes)
    const makeDateTime = (dateStr, timeStr) => {
      if (!dateStr) return new Date('');
      // If time missing, default to 00:00
      const t = timeStr && timeStr.trim() ? timeStr : '00:00';
      // Ensure HH:MM format
      const normalized = /^\d{2}:\d{2}$/.test(t) ? t : '00:00';
      return new Date(`${dateStr}T${normalized}`);
    };
    const pickupDateParsed = makeDateTime(pickTime, pickUpTime);
    const dropoffDateParsed = makeDateTime(dropTime, dropOffTime);
    if (isNaN(pickupDateParsed.getTime()) || isNaN(dropoffDateParsed.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time for pickTime/pickUpTime or dropTime/dropOffTime.'
      });
    }
    if (dropoffDateParsed <= pickupDateParsed) {
      return res.status(400).json({
        success: false,
        message: 'dropTime must be after pickTime'
      });
    }

    // Validate fuelType against allowed values in Booking model
    const allowedFuel = ['Petrol', 'Diesel', 'CNG', 'Electric'];
    if (!allowedFuel.includes(fuelType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid fuelType. Allowed: ${allowedFuel.join(', ')}`
      });
    }

    // Find the car by name/type with tolerant matching (case/space/hyphen-insensitive)
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedPattern = '^' + escapeRegex(carType).replace(/[-\s]+/g, '\\s*-?\\s*') + '$';
    // Also add relaxed matching to handle brand prefixes/suffixes differences (e.g., "VW Golf 6" vs "Golf 6")
    const words = carType.split(/\s+/).filter(Boolean).map(escapeRegex);
    const relaxedPattern = new RegExp(words.join('.*'), 'i');
    const car = await Car.findOne({
      $or: [
        { name: carType },
        { name: { $regex: new RegExp(normalizedPattern, 'i') } },
        { name: { $regex: relaxedPattern } },
      ]
    });
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Check car availability
    if (!car.availability.isAvailable || car.availability.maintenanceSchedule?.isUnderMaintenance) {
      return res.status(400).json({
        success: false,
        message: 'Car is not available for booking'
      });
    }

    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      car: car._id,
      customerInfo: {
        name,
        lastName,
        email,
        phone,
        age,
        address,
        city,
        zipcode
      },
      pickupLocation: pickUp,
      dropoffLocation: dropOff,
      pickupDate: pickupDateParsed,
      dropoffDate: dropoffDateParsed,
      pickupTime: pickUpTime,
      dropoffTime: dropOffTime,
      pricePerHour: car.pricePerHour,
      fuelType,
      specialRequests
    });

    // Populate the booking with car and user details
    await booking.populate('car user');

    // Update car availability to false
    car.availability.isAvailable = false;
    await car.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed while creating booking',
        errors: details
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during booking creation',
      error: error.message
    });
  }
});

// @desc    Get all bookings for logged in user
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    await autoCompleteBookings();
    const bookings = await Booking.find({ user: req.user._id })
      .populate('car', 'name model brand images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
      error: error.message
    });
  }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    await autoCompleteBookings();
    const booking = await Booking.findById(req.params.id)
      .populate('car user');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user owns booking or is admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking',
      error: error.message
    });
  }
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    await autoCompleteBookings();
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user owns booking or is admin
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Don't allow updates if booking is completed or cancelled
    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled booking'
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('car user');

    // If status changed in the update, sync car availability
    if (req.body.status && booking.car) {
      const normalizedStatus = req.body.status.charAt(0).toUpperCase() + req.body.status.slice(1).toLowerCase();
      const car = await Car.findById(booking.car._id || booking.car);
      if (car) {
        if (normalizedStatus === 'Completed' || normalizedStatus === 'Cancelled') {
          car.availability.isAvailable = true;
        } else if (normalizedStatus === 'Confirmed' || normalizedStatus === 'Pending') {
          car.availability.isAvailable = false;
        }
        await car.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during booking update',
      error: error.message
    });
  }
});

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    await autoCompleteBookings();
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user owns booking or is admin
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Update status to cancelled instead of deleting
    booking.status = 'Cancelled';
    await booking.save();

    // Set car availability back to true
    const car = await Car.findById(booking.car);
    if (car) {
      car.availability.isAvailable = true;
      await car.save();
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during booking cancellation',
      error: error.message
    });
  }
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats/overview
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments({ user: userId });

    const formattedStats = {
      total: totalBookings,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id.toLowerCase()] = stat.count;
    });

    res.status(200).json({
      success: true,
      stats: formattedStats
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking statistics',
      error: error.message
    });
  }
});

module.exports = router;
