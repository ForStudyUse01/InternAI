const Notification = require("../../../models/Notification");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { resolvePagination } = require("../../../shared/utils/pagination");

async function listNotifications(req, res) {
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 30, maxLimit: 50 });
  const unreadOnly = String(req.query.unreadOnly || "false").toLowerCase() === "true";

  const query = { user: req.user._id };
  if (unreadOnly) query.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, isRead: false })
  ]);

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return sendSuccess(res, {
    data: { notifications, unreadCount },
    meta: { pagination: { page, limit, total, totalPages } }
  });
}

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    throw new AppError("Notification not found", 404, null, { code: "NOTIFICATION_NOT_FOUND" });
  }
  return sendSuccess(res, { data: { notification } });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  return sendSuccess(res, { message: "All notifications marked as read" });
});

module.exports = {
  listNotifications: asyncHandler(listNotifications),
  markNotificationRead,
  markAllNotificationsRead
};
