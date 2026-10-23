const express = require("express");
const portfolioController = require("../../../controllers/portfolio.controller");

const router = express.Router();

router.get("/:slug/public", portfolioController.getPublicPortfolio);

module.exports = router;
