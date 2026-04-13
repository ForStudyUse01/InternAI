import type { NextFunction, Request, Response } from "express";
import { errorResponse } from "../utils/apiResponse";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const clientRequestStore = new Map<string, RateLimitEntry>();

function resolveClientKey(req: Request): string {
  const xForwardedFor = req.headers["x-forwarded-for"]?.toString();
  if (xForwardedFor) {
    const firstForwardedIp = xForwardedFor.split(",")[0]?.trim();
    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;
  if (windowMs <= 0 || maxRequests <= 0) {
    throw new Error("Rate limiter requires positive windowMs and maxRequests values");
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientKey = resolveClientKey(req);
    const current = clientRequestStore.get(clientKey);

    if (!current || current.resetAt <= now) {
      clientRequestStore.set(clientKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json(errorResponse("Too many requests. Please try again later."));
      return;
    }

    current.count += 1;
    clientRequestStore.set(clientKey, current);
    next();
  };
}
