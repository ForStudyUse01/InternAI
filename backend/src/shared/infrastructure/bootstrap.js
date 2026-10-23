const { initRedisClient, getCacheBackendLabel } = require("./cache/redis.client");
const { initPostgresPool, ensureAnalyticsSchema, isPostgresEnabled } = require("./db/postgres.client");
const { PLATFORM_CONFIG } = require("../config/platform.config");
const logger = require("../logger");

let bootstrapPromise = null;

async function runBootstrap() {
  await initRedisClient();

  const postgres = await initPostgresPool();
  if (postgres) {
    try {
      await ensureAnalyticsSchema();
    } catch (error) {
      logger.warn("[postgres] analytics schema setup skipped:", error.message);
    }
  }

  return {
    cache: getCacheBackendLabel(),
    postgres: isPostgresEnabled(),
    ai: {
      enabled: PLATFORM_CONFIG.ai.enabled,
      groq: Boolean(PLATFORM_CONFIG.ai.groqApiKey),
      huggingFace: Boolean(PLATFORM_CONFIG.ai.huggingFaceApiKey),
      preferLocal: PLATFORM_CONFIG.ai.preferLocalHeuristics
    },
    storage: PLATFORM_CONFIG.storage.provider,
    deployment: PLATFORM_CONFIG.deployment.target
  };
}

// Memoized: app.js kicks this off at module load (non-blocking) and server.js
// awaits it again during startup. Without memoization each call opened a second
// Redis/Postgres connection and leaked the first pg Pool (never closed).
function bootstrapPlatformServices() {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

module.exports = { bootstrapPlatformServices };
