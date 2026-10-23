import { clearAuthSession, getAuthSession, setAuthSession, type AdminRole, type AuthRole } from "@/lib/session";

const DEFAULT_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

type ApiRequestOptions = RequestInit & {
  token?: string;
};

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_API_BASE_URL;

  const browserHost = window.location.hostname;
  try {
    const parsed = new URL(DEFAULT_API_BASE_URL);
    const configuredIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const browserIsLocal = browserHost === "localhost" || browserHost === "127.0.0.1";

    if (configuredIsLocal && !browserIsLocal) {
      const port = parsed.port || "5000";
      return `${window.location.protocol}//${browserHost}:${port}`;
    }
  } catch {
    // Keep configured base URL when parsing fails.
  }

  return DEFAULT_API_BASE_URL;
}

function buildApiUrl(path: string, apiBaseUrl: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath === "/health" || normalizedPath.startsWith("/health?")) {
    return `${apiBaseUrl}${normalizedPath}`;
  }

  if (!normalizedPath.startsWith("/api/")) {
    normalizedPath = `/api${normalizedPath}`;
  }

  normalizedPath = normalizedPath.replace(/^\/api\/api\//, "/api/");
  return `${apiBaseUrl}${normalizedPath}`;
}

function isAuthPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.includes("/api/auth/");
}

async function refreshAccessToken(apiBaseUrl: string, path: string) {
  const session = getAuthSession();
  const storedRefresh = session.refreshToken;

  if (!storedRefresh) {
    clearAuthSession();
    throw new Error("Session expired. Please log in again.");
  }

  const refreshUrl = buildApiUrl("/api/auth/refresh", apiBaseUrl);
  const refreshResponse = await fetch(refreshUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken: storedRefresh })
  });

  if (!refreshResponse.ok) {
    clearAuthSession();
    throw new Error("Session expired. Please log in again.");
  }

  const payload = (await refreshResponse.json().catch(() => ({}))) as {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
    role?: AuthRole;
    adminRole?: AdminRole | null;
    permissions?: string[];
    companyAccountType?: string | null;
  };
  const token = payload.accessToken || payload.token;
  if (!token || !payload.role) {
    clearAuthSession();
    throw new Error("Session refresh failed. Please log in again.");
  }
  setAuthSession(payload.role, token, {
    refreshToken: payload.refreshToken || storedRefresh,
    adminRole: payload.adminRole || session.adminRole || null,
    permissions: payload.permissions || session.permissions || [],
    email: session.email,
    companyAccountType: payload.companyAccountType || session.companyAccountType || null
  });
  return token;
}

export async function logoutAuthSession(): Promise<void> {
  if (typeof window === "undefined") return;

  const session = getAuthSession();
  const apiBaseUrl = resolveApiBaseUrl();

  try {
    await fetch(buildApiUrl("/api/auth/logout", apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(session.token ? { Authorization: `Bearer ${session.token}` } : {})
      },
      credentials: "include",
      body: JSON.stringify(session.refreshToken ? { refreshToken: session.refreshToken } : {})
    });
  } catch {
    // Best-effort server-side session invalidation.
  } finally {
    clearAuthSession();
  }
}

export class ApiRequestError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const hasBody = options.body && !(options.body instanceof FormData);
  if (hasBody) headers.set("Content-Type", "application/json");

  const session = getAuthSession();
  const token = options.token || session.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const apiBaseUrl = resolveApiBaseUrl();
  const url = buildApiUrl(path, apiBaseUrl);
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[apiRequest] Network error: ${options.method || "GET"} ${url} -> ${message}`);
    }
    throw new Error(
      `Cannot reach backend API at ${apiBaseUrl}. Make sure backend is running on port 5000 and reachable from this device.`
    );
  }

  const data = await response.json().catch(() => ({}));
  const canAttemptRefresh =
    response.status === 401 &&
    retry &&
    !isAuthPath(path) &&
    Boolean(getAuthSession().refreshToken);

  if (canAttemptRefresh) {
    try {
      const nextToken = await refreshAccessToken(apiBaseUrl, path);
      return apiRequest<T>(
        path,
        {
          ...options,
          token: nextToken
        },
        false
      );
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unauthorized");
    }
  }

  if (!response.ok) {
    const errorPayload = data as { message?: string; error?: Record<string, unknown> };
    const serverMessage = errorPayload.message;
    if (process.env.NODE_ENV !== "production") {
      console.error("[apiRequest] API error response", {
        url,
        method: options.method || "GET",
        status: response.status,
        statusText: response.statusText,
        body: data
      });
    }
    throw new ApiRequestError(
      serverMessage || `Request failed (${response.status} ${response.statusText})`,
      response.status,
      errorPayload.error
    );
  }

  return data as T;
}

export async function testBackendConnectivity() {
  return apiRequest<{ status?: string; service?: string }>("/health");
}
