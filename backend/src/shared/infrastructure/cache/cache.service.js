const crypto = require("crypto");
const { cacheGet, cacheSet, cacheDel } = require("./redis.client");

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24);
}

function buildAiCacheKey(operation, payload, userId = "anon") {
  return `ai:cache:${operation}:${userId}:${hashPayload(payload)}`;
}

async function getCachedJson(key) {
  const value = await cacheGet(key);
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function setCachedJson(key, value, ttlSeconds) {
  await cacheSet(key, value, ttlSeconds);
}

async function remember(key, ttlSeconds, factory) {
  const cached = await getCachedJson(key);
  if (cached !== null && cached !== undefined) {
    return { value: cached, cacheHit: true };
  }
  const value = await factory();
  await setCachedJson(key, value, ttlSeconds);
  return { value, cacheHit: false };
}

async function invalidatePrefix(prefix) {
  await cacheDel(prefix);
}

async function getCachedAiResponse(operation, payload, userId) {
  const key = buildAiCacheKey(operation, payload, userId);
  const cached = await getCachedJson(key);
  if (cached) return { ...cached, cacheHit: true };
  return null;
}

async function setCachedAiResponse(operation, payload, userId, response, ttlSeconds) {
  const { PLATFORM_CONFIG } = require("../../config/platform.config");
  const key = buildAiCacheKey(operation, payload, userId);
  await setCachedJson(
    key,
    { ...response, cachedAt: new Date().toISOString() },
    ttlSeconds || PLATFORM_CONFIG.ai.cacheTtlSeconds
  );
}

module.exports = {
  hashPayload,
  buildAiCacheKey,
  getCachedJson,
  setCachedJson,
  remember,
  invalidatePrefix,
  getCachedAiResponse,
  setCachedAiResponse
};
