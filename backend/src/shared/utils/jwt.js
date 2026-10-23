const jwt = require("jsonwebtoken");

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
}

// Backward-compatible aliases.
const signToken = signAccessToken;
const verifyToken = verifyAccessToken;

module.exports = {
  signToken,
  verifyToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
