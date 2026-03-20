// ── Pool Time Tracker — Service Worker ───────────────────────────────────────
// Handles: offline caching, background sync for queued actions

const CACHE_NAME  = "pool-time-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.jpg",
];

// ── Install: cache core shell ─────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for shell ──────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always go network-first for Supabase API calls
  if (url.hostname.includes("supabase.co")) {
    e.respondWith(
      fetch(e.request)
        .catch(() => new Response(JSON.stringify({ error: "offline" }), {
          headers: { "Content-Type": "application/json" }
        }))
    );
    return;
  }

  // CDN resources (Leaflet, fonts) — cache-first
  if (url.hostname.includes("cdnjs") || url.hostname.includes("fonts.googleapis")) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // App shell — cache-first, fall back to index.html for SPA routing
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html"))
      )
  );
});

// ── Background sync: flush offline queue ─────────────────────────────────────
self.addEventListener("sync", (e) => {
  if (e.tag === "pool-sync") {
    e.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: "SYNC_REQUEST" }));
      })
    );
  }
});

// ── Push notifications (future use) ──────────────────────────────────────────
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "Pool Time", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});
