const User = require("../../../models/User");
const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const AppError = require("../../../shared/utils/AppError");
const { hashPassword } = require("../../../shared/utils/password");
const { VALIDATION_RULES } = require("../../../shared/constants/validation-rules");
const { APPLICATION_STATUS, COMPANY_ACCOUNT_TYPES } = require("../../../constants/enums");
const {
  HR_ASSIGNABLE_PERMISSIONS,
  HR_DEFAULT_PERMISSIONS,
  normalizeHrPermissions
} = require("../../../constants/hr-permissions");
const {
  HR_DEFAULT_SIDEBAR_MODULES,
  normalizeSidebarModules
} = require("../../../constants/sidebar-modules");
const { buildRecruiterPerformance } = require("../../../services/company-analytics.service");

function assertCompanyHrUser(user, companyId) {
  if (
    !user ||
    user.role !== "company" ||
    user.companyAccountType !== COMPANY_ACCOUNT_TYPES.HR ||
    String(user.companyProfileRef) !== String(companyId) ||
    user.isDeleted
  ) {
    throw new AppError("HR user not found in this company", 404);
  }
}

async function listCompanyHrUsers(companyId) {
  return User.find({
    role: "company",
    companyProfileRef: companyId,
    companyAccountType: COMPANY_ACCOUNT_TYPES.HR,
    isDeleted: false
  })
    .select("_id email displayName companyAccountType isActive permissions hrCustomPermissions sidebarModules createdAt updatedAt lastLoginAt")
    .lean();
}

async function buildHrInsights(companyId) {
  const hrUsers = await listCompanyHrUsers(companyId);
  const hrIds = hrUsers.map((u) => u._id);

  const [internships, applications] = await Promise.all([
    Internship.find({ company: companyId, isDeleted: false, assignedRecruiter: { $in: hrIds } })
      .select("_id assignedRecruiter role")
      .lean(),
    Application.find({ companyId, assignedRecruiter: { $in: hrIds } })
      .select("status assignedRecruiter createdAt updatedAt")
      .lean()
  ]);

  const performanceRows = buildRecruiterPerformance(applications);
  const performanceByRecruiter = new Map(performanceRows.map((row) => [row.recruiterId, row]));

  const hrUsersPayload = hrUsers.map((hr) => {
    const id = String(hr._id);
    const assignedInternships = internships.filter((i) => String(i.assignedRecruiter) === id).length;
    const assignedCandidates = applications.filter((a) => String(a.assignedRecruiter) === id).length;
    const perf = performanceByRecruiter.get(id) || {
      candidatesHandled: 0,
      shortlistedCandidates: 0,
      hiredCandidates: 0,
      conversionRate: 0,
      interviewSuccessRate: 0,
      recruiterResponseTimeHours: 0
    };

    const lastActivity = applications
      .filter((a) => String(a.assignedRecruiter) === id && a.updatedAt)
      .map((a) => new Date(a.updatedAt).getTime())
      .sort((a, b) => b - a)[0];

    return {
      id: hr._id,
      name: hr.displayName || hr.email.split("@")[0],
      email: hr.email,
      isActive: hr.isActive,
      permissions: hr.permissions || [],
      sidebarModules: Array.isArray(hr.sidebarModules) ? hr.sidebarModules : [...HR_DEFAULT_SIDEBAR_MODULES],
      assignedCandidates,
      assignedInternships,
      performanceMetrics: {
        candidatesHandled: perf.candidatesHandled,
        shortlistedCandidates: perf.shortlistedCandidates,
        hiredCandidates: perf.hiredCandidates,
        conversionRate: perf.conversionRate,
        interviewSuccessRate: perf.interviewSuccessRate,
        recruiterResponseTimeHours: perf.recruiterResponseTimeHours,
        activitySummary: lastActivity
          ? `Last pipeline activity ${new Date(lastActivity).toLocaleString()}`
          : "No recent pipeline activity"
      }
    };
  });

  const totalAssignedCandidates = applications.length;
  const totalHires = applications.filter((a) =>
    [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(a.status)
  ).length;
  const conversionRates = hrUsersPayload
    .map((h) => h.performanceMetrics.conversionRate)
    .filter((v) => Number.isFinite(v));
  const averageConversionRate = conversionRates.length
    ? Number((conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length).toFixed(2))
    : 0;

  return {
    summary: {
      totalHrUsers: hrUsersPayload.length,
      activeHrUsers: hrUsersPayload.filter((h) => h.isActive).length,
      totalAssignedCandidates,
      totalAssignedInternships: internships.length,
      totalHires,
      averageConversionRate
    },
    hrUsers: hrUsersPayload
  };
}

async function createHrAccount(companyId, { name, email, password, permissions, sidebarModules }) {
  if (!email || !password) {
    throw new AppError("email and password are required", 400);
  }
  if (String(password).length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    throw new AppError(`password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`, 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError("Email already exists", 409);

  const hrCustomPermissions = normalizeHrPermissions(permissions);
  const requestedModules = normalizeSidebarModules(sidebarModules);
  const effectiveModules = requestedModules.length > 0 ? requestedModules : [...HR_DEFAULT_SIDEBAR_MODULES];

  const user = await User.create({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: "company",
    companyAccountType: COMPANY_ACCOUNT_TYPES.HR,
    companyProfileRef: companyId,
    displayName: String(name || "").trim() || normalizedEmail.split("@")[0],
    hrCustomPermissions: hrCustomPermissions.filter((p) => HR_ASSIGNABLE_PERMISSIONS.includes(p)),
    permissions: hrCustomPermissions,
    sidebarModules: effectiveModules
  });

  return {
    id: user._id,
    name: user.displayName,
    email: user.email,
    isActive: user.isActive,
    permissions: user.permissions,
    sidebarModules: user.sidebarModules,
    assignedCandidates: 0,
    assignedInternships: 0,
    performanceMetrics: {
      candidatesHandled: 0,
      shortlistedCandidates: 0,
      hiredCandidates: 0,
      conversionRate: 0,
      interviewSuccessRate: 0,
      recruiterResponseTimeHours: 0,
      activitySummary: "New HR account — no activity yet"
    }
  };
}

async function deleteHrAccount(companyId, hrUserId, deletedBy) {
  const hr = await User.findOne({
    _id: hrUserId,
    role: "company",
    companyProfileRef: companyId,
    companyAccountType: COMPANY_ACCOUNT_TYPES.HR,
    isDeleted: false
  });
  if (!hr) throw new AppError("HR user not found in this company", 404);

  hr.isActive = false;
  hr.isDeleted = true;
  hr.deletedAt = new Date();
  hr.deletedBy = deletedBy;
  hr.refreshTokenHash = "";
  hr.refreshTokenExpiresAt = null;
  await hr.save();

  await Internship.updateMany(
    { company: companyId, assignedRecruiter: hr._id, isDeleted: false },
    { $set: { assignedRecruiter: null } }
  );

  await Application.updateMany(
    { companyId, assignedRecruiter: hr._id },
    { $set: { assignedRecruiter: null, assignmentUpdatedAt: new Date() } }
  );

  return { id: hr._id, email: hr.email, deleted: true };
}

async function updateHrPermissions(companyId, hrUserId, permissions, sidebarModules) {
  const hr = await User.findOne({
    _id: hrUserId,
    role: "company",
    companyProfileRef: companyId,
    companyAccountType: COMPANY_ACCOUNT_TYPES.HR,
    isDeleted: false
  });
  if (!hr) throw new AppError("HR user not found in this company", 404);

  const nextPermissions = normalizeHrPermissions(permissions);
  hr.hrCustomPermissions = nextPermissions.filter((p) => HR_ASSIGNABLE_PERMISSIONS.includes(p));
  hr.permissions = nextPermissions;
  if (sidebarModules !== undefined) {
    hr.sidebarModules = normalizeSidebarModules(sidebarModules);
  }
  await hr.save();

  assertCompanyHrUser(hr, companyId);

  return {
    id: hr._id,
    name: hr.displayName || hr.email,
    email: hr.email,
    permissions: hr.permissions,
    sidebarModules: Array.isArray(hr.sidebarModules) ? hr.sidebarModules : [...HR_DEFAULT_SIDEBAR_MODULES]
  };
}

module.exports = {
  HR_ASSIGNABLE_PERMISSIONS,
  HR_DEFAULT_PERMISSIONS,
  HR_DEFAULT_SIDEBAR_MODULES,
  normalizeHrPermissions,
  listCompanyHrUsers,
  buildHrInsights,
  createHrAccount,
  deleteHrAccount,
  updateHrPermissions
};
