const { sendError } = require("../utils/api-response");
const {
  assertCanPostInternships,
  assertCanUpdateCompanyProfile,
  canManageRecruiters,
  canManageHrAccounts,
  canAssignRecruiters,
  canViewGlobalAnalytics,
  isHrScopedUser,
  hasSidebarModule,
  isCompanyAdminUser
} = require("../../services/company-access.service");
const AppError = require("../utils/AppError");

function requireExecutiveCompany() {
  return (req, res, next) => {
    if (isHrScopedUser(req.user)) {
      return sendError(res, {
        statusCode: 403,
        message: "Forbidden: executive company access required"
      });
    }
    return next();
  };
}

function requireCanPostInternship() {
  return (req, res, next) => {
    try {
      assertCanPostInternships(req.user);
      return next();
    } catch (error) {
      return sendError(res, {
        statusCode: error.statusCode || 403,
        message: error.message
      });
    }
  };
}

function requireCanUpdateCompanyProfile() {
  return (req, res, next) => {
    try {
      assertCanUpdateCompanyProfile(req.user);
      return next();
    } catch (error) {
      return sendError(res, {
        statusCode: error.statusCode || 403,
        message: error.message
      });
    }
  };
}

function requireManageRecruiters() {
  return (req, res, next) => {
    if (!canManageRecruiters(req.user)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: cannot manage recruiters" });
    }
    return next();
  };
}

function requireCeoHrManagement() {
  return (req, res, next) => {
    if (isHrScopedUser(req.user)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: HR cannot manage HR accounts" });
    }
    if (!canManageHrAccounts(req.user)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: CEO access required for HR management" });
    }
    return next();
  };
}

function requireAssignRecruiters() {
  return (req, res, next) => {
    if (!canAssignRecruiters(req.user)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: cannot assign recruiters" });
    }
    return next();
  };
}

function requireGlobalAnalytics() {
  return (req, res, next) => {
    if (!canViewGlobalAnalytics(req.user) && !isHrScopedUser(req.user)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: global analytics not permitted" });
    }
    return next();
  };
}

/** Gate a route behind a CEO-assigned sidebar module. CEO/Owner always pass. */
function requireSidebarModule(moduleKey) {
  return (req, res, next) => {
    if (!hasSidebarModule(req.user, moduleKey)) {
      return sendError(res, { statusCode: 403, message: "Access denied: module not enabled for this account" });
    }
    return next();
  };
}

/**
 * Same as requireSidebarModule, but only enforced for company-role requests.
 * Use this on routes shared with other roles (e.g. intern/company chat, or
 * intern/company interview rooms) so the module gate never affects non-company users.
 */
function requireSidebarModuleForCompanyUsers(moduleKey) {
  return (req, res, next) => {
    if (req.user?.role !== "company") return next();
    if (!hasSidebarModule(req.user, moduleKey)) {
      return sendError(res, { statusCode: 403, message: "Access denied: module not enabled for this account" });
    }
    return next();
  };
}

/** Read-only team roster access: full recruiter managers, or an HR granted the team_members/hr_management module. */
function requireViewRecruiters() {
  return (req, res, next) => {
    if (isCompanyAdminUser(req.user) || canManageRecruiters(req.user)) return next();
    if (hasSidebarModule(req.user, "team_members") || hasSidebarModule(req.user, "hr_management")) return next();
    return sendError(res, { statusCode: 403, message: "Forbidden: cannot view team members" });
  };
}

module.exports = {
  requireExecutiveCompany,
  requireCanPostInternship,
  requireCanUpdateCompanyProfile,
  requireManageRecruiters,
  requireCeoHrManagement,
  requireAssignRecruiters,
  requireGlobalAnalytics,
  requireSidebarModule,
  requireSidebarModuleForCompanyUsers,
  requireViewRecruiters
};
