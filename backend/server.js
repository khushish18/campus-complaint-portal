require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');

// Validate environment configurations
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('Fatal Error: JWT_SECRET environment variable is not defined.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'your_jwt_secret_key_here_super_secret') {
    console.error('Fatal Error: JWT_SECRET cannot be configured with the default placeholder in production.');
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB();

// Create HTTP Server
const server = http.createServer(app);

// Bind Socket.io
initSocket(server);

// Listen to port
server.listen(PORT, () => {
  console.log(`Server executing in mode [${process.env.NODE_ENV || 'development'}] on port: ${PORT}`);

  // Initialize periodic background worker for priority score recalculations (run every 5 minutes)
  const { updateActivePriorityScores } = require('./src/services/intelligence.service');
  setInterval(async () => {
    try {
      await updateActivePriorityScores();
    } catch (err) {
      console.error('Background Priority Worker Error:', err.message);
    }
  }, 5 * 60 * 1000);
});

// Graceful shutdown handler
const gracefulShutdown = (reason, error) => {
  console.error(`Fatal: Node process terminating due to [${reason}]`);
  if (error) {
    console.error(error.stack || error);
  }

  // Gracefully close HTTP & Socket server
  server.close(() => {
    console.log('HTTP & Socket.IO server shut down.');

    // Close MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      mongoose.connection.close().then(() => {
        console.log('MongoDB connection terminated.');
        process.exit(1);
      }).catch((err) => {
        console.error('Error closing MongoDB connection:', err.message);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  // Force close after 5 seconds if hanging
  setTimeout(() => {
    console.error('Forceful shutdown executed.');
    process.exit(1);
  }, 5000);
};

// Process-level exception / rejection tracking
process.on('uncaughtException', (err) => {
  gracefulShutdown('uncaughtException', err);
});

process.on('unhandledRejection', (err) => {
  gracefulShutdown('unhandledRejection', err);
});
