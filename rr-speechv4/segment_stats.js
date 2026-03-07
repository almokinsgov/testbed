// Segment stats bucket storage and segment-stats UI extracted from index.html.

  function segStatsIsQuotaError(e){
    try{
      const name = String(e && e.name ? e.name : '');
      const msg = String(e && e.message ? e.message : '');
      // QuotaExceededError is common, but browsers vary.
      return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(name) || /quota/i.test(msg) || e === 22 || e === 1014;
    }catch(_){
      return false;
    }
  }

  function segStatsStorageSet(key, value){
    // Throws on quota so caller can archive and retry.
    localStorage.setItem(key, value);
    return true;
  }

  function segStatsBucketKey(id){
    return STORAGE_KEYS.segmentStatsBucketPrefix + String(id);
  }

  function segStatsLoadIndex(){
    const raw = loadFromStorage(STORAGE_KEYS.segmentStatsBuckets);
    if(!raw){
      return { version: 1, maxWordsPerBucket: 10000, bucketOrder: [], activeBucketId: '', overallSelectedBucketIds: [] };
    }
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !parsed.value) return { version: 1, maxWordsPerBucket: 10000, bucketOrder: [], activeBucketId: '', overallSelectedBucketIds: [] };
    const v = parsed.value;

    const bucketOrder = Array.isArray(v.bucketOrder) ? v.bucketOrder.map(x => String(x)) : [];
    const activeBucketId = String(v.activeBucketId || '');

    // If overallSelectedBucketIds is missing, default to all buckets. If present (even empty), respect it.
    let overallSelectedBucketIds;
    if(Object.prototype.hasOwnProperty.call(v, 'overallSelectedBucketIds')){
      overallSelectedBucketIds = Array.isArray(v.overallSelectedBucketIds) ? v.overallSelectedBucketIds.map(x => String(x)) : [];
      overallSelectedBucketIds = overallSelectedBucketIds.filter(id => bucketOrder.includes(id));
    } else {
      overallSelectedBucketIds = bucketOrder.slice();
    }

    return {
      version: 1,
      maxWordsPerBucket: (v.maxWordsPerBucket != null ? v.maxWordsPerBucket : 10000),
      bucketOrder,
      activeBucketId,
      overallSelectedBucketIds
    };
  }

  function segStatsSaveIndex(idx){
    return saveToStorage(STORAGE_KEYS.segmentStatsBuckets, JSON.stringify(idx || {}, null, 2));
  }

  function segStatsLoadBucket(id){
    const raw = loadFromStorage(segStatsBucketKey(id));
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !parsed.value) return null;
    return parsed.value;
  }

  function segStatsSaveBucket(bucket){
    // Keep pretty printing off for size.
    const key = segStatsBucketKey(bucket.id);
    segStatsStorageSet(key, JSON.stringify(bucket));
    return true;
  }

  function segStatsMakeBucket(){
    const id = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
    const stamp = new Date().toISOString().replace('T',' ').slice(0,16);
    return {
      version: 1,
      id,
      name: 'Bucket ' + stamp,
      createdAtIso: new Date().toISOString(),
      totalWords: 0,
      totalIncludedWords: 0,
      segmentsTotal: 0,
      dict: [],
      aggEnc: '',
      entries: []
    };
  }

  function segStatsEnsureActiveBucket(){
    const idx = segStatsLoadIndex();
    if(idx.bucketOrder.length && idx.activeBucketId){
      const b = segStatsLoadBucket(idx.activeBucketId);
      if(b) return { idx, bucket: b };
    }

    // Create first bucket
    const b = segStatsMakeBucket();
    idx.bucketOrder = [b.id];
    idx.activeBucketId = b.id;
    idx.overallSelectedBucketIds = [b.id];
    segStatsSaveIndex(idx);
    try{ segStatsSaveBucket(b); }catch(_){}
    return { idx, bucket: b };
  }

  function segStatsSetActiveBucketId(id){
    const idx = segStatsLoadIndex();
    const found = idx.bucketOrder.includes(id);
    if(!found) return false;
    idx.activeBucketId = id;
    segStatsSaveIndex(idx);
    return true;
  }

  function segStatsEncodePairsFromCounts(countsObj, dict, dictMap){
    const pairs = [];
    for(const seg of Object.keys(countsObj || {})){
      const c = countsObj[seg] || 0;
      if(!c) continue;
      let sid;
      if(dictMap.has(seg)){
        sid = dictMap.get(seg);
      } else {
        sid = dict.length;
        dict.push(seg);
        dictMap.set(seg, sid);
      }
      pairs.push([sid, c]);
    }
    pairs.sort((a,b)=>a[0]-b[0]);
    // Compact encoding: "id,count;id,count;"
    return pairs.map(p => String(p[0]) + ',' + String(p[1])).join(';') + (pairs.length ? ';' : '');
  }

  function segStatsDecodeEncToMap(enc){
    const out = {};
    const s = String(enc || '');
    if(!s) return out;
    const parts = s.split(';');
    for(const part of parts){
      if(!part) continue;
      const xy = part.split(',');
      if(xy.length < 2) continue;
      const id = parseInt(xy[0], 10);
      const c = parseInt(xy[1], 10);
      if(!Number.isFinite(id) || !Number.isFinite(c)) continue;
      out[id] = (out[id] || 0) + c;
    }
    return out;
  }

  function segStatsMapToEnc(map){
    const pairs = Object.entries(map || {}).map(([k,v])=>[parseInt(k,10), v]).filter(x=>Number.isFinite(x[0]) && x[1]);
    pairs.sort((a,b)=>a[0]-b[0]);
    return pairs.map(p => String(p[0]) + ',' + String(p[1])).join(';') + (pairs.length ? ';' : '');
  }

  function segStatsGetBucketDictMap(bucket){
    const map = new Map();
    const dict = Array.isArray(bucket.dict) ? bucket.dict : [];
    for(let i=0;i<dict.length;i++){
      map.set(dict[i], i);
    }
    return map;
  }

  function segStatsMakeEntryId(){
    return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
  }

  function segStatsExportBucket(bucket, filename){
    const payload = {
      exportType: 'reorite_segment_stats_bucket',
      exportVersion: 1,
      exportedAtIso: new Date().toISOString(),
      bucket
    };
    const name = filename || ('segment_stats_bucket_' + bucket.id + '.json');
    downloadText(name, JSON.stringify(payload, null, 2), 'application/json');
  }

  function segStatsDeleteBucket(id){
    try{ localStorage.removeItem(segStatsBucketKey(id)); }catch(_){}
    const idx = segStatsLoadIndex();
    idx.bucketOrder = idx.bucketOrder.filter(x => x !== id);

    if(Array.isArray(idx.overallSelectedBucketIds)){
      idx.overallSelectedBucketIds = idx.overallSelectedBucketIds.filter(x => x !== id);
    } else {
      idx.overallSelectedBucketIds = [];
    }

    if(idx.activeBucketId === id){
      idx.activeBucketId = idx.bucketOrder.length ? idx.bucketOrder[idx.bucketOrder.length-1] : '';
    }

    segStatsSaveIndex(idx);
    return true;
  }

  function segStatsArchiveOldestBuckets(count){
    const idx = segStatsLoadIndex();
    const n = Math.max(1, parseInt(count || '1', 10) || 1);
    let archived = 0;
    for(let i=0;i<n;i++){
      if(idx.bucketOrder.length <= 1) break; // keep at least 1 bucket
      const oldestId = idx.bucketOrder[0];
      const b = segStatsLoadBucket(oldestId);
      if(b){
        const dt = b.createdAtIso ? new Date(b.createdAtIso) : new Date();
        const stamp = dt.toISOString().slice(0,10);
        segStatsExportBucket(b, 'segment_stats_bucket_' + stamp + '_' + oldestId + '.json');
      }
      segStatsDeleteBucket(oldestId);
      archived += 1;
    }
    return archived;
  }

  function segStatsTrySaveWithAutoArchive(saveFn, maxArchives){
    try{
      saveFn();
      return { ok:true, archived:0 };
    }catch(e){
      if(!segStatsIsQuotaError(e)) return { ok:false, error:e, archived:0 };
      const maxA = Math.max(0, parseInt(maxArchives || '3', 10) || 3);
      let archived = 0;
      for(let i=0;i<maxA;i++){
        const idx = segStatsLoadIndex();
        if(idx.bucketOrder.length <= 1) break;
        // Archive oldest bucket
        const oldestId = idx.bucketOrder[0];
        const b = segStatsLoadBucket(oldestId);
        if(b){
          const dt = b.createdAtIso ? new Date(b.createdAtIso) : new Date();
          const stamp = dt.toISOString().slice(0,10);
          segStatsExportBucket(b, 'segment_stats_bucket_' + stamp + '_' + oldestId + '.json');
        }
        segStatsDeleteBucket(oldestId);
        archived += 1;
        try{
          saveFn();
          return { ok:true, archived };
        }catch(e2){
          if(!segStatsIsQuotaError(e2)) return { ok:false, error:e2, archived };
        }
      }
      return { ok:false, error:e, archived };
    }
  }

  function segStatsEnsureRollover(includedWordsToAdd, maxWordsPerBucket){
    const idx = segStatsLoadIndex();
    const b = idx.activeBucketId ? segStatsLoadBucket(idx.activeBucketId) : null;
    if(!b){
      const init = segStatsEnsureActiveBucket();
      return init;
    }
    const limit = Math.max(1000, parseInt(maxWordsPerBucket || idx.maxWordsPerBucket || '10000', 10) || 10000);
    if((b.totalIncludedWords || 0) + includedWordsToAdd <= limit){
      return { idx, bucket: b };
    }
    // rollover
    const prevOrder = idx.bucketOrder.slice();
    const selAll = Array.isArray(idx.overallSelectedBucketIds)
      && idx.overallSelectedBucketIds.length === prevOrder.length
      && idx.overallSelectedBucketIds.every((x,i)=>x === prevOrder[i]);

    const nb = segStatsMakeBucket();
    const saveRes = segStatsTrySaveWithAutoArchive(()=>{
      segStatsSaveBucket(nb);
      idx.bucketOrder.push(nb.id);
      idx.activeBucketId = nb.id;

      if(!Array.isArray(idx.overallSelectedBucketIds)){
        idx.overallSelectedBucketIds = prevOrder.slice();
      }
      if(selAll){
        idx.overallSelectedBucketIds.push(nb.id);
      }

      idx.maxWordsPerBucket = limit;
      segStatsSaveIndex(idx);
    }, 3);

    if(!saveRes.ok){
      // fallback: keep existing bucket, caller will handle message
      return { idx, bucket: b, rolloverFailed: true, rolloverError: saveRes.error };
    }
    return { idx: segStatsLoadIndex(), bucket: nb, rolloverArchived: saveRes.archived };
  }

  function segStatsAddEntryFromAnalysis(rawText, inclusion, stats, opts){
    const options = opts || {};
    const storeText = !!options.storeText;

    const idx0 = segStatsLoadIndex();
    const maxWords = (options.maxWordsPerBucket != null ? options.maxWordsPerBucket : idx0.maxWordsPerBucket);
    const ensure = segStatsEnsureRollover(stats.includedWords || 0, maxWords);
    let idx = ensure.idx;
    let bucket = ensure.bucket;

    // Build dict map
    const dictMap = segStatsGetBucketDictMap(bucket);

    // Encode entry counts and update bucket dict if needed
    const countsEnc = segStatsEncodePairsFromCounts(stats.segmentCounts || {}, bucket.dict, dictMap);

    const entryId = segStatsMakeEntryId();
    const textTrim = String(rawText || '').trim();
    const preview = textTrim.replace(/\s+/g,' ').slice(0, 140);
    const entry = {
      id: entryId,
      ts: Date.now(),
      tsIso: new Date().toISOString(),
      mode: inclusion.mode,
      threshold: inclusion.threshold,
      totalWords: stats.totalWords,
      includeCount: stats.includedWords,
      uniqueWords: stats.uniqueWords,
      segmentsTotal: stats.segmentsTotal,
      uniqueSegments: stats.uniqueSegments,
      preview,
      textHash: simpleHash(textTrim),
      countsEnc
    };
    if(storeText) entry.text = rawText;

    // Update bucket totals and agg
    const aggMap = segStatsDecodeEncToMap(bucket.aggEnc || '');
    const entryPairs = segStatsDecodeEncToMap(countsEnc); // map id->count
    for(const k of Object.keys(entryPairs)){
      const c = entryPairs[k] || 0;
      if(!c) continue;
      aggMap[k] = (aggMap[k] || 0) + c;
    }
    bucket.aggEnc = segStatsMapToEnc(aggMap);

    bucket.totalWords = (bucket.totalWords || 0) + (stats.totalWords || 0);
    bucket.totalIncludedWords = (bucket.totalIncludedWords || 0) + (stats.includedWords || 0);
    bucket.segmentsTotal = (bucket.segmentsTotal || 0) + (stats.segmentsTotal || 0);

    bucket.entries = Array.isArray(bucket.entries) ? bucket.entries : [];
    // Deduplicate by hash + mode + threshold inside the active bucket
    const sig = String(entry.textHash || '') + '::' + String(entry.mode || '') + '::' + String(entry.threshold || '');
    bucket.entries = bucket.entries.filter(x => {
      const xsig = String(x && x.textHash ? x.textHash : '') + '::' + String(x && x.mode ? x.mode : '') + '::' + String(x && x.threshold != null ? x.threshold : '');
      return xsig !== sig;
    });

    bucket.entries.unshift(entry);

    // Save
    const saveRes = segStatsTrySaveWithAutoArchive(()=>{
      segStatsSaveBucket(bucket);
      idx = segStatsLoadIndex();
      if(idx.bucketOrder.length && !idx.bucketOrder.includes(bucket.id)){
        const prevOrder = idx.bucketOrder.slice();
        const selAll = Array.isArray(idx.overallSelectedBucketIds)
          && idx.overallSelectedBucketIds.length === prevOrder.length
          && idx.overallSelectedBucketIds.every((x,i)=>x === prevOrder[i]);

        idx.bucketOrder.push(bucket.id);
        if(selAll){
          idx.overallSelectedBucketIds = Array.isArray(idx.overallSelectedBucketIds) ? idx.overallSelectedBucketIds : prevOrder.slice();
          idx.overallSelectedBucketIds.push(bucket.id);
        }
      }
      idx.activeBucketId = bucket.id;
      idx.maxWordsPerBucket = Math.max(1000, parseInt(maxWords || '10000', 10) || 10000);
      segStatsSaveIndex(idx);
    }, options.maxAutoArchive || 3);

    if(!saveRes.ok){
      return { ok:false, error: saveRes.error, archived: saveRes.archived, bucketId: bucket.id, rolloverArchived: ensure.rolloverArchived || 0, rolloverFailed: ensure.rolloverFailed || false };
    }

    return { ok:true, archived: saveRes.archived, bucketId: bucket.id, rolloverArchived: ensure.rolloverArchived || 0 };
  }

  function segStatsRemoveEntry(bucketId, entryId){
    const b = segStatsLoadBucket(bucketId);
    if(!b) return false;

    const entries = Array.isArray(b.entries) ? b.entries : [];
    const idx = entries.findIndex(e => e && e.id === entryId);
    if(idx < 0) return false;

    const entry = entries[idx];
    const entryMap = segStatsDecodeEncToMap(entry.countsEnc || '');
    const aggMap = segStatsDecodeEncToMap(b.aggEnc || '');

    for(const k of Object.keys(entryMap)){
      const c = entryMap[k] || 0;
      if(!c) continue;
      aggMap[k] = (aggMap[k] || 0) - c;
      if(aggMap[k] <= 0) delete aggMap[k];
    }

    b.aggEnc = segStatsMapToEnc(aggMap);
    b.totalWords = Math.max(0, (b.totalWords || 0) - (entry.totalWords || 0));
    b.totalIncludedWords = Math.max(0, (b.totalIncludedWords || 0) - (entry.includeCount || 0));
    b.segmentsTotal = Math.max(0, (b.segmentsTotal || 0) - (entry.segmentsTotal || 0));

    entries.splice(idx, 1);
    b.entries = entries;

    const saveRes = segStatsTrySaveWithAutoArchive(()=>{ segStatsSaveBucket(b); }, 0);
    return saveRes.ok;
  }

  function segStatsLegacyExport(){
    const raw = loadFromStorage(STORAGE_KEYS.segmentStatsHistory);
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return null;
    return parsed.value;
  }

  function segStatsLegacyClear(){
    try{ localStorage.removeItem(STORAGE_KEYS.segmentStatsHistory); }catch(_){}
  }


function renderSegmentStatsHistory(){
    const root = document.getElementById('pageSegmentStatsHistory');
    root.innerHTML = '';

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['Segment Stats History']));
    card.appendChild(el('p', {}, ['Analyze a passage then log segment usage. History uses buckets and compact encoding to reduce storage size and avoid hangs. Export and archive older buckets to keep logging.']));

    const area = el('textarea', {spellcheck:'false', style:'min-height:140px;'});
    area.value = loadFromStorage('rr_segstats_text') || 'Haere mai ki te tepu, e hoa. Ko te reo Māori te taonga. This passage is mixed text for testing.';

    // Main controls
    const controls = el('div', {class:'row', style:'gap:10px; flex-wrap:wrap;'});
    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze And Log']);
    const runOnlyBtn = el('button', {class:'btn', type:'button'}, ['Analyze Only']);

    const modeLabel = el('span', {class:'tag'}, ['Mode']);
    const mode = el('select', {class:'input'});
    mode.appendChild(el('option', {value:'detect'}, ['Detect Text Block (recommended)']));
    mode.appendChild(el('option', {value:'maoriLetters'}, ['Maori Letterset Only']));
    mode.appendChild(el('option', {value:'all'}, ['All Words']));

    const thrLabel = el('span', {class:'tag'}, ['Threshold: 75%']);
    const thr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:'0.75', style:'width:220px;'});
    thr.addEventListener('input', ()=>{ thrLabel.textContent = 'Threshold: ' + Math.round(parseFloat(thr.value)*100) + '%'; });

    const minLenLabel = el('span', {class:'tag'}, ['Min Len']);
    const minLen = el('input', {type:'number', min:'1', max:'30', value:'2', class:'input', style:'width:70px;'});
    minLen.title = 'Minimum word length to include in segment stats.';

    const keepCaseLabel = el('label', {class:'checkbox'});
    const keepCase = el('input', {type:'checkbox'});
    keepCase.checked = false;
    keepCaseLabel.appendChild(keepCase);
    keepCaseLabel.appendChild(document.createTextNode('Keep Original Case'));

    const includeDuplicatesLabel = el('label', {class:'checkbox'});
    const includeDuplicates = el('input', {type:'checkbox'});
    includeDuplicates.checked = true;
    includeDuplicatesLabel.appendChild(includeDuplicates);
    includeDuplicatesLabel.appendChild(document.createTextNode('Count Duplicates'));

    controls.appendChild(runBtn);
    controls.appendChild(runOnlyBtn);
    controls.appendChild(modeLabel);
    controls.appendChild(mode);
    controls.appendChild(thrLabel);
    controls.appendChild(thr);
    controls.appendChild(minLenLabel);
    controls.appendChild(minLen);
    controls.appendChild(includeDuplicatesLabel);
    controls.appendChild(includeDuplicates);
    controls.appendChild(keepCaseLabel);
    controls.appendChild(keepCase);

    const summary = el('div', {class:'row', style:'margin-top:10px; gap:8px; flex-wrap:wrap;'});

    // Bucket controls
    const bucketCard = el('div', {class:'card', style:'margin-top:10px;'});
    bucketCard.appendChild(el('h3', {}, ['Bucket Storage']));
    bucketCard.appendChild(el('p', {class:'muted'}, ['Buckets roll over by included word count. If storage is full, export and archive older buckets then continue logging.']));

    const bcRow1 = el('div', {class:'row', style:'gap:10px; flex-wrap:wrap;'});
    const bucketLabel = el('span', {class:'tag'}, ['Active Bucket']);
    const bucketSelect = el('select', {class:'input'});
    bucketSelect.style.minWidth = '260px';

    const newBucketBtn = el('button', {class:'btn', type:'button'}, ['Start New Bucket Now']);
    const renameBucketBtn = el('button', {class:'btn', type:'button'}, ['Rename Bucket']);
    const deleteBucketBtn = el('button', {class:'btn bad', type:'button'}, ['Delete Bucket']);

    const maxWordsLabel = el('span', {class:'tag'}, ['Max Words Per Bucket']);
    const maxWords = el('input', {type:'number', min:'1000', max:'200000', value:'10000', class:'input', style:'width:110px;'});
    maxWords.title = 'Bucket rolls over when total included words would exceed this number.';

    const storeTextLabel = el('label', {class:'checkbox'});
    const storeText = el('input', {type:'checkbox'});
    storeText.checked = false;
    storeTextLabel.appendChild(storeText);
    storeTextLabel.appendChild(document.createTextNode('Store Full Text In History (more storage)'));

    const autoArchiveLabel = el('label', {class:'checkbox'});
    const autoArchive = el('input', {type:'checkbox'});
    autoArchive.checked = true;
    autoArchiveLabel.appendChild(autoArchive);
    autoArchiveLabel.appendChild(document.createTextNode('Auto Archive Oldest Buckets On Quota'));

    const maxAutoLabel = el('span', {class:'tag'}, ['Max Auto Archive']);
    const maxAuto = el('input', {type:'number', min:'0', max:'25', value:'3', class:'input', style:'width:70px;'});
    maxAuto.title = 'How many oldest buckets to archive automatically when quota is reached during logging.';

    bcRow1.appendChild(bucketLabel);
    bcRow1.appendChild(bucketSelect);
    bcRow1.appendChild(newBucketBtn);
    bcRow1.appendChild(renameBucketBtn);
    bcRow1.appendChild(deleteBucketBtn);
    bcRow1.appendChild(maxWordsLabel);
    bcRow1.appendChild(maxWords);
    bcRow1.appendChild(storeTextLabel);
    bcRow1.appendChild(autoArchiveLabel);
    bcRow1.appendChild(maxAutoLabel);
    bcRow1.appendChild(maxAuto);

    const bcRow2 = el('div', {class:'row', style:'gap:10px; flex-wrap:wrap; margin-top:8px;'});
    const exportActiveBtn = el('button', {class:'btn', type:'button'}, ['Export Active Bucket']);
    const exportAllBtn = el('button', {class:'btn', type:'button'}, ['Export All Buckets']);
    const importBtn = el('button', {class:'btn', type:'button'}, ['Import Bucket Or Bundle']);
    const importFile = el('input', {type:'file', accept:'application/json', class:'hidden'});

    const archiveOldestBtn = el('button', {class:'btn', type:'button'}, ['Archive Oldest Bucket']);
    const clearAllBtn = el('button', {class:'btn danger', type:'button'}, ['Clear All Buckets']);
    const legacyBtn = el('button', {class:'btn', type:'button'}, ['Import Legacy v23 History (minified)']);

    bcRow2.appendChild(exportActiveBtn);
    bcRow2.appendChild(exportAllBtn);
    bcRow2.appendChild(importBtn);
    bcRow2.appendChild(importFile);
    bcRow2.appendChild(archiveOldestBtn);
    bcRow2.appendChild(clearAllBtn);
    bcRow2.appendChild(legacyBtn);

    const bucketInfo = el('div', {class:'row', style:'gap:8px; flex-wrap:wrap; margin-top:8px;'});
    bucketCard.appendChild(bcRow1);
    bucketCard.appendChild(bcRow2);
    bucketCard.appendChild(bucketInfo);

    // Preview and details cards
    const passCard = el('div', {class:'card', style:'padding:10px; margin-top:10px;'});
    passCard.appendChild(el('h3', {}, ['Passage Preview']));
    passCard.appendChild(el('p', {class:'muted'}, ['Click a word to see its segmentation. Included words are outlined.']));
    const hl = el('div', {class:'hlText'});
    passCard.appendChild(hl);

    const wordCard = el('div', {class:'card', style:'padding:10px; margin-top:10px;'});
    wordCard.appendChild(el('h3', {}, ['Word Details']));
    const wordBody = el('div');
    wordCard.appendChild(wordBody);

    const blockCard = el('div', {class:'card', style:'margin-top:10px;'});
    blockCard.appendChild(el('h3', {}, ['Current Block Segment Stats']));
    const blockSearch = el('input', {type:'search', placeholder:'Search segment...', class:'input'});
    blockSearch.style.maxWidth = '260px';
    const blockControls = el('div', {class:'row'});
    blockControls.appendChild(blockSearch);
    const blockTags = el('div', {class:'row', style:'gap:8px; margin-top:8px; flex-wrap:wrap;'});
    blockCard.appendChild(blockControls);
    blockCard.appendChild(blockTags);

    const blockTwo = el('div', {class:'twoCol', style:'margin-top:10px;'});
    const blockListCard = el('div', {class:'card', style:'padding:10px;'});
    blockListCard.appendChild(el('h4', {}, ['Segments']));
    const blockList = el('div');
    blockListCard.appendChild(blockList);

    const blockDetailCard = el('div', {class:'card', style:'padding:10px;'});
    blockDetailCard.appendChild(el('h4', {}, ['Segment Details']));
    const blockDetail = el('div');
    blockDetailCard.appendChild(blockDetail);

    blockTwo.appendChild(blockListCard);
    blockTwo.appendChild(blockDetailCard);
    blockCard.appendChild(blockTwo);

    // Overall card
    const overallCard = el('div', {class:'card', style:'margin-top:10px;'});
    overallCard.appendChild(el('h3', {}, ['Overall Segment Stats']));
    overallCard.appendChild(el('p', {class:'muted'}, ['Aggregated from bucket history. Click a segment to see the blocks that used it.']));

    const overallControls = el('div', {class:'row', style:'gap:10px; flex-wrap:wrap;'});
    const overallScopeLabel = el('span', {class:'tag'}, ['Scope']);
    const overallScope = el('select', {class:'input'});
    overallScope.appendChild(el('option', {value:'all'}, ['All Buckets']));
    overallScope.appendChild(el('option', {value:'active'}, ['Active Bucket Only']));
    overallScope.appendChild(el('option', {value:'selected'}, ['Selected Buckets']));
    const overallSearch = el('input', {type:'search', placeholder:'Search segment...', class:'input'});
    overallSearch.style.maxWidth = '260px';
    const dlJson = el('button', {class:'btn', type:'button'}, ['Download Overall JSON']);
    const dlCsv = el('button', {class:'btn', type:'button'}, ['Download Overall CSV']);

    overallControls.appendChild(overallScopeLabel);
    overallControls.appendChild(overallScope);
    overallControls.appendChild(overallSearch);
    overallControls.appendChild(dlJson);
    overallControls.appendChild(dlCsv);

    const overallTags = el('div', {class:'row', style:'gap:8px; margin-top:8px; flex-wrap:wrap;'});
    overallCard.appendChild(overallControls);
    overallCard.appendChild(overallTags);

    // Overall bucket selection (only used when scope = Selected Buckets)
    const overallBucketPickCard = el('div', {class:'card', style:'padding:10px; margin-top:8px; display:none;'});
    overallBucketPickCard.appendChild(el('h4', {}, ['Bucket Selection']));
    overallBucketPickCard.appendChild(el('p', {class:'muted'}, ['Choose which buckets contribute to Overall Segment Stats when scope is set to Selected Buckets.']));

    const pickRow = el('div', {class:'row', style:'gap:8px; flex-wrap:wrap;'});
    const pickAllBtn = el('button', {class:'btn', type:'button'}, ['Select All']);
    const pickNoneBtn = el('button', {class:'btn', type:'button'}, ['Select None']);
    const pickActiveBtn = el('button', {class:'btn', type:'button'}, ['Select Active Only']);
    const pickInfo = el('span', {class:'tag'}, ['Selected: 0']);
    pickRow.appendChild(pickAllBtn);
    pickRow.appendChild(pickNoneBtn);
    pickRow.appendChild(pickActiveBtn);
    pickRow.appendChild(pickInfo);

    const pickList = el('div', {style:'max-height:220px; overflow:auto; border:1px solid var(--border); border-radius:12px; padding:8px; background:var(--panel2);'});
    overallBucketPickCard.appendChild(pickRow);
    overallBucketPickCard.appendChild(pickList);
    overallCard.appendChild(overallBucketPickCard);

    const overallTwo = el('div', {class:'twoCol', style:'margin-top:10px;'});
    const overallListCard = el('div', {class:'card', style:'padding:10px;'});
    overallListCard.appendChild(el('h4', {}, ['Segments']));
    const overallList = el('div');
    overallListCard.appendChild(overallList);

    const overallDetailCard = el('div', {class:'card', style:'padding:10px;'});
    overallDetailCard.appendChild(el('h4', {}, ['Segment Details']));
    const overallDetail = el('div');
    overallDetailCard.appendChild(overallDetail);

    overallTwo.appendChild(overallListCard);
    overallTwo.appendChild(overallDetailCard);
    overallCard.appendChild(overallTwo);

    // History card
    const historyCard = el('div', {class:'card', style:'margin-top:10px;'});
    historyCard.appendChild(el('h3', {}, ['History']));
    historyCard.appendChild(el('p', {class:'muted'}, ['Entries are stored in the active bucket. Removing an entry also updates overall stats.']));

    const hControls = el('div', {class:'row', style:'gap:10px; flex-wrap:wrap;'});
    const hSearch = el('input', {type:'search', placeholder:'Search preview...', class:'input'});
    hSearch.style.maxWidth = '260px';
    const hPageLabel = el('span', {class:'tag'}, ['Page Size']);
    const hPageSize = el('select', {class:'input'});
    for(const n of [25, 50, 100, 200]) hPageSize.appendChild(el('option', {value:String(n)}, [String(n)]));
    hPageSize.value = '50';
    const hPrev = el('button', {class:'btn', type:'button'}, ['Prev']);
    const hNext = el('button', {class:'btn', type:'button'}, ['Next']);
    const hPageInfo = el('span', {class:'tag'}, ['Page 1']);

    hControls.appendChild(hSearch);
    hControls.appendChild(hPageLabel);
    hControls.appendChild(hPageSize);
    hControls.appendChild(hPrev);
    hControls.appendChild(hNext);
    hControls.appendChild(hPageInfo);

    const hWrap = el('div');

    historyCard.appendChild(hControls);
    historyCard.appendChild(el('div', {class:'divider'}));
    historyCard.appendChild(hWrap);

    // Mount
    card.appendChild(area);
    card.appendChild(controls);
    card.appendChild(summary);
    root.appendChild(card);
    root.appendChild(bucketCard);

    const topTwo = el('div', {class:'twoCol', style:'margin-top:10px;'});
    topTwo.appendChild(passCard);
    topTwo.appendChild(wordCard);
    root.appendChild(topTwo);
    root.appendChild(blockCard);
    root.appendChild(overallCard);
    root.appendChild(historyCard);

    // State
    let lastAnalysis = null;
    let selectedBlockSeg = null;
    let selectedOverallSeg = null;
    let historyPage = 0;
    let bucketLabelMap = {};

    function normalizeKeyWord(w){
      if(keepCase.checked) return String(w || '').trim();
      return normalizeWord(w);
    }

    function buildWordInclusion(rawText){
      const m = mode.value;
      const thrVal = parseFloat(thr.value || '0.75');

      if(m === 'detect'){
        const res = computeDetectForStats(rawText, thrVal);
        return { mode:m, threshold:thrVal, parts: res.parts || [], scored: res.scored || [], includeFinal: res.includeFinal || [] };
      }

      const parts = tokenizeTextBlockParts(rawText);
      const wordTokens = [];
      let wi = -1;
      for(const p of parts){
        if(p.type === 'word'){
          wi += 1;
          p.wordIndex = wi;
          const raw = String(p.raw || '');
          const norm = normalizeKeyWord(raw);
          wordTokens.push({ raw, norm });
        }
      }

      const scored = wordTokens.map(t => ({ raw: t.raw, norm: t.norm, score: 0, base: 0, signals: [], ruleIds: [], segments: [], coverage: 0, orphans: [], hardBlock: false, contextDelta: 0, contextNotes: [] }));
      const includeFinal = new Array(wordTokens.length).fill(false);

      for(let i=0;i<wordTokens.length;i++){
        const t = wordTokens[i];
        const n = String(t.norm || '');
        const okLen = n.length >= parseInt(minLen.value || '2', 10);
        if(!okLen) continue;

        if(m === 'all'){
          includeFinal[i] = true;
          continue;
        }

        if(m === 'maoriLetters'){
          if(n && !hasForbiddenLetters(n)) includeFinal[i] = true;
          continue;
        }

        includeFinal[i] = true;
      }

      return { mode:m, threshold:null, parts, scored, includeFinal };
    }

    function computeSegmentStats(inclusion){
      const segCounts = {};
      const segWordCounts = {};
      const seenWords = new Set();
      const perWordSeen = new Set();

      let totalWords = 0;
      let includedWords = 0;
      let segmentsTotal = 0;

      for(let i=0;i<(inclusion.scored || []).length;i++){
        totalWords += 1;
        if(!inclusion.includeFinal[i]) continue;

        const t = inclusion.scored[i];
        const norm = normalizeKeyWord(t.norm || t.raw || '');
        if(!norm) continue;

        if(!includeDuplicates.checked){
          if(perWordSeen.has(norm)) continue;
          perWordSeen.add(norm);
        }

        includedWords += 1;
        seenWords.add(norm);

        const out = segmentWordCore(norm, { trace:false }) || {};
        const segs = normalizeSegments(out.segments || []);
        segmentsTotal += segs.length;

        for(const s of segs){
          segCounts[s] = (segCounts[s] || 0) + 1;
          if(!segWordCounts[s]) segWordCounts[s] = {};
          segWordCounts[s][norm] = (segWordCounts[s][norm] || 0) + 1;
        }
      }

      return {
        totalWords,
        includedWords,
        uniqueWords: seenWords.size,
        segmentsTotal,
        uniqueSegments: Object.keys(segCounts).length,
        segmentCounts: segCounts,
        segmentWordCounts: segWordCounts
      };
    }

    function drawWordDetails(t, included){
      wordBody.innerHTML = '';
      if(!t){
        wordBody.appendChild(el('p', {class:'muted'}, ['Click a word to see details.']));
        return;
      }

      const out = segmentWordCore(normalizeKeyWord(t.norm || t.raw || ''), { trace:true }) || {};
      const segs = normalizeSegments(out.segments || []);

      wordBody.appendChild(el('p', {}, [
        el('span', {class:'tag ' + (included ? 'good' : '')}, [included ? 'Included' : 'Not Included']),
        ' ',
        el('span', {class:'mono'}, [String(t.raw || '')]),
        ' ',
        el('span', {class:'muted'}, ['(' + String(t.norm || '') + ')'])
      ]));

      const segLine = el('div', {class:'mono'});
      segLine.textContent = segs.join(' + ');
      wordBody.appendChild(segLine);

      if(out.trace && out.trace.length){
        wordBody.appendChild(el('div', {class:'divider'}));
        wordBody.appendChild(el('p', {class:'muted'}, ['Trace']));
        const pre = el('pre', {class:'pre'});
        pre.textContent = JSON.stringify(out.trace, null, 2);
        wordBody.appendChild(pre);
      }
    }

    function drawPreview(inclusion){
      hl.innerHTML = '';
      wordBody.innerHTML = '';

      const parts = inclusion.parts || [];
      const scored = inclusion.scored || [];
      const includeFinal = inclusion.includeFinal || [];

      for(const p of parts){
        if(p.type === 'word'){
          const wi = p.wordIndex;
          const tok = scored[wi] || { raw: p.raw, norm: normalizeKeyWord(p.raw || '') };
          const included = !!includeFinal[wi];

          const span = el('span', {class:'hlTok ' + (included ? 'hlInc' : ''), 'data-idx': String(wi)}, [String(p.raw || '')]);
          span.addEventListener('click', ()=>{
            const prevSel = hl.querySelector('.hlTok.selected');
            if(prevSel) prevSel.classList.remove('selected');
            span.classList.add('selected');
            drawWordDetails(tok, included);
          });
          hl.appendChild(span);
          hl.appendChild(document.createTextNode(' '));
        } else {
          hl.appendChild(document.createTextNode(String(p.raw || '')));
        }
      }
    }

    function segmentRow(seg, count, pct, extra){
      const tr = el('tr');
      tr.appendChild(el('td', {class:'mono'}, [seg]));
      tr.appendChild(el('td', {}, [String(count)]));
      tr.appendChild(el('td', {class:'muted'}, [pct || '']));
      tr.appendChild(el('td', {class:'muted'}, [extra != null ? String(extra) : '']));
      return tr;
    }

    function drawSegmentDetailsForBlock(seg){
      blockDetail.innerHTML = '';
      if(!seg || !lastAnalysis){
        blockDetail.appendChild(el('p', {class:'muted'}, ['Click a segment to see details.']));
        return;
      }

      const segCounts = lastAnalysis.segmentWordCounts && lastAnalysis.segmentWordCounts[seg] ? lastAnalysis.segmentWordCounts[seg] : {};
      const total = lastAnalysis.segmentCounts && lastAnalysis.segmentCounts[seg] ? lastAnalysis.segmentCounts[seg] : 0;

      blockDetail.appendChild(el('p', {}, ['Segment ', el('span', {class:'mono'}, [seg]), ' used ' + total + ' time(s) in this block.']));

      const topWords = Object.entries(segCounts).sort((a,b)=>b[1]-a[1]).slice(0, 60);
      if(topWords.length){
        const tbl = el('table');
        const thead = el('thead');
        thead.appendChild(el('tr', {}, [el('th', {}, ['Word']), el('th', {}, ['Count'])]));
        tbl.appendChild(thead);
        const tbody = el('tbody');
        for(const [w,c] of topWords){
          const tr = el('tr');
          tr.appendChild(el('td', {class:'mono'}, [w]));
          tr.appendChild(el('td', {}, [String(c)]));
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        blockDetail.appendChild(el('div', {class:'divider'}));
        blockDetail.appendChild(tbl);
      }
    }

    function drawBlock(){
      blockList.innerHTML = '';
      blockDetail.innerHTML = '';
      blockTags.innerHTML = '';

      if(!lastAnalysis){
        blockList.appendChild(el('p', {class:'muted'}, ['Run an analysis first.']));
        return;
      }

      blockTags.appendChild(el('span', {class:'tag'}, ['Words: ' + lastAnalysis.totalWords]));
      blockTags.appendChild(el('span', {class:'tag'}, ['Included: ' + lastAnalysis.includedWords]));
      blockTags.appendChild(el('span', {class:'tag'}, ['Segments: ' + lastAnalysis.segmentsTotal]));
      blockTags.appendChild(el('span', {class:'tag'}, ['Unique Segments: ' + lastAnalysis.uniqueSegments]));

      const filter = String(blockSearch.value || '').trim().toLowerCase();
      const rows = Object.entries(lastAnalysis.segmentCounts || {})
        .filter(([k,_])=> !filter || k.toLowerCase().includes(filter))
        .sort((a,b)=>b[1]-a[1]);

      if(!rows.length){
        blockList.appendChild(el('p', {class:'muted'}, ['No segments found in this block.']));
        drawSegmentDetailsForBlock(null);
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Segment']),
        el('th', {}, ['Count']),
        el('th', {}, ['Share']),
        el('th', {}, ['Unique Words'])
      ]));
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for(const [seg, count] of rows.slice(0, 400)){
        const pct = lastAnalysis.segmentsTotal ? (Math.round((count/lastAnalysis.segmentsTotal)*1000)/10 + '%') : '';
        const wc = lastAnalysis.segmentWordCounts && lastAnalysis.segmentWordCounts[seg] ? Object.keys(lastAnalysis.segmentWordCounts[seg]).length : 0;
        const tr = segmentRow(seg, count, pct, wc);
        tr.addEventListener('click', ()=>{
          selectedBlockSeg = seg;
          drawSegmentDetailsForBlock(selectedBlockSeg);
          drawBlock();
        });
        if(selectedBlockSeg === seg) tr.classList.add('selected');
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      blockList.appendChild(tbl);

      if(!selectedBlockSeg) selectedBlockSeg = rows[0][0];
      drawSegmentDetailsForBlock(selectedBlockSeg);
    }

    function getSelectedBucketIds(){
      const idx = segStatsLoadIndex();
      if(overallScope.value === 'active'){
        return idx.activeBucketId ? [idx.activeBucketId] : [];
      }
      if(overallScope.value === 'selected'){
        const sel = Array.isArray(idx.overallSelectedBucketIds) ? idx.overallSelectedBucketIds.slice() : [];
        return sel.filter(id => idx.bucketOrder.includes(id));
      }
      return idx.bucketOrder.slice();
    }

    function saveOverallSelectedBucketIds(ids){
      const idx = segStatsLoadIndex();
      idx.overallSelectedBucketIds = Array.isArray(ids) ? ids.filter(id => idx.bucketOrder.includes(id)) : [];
      segStatsSaveIndex(idx);
    }

    function renderOverallBucketPicker(){
      const idx = segStatsLoadIndex();
      const show = (overallScope.value === 'selected');
      overallBucketPickCard.style.display = show ? '' : 'none';
      if(!show) return;

      // If this field didn't exist in older saves, initialize it once
      if(!Object.prototype.hasOwnProperty.call(idx, 'overallSelectedBucketIds') || !Array.isArray(idx.overallSelectedBucketIds)){
        idx.overallSelectedBucketIds = idx.bucketOrder.slice();
        segStatsSaveIndex(idx);
      } else {
        // Keep only current bucket ids
        const filtered = idx.overallSelectedBucketIds.filter(id => idx.bucketOrder.includes(id));
        if(filtered.length !== idx.overallSelectedBucketIds.length){
          idx.overallSelectedBucketIds = filtered;
          segStatsSaveIndex(idx);
        }
      }

      const selected = new Set(idx.overallSelectedBucketIds || []);
      pickInfo.textContent = 'Selected: ' + selected.size + ' / ' + idx.bucketOrder.length;

      pickList.innerHTML = '';
      for(const bid of idx.bucketOrder){
        const row = el('label', {class:'checkbox', style:'display:flex; align-items:center; gap:8px; width:100%; padding:4px 0;'});
        const cb = el('input', {type:'checkbox'});
        cb.checked = selected.has(bid);
        cb.setAttribute('data-bid', bid);

        cb.addEventListener('change', ()=>{
          const ids = [];
          const cbs = pickList.querySelectorAll('input[type="checkbox"][data-bid]');
          cbs.forEach(x => { if(x.checked) ids.push(x.getAttribute('data-bid')); });
          saveOverallSelectedBucketIds(ids);
          pickInfo.textContent = 'Selected: ' + ids.length + ' / ' + segStatsLoadIndex().bucketOrder.length;
          selectedOverallSeg = null;
          drawOverall();
        });

        const label = bucketLabelMap[bid] || ('Bucket ' + bid);
        row.appendChild(cb);
        row.appendChild(el('span', {}, [label]));
        pickList.appendChild(row);
      }
    }

    function applyOverallBucketSelection(ids){
      saveOverallSelectedBucketIds(ids);
      renderOverallBucketPicker();
      selectedOverallSeg = null;
      drawOverall();
    }

    pickAllBtn.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      applyOverallBucketSelection(idx.bucketOrder.slice());
    });

    pickNoneBtn.addEventListener('click', ()=>{
      applyOverallBucketSelection([]);
    });

    pickActiveBtn.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      applyOverallBucketSelection(idx.activeBucketId ? [idx.activeBucketId] : []);
    });

    function loadBucketsForScope(){
      const ids = getSelectedBucketIds();
      const buckets = [];
      for(const id of ids){
        const b = segStatsLoadBucket(id);
        if(b) buckets.push(b);
      }
      return buckets;
    }

    function computeOverallAgg(buckets){
      const segCounts = {};
      let blocks = 0;
      let words = 0;
      let includedWords = 0;
      let segments = 0;

      for(const b of buckets){
        words += (b.totalWords || 0);
        includedWords += (b.totalIncludedWords || 0);
        segments += (b.segmentsTotal || 0);
        const aggMap = segStatsDecodeEncToMap(b.aggEnc || '');
        for(const k of Object.keys(aggMap)){
          const sid = parseInt(k,10);
          const c = aggMap[k] || 0;
          const seg = (b.dict && b.dict[sid]) ? b.dict[sid] : null;
          if(!seg) continue;
          segCounts[seg] = (segCounts[seg] || 0) + c;
        }
        blocks += (Array.isArray(b.entries) ? b.entries.length : 0);
      }

      return { blocks, words, includedWords, segments, segCounts };
    }

    function drawOverallDetails(seg, buckets, agg){
      overallDetail.innerHTML = '';
      if(!seg){
        overallDetail.appendChild(el('p', {class:'muted'}, ['Click a segment to see details.']));
        return;
      }

      const total = agg && agg.segCounts && agg.segCounts[seg] ? agg.segCounts[seg] : 0;
      const blockRefs = [];
      let lastTs = 0;

      // Scan entries across selected buckets for this segment
      for(const b of buckets){
        const sid = (Array.isArray(b.dict) ? b.dict.indexOf(seg) : -1);
        if(sid < 0) continue;

        const entries = Array.isArray(b.entries) ? b.entries : [];
        for(const e of entries){
          const map = segStatsDecodeEncToMap(e.countsEnc || '');
          const c = map[sid] || 0;
          if(c){
            blockRefs.push({ bucketId: b.id, entry: e, count: c, sid });
            const ts = e.ts || (e.tsIso ? new Date(e.tsIso).getTime() : 0);
            lastTs = Math.max(lastTs, ts || 0);
          }
        }
      }

      blockRefs.sort((a,b)=>b.count-a.count);

      overallDetail.appendChild(el('p', {}, [
        'Segment ',
        el('span', {class:'mono'}, [seg]),
        ' used ',
        String(total),
        ' time(s) across ',
        String(blockRefs.length),
        ' block(s).'
      ]));

      if(lastTs){
        overallDetail.appendChild(el('p', {class:'muted'}, ['Last seen: ' + new Date(lastTs).toLocaleString()]));
      }

      overallDetail.appendChild(el('div', {class:'divider'}));
      overallDetail.appendChild(el('p', {class:'muted'}, ['Blocks that used this segment (top first). Click to reload if text was stored.']));

      if(!blockRefs.length){
        overallDetail.appendChild(el('p', {class:'muted'}, ['No blocks found for this segment in the selected scope.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Time']),
        el('th', {}, ['Count']),
        el('th', {}, ['Bucket']),
        el('th', {}, ['Preview']),
        el('th', {}, ['Action'])
      ]));
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for(const b of blockRefs.slice(0, 200)){
        const e = b.entry;
        const tr = el('tr');
        const dt = e.ts ? new Date(e.ts) : (e.tsIso ? new Date(e.tsIso) : null);
        const preview = String(e.preview || '').trim();

        tr.appendChild(el('td', {}, [dt ? dt.toLocaleString() : '']));
        tr.appendChild(el('td', {}, [String(b.count)]));
        tr.appendChild(el('td', {class:'mono'}, [String(b.bucketId)]));
        tr.appendChild(el('td', {class:'mono'}, [preview.slice(0, 80) + (preview.length > 80 ? '...' : '')]));

        const act = el('div');
        const reloadBtn = el('button', {class:'btn small', type:'button'}, ['Reload']);
        reloadBtn.disabled = !e.text;
        reloadBtn.title = e.text ? 'Reload this entry text into the editor' : 'Text not stored for this entry';
        reloadBtn.addEventListener('click', (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          if(!e.text) return;
          area.value = e.text;
          saveToStorage('rr_segstats_text', area.value);
          if(e.mode) mode.value = e.mode;
          if(e.threshold != null) thr.value = String(e.threshold);
          thrLabel.textContent = 'Threshold: ' + Math.round(parseFloat(thr.value)*100) + '%';
          analyze(false);
          try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
        });
        act.appendChild(reloadBtn);
        tr.appendChild(el('td', {}, [act]));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      overallDetail.appendChild(tbl);

      if(blockRefs.length > 200){
        overallDetail.appendChild(el('p', {class:'muted'}, ['Showing top 200 blocks. Total blocks: ' + blockRefs.length]));
      }
    }

    function drawOverall(){
      overallList.innerHTML = '';
      overallDetail.innerHTML = '';
      overallTags.innerHTML = '';

      const buckets = loadBucketsForScope();
      const agg = computeOverallAgg(buckets);

      const noBucketsSelected = (overallScope.value === 'selected' && !buckets.length);

      if(selectedOverallSeg && !(agg.segCounts && Object.prototype.hasOwnProperty.call(agg.segCounts, selectedOverallSeg))){
        selectedOverallSeg = null;
      }

      overallTags.appendChild(el('span', {class:'tag'}, ['Blocks: ' + agg.blocks]));
      overallTags.appendChild(el('span', {class:'tag'}, ['Words: ' + agg.words]));
      overallTags.appendChild(el('span', {class:'tag'}, ['Included: ' + agg.includedWords]));
      overallTags.appendChild(el('span', {class:'tag'}, ['Segments: ' + agg.segments]));
      overallTags.appendChild(el('span', {class:'tag'}, ['Unique Segments: ' + Object.keys(agg.segCounts || {}).length]));

      const filter = String(overallSearch.value || '').trim().toLowerCase();
      const rows = Object.entries(agg.segCounts || {})
        .filter(([k,_])=> !filter || k.toLowerCase().includes(filter))
        .sort((a,b)=>b[1]-a[1]);

      if(!rows.length){
        overallList.appendChild(el('p', {class:'muted'}, [noBucketsSelected ? 'No buckets selected. Choose at least one bucket in Bucket Selection.' : 'No overall segment stats yet. Analyze and log at least one block.']));
        drawOverallDetails(null, buckets, agg);
      } else {
        const tbl = el('table');
        const thead = el('thead');
        thead.appendChild(el('tr', {}, [
          el('th', {}, ['Segment']),
          el('th', {}, ['Total'])
        ]));
        tbl.appendChild(thead);

        const tbody = el('tbody');
        for(const [seg, count] of rows.slice(0, 500)){
          const tr = el('tr');
          tr.appendChild(el('td', {class:'mono'}, [seg]));
          tr.appendChild(el('td', {}, [String(count)]));

          tr.addEventListener('click', ()=>{
            selectedOverallSeg = seg;
            drawOverallDetails(seg, buckets, agg);
            drawOverall();
          });

          if(selectedOverallSeg === seg) tr.classList.add('selected');
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        overallList.appendChild(tbl);

        if(!selectedOverallSeg) selectedOverallSeg = rows[0][0];
        drawOverallDetails(selectedOverallSeg, buckets, agg);
      }

      dlJson.onclick = ()=>{
        const payload = {
          generatedAtIso: new Date().toISOString(),
          scope: overallScope.value,
          blocks: agg.blocks,
          totals: { words: agg.words, includedWords: agg.includedWords, segments: agg.segments, uniqueSegments: Object.keys(agg.segCounts || {}).length },
          segments: Object.entries(agg.segCounts || {}).sort((a,b)=>b[1]-a[1]).map(([segment,count])=>({ segment, count }))
        };
        downloadText('segment_stats_overall.json', JSON.stringify(payload, null, 2), 'application/json');
      };

      dlCsv.onclick = ()=>{
        const rowsOut = [['segment','count']];
        for(const [segment, count] of Object.entries(agg.segCounts || {}).sort((a,b)=>b[1]-a[1])){
          rowsOut.push([segment, count]);
        }
        downloadText('segment_stats_overall.csv', toCsv(rowsOut), 'text/csv');
      };
    }

    function drawHistory(){
      hWrap.innerHTML = '';

      const idx = segStatsLoadIndex();
      const activeId = idx.activeBucketId;
      const b = activeId ? segStatsLoadBucket(activeId) : null;
      const entries = b && Array.isArray(b.entries) ? b.entries : [];

      if(!entries.length){
        hWrap.appendChild(el('p', {}, ['No history entries in this bucket yet. Analyze And Log to add entries.']));
        hPageInfo.textContent = 'Page 1';
        return;
      }

      const filter = String(hSearch.value || '').trim().toLowerCase();
      const filtered = filter
        ? entries.filter(e => String(e.preview || '').toLowerCase().includes(filter))
        : entries.slice();

      const pageSize = parseInt(hPageSize.value || '50', 10) || 50;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      historyPage = Math.max(0, Math.min(historyPage, totalPages-1));

      hPageInfo.textContent = 'Page ' + (historyPage + 1) + ' of ' + totalPages + ' (' + filtered.length + ')';

      const slice = filtered.slice(historyPage * pageSize, historyPage * pageSize + pageSize);

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Time']),
        el('th', {}, ['Preview']),
        el('th', {}, ['Mode']),
        el('th', {}, ['Words']),
        el('th', {}, ['Segments']),
        el('th', {}, ['Remove'])
      ]));
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for(const e of slice){
        const tr = el('tr');
        tr.addEventListener('click', ()=>{
          if(!e.text){
            // no text stored, still show current stats unchanged
            return;
          }
          area.value = e.text || '';
          saveToStorage('rr_segstats_text', area.value);
          if(e.mode) mode.value = e.mode;
          if(e.threshold != null){
            thr.value = String(e.threshold);
            thrLabel.textContent = 'Threshold: ' + Math.round(parseFloat(thr.value)*100) + '%';
          }
          analyze(false);
          try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(_){}
        });

        const dt = e.ts ? new Date(e.ts) : (e.tsIso ? new Date(e.tsIso) : null);
        const preview = String(e.preview || '').replace(/\s+/g,' ').trim();
        tr.appendChild(el('td', {}, [dt ? dt.toLocaleString() : '']));
        tr.appendChild(el('td', {class:'mono'}, [preview.slice(0, 90) + (preview.length > 90 ? '...' : '')]));
        tr.appendChild(el('td', {}, [String(e.mode || '')]));
        tr.appendChild(el('td', {}, [String(e.includeCount != null ? e.includeCount : '')]));
        tr.appendChild(el('td', {}, [String(e.segmentsTotal != null ? e.segmentsTotal : '')]));

        const rmBtn = el('button', {class:'btn small danger', type:'button', title:'Remove this entry from history'}, ['Remove']);
        rmBtn.addEventListener('click', (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          segStatsRemoveEntry(activeId, e.id);
          selectedOverallSeg = null;
          drawOverall();
          drawHistory();
          refreshBucketInfo();
        });

        tr.appendChild(el('td', {}, [rmBtn]));
        tbody.appendChild(tr);
      }

      tbl.appendChild(tbody);
      hWrap.appendChild(tbl);

      if(filter && !slice.length){
        hWrap.appendChild(el('p', {class:'muted'}, ['No results for this search.']));
      }

      if(entries.length && slice.length && !slice[0].text){
        hWrap.appendChild(el('p', {class:'muted'}, ['Tip: Reload requires stored text. Enable "Store Full Text In History" before logging if you want re-run by clicking history rows.']));
      }
    }

    function refreshBucketInfo(){
      bucketInfo.innerHTML = '';

      const idx = segStatsLoadIndex();
      maxWords.value = String(idx.maxWordsPerBucket || 10000);

      // Populate select
      bucketLabelMap = {};
      bucketSelect.innerHTML = '';
      for(let i=0;i<idx.bucketOrder.length;i++){
        const bid = idx.bucketOrder[i];
        const b = segStatsLoadBucket(bid);
        const name = (b && b.name) ? String(b.name) : ('Bucket ' + (i+1));
        const label = b
          ? (name + ' | ' + bid + ' | Included ' + (b.totalIncludedWords || 0) + ' | Blocks ' + (Array.isArray(b.entries) ? b.entries.length : 0))
          : (name + ' | ' + bid);
        bucketLabelMap[bid] = label;
        const opt = el('option', {value: bid}, [label]);
        bucketSelect.appendChild(opt);
      }
      if(idx.activeBucketId) bucketSelect.value = idx.activeBucketId;

      const active = idx.activeBucketId ? segStatsLoadBucket(idx.activeBucketId) : null;

      bucketInfo.appendChild(el('span', {class:'tag'}, ['Buckets: ' + idx.bucketOrder.length]));
      bucketInfo.appendChild(el('span', {class:'tag'}, ['Active Included: ' + (active ? (active.totalIncludedWords || 0) : 0)]));
      bucketInfo.appendChild(el('span', {class:'tag'}, ['Active Blocks: ' + (active && Array.isArray(active.entries) ? active.entries.length : 0)]));

      // Approx storage bytes for segstats keys
      let bytes = 0;
      try{
        const idxRaw = loadFromStorage(STORAGE_KEYS.segmentStatsBuckets) || '';
        bytes += idxRaw.length;
        for(const bid of idx.bucketOrder){
          const raw = loadFromStorage(segStatsBucketKey(bid)) || '';
          bytes += raw.length;
        }
      }catch(_){}
      bucketInfo.appendChild(el('span', {class:'tag'}, ['SegStats Storage: ' + Math.round(bytes/1024) + ' KB']));

      // Legacy status
      const legacy = segStatsLegacyExport();
      if(legacy && legacy.length){
        bucketInfo.appendChild(el('span', {class:'tag bad'}, ['Legacy v23 history found: ' + legacy.length]));
      } else {
        bucketInfo.appendChild(el('span', {class:'tag good'}, ['Legacy v23 history: none']));
      }

      renderOverallBucketPicker();
    }

    function analyze(doLog){
      const rawText = area.value || '';
      saveToStorage('rr_segstats_text', rawText);

      const inclusion = buildWordInclusion(rawText);
      const stats = computeSegmentStats(inclusion);

      drawPreview(inclusion);

      lastAnalysis = {
        mode: inclusion.mode,
        threshold: inclusion.threshold,
        totalWords: stats.totalWords,
        includedWords: stats.includedWords,
        uniqueWords: stats.uniqueWords,
        segmentsTotal: stats.segmentsTotal,
        uniqueSegments: stats.uniqueSegments,
        segmentCounts: stats.segmentCounts,
        segmentWordCounts: stats.segmentWordCounts
      };

      summary.innerHTML = '';
      summary.appendChild(el('span', {class:'tag'}, ['Words: ' + stats.totalWords]));
      summary.appendChild(el('span', {class:'tag'}, ['Included: ' + stats.includedWords]));
      summary.appendChild(el('span', {class:'tag'}, ['Segments: ' + stats.segmentsTotal]));
      summary.appendChild(el('span', {class:'tag'}, ['Unique Segments: ' + stats.uniqueSegments]));

      selectedBlockSeg = null;
      drawBlock();

      if(doLog){
        const idx = segStatsLoadIndex();
        const maxW = Math.max(1000, parseInt(maxWords.value || String(idx.maxWordsPerBucket || 10000), 10) || (idx.maxWordsPerBucket || 10000));
        const options = {
          storeText: !!storeText.checked,
          maxWordsPerBucket: maxW,
          maxAutoArchive: autoArchive.checked ? (parseInt(maxAuto.value || '3', 10) || 3) : 0
        };

        // Save max words to index so it persists
        idx.maxWordsPerBucket = maxW;
        segStatsSaveIndex(idx);

        const res = segStatsAddEntryFromAnalysis(rawText, inclusion, stats, options);
        if(!res.ok){
          summary.appendChild(el('span', {class:'tag bad'}, ['Storage quota reached']));
          summary.appendChild(el('span', {class:'muted'}, ['Export and archive older buckets then try again.']));
        } else {
          if(res.rolloverArchived){
            summary.appendChild(el('span', {class:'tag'}, ['Rollover Archived: ' + res.rolloverArchived]));
          }
          if(res.archived){
            summary.appendChild(el('span', {class:'tag'}, ['Auto Archived: ' + res.archived]));
          }
          refreshBucketInfo();
          drawOverall();
          drawHistory();
        }
      }
    }

    // Events
    runBtn.addEventListener('click', ()=>{ analyze(true); });
    runOnlyBtn.addEventListener('click', ()=>{ analyze(false); });

    blockSearch.addEventListener('input', drawBlock);
    overallSearch.addEventListener('input', drawOverall);
    overallScope.addEventListener('change', ()=>{ selectedOverallSeg = null; renderOverallBucketPicker(); drawOverall(); });
    hSearch.addEventListener('input', ()=>{ historyPage = 0; drawHistory(); });
    hPageSize.addEventListener('change', ()=>{ historyPage = 0; drawHistory(); });
    hPrev.addEventListener('click', ()=>{ historyPage = Math.max(0, historyPage-1); drawHistory(); });
    hNext.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      const b = idx.activeBucketId ? segStatsLoadBucket(idx.activeBucketId) : null;
      const entries = b && Array.isArray(b.entries) ? b.entries : [];
      const filter = String(hSearch.value || '').trim().toLowerCase();
      const filtered = filter ? entries.filter(e => String(e.preview || '').toLowerCase().includes(filter)) : entries;
      const pageSize = parseInt(hPageSize.value || '50', 10) || 50;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      historyPage = Math.min(totalPages-1, historyPage+1);
      drawHistory();
    });

    bucketSelect.addEventListener('change', ()=>{
      const id = bucketSelect.value;
      segStatsSetActiveBucketId(id);
      historyPage = 0;
      selectedOverallSeg = null;
      refreshBucketInfo();
      drawOverall();
      drawHistory();
    });

    renameBucketBtn.addEventListener('click', ()=>{
      const id = bucketSelect.value || '';
      if(!id) return;
      const b = segStatsLoadBucket(id);
      if(!b) return;
      const current = String(b.name || '');
      const next = prompt('Rename bucket', current || ('Bucket ' + id));
      if(next === null) return;
      const name = String(next).trim();
      if(!name) return;
      b.name = name;

      // Renaming is tiny, but still respect storage quotas
      const saveRes = segStatsTrySaveWithAutoArchive(()=>{
        segStatsSaveBucket(b);
      }, 0);

      refreshBucketInfo();
      drawOverall();
      drawHistory();

      if(!saveRes.ok){
        summary.innerHTML = '';
        summary.appendChild(el('span', {class:'tag bad'}, ['Could not rename (storage full). Consider exporting and archiving older buckets.']));
      }
    });

    deleteBucketBtn.addEventListener('click', ()=>{
      const id = bucketSelect.value || '';
      if(!id) return;
      const b = segStatsLoadBucket(id);
      const label = b && b.name ? b.name : id;
      const ok = confirm('Delete bucket "' + label + '"?\n\nThis will remove its history and its contribution to overall stats.');
      if(!ok) return;

      segStatsDeleteBucket(id);
      segStatsEnsureActiveBucket();
      historyPage = 0;
      selectedOverallSeg = null;

      refreshBucketInfo();
      drawOverall();
      drawHistory();
    });

    newBucketBtn.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      const prevOrder = idx.bucketOrder.slice();
      const selAll = Array.isArray(idx.overallSelectedBucketIds)
        && idx.overallSelectedBucketIds.length === prevOrder.length
        && idx.overallSelectedBucketIds.every((x,i)=>x === prevOrder[i]);

      const b = segStatsMakeBucket();
      const maxW = Math.max(1000, parseInt(maxWords.value || String(idx.maxWordsPerBucket || 10000), 10) || (idx.maxWordsPerBucket || 10000));
      idx.maxWordsPerBucket = maxW;

      const saveRes = segStatsTrySaveWithAutoArchive(()=>{
        segStatsSaveBucket(b);
        idx.bucketOrder.push(b.id);
        idx.activeBucketId = b.id;

        if(!Array.isArray(idx.overallSelectedBucketIds)){
          idx.overallSelectedBucketIds = prevOrder.slice();
        }
        if(selAll){
          idx.overallSelectedBucketIds = idx.bucketOrder.slice();
        }

        segStatsSaveIndex(idx);
      }, 3);

      refreshBucketInfo();
      drawOverall();
      drawHistory();
      if(!saveRes.ok){
        summary.innerHTML = '';
        summary.appendChild(el('span', {class:'tag bad'}, ['Could not start new bucket']));
      }
    });

    exportActiveBtn.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      const b = idx.activeBucketId ? segStatsLoadBucket(idx.activeBucketId) : null;
      if(!b) return;
      const dt = b.createdAtIso ? new Date(b.createdAtIso) : new Date();
      const stamp = dt.toISOString().slice(0,10);
      segStatsExportBucket(b, 'segment_stats_bucket_' + stamp + '_' + b.id + '.json');
    });

    exportAllBtn.addEventListener('click', ()=>{
      const idx = segStatsLoadIndex();
      const buckets = [];
      for(const bid of idx.bucketOrder){
        const b = segStatsLoadBucket(bid);
        if(b) buckets.push(b);
      }
      const payload = {
        exportType: 'reorite_segment_stats_bundle',
        exportVersion: 1,
        exportedAtIso: new Date().toISOString(),
        index: idx,
        buckets
      };
      downloadText('segment_stats_buckets_bundle.json', JSON.stringify(payload, null, 2), 'application/json');
    });

    importBtn.addEventListener('click', ()=> importFile.click());
    importFile.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !parsed.value){ importFile.value=''; return; }

      const val = parsed.value;
      let importedBuckets = [];
      if(val.exportType === 'reorite_segment_stats_bucket' && val.bucket){
        importedBuckets = [val.bucket];
      } else if(val.exportType === 'reorite_segment_stats_bundle' && Array.isArray(val.buckets)){
        importedBuckets = val.buckets;
      } else if(Array.isArray(val.bucketOrder) && Array.isArray(val.buckets)){
        importedBuckets = val.buckets;
      }

      if(!importedBuckets.length){ importFile.value=''; return; }

      const idx = segStatsLoadIndex();
      const prevOrderStart = idx.bucketOrder.slice();
      const selAll = Array.isArray(idx.overallSelectedBucketIds)
        && idx.overallSelectedBucketIds.length === prevOrderStart.length
        && idx.overallSelectedBucketIds.every((x,i)=>x === prevOrderStart[i]);
      let added = 0;

      for(const b of importedBuckets){
        if(!b || !b.id) continue;
        if(idx.bucketOrder.includes(b.id)) continue;

        const saveRes = segStatsTrySaveWithAutoArchive(()=>{
          segStatsSaveBucket(b);
          idx.bucketOrder.push(b.id);
          idx.activeBucketId = b.id;

          if(!Array.isArray(idx.overallSelectedBucketIds)){
            idx.overallSelectedBucketIds = prevOrderStart.slice();
          }
          if(selAll){
            idx.overallSelectedBucketIds.push(b.id);
          }

          segStatsSaveIndex(idx);
        }, 3);

        if(saveRes.ok) added += 1;
      }

      refreshBucketInfo();
      drawOverall();
      drawHistory();

      summary.innerHTML = '';
      summary.appendChild(el('span', {class:'tag'}, ['Imported buckets: ' + added]));

      importFile.value = '';
    });

    archiveOldestBtn.addEventListener('click', ()=>{
      const archived = segStatsArchiveOldestBuckets(1);
      refreshBucketInfo();
      drawOverall();
      drawHistory();
      summary.innerHTML = '';
      if(archived){
        summary.appendChild(el('span', {class:'tag'}, ['Archived: ' + archived]));
      } else {
        summary.appendChild(el('span', {class:'tag bad'}, ['Nothing to archive']));
      }
    });

    clearAllBtn.addEventListener('click', ()=>{
      // Safety: export all first
      exportAllBtn.click();
      const idx = segStatsLoadIndex();
      for(const bid of idx.bucketOrder){
        try{ localStorage.removeItem(segStatsBucketKey(bid)); }catch(_){}
      }
      saveToStorage(STORAGE_KEYS.segmentStatsBuckets, JSON.stringify({version:1, maxWordsPerBucket: 10000, bucketOrder: [], activeBucketId:'', overallSelectedBucketIds: []}, null, 2));
      segStatsEnsureActiveBucket();
      refreshBucketInfo();
      selectedOverallSeg = null;
      historyPage = 0;
      drawOverall();
      drawHistory();
      summary.innerHTML = '';
      summary.appendChild(el('span', {class:'tag'}, ['Buckets cleared after export']));
    });

    legacyBtn.addEventListener('click', ()=>{
      const legacy = segStatsLegacyExport();
      if(!legacy || !legacy.length){
        summary.innerHTML = '';
        summary.appendChild(el('span', {class:'tag'}, ['No legacy history found']));
        return;
      }

      // Export legacy first to prevent data loss
      downloadText('segment_stats_history_v23_legacy.json', JSON.stringify(legacy, null, 2), 'application/json');

      // Clear legacy key to free space before importing
      segStatsLegacyClear();

      // Import minified into buckets (no word breakdown, text only if option is on)
      const idx = segStatsLoadIndex();
      const maxW = Math.max(1000, parseInt(maxWords.value || String(idx.maxWordsPerBucket || 10000), 10) || (idx.maxWordsPerBucket || 10000));
      idx.maxWordsPerBucket = maxW;
      segStatsSaveIndex(idx);

      let imported = 0;
      for(const it of legacy){
        const rawText = it && it.text ? String(it.text) : '';
        const inclusion = { mode: it.mode || 'detect', threshold: (it.threshold != null ? it.threshold : null) };
        const stats = {
          totalWords: it.totalWords || 0,
          includedWords: it.includeCount || 0,
          uniqueWords: it.uniqueWords || 0,
          segmentsTotal: it.segmentsTotal || 0,
          uniqueSegments: it.uniqueSegments || (it.segmentCounts ? Object.keys(it.segmentCounts).length : 0),
          segmentCounts: it.segmentCounts || {}
        };
        const res = segStatsAddEntryFromAnalysis(rawText, inclusion, stats, {
          storeText: !!storeText.checked,
          maxWordsPerBucket: maxW,
          maxAutoArchive: autoArchive.checked ? (parseInt(maxAuto.value || '3', 10) || 3) : 0
        });
        if(res.ok) imported += 1;
        else break;
      }

      refreshBucketInfo();
      drawOverall();
      drawHistory();

      summary.innerHTML = '';
      summary.appendChild(el('span', {class:'tag'}, ['Imported legacy entries: ' + imported]));
      summary.appendChild(el('span', {class:'muted'}, ['Legacy export downloaded and legacy storage cleared.']));
    });

    // Init
    segStatsEnsureActiveBucket();
    refreshBucketInfo();
    analyze(false);
    drawOverall();
    drawHistory();
  }
