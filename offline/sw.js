/* sw.js */
const CACHE_NAME = "page-offline-v1";

// Set at runtime via postMessage from the page
let targetUrl = null;

self.addEventListener("install", event => {
  // Activate immediately so the page can message us
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Receive the page URL to cache
self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SET_OFFLINE_PAGE" && typeof data.url === "string") {
    targetUrl = data.url;
    event.waitUntil(
      caches.open(CACHE_NAME).then(async cache => {
        // Cache the page HTML itself
        await cache.add(new Request(targetUrl, { credentials: "same-origin" }));
        // Optionally cache extra assets for this page
        const extra = Array.isArray(data.assets) ? data.assets : [];
        for (const a of extra) {
          try {
            await cache.add(new Request(a, { credentials: "same-origin" }));
          } catch (_) {
            // Ignore individual asset failures
          }
        }
      })
    );
  }
});

// Serve only the designated page and its optional assets from cache
self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);

  // If the request matches the target page or a declared asset, try cache first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // If we know the target page, do cache-first for it
    if (targetUrl && reqUrl.href === targetUrl) {
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;

      try {
        const net = await fetch(event.request);
        // Refresh cache on successful online load
        cache.put(event.request, net.clone());
        return net;
      } catch {
        // If offline and not cached yet, last resort
        return cached || new Response(
          "<h1>Offline</h1><p>This page has not been cached yet.</p>",
          { headers: { "Content-Type": "text/html" }, status: 503 }
        );
      }
    }

    // If the page sent extra assets, also allow cache-first for those
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;

    // Everything else goes to network as normal
    try {
      return await fetch(event.request);
    } catch {
      // For non-target requests when offline, just fail normally
      return new Response("Offline", { status: 503 });
    }
  })());
});
