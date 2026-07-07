(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list'; // 'list' | 'detail'
  var detailId = null;
  var listState = { statusFilter: 'activas', severityFilter: null, areaFilter: null };

  var STATUS_LABELS = { abierta: 'Abierta', en_seguimiento: 'En seguimiento', resuelta: 'Resuelta' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function severityLevel(id) { return Store.incidentSeverityLevels.find(function (l) { return l.id === id; }) || Store.incidentSeverityLevels[0]; }

  function decorate(inc) {
    var labor = Store.getLabor(inc.laborId);
    var inst = inc.instrumentoId ? Store.getInstrumento(inc.instrumentoId) : null;
    var area = labor && labor.areaId ? Store.getArea(labor.areaId) : null;
    return {
      raw: inc, labor: labor, inst: inst, area: area,
      laborName: labor ? labor.name : '(labor eliminada)',
      lvl: severityLevel(inc.severity),
    };
  }

  function goList() { view = 'list'; detailId = null; render(); }
  function openDetail(inc) { view = 'detail'; detailId = inc.id; render(); }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Incidencias', subtitle: 'Todo lo que necesita revisión, reparación o seguimiento.', crumb: 'Registro / Incidencias', headerButton: null });
    } else {
      var inc = Store.getIncidencia(detailId);
      var d = decorate(inc);
      Shell.setHead({ title: 'Incidencia: ' + d.laborName, subtitle: d.raw.itemLabel, crumb: 'Incidencias / Detalle', headerButton: null });
    }
  }

  // ---------------- list ----------------
  function statusChipsHTML() {
    var items = [{ id: 'activas', name: 'Activas' }, { id: 'todas', name: 'Todas' }, { id: 'resuelta', name: 'Resueltas' }];
    return items.map(function (c) {
      var on = listState.statusFilter === c.id;
      return '<button type="button" class="filter-chip ' + (on ? 'on' : '') + '" data-statusf="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');
  }
  function severityChipsHTML() {
    var levels = Store.incidentSeverityLevels.filter(function (l) { return l.id !== 'bueno'; });
    var items = [{ id: null, label: 'Todas las severidades', color: null }].concat(levels);
    return items.map(function (l) {
      var on = listState.severityFilter === l.id;
      return '<button type="button" class="filter-chip ' + (on ? 'on' : '') + '" data-severityf="' + (l.id || '') + '">' +
        (l.color ? '<span class="severity-dot severity-' + l.color + '"></span>' : '') + esc(l.label) + '</button>';
    }).join('');
  }
  function areaChipsHTML() {
    var areas = Store.getAreas();
    var items = [{ id: null, name: 'Todas las áreas', color: null }].concat(areas);
    return items.map(function (a) {
      var on = listState.areaFilter === a.id;
      return '<button type="button" class="filter-chip ' + (on ? 'on' : '') + '" data-areaf="' + (a.id || '') + '">' +
        (a.color ? '<span class="dot" style="background:' + a.color + '"></span>' : '') + esc(a.name) + '</button>';
    }).join('');
  }

  function matchingIncidencias() {
    var all = Store.getIncidencias().map(decorate);
    return all.filter(function (d) {
      if (listState.statusFilter === 'activas' && d.raw.status === 'resuelta') return false;
      if (listState.statusFilter === 'resuelta' && d.raw.status !== 'resuelta') return false;
      if (listState.severityFilter && d.raw.severity !== listState.severityFilter) return false;
      if (listState.areaFilter && (!d.area || d.area.id !== listState.areaFilter)) return false;
      return true;
    }).sort(function (a, b) {
      if (b.lvl.weight !== a.lvl.weight) return b.lvl.weight - a.lvl.weight;
      return b.raw.date < a.raw.date ? -1 : b.raw.date > a.raw.date ? 1 : 0;
    });
  }

  function renderList() {
    root.innerHTML = '' +
      '<div class="modelo-chips-row">' + statusChipsHTML() + '</div>' +
      '<div class="modelo-chips-row">' + severityChipsHTML() + '</div>' +
      '<div class="modelo-chips-row" style="margin-bottom:20px">' + areaChipsHTML() + '</div>' +
      '<div id="inc-results"></div>';

    root.querySelectorAll('[data-statusf]').forEach(function (btn) {
      btn.addEventListener('click', function () { listState.statusFilter = btn.getAttribute('data-statusf'); renderList(); });
    });
    root.querySelectorAll('[data-severityf]').forEach(function (btn) {
      btn.addEventListener('click', function () { listState.severityFilter = btn.getAttribute('data-severityf') || null; renderList(); });
    });
    root.querySelectorAll('[data-areaf]').forEach(function (btn) {
      btn.addEventListener('click', function () { listState.areaFilter = btn.getAttribute('data-areaf') || null; renderList(); });
    });

    var list = matchingIncidencias();
    var wrap = document.getElementById('inc-results');
    var cardsHTML = list.map(function (d) {
      return '<div class="inccard" data-id="' + d.raw.id + '">' +
        '<div class="inccard-top"><div><div class="inccard-name">' + esc(d.laborName) + '</div>' +
        '<div class="inccard-item">' + esc(d.raw.itemLabel) + '</div></div>' +
        '<span class="severity-badge severity-' + d.lvl.color + '">' + esc(d.lvl.label) + '</span></div>' +
        '<div class="inccard-desc">' + esc(d.raw.description) + '</div>' +
        '<div class="inccard-foot">' +
        '<span class="inccard-foot-item">' + fmtDate(d.raw.date) + '</span>' +
        '<span class="inc-status-badge ' + d.raw.status + '">' + esc(STATUS_LABELS[d.raw.status]) + '</span>' +
        '</div></div>';
    }).join('');

    wrap.innerHTML = '' +
      '<div class="sectionhead"><h2>' + (listState.statusFilter === 'activas' ? 'Incidencias activas' : listState.statusFilter === 'resuelta' ? 'Incidencias resueltas' : 'Todas las incidencias') + '</h2><span class="muted">' + list.length + '</span></div>' +
      (list.length
        ? '<div class="incgrid">' + cardsHTML + '</div>'
        : '<div class="empty"><div class="icb icb62" style="background:var(--bg);color:var(--t3)"><svg class="ic ic28"><use href="#i-alert-triangle"></use></svg></div><h3>Sin incidencias</h3><p>No hay incidencias que coincidan con este filtro.</p></div>');

    wrap.querySelectorAll('[data-id]').forEach(function (card) {
      card.addEventListener('click', function () { openDetail(Store.getIncidencia(card.getAttribute('data-id'))); });
    });
  }

  // ---------------- detail ----------------
  function renderDetail() {
    var inc = Store.getIncidencia(detailId);
    if (!inc) { goList(); return; }
    var d = decorate(inc);

    var statusButtons = ['abierta', 'en_seguimiento', 'resuelta'].map(function (s) {
      return '<button type="button" class="status-btn ' + s + ' ' + (inc.status === s ? 'on' : '') + '" data-set-status="' + s + '">' + STATUS_LABELS[s] + '</button>';
    }).join('');

    var commentsHTML = inc.comments.length
      ? '<div class="comment-list">' + inc.comments.map(function (c) {
        return '<div class="comment-item"><div class="comment-text">' + esc(c.text) + '</div>' +
          '<div class="comment-date">' + new Date(c.createdAt).toLocaleString() + '</div></div>';
      }).join('') + '</div>'
      : '<div class="comment-empty">Sin comentarios todavía.</div>';

    root.innerHTML = '' +
      '<a class="inc-back" id="inc-back-link">← Volver a incidencias</a>' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="inc-detail-head"><div>' +
      '<div class="inc-detail-title">' + esc(d.laborName) + ' — ' + esc(inc.itemLabel) + '</div>' +
      '<div class="inc-detail-meta">' +
      '<span class="inc-detail-meta-item"><svg class="ic ic14"><use href="#i-calendar"></use></svg>' + fmtDate(inc.date) + '</span>' +
      (d.area ? '<span class="inc-detail-meta-item"><span class="dot" style="background:' + d.area.color + '"></span>' + esc(d.area.name) + '</span>' : '') +
      (d.inst ? '<span class="inc-detail-meta-item"><svg class="ic ic14"><use href="' + d.inst.icon + '"></use></svg>' + esc(d.inst.name) + '</span>' : '') +
      '</div></div>' +
      '<span class="severity-badge severity-' + d.lvl.color + '"><span class="severity-dot severity-' + d.lvl.color + '"></span>' + esc(d.lvl.label) + '</span>' +
      '</div>' +
      '<div class="inc-desc-full">' + esc(inc.description) + '</div>' +
      '<div class="field" style="margin-bottom:20px"><label>Estado de la incidencia</label>' +
      '<div class="status-toggle" style="margin-top:0" id="inc-status-toggle">' + statusButtons + '</div></div>' +
      '<div class="field"><label>Comentarios y seguimiento</label>' +
      commentsHTML +
      '<div class="comment-add-row"><textarea class="textarea" id="inc-comment-input" placeholder="Agrega una actualización o comentario..." style="min-height:44px"></textarea>' +
      '<button type="button" class="btn btn-primary" id="inc-comment-add">Agregar</button></div>' +
      '</div>' +
      '</div>' +
      '<div class="editside">' +
      '<div class="tipcard" style="margin-top:0"><div class="tiphead"><svg class="ic ic18"><use href="#i-alert-triangle"></use></svg><span>Sobre las incidencias</span></div>' +
      '<ul class="tiplist">' +
      '<li>Cambia el estado a "Resuelta" cuando el problema esté solucionado — si está vinculada a un instrumento, su estado de salud se actualizará automáticamente.</li>' +
      '<li>Usa los comentarios para dejar constancia de seguimientos, diagnósticos o reparaciones.</li>' +
      '</ul></div></div></div>';

    document.getElementById('inc-back-link').addEventListener('click', goList);
    document.getElementById('inc-status-toggle').querySelectorAll('[data-set-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Store.updateIncidenciaStatus(inc.id, btn.getAttribute('data-set-status'));
        renderDetail();
      });
    });
    document.getElementById('inc-comment-add').addEventListener('click', function () {
      var input = document.getElementById('inc-comment-input');
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      Store.addIncidenciaComment(inc.id, text);
      renderDetail();
    });
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderDetail();
  }

  Shell.mount({ active: 'incidencias', title: '', subtitle: '', crumb: '' });
  render();
})();
