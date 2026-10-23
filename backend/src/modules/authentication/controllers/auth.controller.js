const User = require("../../../models/User");
const InternProfile = require("../../../models/InternProfile");
const CompanyProfile = require("../../../models/CompanyProfile");
const crypto = require("crypto");
const { USER_ROLES, COMPANY_VERIFICATION_STATUS, ADMIN_ROLES } = require("../../../constants/enums");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess } = require("../../../shared/utils/api-response");
const { hashPassword, comparePassword } = require("../../../shared/utils/password");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require("../../../shared/utils/jwt");
const { sendOtpEmail } = require("../../../services/otp.service");
const otpVerification = require("../services/otp-verification.service");
const { VALIDATION_RULES } = require("../../../constants/validation-rules");
const { logActivity } = require("../../../services/activity-log.service");

const ACCESS_COOKIE_KEY = "accessToken";
const REFRESH_COOKIE_KEY = "refreshToken";

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function parseDurationToMs(durationValue, fallbackMs) {
  const value = String(durationValue || "").trim();
  if (!value) return fallbackMs;
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = String(match[2]).toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * map[unit];
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "none" : "lax";
  const accessMaxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN, 15 * 60 * 1000);
  const refreshMaxAge = parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

  res.cookie(ACCESS_COOKIE_KEY, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: accessMaxAge
  });

  res.cookie(REFRESH_COOKIE_KEY, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: refreshMaxAge
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE_KEY);
  res.clearCookie(REFRESH_COOKIE_KEY);
}

async function issueSession({ user, req, res }) {
  const payload = { userId: user._id, role: user.role, adminRole: user.adminRole || null };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000));
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip || "";
  await user.save();

  setAuthCookies(res, { accessToken, refreshToken });
  await logActivity({
    actorUser: user._id,
    actorRole: user.role,
    entityType: "auth",
    entityId: user._id,
    action: "user_login",
    metadata: { role: user.role, adminRole: user.adminRole || null },
    ipAddress: req.ip
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    role: user.role,
    adminRole: user.adminRole || null,
    permissions: user.permissions || []
  };
}

function validateEmail(email) {
  return otpVerification.validateEmail(email);
}

function buildOtpSendResponse(res, { message }) {
  return sendSuccess(res, {
    message,
    data: { retryAfterSeconds: otpVerification.RESEND_COOLDOWN_SECONDS }
  });
}

exports.sendInternOtp = asyncHandler(async (req, res) => {
  const result = await otpVerification.sendOtpForPurpose({
    email: req.body.email,
    purpose: "intern_signup",
    checkRegistered: true
  });
  await sendOtpEmail({ to: result.email, otp: result.otp });
  buildOtpSendResponse(res, { message: "OTP sent successfully" });
});

exports.verifyInternOtp = asyncHandler(async (req, res) => {
  const { record, alreadyVerified } = await otpVerification.verifyOtpForPurpose({
    email: req.body.email,
    otp: req.body.otp,
    purpose: "intern_signup"
  });
  sendSuccess(res, {
    message: alreadyVerified ? "Email already verified" : "OTP verified successfully",
    data: { verified: true, expiresAt: record.expiresAt }
  });
});

exports.internSignup = asyncHandler(async (req, res) => {
  const { fullName, email, mobile, password } = req.body;

  if (!fullName || !validateEmail(email) || !mobile || !password) {
    throw new AppError("fullName, email, mobile and password are required", 400);
  }

  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const normalizedEmail = otpVerification.normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  await otpVerification.assertVerifiedOtpForSignup(normalizedEmail, "intern_signup");

  const user = await User.create({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: USER_ROLES.INTERN,
    emailVerified: true
  });

  await InternProfile.create({
    user: user._id,
    fullName,
    email: normalizedEmail,
    mobile,
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    interests: [],
    completedCourses: []
  });

  await otpVerification.consumeOtpAfterSignup(normalizedEmail, "intern_signup");

  const session = await issueSession({ user, req, res });
  sendSuccess(res, { statusCode: 201, message: "Intern signup successful", data: session });
});

exports.companySignup = asyncHandler(async (req, res) => {
  const {
    companyName,
    companyEmail,
    gst,
    contactName,
    phone,
    website,
    address,
    description,
    password
  } = req.body;

  if (!companyName || !validateEmail(companyEmail) || !gst || !contactName || !phone || !address || !description || !password) {
    throw new AppError("All required company fields must be provided", 400);
  }

  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const normalizedEmail = companyEmail.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("Company email already registered", 409);
  }

  const user = await User.create({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: USER_ROLES.COMPANY,
    emailVerified: true
  });

  await CompanyProfile.create({
    user: user._id,
    companyName,
    companyEmail: normalizedEmail,
    gst,
    contactName,
    phone,
    website,
    address,
    description,
    verificationStatus: COMPANY_VERIFICATION_STATUS.PENDING
  });

  const session = await issueSession({ user, req, res });

  sendSuccess(res, {
    statusCode: 201,
    message: "Company signup successful.",
    data: { ...session, verificationStatus: COMPANY_VERIFICATION_STATUS.PENDING }
  });
});

async function loginByRole({ email, password, expectedRole }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail, role: expectedRole });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const valid = await comparePassword(password || "", user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isActive || user.isDeleted) {
    throw new AppError("Account is disabled. Contact support.", 403);
  }

  return { user };
}

exports.getHrDemoCredentials = asyncHandler(async (req, res) => {
  const seedData = require("../../../shared/data/seedData");
  const hrSeed = seedData.users.find((u) => u.email === "hr@novatech.example");
  if (!hrSeed) {
    throw new AppError("HR demo account is not configured", 404);
  }
  sendSuccess(res, { data: { email: hrSeed.email, password: hrSeed.password } });
});

exports.internLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user } = await loginByRole({ email, password, expectedRole: USER_ROLES.INTERN });
  const session = await issueSession({ user, req, res });
  sendSuccess(res, { message: "Intern login successful", data: session });
});

exports.companyLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user } = await loginByRole({ email, password, expectedRole: USER_ROLES.COMPANY });

  let profile = null;
  if (user.companyProfileRef) {
    profile = await CompanyProfile.findById(user.companyProfileRef);
  }
  if (!profile) {
    profile = await CompanyProfile.findOne({ user: user._id });
  }
  const session = await issueSession({ user, req, res });

  sendSuccess(res, {
    message: "Company login successful",
    data: {
      ...session,
      companyAccountType: user.companyAccountType || "owner",
      verificationStatus: profile?.verificationStatus || COMPANY_VERIFICATION_STATUS.PENDING
    }
  });
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const { user } = await loginByRole({ email, password, expectedRole: USER_ROLES.ADMIN });

  // Fail closed: an admin account without a valid adminRole is not fully
  // provisioned. Never auto-promote it to SUPER_ADMIN on login.
  if (!user.adminRole || !Object.values(ADMIN_ROLES).includes(user.adminRole)) {
    throw new AppError("Admin account is not fully provisioned. Contact a super admin.", 403);
  }

  const session = await issueSession({ user, req, res });
  sendSuccess(res, { message: "Admin login successful", data: session });
});

exports.getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: req.user } });
});

const VALID_THEME_IDS = ["ocean", "olive", "crimson", "golden", "sunset", "royal", "rose", "modern", "midnight", "earth"];
const VALID_APPEARANCE_MODES = ["light", "dark"];

exports.updateThemePreference = asyncHandler(async (req, res) => {
  const { theme, appearance } = req.body || {};

  if (theme !== undefined && theme !== null && !VALID_THEME_IDS.includes(theme)) {
    throw new AppError("Invalid theme id", 400);
  }
  if (appearance !== undefined && appearance !== null && !VALID_APPEARANCE_MODES.includes(appearance)) {
    throw new AppError("Invalid appearance mode", 400);
  }

  const update = {};
  if (theme !== undefined) update.themePreference = theme;
  if (appearance !== undefined) update.appearanceMode = appearance;

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select(
    "themePreference appearanceMode"
  );

  sendSuccess(res, {
    message: "Theme preference updated",
    data: { themePreference: user.themePreference, appearanceMode: user.appearanceMode }
  });
});

exports.refreshSession = asyncHandler(async (req, res) => {
  // Body-only, deliberately -- see the comment in auth.middleware.js. Accepting
  // the refreshToken cookie here would let a forged cross-site request mint a
  // fresh session for the victim using nothing but an ambient cookie. The SPA
  // client already sends the refresh token explicitly in the request body.
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken) {
    throw new AppError("Refresh token missing", 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.userId);
  if (!user || !user.isActive || user.isDeleted) {
    throw new AppError("Invalid refresh session", 401);
  }

  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError("Refresh token is not valid", 401);
  }

  if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
    throw new AppError("Refresh token expired", 401);
  }

  const session = await issueSession({ user, req, res });
  const responseData =
    user.role === USER_ROLES.COMPANY
      ? { ...session, companyAccountType: user.companyAccountType || "owner" }
      : session;
  sendSuccess(res, { message: "Session refreshed", data: responseData });
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId);
      if (user) {
        user.refreshTokenHash = "";
        user.refreshTokenExpiresAt = null;
        await user.save();
      }
    } catch {
      // Best-effort logout.
    }
  }

  clearAuthCookies(res);
  sendSuccess(res, { message: "Logged out successfully" });
});

exports.sendPasswordResetOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = otpVerification.normalizeEmail(req.body?.email);
  if (!validateEmail(normalizedEmail)) throw new AppError("Valid email is required", 400);

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return sendSuccess(res, {
      message: "If an account exists for this email, an OTP has been sent.",
      data: { retryAfterSeconds: otpVerification.RESEND_COOLDOWN_SECONDS }
    });
  }

  const result = await otpVerification.sendOtpForPurpose({
    email: normalizedEmail,
    purpose: "password_reset",
    checkRegistered: false
  });
  await sendOtpEmail({ to: result.email, otp: result.otp });
  buildOtpSendResponse(res, { message: "Password reset OTP sent" });
});

exports.resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = otpVerification.normalizeEmail(req.body?.email);
  await otpVerification.verifyOtpForPurpose({
    email: normalizedEmail,
    otp: req.body.otp,
    purpose: "password_reset"
  });
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new AppError("User not found", 404);
  user.passwordHash = await hashPassword(req.body.newPassword);
  user.refreshTokenHash = "";
  user.refreshTokenExpiresAt = null;
  await user.save();
  await otpVerification.consumeOtpAfterSignup(normalizedEmail, "password_reset");
  sendSuccess(res, { message: "Password reset successful" });
});
