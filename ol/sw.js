/* sw.js - automated page and resource caching */
const CACHE_NAME = "page-offline-auto-v1";
let knownUrls = new Set();

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Messages from the page
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SET_DYNAMIC_ASSETS" && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const u of data.urls) {
        try {
          knownUrls.add(u);
          await cache.add(new Request(u, { credentials: "same-origin" }));
        } catch (e) {
          // Ignore individual failures
        }
      }
    })());
  } else if (data.type === "IS_CACHED" && data.url && event.ports && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(new Request(data.url, { credentials: "same-origin" }));
      event.ports[0].postMessage({ cached: !!match });
    })());
  }
});

// Cache-first for known URLs and documents. Network-first fallback to cache.
// If offline and document is missing, try offline.html.
self.addEventListener("fetch", (event) => {
  const reqUrl = new URL(event.request.url);

  // Same-origin only
  if (reqUrl.origin !== location.origin) return;

  const isDoc = event.request.mode === "navigate" || event.request.destination === "document";
  const isKnown = knownUrls.has(reqUrl.href);

  if (isKnown || isDoc) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;

      try {
        const net = await fetch(event.request);
        if (net && net.ok) {
          cache.put(event.request, net.clone());
        }
        return net;
      } catch (e) {
        if (isDoc) {
          const offline = await cache.match("/offline.html");
          return offline || new Response("<h1>Offline</h1><p>This page is not yet cached.</p>", {
            headers: { "Content-Type": "text/html" }, status: 503
          });
        }
        return new Response("Offline", { status: 503 });
      }
    })());
  }
});
