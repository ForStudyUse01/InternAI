const express = require("express");
const candidateController = require("../../../controllers/candidate.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const { requireSidebarModuleForCompanyUsers } = require("../../../shared/middleware/company-access.middleware");
const { SIDEBAR_MODULE_KEYS } = require("../../../constants/sidebar-modules");

const router = express.Router();

router.use(authMiddleware, allowRoles("company", "admin"));

router.get(
  "/search",
  requireSidebarModuleForCompanyUsers(SIDEBAR_MODULE_KEYS.CANDIDATE_SEARCH),
  candidateController.searchCandidates
);

module.exports = router;
