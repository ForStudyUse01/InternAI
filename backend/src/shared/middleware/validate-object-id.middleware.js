const AppError = require("../utils/AppError");

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function validateObjectId(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value !== undefined && !OBJECT_ID_PATTERN.test(value)) {
        return next(new AppError(`Invalid ${paramName}`, 400, null, { code: "INVALID_OBJECT_ID" }));
      }
    }
    return next();
  };
}

module.exports = validateObjectId;
