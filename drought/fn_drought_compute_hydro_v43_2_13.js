/********


        <details class="miniCard" style="margin-top:10px;" id="locRiverDischargeModelWrap">
          <summary style="cursor:pointer; user-select:none;">
            <span class="k">River Discharge (Modelled)</span>
            <span class="tiny muted" style="margin-left:8px;">Open-Meteo flood discharge near this location</span>
          </summary>
          <div class="s" style="margin-top:10px;">
            ${buildRiverDischargeModelHtml(row)}
          </div>
        </details>
***************
     * Drought Computation
     ***********************/
    function computeLocationIndex(wx, flood, nowDate, riverIndexOverride){
      const daily = wx?.daily || {};
      const hourly = wx?.hourly || {};

      // Rain component
      const pastRain14 = sumDailyWindow(daily.time, daily.precipitation_sum, nowDate, droughtConfig.windows.rainPastDays);
      const forecastRain7 = sumDailyFuture(daily.time, daily.precipitation_sum, nowDate, 7);

      const rainWet14 = droughtConfig.thresholds.rain14.wet;
      const rainDry14Thr = droughtConfig.thresholds.rain14.dry;
      const rainWet7F = droughtConfig.thresholds.rain7Forecast.wet;
      const rainDry7FThr = droughtConfig.thresholds.rain7Forecast.dry;

      const rainDry14 = normalizeInverse(pastRain14, rainWet14, rainDry14Thr);
      const rainDryFc = normalizeInverse(forecastRain7, rainWet7F, rainDry7FThr);

      const rainMixW = { past14: 0.70, forecast7: 0.30 };
      const rainComponent = (rainDry14 == null && rainDryFc == null) ? null :
        (rainMixW.past14 * (rainDry14 ?? 0.5) + rainMixW.forecast7 * (rainDryFc ?? 0.5));

      // Soil moisture component (relative dryness vs recent baseline range)
      let soilComponent = null;
      let soilDetails = [];
      let soilSum = 0;
      let soilW = 0;

      for (const layer of droughtConfig.soilLayers){
        const arr = hourly[layer.key];
        if (!arr) {
          soilDetails.push({ key: layer.key, label: layer.label, current: null, dryness: null, min: null, max: null, w: layer.w });
          continue;
        }

        const current = lastHourlyAtOrBeforeNow(hourly.time, arr, nowDate);
        const mm = minMaxHourlyWindow(hourly.time, arr, nowDate, droughtConfig.windows.soilBaselineDays);

        let dryness = null;
        if (current != null && mm.min != null && mm.max != null){
          const denom = (mm.max - mm.min);
          dryness = denom <= 1e-9 ? 0.5 : clamp(1 - ((current - mm.min) / denom), 0, 1);
        }

        soilDetails.push({ key: layer.key, label: layer.label, current, dryness, min: mm.min, max: mm.max, w: layer.w });

        if (dryness != null){
          soilSum += dryness * layer.w;
          soilW += layer.w;
        }
      }

      if (soilW > 0) soilComponent = soilSum / soilW;

      // Evap demand component
      const et0_7 = sumDailyFuture(daily.time, daily.et0_fao_evapotranspiration, nowDate, droughtConfig.windows.et0ForecastDays);
      const et0Low = droughtConfig.thresholds.et07.low;
      const et0High = droughtConfig.thresholds.et07.high;
      const et0Dry = normalize(et0_7, et0Low, et0High);

      const vpdMean = meanHourlyFuture(hourly.time, hourly.vapour_pressure_deficit, nowDate, droughtConfig.windows.vpdForecastDays, (dt) =>
        dt.getHours() >= 9 && dt.getHours() <= 17
      );
      const vpdLow = droughtConfig.thresholds.vpd.low;
      const vpdHigh = droughtConfig.thresholds.vpd.high;
      const vpdDry = normalize(vpdMean, vpdLow, vpdHigh);

      const evapMixW = { et0: 0.60, vpd: 0.40 };
      const evapComponent = (et0Dry == null && vpdDry == null) ? null :
        (evapMixW.et0 * (et0Dry ?? 0.5) + evapMixW.vpd * (vpdDry ?? 0.5));

      // Humidity component (low RH -> higher dryness)
      const rhMean7 = meanHourlyWindow(hourly.time, hourly.relative_humidity_2m, nowDate, droughtConfig.windows.rhPastDays);
      const rhWet = droughtConfig.thresholds.rh7.wet;
      const rhDryThr = droughtConfig.thresholds.rh7.dry;
      const rhDry = normalizeInverse(rhMean7, rhWet, rhDryThr);

      // River discharge component (modelled or hybrid override, optional)
      let riverComponent = null;
      let riverNow = null;
      let riverMin30 = null;
      let riverMax30 = null;
      let riverSource = "None";
      let riverMeta = null;
      let riverUnit = null;

      let rd = null;
      let rt = null;

      if (riverIndexOverride && Array.isArray(riverIndexOverride.dates) && Array.isArray(riverIndexOverride.values) && riverIndexOverride.dates.length){
        rt = riverIndexOverride.dates;
        rd = riverIndexOverride.values;
        riverSource = riverIndexOverride.source || "Hybrid";
        riverMeta = riverIndexOverride.meta || null;
        riverUnit = (riverMeta && (riverMeta.flowUnitsNorm || riverMeta.flowUnits || riverMeta.unit)) ? (riverMeta.flowUnitsNorm || riverMeta.flowUnits || riverMeta.unit) : null;
      } else if (flood?.daily?.river_discharge && flood?.daily?.time){
        rd = flood.daily.river_discharge;
        rt = flood.daily.time;
        riverSource = "Modelled";
        riverUnit = "m3/s";
      }

      if (rd && rt){
        const todayKey = nowDate.toISOString().slice(0,10);

        let idx = -1;
        for (let i=0;i<rt.length;i++){
          if (rt[i] <= todayKey) idx = i;
        }
        if (idx >= 0){
          riverNow = rd[idx];

          const start = Math.max(0, idx - 29);
          let min = Infinity, max = -Infinity, found = false;
          for (let i=start;i<=idx;i++){
            const v = rd[i];
            if (v != null && !isNaN(v)){
              min = Math.min(min, v);
              max = Math.max(max, v);
              found = true;
            }
          }
          if (found){
            riverMin30 = min;
            riverMax30 = max;
            const denom = (max - min);
            riverComponent = denom <= 1e-9 ? 0.5 : clamp(1 - ((riverNow - min) / denom), 0, 1);
          }
        }
      }


      // Weighted composite
      const parts = [
        { key: "soil", label: "Soil Moisture", val: soilComponent, w: droughtConfig.weights.soil },
        { key: "rain", label: "Rain (Past + Forecast)", val: rainComponent, w: droughtConfig.weights.rain },
        { key: "evap", label: "Evap Demand (ET0 + VPD)", val: evapComponent, w: droughtConfig.weights.evap },
        { key: "river", label: "River Discharge", val: riverComponent, w: droughtConfig.weights.river },
        { key: "humidity", label: "Humidity (RH)", val: rhDry, w: droughtConfig.weights.humidity }
      ];

      let wSum = 0;
      let scoreSum = 0;
      for (const p of parts){
        if (p.val == null) continue;
        wSum += p.w;
        scoreSum += p.val * p.w;
      }

      const score = wSum > 0 ? clamp((scoreSum / wSum) * 100, 0, 100) : null;

      // Build an inspectable breakdown for UI and debugging
      const breakdown = {
        score,
        category: categoryForIndex(score)?.name || "No Data",
        cutoffs: { extreme: 94, severe: 79, warning: 64, watch: 49 },
        wSum,
        components: parts.map(p => {
          const included = (p.val != null);
          const effW = (included && wSum > 0) ? (p.w / wSum) : null;
          const contribution = (included && wSum > 0) ? ((p.val * p.w / wSum) * 100) : null;

          let raw = null;
          let mapping = null;
          let notes = null;

          if (p.key === "soil"){
            raw = { baselineDays: droughtConfig.windows.soilBaselineDays, layers: soilDetails };
            mapping = { dryness01: soilComponent };
            notes = "Dryness is computed as 1 - ((current - min) / (max - min)) per layer, then weighted across layers.";
          } else if (p.key === "rain"){
            raw = { pastRain14_mm: pastRain14, forecastRain7_mm: forecastRain7, mix: rainMixW };
            mapping = {
              past14_dryness01: rainDry14,
              forecast7_dryness01: rainDryFc,
              thresholds: {
                rain14: { wet_mm: rainWet14, dry_mm: rainDry14Thr },
                rain7Forecast: { wet_mm: rainWet7F, dry_mm: rainDry7FThr }
              },
              combined_dryness01: rainComponent
            };
            notes = "Both signals are inverted so lower rain increases dryness. Past 14d is weighted more than forecast.";
          } else if (p.key === "evap"){
            raw = { et0Forecast7_mm: et0_7, vpdMean7: vpdMean, mix: evapMixW };
            mapping = {
              et0_dryness01: et0Dry,
              vpd_dryness01: vpdDry,
              thresholds: {
                et0_7: { low: et0Low, high: et0High },
                vpd: { low: vpdLow, high: vpdHigh }
              },
              combined_dryness01: evapComponent
            };
            notes = "Higher ET0 and higher VPD increase dryness. Values are normalized to thresholds then blended.";
          } else if (p.key === "humidity"){
            raw = { rhMean7_pct: rhMean7 };
            mapping = {
              rh_dryness01: rhDry,
              thresholds: { rh7: { wet_pct: rhWet, dry_pct: rhDryThr } }
            };
            notes = "Humidity is inverted so lower RH increases dryness.";
          } else if (p.key === "river"){
            raw = { riverSource, riverUnit, riverMeta, riverNow, baselineMin30: riverMin30, baselineMax30: riverMax30 };
            mapping = { dryness01: riverComponent };
            notes = "Dryness is relative to the last 30 days: 1 - ((now - min) / (max - min)).";
          }

          return {
            key: p.key,
            label: p.label,
            included,
            baseWeight: p.w,
            effectiveWeight: effW,
            dryness01: p.val,
            contributionToScore: contribution,
            raw,
            mapping,
            notes
          };
        })
      };

      return {
        score,
        parts: {
          soil: soilComponent,
          rain: rainComponent,
          evap: evapComponent,
          humidity: rhDry,
          river: riverComponent
        },
        metrics: {
          pastRain14,
          forecastRain7,
          et0_7,
          vpdMean,
          rhMean7,
          riverNow,
          riverMin30,
          riverMax30,
          riverSource,
          riverUnit,
          riverMeta
        },
        soilDetails,
        breakdown
      };
    }

    

/***********************
 * River Analysis (v13_19_fix1)
 ***********************/
const STORAGE_KEY_HYDRO_READ_ANALYSISMODE = "fn_hydro_analysis_mode";
const STORAGE_KEY_HYDRO_READ_ANALYSISTABLE = "fn_hydro_analysis_table";
let districtHydroAnalysisState = { enabled: false, showTable: false, lastKey: null, lastResult: null, focusId: null, seriesById: {} };

const riverAnalysisConfig = {
  // Basics
  defaultInterval: "hour",
  windowDays: 30,

  // Pairing tolerances (hours)
  alignTolHours: 2,
  alignTolDays: 6,

  // Rain context windows (hours)
  rainCtxFastHours: 6,
  rainCtxSlowHours: 72,

  // Response windows to test (hourly uses hours, daily uses days)
  responseWindowsHour: [1, 6, 24, 72],
  responseWindowsDay: [1, 3, 7],

  // Lag search and quality thresholds
  lagMaxHours: 72,
  lagMinPoints: 12,
  lagMinCorrStrong: 0.25,

  // Drain scoring thresholds (half-life hours)
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
};

function setDistrictHydroAnalysisVisible(show){
  const wrap = document.getElementById("districtHydroAnalysisWrap");
  if (!wrap) return;
  wrap.style.display = show ? "" : "none";
  if (show) refreshDistrictHydroAnalysisIfVisible(true);
}

function toggleDistrictHydroAnalysisMode(force){
  const want = (force == null) ? !districtHydroAnalysisState.enabled : !!force;
  districtHydroAnalysisState.enabled = want;
  try{ localStorage.setItem(STORAGE_KEY_HYDRO_READ_ANALYSISMODE, want ? "1" : "0"); }catch(e){}
  setDistrictHydroAnalysisVisible(want);
}

function refreshDistrictHydroAnalysisIfVisible(force=false){
  if (!districtHydroAnalysisState.enabled) return;
  ensureDistrictHydroAnalysisComputed(force).catch((err)=>{
    try{ console.error("district hydro analysis", err); }catch(e){}
    try{ renderDistrictHydroAnalysis({ ok:false, reason: String(err && (err.message||err) || err) }); }catch(e){}
  });
}

function _pickNearestWxIndexForGauge_(g){
  if (g && Number.isFinite(g.locIdx)) return g.locIdx;
  if (!Array.isArray(locations) || locations.length === 0 || !g || g.lat == null || g.lon == null) return 0;
  let best = 0, bestD = Infinity;
  for (let i=0;i<locations.length;i++){
    const d = haversineKm(g.lat, g.lon, locations[i].lat, locations[i].lon);
    if (d < bestD){ bestD = d; best = i; }
  }
  return best;
}

function _wxSeries_(locIdx, step, metricKey){
  const wx = (dataCache && Array.isArray(dataCache.wxList)) ? dataCache.wxList[locIdx] : null;
  if (!wx) return { times: [], values: [] };
  const key = String(metricKey || "precipitation");
  const isHour = (step === "hour");
  const src = isHour ? wx.hourly : wx.daily;
  if (!src) return { times: [], values: [] };
  const t = src.time || src.times || [];
  const v = src[key] || src[key.replace(/\s+/g,"_")] || [];
  return { times: Array.isArray(t) ? t.slice() : [], values: Array.isArray(v) ? v.slice() : [] };
}

function _seriesToMs_(s){
  const times = [];
  const values = [];
  if (!s || !Array.isArray(s.times) || !Array.isArray(s.values)) return { times, values };
  for (let i=0;i<s.times.length;i++){
    const tm = new Date(s.times[i]).getTime();
    if (!isFinite(tm)) continue;
    const val = (s.values[i] == null ? null : Number(s.values[i]));
    times.push(tm);
    values.push(isFinite(val) ? val : null);
  }
  return { times, values };
}

function _bucketSeriesMean_(s, step){
  const outT = [];
  const outV = [];
  const map = new Map();
  for (let i=0;i<s.times.length;i++){
    const ms = s.times[i];
    const v = s.values[i];
    if (v == null) continue;
    const d = new Date(ms);
    let key;
    if (step === "hour"){
      key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0).getTime();
    } else {
      key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    }
    let ent = map.get(key);
    if (!ent){ ent = { sum: 0, n: 0 }; map.set(key, ent); }
    ent.sum += v; ent.n += 1;
  }
  const keys = Array.from(map.keys()).sort((a,b)=>a-b);
  for (const k of keys){
    const ent = map.get(k);
    outT.push(k);
    outV.push(ent && ent.n ? (ent.sum / ent.n) : null);
  }
  return { times: outT, values: outV };
}

function _alignByTime_(a, b, tolMs){
  const tol = (tolMs == null ? 2*3600000 : tolMs);
  const pairs = [];
  let j = 0;
  for (let i=0;i<a.times.length;i++){
    const ta = a.times[i];
    const va = a.values[i];
    if (va == null) continue;
    while (j < b.times.length && b.times[j] < ta - tol) j++;
    let best = -1, bestD = Infinity;
    for (let k=j; k < b.times.length && b.times[k] <= ta + tol; k++){
      const vb = b.values[k];
      if (vb == null) continue;
      const d = Math.abs(b.times[k] - ta);
      if (d < bestD){ bestD = d; best = k; }
    }
    if (best !== -1){
      pairs.push([va, b.values[best]]);
    }
  }
  return pairs;
}

function _pearson_(xs, ys){
  const n = Math.min(xs.length, ys.length);
  if (n < 8) return null;
  let sx=0, sy=0, sxx=0, syy=0, sxy=0, m=0;
  for (let i=0;i<n;i++){
    const x = xs[i], y = ys[i];
    if (!isFinite(x) || !isFinite(y)) continue;
    m++;
    sx += x; sy += y;
    sxx += x*x; syy += y*y;
    sxy += x*y;
  }
  if (m < 8) return null;
  const num = (m*sxy - sx*sy);
  const den = Math.sqrt((m*sxx - sx*sx) * (m*syy - sy*sy));
  if (!isFinite(den) || den === 0) return null;
  return num/den;
}

function computeFlowStageKnee(pairs, kneeSlopeMult, kneeMinSlope){
  if (!Array.isArray(pairs) || pairs.length < 20) return { ok:false, reason:"insufficient pairs" };

  const pts = pairs
    .map(p => [Number(p[0]), Number(p[1])])
    .filter(p => isFinite(p[0]) && isFinite(p[1]))
    .sort((a,b)=>a[0]-b[0]);

  if (pts.length < 20) return { ok:false, reason:"insufficient pairs" };

  const slopes = [];
  for (let i=1;i<pts.length;i++){
    const df = pts[i][0] - pts[i-1][0];
    const ds = pts[i][1] - pts[i-1][1];
    if (df <= 0) continue;
    slopes.push({ i, slope: ds/df, flow: pts[i][0], stage: pts[i][1] });
  }
  if (slopes.length < 10) return { ok:false, reason:"insufficient slopes" };

  const cut = Math.max(3, Math.floor(slopes.length * 0.3));
  const low = slopes.slice(0, cut).map(x=>x.slope).filter(x=>isFinite(x));
  if (low.length < 3) return { ok:false, reason:"insufficient baseline" };
  low.sort((a,b)=>a-b);
  const base = low[Math.floor(low.length/2)] || 0;

  const mult = (isFinite(kneeSlopeMult) && kneeSlopeMult>0) ? kneeSlopeMult : 3;
  const floorSlope = (kneeMinSlope == null ? 0 : (Number(kneeMinSlope) || 0));
  const target = Math.max(base * mult, floorSlope);

  let knee = null;
  for (let i=cut;i<slopes.length-2;i++){
    const s1 = slopes[i].slope;
    const s2 = slopes[i+1].slope;
    const s3 = slopes[i+2].slope;
    if (isFinite(s1) && isFinite(s2) && isFinite(s3) && s1 >= target && s2 >= target && s3 >= target){
      knee = slopes[i];
      break;
    }
  }

  if (!knee){
    // Fallback: estimate knee by the strongest upward change in slope after the baseline region.
    // This avoids blank knee outputs on smooth rating curves where the threshold test never triggers.
    let est = null;
    let bestScore = -Infinity;
    for (let i=cut; i<slopes.length-1; i++){
      const sA = slopes[i].slope;
      const sB = slopes[i+1].slope;
      if (!isFinite(sA) || !isFinite(sB)) continue;
      const dd = (sB - sA);
      const rel = sB / (base || 1e-9);
      const score = Math.abs(dd) * rel;
      if (score > bestScore){
        bestScore = score;
        est = slopes[i+1];
      }
    }
    if (est){
      const flowRange = pts[pts.length-1][0] - pts[0][0] || 1;
      const kneePos = (est.flow - pts[0][0]) / flowRange;
      const jump = (est.slope / (base || 1));
      const rating = clamp(100 * (0.65 * kneePos + 0.35 * (1 / clamp(jump, 1, 12))), 0, 100);
      return { ok:true, kneeFlow: est.flow, kneeStage: est.stage, baseSlope: base, kneeSlope: est.slope, targetSlope: target, mult: mult, jump: jump, kneePos: kneePos, rating, note:"estimated knee (slope change)" };
    }
    return { ok:true, kneeFlow: null, kneeStage: null, baseSlope: base, kneeSlope: null, targetSlope: target, mult: mult, jump: null, kneePos: null, rating: 85, note:"no clear knee" };
  }

  const flowRange = pts[pts.length-1][0] - pts[0][0] || 1;
  const kneePos = (knee.flow - pts[0][0]) / flowRange;
  const jump = (knee.slope / (base || 1));
  const rating = clamp(100 * (0.65 * kneePos + 0.35 * (1 / clamp(jump, 1, 12))), 0, 100);

  return { ok:true, kneeFlow: knee.flow, kneeStage: knee.stage, baseSlope: base, kneeSlope: knee.slope, targetSlope: target, mult: mult, jump: jump, kneePos: kneePos, rating, note:null };
}

function computeBestLag(rainS, stageS, step, maxLag, opts = null){
  const times = stageS.times;
  const vals = stageS.values;
  if (!times || times.length < 12) return { ok:false, reason:"insufficient stage" };

  const dT = [];
  const dV = [];
  for (let i=1;i<times.length;i++){
    const v1 = vals[i-1], v2 = vals[i];
    if (v1 == null || v2 == null) continue;
    dT.push(times[i]);
    dV.push(v2 - v1);
  }
  if (dT.length < 10) return { ok:false, reason:"insufficient stage change" };

  const rainMap = new Map();
  for (let i=0;i<rainS.times.length;i++){
    const v = rainS.values[i];
    if (v == null) continue;
    rainMap.set(rainS.times[i], v);
  }

  const stepMs = (step === "hour") ? 3600000 : 86400000;
  const lagMax = clamp(Number(maxLag)||0, 0, 240);

  const minPoints = (opts && opts.minPoints != null) ? Number(opts.minPoints) : (riverAnalysisConfig.lagMinPoints ?? 12);
  const minCorrStrong = (opts && opts.minCorrStrong != null) ? Number(opts.minCorrStrong) : (riverAnalysisConfig.lagMinCorrStrong ?? 0.25);

  // We prefer highest correlation when we have enough paired points.
  // If correlation cannot be computed (too few points), we still keep the best-coverage lag and mark it Weak.
  let best = { lag: 0, corr: null, n: 0 };

  for (let lag=0; lag<=lagMax; lag++){
    const xs = [];
    const ys = [];
    for (let i=0;i<dT.length;i++){
      const t = dT[i] - lag*stepMs;
      const rv = rainMap.get(t);
      if (rv == null) continue;
      xs.push(rv);
      ys.push(dV[i]);
    }
    const n = xs.length;

    let c = null;
    if (n >= 3) c = _pearson_(xs, ys);

    if (c != null){
      if (best.corr == null || c > best.corr || (c === best.corr && n > best.n)){
        best = { lag, corr: c, n };
      }
    } else {
      if (best.corr == null && n > best.n){
        best = { lag, corr: null, n };
      }
    }
  }

  if (best.n <= 0) return { ok:false, reason:"no overlap" };

  const weak = (Number.isFinite(minPoints) && best.n < minPoints) ||
               (best.corr != null && Number.isFinite(minCorrStrong) && Math.abs(best.corr) < minCorrStrong);

  return { ok:true, lag: best.lag, corr: best.corr, n: best.n, weak };
}

function computeHalfLife(stageS, step){
  const times = stageS.times;
  const vals = stageS.values;
  if (times.length < 20) return { ok:false, reason:"insufficient stage" };

  const halfLives = [];
  for (let i=2;i<vals.length-6;i++){
    const v = vals[i];
    if (v == null) continue;
    const prev = vals[i-1], next = vals[i+1];
    if (prev == null || next == null) continue;
    if (!(v > prev && v > next)) continue;

    let base = Infinity;
    for (let k=Math.max(0,i-6); k<i; k++){
      const b = vals[k];
      if (b == null) continue;
      if (b < base) base = b;
    }
    if (!isFinite(base)) continue;
    const amp = v - base;
    if (amp <= 0) continue;
    const target = base + amp/2;

    let j = -1;
    for (let k=i+1;k<vals.length;k++){
      const vv = vals[k];
      if (vv == null) continue;
      if (vv <= target){ j = k; break; }
      if (k>i+2 && vv > v) break;
    }
    if (j === -1) continue;
    const dtH = (times[j] - times[i]) / 3600000;
    if (isFinite(dtH) && dtH >= 0) halfLives.push(dtH);
  }

  if (halfLives.length < 2) return { ok:false, reason:"insufficient events" };
  halfLives.sort((a,b)=>a-b);
  const med = halfLives[Math.floor(halfLives.length/2)];
  return { ok:true, halfLifeHours: med, n: halfLives.length };
}

function scoreHalfLife(halfLifeHours, fastH, slowH){
  const fast = clamp(Number(fastH)||12, 1, 240);
  const slow = clamp(Number(slowH)||72, fast+1, 480);
  if (!isFinite(halfLifeHours)) return null;
  if (halfLifeHours <= fast) return 100;
  if (halfLifeHours >= slow) return 0;
  const t = (halfLifeHours - fast) / (slow - fast);
  return clamp(100 * (1 - t), 0, 100);
}

function formatHours(h){
  if (h == null || !isFinite(h)) return "-";
  if (h < 48) return `${fmt(h, 0)} h`;
  const d = h / 24;
  return `${fmt(d, 1)} d`;
}

function _cardHtml_(title, value, note){
  return `<div class="miniCard" style="padding:10px;">
    <div class="k">${escapeHtml(title)}</div>
    <div class="v mono" style="margin-top:6px;">${escapeHtml(value)}</div>
    ${note ? `<div class="s muted" style="margin-top:6px;">${escapeHtml(note)}</div>` : ""}
  </div>`;
}

function _hashStr32_(s){
  s = String(s || "");
  let h = 2166136261;
  for (let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function _aggRainWindow_(rainS, winSteps){
  const times = rainS?.times || [];
  const vals  = rainS?.values || [];
  const w = Math.max(1, Number(winSteps)||1);
  const out = { times: times.slice(), values: new Array(times.length).fill(null) };

  let sum = 0;
  let q = [];
  let nulls = 0;

  for (let i=0;i<times.length;i++){
    const v = vals[i];
    const vv = (v == null || !isFinite(v)) ? null : Number(v);
    q.push(vv);
    if (vv == null) nulls++; else sum += vv;

    if (q.length > w){
      const old = q.shift();
      if (old == null) nulls--; else sum -= old;
    }

    if (q.length === w && nulls === 0){
      out.values[i] = sum;
    }else{
      out.values[i] = null;
    }
  }
  return out;
}

function _computeRainResponseWindows_(rainB, stageB, step){
  const isHour = (step === "hour");
  const windows = isHour
    ? (Array.isArray(riverAnalysisConfig.responseWindowsHour) ? riverAnalysisConfig.responseWindowsHour : [1,6,24,72])
    : (Array.isArray(riverAnalysisConfig.responseWindowsDay)  ? riverAnalysisConfig.responseWindowsDay  : [1,3,7]);

  const unit = isHour ? "h" : "d";
  const lagMax = isHour ? riverAnalysisConfig.lagMaxHours : Math.ceil(riverAnalysisConfig.lagMaxHours / 24);

  const out = [];
  for (const w of windows){
    const agg = _aggRainWindow_(rainB, w);
    const lag = computeBestLag(
      agg,
      stageB,
      step,
      lagMax,
      { minPoints: riverAnalysisConfig.lagMinPoints, minCorrStrong: riverAnalysisConfig.lagMinCorrStrong }
    );

    const corr = (lag && lag.ok) ? lag.corr : null;
    const score = (corr != null) ? (clamp(Number(corr)||0, 0, 1) * 100) : null;

    out.push({
      window: w,
      unit,
      lag: (lag && lag.ok) ? lag.lag : null,
      corr,
      n: (lag && lag.ok) ? (lag.n || 0) : 0,
      weak: (lag && lag.ok) ? !!lag.weak : false,
      score
    });
  }
  return out;
}

function _fmtRespWindows_(arr){
  if (!Array.isArray(arr) || !arr.length) return "-";
  return arr.map(x=>{
    const w = `${x.window}${x.unit}`;
    const s = (x.score == null ? "-" : `${fmt(x.score,0)}`);
    const lagTxt = (x.lag == null ? "L-" : `L${x.lag}`);
    const weakTxt = x.weak ? " Weak" : "";
    return `${w}:${s} ${lagTxt}${weakTxt}`;
  }).join("  ");
}

async function ensureDistrictHydroAnalysisComputed(force=false){
  if (!districtHydroAnalysisState.enabled) return;

  const wrap = document.getElementById("districtHydroAnalysisWrap");
  if (!wrap || wrap.style.display === "none") return;

  const picker = document.getElementById("districtHydroSitePicker");
  if (!picker) return;

  const stepSel = document.getElementById("districtHydroStep");
  const step = stepSel ? stepSel.value : "day";

  const now = (typeof getAsOfTimeUTC === "function") ? getAsOfTimeUTC() : new Date();
  const to = now;
  const from = new Date(to.getTime() - (riverAnalysisConfig.windowDays || 60) * 86400000);

  // Selected site ids (can be many)
  const selectedIds = getSelectedHydroReadSiteIds().filter(Boolean);
  if (!selectedIds.length){
    // Try auto-select first option if present
    const firstVal = picker.options && picker.options.length ? picker.options[0].value : null;
    if (firstVal){
      setMultiSelectValues(picker, [firstVal]);
    }
  }
  const selectedIds2 = getSelectedHydroReadSiteIds().filter(Boolean);

  // Keep only river sites (some modes can include groundwater or other items)
  // Supports both legacy ids like "river||<name>" and current ids like "<siteName>||<measName>||river||<metric>"
  const riverIds = selectedIds2.filter(v => {
    const p = String(v).split("||");
    return (p[0] === "river") || (p[2] === "river");
  });
  if (!riverIds.length){
    renderDistrictHydroAnalysis({ ok:false, reason:"No river site selected. Set Kind to Rivers then pick one or more gauges." });
    return;
  }

  // Stable selection key
  const selKey = _hashStr32_(riverIds.join("§"));
  const cfgKey = [
    riverAnalysisConfig.windowDays,
    riverAnalysisConfig.kneeSlopeMult,
    riverAnalysisConfig.kneeMinSlope,
    riverAnalysisConfig.lagMaxHours,
    riverAnalysisConfig.halfLifeFastHours,
    riverAnalysisConfig.halfLifeSlowHours
  ].join("|");

  const key = `${step}|${from.toISOString()}|${to.toISOString()}|${selKey}|${cfgKey}`;

  if (!force && districtHydroAnalysisState.lastKey === key && districtHydroAnalysisState.lastResult){
    renderDistrictHydroAnalysis(districtHydroAnalysisState.lastResult);
    return;
  }

  const meta = document.getElementById("districtHydroAnalysisMeta");
  if (meta) meta.textContent = `Computing… (${riverIds.length} site${riverIds.length===1?"":"s"})`;

  // Determine focus id
  let focusId = districtHydroAnalysisState.focusId;
  if (!focusId || !riverIds.includes(focusId)) focusId = riverIds[0];
  districtHydroAnalysisState.focusId = focusId;

  const rows = [];
  let focusResult = null;

  // Compute per site sequentially to avoid hammering caches and the browser
  for (let i=0;i<riverIds.length;i++){
    const rid = riverIds[i];
    const parts = String(rid).split("||");
    const siteName = (parts[0] === "river") ? (parts[1] || "") : (parts[0] || "");

    const raw = (Array.isArray(dataCache?.riverSites) ? dataCache.riverSites : [])
      .find(s => (s.DisplayName||s.Name) === siteName || s.Name === siteName || s.DisplayName === siteName);

    if (!raw){
      rows.push({ id: rid, name: siteName || rid, ok:false, reason:"not found" });
      continue;
    }

    const site = normaliseNrcRiverSite(raw);

    try{
      const r = await _computeRiverAnalysisForSite_(site, step, from, to);
      const resp = (r && r.ok) ? _computeRainResponseWindows_(r.series.rain, r.series.stage, step) : [];
      const row = {
        id: rid,
        name: r?.site?.name || site.title || siteName,
        ok: !!(r && r.ok),
        knee: r?.knee,
        lag: r?.lag,
        half: r?.half,
        scores: r?.scores || {},
        response: resp
      };
      rows.push(row);

      if (rid === focusId){
        focusResult = r;
        districtHydroAnalysisState.seriesById[focusId] = r?.series || null;
      }
    }catch(e){
      rows.push({ id: rid, name: site.title || siteName, ok:false, reason: String(e && e.message || e) });
    }

    if (meta) meta.textContent = `Computing… (${i+1}/${riverIds.length})`;
  }

  // Ensure focus series exists even if focus site failed in loop
  let focusSeries = districtHydroAnalysisState.seriesById[focusId] || null;
  if (!focusSeries && focusResult && focusResult.series) focusSeries = focusResult.series;

  const focusRow = rows.find(r => r.id === focusId) || rows[0] || null;

  const out = {
    ok:true,
    window: { from: from.toISOString(), to: to.toISOString(), step },
    focusId,
    focusName: focusRow?.name || "-",
    focus: (focusResult && focusResult.ok) ? focusResult : null,
    focusSeries,
    rows
  };

  districtHydroAnalysisState.lastKey = key;
  districtHydroAnalysisState.lastResult = out;

  if (meta) meta.textContent = "Ready";
  renderDistrictHydroAnalysis(out);
}

async function _ensureDistrictHydroFocusSeries_(id){
  if (!id) return null;
  if (districtHydroAnalysisState.seriesById && districtHydroAnalysisState.seriesById[id]) return districtHydroAnalysisState.seriesById[id];

  const stepSel = document.getElementById("districtHydroStep");
  const step = stepSel ? stepSel.value : (districtHydroAnalysisState.lastResult?.window?.step || "day");
  const now = (typeof getAsOfTimeUTC === "function") ? getAsOfTimeUTC() : new Date();
  const to = now;
  const from = new Date(to.getTime() - (riverAnalysisConfig.windowDays || 60) * 86400000);

  const parts = String(id).split("||");
  const siteName = (parts[0] === "river") ? (parts[1] || "") : (parts[0] || "");
  const raw = (Array.isArray(dataCache?.riverSites) ? dataCache.riverSites : [])
    .find(s => (s.DisplayName||s.Name) === siteName || s.Name === siteName || s.DisplayName === siteName);
  if (!raw) return null;

  const site = normaliseNrcRiverSite(raw);
  const r = await _computeRiverAnalysisForSite_(site, step, from, to);
  if (r && r.ok){
    districtHydroAnalysisState.seriesById[id] = r.series;
    return r.series;
  }
  return null;
}


function toggleDistrictHydroAnalysisTable(force){
  const card = document.getElementById("districtHydroAnalysisFullTableCard");
  const btn = document.getElementById("btnDistrictHydroAnalysisTable");
  const want = (force == null) ? !(districtHydroAnalysisState.showTable) : !!force;

  districtHydroAnalysisState.showTable = want;
  try{ localStorage.setItem(STORAGE_KEY_HYDRO_READ_ANALYSISTABLE, want ? "1" : "0"); }catch(e){}

  if (card){
    card.style.display = want ? "" : "none";
    if (want && card.scrollIntoView) card.scrollIntoView({ behavior:"smooth", block:"start" });
  }
  if (btn) btn.textContent = want ? "Hide Analysis Table" : "Analysis Table";

  // Render immediately if we have results
  if (want && districtHydroAnalysisState.lastResult){
    renderDistrictHydroAnalysisFullTable(districtHydroAnalysisState.lastResult);
  }
}

function renderDistrictHydroAnalysisFullTable(res){
  const tbl = document.getElementById("tblDistrictHydroAnalysisFull");
  if (!tbl) return;
  if (!res || !res.ok){
    tbl.innerHTML = "";
    return;
  }

  renderDistrictHydroResponseSummary(res);

  const step = res.window?.step || "day";
  const rows = Array.isArray(res.rows) ? res.rows : [];
  const focusId = res.focusId;

  const hdr = ["Gauge","Handling","Handling Detail","Knee Flow","Knee Stage","Base Slope","Knee Slope","Lag","Lag Corr","Half-life","Drain","Drain Detail","Rain Response"];
  let html = "<thead><tr>" + hdr.map(h=>`<th>${h}</th>`).join("") + "</tr></thead><tbody>";

  for (const r of rows){
    const ok = !!r.ok;
    const sc = r.scores || {};
    const k = r.knee || {};
    const lag = r.lag || {};
    const half = r.half || {};
    const handling = (ok && sc.handling != null) ? `${fmt(sc.handling,0)}/100` : "-";
    const kneeFlow  = (ok && k.ok && k.kneeFlow != null) ? `${fmt(k.kneeFlow,2)}` : (ok && k.ok ? (k.note || "-") : "-");
    const kneeStage = (ok && k.ok && k.kneeStage != null) ? `${fmt(k.kneeStage,2)}` : "-";
    const baseSlope = (ok && k.ok && k.baseSlope != null) ? `${fmt(k.baseSlope,4)}` : "-";
    const kneeSlope = (ok && k.ok && k.kneeSlope != null) ? `${fmt(k.kneeSlope,4)}` : "-";
    const lagTxt    = (ok && lag.ok) ? `${lag.lag}${step==="hour"?"h":"d"}` : "-";
    const lagCorr   = (ok && lag.ok && lag.corr != null) ? `${fmt(lag.corr,2)}` : "-";
    const halfTxt   = (ok && half.ok) ? formatHours(half.halfLifeHours) : "-";
    const drain     = (ok && sc.drain != null) ? `${fmt(sc.drain,0)}/100` : "-";
    const respTxt   = ok ? _fmtRespWindows_(r.response) : "-";

    

    // Extra calculation details
    let handlingDetail = "-";
    if (ok && k.ok){
      if (k.kneeFlow == null && k.note){
        handlingDetail = String(k.note);
      }else{
        const mult = (k.mult != null && isFinite(k.mult)) ? k.mult : (Number(appSettings?.riverAnalysis?.kneeSlopeMult) || 3);
        const jump = (k.jump != null && isFinite(k.jump)) ? k.jump : ((isFinite(k.kneeSlope) && isFinite(k.baseSlope)) ? (k.kneeSlope / (k.baseSlope || 1)) : null);
        const posP = (k.kneePos != null && isFinite(k.kneePos)) ? (k.kneePos * 100) : null;
        const parts = [];
        if (jump != null && isFinite(jump)) parts.push(`${fmt(jump,2)}x (≥${fmt(mult,1)}x)`);
        else parts.push(`≥${fmt(mult,1)}x`);
        if (posP != null && isFinite(posP)) parts.push(`Pos ${fmt(posP,0)}%`);
        if (k.targetSlope != null && isFinite(k.targetSlope)) parts.push(`Target ${fmt(k.targetSlope,6)}`);
        handlingDetail = parts.join(", ");
      }
    }

    let drainDetail = "-";
    if (ok && half.ok && half.halfLifeHours != null && isFinite(half.halfLifeHours)){
      const fastH = clamp(Number(appSettings?.riverAnalysis?.halfLifeFastHours)||12, 1, 240);
      const slowH = clamp(Number(appSettings?.riverAnalysis?.halfLifeSlowHours)||72, fastH+1, 480);
      const rF = half.halfLifeHours / fastH;
      const rS = half.halfLifeHours / slowH;
      const parts = [];
      if (isFinite(rF)) parts.push(`${fmt(rF,2)}xFast`);
      if (isFinite(rS)) parts.push(`${fmt(rS,2)}xSlow`);
      if (half.n != null) parts.push(`n=${half.n}`);
      drainDetail = parts.join(", ");
    }
const isFocus = (r.id === focusId);
    const cls = isFocus ? ' style="background:rgba(20,120,200,0.10); cursor:pointer;"' : ' style="cursor:pointer;"';
    html += `<tr data-id="${escapeHtml(r.id)}"${cls}>
      <td>${escapeHtml(r.name || "-")}</td>
      <td>${handling}</td>
      <td>${escapeHtml(handlingDetail)}</td>
      <td>${escapeHtml(kneeFlow)}</td>
      <td>${escapeHtml(kneeStage)}</td>
      <td>${escapeHtml(baseSlope)}</td>
      <td>${escapeHtml(kneeSlope)}</td>
      <td>${escapeHtml(lagTxt)}</td>
      <td>${escapeHtml(lagCorr)}</td>
      <td>${escapeHtml(halfTxt)}</td>
      <td>${escapeHtml(drain)}</td>
      <td>${escapeHtml(drainDetail)}</td>
      <td style="white-space:nowrap;">${escapeHtml(respTxt)}</td>
    </tr>`;
  }

  html += "</tbody>";
  tbl.innerHTML = html;

  if (!tbl._hooked){
    tbl._hooked = true;
    tbl.addEventListener("click", async (ev)=>{
      const tr = ev.target && ev.target.closest ? ev.target.closest("tr[data-id]") : null;
      if (!tr) return;
      const id = tr.getAttribute("data-id");
      if (!id) return;
      districtHydroAnalysisState.focusId = id;
      if (districtHydroAnalysisState.lastResult){
        districtHydroAnalysisState.lastResult.focusId = id;
        const row = (districtHydroAnalysisState.lastResult.rows||[]).find(x=>x.id===id);
        districtHydroAnalysisState.lastResult.focusName = row?.name || "-";
        const series = await _ensureDistrictHydroFocusSeries_(id);
        districtHydroAnalysisState.lastResult.focusSeries = series || null;
        renderDistrictHydroAnalysis(districtHydroAnalysisState.lastResult);
      }else{
        ensureDistrictHydroAnalysisComputed(true);
      }
    });
  }
}

function renderDistrictHydroResponseSummary(res){
  const textEl = document.getElementById("districtHydroResponseSummaryText");
  const stepEl = document.getElementById("districtHydroResponseSummaryStep");
  if (!textEl) return;

  const step = (stepEl && stepEl.value) ? stepEl.value : ((res && res.window && res.window.step) ? res.window.step : "day");

  if (!res || !res.ok){
    const reason = res && res.reason ? String(res.reason) : "No analysis data.";
    textEl.innerHTML = `<div class="tiny muted">${escapeHtml(reason)}</div>`;
    return;
  }

  const rowsAll = Array.isArray(res.rows) ? res.rows : [];
  const focusId = res.focusId || districtHydroAnalysisState.focusId || (rowsAll[0] && rowsAll[0].id) || "";
  const focusRow = rowsAll.find(r => r.id === focusId) || rowsAll[0] || null;
  const focusName = res.focusName || (focusRow && focusRow.name) || (res.focus && res.focus.site && res.focus.site.name) || "";
  const ctx = (focusRow && focusRow.context && typeof focusRow.context === "object") ? focusRow.context : null;
  const soil9 = (ctx && Number.isFinite(ctx.soil9_27)) ? ctx.soil9_27 : null;
  const soil27 = (ctx && Number.isFinite(ctx.soil27_81)) ? ctx.soil27_81 : null;
  const rain24mm = (ctx && Number.isFinite(ctx.rain24mm)) ? ctx.rain24mm : null;
  const rain72mm = (ctx && Number.isFinite(ctx.rain72mm)) ? ctx.rain72mm : null;

  if (!focusRow){
    textEl.innerHTML = `<div class="tiny muted">Click a row in the Sites Summary table to focus a gauge, then this summary will populate.</div>`;
    return;
  }

  const knee = focusRow.knee || {};
  const lag = focusRow.lag || {};
  const half = focusRow.half || {};
  const scores = focusRow.scores || {};

  const handlingVal = (scores && isFinite(scores.handling)) ? fmt(scores.handling,0) : null;
  const handlingBand = (focusRow.handlingBand || scores.handlingBand || "");
  const handling = (handlingVal != null) ? `${handlingVal}${handlingBand ? " ("+escapeHtml(handlingBand)+")" : ""}` : "-";

  const drainVal = (scores && isFinite(scores.drain)) ? fmt(scores.drain,0) : null;
  const drainBand = (focusRow.drainBand || scores.drainBand || "");
  const drain = (drainVal != null) ? `${drainVal}${drainBand ? " ("+escapeHtml(drainBand)+")" : ""}` : "-";

  const kneeTxt = (knee && isFinite(knee.kneeFlow)) ? `${fmt(knee.kneeFlow,2)} ${(knee.unit||"")}${knee.note ? " ("+knee.note+")" : ""}` : ((knee && knee.ok && knee.note) ? knee.note : "-");
  const lagTxt  = (lag && lag.ok && isFinite(lag.lag)) ? `${fmt(lag.lag,0)} ${step==="hour" ? "h" : "d"} (corr ${fmt(lag.corr,2)})` : "-";
  const halfTxt = (half && half.ok && isFinite(half.halfLifeHours)) ? `${formatHours(half.halfLifeHours)} (q=${fmt(half.q,2)})` : "-";

  // Prefer precomputed response windows (computed at the current analysis step)
  let resp = Array.isArray(focusRow.response) ? focusRow.response.slice() : [];
  // Fallback: compute from series if present
  if (!resp.length){
    const s = res.focusSeries || (res.focus && res.focus.series) || null;
    resp = _computeRainResponseWindows_(s?.rain, s?.stage, step);
  }
  resp.sort((a,b)=>((b && b.score != null ? b.score : -1) - (a && a.score != null ? a.score : -1)));

  let bestTxt = `<span class="tiny muted">No clear rain response window detected for this gauge at this interval.</span>`;
  if (resp && resp.length){
    const best = resp[0];
    const w = `${best.window}${best.unit || ""}`;
    const sc = (best.score == null) ? "-" : fmt(best.score,0);
    const corr = (best.corr == null) ? "-" : fmt(best.corr,2);
    const bl = (best.lag == null) ? "-" : fmt(best.lag,0);
    bestTxt = `Best window <b>${escapeHtml(w)}</b> (score <b>${escapeHtml(String(sc))}</b>, lag <b>${escapeHtml(String(bl))}${escapeHtml(best.unit || "")}</b>, corr <b>${escapeHtml(String(corr))}</b>)`;
  }

  const parts = [];
  parts.push(`<div><span class="tiny muted">Focused Gauge:</span> <b>${escapeHtml(focusName || focusRow.name || "-")}</b></div>`);
  parts.push(`<div><span class="tiny muted">Handling Rating:</span> <b>${escapeHtml(handling)}</b> <span class="tiny muted">(stage-per-flow stability)</span></div>`);
  parts.push(`<div><span class="tiny muted">Watershed Drain Rating:</span> <b>${escapeHtml(drain)}</b></div>`);
  parts.push(`<div><span class="tiny muted">Knee Flow:</span> <b>${escapeHtml(kneeTxt)}</b></div>`);
  parts.push(`<div><span class="tiny muted">Rain To Rise Lag:</span> <b>${escapeHtml(lagTxt)}</b></div>`);
    const soilTxt = (soil9!=null || soil27!=null) ? ((soil9!=null ? ("9-27cm " + fmt(soil9,3)) : "") + ((soil9!=null && soil27!=null) ? " | " : "") + (soil27!=null ? ("27-81cm " + fmt(soil27,3)) : "")) : "-";
  const recentRainTxt = (rain24mm!=null || rain72mm!=null) ? ((rain24mm!=null ? ("24h " + fmt(rain24mm,1) + "mm") : "") + ((rain24mm!=null && rain72mm!=null) ? " | " : "") + (rain72mm!=null ? ("72h " + fmt(rain72mm,1) + "mm") : "")) : "-";
  parts.push(`<div><span class="tiny muted">Soil Moisture Near Gauge:</span> <b>${escapeHtml(soilTxt)}</b></div>`);
  parts.push(`<div><span class="tiny muted">Recent Rain Near Gauge:</span> <b>${escapeHtml(recentRainTxt)}</b></div>`);
  parts.push(`<div><span class="tiny muted">Recession Half Life:</span> <b>${escapeHtml(halfTxt)}</b></div>`);
  parts.push(`<div class="mt6">${bestTxt}</div>`);
  parts.push(`<div class="tiny muted mt6">Interval: <b>${escapeHtml(step)}</b>. Rain response windows are heuristic and best used for relative comparison across gauges.</div>`);

  textEl.innerHTML = parts.join("");
}

function renderDistrictHydroAnalysis(res){
  const cards = document.getElementById("districtHydroAnalysisCards");
  const meta = document.getElementById("districtHydroAnalysisMeta");
  const chartMeta = document.getElementById("districtHydroAnalysisChartMeta");
  const tbl = document.getElementById("tblDistrictHydroAnalysisSummary");

  if (!cards) return;

  if (!res || !res.ok){
    cards.innerHTML = _cardHtml_("Status", res && res.reason ? res.reason : "No data", "");
    if (tbl) tbl.innerHTML = "";
    if (meta) meta.textContent = "-";
    if (chartMeta) chartMeta.textContent = "-";
    return;
  }

  const step = res.window?.step || "day";
  try{
    const aSel = document.getElementById("districtHydroAnalysisStep");
    if (aSel && aSel.value !== step) aSel.value = step;
    const rSel = document.getElementById("districtHydroResponseSummaryStep");
    if (rSel && rSel.value !== step) rSel.value = step;
  }catch(e){}

  const rows = Array.isArray(res.rows) ? res.rows : [];
  const focusId = res.focusId;
  let focusName = res.focusName || "-";

  // Summary table
  if (tbl){
    const hdr = (step === "hour") ? ["Gauge","Handling","Knee (cumecs)","Lag","Half-life","Drain","Rain Response (corr score)"] :
                                   ["Gauge","Handling","Knee (cumecs)","Lag","Half-life","Drain","Rain Response (corr score)"];
    let html = "<thead><tr>" + hdr.map(h=>`<th>${h}</th>`).join("") + "</tr></thead><tbody>";
    for (const r of rows){
      const ok = !!r.ok;
      const sc = r.scores || {};
      const k = r.knee || {};
      const lag = r.lag || {};
      const half = r.half || {};
      const handling = (ok && sc.handling != null) ? `${fmt(sc.handling,0)}` : "-";
      const kneeTxt = (ok && k.ok && k.kneeFlow != null) ? `${fmt(k.kneeFlow,2)}` : (ok && k.ok ? (k.note || "-") : "-");
      const lagTxt  = (ok && lag.ok) ? `${lag.lag}${step==="hour"?"h":"d"} (${fmt(lag.corr,2)})` : "-";
      const halfTxt = (ok && half.ok) ? formatHours(half.halfLifeHours) : "-";
      const drain   = (ok && sc.drain != null) ? `${fmt(sc.drain,0)}` : "-";
      const respTxt = ok ? _fmtRespWindows_(r.response) : "-";

      const isFocus = (r.id === focusId);
      const cls = isFocus ? ' style="background:rgba(20,120,200,0.10); cursor:pointer;"' : ' style="cursor:pointer;"';
      html += `<tr data-id="${escapeHtml(r.id)}"${cls}><td>${escapeHtml(r.name || "-")}</td><td>${handling}</td><td>${kneeTxt}</td><td>${lagTxt}</td><td>${halfTxt}</td><td>${drain}</td><td style="white-space:nowrap;">${escapeHtml(respTxt)}</td></tr>`;
    }
    html += "</tbody>";
    tbl.innerHTML = html;

    if (!tbl._hooked){
      tbl._hooked = true;
      tbl.addEventListener("click", async (ev)=>{
        const tr = ev.target && ev.target.closest ? ev.target.closest("tr[data-id]") : null;
        if (!tr) return;
        const id = tr.getAttribute("data-id");
        if (!id) return;
        districtHydroAnalysisState.focusId = id;
        if (districtHydroAnalysisState.lastResult){
          districtHydroAnalysisState.lastResult.focusId = id;
          const row = (districtHydroAnalysisState.lastResult.rows||[]).find(x=>x.id===id);
          districtHydroAnalysisState.lastResult.focusName = row?.name || "-";
          // Ensure focus series for chart
          const series = await _ensureDistrictHydroFocusSeries_(id);
          districtHydroAnalysisState.lastResult.focusSeries = series || null;
          renderDistrictHydroAnalysis(districtHydroAnalysisState.lastResult);
        }else{
          ensureDistrictHydroAnalysisComputed(true);
        }
      });
    }
  }

  if (districtHydroAnalysisState.showTable) renderDistrictHydroAnalysisFullTable(res);

  // Focus cards
  const focusId2 = res.focusId || districtHydroAnalysisState.focusId || (rows[0] && rows[0].id);
  const focusRow = rows.find(r => r.id === focusId2) || rows[0] || null;
  focusName = res.focusName || (focusRow && focusRow.name) || (res.focus && res.focus.site && res.focus.site.name) || "-";
  const focusOk = !!(focusRow && focusRow.ok);

  if (!focusOk){
    cards.innerHTML = _cardHtml_("Status", escapeHtml(res.reason || "Select a river gauge to see analysis."), "Choose a river gauge in the picker, then click Analyse again.");
    if (chartMeta) chartMeta.textContent = "";
    return;
  }

  const knee = focusRow.knee || {};
  const lag = focusRow.lag || {};
  const half = focusRow.half || {};
  const scores = focusRow.scores || {};

  const handlingVal = (scores && isFinite(scores.handling)) ? fmt(scores.handling,0) : null;
  const handlingBand = (focusRow.handlingBand || scores.handlingBand || "");
  const handling = (handlingVal != null) ? `${handlingVal}${handlingBand ? " ("+escapeHtml(handlingBand)+")" : ""}` : "-";

  const drainVal = (scores && isFinite(scores.drain)) ? fmt(scores.drain,0) : null;
  const drainBand = (focusRow.drainBand || scores.drainBand || "");
  const drain = (drainVal != null) ? `${drainVal}${drainBand ? " ("+escapeHtml(drainBand)+")" : ""}` : "-";

  const kneeTxt = (knee && isFinite(knee.kneeFlow)) ? `${fmt(knee.kneeFlow,2)} ${escapeHtml(knee.unit||"")}` : "-";
  const lagTxt  = (lag && lag.ok && isFinite(lag.lag)) ? `${fmt(lag.lag,0)} ${step==="hour" ? "h" : "d"} (${fmt(lag.corr,2)})` : "-";
  const halfTxt = (half && half.ok && isFinite(half.halfLifeHours)) ? `${formatHours(half.halfLifeHours)} (q=${fmt(half.q,2)})` : "-";

  // Precomputed rain response windows (pick the best by score)
  const respArr = Array.isArray(focusRow.response) ? focusRow.response.slice() : [];
  respArr.sort((a,b)=>((b && b.score != null ? b.score : -1) - (a && a.score != null ? a.score : -1)));
  let respStr = "-";
  if (respArr.length){
    const best = respArr[0];
    const w = `${best.window}${best.unit || ""}`;
    const sc = (best.score == null) ? "-" : fmt(best.score,0);
    const corr = (best.corr == null) ? "-" : fmt(best.corr,2);
    const bl = (best.lag == null) ? "-" : fmt(best.lag,0);
    respStr = `${escapeHtml(w)} (score ${sc}, lag ${bl}${best.unit || ""}, corr ${corr})`;
  }

  cards.innerHTML = [
    _cardHtml_("Focused Gauge", escapeHtml(focusName || "-"), `Window ${step}`),
    _cardHtml_("Handling Rating", handling, "Higher means stage rises more slowly per unit flow."),
    _cardHtml_("Knee Flow", kneeTxt, "Estimated point where stage rise accelerates."),
    _cardHtml_("Rainfall To Rise Lag", lagTxt, "Best-fit lag between rain and stage change."),
    _cardHtml_("Rainfall Response", respStr, "Best-performing rain window for this gauge."),
    _cardHtml_("Recession Half Life", halfTxt, "Median time for stage to halve after peaks."),
    _cardHtml_("Watershed Drain Rating", drain, "Based on half-life thresholds.")
  ].join("");
  if (meta) meta.textContent = `Ready (${rows.length} site${rows.length===1?"":"s"})`;
  if (chartMeta) chartMeta.textContent = "Stage, flow and rain are plotted on independent scales";

  const s = res.focusSeries || (res.focus && res.focus.series) || null;
  drawRiverAnalysisChart_("districtHydroAnalysisChart", s?.stage || {times:[],values:[]}, s?.flow || {times:[],values:[]}, s?.rain || {times:[],values:[]});

  // Populate the River Response Summary card
  try{ renderDistrictHydroResponseSummary(res); }catch(e){}
}

function drawRiverAnalysisChart_(canvasId, stageS, flowS, rainS){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(300, rect.width || 520);
  const h = Math.max(140, rect.height || 220);

  canvas.width = Math.floor(w*dpr);
  canvas.height = Math.floor(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  function _isDarkTheme_(){
    try{
      const bg = (getComputedStyle(document.body).backgroundColor || "").toLowerCase();
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return true;
      const r = Number(m[1]) / 255;
      const g = Number(m[2]) / 255;
      const b = Number(m[3]) / 255;
      const lum = 0.2126*r + 0.7152*g + 0.0722*b;
      return lum < 0.45;
    }catch(e){
      return true;
    }
  }

  const dark = _isDarkTheme_();
  const axisCol = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.15)";
  const gridCol = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const textCol = dark ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.75)";

  const pad = 28;
  const X0=pad, Y0=pad, X1=w-pad, Y1=h-pad;

  const allT = []
    .concat(stageS?.times||[])
    .concat(flowS?.times||[])
    .concat(rainS?.times||[])
    ;

  if (allT.length < 2){
    ctx.fillStyle = textCol;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("No data", X0, Y0+14);
    return;
  }

  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);

  function scaleX(t){ return X0 + ( (t - tMin) / (tMax - tMin || 1) ) * (X1 - X0); }
  function minMax(vals){
    const v = (vals||[]).filter(x=>x!=null && isFinite(x));
    if (!v.length) return {min:0,max:1};
    return {min:Math.min(...v), max:Math.max(...v)};
  }
  const stMM = minMax(stageS?.values);
  const flMM = minMax(flowS?.values);
  const rnMM = minMax(rainS?.values);

  function scaleY(v, mm){
    return Y1 - ((v - mm.min) / ((mm.max - mm.min)||1)) * (Y1 - Y0);
  }

  // Axes + grid
  ctx.strokeStyle = axisCol;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X0,Y0); ctx.lineTo(X0,Y1); ctx.lineTo(X1,Y1);
  ctx.stroke();

  ctx.strokeStyle = gridCol;
  ctx.lineWidth = 1;
  for (let i=1;i<=4;i++){
    const y = Y0 + (Y1 - Y0) * (i/5);
    ctx.beginPath();
    ctx.moveTo(X0, y);
    ctx.lineTo(X1, y);
    ctx.stroke();
  }

  function drawSeries(times, vals, mm, stroke, dash){
    const pts = [];
    for (let i=0;i<times.length;i++){
      const v = vals[i];
      if (v == null || !isFinite(v)) continue;
      pts.push([scaleX(times[i]), scaleY(v, mm)]);
    }
    if (pts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.4;
    ctx.setLineDash(Array.isArray(dash) ? dash : []);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  // High-contrast series colors + dash styles for readability
  const cStage = "rgba(80,170,255,0.95)";
  const cFlow  = "rgba(255,190,90,0.95)";
  const cRain  = "rgba(130,230,160,0.92)";

  drawSeries(stageS.times||[], stageS.values||[], stMM, cStage, []);
  drawSeries(flowS.times||[], flowS.values||[], flMM, cFlow, [7,4]);
  drawSeries(rainS.times||[], rainS.values||[], rnMM, cRain, [2,6]);

  // Legend
  ctx.save();
  ctx.fillStyle = textCol;
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  let lx = X0;
  const ly = 14;

  function legendItem(color, label, dash){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 22, ly);
    ctx.stroke();
    ctx.restore();

    ctx.fillText(label, lx + 28, ly + 4);
    lx += 28 + ctx.measureText(label).width + 14;
  }

  legendItem(cStage, "Stage", []);
  legendItem(cFlow, "Flow", [7,4]);
  legendItem(cRain, "Rain", [2,6]);
  ctx.restore();
}


function applyRiverAnalysisSettings_(){
  const ra = (appSettings && appSettings.riverAnalysis) ? appSettings.riverAnalysis : null;
  if (!ra) return;

  const num = (v)=> (v == null ? null : Number(v));
  const clamp = (v, lo, hi)=> Math.min(hi, Math.max(lo, v));
  const asIntList = (arr, lo, hi, fallback)=>{
    if (!Array.isArray(arr)) return fallback;
    const out = [];
    for (const x of arr){
      const n = Math.round(Number(x));
      if (!Number.isFinite(n)) continue;
      if (n < lo || n > hi) continue;
      out.push(n);
    }
    if (!out.length) return fallback;
    const uniq = Array.from(new Set(out));
    uniq.sort((a,b)=>a-b);
    return uniq;
  };

  // Basics
  if (ra.defaultInterval) riverAnalysisConfig.defaultInterval = (String(ra.defaultInterval) === "day") ? "day" : "hour";
  const wd = num(ra.windowDays); if (wd != null && Number.isFinite(wd)) riverAnalysisConfig.windowDays = clamp(Math.round(wd), 3, 365);

  // Pairing tolerances (hours)
  const aH = num(ra.alignTolHours); if (aH != null && Number.isFinite(aH)) riverAnalysisConfig.alignTolHours = clamp(aH, 0, 24);
  const aD = num(ra.alignTolDays);  if (aD != null && Number.isFinite(aD)) riverAnalysisConfig.alignTolDays  = clamp(aD, 0, 72);

  // Rain context windows (hours)
  const rcF = num(ra.rainCtxFastHours); if (rcF != null && Number.isFinite(rcF)) riverAnalysisConfig.rainCtxFastHours = clamp(Math.round(rcF), 1, 240);
  const rcS = num(ra.rainCtxSlowHours); if (rcS != null && Number.isFinite(rcS)) riverAnalysisConfig.rainCtxSlowHours = clamp(Math.round(rcS), 6, 720);

  // Response windows
  riverAnalysisConfig.responseWindowsHour = asIntList(ra.responseWindowsHour, 1, 1000, riverAnalysisConfig.responseWindowsHour);
  riverAnalysisConfig.responseWindowsDay  = asIntList(ra.responseWindowsDay,  1, 365,  riverAnalysisConfig.responseWindowsDay);

  // Lag search and quality thresholds
  const lm = num(ra.lagMaxHours); if (lm != null && Number.isFinite(lm)) riverAnalysisConfig.lagMaxHours = clamp(Math.round(lm), 6, 240);
  const lmp = num(ra.lagMinPoints); if (lmp != null && Number.isFinite(lmp)) riverAnalysisConfig.lagMinPoints = clamp(Math.round(lmp), 3, 200);
  const lcs = num(ra.lagMinCorrStrong); if (lcs != null && Number.isFinite(lcs)) riverAnalysisConfig.lagMinCorrStrong = clamp(lcs, 0, 1);

  // Drain thresholds
  const hf = num(ra.halfLifeFastHours); if (hf != null && Number.isFinite(hf)) riverAnalysisConfig.halfLifeFastHours = clamp(Math.round(hf), 1, 240);
  const hs = num(ra.halfLifeSlowHours); if (hs != null && Number.isFinite(hs)) riverAnalysisConfig.halfLifeSlowHours = clamp(Math.round(hs), 1, 480);

  // Knee
  const ksm = num(ra.kneeSlopeMult); if (ksm != null && Number.isFinite(ksm)) riverAnalysisConfig.kneeSlopeMult = clamp(ksm, 1, 20);
  const kms = num(ra.kneeMinSlope);  if (kms != null && Number.isFinite(kms)) riverAnalysisConfig.kneeMinSlope  = clamp(kms, 0, 1);
  const kbf = num(ra.kneeBaselineFrac); if (kbf != null && Number.isFinite(kbf)) riverAnalysisConfig.kneeBaselineFrac = clamp(kbf, 0, 1);
  const kc  = num(ra.kneeConsecutive); if (kc != null && Number.isFinite(kc)) riverAnalysisConfig.kneeConsecutive = clamp(Math.round(kc), 1, 20);
  const ksw = num(ra.kneeSmoothWin);   if (ksw != null && Number.isFinite(ksw)) riverAnalysisConfig.kneeSmoothWin   = clamp(Math.round(ksw), 1, 25);
  const kmp = num(ra.kneeMinPairs);    if (kmp != null && Number.isFinite(kmp)) riverAnalysisConfig.kneeMinPairs    = clamp(Math.round(kmp), 5, 500);
  if (ra.kneeFallbackEnabled != null) riverAnalysisConfig.kneeFallbackEnabled = !!ra.kneeFallbackEnabled;

  // Band thresholds
  const hh = num(ra.handlingHighScore); if (hh != null && Number.isFinite(hh)) riverAnalysisConfig.handlingHighScore = clamp(hh, 0, 1);
  const hl = num(ra.handlingLowScore);  if (hl != null && Number.isFinite(hl)) riverAnalysisConfig.handlingLowScore  = clamp(hl, 0, 1);
  const df = num(ra.drainFastScore);    if (df != null && Number.isFinite(df)) riverAnalysisConfig.drainFastScore    = clamp(df, 0, 1);
  const ds = num(ra.drainSlowScore);    if (ds != null && Number.isFinite(ds)) riverAnalysisConfig.drainSlowScore    = clamp(ds, 0, 1);
}

/* Location River Analysis Summary (Location Details Panel) */

const locationRiverAnalysisState = { lastKey: null, lastResult: null, inFlight: false };

function _setLocRiverMeta_(txt){
  const el = document.getElementById("locRiverAnalysisMeta");
  if (el) el.textContent = txt || "-";
}

function renderLocationRiverAnalysis(res){
  const wrap = document.getElementById("locRiverAnalysisWrap");
  const cards = document.getElementById("locRiverAnalysisCards");
  if (!wrap || !cards) return;

  if (!res || !res.ok){
    cards.innerHTML = _cardHtml_("Status", res && res.reason ? res.reason : "No data", "");
    _setLocRiverMeta_("-");
    const chart = document.getElementById("locRiverAnalysisChart");
    if (chart){
      const ctx = chart.getContext("2d");
      ctx.clearRect(0,0,chart.width,chart.height);
    }
    return;
  }

  const k = res.knee || {};
  const lag = res.lag || {};
  const half = res.half || {};
  const sc = res.scores || {};
  const step = res.window?.step || "day";

  const handling = (sc.handling == null ? "-" : `${fmt(sc.handling,0)}/100`);
  const kneeTxt = (k && k.ok && k.kneeFlow != null) ? `${fmt(k.kneeFlow,2)} cumecs${k.note ? " ("+k.note+")" : ""}` : (k && k.ok ? (k.note || "-") : "-");
  const lagTxt = (lag && lag.ok) ? `${lag.lag} ${step === "hour" ? "h" : "d"} (corr ${fmt(lag.corr,2)})` : "-";
  const halfTxt = (half && half.ok) ? formatHours(half.halfLifeHours) : "-";
  const drain = (sc.drain == null ? "-" : `${fmt(sc.drain,0)}/100`);

  cards.innerHTML = [
    _cardHtml_("Nearest Gauge", res.site?.name || "-", `Window ${step}`),
    _cardHtml_("Handling Rating", handling, "Higher means stage rises more slowly per unit flow."),
    _cardHtml_("Knee Flow", kneeTxt, "Estimated point where stage rise accelerates."),
    _cardHtml_("Rainfall To Rise Lag", lagTxt, "Best-fit lag between rain and stage change."),
    _cardHtml_("Recession Half Life", halfTxt, "Median time for stage to halve after peaks."),
    _cardHtml_("Watershed Drain Rating", drain, "Based on half-life thresholds.")
  ].join("");

  _setLocRiverMeta_("Ready");
  drawRiverAnalysisChart_("locRiverAnalysisChart", res.series.stage, res.series.flow, res.series.rain);
}

function _seriesSumWindow_(series, endMs, windowMs){
  if (!series || !Array.isArray(series.times) || !Array.isArray(series.values)) return { sum: null, n: 0 };
  const startMs = endMs - windowMs;
  let sum = 0;
  let n = 0;
  for (let i=0;i<series.times.length;i++){
    const t = series.times[i];
    if (!isFinite(t) || t <= startMs || t > endMs) continue;
    const v = series.values[i];
    if (v == null) continue;
    const num = Number(v);
    if (!isFinite(num)) continue;
    sum += num;
    n++;
  }
  return { sum: n ? sum : null, n };
}

function _wxLastAtOrBefore_(locIdx, key, endMs){
  const wx = (dataCache && Array.isArray(dataCache.wxList)) ? dataCache.wxList[locIdx] : null;
  if (!wx || !wx.hourly || !Array.isArray(wx.hourly.time)) return null;
  const times = wx.hourly.time;
  const vals = wx.hourly[key] || wx.hourly[String(key||"").replace(/\s+/g,"_")] || null;
  if (!Array.isArray(vals)) return null;
  let last = null;
  for (let i=0;i<times.length;i++){
    const ms = new Date(times[i]).getTime();
    if (!isFinite(ms) || ms > endMs) continue;
    const v = Number(vals[i]);
    if (isFinite(v)) last = v;
  }
  return last;
}

async function _computeRiverAnalysisForSite_(site, step, from, to){
  if (!site) return { ok:false, reason:"No river gauge available for this location." };

  const stageMeas = site.levelMeasName || site.stageMeasName || "Stage";
  const flowMeas  = site.flowMeasName  || "Flow";

  let stageRaw, flowRaw;
  try{ stageRaw = await ensureHilltopRangeCachedSeries_(site.title || site.name || site.id, stageMeas, from, to); }catch(e){ stageRaw = { times: [], values: [] }; }
  try{ flowRaw  = await ensureHilltopRangeCachedSeries_(site.title || site.name || site.id, flowMeas, from, to); }catch(e){ flowRaw = { times: [], values: [] }; }

  const stageB = _bucketSeriesMean_(_seriesToMs_(stageRaw), step);
  const flowB  = _bucketSeriesMean_(_seriesToMs_(flowRaw), step);

  const wxIdx = _pickNearestWxIndexForGauge_(site);
  const rainRaw = _wxSeries_(wxIdx, step, "precipitation");
  const rainB = _bucketSeriesMean_(_seriesToMs_(rainRaw), step);

  const toMs = to.getTime();
  const rain24 = _seriesSumWindow_(rainB, toMs, 24*3600000);
  const rain72 = _seriesSumWindow_(rainB, toMs, 72*3600000);
  const soil9_27 = _wxLastAtOrBefore_(wxIdx, "soil_moisture_9_27cm", toMs);
  const soil27_81 = _wxLastAtOrBefore_(wxIdx, "soil_moisture_27_81cm", toMs);

  const pairs = _alignByTime_(flowB, stageB, (step === "hour" ? 2*3600000 : 6*3600000));
  const knee = computeFlowStageKnee(pairs, riverAnalysisConfig.kneeSlopeMult, riverAnalysisConfig.kneeMinSlope);

  const lagMax = (step === "hour") ? riverAnalysisConfig.lagMaxHours : Math.ceil(riverAnalysisConfig.lagMaxHours/24);
  const lag = computeBestLag(rainB, stageB, step, lagMax, { minPoints: riverAnalysisConfig.lagMinPoints, minCorrStrong: riverAnalysisConfig.lagMinCorrStrong });

  const half = computeHalfLife(stageB, step);
  const drainScore = (half && half.ok) ? scoreHalfLife(half.halfLifeHours, riverAnalysisConfig.halfLifeFastHours, riverAnalysisConfig.halfLifeSlowHours) : null;

  return {
    ok:true,
    site: { name: site.title || site.name || site.id },
    window: { from: from.toISOString(), to: to.toISOString(), step },
    knee, lag, half,
    scores: { handling: (knee && knee.ok) ? knee.rating : null, drain: drainScore },
    context: { rain24mm: (rain24 && rain24.sum!=null) ? rain24.sum : null, rain72mm: (rain72 && rain72.sum!=null) ? rain72.sum : null, soil9_27: soil9_27, soil27_81: soil27_81 },
    series: { stage: stageB, flow: flowB, rain: rainB }
  };
}

async function refreshLocationRiverAnalysis(row, force=false){
  const wrap = document.getElementById("locRiverAnalysisWrap");
  const cards = document.getElementById("locRiverAnalysisCards");
  if (!wrap || !cards) return;

  if (!row || !row.loc){
    renderLocationRiverAnalysis({ ok:false, reason:"No location selected." });
    return;
  }

  // Only show the River Response Summary card when this location has a matched river gauge.
  // The match is determined earlier during recompute and stored on the computed row as row.riverGauge.
  const matchedRiver = (row && row.riverGauge && row.riverGauge.site) ? row.riverGauge : null;
  if (!matchedRiver){
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";

  const stepSel = document.getElementById("locRiverAnalysisStep");
  if (stepSel && !stepSel.value){
    stepSel.value = (riverAnalysisConfig.defaultInterval === "hour") ? "hour" : "day";
  }
  const step = stepSel ? String(stepSel.value || "day") : "day";

  // Bind controls (rebind per render)
  if (stepSel && !stepSel.dataset.bound){
    stepSel.addEventListener("change", () => { refreshLocationRiverAnalysis(row, true); });
    stepSel.dataset.bound = "1";
  }

  const btnOpen = document.getElementById("btnOpenRiverAnalysisFromLocation");
  if (btnOpen && !btnOpen.dataset.bound){
    btnOpen.addEventListener("click", () => {
      try{
        const kindSel = document.getElementById("districtHydroKind");
        const scopeSel = document.getElementById("districtHydroScope");
        const stepSel2 = document.getElementById("districtHydroStep");
        const picker = document.getElementById("districtHydroSitePicker");

        if (kindSel) kindSel.value = "river";
        if (scopeSel) scopeSel.value = "all";
        if (stepSel2) stepSel2.value = step;

        const siteName = btnOpen.dataset.siteName || "";

// Rebuild metric and picker options now that we changed kind/scope/step above
try{
  if (typeof populateHydroReadMetricSelector === "function") populateHydroReadMetricSelector(getSelectedHydroReadKind());
  if (typeof populateHydroReadSitePicker === "function") populateHydroReadSitePicker(getSelectedHydroReadKind(), getSelectedHydroReadMetric(), getSelectedHydroReadScope());
}catch(e){}

if (picker){
  const opts = Array.from(picker.options || []);
  if (siteName && opts.length){
    const match = opts.find(o => String(o.value || "").startsWith(siteName + "||")) || opts.find(o => String(o.textContent || "").includes(siteName));
    if (match){
      opts.forEach(o => o.selected = false);
      match.selected = true;
    }
  }
  // Fallback: ensure at least one site is selected
  if (!Array.from(picker.selectedOptions || []).length && (picker.options || []).length){
    picker.options[0].selected = true;
  }
}

        // Kick refresh of district hydrology and open analysis
        if (typeof ensureDistrictHydroReadingsComputed === "function"){
          ensureDistrictHydroReadingsComputed(true);
        }
        if (typeof toggleDistrictHydroAnalysisMode === "function"){
          toggleDistrictHydroAnalysisMode(true);
        }
        if (typeof refreshDistrictHydroAnalysisIfVisible === "function"){
          refreshDistrictHydroAnalysisIfVisible(true);
        }

        // Scroll into view
        const target = document.getElementById("districtHydroReadingsChart");
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }catch(e){
        console.warn("Open River Analysis failed", e);
      }
    });
    btnOpen.dataset.bound = "1";
  }

  const cursor = (timeMode === "historic") ? getAsOfDate() : new Date();
  const pastDays = Number(dataCache?.pastDays) || Number(document.getElementById("pastDays")?.value) || 30;
  const from = new Date(cursor.getTime() - pastDays*86400000);
  const to = cursor;

  // Use the pre-matched river gauge for this location (row.riverGauge). If there is no match,
  // the card is hidden earlier and we return before reaching this point.
  const nearestRef = matchedRiver;
  const nearestSite = (nearestRef && nearestRef.site) ? nearestRef.site : null;

  if (!nearestSite){
    wrap.style.display = "none";
    return;
  }

  const pickName = String(nearestSite.id || nearestSite.title || nearestSite.name || "");
  const key = `${row.loc.name}|${pickName}|${step}|${(timeMode === "historic" ? getAsOfDate()?.toISOString?.() : "live")}|${pastDays}`;
  if (!force && locationRiverAnalysisState.lastKey === key && locationRiverAnalysisState.lastResult){
    renderLocationRiverAnalysis(locationRiverAnalysisState.lastResult);
    if (btnOpen) btnOpen.dataset.siteName = String(pickName || "");
    return;
  }

  _setLocRiverMeta_("Computing...");
  try{
    const out = await _computeRiverAnalysisForSite_(nearestSite, step, from, to);
    locationRiverAnalysisState.lastKey = key;
    locationRiverAnalysisState.lastResult = out;
    if (btnOpen) btnOpen.dataset.siteName = String(pickName || "");
    renderLocationRiverAnalysis(out);
  }catch(e){
    console.warn("Location river analysis failed", e);
    renderLocationRiverAnalysis({ ok:false, reason:"Failed to compute river analysis for this location." });
  }
}

// Expose for other parts of the app if needed
window.refreshLocationRiverAnalysis = refreshLocationRiverAnalysis;





function scheduleDistrictTrendBuild(){
      const canvas = document.getElementById("districtTrendChart");
      if (!canvas) return;

      // Make sure env selector is initialised even if the user never opens District Summary first.
      const envSel = document.getElementById("districtEnvMetric");
      if (envSel && !envSel._hooked){
        envSel._hooked = true;
        const saved = localStorage.getItem(STORAGE_KEY_ENV_METRIC);
        if (saved) envSel.value = saved;
        envSel.addEventListener("change", ()=>{
          localStorage.setItem(STORAGE_KEY_ENV_METRIC, envSel.value);
          // Force rebuild for new metric
          districtEnvTrend.key = null;
          scheduleDistrictTrendBuild();
        });
      }


      const envStepSel = document.getElementById("districtEnvStep");
      if (envStepSel && !envStepSel._hooked){
        envStepSel._hooked = true;
        const saved = localStorage.getItem(STORAGE_KEY_ENV_STEP);
        if (saved) envStepSel.value = saved;
        envStepSel.addEventListener("change", ()=>{
          localStorage.setItem(STORAGE_KEY_ENV_STEP, envStepSel.value);
          districtEnvTrend.key = null;
          scheduleDistrictTrendBuild();
        });
      }

      const hydroStepSel = document.getElementById("districtHydroTrendStep");
      if (hydroStepSel && !hydroStepSel._hooked){
        hydroStepSel._hooked = true;
        const saved = localStorage.getItem(STORAGE_KEY_DISTRICT_HYDRO_TREND_STEP);
        if (saved) hydroStepSel.value = saved;
        hydroStepSel.addEventListener("change", ()=>{
          localStorage.setItem(STORAGE_KEY_DISTRICT_HYDRO_TREND_STEP, hydroStepSel.value);
          districtHydroTrend.key = null;
          scheduleDistrictTrendBuild();
        });
      }

      window.clearTimeout(scheduleDistrictTrendBuild._t);
      scheduleDistrictTrendBuild._t = window.setTimeout(()=>{
        ensureDistrictTrendComputed(false).catch(()=>{});
        renderDistrictTrendChart();

        ensureDistrictEnvTrendComputed(false).catch(()=>{});
        renderDistrictEnvTrendChart();
        if (typeof ensureLocIndexTrendComputed === "function"){
          ensureLocIndexTrendComputed(false).catch(()=>{});
        }
        if (typeof renderLocIndexTrendChart === "function"){
          renderLocIndexTrendChart();
        }


        ensureDistrictHydroTrendComputed(false).catch(()=>{});
        renderDistrictHydroTrendCharts();

        hookDistrictHydroReadControls();
        ensureDistrictHydroReadingsComputed(false).catch(()=>{});
        renderDistrictHydroReadingsChart();
        refreshDistrictHydroListIfVisible(false);
}, 60);
    }

    function selectLocation(id, panTo=false){
      selectedId = id;
      localStorage.setItem(STORAGE_KEY_LASTSEL, id);

      const row = computed.find(r => r.loc.id === id);
      if (!row) return;

      const trs = $("tbody").querySelectorAll("tr");
      trs.forEach(tr => {
        if (tr.dataset.id === id) tr.style.outline = "2px solid rgba(56,189,248,0.25)";
        else tr.style.outline = "none";
      });

      if (panTo && map){
        map.setView([row.loc.lat, row.loc.lon], Math.max(map.getZoom(), 9));
      }

      renderDetails(row);

      // Text Summary module: keep location summary in sync without triggering extra fetches
      try{
        if (typeof window.textSummaryNotifySelectionChanged_ === "function") window.textSummaryNotifySelectionChanged_();
      }catch(_e){}

      if (typeof setLocIndexTrendLocation === "function"){
        try { setLocIndexTrendLocation(id); } catch(_e) {}
      }
}

    
    function buildIndexBreakdownHtml(index){
      const b = index?.breakdown;
      if (!b || !Array.isArray(b.components)){
        return `<div class="muted">Breakdown not available for this location. Refresh to generate it.</div>`;
      }

      const rows = b.components.map(c => {
        const dry = c.dryness01 == null ? "-" : fmt(c.dryness01, 2);
        const baseW = (c.baseWeight == null) ? "-" : fmt(c.baseWeight, 2);
        const effW = (c.effectiveWeight == null) ? "-" : (fmt(c.effectiveWeight * 100, 0) + "%");
        const contrib = (c.contributionToScore == null) ? "-" : fmt(c.contributionToScore, 1);

        let rawTxt = "-";
        if (c.key === "rain"){
          rawTxt = `14d=${fmt(c.raw?.pastRain14_mm, 1)}mm, 7dFc=${fmt(c.raw?.forecastRain7_mm, 1)}mm`;
        } else if (c.key === "evap"){
          rawTxt = `ET0 7dFc=${fmt(c.raw?.et0Forecast7_mm, 1)}mm, VPD=${fmt(c.raw?.vpdMean7, 2)}`;
        } else if (c.key === "humidity"){
          rawTxt = `RH mean 7d=${fmt(c.raw?.rhMean7_pct, 0)}%`;
        } else if (c.key === "river"){
          rawTxt = (c.raw?.riverNow == null) ? "-" : `Now=${fmt(c.raw?.riverNow, 2)}${c.raw?.riverUnit ? " " + String(c.raw.riverUnit) : ""} (30d ${fmt(c.raw?.baselineMin30, 2)}–${fmt(c.raw?.baselineMax30, 2)})`;
        } else if (c.key === "soil"){
          const ok = Array.isArray(c.raw?.layers) ? c.raw.layers.filter(x => x && x.current != null).length : 0;
          rawTxt = ok ? `${ok} layer(s) with data` : "No soil layers available";
        }

        let mapTxt = "-";
        if (c.key === "rain"){
          const th = c.mapping?.thresholds;
          mapTxt = th ? `14d wet ${fmt(th.rain14?.wet_mm, 0)} dry ${fmt(th.rain14?.dry_mm, 0)} | 7dFc wet ${fmt(th.rain7Forecast?.wet_mm, 0)} dry ${fmt(th.rain7Forecast?.dry_mm, 0)}` : "-";
        } else if (c.key === "evap"){
          const th = c.mapping?.thresholds;
          mapTxt = th ? `ET0 low ${fmt(th.et0_7?.low, 0)} high ${fmt(th.et0_7?.high, 0)} | VPD low ${fmt(th.vpd?.low, 2)} high ${fmt(th.vpd?.high, 2)}` : "-";
        } else if (c.key === "humidity"){
          const th = c.mapping?.thresholds;
          mapTxt = th ? `RH wet ${fmt(th.rh7?.wet_pct, 0)} dry ${fmt(th.rh7?.dry_pct, 0)}` : "-";
        } else if (c.key === "river"){
          mapTxt = (c.raw?.baselineMin30 == null || c.raw?.baselineMax30 == null) ? "-" : `Baseline 30d min ${fmt(c.raw.baselineMin30, 2)} max ${fmt(c.raw.baselineMax30, 2)}`;
        } else if (c.key === "soil"){
          mapTxt = `Baseline window ${c.raw?.baselineDays ?? "-"} day(s)`;
        }

        const included = c.included ? "Yes" : "No";

        return `<tr>
          <td>${escapeHtml(c.label)}</td>
          <td class="mono">${included}</td>
          <td class="mono">${dry}</td>
          <td>${escapeHtml(rawTxt)}</td>
          <td>${escapeHtml(mapTxt)}</td>
          <td class="mono">${baseW} (${effW})</td>
          <td class="mono">${contrib}</td>
        </tr>`;
      }).join("");

      return `
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-bottom:8px; flex-wrap:wrap;">
          <button class="btn small" id="btnCopyIndexBreakdown" title="Copy the breakdown JSON to clipboard">Copy JSON</button>
          <button class="btn small" id="btnDownloadIndexBreakdown" title="Download the breakdown JSON">Download JSON</button>
        </div>

        <div style="overflow:auto; max-height: 360px;">
          <table class="tblMini">
            <thead>
              <tr>
                <th>Component</th>
                <th>Used</th>
                <th>Dryness</th>
                <th>Raw Values</th>
                <th>Mapping</th>
                <th>Weight</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="tiny muted" style="margin-top:8px;">
          Contribution is points out of 100. Effective weight is renormalized across available components only.
        </div>
      `;
    }

    

function _dayKeyAuckland_(dt){
  try{
    const d = (dt instanceof Date) ? dt : new Date(dt);
    const parts = new Intl.DateTimeFormat("en-NZ", {
      timeZone: "Pacific/Auckland",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(d);

    const m = {};
    for (const p of parts) m[p.type] = p.value;
    return `${m.year}-${m.month}-${m.day}`;
  } catch (e){
    const d = (dt instanceof Date) ? dt : new Date(dt);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
}

function _finite_(v){
  return v != null && isFinite(v);
}

function _normFlowUnits_(u){
  const s = (u == null) ? "" : String(u).trim();
  if (!s) return "";
  const low = s.toLowerCase().replace(/\s+/g, "");
  // Common variants for litres per second
  if (low.includes("l/s") || low.includes("lps") || low.includes("litre") || low.includes("liter") || low.includes("lsec")){
    return "l/s";
  }
  // Common variants for cubic metres per second
  if (low.includes("m3/s") || low.includes("m^3/s") || low.includes("m³/s") || low.includes("cumec") || low.includes("cumecs")){
    return "m3/s";
  }
  if (low.includes("m3") && (low.includes("/s") || low.includes("s-1"))){
    return "m3/s";
  }
  return s;
}

function _flowUnitToM3Factor_(u){
  const s = (u == null) ? "" : String(u).toLowerCase();
  if (!s) return 1;
  if (s.includes("l/s") || s.includes("lps") || s.includes("litre") || s.includes("liter") || s.includes("lsec")){
    return 0.001; // 1 L/s = 0.001 m3/s
  }
  return 1; // assume m3/s
}


function _sortedFinite_(arr){
  const out = [];
  if (Array.isArray(arr)){
    for (const v of arr){
      const n = Number(v);
      if (_finite_(n)) out.push(n);
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

function _quantileSorted_(sorted, q){
  if (!sorted || !sorted.length) return null;
  const qq = clamp(Number(q) || 0, 0, 1);
  const pos = (sorted.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] == null) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function _medianSorted_(sorted){
  return _quantileSorted_(sorted, 0.5);
}

function _percentileInSorted_(sorted, v){
  if (!sorted || !sorted.length || !_finite_(v)) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi){
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  return clamp((lo / sorted.length) * 100, 0, 100);
}

function _pearsonCorr_(xs, ys){
  const n = Math.min(xs?.length || 0, ys?.length || 0);
  if (n < 3) return null;

  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let k = 0;

  for (let i = 0; i < n; i++){
    const x = Number(xs[i]);
    const y = Number(ys[i]);
    if (!_finite_(x) || !_finite_(y)) continue;
    k++;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }

  if (k < 3) return null;
  const num = (k * sxy) - (sx * sy);
  const den = Math.sqrt(((k * sxx) - (sx * sx)) * ((k * syy) - (sy * sy)));
  if (!isFinite(den) || den <= 1e-12) return null;
  return num / den;
}

function _computeDischargeStatsFromDaily_(dates, values, asOfDate, baselineDays = 30){
  const out = {
    ok: false,
    reason: "",
    dateNow: null,
    now: null,
    prev: null,
    delta: null,
    deltaPct: null,
    baselineDays: baselineDays,
    sampleCount: 0,
    min: null,
    p10: null,
    median: null,
    p90: null,
    max: null,
    percentile: null,
    pctOfMedian: null,
    dryness01: null,
    dryness100: null
  };

  if (!Array.isArray(dates) || !Array.isArray(values) || !dates.length){
    out.reason = "No series";
    return out;
  }

  const asOfKey = _dayKeyAuckland_(asOfDate instanceof Date ? asOfDate : new Date(asOfDate));
  let idx = -1;
  for (let i = 0; i < dates.length; i++){
    if (dates[i] <= asOfKey) idx = i;
  }
  if (idx < 0){
    out.reason = "No data at or before as-of date";
    return out;
  }

  let now = null;
  let nowIdx = -1;
  for (let i = idx; i >= 0; i--){
    const v = Number(values[i]);
    if (_finite_(v)){
      now = v;
      nowIdx = i;
      break;
    }
  }
  if (nowIdx < 0){
    out.reason = "No finite values";
    return out;
  }

  let prev = null;
  for (let i = nowIdx - 1; i >= 0; i--){
    const v = Number(values[i]);
    if (_finite_(v)){
      prev = v;
      break;
    }
  }

  const start = Math.max(0, nowIdx - (baselineDays - 1));
  const baseline = [];
  for (let i = start; i <= nowIdx; i++){
    const v = Number(values[i]);
    if (_finite_(v)) baseline.push(v);
  }

  const sorted = _sortedFinite_(baseline);
  if (!sorted.length){
    out.reason = "No baseline samples";
    return out;
  }

  out.ok = true;
  out.dateNow = dates[nowIdx] || null;
  out.now = now;
  out.prev = prev;
  out.sampleCount = sorted.length;

  out.min = sorted[0];
  out.max = sorted[sorted.length - 1];
  out.p10 = _quantileSorted_(sorted, 0.10);
  out.median = _medianSorted_(sorted);
  out.p90 = _quantileSorted_(sorted, 0.90);
  out.percentile = _percentileInSorted_(sorted, now);

  if (_finite_(out.median) && out.median != 0){
    out.pctOfMedian = (now / out.median) * 100;
  }

  if (_finite_(prev)){
    out.delta = now - prev;
    if (prev != 0) out.deltaPct = (out.delta / prev) * 100;
  }

  if (_finite_(out.min) && _finite_(out.max)){
    const denom = out.max - out.min;
    const wetness = denom <= 1e-12 ? 0.5 : clamp((now - out.min) / denom, 0, 1);
    out.dryness01 = clamp(1 - wetness, 0, 1);
    out.dryness100 = out.dryness01 * 100;
  }

  return out;
}

function _toDailyMeanFromHilltop_(series){
  const times = series?.times || series?.time || series?.dates || [];
  const values = series?.values || series?.vals || [];

  const byDay = new Map();

  for (let i = 0; i < Math.min(times.length, values.length); i++){
    let dt = null;
    try{
      if (typeof parseHilltopTimeToDate === "function") dt = parseHilltopTimeToDate(times[i]);
      else dt = new Date(times[i]);
    }catch(e){ dt = null; }

    if (!dt || isNaN(dt.getTime())) continue;

    const key = _dayKeyAuckland_(dt);
    const v = Number(values[i]);
    if (!_finite_(v)) continue;

    const cur = byDay.get(key) || { sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    byDay.set(key, cur);
  }

  const keys = Array.from(byDay.keys()).sort();
  const outDates = [];
  const outValues = [];
  const counts = [];

  for (const k of keys){
    const cur = byDay.get(k);
    if (!cur || !cur.n) continue;
    outDates.push(k);
    outValues.push(cur.sum / cur.n);
    counts.push(cur.n);
  }

  return { dates: outDates, values: outValues, counts };
}

function _fmtSigned_(n, digits){
  if (!_finite_(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return sign + fmt(n, digits == null ? 2 : digits);
}

function _buildDischargeStatsHtml_(stats, unit, extraTopHtml){
  if (!stats || !stats.ok){
    return `<div class="muted">${escapeHtml(stats?.reason || "No discharge data")}</div>`;
  }

  const f2 = (v) => (_finite_(v) ? fmt(v, 2) : "-");
  const f0 = (v) => (_finite_(v) ? fmt(v, 0) : "-");

  const lines = [];
  if (extraTopHtml) lines.push(extraTopHtml);

  lines.push(`<div>Current Flow: <strong class="mono">${f2(stats.now)}</strong> <span class="tiny muted">${escapeHtml(unit)}</span></div>`);
  lines.push(`<div class="tiny muted">Baseline ${escapeHtml(String(stats.baselineDays))}d Range: ${f2(stats.min)} to ${f2(stats.max)} ${escapeHtml(unit)}</div>`);
  lines.push(`<div class="tiny muted">Baseline P10, Median, P90: ${f2(stats.p10)}, ${f2(stats.median)}, ${f2(stats.p90)} ${escapeHtml(unit)}</div>`);

  if (stats.percentile != null){
    lines.push(`<div class="tiny muted">Baseline Percentile: ${f0(stats.percentile)}%</div>`);
  }

  if (stats.pctOfMedian != null){
    lines.push(`<div class="tiny muted">Percent Of Median: ${f0(stats.pctOfMedian)}%</div>`);
  }

  if (stats.delta != null){
    const pct = stats.deltaPct != null ? ` (${_fmtSigned_(stats.deltaPct, 1)}%)` : "";
    lines.push(`<div class="tiny muted">24h Change: ${_fmtSigned_(stats.delta, 2)} ${escapeHtml(unit)}${pct}</div>`);
  }

  if (stats.dryness01 != null){
    lines.push(`<div class="tiny muted">Normalized Dryness: ${fmt(stats.dryness01, 2)} (${f0(stats.dryness100)}/100)</div>`);
  }

  return lines.join("\n");
}


function _getFloodForRow_(row){
  // Flood data is stored in dataCache.floodList aligned to the global `locations` array.
  // NOTE: Open-Meteo Flood may return a *nearest river point* (latitude/longitude can differ from the requested location).
  // We primarily align by location index/id, with a lat/lon fallback.
  try{
    if (row && row.flood && row.flood.daily) return row.flood;

    const locId = row?.loc?.id;
    const arr = (typeof dataCache !== "undefined" && dataCache && Array.isArray(dataCache.floodList)) ? dataCache.floodList : null;
    if (!arr || !arr.length) return null;

    if (locId != null && typeof locations !== "undefined" && Array.isArray(locations) && locations.length){
      const idx = locations.findIndex(l => l && String(l.id) === String(locId));
      if (idx >= 0) return arr[idx] || null;
    }

    // Fallback: try to match by lat/lon if present (best-effort)
    const lat = row?.loc?.lat;
    const lon = row?.loc?.lon;
    if (Number.isFinite(lat) && Number.isFinite(lon)){
      let best = null;
      let bestD = Infinity;
      for (const it of arr){
        if (it && Number.isFinite(it.latitude) && Number.isFinite(it.longitude)){
          const d = (typeof haversineKm === "function") ? haversineKm(lat, lon, it.latitude, it.longitude) : Math.hypot(it.latitude-lat, it.longitude-lon);
          if (d < bestD){ bestD = d; best = it; }
        }
      }
      // Only accept the nearest-point match if it is reasonably close
      if (best && isFinite(bestD) && bestD < 25) return best;
    }

    return null;
  }catch(_e){
    return null;
  }
}

function _fmtCoord4_(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return (Math.round(n * 10000) / 10000).toFixed(4);
}

function _floodPointInfoText_(row, flood){
  try{
    if (!row || !flood) return "";
    const fpLat = flood.latitude;
    const fpLon = flood.longitude;
    if (!Number.isFinite(fpLat) || !Number.isFinite(fpLon)) return "";

    const ll = `${_fmtCoord4_(fpLat)}, ${_fmtCoord4_(fpLon)}`;

    const lat = row?.loc?.lat;
    const lon = row?.loc?.lon;
    if (Number.isFinite(lat) && Number.isFinite(lon) && typeof haversineKm === "function"){
      const km = haversineKm(lat, lon, fpLat, fpLon);
      if (Number.isFinite(km)) return `Flood point used: ${ll} (${fmt(km, 1)} km)`;
    }
    return `Flood point used: ${ll}`;
  }catch(_e){
    return "";
  }
}

function _floodPointInfoHtml_(row, flood){
  const t = _floodPointInfoText_(row, flood);
  if (!t) return "";
  // keep it compact and readable
  return `<div class="tiny muted">${escapeHtml(t)}</div>`;
}

function buildRiverDischargeModelHtml(row){
  try{
    const index = row?.index;
    const comp = index?.breakdown?.components?.find(c => c && c.key === "river") || null;

    const flood = _getFloodForRow_(row);
    const asOf = (typeof getAsOfDate === "function") ? getAsOfDate() : new Date();

    if (!flood || !flood.daily || !Array.isArray(flood.daily.time) || !Array.isArray(flood.daily.river_discharge)){
      return `<div class="muted">Open-Meteo Flood discharge series not available for this location.</div>`;
    }

    const stats = _computeDischargeStatsFromDaily_(flood.daily.time, flood.daily.river_discharge, asOf, 30);

    const wTxt = (comp && comp.w != null) ? fmt(comp.w, 2) : "-";
    const effW = (comp && comp.effectiveWeight != null) ? fmt(comp.effectiveWeight * 100, 0) : "-";
    const contrib = (comp && comp.contribution != null) ? fmt(comp.contribution, 1) : "-";

    const unit = "m3/s";
    const fpInfo = _floodPointInfoHtml_(row, flood);
    const srcNote = `<div class="tiny muted" style="margin-bottom:6px;">Open-Meteo Flood daily discharge, matched to the nearest flood point for this location.${fpInfo ? "<br/>" + fpInfo : ""}</div>`;

    let html = _buildDischargeStatsHtml_(stats, unit, srcNote);

    html += `
<div class="tiny muted" style="margin-top:6px;">Index Component: River<br/>Weight: ${escapeHtml(wTxt)} (Effective: ${escapeHtml(effW)}%)<br/>Contribution: ${escapeHtml(contrib)}</div>`;

    return html;
  } catch (e){
    return `<div class="muted">Unable to compute modelled discharge stats.</div>`;
  }
}




function buildComponentScoresTableHtml_(row){
  try{
    const b = row?.index?.breakdown;
    const comps = Array.isArray(b?.components) ? b.components : [];
    const m = row?.index?.metrics || {};
    const soilLayers = Array.isArray(row?.index?.soilDetails) ? row.index.soilDetails.length : 0;

    const fmtOrDash = (v, d) => {
      if (v == null || !isFinite(v)) return "-";
      return fmt(v, d);
    };

    const infoFor = (key) => {
      if (key === "soil"){
        const base = (droughtConfig && droughtConfig.windows && droughtConfig.windows.soilBaselineDays) ? droughtConfig.windows.soilBaselineDays : 30;
        return `Baseline ${base}d | Layers ${soilLayers}`;
      }
      if (key === "rain"){
        return `Past14d ${fmtOrDash(m.pastRain14, 0)}mm | Forecast7d ${fmtOrDash(m.forecastRain7, 0)}mm`;
      }
      if (key === "evap"){
        return `ET0 7d ${fmtOrDash(m.et0_7, 1)}mm | VPD ${fmtOrDash(m.vpdMean, 2)}`;
      }
      if (key === "humidity"){
        return `RH 7d ${fmtOrDash(m.rhMean7, 0)}%`;
      }
      if (key === "river"){
        const src = m.riverSource || "Modelled";
        const q = (m.riverMeta && m.riverMeta.quality) ? m.riverMeta.quality : null;
        const qTxt = q ? ` | Quality ${escapeHtml(String(q))}` : "";
        const u = m.riverUnit ? (' ' + escapeHtml(String(m.riverUnit))) : '';
        return `Now ${fmtOrDash(m.riverNow, 2)}${u} | Min30 ${fmtOrDash(m.riverMin30, 2)}${u} | Max30 ${fmtOrDash(m.riverMax30, 2)}${u} | Source ${escapeHtml(String(src))}${qTxt}`;
      }
      return "";
    };

    if (!comps.length){
      const parts = row?.index?.parts || {};
      return `<div class="s">
        Soil: <strong class="mono">${fmtOrDash(parts.soil, 2)}</strong><br/>
        Rain: <strong class="mono">${fmtOrDash(parts.rain, 2)}</strong><br/>
        Evap Demand: <strong class="mono">${fmtOrDash(parts.evap, 2)}</strong><br/>
        Humidity: <strong class="mono">${fmtOrDash(parts.humidity, 2)}</strong><br/>
        River: <strong class="mono">${fmtOrDash(parts.river, 2)}</strong>
      </div>`;
    }

    const head = `<thead>
      <tr>
        <th style="text-align:left; padding:6px 6px 6px 0; font-size:12px;">Component</th>
        <th style="text-align:right; padding:6px 0; font-size:12px;">Dryness</th>
        <th style="text-align:right; padding:6px 0; font-size:12px;">Weight</th>
        <th style="text-align:right; padding:6px 0; font-size:12px;">Points</th>
        <th style="text-align:left; padding:6px 0 6px 10px; font-size:12px;">Inputs</th>
      </tr>
    </thead>`;

    const body = `<tbody>` + comps.map(c => {
      const dryness = (c.dryness01 == null || !isFinite(c.dryness01)) ? "-" : fmt(c.dryness01, 2);
      const w = (c.effectiveWeight == null || !isFinite(c.effectiveWeight)) ? "-" : (fmt(c.effectiveWeight * 100, 0) + "%");
      const pts = (c.contributionToScore == null || !isFinite(c.contributionToScore)) ? "-" : fmt(c.contributionToScore, 1);
      const label = escapeHtml(c.label || c.key || "");
      const info = infoFor(c.key);
      const dim = c.included ? "" : ' style="opacity:0.55;"';
      return `<tr${dim}>
        <td style="padding:6px 6px 6px 0; vertical-align:top;"><span class="mono">${label}</span></td>
        <td style="padding:6px 0; text-align:right; vertical-align:top;" class="mono">${dryness}</td>
        <td style="padding:6px 0; text-align:right; vertical-align:top;" class="mono">${w}</td>
        <td style="padding:6px 0; text-align:right; vertical-align:top;" class="mono">${pts}</td>
        <td style="padding:6px 0 6px 10px; vertical-align:top;" class="tiny muted">${info}</td>
      </tr>`;
    }).join("") + `</tbody>`;

    return `
      <div class="s">
        <table style="width:100%; border-collapse:collapse;">
          ${head}
          ${body}
        </table>
        <div class="hint" style="margin-top:6px;">Dryness is 0 for wet and 1 for dry. Points are the weighted contribution to the 0 to 100 index score.</div>
      </div>
    `;
  }catch(e){
    return `<div class="s muted">Component breakdown unavailable</div>`;
  }
}

function renderDetails(row){
      const cat = categoryForIndex(row.index.score);
      const panel = $("detailPanel");

      const parts = row.index.parts;
      const m = row.index.metrics;

      panel.innerHTML = `
        <h3>${escapeHtml(row.loc.name)}</h3>

        <div class="grid2">
          <div class="miniCard">
            <div class="k">Drought Index</div>
            <div class="v mono">${fmt(row.index.score, 0)} <span style="font-size:12px; font-weight:600; opacity:0.85;">${cat.name}</span></div>
            <div class="s">Composite signal from soil, rain, evap demand, humidity and river when available</div>
          </div>

          <div class="miniCard">
            <div class="k">Key Observations</div>
            <div class="s">
              Rain 14d: <strong class="mono">${fmt(m.pastRain14, 1)} mm</strong><br/>
              Forecast Rain 7d: <strong class="mono">${fmt(m.forecastRain7, 1)} mm</strong><br/>
              Forecast ET0 7d: <strong class="mono">${fmt(m.et0_7, 1)} mm</strong><br/>
              Forecast VPD Mean: <strong class="mono">${fmt(m.vpdMean, 2)}</strong><br/>
              RH Mean 7d: <strong class="mono">${fmt(m.rhMean7, 0)}%</strong><br/>
              ${buildRiverGaugeHtml(row.riverGauge)}
              ${buildGroundwaterGaugeHtml(row.gwGauge)}
              River Discharge (${escapeHtml(m.riverSource || "Modelled")}): <strong class="mono">${m.riverNow == null ? "-" : fmt(m.riverNow, 2)}${m.riverUnit ? " " + escapeHtml(String(m.riverUnit)) : ""}</strong>
            </div>
          </div>
        </div>

        <div class="grid2">
          <div class="miniCard">
            <div class="k">Component Scores (0 wet, 1 dry)</div>
            ${buildComponentScoresTableHtml_(row)}
          </div>

          <div class="miniCard">
            <div class="k">Soil Moisture Layers</div>
            <div class="s">
              ${row.index.soilDetails.map(d => {
                const cur = d.current == null ? "-" : fmt(d.current, 3);
                const dry = d.dryness == null ? "-" : fmt(d.dryness, 2);
                return `<div style="display:flex; justify-content:space-between; gap:10px;">
                  <span>${escapeHtml(d.label)}</span>
                  <span class="mono">${cur} <span style="opacity:0.75;">dry ${dry}</span></span>
                </div>`;
              }).join("")}
            </div>
          </div>
        </div>

        <details class="miniCard" style="margin-top:10px;" id="idxMathWrap">
          <summary style="cursor:pointer; user-select:none;">
            <span class="k">Index Math Breakdown</span>
            <span class="tiny muted" style="margin-left:8px;">Raw values, mapping and weighted contribution</span>
          </summary>
          <div class="s" style="margin-top:10px;">
            ${buildIndexBreakdownHtml(row.index)}
          </div>
        </details>

        <div class="miniCard" style="margin-top:10px;" id="riverModelDischargeWrap">
          <div class="k">River Discharge (Modelled)</div>
          <div class="s" style="margin-top:6px;">
            ${buildRiverDischargeModelHtml(row)}
          </div>
        </div>

        ${(row.riverGauge && row.riverGauge.site) ? `
        <div class="miniCard" style="margin-top:10px;" id="riverNrcDischargeWrap">
          <div class="k">River Discharge (NRC)</div>
          <div class="s" style="margin-top:6px;" id="riverNrcDischargeBody">
            <div class="muted">Loading gauge discharge...</div>
          </div>
        </div>
        ` : ``}



        <div class="miniCard">
          

        ${(row.riverGauge && row.riverGauge.site) ? `
        <div class="miniCard" style="margin-top:10px;" id="riverHybridDischargeWrap">
          <div class="k">River Discharge (Hybrid)</div>
          <div class="s muted" style="margin-top:6px;">Uses NRC daily values where available and corrected modelled values elsewhere (scale derived from recent overlap).</div>
          <div class="s" style="margin-top:6px;" id="riverHybridDischargeBody">
            <div class="muted">Loading hybrid discharge...</div>
          </div>
        </div>
        ` : ``}
<div class="k">Climate Drivers and Plume Signal</div>
          <div class="s muted">Context layer only. This does not change the drought score.</div>

          <div class="trendLegend" style="margin:8px 0 2px 0;">
            <span class="tag" id="locEnsoTag"><span class="dot" style="background:var(--ok)"></span>ENSO: <span class="mono">Loading</span></span>
            <span class="tag" id="locSamTag"><span class="dot" style="background:var(--ok)"></span>SAM: <span class="mono">Loading</span></span>
            <span class="tag" id="locMjoTag"><span class="dot" style="background:var(--ok)"></span>MJO: <span class="mono">Loading</span></span>
            <span class="tag" id="locPlumeTag"><span class="dot" style="background:var(--ok)"></span>Plume: <span class="mono">${row.plumeNow ? fmt(row.plumeNow.score, 0) : "-"}</span> <span class="mono" style="opacity:0.75;">${row.plumeNow ? escapeHtml(row.plumeNow.label) : "-"}</span></span>
          </div>
          <div class="tiny muted" id="locDriversMeta">Best effort fetch of global indices</div>

          <div class="tiny muted" id="locPlumeReason" style="margin-top:8px;">${row.plumeNow ? escapeHtml(row.plumeNow.reason) : "-"}</div>
	          <div class="climateExplainGrid" id="locClimateExplainGrid">
	            <div class="explainItem"><div class="explainTitle">ENSO</div><div class="explainBody" id="locExplainEnso">-</div></div>
	            <div class="explainItem"><div class="explainTitle">SAM</div><div class="explainBody" id="locExplainSam">-</div></div>
	            <div class="explainItem"><div class="explainTitle">MJO</div><div class="explainBody" id="locExplainMjo">-</div></div>
	            <div class="explainItem"><div class="explainTitle">Tropical Plume Signal</div><div class="explainBody" id="locExplainPlume">${escapeHtml(buildPlumeExplainText(row.plumeNow))}</div></div>
	          </div>

        </div>

        <div class="miniCard">
          <div class="k">Recent Trend (Daily Rain Soil River Groundwater)</div>
          <div class="s muted">Daily rain (mm), daily average soil moisture (9-27 cm), modelled river discharge (Open-Meteo), NRC gauge discharge (where available), river history (nearest gauge), and groundwater level history (nearest bore) for the last 7 days</div>
          <div style="display:grid; grid-template-columns: 1fr; gap:10px; margin-top:8px;">
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">Daily Rain</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkRain"></canvas><div id="sparkRainTooltip" class="chartTooltip" style="display:none;"></div></div>
            </div>
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">Soil 9-27 cm (Daily Avg)</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkSoil"></canvas><div id="sparkSoilTooltip" class="chartTooltip" style="display:none;"></div></div>
            </div>
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">River (Nearest Gauge)</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkRiver"></canvas><div id="sparkRiverTooltip" class="chartTooltip" style="display:none;"></div></div>
              <div class="tiny muted" id="sparkRiverMeta" style="margin-top:4px;"></div>
            </div>

            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">River Discharge (Modelled)</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkFlowModel"></canvas><div id="sparkFlowModelTooltip" class="chartTooltip" style="display:none;"></div></div>
              <div class="tiny muted" id="sparkFlowModelMeta" style="margin-top:4px;"></div>
            </div>


            ${(row.riverGauge && row.riverGauge.site) ? `
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">River Discharge (NRC)</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkFlowNrc"></canvas><div id="sparkFlowNrcTooltip" class="chartTooltip" style="display:none;"></div></div>
              <div class="tiny muted" id="sparkFlowNrcMeta" style="margin-top:4px;"></div>
            </div>
            ` : ``}

            ${(row.riverGauge && row.riverGauge.site) ? `
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">River Discharge (Hybrid)
              </div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkFlowHybrid"></canvas><div id="sparkFlowHybridTooltip" class="chartTooltip" style="display:none;"></div></div>
              <div class="tiny muted" id="sparkFlowHybridMeta" style="margin-top:4px;"></div>
            </div>
            ` : ``}


            <div>
              <div class="muted" style="font-size:12px; margin-bottom:6px;">Groundwater (Nearest Bore)</div>
              <div class="trendWrap"><canvas class="spark recentCanvas" id="sparkGW"></canvas><div id="sparkGWTooltip" class="chartTooltip" style="display:none;"></div></div>
              <div class="tiny muted" id="sparkGWMeta" style="margin-top:4px;"></div>
            </div>
          </div>
        </div>


<div class="miniCard">
  <div class="k">Weather and Environment Trend</div>
  <div class="s muted">Location-specific daily or hourly values for a selected metric, using the currently loaded window.</div>

  <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; margin-top:10px;">
    <div>
      <div class="muted" style="font-size:12px; margin-bottom:4px;">Metric</div>
      <div class="field"><select id="locEnvMetric"></select></div>
    </div>

    <div>
      <div class="muted" style="font-size:12px; margin-bottom:4px;">Interval</div>
      <div class="field">
        <select id="locEnvStep" title="Chart interval for this location">
          <option value="day">Daily</option>
          <option value="hour">Hourly (where available)</option>
        </select>
      </div>
    </div>

    <div class="tiny muted" id="locEnvMeta" style="margin-left:auto;"></div>
  </div>

  <div class="trendWrap" style="margin-top:10px;">
    <canvas class="spark locEnvCanvas" id="locEnvChart"></canvas>
    <div id="locEnvTooltip" class="chartTooltip" style="display:none;"></div>
  </div>
</div>

        <div class="miniCard" id="locRiverAnalysisWrap">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div class="k">River Response Summary</div>
            <button class="btn" id="btnOpenRiverAnalysisFromLocation" title="Open district hydrology analysis for this river gauge">Open Analysis</button>
          </div>
          <div class="s muted">If this location has a nearby river gauge, estimate handling knee, rainfall-to-rise lag and recession half-life over the current window.</div>

          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; margin-top:10px;">
            <div>
              <div class="muted" style="font-size:12px; margin-bottom:4px;">Interval</div>
              <div class="field">
                <select id="locRiverAnalysisStep" title="Daily uses daily rainfall and daily stage where available. Hourly uses hourly stage and hourly rainfall where available.">
                  <option value="day">Daily</option>
                  <option value="hour" selected>Hourly (where available)</option>
                </select>
              </div>
            </div>
            <div class="tiny muted" id="locRiverAnalysisMeta" style="margin-left:auto;"></div>
          </div>

          <div class="grid2" id="locRiverAnalysisCards" style="margin-top:10px;"></div>
          <div class="trendWrap" style="margin-top:10px;">
            <canvas class="spark" id="locRiverAnalysisChart"></canvas>
            <div id="locRiverAnalysisTooltip" class="chartTooltip" style="display:none;"></div>
          </div>
        </div>

        <div class="miniCard">
          <div class="k">Interpretation Tips</div>
          <div class="s">
            This index is designed to be operational. If soil dryness is high and rain dryness is high, your drought risk is elevated even if humidity is moderate. If forecast rain is substantial, rain dryness will be lower and the index should ease. If you see a mismatch with local impacts, tune thresholds and weights in the droughtConfig block.
          </div>
        </div>
      `;

      setTimeout(() => {

  // Index Math Breakdown actions
  try{
    const btnCopyIdx = document.getElementById("btnCopyIndexBreakdown");
    if (btnCopyIdx){
      btnCopyIdx.addEventListener("click", async ()=>{
        const payload = row?.index?.breakdown ? JSON.stringify(row.index.breakdown, null, 2) : "";
        if (!payload){
          showToast("No breakdown available");
          return;
        }
        try{
          if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(payload);
            showToast("Index breakdown copied");
          }else{
            const ta = document.createElement("textarea");
            ta.value = payload;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            showToast("Index breakdown copied");
          }
        }catch(e){
          showToast("Copy failed");
        }
      });
    }

    const btnDlIdx = document.getElementById("btnDownloadIndexBreakdown");
    if (btnDlIdx){
      btnDlIdx.addEventListener("click", ()=>{
        if (!row?.index?.breakdown){
          showToast("No breakdown available");
          return;
        }
        const blob = new Blob([JSON.stringify(row.index.breakdown, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        const safeName = String(row?.loc?.name || "location").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "location";
        a.href = URL.createObjectURL(blob);
        a.download = `index_breakdown_${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); }, 250);
        showToast("Index breakdown downloaded");
      });
    }
  }catch(e){ console.warn("index breakdown wire", e); }


  ensureClimateDriversFetched();
  applyClimateDriversToUi();
  const asOf = getAsOfDate();
  const dates = row.dailySeries?.dates ?? [];
  const rainFull = row.dailySeries?.precip ?? [];
  const soilFull = row.dailySeries?.soil9_27_avg ?? [];

  const rain = sliceDailyToWindowSeries(dates, rainFull, asOf, 7);
  const soil = sliceDailyToWindowSeries(dates, soilFull, asOf, 7);

  setMiniTrendSeries(
    "sparkRain",
    "sparkRainTooltip",
    rain.dates,
    rain.values,
    { label: "Daily Rain", unit: "mm", valFmt: (v) => fmt(v, 1), yFmt: (v) => fmt(v, 1) }
  );

  setMiniTrendSeries(
    "sparkSoil",
    "sparkSoilTooltip",
    soil.dates,
    soil.values,
    { label: "Soil 9–27 cm (Daily Avg)", unit: "", valFmt: (v) => fmt(v, 3), yFmt: (v) => fmt(v, 2) }
  );

  const plume = row.plumeSeries || { dates: [], values: [] };
  setMiniTrendSeries(
    "sparkPlume",
    "sparkPlumeTooltip",
    plume.dates,
    plume.values,
    { label: "Tropical Plume Signal", unit: "", valFmt: (v) => fmt(v, 0), yFmt: (v) => fmt(v, 0) }
  );


  updateRiverSpark(row);
  updateModelledDischargeSpark(row);
  if (typeof updateNrcDischargeSpark === "function") { try{ updateNrcDischargeSpark(row); } catch(_e){} }
  if (typeof updateNrcDischargeCard === "function") { try{ updateNrcDischargeCard(row); } catch(_e){} }
  updateGroundwaterSpark(row);
  initLocationEnvTrendControls(row);
  try{ if (typeof refreshLocationRiverAnalysis === "function") refreshLocationRiverAnalysis(row); }catch(e){ console.warn("loc river analysis", e); }
}, 0);
}

    function computeDailySeries(wx){
      const daily = wx?.daily || {};
      const hourly = wx?.hourly || {};
      const out = { dates: [], precip: [], soil9_27_avg: [] };

      if (Array.isArray(daily.time) && Array.isArray(daily.precipitation_sum)){
        out.dates = daily.time.slice();
        out.precip = daily.precipitation_sum.slice();
      }

      if (Array.isArray(hourly.time) && Array.isArray(hourly.soil_moisture_9_27cm)){
        const byDay = new Map();
        for (let i=0;i<hourly.time.length;i++){
          const k = dayKeyFromIso(hourly.time[i]);
          const v = hourly.soil_moisture_9_27cm[i];
          if (v == null || isNaN(v)) continue;
          const cur = byDay.get(k) || { sum: 0, n: 0 };
          cur.sum += v;
          cur.n += 1;
          byDay.set(k, cur);
        }
        const dates = out.dates.length ? out.dates : Array.from(byDay.keys()).sort();
        out.soil9_27_avg = dates.map(d => {
          const s = byDay.get(d);
          return s && s.n ? (s.sum / s.n) : null;
        });
        if (!out.dates.length) out.dates = dates;
      }

      return out;
    }


/***********************
 * Recent Trend: Modelled Discharge Sparkline
 * Uses Open-Meteo Flood daily discharge series (already loaded in dataCache.floodList).
 ***********************/
function updateModelledDischargeSpark(row){
  const meta = document.getElementById("sparkFlowModelMeta");

  try{
    const id = row?.loc?.id;
    const idx = Array.isArray(locations) ? locations.findIndex(l => String(l.id) === String(id)) : -1;
    const flood = (idx >= 0 && dataCache?.floodList && Array.isArray(dataCache.floodList))
      ? dataCache.floodList[idx]
      : null;

    const asOf = (typeof getAsOfDate === "function") ? getAsOfDate() : new Date();

    if (!flood?.daily?.time || !flood?.daily?.river_discharge){
      if (meta) meta.textContent = "Open-Meteo Flood discharge series not available for this location/window";
      setMiniTrendSeries(
        "sparkFlowModel",
        "sparkFlowModelTooltip",
        [],
        [],
        { label: "River Discharge (Modelled)", unit: "m3/s", valFmt: (v) => fmt(v, 2), yFmt: (v) => fmt(v, 2) }
      );
      return;
    }

    const sliced = sliceDailyToWindowSeries(
      flood.daily.time,
      flood.daily.river_discharge,
      asOf,
      7
    );

    setMiniTrendSeries(
      "sparkFlowModel",
      "sparkFlowModelTooltip",
      sliced.dates,
      sliced.values,
      { label: "River Discharge (Modelled)", unit: "m3/s", valFmt: (v) => fmt(v, 2), yFmt: (v) => fmt(v, 2) }
    );

    if (meta){
      const t = _floodPointInfoText_(row, flood);
      meta.textContent = t || "Open-Meteo Flood daily discharge";
    }
  } catch(e){
    if (meta) meta.textContent = "Modelled discharge spark failed";
    try{
      setMiniTrendSeries(
        "sparkFlowModel",
        "sparkFlowModelTooltip",
        [],
        [],
        { label: "River Discharge (Modelled)", unit: "m3/s", valFmt: (v) => fmt(v, 2), yFmt: (v) => fmt(v, 2) }
      );
    }catch(_e){}
  }
}



async function precomputeRiverHybridForIndexIfEnabled_(){
  try{
    if (!droughtConfig || !droughtConfig.useRiverHybridForIndex){
      try{ if (typeof dataCache !== "undefined" && dataCache){ dataCache.riverHybridForLoc = null; dataCache.riverHybridAsOfKey = null; } }catch(_e){}
      return { ok:true, enabled:false, computed:0 };
    }
    if (!Array.isArray(locations) || !locations.length) return { ok:false, reason:"No locations" };
    if (typeof dataCache === "undefined" || !dataCache) return { ok:false, reason:"No data cache" };

    // Avoid recomputing for the same Auckland day key.
    const asOfKey = (typeof _dayKeyAuckland_ === "function") ? _dayKeyAuckland_(_asOfSafe_()) : "";
    if (asOfKey && dataCache.riverHybridAsOfKey === asOfKey && Array.isArray(dataCache.riverHybridForLoc) && dataCache.riverHybridForLoc.length === locations.length){
      return { ok:true, enabled:true, computed:0, cached:true, asOfKey };
    }

    const out = new Array(locations.length).fill(null);
    const tasks = [];

    for (let i=0;i<locations.length;i++){
      const rg = dataCache.riverForLoc ? dataCache.riverForLoc[i] : null;
      if (!rg || !rg.site || !rg.site.siteName) continue;

      const row = {
        loc: locations[i],
        locId: locations[i]?.id || String(i),
        riverGauge: rg,
        flood: (dataCache.floodList ? dataCache.floodList[i] : null)
      };
      tasks.push({ i, row });
    }

    const limit = 4;
    let active = 0;
    let p = 0;
    let done = 0;

    await new Promise((resolve)=>{
      const pump = ()=>{
        while (active < limit && p < tasks.length){
          const t = tasks[p++];
          active++;
          Promise.resolve()
            .then(()=> _ensureNrcAndHybridDischarge_(t.row))
            .then((res)=>{ out[t.i] = res; })
            .catch((e)=>{ out[t.i] = { ok:false, reason: (e && e.message) ? e.message : "Failed" }; })
            .finally(()=>{
              active--;
              done++;
              try{
                const hint = $("tableHint");
                if (hint){
                  hint.textContent = `Computing hybrid river discharge for gauge locations: ${done}/${tasks.length}`;
                }
              }catch(_e){}
              if (done >= tasks.length && active === 0) resolve();
              else pump();
            });
        }
        if (tasks.length === 0) resolve();
      };
      pump();
    });

    try{ dataCache.riverHybridForLoc = out; dataCache.riverHybridAsOfKey = asOfKey || null; }catch(_e){}
    return { ok:true, enabled:true, computed: tasks.length, asOfKey: asOfKey || null };
  }catch(e){
    try{ if (typeof dataCache !== "undefined" && dataCache) dataCache.riverHybridForLoc = null; }catch(_e){}
    return { ok:false, reason: (e && e.message) ? e.message : "Failed" };
  }
}


/***********************
 * Recent Trend: River Discharge (NRC + Hybrid)
 ***********************/

var _NRC_HYBRID_DISCHARGE_CACHE_ = (typeof _NRC_HYBRID_DISCHARGE_CACHE_ !== "undefined") ? _NRC_HYBRID_DISCHARGE_CACHE_ : new Map();

function _asOfSafe_(){
  try{
    if (typeof getAsOfDate === "function"){
      const d = getAsOfDate();
      if (d instanceof Date && isFinite(d.getTime())) return d;
    }
  }catch(_e){}
  return new Date();
}

function _safeText_(s){
  try{ return escapeHtml(String(s)); }catch(_e){ return String(s); }
}

function _buildFlowCardHtml_(title, stats, unit){
  if (!stats || !stats.ok){
    return `<div class=\"muted\">${_safeText_(stats?.reason || "No data")}</div>`;
  }

  const lines = [];
  const u = unit || "m3/s";

  lines.push(`<div><strong class=\"mono\">${fmt(stats.now, 2)}</strong> <span class=\"tiny muted\">${u}</span> <span class=\"tiny muted\">(current)</span></div>`);
  lines.push(`<div class=\"tiny muted\">Baseline ${stats.baselineDays}d: min ${fmt(stats.min, 2)}  p10 ${fmt(stats.p10, 2)}  median ${fmt(stats.median, 2)}  p90 ${fmt(stats.p90, 2)}  max ${fmt(stats.max, 2)}  ${u}</div>`);

  if (stats.percentile != null){
    lines.push(`<div class=\"tiny muted\">Percentile: ${fmt(stats.percentile, 0)}%</div>`);
  }

  if (stats.pctOfMedian != null){
    lines.push(`<div class=\"tiny muted\">Percent Of Median: ${fmt(stats.pctOfMedian, 0)}%</div>`);
  }

  if (stats.delta != null){
    const pct = (stats.deltaPct != null) ? ` (${fmt(stats.deltaPct, 1)}%)` : ``;
    const sign = (stats.delta >= 0) ? "+" : "";
    lines.push(`<div class=\"tiny muted\">24h Change: ${sign}${fmt(stats.delta, 2)} ${u}${pct}</div>`);
  }

  if (stats.dryness01 != null){
    lines.push(`<div class=\"tiny muted\">Normalized Dryness: ${fmt(stats.dryness01, 2)} (${fmt(stats.dryness100, 0)}/100)</div>`);
  }

  return lines.join("\n");
}

async function _ensureNrcAndHybridDischarge_(row){
  const locId = row?.loc?.id || row?.locId || row?.id || "";
  const siteName = row?.riverGauge?.site?.siteName;
  const flowMeasName = row?.riverGauge?.site?.flowMeasName || "Flow";
  const flowUnitsRaw = row?.riverGauge?.site?.flowUnits || row?.riverGauge?.site?.units || "";
  const flowUnitsNorm = (typeof _normFlowUnits_ === "function") ? _normFlowUnits_(flowUnitsRaw) : (flowUnitsRaw || "");
  const nrcToM3 = (typeof _flowUnitToM3Factor_ === "function") ? _flowUnitToM3Factor_(flowUnitsNorm || flowUnitsRaw) : 1;
  const m3ToNative = (nrcToM3 && Math.abs(nrcToM3) > 1e-12) ? (1 / nrcToM3) : 1;
  if (!siteName) return { ok:false, reason:"No river gauge matched" };

  const asOf = _asOfSafe_();
  const asOfKey = _dayKeyAuckland_(asOf);
  const key = `${locId}|${siteName}|${flowMeasName}|${flowUnitsNorm || flowUnitsRaw || ""}|${asOfKey}`;

  const existing = _NRC_HYBRID_DISCHARGE_CACHE_.get(key);
  if (existing){
    if (existing.promise) return await existing.promise;
    return existing;
  }

  const promise = (async () => {
    if (typeof ensureHilltopRangeCachedSeries_ !== "function" && typeof fetchHilltopRangeChunked_ !== "function"){
      return { ok:false, reason:"Hilltop fetch function not available" };
    }

    const from = new Date(asOf.getTime() - 35 * 86400000);
    let series = null;
    try{
      if (typeof ensureHilltopRangeCachedSeries_ === "function"){
        series = await ensureHilltopRangeCachedSeries_(siteName, flowMeasName, from, asOf);
      } else {
        series = await fetchHilltopRangeChunked_(siteName, flowMeasName, from, asOf);
      }
    } catch (e){
      series = { times: [], values: [] };
    }
    const nrcDaily = _toDailyMeanFromHilltop_(series); // native units (as provided by NRC/Hilltop)
    const nrcDailyM3 = {
      dates: Array.isArray(nrcDaily?.dates) ? nrcDaily.dates.slice() : [],
      values: Array.isArray(nrcDaily?.values) ? nrcDaily.values.map(v => {
        const n = Number(v);
        return _finite_(n) ? (n * nrcToM3) : null;
      }) : []
    };
    const nrcStats = _computeDischargeStatsFromDaily_(nrcDaily.dates, nrcDaily.values, asOf, 30); // native
    const nrcStatsM3 = _computeDischargeStatsFromDaily_(nrcDailyM3.dates, nrcDailyM3.values, asOf, 30); // m3/s

    const modelFlood = _getFloodForRow_(row);
    const modelDaily = (modelFlood?.daily?.time && modelFlood?.daily?.river_discharge) ? {
      dates: modelFlood.daily.time,
      values: modelFlood.daily.river_discharge
    } : null;

    let hybridDaily = null;
    let hybridStats = null;
    let scale = null;
    let corr = null;
    let pairs = 0;
    let quality = "Unknown";

    if (modelDaily?.dates && modelDaily?.values){
      const modelMap = new Map();
      for (let i=0;i<modelDaily.dates.length;i++){
        const d = modelDaily.dates[i];
        const v = Number(modelDaily.values[i]);
        if (_finite_(v)) modelMap.set(d, v);
      }
      const nrcMap = new Map(); // m3/s
      for (let i=0;i<nrcDailyM3.dates.length;i++){
        const d = nrcDailyM3.dates[i];
        const v = Number(nrcDailyM3.values[i]);
        if (_finite_(v)) nrcMap.set(d, v);
      }

      const xs = [];
      const ys = [];
      for (const [d, xv] of modelMap.entries()){
        const yv = nrcMap.get(d);
        if (!_finite_(xv) || !_finite_(yv)) continue;
        xs.push(xv);
        ys.push(yv);
      }

      pairs = xs.length;
      const medX = _medianSorted_(_sortedFinite_(xs));
      const medY = _medianSorted_(_sortedFinite_(ys));

      if (_finite_(medX) && Math.abs(medX) > 1e-9 && _finite_(medY)){
        scale = clamp(medY / medX, 0.0001, 200);
      } else {
        scale = 1;
      }

      corr = _pearsonCorr_(xs, ys);
      if (pairs < 10) quality = "Weak";
      else if (corr != null && corr < 0.6) quality = "Weak";
      else quality = "Ok";

      const hDates = [];
      const hValues = [];
      for (let i=0;i<modelDaily.dates.length;i++){
        const d = modelDaily.dates[i];
        const mv = Number(modelDaily.values[i]);
        if (!_finite_(mv)) continue;
        const nvM3 = nrcMap.get(d);
        const hvM3 = _finite_(nvM3) ? Number(nvM3) : (mv * scale);
        if (!_finite_(hvM3)) continue;
        const hvNative = hvM3 * m3ToNative;
        if (!_finite_(hvNative)) continue;
        hDates.push(d);
        hValues.push(hvNative);
      }

      hybridDaily = { dates: hDates, values: hValues }; // native
      const hybridDailyM3 = { dates: hDates.slice(), values: hDates.map((_, i) => {
        const v = Number(hValues[i]);
        return _finite_(v) ? (v * nrcToM3) : null;
      }) };
      hybridStats = _computeDischargeStatsFromDaily_(hDates, hValues, asOf, 30); // native
      const hybridStatsM3 = _computeDischargeStatsFromDaily_(hybridDailyM3.dates, hybridDailyM3.values, asOf, 30); // m3/s
    }

    // If modelled flood series is unavailable but NRC is available,
    // still provide a useful "Hybrid" series (NRC-only) rather than "not available".
    if (!hybridDaily && nrcDaily && Array.isArray(nrcDaily.dates) && Array.isArray(nrcDaily.values) && nrcDaily.dates.length){
      hybridDaily = { dates: nrcDaily.dates.slice(), values: nrcDaily.values.slice() }; // native
      hybridStats = _computeDischargeStatsFromDaily_(hybridDaily.dates, hybridDaily.values, asOf, 30); // native
      // m3/s equivalents (useful for debugging and downstream use)
      const hybridDailyM3 = { dates: nrcDailyM3.dates.slice(), values: nrcDailyM3.values.slice() };
      const hybridStatsM3 = _computeDischargeStatsFromDaily_(hybridDailyM3.dates, hybridDailyM3.values, asOf, 30);
      scale = 1;
      corr = null;
      pairs = 0;
      quality = "NRC only";
    }

    return {
      ok:true,
      asOfKey,
      siteName,
      flowMeasName,
      flowUnitsRaw,
      flowUnitsNorm,
      nrcToM3,
      nrcDaily,
      nrcDailyM3,
      nrcStats,
      nrcStatsM3,
      hybridDaily,
      hybridStats,
      scale,
      corr,
      pairs,
      quality
    };
  })();

  _NRC_HYBRID_DISCHARGE_CACHE_.set(key, { promise });
  try{
    const resolved = await promise;
    _NRC_HYBRID_DISCHARGE_CACHE_.set(key, resolved);
    return resolved;
  } catch (e){
    const fail = { ok:false, reason: (e && e.message) ? e.message : "Failed" };
    _NRC_HYBRID_DISCHARGE_CACHE_.set(key, fail);
    return fail;
  }
}

async function updateNrcDischargeSpark(row){
  const meta = document.getElementById("sparkFlowNrcMeta");
  const hasCanvas = !!document.getElementById("sparkFlowNrc");
  if (!hasCanvas && !meta) return;

  try{
    if (!(row?.riverGauge && row.riverGauge.site)){
      if (meta) meta.textContent = "No river gauge matched";
      try{ setMiniTrendSeries("sparkFlowNrc","sparkFlowNrcTooltip",[],[],{ label:"River Discharge (NRC)", unit:"m3/s", valFmt:(v)=>fmt(v,2), yFmt:(v)=>fmt(v,2) }); }catch(_e){}
      try{ setMiniTrendSeries("sparkFlowHybrid","sparkFlowHybridTooltip",[],[],{ label:"River Discharge (Hybrid)", unit:"m3/s", valFmt:(v)=>fmt(v,2), yFmt:(v)=>fmt(v,2) }); }catch(_e){}
      const metaH = document.getElementById("sparkFlowHybridMeta");
      if (metaH) metaH.textContent = "Hybrid needs a matched river gauge";
      return;
    }

    const res = await _ensureNrcAndHybridDischarge_(row);
    if (!res || !res.ok){
      if (meta) meta.textContent = _safeText_(res?.reason || "NRC discharge unavailable");
      const metaH = document.getElementById("sparkFlowHybridMeta");
      if (metaH) metaH.textContent = "Hybrid unavailable";
      return;
    }

    const asOf = _asOfSafe_();

    const sNrc = sliceDailyToWindowSeries(res.nrcDaily.dates, res.nrcDaily.values, asOf, 7);
    setMiniTrendSeries(
      "sparkFlowNrc",
      "sparkFlowNrcTooltip",
      sNrc.dates,
      sNrc.values,
      { label: "River Discharge (NRC)", unit: (res.flowUnitsNorm || res.flowUnitsRaw || "m3/s"), valFmt: (v) => fmt(v, 2), yFmt: (v) => fmt(v, 2) }
    );
    if (meta){
      const t = row?.riverGauge?.site?.title || row?.riverGauge?.site?.siteName || res.siteName || "NRC gauge";
      meta.textContent = `NRC gauge flow: ${t}`;
    }

    const metaH = document.getElementById("sparkFlowHybridMeta");
    if (res.hybridDaily?.dates && res.hybridDaily?.values){
      const sH = sliceDailyToWindowSeries(res.hybridDaily.dates, res.hybridDaily.values, asOf, 7);
      setMiniTrendSeries(
        "sparkFlowHybrid",
        "sparkFlowHybridTooltip",
        sH.dates,
        sH.values,
        { label: "River Discharge (Hybrid)", unit: (res.flowUnitsNorm || res.flowUnitsRaw || "m3/s"), valFmt: (v) => fmt(v, 2), yFmt: (v) => fmt(v, 2) }
      );
      if (metaH){
        if (res.quality === "NRC only"){
          metaH.textContent = "Hybrid: NRC only (no modelled flood series)";
        } else {
          metaH.textContent = `Hybrid: NRC actual where available, modelled scaled x${fmt(res.scale || 1, 2)} (${res.quality})`;
        }
      }
    } else {
      try{ setMiniTrendSeries("sparkFlowHybrid","sparkFlowHybridTooltip",[],[],{ label:"River Discharge (Hybrid)", unit:"m3/s", valFmt:(v)=>fmt(v,2), yFmt:(v)=>fmt(v,2) }); }catch(_e){}
      if (metaH) metaH.textContent = "Hybrid not available";
    }
  } catch (e){
    if (meta) meta.textContent = "NRC discharge spark failed";
  }
}


function _nrcGaugeHeaderHtml_(row){
  try{
    const rg = row?.riverGauge;
    const s = rg?.site;
    if (!s) return "";
    const title = s.title || s.siteName || "River gauge";
    const dist = (rg && Number.isFinite(rg.distanceKm)) ? ` (${fmt(rg.distanceKm, 1)} km)` : "";
    const meas = s.flowMeasName || s.levelMeasName || "Flow";
    return `<div class="tiny muted" style="margin-bottom:6px;">Gauge: <span class="mono">${escapeHtml(title)}</span>${escapeHtml(dist)}<br/>Measurement: <span class="mono">${escapeHtml(meas)}</span></div>`;
  }catch(_e){
    return "";
  }
}


async function updateNrcDischargeCard(row){
  const body = document.getElementById("riverNrcDischargeBody");
  const bodyH = document.getElementById("riverHybridDischargeBody");
  if (!body && !bodyH) return;

  if (!(row?.riverGauge && row.riverGauge.site)){
    if (body) body.innerHTML = `<div class=\"muted\">No river gauge matched for this location</div>`;
    if (bodyH) bodyH.innerHTML = `<div class=\"muted\">Hybrid needs a matched river gauge</div>`;
    return;
  }

  try{
    if (body) body.innerHTML = `<div class=\"muted\">Loading gauge discharge...</div>`;
    if (bodyH) bodyH.innerHTML = `<div class=\"muted\">Loading hybrid discharge...</div>`;

    const res = await _ensureNrcAndHybridDischarge_(row);
    if (!res || !res.ok){
      if (body) body.innerHTML = _nrcGaugeHeaderHtml_(row) + `<div class=\"muted\">${_safeText_(res?.reason || "NRC discharge unavailable")}</div>`;
      if (bodyH) bodyH.innerHTML = _nrcGaugeHeaderHtml_(row) + `<div class="muted">Hybrid unavailable</div>`;
      return;
    }

    if (body) body.innerHTML = _nrcGaugeHeaderHtml_(row) + _buildFlowCardHtml_("River Discharge (NRC)", res.nrcStats, (res.flowUnitsNorm || res.flowUnitsRaw || "m3/s"));

    if (bodyH){
      if (!res.hybridStats || !res.hybridStats.ok){
        bodyH.innerHTML = _nrcGaugeHeaderHtml_(row) + `<div class=\"muted\">Hybrid not available for this location window</div>`;
      } else {
        const corrTxt = (res.corr == null) ? "-" : fmt(res.corr, 2);
        const head = `
          <div class=\"tiny muted\">Correction: NRC actual where available. Otherwise modelled discharge (unit-normalised) scaled by x${fmt(res.scale || 1, 2)} using ${res.pairs} overlapping days (corr ${corrTxt}, ${res.quality}).</div>
        `;
        bodyH.innerHTML = _nrcGaugeHeaderHtml_(row) + head + _buildFlowCardHtml_("River Discharge (Hybrid)", res.hybridStats, (res.flowUnitsNorm || res.flowUnitsRaw || "m3/s"));
      }
    }
  } catch (e){
    if (body) body.innerHTML = `<div class=\"muted\">NRC discharge failed</div>`;
    if (bodyH) bodyH.innerHTML = `<div class=\"muted\">Hybrid discharge failed</div>`;
  }
}
