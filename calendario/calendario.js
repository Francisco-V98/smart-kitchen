(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var WEEKDAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  var today = Store.todayISO();
  var view = 'calendar'; // 'calendar' | 'execute'
  var visible = parseISO(today); // month currently shown
  var selectedDate = today;
  var executing = null; // { laborId, date }
  var execDraft = null; // { results: {itemId: {value, itemStatus}}, report }

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

  function buildMonthCells(year, month) {
    var first = new Date(year, month, 1);
    var startOffset = (first.getDay() + 6) % 7; // Monday = 0
    var start = new Date(year, month, 1 - startOffset);
    var cells = [];
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      cells.push({ date: d, iso: toISO(d), inMonth: d.getMonth() === month });
    }
    return cells;
  }

  function updateHead() {
    if (view === 'calendar') {
      Shell.setHead({ title: 'Calendario de labores', subtitle: 'Consulta y ejecuta las labores programadas para cada día.', crumb: 'Registro / Calendario', headerButton: null });
    } else {
      var labor = Store.getLabor(executing.laborId);
      var d = parseISO(executing.date);
      Shell.setHead({ title: 'Ejecutar labor', subtitle: (labor ? labor.name : '') + ' · ' + d.getDate() + ' de ' + MONTHS[d.getMonth()], crumb: 'Calendario / Ejecutar', headerButton: null });
    }
  }

  // ---------------- calendar view ----------------
  function renderCalendar() {
    var year = visible.getFullYear(), month = visible.getMonth();
    var cells = buildMonthCells(year, month);
    var monthLabel = MONTHS[month] + ' ' + year;
    var weekdaysHTML = WEEKDAYS.map(function (w) { return '<div class="cal-weekday">' + w + '</div>'; }).join('');

    var cellsHTML = cells.map(function (c) {
      var occs = Store.getOccurrencesForDate(c.iso);
      var pending = occs.filter(function (o) { return o.estado === 'pendiente'; }).length;
      var done = occs.filter(function (o) { return o.estado === 'completada'; }).length;
      var alert = occs.some(hasIncidencia);
      var classes = ['cal-cell'];
      if (!c.inMonth) classes.push('other-month');
      if (c.iso === today) classes.push('today');
      if (c.iso === selectedDate) classes.push('selected');
      var badges = '';
      if (pending) badges += '<span class="cal-badge cal-badge-pending">' + pending + ' pend.</span>';
      if (done) badges += '<span class="cal-badge cal-badge-done">' + done + ' ok</span>';
      if (alert) badges += '<span class="cal-badge cal-badge-alert" title="Incidencia"></span>';
      return '<div class="' + classes.join(' ') + '" data-date="' + c.iso + '">' +
        '<div class="cal-cell-num">' + c.date.getDate() + '</div>' +
        (badges ? '<div class="cal-cell-badges">' + badges + '</div>' : '') +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="cal-wrap">' +
      '<div class="cal-card">' +
      '<div class="cal-head">' +
      '<button type="button" class="cal-nav-btn" id="cal-prev"><svg class="ic ic16" style="transform:rotate(90deg)"><use href="#i-chevron-down"></use></svg></button>' +
      '<div class="cal-month-label">' + monthLabel + '</div>' +
      '<button type="button" class="cal-nav-btn" id="cal-next"><svg class="ic ic16" style="transform:rotate(-90deg)"><use href="#i-chevron-down"></use></svg></button>' +
      '<button type="button" class="cal-today-btn" id="cal-today">Hoy</button>' +
      '</div>' +
      '<div class="cal-weekdays">' + weekdaysHTML + '</div>' +
      '<div class="cal-grid">' + cellsHTML + '</div>' +
      '</div>' +
      '<div class="cal-card" id="cal-panel"></div>' +
      '</div>';

    document.getElementById('cal-prev').addEventListener('click', function () { visible = new Date(year, month - 1, 1); renderCalendar(); });
    document.getElementById('cal-next').addEventListener('click', function () { visible = new Date(year, month + 1, 1); renderCalendar(); });
    document.getElementById('cal-today').addEventListener('click', function () { visible = parseISO(today); selectedDate = today; renderCalendar(); });
    root.querySelectorAll('[data-date]').forEach(function (cell) {
      cell.addEventListener('click', function () { selectedDate = cell.getAttribute('data-date'); renderCalendar(); });
    });

    renderDayPanel();
  }

  function renderDayPanel() {
    var panel = document.getElementById('cal-panel');
    var occs = Store.getOccurrencesForDate(selectedDate);
    var d = parseISO(selectedDate);
    var heading = WEEKDAYS_LONG[(d.getDay() + 6) % 7] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()];

    var itemsHTML = occs.map(function (o) {
      var area = o.labor.areaId ? Store.getArea(o.labor.areaId) : null;
      var names = (o.labor.assigneeIds || []).map(function (id) { var p = Store.getPersona(id); return p ? p.name : null; }).filter(Boolean);
      var assigneeText = names.length <= 2 ? names.join(', ') : names[0] + ' +' + (names.length - 1) + ' más';
      var alert = hasIncidencia(o);
      var statusClass = alert ? 'incidencia' : o.estado;
      var statusLabel = alert ? 'Con incidencia' : (o.estado === 'completada' ? 'Completada' : 'Pendiente');
      return '<div class="cal-occ-item">' +
        '<div class="cal-occ-top"><div><div class="cal-occ-name">' + esc(o.labor.name) + '</div>' +
        '<div class="cal-occ-meta">' +
        (area ? '<span class="cal-occ-meta-item"><span class="dot" style="background:' + area.color + '"></span>' + esc(area.name) + '</span>' : '') +
        (o.labor.time ? '<span class="cal-occ-meta-item"><svg class="ic ic12"><use href="#i-clock"></use></svg>' + esc(o.labor.time) + '</span>' : '') +
        (names.length ? '<span class="cal-occ-meta-item"><svg class="ic ic12"><use href="#i-users"></use></svg>' + esc(assigneeText) + '</span>' : '') +
        '</div></div>' +
        '<span class="cal-status-pill ' + statusClass + '">' + statusLabel + '</span>' +
        '</div>' +
        '<div class="cal-occ-actions"><button type="button" class="btn btn-ghost" data-execute-labor="' + o.labor.id + '" data-execute-date="' + o.date + '">' +
        '<svg class="ic ic18"><use href="' + (o.estado === 'completada' ? '#i-pencil' : '#i-check') + '"></use></svg><span>' + (o.estado === 'completada' ? 'Ver / Editar' : 'Ejecutar') + '</span></button></div>' +
        '</div>';
    }).join('');

    panel.innerHTML = '' +
      '<div class="cal-panel-date">' + heading + '</div>' +
      '<div class="cal-panel-sub">' + (occs.length ? occs.length + (occs.length === 1 ? ' labor programada' : ' labores programadas') : 'Sin labores programadas para este día') + '</div>' +
      '<div class="cal-occ-list">' + itemsHTML + '</div>';

    panel.querySelectorAll('[data-execute-labor]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openExecute(btn.getAttribute('data-execute-labor'), btn.getAttribute('data-execute-date'));
      });
    });
  }

  // ---------------- execution view ----------------
  function openExecute(laborId, dateStr) {
    var labor = Store.getLabor(laborId);
    if (!labor) return;
    var ej = Store.getEjecucion(laborId, dateStr);
    var results = {};
    (ej ? ej.results : []).forEach(function (r) { results[r.checklistItemId] = { value: r.value, itemStatus: r.itemStatus }; });
    labor.checklist.forEach(function (ci) { if (!results[ci.id]) results[ci.id] = { value: '', itemStatus: 'ok' }; });
    executing = { laborId: laborId, date: dateStr };
    execDraft = { results: results, report: ej ? (ej.report || '') : '' };
    view = 'execute';
    render();
  }

  function cancelExecute() { view = 'calendar'; executing = null; execDraft = null; render(); }

  function saveExecute() {
    var labor = Store.getLabor(executing.laborId);
    var resultsArr = labor.checklist.map(function (ci) {
      var r = execDraft.results[ci.id];
      return { checklistItemId: ci.id, value: r.value, itemStatus: r.itemStatus };
    });
    Store.saveEjecucion(executing.laborId, executing.date, { results: resultsArr, report: execDraft.report, completedBy: (labor.assigneeIds && labor.assigneeIds[0]) || null });
    view = 'calendar';
    executing = null; execDraft = null;
    render();
  }

  function renderExecute() {
    var labor = Store.getLabor(executing.laborId);
    var d = parseISO(executing.date);
    var dateLabel = d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear();

    var itemsHTML = labor.checklist.map(function (ci) {
      var r = execDraft.results[ci.id];
      var inst = ci.instrumentoId ? Store.getInstrumento(ci.instrumentoId) : null;
      var valueHTML = '';
      if (ci.valueType === 'rango') {
        valueHTML = '<input class="input" type="number" placeholder="Valor registrado" value="' + esc(r.value) + '" data-value-input="' + ci.id + '">' +
          '<div class="exec-item-hint">Rango esperado: ' + esc(ci.min) + '–' + esc(ci.max) + ' ' + esc(ci.unit || '') + '</div>';
      } else if (ci.valueType === 'conteo') {
        valueHTML = '<input class="input" type="number" placeholder="' + (ci.unit ? esc(ci.unit) : 'Cantidad') + '" value="' + esc(r.value) + '" data-value-input="' + ci.id + '">' +
          (ci.value ? '<div class="exec-item-hint">Valor esperado: ' + esc(ci.value) + ' ' + esc(ci.unit || '') + '</div>' : '');
      }
      return '<div class="exec-item" data-item="' + ci.id + '">' +
        '<div class="exec-item-head">' + (inst ? '<svg class="ic ic18" style="color:var(--brand);flex-shrink:0"><use href="' + inst.icon + '"></use></svg>' : '') +
        '<div class="exec-item-label">' + esc(ci.label) + '</div></div>' +
        valueHTML +
        '<div class="status-toggle">' +
        '<button type="button" class="status-btn ok ' + (r.itemStatus === 'ok' ? 'on' : '') + '" data-status="ok" data-item="' + ci.id + '">OK</button>' +
        '<button type="button" class="status-btn incidencia ' + (r.itemStatus === 'incidencia' ? 'on' : '') + '" data-status="incidencia" data-item="' + ci.id + '">Incidencia</button>' +
        '<button type="button" class="status-btn na ' + (r.itemStatus === 'na' ? 'on' : '') + '" data-status="na" data-item="' + ci.id + '">No aplica</button>' +
        '</div></div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      itemsHTML +
      '<div class="field"><label>Informe / comentarios <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<textarea class="textarea" id="exec-report-input" placeholder="Deja un comentario sobre incidencias u observaciones...">' + esc(execDraft.report) + '</textarea></div>' +
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
      '<li>Marca "Incidencia" si algo no cumple lo esperado y descríbelo en el informe.</li>' +
      '<li>Puedes editar una labor ya completada si necesitas corregir un valor.</li>' +
      '</ul></div></div></div>';

    root.querySelectorAll('[data-value-input]').forEach(function (inp) {
      inp.addEventListener('input', function () { execDraft.results[inp.getAttribute('data-value-input')].value = inp.value; });
    });
    root.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var itemId = btn.getAttribute('data-item');
        execDraft.results[itemId].itemStatus = btn.getAttribute('data-status');
        var itemEl = root.querySelector('.exec-item[data-item="' + itemId + '"]');
        itemEl.querySelectorAll('[data-status]').forEach(function (b) {
          b.classList.toggle('on', b.getAttribute('data-status') === execDraft.results[itemId].itemStatus);
        });
      });
    });
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
