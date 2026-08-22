require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
    try {
        console.log("Attempting MongoDB connection...");

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            family: 4,
        });

        console.log("✅ MongoDB Atlas connection successful!");
        console.log("Database:", mongoose.connection.name);

        await mongoose.disconnect();

        console.log("Connection closed.");
        process.exit(0);
    } catch (error) {
        console.error("❌ MongoDB connection failed.");
        console.error(error.message);

        process.exit(1);
    }
}

testConnection();