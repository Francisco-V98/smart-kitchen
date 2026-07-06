(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var form = { name: '', color: '#2F9CF5', icon: '#i-leaf' };
  var iconPicker = null;
  var colorPicker = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() {
    view = 'edit'; editingId = null;
    form = { name: '', color: '#2F9CF5', icon: '#i-leaf' };
    render();
  }

  function openEdit(area) {
    view = 'edit'; editingId = area.id;
    form = { name: area.name, color: area.color, icon: area.icon };
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('area-name-input').focus(); return; }
    if (editingId) Store.updateArea(editingId, { name: name, color: form.color, icon: form.icon });
    else Store.addArea({ name: name, color: form.color, icon: form.icon });
    goList();
  }

  function remove() {
    if (!editingId) return;
    var area = Store.getArea(editingId);
    var n = Store.countInstrumentosInArea(editingId);
    var msg = n > 0
      ? 'Eliminar "' + area.name + '"? Hay ' + n + ' instrumento(s) en esta área que quedarán sin área.'
      : 'Eliminar el área "' + area.name + '"?';
    if (!confirm(msg)) return;
    Store.deleteArea(editingId);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Áreas', subtitle: 'Define las áreas o zonas de tu cocina o local.', crumb: 'Registro / Áreas', headerButton: { label: 'Agregar área', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar área' : 'Nueva área',
        subtitle: editingId ? 'Modifica el nombre, el color y el icono del área.' : 'Define el nombre, color e icono de tu nueva área.',
        crumb: editingId ? 'Áreas / Editar' : 'Áreas / Nueva',
        headerButton: editingId ? { label: 'Eliminar área', icon: '#i-trash', variant: 'danger', onClick: remove } : null,
      });
    }
  }

  function renderList() {
    var areas = Store.getAreas();
    var cardsHTML = areas.map(function (a) {
      return '<div class="areacard" data-id="' + a.id + '">' +
        '<div class="areacard-top"><div class="icb icb50" style="background:' + a.color + '"><svg class="ic ic24"><use href="' + a.icon + '"></use></svg></div>' +
        '<button class="iconbtn" data-edit="' + a.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div>' +
        '<div class="areaname">' + esc(a.name) + '</div>' +
        '<div class="areameta"><span class="dot" style="background:' + a.color + '"></span><span>' + a.count + ' instrumentos</span></div>' +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="sectionhead"><h2>Tus áreas</h2><span class="muted">' + areas.length + ' áreas</span></div>' +
      '<div class="areagrid">' + cardsHTML + '</div>';

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = Store.getArea(btn.getAttribute('data-edit'));
        if (a) openEdit(a);
      });
    });
  }

  function renderEdit() {
    var previewCount = editingId ? Store.countInstrumentosInArea(editingId) : 0;
    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="field"><label>Nombre del área</label>' +
      '<input class="input" id="area-name-input" value="' + esc(form.name) + '" placeholder="Ej. Almacén"></div>' +
      '<div class="field"><label>Selecciona un color</label><div id="area-color-wrap"></div></div>' +
      '<div class="field"><label>Selecciona un icono</label><div id="area-icon-wrap"></div></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="area-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar cambios</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="area-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside">' +
      '<div class="sidecard"><div class="sidelabel">Vista previa</div>' +
      '<div class="pvcard"><div class="icb icb62" id="pv-icb" style="background:' + form.color + ';margin-bottom:16px">' +
      '<svg class="ic ic28"><use id="pv-icon-use" href="' + form.icon + '"></use></svg></div>' +
      '<div class="areaname" id="pv-name">' + esc(form.name || 'Nueva área') + '</div>' +
      '<div class="areameta"><span class="dot" id="pv-dot" style="background:' + form.color + '"></span><span>' + previewCount + ' instrumentos</span></div>' +
      '</div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-map-pin"></use></svg><span>Buenas prácticas</span></div>' +
      '<ul class="tiplist">' +
      '<li>Usa nombres cortos y claros: Almacén, Cocina, Comedor, Baños.</li>' +
      '<li>Cada instrumento y cada labor podrán vincularse a un área.</li>' +
      '<li>El calendario agrupa las labores pendientes por área.</li>' +
      '</ul></div></div></div>';

    document.getElementById('area-name-input').addEventListener('input', function (e) {
      form.name = e.target.value;
      document.getElementById('pv-name').textContent = form.name || 'Nueva área';
    });

    function refreshPreview() {
      document.getElementById('pv-icb').style.background = form.color;
      document.getElementById('pv-icon-use').setAttribute('href', form.icon);
      document.getElementById('pv-dot').style.background = form.color;
    }

    colorPicker = Pickers.mountColorPicker(document.getElementById('area-color-wrap'), {
      selected: form.color, colorInputId: 'area-color-input',
      onSelect: function (c) { form.color = c; refreshPreview(); },
    });
    document.getElementById('area-color-input').addEventListener('input', function (e) {
      form.color = e.target.value;
      colorPicker.refresh(form.color);
      refreshPreview();
    });
    iconPicker = Pickers.mountIconPicker(document.getElementById('area-icon-wrap'), {
      selected: form.icon,
      onSelect: function (icon) { form.icon = icon; refreshPreview(); },
    });

    document.getElementById('area-save').addEventListener('click', save);
    document.getElementById('area-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'areas', title: '', subtitle: '', crumb: '' });
  render();
})();
