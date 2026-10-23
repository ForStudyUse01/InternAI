const express = require("express");
const internshipController = require("../../../controllers/internship.controller");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.get("/", internshipController.getAllInternships);
router.get("/:id", validateObjectId("id"), internshipController.getInternshipById);

module.exports = router;
