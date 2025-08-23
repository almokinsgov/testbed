/* sw.js */
const CACHE_NAME = "page-offline-v1";
let targetUrl = null;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SET_OFFLINE_PAGE" && typeof data.url === "string") {
    targetUrl = data.url;
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache =>
        cache.add(new Request(targetUrl, { credentials: "same-origin" }))
      )
    );
  }
});

self.addEventListener("fetch", event => {
  if (!targetUrl) return; // no page set yet

  if (event.request.url === targetUrl) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return (
          cached ||
          fetch(event.request).then(response => {
            // refresh cache when online
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
            return response;
          }).catch(() =>
            new Response("<h1>Offline</h1><p>This page was not cached yet.</p>", {
              headers: { "Content-Type": "text/html" },
              status: 503
            })
          )
        );
      })
    );
  }
});
