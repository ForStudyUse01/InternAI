require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./shared/database/db");
const { closePostgresPool, isPostgresEnabled } = require("./shared/infrastructure/db/postgres.client");
const { seedDatabase } = require("./shared/data/seedDatabase");
const { bootstrapPlatformServices } = require("./shared/infrastructure/bootstrap");
const { initChatSocket, getChatIo } = require("./shared/socket/chat.socket");
const { initInterviewSocket } = require("./shared/socket/interview.socket");
const interviewScheduler = require("./modules/interviews/services/interview-scheduler.service");
const logger = require("./shared/logger");

function assertRequiredEnv() {
  const required = ["MONGO_URI", "JWT_SECRET"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "The server cannot start without these."
    );
  }

  // Not fatal: CORS falls back to allow-all outside production (see app.js),
  // but in production an unset CLIENT_URL silently blocks the real frontend.
  if (process.env.NODE_ENV === "production" && !String(process.env.CLIENT_URL || "").trim()) {
    logger.warn(
      "[startup] CLIENT_URL is not set in production. CORS will reject the frontend's origin " +
        "unless it is one of the hardcoded localhost defaults."
    );
  }
}

function resolvePort() {
  const rawPort = process.env.PORT;
  const parsedPort = Number(rawPort || 5000);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return parsedPort;
}

let server = null;
let shuttingDown = false;

async function startServer() {
  assertRequiredEnv();
  const port = resolvePort();

  logger.info(`[startup] Starting server (NODE_ENV=${process.env.NODE_ENV || "development"})`);
  logger.info(`[startup] Using PORT=${port}`);

  await connectDB();

  if (process.env.NODE_ENV !== "production" && String(process.env.AUTO_SEED || "true").toLowerCase() !== "false") {
    try {
      const seedResult = await seedDatabase({ reset: false });
      if (seedResult.seeded) {
        logger.info("[startup] Seeded demo accounts (database was empty).");
      }
    } catch (error) {
      logger.warn("[startup] Auto-seed skipped:", error && error.message ? error.message : error);
    }
  }

  const platformStatus = await bootstrapPlatformServices();
  logger.info("[startup] Platform services:", platformStatus);

  server = http.createServer(app);
  initChatSocket(server);
  initInterviewSocket();
  interviewScheduler.start();

  server.listen(port, () => {
    logger.info(`[startup] Server running on port ${port}`);
  });

  server.on("error", (error) => {
    logger.error("[startup] HTTP server failed:", error && error.message ? error.message : error);
    process.exit(1);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[shutdown] ${signal} received, closing gracefully`);

  const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);
  const forceExitTimer = setTimeout(() => {
    logger.error("[shutdown] graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, Number.isFinite(timeoutMs) ? timeoutMs : 10000);
  forceExitTimer.unref();

  try {
    interviewScheduler.stop();

    const io = getChatIo();
    if (io) io.close();

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info("[shutdown] HTTP server closed");
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      logger.info("[shutdown] MongoDB connection closed");
    }

    if (isPostgresEnabled()) {
      await closePostgresPool();
      logger.info("[shutdown] Postgres pool closed");
    }

    clearTimeout(forceExitTimer);
    logger.info("[shutdown] complete");
    process.exit(0);
  } catch (error) {
    logger.error("[shutdown] error during shutdown:", error && error.message ? error.message : error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("[fatal] Unhandled Rejection:", reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("[fatal] Uncaught Exception:", error && error.stack ? error.stack : error);
  process.exit(1);
});

startServer().catch((error) => {
  logger.error("[startup] Failed to start server:", error && error.stack ? error.stack : error);
  process.exit(1);
});
