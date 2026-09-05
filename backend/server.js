require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const mongoose = require('mongoose');

// Validate environment configurations
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('Fatal Error: JWT_SECRET environment variable is not defined.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'your_jwt_secret_key_here_super_secret' || process.env.JWT_SECRET.length < 32) {
    console.error('Fatal Error: JWT_SECRET is too weak or unsafe for production.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    console.error('Fatal Error: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;
let server;
let isShuttingDown = false;

// Graceful shutdown handler
const gracefulShutdown = (reason, error, exitCode = 1) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.error(`Server shutting down due to [${reason}]`);
  if (error) {
    const errMsg = error.message || String(error);
    console.error(`Error details: ${errMsg.replace(/mongodb(\+srv)?:\/\/[^@]+@/g, 'mongodb$1://[credentials_redacted]@')}`);
  }

  // Force close after 5 seconds if hanging
  const forceTimer = setTimeout(() => {
    console.error('Forceful shutdown executed after timeout.');
    process.exit(exitCode);
  }, 5000);
  if (forceTimer.unref) forceTimer.unref();

  const closeDatabase = () => {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      mongoose.connection.close(false).then(() => {
        console.log('MongoDB connection terminated.');
        process.exit(exitCode);
      }).catch((err) => {
        console.error('Error closing MongoDB connection:', err.message);
        process.exit(exitCode);
      });
    } else {
      process.exit(exitCode);
    }
  };

  if (server && server.listening) {
    server.close(() => {
      console.log('HTTP & Socket.IO server shut down.');
      closeDatabase();
    });
  } else {
    closeDatabase();
  }
};

// Process-level exception / rejection / signal tracking
process.on('uncaughtException', (err) => {
  gracefulShutdown('uncaughtException', err, 1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  gracefulShutdown('unhandledRejection', err, 1);
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM', null, 0);
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT', null, 0);
});

// Start Server Sequence
const startServer = async () => {
  try {
    // 1. Connect to Database first
    await connectDB();

    // 2. Create HTTP Server
    server = http.createServer(app);

    // 3. Bind Socket.io
    initSocket(server);

    // 4. Start Listening
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
  } catch (error) {
    console.error(`Fatal: Server startup aborted due to error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
