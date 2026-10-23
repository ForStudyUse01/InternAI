const crypto = require("crypto");

const RESERVED_KEYS = new Set(["success", "message", "data", "meta", "error", "errors", "code"]);

function getRequestId(res) {
  return (res.req && res.req.requestId) || crypto.randomUUID();
}

function buildMeta(res, meta = {}) {
  const { pagination, ...rest } = meta || {};
  return {
    ...rest,
    ...(pagination ? { pagination } : {}),
    requestId: getRequestId(res),
    timestamp: new Date().toISOString()
  };
}

function sendSuccess(res, { statusCode = 200, message = "Operation successful", data = null, meta = {} } = {}) {
  const envelope = {
    success: true,
    message,
    data,
    error: null,
    meta: buildMeta(res, meta)
  };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (!RESERVED_KEYS.has(key)) {
        envelope[key] = value;
      }
    }
  }

  return res.status(statusCode).json(envelope);
}

function sendPaginated(
  res,
  { statusCode = 200, message = "Operation successful", items = [], itemsKey = "items", page = 1, limit = 20, total = 0 } = {}
) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return sendSuccess(res, {
    statusCode,
    message,
    data: { [itemsKey]: items },
    meta: { pagination: { page, limit, total, totalPages } }
  });
}

function sendError(res, { statusCode = 500, message = "Internal server error", errors = [], code = null, error = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error,
    errors,
    code,
    meta: buildMeta(res)
  });
}

module.exports = { sendSuccess, sendPaginated, sendError };
