const express = require("express");
const internController = require("../../../controllers/intern.controller");
const notificationController = require("../../../controllers/notification.controller");
const reportController = require("../../../controllers/report.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const upload = require("../../../shared/middleware/upload.middleware");
const certificateUpload = require("../../../shared/middleware/certificate-upload.middleware");
const uploadLimiter = require("../../../shared/middleware/upload-rate-limit.middleware");
const certificationController = require("../../../controllers/certification.controller");
const portfolioController = require("../../../controllers/portfolio.controller");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.use(authMiddleware, allowRoles("intern"));

router.get("/profile", internController.getProfile);
router.put("/profile", internController.updateProfile);
router.post("/resume/upload", uploadLimiter, upload.single("resume"), internController.uploadResume);
router.get("/resume/score", internController.getResumeScore);
router.post("/skill-gap", internController.getSkillGap);
router.get("/internships/:internshipId/ai-insights", validateObjectId("internshipId"), internController.getApplicationAiInsights);
router.post("/roadmap", internController.getCareerRoadmap);
router.get("/internships", internController.getActiveInternships);
router.get("/recommendations", internController.getRecommendations);
router.post("/apply/:internshipId", validateObjectId("internshipId"), internController.applyToInternship);
router.get("/applications", internController.getMyApplications);
router.get("/interviews", internController.getMyInterviews);
router.post("/interviews/reminders/check", internController.checkInterviewReminders);
router.post(
  "/interviews/:applicationId/rounds/:roundId/request-reschedule",
  validateObjectId("applicationId", "roundId"),
  internController.requestInterviewReschedule
);
router.get("/saved-internships", internController.getSavedInternships);
router.post("/saved-internships/:internshipId", validateObjectId("internshipId"), internController.saveInternship);
router.delete("/saved-internships/:internshipId", validateObjectId("internshipId"), internController.unsaveInternship);
router.get("/feedback", internController.getMyFeedback);
router.get("/notifications", notificationController.listNotifications);
router.patch("/notifications/read-all", notificationController.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", validateObjectId("notificationId"), notificationController.markNotificationRead);
router.patch("/applications/:applicationId/withdraw", validateObjectId("applicationId"), internController.withdrawApplication);
router.post("/report-company", internController.reportCompany);

router.get("/certifications", certificationController.listMyCertifications);
router.post(
  "/certifications",
  uploadLimiter,
  certificateUpload.single("certificateFile"),
  certificationController.submitCertification
);
router.get("/certifications/:certificationId/file", validateObjectId("certificationId"), certificationController.downloadMyCertificate);
router.get("/certifications/:certificationId", validateObjectId("certificationId"), certificationController.getMyCertification);

router.get("/reports/resume-analysis", reportController.downloadInternResumeAnalysis);
router.get("/reports/skill-gap", reportController.downloadInternSkillGap);
router.get("/reports/application-history", reportController.downloadInternApplicationHistory);

router.get("/portfolio", portfolioController.getMyPortfolio);
router.get("/portfolio/themes", portfolioController.getPortfolioThemes);
router.post("/portfolio/generate", portfolioController.generateMyPortfolio);
router.patch("/portfolio/settings", portfolioController.updateMyPortfolioSettings);

module.exports = router;
