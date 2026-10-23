const { sendError } = require("../utils/api-response");

function allowPermissions(...permissions) {
  return (req, res, next) => {
    if (!permissions.length) return next();
    const userPermissions = req.user?.permissions || [];
    const allowed = permissions.every((permission) => userPermissions.includes(permission));
    if (!allowed) {
      return sendError(res, {
        statusCode: 403,
        message: "Forbidden: permission denied"
      });
    }
    return next();
  };
}

module.exports = allowPermissions;
