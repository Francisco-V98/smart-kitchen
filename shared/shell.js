// Shared app shell: sidebar, topbar, mobile nav and page header.
// Every screen calls Shell.mount({...}) once, then Shell.setHead({...})
// whenever its title/subtitle/header button needs to change.
(function () {
  'use strict';

  var NAV = [
    { id: 'etiquetas', name: 'Etiquetas', short: 'Etiquetas', icon: '#i-tag', href: '../etiquetas/index.html' },
    { id: 'categorias', name: 'Categorías', short: 'Categorías', icon: '#i-grid', href: '../categorias/index.html' },
    { id: 'productos', name: 'Productos', short: 'Productos', icon: '#i-salad', href: '../productos/index.html' },
    { id: 'procesos', name: 'Modelos de etiqueta', short: 'Modelos', icon: '#i-utensils', href: '../procesos/index.html' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var active = null;

  function sidebarHTML() {
    var items = NAV.map(function (n) {
      return '<a class="navitem ' + (n.id === active ? 'on' : '') + '" href="' + n.href + '">' +
        '<svg class="ic ic20"><use href="' + n.icon + '"></use></svg><span>' + esc(n.name) + '</span></a>';
    }).join('');
    return '' +
      '<div class="brand"><div class="brandmark"><svg class="ic ic24"><use href="#i-chef"></use></svg></div>' +
      '<div><div class="brandname">Kotania</div><div class="brandsub">Smart Kitchen</div></div></div>' +
      '<div class="navlabel">Etiqueta</div>' + items +
      '<div class="navlabel">Registros</div>' +
      '<div class="navitem soon"><svg class="ic ic20"><use href="#i-printer"></use></svg><span>Etiquetas impresas</span><span class="soonpill">PRONTO</span></div>' +
      '<div class="navitem soon"><svg class="ic ic20"><use href="#i-clock"></use></svg><span>Caducidades</span><span class="soonpill">PRONTO</span></div>' +
      '<div class="navitem soon"><svg class="ic ic20"><use href="#i-chart"></use></svg><span>Reportes</span><span class="soonpill">PRONTO</span></div>' +
      '<div class="usercard"><div class="avatar av36">AR</div>' +
      '<div><div class="uc-name">Ana Ruiz</div><div class="uc-role">Chef · <span id="shell-kitchen-name">' + esc(Store.getKitchen()) + '</span></div></div>' +
      '<button class="ucbtn"><svg class="ic ic18"><use href="#i-settings"></use></svg></button></div>';
  }

  function mobileNavHTML() {
    return NAV.map(function (n) {
      return '<a class="mobile-navitem ' + (n.id === active ? 'on' : '') + '" href="' + n.href + '">' +
        '<svg class="ic ic22"><use href="' + n.icon + '"></use></svg><span>' + esc(n.short) + '</span></a>';
    }).join('');
  }

  function kmenuHTML() {
    return Store.kitchenList.map(function (k) {
      var on = k === Store.getKitchen();
      return '<button class="kitem ' + (on ? 'on' : '') + '" data-kitchen="' + esc(k) + '"><span>' + esc(k) + '</span>' +
        (on ? '<svg class="ic ic16"><use href="#i-check"></use></svg>' : '') + '</button>';
    }).join('');
  }

  function topbarHTML(crumb) {
    return '' +
      '<div class="crumb">' + esc(crumb) + '</div>' +
      '<div class="tbr">' +
      '<div class="kpick"><button class="kbtn" id="shell-kbtn"><span id="shell-kbtn-label">' + esc(Store.getKitchen()) + '</span>' +
      '<svg class="ic ic16"><use href="#i-chevron-down"></use></svg></button>' +
      '<div class="kmenu" id="shell-kmenu" style="display:none">' + kmenuHTML() + '</div></div>' +
      '<button class="bell"><svg class="ic ic20"><use href="#i-bell"></use></svg><span class="bdot">1</span></button>' +
      '<div class="userchip"><div class="avatar av34">AR</div>' +
      '<div><div class="uc2-name">Ana Ruiz</div><div class="uc2-role">Administradora</div></div></div>' +
      '</div>';
  }

  function pheadHTML(opts) {
    var btn = '';
    if (opts.headerButton) {
      var hb = opts.headerButton;
      var cls = 'btn ' + (hb.variant === 'danger' ? 'btn-danger' : 'btn-primary');
      btn = '<button class="' + cls + '" id="shell-head-btn"><svg class="ic ' + (hb.variant === 'danger' ? 'ic18' : 'ic20') + '"><use href="' + hb.icon + '"></use></svg><span>' + esc(hb.label) + '</span></button>';
    }
    return '' +
      '<div><h1>' + esc(opts.title) + '</h1><p>' + esc(opts.subtitle) + '</p></div>' +
      '<div class="pha">' + btn + '</div>';
  }

  function wireTopbar(root) {
    var kbtn = root.querySelector('#shell-kbtn');
    var kmenu = root.querySelector('#shell-kmenu');
    if (!kbtn) return;
    kbtn.addEventListener('click', function (e) {
      e.stopPropagation();
      kmenu.style.display = kmenu.style.display === 'none' ? 'block' : 'none';
    });
    kmenu.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-kitchen]');
      if (!btn) return;
      Store.setKitchen(btn.getAttribute('data-kitchen'));
      kmenu.style.display = 'none';
      var label = root.querySelector('#shell-kbtn-label');
      if (label) label.textContent = Store.getKitchen();
      var sideLabel = document.getElementById('shell-kitchen-name');
      if (sideLabel) sideLabel.textContent = Store.getKitchen();
      kmenu.innerHTML = kmenuHTML();
    });
    document.addEventListener('click', function () { kmenu.style.display = 'none'; });
  }

  var Shell = {
    mount: function (opts) {
      active = opts.active;
      document.getElementById('sidebar').innerHTML = sidebarHTML();
      var topbar = document.getElementById('topbar');
      topbar.innerHTML = topbarHTML(opts.crumb || '');
      wireTopbar(topbar);
      document.getElementById('mobile-nav').innerHTML = mobileNavHTML();
      this.setHead(opts);
    },
    setHead: function (opts) {
      var phead = document.getElementById('phead');
      phead.innerHTML = pheadHTML(opts);
      if (opts.headerButton) {
        var btn = document.getElementById('shell-head-btn');
        btn.addEventListener('click', opts.headerButton.onClick);
      }
      var crumbEl = document.querySelector('#topbar .crumb');
      if (crumbEl && opts.crumb) crumbEl.textContent = opts.crumb;
    },
  };

  window.Shell = Shell;
})();
