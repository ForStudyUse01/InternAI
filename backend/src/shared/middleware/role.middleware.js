const { sendError } = require("../utils/api-response");

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, { statusCode: 403, message: "Forbidden: insufficient permissions" });
    }
    return next();
  };
}

module.exports = allowRoles;
