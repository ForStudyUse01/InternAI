const ChatConversation = require("../../../models/ChatConversation");
const ChatMessage = require("../../../models/ChatMessage");
const InternProfile = require("../../../models/InternProfile");
const CompanyProfile = require("../../../models/CompanyProfile");
const Application = require("../../../models/Application");
const User = require("../../../models/User");
const AppError = require("../../../shared/utils/AppError");
const { isEnabled } = require("../../../shared/config/feature-flags");
const { createInAppNotification } = require("../../../services/in-app-notification.service");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");
function socketEmitters() {
  return require("../../../shared/socket/chat.socket");
}

function assertChatEnabled() {
  if (!isEnabled("ENABLE_CHAT")) {
    throw new AppError("Chat is currently disabled", 503);
  }
}

async function resolveCompanyForUser(user) {
  if (!user || user.role !== "company") return null;

  if (user.companyProfileRef) {
    const linked = await CompanyProfile.findOne({
      _id: user.companyProfileRef,
      isDeleted: { $ne: true }
    }).lean();
    if (linked) return linked;
  }

  return CompanyProfile.findOne({ user: user._id, isDeleted: { $ne: true } }).lean();
}

async function getCompanyProfileForUser(user) {
  const company = await resolveCompanyForUser(user);
  if (!company) {
    throw new AppError("Company profile not found", 404);
  }
  return company;
}

async function findCompanyTeamUsers(companyId) {
  const [company, linkedUsers] = await Promise.all([
    CompanyProfile.findById(companyId).select("user").lean(),
    User.find({
      role: "company",
      companyProfileRef: companyId,
      isActive: true,
      isDeleted: { $ne: true }
    })
      .select("_id")
      .lean()
  ]);
  const userIds = new Set();

  linkedUsers.forEach((item) => userIds.add(String(item._id)));

  if (company?.user) {
    const owner = await User.findOne({
      _id: company.user,
      role: "company",
      isActive: true,
      isDeleted: { $ne: true }
    })
      .select("_id")
      .lean();
    if (owner) userIds.add(String(owner._id));
  }

  return Array.from(userIds).map((id) => ({ _id: id }));
}

async function getInternProfileForUser(user) {
  const profile = await InternProfile.findOne({ user: user._id });
  if (!profile) {
    throw new AppError("Intern profile not found", 404);
  }
  return profile;
}

async function assertApplicationLink(internProfileId, companyId) {
  const application = await Application.findOne({
    $or: [
      { internId: internProfileId, companyId },
      { intern: internProfileId, company: companyId }
    ]
  }).lean();
  if (!application) {
    throw new AppError("Chat is only available between applicants and hiring companies.", 403);
  }
  return application;
}

// A conversation's "company side" is one specific individual, not the whole
// company — the assigned recruiter on the linked application. This applies
// uniformly to HR and CEO/Owner alike (no admin bypass): a company user only
// sees a conversation where they are the actual participant.
async function canAccessConversation(user, conversation) {
  if (!conversation) return false;
  if (user.role === "intern") {
    return String(conversation.internUser) === String(user._id);
  }
  if (user.role === "company") {
    const company = await resolveCompanyForUser(user);
    if (!company || String(conversation.company) !== String(company._id)) return false;
    if (!conversation.application) return false;
    const application = await Application.findById(conversation.application).select("assignedRecruiter").lean();
    return Boolean(application?.assignedRecruiter) && String(application.assignedRecruiter) === String(user._id);
  }
  return false;
}

// Resolves the set of Application ids a company-role user is an actual
// participant of (their assigned recruiter slot), for scoping conversation
// listings/aggregates. Same rule for HR and CEO/Owner — no company-wide access.
async function resolveOwnApplicationIds(user, companyId) {
  const applications = await Application.find({ companyId, assignedRecruiter: user._id }).select("_id").lean();
  return applications.map((app) => app._id);
}

function chatLinkForRole(role, conversationId) {
  const base = role === "intern" ? "/dashboard/intern/chat" : "/dashboard/company/chat";
  return `${base}?conversation=${conversationId}`;
}

function serializeMessage(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return {
    _id: item._id,
    conversation: item.conversation,
    body: item.body,
    senderRole: item.senderRole,
    sender: item.sender,
    status: item.status || "sent",
    deliveredAt: item.deliveredAt || null,
    readAt: item.readAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function serializeConversation(doc, viewerRole) {
  const conversation = doc.toObject ? doc.toObject() : doc;
  return {
    ...conversation,
    unreadCount: viewerRole === "intern" ? conversation.unreadIntern : conversation.unreadCompany
  };
}

function detectMessageAlertType(text = "") {
  const lower = String(text).toLowerCase();
  if (/interview|round|schedule|meeting|join\s+link/i.test(lower)) {
    return "interview";
  }
  if (/system|automated|platform/i.test(lower)) {
    return "system";
  }
  return "message";
}

async function getUnreadTotalForUser(user) {
  if (user.role === "intern") {
    const result = await ChatConversation.aggregate([
      { $match: { internUser: user._id } },
      { $group: { _id: null, total: { $sum: "$unreadIntern" } } }
    ]);
    return result[0]?.total || 0;
  }
  if (user.role === "company") {
    const company = await resolveCompanyForUser(user);
    if (!company) return 0;
    const applicationIds = await resolveOwnApplicationIds(user, company._id);
    if (!applicationIds.length) return 0;
    const result = await ChatConversation.aggregate([
      { $match: { company: company._id, application: { $in: applicationIds } } },
      { $group: { _id: null, total: { $sum: "$unreadCompany" } } }
    ]);
    return result[0]?.total || 0;
  }
  return 0;
}

async function listConversations(user) {
  assertChatEnabled();
  let query = {};
  if (user.role === "intern") {
    query = { internUser: user._id };
  } else if (user.role === "company") {
    const company = await resolveCompanyForUser(user);
    if (!company) return [];
    const applicationIds = await resolveOwnApplicationIds(user, company._id);
    if (!applicationIds.length) return [];
    query = { company: company._id, application: { $in: applicationIds } };
  } else {
    throw new AppError("Chat is only available for interns and company users", 403);
  }

  const conversations = await ChatConversation.find(query)
    .populate("company", "companyName companyEmail verificationStatus")
    .populate("internProfile", "fullName email")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  return conversations.map((item) => serializeConversation(item, user.role));
}

async function findOrCreateConversation(user, payload) {
  assertChatEnabled();
  let internProfile;
  let company;

  if (user.role === "intern") {
    internProfile = await getInternProfileForUser(user);
    company = await CompanyProfile.findById(payload.companyId);
    if (!company || company.isDeleted) {
      throw new AppError("Company not found", 404);
    }
  } else if (user.role === "company") {
    company = await getCompanyProfileForUser(user);
    internProfile = await InternProfile.findById(payload.internProfileId);
    if (!internProfile) {
      throw new AppError("Intern profile not found", 404);
    }
  } else {
    throw new AppError("Chat is only available for interns and company users", 403);
  }

  const application = await assertApplicationLink(internProfile._id, company._id);

  if (user.role === "company" && String(application.assignedRecruiter || "") !== String(user._id)) {
    throw new AppError("You must be assigned to this candidate before starting a conversation.", 403);
  }

  let conversation = await ChatConversation.findOne({
    internProfile: internProfile._id,
    company: company._id
  });

  if (!conversation) {
    conversation = await ChatConversation.create({
      internProfile: internProfile._id,
      internUser: internProfile.user,
      company: company._id,
      application: application._id,
      lastMessageAt: new Date()
    });
  }

  await conversation.populate([
    { path: "company", select: "companyName companyEmail verificationStatus" },
    { path: "internProfile", select: "fullName email" }
  ]);

  return serializeConversation(conversation, user.role);
}

async function getConversationMessages(user, conversationId, options = {}) {
  assertChatEnabled();
  const conversation = await ChatConversation.findById(conversationId);
  if (!(await canAccessConversation(user, conversation))) {
    throw new AppError("Conversation not found", 404);
  }

  const limit = Math.min(100, Math.max(1, Number(options.limit || 50)));
  const query = { conversation: conversation._id };
  if (options.before) {
    query.createdAt = { $lt: new Date(options.before) };
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "email role displayName")
    .lean();

  return {
    conversation: serializeConversation(conversation, user.role),
    messages: messages.reverse().map((message) => serializeMessage(message))
  };
}

// The single company-side user for a conversation — its assigned recruiter.
// Notifications and live socket pushes must target only this user, never the
// whole company team, or the conversation's privacy guarantee is void.
async function resolveConversationRecruiterId(conversation) {
  if (!conversation?.application) return null;
  const application = await Application.findById(conversation.application).select("assignedRecruiter").lean();
  return application?.assignedRecruiter || null;
}

async function notifyChatRecipient(conversation, senderRole, preview, senderUserId) {
  const populated = await ChatConversation.findById(conversation._id)
    .populate("company", "companyName")
    .populate("internProfile", "fullName");
  const companyName = populated?.company?.companyName || "Company";
  const internName = populated?.internProfile?.fullName || "Intern";
  const alertType = detectMessageAlertType(preview);

  const titleForCompany =
    alertType === "interview"
      ? `Interview message from ${internName}`
      : `New message from ${internName}`;
  const titleForIntern =
    alertType === "interview"
      ? `Interview update from ${companyName}`
      : `New message from ${companyName}`;

  const notifications = [];

  if (senderRole === "intern") {
    const recruiterId = await resolveConversationRecruiterId(conversation);
    if (!recruiterId || String(recruiterId) === String(senderUserId)) {
      return notifications;
    }
    const doc = await createInAppNotification({
      userId: recruiterId,
      type: NOTIFICATION_TYPES.CHAT_MESSAGE,
      title: titleForCompany,
      message: preview,
      link: chatLinkForRole("company", conversation._id),
      metadata: { conversationId: conversation._id, alertType, senderRole }
    });
    return doc ? [{ userId: recruiterId, notification: doc }] : [];
  }

  if (String(conversation.internUser) === String(senderUserId)) {
    return notifications;
  }

  const doc = await createInAppNotification({
    userId: conversation.internUser,
    type: NOTIFICATION_TYPES.CHAT_MESSAGE,
    title: titleForIntern,
    message: preview,
    link: chatLinkForRole("intern", conversation._id),
    metadata: { conversationId: conversation._id, alertType, senderRole }
  });
  if (doc) {
    notifications.push({ userId: conversation.internUser, notification: doc });
  }
  return notifications;
}

async function markMessageDelivered(messageId) {
  const message = await ChatMessage.findByIdAndUpdate(
    messageId,
    { status: "delivered", deliveredAt: new Date() },
    { new: true }
  ).populate("sender", "email role displayName");
  return message ? serializeMessage(message) : null;
}

async function sendMessage(user, conversationId, body) {
  assertChatEnabled();
  const text = String(body || "").trim();
  if (!text) {
    throw new AppError("Message body is required", 400);
  }

  const conversation = await ChatConversation.findById(conversationId);
  if (!(await canAccessConversation(user, conversation))) {
    throw new AppError("Conversation not found", 404);
  }

  const senderRole = user.role === "intern" ? "intern" : "company";
  const message = await ChatMessage.create({
    conversation: conversation._id,
    sender: user._id,
    senderRole,
    body: text
  });

  conversation.lastMessageText = text.slice(0, 500);
  conversation.lastMessageAt = message.createdAt;
  conversation.lastSenderRole = senderRole;
  if (senderRole === "intern") {
    conversation.unreadCompany += 1;
  } else {
    conversation.unreadIntern += 1;
  }
  await conversation.save();

  await message.populate("sender", "email role displayName");

  const payload = serializeMessage(message);

  await notifyChatRecipient(conversation, senderRole, text.slice(0, 120), user._id);

  const serializedConversation = serializeConversation(conversation, user.role);
  socketEmitters().emitToConversation(conversation._id, "message:new", payload);
  socketEmitters().emitToConversation(conversation._id, "conversation:updated", serializedConversation);

  if (senderRole === "intern") {
    const recruiterId = await resolveConversationRecruiterId(conversation);
    if (recruiterId) {
      socketEmitters().emitToUser(recruiterId, "message:new", payload);
      socketEmitters().emitToUser(recruiterId, "conversation:updated", serializedConversation);
    }
  } else {
    socketEmitters().emitToUser(conversation.internUser, "message:new", payload);
    socketEmitters().emitToUser(conversation.internUser, "conversation:updated", serializedConversation);
  }

  return {
    message: payload,
    conversation: serializedConversation
  };
}

async function markConversationRead(user, conversationId) {
  assertChatEnabled();
  const conversation = await ChatConversation.findById(conversationId);
  if (!(await canAccessConversation(user, conversation))) {
    throw new AppError("Conversation not found", 404);
  }

  const otherRole = user.role === "intern" ? "company" : "intern";

  if (user.role === "intern") {
    conversation.unreadIntern = 0;
  } else if (user.role === "company") {
    conversation.unreadCompany = 0;
  }
  await conversation.save();

  await ChatMessage.updateMany(
    { conversation: conversation._id, senderRole: otherRole, readAt: null },
    { $set: { status: "read", readAt: new Date() } }
  );

  const readMessages = await ChatMessage.find({
    conversation: conversation._id,
    senderRole: otherRole,
    status: "read"
  })
    .sort({ readAt: -1 })
    .limit(100);

  readMessages.forEach((msg) => {
    socketEmitters().emitToConversation(conversation._id, "message:status", serializeMessage(msg));
  });

  socketEmitters().emitToConversation(conversation._id, "conversation:read", {
    conversationId: conversation._id,
    readerRole: user.role
  });

  const unreadTotal = await getUnreadTotalForUser(user);
  socketEmitters().emitUnreadToUser(user._id, unreadTotal);

  return {
    conversation: serializeConversation(conversation, user.role),
    unreadTotal
  };
}

async function listRecentConversations(user, limit = 5) {
  const conversations = await listConversations(user);
  return conversations.slice(0, Math.max(1, Math.min(10, limit)));
}

async function listEligibleContacts(user) {
  assertChatEnabled();
  if (user.role === "intern") {
    const profile = await getInternProfileForUser(user);
    const applications = await Application.find({
      $or: [{ internId: profile._id }, { intern: profile._id }]
    })
      .populate("company", "companyName companyEmail verificationStatus")
      .sort({ updatedAt: -1 })
      .lean();

    const seen = new Set();
    return applications
      .filter((app) => app.company && !seen.has(String(app.company._id)) && seen.add(String(app.company._id)))
      .map((app) => ({
        companyId: app.company._id,
        companyName: app.company.companyName,
        internshipRole: app.internship?.role || "",
        applicationId: app._id
      }));
  }

  if (user.role === "company") {
    const company = await resolveCompanyForUser(user);
    if (!company) return [];
    const applications = await Application.find({
      $or: [{ companyId: company._id }, { company: company._id }],
      assignedRecruiter: user._id
    })
      .populate("intern", "fullName email")
      .populate("internship", "role")
      .sort({ updatedAt: -1 })
      .lean();

    const seen = new Set();
    return applications
      .filter((app) => app.intern && !seen.has(String(app.intern._id)) && seen.add(String(app.intern._id)))
      .map((app) => ({
        internProfileId: app.intern._id,
        internName: app.intern.fullName,
        internEmail: app.intern.email,
        internshipRole: app.internship?.role || "",
        applicationId: app._id
      }));
  }

  return [];
}

module.exports = {
  assertChatEnabled,
  resolveCompanyForUser,
  findCompanyTeamUsers,
  resolveConversationRecruiterId,
  canAccessConversation,
  listConversations,
  listRecentConversations,
  findOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  markMessageDelivered,
  getUnreadTotalForUser,
  listEligibleContacts,
  serializeConversation,
  serializeMessage,
  chatLinkForRole
};
