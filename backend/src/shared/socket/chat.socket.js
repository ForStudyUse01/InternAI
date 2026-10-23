const { Server } = require("socket.io");
const User = require("../../models/User");
const { verifyAccessToken } = require("../utils/jwt");
const { isEnabled } = require("../config/feature-flags");

let io = null;
let chatService = null;

function getChatService() {
  if (!chatService) {
    chatService = require("../../services/chat.service");
  }
  return chatService;
}

function emitUnreadToUser(userId, unreadTotal) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("unread:updated", { unreadTotal });
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToConversation(conversationId, event, payload) {
  if (!io || !conversationId) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

async function emitUnreadToCompanyUsers(companyId, excludeUserId) {
  const service = getChatService();
  const users = await service.findCompanyTeamUsers(companyId);

  for (const companyUser of users) {
    if (excludeUserId && String(companyUser._id) === String(excludeUserId)) continue;
    const unreadTotal = await service.getUnreadTotalForUser(companyUser);
    emitUnreadToUser(companyUser._id, unreadTotal);
  }
}

function initChatSocket(server) {
  if (!isEnabled("ENABLE_CHAT") && !isEnabled("ENABLE_INTERVIEW_ROOMS")) {
    return null;
  }

  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId).select(
        "_id email role isActive companyProfileRef companyAccountType"
      );
      if (!user || !user.isActive) {
        return next(new Error("Unauthorized"));
      }
      if (!["intern", "company"].includes(user.role)) {
        return next(new Error("Forbidden"));
      }
      if (user.role === "company" && !user.companyAccountType) {
        const { COMPANY_ACCOUNT_TYPES } = require("../constants/enums");
        user.companyAccountType = COMPANY_ACCOUNT_TYPES.OWNER;
      }
      socket.user = user;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);

    if (!isEnabled("ENABLE_CHAT")) {
      return;
    }

    socket.on("conversation:join", async ({ conversationId }, callback) => {
      try {
        const ChatConversation = require("../../models/ChatConversation");
        const service = getChatService();
        const conversation = await ChatConversation.findById(conversationId);
        if (!(await service.canAccessConversation(socket.user, conversation))) {
          callback?.({ ok: false, message: "Conversation not found" });
          return;
        }
        socket.join(`conversation:${conversationId}`);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to join conversation" });
      }
    });

    socket.on("message:send", async ({ conversationId, body }, callback) => {
      try {
        const service = getChatService();
        const result = await service.sendMessage(socket.user, conversationId, body);
        const message = result.message;

        const ChatConversation = require("../../models/ChatConversation");
        const conversation = await ChatConversation.findById(conversationId).select("company internUser");

        if (socket.user.role === "intern") {
          await emitUnreadToCompanyUsers(conversation.company, socket.user._id);
          const recruiterId = await service.resolveConversationRecruiterId(conversation);
          if (recruiterId && String(recruiterId) !== String(socket.user._id)) {
            const delivered = await service.markMessageDelivered(message._id);
            if (delivered) {
              emitToUser(recruiterId, "message:status", delivered);
            }
          }
        } else {
          const internUnread = await service.getUnreadTotalForUser({ _id: conversation.internUser, role: "intern" });
          emitUnreadToUser(conversation.internUser, internUnread);
          const delivered = await service.markMessageDelivered(message._id);
          if (delivered) {
            emitToUser(conversation.internUser, "message:status", delivered);
          }
        }

        const senderUnread = await service.getUnreadTotalForUser(socket.user);
        emitUnreadToUser(socket.user._id, senderUnread);

        callback?.({ ok: true, message, conversation: result.conversation });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to send message" });
      }
    });
  });

  return io;
}

function getChatIo() {
  return io;
}

module.exports = {
  initChatSocket,
  getChatIo,
  emitUnreadToUser,
  emitToUser,
  emitToConversation
};
