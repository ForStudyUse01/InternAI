// Reusable cache helpers built on the Redis connection manager.
//
// Every helper is fail-safe: if Redis is disabled or unavailable, reads return
// null (a miss) and writes/deletes become no-ops. `cacheOrFetch` always resolves
// the value by falling through to the factory. Nothing here ever throws.

const logger = require("../../logger");
const connection = require("./redis.connection");

function prefixed(key) {
  return `${connection.getKeyPrefix()}${key}`;
}

function stripPrefix(key) {
  const prefix = connection.getKeyPrefix();
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

function serialize(value) {
  return JSON.stringify(value);
}

function deserialize(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // tolerate plain (non-JSON) values
  }
}

// Retrieve and JSON-decode a cached value. Returns null on miss / unavailable.
async function getCache(key) {
  const client = connection.getClient();
  if (!client) return null;
  try {
    const raw = await client.get(prefixed(key));
    return deserialize(raw);
  } catch (error) {
    logger.warn(`[cache] getCache('${key}') failed: ${error.message}`);
    return null;
  }
}

// JSON-encode and store a value with a TTL (seconds). Returns true on success.
async function setCache(key, value, ttlSeconds) {
  const client = connection.getClient();
  if (!client) return false;
  const ttl = Number.isFinite(ttlSeconds) ? ttlSeconds : connection.getDefaultTtl();
  try {
    if (ttl > 0) {
      await client.set(prefixed(key), serialize(value), "EX", ttl);
    } else {
      await client.set(prefixed(key), serialize(value));
    }
    return true;
  } catch (error) {
    logger.warn(`[cache] setCache('${key}') failed: ${error.message}`);
    return false;
  }
}

// Delete one or more keys. Returns the number of keys removed.
async function deleteCache(keys) {
  const client = connection.getClient();
  if (!client) return 0;
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0) return 0;
  try {
    return await client.del(...list.map(prefixed));
  } catch (error) {
    logger.warn(`[cache] deleteCache failed: ${error.message}`);
    return 0;
  }
}

// Delete every key matching a glob-style pattern (e.g. "user:*:profile").
// Uses non-blocking SCAN so it stays safe on large keyspaces. Returns count deleted.
async function deleteByPattern(pattern) {
  const client = connection.getClient();
  if (!client) return 0;

  return new Promise((resolve) => {
    let deleted = 0;
    let pending = 0;
    let scanning = true;

    const finish = () => {
      if (!scanning && pending === 0) resolve(deleted);
    };

    const stream = client.scanStream({ match: prefixed(pattern), count: 100 });

    stream.on("data", (batch) => {
      if (!batch || batch.length === 0) return;
      pending += 1;
      // Keys from SCAN already include the prefix; strip so deleteCache re-adds it once.
      deleteCache(batch.map(stripPrefix))
        .then((n) => {
          deleted += n;
        })
        .catch(() => {})
        .finally(() => {
          pending -= 1;
          finish();
        });
    });

    stream.on("end", () => {
      scanning = false;
      finish();
    });

    stream.on("error", (error) => {
      logger.warn(`[cache] deleteByPattern('${pattern}') failed: ${error.message}`);
      scanning = false;
      finish();
    });
  });
}

// Cache-aside helper: return the cached value, or run `fetchFn`, cache it, return it.
// If the cache is unavailable, `fetchFn` still runs so callers always get data.
async function cacheOrFetch(key, fetchFn, ttlSeconds) {
  const cached = await getCache(key);
  if (cached !== null && cached !== undefined) {
    logger.debug(`[cache] HIT ${key}`);
    return cached;
  }
  logger.debug(`[cache] MISS ${key}`);
  const value = await fetchFn();
  if (value !== null && value !== undefined) {
    await setCache(key, value, ttlSeconds);
  }
  return value;
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPattern,
  cacheOrFetch
};
