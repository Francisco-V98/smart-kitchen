(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var listState = { search: '', filter: 'todas', filterOpen: false };
  var form = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() {
    view = 'edit'; editingId = null;
    form = { name: '', cat: '', desc: '', appccEnabled: {}, appccOpen: { recepcion: true }, appccDays: {}, catDropdownOpen: false };
    render();
  }

  function openEdit(p) {
    view = 'edit'; editingId = p.id;
    form = { name: p.name, cat: p.cat, desc: p.desc || '', appccEnabled: Object.assign({}, p.appccEnabled || {}), appccOpen: {}, appccDays: Object.assign({}, p.appccDays || {}), catDropdownOpen: false };
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name || !form.cat) {
      if (!name) document.getElementById('prod-name-input').focus();
      alert('Completa el nombre y la categoría del producto.');
      return;
    }
    var payload = { name: name, cat: form.cat, desc: form.desc, appccEnabled: form.appccEnabled, appccDays: form.appccDays };
    if (editingId) Store.updateProd(editingId, payload);
    else Store.addProd(payload);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Productos etiquetados', subtitle: 'Administra los productos disponibles para tus etiquetas.', crumb: 'Etiqueta / Productos', headerButton: { label: 'Agregar producto', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar producto' : 'Nuevo producto',
        subtitle: 'Configura el nombre, categoría y parámetros APPCC del producto.',
        crumb: editingId ? 'Etiqueta / Productos / Editar' : 'Etiqueta / Productos / Nuevo',
        headerButton: null,
      });
    }
  }

  // ---------------- list ----------------
  function filterChips() {
    var cats = Store.getCats();
    var all = { id: 'todas', name: 'Todas', color: '#0F1524', icon: '#i-layers', count: Store.getProds().length };
    return [all].concat(cats.map(function (c) { return { id: c.id, name: c.name, color: c.color, icon: c.icon, count: c.count }; }));
  }

  function chipHTML(ch, active) {
    return '<button type="button" class="chip ' + (active ? 'on' : '') + '" data-filter="' + ch.id + '" style="' + (active ? 'box-shadow:inset 0 0 0 1.5px ' + ch.color : '') + '">' +
      '<span class="chipicon" style="background:' + ch.color + '"><svg class="ic ic16"><use href="' + ch.icon + '"></use></svg></span>' +
      '<span>' + esc(ch.name) + '</span><span class="chipcount">' + ch.count + '</span></button>';
  }

  function wireFilterClicks(container) {
    container.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        listState.filter = btn.getAttribute('data-filter');
        listState.filterOpen = false;
        renderList();
      });
    });
  }

  function matchingProducts() {
    var q = listState.search.toLowerCase();
    var cats = {}; Store.getCats().forEach(function (c) { cats[c.id] = c; });
    var all = Store.getProds().map(function (p) {
      var c = cats[p.cat];
      var pills = Object.keys(p.appccEnabled || {}).filter(function (k) { return p.appccEnabled[k]; }).map(function (k) {
        return Store.appccPillMeta[k] || { name: k, bg: '#f3f4f6', color: '#6b7280' };
      });
      return Object.assign({}, p, {
        color: c ? c.color : '#d1d5db', icon: c ? c.icon : '#i-package', catName: c ? c.name : 'Sin categoría', pills: pills,
      });
    });
    var filtered = listState.filter === 'todas' ? all : all.filter(function (p) { return p.cat === listState.filter; });
    if (q) filtered = filtered.filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1; });
    return { filtered: filtered, total: all.length };
  }

  function renderList() {
    var chips = filterChips();
    var chipsHTML = chips.map(function (ch) { return chipHTML(ch, listState.filter === ch.id); }).join('');
    var hasFilter = listState.filter !== 'todas';

    root.innerHTML = '' +
      '<div class="toolbar">' +
      '<div class="searchbar"><svg class="ic ic20"><use href="#i-search"></use></svg>' +
      '<input id="prod-search-input" placeholder="Busca por nombre de producto..." value="' + esc(listState.search) + '"></div>' +
      '<div class="prod-filter-wrap">' +
      '<button type="button" class="iconbtn-lg prod-filter-btn ' + (hasFilter || listState.filterOpen ? 'prod-filter-active' : '') + '" id="prod-filter-btn"><svg class="ic ic20"><use href="#i-sliders"></use></svg>' +
      (hasFilter ? '<span class="etiq-filter-badge">1</span>' : '') + '</button>' +
      '<div class="prod-filter-drop" id="prod-filter-drop" style="display:none">' +
      '<div class="etiq-filter-sect"><div class="etiq-filter-sect-lbl">Categoría</div>' +
      '<div class="etiq-filter-chips" id="prod-filter-chips">' + chipsHTML + '</div></div></div>' +
      '</div></div>' +
      '<div class="chips chips-desktop" id="prod-chips-desktop">' + chipsHTML + '</div>' +
      '<div id="prod-grid-wrap"></div>';

    document.getElementById('prod-search-input').addEventListener('input', function (e) {
      listState.search = e.target.value;
      renderGridWrap();
    });
    var filterBtn = document.getElementById('prod-filter-btn');
    var drop = document.getElementById('prod-filter-drop');
    filterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      listState.filterOpen = !listState.filterOpen;
      drop.style.display = listState.filterOpen ? 'block' : 'none';
    });
    document.addEventListener('click', function closeDrop(e) {
      if (!drop.contains(e.target) && e.target !== filterBtn) drop.style.display = 'none';
    });
    wireFilterClicks(document.getElementById('prod-filter-chips'));
    wireFilterClicks(document.getElementById('prod-chips-desktop'));
    renderGridWrap();
  }

  function renderGridWrap() {
    var wrap = document.getElementById('prod-grid-wrap');
    var res = matchingProducts();
    var cardsHTML = res.filtered.map(function (p) {
      var pillsHTML = p.pills.length ? '<div class="prodappcc">' + p.pills.map(function (pl) {
        return '<span class="procpill" style="background:' + pl.bg + ';color:' + pl.color + '">' + esc(pl.name) + '</span>';
      }).join('') + '</div>' : '';
      return '<div class="prodcard" data-id="' + p.id + '">' +
        '<div class="prodcard-top"><div class="icb icb50" style="background:' + p.color + ';flex-shrink:0"><svg class="ic ic24"><use href="' + p.icon + '"></use></svg></div>' +
        '<div class="prodcard-info"><div class="prodname">' + esc(p.name) + '</div>' +
        '<div class="prodcat"><span class="dot" style="background:' + p.color + '"></span><span>' + esc(p.catName) + '</span></div>' +
        (p.desc ? '<div class="proddesc">' + esc(p.desc) + '</div>' : '') + '</div>' +
        '<button type="button" class="iconbtn" data-edit="' + p.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div>' +
        pillsHTML + '</div>';
    }).join('');

    wrap.innerHTML = '' +
      '<div class="sectionhead"><h2>Tus productos</h2><span class="muted">' + res.filtered.length + ' de ' + res.total + ' productos</span></div>' +
      (res.filtered.length
        ? '<div class="prodgrid">' + cardsHTML + '</div>'
        : '<div class="empty"><div class="icb icb62" style="background:var(--bg);color:var(--t3)"><svg class="ic ic28"><use href="#i-package"></use></svg></div><h3>Sin productos en esta categoría</h3><p>Agrega un producto o elige otra categoría para verlos aquí.</p></div>');

    wrap.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = Store.getProd(btn.getAttribute('data-edit'));
        if (p) openEdit(p);
      });
    });
  }

  // ---------------- edit ----------------
  function catPickerButtonHTML() {
    var c = form.cat ? Store.getCat(form.cat) : null;
    if (c) {
      return '<div class="catpick-preview" style="background:' + c.color + '"><svg class="ic ic18"><use href="' + c.icon + '"></use></svg></div><span class="catpick-name">' + esc(c.name) + '</span>';
    }
    return '<span class="catpick-placeholder">Selecciona una categoría...</span>';
  }

  function catDropdownHTML() {
    return Store.getCats().map(function (c) {
      return '<button type="button" class="catdrop-item ' + (c.id === form.cat ? 'on' : '') + '" data-cat="' + c.id + '">' +
        '<div class="catdrop-icon" style="background:' + c.color + '"><svg class="ic ic20"><use href="' + c.icon + '"></use></svg></div>' +
        '<div><div class="catdrop-name">' + esc(c.name) + '</div><div class="catdrop-sub">' + c.count + ' productos</div></div></button>';
    }).join('');
  }

  function refreshPreview() {
    var c = form.cat ? Store.getCat(form.cat) : null;
    document.getElementById('lp-name').textContent = form.name || 'Producto';
    var lccat = document.getElementById('lp-cat');
    lccat.innerHTML = '<span class="dot" style="background:' + (c ? c.color : '#d1d5db') + '"></span>' + esc(c ? c.name : 'Sin categoría');
    document.getElementById('lp-icb').style.background = c ? c.color : '#d1d5db';
    document.getElementById('lp-icon-use').setAttribute('href', c ? c.icon : '#i-package');
    refreshActiveProcesses();
  }

  function refreshActiveProcesses() {
    var box = document.getElementById('lp-processes-wrap');
    var active = Store.appcSectionsData.filter(function (s) { return form.appccEnabled[s.id]; });
    if (!active.length) {
      box.innerHTML = '<div style="text-align:center;padding:14px 0 2px;font-size:13px;color:var(--t3);line-height:1.5">Activa un proceso APPCC<br>para ver la vista previa</div>';
      return;
    }
    var rows = active.slice(0, 5).map(function (s) {
      var priField = s.fields.find(function (f) { return f.sub.indexOf('Caducidad primaria') !== -1 || f.sub.indexOf('Fecha de recepción') !== -1 || f.sub.indexOf('Uso óptimo') !== -1; });
      var val = priField ? form.appccDays[priField.key] : '';
      return '<div class="lcproc"><span class="lcproc-name">' + esc(s.name) + '</span><span class="lcproc-days" style="color:' + s.color + '">' + (val ? esc(val) + ' días' : '— días') + '</span></div>';
    }).join('');
    box.innerHTML = '<div class="lcprocesses">' + rows + '</div>';
  }

  function appsecHTML(sec) {
    var enabled = !!form.appccEnabled[sec.id];
    var open = !!form.appccOpen[sec.id];
    var fieldsHTML = sec.fields.map(function (f) {
      var val = form.appccDays[f.key] !== undefined ? form.appccDays[f.key] : '';
      return '<div class="daysfield"><label>' + esc(f.label) + '<br><span class="sub">(' + esc(f.sub) + ')</span></label>' +
        '<input class="daysinput" type="number" min="0" placeholder="0" value="' + esc(val) + '" data-days-key="' + f.key + '"></div>';
    }).join('');
    return '<div class="appsec ' + (enabled ? 'enabled' : '') + '" data-sec="' + sec.id + '">' +
      '<div class="appsec-hd" data-toggle-open="' + sec.id + '">' +
      '<div class="appsec-icon" style="background:' + sec.color + '"><svg class="ic ic16"><use href="' + sec.icon + '"></use></svg></div>' +
      '<span class="appsec-name">' + esc(sec.name) + '</span>' +
      (enabled ? '<span class="appsec-cnt">' + sec.fields.length + ' campos</span>' : '') +
      '<label class="toggle" data-toggle-stop="1"><input type="checkbox" data-toggle-enabled="' + sec.id + '" ' + (enabled ? 'checked' : '') + '><span class="tslider"></span></label>' +
      '</div>' +
      (open ? '<div class="appsec-body"><div class="daysgrid">' + fieldsHTML + '</div></div>' : '') +
      '</div>';
  }

  function refreshAppsecs() {
    var box = document.getElementById('appsecs-box');
    box.innerHTML = Store.appcSectionsData.map(appsecHTML).join('');
    wireAppsecs();
  }

  function wireAppsecs() {
    var box = document.getElementById('appsecs-box');
    box.querySelectorAll('[data-toggle-open]').forEach(function (hd) {
      hd.addEventListener('click', function () {
        var id = hd.getAttribute('data-toggle-open');
        form.appccOpen[id] = !form.appccOpen[id];
        refreshAppsecs();
      });
    });
    box.querySelectorAll('[data-toggle-stop]').forEach(function (lbl) {
      lbl.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    box.querySelectorAll('[data-toggle-enabled]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-toggle-enabled');
        form.appccEnabled[id] = cb.checked;
        refreshAppsecs();
        refreshActiveProcesses();
      });
    });
    box.querySelectorAll('[data-days-key]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        form.appccDays[inp.getAttribute('data-days-key')] = inp.value;
        refreshActiveProcesses();
      });
    });
  }

  function renderEdit() {
    root.innerHTML = '' +
      '<div class="prodfwrap">' +
      '<div class="prodfcard">' +
      '<div class="formbasic">' +
      '<div class="field"><label>Nombre del producto <span style="color:var(--red)">*</span></label>' +
      '<input class="input" id="prod-name-input" placeholder="Ej. Pollo a la plancha" value="' + esc(form.name) + '"></div>' +
      '<div class="field"><label>Categoría <span style="color:var(--red)">*</span></label>' +
      '<div class="catpicker"><button type="button" class="catpick-btn ' + (form.catDropdownOpen ? 'open' : '') + '" id="catpick-btn">' + catPickerButtonHTML() +
      '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg></button>' +
      '<div class="catdrop" id="catdrop" style="display:none">' + catDropdownHTML() + '</div></div></div>' +
      '<div class="field"><label>Descripción <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="prod-desc-input" placeholder="Breve descripción del producto...">' + esc(form.desc) + '</textarea></div>' +
      '</div>' +
      '<div class="appcc-header"><div class="icb icb44" style="background:var(--brand-50);color:var(--brand)"><svg class="ic ic18"><use href="#i-clock"></use></svg></div>' +
      '<div><div class="appcc-titletext">Configuración APPCC</div><div style="font-size:12px;color:var(--t3);margin-top:2px">Activa los procesos que aplican a este producto</div></div>' +
      '<span class="appcc-badge-norm">RD 1021/2022</span></div>' +
      '<div class="appcc-hint">Según la normativa española de seguridad alimentaria, cada producto debe tener configurados los días de caducidad según el proceso aplicado. Solo activa los procesos que uses con este producto.</div>' +
      '<div class="appsecs" id="appsecs-box"></div>' +
      '<div class="editactions" style="margin-top:24px">' +
      '<button type="button" class="btn btn-primary f1" id="prod-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar producto</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="prod-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside" style="position:sticky;top:24px">' +
      '<div class="sidecard"><div class="sidelabel">Vista previa — Etiqueta</div>' +
      '<div class="lpcard">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:13px">' +
      '<div class="icb icb44" id="lp-icb"><svg class="ic ic20"><use id="lp-icon-use" href="#i-package"></use></svg></div>' +
      '<div><div class="lcprod" id="lp-name">' + esc(form.name || 'Producto') + '</div>' +
      '<div class="lccat" id="lp-cat"></div></div></div>' +
      '<div id="lp-processes-wrap"></div>' +
      '</div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-tag"></use></svg><span>¿Por qué estos campos?</span></div>' +
      '<ul class="tiplist">' +
      '<li>La normativa exige etiquetar según el proceso aplicado (congelación, apertura, elaboración…).</li>' +
      '<li>Solo activa los procesos que uses con este producto.</li>' +
      '<li>Los "días" calculan automáticamente la fecha de caducidad en la etiqueta.</li>' +
      '</ul></div></div></div>';

    document.getElementById('prod-name-input').addEventListener('input', function (e) {
      form.name = e.target.value;
      document.getElementById('lp-name').textContent = form.name || 'Producto';
    });
    document.getElementById('prod-desc-input').addEventListener('input', function (e) { form.desc = e.target.value; });

    var catBtn = document.getElementById('catpick-btn');
    var catDrop = document.getElementById('catdrop');
    catBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      form.catDropdownOpen = !form.catDropdownOpen;
      catDrop.style.display = form.catDropdownOpen ? 'block' : 'none';
      catBtn.classList.toggle('open', form.catDropdownOpen);
    });
    catDrop.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.cat = btn.getAttribute('data-cat');
        form.catDropdownOpen = false;
        catDrop.style.display = 'none';
        catBtn.classList.remove('open');
        catBtn.innerHTML = catPickerButtonHTML() + '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg>';
        refreshPreview();
      });
    });
    document.addEventListener('click', function (e) {
      if (!catDrop.contains(e.target) && e.target !== catBtn) { catDrop.style.display = 'none'; form.catDropdownOpen = false; catBtn.classList.remove('open'); }
    });

    refreshAppsecs();
    refreshPreview();

    document.getElementById('prod-save').addEventListener('click', save);
    document.getElementById('prod-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'productos', title: '', subtitle: '', crumb: '' });
  render();
})();
