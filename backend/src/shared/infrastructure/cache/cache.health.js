// Health reporting for the shared Redis cache. Never throws — always returns a
// structured snapshot so /health/cache stays responsive even when Redis is down.

const connection = require("./redis.connection");

// Parse the `key:value` line format returned by Redis INFO into a flat object.
function parseInfo(infoString) {
  const result = {};
  if (!infoString) return result;
  for (const line of infoString.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    result[line.slice(0, idx)] = line.slice(idx + 1).trim();
  }
  return result;
}

async function getCacheHealth() {
  const enabled = connection.isEnabled();

  if (!enabled) {
    return {
      enabled: false,
      connected: false,
      ping: null,
      memory: null,
      redisVersion: null,
      fallback: "mongodb",
      message: "Cache disabled (CACHE_ENABLED is not 'true')"
    };
  }

  // Best-effort connect; safe to call repeatedly.
  await connection.connect();

  if (!connection.isReady()) {
    return {
      enabled: true,
      connected: false,
      ping: null,
      memory: null,
      redisVersion: null,
      fallback: "mongodb",
      message: connection.getLastError() || "Redis not reachable"
    };
  }

  const pong = await connection.ping();
  const info = parseInfo(await connection.info());

  return {
    enabled: true,
    connected: pong === "PONG",
    ping: pong,
    memory: info.used_memory_human || info.used_memory || null,
    redisVersion: info.redis_version || null,
    fallback: "mongodb"
  };
}

module.exports = { getCacheHealth, parseInfo };
