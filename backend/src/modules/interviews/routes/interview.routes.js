const express = require("express");
const interviewController = require("../../../controllers/interview.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const { requireSidebarModuleForCompanyUsers } = require("../../../shared/middleware/company-access.middleware");
const { SIDEBAR_MODULE_KEYS } = require("../../../constants/sidebar-modules");

const router = express.Router();

router.use(authMiddleware, allowRoles("intern", "company"));
router.use(requireSidebarModuleForCompanyUsers(SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING));

router.get("/:roomId", interviewController.getRoom);
router.post("/:roomId/join", interviewController.joinRoom);
router.patch("/:roomId/notes", interviewController.updateNotes);
router.patch("/:roomId/outcome", interviewController.updateOutcome);
router.post("/:roomId/end", interviewController.endInterview);

module.exports = router;
