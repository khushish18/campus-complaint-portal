const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { analyzeComplaint } = require('../services/ai.service');
const { sendEmail } = require('../services/email.service');
const { notifyUser, broadcast } = require('../config/socket');

// @desc    Raise a new complaint (Student)
// @route   POST /api/complaints
// @access  Private (Student)
exports.createComplaint = async (req, res, next) => {
  try {
    const { title, description, attachments } = req.body;

    if (!title || !description) {
      res.status(400);
      return next(new Error('Title and description are required'));
    }

    // Call AI Service to tag category & urgency
    const aiResults = await analyzeComplaint(title, description);

    // Create complaint
    const complaint = await Complaint.create({
      student: req.user._id,
      title,
      description,
      attachments: attachments || [],
      category: aiResults.category,
      urgency: aiResults.urgency,
      status: 'pending',
      history: [
        {
          status: 'pending',
          updatedBy: req.user._id,
          remarks: `Complaint submitted. AI categorized as [${aiResults.category}] with [${aiResults.urgency}] urgency.`,
        },
      ],
    });

    // Notify wardens via Socket.io
    broadcast('newComplaint', {
      complaintId: complaint._id,
      title: complaint.title,
      category: complaint.category,
      urgency: complaint.urgency,
    });

    res.status(201).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints based on user role & filters
// @route   GET /api/complaints
// @access  Private
exports.getComplaints = async (req, res, next) => {
  try {
    let query = {};

    // Filter by role
    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.user.role === 'staff') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'warden') {
      // Wardens typically review complaints from their hostel or all complaints
      if (req.user.hostel) {
        // Find students in warden's hostel
        const studentIds = await User.find({ hostel: req.user.hostel }).select('_id');
        query.$or = [
          { student: { $in: studentIds } },
          { hostel: req.user.hostel } // or general tags
        ];
      }
    }

    // Query filter by status/category
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.urgency) {
      query.urgency = req.query.urgency;
    }

    const complaints = await Complaint.find(query)
      .populate('student', 'name email hostel roomNumber phone')
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint details
// @route   GET /api/complaints/:id
// @access  Private
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email hostel roomNumber phone')
      .populate('assignedTo', 'name email phone')
      .populate('history.updatedBy', 'name role');

    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Authorization checks
    if (req.user.role === 'student' && complaint.student._id.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to view this complaint'));
    }

    if (req.user.role === 'staff' && complaint.assignedTo && complaint.assignedTo._id.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to view this complaint'));
    }

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign complaint to staff member (Warden/Admin)
// @route   PATCH /api/complaints/:id/assign
// @access  Private (Warden/Admin)
exports.assignComplaint = async (req, res, next) => {
  try {
    const { staffId, remarks } = req.body;

    if (!staffId) {
      res.status(400);
      return next(new Error('Please provide staffId for assignment'));
    }

    // Verify staff exists and has staff role
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      res.status(400);
      return next(new Error('Invalid staff identifier'));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    complaint.assignedTo = staffId;
    complaint.status = 'assigned';
    complaint.history.push({
      status: 'assigned',
      updatedBy: req.user._id,
      remarks: remarks || `Assigned to staff: ${staff.name}`,
    });

    await complaint.save();

    // Notify staff member (Socket.io + Email)
    notifyUser(staffId, 'complaintAssigned', {
      complaintId: complaint._id,
      title: complaint.title,
    });

    await sendEmail({
      to: staff.email,
      subject: `New Complaint Work Order: ${complaint.title}`,
      text: `Hello ${staff.name},\n\nYou have been assigned a new complaint: "${complaint.title}".\nCategory: ${complaint.category}\nUrgency: ${complaint.urgency}\n\nPlease log in to check detail and begin remediation.\n\nRegards,\nCampus Caretaker`,
    });

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status (Staff/Warden/Admin)
// @route   PATCH /api/complaints/:id/status
// @access  Private (Staff/Warden/Admin)
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const allowedStatuses = ['in-progress', 'resolved'];

    if (!status || !allowedStatuses.includes(status)) {
      res.status(400);
      return next(new Error('Invalid status. Use "in-progress" or "resolved"'));
    }

    const complaint = await Complaint.findById(req.params.id).populate('student', 'name email');
    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Ensure staff member only updates their own ticket
    if (req.user.role === 'staff' && complaint.assignedTo.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to update status on this complaint'));
    }

    complaint.status = status;
    complaint.history.push({
      status,
      updatedBy: req.user._id,
      remarks: remarks || `Status updated to [${status}] by ${req.user.name}`,
    });

    await complaint.save();

    // Notify student (Socket.io + Email)
    notifyUser(complaint.student._id, 'statusUpdate', {
      complaintId: complaint._id,
      title: complaint.title,
      status,
    });

    await sendEmail({
      to: complaint.student.email,
      subject: `Complaint Status Updated: ${complaint.title}`,
      text: `Hello ${complaint.student.name},\n\nYour complaint "${complaint.title}" status has been updated to "${status}".\nRemarks: ${remarks || 'None'}\n\nThank you,\nCampus Caretaker`,
    });

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit student feedback and close ticket (Student)
// @route   PATCH /api/complaints/:id/feedback
// @access  Private (Student)
exports.submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating) {
      res.status(400);
      return next(new Error('Rating (1-5) is required to close complaint'));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Ensure student matches ticket raiser
    if (complaint.student.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Not authorized to submit feedback for this complaint'));
    }

    complaint.status = 'closed';
    complaint.feedbackRating = rating;
    complaint.feedbackComment = comment || '';
    complaint.history.push({
      status: 'closed',
      updatedBy: req.user._id,
      remarks: `Complaint closed by Student. Rating: ${rating}/5. Comment: ${comment || 'None'}`,
    });

    await complaint.save();

    // Broadcast update (to warden/staff if listening)
    broadcast('complaintClosed', {
      complaintId: complaint._id,
      rating,
    });

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};
