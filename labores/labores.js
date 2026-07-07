(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var listAreaFilter = null;
  var form = null;

  var FREQ_ORDER = ['unica', 'diaria', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'];
  var FREQ_LABELS = { unica: 'Una vez', diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
  var VALUE_TYPE_LABELS = { ninguno: 'Sin valor', rango: 'Rango', conteo: 'Conteo' };
  var WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var CUSTOM_UNIT_ID = '__custom';
  var UNIT_PRESETS = [
    { id: '', label: 'Sin unidad' },
    { id: '°C', label: '°C — temperatura' },
    { id: '°F', label: '°F — temperatura' },
    { id: 'kg', label: 'kg — peso' },
    { id: 'g', label: 'g — peso' },
    { id: 'lb', label: 'lb — peso' },
    { id: 'L', label: 'L — volumen' },
    { id: 'ml', label: 'ml — volumen' },
    { id: 'cm', label: 'cm — tamaño' },
    { id: 'm', label: 'm — tamaño' },
    { id: 'mm', label: 'mm — tamaño' },
    { id: 'min', label: 'min — tiempo' },
    { id: 'h', label: 'h — tiempo' },
    { id: 'seg', label: 'seg — tiempo' },
    { id: 'uds', label: 'uds — unidades' },
    { id: '%', label: '% — porcentaje' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'ci' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function isPresetUnit(u) { return UNIT_PRESETS.some(function (p) { return p.id === (u || ''); }); }

  function newChecklistItem() {
    return { id: uid(), mode: 'personalizado', instrumentoId: '', label: '', valueType: 'ninguno', min: '', max: '', value: '', unit: '', unitMode: 'preset' };
  }

  function blankForm() {
    return { name: '', desc: '', areaId: '', frequency: 'diaria', weekdays: [], startDate: Store.todayISO(), time: '', assigneeIds: [], checklist: [newChecklistItem()] };
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() { view = 'edit'; editingId = null; form = blankForm(); render(); }

  function openEdit(l) {
    view = 'edit'; editingId = l.id;
    form = {
      name: l.name, desc: l.desc || '', areaId: l.areaId || '', frequency: l.frequency, weekdays: (l.weekdays || []).slice(),
      startDate: l.startDate, time: l.time || '', assigneeIds: (l.assigneeIds || []).slice(),
      checklist: JSON.parse(JSON.stringify(l.checklist || [])).map(function (ci) {
        var unit = ci.unit || '';
        return Object.assign({
          mode: ci.instrumentoId ? 'instrumento' : 'personalizado', instrumentoId: ci.instrumentoId || '',
          min: ci.min !== undefined ? ci.min : '', max: ci.max !== undefined ? ci.max : '',
          value: ci.value !== undefined ? ci.value : '', unit: unit,
          unitMode: (unit && !isPresetUnit(unit)) ? 'custom' : 'preset',
        }, ci);
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
      else if (ci.valueType === 'conteo') { rec.value = ci.value; rec.unit = ci.unit; }
      return rec;
    });
    if (!checklist.length) { alert('Agrega al menos un elemento al checklist.'); return; }
    var payload = {
      name: name, desc: form.desc, areaId: form.areaId || null, frequency: form.frequency,
      startDate: form.startDate, time: form.time, assigneeIds: form.assigneeIds, checklist: checklist,
    };
    if (form.frequency === 'semanal' && form.weekdays.length) payload.weekdays = form.weekdays.slice();
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

  function assigneeNames(l) {
    return (l.assigneeIds || []).map(function (id) { var p = Store.getPersona(id); return p ? p.name : null; }).filter(Boolean);
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
      var names = assigneeNames(l);
      var assigneeText = names.length <= 2 ? names.join(', ') : names[0] + ' +' + (names.length - 1) + ' más';
      var freqText = FREQ_LABELS[l.frequency] + (l.frequency === 'semanal' && l.weekdays && l.weekdays.length ? ' (' + l.weekdays.map(function (w) { return WEEKDAY_LABELS[w]; }).join('/') + ')' : '');
      return '<div class="labcard" data-id="' + l.id + '">' +
        '<div class="labcard-top"><div>' +
        '<div class="labname">' + esc(l.name) + '</div>' +
        (l.desc ? '<div class="labdesc">' + esc(l.desc) + '</div>' : '') +
        '</div><span class="labfreq-badge">' + esc(freqText) + '</span></div>' +
        '<div class="labmeta">' +
        (area ? '<span class="labmeta-item"><span class="dot" style="background:' + area.color + '"></span>' + esc(area.name) + '</span>' : '') +
        (names.length ? '<span class="labmeta-item"><svg class="ic ic14"><use href="#i-users"></use></svg>' + esc(assigneeText) + '</span>' : '') +
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

  // ---------------- edit: checklist builder ----------------
  function checklistItemHTML(item, idx) {
    var isInst = item.mode === 'instrumento';
    var vtOrder = ['ninguno', 'rango', 'conteo'];
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
        ? '<div id="inst-dd-' + idx + '"></div>'
        : '<input class="input" placeholder="Ej. Piso, Paredes, Estanterías..." value="' + esc(item.label) + '" data-label-input="' + idx + '">') +
      '<div><label style="display:block;font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Tipo de valor a registrar</label>' +
      '<div class="colstoggle">' + vtButtons + '</div></div>' +
      (item.valueType === 'rango' || item.valueType === 'conteo'
        ? '<div class="daysgrid">' +
          (item.valueType === 'rango' ? (
            '<div class="daysfield"><label>Mínimo</label><input class="daysinput" type="number" value="' + esc(item.min) + '" data-min-input="' + idx + '"></div>' +
            '<div class="daysfield"><label>Máximo</label><input class="daysinput" type="number" value="' + esc(item.max) + '" data-max-input="' + idx + '"></div>'
          ) : (
            '<div class="daysfield"><label>Valor</label><input class="daysinput" type="number" value="' + esc(item.value) + '" data-conteo-value-input="' + idx + '"></div>'
          )) +
          '<div class="daysfield"><label>Unidad <span class="sub">(opcional)</span></label><div id="unit-dd-' + idx + '"></div>' +
          (item.unitMode === 'custom' ? '<input class="daysinput" style="margin-top:8px;font-weight:500" placeholder="Escribe la unidad..." value="' + esc(item.unit) + '" data-custom-unit-input="' + idx + '">' : '') +
          '</div>' +
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
    box.querySelectorAll('[data-conteo-value-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { form.checklist[parseInt(inp.getAttribute('data-conteo-value-input'), 10)].value = inp.value; });
    });
    box.querySelectorAll('[data-custom-unit-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { form.checklist[parseInt(inp.getAttribute('data-custom-unit-input'), 10)].unit = inp.value; });
    });

    // custom dropdowns: instrumento picker (per instrumento-linked item) + unit picker (per rango/conteo item)
    form.checklist.forEach(function (item, idx) {
      if (item.mode === 'instrumento') {
        var instContainer = document.getElementById('inst-dd-' + idx);
        var instItems = Store.getInstrumentos().map(function (i) {
          var a = i.areaId ? Store.getArea(i.areaId) : null;
          return { id: i.id, label: i.name, sub: a ? a.name : 'Sin área', icon: i.icon, color: a ? a.color : '#94a3b8' };
        });
        Dropdown.mountSelect(instContainer, {
          items: instItems, selectedId: item.instrumentoId, placeholder: 'Selecciona un instrumento...',
          onSelect: function (id) { form.checklist[idx].instrumentoId = id; },
        });
      }
      if (item.valueType === 'rango' || item.valueType === 'conteo') {
        var unitContainer = document.getElementById('unit-dd-' + idx);
        var unitItems = [{ id: CUSTOM_UNIT_ID, label: 'Personalizar...' }].concat(UNIT_PRESETS);
        Dropdown.mountSelect(unitContainer, {
          items: unitItems, panelColumns: 1,
          selectedId: item.unitMode === 'custom' ? CUSTOM_UNIT_ID : (item.unit || ''),
          placeholder: 'Sin unidad',
          onSelect: function (id) {
            if (id === CUSTOM_UNIT_ID) { form.checklist[idx].unitMode = 'custom'; }
            else { form.checklist[idx].unitMode = 'preset'; form.checklist[idx].unit = id; }
            renderChecklist();
          },
        });
      }
    });
  }

  // ---------------- edit: weekday picker (only for 'semanal') ----------------
  function renderWeekdayBox() {
    var box = document.getElementById('weekday-box');
    if (form.frequency !== 'semanal') { box.innerHTML = ''; return; }
    box.innerHTML = '' +
      '<div class="field" style="margin-bottom:18px"><label>Días de la semana <span style="color:var(--t3);font-weight:400">(opcional — si no eliges ninguno, se repite el mismo día de la semana que la fecha de inicio)</span></label>' +
      '<div class="colstoggle" id="weekday-toggle">' +
      WEEKDAY_LABELS.map(function (lbl, i) {
        return '<button type="button" class="coltbtn ' + (form.weekdays.indexOf(i) !== -1 ? 'on' : '') + '" data-weekday="' + i + '">' + lbl + '</button>';
      }).join('') + '</div></div>';
    box.querySelectorAll('[data-weekday]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var day = parseInt(btn.getAttribute('data-weekday'), 10);
        var idx = form.weekdays.indexOf(day);
        if (idx === -1) form.weekdays.push(day); else form.weekdays.splice(idx, 1);
        btn.classList.toggle('on');
      });
    });
  }

  function renderEdit() {
    var freqButtons = FREQ_ORDER.map(function (f) {
      return '<button type="button" class="coltbtn ' + (form.frequency === f ? 'on' : '') + '" data-freq="' + f + '">' + FREQ_LABELS[f] + '</button>';
    }).join('');
    var dateLabel = form.frequency === 'unica' ? 'Fecha' : 'Fecha de inicio';

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
      '<div class="field"><label>Área</label><div id="lab-area-dd"></div></div>' +
      '<div class="field"><label>Responsable(s)</label><div id="lab-assignee-dd"></div></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:18px"><label>Frecuencia</label><div class="colstoggle" id="lab-freq-toggle">' + freqButtons + '</div></div>' +
      '<div id="weekday-box"></div>' +
      '<div class="daysgrid">' +
      '<div class="field"><label id="lab-startdate-label">' + dateLabel + '</label><input class="input" type="date" id="lab-startdate-input" value="' + esc(form.startDate) + '"></div>' +
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
      '<li>La labor aparecerá en el calendario según la frecuencia y fecha que definas.</li>' +
      '</ul></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="lab-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar labor</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="lab-cancel"><span>Cancelar</span></button>' +
      '</div>' +
      '</div></div>';

    document.getElementById('lab-name-input').addEventListener('input', function (e) { form.name = e.target.value; });
    document.getElementById('lab-desc-input').addEventListener('input', function (e) { form.desc = e.target.value; });
    document.getElementById('lab-startdate-input').addEventListener('input', function (e) { form.startDate = e.target.value; });
    document.getElementById('lab-time-input').addEventListener('input', function (e) { form.time = e.target.value; });

    document.getElementById('lab-freq-toggle').querySelectorAll('[data-freq]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.frequency = btn.getAttribute('data-freq');
        document.getElementById('lab-freq-toggle').querySelectorAll('[data-freq]').forEach(function (b) { b.classList.toggle('on', b === btn); });
        document.getElementById('lab-startdate-label').textContent = form.frequency === 'unica' ? 'Fecha' : 'Fecha de inicio';
        renderWeekdayBox();
      });
    });
    renderWeekdayBox();

    Dropdown.mountSelect(document.getElementById('lab-area-dd'), {
      items: Store.getAreas().map(function (a) { return { id: a.id, label: a.name, icon: a.icon, color: a.color }; }),
      selectedId: form.areaId, placeholder: 'Sin área específica', hideItemIcon: true, panelColumns: 1,
      onSelect: function (id) { form.areaId = id; },
    });
    Dropdown.mountMultiSelect(document.getElementById('lab-assignee-dd'), {
      items: Store.getPersonalList().map(function (p) { return { id: p.id, label: p.name, sub: p.role || 'Sin rol asignado' }; }),
      selectedIds: form.assigneeIds, placeholder: 'Sin asignar',
      onChange: function (ids) { form.assigneeIds = ids; },
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
