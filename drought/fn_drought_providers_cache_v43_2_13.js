/***********************
     * Helpers
     ***********************/
    const $ = (id) => document.getElementById(id);

    function setStatus(text){
      $("statusText").textContent = text;
    }

    function showToast(msg){
      const t = $("toast");
      t.textContent = msg;
      t.style.display = "block";
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => t.style.display = "none", 5500);
    }

    function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

    function getSnapshotMinLookbackDays(){
      const raw = Number(appSettings?.general?.snapshotMinLookbackDays);
      const n = Number.isFinite(raw) ? raw : 30;
      return clamp(n, 7, 120);
    }


    // Maps a value to dryness [0..1], where low rain -> high dryness
    function normalizeInverse(val, wet, dry){
      if (val == null || isNaN(val)) return null;
      if (wet === dry) return 0.5;
      const t = (val - dry) / (wet - dry);
      return clamp(1 - t, 0, 1);
    }

    // Maps a value to dryness [0..1], where high val -> high dryness
    function normalize(val, low, high){
      if (val == null || isNaN(val)) return null;
      if (high === low) return 0.5;
      const t = (val - low) / (high - low);
      return clamp(t, 0, 1);
    }

    function median(arr){
      const a = arr.slice().sort((x,y) => x-y);
      const mid = Math.floor(a.length/2);
      return a.length % 2 ? a[mid] : (a[mid-1] + a[mid]) / 2;
    }

    function fmt(n, digits=0){
      if (n == null || isNaN(n)) return "-";
      return Number(n).toFixed(digits);
    }

    function categoryForIndex(idx){
      if (idx == null || isNaN(idx)) return { name: "No Data", color: "rgba(255,255,255,0.35)" };
      if (idx >= 94) return { name: "Extreme", color: "var(--extreme)" };
      if (idx >= 79) return { name: "Severe", color: "var(--severe)" };
      if (idx >= 64) return { name: "Warning", color: "var(--warn)" };
      if (idx >= 49) return { name: "Watch", color: "var(--watch)" };
      return { name: "Normal", color: "var(--ok)" };
    }

    function parseLocalDateTime(isoLike){
      // Open-Meteo uses local timestamps when timezone=... is set.
      // Many values look like "2026-01-04T00:00" without offset, which JS treats as local time.
      return new Date(isoLike);
    }

    function dayKeyFromIso(isoDateTime){
      // Works for both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM"
      return isoDateTime.slice(0, 10);
    }

    function nowLocal(){
      return new Date();
    }

    

const STORAGE_KEY_TIMEMODE = "fndi_timeMode";
const STORAGE_KEY_ASOF = "fndi_asOf";

const STORAGE_KEY_RANGE_START = "fndi_rangeStart";
const STORAGE_KEY_RANGE_END = "fndi_rangeEnd";
const STORAGE_KEY_PLAY_STEP = "fndi_playStepMin";
const STORAGE_KEY_PLAY_SPEED = "fndi_playSpeedMs";
const STORAGE_KEY_PLAY_LOOP = "fndi_playLoop";
const STORAGE_KEY_PLAY_HYDRO = "fndi_playHydro";

let historicRangeStart = null; // Date
let historicRangeEnd = null;   // Date

let historicUseRange = false; // true when Range Mode has been loaded

const playbackState = {
  isPlaying: false,
  timer: null,
  stepMinutes: 1440,
  speedMs: 900,
  loop: true,
  hydro: false,
  lastHydroAt: null
};


let timeMode = "live"; // "live" | "historic"
let asOfSnapshot = null;
let pendingAsOfStr = null; // UI-selected historic datetime that is not yet loaded

// Raw dataset cache, used for snapshot recompute without refetching
const dataCache = {
  wxList: null,
  floodList: null,
  riverSites: null,
  gwSites: null,
  riverForLoc: null,
  gwForLoc: null,
  loadedAt: null,
  rangeMin: null,
  rangeMax: null,
  pastDays: null,
  forecastDays: null,
  locationsSig: null
};

function getRiverIndexOverrideForLocationIndex_(i){
  try{
    if (!droughtConfig || !droughtConfig.useRiverHybridForIndex) return null;
    const arr = (typeof dataCache !== "undefined" && dataCache) ? dataCache.riverHybridForLoc : null;
    if (!Array.isArray(arr) || !arr.length) return null;
    const r = arr[i];
    if (!r || r.ok !== true) return null;
    const daily = r.hybridDaily;
    if (!daily || !Array.isArray(daily.dates) || !Array.isArray(daily.values) || !daily.dates.length) return null;

    const source = (String(r.quality || "").toLowerCase().includes("nrc")) ? "NRC" : "Hybrid";
    return {
      dates: daily.dates,
      values: daily.values,
      source,
      meta: {
        quality: r.quality || null,
        siteName: r.siteName || null,
        flowUnitsNorm: r.flowUnitsNorm || null,
        flowUnitsRaw: r.flowUnitsRaw || null,
        flowUnits: (r.flowUnitsNorm || r.flowUnitsRaw || null),
        nrcToM3: (r.nrcToM3 == null ? null : r.nrcToM3),
        scale: (r.scale == null ? null : r.scale),
        corr: (r.corr == null ? null : r.corr),
        pairs: (r.pairs == null ? null : r.pairs)
      }
    };
  }catch(e){
    return null;
  }
}

function pad2(n){ return String(n).padStart(2, "0"); }


function ymdLocal(d){
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function ymdhLocal(d){
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}`;
}

function fingerprintLocations(locs){
  if (!Array.isArray(locs)) return "";
  return locs.map(l => {
    const id = (l && (l.id != null ? l.id : (l.name != null ? l.name : ""))) + "";
    const lat = (l && typeof l.lat === "number") ? l.lat.toFixed(6) : String((l && l.lat != null) ? l.lat : "");
    const lon = (l && typeof l.lon === "number") ? l.lon.toFixed(6) : String((l && l.lon != null) ? l.lon : "");
    return `${id}:${lat},${lon}`;
  }).join("|");
}

function ensureCacheLocationsSig(){
  if (!dataCache.locationsSig && Array.isArray(locations) && locations.length){
    dataCache.locationsSig = fingerprintLocations(locations);
  }
}

function cacheMatchesCurrentLocations(){
  if (!Array.isArray(locations) || !locations.length) return false;
  if (dataCache.locationsSig){
    return dataCache.locationsSig === fingerprintLocations(locations);
  }
  // Backward compatibility for older bundles without locationsSig
  return Array.isArray(dataCache.wxList) && dataCache.wxList.length === locations.length;
}


function formatWhenNZ(dateLike){
  const d = dateLike instanceof Date ? dateLike : new Date(String(dateLike).replace(" ", "T"));
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const dd = pad2(d.getDate());
  const mon = d.toLocaleString("en-NZ", {month: "short"});
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd} ${mon} ${yy}`;
}

function formatDateTimeLocal(date){
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseDateTimeLocal(value){
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function getAsOfDate(){
  if (timeMode === "historic" && asOfSnapshot instanceof Date && !isNaN(asOfSnapshot.getTime())){
    return asOfSnapshot;
  }
  return nowLocal();
}
function updateTimeControls(){
  const sel = document.getElementById("timeMode");
  const inp = document.getElementById("asOfInput");
  const btnSnap = document.getElementById("btnLoadSnapshot");
  if (!sel || !inp) return;

  sel.value = timeMode;

  if (timeMode === "historic"){

    inp.disabled = false;

    // Do not overwrite what the user has selected in the picker until they explicitly load it.
    if (pendingAsOfStr == null || pendingAsOfStr === ""){
      pendingAsOfStr = formatDateTimeLocal(getAsOfDate());
    }
    inp.value = pendingAsOfStr;

    if (btnSnap){
      btnSnap.style.display = "";
      btnSnap.disabled = !parseDateTimeLocal(inp.value);
    }
  } else {
    inp.disabled = true;
    if (btnSnap) btnSnap.style.display = "none";
  }

  showPlaybackPanel(timeMode === "historic");
  if (timeMode === "historic"){
    syncPlaybackInputs();
    updatePlaybackSlider();
  }
}

function updateTimeInputMinMax(){
  const inp = document.getElementById("asOfInput");
  if (!inp) return;
  // Historic mode should allow any date and time, so do not constrain min or max.
  inp.min = "";
  inp.max = "";
}
function clampAsOfToRange(){
  if (timeMode !== "historic") return;
  if (!(asOfSnapshot instanceof Date) || isNaN(asOfSnapshot.getTime())) return;

  const now = nowLocal();
  if (asOfSnapshot > now) asOfSnapshot = new Date(now.getTime());

  localStorage.setItem(STORAGE_KEY_ASOF, asOfSnapshot.toISOString());
  pendingAsOfStr = formatDateTimeLocal(asOfSnapshot);
  updateTimeControls();
}
function deriveWxRange(wx){
  const t = wx?.hourly?.time;
  if (Array.isArray(t) && t.length){
    const min = parseLocalDateTime(t[0]);
    const max = parseLocalDateTime(t[t.length - 1]);
    if (!isNaN(min.getTime()) && !isNaN(max.getTime())){
      return { min, max };
    }
  }
  const d = wx?.daily?.time;
  if (Array.isArray(d) && d.length){
    const min = parseLocalDateTime(d[0] + "T00:00");
    const max = parseLocalDateTime(d[d.length - 1] + "T23:00");
    if (!isNaN(min.getTime()) && !isNaN(max.getTime())){
      return { min, max };
    }
  }
  return { min: null, max: null };
}

function sliceDailyToWindow(dates, values, endDate, daysBack){
  if (!Array.isArray(dates) || !Array.isArray(values) || !dates.length) return [];
  const endKey = endDate.toISOString().slice(0,10);
  let endIdx = -1;
  for (let i=0;i<dates.length;i++){
    if (dates[i] <= endKey) endIdx = i;
  }
  if (endIdx < 0) return [];
  const startIdx = Math.max(0, endIdx - (daysBack - 1));
  return values.slice(startIdx, endIdx + 1);
}

function sliceDailyToWindowSeries(dates, values, endDate, daysBack){
  if (!Array.isArray(dates) || !Array.isArray(values) || !dates.length) return { dates: [], values: [] };
  const endKey = endDate.toISOString().slice(0,10);
  let endIdx = -1;
  for (let i=0;i<dates.length;i++){
    if (dates[i] <= endKey) endIdx = i;
  }
  if (endIdx < 0) return { dates: [], values: [] };
  const startIdx = Math.max(0, endIdx - (daysBack - 1));
  return { dates: dates.slice(startIdx, endIdx + 1), values: values.slice(startIdx, endIdx + 1) };
}



// Per-location index trend (delta over a fixed lookback window), used in the Locations table.
// Uses the District Trend step (hour/day) if set, else defaults to daily.
function computeIndexTrendForLocation(wx, flood, asOf, currentScore, riverOverride){
  try{
    const step = (localStorage.getItem("fndi_district_trend_step_v1") === "hour") ? "hour" : "day";
    const label = (step === "hour") ? "72h" : "7d";
    const ms = (step === "hour") ? (72 * 3600000) : (7 * 24 * 3600000);

    let base = new Date(asOf.getTime() - ms);
    const rangeMin = (dataCache && dataCache.rangeMin) ? new Date(dataCache.rangeMin) : null;
    if (rangeMin && base < rangeMin) base = rangeMin;

    const baseIdx = computeLocationIndex(wx, flood, base, riverOverride);
    const baseScore = baseIdx ? baseIdx.score : null;

    if (currentScore == null || baseScore == null || isNaN(currentScore) || isNaN(baseScore)){
      return { step, label, baseISO: base.toISOString(), baseScore, currentScore, delta: null };
    }

    return {
      step,
      label,
      baseISO: base.toISOString(),
      baseScore,
      currentScore,
      delta: (currentScore - baseScore)
    };
  }catch(_e){
    return { step: "day", label: "7d", baseISO: null, baseScore: null, currentScore: currentScore ?? null, delta: null };
  }
}

function recomputeFromCache(){
  if (!Array.isArray(locations) || !locations.length) return;
  if (!dataCache.wxList || !dataCache.wxList.length) return;

  const asOf = getAsOfDate();

  if (dataCache.rangeMin && asOf < dataCache.rangeMin){
    showToast("Snapshot is before the loaded data range. Increase Past Days then refresh.");
    return;
  }
  if (dataCache.rangeMax && asOf > dataCache.rangeMax){
    showToast("Snapshot is after the loaded data range. Increase Forecast Days then refresh.");
    return;
  }

  computed = locations.map((loc, i) => {
    const wx = dataCache.wxList[i];
    const flood = dataCache.floodList ? dataCache.floodList[i] : null;
    const riverGauge = dataCache.riverForLoc ? dataCache.riverForLoc[i] : null;
    const gwGauge = dataCache.gwForLoc ? dataCache.gwForLoc[i] : null;

    const riverOverride = getRiverIndexOverrideForLocationIndex_(i);
    const index = computeLocationIndex(wx, flood, asOf, riverOverride);

    const indexTrend = computeIndexTrendForLocation(wx, flood, asOf, index ? index.score : null, riverOverride);

    const soil9 = wx?.hourly?.soil_moisture_9_27cm
      ? lastHourlyAtOrBeforeNow(wx.hourly.time, wx.hourly.soil_moisture_9_27cm, asOf)
      : null;
    const soil27 = wx?.hourly?.soil_moisture_27_81cm
      ? lastHourlyAtOrBeforeNow(wx.hourly.time, wx.hourly.soil_moisture_27_81cm, asOf)
      : null;

    const dailySeries = computeDailySeries(wx);

    const plumeNow = computeTropicalPlumeSignal(wx, asOf);
    const plumeSeries = computePlumeDailySeriesForLocation(wx, asOf, 14);

    return { loc, index, indexTrend, riverGauge, gwGauge, soil9_27: soil9, soil27_81: soil27, dailySeries, plumeNow, plumeSeries };
  });

  computed.sort((a,b) => (b.index.score ?? -1) - (a.index.score ?? -1));

  renderDistrictKPIs();
  renderTable();
  renderMarkers();

  const loaded = dataCache.loadedAt instanceof Date ? dataCache.loadedAt : new Date();
  if (timeMode === "historic"){
    document.getElementById("lastUpdated").textContent =
      "As of " + asOf.toLocaleString("en-NZ", { hour12: false }) +
      " (Data loaded " + loaded.toLocaleString("en-NZ", { hour12: false }) + ")";
  } else {
    document.getElementById("lastUpdated").textContent =
      "Updated " + loaded.toLocaleString("en-NZ", { hour12: false });
  }

  document.getElementById("tableHint").textContent = "Click a row for details";

  const remembered = localStorage.getItem(STORAGE_KEY_LASTSEL);
  const preferred = selectedId && computed.some(r => r.loc.id === selectedId) ? selectedId :
    (remembered && computed.some(r => r.loc.id === remembered) ? remembered : (computed[0]?.loc.id ?? null));
  if (preferred) selectLocation(preferred, false);

  updateDistrictClimatePanel(asOf);
  ensureClimateDriversFetched();
  applyClimateDriversToUi();
  scheduleDistrictTrendBuild();

  // Text Summary module: refresh if visible
  try{
    if (typeof renderTextSummaryPanel_ === "function") renderTextSummaryPanel_();
  }catch(_e){}
}
function sumDailyWindow(dailyTime, dailyVals, endDate, daysBack){
      if (!dailyTime || !dailyVals) return null;
      const endKey = endDate.toISOString().slice(0,10);

      let endIdx = -1;
      for (let i=0;i<dailyTime.length;i++){
        const k = dailyTime[i];
        if (k <= endKey) endIdx = i;
      }
      if (endIdx < 0) return null;

      const startIdx = Math.max(0, endIdx - (daysBack - 1));
      let sum = 0;
      for (let i=startIdx;i<=endIdx;i++){
        const v = dailyVals[i];
        if (v != null && !isNaN(v)) sum += v;
      }
      return sum;
    }

    function sumDailyFuture(dailyTime, dailyVals, startDate, daysForward){
      if (!dailyTime || !dailyVals) return null;
      const startKey = startDate.toISOString().slice(0,10);
      let startIdx = -1;

      for (let i=0;i<dailyTime.length;i++){
        if (dailyTime[i] > startKey){
          startIdx = i;
          break;
        }
      }
      if (startIdx < 0) return null;

      const endIdx = Math.min(dailyTime.length - 1, startIdx + (daysForward - 1));
      let sum = 0;
      for (let i=startIdx;i<=endIdx;i++){
        const v = dailyVals[i];
        if (v != null && !isNaN(v)) sum += v;
      }
      return sum;
    }

    function meanHourlyWindow(hourlyTime, hourlyVals, endDate, daysBack){
      if (!hourlyTime || !hourlyVals) return null;
      const endMs = endDate.getTime();
      const startMs = endMs - daysBack * 24 * 3600 * 1000;

      let sum = 0;
      let n = 0;
      for (let i=0;i<hourlyTime.length;i++){
        const t = parseLocalDateTime(hourlyTime[i]).getTime();
        if (t >= startMs && t <= endMs){
          const v = hourlyVals[i];
          if (v != null && !isNaN(v)){
            sum += v;
            n++;
          }
        }
      }
      return n ? sum / n : null;
    }

    function meanHourlyFuture(hourlyTime, hourlyVals, startDate, daysForward, filterFn=null){
      if (!hourlyTime || !hourlyVals) return null;
      const startMs = startDate.getTime();
      const endMs = startMs + daysForward * 24 * 3600 * 1000;

      let sum = 0;
      let n = 0;
      for (let i=0;i<hourlyTime.length;i++){
        const dt = parseLocalDateTime(hourlyTime[i]);
        const t = dt.getTime();
        if (t > startMs && t <= endMs){
          if (filterFn && !filterFn(dt)) continue;
          const v = hourlyVals[i];
          if (v != null && !isNaN(v)){
            sum += v;
            n++;
          }
        }
      }
      return n ? sum / n : null;
    }

    function lastHourlyAtOrBeforeNow(hourlyTime, hourlyVals, nowDate){
      if (!hourlyTime || !hourlyVals) return null;
      const nowMs = nowDate.getTime();
      let last = null;
      for (let i=0;i<hourlyTime.length;i++){
        const t = parseLocalDateTime(hourlyTime[i]).getTime();
        if (t <= nowMs){
          const v = hourlyVals[i];
          if (v != null && !isNaN(v)) last = v;
        }
      }
      return last;
    }

    function minMaxHourlyWindow(hourlyTime, hourlyVals, endDate, daysBack){
      if (!hourlyTime || !hourlyVals) return { min: null, max: null };
      const endMs = endDate.getTime();
      const startMs = endMs - daysBack * 24 * 3600 * 1000;

      let min = Infinity;
      let max = -Infinity;
      let found = false;

      for (let i=0;i<hourlyTime.length;i++){
        const t = parseLocalDateTime(hourlyTime[i]).getTime();
        if (t >= startMs && t <= endMs){
          const v = hourlyVals[i];
          if (v != null && !isNaN(v)){
            found = true;
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        }
      }
      return found ? { min, max } : { min: null, max: null };
    }

    function safeJsonParse(text){
      try { return JSON.parse(text); } catch { return null; }
    }

    function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

/***********************
 * Export / Import Data Bundles
 * Lets you download all loaded datasets (including large arrays) and reload later without re-fetching providers.
 ***********************/
const EXPORT_BUNDLE_SCHEMA = 1;

function safeDateFromIso(s){
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function serialiseDataCache(){
  return {
    wxList: dataCache.wxList,
    floodList: dataCache.floodList,
    riverSites: dataCache.riverSites,
    gwSites: dataCache.gwSites,
    riverForLoc: dataCache.riverForLoc,
    gwForLoc: dataCache.gwForLoc,
    loadedAt: (dataCache.loadedAt instanceof Date) ? dataCache.loadedAt.toISOString() : (dataCache.loadedAt ? String(dataCache.loadedAt) : null),
    rangeMin: (dataCache.rangeMin instanceof Date) ? dataCache.rangeMin.toISOString() : (dataCache.rangeMin ? String(dataCache.rangeMin) : null),
    rangeMax: (dataCache.rangeMax instanceof Date) ? dataCache.rangeMax.toISOString() : (dataCache.rangeMax ? String(dataCache.rangeMax) : null),
    pastDays: dataCache.pastDays,
    forecastDays: dataCache.forecastDays,
	    locationsSig: dataCache.locationsSig || null,
	    riverHybridForLoc: dataCache.riverHybridForLoc || null,
	    riverHybridAsOfKey: dataCache.riverHybridAsOfKey || null,
};
}

function restoreDataCache(serial){
  const s = serial || {};
  dataCache.wxList = s.wxList || null;
  dataCache.floodList = s.floodList || null;
  dataCache.riverSites = s.riverSites || null;
  dataCache.gwSites = s.gwSites || null;
  dataCache.riverForLoc = s.riverForLoc || null;
  dataCache.gwForLoc = s.gwForLoc || null;
  dataCache.loadedAt = safeDateFromIso(s.loadedAt) || null;
  dataCache.rangeMin = safeDateFromIso(s.rangeMin) || null;
  dataCache.rangeMax = safeDateFromIso(s.rangeMax) || null;
  dataCache.pastDays = (s.pastDays != null) ? s.pastDays : null;
  dataCache.forecastDays = (s.forecastDays != null) ? s.forecastDays : null;
  dataCache.locationsSig = s.locationsSig || null;
	  // Optional derived caches (used for offline continuity)
	  dataCache.riverHybridForLoc = s.riverHybridForLoc || null;
	  dataCache.riverHybridAsOfKey = s.riverHybridAsOfKey || null;
}



/***********************
 * Export Helpers: Cache Serialization
 ***********************/
function serialiseMapToArray_(map){
  const out = [];
  try{
    if (!map || typeof map.entries !== "function") return out;
    for (const [k,v] of map.entries()){
      out.push([k, v]);
    }
  }catch(_e){}
  return out;
}

function restoreMapFromArray_(map, arr){
  try{
    if (!map || typeof map.set !== "function") return;
    if (typeof map.clear === "function") map.clear();
    if (!Array.isArray(arr)) return;
    for (const pair of arr){
      if (!pair || !Array.isArray(pair) || pair.length < 2) continue;
      map.set(pair[0], pair[1]);
    }
  }catch(_e){}
}

function serialiseHilltopRangeCache_(){
  const out = [];
  try{
    if (!hilltopRangeCache || typeof hilltopRangeCache.entries !== "function") return out;
    for (const [k, ent] of hilltopRangeCache.entries()){
      if (!ent) continue;
      // Strip inflight promises or transient fields
      out.push([k, {
        dataFromMs: ent.dataFromMs,
        dataToMs: ent.dataToMs,
        coverFromMs: ent.coverFromMs,
        coverToMs: ent.coverToMs,
        coveredAtMs: ent.coveredAtMs,
        series: ent.series || null
      }]);
    }
  }catch(_e){}
  return out;
}

function restoreHilltopRangeCache_(arr){
  try{
    if (!hilltopRangeCache || typeof hilltopRangeCache.set !== "function") return;
    if (typeof hilltopRangeCache.clear === "function") hilltopRangeCache.clear();
    if (!Array.isArray(arr)) return;
    for (const pair of arr){
      if (!pair || !Array.isArray(pair) || pair.length < 2) continue;
      const k = String(pair[0]);
      const ent = pair[1] || {};
      const clean = {
        dataFromMs: (isFinite(ent.dataFromMs) ? ent.dataFromMs : Infinity),
        dataToMs: (isFinite(ent.dataToMs) ? ent.dataToMs : -Infinity),
        coverFromMs: (isFinite(ent.coverFromMs) ? ent.coverFromMs : Infinity),
        coverToMs: (isFinite(ent.coverToMs) ? ent.coverToMs : -Infinity),
        coveredAtMs: (isFinite(ent.coveredAtMs) ? ent.coveredAtMs : 0),
        series: ent.series || null,
        inflight: null
      };
      hilltopRangeCache.set(k, clean);
    }
  }catch(_e){}
}

function serialiseNrcHybridCache_(){
  try{
    if (typeof _NRC_HYBRID_DISCHARGE_CACHE_ !== "undefined" && _NRC_HYBRID_DISCHARGE_CACHE_){
      return serialiseMapToArray_(_NRC_HYBRID_DISCHARGE_CACHE_);
    }
  }catch(_e){}
  return [];
}

function restoreNrcHybridCache_(arr){
  try{
    if (typeof _NRC_HYBRID_DISCHARGE_CACHE_ !== "undefined" && _NRC_HYBRID_DISCHARGE_CACHE_){
      restoreMapFromArray_(_NRC_HYBRID_DISCHARGE_CACHE_, arr);
    }
  }catch(_e){}


function serialiseDistrictHydroReadingsCache_(){
  const out = [];
  try{
    if (typeof districtHydroReadingsCache === "undefined" || !districtHydroReadingsCache) return out;
    if (typeof districtHydroReadingsCache.entries !== "function") return out;
    for (const [k, v] of districtHydroReadingsCache.entries()){
      if (!v){ out.push([k, v]); continue; }
      const meanArr = [];
      try{
        if (v.meanMap && typeof v.meanMap.entries === "function"){
          for (const [dk, dv] of v.meanMap.entries()){
            meanArr.push([dk, dv]);
          }
        }
      }catch(_e){}
      out.push([k, { unit: v.unit || "", meanArr }]);
    }
  }catch(_e){}
  return out;
}

function restoreDistrictHydroReadingsCache_(arr){
  try{
    if (typeof districtHydroReadingsCache === "undefined" || !districtHydroReadingsCache) return;
    if (typeof districtHydroReadingsCache.clear === "function") districtHydroReadingsCache.clear();
    if (!Array.isArray(arr)) return;
    for (const pair of arr){
      if (!pair || !Array.isArray(pair) || pair.length < 2) continue;
      const k = pair[0];
      const v = pair[1] || null;
      if (v && typeof v === "object" && Array.isArray(v.meanArr)){
        const m = new Map();
        for (const item of v.meanArr){
          if (!item || !Array.isArray(item) || item.length < 2) continue;
          m.set(item[0], item[1]);
        }
        districtHydroReadingsCache.set(k, { unit: v.unit || "", meanMap: m });
      }else{
        districtHydroReadingsCache.set(k, v);
      }
    }
  }catch(_e){}
}
}

function serialiseHydroCachesBundle_(){
  const out = {};
  out.hilltopRange = serialiseHilltopRangeCache_();
  out.riverHistory = serialiseMapToArray_(riverHistoryCache);
  out.gwHistory = serialiseMapToArray_(gwHistoryCache);

  // These are defined in the UI module but are global
  try{
    if (typeof districtHydroHistoryCache !== "undefined") out.districtHydroHistory = serialiseMapToArray_(districtHydroHistoryCache);
  }catch(_e){}
  try{
    if (typeof districtHydroReadingsCache !== "undefined") out.districtHydroReadings = serialiseDistrictHydroReadingsCache_();
  }catch(_e){}

  out.nrcHybrid = serialiseNrcHybridCache_();
  return out;
}

function restoreHydroCachesBundle_(obj){
  const s = obj || {};
  restoreHilltopRangeCache_(s.hilltopRange);
  restoreMapFromArray_(riverHistoryCache, s.riverHistory);
  restoreMapFromArray_(gwHistoryCache, s.gwHistory);
  try{
    if (typeof districtHydroHistoryCache !== "undefined") restoreMapFromArray_(districtHydroHistoryCache, s.districtHydroHistory);
  }catch(_e){}
  try{
    if (typeof districtHydroReadingsCache !== "undefined") restoreDistrictHydroReadingsCache_(s.districtHydroReadings);
  }catch(_e){}
  restoreNrcHybridCache_(s.nrcHybrid);
}

function buildExportBundle(){
  const nowIso = new Date().toISOString();
  const pastDays = Number($("pastDays")?.value) || null;
  const forecastDays = Number($("forecastDays")?.value) || null;

  const bundle = {
    schema_version: EXPORT_BUNDLE_SCHEMA,
    created_at: nowIso,
    app: {
      name: "Far North Drought Index Dashboard",
      bundle_note: "Portable cache bundle. Safe to commit to GitHub as a snapshot if desired."
    },
    state: {
      timeMode: timeMode,
      asOfSnapshot: (asOfSnapshot instanceof Date) ? asOfSnapshot.toISOString() : null,
      pastDays: pastDays,
      forecastDays: forecastDays,
      selectedId: selectedId
    },
    locations: Array.isArray(locations) ? locations : [],
    data: {}
  };

  if (DASH_CONFIG?.export?.includeRawProviders){
    bundle.data.dataCache = serialiseDataCache();
  }
  if (DASH_CONFIG?.export?.includeComputed){
    bundle.data.computed = Array.isArray(computed) ? computed : [];
  }
  if (DASH_CONFIG?.export?.includeClimateDrivers){
    bundle.data.climateDrivers = {
      fetchedAt: climateDriversCache?.fetchedAt || 0,
      enso: climateDriversCache?.enso || null,
      sam: climateDriversCache?.sam || null,
      mjo: climateDriversCache?.mjo || null
    };
  }

  if (DASH_CONFIG?.export?.includeHydroCaches !== false){
    bundle.data.hydroCaches = serialiseHydroCachesBundle_();
  }

  // Helpful provenance for later GitHub archiving
  bundle.providers = {
    openMeteo: {
      forecastEndpoint: (timeMode === "historic") ? (OPEN_METEO_HISTORICAL_FORECAST_URL || null) : (OPEN_METEO_FORECAST_URL || null),
      historicalForecastEndpoint: OPEN_METEO_HISTORICAL_FORECAST_URL || null,
      floodEndpoint: OPEN_METEO_FLOOD_URL || null
    },
    nrc: {
      rivers: NRC_RIVERS_URL || null,
      groundwater: NRC_GW_URL || null
    }
  };

  return bundle;
}

function makeBundleFilename(){
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const mode = (timeMode === "historic") ? "historic" : "live";
  return `far_north_drought_bundle_${mode}_${stamp}.json`;
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

async function downloadObjectAsFile(obj){
  const pretty = !!(DASH_CONFIG?.export?.prettyPrint);
  const jsonText = JSON.stringify(obj, null, pretty ? 2 : 0);

  const wantGzip = !!(DASH_CONFIG?.export?.compressGzip);
  const canGzip = (typeof CompressionStream !== "undefined");

  if (wantGzip && canGzip){
    const base = new Blob([jsonText], { type: "application/json" });
    const cs = new CompressionStream("gzip");
    const gzStream = base.stream().pipeThrough(cs);
    const gzBlob = await new Response(gzStream).blob();
    downloadBlob(gzBlob, makeBundleFilename() + ".gz");
    return;
  }

  downloadBlob(new Blob([jsonText], { type: "application/json" }), makeBundleFilename());
}


/***********************
 * ZIP Export: GitHub-Ready Split Layout
 * - Open-Meteo stored separately (chunked by location count)
 * - NRC site lists stored separately
 * - NRC Hilltop history split by site and month (from in-memory caches)
 ***********************/
function slugForPath(s){
  const t = (s == null) ? "" : String(s).trim().toLowerCase();
  const cleaned = t.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "unknown";
}

function yyyymmFromTimeString(t){
  const s = (t == null) ? "" : String(t).trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  const d = parseHilltopTimeToDate ? parseHilltopTimeToDate(s) : new Date(s);
  if (d && !isNaN(d.getTime())){
    const y = d.getFullYear();
    const mo = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${mo}`;
  }
  return "unknown";
}

function splitSeriesPairsByMonth(series){
  const out = new Map(); // yyyymm -> {times:[], values:[]}
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return out;

  for (let i=0;i<series.times.length;i++){
    const t = series.times[i];
    const v = series.values[i];
    if (t == null || v == null || !isFinite(v)) continue;
    const mm = yyyymmFromTimeString(t);
    const cur = out.get(mm) || { times: [], values: [] };
    cur.times.push(String(t));
    cur.values.push(Number(v));
    out.set(mm, cur);
  }
  return out;
}

function parseHilltopCacheKey(cacheKey, kindHint){
  const s = String(cacheKey || "");
  // District cache: DH|river|<site>||<meas>||<endStamp>||<daysBack>
  if (s.startsWith("DH|")){
    const parts = s.split("|");
    const kind = parts[1] || kindHint || "unknown";
    const rest = parts.slice(2).join("|"); // "<site>||<meas>||<endStamp>||<daysBack>"
    const r = rest.split("||");
    return {
      kind,
      siteName: r[0] || "",
      measName: r[1] || "",
      endStamp: r[2] || "",
      daysBack: r[3] || ""
    };
  }

  // Standard cache: <site>||<meas>||<endStamp>||<daysBack>
  const r = s.split("||");
  return {
    kind: kindHint || "unknown",
    siteName: r[0] || "",
    measName: r[1] || "",
    endStamp: r[2] || "",
    daysBack: r[3] || ""
  };
}

function mergeMonthlyFileRecord(rec){
  // De-duplicate by time string, keep last value if repeated
  const map = new Map();
  for (let i=0;i<rec.times.length;i++){
    map.set(rec.times[i], rec.values[i]);
  }
  const pairs = [...map.entries()].sort((a,b)=> String(a[0]).localeCompare(String(b[0])));
  rec.times = pairs.map(p=>p[0]);
  rec.values = pairs.map(p=>p[1]);
  return rec;
}

function computeHilltopPrefetchWindowForExport_(){
  const DAY_MS = 24*60*60*1000;
  const asOf = (typeof getAsOfDate === "function") ? (_safeDateAny_(getAsOfDate()) || new Date()) : new Date();
  const rangeMin = _safeDateAny_(dataCache?.rangeMin);
  const rangeMax = _safeDateAny_(dataCache?.rangeMax);

  let to = rangeMax || asOf;
  if (String(timeMode || "").toLowerCase() !== "historic"){
    if (to.getTime() > asOf.getTime()) to = asOf;
  }

  const minDays = clamp(Number(DASH_CONFIG?.export?.prefetchHilltopMinDays) || 35, 7, 365);
  const maxDays = clamp(Number(DASH_CONFIG?.export?.prefetchHilltopMaxDays) || 180, minDays, 730);

  const hardMinFrom = new Date(to.getTime() - (minDays * DAY_MS));
  const hardMaxFrom = new Date(to.getTime() - (maxDays * DAY_MS));

  let from = hardMinFrom;
  if (rangeMin && rangeMin.getTime && rangeMin.getTime() < from.getTime()){
    from = rangeMin;
  }
  if (from.getTime() < hardMaxFrom.getTime()){
    from = hardMaxFrom;
  }

  return { from, to };
}

async function runWithConcurrency_(items, concurrency, workerFn){
  const limit = Math.max(1, Number(concurrency) || 1);
  let idx = 0;
  const runners = Array.from({length: limit}, async ()=>{
    while (idx < items.length){
      const cur = items[idx++];
      await workerFn(cur);
    }
  });
  await Promise.all(runners);
}

async function prefetchNrcGaugesForZipExport_(){
  try{
    const riversRaw = Array.isArray(dataCache?.riverSites) ? dataCache.riverSites : [];
    const gwsRaw = Array.isArray(dataCache?.gwSites) ? dataCache.gwSites : [];
    if (!riversRaw.length && !gwsRaw.length){
      return false;
    }

    const win = computeHilltopPrefetchWindowForExport_();
    const from = win.from;
    const to = win.to;

    const tasks = [];
    const seen = new Set();
    const add = (siteName, measName)=>{
      if (!siteName || !measName) return;
      const k = String(siteName).trim().toLowerCase() + "||" + String(measName).trim().toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      tasks.push({siteName: String(siteName).trim(), measName: String(measName).trim()});
    };

    for (const it of riversRaw){
      const s = (it && it.siteName) ? it : normaliseNrcRiverSite(it);
      if (!s) continue;
      const siteName = s.siteName || s.name || s.title;
      if (!siteName) continue;
      if (s.levelMeasName) add(siteName, s.levelMeasName);
      if (s.flowMeasName) add(siteName, s.flowMeasName);
    }
    for (const it of gwsRaw){
      const s = (it && it.siteName) ? it : normaliseNrcGroundwaterSite(it);
      if (!s) continue;
      const siteName = s.siteName || s.name || s.title;
      if (!siteName) continue;
      if (s.levelMeasName) add(siteName, s.levelMeasName);
    }

    if (!tasks.length){
      return false;
    }

    const concurrency = clamp(Number(DASH_CONFIG?.export?.prefetchHilltopConcurrency) || 2, 1, 6);
    let done = 0;
    const total = tasks.length;

    await runWithConcurrency_(tasks, concurrency, async (t)=>{
      try{
        done++;
        if (typeof setStatus === "function"){
          setStatus(`Prefetching NRC gauges ${done}/${total}: ${t.siteName} (${t.measName})`);
        }
        await ensureHilltopRangeCachedSeries_(t.siteName, t.measName, from, to);
      }catch(e){
        console.warn("ZIP prefetch failed for", t, e);
      }
    });

    return true;
  }catch(e){
    console.warn("ZIP prefetch failed", e);
    return false;
  }
}

async function exportZipGithubLayout(){
  if (typeof JSZip === "undefined"){
    showToast("ZIP export needs JSZip. Check your connection or allow the JSZip CDN to load.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const mode = (timeMode === "historic") ? "historic" : "live";
  const rootName = `far_north_drought_export_${mode}_${stamp}`;

setStatus("Preparing ZIP export…");

// Prefetch all NRC river and groundwater gauges so Hilltop range caches are populated for offline ZIP use
const doPrefetch = (DASH_CONFIG?.export?.prefetchNrcGaugesBeforeZip !== false);
if (doPrefetch){
  try{
    await prefetchNrcGaugesForZipExport_();
  }catch(e){
    console.warn("ZIP export prefetch failed", e);
    if (typeof showToast === "function") showToast("ZIP export: gauge prefetch failed (exporting anyway).");
  }
}

setStatus("Building ZIP export…");
  try{
    const zip = new JSZip();
    const root = (DASH_CONFIG?.export?.zipRootFolder) ? zip.folder(rootName) : zip;

    // Root manifest
    const manifest = {
      schema_version: 1,
      created_at: new Date().toISOString(),
      mode,
      note: "GitHub-ready export. Open-Meteo separated. NRC Hilltop split by site and month.",
      state: {
        timeMode,
        asOfSnapshot: (asOfSnapshot instanceof Date) ? asOfSnapshot.toISOString() : null,
        pastDays: Number($("pastDays")?.value) || null,
        forecastDays: Number($("forecastDays")?.value) || null
      },
      counts: {
        locations: Array.isArray(locations) ? locations.length : 0,
        wxList: Array.isArray(dataCache?.wxList) ? dataCache.wxList.length : 0,
        floodList: Array.isArray(dataCache?.floodList) ? dataCache.floodList.length : 0,
        riverSites: Array.isArray(dataCache?.riverSites) ? dataCache.riverSites.length : 0,
        gwSites: Array.isArray(dataCache?.gwSites) ? dataCache.gwSites.length : 0
      }
    };

    root.file("manifest.json", JSON.stringify(manifest, null, 2));
    root.file("locations.json", JSON.stringify(Array.isArray(locations) ? locations : [], null, 2));

    // Optional: full portable bundle for fast reload (redundant but convenient)
    if (DASH_CONFIG?.export?.zipIncludeBundleJson){
      const bundle = buildExportBundle();
      const pretty = !!(DASH_CONFIG?.export?.prettyPrint);
      root.file("bundle.json", JSON.stringify(bundle, null, pretty ? 2 : 0));
    }

    // Provider layout
    const prov = root.folder("providers");

    // ---- Open-Meteo ----
    const om = prov.folder("open_meteo");
    const omMeta = {
      forecastEndpoint: (timeMode === "historic") ? OPEN_METEO_HISTORICAL_FORECAST_URL : OPEN_METEO_FORECAST_URL,
      historicalForecastEndpoint: OPEN_METEO_HISTORICAL_FORECAST_URL,
      floodEndpoint: OPEN_METEO_FLOOD_URL,
      rangeMin: dataCache?.rangeMin ? String(dataCache.rangeMin) : null,
      rangeMax: dataCache?.rangeMax ? String(dataCache.rangeMax) : null,
      pastDays: dataCache?.pastDays ?? null,
      forecastDays: dataCache?.forecastDays ?? null,
      chunkSize: DASH_CONFIG?.export?.openMeteoChunkSize ?? 25
    };
    om.file("meta.json", JSON.stringify(omMeta, null, 2));

    const omChunkSize = Math.max(1, Number(DASH_CONFIG?.export?.openMeteoChunkSize) || 25);

    if (Array.isArray(dataCache?.wxList) && dataCache.wxList.length){
      const fFolder = om.folder("forecast");
      for (let i=0;i<dataCache.wxList.length;i+=omChunkSize){
        const chunkIdx = Math.floor(i / omChunkSize);
        const sliceWx = dataCache.wxList.slice(i, i+omChunkSize);
        const sliceLoc = Array.isArray(locations) ? locations.slice(i, i+omChunkSize) : [];
        const payload = { chunkIndex: chunkIdx, locations: sliceLoc, wxList: sliceWx };
        fFolder.file(`chunk_${String(chunkIdx).padStart(3,"0")}.json`, JSON.stringify(payload));
      }
    }

    if (Array.isArray(dataCache?.floodList) && dataCache.floodList.length){
      const fldFolder = om.folder("flood");
      for (let i=0;i<dataCache.floodList.length;i+=omChunkSize){
        const chunkIdx = Math.floor(i / omChunkSize);
        const sliceF = dataCache.floodList.slice(i, i+omChunkSize);
        const sliceLoc = Array.isArray(locations) ? locations.slice(i, i+omChunkSize) : [];
        const payload = { chunkIndex: chunkIdx, locations: sliceLoc, floodList: sliceF };
        fldFolder.file(`chunk_${String(chunkIdx).padStart(3,"0")}.json`, JSON.stringify(payload));
      }
    }

    // ---- NRC ----
    const nrc = prov.folder("nrc");
    nrc.file("rivers_sites.json", JSON.stringify(dataCache?.riverSites || null, null, 2));
    nrc.file("groundwater_sites.json", JSON.stringify(dataCache?.gwSites || null, null, 2));
    nrc.file("river_for_location.json", JSON.stringify(dataCache?.riverForLoc || null, null, 2));
    nrc.file("groundwater_for_location.json", JSON.stringify(dataCache?.gwForLoc || null, null, 2));

    // Hilltop history caches split by month
    const hilltopFolder = nrc.folder("hilltop_history");
    const fileMap = new Map(); // filepath -> record

    function addSeriesCacheToFileMap(cache, kindHint){
      if (!cache || typeof cache.forEach !== "function") return;
      cache.forEach((series, cacheKey) => {
        const meta = parseHilltopCacheKey(cacheKey, kindHint);
        if (!meta.siteName || !meta.measName || !series) return;

        const monthGroups = splitSeriesPairsByMonth(series);
        const siteSlug = slugForPath(meta.siteName);
        const measSlug = slugForPath(meta.measName);
        const kindSlug = slugForPath(meta.kind);

        for (const [monthKey, chunk] of monthGroups.entries()){
          if (!chunk.times.length) continue;
          const relPath = `${kindSlug}/${siteSlug}/${measSlug}/${monthKey}.json`;

          const existing = fileMap.get(relPath) || {
            kind: meta.kind,
            siteName: meta.siteName,
            measName: meta.measName,
            month: monthKey,
            times: [],
            values: [],
            sources: []
          };

          for (let i=0;i<chunk.times.length;i++){
            existing.times.push(chunk.times[i]);
            existing.values.push(chunk.values[i]);
          }
          existing.sources.push(String(cacheKey));
          fileMap.set(relPath, existing);
        }
      });
    }

    addSeriesCacheToFileMap(riverHistoryCache, "river");
    addSeriesCacheToFileMap(gwHistoryCache, "groundwater");
    addSeriesCacheToFileMap(districtHydroHistoryCache, "district");

    const indexList = [];
    for (const [relPath, rec] of fileMap.entries()){
      const merged = mergeMonthlyFileRecord(rec);
      hilltopFolder.file(relPath, JSON.stringify(merged));
      indexList.push({ path: `providers/nrc/hilltop_history/${relPath}`, kind: rec.kind, siteName: rec.siteName, measName: rec.measName, month: rec.month });
    }
    hilltopFolder.file("index.json", JSON.stringify(indexList, null, 2));

    // Climate driver snapshots (optional)
    if (DASH_CONFIG?.export?.includeClimateDrivers){
      const cd = {
        fetchedAt: climateDriversCache?.fetchedAt || 0,
        enso: climateDriversCache?.enso || null,
        sam: climateDriversCache?.sam || null,
        mjo: climateDriversCache?.mjo || null
      };
      prov.file("climate_drivers.json", JSON.stringify(cd, null, 2));
    }

    // Computed (optional)
    if (DASH_CONFIG?.export?.includeComputed){
      prov.file("computed_locations.json", JSON.stringify(Array.isArray(computed) ? computed : []));
    }

    // Extra in-memory caches (recommended for offline operation)
    // These are derived caches used during computation and location switching.
    if (DASH_CONFIG?.export?.includeHydroCaches){
      try{
        const cachesFolder = root.folder("caches");
        cachesFolder.file("hilltop_range_cache.json", JSON.stringify(serialiseHilltopRangeCache_(), null, 2));
        cachesFolder.file("nrc_hybrid_cache.json", JSON.stringify(serialiseNrcHybridCache_(), null, 2));
        cachesFolder.file("district_hydro_readings_cache.json", JSON.stringify(serialiseDistrictHydroReadingsCache_(), null, 2));
        const derived = {
          locationsSig: dataCache?.locationsSig ?? null,
          riverHybridForLoc: dataCache?.riverHybridForLoc ?? null,
          riverHybridAsOfKey: dataCache?.riverHybridAsOfKey ?? null
        };
        cachesFolder.file("derived_state.json", JSON.stringify(derived, null, 2));
      } catch(_e){
        console.warn("Could not include caches folder in ZIP export", _e);
      }
    }

    // Generate ZIP
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 }});
    const filename = `${rootName}.zip`;
    downloadBlob(blob, filename);

    showToast("Exported ZIP file.");
  } catch (e){
    console.error(e);
    showToast("ZIP export failed. See console for details.");
  } finally {
    setStatus("Ready");
  }
}

async function parseBundleFromFile(file){
  if (!file) return null;

  const isGz = /\.gz$/i.test(file.name) || file.type === "application/gzip";
  const canGunzip = (typeof DecompressionStream !== "undefined");

  if (isGz && canGunzip){
    const buf = await file.arrayBuffer();
    const ds = new DecompressionStream("gzip");
    const stream = new Blob([buf]).stream().pipeThrough(ds);
    const txt = await new Response(stream).text();
    return safeJsonParse(txt);
  }

  const txt = await file.text();
  return safeJsonParse(txt);
}



// ZIP manifest import (GitHub split layout)
// This restores Open-Meteo chunk files, NRC site maps, climate drivers and Hilltop monthly history caches.
function clearHistoryCaches(){
  try{ riverHistoryCache.clear(); }catch(e){}
  try{ gwHistoryCache.clear(); }catch(e){}
  try{ hilltopRangeCache.clear(); }catch(e){}
      try{ clearProviderJsonCache(); }catch(e){}
      try{ if (typeof climateDriversCache !== "undefined" && climateDriversCache){ climateDriversCache.fetchedAt = 0; climateDriversCache.enso = null; climateDriversCache.sam = null; climateDriversCache.mjo = null; climateDriversCache.loading = false; } }catch(e){}
  try{ districtHydroHistoryCache.clear(); }catch(e){}
  try{ if (typeof districtHydroReadingsCache !== "undefined" && districtHydroReadingsCache) districtHydroReadingsCache.clear(); }catch(e){}
  try{ if (typeof remoteArchive !== "undefined" && remoteArchive && remoteArchive.monthFileCache) remoteArchive.monthFileCache.clear(); }catch(e){}
}

async function readJsonFromZip_(zip, absPath){
  const p = String(absPath || "");
  const f = zip.file(p) || zip.file(p.replace(/^\.\//,""));
  if (!f) return null;
  const txt = await f.async("string");
  try{
    return JSON.parse(txt);
  } catch(err){
    console.warn("ZIP JSON parse failed for", p, err);
    return null;
  }
}

async function readZipManifest_(zip){
  const keys = Object.keys(zip.files || {});
  const cand = keys.filter(k => /(^|\/)manifest\.json$/i.test(k));
  if (!cand.length) return null;
  cand.sort((a,b)=>a.length-b.length);
  const manifestKey = cand[0];
  const manifest = await readJsonFromZip_(zip, manifestKey);
  if (!manifest) return null;
  const prefix = manifestKey.replace(/manifest\.json$/i,"");
  return { manifestKey, prefix, manifest };
}

function listZipChunkKeys_(zip, folderPrefix){
  const pref = String(folderPrefix || "");
  const keys = Object.keys(zip.files || {});
  const chunks = keys.filter(k => k.startsWith(pref) && /chunk_\d+\.json$/i.test(k));
  chunks.sort(); // chunk_000.json lexical sort is fine
  return chunks;
}

async function readChunkedListFromZip_(zip, folderPrefix, listKey){
  const chunkKeys = listZipChunkKeys_(zip, folderPrefix);
  if (!chunkKeys.length) return null;
  const out = [];
  for (const k of chunkKeys){
    const payload = await readJsonFromZip_(zip, k);
    const arr = payload && payload[listKey];
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
}

async function restoreHilltopCachesFromZip_(zip, basePrefix){
  const folder = String(basePrefix || "") + "providers/nrc/hilltop_history/";
  const keys = Object.keys(zip.files || {}).filter(k =>
    k.startsWith(folder) &&
    /\.json$/i.test(k) &&
    !/index\.json$/i.test(k)
  );
  if (!keys.length) return;

  const agg = new Map();

  for (const k of keys){
    const rec = await readJsonFromZip_(zip, k);
    if (!rec || !Array.isArray(rec.times) || !Array.isArray(rec.values)) continue;

    const srcKey = (Array.isArray(rec.sources) && rec.sources.length) ? String(rec.sources[0]) : "";
    const cacheKey = srcKey || `${rec.kind||"unknown"}|${rec.siteName||""}||${rec.measName||""}||${rec.month||""}||0`;

    let ent = agg.get(cacheKey);
    if (!ent){
      ent = { kind: rec.kind || null, times: [], values: [] };
      agg.set(cacheKey, ent);
    }
    if (!ent.kind && rec.kind) ent.kind = rec.kind;

    // Merge raw pairs (we will de-duplicate later)
    const n = Math.min(rec.times.length, rec.values.length);
    for (let i=0; i<n; i++){
      ent.times.push(rec.times[i]);
      ent.values.push(rec.values[i]);
    }
  }

  for (const [cacheKey, ent] of agg.entries()){
    const merged = mergeMonthlyFileRecord({ times: ent.times, values: ent.values });
    const series = { times: merged.times || [], values: merged.values || [] };

    if (String(cacheKey).startsWith("DH|") || ent.kind === "district"){
      districtHydroHistoryCache.set(cacheKey, series);
    } else if (ent.kind === "groundwater"){
      gwHistoryCache.set(cacheKey, series);
    } else if (ent.kind === "river"){
      riverHistoryCache.set(cacheKey, series);
    } else {
      // Best effort inference
      const meta = parseHilltopCacheKey(String(cacheKey));
      if (meta && meta.isDistrict) districtHydroHistoryCache.set(cacheKey, series);
      else riverHistoryCache.set(cacheKey, series);
    }
  }
}

async function restoreExtraCachesFromZip_(zip, basePrefix){
  const base = String(basePrefix || "");
  // Restore derived and range caches if present
  const hilltopRange = await readJsonFromZip_(zip, base + "caches/hilltop_range_cache.json");
  if (Array.isArray(hilltopRange)) restoreHilltopRangeCache_(hilltopRange);

  const nrcHybrid = await readJsonFromZip_(zip, base + "caches/nrc_hybrid_cache.json");
  if (Array.isArray(nrcHybrid)) restoreNrcHybridCache_(nrcHybrid);

  const districtRead = await readJsonFromZip_(zip, base + "caches/district_hydro_readings_cache.json");
  if (Array.isArray(districtRead)) restoreDistrictHydroReadingsCache_(districtRead);

  const derived = await readJsonFromZip_(zip, base + "caches/derived_state.json");
  if (derived && typeof derived === "object"){
    try{
      if (!dataCache || typeof dataCache !== "object") dataCache = {};
      if (derived.locationsSig != null) dataCache.locationsSig = derived.locationsSig;
      if (derived.riverHybridForLoc != null) dataCache.riverHybridForLoc = derived.riverHybridForLoc;
      if (derived.riverHybridAsOfKey != null) dataCache.riverHybridAsOfKey = derived.riverHybridAsOfKey;
    } catch(_e){}
  }

  // Fallback: if the range cache is empty, prime it from restored history caches.
  try{
    if (hilltopRangeCache){
      primeHilltopRangeCacheFromHistoryCaches_();
    }
  } catch(_e){}
}

function primeHilltopRangeCacheFromHistoryCaches_(){
  if (!hilltopRangeCache || typeof hilltopRangeCache.set !== "function") return;

  function addFromCache(cache, kindHint){
    if (!cache || typeof cache.forEach !== "function") return;
    cache.forEach((series, cacheKey) => {
      if (!series || !Array.isArray(series.times) || series.times.length === 0) return;

      const meta = parseHilltopCacheKey(String(cacheKey), kindHint);
      if (!meta || !meta.siteName || !meta.measName) return;

      const k = _hilltopKey_(meta.siteName, meta.measName);
      const cur = hilltopRangeCache.get(k) || {
        fromMs: null,
        toMs: null,
        series: { times: [], values: [] },
        inflight: null
      };

      // Merge samples
      cur.series = mergeHilltopSeries(cur.series, series);

      // Track raw bounds then expand slightly so ensureHilltopRangeCachedSeries_ does not refetch
      const t0 = cur.series.times[0];
      const t1 = cur.series.times[cur.series.times.length - 1];
      const ms0 = (t0 ? new Date(t0).getTime() : NaN);
      const ms1 = (t1 ? new Date(t1).getTime() : NaN);

      if (Number.isFinite(ms0)){
        cur._rawFromMs = (cur._rawFromMs == null) ? ms0 : Math.min(cur._rawFromMs, ms0);
      }
      if (Number.isFinite(ms1)){
        cur._rawToMs = (cur._rawToMs == null) ? ms1 : Math.max(cur._rawToMs, ms1);
      }

      const pad = 2 * DAY_MS;
      if (cur._rawFromMs != null){
        const newFrom = cur._rawFromMs - pad;
        if (cur.fromMs == null || newFrom < cur.fromMs) cur.fromMs = newFrom;
      }
      if (cur._rawToMs != null){
        const newTo = cur._rawToMs + pad;
        if (cur.toMs == null || newTo > cur.toMs) cur.toMs = newTo;
      }

      cur.inflight = null;
      hilltopRangeCache.set(k, cur);
    });
  }

  addFromCache(riverHistoryCache, "river");
  addFromCache(gwHistoryCache, "groundwater");
  addFromCache(districtHydroHistoryCache, "district");
}


async function loadZipManifestSplitLayout(file){
  if (!DASH_CONFIG?.import?.enableZipManifestLoad){
    showToast("ZIP manifest import is disabled in DASH_CONFIG.import.");
    return false;
  }
  if (!window.JSZip){
    showToast("JSZip is not available, cannot load ZIP.");
    return false;
  }
  if (!file) return false;

  try{
    setStatus("Loading ZIP archive…");
    if (DASH_CONFIG?.import?.clearCachesBeforeLoad){
      clearLoadedData();
      clearHistoryCaches();
    } else {
      clearHistoryCaches();
    }

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const mf = await readZipManifest_(zip);
    if (!mf){
      showToast("manifest.json was not found in this ZIP.");
      setStatus("Ready");
      return false;
    }

    const base = mf.prefix || "";
    const manifest = mf.manifest || {};
    const locs = await readJsonFromZip_(zip, base + "locations.json");
    if (!Array.isArray(locs) || !locs.length){
      showToast("locations.json is missing or invalid in this ZIP.");
      setStatus("Ready");
      return false;
    }

    const openMeta = await readJsonFromZip_(zip, base + "providers/open_meteo/meta.json");
    const wxList = await readChunkedListFromZip_(zip, base + "providers/open_meteo/forecast/", "wxList");
    const floodList = await readChunkedListFromZip_(zip, base + "providers/open_meteo/flood/", "floodList");

    const riverSites = await readJsonFromZip_(zip, base + "providers/nrc/rivers_sites.json");
    const gwSites = await readJsonFromZip_(zip, base + "providers/nrc/groundwater_sites.json");
    const riverForLoc = await readJsonFromZip_(zip, base + "providers/nrc/river_for_location.json");
    const gwForLoc = await readJsonFromZip_(zip, base + "providers/nrc/groundwater_for_location.json");

    const climateDrivers = await readJsonFromZip_(zip, base + "providers/climate_drivers.json");
    const computed = await readJsonFromZip_(zip, base + "providers/computed_locations.json");

    const state = (manifest && manifest.state && typeof manifest.state === "object") ? { ...manifest.state } : {};
    if (!state.timeMode && manifest.mode){
      const m = String(manifest.mode).toLowerCase();
      state.timeMode = (m.includes("historic")) ? "historic" : "live";
    }

    const loadedAt = manifest.createdAt || manifest.exportedAt || new Date().toISOString();

    const dataCacheSerial = {
      wxList: Array.isArray(wxList) ? wxList : null,
      floodList: Array.isArray(floodList) ? floodList : null,
      riverSites: riverSites || null,
      gwSites: gwSites || null,
      riverForLoc: riverForLoc || null,
      gwForLoc: gwForLoc || null,
      loadedAt,
      rangeMin: openMeta?.rangeMin ?? null,
      rangeMax: openMeta?.rangeMax ?? null,
      pastDays: (openMeta?.pastDays ?? null),
      forecastDays: (openMeta?.forecastDays ?? null)
    };

    // Build a bundle shaped payload so we can reuse the existing restore logic
    const bundle = {
      schema_version: EXPORT_BUNDLE_SCHEMA,
      created_at: loadedAt,
      locations: locs,
      state,
      data: {
        dataCache: dataCacheSerial
      }
    };
    if (Array.isArray(computed)) bundle.data.computed = computed;
    if (climateDrivers && typeof climateDrivers === "object") bundle.data.climateDrivers = climateDrivers;

	    // ZIP imports have no manifestUrl/baseUrl. Use the filename (or manifest key) as a stable hint.
	    const hint = (file && file.name) ? `zip:${file.name}` : (mf.manifestKey || "zip_archive");
	    const archiveId = buildArchiveIdFromRange_(dataCacheSerial.rangeMin, dataCacheSerial.rangeMax, hint);
	    const ok = applyLoadedBundle(bundle, {fromArchive:true, source:"zip", archiveId, hint});
    if (!ok){
      setStatus("Ready");
      return false;
    }

    await restoreHilltopCachesFromZip_(zip, base);
    await restoreExtraCachesFromZip_(zip, base);

    showToast("Loaded ZIP archive (manifest split layout).");
    setStatus("Ready");
    return true;

  } catch(err){
    console.error(err);
    showToast("ZIP import failed: " + (err && err.message ? err.message : String(err)));
    setStatus("Ready");
    return false;
  }
}



/* ===========================
   Hosted Manifest Import (GitHub)
   =========================== */

const remoteArchive = {
  enabled: false,
  manifestUrl: null,
  baseUrl: null, // folder URL ending with "/"
  manifest: null,
  hilltopIndexList: null,
  hilltopIndexMap: null, // key -> index entry
  monthFileCache: new Map(), // url -> {times, values}
  loadedAt: null
};
/* ===========================
   Archive Session And IDB Cache
   =========================== */

const archiveSession = {
  active: false,
  source: null,          // "zip" | "hosted"
  archiveId: null,
  rangeMin: null,
  rangeMax: null,
  providersDisabled: false
};

function _safeDateAny_(v){
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
function _ymdIso_(d){
  try{ return d.toISOString().slice(0,10); }catch(e){ return "unknown"; }
}
function _slug_(s){
  return String(s || "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").slice(0, 60) || "archive";
}
function buildArchiveIdFromRange_(rangeMin, rangeMax, hint){
  const a = _safeDateAny_(rangeMin);
  const b = _safeDateAny_(rangeMax);
  const h = _slug_(hint || "archive");
  const sA = a ? _ymdIso_(a) : "unknown";
  const sB = b ? _ymdIso_(b) : "unknown";
  return `${h}_${sA}_to_${sB}`;
}
function buildArchiveIdFromBundle_(bundle, hint){
  const dc = bundle && bundle.dataCache ? bundle.dataCache : {};
  return buildArchiveIdFromRange_(dc.rangeMin, dc.rangeMax, hint);
}

function providersDisabledNow_(forceProviders){
  if (forceProviders) return false;
  return !!(archiveSession.active && archiveSession.providersDisabled);
}

function inferArchiveRange_(){
  // Prefer dataCache ranges if present
  const min = _safeDateAny_(dataCache?.rangeMin) || null;
  const max = _safeDateAny_(dataCache?.rangeMax) || null;
  return { min, max };
}

function inferArchiveLatestValidAsOf_(){
  const { min, max } = inferArchiveRange_();
  if (!max) return null;
  const fd = Math.max(0, Number(dataCache?.forecastDays) || 0);
  let asOf = new Date(max.getTime() - (fd * DAY_MS));
  if (min){
    const needMin = new Date(asOf.getTime() - (Math.max(0, Number(dataCache?.pastDays) || 0) * DAY_MS));
    if (needMin < min){
      // Not enough history, move asOf forward to fit inside range
      asOf = new Date(min.getTime() + (Math.max(0, Number(dataCache?.pastDays) || 0) * DAY_MS));
    }
  }
  return asOf;
}

function applyArchiveSessionFromBundle_(bundle, opts){
  if (!opts || !opts.fromArchive) return;

  const hint = (opts.source === "zip") ? (opts.hint || "zip_archive") : (opts.hint || "hosted_archive");
  const archiveId = opts.archiveId || buildArchiveIdFromBundle_(bundle, hint);

  const { min, max } = inferArchiveRange_();

  archiveSession.active = true;
  archiveSession.source = opts.source || "archive";
  archiveSession.archiveId = archiveId;
  archiveSession.rangeMin = min;
  archiveSession.rangeMax = max;
  archiveSession.providersDisabled = !!(DASH_CONFIG?.import?.disableProviderFetchWhenArchiveLoaded);

  // Keep remoteArchive in sync for Hilltop IDB keys (zip has no baseUrl)
  try{
    remoteArchive.archiveId = archiveId;
  }catch(e){}

  // Auto-clamp UI state
  if (DASH_CONFIG?.import?.clampPastForecastToArchiveMeta){
    if (Number.isFinite(Number(dataCache?.pastDays))) pastDays = Number(dataCache.pastDays);
    if (Number.isFinite(Number(dataCache?.forecastDays))) forecastDays = Number(dataCache.forecastDays);
  }

  if (DASH_CONFIG?.import?.autoSwitchHistoricOnArchiveLoad){
    timeMode = "historic";
  }

  if (DASH_CONFIG?.import?.autoSetAsOfToArchiveLatestValid){
    const latest = inferArchiveLatestValidAsOf_();
    if (latest) asOfSnapshot = latest;
  }

  if (DASH_CONFIG?.import?.clampAsOfToArchiveRange){
    const a = _safeDateAny_(asOfSnapshot);
    const rMin = _safeDateAny_(archiveSession.rangeMin);
    const rMax = _safeDateAny_(archiveSession.rangeMax);
    if (a && rMin && a < rMin) asOfSnapshot = new Date(rMin.getTime());
    if (a && rMax && a > rMax) asOfSnapshot = new Date(rMax.getTime());
  }
}

/* ===========================
   IndexedDB Helpers
   =========================== */

const idbArchive = {
  db: null,
  opening: null,
  name: (DASH_CONFIG?.import?.indexedDbName || "fn_drought_archive_cache"),
  version: 1
};

function idbEnabled_(){
  return !!(DASH_CONFIG?.import?.indexedDbEnabled && typeof indexedDB !== "undefined");
}

async function idbOpen_(){
  if (!idbEnabled_()) return null;
  if (idbArchive.db) return idbArchive.db;
  if (idbArchive.opening) return idbArchive.opening;

  idbArchive.opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(idbArchive.name, idbArchive.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("manifests")) db.createObjectStore("manifests");
      if (!db.objectStoreNames.contains("hilltop_index")) db.createObjectStore("hilltop_index");
      if (!db.objectStoreNames.contains("hilltop_month")) db.createObjectStore("hilltop_month");
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  try{
    idbArchive.db = await idbArchive.opening;
    return idbArchive.db;
  } finally {
    idbArchive.opening = null;
  }
}

async function idbGet_(store, key){
  const db = await idbOpen_();
  if (!db) return null;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const os = tx.objectStore(store);
    const req = os.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut_(store, key, val){
  const db = await idbOpen_();
  if (!db) return false;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(store).put(val, key);
  });
}

async function idbBulkPut_(store, entries){
  const db = await idbOpen_();
  if (!db) return false;
  if (!entries || !entries.length) return true;
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    for (const [k,v] of entries){
      os.put(v, k);
    }
  });
}


function clearRemoteArchiveState(){
  remoteArchive.enabled = false;
  remoteArchive.manifestUrl = null;
  remoteArchive.baseUrl = null;
  remoteArchive.manifest = null;
  remoteArchive.hilltopIndexList = null;
  remoteArchive.hilltopIndexMap = null;
  if (remoteArchive.monthFileCache && typeof remoteArchive.monthFileCache.clear === "function"){
    remoteArchive.monthFileCache.clear();
  } else {
    remoteArchive.monthFileCache = new Map();
  }
  remoteArchive.loadedAt = null;
}

function isRemoteArchiveActive(){
  // Also allow ZIP-loaded archives (no baseUrl) when an archiveId + index map is present
  return !!(remoteArchive.enabled && remoteArchive.hilltopIndexMap && (remoteArchive.baseUrl || remoteArchive.source === "zip"));
}

function _normKeyPart(v){
  return String(v ?? "").trim().toLowerCase();
}

function _hilltopIdxKey(kind, siteName, measName, monthKey){
  return `${_normKeyPart(kind)}||${_normKeyPart(siteName)}||${_normKeyPart(measName)}||${String(monthKey || "")}`;
}

function _monthKeyFromDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function _monthKeysForRange(fromDate, toDate){
  const out = [];
  if (!(fromDate instanceof Date) || !(toDate instanceof Date)) return out;
  const d0 = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const d1 = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const cur = new Date(d0.getTime());
  while (cur <= d1){
    out.push(_monthKeyFromDate(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function _buildHilltopMeasCandidates(measurementName){
  const raw = String(measurementName || "").trim();
  const out = [];
  if (raw) out.push(raw);

  const noUnits = raw.replace(/\s*\([^)]*\)\s*$/,"").trim();
  if (noUnits && noUnits !== raw) out.push(noUnits);

  // Common alternates
  if (raw === "Flow") out.push("Flow (m3/s)");
  if (raw === "Flow (m3/s)") out.push("Flow");
  if (raw === "Water Level") out.push("Water Level (m)");
  if (raw === "Water Level (m)") out.push("Water Level");

  // Unique and non-empty
  return [...new Set(out.filter(Boolean))];
}

function _coerceMonthlyRecord(payload){
  if (!payload || typeof payload !== "object") return null;
  const times = Array.isArray(payload.times) ? payload.times.map(String) : null;
  const values = Array.isArray(payload.values) ? payload.values.map(Number) : null;
  if (!times || !values) return null;
  return { times, values };
}

function _filterSeriesByRange(series, fromDate, toDate){
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return { times: [], values: [] };
  const outT = [];
  const outV = [];
  const t0 = (fromDate instanceof Date && isFinite(fromDate.getTime())) ? fromDate.getTime() : null;
  const t1 = (toDate instanceof Date && isFinite(toDate.getTime())) ? toDate.getTime() : null;

  for (let i=0;i<series.times.length;i++){
    const ts = series.times[i];
    const v = series.values[i];
    const t = Date.parse(ts);
    if (!isFinite(t)) continue;
    if (t0 !== null && t < t0) continue;
    if (t1 !== null && t > t1) continue;
    outT.push(ts);
    outV.push(Number(v));
  }
  return { times: outT, values: outV };
}

function _applyHostedProxyIfNeeded(url){
  const cfg = DASH_CONFIG?.import || {};
  if (!cfg.manifestUrlUseProxy) return url;
  const pref = String(cfg.manifestUrlProxyPrefix || "").trim();
  if (!pref) return url;
  return pref + url;
}

function _dirFromUrl(url){
  const s = String(url || "");
  const i = s.lastIndexOf("/");
  if (i <= 0) return s;
  return s.slice(0, i+1);
}

async function _fetchJsonOrNull(url, timeoutMs=20000){
  try{
    return await fetchJsonCached(_applyHostedProxyIfNeeded(url), timeoutMs, Infinity, false, "HOSTED_JSON|" + url);
  } catch (e){
    return null;
  }
}

async function initRemoteHilltopIndexFromBase_(baseUrl){
  const base = String(baseUrl || "");
  if (!base) return false;
  const idxUrl = base + "providers/nrc/hilltop_history/index.json";
  const payload = await _fetchJsonOrNull(idxUrl, 25000);
  if (!payload) return false;

  const indexList = Array.isArray(payload) ? payload : (Array.isArray(payload.index) ? payload.index : null);
  if (!indexList) return false;

  const map = new Map();
  for (const ent of indexList){
    if (!ent || typeof ent !== "object") continue;
    const kind = String(ent.kind || "").trim();
    const siteName = String(ent.siteName || "").trim();
    const measName = String(ent.measName || "").trim();
    const monthKey = String(ent.month || "").trim();
    const p = String(ent.path || "").trim();
    if (!kind || !siteName || !measName || !monthKey || !p) continue;
    map.set(_hilltopIdxKey(kind, siteName, measName, monthKey), { ...ent, kind, siteName, measName, month: monthKey, path: p });
  }

  remoteArchive.hilltopIndexList = indexList;
  remoteArchive.hilltopIndexMap = map;
  return true;
}

async function remoteFetchHilltopMonthFile_(indexEntry){
  if (!indexEntry || !indexEntry.path) return null;

  const path = String(indexEntry.path);
  const cacheKey = path;

  if (!remoteArchive.monthFileCache) remoteArchive.monthFileCache = new Map();
  if (remoteArchive.monthFileCache.has(cacheKey)) return remoteArchive.monthFileCache.get(cacheKey);

  const archiveId = remoteArchive.archiveId || archiveSession.archiveId || null;
  const idbKey = (archiveId ? `${archiveId}||${path}` : null);

  // IndexedDB first
  if (idbKey && idbEnabled_() && (DASH_CONFIG?.import?.indexedDbPreferHilltopMonths !== false)){
    try{
      const rec = await idbGet_("hilltop_month", idbKey);
      if (rec){
        remoteArchive.monthFileCache.set(cacheKey, rec);
        return rec;
      }
    }catch(e){
      console.warn("IDB month get failed", e);
    }
  }

  // Hosted archive fetch (not live providers)
  if (!remoteArchive.baseUrl){
    return null;
  }

  const url = remoteArchive.baseUrl.replace(/\/+$/,"") + "/" + path.replace(/^\/+/, "");
  try{
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rec = await res.json();
    remoteArchive.monthFileCache.set(cacheKey, rec);

    if (idbKey && idbEnabled_() && (DASH_CONFIG?.import?.indexedDbStoreHilltopMonthsFromHosted !== false)){
      try{ await idbPut_("hilltop_month", idbKey, rec); }catch(e){ console.warn("IDB month put failed", e); }
    }

    return rec;
  }catch(e){
    console.warn("Archive month fetch failed", path, e);
    return null;
  }
}

function _findHilltopIndexEntry(kind, siteName, measCandidates, monthKey){
  if (!remoteArchive.hilltopIndexMap) return null;
  for (const meas of measCandidates){
    const key = _hilltopIdxKey(kind, siteName, meas, monthKey);
    const ent = remoteArchive.hilltopIndexMap.get(key);
    if (ent) return ent;
  }
  return null;
}

async function remoteFetchHilltopRange_(kind, siteName, measurementName, fromDate, toDate){
  if (!isRemoteArchiveActive()) return null;
  const measCandidates = _buildHilltopMeasCandidates(measurementName);
  const months = _monthKeysForRange(fromDate, toDate);
  const parts = [];

  for (const mm of months){
    const ent = _findHilltopIndexEntry(kind, siteName, measCandidates, mm);
    if (!ent) continue;
    const rec = await remoteFetchHilltopMonthFile_(ent);
    if (!rec) continue;
    const filtered = _filterSeriesByRange(rec, fromDate, toDate);
    if (filtered.times.length) parts.push(filtered);
  }

  if (!parts.length) return null;
  return mergeHilltopSeries(parts);
}

async function remoteFetchHilltopRangeAuto_(siteName, measurementName, fromDate, toDate){
  const kinds = ["river", "groundwater"];
  for (const k of kinds){
    const s = await remoteFetchHilltopRange_(k, siteName, measurementName, fromDate, toDate);
    if (s && Array.isArray(s.values) && s.values.length) return s;
  }
  return null;
}

async function readChunkedListFromHosted_(folderUrl, listKey){
  const base = String(folderUrl || "");
  if (!base) return [];

  const maxChunks = Math.max(1, Number(DASH_CONFIG?.import?.manifestUrlMaxChunks) || 800);
  const delayMs = Math.max(0, Number(DASH_CONFIG?.import?.manifestUrlBetweenChunkDelayMs) || 0);

  const out = [];
  for (let i=0;i<maxChunks;i++){
    const url = base + `chunk_${String(i).padStart(3,"0")}.json`;
    try{
      const payload = await fetchJsonCached(_applyHostedProxyIfNeeded(url), 25000, Infinity, false, "HOSTED_CHUNK|" + url);
      const arr = payload && Array.isArray(payload[listKey]) ? payload[listKey] : [];
      if (arr.length) out.push(...arr);
      if (!payload || !Array.isArray(payload[listKey])) break;
    } catch (e){
      break;
    }
    if (delayMs) await sleep(delayMs);
  }
  return out;
}

async function loadHostedManifestUrl(manifestUrl){
  const url = String(manifestUrl || "").trim();
  if (!url) {
    showToast("Please enter a manifest URL.");
    return;
  }

  if (!DASH_CONFIG?.import?.enableManifestUrlLoad){
    showToast("Manifest URL import is disabled in config.");
    return;
  }

  if (DASH_CONFIG?.import?.clearCachesBeforeLoad){
    clearHistoryCaches();
  }
  clearRemoteArchiveState();

  showToast("Loading hosted manifest…");

  const manifest = await fetchJsonCached(_applyHostedProxyIfNeeded(url), 25000, Infinity, false, "HOSTED_MANIFEST|" + url);
  const baseUrl = _dirFromUrl(url);

  if (!manifest || typeof manifest !== "object" || Number(manifest.schema_version) !== Number(EXPORT_BUNDLE_SCHEMA)){
    console.warn("Manifest schema mismatch or missing. Proceeding anyway.", manifest);
  }

  const locs = await fetchJsonCached(_applyHostedProxyIfNeeded(baseUrl + "locations.json"), 25000, Infinity, false, "HOSTED_LOCATIONS|" + baseUrl);

  const omMeta = await _fetchJsonOrNull(baseUrl + "providers/open_meteo/meta.json", 25000);
  const wxList = await readChunkedListFromHosted_(baseUrl + "providers/open_meteo/forecast/", "wxList");
  const floodList = await readChunkedListFromHosted_(baseUrl + "providers/open_meteo/flood/", "floodList");

  const riverSites = await _fetchJsonOrNull(baseUrl + "providers/nrc/rivers_sites.json", 25000);
  const gwSites = await _fetchJsonOrNull(baseUrl + "providers/nrc/groundwater_sites.json", 25000);
  const riverForLocation = await _fetchJsonOrNull(baseUrl + "providers/nrc/river_for_location.json", 25000);
  const groundwaterForLocation = await _fetchJsonOrNull(baseUrl + "providers/nrc/groundwater_for_location.json", 25000);

  const computedLocations = await _fetchJsonOrNull(baseUrl + "providers/computed_locations.json", 25000);
  const climateDrivers = await _fetchJsonOrNull(baseUrl + "providers/climate_drivers.json", 25000);

  const bundle = {
    schema_version: EXPORT_BUNDLE_SCHEMA,
    created_at: manifest?.created_at || new Date().toISOString(),
    rangeMin: omMeta?.rangeMin ?? null,
    rangeMax: omMeta?.rangeMax ?? null,
    pastDays: omMeta?.pastDays ?? null,
    forecastDays: omMeta?.forecastDays ?? null,
    timeMode: (omMeta?.forecastEndpoint && String(omMeta.forecastEndpoint).includes("historical-forecast")) ? "historic" : "live",
    locations: Array.isArray(locs) ? locs : [],
    wxList: Array.isArray(wxList) ? wxList : [],
    floodList: Array.isArray(floodList) ? floodList : [],
    riverSites: riverSites || null,
    gwSites: gwSites || null,
    riverForLocation: riverForLocation || null,
    groundwaterForLocation: groundwaterForLocation || null,
    computedLocations: computedLocations || null,
    climateDrivers: climateDrivers || null,
    providers: {
      open_meteo: omMeta || null
    }
  };

  const ok = applyLoadedBundle(bundle);
  if (!ok){
    showToast("Hosted manifest load completed, but could not apply the bundle.");
    return;
  }

  remoteArchive.enabled = true;
  remoteArchive.manifestUrl = url;
  remoteArchive.baseUrl = baseUrl;
  remoteArchive.manifest = manifest;
  remoteArchive.loadedAt = new Date().toISOString();

  await initRemoteHilltopIndexFromBase_(baseUrl);

  showToast("Hosted data loaded. Hilltop history will lazy-load from the archive when needed.");
}

function applyLoadedBundle(bundle, options){
  if (!bundle || bundle.schema_version !== EXPORT_BUNDLE_SCHEMA){
    showToast("That file is not a recognised drought dashboard bundle.");
    return false;
  }

  if (Array.isArray(bundle.locations) && bundle.locations.length){
    locations = bundle.locations;
    saveLocations(locations);

    const ta = document.getElementById("locationsJson");
    if (ta) ta.value = JSON.stringify(locations, null, 2);
  }

  if (bundle.state){
    if (bundle.state.timeMode){
      timeMode = bundle.state.timeMode;
    }
    const d = safeDateFromIso(bundle.state.asOfSnapshot);
    if (d) asOfSnapshot = d;

    if (bundle.state.pastDays != null && $("pastDays")) $("pastDays").value = bundle.state.pastDays;
    if (bundle.state.forecastDays != null && $("forecastDays")) $("forecastDays").value = bundle.state.forecastDays;

    selectedId = bundle.state.selectedId || selectedId;

    updateTimeControls();
  }

  const data = bundle.data || {};
  if (data.dataCache){
    restoreDataCache(data.dataCache);
    // Backward compatibility: derive a locations signature if not present in the archive
    ensureCacheLocationsSig();
  }
  if (Array.isArray(data.computed)){
    computed = data.computed;
  }
  if (data.climateDrivers){
    climateDriversCache.fetchedAt = Date.now();
    climateDriversCache.loading = false;
    climateDriversCache.enso = data.climateDrivers.enso || null;
    climateDriversCache.sam = data.climateDrivers.sam || null;
    climateDriversCache.mjo = data.climateDrivers.mjo || null;
    applyClimateDriversToUi();
  }

  if (data.hydroCaches){
    restoreHydroCachesBundle_(data.hydroCaches);
  }

  if (dataCache.wxList && dataCache.wxList.length){
    recomputeFromCache();
  } else {
    renderTable();
    renderMarkers();
    if (computed?.length){
      const first = selectedId && computed.some(r => r.loc.id === selectedId) ? selectedId : computed[0].loc.id;
      if (first) selectLocation(first, false);
    }
    setStatus("Ready");
  }

  document.getElementById("tableHint").textContent = "Loaded from bundle (no provider fetch)";
  showToast("Loaded cached data bundle.");
  return true;
}

function clearLoadedData(){
  dataCache.wxList = null;
  dataCache.floodList = null;
  dataCache.riverHybridForLoc = null;
  dataCache.riverHybridAsOfKey = null;
  try{ if (typeof _NRC_HYBRID_DISCHARGE_CACHE_ !== "undefined" && _NRC_HYBRID_DISCHARGE_CACHE_) _NRC_HYBRID_DISCHARGE_CACHE_.clear(); }catch(_e){}
  dataCache.riverSites = null;
  dataCache.gwSites = null;
  dataCache.riverForLoc = null;
  dataCache.gwForLoc = null;
  dataCache.loadedAt = null;
  dataCache.rangeMin = null;
  dataCache.rangeMax = null;
  dataCache.pastDays = null;
  dataCache.forecastDays = null;

  computed = [];
  selectedId = null;

  climateDriversCache.fetchedAt = 0;
  climateDriversCache.loading = false;
  climateDriversCache.enso = null;
  climateDriversCache.sam = null;
  climateDriversCache.mjo = null;
  applyClimateDriversToUi();

  renderTable();
  renderMarkers();

  document.getElementById("lastUpdated").textContent = "No data loaded";
  document.getElementById("tableHint").textContent = "Press Refresh Data to fetch providers, or Load Data to restore a bundle, or Load ZIP Manifest to restore the split archive.";
  clearRemoteArchiveState();

  showToast("Cleared loaded data.");
}

function parseRetryAfterMs(v){
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  const dt = Date.parse(s);
  if (!isNaN(dt)){
    const ms = dt - Date.now();
    return ms < 0 ? 0 : ms;
  }
  return null;
}

function isLikelyNetworkError(err){
  if (!err) return false;
  if (err.name === "AbortError") return true;
  // TypeError is what fetch throws for many network failures in browsers
  if (err instanceof TypeError) return true;
  const msg = String(err.message || "");
  return /failed to fetch|networkerror|load failed|timed out/i.test(msg);
}

async function fetchJson(url, timeoutMs=20000){
  // Global knobs (optional):
  //   window.NET_MAX_RETRIES (default 6)
  //   window.NET_RETRY_BASE_MS (default 1200)
  //   window.NET_RETRY_MAX_MS (default 60000)
  const isOpenMeteo = /api\.open-meteo\.com/i.test(url);

  const maxRetries = clamp(
    Number(isOpenMeteo ? window.OPEN_METEO_NET_MAX_RETRIES : window.NET_MAX_RETRIES) ||
    (isOpenMeteo ? (DASH_CONFIG.openMeteo && DASH_CONFIG.openMeteo.net && DASH_CONFIG.openMeteo.net.maxRetries) : (DASH_CONFIG.network && DASH_CONFIG.network.maxRetries)) ||
    6,
    0, 24
  );

  const baseDelayMs = clamp(
    Number(isOpenMeteo ? window.OPEN_METEO_NET_RETRY_BASE_MS : window.NET_RETRY_BASE_MS) ||
    (isOpenMeteo ? (DASH_CONFIG.openMeteo && DASH_CONFIG.openMeteo.net && DASH_CONFIG.openMeteo.net.retryBaseMs) : (DASH_CONFIG.network && DASH_CONFIG.network.retryBaseMs)) ||
    1200,
    100, 60000
  );

  const maxDelayMs  = clamp(
    Number(isOpenMeteo ? window.OPEN_METEO_NET_RETRY_MAX_MS : window.NET_RETRY_MAX_MS) ||
    (isOpenMeteo ? (DASH_CONFIG.openMeteo && DASH_CONFIG.openMeteo.net && DASH_CONFIG.openMeteo.net.retryMaxMs) : (DASH_CONFIG.network && DASH_CONFIG.network.retryMaxMs)) ||
    60000,
    1000, 300000
  );
  const retryStatuses = new Set([429, 500, 502, 503, 504, 522, 524]);

  let attempt = 0;
  while (true){
    attempt++;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try{
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });

      if (!res.ok){
        const err = new Error("HTTP " + res.status);
        err.status = res.status;
        err.url = url;

        if (retryStatuses.has(res.status) && attempt <= (maxRetries + 1)){
          const ra = parseRetryAfterMs(res.headers.get("retry-after"));
          const backoff = Math.min(maxDelayMs, Math.round(baseDelayMs * Math.pow(1.8, attempt - 1)));
          const waitMs = ra != null ? Math.max(ra, backoff) : backoff;
          const jitter = Math.round(Math.random() * 400);
          try { setStatus(`Rate limited, backing off (${Math.round((waitMs+jitter)/1000)}s)`); } catch(e){}
          await sleep(waitMs + jitter);
          continue;
        }
        throw err;
      }

      return await res.json();
    } catch (e){
      const status = e && e.status;
      const retryable = retryStatuses.has(status) || isLikelyNetworkError(e);

      if (retryable && attempt <= (maxRetries + 1)){
        const backoff = Math.min(maxDelayMs, Math.round(baseDelayMs * Math.pow(1.8, attempt - 1)));
        const jitter = Math.round(Math.random() * 400);
        try { setStatus(`Network retry (${attempt}/${maxRetries+1})`); } catch(e){}
        await sleep(backoff + jitter);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}




/***********************
 * Open-Meteo Batching (Avoid 414 URI Too Large + Proxy Size Limits)
 ***********************/
function getOpenMeteoDefaults(locCount, pastDays, forecastDays){
  const totalDays = (Number(pastDays) || 0) + (Number(forecastDays) || 0);

  // Defaults
  let batchSize = (DASH_CONFIG.openMeteo && DASH_CONFIG.openMeteo.batchSize) ? DASH_CONFIG.openMeteo.batchSize : 90;
  let betweenBatchDelayMs = 9000;

  // Adaptive rules (first match)
  const rules = (DASH_CONFIG.openMeteo && Array.isArray(DASH_CONFIG.openMeteo.adaptive)) ? DASH_CONFIG.openMeteo.adaptive : [];
  for (const r of rules){
    if (r && locCount >= (Number(r.minLocations) || 0)){
      if (Number.isFinite(Number(r.batchSize))) batchSize = Number(r.batchSize);
      if (Number.isFinite(Number(r.betweenBatchDelayMs))) betweenBatchDelayMs = Number(r.betweenBatchDelayMs);
      break;
    }
  }

  // Flood is optional; keep it off by default for heavy runs
  const floodMaxLocs = (DASH_CONFIG.openMeteo && Number.isFinite(Number(DASH_CONFIG.openMeteo.includeFloodMaxLocations)))
    ? Number(DASH_CONFIG.openMeteo.includeFloodMaxLocations) : 160;
  const floodMaxDays = (DASH_CONFIG.openMeteo && Number.isFinite(Number(DASH_CONFIG.openMeteo.includeFloodMaxTotalDays)))
    ? Number(DASH_CONFIG.openMeteo.includeFloodMaxTotalDays) : 60;

  const includeFloodAuto = (locCount <= floodMaxLocs) && (totalDays <= floodMaxDays);

  const maxUrlLength = (DASH_CONFIG.openMeteo && Number.isFinite(Number(DASH_CONFIG.openMeteo.maxUrlLength)))
    ? Number(DASH_CONFIG.openMeteo.maxUrlLength) : 7000;

  const betweenEndpointDelayMs = (DASH_CONFIG.openMeteo && Number.isFinite(Number(DASH_CONFIG.openMeteo.betweenEndpointDelayMs)))
    ? Number(DASH_CONFIG.openMeteo.betweenEndpointDelayMs) : 450;

  return { batchSize, betweenBatchDelayMs, includeFloodAuto, maxUrlLength, betweenEndpointDelayMs };
}


function _omKeyLatLon(lat, lon){
  const r = (v) => (Math.round(Number(v) * 10000) / 10000).toFixed(4);
  return r(lat) + "," + r(lon);
}

function _omNormaliseToLocOrder(data, locs){
  if (!data) return locs.map(() => null);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === locs.length) return arr;

  const m = new Map();
  for (const d of arr){
    if (d && Number.isFinite(d.latitude) && Number.isFinite(d.longitude)){
      m.set(_omKeyLatLon(d.latitude, d.longitude), d);
    }
  }
  return locs.map(l => m.get(_omKeyLatLon(l.lat, l.lon)) || null);
}

function splitLocationsIntoOpenMeteoBatches(locs, pastDays, forecastDays){
  // User-tunable via global variables if needed:
  //   window.OPEN_METEO_BATCH_SIZE (10–200)
  //   window.OPEN_METEO_MAX_URL_LEN (3000–20000)
  const om = getOpenMeteoDefaults(locs.length, pastDays, forecastDays);
  const maxBatch = clamp(Number(window.OPEN_METEO_BATCH_SIZE) || om.batchSize, 10, 200);
  const maxUrlLen = clamp(Number(window.OPEN_METEO_MAX_URL_LEN) || om.maxUrlLength, 3000, 20000);

  const batches = [];
  let cur = [];

  for (const loc of locs){
    cur.push(loc);

    // Forecast URL is usually the longest; use it as the batching yardstick
    const url = buildForecastUrl(cur, pastDays, forecastDays);

    if (cur.length > maxBatch || url.length > maxUrlLen){
      cur.pop();

      if (cur.length){
        batches.push(cur);
        cur = [loc];
      } else {
        // Extremely unlikely: a single location URL exceeds limits
        batches.push([loc]);
        cur = [];
      }
    }
  }

  if (cur.length) batches.push(cur);
  return batches;
}

// Flood discharge requests can be much heavier than the forecast endpoint.
// We purposely clamp flood lookback/lookahead so:
// - Flood data is still available for river cards + index components
// - We avoid rate-limit pressure when Past/Forecast days are large
function getFloodRequestDays_(pastDays, forecastDays){
  try{
    const basePast = Number(pastDays) || 30;
    const baseFc = Number(forecastDays) || 7;
    const riverLb = Number(droughtConfig?.riverLookbackDays) || 30;

    // Aim to cover river lookback + a small buffer, but do not exceed the main provider window.
    const wantPast = Math.max(7, riverLb + 5);
    const wantFc = 3; // keep small (helps with charts, reduces load)

    return {
      pastDays: clamp(Math.min(basePast, wantPast), 7, 92),
      forecastDays: clamp(Math.min(baseFc, wantFc), 0, 16)
    };
  }catch(_e){
    return {
      pastDays: clamp(Number(pastDays) || 30, 7, 92),
      forecastDays: 3
    };
  }
}

async function fetchOpenMeteoBatched(locs, pastDays, forecastDays){
  const batches = splitLocationsIntoOpenMeteoBatches(locs, pastDays, forecastDays);

  const forecastAll = [];
  const floodAll = [];


  // Open-Meteo throttling and optional flood endpoint
  // You can override these in the browser console:
  //   window.OPEN_METEO_INCLUDE_FLOOD = true|false
  //   window.OPEN_METEO_BETWEEN_BATCH_DELAY_MS = 0..120000
  //   window.OPEN_METEO_BETWEEN_ENDPOINT_DELAY_MS = 0..20000
  const om = getOpenMeteoDefaults(locs.length, pastDays, forecastDays);
  const floodReq = getFloodRequestDays_(pastDays, forecastDays);
  const omFlood = getOpenMeteoDefaults(locs.length, floodReq.pastDays, floodReq.forecastDays);

  const includeFlood = (window.OPEN_METEO_INCLUDE_FLOOD == null)
    ? Boolean(omFlood.includeFloodAuto)
    : Boolean(window.OPEN_METEO_INCLUDE_FLOOD);

  // Delay between batches (large runs need much longer to avoid 429)
  const betweenBatchDelay = clamp(
    Number(window.OPEN_METEO_BETWEEN_BATCH_DELAY_MS) || om.betweenBatchDelayMs,
    0, 120000
  );

  // Delay between forecast and flood endpoints within the same batch
  const betweenEndpointDelay = clamp(
    Number(window.OPEN_METEO_BETWEEN_ENDPOINT_DELAY_MS) || om.betweenEndpointDelayMs,
    0, 20000
  );

  for (let i = 0; i < batches.length; i++){
    const batch = batches[i];

    // Lightweight progress messaging
    const msg = `Loading Open-Meteo (${i+1}/${batches.length})`;
    try { setStatus(msg); } catch(e) {}
    const th = document.getElementById("tableHint");
    if (th) th.textContent = msg + "...";

    const urlForecast = buildForecastUrl(batch, pastDays, forecastDays);
    const urlFlood = buildFloodUrl(batch, floodReq.pastDays, floodReq.forecastDays);

    let forecastData = null;
    let floodData = null;

    // Forecast is required
    forecastData = await fetchJson(urlForecast, 30000);

    // Flood is optional; under large location sets this is auto-disabled to reduce rate-limit pressure
    if (includeFlood){
      if (betweenEndpointDelay) await sleep(betweenEndpointDelay);
      try{
        floodData = await fetchJson(urlFlood, 30000);
      } catch (e){
        floodData = null;
      }
    }

    if (betweenBatchDelay && i < batches.length - 1){
      await sleep(betweenBatchDelay);
    }

    if (!forecastData){
      throw new Error(`Open-Meteo forecast failed (batch ${i+1}/${batches.length}).`);
    }

    const wxArr = _omNormaliseToLocOrder(forecastData, batch);
    const floodArr = floodData ? _omNormaliseToLocOrder(floodData, batch) : batch.map(() => null);

    // Preserve the location order across batches
    for (const d of wxArr) forecastAll.push(d);
    for (const d of floodArr) floodAll.push(d);
  }

  return { forecastData: forecastAll, floodData: floodAll, batchesUsed: batches.length };
}



/***********************
 * Climate Drivers (Best Effort)
 * Best effort fetch of global indices for situational context only.
 ***********************/
const climateDriversCache = {
  fetchedAt: 0,
  loading: false,
  enso: null, // { state, period, year, value }
  sam: null,  // { state, date, value }
  mjo: null   // { state, date, phase, amp, rmm1, rmm2 }
};

async function fetchText(url, timeoutMs=20000){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function jinaWrap(url){
  if (typeof url !== "string") return url;
  if (url.startsWith("https://")) return "https://r.jina.ai/https://" + url.slice("https://".length);
  if (url.startsWith("http://")) return "https://r.jina.ai/http://" + url.slice("http://".length);
  return url;
}

async function fetchTextWithFallback(urls, timeoutMs=15000, predicate=null){
  for (const u of (urls || [])){
    try{
      const txt = await fetchText(u, timeoutMs);
      if (!txt) continue;
      if (txt.trim().length <= 40) continue;
      if (predicate && !predicate(txt)) continue;
      return txt;
    }catch(e){
      // ignore and try next
    }
  }
  return null;
}

function parseEnsoOni(text){
  if (!text) return null;

  const lines = String(text).split(/\r?\n/);
  let last = null;

  for (const ln of lines){
    const s = ln.trim();
    if (!s) continue;
    if (s.startsWith("#")) continue;
    // Header line often starts with "SEAS"
    if (/^(SEAS|YR|Year)\b/i.test(s)) continue;

    const parts = s.split(/\s+/);
    // Expected CPC ONI format: SEAS  YR  TOTAL  ANOM
    if (parts.length < 4) continue;

    const period = parts[0];
    const year = parseInt(parts[1], 10);
    const anom = parseFloat(parts[3]);

    if (!isFinite(year) || year < 1800 || year > 2200) continue;
    if (!isFinite(anom)) continue;

    last = { year, period, value: anom };
  }

  if (!last) return null;

  let state = "Neutral";
  if (last.value >= 0.5) state = "El Niño";
  else if (last.value <= -0.5) state = "La Niña";

  return { ...last, state };
}

function parseSamAao(text){
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  let last = null;

  for (const ln of lines){
    const s = ln.trim();
    if (!s) continue;
    if (s.startsWith("#")) continue;
    if (/^(year|YYYY)\b/i.test(s)) continue;

    const parts = s.split(/\s+/);

    // Monthly format (e.g., PSL AAO): YEAR then ~12 monthly values
    if (parts.length >= 13){
      const y = parseInt(parts[0], 10);
      if (!isFinite(y) || y < 1800 || y > 2200) continue;

      // Find the last usable monthly value on this row
      let found = null;
      for (let i = parts.length - 1; i >= 1; i--){
        const v = parseFloat(parts[i]);
        if (!isFinite(v)) continue;
        // Some files use large negative sentinels for missing values
        if (v <= -90) continue;
        found = { monthIndex: i, value: v };
        break;
      }
      if (found){
        const mth = String(Math.min(12, Math.max(1, found.monthIndex))).padStart(2, "0");
        last = { date: `${y}-${mth}`, value: found.value };
      }
      continue;
    }

    // Daily formats:
    // YYYY MM DD value
    // YYYY MM value
    if (parts.length >= 4){
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const v = parseFloat(parts[3]);
      if (!isFinite(y) || !isFinite(m) || !isFinite(d) || !isFinite(v)) continue;
      last = { date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, value: v };
    } else if (parts.length === 3){
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const v = parseFloat(parts[2]);
      if (!isFinite(y) || !isFinite(m) || !isFinite(v)) continue;
      last = { date: `${y}-${String(m).padStart(2,"0")}`, value: v };
    }
  }

  if (!last) return null;

  let state = "Neutral";
  if (last.value >= 0.5) state = "Positive";
  else if (last.value <= -0.5) state = "Negative";

  return { ...last, state };
}

function mjoPhaseFromRmm(rmm1, rmm2){
  if (!isFinite(rmm1) || !isFinite(rmm2)) return null;
  const ang = Math.atan2(rmm2, rmm1); // -pi..pi
  // Map angle to 8 bins. This is approximate; prefer provided phase if available.
  const norm = (ang + Math.PI) / (2 * Math.PI); // 0..1
  const phase = Math.floor(norm * 8) + 1;
  return Math.min(8, Math.max(1, phase));
}

function parseMjoRmm(text){
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  let last = null;

  for (const ln of lines){
    const s = ln.trim();
    if (!s) continue;
    if (s.startsWith("#")) continue;
    if (/^(year|YYYY)\b/i.test(s)) continue;

    const parts = s.split(/\s+/);
    // Expected: YYYY MM DD RMM1 RMM2 [phase] [amp]
    if (parts.length < 5) continue;

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const rmm1 = parseFloat(parts[3]);
    const rmm2 = parseFloat(parts[4]);
    if (![y,m,d,rmm1,rmm2].every(isFinite)) continue;

    let phase = null;
    let amp = null;

    if (parts.length >= 6){
      const p = parseInt(parts[5], 10);
      if (isFinite(p) && p >= 1 && p <= 8) phase = p;
    }
    if (parts.length >= 7){
      const a = parseFloat(parts[6]);
      if (isFinite(a)) amp = a;
    }
    if (amp == null){
      amp = Math.sqrt(rmm1*rmm1 + rmm2*rmm2);
    }
    if (phase == null){
      phase = mjoPhaseFromRmm(rmm1, rmm2);
    }

    last = {
      date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`,
      rmm1, rmm2,
      phase,
      amp
    };
  }

  if (!last) return null;

  const active = last.amp >= 1.0;
  const state = active ? "Active" : "Weak";

  return { ...last, state };
}

function fmtShortDateTime(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString(undefined, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
  }catch{
    return "";
  }
}


function dateStrToMs(s){
  if (!s) return NaN;
  const str = String(s).trim();
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)){
    return Date.parse(str + "-15T00:00:00Z");
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)){
    return Date.parse(str + "T00:00:00Z");
  }
  return Date.parse(str);
}

function daysSinceDateStr(s){
  const ms = dateStrToMs(s);
  if (!isFinite(ms)) return Infinity;
  return (Date.now() - ms) / 86400000;
}

function setTagInner(id, html){
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function buildDriverTag(kind, data){
  const loading = climateDriversCache.loading && !data;
  const unavailable = !loading && !data;

  let dot = "var(--ok)";
  let label = "";
  let detail = "";

  if (loading){
    label = "Loading";
    dot = "var(--ok)";
  } else if (unavailable){
    label = "Unavailable";
    dot = "var(--ok)";
  } else if (kind === "enso"){
    label = data.state || "Neutral";
    detail = `${data.period || "-"} ${data.year || ""} ${fmt(data.value, 2)}`;
    if (data.state === "Stale") dot = "var(--warn)";
    else if (data.state === "El Niño") dot = "var(--warn)";
    else if (data.state === "La Niña") dot = "var(--watch)";
    else dot = "var(--ok)";
  } else if (kind === "sam"){
    label = data.state || "Neutral";
    detail = `${data.date || "-"} ${fmt(data.value, 2)}`;
    if (data.state === "Stale") dot = "var(--warn)";
    else if (data.state === "Negative") dot = "var(--warn)";
    else if (data.state === "Positive") dot = "var(--watch)";
    else dot = "var(--ok)";
  } else if (kind === "mjo"){
    label = data.state || "Weak";
    detail = `P${data.phase || "-"} A${fmt(data.amp, 1)} ${data.date || "-"}`;
    if (data.state === "Stale") dot = "var(--warn)";
    else if (data.state === "Active") dot = "var(--watch)";
    else dot = "var(--ok)";
  }

  const detailHtml = detail ? ` <span class="muted mono" style="font-weight:500;">${escapeHtml(detail)}</span>` : "";
  return `<span class="dot" style="background:${dot};"></span>${escapeHtml(kind.toUpperCase())}: <span class="mono">${escapeHtml(label)}</span>${detailHtml}`;
}



function strengthLabelFromAbs(absV){
  if (absV == null || !isFinite(absV)) return "Unknown";
  if (absV >= 1.5) return "Strong";
  if (absV >= 1.0) return "Moderate";
  if (absV >= 0.5) return "Weak";
  return "Near-neutral";
}

function buildEnsoExplain(enso){
  if (!enso){
    return climateDriversCache.loading ? "Loading ENSO background signal." : "ENSO is unavailable. The dashboard continues without this context layer.";
  }
  const v = enso.value;
  const absV = Math.abs(v);
  const strength = strengthLabelFromAbs(absV);
  const state = enso.state || "Unknown";
  let impact = "";
  if (state === "La Niña"){
    impact = "La Niña can increase the chance of humid northeasterly setups and subtropical moisture influence in the Far North.";
  }else if (state === "El Niño"){
    impact = "El Niño can increase the chance of westerly driven patterns, which may reduce humid northeasterly moisture setups in the Far North.";
  }else{
    impact = "Neutral ENSO means local weather is more controlled by synoptic highs, fronts, and shorter-lived moisture events.";
  }
  const season = enso.season ? ` ${enso.season}` : "";
  const yr = enso.year != null ? ` ${enso.year}` : "";
  const valTxt = (v == null || !isFinite(v)) ? "" : ` (ONI ${fmt(v,2)})`;
  return `${strength} ${state}${season}${yr}${valTxt}. ${impact} Treat this as seasonal background, not a local forecast.`;
}

function buildSamExplain(sam){
  if (!sam){
    return climateDriversCache.loading ? "Loading SAM background signal." : "SAM is unavailable. The dashboard continues without this context layer.";
  }
  const v = sam.value;
  const absV = Math.abs(v);
  const strength = strengthLabelFromAbs(absV);
  const state = sam.state || "Unknown";
  let impact = "";
  if (state === "Positive"){
    impact = "Positive SAM often indicates the mid-latitude westerly belt is shifted south, which can reduce the frequency of typical westerly fronts reaching NZ.";
  }else if (state === "Negative"){
    impact = "Negative SAM often indicates the westerly belt is shifted north, which can increase the frequency of frontal systems and windier change periods.";
  }else{
    impact = "Neutral SAM suggests no strong hemisphere-scale push on the westerly belt.";
  }
  const dateTxt = sam.date ? ` (${sam.date})` : "";
  const valTxt = (v == null || !isFinite(v)) ? "" : ` ${fmt(v,2)}`;
  return `${strength} ${state} SAM${dateTxt}, index${valTxt}. ${impact} Use alongside local pressure and wind signals.`;
}

function mjoPhaseRegion(phase){
  const p = parseInt(phase, 10);
  if (![1,2,3,4,5,6,7,8].includes(p)) return "Unknown region";
  if (p === 1) return "Western Indian Ocean";
  if (p === 2) return "Eastern Indian Ocean";
  if (p === 3) return "Maritime Continent (west)";
  if (p === 4) return "Maritime Continent";
  if (p === 5) return "Maritime Continent (east)";
  if (p === 6) return "Western Pacific";
  if (p === 7) return "Central Pacific";
  return "Western Hemisphere and Africa";
}

function buildMjoExplain(mjo){
  if (!mjo){
    return climateDriversCache.loading ? "Loading MJO activity signal." : "MJO is unavailable or stale. The dashboard continues without this context layer.";
  }
  const amp = mjo.amp;
  const phase = mjo.phase;
  const dateTxt = mjo.date ? ` (${mjo.date})` : "";
  const region = mjoPhaseRegion(phase);
  const ampTxt = (amp == null || !isFinite(amp)) ? "" : ` amplitude ${fmt(amp,2)}`;
  if (mjo.state === "Weak" || (amp != null && isFinite(amp) && amp < 1.0)){
    return `Weak MJO${dateTxt}, phase ${phase} in ${region}${ampTxt}. When the MJO is weak, it usually has limited direct influence on NZ rainfall patterns.`;
  }
  return `Active MJO${dateTxt}, phase ${phase} in ${region}${ampTxt}. As it propagates, it can support or suppress subtropical moisture pathways, so watch for alignment with local pressure and wind trends.`;
}

function pctText(frac){
  if (frac == null || !isFinite(frac)) return "-";
  return `${Math.round(frac * 100)}%`;
}

function plumeComponentLabel(kind, v){
  if (v == null || !isFinite(v)) return "Unknown";
  if (kind === "neFrac"){
    if (v >= 0.45) return "High";
    if (v >= 0.20) return "Moderate";
    return "Low";
  }
  if (kind === "rh"){
    if (v >= 78) return "Humid";
    if (v >= 68) return "Moderate";
    return "Dry";
  }
  if (kind === "vpd"){
    if (v <= 0.8) return "Low Drying";
    if (v <= 1.2) return "Moderate Drying";
    return "High Drying";
  }
  if (kind === "dp"){
    if (v <= -1.0) return "Falling";
    if (v >= 1.0) return "Rising";
    return "Steady";
  }
  if (kind === "rain3"){
    if (v >= 20) return "High";
    if (v >= 8) return "Moderate";
    return "Low";
  }
  return "Unknown";
}

function buildPlumeExplainText(sig){
  if (!sig){
    return "Plume signal is unavailable for this selection.";
  }
  const score = sig.score;
  const label = sig.label || (score == null ? "-" : ((score >= 75) ? "High" : (score >= 55) ? "Elevated" : (score >= 35) ? "Possible" : "Low"));
  const neTxt = (sig.neFrac == null) ? "-" : `${pctText(sig.neFrac)} ${plumeComponentLabel("neFrac", sig.neFrac)}`;
  const rhTxt = (sig.rhMean == null) ? "-" : `${fmt(sig.rhMean,0)}% ${plumeComponentLabel("rh", sig.rhMean)}`;
  const vpdTxt = (sig.vpdMean == null) ? "-" : `${fmt(sig.vpdMean,2)} kPa ${plumeComponentLabel("vpd", sig.vpdMean)}`;
  const dpTxt = (sig.dp == null) ? "-" : `${fmt(sig.dp,1)} hPa/24h ${plumeComponentLabel("dp", sig.dp)}`;
  const rainTxt = (sig.rain3 == null) ? "-" : `${fmt(sig.rain3,1)} mm ${plumeComponentLabel("rain3", sig.rain3)}`;

  const scoreTxt = (score == null || !isFinite(score)) ? "-" : `${fmt(score,0)}/100`;
  const headline = `Plume is ${label} (${scoreTxt}).`;
  const detail = `NE flow ${neTxt}. Humidity ${rhTxt}. VPD ${vpdTxt}. Pressure tendency ${dpTxt}. Forecast rain next 3 days ${rainTxt}.`;
  let guidance = "";
  if (label === "High" || label === "Elevated"){
    guidance = "This combination is more supportive of a subtropical moisture feed. Watch for increasing rain and humidity changes.";
  }else if (label === "Possible"){
    guidance = "Some supporting signals are present, but the setup is not strong. Monitor for strengthening NE flow and pressure falls.";
  }else{
    guidance = "Signals for a subtropical plume are limited right now. Local drying factors may dominate unless forecast rain increases.";
  }
  return `${headline} ${detail} ${guidance}`;
}

function applyClimateDriversToUi(){
  // District tags
  setTagInner("districtEnsoTag", buildDriverTag("enso", climateDriversCache.enso));
  setTagInner("districtSamTag", buildDriverTag("sam", climateDriversCache.sam));
  setTagInner("districtMjoTag", buildDriverTag("mjo", climateDriversCache.mjo));

  // Location detail tags
  setTagInner("locEnsoTag", buildDriverTag("enso", climateDriversCache.enso));
  setTagInner("locSamTag", buildDriverTag("sam", climateDriversCache.sam));
  setTagInner("locMjoTag", buildDriverTag("mjo", climateDriversCache.mjo));

  const meta = climateDriversCache.fetchedAt
    ? `Sources: CPC ONI, CPC AAO, BoM RMM. Updated ${fmtShortDateTime(climateDriversCache.fetchedAt)}`
    : `Sources: CPC ONI, CPC AAO, BoM RMM`;

  setText("districtDriversMeta", meta);
  setText("locDriversMeta", meta);

  // Explanations
  setText("districtExplainEnso", buildEnsoExplain(climateDriversCache.enso));
  setText("districtExplainSam", buildSamExplain(climateDriversCache.sam));
  setText("districtExplainMjo", buildMjoExplain(climateDriversCache.mjo));

  setText("locExplainEnso", buildEnsoExplain(climateDriversCache.enso));
  setText("locExplainSam", buildSamExplain(climateDriversCache.sam));
  setText("locExplainMjo", buildMjoExplain(climateDriversCache.mjo));
}

async function ensureClimateDriversFetched(force=false){
  const maxAgeMs = 6 * 60 * 60 * 1000;

  if (!force && climateDriversCache.fetchedAt && (Date.now() - climateDriversCache.fetchedAt) < maxAgeMs){
    return climateDriversCache;
  }
  if (climateDriversCache.loading){
    return climateDriversCache;
  }

  climateDriversCache.loading = true;
  applyClimateDriversToUi();

  const bustKey = Date.now();
  const bust = (u) => u + (u.includes("?") ? "&" : "?") + "_=" + bustKey;

  // Prefer direct sources, then fall back to proxy wrappers for CORS resilience
  const ensoBase = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
  const samBaseA = "https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.aao.index.b790101.current.ascii";
  const samBaseB = "https://psl.noaa.gov/data/correlation/aao.data";
  const mjoBase  = "https://www.bom.gov.au/climate/mjo/graphics/rmm.74toRealtime.txt";

  const ensoUrls = [
    bust(ensoBase),
    ensoBase,
    jinaWrap(bust(ensoBase)),
    jinaWrap(ensoBase),
    "https://corsproxy.io/?" + encodeURIComponent(bust(ensoBase))
  ];

  const samUrls = [
    bust(samBaseA),
    samBaseA,
    jinaWrap(bust(samBaseA)),
    jinaWrap(samBaseA),
    "https://corsproxy.io/?" + encodeURIComponent(bust(samBaseA)),
    bust(samBaseB),
    samBaseB,
    jinaWrap(bust(samBaseB)),
    jinaWrap(samBaseB),
    "https://corsproxy.io/?" + encodeURIComponent(bust(samBaseB))
  ];

  const mjoUrls = [
    bust(mjoBase),
    mjoBase,
    jinaWrap(bust(mjoBase)),
    jinaWrap(mjoBase),
    "https://corsproxy.io/?" + encodeURIComponent(bust(mjoBase))
  ];

  const looksLikeOni = (t) => /\bSEAS\b/i.test(t) && /\bANOM\b/i.test(t);
  const looksLikeAao = (t) => /\b\d{4}\s+\d{1,2}\s+\d{1,2}\s+[-+]?\d*\.?\d+/.test(t) || /\bAAO\b/i.test(t);
  const looksLikeRmm = (t) => /\bRMM1\b/i.test(t) || /\byear\s+month\s+day\b/i.test(t);

  try{
    const [ensoTxt, samTxt, mjoTxt] = await Promise.all([
      fetchTextWithFallback(ensoUrls, 16000, looksLikeOni),
      fetchTextWithFallback(samUrls, 16000, looksLikeAao),
      fetchTextWithFallback(mjoUrls, 16000, looksLikeRmm)
    ]);

    let enso = parseEnsoOni(ensoTxt);
    let sam = parseSamAao(samTxt);
    let mjo = parseMjoRmm(mjoTxt);

    // Freshness guard so we never show very old values as if they are current
    const nowYear = new Date().getUTCFullYear();
    if (enso && enso.year != null && enso.year < (nowYear - 2)) enso = null;
    if (sam && daysSinceDateStr(sam.date) > 60) sam = null;
    if (mjo && daysSinceDateStr(mjo.date) > 30) mjo = null;

    climateDriversCache.fetchedAt = Date.now();
    climateDriversCache.enso = enso || null;
    climateDriversCache.sam = sam || null;
    climateDriversCache.mjo = mjo || null;
  }catch(e){
    // Keep prior values (if any) but stop loading
  }finally{
    climateDriversCache.loading = false;
    applyClimateDriversToUi();
  }

  return climateDriversCache;
}



/***********************
 * NRC River Data
 ***********************/
// NRC river map points feed (your emergency map uses the same pattern).
// If you already have a proxy, set window.NRC_RIVERS_URL before this script runs.
const DEFAULT_NRC_RIVERS_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://env.gurudigital.nz/WebApi/GetMapPoints/2?collectionId=19");

const NRC_RIVERS_URL =
  (typeof window !== "undefined" &&
    typeof window.NRC_RIVERS_URL === "string" &&
    window.NRC_RIVERS_URL.trim())
    ? window.NRC_RIVERS_URL.trim()
    : DEFAULT_NRC_RIVERS_URL;

const NRC_RIVER_MAX_DISTANCE_KM =
  (typeof window !== "undefined" &&
    window.NRC_RIVER_MAX_DISTANCE_KM != null &&
    isFinite(Number(window.NRC_RIVER_MAX_DISTANCE_KM)))
    ? Number(window.NRC_RIVER_MAX_DISTANCE_KM)
    : 10;




/***********************
 * NRC Groundwater Data
 ***********************/
// NRC continuous groundwater map points feed (collectionId=30).
// You can override by setting window.NRC_GW_URL before this script runs.
const DEFAULT_NRC_GW_URL =
  "https://corsproxy.io/?url=" +
  encodeURIComponent("https://env.gurudigital.nz/WebApi/GetMapPoints/2?collectionId=30");

const NRC_GW_URL =
  (typeof window !== "undefined" &&
    typeof window.NRC_GW_URL === "string" &&
    window.NRC_GW_URL.trim())
    ? window.NRC_GW_URL.trim()
    : DEFAULT_NRC_GW_URL;

const NRC_GW_MAX_DISTANCE_KM =
  (typeof window !== "undefined" &&
    window.NRC_GW_MAX_DISTANCE_KM != null &&
    isFinite(Number(window.NRC_GW_MAX_DISTANCE_KM)))
    ? Number(window.NRC_GW_MAX_DISTANCE_KM)
    : 10;

function normaliseNrcGroundwaterSite(site){
  if (!site) return null;

  const title = site.DisplayName || site.Name || "Groundwater site";
  const primary = site.PrimaryMeasurement || null;
  const primaryValue = site.PrimaryValue || null;

  const level = primaryValue && primaryValue.Value != null ? Number(primaryValue.Value) : null;
  const levelUnits = primary && primary.Units ? String(primary.Units) : "";
  const levelMeasName = primary ? (primary.Name || primary.Measurement || primary.MeasurementName || primary.Label || primary.Code || null) : null;

  const levelWhen =
    primaryValue && (primaryValue.FormattedTime || primaryValue.FormattedDate)
      ? `${primaryValue.FormattedTime || ""} ${primaryValue.FormattedDate || ""}`.trim()
      : "";

  const hilltopBase =
    (site.DataServerUrl && site.DataEndPointName)
      ? `${site.DataServerUrl}/${site.DataEndPointName}?Service=Hilltop&Request=GetData`
      : NRC_HILLTOP_BASE;

  return {
    id: site.Id != null ? String(site.Id) : "",
    name: site.Name || title,
    title,
    lat: site.Latitude,
    lon: site.Longitude,
    level,
    levelUnits,
    levelMeasName,
    levelWhen,
    measurementId: primary && primary.Id != null ? String(primary.Id) : "",
    hilltopBase
  };
}

function pickNearestGroundwaterSite(loc, sites){
  if (!Array.isArray(sites) || !sites.length) return null;

  let best = null;
  let bestD = Infinity;

  for (const s of sites){
    if (!s || !s.HasLocation || s.Latitude == null || s.Longitude == null) continue;
    const d = haversineKm(loc.lat, loc.lon, Number(s.Latitude), Number(s.Longitude));
    if (d < bestD){
      bestD = d;
      best = s;
    }
  }

  if (!best || !isFinite(bestD)) return null;
  if (bestD > NRC_GW_MAX_DISTANCE_KM) return null;
  return { site: normaliseNrcGroundwaterSite(best), distanceKm: bestD };
}

function formatGroundwaterShort(gw){
  if (!gw || !gw.site) return "-";
  const s = gw.site;
  if (s.level != null && isFinite(s.level)){
    return `${fmt(s.level, 3)} ${s.levelUnits || ""}`.trim();
  }
  return "-";
}

function buildGroundwaterGaugeHtml(gw){
  if (!gw || !gw.site){
    return `Groundwater Level: <strong class="mono">-</strong><br/>`;
  }

  const s = gw.site;
  const title = escapeHtml(s.title || "Groundwater site");
  const dist = isFinite(gw.distanceKm) ? `${fmt(gw.distanceKm, 1)} km` : "";
  const distPart = dist ? `, ${dist}` : "";

  let html = `Groundwater Level: <strong class="mono">${escapeHtml(formatGroundwaterShort(gw))}</strong> <span class="muted">(${title}${distPart})</span><br/>`;

  if (s.levelWhen){
    html += `<span class="tiny muted">Reading Time: ${escapeHtml(s.levelWhen)}</span><br/>`;
  }

  return html;
}


function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parsePercent(value){
  if (value == null) return null;
  const m = String(value).match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function normaliseNrcRiverSite(site){
  if (!site) return null;

  const title = site.DisplayName || site.Name || "River site";
  const primary = site.PrimaryMeasurement || null;
  const secondary = site.SecondaryMeasurement || null;
  const primaryValue = site.PrimaryValue || null;
  const secondaryValue = site.SecondaryValue || null;

  const level = primaryValue && primaryValue.Value != null ? Number(primaryValue.Value) : null;
  const levelUnits = primary && primary.Units ? String(primary.Units) : "";
  const levelMeasName = primary ? (primary.Name || primary.Measurement || primary.MeasurementName || primary.Label || primary.Code || null) : null;
  const levelWhen =
    primaryValue && (primaryValue.FormattedTime || primaryValue.FormattedDate)
      ? `${primaryValue.FormattedTime || ""} ${primaryValue.FormattedDate || ""}`.trim()
      : "";

  const flow = secondaryValue && secondaryValue.Value != null ? Number(secondaryValue.Value) : null;
  const flowUnits = secondary && secondary.Units ? String(secondary.Units) : "";
  const flowMeasName = secondary ? (secondary.Name || secondary.Measurement || secondary.MeasurementName || secondary.Label || secondary.Code || null) : null;
  const flowWhen =
    secondaryValue && (secondaryValue.FormattedTime || secondaryValue.FormattedDate)
      ? `${secondaryValue.FormattedTime || ""} ${secondaryValue.FormattedDate || ""}`.trim()
      : "";

  const droughtInfo = site.DroughtInfo || null;
  const percentDiffDMF = droughtInfo ? parsePercent(droughtInfo.PercentDiffDMF) : null;

  const trend = site.Icon && site.Icon.Name ? String(site.Icon.Name) : "";
  const summaryHtml = site.Summary || "";

  return {
    title,
    siteName: (site.Name || site.SiteName || site.DisplayName || title),
    level,
    levelUnits,
    levelMeasName,
    levelWhen,
    flow,
    flowUnits,
    flowMeasName,
    flowWhen,
    percentDiffDMF,
    malfText: droughtInfo && droughtInfo.MALFText ? String(droughtInfo.MALFText) : "",
    dmfText: droughtInfo && droughtInfo.DMFText ? String(droughtInfo.DMFText) : "",
    trend,
    summaryHtml,
    lat: site.Latitude,
    lon: site.Longitude
  };
}

// Picks the nearest NRC river site to a drought location.
// Returns { site: { ...normalised }, distanceKm } or null.
function pickNearestRiverSite(loc, sites){
  if (!Array.isArray(sites) || !sites.length) return null;

  let best = null;
  let bestD = Infinity;

  for (const s of sites){
    if (!s || !s.HasLocation || s.Latitude == null || s.Longitude == null) continue;
    const d = haversineKm(loc.lat, loc.lon, Number(s.Latitude), Number(s.Longitude));
    if (d < bestD){
      bestD = d;
      best = s;
    }
  }

  if (!best || !isFinite(bestD)) return null;
  if (bestD > NRC_RIVER_MAX_DISTANCE_KM) return null;
  return { site: normaliseNrcRiverSite(best), distanceKm: bestD };
}

function formatRiverShort(river){
  if (!river || !river.site) return "-";
  const s = river.site;

  if (s.flow != null && isFinite(s.flow)){
    return `${fmt(s.flow, 2)} ${s.flowUnits || ""}`.trim();
  }
  if (s.level != null && isFinite(s.level)){
    return `${fmt(s.level, 2)} ${s.levelUnits || ""}`.trim();
  }
  return "-";
}

function buildRiverGaugeHtml(river){
  if (!river || !river.site){
    return `River Gauge: <strong class="mono">-</strong><br/>`;
  }

  const s = river.site;
  const title = escapeHtml(s.title || "River site");
  const dist = isFinite(river.distanceKm) ? `${fmt(river.distanceKm, 1)} km` : "";
  const distPart = dist ? `, ${dist}` : "";

  let html = `River Gauge: <strong class="mono">${escapeHtml(formatRiverShort(river))}</strong> <span class="muted">(${title}${distPart})</span><br/>`;

  if (s.flowWhen){
    html += `<span class="tiny muted">Flow Time: ${escapeHtml(s.flowWhen)}</span><br/>`;
  } else if (s.levelWhen){
    html += `<span class="tiny muted">Level Time: ${escapeHtml(s.levelWhen)}</span><br/>`;
  }

  if (s.percentDiffDMF != null && isFinite(s.percentDiffDMF)){
    const sign = s.percentDiffDMF > 0 ? "+" : "";
    html += `<span class="tiny muted">Relative to DMF: ${sign}${fmt(s.percentDiffDMF, 0)}%</span><br/>`;
  }

  return html;
}






/***********************
 * NRC Hilltop River History
 ***********************/
// Hilltop GetData endpoint. History is pulled per location for the nearest river gauge.
// Override proxy by setting window.NRC_HILLTOP_PROXY_PREFIX before this script runs.
// Examples:
// window.NRC_HILLTOP_PROXY_PREFIX = "https://corsproxy.io/?url=";
// window.NRC_HILLTOP_PROXY_PREFIX = "https://api.allorigins.win/raw?url=";
// window.NRC_HILLTOP_PROXY_PREFIX = "https://your-proxy.example/fetch?url={url}";
const NRC_HILLTOP_BASE = "https://hilltop.nrc.govt.nz/data.hts?Service=Hilltop&Request=GetData";

function hilltopProxyWrap(rawUrl){
  const prefix =
    (typeof window !== "undefined" &&
      typeof window.NRC_HILLTOP_PROXY_PREFIX === "string" &&
      window.NRC_HILLTOP_PROXY_PREFIX.trim())
      ? window.NRC_HILLTOP_PROXY_PREFIX.trim()
      : (DASH_CONFIG.hilltop && typeof DASH_CONFIG.hilltop.proxyPrefix === "string" && DASH_CONFIG.hilltop.proxyPrefix.trim())
      ? DASH_CONFIG.hilltop.proxyPrefix.trim()
      : "https://corsproxy.io/?url=";

  if (!prefix) return rawUrl;

  const enc = encodeURIComponent(rawUrl);
  if (prefix.includes("{url}")) return prefix.replace("{url}", enc);
  return prefix + enc;
}

// Format "YYYY-MM-DD HH:mm" in Pacific/Auckland, which matches the Apps Script monitor pattern.
function formatAuckland(dt){
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(dt);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
}

function findHilltopDataArray(obj){
  if (!obj) return null;

  if (Array.isArray(obj)){
    if (obj.length && typeof obj[0] === "object" && obj[0] && ("t" in obj[0] || "T" in obj[0]) && ("v" in obj[0] || "V" in obj[0])) return obj;
    for (const it of obj){
      const found = findHilltopDataArray(it);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj !== "object") return null;

  if (Array.isArray(obj.Data) && obj.Data.length) return obj.Data;

  for (const k of Object.keys(obj)){
    const found = findHilltopDataArray(obj[k]);
    if (found) return found;
  }
  return null;
}

function parseHilltopSeries(json){
  const arr = findHilltopDataArray(json) || [];
  const times = [];
  const values = [];
  for (const p of arr){
    if (!p || typeof p !== "object") continue;
    const t = p.t ?? p.T ?? p.time ?? p.Time ?? null;
    const v = p.v ?? p.V ?? p.value ?? p.Value ?? null;
    const num = v == null ? null : Number(v);
    if (!isFinite(num) || !t) continue;
    times.push(String(t));
    values.push(num);
  }
  // Ensure ascending time order if the feed is reversed
  if (times.length >= 2 && times[0] > times[times.length - 1]){
    times.reverse();
    values.reverse();
  }
  return { times, values };
}

const riverHistoryCache = new Map();
const gwHistoryCache = new Map();
// Hilltop Range Cache
// Goal: avoid re-downloading Hilltop history when the user changes UI options.
// We cache raw Hilltop series per (site, measurement) and lazily extend the cached window when needed.
// Refresh will clear these caches.
const hilltopRangeCache = new Map(); // key: HT|siteName||measName -> { fromMs, toMs, series, inflight }

function _hilltopKey_(siteName, measName){
  const s = String(siteName || "").trim().toLowerCase();
  const m = String(measName || "")
    .trim()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `HT|${s}||${m}`;
}

function tryGetHilltopRangeCachedSeries_(siteName, measurementName, fromDate, toDate){
  try{
    const from = _safeDateAny_(fromDate);
    const to = _safeDateAny_(toDate);
    if (!from || !to) return null;

    const candidates = (typeof _buildHilltopMeasCandidates === "function")
      ? _buildHilltopMeasCandidates(measurementName)
      : [measurementName];

    for (const meas of candidates){
      const key = _hilltopKey_(siteName, meas);
      const ent = hilltopRangeCache.get(key);
      if (!ent || !ent.series || !Array.isArray(ent.series.values) || !Array.isArray(ent.series.times)) continue;

      const coverFrom = Number(ent.coverFromMs || 0);
      const coverTo = Number(ent.coverToMs || 0);
      if (!coverFrom || !coverTo) continue;

      if (coverFrom <= from.getTime() && coverTo >= to.getTime()){
        const clipped = _filterSeriesByRange(ent.series, from, to);
        if (clipped && Array.isArray(clipped.values) && clipped.values.length){
          return { times: clipped.times, values: clipped.values, measurementName: meas };
        }
      }
    }
  }catch(_e){}
  return null;
}


/***********************
 * Generic Provider JSON Cache
 ***********************/
// Used to prevent unnecessary pulls when UI options change.
// - Cache is in-memory only (cleared on Refresh / hard reset).
// - ttlMs can be Infinity for session-long caching.
// - force=true bypasses cache and performs a fresh pull.
var providerJsonCache = new Map(); // key -> { fetchedAt, value, inflight }

function _providerJsonKey_(url, keyOverride){
  if (keyOverride) return String(keyOverride);
  return "URL|" + String(url || "");
}

function clearProviderJsonCache(){
  try{ providerJsonCache.clear(); }catch(e){}
}

async function fetchJsonCached(url, timeoutMs=20000, ttlMs=Infinity, force=false, keyOverride=null){
  if (!providerJsonCache || typeof providerJsonCache.get !== "function"){ providerJsonCache = new Map(); }
  const key = _providerJsonKey_(url, keyOverride);
  const now = Date.now();
  const rec = providerJsonCache.get(key);

  const hasTtl = (ttlMs != null && isFinite(ttlMs) && ttlMs > 0) || (ttlMs === Infinity);

  if (!force && rec && rec.value !== undefined && rec.fetchedAt && isFinite(rec.fetchedAt) && hasTtl){
    if (ttlMs === Infinity || (now - rec.fetchedAt) <= ttlMs){
      return rec.value;
    }
  }

  if (!force && rec && rec.inflight){
    return rec.inflight;
  }

  const inflight = (async()=>{
    try{
      const v = await fetchJson(url, timeoutMs);
      providerJsonCache.set(key, { fetchedAt: Date.now(), value: v, inflight: null });
      return v;
    }catch(e){
      const cur = providerJsonCache.get(key) || {};
      providerJsonCache.set(key, { fetchedAt: cur.fetchedAt || 0, value: cur.value, inflight: null });
      throw e;
    }
  })();

  providerJsonCache.set(key, { fetchedAt: (rec && rec.fetchedAt) ? rec.fetchedAt : 0, value: rec ? rec.value : undefined, inflight });
  return inflight;
}

function canonicalizeHilltopSeries_(series){
  const out = { times: [], values: [] };
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return out;

  const map = new Map(); // ms -> value (last wins)
  const n = Math.min(series.times.length, series.values.length);

  for (let i=0;i<n;i++){
    const d = parseHilltopTimeToDate(series.times[i]);
    if (!d) continue;
    const ms = d.getTime();
    const v = series.values[i];
    if (v == null || !isFinite(v)) continue;
    map.set(ms, Number(v));
  }

  const entries = Array.from(map.entries());
  entries.sort((a,b)=>a[0]-b[0]);

  for (const [ms, v] of entries){
    out.times.push(new Date(ms).toISOString());
    out.values.push(v);
  }
  return out;
}

function clipHilltopSeriesToRange_(series, fromDate, toDate){
  const out = { times: [], values: [] };
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return out;

  const fromMs = (fromDate instanceof Date ? fromDate : new Date(fromDate)).getTime();
  const toMs   = (toDate   instanceof Date ? toDate   : new Date(toDate)).getTime();
  if (!isFinite(fromMs) || !isFinite(toMs)) return out;

  const n = Math.min(series.times.length, series.values.length);
  for (let i=0;i<n;i++){
    const d = parseHilltopTimeToDate(series.times[i]);
    if (!d) continue;
    const ms = d.getTime();
    if (ms < fromMs || ms > toMs) continue;
    const v = series.values[i];
    if (v == null || !isFinite(v)) continue;
    out.times.push(series.times[i]);
    out.values.push(Number(v));
  }
  return out;
}

async function fetchHilltopRangeChunked_(siteName, measurementName, fromDate, toDate){
  const DAY_MS = 24*60*60*1000;
  const from = (fromDate instanceof Date ? fromDate : new Date(fromDate));
  const to = (toDate instanceof Date ? toDate : new Date(toDate));
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return { times: [], values: [] };

  // Same chunking controls as fetchRiverHistory
  const maxDaysPerCall = clamp(
    Number(window.HILLTOP_MAX_DAYS_PER_CALL) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.maxDaysPerCall) || 31,
    5, 120
  );
  const overlapHours = clamp(
    Number(window.HILLTOP_CHUNK_OVERLAP_HOURS) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.chunkOverlapHours) || 1,
    0, 6
  );
  const betweenChunkDelay = clamp(
    Number(window.HILLTOP_BETWEEN_CHUNK_DELAY_MS) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.betweenChunkDelayMs) || 200,
    0, 20000
  );

  const totalDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));
  if (totalDays <= maxDaysPerCall){
    return await _fetchRiverHistoryRange(siteName, measurementName, from, to);
  }

  const overlapMs = overlapHours * 3600000;
  const parts = [];

  let chunkStart = new Date(from.getTime());
  let safety = 0;

  while (chunkStart < to && safety < 1000){
    const chunkEndMs = Math.min(to.getTime(), chunkStart.getTime() + (maxDaysPerCall * DAY_MS));
    const chunkEnd = new Date(chunkEndMs);

    const cFrom = new Date(Math.max(from.getTime(), chunkStart.getTime() - overlapMs));
    const cTo = new Date(Math.min(to.getTime(), chunkEnd.getTime() + overlapMs));

    const s = await _fetchRiverHistoryRange(siteName, measurementName, cFrom, cTo);
    if (s && s.values && s.values.length) parts.push(s);

    chunkStart = new Date(chunkEndMs);
    safety++;

    if (betweenChunkDelay && chunkStart < to){
      await sleep(betweenChunkDelay);
    }
  }

  return mergeHilltopSeries(parts);
}

async function ensureHilltopRangeCachedSeries_(siteName, measName, fromDate, toDate){
  const key = _hilltopKey_(siteName, measName);

  const from = (fromDate instanceof Date ? fromDate : new Date(fromDate));
  const to   = (toDate   instanceof Date ? toDate   : new Date(toDate));

  if (isNaN(from.getTime()) || isNaN(to.getTime())) return { times: [], values: [] };

  // Normalise to hour boundaries to reduce accidental cache misses
  const needFromMs = Math.floor(from.getTime() / 3600000) * 3600000;
  const needToMs   = Math.ceil(to.getTime()   / 3600000) * 3600000;

  let ent = hilltopRangeCache.get(key);
  if (!ent){
    ent = {
      // Data bounds (based on actual returned samples)
      dataFromMs: Infinity,
      dataToMs: -Infinity,

      // Coverage bounds (based on requested windows already attempted)
      coverFromMs: Infinity,
      coverToMs: -Infinity,
      coveredAtMs: 0,

      series: { times: [], values: [] },
      inflight: null
    };
    hilltopRangeCache.set(key, ent);
  }

  // If a load is already running for this key, wait for it then re-check coverage
  if (ent.inflight){
    try{ await ent.inflight; }catch(e){}
  }

  const overlapMs = clamp(Number(window.HILLTOP_RANGE_CACHE_OVERLAP_HOURS) || 1, 0, 6) * 3600000;
  const padMs = clamp(Number(window.HILLTOP_RANGE_CACHE_PAD_HOURS) || 48, 0, 168) * 3600000;

  // Optional TTL: allows the "tail" to be refreshed occasionally without thrashing.
  // Default 0 means "never expire in-session".
  const ttlMin = clamp(Number(window.HILLTOP_RANGE_CACHE_TTL_MINUTES) || 0, 0, 240);
  const ttlMs = ttlMin * 60000;
  const nowMs = Date.now();

  // If TTL has expired, only expire the *coverage* window, not the already fetched samples.
  if (ttlMs > 0 && ent.coveredAtMs && (nowMs - ent.coveredAtMs) > ttlMs){
    ent.coverFromMs = Infinity;
    ent.coverToMs = -Infinity;
    ent.coveredAtMs = 0;
  }

  const needFrom = new Date(needFromMs - padMs);
  const needTo   = new Date(needToMs + padMs);

  const gaps = [];
  const hasSeries = ent.series && Array.isArray(ent.series.times) && ent.series.times.length > 0;
  const hasCover = isFinite(ent.coverFromMs) && isFinite(ent.coverToMs) && ent.coverToMs >= ent.coverFromMs;

  if (!hasCover){
    gaps.push({ from: needFrom, to: needTo });
  } else {
    if (needFrom.getTime() < ent.coverFromMs - 1000){
      gaps.push({ from: needFrom, to: new Date(ent.coverFromMs + overlapMs) });
    }
    if (needTo.getTime() > ent.coverToMs + 1000){
      gaps.push({ from: new Date(ent.coverToMs - overlapMs), to: needTo });
    }
  }

  if (!gaps.length){
    return ent.series || { times: [], values: [] };
  }

  ent.inflight = (async ()=>{
    for (const g of gaps){
      if (!g || !(g.from instanceof Date) || !(g.to instanceof Date)) continue;
      if (g.to <= g.from) continue;

      // Fetch missing range (may legitimately return no new points for the tail)
      const fetched = await fetchHilltopRangeChunked_(siteName, measName, g.from, g.to);
      const canon = canonicalizeHilltopSeries_(fetched);

      if (!ent.series || !Array.isArray(ent.series.times) || !ent.series.times.length){
        ent.series = canon;
      } else if (canon && canon.times && canon.times.length){
        ent.series = mergeHilltopSeries([ent.series, canon]);
      }

      // IMPORTANT: mark coverage as attempted even if no new data was returned.
      // This prevents repeated re-fetching of the same "future tail" window.
      const gFromMs = g.from.getTime();
      const gToMs = g.to.getTime();
      ent.coverFromMs = Math.min(ent.coverFromMs, gFromMs);
      ent.coverToMs = Math.max(ent.coverToMs, gToMs);
      ent.coveredAtMs = nowMs;

      // Update data bounds (based on sample endpoints) for informational use
      if (ent.series && ent.series.times && ent.series.times.length){
        const first = parseHilltopTimeToDate(ent.series.times[0]);
        const last = parseHilltopTimeToDate(ent.series.times[ent.series.times.length - 1]);
        ent.dataFromMs = first ? first.getTime() : ent.dataFromMs;
        ent.dataToMs = last ? last.getTime() : ent.dataToMs;
      }

      // yield to UI
      await new Promise(r=>setTimeout(r,0));
    }
  })();

  try{
    await ent.inflight;
  } finally {
    ent.inflight = null;
  }

  return ent.series || { times: [], values: [] };
}


function pickRiverHistoryMeasurement(site){
  if (!site) return { name: "Stage", label: "River Level", units: "" };

  // Prefer flow if available (drought relevance), otherwise stage/level.
  if (site.flow != null && isFinite(site.flow)){
    return {
      name: site.flowMeasName || "Flow",
      label: "River Flow",
      units: site.flowUnits || ""
    };
  }

  return {
    name: site.levelMeasName || "Stage",
    label: "River Level",
    units: site.levelUnits || ""
  };
}

function pickGroundwaterHistoryMeasurement(site){
  if (!site) return { name: "Groundwater", label: "Groundwater Level", units: "" };
  return {
    name: site.levelMeasName || "Groundwater Continuous MSL",
    label: "Groundwater Level",
    units: site.levelUnits || ""
  };
}


function mergeHilltopSeries(seriesList){
  const map = new Map();
  for (const s of (seriesList || [])){
    if (!s || !s.times || !s.values) continue;
    const n = Math.min(s.times.length, s.values.length);
    for (let i=0;i<n;i++){
      const t = s.times[i];
      const v = s.values[i];
      if (t == null) continue;
      const vv = Number(v);
      if (!isFinite(vv)) continue;
      // last value wins if duplicate times occur
      map.set(String(t), vv);
    }
  }
  const entries = Array.from(map.entries());
  entries.sort((a,b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return {
    times: entries.map(e => e[0]),
    values: entries.map(e => e[1])
  };
}

async function _fetchRiverHistoryRange(siteName, measurementName, from, to){
  const fromStr = (from instanceof Date ? from : new Date(from)).toISOString();
  const toStr   = (to   instanceof Date ? to   : new Date(to)).toISOString();

  const candidates = [
    measurementName,
    String(measurementName || "").replace(/\s*\(.*?\)\s*/g, "").trim(),
    String(measurementName || "").replace(/Discharge/i, "Flow"),
    String(measurementName || "").replace(/Flow/i, "Discharge"),
    String(measurementName || "").replace(/Stage/i, "Level"),
    String(measurementName || "").replace(/Level/i, "Stage")
  ].filter(s => s && s.length >= 2);

  const tried = new Set();

  for (const meas of candidates){
    const key = meas.toLowerCase();
    if (tried.has(key)) continue;
    tried.add(key);

    const raw = `${NRC_HILLTOP_BASE}?Service=Hilltop&Request=GetData&Site=${encodeURIComponent(siteName)}&Measurement=${encodeURIComponent(meas)}&From=${encodeURIComponent(fromStr)}&To=${encodeURIComponent(toStr)}&Format=JSON`;
    const url = hilltopProxyWrap(raw);

    try{
      const json = await fetchJson(url, 25000);
      const series = parseHilltopSeries(json);
      if (series && series.values && series.values.length) return series;
    } catch (e){
      // Try other measurement name variants
    }
  }

  return { times: [], values: [] };
}

async function fetchRiverHistory(siteName, measurementName, daysBack=7, toDate=null){
  const DAY_MS = 24*60*60*1000;
  const now = (toDate instanceof Date && !isNaN(toDate.getTime())) ? toDate : new Date();
  const days = Math.max(0, Number(daysBack) || 0);
  const fromDate = new Date(now.getTime() - (days * DAY_MS));

  // Prefer the in-memory Hilltop range cache (used by ZIP exports/offline) before any network activity
  const cached = tryGetHilltopRangeCachedSeries_(siteName, measurementName, fromDate, now);
  if (cached && Array.isArray(cached.values) && cached.values.length){
    return cached;
  }


// If a hosted GitHub manifest archive is active, try to satisfy this request from the archive first
if (DASH_CONFIG?.import?.enableManifestUrlLoad && DASH_CONFIG?.import?.lazyLoadHilltopMonthFiles && isRemoteArchiveActive()){
  // fromDate calculated above
  try{
    const remoteSeries = await remoteFetchHilltopRangeAuto_(siteName, measurementName, fromDate, now);
    if (remoteSeries && Array.isArray(remoteSeries.values) && remoteSeries.values.length){
      return remoteSeries;
    }
  } catch (e){
    console.warn("Remote Hilltop archive fetch failed, falling back to live Hilltop.", e);
  }
}

    // days already calculated above

  // These help avoid CORS proxy response-size limits (often ~1MB) for long historical ranges.
  // You can override these in the browser console:
  //   window.HILLTOP_MAX_DAYS_PER_CALL = 5..120 (default 31)
  //   window.HILLTOP_CHUNK_OVERLAP_HOURS = 0..6 (default 1)
  //   window.HILLTOP_BETWEEN_CHUNK_DELAY_MS = 0..20000 (default 200)
  const maxDaysPerCall = clamp(
    Number(window.HILLTOP_MAX_DAYS_PER_CALL) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.maxDaysPerCall) || 31,
    5, 120
  );
  const overlapHours = clamp(
    Number(window.HILLTOP_CHUNK_OVERLAP_HOURS) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.chunkOverlapHours) || 1,
    0, 6
  );
  const betweenChunkDelay = clamp(
    Number(window.HILLTOP_BETWEEN_CHUNK_DELAY_MS) || (DASH_CONFIG.hilltop && DASH_CONFIG.hilltop.betweenChunkDelayMs) || 200,
    0, 20000
  );

  if (days <= maxDaysPerCall){
    const from = new Date(now.getTime() - (days * DAY_MS));
    return await _fetchRiverHistoryRange(siteName, measurementName, from, now);
  }

  const overlapMs = overlapHours * 3600000;
  const parts = [];

  let remaining = days;
  let chunkTo = new Date(now.getTime());

  while (remaining > 0){
    const span = Math.min(maxDaysPerCall, remaining);
    const chunkFrom = new Date(chunkTo.getTime() - (span * DAY_MS) - overlapMs);

    const s = await _fetchRiverHistoryRange(siteName, measurementName, chunkFrom, chunkTo);
    if (s && s.values && s.values.length) parts.push(s);

    remaining -= span;
    chunkTo = new Date(chunkTo.getTime() - (span * DAY_MS));

    if (betweenChunkDelay && remaining > 0){
      await sleep(betweenChunkDelay);
    }
  }

  return mergeHilltopSeries(parts);
}


async function hydrateNrcGaugesAtAsOf(riverForLoc, gwForLoc, asOf){
  if (!(asOf instanceof Date) || isNaN(asOf.getTime())) return;

  const tasks = [];

  // Rivers: update flow/level value and timestamp to the last sample at or before the snapshot
  (riverForLoc || []).forEach((riverGauge) => {
    if (!riverGauge || !riverGauge.site) return;
    const site = riverGauge.site;
    const meas = pickRiverHistoryMeasurement(site);
    if (!meas || !meas.name) return;

    tasks.push((async () => {
      const series = await fetchRiverHistory(site.name || site.title, meas.name, 7, asOf);
      if (!series || !Array.isArray(series.values) || !series.values.length) return;

      const lastVal = series.values[series.values.length - 1];
      const lastTime = series.times[series.times.length - 1];

      // If the chosen measurement is stage, store it in level, otherwise store in flow
      const measNameLower = String(series.measurementName || meas.name).toLowerCase();
      const isStage = measNameLower.includes("stage") || measNameLower.includes("level");

      if (isStage){
        site.level = lastVal;
        site.levelWhen = formatWhenNZ(lastTime);
        if (!site.levelUnits) site.levelUnits = series.unit || site.levelUnits || "";
      } else {
        site.flow = lastVal;
        site.flowWhen = formatWhenNZ(lastTime);
        if (!site.flowUnit) site.flowUnit = series.unit || site.flowUnit || "";
      }
    })());
  });

  // Groundwater: update level value and timestamp to the last sample at or before the snapshot
  (gwForLoc || []).forEach((gwGauge) => {
    if (!gwGauge || !gwGauge.site) return;
    const site = gwGauge.site;
    const meas = pickGroundwaterHistoryMeasurement(site);
    if (!meas || !meas.name) return;

    tasks.push((async () => {
      const series = await fetchRiverHistory(site.name || site.title, meas.name, 14, asOf);
      if (!series || !Array.isArray(series.values) || !series.values.length) return;

      const lastVal = series.values[series.values.length - 1];
      const lastTime = series.times[series.times.length - 1];

      site.level = lastVal;
      site.levelWhen = formatWhenNZ(lastTime);
      if (!site.levelUnits) site.levelUnits = series.unit || site.levelUnits || "";
    })());
  });

  await Promise.allSettled(tasks);
}




function riverDeltaText(values, units){
  if (!values || values.length < 2) return "";
  const first = values[0];
  const last = values[values.length - 1];
  if (!isFinite(first) || !isFinite(last)) return "";
  const delta = last - first;
  const sign = delta > 0 ? "+" : "";
  const pct = first !== 0 ? (delta / first) * 100 : null;
  const pctPart = pct == null || !isFinite(pct) ? "" : ` (${sign}${fmt(pct, 1)}%)`;
  const unitPart = units ? ` ${units}` : "";
  return `${sign}${fmt(delta, 2)}${unitPart}${pctPart}`;
}

async function updateRiverSpark(row){
  const c = document.getElementById("sparkRiver");
  const meta = document.getElementById("sparkRiverMeta");
  if (!c) return;

  // v5 bugfix: details panel stores the nearest gauge under row.riverGauge (not row.river).
  const river = row && row.riverGauge ? row.riverGauge : null;

  // Clear canvas if no river site
  if (!river || !river.site){
    const ctx = c.getContext("2d");
    const w = c.width = c.clientWidth * devicePixelRatio;
    const h = c.height = c.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);
    if (meta) meta.textContent = "No river site found near this location";
    setMiniTrendSeries("sparkRiver", "sparkRiverTooltip", [], [], { label: "River" });
    return;
  }

  const s = river.site;
  const meas = pickRiverHistoryMeasurement(s);
  const siteName = s.title || s.name || s.siteName || "";
  const asOf = getAsOfDate();
  const endStamp = formatDateTimeLocal(asOf);
  const cacheKey = `${siteName}||${meas.name}||${endStamp}||7`;
if (meta) meta.textContent = `Loading ${meas.label.toLowerCase()} history...`;

  let series = riverHistoryCache.get(cacheKey);
  if (!series){
    try{
      series = await fetchRiverHistory(siteName, meas.name, 7, asOf);
      riverHistoryCache.set(cacheKey, series);
    } catch (e){
      if (meta) meta.textContent = `River history unavailable (Hilltop request failed)`;
      setMiniTrendSeries("sparkRiver", "sparkRiverTooltip", [], [], { label: meas.label });
      return;
    }
  }

  if (!series || !series.values || series.values.length < 2){
    if (meta) meta.textContent = `No recent data returned for ${meas.label.toLowerCase()}`;
    setMiniTrendSeries("sparkRiver", "sparkRiverTooltip", [], [], { label: meas.label });
    return;
  }

  setMiniTrendSeries(
    "sparkRiver",
    "sparkRiverTooltip",
    series.times,
    series.values,
    {
      label: meas.label,
      valFmt: (v) => {
        if (!isFinite(v)) return "-";
        // Auto unit for discharge: show L/s when < 1 m3/s
        if (meas.units && String(meas.units).toLowerCase().includes("m3") && Math.abs(v) < 1) {
          return fmt(v * 1000, 2);
        }
        return fmt(v, 3);
      },
      yFmt: (v) => {
        if (!isFinite(v)) return "-";
        if (meas.units && String(meas.units).toLowerCase().includes("m3") && Math.abs(v) < 1) {
          return fmt(v * 1000, 0);
        }
        return fmt(v, 2);
      },
      unit: (meas.units && String(meas.units).toLowerCase().includes("m3")) ? (Math.abs(series.values[series.values.length-1]) < 1 ? "L/s" : "m³/s") : (meas.units || "")
    }
  );

    const lastVal = series.values[series.values.length - 1];
  const isDischarge = meas.units && String(meas.units).toLowerCase().includes("m3");
  const displayUnit = isDischarge ? (Math.abs(lastVal) < 1 ? "L/s" : "m³/s") : (meas.units || "");
  const displayVal = isDischarge && Math.abs(lastVal) < 1 ? (lastVal * 1000) : lastVal;

const delta = riverDeltaText(series.values, meas.units);
  const dist = isFinite(river.distanceKm) ? `${fmt(river.distanceKm, 1)} km` : "";
  const distPart = dist ? `, ${dist}` : "";
  if (meta) meta.textContent = `${meas.label}: ${fmt(displayVal, 2)}${displayUnit ? " " + displayUnit : ""} (7 days, Δ ${delta}) • ${siteName}${distPart}`;
}




function pickRiverDischargeMeasurement(site){
  if (!site) return { name: "Flow", label: "River Discharge (NRC)", units: "" };
  const name = site.flowMeasName || site.flowMeasurementName || site.flowMeasurement || site.flowMeas || "Flow";
  const units = site.flowUnits || site.flowUnit || "";
  return { name, label: "River Discharge (NRC)", units };
}

function isDischargeUnits_(units){
  const u = String(units || "").toLowerCase();
  return (u.includes("m3") || u.includes("m^3") || u.includes("m³") || u.includes("cumec") || u.includes("cumecs") || u.includes("m3/s") || u.includes("m^3/s") || u.includes("m³/s"));
}

function formatDischargeMaybeLitres_(v, units){
  if (!isFinite(v)) return { val: "-", unit: units || "" };
  const isM3 = isDischargeUnits_(units);
  if (isM3 && Math.abs(v) < 1) return { val: fmt(v * 1000, 2), unit: "L/s" };
  return { val: fmt(v, 2), unit: (isM3 ? "m³/s" : (units || "")) };
}

function lastFinite_(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  for (let i = arr.length - 1; i >= 0; i--){
    const v = Number(arr[i]);
    if (isFinite(v)) return v;
  }
  return null;
}

function minMaxFinite_(arr){
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const v0 of (arr || [])){
    const v = Number(v0);
    if (!isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
    found = true;
  }
  return found ? { min, max } : { min: null, max: null };
}

function buildRiverDischargeNrcHtml_(m, meas){
  const unit0 = meas && meas.units ? meas.units : "";
  const nowF = formatDischargeMaybeLitres_(m.now, unit0);
  const minF = formatDischargeMaybeLitres_(m.min30, unit0);
  const maxF = formatDischargeMaybeLitres_(m.max30, unit0);

  const line = (k, v) => `<div style="display:flex; justify-content:space-between; gap:10px;"><span class="muted">${escapeHtml(k)}</span><span class="mono">${v}</span></div>`;

  const nowTxt = (m.now == null || !isFinite(m.now)) ? "-" : `${escapeHtml(nowF.val)} <span class="tiny muted">${escapeHtml(nowF.unit)}</span>`;
  const minTxt = (m.min30 == null || !isFinite(m.min30)) ? "-" : `${escapeHtml(minF.val)} <span class="tiny muted">${escapeHtml(minF.unit)}</span>`;
  const maxTxt = (m.max30 == null || !isFinite(m.max30)) ? "-" : `${escapeHtml(maxF.val)} <span class="tiny muted">${escapeHtml(maxF.unit)}</span>`;
  const dryTxt = (m.dryness01 == null || !isFinite(m.dryness01)) ? "-" : fmt(m.dryness01, 2);

  const measName = meas && meas.name ? String(meas.name) : "Flow";

  return `
    <div class="tiny muted" style="margin-bottom:6px;">NRC Hilltop gauge discharge (measurement: ${escapeHtml(measName)}). Dryness is computed the same way as the modelled discharge: 1 - ((now - min) / (max - min)) over the last 30 days.</div>
    ${line("Current Discharge (NRC)", nowTxt)}
    ${line("Baseline 30d Min", minTxt)}
    ${line("Baseline 30d Max", maxTxt)}
    ${line("Normalized Dryness (0–1)", dryTxt)}
  `;
}

async function updateNrcDischargeSpark(row){
  const c = document.getElementById("sparkFlowNrc");
  const meta = document.getElementById("sparkFlowNrcMeta");
  if (!c) return;

  const river = row && row.riverGauge ? row.riverGauge : null;
  if (!river || !river.site){
    const ctx = c.getContext("2d");
    const w = c.width = c.clientWidth * devicePixelRatio;
    const h = c.height = c.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);
    if (meta) meta.textContent = "No river site found near this location";
    setMiniTrendSeries("sparkFlowNrc", "sparkFlowNrcTooltip", [], [], { label: "River Discharge (NRC)" });
    return;
  }

  const s = river.site;
  const meas = pickRiverDischargeMeasurement(s);
  const siteName = s.title || s.name || s.siteName || "";
  const asOf = getAsOfDate();
  const endStamp = formatDateTimeLocal(asOf);
  const cacheKey = `${siteName}||${meas.name}||${endStamp}||7`;

  if (meta) meta.textContent = "Loading NRC discharge history...";

  let series = riverHistoryCache.get(cacheKey);
  if (!series){
    try{
      series = await fetchRiverHistory(siteName, meas.name, 7, asOf);
      riverHistoryCache.set(cacheKey, series);
    } catch (e){
      if (meta) meta.textContent = "NRC discharge history unavailable (Hilltop request failed)";
      setMiniTrendSeries("sparkFlowNrc", "sparkFlowNrcTooltip", [], [], { label: meas.label });
      return;
    }
  }

  if (!series || !Array.isArray(series.values) || series.values.length < 2){
    if (meta) meta.textContent = "No NRC discharge data returned";
    setMiniTrendSeries("sparkFlowNrc", "sparkFlowNrcTooltip", [], [], { label: meas.label });
    return;
  }

  const unitRaw = meas.units || series.unit || "";
  const lastVal = lastFinite_(series.values);
  const isM3 = isDischargeUnits_(unitRaw);
  const unitDisplay = isM3 ? (Math.abs((lastVal ?? 0)) < 1 ? "L/s" : "m³/s") : (unitRaw || "");

  setMiniTrendSeries(
    "sparkFlowNrc",
    "sparkFlowNrcTooltip",
    series.times,
    series.values,
    {
      label: meas.label,
      valFmt: (v) => {
        if (!isFinite(v)) return "-";
        if (isM3 && Math.abs(v) < 1) return fmt(v * 1000, 2);
        return fmt(v, 3);
      },
      yFmt: (v) => {
        if (!isFinite(v)) return "-";
        if (isM3 && Math.abs(v) < 1) return fmt(v * 1000, 0);
        return fmt(v, 2);
      },
      unit: unitDisplay
    }
  );

  const disp = formatDischargeMaybeLitres_(lastVal, unitRaw);
  const delta = riverDeltaText(series.values, unitRaw);
  const dist = isFinite(river.distanceKm) ? `${fmt(river.distanceKm, 1)} km` : "";
  const distPart = dist ? `, ${dist}` : "";

  if (meta) meta.textContent = `${meas.label}: ${disp.val}${disp.unit ? " " + disp.unit : ""} (7 days, Δ ${delta}) • ${siteName}${distPart}`;
}

async function updateNrcDischargeCard(row){
  const wrap = document.getElementById("riverNrcDischargeWrap");
  const body = document.getElementById("riverNrcDischargeBody");
  if (!wrap || !body) return;

  const river = row && row.riverGauge ? row.riverGauge : null;
  if (!river || !river.site){
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";

  const s = river.site;
  const meas = pickRiverDischargeMeasurement(s);
  const siteName = s.title || s.name || s.siteName || "";
  const asOf = getAsOfDate();
  const endStamp = formatDateTimeLocal(asOf);
  const cacheKey = `${siteName}||${meas.name}||${endStamp}||30`;

  body.innerHTML = '<div class="muted">Loading gauge discharge...</div>';

  let series = riverHistoryCache.get(cacheKey);
  if (!series){
    try{
      series = await fetchRiverHistory(siteName, meas.name, 30, asOf);
      riverHistoryCache.set(cacheKey, series);
    } catch (e){
      body.innerHTML = '<div class="muted">NRC discharge unavailable (Hilltop request failed)</div>';
      return;
    }
  }

  if (!series || !Array.isArray(series.values) || !series.values.length){
    body.innerHTML = '<div class="muted">No NRC discharge data returned</div>';
    return;
  }

  const now = lastFinite_(series.values);
  const mm = minMaxFinite_(series.values);
  const min30 = mm.min;
  const max30 = mm.max;
  let dryness01 = null;
  if (now != null && min30 != null && max30 != null){
    const denom = (max30 - min30);
    dryness01 = denom <= 1e-9 ? 0.5 : clamp(1 - ((now - min30) / denom), 0, 1);
  }

  body.innerHTML = buildRiverDischargeNrcHtml_({ now, min30, max30, dryness01 }, { name: meas.name, units: (meas.units || series.unit || "") });
}

async function updateGroundwaterSpark(row){
  const c = document.getElementById("sparkGW");
  const meta = document.getElementById("sparkGWMeta");
  if (!c) return;

  const gw = row && row.gwGauge ? row.gwGauge : null;

  if (!gw || !gw.site){
    const ctx = c.getContext("2d");
    const w = c.width = c.clientWidth * devicePixelRatio;
    const h = c.height = c.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);
    if (meta) meta.textContent = "No groundwater site found near this location";
    setMiniTrendSeries("sparkGW", "sparkGWTooltip", [], [], { label: "Groundwater Level" });
    return;
  }

  const s = gw.site;
  const meas = pickGroundwaterHistoryMeasurement(s);
  const siteName = s.name || s.title || "";
  const asOf = getAsOfDate();
  const endStamp = formatDateTimeLocal(asOf);
  const cacheKey = `${siteName}||${meas.name}||${endStamp}||7`;
const distPart = isFinite(gw.distanceKm) ? ` (${fmt(gw.distanceKm, 1)} km)` : "";

  if (meta) meta.textContent = `Loading ${meas.label.toLowerCase()} history...`;

  let series = gwHistoryCache.get(cacheKey);
  if (!series){
    try{
      // Reuse Hilltop fetch logic (same as rivers), defaulting to the NRC_HILLTOP_BASE endpoint.
      series = await fetchRiverHistory(siteName, meas.name, 7, asOf);
      gwHistoryCache.set(cacheKey, series);
    } catch (e){
      const ctx = c.getContext("2d");
      const w = c.width = c.clientWidth * devicePixelRatio;
      const h = c.height = c.clientHeight * devicePixelRatio;
      ctx.clearRect(0,0,w,h);
      if (meta) meta.textContent = `Groundwater history unavailable (Hilltop request failed) • ${siteName}${distPart}`;
      return;
    }
  }

  setMiniTrendSeries(
    "sparkGW",
    "sparkGWTooltip",
    series.times,
    series.values,
    { label: "Groundwater Level", unit: "m", valFmt: (v) => fmt(v, 3), yFmt: (v) => fmt(v, 2) }
  );

  const delta = riverDeltaText(series.values, meas.units || "");
  if (meta) meta.textContent = `${meas.label}${meas.units ? " " + meas.units : ""} (7 days, Δ ${delta}) • ${siteName}${distPart}`;
}


    

/******************************************
     * Open-Meteo Requests
     ***********************/
    
function getRequiredLookbackDays(){
  // Ensure we have enough history for rain window, RH window, soil baseline, and trend charts
  const w = droughtConfig?.windows || {};
  const lookback = Math.max(
    Number(w.rainPastDays)||14,
    Number(w.rhPastDays)||7,
    Number(w.soilBaselineDays)||30,
    7
  );
  return lookback + 2;
}

function getRequiredLookaheadDays(forecastDays){
  const w = droughtConfig?.windows || {};
  const lookahead = Math.max(
    Number(forecastDays)||7,
    Number(w.et0ForecastDays)||7,
    Number(w.vpdForecastDays)||7
  );
  return lookahead + 2;
}

// Returns {start: Date, end: Date, asOf: Date} for historic fetch windows.
function computeHistoricFetchWindow(pastDays, forecastDays){
  const now = nowLocal();
  const preDaysRange = Math.max(Number(pastDays)||30, getRequiredLookbackDays());
  const preDaysSnapshot = Math.max(getSnapshotMinLookbackDays(), getRequiredLookbackDays());
  const postDays = Math.max(Number(forecastDays)||7, getRequiredLookaheadDays(forecastDays));

  // If a playback range is set, fetch for the whole range (plus buffers).
  if (historicUseRange && historicRangeStart instanceof Date && !isNaN(historicRangeStart.getTime()) &&
      historicRangeEnd instanceof Date && !isNaN(historicRangeEnd.getTime())){
    let rs = new Date(historicRangeStart.getTime());
    let re = new Date(historicRangeEnd.getTime());
    if (rs > re){ const tmp = rs; rs = re; re = tmp; }
    if (re > now) re = new Date(now.getTime());

    const start = new Date(rs.getTime());
    start.setDate(start.getDate() - preDaysRange);

    let end = new Date(re.getTime());
    end.setDate(end.getDate() + postDays);
    if (end > now) end = new Date(now.getTime());

    // Use cursor as-of if available otherwise range start.
    let asOf = (asOfSnapshot instanceof Date && !isNaN(asOfSnapshot.getTime())) ? new Date(asOfSnapshot.getTime()) : new Date(rs.getTime());
    if (asOf < rs) asOf = new Date(rs.getTime());
    if (asOf > re) asOf = new Date(re.getTime());
    return { start, end, asOf, rangeStart: rs, rangeEnd: re };
  }

  // Single historic snapshot window (plus buffers).
  let asOf = (asOfSnapshot instanceof Date && !isNaN(asOfSnapshot.getTime())) ? new Date(asOfSnapshot.getTime()) : new Date(now.getTime());
  if (asOf > now) asOf = new Date(now.getTime());

  const start = new Date(asOf.getTime());
  start.setDate(start.getDate() - preDaysSnapshot);

  let end = new Date(asOf.getTime());
  end.setDate(end.getDate() + postDays);
  if (end > now) end = new Date(now.getTime());

  return { start, end, asOf, rangeStart: null, rangeEnd: null };
}

function cacheCoversAsOf(d){
  if (!dataCache.rangeMin || !dataCache.rangeMax) return false;
  let pastDays = clamp(Number($("pastDays").value) || 30, 7, 92);
  const forecastDays = clamp(Number($("forecastDays").value) || 7, 3, 16);

  // Snapshot mode should always include at least 30 days lookback (like Live).
  if (timeMode === "historic" && !historicUseRange){
    pastDays = Math.max(pastDays, getSnapshotMinLookbackDays());
  }
  const preDays = Math.max(pastDays, getRequiredLookbackDays());
  const postDays = Math.max(forecastDays, getRequiredLookaheadDays(forecastDays));

  const reqMin = new Date(d.getTime()); reqMin.setDate(reqMin.getDate() - preDays);
  const reqMax = new Date(d.getTime()); reqMax.setDate(reqMax.getDate() + postDays);

  return reqMin >= dataCache.rangeMin && reqMax <= dataCache.rangeMax;
}

function setPlaybackStatus(msg){
  const el = document.getElementById("playbackStatus");
  if (el) el.textContent = msg;
}

function showPlaybackPanel(show){
  const p = document.getElementById("playbackPanel");
  if (p) p.style.display = show ? "" : "none";
}

function syncPlaybackInputs(){
  const rs = document.getElementById("rangeStartInput");
  const re = document.getElementById("rangeEndInput");
  const stepSel = document.getElementById("playStep");
  const speedSel = document.getElementById("playSpeed");
  const loopChk = document.getElementById("playLoop");
  const hydroChk = document.getElementById("playHydro");

  if (stepSel){
    const saved = localStorage.getItem(STORAGE_KEY_PLAY_STEP);
    if (saved) playbackState.stepMinutes = Number(saved) || playbackState.stepMinutes;
    stepSel.value = String(playbackState.stepMinutes);
  }
  if (speedSel){
    const saved = localStorage.getItem(STORAGE_KEY_PLAY_SPEED);
    if (saved) playbackState.speedMs = Number(saved) || playbackState.speedMs;
    speedSel.value = String(playbackState.speedMs);
  }
  if (loopChk){
    const saved = localStorage.getItem(STORAGE_KEY_PLAY_LOOP);
    if (saved != null) playbackState.loop = saved === "true";
    loopChk.checked = playbackState.loop;
  }
  if (hydroChk){
    const saved = localStorage.getItem(STORAGE_KEY_PLAY_HYDRO);
    if (saved != null) playbackState.hydro = saved === "true";
    hydroChk.checked = playbackState.hydro;
  }

  // Range defaults
  if (rs && re){
    const savedStart = localStorage.getItem(STORAGE_KEY_RANGE_START);
    const savedEnd = localStorage.getItem(STORAGE_KEY_RANGE_END);
    const dStart = savedStart ? new Date(savedStart) : null;
    const dEnd = savedEnd ? new Date(savedEnd) : null;

    if (dStart && !isNaN(dStart.getTime())) historicRangeStart = dStart;
    if (dEnd && !isNaN(dEnd.getTime())) historicRangeEnd = dEnd;

    // If no saved range, set a sensible default around the current as-of
    const base = getAsOfDate();
    if (!(historicRangeStart instanceof Date) || isNaN(historicRangeStart.getTime())){
      const s = new Date(base.getTime()); s.setDate(s.getDate() - 14);
      historicRangeStart = s;
    }
    if (!(historicRangeEnd instanceof Date) || isNaN(historicRangeEnd.getTime())){
      historicRangeEnd = new Date(base.getTime());
    }

    rs.value = formatDateTimeLocal(historicRangeStart);
    re.value = formatDateTimeLocal(historicRangeEnd);
  }
}

function updatePlaybackSlider(){
  const slider = document.getElementById("playSlider");
  const label = document.getElementById("playTimeLabel");
  if (!slider) return;

  const asOf = getAsOfDate();
  if (!historicUseRange || !(historicRangeStart instanceof Date) || !(historicRangeEnd instanceof Date)) {
    slider.min = "0";
    slider.max = "0";
    slider.step = "1";
    slider.value = "0";
    slider.disabled = true;
    if (label) label.textContent = `Cursor: ${formatDateTimeLocal(asOf)} | Range: not loaded (click Load Range)`;
    return;
  }

  slider.disabled = false;

  let rs = new Date(historicRangeStart.getTime());
  let re = new Date(historicRangeEnd.getTime());
  if (rs > re){ const tmp = rs; rs = re; re = tmp; }

  const stepMs = playbackState.stepMinutes * 60 * 1000;
  const steps = Math.max(0, Math.floor((re.getTime() - rs.getTime()) / stepMs));
  slider.min = "0";
  slider.max = String(steps);
  slider.step = "1";

  // Set slider to match current as-of
  const idx = Math.max(0, Math.min(steps, Math.round((asOf.getTime() - rs.getTime()) / stepMs)));
  slider.value = String(idx);

  if (label){
    label.textContent = `Cursor: ${formatDateTimeLocal(asOf)} | Range: ${formatDateTimeLocal(rs)} to ${formatDateTimeLocal(re)} | Step: ${playbackState.stepMinutes} min`;
  }
}

function getCursorFromSlider(){
  const slider = document.getElementById("playSlider");
  if (!slider || !historicUseRange || !(historicRangeStart instanceof Date) || !(historicRangeEnd instanceof Date)) return null;
  const rs = new Date(historicRangeStart.getTime());
  const stepMs = playbackState.stepMinutes * 60 * 1000;
  const idx = Number(slider.value) || 0;
  return new Date(rs.getTime() + idx * stepMs);
}

async function seekCursor(d, opts){
  const options = opts || {};
  if (!(d instanceof Date) || isNaN(d.getTime())) return;

  asOfSnapshot = d;
  localStorage.setItem(STORAGE_KEY_ASOF, asOfSnapshot.toISOString());

  const inpAsOf = document.getElementById("asOfInput");
  if (inpAsOf){
    inpAsOf.value = formatDateTimeLocal(asOfSnapshot);
    pendingAsOfStr = inpAsOf.value;
  }

  updatePlaybackSlider();

  if (timeMode !== "historic"){
    recomputeFromCache();
    return;
  }

  // If we already have enough cached data, recompute only.
  if (dataCache.wxList && cacheCoversAsOf(asOfSnapshot)){
    // In historic/snapshot mode, ensure the index uses Hybrid river discharge when enabled.
    // This is a blocking step by request (wait for hybrid to be computed).
    try{
      if (typeof droughtConfig !== "undefined" && droughtConfig && droughtConfig.useRiverHybridForIndex && typeof precomputeRiverHybridForIndexIfEnabled_ === "function"){
        await precomputeRiverHybridForIndexIfEnabled_();
      }
    }catch(_e){}

    recomputeFromCache();
    // Optional hydrology updates (slow)
    if (playbackState.hydro){
      const nowT = asOfSnapshot.getTime();
      const last = playbackState.lastHydroAt ? playbackState.lastHydroAt.getTime() : 0;
      const minInterval = Math.max(6*60*60*1000, playbackState.stepMinutes*60*1000);
      if ((nowT - last) >= minInterval){
        playbackState.lastHydroAt = new Date(asOfSnapshot.getTime());
        try{
          await hydrateNrcGaugesAtAsOf(dataCache.riverForLoc, dataCache.gwForLoc, asOfSnapshot);
          recomputeFromCache();
        } catch(e){
          // ignore
        }
      }
    }
    return;
  }

  if (options.allowRefresh !== false){
    await refresh();
  } else {
    showToast("This timestamp is outside the loaded range. Load Range or Refresh Data.");
  }
}

function setPlayButtons(isPlaying){
  const bPlay = document.getElementById("btnPlay");
  const bPause = document.getElementById("btnPause");
  if (bPlay) bPlay.style.display = isPlaying ? "none" : "";
  if (bPause) bPause.style.display = isPlaying ? "" : "none";
}

function stopPlayback(){
  playbackState.isPlaying = false;
  if (playbackState.timer){
    clearInterval(playbackState.timer);
    playbackState.timer = null;
  }
  setPlayButtons(false);
  setPlaybackStatus("Paused");
}

function startPlayback(){
  if (playbackState.isPlaying) return;
  if (!historicUseRange){
    showToast("Load Range first.");
    playbackState.isPlaying = false;
    setPlayButtons(false);
    return;
  }
  playbackState.isPlaying = true;
  setPlayButtons(true);
  setPlaybackStatus("Playing...");

  playbackState.timer = setInterval(async () => {
    const slider = document.getElementById("playSlider");
    if (!slider){ stopPlayback(); return; }

    const max = Number(slider.max) || 0;
    let v = Number(slider.value) || 0;
    v += 1;
    if (v > max){
      if (playbackState.loop){
        v = 0;
      } else {
        stopPlayback();
        return;
      }
    }
    slider.value = String(v);
    const c = getCursorFromSlider();
    if (c) await seekCursor(c, { allowRefresh: false });
  }, playbackState.speedMs);
}


function buildForecastUrl(locs, pastDays, forecastDays){
      const hourlyVars = [
        "precipitation",
        "soil_moisture_0_1cm",
        "soil_moisture_1_3cm",
        "soil_moisture_3_9cm",
        "soil_moisture_9_27cm",
        "soil_moisture_27_81cm",
        "relative_humidity_2m",
        "vapour_pressure_deficit",
        "temperature_2m",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m"
      ].join(",");

      const dailyVars = [
        "precipitation_sum",
        "et0_fao_evapotranspiration"
      ].join(",");

      const params = new URLSearchParams({
        hourly: hourlyVars,
        daily: dailyVars,
        timezone: "Pacific/Auckland"
      });

      const lats = locs.map(l => l.lat).join(",");
      const lons = locs.map(l => l.lon).join(",");
      params.set("latitude", lats);
      params.set("longitude", lons);

      // Historic mode: request an explicit window around the selected date/time or playback range.
      if (timeMode === "historic"){
        const win = computeHistoricFetchWindow(pastDays, forecastDays);
        params.set("start_date", ymdLocal(win.start));
        params.set("end_date", ymdLocal(win.end));
        return "https://historical-forecast-api.open-meteo.com/v1/forecast?" + params.toString();
      }

      params.set("past_days", String(pastDays));
      params.set("forecast_days", String(forecastDays));
      return "https://api.open-meteo.com/v1/forecast?" + params.toString();
    }

    function buildFloodUrl(locs, pastDays, forecastDays){
      const params = new URLSearchParams({
        daily: "river_discharge",
        timezone: "Pacific/Auckland"
      });

      const lats = locs.map(l => l.lat).join(",");
      const lons = locs.map(l => l.lon).join(",");
      params.set("latitude", lats);
      params.set("longitude", lons);

      if (timeMode === "historic"){
        const win = computeHistoricFetchWindow(pastDays, forecastDays);
        params.set("start_date", ymdLocal(win.start));
        params.set("end_date", ymdLocal(win.end));
        return "https://flood-api.open-meteo.com/v1/flood?" + params.toString();
      }

      params.set("past_days", String(pastDays));
      params.set("forecast_days", String(forecastDays));
      return "https://flood-api.open-meteo.com/v1/flood?" + params.toString();
    }
