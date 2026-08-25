const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  assignComplaint,
  updateComplaintStatus,
  submitFeedback,
  uploadAttachment,
  reopenComplaint,
  addComment,
  getComments,
} = require('../controllers/complaint.controller');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .post(protect, authorize('student'), createComplaint)
  .get(protect, getComplaints);

router.post('/upload', protect, authorize('student'), upload.single('file'), uploadAttachment);

router.route('/:id')
  .get(protect, getComplaintById);

router.patch('/:id/assign', protect, authorize('warden', 'admin'), assignComplaint);
router.patch('/:id/status', protect, authorize('staff', 'warden', 'admin'), updateComplaintStatus);
router.patch('/:id/feedback', protect, authorize('student'), submitFeedback);
router.patch('/:id/reopen', protect, authorize('student'), reopenComplaint);

router.route('/:id/comments')
  .post(protect, addComment)
  .get(protect, getComments);

module.exports = router;
