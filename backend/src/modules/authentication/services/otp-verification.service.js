const OtpVerification = require("../../../models/OtpVerification");
const User = require("../../../models/User");
const AppError = require("../../../shared/utils/AppError");
const { generateOtp, hashOtp } = require("../../../shared/utils/otp");
const { VALIDATION_RULES } = require("../../../constants/validation-rules");

const MAX_VERIFY_ATTEMPTS = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const SIGNUP_VERIFIED_WINDOW_MINUTES = Number(process.env.OTP_SIGNUP_VERIFIED_WINDOW_MINUTES || 30);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function otpExpiryDate() {
  return new Date(Date.now() + VALIDATION_RULES.OTP_EXPIRY_MINUTES * 60 * 1000);
}

function assertResendAllowed(record) {
  if (!record?.lastSentAt) return;
  const elapsedMs = Date.now() - new Date(record.lastSentAt).getTime();
  const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;
  if (elapsedMs < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new AppError(`Please wait ${retryAfterSeconds}s before requesting another OTP`, 429, {
      retryAfterSeconds
    });
  }
}

async function assertEmailAvailableForSignup(email) {
  const existing = await User.findOne({ email }).select("_id");
  if (existing) {
    throw new AppError("Email already registered. Please log in instead.", 409);
  }
}

async function issueOtp({ email, purpose, otp }) {
  return OtpVerification.findOneAndUpdate(
    { email, purpose },
    {
      email,
      purpose,
      otpHash: hashOtp(otp),
      verified: false,
      attemptCount: 0,
      expiresAt: otpExpiryDate(),
      lastSentAt: new Date(),
      lastVerifiedAt: null
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function isSignupVerificationActive(record) {
  if (!record?.verified || !record.lastVerifiedAt) return false;
  if (record.expiresAt < new Date()) return false;
  const verifiedWindowMs = SIGNUP_VERIFIED_WINDOW_MINUTES * 60 * 1000;
  return Date.now() - new Date(record.lastVerifiedAt).getTime() <= verifiedWindowMs;
}

async function sendOtpForPurpose({ email, purpose, checkRegistered = false }) {
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail)) {
    throw new AppError("Valid email is required", 400);
  }

  if (checkRegistered) {
    await assertEmailAvailableForSignup(normalizedEmail);
  }

  const existing = await OtpVerification.findOne({ email: normalizedEmail, purpose });
  if (existing?.verified && purpose === "intern_signup" && isSignupVerificationActive(existing)) {
    throw new AppError("Email is already verified. Continue with signup or use a different email.", 400);
  }

  assertResendAllowed(existing);

  const otp = generateOtp();
  await issueOtp({ email: normalizedEmail, purpose, otp });

  return { email: normalizedEmail, otp, retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

async function verifyOtpForPurpose({ email, otp, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail) || !String(otp || "").trim()) {
    throw new AppError("Email and OTP are required", 400);
  }

  const record = await OtpVerification.findOne({ email: normalizedEmail, purpose });
  if (!record) {
    throw new AppError("OTP expired or not found. Request a new OTP.", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("OTP has expired. Request a new OTP.", 400);
  }

  if (record.verified && purpose === "intern_signup") {
    return { alreadyVerified: true, record };
  }

  if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError("Too many failed attempts. Request a new OTP.", 429);
  }

  const otpString = String(otp).trim();
  if (record.otpHash !== hashOtp(otpString)) {
    record.attemptCount += 1;
    await record.save();
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - record.attemptCount);
    throw new AppError(
      remaining > 0 ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : "Invalid OTP. Request a new OTP.",
      400,
      { attemptsRemaining: remaining }
    );
  }

  record.verified = true;
  record.attemptCount = 0;
  record.lastVerifiedAt = new Date();
  // Once verified for signup, the record is a verification *proof*, not a live
  // OTP. Extend its lifetime to the declared post-verification window so the TTL
  // index and the expiry checks in assertVerifiedOtpForSignup/isSignupVerificationActive
  // don't delete it after OTP_EXPIRY_MINUTES and force a needless re-verify —
  // which made SIGNUP_VERIFIED_WINDOW_MINUTES unreachable.
  if (purpose === "intern_signup") {
    const verifiedWindowEnd = new Date(Date.now() + SIGNUP_VERIFIED_WINDOW_MINUTES * 60 * 1000);
    if (record.expiresAt < verifiedWindowEnd) {
      record.expiresAt = verifiedWindowEnd;
    }
  }
  await record.save();

  return { alreadyVerified: false, record };
}

async function assertVerifiedOtpForSignup(email, purpose = "intern_signup") {
  const normalizedEmail = normalizeEmail(email);
  const record = await OtpVerification.findOne({ email: normalizedEmail, purpose });

  if (!record || !record.verified) {
    throw new AppError("Please verify OTP before signup", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("OTP verification expired. Please verify your email again.", 400);
  }

  if (record.lastVerifiedAt) {
    const verifiedWindowMs = SIGNUP_VERIFIED_WINDOW_MINUTES * 60 * 1000;
    if (Date.now() - new Date(record.lastVerifiedAt).getTime() > verifiedWindowMs) {
      throw new AppError("OTP verification expired. Please verify your email again.", 400);
    }
  }

  return record;
}

async function consumeOtpAfterSignup(email, purpose = "intern_signup") {
  await OtpVerification.deleteOne({ email: normalizeEmail(email), purpose });
}

module.exports = {
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  normalizeEmail,
  validateEmail,
  sendOtpForPurpose,
  verifyOtpForPurpose,
  assertVerifiedOtpForSignup,
  consumeOtpAfterSignup,
  assertEmailAvailableForSignup
};
