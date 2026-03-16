const CACHE_NAME = "pool-time-v2";
const RUNTIME_CACHE = "pool-time-runtime-v2";

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
];

// Install — pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  const current = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !current.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — network first for API/tiles, cache first for app shell
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go network-first for map tiles and external resources
  if (
    url.hostname.includes("openstreetmap.org") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a copy of successful tile responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for app shell assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

// Background sync stub — data is localStorage so no sync needed,
// but hook is here for future Supabase migration
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-timesheets") {
    console.log("[SW] Background sync triggered:", event.tag);
  }
});
