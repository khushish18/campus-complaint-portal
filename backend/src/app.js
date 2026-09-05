const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Standard middlewares
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., Postman, server-to-server) in development/test
    if (!origin) {
      return callback(null, true);
    }
    
    // In development/test, always allow localhost frontend
    if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Blocked by CORS policy (unauthorized origin)'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({
    status: dbConnected ? 'healthy' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Handle unknown API routes
app.use('*', (req, res, next) => {
  res.status(404);
  next(new Error(`API Route not found: ${req.originalUrl}`));
});

// Mount global error handler
app.use(errorHandler);

module.exports = app;
