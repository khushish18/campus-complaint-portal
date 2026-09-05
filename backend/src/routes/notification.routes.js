const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

router.use(protect); // All notification routes require authentication

router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
