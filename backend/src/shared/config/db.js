const mongoose = require("mongoose");
const logger = require("../logger");

let connectPromise = null;
let listenersAttached = false;

function sanitizeMongoUri(uri) {
  return String(uri || "").replace(/\/\/([^:\/?#]+):([^@\/?#]+)@/, "//$1:***@");
}

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("error", (error) => {
    logger.error("[startup] MongoDB connection error:", error && error.message ? error.message : error);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("[startup] MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("[startup] MongoDB reconnected");
  });
}

async function connectDB() {
  const mongoUri = String(process.env.MONGO_URI || "").trim();

  if (!mongoUri) {
    const error = new Error("MONGO_URI is missing in environment variables.");
    error.code = "MONGO_URI_MISSING";
    throw error;
  }

  attachConnectionListeners();

  if (mongoose.connection.readyState === 1) {
    logger.info("[startup] MongoDB already connected");
    return mongoose.connection;
  }

  if (connectPromise) {
    logger.info("[startup] MongoDB connection already in progress");
    await connectPromise;
    return mongoose.connection;
  }

  const timeoutMs = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 30000);
  logger.info(`[startup] Connecting to MongoDB (${sanitizeMongoUri(mongoUri)})`);

  connectPromise = mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number.isFinite(timeoutMs) ? timeoutMs : 30000
  });

  try {
    await connectPromise;
    logger.info("[startup] MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    logger.error("[startup] MongoDB connection failed:", error && error.message ? error.message : error);
    throw error;
  } finally {
    connectPromise = null;
  }
}

module.exports = connectDB;