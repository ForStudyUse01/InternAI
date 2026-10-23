const { COMPANY_ACCOUNT_TYPES } = require("../../../constants/enums");
const { PERMISSION_KEYS } = require("../../../shared/constants/roles");
const AppError = require("../../../shared/utils/AppError");
const {
  ALL_SIDEBAR_MODULE_KEYS,
  HR_DEFAULT_SIDEBAR_MODULES
} = require("../../../constants/sidebar-modules");

/** @typedef {"hr" | "executive"} CompanyAccessTier */

function getAccessTier(user = {}) {
  if (user?.companyAccountType === COMPANY_ACCOUNT_TYPES.HR) {
    return "hr";
  }
  return "executive";
}

function isHrScopedUser(user = {}) {
  return getAccessTier(user) === "hr";
}

function isCompanyAdminUser(user = {}) {
  const type = user?.companyAccountType || COMPANY_ACCOUNT_TYPES.OWNER;
  return (
    type === COMPANY_ACCOUNT_TYPES.OWNER ||
    type === COMPANY_ACCOUNT_TYPES.CEO
  );
}

function canManageHrAccounts(user = {}) {
  return (
    user?.companyAccountType === COMPANY_ACCOUNT_TYPES.CEO ||
    user?.companyAccountType === COMPANY_ACCOUNT_TYPES.OWNER ||
    hasPermission(user, PERMISSION_KEYS.COMPANY_HR_MANAGE)
  );
}

function hasPermission(user = {}, permission) {
  return (user?.permissions || []).includes(permission);
}

function canManageRecruiters(user = {}) {
  return hasPermission(user, PERMISSION_KEYS.COMPANY_HR_MANAGE) || isCompanyAdminUser(user);
}

function canAssignRecruiters(user = {}) {
  return hasPermission(user, PERMISSION_KEYS.COMPANY_INTERNSHIP_ASSIGN) || isCompanyAdminUser(user);
}

function canPostInternships(user = {}) {
  if (isHrScopedUser(user)) return false;
  return hasPermission(user, PERMISSION_KEYS.INTERNSHIP_MANAGE) || isCompanyAdminUser(user);
}

function canUpdateCompanyProfile(user = {}) {
  if (isHrScopedUser(user)) return false;
  return hasPermission(user, PERMISSION_KEYS.PROFILE_WRITE) || isCompanyAdminUser(user);
}

function canViewGlobalAnalytics(user = {}) {
  if (isHrScopedUser(user)) return false;
  return hasPermission(user, PERMISSION_KEYS.COMPANY_ANALYTICS_GLOBAL) || isCompanyAdminUser(user);
}

function canViewSalaryAnalytics(user = {}) {
  if (isHrScopedUser(user)) return false;
  return hasPermission(user, PERMISSION_KEYS.COMPANY_ANALYTICS_SALARY) || isCompanyAdminUser(user);
}

function canViewRecruiterAnalytics(user = {}) {
  return (
    hasPermission(user, PERMISSION_KEYS.COMPANY_ANALYTICS_RECRUITER) ||
    canViewGlobalAnalytics(user)
  );
}

function internshipScopeFilter(companyId, user = {}) {
  const filter = { company: companyId, isDeleted: false };
  if (isHrScopedUser(user)) {
    filter.assignedRecruiter = user._id;
  }
  return filter;
}

function applicationScopeFilter(companyId, user = {}) {
  const filter = { companyId };
  if (isHrScopedUser(user)) {
    filter.assignedRecruiter = user._id;
  }
  return filter;
}

function applicantsQueryForInternship(internshipId, companyId, user = {}) {
  return {
    $or: [{ internshipId }, { internship: internshipId }],
    ...applicationScopeFilter(companyId, user)
  };
}

function assertCanPostInternships(user) {
  if (!canPostInternships(user)) {
    throw new AppError("HR accounts cannot create internships", 403);
  }
}

function assertCanUpdateCompanyProfile(user) {
  if (!canUpdateCompanyProfile(user)) {
    throw new AppError("HR accounts cannot modify company profile", 403);
  }
}

function resolveEffectiveSidebarModules(user = {}) {
  if (isCompanyAdminUser(user)) return [...ALL_SIDEBAR_MODULE_KEYS];
  if (Array.isArray(user.sidebarModules)) return user.sidebarModules;
  return [...HR_DEFAULT_SIDEBAR_MODULES];
}

function hasSidebarModule(user = {}, moduleKey) {
  return resolveEffectiveSidebarModules(user).includes(moduleKey);
}

/**
 * Interview feedback is private between its author and the candidate — it
 * does not inherit the company-wide/recruiter-scope visibility that applies
 * to applications generally. A viewer only sees an entry they authored
 * (legacy entries with no authorId fall back to "am I the application's
 * currently assigned recruiter"), unless explicitly granted
 * COMPANY_FEEDBACK_VIEW_ALL (nobody has this by default).
 */
function sanitizeFeedbackEntries(entries = [], viewerUser = {}, assignedRecruiter = null) {
  if (!Array.isArray(entries)) return [];
  if (viewerUser.role === "intern") {
    return entries.filter((entry) => entry.visibility !== "internal");
  }
  if (viewerUser.role === "company") {
    if (hasPermission(viewerUser, PERMISSION_KEYS.COMPANY_FEEDBACK_VIEW_ALL)) return entries;
    return entries.filter((entry) => {
      if (entry.authorId) return String(entry.authorId) === String(viewerUser._id);
      return Boolean(assignedRecruiter) && String(assignedRecruiter) === String(viewerUser._id);
    });
  }
  return entries;
}

function sanitizeApplicationFeedback(application, viewerUser) {
  if (!application) return application;
  const plain = typeof application.toObject === "function" ? application.toObject() : application;
  if (!Array.isArray(plain.hrFeedback)) return plain;
  return {
    ...plain,
    hrFeedback: sanitizeFeedbackEntries(plain.hrFeedback, viewerUser, plain.assignedRecruiter)
  };
}

function sanitizeApplicationListFeedback(applications, viewerUser) {
  return (applications || []).map((application) => sanitizeApplicationFeedback(application, viewerUser));
}

function buildListMeta(user = {}) {
  const tier = getAccessTier(user);
  return {
    accessTier: tier,
    dataScope: tier === "hr" ? "assigned_only" : "company_wide",
    companyAccountType: user?.companyAccountType || COMPANY_ACCOUNT_TYPES.OWNER
  };
}

module.exports = {
  getAccessTier,
  isHrScopedUser,
  isCompanyAdminUser,
  canManageHrAccounts,
  hasPermission,
  canManageRecruiters,
  canAssignRecruiters,
  canPostInternships,
  canUpdateCompanyProfile,
  canViewGlobalAnalytics,
  canViewSalaryAnalytics,
  canViewRecruiterAnalytics,
  internshipScopeFilter,
  applicationScopeFilter,
  applicantsQueryForInternship,
  assertCanPostInternships,
  assertCanUpdateCompanyProfile,
  buildListMeta,
  resolveEffectiveSidebarModules,
  hasSidebarModule,
  sanitizeFeedbackEntries,
  sanitizeApplicationFeedback,
  sanitizeApplicationListFeedback
};
