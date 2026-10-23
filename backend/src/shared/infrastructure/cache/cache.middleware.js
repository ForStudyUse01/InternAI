// Optional Express response-caching middleware factory.
//
// Provided as reusable infrastructure only — it is intentionally NOT mounted on
// any route yet. Business modules can opt in later, e.g.:
//
//   router.get("/jobs", cacheResponse({ ttl: 60 }), listJobs);
//
// Only successful (2xx) GET responses are cached. If the cache is unavailable the
// middleware is a transparent pass-through.

const { getCache, setCache } = require("./cache.helper");

function defaultKeyBuilder(req) {
  return `http:${req.originalUrl}`;
}

function cacheResponse(options = {}) {
  const { ttl, keyBuilder = defaultKeyBuilder } = options;

  return async function cacheResponseMiddleware(req, res, next) {
    if (req.method !== "GET") return next();

    let key;
    try {
      key = keyBuilder(req);
    } catch {
      return next();
    }
    if (!key) return next();

    const cached = await getCache(key);
    if (cached !== null && cached !== undefined) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    res.set("X-Cache", "MISS");

    // Intercept res.json to persist the payload on the way out.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire-and-forget; a cache write must never delay or break the response.
        setCache(key, body, ttl).catch(() => {});
      }
      return originalJson(body);
    };

    return next();
  };
}

module.exports = { cacheResponse };
