// Dedicated configuration for the shared Redis cache infrastructure.
// Kept independent from the legacy Upstash config (platform.config.js `redis`)
// so this TCP-Redis layer can evolve without affecting AI response caching.

function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCacheConfig() {
  return Object.freeze({
    enabled: toBool(process.env.CACHE_ENABLED, false),
    // A full connection string takes precedence over discrete host/port fields.
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || "",
    username: process.env.REDIS_USERNAME || "",
    db: toInt(process.env.REDIS_DB, 0),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "internai:",
    defaultTtlSeconds: toInt(process.env.CACHE_DEFAULT_TTL_SECONDS, 3600),
    // Reconnect tuning.
    maxReconnectAttempts: toInt(process.env.REDIS_MAX_RECONNECT_ATTEMPTS, 10),
    reconnectBaseDelayMs: toInt(process.env.REDIS_RECONNECT_BASE_DELAY_MS, 200),
    reconnectMaxDelayMs: toInt(process.env.REDIS_RECONNECT_MAX_DELAY_MS, 5000),
    connectTimeoutMs: toInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 10000)
  });
}

module.exports = { getCacheConfig, toBool, toInt };
