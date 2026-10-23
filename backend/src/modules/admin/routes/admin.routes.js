const express = require("express");
const adminController = require("../../../controllers/admin.controller");
const hiringScoringController = require("../../../controllers/hiring-scoring.controller");
const certificationController = require("../../../controllers/certification.controller");
const reportController = require("../../../controllers/report.controller");
const portfolioController = require("../../../controllers/portfolio.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const allowPermissions = require("../../../shared/middleware/permission.middleware");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.use(authMiddleware, allowRoles("admin"));

router.get("/metrics", adminController.getDashboardMetrics);
router.get("/users", allowPermissions("admin:user:view"), adminController.getAllUsers);
router.get("/users/:userId", validateObjectId("userId"), allowPermissions("admin:user:view"), adminController.getUserById);
router.patch("/users/:userId", validateObjectId("userId"), allowPermissions("admin:user:update"), adminController.updateUser);
router.delete("/users/:userId", validateObjectId("userId"), allowPermissions("admin:user:soft-delete"), adminController.softDeleteUser);

router.get("/internships", adminController.getAllInternships);
router.patch(
  "/internships/:internshipId/moderation",
  validateObjectId("internshipId"),
  allowPermissions("admin:report:review"),
  adminController.moderateInternship
);
router.get("/companies", allowPermissions("admin:company:verify"), adminController.getCompanies);
router.patch(
  "/companies/:companyId/verification",
  validateObjectId("companyId"),
  allowPermissions("admin:company:verify"),
  adminController.updateCompanyVerification
);

router.post("/reports", adminController.reportCompany);
router.get("/reports", allowPermissions("admin:report:review"), adminController.getReportedCompanies);
router.patch("/reports/:reportId/resolve", validateObjectId("reportId"), allowPermissions("admin:report:review"), adminController.resolveReport);
router.get("/activity-logs", allowPermissions("admin:activity:view"), adminController.getActivityLogs);

router.get("/certifications", allowPermissions("admin:certification:review"), certificationController.listCertificationsAdmin);
router.patch(
  "/certifications/:certificationId/review",
  validateObjectId("certificationId"),
  allowPermissions("admin:certification:review"),
  certificationController.reviewCertificationAdmin
);
router.get(
  "/certifications/:certificationId/file",
  validateObjectId("certificationId"),
  allowPermissions("admin:certification:review"),
  certificationController.downloadCertificateAdmin
);

router.get("/reports/platform-statistics", reportController.downloadAdminPlatformStatistics);
router.get(
  "/reports/verification/:companyId",
  validateObjectId("companyId"),
  allowPermissions("admin:company:verify"),
  reportController.downloadAdminVerificationReport
);

router.get("/hiring-scoring/templates", allowPermissions("admin:manage"), hiringScoringController.listTemplates);
router.post("/hiring-scoring/templates", allowPermissions("admin:manage"), hiringScoringController.saveTemplate);
router.put("/hiring-scoring/templates", allowPermissions("admin:manage"), hiringScoringController.saveTemplate);
router.post("/hiring-scoring/preview", allowPermissions("admin:manage"), hiringScoringController.previewTemplate);

router.get("/portfolios", allowPermissions("admin:manage"), portfolioController.listPortfoliosAdmin);
router.patch(
  "/portfolios/:portfolioId/moderate",
  validateObjectId("portfolioId"),
  allowPermissions("admin:manage"),
  portfolioController.moderatePortfolioAdmin
);

module.exports = router;
