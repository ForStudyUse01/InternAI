import { apiRequest } from "@/lib/api-client";
import type { InternPortfolioRecord, PortfolioStatus, PortfolioTheme } from "@/lib/portfolio-types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { ts: number; data: unknown }>();

function readCache<T>(key: string, ttl: number): T | null {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.ts > ttl) {
    cache.delete(key);
    return null;
  }
  return row.data as T;
}

function writeCache(key: string, data: unknown) {
  cache.set(key, { ts: Date.now(), data });
}

export function invalidatePortfolioCache() {
  for (const key of cache.keys()) {
    if (key.startsWith("portfolio:")) cache.delete(key);
  }
}

export async function fetchMyPortfolio(force = false) {
  const key = "portfolio:mine";
  if (!force) {
    const cached = readCache<InternPortfolioRecord | null>(key, CACHE_TTL_MS);
    if (cached !== null) return cached;
  }
  const response = await apiRequest<{ portfolio: InternPortfolioRecord | null }>("/api/intern/portfolio");
  const portfolio = response.portfolio || null;
  writeCache(key, portfolio);
  return portfolio;
}

export async function generateMyPortfolio(options?: { theme?: PortfolioTheme; useAi?: boolean }) {
  const response = await apiRequest<{ portfolio: InternPortfolioRecord }>("/api/intern/portfolio/generate", {
    method: "POST",
    body: JSON.stringify(options || {})
  });
  invalidatePortfolioCache();
  return response.portfolio;
}

export async function updatePortfolioSettings(payload: {
  theme?: PortfolioTheme;
  status?: PortfolioStatus;
  autoSync?: boolean;
}) {
  const response = await apiRequest<{ portfolio: InternPortfolioRecord }>("/api/intern/portfolio/settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  invalidatePortfolioCache();
  return response.portfolio;
}

export async function fetchPortfolioThemes() {
  const response = await apiRequest<{ themes: PortfolioTheme[] }>("/api/intern/portfolio/themes");
  return response.themes || [];
}

export async function fetchPublicPortfolio(slug: string, force = false) {
  const key = `portfolio:public:${slug}`;
  if (!force) {
    const cached = readCache<{ portfolio: { slug: string; theme: PortfolioTheme; content: InternPortfolioRecord["content"]; lastGeneratedAt?: string; metadata?: { viewCount?: number; aiGenerated?: boolean } } }>(key, PUBLIC_CACHE_TTL_MS);
    if (cached) return cached.portfolio;
  }
  const response = await apiRequest<{
    portfolio: {
      slug: string;
      theme: PortfolioTheme;
      content: InternPortfolioRecord["content"];
      lastGeneratedAt?: string;
      metadata?: { viewCount?: number; aiGenerated?: boolean };
    };
  }>(`/api/portfolios/${encodeURIComponent(slug)}/public`);
  writeCache(key, response);
  return response.portfolio;
}

export function portfolioPublicPath(slug: string) {
  return `/portfolio/${slug}`;
}

export function portfolioAbsoluteUrl(slug: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/portfolio/${slug}`;
  }
  return `/portfolio/${slug}`;
}

export async function fetchCandidatePortfolioSummary(internProfileId: string) {
  const response = await apiRequest<{ portfolio: { slug: string; portfolioUrl: string; theme?: PortfolioTheme; lastGeneratedAt?: string; viewCount?: number } | null }>(
    `/api/company/interns/${encodeURIComponent(internProfileId)}/portfolio`
  );
  return response.portfolio;
}
