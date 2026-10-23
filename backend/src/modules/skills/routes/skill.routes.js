const express = require("express");
const skillController = require("../../../controllers/skill.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, skillController.searchSkills);
router.post("/custom", authMiddleware, skillController.addCustomSkill);

module.exports = router;
