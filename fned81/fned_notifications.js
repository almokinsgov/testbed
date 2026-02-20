/*
  FNED Notifications and Custom Messages
  Version: 0.1.0

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

  var VERSION = "0.1.0";

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
    debugLog: false
  };

  var DEFAULT_CUSTOM_MESSAGES_CFG = {
    enabled: true,
    url: "./files/fned_custom_messages_example.json",
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
      setCtaButtonLabel(btn, "Toasts Only");
      btn.setAttribute("aria-disabled", "true");
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
      showToast({
        title: "Browser Notifications Unavailable",
        body: support.reason || "Browser notifications are unavailable. Toasts will still work.",
        meta: "FNED",
        level: "Warning"
      });
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
    var N = getNotificationCtor();
    if (!N) {
      return { supported: false, reason: "Notification API is not available on this device or browser." };
    }

    // Some environments define Notification but only allow it in secure contexts.
    if (!isSecureOriginForNotifications()) {
      return { supported: false, reason: "Browser notifications require HTTPS or localhost. Toasts will still work." };
    }

    // Some browsers can throw when accessing permission in restricted contexts.
    try {
      void N.permission;
    } catch (e3) {
      return { supported: false, reason: "Notification permission is unavailable in this environment. Toasts will still work." };
    }

    return { supported: true, reason: "OK" };
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
    if (!cfgBool(opts && opts.enabled, true)) {
      return;
    }

    // Guard hard against environments where Notification exists but is unusable
    if (!hasNotificationApi()) return;

    if (notificationPermission() !== "granted") {
      return;
    }

    var title = (opts && opts.title) ? String(opts.title) : "FNED Update";
    var body = (opts && opts.body) ? String(opts.body) : "";
    var tag = (opts && opts.tag) ? String(opts.tag) : "fned";
    var url = (opts && opts.url) ? String(opts.url) : "";

    try {
      var n = new window.Notification(title, {
        body: body,
        tag: tag,
        renotify: false
      });

      if (url) {
        n.onclick = function () {
          try {
            window.focus();
          } catch (e) {
            // ignore
          }
          try {
            window.open(url, "_blank", "noopener");
          } catch (e2) {
            // ignore
          }
          try {
            n.close();
          } catch (e3) {
            // ignore
          }
        };
      }
    } catch (e) {
      // ignore
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

  function ensureSummaryMessageHost() {
    if (!cfgBool(messagesCfg.renderInSummary, true)) return null;

    var blocksEl = document.getElementById("summary-custom-blocks");
    if (!blocksEl) return null;

    ensureNotificationStyles();

    var host = document.getElementById("fned-custom-messages");
    if (!host) {
      host = document.createElement("div");
      host.id = "fned-custom-messages";
      host.className = "fned-custom-messages";
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
      var card = document.createElement("div");
      card.className = "fned-message-card";

      var title = document.createElement("h4");
      title.textContent = msg.title || "Message";

      var body = document.createElement("p");
      body.textContent = msg.body || "";

      card.appendChild(title);
      if (msg.body) {
        card.appendChild(body);
      }

      if (msg.link) {
        var a = document.createElement("a");
        a.href = msg.link;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = msg.linkLabel || "More Information";
        card.appendChild(a);
      }

      host.appendChild(card);
    });
  }

  function notifyCustomMessages(messages) {
    if (!messages || !messages.length) return;

    messages.forEach(function (msg) {
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
      var now = new Date();

      var activeMessages = rawMessages.filter(function (msg) {
        return isMessageActive(msg, now);
      });

      var summaryMessages = activeMessages.filter(function (msg) {
        var ch = messageChannels(msg);
        return ch.indexOf("summary") >= 0 || ch.indexOf("content") >= 0 || ch.indexOf("banner") >= 0;
      });

      renderCustomMessages(summaryMessages);
      notifyCustomMessages(activeMessages);

      debugLog("Custom messages loaded", { total: rawMessages.length, active: activeMessages.length });
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
      handleRwasUpdate(ev && ev.detail ? ev.detail : window.FNED_RWAS_ALERT_SUMMARY);
    });

    // Initial pull if RWAS has already populated
    if (window.FNED_RWAS_ALERT_SUMMARY) {
      handleRwasUpdate(window.FNED_RWAS_ALERT_SUMMARY);
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
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
