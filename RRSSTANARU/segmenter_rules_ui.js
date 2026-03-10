// Extracted rules UI helpers from segmenter_core.js.

function renderRulePills(ruleIds, opts={}){
  const ids = uniquePreserveOrder(ruleIds || []);
  const wrap = el('div', {class:'row'});

  if(!ids.length){
    wrap.appendChild(el('span', {class:'tag warn'}, ['no rules detected']));
    return wrap;
  }

  const max = typeof opts.max === 'number' ? opts.max : 9999;
  const shown = ids.slice(0, max);
  const moreCount = Math.max(0, ids.length - shown.length);

  for(const id of shown){
    const r = RULE_BY_ID.get(id);
    const label = r ? `${r.id}` : id;
    const b = el('button', {
      type:'button',
      class:'tag',
      title: r ? r.title : id,
      onclick: ()=> openRule(id)
    }, [label]);
    wrap.appendChild(b);
  }

  if(moreCount){
    wrap.appendChild(el('span', {class:'tag'}, [`+${moreCount} more`]));
  }

  return wrap;
}

function openRule(ruleId){
  if(ruleId && RULE_BY_ID.has(ruleId)){
    state.selectedRuleId = ruleId;
    renderRules();
    setActiveTab('rules');
    return;
  }
  // If unknown, still show rules tab.
  state.selectedRuleId = ruleId || state.selectedRuleId;
  renderRules();
  setActiveTab('rules');
}
