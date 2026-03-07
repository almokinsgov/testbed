// Detection signals, scoring, detect tabs, and detect-for-stats helpers extracted from index.html.

  const DETECTION_SIGNALS = [
    { id:'D01', cat:'Character Set', title:'Allowed Character Inventory', desc:`Māori orthography uses a constrained letter set (with macrons) and common digraphs (ng, wh).\nIf a token contains letters outside the inventory (for example b, d, f, l, s, v, x, y, z) it is less likely to be te reo.` },
    { id:'D02', cat:'Character Set', title:'Macron Presence', desc:`Macrons (ā ē ī ō ū) are a strong signal for te reo Māori spelling.\nIf a token contains a macron, likelihood increases.` },
    { id:'D03', cat:'Phonotactics', title:'Digraph Presence', desc:`The digraphs 'ng' and 'wh' are frequent in te reo Māori.\nIf a token contains ng or wh, likelihood increases.` },
    { id:'D04', cat:'Phonotactics', title:'Ends With Vowel', desc:`Many te reo Māori words end in a vowel.\nIf a token ends in a vowel or macron vowel, likelihood increases. If it ends in a consonant, likelihood decreases.` },
    { id:'D05', cat:'Phonotactics', title:'Vowel Density', desc:`Te reo Māori tends to have a relatively high vowel density.\nThis is a soft signal and is used only as a minor adjustment.` },
    { id:'D06', cat:'Segmenter', title:'Segmenter Produces Clean CV Units', desc:`If the v12 segmenter produces segments that look like valid CV or digraph+vowel units, that increases likelihood.\nIf it produces orphan consonant segments, likelihood decreases.` },
    { id:'D07', cat:'Lexicon', title:'Segment Coverage In IPA Lexicon', desc:`If most produced segments exist as 'Unit' entries in your G2P lexicon, likelihood increases.\nLow coverage suggests the token may not be te reo (or is out-of-lexicon).` },
    { id:'D08', cat:'Tokens', title:'Particle Token (Medium-High)', desc:`Some tokens (for example 'te', 'ki', 'ko', 'ngā') often appear as particles.\nThese can be short and sometimes overlap with English tokens so they are treated as medium-high likelihood, then adjusted by context.` },
    { id:'D09', cat:'Tokens', title:'Ambiguous Token', desc:`Some tokens can plausibly be English or te reo (for example 'to', 'he', 'me').\nThese start lower and are then pulled up or down based on nearby tokens.` },
    { id:'D10', cat:'Context', title:'Neighbor Context Boost', desc:`If an ambiguous or particle token sits next to a high-likelihood te reo token, its score is boosted.\nIf it sits inside a strongly English pattern, its score is reduced.` },
    { id:'D11', cat:'Character Set', title:'Forbidden Letters (Hard Reject)', desc:`If a token contains any of the letters b, c, d, f, j, l, q, s, v, x, y, z then it is not standard te reo Maori orthography.
This is treated as a hard reject signal and the score is capped very low.` },
    { id:'D12', cat:'Lexicon', title:'Zero Lexicon Unit Matches', desc:`If the segmenter output yields zero matching units in the IPA lexicon, the token is unlikely to be te reo.
A very small chance remains for out-of-lexicon items or a rare segmentation mismatch, but the score is strongly penalized and capped.` },
    { id:'D13', cat:'Context', title:'Zero Neighbor Propagation', desc:`If a token is treated as 0% (hard reject), an adjacent short or ambiguous token can also be treated as 0%.
This prevents ambiguous items like "to" from being misclassified as te reo when sitting next to a clear non-Māori word.
This rule is only applied in the Te Reo Detect tab and does not apply in the Text Block tab.` }
,    { id:'D14', cat:'Phonotactics', title:'Final Consonant Penalty', desc:`Standard te reo Maori word forms end in a vowel (including macron vowels).
If a token ends in a consonant, it is strongly unlikely to be te reo and its score is capped low.` }
,    { id:'D15', cat:'Phonotactics', title:'Illegal Consonant Cluster', desc:`Te reo Maori does not generally allow consonant clusters (two consonants in a row) except the digraphs 'ng' and 'wh'.
If a token contains other consonant-consonant sequences (including doubled consonants), it is strongly penalized and capped.` }
,    { id:'D16', cat:'Phonotactics', title:'Digraph Must Be Followed By Vowel', desc:`The digraphs 'ng' and 'wh' act as consonants and should be followed by a vowel in standard te reo Maori spelling.
If 'ng' or 'wh' occurs at the end of a word or is followed by a consonant, it is strongly penalized and capped.` }
,    { id:'D17', cat:'Phonotactics', title:'Invalid g Usage', desc:`In standard te reo Maori orthography, the letter 'g' only appears as part of the digraph 'ng'.
If 'g' appears without immediately following 'n', the token is strongly unlikely to be te reo.` }

  ];

  const DET_SIGNAL_BY_ID = new Map(DETECTION_SIGNALS.map(s => [s.id, s]));

  function drawSignalDetails(id){
    const right = document.getElementById('detectSignalDetails');
    if(!right) return;
    right.innerHTML = '';
    const s = DET_SIGNAL_BY_ID.get(id);
    if(!s){
      right.appendChild(el('h3', {}, ['Signal Details']));
      right.appendChild(el('p', {}, ['Select a signal to view details.']));
      return;
    }
    right.appendChild(el('h3', {}, ['Signal Details']));
    right.appendChild(el('div', {class:'row'}, [
      el('span', {class:'tag'}, [s.id]),
      el('span', {class:'tag'}, [`category: ${s.cat}`]),
      el('span', {class:'tag'}, [s.title])
    ]));
    right.appendChild(el('div', {class:'divider'}));
    right.appendChild(el('h3', {}, ['Explanation']));
    right.appendChild(el('pre', {}, [s.desc]));
  }

  function loadDetectPrefs(){
    const raw = loadFromStorage(STORAGE_KEYS.detectPrefs);
    const parsed = raw ? safeJsonParse(raw) : {ok:false};
        if(parsed.ok && parsed.value && typeof parsed.value === 'object') return parsed.value;
    return { showDebug: false, contextBoost: true };
  }

  function saveDetectPrefs(prefs){
    return saveToStorage(STORAGE_KEYS.detectPrefs, JSON.stringify(prefs || {}, null, 2));
  }

  function defaultAmbiguousTokens(){
    return ['to','he','me','no','a','i','o','e'];
  }

  function defaultParticleTokens(){
    return ['te','ki','ko','nga','ngā','kei','kua','hei','nā','na','mā','ma','mō','mo'];
  }

  function parseTokenList(text){
    const raw = String(text || '').split(/[\n,]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    return uniquePreserveOrder(raw);
  }

  function loadTokenList(key, fallbackFn){
    const raw = loadFromStorage(key);
    if(!raw) return fallbackFn();
    const parsed = safeJsonParse(raw);
    if(parsed.ok && Array.isArray(parsed.value)) return parsed.value.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
    // allow plain text list storage too
    return parseTokenList(raw) || fallbackFn();
  }

  function saveTokenList(key, arr){
    return saveToStorage(key, JSON.stringify(arr || [], null, 2));
  }

  function loadDetectHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.detectHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveDetectHistory(items){
    return saveToStorage(STORAGE_KEYS.detectHistory, JSON.stringify(items || [], null, 2));
  }

  function addDetectHistoryEntry(entry){
    const items = loadDetectHistory();
    const sig = `${entry.input || ''}::${(entry.tokens||[]).map(t=>t.norm||t.raw||'').join('|')}`;
    const filtered = items.filter(x => `${x.input || ''}::${(x.tokens||[]).map(t=>t.norm||t.raw||'').join('|')}` !== sig);
    filtered.unshift(entry);
    saveDetectHistory(filtered.slice(0, 200));
  }


  function loadDetectBlockHistory(){
    const raw = loadFromStorage(STORAGE_KEYS.detectBlockHistory);
    if(!raw) return [];
    const parsed = safeJsonParse(raw);
    if(!parsed.ok || !Array.isArray(parsed.value)) return [];
    return parsed.value;
  }

  function saveDetectBlockHistory(items){
    return saveToStorage(STORAGE_KEYS.detectBlockHistory, JSON.stringify(items || [], null, 2));
  }

  function addDetectBlockHistoryEntry(entry){
    const items = loadDetectBlockHistory();
    const sig = `${(entry.text||'').trim()}::${String(entry.threshold||'')}`;
    const filtered = items.filter(x => `${(x.text||'').trim()}::${String(x.threshold||'')}` !== sig);
    filtered.unshift(entry);
    saveDetectBlockHistory(filtered.slice(0, 120));
  }

function tokenizeText(input){
    const s = String(input || '').trim();
    if(!s) return [];
    // split on whitespace but keep internal apostrophes/macrons
    const rough = s.split(/\s+/).filter(Boolean);
    const tokens = [];
    for(const part of rough){
      // strip leading/trailing punctuation
      const m = part.match(/^(["'“”‘’\(\[\{]*)(.*?)([\.,;:!\?\)\]\}"'“”‘’]*)$/);
      const core = m ? m[2] : part;
      if(core) tokens.push({ raw: core, rawWithPunct: part });
    }
    return tokens;
  }

  const MAORI_ALLOWED = new Set('aeiouāēīōūhkmnprtw');
  const MAORI_VOWELS = new Set('aeiouāēīōū');
  const MAORI_FORBIDDEN = new Set('bcdfjlqsvxyz'.split(''));

  function hasForbiddenLetters(token){
    const letters = (String(token||'').match(/[a-zāēīōū]/g) || []);
    for(const ch of letters){
      if(MAORI_FORBIDDEN.has(ch)) return true;
    }
    return false;
  }


  function hasMacron(token){
    return /[āēīōū]/.test(token);
  }

  function endsWithVowel(token){
    const t = String(token||'');
    if(!t) return false;
    const last = t.slice(-1);
    return MAORI_VOWELS.has(last);
  }

  function isLetterChar(ch){
    return /[a-zāēīōū]/.test(ch);
  }

  function isVowelChar(ch){
    return MAORI_VOWELS.has(ch);
  }

  function illegalConsonantPairs(token){
    const t = String(token || '');
    const out = [];
    for(let i=0;i<t.length-1;i++){
      const a = t[i], b = t[i+1];
      if(!isLetterChar(a) || !isLetterChar(b)) continue;
      if(isVowelChar(a) || isVowelChar(b)) continue;
      const pair = a + b;
      if(pair === 'ng' || pair === 'wh') continue;
      out.push({i, pair});
    }
    return out;
  }

  function invalidDigraphFollowers(token){
    const t = String(token || '');
    const issues = [];
    for(let i=0;i<t.length-1;i++){
      const dig = t.slice(i, i+2);
      if(dig === 'ng' || dig === 'wh'){
        const next = t[i+2] || '';
        if(!next || !isVowelChar(next)){
          issues.push({i, dig, next: next || '(end)'});
        }
      }
    }
    return issues;
  }

  function invalidGUsage(token){
    const t = String(token || '');
    for(let i=0;i<t.length;i++){
      if(t[i] === 'g'){
        if(i === 0 || t[i-1] !== 'n') return true;
      }
    }
    return false;
  }

  function vowelDensity(token){
    const letters = (token.match(/[a-zāēīōū]/g) || []);
    if(!letters.length) return 0;
    let v = 0;
    for(const ch of letters){
      if(MAORI_VOWELS.has(ch)) v++;
    }
    return v / letters.length;
  }

  function outsideInventory(token){
    const letters = (token.match(/[a-zāēīōū]/g) || []);
    for(const ch of letters){
      if(!MAORI_ALLOWED.has(ch) && ch !== 'g'){ // g exists only as part of ng, treat carefully
        return true;
      }
    }
    // allow g only if token contains ng somewhere; otherwise treat as outside
    if(letters.includes('g') && !token.includes('ng')) return true;
    return false;
  }

  function lexiconCoverage(segments){
    const segs = normalizeSegments(segments || []);
    if(!segs.length) return 0;
    let hit = 0;
    for(const s of segs){
      if(getDetectLexiconMatches(s).length) hit++;
    }
    return hit / segs.length;
  }

  function orphanConsonantCount(segments){
    const segs = normalizeSegments(segments || []);
    let c = 0;
    for(const s of segs){
      const hasV = [...s].some(ch => MAORI_VOWELS.has(ch));
      if(!hasV) c++;
    }
    return c;
  }

  function clamp01(x){
    return Math.max(0, Math.min(1, x));
  }

  function scoreTokenBase(tokenNorm, lists){
    const signals = [];
    const debug = [];

    if(!tokenNorm){
      return { base: 0, signals, debug };
    }

    // Start neutral
    let score = 0.50;

    let hardBlock = false;
    if(hasForbiddenLetters(tokenNorm)){
      hardBlock = true;
      score = 0.0;
      signals.push('D11');
      debug.push({id:'D11', delta:'cap<=0.00', note:'contains forbidden letters'});
    }

    const outInv = outsideInventory(tokenNorm);
    if(outInv){
      score -= 0.35;
      signals.push('D01');
      debug.push({id:'D01', delta:-0.35, note:'outside inventory'});
    } else {
      score += 0.18;
      signals.push('D01');
      debug.push({id:'D01', delta:+0.18, note:'within inventory'});
    }

    if(hasMacron(tokenNorm)){
      score += 0.25;
      signals.push('D02');
      debug.push({id:'D02', delta:+0.25});
    }

    if(tokenNorm.includes('ng') || tokenNorm.includes('wh')){
      score += 0.12;
      signals.push('D03');
      debug.push({id:'D03', delta:+0.12});
    }

    if(endsWithVowel(tokenNorm)){
      score += 0.10;
      signals.push('D04');
      debug.push({id:'D04', delta:+0.10});
    } else {
      score -= 0.12;
      signals.push('D04');
      debug.push({id:'D04', delta:-0.12});
    }

    const vd = vowelDensity(tokenNorm);
    if(vd >= 0.45){
      score += 0.06;
      signals.push('D05');
      debug.push({id:'D05', delta:+0.06, note:`density ${vd.toFixed(2)}`});
    } else if(vd < 0.30){
      score -= 0.05;
      signals.push('D05');
      debug.push({id:'D05', delta:-0.05, note:`density ${vd.toFixed(2)}`});
    }


    // Additional phonotactic weed-out
    if(!hardBlock){
      // Stronger penalty for final consonant (cap low)
      if(!endsWithVowel(tokenNorm)){
        score -= 0.25;
        score = Math.min(score, 0.18);
        signals.push('D14');
        debug.push({id:'D14', delta:'cap<=0.18 and -0.25', note:'ends with consonant'});
      }

      const pairs = illegalConsonantPairs(tokenNorm);
      if(pairs.length){
        score -= 0.40;
        score = Math.min(score, 0.10);
        signals.push('D15');
        debug.push({id:'D15', delta:'cap<=0.10 and -0.40', note:`illegal pairs: ${pairs.slice(0,6).map(p=>p.pair+'@'+p.i).join(', ')}${pairs.length>6?' …':''}`});
      }

      const digIssues = invalidDigraphFollowers(tokenNorm);
      if(digIssues.length){
        score -= 0.32;
        score = Math.min(score, 0.12);
        signals.push('D16');
        debug.push({id:'D16', delta:'cap<=0.12 and -0.32', note:`digraph issues: ${digIssues.slice(0,6).map(d=>d.dig+'@'+d.i+'→'+d.next).join(', ')}${digIssues.length>6?' …':''}`});
      }

      if(invalidGUsage(tokenNorm)){
        score -= 0.35;
        score = Math.min(score, 0.12);
        signals.push('D17');
        debug.push({id:'D17', delta:'cap<=0.12 and -0.35', note:'g appears outside ng'});
      }
    }

    // Segmenter and lexicon coverage
    const segOut = segmentWordCore(tokenNorm, { trace: false });
    const segs = segOut.segments || [];
    const segNorm = normalizeSegments(segs);
    let lexHits = 0;
    for(const s of segNorm){
      if(getDetectLexiconMatches(s).length) lexHits++;
    }

    const orphans = orphanConsonantCount(segs);
    if(orphans){
      score -= Math.min(0.18, 0.06 * orphans);
      signals.push('D06');
      debug.push({id:'D06', delta: -Math.min(0.18, 0.06 * orphans), note:`${orphans} orphan consonant segment(s)`});
      // Orphan consonant segments indicate a phonotactic mismatch; cap aggressively
      if(orphans >= 2) score = Math.min(score, 0.18);
      else score = Math.min(score, 0.45);
      debug.push({id:'D06', delta:'cap', note:`orphan cap applied (orphans=${orphans})`});
    } else {
      score += 0.06;
      signals.push('D06');
      debug.push({id:'D06', delta:+0.06});
    }

    const cov = segNorm.length ? (lexHits / segNorm.length) : 0;
    if(cov >= 0.80){
      score += 0.22;
      signals.push('D07');
      debug.push({id:'D07', delta:+0.22, note:`coverage ${(cov*100).toFixed(0)}%`});
    } else if(cov >= 0.60){
      score += 0.14;
      signals.push('D07');
      debug.push({id:'D07', delta:+0.14, note:`coverage ${(cov*100).toFixed(0)}%`});
    } else if(cov >= 0.30){
      score += 0.05;
      signals.push('D07');
      debug.push({id:'D07', delta:+0.05, note:`coverage ${(cov*100).toFixed(0)}%`});
    } else {
      score -= 0.12;
      signals.push('D07');
      debug.push({id:'D07', delta:-0.12, note:`coverage ${(cov*100).toFixed(0)}%`});

    if(segNorm.length && lexHits === 0){
      // Strong negative: no produced segment matches the IPA lexicon
      score -= 0.30;
      score = Math.min(score, 0.20);
      signals.push('D12');
      debug.push({id:'D12', delta:'cap<=0.20 and -0.30', note:'zero lexicon unit matches'});
    }
    }

    // Token lists
    const isParticle = lists.particles.has(tokenNorm);
    const isAmbig = lists.ambiguous.has(tokenNorm);

    if(isParticle){
      // Medium-high base for particles
      score = Math.max(score, 0.70);
      score += 0.02;
      signals.push('D08');
      debug.push({id:'D08', delta:'floor to 0.70', note:'particle token (medium-high)'});
    }

    if(isAmbig){
      // Start lower for ambiguous tokens, but do not block strong Māori evidence
      score = Math.min(score, 0.55);
      score -= 0.06;
      signals.push('D09');
      debug.push({id:'D09', delta:'cap to 0.55 then -0.06', note:'ambiguous token'});
    }

    if(hardBlock){
      score = 0.0;
    }

    score = clamp01(score);

    return {
      base: score,
      signals: uniquePreserveOrder(signals),
      debug,
      segments: segs,
      ruleIds: segOut.ruleIds || [],
      coverage: cov,
      orphans,
      hardBlock
    };
  }

  function applyContextBoost(tokens, lists){
    // tokens: array with {norm, base, score, signals, debug, ...}
    const out = tokens.map(t => ({...t, score: t.base, contextDelta:0, contextNotes: [] }));

    const getS = (i) => (i>=0 && i<out.length) ? out[i].score : null;
    const getN = (i) => (i>=0 && i<out.length) ? out[i].norm : '';

    for(let i=0;i<out.length;i++){
      const t = out[i];
      if(t.hardBlock){
        t.contextDelta = 0;
        t.score = clamp01(t.base);
        continue;
      }
      const prev = getS(i-1);
      const next = getS(i+1);

      const isAmbig = lists.ambiguous.has(t.norm);
      const isParticle = lists.particles.has(t.norm);
      const uncertain = t.base >= 0.35 && t.base <= 0.70;

      let delta = 0;

      // Special English pattern penalty: "welcome to"
      if(t.norm === 'to' && getN(i-1) === 'welcome'){
        delta -= 0.18;
        t.contextNotes.push('English pattern: "welcome to"');
      }

      if(isAmbig || isParticle || uncertain){
        const boostFrom = (neighborScore, label) => {
          if(neighborScore == null) return;
          if(neighborScore >= 0.80){ delta += 0.15; t.contextNotes.push(`${label} high (>=0.80)`); }
          else if(neighborScore >= 0.70){ delta += 0.10; t.contextNotes.push(`${label} strong (>=0.70)`); }
          else if(neighborScore >= 0.60){ delta += 0.06; t.contextNotes.push(`${label} moderate (>=0.60)`); }
          else if(neighborScore <= 0.25){ delta -= 0.06; t.contextNotes.push(`${label} very low (<=0.25)`); }
        };

        boostFrom(prev, 'Prev');
        boostFrom(next, 'Next');

        if(prev != null && next != null && prev >= 0.70 && next >= 0.70){
          delta += 0.05;
          t.contextNotes.push('Both sides strong');
        }

        // Special ambiguous rule for "to": if next is very Māori-like, boost more.
        if(t.norm === 'to'){
          if(next != null && next >= 0.75){ delta += 0.08; t.contextNotes.push('Special boost: "to" before high-likelihood token'); }
          if(prev != null && prev <= 0.25){ delta -= 0.05; t.contextNotes.push('Special penalty: "to" after low token'); }
        }

        // Particle reinforcement: te next to a high token becomes more confident
        if(t.norm === 'te'){
          if(next != null && next >= 0.75){ delta += 0.08; t.contextNotes.push('Particle reinforcement: te + high token'); }
          if(prev != null && prev >= 0.75){ delta += 0.06; t.contextNotes.push('Particle reinforcement: high token + te'); }
        }

        // Clamp delta magnitude
        delta = Math.max(-0.22, Math.min(0.25, delta));

        if(delta != 0){
          t.signals = uniquePreserveOrder([...(t.signals||[]), 'D10']);
        }
      }

      t.contextDelta = delta;
      t.score = clamp01(t.base + delta);
    }

    return out;
  }


  function applyZeroNeighborPropagation(tokens, lists){
    // Applies only in the Te Reo Detect tab.
    // If a token is a hard reject (0%), adjacent ambiguous or very short tokens are also treated as 0%.
    const out = tokens.map(t => ({...t, signals: (t.signals||[]).slice(), contextNotes: (t.contextNotes||[]).slice() }));
    const isZero = (t) => (t && (t.hardBlock || t.score === 0));

    for(let i=0;i<out.length;i++){
      if(!isZero(out[i])) continue;
      for(const j of [i-1, i+1]){
        if(j < 0 || j >= out.length) continue;
        const n = out[j];
        if(!n || n.hardBlock) continue;
        const norm = String(n.norm||'');
        const isAmbig = lists.ambiguous.has(norm);
        const isShort = norm.length <= 2;
        if(isAmbig || isShort){
          n.score = 0.0;
          n.contextDelta = -Math.max(0, n.base || 0);
          n.contextNotes.push('Zero neighbor propagation');
          n.signals = uniquePreserveOrder([...(n.signals||[]), 'D13']);
        }
      }
    }

    return out;
  }

  function scoreToLabel(score){
    if(score >= 0.75) return {label:'Likely Te Reo', cls:'good'};
    if(score >= 0.55) return {label:'Mixed or Ambiguous', cls:'warn'};
    return {label:'Unlikely Te Reo', cls:'bad'};
  }

  function renderSignalPills(signalIds, onClick){
    const ids = uniquePreserveOrder(signalIds || []);
    const wrap = el('div', {class:'row'});
    if(!ids.length){
      wrap.appendChild(el('span', {class:'tag warn'}, ['no signals']));
      return wrap;
    }
    for(const id of ids){
      const s = DET_SIGNAL_BY_ID.get(id);
      const b = el('button', {type:'button', class:'tag', title: s ? s.title : id, onclick: ()=> onClick(id)}, [id]);
      wrap.appendChild(b);
    }
    return wrap;
  }

  


  function renderDetect(){
    const root = document.getElementById('pageDetect');
    root.innerHTML = '';

    const prefs = loadDetectPrefs();

    // Lists
    const ambiguous = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens);
    const particles = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens);

    const lists = {
      ambiguousArr: ambiguous,
      particlesArr: particles,
      ambiguous: new Set(ambiguous),
      particles: new Set(particles)
    };

    // Header
    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['Te Reo Detect']));
    card.appendChild(el('p', {}, ['Estimate whether tokens are likely te reo Māori using v12 segmentation, phonotactic signals and G2P lexicon coverage. Ambiguous tokens are adjusted by nearby context.']));

    const input = el('input', {type:'text', placeholder:'e.g. welcome to tepu | to tepu | te patukurea', value:''});
    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze']);

    const debugCheck = el('label', {class:'checkbox'});
    const debugInput = el('input', {type:'checkbox'});
    debugInput.checked = !!prefs.showDebug;
    debugCheck.appendChild(debugInput);
    debugCheck.appendChild(document.createTextNode('Show Debug'));

    debugInput.addEventListener('change', ()=>{
      prefs.showDebug = !!debugInput.checked;
      saveDetectPrefs(prefs);
      // rerender output only if exists
      runBtn.click();
    });

    const controlRow = el('div', {class:'row'});
    controlRow.appendChild(el('div', {style:'flex:1; min-width:260px;'}, [input]));
    const btnWrap = el('div', {style:'display:flex; gap:8px; flex-wrap:wrap;'});
    btnWrap.appendChild(runBtn);
    btnWrap.appendChild(debugCheck);
    controlRow.appendChild(btnWrap);
    card.appendChild(controlRow);

    const outWrap = el('div', {class:'stack', id:'detectOut', style:'margin-top:12px;'});
    card.appendChild(outWrap);

    root.appendChild(card);

    // Token list editors
    const listsCard = el('div', {class:'card'});
    listsCard.appendChild(el('h3', {}, ['Token Lists (Editable)']));
    listsCard.appendChild(el('p', {}, ['Edit the ambiguous and particle tokens without touching code. Use commas or new lines. These lists are saved to localStorage.']));

    const edWrap = el('div', {class:'listEditor'});
    const ambArea = el('textarea', {spellcheck:'false'});
    ambArea.value = ambiguous.join(', ');
    const partArea = el('textarea', {spellcheck:'false'});
    partArea.value = particles.join(', ');

    const ambBox = el('div', {class:'card', style:'padding:12px; margin:0;'});
    ambBox.appendChild(el('h3', {}, ['Ambiguous Tokens']));
    ambBox.appendChild(el('p', {class:'muted'}, ['Example: to, he, me']));
    ambBox.appendChild(ambArea);

    const partBox = el('div', {class:'card', style:'padding:12px; margin:0;'});
    partBox.appendChild(el('h3', {}, ['Particle Tokens']));
    partBox.appendChild(el('p', {class:'muted'}, ['Particles start medium-high (te is medium-high) then context adjusts.']));
    partBox.appendChild(partArea);

    edWrap.appendChild(ambBox);
    edWrap.appendChild(partBox);

    const listBtnRow = el('div', {class:'row', style:'margin-top:10px;'});
    const btnApply = el('button', {class:'btn primary', type:'button'}, ['Apply Lists']);
    const btnReset = el('button', {class:'btn', type:'button'}, ['Reset Defaults']);

    btnApply.addEventListener('click', ()=>{
      const amb = parseTokenList(ambArea.value);
      const par = parseTokenList(partArea.value);
      saveTokenList(STORAGE_KEYS.detectAmbiguous, amb);
      saveTokenList(STORAGE_KEYS.detectParticles, par);
      // re-render detect to load new sets
      renderDetect();
      setActiveTab('detect');
    });

    btnReset.addEventListener('click', ()=>{
      saveTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens());
      saveTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens());
      renderDetect();
      setActiveTab('detect');
    });

    listBtnRow.appendChild(btnApply);
    listBtnRow.appendChild(btnReset);
    listsCard.appendChild(edWrap);
    listsCard.appendChild(listBtnRow);

    root.appendChild(listsCard);

    // Signals browser
    const sigCard = el('div', {class:'card'});
    sigCard.appendChild(el('h3', {}, ['Detect Signals']));
    sigCard.appendChild(el('p', {}, ['Click a signal pill to view its explanation. Tokens in the analysis include signal pills that explain why the score moved.']));

    const layout = el('div', {class:'signalLayout'});
    const left = el('div', {class:'card', style:'padding:12px; margin:0;'});
    const right = el('div', {class:'card', style:'padding:12px; margin:0;', id:'detectSignalDetails'});

    const pillGrid = el('div', {class:'pillGrid'});
    for(const s of DETECTION_SIGNALS){
      pillGrid.appendChild(el('button', {type:'button', class:'tag', title:s.title, onclick:()=>{ drawSignalDetails(s.id); }}, [s.id]));
    }
    left.appendChild(pillGrid);

    function drawSignalDetails(id){
      right.innerHTML = '';
      const s = DET_SIGNAL_BY_ID.get(id);
      if(!s){
        right.appendChild(el('h3', {}, ['Signal Details']));
        right.appendChild(el('p', {}, ['Select a signal to view details.']));
        return;
      }
      right.appendChild(el('h3', {}, ['Signal Details']));
      right.appendChild(el('div', {class:'row'}, [
        el('span', {class:'tag'}, [s.id]),
        el('span', {class:'tag'}, [`category: ${s.cat}`]),
        el('span', {class:'tag'}, [s.title])
      ]));
      right.appendChild(el('div', {class:'divider'}));
      right.appendChild(el('h3', {}, ['Explanation']));
      right.appendChild(el('pre', {}, [s.desc]));
    }

    drawSignalDetails('D01');

    layout.appendChild(left);
    layout.appendChild(right);
    sigCard.appendChild(layout);
    root.appendChild(sigCard);

    // History
    const histCard = el('div', {class:'card'});
    histCard.appendChild(el('h3', {}, ['Detect History']));

    const btnRow = el('div', {class:'row'});
    btnRow.appendChild(el('button', {class:'btn', type:'button', onclick:()=>{ saveDetectHistory([]); drawHistory(); }}, ['Clear History']));
    btnRow.appendChild(el('button', {class:'btn', type:'button', onclick:()=>{ downloadText('segmenter_v12_detect_history.json', JSON.stringify(loadDetectHistory(), null, 2), 'application/json'); }}, ['Export History']));

    const btnImport = el('button', {class:'btn', type:'button'}, ['Import History']);
    btnImport.addEventListener('click', async ()=>{
      const txt = prompt('Paste Detect History JSON');
      if(!txt) return;
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !Array.isArray(parsed.value)){
        alert('Invalid JSON');
        return;
      }
      saveDetectHistory(parsed.value);
      drawHistory();
    });

    btnRow.appendChild(btnImport);
    histCard.appendChild(btnRow);

    const histWrap = el('div', {id:'detectHistoryWrap'});
    histCard.appendChild(histWrap);
    root.appendChild(histCard);

    function drawHistory(){
      histWrap.innerHTML = '';
      const items = loadDetectHistory();
      if(!items.length){
        histWrap.appendChild(el('p', {class:'muted'}, ['No history yet. Run an analysis to save entries here.']));
        return;
      }

      for(const item of items){
        const c = el('div', {class:'card', style:'margin:10px 0; padding:12px;'});
        c.appendChild(el('div', {class:'row'}, [
          el('span', {class:'tag'}, [new Date(item.createdAt || Date.now()).toLocaleString()]),
          el('span', {class:'tag'}, [`tokens: ${(item.tokens||[]).length}`]),
          el('span', {class:'tag'}, [`sentence: ${(item.sentenceScore*100).toFixed(0)}%`])
        ]));
        c.appendChild(el('h3', {}, [item.input || '']));

        const table = el('table', {class:'tokenTable'});
        table.appendChild(el('thead', {}, [
          el('tr', {}, [
            el('th', {}, ['Token']),
            el('th', {}, ['Score']),
            el('th', {}, ['Segments']),
            el('th', {}, ['Signals'])
          ])
        ]));
        const tb = el('tbody');
        for(const t of (item.tokens||[])){
          const lab = scoreToLabel(t.score);
          const scoreP = el('span', {class:'scorePill'}, [
            el('span', {class:`scoreDot ${lab.cls}`}),
            `${(t.score*100).toFixed(0)}%`,
            `(${lab.label})`
          ]);

          const segText = (t.segments||[]).length ? segmentsToString(t.segments) : '';
          const segCell = el('div', {}, [segText || '']);

          const sigCell = el('div');
          sigCell.appendChild(renderSignalPills(t.signals || [], (id)=>{ drawSignalDetails(id); setActiveTab('detect'); }));

          const tr = el('tr');
          tr.appendChild(el('td', {}, [t.raw || t.norm || '']));
          tr.appendChild(el('td', {}, [scoreP]));
          tr.appendChild(el('td', {}, [segCell]));
          tr.appendChild(el('td', {}, [sigCell]));
          tb.appendChild(tr);
        }
        table.appendChild(tb);
        c.appendChild(table);
        histWrap.appendChild(c);
      }
    }

    drawHistory();

    function renderAnalysis(){
      outWrap.innerHTML = '';

      const text = input.value;
      const tokensRaw = tokenizeText(text);
      if(!tokensRaw.length){
        outWrap.appendChild(el('p', {class:'muted'}, ['Enter text to analyze.']));
        return;
      }

      const baseTokens = [];
      for(const tk of tokensRaw){
        const norm = normalizeWord(tk.raw);
        const base = scoreTokenBase(norm, lists);
        baseTokens.push({ raw: tk.raw, norm, base: base.base, signals: base.signals, debug: base.debug, segments: base.segments, ruleIds: base.ruleIds, coverage: base.coverage, orphans: base.orphans });
      }

      const scored0 = applyContextBoost(baseTokens, lists);
      const isMultiPartMaori = tokensRaw.length > 1 && scored0.every(t => !t.hardBlock);
      const scored = (!isMultiPartMaori) ? applyZeroNeighborPropagation(scored0, lists) : scored0;

      // Sentence score (length weighted)
      let sum = 0.0; let wsum = 0.0;
      for(const t of scored){
        const w = Math.max(1, (t.norm||'').length);
        sum += t.score * w;
        wsum += w;
      }
      const sentenceScore = wsum ? (sum / wsum) : 0;

      const sentLab = scoreToLabel(sentenceScore);
      const headerRow = el('div', {class:'row'});
      headerRow.appendChild(el('span', {class:`tag ${sentLab.cls}`}, [`Sentence Likelihood: ${(sentenceScore*100).toFixed(0)}%` ]));
      headerRow.appendChild(el('span', {class:'tag'}, [`tokens: ${scored.length}`]));
      outWrap.appendChild(headerRow);

      const table = el('table', {class:'tokenTable'});
      table.appendChild(el('thead', {}, [
        el('tr', {}, [
          el('th', {}, ['Token']),
          el('th', {}, ['Score']),
          el('th', {}, ['Segments And Coverage']),
          el('th', {}, ['Signals And Rules'])
        ])
      ]));
      const tbody = el('tbody');

      for(const t of scored){
        const lab = scoreToLabel(t.score);
        const scoreP = el('span', {class:'scorePill'}, [
          el('span', {class:`scoreDot ${lab.cls}`}),
          `${(t.score*100).toFixed(0)}%`,
          `(${lab.label})`
        ]);

        const segs = t.segments || [];
        const cov = typeof t.coverage === 'number' ? t.coverage : 0;
        const segCell = el('div');
        segCell.appendChild(el('div', {}, [segs.length ? segmentsToString(segs) : '']));
        segCell.appendChild(el('div', {class:'row', style:'margin-top:6px;'}, [
          el('span', {class:'tag'}, [`coverage: ${(cov*100).toFixed(0)}%`]),
          el('span', {class:'tag'}, [`orphans: ${t.orphans||0}`])
        ]));

        const sigCell = el('div');
        sigCell.appendChild(renderSignalPills(t.signals || [], (id)=>{ drawSignalDetails(id); }));
        sigCell.appendChild(el('div', {class:'divider'}));
        sigCell.appendChild(el('div', {class:'muted'}, ['Segmenter rules used:']));
        sigCell.appendChild(renderRulePills(t.ruleIds || [], {max: 10}));

        if(prefs.showDebug){
          const details = el('details', {class:'tokenDetails'});
          details.appendChild(el('summary', {}, ['Debug breakdown']));
          details.appendChild(el('pre', {}, [JSON.stringify({ base: t.base, contextDelta: t.contextDelta, contextNotes: t.contextNotes, debug: t.debug }, null, 2)]));
          sigCell.appendChild(details);
        }

        const tr = el('tr');
        tr.appendChild(el('td', {}, [t.raw]));
        tr.appendChild(el('td', {}, [scoreP]));
        tr.appendChild(el('td', {}, [segCell]));
        tr.appendChild(el('td', {}, [sigCell]));
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      outWrap.appendChild(table);

      const btnSave = el('button', {class:'btn', type:'button'}, ['Save To Detect History']);
      btnSave.addEventListener('click', ()=>{
        addDetectHistoryEntry({
          createdAt: new Date().toISOString(),
          input: text,
          sentenceScore,
          tokens: scored.map(t => ({ raw: t.raw, norm: t.norm, score: t.score, base: t.base, contextDelta: t.contextDelta, contextNotes: t.contextNotes, segments: t.segments, coverage: t.coverage, orphans: t.orphans, signals: t.signals, ruleIds: t.ruleIds }))
        });
        drawHistory();
      });

      outWrap.appendChild(el('div', {class:'row', style:'margin-top:10px;'}, [btnSave]));
    }

    runBtn.addEventListener('click', renderAnalysis);

    // Seed examples
    input.value = 'to tepu';
    renderAnalysis();
  }
  

  function tokenizeTextBlockParts(input){
    const s = String(input || '');
    if(!s) return [];
    const reWord = /([A-Za-zĀĒĪŌŪāēīōū]+(?:['’][A-Za-zĀĒĪŌŪāēīōū]+)*)/g;
    const parts = [];
    let last = 0;
    for(;;){
      const m = reWord.exec(s);
      if(!m) break;
      const i = m.index;
      if(i > last) parts.push({ type:'sep', text: s.slice(last, i) });
      parts.push({ type:'word', raw: m[1] });
      last = reWord.lastIndex;
    }
    if(last < s.length) parts.push({ type:'sep', text: s.slice(last) });
    return parts;
  }

  function isHardBoundary(sepText){
    if(!sepText) return false;
    return /[\n\r]|[.!?]/.test(sepText);
  }

  // Override mojibake-prone tokenizer with Unicode-escape based matching.
  // This function is intentionally redeclared after older copies so this one wins.
  function tokenizeTextBlockParts(input){
    const s = String(input || '').normalize('NFC');
    if(!s) return [];
    const reWord = /([A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B]+(?:['\u2019][A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B]+)*)/g;
    const parts = [];
    let last = 0;
    for(;;){
      const m = reWord.exec(s);
      if(!m) break;
      const i = m.index;
      if(i > last) parts.push({ type:'sep', text: s.slice(last, i) });
      parts.push({ type:'word', raw: m[1] });
      last = reWord.lastIndex;
    }
    if(last < s.length) parts.push({ type:'sep', text: s.slice(last) });
    return parts;
  }

  function applyContextBoostBounded(tokens, lists, boundaryAfter){
    const out = tokens.map(t => ({...t, score: t.base, contextDelta:0, contextNotes: [] }));

    const prevScore = (i) => {
      if(i-1 < 0) return null;
      if(boundaryAfter && boundaryAfter[i-1]) return null;
      return out[i-1].score;
    };
    const nextScore = (i) => {
      if(i+1 >= out.length) return null;
      if(boundaryAfter && boundaryAfter[i]) return null;
      return out[i+1].score;
    };
    const prevNorm = (i) => {
      if(i-1 < 0) return '';
      if(boundaryAfter && boundaryAfter[i-1]) return '';
      return out[i-1].norm || '';
    };

    for(let i=0;i<out.length;i++){
      const t = out[i];
      if(t.hardBlock){
        t.contextDelta = 0;
        t.score = clamp01(t.base);
        continue;
      }

      const prev = prevScore(i);
      const next = nextScore(i);
      const prevN = prevNorm(i);

      const isAmbig = lists.ambiguous.has(t.norm);
      const isParticle = lists.particles.has(t.norm);
      const uncertain = t.base >= 0.35 && t.base <= 0.70;

      let delta = 0;

      if(t.norm === 'to' && prevN === 'welcome'){
        delta -= 0.18;
        t.contextNotes.push('English pattern: "welcome to"');
      }

      if(isAmbig || isParticle || uncertain){
        const boostFrom = (neighborScore, label) => {
          if(neighborScore == null) return;
          if(neighborScore >= 0.80){ delta += 0.15; t.contextNotes.push(label + ' high (>=0.80)'); }
          else if(neighborScore >= 0.70){ delta += 0.10; t.contextNotes.push(label + ' strong (>=0.70)'); }
          else if(neighborScore >= 0.60){ delta += 0.06; t.contextNotes.push(label + ' moderate (>=0.60)'); }
          else if(neighborScore <= 0.25){ delta -= 0.06; t.contextNotes.push(label + ' very low (<=0.25)'); }
        };

        boostFrom(prev, 'Prev');
        boostFrom(next, 'Next');

        if(prev != null && next != null && prev >= 0.70 && next >= 0.70){
          delta += 0.05;
          t.contextNotes.push('Both sides strong');
        }

        if(t.norm === 'to'){
          if(next != null && next >= 0.75){ delta += 0.08; t.contextNotes.push('Special boost: "to" before high-likelihood token'); }
          if(prev != null && prev <= 0.25){ delta -= 0.05; t.contextNotes.push('Special penalty: "to" after low token'); }
        }

        if(t.norm === 'te'){
          if(next != null && next >= 0.75){ delta += 0.08; t.contextNotes.push('Particle reinforcement: te + high token'); }
          if(prev != null && prev >= 0.75){ delta += 0.06; t.contextNotes.push('Particle reinforcement: high token + te'); }
        }

        delta = Math.max(-0.22, Math.min(0.25, delta));

        if(delta != 0){
          t.signals = uniquePreserveOrder([...(t.signals||[]), 'D10']);
        }
      }

      t.contextDelta = delta;
      t.score = clamp01(t.base + delta);
    }

    return out;
  }

  function loadContentDetectPrefs(){
    const raw = loadFromStorage(STORAGE_KEYS.contentDetectPrefs);
    const parsed = raw ? safeJsonParse(raw) : {ok:false};
    if(parsed.ok && parsed.value && typeof parsed.value === 'object'){
      const p = parsed.value;
      const mode = (p.mode === 'block') ? 'block' : 'word';
      const threshold = Math.max(0.50, Math.min(0.90, Number.isFinite(Number(p.threshold)) ? Number(p.threshold) : 0.75));
      const showPopupSsml = !!p.showPopupSsml;
      const joinMode = (p.joinMode === 'dot' || p.joinMode === 'none') ? p.joinMode : 'space';
      return { mode, threshold, showPopupSsml, joinMode };
    }
    return { mode:'word', threshold:0.75, showPopupSsml:false, joinMode:'space' };
  }

  function saveContentDetectPrefs(prefs){
    return saveToStorage(STORAGE_KEYS.contentDetectPrefs, JSON.stringify(prefs || {}, null, 2));
  }

  function renderContentTeReoDetect(){
    const root = document.getElementById('pageContentTeReoDetect');
    root.innerHTML = '';

    const prefs = loadContentDetectPrefs();
    const awsPrefs = loadG2pAwsTtsPrefs();
    const awsCreds = loadG2pAwsTtsCreds();
    const defaultEditableText = [
      'Welcome to Aotearoa. Haere mai ki te marae i t\u0113nei r\u0101.',
      '',
      'Ko te reo M\u0101ori te taonga tuku iho o ng\u0101 t\u016bpuna.'
    ].join('\n');
    const editableText = loadFromStorage(STORAGE_KEYS.contentDetectText) || defaultEditableText;
    const exampleText = [
      'Mixed content: Welcome everyone. Haere mai ki te whare kai i t\u0113nei r\u0101.',
      '',
      'Full te reo block: Ko te reo M\u0101ori te mauri o te iwi me te whenua.'
    ].join('\n');

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['Content Te Reo Detect']));
    card.appendChild(el('p', {}, ['Detect and highlight te reo words or te reo blocks across content. Use mode options to switch between word-level highlighting and block-level highlighting for both the example content and editable text.']));

    const advanced = el('details', {});
    advanced.appendChild(el('summary', {}, ['Advanced Options']));
    const advancedWrap = el('div', {style:'margin-top:10px;'});

    const ttsCard = el('div', {class:'card', style:'margin:0;'});
    ttsCard.appendChild(el('h3', {}, ['AWS TTS Controls']));
    ttsCard.appendChild(el('p', {class:'muted'}, ['Controls aligned to Public Demo Simple output behavior.']));
    const ttsInputModeSelect = el('select', {'aria-label':'content detect input mode'});
    ttsInputModeSelect.appendChild(el('option', {value:'text'}, ['Input: Text Block']));
    ttsInputModeSelect.appendChild(el('option', {value:'list'}, ['Input: Word List']));
    ttsInputModeSelect.appendChild(el('option', {value:'single'}, ['Input: Single Word']));
    ttsInputModeSelect.value = awsPrefs.inputMode || 'text';
    const ttsOutputModeSelect = el('select', {'aria-label':'content detect output mode'});
    ttsOutputModeSelect.appendChild(el('option', {value:'phoneme'}, ['Output: Phoneme (Wrap All)']));
    ttsOutputModeSelect.appendChild(el('option', {value:'plain'}, ['Output: Plain Speak (No Phoneme)']));
    ttsOutputModeSelect.appendChild(el('option', {value:'mixedAuto'}, ['Output: Mixed (Auto Detect Te Reo)']));
    ttsOutputModeSelect.appendChild(el('option', {value:'mixed'}, ['Output: Mixed (Select Words)']));
    ttsOutputModeSelect.value = awsPrefs.outputMode || 'phoneme';
    function makeTtsCheck(label, checked){
      const wrap = el('label', {class:'checkbox'});
      const input = el('input', {type:'checkbox'});
      input.checked = !!checked;
      wrap.appendChild(input);
      wrap.appendChild(document.createTextNode(label));
      return {wrap, input};
    }
    const ttsWrapSpeak = makeTtsCheck('Wrap In <speak>', awsPrefs.wrapSpeak !== false);
    const ttsEmptyBody = makeTtsCheck('Empty Phoneme Body', !!awsPrefs.emptyPhonemeBody);
    const ttsPreservePunctuation = makeTtsCheck('Preserve Punctuation', awsPrefs.preservePunctuation !== false);
    const ttsSplitHyphen = makeTtsCheck('Split Hyphen Parts', awsPrefs.splitHyphen !== false);
    const ttsTrimNonFinalH = makeTtsCheck('Trim Non Final IPA h', !!awsPrefs.trimNonFinalH);
    const ttsRemoveLowerArt = makeTtsCheck('Remove Lower Articulation', !!awsPrefs.removeLowerArticulation);
    const ttsStrictMissing = makeTtsCheck('Strict Missing', !!awsPrefs.strictMissing);
    const ttsRowA = el('div', {class:'row'});
    ttsRowA.appendChild(ttsInputModeSelect);
    ttsRowA.appendChild(ttsOutputModeSelect);
    const ttsRowB = el('div', {class:'row', style:'margin-top:8px;'});
    ttsRowB.appendChild(ttsWrapSpeak.wrap);
    ttsRowB.appendChild(ttsEmptyBody.wrap);
    ttsRowB.appendChild(ttsPreservePunctuation.wrap);
    ttsRowB.appendChild(ttsSplitHyphen.wrap);
    const ttsRowC = el('div', {class:'row', style:'margin-top:8px;'});
    ttsRowC.appendChild(ttsTrimNonFinalH.wrap);
    ttsRowC.appendChild(ttsRemoveLowerArt.wrap);
    ttsRowC.appendChild(ttsStrictMissing.wrap);
    ttsCard.appendChild(ttsRowA);
    ttsCard.appendChild(ttsRowB);
    ttsCard.appendChild(ttsRowC);

    const awsCard = el('div', {class:'card', style:'margin:12px 0 0 0;'});
    awsCard.appendChild(el('h3', {}, ['AWS Polly Playback']));
    awsCard.appendChild(el('p', {class:'muted'}, ['Used by popup Play button for highlighted words.']));
    const serviceRegionInput = el('input', {type:'text', value: awsPrefs.serviceRegion || 'australiaeast', 'aria-label':'service region'});
    const awsRegionInput = el('input', {type:'text', value: awsPrefs.awsRegion || 'ap-southeast-2', 'aria-label':'aws region'});
    const voiceIdInput = el('input', {type:'text', value: awsPrefs.voiceId || 'Aria', 'aria-label':'voice id'});
    const engineSelect = el('select', {'aria-label':'engine'});
    engineSelect.appendChild(el('option', {value:'neural'}, ['neural']));
    engineSelect.appendChild(el('option', {value:'standard'}, ['standard']));
    engineSelect.value = (awsPrefs.engine || 'neural');
    const languageCodeInput = el('input', {type:'text', value: awsPrefs.languageCode || 'en-NZ', 'aria-label':'language code'});
    const outputFormatSelect = el('select', {'aria-label':'output format'});
    outputFormatSelect.appendChild(el('option', {value:'mp3'}, ['mp3']));
    outputFormatSelect.appendChild(el('option', {value:'ogg_vorbis'}, ['ogg_vorbis']));
    outputFormatSelect.appendChild(el('option', {value:'pcm'}, ['pcm']));
    outputFormatSelect.value = awsPrefs.outputFormat || 'mp3';
    const accessKeyInput = el('input', {type:'text', value: awsCreds.accessKeyId || '', 'aria-label':'AWS access key id'});
    const secretKeyInput = el('input', {type:'password', value: awsCreds.secretAccessKey || '', 'aria-label':'AWS secret access key'});
    const sessionTokenInput = el('input', {type:'password', value: awsCreds.sessionToken || '', 'aria-label':'AWS session token'});
    const rememberCredsCheck = el('label', {class:'checkbox'});
    const rememberCredsInput = el('input', {type:'checkbox'});
    rememberCredsInput.checked = !!awsCreds.remember;
    rememberCredsCheck.appendChild(rememberCredsInput);
    rememberCredsCheck.appendChild(document.createTextNode('Remember Credentials (Local Storage)'));
    const saveAwsBtn = el('button', {class:'btn', type:'button'}, ['Save AWS Config']);

    const rowAwsA = el('div', {class:'row'});
    rowAwsA.appendChild(el('span', {class:'tag'}, ['service_region']));
    rowAwsA.appendChild(serviceRegionInput);
    rowAwsA.appendChild(el('span', {class:'tag'}, ['aws_region']));
    rowAwsA.appendChild(awsRegionInput);
    const rowAwsB = el('div', {class:'row', style:'margin-top:8px;'});
    rowAwsB.appendChild(el('span', {class:'tag'}, ['VoiceId']));
    rowAwsB.appendChild(voiceIdInput);
    rowAwsB.appendChild(el('span', {class:'tag'}, ['Engine']));
    rowAwsB.appendChild(engineSelect);
    rowAwsB.appendChild(el('span', {class:'tag'}, ['LanguageCode']));
    rowAwsB.appendChild(languageCodeInput);
    rowAwsB.appendChild(el('span', {class:'tag'}, ['OutputFormat']));
    rowAwsB.appendChild(outputFormatSelect);
    const rowAwsC = el('div', {class:'row', style:'margin-top:8px;'});
    rowAwsC.appendChild(accessKeyInput);
    rowAwsC.appendChild(secretKeyInput);
    rowAwsC.appendChild(sessionTokenInput);
    const rowAwsD = el('div', {class:'row', style:'margin-top:8px;'});
    rowAwsD.appendChild(rememberCredsCheck);
    rowAwsD.appendChild(saveAwsBtn);
    awsCard.appendChild(rowAwsA);
    awsCard.appendChild(rowAwsB);
    awsCard.appendChild(rowAwsC);
    awsCard.appendChild(rowAwsD);

    const compactCard = el('div', {class:'card', style:'margin:12px 0 0 0;'});
    compactCard.appendChild(el('h3', {}, ['SSML Compact Post Processing']));
    compactCard.appendChild(el('p', {class:'muted'}, ['Applied to popup playback SSML when enabled.']));
    function makeCompactCheck(label, checked){
      const wrap = el('label', {class:'checkbox'});
      const input = el('input', {type:'checkbox'});
      input.checked = !!checked;
      wrap.appendChild(input);
      wrap.appendChild(document.createTextNode(label));
      return {wrap, input};
    }
    const ccEnable = makeCompactCheck('Enable SSML Compact Mode', !!awsPrefs.ssmlCompactEnabled);
    const ccIpaOnly = makeCompactCheck('Output IPA Only (No SSML)', !!awsPrefs.ssmlCompactIpaOnly);
    const ccSentence = makeCompactCheck('Split At Sentence Punctuation', awsPrefs.ssmlCompactSplitSentence !== false);
    const ccNewline = makeCompactCheck('Split At Newlines', awsPrefs.ssmlCompactSplitNewline !== false);
    const ccSpace = makeCompactCheck('Split At Spaces', !!awsPrefs.ssmlCompactSplitSpace);
    const ccEnsure = makeCompactCheck('Add Space Between Adjacent IPA Chunks', awsPrefs.ssmlCompactEnsureSpace !== false);
    const ccTeReoOnly = makeCompactCheck('Apply Compact To Te Reo Blocks Only', !!awsPrefs.ssmlCompactTeReoBlocksOnly);
    const ccEmpty = makeCompactCheck('Use Empty Phoneme Body In Compact Output', awsPrefs.ssmlCompactEmptyBody !== false);
    const rowCompactA = el('div', {class:'row'}); rowCompactA.appendChild(ccEnable.wrap); rowCompactA.appendChild(ccIpaOnly.wrap);
    const rowCompactB = el('div', {class:'row', style:'margin-top:8px;'}); rowCompactB.appendChild(ccSentence.wrap); rowCompactB.appendChild(ccNewline.wrap); rowCompactB.appendChild(ccSpace.wrap);
    const rowCompactC = el('div', {class:'row', style:'margin-top:8px;'}); rowCompactC.appendChild(ccEnsure.wrap); rowCompactC.appendChild(ccTeReoOnly.wrap); rowCompactC.appendChild(ccEmpty.wrap);
    compactCard.appendChild(rowCompactA);
    compactCard.appendChild(rowCompactB);
    compactCard.appendChild(rowCompactC);

    advancedWrap.appendChild(ttsCard);
    advancedWrap.appendChild(awsCard);
    advancedWrap.appendChild(compactCard);
    advanced.appendChild(advancedWrap);
    card.appendChild(advanced);

    const modeLabel = el('span', {class:'tag'}, ['Mode']);
    const modeSelect = el('select', {'aria-label':'Content detect mode'});
    modeSelect.appendChild(el('option', {value:'word'}, ['Detect Te Reo Words']));
    modeSelect.appendChild(el('option', {value:'block'}, ['Detect Te Reo Blocks']));
    modeSelect.value = prefs.mode;

    const thrLabel = el('span', {class:'tag'}, ['Threshold: ' + Math.round(prefs.threshold * 100) + '%']);
    const thr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:String(prefs.threshold), 'aria-label':'Content detect threshold', style:'width:220px;'});
    thr.addEventListener('input', ()=>{ thrLabel.textContent = 'Threshold: ' + Math.round(parseFloat(thr.value || '0.75') * 100) + '%'; });

    const popupOptionCheck = el('label', {class:'checkbox'});
    const popupOptionInput = el('input', {type:'checkbox'});
    popupOptionInput.checked = true;
    popupOptionCheck.appendChild(popupOptionInput);
    popupOptionCheck.appendChild(document.createTextNode('Show Popup Above Word'));
    const joinSelect = el('select', {'aria-label':'Content detect IPA join style'});
    for(const opt of [
      {v:'space', t:'IPA Join: space'},
      {v:'dot', t:'IPA Join: dot'},
      {v:'none', t:'IPA Join: none'}
    ]){
      const o = el('option', {value:opt.v}, [opt.t]);
      if(opt.v === (prefs.joinMode || 'space')) o.selected = true;
      joinSelect.appendChild(o);
    }
    const richLexiconControl = buildLexiconSourceControl('rich', ()=>{ hideWordPopup(); analyze(); }, 'Content detect rich lexicon source');
    const popupSsmlCheck = el('label', {class:'checkbox'});
    const popupSsmlInput = el('input', {type:'checkbox'});
    popupSsmlInput.checked = !!prefs.showPopupSsml;
    popupSsmlCheck.appendChild(popupSsmlInput);
    popupSsmlCheck.appendChild(document.createTextNode('Show SSML In Popup (Debug)'));

    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze Content']);
    const topRow = el('div', {class:'row', style:'margin-top:10px;'});
    topRow.appendChild(runBtn);
    topRow.appendChild(modeLabel);
    topRow.appendChild(modeSelect);
    topRow.appendChild(joinSelect);
    topRow.appendChild(richLexiconControl.wrap);
    topRow.appendChild(thrLabel);
    topRow.appendChild(thr);
    topRow.appendChild(popupOptionCheck);
    topRow.appendChild(popupSsmlCheck);
    card.appendChild(topRow);
    root.appendChild(card);

    const layout = el('div', {class:'detectBlockLayout'});
    const left = el('div', {class:'card', style:'margin:0; padding:12px;'});
    const right = el('div', {class:'card', style:'margin:0; padding:12px;'});

    left.appendChild(el('h3', {}, ['Example Content (Mixed + Full Te Reo Block)']));
    left.appendChild(el('p', {class:'muted'}, ['Highlights are applied directly in this content block.']));
    const exBox = el('div', {class:'hlText'});
    exBox.appendChild(document.createTextNode(exampleText));
    left.appendChild(exBox);

    right.appendChild(el('h3', {}, ['Editable Content']));
    right.appendChild(el('p', {class:'muted'}, ['Edit this text box, then run Analyze Content. Highlights are applied in-place.']));
    const editBox = el('div', {
      class:'hlText',
      id:'contentDetectEditableBox',
      contenteditable:'true',
      role:'textbox',
      'aria-multiline':'true',
      spellcheck:'false',
      style:'min-height:140px;'
    });
    editBox.appendChild(document.createTextNode(editableText));
    right.appendChild(editBox);

    right.appendChild(el('div', {class:'divider'}));
    right.appendChild(el('h3', {}, ['Selection Popup']));
    const popupWrap = el('div', {id:'contentDetectPopup'});
    popupWrap.appendChild(el('p', {class:'muted'}, ['Click a highlighted word or block to inspect details.']));
    right.appendChild(popupWrap);

    layout.appendChild(left);
    layout.appendChild(right);
    root.appendChild(layout);

    const existingWordPopup = document.getElementById('contentDetectWordPopup');
    if(existingWordPopup && existingWordPopup.parentNode) existingWordPopup.parentNode.removeChild(existingWordPopup);
    const wordPopup = el('div', {id:'contentDetectWordPopup', class:'card', style:'position:fixed; z-index:9999; display:none; min-width:260px; max-width:360px; padding:10px;'});
    document.body.appendChild(wordPopup);

    function hideWordPopup(){ wordPopup.style.display = 'none'; }

    function persistAdvancedOptions(){
      saveG2pAwsTtsPrefs({
        ...loadG2pAwsTtsPrefs(),
        inputMode: ttsInputModeSelect.value || 'text',
        outputMode: ttsOutputModeSelect.value || 'phoneme',
        wrapSpeak: !!ttsWrapSpeak.input.checked,
        emptyPhonemeBody: !!ttsEmptyBody.input.checked,
        preservePunctuation: !!ttsPreservePunctuation.input.checked,
        splitHyphen: !!ttsSplitHyphen.input.checked,
        trimNonFinalH: !!ttsTrimNonFinalH.input.checked,
        removeLowerArticulation: !!ttsRemoveLowerArt.input.checked,
        strictMissing: !!ttsStrictMissing.input.checked,
        serviceRegion: serviceRegionInput.value || '',
        awsRegion: awsRegionInput.value || '',
        voiceId: voiceIdInput.value || '',
        engine: engineSelect.value || 'neural',
        languageCode: languageCodeInput.value || '',
        outputFormat: outputFormatSelect.value || 'mp3',
        ssmlCompactEnabled: !!ccEnable.input.checked,
        ssmlCompactIpaOnly: !!ccIpaOnly.input.checked,
        ssmlCompactSplitSentence: !!ccSentence.input.checked,
        ssmlCompactSplitNewline: !!ccNewline.input.checked,
        ssmlCompactSplitSpace: !!ccSpace.input.checked,
        ssmlCompactEnsureSpace: !!ccEnsure.input.checked,
        ssmlCompactTeReoBlocksOnly: !!ccTeReoOnly.input.checked,
        ssmlCompactEmptyBody: !!ccEmpty.input.checked
      });
      if(rememberCredsInput.checked){
        saveG2pAwsTtsCreds({
          remember:true,
          accessKeyId: accessKeyInput.value || '',
          secretAccessKey: secretKeyInput.value || '',
          sessionToken: sessionTokenInput.value || ''
        });
      } else {
        saveG2pAwsTtsCreds({remember:false});
      }
    }

    saveAwsBtn.addEventListener('click', ()=>{ persistAdvancedOptions(); });

    function drawPopup(payload){
      popupWrap.innerHTML = '';
      if(!payload){
        popupWrap.appendChild(el('p', {class:'muted'}, ['Click a highlighted word or block to inspect details.']));
        return;
      }
      if(payload.mode === 'block'){
        const blockScore = Number.isFinite(Number(payload.blockScore)) ? Number(payload.blockScore) : 0;
        const lab = scoreToLabel(blockScore);
        const words = Array.isArray(payload.blockWords) ? payload.blockWords : [];
        popupWrap.appendChild(el('h4', {}, [payload.source + ': Te Reo Block']));
        popupWrap.appendChild(el('div', {class:'row'}, [
          el('span', {class:'tag ' + lab.cls}, [Math.round(blockScore * 100) + '%']),
          el('span', {class:'tag'}, [lab.label]),
          el('span', {class:'tag'}, ['mode: block'])
        ]));
        if(payload.blockText){
          popupWrap.appendChild(el('div', {class:'divider'}));
          popupWrap.appendChild(el('div', {class:'muted'}, ['Detected Block']));
          popupWrap.appendChild(el('div', {class:'mono'}, [payload.blockText]));
        }
        popupWrap.appendChild(el('div', {class:'divider'}));
        popupWrap.appendChild(el('div', {class:'muted'}, ['Te Reo Words']));
        popupWrap.appendChild(el('div', {class:'mono'}, [words.length ? words.join(' | ') : '(none)']));
      } else {
        const t = payload.token || {};
        const lab = scoreToLabel(t.score);
        popupWrap.appendChild(el('h4', {}, [payload.source + ': ' + String(t.raw || '')]));
        popupWrap.appendChild(el('div', {class:'row'}, [
          el('span', {class:'tag ' + lab.cls}, [Math.round((Number(t.score) || 0) * 100) + '%']),
          el('span', {class:'tag'}, [lab.label]),
          el('span', {class:'tag'}, ['mode: word'])
        ]));
        if(t.segments && t.segments.length){
          popupWrap.appendChild(el('div', {class:'divider'}));
          popupWrap.appendChild(el('div', {class:'muted'}, ['Segments']));
          popupWrap.appendChild(el('div', {class:'mono'}, [t.segments.join(' | ')]));
        }
      }
      popupWrap.appendChild(el('div', {class:'divider'}));
      popupWrap.appendChild(el('div', {class:'muted'}, ['Signals']));
      const signalIds = (payload.mode === 'block')
        ? uniquePreserveOrder((payload.blockTokens || []).flatMap(t => Array.isArray(t.signals) ? t.signals : []))
        : ((payload.token && payload.token.signals) || []);
      popupWrap.appendChild(renderSignalPills(signalIds, (id)=>{ drawSignalDetails(id); setActiveTab('detect'); }));
    }

    function buildWordIpa(segments){
      function trimContentDetectIpaPart(ipaPart, opts={}){
        const s = String(ipaPart || '');
        if(s.length <= 1) return s;
        const trimTail = opts.trimTail !== false;
        let out = trimTail ? s.replace(/h(\.+)?$/, (m, dots)=> (dots ?? '')) : s;
        out = out.replace(/([^.\s])h[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF]*(?=[\u02D0\u02D1]*[aeiou\u0251\u0250\u0252\u00E6\u0259\u025B\u025C\u025E\u026Ai\u0268\u0289\u028Au\u0254o\u0153\u00F8y\u0276\u028C\u0264\u026F])/gi, '$1');
        return out;
      }

      const out = [];
      const index = (typeof getRichLexiconIndex === 'function') ? getRichLexiconIndex() : null;
      if(!index) return '';
      const segList = Array.isArray(segments) ? segments : [];
      const trimEnabled = !!(ttsTrimNonFinalH && ttsTrimNonFinalH.input && ttsTrimNonFinalH.input.checked);
      for(let idx=0; idx<segList.length; idx++){
        const seg = segList[idx];
        const key = String(seg || '').trim().toLowerCase();
        if(!key) continue;
        const matches = index.get(key) || [];
        const m = (typeof chooseDefaultMatchV4 === 'function') ? chooseDefaultMatchV4(matches) : (matches[0] || null);
        let ipa = m ? String(m.ipa || m.proper_ipa || '').trim() : '';
        if(trimEnabled){
          ipa = trimContentDetectIpaPart(ipa, { trimTail: idx < (segList.length - 1) });
        }
        if(ipa) out.push(ipa);
      }
      return joinIpa(out, joinSelect.value || 'space');
    }

    function buildWordSsml(word, ipa){
      let ipaOut = String(ipa || '');
      if(ttsRemoveLowerArt.input.checked){
        ipaOut = ipaOut.replace(/[\u031E\u02D5]/g, '');
      }

      const outputMode = String(ttsOutputModeSelect.value || 'phoneme');
      if(outputMode === 'plain'){
        const plainText = escapeXmlAttrText(word);
        const textOut = ttsWrapSpeak.input.checked ? `<speak>${plainText}</speak>` : plainText;
        return { text: textOut, ipaOnly:false, textType:'text' };
      }

      const phonemeBody = ttsEmptyBody.input.checked ? '' : escapeXmlAttrText(word);
      const core = `<phoneme alphabet="ipa" ph="${escapeXmlAttrText(ipaOut)}">${phonemeBody}</phoneme>`;
      const base = ttsWrapSpeak.input.checked ? `<speak>${core}</speak>` : core;
      const useCompact = !!ccEnable.input.checked || !!ccIpaOnly.input.checked;
      if(!useCompact) return { text: base, ipaOnly:false, textType:'ssml' };
      try{
        const compact = applyCompactSsmlPostProcessText(base, {
          splitSentence: !!ccSentence.input.checked,
          splitNewline: !!ccNewline.input.checked,
          splitSpace: !!ccSpace.input.checked,
          ensureSpace: !!ccEnsure.input.checked,
          ipaOnly: !!ccIpaOnly.input.checked,
          emptyBody: !!ccEmpty.input.checked,
          wrapSpeak: !!ttsWrapSpeak.input.checked && !ccIpaOnly.input.checked
        });
        if(!compact || !String(compact).trim()) return { text: base, ipaOnly:false, textType:'ssml' };
        return { text: compact, ipaOnly: !!ccIpaOnly.input.checked, textType:'ssml' };
      } catch(_){
        return { text: base, ipaOnly:false, textType:'ssml' };
      }
    }

    async function playWordSsml(ssml, textType){
      persistAdvancedOptions();
      if(typeof AWS === 'undefined' || !AWS || !AWS.Polly){
        alert('AWS SDK not loaded in this page.');
        return;
      }
      if(!awsRegionInput.value || !accessKeyInput.value || !secretKeyInput.value){
        alert('AWS region, access key, and secret key are required.');
        return;
      }
      try{
        AWS.config.region = awsRegionInput.value;
        AWS.config.credentials = new AWS.Credentials({
          accessKeyId: accessKeyInput.value,
          secretAccessKey: secretKeyInput.value,
          sessionToken: sessionTokenInput.value || undefined
        });
        const polly = new AWS.Polly({apiVersion:'2016-06-10', region: awsRegionInput.value});
        const params = {
          OutputFormat: outputFormatSelect.value || 'mp3',
          Text: ssml,
          TextType: (textType === 'text') ? 'text' : 'ssml',
          VoiceId: voiceIdInput.value || 'Aria',
          Engine: engineSelect.value || 'neural'
        };
        if(languageCodeInput.value) params.LanguageCode = languageCodeInput.value;
        const data = await polly.synthesizeSpeech(params).promise();
        const blob = new Blob([data.AudioStream], {type:'audio/mpeg'});
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(()=>{});
        audio.addEventListener('ended', ()=>{ URL.revokeObjectURL(url); }, {once:true});
      } catch(err){
        alert('Polly playback failed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    function buildBlockSsml(payload){
      const tokens = Array.isArray(payload && payload.blockTokens) ? payload.blockTokens : [];
      const words = tokens.map(t => String((t && t.raw) || '')).filter(Boolean);
      if(!words.length) return { text:'', ipaOnly:false, textType:'ssml' };

      const outputMode = String(ttsOutputModeSelect.value || 'phoneme');
      if(outputMode === 'plain'){
        const plainText = escapeXmlAttrText(words.join(' '));
        const textOut = ttsWrapSpeak.input.checked ? `<speak>${plainText}</speak>` : plainText;
        return { text: textOut, ipaOnly:false, textType:'text' };
      }

      const chunks = [];
      for(const t of tokens){
        const rawWord = String((t && t.raw) || '').trim();
        if(!rawWord) continue;
        let ipa = buildWordIpa(Array.isArray(t.segments) ? t.segments : []);
        if(!ipa){
          if(ttsStrictMissing.input.checked) continue;
          ipa = '';
        }
        if(ttsRemoveLowerArt.input.checked){
          ipa = ipa.replace(/[\u031E\u02D5]/g, '');
        }
        const phonemeBody = ttsEmptyBody.input.checked ? '' : escapeXmlAttrText(rawWord);
        chunks.push(`<phoneme alphabet="ipa" ph="${escapeXmlAttrText(ipa)}">${phonemeBody}</phoneme>`);
      }
      const inner = chunks.join(' ');
      const base = ttsWrapSpeak.input.checked ? `<speak>${inner}</speak>` : inner;
      const useCompact = !!ccEnable.input.checked || !!ccIpaOnly.input.checked;
      if(!useCompact) return { text: base, ipaOnly:false, textType:'ssml' };
      try{
        const compact = applyCompactSsmlPostProcessText(base, {
          splitSentence: !!ccSentence.input.checked,
          splitNewline: !!ccNewline.input.checked,
          splitSpace: !!ccSpace.input.checked,
          ensureSpace: !!ccEnsure.input.checked,
          ipaOnly: !!ccIpaOnly.input.checked,
          emptyBody: !!ccEmpty.input.checked,
          wrapSpeak: !!ttsWrapSpeak.input.checked && !ccIpaOnly.input.checked
        });
        if(!compact || !String(compact).trim()) return { text: base, ipaOnly:false, textType:'ssml' };
        return { text: compact, ipaOnly: !!ccIpaOnly.input.checked, textType:'ssml' };
      } catch(_){
        return { text: base, ipaOnly:false, textType:'ssml' };
      }
    }

    function showWordPopup(anchorEl, payload){
      if(!popupOptionInput.checked){
        hideWordPopup();
        return;
      }
      wordPopup.innerHTML = '';
      let ssmlInfo = { text:'', ipaOnly:false, textType:'ssml' };
      if(payload.mode === 'block'){
        const words = Array.isArray(payload.blockWords) ? payload.blockWords : [];
        wordPopup.appendChild(el('div', {class:'row'}, [el('strong', {}, ['Te Reo Block'])]));
        wordPopup.appendChild(el('div', {class:'muted'}, ['Te Reo Words']));
        wordPopup.appendChild(el('div', {class:'mono'}, [words.length ? words.join(' | ') : '(none)']));
        ssmlInfo = buildBlockSsml(payload);
      } else {
        const token = payload.token || {};
        const segments = token.segments || [];
        const ipa = buildWordIpa(segments);
        wordPopup.appendChild(el('div', {class:'row'}, [el('strong', {}, [String(token.raw || '')])]));
        wordPopup.appendChild(el('div', {class:'muted'}, ['Segments']));
        wordPopup.appendChild(el('div', {class:'mono'}, [segments.length ? segments.join(' | ') : '(none)']));
        ssmlInfo = ipa ? buildWordSsml(String(token.raw || ''), ipa) : { text:'', ipaOnly:false, textType:'ssml' };
      }
      const row = el('div', {class:'row', style:'margin-top:8px;'});
      const playBtn = el('button', {class:'btn', type:'button'}, ['Play']);
      playBtn.disabled = !String(ssmlInfo.text || '').trim() || ssmlInfo.ipaOnly;
      playBtn.title = ssmlInfo.ipaOnly ? 'Disable IPA-only compact option to play SSML.' : '';
      playBtn.addEventListener('click', async ()=>{ if(ssmlInfo.text) await playWordSsml(ssmlInfo.text, ssmlInfo.textType); });
      row.appendChild(playBtn);
      row.appendChild(el('span', {class:'tag'}, [playBtn.disabled ? 'No playable SSML' : 'SSML ready']));
      wordPopup.appendChild(row);
      if(popupSsmlInput.checked){
        wordPopup.appendChild(el('div', {class:'divider'}));
        wordPopup.appendChild(el('div', {class:'muted'}, ['SSML (Debug)']));
        wordPopup.appendChild(el('pre', {class:'mono', style:'white-space:pre-wrap; margin:6px 0 0 0; max-height:180px; overflow:auto;'}, [String(ssmlInfo.text || '')]));
      }
      const rect = anchorEl.getBoundingClientRect();
      const top = Math.max(8, rect.top - 12);
      const left = Math.max(8, Math.min(window.innerWidth - 380, rect.left));
      wordPopup.style.left = left + 'px';
      wordPopup.style.top = (top - wordPopup.offsetHeight) + 'px';
      wordPopup.style.display = 'block';
      const postRect = wordPopup.getBoundingClientRect();
      wordPopup.style.top = Math.max(8, rect.top - postRect.height - 10) + 'px';
    }

    function renderHighlight(rawText, host, sourceLabel, mode, threshold){
      host.innerHTML = '';
      const computed = computeDetectForStats(rawText || '', threshold, {});
      const words = computed.scored || [];
      if(!words.length){
        host.appendChild(el('p', {class:'muted'}, ['No word tokens found.']));
        return;
      }

      const includedIdx = new Set();
      const blockTextByIdx = new Map();
      if(mode === 'block'){
        for(let blockIdx=0; blockIdx<(computed.blocks || []).length; blockIdx++){
          const b = computed.blocks[blockIdx];
          const text = b.idxs.map(i => (words[i] && words[i].raw) ? words[i].raw : '').filter(Boolean).join(' ');
          for(const idx of b.idxs){
            includedIdx.add(idx);
            blockTextByIdx.set(idx, text);
          }
        }
      } else {
        for(let i=0;i<(computed.includeFinal || []).length;i++){
          if(computed.includeFinal[i]) includedIdx.add(i);
        }
      }

      const parts = computed.parts || [];
      const frag = document.createDocumentFragment();

      if(mode === 'block'){
        const wordPartPos = new Map();
        for(let i=0; i<parts.length; i++){
          const p = parts[i];
          if(p.type === 'word') wordPartPos.set(p.wordIndex, i);
        }
        const blockStarts = new Map();
        for(const b of (computed.blocks || [])){
          if(!b || !Array.isArray(b.idxs) || !b.idxs.length) continue;
          const startWord = b.idxs[0];
          const endWord = b.idxs[b.idxs.length - 1];
          const startPos = wordPartPos.get(startWord);
          const endPos = wordPartPos.get(endWord);
          if(startPos == null || endPos == null) continue;
          const blockTokens = b.idxs.map(i => words[i]).filter(Boolean);
          const blockScore = blockTokens.length
            ? (blockTokens.reduce((s, t)=> s + (Number(t.score) || 0), 0) / blockTokens.length)
            : 0;
          blockStarts.set(startPos, {
            startPos,
            endPos,
            blockText: b.idxs.map(i => (words[i] && words[i].raw) ? words[i].raw : '').filter(Boolean).join(' '),
            blockWords: blockTokens.map(t => String(t.raw || '')).filter(Boolean),
            blockTokens,
            blockScore
          });
        }

        for(let i=0; i<parts.length; ){
          const block = blockStarts.get(i);
          if(!block){
            const p = parts[i];
            frag.appendChild(document.createTextNode(p.type === 'sep' ? (p.text || '') : (p.raw || '')));
            i += 1;
            continue;
          }
          const lab = scoreToLabel(block.blockScore);
          const span = el('span', {
            class:'hlTok ' + lab.cls + ' inc',
            title: `${sourceLabel}: ${block.blockText} (${Math.round(block.blockScore * 100)}%)`,
            'data-mode':'block'
          }, []);
          let blockTextRendered = '';
          for(let j=block.startPos; j<=block.endPos; j++){
            const pp = parts[j];
            const segText = pp.type === 'sep' ? (pp.text || '') : (pp.raw || '');
            blockTextRendered += segText;
          }
          span.appendChild(document.createTextNode(blockTextRendered));
          span.addEventListener('click', (ev)=>{
            const payload = {
              source: sourceLabel,
              mode: 'block',
              blockText: block.blockText,
              blockWords: block.blockWords,
              blockTokens: block.blockTokens,
              blockScore: block.blockScore
            };
            drawPopup(payload);
            showWordPopup(ev.currentTarget, payload);
          });
          frag.appendChild(span);
          i = block.endPos + 1;
        }
      } else {
        for(const p of parts){
          if(p.type === 'sep'){
            frag.appendChild(document.createTextNode(p.text || ''));
            continue;
          }
          const idx = p.wordIndex;
          const token = words[idx];
          if(!token || !includedIdx.has(idx)){
            frag.appendChild(document.createTextNode(p.raw || ''));
            continue;
          }

          const lab = scoreToLabel(token.score);
          const span = el('span', {class:'hlTok ' + lab.cls + ' inc', title: `${sourceLabel}: ${token.raw} (${Math.round(token.score * 100)}%)`, 'data-idx': String(idx)}, [p.raw]);
          span.addEventListener('click', (ev)=>{
            const payload = {
              source: sourceLabel,
              token,
              mode: 'word',
              blockText: blockTextByIdx.get(idx) || ''
            };
            drawPopup(payload);
            showWordPopup(ev.currentTarget, payload);
          });
          frag.appendChild(span);
        }
      }
      host.appendChild(frag);
    }

    function analyze(){
      const mode = (modeSelect.value === 'block') ? 'block' : 'word';
      const threshold = Math.max(0.50, Math.min(0.90, parseFloat(thr.value || '0.75')));
      const editableRaw = String(editBox.innerText || '').replace(/\r/g, '');
      saveContentDetectPrefs({ mode, threshold, showPopupSsml: !!popupSsmlInput.checked, joinMode: joinSelect.value || 'space' });
      saveToStorage(STORAGE_KEYS.contentDetectText, editableRaw);
      persistAdvancedOptions();
      drawPopup(null);
      hideWordPopup();
      renderHighlight(exampleText, exBox, 'Example', mode, threshold);
      renderHighlight(editableRaw, editBox, 'Editable', mode, threshold);
    }

    runBtn.addEventListener('click', analyze);
    modeSelect.addEventListener('change', analyze);
    joinSelect.addEventListener('change', ()=>{
      const mode = (modeSelect.value === 'block') ? 'block' : 'word';
      const threshold = Math.max(0.50, Math.min(0.90, parseFloat(thr.value || '0.75')));
      saveContentDetectPrefs({ mode, threshold, showPopupSsml: !!popupSsmlInput.checked, joinMode: joinSelect.value || 'space' });
      hideWordPopup();
    });
    thr.addEventListener('change', analyze);
    popupOptionInput.addEventListener('change', ()=>{ if(!popupOptionInput.checked) hideWordPopup(); });
    popupSsmlInput.addEventListener('change', ()=>{
      const mode = (modeSelect.value === 'block') ? 'block' : 'word';
      const threshold = Math.max(0.50, Math.min(0.90, parseFloat(thr.value || '0.75')));
      saveContentDetectPrefs({ mode, threshold, showPopupSsml: !!popupSsmlInput.checked, joinMode: joinSelect.value || 'space' });
      hideWordPopup();
    });
    editBox.addEventListener('input', ()=>{
      saveToStorage(STORAGE_KEYS.contentDetectText, String(editBox.innerText || '').replace(/\r/g, ''));
      drawPopup(null);
      hideWordPopup();
    });
    document.addEventListener('click', (ev)=>{
      if(!wordPopup.contains(ev.target) && !String((ev.target && ev.target.className) || '').includes('hlTok')) hideWordPopup();
    });
    window.addEventListener('scroll', hideWordPopup, true);
    window.addEventListener('resize', hideWordPopup);

    analyze();
  }

  function renderDetectBlock(){
    const root = document.getElementById('pageDetectBlock');
    root.innerHTML = '';

    const prefs = loadDetectPrefs();

    const ambiguous = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens);
    const particles = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens);

    const lists = {
      ambiguousArr: ambiguous,
      particlesArr: particles,
      ambiguous: new Set(ambiguous),
      particles: new Set(particles)
    };

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['Te Reo Detect Text Block']));
    card.appendChild(el('p', {}, ['Detect likely te reo Māori words and multi-token blocks inside a mixed passage. This mode uses neighbor context for scoring, but it does not apply the 0% neighbor rule. Click any highlighted word to inspect details.']));

    const area = el('textarea', {spellcheck:'false', style:'min-height:140px;'});
    area.value = loadFromStorage('rr_detect_block_text') || 'Welcome to Kerikeri. Haere mai ki te tepu, e hoa. This is mixed text with te reo.';

    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze Block']);

    const thrLabel = el('span', {class:'tag'}, ['Block threshold: 75%']);
    const thr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:String((loadG2pAwsTtsPrefs().autoDetectThreshold != null ? loadG2pAwsTtsPrefs().autoDetectThreshold : 0.75)), style:'width:220px;'});
    thr.addEventListener('input', ()=>{ thrLabel.textContent = 'Block threshold: ' + Math.round(parseFloat(thr.value)*100) + '%'; });

    const debugCheck = el('label', {class:'checkbox'});
    const debugInput = el('input', {type:'checkbox'});
    debugInput.checked = !!prefs.showDebugBlock;
    debugCheck.appendChild(debugInput);
    debugCheck.appendChild(document.createTextNode('Show Debug'));

    const topRow = el('div', {class:'row'});
    topRow.appendChild(runBtn);
    topRow.appendChild(thrLabel);
    topRow.appendChild(thr);
    topRow.appendChild(debugCheck);

    card.appendChild(area);
    card.appendChild(topRow);

    const layout = el('div', {class:'detectBlockLayout'});
    const left = el('div', {class:'card', style:'margin:0; padding:12px;'});
    const right = el('div', {class:'card', style:'margin:0; padding:12px;'});

    left.appendChild(el('h3', {}, ['Highlighted Text']));
    const hl = el('div', {class:'hlText', id:'detectBlockHL'});
    left.appendChild(hl);

    left.appendChild(el('div', {class:'divider'}));
    left.appendChild(el('h3', {}, ['Detected Blocks']));
    const blocksWrap = el('div', {id:'detectBlockBlocks'});
    left.appendChild(blocksWrap);

    right.appendChild(el('h3', {}, ['Word Details']));
    const details = el('div', {id:'detectBlockDetails'});
    right.appendChild(details);

    layout.appendChild(left);
    layout.appendChild(right);

    root.appendChild(card);
    root.appendChild(layout);

    // History card
    const historyCard = el('div', {class:'card', style:'margin-top:12px;'});
    historyCard.appendChild(el('h2', {}, ['Detect Block History']));
    historyCard.appendChild(el('p', {}, ['Most recent first. Click an entry to load the text back into the analyzer.']));

    const hControls = el('div', {class:'row'});
    const hClear = el('button', {class:'btn', type:'button'}, ['Clear History']);
    const hExport = el('button', {class:'btn', type:'button'}, ['Export History']);
    const hImport = el('button', {class:'btn', type:'button'}, ['Import History']);
    const hFile = el('input', {type:'file', accept:'application/json', class:'hidden'});

    hClear.addEventListener('click', ()=>{ saveDetectBlockHistory([]); drawBlockHistory(); });
    hExport.addEventListener('click', ()=>{
      const data = loadDetectBlockHistory();
      downloadText('detect_text_block_history.json', JSON.stringify(data, null, 2), 'application/json');
    });
    hImport.addEventListener('click', ()=> hFile.click());
    hFile.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !Array.isArray(parsed.value)) return;
      saveDetectBlockHistory(parsed.value);
      drawBlockHistory();
      hFile.value = '';
    });

    hControls.appendChild(hClear);
    hControls.appendChild(hExport);
    hControls.appendChild(hImport);
    hControls.appendChild(hFile);

    const hWrap = el('div', {id:'detectBlockHistoryWrap'});
    historyCard.appendChild(hControls);
    historyCard.appendChild(el('div', {class:'divider'}));
    historyCard.appendChild(hWrap);

    function drawBlockHistory(){
      const items = loadDetectBlockHistory();
      hWrap.innerHTML = '';
      if(!items.length){
        hWrap.appendChild(el('p', {}, ['No history yet. Run Analyze Block to add entries.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Time']),
        el('th', {}, ['Preview']),
        el('th', {}, ['Threshold']),
        el('th', {}, ['Blocks'])
      ]));
      tbl.appendChild(thead);

      const tbody = el('tbody');
      for(const item of items){
        const tr = el('tr');
        tr.addEventListener('click', ()=>{
          area.value = item.text || '';
          saveToStorage('rr_detect_block_text', area.value);
          if(item.threshold){
            thr.value = String(item.threshold);
            thrLabel.textContent = 'Block threshold: ' + Math.round(parseFloat(thr.value)*100) + '%';
          }
          analyze();
        });

        const dt = item.ts ? new Date(item.ts) : null;
        const preview = String(item.text || '').replace(/\s+/g,' ').trim();
        tr.appendChild(el('td', {}, [dt ? dt.toLocaleString() : '']));
        tr.appendChild(el('td', {class:'mono'}, [preview.slice(0, 90) + (preview.length > 90 ? '…' : '')]));
        tr.appendChild(el('td', {}, [item.threshold != null ? (Math.round(parseFloat(item.threshold)*100) + '%') : '']));
        tr.appendChild(el('td', {}, [String(item.blocksCount != null ? item.blocksCount : '')]));
        tbody.appendChild(tr);
      }

      tbl.appendChild(tbody);
      hWrap.appendChild(tbl);
    }

    root.appendChild(historyCard);

    const drawDetails = (t) => {
      details.innerHTML = '';
      if(!t){
        details.appendChild(el('p', {class:'muted'}, ['Click a highlighted word to inspect it.']));
        return;
      }

      const lab = scoreToLabel(t.score);
      details.appendChild(el('h4', {}, [t.raw + '  (' + (t.norm||'') + ')']));

      const head = el('div', {class:'row'});
      head.appendChild(el('div', {class:'tag ' + lab.cls}, [Math.round(t.score*100) + '%']));
      head.appendChild(el('div', {class:'tag'}, [lab.label]));
      details.appendChild(head);

      if(t.segments && t.segments.length){
        details.appendChild(el('div', {class:'divider'}));
        details.appendChild(el('div', {class:'muted'}, ['Segments']));
        details.appendChild(el('div', {class:'mono'}, [t.segments.join(' | ')]));
      }

      details.appendChild(el('div', {class:'divider'}));
      details.appendChild(el('div', {class:'muted'}, ['Signals']));
      details.appendChild(renderSignalPills(t.signals || [], (id)=>{ drawSignalDetails(id); setActiveTab('detect'); }));

      details.appendChild(el('div', {class:'divider'}));
      details.appendChild(el('div', {class:'muted'}, ['Segmenter Rules Used']));
      details.appendChild(renderRulePills(t.ruleIds || [], (rid)=>{ drawRuleDetails(rid); setActiveTab('rules'); }));

      if(debugInput.checked){
        details.appendChild(el('div', {class:'divider'}));
        details.appendChild(el('div', {class:'muted'}, ['Debug']));
        const pre = el('pre', {style:'white-space:pre-wrap;'}, [JSON.stringify({base:t.base, contextDelta:t.contextDelta, coverage:t.coverage, orphans:t.orphans, notes:t.contextNotes, debug:t.debug}, null, 2)]);
        details.appendChild(pre);
      }
    };

    let lastSelected = null;

    function analyze(){
      const rawText = area.value || '';
      saveToStorage('rr_detect_block_text', rawText);

      hl.innerHTML = '';
      blocksWrap.innerHTML = '';
      drawDetails(null);

      const parts = tokenizeTextBlockParts(rawText);

      const wordTokens = [];
      const sepBuf = [];
      let wi = -1;
      for(const p of parts){
        if(p.type === 'word'){
          wi += 1;
          p.wordIndex = wi;
          wordTokens.push({ raw: p.raw });
          sepBuf[wi] = '';
        } else if(wi >= 0){
          sepBuf[wi] = (sepBuf[wi] || '') + (p.text || '');
        }
      }

      if(!wordTokens.length){
        hl.appendChild(el('p', {class:'muted'}, ['No word tokens found.']));
        return;
      }

      const boundaryAfter = [];
      for(let i=0;i<wordTokens.length-1;i++) boundaryAfter[i] = isHardBoundary(sepBuf[i] || '');

      const baseTokens = [];
      for(const wt of wordTokens){
        const norm = normalizeWord(wt.raw);
        const base = scoreTokenBase(norm, lists);
        baseTokens.push({ raw: wt.raw, norm, base: base.base, signals: base.signals, debug: base.debug, segments: base.segments, ruleIds: base.ruleIds, coverage: base.coverage, orphans: base.orphans, hardBlock: base.hardBlock });
      }

      const scored = applyContextBoostBounded(baseTokens, lists, boundaryAfter);

      const frag = document.createDocumentFragment();
      for(const p of parts){
        if(p.type === 'sep'){
          frag.appendChild(document.createTextNode(p.text || ''));
        } else {
          const t = scored[p.wordIndex];
          const lab = scoreToLabel(t.score);
          frag.appendChild(el('span', {class:'hlTok ' + lab.cls, 'data-idx': String(p.wordIndex)}, [p.raw]));
        }
      }
      hl.appendChild(frag);

      hl.querySelectorAll('.hlTok').forEach(sp => {
        sp.addEventListener('click', ()=>{
          const idx = parseInt(sp.getAttribute('data-idx') || '', 10);
          if(Number.isNaN(idx)) return;
          if(lastSelected != null){
            const prev = hl.querySelector('.hlTok[data-idx="' + lastSelected + '"]');
            if(prev) prev.classList.remove('sel');
          }
          sp.classList.add('sel');
          lastSelected = idx;
          drawDetails(scored[idx]);
        });
      });

      const thrVal = parseFloat(thr.value || '0.75');
      const blocks = [];
      let cur = [];
      let curStart = 0;

      const shouldInclude = (i) => {
        const t = scored[i];
        if(t.hardBlock) return false;
        if(t.score >= thrVal) return true;
        const support = (t.score >= Math.max(0.60, thrVal - 0.15)) && (lists.particles.has(t.norm) || lists.ambiguous.has(t.norm));
        if(!support) return false;
        const prevHigh = (i-1 >= 0 && !boundaryAfter[i-1] && scored[i-1].score >= thrVal);
        const nextHigh = (i+1 < scored.length && !boundaryAfter[i] && scored[i+1].score >= thrVal);
        return prevHigh || nextHigh;
      };

      for(let i=0;i<scored.length;i++){
        if(i>0 && boundaryAfter[i-1] && cur.length){
          blocks.push({ start: curStart, idxs: cur.slice() });
          cur = [];
        }
        if(shouldInclude(i)){
          if(!cur.length) curStart = i;
          cur.push(i);
        } else {
          if(cur.length){
            blocks.push({ start: curStart, idxs: cur.slice() });
            cur = [];
          }
        }
      }
      if(cur.length) blocks.push({ start: curStart, idxs: cur.slice() });

      // Save to history (text block mode only)
      addDetectBlockHistoryEntry({
        ts: new Date().toISOString(),
        text: rawText,
        threshold: thrVal,
        blocksCount: blocks.length,
        tokenCount: scored.length
      });
      drawBlockHistory();

      if(!blocks.length){
        blocksWrap.appendChild(el('p', {class:'muted'}, ['No blocks above threshold.']));
        return;
      }

      for(const b of blocks){
        const words = b.idxs.map(i => scored[i].raw);
        const avg = b.idxs.reduce((a,i)=>a+scored[i].score,0) / b.idxs.length;
        const btn = el('button', {type:'button', class:'tag good', title:'Avg ' + Math.round(avg*100) + '%'}, [words.join(' ')]);
        btn.addEventListener('click', ()=>{
          const idx = b.start;
          const elTok = hl.querySelector('.hlTok[data-idx="' + idx + '"]');
          if(elTok) elTok.click();
        });
        blocksWrap.appendChild(btn);
      }
    }

    runBtn.addEventListener('click', ()=>{
      prefs.showDebugBlock = !!debugInput.checked;
      saveDetectPrefs(prefs);
      analyze();
    });

    debugInput.addEventListener('change', ()=>{
      prefs.showDebugBlock = !!debugInput.checked;
      saveDetectPrefs(prefs);
      analyze();
    });

    thr.addEventListener('change', analyze);

    drawBlockHistory();

    analyze();
  }


  

  // Segment Stats uses Detect Block logic for word inclusion but without per-word overrides.
  // This keeps stats consistent with Detect Block even if that tab has not been opened yet.
  function normalizeInfluenceValue(v){
    const n = parseFloat(v);
    if(!Number.isFinite(n)) return 1;
    return Math.max(0, Math.min(2, n));
  }

  function applyTokenListInfluence(scored, lists, opts={}){
    const ambInfluence = normalizeInfluenceValue(opts.ambiguousInfluence);
    const particleInfluence = normalizeInfluenceValue(opts.particleInfluence);
    if(ambInfluence === 1 && particleInfluence === 1) return scored;

    function applyInfluence(score, influence){
      return clamp01(0.5 + (score - 0.5) * influence);
    }

    const out = [];
    for(const tok of (scored || [])){
      if(!tok || tok.hardBlock){
        out.push(tok);
        continue;
      }

      let score = Number(tok.score);
      if(!Number.isFinite(score)) score = 0;
      const isAmbig = !!(lists && lists.ambiguous && lists.ambiguous.has(tok.norm));
      const isParticle = !!(lists && lists.particles && lists.particles.has(tok.norm));
      const debug = Array.isArray(tok.debug) ? tok.debug.slice() : [];

      if(isAmbig && ambInfluence !== 1){
        const prev = score;
        score = applyInfluence(score, ambInfluence);
        debug.push({id:'D09A', delta: `${prev.toFixed(2)} -> ${score.toFixed(2)}`, note:`ambiguous influence x${ambInfluence.toFixed(2)}`});
      }
      if(isParticle && particleInfluence !== 1){
        const prev = score;
        score = applyInfluence(score, particleInfluence);
        debug.push({id:'D08A', delta: `${prev.toFixed(2)} -> ${score.toFixed(2)}`, note:`particle influence x${particleInfluence.toFixed(2)}`});
      }

      out.push({
        ...tok,
        score,
        debug
      });
    }
    return out;
  }

  function computeDetectForStats(rawText, thrVal, opts={}){
    const t = clamp01(parseFloat(thrVal || '0.75'));
    const ambiguousArr = loadTokenList(STORAGE_KEYS.detectAmbiguous, defaultAmbiguousTokens);
    const particlesArr = loadTokenList(STORAGE_KEYS.detectParticles, defaultParticleTokens);
    const lists = {
      ambiguousArr,
      particlesArr,
      ambiguous: new Set(ambiguousArr),
      particles: new Set(particlesArr)
    };

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
      const base = scoreTokenBase(norm, lists);
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

    const scoredBase = applyContextBoostBounded(baseTokens, lists, boundaryAfter);
    const scored = applyTokenListInfluence(scoredBase, lists, opts || {});

    const shouldInclude = (i)=>{
      const tok = scored[i];
      if(!tok || tok.hardBlock) return false;
      if(tok.score >= t) return true;

      const isSupport = (tok.score >= Math.max(0.60, t - 0.15))
        && (lists.particles.has(tok.norm) || lists.ambiguous.has(tok.norm));
      if(!isSupport) return false;

      const prevHigh = (i-1 >= 0 && !boundaryAfter[i-1] && scored[i-1].score >= t);
      const nextHigh = (i+1 < scored.length && !boundaryAfter[i] && scored[i+1].score >= t);
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
      includeFinal[i] = includeAuto[i];
    }

    return { parts, scored, blocks, includeAuto, includeFinal, boundaryAfter };
  }


