(function () {
  "use strict";

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function asString(value, fallback) {
    return isNonEmptyString(value) ? value.trim() : fallback;
  }

  function normalizeProxyPrefix(rawPrefix) {
    var prefix = asString(rawPrefix, "https://proxy.corsfix.com/?");
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

  function resolveConnection(mapCfg, key, defaultSource, defaultUseProxy, proxyPrefix) {
    var settings =
      mapCfg && mapCfg.connectionSettings && typeof mapCfg.connectionSettings === "object"
        ? mapCfg.connectionSettings
        : {};
    var conn =
      settings && settings[key] && typeof settings[key] === "object"
        ? settings[key]
        : {};
    var source = asString(conn.sourceUrl, defaultSource);
    var useProxy =
      typeof conn.useProxy === "boolean" ? conn.useProxy : !!defaultUseProxy;
    return {
      source: source,
      useProxy: useProxy,
      resolved: useProxy ? proxiedUrl(source, proxyPrefix) : source
    };
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
      asString(warningsCfg.proxy, asString(mapCfg.proxy, "https://proxy.corsfix.com/?"))
    );

    var emergencyBannersSource = "https://www.fndc.govt.nz/Apps/emergencybanners";
    var emergencyStoriesSource = "https://www.fndc.govt.nz/Apps/emergencystories";
    var waterOutagesSource =
      "https://www.fndc.govt.nz/services/water/Water-outage-updates/wateroutagesassetlistingfeed";

    var defaultTopEnergyOutagesSource = "https://outages.topenergy.co.nz/api/outages";
    var defaultTopEnergyRegionsSource = "https://outages.topenergy.co.nz/api/outages/regions";
    var defaultTopEnergyKmzSource = "https://outages.topenergy.co.nz/storage/kmz/polygonsActiveAll.kmz";
    var defaultNztaDelaysSource = "https://www.journeys.nzta.govt.nz/assets/map-data-cache/delays.json";
    var defaultLocalRoadClosuresSource =
      "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/public/public_closures_FNDC.json";
    var defaultCouncilAlertsSource = asString(
      cfg.customMessages && cfg.customMessages.url,
      "https://raw.githubusercontent.com/almokinsgov/FNDC_closures/main/fned_custom_messages_example.json"
    );

    var defaultGeonetEarthquakesSource =
      "https://wfs.geonet.org.nz/geonet/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geonet:quake_search_v1&outputFormat=json&cql_filter=depth%3C50+AND+origintime%3E=%272025-01-01%27+AND+DWITHIN(origin_geom,Point+(173.5+-35.2),140000,meters)";
    var defaultGeonetCapFeedSource =
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/Testing/GeoNet/quake-example.xml";

    var defaultMetServiceSource = asString(
      warningsCfg.metServiceSourceUrl,
      "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml"
    );
    var defaultCivilDefenceSource = asString(
      warningsCfg.civilDefenceAtomUrl,
      "https://www.civildefence.govt.nz/home/rss"
    );
    var connTopEnergyOutages = resolveConnection(mapCfg, "topEnergyOutages", defaultTopEnergyOutagesSource, true, proxyPrefix);
    var connTopEnergyRegions = resolveConnection(mapCfg, "topEnergyRegions", defaultTopEnergyRegionsSource, false, proxyPrefix);
    var connTopEnergyKmz = resolveConnection(mapCfg, "topEnergyKmz", defaultTopEnergyKmzSource, true, proxyPrefix);
    var connNztaDelays = resolveConnection(mapCfg, "nztaDelays", defaultNztaDelaysSource, true, proxyPrefix);
    var connLocalRoadClosures = resolveConnection(mapCfg, "localRoadClosures", defaultLocalRoadClosuresSource, true, proxyPrefix);
    var connCouncilAlerts = resolveConnection(mapCfg, "councilAlerts", defaultCouncilAlertsSource, false, proxyPrefix);
    var connGeonetEarthquakes = resolveConnection(mapCfg, "geonetEarthquakes", defaultGeonetEarthquakesSource, true, proxyPrefix);
    var connGeonetCapFeed = resolveConnection(mapCfg, "geonetCapFeed", defaultGeonetCapFeedSource, true, proxyPrefix);
    var connMetServiceAtom = resolveConnection(mapCfg, "metServiceAtom", defaultMetServiceSource, true, proxyPrefix);
    var connCivilDefenceAtom = resolveConnection(mapCfg, "civilDefenceAtom", defaultCivilDefenceSource, true, proxyPrefix);

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
        topEnergyOutagesSource: connTopEnergyOutages.source,
        topEnergyOutages: connTopEnergyOutages.resolved,
        topEnergyOutagesUseProxy: connTopEnergyOutages.useProxy,
        topEnergyRegionsSource: connTopEnergyRegions.source,
        topEnergyRegions: connTopEnergyRegions.resolved,
        topEnergyRegionsUseProxy: connTopEnergyRegions.useProxy,
        topEnergyKmzSource: connTopEnergyKmz.source,
        topEnergyKmz: connTopEnergyKmz.resolved,
        topEnergyKmzUseProxy: connTopEnergyKmz.useProxy,
        nztaDelaysSource: connNztaDelays.source,
        nztaDelays: connNztaDelays.resolved,
        nztaDelaysUseProxy: connNztaDelays.useProxy,
        localRoadClosuresSource: connLocalRoadClosures.source,
        localRoadClosures: connLocalRoadClosures.resolved,
        localRoadClosuresUseProxy: connLocalRoadClosures.useProxy,
        councilAlertsSource: connCouncilAlerts.source,
        councilAlerts: connCouncilAlerts.resolved,
        councilAlertsUseProxy: connCouncilAlerts.useProxy,
        geonetEarthquakesSource: connGeonetEarthquakes.source,
        geonetEarthquakes: connGeonetEarthquakes.resolved,
        geonetEarthquakesUseProxy: connGeonetEarthquakes.useProxy,
        geonetCapFeedSource: connGeonetCapFeed.source,
        geonetCapFeed: connGeonetCapFeed.resolved,
        geonetCapFeedUseProxy: connGeonetCapFeed.useProxy,
        metServiceAtomSource: connMetServiceAtom.source,
        metServiceAtom: connMetServiceAtom.resolved,
        metServiceAtomUseProxy: connMetServiceAtom.useProxy,
        civilDefenceAtomSource: connCivilDefenceAtom.source,
        civilDefenceAtom: connCivilDefenceAtom.resolved,
        civilDefenceAtomUseProxy: connCivilDefenceAtom.useProxy
      },
      regionWarnings: {
        proxyPrefix: proxyPrefix,
        metServiceSourceUrl: connMetServiceAtom.source,
        metServiceAtom: connMetServiceAtom.resolved,
        civilDefenceSourceUrl: connCivilDefenceAtom.source,
        civilDefenceAtom: connCivilDefenceAtom.resolved
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
