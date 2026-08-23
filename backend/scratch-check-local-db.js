const mongoose = require("mongoose");
const User = require("./src/models/User");

async function checkLocalDB() {
  try {
    console.log("Connecting to Local DB...");
    await mongoose.connect("mongodb://127.0.0.1:27017/campus-complaint");
    console.log("Connected. Fetching users...");
    const users = await User.find({});
    console.log("Users in Local DB:");
    users.forEach(u => {
      console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Local DB check failed:", error.message);
    process.exit(1);
  }
}

checkLocalDB();
