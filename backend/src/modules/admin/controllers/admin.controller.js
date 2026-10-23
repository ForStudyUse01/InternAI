const User = require("../../../models/User");
const Internship = require("../../../models/Internship");
const CompanyProfile = require("../../../models/CompanyProfile");
const InternProfile = require("../../../models/InternProfile");
const ReportedCompany = require("../../../models/ReportedCompany");
const ActivityLog = require("../../../models/ActivityLog");
const Application = require("../../../models/Application");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess, sendPaginated } = require("../../../shared/utils/api-response");
const { resolvePagination } = require("../../../shared/utils/pagination");
const { COMPANY_VERIFICATION_STATUS, REPORTED_COMPANY_STATUS, ADMIN_ROLES, USER_ROLES } = require("../../../constants/enums");
const { logActivity } = require("../../../services/activity-log.service");
const { ROLE_PERMISSIONS } = require("../../../constants/roles");

function softDeleteFilter(query) {
  return { ...query, isDeleted: false };
}

// Search terms are user input, not regex source: an unescaped "(" makes
// MongoDB reject the whole query as an invalid regex (500 instead of an
// empty result set). Same convention as candidate.controller.js.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildUserFilter({ q = "", role = "", isActive }) {
  const filter = { isDeleted: false };
  const normalizedQuery = String(q || "").trim();
  if (normalizedQuery) {
    filter.email = { $regex: escapeRegex(normalizedQuery), $options: "i" };
  }
  if (role && Object.values(USER_ROLES).includes(role)) {
    filter.role = role;
  }
  if (isActive === "true" || isActive === "false") {
    filter.isActive = isActive === "true";
  }
  return filter;
}

function buildReportFilter({ status = "", type = "", q = "" }) {
  const filter = softDeleteFilter({});
  if (status && Object.values(REPORTED_COMPANY_STATUS).includes(status)) {
    filter.status = status;
  }
  if (type) {
    filter.reportType = type;
  }
  const normalizedQuery = String(q || "").trim();
  if (normalizedQuery) {
    filter.$or = [
      { reason: { $regex: escapeRegex(normalizedQuery), $options: "i" } },
      { details: { $regex: escapeRegex(normalizedQuery), $options: "i" } }
    ];
  }
  return filter;
}

exports.getDashboardMetrics = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalCompanies,
    activeInternships,
    totalHires,
    reportsOverview,
    pendingCompanyApprovals,
    activeInterviews
  ] = await Promise.all([
    User.countDocuments(softDeleteFilter({ role: USER_ROLES.INTERN })),
    CompanyProfile.countDocuments(softDeleteFilter({})),
    Internship.countDocuments(softDeleteFilter({ isActive: true })),
    Application.countDocuments({ status: { $in: ["selected", "offered"] } }),
    ReportedCompany.countDocuments(softDeleteFilter({ status: { $in: [REPORTED_COMPANY_STATUS.OPEN, REPORTED_COMPANY_STATUS.IN_REVIEW, REPORTED_COMPANY_STATUS.ESCALATED] } })),
    CompanyProfile.countDocuments(softDeleteFilter({ verificationStatus: COMPANY_VERIFICATION_STATUS.PENDING })),
    Application.countDocuments({ status: { $in: ["interview_scheduled", "technical_round", "hr_round"] } })
  ]);

  return sendSuccess(res, {
    data: {
      metrics: {
        totalStudents,
        totalCompanies,
        activeInternships,
        totalHires,
        reportsOverview,
        pendingCompanyApprovals,
        activeInterviews
      }
    }
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = buildUserFilter(req.query || {});
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("email role adminRole permissions isActive createdAt lastLoginAt lastLoginIp")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);
  return sendPaginated(res, { items: users, itemsKey: "users", page, limit, total });
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, isDeleted: false })
    .select(
      "email role adminRole permissions isActive createdAt updatedAt lastLoginAt lastLoginIp displayName phone photoUrl designation linkedInUrl personalWebsite bio companyAccountType companyProfileRef"
    )
    .populate("companyProfileRef", "companyName companyEmail industry website address description verificationStatus")
    .lean();
  if (!user) {
    throw new AppError("User not found", 404);
  }

  let internProfile = null;
  if (user.role === USER_ROLES.INTERN) {
    internProfile = await InternProfile.findOne({ user: user._id })
      .select("fullName mobile address bio educationDetails skills linkedinUrl githubUrl portfolioUrl")
      .lean();
  }

  return sendSuccess(res, { data: { user, internProfile } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, isDeleted: false });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { isActive, role, adminRole } = req.body || {};
  if (typeof isActive === "boolean") {
    user.isActive = isActive;
  }

  if (role !== undefined) {
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new AppError("Invalid role", 400);
    }
    // adminRole must be granted atomically with role=admin. Leaving it unset
    // used to leave a half-provisioned admin account that other code paths
    // would fail open on; now it's rejected outright.
    if (role === USER_ROLES.ADMIN && adminRole === undefined && !user.adminRole) {
      throw new AppError("adminRole is required when granting the admin role", 400);
    }
    user.role = role;
  }

  if (user.role === USER_ROLES.ADMIN && adminRole !== undefined) {
    if (!Object.values(ADMIN_ROLES).includes(adminRole)) {
      throw new AppError("Invalid admin role", 400);
    }
    user.adminRole = adminRole;
    user.permissions = [...new Set(ROLE_PERMISSIONS[adminRole] || [])];
  }

  await user.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "user",
    entityId: user._id,
    action: "admin_user_updated",
    metadata: { isActive, role, adminRole },
    ipAddress: req.ip
  });

  return sendSuccess(res, { message: "User updated", data: { user } });
});

exports.softDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, isDeleted: false });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = req.user._id;
  user.isActive = false;
  await user.save();

  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "user",
    entityId: user._id,
    action: "admin_user_soft_deleted",
    metadata: null,
    ipAddress: req.ip
  });
  return sendSuccess(res, { message: "User soft deleted" });
});

exports.getAllInternships = asyncHandler(async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
  const internships = await Internship.find({ isDeleted: false })
    .populate("company", "companyName companyEmail verificationStatus")
    .select("role location stipend duration isActive createdAt company")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return sendSuccess(res, { data: { internships } });
});

exports.moderateInternship = asyncHandler(async (req, res) => {
  const { isActive, removePost = false } = req.body || {};
  const internship = await Internship.findById(req.params.internshipId);
  if (!internship) {
    throw new AppError("Internship not found", 404);
  }

  if (removePost === true) {
    internship.isDeleted = true;
    internship.isActive = false;
    internship.deletedAt = new Date();
    internship.deletedBy = req.user._id;
  } else if (typeof isActive === "boolean") {
    internship.isActive = isActive;
  }

  await internship.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "internship",
    entityId: internship._id,
    action: removePost ? "internship_removed" : "internship_moderated",
    metadata: { isActive: internship.isActive, isDeleted: internship.isDeleted },
    ipAddress: req.ip
  });

  return sendSuccess(res, { message: removePost ? "Internship removed" : "Internship updated", data: { internship } });
});

exports.getCompanies = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const q = String(req.query.q || "").trim();
  const filter = {};
  if (status && Object.values(COMPANY_VERIFICATION_STATUS).includes(status)) {
    filter.verificationStatus = status;
  }
  if (q) {
    filter.$or = [
      { companyName: { $regex: escapeRegex(q), $options: "i" } },
      { companyEmail: { $regex: escapeRegex(q), $options: "i" } },
      { contactName: { $regex: escapeRegex(q), $options: "i" } }
    ];
  }

  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
  const companies = await CompanyProfile.find({ ...filter, isDeleted: false })
    .populate("verifiedByAdmin", "email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return sendSuccess(res, { data: { companies } });
});

exports.updateCompanyVerification = asyncHandler(async (req, res) => {
  const { status, rejectionReason, verificationNotes = "", verifiedBadge = false } = req.body;

  if (!Object.values(COMPANY_VERIFICATION_STATUS).includes(status)) {
    throw new AppError("Invalid verification status", 400);
  }

  const company = await CompanyProfile.findById(req.params.companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  company.verificationStatus = status;
  company.rejectionReason = status === COMPANY_VERIFICATION_STATUS.REJECTED ? (rejectionReason || "") : "";
  if (status === COMPANY_VERIFICATION_STATUS.VERIFIED && verifiedBadge) {
    company.verifiedBadgeIssuedAt = new Date();
    company.verifiedByAdmin = req.user._id;
  } else if (status !== COMPANY_VERIFICATION_STATUS.VERIFIED) {
    // Moving away from verified (including a revoke-to-pending "unverify")
    // must clear the badge stamp - otherwise a company that lost its
    // verified badge keeps showing a stale verifiedByAdmin/issuedAt pair.
    company.verifiedBadgeIssuedAt = null;
    company.verifiedByAdmin = null;
  }
  if (status === COMPANY_VERIFICATION_STATUS.SUSPENDED) {
    company.rejectionReason = rejectionReason || "Suspended by administrator";
  }
  await company.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "company_profile",
    entityId: company._id,
    action: "verification_status_updated",
    metadata: { status, verificationNotes, verifiedBadge },
    ipAddress: req.ip
  });

  return sendSuccess(res, { message: "Company verification updated", data: { company } });
});

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

exports.reportCompany = asyncHandler(async (req, res) => {
  const { companyId, reason, details = "", reportType = "other", evidenceUrls = [], internshipId = null, hrUserId = null } = req.body;
  if (!companyId || !reason) {
    throw new AppError("companyId and reason are required", 400);
  }
  if (!OBJECT_ID_PATTERN.test(companyId)) {
    throw new AppError("Invalid company ID", 400);
  }
  if (internshipId && !OBJECT_ID_PATTERN.test(internshipId)) {
    throw new AppError("Invalid internship ID", 400);
  }
  if (hrUserId && !OBJECT_ID_PATTERN.test(hrUserId)) {
    throw new AppError("Invalid HR user ID", 400);
  }

  const company = await CompanyProfile.exists({ _id: companyId });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const report = await ReportedCompany.create({
    company: companyId,
    reason,
    details,
    reportType,
    evidenceUrls,
    internship: internshipId,
    hrUser: hrUserId,
    reportedBy: req.user?._id
  });

  return sendSuccess(res, { statusCode: 201, message: "Company reported", data: { report } });
});

exports.getReportedCompanies = asyncHandler(async (req, res) => {
  const filter = buildReportFilter(req.query || {});
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
  const reports = await ReportedCompany.find(filter)
    .populate("company reportedBy hrUser reviewedBy", "companyName companyEmail email role")
    .populate("internship", "role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return sendSuccess(res, { data: { reports } });
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const { resolutionNote, status = REPORTED_COMPANY_STATUS.RESOLVED } = req.body || {};

  const report = await ReportedCompany.findById(req.params.reportId);
  if (!report) {
    throw new AppError("Report not found", 404);
  }

  if (!Object.values(REPORTED_COMPANY_STATUS).includes(status)) {
    throw new AppError("Invalid report status", 400);
  }
  report.status = status;
  report.resolutionNote = resolutionNote || "Resolved by admin";
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  await report.save();
  await logActivity({
    actorUser: req.user._id,
    actorRole: req.user.role,
    entityType: "company_report",
    entityId: report._id,
    action: "report_status_updated",
    metadata: { status },
    ipAddress: req.ip
  });

  return sendSuccess(res, { message: "Report updated", data: { report } });
});

exports.getActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = resolvePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const query = {};
  if (req.query.entityType) query.entityType = req.query.entityType;
  if (req.query.action) query.action = req.query.action;
  if (req.query.actorRole) query.actorRole = req.query.actorRole;
  if (req.query.actorUserId) query.actorUser = req.query.actorUserId;
  if (req.query.q) {
    query.$or = [
      { action: { $regex: escapeRegex(req.query.q), $options: "i" } },
      { entityType: { $regex: escapeRegex(req.query.q), $options: "i" } },
      { ipAddress: { $regex: escapeRegex(req.query.q), $options: "i" } }
    ];
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("actorUser", "email").lean(),
    ActivityLog.countDocuments(query)
  ]);
  return sendPaginated(res, { items: logs, itemsKey: "logs", page, limit, total });
});
