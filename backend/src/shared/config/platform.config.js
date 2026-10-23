function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PLATFORM_CONFIG = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 5000),
  clientUrl: String(process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim(),

  database: {
    mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/internai",
    // Optional Neon Postgres for analytics/read-models (Phase 2). Primary app data stays on MongoDB Atlas Free (M0).
    postgresUrl: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || ""
  },

  redis: {
    enabled: toBool(process.env.REDIS_ENABLED, Boolean(process.env.UPSTASH_REDIS_REST_URL)),
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    defaultTtlSeconds: toInt(process.env.REDIS_DEFAULT_TTL_SECONDS, 3600)
  },

  ai: {
    enabled: toBool(process.env.ENABLE_AI, true),
    groqApiKey: process.env.GROQ_API_KEY || "",
    groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "",
    huggingFaceModel: process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2",
    cacheTtlSeconds: toInt(process.env.AI_CACHE_TTL_SECONDS, 86400),
    requestsPerMinute: toInt(process.env.AI_REQUESTS_PER_MINUTE, 10),
    batchSize: toInt(process.env.AI_BATCH_SIZE, 5),
    preferLocalHeuristics: toBool(process.env.AI_PREFER_LOCAL_HEURISTICS, true)
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || "local",
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
    cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "internai"
  },

  realtime: {
    chatEnabled: toBool(process.env.ENABLE_CHAT, true),
    interviewRoomsEnabled: toBool(process.env.ENABLE_INTERVIEW_ROOMS, true),
    maxConcurrentSockets: toInt(process.env.MAX_CONCURRENT_SOCKETS, 500)
  },

  deployment: {
    target: process.env.DEPLOY_TARGET || "render",
    region: process.env.DEPLOY_REGION || "auto"
  }
});

module.exports = { PLATFORM_CONFIG };
