const express = require("express");
const aiController = require("../../../controllers/ai.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const allowRoles = require("../../../shared/middleware/role.middleware");
const aiRateLimitMiddleware = require("../../../shared/middleware/ai-rate-limit.middleware");

const router = express.Router();

router.use(authMiddleware, aiRateLimitMiddleware);

router.post("/parse-resume", aiController.parseResume);
router.post("/resume-score", aiController.computeResumeScore);
router.post("/skill-gap", aiController.computeSkillGap);
router.post("/roadmap", aiController.generateRoadmap);
router.post("/recommendations", aiController.recommend);
router.post("/match-candidates", allowRoles("company", "admin"), aiController.matchCandidates);

module.exports = router;
