const { assertWithinAiRateLimit } = require("../infrastructure/ai/ai-rate-limiter.service");
const AppError = require("../utils/AppError");

async function aiRateLimitMiddleware(req, res, next) {
  try {
    const userId = req.user?._id ? String(req.user._id) : req.ip;
    const rate = await assertWithinAiRateLimit(userId);
    res.setHeader("X-AI-RateLimit-Limit", String(rate.limit || 0));
    res.setHeader("X-AI-RateLimit-Remaining", String(rate.remaining || 0));

    if (!rate.allowed) {
      throw new AppError(`AI rate limit exceeded (${rate.limit}/min)`, 429);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = aiRateLimitMiddleware;
