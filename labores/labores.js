(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var listAreaFilter = null;
  var form = null;

  var FREQ_LABELS = { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
  var VALUE_TYPE_LABELS = { ninguno: 'Sin valor', rango: 'Rango', conteo: 'Conteo', texto: 'Texto' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'ci' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

  function newChecklistItem() {
    return { id: uid(), mode: 'personalizado', instrumentoId: '', label: '', valueType: 'ninguno', min: '', max: '', unit: '' };
  }

  function blankForm() {
    return { name: '', desc: '', areaId: '', frequency: 'diaria', startDate: Store.todayISO(), time: '', assigneeId: '', checklist: [newChecklistItem()] };
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() { view = 'edit'; editingId = null; form = blankForm(); render(); }

  function openEdit(l) {
    view = 'edit'; editingId = l.id;
    form = {
      name: l.name, desc: l.desc || '', areaId: l.areaId || '', frequency: l.frequency, startDate: l.startDate, time: l.time || '', assigneeId: l.assigneeId || '',
      checklist: JSON.parse(JSON.stringify(l.checklist || [])).map(function (ci) {
        return Object.assign({ mode: ci.instrumentoId ? 'instrumento' : 'personalizado', instrumentoId: ci.instrumentoId || '', min: ci.min !== undefined ? ci.min : '', max: ci.max !== undefined ? ci.max : '', unit: ci.unit || '' }, ci);
      }),
    };
    if (!form.checklist.length) form.checklist.push(newChecklistItem());
    render();
  }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('lab-name-input').focus(); return; }
    var checklist = form.checklist.filter(function (ci) {
      return ci.mode === 'instrumento' ? !!ci.instrumentoId : !!ci.label.trim();
    }).map(function (ci) {
      var label = ci.mode === 'instrumento' ? (Store.getInstrumento(ci.instrumentoId) || {}).name || ci.label : ci.label.trim();
      var rec = { id: ci.id, label: label, instrumentoId: ci.mode === 'instrumento' ? ci.instrumentoId : null, valueType: ci.valueType };
      if (ci.valueType === 'rango') { rec.min = ci.min; rec.max = ci.max; rec.unit = ci.unit; }
      else if (ci.valueType === 'conteo') { rec.unit = ci.unit; }
      return rec;
    });
    if (!checklist.length) { alert('Agrega al menos un elemento al checklist.'); return; }
    var payload = {
      name: name, desc: form.desc, areaId: form.areaId || null, frequency: form.frequency,
      startDate: form.startDate, time: form.time, assigneeId: form.assigneeId || null, checklist: checklist,
    };
    if (editingId) Store.updateLabor(editingId, payload);
    else Store.addLabor(payload);
    goList();
  }

  function remove() {
    if (!editingId) return;
    if (!confirm('¿Eliminar esta labor? También se eliminará su historial de ejecuciones.')) return;
    Store.deleteLabor(editingId);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Labores', subtitle: 'Define las labores, su frecuencia y el checklist a completar.', crumb: 'Registro / Labores', headerButton: { label: 'Nueva labor', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar labor' : 'Nueva labor',
        subtitle: 'Define el checklist, la frecuencia y quién la ejecuta.',
        crumb: editingId ? 'Labores / Editar' : 'Labores / Nueva',
        headerButton: editingId ? { label: 'Eliminar labor', icon: '#i-trash', variant: 'danger', onClick: remove } : null,
      });
    }
  }

  // ---------------- list ----------------
  function renderList() {
    var labores = Store.getLabores();
    var areas = Store.getAreas();
    var chips = [{ id: null, name: 'Todas', color: '#0F1524', icon: '#i-layers' }].concat(areas.map(function (a) { return { id: a.id, name: a.name, color: a.color, icon: a.icon }; }));
    var chipsHTML = chips.map(function (c) {
      var on = listAreaFilter === c.id;
      return '<button type="button" class="chip ' + (on ? 'on' : '') + '" style="' + (on ? 'box-shadow:inset 0 0 0 1.5px ' + c.color : '') + '" data-areaf="' + (c.id || '') + '">' +
        '<span class="chipicon" style="background:' + c.color + '"><svg class="ic ic16"><use href="' + c.icon + '"></use></svg></span><span>' + esc(c.name) + '</span></button>';
    }).join('');

    var list = listAreaFilter ? labores.filter(function (l) { return l.areaId === listAreaFilter; }) : labores;

    var cardsHTML = list.map(function (l) {
      var area = l.areaId ? Store.getArea(l.areaId) : null;
      var assignee = l.assigneeId ? Store.getPersona(l.assigneeId) : null;
      return '<div class="labcard" data-id="' + l.id + '">' +
        '<div class="labcard-top"><div>' +
        '<div class="labname">' + esc(l.name) + '</div>' +
        (l.desc ? '<div class="labdesc">' + esc(l.desc) + '</div>' : '') +
        '</div><span class="labfreq-badge">' + FREQ_LABELS[l.frequency] + '</span></div>' +
        '<div class="labmeta">' +
        (area ? '<span class="labmeta-item"><span class="dot" style="background:' + area.color + '"></span>' + esc(area.name) + '</span>' : '') +
        (assignee ? '<span class="labmeta-item"><svg class="ic ic14"><use href="#i-users"></use></svg>' + esc(assignee.name) + '</span>' : '') +
        (l.time ? '<span class="labmeta-item"><svg class="ic ic14"><use href="#i-clock"></use></svg>' + esc(l.time) + '</span>' : '') +
        '<span class="labmeta-item"><svg class="ic ic14"><use href="#i-clipboard"></use></svg>' + l.checklist.length + ' ítems</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end"><button type="button" class="iconbtn" data-edit="' + l.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button></div>' +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="sectionhead"><h2>Tus labores</h2><span class="muted">' + labores.length + ' labores</span></div>' +
      '<div class="modelo-chips-row" style="margin-bottom:20px">' + chipsHTML + '</div>' +
      (list.length
        ? '<div class="labgrid">' + cardsHTML + '</div>'
        : '<div class="empty"><div class="icb icb62" style="background:var(--bg);color:var(--t3)"><svg class="ic ic28"><use href="#i-clipboard"></use></svg></div><h3>Sin labores definidas</h3><p>Crea una labor para empezar a programar el checklist del equipo.</p></div>');

    root.querySelectorAll('[data-areaf]').forEach(function (btn) {
      btn.addEventListener('click', function () { listAreaFilter = btn.getAttribute('data-areaf') || null; renderList(); });
    });
    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var l = Store.getLabor(btn.getAttribute('data-edit'));
        if (l) openEdit(l);
      });
    });
  }

  // ---------------- edit ----------------
  function areaOptionsHTML() {
    return '<option value="">Sin área específica</option>' + Store.getAreas().map(function (a) {
      return '<option value="' + a.id + '"' + (form.areaId === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>';
    }).join('');
  }
  function personaOptionsHTML() {
    return '<option value="">Sin asignar</option>' + Store.getPersonalList().map(function (p) {
      return '<option value="' + p.id + '"' + (form.assigneeId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');
  }
  function instrumentoOptionsHTML(selected) {
    return '<option value="">Selecciona un instrumento...</option>' + Store.getInstrumentos().map(function (i) {
      return '<option value="' + i.id + '"' + (selected === i.id ? ' selected' : '') + '>' + esc(i.name) + '</option>';
    }).join('');
  }

  function checklistItemHTML(item, idx) {
    var isInst = item.mode === 'instrumento';
    var vtOrder = ['ninguno', 'rango', 'conteo', 'texto'];
    var vtButtons = vtOrder.map(function (vt) {
      return '<button type="button" class="coltbtn ' + (item.valueType === vt ? 'on' : '') + '" data-vt="' + vt + '" data-item="' + idx + '">' + VALUE_TYPE_LABELS[vt] + '</button>';
    }).join('');

    return '<div class="lrow" data-item="' + idx + '">' +
      '<div class="lrow-head"><svg class="ic ic14" style="color:var(--t3)"><use href="#i-clipboard"></use></svg>' +
      '<span class="lrow-label">Elemento ' + (idx + 1) + '</span>' +
      '<button type="button" class="iconbtn" data-delete-item="' + idx + '"><svg class="ic ic16"><use href="#i-trash"></use></svg></button></div>' +
      '<div class="lrow-body" style="flex-direction:column;align-items:stretch;gap:12px">' +
      '<div class="colstoggle" style="align-self:flex-start">' +
      '<button type="button" class="coltbtn ' + (isInst ? 'on' : '') + '" data-mode="instrumento" data-item="' + idx + '">Vincular instrumento</button>' +
      '<button type="button" class="coltbtn ' + (!isInst ? 'on' : '') + '" data-mode="personalizado" data-item="' + idx + '">Elemento personalizado</button>' +
      '</div>' +
      (isInst
        ? '<select class="input" data-inst-select="' + idx + '">' + instrumentoOptionsHTML(item.instrumentoId) + '</select>'
        : '<input class="input" placeholder="Ej. Piso, Paredes, Estanterías..." value="' + esc(item.label) + '" data-label-input="' + idx + '">') +
      '<div><label style="display:block;font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Tipo de valor a registrar</label>' +
      '<div class="colstoggle">' + vtButtons + '</div></div>' +
      (item.valueType === 'rango' || item.valueType === 'conteo'
        ? '<div class="daysgrid">' +
          (item.valueType === 'rango' ? (
            '<div class="daysfield"><label>Mínimo</label><input class="daysinput" type="number" value="' + esc(item.min) + '" data-min-input="' + idx + '"></div>' +
            '<div class="daysfield"><label>Máximo</label><input class="daysinput" type="number" value="' + esc(item.max) + '" data-max-input="' + idx + '"></div>'
          ) : '') +
          '<div class="daysfield"><label>Unidad <span class="sub">(opcional)</span></label><input class="daysinput" style="font-weight:500" placeholder="°C, kg, uds..." value="' + esc(item.unit) + '" data-unit-input="' + idx + '"></div>' +
          '</div>'
        : '') +
      '</div></div>';
  }

  function renderChecklist() {
    var box = document.getElementById('checklist-box');
    box.innerHTML = form.checklist.map(checklistItemHTML).join('') +
      '<button type="button" class="row-add-btn" id="add-checklist-item"><svg class="ic ic16"><use href="#i-plus"></use></svg>Agregar elemento</button>';
    wireChecklist();
  }

  function wireChecklist() {
    var box = document.getElementById('checklist-box');
    document.getElementById('add-checklist-item').addEventListener('click', function () {
      form.checklist.push(newChecklistItem());
      renderChecklist();
    });
    box.querySelectorAll('[data-delete-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-delete-item'), 10);
        form.checklist.splice(idx, 1);
        if (!form.checklist.length) form.checklist.push(newChecklistItem());
        renderChecklist();
      });
    });
    box.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-item'), 10);
        form.checklist[idx].mode = btn.getAttribute('data-mode');
        renderChecklist();
      });
    });
    box.querySelectorAll('[data-vt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-item'), 10);
        form.checklist[idx].valueType = btn.getAttribute('data-vt');
        renderChecklist();
      });
    });
    box.querySelectorAll('[data-inst-select]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var idx = parseInt(sel.getAttribute('data-inst-select'), 10);
        form.checklist[idx].instrumentoId = sel.value;
      });
    });
    box.querySelectorAll('[data-label-input]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var idx = parseInt(inp.getAttribute('data-label-input'), 10);
        form.checklist[idx].label = inp.value;
      });
    });
    box.querySelectorAll('[data-min-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { form.checklist[parseInt(inp.getAttribute('data-min-input'), 10)].min = inp.value; });
    });
    box.querySelectorAll('[data-max-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { form.checklist[parseInt(inp.getAttribute('data-max-input'), 10)].max = inp.value; });
    });
    box.querySelectorAll('[data-unit-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { form.checklist[parseInt(inp.getAttribute('data-unit-input'), 10)].unit = inp.value; });
    });
  }

  function renderEdit() {
    var freqButtons = ['diaria', 'semanal', 'mensual', 'trimestral', 'anual'].map(function (f) {
      return '<button type="button" class="coltbtn ' + (form.frequency === f ? 'on' : '') + '" data-freq="' + f + '" style="flex:1">' + FREQ_LABELS[f] + '</button>';
    }).join('');

    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="labelsec">' +
      '<div class="labelsec-title"><svg class="ic ic16"><use href="#i-clipboard"></use></svg>Información básica</div>' +
      '<div class="field" style="margin-bottom:18px"><label>Nombre de la labor <span style="color:var(--red)">*</span></label>' +
      '<input class="input" id="lab-name-input" placeholder="Ej. Revisar temperatura de neveras" value="' + esc(form.name) + '"></div>' +
      '<div class="field" style="margin-bottom:18px"><label>Descripción <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="lab-desc-input" placeholder="Describe brevemente en qué consiste...">' + esc(form.desc) + '</textarea></div>' +
      '<div class="daysgrid" style="margin-bottom:18px">' +
      '<div class="field"><label>Área</label><select class="input" id="lab-area-select">' + areaOptionsHTML() + '</select></div>' +
      '<div class="field"><label>Responsable</label><select class="input" id="lab-assignee-select">' + personaOptionsHTML() + '</select></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:18px"><label>Frecuencia</label><div class="colstoggle" style="width:100%" id="lab-freq-toggle">' + freqButtons + '</div></div>' +
      '<div class="daysgrid">' +
      '<div class="field"><label>Fecha de inicio</label><input class="input" type="date" id="lab-startdate-input" value="' + esc(form.startDate) + '"></div>' +
      '<div class="field"><label>Hora sugerida <span style="color:var(--t3);font-weight:400">(opcional)</span></label><input class="input" type="time" id="lab-time-input" value="' + esc(form.time) + '"></div>' +
      '</div>' +
      '</div>' +
      '<div class="labelsec" style="border-bottom:0;margin-bottom:0;padding-bottom:0">' +
      '<div class="labelsec-title"><svg class="ic ic16"><use href="#i-clipboard"></use></svg>Checklist</div>' +
      '<div class="rowbuilder" id="checklist-box"></div>' +
      '</div>' +
      '</div>' +
      '<div class="editside">' +
      '<div class="tipcard" style="margin-top:0"><div class="tiphead"><svg class="ic ic18"><use href="#i-clipboard"></use></svg><span>Sobre las labores</span></div>' +
      '<ul class="tiplist">' +
      '<li>Cada elemento del checklist puede vincularse a un instrumento registrado o ser un elemento personalizado (ej. piso, paredes).</li>' +
      '<li>El tipo de valor define qué le pedirá el checklist a quien ejecute la labor: un rango con unidad, un conteo, texto libre o solo un estado.</li>' +
      '<li>La labor aparecerá en el calendario según la frecuencia y fecha de inicio que definas.</li>' +
      '</ul></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="lab-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar labor</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="lab-cancel"><span>Cancelar</span></button>' +
      '</div>' +
      '</div></div>';

    document.getElementById('lab-name-input').addEventListener('input', function (e) { form.name = e.target.value; });
    document.getElementById('lab-desc-input').addEventListener('input', function (e) { form.desc = e.target.value; });
    document.getElementById('lab-area-select').addEventListener('change', function (e) { form.areaId = e.target.value; });
    document.getElementById('lab-assignee-select').addEventListener('change', function (e) { form.assigneeId = e.target.value; });
    document.getElementById('lab-startdate-input').addEventListener('input', function (e) { form.startDate = e.target.value; });
    document.getElementById('lab-time-input').addEventListener('input', function (e) { form.time = e.target.value; });
    document.getElementById('lab-freq-toggle').querySelectorAll('[data-freq]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.frequency = btn.getAttribute('data-freq');
        document.getElementById('lab-freq-toggle').querySelectorAll('[data-freq]').forEach(function (b) { b.classList.toggle('on', b === btn); });
      });
    });

    renderChecklist();
    document.getElementById('lab-save').addEventListener('click', save);
    document.getElementById('lab-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'labores', title: '', subtitle: '', crumb: '' });
  render();
})();
