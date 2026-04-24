import type { ApiResponse } from "@/types/common";
import { env } from "@/utils/env";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  isFormData?: boolean;
}

function joinApiUrl(path: string): string {
  const base = env.apiBaseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readApiMessage(raw: unknown): string | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const message = raw.message;
  return typeof message === "string" && message.trim() ? message.trim() : undefined;
}

function isApiPayload(value: unknown): value is ApiResponse<unknown> {
  return isRecord(value) && typeof value.success === "boolean";
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function messageForHttpError(status: number, serverMessage: string | undefined): string {
  if (serverMessage) {
    return serverMessage;
  }
  if (status === 401) {
    return "Invalid credentials.";
  }
  if (status === 403) {
    return "Access denied.";
  }
  if (status >= 500) {
    return "Something went wrong on our end. Please try again later.";
  }
  return "Something went wrong.";
}

function mapNetworkError(error: unknown): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error("Request timed out. Please try again.");
  }
  if (error instanceof TypeError) {
    return new Error("Unable to connect to the server. Check your connection or try again later.");
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (
      lower.includes("failed to fetch") ||
      lower.includes("networkerror") ||
      lower.includes("network request failed") ||
      lower.includes("load failed")
    ) {
      return new Error("Unable to connect to the server. Check your connection or try again later.");
    }
    return error;
  }
  return new Error("Something went wrong. Please try again.");
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = "GET", token, body, isFormData = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(joinApiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw mapNetworkError(error);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const raw = await readResponseBody(response);

  if (!response.ok) {
    const serverMessage = readApiMessage(raw);
    throw new Error(messageForHttpError(response.status, serverMessage));
  }

  if (raw === null || !isApiPayload(raw)) {
    throw new Error("Something went wrong.");
  }

  const payload = raw as ApiResponse<T>;
  if (!payload.success) {
    throw new Error(payload.message?.trim() || "Something went wrong.");
  }

  return payload;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null, isFormData = false) =>
    request<T>(path, { method: "POST", body, token, isFormData }),
  put: <T>(path: string, body?: unknown, token?: string | null) => request<T>(path, { method: "PUT", body, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => request<T>(path, { method: "PATCH", body, token }),
  delete: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
};
