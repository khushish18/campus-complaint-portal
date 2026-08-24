require('dotenv').config();
const mongoose = require('mongoose');
const seedUsers = require('./seeder');

const run = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-complaint';
    console.log('Seeder CLI: Connecting to Database...');
    await mongoose.connect(uri);
    console.log('Seeder CLI: Database connection successful.');
    await seedUsers();
    console.log('Seeder CLI: Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Seeder CLI: Fatal Error: ${error.message}`);
    process.exit(1);
  }
};

run();
