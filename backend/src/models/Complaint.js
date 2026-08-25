const mongoose = require('mongoose');
const SLA_CONFIG = require('../config/slaConfig');

const historySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  remarks: {
    type: String,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student identifier is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'housekeeping', 'internet', 'other'],
      default: 'other',
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in-progress', 'resolved', 'closed'],
      default: 'pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String },
        contentType: { type: String },
        sizeBytes: { type: Number }
      }
    ],
    aiAnalysis: {
      category: { type: String },
      urgency: { type: String },
      summary: { type: String },
      suggestedDepartment: { type: String },
      confidence: { type: Number },
      provider: { type: String },
      analyzedAt: { type: Date, default: Date.now }
    },
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedbackComment: {
      type: String,
      trim: true,
    },
    history: [historySchema],
    assignedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimized analytics queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ urgency: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ resolvedAt: -1 });
complaintSchema.index({ closedAt: -1 });

// Virtual field for dynamic SLA information
complaintSchema.virtual('slaInfo').get(function () {
  const urgency = this.urgency || 'medium';
  const target = SLA_CONFIG.targets[urgency] || SLA_CONFIG.targets.medium;
  const createdAtTime = this.createdAt ? this.createdAt.getTime() : Date.now();

  const responseDeadline = new Date(createdAtTime + target.responseHours * 60 * 60 * 1000);
  const resolutionDeadline = new Date(createdAtTime + target.resolutionHours * 60 * 60 * 1000);

  let status = 'ON_TRACK';

  if (['resolved', 'closed'].includes(this.status)) {
    const resolvedTime = this.resolvedAt ? this.resolvedAt.getTime() : (this.updatedAt ? this.updatedAt.getTime() : Date.now());
    if (resolvedTime <= resolutionDeadline.getTime()) {
      status = 'COMPLETED_WITHIN_SLA';
    } else {
      status = 'COMPLETED_LATE';
    }
  } else {
    const now = Date.now();
    if (now > resolutionDeadline.getTime()) {
      status = 'OVERDUE';
    } else {
      const timeRemaining = resolutionDeadline.getTime() - now;
      const totalTime = target.resolutionHours * 60 * 60 * 1000;
      if (timeRemaining / totalTime <= SLA_CONFIG.riskThresholdPercent / 100) {
        status = 'AT_RISK';
      }
    }
  }

  return {
    urgency,
    responseDeadline,
    resolutionDeadline,
    status,
    timeRemainingMs: Math.max(0, resolutionDeadline.getTime() - Date.now()),
    resolutionTargetHours: target.resolutionHours,
    responseTargetHours: target.responseHours,
  };
});

module.exports = mongoose.model('Complaint', complaintSchema);
