const { PLATFORM_CONFIG } = require("../../config/platform.config");
const logger = require("../../logger");

let pool = null;

async function initPostgresPool() {
  const connectionString = PLATFORM_CONFIG.database.postgresUrl;
  if (!connectionString) {
    return null;
  }

  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString,
      ssl: PLATFORM_CONFIG.env === "production" ? { rejectUnauthorized: false } : undefined,
      max: 5
    });
    await pool.query("SELECT 1");
    return pool;
  } catch (error) {
    logger.warn("[postgres] Neon/Postgres unavailable:", error.message);
    pool = null;
    return null;
  }
}

async function ensureAnalyticsSchema() {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      user_id TEXT,
      role TEXT,
      payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  return true;
}

async function recordAnalyticsEvent({ eventName, userId, role, payload = {} }) {
  if (!pool) return false;
  await pool.query(
    "INSERT INTO analytics_events (event_name, user_id, role, payload) VALUES ($1, $2, $3, $4::jsonb)",
    [eventName, userId || null, role || null, JSON.stringify(payload)]
  );
  return true;
}

function isPostgresEnabled() {
  return Boolean(pool);
}

async function closePostgresPool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

module.exports = {
  initPostgresPool,
  ensureAnalyticsSchema,
  recordAnalyticsEvent,
  isPostgresEnabled,
  closePostgresPool
};
