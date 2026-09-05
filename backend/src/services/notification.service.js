const Notification = require('../models/Notification');
const { notifyUser } = require('../config/socket');

/**
 * Creates a persistent notification in MongoDB and dispatches a Socket.IO event.
 *
 * @param {Object} params
 * @param {string|Object} params.recipient - Target User ID
 * @param {string} params.type - Notification type enum
 * @param {string} [params.title] - Notification title header
 * @param {string} params.message - Notification body text
 * @param {string|Object} [params.complaintId] - Associated Complaint ID
 * @param {string} [params.socketEvent] - Socket.IO event name (e.g. 'newComplaint', 'statusUpdate')
 * @param {Object} [params.socketData] - Custom payload for Socket.IO dispatch
 */
const createNotification = async ({
  recipient,
  type,
  title = 'SmartCampus Notification',
  message,
  complaintId = null,
  socketEvent = null,
  socketData = {}
}) => {
  if (!recipient || !message) {
    console.warn('createNotification skipped: missing recipient or message.');
    return null;
  }

  const recipientId = recipient._id ? recipient._id.toString() : recipient.toString();

  let notification = null;
  try {
    // 1. Persist notification first
    notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      complaint: complaintId || null,
      read: false,
    });
  } catch (err) {
    console.error(`Notification persistence error for user [${recipientId}]:`, err.message);
  }

  // 2. Emit Socket.IO real-time event if specified
  if (socketEvent) {
    try {
      const payload = {
        ...socketData,
        notificationId: notification ? notification._id.toString() : null,
        id: notification ? notification._id.toString() : Date.now().toString(),
        complaintId: complaintId ? complaintId.toString() : socketData.complaintId,
        message,
        type,
        createdAt: notification ? notification.createdAt : new Date(),
      };
      notifyUser(recipientId, socketEvent, payload);
    } catch (sockErr) {
      console.error(`Socket notification dispatch error for user [${recipientId}]:`, sockErr.message);
    }
  }

  return notification;
};

module.exports = {
  createNotification
};
