import { fileExists, makeCheck, readText, readBackendSource } from "../lib/utils.mjs";

const PERF_THRESHOLD_MS = Number(process.env.DEPLOY_GUARD_HEALTH_MAX_MS || 2500);

async function probeHealth(url) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PERF_THRESHOLD_MS);
    const response = await fetch(`${url.replace(/\/+$/, "")}/health`, { signal: controller.signal });
    clearTimeout(timer);
    const elapsed = Date.now() - started;
    return { ok: response.ok, elapsed };
  } catch (error) {
    return { ok: false, elapsed: Date.now() - started, error: error.message };
  }
}

export async function runPerformanceChecks({ target }) {
  const checks = [];

  const platformConfig = readBackendSource(
    "backend/src/shared/config/platform.config.js",
    "backend/src/config/platform.config.js"
  );
  checks.push(
    makeCheck({
      id: "perf.ai-cache-config",
      category: "performance",
      name: "AI cache configuration",
      status: platformConfig.includes("AI_CACHE_TTL_SECONDS") && platformConfig.includes("redis") ? "PASS" : "FAIL",
      message: "Platform config defines AI cache and Redis settings"
    })
  );

  const cacheService = readBackendSource(
    "backend/src/shared/infrastructure/cache/cache.service.js",
    "backend/src/infrastructure/cache/cache.service.js"
  );
  checks.push(
    makeCheck({
      id: "perf.redis-fallback",
      category: "performance",
      name: "Redis cache layer",
      status: cacheService.includes("remember") && cacheService.includes("getCachedAiResponse") ? "PASS" : "FAIL",
      message: "Cache service supports AI response memoization"
    })
  );

  if (target === "all" || target === "frontend") {
    const nextConfig = readText("frontend/next.config.ts") || readText("frontend/next.config.js");
    if (nextConfig) {
      checks.push(
        makeCheck({
          id: "perf.next-config",
          category: "performance",
          name: "Next.js config present",
          status: "PASS",
          message: "Next.js configuration file found"
        })
      );
    } else {
      checks.push(
        makeCheck({
          id: "perf.next-config",
          category: "performance",
          name: "Next.js config present",
          status: "WARN",
          message: "No next.config file detected",
          blocking: false
        })
      );
    }
  }

  const healthUrl = process.env.DEPLOY_GUARD_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (healthUrl) {
    const probe = await probeHealth(healthUrl);
    checks.push(
      makeCheck({
        id: "perf.api-health-latency",
        category: "performance",
        name: "API health latency",
        status: probe.ok && probe.elapsed <= PERF_THRESHOLD_MS ? "PASS" : probe.ok ? "WARN" : "FAIL",
        message: probe.ok
          ? `Health endpoint ${probe.elapsed}ms (threshold ${PERF_THRESHOLD_MS}ms)`
          : `Health probe failed: ${probe.error || "non-OK response"}`,
        blocking: !probe.ok
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "perf.api-health-latency",
        category: "performance",
        name: "API health latency",
        status: "SKIP",
        message: "Set DEPLOY_GUARD_API_URL to run live latency probe",
        blocking: false
      })
    );
  }

  return checks;
}
