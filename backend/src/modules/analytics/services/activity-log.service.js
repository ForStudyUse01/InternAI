const ActivityLog = require("../../../models/ActivityLog");

async function logActivity({
  actorUser = null,
  actorRole = "",
  entityType,
  entityId = null,
  action,
  metadata = null,
  ipAddress = ""
}) {
  if (!entityType || !action) return;
  try {
    await ActivityLog.create({ actorUser, actorRole, entityType, entityId, action, metadata, ipAddress });
  } catch {
    // Logging must never fail user flows.
  }
}

module.exports = { logActivity };
