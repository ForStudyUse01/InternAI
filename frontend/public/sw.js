/*
 * InternAI service worker — hand-written, standards-based (Cache API + Fetch).
 * No build-tool coupling.
 *
 * Cache version is derived from the registration URL query (`/sw.js?v=<ver>`),
 * which ServiceWorkerManager builds from NEXT_PUBLIC_APP_VERSION +
 * NEXT_PUBLIC_APP_BUILD. Every deployment yields a new value, so:
 *   - the browser sees a changed script URL and installs a fresh worker;
 *   - all caches are version-scoped, and the activate handler purges every
 *     cache that isn't in the current version set (no stale/duplicate caches);
 *   - precached non-hashed assets (manifest, icons, offline.html, "/") are
 *     re-fetched on install, so they can never go stale across deploys.
 *
 * Strategy map:
 *   /_next/static, fonts, /icons, /brand  -> Cache First
 *   images                                 -> Stale While Revalidate
 *   navigations (HTML pages)               -> Network First + offline fallback
 *   anything under /api/ (backend origin)  -> Network Only (never cached)
 *   non-GET (POST/PUT/PATCH/DELETE)         -> Network Only (never cached)
 */

const DEFAULT_VERSION = "1.0.0";
function resolveVersion() {
  try {
    return new URL(self.location.href).searchParams.get("v") || DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
}

const CACHE_VERSION = resolveVersion();
// Expose for debugging / clients querying the running worker's version.
self.INTERNAI_SW_VERSION = CACHE_VERSION;
const PRECACHE = `internai-precache-${CACHE_VERSION}`;
const STATIC_CACHE = `internai-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `internai-images-${CACHE_VERSION}`;
const PAGE_CACHE = `internai-pages-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Precached at install so the shell + offline fallback work with no network.
// Public routes only — nothing authenticated, no API responses.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/",
  "/auth/intern",
  "/auth/company",
  "/auth/admin",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png"
];

// A request that must never be cached: the backend API (separate origin, all
// paths under /api/) and the health probe. Covers auth, AI, resume files, etc.
function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname === "/health";
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/")
  );
}

async function precacheResilient() {
  const cache = await caches.open(PRECACHE);
  // Add individually so one 404/redirect can't abort the whole install.
  await Promise.all(
    PRECACHE_URLS.map((url) =>
      cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)
    )
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || network || fetch(request);
}

async function networkFirstPage(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheResilient());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const valid = new Set([PRECACHE, STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE]);
      await Promise.all(keys.filter((key) => !valid.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache non-GET (POST/PUT/PATCH/DELETE) — always straight to network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Backend API / health — Network Only. Protects authenticated data & files.
  if (isApiRequest(url)) return;

  // HTML navigations — Network First, fall back to cached page then offline.html.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Cross-origin: only opportunistically cache images (SWR); everything else passes through.
  if (url.origin !== self.location.origin) {
    if (request.destination === "image") {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    }
    return;
  }

  // Same-origin build assets, fonts, icons — Cache First (immutable/hashed).
  if (isStaticAsset(url) || request.destination === "font") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images — Stale While Revalidate.
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Manifest — Stale While Revalidate.
  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Everything else: default network handling (no caching).
});

// Update flow: page posts SKIP_WAITING when the user clicks "Refresh".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ---------------------------------------------------------------------------
 * Background Sync — architecture only.
 * No non-sensitive queued write action exists yet (all mutations are auth/AI/
 * payment-gated and out of scope). Handler is ready for a future safe queue.
 * ------------------------------------------------------------------------- */
self.addEventListener("sync", (event) => {
  if (event.tag === "internai-outbox") {
    // Intentionally a no-op today. Wire a safe, non-sensitive replay queue here
    // when one exists. Never replay auth, payment, or AI requests.
  }
});

/* ---------------------------------------------------------------------------
 * Push Notification readiness — architecture only.
 * No backend push is implemented. These handlers make the SW compatible with
 * Web Push / Firebase / OneSignal once a backend sender is added.
 * ------------------------------------------------------------------------- */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "InternAI", body: event.data.text() };
  }
  const title = payload.title || "InternAI";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
