const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT containing only userId and role
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing!');
  }
  return jwt.sign(
    { userId: user._id, role: user.role },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRE || '24h',
    }
  );
};

// @desc    Register a new student user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, roomNo, hostelBlock } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      return next(new Error('Please provide name, email, and password'));
    }

    if (!hostelBlock || !roomNo) {
      res.status(400);
      return next(new Error('Hostel block and room number are required for student registration'));
    }

    const validBlocks = ['Tagore Hall', 'Radhakrishnan Hall', 'Nehru Hall', 'Patel Hall'];
    if (!validBlocks.includes(hostelBlock)) {
      res.status(400);
      return next(new Error(`Invalid hostel block. Must be one of: ${validBlocks.join(', ')}`));
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error('User already exists with this email'));
    }

    // Create user (force role to 'student' to prevent arbitrary admin/staff creation)
    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook handles hashing
      role: 'student',
      roomNo,
      hostelBlock,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roomNo: user.roomNo,
        hostelBlock: user.hostelBlock,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      res.status(400);
      return next(new Error('Please provide email and password'));
    }

    // Check for user (explicitly selecting passwordHash)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    // Check if user is active
    if (user.isActive === false) {
      res.status(403);
      return next(new Error('Your account is deactivated. Please contact administration.'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    res.json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roomNo: user.roomNo,
        hostelBlock: user.hostelBlock,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  try {
    // In stateless JWT, client discards token. Simply return success.
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // req.user is already populated by protect middleware (excluding passwordHash)
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        roomNo: req.user.roomNo,
        hostelBlock: req.user.hostelBlock,
        isActive: req.user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};
