// Public entry point for the shared Redis cache infrastructure.
//
// Business modules should import from here rather than reaching into individual
// files, e.g.:
//   const { cacheOrFetch, invalidatePrefix } = require("../../shared/infrastructure/cache");
//
// Note: this is the new TCP-Redis cache layer. It is separate from the legacy
// Upstash-based `redis.client.js` used by AI response caching.

const connection = require("./redis.connection");
const helpers = require("./cache.helper");
const invalidation = require("./cache.invalidation");
const { cacheResponse } = require("./cache.middleware");
const { getCacheHealth } = require("./cache.health");
const cacheHealthRoute = require("./cache.health.route");
const { CacheKeys, CacheTTL } = require("./cache.keys");

// Non-blocking initialization for app startup. Never throws; resolves to the
// client or null. Safe to fire-and-forget.
async function initCache() {
  return connection.connect();
}

// Graceful shutdown hook.
async function closeCache() {
  return connection.disconnect();
}

module.exports = {
  // lifecycle
  initCache,
  closeCache,
  isCacheReady: connection.isReady,
  isCacheEnabled: connection.isEnabled,
  // helpers
  getCache: helpers.getCache,
  setCache: helpers.setCache,
  deleteCache: helpers.deleteCache,
  deleteByPattern: helpers.deleteByPattern,
  cacheOrFetch: helpers.cacheOrFetch,
  // invalidation
  invalidateKey: invalidation.invalidateKey,
  invalidateKeys: invalidation.invalidateKeys,
  invalidatePattern: invalidation.invalidatePattern,
  invalidatePrefix: invalidation.invalidatePrefix,
  // middleware + health
  cacheResponse,
  getCacheHealth,
  cacheHealthRoute,
  // key registry
  CacheKeys,
  CacheTTL
};
