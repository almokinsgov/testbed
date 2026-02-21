(function () {
  "use strict";

  var DEFAULT_MODULES = [
    { id: "header", label: "Header" },
    { id: "hero", label: "Hero" },
    { id: "ctaRow", label: "Action Buttons" },
    { id: "situation", label: "Map And Alerts" },
    { id: "summary", label: "Content Panel" },
    { id: "stats", label: "Status Cards" },
    { id: "tiles", label: "Information Tiles" },
    { id: "social", label: "Social Updates" },
    { id: "footer", label: "Footer" }
  ];

  function deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_err) {
      return {};
    }
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asString(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }
    var trimmed = value.trim();
    return trimmed ? trimmed : fallback;
  }

  function asBoolean(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function asNumber(value, fallback) {
    return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  }

  function clampInt(value, min, max, fallback) {
    var num = parseInt(value, 10);
    if (Number.isNaN(num)) {
      return fallback;
    }
    if (typeof min === "number" && num < min) {
      return min;
    }
    if (typeof max === "number" && num > max) {
      return max;
    }
    return num;
  }

  function ensureLayoutModules(data) {
    var modules = asArray(data.layout.modules);
    var byId = Object.create(null);
    var normalised = [];

    modules.forEach(function (module) {
      if (!module || typeof module !== "object") {
        return;
      }
      var id = asString(module.id, "");
      if (!id || byId[id]) {
        return;
      }
      byId[id] = true;
      normalised.push({
        id: id,
        label: asString(module.label, id),
        enabled: asBoolean(module.enabled, true),
        submodules: asArray(module.submodules).map(function (submodule) {
          if (!submodule || typeof submodule !== "object") {
            return null;
          }
          var subId = asString(submodule.id, "");
          if (!subId) {
            return null;
          }
          return {
            id: subId,
            label: asString(submodule.label, subId),
            enabled: asBoolean(submodule.enabled, true)
          };
        }).filter(Boolean)
      });
    });

    DEFAULT_MODULES.forEach(function (required) {
      if (byId[required.id]) {
        return;
      }
      var entry = {
        id: required.id,
        label: required.label,
        enabled: true
      };
      if (required.id === "situation") {
        entry.submodules = [
          { id: "mapPanel", label: "Map Panel", enabled: true },
          { id: "alertsPanel", label: "Alerts Panel", enabled: true }
        ];
      }
      normalised.push(entry);
      byId[required.id] = true;
    });

    data.layout.modules = normalised;
  }

  function normaliseOverlays(overlays) {
    var list = asArray(overlays)
      .map(function (name) {
        return asString(name, "");
      })
      .filter(Boolean);

    if (!list.length) {
      return null;
    }

    var seen = Object.create(null);
    return list.filter(function (name) {
      if (seen[name]) {
        return false;
      }
      seen[name] = true;
      return true;
    });
  }

  function ensureConfigShape(raw) {
    var data = deepClone(raw && typeof raw === "object" ? raw : {});

    data.meta = asObject(data.meta);
    data.brand = asObject(data.brand);
    data.hero = asObject(data.hero);
    data.summaryPanel = asObject(data.summaryPanel);
    data.statsSection = asObject(data.statsSection);
    data.tilesSection = asObject(data.tilesSection);
    data.socialFeedsSection = asObject(data.socialFeedsSection);
    data.footer = asObject(data.footer);

    data.layout = asObject(data.layout);
    data.layout.edit = asObject(data.layout.edit);
    data.layout.edit.enabled = asBoolean(data.layout.edit.enabled, true);
    data.layout.edit.showButton = asBoolean(data.layout.edit.showButton, true);
    data.layout.edit.storageKey = asString(
      data.layout.edit.storageKey,
      "fned_dashboard_override_v1"
    );
    data.layout.edit.requireQueryParam = asBoolean(
      data.layout.edit.requireQueryParam,
      false
    );
    data.layout.edit.queryParam = asString(data.layout.edit.queryParam, "edit");

    ensureLayoutModules(data);

    data.ctaButtons = asArray(data.ctaButtons);

    data.runtimeConfig = asObject(data.runtimeConfig);
    data.runtimeConfig.map = asObject(data.runtimeConfig.map);
    data.runtimeConfig.summary = asObject(data.runtimeConfig.summary);
    data.runtimeConfig.stats = asObject(data.runtimeConfig.stats);
    data.runtimeConfig.regionWarnings = asObject(data.runtimeConfig.regionWarnings);

    // Notifications and custom message settings (used by fned_notifications.js)
    data.runtimeConfig.notifications = asObject(data.runtimeConfig.notifications);
    data.runtimeConfig.customMessages = asObject(data.runtimeConfig.customMessages);

    // Defaults: warnings notifications
    if (typeof data.runtimeConfig.notifications.enabled !== "boolean") {
      data.runtimeConfig.notifications.enabled = true;
    }
    if (typeof data.runtimeConfig.notifications.autoRefreshWarnings !== "boolean") {
      data.runtimeConfig.notifications.autoRefreshWarnings = true;
    }
    data.runtimeConfig.notifications.pollIntervalMs = clampInt(
      data.runtimeConfig.notifications.pollIntervalMs,
      15000,
      3600000,
      300000
    );
    if (!data.runtimeConfig.notifications.notifySources || typeof data.runtimeConfig.notifications.notifySources !== "object") {
      data.runtimeConfig.notifications.notifySources = { metservice: true, civilDefence: true };
    }
    if (typeof data.runtimeConfig.notifications.notifySources.metservice !== "boolean") {
      data.runtimeConfig.notifications.notifySources.metservice = true;
    }
    if (typeof data.runtimeConfig.notifications.notifySources.civilDefence !== "boolean") {
      data.runtimeConfig.notifications.notifySources.civilDefence = true;
    }
    if (typeof data.runtimeConfig.notifications.notifyUpcoming !== "boolean") {
      data.runtimeConfig.notifications.notifyUpcoming = false;
    }
    if (typeof data.runtimeConfig.notifications.notifyExpired !== "boolean") {
      data.runtimeConfig.notifications.notifyExpired = false;
    }
    data.runtimeConfig.notifications.dedupeWindowHours = clampInt(
      data.runtimeConfig.notifications.dedupeWindowHours,
      1,
      168,
      12
    );
    if (typeof data.runtimeConfig.notifications.useBrowserNotifications !== "boolean") {
      data.runtimeConfig.notifications.useBrowserNotifications = true;
    }
    if (typeof data.runtimeConfig.notifications.useToasts !== "boolean") {
      data.runtimeConfig.notifications.useToasts = true;
    }
    data.runtimeConfig.notifications.toastDurationMs = clampInt(
      data.runtimeConfig.notifications.toastDurationMs,
      1000,
      60000,
      9000
    );
    if (typeof data.runtimeConfig.notifications.debugLog !== "boolean") {
      data.runtimeConfig.notifications.debugLog = false;
    }

    // Defaults: custom message polling
    if (typeof data.runtimeConfig.customMessages.enabled !== "boolean") {
      data.runtimeConfig.customMessages.enabled = true;
    }
    data.runtimeConfig.customMessages.url = asString(
      data.runtimeConfig.customMessages.url,
      "./files/fned_custom_messages_example.json"
    );
    data.runtimeConfig.customMessages.pollIntervalMs = clampInt(
      data.runtimeConfig.customMessages.pollIntervalMs,
      15000,
      3600000,
      60000
    );
    if (typeof data.runtimeConfig.customMessages.renderInSummary !== "boolean") {
      data.runtimeConfig.customMessages.renderInSummary = true;
    }
    if (typeof data.runtimeConfig.customMessages.useBrowserNotifications !== "boolean") {
      data.runtimeConfig.customMessages.useBrowserNotifications = true;
    }
    if (typeof data.runtimeConfig.customMessages.useToasts !== "boolean") {
      data.runtimeConfig.customMessages.useToasts = true;
    }
    data.runtimeConfig.customMessages.dedupeWindowHours = clampInt(
      data.runtimeConfig.customMessages.dedupeWindowHours,
      1,
      168,
      12
    );
    if (typeof data.runtimeConfig.customMessages.debugLog !== "boolean") {
      data.runtimeConfig.customMessages.debugLog = false;
    }

    // Ensure the bell CTA exists and is wired to notification permission.
    (function ensureNotificationCtaButton() {
      var ctas = Array.isArray(data.ctaButtons) ? data.ctaButtons : (data.ctaButtons = []);

      function isNotificationAction(btn) {
        return !!(btn && typeof btn.action === "string" && btn.action.toLowerCase().indexOf("notifications") === 0);
      }

      function isLegacySignUp(btn) {
        if (!btn || typeof btn !== "object") return false;
        var label = (typeof btn.label === "string") ? btn.label.toLowerCase() : "";
        var icon = (typeof btn.icon === "string") ? btn.icon : "";
        var url = (typeof btn.url === "string") ? btn.url.toLowerCase() : "";
        var looksLikeOldLabel = label.indexOf("sign up") >= 0 && label.indexOf("civil") >= 0 && label.indexOf("alert") >= 0;
        var looksLikeBell = icon.indexOf("🔔") >= 0;
        var looksLikeOldUrl = url.indexOf("civil") >= 0 && url.indexOf("alert") >= 0;
        return looksLikeOldLabel || (looksLikeBell && (label.indexOf("civil") >= 0 || looksLikeOldUrl));
      }

      function setToNotifications(btn) {
        if (!btn || typeof btn !== "object") return;
        btn.label = "Receive Notifications";
        btn.icon = (typeof btn.icon === "string" && btn.icon.trim()) ? btn.icon : "🔔";
        btn.url = "#";
        btn.style = (btn.style === "secondary") ? "secondary" : "primary";
        btn.external = false;
        btn.action = "notifications:enable";
      }

      var hasNotifications = ctas.some(function (btn) {
        return btn && typeof btn.action === "string" && btn.action === "notifications:enable";
      });

      if (!hasNotifications) {
        var legacy = ctas.find(function (btn) { return isLegacySignUp(btn) && !isNotificationAction(btn); });
        if (legacy) {
          setToNotifications(legacy);
        } else {
          ctas.unshift({
            label: "Receive Notifications",
            icon: "🔔",
            url: "#",
            style: "primary",
            external: false,
            action: "notifications:enable"
          });
        }
      } else {
        // If a saved config still has the old sign up CTA, convert it to avoid confusion.
        ctas.forEach(function (btn) {
          if (isLegacySignUp(btn) && !isNotificationAction(btn)) {
            setToNotifications(btn);
          }
        });
      }

      data.ctaButtons = ctas;
    })();

    data.runtimeConfig.map.layersControlCollapsed = asBoolean(
      data.runtimeConfig.map.layersControlCollapsed,
      true
    );
    data.runtimeConfig.map.enabledOverlays = normaliseOverlays(
      data.runtimeConfig.map.enabledOverlays
    );
    data.runtimeConfig.map.powerOutageStatusFilter = asArray(
      data.runtimeConfig.map.powerOutageStatusFilter
    ).map(function (name) {
      return asString(name, "");
    }).filter(Boolean);
    if (!data.runtimeConfig.map.powerOutageStatusFilter.length) {
      data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
    }
    data.runtimeConfig.map.waterOutageStatusFilter = asArray(
      data.runtimeConfig.map.waterOutageStatusFilter
    ).map(function (name) {
      return asString(name, "");
    }).filter(Boolean);
    if (!data.runtimeConfig.map.waterOutageStatusFilter.length) {
      data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored"];
    }
    data.runtimeConfig.map.symbolSize = clampInt(
      data.runtimeConfig.map.symbolSize,
      14,
      96,
      44
    );
    data.runtimeConfig.map.symbolFontSize = clampInt(
      data.runtimeConfig.map.symbolFontSize,
      8,
      48,
      22
    );
    data.runtimeConfig.map.symbolBorderWidth = clampInt(
      data.runtimeConfig.map.symbolBorderWidth,
      1,
      10,
      2
    );
    data.runtimeConfig.map.clusterSymbolSize = clampInt(
      data.runtimeConfig.map.clusterSymbolSize,
      14,
      96,
      44
    );
    data.runtimeConfig.map.clusterSymbolFontSize = clampInt(
      data.runtimeConfig.map.clusterSymbolFontSize,
      8,
      48,
      22
    );
    data.runtimeConfig.map.maraeClusterEnabled = asBoolean(
      data.runtimeConfig.map.maraeClusterEnabled,
      true
    );
    data.runtimeConfig.map.maraeClusterBaseRadiusMeters = clampInt(
      data.runtimeConfig.map.maraeClusterBaseRadiusMeters,
      50,
      50000,
      2200
    );
    data.runtimeConfig.map.maraeClusterMaxRadiusMeters = clampInt(
      data.runtimeConfig.map.maraeClusterMaxRadiusMeters,
      200,
      200000,
      60000
    );
    data.runtimeConfig.map.maraeClusterBaseZoom = clampInt(
      data.runtimeConfig.map.maraeClusterBaseZoom,
      1,
      22,
      8
    );
    data.runtimeConfig.map.maraeClusterZoomStepMultiplier = asNumber(
      data.runtimeConfig.map.maraeClusterZoomStepMultiplier,
      1.7
    );
    if (data.runtimeConfig.map.maraeClusterZoomStepMultiplier < 1) {
      data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 1;
    }
    if (data.runtimeConfig.map.maraeClusterZoomStepMultiplier > 4) {
      data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 4;
    }
    data.runtimeConfig.map.maraeClusterViewportWidthFactor = asNumber(
      data.runtimeConfig.map.maraeClusterViewportWidthFactor,
      0.12
    );
    if (data.runtimeConfig.map.maraeClusterViewportWidthFactor < 0) {
      data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0;
    }
    if (data.runtimeConfig.map.maraeClusterViewportWidthFactor > 0.5) {
      data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0.5;
    }
    data.runtimeConfig.map.maraeClusterMinCount = clampInt(
      data.runtimeConfig.map.maraeClusterMinCount,
      1,
      20,
      2
    );
    data.runtimeConfig.map.powerClusterEnabled = asBoolean(
      data.runtimeConfig.map.powerClusterEnabled,
      true
    );
    data.runtimeConfig.map.powerClusterBaseRadiusMeters = clampInt(
      data.runtimeConfig.map.powerClusterBaseRadiusMeters,
      50,
      50000,
      420
    );
    data.runtimeConfig.map.powerClusterMaxRadiusMeters = clampInt(
      data.runtimeConfig.map.powerClusterMaxRadiusMeters,
      200,
      100000,
      18000
    );
    data.runtimeConfig.map.powerClusterBaseZoom = clampInt(
      data.runtimeConfig.map.powerClusterBaseZoom,
      1,
      22,
      8
    );
    data.runtimeConfig.map.powerClusterZoomStepMultiplier = asNumber(
      data.runtimeConfig.map.powerClusterZoomStepMultiplier,
      1.55
    );
    if (data.runtimeConfig.map.powerClusterZoomStepMultiplier < 1) {
      data.runtimeConfig.map.powerClusterZoomStepMultiplier = 1;
    }
    if (data.runtimeConfig.map.powerClusterZoomStepMultiplier > 4) {
      data.runtimeConfig.map.powerClusterZoomStepMultiplier = 4;
    }
    data.runtimeConfig.map.powerClusterViewportWidthFactor = asNumber(
      data.runtimeConfig.map.powerClusterViewportWidthFactor,
      0.08
    );
    if (data.runtimeConfig.map.powerClusterViewportWidthFactor < 0) {
      data.runtimeConfig.map.powerClusterViewportWidthFactor = 0;
    }
    if (data.runtimeConfig.map.powerClusterViewportWidthFactor > 0.5) {
      data.runtimeConfig.map.powerClusterViewportWidthFactor = 0.5;
    }
    data.runtimeConfig.map.powerClusterMinCount = clampInt(
      data.runtimeConfig.map.powerClusterMinCount,
      1,
      20,
      2
    );
    data.runtimeConfig.map.waterClusterEnabled = asBoolean(
      data.runtimeConfig.map.waterClusterEnabled,
      true
    );
    data.runtimeConfig.map.waterClusterBaseRadiusMeters = clampInt(
      data.runtimeConfig.map.waterClusterBaseRadiusMeters,
      50,
      50000,
      420
    );
    data.runtimeConfig.map.waterClusterMaxRadiusMeters = clampInt(
      data.runtimeConfig.map.waterClusterMaxRadiusMeters,
      200,
      100000,
      18000
    );
    data.runtimeConfig.map.waterClusterBaseZoom = clampInt(
      data.runtimeConfig.map.waterClusterBaseZoom,
      1,
      22,
      8
    );
    data.runtimeConfig.map.waterClusterZoomStepMultiplier = asNumber(
      data.runtimeConfig.map.waterClusterZoomStepMultiplier,
      1.55
    );
    if (data.runtimeConfig.map.waterClusterZoomStepMultiplier < 1) {
      data.runtimeConfig.map.waterClusterZoomStepMultiplier = 1;
    }
    if (data.runtimeConfig.map.waterClusterZoomStepMultiplier > 4) {
      data.runtimeConfig.map.waterClusterZoomStepMultiplier = 4;
    }
    data.runtimeConfig.map.waterClusterViewportWidthFactor = asNumber(
      data.runtimeConfig.map.waterClusterViewportWidthFactor,
      0.08
    );
    if (data.runtimeConfig.map.waterClusterViewportWidthFactor < 0) {
      data.runtimeConfig.map.waterClusterViewportWidthFactor = 0;
    }
    if (data.runtimeConfig.map.waterClusterViewportWidthFactor > 0.5) {
      data.runtimeConfig.map.waterClusterViewportWidthFactor = 0.5;
    }
    data.runtimeConfig.map.waterClusterMinCount = clampInt(
      data.runtimeConfig.map.waterClusterMinCount,
      1,
      20,
      2
    );
    data.runtimeConfig.map.nztaClusterEnabled = asBoolean(
      data.runtimeConfig.map.nztaClusterEnabled,
      true
    );
    data.runtimeConfig.map.nztaClusterBaseRadiusMeters = clampInt(
      data.runtimeConfig.map.nztaClusterBaseRadiusMeters,
      50,
      50000,
      450
    );
    data.runtimeConfig.map.nztaClusterMaxRadiusMeters = clampInt(
      data.runtimeConfig.map.nztaClusterMaxRadiusMeters,
      200,
      100000,
      22000
    );
    data.runtimeConfig.map.nztaClusterBaseZoom = clampInt(
      data.runtimeConfig.map.nztaClusterBaseZoom,
      1,
      22,
      8
    );
    data.runtimeConfig.map.nztaClusterZoomStepMultiplier = asNumber(
      data.runtimeConfig.map.nztaClusterZoomStepMultiplier,
      1.55
    );
    if (data.runtimeConfig.map.nztaClusterZoomStepMultiplier < 1) {
      data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 1;
    }
    if (data.runtimeConfig.map.nztaClusterZoomStepMultiplier > 4) {
      data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 4;
    }
    data.runtimeConfig.map.nztaClusterViewportWidthFactor = asNumber(
      data.runtimeConfig.map.nztaClusterViewportWidthFactor,
      0.09
    );
    if (data.runtimeConfig.map.nztaClusterViewportWidthFactor < 0) {
      data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0;
    }
    if (data.runtimeConfig.map.nztaClusterViewportWidthFactor > 0.5) {
      data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0.5;
    }
    data.runtimeConfig.map.nztaClusterMinCount = clampInt(
      data.runtimeConfig.map.nztaClusterMinCount,
      1,
      20,
      2
    );
    data.runtimeConfig.map.localRoadClusterEnabled = asBoolean(
      data.runtimeConfig.map.localRoadClusterEnabled,
      true
    );
    data.runtimeConfig.map.localRoadClusterBaseRadiusMeters = clampInt(
      data.runtimeConfig.map.localRoadClusterBaseRadiusMeters,
      50,
      50000,
      400
    );
    data.runtimeConfig.map.localRoadClusterMaxRadiusMeters = clampInt(
      data.runtimeConfig.map.localRoadClusterMaxRadiusMeters,
      200,
      100000,
      20000
    );
    data.runtimeConfig.map.localRoadClusterBaseZoom = clampInt(
      data.runtimeConfig.map.localRoadClusterBaseZoom,
      1,
      22,
      8
    );
    data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = asNumber(
      data.runtimeConfig.map.localRoadClusterZoomStepMultiplier,
      1.55
    );
    if (data.runtimeConfig.map.localRoadClusterZoomStepMultiplier < 1) {
      data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 1;
    }
    if (data.runtimeConfig.map.localRoadClusterZoomStepMultiplier > 4) {
      data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 4;
    }
    data.runtimeConfig.map.localRoadClusterViewportWidthFactor = asNumber(
      data.runtimeConfig.map.localRoadClusterViewportWidthFactor,
      0.08
    );
    if (data.runtimeConfig.map.localRoadClusterViewportWidthFactor < 0) {
      data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0;
    }
    if (data.runtimeConfig.map.localRoadClusterViewportWidthFactor > 0.5) {
      data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0.5;
    }
    data.runtimeConfig.map.localRoadClusterMinCount = clampInt(
      data.runtimeConfig.map.localRoadClusterMinCount,
      1,
      20,
      2
    );

    data.runtimeConfig.summary.includeEmergencyBanners = asBoolean(
      data.runtimeConfig.summary.includeEmergencyBanners,
      true
    );
    data.runtimeConfig.stats.enableLiveCounts = asBoolean(
      data.runtimeConfig.stats.enableLiveCounts,
      true
    );
    data.runtimeConfig.stats.autoRefreshEnabled = asBoolean(
      data.runtimeConfig.stats.autoRefreshEnabled,
      false
    );
    data.runtimeConfig.stats.refreshIntervalMs = clampInt(
      data.runtimeConfig.stats.refreshIntervalMs,
      15000,
      600000,
      120000
    );
    data.runtimeConfig.stats.showConnectionStatus = asBoolean(
      data.runtimeConfig.stats.showConnectionStatus,
      true
    );
    data.runtimeConfig.stats.showLastUpdated = asBoolean(
      data.runtimeConfig.stats.showLastUpdated,
      true
    );
    data.runtimeConfig.stats.liveCountSources = asObject(data.runtimeConfig.stats.liveCountSources);
    data.runtimeConfig.stats.liveCountSources.fndcAlerts = asBoolean(
      data.runtimeConfig.stats.liveCountSources.fndcAlerts,
      true
    );
    data.runtimeConfig.stats.liveCountSources.emergencyNews = asBoolean(
      data.runtimeConfig.stats.liveCountSources.emergencyNews,
      true
    );
    data.runtimeConfig.stats.liveCountSources.waterOutages = asBoolean(
      data.runtimeConfig.stats.liveCountSources.waterOutages,
      true
    );
    data.runtimeConfig.stats.liveCountSources.powerOutages = asBoolean(
      data.runtimeConfig.stats.liveCountSources.powerOutages,
      true
    );
    data.runtimeConfig.stats.liveCountSources.nztaRoadClosures = asBoolean(
      data.runtimeConfig.stats.liveCountSources.nztaRoadClosures,
      true
    );
    data.runtimeConfig.stats.liveCountSources.localRoadClosures = asBoolean(
      data.runtimeConfig.stats.liveCountSources.localRoadClosures,
      true
    );
    data.runtimeConfig.stats.waterOutageStatusFilter = asArray(
      data.runtimeConfig.stats.waterOutageStatusFilter
    ).map(function (name) {
      return asString(name, "");
    }).filter(Boolean);
    data.runtimeConfig.stats.waterOutageTypeFilter = asArray(
      data.runtimeConfig.stats.waterOutageTypeFilter
    ).map(function (name) {
      return asString(name, "");
    }).filter(Boolean);
    data.runtimeConfig.stats.powerOutageStatusFilter = asArray(
      data.runtimeConfig.stats.powerOutageStatusFilter
    ).map(function (name) {
      return asString(name, "");
    }).filter(Boolean);

    data.runtimeConfig.regionWarnings.showExpiredAlerts = asBoolean(
      data.runtimeConfig.regionWarnings.showExpiredAlerts,
      false
    );
    data.runtimeConfig.regionWarnings.showNonFarNorthAlerts = asBoolean(
      data.runtimeConfig.regionWarnings.showNonFarNorthAlerts,
      false
    );
    data.runtimeConfig.regionWarnings.requireOnsetWithinWindow = asBoolean(
      data.runtimeConfig.regionWarnings.requireOnsetWithinWindow,
      true
    );
    data.runtimeConfig.regionWarnings.hourWindow = clampInt(
      data.runtimeConfig.regionWarnings.hourWindow,
      1,
      168,
      24
    );

    data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts = asBoolean(
      data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts,
      true
    );
    data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts = asBoolean(
      data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts,
      false
    );
    data.runtimeConfig.regionWarnings.civilDefenceAtomUrl = asString(
      data.runtimeConfig.regionWarnings.civilDefenceAtomUrl,
      "https://www.civildefence.govt.nz/home/rss"
    );
    data.runtimeConfig.regionWarnings.metServiceSourceUrl = asString(
      data.runtimeConfig.regionWarnings.metServiceSourceUrl,
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml"
    );

    return data;
  }

  function validateDashboardConfig(raw) {
    var data = raw && typeof raw === "object" ? raw : {};
    var errors = [];
    var warnings = [];

    if (!data.layout || typeof data.layout !== "object") {
      errors.push("layout is required.");
    }

    var modules = data.layout && Array.isArray(data.layout.modules)
      ? data.layout.modules
      : null;

    if (!modules) {
      errors.push("layout.modules must be an array.");
    } else {
      var seen = Object.create(null);
      modules.forEach(function (module, index) {
        if (!module || typeof module !== "object") {
          errors.push("layout.modules[" + index + "] must be an object.");
          return;
        }

        var id = asString(module.id, "");
        if (!id) {
          errors.push("layout.modules[" + index + "] is missing id.");
          return;
        }

        if (seen[id]) {
          errors.push("layout.modules has duplicate id '" + id + "'.");
        }
        seen[id] = true;
      });
    }

    var editCfg = data.layout && data.layout.edit ? data.layout.edit : {};
    if (editCfg.requireQueryParam && !asString(editCfg.queryParam, "")) {
      errors.push("layout.edit.queryParam is required when requireQueryParam is true.");
    }

    var storageKey = asString(editCfg.storageKey, "");
    if (!storageKey) {
      warnings.push("layout.edit.storageKey is empty. Default key will be used.");
    }

    var rw = data.runtimeConfig && data.runtimeConfig.regionWarnings
      ? data.runtimeConfig.regionWarnings
      : {};
    var hourWindow = asNumber(rw.hourWindow, NaN);
    if (!Number.isFinite(hourWindow)) {
      errors.push("runtimeConfig.regionWarnings.hourWindow must be a number.");
    } else if (hourWindow < 1 || hourWindow > 168) {
      warnings.push("runtimeConfig.regionWarnings.hourWindow should be between 1 and 168.");
    }

    var statsCfg = data.runtimeConfig && data.runtimeConfig.stats
      ? data.runtimeConfig.stats
      : {};
    var refreshIntervalMs = asNumber(statsCfg.refreshIntervalMs, NaN);
    if (!Number.isFinite(refreshIntervalMs)) {
      errors.push("runtimeConfig.stats.refreshIntervalMs must be a number.");
    } else if (refreshIntervalMs < 15000 || refreshIntervalMs > 600000) {
      warnings.push("runtimeConfig.stats.refreshIntervalMs should be between 15000 and 600000.");
    }

    var ctaButtons = asArray(data.ctaButtons);
    ctaButtons.forEach(function (btn, index) {
      if (!btn || typeof btn !== "object") {
        warnings.push("ctaButtons[" + index + "] should be an object.");
        return;
      }
      if (!asString(btn.label, "")) {
        warnings.push("ctaButtons[" + index + "] is missing label.");
      }
      var action = asString(btn.action, "");
      var isNotifications = action && action.toLowerCase().indexOf("notifications") === 0;
      if (!isNotifications && !asString(btn.url, "")) {
        warnings.push("ctaButtons[" + index + "] is missing url.");
      }
    });

    return {
      errors: errors,
      warnings: warnings
    };
  }

  function sanitizeDashboardConfig(raw) {
    var data = ensureConfigShape(raw);
    var validation = validateDashboardConfig(data);
    return {
      data: data,
      validation: validation
    };
  }

  function formatValidationSummary(result) {
    var errors = (result && Array.isArray(result.errors)) ? result.errors : [];
    var warnings = (result && Array.isArray(result.warnings)) ? result.warnings : [];

    if (!errors.length && !warnings.length) {
      return "Validation passed with no issues.";
    }

    if (errors.length) {
      return "Validation failed with " + errors.length + " error(s): " + errors[0];
    }

    return "Validation passed with " + warnings.length + " warning(s): " + warnings[0];
  }

  window.FNED_EDITOR_CONFIG_UTILS = {
    ensureConfigShape: ensureConfigShape,
    validateDashboardConfig: validateDashboardConfig,
    sanitizeDashboardConfig: sanitizeDashboardConfig,
    formatValidationSummary: formatValidationSummary
  };
})();
