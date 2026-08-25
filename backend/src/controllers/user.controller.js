const User = require('../models/User');
const Complaint = require('../models/Complaint');

// @desc    Get all staff members
// @route   GET /api/users/staff
// @access  Private (Warden, Admin)
exports.getStaffMembers = async (req, res, next) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('name email phone');
    res.json({
      success: true,
      count: staff.length,
      staff,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system-wide metrics
// @route   GET /api/users/stats
// @access  Private (Admin)
exports.getSystemStats = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalWardens = await User.countDocuments({ role: 'warden' });
    const totalStaff = await User.countDocuments({ role: 'staff' });
    
    const complaintsCount = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format aggregate output
    const statusCounts = {
      pending: 0,
      assigned: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0
    };
    complaintsCount.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    res.json({
      success: true,
      stats: {
        users: {
          student: totalStudents,
          warden: totalWardens,
          staff: totalStaff,
          total: totalStudents + totalWardens + totalStaff + 1 // Add 1 for the admin themselves
        },
        complaints: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-passwordHash').sort({ role: 1, name: 1 });
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};
