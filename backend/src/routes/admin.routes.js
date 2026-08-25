const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getOverview,
  getCategories,
  getHostels,
  getStaffWorkload,
  getTrends,
  getOverdue
} = require('../controllers/admin.controller');

// Require authentication and ADMIN role for all routes
router.use(protect, authorize('admin'));

router.get('/analytics/overview', getOverview);
router.get('/analytics/categories', getCategories);
router.get('/analytics/hostels', getHostels);
router.get('/analytics/staff', getStaffWorkload);
router.get('/analytics/trends', getTrends);
router.get('/sla/overdue', getOverdue);

module.exports = router;
