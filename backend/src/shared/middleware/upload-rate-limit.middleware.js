const rateLimit = require("express-rate-limit");

// File uploads are disk/CPU-heavier than a typical JSON request, so even
// authenticated accounts get a tighter per-IP cap than the global /api limiter.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads. Please try again later." }
});

module.exports = uploadLimiter;
