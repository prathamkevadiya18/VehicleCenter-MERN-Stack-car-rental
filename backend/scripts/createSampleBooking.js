const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
require('dotenv').config();

(async () => {
  try {
    // 1) Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // 2) Find a user (fallback: create a simple user if none exists)
    let user = await User.findOne();
    if (!user) {
      console.log('No users found. Creating a sample user...');
      user = await User.create({
        firstName: 'Sample',
        lastName: 'User',
        email: 'sample.user@example.com',
        phone: '9999999999',
        password: 'password123',
        role: 'user'
      });
      console.log('Sample user created:', user.email);
    }

    // 3) Find a car (if none, instruct user to run the car seeder)
    let car = await Car.findOne();
    if (!car) {
      console.log('No cars found. Please seed cars first:');
      console.log('  npm run seed');
      process.exit(1);
    }

    // 4) Create a sample booking spanning ~20 hours so totals compute
    const now = new Date();
    const pickup = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const dropoff = new Date(now.getTime() + 21 * 60 * 60 * 1000); // +21 hours

    const booking = await Booking.create({
      user: user._id,
      car: car._id,
      customerInfo: {
        name: 'Raj',
        lastName: 'Kumar',
        email: 'raj@example.com',
        phone: '9999999999',
        age: 28,
        address: '123 Street',
        city: 'Delhi',
        zipcode: '110001'
      },
      pickupLocation: 'Delhi',
      dropoffLocation: 'Mumbai',
      pickupDate: pickup,
      dropoffDate: dropoff,
      pickupTime: '10:00',
      dropoffTime: '07:00',
      pricePerHour: car.pricePerHour || 50,
      fuelType: car.fuelType || 'Petrol',
      specialRequests: 'Test booking created by script.'
    });

    console.log('Sample booking created with ID:', booking._id.toString());
    console.log('Computed totals => hours:', booking.totalHours, 'days:', booking.totalDays, 'amount:', booking.totalAmount);

    // 5) Show a quick count to confirm presence in DB
    const count = await Booking.countDocuments({});
    console.log('Total bookings in DB now:', count);

    process.exit(0);
  } catch (err) {
    console.error('Error creating sample booking:', err);
    process.exit(1);
  }
})();
