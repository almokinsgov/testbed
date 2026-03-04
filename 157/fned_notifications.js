/*
  FNED Notifications and Custom Messages
  Version: 0.1.6

  Goal
  - While the dashboard tab is open, poll for alerts and custom messages
  - Show in page toasts
  - Optionally show browser notifications (Notification API)

  Inputs
  - RWAS alerts: window.FNED_RWAS_ALERT_SUMMARY and the event "fned:rwas-alerts-updated"
  - Custom messages JSON: runtimeConfig.customMessages.url

  Notes
  - Browser notifications require user permission
  - Some browsers require the page be served over https or localhost
*/

(function () {
  "use strict";

  var VERSION = "0.1.6";

  var DEFAULT_NOTIFICATIONS_CFG = {
    enabled: true,
    autoRefreshWarnings: true,
    pollIntervalMs: 300000,
    notifySources: {
      metservice: true,
      civilDefence: true
    },
    notifyUpcoming: false,
    notifyExpired: false,
    dedupeWindowHours: 12,
    useBrowserNotifications: true,
    useToasts: true,
    toastDurationMs: 9000,
    watch: {
      enabled: false,
      mode: "point",
      point: { lat: -35.23, lng: 173.95 },
      radiusKm: 15,
      polygonGeoJson: "",
      sources: {
        metservice: true,
        civilDefence: true,
        powerOutages: true,
        customMessages: true,
        waterOutages: true,
        nztaClosures: true,
        localRoadClosures: true
      },
      powerStatuses: {
        unplanned: true,
        plannedActive: true
      },
      waterStatuses: {
        New: true,
        "Under repairs": true
      },
      nztaTypes: {
        closure: true
      }
    },
    debugLog: false
  };

  var DEFAULT_CUSTOM_MESSAGES_CFG = {
    enabled: true,
    url: "./fned_custom_messages_example.json",
    pollIntervalMs: 60000,
    renderInSummary: true,
    useBrowserNotifications: true,
    useToasts: true,
    dedupeWindowHours: 12,
    debugLog: false
  };

  var STORAGE_SEEN_ALERTS = "fned_notify_seen_alerts_v1";
  var STORAGE_SEEN_MESSAGES = "fned_notify_seen_messages_v1";
  var STORAGE_PERMISSION_SEEN = "fned_notify_permission_seen_v1";
  var STORAGE_SEEN_WATCH = "fned_notify_seen_watch_v1";
  var STORAGE_WATCH_ENABLED_AT = "fned_notify_watch_enabled_at_v1";
  var STORAGE_WATCH_OBSERVED = "fned_notify_watch_observed_v1";

  function findNotificationCtaButton() {
    return (
      document.getElementById("fned-cta-notifications") ||
      document.querySelector('[data-fned-action="notifications:enable"]')
    );
  }

  function setCtaButtonLabel(btn, label) {
    if (!btn) return;
    var target = btn.querySelector('span:not(.icon)');
    if (!target) {
      var spans = btn.querySelectorAll('span');
      target = spans && spans.length ? spans[spans.length - 1] : null;
    }
    if (target) {
      target.textContent = label;
    }
  }

  function syncNotificationCtaButton() {
    var btn = findNotificationCtaButton();
    if (!btn) return;

    var baseLabel = btn.getAttribute("data-base-label") || "Receive Notifications";
    var support = browserNotificationSupport();
    var perm = notificationPermission();

    if (!support.supported) {
      // iOS guidance: keep CTA actionable so it can open install help.
      if (support.code === "ios-install") {
        setCtaButtonLabel(btn, "Install For Notifications");
        btn.removeAttribute("aria-disabled");
      } else {
        setCtaButtonLabel(btn, "Toasts Only");
        btn.setAttribute("aria-disabled", "true");
      }
      try {
        btn.title = support.reason;
      } catch (e) {
        // ignore
      }
      return;
    }

    btn.removeAttribute("aria-disabled");
    try {
      btn.title = "";
    } catch (e2) {
      // ignore
    }

    if (perm === "granted") {
      setCtaButtonLabel(btn, "Notifications Enabled");
    } else if (perm === "denied") {
      setCtaButtonLabel(btn, "Notifications Blocked");
    } else {
      setCtaButtonLabel(btn, baseLabel);
    }
  }

  function enableFromCta() {
    var perm = notificationPermission();
    var support = browserNotificationSupport();

    if (!support.supported) {
      if (support.code === "ios-install") {
        // Provide install guidance for iPhone and iPad.
        try {
          if (window.FNED_PWA_API && typeof window.FNED_PWA_API.showInstallHelp === "function") {
            window.FNED_PWA_API.showInstallHelp();
          }
        } catch (e0) {
          // ignore
        }

        showToast({
          title: "Install To Enable Notifications",
          body: support.reason || "On iPhone and iPad, notifications work after Add to Home Screen.",
          meta: "FNED",
          level: "Info"
        });
      } else {
        showToast({
          title: "Browser Notifications Unavailable",
          body: support.reason || "Browser notifications are unavailable. Toasts will still work.",
          meta: "FNED",
          level: "Warning"
        });
      }

      syncNotificationCtaButton();
      return Promise.resolve("unsupported");
    }

    if (perm === "granted") {
      showToast({
        title: "Notifications Enabled",
        body: "Browser notifications are enabled. You will receive updates while this tab is open.",
        meta: "FNED",
        level: "Info"
      });
      syncNotificationCtaButton();
      return Promise.resolve(perm);
    }

    if (perm === "denied") {
      showToast({
        title: "Notifications Blocked",
        body: "Notifications are blocked in browser settings for this site. You can still use in-page alerts and tiles.",
        meta: "FNED",
        level: "Warning"
      });
      syncNotificationCtaButton();
      return Promise.resolve(perm);
    }

    return requestNotificationPermission().then(function (nextPerm) {
      if (nextPerm === "granted") {
        showToast({
          title: "Notifications Enabled",
          body: "You will receive updates for MetService warnings and Civil Defence alerts while this tab is open.",
          meta: "FNED",
          level: "Info"
        });
      } else {
        showToast({
          title: "Notification Permission",
          body: "Permission is now: " + nextPerm,
          meta: "FNED",
          level: nextPerm === "denied" ? "Warning" : "Info"
        });
      }
      syncNotificationCtaButton();
      return nextPerm;
    });
  }

  var runtime = window.FNED_CONFIG && typeof window.FNED_CONFIG === "object" ? window.FNED_CONFIG : {};
  var notificationsCfg = mergeCfg(DEFAULT_NOTIFICATIONS_CFG, runtime.notifications);
  var messagesCfg = mergeCfg(DEFAULT_CUSTOM_MESSAGES_CFG, runtime.customMessages);
  var watchCfg = normaliseWatchCfg(notificationsCfg.watch);
  var watchEnabledAtMs = ensureWatchEnabledTimestamp();

  function mergeCfg(base, extra) {
    var out = shallowClone(base);
    if (!extra || typeof extra !== "object") {
      return out;
    }
    Object.keys(extra).forEach(function (key) {
      out[key] = extra[key];
    });
    return out;
  }

  function shallowClone(obj) {
    var out = {};
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).forEach(function (k) {
      out[k] = obj[k];
    });
    return out;
  }

  function normaliseWatchCfg(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var out = {
      enabled: cfgBool(src.enabled, false),
      mode: cfgStr(src.mode, "point").toLowerCase(),
      point: {
        lat: cfgNum(src.point && src.point.lat, -35.23),
        lng: cfgNum(src.point && src.point.lng, 173.95)
      },
      radiusKm: Math.max(1, cfgNum(src.radiusKm, 15)),
      polygonGeoJson: typeof src.polygonGeoJson === "string" ? src.polygonGeoJson.trim() : "",
      sources: {
        metservice: cfgBool(src.sources && src.sources.metservice, true),
        civilDefence: cfgBool(src.sources && src.sources.civilDefence, true),
        powerOutages: cfgBool(src.sources && src.sources.powerOutages, true),
        customMessages: cfgBool(src.sources && src.sources.customMessages, true),
        waterOutages: cfgBool(src.sources && src.sources.waterOutages, true),
        nztaClosures: cfgBool(src.sources && src.sources.nztaClosures, true),
        localRoadClosures: cfgBool(src.sources && src.sources.localRoadClosures, true)
      },
      powerStatuses: {
        unplanned: cfgBool(src.powerStatuses && src.powerStatuses.unplanned, true),
        plannedActive: cfgBool(src.powerStatuses && src.powerStatuses.plannedActive, true)
      },
      waterStatuses: {
        New: cfgBool(src.waterStatuses && src.waterStatuses.New, true),
        "Under repairs": cfgBool(src.waterStatuses && src.waterStatuses["Under repairs"], true)
      },
      nztaTypes: {
        closure: cfgBool(src.nztaTypes && src.nztaTypes.closure, true)
      }
    };

    if (out.mode !== "point" && out.mode !== "polygon" && out.mode !== "device") {
      out.mode = "point";
    }
    return out;
  }

  function ensureWatchEnabledTimestamp() {
    var now = safeNowMs();
    if (!watchCfg.enabled) {
      try {
        localStorage.removeItem(STORAGE_WATCH_ENABLED_AT);
      } catch (_err) {
        // ignore
      }
      return 0;
    }
    try {
      var raw = localStorage.getItem(STORAGE_WATCH_ENABLED_AT);
      var parsed = raw ? parseInt(raw, 10) : NaN;
      if (isFinite(parsed) && parsed > 0) {
        return parsed;
      }
      localStorage.setItem(STORAGE_WATCH_ENABLED_AT, String(now));
    } catch (_err2) {
      // ignore
    }
    return now;
  }

  function loadWatchObservedMap() {
    return loadSeenMap(STORAGE_WATCH_OBSERVED);
  }

  function saveWatchObservedMap(map) {
    saveSeenMap(STORAGE_WATCH_OBSERVED, map);
  }

  function firstSeenWatchMs(sourceKey, sourceId) {
    var key = String(sourceKey || "") + "::" + String(sourceId || "");
    if (!key || key === "::") return safeNowMs();
    var observed = loadWatchObservedMap();
    var ts = observed[key];
    if (typeof ts === "number" && ts > 0) {
      return ts;
    }
    var now = safeNowMs();
    observed[key] = now;
    saveWatchObservedMap(observed);
    return now;
  }

  function normaliseStatusToken(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function statusLabelTokenAllowed(statusValue, allowMap) {
    if (!allowMap || typeof allowMap !== "object") return true;
    var token = normaliseStatusToken(statusValue);
    var keys = Object.keys(allowMap);
    for (var i = 0; i < keys.length; i++) {
      if (!allowMap[keys[i]]) continue;
      if (normaliseStatusToken(keys[i]) === token) return true;
    }
    return false;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLng = (lng2 - lng1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  function pointInRing(lat, lng, ring) {
    if (!Array.isArray(ring) || !ring.length) return false;
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var yi = ring[i][0];
      var xi = ring[i][1];
      var yj = ring[j][0];
      var xj = ring[j][1];
      var intersects = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function firstPolygonRingFromGeoJson(geojson) {
    if (!geojson || typeof geojson !== "object") return null;
    if (geojson.type === "FeatureCollection" && Array.isArray(geojson.features)) {
      for (var i = 0; i < geojson.features.length; i++) {
        var ringFromFeature = firstPolygonRingFromGeoJson(geojson.features[i]);
        if (ringFromFeature && ringFromFeature.length) return ringFromFeature;
      }
      return null;
    }
    if (geojson.type === "Feature" && geojson.geometry) {
      return firstPolygonRingFromGeoJson(geojson.geometry);
    }
    if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates) && geojson.coordinates.length) {
      return geojson.coordinates[0].map(function (pair) {
        return [Number(pair[1]), Number(pair[0])];
      }).filter(function (pair) {
        return isFinite(pair[0]) && isFinite(pair[1]);
      });
    }
    if (geojson.type === "MultiPolygon" && Array.isArray(geojson.coordinates) && geojson.coordinates.length) {
      var firstPoly = geojson.coordinates[0];
      if (Array.isArray(firstPoly) && firstPoly.length) {
        return firstPoly[0].map(function (pair) {
          return [Number(pair[1]), Number(pair[0])];
        }).filter(function (pair) {
          return isFinite(pair[0]) && isFinite(pair[1]);
        });
      }
    }
    return null;
  }

  function parseWatchPolygonRing() {
    if (!watchCfg.polygonGeoJson) return null;
    var parsed = safeParseJson(watchCfg.polygonGeoJson);
    return firstPolygonRingFromGeoJson(parsed);
  }

  function extractItemPoints(item) {
    var points = [];
    if (!item || typeof item !== "object") return points;
    if (isFinite(Number(item.lat)) && isFinite(Number(item.lng))) {
      points.push([Number(item.lat), Number(item.lng)]);
    }
    if (item.point && isFinite(Number(item.point.lat)) && isFinite(Number(item.point.lng))) {
      points.push([Number(item.point.lat), Number(item.point.lng)]);
    }
    var rings = item.polygons;
    if (Array.isArray(rings)) {
      rings.forEach(function (ring) {
        if (!Array.isArray(ring) || !ring.length) return;
        ring.forEach(function (pair) {
          if (Array.isArray(pair) && pair.length >= 2 && isFinite(Number(pair[0])) && isFinite(Number(pair[1]))) {
            points.push([Number(pair[0]), Number(pair[1])]);
          }
        });
      });
    }
    if (item.geometry && typeof item.geometry === "object") {
      var ringFromGeo = firstPolygonRingFromGeoJson(item.geometry);
      if (ringFromGeo && ringFromGeo.length) {
        ringFromGeo.forEach(function (pair) {
          points.push([pair[0], pair[1]]);
        });
      } else if (item.geometry.type === "Point" && Array.isArray(item.geometry.coordinates) && item.geometry.coordinates.length >= 2) {
        points.push([Number(item.geometry.coordinates[1]), Number(item.geometry.coordinates[0])]);
      }
    }
    if (item.feature && item.feature.geometry) {
      var g = item.feature.geometry;
      if (g.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
        points.push([Number(g.coordinates[1]), Number(g.coordinates[0])]);
      } else {
        var ringFromFeature = firstPolygonRingFromGeoJson(g);
        if (ringFromFeature && ringFromFeature.length) {
          ringFromFeature.forEach(function (pair) {
            points.push([pair[0], pair[1]]);
          });
        }
      }
    }
    return points.filter(function (pair) {
      return isFinite(pair[0]) && isFinite(pair[1]);
    });
  }

  function isItemInsideWatch(item) {
    if (!watchCfg.enabled) return false;
    var points = extractItemPoints(item);
    if (!points.length) return false;

    if (watchCfg.mode === "polygon") {
      var watchRing = parseWatchPolygonRing();
      if (!watchRing || !watchRing.length) return false;
      for (var i = 0; i < points.length; i++) {
        if (pointInRing(points[i][0], points[i][1], watchRing)) return true;
      }
      return false;
    }

    var centerLat = Number(watchCfg.point && watchCfg.point.lat);
    var centerLng = Number(watchCfg.point && watchCfg.point.lng);
    if (!isFinite(centerLat) || !isFinite(centerLng)) return false;
    var radiusKm = Math.max(0.5, Number(watchCfg.radiusKm || 15));
    for (var p = 0; p < points.length; p++) {
      if (haversineKm(centerLat, centerLng, points[p][0], points[p][1]) <= radiusKm) {
        return true;
      }
    }
    return false;
  }

  function cfgBool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function cfgNum(value, fallback) {
    return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  }

  function cfgStr(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNowMs() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function logEnabled() {
    return !!(notificationsCfg.debugLog || messagesCfg.debugLog);
  }

  function debugLog() {
    if (!logEnabled()) return;
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[FNED Notifications]");
      console.log.apply(console, args);
    } catch (e) {
      // ignore
    }
  }

  function safeParseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function loadSeenMap(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      var parsed = safeParseJson(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      // ignore
    }
    return {};
  }

  function saveSeenMap(storageKey, map) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(map || {}));
    } catch (e) {
      // ignore
    }
  }

  function isSeenRecent(storageKey, id, windowHours) {
    if (!id) return false;
    var seen = loadSeenMap(storageKey);
    var ts = seen[id];
    if (!ts || typeof ts !== "number") return false;
    var ageMs = safeNowMs() - ts;
    var windowMs = Math.max(0, cfgNum(windowHours, 0)) * 60 * 60 * 1000;
    return windowMs > 0 ? ageMs < windowMs : true;
  }

  function markSeen(storageKey, id) {
    if (!id) return;
    var seen = loadSeenMap(storageKey);
    seen[id] = safeNowMs();
    saveSeenMap(storageKey, seen);
  }

  function getNotificationCtor() {
    try {
      return window.Notification || null;
    } catch (e) {
      return null;
    }
  }

  function isIOSDevice() {
    try {
      var ua = (navigator && navigator.userAgent) ? navigator.userAgent : "";
      var platform = (navigator && navigator.platform) ? navigator.platform : "";
      var isIOS = /iPad|iPhone|iPod/.test(ua);
      // iPadOS 13+ can identify as MacIntel
      var isIPadOS = platform === "MacIntel" && navigator && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
      return isIOS || isIPadOS;
    } catch (e) {
      return false;
    }
  }

  function isStandaloneMode() {
    try {
      // iOS Safari adds navigator.standalone for home screen apps
      if (typeof navigator !== "undefined" && navigator && navigator.standalone) return true;
    } catch (e) {
      // ignore
    }

    try {
      // Standard display-mode media query
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (e2) {
      // ignore
    }

    return false;
  }

  function isSecureOriginForNotifications() {
    try {
      // Modern browsers expose this reliably
      if (typeof window.isSecureContext === "boolean" && window.isSecureContext) {
        return true;
      }

      // Fallback checks
      var proto = (window.location && window.location.protocol) ? window.location.protocol : "";
      if (proto === "https:") return true;

      // localhost and loopback are treated as secure contexts in most browsers
      var host = (window.location && window.location.hostname) ? window.location.hostname : "";
      if (proto === "http:" && (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0")) {
        return true;
      }
    } catch (e2) {
      // ignore
    }
    return false;
  }

  function browserNotificationSupport() {
    // iOS and iPadOS only support web notifications in installed Home Screen web apps.
    // We return the install guidance even if Notification is undefined in this context.
    if (isIOSDevice() && !isStandaloneMode()) {
      return { supported: false, code: "ios-install", reason: "On iPhone and iPad, notifications work after Add to Home Screen. Open in Safari then install." };
    }

    var N = getNotificationCtor();
    if (!N) {
      return { supported: false, code: "no-api", reason: "Notification API is not available on this device or browser." };
    }

    // Some environments define Notification but only allow it in secure contexts.
    if (!isSecureOriginForNotifications()) {
      return { supported: false, code: "insecure", reason: "Browser notifications require HTTPS or localhost. Toasts will still work." };
    }

    // Some browsers can throw when accessing permission in restricted contexts.
    try {
      void N.permission;
    } catch (e3) {
      return { supported: false, code: "permission-unavailable", reason: "Notification permission is unavailable in this environment. Toasts will still work." };
    }

    return { supported: true, code: "ok", reason: "OK" };
  }

  function hasNotificationApi() {
    return browserNotificationSupport().supported;
  }

  function notificationPermission() {
    var support = browserNotificationSupport();
    if (!support.supported) return "unsupported";
    try {
      var N = getNotificationCtor();
      return (N && N.permission) ? N.permission : "default";
    } catch (e) {
      return "unsupported";
    }
  }

  function requestNotificationPermission() {
    var support = browserNotificationSupport();
    if (!support.supported) {
      return Promise.resolve("unsupported");
    }

    var N = getNotificationCtor();
    try {
      if (N && typeof N.requestPermission === "function") {
        var result = N.requestPermission();
        // requestPermission can return a Promise or use callbacks depending on browser.
        if (result && typeof result.then === "function") {
          return result.then(function (perm) {
            return perm || notificationPermission();
          }).catch(function () {
            return notificationPermission();
          });
        }
        return Promise.resolve(result || notificationPermission());
      }
    } catch (e2) {
      // ignore
    }

    return Promise.resolve(notificationPermission());
  }

  function ensureNotificationStyles() {
    if (document.getElementById("fned-notifications-style")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "fned-notifications-style";
    style.textContent = [
      '.fned-toast-host{position:fixed;top:1rem;right:1rem;z-index:2000;display:flex;flex-direction:column;gap:0.6rem;max-width:min(420px,calc(100vw - 2rem));}',
      '.fned-toast{background:#111827;color:#ffffff;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,0.28);padding:0.85rem 0.95rem;display:flex;flex-direction:column;gap:0.35rem;cursor:pointer;}',
      '.fned-toast-title{font-weight:700;font-size:0.95rem;line-height:1.2;margin:0;}',
      '.fned-toast-body{font-size:0.85rem;opacity:0.92;line-height:1.35;margin:0;}',
      '.fned-toast-meta{font-size:0.75rem;opacity:0.7;display:flex;gap:0.5rem;flex-wrap:wrap;}',
      '.fned-pill{display:inline-flex;align-items:center;gap:0.35rem;border-radius:999px;background:rgba(255,255,255,0.12);padding:0.15rem 0.55rem;}',
      '.fned-pill.is-warning{background:rgba(255,193,7,0.16);}',
      '.fned-pill.is-emergency{background:rgba(244,67,54,0.18);}',
      '.fned-custom-messages{margin-top:0.75rem;display:flex;flex-direction:column;gap:0.75rem;}',
      '.fned-message-card{background:#ffffff;border-radius:14px;border:1px solid #eceff1;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:0.9rem 1rem;}',
      '.fned-message-card h4{margin:0 0 0.35rem 0;font-size:0.98rem;}',
      '.fned-message-card p{margin:0.25rem 0 0 0;color:#4b5563;line-height:1.4;}',
      '.fned-message-card a{display:inline-flex;margin-top:0.45rem;font-weight:600;color:#1976d2;text-decoration:none;}',
      '.fned-message-card a:focus{outline:3px solid #ffc107;outline-offset:2px;border-radius:8px;}'
    ].join('');

    document.head.appendChild(style);
  }

  function ensureToastHost() {
    ensureNotificationStyles();
    var host = document.getElementById("fned-toast-host");
    if (host) return host;

    host = document.createElement("div");
    host.id = "fned-toast-host";
    host.className = "fned-toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");

    document.body.appendChild(host);
    return host;
  }

  function buildLevelPill(level) {
    var clean = (level || "").toLowerCase();
    var pill = document.createElement("span");
    pill.className = "fned-pill";

    if (clean === "warning" || clean === "watch") {
      pill.className += " is-warning";
    }

    if (clean === "emergency" || clean === "critical") {
      pill.className += " is-emergency";
    }

    pill.textContent = level || "Info";
    return pill;
  }

  function showToast(opts) {
    if (!cfgBool(notificationsCfg.useToasts, true) && !cfgBool(messagesCfg.useToasts, true)) {
      return;
    }

    var title = (opts && opts.title) ? String(opts.title) : "Update";
    var body = (opts && opts.body) ? String(opts.body) : "";
    var meta = (opts && opts.meta) ? String(opts.meta) : "";
    var level = (opts && opts.level) ? String(opts.level) : "Info";
    var url = opts && opts.url ? String(opts.url) : "";
    var durationMs = cfgNum(opts && opts.durationMs, cfgNum(notificationsCfg.toastDurationMs, 9000));

    var host = ensureToastHost();
    var toast = document.createElement("div");
    toast.className = "fned-toast";
    toast.tabIndex = 0;

    var h = document.createElement("p");
    h.className = "fned-toast-title";
    h.textContent = title;

    var p = document.createElement("p");
    p.className = "fned-toast-body";
    p.textContent = body;

    var metaRow = document.createElement("div");
    metaRow.className = "fned-toast-meta";
    metaRow.appendChild(buildLevelPill(level));

    if (meta) {
      var metaSpan = document.createElement("span");
      metaSpan.className = "fned-pill";
      metaSpan.textContent = meta;
      metaRow.appendChild(metaSpan);
    }

    toast.appendChild(h);
    if (body) toast.appendChild(p);
    toast.appendChild(metaRow);

    function openUrl() {
      if (!url) return;
      try {
        window.open(url, "_blank", "noopener");
      } catch (e) {
        // ignore
      }
    }

    toast.addEventListener("click", function () {
      openUrl();
      removeToast();
    });

    toast.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openUrl();
        removeToast();
      }
    });

    host.appendChild(toast);

    var timeoutId = setTimeout(removeToast, Math.max(2000, durationMs));

    function removeToast() {
      clearTimeout(timeoutId);
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }
  }

  function showBrowserNotification(opts) {
    if (!cfgBool(opts && opts.enabled, true)) return;

    // Permission is still governed by the Notification API.
    // However, on Android, the Notification constructor can be disabled.
    // For reliability, we prefer ServiceWorkerRegistration.showNotification().
    if (notificationPermission() !== "granted") return;

    var title = (opts && opts.title) ? String(opts.title) : "FNED Update";
    var body = (opts && opts.body) ? String(opts.body) : "";
    var tag = (opts && opts.tag) ? String(opts.tag) : "fned";
    var url = (opts && opts.url) ? String(opts.url) : "";

    var iconUrl = "./icons/icon-192.png";
    var badgeUrl = "./icons/icon-192.png";

    function fallbackWindowNotification() {
      try {
        var N = getNotificationCtor();
        if (!N || typeof N !== "function") return;
        var n = new N(title, {
          body: body,
          tag: tag,
          renotify: false
        });

        if (url) {
          n.onclick = function () {
            try { window.focus(); } catch (e0) { /* ignore */ }
            try { window.open(url, "_blank", "noopener"); } catch (e1) { /* ignore */ }
            try { n.close(); } catch (e2) { /* ignore */ }
          };
        }
      } catch (e3) {
        // ignore
      }
    }

    function tryServiceWorkerNotification() {
      try {
        if (!navigator || !navigator.serviceWorker) return false;
        if (typeof navigator.serviceWorker.getRegistration !== "function" && !navigator.serviceWorker.ready) return false;

        var p = null;
        if (typeof navigator.serviceWorker.getRegistration === "function") {
          p = navigator.serviceWorker.getRegistration();
        } else {
          p = navigator.serviceWorker.ready;
        }

        if (!p || typeof p.then !== "function") return false;

        p.then(function (reg) {
          // If getRegistration() returns null, fall back to ready.
          if (!reg && navigator.serviceWorker.ready) {
            return navigator.serviceWorker.ready;
          }
          return reg;
        }).then(function (reg2) {
          if (reg2 && typeof reg2.showNotification === "function") {
            return reg2.showNotification(title, {
              body: body,
              tag: tag,
              renotify: false,
              icon: iconUrl,
              badge: badgeUrl,
              data: { url: url }
            });
          }
          fallbackWindowNotification();
          return null;
        }).catch(function () {
          fallbackWindowNotification();
        });

        return true;
      } catch (e4) {
        return false;
      }
    }

    // Prefer SW notifications. If we cannot even attempt them, use window notifications.
    var attempted = tryServiceWorkerNotification();
    if (!attempted) {
      fallbackWindowNotification();
    }
  }

  function statusLabel(status) {
    if (status === "active-now") return "Active";
    if (status === "upcoming") return "Upcoming";
    if (status === "expired") return "Expired";
    return status || "";
  }

  function guessLevelFromSourceAndStatus(source, status) {
    if (status === "active-now") {
      if (source === "cd") return "Emergency";
      return "Warning";
    }
    if (status === "upcoming") return "Watch";
    return "Info";
  }

  function normalizeId(raw) {
    if (!raw) return "";
    return String(raw).trim();
  }

  function buildAlertId(item) {
    if (!item) return "";
    var id = normalizeId(item.id);
    if (id) return id;

    var parts = [item.source || "", item.title || "", item.startsAt || "", item.endsAt || ""];
    return parts.join("|");
  }

  function shouldNotifyByStatus(status) {
    if (status === "active-now") return true;
    if (status === "upcoming") return cfgBool(notificationsCfg.notifyUpcoming, false);
    if (status === "expired") return cfgBool(notificationsCfg.notifyExpired, false);
    return false;
  }

  function handleRwasUpdate(summary) {
    if (!cfgBool(notificationsCfg.enabled, true)) return;

    var srcCfg = notificationsCfg.notifySources && typeof notificationsCfg.notifySources === "object" ? notificationsCfg.notifySources : {};
    var allowMet = cfgBool(srcCfg.metservice, true);
    var allowCd = cfgBool(srcCfg.civilDefence, true);

    var items = [];
    if (allowMet && summary && Array.isArray(summary.weatherItems)) {
      items = items.concat(summary.weatherItems);
    }
    if (allowCd && summary && Array.isArray(summary.civilDefenceItems)) {
      items = items.concat(summary.civilDefenceItems);
    }

    if (!items.length) return;

    items.forEach(function (item) {
      var status = item && item.status ? String(item.status) : "";
      if (!shouldNotifyByStatus(status)) return;

      var id = buildAlertId(item);
      if (!id) return;

      if (isSeenRecent(STORAGE_SEEN_ALERTS, id, cfgNum(notificationsCfg.dedupeWindowHours, 12))) {
        return;
      }

      var source = item && item.source ? String(item.source) : "";
      var prefix = source === "cd" ? "Civil Defence" : "MetService";
      var title = prefix + ": " + (item.title || "Alert");

      var bodyParts = [];
      if (item.areas && Array.isArray(item.areas) && item.areas.length) {
        bodyParts.push("Areas: " + item.areas.join(", "));
      }
      bodyParts.push("Status: " + statusLabel(status));
      var body = bodyParts.join(" | ");

      var level = guessLevelFromSourceAndStatus(source, status);
      var url = item.link || "";

      if (cfgBool(notificationsCfg.useToasts, true)) {
        showToast({
          title: title,
          body: body,
          meta: "RWAS",
          level: level,
          url: url
        });
      }

      if (cfgBool(notificationsCfg.useBrowserNotifications, true)) {
        showBrowserNotification({
          enabled: true,
          title: title,
          body: body,
          tag: id,
          url: url
        });
      }

      markSeen(STORAGE_SEEN_ALERTS, id);
    });
  }

  function shouldWatchSource(sourceKey) {
    if (!watchCfg || !watchCfg.sources) return false;
    return cfgBool(watchCfg.sources[sourceKey], false);
  }

  function notifyWatchMatch(sourceKey, sourceLabel, item, options) {
    if (!watchCfg.enabled) return;
    if (!shouldWatchSource(sourceKey)) return;
    if (!isItemInsideWatch(item)) return;

    var opts = options && typeof options === "object" ? options : {};
    var itemId = normalizeId(item && item.id) || normalizeId(item && item.title) || normalizeId(item && item.name) || "item";
    var watchId = "watch:" + sourceKey + ":" + itemId;
    var firstSeenMs = firstSeenWatchMs(sourceKey, itemId);
    if (watchEnabledAtMs && firstSeenMs < watchEnabledAtMs) {
      return;
    }

    if (isSeenRecent(STORAGE_SEEN_WATCH, watchId, cfgNum(notificationsCfg.dedupeWindowHours, 12))) {
      return;
    }

    var titleSuffix = item && item.title ? String(item.title) : (item && item.name ? String(item.name) : "Watched area update");
    var title = sourceLabel + ": " + titleSuffix;
    var body = opts.body || "A new item matched your watched area.";
    var url = opts.url || (item && item.link ? String(item.link) : "");
    var level = opts.level || "Info";

    if (cfgBool(notificationsCfg.useToasts, true)) {
      showToast({
        title: title,
        body: body,
        meta: "Watch",
        level: level,
        url: url
      });
    }
    if (cfgBool(notificationsCfg.useBrowserNotifications, true)) {
      showBrowserNotification({
        enabled: true,
        title: title,
        body: body,
        tag: watchId,
        url: url
      });
    }

    markSeen(STORAGE_SEEN_WATCH, watchId);
  }

  function processWatchedRwasItems(summary) {
    if (!watchCfg.enabled) return;
    if (!summary || typeof summary !== "object") return;

    var weatherItems = Array.isArray(summary.weatherItems) ? summary.weatherItems : [];
    var civilItems = Array.isArray(summary.civilDefenceItems) ? summary.civilDefenceItems : [];

    weatherItems.forEach(function (item) {
      notifyWatchMatch("metservice", "MetService", item, {
        body: "Weather warning in watched area. Status: " + statusLabel(item && item.status),
        level: guessLevelFromSourceAndStatus("met", item && item.status)
      });
    });
    civilItems.forEach(function (item) {
      notifyWatchMatch("civilDefence", "Civil Defence", item, {
        body: "Civil defence alert in watched area. Status: " + statusLabel(item && item.status),
        level: guessLevelFromSourceAndStatus("cd", item && item.status)
      });
    });
  }

  function processWatchedMetserviceLayer(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("metservice")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      notifyWatchMatch("metservice", "MetService", item, {
        body: (item && item.area ? String(item.area) + " | " : "") + (item && item.eventType ? "Type: " + String(item.eventType) : "Weather warning"),
        level: "Warning",
        url: item && item.link ? String(item.link) : ""
      });
    });
  }

  function processWatchedCivilDefenceLayer(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("civilDefence")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      notifyWatchMatch("civilDefence", "Civil Defence", item, {
        body: (item && item.area ? String(item.area) + " | " : "") + "Civil defence alert",
        level: "Emergency",
        url: item && item.link ? String(item.link) : ""
      });
    });
  }

  function processWatchedPowerOutages(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("powerOutages")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      var statusType = String(item && item.statusType || "");
      if (!statusLabelTokenAllowed(statusType, watchCfg.powerStatuses)) return;
      var circuit = item && item.detail && item.detail.circuit_name ? String(item.detail.circuit_name) : "";
      notifyWatchMatch("powerOutages", "Power Outage", item, {
        body: (circuit ? circuit + " | " : "") + "Status: " + (statusType || "unknown"),
        level: "Warning"
      });
    });
  }

  function processWatchedWaterOutages(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("waterOutages")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      var status = String(item && item.status || "");
      if (!statusLabelTokenAllowed(status, watchCfg.waterStatuses)) return;
      notifyWatchMatch("waterOutages", "Water Outage", item, {
        body: (item && item.name ? String(item.name) + " | " : "") + "Status: " + (status || "unknown"),
        level: "Warning"
      });
    });
  }

  function processWatchedNztaRoadClosures(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("nztaClosures")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      var typeKey = String(item && item.typeKey || "");
      if (!statusLabelTokenAllowed(typeKey, watchCfg.nztaTypes)) return;
      notifyWatchMatch("nztaClosures", "NZTA Closure", item, {
        body: (item && item.title ? String(item.title) + " | " : "") + "Type: " + (item && item.eventType ? String(item.eventType) : typeKey || "road event"),
        level: "Warning"
      });
    });
  }

  function processWatchedLocalRoadClosures(payload) {
    if (!watchCfg.enabled || !shouldWatchSource("localRoadClosures")) return;
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    items.forEach(function (item) {
      notifyWatchMatch("localRoadClosures", "Local Road Closure", item, {
        body: (item && item.road_id ? String(item.road_id) + " | " : "") + (item && item.road_status ? String(item.road_status) : "Road closure"),
        level: "Warning"
      });
    });
  }

  function parseIso(iso) {
    if (!iso) return null;
    var dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function isMessageActive(msg, now) {
    if (!msg || typeof msg !== "object") return false;
    if (msg.enabled === false) return false;

    var start = parseIso(msg.start);
    var end = parseIso(msg.end);

    if (start && now < start) return false;
    if (end && now > end) return false;

    return true;
  }

  function messageChannels(msg) {
    if (!msg || typeof msg !== "object") return [];
    if (!Array.isArray(msg.channels)) return [];
    return msg.channels.map(function (c) { return String(c || "").toLowerCase().trim(); }).filter(Boolean);
  }

  function summaryMessageClassFromLevel(level) {
    var l = String(level || "").toLowerCase();
    if (l.indexOf("warn") >= 0 || l.indexOf("sev") >= 0 || l.indexOf("emerg") >= 0) {
      return { card: "alert-orange", badge: "alert-orange", badgeLabel: "Warning" };
    }
    return { card: "alert-yellow", badge: "alert-yellow", badgeLabel: "Info" };
  }

  function ensureSummaryMessageHost() {
    if (!cfgBool(messagesCfg.renderInSummary, true)) return null;

    var summaryContainer = document.getElementById("summary-paragraphs");
    var blocksEl = document.getElementById("summary-custom-blocks");
    var mountEl = summaryContainer || blocksEl;
    if (!mountEl) return null;

    ensureNotificationStyles();

    var host = document.getElementById("fned-custom-messages");
    if (!host) {
      host = document.createElement("div");
      host.id = "fned-custom-messages";
      host.className = "fned-custom-messages";
    }

    // Keep custom messages in the main summary stream and above the window-meta line.
    if (summaryContainer) {
      var windowMeta = summaryContainer.querySelector(".alert-list-meta");
      if (windowMeta) {
        summaryContainer.insertBefore(host, windowMeta);
      } else {
        summaryContainer.appendChild(host);
      }
    } else if (blocksEl && host.parentNode !== blocksEl) {
      blocksEl.insertBefore(host, blocksEl.firstChild);
    }

    return host;
  }

  function renderCustomMessages(messages) {
    var host = ensureSummaryMessageHost();
    if (!host) return;

    host.innerHTML = "";

    if (!messages || !messages.length) {
      return;
    }

    messages.forEach(function (msg) {
      var levelCfg = summaryMessageClassFromLevel(msg && msg.level);
      var card = document.createElement("div");
      card.className = "summary-banner alert-card " + levelCfg.card;

      var heading = document.createElement("div");
      heading.className = "summary-banner-heading";

      var badgeSpan = document.createElement("span");
      badgeSpan.className = "badge " + levelCfg.badge;
      badgeSpan.textContent = levelCfg.badgeLabel;

      var titleStrong = document.createElement("strong");
      titleStrong.textContent = msg && msg.title ? msg.title : "Message";

      heading.appendChild(badgeSpan);
      heading.appendChild(document.createTextNode(" "));
      heading.appendChild(titleStrong);

      var bodyWrap = document.createElement("div");
      bodyWrap.className = "summary-banner-body";

      if (msg && msg.body) {
        var body = document.createElement("p");
        body.textContent = msg.body;
        bodyWrap.appendChild(body);
      }

      if (msg && msg.link) {
        var a = document.createElement("a");
        a.href = msg.link;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = msg.linkLabel || "More Information";
        bodyWrap.appendChild(a);
      }

      card.appendChild(heading);
      card.appendChild(bodyWrap);
      host.appendChild(card);
    });
  }

  function parseMessageGeometry(msg) {
    if (!msg || typeof msg !== "object") return null;
    if (msg.geometry && typeof msg.geometry === "object") {
      return msg.geometry;
    }
    if (msg.geojson && typeof msg.geojson === "object") {
      return msg.geojson;
    }
    if (msg.feature && typeof msg.feature === "object") {
      return msg.feature;
    }
    if (typeof msg.geometry === "string") {
      var parsedGeom = safeParseJson(msg.geometry);
      if (parsedGeom && typeof parsedGeom === "object") return parsedGeom;
    }
    if (typeof msg.geojson === "string") {
      var parsedGeo = safeParseJson(msg.geojson);
      if (parsedGeo && typeof parsedGeo === "object") return parsedGeo;
    }
    return null;
  }

  function processWatchedCustomMessage(msg) {
    if (!watchCfg.enabled || !shouldWatchSource("customMessages")) return;
    if (!msg || typeof msg !== "object") return;
    var msgWithGeometry = shallowClone(msg);
    var geometry = parseMessageGeometry(msg);
    if (geometry) {
      msgWithGeometry.geometry = geometry;
    }
    notifyWatchMatch("customMessages", "Custom Message", msgWithGeometry, {
      body: msg.body || "Custom message matched your watched area.",
      level: msg.level || "Info",
      url: msg.link || ""
    });
  }

  function notifyCustomMessages(messages) {
    if (!messages || !messages.length) return;

    messages.forEach(function (msg) {
      processWatchedCustomMessage(msg);

      var id = normalizeId(msg.id) || (msg.title ? String(msg.title) : "message");
      if (!id) return;

      if (isSeenRecent(STORAGE_SEEN_MESSAGES, id, cfgNum(messagesCfg.dedupeWindowHours, 12))) {
        return;
      }

      var channels = messageChannels(msg);
      var wantsToast = channels.indexOf("toast") >= 0;
      var wantsNotification = channels.indexOf("notification") >= 0;

      var level = msg.level || "Info";
      var title = msg.title || "Message";
      var body = msg.body || "";
      var url = msg.link || "";

      if (cfgBool(messagesCfg.useToasts, true) && wantsToast) {
        showToast({
          title: title,
          body: body,
          meta: "Message",
          level: level,
          url: url
        });
      }

      if (cfgBool(messagesCfg.useBrowserNotifications, true) && wantsNotification) {
        showBrowserNotification({
          enabled: true,
          title: title,
          body: body,
          tag: "msg:" + id,
          url: url
        });
      }

      markSeen(STORAGE_SEEN_MESSAGES, id);
    });
  }

  async function fetchJson(url, options) {
    var fetchApi = window.FNED_FETCH && typeof window.FNED_FETCH.fetchJson === "function" ? window.FNED_FETCH : null;
    if (fetchApi) {
      return fetchApi.fetchJson(url, options || {});
    }
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " " + response.statusText);
    }
    return response.json();
  }

  function cacheBust(url) {
    if (!url) return url;
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return url + sep + "t=" + encodeURIComponent(String(safeNowMs()));
  }

  async function loadCustomMessages() {
    if (!cfgBool(messagesCfg.enabled, true)) return;

    var url = cfgStr(messagesCfg.url, "");
    if (!url) return;

    try {
      var data = await fetchJson(cacheBust(url), {
        feedKey: "fned.custom_messages",
        timeoutMs: 10000,
        retries: 1
      });

      var rawMessages = data && Array.isArray(data.messages) ? data.messages : [];
      var safeMessages = rawMessages.filter(function (msg) {
        return !!msg && typeof msg === "object";
      });
      var now = new Date();

      var activeMessages = safeMessages.filter(function (msg) {
        return isMessageActive(msg, now);
      });

      var summaryMessages = activeMessages.filter(function (msg) {
        var ch = messageChannels(msg);
        return ch.indexOf("summary") >= 0 || ch.indexOf("content") >= 0 || ch.indexOf("banner") >= 0;
      });

      renderCustomMessages(summaryMessages);
      notifyCustomMessages(activeMessages);

      debugLog("Custom messages loaded", {
        total: rawMessages.length,
        validObjects: safeMessages.length,
        active: activeMessages.length
      });
    } catch (e) {
      debugLog("Custom messages fetch failed", e);
    }
  }

  function maybeShowPermissionHint() {
    if (!cfgBool(notificationsCfg.useBrowserNotifications, true) && !cfgBool(messagesCfg.useBrowserNotifications, true)) {
      return;
    }

    if (!hasNotificationApi()) return;

    var perm = notificationPermission();
    if (perm !== "default") {
      return;
    }

    var seen = false;
    try {
      seen = localStorage.getItem(STORAGE_PERMISSION_SEEN) === "1";
    } catch (e) {
      // ignore
    }

    if (seen) {
      return;
    }

    showToast({
      title: "Enable Browser Notifications",
      body: "To receive alerts while the dashboard is open, allow notifications for this site.",
      meta: "Click to request",
      level: "Info",
      durationMs: 14000
    });

    try {
      localStorage.setItem(STORAGE_PERMISSION_SEEN, "1");
    } catch (e2) {
      // ignore
    }
  }

  function setup() {
    ensureNotificationStyles();

    // RWAS event hook
    window.addEventListener("fned:rwas-alerts-updated", function (ev) {
      var summary = ev && ev.detail ? ev.detail : window.FNED_RWAS_ALERT_SUMMARY;
      handleRwasUpdate(summary);
      processWatchedRwasItems(summary);
    });

    window.addEventListener("fned:map-power-outages-updated", function (ev) {
      processWatchedPowerOutages(ev && ev.detail ? ev.detail : window.__FNED_MAP_POWER_OUTAGES_DATA);
    });
    window.addEventListener("fned:map-metservice-alerts-updated", function (ev) {
      processWatchedMetserviceLayer(ev && ev.detail ? ev.detail : window.__FNED_MAP_METSERVICE_ALERTS_DATA);
    });
    window.addEventListener("fned:map-civil-defence-alerts-updated", function (ev) {
      processWatchedCivilDefenceLayer(ev && ev.detail ? ev.detail : window.__FNED_MAP_CIVIL_DEFENCE_ALERTS_DATA);
    });
    window.addEventListener("fned:map-water-outages-updated", function (ev) {
      processWatchedWaterOutages(ev && ev.detail ? ev.detail : window.__FNED_MAP_WATER_OUTAGES_DATA);
    });
    window.addEventListener("fned:map-nzta-road-events-updated", function (ev) {
      processWatchedNztaRoadClosures(ev && ev.detail ? ev.detail : window.__FNED_MAP_NZTA_ROAD_EVENTS_DATA);
    });
    window.addEventListener("fned:map-local-road-closures-updated", function (ev) {
      processWatchedLocalRoadClosures(ev && ev.detail ? ev.detail : window.__FNED_MAP_LOCAL_ROAD_CLOSURES_DATA);
    });

    // Initial pull if RWAS has already populated
    if (window.FNED_RWAS_ALERT_SUMMARY) {
      handleRwasUpdate(window.FNED_RWAS_ALERT_SUMMARY);
      processWatchedRwasItems(window.FNED_RWAS_ALERT_SUMMARY);
    }
    if (window.__FNED_MAP_POWER_OUTAGES_DATA) {
      processWatchedPowerOutages(window.__FNED_MAP_POWER_OUTAGES_DATA);
    }
    if (window.__FNED_MAP_METSERVICE_ALERTS_DATA) {
      processWatchedMetserviceLayer(window.__FNED_MAP_METSERVICE_ALERTS_DATA);
    }
    if (window.__FNED_MAP_CIVIL_DEFENCE_ALERTS_DATA) {
      processWatchedCivilDefenceLayer(window.__FNED_MAP_CIVIL_DEFENCE_ALERTS_DATA);
    }
    if (window.__FNED_MAP_WATER_OUTAGES_DATA) {
      processWatchedWaterOutages(window.__FNED_MAP_WATER_OUTAGES_DATA);
    }
    if (window.__FNED_MAP_NZTA_ROAD_EVENTS_DATA) {
      processWatchedNztaRoadClosures(window.__FNED_MAP_NZTA_ROAD_EVENTS_DATA);
    }
    if (window.__FNED_MAP_LOCAL_ROAD_CLOSURES_DATA) {
      processWatchedLocalRoadClosures(window.__FNED_MAP_LOCAL_ROAD_CLOSURES_DATA);
    }

    // Poll RWAS while open (optional)
    if (cfgBool(notificationsCfg.enabled, true) && cfgBool(notificationsCfg.autoRefreshWarnings, true)) {
      var interval = Math.max(15000, cfgNum(notificationsCfg.pollIntervalMs, 300000));
      setInterval(function () {
        if (typeof window.FNED_REGION_WARNINGS_RELOAD === "function") {
          window.FNED_REGION_WARNINGS_RELOAD();
        }
      }, interval);
    }

    // Poll custom messages
    if (cfgBool(messagesCfg.enabled, true)) {
      var msgInterval = Math.max(15000, cfgNum(messagesCfg.pollIntervalMs, 60000));
      loadCustomMessages();
      setInterval(loadCustomMessages, msgInterval);
    }

    maybeShowPermissionHint();

    syncNotificationCtaButton();

    debugLog("Ready", { version: VERSION, notificationsCfg: notificationsCfg, messagesCfg: messagesCfg });
  }

  // Public helpers for later UI integration
  window.FNED_NOTIFICATIONS_API = {
    version: VERSION,
    toast: function (opts) {
      showToast(opts);
    },
    getSupport: function () {
      return browserNotificationSupport();
    },
    getPermission: notificationPermission,
    requestPermission: function () {
      var support = browserNotificationSupport();
      if (!support.supported) {
        showToast({
          title: "Browser Notifications Unavailable",
          body: support.reason || "Browser notifications are unavailable. Toasts will still work.",
          meta: "FNED",
          level: "Warning"
        });
        syncNotificationCtaButton();
        return Promise.resolve("unsupported");
      }

      return requestNotificationPermission().then(function (perm) {
        showToast({
          title: "Notification Permission",
          body: "Permission is now: " + perm,
          meta: "FNED",
          level: perm === "granted" ? "Info" : "Warning"
        });
        syncNotificationCtaButton();
        return perm;
      });
    },
    enableFromCta: function () {
      return enableFromCta();
    },
    syncCtaButton: function () {
      syncNotificationCtaButton();
    },
    test: function () {
      showToast({
        title: "Test Toast",
        body: "This is a test notification from FNED.",
        meta: "Test",
        level: "Info"
      });

      var support = browserNotificationSupport();
      if (!support.supported) {
        showToast({
          title: "Browser Notifications Unavailable",
          body: support.reason || "Browser notifications are unavailable. Toasts will still work.",
          meta: "Test",
          level: "Warning"
        });
        return;
      }

      if (notificationPermission() === "granted") {
        showBrowserNotification({
          enabled: true,
          title: "FNED Test",
          body: "Browser notifications are working.",
          tag: "fned:test"
        });
      } else {
        showToast({
          title: "Browser Notification Not Enabled",
          body: "Use FNED_NOTIFICATIONS_API.requestPermission() then try again.",
          meta: "Test",
          level: "Warning"
        });
      }
    },
    reloadCustomMessages: function () {
      return loadCustomMessages();
    },
    getWatchConfig: function () {
      return shallowClone(watchCfg);
    },
    resolveDeviceWatchPoint: function () {
      return new Promise(function (resolve, reject) {
        if (!navigator || !navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== "function") {
          reject(new Error("Geolocation is not available on this device."));
          return;
        }
        navigator.geolocation.getCurrentPosition(function (pos) {
          var lat = pos && pos.coords ? Number(pos.coords.latitude) : NaN;
          var lng = pos && pos.coords ? Number(pos.coords.longitude) : NaN;
          if (!isFinite(lat) || !isFinite(lng)) {
            reject(new Error("Could not read device coordinates."));
            return;
          }
          watchCfg.point.lat = lat;
          watchCfg.point.lng = lng;
          resolve({ lat: lat, lng: lng });
        }, function (err) {
          reject(err || new Error("Location permission denied or unavailable."));
        }, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000
        });
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

