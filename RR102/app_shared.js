// Extracted first-pass shared helpers from the standalone source file.

  function nextAutoFieldId(prefix='rr_field'){
    window.__rrAutoFieldCounter = (window.__rrAutoFieldCounter || 0) + 1;
    return `${prefix}_${window.__rrAutoFieldCounter}`;
  }

  function getAutoAriaLabel(tagName, rawAttrs, fieldType){
    if(rawAttrs.placeholder) return String(rawAttrs.placeholder);
    if(rawAttrs.title) return String(rawAttrs.title);
    if(tagName === 'textarea') return 'Text area';
    if(tagName === 'select') return 'Select field';
    if(fieldType === 'checkbox') return 'Checkbox';
    if(fieldType === 'radio') return 'Radio option';
    if(fieldType === 'file') return 'File input';
    if(fieldType === 'range') return 'Range slider';
    if(fieldType === 'number') return 'Number input';
    if(fieldType === 'search') return 'Search input';
    return 'Text input';
  }

  function el(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    const tagName = String(tag || '').toLowerCase();
    const rawAttrs = attrs || {};
    const isFormField = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const fieldType = isFormField && rawAttrs.type != null ? String(rawAttrs.type).toLowerCase() : '';
    const canAutoLabel = isFormField && fieldType !== 'hidden';

    if(isFormField && !Object.prototype.hasOwnProperty.call(rawAttrs, 'id')){
      rawAttrs.id = nextAutoFieldId(tagName);
    }

    if(isFormField && !Object.prototype.hasOwnProperty.call(rawAttrs, 'name') && fieldType !== 'button' && fieldType !== 'submit' && fieldType !== 'reset'){
      rawAttrs.name = rawAttrs.id || nextAutoFieldId(tagName);
    }

    if(canAutoLabel && !Object.prototype.hasOwnProperty.call(rawAttrs, 'aria-label') && !Object.prototype.hasOwnProperty.call(rawAttrs, 'aria-labelledby')){
      rawAttrs['aria-label'] = getAutoAriaLabel(tagName, rawAttrs, fieldType);
    }
    for(const [k,v] of Object.entries(rawAttrs)){
      if(k === 'class') node.className = v;
      else if(k === 'html') node.innerHTML = v;
      else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for(const c of (children||[])){
      if(typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if(c) node.appendChild(c);
    }
    return node;
  }

  function escapeHtml(s){
    return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  function downloadText(filename, text, mime='text/plain'){
    const blob = new Blob([text], {type:mime});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function safeJsonParse(text){
    try{ return {ok:true, value: JSON.parse(text)}; }
    catch(e){ return {ok:false, error: String(e && e.message ? e.message : e)}; }
  }

  
  // Shared focus tracking and insertion helpers (IPA keyboard and SSML inserters)
  const APP_SHARED = window.APP_SHARED = window.APP_SHARED || {};
  if(!APP_SHARED.__focusTrackerInstalled){
    APP_SHARED.__focusTrackerInstalled = true;
    APP_SHARED.lastFocused = null;
    APP_SHARED.onFocus = APP_SHARED.onFocus || null;
    document.addEventListener('focusin', (e)=>{
      APP_SHARED.lastFocused = e.target;
      if(typeof APP_SHARED.onFocus === 'function'){
        try { APP_SHARED.onFocus(e); } catch(_e) {}
      }
    }, true);
  }

  const IPA_SYMBOL_OPTIONS_HTML = `          <optgroup label="Tone And Pitch Modifiers">
            <option value="˥">˥ - Extra high pitch</option>
            <option value="˦">˦ - High pitch</option>
            <option value="˧">˧ - Mid pitch</option>
            <option value="˨">˨ - Low pitch</option>
            <option value="˩">˩ - Extra low pitch</option>
            <option value="˩˥">˩˥ - Rising pitch</option>
            <option value="˥˩">˥˩ - Falling pitch</option>
          </optgroup>
          <optgroup label="Timing And Length Modifiers">
            <option value="ː">ː - Long vowel</option>
            <option value="ˑ">ˑ - Half-long</option>
            <option value="˘">˘ - Extra short</option>
            <option value="ˈ">ˈ - Primary stress</option>
            <option value="ˌ">ˌ - Secondary stress</option>
            <option value=".">. - Syllable break</option>
            <option value="̚">̚ - No audible release</option>
          </optgroup>
          <optgroup label="Phonation And Voice Quality">
            <option value="̤">̤ - Breathy</option>
            <option value="̰">̰ - Creaky</option>
            <option value="ʰ">ʰ - Aspirated</option>
            <option value="ɦ">ɦ - Voiced glottal fricative</option>
            <option value="̥">̥ - Voiceless</option>
            <option value="̬">̬ - Voiced emphasis</option>
            <option value="ˤ">ˤ - Pharyngealised</option>
            <option value="ʕ">ʕ - Pharyngeal approximant</option>
            <option value="˞">˞ - R-coloring</option>
            <option value="̝">̝ - Raised articulation</option>
            <option value="̞">̞ - Lowered articulation</option>
          </optgroup>
          <optgroup label="Place And Articulation Modifiers">
            <option value="ʲ">ʲ - Palatalised</option>
            <option value="ʷ">ʷ - Labialised</option>
            <option value="̪">̪ - Dental articulation</option>
            <option value="̠">̠ - Retracted articulation</option>
            <option value="̩">̩ - Syllabic consonant</option>
            <option value="̯">̯ - Non-syllabic vowel</option>
          </optgroup>
          <optgroup label="Glottal And Nasality Control">
            <option value="ʔ">ʔ - Glottal stop</option>
            <option value="ⁿ">ⁿ - Nasal release</option>
            <option value="̃">̃ - Nasalised vowel</option>
            <option value="ŋ">ŋ - Velar nasal</option>
          </optgroup>
          <optgroup label="Voicing And Articulation Variants">
            <option value="̙">̙ - Advanced tongue root (ATR)</option>
            <option value="̘">̘ - Retracted tongue root (RTR)</option>
            <option value="̺">̺ - Apical articulation (tongue tip)</option>
            <option value="̻">̻ - Laminal articulation (tongue blade)</option>
            <option value="ˠ">ˠ - Velarised (dark sound)</option>
            <option value="ˡ">ˡ - Lateral release</option>
            <option value="˞">˞ - Rhoticity (R-coloring)</option>
          </optgroup>
          <optgroup label="Special And Advanced">
            <option value="͡">͡ - Tie bar (coarticulation)</option>
            <option value="͜">͜ - Double tie bar</option>
            <option value="̼">̼ - Linguolabial</option>
            <option value="͍">͍ - Breathy underline</option>
          </optgroup>
          <optgroup label="Rhythm And Phrase Control">
            <option value="|">| - Minor (foot) group</option>
            <option value="‖">‖ - Major phrase boundary</option>
            <option value="↓">↓ - Pitch lowering (non-tonal)</option>
            <option value="↑">↑ - Pitch raising (non-tonal)</option>
            <option value="↗">↗ - Rising intonation</option>
            <option value="↘">↘ - Falling intonation</option>
          </optgroup>
          <optgroup label="IPA Base Characters - Vowels">
            <option value="a">a - Open front unrounded vowel</option>
            <option value="ɑ">ɑ - Open back unrounded vowel</option>
            <option value="æ">æ - Near-open front unrounded vowel</option>
            <option value="ɐ">ɐ - Near-open central vowel</option>
            <option value="e">e - Close-mid front unrounded vowel</option>
            <option value="ɛ">ɛ - Open-mid front unrounded vowel</option>
            <option value="ə">ə - Mid-central vowel</option>
            <option value="ɜ">ɜ - Open-mid central vowel</option>
            <option value="ɞ">ɞ - Open-mid central rounded vowel</option>
            <option value="i">i - Close front unrounded vowel</option>
            <option value="ɪ">ɪ - Near-close near-front unrounded vowel</option>
            <option value="o">o - Close-mid back rounded vowel</option>
            <option value="ɔ">ɔ - Open-mid back rounded vowel</option>
            <option value="u">u - Close back rounded vowel</option>
            <option value="ʊ">ʊ - Near-close near-back rounded vowel</option>
            <option value="y">y - Close front rounded vowel</option>
            <option value="ʏ">ʏ - Near-close near-front rounded vowel</option>
          </optgroup>
          <optgroup label="IPA Base Characters - R Variants">
            <option value="r">r - Alveolar trill</option>
            <option value="ɾ">ɾ - Alveolar flap</option>
            <option value="ʀ">ʀ - Uvular trill</option>
            <option value="ɹ">ɹ - Alveolar approximant (English r)</option>
            <option value="ɻ">ɻ - Retroflex approximant</option>
            <option value="ɽ">ɽ - Retroflex flap</option>
            <option value="ʁ">ʁ - Voiced uvular fricative</option>
          </optgroup>
          <optgroup label="IPA Base Characters - Consonants">
            <option value="b">b - Voiced bilabial plosive</option>
            <option value="d">d - Voiced alveolar plosive</option>
            <option value="g">g - Voiced velar plosive</option>
            <option value="k">k - Voiceless velar plosive</option>
            <option value="p">p - Voiceless bilabial plosive</option>
            <option value="t">t - Voiceless alveolar plosive</option>
            <option value="m">m - Bilabial nasal</option>
            <option value="n">n - Alveolar nasal</option>
            <option value="ŋ">ŋ - Velar nasal</option>
            <option value="f">f - Voiceless labiodental fricative</option>
            <option value="v">v - Voiced labiodental fricative</option>
            <option value="θ">θ - Voiceless dental fricative</option>
            <option value="ð">ð - Voiced dental fricative</option>
            <option value="s">s - Voiceless alveolar fricative</option>
            <option value="z">z - Voiced alveolar fricative</option>
            <option value="ʃ">ʃ - Voiceless postalveolar fricative</option>
            <option value="ʒ">ʒ - Voiced postalveolar fricative</option>
            <option value="h">h - Voiceless glottal fricative</option>
            <option value="ɦ">ɦ - Voiced glottal fricative</option>
            <option value="l">l - Alveolar lateral approximant</option>
            <option value="ʎ">ʎ - Palatal lateral approximant</option>
            <option value="ʔ">ʔ - Glottal stop</option>
          </optgroup>
          <optgroup label="Digraphs And Clusters - Maori Specific">
            <option value="ŋ">ng - ŋ</option>
            <option value="f">wh - f</option>
            <option value="ɸ">wh alternative - ɸ</option>
            <option value="ŋˤ">ng nasal deep - ŋˤ</option>
            <option value="d̞">r soft d - d̞</option>
            <option value="ɾ͡d">r flap-tap - ɾ͡d</option>
            <option value="ʀdʀ">r uvular roll - ʀdʀ</option>
            <option value="ʁ̞">r deep glottal - ʁ̞</option>
            <option value="ŋ̞">ng softened - ŋ̞</option>
            <option value="ŋˤː">ng emphatic long - ŋˤː</option>
          </optgroup>
          <optgroup label="Diphthongs - Maori Vowel Combinations">
            <option value="a̯i">ai - a̯i</option>
            <option value="a̯u">au - a̯u</option>
            <option value="e̯i">ei - e̯i</option>
            <option value="o̯u">ou - o̯u</option>
            <option value="u̯i">ui - u̯i</option>
            <option value="o̯i">oi - o̯i</option>
            <option value="i̯a">ia - i̯a</option>
            <option value="e̯a">ea - e̯a</option>
            <option value="i̯o">io - i̯o</option>
            <option value="a̯e">ae - a̯e</option>
            <option value="o̯a">oa - o̯a</option>
            <option value="u̯a">ua - u̯a</option>
          </optgroup>
          <optgroup label="Diphthongs - English Vowel Combinations">
            <option value="aɪ">aɪ - eye</option>
            <option value="aʊ">aʊ - ow</option>
            <option value="eɪ">eɪ - ay</option>
            <option value="oʊ">oʊ - oh</option>
            <option value="ɔɪ">ɔɪ - oy</option>
            <option value="ɪə">ɪə - ear (common in British English)</option>
            <option value="eə">eə - air (British variant)</option>
            <option value="ʊə">ʊə - oor (British variant)</option>
          </optgroup>
          <optgroup label="R Variants And Combinations Tested">
            <option value="ɾ">ɾ - Tap r</option>
            <option value="d̞">d̞ - Soft d</option>
            <option value="ɾ͡d">ɾ͡d - Flap plus soft d</option>
            <option value="ɾ͡d̞">ɾ͡d̞ - Flap tied to soft d</option>
            <option value="ɾ͡d˞">ɾ͡d˞ - Flap plus r-color</option>
            <option value="ʀ">ʀ - Uvular trill</option>
            <option value="ʀdʀ">ʀdʀ - Strong rolled r</option>
            <option value="ʁ̞">ʁ̞ - Soft glottal r</option>
            <option value="ɹ̠">ɹ̠ - Retracted English r</option>
          </optgroup>
          <optgroup label="Ng Variants And Combinations Tested">
            <option value="ŋ">ŋ - Standard ng</option>
            <option value="ŋˤ">ŋˤ - Pharyngealised ng</option>
            <option value="ŋ̞">ŋ̞ - Softened ng</option>
            <option value="ŋˤː">ŋˤː - Long deep nasal</option>
            <option value="ⁿg">ⁿg - Nasal release with following g</option>
            <option value="ʔŋ">ʔŋ - Glottal plus ng onset</option>
          </optgroup>
        `;

  function insertAtCursorText(el, text){
    if(!el) return;
    const tag = (el.tagName || '').toLowerCase();
    if(tag !== 'input' && tag !== 'textarea') return;
    const start = (typeof el.selectionStart === 'number') ? el.selectionStart : (el.value || '').length;
    const end = (typeof el.selectionEnd === 'number') ? el.selectionEnd : (el.value || '').length;
    const before = (el.value || '').slice(0, start);
    const after = (el.value || '').slice(end);
    el.value = before + text + after;
    el.focus();
    const pos = start + text.length;
    try {
      el.selectionStart = el.selectionEnd = pos;
    } catch(_e) {}
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function wrapSelectionText(el, before, after){
    if(!el) return;
    const tag = (el.tagName || '').toLowerCase();
    if(tag !== 'input' && tag !== 'textarea') return;
    const start = (typeof el.selectionStart === 'number') ? el.selectionStart : 0;
    const end = (typeof el.selectionEnd === 'number') ? el.selectionEnd : start;
    const selected = (el.value || '').slice(start, end);
    const pre = (el.value || '').slice(0, start);
    const post = (el.value || '').slice(end);
    el.value = pre + before + selected + after + post;
    el.focus();
    const pos = start + before.length + selected.length;
    try {
      el.selectionStart = el.selectionEnd = pos;
    } catch(_e) {}
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function normalizeWord(input){
    if(input == null) return '';
    return String(input).trim().toLowerCase().replace(/\u00AD/g,'');
  }

  function normalizeSegments(segs){
    return (segs || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
  }

  function segmentsToString(segs){
    return (segs || []).join(' + ');
  }

  function deriveWordFromExpected(expectedSegments){
    return (expectedSegments || []).join('');
  }

  function buildDiff(expected, actual){
    const maxLen = Math.max(expected.length, actual.length);
    for(let i=0;i<maxLen;i++){
      if(expected[i] !== actual[i]){
        const e = expected[i] == null ? '∅' : expected[i];
        const a = actual[i] == null ? '∅' : actual[i];
        return `First mismatch at index ${i}: expected "${e}" got "${a}"`;
      }
    }
    return 'No diff';
  }
  // Rule registry (Source: Logic Version 8, V12 Aligned)

  const STORAGE_KEYS = {
    tests: 'reorite_segmenter_v12_tests_json',
    regressionHistory: 'reorite_segmenter_v12_regression_test_history',
    regressionRunHistory: 'reorite_segmenter_v12_regression_run_history',
    history: 'reorite_segmenter_v12_word_history',
    g2pHistory: 'reorite_segmenter_v12_g2p_word_history',
    g2pPrefs: 'reorite_segmenter_v12_g2p_prefs',
    g2pV4LexiconPrefs: 'reorite_segmenter_v12_g2p_v4_lexicon_prefs',
    g2pV4LexiconHistory: 'reorite_segmenter_v12_g2p_v4_lexicon_history',
    g2pAwsTtsHistory: 'reorite_segmenter_v12_g2p_aws_tts_history',
    g2pAwsTtsPrefs: 'reorite_segmenter_v12_g2p_aws_tts_prefs',
    g2pAwsTtsCreds: 'reorite_segmenter_v12_g2p_aws_tts_creds',
    detectHistory: 'reorite_segmenter_v12_detect_history',
    detectPrefs: 'reorite_segmenter_v12_detect_prefs',
    detectAmbiguous: 'reorite_segmenter_v12_detect_ambiguous_tokens',
    detectParticles: 'reorite_segmenter_v12_detect_particle_tokens',
    detectBlockHistory: 'reorite_segmenter_v12_detect_block_history',
    segmentStatsHistory: 'reorite_segmenter_v12_segment_stats_history',
    segmentStatsBuckets: 'reorite_segmenter_v12_segment_stats_buckets',
    segmentStatsBucketPrefix: 'reorite_segmenter_v12_segment_stats_bucket_',
    segmentStatsActiveBucket: 'reorite_segmenter_v12_segment_stats_active_bucket',
    segmentStatsCollations: 'reorite_segmenter_v12_segment_stats_collations',
    sttPrefs: 'reorite_segmenter_v12_stt_prefs',
    sttHistory: 'reorite_segmenter_v12_stt_history',
    lexiconSource: 'reorite_segmenter_v12_lexicon_source',
    richLexiconSource: 'reorite_segmenter_v12_rich_lexicon_source',
    uiTheme: 'reorite_segmenter_v12_ui_theme'
  };

  function saveToStorage(key, value){
    try{ localStorage.setItem(key, value); return true; }
    catch(_){ return false; }
  }

  function loadFromStorage(key){
    try{ return localStorage.getItem(key) || ''; }
    catch(_){ return ''; }
  }

  function applyTheme(theme){
    const next = (theme === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const toggle = document.getElementById('themeToggle');
    if(toggle){
      toggle.textContent = (next === 'dark') ? 'Light Mode' : 'Dark Mode';
      toggle.setAttribute('aria-label', `Switch to ${(next === 'dark') ? 'light' : 'dark'} mode`);
      toggle.title = `Switch to ${(next === 'dark') ? 'light' : 'dark'} mode`;
    }
    return next;
  }

  function loadThemePreference(){
    const saved = loadFromStorage(STORAGE_KEYS.uiTheme);
    return (saved === 'dark') ? 'dark' : 'light';
  }

  function setThemePreference(theme){
    const next = applyTheme(theme);
    saveToStorage(STORAGE_KEYS.uiTheme, next);
    return next;
  }

  function toggleThemePreference(){
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    return setThemePreference(current === 'dark' ? 'light' : 'dark');
  }

  function loadHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.history);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveHistory(items){
    return saveToStorage(STORAGE_KEYS.history, JSON.stringify(items || [], null, 2));
  }

  function addHistoryEntry(entry){
    const items = loadHistory();

    // De-dupe by word and segments string
    const sig = `${entry.word}::${segmentsToString(entry.segments)}`;
    const filtered = items.filter(x => `${x.word}::${segmentsToString(x.segments)}` !== sig);

    filtered.unshift(entry);
    const capped = filtered.slice(0, 200);
    saveHistory(capped);
  }



  // Regression test edit history
  function loadRegressionHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.regressionHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveRegressionHistory(items){
    return saveToStorage(STORAGE_KEYS.regressionHistory, JSON.stringify(items || [], null, 2));
  }

  function addRegressionHistoryEntry(entry){
    const items = loadRegressionHistory();
    items.unshift(entry);
    saveRegressionHistory(items.slice(0, 400));
  }


  // Regression run history
  function loadRegressionRunHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.regressionRunHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveRegressionRunHistory(items){
    return saveToStorage(STORAGE_KEYS.regressionRunHistory, JSON.stringify(items || [], null, 2));
  }

  function addRegressionRunHistoryEntry(entry){
    const items = loadRegressionRunHistory();
    items.unshift(entry);
    // cap to avoid localStorage bloat
    saveRegressionRunHistory(items.slice(0, 200));
  }

  function simpleHash(str){
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  // Segmenter V12 Logic
  const vowels = 'aeiouāēīōū';
  const diphthongs = [
    'aa','ae','ai','ao','au',
    'ea','ee','ei','eo','eu',
    'ia','ie','ii','io','iu',
    'oa','oe','oi','oo','ou',
    'ua','ue','ui','uo','uu',
    'āa','aā','āā','āe','āē','āi','aī','āī','āo','aō','āō','āu','aū','āū',
    'ēa','eā','ēā','ēe','ēē','ēi','eī','ēī','ēo','eō','ēō','ēu','eū','ēū',
    'īa','iā','īā','īe','īē','īi','iī','īī','īo','iō','īō','īu','iū','īū',
    'ōa','oā','ōā','ōe','ōē','ōi','oī','ōī','ōo','oō','ōō','ōu','oū','ōū',
    'ūa','uā','ūā','ūe','ūē','ūi','uī','ūī','ūo','aō','ūō','ūu','uū','ūū'
  ];


  function setActiveTab(tab){
    state.page = tab;
    document.getElementById('tabRegression').classList.toggle('active', tab === 'regression');
    document.getElementById('tabDemo').classList.toggle('active', tab === 'demo');
    document.getElementById('tabG2P').classList.toggle('active', tab === 'g2p');
    document.getElementById('tabG2PV4Lexicon').classList.toggle('active', tab === 'g2pV4Lexicon');
    document.getElementById('tabPublicDemo').classList.toggle('active', tab === 'publicDemo');
    document.getElementById('tabPublicDemoSimple').classList.toggle('active', tab === 'publicDemoSimple');
    document.getElementById('tabG2PAwsTts').classList.toggle('active', tab === 'g2pAwsTts');
    document.getElementById('tabIpaLookupKeyboard').classList.toggle('active', tab === 'ipaLookupKeyboard');
    document.getElementById('tabSTT').classList.toggle('active', tab === 'stt');
    document.getElementById('tabDetect').classList.toggle('active', tab === 'detect');
    document.getElementById('tabDetectBlock').classList.toggle('active', tab === 'detectBlock');
    document.getElementById('tabSegmentStatsHistory').classList.toggle('active', tab === 'segmentStatsHistory');
    document.getElementById('tabRules').classList.toggle('active', tab === 'rules');

    document.getElementById('pageRegression').classList.toggle('hidden', tab !== 'regression');
    document.getElementById('pageDemo').classList.toggle('hidden', tab !== 'demo');

    document.getElementById('pageG2P').classList.toggle('hidden', tab !== 'g2p');

    document.getElementById('pageG2PV4Lexicon').classList.toggle('hidden', tab !== 'g2pV4Lexicon');
    document.getElementById('pagePublicDemo').classList.toggle('hidden', tab !== 'publicDemo');
    document.getElementById('pagePublicDemoSimple').classList.toggle('hidden', tab !== 'publicDemoSimple');

    document.getElementById('pageG2PAwsTts').classList.toggle('hidden', tab !== 'g2pAwsTts');

    document.getElementById('pageIpaLookupKeyboard').classList.toggle('hidden', tab !== 'ipaLookupKeyboard');
    document.getElementById('pageSTT').classList.toggle('hidden', tab !== 'stt');

    document.getElementById('pageDetect').classList.toggle('hidden', tab !== 'detect');
    document.getElementById('pageDetectBlock').classList.toggle('hidden', tab !== 'detectBlock');
    document.getElementById('pageSegmentStatsHistory').classList.toggle('hidden', tab !== 'segmentStatsHistory');
    document.getElementById('pageRules').classList.toggle('hidden', tab !== 'rules');
  }

