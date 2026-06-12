const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if user with the admin email exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@carrental.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingUser = await User.findOne({ email: adminEmail }).select('+password');

    if (existingUser) {
      // Always enforce admin role and reset password to ensure known credentials work
      existingUser.role = 'admin';
      existingUser.password = adminPassword; // will be hashed by pre-save hook
      await existingUser.save();
      console.log('Admin user ensured with reset password:', existingUser.email);
    } else {
      // Create admin user
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        phone: '1234567890',
        password: adminPassword,
        role: 'admin'
      });
      console.log('Admin user created successfully:', adminUser.email);
    }
    process.exit(0);

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
