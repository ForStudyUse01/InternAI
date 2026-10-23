// Cache invalidation helpers — thin, intention-revealing wrappers over the
// cache helper so business modules can express *what* to invalidate without
// touching Redis primitives directly. All calls are fail-safe.

const { deleteCache, deleteByPattern } = require("./cache.helper");

// Invalidate a single key.
function invalidateKey(key) {
  return deleteCache(key);
}

// Invalidate an explicit list of keys.
function invalidateKeys(keys) {
  return deleteCache(keys);
}

// Invalidate every key matching a glob pattern (e.g. "jobs:list:*").
function invalidatePattern(pattern) {
  return deleteByPattern(pattern);
}

// Invalidate every key under a namespace prefix (e.g. prefix "user:42" -> "user:42:*").
function invalidatePrefix(prefix) {
  const normalized = prefix.endsWith(":") ? prefix : `${prefix}:`;
  return deleteByPattern(`${normalized}*`);
}

module.exports = {
  invalidateKey,
  invalidateKeys,
  invalidatePattern,
  invalidatePrefix
};
