// Router exposing GET /health/cache. Mounted in app.js.

const express = require("express");
const { sendSuccess } = require("../../utils/api-response");
const { getCacheHealth } = require("./cache.health");

const router = express.Router();

router.get("/", async (req, res) => {
  res.set("Cache-Control", "no-cache");
  const health = await getCacheHealth();
  return sendSuccess(res, {
    message: health.connected ? "Redis cache healthy" : "Redis cache unavailable (using MongoDB)",
    data: health
  });
});

module.exports = router;
