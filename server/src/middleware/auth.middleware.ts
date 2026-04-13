import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/User";
import { verifyAccessToken } from "../services/auth/jwt.service";
import { errorResponse } from "../utils/apiResponse";
import type { UserRole } from "../types/auth";

function parseBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function isValidPayload(payload: unknown): payload is { userId: string; role: UserRole } {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<{ userId: string; role: UserRole }>;
  return typeof candidate.userId === "string" && (candidate.role === "intern" || candidate.role === "company");
}

export async function authenticateJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json(errorResponse('Authentication required. Use header: Authorization: Bearer <token>'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (!isValidPayload(payload)) {
      res.status(401).json(errorResponse("Authentication token payload is invalid. Use Authorization: Bearer <token>"));
      return;
    }

    const user = await UserModel.findById(payload.userId).select("_id role isVerified").lean();
    if (!user) {
      res.status(401).json(errorResponse("Authentication token references an invalid user"));
      return;
    }

    req.user = {
      id: user._id.toString(),
      role: user.role as UserRole,
    };
    next();
  } catch {
    res.status(401).json(errorResponse("Authentication token is invalid or expired"));
  }
}
