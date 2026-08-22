const mongoose = require('mongoose');
const seedUsers = require('./seeder');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-complaint');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedUsers();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.warn('Warning: Server executing without active MongoDB connection. Database calls will fail/queue.');
  }
};

module.exports = connectDB;
