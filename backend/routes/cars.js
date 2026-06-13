const express = require('express');
const Car = require('../models/Car');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { autoCompleteBookings } = require('../utils/bookingHelper');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'cars');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `car-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Only jpg, png, webp images allowed'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// @desc    Upload car image
// @route   POST /api/cars/upload
// @access  Private/Admin
router.post('/upload', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const relativePath = path.join('uploads', 'cars', req.file.filename).replace(/\\/g, '/');
    const url = `${req.protocol}://${req.get('host')}/${relativePath}`;
    res.status(200).json({ success: true, url, fileName: req.file.filename });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
  }
});

// @desc    Get all cars
// @route   GET /api/cars
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    await autoCompleteBookings();
    const {
      category,
      fuelType,
      transmission,
      minPrice,
      maxPrice,
      location,
      available,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    let query = { isActive: true };

    if (category) query.category = category;
    if (fuelType) query.fuelType = fuelType;
    if (transmission) query.transmission = transmission;
    if (location) query['availability.availableLocations'] = location;
    if (available === 'true') {
      query['availability.isAvailable'] = true;
      query['availability.maintenanceSchedule.isUnderMaintenance'] = false;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    // Execute query
    let carsQuery = Car.find(query);

    // Sorting
    if (sort) {
      const sortBy = sort.split(',').join(' ');
      carsQuery = carsQuery.sort(sortBy);
    } else {
      carsQuery = carsQuery.sort('-createdAt');
    }

    // Pagination
    const skip = (page - 1) * limit;
    carsQuery = carsQuery.skip(skip).limit(Number(limit));

    const cars = await carsQuery;
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
    console.error('Get cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cars',
      error: error.message
    });
  }
});

// @desc    Get single car
// @route   GET /api/cars/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (!car.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Car is not available'
      });
    }

    res.status(200).json({
      success: true,
      car
    });

  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching car',
      error: error.message
    });
  }
});

// @desc    Create new car
// @route   POST /api/cars
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const car = await Car.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      car
    });

  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during car creation',
      error: error.message
    });
  }
});

// @desc    Update car
// @route   PUT /api/cars/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Car updated successfully',
      car
    });

  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during car update',
      error: error.message
    });
  }
});

// @desc    Delete car
// @route   DELETE /api/cars/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Soft delete - mark as inactive instead of removing
    car.isActive = false;
    await car.save();

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully'
    });

  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during car deletion',
      error: error.message
    });
  }
});

// @desc    Get available cars for specific location and dates
// @route   GET /api/cars/available/:location
// @access  Public
router.get('/available/:location', async (req, res) => {
  try {
    await autoCompleteBookings();
    const { location } = req.params;
    const { startDate, endDate } = req.query;

    const cars = await Car.findAvailable(location, startDate, endDate);

    res.status(200).json({
      success: true,
      count: cars.length,
      cars
    });

  } catch (error) {
    console.error('Get available cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available cars',
      error: error.message
    });
  }
});

// @desc    Get car categories
// @route   GET /api/cars/categories/list
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Car.distinct('category', { isActive: true });
    
    res.status(200).json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message
    });
  }
});

module.exports = router;
