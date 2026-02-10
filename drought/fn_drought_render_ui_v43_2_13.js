/***********************
     * UI and Map
     ***********************/
    let map, markerLayer;
    let locations = [];
    let computed = [];
    let selectedId = null;

    function initMap(){
      map = L.map("map", { zoomControl: true });
      markerLayer = L.layerGroup().addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      map.setView([-35.2, 173.6], 8);
    }

    function loadLocations(){
      const raw = localStorage.getItem(STORAGE_KEY_LOCATIONS);
      if (!raw) return DEFAULT_LOCATIONS.slice();
      const parsed = safeJsonParse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_LOCATIONS.slice();
      const cleaned = parsed
        .filter(x => x && typeof x === "object")
        .map(x => ({
          id: String(x.id ?? "").trim() || ("loc_" + Math.random().toString(16).slice(2)),
          name: String(x.name ?? "Unnamed").trim(),
          lat: Number(x.lat),
          lon: Number(x.lon)
        }))
        .filter(x => isFinite(x.lat) && isFinite(x.lon) && x.name);
      return cleaned.length ? cleaned : DEFAULT_LOCATIONS.slice();
    }

    function saveLocations(list){
      localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(list, null, 2));
    }

    function escapeHtml(s){
      return String(s)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }

    function renderMarkers(){
      markerLayer.clearLayers();
      const bounds = [];

      for (const row of computed){
        const cat = categoryForIndex(row.index.score);
        const color = cat.color;

        const marker = L.circleMarker([row.loc.lat, row.loc.lon], {
          radius: 10,
          color: "rgba(255,255,255,0.20)",
          weight: 1,
          fillColor: color,
          fillOpacity: 0.85
        });

        marker.on("click", () => selectLocation(row.loc.id, true));

        marker.bindPopup(`
          <div style="font-family: system-ui; font-size: 13px;">
            <div style="font-weight: 700; margin-bottom: 6px;">${escapeHtml(row.loc.name)}</div>
            <div><strong>Index:</strong> ${fmt(row.index.score, 0)} <span style="opacity:0.8">(${cat.name})</span></div>
            <div style="margin-top: 6px; opacity: 0.85;">
              Rain 14d: ${fmt(row.index.metrics.pastRain14, 1)} mm<br/>
              Soil 9-27: ${fmt(row.soil9_27, 3)}<br/>
              Soil 27-81: ${fmt(row.soil27_81, 3)}<br/>
              ET0 7d: ${fmt(row.index.metrics.et0_7, 1)} mm<br/>
              Groundwater: ${row.gwGauge ? escapeHtml(formatGroundwaterShort(row.gwGauge)) : "-"}<br/>
              River Gauge: ${row.riverGauge ? escapeHtml(formatRiverShort(row.riverGauge)) : "-"}
            </div>
          </div>
        `);

        marker.addTo(markerLayer);
        bounds.push([row.loc.lat, row.loc.lon]);
      }

      if (bounds.length){
        const b = L.latLngBounds(bounds);
        map.fitBounds(b.pad(0.15));
      }
    }

    
    function formatIndexTrendCell(t){
      if (!t || t.delta == null || isNaN(t.delta)) return "-";
      const d = Number(t.delta) || 0;
      const arrow = (d > 1) ? "▲" : (d < -1 ? "▼" : "→");
      const sign = d > 0 ? "+" : "";
      const label = t.label ? String(t.label) : "";
      return `<div class="mono"><strong>${arrow} ${sign}${fmt(d, 0)}</strong></div>` +
             (label ? `<div class="muted mono" style="font-size:11px;">${escapeHtml(label)}</div>` : "");
    }

function renderTable(){
      const tbody = $("tbody");
      tbody.innerHTML = "";

      for (const row of computed){
        const cat = categoryForIndex(row.index.score);
        const tr = document.createElement("tr");
        tr.dataset.id = row.loc.id;

        tr.innerHTML = `
          <td data-col="location"><strong>${escapeHtml(row.loc.name)}</strong><div class="muted mono" style="font-size:12px;">${row.loc.lat.toFixed(4)}, ${row.loc.lon.toFixed(4)}</div></td>
          <td data-col="index" class="mono"><strong>${fmt(row.index.score, 0)}</strong></td>
          <td data-col="trend" class="mono">${formatIndexTrendCell(row.indexTrend)}</td>
          <td data-col="category">
            <span class="tag">
              <span class="dot" style="background:${cat.color}; box-shadow: 0 0 0 4px rgba(255,255,255,0.06);"></span>
              ${cat.name}
            </span>
          </td>
          <td data-col="rain14" class="mono">${fmt(row.index.metrics.pastRain14, 1)} mm</td>
          <td data-col="rain7fc" class="mono">${fmt(row.index.metrics.forecastRain7, 1)} mm</td>
          <td data-col="vpdMean" class="mono">${fmt(row.index.metrics.vpdMean, 2)}</td>
          <td data-col="riverNow" class="mono">${row.index.metrics.riverNow == null ? "-" : (fmt(row.index.metrics.riverNow, 2) + (row.index.metrics.riverUnit ? (" " + escapeHtml(String(row.index.metrics.riverUnit))) : ""))}</td>
          <td data-col="riverSource" class="mono">${escapeHtml(row.index.metrics.riverSource || "Modelled")}</td>
          <td data-col="score_soil" class="mono">${fmt(row.index.parts.soil, 2)}</td>
          <td data-col="score_rain" class="mono">${fmt(row.index.parts.rain, 2)}</td>
          <td data-col="score_evap" class="mono">${fmt(row.index.parts.evap, 2)}</td>
          <td data-col="score_humidity" class="mono">${fmt(row.index.parts.humidity, 2)}</td>
          <td data-col="score_river" class="mono">${fmt(row.index.parts.river, 2)}</td>
          <td data-col="soil9_27" class="mono">${fmt(row.soil9_27, 3)}</td>
          <td data-col="soil27_81" class="mono">${fmt(row.soil27_81, 3)}</td>
          <td data-col="et0_7" class="mono">${fmt(row.index.metrics.et0_7, 1)} mm</td>
          <td data-col="rh7" class="mono">${fmt(row.index.metrics.rhMean7, 0)}%</td>
          <td data-col="groundwater" class="mono">${row.gwGauge ? escapeHtml(formatGroundwaterShort(row.gwGauge)) : "-"}</td>
          <td data-col="river" class="mono">${row.riverGauge ? escapeHtml(formatRiverShort(row.riverGauge)) : "-"}</td>
        `;

        tr.addEventListener("click", () => selectLocation(row.loc.id, true));
        tbody.appendChild(tr);
      }

      // Re-apply column visibility after rows rebuild
      try{ applyLocTableColsToDom_(); }catch(_e){}
    }

    
/***********************
 * Location Table Columns
 ***********************/
const LOC_TABLE_COLS_STORAGE_KEY = "fn_drought_loc_table_cols_v1";
const LOC_TABLE_COL_DEFS = [
  { key: "location", label: "Location", default: true },
  { key: "index", label: "Index", default: true },
  { key: "trend", label: "Trend", default: true },
  { key: "category", label: "Category", default: true },
  { key: "rain14", label: "Rain 14d", default: true },
  { key: "rain7fc", label: "Rain 7d Forecast", default: false },
  { key: "vpdMean", label: "VPD Mean", default: false },
  { key: "riverNow", label: "River Discharge Now", default: false },
  { key: "riverSource", label: "River Discharge Source", default: false },
  { key: "score_soil", label: "Component Soil (0-1)", default: false },
  { key: "score_rain", label: "Component Rain (0-1)", default: false },
  { key: "score_evap", label: "Component Evap (0-1)", default: false },
  { key: "score_humidity", label: "Component RH (0-1)", default: false },
  { key: "score_river", label: "Component River (0-1)", default: false },
  { key: "soil9_27", label: "Soil 9-27", default: true },
  { key: "soil27_81", label: "Soil 27-81", default: true },
  { key: "et0_7", label: "ET0 7d", default: true },
  { key: "rh7", label: "RH 7d", default: true },
  { key: "groundwater", label: "Groundwater", default: true },
  { key: "river", label: "River Gauge", default: true }
];

let locTableColsState = null;

function _getDefaultLocTableCols_(){
  const o = {};
  for (const c of LOC_TABLE_COL_DEFS) o[c.key] = !!c.default;
  return o;
}

function loadLocTableCols_(){
  try{
    const raw = localStorage.getItem(LOC_TABLE_COLS_STORAGE_KEY);
    if (!raw) return _getDefaultLocTableCols_();
    const obj = JSON.parse(raw);
    const base = _getDefaultLocTableCols_();
    for (const c of LOC_TABLE_COL_DEFS){
      if (obj && Object.prototype.hasOwnProperty.call(obj, c.key)) base[c.key] = !!obj[c.key];
    }
    return base;
  }catch(_e){
    return _getDefaultLocTableCols_();
  }
}

function saveLocTableCols_(){
  try{
    if (!locTableColsState) return;
    localStorage.setItem(LOC_TABLE_COLS_STORAGE_KEY, JSON.stringify(locTableColsState));
  }catch(_e){}
}

function applyLocTableColsToDom_(){
  const tbl = document.getElementById("tbl");
  if (!tbl || !locTableColsState) return;

  for (const c of LOC_TABLE_COL_DEFS){
    const visible = !!locTableColsState[c.key];
    const nodes = tbl.querySelectorAll(`[data-col="${c.key}"]`);
    nodes.forEach(n => { n.style.display = visible ? "" : "none"; });
  }
}

function initLocationTableColumnsUi(){
  locTableColsState = loadLocTableCols_();

  const list = document.getElementById("locColsList");
  if (!list) { applyLocTableColsToDom_(); return; }

  const html = LOC_TABLE_COL_DEFS.map(c => {
    const checked = locTableColsState[c.key] ? "checked" : "";
    return `<label class="s"><input type="checkbox" data-colkey="${c.key}" ${checked}> <span>${escapeHtml(c.label)}</span></label>`;
  }).join("");

  list.innerHTML = html;

  list.querySelectorAll("input[type=checkbox][data-colkey]").forEach(cb => {
    cb.addEventListener("change", () => {
      const k = cb.getAttribute("data-colkey");
      locTableColsState[k] = !!cb.checked;
      saveLocTableCols_();
      applyLocTableColsToDom_();
    });
  });

  const btnAll = document.getElementById("btnLocColsAll");
  if (btnAll){
    btnAll.addEventListener("click", () => {
      for (const c of LOC_TABLE_COL_DEFS) locTableColsState[c.key] = true;
      saveLocTableCols_();
      initLocationTableColumnsUi();
      applyLocTableColsToDom_();
    });
  }

  const btnReset = document.getElementById("btnLocColsReset");
  if (btnReset){
    btnReset.addEventListener("click", () => {
      locTableColsState = _getDefaultLocTableCols_();
      saveLocTableCols_();
      initLocationTableColumnsUi();
      applyLocTableColsToDom_();
    });
  }

  // Apply immediately (covers existing table)
  applyLocTableColsToDom_();
}

function renderDistrictKPIs(){
      const scores = computed.map(r => r.index.score).filter(x => x != null && !isNaN(x));
      if (!scores.length){
        $("kpiMean").textContent = "-";
        $("kpiMedian").textContent = "-";
        $("kpiWorst").textContent = "-";
        $("kpiWorstName").textContent = "";
        $("kpiRain14").textContent = "-";
        $("kpiRain7").textContent = "-";
        $("kpiET07").textContent = "-";
        $("kpiVPD7").textContent = "-";
        $("kpiRH7").textContent = "-";
        $("kpiMeanCat").textContent = "";
        $("kpiMedianCat").textContent = "";
        return;
      }

      const mean = scores.reduce((a,b)=>a+b,0) / scores.length;
      const med = median(scores);
      const worst = Math.max(...scores);
      const worstRow = computed.find(r => r.index.score === worst);

      $("kpiMean").textContent = fmt(mean, 0);
      $("kpiMedian").textContent = fmt(med, 0);
      $("kpiWorst").textContent = fmt(worst, 0);
      $("kpiWorstName").textContent = worstRow ? worstRow.loc.name : "";

      const meanCat = categoryForIndex(mean);
      const medCat = categoryForIndex(med);
      $("kpiMeanCat").textContent = meanCat.name;
      $("kpiMedianCat").textContent = medCat.name;

      const rain14Vals = computed.map(r => r.index.metrics.pastRain14).filter(x => x != null && !isNaN(x));
      const rain14Mean = rain14Vals.length ? rain14Vals.reduce((a,b)=>a+b,0)/rain14Vals.length : null;
      $("kpiRain14").textContent = rain14Mean == null ? "-" : (fmt(rain14Mean, 1) + " mm");

      const rain7Vals = computed.map(r => r.index.metrics.forecastRain7).filter(x => x != null && !isNaN(x));
      const rain7Mean = rain7Vals.length ? rain7Vals.reduce((a,b)=>a+b,0)/rain7Vals.length : null;
      $("kpiRain7").textContent = rain7Mean == null ? "-" : (fmt(rain7Mean, 1) + " mm");

      const et07Vals = computed.map(r => r.index.metrics.et0_7).filter(x => x != null && !isNaN(x));
      const et07Mean = et07Vals.length ? et07Vals.reduce((a,b)=>a+b,0)/et07Vals.length : null;
      $("kpiET07").textContent = et07Mean == null ? "-" : (fmt(et07Mean, 1) + " mm");

      const vpdVals = computed.map(r => r.index.metrics.vpdMean).filter(x => x != null && !isNaN(x));
      const vpdMean7 = vpdVals.length ? vpdVals.reduce((a,b)=>a+b,0)/vpdVals.length : null;
      $("kpiVPD7").textContent = vpdMean7 == null ? "-" : (fmt(vpdMean7, 2) + " kPa");

      const rhVals = computed.map(r => r.index.metrics.rhMean7).filter(x => x != null && !isNaN(x));
      const rhMean7 = rhVals.length ? rhVals.reduce((a,b)=>a+b,0)/rhVals.length : null;
      $("kpiRH7").textContent = rhMean7 == null ? "-" : (fmt(rhMean7, 0) + "%");

    }

    function drawSpark(canvas, values){
      const c = canvas;
      const ctx = c.getContext("2d");
      const w = c.width = c.clientWidth * devicePixelRatio;
      const h = c.height = c.clientHeight * devicePixelRatio;
      ctx.clearRect(0,0,w,h);

      if (!values || values.length < 2) return;

      const finite = values.filter(v => v != null && isFinite(v));
      if (finite.length < 2) return;

      const min = Math.min(...finite);
      const max = Math.max(...finite);
      const span = (max - min) || 1;

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(56,189,248,0.95)";
      ctx.beginPath();

      const n = values.length;
      let moved = false;
      for (let i=0;i<n;i++){
        const v = values[i];
        if (v == null || !isFinite(v)) continue;
        const x = (i / (n-1)) * (w - 10*devicePixelRatio) + 5*devicePixelRatio;
        const y = h - ((v - min) / span) * (h - 10*devicePixelRatio) - 5*devicePixelRatio;
        if (!moved){
          ctx.moveTo(x,y);
          moved = true;
        } else {
          ctx.lineTo(x,y);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 1);
      ctx.lineTo(w, h - 1);
      ctx.stroke();
    }

    
    // District trend chart cache and renderer
    const districtTrend = {
      key: null,
      step: "day",
      start: null,
      end: null,
      times: [],
      mean: [],
      med: [],
      worst: [],
      worstSiteIdx: [],
      minScore: [],
      maxScore: [],
      spread: [],
      building: null,
      indicatorsKey: null,
      indicators: null,
      defaultMeta: ""
    };

    function cssVar(name){
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || null;
    }
    function addLocalDays(d, n){
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    }
    function localMidday(d){
      const x = new Date(d);
      x.setHours(12,0,0,0);
      return x;
    }
    function startOfLocalDay(d){
      const x = new Date(d);
      x.setHours(0,0,0,0);
      return x;
    }

    
    function startOfLocalHour(d){
      const x = new Date(d);
      x.setMinutes(0,0,0);
      return x;
    }
    function addLocalHours(d, n){
      const x = new Date(d);
      x.setHours(x.getHours() + n);
      return x;
    }

const STORAGE_KEY_DISTRICT_TREND_STEP = "fndi_district_trend_step_v1";

function getSelectedDistrictTrendStep(){
  const sel = document.getElementById("districtTrendStep");
  const saved = localStorage.getItem(STORAGE_KEY_DISTRICT_TREND_STEP);
  const fallback = saved || "day";

  if (sel){
    if (saved && sel.value !== saved) sel.value = saved;
    return sel.value || fallback;
  }
  return fallback;
}

function initDistrictTrendControls(){
  const sel = document.getElementById("districtTrendStep");
  if (!sel || sel._hooked) return;
  sel._hooked = true;

  const saved = localStorage.getItem(STORAGE_KEY_DISTRICT_TREND_STEP);
  if (saved && sel.value !== saved) sel.value = saved;

  sel.addEventListener("change", ()=>{
    const v = (sel.value === "hour") ? "hour" : "day";
    localStorage.setItem(STORAGE_KEY_DISTRICT_TREND_STEP, v);
    districtTrend.key = null;
    districtTrend.indicatorsKey = null;
    ensureDistrictTrendComputed(true).then(()=> renderDistrictTrendChart());
  });
}

function getDistrictTrendWindow(){
      let pastDays = clamp(Number($("pastDays").value) || 30, 7, 120);

      // Snapshot mode should mirror Live behavior with a 30d minimum lookback.
      if (timeMode === "historic" && !historicUseRange){
        pastDays = Math.max(pastDays, getSnapshotMinLookbackDays());
      }

      const end = getAsOfDate();

      if (timeMode === "historic"){
        // Only use the playback range for district charts when Range Mode is actually active.
        if (historicUseRange && historicRangeStart instanceof Date && !isNaN(historicRangeStart.getTime()) &&
            historicRangeEnd instanceof Date && !isNaN(historicRangeEnd.getTime())){
          let rs = new Date(historicRangeStart.getTime());
          let re = new Date(historicRangeEnd.getTime());
          if (rs > re){ const tmp = rs; rs = re; re = tmp; }
          return { start: startOfLocalDay(rs), end: re };
        }
        return { start: addLocalDays(startOfLocalDay(end), -(pastDays-1)), end };
      }

      return { start: addLocalDays(startOfLocalDay(end), -(pastDays-1)), end };
    }

    function windowKey(win, step){
      const a = win.start.toISOString().slice(0,16);
      const b = win.end.toISOString().slice(0,16);
      const loaded = dataCache?.loadedAt ? new Date(dataCache.loadedAt).toISOString().slice(0,19) : "none";
      step = (step === "hour") ? "hour" : "day";
      return `${timeMode}|${a}|${b}|${step}|${loaded}|${locations.length}`;
    }

    function computeDistrictStatsAt(dateObj){
      const scores = [];
      let worst = -Infinity;
      let worstSiteIdx = null;
      let min = Infinity;

      for (let i=0;i<locations.length;i++){
        const wx = dataCache?.wxList ? dataCache.wxList[i] : null;
        const flood = dataCache?.floodList ? dataCache.floodList[i] : null;
        if (!wx) continue;

        const riverOverride = (typeof getRiverIndexOverrideForLocationIndex_ === "function") ? getRiverIndexOverrideForLocationIndex_(i) : null;
        const r = computeLocationIndex(wx, flood, dateObj, riverOverride);
        const s = r?.score;
        if (s == null || !isFinite(s)) continue;

        scores.push(s);
        if (s > worst){ worst = s; worstSiteIdx = i; }
        if (s < min){ min = s; }
      }
      if (!scores.length) return null;

      const mean = scores.reduce((a,b)=>a+b,0)/scores.length;
      const med = median(scores);
      const max = worst;
      const spread = (isFinite(mean) && isFinite(max)) ? (max - mean) : null;

      return { mean, med, worst: max, worstSiteIdx, min, max, spread, n: scores.length };
    }

    async function ensureDistrictTrendComputed(force=false){
      const canvas = document.getElementById("districtTrendChart");
      const meta = document.getElementById("districtTrendMeta");
      if (!canvas || !meta) return;

      if (!dataCache?.wxList){ meta.textContent = "No data loaded"; return; }

      // Wire controls (once)
      initDistrictTrendControls();
      const step = getSelectedDistrictTrendStep();

      const win = getDistrictTrendWindow();

      // Clamp to loaded data range when available
      const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
      const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;

      let start = win.start;
      let end = win.end;
      if (rangeMin && start < rangeMin) start = rangeMin;
      if (rangeMax && end > rangeMax) end = rangeMax;

      const key = windowKey({start, end}, step);
      if (!force && districtTrend.key === key && districtTrend.step === step && districtTrend.times?.length > 1) return;

      if (districtTrend.building) return districtTrend.building;

      meta.textContent = "Building district trend from loaded data…";

      const buildPromise = (async ()=>{
        const times = [];
        const meanArr = [];
        const medArr = [];
        const worstArr = [];
        const worstSiteIdxArr = [];
        const minArr = [];
        const maxArr = [];
        const spreadArr = [];


        if (step === "hour"){
          let t = startOfLocalHour(start);
          const endT = startOfLocalHour(end);

          let safety = 0;
          const safetyLimit = 5000;
          while (t <= endT && safety < safetyLimit){
            const stats = computeDistrictStatsAt(t);
            times.push(new Date(t));
            meanArr.push(stats ? stats.mean : null);
            medArr.push(stats ? stats.med : null);
            worstArr.push(stats ? stats.worst : null);
            worstSiteIdxArr.push(stats ? stats.worstSiteIdx : null);
            minArr.push(stats ? stats.min : null);
            maxArr.push(stats ? stats.max : null);
            spreadArr.push(stats ? stats.spread : null);

            t = addLocalHours(t, 1);
            safety++;
            if (safety % 24 === 0) await new Promise(r=>setTimeout(r,0));
          }
        } else {
          let d = localMidday(start);
          const endDay = localMidday(end);

          let safety = 0;
          const safetyLimit = 600;
          while (d <= endDay && safety < safetyLimit){
            const stats = computeDistrictStatsAt(d);
            times.push(new Date(d));
            meanArr.push(stats ? stats.mean : null);
            medArr.push(stats ? stats.med : null);
            worstArr.push(stats ? stats.worst : null);
            worstSiteIdxArr.push(stats ? stats.worstSiteIdx : null);
            minArr.push(stats ? stats.min : null);
            maxArr.push(stats ? stats.max : null);
            spreadArr.push(stats ? stats.spread : null);

            d = addLocalDays(d, 1);
            safety++;
            if (safety % 5 === 0) await new Promise(r=>setTimeout(r,0));
          }
        }

        districtTrend.key = key;
        districtTrend.step = step;
        districtTrend.start = start;
        districtTrend.end = end;
        districtTrend.times = times;
        districtTrend.mean = meanArr;
        districtTrend.med = medArr;
        districtTrend.worst = worstArr;
        districtTrend.worstSiteIdx = worstSiteIdxArr;
        districtTrend.minScore = minArr;
        districtTrend.maxScore = maxArr;
        districtTrend.spread = spreadArr;
        districtTrend.indicatorsKey = null;
        districtTrend.indicators = null;

        const latestMean = [...meanArr].reverse().find(v => v != null && isFinite(v));
        const t0 = times[0] || start;
        const t1 = times[times.length-1] || end;
        const unitStep = (step === "hour") ? "hours" : "days";
        const rangeTxt = `${formatWhenNZ(t0)} to ${formatWhenNZ(t1)} • ${times.length} ${unitStep} • ${step === "hour" ? "Hourly" : "Daily"}`;
        meta.textContent = (latestMean != null) ? `${rangeTxt} • Latest mean ${latestMean.toFixed(0)}` : rangeTxt;

        // Add a quick indicator summary for the most recent day (tunable in config)
        const cfg = (typeof DISTRICT_TREND_INDICATORS !== "undefined") ? DISTRICT_TREND_INDICATORS : null;
        if (cfg && meanArr.length){
          const streakFromEnd = (arr, pred)=>{
            let n = 0;
            for (let i=arr.length-1;i>=0;i--){
              const v = arr[i];
              if (pred(v, i)) n++;
              else break;
            }
            return n;
          };


          const mult = (step === "hour") ? 24 : 1;

          const bits = [];
          const s80 = streakFromEnd(meanArr, v=>v!=null && isFinite(v) && v>=cfg.district.mean80_5.threshold);
          const s84 = streakFromEnd(meanArr, v=>v!=null && isFinite(v) && v>=cfg.district.mean84_5.threshold);
          const s94 = streakFromEnd(worstArr, v=>v!=null && isFinite(v) && v>=cfg.location.threshold);

          const d80 = Math.floor(s80 / mult);
          const d84 = Math.floor(s84 / mult);
          const d94 = Math.floor(s94 / mult);

          if (s84 >= cfg.district.mean84_5.days * mult * mult) bits.push(`District drought stress ${d84}d`);
          else if (s80 >= cfg.district.mean80_7.days * mult * mult) bits.push(`District drought warning ${d80}d`);
          else if (s80 >= cfg.district.mean80_5.days * mult * mult) bits.push(`District warning ${d80}d`);

          if (s94 >= cfg.location.acuteDays * mult * mult) bits.push(`Acute location stress ${d94}d`);
          else {
            const wLast = worstArr[worstArr.length - 1];
            if (wLast != null && isFinite(wLast) && wLast >= cfg.location.threshold) bits.push(step === "hour" ? "Location stress now" : "Location stress today");
          }

          if (bits.length){
            meta.textContent += ` • ${bits.join(" • ")}`;
          }
        }

        
        districtTrend.defaultMeta = meta.textContent;
        renderDistrictTrendChart();
      })().finally(()=>{ districtTrend.building = null; });

      districtTrend.building = buildPromise;
      return buildPromise;
    }

    // ---- District Trend Chart (Interactive Hover) ----
    const districtTrendHover = { idx: null, x: 0, y: 0, active: false };

    function trendLayout(w, h){
      // Leave room for y-axis labels
      const padL = 42, padR = 10, padT = 10, padB = 18;
      const x0 = padL, x1 = w - padR;
      const y0 = padT, y1 = h - padB;
      const minY = 0, maxY = 100;

      const n = districtTrend.times ? districtTrend.times.length : 0;
      const xAt = (i)=> x0 + (x1 - x0) * (n <= 1 ? 0 : i / (n - 1));
      const yAt = (v)=> y1 - ((clamp(v, minY, maxY) - minY) / (maxY - minY)) * (y1 - y0);

      return { padL, padR, padT, padB, x0, x1, y0, y1, minY, maxY, n, xAt, yAt };
    }

    function drawSeries(ctx, layout, values, color, lineWidth=2){
      const finite = (values || []).filter(v => v != null && isFinite(v));
      if (finite.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const n = values.length;
      let started = false;

      ctx.beginPath();
      for (let i=0;i<n;i++){
        const v = values[i];
        if (v == null || !isFinite(v)){
          started = false;
          continue;
        }
        const x = layout.xAt(i);
        const y = layout.yAt(v);
        if (!started){
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    
    // ---- District Trend Drought Indicators (Tunable Config) ----
    // These are used by the district trend chart to add shaded spans, guide lines, and markers.
    // Edit thresholds/days here to tune alerting behaviour.
    const DISTRICT_TREND_INDICATORS = {
      district: {
        // 80+ for 5 days: early signal
        mean80_5: { threshold: 80, days: 5, label: "[Drought Watch] Mean 80+ (5d)", colorVar: "--watch", alpha: 0.08 },

        // 80+ for 7 days: district drought warning
        mean80_7: { threshold: 80, days: 7, label: "[Drought Warning] Mean 80+ (7d)", colorVar: "--warn", alpha: 0.12 },

        // 84+ for 5 days: district drought stress
        mean84_5: { threshold: 84, days: 5, label: "[Drought Danger] Mean 84+ (5d)", colorVar: "--severe", alpha: 0.14 }
      },

      location: {
        // 94+ at any location (worst series)
        threshold: 94,
        acuteDays: 3,
        labelDay: "Location Stress 94+",
        labelAcute: "[Location danger] (94+ for 3d)",
        colorVar: "--extreme",
        alpha: 0.12
      },

      // When locations are all close together, stress is more likely district-wide rather than patchy
      spread: {
        maxPoints: 4,
        minMean: 80,
        days: 3,
        label: "District Wide Stress (Low Worst-Mean)",
        colorVar: "--watch",
        alpha: 0.08
      },

      // Horizontal guide lines in the chart
      guides: [
        { value: 80, label: "80", colorVar: "--warn", alpha: 0.55 },
        { value: 84, label: "84", colorVar: "--severe", alpha: 0.55 },
        { value: 94, label: "94", colorVar: "--extreme", alpha: 0.55 }
      ]
    };

    function hexToRgba(hex, a){
      if (!hex) return `rgba(255,255,255,${a})`;
      const c = String(hex).trim();
      if (c.startsWith("#")){
        let h = c.slice(1);
        if (h.length === 3) h = h.split("").map(ch=>ch+ch).join("");
        if (h.length !== 6) return `rgba(255,255,255,${a})`;
        const r = parseInt(h.slice(0,2),16);
        const g = parseInt(h.slice(2,4),16);
        const b = parseInt(h.slice(4,6),16);
        return `rgba(${r},${g},${b},${a})`;
      }
      if (c.startsWith("rgb(")){
        return c.replace("rgb(", "rgba(").replace(")", `,${a})`);
      }
      if (c.startsWith("rgba(")) return c;
      return c;
    }

    function streakSpans(values, predicate, minLen){
      const spans = [];
      let s = null;

      for (let i=0;i<values.length;i++){
        const ok = Boolean(predicate(values[i], i));
        if (ok){
          if (s == null) s = i;
        } else if (s != null){
          const e = i - 1;
          const len = e - s + 1;
          if (len >= minLen) spans.push({ s, e, len });
          s = null;
        }
      }

      if (s != null){
        const e = values.length - 1;
        const len = e - s + 1;
        if (len >= minLen) spans.push({ s, e, len });
      }

      return spans;
    }

    function computeDistrictTrendIndicators(){
      const key = `${districtTrend.key || "none"}|${districtTrend.step || "day"}|${districtTrend.times?.length || 0}|indicators_v2`;
      if (districtTrend.indicatorsKey === key && districtTrend.indicators) return districtTrend.indicators;

      const mean = districtTrend.mean || [];
      const worst = districtTrend.worst || [];
      const spread = districtTrend.spread || [];

      const cfg = DISTRICT_TREND_INDICATORS;

      const mult = (districtTrend.step === "hour") ? 24 : 1;

      const spans = [];

      // District mean spans
      spans.push(
        ...streakSpans(
          mean,
          v => v!=null && isFinite(v) && v>=cfg.district.mean80_5.threshold,
          cfg.district.mean80_5.days * mult
        ).map(x=>({ ...x, type: "mean80_5", label: cfg.district.mean80_5.label, colorVar: cfg.district.mean80_5.colorVar, alpha: cfg.district.mean80_5.alpha }))
      );

      spans.push(
        ...streakSpans(
          mean,
          v => v!=null && isFinite(v) && v>=cfg.district.mean80_7.threshold,
          cfg.district.mean80_7.days * mult
        ).map(x=>({ ...x, type: "mean80_7", label: cfg.district.mean80_7.label, colorVar: cfg.district.mean80_7.colorVar, alpha: cfg.district.mean80_7.alpha }))
      );

      spans.push(
        ...streakSpans(
          mean,
          v => v!=null && isFinite(v) && v>=cfg.district.mean84_5.threshold,
          cfg.district.mean84_5.days * mult
        ).map(x=>({ ...x, type: "mean84_5", label: cfg.district.mean84_5.label, colorVar: cfg.district.mean84_5.colorVar, alpha: cfg.district.mean84_5.alpha }))
      );

      // Tight spread span: high mean and low spread over multiple days suggests district-wide stress
      spans.push(
        ...streakSpans(
          mean,
          (v,i)=>{
            const sp = spread[i];
            return v!=null && isFinite(v) && v>=cfg.spread.minMean && sp!=null && isFinite(sp) && sp<=cfg.spread.maxPoints;
          },
          cfg.spread.days * mult
        ).map(x=>({ ...x, type: "tight_spread", label: cfg.spread.label, colorVar: cfg.spread.colorVar, alpha: cfg.spread.alpha }))
      );

      // Acute location stress span: worst location 94+ for N days
      spans.push(
        ...streakSpans(
          worst,
          v => v!=null && isFinite(v) && v>=cfg.location.threshold,
          cfg.location.acuteDays * mult
        ).map(x=>({ ...x, type: "acute_loc", label: cfg.location.labelAcute, colorVar: cfg.location.colorVar, alpha: cfg.location.alpha }))
      );

      // Single-day markers when the worst location is 94+
      const markers = [];
      for (let i=0;i<worst.length;i++){
        if (districtTrend.step === "hour"){
          const t = (districtTrend.times && districtTrend.times[i]) ? districtTrend.times[i] : null;
          if (t && t.getHours() !== 12) continue;
        }
        const v = worst[i];
        if (v!=null && isFinite(v) && v>=cfg.location.threshold){
          markers.push({ idx: i, type: "loc94", label: cfg.location.labelDay });
        }
      }

      const out = { spans, markers };
      districtTrend.indicatorsKey = key;
      districtTrend.indicators = out;
      return out;
    }

    function spanLabelsForIdx(i, indicators){
      const labels = [];
      for (const sp of (indicators?.spans || [])){
        if (i >= sp.s && i <= sp.e) labels.push(sp.label);
      }
      return labels;
    }

    function drawSpanFill(ctx, layout, span, color){
      const x0 = layout.xAt(span.s);
      const x1 = layout.xAt(span.e);
      ctx.fillStyle = color;
      ctx.fillRect(x0, layout.y0, (x1 - x0) + 1, (layout.y1 - layout.y0));
    }

    function drawThresholdLine(ctx, layout, v, label, color){
      const y = layout.yAt(v);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(layout.x0, y);
      ctx.lineTo(layout.x1, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = "10px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, layout.x0 + 4, y - 2);
      ctx.restore();
    }

    function drawTopTriangle(ctx, x, y, size, color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();
    }

function ensureDistrictTrendHoverHooks(){
      const canvas = document.getElementById("districtTrendChart");
      if (!canvas || canvas._hoverHooked) return;
      canvas._hoverHooked = true;

      const tip = document.getElementById("districtTrendTooltip");

      const onMove = (ev)=>{
        if (!districtTrend.times || districtTrend.times.length < 2){
          districtTrendHover.idx = null;
          if (tip) tip.style.display = "none";
          return;
        }

        const r = canvas.getBoundingClientRect();
        const x = ev.clientX - r.left;
        const y = ev.clientY - r.top;
    const layout = trendLayout(r.width, r.height);

        // Only show hover info inside the plot area
        if (x < layout.x0 || x > layout.x1 || y < layout.y0 || y > layout.y1){
          districtTrendHover.idx = null;
          if (tip) tip.style.display = "none";
        renderDistrictTrendChart();
          return;
        }

        const t = (x - layout.x0) / (layout.x1 - layout.x0);
        const idx = clamp(Math.round(t * (layout.n - 1)), 0, layout.n - 1);

        districtTrendHover.idx = idx;
        districtTrendHover.x = x;
        districtTrendHover.y = y;
        districtTrendHover.active = true;

        renderDistrictTrendChart();
      };

      const onLeave = ()=>{
        districtTrendHover.idx = null;
        districtTrendHover.active = false;

        const meta = document.getElementById("districtTrendMeta");
        if (meta && districtTrend.defaultMeta) meta.textContent = districtTrend.defaultMeta;

        if (tip) tip.style.display = "none";
        renderDistrictTrendChart();
      };

      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseleave", onLeave);

      // Touch support (mobile/tablet)
      canvas.addEventListener("touchstart", (e)=>{
        if (e.touches && e.touches.length) onMove(e.touches[0]);
      }, {passive:true});
      canvas.addEventListener("touchmove", (e)=>{
        if (e.touches && e.touches.length) onMove(e.touches[0]);
      }, {passive:true});
      canvas.addEventListener("touchend", onLeave);
    }

    function renderDistrictTrendChart(){
      const canvas = document.getElementById("districtTrendChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ensureDistrictTrendHoverHooks();
      const tip = document.getElementById("districtTrendTooltip");

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, w, h);

      const layout = trendLayout(w, h);

      // Gridlines (0..100)
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let p=0; p<=5; p++){
        const v = layout.minY + (layout.maxY - layout.minY) * (p / 5);
        const y = layout.yAt(v);
        ctx.beginPath();
        ctx.moveTo(layout.x0, y);
        ctx.lineTo(layout.x1, y);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      for (let v=layout.minY; v<=layout.maxY; v+=20){
        const y = layout.yAt(v);
        ctx.beginPath();
        ctx.moveTo(layout.x0 - 4, y);
        ctx.lineTo(layout.x0, y);
        ctx.stroke();
        ctx.fillText(String(v), layout.x0 - 6, y);
      }

      // Left axis line
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(layout.x0, layout.y0);
      ctx.lineTo(layout.x0, layout.y1);
      ctx.stroke();

      if (!districtTrend.times || districtTrend.times.length < 2){
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("District trend will appear once data is loaded", 10, 20);
        if (tip) tip.style.display = "none";
        return;
      }


      // Indicator overlays (background spans and guide lines)
      const indicators = computeDistrictTrendIndicators();

      if (indicators && indicators.spans && indicators.spans.length){
        const order = { mean80_5: 1, tight_spread: 2, mean80_7: 3, mean84_5: 4, acute_loc: 5 };
        const spansSorted = [...indicators.spans].sort((a,b)=> (order[a.type]||0) - (order[b.type]||0));

        for (const sp of spansSorted){
          const base = cssVar(sp.colorVar) || "#ffffff";
          const fill = hexToRgba(base, sp.alpha);
          drawSpanFill(ctx, layout, sp, fill);
        }
      }

      if (DISTRICT_TREND_INDICATORS && DISTRICT_TREND_INDICATORS.guides){
        for (const g of DISTRICT_TREND_INDICATORS.guides){
          const base = cssVar(g.colorVar) || "#ffffff";
          const col = hexToRgba(base, g.alpha);
          drawThresholdLine(ctx, layout, g.value, g.label, col);
        }
      }

      const cMean = cssVar("--ok") || "#38bdf8";
      const cMed = cssVar("--warn") || "#fbbf24";
      const cWorst = cssVar("--extreme") || "#f97316";

      drawSeries(ctx, layout, districtTrend.worst, cWorst, 2);
      drawSeries(ctx, layout, districtTrend.med, cMed, 2);
      drawSeries(ctx, layout, districtTrend.mean, cMean, 2.5);
      // Markers for worst-location 94+ days (triangles at top)
      if (indicators && indicators.markers && indicators.markers.length){
        const mkColor = cssVar(DISTRICT_TREND_INDICATORS.location.colorVar) || "#f97316";
        const yTop = layout.y0 + 2;
        for (const mk of indicators.markers){
          const x = layout.xAt(mk.idx);
          drawTopTriangle(ctx, x, yTop, 5, mkColor);
        }
      }

      // Label acute spans
      if (indicators && indicators.spans){
        const acute = indicators.spans.filter(s=>s.type === "acute_loc");
        if (acute.length){
          const lblColor = cssVar(DISTRICT_TREND_INDICATORS.location.colorVar) || "#f97316";
          ctx.fillStyle = hexToRgba(lblColor, 0.85);
          ctx.font = "10px system-ui, -apple-system, Segoe UI, Roboto, Arial";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          for (const sp of acute){
            const x = layout.xAt(sp.s) + 4;
            ctx.fillText("Acute", x, layout.y0 + 12);
          }
        }
      }


      // Marker for current as-of day
      const asOf = getAsOfDate();
      const t0 = districtTrend.times[0]?.getTime();
      const t1 = districtTrend.times[districtTrend.times.length - 1]?.getTime();
      if (t0 && t1 && asOf){
        const tt = asOf.getTime();
        if (tt >= t0 && tt <= t1){
          const stepMs = (districtTrend.step === "hour") ? (3600*1000) : (24*3600*1000);
          const ptIdx = Math.round((tt - t0) / stepMs);
          const idx = clamp(ptIdx, 0, layout.n - 1);
          const x = layout.xAt(idx);

          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, layout.y0);
          ctx.lineTo(x, layout.y1);
          ctx.stroke();
        }
      }

      // Hover overlay
      const hoverIdx = (districtTrendHover && districtTrendHover.idx != null) ? districtTrendHover.idx : null;
      if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < layout.n){
        const x = layout.xAt(hoverIdx);

        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, layout.y0);
        ctx.lineTo(x, layout.y1);
        ctx.stroke();

        const drawDot = (v, color)=>{
          if (v == null || !isFinite(v)) return null;
          const y = layout.yAt(v);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
          return y;
        };

        const vMean = districtTrend.mean?.[hoverIdx];
        const vMed = districtTrend.med?.[hoverIdx];
        const vWorst = districtTrend.worst?.[hoverIdx];

        const yMean = drawDot(vMean, cMean);
        const yMed = drawDot(vMed, cMed);
        const yWorst = drawDot(vWorst, cWorst);

        const dt = districtTrend.times[hoverIdx];
        const dtTxt = dt ? formatWhenNZ(dt) : `Day ${hoverIdx + 1}`;

        const meanTxt = (vMean != null && isFinite(vMean)) ? vMean.toFixed(0) : "-";
        const medTxt = (vMed != null && isFinite(vMed)) ? vMed.toFixed(0) : "-";
        const worstTxt = (vWorst != null && isFinite(vWorst)) ? vWorst.toFixed(0) : "-";

        const worstSiteIdx = districtTrend.worstSiteIdx ? districtTrend.worstSiteIdx[hoverIdx] : null;
        const worstSiteName = (worstSiteIdx != null && locations[worstSiteIdx]) ? locations[worstSiteIdx].name : null;
        const spreadVal = districtTrend.spread ? districtTrend.spread[hoverIdx] : null;
        const spreadTxt = (spreadVal != null && isFinite(spreadVal)) ? spreadVal.toFixed(1) : "-";
        const indLabels = spanLabelsForIdx(hoverIdx, indicators);
        const indicatorTxt = indLabels.length ? indLabels.join(" | ") : "";
        const worstSiteHtml = worstSiteName ? `<span><span style="opacity:0.75;">Worst Site</span> <span class="mono" style="font-weight:700;">${escapeHtml(worstSiteName)}</span></span>` : "";
        const indicatorHtml = indicatorTxt ? `<span><span style="opacity:0.75;">Indicators</span> ${escapeHtml(indicatorTxt)}</span>` : "";

        // Also update the text line under the chart while hovering
        const meta = document.getElementById("districtTrendMeta");
        if (meta){
          meta.textContent = `${dtTxt} • Mean ${meanTxt} • Median ${medTxt} • Worst ${worstTxt}` + (spreadTxt !== "-" ? ` • Worst-Mean ${spreadTxt}` : "") + (worstSiteName ? ` • Worst Site ${worstSiteName}` : "") + (indicatorTxt ? ` • ${indicatorTxt}` : "");
        }

        if (tip){
          tip.innerHTML = `
            <div class="mono" style="font-weight:700; margin-bottom:4px;">${escapeHtml(dtTxt)}</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <span><span style="opacity:0.75;">Mean</span> <span class="mono" style="font-weight:700;">${meanTxt}</span></span>
              <span><span style="opacity:0.75;">Median</span> <span class="mono" style="font-weight:700;">${medTxt}</span></span>
              <span><span style="opacity:0.75;">Worst</span> <span class="mono" style="font-weight:700;">${worstTxt}</span></span>
            </div>
            <div style="margin-top:6px; display:flex; flex-direction:column; gap:2px;">
              ${worstSiteHtml}
              <span><span style="opacity:0.75;">Worst-Mean</span> <span class="mono" style="font-weight:700;">${spreadTxt}</span></span>
              ${indicatorHtml}
            </div>
          `;
          tip.style.display = "block";

          // Position near the mean dot if possible, otherwise use the first available series
          let yRef = yMean;
          if (yRef == null) yRef = yMed;
          if (yRef == null) yRef = yWorst;
          if (yRef == null) yRef = (layout.y0 + layout.y1) / 2;

          // Force layout so we can read size
          const tipRect = tip.getBoundingClientRect();

          let left = x + 12;
          let top = yRef - tipRect.height / 2;

          // Clamp inside the chart area
          const maxLeft = w - tipRect.width - 6;
          left = clamp(left, 6, maxLeft);

          const maxTop = h - tipRect.height - 6;
          top = clamp(top, 6, maxTop);

          tip.style.left = `${left}px`;
          tip.style.top = `${top}px`;
        }
      } else {
        // Restore default meta if not hovering
        const meta = document.getElementById("districtTrendMeta");
        if (meta && districtTrend.defaultMeta) meta.textContent = districtTrend.defaultMeta;
        if (tip) tip.style.display = "none";
      }
    }
// ---- District Weather and Environment Trend (Interactive Hover) ----
const STORAGE_KEY_ENV_METRIC = "fndi_district_env_metric_v1";
const STORAGE_KEY_ENV_STEP = "fndi_district_env_step_v1";

const districtEnvTrend = {
  key: null,
  metric: "rain_mm",
  step: "day",
  start: null,
  end: null,
  times: [],
  values: [],
  building: null,
  defaultMeta: ""
};

const districtEnvHover = { idx: null, x: 0, y: 0, active: false };

const ENV_METRICS = {
  rain_mm:   { label: "Rain (Daily)", unit: "mm",     digits: 1 },
  rain_total_mm: { label: "District Rain Total (Sum)", unit: "mm", digits: 1 },
  temp_max_c: { label: "Air Temperature High (District Max)", unit: "°C", digits: 1 },
  temp_min_c: { label: "Air Temperature Low (District Min)", unit: "°C", digits: 1 },
  rh_max_pct: { label: "Relative Humidity High (District Max)", unit: "%", digits: 0 },
  rh_min_pct: { label: "Relative Humidity Low (District Min)", unit: "%", digits: 0 },
  wick_rating: { label: "Moisture Wicking Wind Rating", unit: "idx", digits: 0 },
  rain14_mm: { label: "Rain (14 Day Mean)", unit: "mm/day", digits: 2 },
  et0_mm:    { label: "ET0 (Daily)", unit: "mm",      digits: 1 },
  et07_mm:   { label: "ET0 (7 Day Mean)", unit: "mm/day", digits: 2 },
  temp_c:    { label: "Air Temperature (Daily Mean)", unit: "°C", digits: 1 },
  rh_pct:    { label: "Relative Humidity (Daily Mean)", unit: "%", digits: 0 },
  vpd_kpa:   { label: "VPD (Daily Mean)", unit: "kPa", digits: 2 },
  soil_9_27: { label: "Soil Moisture 9-27 cm (Daily Mean)", unit: "m³/m³", digits: 3 },
  soil_27_81:{ label: "Soil Moisture 27-81 cm (Daily Mean)", unit: "m³/m³", digits: 3 },
  soil_0_1: { label: "Soil Moisture 0-1 cm (Daily Mean)", unit: "m³/m³", digits: 3 },
  soil_1_3: { label: "Soil Moisture 1-3 cm (Daily Mean)", unit: "m³/m³", digits: 3 },
  soil_3_9: { label: "Soil Moisture 3-9 cm (Daily Mean)", unit: "m³/m³", digits: 3 },
  wind_dir_deg: { label: "Wind Direction 10m (Daily Mean)", unit: "°", digits: 0 },
  plume_idx: { label: "Tropical Plume Signal (Local Proxy)", unit: "idx", digits: 0 },
  wind_ms:   { label: "Wind Speed 10m (Daily Mean)", unit: "m/s", digits: 1 },
  msl_hpa:   { label: "Mean Sea Level Pressure (Daily Mean)", unit: "hPa", digits: 0 },
};

function clamp01(x){ return clamp(x, 0, 1); }

// ---- Tropical Plume Signal (Local Proxy) ----
// This is a context layer only. It does not modify the drought index.
// Heuristic components (0-100): NE flow persistence + moisture support + pressure fall + forecast rain.
function computeTropicalPlumeSignal(wx, asOf){
  if (!wx) return { score: null, label: "-", reason: "-" };

  const hourly = wx.hourly || {};
  const daily = wx.daily || {};

  const neFrac = computeNEFractionWindow(hourly.time, hourly.wind_direction_10m, hourly.wind_speed_10m, asOf, 3);
  const rhMean = meanHourlyWindow(hourly.time, hourly.relative_humidity_2m, asOf, 3);
  const vpdMean = meanHourlyWindow(hourly.time, hourly.vapour_pressure_deficit, asOf, 3);

  // Pressure tendency: mean last 24h minus mean previous 24h (negative = falling)
  const pNow24 = meanHourlyWindow(hourly.time, hourly.pressure_msl, asOf, 1);
  const prev24End = new Date(asOf.getTime() - 24 * 3600 * 1000);
  const pPrev24 = meanHourlyWindow(hourly.time, hourly.pressure_msl, prev24End, 1);
  const dp = (pNow24 != null && pPrev24 != null) ? (pNow24 - pPrev24) : null;

  const rain3 = sumDailyFuture(daily.time, daily.precipitation_sum, asOf, 3);

  const windScore  = (neFrac == null) ? 0 : (40 * clamp01((neFrac - 0.25) / 0.50));
  const moistBase  = (rhMean == null) ? 0 : (25 * clamp01((rhMean - 70) / 20));
  const vpdAdj     = (vpdMean == null) ? 0 : (10 * clamp01((1.2 - vpdMean) / 1.2));
  const moistScore = moistBase + vpdAdj;

  const pressScore = (dp == null) ? 0 : (15 * clamp01(((-dp) - 0.5) / 3.0));
  const rainScore  = (rain3 == null) ? 0 : (20 * clamp01((rain3 - 10) / 40));

  let score = windScore + moistScore + pressScore + rainScore;
  score = Math.round(clamp(score, 0, 100));

  const label = (score >= 75) ? "High" : (score >= 55) ? "Elevated" : (score >= 35) ? "Possible" : "Low";
  const reason = buildPlumeReason(neFrac, rhMean, vpdMean, dp, rain3);

  return { score, label, neFrac, rhMean, vpdMean, dp, rain3, reason };
}

function computeNEFractionWindow(hourlyTime, windDir, windSpd, endDate, daysBack){
  if (!hourlyTime || !windDir || !windSpd || !(endDate instanceof Date)) return null;

  const endMs = endDate.getTime();
  const startMs = endMs - daysBack * 24 * 3600 * 1000;

  let n = 0;
  let k = 0;

  for (let i=0;i<hourlyTime.length;i++){
    const dt = parseLocalDateTime(hourlyTime[i]);
    if (!dt) continue;
    const ms = dt.getTime();
    if (ms < startMs) continue;
    if (ms > endMs) continue;

    const dir = windDir[i];
    const spd = windSpd[i];
    if (dir == null || spd == null || !isFinite(dir) || !isFinite(spd)) continue;

    n++;
    if (spd >= 3 && dir >= 20 && dir <= 120) k++;
  }
  return n ? (k / n) : null;
}

function buildPlumeReason(neFrac, rhMean, vpdMean, dp, rain3){
  const bits = [];
  if (neFrac != null) bits.push(`NE flow ${Math.round(neFrac * 100)}%`);
  if (rhMean != null) bits.push(`RH ${Math.round(rhMean)}%`);
  if (vpdMean != null) bits.push(`VPD ${Number(vpdMean).toFixed(2)} kPa`);
  if (dp != null) bits.push(`ΔP ${Number(dp).toFixed(1)} hPa/24h`);
  if (rain3 != null) bits.push(`Rain+3d ${Number(rain3).toFixed(1)} mm`);
  return bits.join(" • ");
}

function computePlumeDailySeriesForLocation(wx, endDate, daysBack=14){
  const out = { dates: [], values: [] };
  if (!wx || !(endDate instanceof Date)) return out;

  const endDay = startOfLocalDay(endDate);
  const startDay = addLocalDays(endDay, -(daysBack - 1));

  let d = new Date(startDay);
  let safety = 0;
  while (d <= endDay && safety < 400){
    const eod = new Date(addLocalDays(startOfLocalDay(d), 1).getTime() - 60 * 1000);
    const sig = computeTropicalPlumeSignal(wx, eod);
    out.dates.push(ymdLocal(d));
    out.values.push(sig && sig.score != null ? sig.score : null);

    d = addLocalDays(d, 1);
    safety++;
  }
  return out;
}

function computeDistrictPlumeDailySeries(endDate, daysBack=14){
  const out = { dates: [], values: [] };
  if (!dataCache?.wxList || !dataCache.wxList.length || !(endDate instanceof Date)) return out;

  const endDay = startOfLocalDay(endDate);
  const startDay = addLocalDays(endDay, -(daysBack - 1));

  let d = new Date(startDay);
  let safety = 0;
  while (d <= endDay && safety < 400){
    const eod = new Date(addLocalDays(startOfLocalDay(d), 1).getTime() - 60 * 1000);

    let sum = 0, n = 0;
    for (let i=0;i<dataCache.wxList.length;i++){
      const wx = dataCache.wxList[i];
      const sig = computeTropicalPlumeSignal(wx, eod);
      const v = sig?.score;
      if (v == null || !isFinite(v)) continue;
      sum += v; n++;
    }

    out.dates.push(ymdLocal(d));
    out.values.push(n ? (sum / n) : null);

    d = addLocalDays(d, 1);
    safety++;
  }
  return out;
}

function updateDistrictClimatePanel(asOf){
  const plumeTag = document.getElementById("districtPlumeTag");
  const reasonEl = document.getElementById("districtPlumeReason");
  if (!plumeTag || !(asOf instanceof Date)) return;

  if (!dataCache?.wxList || !dataCache.wxList.length){
    plumeTag.innerHTML = `<span class="dot" style="background:var(--muted)"></span>Plume: <span class="mono">-</span>`;
    if (reasonEl) reasonEl.textContent = "-";
    return;
  }

  let sumScore = 0, nScore = 0;
  let sumNe = 0, nNe = 0;
  let sumRh = 0, nRh = 0;
  let sumVpd = 0, nVpd = 0;
  let sumDp = 0, nDp = 0;
  let sumRain3 = 0, nRain3 = 0;

  for (let i=0;i<dataCache.wxList.length;i++){
    const sig = computeTropicalPlumeSignal(dataCache.wxList[i], asOf);
    if (!sig) continue;

    if (sig.score != null && isFinite(sig.score)){ sumScore += sig.score; nScore++; }
    if (sig.neFrac != null && isFinite(sig.neFrac)){ sumNe += sig.neFrac; nNe++; }
    if (sig.rhMean != null && isFinite(sig.rhMean)){ sumRh += sig.rhMean; nRh++; }
    if (sig.vpdMean != null && isFinite(sig.vpdMean)){ sumVpd += sig.vpdMean; nVpd++; }
    if (sig.dp != null && isFinite(sig.dp)){ sumDp += sig.dp; nDp++; }
    if (sig.rain3 != null && isFinite(sig.rain3)){ sumRain3 += sig.rain3; nRain3++; }
  }

  const meanScore = nScore ? (sumScore / nScore) : null;
  const label = (meanScore == null) ? "-" :
    (meanScore >= 75) ? "High" :
    (meanScore >= 55) ? "Elevated" :
    (meanScore >= 35) ? "Possible" : "Low";

  const dot = (meanScore == null) ? "var(--muted)" :
    (meanScore >= 75) ? "var(--severe)" :
    (meanScore >= 55) ? "var(--warn)" :
    (meanScore >= 35) ? "var(--watch)" : "var(--ok)";

  plumeTag.innerHTML = (meanScore == null)
    ? `<span class="dot" style="background:var(--muted)"></span>Plume: <span class="mono">-</span>`
    : `<span class="dot" style="background:${dot}"></span>Plume: <span class="mono">${fmt(meanScore,0)}</span> <span class="mono" style="opacity:0.75;">${label}</span>`;

  if (reasonEl){
    const r = buildPlumeReason(
      nNe ? (sumNe / nNe) : null,
      nRh ? (sumRh / nRh) : null,
      nVpd ? (sumVpd / nVpd) : null,
      nDp ? (sumDp / nDp) : null,
      nRain3 ? (sumRain3 / nRain3) : null
    );
    reasonEl.textContent = r || "-";
  }

  const explainEl = document.getElementById("districtExplainPlume");
  if (explainEl){
    const sig = {
      score: meanScore,
      label,
      neFrac: nNe ? (sumNe / nNe) : null,
      rhMean: nRh ? (sumRh / nRh) : null,
      vpdMean: nVpd ? (sumVpd / nVpd) : null,
      dp: nDp ? (sumDp / nDp) : null,
      rain3: nRain3 ? (sumRain3 / nRain3) : null
    };
    explainEl.textContent = buildPlumeExplainText(sig);
  }

}

function getSelectedEnvMetric(){
  const sel = document.getElementById("districtEnvMetric");
  const saved = localStorage.getItem(STORAGE_KEY_ENV_METRIC);
  const fallback = saved || "rain_mm";

  if (sel){
    if (saved && sel.value !== saved) sel.value = saved;
    return sel.value || fallback;
  }
  return fallback;
}


function getSelectedEnvStep(){
  const sel = document.getElementById("districtEnvStep");
  const saved = localStorage.getItem(STORAGE_KEY_ENV_STEP);
  const fallback = saved || "day";

  if (sel){
    if (saved && sel.value !== saved) sel.value = saved;
    return sel.value || fallback;
  }
  return fallback;
}

function isEnvMetricHourlyCapable(metric){
  const base = [
    "temp_c","rh_pct","vpd_kpa",
    "soil_0_1","soil_1_3","soil_3_9","soil_9_27","soil_27_81",
    "wind_ms","wind_dir_deg","msl_hpa",
    "rain_total_mm","temp_max_c","temp_min_c","rh_max_pct","rh_min_pct","wick_rating",
    "plume_idx"
  ].includes(metric);

  if (!base) return false;

  // Some metrics depend on optional hourly fields that may not exist in older bundles
  if (metric === "rain_total_mm"){
    const wxList = dataCache && dataCache.wxList ? dataCache.wxList : [];
    return wxList.some(wx => Array.isArray(wx?.hourly?.precipitation));
  }

  return true;
}


function ensureWxHourlyIndex(wx){
  const hourly = wx && wx.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return null;
  const src = hourly.time;

  if (wx._hourIdx && wx._hourIdx.src === src) return wx._hourIdx.map;

  const map = new Map();
  for (let i=0;i<src.length;i++){
    const d = parseLocalDateTime(src[i]);
    if (!d) continue;
    const key = ymdhLocal(d);
    if (key) map.set(key, i);
  }

  wx._hourIdx = { src, map };
  return map;
}

function computeLocationEnvMetricAtHour(wx, when, metric){
  if (!wx || !when) return null;

  if (metric === "plume_idx"){
    const sig = computeTropicalPlumeSignal(wx, when);
    return (sig && sig.score != null && isFinite(sig.score)) ? Number(sig.score) : null;
  }

  const hourly = wx.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return null;

  const map = ensureWxHourlyIndex(wx);
  if (!map) return null;

  const idx = map.get(ymdhLocal(when));
  if (idx == null) return null;

  const pick = (arr)=>{
    if (!arr || idx < 0 || idx >= arr.length) return null;
    const v = Number(arr[idx]);
    return isFinite(v) ? v : null;
  };

  switch(metric){
    case "rain_total_mm": return pick(hourly.precipitation);
    case "temp_c": return pick(hourly.temperature_2m);
    case "rh_pct": return pick(hourly.relative_humidity_2m);
    case "vpd_kpa": return pick(hourly.vapour_pressure_deficit);
    case "soil_0_1": return pick(hourly.soil_moisture_0_1cm);
    case "soil_1_3": return pick(hourly.soil_moisture_1_3cm);
    case "soil_3_9": return pick(hourly.soil_moisture_3_9cm);
    case "soil_9_27": return pick(hourly.soil_moisture_9_27cm);
    case "soil_27_81": return pick(hourly.soil_moisture_27_81cm);
    case "wind_ms": return pick(hourly.wind_speed_10m);
    case "wind_dir_deg": return pick(hourly.wind_direction_10m);
    case "msl_hpa": return pick(hourly.pressure_msl);
    default: return null;
  }
}

function computeDistrictEnvMeanAtHour(when, metric){
  const wxList = dataCache && dataCache.wxList ? dataCache.wxList : [];
  if (!wxList || !wxList.length) return null;

  // District total rain (hourly sum)
  if (metric === "rain_total_mm"){
    let sum = 0, n = 0;
    for (const wx of wxList){
      const v = computeLocationEnvMetricAtHour(wx, when, "rain_total_mm");
      if (v == null || !isFinite(v)) continue;
      sum += v; n++;
    }
    return n ? sum : null;
  }

  // District extremes at a given hour
  if (metric === "temp_max_c"){
    let best = null;
    for (const wx of wxList){
      const v = computeLocationEnvMetricAtHour(wx, when, "temp_c");
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.max(best, v);
    }
    return best;
  }
  if (metric === "temp_min_c"){
    let best = null;
    for (const wx of wxList){
      const v = computeLocationEnvMetricAtHour(wx, when, "temp_c");
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.min(best, v);
    }
    return best;
  }
  if (metric === "rh_max_pct"){
    let best = null;
    for (const wx of wxList){
      const v = computeLocationEnvMetricAtHour(wx, when, "rh_pct");
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.max(best, v);
    }
    return best;
  }
  if (metric === "rh_min_pct"){
    let best = null;
    for (const wx of wxList){
      const v = computeLocationEnvMetricAtHour(wx, when, "rh_pct");
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.min(best, v);
    }
    return best;
  }

  // Moisture wicking wind rating (district mean at hour)
  if (metric === "wick_rating"){
    let sum = 0, n = 0;
    for (const wx of wxList){
      const wind = computeLocationEnvMetricAtHour(wx, when, "wind_ms");
      const rh = computeLocationEnvMetricAtHour(wx, when, "rh_pct");
      const vpd = computeLocationEnvMetricAtHour(wx, when, "vpd_kpa");
      const r = moistureWickingWindRating(wind, rh, vpd);
      if (r == null || !isFinite(r)) continue;
      sum += r; n++;
    }
    return n ? (sum / n) : null;
  }

  // Wind direction: circular mean
  if (metric === "wind_dir_deg"){
    let sumSin = 0, sumCos = 0, n = 0;
    for (const wx of wxList){
      const deg = computeLocationEnvMetricAtHour(wx, when, metric);
      if (deg == null || !isFinite(deg)) continue;
      const rad = deg * Math.PI / 180;
      sumSin += Math.sin(rad);
      sumCos += Math.cos(rad);
      n++;
    }
    if (!n) return null;
    let mean = Math.atan2(sumSin / n, sumCos / n) * 180 / Math.PI;
    if (mean < 0) mean += 360;
    return mean;
  }

  // Default: district-wide mean
  let sum = 0, n = 0;
  for (const wx of wxList){
    const v = computeLocationEnvMetricAtHour(wx, when, metric);
    if (v == null || !isFinite(v)) continue;
    sum += v;
    n++;
  }
  return n ? (sum / n) : null;
}

// Interactive mini charts for Recent Trend (hover + y-axis)
const miniTrendCharts = new Map();

function niceTicks(min, max, ticks=4){
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max){
    const v = min;
    return [v-1, v, v+1];
  }
  const span = max - min;
  const raw = span / Math.max(1, ticks-1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step = mag;
  if (norm >= 5) step = 5*mag;
  else if (norm >= 2) step = 2*mag;
  else step = 1*mag;

  const niceMin = Math.floor(min/step)*step;
  const niceMax = Math.ceil(max/step)*step;
  const out = [];
  for (let v=niceMin; v<=niceMax+step*0.5; v+=step){
    out.push(v);
    if (out.length > 12) break;
  }
  return out;
}

function miniDefaultFmt(v){
  if (!isFinite(v)) return "-";
  const av = Math.abs(v);
  if (av >= 100) return fmt(v, 0);
  if (av >= 10) return fmt(v, 1);
  if (av >= 1) return fmt(v, 2);
  return fmt(v, 3);
}

function ensureMiniTrend(canvasId, tooltipId, opts={}){
  const c = document.getElementById(canvasId);
  const t = document.getElementById(tooltipId);
  if (!c) return null;

  let st = miniTrendCharts.get(canvasId);

  // If the detail panel is re-rendered, the canvas nodes are replaced. We must rebind the cached chart state
  // to the new DOM elements, otherwise we keep drawing into a detached canvas and the new one stays blank.
  const canvasChanged = !!(st && st.canvas && st.canvas !== c);
  const canvasDetached = !!(st && st.canvas && !st.canvas.isConnected);

  if (!st){
    st = {
      canvas: c,
      tooltip: t,
      times: [],
      values: [],
      hover: {active:false, idx:null, x:0, y:0},
      opts: opts || {}
    };
    miniTrendCharts.set(canvasId, st);
  } else {
    if (canvasChanged || canvasDetached){
      // Disconnect any ResizeObserver bound to the old canvas
      if (st._ro && typeof st._ro.disconnect === "function"){
        try { st._ro.disconnect(); } catch (e){}
      }
      st._ro = null;

      // Point state at the newly created canvas element
      st.canvas = c;

      // Reset hover state so we do not carry stale pixel coordinates
      st.hover = {active:false, idx:null, x:0, y:0};
    }

    // Always refresh tooltip reference because the panel may recreate it too
    st.tooltip = t;
  }

  // Merge options
  st.opts = Object.assign({}, st.opts || {}, opts || {});

  // Bind interactions once per canvas element
  if (!c.__miniTrendBound){
    c.__miniTrendBound = true;

    c.addEventListener("mousemove", (ev) => {
      const r = c.getBoundingClientRect();
      st.hover.active = true;
      st.hover.x = (ev.clientX - r.left);
      st.hover.y = (ev.clientY - r.top);
      renderMiniTrendChart(st);
    });

    c.addEventListener("mouseleave", () => {
      st.hover.active = false;
      st.hover.idx = null;
      if (st.tooltip) st.tooltip.style.display = "none";
      renderMiniTrendChart(st);
    });
  }

  // Redraw on resize for the current canvas
  if (typeof ResizeObserver !== "undefined"){
    if (!st._ro){
      const ro = new ResizeObserver(() => renderMiniTrendChart(st));
      ro.observe(c);
      st._ro = ro;
    } else {
      // In case the observer exists but the canvas was swapped, observe again
      try { st._ro.observe(c); } catch (e){}
    }
  } else {
    // Fallback: window resize (only bind once per chart state)
    if (!st._winResizeBound){
      st._winResizeBound = true;
      window.addEventListener("resize", () => renderMiniTrendChart(st));
    }
  }

  return st;
}

function setMiniTrendSeries(canvasId, tooltipId, times, values, opts={}){
  const st = ensureMiniTrend(canvasId, tooltipId, opts);
  if (!st) return;
  st.times = Array.isArray(times) ? times.slice() : [];
  st.values = Array.isArray(values) ? values.slice() : [];
  // reset hover if out of range
  if (!st.values.length) {
    st.hover.active = false;
    st.hover.idx = null;
    if (st.tooltip) st.tooltip.style.display = "none";
  } else if (st.hover.idx != null && st.hover.idx >= st.values.length){
    st.hover.idx = null;
  }
  renderMiniTrendChart(st);
}

function renderMiniTrendChart(st){
  if (!st || !st.canvas) return;
  const c = st.canvas;
  const ctx = c.getContext("2d");
  const dpr = devicePixelRatio || 1;

  // Use layout rect sizing (more reliable when canvases are inside grids or newly revealed panels)
  const rect = c.getBoundingClientRect();
  const cssW = Math.max(0, Math.floor((rect && rect.width) ? rect.width : (c.clientWidth || 0)));
  const cssH = Math.max(0, Math.floor((rect && rect.height) ? rect.height : (c.clientHeight || 0)));

  // If the canvas is not yet laid out (0x0), defer drawing until it is visible/measurable.
  if (cssW < 10 || cssH < 10){
    if (!st._deferDraw){
      st._deferDraw = requestAnimationFrame(() => {
        st._deferDraw = null;
        renderMiniTrendChart(st);
      });
    }
    return;
  }

  const w = c.width = Math.max(1, Math.floor(cssW * dpr));
  const h = c.height = Math.max(1, Math.floor(cssH * dpr));
  ctx.clearRect(0,0,w,h);

  const times = st.times || [];
  const values = st.values || [];
  const finite = values.map(v => (v==null ? null : Number(v))).filter(v => v!=null && isFinite(v));
  const hasData = finite.length >= 2;

  const padL = Math.floor(38 * dpr);
  const padR = Math.floor(10 * dpr);
  const padT = Math.floor(10 * dpr);
  const padB = Math.floor(18 * dpr);

  const plotX = padL;
  const plotY = padT;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);

  // Background grid
  ctx.save();
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  for (let i=0;i<=3;i++){
    const y = plotY + (plotH * i/3);
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();
  }
  ctx.restore();

  if (!hasData){
    // No data message
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${12*dpr}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No data", plotX + plotW/2, plotY + plotH/2);
    ctx.restore();
    if (st.tooltip) st.tooltip.style.display = "none";
    return;
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = (max - min) || 1;

  const ticks = niceTicks(min, max, 4);
  const tmin = ticks.length ? ticks[0] : min;
  const tmax = ticks.length ? ticks[ticks.length-1] : max;
  const tspan = (tmax - tmin) || span;

  function yOf(v){
    const vv = (v - tmin) / tspan;
    return plotY + (1 - vv) * plotH;
  }
  function xOf(i,n){
    return plotX + (plotW * (n<=1 ? 0 : (i/(n-1))));
  }

  // y-axis labels
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${11*dpr}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const yfmt = st.opts && typeof st.opts.yFmt === "function" ? st.opts.yFmt : miniDefaultFmt;
  for (const tv of ticks){
    const y = yOf(tv);
    ctx.fillText(yfmt(tv), plotX - 6*dpr, y);
  }
  ctx.restore();

  // line path
  const n = values.length;
  ctx.save();
  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = (st.opts && st.opts.stroke) ? st.opts.stroke : "rgba(56,189,248,0.95)";
  ctx.beginPath();
  let moved=false;
  for (let i=0;i<n;i++){
    const v = values[i];
    if (v==null || !isFinite(v)) continue;
    const x = xOf(i,n);
    const y = yOf(v);
    if (!moved){ ctx.moveTo(x,y); moved=true; } else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.restore();

  // hover index
  if (st.hover && st.hover.active){
    const mx = (st.hover.x * dpr);
    const rel = (mx - plotX) / plotW;
    let idx = Math.round(rel * (n-1));
    if (!isFinite(idx)) idx = null;
    if (idx != null) idx = Math.max(0, Math.min(n-1, idx));
    st.hover.idx = idx;

    const hv = values[idx];
    if (hv != null && isFinite(hv)){
      const hx = xOf(idx,n);
      const hy = yOf(hv);

      // marker
      ctx.save();
      ctx.fillStyle = "rgba(56,189,248,1)";
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5*dpr, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // tooltip
      if (st.tooltip){
        const label = st.opts && st.opts.label ? st.opts.label : "";
        const unit = st.opts && st.opts.unit ? st.opts.unit : "";
        const valFmt = st.opts && typeof st.opts.valFmt === "function" ? st.opts.valFmt : miniDefaultFmt;
        const timeLabel = times[idx] != null ? String(times[idx]) : `#${idx+1}`;

        st.tooltip.innerHTML =
          `<div style="font-weight:700; margin-bottom:2px;">${escapeHtml(label || "Value")}</div>` +
          `<div><span class="muted">${escapeHtml(timeLabel)}</span></div>` +
          `<div style="margin-top:3px;"><span class="mono" style="font-weight:700;">${escapeHtml(valFmt(hv))}</span>${unit ? ` <span class="muted">${escapeHtml(unit)}</span>` : ""}</div>`;

        // position tooltip near cursor, keep inside canvas box
        const r = c.getBoundingClientRect();
        const tx = (st.hover.x + 12);
        const ty = (st.hover.y + 12);
        st.tooltip.style.left = `${Math.min(tx, r.width - 140)}px`;
        st.tooltip.style.top = `${Math.min(ty, r.height - 70)}px`;
        st.tooltip.style.display = "block";
      }
    } else {
      if (st.tooltip) st.tooltip.style.display = "none";
    }
  }
}


function dailyValueOnLocalDay(dailyTime, dailyVals, dayDate){
  if (!dailyTime || !dailyVals) return null;
  const key = ymdLocal(dayDate);
  for (let i=0;i<dailyTime.length;i++){
    const t = dailyTime[i];
    if (t === key) return dailyVals[i];
    if (t > key) break;
  }
  return null;
}

function meanHourlyOnLocalDay(hourlyTime, hourlyVals, dayDate){
  if (!hourlyTime || !hourlyVals) return null;
  const start = startOfLocalDay(dayDate);
  const end = addLocalDays(start, 1);
  const t0 = start.getTime(), t1 = end.getTime();

  let sum = 0, n = 0;
  for (let i=0;i<hourlyTime.length;i++){
    const dt = parseLocalDateTime(hourlyTime[i]);
    if (!dt) continue;
    const ms = dt.getTime();
    if (ms < t0) continue;
    if (ms >= t1) break;
    const v = hourlyVals[i];
    if (v == null || !isFinite(v)) continue;
    sum += v; n++;
  }
  return n ? (sum / n) : null;
}

function maxHourlyOnLocalDay(hourlyTime, hourlyVals, dayDate){
  if (!hourlyTime || !hourlyVals) return null;
  const start = startOfLocalDay(dayDate);
  const end = addLocalDays(start, 1);
  const t0 = start.getTime(), t1 = end.getTime();
  let best = null;
  for (let i=0;i<hourlyTime.length;i++){
    const dt = parseLocalDateTime(hourlyTime[i]);
    if (!dt) continue;
    const ms = dt.getTime();
    if (ms < t0) continue;
    if (ms >= t1) break;
    const v = Number(hourlyVals[i]);
    if (!isFinite(v)) continue;
    best = (best == null) ? v : Math.max(best, v);
  }
  return best;
}

function minHourlyOnLocalDay(hourlyTime, hourlyVals, dayDate){
  if (!hourlyTime || !hourlyVals) return null;
  const start = startOfLocalDay(dayDate);
  const end = addLocalDays(start, 1);
  const t0 = start.getTime(), t1 = end.getTime();
  let best = null;
  for (let i=0;i<hourlyTime.length;i++){
    const dt = parseLocalDateTime(hourlyTime[i]);
    if (!dt) continue;
    const ms = dt.getTime();
    if (ms < t0) continue;
    if (ms >= t1) break;
    const v = Number(hourlyVals[i]);
    if (!isFinite(v)) continue;
    best = (best == null) ? v : Math.min(best, v);
  }
  return best;
}

// Moisture Wicking Wind Rating (0-100)
// Heuristic: strong drying when moderate-high winds combine with low humidity and high VPD.
// Edge case: very low RH (<=30%) can elevate risk even if winds are light.
function moistureWickingWindRating(wind_ms, rh_pct, vpd_kpa){
  const wind = (wind_ms == null || !isFinite(wind_ms)) ? null : Number(wind_ms);
  const rh = (rh_pct == null || !isFinite(rh_pct)) ? null : Number(rh_pct);
  const vpd = (vpd_kpa == null || !isFinite(vpd_kpa)) ? null : Number(vpd_kpa);
  if (wind == null || rh == null || vpd == null) return null;

  const cfg = (typeof droughtConfig === "object" && droughtConfig && typeof droughtConfig.wick === "object" && droughtConfig.wick)
    ? droughtConfig.wick
    : {
        windLow: 3,
        windHigh: 10,
        rhHigh: 50,
        rhLow: 25,
        vpdLow: 0.8,
        vpdHigh: 2.2,
        lowRhThreshold: 30,
        lowWindBumpMax: 0.18
      };

  const windF = clamp01((wind - cfg.windLow) / (cfg.windHigh - cfg.windLow));
  const lowRhF = clamp01((cfg.rhHigh - rh) / (cfg.rhHigh - cfg.rhLow));
  const vpdF = clamp01((vpd - cfg.vpdLow) / (cfg.vpdHigh - cfg.vpdLow));

  let rating = 100 * (0.45 * windF + 0.30 * lowRhF + 0.25 * vpdF);

  // If humidity is extremely low, allow a small bump even when wind is light
  if (rh <= cfg.lowRhThreshold){
    const bumpF = clamp01((cfg.windLow - wind) / Math.max(0.1, cfg.windLow));
    rating += 100 * cfg.lowWindBumpMax * bumpF;
  }

  return clamp(rating, 0, 100);
}


function meanWindDirOnLocalDay(hourlyTime, windDirDeg, dayDate){
  if (!hourlyTime || !windDirDeg) return null;
  const start = startOfLocalDay(dayDate);
  const end = addLocalDays(start, 1);
  const t0 = start.getTime(), t1 = end.getTime();

  let sumSin = 0, sumCos = 0, n = 0;
  for (let i=0;i<hourlyTime.length;i++){
    const dt = parseLocalDateTime(hourlyTime[i]);
    if (!dt) continue;
    const ms = dt.getTime();
    if (ms < t0) continue;
    if (ms >= t1) break;

    const d = windDirDeg[i];
    if (d == null || !isFinite(d)) continue;
    const rad = (Number(d) * Math.PI) / 180;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
    n++;
  }

  if (!n) return null;
  const ang = Math.atan2(sumSin / n, sumCos / n);
  let deg = (ang * 180) / Math.PI;
  if (deg < 0) deg += 360;
  // Clamp to [0,360)
  if (deg >= 360) deg -= 360;
  return deg;
}

function computeLocationEnvMetricAt(wx, dayDate, metric){
  if (!wx) return null;

  const daily = wx.daily || {};
  const hourly = wx.hourly || {};

  if (metric === "rain_mm"){
    return dailyValueOnLocalDay(daily.time, daily.precipitation_sum, dayDate);
  }
  if (metric === "et0_mm"){
    return dailyValueOnLocalDay(daily.time, daily.et0_fao_evapotranspiration, dayDate);
  }
  if (metric === "temp_c"){
    return meanHourlyOnLocalDay(hourly.time, hourly.temperature_2m, dayDate);
  }
  if (metric === "rh_pct"){
    return meanHourlyOnLocalDay(hourly.time, hourly.relative_humidity_2m, dayDate);
  }
  if (metric === "vpd_kpa"){
    return meanHourlyOnLocalDay(hourly.time, hourly.vapour_pressure_deficit, dayDate);
  }
  if (metric === "soil_9_27"){
    return meanHourlyOnLocalDay(hourly.time, hourly.soil_moisture_9_27cm, dayDate);
  }
  if (metric === "soil_27_81"){
    return meanHourlyOnLocalDay(hourly.time, hourly.soil_moisture_27_81cm, dayDate);
  }
  if (metric === "soil_0_1"){
    return meanHourlyOnLocalDay(hourly.time, hourly.soil_moisture_0_1cm, dayDate);
  }
  if (metric === "soil_1_3"){
    return meanHourlyOnLocalDay(hourly.time, hourly.soil_moisture_1_3cm, dayDate);
  }
  if (metric === "soil_3_9"){
    return meanHourlyOnLocalDay(hourly.time, hourly.soil_moisture_3_9cm, dayDate);
  }
  if (metric === "wind_dir_deg"){
    return meanWindDirOnLocalDay(hourly.time, hourly.wind_direction_10m, dayDate);
  }

  if (metric === "msl_hpa"){
    return meanHourlyOnLocalDay(hourly.time, hourly.pressure_msl, dayDate);
  }
  if (metric === "wind_ms"){
    return meanHourlyOnLocalDay(hourly.time, hourly.wind_speed_10m, dayDate);
  }
  if (metric === "plume_idx"){
    const eod = new Date(addLocalDays(startOfLocalDay(dayDate), 1).getTime() - 60 * 1000);
    const sig = computeTropicalPlumeSignal(wx, eod);
    return sig && sig.score != null ? sig.score : null;
  }

  if (metric === "rain14_mm"){
    const sum14 = sumDailyLocalWindow(daily.time, daily.precipitation_sum, dayDate, 14);
    return (sum14 == null) ? null : (sum14 / 14);
  }
  if (metric === "et07_mm"){
    const sum7 = sumDailyLocalWindow(daily.time, daily.et0_fao_evapotranspiration, dayDate, 7);
    return (sum7 == null) ? null : (sum7 / 7);
  }

  return null;
}

function sumDailyLocalWindow(dailyTime, dailyVals, endDate, daysBack){
  if (!dailyTime || !dailyVals) return null;
  const endKey = ymdLocal(endDate);
  const startKey = ymdLocal(addLocalDays(startOfLocalDay(endDate), -(daysBack - 1)));

  let sum = 0, n = 0;
  for (let i=0;i<dailyTime.length;i++){
    const t = dailyTime[i];
    if (t < startKey) continue;
    if (t > endKey) break;
    const v = dailyVals[i];
    if (v == null || !isFinite(v)) continue;
    sum += v; n++;
  }
  // If data is sparse, still return sum of what's available (n>0)
  return n ? sum : null;
}

function computeDistrictEnvMeanAt(dayDate, metric){
  if (!dataCache?.wxList || !dataCache.wxList.length) return null;

  const wxList = dataCache.wxList;

  // District totals / extremes / derived indices
  if (metric === "rain_total_mm"){
    let sum = 0, n = 0;
    for (const wx of wxList){
      const daily = wx && wx.daily;
      const v = dailyValueOnLocalDay(daily?.time, daily?.precipitation_sum, dayDate);
      if (v == null || !isFinite(v)) continue;
      sum += v; n++;
    }
    return n ? sum : null;
  }

  if (metric === "temp_max_c"){
    let best = null;
    for (const wx of wxList){
      const v = maxHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.temperature_2m, dayDate);
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.max(best, v);
    }
    return best;
  }

  if (metric === "temp_min_c"){
    let best = null;
    for (const wx of wxList){
      const v = minHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.temperature_2m, dayDate);
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.min(best, v);
    }
    return best;
  }

  if (metric === "rh_max_pct"){
    let best = null;
    for (const wx of wxList){
      const v = maxHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.relative_humidity_2m, dayDate);
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.max(best, v);
    }
    return best;
  }

  if (metric === "rh_min_pct"){
    let best = null;
    for (const wx of wxList){
      const v = minHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.relative_humidity_2m, dayDate);
      if (v == null || !isFinite(v)) continue;
      best = (best == null) ? v : Math.min(best, v);
    }
    return best;
  }

  if (metric === "wick_rating"){
    let sum = 0, n = 0;
    for (const wx of wxList){
      const wind = meanHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.wind_speed_10m, dayDate);
      const rh = meanHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.relative_humidity_2m, dayDate);
      const vpd = meanHourlyOnLocalDay(wx?.hourly?.time, wx?.hourly?.vapour_pressure_deficit, dayDate);
      const r = moistureWickingWindRating(wind, rh, vpd);
      if (r == null || !isFinite(r)) continue;
      sum += r; n++;
    }
    return n ? (sum / n) : null;
  }

  // Default: district-wide mean of the selected metric
  let sum = 0, n = 0;
  for (const wx of wxList){
    const v = computeLocationEnvMetricAt(wx, dayDate, metric);
    if (v == null || !isFinite(v)) continue;
    sum += v; n++;
  }
  return n ? (sum / n) : null;
}

async function ensureDistrictEnvTrendComputed(force=false){
  const canvas = document.getElementById("districtEnvChart");
  const meta = document.getElementById("districtEnvMeta");
  if (!canvas || !meta) return;

  if (!dataCache?.wxList){ meta.textContent = "No data loaded"; return; }

  const metric = getSelectedEnvMetric();
  const def = ENV_METRICS[metric] || ENV_METRICS.rain_mm;

  const requestedStep = getSelectedEnvStep();
  const step = (requestedStep === "hour" && isEnvMetricHourlyCapable(metric)) ? "hour" : "day";

  const win = getDistrictTrendWindow();

  const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
  const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;

  let start = win.start;
  let end = win.end;
  if (rangeMin && start < rangeMin) start = rangeMin;
  if (rangeMax && end > rangeMax) end = rangeMax;

  if (start > end){
    meta.textContent = "No overlapping time window for district trend";
    return;
  }

  const key = windowKey({start, end}) + "|" + metric + "|" + step;

  if (!force && districtEnvTrend.key === key && districtEnvTrend.times?.length > 1) return;
  if (districtEnvTrend.building) return districtEnvTrend.building;

  meta.textContent = `Building district env trend (${step === "hour" ? "hourly" : "daily"}) from loaded data…`;

  const buildPromise = (async ()=>{
    const times = [];
    const values = [];

    const maxPoints = (step === "hour") ? 5000 : 500;

    if (step === "hour"){
      let d = startOfLocalHour(start);
      const endHour = startOfLocalHour(end);

      let safety = 0;
      while (d <= endHour && safety < maxPoints){
        const meanV = computeDistrictEnvMeanAtHour(d, metric);
        times.push(new Date(d));
        values.push(meanV);

        d = addLocalHours(d, 1);
        safety++;
        if (safety % 48 === 0) await new Promise(r=>setTimeout(r,0));
      }
    } else {
      let d = localMidday(start);
      const endDay = localMidday(end);

      let safety = 0;
      while (d <= endDay && safety < maxPoints){
        const meanV = computeDistrictEnvMeanAt(d, metric);
        times.push(new Date(d));
        values.push(meanV);

        d = addLocalDays(d, 1);
        safety++;
        if (safety % 5 === 0) await new Promise(r=>setTimeout(r,0));
      }
    }

    districtEnvTrend.key = key;
    districtEnvTrend.metric = metric;
    districtEnvTrend.step = step;
    districtEnvTrend.start = start;
    districtEnvTrend.end = end;
    districtEnvTrend.times = times;
    districtEnvTrend.values = values;

    const latest = [...values].reverse().find(v => v != null && isFinite(v));
    const unitTxt = def.unit ? ` ${def.unit}` : "";
    const ptsTxt = `${times.length} ${step === "hour" ? "hours" : "days"}`;
    const note = (requestedStep === "hour" && step !== "hour") ? " • hourly not available for this metric" : "";
    const rangeTxt = `${formatWhenNZ(start)} to ${formatWhenNZ(end)} • ${ptsTxt}${note}`;

    meta.textContent = (latest != null)
      ? `${rangeTxt} • ${def.label} latest ${latest.toFixed(def.digits)}${unitTxt}`
      : `${rangeTxt} • ${def.label}`;

    districtEnvTrend.defaultMeta = meta.textContent;
    renderDistrictEnvTrendChart();
  })().finally(()=>{ districtEnvTrend.building = null; });

  districtEnvTrend.building = buildPromise;
  return buildPromise;
}


// ---- District Weather & Environment Trend Helpers ----
// Missing in some builds: layout + axis + series drawers for the District Env Trend canvas.
function envTrendLayout(w, h, minY, maxY){
  const padL = 56, padR = 10, padT = 10, padB = 18;
  const x0 = padL, x1 = w - padR;
  const y0 = padT, y1 = h - padB;

  // Force a stable 0–360 domain for wind direction (circular mean output)
  const metric = (districtEnvTrend && districtEnvTrend.metric) ? districtEnvTrend.metric : (typeof getSelectedEnvMetric === "function" ? getSelectedEnvMetric() : "");
  if (metric === "wind_dir_deg"){
    minY = 0; maxY = 360;
  }

  if (minY == null || !isFinite(minY)) minY = 0;
  if (maxY == null || !isFinite(maxY)) maxY = (minY === 0 ? 1 : minY + 1);
  if (minY === maxY) maxY = minY + 1;

  const n = (districtEnvTrend && Array.isArray(districtEnvTrend.times) && districtEnvTrend.times.length)
    ? districtEnvTrend.times.length
    : (districtEnvTrend && Array.isArray(districtEnvTrend.values) ? districtEnvTrend.values.length : 0);

  const xAt = (i)=> x0 + (x1 - x0) * (n <= 1 ? 0 : i / (n - 1));
  const yAt = (v)=> y1 - ((clamp(v, minY, maxY) - minY) / (maxY - minY)) * (y1 - y0);

  return { padL, padR, padT, padB, x0, x1, y0, y1, minY, maxY, n, xAt, yAt };
}

function drawEnvSeries(ctx, layout, values, stroke){
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const n = (values || []).length;
  let started = false;

  ctx.beginPath();
  for (let i=0;i<n;i++){
    const v = values[i];
    if (v == null || !isFinite(v)){
      started = false;
      continue;
    }
    const x = layout.xAt(i);
    const y = layout.yAt(v);
    if (!started){
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawEnvAxes(ctx, layout, def){
  const ticks = 5;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  for (let i=0;i<=ticks;i++){
    const t = i / ticks;
    const y = layout.y0 + (layout.y1 - layout.y0) * t;

    // Grid
    ctx.beginPath();
    ctx.moveTo(layout.x0, y);
    ctx.lineTo(layout.x1, y);
    ctx.stroke();

    // Label
    const v = layout.maxY - (layout.maxY - layout.minY) * t;
    const label = v.toFixed(def && def.digits != null ? def.digits : 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, layout.x0 - 8, y);
  }

  // x-axis baseline
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(layout.x0, layout.y1);
  ctx.lineTo(layout.x1, layout.y1);
  ctx.stroke();

  ctx.restore();
}

function ensureDistrictEnvHoverHooks(){
  const canvas = document.getElementById("districtEnvChart");
  if (!canvas || canvas._hoverHooked) return;
  canvas._hoverHooked = true;

  const tip = document.getElementById("districtEnvTooltip");

  const onMove = (e)=>{
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const def = ENV_METRICS[districtEnvTrend.metric] || ENV_METRICS.rain_mm;
    const ext = computeNiceExtent(districtEnvTrend.values || []);
    const layout = envTrendLayout(r.width, r.height, ext.min, ext.max);

    if (x < layout.x0 || x > layout.x1 || y < layout.y0 || y > layout.y1){
      districtEnvHover.idx = null;
      if (tip) tip.style.display = "none";
      renderDistrictEnvTrendChart();
      return;
    }

    const t = (x - layout.x0) / (layout.x1 - layout.x0);
    const idx = clamp(Math.round(t * (layout.n - 1)), 0, layout.n - 1);

    districtEnvHover.idx = idx;
    districtEnvHover.x = x;
    districtEnvHover.y = y;
    districtEnvHover.active = true;

    renderDistrictEnvTrendChart();
  };

  const onLeave = ()=>{
    districtEnvHover.idx = null;
    districtEnvHover.active = false;

    const meta = document.getElementById("districtEnvMeta");
    if (meta && districtEnvTrend.defaultMeta) meta.textContent = districtEnvTrend.defaultMeta;

    if (tip) tip.style.display = "none";
    renderDistrictEnvTrendChart();
  };

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("touchmove", (e)=>{
    if (!e.touches || !e.touches.length) return;
    onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }, { passive: true });
  canvas.addEventListener("touchend", onLeave);
}

function renderDistrictEnvTrendChart(){
  const canvas = document.getElementById("districtEnvChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ensureDistrictEnvHoverHooks();
  const tip = document.getElementById("districtEnvTooltip");

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0,0,w,h);

  const metric = districtEnvTrend.metric || getSelectedEnvMetric();
  const def = ENV_METRICS[metric] || ENV_METRICS.rain_mm;

  const values = districtEnvTrend.values || [];
  const ext = computeNiceExtent(values);
  const layout = envTrendLayout(w, h, ext.min, ext.max);

  // Axes + grid
  drawEnvAxes(ctx, layout, def);

  // Line
  drawEnvSeries(ctx, layout, values, cssVar("--ok"));

  // Hover marker + tooltip
  if (districtEnvHover.active && districtEnvHover.idx != null && layout.n > 0){
    const i = districtEnvHover.idx;
    const x = layout.xAt(i);
    const v = values[i];

    if (v != null && isFinite(v)){
      const y = layout.yAt(v);

      // Vertical line
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, layout.y0);
      ctx.lineTo(x, layout.y1);
      ctx.stroke();

      // Dot
      ctx.fillStyle = cssVar("--ok");
      ctx.beginPath();
      ctx.arc(x, y, 3.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      const when = districtEnvTrend.times[i];
      const step = districtEnvTrend.step || getSelectedEnvStep() || "day";
      const dateTxt = when ? (step === "hour"
        ? when.toLocaleString("en-NZ", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
        : when.toLocaleDateString("en-NZ", { year:"numeric", month:"short", day:"2-digit" })
      ) : "";
      const valTxt = v.toFixed(def.digits);

      if (tip){
        tip.style.display = "block";
        tip.style.left = Math.min(w - 160, Math.max(10, x + 10)) + "px";
        tip.style.top = "10px";
        tip.innerHTML = `<div style="font-weight:700; margin-bottom:2px;">${def.label}</div>
          <div class="muted">${dateTxt}</div>
          <div style="margin-top:6px;"><span style="font-weight:700">${valTxt}</span> <span class="muted">${def.unit}</span></div>`;
      }

      const meta = document.getElementById("districtEnvMeta");
      if (meta){
        meta.textContent = `${def.label} on ${dateTxt}: ${valTxt} ${def.unit}`;
      }
    } else {
      if (tip) tip.style.display = "none";
    }
  }
}



    
/* ---- Location Weather and Environment Trend (Below Recent Trend) ---- */
const STORAGE_KEY_LOC_ENV_METRIC = "fndi_loc_env_metric_v1";
const STORAGE_KEY_LOC_ENV_STEP = "fndi_loc_env_step_v1";

function locEnvLabel(metric){
  const def = ENV_METRICS[metric] || ENV_METRICS.rain14_mm;
  let label = def.label || String(metric);

  // Adjust district-specific labels for location view
  label = label.replace("(District Max)", "(Location Max)");
  label = label.replace("(District Min)", "(Location Min)");
  label = label.replace("District Rain Total (Sum)", "Rain (Hourly)");
  return label;
}

function getSelectedLocEnvMetric(){
  const sel = document.getElementById("locEnvMetric");
  const saved = localStorage.getItem(STORAGE_KEY_LOC_ENV_METRIC);
  const fallback = saved || (document.getElementById("districtEnvMetric") ? document.getElementById("districtEnvMetric").value : "rain14_mm") || "rain14_mm";
  if (sel){
    if (!sel._populated){
      populateLocEnvMetricSelect(sel);
      sel._populated = true;
    }
    if (saved && sel.value !== saved) sel.value = saved;
    if (!sel.value) sel.value = fallback;
    return sel.value;
  }
  return fallback;
}

function getSelectedLocEnvStep(){
  const sel = document.getElementById("locEnvStep");
  const saved = localStorage.getItem(STORAGE_KEY_LOC_ENV_STEP);
  const fallback = saved || (document.getElementById("districtEnvStep") ? document.getElementById("districtEnvStep").value : "day") || "day";
  if (sel){
    if (saved && sel.value !== saved) sel.value = saved;
    if (!sel.value) sel.value = fallback;
    return sel.value;
  }
  return fallback;
}

function populateLocEnvMetricSelect(sel){
  if (!sel) return;
  sel.innerHTML = "";
  const keys = Object.keys(ENV_METRICS);
  for (const k of keys){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = locEnvLabel(k);
    sel.appendChild(opt);
  }
}

function isLocEnvMetricHourlyCapable(metric){
  // Hourly makes sense for these metrics at a single location
  return [
    "rain_total_mm", // hourly precipitation
    "temp_c",
    "rh_pct",
    "vpd_kpa",
    "soil_9_27","soil_27_81","soil_0_1","soil_1_3","soil_3_9",
    "wind_dir_deg","wind_ms","msl_hpa",
    "plume_idx",
    "wick_rating"
  ].includes(metric);
}

function computeLocEnvMetricAtDayEnhanced(wx, dayDate, metric){
  if (!wx) return null;
  const daily = wx.daily || {};
  const hourly = wx.hourly || {};

  if (metric === "rain_total_mm"){
    return dailyValueOnLocalDay(daily.time, daily.precipitation_sum, dayDate);
  }
  if (metric === "temp_max_c"){
    return maxHourlyOnLocalDay(hourly.time, hourly.temperature_2m, dayDate);
  }
  if (metric === "temp_min_c"){
    return minHourlyOnLocalDay(hourly.time, hourly.temperature_2m, dayDate);
  }
  if (metric === "rh_max_pct"){
    return maxHourlyOnLocalDay(hourly.time, hourly.relative_humidity_2m, dayDate);
  }
  if (metric === "rh_min_pct"){
    return minHourlyOnLocalDay(hourly.time, hourly.relative_humidity_2m, dayDate);
  }
  if (metric === "wick_rating"){
    const wind = meanHourlyOnLocalDay(hourly.time, hourly.wind_speed_10m, dayDate);
    const rh = meanHourlyOnLocalDay(hourly.time, hourly.relative_humidity_2m, dayDate);
    const vpd = meanHourlyOnLocalDay(hourly.time, hourly.vapour_pressure_deficit, dayDate);
    const r = moistureWickingWindRating(wind, rh, vpd);
    return (r && r.idx != null) ? r.idx : null;
  }

  // Default daily metrics
  return computeLocationEnvMetricAt(wx, dayDate, metric);
}

function computeLocEnvMetricAtHourEnhanced(wx, when, metric){
  if (!wx) return null;
  const hourly = wx.hourly || {};

  if (metric === "wick_rating"){
    const wind = valueAtOrBefore(hourly.time, hourly.wind_speed_10m, when);
    const rh = valueAtOrBefore(hourly.time, hourly.relative_humidity_2m, when);
    const vpd = valueAtOrBefore(hourly.time, hourly.vapour_pressure_deficit, when);
    const r = moistureWickingWindRating(wind, rh, vpd);
    return (r && r.idx != null) ? r.idx : null;
  }

  // For other metrics, use existing hourly helper
  return computeLocationEnvMetricAtHour(wx, when, metric);
}

function renderLocationEnvTrendChart(row){
  const canvas = document.getElementById("locEnvChart");
  const tip = document.getElementById("locEnvTooltip");
  const meta = document.getElementById("locEnvMeta");
  const selMetric = document.getElementById("locEnvMetric");
  const selStep = document.getElementById("locEnvStep");
  if (!canvas) return;

  const metric = getSelectedLocEnvMetric();
  let step = getSelectedLocEnvStep();

  // Enforce hourly capability for location view
  if (step === "hour" && !isLocEnvMetricHourlyCapable(metric)){
    step = "day";
    if (selStep) selStep.value = "day";
    localStorage.setItem(STORAGE_KEY_LOC_ENV_STEP, "day");
  }

  const def = ENV_METRICS[metric] || ENV_METRICS.rain14_mm;
  const label = locEnvLabel(metric);

  // Find wx for this location (by loc.id → index in locations / wxList)
  let wx = null;
  try{
    const locId = row && row.loc ? row.loc.id : null;
    let idx = -1;
    if (locId != null && Array.isArray(locations)){
      idx = locations.findIndex(l => l && l.id === locId);
      if (idx < 0 && row && row.loc){
        idx = locations.findIndex(l => l === row.loc);
      }
    }
    if (idx >= 0 && dataCache && Array.isArray(dataCache.wxList)){
      wx = dataCache.wxList[idx] || null;
    }
  } catch(e){
    wx = null;
  }

  const win = getDistrictTrendWindow(); // keep consistent with district env window
  const start = win && win.start ? new Date(win.start) : null;
  const end = win && win.end ? new Date(win.end) : null;

  if (!wx || !start || !end || isNaN(start.getTime()) || isNaN(end.getTime())){
    setMiniTrendSeries("locEnvChart", "locEnvTooltip", [], [], { label, unit: def.unit, yFmt: (v)=>Number(v).toFixed(def.digits), valFmt: (v)=>Number(v).toFixed(def.digits) });
    if (meta) meta.textContent = "No data loaded";
    if (tip) tip.style.display = "none";
    return;
  }

  const times = [];
  const values = [];

  if (step === "hour"){
    // hourly steps
    let t = new Date(start.getTime());
    t.setMinutes(0,0,0);
    const limit = 5000;
    let n = 0;
    while (t.getTime() <= end.getTime() && n < limit){
      times.push(formatDateTimeLocal(t));
      values.push(computeLocEnvMetricAtHourEnhanced(wx, t, metric));
      t = new Date(t.getTime() + 3600*1000);
      n++;
    }
  } else {
    // daily steps
    let d = startOfLocalDay(start);
    const endDay = startOfLocalDay(end);
    const limit = 2000;
    let n = 0;
    while (d.getTime() <= endDay.getTime() && n < limit){
      times.push(ymdLocal(d));
      values.push(computeLocEnvMetricAtDayEnhanced(wx, d, metric));
      d = addLocalDays(d, 1);
      n++;
    }
  }

  setMiniTrendSeries("locEnvChart", "locEnvTooltip", times, values, {
    label,
    unit: def.unit,
    yFmt: (v)=>Number(v).toFixed(def.digits),
    valFmt: (v)=>Number(v).toFixed(def.digits),
    stroke: "rgba(56,189,248,0.95)"
  });

  if (meta){
    const st = (step === "hour") ? "Hourly" : "Daily";
    meta.textContent = `${st} | ${ymdLocal(start)} → ${ymdLocal(end)}`;
  }

  localStorage.setItem(STORAGE_KEY_LOC_ENV_METRIC, metric);
  localStorage.setItem(STORAGE_KEY_LOC_ENV_STEP, step);
}

function initLocationEnvTrendControls(row){
  const m = document.getElementById("locEnvMetric");
  const s = document.getElementById("locEnvStep");
  if (!m || !s) return;

  if (!m._populated){
    populateLocEnvMetricSelect(m);
    m._populated = true;
  }

  // Defaults from storage or district controls for continuity
  const savedM = localStorage.getItem(STORAGE_KEY_LOC_ENV_METRIC);
  const savedS = localStorage.getItem(STORAGE_KEY_LOC_ENV_STEP);

  const distM = document.getElementById("districtEnvMetric") ? document.getElementById("districtEnvMetric").value : null;
  const distS = document.getElementById("districtEnvStep") ? document.getElementById("districtEnvStep").value : null;

  m.value = savedM || distM || "rain14_mm";
  s.value = savedS || distS || "day";

  const onChange = () => {
    // Persist immediately
    localStorage.setItem(STORAGE_KEY_LOC_ENV_METRIC, m.value);
    localStorage.setItem(STORAGE_KEY_LOC_ENV_STEP, s.value);
    renderLocationEnvTrendChart(row);
  };

  m.onchange = onChange;
  s.onchange = onChange;

  // Initial render
  renderLocationEnvTrendChart(row);
}

/* ---- End Location Weather and Environment Trend ---- */


// ---- District River and Groundwater Trend (Normalised Stress, Interactive Hover) ----
const STORAGE_KEY_DISTRICT_HYDRO_TREND_STEP = "fndi_district_hydro_trend_step_v1";

// This chart shows a district-wide daily mean "hydrology stress" index per day.
// Each gauge is normalised using its own min/max over the displayed window so values are comparable
// across different rivers and bores (0 = relatively high water for that gauge, 100 = relatively low).

const districtHydroTrend = {
  key: null,
  step: "hour",
  start: null,
  end: null,
  times: [],
  river: [],
  gw: [],
  nRiver: [],
  nGw: [],
  building: null,
  defaultMeta: ""
};


function getSelectedDistrictHydroTrendStep(){
  const sel = document.getElementById("districtHydroTrendStep");
  const saved = localStorage.getItem(STORAGE_KEY_DISTRICT_HYDRO_TREND_STEP);
  const fallback = saved || "day";

  if (sel){
    if (saved && sel.value !== saved) sel.value = saved;
    return sel.value || fallback;
  }
  return fallback;
}

const districtRiverHover = { idx: null, x: 0, y: 0, active: false };
const districtGWHover = { idx: null, x: 0, y: 0, active: false };

// Cache long-window series so we don't refetch on hover or re-render
const districtHydroHistoryCache = new Map();

function parseHilltopTimeToDate(t){
  if (!t) return null;
  if (t instanceof Date && !isNaN(t.getTime())) return t;
  const s = String(t).trim();
  // ISO or parseable formats
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // Common Hilltop JSON format: "YYYY-MM-DD HH:MM[:SS]"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m){
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6] || 0);
    d = new Date(y, mo, da, hh, mm, ss, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Try again with a "T"
  d = new Date(s.replace(" ", "T"));
  if (!isNaN(d.getTime())) return d;

  return null;
}

function dailyMeanFromSeries(series){
  // Aggregate a Hilltop time series into local calendar days (YYYY-MM-DD) and return a Map(dayKey -> mean)
  const tmp = new Map(); // dayKey -> {sum,n}
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return tmp;

  for (let i=0;i<series.times.length;i++){
    const d = parseHilltopTimeToDate(series.times[i]);
    const v = series.values[i];
    if (!d || v == null || !isFinite(v)) continue;

    // Always bucket by local day for daily mode
    const key = ymdLocal(d);
    if (!key) continue;

    const cur = tmp.get(key) || { sum: 0, n: 0 };
    cur.sum += Number(v);
    cur.n += 1;
    tmp.set(key, cur);
  }

  const meanMap = new Map(); // dayKey -> mean
  for (const [k, obj] of tmp.entries()){
    meanMap.set(k, obj.n ? (obj.sum / obj.n) : null);
  }
  return meanMap;
}

function hourlyMeanFromSeries(series){
  const tmp = new Map(); // hourKey -> {sum,n}
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return tmp;

  for (let i=0;i<series.times.length;i++){
    const d = parseHilltopTimeToDate(series.times[i]);
    const v = series.values[i];
    if (!d || v == null || !isFinite(v)) continue;

    const key = ymdhLocal(d);
    if (!key) continue;

    const cur = tmp.get(key) || { sum: 0, n: 0 };
    cur.sum += Number(v);
    cur.n += 1;
    tmp.set(key, cur);
  }

  const meanMap = new Map();
  for (const [k, obj] of tmp.entries()){
    meanMap.set(k, obj.n ? (obj.sum / obj.n) : null);
  }
  return meanMap;
}

function normaliseStressFromDailyMap(meanMap){
  let min = Infinity, max = -Infinity;
  for (const v of meanMap.values()){
    if (v == null || !isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max) || max === min){
    return { min: null, max: null, stress: new Map() };
  }

  const stress = new Map(); // dayKey -> 0..100
  for (const [k, v] of meanMap.entries()){
    if (v == null || !isFinite(v)){
      stress.set(k, null);
      continue;
    }
    const t = (v - min) / (max - min);
    const s = clamp((1 - t) * 100, 0, 100);
    stress.set(k, s);
  }
  return { min, max, stress };
}

function hydroLayout(w, h, n){
  const padL = 42, padR = 10, padT = 10, padB = 22;
  const x0 = padL, x1 = w - padR;
  const y0 = padT, y1 = h - padB;

  const xAt = (i)=>{
    if (n <= 1) return x0;
    return x0 + (x1 - x0) * (i / (n - 1));
  };

  const yAt = (v)=>{
    const t = clamp((v - 0) / (100 - 0), 0, 1);
    return y1 - t * (y1 - y0);
  };

  return { padL, padR, padT, padB, x0, x1, y0, y1, xAt, yAt };
}

function drawHydroAxes(ctx, layout){
  const ticks = 5;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  for (let i=0;i<=ticks;i++){
    const t = i / ticks;
    const v = 0 + t * (100 - 0);
    const y = layout.yAt(v);

    ctx.beginPath();
    ctx.moveTo(layout.x0, y);
    ctx.lineTo(layout.x1, y);
    ctx.stroke();

    const txt = String(Math.round(v));
    ctx.fillText(txt, 8, y + 4);
  }
  ctx.restore();
}

function drawHydroLine(ctx, layout, values){
  const n = values ? values.length : 0;
  if (!n) return;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = cssVar("--ok");
  ctx.beginPath();

  let started = false;
  for (let i=0;i<n;i++){
    const v = values[i];
    if (v == null || !isFinite(v)){
      started = false;
      continue;
    }
    const x = layout.xAt(i);
    const y = layout.yAt(v);
    if (!started){
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

async function buildDistrictHydroStressSeries(kind, start, end, step="day"){
  const list = (kind === "river") ? (dataCache.riverForLoc || []) : (dataCache.gwForLoc || []);
  const sites = [];

  for (const g of list){
    if (!g || !g.site) continue;
    // Enforce the same 10 km rule for safety
    if (isFinite(g.distanceKm) && g.distanceKm > 10) continue;
    sites.push(g.site);
  }

  // Unique site+measurement pairs
  const unique = new Map();
  for (const s of sites){
    const meas = (kind === "river") ? pickRiverHistoryMeasurement(s) : pickGroundwaterHistoryMeasurement(s);
    const siteName = s.name || s.title || "";
    if (!siteName) continue;
    const key = `${siteName}||${meas.name}`;
    if (!unique.has(key)) unique.set(key, { siteName, measName: meas.name });
  }

  const uniquePairs = [...unique.values()];
  const startStamp = start.toISOString().slice(0,16);
  const endStamp = end.toISOString().slice(0,16);
// Fetch and normalise per site
  const stressMaps = [];
  for (const p of uniquePairs){
    const cacheKey = `DH|${kind}|${p.siteName}||${p.measName}||${startStamp}||${endStamp}`;
    let series = districtHydroHistoryCache.get(cacheKey);

    if (!series){
      try{
        const raw = await ensureHilltopRangeCachedSeries_(p.siteName, p.measName, start, end);
        series = clipHilltopSeriesToRange_(raw, start, end);
        districtHydroHistoryCache.set(cacheKey, series);
      } catch (e){
        continue;
      }
    }

    if (!series || !series.values || series.values.length < 2) continue;

    const meanMap = (step === "hour") ? hourlyMeanFromSeries(series) : dailyMeanFromSeries(series);
    const norm = normaliseStressFromDailyMap(meanMap);
    if (!norm || !norm.stress || norm.stress.size === 0) continue;

    stressMaps.push(norm.stress);

    // Be nice to the UI thread
    if (stressMaps.length % 2 === 0) await new Promise(r=>setTimeout(r,0));
  }

  return { stressMaps, nSites: stressMaps.length };
}

function computeDistrictHydroDailyMean(times, stressMaps, step="day"){
  const values = [];
  const nUsed = [];
  for (const d of times){
    const key = (step === "hour") ? ymdhLocal(d) : ymdLocal(d);
    let sum = 0, n = 0;
    for (const m of stressMaps){
      const v = m.get(key);
      if (v == null || !isFinite(v)) continue;
      sum += v; n++;
    }
    values.push(n ? (sum / n) : null);
    nUsed.push(n);
  }
  return { values, nUsed };
}

async function ensureDistrictHydroTrendComputed(force=false){
  const riverCanvas = document.getElementById("districtRiverChart");
  const gwCanvas = document.getElementById("districtGWChart");
  const meta = document.getElementById("districtHydroMeta");
  if (!riverCanvas || !gwCanvas || !meta) return;

  if (!dataCache?.wxList){ meta.textContent = "No data loaded"; return; }

  const win = getDistrictTrendWindow();
  const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
  const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;

  let start = win.start;
  let end = win.end;
  if (rangeMin && start < rangeMin) start = rangeMin;
  if (rangeMax && end > rangeMax) end = rangeMax;

  if (start > end){
    meta.textContent = "No overlapping time window for hydrology";
    districtHydroTrend.key = null;
    districtHydroTrend.times = [];
    districtHydroTrend.river = [];
    districtHydroTrend.gw = [];
    renderDistrictHydroTrendCharts();
    return;
  }

  const requestedStep = getSelectedDistrictHydroTrendStep();
  let step = requestedStep === "hour" ? "hour" : "day";

  // Prevent accidental massive hour series
  const approxHours = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000*60*60)));
  if (step === "hour" && approxHours > 5000){
    step = "day";
  }

  const key = `hydro|${timeMode}|${start.toISOString().slice(0,16)}|${end.toISOString().slice(0,16)}|${(dataCache.loadedAt||"")}|${step}`;

  if (!force && districtHydroTrend.key === key){
    renderDistrictHydroTrendCharts();
    if (districtHydroTrend.defaultMeta) meta.textContent = districtHydroTrend.defaultMeta;
    return;
  }

  if (districtHydroTrend.building) return districtHydroTrend.building;

  meta.textContent = `Building district hydrology trends (Hilltop, ${step === "hour" ? "hourly" : "daily"})...`;

  const buildPromise = (async ()=>{
    // Build timeline (inclusive)
    const times = [];
    const maxPoints = (step === "hour") ? 5000 : 500;

    if (step === "hour"){
      let d = startOfLocalHour(start);
      const endHour = startOfLocalHour(end);
      let safety = 0;
      while (d <= endHour && safety < maxPoints){
        times.push(new Date(d));
        d = addLocalHours(d, 1);
        safety++;
        if (safety % 120 === 0) await new Promise(r=>setTimeout(r,0));
      }
    } else {
      let d = localMidday(start);
      const endDay = localMidday(end);
      let safety = 0;
      while (d <= endDay && safety < maxPoints){
        times.push(new Date(d));
        d = addLocalDays(d, 1);
        safety++;
        if (safety % 10 === 0) await new Promise(r=>setTimeout(r,0));
      }
    }

    const [riverRes, gwRes] = await Promise.all([
      buildDistrictHydroStressSeries("river", start, end, step),
      buildDistrictHydroStressSeries("gw", start, end, step)
    ]);

    const riverDaily = computeDistrictHydroDailyMean(times, riverRes.stressMaps, step);
    const gwDaily = computeDistrictHydroDailyMean(times, gwRes.stressMaps, step);

    districtHydroTrend.key = key;
    districtHydroTrend.step = step;
    districtHydroTrend.start = start;
    districtHydroTrend.end = end;
    districtHydroTrend.times = times;
    districtHydroTrend.river = riverDaily.values;
    districtHydroTrend.gw = gwDaily.values;
    districtHydroTrend.nRiver = riverDaily.nUsed;
    districtHydroTrend.nGw = gwDaily.nUsed;

    const latestRiver = [...riverDaily.values].reverse().find(v => v != null && isFinite(v));
    const latestGw = [...gwDaily.values].reverse().find(v => v != null && isFinite(v));

    const ptsTxt = `${times.length} ${step === "hour" ? "hours" : "days"}`;
    const note = (requestedStep === "hour" && step !== "hour") ? " • window too large for hourly" : "";
    const rangeTxt = `${formatWhenNZ(start)} to ${formatWhenNZ(end)} • ${ptsTxt}${note}`;
    const rTxt = (latestRiver != null) ? `River ${latestRiver.toFixed(1)} (n=${riverRes.nSites})` : `River n=${riverRes.nSites}`;
    const gTxt = (latestGw != null) ? `Groundwater ${latestGw.toFixed(1)} (n=${gwRes.nSites})` : `Groundwater n=${gwRes.nSites}`;

    meta.textContent = `${rangeTxt} • ${rTxt} • ${gTxt}`;
    districtHydroTrend.defaultMeta = meta.textContent;

    renderDistrictHydroTrendCharts();
  })().finally(()=>{ districtHydroTrend.building = null; });

  districtHydroTrend.building = buildPromise;
  return buildPromise;
}

function ensureDistrictHydroHoverHooks(){
  const riverCanvas = document.getElementById("districtRiverChart");
  const gwCanvas = document.getElementById("districtGWChart");

  if (riverCanvas && !riverCanvas._hydroHoverBound){
    riverCanvas._hydroHoverBound = true;

    const onMove = (e)=>{
      const rect = riverCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      districtRiverHover.x = x;
      districtRiverHover.y = y;
      districtRiverHover.active = true;
      renderDistrictHydroTrendCharts();
    };

    const onLeave = ()=>{
      districtRiverHover.active = false;
      districtRiverHover.idx = null;
      const tip = document.getElementById("districtRiverTooltip");
      if (tip) tip.style.display = "none";
      const meta = document.getElementById("districtHydroMeta");
      if (meta && districtHydroTrend.defaultMeta) meta.textContent = districtHydroTrend.defaultMeta;
      renderDistrictHydroTrendCharts();
    };

    riverCanvas.addEventListener("mousemove", onMove);
    riverCanvas.addEventListener("mouseleave", onLeave);
    riverCanvas.addEventListener("touchmove", (e)=>{
      if (!e.touches || !e.touches.length) return;
      onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }, { passive:true });
    riverCanvas.addEventListener("touchend", onLeave);
  }

  if (gwCanvas && !gwCanvas._hydroHoverBound){
    gwCanvas._hydroHoverBound = true;

    const onMove = (e)=>{
      const rect = gwCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      districtGWHover.x = x;
      districtGWHover.y = y;
      districtGWHover.active = true;
      renderDistrictHydroTrendCharts();
    };

    const onLeave = ()=>{
      districtGWHover.active = false;
      districtGWHover.idx = null;
      const tip = document.getElementById("districtGWTooltip");
      if (tip) tip.style.display = "none";
      const meta = document.getElementById("districtHydroMeta");
      if (meta && districtHydroTrend.defaultMeta) meta.textContent = districtHydroTrend.defaultMeta;
      renderDistrictHydroTrendCharts();
    };

    gwCanvas.addEventListener("mousemove", onMove);
    gwCanvas.addEventListener("mouseleave", onLeave);
    gwCanvas.addEventListener("touchmove", (e)=>{
      if (!e.touches || !e.touches.length) return;
      onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }, { passive:true });
    gwCanvas.addEventListener("touchend", onLeave);
  }
}

function renderOneHydroChart(canvasId, tooltipId, values, nUsedArr, hoverState, title){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ensureDistrictHydroHoverHooks();

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0,0,w,h);

  // Background
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  const n = values ? values.length : 0;
  const layout = hydroLayout(w, h, n);

  drawHydroAxes(ctx, layout);
  drawHydroLine(ctx, layout, values);

  // Hover marker + tooltip
  const tip = document.getElementById(tooltipId);
  if (hoverState.active && n > 0){
    const x = clamp(hoverState.x, layout.x0, layout.x1);
    const frac = (layout.x1 === layout.x0) ? 0 : ((x - layout.x0) / (layout.x1 - layout.x0));
    const i = clamp(Math.round(frac * (n - 1)), 0, n - 1);
    hoverState.idx = i;

    const v = values[i];
    const xP = layout.xAt(i);

    // Vertical guide
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xP, layout.y0);
    ctx.lineTo(xP, layout.y1);
    ctx.stroke();
    ctx.restore();

    if (v != null && isFinite(v)){
      const yP = layout.yAt(v);

      ctx.save();
      ctx.fillStyle = cssVar("--ok");
      ctx.beginPath();
      ctx.arc(xP, yP, 3.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      const when = districtHydroTrend.times[i];
      const step = districtHydroTrend.step || getSelectedDistrictHydroTrendStep() || "day";
      const dateTxt = when ? (step === "hour"
        ? when.toLocaleString("en-NZ", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
        : when.toLocaleDateString("en-NZ", { year:"numeric", month:"short", day:"2-digit" })
      ) : "";
      const valTxt = v.toFixed(1);
      const nTxt = (nUsedArr && nUsedArr[i] != null) ? `n=${nUsedArr[i]}` : "";

      if (tip){
        tip.style.display = "block";
        // Keep within chart
        const desiredLeft = xP + 10;
        const maxLeft = w - 180;
        tip.style.left = clamp(desiredLeft, 10, maxLeft) + "px";
        tip.style.top = "10px";
        tip.innerHTML = `<div style="font-weight:700; margin-bottom:2px;">${title}</div>` +
          `<div class="tiny muted">${dateTxt}</div>` +
          `<div style="margin-top:4px;"><span style="font-weight:700;">${valTxt}</span> / 100 <span class="tiny muted">${nTxt}</span></div>` +
          `<div class="tiny muted" style="margin-top:4px;">0 = high water for that gauge, 100 = low</div>`;
      }

      // Also update meta line for quick glance
      const meta = document.getElementById("districtHydroMeta");
      if (meta){
        const otherLatestRiver = [...(districtHydroTrend.river||[])].reverse().find(x=>x!=null && isFinite(x));
        const otherLatestGw = [...(districtHydroTrend.gw||[])].reverse().find(x=>x!=null && isFinite(x));
        const base = districtHydroTrend.defaultMeta || "";
        // Replace meta with hover context
        meta.textContent = `${dateTxt} • ${title}: ${valTxt} (${nTxt || "n=0"}) • River latest ${otherLatestRiver!=null?otherLatestRiver.toFixed(1):"–"} • Groundwater latest ${otherLatestGw!=null?otherLatestGw.toFixed(1):"–"}`;
      }
    } else {
      if (tip) tip.style.display = "none";
    }
  } else {
    if (tip) tip.style.display = "none";
  }
}

function renderDistrictHydroTrendCharts(){
  renderOneHydroChart("districtRiverChart", "districtRiverTooltip", districtHydroTrend.river, districtHydroTrend.nRiver, districtRiverHover, "River Stress");
  renderOneHydroChart("districtGWChart", "districtGWTooltip", districtHydroTrend.gw, districtHydroTrend.nGw, districtGWHover, "Groundwater Stress");
}


// District Hydrology Readings (Rivers and Groundwater) -------------------------

const STORAGE_KEY_HYDRO_READ_KIND = "fnHydroReadKind";
const STORAGE_KEY_HYDRO_READ_VIEW = "fnHydroReadView";
const STORAGE_KEY_HYDRO_READ_METRIC_RIVER = "fnHydroReadMetricRiver";
const STORAGE_KEY_HYDRO_READ_METRIC_GW = "fnHydroReadMetricGw";
const STORAGE_KEY_HYDRO_READ_SITES_RIVER = "fnHydroReadSitesRiver";
const STORAGE_KEY_HYDRO_READ_SITES_GW = "fnHydroReadSitesGw";
const STORAGE_KEY_HYDRO_READ_SCOPE = "fnHydroReadScope";
const STORAGE_KEY_HYDRO_READ_STEP = "fnHydroReadStep";
const STORAGE_KEY_HYDRO_READ_LISTMODE = "fnHydroReadListMode";
const STORAGE_KEY_HYDRO_READ_SITES_RIVER_ALL = "fnHydroReadSitesRiverAll";
const STORAGE_KEY_HYDRO_READ_SITES_GW_ALL = "fnHydroReadSitesGwAll";


const districtHydroReadings = {
  key: null,
  kind: "river",
  metric: "flow",
  view: "combined",
  unit: "",
  aggType: "sum",
  times: [],
  agg: [],
  aggN: [],
  sites: [],
  building: null,
  defaultMeta: "",
  step: "hour"
};

const districtHydroReadingsCache = new Map();


const districtHydroReadHover = { idx: -1 };

function hydroReadMetricOptions(kind){
  if (kind === "gw"){
    return [
      { id: "level", label: "Level" }
    ];
  }
  return [
    { id: "flow", label: "Throughput (Flow)" },
    { id: "level", label: "Level (Stage)" }
  ];
}

function getSelectedHydroReadKind(){
  const el = document.getElementById("districtHydroKind");
  return el ? (el.value || "river") : "river";
}
function getSelectedHydroReadView(){
  const el = document.getElementById("districtHydroView");
  return el ? (el.value || "combined") : "combined";
}
function getSelectedHydroReadScope(){
  const el = document.getElementById("districtHydroScope");
  return el ? (el.value || "near") : "near";
}

function getSelectedHydroReadStep(){
  const el = document.getElementById("districtHydroStep");
  return el ? (el.value || "day") : "day";
}

function hydroReadSitesStorageKey(kind, scope){
  if (scope === "all") return (kind === "gw") ? STORAGE_KEY_HYDRO_READ_SITES_GW_ALL : STORAGE_KEY_HYDRO_READ_SITES_RIVER_ALL;
  return (kind === "gw") ? STORAGE_KEY_HYDRO_READ_SITES_GW : STORAGE_KEY_HYDRO_READ_SITES_RIVER;
}

function getSelectedHydroReadMetric(){
  const el = document.getElementById("districtHydroMetric");
  return el ? (el.value || "flow") : "flow";
}
function getSelectedHydroReadSiteIds(){
  const el = document.getElementById("districtHydroSitePicker");
  if (!el) return [];
  return Array.from(el.selectedOptions || []).map(o => o.value).filter(Boolean);
}

function setSelectValueSafe(selectEl, value){
  if (!selectEl) return;
  const opt = Array.from(selectEl.options || []).find(o => o.value === value);
  if (opt) selectEl.value = value;
}

function setMultiSelectValues(selectEl, values){
  if (!selectEl) return;
  const set = new Set(values || []);
  for (const opt of Array.from(selectEl.options || [])){
    opt.selected = set.has(opt.value);
  }
}

function collectDistrictHydroSites(kind, metric, scope){
  const out = [];
  const seen = new Set();

  const mode = (scope || getSelectedHydroReadScope() || "near");

  // Near mode uses nearest-per-location (filtered by distance)
  const withinKm = 10;

  if (mode === "all"){
    const rawSites = (kind === "gw") ? (dataCache?.gwSites || []) : (dataCache?.riverSites || []);
    for (const raw of rawSites){
      if (!raw) continue;

      const s = (kind === "gw") ? normaliseNrcGroundwaterSite(raw) : normaliseNrcRiverSite(raw);
      if (!s) continue;

      // Choose measurement and units
      let measName = "";
      let unitRaw = "";
      let label = "";

      if (kind === "gw"){
        const m = pickGroundwaterHistoryMeasurement(s);
        measName = (m.name || "").trim();
        unitRaw = m.units || s.levelUnits || "";
        label = "Level";
        if (!measName) continue;
      } else {
        if (metric === "flow"){
          measName = (s.flowMeasName || "").trim();
          unitRaw = s.flowUnits || "";
          label = "Flow";
          if (!measName) continue; // Only include flow-capable sites in Flow mode
        } else {
          measName = (s.levelMeasName || "Stage").trim();
          unitRaw = s.levelUnits || "";
          label = "Level";
        }
      }

      // Prefer raw Name for Hilltop queries where possible
      const siteName = (raw.Name || s.name || s.title || s.siteName || "").trim();
      const title = (s.title || raw.DisplayName || raw.Name || siteName || "").trim();
      if (!siteName || !title) continue;

      const id = `${siteName}||${measName}||${kind}||${metric}`;
      if (seen.has(id)) continue;
      seen.add(id);

      out.push({
        id,
        siteName,
        title,
        distanceKm: null,
        measName,
        unitRaw,
        label
      });
    }

    // Sort alphabetically
    out.sort((a,b)=> a.title.localeCompare(b.title));
    return out;
  }

  const src = (kind === "gw") ? (dataCache?.gwForLoc || []) : (dataCache?.riverForLoc || []);
  for (const ref of src){
    if (!ref || !ref.site) continue;
    if (ref.distanceKm != null && isFinite(ref.distanceKm) && ref.distanceKm > withinKm) continue;

    const s = ref.site;
    const siteName = (s.title || s.name || s.siteName || "").trim();
    if (!siteName) continue;

    let measName = "";
    let unitRaw = "";
    let label = "";

    if (kind === "gw"){
      const m = pickGroundwaterHistoryMeasurement(s);
      measName = m.name;
      unitRaw = m.units || s.levelUnits || "";
      label = "Level";
    } else {
      if (metric === "flow"){
        measName = (s.flowMeasName || "Flow").trim();
        unitRaw = s.flowUnits || "";
        label = "Flow";
      } else {
        measName = (s.levelMeasName || "Stage").trim();
        unitRaw = s.levelUnits || "";
        label = "Level";
      }
    }

    const id = `${siteName}||${measName}||${kind}||${metric}`;
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      siteName,
      title: siteName,
      distanceKm: ref.distanceKm,
      measName,
      unitRaw,
      label
    });
  }

  // Sort by distance then name
  out.sort((a,b)=>{
    const da = (a.distanceKm == null || !isFinite(a.distanceKm)) ? 1e9 : a.distanceKm;
    const db = (b.distanceKm == null || !isFinite(b.distanceKm)) ? 1e9 : b.distanceKm;
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title);
  });

  return out;
}

function normaliseHydroUnit(kind, metric, unitRaw){
  const u = String(unitRaw || "").trim();
  const lo = u.toLowerCase();

  // Rivers flow: convert everything to m3/s for aggregation
  if (kind === "river" && metric === "flow"){
    if (lo.includes("l/s") || lo.includes("ls")){
      return { unit: "m³/s", conv: (v)=> (v == null ? null : (v / 1000)) };
    }
    // Assume already m3/s or close
    return { unit: "m³/s", conv: (v)=> v };
  }

  // River stage: convert to meters
  if (kind === "river" && metric === "level"){
    if (lo === "mm" || lo.includes("mm")){
      return { unit: "m", conv: (v)=> (v == null ? null : (v / 1000)) };
    }
    if (lo === "cm" || lo.includes("cm")){
      return { unit: "m", conv: (v)=> (v == null ? null : (v / 100)) };
    }
    return { unit: "m", conv: (v)=> v };
  }

  // Groundwater level: assume meters
  if (kind === "gw"){
    if (lo === "mm" || lo.includes("mm")){
      return { unit: "m", conv: (v)=> (v == null ? null : (v / 1000)) };
    }
    if (lo === "cm" || lo.includes("cm")){
      return { unit: "m", conv: (v)=> (v == null ? null : (v / 100)) };
    }
    return { unit: "m", conv: (v)=> v };
  }

  return { unit: u, conv: (v)=> v };
}


function computeNiceExtent(values, clampMin0=false){
  return computeNiceExtentGeneric(Array.isArray(values) ? values : [], !!clampMin0);
}


function computeNiceExtentGeneric(values, clampMin0=false){
  const finite = values.filter(v => v != null && isFinite(v));
  if (!finite.length) return { min: 0, max: 1 };
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max){
    const pad = (min === 0) ? 1 : Math.abs(min) * 0.15;
    min -= pad; max += pad;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad; max += pad;
  }
  if (clampMin0) min = Math.max(0, min);
  return { min, max };
}

function computeNiceExtentMulti(seriesList, clampMin0=false){
  const all = [];
  for (const s of seriesList || []){
    if (!s || !Array.isArray(s)) continue;
    for (const v of s){ all.push(v); }
  }
  return computeNiceExtentGeneric(all, clampMin0);
}

function hydroReadLayout(w, h, n, minY, maxY){
  const padL = 56, padR = 10, padT = 10, padB = 18;
  const x0 = padL, x1 = w - padR;
  const y0 = padT, y1 = h - padB;
  const xAt = (i)=> x0 + (x1 - x0) * (n <= 1 ? 0 : i / (n - 1));
  const yAt = (v)=> y1 - ((clamp(v, minY, maxY) - minY) / (maxY - minY)) * (y1 - y0);
  return { padL, padR, padT, padB, x0, x1, y0, y1, minY, maxY, n, xAt, yAt };
}

function drawHydroReadAxes(ctx, layout, digits=2){
  const ticks = 5;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  for (let i=0;i<=ticks;i++){
    const t = i / ticks;
    const y = layout.y0 + (layout.y1 - layout.y0) * t;

    ctx.beginPath();
    ctx.moveTo(layout.x0, y);
    ctx.lineTo(layout.x1, y);
    ctx.stroke();

    const v = layout.maxY - (layout.maxY - layout.minY) * t;
    const label = isFinite(v) ? v.toFixed(digits) : "-";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, layout.x0 - 8, y);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(layout.x0, layout.y1);
  ctx.lineTo(layout.x1, layout.y1);
  ctx.stroke();

  ctx.restore();
}

function drawHydroReadSeries(ctx, layout, values, stroke, width=2){
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const n = values.length;
  let started = false;
  ctx.beginPath();
  for (let i=0;i<n;i++){
    const v = values[i];
    if (v == null || !isFinite(v)){
      started = false;
      continue;
    }
    const x = layout.xAt(i);
    const y = layout.yAt(v);
    if (!started){
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function buildHydroReadLegend(items){
  const legend = document.getElementById("districtHydroReadingsLegend");
  if (!legend) return;
  if (!items || !items.length){
    legend.style.display = "none";
    legend.innerHTML = "";
    return;
  }
  legend.style.display = "block";
  legend.innerHTML = items.map(it => {
    const safeName = escapeHtml(it.label || it.title || "");
    return `<span class="tag"><span class="dot" style="background:${it.color}"></span>${safeName}</span>`;
  }).join(" ");
}

function populateHydroReadMetricSelector(kind){
  const metricSel = document.getElementById("districtHydroMetric");
  if (!metricSel) return;

  const opts = hydroReadMetricOptions(kind);
  const existing = metricSel.value;

  metricSel.innerHTML = opts.map(o => `<option value="${o.id}">${escapeHtml(o.label)}</option>`).join("");

  // Restore last used metric per kind
  let saved = null;
  if (kind === "gw") saved = localStorage.getItem(STORAGE_KEY_HYDRO_READ_METRIC_GW);
  else saved = localStorage.getItem(STORAGE_KEY_HYDRO_READ_METRIC_RIVER);

  const target = saved || existing || opts[0].id;
  setSelectValueSafe(metricSel, target);
}

function populateHydroReadSitePicker(kind, metric, scope){
  const picker = document.getElementById("districtHydroSitePicker");
  if (!picker) return;

  const mode = (scope || getSelectedHydroReadScope() || "near");
  const sites = collectDistrictHydroSites(kind, metric, mode);

  picker.innerHTML = sites.map(s => {
    const dist = (s.distanceKm != null && isFinite(s.distanceKm)) ? ` (${fmt(s.distanceKm, 1)} km)` : "";
    const txt = `${s.title}${dist}`;
    return `<option value="${escapeHtml(s.id)}">${escapeHtml(txt)}</option>`;
  }).join("");

  const storageKey = hydroReadSitesStorageKey(kind, mode);
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(storageKey) || "null"); }catch(e){ saved = null; }

  // Default selection
  const view = getSelectedHydroReadView();
  let defaults = sites.map(s => s.id);

  if (mode === "all"){
    // Avoid selecting everything by default since this can be heavy
    const lim = (view === "combined") ? 12 : 6;
    defaults = sites.slice(0, lim).map(s => s.id);
  } else {
    // Near mode matches previous behavior
    if (view === "individual") defaults = sites.slice(0, 6).map(s => s.id);
  }

  const sel = Array.isArray(saved) && saved.length ? saved : defaults;
  setMultiSelectValues(picker, sel);
}

function persistHydroReadSelections(){
  const kind = getSelectedHydroReadKind();
  const view = getSelectedHydroReadView();
  const metric = getSelectedHydroReadMetric();
  const scope = getSelectedHydroReadScope();
  const step = getSelectedHydroReadStep();

  localStorage.setItem(STORAGE_KEY_HYDRO_READ_KIND, kind);
  localStorage.setItem(STORAGE_KEY_HYDRO_READ_VIEW, view);
  localStorage.setItem(STORAGE_KEY_HYDRO_READ_SCOPE, scope);
  localStorage.setItem(STORAGE_KEY_HYDRO_READ_STEP, step);

  if (kind === "gw") localStorage.setItem(STORAGE_KEY_HYDRO_READ_METRIC_GW, metric);
  else localStorage.setItem(STORAGE_KEY_HYDRO_READ_METRIC_RIVER, metric);

  const siteIds = getSelectedHydroReadSiteIds();
  const storageKey = hydroReadSitesStorageKey(kind, scope);
  try{ localStorage.setItem(storageKey, JSON.stringify(siteIds)); }catch(e){}
}

async function ensureDistrictHydroReadingsComputed(force=false){
  const canvas = document.getElementById("districtHydroReadingsChart");
  const meta = document.getElementById("districtHydroReadingsMeta");
  if (!canvas || !meta) return;

  if (!dataCache){ meta.textContent = "No data loaded"; return; }

  const kind = getSelectedHydroReadKind();
  const view = getSelectedHydroReadView();
  const metric = getSelectedHydroReadMetric();
  const scope = getSelectedHydroReadScope();
  const step = getSelectedHydroReadStep();

  const win = getDistrictTrendWindow();
  const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
  const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;

  let start = win.start;
  let end = win.end;
  if (rangeMin && start < rangeMin) start = rangeMin;
  if (rangeMax && end > rangeMax) end = rangeMax;

  if (start > end){ meta.textContent = "No overlapping time window for hydrology readings"; return; }

  // Selected sites
  const selected = getSelectedHydroReadSiteIds();
  const key = windowKey({start,end}) + `|hydroRead|${kind}|${metric}|${view}|${scope}|${step}|` + selected.join(",");

  if (!force && districtHydroReadings.key === key && districtHydroReadings.times?.length > 1) return;
  if (districtHydroReadings.building) return districtHydroReadings.building;

  meta.textContent = "Building district hydrology readings trend (Hilltop)...";

  const buildPromise = (async ()=>{
    // Build time buckets
    const times = [];
    const stepLabel = (step === "hour") ? "hourly" : "daily";
    let d = (step === "hour") ? startOfLocalHour(start) : localMidday(start);
    const endBucket = (step === "hour") ? startOfLocalHour(end) : localMidday(end);
    let safety = 0;
    const safetyMax = (step === "hour") ? 9600 : 400;
    while (d <= endBucket && safety < safetyMax){
      times.push(new Date(d));
      d = (step === "hour") ? addLocalHours(d, 1) : addLocalDays(d, 1);
      safety++;
      if (safety % 40 === 0) await new Promise(r=>setTimeout(r,0));
    }

    // Build site definitions from current picker options
    const allCandidates = collectDistrictHydroSites(kind, metric, scope);
    const pickedSet = new Set(selected);
    const pickedSites = allCandidates.filter(s => pickedSet.has(s.id));

    if (!pickedSites.length){
      districtHydroReadings.key = key;
      districtHydroReadings.kind = kind;
      districtHydroReadings.metric = metric;
      districtHydroReadings.view = view;
      districtHydroReadings.times = times;
      districtHydroReadings.sites = [];
      districtHydroReadings.agg = [];
      districtHydroReadings.aggN = [];
      districtHydroReadings.unit = "";
      districtHydroReadings.aggType = (metric === "flow") ? "sum" : "mean";
      meta.textContent = "No sites selected";
      districtHydroReadings.defaultMeta = meta.textContent;
      renderDistrictHydroReadingsChart();
        refreshDistrictHydroListIfVisible(false);
      return;
    }

    // Fetch and align each site (raw series cached per site+measurement)

    const siteSeries = [];

    for (let i=0;i<pickedSites.length;i++){
      const s = pickedSites[i];
      const unitNorm = normaliseHydroUnit(kind, metric, s.unitRaw);

      const cacheKey = `hydroRead2||${s.siteName}||${s.measName}||${kind}||${metric}||${step}||${start.toISOString().slice(0,16)}||${end.toISOString().slice(0,16)}`;

      let dailyMap = districtHydroReadingsCache.get(cacheKey);
      if (!dailyMap){
        try{
          const rawSeriesAll = await ensureHilltopRangeCachedSeries_(s.siteName, s.measName, start, end);
          const rawSeries = clipHilltopSeriesToRange_(rawSeriesAll, start, end);
          const meanMapRaw = (step === "hour") ? hourlyMeanFromSeries(rawSeries) : dailyMeanFromSeries(rawSeries);
          // Apply conversion
          const meanMap = new Map();
          for (const [k,v] of meanMapRaw.entries()){
            const vv = (v == null || !isFinite(v)) ? null : unitNorm.conv(Number(v));
            meanMap.set(k, (vv == null || !isFinite(vv)) ? null : vv);
          }
          dailyMap = { meanMap, unit: unitNorm.unit };
          districtHydroReadingsCache.set(cacheKey, dailyMap);
        } catch (e){
          dailyMap = { meanMap: new Map(), unit: unitNorm.unit, error: true };
          districtHydroReadingsCache.set(cacheKey, dailyMap);
        }
      }

      const values = [];
      for (const t of times){
        const k = (step === "hour") ? ymdhLocal(t) : ymdLocal(t);
        const v = dailyMap.meanMap.get(k);
        values.push(v == null || !isFinite(v) ? null : v);
      }

      siteSeries.push({
        id: s.id,
        title: s.title,
        measName: s.measName,
        unit: dailyMap.unit || unitNorm.unit,
        values
      });

      if (i % 2 === 1) await new Promise(r=>setTimeout(r,0));
    }

    // Aggregate
    const agg = [];
    const aggN = [];
    const aggType = (metric === "flow") ? "sum" : "mean";

    for (let i=0;i<times.length;i++){
      let sum = 0;
      let n = 0;
      for (const ss of siteSeries){
        const v = ss.values[i];
        if (v == null || !isFinite(v)) continue;
        sum += v; n++;
      }
      aggN.push(n);
      if (!n){ agg.push(null); }
      else {
        agg.push(aggType === "sum" ? sum : (sum / n));
      }
    }

    // Determine unit label for aggregate
    let unit = "";
    if (metric === "flow") unit = "m³/s";
    else unit = "m";

    districtHydroReadings.key = key;
    districtHydroReadings.kind = kind;
    districtHydroReadings.metric = metric;
    districtHydroReadings.view = view;
    districtHydroReadings.unit = unit;
    districtHydroReadings.aggType = aggType;
    districtHydroReadings.times = times;
    districtHydroReadings.sites = siteSeries;
    districtHydroReadings.agg = agg;
    districtHydroReadings.aggN = aggN;

    const latest = [...agg].reverse().find(v => v != null && isFinite(v));
    const rangeTxt = `${formatWhenNZ(start)} to ${formatWhenNZ(end)} • ${times.length} days`;

    const modeTxt = (kind === "gw") ? "Groundwater" : "Rivers";
    const metricTxt = (metric === "flow") ? "Flow" : "Level";
    const aggTxt = (aggType === "sum") ? "Total" : "Mean";
    const latestTxt = (latest != null) ? `${aggTxt} ${metricTxt}: ${fmt(latest, metric === "flow" ? 3 : 2)} ${unit}` : `${aggTxt} ${metricTxt}: -`;

    meta.textContent = `${rangeTxt} • ${modeTxt} • ${latestTxt} • Sites ${siteSeries.length}`;
    districtHydroReadings.defaultMeta = meta.textContent;

    renderDistrictHydroReadingsChart();
        refreshDistrictHydroListIfVisible(false);
  })().finally(()=>{ districtHydroReadings.building = null; });

  districtHydroReadings.building = buildPromise;
  return buildPromise;
}

function renderDistrictHydroReadingsChart(){
  const canvas = document.getElementById("districtHydroReadingsChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  ctx.clearRect(0,0,w,h);

  const kind = districtHydroReadings.kind;
  const metric = districtHydroReadings.metric;
  const view = getSelectedHydroReadView();
  const unit = districtHydroReadings.unit || "";

  const palette = [cssVar("--ok"), cssVar("--watch"), cssVar("--warn"), cssVar("--severe"), cssVar("--extreme")];

  const seriesToDraw = [];
  let legendItems = [];

  if (view === "individual"){
    const selected = getSelectedHydroReadSiteIds();
    const set = new Set(selected);
    const chosen = (districtHydroReadings.sites || []).filter(s => set.has(s.id));

    for (let i=0;i<chosen.length;i++){
      seriesToDraw.push(chosen[i].values);
      legendItems.push({ label: chosen[i].title, color: palette[i % palette.length] });
    }
    buildHydroReadLegend(legendItems);
  } else {
    seriesToDraw.push(districtHydroReadings.agg || []);
    buildHydroReadLegend([]);
  }

  const n = (districtHydroReadings.times || []).length;
  if (n < 2){
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px system-ui";
    ctx.fillText("No trend data", 12, 18);
    ctx.restore();
    return;
  }

  const clampMin0 = (kind === "river" && metric === "flow");
  const ext = computeNiceExtentMulti(seriesToDraw, clampMin0);
  const layout = hydroReadLayout(w, h, n, ext.min, ext.max);

  drawHydroReadAxes(ctx, layout, metric === "flow" ? 3 : 2);

  if (view === "individual"){
    for (let i=0;i<seriesToDraw.length;i++){
      drawHydroReadSeries(ctx, layout, seriesToDraw[i], palette[i % palette.length], 2);
    }
  } else {
    drawHydroReadSeries(ctx, layout, seriesToDraw[0], cssVar("--ok"), 2.5);
  }

  // Hover point
  const i = districtHydroReadHover.idx;
  if (i != null && i >= 0 && i < n){
    let showV = null;
    if (view === "individual"){
      // If multiple series, just snap to first valid
      for (const arr of seriesToDraw){
        const v = arr[i];
        if (v != null && isFinite(v)){ showV = v; break; }
      }
    } else {
      const v = seriesToDraw[0][i];
      if (v != null && isFinite(v)) showV = v;
    }

    if (showV != null && isFinite(showV)){
      const xP = layout.xAt(i);
      const yP = layout.yAt(showV);
      ctx.save();
      ctx.fillStyle = cssVar("--ok");
      ctx.beginPath();
      ctx.arc(xP, yP, 3.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function ensureDistrictHydroReadHoverHooks(){
  const canvas = document.getElementById("districtHydroReadingsChart");
  if (!canvas || canvas._hoverHooked) return;
  canvas._hoverHooked = true;

  const tip = document.getElementById("districtHydroReadingsTooltip");
  const meta = document.getElementById("districtHydroReadingsMeta");

  const onMove = (e)=>{
    const times = districtHydroReadings.times || [];
    if (times.length < 2) return;

    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * devicePixelRatio;

    const w = canvas.width || 1;
    const padL = 56;
    const padR = 10;
    const x0 = padL;
    const x1 = w - padR;

    const t = clamp((x - x0) / (x1 - x0), 0, 1);
    const idx = Math.round(t * (times.length - 1));
    districtHydroReadHover.idx = idx;

    const when = times[idx];
    const step = getSelectedHydroReadStep();
    const dateTxt = when ? (
      step === "hour"
        ? when.toLocaleString("en-NZ", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
        : when.toLocaleDateString("en-NZ", { year:"numeric", month:"short", day:"2-digit" })
    ) : "";

    const kind = getSelectedHydroReadKind();
    const metric = getSelectedHydroReadMetric();
    const view = getSelectedHydroReadView();

    const unit = districtHydroReadings.unit || "";

    if (tip){
      tip.style.display = "block";
      const pad = 8;
      const offsetX = 14;
      const offsetY = 14;
      let left = e.clientX + offsetX;
      let top = e.clientY + offsetY;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
      const maxLeft = Math.max(pad, (window.innerWidth || document.documentElement.clientWidth || 0) - tip.offsetWidth - pad);
      const maxTop = Math.max(pad, (window.innerHeight || document.documentElement.clientHeight || 0) - tip.offsetHeight - pad);
      if (left > maxLeft) left = e.clientX - tip.offsetWidth - offsetX;
      if (top > maxTop) top = e.clientY - tip.offsetHeight - offsetY;
      left = clamp(left, pad, maxLeft);
      top = clamp(top, pad, maxTop);
      tip.style.left = left + "px";
      tip.style.top = top + "px";

      const modeTxt = (kind === "gw") ? "Groundwater" : "Rivers";
      const metricTxt = (metric === "flow") ? "Flow" : "Level";

      if (view === "combined"){
        const v = (districtHydroReadings.agg || [])[idx];
        const nUsed = (districtHydroReadings.aggN || [])[idx];
        const valTxt = (v == null || !isFinite(v)) ? "-" : fmt(v, metric === "flow" ? 3 : 2);
        tip.innerHTML = `<div style="font-weight:700; margin-bottom:2px;">${escapeHtml(modeTxt)} ${escapeHtml(metricTxt)}</div>` +
          `<div class="tiny muted">${escapeHtml(dateTxt)}</div>` +
          `<div style="margin-top:4px;"><span style="font-weight:700;">${escapeHtml(valTxt)}</span> <span class="tiny muted">${escapeHtml(unit)}</span> <span class="tiny muted">n=${nUsed||0}</span></div>`;
      } else {
        const selected = getSelectedHydroReadSiteIds();
        const set = new Set(selected);
        const chosen = (districtHydroReadings.sites || []).filter(s => set.has(s.id));
        const rows = [];
        const maxRows = 12;
        for (let ii=0; ii<chosen.length && ii<maxRows; ii++){
          const s = chosen[ii];
          const v = s.values[idx];
          const valTxt = (v == null || !isFinite(v)) ? "-" : fmt(v, metric === "flow" ? 3 : 2);
          rows.push(`<div class="tiny"><span style="font-weight:700;">${escapeHtml(valTxt)}</span> <span class="muted">${escapeHtml(s.title)}</span></div>`);
        }
        if (chosen.length > maxRows){
          rows.push(`<div class="tiny muted">+${chosen.length - maxRows} more (switch to Combined if you need a compact view)</div>`);
        }

        tip.innerHTML = `<div style="font-weight:700; margin-bottom:2px;">${escapeHtml(modeTxt)} ${escapeHtml(metricTxt)}</div>` +
          `<div class="tiny muted">${escapeHtml(dateTxt)}</div>` +
          `<div style="margin-top:4px;">${rows.join("")}</div>`;
      }
    }

    if (meta){
      meta.textContent = districtHydroReadings.defaultMeta || meta.textContent;
    }

    renderDistrictHydroReadingsChart();
        refreshDistrictHydroListIfVisible(false);
  };

  const onLeave = ()=>{
    districtHydroReadHover.idx = -1;
    if (tip) tip.style.display = "none";
    if (meta) meta.textContent = districtHydroReadings.defaultMeta || meta.textContent;
    renderDistrictHydroReadingsChart();
        refreshDistrictHydroListIfVisible(false);
  };

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
}


// ------------------------- District Hydrology Readings: List Mode (Tables + Sparklines) -------------------------
const districtHydroListState = {
  enabled: false,
  key: null,
  building: null,
  start: null,
  end: null,
  step: null,
  scope: null,
  times: [],
  rowsRiver: [],
  rowsGw: [],
  sortRiver: { key: "name", dir: 1 },
  sortGw: { key: "name", dir: 1 }
};

function parseHydroIdSiteName(id){
  if (!id || typeof id !== "string") return null;
  const parts = id.split("||");
  return parts[0] ? String(parts[0]) : null;
}

function readStoredHydroSiteNames(kind, scope){
  const storageKey = hydroReadSitesStorageKey(kind, scope);
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(storageKey) || "null"); }catch(e){ saved = null; }
  const names = [];
  if (Array.isArray(saved)){
    for (const id of saved){
      const n = parseHydroIdSiteName(id);
      if (n) names.push(n);
    }
  }
  const out = [];
  const seen = new Set();
  for (const n of names){
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function buildHydroSiteLookups(){
  const river = new Map();
  const gw = new Map();

  for (const raw of (dataCache?.riverSites || [])){
    try{
      const s = normaliseNrcRiverSite(raw);
      const nm = (raw?.Name || s?.siteName || s?.name || s?.title || "").trim();
      if (nm && !river.has(nm)) river.set(nm, s);
    }catch(e){}
  }
  for (const ref of (dataCache?.riverForLoc || [])){
    const s = ref?.site;
    if (!s) continue;
    const nm = (s?.siteName || s?.name || s?.title || "").trim();
    if (nm && !river.has(nm)) river.set(nm, s);
  }

  for (const raw of (dataCache?.gwSites || [])){
    try{
      const s = normaliseNrcGroundwaterSite(raw);
      const nm = (raw?.Name || s?.siteName || s?.name || s?.title || "").trim();
      if (nm && !gw.has(nm)) gw.set(nm, s);
    }catch(e){}
  }
  for (const ref of (dataCache?.gwForLoc || [])){
    const s = ref?.site;
    if (!s) continue;
    const nm = (s?.siteName || s?.name || s?.title || "").trim();
    if (nm && !gw.has(nm)) gw.set(nm, s);
  }

  return { river, gw };
}

function buildHydroBucketTimes(start, end, step){
  const times = [];
  let d = (step === "hour") ? startOfLocalHour(start) : localMidday(start);
  const endBucket = (step === "hour") ? startOfLocalHour(end) : localMidday(end);
  let safety = 0;
  const safetyMax = (step === "hour") ? 9600 : 400;
  while (d <= endBucket && safety < safetyMax){
    times.push(new Date(d));
    d = (step === "hour") ? addLocalHours(d, 1) : addLocalDays(d, 1);
    safety++;
  }
  return times;
}

async function buildHydroMeanValues(siteName, measName, kind, metric, unitRaw, start, end, step, times){
  if (!siteName || !measName) return { values: times.map(()=>null), unit: "" };

  const unitNorm = normaliseHydroUnit(kind, metric, unitRaw);

  const cacheKey = `hydroReadList||${siteName}||${measName}||${kind}||${metric}||${step}||${start.toISOString().slice(0,16)}||${end.toISOString().slice(0,16)}`;

  let cached = districtHydroReadingsCache.get(cacheKey);
  if (!cached){
    try{
      const rawAll = await ensureHilltopRangeCachedSeries_(siteName, measName, start, end);
      const raw = clipHilltopSeriesToRange_(rawAll, start, end);
      const meanMapRaw = (step === "hour") ? hourlyMeanFromSeries(raw) : dailyMeanFromSeries(raw);

      const meanMap = new Map();
      for (const [k,v] of meanMapRaw.entries()){
        const vv = (v == null || !isFinite(v)) ? null : unitNorm.conv(Number(v));
        meanMap.set(k, (vv == null || !isFinite(vv)) ? null : vv);
      }
      cached = { meanMap, unit: unitNorm.unit };
      districtHydroReadingsCache.set(cacheKey, cached);
    }catch(e){
      cached = { meanMap: new Map(), unit: unitNorm.unit, error: true };
      districtHydroReadingsCache.set(cacheKey, cached);
    }
  }

  const values = [];
  for (const t of times){
    const k = (step === "hour") ? ymdhLocal(t) : ymdLocal(t);
    const v = cached.meanMap.get(k);
    values.push(v == null || !isFinite(v) ? null : v);
  }
  return { values, unit: cached.unit || unitNorm.unit };
}

function firstLastDelta(values){
  let first = null, last = null;
  for (let i=0;i<values.length;i++){
    const v = values[i];
    if (v == null || !isFinite(v)) continue;
    first = v; break;
  }
  for (let i=values.length-1;i>=0;i--){
    const v = values[i];
    if (v == null || !isFinite(v)) continue;
    last = v; break;
  }
  const delta = (first != null && last != null) ? (last - first) : null;
  return { first, last, delta };
}

function latestValueAndTime(values, times){
  for (let i=values.length-1;i>=0;i--){
    const v = values[i];
    if (v == null || !isFinite(v)) continue;
    return { v, t: times[i] };
  }
  return { v: null, t: null };
}

function districtHydroListKey(opts){
  const a = opts.start.toISOString().slice(0,16);
  const b = opts.end.toISOString().slice(0,16);
  const loaded = dataCache?.loadedAt ? new Date(dataCache.loadedAt).toISOString().slice(0,19) : "none";
  const riverKey = (opts.riverNames || []).join(",");
  const gwKey = (opts.gwNames || []).join(",");
  return `${timeMode}|${a}|${b}|${opts.step}|${opts.scope}|${loaded}|r:${riverKey}|g:${gwKey}`;
}

function setDistrictHydroListVisible(vis){
  const wrap = document.getElementById("districtHydroListWrap");
  if (!wrap) return;
  wrap.style.display = vis ? "block" : "none";
  const btn = document.getElementById("btnToggleDistrictHydroList");
  if (btn) btn.textContent = vis ? "Hide List" : "List Mode";
}

function toggleDistrictHydroListMode(force){
  const next = (typeof force === "boolean") ? force : !districtHydroListState.enabled;
  districtHydroListState.enabled = next;
  try{ localStorage.setItem(STORAGE_KEY_HYDRO_READ_LISTMODE, next ? "1" : "0"); }catch(e){}
  setDistrictHydroListVisible(next);
  if (next){
    ensureDistrictHydroListComputed(false).catch(()=>{});
  }
}

async function ensureDistrictHydroListComputed(force=false){
  const wrap = document.getElementById("districtHydroListWrap");
  const metaEl = document.getElementById("districtHydroListMeta");
  if (!wrap || !metaEl) return;
  if (!districtHydroListState.enabled) return;
  if (!dataCache){ metaEl.textContent = "No data loaded"; return; }

  const scope = getSelectedHydroReadScope();
  const step = getSelectedHydroReadStep();

  const win = getDistrictTrendWindow();
  const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
  const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;

  let start = win.start;
  let end = win.end;
  if (rangeMin && start < rangeMin) start = rangeMin;
  if (rangeMax && end > rangeMax) end = rangeMax;

  if (start > end){ metaEl.textContent = "No overlapping time window"; return; }

  const times = buildHydroBucketTimes(start, end, step);

  let riverNames = readStoredHydroSiteNames("river", scope);
  let gwNames = readStoredHydroSiteNames("gw", scope);

  const lookups = buildHydroSiteLookups();

  if (!riverNames.length){
    const candidates = collectDistrictHydroSites("river", "flow", scope);
    riverNames = candidates.slice(0, Math.min(10, candidates.length)).map(s => s.siteName);
  }
  if (!gwNames.length){
    const candidates = collectDistrictHydroSites("gw", "level", scope);
    gwNames = candidates.slice(0, Math.min(10, candidates.length)).map(s => s.siteName);
  }

  riverNames = riverNames.filter((n,i,a)=>a.indexOf(n)===i).filter(n => lookups.river.has(n));
  gwNames = gwNames.filter((n,i,a)=>a.indexOf(n)===i).filter(n => lookups.gw.has(n));

  const key = districtHydroListKey({start, end, step, scope, riverNames, gwNames});
  if (!force && districtHydroListState.key === key && districtHydroListState.times?.length) return;
  if (districtHydroListState.building) return districtHydroListState.building;

  metaEl.textContent = "Building list (Hilltop)...";

  const promise = (async ()=>{
    const rowsRiver = [];
    const rowsGw = [];

    for (let i=0;i<riverNames.length;i++){
      if (!districtHydroListState.enabled) break;

      const siteName = riverNames[i];
      const s = lookups.river.get(siteName);
      if (!s) continue;

      const title = s.title || s.name || siteName;
      const flowMeas = s.flowMeasName || s.flowMeas || s.flowMeasurement || null;
      const stageMeas = s.levelMeasName || s.stageMeasName || s.levelMeas || s.stageMeasurement || null;

      const flowUnits = s.flowUnits || s.flowUnit || s.unitFlow || "";
      const stageUnits = s.levelUnits || s.stageUnits || s.levelUnit || s.unitLevel || "";

      const flow = await buildHydroMeanValues(siteName, flowMeas, "river", "flow", flowUnits, start, end, step, times);
      const stage = await buildHydroMeanValues(siteName, stageMeas, "river", "level", stageUnits, start, end, step, times);

      const latestFlow = latestValueAndTime(flow.values, times);
      const latestStage = latestValueAndTime(stage.values, times);

      const deltaFlow = firstLastDelta(flow.values);
      const deltaStage = firstLastDelta(stage.values);

      rowsRiver.push({
        siteName,
        title,
        flowVal: latestFlow.v,
        flowTime: latestFlow.t,
        stageVal: latestStage.v,
        stageTime: latestStage.t,
        flowDelta: deltaFlow.delta,
        stageDelta: deltaStage.delta,
        flowValues: flow.values,
        stageValues: stage.values
      });

      if (i % 2 === 1) await new Promise(r=>setTimeout(r,0));
    }

    for (let i=0;i<gwNames.length;i++){
      if (!districtHydroListState.enabled) break;

      const siteName = gwNames[i];
      const s = lookups.gw.get(siteName);
      if (!s) continue;

      const title = s.title || s.name || siteName;
      const measObj = pickGroundwaterHistoryMeasurement(s);
      const measName = measObj?.name || measObj?.Name || s.measName || null;
      const unitRaw = measObj?.units || measObj?.Units || s.unitRaw || "";

      const level = await buildHydroMeanValues(siteName, measName, "gw", "level", unitRaw, start, end, step, times);
      const latest = latestValueAndTime(level.values, times);
      const delta = firstLastDelta(level.values);

      rowsGw.push({
        siteName,
        title,
        stageVal: latest.v,
        stageTime: latest.t,
        stageDelta: delta.delta,
        stageValues: level.values
      });

      if (i % 3 === 2) await new Promise(r=>setTimeout(r,0));
    }

    districtHydroListState.key = key;
    districtHydroListState.start = start;
    districtHydroListState.end = end;
    districtHydroListState.step = step;
    districtHydroListState.scope = scope;
    districtHydroListState.times = times;
    districtHydroListState.rowsRiver = rowsRiver;
    districtHydroListState.rowsGw = rowsGw;

    const rangeTxt = `${formatWhenNZ(start)} to ${formatWhenNZ(end)}`;
    metaEl.textContent = `${rangeTxt} • Step ${step} • Rivers ${rowsRiver.length} • Groundwater ${rowsGw.length}`;

    renderDistrictHydroListTables();
  })().finally(()=>{ districtHydroListState.building = null; });

  districtHydroListState.building = promise;
  return promise;
}

function sortHydroRows(rows, key, dir){
  const getVal = (r) => {
    if (key === "name") return (r.title || "").toLowerCase();
    if (key === "flow") return r.flowVal;
    if (key === "stage") return r.stageVal;
    if (key === "flowChange") return r.flowDelta;
    if (key === "stageChange") return r.stageDelta;
    if (key === "flowTime") return r.flowTime ? r.flowTime.getTime() : null;
    if (key === "stageTime") return r.stageTime ? r.stageTime.getTime() : null;
    return null;
  };

  return [...rows].sort((a,b)=>{
    const va = getVal(a);
    const vb = getVal(b);

    const aNull = (va == null || (typeof va === "number" && !isFinite(va)));
    const bNull = (vb == null || (typeof vb === "number" && !isFinite(vb)));
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;

    if (typeof va === "string" || typeof vb === "string"){
      return dir * String(va).localeCompare(String(vb));
    }
    return dir * (Number(va) - Number(vb));
  });
}

function drawMiniSparkline(canvas, values, color){
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width = Math.max(10, Math.floor(canvas.clientWidth * devicePixelRatio));
  const h = canvas.height = Math.max(10, Math.floor(canvas.clientHeight * devicePixelRatio));

  ctx.clearRect(0,0,w,h);

  const pts = values.map(v => (v == null || !isFinite(v)) ? null : Number(v));
  const finite = pts.filter(v => v != null && isFinite(v));
  if (!finite.length) return;

  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max){
    const pad = (Math.abs(min) || 1) * 0.02;
    min -= pad; max += pad;
  }
  const padX = 2 * devicePixelRatio;
  const padY = 2 * devicePixelRatio;

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1 * devicePixelRatio;
  ctx.beginPath();
  ctx.moveTo(padX, h - padY);
  ctx.lineTo(w - padX, h - padY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = color || cssVar("--ok");
  ctx.lineWidth = 1.6 * devicePixelRatio;
  ctx.beginPath();

  const n = pts.length;
  let started = false;
  for (let i=0;i<n;i++){
    const v = pts[i];
    if (v == null || !isFinite(v)) continue;

    const x = padX + (i / Math.max(1, n-1)) * (w - padX*2);
    const y = padY + (1 - ((v - min) / (max - min))) * (h - padY*2);

    if (!started){ ctx.moveTo(x,y); started = true; }
    else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function renderDistrictHydroListTables(){
  const wrap = document.getElementById("districtHydroListWrap");
  const tblR = document.getElementById("tblDistrictHydroRivers");
  const tblG = document.getElementById("tblDistrictHydroGw");
  if (!wrap || !tblR || !tblG) return;
  if (!districtHydroListState.enabled) return;

  const rRows = sortHydroRows(districtHydroListState.rowsRiver || [], districtHydroListState.sortRiver.key, districtHydroListState.sortRiver.dir);
  const gRows = sortHydroRows(districtHydroListState.rowsGw || [], districtHydroListState.sortGw.key, districtHydroListState.sortGw.dir);

  const riverHead = `
    <thead><tr>
      <th class="sortable" data-table="river" data-sort="name">Name</th>
      <th class="sortable" data-table="river" data-sort="flow">Flow</th>
      <th class="sortable" data-table="river" data-sort="flowTime">Flow Reading Date and Time</th>
      <th class="sortable" data-table="river" data-sort="stage">Stage</th>
      <th class="sortable" data-table="river" data-sort="stageTime">Stage Reading Date and Time</th>
      <th>Sparkline</th>
      <th class="sortable" data-table="river" data-sort="flowChange">Change In Period (Flow)</th>
      <th class="sortable" data-table="river" data-sort="stageChange">Change In Period (Stage)</th>
    </tr></thead>
  `;

  const gwHead = `
    <thead><tr>
      <th class="sortable" data-table="gw" data-sort="name">Name</th>
      <th>Flow</th>
      <th>Flow Reading Date and Time</th>
      <th class="sortable" data-table="gw" data-sort="stage">Stage</th>
      <th class="sortable" data-table="gw" data-sort="stageTime">Stage Reading Date and Time</th>
      <th>Sparkline</th>
      <th>Change In Period (Flow)</th>
      <th class="sortable" data-table="gw" data-sort="stageChange">Change In Period (Stage)</th>
    </tr></thead>
  `;

  function fmtVal(v, decimals){
    if (v == null || !isFinite(v)) return "-";
    return fmt(v, decimals);
  }
  function fmtTime(t){
    if (!(t instanceof Date) || isNaN(t.getTime())) return "-";
    return formatWhenNZ(t);
  }

  const riverBody = `<tbody>` + rRows.map((r, idx)=>{
    const flowTxt = fmtVal(r.flowVal, 3);
    const stageTxt = fmtVal(r.stageVal, 2);
    const flowDeltaTxt = fmtVal(r.flowDelta, 3);
    const stageDeltaTxt = fmtVal(r.stageDelta, 2);

    return `<tr>
      <td>${escapeHtml(r.title)}</td>
      <td class="mono">${flowTxt}</td>
      <td class="mono">${escapeHtml(fmtTime(r.flowTime))}</td>
      <td class="mono">${stageTxt}</td>
      <td class="mono">${escapeHtml(fmtTime(r.stageTime))}</td>
      <td>
        <div class="sparkCell">
          <div class="sparkLabel">Flow</div>
          <canvas class="sparkMini" data-table="river" data-row="${idx}" data-spark="flow"></canvas>
          <div class="sparkLabel">Stage</div>
          <canvas class="sparkMini" data-table="river" data-row="${idx}" data-spark="stage"></canvas>
        </div>
      </td>
      <td class="mono">${flowDeltaTxt}</td>
      <td class="mono">${stageDeltaTxt}</td>
    </tr>`;
  }).join("") + `</tbody>`;

  const gwBody = `<tbody>` + gRows.map((r, idx)=>{
    const stageTxt = fmtVal(r.stageVal, 2);
    const stageDeltaTxt = fmtVal(r.stageDelta, 2);
    return `<tr>
      <td>${escapeHtml(r.title)}</td>
      <td class="mono">-</td>
      <td class="mono">-</td>
      <td class="mono">${stageTxt}</td>
      <td class="mono">${escapeHtml(fmtTime(r.stageTime))}</td>
      <td>
        <div class="sparkCell">
          <div class="sparkLabel">Level</div>
          <canvas class="sparkMini" data-table="gw" data-row="${idx}" data-spark="stage"></canvas>
        </div>
      </td>
      <td class="mono">-</td>
      <td class="mono">${stageDeltaTxt}</td>
    </tr>`;
  }).join("") + `</tbody>`;

  tblR.innerHTML = riverHead + riverBody;
  tblG.innerHTML = gwHead + gwBody;

  setTimeout(()=>{
    const ok = cssVar("--ok");
    const warn = cssVar("--warn");
    const canvases = wrap.querySelectorAll("canvas.sparkMini");
    for (const c of canvases){
      const table = c.getAttribute("data-table");
      const rowIdx = Number(c.getAttribute("data-row") || "0");
      const mode = c.getAttribute("data-spark") || "";

      if (table === "river"){
        const row = rRows[rowIdx];
        if (!row) continue;
        const vals = (mode === "flow") ? row.flowValues : row.stageValues;
        drawMiniSparkline(c, vals || [], mode === "flow" ? ok : warn);
      } else if (table === "gw"){
        const row = gRows[rowIdx];
        if (!row) continue;
        drawMiniSparkline(c, row.stageValues || [], ok);
      }
    }
  }, 0);

  hookDistrictHydroListSortHandlers();
}

function hookDistrictHydroListSortHandlers(){
  const wrap = document.getElementById("districtHydroListWrap");
  if (!wrap || wrap._sortHooked) return;
  wrap._sortHooked = true;

  wrap.addEventListener("click", (e)=>{
    const th = e.target?.closest?.("th.sortable");
    if (!th) return;
    const table = th.getAttribute("data-table");
    const key = th.getAttribute("data-sort");
    if (!table || !key) return;

    if (table === "river"){
      if (districtHydroListState.sortRiver.key === key) districtHydroListState.sortRiver.dir *= -1;
      else { districtHydroListState.sortRiver.key = key; districtHydroListState.sortRiver.dir = 1; }
    } else if (table === "gw"){
      if (districtHydroListState.sortGw.key === key) districtHydroListState.sortGw.dir *= -1;
      else { districtHydroListState.sortGw.key = key; districtHydroListState.sortGw.dir = 1; }
    }
    renderDistrictHydroListTables();
  }, { passive: true });
}

function refreshDistrictHydroListIfVisible(force=false){
  if (!districtHydroListState.enabled) return;
  ensureDistrictHydroListComputed(force).catch(()=>{});
}


function hookDistrictHydroReadControls(){
  const kindSel = document.getElementById("districtHydroKind");
  const metricSel = document.getElementById("districtHydroMetric");
  const viewSel = document.getElementById("districtHydroView");
  const scopeSel = document.getElementById("districtHydroScope");
    const stepSel = document.getElementById("districtHydroStep");
const picker = document.getElementById("districtHydroSitePicker");
  const btnList = document.getElementById("btnToggleDistrictHydroList");
  const btnCollapseList = document.getElementById("btnCollapseDistrictHydroList");

  
  const btnAnalysis = document.getElementById("btnToggleDistrictHydroAnalysis");
  const btnCollapseAnalysis = document.getElementById("btnCollapseDistrictHydroAnalysis");
if (!kindSel || !metricSel || !viewSel || !scopeSel || !stepSel || !picker) return;
  if (kindSel._hooked) return;
  kindSel._hooked = metricSel._hooked = viewSel._hooked = scopeSel._hooked = stepSel._hooked = picker._hooked = true;

  // Restore saved kind, view, and scope
  const savedKind = localStorage.getItem(STORAGE_KEY_HYDRO_READ_KIND);
  const savedView = localStorage.getItem(STORAGE_KEY_HYDRO_READ_VIEW);
  const savedScope = localStorage.getItem(STORAGE_KEY_HYDRO_READ_SCOPE);

    const savedStep = localStorage.getItem(STORAGE_KEY_HYDRO_READ_STEP);
if (savedKind) setSelectValueSafe(kindSel, savedKind);
  if (savedView) setSelectValueSafe(viewSel, savedView);
  if (savedScope) setSelectValueSafe(scopeSel, savedScope);

    if (savedStep) setSelectValueSafe(stepSel, savedStep);
populateHydroReadMetricSelector(getSelectedHydroReadKind());
  populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());

  // Restore List Mode
  try{
    const lm = localStorage.getItem(STORAGE_KEY_HYDRO_READ_LISTMODE);
    if (lm === "1"){
      districtHydroListState.enabled = true;
      setDistrictHydroListVisible(true);
    }
  }catch(e){}
  // Restore Analysis Mode
  try{
    const am = localStorage.getItem(STORAGE_KEY_HYDRO_READ_ANALYSISMODE);
    if (am === "1"){
      districtHydroAnalysisState.enabled = true;
      setDistrictHydroAnalysisVisible(true);
      if (riverAnalysisConfig.defaultInterval && typeof setSelectValueSafe === "function"){
        setSelectValueSafe(stepSel, riverAnalysisConfig.defaultInterval);
      }
    }
  }catch(e){}
  // Restore Analysis Table Visibility
  try{
    const at = localStorage.getItem(STORAGE_KEY_HYDRO_READ_ANALYSISTABLE);
    if (at === "1") districtHydroAnalysisState.showTable = true;
  }catch(e){}


  kindSel.addEventListener("change", ()=>{
    populateHydroReadMetricSelector(getSelectedHydroReadKind());
    populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });

  metricSel.addEventListener("change", ()=>{
    populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });

  viewSel.addEventListener("change", ()=>{
    // Update defaults when switching view if selection empty
    populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });

  scopeSel.addEventListener("change", ()=>{
    populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });

  
  stepSel.addEventListener("change", ()=>{
    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    try{
      const aSel = document.getElementById("districtHydroAnalysisStep");
      if (aSel && aSel.value !== stepSel.value) aSel.value = stepSel.value;
      const rSel = document.getElementById("districtHydroResponseSummaryStep");
      if (rSel && rSel.value !== stepSel.value) rSel.value = stepSel.value;
    }catch(e){}

    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });
picker.addEventListener("change", ()=>{
    districtHydroReadings.key = null;
    persistHydroReadSelections();
    scheduleDistrictTrendBuild();
    refreshDistrictHydroListIfVisible(true);
    refreshDistrictHydroAnalysisIfVisible(true);
  });
  // Analysis helper: Select All In Picker (switches scope to All first)
  const btnSelectAllSites = document.getElementById("btnDistrictHydroSelectAllSites");
  if (btnSelectAllSites && !btnSelectAllSites._hooked){
    btnSelectAllSites._hooked = true;
    btnSelectAllSites.addEventListener("click", ()=>{
      try{
        const scopeSel2 = document.getElementById("districtHydroScope");
        if (scopeSel2 && scopeSel2.value !== "all"){
          scopeSel2.value = "all";
        }
        // Rebuild picker for current kind/metric/scope
        if (typeof populateHydroReadSitePicker === "function"){
          populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());
        }
        const picker2 = document.getElementById("districtHydroSitePicker");
        if (picker2){
          const vals = Array.from(picker2.options || []).map(o => o.value).filter(Boolean);
          setMultiSelectValues(picker2, vals);
          // Trigger change flow
          picker2.dispatchEvent(new Event("change", { bubbles:true }));
        }
      }catch(e){
        console.warn("Select All In Picker failed", e);
      }
    });
  }


  // List mode controls
  if (btnList && !btnList._hooked){
    btnList._hooked = true;
    btnList.addEventListener("click", ()=>{ toggleDistrictHydroListMode(); });
  }
  if (btnCollapseList && !btnCollapseList._hooked){
    btnCollapseList._hooked = true;
    btnCollapseList.addEventListener("click", ()=>{ toggleDistrictHydroListMode(false); });
  }

    // Analysis mode controls
  if (btnAnalysis && !btnAnalysis._hooked){
    btnAnalysis._hooked = true;
    btnAnalysis.addEventListener("click", ()=>{ toggleDistrictHydroAnalysisMode(); });
  }
  if (btnCollapseAnalysis && !btnCollapseAnalysis._hooked){
    btnCollapseAnalysis._hooked = true;
    btnCollapseAnalysis.addEventListener("click", ()=>{ toggleDistrictHydroAnalysisMode(false); });


  // Analysis table toggle
  const btnAnalysisTable = document.getElementById("btnDistrictHydroAnalysisTable");
  if (btnAnalysisTable && !btnAnalysisTable._hooked){
    btnAnalysisTable._hooked = true;
    btnAnalysisTable.addEventListener("click", ()=>{ toggleDistrictHydroAnalysisTable(); });
  }
  const btnAnalysisTableClose = document.getElementById("btnDistrictHydroAnalysisTableClose");
  if (btnAnalysisTableClose && !btnAnalysisTableClose._hooked){
    btnAnalysisTableClose._hooked = true;
    btnAnalysisTableClose.addEventListener("click", ()=>{ toggleDistrictHydroAnalysisTable(false); });
  }

  // Response Summary interval (mirrors Step)
  const respStepSel = document.getElementById("districtHydroResponseSummaryStep");
  if (respStepSel && !respStepSel._hooked){
    respStepSel._hooked = true;
    respStepSel.addEventListener("change", ()=>{
      try{
        const stepSel2 = document.getElementById("districtHydroStep");
        if (stepSel2 && stepSel2.value !== respStepSel.value){
          stepSel2.value = respStepSel.value;
          stepSel2.dispatchEvent(new Event("change", { bubbles:true }));
        }
      }catch(e){}
    });
  }
  // Analysis card interval (mirrors Step)
  const analysisStepSel = document.getElementById("districtHydroAnalysisStep");
  if (analysisStepSel && !analysisStepSel._hooked){
    analysisStepSel._hooked = true;
    try{
      const stepSel2 = document.getElementById("districtHydroStep");
      if (stepSel2) analysisStepSel.value = stepSel2.value || "day";
    }catch(e){}
    analysisStepSel.addEventListener("change", ()=>{
      try{
        const stepSel2 = document.getElementById("districtHydroStep");
        const respStepSel2 = document.getElementById("districtHydroResponseSummaryStep");
        if (respStepSel2 && respStepSel2.value !== analysisStepSel.value){
          respStepSel2.value = analysisStepSel.value;
        }
        if (stepSel2 && stepSel2.value !== analysisStepSel.value){
          stepSel2.value = analysisStepSel.value;
          stepSel2.dispatchEvent(new Event("change", { bubbles:true }));
        }else{
          refreshDistrictHydroAnalysisIfVisible(true);
        }
      }catch(e){}
    });
  }


  // Apply persisted analysis table state to button label and card
  try{
    const btnT = document.getElementById("btnDistrictHydroAnalysisTable");
    if (btnT) btnT.textContent = districtHydroAnalysisState.showTable ? "Hide Analysis Table" : "Analysis Table";
    const cardT = document.getElementById("districtHydroAnalysisFullTableCard");
    if (cardT) cardT.style.display = (districtHydroAnalysisState.enabled && districtHydroAnalysisState.showTable) ? "" : "none";
  }catch(e){}
  }

ensureDistrictHydroReadHoverHooks();
  // If List Mode was restored, compute immediately
  refreshDistrictHydroListIfVisible(false);
}



/***********************
     * Locations Modal
     ***********************/
    function openModal(){
      document.getElementById("locationsJson").value = JSON.stringify(locations, null, 2);
      document.getElementById("modalBack").style.display = "flex";
    }
    function closeModal(){
      document.getElementById("modalBack").style.display = "none";
    }

    

/***********************
     * Settings
     ***********************/
    const SETTINGS_KEY = "fn_drought_settings_v13_settings";

    function cloneJson(obj){ return JSON.parse(JSON.stringify(obj)); }

    function getDefaultSettings(){
      return {
        general: {
          providersOff: false,
          defaultPastDays: 30,
          defaultForecastDays: 7,
          snapshotMinLookbackDays: 30,
        },
        dash: {
          preferCacheWhenAvailable: (DASH_CONFIG?.cache?.preferCacheWhenAvailable ?? true),
          maxCacheAgeMinutes: (DASH_CONFIG?.cache?.maxCacheAgeMinutes ?? null),
          autoRefreshOnLoad: (DASH_CONFIG?.startup?.autoRefreshOnLoad ?? false),
          providerFallbackWhenMissing: (DASH_CONFIG?.providers?.providerFallbackWhenMissing ?? true),
        },
        layout: {
          enabled: true,
          rememberActiveTab: true,
          defaultTabId: "tab_main"
        },
        drought: {
          windows: cloneJson(droughtConfig.windows),
          thresholds: cloneJson(droughtConfig.thresholds),
          weights: cloneJson(droughtConfig.weights),
          soilLayers: cloneJson(droughtConfig.soilLayers),
          useRiverHybridForIndex: (droughtConfig?.useRiverHybridForIndex ?? false)
        },
        wick: {
          windLow: 3,
          windHigh: 10,
          rhHigh: 50,
          rhLow: 25,
          vpdLow: 0.8,
          vpdHigh: 2.2,
          lowRhThreshold: 30,
          lowWindBumpMax: 0.18
        },
        riverAnalysis: {
          defaultInterval: "hour",
          windowDays: 30,

          // Pairing tolerances
          alignTolHours: 2,
          alignTolDays: 6,

          // Rain context windows (used for context scoring)
          rainCtxFastHours: 6,
          rainCtxSlowHours: 72,

          // Response window tests
          responseWindowsHour: [1,6,24,72],
          responseWindowsDay: [1,3,7],

          // Lag search and quality thresholds
          lagMaxHours: 72,
          lagMinPoints: 12,
          lagMinCorrStrong: 0.25,

          // Drain scoring thresholds
          halfLifeFastHours: 12,
          halfLifeSlowHours: 72,

          // Knee detection
          kneeSlopeMult: 3.0,
          kneeMinSlope: 0.02,
          kneeBaselineFrac: 0.35,
          kneeConsecutive: 3,
          kneeSmoothWin: 5,
          kneeMinPairs: 30,
          kneeFallbackEnabled: true,

          // Band thresholds (score 0–1)
          handlingHighScore: 0.70,
          handlingLowScore: 0.35,
          drainFastScore: 0.70,
          drainSlowScore: 0.35
        }};
    }

    function deepMerge(dst, src){
      if (!src || typeof src !== "object") return dst;
      for (const k of Object.keys(src)){
        const v = src[k];
        if (v && typeof v === "object" && !Array.isArray(v)){
          if (!dst[k] || typeof dst[k] !== "object" || Array.isArray(dst[k])) dst[k] = {};
          deepMerge(dst[k], v);
        } else {
          dst[k] = v;
        }
      }
      return dst;
    }


    function ensureSettingsShape_(){
      // Ensure settings object exists and has expected nested objects even if localStorage contains an older shape.
      if (!appSettings || typeof appSettings !== "object") appSettings = getDefaultSettings();

      // If a section is missing or invalid, replace with empty object so it won't crash access.
      const secs = ["general","dash","layout","drought","wick","riverAnalysis"];
      for (const s of secs){
        if (!appSettings[s] || typeof appSettings[s] !== "object" || Array.isArray(appSettings[s])) appSettings[s] = {};
      }

      // Merge on top of defaults to fill any missing keys.
      const def = getDefaultSettings();
      // Defensive: remove nulls that may have been persisted for known sections
      for (const s of secs){
        if (appSettings[s] == null || typeof appSettings[s] !== "object" || Array.isArray(appSettings[s])) appSettings[s] = {};
      }
      appSettings = deepMerge(def, appSettings);
      return appSettings;
    }

let appSettings = getDefaultSettings();

    function loadSettings(){
      try{
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        let parsed = JSON.parse(raw);

        // If older settings stored a section as null or a non-object, drop it so defaults can fill.
        const allowed = ["general","dash","drought","wick"];
        if (!parsed || typeof parsed !== "object") parsed = {};
        for (const k of allowed){
          if (parsed[k] != null && (typeof parsed[k] !== "object" || Array.isArray(parsed[k]))) delete parsed[k];
          if (parsed[k] === null) delete parsed[k];
        }

        appSettings = deepMerge(getDefaultSettings(), parsed);
        ensureSettingsShape_();
      }catch(e){
        console.warn("Settings load failed", e);
      }
    }

    function saveSettings(){
      try{
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
      }catch(e){
        console.warn("Settings save failed", e);
      }
    }

    function applySettingsToRuntime(){
      ensureSettingsShape_();
      const g = appSettings.general || {};
      const dash = appSettings.dash || {};
      // Ensure runtime config sub-objects exist
      if (!DASH_CONFIG.cache) DASH_CONFIG.cache = {};
      if (!DASH_CONFIG.startup) DASH_CONFIG.startup = {};
      if (!DASH_CONFIG.providers) DASH_CONFIG.providers = {};
      // General defaults
      const pd = Number(g.defaultPastDays);
      const fd = Number(g.defaultForecastDays);
      if (Number.isFinite(pd) && $("pastDays")) $("pastDays").value = String(clamp(pd, 7, 92));
      if (Number.isFinite(fd) && $("forecastDays")) $("forecastDays").value = String(clamp(fd, 3, 16));

      // Historic snapshot lookback min (used by Snapshot Mode windows)
      g.snapshotMinLookbackDays = getSnapshotMinLookbackDays();

      // Provider and cache behavior
      DASH_CONFIG.cache.preferCacheWhenAvailable = !!dash.preferCacheWhenAvailable;
      DASH_CONFIG.startup.autoRefreshOnLoad = !!dash.autoRefreshOnLoad;
      DASH_CONFIG.providers.providerFallbackWhenMissing = !!dash.providerFallbackWhenMissing;
      // Persist coerced dash/general back to settings
      appSettings.dash = dash;
      appSettings.general = g;

      const maxAge = (dash.maxCacheAgeMinutes == null || dash.maxCacheAgeMinutes === "")
        ? null
        : Number(dash.maxCacheAgeMinutes);
      DASH_CONFIG.cache.maxCacheAgeMinutes = Number.isFinite(maxAge) ? Math.max(0, maxAge) : null;

      // Drought tuning
      if (appSettings.drought?.windows) droughtConfig.windows = cloneJson(appSettings.drought.windows);
      if (appSettings.drought?.thresholds) droughtConfig.thresholds = cloneJson(appSettings.drought.thresholds);
      if (appSettings.drought?.weights) droughtConfig.weights = cloneJson(appSettings.drought.weights);

      droughtConfig.useRiverHybridForIndex = !!appSettings.drought.useRiverHybridForIndex;

      if (Array.isArray(appSettings.drought?.soilLayers)){
        droughtConfig.soilLayers = cloneJson(appSettings.drought.soilLayers);
        // renormalise soil layer weights
        const sumW = droughtConfig.soilLayers.reduce((s, x)=> s + (Number(x.w)||0), 0) || 1;
        droughtConfig.soilLayers.forEach(x => { x.w = (Number(x.w)||0) / sumW; });
      }

      // Wicking rating tuning
      droughtConfig.wick = cloneJson(appSettings.wick);
      applyRiverAnalysisSettings_();

      
      // Layout runtime behavior
      applyLayoutSettingsToRuntime_();
// UI reflections
      const pOff = $("providersOff");
      if (pOff) pOff.checked = !!appSettings.general.providersOff;
      const setBox = $("settingsJsonBox");
      if (setBox) setBox.value = JSON.stringify(appSettings, null, 2);
    }

    function openSettingsModal(){
      renderSettingsUi();
      $("settingsModalBack").style.display = "flex";
    }
    function closeSettingsModal(){
      $("settingsModalBack").style.display = "none";
    }

    function setNum(id, v){
      const el = $(id);
      if (!el) return;
      el.value = (v == null || v === "") ? "" : String(v);
    }
    function getNum(id){
      const el = $(id);
      if (!el) return null;
      const raw = String(el.value || "").trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }


    function parseCsvNumList(str, {min=null, max=null, int=false} = {}){
      const raw = String(str || "").trim();
      if (!raw) return null;
      const parts = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
      const out = [];
      for (const p of parts){
        let n = Number(p);
        if (!Number.isFinite(n)) continue;
        if (int) n = Math.round(n);
        if (min != null && n < min) continue;
        if (max != null && n > max) continue;
        out.push(n);
      }
      if (!out.length) return null;
      // Unique and sort ascending
      const uniq = Array.from(new Set(out));
      uniq.sort((a,b)=>a-b);
      return uniq;
    }

    function renderSoilWeightsTable(){
      const body = $("soilWeightsBody");
      if (!body) return;
      body.innerHTML = "";
      const layers = appSettings.drought.soilLayers || [];
      for (let i=0;i<layers.length;i++){
        const lyr = layers[i];
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = lyr.label || lyr.key || ("Layer " + (i+1));

        const tdW = document.createElement("td");
        const inp = document.createElement("input");
        inp.type = "number";
        inp.step = "0.01";
        inp.min = "0";
        inp.value = String(lyr.w ?? "");
        inp.addEventListener("input", ()=>{
          const n = Number(inp.value);
          if (Number.isFinite(n)) appSettings.drought.soilLayers[i].w = n;
        });
        tdW.appendChild(inp);

        tr.appendChild(tdName);
        tr.appendChild(tdW);
        body.appendChild(tr);
      }
    }

    function renderSettingsUi(){
      const g = (appSettings && appSettings.general) ? appSettings.general : {};
      const dash = (appSettings && appSettings.dash) ? appSettings.dash : {};
      // General
      $("providersOff").checked = !!g.providersOff;

      setNum("set_defaultPastDays", g.defaultPastDays);
      setNum("set_defaultForecastDays", g.defaultForecastDays);
      setNum("set_snapshotMinLookbackDays", g.snapshotMinLookbackDays);

      $("set_preferCacheWhenAvailable").checked = !!dash.preferCacheWhenAvailable;
      $("set_autoRefreshOnLoad").checked = !!dash.autoRefreshOnLoad;
      $("set_providerFallbackWhenMissing").checked = !!dash.providerFallbackWhenMissing;

      setNum("set_maxCacheAgeMinutes", dash.maxCacheAgeMinutes);

      // Drought windows
      setNum("set_win_rainPastDays", appSettings.drought.windows.rainPastDays);
      setNum("set_win_rhPastDays", appSettings.drought.windows.rhPastDays);
      setNum("set_win_et0ForecastDays", appSettings.drought.windows.et0ForecastDays);
      setNum("set_win_vpdForecastDays", appSettings.drought.windows.vpdForecastDays);
      setNum("set_win_soilBaselineDays", appSettings.drought.windows.soilBaselineDays);

      // Thresholds
      setNum("set_thr_rain14_wet", appSettings.drought.thresholds.rain14.wet);
      setNum("set_thr_rain14_dry", appSettings.drought.thresholds.rain14.dry);
      setNum("set_thr_rain7_wet", appSettings.drought.thresholds.rain7Forecast.wet);
      setNum("set_thr_rain7_dry", appSettings.drought.thresholds.rain7Forecast.dry);
      setNum("set_thr_rh7_wet", appSettings.drought.thresholds.rh7.wet);
      setNum("set_thr_rh7_dry", appSettings.drought.thresholds.rh7.dry);
      setNum("set_thr_et07_low", appSettings.drought.thresholds.et07.low);
      setNum("set_thr_et07_high", appSettings.drought.thresholds.et07.high);
      setNum("set_thr_vpd_low", appSettings.drought.thresholds.vpd.low);
      setNum("set_thr_vpd_high", appSettings.drought.thresholds.vpd.high);

      // Weights
      setNum("set_w_soil", appSettings.drought.weights.soil);
      setNum("set_w_rain", appSettings.drought.weights.rain);
      setNum("set_w_evap", appSettings.drought.weights.evap);
      setNum("set_w_river", appSettings.drought.weights.river);
      setNum("set_w_humidity", appSettings.drought.weights.humidity);

      const elUseHybrid = $("set_useRiverHybridForIndex");
      if (elUseHybrid) elUseHybrid.checked = !!appSettings.drought.useRiverHybridForIndex;

      // Wick
      setNum("set_wick_windLow", appSettings.wick.windLow);
      setNum("set_wick_windHigh", appSettings.wick.windHigh);
      setNum("set_wick_rhHigh", appSettings.wick.rhHigh);
      setNum("set_wick_rhLow", appSettings.wick.rhLow);
      setNum("set_wick_vpdLow", appSettings.wick.vpdLow);
      setNum("set_wick_vpdHigh", appSettings.wick.vpdHigh);
      setNum("set_wick_lowRhThreshold", appSettings.wick.lowRhThreshold);
      setNum("set_wick_lowWindBumpMax", appSettings.wick.lowWindBumpMax);

  if (appSettings.riverAnalysis){
    const ra = appSettings.riverAnalysis;

    // Basics
    const sel = $("set_ra_defaultInterval");
    if (sel) sel.value = String(ra.defaultInterval || "hour");
    setNum("set_ra_windowDays", ra.windowDays);

    // Pairing tolerances
    setNum("set_ra_alignTolHours", ra.alignTolHours);
    setNum("set_ra_alignTolDays", ra.alignTolDays);

    // Rain context
    setNum("set_ra_rainCtxFastHours", ra.rainCtxFastHours);
    setNum("set_ra_rainCtxSlowHours", ra.rainCtxSlowHours);

    // Response window lists
    const elWh = $("set_ra_responseWindowsHourCsv");
    if (elWh) elWh.value = Array.isArray(ra.responseWindowsHour) ? ra.responseWindowsHour.join(", ") : "";
    const elWd = $("set_ra_responseWindowsDayCsv");
    if (elWd) elWd.value = Array.isArray(ra.responseWindowsDay) ? ra.responseWindowsDay.join(", ") : "";

    // Lag
    setNum("set_ra_lagMaxHours", ra.lagMaxHours);
    setNum("set_ra_lagMinPoints", ra.lagMinPoints);
    setNum("set_ra_lagMinCorrStrong", ra.lagMinCorrStrong);

    // Drain half-life thresholds
    setNum("set_ra_halfLifeFastHours", ra.halfLifeFastHours);
    setNum("set_ra_halfLifeSlowHours", ra.halfLifeSlowHours);

    // Knee detection
    setNum("set_ra_kneeSlopeMult", ra.kneeSlopeMult);
    setNum("set_ra_kneeMinSlope", ra.kneeMinSlope);
    setNum("set_ra_kneeBaselineFrac", ra.kneeBaselineFrac);
    setNum("set_ra_kneeConsecutive", ra.kneeConsecutive);
    setNum("set_ra_kneeSmoothWin", ra.kneeSmoothWin);
    setNum("set_ra_kneeMinPairs", ra.kneeMinPairs);
    const cb = $("set_ra_kneeFallbackEnabled");
    if (cb) cb.checked = !!ra.kneeFallbackEnabled;

    // Band thresholds
    setNum("set_ra_handlingHighScore", ra.handlingHighScore);
    setNum("set_ra_handlingLowScore", ra.handlingLowScore);
    setNum("set_ra_drainFastScore", ra.drainFastScore);
    setNum("set_ra_drainSlowScore", ra.drainSlowScore);
  }

      renderSoilWeightsTable();


      // Layout
      const lay = (appSettings && appSettings.layout) ? appSettings.layout : {};
      const elLayEnabled = $("set_layoutEnabled");
      if (elLayEnabled) elLayEnabled.checked = (lay.enabled !== false);
      const elLayRemember = $("set_layoutRememberActive");
      if (elLayRemember) elLayRemember.checked = (lay.rememberActiveTab !== false);

      // Default tab dropdown from current TAB_LAYOUT
      try{
        const sel = $("set_layoutDefaultTab");
        if (sel){
          sel.innerHTML = "";
          const layoutObj = (typeof TAB_LAYOUT !== "undefined" && TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT : loadTabLayout_();
          const tabs = (layoutObj && Array.isArray(layoutObj.tabs)) ? layoutObj.tabs : [];
          for (const t of tabs){
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = (t.title ? t.title : t.id) + " (" + t.id + ")";
            sel.appendChild(opt);
          }
          const desired = String(lay.defaultTabId || "tab_main");
          sel.value = tabs.some(t=> t.id === desired) ? desired : (tabs[0]?.id || "tab_main");
        }

        const boxLay = $("layoutJsonBox");
        if (boxLay){
          const layoutObj2 = (typeof TAB_LAYOUT !== "undefined" && TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT : loadTabLayout_();
          boxLay.value = JSON.stringify(layoutObj2, null, 2);
        }
      }catch(_e){}

      const box = $("settingsJsonBox");
      if (box) box.value = JSON.stringify(appSettings, null, 2);
    }

function readSettingsUiIntoObject(){
  // Ensure shape
  appSettings = ensureSettingsShape_(appSettings);
  const g = appSettings.general;
  const dash = appSettings.dash;

  // General
  const elProvidersOff = $("providersOff");
  if (elProvidersOff) g.providersOff = !!elProvidersOff.checked;

  const pd = getNum("set_defaultPastDays");
  const fd = getNum("set_defaultForecastDays");
  const snap = getNum("set_snapshotMinLookbackDays");
  if (pd != null) g.defaultPastDays = clamp(pd, 7, 92);
  if (fd != null) g.defaultForecastDays = clamp(fd, 3, 16);
  if (snap != null) g.snapshotMinLookbackDays = clamp(snap, 7, 120);

  // Dash
  const elPrefer = $("set_preferCacheWhenAvailable");
  const elAuto = $("set_autoRefreshOnLoad");
  const elFallback = $("set_providerFallbackWhenMissing");
  if (elPrefer) dash.preferCacheWhenAvailable = !!elPrefer.checked;
  if (elAuto) dash.autoRefreshOnLoad = !!elAuto.checked;
  if (elFallback) dash.providerFallbackWhenMissing = !!elFallback.checked;
  const mca = getNum("set_maxCacheAgeMinutes");
  dash.maxCacheAgeMinutes = (mca == null ? null : clamp(mca, 0, 525600));


  // Layout
  const lay = appSettings.layout;
  const elLayEnabled = $("set_layoutEnabled");
  const elLayRemember = $("set_layoutRememberActive");
  const elLayDefault = $("set_layoutDefaultTab");
  if (elLayEnabled) lay.enabled = !!elLayEnabled.checked;
  if (elLayRemember) lay.rememberActiveTab = !!elLayRemember.checked;
  if (elLayDefault && elLayDefault.value) lay.defaultTabId = String(elLayDefault.value);
  // Drought windows
  const win = appSettings.drought.windows;
  const w1 = getNum("set_win_rainPastDays"); if (w1 != null) win.rainPastDays = clamp(w1, 7, 30);
  const w2 = getNum("set_win_rhPastDays"); if (w2 != null) win.rhPastDays = clamp(w2, 3, 14);
  const w3 = getNum("set_win_et0ForecastDays"); if (w3 != null) win.et0ForecastDays = clamp(w3, 3, 16);
  const w4 = getNum("set_win_vpdForecastDays"); if (w4 != null) win.vpdForecastDays = clamp(w4, 3, 16);
  const w5 = getNum("set_win_soilBaselineDays"); if (w5 != null) win.soilBaselineDays = clamp(w5, 7, 60);

  // Thresholds
  const th = appSettings.drought.thresholds;
  const t = (id)=> getNum(id);
  const r14w = t("set_thr_rain14_wet"); if (r14w != null) th.rain14.wet = r14w;
  const r14d = t("set_thr_rain14_dry"); if (r14d != null) th.rain14.dry = r14d;
  const r7w = t("set_thr_rain7_wet"); if (r7w != null) th.rain7Forecast.wet = r7w;
  const r7d = t("set_thr_rain7_dry"); if (r7d != null) th.rain7Forecast.dry = r7d;
  const rhw = t("set_thr_rh7_wet"); if (rhw != null) th.rh7.wet = rhw;
  const rhd = t("set_thr_rh7_dry"); if (rhd != null) th.rh7.dry = rhd;
  const etl = t("set_thr_et07_low"); if (etl != null) th.et07.low = etl;
  const eth = t("set_thr_et07_high"); if (eth != null) th.et07.high = eth;
  const vpdl = t("set_thr_vpd_low"); if (vpdl != null) th.vpd.low = vpdl;
  const vpdh = t("set_thr_vpd_high"); if (vpdh != null) th.vpd.high = vpdh;

  // Weights
  const wts = appSettings.drought.weights;
  const ws = getNum("set_w_soil"); if (ws != null) wts.soil = clamp(ws, 0, 1);
  const wr = getNum("set_w_rain"); if (wr != null) wts.rain = clamp(wr, 0, 1);
  const we = getNum("set_w_evap"); if (we != null) wts.evap = clamp(we, 0, 1);
  const wri = getNum("set_w_river"); if (wri != null) wts.river = clamp(wri, 0, 1);
  const wh = getNum("set_w_humidity"); if (wh != null) wts.humidity = clamp(wh, 0, 1);

  const elUseHybrid = $("set_useRiverHybridForIndex");
  if (elUseHybrid) appSettings.drought.useRiverHybridForIndex = !!elUseHybrid.checked;

  // Wick
  const wk = appSettings.wick;
  const wl = getNum("set_wick_windLow"); if (wl != null) wk.windLow = wl;
  const whi = getNum("set_wick_windHigh"); if (whi != null) wk.windHigh = whi;
  const rhH = getNum("set_wick_rhHigh"); if (rhH != null) wk.rhHigh = rhH;
  const rhL = getNum("set_wick_rhLow"); if (rhL != null) wk.rhLow = rhL;
  const vL = getNum("set_wick_vpdLow"); if (vL != null) wk.vpdLow = vL;
  if (!appSettings.riverAnalysis || typeof appSettings.riverAnalysis !== "object") appSettings.riverAnalysis = {};
  const ra = appSettings.riverAnalysis;

  // Basics
  const di = $("set_ra_defaultInterval"); if (di) ra.defaultInterval = String(di.value || "hour");
  const wd = getNum("set_ra_windowDays"); if (wd != null) ra.windowDays = clamp(Math.round(wd), 3, 365);

  // Pairing tolerances
  const aH = getNum("set_ra_alignTolHours"); if (aH != null) ra.alignTolHours = clamp(aH, 0, 24);
  const aD = getNum("set_ra_alignTolDays");  if (aD != null) ra.alignTolDays  = clamp(aD, 0, 72);

  // Rain context
  const rcF = getNum("set_ra_rainCtxFastHours"); if (rcF != null) ra.rainCtxFastHours = clamp(Math.round(rcF), 1, 240);
  const rcS = getNum("set_ra_rainCtxSlowHours"); if (rcS != null) ra.rainCtxSlowHours = clamp(Math.round(rcS), 6, 720);

  // Response windows lists
  const elWh = $("set_ra_responseWindowsHourCsv");
  if (elWh){
    const list = parseCsvNumList(elWh.value, {min:1, max:1000, int:true});
    if (list) ra.responseWindowsHour = list;
  }
  const elWd = $("set_ra_responseWindowsDayCsv");
  if (elWd){
    const list = parseCsvNumList(elWd.value, {min:1, max:365, int:true});
    if (list) ra.responseWindowsDay = list;
  }

  // Lag search and quality thresholds
  const lm = getNum("set_ra_lagMaxHours"); if (lm != null) ra.lagMaxHours = clamp(Math.round(lm), 6, 240);
  const lmp = getNum("set_ra_lagMinPoints"); if (lmp != null) ra.lagMinPoints = clamp(Math.round(lmp), 3, 200);
  const lcs = getNum("set_ra_lagMinCorrStrong"); if (lcs != null) ra.lagMinCorrStrong = clamp(lcs, 0, 1);

  // Drain half-life thresholds
  const hf = getNum("set_ra_halfLifeFastHours"); if (hf != null) ra.halfLifeFastHours = clamp(Math.round(hf), 1, 240);
  const hs = getNum("set_ra_halfLifeSlowHours"); if (hs != null) ra.halfLifeSlowHours = clamp(Math.round(hs), 1, 480);

  // Knee detection
  const km = getNum("set_ra_kneeSlopeMult"); if (km != null) ra.kneeSlopeMult = clamp(km, 1, 20);
  const kmin = getNum("set_ra_kneeMinSlope"); if (kmin != null) ra.kneeMinSlope = clamp(kmin, 0, 1);
  const kbf = getNum("set_ra_kneeBaselineFrac"); if (kbf != null) ra.kneeBaselineFrac = clamp(kbf, 0, 1);
  const kc = getNum("set_ra_kneeConsecutive"); if (kc != null) ra.kneeConsecutive = clamp(Math.round(kc), 1, 20);
  const ksw = getNum("set_ra_kneeSmoothWin"); if (ksw != null) ra.kneeSmoothWin = clamp(Math.round(ksw), 1, 25);
  const kmp2 = getNum("set_ra_kneeMinPairs"); if (kmp2 != null) ra.kneeMinPairs = clamp(Math.round(kmp2), 5, 500);
  const kfe = $("set_ra_kneeFallbackEnabled"); if (kfe) ra.kneeFallbackEnabled = !!kfe.checked;

  // Band thresholds
  const hh = getNum("set_ra_handlingHighScore"); if (hh != null) ra.handlingHighScore = clamp(hh, 0, 1);
  const hl = getNum("set_ra_handlingLowScore");  if (hl != null) ra.handlingLowScore  = clamp(hl, 0, 1);
  const df = getNum("set_ra_drainFastScore");     if (df != null) ra.drainFastScore     = clamp(df, 0, 1);
  const ds = getNum("set_ra_drainSlowScore");     if (ds != null) ra.drainSlowScore     = clamp(ds, 0, 1);

  const vH = getNum("set_wick_vpdHigh"); if (vH != null) wk.vpdHigh = vH;
  const lrt = getNum("set_wick_lowRhThreshold"); if (lrt != null) wk.lowRhThreshold = lrt;
  const lbm = getNum("set_wick_lowWindBumpMax"); if (lbm != null) wk.lowWindBumpMax = clamp(lbm, 0, 0.35);

  // Make sure wick ranges are sane
  if (wk.windHigh <= wk.windLow) wk.windHigh = wk.windLow + 0.1;
  if (wk.rhHigh <= wk.rhLow) wk.rhHigh = wk.rhLow + 0.1;
  if (wk.vpdHigh <= wk.vpdLow) wk.vpdHigh = wk.vpdLow + 0.01;



  // Sync JSON box
  const box = $("settingsJsonBox");
  if (box) box.value = JSON.stringify(appSettings, null, 2);
}

    function resetSettings(){
      appSettings = getDefaultSettings();
      renderSettingsUi();
    }

    function exportSettingsToBox(){
      const box = $("settingsJsonBox");
      if (box) box.value = JSON.stringify(appSettings, null, 2);
    }

    function downloadSettingsJson(){
      const blob = new Blob([JSON.stringify(appSettings, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "far_north_drought_settings_" + (new Date().toISOString().replace(/[:.]/g,"-")) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 250);
    }

    function importSettingsFromText(text){
      try{
        const parsed = JSON.parse(text);
        appSettings = deepMerge(getDefaultSettings(), parsed);
        renderSettingsUi();
        showToast("Settings imported");
      }catch(e){
        showToast("Import failed: invalid JSON");
      }
    }

    
    function exportLayoutToBox(){
      const box = $("layoutJsonBox");
      if (!box) return;
      const obj = (typeof TAB_LAYOUT !== "undefined" && TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT : loadTabLayout_();
      box.value = JSON.stringify(obj, null, 2);
    }

    function downloadLayoutJson(){
      try{
        const obj = (typeof TAB_LAYOUT !== "undefined" && TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT : loadTabLayout_();
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "far_north_drought_layout_" + (new Date().toISOString().replace(/[:.]/g,"-")) + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 250);
      }catch(e){
        showToast("Layout export failed");
      }
    }

    function importLayoutFromText(text){
      try{
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.tabs) || !parsed.tabs.length) throw new Error("bad");
        // Minimal validation and normalization
        if (!parsed.version) parsed.version = 1;
        if (!parsed.activeTabId) parsed.activeTabId = parsed.tabs[0].id;
        TAB_LAYOUT = parsed;
        saveTabLayout_();
        // Re-render UI
        if (typeof renderTabBar_ === "function") renderTabBar_();
        if (typeof populateAddDropdown_ === "function") populateAddDropdown_();
        if (typeof renderTabEditorList_ === "function") renderTabEditorList_();
        if (typeof applyTabLayout_ === "function") applyTabLayout_();
        exportLayoutToBox();
        showToast("Layout imported");
      }catch(e){
        showToast("Layout import failed: invalid JSON");
      }
    }

    function resetLayoutToDefault_(){
      try{
        localStorage.removeItem(TAB_LAYOUT_KEY);
        TAB_LAYOUT = loadTabLayout_();
        if (typeof renderTabBar_ === "function") renderTabBar_();
        if (typeof populateAddDropdown_ === "function") populateAddDropdown_();
        if (typeof renderTabEditorList_ === "function") renderTabEditorList_();
        if (typeof applyTabLayout_ === "function") applyTabLayout_();
        exportLayoutToBox();
        showToast("Layout reset");
      }catch(e){
        showToast("Layout reset failed");
      }
    }

    function copyLayoutJsonToClipboard_(){
      const box = $("layoutJsonBox");
      if (!box) return;
      try{
        box.select();
        document.execCommand("copy");
        showToast("Layout JSON copied");
      }catch(e){
        try{
          navigator.clipboard.writeText(box.value || "");
          showToast("Layout JSON copied");
        }catch(_e){
          showToast("Copy failed");
        }
      }
    }

    function applyLayoutSettingsToRuntime_(){
      try{
        ensureSettingsShape_();
        const lay = appSettings.layout || {};
        const enabled = (lay.enabled !== false);
        const host = document.getElementById("tabsBar");
        if (host) host.style.display = enabled ? "" : "none";

        if (!enabled){
          // Show all modules and submodules and exit edit mode
          TAB_EDIT_MODE = false;
          try{ document.documentElement.setAttribute("data-tab-edit-mode", "0"); }catch(_e){}
          const editBar = document.getElementById("tabEditBar");
          const btnAddTab = document.getElementById("btnTabAdd");
          const btnEdit = document.getElementById("btnTabEdit");
          if (editBar) editBar.style.display = "none";
          if (btnAddTab) btnAddTab.style.display = "none";
          if (btnEdit) btnEdit.textContent = "Edit Layout";
          // Show everything
          for (const [mid, mod] of Object.entries(TAB_REGISTRY.modules)){
            const el = document.getElementById(mod.containerId);
            if (el) el.style.display = "";
          }
          for (const [sid, sm] of Object.entries(TAB_REGISTRY.submodules)){
            for (const nid of (sm.nodes || [])){
              const el = document.getElementById(nid);
              if (el) el.style.display = "";
            }
          }
          return;
        }

        // Ensure tab system is initialised
        initTabSystem();

        // If remember is off, use default tab for this session
        const remember = (lay.rememberActiveTab !== false);
        const defId = String(lay.defaultTabId || "tab_main");
        if (!remember){
          const exists = (TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT.tabs.some(t=> t.id === defId) : false;
          TAB_LAYOUT.activeTabId = exists ? defId : (TAB_LAYOUT.tabs[0]?.id || defId);
        }else{
          // If saved active tab is missing, fall back to default
          const exists = (TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT.tabs.some(t=> t.id === TAB_LAYOUT.activeTabId) : false;
          if (!exists){
            const ok = (TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)) ? TAB_LAYOUT.tabs.some(t=> t.id === defId) : false;
            TAB_LAYOUT.activeTabId = ok ? defId : (TAB_LAYOUT.tabs[0]?.id || defId);
            saveTabLayout_();
          }
        }

        renderTabBar_();
        populateAddDropdown_();
        renderTabEditorList_();
        applyTabLayout_();
      }catch(e){
        console.warn("applyLayoutSettingsToRuntime_ failed:", e);
      }
    }

function wireSettingsUi(){
      const tabRow = $("settingsTabRow");
      if (tabRow){
        tabRow.addEventListener("click", (e)=>{
          const btn = e.target.closest(".tabBtn");
          if (!btn) return;
          const tab = btn.getAttribute("data-tab");
          if (tab === "layout") { try{ exportLayoutToBox(); }catch(_e){} }
          for (const b of tabRow.querySelectorAll(".tabBtn")) b.classList.toggle("active", b === btn);
          for (const p of ["general","drought","soil","wick","river","layout","advanced"]){
            const el = $("tab_" + p);
            if (el) el.classList.toggle("active", p === tab);
          }
        });
      }
      const btnSettingsApply = $("btnSettingsApply");
      if (btnSettingsApply) btnSettingsApply.addEventListener("click", async ()=>{
        readSettingsUiIntoObject();
        saveSettings();
        applySettingsToRuntime();
        showToast("Settings applied");
        try{
          if (typeof precomputeRiverHybridForIndexIfEnabled_ === "function"){
            await precomputeRiverHybridForIndexIfEnabled_();
          }
        }catch(e){}
        try{ recomputeFromCache(); }catch(e){}
      });
      const btnSettingsReset = $("btnSettingsReset");
      if (btnSettingsReset) btnSettingsReset.addEventListener("click", async ()=>{
        resetSettings();
        saveSettings();
        applySettingsToRuntime();
        showToast("Settings reset");
        try{
          if (typeof precomputeRiverHybridForIndexIfEnabled_ === "function"){
            await precomputeRiverHybridForIndexIfEnabled_();
          }
        }catch(e){}
        try{ recomputeFromCache(); }catch(e){}
      });
      const btnSettingsExport = $("btnSettingsExport");
      if (btnSettingsExport) btnSettingsExport.addEventListener("click", ()=>{
        readSettingsUiIntoObject();
        saveSettings();
        exportSettingsToBox();
        downloadSettingsJson();
        showToast("Settings exported");
      });
      const btnSettingsImport = $("btnSettingsImport");
      if (btnSettingsImport) btnSettingsImport.addEventListener("click", ()=>{
        const box = $("settingsJsonBox");
        const file = $("fileSettingsImport");
        const txt = (box && box.value ? box.value.trim() : "");
        const current = JSON.stringify(appSettings, null, 2).trim();
        // If the JSON box differs from current settings, import from it. Otherwise open file picker.
        if (txt && txt !== current){
          importSettingsFromText(txt);
          saveSettings();
          applySettingsToRuntime();
          try{ recomputeFromCache(); }catch(err){}
          return;
        }
        if (file) file.click();
        else showToast("Import failed: file input missing");
      });
      const fileSettingsImport = $("fileSettingsImport");
      if (fileSettingsImport) fileSettingsImport.addEventListener("change", async (e)=>{
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const text = await f.text();
        importSettingsFromText(text);
        saveSettings();
        applySettingsToRuntime();
        try{ recomputeFromCache(); }catch(err){}
        e.target.value = "";
      });

      const btnCloseSettings = $("btnCloseSettings");
      if (btnCloseSettings) btnCloseSettings.addEventListener("click", closeSettingsModal);

      // Keep providersOff in sync
      const providersOffEl = $("providersOff");
      if (providersOffEl) providersOffEl.addEventListener("change", ()=>{
        appSettings.general.providersOff = !!providersOffEl.checked;
        saveSettings();
      });
    }



    

/***********************
     * Debug And Tests
     ***********************/
    const DEBUG_BUILD_LABEL = "v13.15 Debug Tests";
    const dbg = (window.__DBG__ = window.__DBG__ || {
      build: DEBUG_BUILD_LABEL,
      createdAt: new Date().toISOString(),
      events: [],
      errors: [],
      actions: [],
      wired: false
    });

    function dbgPush(kind, msg, data){
      try{
        const entry = { t: new Date().toISOString(), kind, msg, data: data === undefined ? null : data };
        dbg.events.push(entry);
        if (dbg.events.length > 200) dbg.events.splice(0, dbg.events.length - 200);
        if (kind === "error"){
          dbg.errors.push(entry);
          if (dbg.errors.length > 200) dbg.errors.splice(0, dbg.errors.length - 200);
        }
      }catch(e){}
    }

    window.addEventListener("error", (e)=>{
      const msg = (e && e.message) ? e.message : "Window error";
      const where = (e && e.filename) ? (e.filename + ":" + (e.lineno||0) + ":" + (e.colno||0)) : "";
      dbgPush("error", msg, { where, stack: e && e.error && e.error.stack ? String(e.error.stack) : null });
      try{ updateDebugBoxes(); }catch(err){}
    });

    window.addEventListener("unhandledrejection", (e)=>{
      const r = e && e.reason ? e.reason : "Unhandled rejection";
      dbgPush("error", "Unhandled promise rejection", { reason: String(r), stack: r && r.stack ? String(r.stack) : null });
      try{ updateDebugBoxes(); }catch(err){}
    });

    function openDebugModal(){
      const back = $("debugModalBack");
      if (!back) return;
      back.style.display = "flex";
      renderDebugUi();
      updateDebugBoxes();
      updateDebugReportBox();
    }

    function closeDebugModal(){
      const back = $("debugModalBack");
      if (!back) return;
      back.style.display = "none";
    }

    function showDebugTab(tab){
      const tabRow = $("debugTabRow");
      if (tabRow){
        for (const b of tabRow.querySelectorAll(".tabBtn")){
          b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        }
      }
      const panels = {
        runtime: $("tab_debug_runtime"),
        actions: $("tab_debug_actions"),
        tests: $("tab_debug_tests"),
        logs: $("tab_debug_logs")
      };
      for (const k of Object.keys(panels)){
        const el = panels[k];
        if (el) el.classList.toggle("active", k === tab);
      }
    }

    function buildDebugReport(){
      const safeISO = (d)=>{
        try{ return (d instanceof Date && !isNaN(d.getTime())) ? d.toISOString() : (d ? String(d) : null); }catch(e){ return null; }
      };

      const report = {
        generatedAt: new Date().toISOString(),
        build: DEBUG_BUILD_LABEL,
        time: {
          timeMode: (typeof timeMode !== "undefined") ? timeMode : null,
          historicUseRange: (typeof historicUseRange !== "undefined") ? historicUseRange : null,
          asOfSnapshot: (typeof asOfSnapshot !== "undefined") ? safeISO(asOfSnapshot) : null,
          rangeFrom: (typeof rangeFrom !== "undefined") ? safeISO(rangeFrom) : null,
          rangeTo: (typeof rangeTo !== "undefined") ? safeISO(rangeTo) : null,
          playbackCursor: (typeof playbackCursor !== "undefined") ? safeISO(playbackCursor) : null
        },
        selection: {
          selectedLocationId: (typeof selectedLocationId !== "undefined") ? selectedLocationId : null
        },
        settings: {
          providersOff: (typeof appSettings !== "undefined" && appSettings && appSettings.general) ? !!appSettings.general.providersOff : null,
          providerFallbackWhenMissing: (typeof appSettings !== "undefined" && appSettings && appSettings.general) ? !!appSettings.general.providerFallbackWhenMissing : null
        },
        cache: {
          loadedAt: (typeof dataCache !== "undefined" && dataCache && dataCache.loadedAt) ? safeISO(dataCache.loadedAt) : null,
          rangeMin: (typeof dataCache !== "undefined" && dataCache && dataCache.rangeMin) ? safeISO(dataCache.rangeMin) : null,
          rangeMax: (typeof dataCache !== "undefined" && dataCache && dataCache.rangeMax) ? safeISO(dataCache.rangeMax) : null,
          wxList: (typeof dataCache !== "undefined" && dataCache && Array.isArray(dataCache.wxList)) ? dataCache.wxList.length : null,
          floodList: (typeof dataCache !== "undefined" && dataCache && Array.isArray(dataCache.floodList)) ? dataCache.floodList.length : null,
          riverSites: (typeof dataCache !== "undefined" && dataCache && dataCache.riverSites) ? Object.keys(dataCache.riverSites).length : null,
          gwSites: (typeof dataCache !== "undefined" && dataCache && dataCache.gwSites) ? Object.keys(dataCache.gwSites).length : null
        },
        ui: {
          districtEnvMetric: (function(){ const el = document.getElementById("districtEnvMetric"); return el ? el.value : null; })(),
          districtHydroTrendStep: (function(){ const el = document.getElementById("districtHydroTrendStep"); return el ? el.value : null; })(),
          districtHydroReadingsStep: (function(){ const el = document.getElementById("districtHydroReadingsStep"); return el ? el.value : null; })()
        },
        debug: {
          createdAt: dbg.createdAt,
          lastActions: dbg.actions.slice(-25),
          recentErrors: dbg.errors.slice(-25),
          recentEvents: dbg.events.slice(-25)
        }
      };

      return report;
    }

    function writeBox(id, text){
      const el = $(id);
      if (!el) return;
      el.value = String(text || "");
    }

    function updateDebugBoxes(){
      try{
        const errLines = dbg.errors.slice(-30).map(e=>`[${e.t}] ${e.msg}${e.data && e.data.where ? " ("+e.data.where+")" : ""}`).join("\n");
        const evLines = dbg.events.slice(-50).map(e=>`[${e.t}] ${e.kind}: ${e.msg}`).join("\n");
        writeBox("debugErrorBox", errLines || "(none)");
        writeBox("debugEventBox", evLines || "(none)");
      }catch(e){}
    }

    function updateDebugReportBox(){
      const box = $("debugReportBox");
      const summary = $("debugQuickSummary");
      if (!box) return;
      const report = buildDebugReport();
      const json = JSON.stringify(report, null, 2);
      box.value = json;
      if (summary){
        const parts = [];
        parts.push(`Build: ${DEBUG_BUILD_LABEL}`);
        parts.push(`Mode: ${report.time.timeMode}`);
        if (report.time.timeMode === "historic"){
          parts.push(`As Of: ${report.time.asOfSnapshot || "(none)"}`);
          parts.push(`Range Mode: ${report.time.historicUseRange ? "on" : "off"}`);
        }
        parts.push(`WX: ${report.cache.wxList ?? "-"}`);
        parts.push(`Rivers: ${report.cache.riverSites ?? "-"}`);
        parts.push(`Groundwater: ${report.cache.gwSites ?? "-"}`);
        parts.push(`Errors: ${report.debug.recentErrors.length}`);
        summary.textContent = parts.join(" | ");
      }
    }

    function dbgAction(msg, data){
      try{
        const entry = { t: new Date().toISOString(), msg, data: data === undefined ? null : data };
        dbg.actions.push(entry);
        if (dbg.actions.length > 200) dbg.actions.splice(0, dbg.actions.length - 200);
        dbgPush("event", "Action: " + msg, data);
      }catch(e){}
      try{ updateDebugBoxes(); }catch(e){}
    }

    function safeCall(label, fn){
      try{
        dbgAction(label);
        appendActionOutput("Running: " + label);
        const r = fn();
        appendActionOutput("OK: " + label);
        return r;
      }catch(e){
        const msg = (e && e.message) ? e.message : String(e);
        appendActionOutput("FAILED: " + label + " | " + msg);
        dbgPush("error", label + " failed", { where: label, message: msg, stack: e && e.stack ? String(e.stack) : msg });
        try{ showToast(label + " failed"); }catch(err){}
        try{ updateDebugBoxes(); }catch(err){}
        return null;
      }
    }

function appendActionOutput(line){
      const box = $("debugActionOut") || $("debugActionBox");
      if (!box) return;
      box.value = (box.value ? (box.value + "\n") : "") + String(line);
      box.scrollTop = box.scrollHeight;
    }

    function clearActionOutput(){
      const box = $("debugActionOut") || $("debugActionBox");
      if (box) box.value = "";
    }

    function renderTestResults(results){
      const box = $("debugTestsOut");
      const list = $("debugTestList");

      // Preferred: textarea output
      if (box){
        const lines = [];
        for (const r of (results || [])){
          const badge = (r.status || "pass").toUpperCase();
          const ms = (r.ms != null && isFinite(r.ms)) ? (Math.round(r.ms) + "ms") : "";
          const detail = r.detail ? (" | " + r.detail) : "";
          lines.push(`[${badge}] ${r.name}${ms ? " (" + ms + ")" : ""}${detail}`);
        }
        box.value = lines.length ? lines.join("\n") : "(no tests)";
        box.scrollTop = box.scrollHeight;
        return;
      }

      // Fallback: div list output
      if (!list) return;
      list.innerHTML = "";
      for (const r of (results || [])){
        const row = document.createElement("div");
        row.className = "testItem";

        const left = document.createElement("div");
        left.textContent = r.name;

        const right = document.createElement("div");
        const badgeEl = document.createElement("span");
        badgeEl.className = "badge " + (r.status === "pass" ? "badgePass" : (r.status === "fail" ? "badgeFail" : "badgeSkip"));
        badgeEl.textContent = (r.status || "pass").toUpperCase();
        right.appendChild(badgeEl);

        const meta = document.createElement("span");
        meta.style.marginLeft = "10px";
        meta.className = "muted";
        meta.textContent = `${Math.round(r.ms)}ms${r.detail ? " | " + r.detail : ""}`;
        right.appendChild(meta);

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      }
      list.scrollTop = list.scrollHeight;
    }

function runTests(kind){
      try{
        const box = $("debugTestsOut");
        if (box) box.value = "";
        const list = $("debugTestList");
        if (list) list.innerHTML = "";
      }catch(e){}
      const suites = {
        smoke: [
          { name: "Core DOM Present", run: ()=>{
              const miss = [];
              const okMap = !!document.getElementById("map");
              if (!okMap) miss.push("map");
              const okDetails = !!document.getElementById("locationDetails") || !!document.getElementById("detailPanel");
              if (!okDetails) miss.push("locationDetails/detailPanel");
              if (okMap && okDetails) return true;
              return { ok:false, msg: "Missing DOM: " + miss.join(", ") };
            }
          },
          { name: "Core Functions Present", run: ()=> typeof refresh === "function" && typeof recomputeFromCache === "function" },
          { name: "Settings Functions Present", run: ()=> typeof openSettingsModal === "function" && typeof closeSettingsModal === "function" },
          { name: "Hydro Bucketing Helpers Present", run: ()=> typeof dailyMeanFromSeries === "function" && typeof hourlyMeanFromSeries === "function" }
        ],
        regression: [
          { name: "Daily Mean From Series Aggregates", run: ()=>{
              if (typeof dailyMeanFromSeries !== "function") return { skip: true, msg: "missing dailyMeanFromSeries" };
              if (typeof ymdLocal !== "function") return { skip: true, msg: "missing ymdLocal" };
              const base = new Date(2026,0,1,10,0,0);
              const series = { times: [base.toISOString(), new Date(2026,0,1,11,0,0).toISOString(), new Date(2026,0,2,10,0,0).toISOString()], values: [10, 30, 20] };
              const m = dailyMeanFromSeries(series);
              const a = m.get(ymdLocal(base));
              return (m.size >= 2 && a != null && Math.abs(a - 20) < 0.0001);
            }
          },
          { name: "Hourly Mean From Series Aggregates", run: ()=>{
              if (typeof hourlyMeanFromSeries !== "function") return { skip: true, msg: "missing hourlyMeanFromSeries" };
              if (typeof ymdhLocal !== "function") return { skip: true, msg: "missing ymdhLocal" };
              const d1 = new Date(2026,0,1,10,5,0);
              const d2 = new Date(2026,0,1,10,55,0);
              const d3 = new Date(2026,0,1,11,5,0);
              const series = { times: [d1.toISOString(), d2.toISOString(), d3.toISOString()], values: [1, 3, 10] };
              const m = hourlyMeanFromSeries(series);
              const key = ymdhLocal(d1);
              const v = m.get(key);
              return (m.size >= 2 && v != null && Math.abs(v - 2) < 0.0001);
            }
          },
          { name: "Normalise Stress Produces 0..100", run: ()=>{
              if (typeof normaliseStressFromDailyMap !== "function") return { skip: true, msg: "missing normaliseStressFromDailyMap" };
              const mm = new Map([ ["2026-01-01", 10], ["2026-01-02", 20], ["2026-01-03", 30] ]);
              const out = normaliseStressFromDailyMap(mm);
              const vals = Array.from(out.stress.values()).filter(v=>v!=null);
              return vals.length === 3 && Math.min(...vals) >= 0 && Math.max(...vals) <= 100;
            }
          },
          { name: "District Hydro Trend Render Does Not Throw", run: ()=>{
              if (typeof renderDistrictHydroTrendCharts !== "function") return { skip: true, msg: "missing renderDistrictHydroTrendCharts" };
              try{ renderDistrictHydroTrendCharts(); }catch(e){ return { ok:false, msg: String(e && e.message ? e.message : e) }; }
              return true;
            }
          },
          { name: "District Hydro Readings Render Does Not Throw", run: ()=>{
              if (typeof renderDistrictHydroReadingsChart !== "function") return { skip: true, msg: "missing renderDistrictHydroReadingsChart" };
              try{ renderDistrictHydroReadingsChart(); }catch(e){ return { ok:false, msg: String(e && e.message ? e.message : e) }; }
              return true;
            }
          }
        ]
      };

      const tests = suites[kind] || [];
      const results = [];
      for (const t of tests){
        const started = performance.now();
        let status = "pass";
        let detail = "";
        try{
          const r = t.run();
          if (r && typeof r === "object" && r.skip){
            status = "skip";
            detail = r.msg || "";
          }else if (r && typeof r === "object" && r.ok === false){
            status = "fail";
            detail = r.msg || "";
          }else if (!r){
            status = "fail";
          }
        }catch(e){
          status = "fail";
          detail = e && e.message ? e.message : String(e);
          dbgPush("error", "Test failed: " + t.name, { stack: e && e.stack ? String(e.stack) : detail });
        }
        const ms = performance.now() - started;
        results.push({ name: t.name, status, detail, ms });
      }

      renderTestResults(results);
      try{ updateDebugBoxes(); }catch(e){}
      return results;
    }

    function renderDebugUi(){
      const tabRow = $("debugTabRow");
      if (tabRow && !tabRow._hooked){
        tabRow._hooked = true;
        tabRow.addEventListener("click", (e)=>{
          const btn = e.target.closest(".tabBtn");
          if (!btn) return;
          const tab = btn.getAttribute("data-tab");
          if (tab === "layout") { try{ exportLayoutToBox(); }catch(_e){} }
          showDebugTab(tab);
        });
      }
    }

    function wireDebugUi(){
      if (dbg.wired) return;
      dbg.wired = true;

      const btnClose = $("btnCloseDebug");
      if (btnClose) btnClose.addEventListener("click", closeDebugModal);

      const btnRefreshReport = $("btnDebugRefreshReport");
      if (btnRefreshReport) btnRefreshReport.addEventListener("click", ()=>{ updateDebugReportBox(); updateDebugBoxes(); });

      const btnCopy = $("btnDebugCopyReport");
      if (btnCopy) btnCopy.addEventListener("click", async ()=>{
        const box = $("debugReportBox");
        const txt = box ? box.value : JSON.stringify(buildDebugReport(), null, 2);
        try{
          if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(txt);
            showToast("Debug report copied");
          }else{
            if (box){ box.focus(); box.select(); document.execCommand("copy"); }
            showToast("Debug report copied");
          }
        }catch(e){
          showToast("Copy failed");
        }
      });

      const btnDl = $("btnDebugDownloadReport");
      if (btnDl) btnDl.addEventListener("click", ()=>{
        const report = buildDebugReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "far_north_drought_debug_report_" + (new Date().toISOString().replace(/[:.]/g,"-")) + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 250);
        showToast("Debug report downloaded");
      });

      const btnRefresh = $("btnDbgRefresh");
      if (btnRefresh) btnRefresh.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Running: Refresh");
        safeCall("Refresh", ()=> refresh());
        updateDebugReportBox();
      });

      const btnRecompute = $("btnDbgRecompute");
      if (btnRecompute) btnRecompute.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Running: Recompute From Cache");
        safeCall("Recompute From Cache", ()=> recomputeFromCache());
        updateDebugReportBox();
      });

      const btnReRenderTrends = $("btnDbgReRenderTrends");
      if (btnReRenderTrends) btnReRenderTrends.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Running: Rebuild District Trends");
        safeCall("Rebuild District Trends", ()=>{ try{ districtEnvTrend.key = null; }catch(e){}; try{ scheduleDistrictTrendBuild(); }catch(e){}; try{ renderDistrictHydroTrendCharts(); }catch(e){}; });
        updateDebugReportBox();
      });

      const btnOpenSettings = $("btnDbgOpenSettings");
      if (btnOpenSettings) btnOpenSettings.addEventListener("click", ()=> safeCall("Open Settings", ()=> openSettingsModal()));

      const btnClearProvider = $("btnDbgClearProviderCache");
      if (btnClearProvider) btnClearProvider.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Clearing provider JSON cache");
        safeCall("Clear Provider Json Cache", ()=> clearProviderJsonCache());
        showToast("Provider cache cleared");
        updateDebugReportBox();
      });

      const btnClearHistory = $("btnDbgClearHistoryCache");
      if (btnClearHistory) btnClearHistory.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Clearing history caches");
        safeCall("Clear History Caches", ()=> clearHistoryCaches());
        showToast("History caches cleared");
        updateDebugReportBox();
      });

      const btnResetSettings = $("btnDbgResetSettings");
      if (btnResetSettings) btnResetSettings.addEventListener("click", ()=>{
        clearActionOutput();
        appendActionOutput("Resetting settings");
        safeCall("Reset Settings", ()=>{ resetSettings(); saveSettings(); applySettingsToRuntime(); renderSettingsUi(); });
        showToast("Settings reset");
        updateDebugReportBox();
      });

      const btnSmoke = $("btnDbgRunSmoke");
      if (btnSmoke) btnSmoke.addEventListener("click", ()=>{ clearActionOutput(); appendActionOutput("Running: Smoke Tests"); dbgAction("Run Smoke Tests"); showDebugTab("tests"); runTests("smoke"); updateDebugReportBox(); });

      const btnReg = $("btnDbgRunRegression");
      if (btnReg) btnReg.addEventListener("click", ()=>{ clearActionOutput(); appendActionOutput("Running: Regression Suite"); dbgAction("Run Regression Suite"); showDebugTab("tests"); runTests("regression"); updateDebugReportBox(); });

      const btnClearTests = $("btnDbgClearTests");
      if (btnClearTests) btnClearTests.addEventListener("click", ()=>{ const list = $("debugTestList"); if (list) list.innerHTML = ""; });
    }



/* ---- Location Index Trend (7 Day Trend, Hourly or Daily) ---- */
const STORAGE_KEY_LOC_INDEX_TREND_STEP = "fndi_loc_index_trend_step_v1";
const STORAGE_KEY_LOC_INDEX_TREND_LOCS = "fndi_loc_index_trend_locids_v1";
const LOC_INDEX_TREND_MAX_LOCS = 15;

const locIndexTrend = {
  key: null,
  locIds: [],
  step: "day",
  times: [],
  series: [], // [{ locId, values:[], color }]
  building: null,
  defaultMeta: null
};

const locIndexTrendHover = { idx: null, active: false };

function parseStoredLocIndexTrendLocIds_(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOC_INDEX_TREND_LOCS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(x => String(x || "").trim()).filter(Boolean);
  } catch(_e){
    return [];
  }
}

function saveStoredLocIndexTrendLocIds_(ids){
  try { localStorage.setItem(STORAGE_KEY_LOC_INDEX_TREND_LOCS, JSON.stringify(ids || [])); } catch(_e) {}
}

function normalizeLocIndexTrendLocIds_(ids){
  const seen = new Set();
  const out = [];
  for (const id of (ids || [])){
    const s = String(id || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= LOC_INDEX_TREND_MAX_LOCS) break;
  }

  if (Array.isArray(locations) && locations.length){
    const valid = new Set(locations.map(l => String(l.id)));
    return out.filter(x => valid.has(String(x))).slice(0, LOC_INDEX_TREND_MAX_LOCS);
  }

  return out.slice(0, LOC_INDEX_TREND_MAX_LOCS);
}

function getOrInitLocIndexTrendLocIds_(){
  if (Array.isArray(locIndexTrend.locIds) && locIndexTrend.locIds.length) return locIndexTrend.locIds;
  const stored = normalizeLocIndexTrendLocIds_(parseStoredLocIndexTrendLocIds_());
  locIndexTrend.locIds = stored;
  return stored;
}

function locIndexTrendColorForIndex_(i){
  const h = (i * 47) % 360;
  return `hsl(${h} 75% 55%)`;
}

function populateLocIndexTrendLocationSelect(sel){
  if (!sel) return;
  sel.innerHTML = "";
  if (!Array.isArray(locations) || !locations.length){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No locations loaded";
    sel.append(opt);
    return;
  }
  for (const loc of locations){
    const opt = document.createElement("option");
    opt.value = loc.id;
    opt.textContent = loc.name;
    sel.append(opt);
  }
}

function getLocIndexTrendPickerLocationId_(){
  const sel = document.getElementById("locIndexTrendLocation");
  let id = sel ? String(sel.value || "") : "";

  if (!id && typeof selectedId !== "undefined" && selectedId) id = String(selectedId);
  if ((!id || id === "undefined") && Array.isArray(locations) && locations.length) id = String(locations[0].id);

  if (sel){
    if (!sel._populated){
      populateLocIndexTrendLocationSelect(sel);
      sel._populated = true;
    }
    if (id && sel.value !== id){
      try { sel.value = id; } catch(_e) {}
    }
  }
  return id || null;
}

function renderLocIndexTrendLegend(){
  const wrap = document.getElementById("locIndexTrendLegend");
  if (!wrap) return;

  const ids = normalizeLocIndexTrendLocIds_(locIndexTrend.locIds || []);
  wrap.innerHTML = "";

  if (!ids.length){
    const span = document.createElement("span");
    span.className = "tiny muted";
    span.textContent = "Add locations to compare";
    wrap.append(span);
    return;
  }

  ids.forEach((id, idx)=>{
    const loc = Array.isArray(locations) ? locations.find(l => String(l.id) === String(id)) : null;
    const name = loc ? loc.name : String(id);

    const tag = document.createElement("span");
    tag.className = "tag";

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = locIndexTrendColorForIndex_(idx);

    const label = document.createElement("span");
    label.className = "mono";
    label.textContent = name;

    const btn = document.createElement("button");
    btn.className = "btn small";
    btn.title = "Remove from chart";
    btn.textContent = "×";
    btn.style.marginLeft = "8px";
    btn.addEventListener("click", ()=> removeLocIndexTrendLocation(id));

    tag.append(dot, label, btn);
    wrap.append(tag);
  });
}

function addLocIndexTrendLocation(id){
  if (!id) return;
  const next = normalizeLocIndexTrendLocIds_([...(locIndexTrend.locIds || []), String(id)]);
  locIndexTrend.locIds = next;
  saveStoredLocIndexTrendLocIds_(next);
  renderLocIndexTrendLegend();
  locIndexTrend.key = null;
  ensureLocIndexTrendComputed(true).then(()=> renderLocIndexTrendChart());
}

function removeLocIndexTrendLocation(id){
  const next = normalizeLocIndexTrendLocIds_((locIndexTrend.locIds || []).filter(x => String(x) !== String(id)));
  locIndexTrend.locIds = next;
  saveStoredLocIndexTrendLocIds_(next);
  renderLocIndexTrendLegend();
  locIndexTrend.key = null;
  ensureLocIndexTrendComputed(true).then(()=> renderLocIndexTrendChart());
}

function clearLocIndexTrendLocations(){
  locIndexTrend.locIds = [];
  saveStoredLocIndexTrendLocIds_([]);
  renderLocIndexTrendLegend();
  locIndexTrend.key = null;
  ensureLocIndexTrendComputed(true).then(()=> renderLocIndexTrendChart());
}

function getVisibleLocationIdsFromLocationsTable_(){
  try {
    const rows = Array.from(document.querySelectorAll("#tbody tr"));
    const ids = [];
    for (const tr of rows){
      const id = tr && tr.dataset ? tr.dataset.id : "";
      if (!id) continue;
      const cs = window.getComputedStyle(tr);
      if (cs && (cs.display === "none" || cs.visibility === "hidden")) continue;
      if (typeof tr.getClientRects === "function" && tr.getClientRects().length === 0) continue;
      ids.push(id);
    }
    return ids;
  } catch(_e){
    return [];
  }
}

function selectAllVisibleLocIndexTrendLocations(){
  const ids = getVisibleLocationIdsFromLocationsTable_();
  if (!ids.length) return;
  locIndexTrend.locIds = normalizeLocIndexTrendLocIds_(ids);
  saveStoredLocIndexTrendLocIds_(locIndexTrend.locIds);
  renderLocIndexTrendLegend();
  locIndexTrend.key = null;
  ensureLocIndexTrendComputed(true).then(()=> renderLocIndexTrendChart());
}

function getSelectedLocIndexTrendStep(){
  const sel = document.getElementById("locIndexTrendStep");
  const saved = localStorage.getItem(STORAGE_KEY_LOC_INDEX_TREND_STEP);
  const v = (sel && sel.value) ? sel.value : (saved || "day");
  const step = (v === "hour") ? "hour" : "day";
  if (sel && sel.value !== step) sel.value = step;
  return step;
}

function initLocIndexTrendControls(){
  const stepSel = document.getElementById("locIndexTrendStep");
  const locSel = document.getElementById("locIndexTrendLocation");
  const addBtn = document.getElementById("locIndexTrendAddBtn");
  const clearBtn = document.getElementById("locIndexTrendClearBtn");
  const selectAllBtn = document.getElementById("locIndexTrendSelectAllBtn");

  if (stepSel && !stepSel._wired){
    stepSel._wired = true;
    const saved = localStorage.getItem(STORAGE_KEY_LOC_INDEX_TREND_STEP);
    if (saved) stepSel.value = (saved === "hour") ? "hour" : "day";
    stepSel.addEventListener("change", ()=>{
      const v = (stepSel.value === "hour") ? "hour" : "day";
      localStorage.setItem(STORAGE_KEY_LOC_INDEX_TREND_STEP, v);
      locIndexTrend.key = null;
      ensureLocIndexTrendComputed(true).then(()=> renderLocIndexTrendChart());
    });
  }

  if (locSel && !locSel._wired){
    locSel._wired = true;
    if (!locSel._populated){
      populateLocIndexTrendLocationSelect(locSel);
      locSel._populated = true;
    }

    const current = getLocIndexTrendPickerLocationId_();
    if (current) locSel.value = current;

    locSel.addEventListener("change", ()=>{
      const id = getLocIndexTrendPickerLocationId_();

      if (id && typeof selectLocation === "function"){
        try { selectLocation(id, false); } catch(_e) {}
      }

      const ids = getOrInitLocIndexTrendLocIds_();
      if (!ids.length && id){
        addLocIndexTrendLocation(id);
      } else {
        renderLocIndexTrendLegend();
      }
    });
  }

  if (addBtn && !addBtn._wired){
    addBtn._wired = true;
    addBtn.addEventListener("click", ()=>{
      const id = getLocIndexTrendPickerLocationId_();
      if (!id) return;
      addLocIndexTrendLocation(id);
    });
  }

  if (clearBtn && !clearBtn._wired){
    clearBtn._wired = true;
    clearBtn.addEventListener("click", ()=> clearLocIndexTrendLocations());
  }

  
  if (selectAllBtn && !selectAllBtn._wired){
    selectAllBtn._wired = true;
    selectAllBtn.addEventListener("click", ()=> selectAllVisibleLocIndexTrendLocations());
  }
// Boot legend from storage
  getOrInitLocIndexTrendLocIds_();
  renderLocIndexTrendLegend();
}

// Called by selectLocation() to keep the picker in sync
function setLocIndexTrendLocation(id){
  const sel = document.getElementById("locIndexTrendLocation");
  if (sel){
    if (!sel._populated){
      populateLocIndexTrendLocationSelect(sel);
      sel._populated = true;
    }
    try { sel.value = String(id); } catch(_e) {}
  }

  const ids = getOrInitLocIndexTrendLocIds_();
  if (!ids.length && id){
    addLocIndexTrendLocation(id);
    return;
  }

  renderLocIndexTrendLegend();
}

function locIndexTrendLayout(w, h, n){
  const padL = 42, padR = 10, padT = 10, padB = 18;
  const x0 = padL, x1 = w - padR;
  const y0 = padT, y1 = h - padB;
  const minY = 0, maxY = 100;

  const xAt = (i)=> x0 + (x1 - x0) * (n <= 1 ? 0 : i / (n - 1));
  const yAt = (v)=> y1 - ((clamp(v, minY, maxY) - minY) / (maxY - minY)) * (y1 - y0);

  return { padL, padR, padT, padB, x0, x1, y0, y1, minY, maxY, n, xAt, yAt };
}

function locIndexTrendKey(win, step, locIds){
  const a = win.start.toISOString().slice(0,16);
  const b = win.end.toISOString().slice(0,16);
  const loaded = dataCache?.loadedAt ? new Date(dataCache.loadedAt).toISOString().slice(0,19) : "none";
  const mode = (typeof timeMode !== "undefined" && timeMode) ? timeMode : "live";
  step = (step === "hour") ? "hour" : "day";
  const locPart = (locIds || []).map(String).sort().join(",");
  return `${mode}|locIndexMulti|${locPart}|${a}|${b}|${step}|${loaded}`;
}

async function ensureLocIndexTrendComputed(force=false){
  const canvas = document.getElementById("locIndexTrendChart");
  const meta = document.getElementById("locIndexTrendMeta");
  if (!canvas || !meta) return;

  if (!dataCache?.wxList || !Array.isArray(locations) || !locations.length){
    meta.textContent = "No data loaded";
    return;
  }

  initLocIndexTrendControls();

  const step = getSelectedLocIndexTrendStep();
  let locIds = normalizeLocIndexTrendLocIds_(getOrInitLocIndexTrendLocIds_());

  if (!locIds.length){
    const fallback = getLocIndexTrendPickerLocationId_();
    if (fallback) locIds = normalizeLocIndexTrendLocIds_([fallback]);
    if (!locIds.length){
      meta.textContent = "Add locations to see trend";
      return;
    }
    locIndexTrend.locIds = locIds;
    saveStoredLocIndexTrendLocIds_(locIds);
    renderLocIndexTrendLegend();
  }

  // Build index map
  const idxMap = new Map();
  locations.forEach((l, i)=> idxMap.set(String(l.id), i));

  const locInfo = locIds
    .map(id => ({ id: String(id), idx: idxMap.get(String(id)) }))
    .filter(o => Number.isInteger(o.idx) && o.idx >= 0)
    .slice(0, LOC_INDEX_TREND_MAX_LOCS);

  if (!locInfo.length){
    meta.textContent = "Selected locations not found";
    return;
  }

  const endRaw = getAsOfDate();
  if (!(endRaw instanceof Date) || isNaN(endRaw.getTime())){
    meta.textContent = "As Of date missing";
    return;
  }

  // 7-day window ending at As Of
  let end = endRaw;
  let start;

  if (step === "hour"){
    const endH = startOfLocalHour(end);
    start = addLocalHours(endH, -(7*24 - 1)); // 168 points including end
    end = endH;
  } else {
    const endD = startOfLocalDay(end);
    start = addLocalDays(endD, -6); // 7 points including end
    end = endD;
  }

  // Clamp to loaded range
  const rangeMin = dataCache.rangeMin ? new Date(dataCache.rangeMin) : null;
  const rangeMax = dataCache.rangeMax ? new Date(dataCache.rangeMax) : null;
  if (rangeMin && start < rangeMin) start = rangeMin;
  if (rangeMax && end > rangeMax) end = rangeMax;

  // Align after clamp
  if (step === "hour"){
    start = startOfLocalHour(start);
    end = startOfLocalHour(end);
  } else {
    start = startOfLocalDay(start);
    end = startOfLocalDay(end);
  }

  const key = locIndexTrendKey({start, end}, step, locInfo.map(o => o.id));
  if (!force && locIndexTrend.key === key && locIndexTrend.step === step && locIndexTrend.times?.length > 1) return;
  if (locIndexTrend.building) return locIndexTrend.building;

  meta.textContent = "Building location index trend…";

  const buildPromise = (async ()=>{
    // Build time axis
    const times = [];
    if (step === "hour"){
      let t = start;
      const endT = end;
      let safety = 0;
      const safetyLimit = 5000;
      while (t <= endT && safety < safetyLimit){
        times.push(new Date(t));
        t = addLocalHours(t, 1);
        safety++;
        if (safety % 48 === 0) await new Promise(r=>setTimeout(r,0));
      }
    } else {
      let t = start;
      const endT = end;
      let safety = 0;
      const safetyLimit = 1000;
      while (t <= endT && safety < safetyLimit){
        times.push(new Date(t));
        t = addLocalDays(t, 1);
        safety++;
      }
    }

    // Build series per location
    const series = [];

    for (let si=0; si<locInfo.length; si++){
      const { id, idx } = locInfo[si];
      const wx = dataCache.wxList[idx] || null;
      const flood = dataCache.floodList ? dataCache.floodList[idx] : null;

      const values = [];
      const riverOverride = (typeof getRiverIndexOverrideForLocationIndex_ === "function") ? getRiverIndexOverrideForLocationIndex_(idx) : null;
      for (let i=0; i<times.length; i++){
        const t = times[i];
        const r = computeLocationIndex(wx, flood, t, riverOverride);
        const s = r?.score;
        values.push((s != null && isFinite(s)) ? s : null);

        if (step === "hour" && i % 64 === 0) await new Promise(r=>setTimeout(r,0));
      }

      series.push({
        locId: id,
        values,
        color: locIndexTrendColorForIndex_(si)
      });
    }

    locIndexTrend.key = key;
    locIndexTrend.step = step;
    locIndexTrend.times = times;
    locIndexTrend.series = series;

    const ptsTxt = `${times.length} pts`;
    const rangeTxt = times.length ? `${formatWhenNZ(times[0])} to ${formatWhenNZ(times[times.length - 1])}` : "-";
    meta.textContent = `${series.length} locations • ${rangeTxt} • ${ptsTxt}`;
    locIndexTrend.defaultMeta = meta.textContent;

    renderLocIndexTrendLegend();
    renderLocIndexTrendChart();
  })().finally(()=>{ locIndexTrend.building = null; });

  locIndexTrend.building = buildPromise;
  return buildPromise;
}

function ensureLocIndexTrendHoverHooks(){
  const canvas = document.getElementById("locIndexTrendChart");
  if (!canvas || canvas._hoverHooked) return;
  canvas._hoverHooked = true;

  const tip = document.getElementById("locIndexTrendTooltip");

  const onMove = (e)=>{
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const n = (locIndexTrend.times || []).length;
    const layout = locIndexTrendLayout(r.width, r.height, n);

    if (x < layout.x0 || x > layout.x1 || y < layout.y0 || y > layout.y1){
      locIndexTrendHover.idx = null;
      locIndexTrendHover.active = false;
      if (tip) tip.style.display = "none";
      renderLocIndexTrendChart();
      return;
    }

    const t = (x - layout.x0) / (layout.x1 - layout.x0);
    const idx = clamp(Math.round(t * (n - 1)), 0, n - 1);

    locIndexTrendHover.idx = idx;
    locIndexTrendHover.active = true;
    renderLocIndexTrendChart();
  };

  const onLeave = ()=>{
    locIndexTrendHover.idx = null;
    locIndexTrendHover.active = false;

    const meta = document.getElementById("locIndexTrendMeta");
    if (meta && locIndexTrend.defaultMeta) meta.textContent = locIndexTrend.defaultMeta;

    if (tip) tip.style.display = "none";
    renderLocIndexTrendChart();
  };

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("touchmove", (e)=>{
    if (!e.touches || !e.touches.length) return;
    onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }, { passive: true });
  canvas.addEventListener("touchend", onLeave);
}

function renderLocIndexTrendChart(){
  const canvas = document.getElementById("locIndexTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ensureLocIndexTrendHoverHooks();
  const tip = document.getElementById("locIndexTrendTooltip");

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0,0,w,h);

  const times = locIndexTrend.times || [];
  const series = Array.isArray(locIndexTrend.series) ? locIndexTrend.series : [];
  const n = times.length;

  const layout = locIndexTrendLayout(w, h, n);

  // Gridlines 0..100
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let p=0; p<=5; p++){
    const v = layout.minY + (layout.maxY - layout.minY) * (p / 5);
    const y = layout.yAt(v);
    ctx.beginPath();
    ctx.moveTo(layout.x0, y);
    ctx.lineTo(layout.x1, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  for (let v=layout.minY; v<=layout.maxY; v+=20){
    const y = layout.yAt(v);
    ctx.beginPath();
    ctx.moveTo(layout.x0 - 4, y);
    ctx.lineTo(layout.x0, y);
    ctx.stroke();
    ctx.fillText(String(v), layout.x0 - 6, y);
  }

  // Axis line
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(layout.x0, layout.y0);
  ctx.lineTo(layout.x0, layout.y1);
  ctx.stroke();

  if (!series.length || n < 2){
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Add locations to see the index trend", 10, 20);
    if (tip) tip.style.display = "none";
    return;
  }

  // Threshold guide lines
  try {
    const c80 = hexToRgba(cssVar("--warn") || "#fbbf24", 0.35);
    const c84 = hexToRgba(cssVar("--extreme") || "#f97316", 0.35);
    const c94 = hexToRgba(cssVar("--danger") || "#ef4444", 0.30);
    drawThresholdLine(ctx, layout, 80, "80", c80);
    drawThresholdLine(ctx, layout, 84, "84", c84);
    drawThresholdLine(ctx, layout, 94, "94", c94);
  } catch(_e) {}

  // Series lines
  const lw = (series.length > 1) ? 2.0 : 2.5;
  for (const s of series){
    drawSeries(ctx, layout, s.values || [], s.color || (cssVar("--ok") || "#38bdf8"), lw);
  }

  // As-of marker (vertical)
  const asOf = getAsOfDate();
  const t0 = times[0]?.getTime();
  const t1 = times[times.length - 1]?.getTime();
  if (t0 && t1 && asOf){
    const tt = asOf.getTime();
    if (tt >= t0 && tt <= t1){
      const stepMs = (locIndexTrend.step === "hour") ? (3600*1000) : (24*3600*1000);
      const ptIdx = Math.round((tt - t0) / stepMs);
      const idx = clamp(ptIdx, 0, layout.n - 1);
      const x = layout.xAt(idx);

      ctx.strokeStyle = "rgba(255,255,255,0.30)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, layout.y0);
      ctx.lineTo(x, layout.y1);
      ctx.stroke();
    }
  }

  // Hover
  if (locIndexTrendHover.active && locIndexTrendHover.idx != null){
    const i = locIndexTrendHover.idx;
    const x = layout.xAt(i);

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, layout.y0);
    ctx.lineTo(x, layout.y1);
    ctx.stroke();

    const dt = times[i];
    const dateTxt = dt
      ? (locIndexTrend.step === "hour"
        ? dt.toLocaleString("en-NZ", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
        : dt.toLocaleDateString("en-NZ", { year:"numeric", month:"short", day:"2-digit" })
      )
      : "";

    const lines = [];
    for (const s of series){
      const v = (s.values || [])[i];
      if (v == null || !isFinite(v)) continue;
      const y = layout.yAt(v);

      ctx.fillStyle = s.color || "#38bdf8";
      ctx.beginPath();
      ctx.arc(x, y, 3.1, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const loc = Array.isArray(locations) ? locations.find(l => String(l.id) === String(s.locId)) : null;
      const name = loc ? loc.name : String(s.locId || "");
      lines.push({ name, color: s.color, val: v.toFixed(0) });
    }

    if (tip){
      tip.style.display = "block";
      tip.style.left = Math.min(w - 230, Math.max(10, x + 10)) + "px";
      tip.style.top = "10px";

      const rows = lines.map(l =>
        `<div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <span style="width:10px; height:10px; border-radius:99px; background:${l.color}; display:inline-block;"></span>
          <span style="flex:1;" class="mono">${escapeHtml(l.name)}</span>
          <span style="font-weight:700;">${escapeHtml(l.val)}</span>
        </div>`
      ).join("");

      tip.innerHTML = `<div style="font-weight:700; margin-bottom:2px;">${escapeHtml(dateTxt)}</div>${rows}`;
    }

    const meta = document.getElementById("locIndexTrendMeta");
    if (meta){
      meta.textContent = dateTxt ? `At ${dateTxt}` : (locIndexTrend.defaultMeta || "");
    }
  } else {
    if (tip) tip.style.display = "none";
  }
}



/***********************
 * Events Module
 ***********************/
const EVENTS_STATE_KEY = "fn_drought_events_state_v1";
const RESTRICTION_JSON_KEY = "fn_drought_events_water_restriction_json_v1";

let EVENTS_STATE = null;
let _EVENTS_NORM_CACHE_ = { raw: null, norm: null };

function _eventsDefaultState_(){
  return {
    version: 1,
    type: "water_restrictions",
    supply: "all",
    from: "",
    to: "",
    syncRange: false,
    selectedId: ""
  };
}

function loadEventsState_(){
  if (EVENTS_STATE) return EVENTS_STATE;
  try{
    const raw = localStorage.getItem(EVENTS_STATE_KEY);
    if (raw){
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object"){
        EVENTS_STATE = Object.assign(_eventsDefaultState_(), obj);
        return EVENTS_STATE;
      }
    }
  }catch(_e){}
  EVENTS_STATE = _eventsDefaultState_();
  try{ localStorage.setItem(EVENTS_STATE_KEY, JSON.stringify(EVENTS_STATE)); }catch(_e){}
  return EVENTS_STATE;
}

function saveEventsState_(){
  try{ localStorage.setItem(EVENTS_STATE_KEY, JSON.stringify(EVENTS_STATE || _eventsDefaultState_())); }catch(_e){}
}

function _getEmbeddedRestrictionJsonRaw_(){
  try{
    const el = document.getElementById("restrictionLevelsJson");
    if (!el) return "";
    return (el.textContent || "").trim();
  }catch(_e){ return ""; }
}

function getRestrictionJsonRaw_(){
  const stored = localStorage.getItem(RESTRICTION_JSON_KEY);
  if (stored && String(stored).trim()) return String(stored);
  const embedded = _getEmbeddedRestrictionJsonRaw_();
  return embedded || "";
}

function setRestrictionJsonRaw_(raw){
  try{
    if (!raw || !String(raw).trim()){
      localStorage.removeItem(RESTRICTION_JSON_KEY);
      _EVENTS_NORM_CACHE_.raw = null;
      _EVENTS_NORM_CACHE_.norm = null;
      return true;
    }
    // validate
    JSON.parse(String(raw));
    localStorage.setItem(RESTRICTION_JSON_KEY, String(raw));
    _EVENTS_NORM_CACHE_.raw = null;
    _EVENTS_NORM_CACHE_.norm = null;
    return true;
  }catch(e){
    return false;
  }
}

function _slug_(s){
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function normalizeRestrictionDataset_(obj){
  const supplies = Array.isArray(obj?.supplies) ? obj.supplies.map(s=>({ id:String(s.id||"").trim(), name:String(s.name||s.id||"").trim() })).filter(s=>s.id) : [];
  const supplyNameById = {};
  for (const s of supplies) supplyNameById[s.id] = s.name || s.id;

  const meaning = (obj && obj.levelMeaning && typeof obj.levelMeaning === "object") ? obj.levelMeaning : {};
  const items = Array.isArray(obj?.items) ? obj.items.slice() : [];
  items.sort((a,b)=> String(a.snapshotDate||a.publishedDate||"").localeCompare(String(b.snapshotDate||b.publishedDate||"")));

  let prev = null;
  const events = [];
  for (const it of items){
    const snapshotDate = String(it.snapshotDate || "").trim();
    const publishedDate = String(it.publishedDate || "").trim();
    const date = snapshotDate || publishedDate;
    if (!date) continue;

    const levels = (it && it.restrictionLevels && typeof it.restrictionLevels === "object") ? it.restrictionLevels : {};
    const changes = [];
    const prevLevels = prev;
    if (prevLevels){
      for (const sid of Object.keys(levels)){
        const cur = Number(levels[sid]);
        const was = Number(prevLevels[sid]);
        if (isFinite(cur) && isFinite(was) && cur !== was){
          changes.push({ supplyId: sid, supplyName: supplyNameById[sid] || sid, from: was, to: cur, delta: cur - was });
        }
      }
    }
    // Supply states for UI (current level and change since last entry)
    const supplyStates = [];
    const supplyStateById = {};
    for (const s of supplies){
      const sid = String(s.id || "").trim();
      if (!sid) continue;
      const curRaw = (levels && Object.prototype.hasOwnProperty.call(levels, sid)) ? Number(levels[sid]) : null;
      const wasRaw = (prevLevels && Object.prototype.hasOwnProperty.call(prevLevels, sid)) ? Number(prevLevels[sid]) : null;
      const cur = (curRaw != null && isFinite(curRaw)) ? curRaw : null;
      const was = (wasRaw != null && isFinite(wasRaw)) ? wasRaw : null;
      const delta = (cur != null && was != null) ? (cur - was) : null;
      const entry = {
        supplyId: sid,
        supplyName: supplyNameById[sid] || sid,
        level: cur,
        from: was,
        delta,
        changed: (delta != null && delta !== 0)
      };
      supplyStates.push(entry);
      supplyStateById[sid] = entry;
    }

    prev = levels;

    const vals = Object.values(levels).map(x=> Number(x)).filter(x=> isFinite(x));
    const maxLevel = vals.length ? Math.max.apply(null, vals) : null;

    const title = String(it.title || "Untitled").trim();
    const url = String(it.url || "").trim();

    const id = "wr|" + date + "|" + _slug_(title);

    events.push({
      id,
      type: "water_restriction",
      date,
      snapshotDate,
      publishedDate,
      title,
      url,
      maxLevel,
      levels,
      changes,
      supplyStates,
      supplyStateById
    });
  }

  return { supplies, supplyNameById, meaning, events };
}

function ensureRestrictionEvents_(){
  const raw = getRestrictionJsonRaw_();
  if (_EVENTS_NORM_CACHE_.raw === raw && _EVENTS_NORM_CACHE_.norm) return _EVENTS_NORM_CACHE_.norm;

  try{
    const obj = JSON.parse(raw || "{}");
    const norm = normalizeRestrictionDataset_(obj);
    _EVENTS_NORM_CACHE_.raw = raw;
    _EVENTS_NORM_CACHE_.norm = norm;
    return norm;
  }catch(e){
    _EVENTS_NORM_CACHE_.raw = raw;
    _EVENTS_NORM_CACHE_.norm = { supplies: [], supplyNameById: {}, meaning: {}, events: [] };
    return _EVENTS_NORM_CACHE_.norm;
  }
}

function _restrictionLevelColorVar_(lvl){
  const n = Number(lvl);
  if (n >= 4) return "var(--severe)";
  if (n === 3) return "var(--warn)";
  if (n === 2) return "var(--watch)";
  return "var(--ok)";
}


function stripRestrictionLevelFromTitle_(t){
  // Remove leading "Level X" patterns from headlines to keep the Title column clean
  const s = String(t || "").trim();
  return s
    .replace(/^Level\s*\d+\s*[:\-]\s*/i, "")
    .replace(/^Level\s*\d+\s+/i, "")
    .trim();
}

function _renderRestrictionSupplyPills_(e, supplyFilter){
  const arr = Array.isArray(e?.supplyStates) ? e.supplyStates : [];
  const sf = String(supplyFilter || "all");
  const list = (sf && sf !== "all") ? arr.filter(x => x && x.supplyId === sf) : arr;
  if (!list.length) return "";

  let html = '<div class="evSupplyGrid">';
  for (const s of list){
    if (!s) continue;
    const lvl = (s.level != null && isFinite(Number(s.level))) ? Number(s.level) : null;
    const col = _restrictionLevelColorVar_(lvl || 1);
    const delta = (s.delta != null && isFinite(Number(s.delta))) ? Number(s.delta) : null;

    const levelTxt = (lvl != null) ? String(lvl) : "?";
    const deltaTxt = (delta == null) ? "–" : (delta > 0 ? `+${delta}` : String(delta));
    const title = (s.from != null && lvl != null) ? `${s.from}→${lvl}` : (lvl != null ? `Level ${lvl}` : "");

    html += `<div class="evSupplyPill" title="${escapeHtml(title)}">`
      + `<span class="evDot" style="background:${col};"></span>`
      + `<span class="evSupplyName">${escapeHtml(String(s.supplyName || s.supplyId || ""))}</span>`
      + `<span class="evLevel mono">Level ${escapeHtml(levelTxt)}</span>`
      + `<span class="evDelta mono">${escapeHtml(deltaTxt)}</span>`
      + `</div>`;
  }
  html += "</div>";
  return html;
}

function _filterEvents_(norm){
  const st = loadEventsState_();
  let list = (norm?.events || []).slice();

  // type filter (future-proof)
  if (st.type === "water_restrictions"){
    list = list.filter(e => e.type === "water_restriction");
  }

  // date range filter (YYYY-MM-DD)
  const from = String(st.from || "").trim();
  const to = String(st.to || "").trim();
  if (from) list = list.filter(e => String(e.date) >= from);
  if (to) list = list.filter(e => String(e.date) <= to);

  // supply filter
  const supply = String(st.supply || "all");
  if (supply && supply !== "all"){
    list = list.filter(e => (e.levels && Object.prototype.hasOwnProperty.call(e.levels, supply)));
  }

  return list;
}


function _eventsGetSyncedDashboardRange_(){
  try{
    // Historic playback range takes precedence when loaded
    if (typeof timeMode !== "undefined" && timeMode === "historic" &&
        typeof historicUseRange !== "undefined" && historicUseRange &&
        (typeof historicRangeStart !== "undefined") && (historicRangeStart instanceof Date) && !isNaN(historicRangeStart.getTime()) &&
        (typeof historicRangeEnd !== "undefined") && (historicRangeEnd instanceof Date) && !isNaN(historicRangeEnd.getTime())){
      const rs = (typeof ymdLocal === "function") ? ymdLocal(historicRangeStart) : (new Date(historicRangeStart.getTime())).toISOString().slice(0,10);
      const re = (typeof ymdLocal === "function") ? ymdLocal(historicRangeEnd) : (new Date(historicRangeEnd.getTime())).toISOString().slice(0,10);
      return { from: rs, to: re, mode: "historic_range" };
    }

    // Live and Historic snapshot: end day = as-of day, start day = end minus Past Days
    const asOf = (typeof getAsOfDate === "function") ? getAsOfDate() : new Date();
    const to = (typeof ymdLocal === "function") ? ymdLocal(asOf) : (new Date(asOf.getTime())).toISOString().slice(0,10);

    let pd = 30;
    const el = document.getElementById("pastDays");
    if (el){
      const v = Number(el.value);
      if (!isNaN(v) && v > 0) pd = Math.max(1, Math.min(365, Math.floor(v)));
    }

    const start = new Date(asOf.getTime());
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() - pd);
    const from = (typeof ymdLocal === "function") ? ymdLocal(start) : (new Date(start.getTime())).toISOString().slice(0,10);

    return { from, to, mode: "window" };
  }catch(_e){
    return null;
  }
}

function _applyEventsRangeSyncIfEnabled_(){
  const st = loadEventsState_();
  if (!st || !st.syncRange) return false;

  const r = _eventsGetSyncedDashboardRange_();
  if (!r || !r.to) return false;

  const nextFrom = String(r.from || "");
  const nextTo = String(r.to || "");
  const changed = (String(st.from || "") !== nextFrom) || (String(st.to || "") !== nextTo);

  st.from = nextFrom;
  st.to = nextTo;
  saveEventsState_();

  const fromEl = document.getElementById("eventsFromDate");
  const toEl = document.getElementById("eventsToDate");
  if (fromEl) fromEl.value = nextFrom;
  if (toEl) toEl.value = nextTo;

  // lock date inputs when synced
  if (fromEl) fromEl.disabled = true;
  if (toEl) toEl.disabled = true;

  return changed;
}

// External hook: call this when dashboard time range changes
window.eventsNotifyTimeRangeChanged_ = function(){
  try{
    const panel = document.getElementById("panelEvents");
    if (!panel || panel.style.display === "none") return;
    const st = loadEventsState_();
    if (!st || !st.syncRange) return;
    renderEventsPanel_();
  }catch(_e){}
};


function bindEventsUi_(){
  const panel = document.getElementById("panelEvents");
  if (!panel || panel._eventsBound) return;
  panel._eventsBound = true;

  const st = loadEventsState_();

  const selType = document.getElementById("eventsTypeSelect");
  const selSupply = document.getElementById("eventsSupplySelect");
  const fromEl = document.getElementById("eventsFromDate");
  const toEl = document.getElementById("eventsToDate");
  const chkSync = document.getElementById("eventsSyncRange");
  const btnImport = document.getElementById("btnEventsImport");
  const btnReset = document.getElementById("btnEventsReset");
  const file = document.getElementById("eventsImportFile");

  if (selType){
    selType.value = st.type || "water_restrictions";
    selType.addEventListener("change", ()=>{
      st.type = selType.value;
      saveEventsState_();
      renderEventsPanel_();
    });
  }

  if (fromEl){
    fromEl.value = st.from || "";
    fromEl.addEventListener("change", ()=>{
      if (st.syncRange) return;
      st.from = String(fromEl.value || "");
      saveEventsState_();
      renderEventsPanel_();
    });
  }
  if (toEl){
    toEl.value = st.to || "";
    toEl.addEventListener("change", ()=>{
      if (st.syncRange) return;
      st.to = String(toEl.value || "");
      saveEventsState_();
      renderEventsPanel_();
    });
  }

  if (chkSync){
    chkSync.checked = !!st.syncRange;
    chkSync.addEventListener("change", ()=>{
      st.syncRange = !!chkSync.checked;
      saveEventsState_();
      if (st.syncRange){
        _applyEventsRangeSyncIfEnabled_();
      }else{
        if (fromEl) fromEl.disabled = false;
        if (toEl) toEl.disabled = false;
      }
      renderEventsPanel_();
    });
  }

  if (selSupply){
    selSupply.addEventListener("change", ()=>{
      st.supply = selSupply.value || "all";
      saveEventsState_();
      renderEventsPanel_();
    });
  }

  if (btnImport && file){
    btnImport.addEventListener("click", ()=> file.click());
    file.addEventListener("change", ()=>{
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        const raw = String(reader.result || "");
        const ok = setRestrictionJsonRaw_(raw);
        if (!ok){
          showToast("Import failed: invalid JSON");
          return;
        }
        showToast("Water restriction events imported");
        renderEventsPanel_();
      };
      reader.readAsText(f);
    });
  }

  if (btnReset){
    btnReset.addEventListener("click", ()=>{
      setRestrictionJsonRaw_("");
      showToast("Events reset to default");
      renderEventsPanel_();
    });
  }

  // Timeline hover
  const canvas = document.getElementById("eventsTimelineCanvas");
  if (canvas && !canvas._eventsHoverBound){
    canvas._eventsHoverBound = true;
    canvas.addEventListener("mousemove", (ev)=>{
      const tip = document.getElementById("eventsTimelineTooltip");
      if (!tip) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const markers = canvas._eventsMarkers || [];
      if (!markers.length){
        tip.style.display = "none";
        return;
      }
      let best = null;
      let bestDx = 1e9;
      for (const m of markers){
        const dx = Math.abs(m.x - x);
        if (dx < bestDx){
          bestDx = dx;
          best = m;
        }
      }
      if (!best || bestDx > 14){
        tip.style.display = "none";
        return;
      }
      const e = best.event;
      const max = (e.maxLevel != null) ? String(e.maxLevel) : "?";
      const ch = (e.changes && e.changes.length) ? e.changes.length : 0;

      const stNow = loadEventsState_();
      const pills = _renderRestrictionSupplyPills_(e, stNow?.supply || "all");
      const cleanTitle = stripRestrictionLevelFromTitle_(e.title || "");
      tip.innerHTML = `<div class="mono">${escapeHtml(e.date || "")}</div>`
        + `<div style="margin-top:4px;">${escapeHtml(cleanTitle || e.title || "")}</div>`
        + `<div class="muted" style="margin-top:4px;">Max Level: <span class="mono">${escapeHtml(max)}</span> • Changes: <span class="mono">${escapeHtml(String(ch))}</span></div>`
        + (pills ? `<div style="margin-top:8px;">${pills}</div>` : "");

      tip.style.left = Math.max(8, Math.min(rect.width - 220, x + 10)) + "px";
      tip.style.top = "8px";
      tip.style.display = "";
    });

    canvas.addEventListener("mouseleave", ()=>{
      const tip = document.getElementById("eventsTimelineTooltip");
      if (tip) tip.style.display = "none";
    });

    canvas.addEventListener("click", (ev)=>{
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const markers = canvas._eventsMarkers || [];
      if (!markers.length) return;

      let best = null;
      let bestDx = 1e9;
      for (const m of markers){
        const dx = Math.abs(m.x - x);
        if (dx < bestDx){
          bestDx = dx;
          best = m;
        }
      }
      if (!best || bestDx > 14) return;

      const st2 = loadEventsState_();
      st2.selectedId = best.event?.id || "";
      saveEventsState_();
      renderEventsPanel_();
    });
  }

  // Re-render timeline on resize
  if (!window._eventsResizeHook){
    window._eventsResizeHook = true;
    window.addEventListener("resize", ()=>{
      const panelEvents = document.getElementById("panelEvents");
      if (panelEvents && panelEvents.style.display !== "none"){
        renderEventsPanel_();
      }
    });
  }
}

function renderEventsPanel_(){
  try{
    const panel = document.getElementById("panelEvents");
    if (!panel || panel.style.display === "none") return;

    bindEventsUi_();

    const norm = ensureRestrictionEvents_();
    const st = loadEventsState_();

    // Populate supply dropdown
    const selSupply = document.getElementById("eventsSupplySelect");
    if (selSupply && !selSupply._populatedOnce){
      selSupply._populatedOnce = true;
      selSupply.innerHTML = "";
      const optAll = document.createElement("option");
      optAll.value = "all";
      optAll.textContent = "All Supplies";
      selSupply.append(optAll);
      for (const s of (norm.supplies || [])){
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name || s.id;
        selSupply.append(opt);
      }
    }
    if (selSupply){
      selSupply.value = st.supply || "all";
    }

    // Auto-sync range if enabled
    _applyEventsRangeSyncIfEnabled_();
    const st2 = loadEventsState_();
    const fe = document.getElementById("eventsFromDate");
    const te = document.getElementById("eventsToDate");
    if (fe) fe.disabled = !!st2?.syncRange;
    if (te) te.disabled = !!st2?.syncRange;

    // Render filtered list
    const list = _filterEvents_(norm);

    const hint = document.getElementById("eventsHint");
    if (hint){
      hint.textContent = list.length ? `Showing ${list.length} events` : "No events";
    }

    renderEventsTimeline_(list);
    renderEventsTable_(list, norm);

  }catch(e){
    console.warn("renderEventsPanel failed:", e);
  }
}

function renderEventsTimeline_(list){
  const card = document.getElementById("eventsTimelineCard");
  const canvas = document.getElementById("eventsTimelineCanvas");
  if (!card || !canvas || card.style.display === "none") return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 12;
  const padR = 12;
  const padT = 18;
  const padB = 18;
  const innerW = Math.max(1, w - padL - padR);
  const midY = Math.floor((h - padT - padB) * 0.55) + padT;

  // baseline
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, midY);
  ctx.lineTo(padL + innerW, midY);
  ctx.stroke();

  if (!list || !list.length){
    canvas._eventsMarkers = [];
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.fillText("No events", padL, padT + 12);
    return;
  }

  const dates = list.map(e=> String(e.date));
  const minD = dates.reduce((a,b)=> a < b ? a : b);
  const maxD = dates.reduce((a,b)=> a > b ? a : b);

  const t0 = Date.parse(minD + "T00:00:00Z");
  const t1 = Date.parse(maxD + "T00:00:00Z");
  const span = Math.max(1, t1 - t0);

  // labels
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(minD, padL, h - 6);
  const maxTextW = ctx.measureText(maxD).width;
  ctx.fillText(maxD, padL + innerW - maxTextW, h - 6);

  const markers = [];
  for (const e of list){
    const t = Date.parse(String(e.date) + "T00:00:00Z");
    const x = padL + ((t - t0) / span) * innerW;

    // marker
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(x, midY - 14);
    ctx.lineTo(x, midY + 10);
    ctx.stroke();

    const col = _restrictionLevelColorVar_(e.maxLevel);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, midY - 16, 4.5, 0, Math.PI * 2);
    ctx.fill();

    markers.push({ x, event: e });
  }

  canvas._eventsMarkers = markers;

  // Selected highlight
  const st = loadEventsState_();
  if (st.selectedId){
    const sel = markers.find(m => m.event?.id === st.selectedId);
    if (sel){
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sel.x, midY - 16, 7.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function renderEventsTable_(list, norm){
  const card = document.getElementById("eventsTableCard");
  const wrap = document.getElementById("eventsTableWrap");
  if (!card || !wrap || card.style.display === "none") return;

  const st = loadEventsState_();
  const meaning = norm?.meaning || {};

  const rows = (list || []).slice().sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")));

  let html = `<table class="small">\n<thead><tr>`
    + `<th>Date</th>`
    + `<th>Title</th>`
    + `<th class="mono">Max</th>`
    + `<th class="mono">Changes</th>`
    + `</tr></thead>\n<tbody>\n`;

  for (const e of rows){
    const isSel = (st.selectedId && e.id === st.selectedId);
    const max = (e.maxLevel != null) ? Number(e.maxLevel) : null;
    const maxLabel = (max && meaning && meaning[String(max)]) ? meaning[String(max)] : "";
    const ch = (e.changes && e.changes.length) ? e.changes.length : 0;

    const cleanTitle = stripRestrictionLevelFromTitle_(e.title || "Untitled") || (e.title || "Untitled");
    const titleCell = e.url
      ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(cleanTitle)}</a>`
      : `${escapeHtml(cleanTitle)}`;

    let changesText = "";
    if (ch){
      const arr = (e.changes || []).slice().sort((a,b)=> String(a.supplyName||"").localeCompare(String(b.supplyName||"")));
      changesText = arr.map(c => `<div class="evChangeLine">${escapeHtml(c.supplyName)} <span class="mono">${escapeHtml(String(c.from))}→${escapeHtml(String(c.to))}</span></div>`).join("");
    }else{
      changesText = `<span class="muted">No change</span>`;
    }

    const badgeCol = _restrictionLevelColorVar_(max || 1);
    const badge = (max != null) ? `<span class="pill mono" style="background:${badgeCol}; color:#0b0f14; padding:2px 8px; border-radius:999px;">${escapeHtml(String(max))}</span>` : `<span class="muted">-</span>`;

    html += `<tr data-eid="${escapeHtml(e.id)}" style="${isSel ? "outline: 2px solid rgba(255,255,255,0.25);" : ""}">`
      + `<td class="mono">${escapeHtml(e.date || "")}</td>`
      + `<td>${titleCell}${maxLabel ? `<div class="tiny muted">${escapeHtml(maxLabel)}</div>` : ""}</td>`
      + `<td>${badge}</td>`
      + `<td>${changesText}</td>`
      + `</tr>\n`;
  }

  html += `</tbody></table>`;
  wrap.innerHTML = html;

  // Row click select
  const trs = wrap.querySelectorAll("tbody tr");
  for (const tr of trs){
    if (tr._hooked) continue;
    tr._hooked = true;
    tr.addEventListener("click", ()=>{
      const id = tr.getAttribute("data-eid") || "";
      const st2 = loadEventsState_();
      st2.selectedId = id;
      saveEventsState_();
      renderEventsPanel_();
    });
  }
}



/***********************
 * Text Summary Module
 ***********************/
const TEXT_SUMMARY_PREFS_KEY = "fn_drought_text_summary_prefs_v1";
let TEXT_SUMMARY_UI_BOUND = false;

function loadTextSummaryPrefs_(){
  try{
    const raw = localStorage.getItem(TEXT_SUMMARY_PREFS_KEY);
    if (!raw) return { locId: null, template: "community" };
    const obj = JSON.parse(raw);
    return {
      locId: obj && obj.locId ? String(obj.locId) : null,
      template: obj && obj.template ? String(obj.template) : "community"
    };
  }catch(_e){
    return { locId: null, template: "community" };
  }
}

function saveTextSummaryPrefs_(prefs){
  try{
    localStorage.setItem(TEXT_SUMMARY_PREFS_KEY, JSON.stringify({
      locId: prefs && prefs.locId ? String(prefs.locId) : null,
      template: prefs && prefs.template ? String(prefs.template) : "community"
    }));
  }catch(_e){}
}

function _panelVisible_(id){
  const el = document.getElementById(id);
  return !!(el && el.style.display !== "none");
}

function _safeNum_(v){
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function _mean_(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  let s = 0, c = 0;
  for (const v of arr){
    const n = _safeNum_(v);
    if (n == null) continue;
    s += n; c++;
  }
  return c ? (s / c) : null;
}

function _median_(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  const vals = arr.map(_safeNum_).filter(v=>v!=null).sort((a,b)=>a-b);
  if (!vals.length) return null;
  const mid = Math.floor(vals.length/2);
  return (vals.length % 2) ? vals[mid] : (vals[mid-1] + vals[mid]) / 2;
}


function _rowLoc_(r){
  const loc = (r && r.loc) ? r.loc : null;
  if (loc && loc.id != null){
    return {
      id: String(loc.id),
      name: String(loc.name || loc.title || loc.id),
      lat: _safeNum_(loc.lat),
      lon: _safeNum_(loc.lon)
    };
  }
  if (r && r.id != null){
    return {
      id: String(r.id),
      name: String(r.name || r.title || r.id),
      lat: _safeNum_(r.lat),
      lon: _safeNum_(r.lon)
    };
  }
  return { id: null, name: "", lat: null, lon: null };
}

function _sumPastDaysFromDailySeries_(series, endDate, days){
  try{
    if (!series || !Array.isArray(series.dates) || !Array.isArray(series.precip)) return null;
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) return null;
    const endKey = endDate.toISOString().slice(0,10);
    let endIdx = -1;
    for (let i=0;i<series.dates.length;i++){
      const k = String(series.dates[i] || "");
      if (k && k <= endKey) endIdx = i;
    }
    if (endIdx < 0) return null;
    const startIdx = Math.max(0, endIdx - (Math.max(1, Number(days)||1) - 1));
    let sum = 0;
    let any = false;
    for (let i=startIdx;i<=endIdx;i++){
      const v = _safeNum_(series.precip[i]);
      if (v == null) continue;
      sum += v;
      any = true;
    }
    return any ? sum : null;
  }catch(_e){
    return null;
  }
}


function _fmtDelta_(v, digits=1){
  const n = _safeNum_(v);
  if (n == null) return "n/a";
  const sign = n > 0 ? "+" : "";
  return sign + fmt(n, digits);
}

function _pickValueNearDate_(dates, values, targetDate){
  if (!Array.isArray(dates) || !Array.isArray(values) || !dates.length || !values.length) return null;
  if (!(targetDate instanceof Date) || isNaN(targetDate.getTime())) return null;
  const t = targetDate.getTime();
  let best = null;
  let bestDt = Infinity;
  for (let i=0;i<dates.length;i++){
    const d = (dates[i] instanceof Date) ? dates[i] : new Date(dates[i]);
    if (!(d instanceof Date) || isNaN(d.getTime())) continue;
    const dt = Math.abs(d.getTime() - t);
    if (dt < bestDt){
      bestDt = dt;
      best = _safeNum_(values[i]);
    }
  }
  return best;
}

function _getSummaryEndDate_(){
  try{
    if (typeof timeMode !== "undefined" && timeMode === "historic"){
      if (typeof historicUseRange !== "undefined" && historicUseRange && historicRangeEnd instanceof Date && !isNaN(historicRangeEnd.getTime())) return historicRangeEnd;
      if (typeof asOfSnapshot !== "undefined" && asOfSnapshot instanceof Date && !isNaN(asOfSnapshot.getTime())) return asOfSnapshot;
    }
  }catch(_e){}
  return new Date();
}

function _getSummaryStartDate_(end){
  try{
    if (typeof timeMode !== "undefined" && timeMode === "historic" && typeof historicUseRange !== "undefined" && historicUseRange && historicRangeStart instanceof Date && !isNaN(historicRangeStart.getTime())) return historicRangeStart;
  }catch(_e){}

  let days = 7;
  try{
    if (typeof dataCache !== "undefined" && dataCache && dataCache.pastDays != null){
      const d = Number(dataCache.pastDays);
      if (isFinite(d) && d > 0) days = d;
    }
  }catch(_e){}

  return new Date(end.getTime() - days*24*60*60*1000);
}

function bindTextSummaryUi_(){
  if (TEXT_SUMMARY_UI_BOUND) return;
  const panel = document.getElementById("panelTextSummary");
  if (!panel) return;

  const sel = document.getElementById("textSummaryLocationSelect");
  const tplSel = document.getElementById("textSummaryTemplateSelect");
  const btnUseSelected = document.getElementById("btnTextSummaryUseSelected");
  const btnRefresh = document.getElementById("btnTextSummaryRefresh");
  const btnCopy = document.getElementById("btnTextSummaryCopy");
  const btnExport = document.getElementById("btnTextSummaryExport");

  if (!sel || !btnUseSelected || !btnRefresh || !btnCopy || !btnExport) return;

  const prefs = loadTextSummaryPrefs_();
  populateTextSummaryLocationDropdown_(prefs.locId);
  try{
    if (tplSel){
      tplSel.value = prefs.template || "community";
    }
  }catch(_e){}

  sel.addEventListener("change", ()=>{
    const prefs2 = loadTextSummaryPrefs_();
    prefs2.locId = sel.value || null;
    saveTextSummaryPrefs_(prefs2);
    renderTextSummaryPanel_();
  });

  if (tplSel){
    tplSel.addEventListener("change", ()=>{
      const prefs2 = loadTextSummaryPrefs_();
      prefs2.template = tplSel.value || "community";
      saveTextSummaryPrefs_(prefs2);
      renderTextSummaryPanel_();
    });
  }

  btnUseSelected.addEventListener("click", ()=>{
    try{
      if (typeof selectedId !== "undefined" && selectedId){
        sel.value = String(selectedId);
        const prefs2 = loadTextSummaryPrefs_();
        prefs2.locId = sel.value;
        saveTextSummaryPrefs_(prefs2);
        renderTextSummaryPanel_();
      }
    }catch(_e){}
  });

  btnRefresh.addEventListener("click", ()=>renderTextSummaryPanel_(true));

  btnCopy.addEventListener("click", async ()=>{
    try{
      const box = document.getElementById("textSummaryJsonBox");
      const str = (box && box.value) ? String(box.value) : "";
      if (!str) return;
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(str);
        toast("Summary JSON copied");
      }
    }catch(_e){}
  });

  btnExport.addEventListener("click", ()=>{
    try{
      const box = document.getElementById("textSummaryJsonBox");
      const str = (box && box.value) ? String(box.value) : "";
      if (!str) return;
      const end = _getSummaryEndDate_();
      const stamp = (typeof ymdhLocal !== "undefined") ? ymdhLocal(end).replace(/[: ]/g, "_") : (end.toISOString().slice(0,19).replace(/[:T]/g,"-"));
      const fn = `drought_text_summary_${stamp}.json`;
      const blob = new Blob([str], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 2500);
    }catch(_e){}
  });

  TEXT_SUMMARY_UI_BOUND = true;
}

function populateTextSummaryLocationDropdown_(preferId){
  const sel = document.getElementById("textSummaryLocationSelect");
  if (!sel) return;

  const list = [];

  // Prefer computed rows so we only show enabled locations and correct names.
  if (Array.isArray(computed) && computed.length){
    for (const r of computed){
      const loc = _rowLoc_(r);
      if (!loc.id) continue;
      list.push({ id: loc.id, name: loc.name || loc.id });
    }
  }else if (Array.isArray(locations) && locations.length){
    for (const l of locations){
      if (!l || l.id == null) continue;
      const id = String(l.id);
      const name = String(l.name || l.title || l.id);
      list.push({ id, name });
    }
  }

  list.sort((a,b)=>a.name.localeCompare(b.name));

  sel.innerHTML = "";
  for (const it of list){
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = it.name;
    sel.appendChild(opt);
  }

  const id = preferId || (typeof selectedId !== "undefined" ? selectedId : null);
  if (id && list.some(x=>x.id===String(id))) sel.value = String(id);
  else if (list.length) sel.value = list[0].id;
}


function buildTextSummaryReport_(){
  const end = _getSummaryEndDate_();
  const start = _getSummaryStartDate_(end);
  const mode = (typeof timeMode !== "undefined") ? String(timeMode) : "live";
  const rows = Array.isArray(computed) ? computed : [];

  const scores = rows.map(r=>r?.index?.score);
  const meanScore = _mean_(scores);
  const medianScore = _median_(scores);
  const scoreVals = scores.map(_safeNum_).filter(v=>v!=null);
  const minScore = scoreVals.length ? Math.min(...scoreVals) : null;
  const maxScore = scoreVals.length ? Math.max(...scoreVals) : null;

  const cats = {};
  for (const r of rows){
    const c = r?.index?.breakdown?.category || null;
    const key = c ? String(c) : "Unknown";
    cats[key] = (cats[key] || 0) + 1;
  }

  const compKeys = ["rain","soil","evap","humidity","river"];
  const compMeans = {};
  for (const k of compKeys){
    compMeans[k] = _mean_(rows.map(r=>r?.index?.parts?.[k]));
  }

  const metrics = {
    pastRain14_mean_mm: _mean_(rows.map(r=>r?.index?.metrics?.pastRain14)),
    pastRain7_mean_mm: _mean_(rows.map(r=>_sumPastDaysFromDailySeries_(r?.dailySeries, end, 7))),
    forecastRain7_mean_mm: _mean_(rows.map(r=>r?.index?.metrics?.forecastRain7)),
    soilTop_mean: _mean_(rows.map(r=>r?.soil9_27)),
    soilDeep_mean: _mean_(rows.map(r=>r?.soil27_81)),
    et0_7_mean: _mean_(rows.map(r=>r?.index?.metrics?.et0_7)),
    vpdMean_mean: _mean_(rows.map(r=>r?.index?.metrics?.vpdMean)),
    rhMean7_mean: _mean_(rows.map(r=>r?.index?.metrics?.rhMean7))
  };

  const deltas = rows.map(r=>r?.indexTrend?.delta);
  const meanDelta = _mean_(deltas);

  const driest = rows
    .filter(r=>_safeNum_(r?.index?.score)!=null)
    .slice()
    .sort((a,b)=>(_safeNum_(b.index.score)||0)-(_safeNum_(a.index.score)||0))
    .slice(0,5)
    .map(r=>{
      const loc = _rowLoc_(r);
      return {
        id: loc.id,
        name: loc.name,
        score: _safeNum_(r.index.score),
        category: r.index?.breakdown?.category || null
      };
    });

  const worsening = rows
    .filter(r=>_safeNum_(r?.indexTrend?.delta)!=null)
    .slice()
    .sort((a,b)=>(_safeNum_(b.indexTrend.delta)||0)-(_safeNum_(a.indexTrend.delta)||0))
    .slice(0,5)
    .map(r=>{
      const loc = _rowLoc_(r);
      return {
        id: loc.id,
        name: loc.name,
        delta: _safeNum_(r.indexTrend.delta),
        label: r.indexTrend?.label || null
      };
    });

  const improving = rows
    .filter(r=>_safeNum_(r?.indexTrend?.delta)!=null)
    .slice()
    .sort((a,b)=>(_safeNum_(a.indexTrend.delta)||0)-(_safeNum_(b.indexTrend.delta)||0))
    .slice(0,5)
    .map(r=>{
      const loc = _rowLoc_(r);
      return {
        id: loc.id,
        name: loc.name,
        delta: _safeNum_(r.indexTrend.delta),
        label: r.indexTrend?.label || null
      };
    });

  let riverStressNow=null, riverStressDelta=null, gwStressNow=null, gwStressDelta=null;
  try{
    if (typeof districtHydroTrend !== "undefined" && districtHydroTrend){
      if (districtHydroTrend.river && Array.isArray(districtHydroTrend.river.values) && districtHydroTrend.river.values.length){
        const vNow = _safeNum_(districtHydroTrend.river.values[districtHydroTrend.river.values.length-1]);
        const vStart = _pickValueNearDate_(districtHydroTrend.river.dates, districtHydroTrend.river.values, start);
        riverStressNow = vNow;
        if (vNow!=null && vStart!=null) riverStressDelta = vNow - vStart;
      }
      if (districtHydroTrend.gw && Array.isArray(districtHydroTrend.gw.values) && districtHydroTrend.gw.values.length){
        const vNow = _safeNum_(districtHydroTrend.gw.values[districtHydroTrend.gw.values.length-1]);
        const vStart = _pickValueNearDate_(districtHydroTrend.gw.dates, districtHydroTrend.gw.values, start);
        gwStressNow = vNow;
        if (vNow!=null && vStart!=null) gwStressDelta = vNow - vStart;
      }
    }
  }catch(_e){}

  const hybridEnabled = !!(typeof droughtConfig !== "undefined" && droughtConfig && droughtConfig.useRiverHybridForIndex);
  let hybridPossible = 0;
  let hybridApplied = 0;
  try{
    if (hybridEnabled && typeof dataCache !== "undefined" && dataCache && Array.isArray(dataCache.riverForLoc) && Array.isArray(locations)){
      for (let i=0;i<locations.length;i++){
        const g = dataCache.riverForLoc[i];
        if (g && g.site) hybridPossible++;
        const ov = (typeof getRiverIndexOverrideForLocationIndex_ === "function") ? getRiverIndexOverrideForLocationIndex_(i) : null;
        if (ov) hybridApplied++;
      }
    }
  }catch(_e){}

  const locRecs = rows.map(r=>{
    const loc = _rowLoc_(r);
    const m = r?.index?.metrics || {};

    const river = r?.riverGauge?.site ? {
      title: r.riverGauge.site.title || null,
      distanceKm: _safeNum_(r.riverGauge.distanceKm),
      flow: _safeNum_(r.riverGauge.site.flow),
      flowUnits: r.riverGauge.site.flowUnits || null,
      level: _safeNum_(r.riverGauge.site.level),
      levelUnits: r.riverGauge.site.levelUnits || null,
      when: r.riverGauge.site.flowWhen || r.riverGauge.site.levelWhen || null,
      percentDiffDMF: _safeNum_(r.riverGauge.site.percentDiffDMF)
    } : null;

    const gw = r?.gwGauge?.site ? {
      title: r.gwGauge.site.title || null,
      distanceKm: _safeNum_(r.gwGauge.distanceKm),
      level: _safeNum_(r.gwGauge.site.level),
      levelUnits: r.gwGauge.site.levelUnits || null,
      when: r.gwGauge.site.levelWhen || null,
      percentDiffMedian: _safeNum_(r.gwGauge.site.percentDiffMedian)
    } : null;

    return {
      id: loc.id,
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      index: {
        score: _safeNum_(r?.index?.score),
        category: r?.index?.breakdown?.category || null
      },
      indexTrend: {
        delta: _safeNum_(r?.indexTrend?.delta),
        label: r?.indexTrend?.label || null
      },
      components_0wet_1dry: {
        rain: _safeNum_(r?.index?.parts?.rain),
        soil: _safeNum_(r?.index?.parts?.soil),
        evap: _safeNum_(r?.index?.parts?.evap),
        humidity: _safeNum_(r?.index?.parts?.humidity),
        river: _safeNum_(r?.index?.parts?.river)
      },
      metrics: {
        pastRain14_mm: _safeNum_(m.pastRain14),
        pastRain7_mm: _sumPastDaysFromDailySeries_(r?.dailySeries, end, 7),
        forecastRain7_mm: _safeNum_(m.forecastRain7),
        soilTop: _safeNum_(r?.soil9_27),
        soilDeep: _safeNum_(r?.soil27_81),
        et0_7: _safeNum_(m.et0_7),
        vpdMean: _safeNum_(m.vpdMean),
        rhMean7: _safeNum_(m.rhMean7),
        riverNow: _safeNum_(m.riverNow),
        riverUnit: m.riverUnit || null,
        riverSource: m.riverSource || null
      },
      riverGauge: river,
      groundwaterGauge: gw
    };
  });

  const meta = {
    exportedAtUtcISO: new Date().toISOString(),
    mode,
    rangeStartLocal: (typeof ymdLocal !== "undefined") ? ymdLocal(start) : start.toISOString().slice(0,10),
    rangeEndLocal: (typeof ymdLocal !== "undefined") ? ymdLocal(end) : end.toISOString().slice(0,10),
    pastDays: (typeof dataCache !== "undefined" && dataCache) ? dataCache.pastDays : null,
    forecastDays: (typeof dataCache !== "undefined" && dataCache) ? dataCache.forecastDays : null,
    settings: {
      useRiverHybridForIndex: hybridEnabled,
      thresholds: (typeof droughtConfig !== "undefined" && droughtConfig) ? droughtConfig.thresholds : null,
      weights: (typeof droughtConfig !== "undefined" && droughtConfig) ? droughtConfig.weights : null
    }
  };

  return {
    meta,
    district: {
      nLocations: rows.length,
      index: {
        mean: meanScore,
        median: medianScore,
        min: minScore,
        max: maxScore
      },
      categories: cats,
      meanIndexDelta: meanDelta,
      componentMeans_0wet_1dry: compMeans,
      metrics,
      hydroStress: {
        river_now_0_100: riverStressNow,
        river_delta_over_window: riverStressDelta,
        groundwater_now_0_100: gwStressNow,
        groundwater_delta_over_window: gwStressDelta
      },
      riverHybrid: {
        enabled: hybridEnabled,
        possibleLocationsWithGauge: hybridPossible,
        appliedOverrideAvailable: hybridApplied
      },
      topDriest: driest,
      topWorsening: worsening,
      topImproving: improving
    },
    locations: locRecs
  };
}


function buildDistrictSummaryText_(rep){
  const m = rep?.meta || {};
  const d = rep?.district || {};
  const idx = d.index || {};
  const comp = d.componentMeans_0wet_1dry || {};
  const met = d.metrics || {};
  const hs = d.hydroStress || {};
  const hy = d.riverHybrid || {};

  const range = `${m.rangeStartLocal} to ${m.rangeEndLocal}`;
  const meanScore = idx.mean != null ? fmt(idx.mean, 0) : "n/a";
  const catLine = Object.keys(d.categories||{}).map(k=>`${k}:${d.categories[k]}`).join(", ");

  const lines = [];
  lines.push(`District Summary (Facts Only)`);
  lines.push(`Mode: ${m.mode || "live"}    Period: ${range}`);
  if (hy.enabled){
    lines.push(`River Discharge Hybrid For Index: enabled (${hy.appliedOverrideAvailable}/${hy.possibleLocationsWithGauge} locations with gauge have an override)`);
  }else{
    lines.push(`River Discharge Hybrid For Index: disabled (modelled discharge used for index)`);
  }
  lines.push("");

  lines.push("Current Conditions");
  lines.push(`- District mean index: ${meanScore} (min ${idx.min!=null?fmt(idx.min,0):"n/a"}, max ${idx.max!=null?fmt(idx.max,0):"n/a"})`);
  if (catLine) lines.push(`- Category counts: ${catLine}`);
  if (met.pastRain14_mean_mm!=null){
    lines.push(`- Recent rain: ${fmt(met.pastRain14_mean_mm,1)} mm (14d mean), ${met.pastRain7_mean_mm!=null?fmt(met.pastRain7_mean_mm,1):"n/a"} mm (7d mean)`);
  }
  if (met.forecastRain7_mean_mm!=null) lines.push(`- Forecast rain: ${fmt(met.forecastRain7_mean_mm,1)} mm (next 7d mean)`);
  if (met.soilTop_mean!=null || met.soilDeep_mean!=null){
    lines.push(`- Soil moisture: top ${met.soilTop_mean!=null?fmt(met.soilTop_mean,3):"n/a"}, deep ${met.soilDeep_mean!=null?fmt(met.soilDeep_mean,3):"n/a"} (district means)`);
  }
  if (met.et0_7_mean!=null || met.vpdMean_mean!=null || met.rhMean7_mean!=null){
    lines.push(`- Evap and atmosphere: ET0 ${met.et0_7_mean!=null?fmt(met.et0_7_mean,1):"n/a"} mm/7d, VPD ${met.vpdMean_mean!=null?fmt(met.vpdMean_mean,2):"n/a"} kPa, RH ${met.rhMean7_mean!=null?fmt(met.rhMean7_mean,0):"n/a"}% (district means)`);
  }
  if (hs.river_now_0_100!=null) lines.push(`- River stress (district): ${fmt(hs.river_now_0_100,0)} / 100 (${_fmtDelta_(hs.river_delta_over_window,0)} over window)`);
  if (hs.groundwater_now_0_100!=null) lines.push(`- Groundwater stress (district): ${fmt(hs.groundwater_now_0_100,0)} / 100 (${_fmtDelta_(hs.groundwater_delta_over_window,0)} over window)`);
  if (Array.isArray(d.topDriest) && d.topDriest.length){
    lines.push(`- Driest locations: ${d.topDriest.map(x=>`${x.name} ${x.score!=null?fmt(x.score,0):""}`.trim()).join(", ")}`);
  }
  lines.push("");

  lines.push("Past Period (Change And Drivers)");
  if (d.meanIndexDelta!=null) lines.push(`- Mean index change: ${_fmtDelta_(d.meanIndexDelta,1)} points`);
  lines.push(`- Component dryness (0 wet, 1 dry): rain ${comp.rain!=null?fmt(comp.rain,2):"n/a"}, soil ${comp.soil!=null?fmt(comp.soil,2):"n/a"}, evap ${comp.evap!=null?fmt(comp.evap,2):"n/a"}, humidity ${comp.humidity!=null?fmt(comp.humidity,2):"n/a"}, river ${comp.river!=null?fmt(comp.river,2):"n/a"}`);
  if (Array.isArray(d.topWorsening) && d.topWorsening.length){
    const label = d.topWorsening[0].label ? ` (${d.topWorsening[0].label})` : "";
    lines.push(`- Most drying locations${label}: ${d.topWorsening.map(x=>`${x.name} ${_fmtDelta_(x.delta,1)}`).join(", ")}`);
  }
  if (Array.isArray(d.topImproving) && d.topImproving.length){
    const label = d.topImproving[0].label ? ` (${d.topImproving[0].label})` : "";
    lines.push(`- Most easing locations${label}: ${d.topImproving.map(x=>`${x.name} ${_fmtDelta_(x.delta,1)}`).join(", ")}`);
  }
  lines.push("");

  lines.push("Outlook (Forecast Signals)");
  if (typeof timeMode !== "undefined" && timeMode === "historic" && typeof historicUseRange !== "undefined" && historicUseRange){
    lines.push("- Forecast signals may not be available in historic range mode");
  }else{
    if (met.forecastRain7_mean_mm!=null) lines.push(`- Mean forecast rain (7d): ${fmt(met.forecastRain7_mean_mm,1)} mm`);
    if (met.et0_7_mean!=null) lines.push(`- Mean evap demand (ET0 7d): ${fmt(met.et0_7_mean,1)} mm/7d`);
    if (met.vpdMean_mean!=null) lines.push(`- Mean VPD: ${fmt(met.vpdMean_mean,2)} kPa`);
  }

  return lines.join("\n");
}

function _drynessLabel_(v){
  const n = _safeNum_(v);
  if (n == null) return "n/a";
  if (n <= 0.25) return "Wet";
  if (n <= 0.50) return "Near Normal";
  if (n <= 0.75) return "Dry";
  return "Very Dry";
}

function _majorityCategory_(cats){
  try{
    const entries = Object.entries(cats||{});
    if (!entries.length) return null;
    entries.sort((a,b)=>(b[1]||0)-(a[1]||0));
    return entries[0][0] || null;
  }catch(_e){
    return null;
  }
}

function _rankDrivers_(weightsObj, drynessObj){
  const w = weightsObj || {};
  const d = drynessObj || {};
  const keyName = {
    rain: "Rain",
    soil: "Soil Moisture",
    evap: "Evap Demand",
    humidity: "Humidity",
    river: "River Flows"
  };
  const keys = ["rain","soil","evap","humidity","river"];
  const arr = [];
  for (const k of keys){
    const weight = _safeNum_(w[k]);
    const dry = _safeNum_(d[k]);
    if (weight == null || weight <= 0 || dry == null) continue;
    arr.push({
      key: k,
      name: keyName[k] || k,
      weight,
      dryness: dry,
      influence: weight * dry
    });
  }
  arr.sort((a,b)=>(b.influence||0)-(a.influence||0));
  return arr;
}

function buildDistrictSummaryCommunityText_(rep){
  const m = rep?.meta || {};
  const d = rep?.district || {};
  const idx = d.index || {};
  const comp = d.componentMeans_0wet_1dry || {};
  const met = d.metrics || {};
  const hy = d.riverHybrid || {};

  const range = `${m.rangeStartLocal} to ${m.rangeEndLocal}`;
  const mode = m.mode || "live";
  const meanScore = idx.mean != null ? fmt(idx.mean, 0) : "n/a";
  const minScore = idx.min != null ? fmt(idx.min, 0) : "n/a";
  const maxScore = idx.max != null ? fmt(idx.max, 0) : "n/a";
  const majCat = _majorityCategory_(d.categories) || "Unknown";

  const drivers = _rankDrivers_(m?.settings?.weights, comp);
  const driverTxt = drivers.slice(0,2).map(x=>`${x.name} (${_drynessLabel_(x.dryness)})`).join(" and ");

  let deltaLabel = null;
  try{
    deltaLabel = (Array.isArray(d.topWorsening) && d.topWorsening[0] && d.topWorsening[0].label) ? d.topWorsening[0].label : null;
    if (!deltaLabel) deltaLabel = (Array.isArray(d.topImproving) && d.topImproving[0] && d.topImproving[0].label) ? d.topImproving[0].label : null;
  }catch(_e){}

  const delta = _safeNum_(d.meanIndexDelta);
  let deltaSentence = "Overall conditions are broadly similar.";
  if (delta != null){
    const abs = Math.abs(delta);
    if (abs < 0.3){
      deltaSentence = "Overall conditions are broadly similar.";
    }else if (delta > 0){
      deltaSentence = `Overall conditions have become drier by about ${fmt(abs,1)} points.`;
    }else{
      deltaSentence = `Overall conditions have eased slightly by about ${fmt(abs,1)} points.`;
    }
  }

  const nLoc = d.nLocations != null ? d.nLocations : (Array.isArray(rep?.locations) ? rep.locations.length : 0);

  const lines = [];
  lines.push("Far North Drought Update");
  lines.push(`Period: ${range} (${mode})`);
  lines.push("");

  lines.push("Current Conditions");
  lines.push(`Across ${nLoc} tracked locations, the average drought index is ${meanScore} and most locations are in the ${majCat} range. Values range from ${minScore} to ${maxScore}.`);
  lines.push("Higher numbers mean drier conditions and the index runs from 0 to 100.");
  if (met.pastRain14_mean_mm!=null && met.pastRain7_mean_mm!=null){
    lines.push(`Recent rainfall is about ${fmt(met.pastRain14_mean_mm,1)} mm over the last 14 days on average and ${fmt(met.pastRain7_mean_mm,1)} mm over the last 7 days.`);
  }else if (met.pastRain14_mean_mm!=null){
    lines.push(`Recent rainfall is about ${fmt(met.pastRain14_mean_mm,1)} mm over the last 14 days on average.`);
  }
  if (driverTxt){
    lines.push(`The strongest dry signals in the index are ${driverTxt}.`);
  }
  if (Array.isArray(d.topDriest) && d.topDriest.length){
    lines.push(`Highest index locations: ${d.topDriest.map(x=>`${x.name} (${x.score!=null?fmt(x.score,0):"n/a"})`).join(", ")}.`);
  }
  lines.push("");

  lines.push("Past Period");
  lines.push(`${deltaLabel ? `Over the last ${deltaLabel}, ` : "Over the last period, "}${deltaSentence}`);
  if (Array.isArray(d.topWorsening) && d.topWorsening.length){
    lines.push(`Areas drying fastest: ${d.topWorsening.map(x=>`${x.name} (${_fmtDelta_(x.delta,1)})`).join(", ")}.`);
  }
  if (Array.isArray(d.topImproving) && d.topImproving.length){
    lines.push(`Areas easing the most: ${d.topImproving.map(x=>`${x.name} (${_fmtDelta_(x.delta,1)})`).join(", ")}.`);
  }
  lines.push("");

  lines.push("Outlook");
  if (typeof timeMode !== "undefined" && timeMode === "historic" && typeof historicUseRange !== "undefined" && historicUseRange){
    lines.push("Forecast signals may be limited in historic range mode.");
  }else{
    if (met.forecastRain7_mean_mm!=null && met.et0_7_mean!=null){
      const net = _safeNum_(met.forecastRain7_mean_mm) - _safeNum_(met.et0_7_mean);
      const netTxt = (net!=null) ? (net >= 0 ? `a potential surplus of about ${fmt(net,1)} mm` : `a potential shortfall of about ${fmt(Math.abs(net),1)} mm`) : "";
      lines.push(`Forecast rain over the next 7 days averages ${fmt(met.forecastRain7_mean_mm,1)} mm and potential evaporation averages ${fmt(met.et0_7_mean,1)} mm over the same period, leaving ${netTxt}.`);
    }else if (met.forecastRain7_mean_mm!=null){
      lines.push(`Forecast rain over the next 7 days averages ${fmt(met.forecastRain7_mean_mm,1)} mm.`);
    }
    if (met.vpdMean_mean!=null){
      lines.push(`Air dryness signal (VPD) averages ${fmt(met.vpdMean_mean,2)} kPa.`);
    }
  }
  lines.push("");

  lines.push("Data Notes");
  if (hy && hy.enabled){
    lines.push(`River discharge uses hybrid gauge scaling for index contribution when a river gauge is available (${hy.appliedOverrideAvailable}/${hy.possibleLocationsWithGauge} locations).`);
  }else{
    lines.push("River discharge uses modelled values for index contribution.");
  }

  return lines.join("\n");
}


function buildLocationSummaryText_(rep, locId){
  const rows = Array.isArray(rep?.locations) ? rep.locations : [];
  let rec = null;

  try{
    if (locId != null){
      rec = rows.find(r => String(r.id) === String(locId)) || null;
    }
    if (!rec && rows.length) rec = rows[0];
  }catch(_e){
    rec = rows.length ? rows[0] : null;
  }

  if (!rec) return "Select a location to generate a summary";

  const m = rep?.meta || {};
  const range = `${m.rangeStartLocal} to ${m.rangeEndLocal}`;
  const idx = rec.index || {};
  const tr = rec.indexTrend || {};
  const met = rec.metrics || {};
  const comp = rec.components_0wet_1dry || {};

  const lines = [];
  lines.push(`${rec.name || rec.id || "Location"} (Facts Only)`);
  lines.push(`Period: ${range}`);
  lines.push("");

  lines.push("Current Conditions");
  lines.push(`- Drought index: ${idx.score!=null?fmt(idx.score,0):"n/a"} (${idx.category||"Unknown"})`);
  if (tr.delta!=null) lines.push(`- Trend: ${_fmtDelta_(tr.delta,1)} points (${tr.label||"window"})`);
  if (met.pastRain14_mm!=null){
    lines.push(`- Rain: ${fmt(met.pastRain14_mm,1)} mm (past 14d), ${met.pastRain7_mm!=null?fmt(met.pastRain7_mm,1):"n/a"} mm (past 7d), forecast ${met.forecastRain7_mm!=null?fmt(met.forecastRain7_mm,1):"n/a"} mm (next 7d)`);
  }
  if (met.soilTop!=null || met.soilDeep!=null){
    lines.push(`- Soil moisture: top ${met.soilTop!=null?fmt(met.soilTop,3):"n/a"}, deep ${met.soilDeep!=null?fmt(met.soilDeep,3):"n/a"}`);
  }
  if (met.et0_7!=null || met.vpdMean!=null || met.rhMean7!=null){
    lines.push(`- Evap and atmosphere: ET0 ${met.et0_7!=null?fmt(met.et0_7,1):"n/a"} mm/7d, VPD ${met.vpdMean!=null?fmt(met.vpdMean,2):"n/a"} kPa, RH ${met.rhMean7!=null?fmt(met.rhMean7,0):"n/a"}%`);
  }
  if (met.riverNow!=null){
    const u = met.riverUnit ? ` ${met.riverUnit}` : "";
    const src = met.riverSource ? ` (source ${met.riverSource})` : "";
    lines.push(`- River discharge (index input): ${fmt(met.riverNow,3)}${u}${src}`);
  }
  if (rec.riverGauge){
    const g = rec.riverGauge;
    const fu = g.flowUnits ? ` ${g.flowUnits}` : "";
    const lu = g.levelUnits ? ` ${g.levelUnits}` : "";
    const flowTxt = (g.flow!=null) ? `${fmt(g.flow,3)}${fu}` : "n/a";
    const lvlTxt = (g.level!=null) ? `${fmt(g.level,3)}${lu}` : "n/a";
    const dist = (g.distanceKm!=null) ? `${fmt(g.distanceKm,1)} km` : "n/a";
    lines.push(`- River gauge: ${g.title || "Gauge"} (${dist}) flow ${flowTxt}, level ${lvlTxt}`);
  }
  if (rec.groundwaterGauge){
    const g = rec.groundwaterGauge;
    const lu = g.levelUnits ? ` ${g.levelUnits}` : "";
    const lvlTxt = (g.level!=null) ? `${fmt(g.level,3)}${lu}` : "n/a";
    const dist = (g.distanceKm!=null) ? `${fmt(g.distanceKm,1)} km` : "n/a";
    lines.push(`- Groundwater: ${g.title || "Well"} (${dist}) level ${lvlTxt}`);
  }

  lines.push(`- Component dryness (0 wet, 1 dry): rain ${comp.rain!=null?fmt(comp.rain,2):"n/a"}, soil ${comp.soil!=null?fmt(comp.soil,2):"n/a"}, evap ${comp.evap!=null?fmt(comp.evap,2):"n/a"}, humidity ${comp.humidity!=null?fmt(comp.humidity,2):"n/a"}, river ${comp.river!=null?fmt(comp.river,2):"n/a"}`);
  lines.push("");

  lines.push("Past Period (Change And Drivers)");
  if (tr.delta!=null) lines.push(`- Index change over window: ${_fmtDelta_(tr.delta,1)} points`);
  lines.push("");

  lines.push("Outlook (Forecast Signals)");
  if (typeof timeMode !== "undefined" && timeMode === "historic" && typeof historicUseRange !== "undefined" && historicUseRange){
    lines.push("- Forecast signals may not be available in historic range mode");
  }else{
    if (met.forecastRain7_mm!=null) lines.push(`- Forecast rain (7d): ${fmt(met.forecastRain7_mm,1)} mm`);
    if (met.et0_7!=null) lines.push(`- Evap demand (ET0 7d): ${fmt(met.et0_7,1)} mm/7d`);
    if (met.vpdMean!=null) lines.push(`- VPD: ${fmt(met.vpdMean,2)} kPa`);
  }

  return lines.join("\n");
}

function buildLocationSummaryCommunityText_(rep, locId){
  const rows = Array.isArray(rep?.locations) ? rep.locations : [];
  let rec = null;

  try{
    if (locId != null){
      rec = rows.find(r => String(r.id) === String(locId)) || null;
    }
    if (!rec && rows.length) rec = rows[0];
  }catch(_e){
    rec = rows.length ? rows[0] : null;
  }

  if (!rec) return "Select a location to generate a summary";

  const m = rep?.meta || {};
  const range = `${m.rangeStartLocal} to ${m.rangeEndLocal}`;
  const idx = rec.index || {};
  const tr = rec.indexTrend || {};
  const met = rec.metrics || {};
  const comp = rec.components_0wet_1dry || {};

  const score = idx.score!=null ? fmt(idx.score,0) : "n/a";
  const cat = idx.category || "Unknown";

  const drivers = _rankDrivers_(m?.settings?.weights, comp);
  const driverTxt = drivers.slice(0,2).map(x=>`${x.name} (${_drynessLabel_(x.dryness)})`).join(" and ");

  let deltaSentence = "Conditions are similar to the recent period.";
  const delta = _safeNum_(tr.delta);
  if (delta != null){
    const abs = Math.abs(delta);
    if (abs < 0.3){
      deltaSentence = "Conditions are similar to the recent period.";
    }else if (delta > 0){
      deltaSentence = `Conditions have become drier by about ${fmt(abs,1)} points.`;
    }else{
      deltaSentence = `Conditions have eased slightly by about ${fmt(abs,1)} points.`;
    }
  }

  const lines = [];
  lines.push(`${rec.name || rec.id || "Location"} Drought Update`);
  lines.push(`Period: ${range}`);
  lines.push("");

  lines.push("Current Conditions");
  lines.push(`The drought index is ${score} and this location is in the ${cat} range.`);
  lines.push("Higher numbers mean drier conditions and the index runs from 0 to 100.");
  if (tr.delta!=null){
    lines.push(`Trend: ${_fmtDelta_(tr.delta,1)} points over ${tr.label||"the window"}.`);
  }
  if (met.pastRain14_mm!=null && met.pastRain7_mm!=null){
    lines.push(`Rainfall has been about ${fmt(met.pastRain14_mm,1)} mm over the last 14 days and ${fmt(met.pastRain7_mm,1)} mm over the last 7 days.`);
  }else if (met.pastRain14_mm!=null){
    lines.push(`Rainfall has been about ${fmt(met.pastRain14_mm,1)} mm over the last 14 days.`);
  }
  if (driverTxt){
    lines.push(`The strongest dry signals in the index are ${driverTxt}.`);
  }
  if (met.riverNow!=null){
    const u = met.riverUnit ? ` ${met.riverUnit}` : "";
    const src = met.riverSource ? ` (${met.riverSource})` : "";
    lines.push(`River discharge used in the index is ${fmt(met.riverNow,3)}${u}${src}.`);
  }
  if (rec.riverGauge && rec.riverGauge.title){
    const g = rec.riverGauge;
    const dist = (g.distanceKm!=null) ? `${fmt(g.distanceKm,1)} km` : "n/a";
    const flow = (g.flow!=null && g.flowUnits) ? `${fmt(g.flow,3)} ${g.flowUnits}` : (g.flow!=null ? fmt(g.flow,3) : "n/a");
    lines.push(`Nearest river gauge is ${g.title} (${dist}), currently ${flow}.`);
  }
  if (rec.groundwaterGauge && rec.groundwaterGauge.title){
    const g = rec.groundwaterGauge;
    const dist = (g.distanceKm!=null) ? `${fmt(g.distanceKm,1)} km` : "n/a";
    const lvlTxt = (g.level!=null && g.levelUnits) ? `${fmt(g.level,2)} ${g.levelUnits}` : (g.level!=null ? fmt(g.level,2) : "n/a");
    lines.push(`Nearest groundwater monitor is ${g.title} (${dist}), level ${lvlTxt}.`);
  }
  lines.push("");

  lines.push("Past Period");
  lines.push(deltaSentence);
  lines.push("");

  lines.push("Outlook");
  if (typeof timeMode !== "undefined" && timeMode === "historic" && typeof historicUseRange !== "undefined" && historicUseRange){
    lines.push("Forecast signals may be limited in historic range mode.");
  }else{
    if (met.forecastRain7_mm!=null && met.et0_7!=null){
      const net = _safeNum_(met.forecastRain7_mm) - _safeNum_(met.et0_7);
      const netTxt = (net!=null) ? (net >= 0 ? `a potential surplus of about ${fmt(net,1)} mm` : `a potential shortfall of about ${fmt(Math.abs(net),1)} mm`) : "";
      lines.push(`Forecast rain over the next 7 days is ${fmt(met.forecastRain7_mm,1)} mm and potential evaporation is ${fmt(met.et0_7,1)} mm over the same period, leaving ${netTxt}.`);
    }else if (met.forecastRain7_mm!=null){
      lines.push(`Forecast rain over the next 7 days is ${fmt(met.forecastRain7_mm,1)} mm.`);
    }
    if (met.vpdMean!=null){
      lines.push(`Air dryness signal (VPD) is ${fmt(met.vpdMean,2)} kPa.`);
    }
  }

  return lines.join("\n");
}

function renderTextSummaryTable_(rep){
  const wrap = document.getElementById("textSummaryTableWrap");
  if (!wrap) return;
  const rows = Array.isArray(rep?.locations) ? rep.locations : [];

  const top = rows
    .filter(r=>_safeNum_(r?.index?.score)!=null)
    .slice()
    .sort((a,b)=>(_safeNum_(b.index.score)||0)-(_safeNum_(a.index.score)||0))
    .slice(0,20);

  let html = `<div class="tableWrap" style="overflow-x:auto;">`;
  html += `<table class="tblMini"><thead><tr>`
    + `<th>Location</th><th class="mono">Index</th><th>Category</th><th class="mono">Δ</th>`
    + `<th class="mono">Rain14</th><th class="mono">Rain7</th><th class="mono">Fcst7</th>`
    + `<th class="mono">SoilTop</th><th class="mono">SoilDeep</th>`
    + `<th class="mono">ET0_7</th><th class="mono">VPD</th><th>River Src</th><th class="mono">River Now</th>`
    + `</tr></thead><tbody>`;

  for (const r of top){
    const m = r.metrics || {};
    html += `<tr>`
      + `<td>${escapeHtml(r.name||"")}</td>`
      + `<td class="mono">${r.index?.score!=null?escapeHtml(fmt(r.index.score,0)):"-"}</td>`
      + `<td>${escapeHtml(r.index?.category||"")}</td>`
      + `<td class="mono">${r.indexTrend && r.indexTrend.delta!=null?escapeHtml(_fmtDelta_(r.indexTrend.delta,1)):"-"}</td>`
      + `<td class="mono">${m.pastRain14_mm!=null?escapeHtml(fmt(m.pastRain14_mm,1)):"-"}</td>`
      + `<td class="mono">${m.pastRain7_mm!=null?escapeHtml(fmt(m.pastRain7_mm,1)):"-"}</td>`
      + `<td class="mono">${m.forecastRain7_mm!=null?escapeHtml(fmt(m.forecastRain7_mm,1)):"-"}</td>`
      + `<td class="mono">${m.soilTop!=null?escapeHtml(fmt(m.soilTop,3)):"-"}</td>`
      + `<td class="mono">${m.soilDeep!=null?escapeHtml(fmt(m.soilDeep,3)):"-"}</td>`
      + `<td class="mono">${m.et0_7!=null?escapeHtml(fmt(m.et0_7,1)):"-"}</td>`
      + `<td class="mono">${m.vpdMean!=null?escapeHtml(fmt(m.vpdMean,2)):"-"}</td>`
      + `<td>${escapeHtml(m.riverSource||"")}</td>`
      + `<td class="mono">${m.riverNow!=null?escapeHtml(fmt(m.riverNow,3)) + (m.riverUnit?(" " + escapeHtml(m.riverUnit)):"") : "-"}</td>`
      + `</tr>`;
  }

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;
}


function renderTextSummaryPanel_(force){
  try{
    bindTextSummaryUi_();
    // Keep dropdown fresh as layouts are edited
    populateTextSummaryLocationDropdown_(loadTextSummaryPrefs_().locId);
  }catch(_e){}

  if (!_panelVisible_("panelTextSummary") && !force) return;

  const hint = document.getElementById("textSummaryHint");
  const outDistrict = document.getElementById("textDistrictSummaryWrap");
  const outLoc = document.getElementById("textLocationSummaryWrap");
  const outJson = document.getElementById("textSummaryJsonBox");

  const rep = buildTextSummaryReport_();

  try{
    if (hint){
      const m = rep.meta || {};
      hint.textContent = `${m.mode || "live"}    ${m.rangeStartLocal} to ${m.rangeEndLocal}`;
    }
  }catch(_e){}

  // Template selection
  let template = "community";
  try{
    const prefs = loadTextSummaryPrefs_();
    template = (prefs && prefs.template) ? String(prefs.template) : template;
    const tplSel = document.getElementById("textSummaryTemplateSelect");
    if (tplSel && tplSel.value) template = String(tplSel.value);
  }catch(_e){}

  if (outDistrict){
    outDistrict.textContent = (template === "facts")
      ? buildDistrictSummaryText_(rep)
      : buildDistrictSummaryCommunityText_(rep);
  }

  const sel = document.getElementById("textSummaryLocationSelect");
  const locId = sel ? (sel.value || null) : (loadTextSummaryPrefs_().locId || null);
  if (outLoc){
    outLoc.textContent = (template === "facts")
      ? buildLocationSummaryText_(rep, locId)
      : buildLocationSummaryCommunityText_(rep, locId);
  }

  try{
    if (outJson) outJson.value = JSON.stringify(rep, null, 2);
  }catch(_e){}

  try{ renderTextSummaryTable_(rep); }catch(_e){}
}

function textSummaryNotifySelectionChanged_(){
  try{
    if (_panelVisible_("panelTextSummary")){
      populateTextSummaryLocationDropdown_(typeof selectedId !== "undefined" ? selectedId : null);
      renderTextSummaryPanel_();
    }
  }catch(_e){}
}

try{ window.textSummaryNotifySelectionChanged_ = textSummaryNotifySelectionChanged_; }catch(_e){}

/***********************
 * Tabs, Modules, Submodules
 ***********************/
const TAB_LAYOUT_KEY = "fn_drought_tabs_layout_v1";

const TAB_REGISTRY = {
  modules: {
    district: {
      title: "District Summary",
      containerId: "panelDistrict",
      submodules: [
        "district_kpis",
        "district_trend",
        "district_env",
        "loc_index_trend",
        "climate_drivers",
        "hydro_stress",
        "hydro_readings",
        "hydro_response",
        "hydro_analysis"
      ]
    },
    map: {
      title: "Map",
      containerId: "panelMap",
      submodules: ["map_view"]
    },
    locations: {
      title: "Locations",
      containerId: "panelLocations",
      submodules: ["locations_table", "locations_detail"]
    },
    events: {
      title: "Events",
      containerId: "panelEvents",
      submodules: ["events_timeline", "events_table"]
    },

    text_summary: {
      title: "Text Summary",
      containerId: "panelTextSummary",
      submodules: ["text_district_struct", "text_location_summary", "text_summary_data"]
    }
  },
  submodules: {
    district_kpis: {
      title: "District Summary Cards",
      nodes: ["districtKpiGrid"],
      requires: ["district"]
    },
    district_trend: {
      title: "District Trend",
      nodes: ["districtTrendCard"],
      requires: ["district"]
    },
    district_env: {
      title: "District Weather And Environment Trend",
      nodes: ["districtEnvCard"],
      requires: ["district"]
    },
    hydro_stress: {
      title: "District River And Groundwater Stress Trend",
      nodes: ["districtHydroStressCard"],
      requires: ["district"]
    },
    loc_index_trend: {
      title: "Location Index Trend",
      nodes: ["locIndexTrendCard"],
      requires: ["district"]
    },
    climate_drivers: {
      title: "Climate Drivers And Plume Signal",
      nodes: ["districtClimateCard"],
      requires: ["district"]
    },
    hydro_readings: {
      title: "District Hydrology Readings Over Time",
      nodes: ["districtHydroReadingsCard"],
      requires: ["district"]
    },
    hydro_response: {
      title: "River Response Summary",
      nodes: ["districtHydroResponseSummaryCard"],
      requires: ["district"]
    },
    hydro_analysis: {
      title: "River Handling And Response Analysis",
      nodes: ["districtHydroAnalysisWrap", "districtHydroAnalysisFullTableCard"],
      requires: ["district"]
    },

    map_view: {
      title: "Map View",
      nodes: ["map"],
      requires: ["map"]
    },

    locations_table: {
      title: "Locations Table",
      nodes: ["tableWrap"],
      requires: ["locations"]
    },
    locations_detail: {
      title: "Details Panel",
      nodes: ["detailPanel"],
      requires: ["locations"]
    },

    events_timeline: {
      title: "Events Timeline",
      nodes: ["eventsTimelineCard"],
      requires: ["events"]
    },
    events_table: {
      title: "Events Table",
      nodes: ["eventsTableCard"],
      requires: ["events"]
    },

    text_district_struct: {
      title: "District Summary (Structured)",
      nodes: ["textDistrictSummaryCard"],
      requires: ["text_summary"]
    },
    text_location_summary: {
      title: "Location Summary",
      nodes: ["textLocationSummaryCard"],
      requires: ["text_summary"]
    },
    text_summary_data: {
      title: "Summary Data",
      nodes: ["textSummaryDataCard"],
      requires: ["text_summary"]
    }
  }
};

let TAB_LAYOUT = null;
let TAB_EDIT_MODE = false;
try{ document.documentElement.setAttribute("data-tab-edit-mode", "0"); }catch(_e){}

// Dynamic Content Display Modules
const CONTENT_DISPLAY_NEW_ID = "__new_content_display__";
const CONTENT_DISPLAY_NEXT_KEY = "fn_drought_content_display_nextnum_v1";

function _parseContentDisplayNumber_(id){
  const m = String(id || "").match(/^content_display_(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function _initContentDisplayCounterFromLayout_(){
  try{
    let maxN = 0;
    if (TAB_LAYOUT && Array.isArray(TAB_LAYOUT.tabs)){
      for (const tab of TAB_LAYOUT.tabs){
        for (const it of (tab.items || [])){
          if (!it || it.type !== "module") continue;
          const n = _parseContentDisplayNumber_(it.id);
          if (n && n > maxN) maxN = n;
        }
      }
    }
    const raw = localStorage.getItem(CONTENT_DISPLAY_NEXT_KEY);
    let next = parseInt(String(raw || ""), 10);
    if (!Number.isFinite(next) || next < 1) next = maxN + 1;
    if (next <= maxN) next = maxN + 1;
    localStorage.setItem(CONTENT_DISPLAY_NEXT_KEY, String(next));
  }catch(_e){}
}

function _nextContentDisplayNumber_(){
  _initContentDisplayCounterFromLayout_();
  let next = 1;
  try{ next = parseInt(String(localStorage.getItem(CONTENT_DISPLAY_NEXT_KEY) || "1"), 10); }catch(_e){ next = 1; }
  if (!Number.isFinite(next) || next < 1) next = 1;
  try{ localStorage.setItem(CONTENT_DISPLAY_NEXT_KEY, String(next + 1)); }catch(_e){}
  return next;
}

function _ensureContentDisplayRegistryEntry_(moduleId, nOpt){
  const id = String(moduleId || "");
  const n = (typeof nOpt === "number" && isFinite(nOpt)) ? nOpt : _parseContentDisplayNumber_(id);
  if (!n) return;
  if (TAB_REGISTRY.modules[id]) return;

  // Allow saved title to override the default in the layout editor and headers
  let savedTitle = "";
  try{
    const raw = localStorage.getItem("fn_drought_content_display_v1:" + id);
    if (raw){
      const j = JSON.parse(raw);
      if (j && j.title && String(j.title).trim()) savedTitle = String(j.title).trim();
    }
  }catch(_e){}

  TAB_REGISTRY.modules[id] = {
    title: savedTitle ? savedTitle : ("Content Display #" + n),
    containerId: "panelContentDisplay_" + n,
    submodules: []
  };
}

function _ensureContentDisplayPanelExists_(moduleId, nOpt){
  const id = String(moduleId || "");
  const n = (typeof nOpt === "number" && isFinite(nOpt)) ? nOpt : _parseContentDisplayNumber_(id);
  if (!n) return;
  _ensureContentDisplayRegistryEntry_(id, n);

  const containerId = "panelContentDisplay_" + n;
  if (document.getElementById(containerId)){
    // Ensure mounted
    try{
      const host = document.getElementById("contentDisplayHost_" + n);
      if (host && !host._cdmMounted && window.FN_DROUGHT_ContentDisplay && typeof window.FN_DROUGHT_ContentDisplay.mount === "function"){
        host._cdmMounted = true;
        window.FN_DROUGHT_ContentDisplay.mount(host, id, n, document.querySelector("#" + containerId + " .hd h2"));
      }
    }catch(_e){}
    return;
  }

  const dynHost = document.getElementById("dynamicModulesHost");
  if (!dynHost) return;

  const section = document.createElement("section");
  section.className = "panel";
  section.id = containerId;
  section.style.gridColumn = "1 / -1";

  const hd = document.createElement("div");
  hd.className = "hd";
  const h2 = document.createElement("h2");
  // Title may be overridden by saved state when module mounts, but set best effort now
  try{ h2.textContent = (TAB_REGISTRY.modules[id] && TAB_REGISTRY.modules[id].title) ? TAB_REGISTRY.modules[id].title : ("Content Display #" + n); }
  catch(_e){ h2.textContent = "Content Display #" + n; }
  const meta = document.createElement("span");
  meta.className = "muted mono";
  meta.textContent = "Custom content";
  hd.appendChild(h2);
  hd.appendChild(meta);
  section.appendChild(hd);

  const host = document.createElement("div");
  host.id = "contentDisplayHost_" + n;
  section.appendChild(host);

  dynHost.appendChild(section);

  try{
    if (window.FN_DROUGHT_ContentDisplay && typeof window.FN_DROUGHT_ContentDisplay.mount === "function"){
      host._cdmMounted = true;
      window.FN_DROUGHT_ContentDisplay.mount(host, id, n, h2);
    }
  }catch(_e){}
}

function ensureContentDisplayModulesFromLayout_(){
  try{
    if (!TAB_LAYOUT || !Array.isArray(TAB_LAYOUT.tabs)) return;
    for (const tab of TAB_LAYOUT.tabs){
      for (const it of (tab.items || [])){
        if (!it || it.type !== "module") continue;
        const n = _parseContentDisplayNumber_(it.id);
        if (!n) continue;
        _ensureContentDisplayPanelExists_(it.id, n);
      }
    }
    _initContentDisplayCounterFromLayout_();
  }catch(_e){}
}

function _createNewContentDisplayModuleId_(){
  const n = _nextContentDisplayNumber_();
  const id = "content_display_" + n;
  _ensureContentDisplayPanelExists_(id, n);
  return id;
}

function initTabSystem(){
  try{
    if (document.getElementById("tabsHost")?._initDone) return;
    const host = document.getElementById("tabsHost");
    if (!host) return;
    host._initDone = true;

    TAB_LAYOUT = loadTabLayout_();
    try{ ensureContentDisplayModulesFromLayout_(); }catch(_e){}
    renderTabBar_();
    bindTabEditorUi_();
    applyTabLayout_();
  }catch(e){
    console.warn("initTabSystem failed:", e);
  }
}

function loadTabLayout_(){
  const raw = localStorage.getItem(TAB_LAYOUT_KEY);
  if (raw){
    try{
      const obj = JSON.parse(raw);
      if (obj && Array.isArray(obj.tabs) && obj.tabs.length){
        return obj;
      }
    }catch(_e){}
  }
  const def = {
    version: 1,
    activeTabId: "tab_main",
    tabs: [
      {
        id: "tab_main",
        title: "Main",
        items: [
          { type: "module", id: "district" },
          { type: "module", id: "map" },
          { type: "module", id: "locations" }
        ]
      }
    ]
  };
  localStorage.setItem(TAB_LAYOUT_KEY, JSON.stringify(def));
  return def;
}

function saveTabLayout_(){
  try{
    localStorage.setItem(TAB_LAYOUT_KEY, JSON.stringify(TAB_LAYOUT));
  }catch(e){
    console.warn("Failed to save tab layout:", e);
  }
}

function getActiveTab_(){
  if (!TAB_LAYOUT || !Array.isArray(TAB_LAYOUT.tabs)) return null;
  return TAB_LAYOUT.tabs.find(t => t.id === TAB_LAYOUT.activeTabId) || TAB_LAYOUT.tabs[0] || null;
}

function renderTabBar_(){
  const host = document.getElementById("tabsHost");
  if (!host) return;

  host.innerHTML = "";
  const tabs = TAB_LAYOUT.tabs || [];
  for (const tab of tabs){
    const btn = document.createElement("button");
    btn.className = "tabbtn";
    btn.type = "button";
    btn.setAttribute("role","tab");
    btn.setAttribute("aria-selected", tab.id === TAB_LAYOUT.activeTabId ? "true" : "false");
    btn.textContent = tab.title || tab.id;
    btn.addEventListener("click", ()=>{
      TAB_LAYOUT.activeTabId = tab.id;
      try{
        const remember = (appSettings && appSettings.layout) ? (appSettings.layout.rememberActiveTab !== false) : true;
        if (remember) saveTabLayout_();
      }catch(_e){}

      renderTabBar_();
      renderTabEditorList_();
      applyTabLayout_();
    });
    host.appendChild(btn);
  }

  const titleInput = document.getElementById("tabTitleInput");
  const active = getActiveTab_();
  if (titleInput && active) titleInput.value = active.title || "";
}

function applyTabLayout_(){
  const tab = getActiveTab_();
  if (!tab) return;

  // Ensure dynamic modules referenced by layout are registered and mounted
  try{ ensureContentDisplayModulesFromLayout_(); }catch(_e){}

  const explicitModules = new Set();
  const explicitSubmodules = new Set();

  for (const it of (tab.items || [])){
    if (!it || !it.type || !it.id) continue;
    if (it.type === "module") explicitModules.add(it.id);
    if (it.type === "submodule") explicitSubmodules.add(it.id);
  }

  const visibleSubmodules = new Set(explicitSubmodules);
  for (const modId of explicitModules){
    const mod = TAB_REGISTRY.modules[modId];
    if (mod && Array.isArray(mod.submodules)){
      for (const sid of mod.submodules) visibleSubmodules.add(sid);
    }
  }

  const visibleModules = new Set(explicitModules);
  for (const sid of visibleSubmodules){
    const sm = TAB_REGISTRY.submodules[sid];
    if (sm && Array.isArray(sm.requires)){
      for (const mid of sm.requires) visibleModules.add(mid);
    }
  }

  // Modules: show or hide containers
  for (const [mid, mod] of Object.entries(TAB_REGISTRY.modules)){
    const el = document.getElementById(mod.containerId);
    if (!el) continue;
    el.style.display = visibleModules.has(mid) ? "" : "none";
  }

  // Submodules: show or hide nodes (only if their container is visible)
  for (const [sid, sm] of Object.entries(TAB_REGISTRY.submodules)){
    const show = visibleSubmodules.has(sid);
    for (const nid of (sm.nodes || [])){
      const el = document.getElementById(nid);
      if (!el) continue;
      el.style.display = show ? "" : "none";
    }
  }

  // Leaflet map needs resize when toggled
  try{
    const panelMap = document.getElementById("panelMap");
    if (panelMap && panelMap.style.display !== "none" && typeof map !== "undefined" && map){
      setTimeout(()=>{ try{ map.invalidateSize(); }catch(_e){} }, 60);
    }
  }catch(_e){}

  // Events module: render when visible
  try{
    const panelEvents = document.getElementById("panelEvents");
    if (panelEvents && panelEvents.style.display !== "none"){
      renderEventsPanel_();
    }
  }catch(_e){}

  // Text summary module: render when visible
  try{
    const panelText = document.getElementById("panelTextSummary");
    if (panelText && panelText.style.display !== "none" && typeof renderTextSummaryPanel_ === "function"){
      renderTextSummaryPanel_();
    }
  }catch(_e){}
}

function bindTabEditorUi_(){
  const btnEdit = document.getElementById("btnTabEdit");
  const btnAddTab = document.getElementById("btnTabAdd");
  const editBar = document.getElementById("tabEditBar");
  const addType = document.getElementById("tabAddType");
  const addItem = document.getElementById("tabAddItem");
  const btnAddItem = document.getElementById("btnTabAddItem");
  const btnRename = document.getElementById("btnTabRename");
  const btnDelete = document.getElementById("btnTabDelete");
  const btnClear = document.getElementById("btnTabClear");

  if (btnEdit && !btnEdit._hooked){
    btnEdit._hooked = true;
    btnEdit.addEventListener("click", ()=>{
      TAB_EDIT_MODE = !TAB_EDIT_MODE;
      if (editBar) editBar.style.display = TAB_EDIT_MODE ? "" : "none";
      if (btnAddTab) btnAddTab.style.display = TAB_EDIT_MODE ? "" : "none";
      btnEdit.textContent = TAB_EDIT_MODE ? "Done" : "Edit Layout";
      try{ document.documentElement.setAttribute("data-tab-edit-mode", TAB_EDIT_MODE ? "1" : "0"); }catch(_e){}
      populateAddDropdown_();
      renderTabEditorList_();
    });
  }

  if (btnAddTab && !btnAddTab._hooked){
    btnAddTab._hooked = true;
    btnAddTab.addEventListener("click", ()=>{
      const title = prompt("New tab title", "New Tab");
      if (!title) return;
      const id = "tab_" + Math.random().toString(16).slice(2,10);
      TAB_LAYOUT.tabs.push({ id, title, items: [] });
      TAB_LAYOUT.activeTabId = id;
      saveTabLayout_();
      renderTabBar_();
      populateAddDropdown_();
      renderTabEditorList_();
      applyTabLayout_();
    });
  }

  if (addType && !addType._hooked){
    addType._hooked = true;
    addType.addEventListener("change", populateAddDropdown_);
  }

  if (btnAddItem && !btnAddItem._hooked){
    btnAddItem._hooked = true;
    btnAddItem.addEventListener("click", ()=>{
      const tab = getActiveTab_();
      if (!tab) return;
      const type = addType ? addType.value : "module";
      let id = addItem ? addItem.value : "";
      if (!id) return;

      if (type === "module" && id === CONTENT_DISPLAY_NEW_ID){
        id = _createNewContentDisplayModuleId_();
      }

      const already = (tab.items || []).some(it => it.type === type && it.id === id);
      if (!already){
        tab.items = tab.items || [];
        tab.items.push({ type, id });
        saveTabLayout_();
        populateAddDropdown_();
        renderTabEditorList_();
        applyTabLayout_();
      }
    });
  }

  if (btnRename && !btnRename._hooked){
    btnRename._hooked = true;
    btnRename.addEventListener("click", ()=>{
      const tab = getActiveTab_();
      const ti = document.getElementById("tabTitleInput");
      if (!tab || !ti) return;
      const val = (ti.value || "").trim();
      if (!val) return;
      tab.title = val;
      saveTabLayout_();
      renderTabBar_();
    });
  }

  if (btnDelete && !btnDelete._hooked){
    btnDelete._hooked = true;
    btnDelete.addEventListener("click", ()=>{
      if (!TAB_LAYOUT || !Array.isArray(TAB_LAYOUT.tabs)) return;
      if (TAB_LAYOUT.tabs.length <= 1){
        alert("You need at least one tab.");
        return;
      }
      const tab = getActiveTab_();
      if (!tab) return;
      const ok = confirm(`Delete tab "${tab.title || tab.id}"?`);
      if (!ok) return;
      TAB_LAYOUT.tabs = TAB_LAYOUT.tabs.filter(t => t.id !== tab.id);
      TAB_LAYOUT.activeTabId = TAB_LAYOUT.tabs[0].id;
      saveTabLayout_();
      renderTabBar_();
      populateAddDropdown_();
      renderTabEditorList_();
      applyTabLayout_();
    });
  }

  if (btnClear && !btnClear._hooked){
    btnClear._hooked = true;
    btnClear.addEventListener("click", ()=>{
      const tab = getActiveTab_();
      if (!tab) return;
      tab.items = [];
      saveTabLayout_();
      populateAddDropdown_();
      renderTabEditorList_();
      applyTabLayout_();
    });
  }

  populateAddDropdown_();
  renderTabEditorList_();
}

function populateAddDropdown_(){
  const addType = document.getElementById("tabAddType");
  const addItem = document.getElementById("tabAddItem");
  if (!addType || !addItem) return;

  const tab = getActiveTab_();
  const existing = new Set((tab?.items || []).map(it => `${it.type}:${it.id}`));

  addItem.innerHTML = "";
  const type = addType.value;

  let options = [];
  if (type === "module"){
    options = Object.entries(TAB_REGISTRY.modules).map(([id, m]) => ({ id, title: m.title }));
  }else{
    options = Object.entries(TAB_REGISTRY.submodules).map(([id, s]) => ({ id, title: s.title }));
  }

  // Filter out exact duplicates of the same type
  options = options.filter(o => !existing.has(`${type}:${o.id}`));

  // Sort by title
  options.sort((a,b)=> (a.title||"").localeCompare(b.title||""));

  // Special creator entry (allows multiple unique modules per tab)
  if (type === "module"){
    options.unshift({ id: CONTENT_DISPLAY_NEW_ID, title: "Content Display (New)" });
  }

  for (const o of options){
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.title;
    addItem.appendChild(opt);
  }

  const hint = document.getElementById("tabEditHint");
  if (hint){
    if (!options.length) hint.textContent = "No more items to add for this type.";
    else hint.textContent = "Add a module to include its connected submodules automatically. Add a submodule to include it alone.";
  }
}

function renderTabEditorList_(){
  const wrap = document.getElementById("tabEditList");
  if (!wrap) return;

  const tab = getActiveTab_();
  if (!tab){
    wrap.innerHTML = "";
    return;
  }

  const items = tab.items || [];
  if (!items.length){
    wrap.innerHTML = '<div class="tiny muted">No modules or submodules in this tab yet.</div>';
    return;
  }

  wrap.innerHTML = "";
  items.forEach((it, idx)=>{
    const row = document.createElement("div");
    row.className = "tabeditItem";

    const left = document.createElement("div");
    left.className = "left";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = it.type === "module" ? "Module" : "Submodule";
    left.appendChild(badge);

    const name = document.createElement("span");
    const title = (it.type === "module" ? TAB_REGISTRY.modules[it.id]?.title : TAB_REGISTRY.submodules[it.id]?.title) || it.id;
    name.textContent = title;
    left.appendChild(name);

    const rm = document.createElement("button");
    rm.className = "btn";
    rm.textContent = "Remove";
    rm.addEventListener("click", ()=>{
      tab.items.splice(idx,1);
      saveTabLayout_();
      populateAddDropdown_();
      renderTabEditorList_();
      applyTabLayout_();
    });

    row.appendChild(left);
    row.appendChild(rm);
    wrap.appendChild(row);
  });

      // Layout tab actions
      const btnLayRefresh = $("btnLayoutRefresh");
      const btnLayCopy = $("btnLayoutCopy");
      const btnLayReset = $("btnLayoutReset");
      const btnLayImport = $("btnLayoutImport");
      const btnLayExport = $("btnLayoutExport");
      const fileLay = $("fileLayoutImport");

      if (btnLayRefresh && !btnLayRefresh._hooked){
        btnLayRefresh._hooked = true;
        btnLayRefresh.addEventListener("click", exportLayoutToBox);
      }
      if (btnLayCopy && !btnLayCopy._hooked){
        btnLayCopy._hooked = true;
        btnLayCopy.addEventListener("click", copyLayoutJsonToClipboard_);
      }
      if (btnLayReset && !btnLayReset._hooked){
        btnLayReset._hooked = true;
        btnLayReset.addEventListener("click", resetLayoutToDefault_);
      }
      if (btnLayExport && !btnLayExport._hooked){
        btnLayExport._hooked = true;
        btnLayExport.addEventListener("click", ()=>{
          exportLayoutToBox();
          downloadLayoutJson();
        });
      }
      if (btnLayImport && !btnLayImport._hooked){
        btnLayImport._hooked = true;
        btnLayImport.addEventListener("click", ()=>{
          const box = $("layoutJsonBox");
          const raw = (box && String(box.value||"").trim()) ? String(box.value||"") : "";
          if (raw){
            importLayoutFromText(raw);
            return;
          }
          if (fileLay) fileLay.click();
        });
      }
      if (fileLay && !fileLay._hooked){
        fileLay._hooked = true;
        fileLay.addEventListener("change", async ()=>{
          const f = fileLay.files && fileLay.files[0];
          if (!f) return;
          try{
            const txt = await f.text();
            importLayoutFromText(txt);
          }catch(e){
            showToast("Layout import failed");
          }
          fileLay.value = "";
        });
      }
}