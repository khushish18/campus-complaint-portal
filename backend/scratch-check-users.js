require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

async function checkUsers() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected. Fetching users...");
    const users = await User.find({});
    console.log("Users in DB:");
    users.forEach(u => {
      console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUsers();
