const express = require("express");
const chatController = require("../../../controllers/chat.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const { requireSidebarModuleForCompanyUsers } = require("../../../shared/middleware/company-access.middleware");
const { SIDEBAR_MODULE_KEYS } = require("../../../constants/sidebar-modules");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.use(authMiddleware, allowRoles("intern", "company"));
router.use(requireSidebarModuleForCompanyUsers(SIDEBAR_MODULE_KEYS.MESSAGES));

router.get("/unread-count", chatController.getUnreadCount);
router.get("/recent", chatController.getRecentConversations);
router.get("/contacts", chatController.listEligibleContacts);
router.get("/conversations", chatController.listConversations);
router.post("/conversations", chatController.createOrGetConversation);
router.get("/conversations/:conversationId/messages", validateObjectId("conversationId"), chatController.getMessages);
router.post("/conversations/:conversationId/messages", validateObjectId("conversationId"), chatController.postMessage);
router.patch("/conversations/:conversationId/read", validateObjectId("conversationId"), chatController.markRead);

module.exports = router;
