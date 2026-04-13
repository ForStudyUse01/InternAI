import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import type { JwtPayloadModel, UserRole } from "../../types/auth";

export function generateAccessToken(userId: string, role: UserRole): string {
  const payload = { userId, role };
  const options: SignOptions = { expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function verifyAccessToken(token: string): JwtPayloadModel {
  return jwt.verify(token, env.jwtAccessSecret) as JwtPayloadModel;
}
