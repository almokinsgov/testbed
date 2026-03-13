/* FNED Module Editor
   Edits the dashboard JSON configuration stored in localStorage and reloads to apply.
*/
(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ensureLayout(data) {
    if (!data.layout) data.layout = {};
    if (!data.layout.edit) data.layout.edit = { enabled: true, storageKey: "fned_dashboard_override_v1" };
    if (typeof data.layout.edit.showButton !== "boolean") data.layout.edit.showButton = false;
    if (!isFinite(Number(data.layout.edit.unlockTapCount))) data.layout.edit.unlockTapCount = 10;
    if (!isFinite(Number(data.layout.edit.unlockWindowMs))) data.layout.edit.unlockWindowMs = 10000;
    if (!Array.isArray(data.layout.modules)) data.layout.modules = [];
    return data;
  }

  var EditorConfigUtils = window.FNED_EDITOR_CONFIG_UTILS || null;
  var ON_EDITOR_DATA_CHANGED = function () {};

  var KNOWN_OVERLAY_NAMES = [
    "MetService Weather Warnings",
    "Civil Defence Alerts",
    "Council alerts",
    "Tsunami Evacuation Zones",
    "Power Outages",
    "Water Outages",
    "NZTA Road Warnings and Closures",
    "Local Road Closures",
    "Marae locations",
    "Community Hall locations",
    "Service Centre locations",
    "Swimsafe Locations",
    "Weather",
    "Tides",
    "NRC River Data",
    "GeoNet Earthquakes",
    "GeoNet Quake Warnings (CAP)"
  ];

  function normaliseLayerDrawOrder(order) {
    var seen = Object.create(null);
    var input = Array.isArray(order) ? order.slice() : [];
    var result = [];
    input.forEach(function (name) {
      var key = String(name || "").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      result.push(key);
    });
    KNOWN_OVERLAY_NAMES.forEach(function (name) {
      if (seen[name]) return;
      seen[name] = true;
      result.push(name);
    });
    return result;
  }

  function defaultModuleOrder() {
    return ["header", "layout", "hero", "ctaRow", "situation", "summary", "stats", "tiles", "social", "footer"];
  }

  function ensureModulesPresent(data) {
    ensureLayout(data);
    var mods = Array.isArray(data.layout.modules) ? data.layout.modules : [];

    // Deduplicate by id while preserving first occurrence
    var seen = Object.create(null);
    mods = mods.filter(function (m) {
      if (!m || !m.id) return false;
      if (seen[m.id]) return false;
      seen[m.id] = true;
      return true;
    });

    var defaults = defaultModuleOrder();
    defaults.forEach(function (id) {
      var found = mods.find(function (m) { return m && m.id === id; });
      if (!found) {
        found = { id: id, label: moduleLabelById(id), enabled: true };
        if (id === "situation") {
          found.submodules = [
            { id: "mapPanel", label: "Map Panel", enabled: true },
            { id: "alertsPanel", label: "Alerts Panel", enabled: true }
          ];
        }
        mods.push(found);
      } else {
        if (!found.label) found.label = moduleLabelById(id);
        if (typeof found.enabled !== "boolean") found.enabled = true;
        if (id === "situation") {
          if (!Array.isArray(found.submodules)) {
            found.submodules = [
              { id: "mapPanel", label: "Map Panel", enabled: true },
              { id: "alertsPanel", label: "Alerts Panel", enabled: true }
            ];
          }
        }
      }
    });

    data.layout.modules = mods;
    return data;
  }

  function moduleLabelById(id) {
    var labels = {
      header: "Header",
      layout: "Layout",
      hero: "Hero",
      ctaRow: "Action Buttons",
      situation: "Map And Alerts",
      summary: "Content Panel",
      stats: "Status Cards",
      tiles: "Information Tiles",
      social: "Social Updates",
      footer: "Footer"
    };
    return labels[id] || id;
  }

  function getModuleConfig(data, id) {
    ensureModulesPresent(data);
    var mods = (data.layout && Array.isArray(data.layout.modules)) ? data.layout.modules : [];
    var found = mods.find(function (m) { return m && m.id === id; });
    if (!found) {
      found = { id: id, label: moduleLabelById(id), enabled: true };
      if (id === "situation") {
        found.submodules = [
          { id: "mapPanel", label: "Map Panel", enabled: true },
          { id: "alertsPanel", label: "Alerts Panel", enabled: true }
        ];
      }
      mods.push(found);
      data.layout.modules = mods;
    }
    if (!found.label) found.label = moduleLabelById(id);
    if (typeof found.enabled !== "boolean") found.enabled = true;
    return found;
  }

  function getAllModules(data) {
    ensureModulesPresent(data);
    return Array.isArray(data.layout.modules) ? data.layout.modules : [];
  }

  function downloadText(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function cloneJsonSafe(value) {
    try {
      return JSON.parse(JSON.stringify(value == null ? null : value));
    } catch (_err) {
      return null;
    }
  }

  function stripHtmlText(value) {
    return String(value == null ? "" : value)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function formatSitrepDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  }

  function timestampForFilename() {
    var d = new Date();
    function part(n) { return String(n).padStart(2, "0"); }
    return String(d.getFullYear()) +
      part(d.getMonth() + 1) +
      part(d.getDate()) + "_" +
      part(d.getHours()) +
      part(d.getMinutes()) +
      part(d.getSeconds());
  }

  function getDefaultSitrepSectionOrder() {
    return [
      "dataFreshness",
      "currentWarnings",
      "statusCards",
      "statusPower",
      "statusWater",
      "statusNzta",
      "statusLocalRoads",
      "statusWeatherWarnings",
      "statusCivilDefenceWarnings",
      "statusFndcAlerts",
      "statusEmergencyNews",
      "weatherGis",
      "swimsafe",
      "tides",
      "rivers",
      "fndcActive",
      "fndcScheduled"
    ];
  }

  function parseCsvTokens(value) {
    return String(value || "")
      .split(",")
      .map(function (token) { return token.trim().toLowerCase(); })
      .filter(Boolean);
  }

  function ensureSitrepConfig(data) {
    var admin = ensureObj(ensureObj(data, "runtimeConfig"), "admin");
    var sitrep = ensureObj(admin, "sitrep");
    if (typeof sitrep.includeDataFreshness !== "boolean") sitrep.includeDataFreshness = true;
    if (typeof sitrep.includeCurrentWarnings !== "boolean") sitrep.includeCurrentWarnings = true;
    if (typeof sitrep.includeStatusCards !== "boolean") sitrep.includeStatusCards = true;
    if (typeof sitrep.includeStatusTables !== "boolean") sitrep.includeStatusTables = true;
    if (typeof sitrep.includeWeatherGis !== "boolean") sitrep.includeWeatherGis = true;
    if (typeof sitrep.includeSwimsafe !== "boolean") sitrep.includeSwimsafe = true;
    if (typeof sitrep.includeTides !== "boolean") sitrep.includeTides = true;
    if (typeof sitrep.includeRivers !== "boolean") sitrep.includeRivers = true;
    if (typeof sitrep.includeFndcTiming !== "boolean") sitrep.includeFndcTiming = true;
    if (!Array.isArray(sitrep.sectionOrder) || !sitrep.sectionOrder.length) sitrep.sectionOrder = getDefaultSitrepSectionOrder();
    if (!Array.isArray(sitrep.swimsafeRiskFilter) || !sitrep.swimsafeRiskFilter.length) sitrep.swimsafeRiskFilter = ["medium", "high"];
    if (!Array.isArray(sitrep.swimsafeTypeFilter)) sitrep.swimsafeTypeFilter = [];
    if (!Array.isArray(sitrep.riverTrendFilter) || !sitrep.riverTrendFilter.length) sitrep.riverTrendFilter = ["rising"];
    if (typeof sitrep.swimsafeNameContains !== "string") sitrep.swimsafeNameContains = "";
    if (typeof sitrep.riverNameContains !== "string") sitrep.riverNameContains = "";
    if (typeof sitrep.riverAlarmContains !== "string") sitrep.riverAlarmContains = "";
    if (typeof sitrep.applyCustomGeoAreaScopeToSwimsafe !== "boolean") sitrep.applyCustomGeoAreaScopeToSwimsafe = false;
    if (typeof sitrep.applyCustomGeoAreaScopeToRivers !== "boolean") sitrep.applyCustomGeoAreaScopeToRivers = false;
    return sitrep;
  }

  function collectStatusCardSummary() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("#stats-grid .stat-card"));
    return cards.map(function (card) {
      var label = card.getAttribute("data-stat-label") || "";
      var numberEl = card.querySelector(".stat-number");
      var descEl = card.querySelector(".stat-description");
      var pills = Array.prototype.slice.call(card.querySelectorAll(".stat-pill")).map(function (pill) {
        return stripHtmlText(pill.textContent || "");
      }).filter(Boolean);
      return {
        label: stripHtmlText(label),
        count: stripHtmlText(numberEl ? numberEl.textContent : ""),
        description: stripHtmlText(descEl ? descEl.textContent : ""),
        pills: pills
      };
    });
  }

  function getSitrepLiveSnapshot() {
    var statsApi = window.FNED_SITREP_DATA_API;
    var mapApi = window.FNED_MAP_SITREP_API;
    var statsSnapshot = statsApi && typeof statsApi.getSnapshot === "function" ? statsApi.getSnapshot() : {};
    var mapSnapshot = mapApi && typeof mapApi.getSnapshot === "function" ? mapApi.getSnapshot() : {};
    return {
      generatedAt: new Date().toISOString(),
      stats: cloneJsonSafe(statsSnapshot) || {},
      map: cloneJsonSafe(mapSnapshot) || {},
      statusCards: collectStatusCardSummary()
    };
  }

  function takeValues(obj, keys) {
    if (!obj || typeof obj !== "object") return "";
    for (var i = 0; i < keys.length; i++) {
      var value = obj[keys[i]];
      if (value != null && String(value).trim()) return String(value);
    }
    return "";
  }

  function sitrepPointPassesAlertScope(item) {
    var api = window.FNED_ALERT_SCOPE_API;
    if (!api || typeof api.featureMatchesAreaScope !== "function") return true;
    var lat = Number(item && item.lat);
    var lng = Number(item && item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
    var feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {}
    };
    try {
      return !!api.featureMatchesAreaScope(feature);
    } catch (_err) {
      return true;
    }
  }

  function buildSitrepReportModel(data) {
    var cfg = ensureSitrepConfig(data);
    var live = getSitrepLiveSnapshot();
    var stats = live.stats || {};
    var map = live.map || {};
    var sectionsById = {};
    var statusTables = stats.statusTables || {};
    var currentWarnings = stats.currentWarningsAndAlerts || {};
    var swimsafeRiskFilter = asArray(cfg.swimsafeRiskFilter).map(function (x) { return String(x || "").toLowerCase(); }).filter(Boolean);
    var swimsafeTypeFilter = asArray(cfg.swimsafeTypeFilter).map(function (x) { return String(x || "").toLowerCase(); }).filter(Boolean);
    var riverTrendFilter = asArray(cfg.riverTrendFilter).map(function (x) { return String(x || "").toLowerCase(); }).filter(Boolean);
    var swimsafeNameContains = String(cfg.swimsafeNameContains || "").trim().toLowerCase();
    var riverNameContains = String(cfg.riverNameContains || "").trim().toLowerCase();
    var riverAlarmContains = String(cfg.riverAlarmContains || "").trim().toLowerCase();

    if (cfg.includeDataFreshness) {
      sectionsById.dataFreshness = {
        id: "dataFreshness",
        title: "Data Freshness",
        type: "table",
        columns: ["Feed", "Status", "HTTP", "Updated", "Message"],
        rows: asArray(stats.feedStatus).map(function (item) {
          return [
            takeValues(item, ["key"]),
            takeValues(item, ["status"]),
            takeValues(item, ["httpStatus"]),
            formatSitrepDate(takeValues(item, ["updatedAt", "lastSuccessAt", "lastFailureAt"])),
            takeValues(item, ["message"])
          ];
        })
      };
    }

    if (cfg.includeCurrentWarnings) {
      var currentRows = [];
      asArray(currentWarnings.weatherItems).forEach(function (item) {
        currentRows.push([
          "MetService",
          stripHtmlText(takeValues(item, ["title", "headline"])),
          stripHtmlText(takeValues(item, ["severity", "alertLevel"])),
          stripHtmlText(takeValues(item, ["area", "areaName", "region"])),
          formatSitrepDate(takeValues(item, ["expires", "expiry", "endDate", "expiresAt"]))
        ]);
      });
      asArray(currentWarnings.civilDefenceItems).forEach(function (item) {
        currentRows.push([
          "Civil Defence",
          stripHtmlText(takeValues(item, ["title", "headline"])),
          stripHtmlText(takeValues(item, ["severity", "alertLevel"])),
          stripHtmlText(takeValues(item, ["area", "areaName", "region"])),
          formatSitrepDate(takeValues(item, ["expires", "expiry", "endDate", "expiresAt"]))
        ]);
      });
      sectionsById.currentWarnings = {
        id: "currentWarnings",
        title: "Current Warnings And Alerts",
        type: "table",
        columns: ["Source", "Title", "Severity", "Area", "Until"],
        rows: currentRows
      };
    }

    if (cfg.includeStatusCards) {
      sectionsById.statusCards = {
        id: "statusCards",
        title: "Status Card Summary",
        type: "table",
        columns: ["Section", "Count", "Summary", "Pills"],
        rows: asArray(live.statusCards).map(function (card) {
          return [
            card.label || "",
            card.count || "",
            card.description || "",
            asArray(card.pills).join(", ")
          ];
        })
      };
    }

    if (cfg.includeStatusTables) {
      [
        { id: "statusPower", key: "powerOutages", title: "Power Outages" },
        { id: "statusWater", key: "waterOutages", title: "Water Outages" },
        { id: "statusNzta", key: "nztaRoadClosures", title: "NZTA Road Closures" },
        { id: "statusLocalRoads", key: "localRoadClosures", title: "Local Road Closures" },
        { id: "statusWeatherWarnings", key: "weatherWarnings", title: "Weather Warnings" },
        { id: "statusCivilDefenceWarnings", key: "civilDefenceWarnings", title: "Civil Defence Warnings" },
        { id: "statusFndcAlerts", key: "fndcAlerts", title: "FNDC Alerts" },
        { id: "statusEmergencyNews", key: "emergencyNews", title: "Emergency News Stories" }
      ].forEach(function (def) {
        var rows = asArray(statusTables[def.key]).map(function (item) {
          if (def.key === "localRoadClosures") {
            return [
              stripHtmlText(takeValues(item, ["road_id", "event_name", "title", "name"])),
              stripHtmlText(takeValues(item, ["road_status", "type", "status"])),
              stripHtmlText(takeValues(item, ["cause", "c_description", "detour_details", "description"])),
              formatSitrepDate(takeValues(item, ["info_updated", "s_datetime", "e_datetime", "updatedAt"]))
            ];
          }
          return [
            stripHtmlText(takeValues(item, ["title", "name", "headline", "locationArea"])),
            stripHtmlText(takeValues(item, ["status", "alertType", "eventType", "impact", "severity", "typeKey"])),
            stripHtmlText(takeValues(item, ["description", "summary", "comments", "area", "address"])),
            formatSitrepDate(takeValues(item, ["publishDate", "updatedAt", "startDateNice", "endDate", "endDateNice"]))
          ];
        });
        sectionsById[def.id] = {
          id: def.id,
          title: def.title + " Table",
          type: "table",
          columns: ["Title", "Type / Status", "Detail", "Date"],
          rows: rows
        };
      });
    }

    if (cfg.includeWeatherGis) {
      sectionsById.weatherGis = {
        id: "weatherGis",
        title: "Weather GIS Locations",
        type: "table",
        columns: ["Location", "Weather", "Temp", "Feels Like", "Humidity", "Wind", "Rain"],
        rows: asArray(map.weather).map(function (item) {
          return [
            takeValues(item, ["name"]),
            [takeValues(item, ["weatherIcon"]), takeValues(item, ["weatherText"])].join(" ").trim(),
            takeValues(item, ["temperature"]),
            takeValues(item, ["apparentTemperature"]),
            takeValues(item, ["humidity"]),
            takeValues(item, ["windSpeed"]),
            takeValues(item, ["precipitation"])
          ];
        })
      };
    }

    if (cfg.includeSwimsafe) {
      sectionsById.swimsafe = {
        id: "swimsafe",
        title: "Swimsafe Moderate And High Risk",
        type: "table",
        columns: ["Site", "Type", "Risk", "Coordinates"],
        rows: asArray(map.swimsafe).filter(function (item) {
          var key = String(item && item.riskKey || "").toLowerCase();
          var typeKey = String(item && item.siteType || "").toLowerCase();
          var name = String(item && item.name || "").toLowerCase();
          var riskOk = !swimsafeRiskFilter.length || swimsafeRiskFilter.indexOf(key) !== -1;
          var typeOk = !swimsafeTypeFilter.length || swimsafeTypeFilter.some(function (token) {
            return typeKey.indexOf(token) !== -1;
          });
          var nameOk = !swimsafeNameContains || name.indexOf(swimsafeNameContains) !== -1;
          var areaOk = !cfg.applyCustomGeoAreaScopeToSwimsafe || sitrepPointPassesAlertScope(item);
          return riskOk && typeOk && nameOk && areaOk;
        }).map(function (item) {
          return [
            takeValues(item, ["name"]),
            takeValues(item, ["siteType"]),
            takeValues(item, ["riskLabel"]),
            [takeValues(item, ["lat"]), takeValues(item, ["lng"])].filter(Boolean).join(", ")
          ];
        })
      };
    }

    if (cfg.includeTides) {
      sectionsById.tides = {
        id: "tides",
        title: "Tide Information",
        type: "table",
        columns: ["Site", "State", "Direction", "Current Height", "Next High", "Next Low"],
        rows: asArray(map.tides).map(function (item) {
          return [
            takeValues(item, ["name"]),
            takeValues(item, ["stateLabel"]),
            takeValues(item, ["direction"]),
            takeValues(item, ["currentHeight"]),
            formatSitrepDate(item && item.nextHigh && item.nextHigh.time),
            formatSitrepDate(item && item.nextLow && item.nextLow.time)
          ];
        })
      };
    }

    if (cfg.includeRivers) {
      sectionsById.rivers = {
        id: "rivers",
        title: "Rising Rivers",
        type: "table",
        columns: ["Site", "Trend", "Value", "Alarm", "Coordinates"],
        rows: asArray(map.rivers).filter(function (item) {
          var trend = String(item && item.trendKey || "").toLowerCase();
          var name = String(item && item.name || "").toLowerCase();
          var alarm = String(item && item.alarm || "").toLowerCase();
          var trendOk = !riverTrendFilter.length || riverTrendFilter.indexOf(trend) !== -1;
          var nameOk = !riverNameContains || name.indexOf(riverNameContains) !== -1;
          var alarmOk = !riverAlarmContains || alarm.indexOf(riverAlarmContains) !== -1;
          var areaOk = !cfg.applyCustomGeoAreaScopeToRivers || sitrepPointPassesAlertScope(item);
          return trendOk && nameOk && alarmOk && areaOk;
        }).map(function (item) {
          var valueText = "";
          if (item && item.currentValue != null && String(item.currentValue) !== "") {
            valueText = String(item.currentValue) + (item.units ? " " + item.units : "");
          }
          return [
            takeValues(item, ["name"]),
            takeValues(item, ["trendLabel"]),
            valueText,
            takeValues(item, ["alarm"]),
            [takeValues(item, ["lat"]), takeValues(item, ["lng"])].filter(Boolean).join(", ")
          ];
        })
      };
    }

    if (cfg.includeFndcTiming) {
      var timing = stats.councilMessageTiming || stats.fndcAlertTiming || {};
      sectionsById.fndcActive = {
        id: "fndcActive",
        title: "FNDC Alert Messages (Messages JSON) - Active",
        type: "table",
        columns: ["Title", "Type", "Publish", "Ends", "Description"],
        rows: asArray(timing.active).map(function (item) {
          return [
            stripHtmlText(takeValues(item, ["title"])),
            stripHtmlText(takeValues(item, ["level", "alertType"])),
            formatSitrepDate(takeValues(item, ["start", "publishDate"])),
            formatSitrepDate(takeValues(item, ["end", "endDate"])),
            stripHtmlText(takeValues(item, ["body", "description"]))
          ];
        })
      };
      sectionsById.fndcScheduled = {
        id: "fndcScheduled",
        title: "FNDC Alert Messages (Messages JSON) - Scheduled",
        type: "table",
        columns: ["Title", "Type", "Publish", "Ends", "Description"],
        rows: asArray(timing.scheduled).map(function (item) {
          return [
            stripHtmlText(takeValues(item, ["title"])),
            stripHtmlText(takeValues(item, ["level", "alertType"])),
            formatSitrepDate(takeValues(item, ["start", "publishDate"])),
            formatSitrepDate(takeValues(item, ["end", "endDate"])),
            stripHtmlText(takeValues(item, ["body", "description"]))
          ];
        })
      };
    }

    var requestedOrder = asArray(cfg.sectionOrder);
    var defaultOrder = getDefaultSitrepSectionOrder();
    var orderedIds = [];
    requestedOrder.concat(defaultOrder).forEach(function (id) {
      if (orderedIds.indexOf(id) === -1) orderedIds.push(id);
    });
    var sections = orderedIds.map(function (id) {
      return sectionsById[id] || null;
    }).filter(Boolean);

    return {
      title: "FNED SitRep Report",
      generatedAt: formatSitrepDate(live.generatedAt),
      statsLastUpdated: formatSitrepDate(stats.statsLastUpdatedIso),
      sections: sections
    };
  }

  function renderSitrepSection(section) {
    var wrap = el("section", { class: "editor-section-block" });
    wrap.appendChild(el("h4", { text: section.title }));
    var rows = asArray(section.rows);
    if (!rows.length) {
      wrap.appendChild(el("p", { class: "editor-note", text: "No data available for this section right now." }));
      return wrap;
    }
    var table = el("table", { class: "editor-table", style: "width:100%;border-collapse:collapse;font-size:12px;" });
    var thead = el("thead");
    var headRow = el("tr");
    asArray(section.columns).forEach(function (col) {
      headRow.appendChild(el("th", {
        text: col,
        style: "text-align:left;padding:6px;border-bottom:1px solid #d0d7de;vertical-align:top;"
      }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = el("tbody");
    rows.forEach(function (row) {
      var tr = el("tr");
      asArray(row).forEach(function (cell) {
        tr.appendChild(el("td", {
          text: String(cell == null ? "" : cell),
          style: "text-align:left;padding:6px;border-bottom:1px solid #eef2f6;vertical-align:top;"
        }));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function buildSitrepHtmlDocument(model) {
    var bodySections = asArray(model.sections).map(function (section) {
      var rows = asArray(section.rows);
      var rowsHtml = rows.length
        ? rows.map(function (row) {
            return "<tr>" + asArray(row).map(function (cell) {
              return "<td>" + String(cell == null ? "" : cell)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;") + "</td>";
            }).join("") + "</tr>";
          }).join("")
        : "<tr><td colspan=\"" + String(asArray(section.columns).length || 1) + "\">No data available for this section right now.</td></tr>";
      return [
        "<section>",
        "<h2>" + String(section.title).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</h2>",
        "<table><thead><tr>" + asArray(section.columns).map(function (col) {
          return "<th>" + String(col).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</th>";
        }).join("") + "</tr></thead><tbody>" + rowsHtml + "</tbody></table>",
        "</section>"
      ].join("");
    }).join("");
    return [
      "<!doctype html><html><head><meta charset=\"utf-8\">",
      "<title>FNED SitRep</title>",
      "<style>",
      "body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#0f172a;background:#fff;}",
      "h1{margin:0 0 8px;} h2{margin:24px 0 8px;font-size:20px;}",
      "p.meta{margin:4px 0;color:#475569;} table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;}",
      "th,td{border:1px solid #d0d7de;padding:6px;vertical-align:top;text-align:left;word-wrap:break-word;}",
      "th{background:#f8fafc;}",
      "</style></head><body>",
      "<h1>" + String(model.title).replace(/&/g, "&amp;") + "</h1>",
      "<p class=\"meta\">Generated: " + String(model.generatedAt).replace(/&/g, "&amp;") + "</p>",
      "<p class=\"meta\">Status last updated: " + String(model.statsLastUpdated || "").replace(/&/g, "&amp;") + "</p>",
      bodySections,
      "</body></html>"
    ].join("");
  }

  function exportSitrepHtml(model) {
    downloadText("fned_sitrep_" + timestampForFilename() + ".html", buildSitrepHtmlDocument(model), "text/html");
  }

  function exportSitrepPdf(model) {
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(buildSitrepHtmlDocument(model));
    win.document.close();
    win.focus();
    setTimeout(function () {
      try {
        win.print();
      } catch (_err) {}
    }, 250);
  }

  function exportSitrepPng(model) {
    var lines = [];
    lines.push(model.title);
    lines.push("Generated: " + (model.generatedAt || ""));
    lines.push("Status last updated: " + (model.statsLastUpdated || ""));
    asArray(model.sections).forEach(function (section) {
      lines.push("");
      lines.push(section.title);
      lines.push(asArray(section.columns).join(" | "));
      if (!asArray(section.rows).length) {
        lines.push("No data available for this section right now.");
        return;
      }
      asArray(section.rows).forEach(function (row) {
        lines.push(asArray(row).join(" | "));
      });
    });
    var maxWidth = 1400;
    var lineHeight = 22;
    var padding = 28;
    var font = "16px 'Segoe UI', Arial, sans-serif";
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = font;
    function wrapLine(text, width) {
      var words = String(text || "").split(/\s+/);
      var out = [];
      var current = "";
      words.forEach(function (word) {
        var next = current ? current + " " + word : word;
        if (ctx.measureText(next).width > width && current) {
          out.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) out.push(current);
      return out.length ? out : [""];
    }
    var wrapped = [];
    lines.forEach(function (line) {
      wrapLine(line, maxWidth - (padding * 2)).forEach(function (part) {
        wrapped.push(part);
      });
    });
    canvas.width = maxWidth;
    canvas.height = Math.max(300, padding * 2 + wrapped.length * lineHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = font;
    var y = padding;
    wrapped.forEach(function (line, idx) {
      ctx.font = idx === 0 ? "bold 24px 'Segoe UI', Arial, sans-serif" : font;
      ctx.fillText(line, padding, y);
      y += lineHeight;
    });
    var a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "fned_sitrep_" + timestampForFilename() + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function renderAdminModulePanel(data, state, panel) {
    var sitrepCfg = ensureSitrepConfig(data);
    var model = buildSitrepReportModel(data);
    var sectionMeta = [
      { id: "dataFreshness", label: "Data Freshness" },
      { id: "currentWarnings", label: "Current Warnings And Alerts" },
      { id: "statusCards", label: "Status Card Summary" },
      { id: "statusPower", label: "Power Outages Table" },
      { id: "statusWater", label: "Water Outages Table" },
      { id: "statusNzta", label: "NZTA Road Closures Table" },
      { id: "statusLocalRoads", label: "Local Road Closures Table" },
      { id: "statusWeatherWarnings", label: "Weather Warnings Table" },
      { id: "statusCivilDefenceWarnings", label: "Civil Defence Warnings Table" },
      { id: "statusFndcAlerts", label: "FNDC Alerts Table" },
      { id: "statusEmergencyNews", label: "Emergency News Stories Table" },
      { id: "weatherGis", label: "Weather GIS Locations" },
      { id: "swimsafe", label: "Swimsafe Section" },
      { id: "tides", label: "Tide Information" },
      { id: "rivers", label: "Rivers Section" },
      { id: "fndcActive", label: "FNDC Alerts Active" },
      { id: "fndcScheduled", label: "FNDC Alerts Scheduled" }
    ];
    function ensureSectionOrder() {
      if (!Array.isArray(sitrepCfg.sectionOrder) || !sitrepCfg.sectionOrder.length) {
        sitrepCfg.sectionOrder = getDefaultSitrepSectionOrder();
      }
      sectionMeta.forEach(function (meta) {
        if (sitrepCfg.sectionOrder.indexOf(meta.id) === -1) {
          sitrepCfg.sectionOrder.push(meta.id);
        }
      });
    }
    function moveSection(id, delta) {
      ensureSectionOrder();
      var idx = sitrepCfg.sectionOrder.indexOf(id);
      if (idx < 0) return;
      var next = idx + delta;
      if (next < 0 || next >= sitrepCfg.sectionOrder.length) return;
      moveItem(sitrepCfg.sectionOrder, idx, delta);
      renderModulePanel(data, state);
    }

    panel.appendChild(el("h3", { text: "Admin" }));
    panel.appendChild(el("p", {
      class: "editor-note",
      text: "Editor-only admin tools. SitRep compiles the current live dashboard status and GIS data into an exportable report."
    }));
    panel.appendChild(el("h4", { text: "SitRep Page" }));
    [
      ["Data Freshness Info", "includeDataFreshness"],
      ["Current Warnings And Alerts", "includeCurrentWarnings"],
      ["Status Card Summary", "includeStatusCards"],
      ["Status Tables", "includeStatusTables"],
      ["Weather GIS Locations", "includeWeatherGis"],
      ["Moderate / High Swimsafe", "includeSwimsafe"],
      ["Tide Info", "includeTides"],
      ["Rising Rivers", "includeRivers"],
      ["FNDC Active / Scheduled Messages", "includeFndcTiming"]
    ].forEach(function (def) {
      panel.appendChild(field(def[0], inputCheckbox(!!sitrepCfg[def[1]], function (v) {
        sitrepCfg[def[1]] = !!v;
        renderModulePanel(data, state);
      })));
    });

    panel.appendChild(el("h4", { text: "SitRep Section Order" }));
    panel.appendChild(el("p", {
      class: "editor-note",
      text: "Change the order used in preview and exports."
    }));
    ensureSectionOrder();
    var orderWrap = el("div", { class: "editor-array-wrap" });
    sitrepCfg.sectionOrder.forEach(function (id) {
      var meta = sectionMeta.find(function (m) { return m.id === id; });
      var label = meta ? meta.label : id;
      var row = el("div", { class: "editor-array-item" }, [
        el("div", { class: "editor-array-summary", text: label }),
        el("div", { class: "editor-array-controls" }, [
          el("button", { type: "button", class: "editor-btn", text: "Up" }),
          el("button", { type: "button", class: "editor-btn", text: "Down" })
        ])
      ]);
      row.children[1].children[0].addEventListener("click", function () { moveSection(id, -1); });
      row.children[1].children[1].addEventListener("click", function () { moveSection(id, 1); });
      orderWrap.appendChild(row);
    });
    panel.appendChild(orderWrap);

    panel.appendChild(el("h4", { text: "SitRep Extra Filters (Overlay)" }));
    panel.appendChild(el("p", {
      class: "editor-note",
      text: "These filters apply on top of existing map/status filters and only affect SitRep output."
    }));
    panel.appendChild(field("Swimsafe Risk Filter CSV", inputText(
      asArray(sitrepCfg.swimsafeRiskFilter).join(", "),
      function (v) {
        sitrepCfg.swimsafeRiskFilter = parseCsvTokens(v);
        renderModulePanel(data, state);
      },
      "medium, high"
    )));
    panel.appendChild(field("Swimsafe Type Filter CSV", inputText(
      asArray(sitrepCfg.swimsafeTypeFilter).join(", "),
      function (v) {
        sitrepCfg.swimsafeTypeFilter = parseCsvTokens(v);
        renderModulePanel(data, state);
      },
      "coastal, river"
    )));
    panel.appendChild(field("Swimsafe Name Contains", inputText(
      String(sitrepCfg.swimsafeNameContains || ""),
      function (v) {
        sitrepCfg.swimsafeNameContains = String(v || "");
        renderModulePanel(data, state);
      },
      "Optional text match"
    )));
    panel.appendChild(field("River Trend Filter CSV", inputText(
      asArray(sitrepCfg.riverTrendFilter).join(", "),
      function (v) {
        sitrepCfg.riverTrendFilter = parseCsvTokens(v);
        renderModulePanel(data, state);
      },
      "rising, falling, unknown"
    )));
    panel.appendChild(field("River Name Contains", inputText(
      String(sitrepCfg.riverNameContains || ""),
      function (v) {
        sitrepCfg.riverNameContains = String(v || "");
        renderModulePanel(data, state);
      },
      "Optional text match"
    )));
    panel.appendChild(field("River Alarm Contains", inputText(
      String(sitrepCfg.riverAlarmContains || ""),
      function (v) {
        sitrepCfg.riverAlarmContains = String(v || "");
        renderModulePanel(data, state);
      },
      "Optional alarm/status match"
    )));
    panel.appendChild(field("Apply Custom Geo Area Options To Swimsafe", inputCheckbox(
      !!sitrepCfg.applyCustomGeoAreaScopeToSwimsafe,
      function (v) {
        sitrepCfg.applyCustomGeoAreaScopeToSwimsafe = !!v;
        renderModulePanel(data, state);
      }
    )));
    panel.appendChild(field("Apply Custom Geo Area Options To Rivers", inputCheckbox(
      !!sitrepCfg.applyCustomGeoAreaScopeToRivers,
      function (v) {
        sitrepCfg.applyCustomGeoAreaScopeToRivers = !!v;
        renderModulePanel(data, state);
      }
    )));

    panel.appendChild(el("p", {
      class: "editor-note",
      text: "PDF export opens the browser print dialog so you can save the compiled report as PDF."
    }));
    var actionRow = buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Refresh SitRep" }),
      el("button", { type: "button", class: "editor-btn", text: "HTML Export" }),
      el("button", { type: "button", class: "editor-btn", text: "PDF Export" }),
      el("button", { type: "button", class: "editor-btn", text: "PNG Export" })
    ]);
    actionRow.children[0].addEventListener("click", function () {
      renderModulePanel(data, state);
    });
    actionRow.children[1].addEventListener("click", function () {
      exportSitrepHtml(buildSitrepReportModel(data));
    });
    actionRow.children[2].addEventListener("click", function () {
      exportSitrepPdf(buildSitrepReportModel(data));
    });
    actionRow.children[3].addEventListener("click", function () {
      exportSitrepPng(buildSitrepReportModel(data));
    });
    panel.appendChild(actionRow);
    panel.appendChild(el("h4", { text: "Report Preview" }));
    panel.appendChild(el("p", {
      class: "editor-note",
      text: "Generated: " + (model.generatedAt || "n/a") + " | Status last updated: " + (model.statsLastUpdated || "n/a")
    }));
    model.sections.forEach(function (section) {
      panel.appendChild(renderSitrepSection(section));
    });
  }

  function setEditMode(on) {
    document.body.classList.toggle("edit-mode", !!on);
    var backdrop = $("#editor-backdrop");
    if (backdrop) backdrop.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function focusModule(id) {
    var target = document.querySelector('[data-module-id="' + id + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderModulesList(data, state) {
    var list = $("#editor-modules-list");
    if (!list) return;
    list.innerHTML = "";
    var modules = getAllModules(data);

    modules.forEach(function (m) {
      var isSituation = m.id === "situation";
      var isStats = m.id === "stats";
      var isCta = m.id === "ctaRow";
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var ctaPage = (function () {
        var allowed = { actions: true, notifications: true, watch: true };
        return allowed[state.ctaPage] ? state.ctaPage : "actions";
      })();
      var statsPage = (function () {
        var allowed = {
          overview: true,
          runtime: true,
          fndcAlerts: true,
          emergencyNews: true,
          waterOutages: true,
          powerOutages: true,
          nztaRoadClosures: true,
          localRoadClosures: true,
          weatherWarnings: true,
          civilDefenceWarnings: true
        };
        return allowed[state.statsPage] ? state.statsPage : "overview";
      })();
      var isOn = m.enabled !== false;
      var row = el("div", { class: "editor-module-item" + (state.activeModuleId === m.id ? " is-active" : "") }, [
        el("span", { class: "editor-chip", text: isOn ? "On" : "Off" }),
        el("span", { text: m.label || m.id })
      ]);

      row.addEventListener("click", function () {
        state.activeModuleId = m.id;
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        focusModule(m.id);
        syncFocusMode(state);
      });

      list.appendChild(row);

      if (isSituation) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "map", label: "Map Page" },
          { pageId: "alerts", label: "Alerts Page" },
          { pageId: "diagnostics", label: "Diagnostics" }
        ].forEach(function (subPage) {
          var subActive = state.activeModuleId === "situation" && situationPage === subPage.pageId;
          var subRow = el("div", { class: "editor-submodule-item" + (subActive ? " is-active" : "") }, [
            el("span", { class: "editor-chip", text: "Page" }),
            el("span", { text: subPage.label })
          ]);
          subRow.addEventListener("click", function () {
            state.activeModuleId = "situation";
            state.situationPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("situation");
            syncFocusMode(state);
          });
          list.appendChild(subRow);
        });
      }
      if (isStats) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "runtime", label: "Runtime Settings" },
          { pageId: "fndcAlerts", label: "FNDC Alerts Card" },
          { pageId: "emergencyNews", label: "Emergency News Card" },
          { pageId: "waterOutages", label: "Water Outages Card" },
          { pageId: "powerOutages", label: "Power Outages Card" },
          { pageId: "nztaRoadClosures", label: "NZTA Card" },
          { pageId: "localRoadClosures", label: "Local Closures Card" },
          { pageId: "weatherWarnings", label: "Weather Warnings Card" },
          { pageId: "civilDefenceWarnings", label: "Civil Defence Warnings Card" }
        ].forEach(function (subPage) {
          var subActive = state.activeModuleId === "stats" && statsPage === subPage.pageId;
          var subRow = el("div", { class: "editor-submodule-item" + (subActive ? " is-active" : "") }, [
            el("span", { class: "editor-chip", text: "Page" }),
            el("span", { text: subPage.label })
          ]);
          subRow.addEventListener("click", function () {
            state.activeModuleId = "stats";
            state.statsPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("stats");
            syncFocusMode(state);
          });
          list.appendChild(subRow);
        });
      }
      if (isCta) {
        [
          { pageId: "actions", label: "Actions" },
          { pageId: "notifications", label: "Notifications" },
          { pageId: "watch", label: "Watch Areas" }
        ].forEach(function (subPage) {
          var subActive = state.activeModuleId === "ctaRow" && ctaPage === subPage.pageId;
          var subRow = el("div", { class: "editor-submodule-item" + (subActive ? " is-active" : "") }, [
            el("span", { class: "editor-chip", text: "Page" }),
            el("span", { text: subPage.label })
          ]);
          subRow.addEventListener("click", function () {
            state.activeModuleId = "ctaRow";
            state.ctaPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("ctaRow");
            syncFocusMode(state);
          });
          list.appendChild(subRow);
        });
      }
    });

    var adminActive = state.activeModuleId === "admin";
    var adminRow = el("div", { class: "editor-module-item" + (adminActive ? " is-active" : "") }, [
      el("span", { class: "editor-chip", text: "Tools" }),
      el("span", { text: "Admin" })
    ]);
    adminRow.addEventListener("click", function () {
      state.activeModuleId = "admin";
      state.adminPage = "sitrep";
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
    });
    list.appendChild(adminRow);

    var adminSubRow = el("div", { class: "editor-submodule-item" + (adminActive ? " is-active" : "") }, [
      el("span", { class: "editor-chip", text: "Page" }),
      el("span", { text: "SitRep" })
    ]);
    adminSubRow.addEventListener("click", function () {
      state.activeModuleId = "admin";
      state.adminPage = "sitrep";
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
    });
    list.appendChild(adminSubRow);
  }

  function renderQuickNav(data, state) {
    var wrap = $("#editor-quick-nav");
    if (!wrap) return;
    wrap.innerHTML = "";

    getAllModules(data).forEach(function (m) {
      var isSituation = m.id === "situation";
      var isStats = m.id === "stats";
      var isCta = m.id === "ctaRow";
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var ctaPage = (function () {
        var allowed = { actions: true, notifications: true, watch: true };
        return allowed[state.ctaPage] ? state.ctaPage : "actions";
      })();
      var statsPage = (function () {
        var allowed = {
          overview: true,
          runtime: true,
          fndcAlerts: true,
          emergencyNews: true,
          waterOutages: true,
          powerOutages: true,
          nztaRoadClosures: true,
          localRoadClosures: true,
          weatherWarnings: true,
          civilDefenceWarnings: true
        };
        return allowed[state.statsPage] ? state.statsPage : "overview";
      })();
      var btn = el("button", {
        type: "button",
        class: "editor-quick-btn" + (state.activeModuleId === m.id ? " is-active" : ""),
        text: m.label || m.id
      });
      btn.addEventListener("click", function () {
        state.activeModuleId = m.id;
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        focusModule(m.id);
        syncFocusMode(state);
      });
      wrap.appendChild(btn);

      if (isSituation) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "map", label: "Map Page" },
          { pageId: "alerts", label: "Alerts Page" },
          { pageId: "diagnostics", label: "Diagnostics" }
        ].forEach(function (subPage) {
          var subBtn = el("button", {
            type: "button",
            class: "editor-quick-btn editor-quick-btn-sub" + ((state.activeModuleId === "situation" && situationPage === subPage.pageId) ? " is-active" : ""),
            text: subPage.label
          });
          subBtn.addEventListener("click", function () {
            state.activeModuleId = "situation";
            state.situationPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("situation");
            syncFocusMode(state);
          });
          wrap.appendChild(subBtn);
        });
      }
      if (isStats) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "runtime", label: "Runtime" },
          { pageId: "fndcAlerts", label: "FNDC" },
          { pageId: "emergencyNews", label: "News" },
          { pageId: "waterOutages", label: "Water" },
          { pageId: "powerOutages", label: "Power" },
          { pageId: "nztaRoadClosures", label: "NZTA" },
          { pageId: "localRoadClosures", label: "Local Roads" },
          { pageId: "weatherWarnings", label: "Weather" },
          { pageId: "civilDefenceWarnings", label: "Civil Defence" }
        ].forEach(function (subPage) {
          var subBtn = el("button", {
            type: "button",
            class: "editor-quick-btn editor-quick-btn-sub" + ((state.activeModuleId === "stats" && statsPage === subPage.pageId) ? " is-active" : ""),
            text: subPage.label
          });
          subBtn.addEventListener("click", function () {
            state.activeModuleId = "stats";
            state.statsPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("stats");
            syncFocusMode(state);
          });
          wrap.appendChild(subBtn);
        });
      }
      if (isCta) {
        [
          { pageId: "actions", label: "Actions" },
          { pageId: "notifications", label: "Notifications" },
          { pageId: "watch", label: "Watch Areas" }
        ].forEach(function (subPage) {
          var subBtn = el("button", {
            type: "button",
            class: "editor-quick-btn editor-quick-btn-sub" + ((state.activeModuleId === "ctaRow" && ctaPage === subPage.pageId) ? " is-active" : ""),
            text: subPage.label
          });
          subBtn.addEventListener("click", function () {
            state.activeModuleId = "ctaRow";
            state.ctaPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("ctaRow");
            syncFocusMode(state);
          });
          wrap.appendChild(subBtn);
        });
      }
    });

    var adminBtn = el("button", {
      type: "button",
      class: "editor-quick-btn" + (state.activeModuleId === "admin" ? " is-active" : ""),
      text: "Admin"
    });
    adminBtn.addEventListener("click", function () {
      state.activeModuleId = "admin";
      state.adminPage = "sitrep";
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
    });
    wrap.appendChild(adminBtn);

    var sitrepBtn = el("button", {
      type: "button",
      class: "editor-quick-btn editor-quick-btn-sub" + (state.activeModuleId === "admin" ? " is-active" : ""),
      text: "SitRep"
    });
    sitrepBtn.addEventListener("click", function () {
      state.activeModuleId = "admin";
      state.adminPage = "sitrep";
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
    });
    wrap.appendChild(sitrepBtn);
  }

  function syncFocusMode(state) {
    var enabled = !!(state && state.focusMode);
    document.body.classList.toggle("editor-focus-mode", enabled && document.body.classList.contains("edit-mode"));

    var activeId = state && state.activeModuleId ? state.activeModuleId : "";
    var moduleNodes = document.querySelectorAll("[data-module-id]");
    var hasActiveNode = false;
    moduleNodes.forEach(function (node) {
      if ((node.getAttribute("data-module-id") || "") === activeId) {
        hasActiveNode = true;
      }
    });
    moduleNodes.forEach(function (node) {
      var id = node.getAttribute("data-module-id") || "";
      var isActive = hasActiveNode && id === activeId;
      node.classList.toggle("editor-focus-active", enabled && isActive);
      node.classList.toggle("editor-focus-muted", enabled && hasActiveNode && !isActive);
    });
  }

  function serializeInputValue(inputEl) {
    if (!inputEl) return "";
    if (inputEl.type === "checkbox") return inputEl.checked ? "1" : "0";
    return String(inputEl.value == null ? "" : inputEl.value);
  }

  function applySerializedInputValue(inputEl, serialized) {
    if (!inputEl) return;
    if (inputEl.type === "checkbox") {
      inputEl.checked = serialized === "1";
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    inputEl.value = serialized == null ? "" : String(serialized);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function fieldValidationMessage(labelText, inputEl) {
    if (!inputEl || inputEl.type === "checkbox") return "";
    var value = String(inputEl.value || "").trim();
    if (!value) return "";

    var lower = String(labelText || "").toLowerCase();
    var isUrlField = lower.indexOf("url") >= 0;
    if (isUrlField) {
      var isAllowedUrl =
        value.indexOf("http://") === 0 ||
        value.indexOf("https://") === 0 ||
        value.indexOf("/") === 0 ||
        value.indexOf("#") === 0 ||
        value.indexOf("about:") === 0 ||
        value.indexOf("mailto:") === 0 ||
        value.indexOf("tel:") === 0;
      if (!isAllowedUrl) {
        return "Use a full URL (https://...) or relative path (# or /...).";
      }
    }

    var isNumberField =
      lower === "number" ||
      lower.indexOf("(hours)") >= 0 ||
      lower.indexOf("onset window") >= 0 ||
      lower.indexOf("section count") >= 0;
    if (isNumberField && !/^[-]?\d+$/.test(value)) {
      return "Use whole numbers only.";
    }
    return "";
  }

  function field(label, inputEl) {
    var isWide = !!(inputEl && inputEl.tagName === "TEXTAREA");
    var wrap = el("div", { class: "editor-field" + (isWide ? " editor-field--wide" : "") });
    var labelNode = el("label", { text: label });
    var resetBtn = el("button", { type: "button", class: "editor-field-reset hidden", text: "Reset" });
    var errorNode = el("div", { class: "editor-field-error" });

    function updateFieldState() {
      var hasInitial = inputEl && typeof inputEl.dataset.initialValue !== "undefined";
      var changed = hasInitial && serializeInputValue(inputEl) !== inputEl.dataset.initialValue;
      resetBtn.classList.toggle("hidden", !changed);
      errorNode.textContent = fieldValidationMessage(label, inputEl);
    }

    resetBtn.addEventListener("click", function () {
      if (!inputEl || typeof inputEl.dataset.initialValue === "undefined") return;
      applySerializedInputValue(inputEl, inputEl.dataset.initialValue);
      updateFieldState();
    });

    if (inputEl) {
      var eventName = inputEl.type === "checkbox" ? "change" : "input";
      inputEl.addEventListener(eventName, updateFieldState);
      setTimeout(updateFieldState, 0);
    }

    wrap.appendChild(el("div", { class: "editor-field-label-row" }, [labelNode, resetBtn]));
    wrap.appendChild(inputEl);
    wrap.appendChild(errorNode);
    return wrap;
  }

  function ensureObj(parent, key) {
    if (!parent[key] || typeof parent[key] !== "object") parent[key] = {};
    return parent[key];
  }

  function renderOverlayPicker(mapCfg, onChange) {
    var enabled = Array.isArray(mapCfg.enabledOverlays) ? mapCfg.enabledOverlays.slice() : [];

    function isSelected(name) {
      return enabled.indexOf(name) >= 0;
    }

    function commit() {
      // When nothing is selected, fall back to showing all overlays.
      mapCfg.enabledOverlays = enabled.length ? enabled : null;
      onChange();
    }

    var wrap = el("div");
    wrap.appendChild(el("p", { class: "editor-note", text: "Select overlays to show in the layer picker. If none are selected, all overlays are shown." }));

    wrap.appendChild(buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Show All" }),
      el("button", { type: "button", class: "editor-btn", text: "Select All" })
    ]));

    wrap.lastChild.children[0].addEventListener("click", function () {
      enabled = [];
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    wrap.lastChild.children[1].addEventListener("click", function () {
      enabled = KNOWN_OVERLAY_NAMES.slice();
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    KNOWN_OVERLAY_NAMES.forEach(function (name) {
      var row = el("div", { class: "editor-inline" }, [
        inputCheckbox(isSelected(name), function (v) {
          if (v) {
            if (enabled.indexOf(name) < 0) enabled.push(name);
          } else {
            enabled = enabled.filter(function (n) { return n !== name; });
          }
          commit();
        }),
        el("span", { text: name })
      ]);
      wrap.appendChild(row);
    });

    return wrap;
  }

  function renderDefaultVisibleOverlayPicker(mapCfg, onChange) {
    var selected = Array.isArray(mapCfg.defaultVisibleOverlays) ? mapCfg.defaultVisibleOverlays.slice() : [];

    function isSelected(name) {
      return selected.indexOf(name) >= 0;
    }

    function commit() {
      // When nothing is selected, start with no overlays visible by default.
      mapCfg.defaultVisibleOverlays = selected.length ? selected : null;
      onChange();
    }

    var wrap = el("div");
    wrap.appendChild(el("p", { class: "editor-note", text: "Select overlays that should be turned on when the map first loads. If none are selected, all overlays start hidden." }));

    wrap.appendChild(buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Start With None" }),
      el("button", { type: "button", class: "editor-btn", text: "Start With All" })
    ]));

    wrap.lastChild.children[0].addEventListener("click", function () {
      selected = [];
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    wrap.lastChild.children[1].addEventListener("click", function () {
      selected = KNOWN_OVERLAY_NAMES.slice();
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    KNOWN_OVERLAY_NAMES.forEach(function (name) {
      var row = el("div", { class: "editor-inline" }, [
        inputCheckbox(isSelected(name), function (v) {
          if (v) {
            if (selected.indexOf(name) < 0) selected.push(name);
          } else {
            selected = selected.filter(function (n) { return n !== name; });
          }
          commit();
        }),
        el("span", { text: name })
      ]);
      wrap.appendChild(row);
    });

    return wrap;
  }

  function renderLayerDrawOrderPicker(mapCfg, onChange) {
    var ordered = normaliseLayerDrawOrder(mapCfg.layerDrawOrder);

    function commit() {
      mapCfg.layerDrawOrder = ordered.slice();
      onChange();
    }

    var wrap = el("div");
    wrap.appendChild(el("p", {
      class: "editor-note",
      text: "Top-most layers are listed first. Use Up/Down to set visibility priority when layers overlap."
    }));

    var actions = buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Reset Layer Order" }),
      el("button", { type: "button", class: "editor-btn", text: "Warnings On Top" })
    ]);
    actions.children[0].addEventListener("click", function () {
      ordered = KNOWN_OVERLAY_NAMES.slice();
      commit();
      renderRows();
      ON_EDITOR_DATA_CHANGED();
    });
    actions.children[1].addEventListener("click", function () {
      var priority = [
        "Power Outages",
        "Water Outages",
        "NZTA Road Warnings and Closures",
        "Local Road Closures",
        "Council alerts",
        "Tsunami Evacuation Zones",
        "MetService Weather Warnings",
        "Civil Defence Alerts"
      ];
      var seen = Object.create(null);
      var next = [];
      ordered.forEach(function (name) {
        if (priority.indexOf(name) >= 0) return;
        if (!seen[name]) {
          seen[name] = true;
          next.push(name);
        }
      });
      priority.forEach(function (name) {
        if (!seen[name]) {
          seen[name] = true;
          next.push(name);
        }
      });
      ordered = normaliseLayerDrawOrder(next);
      commit();
      renderRows();
      ON_EDITOR_DATA_CHANGED();
    });
    wrap.appendChild(actions);

    var listWrap = el("div", { class: "editor-array-block" });
    wrap.appendChild(listWrap);

    function moveItem(idx, direction) {
      var target = idx + direction;
      if (target < 0 || target >= ordered.length) return;
      var item = ordered[idx];
      ordered[idx] = ordered[target];
      ordered[target] = item;
      commit();
      renderRows();
      ON_EDITOR_DATA_CHANGED();
    }

    function renderRows() {
      listWrap.innerHTML = "";
      ordered.forEach(function (name, idx) {
        var row = el("div", { class: "editor-array-item" });
        row.appendChild(el("div", {
          class: "editor-array-summary",
          text: String(idx + 1) + ". " + name
        }));
        var controls = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Up" }),
          el("button", { type: "button", class: "editor-btn", text: "Down" })
        ]);
        controls.children[0].disabled = idx === 0;
        controls.children[1].disabled = idx === ordered.length - 1;
        controls.children[0].addEventListener("click", function () { moveItem(idx, -1); });
        controls.children[1].addEventListener("click", function () { moveItem(idx, 1); });
        row.appendChild(controls);
        listWrap.appendChild(row);
      });
    }

    renderRows();
    return wrap;
  }

  function inputText(value, onChange, placeholder) {
    var i = el("input", { type: "text", value: value || "", placeholder: placeholder || "" });
    i.dataset.initialValue = String(value || "");
    i.addEventListener("input", function () {
      onChange(i.value, i);
      ON_EDITOR_DATA_CHANGED();
    });
    return i;
  }

  function inputCheckbox(checked, onChange) {
    var i = el("input", { type: "checkbox" });
    i.checked = !!checked;
    i.dataset.initialValue = i.checked ? "1" : "0";
    i.addEventListener("change", function () {
      onChange(i.checked);
      ON_EDITOR_DATA_CHANGED();
    });
    return i;
  }

  function inputTextarea(value, onChange, placeholder) {
    var t = el("textarea", { placeholder: placeholder || "" });
    t.value = value || "";
    t.dataset.initialValue = String(value || "");
    t.addEventListener("input", function () {
      onChange(t.value);
      ON_EDITOR_DATA_CHANGED();
    });
    return t;
  }

  function inputSelect(value, options, onChange) {
    var s = el("select");
    options.forEach(function (opt) {
      s.appendChild(el("option", { value: opt.value, text: opt.label }));
    });
    s.value = value || "";
    s.dataset.initialValue = String(value || "");
    s.addEventListener("change", function () {
      onChange(s.value);
      ON_EDITOR_DATA_CHANGED();
    });
    return s;
  }

  function buttonRow(btns) {
    return el("div", { class: "editor-inline" }, btns);
  }

  function renderWatchAreaMapEditor(watch) {
    var wrap = el("div", { class: "editor-array-block" });
    wrap.appendChild(el("h5", { text: "Watch Area Map Tools" }));
    wrap.appendChild(el("p", {
      class: "editor-note",
      text: "Use Pick Point to set a watched location, or Draw Polygon to add vertices on the map then save as GeoJSON."
    }));

    var controls = buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Pick Point" }),
      el("button", { type: "button", class: "editor-btn", text: "Draw Polygon" }),
      el("button", { type: "button", class: "editor-btn", text: "Finish Polygon" }),
      el("button", { type: "button", class: "editor-btn", text: "Clear Polygon" }),
      el("button", { type: "button", class: "editor-btn", text: "Use Device Location" })
    ]);
    wrap.appendChild(controls);

    var statusEl = el("p", { class: "editor-note", text: "Mode: point picker" });
    wrap.appendChild(statusEl);

    var mapHost = el("div", {
      style: "height:280px;border:1px solid #d0d7de;border-radius:10px;overflow:hidden;background:#f6f8fa;"
    });
    wrap.appendChild(mapHost);

    function updateStatus(text) {
      statusEl.textContent = text;
    }

    setTimeout(function () {
      if (!window.L || typeof window.L.map !== "function") {
        updateStatus("Leaflet map tools unavailable in this context.");
        return;
      }

      var lat = isFinite(Number(watch.point && watch.point.lat)) ? Number(watch.point.lat) : -35.23;
      var lng = isFinite(Number(watch.point && watch.point.lng)) ? Number(watch.point.lng) : 173.95;
      var map = window.L.map(mapHost, { zoomControl: true }).setView([lat, lng], 9);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "OpenStreetMap"
      }).addTo(map);

      var pointMarker = window.L.marker([lat, lng]).addTo(map);
      var polygonLayer = null;
      var drawPolygonMode = String(watch.mode || "").toLowerCase() === "polygon";
      var vertices = [];

      function parsePolygonText(text) {
        try {
          var parsed = JSON.parse(String(text || "").trim());
          var coords = null;
          if (parsed && parsed.type === "FeatureCollection" && Array.isArray(parsed.features) && parsed.features.length) {
            parsed = parsed.features[0];
          }
          if (parsed && parsed.type === "Feature" && parsed.geometry) {
            parsed = parsed.geometry;
          }
          if (parsed && parsed.type === "Polygon" && Array.isArray(parsed.coordinates) && parsed.coordinates.length) {
            coords = parsed.coordinates[0];
          }
          if (!coords) return [];
          return coords.map(function (pair) {
            return [Number(pair[1]), Number(pair[0])];
          }).filter(function (pair) {
            return isFinite(pair[0]) && isFinite(pair[1]);
          });
        } catch (_err) {
          return [];
        }
      }

      function redrawPolygon() {
        if (polygonLayer) {
          map.removeLayer(polygonLayer);
          polygonLayer = null;
        }
        if (!vertices.length) return;
        polygonLayer = window.L.polygon(vertices, {
          color: "#ef6c00",
          weight: 2,
          fillColor: "#ffb74d",
          fillOpacity: 0.25
        }).addTo(map);
      }

      function setPoint(latValue, lngValue, modeText) {
        watch.point.lat = Number(latValue);
        watch.point.lng = Number(lngValue);
        if (!watch.point || typeof watch.point !== "object") watch.point = {};
        pointMarker.setLatLng([watch.point.lat, watch.point.lng]);
        map.panTo([watch.point.lat, watch.point.lng], { animate: true });
        updateStatus("Mode: " + modeText + " | Point: " + watch.point.lat.toFixed(5) + ", " + watch.point.lng.toFixed(5));
        ON_EDITOR_DATA_CHANGED();
      }

      function savePolygonGeoJson() {
        if (vertices.length < 3) {
          updateStatus("Need at least 3 points to save polygon.");
          return;
        }
        var ring = vertices.map(function (pair) { return [pair[1], pair[0]]; });
        var first = ring[0];
        var last = ring[ring.length - 1];
        if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
          ring.push([first[0], first[1]]);
        }
        var geojson = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: { name: "Watch Area" },
            geometry: {
              type: "Polygon",
              coordinates: [ring]
            }
          }]
        };
        watch.polygonGeoJson = JSON.stringify(geojson, null, 2);
        watch.mode = "polygon";
        updateStatus("Polygon saved to Watch Polygon GeoJSON.");
        ON_EDITOR_DATA_CHANGED();
      }

      vertices = parsePolygonText(watch.polygonGeoJson || "");
      redrawPolygon();
      if (vertices.length) {
        try { map.fitBounds(window.L.latLngBounds(vertices), { padding: [20, 20] }); } catch (_e) {}
      }
      updateStatus(drawPolygonMode ? "Mode: polygon drawer" : "Mode: point picker");

      map.on("click", function (ev) {
        var clickLat = Number(ev && ev.latlng ? ev.latlng.lat : NaN);
        var clickLng = Number(ev && ev.latlng ? ev.latlng.lng : NaN);
        if (!isFinite(clickLat) || !isFinite(clickLng)) return;
        if (drawPolygonMode) {
          vertices.push([clickLat, clickLng]);
          redrawPolygon();
          updateStatus("Mode: polygon drawer | Vertices: " + vertices.length);
          ON_EDITOR_DATA_CHANGED();
          return;
        }
        watch.mode = "point";
        setPoint(clickLat, clickLng, "point picker");
      });

      controls.children[0].addEventListener("click", function () {
        drawPolygonMode = false;
        watch.mode = "point";
        updateStatus("Mode: point picker");
      });
      controls.children[1].addEventListener("click", function () {
        drawPolygonMode = true;
        watch.mode = "polygon";
        updateStatus("Mode: polygon drawer");
      });
      controls.children[2].addEventListener("click", function () {
        savePolygonGeoJson();
      });
      controls.children[3].addEventListener("click", function () {
        vertices = [];
        watch.polygonGeoJson = "";
        redrawPolygon();
        updateStatus("Polygon cleared.");
        ON_EDITOR_DATA_CHANGED();
      });
      controls.children[4].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.resolveDeviceWatchPoint === "function") {
          window.FNED_NOTIFICATIONS_API.resolveDeviceWatchPoint().then(function (point) {
            if (point && isFinite(Number(point.lat)) && isFinite(Number(point.lng))) {
              watch.mode = "device";
              setPoint(point.lat, point.lng, "device location");
            }
          }).catch(function (err) {
            updateStatus("Device location failed: " + String((err && err.message) || "unknown error"));
          });
        } else {
          updateStatus("Device location API is not available yet.");
        }
      });
    }, 0);

    return wrap;
  }

  function moveItem(arr, index, delta) {
    var next = index + delta;
    if (next < 0 || next >= arr.length) return;
    var tmp = arr[index];
    arr[index] = arr[next];
    arr[next] = tmp;
  }

  function renderArrayEditor(opts) {
    var title = opts.title;
    var arr = opts.arr;
    var getSummary = opts.getSummary;
    var renderItemFields = opts.renderItemFields;
    var addNewItem = opts.addNewItem;

    var wrap = el("div", { class: "editor-array-block" }, [
      el("h4", { text: title })
    ]);

    if (!Array.isArray(arr) || arr.length === 0) {
      wrap.appendChild(el("p", { text: "No items yet." }));
    }

    (arr || []).forEach(function (item, idx) {
      var summary = el("summary", { class: "editor-array-summary" }, [
        el("span", { class: "editor-chip", text: String(idx + 1) }),
        el("strong", { text: getSummary(item, idx) })
      ]);

      var controls = buttonRow([
        el("button", { type: "button", class: "editor-btn", text: "Up" }),
        el("button", { type: "button", class: "editor-btn", text: "Down" }),
        el("button", { type: "button", class: "editor-btn", text: "Duplicate" }),
        el("button", { type: "button", class: "editor-btn danger", text: "Remove" })
      ]);

      controls.children[0].addEventListener("click", function () { moveItem(arr, idx, -1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
      controls.children[1].addEventListener("click", function () { moveItem(arr, idx, 1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
      controls.children[2].addEventListener("click", function () {
        var copy = deepClone(item);
        arr.splice(idx + 1, 0, copy);
        opts.onChange();
        ON_EDITOR_DATA_CHANGED();
      });
      controls.children[3].addEventListener("click", function () { arr.splice(idx, 1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });

      var body = el("div", { class: "editor-array-body" });
      controls.classList.add("editor-array-controls");
      body.appendChild(controls);
      body.appendChild(renderItemFields(item, idx));

      var itemWrap = el("details", { class: "editor-array-item", open: "open" }, [
        summary,
        body
      ]);

      wrap.appendChild(itemWrap);
    });

    var addBtn = el("button", { type: "button", class: "editor-btn", text: "Add Item" });
    addBtn.addEventListener("click", function () { arr.push(addNewItem()); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
    wrap.appendChild(addBtn);

    return wrap;
  }

  function renderModulePanel(data, state) {
    var panel = $("#editor-panel");
    if (!panel) return;
    panel.innerHTML = "";
    panel.classList.remove("editor-panel-alerts-page");
    panel.classList.remove("editor-panel-stats-runtime");

    var moduleId = state.activeModuleId || "header";
    if (moduleId === "admin") {
      renderAdminModulePanel(data, state, panel);
      return;
    }
    var mod = getModuleConfig(data, moduleId);

    panel.appendChild(el("h3", { text: mod.label || moduleId }));

    panel.appendChild(field("Enabled", inputCheckbox(mod.enabled !== false, function (v) {
      mod.enabled = !!v;
      renderModulesList(data, state);
    })));

    // Order buttons (affects layout.modules ordering)
    panel.appendChild(buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Move Up" }),
      el("button", { type: "button", class: "editor-btn", text: "Move Down" })
    ]));

    panel.lastChild.children[0].addEventListener("click", function () {
      var mods = data.layout.modules;
      var idx = mods.findIndex(function (m) { return m && m.id === moduleId; });
      if (idx > 0) { moveItem(mods, idx, -1); renderModulesList(data, state); ON_EDITOR_DATA_CHANGED(); }
    });

    panel.lastChild.children[1].addEventListener("click", function () {
      var mods = data.layout.modules;
      var idx = mods.findIndex(function (m) { return m && m.id === moduleId; });
      if (idx >= 0) { moveItem(mods, idx, 1); renderModulesList(data, state); ON_EDITOR_DATA_CHANGED(); }
    });

    if (moduleId === "situation" && Array.isArray(mod.submodules)) {
      panel.appendChild(el("h4", { text: "Submodules" }));
      mod.submodules.forEach(function (sub) {
        panel.appendChild(field(sub.label || sub.id, inputCheckbox(sub.enabled !== false, function (v) {
          sub.enabled = !!v;
        })));
      });
    }

    // Module specific fields
    if (moduleId === "header") {
      var meta = ensureObj(data, "meta");
      var brand = ensureObj(data, "brand");
      var layout = ensureObj(data, "layout");
      var editCfgHeader = ensureObj(layout, "edit");
      if (typeof editCfgHeader.showButton !== "boolean") editCfgHeader.showButton = false;
      if (!isFinite(Number(editCfgHeader.unlockTapCount))) editCfgHeader.unlockTapCount = 10;
      if (!isFinite(Number(editCfgHeader.unlockWindowMs))) editCfgHeader.unlockWindowMs = 10000;
      panel.appendChild(field("Page Title", inputText(meta.pageTitle, function (v) { meta.pageTitle = v; })));
      panel.appendChild(field("Council Short Code", inputText(brand.shortCode, function (v) { brand.shortCode = v; }, "Example: FN")));
      panel.appendChild(field("Council Name", inputText(brand.councilName, function (v) { brand.councilName = v; })));
      panel.appendChild(field("Dashboard Title", inputText(brand.dashboardTitle, function (v) { brand.dashboardTitle = v; })));
      panel.appendChild(field("Contact Number", inputText(meta.contactNumber, function (v) { meta.contactNumber = v; }, "Example: 0800 920 029")));
      panel.appendChild(field("Emergency Number", inputText(meta.emergencyNumber, function (v) { meta.emergencyNumber = v; }, "Example: 111")));
      panel.appendChild(field("Last Updated Text", inputText(meta.lastUpdated, function (v) { meta.lastUpdated = v; }, "Example: 10 Feb 2026")));
      panel.appendChild(el("h4", { text: "Editor Access" }));
      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Control visibility of the Edit button and unlock gesture from the monitoring status button."
      }));
      panel.appendChild(field("Show Edit Button By Default", inputCheckbox(editCfgHeader.showButton === true, function (v) {
        editCfgHeader.showButton = !!v;
      })));
      panel.appendChild(field("Status Unlock Tap Count", inputText(String(editCfgHeader.unlockTapCount || 10), function (v) {
        var n = Number(v);
        if (isFinite(n)) editCfgHeader.unlockTapCount = Math.max(2, Math.min(30, Math.round(n)));
      }, "2 to 30")));
      panel.appendChild(field("Status Unlock Time Window (ms)", inputText(String(editCfgHeader.unlockWindowMs || 10000), function (v) {
        var n = Number(v);
        if (isFinite(n)) editCfgHeader.unlockWindowMs = Math.max(1000, Math.min(60000, Math.round(n)));
      }, "1000 to 60000")));
      var rehideAccessBtn = el("button", { type: "button", class: "editor-btn", text: "Re-hide Edit Button Now" });
      rehideAccessBtn.addEventListener("click", function () {
        if (window.FNED_EDITOR_VISIBILITY_API && typeof window.FNED_EDITOR_VISIBILITY_API.rehide === "function") {
          window.FNED_EDITOR_VISIBILITY_API.rehide();
        }
      });
      panel.appendChild(buttonRow([rehideAccessBtn]));
    }

    if (moduleId === "hero") {
      var hero = ensureObj(data, "hero");
      var heroControls = ensureObj(ensureObj(data, "runtimeConfig"), "heroControls");
      if (typeof heroControls.showRefresh !== "boolean") heroControls.showRefresh = true;
      if (typeof heroControls.showReset !== "boolean") heroControls.showReset = true;
      if (!isFinite(Number(heroControls.refreshCooldownMs))) heroControls.refreshCooldownMs = 60000;
      if (!isFinite(Number(heroControls.resetCooldownMs))) heroControls.resetCooldownMs = 60000;
      panel.appendChild(field("Tagline Title", inputText(hero.taglineTitle, function (v) { hero.taglineTitle = v; })));
      panel.appendChild(field("Description", inputTextarea(hero.description, function (v) { hero.description = v; })));
      panel.appendChild(field("Status Pill", inputText(hero.statusPill, function (v) { hero.statusPill = v; })));
      panel.appendChild(field("Emergency Message", inputText(hero.emergencyMessage, function (v) { hero.emergencyMessage = v; })));
      panel.appendChild(el("h4", { text: "Hero Controls" }));
      panel.appendChild(field("Show Refresh Button", inputCheckbox(!!heroControls.showRefresh, function (v) { heroControls.showRefresh = !!v; })));
      panel.appendChild(field("Show Reset Button", inputCheckbox(!!heroControls.showReset, function (v) { heroControls.showReset = !!v; })));
      panel.appendChild(field("Refresh Cooldown (ms)", inputText(String(heroControls.refreshCooldownMs || 60000), function (v) {
        var n = Number(v);
        if (isFinite(n)) heroControls.refreshCooldownMs = Math.max(1000, Math.min(300000, Math.round(n)));
      }, "1000 to 300000")));
      panel.appendChild(field("Reset Cooldown (ms)", inputText(String(heroControls.resetCooldownMs || 60000), function (v) {
        var n = Number(v);
        if (isFinite(n)) heroControls.resetCooldownMs = Math.max(1000, Math.min(300000, Math.round(n)));
      }, "1000 to 300000")));
      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Refresh and Reset have independent cooldown timers."
      }));
    }

    if (moduleId === "layout") {
      var runtimeCfgLayout = ensureObj(data, "runtimeConfig");
      var layoutCfg = ensureObj(runtimeCfgLayout, "layout");
      var mainSectionIds = ["ctaRow", "situation", "summary", "stats", "tiles", "social"];
      if (!isFinite(Number(layoutCfg.maxWidthPx))) layoutCfg.maxWidthPx = 1200;
      if (!isFinite(Number(layoutCfg.sidePaddingPx))) layoutCfg.sidePaddingPx = 20;
      if (!isFinite(Number(layoutCfg.sectionGapPx))) layoutCfg.sectionGapPx = 24;
      if (typeof layoutCfg.situationDesktopMode !== "string" || !layoutCfg.situationDesktopMode.trim()) {
        layoutCfg.situationDesktopMode = "mapLeft";
      }
      if (!isFinite(Number(layoutCfg.situationPrimaryWidthPercent))) layoutCfg.situationPrimaryWidthPercent = 62;
      if (!isFinite(Number(layoutCfg.situationPanelMinWidthPx))) layoutCfg.situationPanelMinWidthPx = 280;
      if (!isFinite(Number(layoutCfg.statsColumnsTablet))) layoutCfg.statsColumnsTablet = 2;
      if (!isFinite(Number(layoutCfg.statsColumnsDesktop))) layoutCfg.statsColumnsDesktop = 3;
      if (!isFinite(Number(layoutCfg.statsColumnsWide))) layoutCfg.statsColumnsWide = 4;

      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Layout page controls section sizing and positioning. Save to reload and apply."
      }));
      panel.appendChild(field("Main Content Max Width (px)", inputText(String(layoutCfg.maxWidthPx || 1200), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.maxWidthPx = Math.max(900, Math.min(2200, Math.round(n)));
      }, "900 to 2200")));
      panel.appendChild(field("Main Side Padding (px)", inputText(String(layoutCfg.sidePaddingPx || 20), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.sidePaddingPx = Math.max(8, Math.min(80, Math.round(n)));
      }, "8 to 80")));
      panel.appendChild(field("Section Gap (px)", inputText(String(layoutCfg.sectionGapPx || 24), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.sectionGapPx = Math.max(8, Math.min(64, Math.round(n)));
      }, "8 to 64")));
      panel.appendChild(el("h4", { text: "Map And Alerts Positioning" }));
      panel.appendChild(field("Desktop Layout Mode", inputSelect(layoutCfg.situationDesktopMode || "mapLeft", [
        { value: "mapLeft", label: "Map Left, Alerts Right" },
        { value: "alertsLeft", label: "Alerts Left, Map Right" },
        { value: "stacked", label: "Stacked" }
      ], function (v) {
        layoutCfg.situationDesktopMode = v;
      })));
      panel.appendChild(field("Primary Panel Width (%)", inputText(String(layoutCfg.situationPrimaryWidthPercent || 62), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.situationPrimaryWidthPercent = Math.max(35, Math.min(75, Math.round(n)));
      }, "35 to 75")));
      panel.appendChild(field("Panel Minimum Width (px)", inputText(String(layoutCfg.situationPanelMinWidthPx || 280), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.situationPanelMinWidthPx = Math.max(220, Math.min(800, Math.round(n)));
      }, "220 to 800")));
      panel.appendChild(el("h4", { text: "Status Card Grid" }));
      panel.appendChild(field("Tablet Columns (>=720px)", inputText(String(layoutCfg.statsColumnsTablet || 2), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.statsColumnsTablet = Math.max(1, Math.min(4, Math.round(n)));
      }, "1 to 4")));
      panel.appendChild(field("Desktop Columns (>=1160px)", inputText(String(layoutCfg.statsColumnsDesktop || 3), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.statsColumnsDesktop = Math.max(1, Math.min(5, Math.round(n)));
      }, "1 to 5")));
      panel.appendChild(field("Wide Columns (>=1500px)", inputText(String(layoutCfg.statsColumnsWide || 4), function (v) {
        var n = Number(v);
        if (isFinite(n)) layoutCfg.statsColumnsWide = Math.max(1, Math.min(6, Math.round(n)));
      }, "1 to 6")));

      panel.appendChild(el("h4", { text: "Main Page Section Order" }));
      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Move sections up or down to control their order on the main page. Example: move Current Status directly below the header area."
      }));

      function moveMainSection(id, delta) {
        var mods = Array.isArray(data.layout.modules) ? data.layout.modules : [];
        var mainMods = mods.filter(function (m) { return m && mainSectionIds.indexOf(m.id) >= 0; });
        var idx = -1;
        for (var i = 0; i < mainMods.length; i++) {
          if (mainMods[i] && mainMods[i].id === id) {
            idx = i;
            break;
          }
        }
        if (idx < 0) return false;
        var nextIdx = idx + delta;
        if (nextIdx < 0 || nextIdx >= mainMods.length) return false;
        moveItem(mainMods, idx, delta);
        var rebuilt = [];
        var pointer = 0;
        mods.forEach(function (m) {
          if (m && mainSectionIds.indexOf(m.id) >= 0) {
            rebuilt.push(mainMods[pointer++] || m);
          } else {
            rebuilt.push(m);
          }
        });
        data.layout.modules = rebuilt;
        return true;
      }

      var mainOrderWrap = el("div", { class: "editor-array-wrap" });
      var orderedMainModules = (Array.isArray(data.layout.modules) ? data.layout.modules : [])
        .filter(function (m) { return m && mainSectionIds.indexOf(m.id) >= 0; });

      orderedMainModules.forEach(function (m, idx) {
        var row = el("div", { class: "editor-array-item" });
        var summary = el("div", { class: "editor-array-summary", text: (moduleLabelById(m.id) || m.id) });
        var controls = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Up" }),
          el("button", { type: "button", class: "editor-btn", text: "Down" })
        ]);
        controls.children[0].disabled = (idx === 0);
        controls.children[1].disabled = (idx === orderedMainModules.length - 1);
        controls.children[0].addEventListener("click", function () {
          if (moveMainSection(m.id, -1)) {
            renderModulesList(data, state);
            renderModulePanel(data, state);
            ON_EDITOR_DATA_CHANGED();
          }
        });
        controls.children[1].addEventListener("click", function () {
          if (moveMainSection(m.id, 1)) {
            renderModulesList(data, state);
            renderModulePanel(data, state);
            ON_EDITOR_DATA_CHANGED();
          }
        });
        row.appendChild(summary);
        row.appendChild(controls);
        mainOrderWrap.appendChild(row);
      });
      panel.appendChild(mainOrderWrap);
    }

    if (moduleId === "ctaRow") {
      var ctaPageAllowed = { actions: true, notifications: true, watch: true };
      var ctaPage = ctaPageAllowed[state.ctaPage] ? state.ctaPage : "actions";
      var ctaPageNav = el("div", { class: "editor-subpage-nav", role: "tablist", "aria-label": "Action settings pages" });
      function ctaPageBtn(pageId, label) {
        var isActive = ctaPage === pageId;
        var btn = el("button", {
          type: "button",
          class: "editor-subpage-btn" + (isActive ? " is-active" : ""),
          text: label,
          role: "tab",
          "aria-selected": isActive ? "true" : "false"
        });
        btn.addEventListener("click", function () {
          state.ctaPage = pageId;
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        return btn;
      }
      ctaPageNav.appendChild(ctaPageBtn("actions", "Actions"));
      ctaPageNav.appendChild(ctaPageBtn("notifications", "Notifications"));
      ctaPageNav.appendChild(ctaPageBtn("watch", "Watch Areas"));
      panel.appendChild(ctaPageNav);

      if (ctaPage === "actions") {
        panel.appendChild(renderArrayEditor({
          title: "Action Buttons",
          arr: Array.isArray(data.ctaButtons) ? data.ctaButtons : (data.ctaButtons = []),
          getSummary: function (item) { return (item && item.label) ? item.label : "(untitled)"; },
          addNewItem: function () { return { label: "New Button", url: "#", style: "secondary", external: false, icon: "\u27A1\uFE0F", action: "" }; },
          renderItemFields: function (item) {
            var box = el("div");
            box.appendChild(field("Label", inputText(item.label, function (v) { item.label = v; })));
            box.appendChild(field("URL", inputText(item.url, function (v) { item.url = v; })));
            box.appendChild(field("Action", inputSelect(item.action || "", [
              { value: "", label: "Link Only" },
              { value: "notifications:enable", label: "Receive Notifications" }
            ], function (v) { item.action = v; })));
            box.appendChild(field("Style", inputSelect(item.style, [
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" }
            ], function (v) { item.style = v; })));
            box.appendChild(field("Icon", inputText(item.icon, function (v) { item.icon = v; }, "Emoji or text")));
            box.appendChild(field("Open In New Tab", inputCheckbox(item.external, function (v) { item.external = v; })));
            if (item.action && item.action.indexOf("notifications") === 0) {
              box.appendChild(el("p", { class: "editor-note", text: "Notification actions ignore URL and new tab. They prompt for browser notification permission." }));
            }
            return box;
          },
          onChange: function () { renderModulePanel(data, state); }
        }));
      }

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.notifications = data.runtimeConfig.notifications || {};
      data.runtimeConfig.customMessages = data.runtimeConfig.customMessages || {};

      var notif = data.runtimeConfig.notifications;
      var cm = data.runtimeConfig.customMessages;

      if (typeof notif.enabled !== "boolean") notif.enabled = true;
      if (typeof notif.autoRefreshWarnings !== "boolean") notif.autoRefreshWarnings = true;
      if (!isFinite(Number(notif.pollIntervalMs))) notif.pollIntervalMs = 300000;
      if (!notif.notifySources || typeof notif.notifySources !== "object") {
        notif.notifySources = { metservice: true, civilDefence: true };
      }
      if (typeof notif.notifyUpcoming !== "boolean") notif.notifyUpcoming = false;
      if (typeof notif.notifyExpired !== "boolean") notif.notifyExpired = false;
      if (!isFinite(Number(notif.dedupeWindowHours))) notif.dedupeWindowHours = 12;
      if (typeof notif.useBrowserNotifications !== "boolean") notif.useBrowserNotifications = true;
      if (typeof notif.useToasts !== "boolean") notif.useToasts = true;
      if (!isFinite(Number(notif.toastDurationMs))) notif.toastDurationMs = 9000;
      if (!notif.watch || typeof notif.watch !== "object") notif.watch = {};
      if (typeof notif.watch.enabled !== "boolean") notif.watch.enabled = false;
      if (typeof notif.watch.mode !== "string") notif.watch.mode = "point";
      if (!notif.watch.point || typeof notif.watch.point !== "object") notif.watch.point = {};
      if (!isFinite(Number(notif.watch.point.lat))) notif.watch.point.lat = -35.23;
      if (!isFinite(Number(notif.watch.point.lng))) notif.watch.point.lng = 173.95;
      if (!isFinite(Number(notif.watch.radiusKm))) notif.watch.radiusKm = 15;
      if (typeof notif.watch.polygonGeoJson !== "string") notif.watch.polygonGeoJson = "";
      if (!notif.watch.sources || typeof notif.watch.sources !== "object") {
        notif.watch.sources = {};
      }
      if (typeof notif.watch.sources.metservice !== "boolean") notif.watch.sources.metservice = true;
      if (typeof notif.watch.sources.civilDefence !== "boolean") notif.watch.sources.civilDefence = true;
      if (typeof notif.watch.sources.powerOutages !== "boolean") notif.watch.sources.powerOutages = true;
      if (typeof notif.watch.sources.customMessages !== "boolean") notif.watch.sources.customMessages = true;
      if (typeof notif.watch.sources.waterOutages !== "boolean") notif.watch.sources.waterOutages = true;
      if (typeof notif.watch.sources.nztaClosures !== "boolean") notif.watch.sources.nztaClosures = true;
      if (typeof notif.watch.sources.localRoadClosures !== "boolean") notif.watch.sources.localRoadClosures = true;
      if (!notif.watch.powerStatuses || typeof notif.watch.powerStatuses !== "object") notif.watch.powerStatuses = {};
      if (typeof notif.watch.powerStatuses.unplanned !== "boolean") notif.watch.powerStatuses.unplanned = true;
      if (typeof notif.watch.powerStatuses.plannedActive !== "boolean") notif.watch.powerStatuses.plannedActive = true;
      if (!notif.watch.waterStatuses || typeof notif.watch.waterStatuses !== "object") notif.watch.waterStatuses = {};
      if (typeof notif.watch.waterStatuses["New"] !== "boolean") notif.watch.waterStatuses["New"] = true;
      if (typeof notif.watch.waterStatuses["Under repairs"] !== "boolean") notif.watch.waterStatuses["Under repairs"] = true;
      if (!notif.watch.nztaTypes || typeof notif.watch.nztaTypes !== "object") notif.watch.nztaTypes = {};
      if (typeof notif.watch.nztaTypes.closure !== "boolean") notif.watch.nztaTypes.closure = true;
      if (typeof notif.debugLog !== "boolean") notif.debugLog = false;

      if (typeof cm.enabled !== "boolean") cm.enabled = true;
      if (typeof cm.url !== "string") cm.url = "./fned_custom_messages_example.json";
      if (!isFinite(Number(cm.pollIntervalMs))) cm.pollIntervalMs = 60000;
      if (typeof cm.renderInSummary !== "boolean") cm.renderInSummary = true;
      if (typeof cm.useBrowserNotifications !== "boolean") cm.useBrowserNotifications = true;
      if (typeof cm.useToasts !== "boolean") cm.useToasts = true;
      if (!isFinite(Number(cm.dedupeWindowHours))) cm.dedupeWindowHours = 12;
      if (typeof cm.debugLog !== "boolean") cm.debugLog = false;

      if (ctaPage === "notifications") {
        panel.appendChild(el("h4", { text: "Notification Settings" }));
        panel.appendChild(el("p", { class: "editor-note", text: "These settings control in-page toasts and browser notifications while the dashboard tab is open." }));

      var perm = "unknown";
      try {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.getPermission === "function") {
          perm = window.FNED_NOTIFICATIONS_API.getPermission();
        }
      } catch (e) {
        perm = "unknown";
      }
      panel.appendChild(el("p", { class: "editor-note", text: "Browser notification permission: " + perm }));

      // PWA status (useful for iPhone guidance)
      try {
        if (window.FNED_PWA_API && typeof window.FNED_PWA_API.getStatus === "function") {
          var st = window.FNED_PWA_API.getStatus();
          var installText = (st && st.isStandalone) ? "Installed (standalone)" : "Browser tab";
          var iosText = (st && st.isIOS) ? "iPhone or iPad" : "Not iPhone or iPad";
          panel.appendChild(el("p", { class: "editor-note", text: "PWA status: " + installText + " | " + iosText }));
        }
      } catch (eStatus) {
        // ignore
      }

      var notifBtns = buttonRow([
        el("button", { type: "button", class: "editor-btn", text: "Request Permission" }),
        el("button", { type: "button", class: "editor-btn", text: "Send Test Notification" }),
        el("button", { type: "button", class: "editor-btn", text: "Reload Custom Messages" }),
        el("button", { type: "button", class: "editor-btn", text: "Install Help" })
      ]);
      notifBtns.children[0].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.requestPermission === "function") {
          window.FNED_NOTIFICATIONS_API.requestPermission();
        }
      });
      notifBtns.children[1].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.test === "function") {
          window.FNED_NOTIFICATIONS_API.test();
        }
      });
      notifBtns.children[2].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.reloadCustomMessages === "function") {
          window.FNED_NOTIFICATIONS_API.reloadCustomMessages();
        }
      });

      notifBtns.children[3].addEventListener("click", function () {
        if (window.FNED_PWA_API && typeof window.FNED_PWA_API.showInstallHelp === "function") {
          window.FNED_PWA_API.showInstallHelp();
        } else if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.toast === "function") {
          window.FNED_NOTIFICATIONS_API.toast({
            title: "Install Help",
            body: "On iPhone, open in Safari then Add to Home Screen.",
            meta: "FNED",
            level: "Info"
          });
        }
      });
      panel.appendChild(notifBtns);

        panel.appendChild(el("h5", { text: "Warnings Notifications" }));
        panel.appendChild(field("Enabled", inputCheckbox(!!notif.enabled, function (v) { notif.enabled = !!v; })));
        panel.appendChild(field("Auto Refresh Warnings", inputCheckbox(!!notif.autoRefreshWarnings, function (v) { notif.autoRefreshWarnings = !!v; })));
        panel.appendChild(field("Poll Interval (ms)", inputText(String(notif.pollIntervalMs || 300000), function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) notif.pollIntervalMs = n;
        })));
        panel.appendChild(field("Notify MetService", inputCheckbox(notif.notifySources.metservice !== false, function (v) {
          notif.notifySources.metservice = !!v;
        })));
        panel.appendChild(field("Notify Civil Defence", inputCheckbox(notif.notifySources.civilDefence !== false, function (v) {
          notif.notifySources.civilDefence = !!v;
        })));
        panel.appendChild(field("Notify Upcoming Alerts", inputCheckbox(!!notif.notifyUpcoming, function (v) { notif.notifyUpcoming = !!v; })));
        panel.appendChild(field("Notify Expired Alerts", inputCheckbox(!!notif.notifyExpired, function (v) { notif.notifyExpired = !!v; })));
        panel.appendChild(field("Dedupe Window (hours)", inputText(String(notif.dedupeWindowHours || 12), function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) notif.dedupeWindowHours = n;
        })));
        panel.appendChild(field("Use Browser Notifications", inputCheckbox(!!notif.useBrowserNotifications, function (v) { notif.useBrowserNotifications = !!v; })));
        panel.appendChild(field("Use Toasts", inputCheckbox(!!notif.useToasts, function (v) { notif.useToasts = !!v; })));
        panel.appendChild(field("Toast Duration (ms)", inputText(String(notif.toastDurationMs || 9000), function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) notif.toastDurationMs = n;
        })));

        panel.appendChild(el("h5", { text: "Custom Messages" }));
        panel.appendChild(field("Enabled", inputCheckbox(!!cm.enabled, function (v) { cm.enabled = !!v; })));
        panel.appendChild(field("Messages JSON URL", inputText(cm.url || "", function (v) { cm.url = v; })));
        panel.appendChild(field("Poll Interval (ms)", inputText(String(cm.pollIntervalMs || 60000), function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) cm.pollIntervalMs = n;
        })));
        panel.appendChild(field("Render In Summary", inputCheckbox(cm.renderInSummary !== false, function (v) { cm.renderInSummary = !!v; })));
        panel.appendChild(field("Use Browser Notifications", inputCheckbox(!!cm.useBrowserNotifications, function (v) { cm.useBrowserNotifications = !!v; })));
        panel.appendChild(field("Use Toasts", inputCheckbox(!!cm.useToasts, function (v) { cm.useToasts = !!v; })));
        panel.appendChild(field("Dedupe Window (hours)", inputText(String(cm.dedupeWindowHours || 12), function (v) {
          var n = parseInt(v, 10);
          if (!isNaN(n)) cm.dedupeWindowHours = n;
        })));
        panel.appendChild(field("Debug Log", inputCheckbox(!!notif.debugLog, function (v) { notif.debugLog = !!v; })));
      }

      if (ctaPage === "watch") {
        panel.appendChild(el("h4", { text: "Watch Area Settings" }));
        panel.appendChild(el("p", { class: "editor-note", text: "Dedicated watch-area settings page. Use the map tools below to pick a point or draw a polygon for watched notifications." }));
        panel.appendChild(field("Enable Watch Area", inputCheckbox(!!notif.watch.enabled, function (v) { notif.watch.enabled = !!v; })));
        panel.appendChild(field("Watch Mode", inputSelect(notif.watch.mode || "point", [
          { value: "point", label: "Point + Radius" },
          { value: "device", label: "Use Device Location + Radius" },
          { value: "polygon", label: "Custom Polygon (GeoJSON)" }
        ], function (v) { notif.watch.mode = v; })));
        panel.appendChild(field("Watch Latitude", inputText(String(notif.watch.point.lat), function (v) {
          var n = parseFloat(v);
          if (isFinite(n)) notif.watch.point.lat = n;
        })));
        panel.appendChild(field("Watch Longitude", inputText(String(notif.watch.point.lng), function (v) {
          var n = parseFloat(v);
          if (isFinite(n)) notif.watch.point.lng = n;
        })));
        panel.appendChild(field("Watch Radius (km)", inputText(String(notif.watch.radiusKm || 15), function (v) {
          var n = parseFloat(v);
          if (isFinite(n)) notif.watch.radiusKm = Math.max(1, n);
        })));
        panel.appendChild(renderWatchAreaMapEditor(notif.watch));
        panel.appendChild(field("Watch Polygon GeoJSON", inputTextarea(notif.watch.polygonGeoJson || "", function (v) {
          notif.watch.polygonGeoJson = String(v || "");
        })));
        panel.appendChild(field("Watch MetService Alerts", inputCheckbox(!!notif.watch.sources.metservice, function (v) { notif.watch.sources.metservice = !!v; })));
        panel.appendChild(field("Watch Civil Defence Alerts", inputCheckbox(!!notif.watch.sources.civilDefence, function (v) { notif.watch.sources.civilDefence = !!v; })));
        panel.appendChild(field("Watch Power Outages", inputCheckbox(!!notif.watch.sources.powerOutages, function (v) { notif.watch.sources.powerOutages = !!v; })));
        panel.appendChild(field("Watch Water Outages", inputCheckbox(!!notif.watch.sources.waterOutages, function (v) { notif.watch.sources.waterOutages = !!v; })));
        panel.appendChild(field("Watch NZTA Closures", inputCheckbox(!!notif.watch.sources.nztaClosures, function (v) { notif.watch.sources.nztaClosures = !!v; })));
        panel.appendChild(field("Watch Local Road Closures", inputCheckbox(!!notif.watch.sources.localRoadClosures, function (v) { notif.watch.sources.localRoadClosures = !!v; })));
        panel.appendChild(field("Watch Custom Messages", inputCheckbox(!!notif.watch.sources.customMessages, function (v) { notif.watch.sources.customMessages = !!v; })));
        panel.appendChild(field("Power: Unplanned (Active)", inputCheckbox(!!notif.watch.powerStatuses.unplanned, function (v) { notif.watch.powerStatuses.unplanned = !!v; })));
        panel.appendChild(field("Power: Planned Active", inputCheckbox(!!notif.watch.powerStatuses.plannedActive, function (v) { notif.watch.powerStatuses.plannedActive = !!v; })));
        panel.appendChild(field("Water: New", inputCheckbox(!!notif.watch.waterStatuses["New"], function (v) { notif.watch.waterStatuses["New"] = !!v; })));
        panel.appendChild(field("Water: Under Repairs", inputCheckbox(!!notif.watch.waterStatuses["Under repairs"], function (v) { notif.watch.waterStatuses["Under repairs"] = !!v; })));
        panel.appendChild(field("NZTA: Closure", inputCheckbox(!!notif.watch.nztaTypes.closure, function (v) { notif.watch.nztaTypes.closure = !!v; })));
      }
    }

    if (moduleId === "situation") {
      var mapPanel = ensureObj(data, "mapPanel");
      var alertsPanel = ensureObj(data, "alertsPanel");
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var pageNav = el("div", { class: "editor-subpage-nav", role: "tablist", "aria-label": "Situation editor pages" });

      function pageBtn(pageId, label) {
        var isActive = situationPage === pageId;
        var btn = el("button", {
          type: "button",
          class: "editor-subpage-btn" + (isActive ? " is-active" : ""),
          text: label,
          role: "tab",
          "aria-selected": isActive ? "true" : "false"
        });
        btn.addEventListener("click", function () {
          state.situationPage = pageId;
          renderModulePanel(data, state);
        });
        return btn;
      }

      pageNav.appendChild(pageBtn("overview", "Overview"));
      pageNav.appendChild(pageBtn("map", "Map Page"));
      pageNav.appendChild(pageBtn("alerts", "Alerts Page"));
      pageNav.appendChild(pageBtn("diagnostics", "Diagnostics"));
      panel.appendChild(pageNav);

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.map = data.runtimeConfig.map || {};
      data.runtimeConfig.regionWarnings = data.runtimeConfig.regionWarnings || {};
      if (!Array.isArray(data.runtimeConfig.map.powerOutageStatusFilter)) {
        data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
      }
      if (!Array.isArray(data.runtimeConfig.map.waterOutageStatusFilter)) {
        data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored"];
      }
      data.runtimeConfig.map.layerDrawOrder = normaliseLayerDrawOrder(
        data.runtimeConfig.map.layerDrawOrder
      );
      if (!isFinite(Number(data.runtimeConfig.map.symbolSize))) {
        data.runtimeConfig.map.symbolSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.symbolFontSize))) {
        data.runtimeConfig.map.symbolFontSize = 22;
      }
      if (!isFinite(Number(data.runtimeConfig.map.symbolBorderWidth))) {
        data.runtimeConfig.map.symbolBorderWidth = 2;
      }
      if (!isFinite(Number(data.runtimeConfig.map.clusterSymbolSize))) {
        data.runtimeConfig.map.clusterSymbolSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.clusterSymbolFontSize))) {
        data.runtimeConfig.map.clusterSymbolFontSize = 22;
      }
      if (typeof data.runtimeConfig.map.clusterCountPrefixEnabled !== "boolean") {
        data.runtimeConfig.map.clusterCountPrefixEnabled = true;
      }
      if (typeof data.runtimeConfig.map.clusterCountPrefixText !== "string" || !data.runtimeConfig.map.clusterCountPrefixText.trim()) {
        data.runtimeConfig.map.clusterCountPrefixText = "#";
      }
      if (typeof data.runtimeConfig.map.collisionAvoidanceEnabled !== "boolean") {
        data.runtimeConfig.map.collisionAvoidanceEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.collisionBufferPx))) {
        data.runtimeConfig.map.collisionBufferPx = 6;
      }
      if (!isFinite(Number(data.runtimeConfig.map.metserviceSeverityFillOpacity))) {
        data.runtimeConfig.map.metserviceSeverityFillOpacity = 0.42;
      }
      if (typeof data.runtimeConfig.map.metserviceEventPatternEnabled !== "boolean") {
        data.runtimeConfig.map.metserviceEventPatternEnabled = true;
      }
      if (typeof data.runtimeConfig.map.layerStackPopupEnabled !== "boolean") {
        data.runtimeConfig.map.layerStackPopupEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.layerStackPopupMaxItems))) {
        data.runtimeConfig.map.layerStackPopupMaxItems = 18;
      }
      if (!isFinite(Number(data.runtimeConfig.map.layerStackPopupListMaxHeightPx))) {
        data.runtimeConfig.map.layerStackPopupListMaxHeightPx = 320;
      }
      if (!isFinite(Number(data.runtimeConfig.map.layerStackPopupItemMaxHeightPx))) {
        data.runtimeConfig.map.layerStackPopupItemMaxHeightPx = 180;
      }
      if (typeof data.runtimeConfig.map.layerStackPopupExcludeDecorativeLayers !== "boolean") {
        data.runtimeConfig.map.layerStackPopupExcludeDecorativeLayers = true;
      }
      if (typeof data.runtimeConfig.map.layerStackDisplayMode !== "string" || !data.runtimeConfig.map.layerStackDisplayMode.trim()) {
        data.runtimeConfig.map.layerStackDisplayMode = "popup";
      }
      if (typeof data.runtimeConfig.map.layerStackAutoPanEnabled !== "boolean") {
        data.runtimeConfig.map.layerStackAutoPanEnabled = false;
      }
      if (!isFinite(Number(data.runtimeConfig.map.tideIconSize))) {
        data.runtimeConfig.map.tideIconSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.tideIconFontSize))) {
        data.runtimeConfig.map.tideIconFontSize = 22;
      }
      if (!isFinite(Number(data.runtimeConfig.map.tideHighLowWindowMinutes))) {
        data.runtimeConfig.map.tideHighLowWindowMinutes = 45;
      }
      if (typeof data.runtimeConfig.map.tideColorRising !== "string" || !data.runtimeConfig.map.tideColorRising.trim()) {
        data.runtimeConfig.map.tideColorRising = "#00897b";
      }
      if (typeof data.runtimeConfig.map.tideColorFalling !== "string" || !data.runtimeConfig.map.tideColorFalling.trim()) {
        data.runtimeConfig.map.tideColorFalling = "#546e7a";
      }
      if (typeof data.runtimeConfig.map.tideColorHigh !== "string" || !data.runtimeConfig.map.tideColorHigh.trim()) {
        data.runtimeConfig.map.tideColorHigh = "#2196f3";
      }
      if (typeof data.runtimeConfig.map.tideColorLow !== "string" || !data.runtimeConfig.map.tideColorLow.trim()) {
        data.runtimeConfig.map.tideColorLow = "#ff9800";
      }
      if (typeof data.runtimeConfig.map.tideSymbolRising !== "string" || !data.runtimeConfig.map.tideSymbolRising.trim()) {
        data.runtimeConfig.map.tideSymbolRising = "↑";
      }
      if (typeof data.runtimeConfig.map.tideSymbolFalling !== "string" || !data.runtimeConfig.map.tideSymbolFalling.trim()) {
        data.runtimeConfig.map.tideSymbolFalling = "↓";
      }
      if (typeof data.runtimeConfig.map.tideSymbolHigh !== "string" || !data.runtimeConfig.map.tideSymbolHigh.trim()) {
        data.runtimeConfig.map.tideSymbolHigh = "H";
      }
      if (typeof data.runtimeConfig.map.tideSymbolLow !== "string" || !data.runtimeConfig.map.tideSymbolLow.trim()) {
        data.runtimeConfig.map.tideSymbolLow = "L";
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverIconSize))) {
        data.runtimeConfig.map.riverIconSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverIconFontSize))) {
        data.runtimeConfig.map.riverIconFontSize = 22;
      }
      if (typeof data.runtimeConfig.map.riverSymbolRising !== "string" || !data.runtimeConfig.map.riverSymbolRising.trim()) {
        data.runtimeConfig.map.riverSymbolRising = "↑";
      }
      if (typeof data.runtimeConfig.map.riverSymbolFalling !== "string" || !data.runtimeConfig.map.riverSymbolFalling.trim()) {
        data.runtimeConfig.map.riverSymbolFalling = "↓";
      }
      if (typeof data.runtimeConfig.map.riverSymbolUnknown !== "string" || !data.runtimeConfig.map.riverSymbolUnknown.trim()) {
        data.runtimeConfig.map.riverSymbolUnknown = "R";
      }
      if (typeof data.runtimeConfig.map.riverColorRising !== "string" || !data.runtimeConfig.map.riverColorRising.trim()) {
        data.runtimeConfig.map.riverColorRising = "#1976d2";
      }
      if (typeof data.runtimeConfig.map.riverColorFalling !== "string" || !data.runtimeConfig.map.riverColorFalling.trim()) {
        data.runtimeConfig.map.riverColorFalling = "#f44336";
      }
      if (typeof data.runtimeConfig.map.riverColorDefault !== "string" || !data.runtimeConfig.map.riverColorDefault.trim()) {
        data.runtimeConfig.map.riverColorDefault = "#4caf50";
      }
      if (!isFinite(Number(data.runtimeConfig.map.weatherHubSize))) {
        data.runtimeConfig.map.weatherHubSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.weatherHubFontSize))) {
        data.runtimeConfig.map.weatherHubFontSize = 18;
      }
      if (typeof data.runtimeConfig.map.weatherUseHoverPopup !== "boolean") {
        data.runtimeConfig.map.weatherUseHoverPopup = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowFeelsLike !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowFeelsLike = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowHumidity !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowHumidity = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowWind !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowWind = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowGust !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowGust = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowPrecip !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowPrecip = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupShowToday !== "boolean") {
        data.runtimeConfig.map.weatherPopupShowToday = true;
      }
      if (typeof data.runtimeConfig.map.weatherPopupUseTextLabels !== "boolean") {
        data.runtimeConfig.map.weatherPopupUseTextLabels = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeIconSize))) {
        data.runtimeConfig.map.swimsafeIconSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeIconFontSize))) {
        data.runtimeConfig.map.swimsafeIconFontSize = 22;
      }
      if (typeof data.runtimeConfig.map.swimsafeSymbolCoastal !== "string" || !data.runtimeConfig.map.swimsafeSymbolCoastal.trim()) {
        data.runtimeConfig.map.swimsafeSymbolCoastal = "C";
      }
      if (typeof data.runtimeConfig.map.swimsafeSymbolRiver !== "string" || !data.runtimeConfig.map.swimsafeSymbolRiver.trim()) {
        data.runtimeConfig.map.swimsafeSymbolRiver = "R";
      }
      if (typeof data.runtimeConfig.map.swimsafeSymbolUnknown !== "string" || !data.runtimeConfig.map.swimsafeSymbolUnknown.trim()) {
        data.runtimeConfig.map.swimsafeSymbolUnknown = "S";
      }
      if (typeof data.runtimeConfig.map.swimsafeRiskSymbolVlow !== "string" || !data.runtimeConfig.map.swimsafeRiskSymbolVlow.trim()) {
        data.runtimeConfig.map.swimsafeRiskSymbolVlow = "1";
      }
      if (typeof data.runtimeConfig.map.swimsafeRiskSymbolLow !== "string" || !data.runtimeConfig.map.swimsafeRiskSymbolLow.trim()) {
        data.runtimeConfig.map.swimsafeRiskSymbolLow = "2";
      }
      if (typeof data.runtimeConfig.map.swimsafeRiskSymbolMedium !== "string" || !data.runtimeConfig.map.swimsafeRiskSymbolMedium.trim()) {
        data.runtimeConfig.map.swimsafeRiskSymbolMedium = "3";
      }
      if (typeof data.runtimeConfig.map.swimsafeRiskSymbolHigh !== "string" || !data.runtimeConfig.map.swimsafeRiskSymbolHigh.trim()) {
        data.runtimeConfig.map.swimsafeRiskSymbolHigh = "4";
      }
      if (typeof data.runtimeConfig.map.swimsafeRiskSymbolNoData !== "string" || !data.runtimeConfig.map.swimsafeRiskSymbolNoData.trim()) {
        data.runtimeConfig.map.swimsafeRiskSymbolNoData = "?";
      }
      if (typeof data.runtimeConfig.map.swimsafeColorVlow !== "string" || !data.runtimeConfig.map.swimsafeColorVlow.trim()) {
        data.runtimeConfig.map.swimsafeColorVlow = "#4caf50";
      }
      if (typeof data.runtimeConfig.map.swimsafeColorLow !== "string" || !data.runtimeConfig.map.swimsafeColorLow.trim()) {
        data.runtimeConfig.map.swimsafeColorLow = "#8bc34a";
      }
      if (typeof data.runtimeConfig.map.swimsafeColorMedium !== "string" || !data.runtimeConfig.map.swimsafeColorMedium.trim()) {
        data.runtimeConfig.map.swimsafeColorMedium = "#ff9800";
      }
      if (typeof data.runtimeConfig.map.swimsafeColorHigh !== "string" || !data.runtimeConfig.map.swimsafeColorHigh.trim()) {
        data.runtimeConfig.map.swimsafeColorHigh = "#f44336";
      }
      if (typeof data.runtimeConfig.map.swimsafeColorNoData !== "string" || !data.runtimeConfig.map.swimsafeColorNoData.trim()) {
        data.runtimeConfig.map.swimsafeColorNoData = "#9e9e9e";
      }
      if (typeof data.runtimeConfig.map.baseStyle !== "string" || !data.runtimeConfig.map.baseStyle.trim()) {
        data.runtimeConfig.map.baseStyle = "standard";
      }
      if (typeof data.runtimeConfig.map.legendPosition !== "string" || !data.runtimeConfig.map.legendPosition.trim()) {
        data.runtimeConfig.map.legendPosition = "bottomleft";
      }
      if (typeof data.runtimeConfig.map.autoRefreshEnabled !== "boolean") {
        data.runtimeConfig.map.autoRefreshEnabled = false;
      }
      if (!isFinite(Number(data.runtimeConfig.map.autoRefreshIntervalSeconds))) {
        data.runtimeConfig.map.autoRefreshIntervalSeconds = 300;
      }
      if (typeof data.runtimeConfig.map.tsunamiGreenZoneColor !== "string" || !data.runtimeConfig.map.tsunamiGreenZoneColor.trim()) {
        data.runtimeConfig.map.tsunamiGreenZoneColor = "#2e7d32";
      }
      if (typeof data.runtimeConfig.map.tsunamiBlueZoneColor !== "string" || !data.runtimeConfig.map.tsunamiBlueZoneColor.trim()) {
        data.runtimeConfig.map.tsunamiBlueZoneColor = "#1565c0";
      }
      if (!isFinite(Number(data.runtimeConfig.map.tsunamiGreenZoneFillOpacity))) {
        data.runtimeConfig.map.tsunamiGreenZoneFillOpacity = 0.22;
      }
      if (!isFinite(Number(data.runtimeConfig.map.tsunamiBlueZoneFillOpacity))) {
        data.runtimeConfig.map.tsunamiBlueZoneFillOpacity = 0.18;
      }
      if (!isFinite(Number(data.runtimeConfig.map.tsunamiOutlineWeight))) {
        data.runtimeConfig.map.tsunamiOutlineWeight = 2;
      }
      if (typeof data.runtimeConfig.map.maraeClusterEnabled !== "boolean") {
        data.runtimeConfig.map.maraeClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.maraeClusterBaseRadiusMeters = 2200;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.maraeClusterMaxRadiusMeters = 60000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterBaseZoom))) {
        data.runtimeConfig.map.maraeClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 1.7;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterViewportWidthFactor))) {
        data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0.12;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterMinCount))) {
        data.runtimeConfig.map.maraeClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.powerClusterEnabled !== "boolean") {
        data.runtimeConfig.map.powerClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.powerClusterBaseRadiusMeters = 420;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.powerClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterBaseZoom))) {
        data.runtimeConfig.map.powerClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.powerClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterViewportWidthFactor))) {
        data.runtimeConfig.map.powerClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterMinCount))) {
        data.runtimeConfig.map.powerClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.waterClusterEnabled !== "boolean") {
        data.runtimeConfig.map.waterClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.waterClusterBaseRadiusMeters = 420;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.waterClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterBaseZoom))) {
        data.runtimeConfig.map.waterClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.waterClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterViewportWidthFactor))) {
        data.runtimeConfig.map.waterClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterMinCount))) {
        data.runtimeConfig.map.waterClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.nztaClusterEnabled !== "boolean") {
        data.runtimeConfig.map.nztaClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.nztaClusterBaseRadiusMeters = 450;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.nztaClusterMaxRadiusMeters = 22000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterBaseZoom))) {
        data.runtimeConfig.map.nztaClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterViewportWidthFactor))) {
        data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0.09;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterMinCount))) {
        data.runtimeConfig.map.nztaClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.localRoadClusterEnabled !== "boolean") {
        data.runtimeConfig.map.localRoadClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.localRoadClusterBaseRadiusMeters = 400;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.localRoadClusterMaxRadiusMeters = 20000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterBaseZoom))) {
        data.runtimeConfig.map.localRoadClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterViewportWidthFactor))) {
        data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterMinCount))) {
        data.runtimeConfig.map.localRoadClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.riverClusterEnabled !== "boolean") {
        data.runtimeConfig.map.riverClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.riverClusterBaseRadiusMeters = 500;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.riverClusterMaxRadiusMeters = 22000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterBaseZoom))) {
        data.runtimeConfig.map.riverClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.riverClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterViewportWidthFactor))) {
        data.runtimeConfig.map.riverClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.riverClusterMinCount))) {
        data.runtimeConfig.map.riverClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.communityHallClusterEnabled !== "boolean") {
        data.runtimeConfig.map.communityHallClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.communityHallClusterBaseRadiusMeters = 380;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.communityHallClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterBaseZoom))) {
        data.runtimeConfig.map.communityHallClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.communityHallClusterZoomStepMultiplier = 1.45;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterViewportWidthFactor))) {
        data.runtimeConfig.map.communityHallClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.communityHallClusterMinCount))) {
        data.runtimeConfig.map.communityHallClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.serviceCentreClusterEnabled !== "boolean") {
        data.runtimeConfig.map.serviceCentreClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.serviceCentreClusterBaseRadiusMeters = 380;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.serviceCentreClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterBaseZoom))) {
        data.runtimeConfig.map.serviceCentreClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.serviceCentreClusterZoomStepMultiplier = 1.45;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterViewportWidthFactor))) {
        data.runtimeConfig.map.serviceCentreClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.serviceCentreClusterMinCount))) {
        data.runtimeConfig.map.serviceCentreClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.swimsafeClusterEnabled !== "boolean") {
        data.runtimeConfig.map.swimsafeClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.swimsafeClusterBaseRadiusMeters = 520;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.swimsafeClusterMaxRadiusMeters = 24000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterBaseZoom))) {
        data.runtimeConfig.map.swimsafeClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.swimsafeClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterViewportWidthFactor))) {
        data.runtimeConfig.map.swimsafeClusterViewportWidthFactor = 0.09;
      }
      if (!isFinite(Number(data.runtimeConfig.map.swimsafeClusterMinCount))) {
        data.runtimeConfig.map.swimsafeClusterMinCount = 2;
      }
      state.situationDiagnostics = state.situationDiagnostics || { pageLayouts: {} };
      function safeText(value, maxLen) {
        var text = String(value || "").replace(/\s+/g, " ").trim();
        if (!maxLen || text.length <= maxLen) return text;
        return text.slice(0, Math.max(0, maxLen - 1)) + "...";
      }
      function getElementDescriptor(elm) {
        if (!elm) return "";
        var tag = String(elm.tagName || "").toLowerCase();
        var id = elm.id ? ("#" + elm.id) : "";
        var className = String(elm.className || "").trim();
        var classToken = className ? ("." + className.split(/\s+/).slice(0, 3).join(".")) : "";
        return (tag || "node") + id + classToken;
      }
      function captureViewportDiagnosticsPayload() {
        var docEl = document.documentElement || document.body;
        var bodyEl = document.body || docEl;
        var scrollX = typeof window.scrollX === "number" ? window.scrollX : (window.pageXOffset || 0);
        var scrollY = typeof window.scrollY === "number" ? window.scrollY : (window.pageYOffset || 0);
        var maxElements = 3500;
        var allElements = Array.prototype.slice.call(document.querySelectorAll("*"));
        var clipped = allElements.length > maxElements;
        var sample = clipped ? allElements.slice(0, maxElements) : allElements;
        var viewport = {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
          devicePixelRatio: window.devicePixelRatio || 1,
          scrollX: scrollX,
          scrollY: scrollY,
          pageWidth: Math.max(
            docEl ? (docEl.scrollWidth || 0) : 0,
            bodyEl ? (bodyEl.scrollWidth || 0) : 0
          ),
          pageHeight: Math.max(
            docEl ? (docEl.scrollHeight || 0) : 0,
            bodyEl ? (bodyEl.scrollHeight || 0) : 0
          )
        };
        var elements = sample.map(function (elm, idx) {
          var rect = elm.getBoundingClientRect();
          var style = window.getComputedStyle(elm);
          var role = elm.getAttribute("role") || "";
          var ariaLabel = elm.getAttribute("aria-label") || "";
          var name = elm.getAttribute("name") || "";
          var labelText = "";
          if (elm.id) {
            var labelNode = document.querySelector('label[for="' + elm.id + '"]');
            if (labelNode) labelText = safeText(labelNode.textContent || "", 140);
          }
          return {
            index: idx + 1,
            descriptor: getElementDescriptor(elm),
            tag: String(elm.tagName || "").toLowerCase(),
            id: elm.id || "",
            classes: String(elm.className || "").trim(),
            role: role,
            name: name,
            ariaLabel: ariaLabel,
            labelText: labelText,
            textSample: safeText(elm.textContent || "", 180),
            childCount: elm.children ? elm.children.length : 0,
            rect: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              pageX: Math.round(rect.left + scrollX),
              pageY: Math.round(rect.top + scrollY)
            },
            style: {
              display: style.display,
              position: style.position,
              zIndex: style.zIndex,
              visibility: style.visibility,
              opacity: style.opacity,
              pointerEvents: style.pointerEvents,
              color: style.color,
              backgroundColor: style.backgroundColor,
              border: style.border,
              borderRadius: style.borderRadius,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight
            },
            form: (function () {
              if (!/^(INPUT|TEXTAREA|SELECT)$/.test(elm.tagName || "")) return null;
              return {
                type: elm.type || "",
                value: elm.type === "password" ? "[redacted]" : safeText(elm.value, 200),
                checked: typeof elm.checked === "boolean" ? elm.checked : null,
                disabled: !!elm.disabled,
                placeholder: elm.placeholder || ""
              };
            })()
          };
        });
        return {
          generatedAt: new Date().toISOString(),
          url: String(location.href || ""),
          title: String(document.title || ""),
          viewport: viewport,
          editorState: {
            activeModuleId: state.activeModuleId,
            situationPage: state.situationPage,
            statsPage: state.statsPage,
            focusMode: !!state.focusMode
          },
          sourceDataSnapshot: {
            runtimeConfig: JSON.parse(JSON.stringify(data.runtimeConfig || {})),
            summarySection: JSON.parse(JSON.stringify(data.summarySection || {})),
            statsSection: JSON.parse(JSON.stringify(data.statsSection || {}))
          },
          elementCapture: {
            capturedCount: elements.length,
            totalInDom: allElements.length,
            clipped: clipped,
            clipLimit: maxElements
          },
          elements: elements
        };
      }
      function captureModalDiagnosticsPayload() {
        var drawer = document.querySelector(".editor-drawer");
        var body = document.querySelector(".editor-body");
        var left = document.querySelector(".editor-left");
        var right = document.querySelector(".editor-right");
        var panelNode = document.getElementById("editor-panel");
        var scrollX = typeof window.scrollX === "number" ? window.scrollX : (window.pageXOffset || 0);
        var scrollY = typeof window.scrollY === "number" ? window.scrollY : (window.pageYOffset || 0);
        var fieldNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll(".editor-field")) : [];
        var sectionNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll("h3, h4, .editor-section-block")) : [];
        var controlNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll("input, textarea, select, button")) : [];

        function rectPayload(node) {
          if (!node) return null;
          var rect = node.getBoundingClientRect();
          return {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            pageX: Math.round(rect.left + scrollX),
            pageY: Math.round(rect.top + scrollY)
          };
        }

        function scrollPayload(node) {
          if (!node) return null;
          return {
            scrollTop: Math.round(node.scrollTop || 0),
            scrollLeft: Math.round(node.scrollLeft || 0),
            scrollHeight: Math.round(node.scrollHeight || 0),
            scrollWidth: Math.round(node.scrollWidth || 0),
            clientHeight: Math.round(node.clientHeight || 0),
            clientWidth: Math.round(node.clientWidth || 0)
          };
        }

        var fields = fieldNodes.map(function (fieldEl, idx) {
          var labelEl = fieldEl.querySelector("label");
          var inputEl = fieldEl.querySelector("input, textarea, select");
          return {
            index: idx + 1,
            label: labelEl ? safeText(labelEl.textContent || "", 200) : "(unlabeled)",
            fieldRect: rectPayload(fieldEl),
            inputRect: rectPayload(inputEl),
            inputType: inputEl ? (inputEl.type || String(inputEl.tagName || "").toLowerCase()) : "",
            valueSample: inputEl ? safeText((inputEl.type === "password" ? "[redacted]" : (inputEl.value || "")), 200) : ""
          };
        });

        var controls = controlNodes.map(function (node, idx) {
          var typeName = String(node.tagName || "").toLowerCase();
          return {
            index: idx + 1,
            tag: typeName,
            type: node.type || "",
            id: node.id || "",
            name: node.name || "",
            text: safeText(node.textContent || "", 140),
            ariaLabel: node.getAttribute ? (node.getAttribute("aria-label") || "") : "",
            checked: typeof node.checked === "boolean" ? node.checked : null,
            disabled: !!node.disabled,
            rect: rectPayload(node)
          };
        });

        return {
          generatedAt: new Date().toISOString(),
          activeModuleId: state.activeModuleId || "",
          situationPage: state.situationPage || "",
          statsPage: state.statsPage || "",
          captureModeEnabled: document.body.classList.contains("editor-capture-mode"),
          viewport: {
            width: window.innerWidth || 0,
            height: window.innerHeight || 0,
            scrollX: scrollX,
            scrollY: scrollY
          },
          containers: {
            drawer: {
              rect: rectPayload(drawer),
              scroll: scrollPayload(drawer)
            },
            editorBody: {
              rect: rectPayload(body),
              scroll: scrollPayload(body)
            },
            editorLeft: {
              rect: rectPayload(left),
              scroll: scrollPayload(left)
            },
            editorRight: {
              rect: rectPayload(right),
              scroll: scrollPayload(right)
            },
            editorPanel: {
              rect: rectPayload(panelNode),
              scroll: scrollPayload(panelNode)
            }
          },
          stats: {
            sectionCount: sectionNodes.length,
            fieldCount: fields.length,
            controlCount: controls.length
          },
          sections: sectionNodes.map(function (node, idx) {
            return {
              index: idx + 1,
              descriptor: getElementDescriptor(node),
              text: safeText(node.textContent || "", 180),
              rect: rectPayload(node)
            };
          }),
          fields: fields,
          controls: controls
        };
      }
      function captureSituationPageLayout(pageId) {
        var panelRect = panel.getBoundingClientRect();
        var fieldCoords = Array.prototype.map.call(panel.querySelectorAll(".editor-field"), function (fieldEl, idx) {
          var labelEl = fieldEl.querySelector("label");
          var inputEl = fieldEl.querySelector("input,textarea,select");
          var rect = fieldEl.getBoundingClientRect();
          var inputRect = inputEl ? inputEl.getBoundingClientRect() : rect;
          return {
            index: idx + 1,
            label: labelEl ? String(labelEl.textContent || "").trim() : "(unlabeled)",
            x: Math.round(rect.left - panelRect.left),
            y: Math.round(rect.top - panelRect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            inputX: Math.round(inputRect.left - panelRect.left),
            inputY: Math.round(inputRect.top - panelRect.top),
            inputWidth: Math.round(inputRect.width),
            inputHeight: Math.round(inputRect.height)
          };
        });
        state.situationDiagnostics.pageLayouts[pageId] = {
          capturedAt: new Date().toISOString(),
          panelWidth: Math.round(panelRect.width),
          panelHeight: Math.round(panelRect.height),
          fieldCount: fieldCoords.length,
          fields: fieldCoords
        };
      }
      function buildSituationDiagnosticsPayload() {
        function cloneJson(value) {
          try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
        }
        var pageIds = ["overview", "map", "alerts", "diagnostics"];
        var layouts = cloneJson(state.situationDiagnostics.pageLayouts || {}) || {};
        pageIds.forEach(function (id) {
          if (!layouts[id]) {
            layouts[id] = {
              capturedAt: null,
              fieldCount: 0,
              fields: [],
              status: "not_captured_yet_open_page_to_capture"
            };
          }
        });
        return {
          generatedAt: new Date().toISOString(),
          activePage: situationPage,
          pages: pageIds,
          configSnapshot: {
            mapPanel: cloneJson(mapPanel),
            alertsPanel: cloneJson(alertsPanel),
            runtimeMap: cloneJson(data.runtimeConfig.map),
            runtimeRegionWarnings: cloneJson(data.runtimeConfig.regionWarnings)
          },
          layoutCoordinates: layouts
        };
      }
      if (situationPage === "overview") {
        panel.appendChild(el("h4", { text: "Situation Parent Page" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Use child pages for focused editing. Map Page contains map content and overlay settings. Alerts Page contains alert text and warning runtime settings."
        }));
        panel.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Open Map Page" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Alerts Page" })
        ]));
        panel.lastChild.children[0].addEventListener("click", function () {
          state.situationPage = "map";
          renderModulePanel(data, state);
        });
        panel.lastChild.children[1].addEventListener("click", function () {
          state.situationPage = "alerts";
          renderModulePanel(data, state);
        });
        captureSituationPageLayout("overview");
      } else if (situationPage === "map") {
        function parseCsvList(value) {
          return String(value || "")
            .split(",")
            .map(function (part) { return part.trim(); })
            .filter(Boolean);
        }
        function hasFilterValue(arr, value) {
          return Array.isArray(arr) && arr.indexOf(value) !== -1;
        }
        function toggleFilterValue(arr, value, enabled) {
          var next = Array.isArray(arr) ? arr.slice() : [];
          var idx = next.indexOf(value);
          if (enabled && idx === -1) next.push(value);
          if (!enabled && idx !== -1) next.splice(idx, 1);
          return next;
        }

        panel.appendChild(el("h4", { text: "Map Content" }));
        panel.appendChild(field("Map Title", inputText(mapPanel.title, function (v) { mapPanel.title = v; })));
        panel.appendChild(field("Map Subtitle", inputText(mapPanel.subtitle, function (v) { mapPanel.subtitle = v; })));
        panel.appendChild(field("Map Placeholder Text", inputText(mapPanel.placeholderText, function (v) { mapPanel.placeholderText = v; })));

        panel.appendChild(el("h4", { text: "Map Runtime Settings" }));
        panel.appendChild(field("Layers Control Collapsed", inputCheckbox(data.runtimeConfig.map.layersControlCollapsed !== false, function (v) {
          data.runtimeConfig.map.layersControlCollapsed = !!v;
        })));
        panel.appendChild(field("Map Base Style", inputSelect(
          data.runtimeConfig.map.baseStyle || "standard",
          [
            { value: "standard", label: "Standard (Current Tile Layer)" },
            { value: "hybrid", label: "Hybrid (Imagery + Transport + Labels)" }
          ],
          function (v) {
            data.runtimeConfig.map.baseStyle = String(v || "standard");
          }
        )));
        panel.appendChild(field("Legend Position", inputSelect(
          data.runtimeConfig.map.legendPosition || "bottomleft",
          [
            { value: "bottomleft", label: "Bottom Left (Overlay)" },
            { value: "bottomright", label: "Bottom Right (Overlay)" },
            { value: "topright", label: "Top Right (Overlay)" },
            { value: "topleft", label: "Top Left (Overlay)" },
            { value: "below", label: "Below Map (Wide)" }
          ],
          function (v) {
            data.runtimeConfig.map.legendPosition = String(v || "bottomleft");
          }
        )));
        panel.appendChild(field("Auto Refresh Map Layers", inputCheckbox(
          data.runtimeConfig.map.autoRefreshEnabled === true,
          function (v) {
            data.runtimeConfig.map.autoRefreshEnabled = !!v;
          }
        )));
        panel.appendChild(field("Map Auto Refresh Interval (seconds)", inputText(
          String(data.runtimeConfig.map.autoRefreshIntervalSeconds || 300),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.autoRefreshIntervalSeconds = Math.max(30, Math.min(3600, Math.round(n)));
          },
          "30 to 3600"
        )));
        var mapConnectionBlock = el("section", { class: "editor-section-block" });
        mapConnectionBlock.appendChild(el("h4", { text: "Map Layer Connection Settings" }));
        mapConnectionBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Configure source URL and per-connection proxy usage for map feeds. These settings drive resolved map endpoints."
        }));
        var mapConn = ensureObj(data.runtimeConfig.map, "connectionSettings");
        function ensureMapConn(key, sourceFallback, proxyFallback) {
          var conn = ensureObj(mapConn, key);
          if (typeof conn.sourceUrl !== "string" || !conn.sourceUrl.trim()) conn.sourceUrl = sourceFallback;
          if (typeof conn.useProxy !== "boolean") conn.useProxy = !!proxyFallback;
          return conn;
        }
        var connDefs = [
          { key: "metServiceAtom", label: "MetService Atom", sourceFallback: data.runtimeConfig.regionWarnings.metServiceSourceUrl || data.runtimeConfig.regionWarnings.metServiceAtomUrl || "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml", proxyFallback: true },
          { key: "civilDefenceAtom", label: "Civil Defence Atom", sourceFallback: data.runtimeConfig.regionWarnings.civilDefenceAtomUrl || "https://www.civildefence.govt.nz/home/rss", proxyFallback: true },
          { key: "topEnergyOutages", label: "Top Energy Outages JSON", sourceFallback: "https://outages.topenergy.co.nz/api/outages", proxyFallback: true },
          { key: "topEnergyRegions", label: "Top Energy Regions JSON", sourceFallback: "https://outages.topenergy.co.nz/api/outages/regions", proxyFallback: false },
          { key: "topEnergyKmz", label: "Top Energy KMZ", sourceFallback: "https://outages.topenergy.co.nz/storage/kmz/polygonsActiveAll.kmz", proxyFallback: true },
          { key: "nztaDelays", label: "NZTA Delays JSON", sourceFallback: "https://www.journeys.nzta.govt.nz/assets/map-data-cache/delays.json", proxyFallback: true },
          { key: "localRoadClosures", label: "Local Road Closures JSON", sourceFallback: "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/public/public_closures_FNDC.json", proxyFallback: true },
          { key: "councilAlerts", label: "Council Alerts Messages JSON", sourceFallback: (data.runtimeConfig.customMessages && data.runtimeConfig.customMessages.url) ? data.runtimeConfig.customMessages.url : "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/fned_custom_messages_example.json", proxyFallback: false },
          { key: "geonetEarthquakes", label: "GeoNet Earthquakes WFS", sourceFallback: "https://wfs.geonet.org.nz/geonet/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonet:quake_search_v1&outputFormat=json&cql_filter=depth%3C50+AND+origintime%3E=%272025-01-01%27+AND+DWITHIN(origin_geom,Point+(173.5+-35.2),140000,meters)", proxyFallback: true },
          { key: "geonetCapFeed", label: "GeoNet CAP Feed", sourceFallback: "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/GeoNet/quake-example.xml", proxyFallback: true }
        ];
        var endpointsApi = window.FNED_ENDPOINTS_API || null;
        connDefs.forEach(function (def) {
          var conn = ensureMapConn(def.key, def.sourceFallback, def.proxyFallback);
          var wrap = el("details", { class: "editor-array-block" });
          wrap.appendChild(el("summary", {
            class: "editor-array-summary",
            text: def.label + " (" + (conn.useProxy ? "Proxy On" : "Proxy Off") + ")"
          }));
          wrap.appendChild(field("Source URL", inputText(
            conn.sourceUrl || "",
            function (v) { conn.sourceUrl = String(v || "").trim(); },
            "https://..."
          )));
          wrap.appendChild(field("Use Proxy", inputCheckbox(
            !!conn.useProxy,
            function (v) { conn.useProxy = !!v; }
          )));
          if (endpointsApi && typeof endpointsApi.proxiedUrl === "function") {
            var proxyPrefix = data.runtimeConfig.regionWarnings && data.runtimeConfig.regionWarnings.proxy
              ? String(data.runtimeConfig.regionWarnings.proxy)
              : "https://proxy.corsfix.com/?";
            var resolvedPreview = conn.useProxy
              ? endpointsApi.proxiedUrl(conn.sourceUrl || "", proxyPrefix)
              : String(conn.sourceUrl || "");
            wrap.appendChild(el("p", {
              class: "editor-note",
              text: "Resolved endpoint: " + resolvedPreview
            }));
          }
          mapConnectionBlock.appendChild(wrap);
        });
        mapConnectionBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Global proxy prefix is configured in Alerts Page > Delivery And Formatting > Shared Proxy Prefix."
        }));
        panel.appendChild(mapConnectionBlock);
        panel.appendChild(el("h4", { text: "Tsunami Evacuation Zones" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Controls styling for the combined tsunami evacuation overlay (green and blue zones)."
        }));
        panel.appendChild(field("Green Zone Colour", inputText(
          data.runtimeConfig.map.tsunamiGreenZoneColor || "#2e7d32",
          function (v) {
            data.runtimeConfig.map.tsunamiGreenZoneColor = String(v || "").trim() || "#2e7d32";
          },
          "#2e7d32"
        )));
        panel.appendChild(field("Green Zone Fill Opacity", inputText(
          String(data.runtimeConfig.map.tsunamiGreenZoneFillOpacity || 0.22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tsunamiGreenZoneFillOpacity = Math.max(0.05, Math.min(0.85, n));
          },
          "0.05 to 0.85"
        )));
        panel.appendChild(field("Blue Zone Colour", inputText(
          data.runtimeConfig.map.tsunamiBlueZoneColor || "#1565c0",
          function (v) {
            data.runtimeConfig.map.tsunamiBlueZoneColor = String(v || "").trim() || "#1565c0";
          },
          "#1565c0"
        )));
        panel.appendChild(field("Blue Zone Fill Opacity", inputText(
          String(data.runtimeConfig.map.tsunamiBlueZoneFillOpacity || 0.18),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tsunamiBlueZoneFillOpacity = Math.max(0.05, Math.min(0.85, n));
          },
          "0.05 to 0.85"
        )));
        panel.appendChild(field("Tsunami Outline Weight", inputText(
          String(data.runtimeConfig.map.tsunamiOutlineWeight || 2),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tsunamiOutlineWeight = Math.max(1, Math.min(6, Math.round(n)));
          },
          "1 to 6"
        )));
        var mapIconSizingBlock = el("section", { class: "editor-section-block" });
        mapIconSizingBlock.appendChild(el("h4", { text: "Map Symbol Sizing" }));
        mapIconSizingBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Controls circle and glyph size for all map symbol markers."
        }));
        mapIconSizingBlock.appendChild(field("Symbol Circle Size (px)", inputText(
          String(data.runtimeConfig.map.symbolSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolSize = n;
          },
          "e.g. 44"
        )));
        mapIconSizingBlock.appendChild(field("Symbol Font Size (px)", inputText(
          String(data.runtimeConfig.map.symbolFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolFontSize = n;
          },
          "e.g. 22"
        )));
        mapIconSizingBlock.appendChild(field("Symbol Border Width (px)", inputText(
          String(data.runtimeConfig.map.symbolBorderWidth || 2),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolBorderWidth = n;
          },
          "e.g. 2"
        )));
        mapIconSizingBlock.appendChild(field("Cluster Circle Size (px)", inputText(
          String(data.runtimeConfig.map.clusterSymbolSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.clusterSymbolSize = n;
          },
          "e.g. 44"
        )));
        mapIconSizingBlock.appendChild(field("Cluster Font Size (px)", inputText(
          String(data.runtimeConfig.map.clusterSymbolFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.clusterSymbolFontSize = n;
          },
          "e.g. 22"
        )));
        mapIconSizingBlock.appendChild(field("Cluster Count Prefix Enabled", inputCheckbox(
          data.runtimeConfig.map.clusterCountPrefixEnabled !== false,
          function (v) { data.runtimeConfig.map.clusterCountPrefixEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Cluster Count Prefix Text", inputText(
          data.runtimeConfig.map.clusterCountPrefixText || "#",
          function (v) {
            var text = String(v || "").trim();
            data.runtimeConfig.map.clusterCountPrefixText = text || "#";
          },
          "#"
        )));
        mapIconSizingBlock.appendChild(field("Collision Avoidance (Different Types)", inputCheckbox(
          data.runtimeConfig.map.collisionAvoidanceEnabled !== false,
          function (v) { data.runtimeConfig.map.collisionAvoidanceEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Collision Buffer (px)", inputText(
          String(data.runtimeConfig.map.collisionBufferPx || 6),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.collisionBufferPx = n;
          },
          "e.g. 6"
        )));
        mapIconSizingBlock.appendChild(field("MetService Severity Fill Opacity", inputText(
          String(data.runtimeConfig.map.metserviceSeverityFillOpacity || 0.42),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.metserviceSeverityFillOpacity = n;
          },
          "0.08 to 0.85"
        )));
        mapIconSizingBlock.appendChild(field("MetService Event Icon Overlay", inputCheckbox(
          data.runtimeConfig.map.metserviceEventPatternEnabled !== false,
          function (v) { data.runtimeConfig.map.metserviceEventPatternEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack Popup Enabled", inputCheckbox(
          data.runtimeConfig.map.layerStackPopupEnabled !== false,
          function (v) { data.runtimeConfig.map.layerStackPopupEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack Display Mode", inputSelect(
          data.runtimeConfig.map.layerStackDisplayMode || "popup",
          [
            { value: "popup", label: "Popup At Map Point" },
            { value: "modal", label: "Modal (Lock Map/Page Movement)" }
          ],
          function (v) {
            data.runtimeConfig.map.layerStackDisplayMode = String(v || "popup");
          }
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack Auto Pan To Selection", inputCheckbox(
          data.runtimeConfig.map.layerStackAutoPanEnabled === true,
          function (v) { data.runtimeConfig.map.layerStackAutoPanEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack Max Items", inputText(
          String(data.runtimeConfig.map.layerStackPopupMaxItems || 18),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.layerStackPopupMaxItems = n;
          },
          "e.g. 18"
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack List Max Height (px)", inputText(
          String(data.runtimeConfig.map.layerStackPopupListMaxHeightPx || 320),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.layerStackPopupListMaxHeightPx = n;
          },
          "e.g. 320"
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack Item Max Height (px)", inputText(
          String(data.runtimeConfig.map.layerStackPopupItemMaxHeightPx || 180),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.layerStackPopupItemMaxHeightPx = n;
          },
          "e.g. 180"
        )));
        mapIconSizingBlock.appendChild(field("Layer Stack: Exclude Decorative Overlays", inputCheckbox(
          data.runtimeConfig.map.layerStackPopupExcludeDecorativeLayers !== false,
          function (v) { data.runtimeConfig.map.layerStackPopupExcludeDecorativeLayers = !!v; }
        )));
        var tideLayerBlock = el("section", { class: "editor-section-block" });
        tideLayerBlock.appendChild(el("h4", { text: "Tide Layer Options" }));
        tideLayerBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Configure tide marker size, symbols, colours, and high/low detection window."
        }));
        tideLayerBlock.appendChild(field("Tide Icon Size (px)", inputText(
          String(data.runtimeConfig.map.tideIconSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tideIconSize = n;
          },
          "e.g. 44"
        )));
        tideLayerBlock.appendChild(field("Tide Icon Font Size (px)", inputText(
          String(data.runtimeConfig.map.tideIconFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tideIconFontSize = n;
          },
          "e.g. 22"
        )));
        tideLayerBlock.appendChild(field("High/Low Window (minutes)", inputText(
          String(data.runtimeConfig.map.tideHighLowWindowMinutes || 45),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.tideHighLowWindowMinutes = n;
          },
          "e.g. 45"
        )));
        tideLayerBlock.appendChild(field("Rising Color", inputText(
          data.runtimeConfig.map.tideColorRising || "#00897b",
          function (v) { data.runtimeConfig.map.tideColorRising = String(v || "").trim(); },
          "#00897b"
        )));
        tideLayerBlock.appendChild(field("Lowering Color", inputText(
          data.runtimeConfig.map.tideColorFalling || "#546e7a",
          function (v) { data.runtimeConfig.map.tideColorFalling = String(v || "").trim(); },
          "#546e7a"
        )));
        tideLayerBlock.appendChild(field("High Color", inputText(
          data.runtimeConfig.map.tideColorHigh || "#2196f3",
          function (v) { data.runtimeConfig.map.tideColorHigh = String(v || "").trim(); },
          "#2196f3"
        )));
        tideLayerBlock.appendChild(field("Low Color", inputText(
          data.runtimeConfig.map.tideColorLow || "#ff9800",
          function (v) { data.runtimeConfig.map.tideColorLow = String(v || "").trim(); },
          "#ff9800"
        )));
        tideLayerBlock.appendChild(field("Rising Symbol", inputText(
          data.runtimeConfig.map.tideSymbolRising || "↑",
          function (v) { data.runtimeConfig.map.tideSymbolRising = String(v || "").trim(); },
          "↑"
        )));
        tideLayerBlock.appendChild(field("Lowering Symbol", inputText(
          data.runtimeConfig.map.tideSymbolFalling || "↓",
          function (v) { data.runtimeConfig.map.tideSymbolFalling = String(v || "").trim(); },
          "↓"
        )));
        tideLayerBlock.appendChild(field("High Symbol", inputText(
          data.runtimeConfig.map.tideSymbolHigh || "H",
          function (v) { data.runtimeConfig.map.tideSymbolHigh = String(v || "").trim(); },
          "H"
        )));
        tideLayerBlock.appendChild(field("Low Symbol", inputText(
          data.runtimeConfig.map.tideSymbolLow || "L",
          function (v) { data.runtimeConfig.map.tideSymbolLow = String(v || "").trim(); },
          "L"
        )));
        var riverLayerBlock = el("section", { class: "editor-section-block" });
        riverLayerBlock.appendChild(el("h4", { text: "NRC River Layer Options" }));
        riverLayerBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Configure river marker circles, rising/falling symbols, and trend colours."
        }));
        riverLayerBlock.appendChild(field("River Icon Size (px)", inputText(
          String(data.runtimeConfig.map.riverIconSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.riverIconSize = n;
          },
          "e.g. 44"
        )));
        riverLayerBlock.appendChild(field("River Icon Font Size (px)", inputText(
          String(data.runtimeConfig.map.riverIconFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.riverIconFontSize = n;
          },
          "e.g. 22"
        )));
        riverLayerBlock.appendChild(field("Rising Symbol", inputText(
          data.runtimeConfig.map.riverSymbolRising || "↑",
          function (v) { data.runtimeConfig.map.riverSymbolRising = String(v || "").trim(); },
          "↑"
        )));
        riverLayerBlock.appendChild(field("Falling Symbol", inputText(
          data.runtimeConfig.map.riverSymbolFalling || "↓",
          function (v) { data.runtimeConfig.map.riverSymbolFalling = String(v || "").trim(); },
          "↓"
        )));
        riverLayerBlock.appendChild(field("Unknown Symbol", inputText(
          data.runtimeConfig.map.riverSymbolUnknown || "R",
          function (v) { data.runtimeConfig.map.riverSymbolUnknown = String(v || "").trim(); },
          "R"
        )));
        riverLayerBlock.appendChild(field("Rising Color", inputText(
          data.runtimeConfig.map.riverColorRising || "#1976d2",
          function (v) { data.runtimeConfig.map.riverColorRising = String(v || "").trim(); },
          "#1976d2"
        )));
        riverLayerBlock.appendChild(field("Falling Color", inputText(
          data.runtimeConfig.map.riverColorFalling || "#f44336",
          function (v) { data.runtimeConfig.map.riverColorFalling = String(v || "").trim(); },
          "#f44336"
        )));
        riverLayerBlock.appendChild(field("Default Color", inputText(
          data.runtimeConfig.map.riverColorDefault || "#4caf50",
          function (v) { data.runtimeConfig.map.riverColorDefault = String(v || "").trim(); },
          "#4caf50"
        )));
        var weatherLayerBlock = el("section", { class: "editor-section-block" });
        weatherLayerBlock.appendChild(el("h4", { text: "Weather Layer Options" }));
        weatherLayerBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Configure weather hub marker size and quick-scan popup content."
        }));
        weatherLayerBlock.appendChild(field("Weather Hub Size (px)", inputText(
          String(data.runtimeConfig.map.weatherHubSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.weatherHubSize = n;
          },
          "e.g. 44"
        )));
        weatherLayerBlock.appendChild(field("Weather Hub Font Size (px)", inputText(
          String(data.runtimeConfig.map.weatherHubFontSize || 18),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.weatherHubFontSize = n;
          },
          "e.g. 18"
        )));
        weatherLayerBlock.appendChild(field("Use Hover Popup", inputCheckbox(
          data.runtimeConfig.map.weatherUseHoverPopup !== false,
          function (v) { data.runtimeConfig.map.weatherUseHoverPopup = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Feels Like", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowFeelsLike !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowFeelsLike = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Humidity", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowHumidity !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowHumidity = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Wind", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowWind !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowWind = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Gust", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowGust !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowGust = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Precipitation", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowPrecip !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowPrecip = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Show Today Summary", inputCheckbox(
          data.runtimeConfig.map.weatherPopupShowToday !== false,
          function (v) { data.runtimeConfig.map.weatherPopupShowToday = !!v; }
        )));
        weatherLayerBlock.appendChild(field("Popup: Use Text Labels", inputCheckbox(
          data.runtimeConfig.map.weatherPopupUseTextLabels !== false,
          function (v) { data.runtimeConfig.map.weatherPopupUseTextLabels = !!v; }
        )));
        var swimsafeLayerBlock = el("section", { class: "editor-section-block" });
        swimsafeLayerBlock.appendChild(el("h4", { text: "Swimsafe Layer Options" }));
        swimsafeLayerBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Configure larger Swimsafe symbols and type/risk differentiation."
        }));
        swimsafeLayerBlock.appendChild(field("Swimsafe Icon Size (px)", inputText(
          String(data.runtimeConfig.map.swimsafeIconSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.swimsafeIconSize = n;
          },
          "e.g. 44"
        )));
        swimsafeLayerBlock.appendChild(field("Swimsafe Font Size (px)", inputText(
          String(data.runtimeConfig.map.swimsafeIconFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.swimsafeIconFontSize = n;
          },
          "e.g. 22"
        )));
        swimsafeLayerBlock.appendChild(field("Type Symbol: Coastal", inputText(
          data.runtimeConfig.map.swimsafeSymbolCoastal || "C",
          function (v) { data.runtimeConfig.map.swimsafeSymbolCoastal = String(v || "").trim(); },
          "C"
        )));
        swimsafeLayerBlock.appendChild(field("Type Symbol: River", inputText(
          data.runtimeConfig.map.swimsafeSymbolRiver || "R",
          function (v) { data.runtimeConfig.map.swimsafeSymbolRiver = String(v || "").trim(); },
          "R"
        )));
        swimsafeLayerBlock.appendChild(field("Type Symbol: Unknown", inputText(
          data.runtimeConfig.map.swimsafeSymbolUnknown || "S",
          function (v) { data.runtimeConfig.map.swimsafeSymbolUnknown = String(v || "").trim(); },
          "S"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Symbol: Very Low", inputText(
          data.runtimeConfig.map.swimsafeRiskSymbolVlow || "1",
          function (v) { data.runtimeConfig.map.swimsafeRiskSymbolVlow = String(v || "").trim(); },
          "1"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Symbol: Low", inputText(
          data.runtimeConfig.map.swimsafeRiskSymbolLow || "2",
          function (v) { data.runtimeConfig.map.swimsafeRiskSymbolLow = String(v || "").trim(); },
          "2"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Symbol: Moderate", inputText(
          data.runtimeConfig.map.swimsafeRiskSymbolMedium || "3",
          function (v) { data.runtimeConfig.map.swimsafeRiskSymbolMedium = String(v || "").trim(); },
          "3"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Symbol: High", inputText(
          data.runtimeConfig.map.swimsafeRiskSymbolHigh || "4",
          function (v) { data.runtimeConfig.map.swimsafeRiskSymbolHigh = String(v || "").trim(); },
          "4"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Symbol: No Data", inputText(
          data.runtimeConfig.map.swimsafeRiskSymbolNoData || "?",
          function (v) { data.runtimeConfig.map.swimsafeRiskSymbolNoData = String(v || "").trim(); },
          "?"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Color: Very Low", inputText(
          data.runtimeConfig.map.swimsafeColorVlow || "#4caf50",
          function (v) { data.runtimeConfig.map.swimsafeColorVlow = String(v || "").trim(); },
          "#4caf50"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Color: Low", inputText(
          data.runtimeConfig.map.swimsafeColorLow || "#8bc34a",
          function (v) { data.runtimeConfig.map.swimsafeColorLow = String(v || "").trim(); },
          "#8bc34a"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Color: Moderate", inputText(
          data.runtimeConfig.map.swimsafeColorMedium || "#ff9800",
          function (v) { data.runtimeConfig.map.swimsafeColorMedium = String(v || "").trim(); },
          "#ff9800"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Color: High", inputText(
          data.runtimeConfig.map.swimsafeColorHigh || "#f44336",
          function (v) { data.runtimeConfig.map.swimsafeColorHigh = String(v || "").trim(); },
          "#f44336"
        )));
        swimsafeLayerBlock.appendChild(field("Risk Color: No Data", inputText(
          data.runtimeConfig.map.swimsafeColorNoData || "#9e9e9e",
          function (v) { data.runtimeConfig.map.swimsafeColorNoData = String(v || "").trim(); },
          "#9e9e9e"
        )));
        panel.appendChild(swimsafeLayerBlock);
        panel.appendChild(riverLayerBlock);
        panel.appendChild(weatherLayerBlock);
        panel.appendChild(tideLayerBlock);
        panel.appendChild(mapIconSizingBlock);

        function renderMapClusterSettingsBlock(defn) {
          var block = el("section", { class: "editor-section-block" });
          block.appendChild(el("h4", { text: defn.title }));
          block.appendChild(el("p", {
            class: "editor-note",
            text: "Zoom-responsive clustering settings for this layer."
          }));
          block.appendChild(field("Enable", inputCheckbox(
            data.runtimeConfig.map[defn.key + "Enabled"] !== false,
            function (v) { data.runtimeConfig.map[defn.key + "Enabled"] = !!v; }
          )));
          block.appendChild(field("Base Radius (meters)", inputText(
            String(data.runtimeConfig.map[defn.key + "BaseRadiusMeters"] || defn.baseRadius),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "BaseRadiusMeters"] = n;
            },
            "e.g. " + String(defn.baseRadius)
          )));
          block.appendChild(field("Max Radius (meters)", inputText(
            String(data.runtimeConfig.map[defn.key + "MaxRadiusMeters"] || defn.maxRadius),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "MaxRadiusMeters"] = n;
            },
            "e.g. " + String(defn.maxRadius)
          )));
          block.appendChild(field("Base Zoom", inputText(
            String(data.runtimeConfig.map[defn.key + "BaseZoom"] || defn.baseZoom),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "BaseZoom"] = n;
            },
            "e.g. " + String(defn.baseZoom)
          )));
          block.appendChild(field("Zoom Step Multiplier", inputText(
            String(data.runtimeConfig.map[defn.key + "ZoomStepMultiplier"] || defn.multiplier),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "ZoomStepMultiplier"] = n;
            },
            "e.g. " + String(defn.multiplier)
          )));
          block.appendChild(field("Viewport Width Factor", inputText(
            String(data.runtimeConfig.map[defn.key + "ViewportWidthFactor"] || defn.viewportFactor),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "ViewportWidthFactor"] = n;
            },
            "e.g. " + String(defn.viewportFactor)
          )));
          block.appendChild(field("Minimum Count", inputText(
            String(data.runtimeConfig.map[defn.key + "MinCount"] || defn.minCount),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "MinCount"] = n;
            },
            "e.g. " + String(defn.minCount)
          )));
          return block;
        }

        [
          { title: "Marae Clustering", key: "maraeCluster", baseRadius: 2200, maxRadius: 60000, baseZoom: 8, multiplier: 1.7, viewportFactor: 0.12, minCount: 2 },
          { title: "Power Outages Clustering", key: "powerCluster", baseRadius: 420, maxRadius: 18000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "Water Outages Clustering", key: "waterCluster", baseRadius: 420, maxRadius: 18000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "NZTA Clustering", key: "nztaCluster", baseRadius: 450, maxRadius: 22000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.09, minCount: 2 },
          { title: "Local Road Clustering", key: "localRoadCluster", baseRadius: 400, maxRadius: 20000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "NRC River Clustering", key: "riverCluster", baseRadius: 500, maxRadius: 22000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "Community Hall Clustering", key: "communityHallCluster", baseRadius: 380, maxRadius: 18000, baseZoom: 8, multiplier: 1.45, viewportFactor: 0.08, minCount: 2 },
          { title: "Service Centre Clustering", key: "serviceCentreCluster", baseRadius: 380, maxRadius: 18000, baseZoom: 8, multiplier: 1.45, viewportFactor: 0.08, minCount: 2 },
          { title: "Swimsafe Clustering", key: "swimsafeCluster", baseRadius: 520, maxRadius: 24000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.09, minCount: 2 }
        ].forEach(function (defn) {
          panel.appendChild(renderMapClusterSettingsBlock(defn));
        });

        var mapLayerFiltersBlock = el("section", { class: "editor-section-block" });
        mapLayerFiltersBlock.appendChild(el("h4", { text: "Map Layer Filters" }));
        mapLayerFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "These filters control map markers only (Power Outages and Water Outages layers)."
        }));

        var mapPowerStatusDetails = el("details", { class: "editor-array-block" });
        mapPowerStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Power Outage Map Statuses (" + String((data.runtimeConfig.map.powerOutageStatusFilter || []).length) + " selected)"
        }));
        ["unplanned", "plannedActive", "planned"].forEach(function (statusType) {
          mapPowerStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(data.runtimeConfig.map.powerOutageStatusFilter, statusType),
            function (v) {
              data.runtimeConfig.map.powerOutageStatusFilter = toggleFilterValue(
                data.runtimeConfig.map.powerOutageStatusFilter,
                statusType,
                !!v
              );
            }
          )));
        });
        mapPowerStatusDetails.appendChild(field("Power Map Status CSV (Advanced)", inputText(
          (data.runtimeConfig.map.powerOutageStatusFilter || []).join(", "),
          function (v) { data.runtimeConfig.map.powerOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        mapLayerFiltersBlock.appendChild(mapPowerStatusDetails);

        var mapWaterStatusDetails = el("details", { class: "editor-array-block" });
        mapWaterStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Map Statuses (" + String((data.runtimeConfig.map.waterOutageStatusFilter || []).length) + " selected)"
        }));
        ["New", "Reported", "Under repairs", "Planned", "Restored", "Current", "Unplanned", "Resolved"].forEach(function (statusType) {
          mapWaterStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(data.runtimeConfig.map.waterOutageStatusFilter, statusType),
            function (v) {
              data.runtimeConfig.map.waterOutageStatusFilter = toggleFilterValue(
                data.runtimeConfig.map.waterOutageStatusFilter,
                statusType,
                !!v
              );
            }
          )));
        });
        mapWaterStatusDetails.appendChild(field("Water Map Status CSV (Advanced)", inputText(
          (data.runtimeConfig.map.waterOutageStatusFilter || []).join(", "),
          function (v) { data.runtimeConfig.map.waterOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        mapLayerFiltersBlock.appendChild(mapWaterStatusDetails);

        var mapFilterActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Map Filters: Defaults" }),
          el("button", { type: "button", class: "editor-btn", text: "Map Filters: Show All" })
        ]);
        mapFilterActions.children[0].addEventListener("click", function () {
          data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored"];
          data.runtimeConfig.map.symbolSize = 44;
          data.runtimeConfig.map.symbolFontSize = 22;
          data.runtimeConfig.map.symbolBorderWidth = 2;
          data.runtimeConfig.map.clusterSymbolSize = 44;
          data.runtimeConfig.map.clusterSymbolFontSize = 22;
          data.runtimeConfig.map.clusterCountPrefixEnabled = true;
          data.runtimeConfig.map.clusterCountPrefixText = "#";
          data.runtimeConfig.map.collisionAvoidanceEnabled = true;
          data.runtimeConfig.map.collisionBufferPx = 6;
          data.runtimeConfig.map.metserviceSeverityFillOpacity = 0.42;
          data.runtimeConfig.map.metserviceEventPatternEnabled = true;
          data.runtimeConfig.map.layerStackPopupEnabled = true;
          data.runtimeConfig.map.layerStackPopupMaxItems = 18;
          data.runtimeConfig.map.layerStackPopupListMaxHeightPx = 320;
          data.runtimeConfig.map.layerStackPopupItemMaxHeightPx = 180;
          data.runtimeConfig.map.layerStackPopupExcludeDecorativeLayers = true;
          data.runtimeConfig.map.layerStackDisplayMode = "popup";
          data.runtimeConfig.map.layerStackAutoPanEnabled = false;
          data.runtimeConfig.map.tideIconSize = 44;
          data.runtimeConfig.map.tideIconFontSize = 22;
          data.runtimeConfig.map.tideHighLowWindowMinutes = 45;
          data.runtimeConfig.map.tideColorRising = "#00897b";
          data.runtimeConfig.map.tideColorFalling = "#546e7a";
          data.runtimeConfig.map.tideColorHigh = "#2196f3";
          data.runtimeConfig.map.tideColorLow = "#ff9800";
          data.runtimeConfig.map.tideSymbolRising = "↑";
          data.runtimeConfig.map.tideSymbolFalling = "↓";
          data.runtimeConfig.map.tideSymbolHigh = "H";
          data.runtimeConfig.map.tideSymbolLow = "L";
          data.runtimeConfig.map.riverIconSize = 44;
          data.runtimeConfig.map.riverIconFontSize = 22;
          data.runtimeConfig.map.riverSymbolRising = "↑";
          data.runtimeConfig.map.riverSymbolFalling = "↓";
          data.runtimeConfig.map.riverSymbolUnknown = "R";
          data.runtimeConfig.map.riverColorRising = "#1976d2";
          data.runtimeConfig.map.riverColorFalling = "#f44336";
          data.runtimeConfig.map.riverColorDefault = "#4caf50";
          data.runtimeConfig.map.weatherHubSize = 44;
          data.runtimeConfig.map.weatherHubFontSize = 18;
          data.runtimeConfig.map.weatherUseHoverPopup = true;
          data.runtimeConfig.map.weatherPopupShowFeelsLike = true;
          data.runtimeConfig.map.weatherPopupShowHumidity = true;
          data.runtimeConfig.map.weatherPopupShowWind = true;
          data.runtimeConfig.map.weatherPopupShowGust = true;
          data.runtimeConfig.map.weatherPopupShowPrecip = true;
          data.runtimeConfig.map.weatherPopupShowToday = true;
          data.runtimeConfig.map.weatherPopupUseTextLabels = true;
          data.runtimeConfig.map.swimsafeIconSize = 44;
          data.runtimeConfig.map.swimsafeIconFontSize = 22;
          data.runtimeConfig.map.swimsafeSymbolCoastal = "C";
          data.runtimeConfig.map.swimsafeSymbolRiver = "R";
          data.runtimeConfig.map.swimsafeSymbolUnknown = "S";
          data.runtimeConfig.map.swimsafeRiskSymbolVlow = "1";
          data.runtimeConfig.map.swimsafeRiskSymbolLow = "2";
          data.runtimeConfig.map.swimsafeRiskSymbolMedium = "3";
          data.runtimeConfig.map.swimsafeRiskSymbolHigh = "4";
          data.runtimeConfig.map.swimsafeRiskSymbolNoData = "?";
          data.runtimeConfig.map.swimsafeColorVlow = "#4caf50";
          data.runtimeConfig.map.swimsafeColorLow = "#8bc34a";
          data.runtimeConfig.map.swimsafeColorMedium = "#ff9800";
          data.runtimeConfig.map.swimsafeColorHigh = "#f44336";
          data.runtimeConfig.map.swimsafeColorNoData = "#9e9e9e";
          data.runtimeConfig.map.baseStyle = "standard";
          data.runtimeConfig.map.legendPosition = "bottomleft";
          data.runtimeConfig.map.autoRefreshEnabled = false;
          data.runtimeConfig.map.autoRefreshIntervalSeconds = 300;
          data.runtimeConfig.map.tsunamiGreenZoneColor = "#2e7d32";
          data.runtimeConfig.map.tsunamiBlueZoneColor = "#1565c0";
          data.runtimeConfig.map.tsunamiGreenZoneFillOpacity = 0.22;
          data.runtimeConfig.map.tsunamiBlueZoneFillOpacity = 0.18;
          data.runtimeConfig.map.tsunamiOutlineWeight = 2;
          data.runtimeConfig.map.maraeClusterEnabled = true;
          data.runtimeConfig.map.maraeClusterBaseRadiusMeters = 2200;
          data.runtimeConfig.map.maraeClusterMaxRadiusMeters = 60000;
          data.runtimeConfig.map.maraeClusterBaseZoom = 8;
          data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 1.7;
          data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0.12;
          data.runtimeConfig.map.maraeClusterMinCount = 2;
          data.runtimeConfig.map.powerClusterEnabled = true;
          data.runtimeConfig.map.powerClusterBaseRadiusMeters = 420;
          data.runtimeConfig.map.powerClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.powerClusterBaseZoom = 8;
          data.runtimeConfig.map.powerClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.powerClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.powerClusterMinCount = 2;
          data.runtimeConfig.map.waterClusterEnabled = true;
          data.runtimeConfig.map.waterClusterBaseRadiusMeters = 420;
          data.runtimeConfig.map.waterClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.waterClusterBaseZoom = 8;
          data.runtimeConfig.map.waterClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.waterClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.waterClusterMinCount = 2;
          data.runtimeConfig.map.nztaClusterEnabled = true;
          data.runtimeConfig.map.nztaClusterBaseRadiusMeters = 450;
          data.runtimeConfig.map.nztaClusterMaxRadiusMeters = 22000;
          data.runtimeConfig.map.nztaClusterBaseZoom = 8;
          data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0.09;
          data.runtimeConfig.map.nztaClusterMinCount = 2;
          data.runtimeConfig.map.localRoadClusterEnabled = true;
          data.runtimeConfig.map.localRoadClusterBaseRadiusMeters = 400;
          data.runtimeConfig.map.localRoadClusterMaxRadiusMeters = 20000;
          data.runtimeConfig.map.localRoadClusterBaseZoom = 8;
          data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.localRoadClusterMinCount = 2;
          data.runtimeConfig.map.riverClusterEnabled = true;
          data.runtimeConfig.map.riverClusterBaseRadiusMeters = 500;
          data.runtimeConfig.map.riverClusterMaxRadiusMeters = 22000;
          data.runtimeConfig.map.riverClusterBaseZoom = 8;
          data.runtimeConfig.map.riverClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.riverClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.riverClusterMinCount = 2;
          data.runtimeConfig.map.communityHallClusterEnabled = true;
          data.runtimeConfig.map.communityHallClusterBaseRadiusMeters = 380;
          data.runtimeConfig.map.communityHallClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.communityHallClusterBaseZoom = 8;
          data.runtimeConfig.map.communityHallClusterZoomStepMultiplier = 1.45;
          data.runtimeConfig.map.communityHallClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.communityHallClusterMinCount = 2;
          data.runtimeConfig.map.serviceCentreClusterEnabled = true;
          data.runtimeConfig.map.serviceCentreClusterBaseRadiusMeters = 380;
          data.runtimeConfig.map.serviceCentreClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.serviceCentreClusterBaseZoom = 8;
          data.runtimeConfig.map.serviceCentreClusterZoomStepMultiplier = 1.45;
          data.runtimeConfig.map.serviceCentreClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.serviceCentreClusterMinCount = 2;
          data.runtimeConfig.map.swimsafeClusterEnabled = true;
          data.runtimeConfig.map.swimsafeClusterBaseRadiusMeters = 520;
          data.runtimeConfig.map.swimsafeClusterMaxRadiusMeters = 24000;
          data.runtimeConfig.map.swimsafeClusterBaseZoom = 8;
          data.runtimeConfig.map.swimsafeClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.swimsafeClusterViewportWidthFactor = 0.09;
          data.runtimeConfig.map.swimsafeClusterMinCount = 2;
          data.runtimeConfig.map.defaultVisibleOverlays = null;
          data.runtimeConfig.map.layerDrawOrder = KNOWN_OVERLAY_NAMES.slice();
          renderModulePanel(data, state);
        });
        mapFilterActions.children[1].addEventListener("click", function () {
          data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored", "Current", "Unplanned", "Resolved"];
          renderModulePanel(data, state);
        });
        mapLayerFiltersBlock.appendChild(mapFilterActions);
        panel.appendChild(mapLayerFiltersBlock);

        panel.appendChild(el("h4", { text: "Enabled Overlays" }));
        panel.appendChild(renderOverlayPicker(data.runtimeConfig.map, function () {
          renderModulePanel(data, state);
        }));
        panel.appendChild(el("h4", { text: "Default Visible Layers" }));
        panel.appendChild(renderDefaultVisibleOverlayPicker(data.runtimeConfig.map, function () {
          renderModulePanel(data, state);
        }));
        panel.appendChild(el("h4", { text: "Layer Draw Order" }));
        panel.appendChild(renderLayerDrawOrderPicker(data.runtimeConfig.map, function () {
          renderModulePanel(data, state);
        }));
        captureSituationPageLayout("map");
      } else if (situationPage === "diagnostics") {
        var diagnosticsBlock = el("section", { class: "editor-section-block" });
        var diagnosticsPayload = buildSituationDiagnosticsPayload();
        var viewportPayload = captureViewportDiagnosticsPayload();
        diagnosticsBlock.appendChild(el("h4", { text: "Situation Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Contains page config snapshots and captured field coordinates for each visited sub-page."
        }));
        diagnosticsBlock.appendChild(field("Diagnostics JSON", inputTextarea(
          JSON.stringify(diagnosticsPayload, null, 2),
          function () {},
          ""
        )));
        var diagTextarea = diagnosticsBlock.querySelector("textarea");
        if (diagTextarea) {
          diagTextarea.readOnly = true;
          diagTextarea.style.minHeight = "360px";
        }
        diagnosticsBlock.appendChild(el("h4", { text: "Full Page Viewport Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Captures element names, coordinates, style summary, form values, and viewport metadata for complete screen diagnostics."
        }));
        diagnosticsBlock.appendChild(field("Viewport JSON", inputTextarea(
          JSON.stringify(viewportPayload, null, 2),
          function () {},
          ""
        )));
        var viewportTextarea = diagnosticsBlock.querySelectorAll("textarea");
        var viewportTextareaNode = viewportTextarea && viewportTextarea.length ? viewportTextarea[viewportTextarea.length - 1] : null;
        if (viewportTextareaNode) {
          viewportTextareaNode.readOnly = true;
          viewportTextareaNode.style.minHeight = "420px";
        }
        diagnosticsBlock.appendChild(el("h4", { text: "Editor Modal Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Captures full editor-modal structure, visible controls, coordinates, and scroll metrics so POV review can evaluate content outside the current viewport."
        }));
        diagnosticsBlock.appendChild(field("Modal JSON", inputTextarea(
          JSON.stringify(captureModalDiagnosticsPayload(), null, 2),
          function () {},
          ""
        )));
        var modalTextareaList = diagnosticsBlock.querySelectorAll("textarea");
        var modalTextareaNode = modalTextareaList && modalTextareaList.length ? modalTextareaList[modalTextareaList.length - 1] : null;
        if (modalTextareaNode) {
          modalTextareaNode.readOnly = true;
          modalTextareaNode.style.minHeight = "420px";
        }
        diagnosticsBlock.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Refresh Diagnostics" }),
          el("button", { type: "button", class: "editor-btn", text: "Download Viewport JSON" }),
          el("button", { type: "button", class: "editor-btn", text: "Download Modal JSON" })
        ]));
        diagnosticsBlock.lastChild.children[0].addEventListener("click", function () {
          renderModulePanel(data, state);
        });
        diagnosticsBlock.lastChild.children[1].addEventListener("click", function () {
          var stamp = new Date().toISOString().replace(/[:.]/g, "-");
          downloadText("fned_viewport_diagnostics_" + stamp + ".json", JSON.stringify(captureViewportDiagnosticsPayload(), null, 2), "application/json");
        });
        diagnosticsBlock.lastChild.children[2].addEventListener("click", function () {
          var stamp = new Date().toISOString().replace(/[:.]/g, "-");
          downloadText("fned_modal_diagnostics_" + stamp + ".json", JSON.stringify(captureModalDiagnosticsPayload(), null, 2), "application/json");
        });
        panel.appendChild(diagnosticsBlock);
        captureSituationPageLayout("diagnostics");
      } else {
        panel.classList.add("editor-panel-alerts-page");
        var rwasDefaults = window.FNED_RWAS_DEFAULTS || {};
        var bundledLinzApiKey = "27a1097e44b44690a5c7726aa065a076";
        var bundledLinzLayerUrl = "https://data.linz.govt.nz/services;key=27a1097e44b44690a5c7726aa065a076/wfs/layer-113763/";
        var bundledLinzTypeName = "layer-113763";
        var bundledLinzApiKeyParam = "api_key";
        var defaultCustomGeoAreas = {};
        var defaultAreaDisplayOrder = [];
        try {
          if (rwasDefaults.customGeoAreas && typeof rwasDefaults.customGeoAreas === "object" && !Array.isArray(rwasDefaults.customGeoAreas)) {
            defaultCustomGeoAreas = JSON.parse(JSON.stringify(rwasDefaults.customGeoAreas));
          }
        } catch (e) {
          defaultCustomGeoAreas = {};
        }
        if (Array.isArray(rwasDefaults.areaDisplayOrder)) {
          defaultAreaDisplayOrder = rwasDefaults.areaDisplayOrder.slice();
        }

        function applyRwasAreaDefaults() {
          data.runtimeConfig.regionWarnings.customGeoAreas = JSON.parse(JSON.stringify(defaultCustomGeoAreas));
          data.runtimeConfig.regionWarnings.areaDisplayOrder = defaultAreaDisplayOrder.slice();
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function getEffectiveCustomGeoAreas() {
          var areas = data.runtimeConfig.regionWarnings.customGeoAreas;
          if (!areas || typeof areas !== "object" || Array.isArray(areas)) {
            areas = defaultCustomGeoAreas;
          }
          if (!areas || typeof areas !== "object" || Array.isArray(areas)) {
            areas = {};
          }
          return areas;
        }

        function getEffectiveAreaDisplayOrder() {
          var order = data.runtimeConfig.regionWarnings.areaDisplayOrder;
          if (Array.isArray(order)) {
            return order.slice();
          }
          return defaultAreaDisplayOrder.slice();
        }

        function getAreaConsistency() {
          var areaKeys = Object.keys(getEffectiveCustomGeoAreas());
          var order = getEffectiveAreaDisplayOrder();
          var keySet = {};
          var missingInOrder = [];
          var extraInOrder = [];
          areaKeys.forEach(function (k) { keySet[k] = true; });
          areaKeys.forEach(function (k) {
            if (order.indexOf(k) === -1) missingInOrder.push(k);
          });
          order.forEach(function (k) {
            if (!keySet[k]) extraInOrder.push(k);
          });
          return {
            areaKeys: areaKeys,
            order: order,
            missingInOrder: missingInOrder,
            extraInOrder: extraInOrder
          };
        }

        function syncOrderToAreaKeys() {
          data.runtimeConfig.regionWarnings.areaDisplayOrder = Object.keys(getEffectiveCustomGeoAreas());
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function mergeOrderWithAreaKeys() {
          var consistency = getAreaConsistency();
          var merged = consistency.order.filter(function (name) {
            return consistency.areaKeys.indexOf(name) !== -1;
          });
          consistency.areaKeys.forEach(function (name) {
            if (merged.indexOf(name) === -1) merged.push(name);
          });
          data.runtimeConfig.regionWarnings.areaDisplayOrder = merged;
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function buildOrderFromRwasPriority() {
          var areaKeys = Object.keys(getEffectiveCustomGeoAreas());
          var prioritized = [];
          defaultAreaDisplayOrder.forEach(function (name) {
            if (areaKeys.indexOf(name) !== -1 && prioritized.indexOf(name) === -1) {
              prioritized.push(name);
            }
          });
          areaKeys
            .filter(function (name) { return prioritized.indexOf(name) === -1; })
            .sort(function (a, b) { return a.localeCompare(b); })
            .forEach(function (name) { prioritized.push(name); });
          data.runtimeConfig.regionWarnings.areaDisplayOrder = prioritized;
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function getDefaultAreaEntries() {
          return Object.keys(defaultCustomGeoAreas).map(function (name) {
            return { name: name, url: defaultCustomGeoAreas[name] };
          });
        }

        function isDefaultAreaEnabled(areaName) {
          var current = getEffectiveCustomGeoAreas();
          return Object.prototype.hasOwnProperty.call(current, areaName);
        }

        function triggerRegionWarningsReload() {
          if (typeof window.FNED_REGION_WARNINGS_RELOAD === "function") {
            window.FNED_REGION_WARNINGS_RELOAD();
          }
        }

        function getLinzSelectedAreas() {
          var list = data.runtimeConfig.regionWarnings.linzSelectedAreas;
          return Array.isArray(list) ? list.slice() : [];
        }

        function setLinzSelectedAreas(list) {
          data.runtimeConfig.regionWarnings.linzSelectedAreas = list.slice();
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
        }

        function toggleLinzArea(areaName, enabled) {
          var selected = getLinzSelectedAreas();
          var has = selected.indexOf(areaName) !== -1;
          if (enabled && !has) selected.push(areaName);
          if (!enabled && has) selected = selected.filter(function (name) { return name !== areaName; });
          setLinzSelectedAreas(selected);
          renderModulePanel(data, state);
        }

        function setFilteredLinzAreasEnabled(names, enabled) {
          var selected = getLinzSelectedAreas();
          var selectedMap = {};
          selected.forEach(function (name) { selectedMap[name] = true; });
          names.forEach(function (name) {
            if (enabled) {
              selectedMap[name] = true;
            } else {
              delete selectedMap[name];
            }
          });
          setLinzSelectedAreas(Object.keys(selectedMap));
          renderModulePanel(data, state);
        }

        function ensureLinzAreaListLoaded() {
          if (state.alertsLinzAreaListLoading || Array.isArray(state.alertsLinzAreaList)) return;
          if (!window.FNED_LINZ_AREAS_API || typeof window.FNED_LINZ_AREAS_API.getAreaList !== "function") {
            state.alertsLinzAreaListError = "LINZ area API is unavailable.";
            return;
          }
          state.alertsLinzAreaListLoading = true;
          state.alertsLinzAreaListError = "";
          window.FNED_LINZ_AREAS_API.getAreaList(false).then(function (list) {
            state.alertsLinzAreaList = Array.isArray(list) ? list : [];
            if (typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
              state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
            }
            state.alertsLinzAreaListLoading = false;
            renderModulePanel(data, state);
          }).catch(function (err) {
            var baseErr = (err && err.message) ? String(err.message) : "Failed to load LINZ area list.";
            var proxyOff = !(data && data.runtimeConfig && data.runtimeConfig.regionWarnings && data.runtimeConfig.regionWarnings.useProxyForLinzAreas);
            var likelyCors = /cors|failed to fetch|networkerror/i.test(baseErr);
            if (proxyOff && likelyCors) {
              state.alertsLinzAreaListError = "LINZ direct fetch failed due to browser CORS restrictions. Re-enable 'Use LINZ Proxy' or use a CORS-enabled endpoint.";
            } else {
              state.alertsLinzAreaListError = baseErr;
            }
            if (typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
              state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
            }
            state.alertsLinzAreaListLoading = false;
            renderModulePanel(data, state);
          });
        }

        function setDefaultAreaEnabled(areaName, enabled) {
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            next[key] = current[key];
          });
          if (enabled) {
            next[areaName] = defaultCustomGeoAreas[areaName];
          } else {
            delete next[areaName];
          }
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function setAllDefaultAreasEnabled(enabled) {
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = current[key];
            }
          });
          if (enabled) {
            Object.keys(defaultCustomGeoAreas).forEach(function (key) {
              next[key] = defaultCustomGeoAreas[key];
            });
          }
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function applyDefaultAreaGroup(group) {
          var groups = {
            northland_core: ["Far North", "\u014ctur\u016b Marae", "Whang\u0101rei District"],
            southern_set: ["Gisborne", "Nelson", "Southland"]
          };
          var selected = groups[group] || [];
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = current[key];
            }
          });
          selected.forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = defaultCustomGeoAreas[key];
            }
          });
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function applyAlertsPreset(mode) {
          var rw = data.runtimeConfig.regionWarnings;
          if (!rw) return;
          if (mode === "local_strict") {
            rw.showExpiredAlerts = false;
            rw.showNonFarNorthAlerts = false;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 24;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "regional_watch") {
            rw.showExpiredAlerts = true;
            rw.showNonFarNorthAlerts = true;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 72;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "cd_focus") {
            rw.showExpiredAlerts = false;
            rw.showNonFarNorthAlerts = true;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 48;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = true;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = true;
          }
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function applyAlertsScopeMode(mode) {
          var rw = data.runtimeConfig.regionWarnings;
          var linzSelectedCount = Array.isArray(rw && rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (!rw) return;
          state.alertsLinzScopeNotice = "";
          if (mode === "far_north_only") {
            rw.showNonFarNorthAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "all_areas") {
            rw.showNonFarNorthAlerts = true;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
          } else if (mode === "custom_geo") {
            rw.showCustomGeoJsonAlerts = true;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = false;
          } else if (mode === "linz_only") {
            if (linzSelectedCount === 0) {
              state.alertsLinzScopeNotice = "Select at least one LINZ area before enabling LINZ scope mode.";
              ensureLinzAreaListLoaded();
              renderModulePanel(data, state);
              return;
            }
            rw.showCustomGeoJsonAlerts = false;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = true;
          } else if (mode === "custom_plus_linz") {
            if (linzSelectedCount === 0) {
              state.alertsLinzScopeNotice = "Select at least one LINZ area before enabling Custom + LINZ mode.";
              ensureLinzAreaListLoaded();
              renderModulePanel(data, state);
              return;
            }
            rw.showCustomGeoJsonAlerts = true;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = true;
          }
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function getAlertsScopeSummary() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          var linzCount = Array.isArray(rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (rw.showCustomGeoJsonAlerts && rw.useLinzAreas) {
            return "Custom + LINZ mode active (" + customCount + " custom and " + linzCount + " LINZ areas).";
          }
          if (rw.showCustomGeoJsonAlerts) {
            return "Custom-Geo mode active (" + customCount + " areas). Alerts are filtered by selected custom areas and Far North (unless disabled).";
          }
          if (rw.useLinzAreas) {
            return "LINZ mode active (" + linzCount + " areas). Alerts are filtered by selected LINZ suburbs/localities.";
          }
          if (rw.showNonFarNorthAlerts) {
            return "All-areas mode active. Alerts from all areas can appear.";
          }
          if (rw.disableFarNorthAlerts) {
            return "Far North matching is disabled and custom-area mode is off, so alerts may be hidden.";
          }
          return "Far-North-only mode active. Only alerts intersecting the Far North area appear.";
        }

        function getAlertsScopeWarnings() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var warnings = [];
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          var linzCount = Array.isArray(rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (rw.disableFarNorthAlerts && !rw.showCustomGeoJsonAlerts && !rw.useLinzAreas && !rw.showNonFarNorthAlerts) {
            warnings.push("No area source is active. Enable All Areas, Custom Geo, LINZ, or untick Disable Far North Alerts.");
          }
          if (rw.showCustomGeoJsonAlerts && customCount === 0) {
            warnings.push("Custom-area mode is on but no custom areas are active.");
          }
          if (rw.useLinzAreas && linzCount === 0) {
            warnings.push("LINZ mode is on but no LINZ areas are selected.");
          }
          if ((rw.showCustomGeoJsonAlerts || rw.useLinzAreas) && rw.showNonFarNorthAlerts) {
            warnings.push("Custom/LINZ filtering takes priority over All Areas while enabled.");
          }
          return warnings;
        }

        function repairAlertsScopeWarnings() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          if (rw.disableFarNorthAlerts && !rw.showCustomGeoJsonAlerts && !rw.useLinzAreas && !rw.showNonFarNorthAlerts) {
            rw.showNonFarNorthAlerts = true;
          }
          if (rw.showCustomGeoJsonAlerts && customCount === 0) {
            rw.showCustomGeoJsonAlerts = false;
            rw.showNonFarNorthAlerts = true;
          }
          if (rw.useLinzAreas && (!Array.isArray(rw.linzSelectedAreas) || !rw.linzSelectedAreas.length)) {
            rw.useLinzAreas = false;
            rw.showNonFarNorthAlerts = true;
          }
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        var presetBlock = el("section", { class: "editor-section-block" });
        var timingBlock = el("section", { class: "editor-section-block" });
        var feedsBlock = el("section", { class: "editor-section-block" });
        var deliveryBlock = el("section", { class: "editor-section-block" });
        var customGeoBlock = el("section", { class: "editor-section-block" });

        panel.appendChild(el("h4", { text: "Alerts Content" }));
        panel.appendChild(field("Alerts Title", inputText(alertsPanel.title, function (v) { alertsPanel.title = v; })));
        panel.appendChild(field("Alerts Subtitle", inputText(alertsPanel.subtitle, function (v) { alertsPanel.subtitle = v; })));
        panel.appendChild(field("Alerts Lead", inputTextarea(alertsPanel.lead, function (v) { alertsPanel.lead = v; })));

        presetBlock.appendChild(el("h4", { text: "Quick Presets" }));
        presetBlock.appendChild(el("p", { class: "editor-note", text: "Apply a baseline profile, then fine-tune fields below." }));
        var presetButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Local Strict" }),
          el("button", { type: "button", class: "editor-btn", text: "Regional Watch" }),
          el("button", { type: "button", class: "editor-btn", text: "Civil Defence Focus" })
        ]);
        presetButtons.children[0].addEventListener("click", function () { applyAlertsPreset("local_strict"); });
        presetButtons.children[1].addEventListener("click", function () { applyAlertsPreset("regional_watch"); });
        presetButtons.children[2].addEventListener("click", function () { applyAlertsPreset("cd_focus"); });
        presetBlock.appendChild(presetButtons);

        timingBlock.appendChild(el("h4", { text: "Timing And Scope" }));
        timingBlock.appendChild(el("p", { class: "editor-note", text: "Control which warnings appear by time window and geographic filtering." }));
        timingBlock.appendChild(el("h5", { text: "Area Filter Mode" }));
        timingBlock.appendChild(el("p", { class: "editor-note", text: getAlertsScopeSummary() }));
        if (state.alertsLinzScopeNotice) {
          timingBlock.appendChild(el("p", { class: "editor-note", text: state.alertsLinzScopeNotice }));
        }
        var scopeWarnings = getAlertsScopeWarnings();
        if (scopeWarnings.length) {
          timingBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Scope warning: " + scopeWarnings.join(" | ")
          }));
          var fixScopeBtn = buttonRow([
            el("button", { type: "button", class: "editor-btn", text: "Repair Scope Warnings" })
          ]);
          fixScopeBtn.children[0].addEventListener("click", function () { repairAlertsScopeWarnings(); });
          timingBlock.appendChild(fixScopeBtn);
        }
        var scopeButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Far North Only" }),
          el("button", { type: "button", class: "editor-btn", text: "All Areas" }),
          el("button", { type: "button", class: "editor-btn", text: "Custom Geo" }),
          el("button", { type: "button", class: "editor-btn", text: "LINZ" }),
          el("button", { type: "button", class: "editor-btn", text: "Custom + LINZ" })
        ]);
        scopeButtons.children[0].addEventListener("click", function () { applyAlertsScopeMode("far_north_only"); });
        scopeButtons.children[1].addEventListener("click", function () { applyAlertsScopeMode("all_areas"); });
        scopeButtons.children[2].addEventListener("click", function () { applyAlertsScopeMode("custom_geo"); });
        scopeButtons.children[3].addEventListener("click", function () { applyAlertsScopeMode("linz_only"); });
        scopeButtons.children[4].addEventListener("click", function () { applyAlertsScopeMode("custom_plus_linz"); });
        var currentLinzSelectedCount = Array.isArray(data.runtimeConfig.regionWarnings.linzSelectedAreas)
          ? data.runtimeConfig.regionWarnings.linzSelectedAreas.length
          : 0;
        if (currentLinzSelectedCount === 0) {
          scopeButtons.children[3].disabled = true;
          scopeButtons.children[4].disabled = true;
        }
        timingBlock.appendChild(scopeButtons);
        timingBlock.appendChild(field("Show Expired Alerts", inputCheckbox(!!data.runtimeConfig.regionWarnings.showExpiredAlerts, function (v) {
          data.runtimeConfig.regionWarnings.showExpiredAlerts = !!v;
        })));
        timingBlock.appendChild(field("Show Non Far North Alerts", inputCheckbox(!!data.runtimeConfig.regionWarnings.showNonFarNorthAlerts, function (v) {
          data.runtimeConfig.regionWarnings.showNonFarNorthAlerts = !!v;
          triggerRegionWarningsReload();
        })));
        timingBlock.appendChild(field("Require Onset Within Window", inputCheckbox(
          data.runtimeConfig.regionWarnings.requireOnsetWithinWindow !== false,
          function (v) { data.runtimeConfig.regionWarnings.requireOnsetWithinWindow = !!v; }
        )));
        timingBlock.appendChild(field("Onset Window (hours)", inputText(
          String(data.runtimeConfig.regionWarnings.hourWindow || 24),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.hourWindow = n;
          }
        )));
        timingBlock.appendChild(field("Proxy URL Prefix", inputText(
          data.runtimeConfig.regionWarnings.proxy || "",
          function (v) { data.runtimeConfig.regionWarnings.proxy = v; },
          "Example: https://corsproxy.io/?"
        )));

        feedsBlock.appendChild(el("h4", { text: "Feed Sources" }));
        feedsBlock.appendChild(el("p", { class: "editor-note", text: "Override source feeds and Civil Defence inclusion behavior." }));
        feedsBlock.appendChild(field("MetService Source URL", inputText(
          data.runtimeConfig.regionWarnings.metServiceSourceUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.metServiceSourceUrl = v; }
        )));
        feedsBlock.appendChild(field("MetService Atom Feed URL (Override)", inputText(
          data.runtimeConfig.regionWarnings.metServiceAtomUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.metServiceAtomUrl = v; },
          "Optional direct atom URL"
        )));
        feedsBlock.appendChild(field("Enable Civil Defence Alerts", inputCheckbox(
          data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts !== false,
          function (v) { data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts = !!v; }
        )));
        feedsBlock.appendChild(field("Civil Defence Atom URL", inputText(
          data.runtimeConfig.regionWarnings.civilDefenceAtomUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.civilDefenceAtomUrl = v; }
        )));
        feedsBlock.appendChild(field("Civil Defence Atom Feed URL (Override)", inputText(
          data.runtimeConfig.regionWarnings.civilDefenceAtomFeedUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.civilDefenceAtomFeedUrl = v; },
          "Optional direct atom URL"
        )));
        feedsBlock.appendChild(field("Show Cancelled Civil Defence Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts,
          function (v) { data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts = !!v; }
        )));

        deliveryBlock.appendChild(el("h4", { text: "Delivery And Formatting" }));
        deliveryBlock.appendChild(el("p", { class: "editor-note", text: "Tune shared fetch behavior and alert date formatting output." }));
        deliveryBlock.appendChild(field("Fetch Timeout (ms)", inputText(
          String(data.runtimeConfig.regionWarnings.fetchTimeoutMs || 15000),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.fetchTimeoutMs = n;
          }
        )));
        deliveryBlock.appendChild(field("Fetch Retries", inputText(
          String(data.runtimeConfig.regionWarnings.fetchRetries || 1),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.fetchRetries = n;
          }
        )));
        deliveryBlock.appendChild(field("Time Locale", inputText(
          data.runtimeConfig.regionWarnings.timeLocale || "",
          function (v) { data.runtimeConfig.regionWarnings.timeLocale = v; },
          "Example: en-NZ"
        )));
        deliveryBlock.appendChild(field("Time Zone", inputText(
          data.runtimeConfig.regionWarnings.timeZone || "",
          function (v) { data.runtimeConfig.regionWarnings.timeZone = v; },
          "Example: Pacific/Auckland"
        )));

        var customGeoAreasJson = "";
        try {
          var currentAreas = data.runtimeConfig.regionWarnings.customGeoAreas;
          if (!currentAreas || typeof currentAreas !== "object" || Array.isArray(currentAreas)) {
            currentAreas = defaultCustomGeoAreas;
          }
          customGeoAreasJson = JSON.stringify(currentAreas || {}, null, 2);
        } catch (e) {
          customGeoAreasJson = "";
        }

        customGeoBlock.appendChild(el("h4", { text: "Custom Geo Area Options" }));
        customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Enable and control alerts for custom area GeoJSON definitions." }));
        customGeoBlock.appendChild(el("h5", { text: "LINZ Suburb/Locality Areas" }));
        function applyLinzConfigReload() {
          if (window.FNED_LINZ_AREAS_API && typeof window.FNED_LINZ_AREAS_API.clearCache === "function") {
            window.FNED_LINZ_AREAS_API.clearCache();
          }
          delete state.alertsLinzAreaList;
          delete state.alertsLinzStatus;
          state.alertsLinzAreaListError = "";
          state.alertsLinzAreaListLoading = false;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          ensureLinzAreaListLoaded();
          renderModulePanel(data, state);
        }
        customGeoBlock.appendChild(field("Use LINZ Areas", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.useLinzAreas,
          function (v) {
            data.runtimeConfig.regionWarnings.useLinzAreas = !!v;
            triggerRegionWarningsReload();
            renderModulePanel(data, state);
          }
        )));
        if (typeof data.runtimeConfig.regionWarnings.useProxyForLinzAreas !== "boolean") {
          data.runtimeConfig.regionWarnings.useProxyForLinzAreas = true;
        }
        customGeoBlock.appendChild(field("Use LINZ Proxy", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.useProxyForLinzAreas,
          function (v) {
            data.runtimeConfig.regionWarnings.useProxyForLinzAreas = !!v;
            triggerRegionWarningsReload();
            renderModulePanel(data, state);
          }
        )));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Turning LINZ proxy off may cause browser CORS failures depending on endpoint behavior."
        }));
        data.runtimeConfig.regionWarnings.linzForceBundledSource = true;
        data.runtimeConfig.regionWarnings.linzSuburbLayerUrl = bundledLinzLayerUrl;
        data.runtimeConfig.regionWarnings.linzApiKey = bundledLinzApiKey;
        data.runtimeConfig.regionWarnings.linzApiKeyParam = bundledLinzApiKeyParam;
        data.runtimeConfig.regionWarnings.linzWfsTypeName = bundledLinzTypeName;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ source is fixed to bundled defaults. Key, layer URL, and type name are auto-managed."
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ endpoint: " + bundledLinzLayerUrl
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ type name: " + bundledLinzTypeName
        }));
        var runtimeLinzState = (window.FNED_RWAS_RUNTIME && typeof window.FNED_RWAS_RUNTIME === "object")
          ? window.FNED_RWAS_RUNTIME
          : null;
        var runtimeKeyParam = runtimeLinzState && runtimeLinzState.linzApiKeyParam ? String(runtimeLinzState.linzApiKeyParam) : "(unknown)";
        var runtimeHasKey = runtimeLinzState ? !!runtimeLinzState.linzApiKeyConfigured : false;
        var runtimeLayerUrl = runtimeLinzState && runtimeLinzState.linzLayerUrl ? String(runtimeLinzState.linzLayerUrl) : "(unknown)";
        var runtimeTypeName = runtimeLinzState && runtimeLinzState.linzWfsTypeName ? String(runtimeLinzState.linzWfsTypeName) : "(unknown)";
        var runtimeBundled = runtimeLinzState ? (runtimeLinzState.linzForceBundledSource !== false) : true;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ key state: configured param=" + bundledLinzApiKeyParam + ", runtime param=" + runtimeKeyParam
            + "; configured key=yes"
            + ", runtime key=" + (runtimeHasKey ? "yes" : "no") + "."
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ runtime source: " + (runtimeBundled ? "bundled" : "custom") + "; layer=" + runtimeLayerUrl + "; type=" + runtimeTypeName + "."
        }));
        var runtimeSelectedLinzCount = runtimeLinzState && Array.isArray(runtimeLinzState.selectedLinzAreas)
          ? runtimeLinzState.selectedLinzAreas.length
          : 0;
        var runtimeLoadedLinzCount = runtimeLinzState && Array.isArray(runtimeLinzState.loadedLinzAreaNames)
          ? runtimeLinzState.loadedLinzAreaNames.length
          : 0;
        if (runtimeSelectedLinzCount > 0 && runtimeLoadedLinzCount === 0) {
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "LINZ warning: selected areas are set but none are loaded. Alerts fall back to base area scope until LINZ data loads."
          }));
        }
        if (runtimeLinzState && (!runtimeBundled || runtimeKeyParam !== bundledLinzApiKeyParam || !runtimeHasKey || runtimeLayerUrl !== bundledLinzLayerUrl || runtimeTypeName !== bundledLinzTypeName)) {
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Runtime differs from bundled LINZ source. Click Reapply Bundled LINZ Source to sync."
          }));
        }
        var linzActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Reapply Bundled LINZ Source" }),
          el("button", { type: "button", class: "editor-btn", text: "Retry LINZ Area Load" })
        ]);
        linzActions.children[0].addEventListener("click", function () {
          data.runtimeConfig.regionWarnings.linzForceBundledSource = true;
          data.runtimeConfig.regionWarnings.linzSuburbLayerUrl = bundledLinzLayerUrl;
          data.runtimeConfig.regionWarnings.linzApiKey = bundledLinzApiKey;
          data.runtimeConfig.regionWarnings.linzApiKeyParam = bundledLinzApiKeyParam;
          data.runtimeConfig.regionWarnings.linzWfsTypeName = bundledLinzTypeName;
          applyLinzConfigReload();
        });
        linzActions.children[1].addEventListener("click", function () {
          if (window.FNED_LINZ_AREAS_API && typeof window.FNED_LINZ_AREAS_API.clearCache === "function") {
            window.FNED_LINZ_AREAS_API.clearCache();
          }
          delete state.alertsLinzAreaList;
          delete state.alertsLinzStatus;
          state.alertsLinzAreaListError = "";
          state.alertsLinzAreaListLoading = false;
          ensureLinzAreaListLoaded();
          renderModulePanel(data, state);
        });
        customGeoBlock.appendChild(linzActions);
        if (typeof window.FNED_LINZ_AREAS_API === "object" && typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
          state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
        }
        if (state.alertsLinzStatus && state.alertsLinzStatus.loaded) {
          var fetchedLabel = "";
          try {
            fetchedLabel = new Date(state.alertsLinzStatus.fetchedAt).toLocaleString();
          } catch (e) {
            fetchedLabel = String(state.alertsLinzStatus.fetchedAt || "");
          }
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "LINZ cache: " + (state.alertsLinzStatus.count || 0) + " areas loaded at " + fetchedLabel + "."
          }));
        }
        if (data.runtimeConfig.regionWarnings.useLinzAreas) {
          ensureLinzAreaListLoaded();
          state.alertsLinzSearch = state.alertsLinzSearch || "";
          state.alertsLinzShowSelectedOnly = !!state.alertsLinzShowSelectedOnly;
          var linzSearchInput = inputText(
            state.alertsLinzSearch,
            function (v, inputEl) {
              state.alertsLinzSearch = v || "";
              state.alertsLinzPage = 1;
              state.alertsLinzSearchRefocus = true;
              state.alertsLinzSearchCursor = inputEl && typeof inputEl.selectionStart === "number"
                ? inputEl.selectionStart
                : state.alertsLinzSearch.length;
              renderModulePanel(data, state);
            },
            "Search suburb/locality name"
          );
          customGeoBlock.appendChild(field("Search LINZ Areas", linzSearchInput));
          if (state.alertsLinzSearchRefocus) {
            setTimeout(function () {
              if (!linzSearchInput) return;
              try {
                linzSearchInput.focus();
                var pos = (typeof state.alertsLinzSearchCursor === "number")
                  ? state.alertsLinzSearchCursor
                  : String(linzSearchInput.value || "").length;
                linzSearchInput.setSelectionRange(pos, pos);
              } catch (_focusErr) {
                // Ignore focus restore errors.
              }
              state.alertsLinzSearchRefocus = false;
            }, 0);
          }
          customGeoBlock.appendChild(field("Show Selected LINZ Areas Only", inputCheckbox(
            !!state.alertsLinzShowSelectedOnly,
            function (v) {
              state.alertsLinzShowSelectedOnly = !!v;
              renderModulePanel(data, state);
            }
          )));
          var selectedLinzAreas = getLinzSelectedAreas();
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Selected LINZ areas: " + selectedLinzAreas.length
          }));
          var clearSelectedBtn = buttonRow([
            el("button", { type: "button", class: "editor-btn", text: "Clear All Selected LINZ Areas" })
          ]);
          clearSelectedBtn.children[0].addEventListener("click", function () {
            setLinzSelectedAreas([]);
            renderModulePanel(data, state);
          });
          customGeoBlock.appendChild(clearSelectedBtn);
          if (state.alertsLinzAreaListLoading) {
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Loading LINZ area list..." }));
          } else if (state.alertsLinzAreaListError) {
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "LINZ area list error: " + state.alertsLinzAreaListError }));
          } else if (Array.isArray(state.alertsLinzAreaList)) {
            var query = String(state.alertsLinzSearch || "").toLowerCase().trim();
            var filteredLinz = state.alertsLinzAreaList.filter(function (item) {
              var matchSearch = !query || String(item.name || "").toLowerCase().indexOf(query) !== -1;
              if (!matchSearch) return false;
              if (state.alertsLinzShowSelectedOnly) {
                return selectedLinzAreas.indexOf(item.name) !== -1;
              }
              return true;
            });
            state.alertsLinzPageSize = parseInt(state.alertsLinzPageSize, 10);
            if (isNaN(state.alertsLinzPageSize) || state.alertsLinzPageSize < 25) state.alertsLinzPageSize = 100;
            state.alertsLinzPage = parseInt(state.alertsLinzPage, 10);
            if (isNaN(state.alertsLinzPage) || state.alertsLinzPage < 1) state.alertsLinzPage = 1;
            var totalPages = Math.max(1, Math.ceil(filteredLinz.length / state.alertsLinzPageSize));
            if (state.alertsLinzPage > totalPages) state.alertsLinzPage = totalPages;
            var pageStart = (state.alertsLinzPage - 1) * state.alertsLinzPageSize;
            var pageEnd = Math.min(pageStart + state.alertsLinzPageSize, filteredLinz.length);
            var pageItems = filteredLinz.slice(pageStart, pageEnd);
            customGeoBlock.appendChild(field("LINZ List Page Size", inputText(
              String(state.alertsLinzPageSize),
              function (v) {
                var n = parseInt(v, 10);
                if (!isNaN(n) && n >= 25 && n <= 500) {
                  state.alertsLinzPageSize = n;
                  state.alertsLinzPage = 1;
                }
                renderModulePanel(data, state);
              },
              "25-500"
            )));
            customGeoBlock.appendChild(el("p", {
              class: "editor-note",
              text: "Showing " + (filteredLinz.length ? (pageStart + 1) : 0) + "-" + pageEnd + " of " + filteredLinz.length + " matching LINZ areas (north to south order)."
            }));
            var filteredNames = filteredLinz.map(function (item) { return item.name; });
            var linzBulkButtons = buttonRow([
              el("button", { type: "button", class: "editor-btn", text: "Select Filtered LINZ Areas" }),
              el("button", { type: "button", class: "editor-btn", text: "Clear Filtered LINZ Areas" })
            ]);
            linzBulkButtons.children[0].addEventListener("click", function () {
              setFilteredLinzAreasEnabled(filteredNames, true);
            });
            linzBulkButtons.children[1].addEventListener("click", function () {
              setFilteredLinzAreasEnabled(filteredNames, false);
            });
            customGeoBlock.appendChild(linzBulkButtons);
            var linzPageButtons = buttonRow([
              el("button", { type: "button", class: "editor-btn", text: "Prev Page" }),
              el("button", { type: "button", class: "editor-btn", text: "Next Page" })
            ]);
            linzPageButtons.children[0].disabled = state.alertsLinzPage <= 1;
            linzPageButtons.children[1].disabled = state.alertsLinzPage >= totalPages;
            linzPageButtons.children[0].addEventListener("click", function () {
              state.alertsLinzPage = Math.max(1, state.alertsLinzPage - 1);
              renderModulePanel(data, state);
            });
            linzPageButtons.children[1].addEventListener("click", function () {
              state.alertsLinzPage = Math.min(totalPages, state.alertsLinzPage + 1);
              renderModulePanel(data, state);
            });
            customGeoBlock.appendChild(linzPageButtons);
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Page " + state.alertsLinzPage + " of " + totalPages + "." }));
            pageItems.forEach(function (item) {
              customGeoBlock.appendChild(field(item.name, inputCheckbox(
                selectedLinzAreas.indexOf(item.name) !== -1,
                function (v) { toggleLinzArea(item.name, !!v); }
              )));
            });
          }
        }
        var areaDefaultButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Apply RWAS Defaults (Areas + Order)" }),
          el("button", { type: "button", class: "editor-btn", text: "Reset Order To RWAS Default" })
        ]);
        areaDefaultButtons.children[0].addEventListener("click", function () {
          applyRwasAreaDefaults();
        });
        areaDefaultButtons.children[1].addEventListener("click", function () {
          data.runtimeConfig.regionWarnings.areaDisplayOrder = defaultAreaDisplayOrder.slice();
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        });
        customGeoBlock.appendChild(areaDefaultButtons);
        customGeoBlock.appendChild(el("h5", { text: "Default Area Tickboxes" }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Use tickboxes to include or exclude each default area (equivalent to uncomment/comment in defaults)."
        }));
        var defaultAreaToggleButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Tick All Default Areas" }),
          el("button", { type: "button", class: "editor-btn", text: "Untick All Default Areas" })
        ]);
        defaultAreaToggleButtons.children[0].addEventListener("click", function () {
          setAllDefaultAreasEnabled(true);
        });
        defaultAreaToggleButtons.children[1].addEventListener("click", function () {
          setAllDefaultAreasEnabled(false);
        });
        customGeoBlock.appendChild(defaultAreaToggleButtons);
        var selectedDefaultCount = getDefaultAreaEntries().filter(function (entry) {
          return isDefaultAreaEnabled(entry.name);
        }).length;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Selected default areas: " + selectedDefaultCount + " of " + getDefaultAreaEntries().length
        }));
        var defaultGroupButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Northland Core Set" }),
          el("button", { type: "button", class: "editor-btn", text: "Southern Set" })
        ]);
        defaultGroupButtons.children[0].addEventListener("click", function () {
          applyDefaultAreaGroup("northland_core");
        });
        defaultGroupButtons.children[1].addEventListener("click", function () {
          applyDefaultAreaGroup("southern_set");
        });
        customGeoBlock.appendChild(defaultGroupButtons);
        getDefaultAreaEntries().forEach(function (entry) {
          customGeoBlock.appendChild(field(entry.name, inputCheckbox(
            isDefaultAreaEnabled(entry.name),
            function (v) { setDefaultAreaEnabled(entry.name, !!v); }
          )));
        });
        var areaConsistency = getAreaConsistency();
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Area consistency: " +
            (areaConsistency.missingInOrder.length ? ("missing in order -> " + areaConsistency.missingInOrder.join(", ")) : "no missing area names in order") +
            "; " +
            (areaConsistency.extraInOrder.length ? ("order has names not in active areas -> " + areaConsistency.extraInOrder.join(", ")) : "no extra order names")
        }));
        var areaSyncButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Sync Order To Area Keys" }),
          el("button", { type: "button", class: "editor-btn", text: "Merge Order + Missing Keys" }),
          el("button", { type: "button", class: "editor-btn", text: "Order By RWAS Priority" })
        ]);
        areaSyncButtons.children[0].addEventListener("click", function () {
          syncOrderToAreaKeys();
        });
        areaSyncButtons.children[1].addEventListener("click", function () {
          mergeOrderWithAreaKeys();
        });
        areaSyncButtons.children[2].addEventListener("click", function () {
          buildOrderFromRwasPriority();
        });
        customGeoBlock.appendChild(areaSyncButtons);
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: state.alertsAreaJsonError
            ? ("Custom Geo Areas JSON: invalid JSON - " + state.alertsAreaJsonError)
            : ("Custom Geo Areas JSON: valid (" + Object.keys(getEffectiveCustomGeoAreas()).length + " area names)")
        }));
        customGeoBlock.appendChild(field("Show Custom GeoJSON Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.showCustomGeoJsonAlerts,
          function (v) {
            data.runtimeConfig.regionWarnings.showCustomGeoJsonAlerts = !!v;
            triggerRegionWarningsReload();
          }
        )));
        customGeoBlock.appendChild(field("Use Proxy For Custom GeoJSON", inputCheckbox(
          data.runtimeConfig.regionWarnings.useProxyForCustomGeoJson !== false,
          function (v) {
            data.runtimeConfig.regionWarnings.useProxyForCustomGeoJson = !!v;
            triggerRegionWarningsReload();
          }
        )));
        customGeoBlock.appendChild(field("Far North GeoJSON URL", inputText(
          data.runtimeConfig.regionWarnings.farNorthGeoJsonUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.farNorthGeoJsonUrl = v; }
        )));
        customGeoBlock.appendChild(field("GeoJSON Cache Expiry (hours)", inputText(
          String(data.runtimeConfig.regionWarnings.geoJsonExpiryHours || 24),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.geoJsonExpiryHours = n;
          }
        )));
        customGeoBlock.appendChild(field("Custom Geo Areas JSON", inputTextarea(
          customGeoAreasJson,
          function (v) {
            var trimmed = String(v || "").trim();
            if (!trimmed) {
              delete data.runtimeConfig.regionWarnings.customGeoAreas;
              state.alertsAreaJsonError = "";
              return;
            }
            try {
              var parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                data.runtimeConfig.regionWarnings.customGeoAreas = parsed;
                state.alertsAreaJsonError = "";
              }
            } catch (e) {
              state.alertsAreaJsonError = e && e.message ? e.message : "Parse error";
            }
          },
          "{\"Area Name\": \"https://...geojson\"}"
        )));
        customGeoBlock.appendChild(field("Area Display Order", inputTextarea(
          Array.isArray(data.runtimeConfig.regionWarnings.areaDisplayOrder)
            ? data.runtimeConfig.regionWarnings.areaDisplayOrder.join(", ")
            : defaultAreaDisplayOrder.join(", "),
          function (v) {
            var list = String(v || "")
              .split(/[\n,]+/)
              .map(function (part) { return part.trim(); })
              .filter(Boolean);
            if (!list.length) {
              delete data.runtimeConfig.regionWarnings.areaDisplayOrder;
              return;
            }
            data.runtimeConfig.regionWarnings.areaDisplayOrder = list;
          },
          "Far North District, Whangarei District"
        )));
        customGeoBlock.appendChild(field("Disable Far North Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.disableFarNorthAlerts,
          function (v) {
            data.runtimeConfig.regionWarnings.disableFarNorthAlerts = !!v;
            triggerRegionWarningsReload();
          }
        )));

        panel.appendChild(presetBlock);
        panel.appendChild(timingBlock);
        panel.appendChild(feedsBlock);
        panel.appendChild(deliveryBlock);
        panel.appendChild(customGeoBlock);
        captureSituationPageLayout("alerts");
      }
    }

    if (moduleId === "summary") {
      var summaryPanel = ensureObj(data, "summaryPanel");
      panel.appendChild(field("Panel Title", inputText(summaryPanel.title, function (v) { summaryPanel.title = v; })));

      panel.appendChild(renderArrayEditor({
        title: "Paragraphs",
        arr: Array.isArray(summaryPanel.paragraphs) ? summaryPanel.paragraphs : (summaryPanel.paragraphs = []),
        getSummary: function (item) { return (item || "").slice(0, 48) + ((item && item.length > 48) ? "..." : ""); },
        addNewItem: function () { return "New paragraph"; },
        renderItemFields: function (item, idx) {
          var box = el("div");
          box.appendChild(field("Text", inputTextarea(item, function (v) { summaryPanel.paragraphs[idx] = v; }, "")));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.summary = data.runtimeConfig.summary || {};
      if (typeof data.runtimeConfig.summary.showFeedHealth !== "boolean") {
        data.runtimeConfig.summary.showFeedHealth = true;
      }
      if (typeof data.runtimeConfig.summary.enableSummaryCollapse !== "boolean") {
        data.runtimeConfig.summary.enableSummaryCollapse = true;
      }
      if (typeof data.runtimeConfig.summary.summaryCollapsedByDefault !== "boolean") {
        data.runtimeConfig.summary.summaryCollapsedByDefault = false;
      }
      if (typeof data.runtimeConfig.summary.farNorthAlertsSinceDays !== "number") {
        data.runtimeConfig.summary.farNorthAlertsSinceDays = 14;
      }
      panel.appendChild(field("Include Emergency Banners", inputCheckbox(data.runtimeConfig.summary.includeEmergencyBanners !== false, function (v) {
        data.runtimeConfig.summary.includeEmergencyBanners = !!v;
      })));
      panel.appendChild(field("Show Feed Health", inputCheckbox(data.runtimeConfig.summary.showFeedHealth !== false, function (v) {
        data.runtimeConfig.summary.showFeedHealth = !!v;
      })));
      panel.appendChild(field("Enable Alerts Collapse Control", inputCheckbox(data.runtimeConfig.summary.enableSummaryCollapse !== false, function (v) {
        data.runtimeConfig.summary.enableSummaryCollapse = !!v;
      })));
      panel.appendChild(field("Start Collapsed (Show 1 Alert)", inputCheckbox(!!data.runtimeConfig.summary.summaryCollapsedByDefault, function (v) {
        data.runtimeConfig.summary.summaryCollapsedByDefault = !!v;
      })));
      panel.appendChild(field("Far North Alerts Since Days", inputText(
        String(data.runtimeConfig.summary.farNorthAlertsSinceDays || 14),
        function (v) {
          var n = parseInt(v, 10);
          if (isNaN(n)) return;
          data.runtimeConfig.summary.farNorthAlertsSinceDays = Math.max(1, Math.min(120, n));
        },
        "1-120"
      )));
      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Applies to emergency-banner items shown in the Far North Alerts section."
      }));

      panel.appendChild(renderArrayEditor({
        title: "Custom Blocks (HTML)",
        arr: Array.isArray(summaryPanel.customBlocks) ? summaryPanel.customBlocks : (summaryPanel.customBlocks = []),
        getSummary: function (item) { return (item && item.title) ? item.title : "Block"; },
        addNewItem: function () { return { title: "New Block", html: "<p>Content</p>" }; },
        renderItemFields: function (item) {
          var box = el("div");
          box.appendChild(field("Title", inputText(item.title, function (v) { item.title = v; })));
          box.appendChild(field("HTML", inputTextarea(item.html, function (v) { item.html = v; }, "<p>...</p>")));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "stats") {
      var statsSection = ensureObj(data, "statsSection");
      var statsRuntimeCfg = ensureObj(ensureObj(data, "runtimeConfig"), "stats");
      var liveSourcesCfg = ensureObj(statsRuntimeCfg, "liveCountSources");
      if (typeof liveSourcesCfg.fndcAlerts !== "boolean") liveSourcesCfg.fndcAlerts = true;
      if (typeof liveSourcesCfg.emergencyNews !== "boolean") liveSourcesCfg.emergencyNews = true;
      if (typeof liveSourcesCfg.waterOutages !== "boolean") liveSourcesCfg.waterOutages = true;
      if (typeof liveSourcesCfg.powerOutages !== "boolean") liveSourcesCfg.powerOutages = true;
      if (typeof liveSourcesCfg.nztaRoadClosures !== "boolean") liveSourcesCfg.nztaRoadClosures = true;
      if (typeof liveSourcesCfg.localRoadClosures !== "boolean") liveSourcesCfg.localRoadClosures = true;
      if (typeof liveSourcesCfg.weatherWarnings !== "boolean") liveSourcesCfg.weatherWarnings = true;
      if (typeof liveSourcesCfg.civilDefenceWarnings !== "boolean") liveSourcesCfg.civilDefenceWarnings = true;
      if (typeof statsRuntimeCfg.enableLiveCounts !== "boolean") statsRuntimeCfg.enableLiveCounts = true;
      if (typeof statsRuntimeCfg.autoRefreshEnabled !== "boolean") statsRuntimeCfg.autoRefreshEnabled = false;
      if (typeof statsRuntimeCfg.refreshIntervalMs !== "number") statsRuntimeCfg.refreshIntervalMs = 120000;
      if (typeof statsRuntimeCfg.showConnectionStatus !== "boolean") statsRuntimeCfg.showConnectionStatus = true;
      if (typeof statsRuntimeCfg.showLastUpdated !== "boolean") statsRuntimeCfg.showLastUpdated = true;
      if (!Array.isArray(statsRuntimeCfg.waterOutageStatusFilter)) statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
      if (!Array.isArray(statsRuntimeCfg.waterOutageTypeFilter)) statsRuntimeCfg.waterOutageTypeFilter = [];
      if (!Array.isArray(statsRuntimeCfg.powerOutageStatusFilter)) statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
      if (typeof statsRuntimeCfg.fndcAlertsSinceDays !== "number") statsRuntimeCfg.fndcAlertsSinceDays = 14;
      if (typeof statsRuntimeCfg.emergencyNewsSinceDays !== "number") statsRuntimeCfg.emergencyNewsSinceDays = 14;
      function getDefaultStatusTargetUrls() {
        return {
          fndcAlerts: "https://www.fndc.govt.nz/",
          emergencyNews: "https://www.fndc.govt.nz/Whats-New/Latest-news",
          waterOutages: "https://www.fndc.govt.nz/services/water/Water-outage-updates",
          powerOutages: "https://outages.topenergy.co.nz/",
          nztaRoadClosures: "https://www.journeys.nzta.govt.nz/journey-planner",
          localRoadClosures: "https://www.fndc.govt.nz/services/transport/closures",
          weatherWarnings: "https://www.metservice.com/warnings/home",
          civilDefenceWarnings: "https://www.civildefence.govt.nz/"
        };
      }
      statsRuntimeCfg.statusTargetUrls = ensureObj(statsRuntimeCfg, "statusTargetUrls");
      var defaultStatusTargetUrls = getDefaultStatusTargetUrls();
      Object.keys(defaultStatusTargetUrls).forEach(function (key) {
        if (!String(statsRuntimeCfg.statusTargetUrls[key] || "").trim()) {
          statsRuntimeCfg.statusTargetUrls[key] = defaultStatusTargetUrls[key];
        }
      });
      statsSection.cards = Array.isArray(statsSection.cards) ? statsSection.cards : [];

      function parseCsvList(value) {
        return String(value || "")
          .split(",")
          .map(function (part) { return part.trim(); })
          .filter(Boolean);
      }
      function hasFilterValue(arr, value) {
        return Array.isArray(arr) && arr.indexOf(value) !== -1;
      }
      function toggleFilterValue(arr, value, enabled) {
        var next = Array.isArray(arr) ? arr.slice() : [];
        var idx = next.indexOf(value);
        if (enabled && idx === -1) next.push(value);
        if (!enabled && idx !== -1) next.splice(idx, 1);
        return next;
      }
      function countActiveFilterValues() {
        return (statsRuntimeCfg.waterOutageStatusFilter || []).length
          + (statsRuntimeCfg.waterOutageTypeFilter || []).length
          + (statsRuntimeCfg.powerOutageStatusFilter || []).length
          + 2;
      }
      function formatFilterSummary() {
        var waterStatuses = (statsRuntimeCfg.waterOutageStatusFilter || []).join(", ") || "none";
        var waterTypes = (statsRuntimeCfg.waterOutageTypeFilter || []).join(", ") || "none";
        var powerStatuses = (statsRuntimeCfg.powerOutageStatusFilter || []).join(", ") || "none";
        return "Water status: " + waterStatuses
          + " | Water type: " + waterTypes
          + " | Power status: " + powerStatuses
          + " | FNDC alerts window: " + String(statsRuntimeCfg.fndcAlertsSinceDays || 14) + " days"
          + " | Emergency news window: " + String(statsRuntimeCfg.emergencyNewsSinceDays || 14) + " days";
      }
      function applyRuntimeFilterPreset(name) {
        if (name === "clear") {
          statsRuntimeCfg.waterOutageStatusFilter = [];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = [];
          return;
        }
        if (name === "defaults") {
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          return;
        }
        if (name === "highImpact") {
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported", "Current"];
          statsRuntimeCfg.waterOutageTypeFilter = ["Unplanned"];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive"];
        }
      }
      var cardPageDefs = [
        { pageId: "fndcAlerts", label: "FNDC Alerts", sourceKey: "fndcAlerts", sourceLabel: "Live Source: FNDC Alerts" },
        { pageId: "emergencyNews", label: "Emergency News Stories", sourceKey: "emergencyNews", sourceLabel: "Live Source: Emergency News" },
        { pageId: "waterOutages", label: "Water Outages", sourceKey: "waterOutages", sourceLabel: "Live Source: Water Outages" },
        { pageId: "powerOutages", label: "Power Outages", sourceKey: "powerOutages", sourceLabel: "Live Source: Power Outages" },
        { pageId: "nztaRoadClosures", label: "Road Closures NZTA", sourceKey: "nztaRoadClosures", sourceLabel: "Live Source: NZTA Road Closures" },
        { pageId: "localRoadClosures", label: "Road Closures Local", sourceKey: "localRoadClosures", sourceLabel: "Live Source: Local Road Closures" },
        { pageId: "weatherWarnings", label: "Weather Warnings", sourceKey: "weatherWarnings", sourceLabel: "Live Source: Weather Warnings" },
        { pageId: "civilDefenceWarnings", label: "Civil Defence Warnings", sourceKey: "civilDefenceWarnings", sourceLabel: "Live Source: Civil Defence Warnings" }
      ];
      var pageIds = ["overview", "runtime"].concat(cardPageDefs.map(function (d) { return d.pageId; }));
      var statsPage = pageIds.indexOf(state.statsPage) >= 0 ? state.statsPage : "overview";

      function getCardByLabel(label) {
        var match = statsSection.cards.find(function (c) { return c && c.label === label; });
        if (match) return match;
        var fallback = {
          label: label,
          number: 0,
          description: "",
          url: "#",
          colorClass: "grey",
          external: false,
          ariaLabel: ""
        };
        statsSection.cards.push(fallback);
        return fallback;
      }

      function renderCardFields(card) {
        panel.appendChild(field("Card Label", inputText(card.label, function (v) { card.label = v; })));
        panel.appendChild(field("Card Number (fallback)", inputText(String(typeof card.number === "number" ? card.number : 0), function (v) {
          var n = parseInt(v, 10);
          card.number = isNaN(n) ? 0 : n;
        })));
        panel.appendChild(field("Card Description", inputText(card.description, function (v) { card.description = v; })));
        panel.appendChild(field("Card URL", inputText(card.url, function (v) { card.url = v; })));
        panel.appendChild(field("Open In New Tab", inputCheckbox(!!card.external, function (v) { card.external = !!v; })));
        panel.appendChild(field("Aria Label", inputText(card.ariaLabel, function (v) { card.ariaLabel = v; }, "Used for accessibility")));
        panel.appendChild(field("Colour Class", inputSelect(card.colorClass || "grey", [
          { value: "grey", label: "Grey" },
          { value: "teal", label: "Teal" },
          { value: "orange", label: "Orange" },
          { value: "red", label: "Red" }
        ], function (v) { card.colorClass = v; })));
      }

      function appendStatsPageNav() {
        var filterValue = typeof state.statsCardNavFilter === "string" ? state.statsCardNavFilter : "";
        var filterInput = inputText(filterValue, function (v) {
          state.statsCardNavFilter = v;
        }, "Filter status card tabs by name");
        panel.appendChild(field("Filter Cards", filterInput));
        var filterNote = el("p", { class: "editor-note", text: "" });
        filterNote.style.display = "none";
        panel.appendChild(filterNote);

        var pageNav = el("div", { class: "editor-subpage-nav", role: "tablist", "aria-label": "Status cards editor pages" });
        function pageBtn(pageId, label) {
          var isActive = statsPage === pageId;
          var btn = el("button", {
            type: "button",
            class: "editor-subpage-btn" + (isActive ? " is-active" : ""),
            text: label,
            role: "tab",
            "aria-selected": isActive ? "true" : "false"
          });
          btn.addEventListener("click", function () {
            state.statsPage = pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
          });
          return btn;
        }
        pageNav.appendChild(pageBtn("overview", "Overview"));
        pageNav.appendChild(pageBtn("runtime", "Runtime Settings"));
        cardPageDefs.forEach(function (def) {
          var btn = pageBtn(def.pageId, def.label);
          btn.setAttribute("data-card-label", String(def.label || ""));
          pageNav.appendChild(btn);
        });
        panel.appendChild(pageNav);

        function applyCardTabFilter() {
          var term = String(filterInput.value || "").trim().toLowerCase();
          state.statsCardNavFilter = String(filterInput.value || "");
          var visibleCount = 0;
          Array.prototype.forEach.call(pageNav.querySelectorAll("button[data-card-label]"), function (btn) {
            var label = String(btn.getAttribute("data-card-label") || "").toLowerCase();
            var show = !term || label.indexOf(term) >= 0;
            btn.style.display = show ? "" : "none";
            if (show) visibleCount += 1;
          });
          if (term) {
            filterNote.textContent = String(visibleCount) + " card tab(s) match \"" + term + "\".";
            filterNote.style.display = "";
          } else {
            filterNote.textContent = "";
            filterNote.style.display = "none";
          }
        }
        filterInput.addEventListener("input", applyCardTabFilter);
        applyCardTabFilter();
      }

      function appendPageStepper() {
        var currentIdx = pageIds.indexOf(statsPage);
        if (currentIdx < 0) return;
        var prevId = currentIdx > 0 ? pageIds[currentIdx - 1] : null;
        var nextId = currentIdx < pageIds.length - 1 ? pageIds[currentIdx + 1] : null;
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Page " + String(currentIdx + 1) + " of " + String(pageIds.length)
        }));
        var row = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Previous Page" }),
          el("button", { type: "button", class: "editor-btn", text: "Next Page" })
        ]);
        row.children[0].disabled = !prevId;
        row.children[1].disabled = !nextId;
        row.children[0].addEventListener("click", function () {
          if (!prevId) return;
          state.statsPage = prevId;
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        row.children[1].addEventListener("click", function () {
          if (!nextId) return;
          state.statsPage = nextId;
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        panel.appendChild(row);
      }

      appendStatsPageNav();
      appendPageStepper();

      if (statsPage === "overview") {
        panel.appendChild(el("h4", { text: "Status Parent Page" }));
        panel.appendChild(field("Section Title", inputText(statsSection.title, function (v) { statsSection.title = v; })));
        panel.appendChild(field("Section Subtitle", inputText(statsSection.subtitle, function (v) { statsSection.subtitle = v; })));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Each status card now has its own page. Open Runtime Settings for live source and filter controls."
        }));
        var summary = cardPageDefs.map(function (def) {
          var card = getCardByLabel(def.label);
          var sourceEnabled = liveSourcesCfg[def.sourceKey] !== false;
          return def.label + ": " + (sourceEnabled ? "live on" : "live off") + ", fallback number " + String(card.number || 0);
        }).join(" | ");
        panel.appendChild(el("p", { class: "editor-note", text: summary }));
        var openButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Open Runtime Settings" }),
          el("button", { type: "button", class: "editor-btn", text: "Open FNDC Alerts Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Water Outages Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Weather Warnings Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Civil Defence Warnings Card" })
        ]);
        openButtons.children[0].addEventListener("click", function () { state.statsPage = "runtime"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[1].addEventListener("click", function () { state.statsPage = "fndcAlerts"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[2].addEventListener("click", function () { state.statsPage = "waterOutages"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[3].addEventListener("click", function () { state.statsPage = "weatherWarnings"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[4].addEventListener("click", function () { state.statsPage = "civilDefenceWarnings"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        panel.appendChild(openButtons);
      } else if (statsPage === "runtime") {
        panel.classList.add("editor-panel-stats-runtime");
        panel.appendChild(el("h4", { text: "Runtime Overview" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Edit runtime behavior for status cards. Changes are local until you use Save to reload and apply."
        }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Quick summary: " + String(countActiveFilterValues()) + " active filter values | " + String(cardPageDefs.filter(function (def) {
            return liveSourcesCfg[def.sourceKey] !== false;
          }).length) + " live sources enabled"
        }));
        var runtimeTopActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Preview Runtime Overview" }),
          el("button", { type: "button", class: "editor-btn", text: "Save Draft" }),
          el("button", { type: "button", class: "editor-btn primary", text: "Publish Changes" })
        ]);
        runtimeTopActions.children[0].addEventListener("click", function () {
          state.statsPage = "overview";
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        runtimeTopActions.children[1].addEventListener("click", function () {
          var save = $("#editor-save");
          if (save) save.click();
        });
        runtimeTopActions.children[2].addEventListener("click", function () {
          var save = $("#editor-save");
          if (save) save.click();
        });
        panel.appendChild(runtimeTopActions);
        var runtimeCoreBlock = el("section", { class: "editor-section-block" });
        runtimeCoreBlock.appendChild(el("h4", { text: "Core Runtime Controls" }));
        runtimeCoreBlock.appendChild(field("Enable Live Counts", inputCheckbox(
          statsRuntimeCfg.enableLiveCounts !== false,
          function (v) { statsRuntimeCfg.enableLiveCounts = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Auto Refresh Live Counts", inputCheckbox(
          !!statsRuntimeCfg.autoRefreshEnabled,
          function (v) { statsRuntimeCfg.autoRefreshEnabled = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Refresh Interval (seconds)", inputText(
          String(Math.max(15, Math.round((statsRuntimeCfg.refreshIntervalMs || 120000) / 1000))),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) statsRuntimeCfg.refreshIntervalMs = Math.max(15000, Math.min(600000, n * 1000));
          },
          "15-600"
        )));
        runtimeCoreBlock.appendChild(field("Show Connection Status", inputCheckbox(
          statsRuntimeCfg.showConnectionStatus !== false,
          function (v) { statsRuntimeCfg.showConnectionStatus = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Show Last Updated Stamp", inputCheckbox(
          statsRuntimeCfg.showLastUpdated !== false,
          function (v) { statsRuntimeCfg.showLastUpdated = !!v; }
        )));
        runtimeCoreBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Refresh interval controls how often live sources are polled (recommended: 120-300 seconds)."
        }));
        panel.appendChild(runtimeCoreBlock);

        var runtimeSourcesBlock = el("section", { class: "editor-section-block" });
        runtimeSourcesBlock.appendChild(el("h4", { text: "Live Source Toggles" }));
        cardPageDefs.forEach(function (def) {
          runtimeSourcesBlock.appendChild(field(def.sourceLabel, inputCheckbox(
            liveSourcesCfg[def.sourceKey] !== false,
            function (v) { liveSourcesCfg[def.sourceKey] = !!v; }
          )));
        });
        var sourcePresetActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Sources: Essential Only" }),
          el("button", { type: "button", class: "editor-btn", text: "Sources: All On" })
        ]);
        sourcePresetActions.children[0].addEventListener("click", function () {
          liveSourcesCfg.fndcAlerts = true;
          liveSourcesCfg.emergencyNews = true;
          liveSourcesCfg.waterOutages = true;
          liveSourcesCfg.powerOutages = true;
          liveSourcesCfg.nztaRoadClosures = true;
          liveSourcesCfg.localRoadClosures = true;
          liveSourcesCfg.weatherWarnings = false;
          liveSourcesCfg.civilDefenceWarnings = false;
          renderModulePanel(data, state);
        });
        sourcePresetActions.children[1].addEventListener("click", function () {
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        runtimeSourcesBlock.appendChild(sourcePresetActions);
        panel.appendChild(runtimeSourcesBlock);

        var runtimeTargetsBlock = el("section", { class: "editor-section-block" });
        runtimeTargetsBlock.appendChild(el("h4", { text: "Status Table Target URLs" }));
        runtimeTargetsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "These URLs are used in modal footer links for each status card table."
        }));
        [
          { key: "fndcAlerts", label: "FNDC Alerts Target URL" },
          { key: "emergencyNews", label: "Emergency News Target URL" },
          { key: "waterOutages", label: "Water Outages Target URL" },
          { key: "powerOutages", label: "Power Outages Target URL" },
          { key: "nztaRoadClosures", label: "NZTA Target URL" },
          { key: "localRoadClosures", label: "Local Road Closures Target URL" },
          { key: "weatherWarnings", label: "Weather Warnings Target URL" },
          { key: "civilDefenceWarnings", label: "Civil Defence Warnings Target URL" }
        ].forEach(function (target) {
          runtimeTargetsBlock.appendChild(field(target.label, inputText(
            statsRuntimeCfg.statusTargetUrls[target.key] || defaultStatusTargetUrls[target.key] || "",
            function (v) { statsRuntimeCfg.statusTargetUrls[target.key] = String(v || "").trim(); }
          )));
        });
        runtimeTargetsBlock.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Reset Target URLs" })
        ]));
        runtimeTargetsBlock.lastChild.children[0].addEventListener("click", function () {
          Object.keys(defaultStatusTargetUrls).forEach(function (key) {
            statsRuntimeCfg.statusTargetUrls[key] = defaultStatusTargetUrls[key];
          });
          renderModulePanel(data, state);
        });
        panel.appendChild(runtimeTargetsBlock);

        var runtimeFiltersBlock = el("section", { class: "editor-section-block" });
        runtimeFiltersBlock.appendChild(el("h4", { text: "Status Filters" }));
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Active filter values: " + String(countActiveFilterValues()) + ". Hidden statuses are excluded from runtime counters and status tables."
        }));
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: formatFilterSummary()
        }));
        var filterPresetActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Clear All Filters" }),
          el("button", { type: "button", class: "editor-btn", text: "Apply Default Filters" }),
          el("button", { type: "button", class: "editor-btn", text: "High-Impact Preset" })
        ]);
        filterPresetActions.children[0].addEventListener("click", function () {
          applyRuntimeFilterPreset("clear");
          renderModulePanel(data, state);
        });
        filterPresetActions.children[1].addEventListener("click", function () {
          applyRuntimeFilterPreset("defaults");
          renderModulePanel(data, state);
        });
        filterPresetActions.children[2].addEventListener("click", function () {
          applyRuntimeFilterPreset("highImpact");
          renderModulePanel(data, state);
        });
        runtimeFiltersBlock.appendChild(filterPresetActions);

        var fndcSinceWrap = el("div", { class: "editor-field" });
        var fndcSinceValue = el("strong", { text: String(statsRuntimeCfg.fndcAlertsSinceDays || 14) + " days" });
        var fndcSinceLabelRow = el("div", { class: "editor-field-label-row" }, [
          el("label", { text: "FNDC Alerts Since Window" }),
          fndcSinceValue
        ]);
        var fndcSinceRange = el("input", {
          type: "range",
          min: "1",
          max: "120",
          step: "1",
          value: String(Math.max(1, Math.min(120, parseInt(statsRuntimeCfg.fndcAlertsSinceDays, 10) || 14)))
        });
        fndcSinceRange.addEventListener("input", function () {
          var n = parseInt(fndcSinceRange.value, 10);
          if (isNaN(n)) n = 14;
          n = Math.max(1, Math.min(120, n));
          statsRuntimeCfg.fndcAlertsSinceDays = n;
          fndcSinceValue.textContent = String(n) + " days";
          ON_EDITOR_DATA_CHANGED();
        });
        fndcSinceWrap.appendChild(fndcSinceLabelRow);
        fndcSinceWrap.appendChild(fndcSinceRange);
        runtimeFiltersBlock.appendChild(fndcSinceWrap);

        var newsSinceWrap = el("div", { class: "editor-field" });
        var newsSinceValue = el("strong", { text: String(statsRuntimeCfg.emergencyNewsSinceDays || 14) + " days" });
        var newsSinceLabelRow = el("div", { class: "editor-field-label-row" }, [
          el("label", { text: "Emergency News Since Window" }),
          newsSinceValue
        ]);
        var newsSinceRange = el("input", {
          type: "range",
          min: "1",
          max: "120",
          step: "1",
          value: String(Math.max(1, Math.min(120, parseInt(statsRuntimeCfg.emergencyNewsSinceDays, 10) || 14)))
        });
        newsSinceRange.addEventListener("input", function () {
          var n = parseInt(newsSinceRange.value, 10);
          if (isNaN(n)) n = 14;
          n = Math.max(1, Math.min(120, n));
          statsRuntimeCfg.emergencyNewsSinceDays = n;
          newsSinceValue.textContent = String(n) + " days";
          ON_EDITOR_DATA_CHANGED();
        });
        newsSinceWrap.appendChild(newsSinceLabelRow);
        newsSinceWrap.appendChild(newsSinceRange);
        runtimeFiltersBlock.appendChild(newsSinceWrap);
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Timeframe sliders apply to FNDC Alerts and Emergency News status cards and their modal tables."
        }));

        var waterStatusDetails = el("details", { class: "editor-array-block" });
        waterStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Statuses (" + String((statsRuntimeCfg.waterOutageStatusFilter || []).length) + " selected)"
        }));
        ["Reported", "Current", "Restored", "Planned", "Unplanned", "Resolved"].forEach(function (statusType) {
          waterStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.waterOutageStatusFilter, statusType),
            function (v) {
              statsRuntimeCfg.waterOutageStatusFilter = toggleFilterValue(statsRuntimeCfg.waterOutageStatusFilter, statusType, !!v);
            }
          )));
        });
        waterStatusDetails.appendChild(field("Water Status CSV (Advanced)", inputText(
          (statsRuntimeCfg.waterOutageStatusFilter || []).join(", "),
          function (v) { statsRuntimeCfg.waterOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(waterStatusDetails);
        var waterTypeDetails = el("details", { class: "editor-array-block" });
        waterTypeDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Types (" + String((statsRuntimeCfg.waterOutageTypeFilter || []).length) + " selected)"
        }));
        ["Unplanned", "Planned", "Boil Water Notice", "Low Pressure", "Maintenance"].forEach(function (waterType) {
          waterTypeDetails.appendChild(field("Include " + waterType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.waterOutageTypeFilter, waterType),
            function (v) {
              statsRuntimeCfg.waterOutageTypeFilter = toggleFilterValue(statsRuntimeCfg.waterOutageTypeFilter, waterType, !!v);
            }
          )));
        });
        waterTypeDetails.appendChild(field("Water Type CSV (Advanced)", inputText(
          (statsRuntimeCfg.waterOutageTypeFilter || []).join(", "),
          function (v) { statsRuntimeCfg.waterOutageTypeFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(waterTypeDetails);
        var powerStatusDetails = el("details", { class: "editor-array-block" });
        powerStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Power Outage Statuses (" + String((statsRuntimeCfg.powerOutageStatusFilter || []).length) + " selected)"
        }));
        ["unplanned", "plannedActive", "planned"].forEach(function (statusType) {
          powerStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.powerOutageStatusFilter, statusType),
            function (v) {
              statsRuntimeCfg.powerOutageStatusFilter = toggleFilterValue(statsRuntimeCfg.powerOutageStatusFilter, statusType, !!v);
            }
          )));
        });
        powerStatusDetails.appendChild(field("Power Status CSV (Advanced)", inputText(
          (statsRuntimeCfg.powerOutageStatusFilter || []).join(", "),
          function (v) { statsRuntimeCfg.powerOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(powerStatusDetails);
        panel.appendChild(runtimeFiltersBlock);

        var statsQuickActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Enable All Live Sources" }),
          el("button", { type: "button", class: "editor-btn", text: "Disable All Live Sources" }),
          el("button", { type: "button", class: "editor-btn", text: "Reset Stats Runtime Defaults" })
        ]);
        statsQuickActions.children[0].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = true;
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        statsQuickActions.children[1].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = false;
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = false; });
          renderModulePanel(data, state);
        });
        statsQuickActions.children[2].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = true;
          statsRuntimeCfg.autoRefreshEnabled = false;
          statsRuntimeCfg.refreshIntervalMs = 120000;
          statsRuntimeCfg.showConnectionStatus = true;
          statsRuntimeCfg.showLastUpdated = true;
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          statsRuntimeCfg.fndcAlertsSinceDays = 14;
          statsRuntimeCfg.emergencyNewsSinceDays = 14;
          statsRuntimeCfg.statusTargetUrls = getDefaultStatusTargetUrls();
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        var runtimeActionsBlock = el("section", { class: "editor-section-block" });
        runtimeActionsBlock.appendChild(el("h4", { text: "Runtime Quick Actions" }));
        runtimeActionsBlock.appendChild(statsQuickActions);
        panel.appendChild(runtimeActionsBlock);
      } else {
        var activeDef = cardPageDefs.find(function (d) { return d.pageId === statsPage; }) || cardPageDefs[0];
        var activeCard = getCardByLabel(activeDef.label);
        panel.appendChild(el("h4", { text: activeDef.label + " Page" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Page-level editor for this status card. Live source toggle is repeated here for faster tuning."
        }));
        panel.appendChild(field(activeDef.sourceLabel, inputCheckbox(
          liveSourcesCfg[activeDef.sourceKey] !== false,
          function (v) { liveSourcesCfg[activeDef.sourceKey] = !!v; }
        )));
        renderCardFields(activeCard);
      }

      if (statsPage === "runtime" || statsPage === "overview") {
        var advancedCardsWrap = el("details", { class: "editor-array-block" });
        advancedCardsWrap.appendChild(el("summary", { class: "editor-array-summary", text: "Advanced: All Cards List" }));
        advancedCardsWrap.appendChild(renderArrayEditor({
          title: "Cards",
          arr: statsSection.cards,
          getSummary: function (item) {
            return (item && item.label) ? item.label : "Card";
          },
          addNewItem: function () {
            return {
              label: "New Card",
              number: 0,
              description: "Description",
              url: "#",
              colorClass: "grey",
              external: false,
              ariaLabel: ""
            };
          },
          renderItemFields: function (item) {
            var box = el("div");
            box.appendChild(field("Label", inputText(item.label, function (v) { item.label = v; })));
            box.appendChild(field("Number", inputText(String(typeof item.number === "number" ? item.number : 0), function (v) {
              var n = parseInt(v, 10);
              item.number = isNaN(n) ? 0 : n;
            })));
            box.appendChild(field("Description", inputText(item.description, function (v) { item.description = v; })));
            box.appendChild(field("Link URL", inputText(item.url, function (v) { item.url = v; })));
            box.appendChild(field("Open In New Tab", inputCheckbox(!!item.external, function (v) { item.external = !!v; })));
            box.appendChild(field("Aria Label (Optional)", inputText(item.ariaLabel, function (v) { item.ariaLabel = v; })));
            box.appendChild(field("Colour Class", inputSelect(item.colorClass || "grey", [
              { value: "grey", label: "Grey" },
              { value: "teal", label: "Teal" },
              { value: "orange", label: "Orange" },
              { value: "red", label: "Red" }
            ], function (v) { item.colorClass = v; })));
            return box;
          },
          onChange: function () { renderModulePanel(data, state); }
        }));
        panel.appendChild(advancedCardsWrap);
      }
    }

    if (moduleId === "tiles") {
      var tilesSection = ensureObj(data, "tilesSection");
      var tilesRuntimeCfg = ensureObj(ensureObj(data, "runtimeConfig"), "tiles");
      if (typeof tilesRuntimeCfg.mobileColumns !== "number") {
        tilesRuntimeCfg.mobileColumns = 2;
      }
      panel.appendChild(field("Section Title", inputText(tilesSection.title, function (v) { tilesSection.title = v; })));
      panel.appendChild(field("Section Subtitle", inputText(tilesSection.subtitle, function (v) { tilesSection.subtitle = v; })));
      panel.appendChild(field("Mobile Tile Columns (<=768px)", inputSelect(
        String(tilesRuntimeCfg.mobileColumns || 2),
        [
          { value: "1", label: "1 Column" },
          { value: "2", label: "2 Columns" }
        ],
        function (v) {
          var n = parseInt(v, 10);
          tilesRuntimeCfg.mobileColumns = n === 1 ? 1 : 2;
        }
      )));

      // Groups editor
      panel.appendChild(renderArrayEditor({
        title: "Groups",
        arr: Array.isArray(tilesSection.groups) ? tilesSection.groups : (tilesSection.groups = []),
        getSummary: function (g) { return (g && g.title) ? g.title : "Group"; },
        addNewItem: function () { return { id: "group_" + String(Date.now()), title: "New Group", description: "", tiles: [] }; },
        renderItemFields: function (group) {
          var box = el("div");
          box.appendChild(field("Group Title", inputText(group.title, function (v) { group.title = v; })));
          box.appendChild(field("Group Description", inputText(group.description, function (v) { group.description = v; })));

          group.tiles = Array.isArray(group.tiles) ? group.tiles : [];
          box.appendChild(renderArrayEditor({
            title: "Tiles",
            arr: group.tiles,
            getSummary: function (t) { return (t && t.title) ? t.title : "Tile"; },
            addNewItem: function () {
              return { title: "New Tile", description: "", icon: "\u27A1\uFE0F", colorClass: "neutral", url: "#", external: false, metaTop: "", metaBottom: "" };
            },
            renderItemFields: function (tile) {
              var tb = el("div");
              tb.appendChild(field("Title", inputText(tile.title, function (v) { tile.title = v; })));
              tb.appendChild(field("Description", inputText(tile.description, function (v) { tile.description = v; })));
              tb.appendChild(field("Icon", inputText(tile.icon, function (v) { tile.icon = v; })));
              tb.appendChild(field("URL", inputText(tile.url, function (v) { tile.url = v; })));
              tb.appendChild(field("Open In New Tab", inputCheckbox(tile.external, function (v) { tile.external = v; })));
              tb.appendChild(field("Colour Class", inputSelect(tile.colorClass, [
                { value: "neutral", label: "Neutral" },
                { value: "teal", label: "Teal" },
                { value: "orange", label: "Orange" },
                { value: "red", label: "Red" }
              ], function (v) { tile.colorClass = v; })));
              tb.appendChild(field("Meta Top", inputText(tile.metaTop, function (v) { tile.metaTop = v; })));
              tb.appendChild(field("Meta Bottom", inputText(tile.metaBottom, function (v) { tile.metaBottom = v; })));
              return tb;
            },
            onChange: function () { renderModulePanel(data, state); }
          }));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));

      panel.appendChild(renderArrayEditor({
        title: "Quick Links",
        arr: Array.isArray(tilesSection.quickLinks) ? tilesSection.quickLinks : (tilesSection.quickLinks = []),
        getSummary: function (q) { return (q && q.label) ? q.label : "Link"; },
        addNewItem: function () { return { label: "New Link", url: "#" }; },
        renderItemFields: function (q) {
          var box = el("div");
          box.appendChild(field("Label", inputText(q.label, function (v) { q.label = v; })));
          box.appendChild(field("URL", inputText(q.url, function (v) { q.url = v; })));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "social") {
      var social = ensureObj(data, "socialFeedsSection");
      panel.appendChild(field("Section Title", inputText(social.title, function (v) { social.title = v; })));
      panel.appendChild(field("Section Subtitle", inputText(social.subtitle, function (v) { social.subtitle = v; })));
      panel.appendChild(field("Note", inputText(social.note, function (v) { social.note = v; }, "Shown below the feeds")));

      panel.appendChild(renderArrayEditor({
        title: "Tabs",
        arr: Array.isArray(social.tabs) ? social.tabs : (social.tabs = []),
        getSummary: function (t) { return (t && t.label) ? t.label : "Tab"; },
        addNewItem: function () {
          return { id: "tab_" + String(Date.now()), label: "New Tab", type: "iframe", iframeSrc: "about:blank" };
        },
        renderItemFields: function (t) {
          var box = el("div");
          box.appendChild(field("Id", inputText(t.id, function (v) { t.id = v; }, "Used internally")));
          box.appendChild(field("Label", inputText(t.label, function (v) { t.label = v; })));
          box.appendChild(field("Type", inputSelect(t.type || "iframe", [
            { value: "iframe", label: "Iframe" },
            { value: "facebook", label: "Facebook" },
            { value: "x", label: "X" }
          ], function (v) { t.type = v; })));
          box.appendChild(field("Iframe URL", inputText(t.iframeSrc, function (v) { t.iframeSrc = v; })));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "footer") {
      var footer = ensureObj(data, "footer");
      panel.appendChild(field("Footer Line 1", inputText(footer.line1, function (v) { footer.line1 = v; })));
      panel.appendChild(field("Footer Line 2", inputText(footer.line2, function (v) { footer.line2 = v; })));
    }

    panel.appendChild(el("p", { class: "editor-note", text: "Save reloads the dashboard so map and alert scripts can reapply settings." }));
  }

  function initEditor() {
    var rawData = window.FNED_DASHBOARD_DATA;
    if (!rawData) return;
    var data = ensureLayout(deepClone(rawData));
    if (EditorConfigUtils && typeof EditorConfigUtils.sanitizeDashboardConfig === "function") {
      var initialSanitiseResult = EditorConfigUtils.sanitizeDashboardConfig(data);
      if (initialSanitiseResult && initialSanitiseResult.data) {
        data = initialSanitiseResult.data;
      }
    }

    var editBtn = $("#edit-toggle-btn");
    var backdrop = $("#editor-backdrop");
    var editorDrawer = backdrop ? backdrop.querySelector(".editor-drawer") : null;
    var closeBtn = $("#editor-close");
    var saveBtn = $("#editor-save");
    var validateBtn = $("#editor-validate");
    var exportBtn = $("#editor-export");
    var resetBtn = $("#editor-reset");
    var noteEl = $("#editor-note");
    var focusToggleBtn = $("#editor-focus-toggle");
    var captureToggleBtn = $("#editor-capture-toggle");
    var dirtyChip = $("#editor-dirty-chip");
    var lastSavedChip = $("#editor-last-saved-chip");

    if (!editBtn || !backdrop || !closeBtn || !saveBtn || !exportBtn || !resetBtn) return;

    var editCfg = (data.layout && data.layout.edit) ? data.layout.edit : {};
    var showButton = !!editCfg.showButton;
    var requireQueryParam = !!editCfg.requireQueryParam;
    var queryParam = editCfg.queryParam || "edit";
    var unlockTapCount = Math.max(2, parseInt(editCfg.unlockTapCount, 10) || 10);
    var unlockWindowMs = Math.max(1000, parseInt(editCfg.unlockWindowMs, 10) || 10000);
    var heroPillBtn = $("#hero-pill");
    var queryParamAllowed = true;
    var unlockedByStatusTap = false;
    var unlockTapProgress = 0;
    var unlockWindowStartAt = 0;

    if (requireQueryParam) {
      var params = new URLSearchParams(location.search);
      if (!params.has(queryParam)) {
        queryParamAllowed = false;
      }
    }

    function setEditButtonVisibility() {
      var shouldShow = (showButton && queryParamAllowed) || unlockedByStatusTap;
      editBtn.style.display = shouldShow ? "" : "none";
      editBtn.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function registerStatusUnlockTap() {
      var now = Date.now();
      if (!unlockWindowStartAt || (now - unlockWindowStartAt) > unlockWindowMs) {
        unlockWindowStartAt = now;
        unlockTapProgress = 0;
      }
      unlockTapProgress += 1;
      if ((now - unlockWindowStartAt) <= unlockWindowMs && unlockTapProgress >= unlockTapCount) {
        unlockedByStatusTap = true;
        unlockTapProgress = 0;
        unlockWindowStartAt = 0;
        setEditButtonVisibility();
        try {
          editBtn.focus();
        } catch (_editFocusErr) {}
      }
    }

    function rehideEditButtonByPolicy() {
      unlockedByStatusTap = false;
      unlockTapProgress = 0;
      unlockWindowStartAt = 0;
      setEditButtonVisibility();
      if (!((showButton && queryParamAllowed) || unlockedByStatusTap)) {
        if (document.body.classList.contains("edit-mode")) {
          closeEditor();
        }
      }
    }

    setEditButtonVisibility();
    window.FNED_EDITOR_VISIBILITY_API = {
      showTemporarily: function () {
        unlockedByStatusTap = true;
        setEditButtonVisibility();
      },
      rehide: function () {
        rehideEditButtonByPolicy();
      },
      isVisible: function () {
        return editBtn.style.display !== "none";
      }
    };
    if (heroPillBtn) {
      heroPillBtn.setAttribute("title", "Tap " + String(unlockTapCount) + " times quickly to show Edit");
      heroPillBtn.addEventListener("click", function () {
        registerStatusUnlockTap();
      });
      heroPillBtn.addEventListener("keydown", function (evt) {
        if (!evt) return;
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          registerStatusUnlockTap();
        }
      });
    }

    var state = { activeModuleId: "header", focusMode: false, captureMode: false, situationPage: "overview", statsPage: "overview", adminPage: "sitrep" };
    var isDirty = false;
    var isEditorOpen = false;
    var listenersBound = false;
    var lastActiveElement = null;
    var lastSavedStorageKey = (editCfg.storageKey || "fned_dashboard_override_v1") + "_last_saved_at";

    function formatSavedStamp(isoValue) {
      if (!isoValue) return "Last saved: not yet";
      var dt = new Date(isoValue);
      if (isNaN(dt.getTime())) return "Last saved: not yet";
      return "Last saved: " + dt.toLocaleString();
    }

    function setDirty(nextDirty) {
      isDirty = !!nextDirty;
      if (dirtyChip) {
        dirtyChip.classList.toggle("hidden", !isDirty);
      }
    }

    function refreshLastSavedLabel() {
      if (!lastSavedChip) return;
      var savedValue = "";
      try {
        savedValue = localStorage.getItem(lastSavedStorageKey) || "";
      } catch (error) {
        savedValue = "";
      }
      lastSavedChip.textContent = formatSavedStamp(savedValue);
    }

    function setNote(message) {
      if (!noteEl) return;
      noteEl.textContent = message || "";
    }

    function syncCaptureMode(modeOn) {
      var isOn = !!modeOn;
      state.captureMode = isOn;
      document.body.classList.toggle("editor-capture-mode", isOn);
      if (captureToggleBtn) {
        captureToggleBtn.textContent = isOn ? "Modal Capture Mode: On" : "Modal Capture Mode: Off";
      }
    }

    function getFocusableEditorElements() {
      if (!editorDrawer) return [];
      var focusable = editorDrawer.querySelectorAll(
        "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      return Array.prototype.filter.call(focusable, function (node) {
        return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
      });
    }

    function maybeCloseEditor() {
      if (!isEditorOpen) return;
      if (isDirty) {
        var shouldDiscard = window.confirm("You have unsaved changes. Close the editor without saving?");
        if (!shouldDiscard) return;
      }
      closeEditor();
    }

    function validateCurrentData() {
      if (window.FNED_APP && typeof window.FNED_APP.validateData === "function") {
        return window.FNED_APP.validateData(data);
      }
      if (EditorConfigUtils && typeof EditorConfigUtils.sanitizeDashboardConfig === "function") {
        return EditorConfigUtils.sanitizeDashboardConfig(data);
      }
      return {
        data: data,
        validation: { errors: [], warnings: [] }
      };
    }

    function bindEditorListeners() {
      if (listenersBound) return;
      backdrop.addEventListener("click", onBackdropClick);
      document.addEventListener("keydown", onKeyDown);
      listenersBound = true;
    }

    function unbindEditorListeners() {
      if (!listenersBound) return;
      backdrop.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      listenersBound = false;
    }

    function openEditor() {
      if (isEditorOpen) {
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        return;
      }
      lastActiveElement = document.activeElement;
      isEditorOpen = true;
      setEditMode(true);
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
      setDirty(false);
      refreshLastSavedLabel();
      syncCaptureMode(!!state.captureMode);
      setNote("Saved changes are stored locally in your browser. Validate checks config and reset clears local changes.");
      bindEditorListeners();
      try { closeBtn.focus(); } catch (focusErr) {}
    }

    function closeEditor() {
      if (!isEditorOpen) return;
      isEditorOpen = false;
      syncCaptureMode(false);
      setEditMode(false);
      syncFocusMode({ activeModuleId: "", focusMode: false });
      unbindEditorListeners();
      if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        try { lastActiveElement.focus(); } catch (focusErr) {}
      }
    }

    function onBackdropClick(e) {
      if (e.target === backdrop) maybeCloseEditor();
    }

    function onKeyDown(e) {
      if (!isEditorOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        maybeCloseEditor();
        return;
      }
      if (e.key !== "Tab") return;
      var focusable = getFocusableEditorElements();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    editBtn.addEventListener("click", function () {
      if (document.body.classList.contains("edit-mode")) maybeCloseEditor();
      else openEditor();
    });

    closeBtn.addEventListener("click", function () { maybeCloseEditor(); });
    ON_EDITOR_DATA_CHANGED = function () { setDirty(true); };

    if (focusToggleBtn) {
      focusToggleBtn.addEventListener("click", function () {
        state.focusMode = !state.focusMode;
        focusToggleBtn.textContent = state.focusMode ? "Focus Mode: On" : "Focus Mode: Off";
        syncFocusMode(state);
      });
    }

    if (captureToggleBtn) {
      captureToggleBtn.addEventListener("click", function () {
        syncCaptureMode(!state.captureMode);
      });
    }

    if (validateBtn) {
      validateBtn.addEventListener("click", function () {
        var result = validateCurrentData();
        if (result && result.data) {
          data = result.data;
        }
        var validation = result && result.validation ? result.validation : { errors: [], warnings: [] };
        if (EditorConfigUtils && typeof EditorConfigUtils.formatValidationSummary === "function") {
          setNote(EditorConfigUtils.formatValidationSummary(validation));
        } else if (validation.errors && validation.errors.length) {
          setNote("Validation failed: " + validation.errors[0]);
        } else if (validation.warnings && validation.warnings.length) {
          setNote("Validation warnings: " + validation.warnings[0]);
        } else {
          setNote("Validation passed with no issues.");
        }
      });
    }

    saveBtn.addEventListener("click", function () {
      if (!window.FNED_APP || typeof window.FNED_APP.saveDataAndReload !== "function") return;
      var result = validateCurrentData();
      if (result && result.data) {
        data = result.data;
      }
      var validation = result && result.validation ? result.validation : { errors: [], warnings: [] };
      if (validation.errors && validation.errors.length) {
        if (EditorConfigUtils && typeof EditorConfigUtils.formatValidationSummary === "function") {
          setNote(EditorConfigUtils.formatValidationSummary(validation));
        } else {
          setNote("Cannot save due to validation errors.");
        }
        return;
      }
      setDirty(false);
      var saveResult = window.FNED_APP.saveDataAndReload(data);
      if (saveResult && saveResult.ok === false) {
        setDirty(true);
        if (saveResult.error === "quota_exceeded") {
          var cleanedCount = Array.isArray(saveResult.removedKeys) ? saveResult.removedKeys.length : 0;
          if (cleanedCount > 0) {
            setNote("Save failed: browser storage quota exceeded after cleanup attempt (" + cleanedCount + " old key(s) removed). Reduce selected LINZ areas or clear browser site data, then try again.");
          } else {
            setNote("Save failed: browser storage quota exceeded. Reduce selected LINZ areas or clear browser site data, then try again.");
          }
        } else {
          setNote("Save failed: " + (saveResult.message || "local storage write failed."));
        }
      }
    });

    exportBtn.addEventListener("click", function () {
      downloadText("fned_dashboard_config.json", JSON.stringify(data, null, 2), "application/json");
    });

    resetBtn.addEventListener("click", function () {
      if (!window.FNED_APP || typeof window.FNED_APP.resetDataAndReload !== "function") return;
      window.FNED_APP.resetDataAndReload();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor);
  } else {
    initEditor();
  }
})();


