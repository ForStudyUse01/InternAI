import dotenv from "dotenv";

dotenv.config();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: process.env.MONGO_URI ?? getRequiredEnv("MONGODB_URI"),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  jwtAccessSecret: getRequiredEnv("JWT_ACCESS_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "1d",
  otpProvider: process.env.OTP_PROVIDER ?? "mock",
  otpLength: Number(process.env.OTP_LENGTH ?? 6),
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "no-reply@internai.local",
  resumeUploadDir: process.env.RESUME_UPLOAD_DIR ?? "uploads/resumes",
  resumeMaxFileSizeMb: Number(process.env.RESUME_MAX_FILE_SIZE_MB ?? 5),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
};
