const { sendError } = require("../utils/api-response");
const logger = require("../logger");

function notFoundMiddleware(req, res, next) {
  return sendError(res, { statusCode: 404, message: "Route not found", code: "NOT_FOUND" });
}

function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file exceeds the maximum allowed size." : err.message;
  } else if (String(message).toLowerCase().includes("unsupported file format")) {
    statusCode = 400;
  }

  if (process.env.NODE_ENV !== "test") {
    logger.error(`[${req.method} ${req.originalUrl}] requestId=${req.requestId || "-"}`, {
      message: err.message,
      statusCode,
      stack: err.stack
    });
  }

  return sendError(res, {
    statusCode,
    message,
    code: err.code || null,
    errors: err.errors || [],
    error: err.details || (process.env.NODE_ENV === "development" ? { stack: err.stack } : null)
  });
}

module.exports = { notFoundMiddleware, errorMiddleware };
