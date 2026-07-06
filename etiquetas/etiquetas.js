(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var esc = LabelRender.esc;
  var styleStr = LabelRender.styleStr;

  var view = 'list';
  var list = { search: '', catFilter: null, modelFilter: null, filterOpen: false, previewId: null, qty: 1 };
  var creator = null; // set when entering 'crear'

  function decorate(e) {
    var prod = Store.getProd(e.prodId);
    var modelo = Store.getModelo(e.modelId);
    var cat = prod ? Store.getCat(prod.cat) : null;
    return {
      raw: e,
      prod: prod, modelo: modelo, cat: cat,
      prodName: prod ? prod.name : '(producto eliminado)',
      modelName: modelo ? modelo.name : '(modelo eliminado)',
      catName: cat ? cat.name : 'Sin categoría',
      catColor: cat ? cat.color : '#9ca3af',
    };
  }

  function goList() { view = 'list'; render(); }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Etiquetas', subtitle: 'Crea etiquetas combinando un producto con un modelo de proceso.', crumb: 'Etiqueta / Etiquetas', headerButton: { label: 'Nueva etiqueta', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: creator.editId ? 'Editar etiqueta' : 'Nueva etiqueta',
        subtitle: creator.editId ? 'Modifica los parámetros y guarda los cambios.' : 'Selecciona un producto y un modelo para crear tu etiqueta.',
        crumb: 'Etiqueta / Etiquetas / ' + (creator.editId ? 'Editar' : 'Nueva'),
        headerButton: null,
      });
    }
  }

  // =================== LIST VIEW ===================
  function openNew() {
    view = 'crear';
    creator = { editId: null, selProd: null, selModelo: null, vals: {}, openFieldKey: null, prodSearch: '', prodCatFilter: null, prodPage: 0, modeloSearch: '', modeloPage: 0 };
    render();
  }
  function openEditEtiqueta(e) {
    view = 'crear';
    creator = { editId: e.id, selProd: e.prodId, selModelo: e.modelId, vals: Object.assign({}, e.vals || {}), openFieldKey: null, prodSearch: '', prodCatFilter: null, prodPage: 0, modeloSearch: '', modeloPage: 0 };
    render();
  }

  function chipsCatHTML() {
    var cats = Store.getCats();
    var all = Store.getEtiquetas().length;
    var items = [{ id: null, name: 'Todas', color: '#2F9CF5', icon: '#i-tag', count: all }].concat(cats.map(function (c) {
      var count = Store.getEtiquetas().filter(function (e) { var p = Store.getProd(e.prodId); return p && p.cat === c.id; }).length;
      return { id: c.id, name: c.name, color: c.color, icon: c.icon, count: count };
    }));
    return items.map(function (c) {
      var on = list.catFilter === c.id;
      return '<button type="button" class="chip ' + (on ? 'on' : '') + '" style="' + (on ? 'border-color:' + c.color + ';background:' + c.color + '18;color:' + c.color : '') + '" data-catf="' + (c.id || '') + '">' +
        '<span class="chipicon" style="background:' + c.color + '"><svg class="ic ic14"><use href="' + c.icon + '"></use></svg></span><span>' + esc(c.name) + '</span></button>';
    }).join('');
  }
  function chipsModelHTML() {
    var modelos = Store.getModelos();
    var all = Store.getEtiquetas().length;
    var items = [{ id: null, name: 'Todos los modelos', accent: '#94a3b8', count: all }].concat(modelos.map(function (m) {
      var count = Store.getEtiquetas().filter(function (e) { return e.modelId === m.id; }).length;
      return { id: m.id, name: m.name, accent: m.accent, count: count };
    }));
    return items.map(function (m) {
      var on = list.modelFilter === m.id;
      return '<button type="button" class="chip ' + (on ? 'on' : '') + '" style="' + (on ? 'border-color:' + m.accent + ';background:' + m.accent + '18;color:' + m.accent : '') + '" data-modelf="' + (m.id || '') + '">' +
        '<span class="dot" style="background:' + m.accent + ';flex-shrink:0"></span><span>' + esc(m.name) + '</span></button>';
    }).join('');
  }

  function collectChips(modelo, vals) {
    if (!modelo) return [];
    var out = [];
    ['rowsAbove', 'rowsBelow'].forEach(function (key) {
      var pfx = key === 'rowsAbove' ? 'efa' : 'efb';
      (modelo[key] || []).forEach(function (r, ri) {
        r.fields.forEach(function (f, fi) {
          var v = (vals || {})[pfx + '-' + ri + '-' + fi];
          if (v) out.push({ label: f.lbl, value: v });
        });
      });
    });
    return out.slice(0, 3);
  }

  function renderList() {
    var hasFilters = !!(list.catFilter || list.modelFilter);
    var filterCount = (list.catFilter ? 1 : 0) + (list.modelFilter ? 1 : 0);

    root.innerHTML = '' +
      '<div class="etiq-toolbar">' +
      '<div class="etiq-searchbar"><svg class="ic ic18" style="color:var(--t3);flex-shrink:0"><use href="#i-search"></use></svg>' +
      '<input id="etiq-search-input" placeholder="Buscar por producto..." value="' + esc(list.search) + '"></div>' +
      '<div class="etiq-filter-wrap"><button type="button" class="etiq-filter-btn ' + (hasFilters ? 'active' : '') + '" id="etiq-filter-btn"><svg class="ic ic16"><use href="#i-layers"></use></svg><span>Filtros</span>' +
      (hasFilters ? '<span class="etiq-filter-badge">' + filterCount + '</span>' : '') + '</button>' +
      '<div class="etiq-filter-drop" id="etiq-filter-drop" style="display:none">' +
      '<div class="etiq-filter-sect"><div class="etiq-filter-sect-lbl">Categoría</div><div class="etiq-filter-chips" id="etiq-cat-chips">' + chipsCatHTML() + '</div></div>' +
      '<div class="etiq-filter-sect"><div class="etiq-filter-sect-lbl">Modelo</div><div class="etiq-filter-chips" id="etiq-model-chips">' + chipsModelHTML() + '</div></div>' +
      '</div></div></div>' +
      '<div id="etiq-results"></div>';

    document.getElementById('etiq-search-input').addEventListener('input', function (e) { list.search = e.target.value; refreshResults(); });
    var fbtn = document.getElementById('etiq-filter-btn');
    var fdrop = document.getElementById('etiq-filter-drop');
    fbtn.addEventListener('click', function (e) { e.stopPropagation(); list.filterOpen = !list.filterOpen; fdrop.style.display = list.filterOpen ? 'block' : 'none'; });
    document.addEventListener('click', function (e) { if (!fdrop.contains(e.target) && e.target !== fbtn) fdrop.style.display = 'none'; });
    wireFilterChips();
    refreshResults();
  }

  function wireFilterChips() {
    document.getElementById('etiq-cat-chips').querySelectorAll('[data-catf]').forEach(function (b) {
      b.addEventListener('click', function () { list.catFilter = b.getAttribute('data-catf') || null; refreshChipsAndResults(); });
    });
    document.getElementById('etiq-model-chips').querySelectorAll('[data-modelf]').forEach(function (b) {
      b.addEventListener('click', function () { list.modelFilter = b.getAttribute('data-modelf') || null; refreshChipsAndResults(); });
    });
  }

  function refreshChipsAndResults() {
    document.getElementById('etiq-cat-chips').innerHTML = chipsCatHTML();
    document.getElementById('etiq-model-chips').innerHTML = chipsModelHTML();
    wireFilterChips();
    var hasFilters = !!(list.catFilter || list.modelFilter);
    var filterCount = (list.catFilter ? 1 : 0) + (list.modelFilter ? 1 : 0);
    var fbtn = document.getElementById('etiq-filter-btn');
    fbtn.className = 'etiq-filter-btn ' + (hasFilters ? 'active' : '');
    fbtn.innerHTML = '<svg class="ic ic16"><use href="#i-layers"></use></svg><span>Filtros</span>' + (hasFilters ? '<span class="etiq-filter-badge">' + filterCount + '</span>' : '');
    refreshResults();
  }

  function refreshResults() {
    var q = list.search.toLowerCase();
    var items = Store.getEtiquetas().map(decorate).filter(function (d) {
      if (list.catFilter && (!d.prod || d.prod.cat !== list.catFilter)) return false;
      if (list.modelFilter && d.raw.modelId !== list.modelFilter) return false;
      if (q && d.prodName.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    var cardsHTML = items.map(function (d) {
      var headerBg = d.modelo ? (d.modelo.scheme === 'bw' ? '#111827' : d.modelo.accent) : '#9ca3af';
      var chips = collectChips(d.modelo, d.raw.vals);
      var chipsHTML = chips.length ? '<div class="etiq-card-vals">' + chips.map(function (c) {
        return '<div class="etiq-card-val"><span class="etiq-card-val-lbl">' + esc(c.label) + '</span><div class="etiq-card-val-sep"></div><span class="etiq-card-val-v">' + esc(c.value) + '</span></div>';
      }).join('') + '</div>' : '';
      return '<div class="etiq-card" data-preview="' + d.raw.id + '">' +
        '<div class="etiq-card-accent" style="background:' + headerBg + '"></div>' +
        '<div class="etiq-card-body">' +
        '<div style="display:flex;align-items:center;gap:10px"><span class="etiq-card-prod">' + esc(d.prodName) + '</span>' +
        '<span class="etiq-card-cat" style="background:' + d.catColor + '18;color:' + d.catColor + ';border-color:' + d.catColor + '44">' + esc(d.catName) + '</span></div>' +
        '<div style="display:flex;align-items:center;gap:6px"><svg class="ic ic12" style="color:' + headerBg + ';flex-shrink:0"><use href="#i-tag"></use></svg>' +
        '<span style="font-size:12px;font-weight:600;color:var(--t2)">' + esc(d.modelName) + '</span></div>' + chipsHTML +
        '</div><div class="etiq-card-foot"><button type="button" class="etiq-card-edit" data-edit="' + d.raw.id + '"><svg class="ic ic14"><use href="#i-pencil"></use></svg>Editar</button></div></div>';
    }).join('');

    var wrap = document.getElementById('etiq-results');
    wrap.innerHTML = '' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><span class="muted" style="font-size:13px">' + items.length + ' etiquetas</span></div>' +
      (items.length
        ? '<div class="etiq-grid">' + cardsHTML + '</div>'
        : '<div class="empty" style="border-radius:24px;padding:80px 32px;border:1px dashed var(--line-2)"><div class="icb icb62" style="background:var(--brand-50);color:var(--brand);margin-bottom:22px"><svg class="ic ic28"><use href="#i-tag"></use></svg></div><h3 style="font-size:19px;color:var(--t1);margin:0 0 10px">No hay etiquetas aún</h3><p style="max-width:360px;margin:0;font-size:14.5px;color:var(--t3);line-height:1.5">Crea tu primera etiqueta combinando un producto con un modelo de impresión.</p></div>') +
      (list.previewId ? previewOverlayHTML() : '');

    wrap.querySelectorAll('[data-preview]').forEach(function (card) {
      card.addEventListener('click', function () { list.previewId = card.getAttribute('data-preview'); list.qty = 1; refreshResults(); });
    });
    wrap.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var d = decorate(Store.getEtiqueta(btn.getAttribute('data-edit')));
        openEditEtiqueta(d.raw);
      });
    });
    wirePreviewOverlay();
  }

  function previewOverlayHTML() {
    var d = decorate(Store.getEtiqueta(list.previewId));
    if (!d.modelo || !d.prod) {
      return '<div class="etiq-preview-overlay"><div class="etiq-overlay-bg" id="etiq-ov-bg"></div><div class="etiq-overlay-box"><div class="etiq-overlay-body">Elemento no disponible.</div></div></div>';
    }
    var renderHTML = LabelRender.renderStatic(d.modelo, { size: 'big', prodName: d.prodName, values: d.raw.vals });
    return '' +
      '<div class="etiq-preview-overlay">' +
      '<div class="etiq-overlay-bg" id="etiq-ov-bg"></div>' +
      '<div class="etiq-overlay-box">' +
      '<div class="etiq-overlay-head"><div class="icb icb44" style="background:var(--brand-50);color:var(--brand)"><svg class="ic ic20"><use href="#i-tag"></use></svg></div>' +
      '<div class="etiq-overlay-title">' + esc(d.prodName) + '<div style="font-size:12px;font-weight:500;color:var(--t3);margin-top:2px">Modelo: ' + esc(d.modelName) + '</div></div>' +
      '<button type="button" class="iconbtn" id="etiq-ov-close"><svg class="ic ic18"><use href="#i-x"></use></svg></button></div>' +
      '<div class="etiq-overlay-body">' +
      '<div class="etiq-overlay-render">' + renderHTML + '</div>' +
      '<div class="etiq-qty-row"><span class="etiq-qty-lbl">Cantidad de copias</span>' +
      '<div class="etiq-qty-ctrl"><button type="button" class="etiq-qty-btn" id="etiq-qty-dec">−</button>' +
      '<input class="etiq-qty-val" type="number" min="1" id="etiq-qty-input" value="' + list.qty + '">' +
      '<button type="button" class="etiq-qty-btn" id="etiq-qty-inc">+</button></div></div>' +
      '<button type="button" class="etiq-print-btn" id="etiq-print-btn"><svg class="ic ic18"><use href="#i-printer"></use></svg><span>Imprimir ' + (list.qty > 1 ? list.qty + ' copias' : '1 copia') + '</span></button>' +
      '</div></div></div>';
  }

  function wirePreviewOverlay() {
    var bg = document.getElementById('etiq-ov-bg');
    if (!bg) return;
    bg.addEventListener('click', function () { list.previewId = null; refreshResults(); });
    document.getElementById('etiq-ov-close').addEventListener('click', function () { list.previewId = null; refreshResults(); });
    document.getElementById('etiq-qty-dec').addEventListener('click', function () { list.qty = Math.max(1, list.qty - 1); refreshResults(); });
    document.getElementById('etiq-qty-inc').addEventListener('click', function () { list.qty = list.qty + 1; refreshResults(); });
    document.getElementById('etiq-qty-input').addEventListener('input', function (e) {
      list.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      document.getElementById('etiq-print-btn').querySelector('span').textContent = 'Imprimir ' + (list.qty > 1 ? list.qty + ' copias' : '1 copia');
    });
    document.getElementById('etiq-print-btn').addEventListener('click', function () {
      Store.bumpPrintCount(list.previewId, list.qty);
      window.print();
    });
  }

  // =================== CREATOR VIEW ===================
  function saveEtiqueta() {
    if (creator.editId) Store.updateEtiqueta(creator.editId, { prodId: creator.selProd, modelId: creator.selModelo, vals: creator.vals });
    else Store.addEtiqueta({ prodId: creator.selProd, modelId: creator.selModelo, vals: creator.vals });
    goList();
  }
  function deleteEtiqueta() {
    if (!creator.editId) return;
    if (!confirm('¿Eliminar esta etiqueta?')) return;
    Store.deleteEtiqueta(creator.editId);
    goList();
  }
  function printAndKeep() {
    if (creator.editId) Store.bumpPrintCount(creator.editId, 1);
    window.print();
  }

  function ecFieldHTML(pfx, ri, fi, f) {
    var key = pfx + '-' + ri + '-' + fi;
    var val = creator.vals[key] || '';
    var isOpen = creator.openFieldKey === key;
    var isDate = ['fecha_elab', 'fecha_cad', 'datetime'].indexOf(f.type) !== -1;
    var isTime = f.type === 'hora';
    var isNum = ['temp', 'dias', 'peso'].indexOf(f.type) !== -1;
    var inputType = isDate ? 'date' : isTime ? 'time' : isNum ? 'number' : 'text';
    var modelo = Store.getModelo(creator.selModelo);
    var labelColor = modelo.scheme === 'bw' ? '#374151' : modelo.accent;
    var labelStyle = { fontSize: '10px', color: labelColor, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 };
    var valueStyle = { fontSize: '13px', fontWeight: 600, color: '#111827', letterSpacing: '-.01em', minHeight: '15px' };
    return '<div class="lr-field ec-field" data-field-key="' + key + '">' +
      '<div class="lr-lbl" style="' + styleStr(labelStyle) + '">' + esc(f.lbl) + '</div>' +
      '<div class="lr-val" style="' + styleStr(valueStyle) + '">' + (val ? esc(val) : '<span class="ec-val-empty" style="color:' + (modelo.scheme === 'bw' ? '#111827' : modelo.accent) + '"></span>') + '</div>' +
      (isOpen ? '<div class="ec-field-backdrop" data-cancel-field="1"></div>' +
        '<div class="ec-field-modal" data-stop="1">' +
        '<div class="ec-fm-head"><div class="ec-fm-ico"><svg class="ic ic18"><use href="#i-pencil"></use></svg></div>' +
        '<div><div class="ec-fm-title">' + esc(f.lbl) + '</div><div class="ec-fm-sub">Introduce el valor para este campo</div></div></div>' +
        '<input class="ec-fm-input" type="' + inputType + '" id="ec-fm-input" value="' + esc(val) + '" autofocus>' +
        '<div class="ec-fm-actions"><button type="button" class="btn btn-ghost f1" data-cancel-field="1">Cancelar</button>' +
        '<button type="button" class="btn btn-primary f1" data-save-field="' + key + '">Guardar</button></div></div>' : '') +
      '</div>';
  }

  function ecRowsHTML(rows, pfx) {
    return rows.map(function (r, ri) {
      var divider = ri > 0 ? '<div style="height:1px;background:' + (Store.getModelo(creator.selModelo).scheme === 'bw' ? 'rgba(0,0,0,.1)' : Store.getModelo(creator.selModelo).accent + '28') + ';margin:1px 0;flex-shrink:0"></div>' : '';
      var rowStyle = r.fields.length === 1 ? 'justify-content:center;text-align:center' : '';
      var fields = r.fields.map(function (f, fi) { return ecFieldHTML(pfx, ri, fi, f); }).join('');
      return divider + '<div class="lr-row" style="' + rowStyle + '">' + fields + '</div>';
    }).join('');
  }

  function creatorPreviewHTML() {
    if (creator.selProd === null || creator.selModelo === null) {
      return '<div class="etiq-empty-prev" style="margin-top:6px"><svg class="ic ic28"><use href="#i-tag"></use></svg>Selecciona un producto y un modelo<br>para previsualizar la etiqueta</div>';
    }
    var prod = Store.getProd(creator.selProd);
    var modelo = Store.getModelo(creator.selModelo);
    var hBg = modelo.scheme === 'bw' ? '#111827' : modelo.accent;
    var showLogoLeft = modelo.logoPos === 'left' || modelo.logoPos === 'both';
    var showLogoRight = modelo.logoPos === 'right' || modelo.logoPos === 'both';
    var wrapStyle = { background: '#fff', border: '1.5px solid rgba(0,0,0,.06)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column' };
    var html = '<div class="ec-prev-stage"><div class="ec-prev-inner"><div style="' + styleStr(wrapStyle) + '">';
    if ((modelo.rowsAbove || []).length) html += '<div class="lr-body" style="padding-bottom:8px">' + ecRowsHTML(modelo.rowsAbove, 'efa') + '</div>';
    html += '<div class="lr-header" style="background:' + hBg + '">' + (showLogoLeft ? '<div class="lr-logo-ph">LOGO</div>' : '') + '<span class="lr-namelbl">Nombre del producto</span>' + (showLogoRight ? '<div class="lr-logo-ph">LOGO</div>' : '') + '</div>';
    html += '<div class="lr-namebar" style="background:' + hBg + '"><div class="lr-namebar-text">' + esc(prod.name) + '</div></div>';
    if ((modelo.rowsBelow || []).length) html += '<div class="lr-body" style="padding-top:8px">' + ecRowsHTML(modelo.rowsBelow, 'efb') + '</div>';
    html += '</div></div></div>';
    return html;
  }

  function wireCreatorPreview() {
    var stage = document.getElementById('ec-preview-wrap');
    stage.querySelectorAll('[data-field-key]').forEach(function (fieldEl) {
      var key = fieldEl.getAttribute('data-field-key');
      fieldEl.addEventListener('click', function (e) {
        if (creator.openFieldKey === key) return;
        if (e.target.closest('[data-stop]')) return;
        creator.openFieldKey = key;
        refreshPreview();
      });
    });
    stage.querySelectorAll('[data-stop]').forEach(function (el) { el.addEventListener('click', function (e) { e.stopPropagation(); }); });
    stage.querySelectorAll('[data-cancel-field]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.stopPropagation(); creator.openFieldKey = null; refreshPreview(); });
    });
    var saveBtn = stage.querySelector('[data-save-field]');
    if (saveBtn) saveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var key = saveBtn.getAttribute('data-save-field');
      var input = document.getElementById('ec-fm-input');
      creator.vals[key] = input.value;
      creator.openFieldKey = null;
      refreshPreview();
    });
  }

  function refreshPreview() {
    document.getElementById('ec-preview-wrap').innerHTML = creatorPreviewHTML();
    wireCreatorPreview();
  }

  function refreshActions() {
    var box = document.getElementById('ec-actions-box');
    var hasSel = creator.selProd !== null && creator.selModelo !== null;
    box.innerHTML = '' +
      (creator.editId ? '<button type="button" class="btn ec-btn-danger" id="ec-delete"><svg class="ic ic18"><use href="#i-trash"></use></svg><span>Eliminar</span></button>' : '<span></span>') +
      '<div class="ec-actions-right">' +
      '<button type="button" class="btn btn-ghost" id="ec-cancel">Cancelar</button>' +
      (hasSel ? '<button type="button" class="btn btn-ghost" id="ec-pdf"><svg class="ic ic18"><use href="#i-archive"></use></svg><span>Descargar PDF</span></button>' +
        '<button type="button" class="btn btn-ghost" id="ec-print"><svg class="ic ic18"><use href="#i-printer"></use></svg><span>Imprimir</span></button>' +
        '<button type="button" class="btn btn-primary" id="ec-save"><svg class="ic ic18"><use href="#i-check"></use></svg><span>' + (creator.editId ? 'Actualizar etiqueta' : 'Guardar etiqueta') + '</span></button>' : '') +
      '</div>';
    if (creator.editId) document.getElementById('ec-delete').addEventListener('click', deleteEtiqueta);
    document.getElementById('ec-cancel').addEventListener('click', goList);
    if (hasSel) {
      document.getElementById('ec-pdf').addEventListener('click', printAndKeep);
      document.getElementById('ec-print').addEventListener('click', printAndKeep);
      document.getElementById('ec-save').addEventListener('click', saveEtiqueta);
    }
  }

  // ---- product picker ----
  function refreshProdPicker() {
    var PAGE = 6;
    var q = creator.prodSearch.toLowerCase();
    var cf = creator.prodCatFilter;
    var all = Store.getProds().filter(function (p) { return (!cf || p.cat === cf) && (!q || p.name.toLowerCase().indexOf(q) !== -1); });
    var totalPages = Math.max(1, Math.ceil(all.length / PAGE));
    var page = Math.min(creator.prodPage, totalPages - 1);
    var paged = all.slice(page * PAGE, (page + 1) * PAGE);

    var catsHTML = [{ id: null, name: 'Todos' }].concat(Store.getCats().map(function (c) { return { id: c.id, name: c.name }; })).map(function (c) {
      return '<button type="button" class="etiq-cc-chip ' + (creator.prodCatFilter === c.id ? 'on' : '') + '" data-pcatf="' + (c.id || '') + '">' + esc(c.name) + '</button>';
    }).join('');

    var itemsHTML = paged.map(function (p) {
      var cat = Store.getCat(p.cat);
      var sel = creator.selProd === p.id;
      return '<button type="button" class="' + (sel ? 'selprod-card sel' : 'selprod-card') + '" data-selprod="' + p.id + '">' +
        '<div class="icb icb34" style="background:' + (cat ? cat.color : '#ccc') + ';flex-shrink:0"><svg class="ic ic16"><use href="' + (cat ? cat.icon : '#i-leaf') + '"></use></svg></div>' +
        '<div style="text-align:left;min-width:0;overflow:hidden"><div class="selprod-name">' + esc(p.name) + '</div><div class="selprod-cat">' + esc(cat ? cat.name : '') + '</div></div></button>';
    }).join('');

    var pagerHTML = totalPages > 1 ? (
      '<div class="prod-pager"><button type="button" class="prod-pager-btn" id="prod-prev" ' + (page === 0 ? 'disabled' : '') + '><svg class="ic ic14" style="transform:rotate(90deg)"><use href="#i-chevron-down"></use></svg><span>Anterior</span></button>' +
      '<div class="prod-pager-dots">' + Array.from({ length: totalPages }, function (_, i) { return '<div class="prod-pager-dot ' + (i === page ? 'on' : '') + '"></div>'; }).join('') + '</div>' +
      '<button type="button" class="prod-pager-btn" id="prod-next" ' + (page >= totalPages - 1 ? 'disabled' : '') + '><span>Siguiente</span><svg class="ic ic14" style="transform:rotate(-90deg)"><use href="#i-chevron-down"></use></svg></button></div>'
    ) : '';

    var col = document.getElementById('prod-picker-col');
    col.querySelector('#prod-cats').innerHTML = catsHTML;
    col.querySelector('#prod-items').innerHTML = itemsHTML;
    col.querySelector('#prod-pager').innerHTML = pagerHTML;

    col.querySelectorAll('[data-pcatf]').forEach(function (b) { b.addEventListener('click', function () { creator.prodCatFilter = b.getAttribute('data-pcatf') || null; creator.prodPage = 0; refreshProdPicker(); }); });
    col.querySelectorAll('[data-selprod]').forEach(function (b) { b.addEventListener('click', function () { creator.selProd = b.getAttribute('data-selprod'); refreshProdPicker(); refreshModeloPicker(); refreshPreview(); refreshActions(); }); });
    var prevBtn = col.querySelector('#prod-prev'); if (prevBtn) prevBtn.addEventListener('click', function () { creator.prodPage = Math.max(0, page - 1); refreshProdPicker(); });
    var nextBtn = col.querySelector('#prod-next'); if (nextBtn) nextBtn.addEventListener('click', function () { creator.prodPage = Math.min(totalPages - 1, page + 1); refreshProdPicker(); });
  }

  function refreshModeloPicker() {
    var PAGE = 3;
    var q = creator.modeloSearch.toLowerCase();
    var all = Store.getModelos().filter(function (m) { return !q || m.name.toLowerCase().indexOf(q) !== -1 || (m.desc || '').toLowerCase().indexOf(q) !== -1; });
    var totalPages = Math.max(1, Math.ceil(all.length / PAGE));
    var page = Math.min(creator.modeloPage, totalPages - 1);
    var paged = all.slice(page * PAGE, (page + 1) * PAGE);

    var itemsHTML = paged.map(function (m) {
      var sel = creator.selModelo === m.id;
      var tags = LabelRender.fieldTags(m, 2).map(function (t) { return '<span class="selmod-v2-ftag">' + esc(t) + '</span>'; }).join('');
      return '<button type="button" class="' + (sel ? 'selmod-v2 sel' : 'selmod-v2') + '" data-selmodelo="' + m.id + '">' +
        '<div class="selmod-v2-accent" style="background:' + m.accent + '"><svg class="ic ic18" style="color:rgba(255,255,255,.85)"><use href="#i-tag"></use></svg></div>' +
        '<div class="selmod-v2-info"><div class="selmod-v2-name">' + esc(m.name) + '</div><div class="selmod-v2-desc">' + esc(m.desc || '') + '</div>' +
        '<div class="selmod-v2-fields">' + tags + '</div></div>' +
        '<div class="selmod-v2-check">' + (sel ? '<div class="icb icb28" style="background:var(--brand);flex-shrink:0"><svg class="ic ic14" style="color:#fff"><use href="#i-check"></use></svg></div>' : '') + '</div></button>';
    }).join('');

    var pagerHTML = totalPages > 1 ? (
      '<div class="prod-pager"><button type="button" class="prod-pager-btn" id="modelo-prev" ' + (page === 0 ? 'disabled' : '') + '><svg class="ic ic14" style="transform:rotate(90deg)"><use href="#i-chevron-down"></use></svg><span>Anterior</span></button>' +
      '<div class="prod-pager-dots">' + Array.from({ length: totalPages }, function (_, i) { return '<div class="prod-pager-dot ' + (i === page ? 'on' : '') + '"></div>'; }).join('') + '</div>' +
      '<button type="button" class="prod-pager-btn" id="modelo-next" ' + (page >= totalPages - 1 ? 'disabled' : '') + '><span>Siguiente</span><svg class="ic ic14" style="transform:rotate(-90deg)"><use href="#i-chevron-down"></use></svg></button></div>'
    ) : '';

    var col = document.getElementById('modelo-picker-col');
    col.querySelector('#modelo-items').innerHTML = itemsHTML;
    col.querySelector('#modelo-pager').innerHTML = pagerHTML;

    col.querySelectorAll('[data-selmodelo]').forEach(function (b) {
      b.addEventListener('click', function () {
        creator.selModelo = b.getAttribute('data-selmodelo');
        creator.vals = {}; creator.openFieldKey = null;
        refreshModeloPicker(); refreshPreview(); refreshActions();
      });
    });
    var prevBtn = col.querySelector('#modelo-prev'); if (prevBtn) prevBtn.addEventListener('click', function () { creator.modeloPage = Math.max(0, page - 1); refreshModeloPicker(); });
    var nextBtn = col.querySelector('#modelo-next'); if (nextBtn) nextBtn.addEventListener('click', function () { creator.modeloPage = Math.min(totalPages - 1, page + 1); refreshModeloPicker(); });
  }

  function renderCreator() {
    var isEdit = !!creator.editId;
    root.innerHTML = '' +
      '<div class="etiq-crear2">' +
      '<div class="ec-crear-header"><div class="ec-crear-title">' +
      '<div class="icb icb44" style="background:var(--brand-50);color:var(--brand)"><svg class="ic ic20"><use href="' + (isEdit ? '#i-pencil' : '#i-tag') + '"></use></svg></div>' +
      '<div><div style="font-size:20px;font-weight:700;color:var(--t1)">' + (isEdit ? 'Editar etiqueta' : 'Nueva etiqueta') + '</div>' +
      '<div style="font-size:13px;color:var(--t3);margin-top:2px">' + (isEdit ? 'Modifica los parámetros y guarda los cambios.' : 'Selecciona un producto y un modelo para crear tu etiqueta.') + '</div></div>' +
      '</div></div>' +
      '<div class="ec-toprow">' +
      '<div class="tips-card" style="margin-top:0">' +
      '<div class="tips-title"><svg class="ic ic15" style="color:var(--brand)"><use href="#i-star"></use></svg>Buenas prácticas de etiquetado</div>' +
      '<div class="tips-list">' +
      '<div class="tips-item"><div class="tips-dot" style="background:#EAF4FE"><svg class="ic ic12" style="color:#2F9CF5"><use href="#i-check"></use></svg></div><span>Verifica siempre la fecha antes de imprimir — un error en la caducidad puede causar problemas sanitarios.</span></div>' +
      '<div class="tips-item"><div class="tips-dot" style="background:#e7f9ee"><svg class="ic ic12" style="color:#22C55E"><use href="#i-check"></use></svg></div><span>El campo "Responsable" debe reflejar quien elaboró el producto, no quien imprimió la etiqueta.</span></div>' +
      '<div class="tips-item"><div class="tips-dot" style="background:#fff4e6"><svg class="ic ic12" style="color:#FF8D28"><use href="#i-check"></use></svg></div><span>Para congelación, registra la temperatura exacta del equipo, no la temperatura objetivo.</span></div>' +
      '<div class="tips-item"><div class="tips-dot" style="background:#fce7f4"><svg class="ic ic12" style="color:#EC4899"><use href="#i-check"></use></svg></div><span>Imprime la etiqueta inmediatamente antes de aplicarla para que los datos sean siempre actuales.</span></div>' +
      '</div></div>' +
      '<div class="ec-prev-card"><div class="lprev-title"><span>Vista previa</span>' + (creator.selProd !== null && creator.selModelo !== null ? '<span style="font-size:11px;color:var(--t3);font-weight:400;letter-spacing:0">Toca un campo para editarlo</span>' : '') + '</div>' +
      '<div id="ec-preview-wrap"></div></div>' +
      '</div>' +
      '<div class="ec-actions" id="ec-actions-box"></div>' +
      '<div class="ec-bottomrow">' +
      '<div class="etiq-creator-col" id="prod-picker-col">' +
      '<div class="etiq-sec-title"><svg class="ic ic16"><use href="#i-salad"></use></svg>1. Selecciona un producto</div>' +
      '<div class="etiq-creator-search"><svg class="ic ic14" style="color:var(--t3);flex-shrink:0"><use href="#i-search"></use></svg><input id="prod-search-input" placeholder="Buscar producto..."></div>' +
      '<div class="etiq-creator-cats" id="prod-cats"></div>' +
      '<div class="prod-page-grid" id="prod-items"></div>' +
      '<div id="prod-pager"></div>' +
      '</div>' +
      '<div class="etiq-creator-col" id="modelo-picker-col">' +
      '<div class="etiq-sec-title"><svg class="ic ic16"><use href="#i-tag"></use></svg>2. Selecciona un modelo</div>' +
      '<div class="etiq-creator-search"><svg class="ic ic14" style="color:var(--t3);flex-shrink:0"><use href="#i-search"></use></svg><input id="modelo-search-input" placeholder="Buscar modelo..."></div>' +
      '<div style="display:flex;flex-direction:column;gap:9px" id="modelo-items"></div>' +
      '<div id="modelo-pager"></div>' +
      '</div>' +
      '</div></div>';

    document.getElementById('prod-search-input').addEventListener('input', function (e) { creator.prodSearch = e.target.value; creator.prodPage = 0; refreshProdPicker(); });
    document.getElementById('modelo-search-input').addEventListener('input', function (e) { creator.modeloSearch = e.target.value; creator.modeloPage = 0; refreshModeloPicker(); });

    refreshProdPicker();
    refreshModeloPicker();
    refreshPreview();
    refreshActions();
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderCreator();
  }

  Shell.mount({ active: 'etiquetas', title: '', subtitle: '', crumb: '' });
  render();
})();
