import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { errorResponse } from "../utils/apiResponse";
import { HttpError } from "../utils/httpError";
import { logError } from "../utils/logger";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(errorResponse("Resource not found"));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json(errorResponse(error.message));
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json(errorResponse("Uploaded file exceeds the size limit"));
      return;
    }
    res.status(400).json(errorResponse(error.message));
    return;
  }

  logError("Unhandled error", error, { requestId: req.requestId });

  res.status(500).json(errorResponse("Internal server error"));
}
