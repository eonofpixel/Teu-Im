// ─── Service Worker for Teu-Im PWA ──────────────────────────────────────────

const CACHE_NAME = "teu-im-pwa-v1";

// Static assets to cache on install
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
];

// Patterns that identify API calls (network-first)
const API_PATTERNS = [
  /^\/api\//,
  /^https?:\/\/.*\.supabase\.co\//,
];

// Patterns for static assets (cache-first)
const STATIC_PATTERNS = [
  /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$/,
  /^\/_next\/static\//,
  /^\/_next\/image\//,
];

// ─── Install: pre-cache critical assets ─────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Failed to cache static assets:", err);
      });
    })
  );

  // Activate immediately without waiting for old SWs to finish
  self.skipWaiting();
});

// ─── Activate: clean up old caches ──────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  // Claim all tabs immediately
  self.clients.claim();
});

// ─── Fetch: routing strategies ───────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests — let them pass through
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests that aren't Supabase
  if (url.origin !== self.location.origin && !isSupabaseUrl(url)) {
    return;
  }

  // API requests → network-first with offline fallback
  if (isApiRequest(url, request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests (HTML pages) → network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Everything else → network-first (no offline fallback)
  event.respondWith(networkFirst(request));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function networkFirst(request, useOfflineFallback = false) {
  try {
    const response = await fetch(request);

    // Cache successful navigation and static responses
    if (response.ok && (request.mode === "navigate" || isStaticAsset(new URL(request.url)))) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    console.warn("[SW] Network request failed:", request.url, err);

    // Try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback for navigation
    if (useOfflineFallback || request.mode === "navigate") {
      const offlinePage = await caches.match("/offline.html");
      if (offlinePage) return offlinePage;
    }

    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn("[SW] Cache-first fetch failed:", request.url, err);
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isApiRequest(url, request) {
  return API_PATTERNS.some((pattern) => pattern.test(url.pathname) || pattern.test(url.href));
}

function isStaticAsset(url) {
  return STATIC_PATTERNS.some((pattern) => pattern.test(url.pathname) || pattern.test(url.href));
}

function isSupabaseUrl(url) {
  return url.hostname.endsWith(".supabase.co");
}
