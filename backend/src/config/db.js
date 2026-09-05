const mongoose = require('mongoose');
const seedUsers = require('./seeder');

let isListenersRegistered = false;

const sanitizeErrorMsg = (msg) => {
  if (!msg) return 'Database connection error';
  return String(msg).replace(/mongodb(\+srv)?:\/\/[^@]+@/g, 'mongodb$1://[credentials_redacted]@');
};

const connectDB = async () => {
  if (!isListenersRegistered) {
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB runtime connection error: ${sanitizeErrorMsg(err.message)}`);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost/disconnected.');
    });
    isListenersRegistered = true;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-complaint';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    if (process.env.NODE_ENV !== 'production') {
      await seedUsers();
    } else {
      console.log('Production environment detected: skipping auto-seeding.');
    }
    return conn;
  } catch (error) {
    const safeMsg = sanitizeErrorMsg(error.message);
    console.error(`Database Startup Connection Error: ${safeMsg}`);
    throw new Error(`Database Connection Error: ${safeMsg}`);
  }
};

module.exports = connectDB;
