/*
  FNED PWA Helper
  Version: 0.1.0

  Goals
  - Register service worker for PWA install and caching
  - Provide a small API for install status and install guidance

  Notes
  - iPhone and iPad install requires Safari then Add to Home Screen.
  - Notifications while the app is open remain handled by fned_notifications.js.
*/

(function () {
  "use strict";

  var VERSION = "0.1.0";
  var deferredPrompt = null;

  function isIOSDevice() {
    try {
      var ua = (navigator && navigator.userAgent) ? navigator.userAgent : "";
      var platform = (navigator && navigator.platform) ? navigator.platform : "";
      var isIOS = /iPad|iPhone|iPod/.test(ua);
      var isIPadOS = platform === "MacIntel" && navigator && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
      return isIOS || isIPadOS;
    } catch (e) {
      return false;
    }
  }

  function isStandaloneMode() {
    try {
      if (typeof navigator !== "undefined" && navigator && navigator.standalone) return true;
    } catch (e) {
      // ignore
    }

    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (e2) {
      // ignore
    }

    return false;
  }

  function hasServiceWorker() {
    try {
      return !!(navigator && navigator.serviceWorker);
    } catch (e) {
      return false;
    }
  }

  function toast(opts) {
    try {
      if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.toast === "function") {
        window.FNED_NOTIFICATIONS_API.toast(opts);
        return;
      }
    } catch (e) {
      // ignore
    }

    // Fallback: basic alert
    try {
      if (opts && (opts.title || opts.body)) {
        alert((opts.title ? opts.title + "\n\n" : "") + (opts.body || ""));
      }
    } catch (e2) {
      // ignore
    }
  }

  function injectStyles() {
    if (document.getElementById("fned-pwa-style")) return;
    var style = document.createElement("style");
    style.id = "fned-pwa-style";
    style.textContent = "\n" +
      ".fned-pwa-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;}\n" +
      ".fned-pwa-modal{max-width:520px;width:100%;background:#ffffff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.25);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}\n" +
      ".fned-pwa-modal header{padding:14px 16px;background:#0b5296;color:#fff;font-weight:700;}\n" +
      ".fned-pwa-modal .body{padding:14px 16px;color:#111;}\n" +
      ".fned-pwa-modal ol{margin:10px 0 0 18px;}\n" +
      ".fned-pwa-modal li{margin:6px 0;}\n" +
      ".fned-pwa-modal .actions{display:flex;gap:10px;justify-content:flex-end;padding:12px 16px;background:#f3f6fb;}\n" +
      ".fned-pwa-btn{appearance:none;border:0;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer;}\n" +
      ".fned-pwa-btn.primary{background:#0b5296;color:#fff;}\n" +
      ".fned-pwa-btn.secondary{background:#e6eef9;color:#0b5296;}\n";
    document.head.appendChild(style);
  }

  function closeModal() {
    var el = document.getElementById("fned-pwa-install-help");
    if (el) el.remove();
  }

  function showInstallHelp() {
    injectStyles();

    if (document.getElementById("fned-pwa-install-help")) return;

    var backdrop = document.createElement("div");
    backdrop.id = "fned-pwa-install-help";
    backdrop.className = "fned-pwa-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });

    var modal = document.createElement("div");
    modal.className = "fned-pwa-modal";

    var header = document.createElement("header");
    header.textContent = "Install FNED On iPhone";

    var body = document.createElement("div");
    body.className = "body";

    var p = document.createElement("p");
    p.textContent = "To enable iPhone notifications, install the dashboard to your Home Screen.";

    var ol = document.createElement("ol");

    var steps = [
      "Open this dashboard in Safari",
      "Tap the Share button",
      "Choose Add to Home Screen",
      "Open FNED from the Home Screen icon",
      "Tap Receive Notifications and allow permission"
    ];

    steps.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      ol.appendChild(li);
    });

    body.appendChild(p);
    body.appendChild(ol);

    var actions = document.createElement("div");
    actions.className = "actions";

    var btnClose = document.createElement("button");
    btnClose.className = "fned-pwa-btn secondary";
    btnClose.type = "button";
    btnClose.textContent = "Close";
    btnClose.addEventListener("click", closeModal);

    actions.appendChild(btnClose);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  }

  function canPromptInstall() {
    return !!deferredPrompt;
  }

  function promptInstall() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        return deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
        });
      } catch (e) {
        deferredPrompt = null;
        return Promise.resolve();
      }
    }

    if (isIOSDevice() && !isStandaloneMode()) {
      showInstallHelp();
      return Promise.resolve();
    }

    toast({
      title: "Install",
      body: "Install is not available in this browser. If you are on iPhone, use Safari then Add to Home Screen.",
      meta: "FNED",
      level: "Info"
    });

    return Promise.resolve();
  }

  function getStatus() {
    return {
      version: VERSION,
      isIOS: isIOSDevice(),
      isStandalone: isStandaloneMode(),
      canPrompt: canPromptInstall(),
      hasServiceWorker: hasServiceWorker(),
      isSecureContext: (typeof window.isSecureContext === "boolean") ? window.isSecureContext : null
    };
  }

  function registerServiceWorker() {
    if (!hasServiceWorker()) return Promise.resolve(null);

    return navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).then(function (reg) {
      // Update messaging
      if (reg && reg.waiting) {
        toast({
          title: "Update Available",
          body: "A new version is ready. Refresh to apply.",
          meta: "FNED",
          level: "Info"
        });
      }

      reg.addEventListener("updatefound", function () {
        var sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", function () {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            toast({
              title: "Update Available",
              body: "A new version is ready. Refresh to apply.",
              meta: "FNED",
              level: "Info"
            });
          }
        });
      });

      return reg;
    }).catch(function (err) {
      toast({
        title: "PWA",
        body: "Service worker registration failed. " + (err && err.message ? err.message : ""),
        meta: "FNED",
        level: "Warning"
      });
      return null;
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    try {
      e.preventDefault();
      deferredPrompt = e;
      toast({
        title: "Install Available",
        body: "You can install FNED for faster access.",
        meta: "FNED",
        level: "Info"
      });
    } catch (err) {
      // ignore
    }
  });

  window.FNED_PWA_API = {
    version: VERSION,
    getStatus: getStatus,
    isIOSDevice: isIOSDevice,
    isStandaloneMode: isStandaloneMode,
    canPromptInstall: canPromptInstall,
    promptInstall: promptInstall,
    showInstallHelp: showInstallHelp,
    registerServiceWorker: registerServiceWorker
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      registerServiceWorker();
    });
  } else {
    registerServiceWorker();
  }
})();
