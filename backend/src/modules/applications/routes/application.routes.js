const express = require("express");
const applicationController = require("../../../controllers/application.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const { requireSidebarModuleForCompanyUsers } = require("../../../shared/middleware/company-access.middleware");
const { SIDEBAR_MODULE_KEYS } = require("../../../constants/sidebar-modules");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(requireSidebarModuleForCompanyUsers(SIDEBAR_MODULE_KEYS.APPLICATIONS));
router.get("/:id", validateObjectId("id"), applicationController.getApplicationById);
router.get("/:id/resume", validateObjectId("id"), applicationController.getApplicationResume);

module.exports = router;
