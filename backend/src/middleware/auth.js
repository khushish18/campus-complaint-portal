const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes middleware
const protect = async (req, res, next) => {
  let token;

  // Extract Bearer Token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_super_secret');

      // Fetch user from DB using the decoded userId
      const userId = decoded.userId || decoded.id; // support fallback
      const user = await User.findById(userId).select('-passwordHash');

      if (!user) {
        res.status(401);
        return next(new Error('Not authorized, user not found'));
      }

      // Check if user is active
      if (user.isActive === false) {
        res.status(403);
        return next(new Error('User account is inactive. Access denied.'));
      }

      // Attach user information to request
      req.user = user;
      return next();
    } catch (error) {
      res.status(401);
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Session expired, please login again'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Not authorized, token is invalid'));
      }
      return next(new Error('Not authorized, token verification failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token provided'));
  }
};

// Authorize roles middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized, no session found'));
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Role [${req.user.role}] is not authorized to access this resource`));
    }
    next();
  };
};

// requireRole alias for clean usage
const requireRole = (...roles) => authorize(...roles);

module.exports = { protect, authorize, requireRole };
