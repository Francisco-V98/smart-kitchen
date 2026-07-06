(function () {
  'use strict';

  var root = document.getElementById('screen-root');
  var view = 'list';
  var editingId = null;
  var form = { name: '', role: '' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function goList() { view = 'list'; editingId = null; render(); }

  function openNew() { view = 'edit'; editingId = null; form = { name: '', role: '' }; render(); }

  function openEdit(p) { view = 'edit'; editingId = p.id; form = { name: p.name, role: p.role || '' }; render(); }

  function save() {
    var name = form.name.trim();
    if (!name) { document.getElementById('pers-name-input').focus(); return; }
    if (editingId) Store.updatePersona(editingId, { name: name, role: form.role.trim() });
    else Store.addPersona({ name: name, role: form.role.trim() });
    goList();
  }

  function remove() {
    if (!editingId) return;
    if (!confirm('¿Eliminar a esta persona del equipo?')) return;
    Store.deletePersona(editingId);
    goList();
  }

  function updateHead() {
    if (view === 'list') {
      Shell.setHead({ title: 'Personal', subtitle: 'Administra el equipo que ejecuta las labores.', crumb: 'Registro / Personal', headerButton: { label: 'Agregar persona', icon: '#i-plus', onClick: openNew } });
    } else {
      Shell.setHead({
        title: editingId ? 'Editar persona' : 'Nueva persona',
        subtitle: 'Define el nombre y el rol de la persona.',
        crumb: editingId ? 'Personal / Editar' : 'Personal / Nueva',
        headerButton: editingId ? { label: 'Eliminar persona', icon: '#i-trash', variant: 'danger', onClick: remove } : null,
      });
    }
  }

  function renderList() {
    var list = Store.getPersonalList();
    var cardsHTML = list.map(function (p) {
      return '<div class="perscard" data-id="' + p.id + '">' +
        '<div class="avatar av56">' + esc(initials(p.name)) + '</div>' +
        '<div class="perscard-info"><div class="persname">' + esc(p.name) + '</div><div class="persrole">' + esc(p.role || 'Sin rol asignado') + '</div></div>' +
        '<button type="button" class="iconbtn" data-edit="' + p.id + '"><svg class="ic ic18"><use href="#i-pencil"></use></svg></button>' +
        '</div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="sectionhead"><h2>Tu equipo</h2><span class="muted">' + list.length + ' personas</span></div>' +
      (list.length
        ? '<div class="persgrid">' + cardsHTML + '</div>'
        : '<div class="empty"><div class="icb icb62" style="background:var(--bg);color:var(--t3)"><svg class="ic ic28"><use href="#i-users"></use></svg></div><h3>Sin personal registrado</h3><p>Agrega a las personas que ejecutarán las labores.</p></div>');

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = Store.getPersona(btn.getAttribute('data-edit'));
        if (p) openEdit(p);
      });
    });
  }

  function renderEdit() {
    root.innerHTML = '' +
      '<div class="editwrap">' +
      '<div class="editcard">' +
      '<div class="field"><label>Nombre <span style="color:var(--red)">*</span></label>' +
      '<input class="input" id="pers-name-input" placeholder="Ej. Ana Ruiz" value="' + esc(form.name) + '"></div>' +
      '<div class="field"><label>Rol <span style="color:var(--t3);font-weight:400">(opcional)</span></label>' +
      '<input class="input" id="pers-role-input" placeholder="Ej. Chef, Ayudante de cocina..." value="' + esc(form.role) + '"></div>' +
      '<div class="editactions">' +
      '<button type="button" class="btn btn-primary f1" id="pers-save"><svg class="ic ic20"><use href="#i-check"></use></svg><span>Guardar cambios</span></button>' +
      '<button type="button" class="btn btn-ghost f1" id="pers-cancel"><span>Cancelar</span></button>' +
      '</div></div>' +
      '<div class="editside">' +
      '<div class="sidecard"><div class="sidelabel">Vista previa</div>' +
      '<div class="pvcard" style="align-items:center;flex-direction:row;gap:14px">' +
      '<div class="avatar av56" id="pv-avatar">' + esc(initials(form.name)) + '</div>' +
      '<div><div class="persname" id="pv-name">' + esc(form.name || 'Nueva persona') + '</div>' +
      '<div class="persrole" id="pv-role">' + esc(form.role || 'Sin rol asignado') + '</div></div>' +
      '</div></div>' +
      '<div class="tipcard"><div class="tiphead"><svg class="ic ic18"><use href="#i-users"></use></svg><span>Buenas prácticas</span></div>' +
      '<ul class="tiplist">' +
      '<li>Registra a cada persona que ejecutará labores en el calendario.</li>' +
      '<li>El rol ayuda a identificar quién hace qué en el equipo.</li>' +
      '</ul></div></div></div>';

    document.getElementById('pers-name-input').addEventListener('input', function (e) {
      form.name = e.target.value;
      document.getElementById('pv-name').textContent = form.name || 'Nueva persona';
      document.getElementById('pv-avatar').textContent = initials(form.name);
    });
    document.getElementById('pers-role-input').addEventListener('input', function (e) {
      form.role = e.target.value;
      document.getElementById('pv-role').textContent = form.role || 'Sin rol asignado';
    });

    document.getElementById('pers-save').addEventListener('click', save);
    document.getElementById('pers-cancel').addEventListener('click', goList);
  }

  function render() {
    updateHead();
    if (view === 'list') renderList(); else renderEdit();
  }

  Shell.mount({ active: 'personal', title: '', subtitle: '', crumb: '' });
  render();
})();
