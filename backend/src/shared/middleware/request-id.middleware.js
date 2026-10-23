const crypto = require("crypto");

const SAFE_REQUEST_ID = /^[a-zA-Z0-9_-]{1,100}$/;

function requestIdMiddleware(req, res, next) {
  const incoming = String(req.get("X-Request-Id") || "").trim();
  req.requestId = SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.set("X-Request-Id", req.requestId);
  return next();
}

module.exports = requestIdMiddleware;
