const rateLimit = require("express-rate-limit");

// Login/signup/refresh have no per-account lockout, so this IP-scoped limiter
// is the only thing standing between an attacker and unlimited credential
// stuffing / signup spam against those endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." }
});

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_SEND_RATE_LIMIT || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Please try again later." }
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_VERIFY_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification attempts. Please try again later." }
});

module.exports = { authLimiter, otpSendLimiter, otpVerifyLimiter };
