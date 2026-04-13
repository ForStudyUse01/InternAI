import { env } from "../config/env";

function safeErrorMeta(error: unknown): Record<string, string> {
  if (error instanceof Error) {
    const meta: Record<string, string> = { name: error.name, message: error.message };
    if (env.nodeEnv !== "production" && error.stack) {
      meta.stack = error.stack;
    }
    return meta;
  }
  return { message: String(error) };
}

export function logError(message: string, error: unknown, context?: Record<string, string | undefined>): void {
  const timestamp = new Date().toISOString();
  const payload = {
    ...context,
    ...safeErrorMeta(error),
  };
  console.error(`[${timestamp}] ${message}`, payload);
}
