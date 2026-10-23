const User = require("../../models/User");
const { verifyAccessToken } = require("../utils/jwt");
const { ADMIN_ROLES, COMPANY_ACCOUNT_TYPES } = require("../constants/enums");
const { ROLE_PERMISSIONS, PERMISSION_KEYS } = require("../constants/roles");
const { sendError } = require("../utils/api-response");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    // Bearer-only, deliberately. This API never falls back to the accessToken
    // cookie for authentication: accepting an ambient cookie as a sufficient
    // credential is what makes an endpoint CSRF-exploitable (a cross-site page
    // can make the browser attach a cookie automatically, but it cannot attach
    // a custom Authorization header without the browser first honoring a CORS
    // preflight against our origin allowlist). The SPA client always sends this
    // header explicitly, so requiring it costs nothing and closes the hole.
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return sendError(res, { statusCode: 401, message: "Unauthorized: token missing", code: "AUTH_TOKEN_MISSING" });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select(
      "_id email role adminRole permissions companyAccountType companyProfileRef isActive isDeleted sidebarModules themePreference appearanceMode"
    );

    if (!user || !user.isActive || user.isDeleted) {
      return sendError(res, { statusCode: 401, message: "Unauthorized: invalid user", code: "AUTH_INVALID_USER" });
    }

    if (user.role === "admin" && (!Array.isArray(user.permissions) || user.permissions.length === 0)) {
      // Fail closed: an admin account with no adminRole configured gets zero
      // permissions, not SUPER_ADMIN. Never widen this to a default role.
      user.permissions = ROLE_PERMISSIONS[user.adminRole] || [];
    }
    if (user.role === "company") {
      const accountType = user.companyAccountType || COMPANY_ACCOUNT_TYPES.OWNER;
      user.companyAccountType = accountType;
      if (accountType === COMPANY_ACCOUNT_TYPES.HR) {
        user.permissions = [
          PERMISSION_KEYS.PROFILE_READ,
          PERMISSION_KEYS.APPLICATION_REVIEW,
          PERMISSION_KEYS.PIPELINE_UPDATE,
          PERMISSION_KEYS.FEEDBACK_WRITE,
          PERMISSION_KEYS.COMPANY_ASSIGNED_SCOPE,
          PERMISSION_KEYS.COMPANY_ANALYTICS_RECRUITER
        ];
      } else {
        user.permissions = ROLE_PERMISSIONS.company || [];
      }
    }

    req.user = user;
    return next();
  } catch (error) {
    return sendError(res, { statusCode: 401, message: "Unauthorized: invalid token", code: "AUTH_INVALID_TOKEN" });
  }
}

module.exports = authMiddleware;
