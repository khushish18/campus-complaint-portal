const mongoose = require('mongoose');
const seedUsers = require('./seeder');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-complaint');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    if (process.env.NODE_ENV !== 'production') {
      await seedUsers();
    } else {
      console.log('Production environment detected: skipping auto-seeding.');
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('Fatal: Database connection failed in production. Server shutting down.');
      process.exit(1);
    } else {
      console.warn('Warning: Server executing without active MongoDB connection. Database calls will fail/queue.');
    }
  }
};

module.exports = connectDB;
