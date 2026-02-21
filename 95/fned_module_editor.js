/* FNED Module Editor
   Edits the dashboard JSON configuration stored in localStorage and reloads to apply.
*/
(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ensureLayout(data) {
    if (!data.layout) data.layout = {};
    if (!data.layout.edit) data.layout.edit = { enabled: true, storageKey: "fned_dashboard_override_v1" };
    if (!Array.isArray(data.layout.modules)) data.layout.modules = [];
    return data;
  }

  var EditorConfigUtils = window.FNED_EDITOR_CONFIG_UTILS || null;
  var ON_EDITOR_DATA_CHANGED = function () {};

  var KNOWN_OVERLAY_NAMES = [
    "MetService Weather Warnings",
    "Civil Defence Alerts",
    "Power Outages",
    "Water Outages",
    "NZTA Road Warnings and Closures",
    "Local Road Closures",
    "Marae locations",
    "Community Hall locations",
    "Service Centre locations",
    "Swimsafe Locations",
    "Weather",
    "Tides",
    "NRC River Data",
    "GeoNet Earthquakes",
    "GeoNet Quake Warnings (CAP)"
  ];

  function defaultModuleOrder() {
    return ["header", "hero", "ctaRow", "situation", "summary", "stats", "tiles", "social", "footer"];
  }

  function ensureModulesPresent(data) {
    ensureLayout(data);
    var mods = Array.isArray(data.layout.modules) ? data.layout.modules : [];

    // Deduplicate by id while preserving first occurrence
    var seen = Object.create(null);
    mods = mods.filter(function (m) {
      if (!m || !m.id) return false;
      if (seen[m.id]) return false;
      seen[m.id] = true;
      return true;
    });

    var defaults = defaultModuleOrder();
    defaults.forEach(function (id) {
      var found = mods.find(function (m) { return m && m.id === id; });
      if (!found) {
        found = { id: id, label: moduleLabelById(id), enabled: true };
        if (id === "situation") {
          found.submodules = [
            { id: "mapPanel", label: "Map Panel", enabled: true },
            { id: "alertsPanel", label: "Alerts Panel", enabled: true }
          ];
        }
        mods.push(found);
      } else {
        if (!found.label) found.label = moduleLabelById(id);
        if (typeof found.enabled !== "boolean") found.enabled = true;
        if (id === "situation") {
          if (!Array.isArray(found.submodules)) {
            found.submodules = [
              { id: "mapPanel", label: "Map Panel", enabled: true },
              { id: "alertsPanel", label: "Alerts Panel", enabled: true }
            ];
          }
        }
      }
    });

    data.layout.modules = mods;
    return data;
  }

  function moduleLabelById(id) {
    var labels = {
      header: "Header",
      hero: "Hero",
      ctaRow: "Action Buttons",
      situation: "Map And Alerts",
      summary: "Content Panel",
      stats: "Status Cards",
      tiles: "Information Tiles",
      social: "Social Updates",
      footer: "Footer"
    };
    return labels[id] || id;
  }

  function getModuleConfig(data, id) {
    ensureModulesPresent(data);
    var mods = (data.layout && Array.isArray(data.layout.modules)) ? data.layout.modules : [];
    var found = mods.find(function (m) { return m && m.id === id; });
    if (!found) {
      found = { id: id, label: moduleLabelById(id), enabled: true };
      if (id === "situation") {
        found.submodules = [
          { id: "mapPanel", label: "Map Panel", enabled: true },
          { id: "alertsPanel", label: "Alerts Panel", enabled: true }
        ];
      }
      mods.push(found);
      data.layout.modules = mods;
    }
    if (!found.label) found.label = moduleLabelById(id);
    if (typeof found.enabled !== "boolean") found.enabled = true;
    return found;
  }

  function getAllModules(data) {
    ensureModulesPresent(data);
    return Array.isArray(data.layout.modules) ? data.layout.modules : [];
  }

  function downloadText(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function setEditMode(on) {
    document.body.classList.toggle("edit-mode", !!on);
    var backdrop = $("#editor-backdrop");
    if (backdrop) backdrop.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function focusModule(id) {
    var target = document.querySelector('[data-module-id="' + id + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderModulesList(data, state) {
    var list = $("#editor-modules-list");
    if (!list) return;
    list.innerHTML = "";
    var modules = getAllModules(data);

    modules.forEach(function (m) {
      var isSituation = m.id === "situation";
      var isStats = m.id === "stats";
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var statsPage = (function () {
        var allowed = {
          overview: true,
          runtime: true,
          fndcAlerts: true,
          emergencyNews: true,
          waterOutages: true,
          powerOutages: true,
          nztaRoadClosures: true,
          localRoadClosures: true,
          weatherWarnings: true,
          civilDefenceWarnings: true
        };
        return allowed[state.statsPage] ? state.statsPage : "overview";
      })();
      var isOn = m.enabled !== false;
      var row = el("div", { class: "editor-module-item" + (state.activeModuleId === m.id ? " is-active" : "") }, [
        el("span", { class: "editor-chip", text: isOn ? "On" : "Off" }),
        el("span", { text: m.label || m.id })
      ]);

      row.addEventListener("click", function () {
        state.activeModuleId = m.id;
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        focusModule(m.id);
        syncFocusMode(state);
      });

      list.appendChild(row);

      if (isSituation) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "map", label: "Map Page" },
          { pageId: "alerts", label: "Alerts Page" },
          { pageId: "diagnostics", label: "Diagnostics" }
        ].forEach(function (subPage) {
          var subActive = state.activeModuleId === "situation" && situationPage === subPage.pageId;
          var subRow = el("div", { class: "editor-submodule-item" + (subActive ? " is-active" : "") }, [
            el("span", { class: "editor-chip", text: "Page" }),
            el("span", { text: subPage.label })
          ]);
          subRow.addEventListener("click", function () {
            state.activeModuleId = "situation";
            state.situationPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("situation");
            syncFocusMode(state);
          });
          list.appendChild(subRow);
        });
      }
      if (isStats) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "runtime", label: "Runtime Settings" },
          { pageId: "fndcAlerts", label: "FNDC Alerts Card" },
          { pageId: "emergencyNews", label: "Emergency News Card" },
          { pageId: "waterOutages", label: "Water Outages Card" },
          { pageId: "powerOutages", label: "Power Outages Card" },
          { pageId: "nztaRoadClosures", label: "NZTA Card" },
          { pageId: "localRoadClosures", label: "Local Closures Card" },
          { pageId: "weatherWarnings", label: "Weather Warnings Card" },
          { pageId: "civilDefenceWarnings", label: "Civil Defence Warnings Card" }
        ].forEach(function (subPage) {
          var subActive = state.activeModuleId === "stats" && statsPage === subPage.pageId;
          var subRow = el("div", { class: "editor-submodule-item" + (subActive ? " is-active" : "") }, [
            el("span", { class: "editor-chip", text: "Page" }),
            el("span", { text: subPage.label })
          ]);
          subRow.addEventListener("click", function () {
            state.activeModuleId = "stats";
            state.statsPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("stats");
            syncFocusMode(state);
          });
          list.appendChild(subRow);
        });
      }
    });
  }

  function renderQuickNav(data, state) {
    var wrap = $("#editor-quick-nav");
    if (!wrap) return;
    wrap.innerHTML = "";

    getAllModules(data).forEach(function (m) {
      var isSituation = m.id === "situation";
      var isStats = m.id === "stats";
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var statsPage = (function () {
        var allowed = {
          overview: true,
          runtime: true,
          fndcAlerts: true,
          emergencyNews: true,
          waterOutages: true,
          powerOutages: true,
          nztaRoadClosures: true,
          localRoadClosures: true,
          weatherWarnings: true,
          civilDefenceWarnings: true
        };
        return allowed[state.statsPage] ? state.statsPage : "overview";
      })();
      var btn = el("button", {
        type: "button",
        class: "editor-quick-btn" + (state.activeModuleId === m.id ? " is-active" : ""),
        text: m.label || m.id
      });
      btn.addEventListener("click", function () {
        state.activeModuleId = m.id;
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        focusModule(m.id);
        syncFocusMode(state);
      });
      wrap.appendChild(btn);

      if (isSituation) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "map", label: "Map Page" },
          { pageId: "alerts", label: "Alerts Page" },
          { pageId: "diagnostics", label: "Diagnostics" }
        ].forEach(function (subPage) {
          var subBtn = el("button", {
            type: "button",
            class: "editor-quick-btn editor-quick-btn-sub" + ((state.activeModuleId === "situation" && situationPage === subPage.pageId) ? " is-active" : ""),
            text: subPage.label
          });
          subBtn.addEventListener("click", function () {
            state.activeModuleId = "situation";
            state.situationPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("situation");
            syncFocusMode(state);
          });
          wrap.appendChild(subBtn);
        });
      }
      if (isStats) {
        [
          { pageId: "overview", label: "Overview" },
          { pageId: "runtime", label: "Runtime" },
          { pageId: "fndcAlerts", label: "FNDC" },
          { pageId: "emergencyNews", label: "News" },
          { pageId: "waterOutages", label: "Water" },
          { pageId: "powerOutages", label: "Power" },
          { pageId: "nztaRoadClosures", label: "NZTA" },
          { pageId: "localRoadClosures", label: "Local Roads" },
          { pageId: "weatherWarnings", label: "Weather" },
          { pageId: "civilDefenceWarnings", label: "Civil Defence" }
        ].forEach(function (subPage) {
          var subBtn = el("button", {
            type: "button",
            class: "editor-quick-btn editor-quick-btn-sub" + ((state.activeModuleId === "stats" && statsPage === subPage.pageId) ? " is-active" : ""),
            text: subPage.label
          });
          subBtn.addEventListener("click", function () {
            state.activeModuleId = "stats";
            state.statsPage = subPage.pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
            focusModule("stats");
            syncFocusMode(state);
          });
          wrap.appendChild(subBtn);
        });
      }
    });
  }

  function syncFocusMode(state) {
    var enabled = !!(state && state.focusMode);
    document.body.classList.toggle("editor-focus-mode", enabled && document.body.classList.contains("edit-mode"));

    var activeId = state && state.activeModuleId ? state.activeModuleId : "";
    var moduleNodes = document.querySelectorAll("[data-module-id]");
    moduleNodes.forEach(function (node) {
      var id = node.getAttribute("data-module-id") || "";
      var isActive = id === activeId;
      node.classList.toggle("editor-focus-active", enabled && isActive);
      node.classList.toggle("editor-focus-muted", enabled && !isActive);
    });
  }

  function serializeInputValue(inputEl) {
    if (!inputEl) return "";
    if (inputEl.type === "checkbox") return inputEl.checked ? "1" : "0";
    return String(inputEl.value == null ? "" : inputEl.value);
  }

  function applySerializedInputValue(inputEl, serialized) {
    if (!inputEl) return;
    if (inputEl.type === "checkbox") {
      inputEl.checked = serialized === "1";
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    inputEl.value = serialized == null ? "" : String(serialized);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function fieldValidationMessage(labelText, inputEl) {
    if (!inputEl || inputEl.type === "checkbox") return "";
    var value = String(inputEl.value || "").trim();
    if (!value) return "";

    var lower = String(labelText || "").toLowerCase();
    var isUrlField = lower.indexOf("url") >= 0;
    if (isUrlField) {
      var isAllowedUrl =
        value.indexOf("http://") === 0 ||
        value.indexOf("https://") === 0 ||
        value.indexOf("/") === 0 ||
        value.indexOf("#") === 0 ||
        value.indexOf("about:") === 0 ||
        value.indexOf("mailto:") === 0 ||
        value.indexOf("tel:") === 0;
      if (!isAllowedUrl) {
        return "Use a full URL (https://...) or relative path (# or /...).";
      }
    }

    var isNumberField =
      lower === "number" ||
      lower.indexOf("(hours)") >= 0 ||
      lower.indexOf("onset window") >= 0 ||
      lower.indexOf("section count") >= 0;
    if (isNumberField && !/^[-]?\d+$/.test(value)) {
      return "Use whole numbers only.";
    }
    return "";
  }

  function field(label, inputEl) {
    var isWide = !!(inputEl && inputEl.tagName === "TEXTAREA");
    var wrap = el("div", { class: "editor-field" + (isWide ? " editor-field--wide" : "") });
    var labelNode = el("label", { text: label });
    var resetBtn = el("button", { type: "button", class: "editor-field-reset hidden", text: "Reset" });
    var errorNode = el("div", { class: "editor-field-error" });

    function updateFieldState() {
      var hasInitial = inputEl && typeof inputEl.dataset.initialValue !== "undefined";
      var changed = hasInitial && serializeInputValue(inputEl) !== inputEl.dataset.initialValue;
      resetBtn.classList.toggle("hidden", !changed);
      errorNode.textContent = fieldValidationMessage(label, inputEl);
    }

    resetBtn.addEventListener("click", function () {
      if (!inputEl || typeof inputEl.dataset.initialValue === "undefined") return;
      applySerializedInputValue(inputEl, inputEl.dataset.initialValue);
      updateFieldState();
    });

    if (inputEl) {
      var eventName = inputEl.type === "checkbox" ? "change" : "input";
      inputEl.addEventListener(eventName, updateFieldState);
      setTimeout(updateFieldState, 0);
    }

    wrap.appendChild(el("div", { class: "editor-field-label-row" }, [labelNode, resetBtn]));
    wrap.appendChild(inputEl);
    wrap.appendChild(errorNode);
    return wrap;
  }

  function ensureObj(parent, key) {
    if (!parent[key] || typeof parent[key] !== "object") parent[key] = {};
    return parent[key];
  }

  function renderOverlayPicker(mapCfg, onChange) {
    var enabled = Array.isArray(mapCfg.enabledOverlays) ? mapCfg.enabledOverlays.slice() : [];

    function isSelected(name) {
      return enabled.indexOf(name) >= 0;
    }

    function commit() {
      // When nothing is selected, fall back to showing all overlays.
      mapCfg.enabledOverlays = enabled.length ? enabled : null;
      onChange();
    }

    var wrap = el("div");
    wrap.appendChild(el("p", { class: "editor-note", text: "Select overlays to show in the layer picker. If none are selected, all overlays are shown." }));

    wrap.appendChild(buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Show All" }),
      el("button", { type: "button", class: "editor-btn", text: "Select All" })
    ]));

    wrap.lastChild.children[0].addEventListener("click", function () {
      enabled = [];
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    wrap.lastChild.children[1].addEventListener("click", function () {
      enabled = KNOWN_OVERLAY_NAMES.slice();
      commit();
      ON_EDITOR_DATA_CHANGED();
    });

    KNOWN_OVERLAY_NAMES.forEach(function (name) {
      var row = el("div", { class: "editor-inline" }, [
        inputCheckbox(isSelected(name), function (v) {
          if (v) {
            if (enabled.indexOf(name) < 0) enabled.push(name);
          } else {
            enabled = enabled.filter(function (n) { return n !== name; });
          }
          commit();
        }),
        el("span", { text: name })
      ]);
      wrap.appendChild(row);
    });

    return wrap;
  }

  function inputText(value, onChange, placeholder) {
    var i = el("input", { type: "text", value: value || "", placeholder: placeholder || "" });
    i.dataset.initialValue = String(value || "");
    i.addEventListener("input", function () {
      onChange(i.value, i);
      ON_EDITOR_DATA_CHANGED();
    });
    return i;
  }

  function inputCheckbox(checked, onChange) {
    var i = el("input", { type: "checkbox" });
    i.checked = !!checked;
    i.dataset.initialValue = i.checked ? "1" : "0";
    i.addEventListener("change", function () {
      onChange(i.checked);
      ON_EDITOR_DATA_CHANGED();
    });
    return i;
  }

  function inputTextarea(value, onChange, placeholder) {
    var t = el("textarea", { placeholder: placeholder || "" });
    t.value = value || "";
    t.dataset.initialValue = String(value || "");
    t.addEventListener("input", function () {
      onChange(t.value);
      ON_EDITOR_DATA_CHANGED();
    });
    return t;
  }

  function inputSelect(value, options, onChange) {
    var s = el("select");
    options.forEach(function (opt) {
      s.appendChild(el("option", { value: opt.value, text: opt.label }));
    });
    s.value = value || "";
    s.dataset.initialValue = String(value || "");
    s.addEventListener("change", function () {
      onChange(s.value);
      ON_EDITOR_DATA_CHANGED();
    });
    return s;
  }

  function buttonRow(btns) {
    return el("div", { class: "editor-inline" }, btns);
  }

  function moveItem(arr, index, delta) {
    var next = index + delta;
    if (next < 0 || next >= arr.length) return;
    var tmp = arr[index];
    arr[index] = arr[next];
    arr[next] = tmp;
  }

  function renderArrayEditor(opts) {
    var title = opts.title;
    var arr = opts.arr;
    var getSummary = opts.getSummary;
    var renderItemFields = opts.renderItemFields;
    var addNewItem = opts.addNewItem;

    var wrap = el("div", { class: "editor-array-block" }, [
      el("h4", { text: title })
    ]);

    if (!Array.isArray(arr) || arr.length === 0) {
      wrap.appendChild(el("p", { text: "No items yet." }));
    }

    (arr || []).forEach(function (item, idx) {
      var summary = el("summary", { class: "editor-array-summary" }, [
        el("span", { class: "editor-chip", text: String(idx + 1) }),
        el("strong", { text: getSummary(item, idx) })
      ]);

      var controls = buttonRow([
        el("button", { type: "button", class: "editor-btn", text: "Up" }),
        el("button", { type: "button", class: "editor-btn", text: "Down" }),
        el("button", { type: "button", class: "editor-btn", text: "Duplicate" }),
        el("button", { type: "button", class: "editor-btn danger", text: "Remove" })
      ]);

      controls.children[0].addEventListener("click", function () { moveItem(arr, idx, -1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
      controls.children[1].addEventListener("click", function () { moveItem(arr, idx, 1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
      controls.children[2].addEventListener("click", function () {
        var copy = deepClone(item);
        arr.splice(idx + 1, 0, copy);
        opts.onChange();
        ON_EDITOR_DATA_CHANGED();
      });
      controls.children[3].addEventListener("click", function () { arr.splice(idx, 1); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });

      var body = el("div", { class: "editor-array-body" });
      controls.classList.add("editor-array-controls");
      body.appendChild(controls);
      body.appendChild(renderItemFields(item, idx));

      var itemWrap = el("details", { class: "editor-array-item", open: "open" }, [
        summary,
        body
      ]);

      wrap.appendChild(itemWrap);
    });

    var addBtn = el("button", { type: "button", class: "editor-btn", text: "Add Item" });
    addBtn.addEventListener("click", function () { arr.push(addNewItem()); opts.onChange(); ON_EDITOR_DATA_CHANGED(); });
    wrap.appendChild(addBtn);

    return wrap;
  }

  function renderModulePanel(data, state) {
    var panel = $("#editor-panel");
    if (!panel) return;
    panel.innerHTML = "";
    panel.classList.remove("editor-panel-alerts-page");
    panel.classList.remove("editor-panel-stats-runtime");

    var moduleId = state.activeModuleId || "header";
    var mod = getModuleConfig(data, moduleId);

    panel.appendChild(el("h3", { text: mod.label || moduleId }));

    panel.appendChild(field("Enabled", inputCheckbox(mod.enabled !== false, function (v) {
      mod.enabled = !!v;
      renderModulesList(data, state);
    })));

    // Order buttons (affects layout.modules ordering)
    panel.appendChild(buttonRow([
      el("button", { type: "button", class: "editor-btn", text: "Move Up" }),
      el("button", { type: "button", class: "editor-btn", text: "Move Down" })
    ]));

    panel.lastChild.children[0].addEventListener("click", function () {
      var mods = data.layout.modules;
      var idx = mods.findIndex(function (m) { return m && m.id === moduleId; });
      if (idx > 0) { moveItem(mods, idx, -1); renderModulesList(data, state); ON_EDITOR_DATA_CHANGED(); }
    });

    panel.lastChild.children[1].addEventListener("click", function () {
      var mods = data.layout.modules;
      var idx = mods.findIndex(function (m) { return m && m.id === moduleId; });
      if (idx >= 0) { moveItem(mods, idx, 1); renderModulesList(data, state); ON_EDITOR_DATA_CHANGED(); }
    });

    if (moduleId === "situation" && Array.isArray(mod.submodules)) {
      panel.appendChild(el("h4", { text: "Submodules" }));
      mod.submodules.forEach(function (sub) {
        panel.appendChild(field(sub.label || sub.id, inputCheckbox(sub.enabled !== false, function (v) {
          sub.enabled = !!v;
        })));
      });
    }

    // Module specific fields
    if (moduleId === "header") {
      var meta = ensureObj(data, "meta");
      var brand = ensureObj(data, "brand");
      panel.appendChild(field("Page Title", inputText(meta.pageTitle, function (v) { meta.pageTitle = v; })));
      panel.appendChild(field("Council Short Code", inputText(brand.shortCode, function (v) { brand.shortCode = v; }, "Example: FN")));
      panel.appendChild(field("Council Name", inputText(brand.councilName, function (v) { brand.councilName = v; })));
      panel.appendChild(field("Dashboard Title", inputText(brand.dashboardTitle, function (v) { brand.dashboardTitle = v; })));
      panel.appendChild(field("Contact Number", inputText(meta.contactNumber, function (v) { meta.contactNumber = v; }, "Example: 0800 920 029")));
      panel.appendChild(field("Emergency Number", inputText(meta.emergencyNumber, function (v) { meta.emergencyNumber = v; }, "Example: 111")));
      panel.appendChild(field("Last Updated Text", inputText(meta.lastUpdated, function (v) { meta.lastUpdated = v; }, "Example: 10 Feb 2026")));
    }

    if (moduleId === "hero") {
      var hero = ensureObj(data, "hero");
      panel.appendChild(field("Tagline Title", inputText(hero.taglineTitle, function (v) { hero.taglineTitle = v; })));
      panel.appendChild(field("Description", inputTextarea(hero.description, function (v) { hero.description = v; })));
      panel.appendChild(field("Status Pill", inputText(hero.statusPill, function (v) { hero.statusPill = v; })));
      panel.appendChild(field("Emergency Message", inputText(hero.emergencyMessage, function (v) { hero.emergencyMessage = v; })));
    }

    if (moduleId === "ctaRow") {
      panel.appendChild(renderArrayEditor({
        title: "Action Buttons",
        arr: Array.isArray(data.ctaButtons) ? data.ctaButtons : (data.ctaButtons = []),
        getSummary: function (item) { return (item && item.label) ? item.label : "(untitled)"; },
        addNewItem: function () { return { label: "New Button", url: "#", style: "secondary", external: false, icon: "âž¡ï¸", action: "" }; },
        renderItemFields: function (item) {
          var box = el("div");
          box.appendChild(field("Label", inputText(item.label, function (v) { item.label = v; })));
          box.appendChild(field("URL", inputText(item.url, function (v) { item.url = v; })));
          box.appendChild(field("Action", inputSelect(item.action || "", [
            { value: "", label: "Link Only" },
            { value: "notifications:enable", label: "Receive Notifications" }
          ], function (v) { item.action = v; })));
          box.appendChild(field("Style", inputSelect(item.style, [
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" }
          ], function (v) { item.style = v; })));
          box.appendChild(field("Icon", inputText(item.icon, function (v) { item.icon = v; }, "Emoji or text")));
          box.appendChild(field("Open In New Tab", inputCheckbox(item.external, function (v) { item.external = v; })));
          if (item.action && item.action.indexOf("notifications") === 0) {
            box.appendChild(el("p", { class: "editor-note", text: "Notification actions ignore URL and new tab. They prompt for browser notification permission." }));
          }
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.notifications = data.runtimeConfig.notifications || {};
      data.runtimeConfig.customMessages = data.runtimeConfig.customMessages || {};

      var notif = data.runtimeConfig.notifications;
      var cm = data.runtimeConfig.customMessages;

      if (typeof notif.enabled !== "boolean") notif.enabled = true;
      if (typeof notif.autoRefreshWarnings !== "boolean") notif.autoRefreshWarnings = true;
      if (!isFinite(Number(notif.pollIntervalMs))) notif.pollIntervalMs = 300000;
      if (!notif.notifySources || typeof notif.notifySources !== "object") {
        notif.notifySources = { metservice: true, civilDefence: true };
      }
      if (typeof notif.notifyUpcoming !== "boolean") notif.notifyUpcoming = false;
      if (typeof notif.notifyExpired !== "boolean") notif.notifyExpired = false;
      if (!isFinite(Number(notif.dedupeWindowHours))) notif.dedupeWindowHours = 12;
      if (typeof notif.useBrowserNotifications !== "boolean") notif.useBrowserNotifications = true;
      if (typeof notif.useToasts !== "boolean") notif.useToasts = true;
      if (!isFinite(Number(notif.toastDurationMs))) notif.toastDurationMs = 9000;
      if (typeof notif.debugLog !== "boolean") notif.debugLog = false;

      if (typeof cm.enabled !== "boolean") cm.enabled = true;
      if (typeof cm.url !== "string") cm.url = "./fned_custom_messages_example.json";
      if (!isFinite(Number(cm.pollIntervalMs))) cm.pollIntervalMs = 60000;
      if (typeof cm.renderInSummary !== "boolean") cm.renderInSummary = true;
      if (typeof cm.useBrowserNotifications !== "boolean") cm.useBrowserNotifications = true;
      if (typeof cm.useToasts !== "boolean") cm.useToasts = true;
      if (!isFinite(Number(cm.dedupeWindowHours))) cm.dedupeWindowHours = 12;
      if (typeof cm.debugLog !== "boolean") cm.debugLog = false;

      panel.appendChild(el("h4", { text: "Notification Settings" }));
      panel.appendChild(el("p", { class: "editor-note", text: "These settings control in-page toasts and browser notifications while the dashboard tab is open." }));

      var perm = "unknown";
      try {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.getPermission === "function") {
          perm = window.FNED_NOTIFICATIONS_API.getPermission();
        }
      } catch (e) {
        perm = "unknown";
      }
      panel.appendChild(el("p", { class: "editor-note", text: "Browser notification permission: " + perm }));

      // PWA status (useful for iPhone guidance)
      try {
        if (window.FNED_PWA_API && typeof window.FNED_PWA_API.getStatus === "function") {
          var st = window.FNED_PWA_API.getStatus();
          var installText = (st && st.isStandalone) ? "Installed (standalone)" : "Browser tab";
          var iosText = (st && st.isIOS) ? "iPhone or iPad" : "Not iPhone or iPad";
          panel.appendChild(el("p", { class: "editor-note", text: "PWA status: " + installText + " | " + iosText }));
        }
      } catch (eStatus) {
        // ignore
      }

      var notifBtns = buttonRow([
        el("button", { type: "button", class: "editor-btn", text: "Request Permission" }),
        el("button", { type: "button", class: "editor-btn", text: "Send Test Notification" }),
        el("button", { type: "button", class: "editor-btn", text: "Reload Custom Messages" }),
        el("button", { type: "button", class: "editor-btn", text: "Install Help" })
      ]);
      notifBtns.children[0].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.requestPermission === "function") {
          window.FNED_NOTIFICATIONS_API.requestPermission();
        }
      });
      notifBtns.children[1].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.test === "function") {
          window.FNED_NOTIFICATIONS_API.test();
        }
      });
      notifBtns.children[2].addEventListener("click", function () {
        if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.reloadCustomMessages === "function") {
          window.FNED_NOTIFICATIONS_API.reloadCustomMessages();
        }
      });

      notifBtns.children[3].addEventListener("click", function () {
        if (window.FNED_PWA_API && typeof window.FNED_PWA_API.showInstallHelp === "function") {
          window.FNED_PWA_API.showInstallHelp();
        } else if (window.FNED_NOTIFICATIONS_API && typeof window.FNED_NOTIFICATIONS_API.toast === "function") {
          window.FNED_NOTIFICATIONS_API.toast({
            title: "Install Help",
            body: "On iPhone, open in Safari then Add to Home Screen.",
            meta: "FNED",
            level: "Info"
          });
        }
      });
      panel.appendChild(notifBtns);

      panel.appendChild(el("h5", { text: "Warnings Notifications" }));
      panel.appendChild(field("Enabled", inputCheckbox(!!notif.enabled, function (v) { notif.enabled = !!v; })));
      panel.appendChild(field("Auto Refresh Warnings", inputCheckbox(!!notif.autoRefreshWarnings, function (v) { notif.autoRefreshWarnings = !!v; })));
      panel.appendChild(field("Poll Interval (ms)", inputText(String(notif.pollIntervalMs || 300000), function (v) {
        var n = parseInt(v, 10);
        if (!isNaN(n)) notif.pollIntervalMs = n;
      })));
      panel.appendChild(field("Notify MetService", inputCheckbox(notif.notifySources.metservice !== false, function (v) {
        notif.notifySources.metservice = !!v;
      })));
      panel.appendChild(field("Notify Civil Defence", inputCheckbox(notif.notifySources.civilDefence !== false, function (v) {
        notif.notifySources.civilDefence = !!v;
      })));
      panel.appendChild(field("Notify Upcoming Alerts", inputCheckbox(!!notif.notifyUpcoming, function (v) { notif.notifyUpcoming = !!v; })));
      panel.appendChild(field("Notify Expired Alerts", inputCheckbox(!!notif.notifyExpired, function (v) { notif.notifyExpired = !!v; })));
      panel.appendChild(field("Dedupe Window (hours)", inputText(String(notif.dedupeWindowHours || 12), function (v) {
        var n = parseInt(v, 10);
        if (!isNaN(n)) notif.dedupeWindowHours = n;
      })));
      panel.appendChild(field("Use Browser Notifications", inputCheckbox(!!notif.useBrowserNotifications, function (v) { notif.useBrowserNotifications = !!v; })));
      panel.appendChild(field("Use Toasts", inputCheckbox(!!notif.useToasts, function (v) { notif.useToasts = !!v; })));
      panel.appendChild(field("Toast Duration (ms)", inputText(String(notif.toastDurationMs || 9000), function (v) {
        var n = parseInt(v, 10);
        if (!isNaN(n)) notif.toastDurationMs = n;
      })));
      panel.appendChild(field("Debug Log", inputCheckbox(!!notif.debugLog, function (v) { notif.debugLog = !!v; })));

      panel.appendChild(el("h5", { text: "Custom Messages" }));
      panel.appendChild(field("Enabled", inputCheckbox(!!cm.enabled, function (v) { cm.enabled = !!v; })));
      panel.appendChild(field("Messages JSON URL", inputText(cm.url || "", function (v) { cm.url = v; })));
      panel.appendChild(field("Poll Interval (ms)", inputText(String(cm.pollIntervalMs || 60000), function (v) {
        var n = parseInt(v, 10);
        if (!isNaN(n)) cm.pollIntervalMs = n;
      })));
      panel.appendChild(field("Render In Summary", inputCheckbox(cm.renderInSummary !== false, function (v) { cm.renderInSummary = !!v; })));
      panel.appendChild(field("Use Browser Notifications", inputCheckbox(!!cm.useBrowserNotifications, function (v) { cm.useBrowserNotifications = !!v; })));
      panel.appendChild(field("Use Toasts", inputCheckbox(!!cm.useToasts, function (v) { cm.useToasts = !!v; })));
      panel.appendChild(field("Dedupe Window (hours)", inputText(String(cm.dedupeWindowHours || 12), function (v) {
        var n = parseInt(v, 10);
        if (!isNaN(n)) cm.dedupeWindowHours = n;
      })));
      panel.appendChild(field("Debug Log", inputCheckbox(!!cm.debugLog, function (v) { cm.debugLog = !!v; })));
    }

    if (moduleId === "situation") {
      var mapPanel = ensureObj(data, "mapPanel");
      var alertsPanel = ensureObj(data, "alertsPanel");
      var situationPage = (state.situationPage === "overview" || state.situationPage === "alerts" || state.situationPage === "diagnostics") ? state.situationPage : "map";
      var pageNav = el("div", { class: "editor-subpage-nav", role: "tablist", "aria-label": "Situation editor pages" });

      function pageBtn(pageId, label) {
        var isActive = situationPage === pageId;
        var btn = el("button", {
          type: "button",
          class: "editor-subpage-btn" + (isActive ? " is-active" : ""),
          text: label,
          role: "tab",
          "aria-selected": isActive ? "true" : "false"
        });
        btn.addEventListener("click", function () {
          state.situationPage = pageId;
          renderModulePanel(data, state);
        });
        return btn;
      }

      pageNav.appendChild(pageBtn("overview", "Overview"));
      pageNav.appendChild(pageBtn("map", "Map Page"));
      pageNav.appendChild(pageBtn("alerts", "Alerts Page"));
      pageNav.appendChild(pageBtn("diagnostics", "Diagnostics"));
      panel.appendChild(pageNav);

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.map = data.runtimeConfig.map || {};
      data.runtimeConfig.regionWarnings = data.runtimeConfig.regionWarnings || {};
      if (!Array.isArray(data.runtimeConfig.map.powerOutageStatusFilter)) {
        data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
      }
      if (!Array.isArray(data.runtimeConfig.map.waterOutageStatusFilter)) {
        data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored"];
      }
      if (!isFinite(Number(data.runtimeConfig.map.symbolSize))) {
        data.runtimeConfig.map.symbolSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.symbolFontSize))) {
        data.runtimeConfig.map.symbolFontSize = 22;
      }
      if (!isFinite(Number(data.runtimeConfig.map.symbolBorderWidth))) {
        data.runtimeConfig.map.symbolBorderWidth = 2;
      }
      if (!isFinite(Number(data.runtimeConfig.map.clusterSymbolSize))) {
        data.runtimeConfig.map.clusterSymbolSize = 44;
      }
      if (!isFinite(Number(data.runtimeConfig.map.clusterSymbolFontSize))) {
        data.runtimeConfig.map.clusterSymbolFontSize = 22;
      }
      if (typeof data.runtimeConfig.map.collisionAvoidanceEnabled !== "boolean") {
        data.runtimeConfig.map.collisionAvoidanceEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.collisionBufferPx))) {
        data.runtimeConfig.map.collisionBufferPx = 6;
      }
      if (typeof data.runtimeConfig.map.baseStyle !== "string" || !data.runtimeConfig.map.baseStyle.trim()) {
        data.runtimeConfig.map.baseStyle = "standard";
      }
      if (typeof data.runtimeConfig.map.legendPosition !== "string" || !data.runtimeConfig.map.legendPosition.trim()) {
        data.runtimeConfig.map.legendPosition = "bottomleft";
      }
      if (typeof data.runtimeConfig.map.maraeClusterEnabled !== "boolean") {
        data.runtimeConfig.map.maraeClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.maraeClusterBaseRadiusMeters = 2200;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.maraeClusterMaxRadiusMeters = 60000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterBaseZoom))) {
        data.runtimeConfig.map.maraeClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 1.7;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterViewportWidthFactor))) {
        data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0.12;
      }
      if (!isFinite(Number(data.runtimeConfig.map.maraeClusterMinCount))) {
        data.runtimeConfig.map.maraeClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.powerClusterEnabled !== "boolean") {
        data.runtimeConfig.map.powerClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.powerClusterBaseRadiusMeters = 420;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.powerClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterBaseZoom))) {
        data.runtimeConfig.map.powerClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.powerClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterViewportWidthFactor))) {
        data.runtimeConfig.map.powerClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.powerClusterMinCount))) {
        data.runtimeConfig.map.powerClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.waterClusterEnabled !== "boolean") {
        data.runtimeConfig.map.waterClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.waterClusterBaseRadiusMeters = 420;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.waterClusterMaxRadiusMeters = 18000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterBaseZoom))) {
        data.runtimeConfig.map.waterClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.waterClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterViewportWidthFactor))) {
        data.runtimeConfig.map.waterClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.waterClusterMinCount))) {
        data.runtimeConfig.map.waterClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.nztaClusterEnabled !== "boolean") {
        data.runtimeConfig.map.nztaClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.nztaClusterBaseRadiusMeters = 450;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.nztaClusterMaxRadiusMeters = 22000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterBaseZoom))) {
        data.runtimeConfig.map.nztaClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterViewportWidthFactor))) {
        data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0.09;
      }
      if (!isFinite(Number(data.runtimeConfig.map.nztaClusterMinCount))) {
        data.runtimeConfig.map.nztaClusterMinCount = 2;
      }
      if (typeof data.runtimeConfig.map.localRoadClusterEnabled !== "boolean") {
        data.runtimeConfig.map.localRoadClusterEnabled = true;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterBaseRadiusMeters))) {
        data.runtimeConfig.map.localRoadClusterBaseRadiusMeters = 400;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterMaxRadiusMeters))) {
        data.runtimeConfig.map.localRoadClusterMaxRadiusMeters = 20000;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterBaseZoom))) {
        data.runtimeConfig.map.localRoadClusterBaseZoom = 8;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterZoomStepMultiplier))) {
        data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 1.55;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterViewportWidthFactor))) {
        data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0.08;
      }
      if (!isFinite(Number(data.runtimeConfig.map.localRoadClusterMinCount))) {
        data.runtimeConfig.map.localRoadClusterMinCount = 2;
      }
      state.situationDiagnostics = state.situationDiagnostics || { pageLayouts: {} };
      function safeText(value, maxLen) {
        var text = String(value || "").replace(/\s+/g, " ").trim();
        if (!maxLen || text.length <= maxLen) return text;
        return text.slice(0, Math.max(0, maxLen - 1)) + "â€¦";
      }
      function getElementDescriptor(elm) {
        if (!elm) return "";
        var tag = String(elm.tagName || "").toLowerCase();
        var id = elm.id ? ("#" + elm.id) : "";
        var className = String(elm.className || "").trim();
        var classToken = className ? ("." + className.split(/\s+/).slice(0, 3).join(".")) : "";
        return (tag || "node") + id + classToken;
      }
      function captureViewportDiagnosticsPayload() {
        var docEl = document.documentElement || document.body;
        var bodyEl = document.body || docEl;
        var scrollX = typeof window.scrollX === "number" ? window.scrollX : (window.pageXOffset || 0);
        var scrollY = typeof window.scrollY === "number" ? window.scrollY : (window.pageYOffset || 0);
        var maxElements = 3500;
        var allElements = Array.prototype.slice.call(document.querySelectorAll("*"));
        var clipped = allElements.length > maxElements;
        var sample = clipped ? allElements.slice(0, maxElements) : allElements;
        var viewport = {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
          devicePixelRatio: window.devicePixelRatio || 1,
          scrollX: scrollX,
          scrollY: scrollY,
          pageWidth: Math.max(
            docEl ? (docEl.scrollWidth || 0) : 0,
            bodyEl ? (bodyEl.scrollWidth || 0) : 0
          ),
          pageHeight: Math.max(
            docEl ? (docEl.scrollHeight || 0) : 0,
            bodyEl ? (bodyEl.scrollHeight || 0) : 0
          )
        };
        var elements = sample.map(function (elm, idx) {
          var rect = elm.getBoundingClientRect();
          var style = window.getComputedStyle(elm);
          var role = elm.getAttribute("role") || "";
          var ariaLabel = elm.getAttribute("aria-label") || "";
          var name = elm.getAttribute("name") || "";
          var labelText = "";
          if (elm.id) {
            var labelNode = document.querySelector('label[for="' + elm.id + '"]');
            if (labelNode) labelText = safeText(labelNode.textContent || "", 140);
          }
          return {
            index: idx + 1,
            descriptor: getElementDescriptor(elm),
            tag: String(elm.tagName || "").toLowerCase(),
            id: elm.id || "",
            classes: String(elm.className || "").trim(),
            role: role,
            name: name,
            ariaLabel: ariaLabel,
            labelText: labelText,
            textSample: safeText(elm.textContent || "", 180),
            childCount: elm.children ? elm.children.length : 0,
            rect: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              pageX: Math.round(rect.left + scrollX),
              pageY: Math.round(rect.top + scrollY)
            },
            style: {
              display: style.display,
              position: style.position,
              zIndex: style.zIndex,
              visibility: style.visibility,
              opacity: style.opacity,
              pointerEvents: style.pointerEvents,
              color: style.color,
              backgroundColor: style.backgroundColor,
              border: style.border,
              borderRadius: style.borderRadius,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight
            },
            form: (function () {
              if (!/^(INPUT|TEXTAREA|SELECT)$/.test(elm.tagName || "")) return null;
              return {
                type: elm.type || "",
                value: elm.type === "password" ? "[redacted]" : safeText(elm.value, 200),
                checked: typeof elm.checked === "boolean" ? elm.checked : null,
                disabled: !!elm.disabled,
                placeholder: elm.placeholder || ""
              };
            })()
          };
        });
        return {
          generatedAt: new Date().toISOString(),
          url: String(location.href || ""),
          title: String(document.title || ""),
          viewport: viewport,
          editorState: {
            activeModuleId: state.activeModuleId,
            situationPage: state.situationPage,
            statsPage: state.statsPage,
            focusMode: !!state.focusMode
          },
          sourceDataSnapshot: {
            runtimeConfig: JSON.parse(JSON.stringify(data.runtimeConfig || {})),
            summarySection: JSON.parse(JSON.stringify(data.summarySection || {})),
            statsSection: JSON.parse(JSON.stringify(data.statsSection || {}))
          },
          elementCapture: {
            capturedCount: elements.length,
            totalInDom: allElements.length,
            clipped: clipped,
            clipLimit: maxElements
          },
          elements: elements
        };
      }
      function captureModalDiagnosticsPayload() {
        var drawer = document.querySelector(".editor-drawer");
        var body = document.querySelector(".editor-body");
        var left = document.querySelector(".editor-left");
        var right = document.querySelector(".editor-right");
        var panelNode = document.getElementById("editor-panel");
        var scrollX = typeof window.scrollX === "number" ? window.scrollX : (window.pageXOffset || 0);
        var scrollY = typeof window.scrollY === "number" ? window.scrollY : (window.pageYOffset || 0);
        var fieldNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll(".editor-field")) : [];
        var sectionNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll("h3, h4, .editor-section-block")) : [];
        var controlNodes = panelNode ? Array.prototype.slice.call(panelNode.querySelectorAll("input, textarea, select, button")) : [];

        function rectPayload(node) {
          if (!node) return null;
          var rect = node.getBoundingClientRect();
          return {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            pageX: Math.round(rect.left + scrollX),
            pageY: Math.round(rect.top + scrollY)
          };
        }

        function scrollPayload(node) {
          if (!node) return null;
          return {
            scrollTop: Math.round(node.scrollTop || 0),
            scrollLeft: Math.round(node.scrollLeft || 0),
            scrollHeight: Math.round(node.scrollHeight || 0),
            scrollWidth: Math.round(node.scrollWidth || 0),
            clientHeight: Math.round(node.clientHeight || 0),
            clientWidth: Math.round(node.clientWidth || 0)
          };
        }

        var fields = fieldNodes.map(function (fieldEl, idx) {
          var labelEl = fieldEl.querySelector("label");
          var inputEl = fieldEl.querySelector("input, textarea, select");
          return {
            index: idx + 1,
            label: labelEl ? safeText(labelEl.textContent || "", 200) : "(unlabeled)",
            fieldRect: rectPayload(fieldEl),
            inputRect: rectPayload(inputEl),
            inputType: inputEl ? (inputEl.type || String(inputEl.tagName || "").toLowerCase()) : "",
            valueSample: inputEl ? safeText((inputEl.type === "password" ? "[redacted]" : (inputEl.value || "")), 200) : ""
          };
        });

        var controls = controlNodes.map(function (node, idx) {
          var typeName = String(node.tagName || "").toLowerCase();
          return {
            index: idx + 1,
            tag: typeName,
            type: node.type || "",
            id: node.id || "",
            name: node.name || "",
            text: safeText(node.textContent || "", 140),
            ariaLabel: node.getAttribute ? (node.getAttribute("aria-label") || "") : "",
            checked: typeof node.checked === "boolean" ? node.checked : null,
            disabled: !!node.disabled,
            rect: rectPayload(node)
          };
        });

        return {
          generatedAt: new Date().toISOString(),
          activeModuleId: state.activeModuleId || "",
          situationPage: state.situationPage || "",
          statsPage: state.statsPage || "",
          captureModeEnabled: document.body.classList.contains("editor-capture-mode"),
          viewport: {
            width: window.innerWidth || 0,
            height: window.innerHeight || 0,
            scrollX: scrollX,
            scrollY: scrollY
          },
          containers: {
            drawer: {
              rect: rectPayload(drawer),
              scroll: scrollPayload(drawer)
            },
            editorBody: {
              rect: rectPayload(body),
              scroll: scrollPayload(body)
            },
            editorLeft: {
              rect: rectPayload(left),
              scroll: scrollPayload(left)
            },
            editorRight: {
              rect: rectPayload(right),
              scroll: scrollPayload(right)
            },
            editorPanel: {
              rect: rectPayload(panelNode),
              scroll: scrollPayload(panelNode)
            }
          },
          stats: {
            sectionCount: sectionNodes.length,
            fieldCount: fields.length,
            controlCount: controls.length
          },
          sections: sectionNodes.map(function (node, idx) {
            return {
              index: idx + 1,
              descriptor: getElementDescriptor(node),
              text: safeText(node.textContent || "", 180),
              rect: rectPayload(node)
            };
          }),
          fields: fields,
          controls: controls
        };
      }
      function captureSituationPageLayout(pageId) {
        var panelRect = panel.getBoundingClientRect();
        var fieldCoords = Array.prototype.map.call(panel.querySelectorAll(".editor-field"), function (fieldEl, idx) {
          var labelEl = fieldEl.querySelector("label");
          var inputEl = fieldEl.querySelector("input,textarea,select");
          var rect = fieldEl.getBoundingClientRect();
          var inputRect = inputEl ? inputEl.getBoundingClientRect() : rect;
          return {
            index: idx + 1,
            label: labelEl ? String(labelEl.textContent || "").trim() : "(unlabeled)",
            x: Math.round(rect.left - panelRect.left),
            y: Math.round(rect.top - panelRect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            inputX: Math.round(inputRect.left - panelRect.left),
            inputY: Math.round(inputRect.top - panelRect.top),
            inputWidth: Math.round(inputRect.width),
            inputHeight: Math.round(inputRect.height)
          };
        });
        state.situationDiagnostics.pageLayouts[pageId] = {
          capturedAt: new Date().toISOString(),
          panelWidth: Math.round(panelRect.width),
          panelHeight: Math.round(panelRect.height),
          fieldCount: fieldCoords.length,
          fields: fieldCoords
        };
      }
      function buildSituationDiagnosticsPayload() {
        function cloneJson(value) {
          try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
        }
        var pageIds = ["overview", "map", "alerts", "diagnostics"];
        var layouts = cloneJson(state.situationDiagnostics.pageLayouts || {}) || {};
        pageIds.forEach(function (id) {
          if (!layouts[id]) {
            layouts[id] = {
              capturedAt: null,
              fieldCount: 0,
              fields: [],
              status: "not_captured_yet_open_page_to_capture"
            };
          }
        });
        return {
          generatedAt: new Date().toISOString(),
          activePage: situationPage,
          pages: pageIds,
          configSnapshot: {
            mapPanel: cloneJson(mapPanel),
            alertsPanel: cloneJson(alertsPanel),
            runtimeMap: cloneJson(data.runtimeConfig.map),
            runtimeRegionWarnings: cloneJson(data.runtimeConfig.regionWarnings)
          },
          layoutCoordinates: layouts
        };
      }
      if (situationPage === "overview") {
        panel.appendChild(el("h4", { text: "Situation Parent Page" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Use child pages for focused editing. Map Page contains map content and overlay settings. Alerts Page contains alert text and warning runtime settings."
        }));
        panel.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Open Map Page" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Alerts Page" })
        ]));
        panel.lastChild.children[0].addEventListener("click", function () {
          state.situationPage = "map";
          renderModulePanel(data, state);
        });
        panel.lastChild.children[1].addEventListener("click", function () {
          state.situationPage = "alerts";
          renderModulePanel(data, state);
        });
        captureSituationPageLayout("overview");
      } else if (situationPage === "map") {
        function parseCsvList(value) {
          return String(value || "")
            .split(",")
            .map(function (part) { return part.trim(); })
            .filter(Boolean);
        }
        function hasFilterValue(arr, value) {
          return Array.isArray(arr) && arr.indexOf(value) !== -1;
        }
        function toggleFilterValue(arr, value, enabled) {
          var next = Array.isArray(arr) ? arr.slice() : [];
          var idx = next.indexOf(value);
          if (enabled && idx === -1) next.push(value);
          if (!enabled && idx !== -1) next.splice(idx, 1);
          return next;
        }

        panel.appendChild(el("h4", { text: "Map Content" }));
        panel.appendChild(field("Map Title", inputText(mapPanel.title, function (v) { mapPanel.title = v; })));
        panel.appendChild(field("Map Subtitle", inputText(mapPanel.subtitle, function (v) { mapPanel.subtitle = v; })));
        panel.appendChild(field("Map Placeholder Text", inputText(mapPanel.placeholderText, function (v) { mapPanel.placeholderText = v; })));

        panel.appendChild(el("h4", { text: "Map Runtime Settings" }));
        panel.appendChild(field("Layers Control Collapsed", inputCheckbox(data.runtimeConfig.map.layersControlCollapsed !== false, function (v) {
          data.runtimeConfig.map.layersControlCollapsed = !!v;
        })));
        panel.appendChild(field("Map Base Style", inputSelect(
          data.runtimeConfig.map.baseStyle || "standard",
          [
            { value: "standard", label: "Standard (Current Tile Layer)" },
            { value: "hybrid", label: "Hybrid (Imagery + Transport + Labels)" }
          ],
          function (v) {
            data.runtimeConfig.map.baseStyle = String(v || "standard");
          }
        )));
        panel.appendChild(field("Legend Position", inputSelect(
          data.runtimeConfig.map.legendPosition || "bottomleft",
          [
            { value: "bottomleft", label: "Bottom Left (Overlay)" },
            { value: "bottomright", label: "Bottom Right (Overlay)" },
            { value: "topright", label: "Top Right (Overlay)" },
            { value: "topleft", label: "Top Left (Overlay)" },
            { value: "below", label: "Below Map (Wide)" }
          ],
          function (v) {
            data.runtimeConfig.map.legendPosition = String(v || "bottomleft");
          }
        )));
        var mapIconSizingBlock = el("section", { class: "editor-section-block" });
        mapIconSizingBlock.appendChild(el("h4", { text: "Map Symbol Sizing" }));
        mapIconSizingBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Controls circle and glyph size for all map symbol markers."
        }));
        mapIconSizingBlock.appendChild(field("Symbol Circle Size (px)", inputText(
          String(data.runtimeConfig.map.symbolSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolSize = n;
          },
          "e.g. 44"
        )));
        mapIconSizingBlock.appendChild(field("Symbol Font Size (px)", inputText(
          String(data.runtimeConfig.map.symbolFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolFontSize = n;
          },
          "e.g. 22"
        )));
        mapIconSizingBlock.appendChild(field("Symbol Border Width (px)", inputText(
          String(data.runtimeConfig.map.symbolBorderWidth || 2),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.symbolBorderWidth = n;
          },
          "e.g. 2"
        )));
        mapIconSizingBlock.appendChild(field("Cluster Circle Size (px)", inputText(
          String(data.runtimeConfig.map.clusterSymbolSize || 44),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.clusterSymbolSize = n;
          },
          "e.g. 44"
        )));
        mapIconSizingBlock.appendChild(field("Cluster Font Size (px)", inputText(
          String(data.runtimeConfig.map.clusterSymbolFontSize || 22),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.clusterSymbolFontSize = n;
          },
          "e.g. 22"
        )));
        mapIconSizingBlock.appendChild(field("Collision Avoidance (Different Types)", inputCheckbox(
          data.runtimeConfig.map.collisionAvoidanceEnabled !== false,
          function (v) { data.runtimeConfig.map.collisionAvoidanceEnabled = !!v; }
        )));
        mapIconSizingBlock.appendChild(field("Collision Buffer (px)", inputText(
          String(data.runtimeConfig.map.collisionBufferPx || 6),
          function (v) {
            var n = Number(v);
            if (isFinite(n)) data.runtimeConfig.map.collisionBufferPx = n;
          },
          "e.g. 6"
        )));
        panel.appendChild(mapIconSizingBlock);

        function renderMapClusterSettingsBlock(defn) {
          var block = el("section", { class: "editor-section-block" });
          block.appendChild(el("h4", { text: defn.title }));
          block.appendChild(el("p", {
            class: "editor-note",
            text: "Zoom-responsive clustering settings for this layer."
          }));
          block.appendChild(field("Enable", inputCheckbox(
            data.runtimeConfig.map[defn.key + "Enabled"] !== false,
            function (v) { data.runtimeConfig.map[defn.key + "Enabled"] = !!v; }
          )));
          block.appendChild(field("Base Radius (meters)", inputText(
            String(data.runtimeConfig.map[defn.key + "BaseRadiusMeters"] || defn.baseRadius),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "BaseRadiusMeters"] = n;
            },
            "e.g. " + String(defn.baseRadius)
          )));
          block.appendChild(field("Max Radius (meters)", inputText(
            String(data.runtimeConfig.map[defn.key + "MaxRadiusMeters"] || defn.maxRadius),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "MaxRadiusMeters"] = n;
            },
            "e.g. " + String(defn.maxRadius)
          )));
          block.appendChild(field("Base Zoom", inputText(
            String(data.runtimeConfig.map[defn.key + "BaseZoom"] || defn.baseZoom),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "BaseZoom"] = n;
            },
            "e.g. " + String(defn.baseZoom)
          )));
          block.appendChild(field("Zoom Step Multiplier", inputText(
            String(data.runtimeConfig.map[defn.key + "ZoomStepMultiplier"] || defn.multiplier),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "ZoomStepMultiplier"] = n;
            },
            "e.g. " + String(defn.multiplier)
          )));
          block.appendChild(field("Viewport Width Factor", inputText(
            String(data.runtimeConfig.map[defn.key + "ViewportWidthFactor"] || defn.viewportFactor),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "ViewportWidthFactor"] = n;
            },
            "e.g. " + String(defn.viewportFactor)
          )));
          block.appendChild(field("Minimum Count", inputText(
            String(data.runtimeConfig.map[defn.key + "MinCount"] || defn.minCount),
            function (v) {
              var n = Number(v);
              if (isFinite(n)) data.runtimeConfig.map[defn.key + "MinCount"] = n;
            },
            "e.g. " + String(defn.minCount)
          )));
          return block;
        }

        [
          { title: "Marae Clustering", key: "maraeCluster", baseRadius: 2200, maxRadius: 60000, baseZoom: 8, multiplier: 1.7, viewportFactor: 0.12, minCount: 2 },
          { title: "Power Outages Clustering", key: "powerCluster", baseRadius: 420, maxRadius: 18000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "Water Outages Clustering", key: "waterCluster", baseRadius: 420, maxRadius: 18000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 },
          { title: "NZTA Clustering", key: "nztaCluster", baseRadius: 450, maxRadius: 22000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.09, minCount: 2 },
          { title: "Local Road Clustering", key: "localRoadCluster", baseRadius: 400, maxRadius: 20000, baseZoom: 8, multiplier: 1.55, viewportFactor: 0.08, minCount: 2 }
        ].forEach(function (defn) {
          panel.appendChild(renderMapClusterSettingsBlock(defn));
        });

        var mapLayerFiltersBlock = el("section", { class: "editor-section-block" });
        mapLayerFiltersBlock.appendChild(el("h4", { text: "Map Layer Filters" }));
        mapLayerFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "These filters control map markers only (Power Outages and Water Outages layers)."
        }));

        var mapPowerStatusDetails = el("details", { class: "editor-array-block" });
        mapPowerStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Power Outage Map Statuses (" + String((data.runtimeConfig.map.powerOutageStatusFilter || []).length) + " selected)"
        }));
        ["unplanned", "plannedActive", "planned"].forEach(function (statusType) {
          mapPowerStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(data.runtimeConfig.map.powerOutageStatusFilter, statusType),
            function (v) {
              data.runtimeConfig.map.powerOutageStatusFilter = toggleFilterValue(
                data.runtimeConfig.map.powerOutageStatusFilter,
                statusType,
                !!v
              );
            }
          )));
        });
        mapPowerStatusDetails.appendChild(field("Power Map Status CSV (Advanced)", inputText(
          (data.runtimeConfig.map.powerOutageStatusFilter || []).join(", "),
          function (v) { data.runtimeConfig.map.powerOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        mapLayerFiltersBlock.appendChild(mapPowerStatusDetails);

        var mapWaterStatusDetails = el("details", { class: "editor-array-block" });
        mapWaterStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Map Statuses (" + String((data.runtimeConfig.map.waterOutageStatusFilter || []).length) + " selected)"
        }));
        ["New", "Reported", "Under repairs", "Planned", "Restored", "Current", "Unplanned", "Resolved"].forEach(function (statusType) {
          mapWaterStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(data.runtimeConfig.map.waterOutageStatusFilter, statusType),
            function (v) {
              data.runtimeConfig.map.waterOutageStatusFilter = toggleFilterValue(
                data.runtimeConfig.map.waterOutageStatusFilter,
                statusType,
                !!v
              );
            }
          )));
        });
        mapWaterStatusDetails.appendChild(field("Water Map Status CSV (Advanced)", inputText(
          (data.runtimeConfig.map.waterOutageStatusFilter || []).join(", "),
          function (v) { data.runtimeConfig.map.waterOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        mapLayerFiltersBlock.appendChild(mapWaterStatusDetails);

        var mapFilterActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Map Filters: Defaults" }),
          el("button", { type: "button", class: "editor-btn", text: "Map Filters: Show All" })
        ]);
        mapFilterActions.children[0].addEventListener("click", function () {
          data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored"];
          data.runtimeConfig.map.symbolSize = 44;
          data.runtimeConfig.map.symbolFontSize = 22;
          data.runtimeConfig.map.symbolBorderWidth = 2;
          data.runtimeConfig.map.clusterSymbolSize = 44;
          data.runtimeConfig.map.clusterSymbolFontSize = 22;
          data.runtimeConfig.map.collisionAvoidanceEnabled = true;
          data.runtimeConfig.map.collisionBufferPx = 6;
          data.runtimeConfig.map.baseStyle = "standard";
          data.runtimeConfig.map.legendPosition = "bottomleft";
          data.runtimeConfig.map.maraeClusterEnabled = true;
          data.runtimeConfig.map.maraeClusterBaseRadiusMeters = 2200;
          data.runtimeConfig.map.maraeClusterMaxRadiusMeters = 60000;
          data.runtimeConfig.map.maraeClusterBaseZoom = 8;
          data.runtimeConfig.map.maraeClusterZoomStepMultiplier = 1.7;
          data.runtimeConfig.map.maraeClusterViewportWidthFactor = 0.12;
          data.runtimeConfig.map.maraeClusterMinCount = 2;
          data.runtimeConfig.map.powerClusterEnabled = true;
          data.runtimeConfig.map.powerClusterBaseRadiusMeters = 420;
          data.runtimeConfig.map.powerClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.powerClusterBaseZoom = 8;
          data.runtimeConfig.map.powerClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.powerClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.powerClusterMinCount = 2;
          data.runtimeConfig.map.waterClusterEnabled = true;
          data.runtimeConfig.map.waterClusterBaseRadiusMeters = 420;
          data.runtimeConfig.map.waterClusterMaxRadiusMeters = 18000;
          data.runtimeConfig.map.waterClusterBaseZoom = 8;
          data.runtimeConfig.map.waterClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.waterClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.waterClusterMinCount = 2;
          data.runtimeConfig.map.nztaClusterEnabled = true;
          data.runtimeConfig.map.nztaClusterBaseRadiusMeters = 450;
          data.runtimeConfig.map.nztaClusterMaxRadiusMeters = 22000;
          data.runtimeConfig.map.nztaClusterBaseZoom = 8;
          data.runtimeConfig.map.nztaClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.nztaClusterViewportWidthFactor = 0.09;
          data.runtimeConfig.map.nztaClusterMinCount = 2;
          data.runtimeConfig.map.localRoadClusterEnabled = true;
          data.runtimeConfig.map.localRoadClusterBaseRadiusMeters = 400;
          data.runtimeConfig.map.localRoadClusterMaxRadiusMeters = 20000;
          data.runtimeConfig.map.localRoadClusterBaseZoom = 8;
          data.runtimeConfig.map.localRoadClusterZoomStepMultiplier = 1.55;
          data.runtimeConfig.map.localRoadClusterViewportWidthFactor = 0.08;
          data.runtimeConfig.map.localRoadClusterMinCount = 2;
          renderModulePanel(data, state);
        });
        mapFilterActions.children[1].addEventListener("click", function () {
          data.runtimeConfig.map.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          data.runtimeConfig.map.waterOutageStatusFilter = ["New", "Reported", "Under repairs", "Planned", "Restored", "Current", "Unplanned", "Resolved"];
          renderModulePanel(data, state);
        });
        mapLayerFiltersBlock.appendChild(mapFilterActions);
        panel.appendChild(mapLayerFiltersBlock);

        panel.appendChild(el("h4", { text: "Enabled Overlays" }));
        panel.appendChild(renderOverlayPicker(data.runtimeConfig.map, function () {
          renderModulePanel(data, state);
        }));
        captureSituationPageLayout("map");
      } else if (situationPage === "diagnostics") {
        var diagnosticsBlock = el("section", { class: "editor-section-block" });
        var diagnosticsPayload = buildSituationDiagnosticsPayload();
        var viewportPayload = captureViewportDiagnosticsPayload();
        diagnosticsBlock.appendChild(el("h4", { text: "Situation Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Contains page config snapshots and captured field coordinates for each visited sub-page."
        }));
        diagnosticsBlock.appendChild(field("Diagnostics JSON", inputTextarea(
          JSON.stringify(diagnosticsPayload, null, 2),
          function () {},
          ""
        )));
        var diagTextarea = diagnosticsBlock.querySelector("textarea");
        if (diagTextarea) {
          diagTextarea.readOnly = true;
          diagTextarea.style.minHeight = "360px";
        }
        diagnosticsBlock.appendChild(el("h4", { text: "Full Page Viewport Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Captures element names, coordinates, style summary, form values, and viewport metadata for complete screen diagnostics."
        }));
        diagnosticsBlock.appendChild(field("Viewport JSON", inputTextarea(
          JSON.stringify(viewportPayload, null, 2),
          function () {},
          ""
        )));
        var viewportTextarea = diagnosticsBlock.querySelectorAll("textarea");
        var viewportTextareaNode = viewportTextarea && viewportTextarea.length ? viewportTextarea[viewportTextarea.length - 1] : null;
        if (viewportTextareaNode) {
          viewportTextareaNode.readOnly = true;
          viewportTextareaNode.style.minHeight = "420px";
        }
        diagnosticsBlock.appendChild(el("h4", { text: "Editor Modal Diagnostics JSON" }));
        diagnosticsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Captures full editor-modal structure, visible controls, coordinates, and scroll metrics so POV review can evaluate content outside the current viewport."
        }));
        diagnosticsBlock.appendChild(field("Modal JSON", inputTextarea(
          JSON.stringify(captureModalDiagnosticsPayload(), null, 2),
          function () {},
          ""
        )));
        var modalTextareaList = diagnosticsBlock.querySelectorAll("textarea");
        var modalTextareaNode = modalTextareaList && modalTextareaList.length ? modalTextareaList[modalTextareaList.length - 1] : null;
        if (modalTextareaNode) {
          modalTextareaNode.readOnly = true;
          modalTextareaNode.style.minHeight = "420px";
        }
        diagnosticsBlock.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Refresh Diagnostics" }),
          el("button", { type: "button", class: "editor-btn", text: "Download Viewport JSON" }),
          el("button", { type: "button", class: "editor-btn", text: "Download Modal JSON" })
        ]));
        diagnosticsBlock.lastChild.children[0].addEventListener("click", function () {
          renderModulePanel(data, state);
        });
        diagnosticsBlock.lastChild.children[1].addEventListener("click", function () {
          var stamp = new Date().toISOString().replace(/[:.]/g, "-");
          downloadText("fned_viewport_diagnostics_" + stamp + ".json", JSON.stringify(captureViewportDiagnosticsPayload(), null, 2), "application/json");
        });
        diagnosticsBlock.lastChild.children[2].addEventListener("click", function () {
          var stamp = new Date().toISOString().replace(/[:.]/g, "-");
          downloadText("fned_modal_diagnostics_" + stamp + ".json", JSON.stringify(captureModalDiagnosticsPayload(), null, 2), "application/json");
        });
        panel.appendChild(diagnosticsBlock);
        captureSituationPageLayout("diagnostics");
      } else {
        panel.classList.add("editor-panel-alerts-page");
        var rwasDefaults = window.FNED_RWAS_DEFAULTS || {};
        var bundledLinzApiKey = "27a1097e44b44690a5c7726aa065a076";
        var bundledLinzLayerUrl = "https://data.linz.govt.nz/services;key=27a1097e44b44690a5c7726aa065a076/wfs/layer-113763/";
        var bundledLinzTypeName = "layer-113763";
        var bundledLinzApiKeyParam = "api_key";
        var defaultCustomGeoAreas = {};
        var defaultAreaDisplayOrder = [];
        try {
          if (rwasDefaults.customGeoAreas && typeof rwasDefaults.customGeoAreas === "object" && !Array.isArray(rwasDefaults.customGeoAreas)) {
            defaultCustomGeoAreas = JSON.parse(JSON.stringify(rwasDefaults.customGeoAreas));
          }
        } catch (e) {
          defaultCustomGeoAreas = {};
        }
        if (Array.isArray(rwasDefaults.areaDisplayOrder)) {
          defaultAreaDisplayOrder = rwasDefaults.areaDisplayOrder.slice();
        }

        function applyRwasAreaDefaults() {
          data.runtimeConfig.regionWarnings.customGeoAreas = JSON.parse(JSON.stringify(defaultCustomGeoAreas));
          data.runtimeConfig.regionWarnings.areaDisplayOrder = defaultAreaDisplayOrder.slice();
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function getEffectiveCustomGeoAreas() {
          var areas = data.runtimeConfig.regionWarnings.customGeoAreas;
          if (!areas || typeof areas !== "object" || Array.isArray(areas)) {
            areas = defaultCustomGeoAreas;
          }
          if (!areas || typeof areas !== "object" || Array.isArray(areas)) {
            areas = {};
          }
          return areas;
        }

        function getEffectiveAreaDisplayOrder() {
          var order = data.runtimeConfig.regionWarnings.areaDisplayOrder;
          if (Array.isArray(order)) {
            return order.slice();
          }
          return defaultAreaDisplayOrder.slice();
        }

        function getAreaConsistency() {
          var areaKeys = Object.keys(getEffectiveCustomGeoAreas());
          var order = getEffectiveAreaDisplayOrder();
          var keySet = {};
          var missingInOrder = [];
          var extraInOrder = [];
          areaKeys.forEach(function (k) { keySet[k] = true; });
          areaKeys.forEach(function (k) {
            if (order.indexOf(k) === -1) missingInOrder.push(k);
          });
          order.forEach(function (k) {
            if (!keySet[k]) extraInOrder.push(k);
          });
          return {
            areaKeys: areaKeys,
            order: order,
            missingInOrder: missingInOrder,
            extraInOrder: extraInOrder
          };
        }

        function syncOrderToAreaKeys() {
          data.runtimeConfig.regionWarnings.areaDisplayOrder = Object.keys(getEffectiveCustomGeoAreas());
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function mergeOrderWithAreaKeys() {
          var consistency = getAreaConsistency();
          var merged = consistency.order.filter(function (name) {
            return consistency.areaKeys.indexOf(name) !== -1;
          });
          consistency.areaKeys.forEach(function (name) {
            if (merged.indexOf(name) === -1) merged.push(name);
          });
          data.runtimeConfig.regionWarnings.areaDisplayOrder = merged;
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function buildOrderFromRwasPriority() {
          var areaKeys = Object.keys(getEffectiveCustomGeoAreas());
          var prioritized = [];
          defaultAreaDisplayOrder.forEach(function (name) {
            if (areaKeys.indexOf(name) !== -1 && prioritized.indexOf(name) === -1) {
              prioritized.push(name);
            }
          });
          areaKeys
            .filter(function (name) { return prioritized.indexOf(name) === -1; })
            .sort(function (a, b) { return a.localeCompare(b); })
            .forEach(function (name) { prioritized.push(name); });
          data.runtimeConfig.regionWarnings.areaDisplayOrder = prioritized;
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function getDefaultAreaEntries() {
          return Object.keys(defaultCustomGeoAreas).map(function (name) {
            return { name: name, url: defaultCustomGeoAreas[name] };
          });
        }

        function isDefaultAreaEnabled(areaName) {
          var current = getEffectiveCustomGeoAreas();
          return Object.prototype.hasOwnProperty.call(current, areaName);
        }

        function triggerRegionWarningsReload() {
          if (typeof window.FNED_REGION_WARNINGS_RELOAD === "function") {
            window.FNED_REGION_WARNINGS_RELOAD();
          }
        }

        function getLinzSelectedAreas() {
          var list = data.runtimeConfig.regionWarnings.linzSelectedAreas;
          return Array.isArray(list) ? list.slice() : [];
        }

        function setLinzSelectedAreas(list) {
          data.runtimeConfig.regionWarnings.linzSelectedAreas = list.slice();
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
        }

        function toggleLinzArea(areaName, enabled) {
          var selected = getLinzSelectedAreas();
          var has = selected.indexOf(areaName) !== -1;
          if (enabled && !has) selected.push(areaName);
          if (!enabled && has) selected = selected.filter(function (name) { return name !== areaName; });
          setLinzSelectedAreas(selected);
          renderModulePanel(data, state);
        }

        function setFilteredLinzAreasEnabled(names, enabled) {
          var selected = getLinzSelectedAreas();
          var selectedMap = {};
          selected.forEach(function (name) { selectedMap[name] = true; });
          names.forEach(function (name) {
            if (enabled) {
              selectedMap[name] = true;
            } else {
              delete selectedMap[name];
            }
          });
          setLinzSelectedAreas(Object.keys(selectedMap));
          renderModulePanel(data, state);
        }

        function ensureLinzAreaListLoaded() {
          if (state.alertsLinzAreaListLoading || Array.isArray(state.alertsLinzAreaList)) return;
          if (!window.FNED_LINZ_AREAS_API || typeof window.FNED_LINZ_AREAS_API.getAreaList !== "function") {
            state.alertsLinzAreaListError = "LINZ area API is unavailable.";
            return;
          }
          state.alertsLinzAreaListLoading = true;
          state.alertsLinzAreaListError = "";
          window.FNED_LINZ_AREAS_API.getAreaList(false).then(function (list) {
            state.alertsLinzAreaList = Array.isArray(list) ? list : [];
            if (typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
              state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
            }
            state.alertsLinzAreaListLoading = false;
            renderModulePanel(data, state);
          }).catch(function (err) {
            var baseErr = (err && err.message) ? String(err.message) : "Failed to load LINZ area list.";
            var proxyOff = !(data && data.runtimeConfig && data.runtimeConfig.regionWarnings && data.runtimeConfig.regionWarnings.useProxyForLinzAreas);
            var likelyCors = /cors|failed to fetch|networkerror/i.test(baseErr);
            if (proxyOff && likelyCors) {
              state.alertsLinzAreaListError = "LINZ direct fetch failed due to browser CORS restrictions. Re-enable 'Use LINZ Proxy' or use a CORS-enabled endpoint.";
            } else {
              state.alertsLinzAreaListError = baseErr;
            }
            if (typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
              state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
            }
            state.alertsLinzAreaListLoading = false;
            renderModulePanel(data, state);
          });
        }

        function setDefaultAreaEnabled(areaName, enabled) {
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            next[key] = current[key];
          });
          if (enabled) {
            next[areaName] = defaultCustomGeoAreas[areaName];
          } else {
            delete next[areaName];
          }
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function setAllDefaultAreasEnabled(enabled) {
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = current[key];
            }
          });
          if (enabled) {
            Object.keys(defaultCustomGeoAreas).forEach(function (key) {
              next[key] = defaultCustomGeoAreas[key];
            });
          }
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function applyDefaultAreaGroup(group) {
          var groups = {
            northland_core: ["Far North", "\u014ctur\u016b Marae", "Whang\u0101rei District"],
            southern_set: ["Gisborne", "Nelson", "Southland"]
          };
          var selected = groups[group] || [];
          var current = getEffectiveCustomGeoAreas();
          var next = {};
          Object.keys(current).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = current[key];
            }
          });
          selected.forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(defaultCustomGeoAreas, key)) {
              next[key] = defaultCustomGeoAreas[key];
            }
          });
          data.runtimeConfig.regionWarnings.customGeoAreas = next;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function applyAlertsPreset(mode) {
          var rw = data.runtimeConfig.regionWarnings;
          if (!rw) return;
          if (mode === "local_strict") {
            rw.showExpiredAlerts = false;
            rw.showNonFarNorthAlerts = false;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 24;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "regional_watch") {
            rw.showExpiredAlerts = true;
            rw.showNonFarNorthAlerts = true;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 72;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "cd_focus") {
            rw.showExpiredAlerts = false;
            rw.showNonFarNorthAlerts = true;
            rw.requireOnsetWithinWindow = true;
            rw.hourWindow = 48;
            rw.enableCivilDefenceAlerts = true;
            rw.showCancelledCivilDefenceAlerts = true;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = true;
          }
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        }

        function applyAlertsScopeMode(mode) {
          var rw = data.runtimeConfig.regionWarnings;
          var linzSelectedCount = Array.isArray(rw && rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (!rw) return;
          state.alertsLinzScopeNotice = "";
          if (mode === "far_north_only") {
            rw.showNonFarNorthAlerts = false;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
            rw.disableFarNorthAlerts = false;
          } else if (mode === "all_areas") {
            rw.showNonFarNorthAlerts = true;
            rw.showCustomGeoJsonAlerts = false;
            rw.useLinzAreas = false;
          } else if (mode === "custom_geo") {
            rw.showCustomGeoJsonAlerts = true;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = false;
          } else if (mode === "linz_only") {
            if (linzSelectedCount === 0) {
              state.alertsLinzScopeNotice = "Select at least one LINZ area before enabling LINZ scope mode.";
              ensureLinzAreaListLoaded();
              renderModulePanel(data, state);
              return;
            }
            rw.showCustomGeoJsonAlerts = false;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = true;
          } else if (mode === "custom_plus_linz") {
            if (linzSelectedCount === 0) {
              state.alertsLinzScopeNotice = "Select at least one LINZ area before enabling Custom + LINZ mode.";
              ensureLinzAreaListLoaded();
              renderModulePanel(data, state);
              return;
            }
            rw.showCustomGeoJsonAlerts = true;
            rw.showNonFarNorthAlerts = false;
            rw.useLinzAreas = true;
          }
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        function getAlertsScopeSummary() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          var linzCount = Array.isArray(rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (rw.showCustomGeoJsonAlerts && rw.useLinzAreas) {
            return "Custom + LINZ mode active (" + customCount + " custom and " + linzCount + " LINZ areas).";
          }
          if (rw.showCustomGeoJsonAlerts) {
            return "Custom-Geo mode active (" + customCount + " areas). Alerts are filtered by selected custom areas and Far North (unless disabled).";
          }
          if (rw.useLinzAreas) {
            return "LINZ mode active (" + linzCount + " areas). Alerts are filtered by selected LINZ suburbs/localities.";
          }
          if (rw.showNonFarNorthAlerts) {
            return "All-areas mode active. Alerts from all areas can appear.";
          }
          if (rw.disableFarNorthAlerts) {
            return "Far North matching is disabled and custom-area mode is off, so alerts may be hidden.";
          }
          return "Far-North-only mode active. Only alerts intersecting the Far North area appear.";
        }

        function getAlertsScopeWarnings() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var warnings = [];
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          var linzCount = Array.isArray(rw.linzSelectedAreas) ? rw.linzSelectedAreas.length : 0;
          if (rw.disableFarNorthAlerts && !rw.showCustomGeoJsonAlerts && !rw.useLinzAreas && !rw.showNonFarNorthAlerts) {
            warnings.push("No area source is active. Enable All Areas, Custom Geo, LINZ, or untick Disable Far North Alerts.");
          }
          if (rw.showCustomGeoJsonAlerts && customCount === 0) {
            warnings.push("Custom-area mode is on but no custom areas are active.");
          }
          if (rw.useLinzAreas && linzCount === 0) {
            warnings.push("LINZ mode is on but no LINZ areas are selected.");
          }
          if ((rw.showCustomGeoJsonAlerts || rw.useLinzAreas) && rw.showNonFarNorthAlerts) {
            warnings.push("Custom/LINZ filtering takes priority over All Areas while enabled.");
          }
          return warnings;
        }

        function repairAlertsScopeWarnings() {
          var rw = data.runtimeConfig.regionWarnings || {};
          var customCount = Object.keys(getEffectiveCustomGeoAreas()).length;
          if (rw.disableFarNorthAlerts && !rw.showCustomGeoJsonAlerts && !rw.useLinzAreas && !rw.showNonFarNorthAlerts) {
            rw.showNonFarNorthAlerts = true;
          }
          if (rw.showCustomGeoJsonAlerts && customCount === 0) {
            rw.showCustomGeoJsonAlerts = false;
            rw.showNonFarNorthAlerts = true;
          }
          if (rw.useLinzAreas && (!Array.isArray(rw.linzSelectedAreas) || !rw.linzSelectedAreas.length)) {
            rw.useLinzAreas = false;
            rw.showNonFarNorthAlerts = true;
          }
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          renderModulePanel(data, state);
        }

        var presetBlock = el("section", { class: "editor-section-block" });
        var timingBlock = el("section", { class: "editor-section-block" });
        var feedsBlock = el("section", { class: "editor-section-block" });
        var deliveryBlock = el("section", { class: "editor-section-block" });
        var customGeoBlock = el("section", { class: "editor-section-block" });

        panel.appendChild(el("h4", { text: "Alerts Content" }));
        panel.appendChild(field("Alerts Title", inputText(alertsPanel.title, function (v) { alertsPanel.title = v; })));
        panel.appendChild(field("Alerts Subtitle", inputText(alertsPanel.subtitle, function (v) { alertsPanel.subtitle = v; })));
        panel.appendChild(field("Alerts Lead", inputTextarea(alertsPanel.lead, function (v) { alertsPanel.lead = v; })));

        presetBlock.appendChild(el("h4", { text: "Quick Presets" }));
        presetBlock.appendChild(el("p", { class: "editor-note", text: "Apply a baseline profile, then fine-tune fields below." }));
        var presetButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Local Strict" }),
          el("button", { type: "button", class: "editor-btn", text: "Regional Watch" }),
          el("button", { type: "button", class: "editor-btn", text: "Civil Defence Focus" })
        ]);
        presetButtons.children[0].addEventListener("click", function () { applyAlertsPreset("local_strict"); });
        presetButtons.children[1].addEventListener("click", function () { applyAlertsPreset("regional_watch"); });
        presetButtons.children[2].addEventListener("click", function () { applyAlertsPreset("cd_focus"); });
        presetBlock.appendChild(presetButtons);

        timingBlock.appendChild(el("h4", { text: "Timing And Scope" }));
        timingBlock.appendChild(el("p", { class: "editor-note", text: "Control which warnings appear by time window and geographic filtering." }));
        timingBlock.appendChild(el("h5", { text: "Area Filter Mode" }));
        timingBlock.appendChild(el("p", { class: "editor-note", text: getAlertsScopeSummary() }));
        if (state.alertsLinzScopeNotice) {
          timingBlock.appendChild(el("p", { class: "editor-note", text: state.alertsLinzScopeNotice }));
        }
        var scopeWarnings = getAlertsScopeWarnings();
        if (scopeWarnings.length) {
          timingBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Scope warning: " + scopeWarnings.join(" | ")
          }));
          var fixScopeBtn = buttonRow([
            el("button", { type: "button", class: "editor-btn", text: "Repair Scope Warnings" })
          ]);
          fixScopeBtn.children[0].addEventListener("click", function () { repairAlertsScopeWarnings(); });
          timingBlock.appendChild(fixScopeBtn);
        }
        var scopeButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Far North Only" }),
          el("button", { type: "button", class: "editor-btn", text: "All Areas" }),
          el("button", { type: "button", class: "editor-btn", text: "Custom Geo" }),
          el("button", { type: "button", class: "editor-btn", text: "LINZ" }),
          el("button", { type: "button", class: "editor-btn", text: "Custom + LINZ" })
        ]);
        scopeButtons.children[0].addEventListener("click", function () { applyAlertsScopeMode("far_north_only"); });
        scopeButtons.children[1].addEventListener("click", function () { applyAlertsScopeMode("all_areas"); });
        scopeButtons.children[2].addEventListener("click", function () { applyAlertsScopeMode("custom_geo"); });
        scopeButtons.children[3].addEventListener("click", function () { applyAlertsScopeMode("linz_only"); });
        scopeButtons.children[4].addEventListener("click", function () { applyAlertsScopeMode("custom_plus_linz"); });
        var currentLinzSelectedCount = Array.isArray(data.runtimeConfig.regionWarnings.linzSelectedAreas)
          ? data.runtimeConfig.regionWarnings.linzSelectedAreas.length
          : 0;
        if (currentLinzSelectedCount === 0) {
          scopeButtons.children[3].disabled = true;
          scopeButtons.children[4].disabled = true;
        }
        timingBlock.appendChild(scopeButtons);
        timingBlock.appendChild(field("Show Expired Alerts", inputCheckbox(!!data.runtimeConfig.regionWarnings.showExpiredAlerts, function (v) {
          data.runtimeConfig.regionWarnings.showExpiredAlerts = !!v;
        })));
        timingBlock.appendChild(field("Show Non Far North Alerts", inputCheckbox(!!data.runtimeConfig.regionWarnings.showNonFarNorthAlerts, function (v) {
          data.runtimeConfig.regionWarnings.showNonFarNorthAlerts = !!v;
          triggerRegionWarningsReload();
        })));
        timingBlock.appendChild(field("Require Onset Within Window", inputCheckbox(
          data.runtimeConfig.regionWarnings.requireOnsetWithinWindow !== false,
          function (v) { data.runtimeConfig.regionWarnings.requireOnsetWithinWindow = !!v; }
        )));
        timingBlock.appendChild(field("Onset Window (hours)", inputText(
          String(data.runtimeConfig.regionWarnings.hourWindow || 24),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.hourWindow = n;
          }
        )));
        timingBlock.appendChild(field("Proxy URL Prefix", inputText(
          data.runtimeConfig.regionWarnings.proxy || "",
          function (v) { data.runtimeConfig.regionWarnings.proxy = v; },
          "Example: https://corsproxy.io/?"
        )));

        feedsBlock.appendChild(el("h4", { text: "Feed Sources" }));
        feedsBlock.appendChild(el("p", { class: "editor-note", text: "Override source feeds and Civil Defence inclusion behavior." }));
        feedsBlock.appendChild(field("MetService Source URL", inputText(
          data.runtimeConfig.regionWarnings.metServiceSourceUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.metServiceSourceUrl = v; }
        )));
        feedsBlock.appendChild(field("MetService Atom Feed URL (Override)", inputText(
          data.runtimeConfig.regionWarnings.metServiceAtomUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.metServiceAtomUrl = v; },
          "Optional direct atom URL"
        )));
        feedsBlock.appendChild(field("Enable Civil Defence Alerts", inputCheckbox(
          data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts !== false,
          function (v) { data.runtimeConfig.regionWarnings.enableCivilDefenceAlerts = !!v; }
        )));
        feedsBlock.appendChild(field("Civil Defence Atom URL", inputText(
          data.runtimeConfig.regionWarnings.civilDefenceAtomUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.civilDefenceAtomUrl = v; }
        )));
        feedsBlock.appendChild(field("Civil Defence Atom Feed URL (Override)", inputText(
          data.runtimeConfig.regionWarnings.civilDefenceAtomFeedUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.civilDefenceAtomFeedUrl = v; },
          "Optional direct atom URL"
        )));
        feedsBlock.appendChild(field("Show Cancelled Civil Defence Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts,
          function (v) { data.runtimeConfig.regionWarnings.showCancelledCivilDefenceAlerts = !!v; }
        )));

        deliveryBlock.appendChild(el("h4", { text: "Delivery And Formatting" }));
        deliveryBlock.appendChild(el("p", { class: "editor-note", text: "Tune shared fetch behavior and alert date formatting output." }));
        deliveryBlock.appendChild(field("Fetch Timeout (ms)", inputText(
          String(data.runtimeConfig.regionWarnings.fetchTimeoutMs || 15000),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.fetchTimeoutMs = n;
          }
        )));
        deliveryBlock.appendChild(field("Fetch Retries", inputText(
          String(data.runtimeConfig.regionWarnings.fetchRetries || 1),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.fetchRetries = n;
          }
        )));
        deliveryBlock.appendChild(field("Time Locale", inputText(
          data.runtimeConfig.regionWarnings.timeLocale || "",
          function (v) { data.runtimeConfig.regionWarnings.timeLocale = v; },
          "Example: en-NZ"
        )));
        deliveryBlock.appendChild(field("Time Zone", inputText(
          data.runtimeConfig.regionWarnings.timeZone || "",
          function (v) { data.runtimeConfig.regionWarnings.timeZone = v; },
          "Example: Pacific/Auckland"
        )));

        var customGeoAreasJson = "";
        try {
          var currentAreas = data.runtimeConfig.regionWarnings.customGeoAreas;
          if (!currentAreas || typeof currentAreas !== "object" || Array.isArray(currentAreas)) {
            currentAreas = defaultCustomGeoAreas;
          }
          customGeoAreasJson = JSON.stringify(currentAreas || {}, null, 2);
        } catch (e) {
          customGeoAreasJson = "";
        }

        customGeoBlock.appendChild(el("h4", { text: "Custom Geo Area Options" }));
        customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Enable and control alerts for custom area GeoJSON definitions." }));
        customGeoBlock.appendChild(el("h5", { text: "LINZ Suburb/Locality Areas" }));
        function applyLinzConfigReload() {
          if (window.FNED_LINZ_AREAS_API && typeof window.FNED_LINZ_AREAS_API.clearCache === "function") {
            window.FNED_LINZ_AREAS_API.clearCache();
          }
          delete state.alertsLinzAreaList;
          delete state.alertsLinzStatus;
          state.alertsLinzAreaListError = "";
          state.alertsLinzAreaListLoading = false;
          ON_EDITOR_DATA_CHANGED();
          triggerRegionWarningsReload();
          ensureLinzAreaListLoaded();
          renderModulePanel(data, state);
        }
        customGeoBlock.appendChild(field("Use LINZ Areas", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.useLinzAreas,
          function (v) {
            data.runtimeConfig.regionWarnings.useLinzAreas = !!v;
            triggerRegionWarningsReload();
            renderModulePanel(data, state);
          }
        )));
        if (typeof data.runtimeConfig.regionWarnings.useProxyForLinzAreas !== "boolean") {
          data.runtimeConfig.regionWarnings.useProxyForLinzAreas = true;
        }
        customGeoBlock.appendChild(field("Use LINZ Proxy", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.useProxyForLinzAreas,
          function (v) {
            data.runtimeConfig.regionWarnings.useProxyForLinzAreas = !!v;
            triggerRegionWarningsReload();
            renderModulePanel(data, state);
          }
        )));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Turning LINZ proxy off may cause browser CORS failures depending on endpoint behavior."
        }));
        data.runtimeConfig.regionWarnings.linzForceBundledSource = true;
        data.runtimeConfig.regionWarnings.linzSuburbLayerUrl = bundledLinzLayerUrl;
        data.runtimeConfig.regionWarnings.linzApiKey = bundledLinzApiKey;
        data.runtimeConfig.regionWarnings.linzApiKeyParam = bundledLinzApiKeyParam;
        data.runtimeConfig.regionWarnings.linzWfsTypeName = bundledLinzTypeName;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ source is fixed to bundled defaults. Key, layer URL, and type name are auto-managed."
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ endpoint: " + bundledLinzLayerUrl
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ type name: " + bundledLinzTypeName
        }));
        var runtimeLinzState = (window.FNED_RWAS_RUNTIME && typeof window.FNED_RWAS_RUNTIME === "object")
          ? window.FNED_RWAS_RUNTIME
          : null;
        var runtimeKeyParam = runtimeLinzState && runtimeLinzState.linzApiKeyParam ? String(runtimeLinzState.linzApiKeyParam) : "(unknown)";
        var runtimeHasKey = runtimeLinzState ? !!runtimeLinzState.linzApiKeyConfigured : false;
        var runtimeLayerUrl = runtimeLinzState && runtimeLinzState.linzLayerUrl ? String(runtimeLinzState.linzLayerUrl) : "(unknown)";
        var runtimeTypeName = runtimeLinzState && runtimeLinzState.linzWfsTypeName ? String(runtimeLinzState.linzWfsTypeName) : "(unknown)";
        var runtimeBundled = runtimeLinzState ? (runtimeLinzState.linzForceBundledSource !== false) : true;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ key state: configured param=" + bundledLinzApiKeyParam + ", runtime param=" + runtimeKeyParam
            + "; configured key=yes"
            + ", runtime key=" + (runtimeHasKey ? "yes" : "no") + "."
        }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "LINZ runtime source: " + (runtimeBundled ? "bundled" : "custom") + "; layer=" + runtimeLayerUrl + "; type=" + runtimeTypeName + "."
        }));
        var runtimeSelectedLinzCount = runtimeLinzState && Array.isArray(runtimeLinzState.selectedLinzAreas)
          ? runtimeLinzState.selectedLinzAreas.length
          : 0;
        var runtimeLoadedLinzCount = runtimeLinzState && Array.isArray(runtimeLinzState.loadedLinzAreaNames)
          ? runtimeLinzState.loadedLinzAreaNames.length
          : 0;
        if (runtimeSelectedLinzCount > 0 && runtimeLoadedLinzCount === 0) {
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "LINZ warning: selected areas are set but none are loaded. Alerts fall back to base area scope until LINZ data loads."
          }));
        }
        if (runtimeLinzState && (!runtimeBundled || runtimeKeyParam !== bundledLinzApiKeyParam || !runtimeHasKey || runtimeLayerUrl !== bundledLinzLayerUrl || runtimeTypeName !== bundledLinzTypeName)) {
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Runtime differs from bundled LINZ source. Click Reapply Bundled LINZ Source to sync."
          }));
        }
        var linzActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Reapply Bundled LINZ Source" }),
          el("button", { type: "button", class: "editor-btn", text: "Retry LINZ Area Load" })
        ]);
        linzActions.children[0].addEventListener("click", function () {
          data.runtimeConfig.regionWarnings.linzForceBundledSource = true;
          data.runtimeConfig.regionWarnings.linzSuburbLayerUrl = bundledLinzLayerUrl;
          data.runtimeConfig.regionWarnings.linzApiKey = bundledLinzApiKey;
          data.runtimeConfig.regionWarnings.linzApiKeyParam = bundledLinzApiKeyParam;
          data.runtimeConfig.regionWarnings.linzWfsTypeName = bundledLinzTypeName;
          applyLinzConfigReload();
        });
        linzActions.children[1].addEventListener("click", function () {
          if (window.FNED_LINZ_AREAS_API && typeof window.FNED_LINZ_AREAS_API.clearCache === "function") {
            window.FNED_LINZ_AREAS_API.clearCache();
          }
          delete state.alertsLinzAreaList;
          delete state.alertsLinzStatus;
          state.alertsLinzAreaListError = "";
          state.alertsLinzAreaListLoading = false;
          ensureLinzAreaListLoaded();
          renderModulePanel(data, state);
        });
        customGeoBlock.appendChild(linzActions);
        if (typeof window.FNED_LINZ_AREAS_API === "object" && typeof window.FNED_LINZ_AREAS_API.getStatus === "function") {
          state.alertsLinzStatus = window.FNED_LINZ_AREAS_API.getStatus();
        }
        if (state.alertsLinzStatus && state.alertsLinzStatus.loaded) {
          var fetchedLabel = "";
          try {
            fetchedLabel = new Date(state.alertsLinzStatus.fetchedAt).toLocaleString();
          } catch (e) {
            fetchedLabel = String(state.alertsLinzStatus.fetchedAt || "");
          }
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "LINZ cache: " + (state.alertsLinzStatus.count || 0) + " areas loaded at " + fetchedLabel + "."
          }));
        }
        if (data.runtimeConfig.regionWarnings.useLinzAreas) {
          ensureLinzAreaListLoaded();
          state.alertsLinzSearch = state.alertsLinzSearch || "";
          state.alertsLinzShowSelectedOnly = !!state.alertsLinzShowSelectedOnly;
          var linzSearchInput = inputText(
            state.alertsLinzSearch,
            function (v, inputEl) {
              state.alertsLinzSearch = v || "";
              state.alertsLinzPage = 1;
              state.alertsLinzSearchRefocus = true;
              state.alertsLinzSearchCursor = inputEl && typeof inputEl.selectionStart === "number"
                ? inputEl.selectionStart
                : state.alertsLinzSearch.length;
              renderModulePanel(data, state);
            },
            "Search suburb/locality name"
          );
          customGeoBlock.appendChild(field("Search LINZ Areas", linzSearchInput));
          if (state.alertsLinzSearchRefocus) {
            setTimeout(function () {
              if (!linzSearchInput) return;
              try {
                linzSearchInput.focus();
                var pos = (typeof state.alertsLinzSearchCursor === "number")
                  ? state.alertsLinzSearchCursor
                  : String(linzSearchInput.value || "").length;
                linzSearchInput.setSelectionRange(pos, pos);
              } catch (_focusErr) {
                // Ignore focus restore errors.
              }
              state.alertsLinzSearchRefocus = false;
            }, 0);
          }
          customGeoBlock.appendChild(field("Show Selected LINZ Areas Only", inputCheckbox(
            !!state.alertsLinzShowSelectedOnly,
            function (v) {
              state.alertsLinzShowSelectedOnly = !!v;
              renderModulePanel(data, state);
            }
          )));
          var selectedLinzAreas = getLinzSelectedAreas();
          customGeoBlock.appendChild(el("p", {
            class: "editor-note",
            text: "Selected LINZ areas: " + selectedLinzAreas.length
          }));
          var clearSelectedBtn = buttonRow([
            el("button", { type: "button", class: "editor-btn", text: "Clear All Selected LINZ Areas" })
          ]);
          clearSelectedBtn.children[0].addEventListener("click", function () {
            setLinzSelectedAreas([]);
            renderModulePanel(data, state);
          });
          customGeoBlock.appendChild(clearSelectedBtn);
          if (state.alertsLinzAreaListLoading) {
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Loading LINZ area list..." }));
          } else if (state.alertsLinzAreaListError) {
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "LINZ area list error: " + state.alertsLinzAreaListError }));
          } else if (Array.isArray(state.alertsLinzAreaList)) {
            var query = String(state.alertsLinzSearch || "").toLowerCase().trim();
            var filteredLinz = state.alertsLinzAreaList.filter(function (item) {
              var matchSearch = !query || String(item.name || "").toLowerCase().indexOf(query) !== -1;
              if (!matchSearch) return false;
              if (state.alertsLinzShowSelectedOnly) {
                return selectedLinzAreas.indexOf(item.name) !== -1;
              }
              return true;
            });
            state.alertsLinzPageSize = parseInt(state.alertsLinzPageSize, 10);
            if (isNaN(state.alertsLinzPageSize) || state.alertsLinzPageSize < 25) state.alertsLinzPageSize = 100;
            state.alertsLinzPage = parseInt(state.alertsLinzPage, 10);
            if (isNaN(state.alertsLinzPage) || state.alertsLinzPage < 1) state.alertsLinzPage = 1;
            var totalPages = Math.max(1, Math.ceil(filteredLinz.length / state.alertsLinzPageSize));
            if (state.alertsLinzPage > totalPages) state.alertsLinzPage = totalPages;
            var pageStart = (state.alertsLinzPage - 1) * state.alertsLinzPageSize;
            var pageEnd = Math.min(pageStart + state.alertsLinzPageSize, filteredLinz.length);
            var pageItems = filteredLinz.slice(pageStart, pageEnd);
            customGeoBlock.appendChild(field("LINZ List Page Size", inputText(
              String(state.alertsLinzPageSize),
              function (v) {
                var n = parseInt(v, 10);
                if (!isNaN(n) && n >= 25 && n <= 500) {
                  state.alertsLinzPageSize = n;
                  state.alertsLinzPage = 1;
                }
                renderModulePanel(data, state);
              },
              "25-500"
            )));
            customGeoBlock.appendChild(el("p", {
              class: "editor-note",
              text: "Showing " + (filteredLinz.length ? (pageStart + 1) : 0) + "-" + pageEnd + " of " + filteredLinz.length + " matching LINZ areas (north to south order)."
            }));
            var filteredNames = filteredLinz.map(function (item) { return item.name; });
            var linzBulkButtons = buttonRow([
              el("button", { type: "button", class: "editor-btn", text: "Select Filtered LINZ Areas" }),
              el("button", { type: "button", class: "editor-btn", text: "Clear Filtered LINZ Areas" })
            ]);
            linzBulkButtons.children[0].addEventListener("click", function () {
              setFilteredLinzAreasEnabled(filteredNames, true);
            });
            linzBulkButtons.children[1].addEventListener("click", function () {
              setFilteredLinzAreasEnabled(filteredNames, false);
            });
            customGeoBlock.appendChild(linzBulkButtons);
            var linzPageButtons = buttonRow([
              el("button", { type: "button", class: "editor-btn", text: "Prev Page" }),
              el("button", { type: "button", class: "editor-btn", text: "Next Page" })
            ]);
            linzPageButtons.children[0].disabled = state.alertsLinzPage <= 1;
            linzPageButtons.children[1].disabled = state.alertsLinzPage >= totalPages;
            linzPageButtons.children[0].addEventListener("click", function () {
              state.alertsLinzPage = Math.max(1, state.alertsLinzPage - 1);
              renderModulePanel(data, state);
            });
            linzPageButtons.children[1].addEventListener("click", function () {
              state.alertsLinzPage = Math.min(totalPages, state.alertsLinzPage + 1);
              renderModulePanel(data, state);
            });
            customGeoBlock.appendChild(linzPageButtons);
            customGeoBlock.appendChild(el("p", { class: "editor-note", text: "Page " + state.alertsLinzPage + " of " + totalPages + "." }));
            pageItems.forEach(function (item) {
              customGeoBlock.appendChild(field(item.name, inputCheckbox(
                selectedLinzAreas.indexOf(item.name) !== -1,
                function (v) { toggleLinzArea(item.name, !!v); }
              )));
            });
          }
        }
        var areaDefaultButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Apply RWAS Defaults (Areas + Order)" }),
          el("button", { type: "button", class: "editor-btn", text: "Reset Order To RWAS Default" })
        ]);
        areaDefaultButtons.children[0].addEventListener("click", function () {
          applyRwasAreaDefaults();
        });
        areaDefaultButtons.children[1].addEventListener("click", function () {
          data.runtimeConfig.regionWarnings.areaDisplayOrder = defaultAreaDisplayOrder.slice();
          ON_EDITOR_DATA_CHANGED();
          renderModulePanel(data, state);
        });
        customGeoBlock.appendChild(areaDefaultButtons);
        customGeoBlock.appendChild(el("h5", { text: "Default Area Tickboxes" }));
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Use tickboxes to include or exclude each default area (equivalent to uncomment/comment in defaults)."
        }));
        var defaultAreaToggleButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Tick All Default Areas" }),
          el("button", { type: "button", class: "editor-btn", text: "Untick All Default Areas" })
        ]);
        defaultAreaToggleButtons.children[0].addEventListener("click", function () {
          setAllDefaultAreasEnabled(true);
        });
        defaultAreaToggleButtons.children[1].addEventListener("click", function () {
          setAllDefaultAreasEnabled(false);
        });
        customGeoBlock.appendChild(defaultAreaToggleButtons);
        var selectedDefaultCount = getDefaultAreaEntries().filter(function (entry) {
          return isDefaultAreaEnabled(entry.name);
        }).length;
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Selected default areas: " + selectedDefaultCount + " of " + getDefaultAreaEntries().length
        }));
        var defaultGroupButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Northland Core Set" }),
          el("button", { type: "button", class: "editor-btn", text: "Southern Set" })
        ]);
        defaultGroupButtons.children[0].addEventListener("click", function () {
          applyDefaultAreaGroup("northland_core");
        });
        defaultGroupButtons.children[1].addEventListener("click", function () {
          applyDefaultAreaGroup("southern_set");
        });
        customGeoBlock.appendChild(defaultGroupButtons);
        getDefaultAreaEntries().forEach(function (entry) {
          customGeoBlock.appendChild(field(entry.name, inputCheckbox(
            isDefaultAreaEnabled(entry.name),
            function (v) { setDefaultAreaEnabled(entry.name, !!v); }
          )));
        });
        var areaConsistency = getAreaConsistency();
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Area consistency: " +
            (areaConsistency.missingInOrder.length ? ("missing in order -> " + areaConsistency.missingInOrder.join(", ")) : "no missing area names in order") +
            "; " +
            (areaConsistency.extraInOrder.length ? ("order has names not in active areas -> " + areaConsistency.extraInOrder.join(", ")) : "no extra order names")
        }));
        var areaSyncButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Sync Order To Area Keys" }),
          el("button", { type: "button", class: "editor-btn", text: "Merge Order + Missing Keys" }),
          el("button", { type: "button", class: "editor-btn", text: "Order By RWAS Priority" })
        ]);
        areaSyncButtons.children[0].addEventListener("click", function () {
          syncOrderToAreaKeys();
        });
        areaSyncButtons.children[1].addEventListener("click", function () {
          mergeOrderWithAreaKeys();
        });
        areaSyncButtons.children[2].addEventListener("click", function () {
          buildOrderFromRwasPriority();
        });
        customGeoBlock.appendChild(areaSyncButtons);
        customGeoBlock.appendChild(el("p", {
          class: "editor-note",
          text: state.alertsAreaJsonError
            ? ("Custom Geo Areas JSON: invalid JSON - " + state.alertsAreaJsonError)
            : ("Custom Geo Areas JSON: valid (" + Object.keys(getEffectiveCustomGeoAreas()).length + " area names)")
        }));
        customGeoBlock.appendChild(field("Show Custom GeoJSON Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.showCustomGeoJsonAlerts,
          function (v) {
            data.runtimeConfig.regionWarnings.showCustomGeoJsonAlerts = !!v;
            triggerRegionWarningsReload();
          }
        )));
        customGeoBlock.appendChild(field("Use Proxy For Custom GeoJSON", inputCheckbox(
          data.runtimeConfig.regionWarnings.useProxyForCustomGeoJson !== false,
          function (v) {
            data.runtimeConfig.regionWarnings.useProxyForCustomGeoJson = !!v;
            triggerRegionWarningsReload();
          }
        )));
        customGeoBlock.appendChild(field("Far North GeoJSON URL", inputText(
          data.runtimeConfig.regionWarnings.farNorthGeoJsonUrl || "",
          function (v) { data.runtimeConfig.regionWarnings.farNorthGeoJsonUrl = v; }
        )));
        customGeoBlock.appendChild(field("GeoJSON Cache Expiry (hours)", inputText(
          String(data.runtimeConfig.regionWarnings.geoJsonExpiryHours || 24),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) data.runtimeConfig.regionWarnings.geoJsonExpiryHours = n;
          }
        )));
        customGeoBlock.appendChild(field("Custom Geo Areas JSON", inputTextarea(
          customGeoAreasJson,
          function (v) {
            var trimmed = String(v || "").trim();
            if (!trimmed) {
              delete data.runtimeConfig.regionWarnings.customGeoAreas;
              state.alertsAreaJsonError = "";
              return;
            }
            try {
              var parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                data.runtimeConfig.regionWarnings.customGeoAreas = parsed;
                state.alertsAreaJsonError = "";
              }
            } catch (e) {
              state.alertsAreaJsonError = e && e.message ? e.message : "Parse error";
            }
          },
          "{\"Area Name\": \"https://...geojson\"}"
        )));
        customGeoBlock.appendChild(field("Area Display Order", inputTextarea(
          Array.isArray(data.runtimeConfig.regionWarnings.areaDisplayOrder)
            ? data.runtimeConfig.regionWarnings.areaDisplayOrder.join(", ")
            : defaultAreaDisplayOrder.join(", "),
          function (v) {
            var list = String(v || "")
              .split(/[\n,]+/)
              .map(function (part) { return part.trim(); })
              .filter(Boolean);
            if (!list.length) {
              delete data.runtimeConfig.regionWarnings.areaDisplayOrder;
              return;
            }
            data.runtimeConfig.regionWarnings.areaDisplayOrder = list;
          },
          "Far North District, Whangarei District"
        )));
        customGeoBlock.appendChild(field("Disable Far North Alerts", inputCheckbox(
          !!data.runtimeConfig.regionWarnings.disableFarNorthAlerts,
          function (v) {
            data.runtimeConfig.regionWarnings.disableFarNorthAlerts = !!v;
            triggerRegionWarningsReload();
          }
        )));

        panel.appendChild(presetBlock);
        panel.appendChild(timingBlock);
        panel.appendChild(feedsBlock);
        panel.appendChild(deliveryBlock);
        panel.appendChild(customGeoBlock);
        captureSituationPageLayout("alerts");
      }
    }

    if (moduleId === "summary") {
      var summaryPanel = ensureObj(data, "summaryPanel");
      panel.appendChild(field("Panel Title", inputText(summaryPanel.title, function (v) { summaryPanel.title = v; })));

      panel.appendChild(renderArrayEditor({
        title: "Paragraphs",
        arr: Array.isArray(summaryPanel.paragraphs) ? summaryPanel.paragraphs : (summaryPanel.paragraphs = []),
        getSummary: function (item) { return (item || "").slice(0, 48) + ((item && item.length > 48) ? "â€¦" : ""); },
        addNewItem: function () { return "New paragraph"; },
        renderItemFields: function (item, idx) {
          var box = el("div");
          box.appendChild(field("Text", inputTextarea(item, function (v) { summaryPanel.paragraphs[idx] = v; }, "")));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));

      data.runtimeConfig = data.runtimeConfig || {};
      data.runtimeConfig.summary = data.runtimeConfig.summary || {};
      if (typeof data.runtimeConfig.summary.showFeedHealth !== "boolean") {
        data.runtimeConfig.summary.showFeedHealth = true;
      }
      if (typeof data.runtimeConfig.summary.enableSummaryCollapse !== "boolean") {
        data.runtimeConfig.summary.enableSummaryCollapse = true;
      }
      if (typeof data.runtimeConfig.summary.summaryCollapsedByDefault !== "boolean") {
        data.runtimeConfig.summary.summaryCollapsedByDefault = false;
      }
      if (typeof data.runtimeConfig.summary.farNorthAlertsSinceDays !== "number") {
        data.runtimeConfig.summary.farNorthAlertsSinceDays = 14;
      }
      panel.appendChild(field("Include Emergency Banners", inputCheckbox(data.runtimeConfig.summary.includeEmergencyBanners !== false, function (v) {
        data.runtimeConfig.summary.includeEmergencyBanners = !!v;
      })));
      panel.appendChild(field("Show Feed Health", inputCheckbox(data.runtimeConfig.summary.showFeedHealth !== false, function (v) {
        data.runtimeConfig.summary.showFeedHealth = !!v;
      })));
      panel.appendChild(field("Enable Alerts Collapse Control", inputCheckbox(data.runtimeConfig.summary.enableSummaryCollapse !== false, function (v) {
        data.runtimeConfig.summary.enableSummaryCollapse = !!v;
      })));
      panel.appendChild(field("Start Collapsed (Show 1 Alert)", inputCheckbox(!!data.runtimeConfig.summary.summaryCollapsedByDefault, function (v) {
        data.runtimeConfig.summary.summaryCollapsedByDefault = !!v;
      })));
      panel.appendChild(field("Far North Alerts Since Days", inputText(
        String(data.runtimeConfig.summary.farNorthAlertsSinceDays || 14),
        function (v) {
          var n = parseInt(v, 10);
          if (isNaN(n)) return;
          data.runtimeConfig.summary.farNorthAlertsSinceDays = Math.max(1, Math.min(120, n));
        },
        "1-120"
      )));
      panel.appendChild(el("p", {
        class: "editor-note",
        text: "Applies to emergency-banner items shown in the Far North Alerts section."
      }));

      panel.appendChild(renderArrayEditor({
        title: "Custom Blocks (HTML)",
        arr: Array.isArray(summaryPanel.customBlocks) ? summaryPanel.customBlocks : (summaryPanel.customBlocks = []),
        getSummary: function (item) { return (item && item.title) ? item.title : "Block"; },
        addNewItem: function () { return { title: "New Block", html: "<p>Content</p>" }; },
        renderItemFields: function (item) {
          var box = el("div");
          box.appendChild(field("Title", inputText(item.title, function (v) { item.title = v; })));
          box.appendChild(field("HTML", inputTextarea(item.html, function (v) { item.html = v; }, "<p>â€¦</p>")));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "stats") {
      var statsSection = ensureObj(data, "statsSection");
      var statsRuntimeCfg = ensureObj(ensureObj(data, "runtimeConfig"), "stats");
      var liveSourcesCfg = ensureObj(statsRuntimeCfg, "liveCountSources");
      if (typeof liveSourcesCfg.fndcAlerts !== "boolean") liveSourcesCfg.fndcAlerts = true;
      if (typeof liveSourcesCfg.emergencyNews !== "boolean") liveSourcesCfg.emergencyNews = true;
      if (typeof liveSourcesCfg.waterOutages !== "boolean") liveSourcesCfg.waterOutages = true;
      if (typeof liveSourcesCfg.powerOutages !== "boolean") liveSourcesCfg.powerOutages = true;
      if (typeof liveSourcesCfg.nztaRoadClosures !== "boolean") liveSourcesCfg.nztaRoadClosures = true;
      if (typeof liveSourcesCfg.localRoadClosures !== "boolean") liveSourcesCfg.localRoadClosures = true;
      if (typeof liveSourcesCfg.weatherWarnings !== "boolean") liveSourcesCfg.weatherWarnings = true;
      if (typeof liveSourcesCfg.civilDefenceWarnings !== "boolean") liveSourcesCfg.civilDefenceWarnings = true;
      if (typeof statsRuntimeCfg.enableLiveCounts !== "boolean") statsRuntimeCfg.enableLiveCounts = true;
      if (typeof statsRuntimeCfg.autoRefreshEnabled !== "boolean") statsRuntimeCfg.autoRefreshEnabled = false;
      if (typeof statsRuntimeCfg.refreshIntervalMs !== "number") statsRuntimeCfg.refreshIntervalMs = 120000;
      if (typeof statsRuntimeCfg.showConnectionStatus !== "boolean") statsRuntimeCfg.showConnectionStatus = true;
      if (typeof statsRuntimeCfg.showLastUpdated !== "boolean") statsRuntimeCfg.showLastUpdated = true;
      if (!Array.isArray(statsRuntimeCfg.waterOutageStatusFilter)) statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
      if (!Array.isArray(statsRuntimeCfg.waterOutageTypeFilter)) statsRuntimeCfg.waterOutageTypeFilter = [];
      if (!Array.isArray(statsRuntimeCfg.powerOutageStatusFilter)) statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
      if (typeof statsRuntimeCfg.fndcAlertsSinceDays !== "number") statsRuntimeCfg.fndcAlertsSinceDays = 14;
      if (typeof statsRuntimeCfg.emergencyNewsSinceDays !== "number") statsRuntimeCfg.emergencyNewsSinceDays = 14;
      function getDefaultStatusTargetUrls() {
        return {
          fndcAlerts: "https://www.fndc.govt.nz/",
          emergencyNews: "https://www.fndc.govt.nz/Whats-New/Latest-news",
          waterOutages: "https://www.fndc.govt.nz/services/water/Water-outage-updates",
          powerOutages: "https://outages.topenergy.co.nz/",
          nztaRoadClosures: "https://www.journeys.nzta.govt.nz/journey-planner",
          localRoadClosures: "https://www.fndc.govt.nz/services/transport/closures",
          weatherWarnings: "https://www.metservice.com/warnings/home",
          civilDefenceWarnings: "https://www.civildefence.govt.nz/"
        };
      }
      statsRuntimeCfg.statusTargetUrls = ensureObj(statsRuntimeCfg, "statusTargetUrls");
      var defaultStatusTargetUrls = getDefaultStatusTargetUrls();
      Object.keys(defaultStatusTargetUrls).forEach(function (key) {
        if (!String(statsRuntimeCfg.statusTargetUrls[key] || "").trim()) {
          statsRuntimeCfg.statusTargetUrls[key] = defaultStatusTargetUrls[key];
        }
      });
      statsSection.cards = Array.isArray(statsSection.cards) ? statsSection.cards : [];

      function parseCsvList(value) {
        return String(value || "")
          .split(",")
          .map(function (part) { return part.trim(); })
          .filter(Boolean);
      }
      function hasFilterValue(arr, value) {
        return Array.isArray(arr) && arr.indexOf(value) !== -1;
      }
      function toggleFilterValue(arr, value, enabled) {
        var next = Array.isArray(arr) ? arr.slice() : [];
        var idx = next.indexOf(value);
        if (enabled && idx === -1) next.push(value);
        if (!enabled && idx !== -1) next.splice(idx, 1);
        return next;
      }
      function countActiveFilterValues() {
        return (statsRuntimeCfg.waterOutageStatusFilter || []).length
          + (statsRuntimeCfg.waterOutageTypeFilter || []).length
          + (statsRuntimeCfg.powerOutageStatusFilter || []).length
          + 2;
      }
      function formatFilterSummary() {
        var waterStatuses = (statsRuntimeCfg.waterOutageStatusFilter || []).join(", ") || "none";
        var waterTypes = (statsRuntimeCfg.waterOutageTypeFilter || []).join(", ") || "none";
        var powerStatuses = (statsRuntimeCfg.powerOutageStatusFilter || []).join(", ") || "none";
        return "Water status: " + waterStatuses
          + " | Water type: " + waterTypes
          + " | Power status: " + powerStatuses
          + " | FNDC alerts window: " + String(statsRuntimeCfg.fndcAlertsSinceDays || 14) + " days"
          + " | Emergency news window: " + String(statsRuntimeCfg.emergencyNewsSinceDays || 14) + " days";
      }
      function applyRuntimeFilterPreset(name) {
        if (name === "clear") {
          statsRuntimeCfg.waterOutageStatusFilter = [];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = [];
          return;
        }
        if (name === "defaults") {
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          return;
        }
        if (name === "highImpact") {
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported", "Current"];
          statsRuntimeCfg.waterOutageTypeFilter = ["Unplanned"];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive"];
        }
      }
      var cardPageDefs = [
        { pageId: "fndcAlerts", label: "FNDC Alerts", sourceKey: "fndcAlerts", sourceLabel: "Live Source: FNDC Alerts" },
        { pageId: "emergencyNews", label: "Emergency News Stories", sourceKey: "emergencyNews", sourceLabel: "Live Source: Emergency News" },
        { pageId: "waterOutages", label: "Water Outages", sourceKey: "waterOutages", sourceLabel: "Live Source: Water Outages" },
        { pageId: "powerOutages", label: "Power Outages", sourceKey: "powerOutages", sourceLabel: "Live Source: Power Outages" },
        { pageId: "nztaRoadClosures", label: "Road Closures NZTA", sourceKey: "nztaRoadClosures", sourceLabel: "Live Source: NZTA Road Closures" },
        { pageId: "localRoadClosures", label: "Road Closures Local", sourceKey: "localRoadClosures", sourceLabel: "Live Source: Local Road Closures" },
        { pageId: "weatherWarnings", label: "Weather Warnings", sourceKey: "weatherWarnings", sourceLabel: "Live Source: Weather Warnings" },
        { pageId: "civilDefenceWarnings", label: "Civil Defence Warnings", sourceKey: "civilDefenceWarnings", sourceLabel: "Live Source: Civil Defence Warnings" }
      ];
      var pageIds = ["overview", "runtime"].concat(cardPageDefs.map(function (d) { return d.pageId; }));
      var statsPage = pageIds.indexOf(state.statsPage) >= 0 ? state.statsPage : "overview";

      function getCardByLabel(label) {
        var match = statsSection.cards.find(function (c) { return c && c.label === label; });
        if (match) return match;
        var fallback = {
          label: label,
          number: 0,
          description: "",
          url: "#",
          colorClass: "grey",
          external: false,
          ariaLabel: ""
        };
        statsSection.cards.push(fallback);
        return fallback;
      }

      function renderCardFields(card) {
        panel.appendChild(field("Card Label", inputText(card.label, function (v) { card.label = v; })));
        panel.appendChild(field("Card Number (fallback)", inputText(String(typeof card.number === "number" ? card.number : 0), function (v) {
          var n = parseInt(v, 10);
          card.number = isNaN(n) ? 0 : n;
        })));
        panel.appendChild(field("Card Description", inputText(card.description, function (v) { card.description = v; })));
        panel.appendChild(field("Card URL", inputText(card.url, function (v) { card.url = v; })));
        panel.appendChild(field("Open In New Tab", inputCheckbox(!!card.external, function (v) { card.external = !!v; })));
        panel.appendChild(field("Aria Label", inputText(card.ariaLabel, function (v) { card.ariaLabel = v; }, "Used for accessibility")));
        panel.appendChild(field("Colour Class", inputSelect(card.colorClass || "grey", [
          { value: "grey", label: "Grey" },
          { value: "teal", label: "Teal" },
          { value: "orange", label: "Orange" },
          { value: "red", label: "Red" }
        ], function (v) { card.colorClass = v; })));
      }

      function appendStatsPageNav() {
        var filterValue = typeof state.statsCardNavFilter === "string" ? state.statsCardNavFilter : "";
        var filterInput = inputText(filterValue, function (v) {
          state.statsCardNavFilter = v;
        }, "Filter status card tabs by name");
        panel.appendChild(field("Filter Cards", filterInput));
        var filterNote = el("p", { class: "editor-note", text: "" });
        filterNote.style.display = "none";
        panel.appendChild(filterNote);

        var pageNav = el("div", { class: "editor-subpage-nav", role: "tablist", "aria-label": "Status cards editor pages" });
        function pageBtn(pageId, label) {
          var isActive = statsPage === pageId;
          var btn = el("button", {
            type: "button",
            class: "editor-subpage-btn" + (isActive ? " is-active" : ""),
            text: label,
            role: "tab",
            "aria-selected": isActive ? "true" : "false"
          });
          btn.addEventListener("click", function () {
            state.statsPage = pageId;
            renderModulesList(data, state);
            renderQuickNav(data, state);
            renderModulePanel(data, state);
          });
          return btn;
        }
        pageNav.appendChild(pageBtn("overview", "Overview"));
        pageNav.appendChild(pageBtn("runtime", "Runtime Settings"));
        cardPageDefs.forEach(function (def) {
          var btn = pageBtn(def.pageId, def.label);
          btn.setAttribute("data-card-label", String(def.label || ""));
          pageNav.appendChild(btn);
        });
        panel.appendChild(pageNav);

        function applyCardTabFilter() {
          var term = String(filterInput.value || "").trim().toLowerCase();
          state.statsCardNavFilter = String(filterInput.value || "");
          var visibleCount = 0;
          Array.prototype.forEach.call(pageNav.querySelectorAll("button[data-card-label]"), function (btn) {
            var label = String(btn.getAttribute("data-card-label") || "").toLowerCase();
            var show = !term || label.indexOf(term) >= 0;
            btn.style.display = show ? "" : "none";
            if (show) visibleCount += 1;
          });
          if (term) {
            filterNote.textContent = String(visibleCount) + " card tab(s) match \"" + term + "\".";
            filterNote.style.display = "";
          } else {
            filterNote.textContent = "";
            filterNote.style.display = "none";
          }
        }
        filterInput.addEventListener("input", applyCardTabFilter);
        applyCardTabFilter();
      }

      function appendPageStepper() {
        var currentIdx = pageIds.indexOf(statsPage);
        if (currentIdx < 0) return;
        var prevId = currentIdx > 0 ? pageIds[currentIdx - 1] : null;
        var nextId = currentIdx < pageIds.length - 1 ? pageIds[currentIdx + 1] : null;
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Page " + String(currentIdx + 1) + " of " + String(pageIds.length)
        }));
        var row = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Previous Page" }),
          el("button", { type: "button", class: "editor-btn", text: "Next Page" })
        ]);
        row.children[0].disabled = !prevId;
        row.children[1].disabled = !nextId;
        row.children[0].addEventListener("click", function () {
          if (!prevId) return;
          state.statsPage = prevId;
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        row.children[1].addEventListener("click", function () {
          if (!nextId) return;
          state.statsPage = nextId;
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        panel.appendChild(row);
      }

      appendStatsPageNav();
      appendPageStepper();

      if (statsPage === "overview") {
        panel.appendChild(el("h4", { text: "Status Parent Page" }));
        panel.appendChild(field("Section Title", inputText(statsSection.title, function (v) { statsSection.title = v; })));
        panel.appendChild(field("Section Subtitle", inputText(statsSection.subtitle, function (v) { statsSection.subtitle = v; })));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Each status card now has its own page. Open Runtime Settings for live source and filter controls."
        }));
        var summary = cardPageDefs.map(function (def) {
          var card = getCardByLabel(def.label);
          var sourceEnabled = liveSourcesCfg[def.sourceKey] !== false;
          return def.label + ": " + (sourceEnabled ? "live on" : "live off") + ", fallback number " + String(card.number || 0);
        }).join(" | ");
        panel.appendChild(el("p", { class: "editor-note", text: summary }));
        var openButtons = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Open Runtime Settings" }),
          el("button", { type: "button", class: "editor-btn", text: "Open FNDC Alerts Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Water Outages Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Weather Warnings Card" }),
          el("button", { type: "button", class: "editor-btn", text: "Open Civil Defence Warnings Card" })
        ]);
        openButtons.children[0].addEventListener("click", function () { state.statsPage = "runtime"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[1].addEventListener("click", function () { state.statsPage = "fndcAlerts"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[2].addEventListener("click", function () { state.statsPage = "waterOutages"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[3].addEventListener("click", function () { state.statsPage = "weatherWarnings"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        openButtons.children[4].addEventListener("click", function () { state.statsPage = "civilDefenceWarnings"; renderModulesList(data, state); renderQuickNav(data, state); renderModulePanel(data, state); });
        panel.appendChild(openButtons);
      } else if (statsPage === "runtime") {
        panel.classList.add("editor-panel-stats-runtime");
        panel.appendChild(el("h4", { text: "Runtime Overview" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Edit runtime behavior for status cards. Changes are local until you use Save to reload and apply."
        }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Quick summary: " + String(countActiveFilterValues()) + " active filter values | " + String(cardPageDefs.filter(function (def) {
            return liveSourcesCfg[def.sourceKey] !== false;
          }).length) + " live sources enabled"
        }));
        var runtimeTopActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Preview Runtime Overview" }),
          el("button", { type: "button", class: "editor-btn", text: "Save Draft" }),
          el("button", { type: "button", class: "editor-btn primary", text: "Publish Changes" })
        ]);
        runtimeTopActions.children[0].addEventListener("click", function () {
          state.statsPage = "overview";
          renderModulesList(data, state);
          renderQuickNav(data, state);
          renderModulePanel(data, state);
        });
        runtimeTopActions.children[1].addEventListener("click", function () {
          var save = $("#editor-save");
          if (save) save.click();
        });
        runtimeTopActions.children[2].addEventListener("click", function () {
          var save = $("#editor-save");
          if (save) save.click();
        });
        panel.appendChild(runtimeTopActions);
        var runtimeCoreBlock = el("section", { class: "editor-section-block" });
        runtimeCoreBlock.appendChild(el("h4", { text: "Core Runtime Controls" }));
        runtimeCoreBlock.appendChild(field("Enable Live Counts", inputCheckbox(
          statsRuntimeCfg.enableLiveCounts !== false,
          function (v) { statsRuntimeCfg.enableLiveCounts = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Auto Refresh Live Counts", inputCheckbox(
          !!statsRuntimeCfg.autoRefreshEnabled,
          function (v) { statsRuntimeCfg.autoRefreshEnabled = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Refresh Interval (seconds)", inputText(
          String(Math.max(15, Math.round((statsRuntimeCfg.refreshIntervalMs || 120000) / 1000))),
          function (v) {
            var n = parseInt(v, 10);
            if (!isNaN(n)) statsRuntimeCfg.refreshIntervalMs = Math.max(15000, Math.min(600000, n * 1000));
          },
          "15-600"
        )));
        runtimeCoreBlock.appendChild(field("Show Connection Status", inputCheckbox(
          statsRuntimeCfg.showConnectionStatus !== false,
          function (v) { statsRuntimeCfg.showConnectionStatus = !!v; }
        )));
        runtimeCoreBlock.appendChild(field("Show Last Updated Stamp", inputCheckbox(
          statsRuntimeCfg.showLastUpdated !== false,
          function (v) { statsRuntimeCfg.showLastUpdated = !!v; }
        )));
        runtimeCoreBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Refresh interval controls how often live sources are polled (recommended: 120-300 seconds)."
        }));
        panel.appendChild(runtimeCoreBlock);

        var runtimeSourcesBlock = el("section", { class: "editor-section-block" });
        runtimeSourcesBlock.appendChild(el("h4", { text: "Live Source Toggles" }));
        cardPageDefs.forEach(function (def) {
          runtimeSourcesBlock.appendChild(field(def.sourceLabel, inputCheckbox(
            liveSourcesCfg[def.sourceKey] !== false,
            function (v) { liveSourcesCfg[def.sourceKey] = !!v; }
          )));
        });
        var sourcePresetActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Sources: Essential Only" }),
          el("button", { type: "button", class: "editor-btn", text: "Sources: All On" })
        ]);
        sourcePresetActions.children[0].addEventListener("click", function () {
          liveSourcesCfg.fndcAlerts = true;
          liveSourcesCfg.emergencyNews = true;
          liveSourcesCfg.waterOutages = true;
          liveSourcesCfg.powerOutages = true;
          liveSourcesCfg.nztaRoadClosures = true;
          liveSourcesCfg.localRoadClosures = true;
          liveSourcesCfg.weatherWarnings = false;
          liveSourcesCfg.civilDefenceWarnings = false;
          renderModulePanel(data, state);
        });
        sourcePresetActions.children[1].addEventListener("click", function () {
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        runtimeSourcesBlock.appendChild(sourcePresetActions);
        panel.appendChild(runtimeSourcesBlock);

        var runtimeTargetsBlock = el("section", { class: "editor-section-block" });
        runtimeTargetsBlock.appendChild(el("h4", { text: "Status Table Target URLs" }));
        runtimeTargetsBlock.appendChild(el("p", {
          class: "editor-note",
          text: "These URLs are used in modal footer links for each status card table."
        }));
        [
          { key: "fndcAlerts", label: "FNDC Alerts Target URL" },
          { key: "emergencyNews", label: "Emergency News Target URL" },
          { key: "waterOutages", label: "Water Outages Target URL" },
          { key: "powerOutages", label: "Power Outages Target URL" },
          { key: "nztaRoadClosures", label: "NZTA Target URL" },
          { key: "localRoadClosures", label: "Local Road Closures Target URL" },
          { key: "weatherWarnings", label: "Weather Warnings Target URL" },
          { key: "civilDefenceWarnings", label: "Civil Defence Warnings Target URL" }
        ].forEach(function (target) {
          runtimeTargetsBlock.appendChild(field(target.label, inputText(
            statsRuntimeCfg.statusTargetUrls[target.key] || defaultStatusTargetUrls[target.key] || "",
            function (v) { statsRuntimeCfg.statusTargetUrls[target.key] = String(v || "").trim(); }
          )));
        });
        runtimeTargetsBlock.appendChild(buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Reset Target URLs" })
        ]));
        runtimeTargetsBlock.lastChild.children[0].addEventListener("click", function () {
          Object.keys(defaultStatusTargetUrls).forEach(function (key) {
            statsRuntimeCfg.statusTargetUrls[key] = defaultStatusTargetUrls[key];
          });
          renderModulePanel(data, state);
        });
        panel.appendChild(runtimeTargetsBlock);

        var runtimeFiltersBlock = el("section", { class: "editor-section-block" });
        runtimeFiltersBlock.appendChild(el("h4", { text: "Status Filters" }));
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Active filter values: " + String(countActiveFilterValues()) + ". Hidden statuses are excluded from runtime counters and status tables."
        }));
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: formatFilterSummary()
        }));
        var filterPresetActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Clear All Filters" }),
          el("button", { type: "button", class: "editor-btn", text: "Apply Default Filters" }),
          el("button", { type: "button", class: "editor-btn", text: "High-Impact Preset" })
        ]);
        filterPresetActions.children[0].addEventListener("click", function () {
          applyRuntimeFilterPreset("clear");
          renderModulePanel(data, state);
        });
        filterPresetActions.children[1].addEventListener("click", function () {
          applyRuntimeFilterPreset("defaults");
          renderModulePanel(data, state);
        });
        filterPresetActions.children[2].addEventListener("click", function () {
          applyRuntimeFilterPreset("highImpact");
          renderModulePanel(data, state);
        });
        runtimeFiltersBlock.appendChild(filterPresetActions);

        var fndcSinceWrap = el("div", { class: "editor-field" });
        var fndcSinceValue = el("strong", { text: String(statsRuntimeCfg.fndcAlertsSinceDays || 14) + " days" });
        var fndcSinceLabelRow = el("div", { class: "editor-field-label-row" }, [
          el("label", { text: "FNDC Alerts Since Window" }),
          fndcSinceValue
        ]);
        var fndcSinceRange = el("input", {
          type: "range",
          min: "1",
          max: "120",
          step: "1",
          value: String(Math.max(1, Math.min(120, parseInt(statsRuntimeCfg.fndcAlertsSinceDays, 10) || 14)))
        });
        fndcSinceRange.addEventListener("input", function () {
          var n = parseInt(fndcSinceRange.value, 10);
          if (isNaN(n)) n = 14;
          n = Math.max(1, Math.min(120, n));
          statsRuntimeCfg.fndcAlertsSinceDays = n;
          fndcSinceValue.textContent = String(n) + " days";
          ON_EDITOR_DATA_CHANGED();
        });
        fndcSinceWrap.appendChild(fndcSinceLabelRow);
        fndcSinceWrap.appendChild(fndcSinceRange);
        runtimeFiltersBlock.appendChild(fndcSinceWrap);

        var newsSinceWrap = el("div", { class: "editor-field" });
        var newsSinceValue = el("strong", { text: String(statsRuntimeCfg.emergencyNewsSinceDays || 14) + " days" });
        var newsSinceLabelRow = el("div", { class: "editor-field-label-row" }, [
          el("label", { text: "Emergency News Since Window" }),
          newsSinceValue
        ]);
        var newsSinceRange = el("input", {
          type: "range",
          min: "1",
          max: "120",
          step: "1",
          value: String(Math.max(1, Math.min(120, parseInt(statsRuntimeCfg.emergencyNewsSinceDays, 10) || 14)))
        });
        newsSinceRange.addEventListener("input", function () {
          var n = parseInt(newsSinceRange.value, 10);
          if (isNaN(n)) n = 14;
          n = Math.max(1, Math.min(120, n));
          statsRuntimeCfg.emergencyNewsSinceDays = n;
          newsSinceValue.textContent = String(n) + " days";
          ON_EDITOR_DATA_CHANGED();
        });
        newsSinceWrap.appendChild(newsSinceLabelRow);
        newsSinceWrap.appendChild(newsSinceRange);
        runtimeFiltersBlock.appendChild(newsSinceWrap);
        runtimeFiltersBlock.appendChild(el("p", {
          class: "editor-note",
          text: "Timeframe sliders apply to FNDC Alerts and Emergency News status cards and their modal tables."
        }));

        var waterStatusDetails = el("details", { class: "editor-array-block" });
        waterStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Statuses (" + String((statsRuntimeCfg.waterOutageStatusFilter || []).length) + " selected)"
        }));
        ["Reported", "Current", "Restored", "Planned", "Unplanned", "Resolved"].forEach(function (statusType) {
          waterStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.waterOutageStatusFilter, statusType),
            function (v) {
              statsRuntimeCfg.waterOutageStatusFilter = toggleFilterValue(statsRuntimeCfg.waterOutageStatusFilter, statusType, !!v);
            }
          )));
        });
        waterStatusDetails.appendChild(field("Water Status CSV (Advanced)", inputText(
          (statsRuntimeCfg.waterOutageStatusFilter || []).join(", "),
          function (v) { statsRuntimeCfg.waterOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(waterStatusDetails);
        var waterTypeDetails = el("details", { class: "editor-array-block" });
        waterTypeDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Water Outage Types (" + String((statsRuntimeCfg.waterOutageTypeFilter || []).length) + " selected)"
        }));
        ["Unplanned", "Planned", "Boil Water Notice", "Low Pressure", "Maintenance"].forEach(function (waterType) {
          waterTypeDetails.appendChild(field("Include " + waterType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.waterOutageTypeFilter, waterType),
            function (v) {
              statsRuntimeCfg.waterOutageTypeFilter = toggleFilterValue(statsRuntimeCfg.waterOutageTypeFilter, waterType, !!v);
            }
          )));
        });
        waterTypeDetails.appendChild(field("Water Type CSV (Advanced)", inputText(
          (statsRuntimeCfg.waterOutageTypeFilter || []).join(", "),
          function (v) { statsRuntimeCfg.waterOutageTypeFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(waterTypeDetails);
        var powerStatusDetails = el("details", { class: "editor-array-block" });
        powerStatusDetails.appendChild(el("summary", {
          class: "editor-array-summary",
          text: "Power Outage Statuses (" + String((statsRuntimeCfg.powerOutageStatusFilter || []).length) + " selected)"
        }));
        ["unplanned", "plannedActive", "planned"].forEach(function (statusType) {
          powerStatusDetails.appendChild(field("Include " + statusType, inputCheckbox(
            hasFilterValue(statsRuntimeCfg.powerOutageStatusFilter, statusType),
            function (v) {
              statsRuntimeCfg.powerOutageStatusFilter = toggleFilterValue(statsRuntimeCfg.powerOutageStatusFilter, statusType, !!v);
            }
          )));
        });
        powerStatusDetails.appendChild(field("Power Status CSV (Advanced)", inputText(
          (statsRuntimeCfg.powerOutageStatusFilter || []).join(", "),
          function (v) { statsRuntimeCfg.powerOutageStatusFilter = parseCsvList(v); },
          "Manual override"
        )));
        runtimeFiltersBlock.appendChild(powerStatusDetails);
        panel.appendChild(runtimeFiltersBlock);

        var statsQuickActions = buttonRow([
          el("button", { type: "button", class: "editor-btn", text: "Enable All Live Sources" }),
          el("button", { type: "button", class: "editor-btn", text: "Disable All Live Sources" }),
          el("button", { type: "button", class: "editor-btn", text: "Reset Stats Runtime Defaults" })
        ]);
        statsQuickActions.children[0].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = true;
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        statsQuickActions.children[1].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = false;
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = false; });
          renderModulePanel(data, state);
        });
        statsQuickActions.children[2].addEventListener("click", function () {
          statsRuntimeCfg.enableLiveCounts = true;
          statsRuntimeCfg.autoRefreshEnabled = false;
          statsRuntimeCfg.refreshIntervalMs = 120000;
          statsRuntimeCfg.showConnectionStatus = true;
          statsRuntimeCfg.showLastUpdated = true;
          statsRuntimeCfg.waterOutageStatusFilter = ["Reported"];
          statsRuntimeCfg.waterOutageTypeFilter = [];
          statsRuntimeCfg.powerOutageStatusFilter = ["unplanned", "plannedActive", "planned"];
          statsRuntimeCfg.fndcAlertsSinceDays = 14;
          statsRuntimeCfg.emergencyNewsSinceDays = 14;
          statsRuntimeCfg.statusTargetUrls = getDefaultStatusTargetUrls();
          cardPageDefs.forEach(function (def) { liveSourcesCfg[def.sourceKey] = true; });
          renderModulePanel(data, state);
        });
        var runtimeActionsBlock = el("section", { class: "editor-section-block" });
        runtimeActionsBlock.appendChild(el("h4", { text: "Runtime Quick Actions" }));
        runtimeActionsBlock.appendChild(statsQuickActions);
        panel.appendChild(runtimeActionsBlock);
      } else {
        var activeDef = cardPageDefs.find(function (d) { return d.pageId === statsPage; }) || cardPageDefs[0];
        var activeCard = getCardByLabel(activeDef.label);
        panel.appendChild(el("h4", { text: activeDef.label + " Page" }));
        panel.appendChild(el("p", {
          class: "editor-note",
          text: "Page-level editor for this status card. Live source toggle is repeated here for faster tuning."
        }));
        panel.appendChild(field(activeDef.sourceLabel, inputCheckbox(
          liveSourcesCfg[activeDef.sourceKey] !== false,
          function (v) { liveSourcesCfg[activeDef.sourceKey] = !!v; }
        )));
        renderCardFields(activeCard);
      }

      if (statsPage === "runtime" || statsPage === "overview") {
        var advancedCardsWrap = el("details", { class: "editor-array-block" });
        advancedCardsWrap.appendChild(el("summary", { class: "editor-array-summary", text: "Advanced: All Cards List" }));
        advancedCardsWrap.appendChild(renderArrayEditor({
          title: "Cards",
          arr: statsSection.cards,
          getSummary: function (item) {
            return (item && item.label) ? item.label : "Card";
          },
          addNewItem: function () {
            return {
              label: "New Card",
              number: 0,
              description: "Description",
              url: "#",
              colorClass: "grey",
              external: false,
              ariaLabel: ""
            };
          },
          renderItemFields: function (item) {
            var box = el("div");
            box.appendChild(field("Label", inputText(item.label, function (v) { item.label = v; })));
            box.appendChild(field("Number", inputText(String(typeof item.number === "number" ? item.number : 0), function (v) {
              var n = parseInt(v, 10);
              item.number = isNaN(n) ? 0 : n;
            })));
            box.appendChild(field("Description", inputText(item.description, function (v) { item.description = v; })));
            box.appendChild(field("Link URL", inputText(item.url, function (v) { item.url = v; })));
            box.appendChild(field("Open In New Tab", inputCheckbox(!!item.external, function (v) { item.external = !!v; })));
            box.appendChild(field("Aria Label (Optional)", inputText(item.ariaLabel, function (v) { item.ariaLabel = v; })));
            box.appendChild(field("Colour Class", inputSelect(item.colorClass || "grey", [
              { value: "grey", label: "Grey" },
              { value: "teal", label: "Teal" },
              { value: "orange", label: "Orange" },
              { value: "red", label: "Red" }
            ], function (v) { item.colorClass = v; })));
            return box;
          },
          onChange: function () { renderModulePanel(data, state); }
        }));
        panel.appendChild(advancedCardsWrap);
      }
    }

    if (moduleId === "tiles") {
      var tilesSection = ensureObj(data, "tilesSection");
      panel.appendChild(field("Section Title", inputText(tilesSection.title, function (v) { tilesSection.title = v; })));
      panel.appendChild(field("Section Subtitle", inputText(tilesSection.subtitle, function (v) { tilesSection.subtitle = v; })));

      // Groups editor
      panel.appendChild(renderArrayEditor({
        title: "Groups",
        arr: Array.isArray(tilesSection.groups) ? tilesSection.groups : (tilesSection.groups = []),
        getSummary: function (g) { return (g && g.title) ? g.title : "Group"; },
        addNewItem: function () { return { id: "group_" + String(Date.now()), title: "New Group", description: "", tiles: [] }; },
        renderItemFields: function (group) {
          var box = el("div");
          box.appendChild(field("Group Title", inputText(group.title, function (v) { group.title = v; })));
          box.appendChild(field("Group Description", inputText(group.description, function (v) { group.description = v; })));

          group.tiles = Array.isArray(group.tiles) ? group.tiles : [];
          box.appendChild(renderArrayEditor({
            title: "Tiles",
            arr: group.tiles,
            getSummary: function (t) { return (t && t.title) ? t.title : "Tile"; },
            addNewItem: function () {
              return { title: "New Tile", description: "", icon: "âž¡ï¸", colorClass: "neutral", url: "#", external: false, metaTop: "", metaBottom: "" };
            },
            renderItemFields: function (tile) {
              var tb = el("div");
              tb.appendChild(field("Title", inputText(tile.title, function (v) { tile.title = v; })));
              tb.appendChild(field("Description", inputText(tile.description, function (v) { tile.description = v; })));
              tb.appendChild(field("Icon", inputText(tile.icon, function (v) { tile.icon = v; })));
              tb.appendChild(field("URL", inputText(tile.url, function (v) { tile.url = v; })));
              tb.appendChild(field("Open In New Tab", inputCheckbox(tile.external, function (v) { tile.external = v; })));
              tb.appendChild(field("Colour Class", inputSelect(tile.colorClass, [
                { value: "neutral", label: "Neutral" },
                { value: "teal", label: "Teal" },
                { value: "orange", label: "Orange" },
                { value: "red", label: "Red" }
              ], function (v) { tile.colorClass = v; })));
              tb.appendChild(field("Meta Top", inputText(tile.metaTop, function (v) { tile.metaTop = v; })));
              tb.appendChild(field("Meta Bottom", inputText(tile.metaBottom, function (v) { tile.metaBottom = v; })));
              return tb;
            },
            onChange: function () { renderModulePanel(data, state); }
          }));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));

      panel.appendChild(renderArrayEditor({
        title: "Quick Links",
        arr: Array.isArray(tilesSection.quickLinks) ? tilesSection.quickLinks : (tilesSection.quickLinks = []),
        getSummary: function (q) { return (q && q.label) ? q.label : "Link"; },
        addNewItem: function () { return { label: "New Link", url: "#" }; },
        renderItemFields: function (q) {
          var box = el("div");
          box.appendChild(field("Label", inputText(q.label, function (v) { q.label = v; })));
          box.appendChild(field("URL", inputText(q.url, function (v) { q.url = v; })));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "social") {
      var social = ensureObj(data, "socialFeedsSection");
      panel.appendChild(field("Section Title", inputText(social.title, function (v) { social.title = v; })));
      panel.appendChild(field("Section Subtitle", inputText(social.subtitle, function (v) { social.subtitle = v; })));
      panel.appendChild(field("Note", inputText(social.note, function (v) { social.note = v; }, "Shown below the feeds")));

      panel.appendChild(renderArrayEditor({
        title: "Tabs",
        arr: Array.isArray(social.tabs) ? social.tabs : (social.tabs = []),
        getSummary: function (t) { return (t && t.label) ? t.label : "Tab"; },
        addNewItem: function () {
          return { id: "tab_" + String(Date.now()), label: "New Tab", type: "iframe", iframeSrc: "about:blank" };
        },
        renderItemFields: function (t) {
          var box = el("div");
          box.appendChild(field("Id", inputText(t.id, function (v) { t.id = v; }, "Used internally")));
          box.appendChild(field("Label", inputText(t.label, function (v) { t.label = v; })));
          box.appendChild(field("Type", inputSelect(t.type || "iframe", [
            { value: "iframe", label: "Iframe" },
            { value: "facebook", label: "Facebook" },
            { value: "x", label: "X" }
          ], function (v) { t.type = v; })));
          box.appendChild(field("Iframe URL", inputText(t.iframeSrc, function (v) { t.iframeSrc = v; })));
          return box;
        },
        onChange: function () { renderModulePanel(data, state); }
      }));
    }

    if (moduleId === "footer") {
      var footer = ensureObj(data, "footer");
      panel.appendChild(field("Footer Line 1", inputText(footer.line1, function (v) { footer.line1 = v; })));
      panel.appendChild(field("Footer Line 2", inputText(footer.line2, function (v) { footer.line2 = v; })));
    }

    panel.appendChild(el("p", { class: "editor-note", text: "Save reloads the dashboard so map and alert scripts can reapply settings." }));
  }

  function initEditor() {
    var rawData = window.FNED_DASHBOARD_DATA;
    if (!rawData) return;
    var data = ensureLayout(deepClone(rawData));
    if (EditorConfigUtils && typeof EditorConfigUtils.sanitizeDashboardConfig === "function") {
      var initialSanitiseResult = EditorConfigUtils.sanitizeDashboardConfig(data);
      if (initialSanitiseResult && initialSanitiseResult.data) {
        data = initialSanitiseResult.data;
      }
    }

    var editBtn = $("#edit-toggle-btn");
    var backdrop = $("#editor-backdrop");
    var editorDrawer = backdrop ? backdrop.querySelector(".editor-drawer") : null;
    var closeBtn = $("#editor-close");
    var saveBtn = $("#editor-save");
    var validateBtn = $("#editor-validate");
    var exportBtn = $("#editor-export");
    var resetBtn = $("#editor-reset");
    var noteEl = $("#editor-note");
    var focusToggleBtn = $("#editor-focus-toggle");
    var captureToggleBtn = $("#editor-capture-toggle");
    var dirtyChip = $("#editor-dirty-chip");
    var lastSavedChip = $("#editor-last-saved-chip");

    if (!editBtn || !backdrop || !closeBtn || !saveBtn || !exportBtn || !resetBtn) return;

    var editCfg = (data.layout && data.layout.edit) ? data.layout.edit : {};
    var showButton = (editCfg.showButton !== false);
    var requireQueryParam = !!editCfg.requireQueryParam;
    var queryParam = editCfg.queryParam || "edit";

    if (!showButton) {
      editBtn.style.display = "none";
      return;
    }

    if (requireQueryParam) {
      var params = new URLSearchParams(location.search);
      if (!params.has(queryParam)) {
        editBtn.style.display = "none";
        return;
      }
    }

    var state = { activeModuleId: "header", focusMode: false, captureMode: false, situationPage: "overview", statsPage: "overview" };
    var isDirty = false;
    var isEditorOpen = false;
    var listenersBound = false;
    var lastActiveElement = null;
    var lastSavedStorageKey = (editCfg.storageKey || "fned_dashboard_override_v1") + "_last_saved_at";

    function formatSavedStamp(isoValue) {
      if (!isoValue) return "Last saved: not yet";
      var dt = new Date(isoValue);
      if (isNaN(dt.getTime())) return "Last saved: not yet";
      return "Last saved: " + dt.toLocaleString();
    }

    function setDirty(nextDirty) {
      isDirty = !!nextDirty;
      if (dirtyChip) {
        dirtyChip.classList.toggle("hidden", !isDirty);
      }
    }

    function refreshLastSavedLabel() {
      if (!lastSavedChip) return;
      var savedValue = "";
      try {
        savedValue = localStorage.getItem(lastSavedStorageKey) || "";
      } catch (error) {
        savedValue = "";
      }
      lastSavedChip.textContent = formatSavedStamp(savedValue);
    }

    function setNote(message) {
      if (!noteEl) return;
      noteEl.textContent = message || "";
    }

    function syncCaptureMode(modeOn) {
      var isOn = !!modeOn;
      state.captureMode = isOn;
      document.body.classList.toggle("editor-capture-mode", isOn);
      if (captureToggleBtn) {
        captureToggleBtn.textContent = isOn ? "Modal Capture Mode: On" : "Modal Capture Mode: Off";
      }
    }

    function getFocusableEditorElements() {
      if (!editorDrawer) return [];
      var focusable = editorDrawer.querySelectorAll(
        "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      return Array.prototype.filter.call(focusable, function (node) {
        return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
      });
    }

    function maybeCloseEditor() {
      if (!isEditorOpen) return;
      if (isDirty) {
        var shouldDiscard = window.confirm("You have unsaved changes. Close the editor without saving?");
        if (!shouldDiscard) return;
      }
      closeEditor();
    }

    function validateCurrentData() {
      if (window.FNED_APP && typeof window.FNED_APP.validateData === "function") {
        return window.FNED_APP.validateData(data);
      }
      if (EditorConfigUtils && typeof EditorConfigUtils.sanitizeDashboardConfig === "function") {
        return EditorConfigUtils.sanitizeDashboardConfig(data);
      }
      return {
        data: data,
        validation: { errors: [], warnings: [] }
      };
    }

    function bindEditorListeners() {
      if (listenersBound) return;
      backdrop.addEventListener("click", onBackdropClick);
      document.addEventListener("keydown", onKeyDown);
      listenersBound = true;
    }

    function unbindEditorListeners() {
      if (!listenersBound) return;
      backdrop.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      listenersBound = false;
    }

    function openEditor() {
      if (isEditorOpen) {
        renderModulesList(data, state);
        renderQuickNav(data, state);
        renderModulePanel(data, state);
        return;
      }
      lastActiveElement = document.activeElement;
      isEditorOpen = true;
      setEditMode(true);
      renderModulesList(data, state);
      renderQuickNav(data, state);
      renderModulePanel(data, state);
      syncFocusMode(state);
      setDirty(false);
      refreshLastSavedLabel();
      syncCaptureMode(!!state.captureMode);
      setNote("Saved changes are stored locally in your browser. Validate checks config and reset clears local changes.");
      bindEditorListeners();
      try { closeBtn.focus(); } catch (focusErr) {}
    }

    function closeEditor() {
      if (!isEditorOpen) return;
      isEditorOpen = false;
      syncCaptureMode(false);
      setEditMode(false);
      syncFocusMode({ activeModuleId: "", focusMode: false });
      unbindEditorListeners();
      if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        try { lastActiveElement.focus(); } catch (focusErr) {}
      }
    }

    function onBackdropClick(e) {
      if (e.target === backdrop) maybeCloseEditor();
    }

    function onKeyDown(e) {
      if (!isEditorOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        maybeCloseEditor();
        return;
      }
      if (e.key !== "Tab") return;
      var focusable = getFocusableEditorElements();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    editBtn.addEventListener("click", function () {
      if (document.body.classList.contains("edit-mode")) maybeCloseEditor();
      else openEditor();
    });

    closeBtn.addEventListener("click", function () { maybeCloseEditor(); });
    ON_EDITOR_DATA_CHANGED = function () { setDirty(true); };

    if (focusToggleBtn) {
      focusToggleBtn.addEventListener("click", function () {
        state.focusMode = !state.focusMode;
        focusToggleBtn.textContent = state.focusMode ? "Focus Mode: On" : "Focus Mode: Off";
        syncFocusMode(state);
      });
    }

    if (captureToggleBtn) {
      captureToggleBtn.addEventListener("click", function () {
        syncCaptureMode(!state.captureMode);
      });
    }

    if (validateBtn) {
      validateBtn.addEventListener("click", function () {
        var result = validateCurrentData();
        if (result && result.data) {
          data = result.data;
        }
        var validation = result && result.validation ? result.validation : { errors: [], warnings: [] };
        if (EditorConfigUtils && typeof EditorConfigUtils.formatValidationSummary === "function") {
          setNote(EditorConfigUtils.formatValidationSummary(validation));
        } else if (validation.errors && validation.errors.length) {
          setNote("Validation failed: " + validation.errors[0]);
        } else if (validation.warnings && validation.warnings.length) {
          setNote("Validation warnings: " + validation.warnings[0]);
        } else {
          setNote("Validation passed with no issues.");
        }
      });
    }

    saveBtn.addEventListener("click", function () {
      if (!window.FNED_APP || typeof window.FNED_APP.saveDataAndReload !== "function") return;
      var result = validateCurrentData();
      if (result && result.data) {
        data = result.data;
      }
      var validation = result && result.validation ? result.validation : { errors: [], warnings: [] };
      if (validation.errors && validation.errors.length) {
        if (EditorConfigUtils && typeof EditorConfigUtils.formatValidationSummary === "function") {
          setNote(EditorConfigUtils.formatValidationSummary(validation));
        } else {
          setNote("Cannot save due to validation errors.");
        }
        return;
      }
      setDirty(false);
      var saveResult = window.FNED_APP.saveDataAndReload(data);
      if (saveResult && saveResult.ok === false) {
        setDirty(true);
        if (saveResult.error === "quota_exceeded") {
          var cleanedCount = Array.isArray(saveResult.removedKeys) ? saveResult.removedKeys.length : 0;
          if (cleanedCount > 0) {
            setNote("Save failed: browser storage quota exceeded after cleanup attempt (" + cleanedCount + " old key(s) removed). Reduce selected LINZ areas or clear browser site data, then try again.");
          } else {
            setNote("Save failed: browser storage quota exceeded. Reduce selected LINZ areas or clear browser site data, then try again.");
          }
        } else {
          setNote("Save failed: " + (saveResult.message || "local storage write failed."));
        }
      }
    });

    exportBtn.addEventListener("click", function () {
      downloadText("fned_dashboard_config.json", JSON.stringify(data, null, 2), "application/json");
    });

    resetBtn.addEventListener("click", function () {
      if (!window.FNED_APP || typeof window.FNED_APP.resetDataAndReload !== "function") return;
      window.FNED_APP.resetDataAndReload();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor);
  } else {
    initEditor();
  }
})();

