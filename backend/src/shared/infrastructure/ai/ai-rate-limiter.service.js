const { PLATFORM_CONFIG } = require("../../config/platform.config");
const { cacheIncr } = require("../cache/redis.client");

async function assertWithinAiRateLimit(userId) {
  if (!userId) return { allowed: true, remaining: PLATFORM_CONFIG.ai.requestsPerMinute };

  const key = `ai:rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const count = await cacheIncr(key, 60);
  const limit = PLATFORM_CONFIG.ai.requestsPerMinute;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    count
  };
}

module.exports = { assertWithinAiRateLimit };
