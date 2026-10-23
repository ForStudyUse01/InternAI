const express = require("express");
const authController = require("../../../controllers/auth.controller");
const authMiddleware = require("../../../shared/middleware/auth.middleware");
const validate = require("../../../shared/middleware/validate.middleware");
const { authLimiter, otpSendLimiter, otpVerifyLimiter } = require("../middleware/otp-rate-limit.middleware");
const {
  requireEmail,
  requireInternSignup,
  requireCompanySignup,
  requireOtpVerify,
  requirePasswordReset
} = require("../../../validators/auth.validator");

const router = express.Router();

router.post("/intern/send-otp", otpSendLimiter, validate(requireEmail), authController.sendInternOtp);
router.post("/intern/verify-otp", otpVerifyLimiter, validate(requireOtpVerify), authController.verifyInternOtp);
router.post("/intern/signup", authLimiter, validate(requireInternSignup), authController.internSignup);
router.post("/password/send-otp", otpSendLimiter, validate(requireEmail), authController.sendPasswordResetOtp);
router.post("/password/reset", otpVerifyLimiter, validate(requirePasswordReset), authController.resetPasswordWithOtp);
router.post("/company/signup", authLimiter, validate(requireCompanySignup), authController.companySignup);

router.get("/demo-credentials/hr", authController.getHrDemoCredentials);

router.post("/intern/login", authLimiter, authController.internLogin);
router.post("/company/login", authLimiter, authController.companyLogin);
router.post("/admin/login", authLimiter, authController.adminLogin);
router.post("/refresh", authLimiter, authController.refreshSession);
router.post("/logout", authController.logout);

router.get("/me", authMiddleware, authController.getMe);
router.patch("/theme", authMiddleware, authController.updateThemePreference);

module.exports = router;
