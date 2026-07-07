// Shared data layer: seed data + localStorage persistence + CRUD helpers.
// Used by every screen so data (categories, products, label models, labels)
// stays in sync as you navigate between pages.
(function () {
  'use strict';

  var STORAGE_KEY = 'kotania.data.v1';

  function isoOffset(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Drives incident severity choices, the instrument health badge, and its
  // color, everywhere ("bueno" is instrument-only — never a pickable
  // incident severity, an incident is by definition not "bueno").
  var INCIDENT_SEVERITY_LEVELS = [
    { id: 'bueno', label: 'Bueno / Funcional', color: 'green', weight: 0 },
    { id: 'revision', label: 'Necesita revisión', color: 'yellow', weight: 1 },
    { id: 'deteriorado', label: 'Deteriorado / Falla parcial', color: 'yellow', weight: 2 },
    { id: 'danado', label: 'Dañado', color: 'red', weight: 3 },
    { id: 'fuera_servicio', label: 'Fuera de servicio', color: 'red', weight: 4 },
  ];

  var SEED = {
    kitchen: 'Cocina 1',
    cats: [
      { id: 'vegetales', name: 'Vegetales', color: '#22C55E', icon: '#i-leaf' },
      { id: 'frutas', name: 'Frutas', color: '#14B8A6', icon: '#i-apple' },
      { id: 'proteinas', name: 'Proteínas', color: '#EF4444', icon: '#i-meat' },
      { id: 'lacteos', name: 'Lácteos', color: '#F0B90D', icon: '#i-milk' },
      { id: 'salsas', name: 'Salsas', color: '#5558C9', icon: '#i-sauce' },
      { id: 'cereales', name: 'Cereales', color: '#FF8D28', icon: '#i-wheat' },
    ],
    prods: [
      { id: 'p1', name: 'Tomates cherry', cat: 'vegetales', desc: 'Frescos de temporada, sin conservantes', appccEnabled: { recepcion: true, apertura: true }, appccDays: {} },
      { id: 'p2', name: 'Lechuga romana', cat: 'vegetales', desc: '', appccEnabled: { recepcion: true }, appccDays: {} },
      { id: 'p3', name: 'Limones', cat: 'frutas', desc: 'Importados, clase A', appccEnabled: { recepcion: true, apertura: true }, appccDays: {} },
      { id: 'p4', name: 'Uvas negras', cat: 'frutas', desc: '', appccEnabled: { recepcion: true, trasvase: true }, appccDays: {} },
      { id: 'p5', name: 'Pavo asado', cat: 'proteinas', desc: 'Cocinado al horno con especias', appccEnabled: { elaboracion: true, cong_ae: true, descong: true }, appccDays: {} },
      { id: 'p6', name: 'Pollo a la plancha', cat: 'proteinas', desc: '', appccEnabled: { elaboracion: true, cong_mp: true }, appccDays: {} },
      { id: 'p7', name: 'Queso mozzarella', cat: 'lacteos', desc: 'En bola, conservado en agua', appccEnabled: { recepcion: true, apertura: true, env_mp: true }, appccDays: {} },
      { id: 'p8', name: 'Queso azul', cat: 'lacteos', desc: '', appccEnabled: { recepcion: true, apertura: true }, appccDays: {} },
      { id: 'p9', name: 'Leche entera', cat: 'lacteos', desc: 'Pasteurizada, 3.5% grasa', appccEnabled: { recepcion: true, apertura: true }, appccDays: {} },
      { id: 'p10', name: 'Salsa de tomate', cat: 'salsas', desc: 'Elaborada en cocina propia', appccEnabled: { elaboracion: true, env_ae: true, cong_ae: true }, appccDays: {} },
      { id: 'p11', name: 'Harinas', cat: 'cereales', desc: 'Trigo T45, para repostería', appccEnabled: { recepcion: true, trasvase: true }, appccDays: {} },
      { id: 'p12', name: 'Arroz basmati', cat: 'cereales', desc: '', appccEnabled: { recepcion: true, elaboracion: true }, appccDays: {} },
    ],
    modelos: [
      { id: 'm1', name: 'Refrigeración', desc: 'Conservación en frío 1–4°C', scheme: 'color', accent: '#2F9CF5', logoPos: 'none', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'fecha_elab', lbl: 'Elaborado' }, { type: 'fecha_cad', lbl: 'Caduca el' }] }, { id: 'r2', cols: 2, fields: [{ type: 'temp', lbl: 'Temperatura' }, { type: 'responsable', lbl: 'Responsable' }] }] },
      { id: 'm2', name: 'Congelación', desc: 'Conservación prolongada -18°C', scheme: 'color', accent: '#14B8A6', logoPos: 'none', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'hora', lbl: 'Hora congelación' }, { type: 'fecha_cad', lbl: 'Caduca el' }] }, { id: 'r2', cols: 1, fields: [{ type: 'lote', lbl: 'Lote' }] }] },
      { id: 'm3', name: 'Elaboración', desc: 'Alimentos cocinados en cocina propia', scheme: 'color', accent: '#EF4444', logoPos: 'left', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'fecha_elab', lbl: 'Fecha elaboración' }, { type: 'hora', lbl: 'Hora elaboración' }] }] },
      { id: 'm4', name: 'Apertura', desc: 'Producto abierto en cocina', scheme: 'bw', accent: '#111827', logoPos: 'none', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'datetime', lbl: 'Apertura' }, { type: 'fecha_cad', lbl: 'Consumir antes' }] }] },
      { id: 'm5', name: 'Envasado vacío', desc: 'Producto envasado al vacío', scheme: 'gray', accent: '#9ca3af', logoPos: 'right', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'fecha_elab', lbl: 'Fecha envase' }, { type: 'fecha_cad', lbl: 'Caduca el' }] }, { id: 'r2', cols: 1, fields: [{ type: 'responsable', lbl: 'Responsable' }] }] },
      { id: 'm6', name: 'Descongelación', desc: 'Producto en proceso de descongelación', scheme: 'color', accent: '#8B5CF6', logoPos: 'none', border: false, dividers: true, rowsAbove: [], rowsBelow: [{ id: 'r1', cols: 2, fields: [{ type: 'datetime', lbl: 'Inicio descongelación' }, { type: 'fecha_cad', lbl: 'Usar antes de' }] }] },
    ],
    etiquetas: [
      { id: 'e1', prodId: 'p1', modelId: 'm1', vals: { 'efb-0-0': '2025-06-20', 'efb-0-1': '2025-06-27', 'efb-1-0': '4 °C', 'efb-1-1': 'Ana Ruiz' }, date: '24/06/2025', printCount: 3 },
      { id: 'e2', prodId: 'p5', modelId: 'm2', vals: { 'efb-0-0': '08:30', 'efb-0-1': '2025-12-23', 'efb-1-0': 'LOT-0231' }, date: '23/06/2025', printCount: 1 },
      { id: 'e3', prodId: 'p7', modelId: 'm4', vals: { 'efb-0-0': '2025-06-23', 'efb-0-1': '2025-06-26' }, date: '23/06/2025', printCount: 2 },
      { id: 'e4', prodId: 'p10', modelId: 'm3', vals: { 'efb-0-0': '2025-06-22', 'efb-0-1': '11:15' }, date: '22/06/2025', printCount: 5 },
      { id: 'e5', prodId: 'p9', modelId: 'm1', vals: { 'efb-0-0': '2025-06-19', 'efb-0-1': '2025-06-26', 'efb-1-0': '3 °C', 'efb-1-1': 'Luis Pérez' }, date: '21/06/2025', printCount: 4 },
      { id: 'e6', prodId: 'p12', modelId: 'm3', vals: { 'efb-0-0': '2025-06-20', 'efb-0-1': '13:40' }, date: '20/06/2025', printCount: 2 },
    ],

    areas: [
      { id: 'general', name: 'General', color: '#64748B', icon: '#i-grid' },
      { id: 'almacen', name: 'Almacén', color: '#5558C9', icon: '#i-archive' },
      { id: 'cocina', name: 'Cocina', color: '#FF8D28', icon: '#i-flame' },
      { id: 'comedor', name: 'Comedor', color: '#22C55E', icon: '#i-utensils' },
      { id: 'banos', name: 'Baños', color: '#0EA5E9', icon: '#i-droplet' },
    ],
    instrumentos: [
      { id: 'nevera1', name: 'Nevera 1', areaId: 'cocina', icon: '#i-snow', notes: 'Refrigerador principal de cocina', status: 'bueno' },
      { id: 'nevera2', name: 'Nevera 2', areaId: 'cocina', icon: '#i-snow', notes: '', status: 'bueno' },
      { id: 'congelador1', name: 'Congelador 1', areaId: 'almacen', icon: '#i-snow', notes: 'Conservación -18°C', status: 'bueno' },
      { id: 'freidora1', name: 'Freidora', areaId: 'cocina', icon: '#i-flame', notes: '', status: 'bueno' },
      { id: 'licuadora1', name: 'Licuadora industrial', areaId: 'cocina', icon: '#i-package', notes: '', status: 'bueno' },
    ],
    personal: [
      { id: 'ana', name: 'Ana Ruiz', role: 'Chef' },
      { id: 'luis', name: 'Luis Pérez', role: 'Ayudante de cocina' },
    ],
    labores: [
      {
        id: 'lab1', name: 'Revisar temperatura de neveras', desc: 'Verificar que las neveras de cocina estén en el rango correcto.',
        areaId: 'cocina', frequency: 'diaria', startDate: isoOffset(-5), time: '09:00', assigneeIds: ['ana'],
        checklist: [
          { id: 'ci1', label: 'Nevera 1', instrumentoId: 'nevera1', valueType: 'rango', min: 1, max: 4, unit: '°C' },
          { id: 'ci2', label: 'Nevera 2', instrumentoId: 'nevera2', valueType: 'rango', min: 1, max: 4, unit: '°C' },
        ],
      },
      {
        id: 'lab2', name: 'Limpiar área de almacén', desc: 'Limpieza general de piso, estanterías y superficies del almacén.',
        areaId: 'almacen', frequency: 'diaria', startDate: isoOffset(-5), time: '18:00', assigneeIds: ['luis'],
        checklist: [
          { id: 'ci1', label: 'Piso', instrumentoId: null, valueType: 'ninguno' },
          { id: 'ci2', label: 'Estanterías', instrumentoId: null, valueType: 'ninguno' },
          { id: 'ci3', label: 'Congelador 1 (exterior)', instrumentoId: 'congelador1', valueType: 'ninguno' },
        ],
      },
      {
        id: 'lab3', name: 'Revisar aceite de freidoras', desc: 'Comprobar el estado y color del aceite, renovar si es necesario.',
        areaId: 'cocina', frequency: 'semanal', weekdays: [0, 3], startDate: isoOffset(-14), time: '11:00', assigneeIds: ['ana', 'luis'],
        checklist: [
          { id: 'ci1', label: 'Freidora', instrumentoId: 'freidora1', valueType: 'ninguno' },
        ],
      },
      {
        id: 'lab4', name: 'Revisión semestral de extintores', desc: 'Verificar presión y fecha de vencimiento de los extintores.',
        areaId: 'comedor', frequency: 'semestral', startDate: isoOffset(-35), time: '10:00', assigneeIds: ['luis'],
        checklist: [
          { id: 'ci1', label: 'Extintor comedor', instrumentoId: null, valueType: 'ninguno' },
        ],
      },
      {
        id: 'lab5', name: 'Calibración inicial de balanza', desc: 'Ajuste y calibración única al instalar el equipo.',
        areaId: 'general', frequency: 'unica', startDate: isoOffset(1), time: '10:00', assigneeIds: ['ana'],
        checklist: [
          { id: 'ci1', label: 'Balanza de cocina', instrumentoId: null, valueType: 'conteo', value: 1000, unit: 'g' },
        ],
      },
    ],
    ejecuciones: [
      {
        id: 'ej1', laborId: 'lab1', date: isoOffset(-1), completedBy: 'ana', completedAt: Date.now(),
        results: [
          { checklistItemId: 'ci1', value: '3', itemStatus: 'ok' },
          { checklistItemId: 'ci2', value: '5', itemStatus: 'incidencia' },
        ],
        report: 'Nevera 2 marcó 5°C, por encima del rango. Se ajustó el termostato.',
      },
      {
        id: 'ej2', laborId: 'lab2', date: isoOffset(-1), completedBy: 'luis', completedAt: Date.now(),
        results: [
          { checklistItemId: 'ci1', value: '', itemStatus: 'ok' },
          { checklistItemId: 'ci2', value: '', itemStatus: 'ok' },
          { checklistItemId: 'ci3', value: '', itemStatus: 'ok' },
        ],
        report: '',
      },
      {
        id: 'ej3', laborId: 'lab2', date: isoOffset(-2), completedBy: 'luis', completedAt: Date.now(),
        results: [
          { checklistItemId: 'ci1', value: '', itemStatus: 'ok' },
          { checklistItemId: 'ci2', value: '', itemStatus: 'ok' },
          { checklistItemId: 'ci3', value: '', itemStatus: 'incidencia' },
        ],
        report: 'Congelador 1 no enfría correctamente, posible falla de compresor.',
      },
    ],
    incidencias: [
      {
        id: 'inc1', laborId: 'lab1', date: isoOffset(-1), checklistItemId: 'ci2', itemLabel: 'Nevera 2', instrumentoId: 'nevera2',
        severity: 'deteriorado', description: 'Nevera 2 marcó 5°C, por encima del rango esperado (1–4°C).',
        status: 'resuelta',
        comments: [{ id: 'com1', text: 'Se ajustó el termostato y volvió al rango correcto.', createdAt: Date.now() }],
        createdAt: Date.now(), updatedAt: Date.now(), resolvedAt: Date.now(),
      },
      {
        id: 'inc2', laborId: 'lab2', date: isoOffset(-2), checklistItemId: 'ci3', itemLabel: 'Congelador 1 (exterior)', instrumentoId: 'congelador1',
        severity: 'danado', description: 'El congelador no alcanza la temperatura mínima, parece tener un problema de compresor.',
        status: 'abierta', comments: [],
        createdAt: Date.now(), updatedAt: Date.now(), resolvedAt: null,
      },
    ],
  };

  // Normalizes data loaded from earlier versions so schema changes (new
  // fields, renamed fields) don't break saves that already exist.
  function migrate(d) {
    if (!d.areas.some(function (a) { return a.id === 'general'; })) {
      d.areas.unshift({ id: 'general', name: 'General', color: '#64748B', icon: '#i-grid' });
    }
    d.labores.forEach(function (l) {
      if (l.assigneeIds === undefined) {
        l.assigneeIds = l.assigneeId ? [l.assigneeId] : [];
        delete l.assigneeId;
      }
      // "texto" value type was removed; fall back to a plain status check.
      (l.checklist || []).forEach(function (ci) {
        if (ci.valueType === 'texto') {
          ci.valueType = 'ninguno';
          delete ci.unit; delete ci.min; delete ci.max; delete ci.value;
        }
      });
    });
    if (!d.incidencias) d.incidencias = [];
    d.instrumentos.forEach(function (i) {
      if (i.status === undefined) i.status = 'bueno';
    });
    // Instrument status is always derived from its open incidents, never
    // hand-edited, so recompute it fresh on every load.
    d.instrumentos.forEach(function (i) { i.status = recomputeStatus(d, i.id); });
    return d;
  }

  function recomputeStatus(d, instrumentoId) {
    var opens = d.incidencias.filter(function (inc) { return inc.instrumentoId === instrumentoId && inc.status !== 'resuelta'; });
    var best = null;
    opens.forEach(function (inc) {
      var lvl = INCIDENT_SEVERITY_LEVELS.find(function (l) { return l.id === inc.severity; });
      if (lvl && (!best || lvl.weight > best.weight)) best = lvl;
    });
    return best ? best.id : 'bueno';
  }

  function load() {
    var fresh = migrate(JSON.parse(JSON.stringify(SEED)));
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Backfill keys added in later versions so existing saved data doesn't break.
        Object.keys(fresh).forEach(function (k) {
          if (parsed[k] === undefined) parsed[k] = fresh[k];
        });
        return migrate(parsed);
      }
    } catch (e) { /* corrupt storage, fall back to seed */ }
    persist(fresh);
    return fresh;
  }
  function persist(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }

  var data = load();
  function save() { persist(data); }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

  var Store = {
    // ---- static reference data ----
    fieldTypesList: [
      { id: 'fecha_elab', name: 'Fecha elaboración', sample: '24/01/2025' },
      { id: 'fecha_cad', name: 'Fecha caducidad', sample: '30/01/2025' },
      { id: 'hora', name: 'Hora', sample: '14:30' },
      { id: 'datetime', name: 'Fecha y hora', sample: '24/01 · 14:30' },
      { id: 'lote', name: 'Nº Lote', sample: 'LOT-2025-001' },
      { id: 'temp', name: 'Temperatura', sample: '-18 °C' },
      { id: 'dias', name: 'Días', sample: '90 días' },
      { id: 'peso', name: 'Peso / Cantidad', sample: '1.5 kg' },
      { id: 'responsable', name: 'Elaborado por', sample: 'Chef García' },
      { id: 'cocina', name: 'Cocina', sample: 'Cocina Central' },
      { id: 'proceso', name: 'Proceso', sample: 'Congelación' },
      { id: 'texto', name: 'Campo libre', sample: 'Texto personalizado' },
    ],
    fieldSamples: {
      fecha_elab: '24/01/2025', fecha_cad: '30/01/2025', hora: '14:30',
      datetime: '24/01 · 14:30', lote: 'LOT-2025-001', temp: '-18 °C',
      dias: '90 días', peso: '1.5 kg', responsable: 'Chef García',
      cocina: 'Cocina Central', proceso: 'Congelación', texto: '—',
    },
    appcSectionsData: [
      { id: 'recepcion', name: 'Recepción', icon: '#i-package', color: '#2F9CF5',
        fields: [{ key: 'rec_fec', label: 'Días Recepción', sub: 'Fecha de recepción' }] },
      { id: 'trasvase', name: 'Trasvase', icon: '#i-droplet', color: '#14B8A6',
        fields: [
          { key: 'tra_desc', label: 'Días Trasvase', sub: 'Fecha descongelación' },
          { key: 'tra_lote', label: 'Días Trasvase', sub: 'Lote' },
          { key: 'tra_cad_pri', label: 'Días Trasvase', sub: 'Caducidad primaria' },
        ] },
      { id: 'elaboracion', name: 'Elaboración', icon: '#i-utensils', color: '#5558C9',
        fields: [
          { key: 'ela_cad_sec', label: 'Días Elaboración', sub: 'Caducidad secundaria' },
          { key: 'ela_fec_ela', label: 'Días Elaboración', sub: 'Fecha de elaboración' },
        ] },
      { id: 'env_mp', name: 'Envasado vacío — Mat. primas', icon: '#i-archive', color: '#FF8D28',
        fields: [
          { key: 'evmp_cad_sec', label: 'Días Env. vacío m.p.', sub: 'Caducidad secundaria' },
          { key: 'evmp_fec_env', label: 'Días Env. vacío m.p.', sub: 'Fecha envasado vacío' },
          { key: 'evmp_cad_pri', label: 'Días Env. vacío m.p.', sub: 'Caducidad primaria' },
        ] },
      { id: 'env_ae', name: 'Envasado vacío — Alimentos elaborados', icon: '#i-archive', color: '#EC4899',
        fields: [
          { key: 'evae_cad_sec', label: 'Días Env. vacío elab.', sub: 'Caducidad secundaria' },
          { key: 'evae_fec_env', label: 'Días Env. vacío elab.', sub: 'Fecha envasado vacío' },
        ] },
      { id: 'cong_mp', name: 'Congelación — Mat. primas', icon: '#i-snow', color: '#0EA5E9',
        fields: [
          { key: 'cgmp_cad_sec', label: 'Días Cong. m.primas', sub: 'Caducidad secundaria' },
          { key: 'cgmp_fec_ela', label: 'Días Cong. m.primas', sub: 'Fecha de elaboración' },
          { key: 'cgmp_cad_pri', label: 'Días Cong. m.primas', sub: 'Caducidad primaria' },
          { key: 'cgmp_cantidad', label: 'Días Cong. m.primas', sub: 'Cantidad' },
        ] },
      { id: 'cong_ae', name: 'Congelación — Alimentos elaborados', icon: '#i-snow', color: '#14B8A6',
        fields: [
          { key: 'cgae_fec_ela', label: 'Días Cong. elaborados', sub: 'Fecha de elaboración' },
          { key: 'cgae_fec_cong', label: 'Días Cong. elaborados', sub: 'Fecha congelación' },
          { key: 'cgae_cad_sec', label: 'Días Cong. elaborados', sub: 'Caducidad secundaria' },
          { key: 'cgae_cantidad', label: 'Días Cong. elaborados', sub: 'Cantidad' },
        ] },
      { id: 'descong', name: 'Descongelación', icon: '#i-droplet', color: '#8B5CF6',
        fields: [
          { key: 'dsc_cad_sec', label: 'Días Descongelación', sub: 'Caducidad secundaria' },
          { key: 'dsc_fec_desc', label: 'Días Descongelación', sub: 'Fecha descongelación' },
          { key: 'dsc_uso_opt', label: 'Días Descongelación', sub: 'Uso óptimo' },
        ] },
      { id: 'apertura', name: 'Apertura', icon: '#i-package', color: '#22C55E',
        fields: [
          { key: 'ape_cad_sec', label: 'Días Apertura', sub: 'Caducidad secundaria' },
          { key: 'ape_fec_ape', label: 'Días Apertura', sub: 'Fecha de apertura' },
          { key: 'ape_cad_pri', label: 'Días Apertura', sub: 'Caducidad primaria' },
        ] },
      { id: 'prueba', name: 'Prueba', icon: '#i-flask', color: '#F0B90D',
        fields: [{ key: 'pru_fec_rec', label: 'Días Prueba', sub: 'Fecha de recepción' }] },
    ],
    appccPillMeta: {
      recepcion: { name: 'Recepción', bg: '#EAF4FE', color: '#1a7fd4' },
      trasvase: { name: 'Trasvase', bg: '#e6faf8', color: '#0d9488' },
      elaboracion: { name: 'Elaboración', bg: '#ede9f6', color: '#4f46b0' },
      env_mp: { name: 'Env. vacío m.p.', bg: '#fff4e6', color: '#c05a00' },
      env_ae: { name: 'Env. vacío elab.', bg: '#fce7f4', color: '#a81560' },
      cong_mp: { name: 'Congelación m.p.', bg: '#e0f2fe', color: '#0369a1' },
      cong_ae: { name: 'Congelación elab.', bg: '#e6faf8', color: '#0d7a70' },
      descong: { name: 'Descongelación', bg: '#f3e8ff', color: '#7c3aed' },
      apertura: { name: 'Apertura', bg: '#e7f9ee', color: '#166534' },
      prueba: { name: 'Prueba', bg: '#fef9e7', color: '#92400e' },
    },
    palette: ['#22C55E', '#14B8A6', '#2F9CF5', '#5558C9', '#8B5CF6', '#EC4899', '#EF4444', '#FF8D28', '#F0B90D', '#10B981', '#0EA5E9', '#64748B'],
    accentColors: ['#2F9CF5', '#5558C9', '#22C55E', '#EF4444', '#FF8D28', '#F0B90D', '#EC4899', '#14B8A6'],
    allIcons: [
      { id: '#i-leaf', label: 'Vegetales' }, { id: '#i-apple', label: 'Frutas' }, { id: '#i-meat', label: 'Carnes' },
      { id: '#i-milk', label: 'Lácteos' }, { id: '#i-sauce', label: 'Salsas' }, { id: '#i-wheat', label: 'Cereales' },
      { id: '#i-egg', label: 'Huevos' }, { id: '#i-coffee', label: 'Café' }, { id: '#i-wine', label: 'Vinos' },
      { id: '#i-mushroom', label: 'Hongos' }, { id: '#i-fish', label: 'Pescado' }, { id: '#i-bread', label: 'Panadería' },
      { id: '#i-salad', label: 'Ensaladas' }, { id: '#i-droplet', label: 'Líquidos' }, { id: '#i-utensils', label: 'Cubiertos' },
      { id: '#i-flame', label: 'Cocción' }, { id: '#i-flask', label: 'Fermentación' }, { id: '#i-thermo', label: 'Temperatura' },
      { id: '#i-snow', label: 'Congelación' }, { id: '#i-knife', label: 'Cuchillo' }, { id: '#i-chef', label: 'Chef' },
      { id: '#i-package', label: 'Empaques' }, { id: '#i-layers', label: 'Categorías' }, { id: '#i-tag', label: 'Etiquetas' },
      { id: '#i-star', label: 'Destacado' }, { id: '#i-heart', label: 'Especial' }, { id: '#i-archive', label: 'Archivo' },
      { id: '#i-grid', label: 'General' }, { id: '#i-printer', label: 'Impresión' }, { id: '#i-chart', label: 'Reportes' },
    ],
    kitchenList: ['Cocina 1', 'Cocina 2', 'Cocina Central'],

    // ---- kitchen (cosmetic, persisted) ----
    getKitchen: function () { return data.kitchen; },
    setKitchen: function (k) { data.kitchen = k; save(); },

    // ---- categories ----
    getCats: function () {
      var self = this;
      return data.cats.map(function (c) {
        return Object.assign({}, c, { count: self.countProdsInCat(c.id) });
      });
    },
    getCat: function (id) { return data.cats.find(function (c) { return c.id === id; }) || null; },
    countProdsInCat: function (id) { return data.prods.filter(function (p) { return p.cat === id; }).length; },
    addCat: function (cat) {
      var rec = { id: uid('c'), name: cat.name, color: cat.color, icon: cat.icon };
      data.cats.push(rec); save(); return rec;
    },
    updateCat: function (id, patch) {
      var c = this.getCatRaw(id);
      if (c) { Object.assign(c, patch); save(); }
      return c;
    },
    getCatRaw: function (id) { return data.cats.find(function (c) { return c.id === id; }) || null; },
    deleteCat: function (id) {
      data.cats = data.cats.filter(function (c) { return c.id !== id; });
      save();
    },

    // ---- products ----
    getProds: function () { return data.prods.slice(); },
    getProd: function (id) { return data.prods.find(function (p) { return p.id === id; }) || null; },
    addProd: function (p) {
      var rec = { id: uid('p'), name: p.name, cat: p.cat, desc: p.desc || '', appccEnabled: p.appccEnabled || {}, appccDays: p.appccDays || {} };
      data.prods.push(rec); save(); return rec;
    },
    updateProd: function (id, patch) {
      var p = this.getProd(id);
      if (p) { Object.assign(p, patch); save(); }
      return p;
    },

    // ---- label models ("procesos") ----
    getModelos: function () { return data.modelos.slice(); },
    getModelo: function (id) { return data.modelos.find(function (m) { return m.id === id; }) || null; },
    addModelo: function (m) {
      var rec = Object.assign({ id: uid('m') }, m);
      data.modelos.push(rec); save(); return rec;
    },
    updateModelo: function (id, patch) {
      var m = this.getModelo(id);
      if (m) { Object.assign(m, patch); save(); }
      return m;
    },

    // ---- printed labels ("etiquetas") ----
    getEtiquetas: function () { return data.etiquetas.slice(); },
    getEtiqueta: function (id) { return data.etiquetas.find(function (e) { return e.id === id; }) || null; },
    addEtiqueta: function (e) {
      var rec = { id: uid('e'), prodId: e.prodId, modelId: e.modelId, vals: e.vals || {}, date: todayStr(), printCount: 0 };
      data.etiquetas.push(rec); save(); return rec;
    },
    updateEtiqueta: function (id, patch) {
      var e = this.getEtiqueta(id);
      if (e) { Object.assign(e, patch); save(); }
      return e;
    },
    deleteEtiqueta: function (id) {
      data.etiquetas = data.etiquetas.filter(function (e) { return e.id !== id; });
      save();
    },
    bumpPrintCount: function (id, n) {
      var e = this.getEtiqueta(id);
      if (e) { e.printCount = (e.printCount || 0) + n; e.date = todayStr(); save(); }
      return e;
    },

    // ---- áreas ----
    getAreas: function () {
      var self = this;
      return data.areas.map(function (a) {
        return Object.assign({}, a, { count: self.countInstrumentosInArea(a.id) });
      });
    },
    getArea: function (id) { return data.areas.find(function (a) { return a.id === id; }) || null; },
    countInstrumentosInArea: function (id) { return data.instrumentos.filter(function (i) { return i.areaId === id; }).length; },
    addArea: function (a) {
      var rec = { id: uid('area'), name: a.name, color: a.color, icon: a.icon };
      data.areas.push(rec); save(); return rec;
    },
    updateArea: function (id, patch) {
      var a = this.getArea(id);
      if (a) { Object.assign(a, patch); save(); }
      return a;
    },
    deleteArea: function (id) {
      data.areas = data.areas.filter(function (a) { return a.id !== id; });
      save();
    },

    // ---- instrumentos (equipos/herramientas) ----
    getInstrumentos: function () { return data.instrumentos.slice(); },
    getInstrumento: function (id) { return data.instrumentos.find(function (i) { return i.id === id; }) || null; },
    addInstrumento: function (i) {
      var rec = { id: uid('inst'), name: i.name, areaId: i.areaId, icon: i.icon, notes: i.notes || '', status: 'bueno' };
      data.instrumentos.push(rec); save(); return rec;
    },
    updateInstrumento: function (id, patch) {
      var i = this.getInstrumento(id);
      if (i) { Object.assign(i, patch); save(); }
      return i;
    },
    deleteInstrumento: function (id) {
      data.instrumentos = data.instrumentos.filter(function (i) { return i.id !== id; });
      save();
    },
    getInstrumentoHistoryForDate: function (instrumentoId, dateStr) {
      var self = this;
      var involved = data.labores.filter(function (l) {
        return (l.checklist || []).some(function (ci) { return ci.instrumentoId === instrumentoId; }) && self.isDueOn(l, dateStr);
      });
      return involved.map(function (l) {
        var ej = self.getEjecucion(l.id, dateStr);
        var item = l.checklist.find(function (ci) { return ci.instrumentoId === instrumentoId; });
        var result = ej ? (ej.results || []).find(function (r) { return r.checklistItemId === item.id; }) : null;
        return { labor: l, item: item, ejecucion: ej, itemStatus: result ? result.itemStatus : null };
      });
    },

    // ---- incidencias ----
    incidentSeverityLevels: INCIDENT_SEVERITY_LEVELS,
    getIncidencias: function () { return data.incidencias.slice(); },
    getIncidencia: function (id) { return data.incidencias.find(function (inc) { return inc.id === id; }) || null; },
    getIncidenciaByKey: function (laborId, dateStr, checklistItemId) {
      return data.incidencias.find(function (inc) {
        return inc.laborId === laborId && inc.date === dateStr && inc.checklistItemId === checklistItemId;
      }) || null;
    },
    saveIncidencia: function (laborId, dateStr, checklistItemId, payload) {
      var existing = this.getIncidenciaByKey(laborId, dateStr, checklistItemId);
      if (existing) {
        Object.assign(existing, payload, { updatedAt: Date.now() });
        if (existing.instrumentoId) this.recomputeInstrumentoStatus(existing.instrumentoId); else save();
        return existing;
      }
      var rec = Object.assign({
        id: uid('inc'), laborId: laborId, date: dateStr, checklistItemId: checklistItemId,
        status: 'abierta', comments: [], createdAt: Date.now(), updatedAt: Date.now(), resolvedAt: null,
      }, payload);
      data.incidencias.push(rec);
      if (rec.instrumentoId) this.recomputeInstrumentoStatus(rec.instrumentoId); else save();
      return rec;
    },
    deleteIncidenciaByKey: function (laborId, dateStr, checklistItemId) {
      var existing = this.getIncidenciaByKey(laborId, dateStr, checklistItemId);
      if (!existing) return;
      var instId = existing.instrumentoId;
      data.incidencias = data.incidencias.filter(function (inc) { return inc.id !== existing.id; });
      if (instId) this.recomputeInstrumentoStatus(instId); else save();
    },
    updateIncidenciaStatus: function (id, status) {
      var inc = this.getIncidencia(id);
      if (!inc) return null;
      inc.status = status;
      inc.updatedAt = Date.now();
      inc.resolvedAt = status === 'resuelta' ? Date.now() : null;
      if (inc.instrumentoId) this.recomputeInstrumentoStatus(inc.instrumentoId); else save();
      return inc;
    },
    addIncidenciaComment: function (id, text) {
      var inc = this.getIncidencia(id);
      if (!inc) return null;
      inc.comments.push({ id: uid('com'), text: text, createdAt: Date.now() });
      inc.updatedAt = Date.now();
      save();
      return inc;
    },
    getOpenIncidenciasForInstrumento: function (instrumentoId) {
      return data.incidencias.filter(function (inc) { return inc.instrumentoId === instrumentoId && inc.status !== 'resuelta'; });
    },
    recomputeInstrumentoStatus: function (instrumentoId) {
      var inst = this.getInstrumento(instrumentoId);
      if (!inst) { save(); return; }
      inst.status = recomputeStatus(data, instrumentoId);
      save();
    },

    // ---- personal ----
    getPersonalList: function () { return data.personal.slice(); },
    getPersona: function (id) { return data.personal.find(function (p) { return p.id === id; }) || null; },
    addPersona: function (p) {
      var rec = { id: uid('per'), name: p.name, role: p.role || '' };
      data.personal.push(rec); save(); return rec;
    },
    updatePersona: function (id, patch) {
      var p = this.getPersona(id);
      if (p) { Object.assign(p, patch); save(); }
      return p;
    },
    deletePersona: function (id) {
      data.personal = data.personal.filter(function (p) { return p.id !== id; });
      save();
    },

    // ---- labores ----
    getLabores: function () { return data.labores.slice(); },
    getLabor: function (id) { return data.labores.find(function (l) { return l.id === id; }) || null; },
    addLabor: function (l) {
      var rec = Object.assign({ id: uid('lab') }, l);
      data.labores.push(rec); save(); return rec;
    },
    updateLabor: function (id, patch) {
      var l = this.getLabor(id);
      if (l) { Object.assign(l, patch); save(); }
      return l;
    },
    deleteLabor: function (id) {
      var self = this;
      var affectedInstrumentos = data.incidencias.filter(function (inc) { return inc.laborId === id && inc.instrumentoId; }).map(function (inc) { return inc.instrumentoId; });
      data.labores = data.labores.filter(function (l) { return l.id !== id; });
      data.ejecuciones = data.ejecuciones.filter(function (e) { return e.laborId !== id; });
      data.incidencias = data.incidencias.filter(function (inc) { return inc.laborId !== id; });
      save();
      affectedInstrumentos.forEach(function (instId) { self.recomputeInstrumentoStatus(instId); });
    },

    // ---- recurrencia + ejecuciones ----
    todayISO: function () { return isoOffset(0); },
    isDueOn: function (labor, dateStr) {
      if (!labor.startDate || dateStr < labor.startDate) return false;
      if (labor.frequency === 'unica') return dateStr === labor.startDate;
      var start = new Date(labor.startDate + 'T00:00:00');
      var date = new Date(dateStr + 'T00:00:00');
      var msPerDay = 86400000;
      var daysBetween = Math.round((date - start) / msPerDay);
      switch (labor.frequency) {
        case 'diaria': return true;
        case 'semanal':
          if (labor.weekdays && labor.weekdays.length) return labor.weekdays.indexOf((date.getDay() + 6) % 7) !== -1;
          return daysBetween % 7 === 0;
        case 'mensual': return sameDayOfPeriod(start, date, 1);
        case 'trimestral': return sameDayOfPeriod(start, date, 3);
        case 'semestral': return sameDayOfPeriod(start, date, 6);
        case 'anual': return date.getMonth() === start.getMonth() && date.getDate() === start.getDate();
        default: return false;
      }
    },
    getEjecucion: function (laborId, dateStr) {
      return data.ejecuciones.find(function (e) { return e.laborId === laborId && e.date === dateStr; }) || null;
    },
    saveEjecucion: function (laborId, dateStr, payload) {
      var existing = this.getEjecucion(laborId, dateStr);
      if (existing) {
        Object.assign(existing, payload, { completedAt: Date.now() });
        save();
        return existing;
      }
      var rec = Object.assign({ id: uid('ej'), laborId: laborId, date: dateStr, completedAt: Date.now() }, payload);
      data.ejecuciones.push(rec);
      save();
      return rec;
    },
    deleteEjecucion: function (laborId, dateStr) {
      data.ejecuciones = data.ejecuciones.filter(function (e) { return !(e.laborId === laborId && e.date === dateStr); });
      save();
    },
    getOccurrencesForDate: function (dateStr) {
      var self = this;
      return data.labores.filter(function (l) { return self.isDueOn(l, dateStr); }).map(function (l) {
        var ej = self.getEjecucion(l.id, dateStr);
        return { labor: l, date: dateStr, ejecucion: ej, estado: ej ? 'completada' : 'pendiente' };
      });
    },
  };

  function sameDayOfPeriod(start, date, monthStep) {
    if (date < start) return false;
    var monthsBetween = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
    if (monthsBetween % monthStep !== 0) return false;
    var lastDayOfDateMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    var expectedDay = Math.min(start.getDate(), lastDayOfDateMonth);
    return date.getDate() === expectedDay;
  }

  function todayStr() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  window.Store = Store;
})();
