(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var listState = { search: '', filter: 'todas', filterOpen: false };
  var form = null;
  var iconPicker = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() {
    view = 'edit'; editingId = null;
    form = { name: '', areaId: '', icon: '#i-package', notes: '', areaDropdownOpen: false };
    render();
  }

  function openEdit(inst) {
    view = 'edit'; editingId = inst.id;
    form = { name: inst.name, areaId: inst.areaId || '', icon: inst.icon, notes: inst.notes || '', areaDropdownOpen: false };
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('inst-name-input').focus(); return; }
    var payload = { name: name, areaId: form.areaId || null, icon: form.icon, notes: form.notes };
    if (editingId) Store.updateInstrumento(editingId, payload);
    else Store.addInstrumento(payload);
    goList();
  }

  function remove() {
    if (!editingId) return;
    if (!confirm('¿Eliminar este instrumento?')) return;
    Store.deleteInstrumento(editingId);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Instrumentos y equipos', subtitle: 'Registra los equipos, herramientas e instrumentos de cada área.', crumb: 'Registro / Instrumentos', headerButton: { label: 'Agregar instrumento', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar instrumento' : 'Nuevo instrumento',
        subtitle: 'Define el nombre, el área y el icono del instrumento.',
        crumb: editingId ? 'Instrumentos / Editar' : 'Instrumentos / Nuevo',
        headerButton: editingId ? { label: 'Eliminar instrumento', icon: '#i-trash', variant: 'danger', onClick: remove } : null,
      });
    }
  }

  // ---------------- list ----------------
  function areaOf(id) { return id ? Store.getArea(id) : null; }

  function filterChips() {
    var areas = Store.getAreas();
    var all = { id: 'todas', name: 'Todas', color: '#0F1524', icon: '#i-layers', count: Store.getInstrumentos().length };
    return [all].concat(areas.map(function (a) { return { id: a.id, name: a.name, color: a.color, icon: a.icon, count: a.count }; }));
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

  function matchingInstrumentos() {
    var q = listState.search.toLowerCase();
    var all = Store.getInstrumentos().map(function (i) {
      var a = areaOf(i.areaId);
      return Object.assign({}, i, { areaColor: a ? a.color : '#9ca3af', areaName: a ? a.name : 'Sin área' });
    });
    var filtered = listState.filter === 'todas' ? all : all.filter(function (i) { return i.areaId === listState.filter; });
    if (q) filtered = filtered.filter(function (i) { return i.name.toLowerCase().indexOf(q) !== -1; });
    return { filtered: filtered, total: all.length };
  }

  function renderList() {
    var chips = filterChips();
    var chipsHTML = chips.map(function (ch) { return chipHTML(ch, listState.filter === ch.id); }).join('');
    var hasFilter = listState.filter !== 'todas';

    root.innerHTML = '' +
      '<div class="toolbar">' +
      '<div class="searchbar"><svg class="ic ic20"><use href="#i-search"></use></svg>' +
      '<input id="inst-search-input" placeholder="Busca por nombre de instrumento..." value="' + esc(listState.search) + '"></div>' +
      '<div class="prod-filter-wrap">' +
      '<button type="button" class="iconbtn-lg prod-filter-btn ' + (hasFilter || listState.filterOpen ? 'prod-filter-active' : '') + '" id="inst-filter-btn"><svg class="ic ic20"><use href="#i-sliders"></use></svg>' +
      (hasFilter ? '<span class="etiq-filter-badge">1</span>' : '') + '</button>' +
      '<div class="prod-filter-drop" id="inst-filter-drop" style="display:none">' +
      '<div class="etiq-filter-sect"><div class="etiq-filter-sect-lbl">Área</div>' +
      '<div class="etiq-filter-chips" id="inst-filter-chips">' + chipsHTML + '</div></div></div>' +
      '</div></div>' +
      '<div class="chips chips-desktop" id="inst-chips-desktop">' + chipsHTML + '</div>' +
      '<div id="inst-grid-wrap"></div>';

    document.getElementById('inst-search-input').addEventListener('input', function (e) {
      listState.search = e.target.value;
      renderGridWrap();
    });
    var filterBtn = document.getElementById('inst-filter-btn');
    var drop = document.getElementById('inst-filter-drop');
    filterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      listState.filterOpen = !listState.filterOpen;
      drop.style.display = listState.filterOpen ? 'block' : 'none';
    });
    document.addEventListener('click', function (e) {
      if (!drop.contains(e.target) && e.target !== filterBtn) drop.style.display = 'none';
    });
    wireFilterClicks(document.getElementById('inst-filter-chips'));
    wireFilterClicks(document.getElementById('inst-chips-desktop'));
    renderGridWrap();
  }

  function renderGridWrap() {
    var wrap = document.getElementById('inst-grid-wrap');
    var res = matchingInstrumentos();
    var cardsHTML = res.filtered.map(function (i) {
      return '<div class="instcard" data-id="' + i.id + '">' +
        '<div class="instcard-top"><div class="icb icb50" style="background:' + i.areaColor + ';flex-shrink:0"><svg class="ic ic24"><use href="' + i.icon + '"></use></svg></div>' +
        '<div class="instcard-info"><div class="instname">' + esc(i.name) + '</div>' +
        '<div class="instmeta"><span class="dot" style="background:' + i.areaColor + '"></span><span>' + esc(i.areaName) + '</span></div></div>' +
        '<button type="button" class="iconbtn" data-edit="' + i.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div>' +
        (i.notes ? '<div class="instnotes">' + esc(i.notes) + '</div>' : '') +
        '</div>';
    }).join('');

    wrap.innerHTML = '' +
      '<div class="sectionhead"><h2>Tus instrumentos</h2><span class="muted">' + res.filtered.length + ' de ' + res.total + ' instrumentos</span></div>' +
      (res.filtered.length
        ? '<div class="instgrid">' + cardsHTML + '</div>'
        : '<div class="empty"><div class="icb icb62" style="background:var(--bg);color:var(--t3)"><svg class="ic ic28"><use href="#i-wrench"></use></svg></div><h3>Sin instrumentos en esta área</h3><p>Agrega un instrumento o elige otra área para verlos aquí.</p></div>');

    wrap.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = Store.getInstrumento(btn.getAttribute('data-edit'));
        if (i) openEdit(i);
      });
    });
  }

  // ---------------- edit ----------------
  function areaPickButtonHTML() {
    var a = form.areaId ? Store.getArea(form.areaId) : null;
    if (a) {
      return '<div class="catpick-preview" style="background:' + a.color + '"><svg class="ic ic18"><use href="' + a.icon + '"></use></svg></div><span class="catpick-name">' + esc(a.name) + '</span>';
    }
    return '<span class="catpick-placeholder">Selecciona un área...</span>';
  }

  function areaDropdownHTML() {
    return Store.getAreas().map(function (a) {
      return '<button type="button" class="catdrop-item ' + (a.id === form.areaId ? 'on' : '') + '" data-area="' + a.id + '">' +
        '<div class="catdrop-icon" style="background:' + a.color + '"><svg class="ic ic20"><use href="' + a.icon + '"></use></svg></div>' +
        '<div><div class="catdrop-name">' + esc(a.name) + '</div><div class="catdrop-sub">' + a.count + ' instrumentos</div></div></button>';
    }).join('');
  }

  function refreshPreview() {
    var a = form.areaId ? Store.getArea(form.areaId) : null;
    document.getElementById('pv-name').textContent = form.name || 'Instrumento';
    document.getElementById('pv-area').innerHTML = '<span class="dot" style="background:' + (a ? a.color : '#d1d5db') + '"></span>' + esc(a ? a.name : 'Sin área');
    document.getElementById('pv-icb').style.background = a ? a.color : '#d1d5db';
    document.getElementById('pv-icon-use').setAttribute('href', form.icon);
  }

  function renderEdit() {
    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="field"><label>Nombre del instrumento <span style="color:var(--red)">*</span></label>' +
      '<input class="input" id="inst-name-input" placeholder="Ej. Nevera 1" value="' + esc(form.name) + '"></div>' +
      '<div class="field"><label>Área</label>' +
      '<div class="catpicker"><button type="button" class="catpick-btn ' + (form.areaDropdownOpen ? 'open' : '') + '" id="areapick-btn">' + areaPickButtonHTML() +
      '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg></button>' +
      '<div class="catdrop" id="areadrop" style="display:none">' + areaDropdownHTML() + '</div></div></div>' +
      '<div class="field"><label>Selecciona un icono</label><div id="inst-icon-wrap"></div></div>' +
      '<div class="field"><label>Notas <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="inst-notes-input" placeholder="Detalles adicionales del equipo...">' + esc(form.notes) + '</textarea></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="inst-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar cambios</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="inst-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside">' +
      '<div class="sidecard"><div class="sidelabel">Vista previa</div>' +
      '<div class="pvcard"><div class="icb icb62" id="pv-icb" style="margin-bottom:16px">' +
      '<svg class="ic ic28"><use id="pv-icon-use" href="' + form.icon + '"></use></svg></div>' +
      '<div class="instname" id="pv-name">' + esc(form.name || 'Instrumento') + '</div>' +
      '<div class="instmeta" id="pv-area"></div>' +
      '</div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-wrench"></use></svg><span>Buenas prácticas</span></div>' +
      '<ul class="tiplist">' +
      '<li>Registra cada equipo relevante para tus labores de mantenimiento.</li>' +
      '<li>Vincúlalo a un área para poder filtrarlo más rápido.</li>' +
      '<li>Podrás elegirlo al armar el checklist de una labor.</li>' +
      '</ul></div></div></div>';

    document.getElementById('inst-name-input').addEventListener('input', function (e) {
      form.name = e.target.value;
      document.getElementById('pv-name').textContent = form.name || 'Instrumento';
    });
    document.getElementById('inst-notes-input').addEventListener('input', function (e) { form.notes = e.target.value; });

    var areaBtn = document.getElementById('areapick-btn');
    var areaDrop = document.getElementById('areadrop');
    areaBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      form.areaDropdownOpen = !form.areaDropdownOpen;
      areaDrop.style.display = form.areaDropdownOpen ? 'block' : 'none';
      areaBtn.classList.toggle('open', form.areaDropdownOpen);
    });
    areaDrop.querySelectorAll('[data-area]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.areaId = btn.getAttribute('data-area');
        form.areaDropdownOpen = false;
        areaDrop.style.display = 'none';
        areaBtn.classList.remove('open');
        areaBtn.innerHTML = areaPickButtonHTML() + '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg>';
        refreshPreview();
      });
    });
    document.addEventListener('click', function (e) {
      if (!areaDrop.contains(e.target) && e.target !== areaBtn) { areaDrop.style.display = 'none'; form.areaDropdownOpen = false; areaBtn.classList.remove('open'); }
    });

    iconPicker = Pickers.mountIconPicker(document.getElementById('inst-icon-wrap'), {
      selected: form.icon,
      onSelect: function (icon) { form.icon = icon; refreshPreview(); },
    });

    refreshPreview();
    document.getElementById('inst-save').addEventListener('click', save);
    document.getElementById('inst-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'instrumentos', title: '', subtitle: '', crumb: '' });
  render();
})();
