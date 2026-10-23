const VALIDATION_RULES = Object.freeze({
  PASSWORD_MIN_LENGTH: 8,
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES || 10)
});

module.exports = { VALIDATION_RULES };
