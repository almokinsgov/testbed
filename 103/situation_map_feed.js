/*
  Extracted from: v23 v32 - addedd in v32 - live for cap feeds.html
  Source lines: 2932-5655
  Note: Keep this as a classic script (no type="module").
  If hosting remotely, you can replace the HTML <script src> with a URL to this file.
*/


    // Optional runtime overrides provided by the dashboard config
    var FNED_MAP_CFG = (window.FNED_CONFIG && window.FNED_CONFIG.map)
      ? window.FNED_CONFIG.map
      : {};

    var mapCenter = (Array.isArray(FNED_MAP_CFG.center) && FNED_MAP_CFG.center.length === 2)
      ? FNED_MAP_CFG.center
      : [-35.15, 173.65];

    var mapZoom = (typeof FNED_MAP_CFG.zoom === "number" && !isNaN(FNED_MAP_CFG.zoom))
      ? FNED_MAP_CFG.zoom
      : 8;

    var layersCollapsed = (typeof FNED_MAP_CFG.layersControlCollapsed === "boolean")
      ? FNED_MAP_CFG.layersControlCollapsed
      : true;

    var enabledOverlays = Array.isArray(FNED_MAP_CFG.enabledOverlays)
      ? FNED_MAP_CFG.enabledOverlays
      : null;
    var defaultVisibleOverlays = Array.isArray(FNED_MAP_CFG.defaultVisibleOverlays)
      ? FNED_MAP_CFG.defaultVisibleOverlays
      : null;

    var mapBaseStyle = String(FNED_MAP_CFG.baseStyle || "standard").toLowerCase();
    if (["standard", "hybrid"].indexOf(mapBaseStyle) === -1) {
      mapBaseStyle = "standard";
    }

    var legendPosition = String(FNED_MAP_CFG.legendPosition || "bottomleft").toLowerCase();
    if (["bottomleft", "bottomright", "topright", "topleft", "below"].indexOf(legendPosition) === -1) {
      legendPosition = "bottomleft";
    }

    var DEFAULT_MAP_POWER_OUTAGE_STATUS_FILTER = ["unplanned", "plannedActive", "planned"];
    var DEFAULT_MAP_WATER_OUTAGE_STATUS_FILTER = ["New", "Reported", "Under repairs", "Planned", "Restored"];
    var DEFAULT_MAP_SYMBOL_SIZE = 44;
    var DEFAULT_MAP_SYMBOL_FONT_SIZE = 22;
    var DEFAULT_MAP_SYMBOL_BORDER_WIDTH = 2;
    var DEFAULT_MAP_CLUSTER_SYMBOL_SIZE = 44;
    var DEFAULT_MAP_CLUSTER_SYMBOL_FONT_SIZE = 22;
    var DEFAULT_MAP_COLLISION_AVOIDANCE_ENABLED = true;
    var DEFAULT_MAP_COLLISION_BUFFER_PX = 6;
    var DEFAULT_MARAE_CLUSTER_ENABLED = true;
    var DEFAULT_MARAE_CLUSTER_MIN_COUNT = 2;
    var DEFAULT_MARAE_CLUSTER_BASE_RADIUS_METERS = 2200;
    var DEFAULT_MARAE_CLUSTER_MAX_RADIUS_METERS = 60000;
    var DEFAULT_MARAE_CLUSTER_BASE_ZOOM = mapZoom;
    var DEFAULT_MARAE_CLUSTER_ZOOM_STEP_MULTIPLIER = 1.7;
    var DEFAULT_MARAE_CLUSTER_VIEWPORT_WIDTH_FACTOR = 0.12;
    var DEFAULT_POWER_CLUSTER_ENABLED = true;
    var DEFAULT_POWER_CLUSTER_MIN_COUNT = 2;
    var DEFAULT_POWER_CLUSTER_BASE_RADIUS_METERS = 420;
    var DEFAULT_POWER_CLUSTER_MAX_RADIUS_METERS = 18000;
    var DEFAULT_POWER_CLUSTER_BASE_ZOOM = mapZoom;
    var DEFAULT_POWER_CLUSTER_ZOOM_STEP_MULTIPLIER = 1.55;
    var DEFAULT_POWER_CLUSTER_VIEWPORT_WIDTH_FACTOR = 0.08;
    var DEFAULT_WATER_CLUSTER_ENABLED = true;
    var DEFAULT_WATER_CLUSTER_MIN_COUNT = 2;
    var DEFAULT_WATER_CLUSTER_BASE_RADIUS_METERS = 420;
    var DEFAULT_WATER_CLUSTER_MAX_RADIUS_METERS = 18000;
    var DEFAULT_WATER_CLUSTER_BASE_ZOOM = mapZoom;
    var DEFAULT_WATER_CLUSTER_ZOOM_STEP_MULTIPLIER = 1.55;
    var DEFAULT_WATER_CLUSTER_VIEWPORT_WIDTH_FACTOR = 0.08;
    var DEFAULT_NZTA_CLUSTER_ENABLED = true;
    var DEFAULT_NZTA_CLUSTER_MIN_COUNT = 2;
    var DEFAULT_NZTA_CLUSTER_BASE_RADIUS_METERS = 450;
    var DEFAULT_NZTA_CLUSTER_MAX_RADIUS_METERS = 22000;
    var DEFAULT_NZTA_CLUSTER_BASE_ZOOM = mapZoom;
    var DEFAULT_NZTA_CLUSTER_ZOOM_STEP_MULTIPLIER = 1.55;
    var DEFAULT_NZTA_CLUSTER_VIEWPORT_WIDTH_FACTOR = 0.09;
    var DEFAULT_LOCAL_ROAD_CLUSTER_ENABLED = true;
    var DEFAULT_LOCAL_ROAD_CLUSTER_MIN_COUNT = 2;
    var DEFAULT_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS = 400;
    var DEFAULT_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS = 20000;
    var DEFAULT_LOCAL_ROAD_CLUSTER_BASE_ZOOM = mapZoom;
    var DEFAULT_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER = 1.55;
    var DEFAULT_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR = 0.08;

    function canonicalPowerOutageStatus(value) {
      var token = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!token) return "";
      if (token === "plannedactive") return "plannedActive";
      if (token === "unplanned") return "unplanned";
      if (token === "planned") return "planned";
      return "";
    }

    function normaliseMapStringList(list) {
      return Array.isArray(list)
        ? list.map(function (item) { return String(item || "").trim(); }).filter(Boolean)
        : [];
    }

    function normaliseBoolean(value, fallback) {
      return typeof value === "boolean" ? value : fallback;
    }

    function normaliseNumber(value, fallback, min, max) {
      var num = Number(value);
      if (!isFinite(num)) {
        num = fallback;
      }
      if (isFinite(min) && num < min) num = min;
      if (isFinite(max) && num > max) num = max;
      return num;
    }

    var MAP_POWER_OUTAGE_STATUS_FILTER = normaliseMapStringList(FNED_MAP_CFG.powerOutageStatusFilter);
    if (!MAP_POWER_OUTAGE_STATUS_FILTER.length) {
      MAP_POWER_OUTAGE_STATUS_FILTER = DEFAULT_MAP_POWER_OUTAGE_STATUS_FILTER.slice();
    }
    MAP_POWER_OUTAGE_STATUS_FILTER = MAP_POWER_OUTAGE_STATUS_FILTER
      .map(canonicalPowerOutageStatus)
      .filter(Boolean);

    var MAP_WATER_OUTAGE_STATUS_FILTER = normaliseMapStringList(FNED_MAP_CFG.waterOutageStatusFilter);
    if (!MAP_WATER_OUTAGE_STATUS_FILTER.length) {
      MAP_WATER_OUTAGE_STATUS_FILTER = DEFAULT_MAP_WATER_OUTAGE_STATUS_FILTER.slice();
    }
    var MAP_WATER_OUTAGE_STATUS_FILTER_NORMALISED = MAP_WATER_OUTAGE_STATUS_FILTER
      .map(function (value) { return String(value || "").trim().toLowerCase(); })
      .filter(Boolean);
    var MAP_SYMBOL_SIZE = normaliseNumber(
      FNED_MAP_CFG.symbolSize,
      DEFAULT_MAP_SYMBOL_SIZE,
      14,
      96
    );
    var MAP_SYMBOL_FONT_SIZE = normaliseNumber(
      FNED_MAP_CFG.symbolFontSize,
      DEFAULT_MAP_SYMBOL_FONT_SIZE,
      8,
      48
    );
    var MAP_SYMBOL_BORDER_WIDTH = normaliseNumber(
      FNED_MAP_CFG.symbolBorderWidth,
      DEFAULT_MAP_SYMBOL_BORDER_WIDTH,
      1,
      10
    );
    var MAP_CLUSTER_SYMBOL_SIZE = normaliseNumber(
      FNED_MAP_CFG.clusterSymbolSize,
      DEFAULT_MAP_CLUSTER_SYMBOL_SIZE,
      14,
      96
    );
    var MAP_CLUSTER_SYMBOL_FONT_SIZE = normaliseNumber(
      FNED_MAP_CFG.clusterSymbolFontSize,
      DEFAULT_MAP_CLUSTER_SYMBOL_FONT_SIZE,
      8,
      48
    );
    var MAP_COLLISION_AVOIDANCE_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.collisionAvoidanceEnabled,
      DEFAULT_MAP_COLLISION_AVOIDANCE_ENABLED
    );
    var MAP_COLLISION_BUFFER_PX = normaliseNumber(
      FNED_MAP_CFG.collisionBufferPx,
      DEFAULT_MAP_COLLISION_BUFFER_PX,
      0,
      30
    );

    var MAP_MARAE_CLUSTER_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.maraeClusterEnabled,
      DEFAULT_MARAE_CLUSTER_ENABLED
    );
    var MAP_MARAE_CLUSTER_MIN_COUNT = normaliseNumber(
      FNED_MAP_CFG.maraeClusterMinCount,
      DEFAULT_MARAE_CLUSTER_MIN_COUNT,
      1,
      20
    );
    var MAP_MARAE_CLUSTER_BASE_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.maraeClusterBaseRadiusMeters,
      DEFAULT_MARAE_CLUSTER_BASE_RADIUS_METERS,
      50,
      50000
    );
    var MAP_MARAE_CLUSTER_MAX_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.maraeClusterMaxRadiusMeters,
      DEFAULT_MARAE_CLUSTER_MAX_RADIUS_METERS,
      200,
      100000
    );
    var MAP_MARAE_CLUSTER_BASE_ZOOM = normaliseNumber(
      FNED_MAP_CFG.maraeClusterBaseZoom,
      DEFAULT_MARAE_CLUSTER_BASE_ZOOM,
      1,
      22
    );
    var MAP_MARAE_CLUSTER_ZOOM_STEP_MULTIPLIER = normaliseNumber(
      FNED_MAP_CFG.maraeClusterZoomStepMultiplier,
      DEFAULT_MARAE_CLUSTER_ZOOM_STEP_MULTIPLIER,
      1.0,
      4.0
    );
    var MAP_MARAE_CLUSTER_VIEWPORT_WIDTH_FACTOR = normaliseNumber(
      FNED_MAP_CFG.maraeClusterViewportWidthFactor,
      DEFAULT_MARAE_CLUSTER_VIEWPORT_WIDTH_FACTOR,
      0,
      0.5
    );
    var MAP_POWER_CLUSTER_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.powerClusterEnabled,
      DEFAULT_POWER_CLUSTER_ENABLED
    );
    var MAP_POWER_CLUSTER_MIN_COUNT = normaliseNumber(
      FNED_MAP_CFG.powerClusterMinCount,
      DEFAULT_POWER_CLUSTER_MIN_COUNT,
      1,
      20
    );
    var MAP_POWER_CLUSTER_BASE_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.powerClusterBaseRadiusMeters,
      DEFAULT_POWER_CLUSTER_BASE_RADIUS_METERS,
      50,
      50000
    );
    var MAP_POWER_CLUSTER_MAX_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.powerClusterMaxRadiusMeters,
      DEFAULT_POWER_CLUSTER_MAX_RADIUS_METERS,
      200,
      100000
    );
    var MAP_POWER_CLUSTER_BASE_ZOOM = normaliseNumber(
      FNED_MAP_CFG.powerClusterBaseZoom,
      DEFAULT_POWER_CLUSTER_BASE_ZOOM,
      1,
      22
    );
    var MAP_POWER_CLUSTER_ZOOM_STEP_MULTIPLIER = normaliseNumber(
      FNED_MAP_CFG.powerClusterZoomStepMultiplier,
      DEFAULT_POWER_CLUSTER_ZOOM_STEP_MULTIPLIER,
      1.0,
      4.0
    );
    var MAP_POWER_CLUSTER_VIEWPORT_WIDTH_FACTOR = normaliseNumber(
      FNED_MAP_CFG.powerClusterViewportWidthFactor,
      DEFAULT_POWER_CLUSTER_VIEWPORT_WIDTH_FACTOR,
      0,
      0.5
    );
    var MAP_WATER_CLUSTER_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.waterClusterEnabled,
      DEFAULT_WATER_CLUSTER_ENABLED
    );
    var MAP_WATER_CLUSTER_MIN_COUNT = normaliseNumber(
      FNED_MAP_CFG.waterClusterMinCount,
      DEFAULT_WATER_CLUSTER_MIN_COUNT,
      1,
      20
    );
    var MAP_WATER_CLUSTER_BASE_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.waterClusterBaseRadiusMeters,
      DEFAULT_WATER_CLUSTER_BASE_RADIUS_METERS,
      50,
      50000
    );
    var MAP_WATER_CLUSTER_MAX_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.waterClusterMaxRadiusMeters,
      DEFAULT_WATER_CLUSTER_MAX_RADIUS_METERS,
      200,
      100000
    );
    var MAP_WATER_CLUSTER_BASE_ZOOM = normaliseNumber(
      FNED_MAP_CFG.waterClusterBaseZoom,
      DEFAULT_WATER_CLUSTER_BASE_ZOOM,
      1,
      22
    );
    var MAP_WATER_CLUSTER_ZOOM_STEP_MULTIPLIER = normaliseNumber(
      FNED_MAP_CFG.waterClusterZoomStepMultiplier,
      DEFAULT_WATER_CLUSTER_ZOOM_STEP_MULTIPLIER,
      1.0,
      4.0
    );
    var MAP_WATER_CLUSTER_VIEWPORT_WIDTH_FACTOR = normaliseNumber(
      FNED_MAP_CFG.waterClusterViewportWidthFactor,
      DEFAULT_WATER_CLUSTER_VIEWPORT_WIDTH_FACTOR,
      0,
      0.5
    );
    var MAP_NZTA_CLUSTER_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.nztaClusterEnabled,
      DEFAULT_NZTA_CLUSTER_ENABLED
    );
    var MAP_NZTA_CLUSTER_MIN_COUNT = normaliseNumber(
      FNED_MAP_CFG.nztaClusterMinCount,
      DEFAULT_NZTA_CLUSTER_MIN_COUNT,
      1,
      20
    );
    var MAP_NZTA_CLUSTER_BASE_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.nztaClusterBaseRadiusMeters,
      DEFAULT_NZTA_CLUSTER_BASE_RADIUS_METERS,
      50,
      50000
    );
    var MAP_NZTA_CLUSTER_MAX_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.nztaClusterMaxRadiusMeters,
      DEFAULT_NZTA_CLUSTER_MAX_RADIUS_METERS,
      200,
      100000
    );
    var MAP_NZTA_CLUSTER_BASE_ZOOM = normaliseNumber(
      FNED_MAP_CFG.nztaClusterBaseZoom,
      DEFAULT_NZTA_CLUSTER_BASE_ZOOM,
      1,
      22
    );
    var MAP_NZTA_CLUSTER_ZOOM_STEP_MULTIPLIER = normaliseNumber(
      FNED_MAP_CFG.nztaClusterZoomStepMultiplier,
      DEFAULT_NZTA_CLUSTER_ZOOM_STEP_MULTIPLIER,
      1.0,
      4.0
    );
    var MAP_NZTA_CLUSTER_VIEWPORT_WIDTH_FACTOR = normaliseNumber(
      FNED_MAP_CFG.nztaClusterViewportWidthFactor,
      DEFAULT_NZTA_CLUSTER_VIEWPORT_WIDTH_FACTOR,
      0,
      0.5
    );
    var MAP_LOCAL_ROAD_CLUSTER_ENABLED = normaliseBoolean(
      FNED_MAP_CFG.localRoadClusterEnabled,
      DEFAULT_LOCAL_ROAD_CLUSTER_ENABLED
    );
    var MAP_LOCAL_ROAD_CLUSTER_MIN_COUNT = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterMinCount,
      DEFAULT_LOCAL_ROAD_CLUSTER_MIN_COUNT,
      1,
      20
    );
    var MAP_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterBaseRadiusMeters,
      DEFAULT_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS,
      50,
      50000
    );
    var MAP_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterMaxRadiusMeters,
      DEFAULT_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS,
      200,
      100000
    );
    var MAP_LOCAL_ROAD_CLUSTER_BASE_ZOOM = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterBaseZoom,
      DEFAULT_LOCAL_ROAD_CLUSTER_BASE_ZOOM,
      1,
      22
    );
    var MAP_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterZoomStepMultiplier,
      DEFAULT_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER,
      1.0,
      4.0
    );
    var MAP_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR = normaliseNumber(
      FNED_MAP_CFG.localRoadClusterViewportWidthFactor,
      DEFAULT_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR,
      0,
      0.5
    );

    var FEED_STATUS_API = window.FNED_FEED_STATUS_API || null;
    var SHARED_FETCH = window.FNED_FETCH || null;
    var FNED_ENDPOINTS = window.FNED_ENDPOINTS || {};
    var MAP_ENDPOINTS = FNED_ENDPOINTS.map || {};

    function feedStatusStart(feedKey, url) {
      if (FEED_STATUS_API && typeof FEED_STATUS_API.start === "function") {
        FEED_STATUS_API.start(feedKey, url);
      }
    }

    function feedStatusOk(feedKey, httpStatus) {
      if (FEED_STATUS_API && typeof FEED_STATUS_API.ok === "function") {
        FEED_STATUS_API.ok(feedKey, { httpStatus: httpStatus || null });
      }
    }

    function feedStatusFail(feedKey, error) {
      if (FEED_STATUS_API && typeof FEED_STATUS_API.fail === "function") {
        FEED_STATUS_API.fail(feedKey, error, { httpStatus: error && error.httpStatus ? error.httpStatus : null });
      }
    }

    function mapFetchTextTracked(feedKey, url, options) {
      if (SHARED_FETCH && typeof SHARED_FETCH.fetchText === "function") {
        return SHARED_FETCH.fetchText(url, {
          fetchOptions: options || {},
          feedKey: feedKey,
          feedStatusApi: FEED_STATUS_API,
          timeoutMs: 15000,
          retries: 1
        });
      }

      feedStatusStart(feedKey, url);
      return fetch(url, options).then(function (response) {
        if (!response.ok) {
          var httpError = new Error("HTTP " + response.status + " " + response.statusText);
          httpError.httpStatus = response.status;
          throw httpError;
        }
        return response.text().then(function (text) {
          feedStatusOk(feedKey, response.status);
          return text;
        });
      }).catch(function (error) {
        feedStatusFail(feedKey, error);
        throw error;
      });
    }

    function mapFetchJsonTracked(feedKey, url, options) {
      if (SHARED_FETCH && typeof SHARED_FETCH.fetchJson === "function") {
        return SHARED_FETCH.fetchJson(url, {
          fetchOptions: options || {},
          feedKey: feedKey,
          feedStatusApi: FEED_STATUS_API,
          timeoutMs: 15000,
          retries: 1
        });
      }

      feedStatusStart(feedKey, url);
      return fetch(url, options).then(function (response) {
        if (!response.ok) {
          var httpError = new Error("HTTP " + response.status + " " + response.statusText);
          httpError.httpStatus = response.status;
          throw httpError;
        }
        return response.json().then(function (data) {
          feedStatusOk(feedKey, response.status);
          return data;
        });
      }).catch(function (error) {
        feedStatusFail(feedKey, error);
        throw error;
      });
    }

    function mapFetchArrayBufferTracked(feedKey, url, options) {
      if (SHARED_FETCH && typeof SHARED_FETCH.fetchArrayBuffer === "function") {
        return SHARED_FETCH.fetchArrayBuffer(url, {
          fetchOptions: options || {},
          feedKey: feedKey,
          feedStatusApi: FEED_STATUS_API,
          timeoutMs: 15000,
          retries: 1
        });
      }

      feedStatusStart(feedKey, url);
      return fetch(url, options).then(function (response) {
        if (!response.ok) {
          var httpError = new Error("HTTP " + response.status + " " + response.statusText);
          httpError.httpStatus = response.status;
          throw httpError;
        }
        return response.arrayBuffer().then(function (data) {
          feedStatusOk(feedKey, response.status);
          return data;
        });
      }).catch(function (error) {
        feedStatusFail(feedKey, error);
        throw error;
      });
    }

    // Base map
    var map = L.map("situation-map", {
      center: mapCenter, // Roughly Far North District
      zoom: mapZoom
    });

    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var hybridImagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      opacity: 1,
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics"
    });
    var hybridOsmOverlay = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      opacity: 0.2,
      attribution: "&copy; OpenStreetMap"
    });
    var hybridTransport = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      opacity: 1,
      attribution: "Transportation &copy; Esri"
    });
    var hybridBoundaries = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Reference/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      opacity: 1,
      attribution: "Reference &copy; Esri"
    });
    var hybrid = L.layerGroup([hybridImagery, hybridOsmOverlay, hybridTransport, hybridBoundaries]);

    if (mapBaseStyle === "hybrid") {
      hybrid.addTo(map);
    } else {
      osm.addTo(map);
    }

    // Overlay layer containers
    var layerMetServiceWarnings = L.layerGroup();
    var layerCivilDefenceAlerts = L.layerGroup();
    var layerPowerOutages = L.layerGroup();
    var layerWaterOutages = L.layerGroup();
    var layerRoadWarnings = L.layerGroup();
    var layerMarae = L.layerGroup();
    var layerCommunityHalls = L.layerGroup();
	var layerServiceCentres = L.layerGroup(); // new
	var layerSwimsafe = L.layerGroup();        // new
    var layerWeatherAreas = L.layerGroup();
    var layerTides = L.layerGroup();
    var layerRivers = L.layerGroup();
	 var layerEarthquakes = L.layerGroup(); // GeoNet earthquakes
   var layerGeoNetWarnings = L.layerGroup(); // GeoNet quake warnings (CAP)
   var layerLocalRoadClosures = L.layerGroup();


    // Add layers to control
    var baseLayers = {
      "Standard": osm,
      "Hybrid": hybrid
    };

    var overlaysAll = {
      "MetService Weather Warnings": layerMetServiceWarnings,
      "Civil Defence Alerts": layerCivilDefenceAlerts,
      "Power Outages": layerPowerOutages,
      "Water Outages": layerWaterOutages,
      "NZTA Road Warnings and Closures": layerRoadWarnings,
	  "Local Road Closures": layerLocalRoadClosures, // NEW
      "Marae locations": layerMarae,
      "Community Hall locations": layerCommunityHalls,
	  "Service Centre locations": layerServiceCentres, // new
	    "Swimsafe Locations": layerSwimsafe,              // new
      "Weather": layerWeatherAreas,
      "Tides": layerTides,
      "NRC River Data": layerRivers,
	   "GeoNet Earthquakes": layerEarthquakes,// new,
	         "GeoNet Quake Warnings (CAP)": layerGeoNetWarnings
    };

    var overlays = {};
    if (enabledOverlays && enabledOverlays.length) {
      enabledOverlays.forEach(function (name) {
        if (overlaysAll[name]) overlays[name] = overlaysAll[name];
      });
    } else {
      overlays = overlaysAll;
    }

    var layersControl = L.control.layers(baseLayers, overlays, { collapsed: layersCollapsed }).addTo(map);

    if (defaultVisibleOverlays && defaultVisibleOverlays.length) {
      defaultVisibleOverlays.forEach(function (name) {
        var layer = overlays[name] || overlaysAll[name];
        if (layer && !map.hasLayer(layer)) {
          map.addLayer(layer);
        }
      });
    }


   


    // Helper: basic icon factory
    function makeIcon(color) {
      return L.divIcon({
        className: "custom-marker",
        html: '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.6);"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
    }

    // Symbol marker helper for high-signal emergency layers.
    function makeSymbolIcon(color, symbol, options) {
      var opts = options || {};
      var size = isFinite(opts.size) ? Number(opts.size) : MAP_SYMBOL_SIZE;
      var border = isFinite(opts.border) ? Number(opts.border) : MAP_SYMBOL_BORDER_WIDTH;
      var fontSize = isFinite(opts.fontSize) ? Number(opts.fontSize) : MAP_SYMBOL_FONT_SIZE;
      function iconTextColor(background) {
        var value = String(background || "").trim();
        var hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!hex) return "#ffffff";
        var raw = hex[1];
        if (raw.length === 3) {
          raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
        }
        var r = parseInt(raw.slice(0, 2), 16);
        var g = parseInt(raw.slice(2, 4), 16);
        var b = parseInt(raw.slice(4, 6), 16);
        var luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
        return luma > 170 ? "#0f172a" : "#ffffff";
      }
      var textColor = String(opts.textColor || iconTextColor(color));
      var symbolText = String(symbol || "").trim() || "?";
      return L.divIcon({
        className: "custom-marker custom-marker-symbol",
        html:
          '<div style="' +
            "width:" + size + "px;" +
            "height:" + size + "px;" +
            "border-radius:50%;" +
            "background:" + color + ";" +
            "border:" + border + "px solid #ffffff;" +
            "box-shadow:0 1px 4px rgba(0,0,0,0.55);" +
            "display:flex;align-items:center;justify-content:center;" +
            "line-height:1;" +
            "font-size:" + fontSize + "px;" +
            "font-weight:700;" +
            "color:" + textColor + ";" +
            "text-shadow:0 1px 1px rgba(0,0,0,0.45);" +
            '">' + symbolText + "</div>",
        iconSize: [size, size],
        iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
        popupAnchor: [0, -Math.round(size / 2)]
      });
    }

    function powerStatusSymbol(statusType) {
      if (statusType === "unplanned") return "\u26A1";
      if (statusType === "plannedActive") return "!";
      if (statusType === "planned") return "\u{1F5D3}";
      return "P";
    }

    function waterStatusSymbol(statusValue) {
      var token = String(statusValue || "").trim().toLowerCase();
      if (token === "restored" || token === "resolved") return "\u2713";
      if (token === "planned") return "\u{1F5D3}";
      if (token === "under repairs") return "\u{1F6E0}";
      if (token === "new" || token === "reported" || token === "current" || token === "unplanned") return "\u{1F4A7}";
      return "W";
    }

    function nztaSymbolForType(typeKey) {
      var t = String(typeKey || "").toLowerCase();
      if (t === "closures") return "\u26D4";
      if (t === "warnings") return "\u26A0";
      if (t === "roadworks") return "\u{1F6A7}";
      if (t === "hazards") return "!";
      return "R";
    }

    function localRoadClosureSymbol() {
      return "\u{1F6A7}";
    }

    var LAYER_CLUSTER_DEFAULTS = {
      enabled: true,
      radiusMeters: 450,
      minCount: 2
    };

    var MARKER_STACK_REGISTRY = createMarkerStackRegistry();

    function createMarkerStackRegistry() {
      return {
        keyCounts: Object.create(null),
        placed: []
      };
    }

    function markerStackKey(lat, lng) {
      return Number(lat).toFixed(6) + "," + Number(lng).toFixed(6);
    }

    var MAP_COLLISION_DISABLE_ZOOMS_FROM_MAX = 11;
    var DEFAULT_MAP_MAX_ZOOM = 19;

    function isCollisionActiveAtCurrentZoom() {
      if (!MAP_COLLISION_AVOIDANCE_ENABLED || !map || typeof map.getZoom !== "function") {
        return false;
      }
      var currentZoom = Number(map.getZoom());
      if (!isFinite(currentZoom)) {
        return false;
      }
      var maxZoom = (typeof map.getMaxZoom === "function") ? Number(map.getMaxZoom()) : NaN;
      if (!isFinite(maxZoom) || maxZoom > 24 || maxZoom <= 0) {
        maxZoom = DEFAULT_MAP_MAX_ZOOM;
      }
      return currentZoom > (maxZoom - MAP_COLLISION_DISABLE_ZOOMS_FROM_MAX);
    }

    function applyMarkerStackOffset(lat, lng, registry, options) {
      if (!isFinite(lat) || !isFinite(lng)) {
        return [lat, lng];
      }
      var opts = options || {};
      var targetRegistry = registry || MARKER_STACK_REGISTRY;
      if (!targetRegistry.keyCounts) targetRegistry.keyCounts = Object.create(null);
      if (!Array.isArray(targetRegistry.placed)) targetRegistry.placed = [];

      var key = markerStackKey(lat, lng);
      var count = targetRegistry.keyCounts[key] || 0;
      targetRegistry.keyCounts[key] = count + 1;
      var outLat = lat;
      var outLng = lng;

      if (count) {
        var stepMeters = 18;
        var ring = Math.floor(Math.sqrt(count));
        var angle = count * 1.0471975512;
        var radiusMeters = stepMeters * (1 + ring * 0.75);
        var dLat = (radiusMeters / 111320) * Math.cos(angle);
        var dLng = (radiusMeters / (111320 * Math.max(Math.cos(lat * Math.PI / 180), 0.2))) * Math.sin(angle);
        outLat = lat + dLat;
        outLng = lng + dLng;
      }

      var typeKey = String(opts.typeKey || "default");
      var markerSizePx = isFinite(opts.markerSizePx) ? Number(opts.markerSizePx) : MAP_SYMBOL_SIZE;
      var bufferPx = isFinite(opts.bufferPx) ? Number(opts.bufferPx) : MAP_COLLISION_BUFFER_PX;
      var avoidDifferentTypeOnly = opts.avoidDifferentTypeOnly !== false;
      var stepPxMultiplier = isFinite(opts.stepPxMultiplier) ? Number(opts.stepPxMultiplier) : 1;
      if (!isFinite(stepPxMultiplier) || stepPxMultiplier <= 0) stepPxMultiplier = 1;
      var customMaxOffsetPx = isFinite(opts.maxOffsetPx) ? Number(opts.maxOffsetPx) : null;

      if (
        isCollisionActiveAtCurrentZoom() &&
        map &&
        typeof map.latLngToLayerPoint === "function" &&
        typeof map.layerPointToLatLng === "function"
      ) {
        var originPt = map.latLngToLayerPoint(L.latLng(lat, lng));
        var pt = map.latLngToLayerPoint(L.latLng(outLat, outLng));
        var stepPx = Math.max(2, (markerSizePx * 0.18) + Math.max(1, bufferPx * 0.5));
        stepPx = stepPx * stepPxMultiplier;
        var maxOffsetPx = Math.max(18, Math.min(60, (markerSizePx * 0.9) + (bufferPx * 3)));
        if (count > 0) {
          maxOffsetPx = Math.min(72, maxOffsetPx + Math.min(12, count * 2));
        }
        if (customMaxOffsetPx !== null) {
          maxOffsetPx = Math.max(18, customMaxOffsetPx);
        }
        var maxAttempts = 20;
        for (var attempt = 0; attempt < maxAttempts; attempt++) {
          var pushX = 0;
          var pushY = 0;
          for (var i = 0; i < targetRegistry.placed.length; i++) {
            var placed = targetRegistry.placed[i];
            if (!placed) continue;
            if (avoidDifferentTypeOnly && String(placed.typeKey || "default") === typeKey) {
              continue;
            }
            var otherSize = isFinite(placed.sizePx) ? Number(placed.sizePx) : MAP_SYMBOL_SIZE;
            var required = ((markerSizePx + otherSize) / 2) + bufferPx;
            var dx = pt.x - Number(placed.x || 0);
            var dy = pt.y - Number(placed.y || 0);
            var dist = Math.sqrt((dx * dx) + (dy * dy));
            if (dist < required) {
              var overlap = required - dist;
              if (dist < 0.001) {
                var angleJitter = (attempt + 1) * 2.3999632297;
                dx = Math.cos(angleJitter);
                dy = Math.sin(angleJitter);
                dist = 1;
              }
              pushX += (dx / dist) * overlap;
              pushY += (dy / dist) * overlap;
            }
          }
          if (Math.abs(pushX) < 0.01 && Math.abs(pushY) < 0.01) {
            break;
          }
          pushX = Math.max(-stepPx * 2, Math.min(stepPx * 2, pushX * 0.6));
          pushY = Math.max(-stepPx * 2, Math.min(stepPx * 2, pushY * 0.6));
          var jitter = ((attempt % 2 === 0) ? 1 : -1) * stepPx * 0.12;
          var nextPt = L.point(pt.x + pushX + jitter, pt.y + pushY - jitter);
          var dxFromOrigin = nextPt.x - originPt.x;
          var dyFromOrigin = nextPt.y - originPt.y;
          var distFromOrigin = Math.sqrt((dxFromOrigin * dxFromOrigin) + (dyFromOrigin * dyFromOrigin));
          if (distFromOrigin > maxOffsetPx && distFromOrigin > 0.001) {
            var scale = maxOffsetPx / distFromOrigin;
            nextPt = L.point(originPt.x + (dxFromOrigin * scale), originPt.y + (dyFromOrigin * scale));
          }
          pt = nextPt;
        }

        var adjustedLatLng = map.layerPointToLatLng(pt);
        outLat = Number(adjustedLatLng.lat);
        outLng = Number(adjustedLatLng.lng);

        targetRegistry.placed.push({
          x: Number(pt.x),
          y: Number(pt.y),
          sizePx: markerSizePx,
          typeKey: typeKey
        });
      }

      return [outLat, outLng];
    }

    function distanceMeters(aLat, aLng, bLat, bLng) {
      var toRad = Math.PI / 180;
      var dLat = (bLat - aLat) * toRad;
      var dLng = (bLng - aLng) * toRad;
      var lat1 = aLat * toRad;
      var lat2 = bLat * toRad;
      var sinLat = Math.sin(dLat / 2);
      var sinLng = Math.sin(dLng / 2);
      var h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
      return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
    }

    function clusterRecordsByDistance(records, radiusMeters) {
      var clusters = [];
      (records || []).forEach(function (record) {
        if (!record || !isFinite(record.lat) || !isFinite(record.lng)) return;
        var chosen = null;
        for (var i = 0; i < clusters.length; i++) {
          var c = clusters[i];
          if (distanceMeters(record.lat, record.lng, c.lat, c.lng) <= radiusMeters) {
            chosen = c;
            break;
          }
        }
        if (!chosen) {
          clusters.push({
            lat: record.lat,
            lng: record.lng,
            items: [record]
          });
          return;
        }
        chosen.items.push(record);
        var n = chosen.items.length;
        chosen.lat = ((chosen.lat * (n - 1)) + record.lat) / n;
        chosen.lng = ((chosen.lng * (n - 1)) + record.lng) / n;
      });
      return clusters;
    }

    function addClusteredSymbolMarkers(records, targetLayer, options) {
      var opts = options || {};
      var radiusMeters = isFinite(opts.radiusMeters) ? Number(opts.radiusMeters) : LAYER_CLUSTER_DEFAULTS.radiusMeters;
      var minCount = isFinite(opts.minCount) ? Number(opts.minCount) : LAYER_CLUSTER_DEFAULTS.minCount;
      var clustersEnabled = opts.enabled !== false && LAYER_CLUSTER_DEFAULTS.enabled !== false;
      var stackRegistry = opts.stackRegistry || MARKER_STACK_REGISTRY;

      var byType = Object.create(null);
      (records || []).forEach(function (record) {
        if (!record || !isFinite(record.lat) || !isFinite(record.lng)) return;
        var typeKey = String(record.clusterType || record.typeKey || "default");
        if (!byType[typeKey]) byType[typeKey] = [];
        byType[typeKey].push(record);
      });

      Object.keys(byType).forEach(function (typeKey) {
        var typeRecords = byType[typeKey];
        var groups = clustersEnabled ? clusterRecordsByDistance(typeRecords, radiusMeters) : typeRecords.map(function (record) {
          return { lat: record.lat, lng: record.lng, items: [record] };
        });

        groups.forEach(function (group) {
          if (!group || !group.items || !group.items.length) return;
          var first = group.items[0];
          var useClusterBubble = group.items.length > 1 && group.items.length >= minCount;
          var markerSizePx = useClusterBubble ? MAP_CLUSTER_SYMBOL_SIZE : MAP_SYMBOL_SIZE;
          var currentZoom = (map && typeof map.getZoom === "function") ? Number(map.getZoom()) : mapZoom;
          // At low zoom levels, separate all cluster bubbles to reduce unreadable pileups.
          var forceAllTypeSeparation = useClusterBubble && isCollisionActiveAtCurrentZoom() && isFinite(currentZoom) && currentZoom <= 8;
          var effectiveBufferPx = forceAllTypeSeparation
            ? (MAP_COLLISION_BUFFER_PX + Math.max(4, Math.round(MAP_COLLISION_BUFFER_PX * 0.8)))
            : MAP_COLLISION_BUFFER_PX;
          var point = applyMarkerStackOffset(group.lat, group.lng, stackRegistry, {
            typeKey: String(first.clusterType || typeKey || "default"),
            markerSizePx: markerSizePx,
            bufferPx: effectiveBufferPx,
            avoidDifferentTypeOnly: !forceAllTypeSeparation,
            stepPxMultiplier: forceAllTypeSeparation ? 1.7 : 1,
            maxOffsetPx: forceAllTypeSeparation ? Math.max(170, markerSizePx * 3.6) : null
          });
          var marker;
          if (useClusterBubble) {
            var countLabel = group.items.length > 99 ? "99+" : String(group.items.length);
            marker = L.marker(point, {
              icon: makeSymbolIcon(first.color || "#334155", countLabel, {
                size: MAP_CLUSTER_SYMBOL_SIZE,
                fontSize: MAP_CLUSTER_SYMBOL_FONT_SIZE
              })
            });
            var clusterBody = group.items.slice(0, 40).map(function (entry) {
              return "<li>" + (entry.clusterLabel || entry.title || entry.name || "Item") + "</li>";
            }).join("");
            var extra = group.items.length > 40 ? "<li>+" + (group.items.length - 40) + " more</li>" : "";
            marker.bindPopup(
              "<strong>" + (first.clusterGroupLabel || first.legendLabel || "Cluster") + "</strong><br>" +
              "Count: " + group.items.length + "<br><ul style='margin:0.35rem 0 0;padding-left:1.1rem;'>" + clusterBody + extra + "</ul>"
            );
          } else {
            marker = L.marker(point, {
              icon: makeSymbolIcon(first.color || "#334155", first.symbol || "•")
            });
            marker.bindPopup(first.popupHtml || first.clusterLabel || "Map item");
          }
          targetLayer.addLayer(marker);
        });
      });
    }

    // Helper: tide icon with direction arrow
function makeTideIcon(color, direction) {
  var arrowChar =
    direction === "rising" ? "\u2191" :
    direction === "falling" ? "\u2193" :
    "";

  var arrowHtml = arrowChar
    ? '<span style="margin-left:4px;font-size:18px;line-height:1;">' + arrowChar + "</span>"
    : "";

  return L.divIcon({
    className: "custom-marker custom-marker-tide",
    html:
      '<div style="display:flex;align-items:center;">' +
        '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' +
          color +
          ';border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.6);"></span>' +
        arrowHtml +
      "</div>",
    iconSize: [28, 22],
    iconAnchor: [14, 11]
  });
}



    // Marker style configuration
    // Polygons have their own styling further down
    var MARKER_CONFIG = {
      weatherAreas: {
        color: "#1976d2"
      },
      tides: {
        // Default tide marker colour
        defaultColor: "#009688",
        // Optional different colours by tide state if your data includes it
        // For example site.state or site.tideType
        colorByState: {
          high: "#2196f3",
          low: "#ff9800"
        }
      },
      powerOutages: {
        // Keys match statusType passed into colourForStatus
        unplanned: "#e91e63",
        plannedActive: "#d81b60",
        planned: "#ffb300",
        defaultColor: "#9e9e9e"
      },
      waterOutages: {
        defaultColor: "#2196f3",
        // Keys match item.status from the asset listing
        colorByStatus: {
          "New": " #0277bd",
          "Reported": "#0288d1",
          "Under repairs": "#f57c00",
          "Planned": "#7b1fa2",
          "Restored": "#2e7d32"
        }
      },
      nzta: {
        // Point marker colours by NZTA event type
        point: {
          closures: "#b71c1c",
          warnings: "#ff9800",
          roadworks: "#009688",
          hazards: "#ff5722",
          defaultColor: "#1976d2"
        }
      },
      marae: {
        color: "#795548"
      },
      communityHalls: {
        color: "#7c3aed",
        symbol: "H"
      },
      serviceCentres: {
        color: "#d97706",
        symbol: "S"
      },
      rivers: {
        // Colour by flow or trend from Icon.Name
        defaultColor: "#4caf50",
        colorByTrend: {
          rising: "#1976d2",
          falling: "#f44336"
        }
      },
swimsafe: {
  defaultColor: "#00bcd4",
  colorByRiskClass: {
    // Very low
    "risk-vlow-overall": "#4caf50",
    "risk-vlow-weekly": "#4caf50",
    "risk-vlow-special": "#4caf50",

    // Low
    "risk-low-overall": "#8bc34a",
    "risk-low-weekly": "#cddc39",
    "risk-low-special": "#cddc39",

    // Medium / moderate
    "risk-medium-overall": "#ff9800",
    "risk-medium-weekly": "#ff9800",
    "risk-medium-special": "#ff9800",

    // High
    "risk-high-overall": "#f44336",
    "risk-high-weekly": "#f44336",
    "risk-high-special": "#f44336",

    // No data
    "nodata-overall": "#9e9e9e"
  }
},
      earthquakes: {
        // Colours by magnitude band
        minor: "#4caf50",      // mag < 2.5
        light: "#ff9800",      // 2.5 <= mag < 4
        moderate: "#f44336",   // mag >= 4
        defaultColor: "#795548"
        },
		localRoadClosures: {
    color: "#b71c1c" // dark red for local closures
  },
       geonetCap: {
         // Marker / circle colour for GeoNet CAP quake warnings
         color: "#fbc02d"
       }
    };

// Legend configuration: which overlays contribute which legend items
var LEGEND_CONFIG = {
  "Weather": {
    group: "Weather",
    items: [
      { color: MARKER_CONFIG.weatherAreas.color, label: "Weather location" }
    ]
  },
  "Tides": {
    group: "Tides",
    items: [
      { color: MARKER_CONFIG.tides.defaultColor, label: "Tide site" },
      {
        color: (MARKER_CONFIG.tides.colorByState && MARKER_CONFIG.tides.colorByState.high) || "#2196f3",
        label: "High tide phase"
      },
      {
        color: (MARKER_CONFIG.tides.colorByState && MARKER_CONFIG.tides.colorByState.low) || "#ff9800",
        label: "Low tide phase"
      }
    ]
  },
  "Power Outages": {
    group: "Power outages (Top Energy)",
    items: [
      { color: MARKER_CONFIG.powerOutages.unplanned, symbol: powerStatusSymbol("unplanned"), label: "Unplanned outage" },
      { color: MARKER_CONFIG.powerOutages.plannedActive, symbol: powerStatusSymbol("plannedActive"), label: "Planned outage active" },
      { color: MARKER_CONFIG.powerOutages.planned, symbol: powerStatusSymbol("planned"), label: "Planned outage scheduled" }
    ]
  },
  "Water Outages": {
    group: "Water outages (FNDC)",
    items: [
      {
        color: MARKER_CONFIG.waterOutages.colorByStatus["New"],
        symbol: waterStatusSymbol("New"),
        label: "New"
      },
      {
        color: MARKER_CONFIG.waterOutages.colorByStatus["Reported"],
        symbol: waterStatusSymbol("Reported"),
        label: "Reported"
      },
      {
        color: MARKER_CONFIG.waterOutages.colorByStatus["Under repairs"],
        symbol: waterStatusSymbol("Under repairs"),
        label: "Under repairs"
      },
      {
        color: MARKER_CONFIG.waterOutages.colorByStatus["Planned"],
        symbol: waterStatusSymbol("Planned"),
        label: "Planned"
      },
      {
        color: MARKER_CONFIG.waterOutages.colorByStatus["Restored"],
        symbol: waterStatusSymbol("Restored"),
        label: "Restored"
      }
    ]
  },
  "NZTA Road Warnings and Closures": {
    group: "Road events (NZTA)",
    items: [
      { color: MARKER_CONFIG.nzta.point.closures, symbol: nztaSymbolForType("closures"), label: "Closure" },
      { color: MARKER_CONFIG.nzta.point.warnings, symbol: nztaSymbolForType("warnings"), label: "Warning or caution" },
      { color: MARKER_CONFIG.nzta.point.roadworks, symbol: nztaSymbolForType("roadworks"), label: "Roadworks" },
      { color: MARKER_CONFIG.nzta.point.hazards, symbol: nztaSymbolForType("hazards"), label: "Hazard" }
    ]
  },  // NEW LEGEND GROUP
  "Local Road Closures": {
    group: "Road events (Local)",
    items: [
      {
        color: MARKER_CONFIG.localRoadClosures.color,
        symbol: localRoadClosureSymbol(),
        label: "Local closure"
      }
    ]
  },
  "Marae locations": {
    group: "Community",
    items: [
      { color: MARKER_CONFIG.marae.color, symbol: "M", label: "Marae" }
    ]
  },
  "Community Hall locations": {
    group: "Community",
    items: [
      { color: MARKER_CONFIG.communityHalls.color, symbol: MARKER_CONFIG.communityHalls.symbol || "H", label: "Community hall" }
    ]
  },
  "Service Centre locations": {
    group: "Community",
    items: [
      { color: MARKER_CONFIG.serviceCentres.color, symbol: MARKER_CONFIG.serviceCentres.symbol || "S", label: "Service centre" }
    ]
  },
"Swimsafe Locations": {
  group: "Community",
  items: [
    {
      color: MARKER_CONFIG.swimsafe.colorByRiskClass["risk-vlow-overall"],
      label: "Very low risk"
    },
    {
      color: MARKER_CONFIG.swimsafe.colorByRiskClass["risk-low-weekly"],
      label: "Low risk"
    },
    {
      color: MARKER_CONFIG.swimsafe.colorByRiskClass["risk-medium-overall"],
      label: "Moderate risk"
    },
    {
      color: MARKER_CONFIG.swimsafe.colorByRiskClass["risk-high-overall"],
      label: "High risk"
    },
    {
      color: MARKER_CONFIG.swimsafe.colorByRiskClass["nodata-overall"],
      label: "No recent risk data"
    }
  ]
},
  "GeoNet Earthquakes": {
    group: "Earthquakes (GeoNet)",
    items: [
      { color: "#f44336", label: "Earthquake (size by magnitude)" }
    ]
  },
  "GeoNet Quake Warnings (CAP)": {
    group: "GeoNet warnings (CAP)",
    items: [
      { color: MARKER_CONFIG.geonetCap.color, label: "Quake warning area (CAP)" }
    ]
  },
  "NRC River Data": {
    group: "Rivers (NRC)",
    items: [
      { color: MARKER_CONFIG.rivers.defaultColor, label: "River site" },
      {
        color: (MARKER_CONFIG.rivers.colorByTrend && MARKER_CONFIG.rivers.colorByTrend.rising) || "#1976d2",
        label: "River rising"
      },
      {
        color: (MARKER_CONFIG.rivers.colorByTrend && MARKER_CONFIG.rivers.colorByTrend.falling) || "#f44336",
        label: "River falling"
      }
    ]
  },
  "MetService Weather Warnings": {
    group: "MetService weather warnings",
    items: [
      { color: "#f44336", label: "Severe weather polygon" }
    ]
  },
  "Civil Defence Alerts": {
    group: "Civil Defence alerts",
    items: [
      { color: "#ff9800", label: "Civil Defence alert area" }
    ]
  }
};

// Will hold a reference to the legend content element once the legend is added
var legendContentEl = null;

function legendTextColor(background) {
  var value = String(background || "").trim();
  var hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return "#ffffff";
  var raw = hex[1];
  if (raw.length === 3) {
    raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
  }
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  var luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
  return luma > 170 ? "#0f172a" : "#ffffff";
}

function renderLegendSwatch(item) {
  var color = item && item.color ? item.color : "#9e9e9e";
  var symbol = item && item.symbol ? String(item.symbol) : "";
  var symbolClass = symbol ? " legend-swatch-symbol" : "";
  var symbolStyle = symbol ? (";color:" + legendTextColor(color) + ";font-size:10px;font-weight:700") : "";
  return '<span class="legend-swatch' + symbolClass + '" style="background:' + color + symbolStyle + ';">' + symbol + "</span>";
}

// Update legend content based on which overlays are currently visible
function updateLegend() {
  if (!legendContentEl) {
    return;
  }

  var groupsByName = {};
  var groupList = [];

  // Build grouped legend entries in overlay order
  Object.keys(overlays).forEach(function (overlayName) {
    var layer = overlays[overlayName];
    if (!map.hasLayer(layer)) {
      return;
    }

    var cfg = LEGEND_CONFIG[overlayName];
    if (!cfg) {
      return;
    }

    var groupName = cfg.group;
    var group = groupsByName[groupName];
    if (!group) {
      group = { name: groupName, items: [] };
      groupsByName[groupName] = group;
      groupList.push(group);
    }

    cfg.items.forEach(function (item) {
      group.items.push(item);
    });
  });

  if (!groupList.length) {
    legendContentEl.innerHTML =
      '<p style="margin:0;font-size:0.8rem;">No overlay layers are selected.</p>';
    return;
  }

  var html = "<ul>";
  groupList.forEach(function (group) {
    html += "<li><strong>" + group.name + "</strong></li>";
    group.items.forEach(function (item) {
      html +=
        '<li class="legend-item">' +
          renderLegendSwatch(item) +
          item.label +
        "</li>";
    });
  });
  html += "</ul>";

  legendContentEl.innerHTML = html;
}

// Collapsible marker legend driven by visible overlay layers
var legendRootEl = null;
var legendControl = null;
var legendBelowHostEl = null;

function createLegendElement() {
  var div = L.DomUtil.create("div", "map-legend");

  if (legendPosition === "below") {
    div.classList.add("map-legend-below");
  }

  div.innerHTML =
    '<button type="button" class="legend-toggle" aria-expanded="true">' +
      '<span class="legend-title">Legend</span>' +
      '<span class="legend-toggle-icon" aria-hidden="true">&#9662;</span>' +
    "</button>" +
    '<div class="legend-content"></div>';

  legendContentEl = div.querySelector(".legend-content");

  var toggleBtn = div.querySelector(".legend-toggle");

  L.DomEvent.disableClickPropagation(div);

  L.DomEvent.on(toggleBtn, "click", function (e) {
    L.DomEvent.stopPropagation(e);

    var expanded = toggleBtn.getAttribute("aria-expanded") === "true";
    var newExpanded = !expanded;

    toggleBtn.setAttribute("aria-expanded", newExpanded ? "true" : "false");

    if (newExpanded) {
      div.classList.remove("legend-collapsed");
      legendContentEl.style.display = "";
    } else {
      div.classList.add("legend-collapsed");
      legendContentEl.style.display = "none";
    }
  });

  return div;
}

function mountLegend() {
  if (legendControl && map && typeof map.removeControl === "function") {
    try { map.removeControl(legendControl); } catch (_legendRemoveErr) {}
  }
  legendControl = null;

  if (legendBelowHostEl && legendBelowHostEl.parentNode) {
    legendBelowHostEl.parentNode.removeChild(legendBelowHostEl);
  }
  legendBelowHostEl = null;

  legendRootEl = createLegendElement();

  if (legendPosition === "below") {
    var mapEl = document.getElementById("situation-map");
    var mapHost = (mapEl && mapEl.parentNode) ? mapEl.parentNode : null;
    if (mapHost && mapHost.parentNode) {
      if (mapHost.nextSibling) {
        mapHost.parentNode.insertBefore(legendRootEl, mapHost.nextSibling);
      } else {
        mapHost.parentNode.appendChild(legendRootEl);
      }
      legendBelowHostEl = legendRootEl;
    }
  } else {
    legendControl = L.control({ position: legendPosition });
    legendControl.onAdd = function () {
      return legendRootEl;
    };
    legendControl.addTo(map);
  }

  updateLegend();
}

mountLegend();

// Keep legend in sync with layer visibility
map.on("overlayadd", function () {
  updateLegend();
});
map.on("overlayremove", function () {
  updateLegend();
});

// NZTA event visibility by feature.properties.type
// Valid values in delays.json are usually: closures, warnings, roadworks, hazards
var NZTA_EVENT_TYPE_VISIBILITY = {
  closures: true,
  warnings: true,
  roadworks: true,
  hazards: true
};

function normaliseNztaTypeKey(raw) {
  var token = String(raw || "").trim().toLowerCase();
  if (!token) return "";
  if (token === "closures" || token === "closure" || token.indexOf("road closure") !== -1) return "closures";
  if (token === "warnings" || token === "warning" || token.indexOf("area warning") !== -1 || token.indexOf("caution") !== -1) return "warnings";
  if (token === "roadworks" || token === "roadwork" || token.indexOf("road work") !== -1) return "roadworks";
  if (token === "hazards" || token === "hazard") return "hazards";
  return "";
}

function nztaTypeKeyForFeature(feature) {
  var p = feature && feature.properties ? feature.properties : {};
  var eventType = String(p.EventType || "").toLowerCase();
  if (eventType.indexOf("road hazard") !== -1 || eventType.indexOf("hazard") !== -1) {
    return "hazards";
  }
  if (eventType.indexOf("road closure") !== -1 || eventType.indexOf("closure") !== -1) {
    return "closures";
  }
  if (eventType.indexOf("area warning") !== -1 || eventType.indexOf("warning") !== -1 || eventType.indexOf("caution") !== -1) {
    return "warnings";
  }
  if (eventType.indexOf("road work") !== -1 || eventType.indexOf("roadwork") !== -1 || eventType.indexOf("maintenance") !== -1) {
    return "roadworks";
  }

  var combined = [
    p.EventType,
    p.Impact,
    p.IconClass,
    p.Name,
    p.EventDescription,
    p.EventComments
  ].map(function (value) {
    return String(value || "").toLowerCase();
  }).join(" | ");

  if (combined.indexOf("road close") !== -1 || combined.indexOf("closure") !== -1 || combined.indexOf("closed") !== -1) {
    return "closures";
  }
  if (combined.indexOf("hazard") !== -1) {
    return "hazards";
  }
  if (combined.indexOf("warning") !== -1 || combined.indexOf("caution") !== -1) {
    return "warnings";
  }
  if (
    combined.indexOf("roadwork") !== -1 ||
    combined.indexOf("road work") !== -1 ||
    combined.indexOf("maintenance") !== -1 ||
    combined.indexOf("resurfacing") !== -1 ||
    combined.indexOf("stop/go") !== -1
  ) {
    return "roadworks";
  }
  var fromType = normaliseNztaTypeKey(p.type);
  if (fromType) return fromType;
  return "warnings";
}

function nztaEventIsVisible(feature) {
  var typeKey = nztaTypeKeyForFeature(feature);

  // If there is no type just show it
  if (!typeKey) return true;

  if (Object.prototype.hasOwnProperty.call(NZTA_EVENT_TYPE_VISIBILITY, typeKey)) {
    return !!NZTA_EVENT_TYPE_VISIBILITY[typeKey];
  }

  // Unknown type defaults to visible
  return true;
}


        // 1. Weather From Open Meteo For Key Locations

    // Live Open Meteo API for six Far North locations
    var OPEN_METEO_URL =
      "https://api.open-meteo.com/v1/forecast?latitude=-35.111,-35.415307,-35.1034116,-35.27075,-34.834066,-34.511518,-35.2268,-35.4022&longitude=173.265,173.797135,173.7109356,173.215174,173.106533,172.890875,173.9472,173.5041&daily=weather_code&hourly=precipitation_probability,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,wind_gusts_10m,precipitation&timezone=Pacific%2FAuckland&forecast_days=3";

    // Local test option: use your saved Open Meteo response file instead of live API
    // var OPEN_METEO_URL = "forecast.json";

    // Locations in the same order as the Open Meteo latitude and longitude lists
    var WEATHER_LOCATIONS = [
      { name: "Kaitaia",     lat: -35.111,     lng: 173.265 },
      { name: "Kaikohe",     lat: -35.415307,  lng: 173.797135 },
	  { name: "Kerikeri",     lat: -35.2268,  lng: 173.9472 },
	  { name: "Rawene",     lat: -35.4022,  lng: 173.5041 },
      { name: "Kaeo",        lat: -35.1034116, lng: 173.7109356 },
      { name: "Herekino",    lat: -35.27075,   lng: 173.215174 },
      { name: "Waiharara",   lat: -34.834066,  lng: 173.106533 },
      { name: "Cape Reinga", lat: -34.511518,  lng: 172.890875 }
    ];

    // Translate WMO weather code to a simple description
    function wmoToText(code) {
      var map = {
        0:  "Clear sky",
        1:  "Mainly clear",
        2:  "Partly cloudy",
        3:  "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
      };
      return map[code] || "Unknown conditions";
    }

    function buildWeatherPopupHtml(site, forecast) {
      var current = forecast.current || {};
      var dailyCode =
        forecast.daily &&
        Array.isArray(forecast.daily.weather_code) &&
        forecast.daily.weather_code.length
          ? forecast.daily.weather_code[0]
          : null;

      var currentDesc =
        typeof current.weather_code === "number"
          ? wmoToText(current.weather_code)
          : "";

      var dailyDesc =
        typeof dailyCode === "number"
          ? wmoToText(dailyCode)
          : "";

      var html =
        "<strong>" + site.name + "</strong><br>" +
        (currentDesc ? "Now: " + currentDesc + "<br>" : "") +
        "Temperature: " +
        (current.temperature_2m != null
          ? current.temperature_2m.toFixed(1) + " \u00B0C"
          : "n/a") +
        "<br>" +
        "Feels like: " +
        (current.apparent_temperature != null
          ? current.apparent_temperature.toFixed(1) + " \u00B0C"
          : "n/a") +
        "<br>" +
        "Humidity: " +
        (current.relative_humidity_2m != null
          ? current.relative_humidity_2m + " %"
          : "n/a") +
        "<br>" +
        "Wind: " +
        (current.wind_speed_10m != null
          ? current.wind_speed_10m + " km/h"
          : "n/a") +
        (current.wind_direction_10m != null
          ? " (" + current.wind_direction_10m + "\u00B0)"
          : "") +
        "<br>";

      if (current.wind_gusts_10m != null) {
        html += "Gusts: " + current.wind_gusts_10m + " km/h<br>";
      }

      if (current.precipitation != null) {
        html += "Precipitation: " + current.precipitation + " mm<br>";
      }

      if (dailyDesc) {
        html += "<br>Today: " + dailyDesc;
      }

      return html;
    }

    function addWeatherMarker(site, forecast) {
      var popupHtml = buildWeatherPopupHtml(site, forecast);

      var marker = L.marker([site.lat, site.lng], {
        icon: makeIcon(MARKER_CONFIG.weatherAreas.color)
      });

      // Hover popup behaviour for the Weather layer
      marker.bindPopup(popupHtml);
      marker.on("mouseover", function () {
        this.openPopup();
      });
      marker.on("mouseout", function () {
        this.closePopup();
      });

      layerWeatherAreas.addLayer(marker);
    }

    function loadWeatherFromOpenMeteo() {
      fetch(OPEN_METEO_URL)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          // Open Meteo multi location responses are an array
          // Your saved forecast.json has this format
          var forecasts = Array.isArray(data) ? data : [data];

          if (!forecasts.length) {
            console.warn("Open Meteo weather data empty");
            return;
          }

          WEATHER_LOCATIONS.forEach(function (site, idx) {
            var forecast = forecasts[idx];
            if (!forecast || !forecast.current) {
              return;
            }
            addWeatherMarker(site, forecast);
          });
        })
        .catch(function (err) {
          console.warn("Open Meteo weather load failed", err);
        });
    }

    // Kick off weather load
    loadWeatherFromOpenMeteo();


        // 2. Tides from NIWA Tide API and CSV locations

    // CSV containing place name and coordinates
    // Format (single header, then repeating "Name,lat,lng" groups):
    // Place, Latitude, Longitude Cape Maria van Diemen,-34.40...,172.62... Ngatehe Point,-34.52...,173.41...
    var TIDES_CSV_URL =
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/Tides%20-%20Tides.csv";

    // NIWA Tides API endpoint and key
    var NIWA_TIDES_API_URL = "https://api.niwa.co.nz/tides/data";
    var NIWA_TIDES_API_KEY = "qMPsVJPmEXB1b0YQtGJE5i9bnzOWOq1O";

    // Build NIWA request URL for one site, wrapped through CORS proxy
    function buildNiwaTideUrl(lat, lng) {
      var now = new Date();
      var startDate = now.toISOString().slice(0, 10); // yyyy-mm-dd (UTC)

      var baseUrl =
        NIWA_TIDES_API_URL +
        "?lat=" +
        encodeURIComponent(lat) +
        "&long=" +
        encodeURIComponent(lng) +
        "&numberOfDays=2" +
        "&startDate=" +
        encodeURIComponent(startDate) +
        "&datum=LAT" +
        "&apikey=" +
        encodeURIComponent(NIWA_TIDES_API_KEY);

      // Use same proxy pattern as other feeds
      return "https://corsproxy.io/?url=" + encodeURIComponent(baseUrl);
    }

    // Parse your compact CSV into [{ name, lat, lng }, ...]
    function parseTideCsv(text) {
      if (!text) {
        return [];
      }

      var raw = text.trim();

      // Remove header "Place, Latitude, Longitude"
      raw = raw.replace(/^Place,\s*Latitude,\s*Longitude\s*/i, "");

      var sites = [];

      // Remaining string is repeating: Name,lat,lng [space] Name2,lat2,lng2 ...
      while (raw.length) {
        var firstComma = raw.indexOf(",");
        if (firstComma === -1) {
          break;
        }
        var name = raw.slice(0, firstComma).trim();
        var rest = raw.slice(firstComma + 1).trim();

        var secondComma = rest.indexOf(",");
        if (secondComma === -1) {
          break;
        }
        var latStr = rest.slice(0, secondComma).trim();
        rest = rest.slice(secondComma + 1).trim();

        var nextSpace = rest.indexOf(" ");
        var lngStr;
        var remainder;
        if (nextSpace === -1) {
          lngStr = rest.trim();
          remainder = "";
        } else {
          lngStr = rest.slice(0, nextSpace).trim();
          remainder = rest.slice(nextSpace + 1).trim();
        }

        var lat = parseFloat(latStr);
        var lng = parseFloat(lngStr);

        if (!isNaN(lat) && !isNaN(lng) && name) {
          sites.push({ name: name, lat: lat, lng: lng });
        }

        raw = remainder;
      }

      return sites;
    }

    // Normalise NIWA response into sorted [{ time: Date, height: number }, ...]
    function normaliseNiwaTideValues(data) {
      if (!data || !data.values) {
        return [];
      }

      var series = [];
      var rawValues = data.values;

      for (var i = 0; i < rawValues.length; i++) {
        var v = rawValues[i];
        var timeStr;
        var height;

        if (Array.isArray(v)) {
          timeStr = v[0];
          height = parseFloat(v[1]);
        } else {
          timeStr = v.time || v.dateTime || v[0];
          if (v.value != null) {
            height = parseFloat(v.value);
          } else if (v.height != null) {
            height = parseFloat(v.height);
          } else {
            height = parseFloat(v[1]);
          }
        }

        if (!timeStr || !isFinite(height)) {
          continue;
        }

        var t = new Date(timeStr);
        if (isNaN(t.getTime())) {
          continue;
        }

        series.push({ time: t, height: height });
      }

      series.sort(function (a, b) {
        return a.time - b.time;
      });

      return series;
    }

    // Detect local high and low tide events from a height time series
    function detectTideEvents(series) {
      var events = [];
      if (!series || series.length < 3) {
        return events;
      }

      for (var i = 1; i < series.length - 1; i++) {
        var prev = series[i - 1];
        var cur = series[i];
        var next = series[i + 1];

        var type = null;
        if (cur.height >= prev.height && cur.height >= next.height) {
          type = "H"; // high
        } else if (cur.height <= prev.height && cur.height <= next.height) {
          type = "L"; // low
        }

        if (type) {
          events.push({
            type: type,
            time: cur.time,
            height: cur.height
          });
        }
      }

      return events;
    }

    // Summarise: last high, last low, next high, next low, and current height
        // Summarise: last high, last low, next high, next low, and current height
    function summariseTideState(series) {
      var events = detectTideEvents(series);
      if (!events.length) {
        return null;
      }

      var now = new Date();

      var lastEvent = null;
      var nextEvent = null;
      var lastHigh = null;
      var nextHigh = null;
      var lastLow = null;
      var nextLow = null;

      for (var i = 0; i < events.length; i++) {
        var e = events[i];

        if (e.time <= now) {
          if (!lastEvent || e.time > lastEvent.time) {
            lastEvent = e;
          }
          if (e.type === "H" && (!lastHigh || e.time > lastHigh.time)) {
            lastHigh = e;
          }
          if (e.type === "L" && (!lastLow || e.time > lastLow.time)) {
            lastLow = e;
          }
        }

        if (e.time >= now) {
          if (!nextEvent || e.time < nextEvent.time) {
            nextEvent = e;
          }
          if (e.type === "H" && (!nextHigh || e.time < nextHigh.time)) {
            nextHigh = e;
          }
          if (e.type === "L" && (!nextLow || e.time < nextLow.time)) {
            nextLow = e;
          }
        }
      }

      var currentHeight = null;
      var betweenPercent = null;

      if (
        lastEvent &&
        nextEvent &&
        nextEvent.time.getTime() > lastEvent.time.getTime()
      ) {
        var totalMs = nextEvent.time.getTime() - lastEvent.time.getTime();
        var elapsedMs = now.getTime() - lastEvent.time.getTime();
        var frac = elapsedMs / totalMs;

        if (frac < 0) {
          frac = 0;
        }
        if (frac > 1) {
          frac = 1;
        }

        betweenPercent = Math.round(frac * 100);
        currentHeight =
          lastEvent.height + frac * (nextEvent.height - lastEvent.height);
      }

      // Determine tide direction (going in or out) from last and next events
      var direction = null;
      if (lastEvent && nextEvent) {
        if (lastEvent.type === "L" && nextEvent.type === "H") {
          direction = "rising"; // tide coming in
        } else if (lastEvent.type === "H" && nextEvent.type === "L") {
          direction = "falling"; // tide going out
        }
      }

      return {
        lastHigh: lastHigh,
        lastLow: lastLow,
        nextHigh: nextHigh,
        nextLow: nextLow,
        currentHeight: currentHeight,
        betweenPercent: betweenPercent,
        direction: direction
      };
    }


 function formatTideTime(evt) {
  if (!evt || !evt.time) {
    return "n/a";
  }
  var d = evt.time;
  var timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  var day = String(d.getDate()).padStart(2, "0");
  var month = String(d.getMonth() + 1).padStart(2, "0");
  return timeStr + " " + day + "/" + month;
}


    function formatTideHeight(evt) {
      if (!evt || typeof evt.height !== "number" || isNaN(evt.height)) {
        return "";
      }
      return evt.height.toFixed(2) + " m";
    }

    function formatCurrentHeight(h) {
      if (typeof h !== "number" || !isFinite(h)) {
        return "n/a";
      }
      return h.toFixed(2) + " m";
    }

       function addTideMarker(site, summary) {
  var direction = summary.direction;
  var arrowChar =
    direction === "rising" ? "\u2191" :
    direction === "falling" ? "\u2193" :
    "\u2022";

  var directionLabel =
    direction === "rising"
      ? "Incoming (rising)"
      : direction === "falling"
      ? "Outgoing (falling)"
      : "Unknown";

  // Collect last/next high and low then sort chronologically
  var events = [
    { label: "Last high", evt: summary.lastHigh },
    { label: "Last low",  evt: summary.lastLow },
    { label: "Next high", evt: summary.nextHigh },
    { label: "Next low",  evt: summary.nextLow }
  ].filter(function (item) {
    return item.evt && item.evt.time;
  });

  events.sort(function (a, b) {
    return a.evt.time - b.evt.time;
  });

  var eventsHtml = events.map(function (item) {
    var timeStr = formatTideTime(item.evt);
    var heightStr = formatTideHeight(item.evt);
    if (heightStr) {
      return "<strong>" + item.label + ":</strong> " + timeStr + " (" + heightStr + ")";
    }
    return "<strong>" + item.label + ":</strong> " + timeStr;
  }).join("<br>");

  var popupHtml =
    "<strong>" + site.name + "</strong><br>" +
    "Estimated current height: " +
    formatCurrentHeight(summary.currentHeight) +
    "<br>" +
    "Tide direction: " + arrowChar + " " + directionLabel + "<br>" +
    (summary.betweenPercent != null
      ? "Between last and next tide: " +
        summary.betweenPercent +
        "% of the way<br><br>"
      : "<br>") +
    eventsHtml;

  // Use tide specific icon with arrow
  var marker = L.marker([site.lat, site.lng], {
    icon: makeTideIcon(MARKER_CONFIG.tides.defaultColor, direction)
  }).bindPopup(popupHtml);

  layerTides.addLayer(marker);
}


    function loadTides() {
      fetch(TIDES_CSV_URL)
        .then(function (res) {
          return res.text();
        })
        .then(function (csvText) {
          var sites = parseTideCsv(csvText);
          if (!sites.length) {
            console.warn("No tide sites parsed from CSV");
            return;
          }

          sites.forEach(function (site) {
            var url = buildNiwaTideUrl(site.lat, site.lng);

            fetch(url)
              .then(function (res) {
                return res.json();
              })
              .then(function (data) {
                var series = normaliseNiwaTideValues(data);
                if (!series.length) {
                  return;
                }
                var summary = summariseTideState(series);
                if (!summary) {
                  return;
                }
                addTideMarker(site, summary);
              })
              .catch(function (err) {
                console.warn("Tide data load failed for site", site.name, err);
              });
          });
        })
        .catch(function (err) {
          console.warn("Tide CSV load failed", err);
        });
    }

    // Kick off tide load
    loadTides();


    // 3. MetService Severe Weather Watches, Warnings and Advisories (Atom + CAP)
var METSERVICE_ATOM_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml");

// Colour helper based on title text
function metserviceColourForTitle(title) {
  var t = (title || "").toLowerCase();
  var color = "#1976d2";

  if (t.indexOf("warning") !== -1) {
    color = "#f44336";
  }
  if (t.indexOf("watch") !== -1) {
    color = "#2196f3";
  }
  if (t.indexOf("orange") !== -1) {
    color = "#ff9800";
  }
  if (t.indexOf("red") !== -1) {
    color = "#b71c1c";
  }

  return color;
}

// Use your existing Far North bounding box if available
function polygonTouchesFarNorth(latlngs) {
  if (typeof isInFarNorth !== "function") {
    return true; // if no helper, keep everything
  }
  for (var i = 0; i < latlngs.length; i++) {
    var pt = latlngs[i];
    if (isInFarNorth(pt[0], pt[1])) {
      return true;
    }
  }
  return false;
}

function loadMetserviceWeatherAlerts(atomUrl, targetLayer) {
  fetch(atomUrl)
    .then(function (res) { return res.text(); })
    .then(function (atomText) {
      var parser = new DOMParser();
      var atom = parser.parseFromString(atomText, "application/xml");

      var entries = atom.getElementsByTagName("entry");
      var tasks = [];

      for (var i = 0; i < entries.length; i++) {
        (function (entry) {
          var titleEl = entry.getElementsByTagName("title")[0];
          var summaryEl = entry.getElementsByTagName("summary")[0];

          var links = entry.getElementsByTagName("link");
          var capLinkEl = null;
          for (var j = 0; j < links.length; j++) {
            var rel = links[j].getAttribute("rel") || "";
            var type = links[j].getAttribute("type") || "";
            if (type.indexOf("cap+xml") !== -1) {
              capLinkEl = links[j];
              break;
            }
          }
          if (!capLinkEl && links.length) {
            capLinkEl = links[0];
          }

          var title = titleEl ? titleEl.textContent : "MetService Weather Alert";
          var summary = summaryEl ? summaryEl.textContent : "";
          var capUrl = capLinkEl ? capLinkEl.getAttribute("href") : null;

          if (!capUrl) {
            return;
          }

          var proxiedCapUrl = "https://corsproxy.io/?url=" + encodeURIComponent(capUrl);

          var task = fetch(proxiedCapUrl)
            .then(function (res) { return res.text(); })
            .then(function (capText) {
              var capDoc = parser.parseFromString(capText, "application/xml");

              var infoEl = capDoc.getElementsByTagName("info")[0];
              if (!infoEl) {
                return;
              }

              var eventEl = infoEl.getElementsByTagName("event")[0];
              var headlineEl = infoEl.getElementsByTagName("headline")[0];
              var descriptionEl = infoEl.getElementsByTagName("description")[0];
              var effectiveEl = infoEl.getElementsByTagName("effective")[0];
              var expiresEl = infoEl.getElementsByTagName("expires")[0];

              var eventName = eventEl ? eventEl.textContent : title;
              var headline = headlineEl ? headlineEl.textContent : title;
              var description = descriptionEl ? descriptionEl.textContent : summary;
              var effective = effectiveEl ? effectiveEl.textContent : "";
              var expires = expiresEl ? expiresEl.textContent : "";

              var colour = metserviceColourForTitle(title || eventName);

              var areaEls = infoEl.getElementsByTagName("area");
              var polygonsAddedForAlert = 0;

              for (var a = 0; a < areaEls.length; a++) {
                var areaEl = areaEls[a];
                var areaDescEl = areaEl.getElementsByTagName("areaDesc")[0];
                var areaDesc = areaDescEl ? areaDescEl.textContent : "";
                var polyEls = areaEl.getElementsByTagName("polygon");

                if (!polyEls.length) {
                  continue;
                }

                for (var pIdx = 0; pIdx < polyEls.length; pIdx++) {
                  var coordsStr = polyEls[pIdx].textContent.trim();
                  if (!coordsStr) {
                    continue;
                  }

                  var pointPairs = coordsStr.split(/\s+/);
                  var latlngs = [];

                  for (var k = 0; k < pointPairs.length; k++) {
                    var pair = pointPairs[k].split(",");
                    if (pair.length !== 2) {
                      continue;
                    }
                    var lat = parseFloat(pair[0]);
                    var lng = parseFloat(pair[1]);
                    if (isNaN(lat) || isNaN(lng)) {
                      continue;
                    }
                    latlngs.push([lat, lng]);
                  }

                  if (!latlngs.length) {
                    continue;
                  }

                  // Only keep polygons that touch the Far North
                  if (!polygonTouchesFarNorth(latlngs)) {
                    continue;
                  }

                  var popupHtml =
                    "<strong>" + headline + "</strong><br>" +
                    "<em>" + eventName + "</em><br><br>" +
                    (areaDesc ? "<strong>Area:</strong> " + areaDesc + "<br><br>" : "") +
                    (description ? nl2br(description) + "<br><br>" : "") +
                    (effective ? "<strong>From:</strong> " + effective + "<br>" : "") +
                    (expires ? "<strong>Until:</strong> " + expires + "<br>" : "");

                  var polygon = L.polygon(latlngs, {
                    color: colour,
                    weight: 2,
                    fillOpacity: 0.15
                  }).bindPopup(popupHtml);

                  polygon.addTo(targetLayer);
                  polygonsAddedForAlert++;
                }
              }

              // Fallback marker when no polygons were added for this alert
              if (!polygonsAddedForAlert) {
                var marker = L.marker(map.getCenter(), {
                  icon: makeIcon(colour)
                }).bindPopup(
                  "<strong>" + headline + "</strong><br>" +
                  "<em>" + eventName + "</em><br><br>" +
                  (description ? nl2br(description) + "<br><br>" : "") +
                  (effective ? "<strong>From:</strong> " + effective + "<br>" : "") +
                  (expires ? "<strong>Until:</strong> " + expires + "<br>" : "")
                );
                targetLayer.addLayer(marker);
              }
            })
            .catch(function (err) {
              console.warn("MetService CAP alert load failed", err);
            });

          tasks.push(task);
        })(entries[i]);
      }

      return Promise.all(tasks);
    })
    .catch(function (err) {
      console.warn("MetService Atom feed load failed", err);
    });
}

// Load MetService feed
loadMetserviceWeatherAlerts(METSERVICE_ATOM_URL, layerMetServiceWarnings);


   // 4. Civil Defence Alerts from Atom + CAP feed
// Civil Defence Atom feed that embeds CAP alerts in <content>
var CIVIL_DEFENCE_ATOM_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://www.civildefence.govt.nz/home/rss");

// Optional helper if you want to reuse elsewhere
function nl2br(text) {
  return text ? text.replace(/\n/g, "<br>") : "";
}

function loadCivilDefenceAtomCap(url, targetLayer) {
  fetch(url)
    .then(function (res) { return res.text(); })
    .then(function (xmlText) {
      var parser = new DOMParser();
      var atom = parser.parseFromString(xmlText, "application/xml");

      var entries = atom.getElementsByTagName("entry");
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        var titleEl = entry.getElementsByTagName("title")[0];
        var summaryEl = entry.getElementsByTagName("summary")[0];
        var linkEl = entry.getElementsByTagName("link")[0];
        var contentEl = entry.getElementsByTagName("content")[0];

        var title = titleEl ? titleEl.textContent : "Civil Defence Alert";
        var summaryText = summaryEl ? summaryEl.textContent : "";
        var linkHref = "";
        if (linkEl) {
          linkHref = linkEl.getAttribute("href") || linkEl.textContent;
        }

        var polygonsAdded = 0;

        if (contentEl) {
          // This is the CAP XML as text
          var capText = contentEl.textContent;
          if (capText) {
            var capDoc = parser.parseFromString(capText, "application/xml");

            var infoEl = capDoc.getElementsByTagName("info")[0];
            if (infoEl) {
              var headlineEl = infoEl.getElementsByTagName("headline")[0];
              var descriptionEl = infoEl.getElementsByTagName("description")[0];
              var areaEl = infoEl.getElementsByTagName("area")[0];

              var areaDescEl = areaEl ? areaEl.getElementsByTagName("areaDesc")[0] : null;
              var polyEls = areaEl ? areaEl.getElementsByTagName("polygon") : [];

              var headline = headlineEl ? headlineEl.textContent : title;
              var description = descriptionEl ? descriptionEl.textContent : summaryText;
              var areaDesc = areaDescEl ? areaDescEl.textContent : "";

              for (var j = 0; j < polyEls.length; j++) {
                var coordsStr = polyEls[j].textContent.trim();
                if (!coordsStr) {
                  continue;
                }

                var pointPairs = coordsStr.split(/\s+/);
                var latlngs = [];

                pointPairs.forEach(function (pair) {
                  var parts = pair.split(",");
                  if (parts.length !== 2) {
                    return;
                  }
                  var lat = parseFloat(parts[0]);
                  var lng = parseFloat(parts[1]);
                  if (isNaN(lat) || isNaN(lng)) {
                    return;
                  }
                  latlngs.push([lat, lng]);
                });

                if (!latlngs.length) {
                  continue;
                }

                var polygon = L.polygon(latlngs, {
                  color: "#ff9800",
                  weight: 2,
                  fillOpacity: 0.15
                });

                var popupHtml =
                  "<strong>" + headline + "</strong><br>" +
                  "<em>Civil Defence Mobile Alert</em><br><br>" +
                  (areaDesc ? "<strong>Areas:</strong> " + areaDesc + "<br><br>" : "") +
                  (description ? nl2br(description) + "<br><br>" : "") +
                  (!description && summaryText ? nl2br(summaryText) + "<br><br>" : "") +
                  (linkHref ? '<a href="' + linkHref + '" target="_blank" rel="noopener">View full alert</a>' : "");

                polygon.bindPopup(popupHtml);
                polygon.addTo(targetLayer);
                polygonsAdded++;
              }
            }
          }
        }

        // Fallback marker if no polygons found
        if (!polygonsAdded) {
          var marker = L.marker(map.getCenter(), {
            icon: makeIcon("#ff9800")
          }).bindPopup(
            "<strong>" + title + "</strong><br><br>" +
            (summaryText ? nl2br(summaryText) + "<br><br>" : "") +
            (linkHref ? '<a href="' + linkHref + '" target="_blank" rel="noopener">View full alert</a>' : "")
          );
          targetLayer.addLayer(marker);
        }
      }
    })
    .catch(function (err) {
      console.warn("Civil Defence Atom load failed", err);
    });
}

// Load Civil Defence feed
loadCivilDefenceAtomCap(CIVIL_DEFENCE_ATOM_URL, layerCivilDefenceAlerts);

// 5. Top Energy Power Outages - KMZ polygons + regions + outages

var TOP_ENERGY_OUTAGES_URL = MAP_ENDPOINTS.topEnergyOutages ||
  "https://corsproxy.io/?url=" + encodeURIComponent("https://outages.topenergy.co.nz/api/outages");
var TOP_ENERGY_REGIONS_URL = MAP_ENDPOINTS.topEnergyRegions ||
  "https://outages.topenergy.co.nz/api/outages/regions";

var TOP_ENERGY_KMZ_URL = MAP_ENDPOINTS.topEnergyKmz ||
  "https://corsproxy.io/?url=" + encodeURIComponent("https://outages.topenergy.co.nz/storage/kmz/polygonsActiveAll.kmz");


//var TOP_ENERGY_OUTAGES_URL =  "https://corsproxy.io/?url=" +  encodeURIComponent("https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/TopEnergy/outages%20(1028211125).json");
//var TOP_ENERGY_REGIONS_URL =  "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/TopEnergy/regions%20(1028211125).json";

//var TOP_ENERGY_KMZ_URL =  "https://corsproxy.io/?url=" +  encodeURIComponent("https://github.com/almokinsgov/NZSHAPE/raw/refs/heads/main/Testing/TopEnergy/polygonsActiveAll%20(103421112025).kmz");

// Config to control which outage types are shown as pins
// Set a type to false to hide that type
var POWER_OUTAGE_TYPES_VISIBLE = {
  unplanned: MAP_POWER_OUTAGE_STATUS_FILTER.indexOf("unplanned") !== -1,
  plannedActive: MAP_POWER_OUTAGE_STATUS_FILTER.indexOf("plannedActive") !== -1,
  planned: MAP_POWER_OUTAGE_STATUS_FILTER.indexOf("planned") !== -1
};

// 5.1 Load KMZ polygons as non interactive background
function addTopEnergyPolygons(kmzUrl, targetLayer) {
  if (typeof JSZip === "undefined") {
    console.warn("JSZip is required to parse KMZ polygons");
    return;
  }

  mapFetchArrayBufferTracked("map.top_energy.kmz", kmzUrl)
    .then(function (arrayBuffer) {
      return JSZip.loadAsync(arrayBuffer);
    })
    .then(function (zip) {
      var kmlFile = zip.file("doc.kml");
      if (!kmlFile) {
        var candidates = zip.file(/\.kml$/i);
        if (candidates && candidates.length) {
          kmlFile = candidates[0];
        }
      }
      if (!kmlFile) {
        console.warn("No KML file found inside Top Energy KMZ");
        return null;
      }
      return kmlFile.async("string");
    })
    .then(function (kmlText) {
      if (!kmlText) {
        return;
      }
      var parser = new DOMParser();
      var kmlDoc = parser.parseFromString(kmlText, "application/xml");

      var placemarks = kmlDoc.getElementsByTagName("Placemark");
      for (var i = 0; i < placemarks.length; i++) {
        var pm = placemarks[i];
        var polygons = pm.getElementsByTagName("Polygon");
        for (var j = 0; j < polygons.length; j++) {
          var poly = polygons[j];
          var coordsEls = poly.getElementsByTagName("coordinates");
          if (!coordsEls.length) {
            continue;
          }
          var coordsText = coordsEls[0].textContent;
          if (!coordsText) {
            continue;
          }

          // KML coordinates: lon,lat,alt lon,lat,alt ...
          var pairs = coordsText.trim().split(/\s+/);
          var latlngs = [];
          for (var pIdx = 0; pIdx < pairs.length; pIdx++) {
            var parts = pairs[pIdx].split(",");
            if (parts.length < 2) {
              continue;
            }
            var lon = parseFloat(parts[0]);
            var lat = parseFloat(parts[1]);
            if (isNaN(lat) || isNaN(lon)) {
              continue;
            }
            latlngs.push([lat, lon]);
          }

          if (!latlngs.length) {
            continue;
          }

          // Polygons are visual only not selectable
          var polygon = L.polygon(latlngs, {
            color: "#e91e63",
            weight: 1,
            fillOpacity: 0.05,
            interactive: false
          });

          polygon.addTo(targetLayer);
        }
      }
    })
    .catch(function (err) {
      console.warn("Top Energy KMZ polygons load failed", err);
    });
}

// 5.2 Join outages to region details and create one pin per outage
function buildTopEnergyOutageItems(regionsData, outagesData) {
  var regionDetailsById = {};
  var items = [];

  Object.keys(regionsData || {}).forEach(function (key) {
    var value = regionsData[key];
    if (!Array.isArray(value)) {
      return;
    }
    value.forEach(function (r) {
      if (!r || !r.name) {
        return;
      }
      regionDetailsById[r.name] = r;
    });
  });

  function pushList(list, statusType) {
    if (!Array.isArray(list)) return;
    list.forEach(function (outage) {
      if (!outage || outage.lat == null || outage.lng == null || !outage.id) {
        return;
      }
      items.push({
        id: String(outage.id),
        statusType: String(statusType || ""),
        lat: outage.lat,
        lng: outage.lng,
        detail: regionDetailsById[outage.id] || null
      });
    });
  }

  pushList(outagesData && outagesData.unplanned, "unplanned");
  pushList(outagesData && outagesData.plannedActive, "plannedActive");
  pushList(outagesData && outagesData.planned, "planned");

  return items;
}

function publishTopEnergyOutagesForStats(regionsData, outagesData) {
  var items = buildTopEnergyOutageItems(regionsData, outagesData);
  var statusCounts = { unplanned: 0, plannedActive: 0, planned: 0 };

  items.forEach(function (item) {
    if (statusCounts[item.statusType] == null) return;
    statusCounts[item.statusType] += 1;
  });

  window.__FNED_MAP_POWER_OUTAGES_DATA = {
    updatedAt: new Date().toISOString(),
    items: items,
    statusCounts: statusCounts
  };

  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fned:map-power-outages-updated", {
      detail: window.__FNED_MAP_POWER_OUTAGES_DATA
    }));
  }
}

function buildTopEnergyOutageMarkers(regionsData, outagesData, targetLayer) {
  // Build lookup of region details by id (regions.*[].name)
  var regionDetailsById = {};
  var outageRecords = [];

  Object.keys(regionsData || {}).forEach(function (key) {
    var value = regionsData[key];
    if (!Array.isArray(value)) {
      return;
    }
    value.forEach(function (r) {
      if (!r || !r.name) {
        return;
      }
      // name in regions matches id in outages
      regionDetailsById[r.name] = r;
    });
  });

  // Use marker config for colours
  function colourForStatus(statusType) {
    var cfg = MARKER_CONFIG.powerOutages || {};
    if (statusType && cfg[statusType]) {
      return cfg[statusType];
    }
    return cfg.defaultColor || "#9e9e9e";
  }

  function statusLabel(statusType) {
    if (statusType === "unplanned") {
      return "Unplanned outage";
    }
    if (statusType === "plannedActive") {
      return "Planned outage (currently active)";
    }
    if (statusType === "planned") {
      return "Planned outage";
    }
    return "Outage";
  }

  function renderDetail(detail) {
    if (!detail) {
      return "<br>No additional detail available for this outage.";
    }

    var html = "";
    if (detail.circuitName) {
      html += "Circuit: " + detail.circuitName + "<br>";
    }
    if (detail.customersCurrentlyOff != null && detail.customersCurrentlyOff !== "") {
      html += "Customers affected: " + detail.customersCurrentlyOff + "<br>";
    }
    if (detail.startDateTime) {
      html += "From: " + detail.startDateTime + "<br>";
    }
    if (detail.endDateTime) {
      html += "Until: " + detail.endDateTime + "<br>";
    }
    if (detail.alternativeStartDateTime) {
      html += "Alt from: " + detail.alternativeStartDateTime + "<br>";
    }
    if (detail.alternativeEndDateTime) {
      html += "Alt until: " + detail.alternativeEndDateTime + "<br>";
    }
    if (detail.additionalInformation) {
      html += detail.additionalInformation + "<br>";
    }
    return html || "<br>No additional detail available for this outage.";
  }

  function addOutageMarkers(list, statusType) {
    if (!Array.isArray(list)) {
      return;
    }
    list.forEach(function (outage) {
      if (!outage || outage.lat == null || outage.lng == null || !outage.id) {
        return;
      }

      // Look up detail by matching outage.id to region name
      var detail = regionDetailsById[outage.id] || null;
      var colour = colourForStatus(statusType);

      var popupHtml =
        "<strong>Top Energy outage</strong><br>" +
        "Outage ID: " + outage.id + "<br>" +
        "Type: " + statusLabel(statusType) + "<br>" +
        renderDetail(detail);
      outageRecords.push({
        lat: parseFloat(outage.lat),
        lng: parseFloat(outage.lng),
        color: colour,
        symbol: powerStatusSymbol(statusType),
        clusterType: String(statusType || "power"),
        clusterLabel: String(outage.id || "Outage"),
        clusterGroupLabel: "Power outages (" + statusLabel(statusType) + ")",
        popupHtml: popupHtml
      });
    });
  }

  // Helper to check visibility config and add markers
  function addIfVisible(list, statusType) {
    if (!POWER_OUTAGE_TYPES_VISIBLE[statusType]) {
      return;
    }
    addOutageMarkers(list, statusType);
  }

  // Outages JSON has unplanned, planned and plannedActive lists of points
  // Config controls which types are shown
  addIfVisible(outagesData.unplanned, "unplanned");
  addIfVisible(outagesData.plannedActive, "plannedActive");
  addIfVisible(outagesData.planned, "planned");

  upsertDynamicClusterState("power", targetLayer, outageRecords, {
    enabled: MAP_POWER_CLUSTER_ENABLED,
    minCount: MAP_POWER_CLUSTER_MIN_COUNT,
    baseRadiusMeters: MAP_POWER_CLUSTER_BASE_RADIUS_METERS,
    maxRadiusMeters: MAP_POWER_CLUSTER_MAX_RADIUS_METERS,
    baseZoom: MAP_POWER_CLUSTER_BASE_ZOOM,
    zoomStepMultiplier: MAP_POWER_CLUSTER_ZOOM_STEP_MULTIPLIER,
    viewportWidthFactor: MAP_POWER_CLUSTER_VIEWPORT_WIDTH_FACTOR
  });
}

// 5.3 Orchestrate Top Energy layer load
function loadTopEnergyOutages() {
  // Polygons as background
  addTopEnergyPolygons(TOP_ENERGY_KMZ_URL, layerPowerOutages);

  // Regions (detail) and outages (points) in parallel
  var regionsPromise = mapFetchJsonTracked("map.top_energy.regions", TOP_ENERGY_REGIONS_URL);
  var outagesPromise = mapFetchJsonTracked("map.top_energy.outages", TOP_ENERGY_OUTAGES_URL);

  Promise.all([regionsPromise, outagesPromise])
    .then(function (results) {
      var regionsData = results[0] || {};
      var outagesData = results[1] || {};
      buildTopEnergyOutageMarkers(regionsData, outagesData, layerPowerOutages);
      publishTopEnergyOutagesForStats(regionsData, outagesData);
    })
    .catch(function (err) {
      console.warn("Top Energy regions or outages load failed", err);
    });
}

// Kick off Top Energy load
loadTopEnergyOutages();

    <!-- 6. Water Outages from Asset Listing Code -->
    <!-- FNDC water outages asset listing feed, proxied for CORS -->
    var WATER_OUTAGES_URL =
      "https://corsproxy.io/?" +
      encodeURIComponent("https://www.fndc.govt.nz/services/water/Water-outage-updates/wateroutagesassetlistingfeed");

    // Which statuses to show on the map, configurable in runtimeConfig.map.waterOutageStatusFilter.
    // Falls back to DEFAULT_MAP_WATER_OUTAGE_STATUS_FILTER when no runtime override is provided.
    var WATER_OUTAGE_STATUS_FILTER = MAP_WATER_OUTAGE_STATUS_FILTER.slice();

    function waterOutageStatusAllowed(status) {
      var trimmed = String(status || "").trim().toLowerCase();
      if (!trimmed) {
        return false;
      }
      if (!MAP_WATER_OUTAGE_STATUS_FILTER_NORMALISED.length) {
        return true;
      }
      return MAP_WATER_OUTAGE_STATUS_FILTER_NORMALISED.indexOf(trimmed) !== -1;
    }
	   function waterOutageMarkerColor(status) {
      var cfg = MARKER_CONFIG.waterOutages || {};
      var key = String(status || "").trim();
      if (cfg.colorByStatus && cfg.colorByStatus[key]) {
        return cfg.colorByStatus[key];
      }
      return cfg.defaultColor || "#2196f3";
    }

    function loadWaterOutages() {
  fetch(WATER_OUTAGES_URL)
    .then(function (res) {
      // Asset listing feeds can sometimes be text rather than strict JSON
      return res.text();
    })
    .then(function (text) {
      var data;

      // Try to parse as JSON directly first
      try {
        data = JSON.parse(text);
      } catch (err) {
        // Fallback - FNDC asset feed can be a bare list of objects
        // and now often comes wrapped like "{{ ... },}"
        var trimmed = text.trim();

        // Handle new "{{ ... },}" wrapper pattern - drop the extra first "{"
        if (trimmed.indexOf("{{") === 0) {
          trimmed = trimmed.slice(1).trim();
        }

        // Remove a final "},}" wrapper - keeps the last object closing brace
        trimmed = trimmed.replace(/},\}\s*$/, "}");

        // Remove any simple trailing comma at the very end eg "...},"
        trimmed = trimmed.replace(/,\s*$/, "");

        // Wrap as an array if there are no [ ] brackets
        if (trimmed.charAt(0) !== "[") {
          trimmed = "[" + trimmed;
        }
        if (trimmed.charAt(trimmed.length - 1) !== "]") {
          trimmed = trimmed + "]";
        }

        try {
          data = JSON.parse(trimmed);
        } catch (err2) {
          console.warn("Could not parse water outages feed", err2);
          return;
        }
      }

      // If the feed ever switches to an object with an items array
      if (!Array.isArray(data) && data && Array.isArray(data.items)) {
        data = data.items;
      }

      if (!Array.isArray(data)) {
        console.warn("Water outages feed was not an array", data);
        return;
      }

      var waterRecords = [];
      data.forEach(function (item) {
        if (!item) {
          return;
        }

        // Latitude / longitude
        var lat = parseFloat(item.latitude || item.lat);
        var lng = parseFloat(item.longitude || item.lng);
        if (!isFinite(lat) || !isFinite(lng)) {
          return;
        }

        // Status filter
        if (
          WATER_OUTAGE_STATUS_FILTER.length &&
          !waterOutageStatusAllowed(item.status)
        ) {
          return;
        }

        // Build popup HTML with all requested fields
        var popupHtml =
          "<strong>FNDC water outage</strong><br>" +
          (item.name ? "Name: " + item.name + "<br>" : "") +
          (item.status ? "Status: " + item.status + "<br>" : "") +
          (item.address ? "Address: " + item.address + "<br>" : "") +
          (item.datelodged ? "Date lodged: " + item.datelodged + "<br>" : "") +
          (item.dateresolved
            ? "Date resolved: " + item.dateresolved + "<br>"
            : "");

        if (item.details) {
          // details already contains HTML <p> tags
          popupHtml += "<br>" + item.details;
        }

        if (item.description) {
          popupHtml += "<br><em>" + item.description + "</em>";
        }

        waterRecords.push({
          lat: lat,
          lng: lng,
          color: waterOutageMarkerColor(item.status),
          symbol: waterStatusSymbol(item.status),
          clusterType: String(item.status || "water-unknown"),
          clusterLabel: String(item.name || item.address || "Water outage"),
          clusterGroupLabel: "Water outages (" + String(item.status || "Unknown") + ")",
          popupHtml: popupHtml
        });
      });

      upsertDynamicClusterState("water", layerWaterOutages, waterRecords, {
        enabled: MAP_WATER_CLUSTER_ENABLED,
        minCount: MAP_WATER_CLUSTER_MIN_COUNT,
        baseRadiusMeters: MAP_WATER_CLUSTER_BASE_RADIUS_METERS,
        maxRadiusMeters: MAP_WATER_CLUSTER_MAX_RADIUS_METERS,
        baseZoom: MAP_WATER_CLUSTER_BASE_ZOOM,
        zoomStepMultiplier: MAP_WATER_CLUSTER_ZOOM_STEP_MULTIPLIER,
        viewportWidthFactor: MAP_WATER_CLUSTER_VIEWPORT_WIDTH_FACTOR
      });
    })
    .catch(function (err) {
      console.warn("Water outages load failed", err);
    });
}



    // Kick off water outages load
    loadWaterOutages();


    // 7. Road Warnings, Closures and Roadworks from NZTA delays.json
// Live NZTA feed
var ROAD_WARNINGS_URL =
  MAP_ENDPOINTS.nztaDelays ||
  MAP_ENDPOINTS.nztaDelaysSource ||
  "https://corsproxy.io/?url=https://www.journeys.nzta.govt.nz/assets/map-data-cache/delays.json";
var NZTA_ROAD_EVENTS_PAYLOAD = {
  updatedAt: "",
  items: []
};

// Optional: limit to Far North by simple bounding box
// Adjust if you want a different cut
function isInFarNorth(lat, lng) {
  // Rough box for Far North District
  // North of about -35.9 and west of about 174.4
  return lat > -48.9 && lat < -33.2 && lng > 167.1 && lng < 179.5;
}

// Use marker config colours for NZTA features
function nztaColorForFeature(feature) {
  var p = feature && feature.properties ? feature.properties : {};
  var cfg = MARKER_CONFIG.nzta.point;
  var typeKey = nztaTypeKeyForFeature(feature);
  var color = cfg.defaultColor;

  // First prefer the type group if present
  if (typeKey && cfg[typeKey]) {
    color = cfg[typeKey];
  } else {
    // Fallback to simple text checks on Impact
    var impact = (p.Impact || "").toLowerCase();

    if (impact.indexOf("closed") !== -1 || impact.indexOf("closure") !== -1) {
      color = cfg.closures || color;
    } else if (
      impact.indexOf("warning") !== -1 ||
      impact.indexOf("caution") !== -1
    ) {
      color = cfg.warnings || color;
    } else if (impact.indexOf("work") !== -1) {
      color = cfg.roadworks || color;
    } else if (impact.indexOf("hazard") !== -1) {
      color = cfg.hazards || color;
    }
  }

  return color;
}

function nztaStyle(feature) {
  var color = nztaColorForFeature(feature);
  var p = feature && feature.properties ? feature.properties : {};
  var impact = (p.Impact || "").toLowerCase();

  var weight = 4;
  var dashArray = null;

  if (impact.indexOf("closed") !== -1 || impact.indexOf("closure") !== -1) {
    weight = 6;
  } else if (
    impact.indexOf("warning") !== -1 ||
    impact.indexOf("caution") !== -1
  ) {
    dashArray = "4 6";
  } else if (impact.indexOf("hazard") !== -1) {
    dashArray = "2 6";
  }

  return {
    color: color,
    weight: weight,
    dashArray: dashArray,
    opacity: 0.9
  };
}

// Use the shared divIcon style instead of circleMarker
function nztaPointToLayer(feature, latlng) {
  var color = nztaColorForFeature(feature);
  var typeKey = nztaTypeKeyForFeature(feature);
  var symbol = nztaSymbolForType(typeKey);
  return L.marker(latlng, {
    icon: makeSymbolIcon(color, symbol)
  });
}

function nztaPopupHtml(feature) {
  var p = feature.properties || {};

  var title =
    p.Name ||
    p.LocationArea ||
    "Road Event";

  var html = "<strong>" + title + "</strong><br>";

  if (p.EventType) {
    html += "Type: " + p.EventType + "<br>";
  }
  if (p.EventDescription) {
    html += "Description: " + p.EventDescription + "<br>";
  }
  if (p.EventComments) {
    html += p.EventComments + "<br><br>";
  }
  if (p.Impact) {
    html += "Impact: " + p.Impact + "<br>";
  }
  if (p.StartDateNice) {
    html += "From: " + p.StartDateNice + "<br>";
  }
  if (p.EndDateNice) {
    html += "To: " + p.EndDateNice + "<br>";
  }
  if (p.ExpectedResolution) {
    html += "Expected: " + p.ExpectedResolution + "<br>";
  }
  if (p.AlternativeRoute) {
    html += "Detour: " + p.AlternativeRoute + "<br>";
  }

  return html;
}

function nztaOnEachFeature(feature, layer) {
  layer.bindPopup(nztaPopupHtml(feature));
}

function nztaFeaturePoint(feature) {
  if (!feature || !feature.geometry) {
    return null;
  }
  var g = feature.geometry;
  if (g.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  if (g.type === "MultiLineString" && Array.isArray(g.coordinates) && g.coordinates.length) {
    var firstLine = g.coordinates[0];
    if (Array.isArray(firstLine) && firstLine.length && Array.isArray(firstLine[0]) && firstLine[0].length >= 2) {
      return { lng: firstLine[0][0], lat: firstLine[0][1] };
    }
  }
  return null;
}

function publishNztaRoadEventsForStatus(features) {
  var items = Array.isArray(features) ? features.map(function (feature, index) {
    var p = feature && feature.properties ? feature.properties : {};
    var point = nztaFeaturePoint(feature) || {};
    var typeKey = nztaTypeKeyForFeature(feature);
    return {
      id: String(
        p.Id != null
          ? p.Id
          : (p.EventId != null ? p.EventId : index + 1)
      ),
      title: String(p.Name || p.LocationArea || "Road event"),
      eventType: String(p.EventType || p.type || ""),
      impact: String(p.Impact || ""),
      description: String(p.EventDescription || ""),
      comments: String(p.EventComments || ""),
      startDateNice: String(p.StartDateNice || ""),
      endDateNice: String(p.EndDateNice || ""),
      expectedResolution: String(p.ExpectedResolution || ""),
      alternativeRoute: String(p.AlternativeRoute || ""),
      locationArea: String(p.LocationArea || ""),
      typeKey: typeKey,
      lat: point.lat != null ? point.lat : null,
      lng: point.lng != null ? point.lng : null,
      feature: feature
    };
  }) : [];

  NZTA_ROAD_EVENTS_PAYLOAD = {
    updatedAt: new Date().toISOString(),
    items: items
  };
  window.__FNED_MAP_NZTA_ROAD_EVENTS_DATA = NZTA_ROAD_EVENTS_PAYLOAD;
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fned:map-nzta-road-events-updated", {
      detail: NZTA_ROAD_EVENTS_PAYLOAD
    }));
  }
}

// NZTA delays
mapFetchJsonTracked("map.nzta.delays", ROAD_WARNINGS_URL)
  .then(function (geojson) {

    // Keep only Far North features and apply the event type filter
    var filtered = {
      type: "FeatureCollection",
      features: geojson.features.filter(function (f) {
        if (!f.geometry) return false;

        var g = f.geometry;

        // Spatial clip to Far North
        if (g.type === "Point") {
          var lng = g.coordinates[0];
          var lat = g.coordinates[1];
          if (!isInFarNorth(lat, lng)) return false;
        } else if (
          g.type === "MultiLineString" &&
          g.coordinates &&
          g.coordinates.length &&
          g.coordinates[0].length
        ) {
          var first = g.coordinates[0][0];
          var lng2 = first[0];
          var lat2 = first[1];
          if (!isInFarNorth(lat2, lng2)) return false;
        } else {
          // Ignore other geometry types for now
          return false;
        }

        // Apply NZTA event type visibility
        return nztaEventIsVisible(f);
      })
    };

    var lineFeatures = [];
    var pointFeatures = [];
    (filtered.features || []).forEach(function (feature) {
      if (!feature || !feature.geometry) return;
      if (feature.geometry.type === "Point") {
        pointFeatures.push(feature);
      } else {
        lineFeatures.push(feature);
      }
    });

    L.geoJSON({
      type: "FeatureCollection",
      features: lineFeatures
    }, {
      style: nztaStyle,
      onEachFeature: nztaOnEachFeature
    }).addTo(layerRoadWarnings);

    var nztaRecords = [];
    pointFeatures.forEach(function (feature) {
      var coords = feature && feature.geometry && feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      var lng = parseFloat(coords[0]);
      var lat = parseFloat(coords[1]);
      if (!isFinite(lat) || !isFinite(lng)) return;
      var p = feature.properties || {};
      var typeKey = nztaTypeKeyForFeature(feature);
      nztaRecords.push({
        lat: lat,
        lng: lng,
        color: nztaColorForFeature(feature),
        symbol: nztaSymbolForType(typeKey),
        clusterType: typeKey,
        clusterLabel: String(p.Name || p.LocationArea || p.EventType || "Road event"),
        clusterGroupLabel: "NZTA events (" + typeKey + ")",
        popupHtml: nztaPopupHtml(feature)
      });
    });

    upsertDynamicClusterState("nzta", layerRoadWarnings, nztaRecords, {
      enabled: MAP_NZTA_CLUSTER_ENABLED,
      minCount: MAP_NZTA_CLUSTER_MIN_COUNT,
      baseRadiusMeters: MAP_NZTA_CLUSTER_BASE_RADIUS_METERS,
      maxRadiusMeters: MAP_NZTA_CLUSTER_MAX_RADIUS_METERS,
      baseZoom: MAP_NZTA_CLUSTER_BASE_ZOOM,
      zoomStepMultiplier: MAP_NZTA_CLUSTER_ZOOM_STEP_MULTIPLIER,
      viewportWidthFactor: MAP_NZTA_CLUSTER_VIEWPORT_WIDTH_FACTOR
    });

    publishNztaRoadEventsForStatus(filtered.features || []);
  })
  .catch(function (err) {
    console.warn("NZTA delays load failed", err);
    publishNztaRoadEventsForStatus([]);
  });


// 8. Marae data (NZ wide from MÄori Maps export)
var MARAE_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/Marae%20data%20-%20data2.json");

var DYNAMIC_CLUSTER_STATES = Object.create(null);
var DYNAMIC_CLUSTER_ZOOM_BOUND = false;

function resolveDynamicClusterRadiusMeters(config) {
  if (!config) return 450;
  var currentZoom = (map && typeof map.getZoom === "function") ? Number(map.getZoom()) : mapZoom;
  var zoomDelta = Number(config.baseZoom) - currentZoom;
  var scaled = Number(config.baseRadiusMeters) * Math.pow(Number(config.zoomStepMultiplier), zoomDelta);
  if (!isFinite(scaled)) {
    scaled = Number(config.baseRadiusMeters) || 450;
  }
  if (map && typeof map.getBounds === "function" && Number(config.viewportWidthFactor) > 0) {
    var bounds = map.getBounds();
    if (bounds && typeof bounds.getNorth === "function") {
      var centerLat = (Number(bounds.getNorth()) + Number(bounds.getSouth())) / 2;
      var widthMeters = distanceMeters(centerLat, Number(bounds.getWest()), centerLat, Number(bounds.getEast()));
      if (isFinite(widthMeters) && widthMeters > 0) {
        scaled = Math.max(scaled, widthMeters * Number(config.viewportWidthFactor));
      }
    }
  }
  if (scaled < 50) scaled = 50;
  if (scaled > Number(config.maxRadiusMeters)) scaled = Number(config.maxRadiusMeters);
  return scaled;
}

function renderDynamicClusterState(key, sharedStackRegistry) {
  var state = DYNAMIC_CLUSTER_STATES[key];
  if (!state || !state.targetLayer) return;
  state.targetLayer.clearLayers();
  addClusteredSymbolMarkers(state.records || [], state.targetLayer, {
    enabled: state.config && state.config.enabled !== false,
    radiusMeters: resolveDynamicClusterRadiusMeters(state.config),
    minCount: state.config ? Number(state.config.minCount) : 2,
    stackRegistry: sharedStackRegistry || createMarkerStackRegistry()
  });
}

function renderAllDynamicClusterStates() {
  var sharedStackRegistry = createMarkerStackRegistry();
  Object.keys(DYNAMIC_CLUSTER_STATES).sort().forEach(function (key) {
    renderDynamicClusterState(key, sharedStackRegistry);
  });
}

function upsertDynamicClusterState(key, targetLayer, records, config) {
  DYNAMIC_CLUSTER_STATES[key] = {
    targetLayer: targetLayer || null,
    records: Array.isArray(records) ? records : [],
    config: config || {}
  };
  renderAllDynamicClusterStates();
  if (!DYNAMIC_CLUSTER_ZOOM_BOUND && map && typeof map.on === "function") {
    map.on("zoomend", renderAllDynamicClusterStates);
    DYNAMIC_CLUSTER_ZOOM_BOUND = true;
  }
}

function resolveMaraeClusterRadiusMeters() {
  return resolveDynamicClusterRadiusMeters({
    baseRadiusMeters: MAP_MARAE_CLUSTER_BASE_RADIUS_METERS,
    maxRadiusMeters: MAP_MARAE_CLUSTER_MAX_RADIUS_METERS,
    baseZoom: MAP_MARAE_CLUSTER_BASE_ZOOM,
    zoomStepMultiplier: MAP_MARAE_CLUSTER_ZOOM_STEP_MULTIPLIER,
    viewportWidthFactor: MAP_MARAE_CLUSTER_VIEWPORT_WIDTH_FACTOR
  });
}

function renderMaraeClusters() {
  renderDynamicClusterState("marae");
}

    function loadMaraeLayer(url, targetLayer) {
  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) {
        console.warn("Marae data is not an array");
        return;
      }

      var maraeRecords = [];
      data.forEach(function (marae) {
        var lat = parseFloat(marae.latitude);
        var lng = parseFloat(marae.longitude);

        if (!isFinite(lat) || !isFinite(lng)) {
          return;
        }

        // Optional filter to Far North only
        // if (typeof isInFarNorth === "function" && !isInFarNorth(lat, lng)) {
        //   return;
        // }

        var title = marae.title || "Marae";
        var link = marae.Link || "";
        var district = marae.District || "";
        var imageUrl = marae["Image URL"] || "";

        var popupHtml =
          "<strong>" + title + "</strong><br>" +
          (district ? "<em>" + district + "</em><br><br>" : "<br>") +
          (link ? '<a href="' + link + '" target="_blank" rel="noopener">View marae page</a><br><br>' : "");

        if (imageUrl) {
          popupHtml +=
            '<a href="' + imageUrl + '" target="_blank" rel="noopener">' +
              '<img src="' + imageUrl + '" alt="Image of ' + title + '" ' +
              'style="max-width:180px;max-height:120px;display:block;margin-top:4px;border-radius:4px;object-fit:cover;" />' +
            "</a>";
        }

        maraeRecords.push({
          lat: lat,
          lng: lng,
          color: MARKER_CONFIG.marae.color,
          symbol: "M",
          clusterType: "marae",
          clusterLabel: title,
          clusterGroupLabel: "Marae locations",
          popupHtml: popupHtml
        });
      });

      upsertDynamicClusterState("marae", targetLayer, maraeRecords, {
        enabled: MAP_MARAE_CLUSTER_ENABLED,
        minCount: MAP_MARAE_CLUSTER_MIN_COUNT,
        baseRadiusMeters: MAP_MARAE_CLUSTER_BASE_RADIUS_METERS,
        maxRadiusMeters: MAP_MARAE_CLUSTER_MAX_RADIUS_METERS,
        baseZoom: MAP_MARAE_CLUSTER_BASE_ZOOM,
        zoomStepMultiplier: MAP_MARAE_CLUSTER_ZOOM_STEP_MULTIPLIER,
        viewportWidthFactor: MAP_MARAE_CLUSTER_VIEWPORT_WIDTH_FACTOR
      });
    })
    .catch(function (err) {
      console.warn("Marae data load failed", err);
    });
}

// Load Marae layer
loadMaraeLayer(MARAE_URL, layerMarae);


        // 9. Community Halls from FNDC District Facilities (ArcGIS pgeojson)
    var HALLS_GEOJSON_URL =
      "https://corsproxy.io/?url=" +
      encodeURIComponent(
        "https://services5.arcgis.com/H4FlrMy6xTBd6Ywx/ArcGIS/rest/services/DistrictFacilities_FNDC_public/FeatureServer/0/query?where=1%3D1&objectIds=&geometry=&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token="
      );

    fetch(HALLS_GEOJSON_URL)
      .then(function (res) { return res.json(); })
      .then(function (geojson) {
        if (!geojson || !Array.isArray(geojson.features)) {
          console.warn("Community halls geojson has no features");
          return;
        }

        L.geoJSON(geojson, {
          // Only keep features that are halls
          filter: function (feature) {
            var p = feature && feature.properties;
            if (!p || p.asset_sub_type == null) {
              return false;
            }
            return String(p.asset_sub_type).toLowerCase() === "hall";
          },

          // Use a location pin style icon
          pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
              icon: makeSymbolIcon(
                MARKER_CONFIG.communityHalls.color,
                MARKER_CONFIG.communityHalls.symbol || "H"
              )
            });
          },

          // Build popup using asset name and basic details
          onEachFeature: function (feature, layer) {
            var p = feature.properties || {};
            var name = p.system_name || "Community Hall";
            var community = p.community || "";
            var location = p.location || "";
            var owner = p.asset_owner || "";
            var status = p.status || "";

            var popup =
              "<strong>" + name + "</strong><br>" +
              (community ? "<em>" + community + "</em><br>" : "") +
              (location ? "Location: " + location + "<br>" : "") +
              (owner ? "Owner: " + owner + "<br>" : "") +
              (status ? "Status: " + status + "<br>" : "");

            layer.bindPopup(popup);
          }
        }).addTo(layerCommunityHalls);
      })
      .catch(function (err) {
        console.warn("Community halls geojson load failed", err);
      });


   // 10. NRC river data (live API)
var NRC_RIVERS_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://env.gurudigital.nz/WebApi/GetMapPoints/2?collectionId=19");
// For local testing you can instead use:
// var NRC_RIVERS_URL = "rivers.json";

// Helper to pick a colour based on current river trend
function riverColourForStatus(site) {
  var name = site.Icon && site.Icon.Name ? site.Icon.Name.toLowerCase() : "";
  var cfg = MARKER_CONFIG.rivers || {};

  if (cfg.colorByTrend) {
    if (name.indexOf("rising") !== -1 && cfg.colorByTrend.rising) {
      return cfg.colorByTrend.rising;
    }
    if (name.indexOf("falling") !== -1 && cfg.colorByTrend.falling) {
      return cfg.colorByTrend.falling;
    }
  }

  return cfg.defaultColor || "#4caf50";
}


// Build popup HTML for an NRC river site
function buildRiverPopup(site) {
  var title = site.DisplayName || site.Name || "River site";

  var html = "<strong>" + title + "</strong><br>";

  // Short description and LAWA link (Summary is already HTML)
  if (site.Summary) {
    html += site.Summary + "<br>";
  }

  var primary = site.PrimaryMeasurement;
  var secondary = site.SecondaryMeasurement;
  var primaryValue = site.PrimaryValue;
  var secondaryValue = site.SecondaryValue;

  if (primary && primaryValue) {
    html += "<br><strong>" +
      (primary.DisplayName || primary.Name || "Level") +
      ":</strong> " + primaryValue.Value +
      (primary.Units ? " " + primary.Units : "") +
      (primaryValue.FormattedTime && primaryValue.FormattedDate
        ? " at " + primaryValue.FormattedTime + " " + primaryValue.FormattedDate
        : "") +
      "<br>";
  }

  if (secondary && secondaryValue) {
    html += "<strong>" +
      (secondary.DisplayName || secondary.Name || "Flow") +
      ":</strong> " + secondaryValue.Value +
      (secondary.Units ? " " + secondary.Units : "") +
      (secondaryValue.FormattedTime && secondaryValue.FormattedDate
        ? " at " + secondaryValue.FormattedTime + " " + secondaryValue.FormattedDate
        : "") +
      "<br>";
  }

  var drought = site.DroughtInfo;
  if (drought) {
    if (drought.MALFText) {
      html += "<br><strong>MALF:</strong> " + drought.MALFText + "<br>";
    }
    if (drought.DMFText) {
      html += "<strong>DMF:</strong> " + drought.DMFText + "<br>";
    }
    if (drought.PercentDiffDMF) {
      html += "<strong>Relative to DMF:</strong> " + drought.PercentDiffDMF + "<br>";
    }
  }

  if (site.WebCamUrl) {
    html += '<br><a href="' + site.WebCamUrl +
      '" target="_blank" rel="noopener">View webcam</a><br>';
  }

  if (site.Image && site.Image.URL) {
    var imgUrl = "https://env.gurudigital.nz/" + site.Image.URL.replace(/^\/?/, "");
    html +=
      '<br><a href="' + imgUrl + '" target="_blank" rel="noopener">' +
        '<img src="' + imgUrl + '" alt="Image for ' + title + '"' +
        ' style="max-width:200px;max-height:130px;display:block;margin-top:4px;' +
        ' border-radius:4px;object-fit:cover;" />' +
      "</a>";
  }

  return html;
}

function loadNrcRivers(url, targetLayer) {
  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (sites) {
      if (!Array.isArray(sites)) {
        console.warn("NRC river data is not an array");
        return;
      }

      sites.forEach(function (site) {
        if (!site.HasLocation || site.Latitude == null || site.Longitude == null) {
          return;
        }

        // Optional Far North filter if you want to clip to district
        // if (typeof isInFarNorth === "function" &&
        //     !isInFarNorth(site.Latitude, site.Longitude)) {
        //   return;
        // }

        var lat = site.Latitude;
        var lng = site.Longitude;

        var marker = L.marker([lat, lng], {
          icon: makeIcon(riverColourForStatus(site))
        });

        marker.bindPopup(buildRiverPopup(site));
        targetLayer.addLayer(marker);
      });
    })
    .catch(function (err) {
      console.warn("NRC river data load failed", err);
    });
}

// Load NRC river layer
loadNrcRivers(NRC_RIVERS_URL, layerRivers);
  // 11. GeoNet earthquakes - shallow events near Far North

  var GEONET_EARTHQUAKES_URL = MAP_ENDPOINTS.geonetEarthquakes ||
    "https://corsproxy.io/?url=" +
    encodeURIComponent(
      "https://wfs.geonet.org.nz/geonet/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonet:quake_search_v1&outputFormat=json&cql_filter=depth%3C50+AND+origintime%3E=%272025-01-01%27+AND+DWITHIN(origin_geom,Point+(173.5+-35.2),140000,meters)"
    );

  function earthquakeColor(magnitude) {
    var cfg = MARKER_CONFIG.earthquakes || {};
    var mag = parseFloat(magnitude);

    if (!isFinite(mag)) {
      return cfg.defaultColor || "#795548";
    }
    if (mag >= 4) {
      return cfg.moderate || cfg.defaultColor || "#f44336";
    }
    if (mag >= 2.5) {
      return cfg.light || cfg.defaultColor || "#ff9800";
    }
    return cfg.minor || cfg.defaultColor || "#4caf50";
  }

  function formatEarthquakeTime(origintime) {
    if (!origintime) {
      return "";
    }
    var d = new Date(origintime);
    if (isNaN(d.getTime())) {
      return origintime;
    }
    // Local browser time, readable string
    return d.toLocaleString();
  }

  function buildEarthquakePopup(props) {
    var mag = props.magnitude;
    var depth = props.depth;
    var timeStr = formatEarthquakeTime(props.origintime);
    var id = props.publicid;

    var html = "<strong>GeoNet earthquake</strong><br>";

    if (mag != null) {
      var magNum = parseFloat(mag);
      html += "Magnitude: " + (isFinite(magNum) ? magNum.toFixed(1) : mag) + "<br>";
    }
    if (depth != null) {
      html += "Depth: " + depth + " km<br>";
    }
    if (timeStr) {
      html += "Time: " + timeStr + "<br>";
    }

    if (id) {
      // publicid is like "2025p660965"
      var quakeUrl =
        "https://www.geonet.org.nz/quake/" +
        encodeURIComponent(String(id));
      html +=
        '<br><a href="' +
        quakeUrl +
        '" target="_blank" rel="noopener">View on GeoNet</a>';
    }

    return html;
  }

  function loadGeonetEarthquakes(url, targetLayer) {
    mapFetchJsonTracked("map.geonet.earthquakes", url)
      .then(function (geojson) {
        if (!geojson || !Array.isArray(geojson.features)) {
          console.warn("GeoNet earthquakes data is not a FeatureCollection");
          return;
        }

        geojson.features.forEach(function (feature) {
          if (!feature || !feature.geometry || feature.geometry.type !== "Point") {
            return;
          }

          var coords = feature.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) {
            return;
          }

          var lng = coords[0];
          var lat = coords[1];
          if (!isFinite(lat) || !isFinite(lng)) {
            return;
          }

          var props = feature.properties || {};
          var mag = parseFloat(props.magnitude);
          var color = earthquakeColor(mag);

          var radius = 5;
          if (isFinite(mag)) {
            radius = 3 + mag * 1.5;
            if (radius < 4) {
              radius = 4;
            }
            if (radius > 12) {
              radius = 12;
            }
          }

          var marker = L.circleMarker([lat, lng], {
            radius: radius,
            fillColor: color,
            color: "#ffffff",
            weight: 1,
            fillOpacity: 0.9
          });

          marker.bindPopup(buildEarthquakePopup(props));
          targetLayer.addLayer(marker);
        });
      })
      .catch(function (err) {
        console.warn("GeoNet earthquakes load failed", err);
      });
  }

  // Load GeoNet earthquakes layer
  loadGeonetEarthquakes(GEONET_EARTHQUAKES_URL, layerEarthquakes);
    // 9. GeoNet Quake Warnings (CAP feed)

    // Sample GeoNet CAP feed (using your example file through the CORS proxy)
    var GEONET_CAP_FEED_URL = MAP_ENDPOINTS.geonetCapFeed ||
      "https://corsproxy.io/?url=" +
      encodeURIComponent(
        "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/GeoNet/quake-example.xml"
      );

    function loadGeoNetWarningCap(url) {
      mapFetchTextTracked("map.geonet.cap", url)
        .then(function (xmlText) {
          var parser = new DOMParser();
          var capDoc = parser.parseFromString(xmlText, "application/xml");

          var infoEl = capDoc.getElementsByTagName("info")[0];
          if (!infoEl) {
            console.warn("GeoNet CAP: no <info> element found");
            return;
          }

          var eventEl = infoEl.getElementsByTagName("event")[0];
          var headlineEl = infoEl.getElementsByTagName("headline")[0];
          var descriptionEl = infoEl.getElementsByTagName("description")[0];
          var onsetEl = infoEl.getElementsByTagName("onset")[0];
          var expiresEl = infoEl.getElementsByTagName("expires")[0];

          var eventName = eventEl ? eventEl.textContent : "Earthquake";
          var headline = headlineEl ? headlineEl.textContent : eventName;
          var description = descriptionEl ? descriptionEl.textContent : "";
          var onset = onsetEl ? onsetEl.textContent : "";
          var expires = expiresEl ? expiresEl.textContent : "";

          // Build parameter map from <parameter><valueName>/<value>
          var params = infoEl.getElementsByTagName("parameter");
          var paramMap = {};
          for (var i = 0; i < params.length; i++) {
            var p = params[i];
            var valueNameEl = p.getElementsByTagName("valueName")[0];
            var valueEl = p.getElementsByTagName("value")[0];
            if (!valueNameEl || !valueEl) {
              continue;
            }
            paramMap[valueNameEl.textContent] = valueEl.textContent;
          }

          // Core coordinates from LatitudeLongitude parameter
          var latLngStr = paramMap.LatitudeLongitude || paramMap["LatitudeLongitude"];
          var lat = null;
          var lng = null;
          if (latLngStr) {
            var llParts = latLngStr.split(",");
            if (llParts.length === 2) {
              lat = parseFloat(llParts[0]);
              lng = parseFloat(llParts[1]);
            }
          }

          // Optional area circle "lat,lon radiusKm"
          var areaEl = infoEl.getElementsByTagName("area")[0];
          var circleEl = areaEl ? areaEl.getElementsByTagName("circle")[0] : null;
          var radiusKm = null;
          if (circleEl) {
            var circleText = circleEl.textContent.trim();
            var circleParts = circleText.split(" ");
            if (circleParts.length === 2) {
              var centreParts = circleParts[0].split(",");
              if ((!lat || !lng) && centreParts.length === 2) {
                lat = parseFloat(centreParts[0]);
                lng = parseFloat(centreParts[1]);
              }
              radiusKm = parseFloat(circleParts[1]);
            }
          }

          if (lat == null || isNaN(lat) || lng == null || isNaN(lng)) {
            console.warn("GeoNet CAP: no valid coordinates");
            return;
          }

          var magnitude = paramMap.Magnitude || paramMap["Magnitude"];
          var depth = paramMap.Depth || paramMap["Depth"];
          var locality = paramMap.Locality || paramMap["Locality"];
          var intensity = paramMap.Intensity || paramMap["Intensity"];
          var mmi = paramMap.MMI || paramMap["MMI"];
          var timeParam = paramMap.Time || paramMap["Time"];

          var webEl = infoEl.getElementsByTagName("web")[0];
          var webUrl = webEl ? webEl.textContent : "";

          var popupHtml =
            "<strong>" + headline + "</strong><br>" +
            "<em>" + eventName + "</em><br>" +
            (locality ? locality + "<br>" : "") +
            (magnitude ? "Magnitude: " + magnitude + "<br>" : "") +
            (depth ? "Depth: " + depth + " km<br>" : "") +
            (intensity ? "Intensity: " + intensity + "<br>" : "") +
            (mmi ? "MMI: " + mmi + "<br>" : "") +
            (timeParam ? "Origin time: " + timeParam + "<br>" : "") +
            (onset ? "Onset: " + onset + "<br>" : "") +
            (expires ? "Expires: " + expires + "<br>" : "") +
            (description ? "<br>" + description + "<br>" : "") +
            (webUrl
              ? '<br><a href="' + webUrl + '" target="_blank" rel="noopener">View details on GeoNet</a>'
              : "");

          var markerColor =
            MARKER_CONFIG.geonetCap && MARKER_CONFIG.geonetCap.color
              ? MARKER_CONFIG.geonetCap.color
              : "#fbc02d";

          // Centre marker for the quake warning
          var marker = L.marker([lat, lng], {
            icon: makeIcon(markerColor)
          }).bindPopup(popupHtml);

          layerGeoNetWarnings.addLayer(marker);

          // Optional CAP area circle
          if (radiusKm && isFinite(radiusKm)) {
            var circle = L.circle([lat, lng], {
              radius: radiusKm * 1000, // km to m
              color: markerColor,
              weight: 2,
              fillOpacity: 0.1
            });
            layerGeoNetWarnings.addLayer(circle);
          }
        })
        .catch(function (err) {
          console.warn("GeoNet CAP warning load failed", err);
        });
    }

    // Kick off GeoNet quake warning CAP load
    loadGeoNetWarningCap(GEONET_CAP_FEED_URL);

//  Service Centres (FNDC District Facilities)
// Uses the same ArcGIS pgeojson feed as Community Halls

// Reuse the same facilities URL you already use for community halls.
// If you named it differently, keep that name here.
var FACILITIES_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent(
    "https://services5.arcgis.com/H4FlrMy6xTBd6Ywx/ArcGIS/rest/services/DistrictFacilities_FNDC_public/FeatureServer/0/query?where=1%3D1&objectIds=&geometry=&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token="
  );

function buildServiceCentrePopup(props) {
  var name =
    props.asset_name ||
    props.system_name ||
    props.asset_id ||
    "Service Centre";

  var community = props.community || "";
  var location = props.location || "";
  var status = props.status || "";
  var managedBy = props.managed_by || "";
  var owner = props.asset_owner || "";

  var html = "<strong>" + name + "</strong><br>";

  if (community) {
    html += "<em>" + community + "</em><br>";
  }
  if (location) {
    html += "Location: " + location + "<br>";
  }
  if (status) {
    html += "Status: " + status + "<br>";
  }
  if (managedBy) {
    html += "Managed by: " + managedBy + "<br>";
  }
  if (owner) {
    html += "Owner: " + owner + "<br>";
  }

  return html;
}

function loadServiceCentres(url, targetLayer) {
  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (geojson) {
      if (!geojson || !Array.isArray(geojson.features)) {
        console.warn("Facilities feed is not a FeatureCollection");
        return;
      }

      geojson.features.forEach(function (feature) {
        if (!feature.geometry || feature.geometry.type !== "Point") {
          return;
        }

        var props = feature.properties || {};

        // Only Service Centre category
        if (props.category !== "Service Centre") {
          return;
        }

        var coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
          return;
        }

        var lng = coords[0];
        var lat = coords[1];

        if (!isFinite(lat) || !isFinite(lng)) {
          return;
        }

        var iconColor =
          MARKER_CONFIG.serviceCentres &&
          MARKER_CONFIG.serviceCentres.color
            ? MARKER_CONFIG.serviceCentres.color
            : "#ff9800";

        var marker = L.marker([lat, lng], {
          icon: makeSymbolIcon(
            iconColor,
            (MARKER_CONFIG.serviceCentres && MARKER_CONFIG.serviceCentres.symbol) || "S"
          )
        });

        marker.bindPopup(buildServiceCentrePopup(props));
        targetLayer.addLayer(marker);
      });
    })
    .catch(function (err) {
      console.warn("Service Centres load failed", err);
    });
}

// Load service centres
loadServiceCentres(FACILITIES_URL, layerServiceCentres);

// Swimsafe swimming locations
// Live API
var SWIMSAFE_URL = "https://corsproxy.io/?url=https://www.lawa.org.nz/umbraco/api/mapservice/swimsites";
// For local testing with your saved file you can temporarily use:
// var SWIMSAFE_URL = "swimsites.json";

function swimsafeColorForSite(site) {
  var cfg = MARKER_CONFIG.swimsafe || {};
  var css = (site.CssClass || site.cssClass || "").toLowerCase();

  if (cfg.colorByRiskClass) {
    if (css && cfg.colorByRiskClass[css]) {
      return cfg.colorByRiskClass[css];
    }
    // Optional alternative key if the API exposes something like site.RiskClass
    if (!css && site.RiskClass && cfg.colorByRiskClass[site.RiskClass]) {
      return cfg.colorByRiskClass[site.RiskClass];
    }
  }

  return cfg.defaultColor || "#00bcd4";
}

function riskLabelFromCssClass(cssClass) {
  if (!cssClass) return "";
  var c = cssClass.toLowerCase();
  if (c.indexOf("risk-vlow") === 0) return "Very low risk";
  if (c.indexOf("risk-low") === 0) return "Low risk";
  if (
    c.indexOf("risk-med") === 0 ||
    c.indexOf("risk-medium") === 0 ||
    c.indexOf("risk-mod") === 0
  ) {
    return "Moderate risk";
  }
  if (c.indexOf("risk-high") === 0) return "High risk";
  if (c.indexOf("nodata") === 0) return "No recent risk data";
  return "";
}


function loadSwimsafeSites(url, targetLayer) {
  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (sites) {
      if (!Array.isArray(sites)) {
        console.warn("Swimsafe sites data is not an array", sites);
        return;
      }

      sites.forEach(function (site) {
        var lat = site.Latitude != null ? site.Latitude : site.latitude;
        var lng = site.Longitude != null ? site.Longitude : site.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") {
          return;
        }

        // Limit to Far North district area
        if (!isInFarNorth(lat, lng)) {
          return;
        }

        var name = site.Name || site.name || "Swimming site";
        var urlPath = site.Url || site.url || "";
        var siteType = site.SiteType || site.siteType || "";
        var cssClass = site.CssClass || site.cssClass || "";
        var riskLabel = riskLabelFromCssClass(cssClass);

        var popupHtml =
          "<strong>" + name + "</strong><br>" +
          (siteType ? siteType + "<br>" : "") +
          (riskLabel ? "<strong>Risk:</strong> " + riskLabel + "<br>" : "");

        if (urlPath) {
          var fullUrl = urlPath.indexOf("http") === 0
            ? urlPath
            : "https://www.lawa.org.nz" + urlPath; // adjust if needed

          popupHtml +=
            '<br><a href="' + fullUrl +
            '" target="_blank" rel="noopener">View swim site details</a>';
        }

        var marker = L.marker([lat, lng], {
          icon: makeIcon(swimsafeColorForSite(site))
        });

        marker.bindPopup(popupHtml);
        targetLayer.addLayer(marker);
      });
    })
    .catch(function (err) {
      console.warn("Swimsafe sites load failed", err);
    });
}

// Load Swimsafe layer
loadSwimsafeSites(SWIMSAFE_URL, layerSwimsafe);

// 9. Local Road Closures from RAMM public closures JSON

var LOCAL_ROAD_CLOSURES_SOURCE_URL =
  MAP_ENDPOINTS.localRoadClosuresSource ||
  "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/public/public_closures_FNDC.json";
var LOCAL_ROAD_CLOSURES_URL =
  MAP_ENDPOINTS.localRoadClosures ||
  LOCAL_ROAD_CLOSURES_SOURCE_URL ||
  "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/public/public_closures_FNDC.json";

var LOCAL_ROAD_CLOSURES_PAYLOAD = {
  updatedAt: "",
  items: []
};

function ensureNztmProj() {
  if (typeof proj4 === "undefined" || typeof proj4.defs !== "function") {
    return false;
  }
  if (!proj4.defs("EPSG:2193")) {
    proj4.defs(
      "EPSG:2193",
      "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +units=m +no_defs"
    );
  }
  return true;
}

function nztmToLatLng(easting, northing) {
  if (!isFinite(easting) || !isFinite(northing)) {
    return null;
  }
  if (!ensureNztmProj()) {
    return null;
  }
  try {
    var lngLat = proj4("EPSG:2193", "EPSG:4326", [easting, northing]);
    if (!lngLat || !isFinite(lngLat[0]) || !isFinite(lngLat[1])) {
      return null;
    }
    return [lngLat[1], lngLat[0]];
  } catch (_err) {
    return null;
  }
}

function parseWktPoint(text) {
  var m = String(text || "").trim().match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
  if (!m) return null;
  return nztmToLatLng(parseFloat(m[1]), parseFloat(m[2]));
}

function parseWktLineString(text) {
  var m = String(text || "").trim().match(/^LINESTRING\s*\(\s*(.+)\s*\)$/i);
  if (!m) return null;
  var parts = m[1].split(",");
  var latlngs = [];
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].trim().split(/\s+/);
    if (pair.length < 2) continue;
    var ll = nztmToLatLng(parseFloat(pair[0]), parseFloat(pair[1]));
    if (ll) latlngs.push(ll);
  }
  return latlngs.length ? latlngs : null;
}

function buildLocalRoadClosurePopup(item) {
  return (
    "<strong>" + (item.road_id || "Local road closure") + "</strong><br>" +
    (item.road_status ? "Status: " + item.road_status + "<br>" : "") +
    (item.type ? "Type: " + item.type + "<br>" : "") +
    (item.cause ? "Cause: " + item.cause + "<br>" : "") +
    (item.s_datetime ? "From: " + item.s_datetime + "<br>" : "") +
    (item.e_datetime ? "Until: " + item.e_datetime + "<br>" : "") +
    (item.detour ? "Detour: Yes<br>" : "Detour: No<br>") +
    (item.detour_details ? "Detour details: " + item.detour_details + "<br>" : "") +
    (item.c_description ? "Details: " + item.c_description + "<br>" : "")
  );
}

function publishLocalRoadClosuresForStatus(items) {
  LOCAL_ROAD_CLOSURES_PAYLOAD = {
    updatedAt: new Date().toISOString(),
    items: Array.isArray(items) ? items : []
  };
  window.__FNED_MAP_LOCAL_ROAD_CLOSURES_DATA = LOCAL_ROAD_CLOSURES_PAYLOAD;
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fned:map-local-road-closures-updated", {
      detail: LOCAL_ROAD_CLOSURES_PAYLOAD
    }));
  }
}

function renderLocalRoadClosureFeature(item, targetLayer, markerCollector) {
  var wkt = String(item && item.geometry ? item.geometry : "").trim();
  var popupHtml = buildLocalRoadClosurePopup(item || {});
  var typeKey = String((item && (item.road_status || item.type)) || "local").toLowerCase();
  var clusterGroupLabel = "Local road closures (" + typeKey + ")";

  function addClosurePoint(point) {
    if (!point) return;
    if (Array.isArray(markerCollector)) {
      markerCollector.push({
        lat: point[0],
        lng: point[1],
        color: MARKER_CONFIG.localRoadClosures.color,
        symbol: localRoadClosureSymbol(),
        clusterType: typeKey,
        clusterLabel: String((item && item.road_id) || "Local closure"),
        clusterGroupLabel: clusterGroupLabel,
        popupHtml: popupHtml
      });
      return;
    }
    L.marker(point, {
      icon: makeSymbolIcon(MARKER_CONFIG.localRoadClosures.color, localRoadClosureSymbol())
    })
      .bindPopup(popupHtml)
      .addTo(targetLayer);
  }

  if (wkt) {
    var point = parseWktPoint(wkt);
    if (point) {
      addClosurePoint(point);
      return;
    }

    var line = parseWktLineString(wkt);
    if (line) {
      L.polyline(line, {
        color: MARKER_CONFIG.localRoadClosures.color,
        weight: 4,
        opacity: 0.9
      }).bindPopup(popupHtml).addTo(targetLayer);
      return;
    }
  }

  var easting = item && item.easting;
  var northing = item && item.northing;
  if (isFinite(Number(easting)) && isFinite(Number(northing))) {
    var fallbackPoint = nztmToLatLng(Number(easting), Number(northing));
    if (fallbackPoint) {
      addClosurePoint(fallbackPoint);
    }
  }
}
function extractLocalRoadClosuresRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload && Array.isArray(payload.rows)) {
    return payload.rows;
  }
  return [];
}

function tryParseGitHubRawUrl(url) {
  var value = String(url || "").trim();
  var re = /^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/i;
  var match = value.match(re);
  if (!match) {
    return null;
  }
  return {
    owner: match[1],
    repo: match[2],
    ref: match[3],
    path: match[4]
  };
}

function normaliseGitHubRawSourceUrl(url) {
  var value = String(url || "").trim();
  return value.replace("/refs/heads/", "/");
}

function buildLocalRoadClosuresUrlCandidates() {
  var candidates = [];
  function add(url) {
    var value = String(url || "").trim();
    if (!value) {
      return;
    }
    if (candidates.indexOf(value) === -1) {
      candidates.push(value);
    }
  }
  add(LOCAL_ROAD_CLOSURES_URL);
  add(LOCAL_ROAD_CLOSURES_SOURCE_URL);
  add(normaliseGitHubRawSourceUrl(LOCAL_ROAD_CLOSURES_SOURCE_URL));

  var parsed = tryParseGitHubRawUrl(normaliseGitHubRawSourceUrl(LOCAL_ROAD_CLOSURES_SOURCE_URL));
  if (parsed) {
    add("https://raw.githubusercontent.com/" + parsed.owner + "/" + parsed.repo + "/" + parsed.ref + "/" + parsed.path);
    add("https://api.github.com/repos/" + parsed.owner + "/" + parsed.repo + "/contents/" + parsed.path + "?ref=" + encodeURIComponent(parsed.ref));
  }
  return candidates;
}

function decodeGitHubContentsPayload(payload) {
  if (!payload || payload.encoding !== "base64" || !payload.content) {
    return null;
  }
  try {
    var decoded = atob(String(payload.content).replace(/\s+/g, ""));
    return JSON.parse(decoded);
  } catch (_err) {
    return null;
  }
}

function fetchLocalRoadClosuresPayloadFromCandidates(candidates, idx) {
  if (!Array.isArray(candidates) || idx >= candidates.length) {
    return Promise.reject(new Error("No local road closures source succeeded"));
  }
  var url = candidates[idx];
  return mapFetchJsonTracked("map.local_road_closures", url)
    .then(function (payload) {
      var rows = extractLocalRoadClosuresRows(payload);
      if (rows.length) {
        return { payload: payload, rows: rows };
      }
      var decoded = decodeGitHubContentsPayload(payload);
      rows = extractLocalRoadClosuresRows(decoded);
      if (rows.length) {
        return { payload: decoded, rows: rows };
      }
      return fetchLocalRoadClosuresPayloadFromCandidates(candidates, idx + 1);
    })
    .catch(function () {
      return fetchLocalRoadClosuresPayloadFromCandidates(candidates, idx + 1);
    });
}

function loadLocalRoadClosures() {
  var localSnapshotRows = extractLocalRoadClosuresRows(window.__FNED_PUBLIC_CLOSURES_SNAPSHOT);
  if (String(window.location && window.location.protocol || "").toLowerCase() === "file:" && localSnapshotRows.length) {
    var localSnapshotMarkers = [];
    localSnapshotRows.forEach(function (item) {
      renderLocalRoadClosureFeature(item, layerLocalRoadClosures, localSnapshotMarkers);
    });
    upsertDynamicClusterState("localRoad", layerLocalRoadClosures, localSnapshotMarkers, {
      enabled: MAP_LOCAL_ROAD_CLUSTER_ENABLED,
      minCount: MAP_LOCAL_ROAD_CLUSTER_MIN_COUNT,
      baseRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS,
      maxRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS,
      baseZoom: MAP_LOCAL_ROAD_CLUSTER_BASE_ZOOM,
      zoomStepMultiplier: MAP_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER,
      viewportWidthFactor: MAP_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR
    });
    publishLocalRoadClosuresForStatus(localSnapshotRows);
    feedStatusOk("map.local_road_closures", 200);
    return;
  }

  var candidates = buildLocalRoadClosuresUrlCandidates();
  fetchLocalRoadClosuresPayloadFromCandidates(candidates, 0)
    .then(function (result) {
      var rows = result && Array.isArray(result.rows) ? result.rows : [];
      var localRecords = [];
      if (!rows.length) {
        console.warn("Local road closures feed has no data rows");
      }
      rows.forEach(function (item) {
        renderLocalRoadClosureFeature(item, layerLocalRoadClosures, localRecords);
      });
      upsertDynamicClusterState("localRoad", layerLocalRoadClosures, localRecords, {
        enabled: MAP_LOCAL_ROAD_CLUSTER_ENABLED,
        minCount: MAP_LOCAL_ROAD_CLUSTER_MIN_COUNT,
        baseRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS,
        maxRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS,
        baseZoom: MAP_LOCAL_ROAD_CLUSTER_BASE_ZOOM,
        zoomStepMultiplier: MAP_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER,
        viewportWidthFactor: MAP_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR
      });
      publishLocalRoadClosuresForStatus(rows);
    })
    .catch(function (err) {
      var fallback = window.__FNED_PUBLIC_CLOSURES_SNAPSHOT;
      var fallbackRows = extractLocalRoadClosuresRows(fallback);
      if (fallbackRows.length) {
        var fallbackRecords = [];
        fallbackRows.forEach(function (item) {
          renderLocalRoadClosureFeature(item, layerLocalRoadClosures, fallbackRecords);
        });
        upsertDynamicClusterState("localRoad", layerLocalRoadClosures, fallbackRecords, {
          enabled: MAP_LOCAL_ROAD_CLUSTER_ENABLED,
          minCount: MAP_LOCAL_ROAD_CLUSTER_MIN_COUNT,
          baseRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_BASE_RADIUS_METERS,
          maxRadiusMeters: MAP_LOCAL_ROAD_CLUSTER_MAX_RADIUS_METERS,
          baseZoom: MAP_LOCAL_ROAD_CLUSTER_BASE_ZOOM,
          zoomStepMultiplier: MAP_LOCAL_ROAD_CLUSTER_ZOOM_STEP_MULTIPLIER,
          viewportWidthFactor: MAP_LOCAL_ROAD_CLUSTER_VIEWPORT_WIDTH_FACTOR
        });
        publishLocalRoadClosuresForStatus(fallbackRows);
        feedStatusOk("map.local_road_closures", 200);
        return;
      }
      console.warn("Local road closures load failed", err);
      publishLocalRoadClosuresForStatus([]);
    });
}

// Kick off local road closures load
loadLocalRoadClosures();






