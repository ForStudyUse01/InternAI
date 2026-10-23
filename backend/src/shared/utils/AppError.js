class AppError extends Error {
  constructor(message, statusCode = 500, details = null, { code = null, errors = null } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.code = code;
    this.errors = errors;
  }
}

module.exports = AppError;
