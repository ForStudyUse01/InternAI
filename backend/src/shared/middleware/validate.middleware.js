const AppError = require("../utils/AppError");

function validate(schemaFactory) {
  return (req, res, next) => {
    if (typeof schemaFactory !== "function") return next();
    const validation = schemaFactory(req);
    if (!validation || typeof validation !== "object") return next();
    if (!validation.valid) {
      return next(new AppError(validation.message || "Validation failed", 400));
    }
    return next();
  };
}

module.exports = validate;
