const Notification = require('../models/Notification');

// @desc    Get authenticated user's notification history
// @route   GET /api/notifications
// @access  Private
exports.getUserNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, read: false })
    ]);

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      readAt: n.readAt,
      complaintId: n.complaint ? n.complaint.toString() : null,
      createdAt: n.createdAt,
    }));

    res.json({
      success: true,
      notifications: formatted,
      unreadCount,
      pagination: {
        page,
        limit,
        total: totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count for authenticated user
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a specific notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification || notification.recipient.toString() !== req.user._id.toString()) {
      res.status(404);
      return next(new Error('Notification not found'));
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      success: true,
      notification: {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        readAt: notification.readAt,
        complaintId: notification.complaint ? notification.complaint.toString() : null,
        createdAt: notification.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all unread notifications as read for authenticated user
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
