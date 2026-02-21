/*
  FNED Service Worker
  Version: 0.1.2

  Goals
  - Support PWA install
  - Cache app shell for faster reload and basic offline support

  Notes
  - This worker does not implement push.
  - Notifications while the app is open are handled in page by fned_notifications.js
*/

(function () {
  "use strict";

  var SW_VERSION = "0.1.2";
  var CACHE_SHELL = "fned-shell-v" + SW_VERSION;
  var CACHE_RUNTIME = "fned-runtime-v" + SW_VERSION;

  var PRECACHE_URLS = [
    './',
    './index.html',
    './v23_v32_split_js_v2.html',
    './manifest.json',
    './service-worker.js',
    './fned_pwa.js',
    './fned_notifications.js',
    './fned_module_editor.js',
    './rwas_region_warning.js',
    './situation_map_feed.js',
    './files/fned_custom_messages_example.json',
    './files/public_closures_FNDC_data.js',
    './files/public_closures_FNDC.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon-180.png'
  ];

  self.addEventListener("install", function (event) {
    event.waitUntil(
      caches.open(CACHE_SHELL).then(function (cache) {
        return cache.addAll(PRECACHE_URLS);
      }).then(function () {
        return self.skipWaiting();
      })
    );
  });

  self.addEventListener("activate", function (event) {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            var keep = key === CACHE_SHELL || key === CACHE_RUNTIME;
            if (!keep && key.indexOf("fned-") === 0) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );
      }).then(function () {
        return self.clients.claim();
      })
    );
  });

  function isHtmlRequest(req) {
    try {
      if (req.mode === "navigate") return true;
      var accept = req.headers.get("accept") || "";
      return accept.indexOf("text/html") >= 0;
    } catch (e) {
      return false;
    }
  }

  function isSameOrigin(url) {
    try {
      return new URL(url).origin === self.location.origin;
    } catch (e) {
      return false;
    }
  }

  function networkFirst(req) {
    return fetch(req).then(function (resp) {
      if (resp && resp.ok) {
        var copy = resp.clone();
        caches.open(CACHE_RUNTIME).then(function (cache) {
          cache.put(req, copy);
        });
      }
      return resp;
    }).catch(function () {
      return caches.match(req);
    });
  }

  function cacheFirst(req) {
    return caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE_RUNTIME).then(function (cache) {
            cache.put(req, copy);
          });
        }
        return resp;
      });
    });
  }

  self.addEventListener("fetch", function (event) {
    var req = event.request;

    // Only handle GET and same-origin
    if (!req || req.method !== "GET") return;
    if (!isSameOrigin(req.url)) return;

    if (isHtmlRequest(req)) {
      event.respondWith(networkFirst(req));
      return;
    }

    event.respondWith(cacheFirst(req));
  });

  self.addEventListener("message", function (event) {
    var data = event && event.data ? event.data : {};
    if (data && data.type === "FNED_SKIP_WAITING") {
      try {
        self.skipWaiting();
      } catch (e) {
        // ignore
      }
    }
  });

  // Allow notifications created via ServiceWorkerRegistration.showNotification()
  // to open the relevant URL when tapped.
  self.addEventListener("notificationclick", function (event) {
    try {
      event.notification.close();
    } catch (e0) {
      // ignore
    }

    var url = "";
    try {
      url = event && event.notification && event.notification.data && event.notification.data.url
        ? String(event.notification.data.url)
        : "";
    } catch (e1) {
      url = "";
    }

    if (!url) {
      return;
    }

    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientsArr) {
        // Prefer focusing an existing client on the same origin.
        for (var i = 0; i < clientsArr.length; i++) {
          var c = clientsArr[i];
          try {
            if (c && c.url && c.url.indexOf(self.location.origin) === 0) {
              return c.focus();
            }
          } catch (e2) {
            // ignore
          }
        }
        return self.clients.openWindow(url);
      })
    );
  });
})();
