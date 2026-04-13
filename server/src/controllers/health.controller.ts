import type { Request, Response } from "express";
import { successResponse } from "../utils/apiResponse";

export function healthController(_req: Request, res: Response): void {
  res
    .status(200)
    .json(successResponse("InternAI server is running", { uptime: process.uptime(), timestamp: new Date().toISOString() }));
}
