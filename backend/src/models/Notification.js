const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'complaint_created',
          'complaint_assigned',
          'status_changed',
          'comment_added',
          'complaint_resolved',
          'complaint_reopened',
          'sla_warning',
          'sla_breached',
          'system'
        ],
        message: '{VALUE} is not a valid notification type'
      }
    },
    title: {
      type: String,
      trim: true,
      default: 'SmartCampus Notification'
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Compound indexes for optimized notification query sorting & filtering
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
