const express = require('express');
const router = express.Router();
const { getStaffMembers, getSystemStats } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');

router.get('/staff', protect, authorize('warden', 'admin'), getStaffMembers);
router.get('/stats', protect, authorize('admin'), getSystemStats);

module.exports = router;
