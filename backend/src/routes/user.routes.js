const express = require('express');
const router = express.Router();
const { getStaffMembers, getSystemStats, getUsers } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getUsers);
router.get('/staff', protect, authorize('warden', 'admin'), getStaffMembers);
router.get('/stats', protect, authorize('admin'), getSystemStats);

module.exports = router;
