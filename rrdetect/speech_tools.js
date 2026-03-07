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

function defaultSttPrefs(){
  return {
    lang: 'mi-NZ',
    continuous: true,
    interim: true,
    autoDetectThreshold: 0.75,
    showDebug: false
  };
}

function loadSttPrefs(){
  const base = defaultSttPrefs();
  const raw = loadFromStorage(STORAGE_KEYS.sttPrefs);
  const parsed = raw ? safeJsonParse(raw) : {ok:false};
  if(parsed.ok && parsed.value && typeof parsed.value === 'object') return {...base, ...parsed.value};
  return base;
}

function saveSttPrefs(p){
  return saveToStorage(STORAGE_KEYS.sttPrefs, JSON.stringify(p || {}, null, 2));
}

function loadSttHistory(){
  const raw = loadFromStorage(STORAGE_KEYS.sttHistory);
  const parsed = raw ? safeJsonParse(raw) : {ok:false};
  if(parsed.ok && Array.isArray(parsed.value)) return parsed.value;
  return [];
}

function saveSttHistory(list){
  return saveToStorage(STORAGE_KEYS.sttHistory, JSON.stringify(list || [], null, 2));
}

function addSttHistoryEntry(entry){
  const list = loadSttHistory();
  list.unshift(entry);
  if(list.length > 200) list.length = 200;
  saveSttHistory(list);
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

  transcriptCard.appendChild(interimLine);
  transcriptCard.appendChild(finalBox);
  transcriptCard.appendChild(buttons2);

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

  // History Panel
  const histCard = el('div', {class:'card'});
  histCard.appendChild(el('h3', {}, ['History']));
  const histList = el('div', {});
  histCard.appendChild(histList);
  root.appendChild(histCard);

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
      saveSttHistory([]);
      refreshHistory();
    });

    for(const it of list.slice(0, 30)){
      const b = el('button', {class:'btn', type:'button', style:'width:100%; text-align:left; white-space:normal;'}, [
        (it.when || '') + '  ' + (it.lang || '') + '  ' + (it.text || '').slice(0, 120)
      ]);
      b.addEventListener('click', ()=>{
        finalBox.value = it.text || '';
        runDetect(true);
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
    addSttHistoryEntry({ when: new Date().toISOString().replace('T',' ').slice(0,19), lang: getSelectedLang(), text: txt });
    refreshHistory();
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

  function normKey(base, idx){
    return (base || '') + '#' + String(idx);
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
  });

  dbg.addEventListener('change', ()=>{
    const next = loadSttPrefs();
    next.showDebug = !!dbg.checked;
    saveSttPrefs(next);
    runDetect(true);
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

  // initial detect from existing transcript if present
  if((finalBox.value || '').trim()) runDetect(true);
}
