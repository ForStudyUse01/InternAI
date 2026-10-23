const asyncHandler = require("../../../shared/utils/asyncHandler");
const { sendSuccess } = require("../../../shared/utils/api-response");
const chatService = require("../../../services/chat.service");

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.listConversations(req.user);
  const unreadTotal = await chatService.getUnreadTotalForUser(req.user);
  return sendSuccess(res, { data: { conversations, unreadTotal } });
});

const listEligibleContacts = asyncHandler(async (req, res) => {
  const contacts = await chatService.listEligibleContacts(req.user);
  return sendSuccess(res, { data: { contacts } });
});

const createOrGetConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.findOrCreateConversation(req.user, req.body || {});
  return sendSuccess(res, { data: { conversation }, statusCode: 201 });
});

const getMessages = asyncHandler(async (req, res) => {
  const payload = await chatService.getConversationMessages(req.user, req.params.conversationId, {
    before: req.query.before,
    limit: req.query.limit
  });
  return sendSuccess(res, { data: payload });
});

const postMessage = asyncHandler(async (req, res) => {
  const result = await chatService.sendMessage(req.user, req.params.conversationId, req.body?.body);
  return sendSuccess(res, { data: result, statusCode: 201 });
});

const markRead = asyncHandler(async (req, res) => {
  const result = await chatService.markConversationRead(req.user, req.params.conversationId);
  return sendSuccess(res, { data: result });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadTotal = await chatService.getUnreadTotalForUser(req.user);
  return sendSuccess(res, { data: { unreadTotal } });
});

const getRecentConversations = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 5);
  const conversations = await chatService.listRecentConversations(req.user, limit);
  const unreadTotal = await chatService.getUnreadTotalForUser(req.user);
  return sendSuccess(res, { data: { conversations, unreadTotal } });
});

module.exports = {
  listConversations,
  listEligibleContacts,
  createOrGetConversation,
  getMessages,
  postMessage,
  markRead,
  getUnreadCount,
  getRecentConversations
};
