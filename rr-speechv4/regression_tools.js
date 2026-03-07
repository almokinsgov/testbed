// Extracted regression fixtures and runner from segmenter_core.js.

const BASELINE_TESTS = [
  { name: 'pou + a + ka + roa', expected: ['pou','a','ka','roa'] },
  { name: 'a + whi + na', expected: ['a','whi','na'] },
  { name: 'ma + nga + tai + o + re', expected: ['ma','nga','tai','o','re'] },
  { name: 'wha + nga + tau + a + tia', expected: ['wha','nga','tau','a','tia'] },
  { name: 'pi + pi + wha + rau + roa', expected: ['pi','pi','wha','rau','roa'] },
  { name: 'hai + ti + tai + ma + ra + ngai', expected: ['hai','ti','tai','ma','ra','ngai'] },
  { name: 'ho + ro + mai + te + meu + ka + re + nga + whei', expected: ['ho','ro','mai','te','meu','ka','re','nga','whei'] },
  { name: 'tu + po + rou + ngae + wha + ka', expected: ['tu','po','rou','ngae','wha','ka'] },
  { name: 'tu + po + rou + wha + ka + ngae', expected: ['tu','po','rou','wha','ka','ngae'] },
  { name: 'wha + ka + ua + ua', expected: ['wha','ka','ua','ua'] },
  { name: 'mo + rou + mo + ngai + te', expected: ['mo','rou','mo','ngai','te'] },
  { name: 'ta + hio + na', expected: ['ta','hio','na'] },
  { name: 'o + ta + nga + rei', expected: ['o','ta','nga','rei'] },
  { name: 'o + po + ti + ki', expected: ['o','po','ti','ki'] },
  { name: 'nga + rua + wa + hia', expected: ['nga','rua','wa','hia'] },
  { name: 'pa + ma + pu + ria', expected: ['pa','ma','pu','ria'] },
  { name: 'nga + tae + a', expected: ['nga','tae','a'] },
  { name: 'wha + rea + na', expected: ['wha','rea','na'] },
  { name: 'o + ria + tou', expected: ['o','ria','tou'] },
  { name: 'ma + ta + whe + ro + hia', expected: ['ma','ta','whe','ro','hia'] },
  { name: 'wai + pou + a', expected: ['wai','pou','a'] },
  { name: 'o + hae + a + wai', expected: ['o','hae','a','wai'] }
];

function makeDefaultTestsPayload(){
  return BASELINE_TESTS.map(t => ({
    name: t.name,
    word: deriveWordFromExpected(t.expected),
    expected: t.expected
  }));
}

function runTestsFromTextarea(textareaEl, summaryEl){
  const raw = textareaEl.value.trim();
  const parsed = safeJsonParse(raw);
  if(!parsed.ok){
    summaryEl.innerHTML = `<span class="tag bad">Invalid JSON</span> <span class="muted">${escapeHtml(parsed.error)}</span>`;
    state.results = null;
    state.selected = null;
    return;
  }

  const tests = Array.isArray(parsed.value) ? parsed.value : [];
  const t0 = performance.now();

  const results = {
    ranAtIso: new Date().toISOString(),
    runtimeMs: 0,
    tests: []
  };

  for(const test of tests){
    const expectedRaw = test.expected ?? test.expectedSegments ?? test.segments ?? [];
    const expected = normalizeSegments(Array.isArray(expectedRaw) ? expectedRaw : String(expectedRaw).split('+'));
    const word = normalizeWord(test.word || deriveWordFromExpected(expected));
    const name = test.name || word;

    const out = segmentWordCore(word, { trace: true });
    const actual = normalizeSegments(out.segments);
    const pass = expected.length === actual.length && expected.every((v, i) => v === actual[i]);

    results.tests.push({
      name,
      word,
      expected,
      actual,
      pass,
      diff: pass ? '' : buildDiff(expected, actual),
      prefix: out.prefix,
      middle: out.middle,
      suffix: out.suffix,
      ruleIds: out.ruleIds,
      trace: out.trace
    });
  }

  results.runtimeMs = Math.round(performance.now() - t0);
  state.results = results;
  state.selected = results.tests[0] || null;

  return results;
}
