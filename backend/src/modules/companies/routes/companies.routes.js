const express = require("express");
const companyPublicController = require("../../../controllers/company-public.controller");
const validateObjectId = require("../../../shared/middleware/validate-object-id.middleware");

const router = express.Router();

router.get("/:companyId/public", validateObjectId("companyId"), companyPublicController.getPublicCompanyProfile);

module.exports = router;
