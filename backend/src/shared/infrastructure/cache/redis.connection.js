// Connection manager for the shared Redis cache.
//
// Design goals:
//  - Never crash the server. If `ioredis` is missing, CACHE_ENABLED is false,
//    or Redis is unreachable, we log a warning and degrade to "disabled" so the
//    rest of the app keeps running on MongoDB.
//  - Own the reconnect strategy (capped exponential backoff with an attempt cap).
//  - Expose a small, stable surface: connect / getClient / isReady / ping / info /
//    disconnect / getStatus.

const logger = require("../../logger");
const { getCacheConfig } = require("./cache.config");

let client = null;
let ready = false;
let initializing = null; // in-flight connect() promise (dedupes concurrent callers)
let lastError = null;
const config = getCacheConfig();

function buildClientOptions() {
  const retryStrategy = (times) => {
    if (times > config.maxReconnectAttempts) {
      logger.warn(
        `[cache] Redis reconnect gave up after ${config.maxReconnectAttempts} attempts; using MongoDB fallback`
      );
      return null; // stop retrying
    }
    return Math.min(times * config.reconnectBaseDelayMs, config.reconnectMaxDelayMs);
  };

  const shared = {
    lazyConnect: true, // construct without connecting; we connect() explicitly and catch
    retryStrategy,
    // Fail commands fast so callers fall back to the DB instead of hanging.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: config.connectTimeoutMs
    // NOTE: key prefixing is handled in cache.helper (not via ioredis `keyPrefix`)
    // to keep scanStream/del pattern deletion correct and avoid double-prefixing.
  };

  if (config.url) {
    return { url: config.url, options: shared };
  }

  return {
    url: null,
    options: {
      ...shared,
      host: config.host,
      port: config.port,
      db: config.db,
      ...(config.username ? { username: config.username } : {}),
      ...(config.password ? { password: config.password } : {})
    }
  };
}

function wireEvents(instance) {
  instance.on("connect", () => logger.info("[cache] Redis connecting..."));
  instance.on("ready", () => {
    ready = true;
    lastError = null;
    logger.info("[cache] Redis connection ready");
  });
  instance.on("reconnecting", (delay) => {
    ready = false;
    logger.warn(`[cache] Redis reconnecting in ${delay}ms`);
  });
  instance.on("end", () => {
    ready = false;
    logger.warn("[cache] Redis connection closed");
  });
  instance.on("error", (error) => {
    ready = false;
    lastError = error && error.message ? error.message : String(error);
    // Errors are frequent while a server is down; keep this at warn to avoid noise.
    logger.warn(`[cache] Redis error: ${lastError}`);
  });
}

// Establishes the connection. Idempotent and safe to call repeatedly.
// Resolves to the client on success, or null when caching is unavailable.
async function connect() {
  if (!config.enabled) {
    return null;
  }
  // An existing instance means ioredis is already managing the connection
  // (including auto-reconnect when `ready` is false). Never build a second one.
  if (client) {
    return client;
  }
  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    let Redis;
    try {
      // Lazy require so a missing dependency degrades gracefully instead of throwing at import time.
      Redis = require("ioredis");
    } catch (error) {
      logger.warn(
        `[cache] 'ioredis' not installed; caching disabled (run: npm install ioredis). ${error.message}`
      );
      return null;
    }

    let instance = null;
    try {
      const { url, options } = buildClientOptions();
      instance = url ? new Redis(url, options) : new Redis(options);
      wireEvents(instance);
      await instance.connect();
      client = instance;
      ready = true;
      return client;
    } catch (error) {
      lastError = error && error.message ? error.message : String(error);
      logger.warn(`[cache] Redis unavailable, continuing without cache: ${lastError}`);
      // Tear down the failed instance so its background reconnect loop doesn't
      // leak as an orphan (a later connect() call will retry cleanly).
      if (instance) {
        try {
          instance.disconnect();
        } catch {
          /* already closed */
        }
      }
      client = null;
      ready = false;
      return null;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
}

function getClient() {
  return ready ? client : null;
}

function isReady() {
  return ready && Boolean(client);
}

function isEnabled() {
  return config.enabled;
}

function getKeyPrefix() {
  return config.keyPrefix;
}

function getDefaultTtl() {
  return config.defaultTtlSeconds;
}

function getLastError() {
  return lastError;
}

async function ping() {
  if (!isReady()) return null;
  try {
    return await client.ping();
  } catch (error) {
    lastError = error.message;
    return null;
  }
}

async function info() {
  if (!isReady()) return null;
  try {
    return await client.info();
  } catch (error) {
    lastError = error.message;
    return null;
  }
}

async function disconnect() {
  if (!client) return;
  try {
    await client.quit(); // graceful: flush pending then close
  } catch {
    try {
      client.disconnect();
    } catch {
      /* already gone */
    }
  } finally {
    client = null;
    ready = false;
  }
}

module.exports = {
  connect,
  disconnect,
  getClient,
  isReady,
  isEnabled,
  getKeyPrefix,
  getDefaultTtl,
  getLastError,
  ping,
  info
};
