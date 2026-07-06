(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var listFieldFilter = null;
  var openFieldKey = null; // "above-<rowId>-<fi>" | "below-<rowId>-<fi>"
  var form = null;

  function esc(s) { return LabelRender.esc(s); }
  function uid() { return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

  function blankForm() {
    return { name: '', desc: '', scheme: 'color', accent: '#2F9CF5', logoPos: 'none', border: false, dividers: true, rowsAbove: [], rowsBelow: [] };
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() { view = 'edit'; editingId = null; form = blankForm(); openFieldKey = null; render(); }

  function openEdit(m) {
    view = 'edit'; editingId = m.id;
    form = {
      name: m.name, desc: m.desc, scheme: m.scheme, accent: m.accent, logoPos: m.logoPos,
      border: !!m.border, dividers: m.dividers !== false,
      rowsAbove: JSON.parse(JSON.stringify(m.rowsAbove || [])), rowsBelow: JSON.parse(JSON.stringify(m.rowsBelow || [])),
    };
    openFieldKey = null;
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('modelo-name-input').focus(); return; }
    var payload = {
      name: name, desc: form.desc, scheme: form.scheme, accent: form.accent, logoPos: form.logoPos,
      border: form.border, dividers: form.dividers, rowsAbove: form.rowsAbove, rowsBelow: form.rowsBelow,
    };
    if (editingId) Store.updateModelo(editingId, payload);
    else Store.addModelo(payload);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Modelos de etiqueta', subtitle: 'Define los procesos de cocina que usarás en tus etiquetas.', crumb: 'Etiqueta / Modelos de etiqueta', headerButton: { label: 'Nuevo modelo', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar modelo' : 'Nuevo modelo',
        subtitle: 'Diseña la estructura y apariencia de la etiqueta que se imprimirá.',
        crumb: editingId ? 'Etiqueta / Modelos / Editar' : 'Etiqueta / Modelos / Nuevo',
        headerButton: null,
      });
    }
  }

  // ---------------- list ----------------
  function renderList() {
    var modelos = Store.getModelos();
    var allTypes = [];
    modelos.forEach(function (m) {
      [].concat(m.rowsAbove || [], m.rowsBelow || []).forEach(function (r) {
        r.fields.forEach(function (f) { if (allTypes.indexOf(f.type) === -1) allTypes.push(f.type); });
      });
    });
    var chips = [{ id: null, label: 'Todos' }].concat(allTypes.slice(0, 5).map(function (t) {
      var ft = Store.fieldTypesList.find(function (x) { return x.id === t; });
      return { id: t, label: ft ? ft.name : t };
    }));
    var chipsHTML = chips.map(function (c) {
      return '<button type="button" class="filter-chip ' + (listFieldFilter === c.id ? 'on' : '') + '" data-fchip="' + (c.id || '') + '">' + esc(c.label) + '</button>';
    }).join('');

    var list = modelos.filter(function (m) {
      if (!listFieldFilter) return true;
      return [].concat(m.rowsAbove || [], m.rowsBelow || []).some(function (r) { return r.fields.some(function (f) { return f.type === listFieldFilter; }); });
    });

    var cardsHTML = list.map(function (m) {
      var tags = LabelRender.fieldTags(m, 3).map(function (t) { return '<span class="modelo-ftag">' + esc(t) + '</span>'; }).join('');
      return '<div class="modelocard" data-id="' + m.id + '">' +
        '<div class="modelo-preview-wrap">' + LabelRender.renderStatic(m, { size: 'sm' }) + '</div>' +
        '<div class="modelobody"><div class="modelo-name">' + esc(m.name) + '</div><div class="modelo-desc">' + esc(m.desc || '') + '</div>' +
        '<div class="modelo-foot"><div class="modelo-ftags">' + tags + '</div>' +
        '<button type="button" class="iconbtn" data-edit="' + m.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div></div></div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="sectionhead"><h2>Modelos de etiqueta</h2><span class="muted">' + modelos.length + ' modelos</span></div>' +
      '<div class="modelo-chips-row">' + chipsHTML + '</div>' +
      '<div class="modelogrid">' + cardsHTML + '</div>';

    root.querySelectorAll('[data-fchip]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        listFieldFilter = btn.getAttribute('data-fchip') || null;
        renderList();
      });
    });
    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = Store.getModelo(btn.getAttribute('data-edit'));
        if (m) openEdit(m);
      });
    });
  }

  // ---------------- edit ----------------
  function fieldTypeName(type) {
    var ft = Store.fieldTypesList.find(function (x) { return x.id === type; });
    return ft ? ft.name : type;
  }

  function rowHTML(row, i, side) {
    var posLabel = 'Fila ' + (i + 1) + ' — ' + (side === 'above' ? 'arriba del nombre' : 'debajo del nombre');
    var fieldsHTML = row.fields.map(function (f, fi) {
      var fk = side + '-' + row.id + '-' + fi;
      var isOpen = openFieldKey === fk;
      var options = Store.fieldTypesList.map(function (ft) {
        return '<button type="button" class="ftdrop-item ' + (ft.id === f.type ? 'on' : '') + '" data-select-type="' + ft.id + '">' + esc(ft.name) + '</button>';
      }).join('');
      return '<div class="lfield" style="position:relative" data-field-key="' + fk + '">' +
        '<label>Tipo de campo</label>' +
        '<button type="button" class="ftpick-btn" data-toggle-field="' + fk + '"><span style="flex:1;font-weight:500">' + esc(fieldTypeName(f.type)) + '</span>' +
        '<svg class="ic ic14" style="color:var(--t3);flex-shrink:0"><use href="#i-chevron-down"></use></svg></button>' +
        (isOpen ? '<div class="ftdrop" data-drop-for="' + fk + '">' + options + '</div>' : '') +
        '</div>';
    }).join('');
    return '<div class="lrow" data-row="' + side + '-' + row.id + '">' +
      '<div class="lrow-head"><svg class="ic ic14" style="color:var(--t3)"><use href="#i-layers"></use></svg>' +
      '<span class="lrow-label">' + posLabel + '</span>' +
      '<div class="colstoggle"><button type="button" class="coltbtn ' + (row.cols === 1 ? 'on' : '') + '" data-cols="1">1 col</button>' +
      '<button type="button" class="coltbtn ' + (row.cols === 2 ? 'on' : '') + '" data-cols="2">2 col</button></div>' +
      '<button type="button" class="iconbtn" data-delete-row="1"><svg class="ic ic16"><use href="#i-trash"></use></svg></button></div>' +
      '<div class="lrow-body">' + fieldsHTML + '</div></div>';
  }

  function nameRowHTML() {
    var logoOpts = [{ id: 'none', label: 'Sin logo', p1: '', p2: '' }, { id: 'left', label: 'Izquierda', p1: '▪', p2: '' }, { id: 'right', label: 'Derecha', p1: '', p2: '▪' }, { id: 'both', label: 'Ambos', p1: '▪', p2: '▪' }];
    var optsHTML = logoOpts.map(function (o) {
      return '<button type="button" class="logo-opt ' + (form.logoPos === o.id ? 'on' : '') + '" data-logo="' + o.id + '">' +
        '<div class="logo-opt-preview"><span>' + o.p1 + '</span><span style="font-size:9px;color:var(--t3);font-weight:400">━━</span><span>' + o.p2 + '</span></div>' +
        '<div class="logo-opt-label">' + esc(o.label) + '</div></button>';
    }).join('');
    return '<div class="lrow" style="border-color:rgba(47,156,245,.5);overflow:hidden">' +
      '<div class="lrow-head" style="background:var(--brand-50)"><svg class="ic ic14" style="color:var(--brand)"><use href="#i-tag"></use></svg>' +
      '<span class="lrow-label" style="color:var(--brand);font-weight:700">Nombre del producto</span>' +
      '<span style="font-size:11px;font-weight:700;color:var(--brand);background:rgba(47,156,245,.18);padding:3px 9px;border-radius:999px">Siempre presente</span></div>' +
      '<div class="lrow-body" style="flex-direction:column;gap:12px">' +
      '<div style="font-size:13px;font-weight:600;color:var(--t2)">Posición del logo</div>' +
      '<div class="logo-opts">' + optsHTML + '</div></div></div>';
  }

  function rowBuilderHTML() {
    var aboveHTML = form.rowsAbove.map(function (r, i) { return rowHTML(r, i, 'above'); }).join('');
    var belowHTML = form.rowsBelow.map(function (r, i) { return rowHTML(r, i, 'below'); }).join('');
    return '' +
      (form.rowsAbove.length < 3 ? '<button type="button" class="row-add-btn" id="add-row-above"><svg class="ic ic16"><use href="#i-plus"></use></svg>Agregar fila arriba del nombre</button>' : '') +
      aboveHTML + nameRowHTML() + belowHTML +
      (form.rowsBelow.length < 4 ? '<button type="button" class="row-add-btn" id="add-row-below"><svg class="ic ic16"><use href="#i-plus"></use></svg>Agregar fila debajo del nombre</button>' : '');
  }

  function apparienceHTML() {
    var schemeOpts = [{ id: 'color', label: 'Color', bg1: form.accent, bg2: '#fff' }, { id: 'bw', label: 'Blanco y negro', bg1: '#111827', bg2: '#fff' }];
    var schemeHTML = schemeOpts.map(function (s) {
      return '<button type="button" class="scheme-opt ' + (form.scheme === s.id ? 'on' : '') + '" data-scheme="' + s.id + '">' +
        '<div class="scheme-prev" style="background:linear-gradient(135deg,' + s.bg1 + ' 0%,' + s.bg2 + ' 70%);border-color:' + s.bg1 + '"></div>' +
        '<div class="scheme-name">' + esc(s.label) + '</div></button>';
    }).join('');
    var isColor = form.scheme === 'color';
    var accentHTML = Store.accentColors.map(function (c) {
      var ring = form.accent === c ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px ' + c : '';
      return '<button type="button" class="accent-sw" style="' + ring + '" data-accent="' + c + '"><div class="accent-fill" style="background:' + c + '"></div></button>';
    }).join('');
    var customOn = Store.accentColors.indexOf(form.accent) === -1;
    return '' +
      '<div style="font-size:13px;font-weight:600;color:var(--t2);margin-bottom:12px">Esquema de color</div>' +
      '<div class="scheme-opts">' + schemeHTML + '</div>' +
      (isColor ? (
        '<div style="margin-top:18px"><div style="font-size:13px;font-weight:600;color:var(--t2);margin-bottom:12px">Color de acento</div>' +
        '<div class="accent-opts">' + accentHTML +
        '<button type="button" class="accent-sw" id="accent-custom-btn" style="' + (customOn ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px ' + form.accent : '') + '" title="Color personalizado"><div class="accent-fill swfill-rainbow"></div></button>' +
        '</div></div>'
      ) : '') +
      '<div style="margin-top:24px;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:11px">' +
      '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">Trazo alrededor</div><div style="font-size:12px;color:var(--t3);margin-top:2px">Borde del color de acento</div></div>' +
      '<label class="toggle"><input type="checkbox" id="border-toggle" ' + (form.border ? 'checked' : '') + '><span class="tslider"></span></label></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:11px">' +
      '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">Separadores entre campos</div><div style="font-size:12px;color:var(--t3);margin-top:2px">Líneas claras entre filas de datos</div></div>' +
      '<label class="toggle"><input type="checkbox" id="dividers-toggle" ' + (form.dividers ? 'checked' : '') + '><span class="tslider"></span></label></div>' +
      '</div>';
  }

  function renderDynamic() {
    var box = document.getElementById('structure-appearance');
    box.innerHTML = '' +
      '<div class="labelsec"><div class="labelsec-title"><svg class="ic ic16"><use href="#i-layers"></use></svg>Estructura de la etiqueta</div>' +
      '<div class="rowbuilder">' + rowBuilderHTML() + '</div></div>' +
      '<div class="labelsec"><div class="labelsec-title"><svg class="ic ic16"><use href="#i-palette"></use></svg>Apariencia</div>' +
      apparienceHTML() + '</div>' +
      '<div style="display:flex;gap:14px">' +
      '<button type="button" class="btn btn-primary f1" id="modelo-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar modelo</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="modelo-cancel"><span>Cancelar</span></button></div>';
    wireDynamic();
    renderPreview();
  }

  function setRowCols(side, rowId, cols) {
    var list = side === 'above' ? form.rowsAbove : form.rowsBelow;
    var row = list.find(function (r) { return r.id === rowId; });
    if (!row) return;
    row.cols = cols;
    if (cols === 2 && row.fields.length < 2) row.fields.push({ type: 'fecha_cad', lbl: 'Campo 2' });
    else if (cols === 1) row.fields = row.fields.slice(0, 1);
  }
  function deleteRow(side, rowId) {
    if (side === 'above') form.rowsAbove = form.rowsAbove.filter(function (r) { return r.id !== rowId; });
    else form.rowsBelow = form.rowsBelow.filter(function (r) { return r.id !== rowId; });
  }
  function setRowFieldType(side, rowId, fi, type) {
    var list = side === 'above' ? form.rowsAbove : form.rowsBelow;
    var row = list.find(function (r) { return r.id === rowId; });
    if (!row) return;
    var name = fieldTypeName(type);
    row.fields[fi] = Object.assign({}, row.fields[fi], { type: type, lbl: name });
  }

  function wireDynamic() {
    var box = document.getElementById('structure-appearance');
    var addAbove = document.getElementById('add-row-above');
    if (addAbove) addAbove.addEventListener('click', function () {
      if (form.rowsAbove.length >= 3) return;
      form.rowsAbove.push({ id: uid(), cols: 1, fields: [{ type: 'fecha_elab', lbl: 'Elaborado' }] });
      renderDynamic();
    });
    var addBelow = document.getElementById('add-row-below');
    if (addBelow) addBelow.addEventListener('click', function () {
      if (form.rowsBelow.length >= 4) return;
      form.rowsBelow.push({ id: uid(), cols: 1, fields: [{ type: 'fecha_cad', lbl: 'Caduca el' }] });
      renderDynamic();
    });

    box.querySelectorAll('[data-row]').forEach(function (rowEl) {
      var parts = rowEl.getAttribute('data-row').split('-');
      var side = parts[0]; var rowId = parts.slice(1).join('-');
      rowEl.querySelectorAll('[data-cols]').forEach(function (btn) {
        btn.addEventListener('click', function () { setRowCols(side, rowId, parseInt(btn.getAttribute('data-cols'), 10)); renderDynamic(); });
      });
      var delBtn = rowEl.querySelector('[data-delete-row]');
      if (delBtn) delBtn.addEventListener('click', function () { deleteRow(side, rowId); openFieldKey = null; renderDynamic(); });
    });

    box.querySelectorAll('[data-toggle-field]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var fk = btn.getAttribute('data-toggle-field');
        openFieldKey = openFieldKey === fk ? null : fk;
        renderDynamic();
      });
    });
    box.querySelectorAll('[data-drop-for]').forEach(function (drop) {
      drop.addEventListener('click', function (e) { e.stopPropagation(); });
      drop.querySelectorAll('[data-select-type]').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var fk = drop.getAttribute('data-drop-for');
          var parts = fk.split('-'); var side = parts[0]; var fi = parseInt(parts[parts.length - 1], 10);
          var rowId = parts.slice(1, parts.length - 1).join('-');
          setRowFieldType(side, rowId, fi, opt.getAttribute('data-select-type'));
          openFieldKey = null;
          renderDynamic();
        });
      });
    });

    box.querySelectorAll('[data-logo]').forEach(function (btn) {
      btn.addEventListener('click', function () { form.logoPos = btn.getAttribute('data-logo'); renderDynamic(); });
    });
    box.querySelectorAll('[data-scheme]').forEach(function (btn) {
      btn.addEventListener('click', function () { form.scheme = btn.getAttribute('data-scheme'); renderDynamic(); });
    });
    box.querySelectorAll('[data-accent]').forEach(function (btn) {
      btn.addEventListener('click', function () { form.accent = btn.getAttribute('data-accent'); renderDynamic(); });
    });
    var customBtn = document.getElementById('accent-custom-btn');
    if (customBtn) customBtn.addEventListener('click', function () {
      var el = document.getElementById('accent-color-input');
      el.value = form.accent; el.click();
    });
    var borderToggle = document.getElementById('border-toggle');
    if (borderToggle) borderToggle.addEventListener('change', function () { form.border = borderToggle.checked; renderPreview(); });
    var dividersToggle = document.getElementById('dividers-toggle');
    if (dividersToggle) dividersToggle.addEventListener('change', function () { form.dividers = dividersToggle.checked; renderPreview(); });

    document.getElementById('modelo-save').addEventListener('click', save);
    document.getElementById('modelo-cancel').addEventListener('click', goList);
  }

  function renderPreview() {
    var el = document.getElementById('lprev-render');
    el.innerHTML = LabelRender.renderStatic(form, { size: 'big', prodName: 'Producto' });
  }

  function renderEdit() {
    root.innerHTML = '' +
      '<div class="labelwrap">' +
      '<div class="labelform">' +
      '<div class="labelsec"><div class="labelsec-title"><svg class="ic ic16"><use href="#i-tag"></use></svg>Información básica</div>' +
      '<div class="field" style="margin-bottom:18px"><label>Nombre del modelo <span style="color:var(--red)">*</span></label>' +
      '<input class="input" id="modelo-name-input" placeholder="Ej. Refrigeración estándar" value="' + esc(form.name) + '"></div>' +
      '<div class="field"><label>Descripción <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="modelo-desc-input" placeholder="Describe el uso de esta etiqueta...">' + esc(form.desc) + '</textarea></div></div>' +
      '<div id="structure-appearance"></div>' +
      '</div>' +
      '<div class="lprev-wrap"><div class="lprev-card">' +
      '<div class="lprev-title"><span>Vista previa</span><span style="font-size:11px;font-weight:400;letter-spacing:0;color:var(--t3)">100 × 50 mm</span></div>' +
      '<div id="lprev-render"></div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-tag"></use></svg><span>Sobre los modelos</span></div>' +
      '<ul class="tiplist">' +
      '<li>Un modelo define la estructura y apariencia de la etiqueta impresa.</li>' +
      '<li>Agrega filas arriba o abajo del nombre para mostrar fechas, lotes, temperatura, etc.</li>' +
      '<li>Al crear una etiqueta eliges el producto y el modelo para imprimirla.</li>' +
      '</ul></div></div></div>';

    document.getElementById('modelo-name-input').addEventListener('input', function (e) { form.name = e.target.value; });
    document.getElementById('modelo-desc-input').addEventListener('input', function (e) { form.desc = e.target.value; });
    document.getElementById('accent-color-input').addEventListener('input', function (e) { form.accent = e.target.value; renderDynamic(); });

    renderDynamic();
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'procesos', title: '', subtitle: '', crumb: '' });
  render();
})();
