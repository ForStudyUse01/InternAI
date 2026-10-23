const { enqueueNotification } = require("../../../services/notification-queue.service");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");

function sendNotificationEmail({ to, subject, text, type = NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED }) {
  if (!to || !subject || !text) return;
  enqueueNotification({ to, subject, text, type });
}

module.exports = { sendNotificationEmail };
