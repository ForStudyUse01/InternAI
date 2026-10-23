function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

const FEATURE_FLAGS = Object.freeze({
  ENABLE_AI: toBool(process.env.ENABLE_AI, true),
  ENABLE_NOTIFICATIONS: toBool(process.env.ENABLE_NOTIFICATIONS, true),
  ENABLE_RECORDINGS: toBool(process.env.ENABLE_RECORDINGS, false),
  ENABLE_CHAT: toBool(process.env.ENABLE_CHAT, true),
  ENABLE_INTERVIEW_ROOMS: toBool(process.env.ENABLE_INTERVIEW_ROOMS, true),
  ENABLE_3D_PORTFOLIO: toBool(process.env.ENABLE_3D_PORTFOLIO, true)
});

function isEnabled(flagName) {
  return Boolean(FEATURE_FLAGS[flagName]);
}

module.exports = { FEATURE_FLAGS, isEnabled };
