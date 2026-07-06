(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list'; // 'list' | 'edit'
  var editingId = null; // null => creating new category
  var form = { name: '', color: '#2F9CF5', icon: '#i-leaf' };
  var iconSearch = '';
  var iconGalleryOpen = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goList() {
    view = 'list';
    editingId = null;
    render();
  }

  function openNew() {
    view = 'edit';
    editingId = null;
    form = { name: '', color: '#2F9CF5', icon: '#i-leaf' };
    iconSearch = ''; iconGalleryOpen = false;
    render();
  }

  function openEdit(cat) {
    view = 'edit';
    editingId = cat.id;
    form = { name: cat.name, color: cat.color, icon: cat.icon };
    iconSearch = ''; iconGalleryOpen = false;
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('cat-name-input').focus(); return; }
    if (editingId) Store.updateCat(editingId, { name: name, color: form.color, icon: form.icon });
    else Store.addCat({ name: name, color: form.color, icon: form.icon });
    goList();
  }

  function remove() {
    if (!editingId) return;
    var cat = Store.getCat(editingId);
    var n = Store.countProdsInCat(editingId);
    var msg = n > 0
      ? 'Eliminar "' + cat.name + '"? Hay ' + n + ' producto(s) en esta categoría que quedarán sin categoría.'
      : 'Eliminar la categoría "' + cat.name + '"?';
    if (!confirm(msg)) return;
    Store.deleteCat(editingId);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({
        title: 'Categorías', subtitle: 'Crea y organiza las categorías de alimentos de tu cocina.', crumb: 'Etiqueta / Categorías',
        headerButton: { label: 'Agregar categoría', icon: '#i-plus', onClick: openNew },
      });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar categoría' : 'Nueva categoría',
        subtitle: editingId ? 'Modifica el nombre, el color y el icono de la categoría.' : 'Define el nombre, color e icono de tu nueva categoría.',
        crumb: editingId ? 'Categorías / Editar' : 'Categorías / Nueva',
        headerButton: editingId ? { label: 'Eliminar categoría', icon: '#i-trash', variant: 'danger', onClick: remove } : null,
      });
    }
  }

  // ---------- list view ----------
  function renderList() {
    var cats = Store.getCats();
    var prods = Store.getProds();
    var etiquetas = Store.getEtiquetas();
    var stats = [
      { label: 'Categorías', value: '' + cats.length, icon: '#i-layers', color: '#2F9CF5' },
      { label: 'Productos etiquetados', value: '' + prods.length, icon: '#i-package', color: '#5558C9' },
      { label: 'Etiquetas activas', value: '' + etiquetas.length, icon: '#i-tag', color: '#22C55E' },
      { label: 'Por caducar', value: '9', icon: '#i-clock', color: '#FF8D28' },
    ];

    var statHTML = stats.map(function (s) {
      return '<div class="statcard"><div class="icb icb44" style="background:' + s.color + '"><svg class="ic ic20"><use href="' + s.icon + '"></use></svg></div>' +
        '<div><div class="statval">' + esc(s.value) + '</div><div class="statlbl">' + esc(s.label) + '</div></div></div>';
    }).join('');

    var cardsHTML = cats.map(function (c) {
      return '<div class="catcard" data-id="' + c.id + '">' +
        '<div class="catcard-top"><div class="icb icb50" style="background:' + c.color + '"><svg class="ic ic24"><use href="' + c.icon + '"></use></svg></div>' +
        '<button class="iconbtn" data-edit="' + c.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div>' +
        '<div class="catname">' + esc(c.name) + '</div>' +
        '<div class="catmeta"><span class="dot" style="background:' + c.color + '"></span><span>' + c.count + ' productos</span></div>' +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="statgrid">' + statHTML + '</div>' +
      '<div class="sectionhead"><h2>Tus categorías</h2><span class="muted">' + cats.length + ' categorías</span></div>' +
      '<div class="catgrid">' + cardsHTML + '</div>';

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = Store.getCat(btn.getAttribute('data-edit'));
        if (cat) openEdit(cat);
      });
    });
  }

  // ---------- edit view ----------
  function iconGridHTML() {
    var q = iconSearch.toLowerCase();
    var filtered = q ? Store.allIcons.filter(function (i) { return i.label.toLowerCase().indexOf(q) !== -1; }) : Store.allIcons;
    var list = (iconGalleryOpen || q) ? filtered : filtered.slice(0, 12);
    return list.map(function (i) {
      return '<button type="button" class="iconopt ' + (i.id === form.icon ? 'on' : '') + '" data-icon="' + i.id + '" title="' + esc(i.label) + '">' +
        '<svg class="ic ic20"><use href="' + i.id + '"></use></svg><span class="iconlabel">' + esc(i.label) + '</span></button>';
    }).join('');
  }

  function wireIconGrid() {
    var wrap = document.getElementById('ig-results');
    wrap.querySelectorAll('[data-icon]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.icon = btn.getAttribute('data-icon');
        iconSearch = ''; iconGalleryOpen = false;
        document.getElementById('ig-search-input').value = '';
        refreshIconGrid();
        refreshPreview();
      });
    });
  }

  function refreshIconGrid() {
    var wrap = document.getElementById('ig-results');
    wrap.innerHTML = iconGridHTML();
    var toggle = document.getElementById('ig-toggle');
    toggle.textContent = iconGalleryOpen ? 'Ver menos' : 'Ver todos (' + Store.allIcons.length + ' iconos)';
    wireIconGrid();
  }

  function refreshPreview() {
    document.getElementById('pv-icb').style.background = form.color;
    document.getElementById('pv-icon-use').setAttribute('href', form.icon);
    document.getElementById('pv-name').textContent = form.name || 'Nueva categoría';
    document.getElementById('pv-dot').style.background = form.color;
  }

  function paletteHTML() {
    return Store.palette.map(function (c) {
      var on = c === form.color;
      return '<button type="button" class="swatch" data-color="' + c + '" style="' + (on ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px ' + c : '') + '"><span class="swfill" style="background:' + c + '"></span></button>';
    }).join('');
  }

  function refreshSwatches() {
    document.getElementById('swatches-wrap').querySelectorAll('.swatch[data-color]').forEach(function (btn) {
      var c = btn.getAttribute('data-color');
      btn.style.boxShadow = c === form.color ? '0 0 0 2px #fff,0 0 0 4px ' + c : '';
    });
    var customOn = Store.palette.indexOf(form.color) === -1;
    document.getElementById('custom-swatch').style.boxShadow = customOn ? '0 0 0 2px #fff,0 0 0 4px ' + form.color : '';
  }

  function renderEdit() {
    var previewCount = editingId ? Store.countProdsInCat(editingId) : 0;
    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="field"><label>Nombre de la categoría</label>' +
      '<input class="input" id="cat-name-input" value="' + esc(form.name) + '" placeholder="Ej. Cereales"></div>' +
      '<div class="field"><label>Selecciona un color</label>' +
      '<div class="swatches" id="swatches-wrap" style="position:relative">' + paletteHTML() +
      '<button type="button" class="swatch" id="custom-swatch" title="Color personalizado"><span class="swfill-rainbow"><svg class="ic ic14" style="color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><use href="#i-palette"></use></svg></span></button>' +
      '</div></div>' +
      '<div class="field"><label>Selecciona un icono</label>' +
      '<div class="ig-wrap"><div class="ig-toprow">' +
      '<div class="ig-search"><svg class="ic ic16" style="color:var(--t3);flex-shrink:0"><use href="#i-search"></use></svg>' +
      '<input id="ig-search-input" placeholder="Buscar icono..."></div>' +
      '<button type="button" class="btn btn-ghost" id="ig-toggle" style="height:42px;font-size:13px;padding:0 16px;flex-shrink:0">Ver todos (' + Store.allIcons.length + ' iconos)</button>' +
      '</div><div class="iconpick" id="ig-results">' + iconGridHTML() + '</div></div></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="cat-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar cambios</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="cat-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside">' +
      '<div class="sidecard"><div class="sidelabel">Vista previa</div>' +
      '<div class="pvcard"><div class="icb icb62" id="pv-icb" style="background:' + form.color + ';margin-bottom:16px">' +
      '<svg class="ic ic28"><use id="pv-icon-use" href="' + form.icon + '"></use></svg></div>' +
      '<div class="catname" id="pv-name">' + esc(form.name || 'Nueva categoría') + '</div>' +
      '<div class="catmeta"><span class="dot" id="pv-dot" style="background:' + form.color + '"></span><span>' + previewCount + ' productos</span></div>' +
      '</div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-tag"></use></svg><span>Buenas prácticas</span></div>' +
      '<ul class="tiplist">' +
      '<li>Usa nombres cortos y claros para tus etiquetas.</li>' +
      '<li>Asigna un color distinto a cada categoría para identificarla rápido.</li>' +
      '<li>El icono aparece en etiquetas y tarjetas de producto.</li>' +
      '</ul></div></div></div>';

    document.getElementById('cat-name-input').addEventListener('input', function (e) {
      form.name = e.target.value;
      document.getElementById('pv-name').textContent = form.name || 'Nueva categoría';
    });
    document.getElementById('swatches-wrap').querySelectorAll('[data-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.color = btn.getAttribute('data-color');
        refreshSwatches(); refreshPreview();
      });
    });
    var colorInput = document.getElementById('cat-color-input');
    document.getElementById('custom-swatch').addEventListener('click', function () {
      colorInput.value = form.color;
      colorInput.click();
    });
    colorInput.addEventListener('input', function (e) {
      form.color = e.target.value;
      refreshSwatches(); refreshPreview();
    });
    document.getElementById('ig-search-input').addEventListener('input', function (e) {
      iconSearch = e.target.value;
      refreshIconGrid();
    });
    document.getElementById('ig-toggle').addEventListener('click', function () {
      iconGalleryOpen = !iconGalleryOpen;
      refreshIconGrid();
    });
    wireIconGrid();
    document.getElementById('cat-save').addEventListener('click', save);
    document.getElementById('cat-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'categorias', title: '', subtitle: '', crumb: '' });
  render();
})();
