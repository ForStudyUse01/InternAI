import { apiRequest } from "@/lib/api-client";
import { getAuthSession } from "@/lib/session";

export type CertificationStatus = "pending_verification" | "verified" | "rejected";

export type CertificationRecord = {
  _id: string;
  courseName: string;
  skillCategory: string;
  provider: string;
  completionDate: string;
  expiryDate?: string | null;
  credentialUrl?: string;
  credentialId?: string;
  description?: string;
  verificationStatus: CertificationStatus;
  uploadTimestamp?: string;
  adminReviewTimestamp?: string | null;
  rejectionReason?: string;
  reviewNotes?: string;
  certificateFile?: {
    originalName?: string;
    mimeType?: string;
    fileSize?: number;
    fileUrl?: string;
  } | null;
  userEmail?: string;
  internName?: string;
};

export type CertificationStats = {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
};

export const SKILL_CATEGORY_OPTIONS = [
  "Programming",
  "Frameworks",
  "Tools",
  "Databases",
  "Data / ML",
  "Projects",
  "Problem Solving"
] as const;

const STATUS_LABELS: Record<CertificationStatus, string> = {
  pending_verification: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected"
};

export function certificationStatusLabel(status: CertificationStatus): string {
  return STATUS_LABELS[status] || status;
}

export const CERTIFICATION_STATUS_STYLES: Record<CertificationStatus, string> = {
  pending_verification: "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)] border-[var(--ds-warning)]",
  verified: "bg-[var(--ds-success-bg)] text-[var(--ds-success)] border-[var(--ds-success)]",
  rejected: "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)] border-[var(--ds-danger)]"
};

export const CERTIFICATE_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"] as const;

export const CERTIFICATE_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp"
] as const;

export const CERTIFICATE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const CERTIFICATE_ACCEPT_ATTR = [...CERTIFICATE_ACCEPTED_EXTENSIONS, ...CERTIFICATE_ACCEPTED_MIME_TYPES].join(",");

export const CERTIFICATE_FORMAT_HINT = "PDF, DOC, DOCX, PNG, JPG, JPEG, or WEBP";

// Frontend gate mirrors the backend's certificate-upload.middleware.js allow-list
// (extension check only -- browsers report inconsistent/empty mimetypes for
// .doc/.docx on some OSes, so mimetype stays a backend-only, stricter check).
export function validateCertificateFile(file: File): string | null {
  if (!file.size) return "Certificate file cannot be empty.";
  if (file.size > CERTIFICATE_MAX_SIZE_BYTES) return "Certificate file must be 10MB or smaller.";
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
  if (!(CERTIFICATE_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Unsupported file format. Upload ${CERTIFICATE_FORMAT_HINT} only.`;
  }
  return null;
}

type CacheEntry = { ts: number; data: unknown };
const CACHE_TTL_MS = 60 * 1000;
const cacheStore = new Map<string, CacheEntry>();
const inFlightStore = new Map<string, Promise<unknown>>();

function getCache<T>(key: string): T | null {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    cacheStore.delete(key);
    return null;
  }
  return cached.data as T;
}

function setCache<T>(key: string, data: T) {
  cacheStore.set(key, { ts: Date.now(), data });
}

async function withCache<T>(key: string, force: boolean, fetcher: () => Promise<T>): Promise<T> {
  if (!force) {
    const cached = getCache<T>(key);
    if (cached) return cached;

    const active = inFlightStore.get(key);
    if (active) return active as Promise<T>;
  }

  const pending = fetcher()
    .then((result) => {
      setCache(key, result);
      return result;
    })
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, pending);
  return pending;
}

export function invalidateCertificationsPortalCache() {
  cacheStore.clear();
  inFlightStore.clear();
}

// Module-level singleton -- survives logout/login within the same tab, so it
// must be cleared on account switch or the next account can see a previous
// account's cached certification list.
if (typeof window !== "undefined") {
  window.addEventListener("internai-auth-change", () => invalidateCertificationsPortalCache());
}

export async function fetchMyCertifications(force = false) {
  return withCache("certifications:mine", force, () =>
    apiRequest<{ certifications: CertificationRecord[]; stats: CertificationStats }>("/api/intern/certifications")
  );
}

export async function submitCertification(formData: FormData) {
  const response = await apiRequest<{ message: string; certification: CertificationRecord }>(
    "/api/intern/certifications",
    {
      method: "POST",
      body: formData
    }
  );
  cacheStore.delete("certifications:mine");
  return response;
}

function resolveApiBaseUrl() {
  if (typeof window === "undefined") return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
  try {
    const parsed = new URL(configured);
    const browserIsLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const configuredIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (configuredIsLocal && !browserIsLocal) {
      return `${window.location.protocol}//${window.location.hostname}:${parsed.port || "5000"}`;
    }
  } catch {
    // fall through
  }
  return configured;
}

export async function fetchCertificateBlob(certificationId: string, download = false) {
  const base = resolveApiBaseUrl();
  const token = getAuthSession().token;
  const qs = download ? "?download=1" : "";
  const response = await fetch(`${base}/api/intern/certifications/${certificationId}/file${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include"
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Could not load certificate file");
  }
  return response.blob();
}

export async function fetchAdminCertifications(params?: {
  status?: CertificationStatus | "";
  q?: string;
  page?: number;
  limit?: number;
  force?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 20));
  return withCache(`certifications:admin:${qs.toString()}`, params?.force ?? false, () =>
    apiRequest<{
      certifications: CertificationRecord[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/api/admin/certifications?${qs.toString()}`)
  );
}

export async function reviewAdminCertification(
  certificationId: string,
  payload: { status: "verified" | "rejected"; rejectionReason?: string; reviewNotes?: string }
) {
  const response = await apiRequest<{ message: string; certification: CertificationRecord }>(
    `/api/admin/certifications/${certificationId}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
  invalidateCertificationsPortalCache();
  return response;
}

export async function fetchAdminCertificateBlob(certificationId: string, download = false) {
  const base = resolveApiBaseUrl();
  const token = getAuthSession().token;
  const qs = download ? "?download=1" : "";
  const response = await fetch(`${base}/api/admin/certifications/${certificationId}/file${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include"
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Could not load certificate file");
  }
  return response.blob();
}
