// Extracted Stage 4: speech I/O surfaces (AWS TTS, IPA lookup, STT).
// Depends on app_shared.js, segmenter_core.js, segmenter_rules_ui.js, regression_tools.js, g2p_v4_lexicon.js, and g2p_tools.js.

  function defaultG2pAwsTtsPrefs(){
    return {
      inputMode: 'text',
      joinMode: 'dot',
      outputMode: 'phoneme',
      mixedWrap: {},
wrapSpeak: true,
      emptyPhonemeBody: true,
      preservePunct: true,
      splitHyphen: true,
      trimNonFinalH: false,
      autoDetectAmbiguousInfluence: 1,
      autoDetectParticleInfluence: 1,
      ssmlCompactEnabled: false,
      ssmlCompactSplitSentence: true,
      ssmlCompactSplitNewline: true,
      ssmlCompactSplitSpace: false,
      ssmlCompactEnsureSpace: true,
      ssmlCompactTeReoBlocksOnly: false,
      ssmlCompactIpaOnly: false,
      ssmlCompactEmptyBody: true,
      strictMissing: false,
      showTrace: true,
      serviceRegion: 'australiaeast',
      awsRegion: 'ap-southeast-2',
      voiceId: 'Aria',
      engine: 'neural',
      languageCode: 'en-NZ',
      outputFormat: 'mp3'
    };
  }

  function loadG2pAwsTtsPrefs(){
    const base = defaultG2pAwsTtsPrefs();
    const raw = loadFromStorage(STORAGE_KEYS.g2pAwsTtsPrefs);
    const parsed = raw ? safeJsonParse(raw) : {ok:false};
    if(parsed.ok && parsed.value && typeof parsed.value === 'object') return {...base, ...parsed.value};
    return base;
  }

  function saveG2pAwsTtsPrefs(prefs){
    return saveToStorage(STORAGE_KEYS.g2pAwsTtsPrefs, JSON.stringify(prefs || {}, null, 2));
  }

  function loadG2pAwsTtsCreds(){
    const raw = loadFromStorage(STORAGE_KEYS.g2pAwsTtsCreds);
    if(!raw) return {remember:false};
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !parsed.value || typeof parsed.value !== 'object') return {remember:false};
    return parsed.value;
  }

  function saveG2pAwsTtsCreds(creds){
    return saveToStorage(STORAGE_KEYS.g2pAwsTtsCreds, JSON.stringify(creds || {}, null, 2));
  }

  function loadG2pAwsTtsHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.g2pAwsTtsHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveG2pAwsTtsHistory(items){
    return saveToStorage(STORAGE_KEYS.g2pAwsTtsHistory, JSON.stringify(items || [], null, 2));
  }

  function addG2pAwsTtsHistoryEntry(entry){
    const items = loadG2pAwsTtsHistory();
    const sig = `${entry.inputMode}::${entry.inputText || ''}::${entry.joinMode || ''}::${entry.ssml || ''}`;
    const filtered = items.filter(x => `${x.inputMode}::${x.inputText || ''}::${x.joinMode || ''}::${x.ssml || ''}` !== sig);
    filtered.unshift(entry);
    saveG2pAwsTtsHistory(filtered.slice(0, 200));
  }

function renderG2PAwsTts(){
    const root = document.getElementById('pageG2PAwsTts');
    root.innerHTML = '';

    // Export naming (use first two mapped words)
    let lastExportStem = 'g2p_aws_tts';
    let lastAudioBlob = null;

    function _g2pAwsTtsSafeStemPart(s){
      let x = String(s || '').trim();
      x = x.replace(/\s+/g, '_');
      x = x.replace(/[^0-9A-Za-zĀāĒēĪīŌōŪū_-]+/g, '');
      x = x.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      return x;
    }

    function _g2pAwsTtsExportStemFromWords(words){
      const parts = [];
      for(const w of (words || [])){
        const p = _g2pAwsTtsSafeStemPart(w);
        if(p) parts.push(p);
        if(parts.length >= 2) break;
      }
      if(!parts.length) return 'g2p_aws_tts';
      return parts.join('_').toLowerCase();
    }

    function _g2pAwsTtsExtractFirstWords(mode, text){
      const t = String(text || '').trim();
      if(!t) return [];
      if(mode === 'list'){
        const words = t.split(/[\n\r\t,;]+/g).map(x=>x.trim()).filter(Boolean);
        return words.slice(0, 2);
      }
      if(mode === 'single'){
        return [t];
      }
      // text block
      const reWord = /[A-Za-zĀāĒēĪīŌōŪū]+(?:-[A-Za-zĀāĒēĪīŌōŪū]+)*/g;
      const matches = t.match(reWord) || [];
      return matches.slice(0, 2);
    }

    function _g2pAwsTtsSetStemFromInput(mode, text){
      const words = _g2pAwsTtsExtractFirstWords(mode, text);
      const base = _g2pAwsTtsExportStemFromWords(words);
      lastExportStem = (base === 'g2p_aws_tts') ? 'g2p_aws_tts' : ('g2p_aws_tts_' + base);
      lastExportStem = lastExportStem.replace(/_+/g, '_');
    }


    function _g2pAwsTtsSetStemFromMapped(mapped){
      const words = [];
      for(const r of (mapped || [])){
        const w = (r && r.word != null) ? String(r.word) : '';
        if(w) words.push(w);
        if(words.length >= 2) break;
      }
      const base = _g2pAwsTtsExportStemFromWords(words);
      lastExportStem = (base === 'g2p_aws_tts') ? 'g2p_aws_tts' : ('g2p_aws_tts_' + base);
      lastExportStem = lastExportStem.replace(/_+/g, '_');
    }

    function _g2pAwsTtsDownloadBlob(filename, blob){
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1200);
    }


    const prefs = loadG2pAwsTtsPrefs();

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['G2P - AWS TTS']));
    card.appendChild(el('p', {}, ['Segment words using v12, map segments to IPA using the selected lexicon source, then output an AWS Polly SSML speak block with one phoneme block per word or per part for multi part input.']));
    const baseLexiconControl = buildLexiconSourceControl('base', ()=>{ renderG2PAwsTts(); }, 'AWS TTS lexicon source');
    card.appendChild(baseLexiconControl.wrap);

    const modeSelect = el('select', {class:'btn', title:'Input mode'});
    modeSelect.style.padding = '8px 10px';
    modeSelect.style.borderRadius = '10px';
    modeSelect.style.background = 'var(--surfaceStrong)';
    modeSelect.style.border = '1px solid var(--border)';
    modeSelect.style.color = 'var(--text)';

    const modeOpts = [
      {v:'text', t:'Input: Text Block'},
      {v:'list', t:'Input: Word List'},
      {v:'single', t:'Input: Single Word'}
    ];
    for(const opt of modeOpts){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.inputMode || 'text')) o.selected = true;
      modeSelect.appendChild(o);
    }

    const input = el('textarea', {rows:'5', placeholder:'Enter text, words, or a single word. Example: Kohitātea, Huitānguru'});
    input.value = prefs.lastInputText || '';
    input.addEventListener('input', ()=>{
      saveG2pAwsTtsPrefs({...loadG2pAwsTtsPrefs(), lastInputText: input.value});
    });

    // Expose for IPA keyboard tab and inserters
    APP_SHARED.awsTtsInputEl = input;

    const joinSelect = el('select', {class:'btn', title:'IPA join style'});
    joinSelect.style.padding = '8px 10px';
    joinSelect.style.borderRadius = '10px';
    joinSelect.style.background = 'var(--surfaceStrong)';
    joinSelect.style.border = '1px solid var(--border)';
    joinSelect.style.color = 'var(--text)';

    const joinOptions = [
      {v:'dot', t:'IPA Join: dot'},
      {v:'space', t:'IPA Join: space'},
      {v:'none', t:'IPA Join: none'}
    ];
    for(const opt of joinOptions){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.joinMode || 'dot')) o.selected = true;
      joinSelect.appendChild(o);
    }



    const outputModeSelect = el('select', {class:'btn', title:'SSML output mode'});
    outputModeSelect.style.padding = '8px 10px';
    outputModeSelect.style.borderRadius = '10px';
    outputModeSelect.style.background = 'var(--surfaceStrong)';
    outputModeSelect.style.border = '1px solid var(--border)';
    outputModeSelect.style.color = 'var(--text)';

    const outModeOptions = [
      {v:'phoneme', t:'Output: Phoneme (Wrap All)'},
      {v:'plain', t:'Output: Plain Speak (No Phoneme)'},
      {v:'mixedAuto', t:'Output: Mixed (Auto Detect Te Reo)'},
      {v:'mixed', t:'Output: Mixed (Select Words)'}
    ];
    for(const opt of outModeOptions){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.outputMode || 'phoneme')) o.selected = true;
      outputModeSelect.appendChild(o);
    }

    let mixedWrap = Object.assign({}, (prefs.mixedWrap || {}));

    // Auto-detect manual overrides (per-token occurrence, including duplicates)
    const AUTO_DETECT_STATE = {
      lastHash: null,
      overrides: {},   // key -> boolean
      selectedKey: null
    };

    function autoDetectHash(){
      return JSON.stringify({
        inputMode: (modeSelect && modeSelect.value) || '',
        raw: String((input && input.value) || ''),
        splitHyphen: !!(hyphenInput && hyphenInput.checked),
        preservePunct: !!(punctInput && punctInput.checked)
      });
    }

    function autoGetOverride(key){
      if(!key) return null;
      return Object.prototype.hasOwnProperty.call(AUTO_DETECT_STATE.overrides, key)
        ? !!AUTO_DETECT_STATE.overrides[key]
        : null;
    }

    function autoSetOverride(key, val){
      if(!key) return;
      AUTO_DETECT_STATE.overrides[key] = !!val;
    }

    function autoOverrideCount(){
      try { return Object.keys(AUTO_DETECT_STATE.overrides || {}).length; } catch(e){ return 0; }
    }



    const speakCheck = el('label', {class:'checkbox'});
    const speakInput = el('input', {type:'checkbox'});
    speakInput.checked = !!prefs.wrapSpeak;
    speakCheck.appendChild(speakInput);
    speakCheck.appendChild(document.createTextNode('Wrap In <speak>'));

    const emptyBodyCheck = el('label', {class:'checkbox'});
    const emptyBodyInput = el('input', {type:'checkbox'});
    emptyBodyInput.checked = !!prefs.emptyPhonemeBody;
    emptyBodyCheck.appendChild(emptyBodyInput);
    emptyBodyCheck.appendChild(document.createTextNode('Empty Phoneme Body'));

    const punctCheck = el('label', {class:'checkbox'});
    const punctInput = el('input', {type:'checkbox'});
    punctInput.checked = !!prefs.preservePunct;
    punctCheck.appendChild(punctInput);
    punctCheck.appendChild(document.createTextNode('Preserve Punctuation'));

    const hyphenCheck = el('label', {class:'checkbox'});
    const hyphenInput = el('input', {type:'checkbox'});
    hyphenInput.checked = !!prefs.splitHyphen;
    hyphenCheck.appendChild(hyphenInput);
    hyphenCheck.appendChild(document.createTextNode('Split Hyphen Parts'));

    const trimNonFinalHCheck = el('label', {class:'checkbox'});
    const trimNonFinalHInput = el('input', {type:'checkbox'});
    trimNonFinalHInput.checked = !!prefs.trimNonFinalH;
    trimNonFinalHCheck.appendChild(trimNonFinalHInput);
    trimNonFinalHCheck.appendChild(document.createTextNode('Trim Non Final IPA h'));

    const strictCheck = el('label', {class:'checkbox'});
    const strictInput = el('input', {type:'checkbox'});
    strictInput.checked = !!prefs.strictMissing;
    strictCheck.appendChild(strictInput);
    strictCheck.appendChild(document.createTextNode('Strict Missing'));

    const traceCheck = el('label', {class:'checkbox'});
    const traceInput = el('input', {type:'checkbox'});
    traceInput.checked = !!prefs.showTrace;
    traceCheck.appendChild(traceInput);
    traceCheck.appendChild(document.createTextNode('Show Trace'));

    const btnGenerate = el('button', {class:'btn primary', type:'button'}, ['Generate SSML']);

    const controls = el('div', {class:'row'});
    controls.appendChild(modeSelect);
    controls.appendChild(joinSelect);
    controls.appendChild(outputModeSelect);
    controls.appendChild(speakCheck);
    controls.appendChild(emptyBodyCheck);
    controls.appendChild(punctCheck);
    controls.appendChild(hyphenCheck);
    controls.appendChild(trimNonFinalHCheck);
    controls.appendChild(strictCheck);
    controls.appendChild(traceCheck);
    controls.appendChild(btnGenerate);

    card.appendChild(input);


    // Inserters: AWS SSML tags and IPA symbols
    const inserter = el('div', {style:'margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:12px;'});
    inserter.appendChild(el('h3', {}, ['Insert SSML Tags And IPA Symbols']));
    inserter.appendChild(el('p', {style:'margin-top:6px;'}, ['Choose a target then insert AWS Polly compatible SSML tags or IPA symbols at the cursor.']));

    const targetRow = el('div', {class:'row'});
    const targetSelect = el('select', {class:'btn', title:'Insert target'});
    targetSelect.style.padding = '8px 10px';
    targetSelect.style.borderRadius = '10px';
    targetSelect.style.background = 'var(--surfaceStrong)';
    targetSelect.style.border = '1px solid var(--border)';
    targetSelect.style.color = 'var(--text)';

    const targetOpts = [
      {v:'active', t:'Target: Active Field'},
      {v:'awsInput', t:'Target: AWS TTS Input'},
      {v:'awsSsml', t:'Target: SSML Output'}
    ];
    for(const opt of targetOpts){
      targetSelect.appendChild(el('option', {value: opt.v}, [opt.t]));
    }
    targetRow.appendChild(targetSelect);

    const activeNote = el('div', {class:'tag', style:'align-self:center; opacity:.9;'}, ['Active Field: none']);
    targetRow.appendChild(activeNote);

    inserter.appendChild(targetRow);

    function getInsertTarget(){
      const v = targetSelect.value;
      if(v === 'awsInput') return APP_SHARED.awsTtsInputEl || null;
      if(v === 'awsSsml') return APP_SHARED.awsTtsSsmlEl || null;
      return APP_SHARED.lastFocused || null;
    }

    function refreshActiveNote(){
      const elx = APP_SHARED.lastFocused;
      if(!elx) { activeNote.textContent = 'Active Field: none'; return; }
      const tag = (elx.tagName || '').toLowerCase();
      const id = elx.id ? `#${elx.id}` : '';
      activeNote.textContent = `Active Field: ${tag}${id}`;
    }
    refreshActiveNote();
    APP_SHARED.onFocus = refreshActiveNote;

    const ssmlRow = el('div', {class:'row', style:'margin-top:10px;'});
    const ssmlSelect = el('select', {class:'btn', title:'SSML tag'});
    ssmlSelect.style.padding = '8px 10px';
    ssmlSelect.style.borderRadius = '10px';
    ssmlSelect.style.background = 'var(--surfaceStrong)';
    ssmlSelect.style.border = '1px solid var(--border)';
    ssmlSelect.style.color = 'var(--text)';

    const ssmlTemplates = [
      {t:'<break time="500ms"/>', kind:'insert', label:'Break 500ms'},
      {t:'<break strength="medium"/>', kind:'insert', label:'Break Medium'},
      {before:'<prosody rate="slow">', after:'</prosody>', kind:'wrap', label:'Prosody Rate Slow'},
      {before:'<prosody pitch="+10%">', after:'</prosody>', kind:'wrap', label:'Prosody Pitch +10%'},
      {before:'<emphasis level="strong">', after:'</emphasis>', kind:'wrap', label:'Emphasis Strong'},
      {before:'<amazon:effect name="drc">', after:'</amazon:effect>', kind:'wrap', label:'Amazon Effect DRC'},
      {before:'<say-as interpret-as="characters">', after:'</say-as>', kind:'wrap', label:'Say As Characters'},
      {before:'<lang xml:lang="en-NZ">', after:'</lang>', kind:'wrap', label:'Lang en-NZ'},
      {before:'<phoneme alphabet="ipa" ph="">', after:'</phoneme>', kind:'wrap', label:'Phoneme IPA Tag'}
    ];
    for(const tpl of ssmlTemplates){
      ssmlSelect.appendChild(el('option', {value: tpl.label}, [tpl.label]));
    }
    const btnInsertSsml = el('button', {class:'btn', type:'button'}, ['Insert SSML']);
    btnInsertSsml.onclick = ()=>{
      const target = getInsertTarget();
      const label = ssmlSelect.value;
      const tpl = ssmlTemplates.find(x=>x.label === label);
      if(!tpl) return;
      if(tpl.kind === 'wrap') wrapSelectionText(target, tpl.before, tpl.after);
      else insertAtCursorText(target, tpl.t);
    };
    ssmlRow.appendChild(ssmlSelect);
    ssmlRow.appendChild(btnInsertSsml);
    inserter.appendChild(ssmlRow);

    const symWrap = el('div', {style:'margin-top:10px;'});
    symWrap.appendChild(el('label', {}, ['IPA Symbol Keyboard']));
    const symFilter = el('input', {type:'text', placeholder:'Filter symbols like stress, long, ə, ŋ'});
    symFilter.style.marginTop = '6px';
    symFilter.style.width = '100%';
    symFilter.style.padding = '10px';
    symFilter.style.borderRadius = '12px';
    symFilter.style.border = '1px solid var(--border)';
    symFilter.style.background = 'var(--surfaceTable)';
    symFilter.style.color = 'var(--text)';

    const symSelect = el('select', {size:'8', style:'width:100%; margin-top:8px; max-height:220px; overflow:auto;'});
    symSelect.innerHTML = IPA_SYMBOL_OPTIONS_HTML;

    const btnInsertSym = el('button', {class:'btn', type:'button', style:'margin-top:8px;'}, ['Insert Symbol']);
    btnInsertSym.onclick = ()=>{
      const opt = symSelect.options[symSelect.selectedIndex];
      if(!opt) return;
      const symbol = opt.value || opt.textContent.split(' - ')[0];
      insertAtCursorText(getInsertTarget(), symbol);
    };

    symFilter.addEventListener('input', ()=>{
      const q = (symFilter.value || '').trim().toLowerCase();
      for(const opt of Array.from(symSelect.options)){
        const txt = (opt.textContent || '').toLowerCase();
        opt.hidden = q ? !txt.includes(q) : false;
      }
    });

    symWrap.appendChild(symFilter);
    symWrap.appendChild(symSelect);
    symWrap.appendChild(btnInsertSym);
    inserter.appendChild(symWrap);

    card.appendChild(inserter);

    card.appendChild(el('div', {style:'margin-top:10px;'}));
    card.appendChild(controls);
    root.appendChild(card);



    const mixedPanel = el('div', {style:'margin-top:12px; padding:10px; border:1px solid var(--border); border-radius:12px; display:none;'});
    mixedPanel.appendChild(el('h3', {}, ['Mixed Wrap Selection']));
    mixedPanel.appendChild(el('p', {style:'margin-top:6px;'}, ['Choose which words (or hyphen parts) should be wrapped in <phoneme> tags. Unchecked words are left as plain text inside <speak>.']));

    const mixedBtns = el('div', {class:'row'});
    const btnMixedAll = el('button', {class:'btn', type:'button'}, ['Wrap All']);
    const btnMixedNone = el('button', {class:'btn', type:'button'}, ['Wrap None']);
    const btnMixedInvert = el('button', {class:'btn', type:'button'}, ['Invert']);
    const btnMixedRefresh = el('button', {class:'btn', type:'button'}, ['Refresh List']);
    const mixedFilter = el('input', {type:'text', placeholder:'Filter words...', style:'min-width:220px;'});
    mixedBtns.appendChild(btnMixedAll);
    mixedBtns.appendChild(btnMixedNone);
    mixedBtns.appendChild(btnMixedInvert);
    mixedBtns.appendChild(btnMixedRefresh);
    mixedBtns.appendChild(mixedFilter);

    const mixedList = el('div', {style:'margin-top:10px; max-height:240px; overflow:auto; padding:8px; border:1px solid var(--border); border-radius:10px;'});
    mixedPanel.appendChild(mixedBtns);
    mixedPanel.appendChild(mixedList);

    card.appendChild(mixedPanel);

    // Auto detect Te Reo panel for Mixed Auto mode
    const autoPanel = el('div', {style:'margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:12px; display:none;'});
    autoPanel.appendChild(el('h3', {}, ['Auto Detect Te Reo']));
    autoPanel.appendChild(el('p', {style:'margin-top:6px;'}, ['When Output Mode is set to Mixed (Auto Detect Te Reo), likely te reo Māori tokens are wrapped in <phoneme> tags and other tokens remain plain text inside <speak>.']));

    const autoTopRow = el('div', {class:'row'});
    const autoThrLabel = el('span', {class:'tag'}, ['Token threshold: 75%']);
    const autoThr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:String((loadG2pAwsTtsPrefs().autoDetectThreshold != null ? loadG2pAwsTtsPrefs().autoDetectThreshold : 0.75)), style:'width:220px;'});
    autoThr.addEventListener('input', ()=>{ autoThrLabel.textContent = 'Token threshold: ' + Math.round(parseFloat(autoThr.value)*100) + '%'; scheduleAutoDetect(); });
    autoThrLabel.textContent = 'Token threshold: ' + Math.round(parseFloat(autoThr.value)*100) + '%';

    const autoDebugCheck = el('label', {class:'checkbox'});
    const autoDebugInput = el('input', {type:'checkbox'});
    autoDebugInput.checked = !!(loadG2pAwsTtsPrefs().autoDetectShowDebug);
    autoDebugInput.addEventListener('change', ()=>{ saveG2pAwsTtsPrefs({...loadG2pAwsTtsPrefs(), autoDetectShowDebug: !!autoDebugInput.checked}); scheduleAutoDetect(); });
    autoDebugCheck.appendChild(autoDebugInput);
    autoDebugCheck.appendChild(document.createTextNode('Show Debug'));

    autoTopRow.appendChild(autoThrLabel);
    autoTopRow.appendChild(autoThr);
    autoTopRow.appendChild(autoDebugCheck);

    const autoOverrideTag = el('span', {class:'tag', id:'autoOverrideTag'}, ['Overrides: 0']);
    const btnAutoResetOverrides = el('button', {class:'btn', type:'button', title:'Clear manual include and exclude toggles for auto-detected tokens.'}, ['Reset Overrides']);
    btnAutoResetOverrides.addEventListener('click', ()=>{
      AUTO_DETECT_STATE.overrides = {};
      AUTO_DETECT_STATE.selectedKey = null;
      scheduleAutoDetect();
    });

    autoTopRow.appendChild(autoOverrideTag);
    autoTopRow.appendChild(btnAutoResetOverrides);


    const autoSummary = el('div', {style:'margin-top:10px;'});
    const autoSummaryLine = el('div', {class:'muted'}, ['Included tokens show a subtle dot. Click a token to inspect details. Shift-click a token to toggle processing for that token. Manual overrides show ↻.']);
    autoSummary.appendChild(autoSummaryLine);

    const autoHlTitle = el('div', {class:'muted', style:'margin-top:10px;'}, ['Highlighted Text']);
    const autoHl = el('div', {class:'hlText', style:'margin-top:6px;'});
    const autoBlocksTitle = el('div', {class:'muted', style:'margin-top:12px;'}, ['Detected Blocks']);
    const autoBlocks = el('div', {style:'margin-top:6px; display:flex; flex-wrap:wrap; gap:8px;'});
    const autoWordTitle = el('div', {class:'muted', style:'margin-top:12px;'}, ['Word Details']);
    const autoWordWrap = el('div', {style:'margin-top:6px; overflow:auto;'});
    const autoTbl = el('table', {class:'tbl'});
    autoWordWrap.appendChild(autoTbl);
    const autoSelTitle = el('div', {class:'muted', style:'margin-top:12px;'}, ['Selected Word']);
    const autoSel = el('div', {style:'margin-top:6px;'});

    autoPanel.appendChild(autoTopRow);
    autoPanel.appendChild(autoSummary);
    autoPanel.appendChild(autoHlTitle);
    autoPanel.appendChild(autoHl);
    autoPanel.appendChild(autoBlocksTitle);
    autoPanel.appendChild(autoBlocks);
    autoPanel.appendChild(autoWordTitle);
    autoPanel.appendChild(autoWordWrap);
    autoPanel.appendChild(autoSelTitle);
    autoPanel.appendChild(autoSel);

    card.appendChild(autoPanel);

    const tokenListsCard = el('div', {class:'card'});
    tokenListsCard.appendChild(el('h2', {}, ['Token Lists (Editable)']));
    tokenListsCard.appendChild(el('p', {class:'muted'}, ['Edit ambiguous and particle tokens used by Auto Detect Te Reo. Use commas or new lines.']));

    const tokenEditors = el('div', {class:'listEditor'});
    const tokenAmbArea = el('textarea', {spellcheck:'false'});
    tokenAmbArea.value = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens).join(', ');
    const tokenPartArea = el('textarea', {spellcheck:'false'});
    tokenPartArea.value = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens).join(', ');

    const tokenAmbBox = el('div', {class:'card', style:'padding:12px; margin:0;'});
    tokenAmbBox.appendChild(el('h3', {}, ['Ambiguous Tokens']));
    tokenAmbBox.appendChild(el('p', {class:'muted'}, ['Example: to, he, me']));
    tokenAmbBox.appendChild(tokenAmbArea);

    const tokenPartBox = el('div', {class:'card', style:'padding:12px; margin:0;'});
    tokenPartBox.appendChild(el('h3', {}, ['Particle Tokens']));
    tokenPartBox.appendChild(el('p', {class:'muted'}, ['Particles start medium-high (te is medium-high) then context adjusts.']));
    tokenPartBox.appendChild(tokenPartArea);

    tokenEditors.appendChild(tokenAmbBox);
    tokenEditors.appendChild(tokenPartBox);
    tokenListsCard.appendChild(tokenEditors);

    const detectInfluencePrefs = loadG2pAwsTtsPrefs();
    const influenceRow = el('div', {class:'row', style:'margin-top:10px; gap:12px; flex-wrap:wrap;'});
    const ambInfluenceWrap = el('div', {style:'min-width:260px;'});
    const ambInfluenceTag = el('span', {class:'tag'}, ['Ambiguous Influence: ' + (((detectInfluencePrefs.autoDetectAmbiguousInfluence ?? 1) * 100).toFixed(0)) + '%']);
    const ambInfluenceInput = el('input', {type:'range', min:'0', max:'2', step:'0.05', value:String(detectInfluencePrefs.autoDetectAmbiguousInfluence ?? 1), style:'width:240px;'});
    ambInfluenceWrap.appendChild(ambInfluenceTag);
    ambInfluenceWrap.appendChild(ambInfluenceInput);

    const particleInfluenceWrap = el('div', {style:'min-width:260px;'});
    const particleInfluenceTag = el('span', {class:'tag'}, ['Particle Influence: ' + (((detectInfluencePrefs.autoDetectParticleInfluence ?? 1) * 100).toFixed(0)) + '%']);
    const particleInfluenceInput = el('input', {type:'range', min:'0', max:'2', step:'0.05', value:String(detectInfluencePrefs.autoDetectParticleInfluence ?? 1), style:'width:240px;'});
    particleInfluenceWrap.appendChild(particleInfluenceTag);
    particleInfluenceWrap.appendChild(particleInfluenceInput);

    influenceRow.appendChild(ambInfluenceWrap);
    influenceRow.appendChild(particleInfluenceWrap);
    tokenListsCard.appendChild(influenceRow);

    const tokenBtnRow = el('div', {class:'row', style:'margin-top:10px;'});
    const tokenApplyBtn = el('button', {class:'btn primary', type:'button'}, ['Apply Lists']);
    const tokenResetBtn = el('button', {class:'btn', type:'button'}, ['Reset Defaults']);
    tokenBtnRow.appendChild(tokenApplyBtn);
    tokenBtnRow.appendChild(tokenResetBtn);
    tokenListsCard.appendChild(tokenBtnRow);

    function parseTokenListInput(text){
      if(typeof parseTokenList === 'function') return parseTokenList(text);
      return String(text || '')
        .split(/[\n,]+/g)
        .map(s => String(s || '').trim().toLowerCase())
        .filter(Boolean)
        .filter((v, i, arr)=> arr.indexOf(v) === i);
    }

    function saveInfluencePrefs(){
      const amb = Math.max(0, Math.min(2, parseFloat(ambInfluenceInput.value || '1') || 1));
      const par = Math.max(0, Math.min(2, parseFloat(particleInfluenceInput.value || '1') || 1));
      ambInfluenceTag.textContent = 'Ambiguous Influence: ' + (amb * 100).toFixed(0) + '%';
      particleInfluenceTag.textContent = 'Particle Influence: ' + (par * 100).toFixed(0) + '%';
      saveG2pAwsTtsPrefs({
        ...loadG2pAwsTtsPrefs(),
        autoDetectAmbiguousInfluence: amb,
        autoDetectParticleInfluence: par
      });
    }

    ambInfluenceInput.addEventListener('input', ()=>{
      saveInfluencePrefs();
      buildSsmlFromInput();
      if((outputModeSelect.value || 'phoneme') === 'mixedAuto') scheduleAutoDetect();
    });
    particleInfluenceInput.addEventListener('input', ()=>{
      saveInfluencePrefs();
      buildSsmlFromInput();
      if((outputModeSelect.value || 'phoneme') === 'mixedAuto') scheduleAutoDetect();
    });

    tokenApplyBtn.addEventListener('click', ()=>{
      const amb = parseTokenListInput(tokenAmbArea.value);
      const par = parseTokenListInput(tokenPartArea.value);
      saveTokenList(STORAGE_KEYS.detectAmbiguous, amb);
      saveTokenList(STORAGE_KEYS.detectParticles, par);
      buildSsmlFromInput();
      if((outputModeSelect.value || 'phoneme') === 'mixedAuto') scheduleAutoDetect();
    });

    tokenResetBtn.addEventListener('click', ()=>{
      const amb = defaultAmbiguousTokens();
      const par = defaultParticleTokens();
      saveTokenList(STORAGE_KEYS.detectAmbiguous, amb);
      saveTokenList(STORAGE_KEYS.detectParticles, par);
      tokenAmbArea.value = amb.join(', ');
      tokenPartArea.value = par.join(', ');
      buildSsmlFromInput();
      if((outputModeSelect.value || 'phoneme') === 'mixedAuto') scheduleAutoDetect();
    });

    root.appendChild(tokenListsCard);

    const compactCard = el('div', {class:'card'});
    compactCard.appendChild(el('h2', {}, ['SSML Compact Post Processing']));
    compactCard.appendChild(el('p', {class:'muted'}, ['Optional post-processing for AWS SDK character-limit reduction. It rewrites phoneme blocks and keeps punctuation outside phoneme tags.']));

    const compactEnableCheck = el('label', {class:'checkbox'});
    const compactEnableInput = el('input', {type:'checkbox'});
    compactEnableInput.checked = !!prefs.ssmlCompactEnabled;
    compactEnableCheck.appendChild(compactEnableInput);
    compactEnableCheck.appendChild(document.createTextNode('Enable SSML Compact Mode'));

    const compactIpaOnlyCheck = el('label', {class:'checkbox'});
    const compactIpaOnlyInput = el('input', {type:'checkbox'});
    compactIpaOnlyInput.checked = !!prefs.ssmlCompactIpaOnly;
    compactIpaOnlyCheck.appendChild(compactIpaOnlyInput);
    compactIpaOnlyCheck.appendChild(document.createTextNode('Output IPA Only (No SSML)'));

    const compactSentenceCheck = el('label', {class:'checkbox'});
    const compactSentenceInput = el('input', {type:'checkbox'});
    compactSentenceInput.checked = prefs.ssmlCompactSplitSentence !== false;
    compactSentenceCheck.appendChild(compactSentenceInput);
    compactSentenceCheck.appendChild(document.createTextNode('Split At Sentence Punctuation'));

    const compactNewlineCheck = el('label', {class:'checkbox'});
    const compactNewlineInput = el('input', {type:'checkbox'});
    compactNewlineInput.checked = prefs.ssmlCompactSplitNewline !== false;
    compactNewlineCheck.appendChild(compactNewlineInput);
    compactNewlineCheck.appendChild(document.createTextNode('Split At Newlines'));

    const compactSpaceCheck = el('label', {class:'checkbox'});
    const compactSpaceInput = el('input', {type:'checkbox'});
    compactSpaceInput.checked = !!prefs.ssmlCompactSplitSpace;
    compactSpaceCheck.appendChild(compactSpaceInput);
    compactSpaceCheck.appendChild(document.createTextNode('Split At Spaces'));

    const compactEnsureSpaceCheck = el('label', {class:'checkbox'});
    const compactEnsureSpaceInput = el('input', {type:'checkbox'});
    compactEnsureSpaceInput.checked = prefs.ssmlCompactEnsureSpace !== false;
    compactEnsureSpaceCheck.appendChild(compactEnsureSpaceInput);
    compactEnsureSpaceCheck.appendChild(document.createTextNode('Add Space Between Adjacent IPA Chunks'));

    const compactTeReoOnlyCheck = el('label', {class:'checkbox'});
    const compactTeReoOnlyInput = el('input', {type:'checkbox'});
    compactTeReoOnlyInput.checked = !!prefs.ssmlCompactTeReoBlocksOnly;
    compactTeReoOnlyCheck.appendChild(compactTeReoOnlyInput);
    compactTeReoOnlyCheck.appendChild(document.createTextNode('Apply Compact To Te Reo Blocks Only'));

    const compactEmptyBodyCheck = el('label', {class:'checkbox'});
    const compactEmptyBodyInput = el('input', {type:'checkbox'});
    compactEmptyBodyInput.checked = prefs.ssmlCompactEmptyBody !== false;
    compactEmptyBodyCheck.appendChild(compactEmptyBodyInput);
    compactEmptyBodyCheck.appendChild(document.createTextNode('Use Empty Phoneme Body In Compact Output'));

    const compactRowA = el('div', {class:'row'});
    compactRowA.appendChild(compactEnableCheck);
    compactRowA.appendChild(compactIpaOnlyCheck);
    const compactRowB = el('div', {class:'row', style:'margin-top:8px;'});
    compactRowB.appendChild(compactSentenceCheck);
    compactRowB.appendChild(compactNewlineCheck);
    compactRowB.appendChild(compactSpaceCheck);
    const compactRowC = el('div', {class:'row', style:'margin-top:8px;'});
    compactRowC.appendChild(compactEnsureSpaceCheck);
    compactRowC.appendChild(compactTeReoOnlyCheck);
    compactRowC.appendChild(compactEmptyBodyCheck);
    compactCard.appendChild(compactRowA);
    compactCard.appendChild(compactRowB);
    compactCard.appendChild(compactRowC);
    root.appendChild(compactCard);

    const outCard = el('div', {class:'card'});
    outCard.appendChild(el('h2', {}, ['SSML Output']));

    const ssmlOut = el('textarea', {rows:'6', id:'awsSsmlOutput', class:'mono'});
    APP_SHARED.awsTtsSsmlEl = ssmlOut;

    const outBtns = el('div', {class:'row'});
    const btnCopy = el('button', {class:'btn', type:'button'}, ['Copy SSML']);
    const btnDownload = el('button', {class:'btn', type:'button'}, ['Download SSML']);
    outBtns.appendChild(btnCopy);
    outBtns.appendChild(btnDownload);

    outCard.appendChild(ssmlOut);
    outCard.appendChild(el('div', {style:'margin-top:10px;'}));
    outCard.appendChild(outBtns);

    const mapDetails = el('details', {class:'tokenDetails', style:'margin-top:12px;'});
    mapDetails.open = false;
    mapDetails.appendChild(el('summary', {}, ['Mapping Table']));
    const mapWrap = el('div', {style:'margin-top:10px;'});
    mapDetails.appendChild(mapWrap);
    outCard.appendChild(mapDetails);

    const traceWrap = el('div', {style:'margin-top:12px;'});
    outCard.appendChild(traceWrap);

    root.appendChild(outCard);

    const playCard = el('div', {class:'card'});
    playCard.appendChild(el('h2', {}, ['AWS Polly Playback']));
    playCard.appendChild(el('p', {}, ['This runs in your browser using the AWS SDK. If the SDK fails to load or the browser blocks the call, you can still copy SSML and run it with boto3.']));

    const cfg = loadG2pAwsTtsPrefs();
    const creds = loadG2pAwsTtsCreds();

    const serviceRegion = el('input', {type:'text', value: cfg.serviceRegion || 'australiaeast', placeholder:'service_region (reference)'});
    const awsRegion = el('input', {type:'text', value: cfg.awsRegion || 'ap-southeast-2', placeholder:"aws_region (e.g. ap-southeast-2)"});
    const voiceId = el('input', {type:'text', value: cfg.voiceId || 'Aria', placeholder:'VoiceId'});

    const engine = el('select', {class:'btn'});
    engine.style.padding = '8px 10px';
    engine.style.borderRadius = '10px';
    engine.style.background = 'var(--surfaceStrong)';
    engine.style.border = '1px solid var(--border)';
    engine.style.color = 'var(--text)';
    for(const v of ['neural','standard']){
      const o = el('option', {value:v}, [v]);
      if(v === (cfg.engine || 'neural')) o.selected = true;
      engine.appendChild(o);
    }

    const languageCode = el('input', {type:'text', value: cfg.languageCode || 'en-NZ', placeholder:'LanguageCode (optional)'});

    const outputFormat = el('select', {class:'btn'});
    outputFormat.style.padding = '8px 10px';
    outputFormat.style.borderRadius = '10px';
    outputFormat.style.background = 'var(--surfaceStrong)';
    outputFormat.style.border = '1px solid var(--border)';
    outputFormat.style.color = 'var(--text)';
    for(const v of ['mp3','ogg_vorbis','pcm']){
      const o = el('option', {value:v}, [v]);
      if(v === (cfg.outputFormat || 'mp3')) o.selected = true;
      outputFormat.appendChild(o);
    }

    const accessKeyId = el('input', {type:'password', value: creds.accessKeyId || '', placeholder:'AWS Access Key Id'});
    const secretAccessKey = el('input', {type:'password', value: creds.secretAccessKey || '', placeholder:'AWS Secret Access Key'});
    const sessionToken = el('input', {type:'password', value: creds.sessionToken || '', placeholder:'AWS Session Token (optional)'});

    const rememberCheck = el('label', {class:'checkbox'});
    const rememberInput = el('input', {type:'checkbox'});
    rememberInput.checked = !!creds.remember;
    rememberCheck.appendChild(rememberInput);
    rememberCheck.appendChild(document.createTextNode('Remember Credentials (Local Storage)'));

    const btnSaveCfg = el('button', {class:'btn', type:'button'}, ['Save Config']);
    const btnPlay = el('button', {class:'btn primary', type:'button'}, ['Play SSML']);
    const btnDownloadMp3 = el('button', {class:'btn', type:'button'}, ['Download MP3']);

    const audio = el('audio', {controls:'', style:'width:100%; margin-top:10px;'});
    const playTrace = el('pre', {class:'mono', style:'margin-top:10px; white-space:pre-wrap;'});

    const grid = el('div', {class:'twoCol'});
    grid.appendChild(el('div', {}, [el('h3', {}, ['Regions']), el('div', {class:'stack'}, [
      el('label', {}, ['service_region']), serviceRegion,
      el('label', {}, ['aws_region']), awsRegion
    ])]));

    grid.appendChild(el('div', {}, [el('h3', {}, ['Voice']), el('div', {class:'stack'}, [
      el('label', {}, ['VoiceId']), voiceId,
      el('label', {}, ['Engine']), engine,
      el('label', {}, ['LanguageCode']), languageCode,
      el('label', {}, ['OutputFormat']), outputFormat
    ])]));

    playCard.appendChild(grid);

    playCard.appendChild(el('h3', {}, ['Credentials']));
    playCard.appendChild(el('div', {class:'stack'}, [
      accessKeyId,
      secretAccessKey,
      sessionToken,
      rememberCheck
    ]));

    const playBtns = el('div', {class:'row', style:'margin-top:10px;'});
    playBtns.appendChild(btnSaveCfg);
    playBtns.appendChild(btnPlay);
    playBtns.appendChild(btnDownloadMp3);
    playCard.appendChild(playBtns);
    playCard.appendChild(audio);
    playCard.appendChild(playTrace);

    root.appendChild(playCard);

    const histCard = el('div', {class:'card'});
    histCard.appendChild(el('h2', {}, ['AWS TTS History']));
    histCard.appendChild(el('p', {}, ['Most recent first. Click a row to restore input and SSML output.']));

    const histControls = el('div', {class:'row'});
    const btnClearHist = el('button', {class:'btn', type:'button'}, ['Clear History']);
    const btnExportHist = el('button', {class:'btn', type:'button'}, ['Export History']);
    const btnImportHist = el('button', {class:'btn', type:'button'}, ['Import History']);
    const histFile = el('input', {type:'file', accept:'application/json', class:'hidden'});

    btnImportHist.addEventListener('click', ()=> histFile.click());

    histControls.appendChild(btnClearHist);
    histControls.appendChild(btnExportHist);
    histControls.appendChild(btnImportHist);
    histCard.appendChild(histControls);
    histCard.appendChild(histFile);

    const histTable = el('table', {class:'table'});
    const histHead = el('thead');
    histHead.appendChild(el('tr', {}, [
      el('th', {}, ['When']),
      el('th', {}, ['Mode']),
      el('th', {}, ['Input']),
      el('th', {}, ['Voice']),
      el('th', {}, ['Region'])
    ]));
    histTable.appendChild(histHead);
    const histBody = el('tbody');
    histTable.appendChild(histBody);
    histCard.appendChild(histTable);

    root.appendChild(histCard);

    function escapeAttr(s){
      return String(s ?? '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    }

    function buildPhonemeTag(ipa, bodyText, emptyBody){
      const ph = escapeAttr(ipa || '');
      const body = emptyBody ? '' : escapeHtml(bodyText || '');
      return `<phoneme alphabet="ipa" ph="${ph}">${body}</phoneme>`;
    }

    function decodeXmlEntities(s){
      return String(s || '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }

    function applyCompactSsmlPostProcess(ssmlText, opts={}){
      const src = String(ssmlText || '');
      const splitSentence = opts.splitSentence !== false;
      const splitNewline = opts.splitNewline !== false;
      const splitSpace = !!opts.splitSpace;
      const ensureSpace = opts.ensureSpace !== false;
      const ipaOnly = !!opts.ipaOnly;
      const emptyBody = opts.emptyBody !== false;

      const hasSpeakOpen = /^\s*<speak\b[^>]*>/i.test(src);
      const hasSpeakClose = /<\/speak>\s*$/i.test(src);
      const hadSpeakWrap = hasSpeakOpen && hasSpeakClose;
      let body = src;
      if(hadSpeakWrap){
        body = body.replace(/^\s*<speak\b[^>]*>/i, '');
        body = body.replace(/<\/speak>\s*$/i, '');
      }

      const wordLikeRe = /[A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B0-9]/;
      const boundaryPunctRe = /[.!?,;:()[\]{}]/;
      const phonemeRe = /<phoneme\b[^>]*\bph=(["'])(.*?)\1[^>]*>[\s\S]*?<\/phoneme>/gi;

      let out = '';
      let bufIpa = '';
      let last = 0;

      function appendIpa(ipa){
        const p = String(ipa || '').trim();
        if(!p) return;
        if(bufIpa && ensureSpace && !/\s$/.test(bufIpa)) bufIpa += ' ';
        bufIpa += p;
      }

      function flushIpa(){
        if(!bufIpa) return;
        if(ipaOnly){
          out += bufIpa;
        } else {
          const bodyText = emptyBody ? '' : 'x';
          out += `<phoneme alphabet="ipa" ph="${escapeAttr(bufIpa)}">${bodyText}</phoneme>`;
        }
        bufIpa = '';
      }

      function handleSeparatorChunk(chunk){
        const s = String(chunk || '');
        if(!s) return;

        if(wordLikeRe.test(s)){
          flushIpa();
          out += s;
          return;
        }

        const hasNewline = /[\r\n]/.test(s);
        const hasSpace = /[ \t]/.test(s);
        const hasSentencePunct = boundaryPunctRe.test(s);
        const isBoundary = (splitSentence && hasSentencePunct) || (splitNewline && hasNewline) || (splitSpace && (hasSpace || hasNewline));

        if(isBoundary){
          flushIpa();
          out += s;
          return;
        }

        if(bufIpa && ensureSpace && /\s/.test(s) && !/\s$/.test(bufIpa)) bufIpa += ' ';
      }

      let m;
      while((m = phonemeRe.exec(body)) !== null){
        const sep = body.slice(last, m.index);
        handleSeparatorChunk(sep);
        appendIpa(decodeXmlEntities(m[2] || ''));
        last = m.index + m[0].length;
      }
      handleSeparatorChunk(body.slice(last));
      flushIpa();

      if(ipaOnly) return out;
      const keepSpeak = opts.wrapSpeak !== false;
      return keepSpeak ? `<speak>${out}</speak>` : out;
    }

    function trimNonFinalHPart(ipa, opts={}){
      const s = String(ipa ?? '');
      if(s.length <= 1) return s;
      const trimTail = opts.trimTail !== false;
      // Remove a trailing literal 'h' when this IPA part is not the final segment of the word.
      // Preserve any trailing boundary dots (common when the next IPA part begins with a dot).
      let out = trimTail ? s.replace(/h(\.+)?$/, (m, dots)=> (dots ?? '')) : s;
      // Also remove non-initial internal 'h' before a vowel nucleus in non-final parts.
      // Keep leading "h..." and ".h..." intact. Allow combining marks on h (e.g. h̞).
      out = out.replace(/([^.\s])h[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF]*(?=[ːˑ]*[aeiouɑɐɒæəɛɜɞɪiɨʉʊuɔoœøyɶʌɤɯ])/g, '$1');
      return out;
    }

    function mapWordToIpa(word){
      const original = String(word || '');
      const wNorm = normalizeWord(original);
      if(!wNorm) return {ok:false, word:original, reason:'empty'};

      const res = segmentWordCore(wNorm, {ctx:'g2pAwsTts'});
      const segs = normalizeSegments(res.segments);
      if(!segs.length) return {ok:false, word:original, reason:'no-segments', segments:[], ruleIds:res.ruleIds || []};

      const rows = [];
      const ipaParts = [];
      let missing = false;

      for(let si=0; si<segs.length; si++){
        const seg = segs[si];
        const matches = getLexiconMatches(seg);
        const chosen = chooseDefaultMatch(matches);
        if(!chosen){
          missing = true;
          rows.push({segment:seg, status:'missing', matches:[]});
          ipaParts.push('');
          continue;
        }
        let ipaPart = chosen.ipa || '';
        if(trimNonFinalHInput.checked) ipaPart = trimNonFinalHPart(ipaPart, { trimTail: si < (segs.length - 1) });
        rows.push({
          segment: seg,
          status: 'ok',
          chosenUnit: chosen.unit,
          chosenIpa: ipaPart,
          chosenNumber: chosen.unit_number,
          matchCount: matches.length
        });
        ipaParts.push(ipaPart);
      }

      const ipa = joinIpa(ipaParts, joinSelect.value || 'dot');
      const phoneme = buildPhonemeTag(ipa, original, emptyBodyInput.checked);

      return {
        ok: !(missing && strictInput.checked),
        word: original,
        wordNorm: wNorm,
        segments: segs,
        ipaParts,
        ipa,
        phoneme,
        rows,
        ruleIds: res.ruleIds || []
      };
    }

    function tokenizeTextPreserve(text, splitHyphen){
      const t = String(text || '');
      const wordRe = splitHyphen ? /[A-Za-zĀāĒēĪīŌōŪū]+/g : /[A-Za-zĀāĒēĪīŌōŪū\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    function splitWordParts(word){
      const w = String(word || '').trim();
      if(!w) return [];
      if(!hyphenInput.checked) return [w];
      return w.split('-').filter(Boolean);
    }

    // Override mojibake-prone tokenizer with Unicode-escape based matching.
    // Keep this declaration after legacy copies so this one wins.
    function tokenizeTextPreserve(text, splitHyphen){
      const t = String(text || '').normalize('NFC');
      const wordRe = splitHyphen
        ? /[A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B]+/g
        : /[A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    
    function showAutoPanel(show){
      autoPanel.style.display = show ? '' : 'none';
    }

    let _autoDetectTimer = null;
    function scheduleAutoDetect(){
      if(_autoDetectTimer) clearTimeout(_autoDetectTimer);
      _autoDetectTimer = setTimeout(()=>{ if(outputModeSelect.value === 'mixedAuto'){ runAutoDetectAnalysis(true); } }, 120);
    }

    
    function getAutoDisplayText(){
      const mode = modeSelect.value;
      if(mode === 'text') return String(input.value || '').normalize('NFC');
      if(mode === 'list'){
        const raw = String(input.value || '').normalize('NFC');
        const items = raw.split(/[\n\r\t,;]+/g).map(s=>s.trim()).filter(Boolean);
        return items.join(', ');
      }
      return String(input.value || '').normalize('NFC');
    }

    function normKey(s){
      return String(s || '').trim().toLowerCase();
    }

    function computeAutoDetect(){
      const ambiguous = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens);
      const particles = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens);
      const lists = {
        ambiguousArr: ambiguous,
        particlesArr: particles,
        ambiguous: new Set(ambiguous),
        particles: new Set(particles)
      };

      const splitHyphen = !!hyphenInput.checked;
      const displayText = getAutoDisplayText();
      const parts = tokenizeTextPreserve(displayText, splitHyphen);
      const wordParts = parts.filter(p=>p.type === 'word').map(p=>p.text);

      const baseTokens = [];
      let seq = 0;
      for(const rawWord of wordParts){
        seq += 1;
        const baseKey = normKey(rawWord) || 'word';
        const key = baseKey + '#' + seq;

        const norm = normalizeWord(rawWord);
        const base = scoreTokenBase(norm, lists);
        baseTokens.push({
          raw: rawWord,
          norm,
          base: base.base,
          hardBlock: !!base.hardBlock,
          debug: base.debug || [],
          segments: base.segments || [],
          signals: base.ruleIds || [],
          ruleIds: base.ruleIds || [],
          coverage: base.coverage,
          orphans: base.orphans,
          key,
          baseKey
        });
      }

      const scored0 = applyContextBoost(baseTokens, lists);
      const isMultiPartMaori = baseTokens.length > 1 && scored0.every(t => !t.hardBlock);
      const scoredBase = (!isMultiPartMaori) ? applyZeroNeighborPropagation(scored0, lists) : scored0;

      const influencePrefs = loadG2pAwsTtsPrefs();
      const ambiguousInfluence = Math.max(0, Math.min(2, parseFloat(influencePrefs.autoDetectAmbiguousInfluence ?? 1) || 1));
      const particleInfluence = Math.max(0, Math.min(2, parseFloat(influencePrefs.autoDetectParticleInfluence ?? 1) || 1));
      const scored = (typeof applyTokenListInfluence === 'function')
        ? applyTokenListInfluence(scoredBase, lists, {ambiguousInfluence, particleInfluence})
        : scoredBase;

      const thr = clamp01(parseFloat(autoThr.value) || 0.75);

      const wrapMap = {};
      for(const t of scored){
        const baseInclude = (!t.hardBlock) && (t.score >= thr);
        const ov = autoGetOverride(t.key);
        const include = (ov === null) ? baseInclude : !!ov;

        // annotate token for UI
        t.baseInclude = baseInclude;
        t.override = ov;
        t.include = include;

        wrapMap[t.key] = include;
      }

      return { scored, wrapMap, lists, thr, isMultiPartMaori, displayText, parts };
    }

    function renderAutoDetectUI(res){

      const scored = res.scored || [];
      const wrapMap = res.wrapMap || {};
      const thr = res.thr;

      const prefs = loadG2pAwsTtsPrefs();
      const showDebug = !!prefs.autoDetectShowDebug;
      const autoOvrEl = document.getElementById('autoOverrideTag');
      if(autoOvrEl) autoOvrEl.textContent = 'Overrides: ' + autoOverrideCount();

      // Highlighted Text display based on current input mode, preserving punctuation when enabled
      autoHl.innerHTML = '';
      autoBlocks.innerHTML = '';
      autoSel.innerHTML = '';
      autoTbl.innerHTML = '';

      const displayText = (res && res.displayText != null) ? res.displayText : getAutoDisplayText();
      const parts = (res && res.parts) ? res.parts : tokenizeTextPreserve(displayText, !!hyphenInput.checked);

      let wi = 0;
      const tokSpans = [];
      for(const part of parts){
        if(part.type !== 'word'){
          autoHl.appendChild(document.createTextNode(part.text));
          continue;
        }
        const t = scored[wi];
        const word = part.text;
        const s = t || {score:0, hardBlock:false, signals:[], norm: normalizeWord(word), key: (t && t.key) || ''};
        const lab = scoreToLabel(s.score || 0);
        const include = !!wrapMap[s.key];
        const ov = (t && t.override !== undefined) ? t.override : autoGetOverride(s.key);
        const hasOv = (ov !== null && ov !== undefined);
        const cls = 'hlTok ' + lab.cls + (include ? ' inc' : '') + (hasOv ? ' ovr' : '');
        const span = el('span', {class: cls, tabindex:'0', 'data-idx': String(wi), 'data-key': String(s.key || '')}, [word]);

        span.addEventListener('click', (e)=>{
          if(e && e.shiftKey){
            const key = String(s.key || '');
            if(key){
              autoSetOverride(key, !include);
              AUTO_DETECT_STATE.selectedKey = key;
              runAutoDetectAnalysis(true);
            }
            return;
          }
          selectAutoToken(wi);
        });
        tokSpans.push(span);
        autoHl.appendChild(span);
        wi += 1;
      }

      function makeBlocks(){
        const blocks = [];
        let cur = null;
        for(let i=0;i<scored.length;i++){
          const t = scored[i];
          const inc = !!wrapMap[t.key];
          if(inc){
            if(!cur) cur = {start:i, end:i, words:[t.raw]};
            else { cur.end = i; cur.words.push(t.raw); }
          } else {
            if(cur){ blocks.push(cur); cur=null; }
          }
        }
        if(cur) blocks.push(cur);
        return blocks;
      }

      const blocks = makeBlocks();
      if(!blocks.length){
        autoBlocks.appendChild(el('span', {class:'tag'}, ['No Te Reo blocks detected']));
      } else {
        let bi = 0;
        for(const b of blocks){
          bi += 1;
          const label = `Block ${bi}: #${b.start+1} to #${b.end+1}`;
          const item = el('div', {style:'display:flex; gap:8px; align-items:center;'});
          item.appendChild(el('span', {class:'tag good'}, [label]));
          item.appendChild(el('span', {class:'mono'}, [b.words.join(' ')]));
          autoBlocks.appendChild(item);
        }
      }

      // Word details table
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['#']),
        el('th', {}, ['Word']),
        el('th', {}, ['Score']),
        el('th', {}, ['Process']),
        el('th', {}, ['Signals'])
      ]));
      autoTbl.appendChild(thead);

      const tbody = el('tbody');
      for(let i=0;i<scored.length;i++){
        const t = scored[i];
        const include = !!wrapMap[t.key];
        const pct = Math.round((t.score || 0) * 100) + '%';
        const sigs = renderSignalPills(t.signals || [], (id)=>{ /* no-op */ });

        const procCell = el('td', {});
        const cb = el('input', {type:'checkbox', title:'Toggle processing for this token'});
        cb.checked = include;
        cb.addEventListener('click', (e)=>{ e.stopPropagation(); });
        cb.addEventListener('change', ()=>{
          autoSetOverride(t.key, !!cb.checked);
          AUTO_DETECT_STATE.selectedKey = t.key;
          runAutoDetectAnalysis(true);
        });
        procCell.appendChild(cb);

        const ov = autoGetOverride(t.key);
        if(ov !== null){
          procCell.appendChild(el('span', {class:'tag', style:'margin-left:6px;'}, ['Override']));
        }

        const tr = el('tr', {style:'cursor:pointer;'}, [
          el('td', {class:'mono'}, [String(i+1)]),
          el('td', {class:'mono'}, [String(t.raw || '')]),
          el('td', {}, [el('span', {class:'tag ' + scoreToLabel(t.score || 0).cls}, [pct])]),
          procCell,
          el('td', {}, [sigs])
        ]);
        tr.addEventListener('click', ()=>{ selectAutoToken(i); });
        tbody.appendChild(tr);
      }
      autoTbl.appendChild(tbody);

      function selectAutoToken(i){
        const t = scored[i];
        if(!t) return;
        for(let j=0;j<tokSpans.length;j++){
          tokSpans[j].classList.toggle('sel', j===i);
        }
        const include = !!wrapMap[t.key];
        AUTO_DETECT_STATE.selectedKey = t.key;

        autoSel.innerHTML = '';
        autoSel.appendChild(el('div', {class:'row'}, [
          el('span', {class:'tag ' + scoreToLabel(t.score || 0).cls}, [scoreToLabel(t.score || 0).label]),
          include ? el('span', {class:'tag good'}, ['Included']) : el('span', {class:'tag'}, ['Not Included']),
          el('span', {class:'mono'}, [String(t.raw || '')])
        ]));

        const ov = autoGetOverride(t.key);
        const ovRow = el('div', {class:'row', style:'margin-top:8px; align-items:center;'}, []);
        const ovCb = el('input', {type:'checkbox', title:'Toggle whether this token is processed as te reo (wrap in <phoneme>)'});
        ovCb.checked = include;
        ovCb.addEventListener('change', ()=>{
          autoSetOverride(t.key, !!ovCb.checked);
          runAutoDetectAnalysis(true);
        });
        ovRow.appendChild(ovCb);
        ovRow.appendChild(el('span', {class:'muted'}, ['Process as Te Reo (Wrap In <phoneme>)']));

        if(ov !== null){
          const tag = el('span', {class:'tag', style:'margin-left:8px;'}, ['Override']);
          const btnClear = el('button', {class:'btn', type:'button', style:'padding:6px 10px;'}, ['Clear']);
          btnClear.addEventListener('click', ()=>{
            delete AUTO_DETECT_STATE.overrides[t.key];
            runAutoDetectAnalysis(true);
          });
          ovRow.appendChild(tag);
          ovRow.appendChild(btnClear);
        } else {
          ovRow.appendChild(el('span', {class:'tag', style:'margin-left:8px; opacity:.8;'}, ['Auto']));
        }
        autoSel.appendChild(ovRow);

        const info = el('div', {style:'margin-top:8px;'});
        info.appendChild(el('div', {class:'muted'}, ['Normalized']));
        info.appendChild(el('div', {class:'mono'}, [String(t.norm || '')]));

        info.appendChild(el('div', {class:'muted', style:'margin-top:8px;'}, ['Signals']));
        info.appendChild(renderSignalPills(t.signals || []));

        if(showDebug){
          info.appendChild(el('div', {class:'muted', style:'margin-top:8px;'}, ['Debug']));
          const pre = el('pre', {class:'mono', style:'white-space:pre-wrap;'}, [JSON.stringify({base:t.base, contextDelta:t.contextDelta, contextNotes:t.contextNotes, debug:t.debug}, null, 2)]);
          info.appendChild(pre);
        }
        autoSel.appendChild(info);
      }

      // Auto-select first included token, else first token
      let selIdx = -1;
      if(AUTO_DETECT_STATE.selectedKey){
        selIdx = scored.findIndex(t => t && t.key === AUTO_DETECT_STATE.selectedKey);
      }
      if(selIdx < 0){
        const firstInc = scored.findIndex(t => !!wrapMap[t.key]);
        selIdx = (firstInc >= 0) ? firstInc : 0;
      }
      selectAutoToken(selIdx);

      // Persist threshold into g2p aws prefs
      saveG2pAwsTtsPrefs({...loadG2pAwsTtsPrefs(), autoDetectThreshold: thr });
    }

    function runAutoDetectAnalysis(renderUi){
      const h = autoDetectHash();
      if(AUTO_DETECT_STATE.lastHash !== h){
        AUTO_DETECT_STATE.lastHash = h;
        AUTO_DETECT_STATE.overrides = {};
        AUTO_DETECT_STATE.selectedKey = null;
      }
      const res = computeAutoDetect();
      if(renderUi) renderAutoDetectUI(res);
      return res;
    }

    function buildSsmlFromInput(){
      const mode = modeSelect.value;
      const joinMode = joinSelect.value;
      const outputMode = outputModeSelect.value || 'phoneme';

      function normKey(s){
        return String(s || '').trim().toLowerCase();
      }

      const nextPrefs = {
        ...loadG2pAwsTtsPrefs(),
        inputMode: mode,
        joinMode,
        outputMode,
        mixedWrap,
        wrapSpeak: speakInput.checked,
        emptyPhonemeBody: emptyBodyInput.checked,
        preservePunct: punctInput.checked,
        splitHyphen: hyphenInput.checked,
        trimNonFinalH: trimNonFinalHInput.checked,
        ssmlCompactEnabled: !!compactEnableInput.checked,
        ssmlCompactSplitSentence: !!compactSentenceInput.checked,
        ssmlCompactSplitNewline: !!compactNewlineInput.checked,
        ssmlCompactSplitSpace: !!compactSpaceInput.checked,
        ssmlCompactEnsureSpace: !!compactEnsureSpaceInput.checked,
        ssmlCompactTeReoBlocksOnly: !!compactTeReoOnlyInput.checked,
        ssmlCompactIpaOnly: !!compactIpaOnlyInput.checked,
        ssmlCompactEmptyBody: !!compactEmptyBodyInput.checked,
        strictMissing: strictInput.checked,
        showTrace: traceInput.checked,
        lastInputText: input.value
      };
      saveG2pAwsTtsPrefs(nextPrefs);

      mapWrap.innerHTML = '';
      traceWrap.innerHTML = '';

      const items = [];
      let ssmlBody = '';

      function showMixedPanel(show){
        mixedPanel.style.display = show ? '' : 'none';
      }

      let _mixedTokenCounterForWrap = 0;
      function _mixedTokenKeyFor(word){
        _mixedTokenCounterForWrap += 1;
        const base = normKey(word) || 'word';
        return `${base}#${_mixedTokenCounterForWrap}`;
      }

      function buildMixedTokenIndex(){
        const raw = String(input.value || '').normalize('NFC');
        const splitHyphen = !!hyphenInput.checked;
        const preserve = !!punctInput.checked;
        const tokens = [];
        let n = 0;

        function pushWord(word){
          const w = String(word || '').trim();
          if(!w) return;
          n += 1;
          const base = normKey(w) || 'word';
          const key = `${base}#${n}`;
          const label = `#${String(n).padStart(2,'0')} ${w}`;
          tokens.push({key, label, word:w, base});
        }

        function addWordOrParts(word){
          const w = String(word || '').trim();
          if(!w) return;
          if(splitHyphen){
            for(const p of w.split('-').filter(Boolean)) pushWord(p);
          } else {
            pushWord(w);
          }
        }

        if(mode === 'single'){
          addWordOrParts(raw.trim());
        } else if(mode === 'list'){
          const words = raw.split(/[\n\r\t,;]+/g).map(x=>x.trim()).filter(Boolean);
          for(const w of words) addWordOrParts(w);
        } else {
          if(preserve){
            const toks = tokenizeTextPreserve(raw, splitHyphen);
            for(const tok of toks){
              if(tok.type === 'word') pushWord(tok.text);
            }
          } else {
            const words = raw.split(/\s+/g).map(x=>x.trim()).filter(Boolean);
            for(const w of words) addWordOrParts(w);
          }
        }

        return {tokens};
      }

      function rebuildMixedList(){
        const idx = buildMixedTokenIndex();
        const filt = String(mixedFilter.value || '').trim().toLowerCase();
        mixedList.innerHTML = '';

        for(const tok of idx.tokens){
          const key = tok.key;
          const base = tok.base;
          if(mixedWrap[key] === undefined){
            if(base && mixedWrap[base] !== undefined) mixedWrap[key] = mixedWrap[base];
            else mixedWrap[key] = true;
          }
          const label = tok.label || tok.word || key;
          if(filt && !label.toLowerCase().includes(filt) && !String(key).toLowerCase().includes(filt) && !String(tok.word||'').toLowerCase().includes(filt)) continue;

          const row = el('div', {style:'display:flex; align-items:center; gap:10px; padding:4px 2px;'});
          const cb = el('input', {type:'checkbox'});
          cb.checked = (mixedWrap[key] !== false);
          cb.addEventListener('change', ()=>{
            mixedWrap[key] = !!cb.checked;
            saveG2pAwsTtsPrefs({ ...loadG2pAwsTtsPrefs(), mixedWrap, outputMode: (outputModeSelect.value || 'mixed') });
          });
          const txt = el('div', {class:'mono', style:'opacity:.95;'}, [label]);
          row.appendChild(cb);
          row.appendChild(txt);
          mixedList.appendChild(row);
        }
      }

      function ensureMixedReady(){
        showMixedPanel(true);
        rebuildMixedList();
      }

      let autoWrapMap = null;

      function shouldWrapWord(word){
        if(outputMode === 'phoneme') return true;
        if(outputMode === 'plain') return false;
        const w = String(word || '');
        const key = _mixedTokenKeyFor(w);

        if(outputMode === 'mixedAuto'){
          if(!autoWrapMap){
            const res = runAutoDetectAnalysis(false);
            autoWrapMap = (res && res.wrapMap) ? res.wrapMap : {};
          }
          return autoWrapMap[key] === true;
        }

        if(outputMode !== 'mixed') return false;

        if(mixedWrap[key] === undefined){
          const base = normKey(w);
          if(base && mixedWrap[base] !== undefined) mixedWrap[key] = mixedWrap[base];
          else mixedWrap[key] = true;
        }
        return mixedWrap[key] !== false;
      }

      function ssmlPieceForWord(word){

        const w = String(word || '');
        if(shouldWrapWord(w)){
          const r = mapWordToIpa(w);
          r.kind = 'phoneme';
          r.ssmlPiece = r.phoneme;
          items.push(r);
          return r.phoneme;
        }
        const piece = escapeHtml(w);
        items.push({kind:'plain', word:w, segments:[], ipa:'', phoneme:piece, ssmlPiece:piece});
        return piece;
      }

      function buildPlainSpeakBody(){
        const raw = String(input.value || '').normalize('NFC');
        if(mode === 'single') return raw.trim();
        if(mode === 'list'){
          const words = raw.split(/[\n\r\t,;]+/g).map(x=>x.trim()).filter(Boolean);
          return words.join(', ');
        }
        return raw;
      }

      if(outputMode === 'plain'){
        showMixedPanel(false);
        showAutoPanel(false);
        ssmlBody = escapeHtml(buildPlainSpeakBody());
      } else {
        if(outputMode === 'mixed'){
          showAutoPanel(false);
          ensureMixedReady();
        } else if(outputMode === 'mixedAuto'){
          showMixedPanel(false);
          showAutoPanel(true);
          runAutoDetectAnalysis(true);
        } else {
          showMixedPanel(false);
          showAutoPanel(false);
        }

        if(mode === 'single'){
          const parts = splitWordParts(input.value);
          for(let pi=0; pi<parts.length; pi++){
            if(pi > 0 && hyphenInput.checked) ssmlBody += '-';
            ssmlBody += ssmlPieceForWord(parts[pi]);
          }
        } else if(mode === 'list'){
          const raw = String(input.value || '').normalize('NFC');
          const words = raw.split(/[\n\r\t,;]+/g).map(x=>x.trim()).filter(Boolean);
          const outs = [];
          for(const w of words){
            const parts = splitWordParts(w);
            let partOut = '';
            for(let pi=0; pi<parts.length; pi++){
              if(pi > 0 && hyphenInput.checked) partOut += '-';
              partOut += ssmlPieceForWord(parts[pi]);
            }
            outs.push(partOut);
          }
          ssmlBody = outs.join(', ');
        } else {
          const preserve = punctInput.checked;
          if(!preserve){
            const raw = String(input.value || '').normalize('NFC');
            const words = raw.split(/\s+/g).map(x=>x.trim()).filter(Boolean);
            const outs = [];
            for(const w of words){
              const parts = splitWordParts(w);
              let partOut = '';
              for(let pi=0; pi<parts.length; pi++){
                if(pi > 0 && hyphenInput.checked) partOut += '-';
                partOut += ssmlPieceForWord(parts[pi]);
              }
              outs.push(partOut);
            }
            ssmlBody = outs.join(' ');
          } else {
            const toks = tokenizeTextPreserve(input.value, hyphenInput.checked);
            for(const tok of toks){
              if(tok.type === 'sep'){
                ssmlBody += tok.text;
                continue;
              }
              ssmlBody += ssmlPieceForWord(tok.text);
            }
          }
        }
      }

      const baseSsml = speakInput.checked ? `<speak>${ssmlBody}</speak>` : ssmlBody;
      const teReoBlocksOnly = !!compactTeReoOnlyInput.checked;
      const compactAllowedByMode = !teReoBlocksOnly || outputMode === 'mixed' || outputMode === 'mixedAuto';
      const useCompact = (!!compactEnableInput.checked || !!compactIpaOnlyInput.checked) && compactAllowedByMode;
      let ssml = baseSsml;
      if(useCompact){
        try {
          ssml = applyCompactSsmlPostProcess(baseSsml, {
            splitSentence: !!compactSentenceInput.checked,
            splitNewline: !!compactNewlineInput.checked,
            splitSpace: !!compactSpaceInput.checked,
            ensureSpace: !!compactEnsureSpaceInput.checked,
            ipaOnly: !!compactIpaOnlyInput.checked,
            emptyBody: !!compactEmptyBodyInput.checked,
            wrapSpeak: !!speakInput.checked && !compactIpaOnlyInput.checked
          });
          if(ssml == null || ssml === '') ssml = baseSsml;
        } catch(_e){
          ssml = baseSsml;
        }
      }
      ssmlOut.value = ssml;

      _g2pAwsTtsSetStemFromInput(mode, input.value);
      lastAudioBlob = null;

      if(outputMode === 'plain'){
        mapWrap.appendChild(el('p', {}, ['Plain Speak mode: output is wrapped only in <speak> with no <phoneme> tags.']));
        if(traceInput.checked){
          const lines = [];
          lines.push(`inputMode: ${mode}`);
          lines.push(`outputMode: ${outputMode}`);
          lines.push(`wrapSpeak: ${speakInput.checked}`);
          traceWrap.appendChild(el('pre', {class:'mono', style:'white-space:pre-wrap;'}, [lines.join('\n')]));
        }
      } else {
        const mapped = items.filter(x => x && x.word != null);
        const t = el('table', {class:'table'});
        const thead = el('thead');
        thead.appendChild(el('tr', {}, [
          el('th', {}, ['Word']),
          el('th', {}, ['Segments']),
          el('th', {}, ['IPA']),
          el('th', {}, ['SSML'])
        ]));
        t.appendChild(thead);
        const tb = el('tbody');
        for(const r of mapped){
          const segStr = r.segments ? segmentsToString(r.segments) : '';
          const ipaStr = r.ipa || '';
          tb.appendChild(el('tr', {}, [
            el('td', {class:'mono'}, [String(r.word || '')]),
            el('td', {class:'mono'}, [segStr]),
            el('td', {class:'mono'}, [ipaStr]),
            el('td', {class:'mono'}, [String(r.ssmlPiece || r.phoneme || '')])
          ]));
        }
        t.appendChild(tb);
        mapWrap.appendChild(t);

        if(traceInput.checked){
          const missing = mapped.filter(x => x && x.rows && x.rows.some(rr => rr.status === 'missing'));
          const lines = [];
          lines.push(`inputMode: ${mode}`);
          lines.push(`joinMode: ${joinMode}`);
          lines.push(`outputMode: ${outputMode}`);
          lines.push(`wrapSpeak: ${speakInput.checked}`);
          lines.push(`emptyPhonemeBody: ${emptyBodyInput.checked}`);
          lines.push(`preservePunct: ${punctInput.checked}`);
          lines.push(`splitHyphen: ${hyphenInput.checked}`);
          lines.push(`trimNonFinalH: ${trimNonFinalHInput.checked}`);
          lines.push(`compactMode: ${compactEnableInput.checked}`);
          lines.push(`compactIpaOnly: ${compactIpaOnlyInput.checked}`);
          lines.push(`compactSplitSentence: ${compactSentenceInput.checked}`);
          lines.push(`compactSplitNewline: ${compactNewlineInput.checked}`);
          lines.push(`compactSplitSpace: ${compactSpaceInput.checked}`);
          lines.push(`compactEnsureSpace: ${compactEnsureSpaceInput.checked}`);
          lines.push(`compactTeReoBlocksOnly: ${compactTeReoOnlyInput.checked}`);
          lines.push(`compactEmptyBody: ${compactEmptyBodyInput.checked}`);
          lines.push(`autoDetectAmbiguousInfluence: ${(parseFloat((loadG2pAwsTtsPrefs().autoDetectAmbiguousInfluence ?? 1)) || 1).toFixed(2)}`);
          lines.push(`autoDetectParticleInfluence: ${(parseFloat((loadG2pAwsTtsPrefs().autoDetectParticleInfluence ?? 1)) || 1).toFixed(2)}`);
          lines.push(`strictMissing: ${strictInput.checked}`);
          if(missing.length){
            lines.push('');
            lines.push('Missing Lexicon Matches:');
            for(const r of missing){
              const missSegs = (r.rows || []).filter(rr => rr.status === 'missing').map(rr => rr.segment).filter(Boolean);
              lines.push(`- ${r.word}: ${missSegs.join(', ')}`);
            }
          }
          traceWrap.appendChild(el('pre', {class:'mono', style:'white-space:pre-wrap;'}, [lines.join('\n')]));
        }

        addG2pAwsTtsHistoryEntry({
          ts: new Date().toISOString(),
          inputMode: mode,
          inputText: String(input.value || '').normalize('NFC'),
          joinMode,
          outputMode,
          mixedWrap,
          ssml,
          cfg: {
            serviceRegion: serviceRegion.value,
            awsRegion: awsRegion.value,
            voiceId: voiceId.value,
            engine: engine.value,
            languageCode: languageCode.value,
            outputFormat: outputFormat.value
          },
          items: mapped
        });
      }

      if(outputMode === 'plain'){
        addG2pAwsTtsHistoryEntry({
          ts: new Date().toISOString(),
          inputMode: mode,
          inputText: String(input.value || '').normalize('NFC'),
          joinMode,
          outputMode,
          mixedWrap,
          ssml,
          cfg: {
            serviceRegion: serviceRegion.value,
            awsRegion: awsRegion.value,
            voiceId: voiceId.value,
            engine: engine.value,
            languageCode: languageCode.value,
            outputFormat: outputFormat.value
          },
          items: []
        });
      }

      drawHistory();
      return ssml;
    }

    function drawHistory(){
      const items = loadG2pAwsTtsHistory();
      histBody.innerHTML = '';
      for(const it of (items || [])){
        const when = String(it.ts || '');
        const mode = String(it.inputMode || '');
        const inPreview = String(it.inputText || '').replace(/\s+/g,' ').slice(0, 60);
        const voice = String((it.cfg && it.cfg.voiceId) || '');
        const region = String((it.cfg && it.cfg.awsRegion) || '');

        const tr = el('tr', {style:'cursor:pointer;'});
        tr.appendChild(el('td', {class:'mono'}, [when]));
        tr.appendChild(el('td', {class:'mono'}, [mode]));
        tr.appendChild(el('td', {}, [inPreview]));
        tr.appendChild(el('td', {class:'mono'}, [voice]));
        tr.appendChild(el('td', {class:'mono'}, [region]));

        tr.addEventListener('click', ()=>{
          input.value = it.inputText || '';
          modeSelect.value = it.inputMode || 'text';
          joinSelect.value = it.joinMode || 'dot';
          outputModeSelect.value = it.outputMode || 'phoneme';
          mixedWrap = Object.assign({}, (it.mixedWrap || mixedWrap || {}));
          _g2pAwsTtsUpdateOutputModeUI();
          ssmlOut.value = it.ssml || '';
          _g2pAwsTtsSetStemFromInput(it.inputMode || 'text', it.inputText || '');
          lastAudioBlob = null;
          if(it.cfg){
            serviceRegion.value = it.cfg.serviceRegion || serviceRegion.value;
            awsRegion.value = it.cfg.awsRegion || awsRegion.value;
            voiceId.value = it.cfg.voiceId || voiceId.value;
            engine.value = it.cfg.engine || engine.value;
            languageCode.value = it.cfg.languageCode || languageCode.value;
            outputFormat.value = it.cfg.outputFormat || outputFormat.value;
          }
        });

        histBody.appendChild(tr);
      }
    }

    btnGenerate.addEventListener('click', buildSsmlFromInput);
    for(const compactControl of [
      compactEnableInput,
      compactIpaOnlyInput,
      compactSentenceInput,
      compactNewlineInput,
      compactSpaceInput,
      compactEnsureSpaceInput,
      compactTeReoOnlyInput,
      compactEmptyBodyInput
    ]){
      compactControl.addEventListener('change', ()=>{
        saveG2pAwsTtsPrefs({
          ...loadG2pAwsTtsPrefs(),
          ssmlCompactEnabled: !!compactEnableInput.checked,
          ssmlCompactIpaOnly: !!compactIpaOnlyInput.checked,
          ssmlCompactSplitSentence: !!compactSentenceInput.checked,
          ssmlCompactSplitNewline: !!compactNewlineInput.checked,
          ssmlCompactSplitSpace: !!compactSpaceInput.checked,
          ssmlCompactEnsureSpace: !!compactEnsureSpaceInput.checked,
          ssmlCompactTeReoBlocksOnly: !!compactTeReoOnlyInput.checked,
          ssmlCompactEmptyBody: !!compactEmptyBodyInput.checked
        });
        buildSsmlFromInput();
      });
    }

    
    function _g2pAwsTtsRebuildMixed(){
      // rebuild list without generating SSML (includes duplicates in-order)
      const mode = modeSelect.value;
      const splitHyphen = !!hyphenInput.checked;
      const preserve = !!punctInput.checked;
      const raw = String(input.value || '').normalize('NFC');

      const tokens = [];
      let n = 0;
      const normKey = (s)=> String(s||'').trim().toLowerCase();

      function pushWord(word){
        const w = String(word || '').trim();
        if(!w) return;
        n += 1;
        const base = normKey(w) || 'word';
        const key = `${base}#${n}`;
        const label = `#${String(n).padStart(2,'0')} ${w}`;
        tokens.push({key, label, word:w, base});
      }

      function addWordOrParts(word){
        const w = String(word || '').trim();
        if(!w) return;
        if(splitHyphen){
          for(const p of w.split('-').filter(Boolean)) pushWord(p);
        } else {
          pushWord(w);
        }
      }

      if(mode === 'single'){
        addWordOrParts(raw.trim());
      } else if(mode === 'list'){
        const words = raw.split(/[\n\r\t,;]+/g).map(x=>x.trim()).filter(Boolean);
        for(const w of words) addWordOrParts(w);
      } else {
        if(preserve){
          const toks = tokenizeTextPreserve(raw, splitHyphen);
          for(const tok of toks){
            if(tok.type === 'word') pushWord(tok.text);
          }
        } else {
          const words = raw.split(/\s+/g).map(x=>x.trim()).filter(Boolean);
          for(const w of words) addWordOrParts(w);
        }
      }

      const filt = String(mixedFilter.value || '').trim().toLowerCase();
      mixedList.innerHTML = '';
      for(const tok of tokens){
        const key = tok.key;
        const base = tok.base;
        if(mixedWrap[key] === undefined){
          if(base && mixedWrap[base] !== undefined) mixedWrap[key] = mixedWrap[base];
          else mixedWrap[key] = true;
        }
        const label = tok.label || tok.word || key;
        if(filt && !label.toLowerCase().includes(filt) && !String(key).toLowerCase().includes(filt) && !String(tok.word||'').toLowerCase().includes(filt)) continue;

        const row = el('div', {style:'display:flex; align-items:center; gap:10px; padding:4px 2px;'});
        const cb = el('input', {type:'checkbox'});
        cb.checked = (mixedWrap[key] !== false);
        cb.addEventListener('change', ()=>{
          mixedWrap[key] = !!cb.checked;
          saveG2pAwsTtsPrefs({ ...loadG2pAwsTtsPrefs(), mixedWrap, outputMode: (outputModeSelect.value || 'mixed') });
        });
        row.appendChild(cb);
        row.appendChild(el('div', {class:'mono', style:'opacity:.95;'}, [label]));
        mixedList.appendChild(row);
      }
    }

    function _g2pAwsTtsUpdateOutputModeUI(){
      const om = outputModeSelect.value || 'phoneme';
      if(om === 'mixed'){
        mixedPanel.style.display = '';
        autoPanel.style.display = 'none';
        _g2pAwsTtsRebuildMixed();
      } else if(om === 'mixedAuto'){
        mixedPanel.style.display = 'none';
        autoPanel.style.display = '';
        scheduleAutoDetect();
      } else {
        mixedPanel.style.display = 'none';
        autoPanel.style.display = 'none';
      }
    }

    outputModeSelect.addEventListener('change', ()=>{
      const p = loadG2pAwsTtsPrefs();
      saveG2pAwsTtsPrefs({ ...p, outputMode: outputModeSelect.value || 'phoneme', mixedWrap });
      _g2pAwsTtsUpdateOutputModeUI();
    });

    btnMixedRefresh.addEventListener('click', _g2pAwsTtsRebuildMixed);
    mixedFilter.addEventListener('input', _g2pAwsTtsRebuildMixed);

    btnMixedAll.addEventListener('click', ()=>{
      const p = loadG2pAwsTtsPrefs();
      _g2pAwsTtsRebuildMixed();
      for(const k of Object.keys(mixedWrap || {})) mixedWrap[k] = true;
      saveG2pAwsTtsPrefs({ ...p, mixedWrap, outputMode: 'mixed' });
      _g2pAwsTtsRebuildMixed();
    });

    btnMixedNone.addEventListener('click', ()=>{
      const p = loadG2pAwsTtsPrefs();
      _g2pAwsTtsRebuildMixed();
      for(const k of Object.keys(mixedWrap || {})) mixedWrap[k] = false;
      saveG2pAwsTtsPrefs({ ...p, mixedWrap, outputMode: 'mixed' });
      _g2pAwsTtsRebuildMixed();
    });

    btnMixedInvert.addEventListener('click', ()=>{
      const p = loadG2pAwsTtsPrefs();
      _g2pAwsTtsRebuildMixed();
      for(const k of Object.keys(mixedWrap || {})) mixedWrap[k] = !(mixedWrap[k] !== false);
      saveG2pAwsTtsPrefs({ ...p, mixedWrap, outputMode: 'mixed' });
      _g2pAwsTtsRebuildMixed();
    });

    // initialize mixed panel based on stored prefs
    _g2pAwsTtsUpdateOutputModeUI();



    btnCopy.addEventListener('click', ()=>{
      const t = ssmlOut.value || '';
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t);
    });

    btnDownload.addEventListener('click', ()=>{
      downloadText((lastExportStem || 'g2p_aws_tts') + '.ssml', ssmlOut.value || '', 'text/plain');
    });

    btnClearHist.addEventListener('click', ()=>{
      saveG2pAwsTtsHistory([]);
      drawHistory();
    });

    btnExportHist.addEventListener('click', ()=>{
      const items = loadG2pAwsTtsHistory();
      downloadText('aws_tts_history.json', JSON.stringify(items || [], null, 2), 'application/json');
    });

    histFile.addEventListener('change', async ()=>{
      const f = histFile.files && histFile.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !Array.isArray(parsed.value)) return;
      saveG2pAwsTtsHistory(parsed.value);
      drawHistory();
      histFile.value = '';
    });

    btnSaveCfg.addEventListener('click', ()=>{
      const next = {
        ...loadG2pAwsTtsPrefs(),
        serviceRegion: serviceRegion.value,
        awsRegion: awsRegion.value,
        voiceId: voiceId.value,
        engine: engine.value,
        languageCode: languageCode.value,
        outputFormat: outputFormat.value
      };
      saveG2pAwsTtsPrefs(next);

      const remember = !!rememberInput.checked;
      if(remember){
        saveG2pAwsTtsCreds({
          remember: true,
          accessKeyId: accessKeyId.value,
          secretAccessKey: secretAccessKey.value,
          sessionToken: sessionToken.value
        });
      } else {
        saveG2pAwsTtsCreds({remember:false});
      }

      playTrace.textContent = 'Saved.';
    });

    

    btnDownloadMp3.addEventListener('click', ()=>{
      if(!lastAudioBlob){
        playTrace.textContent = 'No MP3 available. Click Play SSML first.';
        return;
      }
      const name = (lastExportStem || 'g2p_aws_tts') + '.mp3';
      _g2pAwsTtsDownloadBlob(name, lastAudioBlob);
    });

btnPlay.addEventListener('click', async ()=>{
      playTrace.textContent = '';
      const ssml = (ssmlOut.value || '').trim();
      if(!ssml){
        playTrace.textContent = 'No SSML to play.';
        return;
      }
      if(typeof AWS === 'undefined' || !AWS || !AWS.Polly){
        playTrace.textContent = 'AWS SDK not available. Check that the script loaded.';
        return;
      }
      const ak = String(accessKeyId.value || '').trim();
      const sk = String(secretAccessKey.value || '').trim();
      if(!ak || !sk){
        playTrace.textContent = 'Missing AWS credentials.';
        return;
      }
      try{
        AWS.config.region = awsRegion.value;
        AWS.config.credentials = new AWS.Credentials({
          accessKeyId: ak,
          secretAccessKey: sk,
          sessionToken: String(sessionToken.value || '').trim() || undefined
        });

        const polly = new AWS.Polly({apiVersion:'2016-06-10', region: awsRegion.value});
        const params = {
          Text: ssml,
          OutputFormat: outputFormat.value || 'mp3',
          VoiceId: voiceId.value || 'Aria',
          TextType: 'ssml',
          Engine: engine.value || 'neural'
        };
        const lc = String(languageCode.value || '').trim();
        if(lc) params.LanguageCode = lc;

        playTrace.textContent = JSON.stringify({params}, null, 2);

        const data = await polly.synthesizeSpeech(params).promise();
        if(!data || !data.AudioStream){
          playTrace.textContent += '\n\nNo audio stream in response.';
          return;
        }

        let blob;
        const stream = data.AudioStream;
        if(stream instanceof ArrayBuffer){
          blob = new Blob([stream], {type:'audio/mpeg'});
        } else if(stream && stream.buffer){
          blob = new Blob([stream.buffer], {type:'audio/mpeg'});
        } else {
          blob = new Blob([stream], {type:'audio/mpeg'});
        }

        lastAudioBlob = blob;

        audio.src = URL.createObjectURL(blob);
        await audio.play();
      } catch(e){
        playTrace.textContent = 'Error: ' + String(e && e.message ? e.message : e) + '\n\n' +
          'Boto3 params reference:\n' +
          "Text=ssml, OutputFormat='mp3', VoiceId='Aria', TextType='ssml', LanguageCode='en-NZ', Engine='neural'";
      }
    });

    // initial history render
    drawHistory();
  }

  function renderIpaLookupKeyboard(){
    const root = document.getElementById('pageIpaLookupKeyboard');
    root.innerHTML = '';

    const PREF_KEY = 'ipa_lookup_keyboard_prefs_v1';
    const prefs = safeJsonParse(localStorage.getItem(PREF_KEY) || '{}').value || {};

    let dictLoaded = false;
    let dictEntries = 0;
    let wordToIpas = new Map();     // wordKey -> Set(ipa)
    let ipaToWords = new Map();     // ipa -> Set(wordKey)
    let dictName = prefs.dictName || '';

    function savePrefs(extra = {}){
      const next = Object.assign({}, prefs, extra);
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    }

    function setStatus(node, text, kind){
      node.textContent = text;
      node.className = 'tag';
      if(kind === 'ok') node.classList.add('good');
      if(kind === 'warn') node.classList.add('bad');
    }

    function normalizeWordKey(s){
      return String(s || '').trim().toLowerCase();
    }

    function readFileAsText(file){
      return new Promise((resolve, reject)=>{
        const r = new FileReader();
        r.onload = ()=> resolve(String(r.result || ''));
        r.onerror = ()=> reject(r.error || new Error('File read failed'));
        r.readAsText(file);
      });
    }

    function resetDict(){
      dictLoaded = false;
      dictEntries = 0;
      wordToIpas = new Map();
      ipaToWords = new Map();
    }

    function parseDictText(text){
      resetDict();
      const lines = String(text || '').split(/\r?\n/g);
      for(const raw of lines){
        const line = raw.trim();
        if(!line) continue;
        if(line.startsWith(';;;')) continue;
        if(line.startsWith('#')) continue;

        // cmudict-ipa style: WORD  IPA...
        // allow tabs or multiple spaces
        const parts = line.split(/\s+/g);
        if(parts.length < 2) continue;

        const w = parts[0].replace(/\(\d+\)$/g, '');
        const ipa = parts.slice(1).join(' ').trim();
        if(!w || !ipa) continue;

        const key = normalizeWordKey(w);
        if(!wordToIpas.has(key)) wordToIpas.set(key, new Set());
        wordToIpas.get(key).add(ipa);

        if(!ipaToWords.has(ipa)) ipaToWords.set(ipa, new Set());
        ipaToWords.get(ipa).add(key);

        dictEntries++;
      }
      dictLoaded = dictEntries > 0;
      return { ok: dictLoaded, entries: dictEntries };
    }

    async function tryAutoFetch(statusNode, metaNode){
      setStatus(statusNode, 'Trying to auto-load cmudict-0.7b-ipa.txt from the same folder...', 'warn');
      metaNode.textContent = '';
      try{
        const res = await fetch('cmudict-0.7b-ipa.txt', { cache: 'no-store' });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const r = parseDictText(text);
        dictName = 'cmudict-0.7b-ipa.txt';
        savePrefs({ dictName });
        setStatus(statusNode, `Dictionary loaded (${r.entries.toLocaleString()} entries).`, 'ok');
        metaNode.textContent = 'Source: auto-load from same folder';
        rerunSearches();
      }catch(err){
        console.warn(err);
        setStatus(statusNode, 'Auto-load failed. Use the file picker or drag and drop a dictionary TXT.', 'warn');
      }
    }

    function rerunSearches(){
      doWordSearch();
      doIpaSearch();
    }

    // Layout
    const topCard = el('div', {class:'card'});
    topCard.appendChild(el('h2', {}, ['IPA Lookup And Keyboard']));
    topCard.appendChild(el('p', {style:'margin-top:6px;'}, [
      'Load a dictionary (cmudict IPA format works well) then search words or IPA and use the symbol keyboard to build IPA. You can insert into the scratchpad, the active field, or the G2P - AWS TTS fields.'
    ]));
    root.appendChild(topCard);

    const dictCard = el('div', {class:'card'});
    dictCard.appendChild(el('h2', {}, ['Dictionary']));
    const dictStatus = el('div', {class:'tag', style:'margin-top:8px;'}, ['Dictionary not loaded']);
    const dictMeta = el('div', {class:'muted', style:'margin-top:6px;'}, [dictName ? `Last: ${dictName}` : 'Tip: place cmudict-0.7b-ipa.txt next to this HTML for auto-load.']);
    const dictRow = el('div', {class:'row', style:'margin-top:10px;'});
    const dictFile = el('input', {type:'file', accept:'.txt'});
    const btnAuto = el('button', {class:'btn', type:'button'}, ['Try Auto Load']);
    const btnClear = el('button', {class:'btn', type:'button'}, ['Clear Dictionary']);
    dictRow.appendChild(dictFile);
    dictRow.appendChild(btnAuto);
    dictRow.appendChild(btnClear);

    const dropZone = el('div', {style:'margin-top:10px; padding:12px; border:1px dashed var(--border); border-radius:12px; background:var(--surfaceTable);'}, [
      el('div', {class:'muted'}, ['Drag and drop a dictionary TXT file here'])
    ]);

    dictCard.appendChild(dictStatus);
    dictCard.appendChild(dictMeta);
    dictCard.appendChild(dictRow);
    dictCard.appendChild(dropZone);
    root.appendChild(dictCard);

    btnAuto.onclick = ()=> tryAutoFetch(dictStatus, dictMeta);
    btnClear.onclick = ()=>{
      resetDict();
      setStatus(dictStatus, 'Dictionary cleared.', 'warn');
      dictMeta.textContent = '';
      rerunSearches();
    };

    async function loadDictFile(file){
      if(!file) return;
      try{
        const text = await readFileAsText(file);
        const r = parseDictText(text);
        dictName = file.name || 'dictionary.txt';
        savePrefs({ dictName });
        setStatus(dictStatus, `Dictionary loaded (${r.entries.toLocaleString()} entries).`, 'ok');
        dictMeta.textContent = `Source: ${dictName}`;
        rerunSearches();
      }catch(err){
        console.error(err);
        setStatus(dictStatus, 'Failed to read the selected file.', 'warn');
      }
    }

    dictFile.addEventListener('change', ()=> loadDictFile(dictFile.files && dictFile.files[0]));
    dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.style.background = 'var(--dropHover)'; });
    dropZone.addEventListener('dragleave', ()=>{ dropZone.style.background = 'var(--surfaceTable)'; });
    dropZone.addEventListener('drop', (e)=>{
      e.preventDefault();
      dropZone.style.background = 'var(--surfaceTable)';
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if(f) loadDictFile(f);
    });

    // Insert target and scratchpad
    const kbCard = el('div', {class:'card'});
    kbCard.appendChild(el('h2', {}, ['Keyboard']));
    const scratch = el('textarea', {id:'ipaScratchpad', class:'mono', rows:'4', placeholder:'Build IPA here then copy or insert into other fields'});
    scratch.value = prefs.scratch || '';

    const insertRow = el('div', {class:'row', style:'margin-top:10px;'});
    const insertTarget = el('select', {class:'btn', title:'Insert target'});
    insertTarget.style.padding = '8px 10px';
    insertTarget.style.borderRadius = '10px';
    insertTarget.style.background = 'var(--surfaceStrong)';
    insertTarget.style.border = '1px solid var(--border)';
    insertTarget.style.color = 'var(--text)';

    const targets = [
      {v:'scratch', t:'Target: Scratchpad'},
      {v:'active', t:'Target: Active Field'},
      {v:'awsInput', t:'Target: AWS TTS Input'},
      {v:'awsSsml', t:'Target: SSML Output'}
    ];
    for(const t of targets){
      const o = el('option', {value:t.v}, [t.t]);
      if(t.v === (prefs.insertTarget || 'scratch')) o.selected = true;
      insertTarget.appendChild(o);
    }

    const activeNote = el('div', {class:'tag', style:'align-self:center; opacity:.9;'}, ['Active Field: none']);
    insertRow.appendChild(insertTarget);
    insertRow.appendChild(activeNote);

    function refreshActiveNote(){
      const elx = APP_SHARED.lastFocused;
      if(!elx) { activeNote.textContent = 'Active Field: none'; return; }
      const tag = (elx.tagName || '').toLowerCase();
      const id = elx.id ? `#${elx.id}` : '';
      activeNote.textContent = `Active Field: ${tag}${id}`;
    }
    refreshActiveNote();
    APP_SHARED.onFocus = refreshActiveNote;

    function getTargetEl(){
      const v = insertTarget.value;
      if(v === 'scratch') return scratch;
      if(v === 'awsInput') return APP_SHARED.awsTtsInputEl || null;
      if(v === 'awsSsml') return APP_SHARED.awsTtsSsmlEl || null;
      return APP_SHARED.lastFocused || null;
    }

    const scratchBtns = el('div', {class:'row', style:'margin-top:10px;'});
    const btnCopy = el('button', {class:'btn', type:'button'}, ['Copy Scratchpad']);
    const btnClearScratch = el('button', {class:'btn', type:'button'}, ['Clear Scratchpad']);
    const btnInsertPhoneme = el('button', {class:'btn', type:'button'}, ['Insert <phoneme>']);
    scratchBtns.appendChild(btnCopy);
    scratchBtns.appendChild(btnClearScratch);
    scratchBtns.appendChild(btnInsertPhoneme);

    btnCopy.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(scratch.value || ''); }catch(_e){}
    };
    btnClearScratch.onclick = ()=>{
      scratch.value = '';
      savePrefs({ scratch: '' });
    };
    btnInsertPhoneme.onclick = ()=>{
      const t = getTargetEl();
      wrapSelectionText(t, '<phoneme alphabet="ipa" ph="', '"></phoneme>');
    };

    // Symbol list
    const filter = el('input', {type:'text', placeholder:'Filter symbols like stress, long, ə, ŋ'});
    filter.style.marginTop = '10px';
    filter.style.width = '100%';
    filter.style.padding = '10px';
    filter.style.borderRadius = '12px';
    filter.style.border = '1px solid var(--border)';
    filter.style.background = 'var(--surfaceTable)';
    filter.style.color = 'var(--text)';

    const select = el('select', {size:'10', style:'width:100%; margin-top:8px; max-height:260px; overflow:auto;'});
    select.innerHTML = IPA_SYMBOL_OPTIONS_HTML;

    const btnInsertSym = el('button', {class:'btn', type:'button', style:'margin-top:8px;'}, ['Insert Symbol']);
    btnInsertSym.onclick = ()=>{
      const opt = select.options[select.selectedIndex];
      if(!opt) return;
      const symbol = opt.value || opt.textContent.split(' - ')[0];
      insertAtCursorText(getTargetEl(), symbol);
    };

    filter.addEventListener('input', ()=>{
      const q = (filter.value || '').trim().toLowerCase();
      for(const opt of Array.from(select.options)){
        const txt = (opt.textContent || '').toLowerCase();
        opt.hidden = q ? !txt.includes(q) : false;
      }
    });

    scratch.addEventListener('input', ()=> savePrefs({ scratch: scratch.value, insertTarget: insertTarget.value }));
    insertTarget.addEventListener('change', ()=> savePrefs({ insertTarget: insertTarget.value }));

    kbCard.appendChild(insertRow);
    kbCard.appendChild(el('label', {style:'margin-top:10px; display:block;'}, ['Scratchpad']));
    kbCard.appendChild(scratch);
    kbCard.appendChild(scratchBtns);
    kbCard.appendChild(filter);
    kbCard.appendChild(select);
    kbCard.appendChild(btnInsertSym);
    root.appendChild(kbCard);

    // Word lookup
    const wordCard = el('div', {class:'card'});
    wordCard.appendChild(el('h2', {}, ['Word To IPA']));
    const wordRow = el('div', {class:'row'});
    const wordInput = el('input', {type:'text', placeholder:'Enter a word, example: council'});
    wordInput.value = prefs.wordQuery || '';
    wordInput.style.minWidth = '240px';

    const wordMode = el('select', {class:'btn'});
    const wordModes = [
      {v:'starts', t:'Starts With'},
      {v:'contains', t:'Contains'},
      {v:'exact', t:'Exact'},
      {v:'ends', t:'Ends With'}
    ];
    for(const m of wordModes){
      const o = el('option', {value:m.v}, [m.t]);
      if(m.v === (prefs.wordMode || 'starts')) o.selected = true;
      wordMode.appendChild(o);
    }

    const sortSel = el('select', {class:'btn', title:'Sort'});
    const sortOpts = [
      {v:'alpha', t:'Sort: A-Z'},
      {v:'len', t:'Sort: Length'},
      {v:'hits', t:'Sort: Most IPA'}
    ];
    for(const s of sortOpts){
      const o = el('option', {value:s.v}, [s.t]);
      if(s.v === (prefs.wordSort || 'alpha')) o.selected = true;
      sortSel.appendChild(o);
    }

    const limitSel = el('select', {class:'btn', title:'Limit'});
    for(const n of [25,50,100,200,500]){
      const o = el('option', {value:String(n)}, [String(n)]);
      if(String(n) === String(prefs.wordLimit || 100)) o.selected = true;
      limitSel.appendChild(o);
    }

    const btnWord = el('button', {class:'btn primary', type:'button'}, ['Search']);
    wordRow.appendChild(wordInput);
    wordRow.appendChild(wordMode);
    wordRow.appendChild(sortSel);
    wordRow.appendChild(limitSel);
    wordRow.appendChild(btnWord);

    const wordResults = el('div', {style:'margin-top:10px;'});
    wordCard.appendChild(wordRow);
    wordCard.appendChild(wordResults);
    root.appendChild(wordCard);

    function doWordSearch(){
      wordResults.innerHTML = '';
      const q = String(wordInput.value || '').trim().toLowerCase();
      savePrefs({ wordQuery:q, wordMode:wordMode.value, wordLimit:Number(limitSel.value), wordSort:sortSel.value });
      if(!q){
        wordResults.appendChild(el('div', {class:'muted'}, ['Enter a word to search.']));
        return;
      }
      if(!dictLoaded){
        wordResults.appendChild(el('div', {class:'muted'}, ['Dictionary not loaded yet. Load one above first.']));
        return;
      }

      const mode = wordMode.value;
      const limit = Math.max(1, Number(limitSel.value) || 100);
      let matches = [];
      for(const [w, ipas] of wordToIpas.entries()){
        if(mode === 'exact' && w === q) matches.push([w, ipas]);
        else if(mode === 'starts' && w.startsWith(q)) matches.push([w, ipas]);
        else if(mode === 'ends' && w.endsWith(q)) matches.push([w, ipas]);
        else if(mode === 'contains' && w.includes(q)) matches.push([w, ipas]);
      }

      if(sortSel.value === 'alpha'){
        matches.sort((a,b)=> a[0].localeCompare(b[0]));
      }else if(sortSel.value === 'len'){
        matches.sort((a,b)=> a[0].length - b[0].length || a[0].localeCompare(b[0]));
      }else{
        matches.sort((a,b)=> b[1].size - a[1].size || a[0].localeCompare(b[0]));
      }

      matches = matches.slice(0, limit);

      const header = el('div', {class:'muted'}, [`Matches: ${matches.length.toLocaleString()}`]);
      wordResults.appendChild(header);

      for(const [w, ipas] of matches){
      const box = el('div', {style:'margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surfaceTable);'});
        box.appendChild(el('div', {style:'font-weight:700;'}, [w]));
        const grid = el('div', {class:'pillGrid', style:'margin-top:8px;'});
        for(const ipa of Array.from(ipas)){
          const btn = el('button', {class:'tag', type:'button', title:'Insert IPA', onclick:()=>{
            insertAtCursorText(getTargetEl(), ipa);
          }}, [ipa]);
          grid.appendChild(btn);
        }
        box.appendChild(grid);
        wordResults.appendChild(box);
      }
    }

    btnWord.onclick = doWordSearch;
    wordInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); doWordSearch(); } });

    // IPA lookup
    const ipaCard = el('div', {class:'card'});
    ipaCard.appendChild(el('h2', {}, ['IPA To Words']));
    const ipaRow = el('div', {class:'row'});
    const ipaInput = el('input', {type:'text', class:'mono', placeholder:'Enter IPA, example: ˈkæt'});
    ipaInput.value = prefs.ipaQuery || '';
    ipaInput.style.minWidth = '260px';

    const ipaMode = el('select', {class:'btn'});
    const ipaModes = [
      {v:'contains', t:'Contains'},
      {v:'exact', t:'Exact'}
    ];
    for(const m of ipaModes){
      const o = el('option', {value:m.v}, [m.t]);
      if(m.v === (prefs.ipaMode || 'contains')) o.selected = true;
      ipaMode.appendChild(o);
    }

    const ipaLimit = el('select', {class:'btn', title:'Limit'});
    for(const n of [25,50,100,200,500]){
      const o = el('option', {value:String(n)}, [String(n)]);
      if(String(n) === String(prefs.ipaLimit || 100)) o.selected = true;
      ipaLimit.appendChild(o);
    }

    const btnIpa = el('button', {class:'btn primary', type:'button'}, ['Search']);
    ipaRow.appendChild(ipaInput);
    ipaRow.appendChild(ipaMode);
    ipaRow.appendChild(ipaLimit);
    ipaRow.appendChild(btnIpa);

    const ipaResults = el('div', {style:'margin-top:10px;'});
    ipaCard.appendChild(ipaRow);
    ipaCard.appendChild(ipaResults);
    root.appendChild(ipaCard);

    function doIpaSearch(){
      ipaResults.innerHTML = '';
      const q = String(ipaInput.value || '').trim();
      savePrefs({ ipaQuery:q, ipaMode:ipaMode.value, ipaLimit:Number(ipaLimit.value) });
      if(!q){
        ipaResults.appendChild(el('div', {class:'muted'}, ['Enter IPA to search.']));
        return;
      }
      if(!dictLoaded){
        ipaResults.appendChild(el('div', {class:'muted'}, ['Dictionary not loaded yet. Load one above first.']));
        return;
      }

      const mode = ipaMode.value;
      const limit = Math.max(1, Number(ipaLimit.value) || 100);

      let matches = [];
      for(const [ipa, words] of ipaToWords.entries()){
        if(mode === 'exact' && ipa === q) matches.push([ipa, words]);
        else if(mode === 'contains' && ipa.includes(q)) matches.push([ipa, words]);
      }

      matches.sort((a,b)=> b[1].size - a[1].size || a[0].localeCompare(b[0]));
      matches = matches.slice(0, limit);

      ipaResults.appendChild(el('div', {class:'muted'}, [`Matches: ${matches.length.toLocaleString()}`]));

      for(const [ipa, words] of matches){
      const box = el('div', {style:'margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surfaceTable);'});
        const top = el('div', {style:'display:flex; gap:10px; align-items:center; flex-wrap:wrap;'});
        top.appendChild(el('div', {class:'mono', style:'font-weight:700;'}, [ipa]));
        top.appendChild(el('button', {class:'tag', type:'button', onclick:()=> insertAtCursorText(getTargetEl(), ipa)}, ['Insert IPA']));
        box.appendChild(top);

        const grid = el('div', {class:'pillGrid', style:'margin-top:8px;'});
        const list = Array.from(words).sort((a,b)=> a.localeCompare(b));
        for(const w of list.slice(0, 50)){
          const btn = el('button', {class:'tag', type:'button', title:'Insert word', onclick:()=> insertAtCursorText(getTargetEl(), w)}, [w]);
          grid.appendChild(btn);
        }
        box.appendChild(grid);

        ipaResults.appendChild(box);
      }
    }

    btnIpa.onclick = doIpaSearch;
    ipaInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); doIpaSearch(); } });

    // Remember: AWS output/input nodes may not exist until user opens that tab at least once
    // Auto-run if dictionary was previously loaded via auto-load
  if(prefs.autoLoadOnOpen && !dictLoaded){
      tryAutoFetch(dictStatus, dictMeta);
    }
  }

const STT_CORRECTION_DICT_STATE = {
  loaded: false,
  loading: null,
  entries: 0,
  source: '',
  wordToIpas: new Map(),
  ipaToWords: new Map()
};

const STT_CORRECTION_LEXICON_CACHE = Object.create(null);
let STT_CORRECTION_ARRAY_SCRIPT_LOADING = null;

function normalizeSttCorrectionWordKey(s){
  return String(s || '').trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

function getSttCorrectionOrthographicKey(s){
  return normalizeSttCorrectionWordKey(stripSttCorrectionMarks(String(s || '')));
}

function resetSttCorrectionDictState(){
  STT_CORRECTION_DICT_STATE.loaded = false;
  STT_CORRECTION_DICT_STATE.entries = 0;
  STT_CORRECTION_DICT_STATE.source = '';
  STT_CORRECTION_DICT_STATE.wordToIpas = new Map();
  STT_CORRECTION_DICT_STATE.ipaToWords = new Map();
}

function parseSttCorrectionDictText(text, sourceLabel){
  resetSttCorrectionDictState();
  const lines = String(text || '').split(/\r?\n/g);
  for(const raw of lines){
    const line = raw.trim();
    if(!line) continue;
    if(line.startsWith(';;;')) continue;
    if(line.startsWith('#')) continue;
    const parts = line.split(/\s+/g);
    if(parts.length < 2) continue;
    const word = parts[0].replace(/\(\d+\)$/g, '');
    const ipaList = parts.slice(1).join(' ').split(/\s*,\s*/g).map(x => String(x || '').trim()).filter(Boolean);
    if(!word || !ipaList.length) continue;
    const key = normalizeSttCorrectionWordKey(word);
    if(!key) continue;
    if(!STT_CORRECTION_DICT_STATE.wordToIpas.has(key)) STT_CORRECTION_DICT_STATE.wordToIpas.set(key, new Set());
    for(const ipa of ipaList){
      STT_CORRECTION_DICT_STATE.wordToIpas.get(key).add(ipa);
      if(!STT_CORRECTION_DICT_STATE.ipaToWords.has(ipa)) STT_CORRECTION_DICT_STATE.ipaToWords.set(ipa, new Set());
      STT_CORRECTION_DICT_STATE.ipaToWords.get(ipa).add(key);
      STT_CORRECTION_DICT_STATE.entries += 1;
    }
  }
  STT_CORRECTION_DICT_STATE.loaded = STT_CORRECTION_DICT_STATE.entries > 0;
  STT_CORRECTION_DICT_STATE.source = sourceLabel || '';
  return { ok: STT_CORRECTION_DICT_STATE.loaded, entries: STT_CORRECTION_DICT_STATE.entries, source: STT_CORRECTION_DICT_STATE.source };
}

function parseSttCorrectionDictArray(rows, sourceLabel){
  resetSttCorrectionDictState();
  for(const row of (Array.isArray(rows) ? rows : [])){
    if(!Array.isArray(row) || row.length < 2) continue;
    const word = String(row[0] || '').replace(/\(\d+\)$/g, '');
    const ipaList = Array.isArray(row[1]) ? row[1] : [];
    if(!word || !ipaList.length) continue;
    const key = normalizeSttCorrectionWordKey(word);
    if(!key) continue;
    if(!STT_CORRECTION_DICT_STATE.wordToIpas.has(key)) STT_CORRECTION_DICT_STATE.wordToIpas.set(key, new Set());
    for(const rawIpa of ipaList){
      const ipa = String(rawIpa || '').trim();
      if(!ipa) continue;
      STT_CORRECTION_DICT_STATE.wordToIpas.get(key).add(ipa);
      if(!STT_CORRECTION_DICT_STATE.ipaToWords.has(ipa)) STT_CORRECTION_DICT_STATE.ipaToWords.set(ipa, new Set());
      STT_CORRECTION_DICT_STATE.ipaToWords.get(ipa).add(key);
      STT_CORRECTION_DICT_STATE.entries += 1;
    }
  }
  STT_CORRECTION_DICT_STATE.loaded = STT_CORRECTION_DICT_STATE.entries > 0;
  STT_CORRECTION_DICT_STATE.source = sourceLabel || '';
  return { ok: STT_CORRECTION_DICT_STATE.loaded, entries: STT_CORRECTION_DICT_STATE.entries, source: STT_CORRECTION_DICT_STATE.source };
}

function getSttCorrectionArrayGlobal(){
  if(typeof window !== 'undefined' && Array.isArray(window.CMUDICT_IPA)) return window.CMUDICT_IPA;
  if(typeof globalThis !== 'undefined' && Array.isArray(globalThis.CMUDICT_IPA)) return globalThis.CMUDICT_IPA;
  return null;
}

async function loadSttCorrectionArrayScript(){
  const existingArray = getSttCorrectionArrayGlobal();
  if(existingArray && existingArray.length){
    return { ok:true, entries: existingArray.length, source:'cmudict-0.7b-ipa-array.js' };
  }
  if(STT_CORRECTION_ARRAY_SCRIPT_LOADING) return STT_CORRECTION_ARRAY_SCRIPT_LOADING;
  STT_CORRECTION_ARRAY_SCRIPT_LOADING = new Promise(resolve =>{
    if(typeof document === 'undefined'){
      resolve({ ok:false, entries:0, source:'array-script-unavailable' });
      return;
    }
    const existing = document.querySelector('script[data-reorite-cmudict-array="1"]');
    const finish = ()=>{
      const rows = getSttCorrectionArrayGlobal();
      resolve(rows && rows.length
        ? { ok:true, entries: rows.length, source:'cmudict-0.7b-ipa-array.js' }
        : { ok:false, entries:0, source:'array-script-empty' });
    };
    const fail = ()=> resolve({ ok:false, entries:0, source:'array-script-load-failed' });
    if(existing){
      existing.addEventListener('load', finish, { once:true });
      existing.addEventListener('error', fail, { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = './cmudict-0.7b-ipa-array.js';
    script.async = true;
    script.dataset.reoriteCmudictArray = '1';
    script.addEventListener('load', finish, { once:true });
    script.addEventListener('error', fail, { once:true });
    document.head.appendChild(script);
  });
  try{
    return await STT_CORRECTION_ARRAY_SCRIPT_LOADING;
  } finally {
    STT_CORRECTION_ARRAY_SCRIPT_LOADING = null;
  }
}

async function trySttCorrectionArrayFallback(){
  const scriptState = await loadSttCorrectionArrayScript();
  if(!scriptState.ok) return scriptState;
  const rows = getSttCorrectionArrayGlobal();
  if(!rows || !rows.length) return { ok:false, entries:0, source:'array-script-empty' };
  return parseSttCorrectionDictArray(rows, 'cmudict-0.7b-ipa-array.js');
}

async function ensureSttCorrectionDictLoaded(){
  if(STT_CORRECTION_DICT_STATE.loaded) return { ok:true, entries: STT_CORRECTION_DICT_STATE.entries, source: STT_CORRECTION_DICT_STATE.source };
  if(STT_CORRECTION_DICT_STATE.loading) return STT_CORRECTION_DICT_STATE.loading;
  STT_CORRECTION_DICT_STATE.loading = (async ()=>{
    if(typeof location !== 'undefined' && String(location.protocol || '') === 'file:'){
      const arrayFallback = await trySttCorrectionArrayFallback();
      if(arrayFallback.ok) return arrayFallback;
      return { ok:false, entries:0, source:'file-protocol-blocked' };
    }
    const candidates = [
      { path:'cmudict-0.7b-ipa.txt', label:'same folder' },
      { path:'../Docs/cmudict-0.7b-ipa.txt', label:'Docs/cmudict-0.7b-ipa.txt' }
    ];
    for(const candidate of candidates){
      try{
        const res = await fetch(candidate.path, { cache:'no-store' });
        if(!res.ok) continue;
        const text = await res.text();
        const parsed = parseSttCorrectionDictText(text, candidate.label);
        if(parsed.ok) return parsed;
      }catch(_err){
        // Keep trying the next local source.
      }
    }
    const arrayFallback = await trySttCorrectionArrayFallback();
    if(arrayFallback.ok) return arrayFallback;
    return { ok:false, entries:0, source:'' };
  })();
  try{
    return await STT_CORRECTION_DICT_STATE.loading;
  } finally {
    STT_CORRECTION_DICT_STATE.loading = null;
  }
}

function stripSttCorrectionMarks(s){
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF]/g, '');
}

const STT_CORRECTION_BREAK_MARKERS = new Set(["'", 'ˈ', 'ˌ', '.', ':', 'ː', '-', '/', '\\']);
const STT_CORRECTION_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const STT_CORRECTION_DIGRAPH_BREAKS = ['ng', 'wh'];
const STT_CORRECTION_SUBSTITUTES = {
  a: ['u'],
  h: ['r'],
  i: ['y'],
  k: ['c', 'k', 'g', 'x'],
  m: ['n', 'w', 'f'],
  n: ['l', 'v', 'b'],
  p: ['b', 't', 'r', 'd', 'k', 'v', 'h'],
  r: ['d'],
  t: ['r', 'y', 'p', 'b', 'd'],
  w: ['r', 'v', 'b'],
  wh: ['f', 'th', 's', 'b']
};

function getDefaultSttCorrectionSubstituteRules(){
  return Object.fromEntries(
    Object.entries(STT_CORRECTION_SUBSTITUTES).map(([key, values])=> [key, values.slice()])
  );
}

function normalizeSttCorrectionRuleToken(s){
  return String(s || '').trim().toLowerCase().replace(/[^a-z]/g, '');
}

function normalizeSttCorrectionSubstituteRules(input){
  const base = getDefaultSttCorrectionSubstituteRules();
  if(!input || typeof input !== 'object' || Array.isArray(input)) return base;
  const out = {};
  const entries = Object.entries(input);
  for(const [rawKey, rawValues] of entries){
    const key = normalizeSttCorrectionRuleToken(rawKey);
    if(!key) continue;
    const values = Array.isArray(rawValues)
      ? rawValues
      : String(rawValues || '').split(/[\s,]+/g);
    const next = Array.from(new Set(values.map(normalizeSttCorrectionRuleToken).filter(Boolean)));
    out[key] = next;
  }
  for(const [key, values] of Object.entries(base)){
    if(!(key in out)) out[key] = values.slice();
  }
  return out;
}

function parseSttCorrectionSubstituteRulesText(text){
  const out = {};
  const lines = String(text || '').split(/\r?\n/g);
  for(const rawLine of lines){
    const line = rawLine.trim();
    if(!line || line.startsWith('#')) continue;
    const parts = line.split(/\s*[:=-]>\s*|\s*[-:]\s*/g).filter(Boolean);
    if(parts.length < 2) continue;
    const key = normalizeSttCorrectionRuleToken(parts.shift());
    if(!key) continue;
    const values = parts.join(' ')
      .split(/[\s,]+/g)
      .map(normalizeSttCorrectionRuleToken)
      .filter(Boolean);
    out[key] = Array.from(new Set(values));
  }
  return normalizeSttCorrectionSubstituteRules(out);
}

function formatSttCorrectionSubstituteRulesText(rules){
  return Object.entries(normalizeSttCorrectionSubstituteRules(rules))
    .sort((a, b)=> a[0].localeCompare(b[0]))
    .map(([key, values])=> `${key} - ${values.join(' ')}`)
    .join('\n');
}

function isSttCorrectionConsonantChar(ch){
  return /[bcdfghjklmnpqrstvwxyz]/.test(String(ch || ''));
}

function collapseRepeatedSttCorrectionConsonants(word){
  const source = String(word || '');
  const steps = [];
  const value = source.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, (match, ch, offset)=>{
    if(match.length > 1){
      steps.push({ stage:'preIpaCollapse', source:match, target:ch, index:offset });
    }
    return ch;
  });
  return { value, steps };
}

function getSttCorrectionEnabledPreIpaSubstituteMap(options){
  const rules = normalizeSttCorrectionSubstituteRules((options && options.substituteRules) || null);
  const toggles = cloneSttCorrectionSubstitutions(options && options.substitutions);
  const out = new Map();
  for(const [target, sources] of Object.entries(rules)){
    if(!toggles[target]) continue;
    for(const source of (sources || [])){
      const key = normalizeSttCorrectionRuleToken(source);
      if(!key) continue;
      if(!out.has(key)) out.set(key, new Set());
      out.get(key).add(target);
    }
  }
  return new Map(Array.from(out.entries()).sort((a, b)=> b[0].length - a[0].length || a[0].localeCompare(b[0])));
}

function generateSttCorrectionSegmentVariants(segment, substituteMap, segmentIndex, limit){
  const source = String(segment || '');
  const results = [];
  const seen = new Set();

  function pushVariant(text, steps){
    const key = `${text}::${steps.map(step => `${step.source}>${step.target}@${step.index}`).join('|')}`;
    if(seen.has(key)) return;
    seen.add(key);
    results.push({ text, steps });
  }

  function walk(pos, built, steps){
    if(results.length >= limit) return;
    if(pos >= source.length){
      pushVariant(built, steps);
      return;
    }
    walk(pos + 1, built + source.charAt(pos), steps);
    for(const [from, targets] of substituteMap.entries()){
      if(!source.startsWith(from, pos)) continue;
      for(const target of targets){
        walk(
          pos + from.length,
          built + target,
          steps.concat([{ stage:'preIpaSubstitute', source:from, target, index:pos, segmentIndex }])
        );
      }
    }
  }

  walk(0, '', []);
  return results.slice(0, limit);
}

function combineSttCorrectionSegmentVariants(groups, limit){
  const results = [];
  function walk(index, built, steps){
    if(results.length >= limit) return;
    if(index >= groups.length){
      results.push({ value: built.join(''), steps });
      return;
    }
    for(const variant of groups[index]){
      walk(index + 1, built.concat([variant.text]), steps.concat(variant.steps || []));
      if(results.length >= limit) return;
    }
  }
  walk(0, [], []);
  return results;
}

function getSttCorrectionWordSegments(word){
  const base = normalizeSttCorrectionWordKey(word);
  const boundaries = getSttCorrectionFallbackBreaks(base);
  const segments = [];
  let start = 0;
  for(const point of boundaries){
    if(point <= start || point >= base.length) continue;
    segments.push(base.slice(start, point));
    start = point;
  }
  if(start < base.length) segments.push(base.slice(start));
  return { base, boundaries, segments: segments.filter(Boolean) };
}

function generateSttCorrectionPreIpaWordVariants(word, options){
  const { base, segments } = getSttCorrectionWordSegments(word);
  if(!base || !(options && options.preIpaSubstitutionsEnabled)) return [];
  const substituteMap = getSttCorrectionEnabledPreIpaSubstituteMap(options);
  if(!substituteMap.size) return [];
  const perSegmentLimit = Math.max(8, Number(options.preIpaSegmentLimit || 12));
  const totalLimit = Math.max(24, Number(options.preIpaVariantLimit || 64));
  const groups = (segments.length ? segments : [base]).map((segment, segmentIndex)=>
    generateSttCorrectionSegmentVariants(segment, substituteMap, segmentIndex, perSegmentLimit)
  );
  const combined = combineSttCorrectionSegmentVariants(groups, totalLimit);
  const out = [];
  const seen = new Set();
  for(const item of combined){
    const steps = (item.steps || []).slice();
    if(!steps.length) continue;
    const pushed = [{ value:item.value, steps }];
    if(options.preIpaCollapseRepeatingConsonants){
      const collapsed = collapseRepeatedSttCorrectionConsonants(item.value);
      if(collapsed.value && collapsed.value !== item.value){
        pushed.push({ value: collapsed.value, steps: steps.concat(collapsed.steps || []) });
      }
    }
    for(const variant of pushed){
      const key = `${variant.value}::${variant.steps.map(step => `${step.source}>${step.target}@${step.index}:${step.stage}`).join('|')}`;
      if(!variant.value || variant.value === base || seen.has(key)) continue;
      seen.add(key);
      out.push(variant);
      if(out.length >= totalLimit) return out;
    }
  }
  return out;
}

function cloneSttCorrectionSubstitutions(input){
  const rules = getDefaultSttCorrectionSubstituteRules();
  const out = {};
  for(const key of Object.keys(rules)){
    out[key] = !!(input && input[key]);
  }
  return out;
}

function defaultSttCorrectionSubstitutions(){
  return cloneSttCorrectionSubstitutions(null);
}

function normalizeSttCorrectionCharSequence(raw, index){
  const rest = raw.slice(index);
  if(rest.startsWith('oʊ') || rest.startsWith('əʊ') || rest.startsWith('ɔʊ')) return { text:'o', consume:2 };
  if(rest.startsWith('eɪ')) return { text:'ei', consume:2 };
  if(rest.startsWith('aɪ')) return { text:'ai', consume:2 };
  if(rest.startsWith('aʊ')) return { text:'au', consume:2 };
  if(rest.startsWith('ɔɪ') || rest.startsWith('oɪ')) return { text:'oi', consume:2 };
  if(rest.startsWith('ɾd')) return { text:'r', consume:2 };
  if(rest.startsWith('dʒ')) return { text:'j', consume:2 };
  if(rest.startsWith('tʃ')) return { text:'ch', consume:2 };
  const ch = rest.charAt(0);
  if(!ch) return { text:'', consume:1 };
  if(/[\/\[\]\(\)]/.test(ch)) return { text:'', consume:1 };
  if(/\s/.test(ch)) return { text:'', consume:1, breakAfter:true };
  if(STT_CORRECTION_BREAK_MARKERS.has(ch)) return { text:'', consume:1, breakAfter:true };
  if(ch === '͡') return { text:'', consume:1 };
  if(/[ɪi]/.test(ch)) return { text:'i', consume:1 };
  if(/[ʊu]/.test(ch)) return { text:'u', consume:1 };
  if(/[ɔoɒ]/.test(ch)) return { text:'o', consume:1 };
  if(/[ɛe]/.test(ch)) return { text:'e', consume:1 };
  if(/[ɑaæʌɐəœɝɚ]/.test(ch)) return { text:'a', consume:1 };
  if(ch === 'ŋ') return { text:'ng', consume:1 };
  if(/[ɹɾ]/.test(ch)) return { text:'r', consume:1 };
  if(ch === 'ʃ') return { text:'sh', consume:1 };
  if(/[ðθ]/.test(ch)) return { text:'th', consume:1 };
  if(ch === 'ʔ') return { text:'', consume:1 };
  if(/[a-z]/.test(ch)) return { text:ch, consume:1 };
  return { text:'', consume:1 };
}

function buildSttCorrectionDetailedKey(input){
  const raw = stripSttCorrectionMarks(input).toLowerCase();
  const indexToSource = [];
  const boundarySet = new Set();
  let normalized = '';
  let i = 0;
  while(i < raw.length){
    const piece = normalizeSttCorrectionCharSequence(raw, i);
    if(piece.breakAfter) boundarySet.add(normalized.length);
    if(piece.text){
      for(let j=0; j<piece.text.length; j++) indexToSource.push(i);
      normalized += piece.text;
    }
    i += Math.max(1, piece.consume || 1);
  }
  normalized = normalized.replace(/h$/g, '');
  while(indexToSource.length > normalized.length) indexToSource.pop();
  const boundaries = Array.from(boundarySet)
    .filter(pos => pos > 0 && pos < normalized.length)
    .sort((a, b)=> a - b);
  return {
    raw,
    key: normalized,
    boundaries,
    sourceMap: indexToSource
  };
}

function normalizeSttCorrectionIpaCore(input){
  return buildSttCorrectionDetailedKey(input).key;
  let s = stripSttCorrectionMarks(input).toLowerCase();
  s = s.replace(/[\/[\]()]/g, '');
  s = s.replace(/[ˈˌ.\s]/g, '');
  s = s.replace(/ː+/g, '');
  s = s.replace(/͡/g, '');
  s = s.replace(/ɾd/g, 'r');
  s = s.replace(/dʒ/g, 'j');
  s = s.replace(/tʃ/g, 'ch');
  s = s.replace(/oʊ|əʊ|ɔʊ/g, 'o');
  s = s.replace(/eɪ/g, 'ei');
  s = s.replace(/aɪ/g, 'ai');
  s = s.replace(/aʊ/g, 'au');
  s = s.replace(/ɔɪ|oɪ/g, 'oi');
  s = s.replace(/[ɪi]/g, 'i');
  s = s.replace(/[ʊu]/g, 'u');
  s = s.replace(/[ɔoɒ]/g, 'o');
  s = s.replace(/[ɛe]/g, 'e');
  s = s.replace(/[ɑaæʌɐəɜɝɚ]/g, 'a');
  s = s.replace(/ŋ/g, 'ng');
  s = s.replace(/[ɹɾ]/g, 'r');
  s = s.replace(/ʃ/g, 'sh');
  s = s.replace(/[ðθ]/g, 'th');
  s = s.replace(/ʔ/g, '');
  s = s.replace(/h$/g, '');
  s = s.replace(/[^a-z]/g, '');
  return s;
}

function dropSttCorrectionPostVocalicR(s){
  return String(s || '').replace(/([aeiou])r(?=[bcdfghjklmnpqrstvwxyz]|$)/g, '$1');
}

function getSttCorrectionIpaKeys(ipa){
  const base = normalizeSttCorrectionIpaCore(ipa);
  const keys = [];
  if(base) keys.push(base);
  const noRhotic = dropSttCorrectionPostVocalicR(base);
  if(noRhotic && noRhotic !== base) keys.push(noRhotic);
  return Array.from(new Set(keys.filter(Boolean)));
}

function getSttCorrectionHeuristicKeys(word){
  let s = normalizeSttCorrectionWordKey(word);
  if(!s) return [];
  s = s.replace(/quay$/g, 'ki');
  s = s.replace(/quey$/g, 'ki');
  s = s.replace(/key$/g, 'ki');
  s = s.replace(/ck/g, 'k');
  s = s.replace(/qu/g, 'k');
  s = s.replace(/ph/g, 'f');
  s = s.replace(/wh/g, 'w');
  s = s.replace(/igh/g, 'ai');
  s = s.replace(/ee|ea|ie|ei/g, 'i');
  s = s.replace(/oo|ou|ow/g, 'o');
  s = s.replace(/ay/g, 'ei');
  s = s.replace(/c(?=[eiy])/g, 's');
  s = s.replace(/c/g, 'k');
  s = s.replace(/x/g, 'ks');
  s = s.replace(/y$/g, 'i');
  s = s.replace(/e$/g, '');
  s = s.replace(/[^a-z]/g, '');
  if(!s) return [];
  const keys = [s, dropSttCorrectionPostVocalicR(s)];
  return Array.from(new Set(keys.filter(x => x && x.length >= 2)));
}

function getSttCorrectionFallbackBreaks(proxyKey){
  const s = String(proxyKey || '');
  const boundaries = [];
  for(let i = s.length - 1; i >= 1; i--){
    const prev = s.charAt(i - 1);
    const ch = s.charAt(i);
    const pair = s.slice(i, i + 2);
    if(STT_CORRECTION_DIGRAPH_BREAKS.includes(pair)){
      boundaries.push(i);
      continue;
    }
    if(STT_CORRECTION_VOWELS.has(prev) && !STT_CORRECTION_VOWELS.has(ch)){
      boundaries.push(i);
      continue;
    }
    if(!STT_CORRECTION_VOWELS.has(prev) && STT_CORRECTION_VOWELS.has(ch)){
      boundaries.push(i);
    }
  }
  return Array.from(new Set(boundaries)).sort((a, b)=> a - b);
}

function buildSttCorrectionProxyData(rawSource, key, sourceType){
  const normalizedKey = String(key || '').trim();
  const detailed = sourceType === 'ipa' ? buildSttCorrectionDetailedKey(rawSource) : null;
  const canReuseDetailed = !!(detailed && detailed.key === normalizedKey);
  const effectiveKey = normalizedKey || String((detailed && detailed.key) || '');
  const boundaries = canReuseDetailed && detailed.boundaries && detailed.boundaries.length
    ? detailed.boundaries
    : getSttCorrectionFallbackBreaks(effectiveKey);
  return {
    sourceType,
    sourceText: String(rawSource || ''),
    proxyKey: effectiveKey,
    boundaries,
    sourceMap: canReuseDetailed
      ? detailed.sourceMap.slice()
      : effectiveKey.split('').map((_, idx)=> idx),
    key: effectiveKey
  };
}

function appendSttCorrectionWordProxyCandidates(rawWord, out, meta){
  const key = normalizeSttCorrectionWordKey(rawWord);
  if(key && STT_CORRECTION_DICT_STATE.loaded){
    const ipas = STT_CORRECTION_DICT_STATE.wordToIpas.get(key);
    if(ipas && ipas.size){
      for(const ipa of ipas){
        const keys = getSttCorrectionIpaKeys(ipa);
        if(keys.length){
          out.push({
            source:'cmudict',
            display: meta && meta.variantWord ? `${meta.variantWord} -> ${String(ipa || '')}` : String(ipa || ''),
            keys,
            keyData: keys.map(item => buildSttCorrectionProxyData(ipa, item, 'ipa')),
            variantWord: meta && meta.variantWord ? String(meta.variantWord) : '',
            preprocessSteps: meta && Array.isArray(meta.preprocessSteps) ? meta.preprocessSteps.slice() : []
          });
        }
      }
    }
  }
  const heuristicKeys = getSttCorrectionHeuristicKeys(rawWord);
  if(heuristicKeys.length){
    out.push({
      source:'heuristic',
      display: meta && meta.variantWord ? `${meta.variantWord} -> ${heuristicKeys.join(' / ')}` : heuristicKeys.join(' / '),
      keys:heuristicKeys,
      keyData: heuristicKeys.map(item => buildSttCorrectionProxyData(item, item, 'heuristic')),
      variantWord: meta && meta.variantWord ? String(meta.variantWord) : '',
      preprocessSteps: meta && Array.isArray(meta.preprocessSteps) ? meta.preprocessSteps.slice() : []
    });
  }
}

function getSttCorrectionProxyCandidates(word, options){
  const out = [];
  appendSttCorrectionWordProxyCandidates(word, out, null);
  for(const variant of generateSttCorrectionPreIpaWordVariants(word, options)){
    appendSttCorrectionWordProxyCandidates(variant.value, out, {
      variantWord: variant.value,
      preprocessSteps: variant.steps || []
    });
  }
  return out;
}

function getSttCorrectionLexiconState(){
  const source = (typeof getRichLexiconSourcePreference === 'function')
    ? String(getRichLexiconSourcePreference() || 'v4')
    : 'v4';
  if(STT_CORRECTION_LEXICON_CACHE[source]) return STT_CORRECTION_LEXICON_CACHE[source];
  const index = (typeof getRichLexiconIndex === 'function') ? getRichLexiconIndex() : new Map();
  const byStart = new Map();
  const byKey = new Map();
  const dedupe = new Set();
  for(const [unitNorm, matches] of index.entries()){
    const chosen = (typeof chooseDefaultMatchV4 === 'function')
      ? chooseDefaultMatchV4(matches)
      : ((typeof chooseDefaultMatch === 'function') ? chooseDefaultMatch(matches) : ((matches && matches[0]) || null));
    if(!chosen) continue;
    const unit = String(chosen.unit || unitNorm || '').trim();
    const ipa = String(chosen.ipa || chosen.proper_ipa || '').trim();
    const keys = Array.from(new Set(
      getSttCorrectionIpaKeys(ipa).concat([
        getSttCorrectionOrthographicKey(unit),
        getSttCorrectionOrthographicKey(unitNorm)
      ].filter(key => key && key.length >= 2))
    ));
    for(const key of keys){
      if(!key) continue;
      const dedupeKey = `${normalizeWord(unit)}::${key}`;
      if(dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);
      const item = { unit, unitNorm: normalizeWord(unit), ipa, key };
      const start = key.charAt(0);
      if(!byStart.has(start)) byStart.set(start, []);
      byStart.get(start).push(item);
      if(!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(item);
    }
  }
  for(const list of byStart.values()){
    list.sort((a, b)=> b.key.length - a.key.length || a.unitNorm.localeCompare(b.unitNorm));
  }
  for(const list of byKey.values()){
    list.sort((a, b)=> a.unitNorm.localeCompare(b.unitNorm));
  }
  const state = { source, byStart, byKey };
  STT_CORRECTION_LEXICON_CACHE[source] = state;
  return state;
}

function getSttCorrectionTeReoShapeScore(result){
  const segments = Array.isArray(result && result.segments) ? result.segments : [];
  const word = normalizeWord(String((result && result.reconstructed) || ''));
  if(!word) return 0;
  let score = 0;
  if(/[aeiouāēīōū]$/i.test(word)) score += 4;
  if(/[^aeiouāēīōū]$/i.test(word)) score -= 4;
  for(const rawSeg of segments){
    const seg = normalizeWord(rawSeg);
    if(!seg) continue;
    if(/[aeiouāēīōū]$/i.test(seg)) score += 1;
    if(/[^aeiouāēīōū]$/i.test(seg)) score -= 2;
    if(/^[^aeiouāēīōū]+$/i.test(seg)) score -= 3;
  }
  return score;
}

function getSttCorrectionSegmentationPenalty(result){
  const segments = Array.isArray(result && result.segments) ? result.segments : [];
  if(!segments.length) return 0;
  let penalty = Math.max(0, segments.length - 2) * 2;
  for(let idx = 0; idx < segments.length; idx++){
    const rawSeg = segments[idx];
    const seg = normalizeWord(rawSeg);
    if(!seg) continue;
    const isLast = idx === (segments.length - 1);
    if(seg.length <= 1) penalty += 3;
    if(/^[aeiouāēīōū]$/i.test(seg)) penalty += 2;
    if(/^[^aeiouāēīōū]+$/i.test(seg)) penalty += 3;
    if(isLast && /[^aeiouāēīōū]$/i.test(seg)) penalty += 6;
    if(isLast && /^[^aeiouāēīōū]+$/i.test(seg)) penalty += 4;
  }
  return penalty;
}

function getSttCorrectionAlignmentPenalty(result){
  const matches = Array.isArray(result && result.matches) ? result.matches : [];
  const first = matches[0] || null;
  let penalty = 0;
  if(!(Number(result && result.exactCount) > 0) && !(Number(result && result.substituteCount) > 0)){
    penalty += 4;
  }
  if(first && first.type === 'near') penalty += 2;
  if(first && first.type === 'partial') penalty += 3;
  return penalty;
}

function compareSttCorrectionResults(a, b){
  if((a.proxyPenalty || 0) !== (b.proxyPenalty || 0)) return (a.proxyPenalty || 0) - (b.proxyPenalty || 0);
  const aSourcePriority = String(a.source || '') === 'cmudict' ? 0 : 1;
  const bSourcePriority = String(b.source || '') === 'cmudict' ? 0 : 1;
  if(aSourcePriority !== bSourcePriority) return aSourcePriority - bSourcePriority;
  if((b.matchedChars || 0) !== (a.matchedChars || 0)) return (b.matchedChars || 0) - (a.matchedChars || 0);
  if((b.coverage || 0) !== (a.coverage || 0)) return (b.coverage || 0) - (a.coverage || 0);
  if((a.gaps || 0) !== (b.gaps || 0)) return (a.gaps || 0) - (b.gaps || 0);
  if((a.alignmentPenalty || 0) !== (b.alignmentPenalty || 0)) return (a.alignmentPenalty || 0) - (b.alignmentPenalty || 0);
  if((a.segmentationPenalty || 0) !== (b.segmentationPenalty || 0)) return (a.segmentationPenalty || 0) - (b.segmentationPenalty || 0);
  if((a.variantPenalty || 0) !== (b.variantPenalty || 0)) return (a.variantPenalty || 0) - (b.variantPenalty || 0);
  if((a.matches || []).length !== (b.matches || []).length) return (a.matches || []).length - (b.matches || []).length;
  if((b.teReoShapeScore || 0) !== (a.teReoShapeScore || 0)) return (b.teReoShapeScore || 0) - (a.teReoShapeScore || 0);
  if((a.nearCount || 0) !== (b.nearCount || 0)) return (a.nearCount || 0) - (b.nearCount || 0);
  if((a.partialCount || 0) !== (b.partialCount || 0)) return (a.partialCount || 0) - (b.partialCount || 0);
  if((a.partialExpansion || 0) !== (b.partialExpansion || 0)) return (a.partialExpansion || 0) - (b.partialExpansion || 0);
  if((a.crossBreakPenalty || 0) !== (b.crossBreakPenalty || 0)) return (a.crossBreakPenalty || 0) - (b.crossBreakPenalty || 0);
  if((b.breakHits || 0) !== (a.breakHits || 0)) return (b.breakHits || 0) - (a.breakHits || 0);
  if((a.substituteCount || 0) !== (b.substituteCount || 0)) return (a.substituteCount || 0) - (b.substituteCount || 0);
  if((b.exactCount || 0) !== (a.exactCount || 0)) return (b.exactCount || 0) - (a.exactCount || 0);
  return String(a.reconstructed || '').localeCompare(String(b.reconstructed || ''));
}

function getSttCorrectionConfidenceMetrics(item){
  const totalLen = Math.max(1, Number(item && item.totalLen) || String((item && item.proxyKey) || '').length || 1);
  const matchCount = Math.max(1, Array.isArray(item && item.matches) ? item.matches.length : 0);
  const matchedRatio = Math.max(0, Math.min(1, (Number(item && item.matchedChars) || 0) / totalLen));
  const coverage = Math.max(0, Math.min(1, Number(item && item.coverage) || matchedRatio));
  const exactRatio = Math.max(0, Math.min(1, (Number(item && item.exactCount) || 0) / matchCount));
  const breakRatio = Math.max(0, Math.min(1, (Number(item && item.breakHits) || 0) / Math.max(1, matchCount * 2)));
  const sourceBonus = String(item && item.source || '') === 'cmudict' ? 0.06 : 0;
  const substitutePenalty = Math.min(0.08, (Number(item && item.substituteCount) || 0) * 0.015);
  const nearPenalty = Math.min(0.24, (Number(item && item.nearCount) || 0) * 0.08);
  const partialPenalty = Math.min(0.25, (Number(item && item.partialCount) || 0) * 0.1);
  const alignmentPenalty = Math.min(0.24, (Number(item && item.alignmentPenalty) || 0) * 0.035);
  const segmentationPenalty = Math.min(0.22, (Number(item && item.segmentationPenalty) || 0) * 0.025);
  const variantPenalty = Math.min(0.1, (Number(item && item.variantPenalty) || 0) * 0.03);
  const gapPenalty = Math.min(0.24, (Number(item && item.gaps) || 0) * 0.12);
  const breakPenalty = Math.min(0.2, (Number(item && item.crossBreakPenalty) || 0) * 0.05);
  const proxyPenalty = Math.min(0.2, (Number(item && item.proxyPenalty) || 0) * 0.08);
  const rawScore = (
    (coverage * 0.45) +
    (matchedRatio * 0.2) +
    (exactRatio * 0.12) +
    (breakRatio * 0.08) +
      sourceBonus -
      substitutePenalty -
      nearPenalty -
      partialPenalty -
      alignmentPenalty -
      segmentationPenalty -
      variantPenalty -
      gapPenalty -
      breakPenalty -
      proxyPenalty
  );
  const confidence = Math.max(0, Math.min(1, rawScore));
  return {
    confidence,
    matchedRatio,
    coverage,
    exactRatio,
    breakRatio,
    sourceBonus,
    penalties: {
        substitutePenalty,
        nearPenalty,
        partialPenalty,
        alignmentPenalty,
        segmentationPenalty,
        variantPenalty,
        gapPenalty,
        breakPenalty,
        proxyPenalty
      },
      rawScore
  };
}

function getSttCorrectionProxyPenalty(key){
  return (String(key || '').match(/([aeiou])r(?=[bcdfghjklmnpqrstvwxyz]|$)/g) || []).length;
}

function sttCorrectionEditDistanceAtMostOne(a, b){
  if(a === b) return 0;
  if(Math.abs(a.length - b.length) > 1) return 2;
  let i = 0;
  let j = 0;
  let edits = 0;
  while(i < a.length && j < b.length){
    if(a[i] === b[j]){
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if(edits > 1) return edits;
    if(a.length > b.length) i += 1;
    else if(b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  if(i < a.length || j < b.length) edits += 1;
  return edits;
}

function getSttCorrectionNearInfo(proxyKey, pos, segKey){
  const remaining = proxyKey.slice(pos);
  if(!remaining || !segKey) return null;
  if(remaining.length === segKey.length && segKey.length >= 2 && sttCorrectionEditDistanceAtMostOne(remaining, segKey) === 1){
    return { type:'near', consume: segKey.length, matched: remaining };
  }
  if(
    remaining.length < segKey.length &&
    remaining.length >= 1 &&
    segKey.startsWith(remaining) &&
    !(remaining.length === 1 && segKey.length > 2)
  ){
    return {
      type:'partial',
      consume: remaining.length,
      matched: remaining,
      partialExpansion: Math.max(0, segKey.length - remaining.length)
    };
  }
  if(remaining.length >= segKey.length){
    const sample = remaining.slice(0, segKey.length);
    if(segKey.length >= 3 && sttCorrectionEditDistanceAtMostOne(sample, segKey) === 1){
      return { type:'near', consume: segKey.length, matched: sample };
    }
  }
  return null;
}

const STT_CORRECTION_SIMPLE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const STT_CORRECTION_VOWEL_REGEX = /[aeiouāēīōū]/i;
const STT_CORRECTION_CONSONANT_ONLY_REGEX = /^[^aeiouāēīōū]+$/i;

function isSttCorrectionSimpleVowel(char){
  return STT_CORRECTION_SIMPLE_VOWELS.has(String(char || '').charAt(0));
}

function isSttCorrectionVowelChar(char){
  return STT_CORRECTION_VOWEL_REGEX.test(String(char || '').charAt(0));
}

function getSttCorrectionLeadingConsonants(seg){
  const match = normalizeWord(seg).match(/^[^aeiouāēīōū]+/i);
  return match ? match[0] : '';
}

function getSttCorrectionTrailingConsonants(seg){
  const match = normalizeWord(seg).match(/[^aeiouāēīōū]+$/i);
  return match ? match[0] : '';
}

function getSttCorrectionPlainBridgeVowel(char){
  const raw = String(char || '').charAt(0).toLowerCase();
  return ({
    'ā': 'a',
    'ē': 'e',
    'ī': 'i',
    'ō': 'o',
    'ū': 'u'
  })[raw] || (isSttCorrectionVowelChar(raw) ? raw : 'a');
}

function getSttCorrectionVowelSwapKey(key){
  const raw = String(key || '');
  if(raw.length < 3) return '';
  const left = raw.charAt(raw.length - 2);
  const right = raw.charAt(raw.length - 1);
  if(!isSttCorrectionSimpleVowel(left) || !isSttCorrectionSimpleVowel(right) || left === right) return '';
  return raw.slice(0, -2) + right + left;
}

function cloneSttCorrectionMatches(matches){
  return (Array.isArray(matches) ? matches : []).map(match => ({
    ...(match || {}),
    substitutionParts: Array.isArray(match && match.substitutionParts)
      ? match.substitutionParts.map(part => ({...part}))
      : []
  }));
}

function expandSttCorrectionVowelSwapResults(results, lexiconState){
  const sourceResults = Array.isArray(results) ? results : [];
  if(!sourceResults.length || !lexiconState || !(lexiconState.byKey instanceof Map)) return [];
  const out = [];
  const seen = new Set();
  const inspectLimit = Math.min(sourceResults.length, 160);
  for(let resultIndex = 0; resultIndex < inspectLimit; resultIndex += 1){
    const result = sourceResults[resultIndex];
    const matches = Array.isArray(result && result.matches) ? result.matches : [];
    for(let matchIndex = 0; matchIndex < matches.length; matchIndex += 1){
      const match = matches[matchIndex];
      const swappedKey = getSttCorrectionVowelSwapKey(match && match.key);
      if(!swappedKey) continue;
      const alternatives = lexiconState.byKey.get(swappedKey) || [];
      for(const alternative of alternatives){
        if(!alternative || normalizeWord(alternative.unitNorm || '') === normalizeWord(match.unitNorm || '')) continue;
        const swapSig = `${resultIndex}:${matchIndex}:${alternative.unitNorm}:${alternative.key}`;
        if(seen.has(swapSig)) continue;
        seen.add(swapSig);
        const nextMatches = cloneSttCorrectionMatches(matches);
        nextMatches[matchIndex] = {
          ...nextMatches[matchIndex],
          unit: alternative.unit,
          unitNorm: alternative.unitNorm,
          ipa: alternative.ipa,
          key: alternative.key,
          vowelSwapFromKey: match.key,
          vowelSwapFromUnit: match.unitNorm
        };
        out.push(finalizeSttCorrectionResult({
          ...result,
          matches: nextMatches,
          variantPenalty: (result.variantPenalty || 0) + 1,
          vowelSwapCount: (result.vowelSwapCount || 0) + 1,
          vowelSwapParts: ((result.vowelSwapParts || []).map(part => ({...part}))).concat([{
            index: matchIndex,
            from: normalizeWord(match.unitNorm || match.key || ''),
            to: normalizeWord(alternative.unitNorm || alternative.key || '')
          }])
        }, {
          boundaries: Array.isArray(result && result.proxyBoundaries) ? result.proxyBoundaries.slice() : []
        }));
      }
    }
  }
  return out;
}

function getSttCorrectionBoundaryBridgeVowel(matches, leftIndex){
  const list = Array.isArray(matches) ? matches : [];
  for(let idx = leftIndex; idx >= 0; idx -= 1){
    const seg = normalizeWord(list[idx] && list[idx].unitNorm);
    for(let charIndex = seg.length - 1; charIndex >= 0; charIndex -= 1){
      const rawChar = seg.charAt(charIndex);
      if(isSttCorrectionVowelChar(rawChar)) return getSttCorrectionPlainBridgeVowel(rawChar);
    }
  }
  for(let idx = leftIndex + 1; idx < list.length; idx += 1){
    const seg = normalizeWord(list[idx] && list[idx].unitNorm);
    for(let charIndex = 0; charIndex < seg.length; charIndex += 1){
      const rawChar = seg.charAt(charIndex);
      if(isSttCorrectionVowelChar(rawChar)) return getSttCorrectionPlainBridgeVowel(rawChar);
    }
  }
  return 'a';
}

function buildSttCorrectionPhonotacticVariant(baseResult, nextMatches, part){
  return finalizeSttCorrectionResult({
    ...baseResult,
    matches: nextMatches,
    variantPenalty: (baseResult.variantPenalty || 0) + 1,
    phonotacticBridgeCount: (baseResult.phonotacticBridgeCount || 0) + 1,
    phonotacticBridgeParts: ((baseResult.phonotacticBridgeParts || []).map(item => ({...item}))).concat([{...part}])
  }, {
    boundaries: Array.isArray(baseResult && baseResult.proxyBoundaries) ? baseResult.proxyBoundaries.slice() : []
  });
}

function collectSttCorrectionPhonotacticCollapseVariants(result){
  const matches = Array.isArray(result && result.matches) ? result.matches : [];
  if(matches.length < 2) return [];
  const out = [];
  const seen = new Set();
  for(let idx = 0; idx < matches.length - 1; idx += 1){
    const left = normalizeWord(matches[idx] && matches[idx].unitNorm);
    const right = normalizeWord(matches[idx + 1] && matches[idx + 1].unitNorm);
    if(!left || !right) continue;
    if(!STT_CORRECTION_CONSONANT_ONLY_REGEX.test(left)) continue;
    if(!right.startsWith(left)) continue;
    if(!STT_CORRECTION_VOWEL_REGEX.test(right.slice(left.length))) continue;
    const nextMatches = cloneSttCorrectionMatches(matches);
    nextMatches.splice(idx, 1);
    const sig = `${idx}:${left}:${right}`;
    if(seen.has(sig)) continue;
    seen.add(sig);
    out.push(buildSttCorrectionPhonotacticVariant(result, nextMatches, {
      type: 'collapse_duplicate_consonant',
      index: idx,
      dropped: left,
      next: right
    }));
  }
  return out;
}

function collectSttCorrectionPhonotacticBridgeVariants(result, lexiconState){
  const matches = Array.isArray(result && result.matches) ? result.matches : [];
  if(matches.length < 2 || !lexiconState || !(lexiconState.byKey instanceof Map)) return [];
  const out = [];
  const seen = new Set();
  for(let idx = 0; idx < matches.length - 1; idx += 1){
    const left = normalizeWord(matches[idx] && matches[idx].unitNorm);
    const right = normalizeWord(matches[idx + 1] && matches[idx + 1].unitNorm);
    if(!left || !right) continue;
    if(!STT_CORRECTION_CONSONANT_ONLY_REGEX.test(left)) continue;
    if(!getSttCorrectionLeadingConsonants(right)) continue;
    if(!getSttCorrectionTrailingConsonants(left)) continue;
    const bridgeVowel = getSttCorrectionBoundaryBridgeVowel(matches, idx);
    const bridgedKey = normalizeWord(left + bridgeVowel);
    const alternatives = lexiconState.byKey.get(bridgedKey) || [];
    for(const alternative of alternatives){
      if(!alternative) continue;
      const nextMatches = cloneSttCorrectionMatches(matches);
      nextMatches[idx] = {
        ...nextMatches[idx],
        unit: alternative.unit,
        unitNorm: alternative.unitNorm,
        ipa: alternative.ipa,
        key: alternative.key,
        phonotacticBridgeFromUnit: matches[idx].unitNorm,
        phonotacticBridgeVowel: bridgeVowel
      };
      const sig = `${idx}:${left}:${alternative.unitNorm}:${right}`;
      if(seen.has(sig)) continue;
      seen.add(sig);
      out.push(buildSttCorrectionPhonotacticVariant(result, nextMatches, {
        type: 'bridge_vowel',
        index: idx,
        from: left,
        to: normalizeWord(alternative.unitNorm || alternative.key || ''),
        bridgeVowel,
        before: right
      }));
    }
  }
  return out;
}

function expandSttCorrectionPhonotacticResults(results, lexiconState, options){
  if(!(options && options.phonotacticBridgeEnabled)) return [];
  const sourceResults = Array.isArray(results) ? results : [];
  if(!sourceResults.length) return [];
  const out = [];
  const inspectLimit = Math.min(sourceResults.length, 180);
  for(let idx = 0; idx < inspectLimit; idx += 1){
    const result = sourceResults[idx];
    const collapseVariants = collectSttCorrectionPhonotacticCollapseVariants(result);
    out.push(...collapseVariants);
    out.push(...collectSttCorrectionPhonotacticBridgeVariants(result, lexiconState));
    for(const collapseVariant of collapseVariants){
      out.push(...collectSttCorrectionPhonotacticBridgeVariants(collapseVariant, lexiconState));
    }
  }
  return out;
}

function getSttCorrectionSourceSlice(proxyData, start, end){
  const text = String((proxyData && proxyData.sourceText) || '');
  const map = Array.isArray(proxyData && proxyData.sourceMap) ? proxyData.sourceMap : [];
  if(!text || !map.length || end <= start) return '';
  const from = map[Math.max(0, start)] ?? 0;
  const toBase = map[Math.max(0, end - 1)];
  const to = typeof toBase === 'number' ? Math.min(text.length, toBase + 1) : text.length;
  return text.slice(Math.max(0, from), Math.max(Math.max(0, from), to)).trim();
}

function isSttCorrectionBreak(proxyData, pos){
  return !!(proxyData && Array.isArray(proxyData.boundaries) && proxyData.boundaries.includes(pos));
}

function countSttCorrectionCrossBreaks(proxyData, start, end){
  if(!proxyData || !Array.isArray(proxyData.boundaries)) return 0;
  let count = 0;
  for(const point of proxyData.boundaries){
    if(point > start && point < end) count += 1;
  }
  return count;
}

function getSttCorrectionSubstituteMap(options){
  const rules = normalizeSttCorrectionSubstituteRules((options && options.substituteRules) || null);
  const toggles = cloneSttCorrectionSubstitutions(options && options.substitutions);
  const out = new Map();
  for(const key of Object.keys(rules)){
    if(!toggles[key]) continue;
    out.set(key, new Set(rules[key] || []));
  }
  return out;
}

function getSttCorrectionBucketStarts(proxyChar, options){
  const starts = [];
  const seen = new Set();
  const base = String(proxyChar || '').charAt(0);
  if(base){
    seen.add(base);
    starts.push(base);
  }
  const substituteMap = getSttCorrectionSubstituteMap(options);
  for(const [target, allowed] of substituteMap.entries()){
    if(!allowed || !allowed.has(base) || seen.has(target)) continue;
    seen.add(target);
    starts.push(target);
  }
  return starts;
}

function getSttCorrectionSubstituteInfo(proxyKey, pos, segKey, options){
  const substituteMap = getSttCorrectionSubstituteMap(options);
  if(!substituteMap.size) return null;
  const remaining = proxyKey.slice(pos);
  if(!remaining || !segKey) return null;
  const sample = remaining.slice(0, segKey.length);
  if(sample.length !== segKey.length) return null;
  let substitutions = 0;
  const details = [];
  for(let i=0; i<segKey.length; i++){
    const target = segKey.charAt(i);
    const got = sample.charAt(i);
    if(target === got) continue;
    const allowed = substituteMap.get(target);
    if(!allowed || !allowed.has(got)) return null;
    substitutions += 1;
    details.push({ source: got, target, index: i });
  }
  if(!substitutions) return null;
  return { type:'substitute', consume:segKey.length, matched:sample, substitutions, details };
}

function passesSttCorrectionStrictFilter(word, detectLists){
  const norm = normalizeWord(word);
  if(!norm) return false;
  const base = scoreTokenBase(norm, detectLists);
  const orphans = Array.isArray(base.orphans) ? base.orphans : [];
  if(base.hardBlock) return false;
  if(orphans.length) return false;
  if((base.coverage || 0) < 0.85) return false;
  return (base.base || 0) >= 0.75;
}

function getSttCorrectionResultSignature(result){
  const matches = (result && result.matches) || [];
  const parts = matches.map(match =>[
    match.unitNorm || '',
    match.start || 0,
    match.end || 0,
    match.type || '',
    (match.substitutionParts || []).map(part => `${part.source}>${part.target}@${part.index}`).join(',')
  ].join(':'));
  return [
    String((result && result.reconstructed) || ''),
    String((result && result.proxyKey) || ''),
    parts.join('|'),
    String((result && result.gaps) || 0)
  ].join('::');
}

function getSttCorrectionFamilySignature(result){
  const matches = (result && result.matches) || [];
  const parts = matches.map(match =>[
    String((match && match.key) || ''),
    match.start || 0,
    match.end || 0,
    match.type || '',
    (match.substitutionParts || []).map(part => `${part.source}>${part.target}@${part.index}`).join(',')
  ].join(':'));
  return [
    String((result && result.proxyKey) || ''),
    parts.join('|'),
    String((result && result.gaps) || 0)
  ].join('::');
}

function finalizeSttCorrectionResult(result, proxyData){
  const next = {...(result || {})};
  next.coverage = next.totalLen ? ((next.matchedChars || 0) / next.totalLen) : 0;
  next.reconstructed = (next.matches || []).map(x => x.unitNorm).join('');
  next.segments = (next.matches || []).map(x => x.unitNorm);
  next.boundaries = Array.isArray(proxyData && proxyData.boundaries) ? proxyData.boundaries.slice() : [];
  next.teReoShapeScore = getSttCorrectionTeReoShapeScore(next);
  next.alignmentPenalty = getSttCorrectionAlignmentPenalty(next);
  next.segmentationPenalty = getSttCorrectionSegmentationPenalty(next);
  return next;
}

function pushTopSttCorrectionResults(target, candidate, limit, proxyData, options){
  if(!candidate) return target;
  const finalized = finalizeSttCorrectionResult(candidate, proxyData);
  const combined = target.concat([finalized]);
  const deduped = [];
  const seen = new Set();
  const familyCounts = new Map();
  const familyCap = Math.max(1, Number(options && options.showAllVariations ? 3 : 1) || 1);
  combined.sort(compareSttCorrectionResults);
  for(const item of combined){
    const sig = getSttCorrectionResultSignature(item);
    if(seen.has(sig)) continue;
    const familySig = getSttCorrectionFamilySignature(item);
    const familyCount = familyCounts.get(familySig) || 0;
    if(familyCount >= familyCap) continue;
    seen.add(sig);
    familyCounts.set(familySig, familyCount + 1);
    deduped.push(item);
    if(deduped.length >= limit) break;
  }
  return deduped;
}

function searchSttCorrectionKey(proxyData, lexiconState, options){
    const proxyKey = String((proxyData && proxyData.proxyKey) || '');
    const totalLen = Math.max(1, String(proxyKey || '').length);
    const maxGaps = Math.min(2, Math.max(1, Math.floor(totalLen / 4)));
    const showAllFloor = options && options.showAllVariations ? 220 : 0;
    const resultLimit = Math.max(12, showAllFloor, Number((options && (options.searchResultLimit || options.resultLimit)) || 24));
    const memo = new Map();

  function dfs(pos, gapsUsed){
    const memoKey = `${pos}#${gapsUsed}`;
    if(memo.has(memoKey)) return memo.get(memoKey);
    let best = [];

    if(pos >= totalLen){
      best = [{
        matches: [],
        matchedChars: 0,
        exactCount: 0,
        breakHits: 0,
        crossBreakPenalty: 0,
        substituteCount: 0,
        nearCount: 0,
        partialCount: 0,
        partialExpansion: 0,
        gaps: 0,
        totalLen,
        proxyKey
      }];
      memo.set(memoKey, best);
      return best;
    }

    const startChars = getSttCorrectionBucketStarts(proxyKey.charAt(pos), options);
    const bucketSeen = new Set();
    const bucket = [];
    for(const startChar of startChars){
      const list = lexiconState.byStart.get(startChar) || [];
      for(const item of list){
        const itemKey = `${item.unitNorm}::${item.key}`;
        if(bucketSeen.has(itemKey)) continue;
        bucketSeen.add(itemKey);
        bucket.push(item);
      }
    }
    for(const item of bucket){
      let matchInfo = null;
      if(proxyKey.startsWith(item.key, pos)){
        matchInfo = { type:'exact', consume:item.key.length, matched:item.key };
      } else {
        matchInfo = getSttCorrectionSubstituteInfo(proxyKey, pos, item.key, options);
        if(!matchInfo) matchInfo = getSttCorrectionNearInfo(proxyKey, pos, item.key);
      }
      if(!matchInfo) continue;
      const nextResults = dfs(pos + matchInfo.consume, gapsUsed);
      const start = pos;
      const end = pos + matchInfo.consume;
      const breakHits = (isSttCorrectionBreak(proxyData, start) ? 1 : 0) + (isSttCorrectionBreak(proxyData, end) ? 1 : 0);
      const crossBreakPenalty = countSttCorrectionCrossBreaks(proxyData, start, end);
      for(const next of nextResults){
        const candidate = {
          matches: [{
            unit: item.unit,
            unitNorm: item.unitNorm,
            ipa: item.ipa,
            key: item.key,
            matched: matchInfo.matched,
            start,
            end,
            type: matchInfo.type,
            sourceSlice: getSttCorrectionSourceSlice(proxyData, start, end),
            substitutionParts: (matchInfo.details || []).map(part => ({...part}))
          }].concat(next.matches || []),
          matchedChars: (next.matchedChars || 0) + matchInfo.consume,
          exactCount: (next.exactCount || 0) + (matchInfo.type === 'exact' ? 1 : 0),
          breakHits: (next.breakHits || 0) + breakHits,
          crossBreakPenalty: (next.crossBreakPenalty || 0) + crossBreakPenalty,
          substituteCount: (next.substituteCount || 0) + (matchInfo.substitutions || 0),
          nearCount: (next.nearCount || 0) + (matchInfo.type === 'near' ? 1 : 0),
          partialCount: (next.partialCount || 0) + (matchInfo.type === 'partial' ? 1 : 0),
          partialExpansion: (next.partialExpansion || 0) + (matchInfo.partialExpansion || 0),
          gaps: next.gaps || 0,
          totalLen,
          proxyKey
        };
        best = pushTopSttCorrectionResults(best, candidate, resultLimit, proxyData, options);
      }
    }

    if(gapsUsed < maxGaps){
      const nextResults = dfs(pos + 1, gapsUsed + 1);
      for(const next of nextResults){
        const candidate = {
          matches: next.matches || [],
          matchedChars: next.matchedChars || 0,
          exactCount: next.exactCount || 0,
          breakHits: next.breakHits || 0,
          crossBreakPenalty: next.crossBreakPenalty || 0,
          substituteCount: next.substituteCount || 0,
          nearCount: next.nearCount || 0,
          partialCount: next.partialCount || 0,
          partialExpansion: next.partialExpansion || 0,
          gaps: (next.gaps || 0) + 1,
          totalLen,
          proxyKey
        };
          best = pushTopSttCorrectionResults(best, candidate, resultLimit, proxyData, options);
        }
      }

    memo.set(memoKey, best);
    return best;
  }

  return dfs(0, 0).map(item => finalizeSttCorrectionResult(item, proxyData));
}

function suggestSttCorrectionForWord(word, options){
  const lexiconState = getSttCorrectionLexiconState();
  const proxyCandidates = getSttCorrectionProxyCandidates(word, options);
  const showAllFloor = options && options.showAllVariations ? 220 : 0;
  const resultLimit = Math.max(20, showAllFloor, Number((options && options.resultLimit) || 40));
  const results = [];
  for(const candidate of proxyCandidates){
    const keyData = Array.isArray(candidate.keyData) && candidate.keyData.length
      ? candidate.keyData
      : (candidate.keys || []).map(key => buildSttCorrectionProxyData(key, key, 'heuristic'));
    for(const data of keyData){
      const matches = searchSttCorrectionKey(data, lexiconState, options);
      for(const match of matches){
        if(!(match.matches || []).length) continue;
        results.push({
          source: candidate.source,
          displaySource: candidate.display,
          variantWord: candidate.variantWord || '',
          preprocessSteps: Array.isArray(candidate.preprocessSteps) ? candidate.preprocessSteps.slice() : [],
          proxyKey: data.proxyKey,
          proxyPenalty: getSttCorrectionProxyPenalty(data.proxyKey),
          proxyBoundaries: data.boundaries || [],
          matches: match.matches || [],
          segments: match.segments || [],
          reconstructed: match.reconstructed || '',
          matchedChars: match.matchedChars || 0,
          coverage: match.coverage || 0,
          exactCount: match.exactCount || 0,
          breakHits: match.breakHits || 0,
          crossBreakPenalty: match.crossBreakPenalty || 0,
          substituteCount: match.substituteCount || 0,
          nearCount: match.nearCount || 0,
          partialCount: match.partialCount || 0,
          partialExpansion: match.partialExpansion || 0,
          teReoShapeScore: match.teReoShapeScore || 0,
          alignmentPenalty: match.alignmentPenalty || 0,
          segmentationPenalty: match.segmentationPenalty || 0,
          variantPenalty: match.variantPenalty || 0,
          gaps: match.gaps || 0,
          totalLen: match.totalLen || Math.max(1, String(data.proxyKey || '').length)
        });
      }
    }
  }
  results.sort(compareSttCorrectionResults);
  results.push(...expandSttCorrectionVowelSwapResults(results, lexiconState));
  results.sort(compareSttCorrectionResults);
  results.push(...expandSttCorrectionPhonotacticResults(results, lexiconState, options));
  results.sort(compareSttCorrectionResults);
  const deduped = [];
  const seen = new Set();
  for(const item of results){
    const key = `${item.reconstructed}::${item.proxyKey}`;
    if(seen.has(key)) continue;
    seen.add(key);
    const metrics = getSttCorrectionConfidenceMetrics(item);
    item.confidence = metrics.confidence;
    item.confidenceMetrics = metrics;
    deduped.push(item);
    if(deduped.length >= resultLimit) break;
  }
  return deduped;
}

function applySttCorrectionMapToText(rawText, replacementMap){
  const parts = tokenizeTextBlockParts(rawText || '');
  let wordIndex = -1;
  return parts.map(part =>{
    if(part.type === 'sep') return part.text || '';
    wordIndex += 1;
    const next = replacementMap.get(wordIndex);
    return next != null ? String(next) : String(part.raw || '');
  }).join('');
}

function matchSttCorrectionCase(source, replacement){
  const src = String(source || '');
  const next = String(replacement || '');
  if(!src) return next;
  if(src.toUpperCase() === src) return next.toUpperCase();
  if(src.charAt(0).toUpperCase() === src.charAt(0) && src.slice(1).toLowerCase() === src.slice(1)){
    return next.charAt(0).toUpperCase() + next.slice(1);
  }
  return next;
}

function formatSttHistoryTimestamp(dateValue){
  const d = (dateValue instanceof Date) ? dateValue : new Date(dateValue || Date.now());
  if(Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
}

function normalizeSttHistoryEntry(entry){
  const text = String((entry && entry.text) || '').trim();
  if(!text) return null;
  return {
    when: formatSttHistoryTimestamp((entry && entry.when) || new Date()),
    lang: String((entry && entry.lang) || 'mi-NZ').trim() || 'mi-NZ',
    text
  };
}

function getSttHistorySignature(entry){
  const item = normalizeSttHistoryEntry(entry);
  if(!item) return '';
  return `${item.lang}::${item.text}`;
}

function defaultSttPrefs(){
  return {
    lang: 'mi-NZ',
    continuous: true,
    interim: true,
    autoDetectThreshold: 0.75,
    showDebug: false,
    correctionOnlyNonTeReo: true,
    correctionMinCoverage: 0.8,
    correctionShowTrace: false,
    correctionShowDiagnostics: false,
    correctionShowAllVariations: false,
    correctionRestrictStrict: false,
    correctionResultLimit: 40,
    correctionSearchResultLimit: 24,
    preIpaSubstitutionsEnabled: false,
    preIpaCollapseRepeatingConsonants: false,
    phonotacticBridgeEnabled: false,
    preIpaSegmentLimit: 12,
    preIpaVariantLimit: 64,
    correctionSubstitutions: defaultSttCorrectionSubstitutions(),
    correctionSubstituteRules: getDefaultSttCorrectionSubstituteRules(),
    sttRegressionSuite: getDefaultSttRegressionSuite(),
    sttRegressionSettings: getDefaultSttRegressionSettings()
  };
}

function getDefaultSttRegressionSuite(){
  return [
    {
      word: 'buddy',
      expected: 'pati',
      matchMode: 'contains',
      settings: {
        preIpaSubstitutionsEnabled: true,
        preIpaCollapseRepeatingConsonants: true,
        preIpaSegmentLimit: 8,
        preIpaVariantLimit: 24,
        resultLimit: 40,
        searchResultLimit: 40,
        enabledSubstitutions: { p: true, t: true }
      }
    },
    {
      word: 'torquay',
      expected: 'toki',
      matchMode: 'contains',
      settings: {
        preIpaSubstitutionsEnabled: false,
        preIpaCollapseRepeatingConsonants: false,
        resultLimit: 30,
        searchResultLimit: 30,
        enabledSubstitutions: {}
      }
    },
    {
      word: 'maryanne',
      expected: 'mereana',
      matchMode: 'contains',
      settings: {
        showAllVariations: true,
        resultLimit: 80,
        searchResultLimit: 80,
        enabledSubstitutions: { r: true }
      }
    },
    {
      word: 'holder',
      expected: 'paora',
      matchMode: 'contains',
      settings: {
        preIpaSubstitutionsEnabled: true,
        preIpaCollapseRepeatingConsonants: false,
        preIpaSegmentLimit: 8,
        preIpaVariantLimit: 32,
        resultLimit: 200,
        searchResultLimit: 80,
        enabledSubstitutions: { p: true, r: true }
      }
    },
    {
      word: 'andrew',
      expected: 'anaru',
      matchMode: 'contains',
      settings: {
        showAllVariations: true,
        showDiagnostics: true,
        phonotacticBridgeEnabled: true,
        resultLimit: 80,
        searchResultLimit: 80,
        enabledSubstitutions: { r: true }
      }
    }
  ];
}

function getDefaultSttRegressionSettings(){
  return {
    lexiconSource: 'v4',
    onlyNonTeReo: true,
    minCoverage: 0.6,
    strictOnly: false,
    showAllVariations: false,
    showDiagnostics: false,
    resultLimit: 80,
    searchResultLimit: 80,
    preIpaSubstitutionsEnabled: false,
    preIpaCollapseRepeatingConsonants: false,
    phonotacticBridgeEnabled: false,
    preIpaSegmentLimit: 12,
    preIpaVariantLimit: 24,
    enabledSubstitutions: {
      p: false,
      r: false,
      t: false
    },
    substituteRulesText: [
      'a - u',
      'h - r',
      'i - y',
      'k - c k g x',
      'm - n w f',
      'n - l v b',
      'p - b t r d k v h',
      'r - d y',
      't - r y p b d',
      'w - r v b',
      'wh - f th s b'
    ].join('\n')
  };
}

function normalizeSttRegressionMatchMode(value){
  return String(value || '').trim().toLowerCase() === 'top' ? 'top' : 'contains';
}

function normalizeSttRegressionSuite(input){
  const base = getDefaultSttRegressionSuite();
  if(!Array.isArray(input)) return base;
  const out = [];
  const seen = new Set();
  for(const row of input){
    if(!row || typeof row !== 'object') continue;
    const word = String(row.word || '').trim();
    const expected = String(row.expected || '').trim();
    if(!word || !expected) continue;
    seen.add(`${normalizeWord(word)}::${normalizeWord(expected)}`);
    out.push({
      word,
      expected,
      matchMode: normalizeSttRegressionMatchMode(row.matchMode),
      settings: row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
        ? {...row.settings}
        : undefined
    });
  }
  for(const row of base){
    const word = String(row && row.word || '').trim();
    const expected = String(row && row.expected || '').trim();
    if(!word || !expected) continue;
    const key = `${normalizeWord(word)}::${normalizeWord(expected)}`;
    if(seen.has(key)) continue;
    out.push({
      word,
      expected,
      matchMode: normalizeSttRegressionMatchMode(row.matchMode),
      settings: row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
        ? {...row.settings}
        : undefined
    });
  }
  return out.length ? out : base;
}

function normalizeSttRegressionSettings(input){
  const base = getDefaultSttRegressionSettings();
  const raw = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
  let substituteRulesText = String(raw.substituteRulesText != null ? raw.substituteRulesText : base.substituteRulesText);
  try{
    substituteRulesText = formatSttCorrectionSubstituteRulesText(parseSttCorrectionSubstituteRulesText(substituteRulesText));
  } catch(_err){
    substituteRulesText = base.substituteRulesText;
  }
  const enabledSubstitutions = cloneSttCorrectionSubstitutions({
    ...base.enabledSubstitutions,
    ...(raw.enabledSubstitutions && typeof raw.enabledSubstitutions === 'object' ? raw.enabledSubstitutions : {})
  });
  return {
    lexiconSource: (typeof normalizeRichLexiconSource === 'function')
      ? normalizeRichLexiconSource(raw.lexiconSource || base.lexiconSource)
      : String(raw.lexiconSource || base.lexiconSource || 'v4'),
    onlyNonTeReo: raw.onlyNonTeReo !== false,
    minCoverage: Math.max(0.6, Math.min(1, parseFloat(raw.minCoverage != null ? raw.minCoverage : base.minCoverage) || base.minCoverage)),
    strictOnly: !!raw.strictOnly,
    showAllVariations: raw.showAllVariations != null ? !!raw.showAllVariations : !!base.showAllVariations,
    showDiagnostics: !!raw.showDiagnostics,
    resultLimit: Math.max(5, Math.min(300, parseInt(raw.resultLimit != null ? raw.resultLimit : base.resultLimit, 10) || base.resultLimit)),
    searchResultLimit: Math.max(5, Math.min(300, parseInt(raw.searchResultLimit != null ? raw.searchResultLimit : base.searchResultLimit, 10) || base.searchResultLimit)),
    preIpaSubstitutionsEnabled: raw.preIpaSubstitutionsEnabled != null
      ? !!raw.preIpaSubstitutionsEnabled
      : !!base.preIpaSubstitutionsEnabled,
    preIpaCollapseRepeatingConsonants: raw.preIpaCollapseRepeatingConsonants != null
      ? !!raw.preIpaCollapseRepeatingConsonants
      : !!base.preIpaCollapseRepeatingConsonants,
    phonotacticBridgeEnabled: raw.phonotacticBridgeEnabled != null
      ? !!raw.phonotacticBridgeEnabled
      : !!base.phonotacticBridgeEnabled,
    preIpaSegmentLimit: Math.max(2, Math.min(40, parseInt(raw.preIpaSegmentLimit != null ? raw.preIpaSegmentLimit : base.preIpaSegmentLimit, 10) || base.preIpaSegmentLimit)),
    preIpaVariantLimit: Math.max(4, Math.min(400, parseInt(raw.preIpaVariantLimit != null ? raw.preIpaVariantLimit : base.preIpaVariantLimit, 10) || base.preIpaVariantLimit)),
    enabledSubstitutions,
    substituteRulesText
  };
}

function parseSttRegressionSuiteText(text){
  const parsed = safeJsonParse(text);
  if(!parsed.ok || !Array.isArray(parsed.value)) throw new Error('Suite JSON must be an array.');
  return normalizeSttRegressionSuite(parsed.value);
}

function parseSttRegressionSettingsText(text){
  const parsed = safeJsonParse(text);
  if(!parsed.ok || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)){
    throw new Error('Settings JSON must be an object.');
  }
  return normalizeSttRegressionSettings(parsed.value);
}

function isLegacyBuggySttRegressionSettings(input){
  const raw = (input && typeof input === 'object' && !Array.isArray(input)) ? input : null;
  if(!raw) return false;
  const enabled = raw.enabledSubstitutions && typeof raw.enabledSubstitutions === 'object'
    ? raw.enabledSubstitutions
    : {};
  return (
    raw.showAllVariations === true &&
    raw.preIpaSubstitutionsEnabled === true &&
    raw.preIpaCollapseRepeatingConsonants === true &&
    Number(raw.resultLimit || 0) >= 300 &&
    Number(raw.searchResultLimit || 0) >= 300 &&
    !!enabled.p &&
    !!enabled.r &&
    !!enabled.t
  );
}

function isLegacyBareSttRegressionSuite(input){
  if(!Array.isArray(input) || input.length !== 4) return false;
  const words = input.map(row => normalizeWord(row && row.word)).filter(Boolean);
  if(words.join('|') !== 'buddy|torquay|maryanne|holder') return false;
  return input.every(row => !row || typeof row !== 'object' || !row.settings || typeof row.settings !== 'object');
}

function loadSttPrefs(){
  const base = defaultSttPrefs();
  const raw = loadFromStorage(STORAGE_KEYS.sttPrefs);
  const parsed = raw ? safeJsonParse(raw) : {ok:false};
  if(parsed.ok && parsed.value && typeof parsed.value === 'object'){
    const next = {...base, ...parsed.value};
    next.correctionSubstitutions = cloneSttCorrectionSubstitutions(parsed.value.correctionSubstitutions);
    next.correctionSubstituteRules = normalizeSttCorrectionSubstituteRules(parsed.value.correctionSubstituteRules);
    next.sttRegressionSuite = normalizeSttRegressionSuite(
      isLegacyBareSttRegressionSuite(parsed.value.sttRegressionSuite)
        ? base.sttRegressionSuite
        : parsed.value.sttRegressionSuite
    );
    next.sttRegressionSettings = normalizeSttRegressionSettings(
      isLegacyBuggySttRegressionSettings(parsed.value.sttRegressionSettings)
        ? base.sttRegressionSettings
        : parsed.value.sttRegressionSettings
    );
    return next;
  }
  return base;
}

function saveSttPrefs(p){
  return saveToStorage(STORAGE_KEYS.sttPrefs, JSON.stringify(p || {}, null, 2));
}

function loadSttHistory(){
  const raw = loadFromStorage(STORAGE_KEYS.sttHistory);
  const parsed = raw ? safeJsonParse(raw) : {ok:false};
  if(parsed.ok && Array.isArray(parsed.value)){
    return parsed.value
      .map(normalizeSttHistoryEntry)
      .filter(Boolean);
  }
  return [];
}

function saveSttHistory(list){
  const compact = [];
  const seen = new Set();
  for(const rawItem of (Array.isArray(list) ? list : [])){
    const item = normalizeSttHistoryEntry(rawItem);
    if(!item) continue;
    const sig = getSttHistorySignature(item);
    if(!sig || seen.has(sig)) continue;
    seen.add(sig);
    compact.push(item);
    if(compact.length >= 100) break;
  }
  return saveToStorage(STORAGE_KEYS.sttHistory, JSON.stringify(compact));
}

function addSttHistoryEntry(entry){
  const next = normalizeSttHistoryEntry(entry);
  if(!next) return false;
  const sig = getSttHistorySignature(next);
  const list = loadSttHistory().filter(item => getSttHistorySignature(item) !== sig);
  list.unshift(next);
  return saveSttHistory(list);
}

function renderSpeechToText(){
  const root = document.getElementById('pageSTT');
  root.innerHTML = '';

  const prefs = loadSttPrefs();

  const card = el('div', {class:'card'});
  card.appendChild(el('h2', {}, ['Speech To Text']));
  card.appendChild(el('p', {class:'muted'}, [
    'Web only live microphone speech recognition. MP3 files can be played here for convenience, but browsers cannot transcribe an MP3 directly without downloads or a server.'
  ]));

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const row = el('div', {class:'row'});
  const lang = el('select', {class:'input'});
  const langOpts = [
    {v:'mi-NZ', t:'mi-NZ (Te Reo Maori)'},
    {v:'en-NZ', t:'en-NZ (English NZ)'},
    {v:'en-AU', t:'en-AU (English AU)'},
    {v:'en-US', t:'en-US (English US)'},
    {v:'custom', t:'Custom'}
  ];
  for(const o of langOpts){
    const opt = el('option', {value:o.v}, [o.t]);
    if((prefs.lang || 'mi-NZ') === o.v) opt.selected = true;
    lang.appendChild(opt);
  }
  const customLang = el('input', {class:'input', placeholder:'Language tag eg mi-NZ', value: (prefs.lang && !langOpts.some(x=>x.v===prefs.lang)) ? prefs.lang : ''});
  customLang.style.maxWidth = '220px';

  const startBtn = el('button', {class:'btn', type:'button'}, ['Start']);
  const stopBtn = el('button', {class:'btn', type:'button', disabled:true}, ['Stop']);
  const clearBtn = el('button', {class:'btn', type:'button'}, ['Clear']);

  const status = el('div', {class:'tag'}, [SR ? 'Ready' : 'SpeechRecognition Not Available']);
  status.style.marginLeft = 'auto';

  row.appendChild(el('div', {class:'muted'}, ['Language']));
  row.appendChild(lang);
  row.appendChild(customLang);
  row.appendChild(startBtn);
  row.appendChild(stopBtn);
  row.appendChild(clearBtn);
  row.appendChild(status);

  card.appendChild(row);

  const transcriptCard = el('div', {class:'card'});
  transcriptCard.appendChild(el('h3', {}, ['Transcript']));

  const interimLine = el('div', {class:'muted', style:'min-height:22px;'}, ['']);
  const finalBox = el('textarea', {class:'textarea mono', rows:'6', placeholder:'Final transcript will appear here'});
  const buttons2 = el('div', {class:'row'});
  const copyBtn = el('button', {class:'btn', type:'button'}, ['Copy']);
  const saveHistBtn = el('button', {class:'btn', type:'button'}, ['Save To History']);
  const sendAwsBtn = el('button', {class:'btn', type:'button'}, ['Send To G2P - AWS TTS']);
  buttons2.appendChild(copyBtn);
  buttons2.appendChild(saveHistBtn);
  buttons2.appendChild(sendAwsBtn);
  const historyStatus = el('div', {class:'muted', style:'margin-top:8px; min-height:22px;'});

  transcriptCard.appendChild(interimLine);
  transcriptCard.appendChild(finalBox);
  transcriptCard.appendChild(buttons2);
  transcriptCard.appendChild(historyStatus);

  // MP3 Assist
  const audioCard = el('div', {class:'card'});
  audioCard.appendChild(el('h3', {}, ['Audio File Assist']));
  audioCard.appendChild(el('p', {class:'muted'}, [
    'If you want to transcribe an MP3 without downloads, play it here and run live dictation. If your system can loop back audio into the mic, recognition can capture it.'
  ]));
  const audioRow = el('div', {class:'row'});
  const fileIn = el('input', {type:'file', class:'input', accept:'audio/*'});
  fileIn.style.maxWidth = '420px';
  const audioEl = el('audio', {controls:true});
  audioEl.style.width = '100%';
  audioRow.appendChild(fileIn);
  audioCard.appendChild(audioRow);
  audioCard.appendChild(audioEl);

  root.appendChild(card);
  root.appendChild(transcriptCard);
  root.appendChild(audioCard);

  // Te Reo Detect Panel
  const detectCard = el('div', {class:'card'});
  detectCard.appendChild(el('h3', {}, ['Te Reo Detect']));
  detectCard.appendChild(el('p', {class:'muted'}, ['Analyze the transcript and highlight likely te reo tokens. Included tokens use a subtle underline. Shift click a token to toggle include for that occurrence.']));

  const detectRow = el('div', {class:'row'});
  const analyzeBtn = el('button', {class:'btn', type:'button'}, ['Analyze']);
  const thr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:String(prefs.autoDetectThreshold ?? 0.75)});
  thr.style.width = '220px';
  const thrTag = el('div', {class:'tag'}, ['Threshold: ' + Math.round(parseFloat(thr.value)*100) + '%']);
  const dbgLbl = el('label', {class:'checkbox'});
  const dbg = el('input', {type:'checkbox'});
  dbg.checked = !!prefs.showDebug;
  dbgLbl.appendChild(dbg);
  dbgLbl.appendChild(document.createTextNode('Debug'));
  const teReoWordsBtn = el('button', {class:'btn', type:'button'}, ['Copy Te Reo Words']);

  detectRow.appendChild(analyzeBtn);
  detectRow.appendChild(thrTag);
  detectRow.appendChild(thr);
  detectRow.appendChild(dbgLbl);
  detectRow.appendChild(teReoWordsBtn);

  detectCard.appendChild(detectRow);

  const layout = el('div', {class:'detectBlockLayout'});
  const left = el('div', {class:'card', style:'margin:0; padding:12px;'});
  const right = el('div', {class:'card', style:'margin:0; padding:12px;'});
  left.appendChild(el('h3', {}, ['Highlighted Text']));
  const hl = el('div', {class:'hlText'});
  left.appendChild(hl);

  right.appendChild(el('h3', {}, ['Detected Blocks']));
  const blocksEl = el('div', {});
  right.appendChild(blocksEl);
  right.appendChild(el('div', {class:'divider'}));
  right.appendChild(el('h3', {}, ['Word Details']));
  const detailsEl = el('div', {});
  right.appendChild(detailsEl);

  layout.appendChild(left);
  layout.appendChild(right);
  detectCard.appendChild(layout);
  root.appendChild(detectCard);

  const correctionCard = el('div', {class:'card'});
  correctionCard.appendChild(el('h3', {}, ['Correction Workflow']));
  correctionCard.appendChild(el('p', {class:'muted'}, [
    'Use English-proxy transcript words as carriers for IPA lookup, then progressively match the IPA against te reo lexicon segments to suggest corrected words such as proxy "Torquay" to te reo "toki".'
  ]));
  const correctionRow = el('div', {class:'row'});
  const correctionAnalyzeBtn = el('button', {class:'btn', type:'button'}, ['Analyze Corrections']);
  const correctionApplyAllBtn = el('button', {class:'btn', type:'button', disabled:true}, ['Apply All']);
  const correctionOnlyLbl = el('label', {class:'checkbox'});
  const correctionOnlyInput = el('input', {type:'checkbox'});
  correctionOnlyInput.checked = prefs.correctionOnlyNonTeReo !== false;
  correctionOnlyLbl.appendChild(correctionOnlyInput);
  correctionOnlyLbl.appendChild(document.createTextNode('Only Non-Te Reo Tokens'));
  const correctionTraceLbl = el('label', {class:'checkbox'});
  const correctionTraceInput = el('input', {type:'checkbox'});
  correctionTraceInput.checked = !!prefs.correctionShowTrace;
  correctionTraceLbl.appendChild(correctionTraceInput);
  correctionTraceLbl.appendChild(document.createTextNode('Show Correction Trace'));
  const correctionDiagnosticsLbl = el('label', {class:'checkbox'});
  const correctionDiagnosticsInput = el('input', {type:'checkbox'});
  correctionDiagnosticsInput.checked = !!prefs.correctionShowDiagnostics;
  correctionDiagnosticsLbl.appendChild(correctionDiagnosticsInput);
  correctionDiagnosticsLbl.appendChild(document.createTextNode('Show Diagnostics'));
  const correctionShowAllLbl = el('label', {class:'checkbox'});
  const correctionShowAllInput = el('input', {type:'checkbox'});
  correctionShowAllInput.checked = !!prefs.correctionShowAllVariations;
  correctionShowAllLbl.appendChild(correctionShowAllInput);
  correctionShowAllLbl.appendChild(document.createTextNode('Show Every Variation'));
  const preIpaLbl = el('label', {class:'checkbox'});
  const preIpaInput = el('input', {type:'checkbox'});
  preIpaInput.checked = !!prefs.preIpaSubstitutionsEnabled;
  preIpaLbl.appendChild(preIpaInput);
  preIpaLbl.appendChild(document.createTextNode('Enable Pre-IPA Substitutions'));
  const preIpaCollapseLbl = el('label', {class:'checkbox'});
  const preIpaCollapseInput = el('input', {type:'checkbox'});
  preIpaCollapseInput.checked = !!prefs.preIpaCollapseRepeatingConsonants;
  preIpaCollapseLbl.appendChild(preIpaCollapseInput);
  preIpaCollapseLbl.appendChild(document.createTextNode('Collapse Repeating Consonants'));
  const phonotacticBridgeLbl = el('label', {class:'checkbox'});
  const phonotacticBridgeInput = el('input', {type:'checkbox'});
  phonotacticBridgeInput.checked = !!prefs.phonotacticBridgeEnabled;
  phonotacticBridgeLbl.appendChild(phonotacticBridgeInput);
  phonotacticBridgeLbl.appendChild(document.createTextNode('Enable Te Reo Phonotactic Bridge'));
  const correctionStrictLbl = el('label', {class:'checkbox'});
  const correctionStrictInput = el('input', {type:'checkbox'});
  correctionStrictInput.checked = !!prefs.correctionRestrictStrict;
  correctionStrictLbl.appendChild(correctionStrictInput);
  correctionStrictLbl.appendChild(document.createTextNode('Restrict Non Rule Following'));
  const correctionThr = el('input', {type:'range', min:'0.60', max:'1.00', step:'0.01', value:String(prefs.correctionMinCoverage ?? 0.8)});
  correctionThr.style.width = '180px';
  const correctionThrTag = el('div', {class:'tag'}, ['Correction Coverage: ' + Math.round(parseFloat(correctionThr.value || '0.8') * 100) + '%']);
  const correctionLexiconControl = buildLexiconSourceControl('rich', ()=>{ runCorrections(true); }, 'STT correction rich lexicon source');
  const correctionDictBtn = el('button', {class:'btn', type:'button'}, ['Load IPA Dictionary']);
  const correctionDictStatus = el('div', {class:'tag'}, ['Dictionary: idle']);
  correctionDictStatus.style.marginLeft = 'auto';
  correctionRow.appendChild(correctionAnalyzeBtn);
  correctionRow.appendChild(correctionApplyAllBtn);
  correctionRow.appendChild(correctionOnlyLbl);
  correctionRow.appendChild(correctionTraceLbl);
  correctionRow.appendChild(correctionDiagnosticsLbl);
  correctionRow.appendChild(correctionShowAllLbl);
  correctionRow.appendChild(preIpaLbl);
  correctionRow.appendChild(preIpaCollapseLbl);
  correctionRow.appendChild(phonotacticBridgeLbl);
  correctionRow.appendChild(correctionStrictLbl);
  correctionRow.appendChild(correctionThrTag);
  correctionRow.appendChild(correctionThr);
  correctionRow.appendChild(correctionLexiconControl.wrap);
  correctionRow.appendChild(correctionDictBtn);
  correctionRow.appendChild(correctionDictStatus);
  correctionCard.appendChild(correctionRow);
  const correctionAdvanced = el('details', {style:'margin-top:10px;'});
  correctionAdvanced.appendChild(el('summary', {}, ['Consonant Substitute Options']));
  correctionAdvanced.appendChild(el('p', {class:'muted', style:'margin-top:8px;'}, [
    'Allow selected English consonant substitutions when matching proxy IPA back onto te reo segments.'
  ]));
  const correctionRules = normalizeSttCorrectionSubstituteRules(prefs.correctionSubstituteRules);
  const correctionSubsRow = el('div', {class:'row', style:'margin-top:8px;'});
  const correctionSubInputs = {};
  for(const key of Object.keys(correctionRules)){
    const subLabel = el('label', {class:'checkbox'});
    const subInput = el('input', {type:'checkbox'});
    subInput.checked = !!(prefs.correctionSubstitutions && prefs.correctionSubstitutions[key]);
    correctionSubInputs[key] = subInput;
    subLabel.appendChild(subInput);
    subLabel.appendChild(document.createTextNode(`${key} <= ${(correctionRules[key] || []).join(', ')}`));
    correctionSubsRow.appendChild(subLabel);
  }
  correctionAdvanced.appendChild(correctionSubsRow);
  const correctionTuningDetails = el('details', {style:'margin-top:10px;'});
  correctionTuningDetails.appendChild(el('summary', {}, ['Variation Tuning And Diagnostics']));
  correctionTuningDetails.appendChild(el('p', {class:'muted', style:'margin-top:8px;'}, [
    'Tune how many STT correction paths are kept, rendered, and explained. Higher limits expose more hybrid variations but increase noise and work.'
  ]));
  const tuningGrid = el('div', {style:'display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:10px;'});
  const correctionResultLimitInput = el('input', {class:'input', type:'number', min:'5', max:'300', step:'1', value:String(Math.max(5, Number(prefs.correctionResultLimit || 40)))});
  const correctionSearchLimitInput = el('input', {class:'input', type:'number', min:'5', max:'300', step:'1', value:String(Math.max(5, Number(prefs.correctionSearchResultLimit || 24)))});
  const preIpaSegmentLimitInput = el('input', {class:'input', type:'number', min:'2', max:'40', step:'1', value:String(Math.max(2, Number(prefs.preIpaSegmentLimit || 12)))});
  const preIpaVariantLimitInput = el('input', {class:'input', type:'number', min:'4', max:'400', step:'1', value:String(Math.max(4, Number(prefs.preIpaVariantLimit || 64)))});
  tuningGrid.appendChild(el('label', {style:'display:grid; gap:4px;'}, [
    el('span', {class:'muted'}, ['Ranked Candidate Limit']),
    correctionResultLimitInput
  ]));
  tuningGrid.appendChild(el('label', {style:'display:grid; gap:4px;'}, [
    el('span', {class:'muted'}, ['Search Paths Per Proxy']),
    correctionSearchLimitInput
  ]));
  tuningGrid.appendChild(el('label', {style:'display:grid; gap:4px;'}, [
    el('span', {class:'muted'}, ['Pre-IPA Segment Variants']),
    preIpaSegmentLimitInput
  ]));
  tuningGrid.appendChild(el('label', {style:'display:grid; gap:4px;'}, [
    el('span', {class:'muted'}, ['Pre-IPA Total Variants']),
    preIpaVariantLimitInput
  ]));
  correctionTuningDetails.appendChild(tuningGrid);
  correctionAdvanced.appendChild(correctionTuningDetails);
  const correctionRulesArea = el('textarea', {
    class:'input',
    rows:'8',
    style:'margin-top:10px; width:100%; font-family:ui-monospace, SFMono-Regular, Consolas, monospace;'
  });
  correctionRulesArea.value = formatSttCorrectionSubstituteRulesText(correctionRules);
  correctionAdvanced.appendChild(correctionRulesArea);
  const correctionRulesHelp = el('p', {class:'muted', style:'margin-top:8px;'}, [
    'Editable format: one rule per line, for example `r - d` or `k - c k g x`.'
  ]);
  correctionAdvanced.appendChild(correctionRulesHelp);
  const correctionRulesActions = el('div', {class:'row', style:'margin-top:8px;'});
  const correctionRulesSaveBtn = el('button', {class:'btn', type:'button'}, ['Save Substitute Rules']);
  const correctionRulesResetBtn = el('button', {class:'btn', type:'button'}, ['Reset Rules']);
  const correctionRulesStatus = el('div', {class:'muted'}, ['']);
  correctionRulesStatus.style.marginLeft = 'auto';
  correctionRulesActions.appendChild(correctionRulesSaveBtn);
  correctionRulesActions.appendChild(correctionRulesResetBtn);
  correctionRulesActions.appendChild(correctionRulesStatus);
  correctionAdvanced.appendChild(correctionRulesActions);
  correctionCard.appendChild(correctionAdvanced);
  const correctionResults = el('div', {style:'margin-top:10px;'});
  correctionCard.appendChild(correctionResults);
  root.appendChild(correctionCard);

  const regressionCard = el('div', {class:'card'});
  regressionCard.appendChild(el('h3', {}, ['STT Regression Suite']));
  regressionCard.appendChild(el('p', {class:'muted'}, [
    'Run editable English proxy regression words directly through the STT correction engine. The suite can apply its own settings preset to the live correction controls before running.'
  ]));
  const regressionRow = el('div', {class:'row'});
  const regressionRunBtn = el('button', {class:'btn', type:'button'}, ['Run STT Regression']);
  const regressionApplyBtn = el('button', {class:'btn', type:'button'}, ['Apply Suite Settings']);
  const regressionSaveBtn = el('button', {class:'btn', type:'button'}, ['Save Suite']);
  const regressionDefaultsBtn = el('button', {class:'btn', type:'button'}, ['Load Defaults']);
  const regressionStatus = el('div', {class:'muted'});
  regressionStatus.style.marginLeft = 'auto';
  regressionRow.appendChild(regressionRunBtn);
  regressionRow.appendChild(regressionApplyBtn);
  regressionRow.appendChild(regressionSaveBtn);
  regressionRow.appendChild(regressionDefaultsBtn);
  regressionRow.appendChild(regressionStatus);
  regressionCard.appendChild(regressionRow);
  regressionCard.appendChild(el('p', {class:'muted', style:'margin-top:8px;'}, [
    'Each suite row uses `{ \"word\": \"buddy\", \"expected\": \"pati\", \"matchMode\": \"contains\" }`. `matchMode` can be `contains` or `top`.'
  ]));
  const regressionSuiteArea = el('textarea', {
    class:'textarea mono',
    rows:'8',
    style:'margin-top:8px;'
  });
  regressionSuiteArea.value = JSON.stringify(prefs.sttRegressionSuite, null, 2);
  regressionCard.appendChild(regressionSuiteArea);
  const regressionSettingsDetails = el('details', {style:'margin-top:10px;'});
  regressionSettingsDetails.appendChild(el('summary', {}, ['Suite Settings JSON']));
  regressionSettingsDetails.appendChild(el('p', {class:'muted', style:'margin-top:8px;'}, [
    'These settings drive the regression runner and can be pushed into the visible correction controls with `Apply Suite Settings`.'
  ]));
  const regressionSettingsArea = el('textarea', {
    class:'textarea mono',
    rows:'18',
    style:'margin-top:8px;'
  });
  regressionSettingsArea.value = JSON.stringify(prefs.sttRegressionSettings, null, 2);
  regressionSettingsDetails.appendChild(regressionSettingsArea);
  regressionCard.appendChild(regressionSettingsDetails);
  const regressionResults = el('div', {style:'margin-top:10px;'});
  regressionCard.appendChild(regressionResults);
  root.appendChild(regressionCard);

  // History Panel
  const histCard = el('div', {class:'card'});
  histCard.appendChild(el('h3', {}, ['History']));
  const histList = el('div', {});
  histCard.appendChild(histList);
  root.appendChild(histCard);

  function setHistoryStatus(text, kind){
    historyStatus.textContent = text || '';
    historyStatus.className = 'muted';
    if(kind === 'ok') historyStatus.className = 'tag good';
    if(kind === 'warn') historyStatus.className = 'tag bad';
  }

  function refreshHistory(){
    histList.innerHTML = '';
    const list = loadSttHistory();
    if(!list.length){
      histList.appendChild(el('p', {class:'muted'}, ['No history yet']));
      return;
    }
    const top = el('div', {class:'row'});
    const clearHist = el('button', {class:'btn', type:'button'}, ['Clear History']);
    top.appendChild(clearHist);
    histList.appendChild(top);

    clearHist.addEventListener('click', ()=>{
      if(!confirm('Clear speech to text history?')) return;
      if(saveSttHistory([])){
        refreshHistory();
        setHistoryStatus('History cleared.', 'ok');
      } else {
        setHistoryStatus('History clear failed. localStorage may be unavailable or full.', 'warn');
      }
    });

    for(const it of list.slice(0, 30)){
      const b = el('button', {class:'btn', type:'button', style:'width:100%; text-align:left; white-space:normal;'}, [
        (it.when || '') + '  ' + (it.lang || '') + '  ' + (it.text || '').slice(0, 120)
      ]);
      b.addEventListener('click', ()=>{
        finalBox.value = it.text || '';
        runDetect(true);
        clearCorrectionResults('Transcript changed. Analyze corrections to refresh suggestions.');
        setHistoryStatus(`Loaded history item from ${it.when || 'history'}.`, 'ok');
      });
      histList.appendChild(b);
    }
  }

  refreshHistory();

  let recog = null;
  let listening = false;

  function getSelectedLang(){
    const v = lang.value;
    if(v === 'custom') return (customLang.value || 'mi-NZ').trim();
    return v;
  }

  function setUiListening(on){
    listening = on;
    startBtn.disabled = on;
    stopBtn.disabled = !on;
    status.textContent = SR ? (on ? 'Listening' : 'Ready') : 'SpeechRecognition Not Available';
  }

  function startRec(){
    if(!SR){
      alert('SpeechRecognition is not available in this browser.');
      return;
    }
    if(listening) return;

    const chosen = getSelectedLang();
    const nextPrefs = loadSttPrefs();
    nextPrefs.lang = chosen;
    nextPrefs.continuous = true;
    nextPrefs.interim = true;
    saveSttPrefs(nextPrefs);

    recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = chosen;
    recog.maxAlternatives = 3;

    recog.onstart = ()=>{ setUiListening(true); };
    recog.onerror = (e)=>{ status.textContent = 'Error: ' + (e.error || 'unknown'); };
    recog.onend = ()=>{ setUiListening(false); };

    recog.onresult = (event)=>{
      let interim = '';
      for(let i=event.resultIndex; i<event.results.length; i++){
        const res = event.results[i];
        const txt = (res[0] && res[0].transcript) ? res[0].transcript : '';
        if(res.isFinal){
          const t = txt.trim();
          if(t){
            const sep = finalBox.value && !finalBox.value.endsWith('\\n') ? ' ' : '';
            finalBox.value = (finalBox.value || '') + sep + t;
            clearCorrectionResults('Transcript changed. Analyze corrections to refresh suggestions.');
          }
        } else {
          interim += txt;
        }
      }
      interimLine.textContent = interim.trim() ? ('Interim: ' + interim.trim()) : '';
    };

    try{
      recog.start();
    } catch(e){
      status.textContent = 'Start failed';
    }
  }

  function stopRec(){
    if(recog){
      try{ recog.stop(); } catch(e){}
    }
    setUiListening(false);
  }

  startBtn.addEventListener('click', startRec);
  stopBtn.addEventListener('click', stopRec);

  clearBtn.addEventListener('click', ()=>{
    interimLine.textContent = '';
    finalBox.value = '';
    hl.innerHTML = '';
    blocksEl.innerHTML = '';
    detailsEl.innerHTML = '';
    clearCorrectionResults('Transcript cleared.');
    setHistoryStatus('', '');
  });

  finalBox.addEventListener('input', ()=>{
    clearCorrectionResults('Transcript changed. Analyze corrections to refresh suggestions.');
  });

  copyBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(finalBox.value || '');
    } catch(e){
      alert('Copy failed');
    }
  });

  saveHistBtn.addEventListener('click', ()=>{
    const txt = (finalBox.value || '').trim();
    if(!txt) return;
    const ok = addSttHistoryEntry({ when: new Date(), lang: getSelectedLang(), text: txt });
    if(ok){
      refreshHistory();
      const count = loadSttHistory().length;
      setHistoryStatus(`History saved. ${count} item${count === 1 ? '' : 's'} stored.`, 'ok');
    } else {
      setHistoryStatus('History save failed. localStorage may be unavailable or full.', 'warn');
    }
  });

  fileIn.addEventListener('change', ()=>{
    const f = fileIn.files && fileIn.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    audioEl.src = url;
    audioEl.load();
  });

  sendAwsBtn.addEventListener('click', ()=>{
    const txt = (finalBox.value || '').trim();
    if(!txt) return;
    const awsPrefs = loadG2pAwsTtsPrefs();
    awsPrefs.inputMode = 'text';
    awsPrefs.outputMode = 'mixed_auto';
    awsPrefs.preservePunct = true;
    awsPrefs.lastInputText = txt;
    awsPrefs.awsAutoDetectThreshold = clamp01(parseFloat(thr.value || '0.75'));
    saveG2pAwsTtsPrefs(awsPrefs);
    renderG2PAwsTts();
    setActiveTab('g2pAwsTts');
  });

  // Detect logic
  const detectLists = (()=>{
    const ambiguousArr = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens);
    const particlesArr = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens);
    return { ambiguousArr, particlesArr, ambiguous: new Set(ambiguousArr), particles: new Set(particlesArr) };
  })();

  let cache = null;
  let overrides = {}; // position index -> bool include
  let correctionCache = [];

  function normKey(base, idx){
    return (base || '') + '#' + String(idx);
  }

  function setCorrectionDictStatus(text, kind){
    correctionDictStatus.textContent = text;
    correctionDictStatus.className = 'tag';
    if(kind === 'ok') correctionDictStatus.classList.add('good');
    if(kind === 'warn') correctionDictStatus.classList.add('bad');
  }

  function setCorrectionDictStatusFromState(state){
    if(state && state.ok){
      const suffix = String(state.source || '') === 'cmudict-0.7b-ipa-array.js' ? ' (JS fallback)' : '';
      setCorrectionDictStatus(`Dictionary: ${state.entries.toLocaleString()} entries${suffix}`, 'ok');
      return;
    }
    setCorrectionDictStatus(
      state && state.source === 'file-protocol-blocked'
        ? 'Dictionary: file:// auto-load blocked, heuristic only'
        : 'Dictionary: heuristic fallback only',
      'warn'
    );
  }

  function persistCorrectionPrefs(){
    const next = loadSttPrefs();
    next.correctionOnlyNonTeReo = !!correctionOnlyInput.checked;
    next.correctionMinCoverage = Math.max(0.60, Math.min(1, parseFloat(correctionThr.value || '0.8')));
    next.correctionShowTrace = !!correctionTraceInput.checked;
    next.correctionShowDiagnostics = !!correctionDiagnosticsInput.checked;
    next.correctionShowAllVariations = !!correctionShowAllInput.checked;
    next.preIpaSubstitutionsEnabled = !!preIpaInput.checked;
    next.preIpaCollapseRepeatingConsonants = !!preIpaCollapseInput.checked;
    next.phonotacticBridgeEnabled = !!phonotacticBridgeInput.checked;
    next.correctionRestrictStrict = !!correctionStrictInput.checked;
    next.correctionResultLimit = Math.max(5, Math.min(300, parseInt(correctionResultLimitInput.value || '40', 10) || 40));
    next.correctionSearchResultLimit = Math.max(5, Math.min(300, parseInt(correctionSearchLimitInput.value || '24', 10) || 24));
    next.preIpaSegmentLimit = Math.max(2, Math.min(40, parseInt(preIpaSegmentLimitInput.value || '12', 10) || 12));
    next.preIpaVariantLimit = Math.max(4, Math.min(400, parseInt(preIpaVariantLimitInput.value || '64', 10) || 64));
    next.correctionSubstituteRules = parseSttCorrectionSubstituteRulesText(correctionRulesArea.value || '');
    next.correctionSubstitutions = cloneSttCorrectionSubstitutions(Object.fromEntries(
      Object.entries(correctionSubInputs).map(([key, input])=> [key, !!input.checked])
    ));
    for(const key of Object.keys(next.correctionSubstituteRules || {})){
      if(!(key in next.correctionSubstitutions)) next.correctionSubstitutions[key] = false;
    }
    saveSttPrefs(next);
  }

  function clearCorrectionResults(message){
    correctionCache = [];
    correctionApplyAllBtn.disabled = true;
    correctionResults.innerHTML = '';
    if(message){
      correctionResults.appendChild(el('p', {class:'muted'}, [message]));
    }
  }

  function setSttRegressionStatus(text, kind){
    regressionStatus.textContent = text || '';
    regressionStatus.className = 'muted';
    if(kind === 'ok') regressionStatus.className = 'tag good';
    if(kind === 'warn') regressionStatus.className = 'tag bad';
  }

  function clearSttRegressionResults(message){
    regressionResults.innerHTML = '';
    if(message){
      regressionResults.appendChild(el('p', {class:'muted'}, [message]));
    }
  }

  function getSttRegressionConfigFromEditors(){
    return {
      suite: parseSttRegressionSuiteText(regressionSuiteArea.value || '[]'),
      settings: parseSttRegressionSettingsText(regressionSettingsArea.value || '{}')
    };
  }

  function saveSttRegressionConfig(config){
    const nextPrefs = loadSttPrefs();
    nextPrefs.sttRegressionSuite = normalizeSttRegressionSuite(config && config.suite);
    nextPrefs.sttRegressionSettings = normalizeSttRegressionSettings(config && config.settings);
    saveSttPrefs(nextPrefs);
  }

  function buildSttRegressionCorrectionOptions(settings){
    const next = normalizeSttRegressionSettings(settings);
    return {
      resultLimit: next.resultLimit,
      searchResultLimit: next.searchResultLimit,
      showAllVariations: !!next.showAllVariations,
      showDiagnostics: !!next.showDiagnostics,
      preIpaSubstitutionsEnabled: !!next.preIpaSubstitutionsEnabled,
      preIpaCollapseRepeatingConsonants: !!next.preIpaCollapseRepeatingConsonants,
      phonotacticBridgeEnabled: !!next.phonotacticBridgeEnabled,
      preIpaSegmentLimit: next.preIpaSegmentLimit,
      preIpaVariantLimit: next.preIpaVariantLimit,
      substituteRules: parseSttCorrectionSubstituteRulesText(next.substituteRulesText || ''),
      substitutions: cloneSttCorrectionSubstitutions(next.enabledSubstitutions)
    };
  }

  function applySttRegressionSettingsToControls(settings, options){
    const next = normalizeSttRegressionSettings(settings);
    const nextRules = parseSttCorrectionSubstituteRulesText(next.substituteRulesText || '');
    if(typeof setRichLexiconSourcePreference === 'function'){
      setRichLexiconSourcePreference(next.lexiconSource || 'v4');
    }
    if(correctionLexiconControl && correctionLexiconControl.select){
      correctionLexiconControl.select.value = next.lexiconSource || 'v4';
    }
    correctionOnlyInput.checked = !!next.onlyNonTeReo;
    correctionStrictInput.checked = !!next.strictOnly;
    correctionShowAllInput.checked = !!next.showAllVariations;
    correctionDiagnosticsInput.checked = !!next.showDiagnostics;
    preIpaInput.checked = !!next.preIpaSubstitutionsEnabled;
    preIpaCollapseInput.checked = !!next.preIpaCollapseRepeatingConsonants;
    phonotacticBridgeInput.checked = !!next.phonotacticBridgeEnabled;
    correctionThr.value = String(next.minCoverage);
    correctionThrTag.textContent = 'Correction Coverage: ' + Math.round(next.minCoverage * 100) + '%';
    correctionResultLimitInput.value = String(next.resultLimit);
    correctionSearchLimitInput.value = String(next.searchResultLimit);
    preIpaSegmentLimitInput.value = String(next.preIpaSegmentLimit);
    preIpaVariantLimitInput.value = String(next.preIpaVariantLimit);
    correctionRulesArea.value = formatSttCorrectionSubstituteRulesText(nextRules);
    for(const [key, input] of Object.entries(correctionSubInputs)){
      input.checked = !!next.enabledSubstitutions[key];
    }

    const nextPrefs = loadSttPrefs();
    nextPrefs.correctionOnlyNonTeReo = !!next.onlyNonTeReo;
    nextPrefs.correctionRestrictStrict = !!next.strictOnly;
    nextPrefs.correctionShowAllVariations = !!next.showAllVariations;
    nextPrefs.correctionShowDiagnostics = !!next.showDiagnostics;
    nextPrefs.correctionMinCoverage = next.minCoverage;
    nextPrefs.correctionResultLimit = next.resultLimit;
    nextPrefs.correctionSearchResultLimit = next.searchResultLimit;
    nextPrefs.preIpaSubstitutionsEnabled = !!next.preIpaSubstitutionsEnabled;
    nextPrefs.preIpaCollapseRepeatingConsonants = !!next.preIpaCollapseRepeatingConsonants;
    nextPrefs.phonotacticBridgeEnabled = !!next.phonotacticBridgeEnabled;
    nextPrefs.preIpaSegmentLimit = next.preIpaSegmentLimit;
    nextPrefs.preIpaVariantLimit = next.preIpaVariantLimit;
    nextPrefs.correctionSubstituteRules = nextRules;
    nextPrefs.correctionSubstitutions = cloneSttCorrectionSubstitutions(next.enabledSubstitutions);
    saveSttPrefs(nextPrefs);

    const hasUnknownRuleKeys = Object.keys(nextRules).some(key => !(key in correctionSubInputs));
    if(hasUnknownRuleKeys){
      renderSpeechToText();
      return;
    }
    if(options && options.runCorrections && (finalBox.value || '').trim()){
      runCorrections(true);
    }
  }

  function renderSttRegressionResults(results, settings){
    regressionResults.innerHTML = '';
    const list = Array.isArray(results) ? results : [];
    if(!list.length){
      regressionResults.appendChild(el('p', {class:'muted'}, ['No STT regression results yet.']));
      return;
    }
    const passCount = list.filter(item => item.pass).length;
    const topCount = list.filter(item => item.expectedRank === 0).length;
    const summary = el('div', {class:'row'});
    summary.appendChild(el('div', {class: passCount === list.length ? 'tag good' : 'tag bad'}, [`Pass ${passCount}/${list.length}`]));
    summary.appendChild(el('div', {class:'tag'}, [`Top Hits ${topCount}/${list.length}`]));
    summary.appendChild(el('div', {class:'tag'}, [`Lexicon ${(settings && settings.lexiconSource) || 'v4'}`]));
    summary.appendChild(el('div', {class:'tag'}, [`Coverage ${Math.round(((settings && settings.minCoverage) || 0.6) * 100)}%`]));
    regressionResults.appendChild(summary);

    for(const item of list){
      const box = el('div', {style:'margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surfaceTable);'});
      const title = el('div', {class:'row'});
      title.appendChild(el('div', {style:'font-weight:700;'}, [`${item.word} -> ${item.expected}`]));
      title.appendChild(el('div', {class: item.pass ? 'tag good' : 'tag bad'}, [item.pass ? 'Pass' : 'Fail']));
      title.appendChild(el('div', {class:'tag'}, [`Mode ${item.matchMode}`]));
      if(item.expectedRank >= 0){
        title.appendChild(el('div', {class:'tag'}, [`Found Rank ${item.expectedRank + 1}`]));
      } else {
        title.appendChild(el('div', {class:'tag bad'}, ['Expected Not Found']));
      }
      if(item.expectedRank > 0){
        title.appendChild(el('div', {class:'tag'}, ['Top Mismatch']));
      }
      box.appendChild(title);
      box.appendChild(el('div', {class:'muted', style:'margin-top:6px;'}, [`Top Result: ${item.topResult || '(none)'}`]));
      box.appendChild(el('div', {class:'muted', style:'margin-top:4px;'}, [`Visible Candidates: ${(item.visibleCandidates || []).slice(0, 12).join(', ') || '(none)'}`]));
      if(item.expectedResult){
        box.appendChild(el('div', {class:'muted', style:'margin-top:4px;'}, [
          `Expected Segments: ${(item.expectedResult.segments || []).join(' | ') || '(none)'}`
        ]));
      }
      regressionResults.appendChild(box);
    }
  }

  async function runSttRegressionSuite(renderNow){
    const config = getSttRegressionConfigFromEditors();
    saveSttRegressionConfig(config);
    applySttRegressionSettingsToControls(config.settings);
    setSttRegressionStatus('Running STT regression...', 'warn');
    setCorrectionDictStatus('Dictionary: loading...', 'warn');
    const dictState = await ensureSttCorrectionDictLoaded();
    setCorrectionDictStatusFromState(dictState);
    const settings = normalizeSttRegressionSettings(config.settings);
    const correctionOptions = buildSttRegressionCorrectionOptions(settings);
    const suite = normalizeSttRegressionSuite(config.suite);
    if(typeof setRichLexiconSourcePreference === 'function'){
      setRichLexiconSourcePreference(settings.lexiconSource || 'v4');
    }
    const results = [];
    for(const test of suite){
      await new Promise(resolve => setTimeout(resolve, 0));
      const testSettings = normalizeSttRegressionSettings({
        ...settings,
        ...(test.settings && typeof test.settings === 'object' ? test.settings : {}),
        enabledSubstitutions: {
          ...(settings.enabledSubstitutions || {}),
          ...((test.settings && test.settings.enabledSubstitutions && typeof test.settings.enabledSubstitutions === 'object')
            ? test.settings.enabledSubstitutions
            : {})
        },
        substituteRulesText: (test.settings && typeof test.settings === 'object' && test.settings.substituteRulesText != null)
          ? test.settings.substituteRulesText
          : settings.substituteRulesText
      });
      const expectedNorm = normalizeWord(test.expected || '');
      const rankedCandidates = suggestSttCorrectionForWord(test.word || '', buildSttRegressionCorrectionOptions(testSettings));
      const visibleCandidates = rankedCandidates.filter(candidate =>
        (candidate.coverage || 0) >= testSettings.minCoverage &&
        String(candidate.reconstructed || '') &&
        (!testSettings.strictOnly || passesSttCorrectionStrictFilter(candidate.reconstructed || '', detectLists))
      );
      const expectedRank = visibleCandidates.findIndex(candidate => normalizeWord(candidate.reconstructed || '') === expectedNorm);
      const expectedResult = expectedRank >= 0 ? visibleCandidates[expectedRank] : null;
      const top = visibleCandidates[0] || rankedCandidates[0] || null;
      const matchMode = normalizeSttRegressionMatchMode(test.matchMode);
      const pass = matchMode === 'top' ? expectedRank === 0 : expectedRank >= 0;
      results.push({
        word: String(test.word || '').trim(),
        expected: String(test.expected || '').trim(),
        matchMode,
        topResult: top ? String(top.reconstructed || '') : '',
        expectedRank,
        expectedResult,
        settings: testSettings,
        visibleCandidates: visibleCandidates.map(candidate => String(candidate.reconstructed || '')).filter(Boolean),
        pass
      });
    }
    if(renderNow) renderSttRegressionResults(results, settings);
    const passCount = results.filter(item => item.pass).length;
    setSttRegressionStatus(`STT regression ${passCount}/${results.length} passed.`, passCount === results.length ? 'ok' : 'warn');
    return { settings, results };
  }

  function computeDetect(rawText, thrVal){
    const parts = tokenizeTextBlockParts(rawText || '');
    let wi = -1;
    for(const p of parts){
      if(p.type === 'word'){
        wi += 1;
        p.wordIndex = wi;
      }
    }

    const boundaryAfter = new Array(wi+1).fill(false);
    for(let i=0;i<parts.length;i++){
      const p = parts[i];
      if(p.type !== 'word') continue;
      const next = parts[i+1];
      if(next && next.type === 'sep'){
        boundaryAfter[p.wordIndex] = isHardBoundary(next.text || '');
      }
    }

    const wordTokens = [];
    for(const p of parts) if(p.type === 'word') wordTokens.push({ raw: p.raw });

    const baseTokens = [];
    for(const wt of wordTokens){
      const norm = normalizeWord(wt.raw);
      const base = scoreTokenBase(norm, detectLists);
      baseTokens.push({
        raw: wt.raw,
        norm,
        base: base.base,
        signals: base.signals,
        debug: base.debug,
        segments: base.segments,
        ruleIds: base.ruleIds,
        coverage: base.coverage,
        orphans: base.orphans,
        hardBlock: base.hardBlock
      });
    }

    const scored = applyContextBoostBounded(baseTokens, detectLists, boundaryAfter);

    const shouldInclude = (i)=>{
      const t = scored[i];
      if(!t || t.hardBlock) return false;
      if(t.score >= thrVal) return true;

      const isSupport = (t.score >= Math.max(0.60, thrVal - 0.15))
        && (detectLists.particles.has(t.norm) || detectLists.ambiguous.has(t.norm));
      if(!isSupport) return false;

      const prevHigh = (i-1 >= 0 && !boundaryAfter[i-1] && scored[i-1].score >= thrVal);
      const nextHigh = (i+1 < scored.length && !boundaryAfter[i] && scored[i+1].score >= thrVal);
      return prevHigh || nextHigh;
    };

    const includeAuto = new Array(scored.length).fill(false);
    const includeFinal = new Array(scored.length).fill(false);

    const blocks = [];
    let cur = [];
    let curStart = 0;

    for(let i=0;i<scored.length;i++){
      if(i>0 && boundaryAfter[i-1] && cur.length){
        blocks.push({ start: curStart, idxs: cur.slice() });
        cur = [];
      }

      if(shouldInclude(i)){
        if(!cur.length) curStart = i;
        cur.push(i);
        includeAuto[i] = true;
      } else {
        if(cur.length){
          blocks.push({ start: curStart, idxs: cur.slice() });
          cur = [];
        }
      }
    }
    if(cur.length) blocks.push({ start: curStart, idxs: cur.slice() });

    for(let i=0;i<includeAuto.length;i++){
      if(i in overrides) includeFinal[i] = !!overrides[i];
      else includeFinal[i] = includeAuto[i];
    }

    return { parts, scored, blocks, includeAuto, includeFinal, boundaryAfter };
  }

  function drawDetails(t, idx){
    detailsEl.innerHTML = '';
    if(!t){
      detailsEl.appendChild(el('p', {class:'muted'}, ['Click a highlighted token to inspect it']));
      return;
    }

    const lab = scoreToLabel(t.score);
    detailsEl.appendChild(el('h4', {}, [t.raw + '  (' + (t.norm||'') + ')']));

    const head = el('div', {class:'row'});
    head.appendChild(el('div', {class:'tag ' + lab.cls}, [Math.round(t.score*100) + '%']));
    head.appendChild(el('div', {class:'tag'}, [lab.label]));

    const inc = el('label', {class:'checkbox'});
    const cb = el('input', {type:'checkbox'});
    cb.checked = !!cache.includeFinal[idx];
    inc.appendChild(cb);
    inc.appendChild(document.createTextNode('Include'));
    head.appendChild(inc);

    const clearOv = el('button', {class:'btn', type:'button'}, ['Clear Override']);
    head.appendChild(clearOv);

    detailsEl.appendChild(head);

    cb.addEventListener('change', ()=>{
      overrides[idx] = !!cb.checked;
      renderDetect(cache);
    });

    clearOv.addEventListener('click', ()=>{
      delete overrides[idx];
      renderDetect(cache);
    });

    if(t.segments && t.segments.length){
      detailsEl.appendChild(el('div', {class:'divider'}));
      detailsEl.appendChild(el('div', {class:'muted'}, ['Segments']));
      detailsEl.appendChild(el('div', {class:'mono'}, [t.segments.join(' | ')]));
    }

    detailsEl.appendChild(el('div', {class:'divider'}));
    detailsEl.appendChild(el('div', {class:'muted'}, ['Signals']));
    detailsEl.appendChild(renderSignalPills(t.signals || [], (id)=>{
      setActiveTab('detect');
      if(typeof drawSignalDetails === 'function') drawSignalDetails(id);
    }));

    detailsEl.appendChild(el('div', {class:'divider'}));
    detailsEl.appendChild(el('div', {class:'muted'}, ['Segmenter Rules Used']));
    detailsEl.appendChild(renderRulePills(t.ruleIds || [], (rid)=>{ drawRuleDetails(rid); setActiveTab('rules'); }));

    if(dbg.checked){
      detailsEl.appendChild(el('div', {class:'divider'}));
      detailsEl.appendChild(el('div', {class:'muted'}, ['Debug']));
      detailsEl.appendChild(el('pre', {style:'white-space:pre-wrap;'}, [
        JSON.stringify({
          base:t.base, contextDelta:t.contextDelta, notes:t.contextNotes,
          hardBlock:t.hardBlock, coverage:t.coverage, orphans:t.orphans, debug:t.debug
        }, null, 2)
      ]));
    }
  }

  function renderDetect(res){
    if(!res) return;
    cache = res;

    hl.innerHTML = '';
    blocksEl.innerHTML = '';
    detailsEl.innerHTML = '';

    const parts = res.parts || [];
    const scored = res.scored || [];

    const frag = document.createDocumentFragment();

    for(const p of parts){
      if(p.type === 'sep'){
        frag.appendChild(document.createTextNode(p.text || ''));
      } else {
        const t = scored[p.wordIndex];
        const lab = scoreToLabel(t.score);

        const sp = el('span', {class:'hlTok ' + lab.cls, 'data-idx': String(p.wordIndex)}, [p.raw]);

        if(res.includeFinal[p.wordIndex]){
          sp.classList.add('incl');
          const dot = el('span', {class:'muted', style:'margin-left:4px; font-size:10px;'}, ['•']);
          sp.appendChild(dot);
        }

        if(p.wordIndex in overrides){
          sp.classList.add('manual');
        }

        frag.appendChild(sp);
      }
    }

    hl.appendChild(frag);

    hl.querySelectorAll('.hlTok').forEach(sp=>{
      sp.addEventListener('click', (ev)=>{
        const idx = parseInt(sp.getAttribute('data-idx') || '', 10);
        if(Number.isNaN(idx)) return;

        if(ev.shiftKey){
          const next = !cache.includeFinal[idx];
          overrides[idx] = next;
          renderDetect(computeDetect(finalBox.value || '', clamp01(parseFloat(thr.value || '0.75'))));
          return;
        }

        hl.querySelectorAll('.hlTok').forEach(x=>x.classList.remove('sel'));
        sp.classList.add('sel');
        drawDetails(scored[idx], idx);
      });
    });

    if(!res.blocks.length){
      blocksEl.appendChild(el('p', {class:'muted'}, ['No blocks above threshold']));
    } else {
      for(const b of res.blocks){
        const words = b.idxs.map(i => scored[i].raw);
        const avg = b.idxs.reduce((a,i)=>a+scored[i].score,0) / b.idxs.length;
        const lab = scoreToLabel(avg);

        const btn = el('button', {
          type:'button',
          class:'btn tag ' + lab.cls,
          style:'width:100%; text-align:left; white-space:normal;',
          title:'Avg ' + Math.round(avg*100) + '%'
        }, [words.join(' ')]);

        btn.addEventListener('click', ()=>{
          const idx = b.start;
          const elTok = hl.querySelector('.hlTok[data-idx="' + idx + '"]');
          if(elTok) elTok.click();
        });

        blocksEl.appendChild(btn);
      }
    }

    // keep selected
    if(scored.length) drawDetails(scored[0], 0);
  }

  function applyCorrectionItems(items){
    if(!items || !items.length) return;
    const replacementMap = new Map();
    for(const item of items){
      if(!item || item.wordIndex == null || !item.best || !item.best.reconstructed) continue;
      replacementMap.set(item.wordIndex, matchSttCorrectionCase(item.raw, item.best.reconstructed));
    }
    if(!replacementMap.size) return;
    finalBox.value = applySttCorrectionMapToText(finalBox.value || '', replacementMap);
    runDetect(true);
  }

  function drawCorrectionResults(items){
    correctionResults.innerHTML = '';
    correctionApplyAllBtn.disabled = !items || !items.length;
    if(!items || !items.length){
      correctionResults.appendChild(el('p', {class:'muted'}, ['No correction suggestions met the current threshold.']));
      return;
    }
    const showDiagnostics = !!correctionDiagnosticsInput.checked;
    const showAllVariations = !!correctionShowAllInput.checked;
    const visibleCandidateCount = showAllVariations
      ? null
      : Math.max(5, Math.min(60, parseInt(correctionResultLimitInput.value || '40', 10) || 40));

    for(const item of items){
      const best = item.best || {};
      const box = el('div', {style:'margin-top:10px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surfaceTable);'});
      const title = el('div', {class:'row'});
      title.appendChild(el('div', {style:'font-weight:700;'}, [`${item.raw} -> ${best.reconstructed || ''}`]));
      title.appendChild(el('div', {class:'tag'}, [`Coverage ${Math.round((best.coverage || 0) * 100)}%`]));
      title.appendChild(el('div', {class:'tag'}, [`Confidence ${Math.round((best.confidence || 0) * 100)}%`]));
      title.appendChild(el('div', {class:'tag'}, [`Detect ${Math.round((item.detectScore || 0) * 100)}%`]));
      title.appendChild(el('div', {class:'tag'}, [best.source || '']));
      box.appendChild(title);

      box.appendChild(el('div', {class:'muted', style:'margin-top:6px;'}, [`Segments: ${(best.segments || []).join(' | ') || '(none)'}`]));
      box.appendChild(el('div', {class:'muted', style:'margin-top:4px;'}, [`Source: ${best.displaySource || best.proxyKey || ''}`]));
      if(best.variantWord){
        box.appendChild(el('div', {class:'muted', style:'margin-top:4px;'}, [`Pre-IPA Variant: ${best.variantWord}`]));
      }
      if(showDiagnostics){
        const tuningSummary = el('div', {class:'muted', style:'margin-top:4px;'}, [
          `Tuning: ranked ${item.tuning && item.tuning.resultLimit}; search ${item.tuning && item.tuning.searchResultLimit}; pre-IPA segment ${item.tuning && item.tuning.preIpaSegmentLimit}; pre-IPA total ${item.tuning && item.tuning.preIpaVariantLimit}; all variations ${item.tuning && item.tuning.showAllVariations ? 'on' : 'off'}; phonotactic bridge ${item.tuning && item.tuning.phonotacticBridgeEnabled ? 'on' : 'off'}`
        ]);
        box.appendChild(tuningSummary);
      }

      const candidateTitle = el('div', {class:'muted', style:'margin-top:10px;'}, ['Ranked Candidates']);
      const candidateWrap = el('div', {style:'margin-top:6px; display:grid; gap:6px;'});
      const candidateList = showAllVariations ? (item.candidates || []) : (item.candidates || []).slice(0, visibleCandidateCount);
      for(let ci = 0; ci < candidateList.length; ci++){
        const cand = candidateList[ci];
        const row = el('div', {style:'display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:8px; border:1px solid var(--border); border-radius:10px; background:var(--surface);'});
        row.appendChild(el('div', {class: ci === 0 ? 'tag good' : 'tag'}, [ci === 0 ? 'Top' : `Alt ${ci}`]));
        row.appendChild(el('div', {style:'font-weight:700;'}, [cand.reconstructed || '(none)']));
        row.appendChild(el('div', {class:'tag'}, [`${Math.round((cand.coverage || 0) * 100)}%`]));
        row.appendChild(el('div', {class:'tag'}, [`Confidence ${Math.round((cand.confidence || 0) * 100)}%`]));
        row.appendChild(el('div', {class:'tag'}, [cand.source || '']));
        if((cand.substituteCount || 0) > 0){
          row.appendChild(el('div', {class:'tag'}, [`Substitutions ${cand.substituteCount}`]));
        }
        if((cand.coverage || 0) < (item.minCoverage || 0)){
          row.appendChild(el('div', {class:'tag bad'}, ['Below threshold']));
        }
        row.appendChild(el('div', {class:'muted', style:'flex:1 1 280px;'}, [`${(cand.segments || []).join(' | ') || '(none)'}`]));
        if(cand.variantWord){
          row.appendChild(el('div', {class:'muted', style:'flex:1 1 100%;'}, [`Pre-IPA Variant: ${cand.variantWord}`]));
        }
        const substitutionParts = [];
        for(const match of (cand.matches || [])){
          for(const part of (match.substitutionParts || [])){
            substitutionParts.push(`${match.sourceSlice || match.matched || ''}: ${part.source} -> ${part.target}`);
          }
        }
        if(substitutionParts.length){
          row.appendChild(el('div', {class:'muted', style:'flex:1 1 100%;'}, [`Substituted: ${substitutionParts.join(' ; ')}`]));
        }
        const preprocessParts = (cand.preprocessSteps || []).map(step => {
          if(step.stage === 'preIpaCollapse') return `${step.source} -> ${step.target} (collapse)`;
          return `${step.source} -> ${step.target}`;
        });
        if(preprocessParts.length){
          row.appendChild(el('div', {class:'muted', style:'flex:1 1 100%;'}, [`Pre-IPA Steps: ${preprocessParts.join(' ; ')}`]));
        }
        const phonotacticParts = (cand.phonotacticBridgeParts || []).map(part => {
          if(part.type === 'collapse_duplicate_consonant'){
            return `Dropped ${part.dropped} before ${part.next}`;
          }
          return `${part.from} -> ${part.to} before ${part.before} (bridge ${part.bridgeVowel})`;
        });
        if(phonotacticParts.length){
          row.appendChild(el('div', {class:'muted', style:'flex:1 1 100%;'}, [`Phonotactic Bridge: ${phonotacticParts.join(' ; ')}`]));
        }
        if(showDiagnostics){
          const metrics = cand.confidenceMetrics || getSttCorrectionConfidenceMetrics(cand);
          row.appendChild(el('div', {class:'muted', style:'flex:1 1 100%;'}, [
            `Diagnostics: score ${Math.round((metrics.confidence || 0) * 100)}%; matched ${cand.matchedChars || 0}/${cand.totalLen || Math.max(1, String(cand.proxyKey || '').length)}; exact ${cand.exactCount || 0}; breaks ${cand.breakHits || 0}; near ${cand.nearCount || 0}; partial ${cand.partialCount || 0}; gaps ${cand.gaps || 0}; cross-break ${cand.crossBreakPenalty || 0}; proxy penalty ${cand.proxyPenalty || 0}; phonotactic ${cand.phonotacticBridgeCount || 0}`
          ]));
        }
        candidateWrap.appendChild(row);
      }
      box.appendChild(candidateTitle);
      box.appendChild(candidateWrap);
      if(!showAllVariations && (item.candidates || []).length > candidateList.length){
        box.appendChild(el('div', {class:'muted', style:'margin-top:6px;'}, [
          `Showing ${candidateList.length} of ${(item.candidates || []).length} variations. Enable "Show Every Variation" to render the full ranked set kept by the current tuning limits.`
        ]));
      }

      const actions = el('div', {class:'row', style:'margin-top:8px;'});
      const applyBtn = el('button', {class:'btn', type:'button'}, ['Apply']);
      applyBtn.addEventListener('click', ()=>{
        applyCorrectionItems([item]);
        runCorrections(true);
      });
      actions.appendChild(applyBtn);

      box.appendChild(actions);
      if(correctionTraceInput.checked){
        const traceDetails = el('details', {style:'margin-top:8px; width:100%;'});
        traceDetails.appendChild(el('summary', {}, ['Correction Trace']));
        traceDetails.appendChild(el('pre', {style:'white-space:pre-wrap; margin-top:8px;'}, [
          JSON.stringify(item.trace || {}, null, 2)
        ]));
        box.appendChild(traceDetails);
      }

      correctionResults.appendChild(box);
    }
  }

  async function runCorrections(renderNow){
    persistCorrectionPrefs();
    correctionThrTag.textContent = 'Correction Coverage: ' + Math.round(parseFloat(correctionThr.value || '0.8') * 100) + '%';
    setCorrectionDictStatus('Dictionary: loading...', 'warn');
    const dictState = await ensureSttCorrectionDictLoaded();
    setCorrectionDictStatusFromState(dictState);

    const detectRes = runDetect(false);
    const minCoverage = Math.max(0.60, Math.min(1, parseFloat(correctionThr.value || '0.8')));
    const onlyNonTeReo = !!correctionOnlyInput.checked;
    const strictOnly = !!correctionStrictInput.checked;
    const correctionOptions = {
      resultLimit: Math.max(5, Math.min(300, parseInt(correctionResultLimitInput.value || '40', 10) || 40)),
      searchResultLimit: Math.max(5, Math.min(300, parseInt(correctionSearchLimitInput.value || '24', 10) || 24)),
      showAllVariations: !!correctionShowAllInput.checked,
      showDiagnostics: !!correctionDiagnosticsInput.checked,
      preIpaSubstitutionsEnabled: !!preIpaInput.checked,
      preIpaCollapseRepeatingConsonants: !!preIpaCollapseInput.checked,
      phonotacticBridgeEnabled: !!phonotacticBridgeInput.checked,
      preIpaSegmentLimit: Math.max(2, Math.min(40, parseInt(preIpaSegmentLimitInput.value || '12', 10) || 12)),
      preIpaVariantLimit: Math.max(4, Math.min(400, parseInt(preIpaVariantLimitInput.value || '64', 10) || 64)),
      substituteRules: parseSttCorrectionSubstituteRulesText(correctionRulesArea.value || ''),
      substitutions: cloneSttCorrectionSubstitutions(Object.fromEntries(
        Object.entries(correctionSubInputs).map(([key, input])=> [key, !!input.checked])
      ))
    };
    const items = [];
    for(let i=0; i<(detectRes.scored || []).length; i++){
      const token = detectRes.scored[i];
      if(!token) continue;
      const raw = String(token.raw || '').trim();
      const norm = normalizeWord(raw);
      if(!raw || raw.length < 2) continue;
      if(onlyNonTeReo && detectRes.includeFinal && detectRes.includeFinal[i]) continue;
      const rankedCandidates = suggestSttCorrectionForWord(raw, correctionOptions);
      const suggestions = rankedCandidates.filter(s =>
        (s.coverage || 0) >= minCoverage &&
        String(s.reconstructed || '') &&
        normalizeWord(s.reconstructed || '') !== norm &&
        (!strictOnly || passesSttCorrectionStrictFilter(s.reconstructed || '', detectLists))
      );
      if(!suggestions.length) continue;
      items.push({
        wordIndex: i,
        raw,
        norm,
        detectScore: Number(token.score) || 0,
        minCoverage,
        candidates: rankedCandidates,
        suggestions,
        best: suggestions[0],
        tuning: {
          resultLimit: correctionOptions.resultLimit,
          searchResultLimit: correctionOptions.searchResultLimit,
          preIpaSegmentLimit: correctionOptions.preIpaSegmentLimit,
          preIpaVariantLimit: correctionOptions.preIpaVariantLimit,
          showAllVariations: !!correctionShowAllInput.checked,
          showDiagnostics: !!correctionDiagnosticsInput.checked,
          phonotacticBridgeEnabled: !!phonotacticBridgeInput.checked
        },
        trace: {
          raw,
          norm,
          detectScore: Number(token.score) || 0,
          includeInDetect: !!(detectRes.includeFinal && detectRes.includeFinal[i]),
          minCoverage,
          tuning: {
            resultLimit: correctionOptions.resultLimit,
            searchResultLimit: correctionOptions.searchResultLimit,
            preIpaSegmentLimit: correctionOptions.preIpaSegmentLimit,
            preIpaVariantLimit: correctionOptions.preIpaVariantLimit,
            showAllVariations: !!correctionShowAllInput.checked,
            showDiagnostics: !!correctionDiagnosticsInput.checked,
            phonotacticBridgeEnabled: !!phonotacticBridgeInput.checked
          },
          proxyCandidates: getSttCorrectionProxyCandidates(raw, correctionOptions),
          rankedCandidates: rankedCandidates.map(c => ({
            reconstructed: c.reconstructed,
            source: c.source,
            displaySource: c.displaySource,
            variantWord: c.variantWord,
            preprocessSteps: c.preprocessSteps,
            proxyKey: c.proxyKey,
            proxyBoundaries: c.proxyBoundaries,
            coverage: c.coverage,
            matchedChars: c.matchedChars,
            exactCount: c.exactCount,
            breakHits: c.breakHits,
            crossBreakPenalty: c.crossBreakPenalty,
            substituteCount: c.substituteCount,
            nearCount: c.nearCount,
            partialCount: c.partialCount,
            gaps: c.gaps,
            confidence: c.confidence,
            confidenceMetrics: c.confidenceMetrics,
            segments: c.segments,
            matches: c.matches
          }))
        }
      });
    }
    correctionCache = items;
    if(renderNow) drawCorrectionResults(items);
    return items;
  }

  function runDetect(renderNow){
    const rawText = String(finalBox.value || '');
    const thrVal = clamp01(parseFloat(thr.value || '0.75'));
    thrTag.textContent = 'Threshold: ' + Math.round(thrVal*100) + '%';
    const res = computeDetect(rawText, thrVal);
    if(renderNow) renderDetect(res);
    return res;
  }

  analyzeBtn.addEventListener('click', ()=> runDetect(true));

  thr.addEventListener('input', ()=>{
    const next = loadSttPrefs();
    next.autoDetectThreshold = clamp01(parseFloat(thr.value || '0.75'));
    saveSttPrefs(next);
    thrTag.textContent = 'Threshold: ' + Math.round(parseFloat(thr.value)*100) + '%';
    runDetect(true);
    if(correctionCache.length) runCorrections(true);
  });

  dbg.addEventListener('change', ()=>{
    const next = loadSttPrefs();
    next.showDebug = !!dbg.checked;
    saveSttPrefs(next);
    runDetect(true);
    if(correctionCache.length) runCorrections(true);
  });

  teReoWordsBtn.addEventListener('click', async ()=>{
    const res = runDetect(false);
    const words = [];
    for(let i=0;i<(res.scored||[]).length;i++){
      if(res.includeFinal[i]) words.push(res.scored[i].raw);
    }
    const out = words.join(' ');
    try{
      await navigator.clipboard.writeText(out);
    } catch(e){
      alert('Copy failed');
    }
  });

  correctionAnalyzeBtn.addEventListener('click', ()=>{ runCorrections(true); });
  correctionApplyAllBtn.addEventListener('click', ()=>{
    if(!correctionCache.length) return;
    applyCorrectionItems(correctionCache);
    runCorrections(true);
  });
  correctionOnlyInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    runCorrections(true);
  });
  correctionTraceInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if((finalBox.value || '').trim()) runCorrections(true);
  });
  correctionDiagnosticsInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if(correctionCache.length) drawCorrectionResults(correctionCache);
    else if((finalBox.value || '').trim()) runCorrections(true);
  });
  correctionShowAllInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if(correctionCache.length) drawCorrectionResults(correctionCache);
    else if((finalBox.value || '').trim()) runCorrections(true);
  });
  preIpaInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if((finalBox.value || '').trim()) runCorrections(true);
  });
  preIpaCollapseInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if((finalBox.value || '').trim()) runCorrections(true);
  });
  phonotacticBridgeInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if((finalBox.value || '').trim()) runCorrections(true);
  });
  correctionStrictInput.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    if((finalBox.value || '').trim()) runCorrections(true);
  });
  Object.values(correctionSubInputs).forEach(input =>{
    input.addEventListener('change', ()=>{
      persistCorrectionPrefs();
      if((finalBox.value || '').trim()) runCorrections(true);
    });
  });
  correctionRulesSaveBtn.addEventListener('click', ()=>{
    try{
      const nextRules = parseSttCorrectionSubstituteRulesText(correctionRulesArea.value || '');
      const nextPrefs = loadSttPrefs();
      nextPrefs.correctionSubstituteRules = nextRules;
      nextPrefs.correctionSubstitutions = {
        ...cloneSttCorrectionSubstitutions(nextPrefs.correctionSubstitutions),
        ...Object.fromEntries(Object.keys(nextRules).map(key => [key, !!nextPrefs.correctionSubstitutions?.[key]]))
      };
      saveSttPrefs(nextPrefs);
      correctionRulesStatus.textContent = 'Rules saved.';
      correctionRulesStatus.className = 'tag good';
      renderSpeechToText();
    } catch(_err){
      correctionRulesStatus.textContent = 'Rules save failed.';
      correctionRulesStatus.className = 'tag bad';
    }
  });
  correctionRulesResetBtn.addEventListener('click', ()=>{
    const defaults = getDefaultSttCorrectionSubstituteRules();
    const nextPrefs = loadSttPrefs();
    nextPrefs.correctionSubstituteRules = defaults;
    nextPrefs.correctionSubstitutions = defaultSttCorrectionSubstitutions();
    saveSttPrefs(nextPrefs);
    correctionRulesArea.value = formatSttCorrectionSubstituteRulesText(defaults);
    correctionRulesStatus.textContent = 'Rules reset.';
    correctionRulesStatus.className = 'tag good';
    renderSpeechToText();
  });
  correctionThr.addEventListener('input', ()=>{
    correctionThrTag.textContent = 'Correction Coverage: ' + Math.round(parseFloat(correctionThr.value || '0.8') * 100) + '%';
  });
  correctionThr.addEventListener('change', ()=>{
    persistCorrectionPrefs();
    runCorrections(true);
  });
  [correctionResultLimitInput, correctionSearchLimitInput, preIpaSegmentLimitInput, preIpaVariantLimitInput].forEach(input =>{
    input.addEventListener('change', ()=>{
      persistCorrectionPrefs();
      if((finalBox.value || '').trim()) runCorrections(true);
    });
  });
  correctionDictBtn.addEventListener('click', async ()=>{
    resetSttCorrectionDictState();
    setCorrectionDictStatus('Dictionary: loading...', 'warn');
    const state = await ensureSttCorrectionDictLoaded();
    setCorrectionDictStatusFromState(state);
  });

  regressionSaveBtn.addEventListener('click', ()=>{
    try{
      const config = getSttRegressionConfigFromEditors();
      saveSttRegressionConfig(config);
      regressionSuiteArea.value = JSON.stringify(config.suite, null, 2);
      regressionSettingsArea.value = JSON.stringify(config.settings, null, 2);
      setSttRegressionStatus('STT regression suite saved.', 'ok');
    } catch(err){
      setSttRegressionStatus(err && err.message ? err.message : 'STT regression suite save failed.', 'warn');
    }
  });
  regressionDefaultsBtn.addEventListener('click', ()=>{
    const suite = getDefaultSttRegressionSuite();
    const settings = getDefaultSttRegressionSettings();
    regressionSuiteArea.value = JSON.stringify(suite, null, 2);
    regressionSettingsArea.value = JSON.stringify(settings, null, 2);
    saveSttRegressionConfig({ suite, settings });
    clearSttRegressionResults('Defaults loaded. Run STT regression to verify.');
    setSttRegressionStatus('STT regression defaults loaded.', 'ok');
  });
  regressionApplyBtn.addEventListener('click', ()=>{
    try{
      const config = getSttRegressionConfigFromEditors();
      saveSttRegressionConfig(config);
      regressionSuiteArea.value = JSON.stringify(config.suite, null, 2);
      regressionSettingsArea.value = JSON.stringify(config.settings, null, 2);
      applySttRegressionSettingsToControls(config.settings, { runCorrections: !!(finalBox.value || '').trim() });
      setSttRegressionStatus('Suite settings applied to correction controls.', 'ok');
    } catch(err){
      setSttRegressionStatus(err && err.message ? err.message : 'Suite settings apply failed.', 'warn');
    }
  });
  regressionRunBtn.addEventListener('click', async ()=>{
    try{
      await runSttRegressionSuite(true);
    } catch(err){
      clearSttRegressionResults('STT regression run failed.');
      setSttRegressionStatus(err && err.message ? err.message : 'STT regression run failed.', 'warn');
    }
  });

  // initial detect from existing transcript if present
  clearCorrectionResults('Analyze corrections to see proxy-to-te-reo suggestions.');
  clearSttRegressionResults('Run STT regression to verify English proxy outputs against the saved suite.');
  ensureSttCorrectionDictLoaded().then(state =>{
    setCorrectionDictStatusFromState(state);
  }).catch(()=>{
    setCorrectionDictStatus('Dictionary: heuristic fallback only', 'warn');
  });
  if((finalBox.value || '').trim()) runDetect(true);
}
