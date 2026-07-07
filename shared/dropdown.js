// Shared custom dropdowns (replacing native <select>), reusing the existing
// catpicker/catpick-btn/catdrop/catdrop-item visual pattern from
// productos/instrumentos. Two variants:
//   Dropdown.mountSelect(container, opts)      - single choice
//   Dropdown.mountMultiSelect(container, opts) - multiple choices, stays open
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // opts: { items:[{id,label,sub,icon,color}], selectedId, placeholder, panelColumns,
  //         hideItemIcon (panel rows show text only; closed button keeps its preview swatch),
  //         maxHeight (default 280, panel scrolls internally past this), onSelect(id) }
  function mountSelect(container, opts) {
    var open = false;
    var closeHandler = null;
    var columns = opts.panelColumns || 2;
    var maxHeight = opts.maxHeight || 280;

    function attachClose() {
      if (closeHandler) return;
      closeHandler = function (e) { if (!container.contains(e.target)) { open = false; detachClose(); render(); } };
      setTimeout(function () { document.addEventListener('click', closeHandler); }, 0);
    }
    function detachClose() {
      if (closeHandler) { document.removeEventListener('click', closeHandler); closeHandler = null; }
    }

    function itemRow(it) {
      var selected = it.id === opts.selectedId;
      return '<button type="button" class="catdrop-item ' + (selected ? 'on' : '') + '" data-id="' + esc(it.id) + '">' +
        (it.icon && !opts.hideItemIcon ? '<div class="catdrop-icon" style="background:' + (it.color || '#94a3b8') + '"><svg class="ic ic20"><use href="' + it.icon + '"></use></svg></div>' : '') +
        '<div><div class="catdrop-name">' + esc(it.label) + '</div>' + (it.sub ? '<div class="catdrop-sub">' + esc(it.sub) + '</div>' : '') + '</div></button>';
    }

    function render() {
      var sel = opts.items.find(function (i) { return i.id === opts.selectedId; });
      container.innerHTML = '' +
        '<div class="catpicker">' +
        '<button type="button" class="catpick-btn ' + (open ? 'open' : '') + '" id="_dds_btn">' +
        (sel ? ((sel.icon ? '<div class="catpick-preview" style="background:' + (sel.color || '#94a3b8') + '"><svg class="ic ic18"><use href="' + sel.icon + '"></use></svg></div>' : '') + '<span class="catpick-name">' + esc(sel.label) + '</span>')
          : '<span class="catpick-placeholder">' + esc(opts.placeholder || 'Selecciona...') + '</span>') +
        '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg></button>' +
        '<div class="catdrop" id="_dds_panel" style="display:' + (open ? 'grid' : 'none') + ';grid-template-columns:repeat(' + columns + ',1fr);max-height:' + maxHeight + 'px;overflow-y:auto">' +
        opts.items.map(itemRow).join('') + '</div></div>';

      var btn = container.querySelector('#_dds_btn');
      var panel = container.querySelector('#_dds_panel');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        open = !open;
        if (open) attachClose(); else detachClose();
        render();
      });
      panel.addEventListener('click', function (e) { e.stopPropagation(); });
      panel.querySelectorAll('[data-id]').forEach(function (row) {
        row.addEventListener('click', function () {
          opts.selectedId = row.getAttribute('data-id');
          open = false; detachClose();
          render();
          opts.onSelect(opts.selectedId);
        });
      });
    }
    render();
    return { refresh: function (newId) { opts.selectedId = newId; render(); } };
  }

  // opts: { items:[{id,label,sub}], selectedIds:[...], placeholder, onChange(selectedIds) }
  function mountMultiSelect(container, opts) {
    var open = false;
    var closeHandler = null;

    function attachClose() {
      if (closeHandler) return;
      closeHandler = function (e) { if (!container.contains(e.target)) { open = false; detachClose(); render(); } };
      setTimeout(function () { document.addEventListener('click', closeHandler); }, 0);
    }
    function detachClose() {
      if (closeHandler) { document.removeEventListener('click', closeHandler); closeHandler = null; }
    }

    function summary() {
      var names = opts.selectedIds.map(function (id) {
        var it = opts.items.find(function (i) { return i.id === id; });
        return it ? it.label : null;
      }).filter(Boolean);
      if (!names.length) return opts.placeholder || 'Selecciona...';
      if (names.length <= 2) return names.join(', ');
      return names[0] + ' +' + (names.length - 1) + ' más';
    }

    function render() {
      var hasSel = opts.selectedIds.length > 0;
      container.innerHTML = '' +
        '<div class="catpicker">' +
        '<button type="button" class="catpick-btn ' + (open ? 'open' : '') + '" id="_ddm_btn">' +
        '<span class="' + (hasSel ? 'catpick-name' : 'catpick-placeholder') + '">' + esc(summary()) + '</span>' +
        '<svg class="ic ic18" style="color:var(--t3);margin-left:auto;flex-shrink:0"><use href="#i-chevron-down"></use></svg></button>' +
        '<div class="catdrop" id="_ddm_panel" style="display:' + (open ? 'grid' : 'none') + ';grid-template-columns:1fr;max-height:280px;overflow-y:auto">' +
        opts.items.map(function (it) {
          var checked = opts.selectedIds.indexOf(it.id) !== -1;
          return '<button type="button" class="catdrop-item ' + (checked ? 'on' : '') + '" data-id="' + esc(it.id) + '" style="justify-content:space-between">' +
            '<div><div class="catdrop-name">' + esc(it.label) + '</div>' + (it.sub ? '<div class="catdrop-sub">' + esc(it.sub) + '</div>' : '') + '</div>' +
            (checked ? '<svg class="ic ic18" style="color:var(--brand);flex-shrink:0"><use href="#i-check"></use></svg>' : '') +
            '</button>';
        }).join('') + '</div></div>';

      var btn = container.querySelector('#_ddm_btn');
      var panel = container.querySelector('#_ddm_panel');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        open = !open;
        if (open) attachClose(); else detachClose();
        render();
      });
      panel.addEventListener('click', function (e) { e.stopPropagation(); });
      panel.querySelectorAll('[data-id]').forEach(function (row) {
        row.addEventListener('click', function () {
          var id = row.getAttribute('data-id');
          var idx = opts.selectedIds.indexOf(id);
          if (idx === -1) opts.selectedIds.push(id); else opts.selectedIds.splice(idx, 1);
          render();
          opts.onChange(opts.selectedIds);
        });
      });
    }
    render();
    return { refresh: function (ids) { opts.selectedIds = ids; render(); } };
  }

  window.Dropdown = { mountSelect: mountSelect, mountMultiSelect: mountMultiSelect };
})();
