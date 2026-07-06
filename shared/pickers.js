// Shared icon-gallery + color-swatch picker widgets, used by any screen that
// lets the user pick an icon and/or color for a record (áreas, instrumentos,
// and — inline, not retrofitted — categorías already has its own copy of this
// same UI pattern).
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // opts: { selected, onSelect(iconId) }
  function mountIconPicker(container, opts) {
    var search = '';
    var galleryOpen = false;

    function filtered() {
      var q = search.toLowerCase();
      var all = q ? Store.allIcons.filter(function (i) { return i.label.toLowerCase().indexOf(q) !== -1; }) : Store.allIcons;
      return (galleryOpen || q) ? all : all.slice(0, 12);
    }

    function render() {
      var list = filtered().map(function (i) {
        return '<button type="button" class="iconopt ' + (i.id === opts.selected ? 'on' : '') + '" data-icon="' + i.id + '" title="' + esc(i.label) + '">' +
          '<svg class="ic ic20"><use href="' + i.id + '"></use></svg><span class="iconlabel">' + esc(i.label) + '</span></button>';
      }).join('');
      container.innerHTML = '' +
        '<div class="ig-wrap"><div class="ig-toprow">' +
        '<div class="ig-search"><svg class="ic ic16" style="color:var(--t3);flex-shrink:0"><use href="#i-search"></use></svg>' +
        '<input placeholder="Buscar icono..." value="' + esc(search) + '"></div>' +
        '<button type="button" class="btn btn-ghost" style="height:42px;font-size:13px;padding:0 16px;flex-shrink:0">' +
        (galleryOpen ? 'Ver menos' : 'Ver todos (' + Store.allIcons.length + ' iconos)') + '</button>' +
        '</div><div class="iconpick">' + list + '</div></div>';

      container.querySelector('.ig-search input').addEventListener('input', function (e) { search = e.target.value; render(); });
      container.querySelector('.ig-toprow .btn').addEventListener('click', function () { galleryOpen = !galleryOpen; render(); });
      container.querySelectorAll('[data-icon]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          opts.selected = btn.getAttribute('data-icon');
          search = ''; galleryOpen = false;
          render();
          opts.onSelect(opts.selected);
        });
      });
    }
    render();
    return { refresh: function (newSelected) { opts.selected = newSelected; render(); } };
  }

  // opts: { selected, onSelect(color), colorInputId }  -- colorInputId is a
  // hidden <input type=color> already present in the page (see index.html).
  function mountColorPicker(container, opts) {
    function render() {
      var swatchesHTML = Store.palette.map(function (c) {
        var on = c === opts.selected;
        return '<button type="button" class="swatch" data-color="' + c + '" style="' + (on ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px ' + c : '') + '"><span class="swfill" style="background:' + c + '"></span></button>';
      }).join('');
      var customOn = Store.palette.indexOf(opts.selected) === -1;
      container.innerHTML = '' +
        '<div class="swatches" style="position:relative">' + swatchesHTML +
        '<button type="button" class="swatch" style="' + (customOn ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px ' + opts.selected : '') + '" title="Color personalizado">' +
        '<span class="swfill-rainbow"><svg class="ic ic14" style="color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><use href="#i-palette"></use></svg></span></button></div>';

      container.querySelectorAll('[data-color]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          opts.selected = btn.getAttribute('data-color');
          render();
          opts.onSelect(opts.selected);
        });
      });
      container.querySelector('.swatch:last-child').addEventListener('click', function () {
        var el = document.getElementById(opts.colorInputId);
        el.value = opts.selected;
        el.click();
      });
    }
    render();
    return { refresh: function (newColor) { opts.selected = newColor; render(); } };
  }

  window.Pickers = { mountIconPicker: mountIconPicker, mountColorPicker: mountColorPicker };
})();
