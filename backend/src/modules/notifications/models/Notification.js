const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      default: NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    isRead: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, "metadata.reminderKey": 1 });

module.exports = mongoose.model("Notification", notificationSchema);
