const { PLATFORM_CONFIG } = require("../../config/platform.config");
const memoryStore = require("./memory.store");
const logger = require("../../logger");

let redisClient = null;
let useUpstash = false;

async function initRedisClient() {
  if (!PLATFORM_CONFIG.redis.enabled) {
    return null;
  }

  if (!PLATFORM_CONFIG.redis.url || !PLATFORM_CONFIG.redis.token) {
    return null;
  }

  try {
    const { Redis } = require("@upstash/redis");
    redisClient = new Redis({
      url: PLATFORM_CONFIG.redis.url,
      token: PLATFORM_CONFIG.redis.token
    });
    await redisClient.ping();
    useUpstash = true;
    return redisClient;
  } catch (error) {
    logger.warn("[redis] Upstash unavailable, using in-memory cache fallback:", error.message);
    redisClient = null;
    useUpstash = false;
    return null;
  }
}

async function cacheGet(key) {
  if (useUpstash && redisClient) {
    return redisClient.get(key);
  }
  return memoryStore.get(key);
}

async function cacheSet(key, value, ttlSeconds = PLATFORM_CONFIG.redis.defaultTtlSeconds) {
  if (useUpstash && redisClient) {
    await redisClient.set(key, value, { ex: ttlSeconds });
    return;
  }
  memoryStore.set(key, value, ttlSeconds);
}

async function cacheDel(key) {
  if (useUpstash && redisClient) {
    await redisClient.del(key);
    return;
  }
  memoryStore.del(key);
}

async function cacheIncr(key, ttlSeconds = 60) {
  if (useUpstash && redisClient) {
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, ttlSeconds);
    }
    return count;
  }
  return memoryStore.incr(key, ttlSeconds);
}

function getCacheBackendLabel() {
  return useUpstash ? "upstash" : "memory";
}

module.exports = {
  initRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheIncr,
  getCacheBackendLabel
};
