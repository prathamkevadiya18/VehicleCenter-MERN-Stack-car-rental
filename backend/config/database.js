const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/car-rental';
  try {
    console.log(`Connecting to MongoDB at: ${uri}`);
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    console.error(`Tried MongoDB URI: ${uri}`);
    process.exit(1);
  }
};

module.exports = connectDB;
