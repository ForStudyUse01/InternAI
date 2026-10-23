const Notification = require("../../../models/Notification");
const InternProfile = require("../../../models/InternProfile");
const CompanyProfile = require("../../../models/CompanyProfile");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");
const { isEnabled } = require("../../../shared/config/feature-flags");

function emitNotificationRealtime(userId, notification) {
  if (!userId || !notification || !isEnabled("ENABLE_NOTIFICATIONS")) return;
  try {
    const { emitToUser } = require("../../../shared/socket/chat.socket");
    emitToUser(userId, "notification:new", {
      notification,
      unreadDelta: 1
    });
  } catch (err) {
    // Socket may be unavailable during tests or startup — log so a real
    // delivery failure in production doesn't disappear silently.
    console.error(`[notifications] failed to push realtime notification to user ${userId}:`, err.message);
  }
}

async function createInAppNotification({ userId, type, title, message = "", link = "", metadata = null }) {
  if (!userId || !title) return null;
  const notification = await Notification.create({
    user: userId,
    type: type || NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED,
    title,
    message,
    link,
    metadata
  });
  emitNotificationRealtime(userId, notification);
  return notification;
}

async function notifyInternByProfileId(internProfileId, payload) {
  const profile = await InternProfile.findById(internProfileId).select("user");
  if (!profile?.user) return null;
  return createInAppNotification({ userId: profile.user, ...payload });
}

async function notifyCompanyApplicationStakeholders({
  companyProfileId,
  assignedRecruiterId = null,
  internshipAssignedRecruiterId = null,
  excludeUserId = null,
  payload
}) {
  const recipientIds = new Set();
  if (companyProfileId) {
    const company = await CompanyProfile.findById(companyProfileId).select("user");
    if (company?.user) recipientIds.add(String(company.user));
  }
  if (assignedRecruiterId) recipientIds.add(String(assignedRecruiterId));
  if (internshipAssignedRecruiterId) recipientIds.add(String(internshipAssignedRecruiterId));
  if (excludeUserId) recipientIds.delete(String(excludeUserId));

  const results = [];
  for (const userId of recipientIds) {
    results.push(await createInAppNotification({ userId, ...payload }));
  }
  return results;
}

module.exports = {
  createInAppNotification,
  notifyInternByProfileId,
  notifyCompanyApplicationStakeholders,
  emitNotificationRealtime
};
