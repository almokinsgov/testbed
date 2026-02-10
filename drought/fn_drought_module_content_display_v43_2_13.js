/*
  Content Display Module (Dynamic)
  - WYSIWYG Editor sub module (optional)
  - Preview sub module (optional)
  - Persists per module id in localStorage
*/

(function(){
  "use strict";

  const STORAGE_PREFIX = "fn_drought_content_display_v1:";

  function nowIso(){
    try{ return new Date().toISOString(); }catch(_e){ return ""; }
  }

  function debounce(fn, waitMs){
    let t = null;
    return function(){
      const ctx = this;
      const args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, waitMs || 200);
    };
  }

  function safeJsonParse(raw){
    try{ return JSON.parse(raw); }catch(_e){ return null; }
  }

  function sanitizeHtmlBasic(html){
    try{
      const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      const scripts = doc.querySelectorAll("script");
      scripts.forEach(n => n.remove());

      const all = doc.querySelectorAll("*");
      all.forEach(el => {
        const attrs = Array.from(el.attributes || []);
        attrs.forEach(a => {
          const name = String(a.name || "").toLowerCase();
          const val = String(a.value || "");
          if (name.startsWith("on")) el.removeAttribute(a.name);
          if ((name === "href" || name === "src") && val.trim().toLowerCase().startsWith("javascript:")){
            el.removeAttribute(a.name);
          }
        });
      });

      return doc.body ? doc.body.innerHTML : String(html || "");
    }catch(_e){
      return String(html || "");
    }
  }

  function getStorageKey(moduleId){
    return STORAGE_PREFIX + String(moduleId || "");
  }

  function loadState(moduleId){
    const raw = localStorage.getItem(getStorageKey(moduleId));
    if (!raw) return null;
    return safeJsonParse(raw);
  }

  function saveState(moduleId, state){
    try{ localStorage.setItem(getStorageKey(moduleId), JSON.stringify(state)); }catch(_e){}
  }

  function defaultState(){
    return {
      title: "",
      contentHtml: "<p>Add your content here.</p>",
      submodules: { editor: true, preview: true },
      meta: { updatedAt: nowIso() }
    };
  }

  function el(tag, attrs, children){
    const node = document.createElement(tag);
    if (attrs){
      Object.keys(attrs).forEach(k => {
        const v = attrs[k];
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else node.setAttribute(k, v);
      });
    }
    if (children && children.length){
      children.forEach(c => {
        if (c == null) return;
        if (typeof c === "string") node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      });
    }
    return node;
  }

  function btn(label, onClick, title){
    const b = el("button", { class: "btn", type: "button", title: title || "" }, [label]);
    b.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      try{ onClick && onClick(); }catch(_e){}
    });
    return b;
  }

  function applyCmd(cmd, val){
    try{ document.execCommand(cmd, false, val); }catch(_e){}
  }

  function buildToolbar(editorDiv, onDirty){
    const wrap = el("div", { class: "cdmToolbar" });

    wrap.appendChild(btn("B", () => { editorDiv.focus(); applyCmd("bold"); onDirty(); }, "Bold"));
    wrap.appendChild(btn("I", () => { editorDiv.focus(); applyCmd("italic"); onDirty(); }, "Italic"));
    wrap.appendChild(btn("U", () => { editorDiv.focus(); applyCmd("underline"); onDirty(); }, "Underline"));

    wrap.appendChild(btn("H2", () => { editorDiv.focus(); applyCmd("formatBlock", "h2"); onDirty(); }, "Heading"));
    wrap.appendChild(btn("P", () => { editorDiv.focus(); applyCmd("formatBlock", "p"); onDirty(); }, "Paragraph"));

    wrap.appendChild(btn("•", () => { editorDiv.focus(); applyCmd("insertUnorderedList"); onDirty(); }, "Bullet List"));
    wrap.appendChild(btn("1.", () => { editorDiv.focus(); applyCmd("insertOrderedList"); onDirty(); }, "Numbered List"));

    wrap.appendChild(btn("Link", () => {
      editorDiv.focus();
      const url = prompt("Enter URL");
      if (!url) return;
      applyCmd("createLink", url);
      onDirty();
    }, "Insert Link"));

    wrap.appendChild(btn("Image", () => {
      editorDiv.focus();
      const url = prompt("Enter Image URL");
      if (!url) return;
      applyCmd("insertImage", url);
      onDirty();
    }, "Insert Image"));

    wrap.appendChild(btn("Clear", () => {
      editorDiv.focus();
      applyCmd("removeFormat");
      onDirty();
    }, "Clear Formatting"));

    return wrap;
  }

  function mount(host, moduleId, number, headerEl){
    if (!host || !moduleId) return;

    const state = Object.assign(defaultState(), loadState(moduleId) || {});
    if (!state.submodules) state.submodules = { editor: true, preview: true };

    const defaultTitle = number ? ("Content Display #" + number) : "Content Display";
    const displayTitle = (state.title && String(state.title).trim()) ? String(state.title).trim() : defaultTitle;

    host.innerHTML = "";
    const root = el("div", { class: "cdmRoot", "data-preview-disabled": (state.submodules && state.submodules.preview) ? "0" : "1", "data-editor-disabled": (state.submodules && state.submodules.editor) ? "0" : "1" });

    const topRow = el("div", { class: "cdmTopRow" });
    const leftInfo = el("div", { class: "muted" }, [
      "Saved: ",
      el("strong", { class: "mono", text: (state.meta && state.meta.updatedAt) ? state.meta.updatedAt : "-" })
    ]);
    topRow.appendChild(leftInfo);

    const controls = el("div", { class: "row gap", style: "flex-wrap:wrap; align-items:center;" });
    controls.appendChild(btn(state.submodules.editor ? "Hide Editor" : "Show Editor", () => {
      state.submodules.editor = !state.submodules.editor;
      state.meta = state.meta || {};
      state.meta.updatedAt = nowIso();
      saveState(moduleId, state);
      mount(host, moduleId, number, headerEl);
    }, "Toggle editor"));

    controls.appendChild(btn(state.submodules.preview ? "Hide Preview" : "Show Preview", () => {
      state.submodules.preview = !state.submodules.preview;
      state.meta = state.meta || {};
      state.meta.updatedAt = nowIso();
      saveState(moduleId, state);
      mount(host, moduleId, number, headerEl);
    }, "Toggle preview"));

    controls.appendChild(btn("Clear Content", () => {
      const ok = confirm("Clear saved content for this module?");
      if (!ok) return;
      state.contentHtml = "<p></p>";
      state.meta = state.meta || {};
      state.meta.updatedAt = nowIso();
      saveState(moduleId, state);
      mount(host, moduleId, number, headerEl);
    }, "Clear content"));

    controls.appendChild(btn("Rename", () => {
      const next = prompt("Content display name", displayTitle);
      if (next == null) return;
      const cleaned = String(next || "").trim();
      state.title = cleaned;
      state.meta = state.meta || {};
      state.meta.updatedAt = nowIso();
      saveState(moduleId, state);
      // Update header immediately
      try{ if (headerEl) headerEl.textContent = cleaned ? cleaned : defaultTitle; }catch(_e){}
      // Keep layout editor list aligned if available
      try{ if (window.TAB_REGISTRY && window.TAB_REGISTRY.modules && window.TAB_REGISTRY.modules[moduleId]) window.TAB_REGISTRY.modules[moduleId].title = cleaned ? cleaned : defaultTitle; }catch(_e){}
      mount(host, moduleId, number, headerEl);
    }, "Rename this content display"));

    topRow.appendChild(controls);
    root.appendChild(topRow);

    const grid = el("div", { class: "cdmGrid" });

    let previewDiv = null;
    let editorDiv = null;

    const saveDebounced = debounce(function(html){
      state.contentHtml = sanitizeHtmlBasic(html);
      state.meta = state.meta || {};
      state.meta.updatedAt = nowIso();
      saveState(moduleId, state);
      try{
        const strong = root.querySelector("strong.mono");
        if (strong) strong.textContent = state.meta.updatedAt || "-";
      }catch(_e){}
    }, 200);

    const onDirty = debounce(function(){
      if (!editorDiv) return;
      const html = editorDiv.innerHTML;
      saveDebounced(html);
      if (previewDiv) previewDiv.innerHTML = sanitizeHtmlBasic(html);
    }, 120);

    if (state.submodules.editor){
      const card = el("div", { class: "cdmCard", "data-cdm-panel": "editor" });
      const hd = el("div", { class: "cdmCardHd" });
      hd.appendChild(el("div", { class: "title", text: "Editor" }));
      hd.appendChild(btn("Remove", () => {
        state.submodules.editor = false;
        state.meta = state.meta || {};
        state.meta.updatedAt = nowIso();
        saveState(moduleId, state);
        mount(host, moduleId, number, headerEl);
      }, "Remove editor panel"));
      card.appendChild(hd);

      editorDiv = el("div", { class: "cdmEditor", contenteditable: "true" });
      editorDiv.innerHTML = String(state.contentHtml || "");

      card.appendChild(buildToolbar(editorDiv, onDirty));
      card.appendChild(editorDiv);
      editorDiv.addEventListener("input", onDirty);
      editorDiv.addEventListener("blur", onDirty);
      grid.appendChild(card);
    }

    // Preview panel is always rendered (view mode shows preview only; edit mode can hide if disabled)
    {
      const card = el("div", { class: "cdmCard", "data-cdm-panel": "preview" });
      const hd = el("div", { class: "cdmCardHd" });
      hd.appendChild(el("div", { class: "title", text: "Preview" }));
      hd.appendChild(btn("Remove", () => {
        state.submodules.preview = false;
        state.meta = state.meta || {};
        state.meta.updatedAt = nowIso();
        saveState(moduleId, state);
        mount(host, moduleId, number, headerEl);
      }, "Remove preview panel"));
      card.appendChild(hd);

      previewDiv = el("div", { class: "cdmPreview", html: sanitizeHtmlBasic(state.contentHtml || "") });
      card.appendChild(previewDiv);
      grid.appendChild(card);
    }

    if (!state.submodules.editor && !state.submodules.preview){
      grid.appendChild(el("div", { class: "cdmEmpty" }, [
        "No panels enabled. Use Show Editor or Show Preview above."
      ]));
    }

    root.appendChild(grid);
    host.appendChild(root);

    // Reflect title in header
    try{
      if (headerEl) headerEl.textContent = displayTitle;
    }catch(_e){}
  }

  window.FN_DROUGHT_ContentDisplay = {
    mount
  };

})();
