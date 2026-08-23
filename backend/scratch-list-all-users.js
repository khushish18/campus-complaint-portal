require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        hostelBlock: u.hostelBlock,
        roomNo: u.roomNo
      });
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
  });
