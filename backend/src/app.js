const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

const { mountModularApi, getModuleManifest } = require("./registry");
const { bootstrapPlatformServices } = require("./shared/infrastructure/bootstrap");
const { getCacheBackendLabel } = require("./shared/infrastructure/cache/redis.client");
const { initCache, cacheHealthRoute } = require("./shared/infrastructure/cache");
const { isPostgresEnabled } = require("./shared/infrastructure/db/postgres.client");
const { isCloudinaryEnabled } = require("./shared/infrastructure/storage/storage.adapter");
const { PLATFORM_CONFIG } = require("./shared/config/platform.config");

const { notFoundMiddleware, errorMiddleware } = require("./shared/middleware/error.middleware");
const requestIdMiddleware = require("./shared/middleware/request-id.middleware");
const { sendSuccess } = require("./shared/utils/api-response");

const app = express();

// Render (and most PaaS hosts) terminate TLS at a reverse proxy in front of this
// process. Without this, express-rate-limit throws on the X-Forwarded-For header
// and req.ip/req.secure resolve to the proxy instead of the real client.
app.set("trust proxy", 1);

const configuredClientUrls = String(process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const allowVercelPreview = String(process.env.ALLOW_VERCEL_PREVIEW || "false").toLowerCase() === "true";
const allowedOrigins = [
  ...configuredClientUrls,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001"
].filter(Boolean);

app.use(compression({ threshold: 1024 }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:"],
        baseUri: ["'none'"]
      }
    },
    // This API is called cross-origin by the separately-hosted frontend and
    // serves uploaded files (resumes/certificates/images) for it to embed —
    // helmet's default same-origin CORP would silently block those loads.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Explicit (not just relying on helmet defaults) so the production security
    // posture is visible here and doesn't silently drift if the helmet major
    // version changes its defaults.
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    noSniff: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false }
  })
);
// helmet v7+ dropped Permissions-Policy (formerly Feature-Policy) support —
// set it directly. This is a pure JSON/file API, so every browser feature is denied.
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (allowVercelPreview) {
        try {
          const hostname = new URL(origin).hostname;
          if (hostname.endsWith(".vercel.app")) return callback(null, true);
        } catch {
          // Ignore malformed origins and continue to deny.
        }
      }
      return callback(new Error("CORS origin denied"));
    },
    credentials: true,
    // Frontend and API are always different origins (different ports even
    // in local dev) -- without this, the browser's fetch() strips
    // X-Report-Number from every cross-origin response before JS ever sees
    // it (it's not on the CORS-safelisted response header list), so
    // reports-portal.ts's response.headers.get("X-Report-Number") is always
    // null and every downloaded report PDF silently falls back to the same
    // generic "InternAI-Report.pdf" filename.
    exposedHeaders: ["X-Report-Number"]
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
// Must run after body parsing — otherwise req.body is still undefined and never sanitized.
app.use(mongoSanitize());
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "modules/uploads"), { maxAge: "7d", immutable: true, dotfiles: "deny", index: false })
);

if (process.env.NODE_ENV !== "test") {
  // "dev" is colorized/interactive-terminal-oriented; "combined" is the
  // standard structured access-log format expected by production log
  // aggregators (Render, Docker log drains, etc.).
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    // Env-tunable for the same reason as AUTH_RATE_LIMIT in
    // otp-rate-limit.middleware.js: the serial E2E suite drives every request
    // from one IP and legitimately exceeds the per-user production ceiling.
    // Production keeps the 400 default unless the env var is set.
    max: Number(process.env.API_RATE_LIMIT || 400),
    standardHeaders: true,
    legacyHeaders: false
  })
);

let platformStatus = {
  bootstrapped: false,
  cache: "memory",
  postgres: false,
  storage: PLATFORM_CONFIG.storage.provider
};

bootstrapPlatformServices()
  .then((status) => {
    platformStatus = { bootstrapped: true, ...status };
  })
  .catch(() => {
    platformStatus = {
      bootstrapped: false,
      cache: getCacheBackendLabel(),
      postgres: isPostgresEnabled(),
      storage: isCloudinaryEnabled() ? "cloudinary" : "local"
    };
  });

// Warm the shared Redis cache in the background. Never blocks startup and never
// throws — falls back to MongoDB if Redis is unavailable.
initCache().catch(() => {});

app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-cache");
  return sendSuccess(res, {
    data: {
      status: "ok",
      service: "ai-internship-platform-api",
      bootstrapped: platformStatus.bootstrapped
    }
  });
});

// Liveness (/health) says "the process is up." Readiness (/health/ready) says
// "the process can actually serve traffic" — orchestrators (Render, Docker,
// k8s) use this distinction to hold traffic back until dependencies are live.
app.get("/health/ready", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const ready = dbReady && platformStatus.bootstrapped;
  res.set("Cache-Control", "no-cache");
  return sendSuccess(res, {
    statusCode: ready ? 200 : 503,
    data: {
      ready,
      db: dbReady ? "connected" : "not-connected",
      bootstrapped: platformStatus.bootstrapped
    }
  });
});

app.get("/health/detailed", (req, res) =>
  sendSuccess(res, {
    data: {
      status: "ok",
      service: "ai-internship-platform-api",
      architecture: "serverless-modular-single-deploy",
      modules: getModuleManifest(),
      platform: platformStatus,
      freeTier: {
        frontend: "vercel",
        backend: PLATFORM_CONFIG.deployment.target,
        cache: platformStatus.cache || getCacheBackendLabel(),
        database: "mongodb-atlas-free + optional-neon-postgres",
        storage: isCloudinaryEnabled() ? "cloudinary" : "local",
        realtime: "webrtc-p2p + socket-signaling"
      }
    }
  })
);

app.use("/health/cache", cacheHealthRoute);

mountModularApi(app, "/api");
mountModularApi(app, "/api/v1");

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
