// Extracted Stage 3: basic G2P pipeline and legacy V4 browser section.
// Depends on app_shared.js, segmenter_core.js, segmenter_rules_ui.js, regression_tools.js, and g2p_v4_lexicon.js.

  function loadG2pPrefs(){
    const raw = loadFromStorage(STORAGE_KEYS.g2pPrefs);
    const parsed = raw ? safeJsonParse(raw) : {ok:false};
    if(parsed.ok && parsed.value && typeof parsed.value === 'object') return parsed.value;
    return { joinMode: 'space' };
  }

  function saveG2pPrefs(prefs){
    return saveToStorage(STORAGE_KEYS.g2pPrefs, JSON.stringify(prefs || {}, null, 2));
  }

  function loadG2pHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.g2pHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveG2pHistory(items){
    return saveToStorage(STORAGE_KEYS.g2pHistory, JSON.stringify(items || [], null, 2));
  }

  function addG2pHistoryEntry(entry){
    const items = loadG2pHistory();
    const sig = `${entry.word}::${segmentsToString(entry.segments)}::${entry.ipa || ''}`;
    const filtered = items.filter(x => `${x.word}::${segmentsToString(x.segments)}::${x.ipa || ''}` !== sig);
    filtered.unshift(entry);
    saveG2pHistory(filtered.slice(0, 200));
  }




  function renderG2P(){
    const root = document.getElementById('pageG2P');
    root.innerHTML = '';

    const prefs = loadG2pPrefs();

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['G2P']));
    card.appendChild(el('p', {}, ['Segment a word using v12 then map each segment to IPA using the embedded lexicon (Unit, Proper IPA, Unit Number).']))
    const baseLexiconControl = buildLexiconSourceControl('base', ()=>{ renderG2P(); }, 'G2P lexicon source');

    const input = el('input', {type:'text', placeholder:'e.g. haititaimarangai'});
    input.value = prefs.lastInputText || '';
    input.addEventListener('input', ()=>{
      prefs.lastInputText = input.value;
      saveG2pPrefs(prefs);
    });
    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Segment And Map']);

    const traceCheck = el('label', {class:'checkbox'});
    const traceInput = el('input', {type:'checkbox'});
    traceInput.checked = false;
    traceCheck.appendChild(traceInput);
    traceCheck.appendChild(document.createTextNode('Include Trace'));

    const joinSelect = el('select', {class:'btn', title:'IPA join style'});
    joinSelect.style.padding = '8px 10px';
    joinSelect.style.borderRadius = '10px';
    joinSelect.style.background = 'var(--surfaceStrong)';
    joinSelect.style.border = '1px solid var(--border)';
    joinSelect.style.color = 'var(--text)';

    const joinOptions = [
      {v:'space', t:'IPA Join: space'},
      {v:'dot', t:'IPA Join: dot'},
      {v:'none', t:'IPA Join: none'}
    ];
    for(const opt of joinOptions){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.joinMode || 'space')) o.selected = true;
      joinSelect.appendChild(o);
    }

    joinSelect.addEventListener('change', ()=>{
      prefs.joinMode = joinSelect.value;
      saveG2pPrefs(prefs);
      // if a mapping view exists, recompute join only
      const ipaOut = root.querySelector('#ipaOutput');
      const partsRaw = root.querySelector('#ipaPartsJson');
      if(ipaOut && partsRaw){
        const parsed = safeJsonParse(partsRaw.value || '[]');
        if(parsed.ok){
          ipaOut.textContent = joinIpa(parsed.value, prefs.joinMode);
        }
      }
    });

    const outWrap = el('div', {class:'stack', style:'margin-top:12px;'});

    const inputWrap = el('div', {style:'flex:1; min-width:260px;'});
    inputWrap.appendChild(input);

    const btnWrap = el('div', {style:'display:flex; gap:8px; flex-wrap:wrap;'});
    btnWrap.appendChild(runBtn);
    btnWrap.appendChild(joinSelect);
    btnWrap.appendChild(traceCheck);
    btnWrap.appendChild(baseLexiconControl.wrap);

    const controlRow = el('div', {class:'row'});
    controlRow.appendChild(inputWrap);
    controlRow.appendChild(btnWrap);

    card.appendChild(controlRow);
    root.appendChild(card);
    root.appendChild(outWrap);

    // History card
    const historyCard = el('div', {class:'card'});
    historyCard.appendChild(el('h2', {}, ['G2P History']));
    historyCard.appendChild(el('p', {}, ['Most recent first. Click a row to load it back into G2P input.']))

    const historyControls = el('div', {class:'row'});
    const btnClear = el('button', {class:'btn', type:'button', onclick:()=>{ saveG2pHistory([]); drawHistory(); }}, ['Clear History']);
    const btnExport = el('button', {class:'btn', type:'button', onclick:()=>{
      downloadText('segmenter_v12_g2p_history.json', JSON.stringify(loadG2pHistory(), null, 2), 'application/json');
    }}, ['Export History']);

    const btnImport = el('button', {class:'btn', type:'button'}, ['Import History']);
    const fileInput = el('input', {type:'file', accept:'application/json', class:'hidden'});
    btnImport.addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !Array.isArray(parsed.value)) return;
      saveG2pHistory(parsed.value);
      drawHistory();
      fileInput.value = '';
    });

    historyControls.appendChild(btnClear);
    historyControls.appendChild(btnExport);
    historyControls.appendChild(btnImport);
    historyControls.appendChild(fileInput);

    const historyWrap = el('div', {id:'g2pHistoryWrap'});
    historyCard.appendChild(historyControls);
    historyCard.appendChild(el('div', {class:'divider'}));
    historyCard.appendChild(historyWrap);

    // Lexicon search card
    const lexCard = el('div', {class:'card'});
    lexCard.appendChild(el('h2', {}, ['Lexicon Search']));
    lexCard.appendChild(el('p', {}, ['Search the embedded lexicon by Unit. Shows matches with Proper IPA and Unit Number.']))

    const lexSearch = el('input', {type:'search', placeholder:'Search unit (e.g. ngai, wha, ūa...)'});
    const lexInfo = el('div', {class:'row'});
    const lexWrap = el('div');

    lexCard.appendChild(lexSearch);
    lexCard.appendChild(el('div', {style:'margin-top:10px;'}));
    lexCard.appendChild(lexInfo);
    lexCard.appendChild(el('div', {style:'margin-top:10px;'}));
    lexCard.appendChild(lexWrap);


    // Lexicon browser card (full browse + missing variations)
    const browseCard = el('div', {class:'card'});
    browseCard.appendChild(el('h2', {}, ['Rich Lexicon Browser']));
    browseCard.appendChild(el('p', {}, [
      'Browse the selected rich lexicon (V4 or V5). Use the missing-variation filters to find segments that need more work. ',
      'Click a row to copy the unit into the input.'
    ]));
    const richLexiconControl = buildLexiconSourceControl('rich', ()=>{ renderG2P(); }, 'Rich lexicon source');

    const browseRowTop = el('div', {class:'row'});
    const browseSearch = el('input', {type:'search', placeholder:'Filter unit...', style:'flex:1; min-width:260px;'});
    const browseSort = el('select', {class:'btn', title:'Sort'});
    browseSort.style.padding = '8px 10px';
    browseSort.style.borderRadius = '10px';
    browseSort.style.background = 'var(--surfaceStrong)';
    browseSort.style.border = '1px solid var(--border)';
    browseSort.style.color = 'var(--text)';

    const sortOpts = [
      {v:'id_desc', t:'Sort: ID (desc)'},
      {v:'id_asc', t:'Sort: ID (asc)'},
      {v:'unit_asc', t:'Sort: Unit (asc)'},
      {v:'unit_desc', t:'Sort: Unit (desc)'},
      {v:'bracket_desc', t:'Bracket Count (High to Low)'},
      {v:'bracket_asc', t:'Bracket Count (Low to High)'},
    ];
    for(const opt of sortOpts){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.browseSort || 'id_desc')) o.selected = true;
      browseSort.appendChild(o);
    }

    const browseLimitInput = el('input', {type:'number', min:'10', step:'10', value: String(prefs.browseLimit || 300), style:'width:120px;'});
    const browseLimitLabel = el('label', {class:'checkbox'});
    browseLimitLabel.appendChild(el('span', {class:'muted'}, ['Show First']));
    browseLimitLabel.appendChild(browseLimitInput);
    browseLimitLabel.appendChild(el('span', {class:'muted'}, ['Segments']));

    const browseApply = el('button', {class:'btn', type:'button'}, ['Apply']);
    const browseReset = el('button', {class:'btn', type:'button'}, ['Reset']);
    const browseExportCsv = el('button', {class:'btn', type:'button'}, ['Export Filtered CSV']);

    browseRowTop.appendChild(browseSearch);
    browseRowTop.appendChild(browseSort);
    browseRowTop.appendChild(browseLimitLabel);
    browseRowTop.appendChild(browseApply);
    browseRowTop.appendChild(browseReset);
    browseRowTop.appendChild(browseExportCsv);

    const browseRowFilters = el('div', {class:'row', style:'flex-wrap:wrap;'});
    browseRowFilters.appendChild(richLexiconControl.wrap);
    function mkFilterCheck(key, labelText){
      const wrap = el('label', {class:'checkbox'});
      const inp = el('input', {type:'checkbox'});
      inp.checked = !!prefs[key];
      wrap.appendChild(inp);
      wrap.appendChild(document.createTextNode(labelText));
      return {wrap, inp};
    }

    const fMissingAny = mkFilterCheck('browseMissingAny', 'Missing Any Variation');
    const fMissingBracket = mkFilterCheck('browseMissingBracket', 'Missing Bracket Assist');
    const fMissingJust = mkFilterCheck('browseMissingJustPart', 'Missing Just-Part');
    const fOnlyBracket = mkFilterCheck('browseOnlyBracket', 'Only Bracket Assist');
    browseRowFilters.appendChild(fMissingAny.wrap);
    browseRowFilters.appendChild(fMissingBracket.wrap);
    browseRowFilters.appendChild(fMissingJust.wrap);
    browseRowFilters.appendChild(fOnlyBracket.wrap);

    const browseInfo = el('div', {class:'row', style:'flex-wrap:wrap;'});
    const browseWrap = el('div');

    browseCard.appendChild(browseRowTop);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseRowFilters);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseInfo);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseWrap);

    function _v4Flags(r){
    const vars = Array.isArray(r && r.vars) ? r.vars : [];
    const eng = Array.isArray(r && r.eng_variants) ? r.eng_variants : [];
    const bracketFromVars = vars.filter(v => v && String(v.bracket || '').trim());
    const justFromVars = vars.filter(v => v && String(v.just_part || '').trim());
    const hasBracket = (eng.length > 0) || (bracketFromVars.length > 0);
    const hasJustPart = (justFromVars.length > 0);
    const hasAny = hasBracket || hasJustPart;
    // bracket count prefers eng_variants (English Assist) if present; otherwise fall back to vars.bracket entries
    const bracketCount = eng.length > 0 ? eng.length : bracketFromVars.length;
    const bracketParenCount = eng.filter(x => {
      const t = String(x || '');
      return t.includes('(') || t.includes(')');
    }).length;
    const justCount = justFromVars.length;
    return {hasAny, hasBracket, hasJustPart, bracketCount, bracketParenCount, justCount};
  }

  function _v4GetBracketList(r){
    const eng = Array.isArray(r && r.eng_variants) ? r.eng_variants : [];
    const vars = Array.isArray(r && r.vars) ? r.vars : [];
    const fromVars = vars.map(v => v && v.bracket).filter(x => String(x || '').trim());
    const base = eng.length ? eng : fromVars;
    return uniquePreserveOrder(base.map(x => String(x || '').trim()).filter(Boolean));
  }

  function _v4GetJustPartList(r){
    const vars = Array.isArray(r && r.vars) ? r.vars : [];
    const base = vars.map(v => v && v.just_part).filter(x => String(x || '').trim());
    return uniquePreserveOrder(base.map(x => String(x || '').trim()).filter(Boolean));
  }

  function _v4PreviewList(list, max=3){
    const arr = Array.isArray(list) ? list : [];
    if(!arr.length) return '(none)';
    const head = arr.slice(0, max).join(' | ');
    if(arr.length > max) return head + ' +' + (arr.length - max);
    return head;
  }

    function _v4GlobalVariationStats(){
      const s = {total:0, hasAny:0, missingAny:0, missingBracket:0, missingJustPart:0, missingBothFields:0};
      for(const r of getRichLexiconRows()){
        s.total += 1;
        const f = _v4Flags(r);
        if(f.hasAny) s.hasAny += 1; else s.missingAny += 1;
        if(!f.hasBracket) s.missingBracket += 1;
        if(!f.hasJustPart) s.missingJustPart += 1;
        if(!f.hasBracket && !f.hasJustPart) s.missingBothFields += 1;
      }
      return s;
    }

    function drawBrowser(){
      const q = String(browseSearch.value || '').trim().toLowerCase();
      const missingAny = !!fMissingAny.inp.checked;
      const missingBracket = !!fMissingBracket.inp.checked;
      const missingJust = !!fMissingJust.inp.checked;
      const onlyBracket = !!fOnlyBracket.inp.checked;
      const sortMode = String(browseSort.value || 'id_desc');
      const limit = Math.max(10, Number(browseLimitInput.value || 300));

      prefs.browseMissingAny = missingAny;
      prefs.browseMissingBracket = missingBracket;
      prefs.browseMissingJustPart = missingJust;
      prefs.browseOnlyBracket = onlyBracket;
      prefs.browseSort = sortMode;
      prefs.browseLimit = limit;
      saveG2pV4LexiconPrefs(prefs);

      let rows = getRichLexiconRows().slice();

      if(q) rows = rows.filter(r => (r.unit_norm || '').includes(q));

      // missing filters (AND together)
      if(missingAny) rows = rows.filter(r => !_v4Flags(r).hasAny);
      if(missingBracket) rows = rows.filter(r => !_v4Flags(r).hasBracket);
      if(missingJust) rows = rows.filter(r => !_v4Flags(r).hasJustPart);
      if(onlyBracket) rows = rows.filter(r => _v4Flags(r).hasBracket);

      rows.sort((a,b)=>{
        const aid = Number(a.segment_id || 0);
        const bid = Number(b.segment_id || 0);
        const au = String(a.unit_norm || a.unit || '');
        const bu = String(b.unit_norm || b.unit || '');
        if(sortMode === 'id_asc') return aid - bid;
        if(sortMode === 'id_desc') return bid - aid;
        if(sortMode === 'bracket_desc') return _v4Flags(b).bracketCount - _v4Flags(a).bracketCount;
        if(sortMode === 'bracket_asc') return _v4Flags(a).bracketCount - _v4Flags(b).bracketCount;
        if(sortMode === 'unit_desc') return bu.localeCompare(au);
        return au.localeCompare(bu); // unit_asc
      });

      const global = _v4GlobalVariationStats();
      const shown = rows.slice(0, limit);

      let matchesMissingAny = 0;
      let matchesMissingBracket = 0;
      let matchesMissingJust = 0;
      for(const r of rows){
        const f = _v4Flags(r);
        if(!f.hasAny) matchesMissingAny += 1;
        if(!f.hasBracket) matchesMissingBracket += 1;
        if(!f.hasJustPart) matchesMissingJust += 1;
      }

      browseInfo.innerHTML = '';
      browseInfo.appendChild(el('span', {class:'tag'}, ['total: ' + global.total]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing any: ' + global.missingAny]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing bracket: ' + global.missingBracket]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing just-part: ' + global.missingJustPart]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches: ' + rows.length]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['shown: ' + shown.length]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing any: ' + matchesMissingAny]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing bracket: ' + matchesMissingBracket]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing just-part: ' + matchesMissingJust]));

      browseWrap.innerHTML = '';
      if(!shown.length){
        browseWrap.appendChild(el('p', {}, ['No segments match the current filters.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['ID']),
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['Phonetic']),
        el('th', {}, ['Bracket Variations']),
        el('th', {}, ['Just-Part Variations']),
        el('th', {}, ['Status'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');

      for(const r of shown){
        const f = _v4Flags(r);
        const tr = el('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', ()=>{
          input.value = r.unit || '';
        });

        tr.appendChild(el('td', {class:'mono'}, [String(r.segment_id ?? '')]));
        tr.appendChild(el('td', {class:'mono'}, [r.unit || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.ipa || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.phonetic || '']));
        const bracketVals = _v4GetBracketList(r);
        const justVals = _v4GetJustPartList(r);
        const bPreview = _v4PreviewList(bracketVals, 3);
        const jPreview = _v4PreviewList(justVals, 3);
        tr.appendChild(el('td', {class:'mono', title: bracketVals.join('\n')}, [bPreview]));
        tr.appendChild(el('td', {class:'mono', title: justVals.join('\n')}, [jPreview]));

        const statusCell = el('td');
        if(!f.hasAny){
          statusCell.appendChild(el('span', {class:'tag bad'}, ['missing all']));
        } else {
          if(!f.hasBracket) statusCell.appendChild(el('span', {class:'tag warn'}, ['no bracket']));
          if(!f.hasJustPart) statusCell.appendChild(el('span', {class:'tag warn'}, ['no just-part']));
          if(f.hasBracket && f.hasJustPart) statusCell.appendChild(el('span', {class:'tag good'}, ['ok']));
        }
        tr.appendChild(statusCell);

        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      browseWrap.appendChild(tbl);

      if(rows.length > shown.length){
        const moreRow = el('div', {class:'row', style:'margin-top:10px;'});
        const more = el('button', {class:'btn', type:'button'}, ['Load More']);
        more.addEventListener('click', ()=>{
          browseLimitInput.value = String(limit + 300);
          drawBrowser();
        });
        moreRow.appendChild(el('span', {class:'muted'}, ['More results exist.']));
        moreRow.appendChild(more);
        browseWrap.appendChild(moreRow);
      }
    }

    function exportBrowserCsv(){
      // export *filtered* full list (not limited)
      const q = String(browseSearch.value || '').trim().toLowerCase();
      const missingAny = !!fMissingAny.inp.checked;
      const missingBracket = !!fMissingBracket.inp.checked;
      const missingJust = !!fMissingJust.inp.checked;
      let rows = getRichLexiconRows().slice();
      const onlyBracket = !!fOnlyBracket.inp.checked;
      if(q) rows = rows.filter(r => (r.unit_norm || '').includes(q));
      if(missingAny) rows = rows.filter(r => !_v4Flags(r).hasAny);
      if(missingBracket) rows = rows.filter(r => !_v4Flags(r).hasBracket);
      if(missingJust) rows = rows.filter(r => !_v4Flags(r).hasJustPart);
      if(onlyBracket) rows = rows.filter(r => _v4Flags(r).hasBracket);

      const lines = [];
      lines.push(['segment_id','unit','proper_ipa','phonetic','bracket_variations','just_part_variations','has_bracket','has_just_part'].join(','));
      for(const r of rows){
        const f = _v4Flags(r);
        const safe = (v)=> ('"' + String(v ?? '').replaceAll('"','""') + '"');
        lines.push([
          safe(r.segment_id),
          safe(r.unit),
          safe(r.ipa),
          safe(r.phonetic),
          safe(f.bracketCount),
          safe(f.justCount),
          safe(f.hasBracket ? 'yes' : 'no'),
          safe(f.hasJustPart ? 'yes' : 'no')
        ].join(','));
      }
      const name = 'segmenter_v12_rich_lexicon_browser_' + new Date().toISOString().slice(0,19).replaceAll(':','') + '.csv';
      downloadText(name, lines.join('\n'), 'text/csv');
    }

    browseApply.addEventListener('click', drawBrowser);
    browseReset.addEventListener('click', ()=>{
      browseSearch.value = '';
      fMissingAny.inp.checked = false;
      fMissingBracket.inp.checked = false;
      fMissingJust.inp.checked = false;
      if(typeof fOnlyBracket !== 'undefined') fOnlyBracket.inp.checked = false;
      browseSort.value = 'id_desc';
      browseLimitInput.value = '300';
      drawBrowser();
    });
    browseExportCsv.addEventListener('click', exportBrowserCsv);
    browseSearch.addEventListener('input', ()=>{ drawBrowser(); });
    browseSort.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingAny.inp.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingBracket.inp.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingJust.inp.addEventListener('change', ()=>{ drawBrowser(); });
    if(typeof fOnlyBracket !== 'undefined') fOnlyBracket.inp.addEventListener('change', ()=>{ drawBrowser(); });
    browseLimitInput.addEventListener('change', ()=>{ drawBrowser(); });


    function drawLexicon(q){
      const s = (q || '').trim().toLowerCase();
      let rows = getPreferredLexiconRows();
      if(s){
        rows = rows.filter(r => (r.unit_norm || '').includes(s));
      }
      const total = rows.length;
      const shown = rows.slice(0, 80);
      lexInfo.innerHTML = '';
      lexInfo.appendChild(el('span', {class:'tag'}, [`matches: ${total}`]));
      lexInfo.appendChild(el('span', {class:'tag'}, [`shown: ${shown.length}`]));

      lexWrap.innerHTML = '';
      if(!shown.length){
        lexWrap.appendChild(el('p', {}, ['No matches.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['Unit Number'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');
      for(const r of shown){
        const tr = el('tr');
        tr.addEventListener('click', ()=>{
          // load unit into input as a quick way to test
          input.value = r.unit;
        });
        tr.appendChild(el('td', {class:'mono'}, [r.unit]));
        tr.appendChild(el('td', {class:'mono'}, [r.ipa]));
        tr.appendChild(el('td', {class:'mono'}, [String(r.unit_number ?? '')]));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      lexWrap.appendChild(tbl);
    }

    lexSearch.addEventListener('input', ()=> drawLexicon(lexSearch.value));

    function drawHistory(){
      const items = loadG2pHistory();
      historyWrap.innerHTML = '';

      if(!items.length){
        historyWrap.appendChild(el('p', {}, ['No history yet. Segment and map a word to add it here.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Time']),
        el('th', {}, ['Word']),
        el('th', {}, ['Segments']),
        el('th', {}, ['IPA']),
        el('th', {}, ['Rules'])
      ]));
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for(const item of items){
        const tr = el('tr');
        tr.addEventListener('click', ()=>{
          input.value = item.word;
          runBtn.click();
        });

        const dt = item.ts ? new Date(item.ts) : null;
        tr.appendChild(el('td', {}, [dt ? dt.toLocaleString() : '']));
        tr.appendChild(el('td', {class:'mono'}, [item.word || '']));
        tr.appendChild(el('td', {class:'mono'}, [segmentsToString(item.segments || [])]));
        tr.appendChild(el('td', {class:'mono'}, [String(item.ipa || '')]));

        const rulesCell = el('td');
        rulesCell.appendChild(renderRulePills(item.ruleIds || [], {max: 8}));
        tr.appendChild(rulesCell);

        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      historyWrap.appendChild(tbl);
    }

    runBtn.addEventListener('click', ()=>{
      const word = normalizeWord(input.value);
      if(!word){
        outWrap.innerHTML = `<div class="card"><span class="tag bad">Empty</span> <span class="muted">Enter a word</span></div>`;
        return;
      }

      const res = segmentWordCore(word, { trace: traceInput.checked });
      const segs = res.segments || [];

      // Build per-segment matches
      const ipaParts = [];
      const rows = [];

      for(const seg of segs){
        const matches = getLexiconMatches(seg);
        const chosen = chooseDefaultMatch(matches);
        const ipa = chosen ? chosen.ipa : '';
        if(ipa) ipaParts.push(ipa);

        rows.push({
          segment: seg,
          matches,
          chosenUnit: chosen ? chosen.unit : '',
          chosenIpa: ipa,
          chosenNumber: chosen ? chosen.unit_number : null,
          status: chosen ? (matches.length > 1 ? 'multi' : 'match') : 'missing'
        });
      }

      const ipa = joinIpa(ipaParts, prefs.joinMode);

      // Render
      let htmlOut = '';
      htmlOut += `<div class="card">`;
      htmlOut += `<div class="row"><span class="tag">word: ${escapeHtml(res.word)}</span><span class="tag">segments: ${segs.length}</span></div>`;
      htmlOut += `<div class="twoCol" style="margin-top:10px;">`;
      htmlOut += `<div><h3>Segments</h3><pre>${escapeHtml(segmentsToString(segs))}</pre></div>`;
      htmlOut += `<div><h3>IPA Output</h3><pre id="ipaOutput">${escapeHtml(ipa)}</pre></div>`;
      htmlOut += `</div>`;

      htmlOut += `<input id="ipaPartsJson" class="hidden" value='${escapeHtml(JSON.stringify(ipaParts))}' />`;

      htmlOut += `<div class="row" style="margin-top:10px;">`;
      htmlOut += `<button class="btn" type="button" id="btnCopyIpa">Copy IPA</button>`;
      htmlOut += `<button class="btn" type="button" id="btnDownloadG2p">Download G2P JSON</button>`;
      htmlOut += `</div>`;

      htmlOut += `<h3>Segment To IPA Mapping</h3>`;
      htmlOut += `<table><thead><tr><th>Segment</th><th>Status</th><th>Unit</th><th>Proper IPA</th><th>Unit Number</th><th>Matches</th></tr></thead><tbody>`;
      for(let i=0;i<rows.length;i++){
        const r = rows[i];
        const statusTag = r.status==='match' ? 'good' : (r.status==='multi' ? 'warn' : 'bad');
        const matchCount = r.matches.length;
        htmlOut += `<tr>`;
        htmlOut += `<td class="mono">${escapeHtml(r.segment)}</td>`;
        htmlOut += `<td><span class="tag ${statusTag}">${escapeHtml(r.status)}</span></td>`;
        htmlOut += `<td class="mono">${escapeHtml(r.chosenUnit || '')}</td>`;
        htmlOut += `<td class="mono">${escapeHtml(r.chosenIpa || '')}</td>`;
        htmlOut += `<td class="mono">${escapeHtml(r.chosenNumber == null ? '' : String(r.chosenNumber))}</td>`;
        if(matchCount <= 1){
          htmlOut += `<td class="mono">${matchCount}</td>`;
        } else {
          // Provide a select for multiple matches
      htmlOut += `<td><select data-idx="${i}" class="g2pSelect" style="width:100%; background:var(--surfaceInput); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:8px 8px;">`;
          for(const m of r.matches){
            const label = `${m.unit_number ?? ''}  ${m.ipa}`.trim();
            htmlOut += `<option value="${escapeHtml(String(m.unit_number ?? ''))}">${escapeHtml(label)}</option>`;
          }
          htmlOut += `</select></td>`;
        }
        htmlOut += `</tr>`;
      }
      htmlOut += `</tbody></table>`;

      htmlOut += `<h3>Rules Used</h3><div id="g2pRulePills"></div>`;
      htmlOut += `</div>`;

      if(traceInput.checked){
        const trace = res.trace || [];
        htmlOut += `<div class="card"><h3>Trace</h3>`;
        if(!trace.length){ htmlOut += `<p>No trace recorded.</p>`; }
        else {
          htmlOut += `<table><thead><tr><th>Step</th><th>Fields</th></tr></thead><tbody>`;
          for(const step of trace){
            const fields = Object.entries(step)
              .filter(([k])=>k !== 'step')
              .map(([k,v])=>`${escapeHtml(k)}: ${escapeHtml(typeof v === 'string' ? v : JSON.stringify(v))}`)
              .join('<br>');
            htmlOut += `<tr><td><code>${escapeHtml(step.step || '')}</code></td><td>${fields}</td></tr>`;
          }
          htmlOut += `</tbody></table>`;
        }
        htmlOut += `</div>`;
      }

      outWrap.innerHTML = htmlOut;

      // Fill pills
      const pillHolder = outWrap.querySelector('#g2pRulePills');
      if(pillHolder){
        pillHolder.appendChild(renderRulePills(res.ruleIds || [], {max: 16}));
      }

      // Copy and download handlers
      const btnCopy = outWrap.querySelector('#btnCopyIpa');
      if(btnCopy){
        btnCopy.addEventListener('click', ()=>{
          const ipaText = outWrap.querySelector('#ipaOutput') ? outWrap.querySelector('#ipaOutput').textContent : ipa;
          if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(ipaText || '');
          }
        });
      }

      const btnDl = outWrap.querySelector('#btnDownloadG2p');
      if(btnDl){
        btnDl.addEventListener('click', ()=>{
          const payload = {
            word: res.word,
            segments: segs,
            ipaSegments: ipaParts,
            ipa,
            joinMode: prefs.joinMode,
            mapping: rows.map(r => ({segment:r.segment, unit:r.chosenUnit, ipa:r.chosenIpa, unit_number:r.chosenNumber, match_count:r.matches.length, status:r.status})),
            ruleIds: res.ruleIds
          };
          downloadText('segmenter_v12_g2p_result.json', JSON.stringify(payload, null, 2), 'application/json');
        });
      }

      // Multi match selects update IPA output
      const selects = outWrap.querySelectorAll('.g2pSelect');
      if(selects && selects.length){
        selects.forEach(sel => {
          sel.addEventListener('change', ()=>{
            const idx = parseInt(sel.getAttribute('data-idx')||'0', 10);
            const unitNumStr = sel.value;
            const r = rows[idx];
            if(!r || !r.matches || !r.matches.length) return;
            const chosen = r.matches.find(m => String(m.unit_number ?? '') === unitNumStr) || r.matches[0];
            r.chosenUnit = chosen.unit;
            r.chosenIpa = chosen.ipa;
            r.chosenNumber = chosen.unit_number;
            // recompute IPA
            const newParts = rows.map(rr => rr.chosenIpa).filter(Boolean);
            const newIpa = joinIpa(newParts, prefs.joinMode);
            const ipaEl = outWrap.querySelector('#ipaOutput');
            if(ipaEl) ipaEl.textContent = newIpa;
            const partsRaw = outWrap.querySelector('#ipaPartsJson');
            if(partsRaw) partsRaw.value = JSON.stringify(newParts);
          });
        });
      }

      addG2pHistoryEntry({
        ts: new Date().toISOString(),
        word: res.word,
        segments: segs,
        ipa,
        ipaSegments: ipaParts,
        joinMode: prefs.joinMode,
        mapping: rows.map(r => ({segment:r.segment, unit:r.chosenUnit, ipa:r.chosenIpa, unit_number:r.chosenNumber, match_count:r.matches.length, status:r.status})),
        ruleIds: res.ruleIds
      });

      drawHistory();
    });

    root.appendChild(historyCard);
    root.appendChild(lexCard);

    drawHistory();
    drawLexicon('');
    drawBrowser();
  }

