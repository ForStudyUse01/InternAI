const AppError = require("../../utils/AppError");
const { PLATFORM_CONFIG } = require("../../config/platform.config");
const { completeWithGroq } = require("./groq.provider");
const { completeWithHuggingFace } = require("./huggingface.provider");
const { assertWithinAiRateLimit } = require("./ai-rate-limiter.service");
const { getCachedAiResponse, setCachedAiResponse } = require("../cache/cache.service");

async function routeCompletion({ operation, payload, userId, systemPrompt, userPrompt, localFallback, skipRateLimit = false }) {
  if (!PLATFORM_CONFIG.ai.enabled) {
    return localFallback ? await localFallback() : { provider: "disabled", content: "" };
  }

  let rate = { remaining: null, limit: PLATFORM_CONFIG.ai.requestsPerMinute };
  if (!skipRateLimit) {
    rate = await assertWithinAiRateLimit(userId);
    if (!rate.allowed) {
      throw new AppError(`AI rate limit exceeded (${rate.limit}/min). Try again shortly.`, 429);
    }
  }

  const cached = await getCachedAiResponse(operation, payload, userId);
  if (cached) {
    return cached;
  }

  const attempts = [];

  if (!PLATFORM_CONFIG.ai.preferLocalHeuristics) {
    if (PLATFORM_CONFIG.ai.groqApiKey) {
      attempts.push(async () => completeWithGroq({ systemPrompt, userPrompt }));
    }
    if (PLATFORM_CONFIG.ai.huggingFaceApiKey) {
      attempts.push(async () => completeWithHuggingFace({ systemPrompt, userPrompt }));
    }
  } else {
    if (localFallback) {
      const local = await localFallback();
      if (local?.content) {
        await setCachedAiResponse(operation, payload, userId, local);
        return local;
      }
    }
    if (PLATFORM_CONFIG.ai.groqApiKey) {
      attempts.push(async () => completeWithGroq({ systemPrompt, userPrompt }));
    }
    if (PLATFORM_CONFIG.ai.huggingFaceApiKey) {
      attempts.push(async () => completeWithHuggingFace({ systemPrompt, userPrompt }));
    }
  }

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      const enriched = { ...result, cacheHit: false, rateRemaining: rate.remaining };
      await setCachedAiResponse(operation, payload, userId, enriched);
      return enriched;
    } catch (error) {
      lastError = error;
    }
  }

  if (localFallback) {
    const fallback = await localFallback();
    await setCachedAiResponse(operation, payload, userId, fallback);
    return { ...fallback, cacheHit: false, provider: fallback.provider || "local", fallbackUsed: true };
  }

  if (lastError instanceof AppError) throw lastError;
  throw new AppError("AI service is temporarily unavailable. Please try again shortly.", 503);
}

async function batchRouteCompletions(items, handler, batchSize = PLATFORM_CONFIG.ai.batchSize) {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const slice = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(slice.map((item) => handler(item)));
    results.push(...batchResults);
  }
  return results;
}

module.exports = {
  routeCompletion,
  batchRouteCompletions
};
