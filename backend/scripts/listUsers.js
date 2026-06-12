const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = await User.find({}).select('email role isActive createdAt');
    console.log(`Total users: ${users.length}`);
    users.forEach(u => {
      console.log(`${u.email} | role=${u.role} | active=${u.isActive} | created=${u.createdAt?.toISOString?.()}`);
    });

    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@carrental.com' }).select('email role');
    if (admin) {
      console.log(`\nAdmin found: ${admin.email} (role=${admin.role})`);
    } else {
      console.log('\nAdmin not found with configured email');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('List users error:', err);
    process.exit(1);
  }
}

main();



