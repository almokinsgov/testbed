(function () {
  "use strict";

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function asString(value, fallback) {
    return isNonEmptyString(value) ? value.trim() : fallback;
  }

  function normalizeProxyPrefix(rawPrefix) {
    var prefix = asString(rawPrefix, "https://corsproxy.io/?url=");
    var lowerPrefix = prefix.toLowerCase();

    if (lowerPrefix.indexOf("url=") >= 0) {
      return prefix;
    }

    var lastChar = prefix.charAt(prefix.length - 1);
    if (lastChar === "?" || lastChar === "&" || lastChar === "=") {
      return prefix;
    }

    if (prefix.indexOf("?") >= 0) {
      return prefix + "&url=";
    }

    return prefix + "?url=";
  }

  function proxiedUrl(url, proxyPrefix) {
    return normalizeProxyPrefix(proxyPrefix) + encodeURIComponent(String(url || ""));
  }

  function getHost(locationObj) {
    if (!locationObj || !isNonEmptyString(locationObj.hostname)) {
      return "";
    }
    return locationObj.hostname.toLowerCase();
  }

  function isFndcHost(locationObj) {
    var host = getHost(locationObj);
    return host === "www.fndc.govt.nz" || host.indexOf(".fndc.govt.nz") >= 0;
  }

  function resolve(runtimeConfig, locationObj) {
    var cfg = runtimeConfig && typeof runtimeConfig === "object" ? runtimeConfig : {};
    var mapCfg = cfg.map && typeof cfg.map === "object" ? cfg.map : {};
    var warningsCfg =
      cfg.regionWarnings && typeof cfg.regionWarnings === "object"
        ? cfg.regionWarnings
        : {};

    var proxyPrefix = normalizeProxyPrefix(
      asString(warningsCfg.proxy, asString(mapCfg.proxy, "https://corsproxy.io/?url="))
    );

    var emergencyBannersSource = "https://www.fndc.govt.nz/Apps/emergencybanners";
    var emergencyStoriesSource = "https://www.fndc.govt.nz/Apps/emergencystories";
    var waterOutagesSource =
      "https://www.fndc.govt.nz/services/water/Water-outage-updates/wateroutagesassetlistingfeed";

    var topEnergyOutagesSource = "https://outages.topenergy.co.nz/api/outages";
    var topEnergyRegionsSource = "https://outages.topenergy.co.nz/api/outages/regions";
    var topEnergyKmzSource = "https://outages.topenergy.co.nz/storage/kmz/polygonsActiveAll.kmz";
    var nztaDelaysSource = "https://www.journeys.nzta.govt.nz/assets/map-data-cache/delays.json";
    var localRoadClosuresSource =
      "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/public/public_closures_FNDC.json";

    var geonetEarthquakesSource =
      "https://wfs.geonet.org.nz/geonet/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonet:quake_search_v1&outputFormat=json&cql_filter=depth%3C50+AND+origintime%3E=%272025-01-01%27+AND+DWITHIN(origin_geom,Point+(173.5+-35.2),140000,meters)";
    var geonetCapFeedSource =
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/GeoNet/quake-example.xml";

    var metServiceSource = asString(
      warningsCfg.metServiceSourceUrl,
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml"
    );
    var civilDefenceSource = asString(
      warningsCfg.civilDefenceAtomUrl,
      "https://www.civildefence.govt.nz/home/rss"
    );

    return {
      meta: {
        proxyPrefix: proxyPrefix
      },
      summary: {
        emergencyBannersSource: emergencyBannersSource,
        emergencyBanners: isFndcHost(locationObj)
          ? emergencyBannersSource
          : proxiedUrl(emergencyBannersSource, proxyPrefix),
        emergencyStoriesSource: emergencyStoriesSource,
        emergencyStories: proxiedUrl(emergencyStoriesSource, proxyPrefix),
        waterOutagesSource: waterOutagesSource,
        waterOutages: proxiedUrl(waterOutagesSource, proxyPrefix)
      },
      map: {
        topEnergyOutagesSource: topEnergyOutagesSource,
        topEnergyOutages: proxiedUrl(topEnergyOutagesSource, proxyPrefix),
        topEnergyRegionsSource: topEnergyRegionsSource,
        topEnergyRegions: topEnergyRegionsSource,
        topEnergyKmzSource: topEnergyKmzSource,
        topEnergyKmz: proxiedUrl(topEnergyKmzSource, proxyPrefix),
        nztaDelaysSource: nztaDelaysSource,
        nztaDelays: proxiedUrl(nztaDelaysSource, proxyPrefix),
        localRoadClosuresSource: localRoadClosuresSource,
        localRoadClosures: proxiedUrl(localRoadClosuresSource, proxyPrefix),
        geonetEarthquakesSource: geonetEarthquakesSource,
        geonetEarthquakes: proxiedUrl(geonetEarthquakesSource, proxyPrefix),
        geonetCapFeedSource: geonetCapFeedSource,
        geonetCapFeed: proxiedUrl(geonetCapFeedSource, proxyPrefix)
      },
      regionWarnings: {
        proxyPrefix: proxyPrefix,
        metServiceSourceUrl: metServiceSource,
        metServiceAtom: proxiedUrl(metServiceSource, proxyPrefix),
        civilDefenceSourceUrl: civilDefenceSource,
        civilDefenceAtom: proxiedUrl(civilDefenceSource, proxyPrefix)
      }
    };
  }

  var api = {
    resolve: resolve,
    proxiedUrl: proxiedUrl,
    normalizeProxyPrefix: normalizeProxyPrefix,
    getSummaryEndpoints: function (runtimeConfig, locationObj) {
      return resolve(runtimeConfig, locationObj).summary;
    },
    getMapEndpoints: function (runtimeConfig, locationObj) {
      return resolve(runtimeConfig, locationObj).map;
    },
    getRegionWarningEndpoints: function (runtimeConfig, locationObj) {
      return resolve(runtimeConfig, locationObj).regionWarnings;
    }
  };

  window.FNED_ENDPOINTS_API = api;
})();
