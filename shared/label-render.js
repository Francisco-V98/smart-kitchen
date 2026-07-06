// Shared read-only label-preview renderer, used by the "procesos" (label model)
// grid/editor previews and the "etiquetas" (printed label) cards/overlay.
// The interactive click-to-fill preview in the label creator has its own
// markup (etiquetas.js) since it needs per-field edit popovers.
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function styleStr(obj) {
    return Object.keys(obj).map(function (k) {
      var prop = k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
      return prop + ':' + obj[k];
    }).join(';');
  }

  // rows: [{cols, fields:[{type, lbl}]}]  values: map key -> string, keyed 'pfx-rowIdx-fieldIdx'
  function rowsHTML(rows, pfx, values, labelStyle, valueStyle, divStyle, dividers) {
    return rows.map(function (r, ri) {
      var divider = ri > 0 && dividers !== false ? '<div style="' + styleStr(divStyle) + '"></div>' : '';
      var fields = r.fields.map(function (f, fi) {
        var key = pfx + '-' + ri + '-' + fi;
        var val = values ? (values[key] || '') : (Store.fieldSamples[f.type] || '—');
        return '<div class="lr-field"><div class="lr-lbl" style="' + styleStr(labelStyle) + '">' + esc(f.lbl) +
          '</div><div class="lr-val" style="' + styleStr(valueStyle) + '">' + esc(val) + '</div></div>';
      }).join('');
      var rowStyle = r.fields.length === 1 ? 'justify-content:center;text-align:center' : '';
      return divider + '<div class="lr-row" style="' + rowStyle + '">' + fields + '</div>';
    }).join('');
  }

  // model: {scheme, accent, logoPos, rowsAbove, rowsBelow, border, dividers}
  // values: optional map of captured values (etiquetas); omit to use field samples (procesos preview)
  // opts: {size:'sm'|'big', prodName}
  function renderStatic(model, opts) {
    opts = opts || {};
    var size = opts.size || 'sm';
    var values = opts.values || null;
    var prodName = opts.prodName || 'Producto';
    var headerBg = model.scheme === 'bw' ? '#111827' : model.accent;
    var labelColor = model.scheme === 'bw' ? '#374151' : model.accent;
    var divColor = model.scheme === 'bw' ? 'rgba(0,0,0,.1)' : (model.accent + '28');
    var labelStyle = { fontSize: size === 'big' ? '10px' : '9px', color: labelColor, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 };
    var valueStyle = { fontSize: size === 'big' ? '14px' : '11px', fontWeight: 600, color: '#111827', letterSpacing: '-.01em' };
    var divStyle = { height: '1px', background: divColor, margin: '1px 0', flexShrink: 0 };
    var showLogoLeft = model.logoPos === 'left' || model.logoPos === 'both';
    var showLogoRight = model.logoPos === 'right' || model.logoPos === 'both';
    var rowsAbove = model.rowsAbove || [];
    var rowsBelow = model.rowsBelow || [];
    var wrapStyle = {
      background: '#fff',
      border: model.border ? ('3px solid ' + model.accent) : '1.5px solid rgba(0,0,0,.06)',
      borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column',
    };
    var html = '<div class="label-render" style="' + styleStr(wrapStyle) + '">';
    if (rowsAbove.length) {
      html += '<div class="lr-body" style="padding-bottom:8px">' + rowsHTML(rowsAbove, 'efa', values, labelStyle, valueStyle, divStyle, model.dividers) + '</div>';
    }
    html += '<div class="lr-header" style="background:' + headerBg + '">' +
      (showLogoLeft ? '<div class="lr-logo-ph">LOGO</div>' : '') +
      '<span class="lr-namelbl">Nombre del producto</span>' +
      (showLogoRight ? '<div class="lr-logo-ph">LOGO</div>' : '') + '</div>';
    html += '<div class="lr-namebar" style="background:' + headerBg + '"><div class="lr-namebar-text">' + esc(prodName) + '</div></div>';
    if (rowsBelow.length) {
      html += '<div class="lr-body" style="padding-top:8px">' + rowsHTML(rowsBelow, 'efb', values, labelStyle, valueStyle, divStyle, model.dividers) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function fieldTags(model, limit) {
    var rows = [].concat(model.rowsAbove || [], model.rowsBelow || []);
    var types = [];
    rows.forEach(function (r) { r.fields.forEach(function (f) { if (types.indexOf(f.type) === -1) types.push(f.type); }); });
    return types.slice(0, limit || 3).map(function (t) {
      var ft = Store.fieldTypesList.find(function (x) { return x.id === t; });
      return ft ? ft.name : t;
    });
  }

  window.LabelRender = { renderStatic: renderStatic, fieldTags: fieldTags, esc: esc, styleStr: styleStr };
})();
