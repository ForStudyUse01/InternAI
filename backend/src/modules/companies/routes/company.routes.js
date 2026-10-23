const express = require("express");
const companyController = require("../../../controllers/company.controller");
const notificationController = require("../../../controllers/notification.controller");
const reportController = require("../../../controllers/report.controller");
const companyHrController = require("../../../controllers/company-hr.controller");
const portfolioController = require("../../../controllers/portfolio.controller");
const hiringScoringController = require("../../../controllers/hiring-scoring.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const {
  requireCanPostInternship,
  requireCanUpdateCompanyProfile,
  requireCeoHrManagement,
  requireAssignRecruiters,
  requireSidebarModule,
  requireSidebarModuleForCompanyUsers,
  requireViewRecruiters
} = require("../../../shared/middleware/company-access.middleware");
const { SIDEBAR_MODULE_KEYS } = require("../../../constants/sidebar-modules");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");
const logoUpload = require("../../../shared/middleware/logo-upload.middleware");
const personalPhotoUpload = require("../../../shared/middleware/personal-photo-upload.middleware");
const uploadLimiter = require("../../../shared/middleware/upload-rate-limit.middleware");

const router = express.Router();

router.use(authMiddleware, allowRoles("company"));

router.get("/profile", companyController.getProfile);
router.put("/profile", requireCanUpdateCompanyProfile(), companyController.updateProfile);
router.post("/profile/logo", uploadLimiter, requireCanUpdateCompanyProfile(), logoUpload.single("logo"), companyController.uploadLogo);

router.get("/personal-profile", companyController.getPersonalProfile);
router.put("/personal-profile", companyController.updatePersonalProfile);
router.post("/personal-profile/photo", uploadLimiter, personalPhotoUpload.single("photo"), companyController.uploadPersonalPhoto);

router.post("/internships", requireCanPostInternship(), companyController.postInternship);
router.get("/internships", requireSidebarModule(SIDEBAR_MODULE_KEYS.INTERNSHIPS), companyController.getMyInternships);
router.patch(
  "/internships/:id",
  validateObjectId("id"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.INTERNSHIPS),
  companyController.updateMyInternship
);
router.delete(
  "/internships/:id",
  validateObjectId("id"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.INTERNSHIPS),
  companyController.deleteMyInternship
);
router.post(
  "/internships/:id/assign-recruiter",
  validateObjectId("id"),
  requireAssignRecruiters(),
  companyController.assignInternshipRecruiter
);

router.get(
  "/internships/:id/applicants",
  validateObjectId("id"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.APPLICATIONS),
  companyController.getApplicantsForInternship
);
router.get(
  "/internships/:id/matched-candidates",
  validateObjectId("id"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.AI_INSIGHTS),
  companyController.getAiMatchedCandidates
);
router.get(
  "/applications",
  requireSidebarModule(SIDEBAR_MODULE_KEYS.APPLICATIONS),
  companyController.getAllApplications
);
router.get(
  "/interns/:internProfileId/portfolio",
  validateObjectId("internProfileId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.APPLICATIONS),
  portfolioController.getInternPortfolioSummary
);

router.patch(
  "/applications/:applicationId/stage",
  validateObjectId("applicationId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.APPLICATIONS),
  companyController.updateCandidateStage
);
router.post(
  "/applications/:applicationId/assign-recruiter",
  validateObjectId("applicationId"),
  requireAssignRecruiters(),
  companyController.assignApplicationRecruiter
);
router.post(
  "/applications/:applicationId/feedback",
  validateObjectId("applicationId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.HIRING_REPORTS),
  companyController.addHrFeedback
);
router.post(
  "/applications/:applicationId/interviews",
  validateObjectId("applicationId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING),
  companyController.scheduleInterviewRound
);
router.patch(
  "/applications/:applicationId/interviews/:roundId",
  validateObjectId("applicationId", "roundId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.INTERVIEW_SCHEDULING),
  companyController.updateInterviewRound
);

router.get("/hr/insights", requireCeoHrManagement(), companyHrController.getHrInsights);
router.post("/hr/create", requireCeoHrManagement(), companyHrController.createHr);
router.delete("/hr/:id", validateObjectId("id"), requireCeoHrManagement(), companyHrController.deleteHr);
router.patch("/hr/:id/permissions", validateObjectId("id"), requireCeoHrManagement(), companyHrController.patchHrPermissions);

router.get("/recruiters", requireViewRecruiters(), companyController.getRecruiters);
router.post("/recruiters", requireCeoHrManagement(), companyHrController.createHr);
router.delete("/recruiters/:userId", validateObjectId("userId"), requireCeoHrManagement(), companyHrController.deleteHr);
router.get("/analytics", requireSidebarModule(SIDEBAR_MODULE_KEYS.ANALYTICS), companyController.getCompanyAnalytics);
router.get("/hiring-scoring/templates", hiringScoringController.listTemplates);

router.get("/notifications", notificationController.listNotifications);
router.patch("/notifications/read-all", notificationController.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", validateObjectId("notificationId"), notificationController.markNotificationRead);

router.get(
  "/reports/hiring",
  requireSidebarModule(SIDEBAR_MODULE_KEYS.HIRING_REPORTS),
  reportController.downloadCompanyHiringReport
);
router.get(
  "/reports/candidate-evaluation/:applicationId",
  validateObjectId("applicationId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.HIRING_REPORTS),
  reportController.downloadCompanyCandidateEvaluation
);
router.get(
  "/reports/interview/:applicationId",
  validateObjectId("applicationId"),
  requireSidebarModule(SIDEBAR_MODULE_KEYS.HIRING_REPORTS),
  reportController.downloadCompanyInterviewReport
);

module.exports = router;
