const socketIO = require('socket.io');

let io;
const userSockets = new Map(); // Map to store userId -> socketId

const initSocket = (server) => {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];

  io = socketIO(server, {
    cors: {
      origin: (origin, callback) => {
        // Handle Socket.IO connection when origin header is not sent (e.g. mobile client / backend test tool)
        if (!origin) {
          return callback(null, true);
        }

        // Allow localhost in non-production environments
        if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Blocked by CORS policy (unauthorized origin)'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register user ID with socket ID
    socket.on('register', (userId) => {
      if (userId) {
        userSockets.set(userId.toString(), socket.id);
        console.log(`User ${userId} registered to socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      // Find and remove disconnected socket from Map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected from socket ${socket.id}`);
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Send real-time notification to a specific user
const notifyUser = (userId, eventName, data) => {
  if (!io) return;
  
  const socketId = userSockets.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(eventName, data);
    console.log(`Socket notification dispatched to user ${userId}: ${eventName}`);
  } else {
    console.log(`User ${userId} offline. Socket notification skipped.`);
  }
};

// Broadcast notification to all connected users
const broadcast = (eventName, data) => {
  if (!io) return;
  io.emit(eventName, data);
  console.log(`Socket broadcast: ${eventName}`);
};

module.exports = { initSocket, getIO, notifyUser, broadcast };
