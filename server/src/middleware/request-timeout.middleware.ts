import type { NextFunction, Request, Response } from "express";
import { errorResponse } from "../utils/apiResponse";

export function createRequestTimeoutMiddleware(timeoutMs: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json(errorResponse("Request timed out"));
      }
    }, timeoutMs);

    const clearTimer = (): void => {
      clearTimeout(timer);
    };

    res.on("finish", clearTimer);
    res.on("close", clearTimer);
    next();
  };
}
