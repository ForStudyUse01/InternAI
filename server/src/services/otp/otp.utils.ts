import { randomInt } from "node:crypto";
import { env } from "../../config/env";

export function generateOtpCode(): string {
  const lowerBound = 10 ** (env.otpLength - 1);
  const upperBound = 10 ** env.otpLength;
  return String(randomInt(lowerBound, upperBound));
}

export function computeOtpExpiryDate(): Date {
  return new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);
}
