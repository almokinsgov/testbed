/*
  Extracted from: v23 v32 - addedd in v32 - live for cap feeds.html
  Source lines: 5658-6278
  Note: Keep this as a classic script (no type="module").
  If hosting remotely, you can replace the HTML <script src> with a URL to this file.
*/

// Region warning and alerts - created by Amorangi Mathews 
 //version and current functionality 
  //1.2.1.7 to 1.3.2.0 single html file to JS,CSS and HTML, hosted in Github served with a CDN  
  const version = "1.3.2.0";

// Optional runtime overrides provided by the dashboard config
const FNED_RWAS_CFG = (window.FNED_CONFIG && window.FNED_CONFIG.regionWarnings)
  ? window.FNED_CONFIG.regionWarnings
  : {};
const RWAS_GLOBAL_ENDPOINTS = window.FNED_ENDPOINTS || {};
const RWAS_ENDPOINTS = RWAS_GLOBAL_ENDPOINTS.regionWarnings || {};
const RWAS_SHARED_FETCH = window.FNED_FETCH || null;
const RWAS_FETCH_TIMEOUT_MS = Math.max(1000, cfgNum(FNED_RWAS_CFG.fetchTimeoutMs, 15000));
const RWAS_FETCH_RETRIES = Math.max(0, Math.floor(cfgNum(FNED_RWAS_CFG.fetchRetries, 1)));
const RWAS_TIME_LOCALE = cfgStr(FNED_RWAS_CFG.timeLocale, "en-NZ");
const RWAS_TIME_ZONE = cfgStr(FNED_RWAS_CFG.timeZone, "Pacific/Auckland");

function cfgBool(value, fallback) {
  return (typeof value === "boolean") ? value : fallback;
}

function cfgNum(value, fallback) {
  return (typeof value === "number" && !Number.isNaN(value)) ? value : fallback;
}

function cfgStr(value, fallback) {
  return (typeof value === "string" && value.trim()) ? value.trim() : fallback;
}

function cfgObj(value, fallback) {
  return (value && typeof value === "object" && !Array.isArray(value)) ? value : fallback;
}

function cfgStrArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const clean = value
    .map(function (entry) { return (typeof entry === "string") ? entry.trim() : ""; })
    .filter(Boolean);
  return clean.length ? clean : fallback;
}

const RWAS_FEED_STATUS_API = window.FNED_FEED_STATUS_API || null;

function rwasFeedStatusStart(feedKey, url) {
  if (RWAS_FEED_STATUS_API && typeof RWAS_FEED_STATUS_API.start === "function") {
    RWAS_FEED_STATUS_API.start(feedKey, url);
  }
}

function rwasFeedStatusOk(feedKey, httpStatus) {
  if (RWAS_FEED_STATUS_API && typeof RWAS_FEED_STATUS_API.ok === "function") {
    RWAS_FEED_STATUS_API.ok(feedKey, { httpStatus: httpStatus || null });
  }
}

function rwasFeedStatusFail(feedKey, error) {
  if (RWAS_FEED_STATUS_API && typeof RWAS_FEED_STATUS_API.fail === "function") {
    RWAS_FEED_STATUS_API.fail(feedKey, error, { httpStatus: error && error.httpStatus ? error.httpStatus : null });
  }
}

async function rwasFetchTextTracked(feedKey, url) {
  if (RWAS_SHARED_FETCH && typeof RWAS_SHARED_FETCH.fetchText === "function") {
    return RWAS_SHARED_FETCH.fetchText(url, {
      feedKey: feedKey,
      feedStatusApi: RWAS_FEED_STATUS_API,
      timeoutMs: RWAS_FETCH_TIMEOUT_MS,
      retries: RWAS_FETCH_RETRIES
    });
  }

  rwasFeedStatusStart(feedKey, url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const httpError = new Error("HTTP " + response.status + " " + response.statusText);
      httpError.httpStatus = response.status;
      throw httpError;
    }
    const text = await response.text();
    rwasFeedStatusOk(feedKey, response.status);
    return text;
  } catch (error) {
    rwasFeedStatusFail(feedKey, error);
    throw error;
  }
}

async function rwasFetchJsonTracked(feedKey, url) {
  if (RWAS_SHARED_FETCH && typeof RWAS_SHARED_FETCH.fetchJson === "function") {
    return RWAS_SHARED_FETCH.fetchJson(url, {
      feedKey: feedKey,
      feedStatusApi: RWAS_FEED_STATUS_API,
      timeoutMs: RWAS_FETCH_TIMEOUT_MS,
      retries: RWAS_FETCH_RETRIES
    });
  }

  rwasFeedStatusStart(feedKey, url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const httpError = new Error("HTTP " + response.status + " " + response.statusText);
      httpError.httpStatus = response.status;
      throw httpError;
    }
    const data = await response.json();
    rwasFeedStatusOk(feedKey, response.status);
    return data;
  } catch (error) {
    rwasFeedStatusFail(feedKey, error);
    throw error;
  }
}

  let lastUpdatedTime = new Date();
  const functions = "Alert display, Container, Popup, onset window, non far north display, isstillactivecolour classes, simpilfy, cachefix, expiry tag, sorted, expiry hide, CD alerts added, sorting, badges, formatted alrert for cd, custom geo area with proxy and url support,  newgeojsonurl, temp urls for cd and met, area name extraction and apply to alert html,disable far north alerts, custom new geo json url. area definitions , html edit (msgType removed), multi area in alert html with and for multi location, custom sorted custom area,popup header and footer, restyled header and footer, restyle badges, hide cancelled cd alerts, changed icon to thunderstorm, auto change to warning econ when cd alert is present,button stlyling change, border to popup ";
  //Planned 
  const plannedadds = "cors config, js files and package for other systems, geonet cap feed adition, unplanned out power outages with custom alert and config, div mode, expired alert window with config, unplanned outages from top energy,road closures from nzta,button location,refresh button, duration in hours or days in alert html x hours from x to x";
  //alerts config
  let SHOW_EXPIRED_ALERTS = cfgBool(FNED_RWAS_CFG.showExpiredAlerts, true); // Change to true to show expired alerts
  let SHOW_NON_FAR_NORTH_ALERTS = cfgBool(FNED_RWAS_CFG.showNonFarNorthAlerts, false); //show all alerts in the feed
  let REQUIRE_ONSET_WITHIN_WINDOW = cfgBool(FNED_RWAS_CFG.requireOnsetWithinWindow, true); //filter results based on how long to start time
  let HOUR_WINDOW = cfgNum(FNED_RWAS_CFG.hourWindow, 24); //Amount of hours between the alert start time and date and the current time and date
  let proxy = cfgStr(FNED_RWAS_CFG.proxy, cfgStr(RWAS_ENDPOINTS.proxyPrefix, "https://corsproxy.io/?")); //cors proxy url
  //Met service feed url with proxy add in, this should be a github url, we dont want to overload metservices infrastructure in an emergency
  const metServiceSourceUrl = cfgStr(FNED_RWAS_CFG.metServiceSourceUrl, cfgStr(RWAS_ENDPOINTS.metServiceSourceUrl, "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml"));
  const METSERVICE_ATOM_URL_OVERRIDE = cfgStr(FNED_RWAS_CFG.metServiceAtomUrl, "");
const feedURL = METSERVICE_ATOM_URL_OVERRIDE || cfgStr(RWAS_ENDPOINTS.metServiceAtom, proxy + encodeURIComponent(metServiceSourceUrl));
  //Civil defence live feed tester and visialsier - https://codepen.io/Amorangi-Mathews/full/QwjGPyv
  //Met service feed visualiser and tester https://codepen.io/Amorangi-Mathews/full/WbQGRvr
// Civil defence alerts 
  const ENABLE_CD_ALERTS = cfgBool(FNED_RWAS_CFG.enableCivilDefenceAlerts, true); // Set to false to disable Civil Defence alerts
const CD_ALERT_FEED_URL = cfgStr(FNED_RWAS_CFG.civilDefenceAtomUrl, cfgStr(RWAS_ENDPOINTS.civilDefenceSourceUrl, "https://www.civildefence.govt.nz/home/rss")); //civil defence alert feed (atom)
  const CIVIL_DEFENCE_ATOM_URL_OVERRIDE = cfgStr(FNED_RWAS_CFG.civilDefenceAtomFeedUrl, "");
const CD_ALERT_ATOM_URL = CIVIL_DEFENCE_ATOM_URL_OVERRIDE || cfgStr(RWAS_ENDPOINTS.civilDefenceAtom, proxy + encodeURIComponent(CD_ALERT_FEED_URL));
  const SHOW_CANCELLED_CD_ALERTS = cfgBool(FNED_RWAS_CFG.showCancelledCivilDefenceAlerts, false); // Change to true to display CD alerts with msgType "Cancel"

 //custom geojson area alerts 
 let SHOW_CUSTOM_GEOJSON_ALERTS = cfgBool(FNED_RWAS_CFG.showCustomGeoJsonAlerts, false); //Show alerts for custom areas that are defined
let USE_PROXY_FOR_CUSTOM_GEOJSON = cfgBool(FNED_RWAS_CFG.useProxyForCustomGeoJson, true);  //use proxy for custom grojson urls under the custom geo areas
let USE_LINZ_AREAS = cfgBool(FNED_RWAS_CFG.useLinzAreas, false);
const DEFAULT_LINZ_API_KEY = "27a1097e44b44690a5c7726aa065a076";
const DEFAULT_LINZ_WFS_LAYER_URL = "https://data.linz.govt.nz/services;key=27a1097e44b44690a5c7726aa065a076/wfs/layer-113763/";
const DEFAULT_LINZ_WFS_TYPENAME = "layer-113763";
const LINZ_FORCE_BUNDLED_SOURCE = cfgBool(FNED_RWAS_CFG.linzForceBundledSource, true);
let USE_PROXY_FOR_LINZ_AREAS = cfgBool(FNED_RWAS_CFG.useProxyForLinzAreas, true);
let LINZ_SUBURB_LAYER_URL = LINZ_FORCE_BUNDLED_SOURCE
  ? DEFAULT_LINZ_WFS_LAYER_URL
  : cfgStr(FNED_RWAS_CFG.linzSuburbLayerUrl, DEFAULT_LINZ_WFS_LAYER_URL);
let LINZ_API_KEY = LINZ_FORCE_BUNDLED_SOURCE
  ? DEFAULT_LINZ_API_KEY
  : cfgStr(FNED_RWAS_CFG.linzApiKey, DEFAULT_LINZ_API_KEY);
let LINZ_API_KEY_PARAM = LINZ_FORCE_BUNDLED_SOURCE
  ? "api_key"
  : cfgStr(FNED_RWAS_CFG.linzApiKeyParam, "api_key");
let LINZ_WFS_TYPENAME = LINZ_FORCE_BUNDLED_SOURCE
  ? DEFAULT_LINZ_WFS_TYPENAME
  : cfgStr(FNED_RWAS_CFG.linzWfsTypeName, DEFAULT_LINZ_WFS_TYPENAME);
let LINZ_SELECTED_AREAS = cfgStrArray(FNED_RWAS_CFG.linzSelectedAreas, []);

let DISABLE_FAR_NORTH_ALERTS = cfgBool(FNED_RWAS_CFG.disableFarNorthAlerts, false);    //Hide Far north geo jason alerts 
//const withinTime = true; legacy content, was the alternative to isitactivestill
  let farNorthGeoJSON = null;
//Far north geojson config
  const GEOJSON_KEY = "farNorthGeoJSON";
  const GEOJSON_TIMESTAMP_KEY = "farNorthGeoJSON_timestamp";
  const GEOJSON_EXPIRY_HOURS = Math.max(1, cfgNum(FNED_RWAS_CFG.geoJsonExpiryHours, 24)); //Time period for Far North geojson cache refresh

  //check to see if the stored Far North geojson is still ative, uses geo expiry hours
  function isGeoJSONExpired() {
    const saved = localStorage.getItem(GEOJSON_TIMESTAMP_KEY);
    if (!saved) return true;
    const age = (Date.now() - parseInt(saved)) / (1000 * 60 * 60);
    return age > GEOJSON_EXPIRY_HOURS;
  }
//custom geo areas polygon creator https://codepen.io/Amorangi-Mathews/full/yyYgmLM
  const DEFAULT_CUSTOM_GEO_AREAS = {/*
  Area1: {
    type: "FeatureCollection",
    name: "Area 1",
    features: [
      {
        type: "Feature",
        properties: { Name: "Custom Area 1" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [173.295593, -35.250529],
              [173.298374, -35.251049],
              [173.299805, -35.248748],
              [173.295593, -35.250529]
            ]
          ]
        }
      }
    ]
  },*/
    "Far North": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/farnorth.geojson",
    "\u014ctur\u016b Marae": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/Marae/oturumarae.geojson",
    "Whang\u0101rei District": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/whangarei.geojson",
    "Gisborne": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/gisborne.geojson",
    "Nelson": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/nelson.geojson",
    "Southland": "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/cantosouth.geojson",
};
  let CustomGeoAreas = cfgObj(FNED_RWAS_CFG.customGeoAreas, DEFAULT_CUSTOM_GEO_AREAS);
  
  // or: const newGeoJSON = { type: "FeatureCollection", features: [...] };
const newGeoJSON = cfgStr(
  FNED_RWAS_CFG.farNorthGeoJsonUrl,
  "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Areas/farnorth.geojson"
);

  //try and load far north geo json
  async function loadFarNorthGeoJSON() {
  if (!isGeoJSONExpired()) {
    try {
      const stored = JSON.parse(localStorage.getItem(GEOJSON_KEY));
      if (stored && stored.type === "FeatureCollection") return stored;
    } catch {
      console.warn("Corrupted stored Far North GeoJSON, regenerating.");
    }
  }

  let finalGeoJSON = null;
//if there is a url load through a proxy if enabled
  try {
    if (typeof newGeoJSON === "string") {
      const url = USE_PROXY_FOR_CUSTOM_GEOJSON ? proxy + encodeURIComponent(newGeoJSON) : newGeoJSON;
      finalGeoJSON = await rwasFetchJsonTracked("rwas.far_north_geojson", url);
    } else if (newGeoJSON?.type === "FeatureCollection") {
      finalGeoJSON = newGeoJSON;
    }
  } catch (e) {
    console.warn("Failed to load newGeoJSON:", e);
  } 

  if (finalGeoJSON) {
    localStorage.setItem(GEOJSON_KEY, JSON.stringify(finalGeoJSON));
    localStorage.setItem(GEOJSON_TIMESTAMP_KEY, Date.now().toString());
  }

  return finalGeoJSON;
}

//custom sorting for areas displayed in the alert html from the custom geo area

const DEFAULT_AREA_DISPLAY_ORDER = [
"Far North District",
"Far North",
"\u014ctur\u016b Marae",
 "Whang\u0101rei District",
"Gisborne",
"Nelson",
"Southland",
];
window.FNED_RWAS_DEFAULTS = {
  customGeoAreas: JSON.parse(JSON.stringify(DEFAULT_CUSTOM_GEO_AREAS)),
  areaDisplayOrder: DEFAULT_AREA_DISPLAY_ORDER.slice()
};
let AREA_DISPLAY_ORDER = cfgStrArray(FNED_RWAS_CFG.areaDisplayOrder, DEFAULT_AREA_DISPLAY_ORDER);
function hasCustomAreaFilters() {
  return (SHOW_CUSTOM_GEOJSON_ALERTS && Object.keys(CustomGeoAreas).length > 0) ||
    (USE_LINZ_AREAS && LINZ_SELECTED_AREAS.length > 0);
}
function hasLocalAreaFilters() {
  return (!DISABLE_FAR_NORTH_ALERTS) || hasCustomAreaFilters();
}

function isLinzSelectionConfigured() {
  return USE_LINZ_AREAS && LINZ_SELECTED_AREAS.length > 0;
}

function isLinzFilteringDegraded() {
  return isLinzSelectionConfigured() && linzGeoAreas.length === 0;
}

function isScopedAreaFilteringActive() {
  const hasCustomScope = SHOW_CUSTOM_GEOJSON_ALERTS && customGeoAreas.length > 0;
  const hasLinzScope = USE_LINZ_AREAS && linzGeoAreas.length > 0;
  return hasCustomScope || hasLinzScope;
}

function getActiveAlertScopeAreas() {
  const areas = [];
  if (!DISABLE_FAR_NORTH_ALERTS && farNorthGeoJSON) {
    areas.push({ name: "Far North District", geojson: farNorthGeoJSON });
  }
  if ((SHOW_CUSTOM_GEOJSON_ALERTS || USE_LINZ_AREAS) && customGeoAreas.length) {
    customGeoAreas.forEach(function (item) {
      areas.push(item);
    });
  }
  if ((SHOW_CUSTOM_GEOJSON_ALERTS || USE_LINZ_AREAS) && linzGeoAreas.length) {
    linzGeoAreas.forEach(function (item) {
      areas.push(item);
    });
  }
  return areas;
}

function alertScopeIntersectsGeoJsonFeature(feature) {
  if (!feature || !feature.geometry || typeof turf === "undefined") {
    return false;
  }
  const scopedActive = isScopedAreaFilteringActive();
  const areas = getActiveAlertScopeAreas();
  let intersects = false;
  for (let i = 0; i < areas.length; i++) {
    const area = areas[i];
    if (area && area.geojson && turf.booleanIntersects(feature, area.geojson)) {
      intersects = true;
      break;
    }
  }
  return scopedActive
    ? intersects
    : (SHOW_NON_FAR_NORTH_ALERTS ? true : intersects);
}

function buildAlertScopeApi() {
  return {
    isScopedAreaFilteringActive: isScopedAreaFilteringActive(),
    showNonFarNorthAlerts: !!SHOW_NON_FAR_NORTH_ALERTS,
    disableFarNorthAlerts: !!DISABLE_FAR_NORTH_ALERTS,
    showCustomGeoJsonAlerts: !!SHOW_CUSTOM_GEOJSON_ALERTS,
    useLinzAreas: !!USE_LINZ_AREAS,
    loadedCustomAreaNames: customGeoAreas.map(function (item) { return item.name; }),
    loadedLinzAreaNames: linzGeoAreas.map(function (item) { return item.name; }),
    featureMatchesAreaScope: function (feature) {
      return alertScopeIntersectsGeoJsonFeature(feature);
    }
  };
}


//Format the times

  function formatReadableTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(RWAS_TIME_LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: RWAS_TIME_ZONE
    });
  } 
  //predifinitions and clering 
  let customGeoAreas = [];
  let linzGeoAreas = [];
let combinedAlertList = []; // Holds all alerts for sorting and display

function isLinzArcGisEndpoint() {
  return /arcgis\/rest/i.test(String(LINZ_SUBURB_LAYER_URL || ""));
}

function linzArcGisQueryUrl(params) {
  const base = LINZ_SUBURB_LAYER_URL.replace(/\/+$/, "") + "/query";
  const requestParams = {};
  Object.keys(params || {}).forEach(function (key) {
    requestParams[key] = params[key];
  });
  if (LINZ_API_KEY && LINZ_API_KEY_PARAM) {
    requestParams[LINZ_API_KEY_PARAM] = LINZ_API_KEY;
  }
  const pairs = Object.keys(requestParams).map(function (key) {
    return encodeURIComponent(key) + "=" + encodeURIComponent(requestParams[key]);
  });
  const url = base + "?" + pairs.join("&");
  return USE_PROXY_FOR_LINZ_AREAS ? (proxy + encodeURIComponent(url)) : url;
}

function linzWfsGetFeatureUrl(startIndex, count) {
  const base = LINZ_SUBURB_LAYER_URL.replace(/\/+$/, "") + "/";
  const requestParams = {
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: LINZ_WFS_TYPENAME || DEFAULT_LINZ_WFS_TYPENAME,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: String(count),
    startIndex: String(startIndex)
  };
  const pairs = Object.keys(requestParams).map(function (key) {
    return encodeURIComponent(key) + "=" + encodeURIComponent(requestParams[key]);
  });
  const url = base + "?" + pairs.join("&");
  return USE_PROXY_FOR_LINZ_AREAS ? (proxy + encodeURIComponent(url)) : url;
}

function pickLinzName(attrs) {
  if (!attrs || typeof attrs !== "object") return "";
  const candidates = [
    "name",
    "Name",
    "SUBURB_LOCALITY",
    "SUBURB_LOC",
    "LOCALITY_NAME",
    "LOCALITY",
    "SUBURB",
    "suburb",
    "label"
  ];
  for (let i = 0; i < candidates.length; i++) {
    const value = attrs[candidates[i]];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const keys = Object.keys(attrs);
  for (let i = 0; i < keys.length; i++) {
    const value = attrs[keys[i]];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function latFromArcGisGeometry(geometry) {
  if (!geometry) return null;
  if (typeof geometry.y === "number") return geometry.y;
  if (!Array.isArray(geometry.rings)) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < geometry.rings.length; i++) {
    const ring = geometry.rings[i];
    if (!Array.isArray(ring)) continue;
    for (let j = 0; j < ring.length; j++) {
      const pt = ring[j];
      if (Array.isArray(pt) && typeof pt[1] === "number") {
        sum += pt[1];
        count += 1;
      }
    }
  }
  return count ? (sum / count) : null;
}

function latFromGeoJsonGeometry(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  let sum = 0;
  let count = 0;
  (function walk(node) {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      sum += node[1];
      count += 1;
      return;
    }
    for (let i = 0; i < node.length; i++) walk(node[i]);
  })(geometry.coordinates);
  return count ? (sum / count) : null;
}

function arcGisGeometryToFeatureCollection(geometry, attrs) {
  if (!geometry) return null;
  if (Array.isArray(geometry.rings)) {
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: attrs || {},
        geometry: {
          type: "Polygon",
          coordinates: geometry.rings
        }
      }]
    };
  }
  if (typeof geometry.x === "number" && typeof geometry.y === "number") {
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: attrs || {},
        geometry: {
          type: "Point",
          coordinates: [geometry.x, geometry.y]
        }
      }]
    };
  }
  return null;
}

function geoJsonGeometryToFeatureCollection(geometry, attrs) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: attrs || {},
      geometry: geometry
    }]
  };
}

let linzAreaCatalogPromise = null;
let linzAreaCatalog = [];
let linzAreaGeoMap = {};
let linzAreaCatalogFetchedAt = 0;
let linzAreaCatalogSourceKey = "";
const LINZ_AREA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const LINZ_WFS_PAGE_SIZE = 250;

function getLinzSourceKey() {
  return [
    String(LINZ_SUBURB_LAYER_URL || ""),
    String(LINZ_WFS_TYPENAME || ""),
    String(LINZ_API_KEY_PARAM || ""),
    String(LINZ_API_KEY || ""),
    String(LINZ_FORCE_BUNDLED_SOURCE ? "1" : "0"),
    String(USE_PROXY_FOR_LINZ_AREAS ? "1" : "0"),
    String(proxy || "")
  ].join("|");
}

async function loadLinzAreaCatalog(force) {
  const sourceKey = getLinzSourceKey();
  const cacheAge = Date.now() - linzAreaCatalogFetchedAt;
  const cacheIsFresh = linzAreaCatalogFetchedAt > 0 && cacheAge >= 0 && cacheAge < LINZ_AREA_CACHE_TTL_MS;
  if (!force && linzAreaCatalogPromise && cacheIsFresh && sourceKey === linzAreaCatalogSourceKey) return linzAreaCatalogPromise;
  if (!cacheIsFresh || sourceKey !== linzAreaCatalogSourceKey) {
    linzAreaCatalogPromise = null;
    linzAreaCatalog = [];
    linzAreaGeoMap = {};
  }
  linzAreaCatalogPromise = (async function () {
    const list = [];
    const geoByName = {};
    let offset = 0;
    const pageSize = LINZ_WFS_PAGE_SIZE;
    let guard = 0;
    while (guard < 50) {
      guard += 1;
      const page = isLinzArcGisEndpoint()
        ? await rwasFetchJsonTracked("rwas.linz.localities", linzArcGisQueryUrl({
          where: "1=1",
          outFields: "*",
          returnGeometry: "true",
          outSR: "4326",
          resultOffset: String(offset),
          resultRecordCount: String(pageSize),
          f: "json"
        }))
        : await rwasFetchJsonTracked("rwas.linz.localities", linzWfsGetFeatureUrl(offset, pageSize));
      const features = Array.isArray(page && page.features) ? page.features : [];
      if (!features.length) break;
      for (let i = 0; i < features.length; i++) {
        const feature = features[i] || {};
        const attrs = isLinzArcGisEndpoint() ? (feature.attributes || {}) : (feature.properties || {});
        const name = pickLinzName(attrs);
        if (!name || geoByName[name]) continue;
        const geojson = isLinzArcGisEndpoint()
          ? arcGisGeometryToFeatureCollection(feature.geometry, attrs)
          : geoJsonGeometryToFeatureCollection(feature.geometry, attrs);
        if (!geojson) continue;
        const latitude = isLinzArcGisEndpoint()
          ? latFromArcGisGeometry(feature.geometry)
          : latFromGeoJsonGeometry(feature.geometry);
        geoByName[name] = geojson;
        list.push({ name: name, latitude: (typeof latitude === "number" ? latitude : -90) });
      }
      if (features.length < pageSize) break;
      if (isLinzArcGisEndpoint() && page.exceededTransferLimit !== true) break;
      offset += features.length;
    }
    list.sort(function (a, b) { return b.latitude - a.latitude; });
    linzAreaCatalog = list;
    linzAreaGeoMap = geoByName;
    linzAreaCatalogFetchedAt = Date.now();
    linzAreaCatalogSourceKey = sourceKey;
    return { list: list, geoByName: geoByName };
  })().catch(function (err) {
    linzAreaCatalogPromise = null;
    throw err;
  });
  return linzAreaCatalogPromise;
}

async function loadSelectedLinzGeoAreas() {
  if (!USE_LINZ_AREAS || !LINZ_SELECTED_AREAS.length) return [];
  try {
    const catalog = await loadLinzAreaCatalog(false);
    const geoByName = catalog.geoByName || {};
    const lowerNameMap = {};
    Object.keys(geoByName).forEach(function (name) {
      lowerNameMap[name.toLowerCase()] = name;
    });
    const selected = [];
    LINZ_SELECTED_AREAS.forEach(function (rawName) {
      const normalized = String(rawName || "").trim();
      if (!normalized) return;
      const exact = geoByName[normalized];
      if (exact) {
        selected.push({ name: normalized, geojson: exact });
        return;
      }
      const resolved = lowerNameMap[normalized.toLowerCase()];
      if (resolved && geoByName[resolved]) {
        selected.push({ name: resolved, geojson: geoByName[resolved] });
      }
    });
    return selected;
  } catch (err) {
    console.warn("Failed to load selected LINZ areas:", err);
    return [];
  }
}

window.FNED_LINZ_AREAS_API = {
  getAreaList: async function (force) {
    const catalog = await loadLinzAreaCatalog(!!force);
    return (catalog.list || []).map(function (item) {
      return { name: item.name, latitude: item.latitude };
    });
  },
  getStatus: function () {
    return {
      loaded: !!linzAreaCatalogFetchedAt,
      count: Array.isArray(linzAreaCatalog) ? linzAreaCatalog.length : 0,
      fetchedAt: linzAreaCatalogFetchedAt || 0,
      cacheTtlMs: LINZ_AREA_CACHE_TTL_MS,
      sourceKey: linzAreaCatalogSourceKey
    };
  },
  clearCache: function () {
    linzAreaCatalogPromise = null;
    linzAreaCatalog = [];
    linzAreaGeoMap = {};
    linzAreaCatalogFetchedAt = 0;
    linzAreaCatalogSourceKey = "";
  }
};
  
  
  //check metservice feed, create html, sort
async function fetchAlerts() {
  try {
    const xmlText = await rwasFetchTextTracked("rwas.metservice.atom", feedURL);
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const ns = "http://www.w3.org/2005/Atom";
    const entries = [...xml.getElementsByTagNameNS(ns, "entry")];
    const links = entries.map(e => e.querySelector("link[rel='related']")?.getAttribute("href")).filter(Boolean);

    const alertList = [];

    for (const url of links) {
      const capText = await rwasFetchTextTracked("rwas.metservice.cap", proxy + encodeURIComponent(url));
      const capXML = new DOMParser().parseFromString(capText, "application/xml");
      const capNS = "urn:oasis:names:tc:emergency:cap:1.2";

      const info = capXML.getElementsByTagNameNS(capNS, "info")[0];
      if (!info) continue;

      function getParameterValue(infoNode, paramName) {
        const params = infoNode.getElementsByTagNameNS(capNS, "parameter");
        for (const param of params) {
          const name = param.getElementsByTagNameNS(capNS, "valueName")[0]?.textContent;
          const value = param.getElementsByTagNameNS(capNS, "value")[0]?.textContent;
          if (name && value && name === paramName) return value;
        }
        return "";
      }

      const get = tag => info.getElementsByTagNameNS(capNS, tag)[0]?.textContent || '';
      const headline = get("headline");
      const description = get("description");
      const onset = get("onset");
      const expires = get("expires");
      const event = get("event");
      const severity = get("severity");
      const certainty = get("certainty");
      const areaDesc = info.getElementsByTagNameNS(capNS, "areaDesc")[0]?.textContent || '';
      const web = get("web");

      const colourCode = getParameterValue(info, "ColourCode");
      const colourClass = colourCode ? `alert-${colourCode.toLowerCase()}` : 'alert-default';

      const polygons = [...info.getElementsByTagNameNS(capNS, "polygon")];
      const geoCoords = [];

      polygons.forEach(p => {
        const coords = p.textContent.trim().split(" ").map(pair => {
          const [lat, lon] = pair.split(",").map(Number);
          return [lon, lat];
        });
        geoCoords.push(coords);
      });

let intersects = false;
let matchedAreaNames = [];

geoCoords.forEach(coords => {
  const poly = turf.polygon([coords]);

  // Far North
  if (!DISABLE_FAR_NORTH_ALERTS && farNorthGeoJSON && turf.booleanIntersects(poly, farNorthGeoJSON)) {
    intersects = true;
    if (!matchedAreaNames.includes("Far North District")) {
      matchedAreaNames.push("Far North District");
    }
  }

  // Custom Areas
  const activeCustomLikeAreas = customGeoAreas.concat(linzGeoAreas);
  if ((SHOW_CUSTOM_GEOJSON_ALERTS || USE_LINZ_AREAS) && activeCustomLikeAreas.length) {
    for (let i = 0; i < activeCustomLikeAreas.length; i++) {
      const custom = activeCustomLikeAreas[i];
      if (turf.booleanIntersects(poly, custom.geojson)) {
        intersects = true;
        if (!matchedAreaNames.includes(custom.name)) {
          matchedAreaNames.push(custom.name);
        }
      }
    }
  }
});




      const now = new Date();
      let alertStatus = "";
      if (onset && expires) {
        const onsetTime = new Date(onset);
        const expiresTime = new Date(expires);
        if (now >= onsetTime && now <= expiresTime) {
          alertStatus = "active-now";
        } else if (now < onsetTime) {
          alertStatus = "upcoming";
        } else {
          alertStatus = "expired";
        }
      } else {
        alertStatus = "active-now"; // fallback
      }

      const isAllowedStatus =
        alertStatus === "active-now" ||
        alertStatus === "upcoming" ||
        (alertStatus === "expired" && SHOW_EXPIRED_ALERTS);

      const withinHourWindow = REQUIRE_ONSET_WITHIN_WINDOW
        ? isWithinHourWindow(onset, expires)
        : true;

      const includeByArea = isScopedAreaFilteringActive()
        ? intersects
        : (SHOW_NON_FAR_NORTH_ALERTS ? true : intersects);
      const qualifies = includeByArea && isAllowedStatus && withinHourWindow;

      matchedAreaNames.sort((a, b) => {
  const iA = AREA_DISPLAY_ORDER.indexOf(a);
  const iB = AREA_DISPLAY_ORDER.indexOf(b);
  return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB); // fallback to end if not found
});

//banner conect for the met service cap feed related alerts      
      const alertHTML = `
<div class="alert-card ${qualifies ? 'far-north' : ''} ${alertStatus} ${colourClass}">
  <b>${headline}</b><br>
  MetService has issued a weather alert that includes parts of ${formatAreaList(matchedAreaNames)}
  ${onset ? ` from ${formatReadableTime(onset)} ` : ''}
  ${expires ? `to ${formatReadableTime(expires)}</i>.<br>` : ''}   
  ${web ? `<a href="${web}" target="_blank">Visit MetService website for more information.</a><br>` : ''}
  <span class="badge alert-met">MetService</span>
  ${colourCode ? `<span class="badge ${colourClass}">${colourCode}</span>` : ''}
  ${alertStatus === 'upcoming' ? `<span class="badge upcoming-badge">Upcoming</span> ` : ''} 
  ${alertStatus === 'active-now' ? `<span class="badge active-badge">Active Now</span><br>` : ''}
  ${alertStatus === 'expired' ? `<span class="badge expired-badge">Expired</span>` : ''}
</div>`;

      if (qualifies) {
        combinedAlertList.push({ html: alertHTML, status: alertStatus, source: 'met', areas: matchedAreaNames }); // in fetchAlerts
      }
    }

    // STEP 2: Sort alerts: active-now > upcoming > expired
    const statusOrder = { "active-now": 1, "upcoming": 2, "expired": 3 };
    alertList.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    const floatingEl = document.getElementById("floating-alerts-container");
    const toggleBtn = document.getElementById("toggle-alerts-btn");

    if (alertList.length) {
      floatingEl.innerHTML = alertList.map(a => a.html).join("\n");
      toggleBtn.style.display = "flex";
    } else {
      floatingEl.innerHTML = "";
      toggleBtn.style.display = "none";
    }
    lastUpdatedTime = new Date().toISOString();
renderCombinedAlerts();
  } catch (err) {
    console.error(err);
  }
}

  
  //check civil denfence atom cap feed, check areas, make alerts html, sort
async function fetchCDAlerts() {
  if (!ENABLE_CD_ALERTS) return;

  try {
    const xmlText = await rwasFetchTextTracked("rwas.civil_defence.atom", CD_ALERT_ATOM_URL);
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const ns = "http://www.w3.org/2005/Atom";
    const entries = [...xml.getElementsByTagNameNS(ns, "entry")];

    const cdAlertList = [];

    for (const entry of entries) {
      const contentXML = entry.getElementsByTagNameNS(ns, "content")[0]?.textContent;
      if (!contentXML) continue;

      const capXML = new DOMParser().parseFromString(contentXML, "application/xml");
      const capNS = "urn:oasis:names:tc:emergency:cap:1.2";

      const getTag = (parent, tag) => parent.getElementsByTagNameNS(capNS, tag)[0]?.textContent || '';
      const info = capXML.getElementsByTagNameNS(capNS, "info")[0];
      if (!info) continue;

      const areaNodes = [...info.getElementsByTagNameNS(capNS, "area")];

      // Extract base CAP fields
      const identifier = getTag(capXML, "identifier");
      const sent = getTag(capXML, "sent");
      const status = getTag(capXML, "status");
      const msgType = getTag(capXML, "msgType");
      const scope = getTag(capXML, "scope");
      const senderName = getTag(info, "senderName");
      const headline = getTag(info, "headline");
      const effective = getTag(info, "effective");
      const expires = getTag(info, "expires");
      const urgency = getTag(info, "urgency");
      const severity = getTag(info, "severity");
      const certainty = getTag(info, "certainty");

      // Check time windows
      const now = new Date();
      const onsetTime = new Date(effective);
      const expiresTime = new Date(expires);
      let alertStatus = "";

      if (now >= onsetTime && now <= expiresTime) {
        alertStatus = "active-now";
      } else if (now < onsetTime) {
        alertStatus = "upcoming";
      } else {
        alertStatus = "expired";
      }

      const isAllowedStatus =
        alertStatus === "active-now" ||
        alertStatus === "upcoming" ||
        (alertStatus === "expired" && SHOW_EXPIRED_ALERTS);

    const withinHourWindow = REQUIRE_ONSET_WITHIN_WINDOW
      ? isWithinHourWindow(effective, expires)
      : true;

    let intersects = false;
let areaDesc = "";
let matchedAreaNames = [];
const geoCoords = [];

areaNodes.forEach(area => {
  const desc = area.getElementsByTagNameNS(capNS, "areaDesc")[0]?.textContent || '';
  const polyEls = [...area.getElementsByTagNameNS(capNS, "polygon")];

  areaDesc += desc + "; ";

  polyEls.forEach(p => {
    const coords = p.textContent.trim().split(" ").map(pair => {
      const [lat, lon] = pair.split(",").map(Number);
      return [lon, lat];
    });
    geoCoords.push(coords);
  });
});

geoCoords.forEach(coords => {
  const poly = turf.polygon([coords]);

  // Far North
  if (!DISABLE_FAR_NORTH_ALERTS && farNorthGeoJSON && turf.booleanIntersects(poly, farNorthGeoJSON)) {
    intersects = true;
    if (!matchedAreaNames.includes("Far North District")) {
      matchedAreaNames.push("Far North District");
    }
  }

  // Custom Areas
  const activeCustomLikeAreas = customGeoAreas.concat(linzGeoAreas);
  if ((SHOW_CUSTOM_GEOJSON_ALERTS || USE_LINZ_AREAS) && activeCustomLikeAreas.length) {
    for (let i = 0; i < activeCustomLikeAreas.length; i++) {
      const custom = activeCustomLikeAreas[i];
      if (turf.booleanIntersects(poly, custom.geojson)) {
        intersects = true;
        if (!matchedAreaNames.includes(custom.name)) {
          matchedAreaNames.push(custom.name);
        }
      }
    }
  }
});

      const isCancelled = msgType.toLowerCase() === "cancel";
const includeByArea = isScopedAreaFilteringActive()
  ? intersects
  : (SHOW_NON_FAR_NORTH_ALERTS ? true : intersects);
const qualifies =
  includeByArea &&
  isAllowedStatus &&
  withinHourWindow &&
  (!isCancelled || (isCancelled && SHOW_CANCELLED_CD_ALERTS));


      const formatNZTime = iso => {
        if (!iso) return '';
        const dt = new Date(iso);
        return dt.toLocaleString(RWAS_TIME_LOCALE, {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: RWAS_TIME_ZONE
        });
      };
      
      matchedAreaNames.sort((a, b) => {
  const iA = AREA_DISPLAY_ORDER.indexOf(a);
  const iB = AREA_DISPLAY_ORDER.indexOf(b);
  return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB); // fallback to end if not found
});


      const alertHTML = `
<div class="alert-card far-north alert-red ${alertStatus}">
  <b>${headline}</b><br>
  ${senderName} has issued an alert that covers parts of   ${formatAreaList(matchedAreaNames)} from ${formatNZTime(effective)}
  to ${formatNZTime(expires)}.<br>
  <b>Urgency:</b> ${urgency} <b>Severity:</b> ${severity}<br>
  <span class="badge alert-cd">Civil Defence</span>
  ${alertStatus === 'upcoming' ? `<span class="badge upcoming-badge">Upcoming</span>` : ''}
  ${alertStatus === 'active-now' ? `<span class="badge active-badge">Active Now</span>` : ''}
  ${alertStatus === 'expired' ? `<span class="badge expired-badge">Expired</span>` : ''}
${isCancelled ? `<span class="badge cancelled-badge">Cancelled</span><br>` : ''}
  <br><a href="https://www.civildefence.govt.nz/" target="_blank">Visit civildefence.govt.nz for more information</a>
</div>`;

      if (qualifies) {
        combinedAlertList.push({ html: alertHTML, status: alertStatus, source: 'cd', areas: matchedAreaNames }); // in fetchCDAlerts
      }
    }

    // Sort and render CD alerts
    const statusOrder = { "active-now": 1, "upcoming": 2, "expired": 3 };
    cdAlertList.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    const floatingEl = document.getElementById("floating-alerts-container");
    const toggleBtn = document.getElementById("toggle-alerts-btn");

    if (cdAlertList.length) {
      floatingEl.innerHTML += cdAlertList.map(a => a.html).join("\n");
      toggleBtn.style.display = "flex";
    }
    lastUpdatedTime = new Date().toISOString();
renderCombinedAlerts();
  } catch (err) {
    console.error("CD Alert fetch failed", err);
  }
}

function applyRegionWarningAreaConfigFromRuntime() {
  const cfg = (window.FNED_CONFIG && window.FNED_CONFIG.regionWarnings)
    ? window.FNED_CONFIG.regionWarnings
    : {};
  SHOW_EXPIRED_ALERTS = cfgBool(cfg.showExpiredAlerts, true);
  SHOW_NON_FAR_NORTH_ALERTS = cfgBool(cfg.showNonFarNorthAlerts, false);
  REQUIRE_ONSET_WITHIN_WINDOW = cfgBool(cfg.requireOnsetWithinWindow, true);
  HOUR_WINDOW = cfgNum(cfg.hourWindow, 24);
  proxy = cfgStr(cfg.proxy, cfgStr(RWAS_ENDPOINTS.proxyPrefix, "https://corsproxy.io/?"));
  SHOW_CUSTOM_GEOJSON_ALERTS = cfgBool(cfg.showCustomGeoJsonAlerts, false);
  USE_PROXY_FOR_CUSTOM_GEOJSON = cfgBool(cfg.useProxyForCustomGeoJson, true);
  USE_LINZ_AREAS = cfgBool(cfg.useLinzAreas, false);
  USE_PROXY_FOR_LINZ_AREAS = cfgBool(cfg.useProxyForLinzAreas, true);
  if (LINZ_FORCE_BUNDLED_SOURCE) {
    LINZ_SUBURB_LAYER_URL = DEFAULT_LINZ_WFS_LAYER_URL;
    LINZ_API_KEY = DEFAULT_LINZ_API_KEY;
    LINZ_API_KEY_PARAM = "api_key";
    LINZ_WFS_TYPENAME = DEFAULT_LINZ_WFS_TYPENAME;
  } else {
    LINZ_SUBURB_LAYER_URL = cfgStr(
      cfg.linzSuburbLayerUrl,
      DEFAULT_LINZ_WFS_LAYER_URL
    );
    LINZ_API_KEY = cfgStr(cfg.linzApiKey, DEFAULT_LINZ_API_KEY);
    LINZ_API_KEY_PARAM = cfgStr(cfg.linzApiKeyParam, "api_key");
    LINZ_WFS_TYPENAME = cfgStr(cfg.linzWfsTypeName, DEFAULT_LINZ_WFS_TYPENAME);
  }
  LINZ_SELECTED_AREAS = cfgStrArray(cfg.linzSelectedAreas, []);
  DISABLE_FAR_NORTH_ALERTS = cfgBool(cfg.disableFarNorthAlerts, false);
  CustomGeoAreas = cfgObj(cfg.customGeoAreas, DEFAULT_CUSTOM_GEO_AREAS);
  AREA_DISPLAY_ORDER = cfgStrArray(cfg.areaDisplayOrder, DEFAULT_AREA_DISPLAY_ORDER);
}

async function runRegionWarningCycle() {
  applyRegionWarningAreaConfigFromRuntime();
  const [farNorth, customAreas, selectedLinzAreas] = await Promise.all([
    loadFarNorthGeoJSON(),
    loadCustomGeoJSONAreas(),
    loadSelectedLinzGeoAreas()
  ]);
  farNorthGeoJSON = farNorth;
  customGeoAreas = customAreas;
  linzGeoAreas = selectedLinzAreas;
  window.FNED_RWAS_RUNTIME = {
    activeCustomAreaKeys: Object.keys(CustomGeoAreas),
    loadedCustomAreaNames: customGeoAreas.map(function (item) { return item.name; }),
    useLinzAreas: USE_LINZ_AREAS,
    useProxyForLinzAreas: USE_PROXY_FOR_LINZ_AREAS,
    linzForceBundledSource: LINZ_FORCE_BUNDLED_SOURCE,
    linzApiKeyConfigured: !!LINZ_API_KEY,
    linzApiKeyParam: LINZ_API_KEY_PARAM,
    linzLayerUrl: LINZ_SUBURB_LAYER_URL,
    linzWfsTypeName: LINZ_WFS_TYPENAME,
    selectedLinzAreas: LINZ_SELECTED_AREAS.slice(),
    loadedLinzAreaNames: linzGeoAreas.map(function (item) { return item.name; }),
    disableFarNorthAlerts: DISABLE_FAR_NORTH_ALERTS,
    showCustomGeoJsonAlerts: SHOW_CUSTOM_GEOJSON_ALERTS,
    areaDisplayOrder: AREA_DISPLAY_ORDER.slice()
  };
  window.FNED_ALERT_SCOPE_API = buildAlertScopeApi();
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fned:rwas-runtime-updated", {
      detail: window.FNED_RWAS_RUNTIME
    }));
  }
  combinedAlertList = [];
  await Promise.all([fetchCDAlerts(), fetchAlerts()]);
  renderCombinedAlerts();
}

window.FNED_REGION_WARNINGS_RELOAD = function () {
  return runRegionWarningCycle().catch(function (err) {
    console.error("RWAS reload failed", err);
  });
};

runRegionWarningCycle().catch(function (err) {
  console.error("RWAS initial load failed", err);
});

 async function loadCustomGeoJSONAreas() {
  const areas = [];

  for (const key in CustomGeoAreas) {
    const entry = CustomGeoAreas[key];

    if (typeof entry === "string") {
      try {
        const url = USE_PROXY_FOR_CUSTOM_GEOJSON ? proxy + encodeURIComponent(entry) : entry;
        const geojson = await rwasFetchJsonTracked("rwas.custom_geojson." + key, url);
        if (geojson.type === "FeatureCollection") {
          areas.push({ name: key, geojson });
        }
      } catch (e) {
        console.warn(`Failed to fetch custom GeoJSON for ${key}:`, e);
      }
    } else if (entry?.type === "FeatureCollection") {
      areas.push({ name: key, geojson: entry });
    }
  }

  return areas;
}

function publishRwasAlertSummary() {
  const weatherItems = combinedAlertList.filter(a => a && a.source === "met");
  const civilDefenceItems = combinedAlertList.filter(a => a && a.source === "cd");
  const summary = {
    totalCount: combinedAlertList.length,
    weatherCount: weatherItems.length,
    civilDefenceCount: civilDefenceItems.length,
    weatherItems: weatherItems,
    civilDefenceItems: civilDefenceItems,
    lastUpdatedTime: lastUpdatedTime || "",
    notation: "Source: Current Warnings And Alerts panel (RWAS)."
  };
  window.FNED_RWAS_ALERT_SUMMARY = summary;
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("fned:rwas-alerts-updated", { detail: summary }));
  }
}

  // Order: CD alerts first, then MetService â€” within each group, sort by status   
function renderCombinedAlerts() {
  const statusOrder = { "active-now": 1, "upcoming": 2, "expired": 3 };

  // Sort combined alerts so the most important show first
  combinedAlertList.sort((a, b) => {
    const aOrder = statusOrder[a.status] || 99;
    const bOrder = statusOrder[b.status] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.source || "").localeCompare(b.source || "");
  });

  const alertListEl = document.getElementById("alert-list");
  if (!alertListEl) {
    console.warn("Dashboard alert list element not found");
    return;
  }

  if (combinedAlertList.length) {
    // Build area label and meta text
    const allAreaMentions = combinedAlertList.flatMap(a => a.areas || []);
    const uniqueAreas = [...new Set(allAreaMentions.filter(Boolean))];
    const areaLabel = formatAreaList(uniqueAreas);
    const hasCDAlert = combinedAlertList.some(a => a.source === "cd");

    // Wrap each RWAS alert card in a list item so it fits the dashboard styling
    const cardsHTML = combinedAlertList
      .map(a => `<li class="alert-item">${a.html}</li>`)
      .join("\n");

    const metaHTML = `
      <li class="alert-list-meta">
        <small>
          Currently showing local warnings and alerts for ${areaLabel}.<br>
          ${isLinzFilteringDegraded() ? "LINZ areas are enabled but none loaded, so filtering has fallen back to base area scope.<br>" : ""}
          Last updated: ${formatReadableTime(lastUpdatedTime)}.<br>
          Source: Region Warnings And Alert System v${version}${hasCDAlert ? " including Civil Defence alerts" : ""}.
        </small>
      </li>`;

    alertListEl.innerHTML = cardsHTML + metaHTML;
  } else {
    alertListEl.innerHTML = `
      <li class="alert-list-meta">
        <small>No current region wide warnings detected. Check the map and tiles for any localised issues.</small>
      </li>`;
  }

  publishRwasAlertSummary();

  // Make sure the old popup UI stays empty and hidden
  const floatingEl = document.getElementById("floating-alerts-container");
  const toggleBtn = document.getElementById("toggle-alerts-btn");
  if (floatingEl) floatingEl.innerHTML = "";
  if (toggleBtn) toggleBtn.style.display = "none";
}



  function isStillActive(onsetText, expiresText) {
  const now = new Date();
  const onset = onsetText ? new Date(onsetText) : null;
  const expires = expiresText ? new Date(expiresText) : null;

  if (expires && now > expires) return false;
  if (onset && now < onset) return true;
  if (onset && expires) return now >= onset && now <= expires;
  if (expires) return now <= expires;

  return true;
}

  
 function isWithinHourWindow(onsetText, expiresText) {
  const now = new Date();
  const onset = onsetText ? new Date(onsetText) : null;
  const expires = expiresText ? new Date(expiresText) : null;
 
  if (onset && expires) {
    const isActive = now >= onset && now <= expires;
    const startsSoon = onset > now && (onset - now) / 1000 / 3600 <= HOUR_WINDOW;
    return isActive || startsSoon;
  }

  if (onset) {
    const diffHours = (onset - now) / 1000 / 3600;
    const inWindow = diffHours >= 0 && diffHours <= HOUR_WINDOW;
    return inWindow;
  }

  return false;
}

function formatAreaList(areaArray) {
  if (!areaArray || areaArray.length === 0) return "the alert region";
  if (areaArray.length === 1) return areaArray[0];
  if (areaArray.length === 2) return `${areaArray[0]} and ${areaArray[1]}`;
  return `${areaArray.slice(0, -1).join(", ")}, and ${areaArray[areaArray.length - 1]}`;
}

  document.getElementById("toggle-alerts-btn").addEventListener("click", () => {
    const el = document.getElementById("floating-alerts-container");
    el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
  });

