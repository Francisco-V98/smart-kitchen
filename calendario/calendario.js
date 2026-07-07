(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  var today = Store.todayISO();
  var view = 'calendar'; // 'calendar' | 'execute'
  var visible = parseISO(today); // any date within the currently visible week
  var executing = null; // { laborId, date }
  var execDraft = null; // { results: {itemId: {value, itemStatus, description, severity}}, report }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function hasIncidencia(occ) {
    return !!(occ.ejecucion && (occ.ejecucion.results || []).some(function (r) { return r.itemStatus === 'incidencia'; }));
  }
  function assigneeText(labor) {
    var names = (labor.assigneeIds || []).map(function (id) { var p = Store.getPersona(id); return p ? p.name : null; }).filter(Boolean);
    if (!names.length) return '';
    return names.length <= 2 ? names.join(', ') : names[0] + ' +' + (names.length - 1) + ' más';
  }
  function getWeekStart(d) {
    var dow = (d.getDay() + 6) % 7; // Monday = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  }

  function updateHead() {
    if (view === 'calendar') {
      Shell.setHead({ title: 'Calendario de labores', subtitle: 'Consulta y ejecuta las labores programadas de esta semana.', crumb: 'Registro / Calendario', headerButton: null });
    } else {
      var labor = Store.getLabor(executing.laborId);
      var d = parseISO(executing.date);
      Shell.setHead({ title: 'Ejecutar labor', subtitle: (labor ? labor.name : '') + ' · ' + d.getDate() + ' de ' + MONTHS[d.getMonth()], crumb: 'Calendario / Ejecutar', headerButton: null });
    }
  }

  // ---------------- calendar view: week + kanban ----------------
  function renderCalendar() {
    var start = getWeekStart(visible);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    var end = days[6];
    var weekLabel = start.getMonth() === end.getMonth()
      ? start.getDate() + ' – ' + end.getDate() + ' de ' + MONTHS[start.getMonth()] + ' ' + start.getFullYear()
      : start.getDate() + ' de ' + MONTHS[start.getMonth()] + ' – ' + end.getDate() + ' de ' + MONTHS[end.getMonth()] + ' ' + end.getFullYear();

    var columnsHTML = days.map(function (d, i) {
      var iso = toISO(d);
      var occs = Store.getOccurrencesForDate(iso).slice().sort(function (a, b) {
        return (a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1);
      });
      var cardsHTML = occs.map(occCardHTML).join('');
      return '<div class="kanban-col ' + (iso === today ? 'today' : '') + '">' +
        '<div class="kanban-col-head"><div><div class="kanban-col-day">' + WEEKDAYS[i] + '</div>' +
        '<div class="kanban-col-num">' + d.getDate() + '</div></div>' +
        (occs.length ? '<span class="kanban-col-count">' + occs.length + '</span>' : '') + '</div>' +
        '<div class="kanban-col-body">' + (cardsHTML || '<div class="kanban-empty">Sin labores</div>') + '</div>' +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="cal-head">' +
      '<button type="button" class="cal-nav-btn" id="cal-prev"><svg class="ic ic16" style="transform:rotate(90deg)"><use href="#i-chevron-down"></use></svg></button>' +
      '<div class="cal-month-label">' + weekLabel + '</div>' +
      '<button type="button" class="cal-nav-btn" id="cal-next"><svg class="ic ic16" style="transform:rotate(-90deg)"><use href="#i-chevron-down"></use></svg></button>' +
      '<button type="button" class="cal-today-btn" id="cal-today">Hoy</button>' +
      '</div>' +
      '<div class="kanban-board">' + columnsHTML + '</div>';

    document.getElementById('cal-prev').addEventListener('click', function () { visible = new Date(visible.getFullYear(), visible.getMonth(), visible.getDate() - 7); renderCalendar(); });
    document.getElementById('cal-next').addEventListener('click', function () { visible = new Date(visible.getFullYear(), visible.getMonth(), visible.getDate() + 7); renderCalendar(); });
    document.getElementById('cal-today').addEventListener('click', function () { visible = parseISO(today); renderCalendar(); });
    root.querySelectorAll('[data-execute-labor]').forEach(function (card) {
      card.addEventListener('click', function () {
        openExecute(card.getAttribute('data-execute-labor'), card.getAttribute('data-execute-date'));
      });
    });
  }

  function activeIncidenciaCount(labor) {
    return labor.checklist.filter(function (ci) {
      var inst = ci.instrumentoId ? Store.getInstrumento(ci.instrumentoId) : null;
      return inst && inst.status !== 'bueno';
    }).length;
  }

  function occCardHTML(o) {
    var alert = hasIncidencia(o);
    var completed = o.estado === 'completada';
    var area = o.labor.areaId ? Store.getArea(o.labor.areaId) : null;
    var names = assigneeText(o.labor);
    var statusClass = alert ? 'incidencia' : o.estado;
    var statusLabel = alert ? 'Con incidencia' : (completed ? 'Completada' : 'Pendiente');
    var muted = completed ? 'color:var(--t3)' : '';
    var incCount = activeIncidenciaCount(o.labor);
    return '<div class="kanban-card ' + (completed ? 'done' : '') + '" data-execute-labor="' + o.labor.id + '" data-execute-date="' + o.date + '">' +
      '<div class="kanban-card-name">' + esc(o.labor.name) + '</div>' +
      '<div class="kanban-card-meta">' +
      (area ? '<span class="kanban-meta-item" style="' + muted + '"><span class="dot" style="background:' + (completed ? '#c7ccd6' : area.color) + '"></span>' + esc(area.name) + '</span>' : '') +
      (o.labor.time ? '<span class="kanban-meta-item" style="' + muted + '"><svg class="ic ic12"><use href="#i-clock"></use></svg>' + esc(o.labor.time) + '</span>' : '') +
      (names ? '<span class="kanban-meta-item" style="' + muted + '"><svg class="ic ic12"><use href="#i-users"></use></svg>' + esc(names) + '</span>' : '') +
      '</div>' +
      (incCount ? '<span class="kanban-inc-tag"><svg class="ic ic12"><use href="#i-alert-triangle"></use></svg>' + incCount + (incCount === 1 ? ' incidencia' : ' incidencias') + '</span>' : '') +
      '<span class="cal-status-pill ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>';
  }

  // ---------------- execution view ----------------
  function openExecute(laborId, dateStr) {
    var labor = Store.getLabor(laborId);
    if (!labor) return;
    var ej = Store.getEjecucion(laborId, dateStr);
    var results = {};
    (ej ? ej.results : []).forEach(function (r) { results[r.checklistItemId] = { value: r.value, itemStatus: r.itemStatus }; });
    labor.checklist.forEach(function (ci) {
      if (!results[ci.id]) results[ci.id] = { value: '', itemStatus: 'ok' };
      var inc = Store.getIncidenciaByKey(laborId, dateStr, ci.id);
      results[ci.id].description = inc ? inc.description : '';
      results[ci.id].severity = inc ? inc.severity : 'revision';
      results[ci.id].image = inc ? (inc.image || null) : null;
      var inst = ci.instrumentoId ? Store.getInstrumento(ci.instrumentoId) : null;
      if (inst && inst.status !== 'bueno') results[ci.id].itemStatus = 'incidencia';
    });
    executing = { laborId: laborId, date: dateStr };
    execDraft = { results: results, report: ej ? (ej.report || '') : '' };
    view = 'execute';
    render();
  }

  function cancelExecute() { view = 'calendar'; executing = null; execDraft = null; render(); }

  function isKnownBroken(ci) {
    var inst = ci.instrumentoId ? Store.getInstrumento(ci.instrumentoId) : null;
    return !!(inst && inst.status !== 'bueno');
  }

  function saveExecute() {
    var labor = Store.getLabor(executing.laborId);
    for (var i = 0; i < labor.checklist.length; i++) {
      var ci = labor.checklist[i];
      var r = execDraft.results[ci.id];
      if (r.itemStatus === 'incidencia' && !isKnownBroken(ci) && !(r.description || '').trim()) {
        var el = root.querySelector('.exec-item[data-item="' + ci.id + '"] [data-desc-input]');
        if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
    }
    var resultsArr = labor.checklist.map(function (ci) {
      var r = execDraft.results[ci.id];
      return { checklistItemId: ci.id, value: r.value, itemStatus: r.itemStatus };
    });
    Store.saveEjecucion(executing.laborId, executing.date, { results: resultsArr, report: execDraft.report, completedBy: (labor.assigneeIds && labor.assigneeIds[0]) || null });

    labor.checklist.forEach(function (ci) {
      if (isKnownBroken(ci)) return; // already tracked by its existing open incidencia, don't touch it here
      var r = execDraft.results[ci.id];
      if (r.itemStatus === 'incidencia') {
        Store.saveIncidencia(executing.laborId, executing.date, ci.id, {
          itemLabel: ci.label, instrumentoId: ci.instrumentoId || null,
          severity: r.severity || 'revision', description: r.description.trim(), image: r.image || null,
        });
      } else {
        Store.deleteIncidenciaByKey(executing.laborId, executing.date, ci.id);
      }
    });

    view = 'calendar'; executing = null; execDraft = null;
    render();
  }

  function imageAttachHTML(ci, r) {
    if (r.image) {
      return '<div class="img-thumb-wrap"><img class="img-thumb" src="' + r.image + '">' +
        '<button type="button" class="img-thumb-remove" data-remove-image="' + ci.id + '" title="Quitar imagen"><svg class="ic ic14"><use href="#i-x"></use></svg></button></div>';
    }
    return '<button type="button" class="img-attach-btn" data-attach-trigger="' + ci.id + '"><svg class="ic ic16"><use href="#i-image"></use></svg>Adjuntar imagen (opcional)</button>' +
      '<input type="file" accept="image/*" data-image-input="' + ci.id + '" style="display:none">';
  }

  function execItemHTML(ci) {
    var r = execDraft.results[ci.id];
    var inst = ci.instrumentoId ? Store.getInstrumento(ci.instrumentoId) : null;
    var knownBroken = isKnownBroken(ci);

    var warningHTML = '';
    var instLvl = null, openIncs = [];
    if (inst && inst.status !== 'bueno') {
      instLvl = Store.incidentSeverityLevels.find(function (l) { return l.id === inst.status; });
      openIncs = Store.getOpenIncidenciasForInstrumento(inst.id);
      warningHTML = '<div class="exec-item-warning severity-' + instLvl.color + '"><svg class="ic ic16"><use href="#i-alert-triangle"></use></svg>' +
        '<span>' + esc(inst.name) + ' está marcado como "' + esc(instLvl.label) + '"' + (openIncs.length ? ' — ver en Incidencias.' : '') + '</span></div>';
    }

    var valueHTML = '';
    if (ci.valueType === 'rango') {
      valueHTML = '<input class="input" type="number" placeholder="Valor registrado" value="' + esc(r.value) + '" data-value-input="' + ci.id + '">' +
        '<div class="exec-item-hint">Rango esperado: ' + esc(ci.min) + '–' + esc(ci.max) + ' ' + esc(ci.unit || '') + '</div>';
    } else if (ci.valueType === 'conteo') {
      valueHTML = '<input class="input" type="number" placeholder="' + (ci.unit ? esc(ci.unit) : 'Cantidad') + '" value="' + esc(r.value) + '" data-value-input="' + ci.id + '">' +
        (ci.value ? '<div class="exec-item-hint">Valor esperado: ' + esc(ci.value) + ' ' + esc(ci.unit || '') + '</div>' : '');
    }

    if (knownBroken) {
      var sortedIncs = openIncs.slice().sort(function (a, b) {
        var wa = Store.incidentSeverityLevels.find(function (l) { return l.id === a.severity; }).weight;
        var wb = Store.incidentSeverityLevels.find(function (l) { return l.id === b.severity; }).weight;
        return wb - wa || (b.date < a.date ? -1 : 1);
      });
      var targetId = sortedIncs.length ? sortedIncs[0].id : '';
      return '<div class="exec-item" data-item="' + ci.id + '">' +
        warningHTML +
        '<div class="exec-item-head">' + (inst ? '<svg class="ic ic18" style="color:var(--brand);flex-shrink:0"><use href="' + inst.icon + '"></use></svg>' : '') +
        '<div class="exec-item-label">' + esc(ci.label) + '</div></div>' +
        valueHTML +
        '<button type="button" class="btn btn-ghost f1" style="margin-top:12px" data-view-incidencia="' + targetId + '"><svg class="ic ic18"><use href="#i-alert-triangle"></use></svg><span>Ver incidencia</span></button>' +
        '</div>';
    }

    var incidenciaHTML = '';
    if (r.itemStatus === 'incidencia') {
      var sevButtons = Store.incidentSeverityLevels.filter(function (l) { return l.id !== 'bueno'; }).map(function (l) {
        return '<button type="button" class="severity-pick-btn severity-' + l.color + ' ' + (r.severity === l.id ? 'on' : '') + '" data-severity="' + l.id + '" data-item="' + ci.id + '">' + esc(l.label) + '</button>';
      }).join('');
      incidenciaHTML = '<div class="exec-incidencia-block">' +
        '<label>Severidad</label><div class="severity-pick-row">' + sevButtons + '</div>' +
        '<label>Describe la incidencia <span style="color:var(--red)">*</span></label>' +
        '<textarea class="textarea" data-desc-input="' + ci.id + '" placeholder="Ej. Nevera 2 no quiere enfriar, la temperatura no baja de 12°C.">' + esc(r.description || '') + '</textarea>' +
        '<label>Imagen</label>' + imageAttachHTML(ci, r) +
        '</div>';
    }

    return '<div class="exec-item" data-item="' + ci.id + '">' +
      warningHTML +
      '<div class="exec-item-head">' + (inst ? '<svg class="ic ic18" style="color:var(--brand);flex-shrink:0"><use href="' + inst.icon + '"></use></svg>' : '') +
      '<div class="exec-item-label">' + esc(ci.label) + '</div></div>' +
      valueHTML +
      '<div class="status-toggle">' +
      '<button type="button" class="status-btn ok ' + (r.itemStatus === 'ok' ? 'on' : '') + '" data-status="ok" data-item="' + ci.id + '">OK</button>' +
      '<button type="button" class="status-btn incidencia ' + (r.itemStatus === 'incidencia' ? 'on' : '') + '" data-status="incidencia" data-item="' + ci.id + '">Incidencia</button>' +
      '<button type="button" class="status-btn na ' + (r.itemStatus === 'na' ? 'on' : '') + '" data-status="na" data-item="' + ci.id + '">No aplica</button>' +
      '</div>' +
      incidenciaHTML +
      '</div>';
  }

  function wireExecItem(ci) {
    var el = root.querySelector('.exec-item[data-item="' + ci.id + '"]');
    if (!el) return;
    var valInput = el.querySelector('[data-value-input]');
    if (valInput) valInput.addEventListener('input', function () { execDraft.results[ci.id].value = valInput.value; });
    el.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        execDraft.results[ci.id].itemStatus = btn.getAttribute('data-status');
        refreshExecItem(ci);
      });
    });
    el.querySelectorAll('[data-severity]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        execDraft.results[ci.id].severity = btn.getAttribute('data-severity');
        refreshExecItem(ci);
      });
    });
    var descInput = el.querySelector('[data-desc-input]');
    if (descInput) descInput.addEventListener('input', function () { execDraft.results[ci.id].description = descInput.value; });
    var attachTrigger = el.querySelector('[data-attach-trigger]');
    var imageInput = el.querySelector('[data-image-input]');
    if (attachTrigger && imageInput) attachTrigger.addEventListener('click', function () { imageInput.click(); });
    if (imageInput) imageInput.addEventListener('change', function () {
      ImageUpload.readAsDataURL(imageInput.files[0], function (dataUrl) {
        execDraft.results[ci.id].image = dataUrl;
        refreshExecItem(ci);
      });
    });
    var removeImageBtn = el.querySelector('[data-remove-image]');
    if (removeImageBtn) removeImageBtn.addEventListener('click', function () {
      execDraft.results[ci.id].image = null;
      refreshExecItem(ci);
    });
    var viewIncBtn = el.querySelector('[data-view-incidencia]');
    if (viewIncBtn) viewIncBtn.addEventListener('click', function () {
      var id = viewIncBtn.getAttribute('data-view-incidencia');
      window.location.href = '../incidencias/index.html' + (id ? '?open=' + encodeURIComponent(id) : '');
    });
  }

  function refreshExecItem(ci) {
    var el = root.querySelector('.exec-item[data-item="' + ci.id + '"]');
    if (!el) return;
    var temp = document.createElement('div');
    temp.innerHTML = execItemHTML(ci);
    el.replaceWith(temp.firstElementChild);
    wireExecItem(ci);
  }

  function renderExecute() {
    var labor = Store.getLabor(executing.laborId);
    var d = parseISO(executing.date);
    var dateLabel = d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear();

    var itemsHTML = labor.checklist.map(execItemHTML).join('');

    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      itemsHTML +
      '<div class="field"><label>Informe / comentarios <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="exec-report-input" placeholder="Deja un comentario general sobre la labor...">' + esc(execDraft.report) + '</textarea></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="exec-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar informe</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="exec-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside">' +
      '<div class="sidecard"><div class="sidelabel">Labor</div>' +
      '<div class="pvcard"><div style="font-size:15.5px;font-weight:700;color:var(--t1);margin-bottom:6px">' + esc(labor.name) + '</div>' +
      '<div style="font-size:13px;color:var(--t3)">' + dateLabel + (labor.time ? ' · ' + esc(labor.time) : '') + '</div></div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-clipboard"></use></svg><span>Recuerda</span></div>' +
      '<ul class="tiplist">' +
      '<li>Marca "Incidencia" si algo no cumple lo esperado — deberás describirla y elegir su severidad.</li>' +
      '<li>Las incidencias quedan registradas en la pantalla Incidencias, donde se les da seguimiento.</li>' +
      '<li>Puedes editar una labor ya completada si necesitas corregir un valor.</li>' +
      '</ul></div></div></div>';

    labor.checklist.forEach(wireExecItem);
    document.getElementById('exec-report-input').addEventListener('input', function (e) { execDraft.report = e.target.value; });
    document.getElementById('exec-save').addEventListener('click', saveExecute);
    document.getElementById('exec-cancel').addEventListener('click', cancelExecute);
  }

  function render() {
    updateHead();
    if (view === 'calendar') renderCalendar(); else renderExecute();
  }

  Shell.mount({ active: 'calendario', title: '', subtitle: '', crumb: '' });
  render();
})();
