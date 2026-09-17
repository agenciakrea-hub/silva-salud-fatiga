/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P075 · I1-b · LOS REPORTES IDENTIFICADOS LLEGAN AL SERVICIO MÉDICO (2026-09-17)

   «No dormí», «fatigado», «malestar» viajan con nombre y sólo llegaban a la bandeja del supervisor;
   el médico no tenía pestaña Reportes (hallazgo 5 de I1). Ahora el servidor recorta por vista —el
   médico recibe los identificados, Dirección sólo los anónimos y sin nombres (hueco de K1b), el
   supervisor todo—, el médico tiene la pestaña, y la ficha de la persona lleva sus autoreportes en
   la Historia. Todo por el camino real (R17): `accionReportesLeer(p)` con `Accesos` sembrado,
   `onDashData` como médico, `renderReportesSupervisor()` y `dashFichaMedica()` reales.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P075_ADMIN = 'admin-p075#';
const P075_CAB_ACCESOS = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P075_HOY = new Date().toISOString().slice(0, 10);
function p075Hojas() {
  return {
    'Accesos': [P075_CAB_ACCESOS,
      ['*',        P075_ADMIN, 'admin',      '',                           '',        ''],
      ['helitec',  'sup-075',  'supervisor', 'Consorcio HELITEC, Helitec', 'med-075', 'dir-075'],
      ['helitec2', 'comb-075', 'supervisor', 'Consorcio HELITEC, Helitec', '',        ''],
      ['silva',    'sup-sil',  'supervisor', 'Aeroambulancias Silva',      '',        '']],
    'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario'],
      [P075_HOY + 'T06:10:00', 'r1', 'no_dormi',       'true',  'Ana Suárez',  'Consorcio HELITEC',     'Operaciones', 'Piloto', 'Dormí tres horas'],
      [P075_HOY + 'T07:10:00', 'r2', 'malestar',       'true',  'Luis Ferrer', 'Consorcio HELITEC',     'Operaciones', 'Piloto', ''],
      [P075_HOY + 'T08:10:00', 'r3', 'carga_excesiva', 'false', '',            'Consorcio HELITEC',     'Operaciones', '',       'Tres vuelos seguidos'],
      [P075_HOY + 'T09:10:00', 'r4', 'entorno',        'false', '',            'Consorcio HELITEC',     'Mantenimiento', '',     ''],
      [P075_HOY + 'T10:10:00', 'r5', 'fatigado',       'true',  'Pedro Gómez', 'Aeroambulancias Silva', 'Vuelo',       'Piloto', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono', 'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC', 'Ana Suárez', 'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  };
}
function p075Api() {
  const env = GS.crearEntorno(p075Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer', 'reportesVista_']);
  api.__leer = cred => JSON.parse(api.accionReportesLeer(Object.assign({ dispositivoId: 'tel-075' }, cred)).getContent());
  return api;
}
const P075_SUP  = { usuario: 'helitec',  pass: 'sup-075' };
const P075_MED  = { usuario: 'helitec',  pass: 'med-075' };
const P075_DIR  = { usuario: 'helitec',  pass: 'dir-075' };
const P075_COMB = { usuario: 'helitec2', pass: 'comb-075' };
const P075_ADM  = { usuario: '*',        pass: P075_ADMIN, empresa: 'Consorcio HELITEC' };

/* ── SERVIDOR ─────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P075 · el servicio médico recibe SÓLO los reportes identificados de su empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p075Api();
  const r = api.__leer(P075_MED);
  PRUEBAS.igual(r.ok, true, 'contesta');
  PRUEBAS.igual(r.alcance, 'identificados', 'con el alcance «identificados»');
  PRUEBAS.igual(r.reportes.map(x => x.id).sort(), ['r1', 'r2'], '🔴 los dos identificados de HELITEC, ni los anónimos ni los de Silva');
  PRUEBAS.igual(r.reportes.map(x => x.persona).sort(), ['Ana Suárez', 'Luis Ferrer'], 'con la persona (es su vista)');
  PRUEBAS.cierto(r.reportes.every(x => x.identificado === true), 'todos identificados');
});

PRUEBAS.caso('🔴 P075 · Dirección recibe SÓLO los anónimos, y sin persona ni cargo (el hueco de K1b)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p075Api();
  const r = api.__leer(P075_DIR);
  PRUEBAS.igual(r.alcance, 'anonimos', 'alcance «anonimos»');
  PRUEBAS.igual(r.reportes.map(x => x.id).sort(), ['r3', 'r4'], '🔴 sólo los anónimos');
  PRUEBAS.cierto(r.reportes.every(x => !('persona' in x) && !('cargo' in x)), '🔴 ningún nombre viaja a Dirección (antes recibía los cinco con nombre)');
});

PRUEBAS.caso('P075 · el supervisor, la clave combinada y el admin siguen recibiendo todo (discriminador)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p075Api();
  [P075_SUP, P075_COMB, P075_ADM].forEach(cred => {
    const r = api.__leer(cred);
    PRUEBAS.igual([r.alcance, r.reportes.map(x => x.id).sort()], ['todo', ['r1', 'r2', 'r3', 'r4']], 'todo para ' + cred.usuario);
  });
  /* al revés directo sobre la función que decide */
  PRUEBAS.igual(api.reportesVista_({ rol: 'supervisor', vista: 'medico', combinada: false }), 'identificados', 'médico con clave propia → identificados');
  PRUEBAS.igual(api.reportesVista_({ rol: 'supervisor', vista: 'medico', combinada: true }), 'todo', 'médico combinado ES el supervisor → todo');
  PRUEBAS.igual(api.reportesVista_({ rol: 'supervisor', vista: 'hseq' }), 'anonimos', 'Dirección → anónimos');
});

/* ── CLIENTE ──────────────────────────────────────────────────────────────────────────────── */

function p075cReportes() {
  const ahora = Date.now();
  return [
    { id: 'r1', opcion: 'no_dormi', identificado: true, persona: 'Ana Suárez',  empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', comentario: 'Dormí tres horas', creada: ahora - 3600000 },
    { id: 'r2', opcion: 'malestar', identificado: true, persona: 'Luis Ferrer', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', comentario: '', creada: ahora - 7200000 },
    { id: 'r3', opcion: 'carga_excesiva', identificado: false, empresa: 'Consorcio HELITEC', departamento: 'Operaciones', comentario: 'Tres vuelos', creada: ahora - 9000000 }
  ];
}
/* Entra al panel como servicio médico (clave propia) SIN RED, espiando `gestPost`: lo que pida se
   contesta con `respuestas[action]`. Devuelve {fin, pedidos}. */
function p075cEntrar(vista, respuestas, extra) {
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oPost = window.gestPost, oFetch = window.fetch, oReloj = window.fetchConReloj;
  const pedidos = [];
  window.gestPost = body => { pedidos.push(body.action); return Promise.resolve((respuestas || {})[body.action] || { ok: true }); };
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: vista, combinada: false, referencia: {}, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P075_HOY, kss: 7 },
                { persona: 'Luis Ferrer', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P075_HOY, kss: 3 }],
    comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [], marca: null, duty: null, ausencias: {},
    config: {}, visor: null, visorError: null
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p075', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p075c' }, vista);
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return { pedidos, fin: function () {
    window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  } };
}

PRUEBAS.caso('🔴 P075 · el médico tiene la pestaña Reportes (después de Comentarios) y el panel se los PIDE al entrar', async () => {
  const e = p075cEntrar('medico', { reportes: { ok: true, reportes: p075cReportes().filter(r => r.identificado), alcance: 'identificados' } });
  try {
    PRUEBAS.cierto(DASH.tabs.indexOf('reportes') >= 0, '🔴 la pestaña está en DASH.tabs');
    const orden = dashOrderedTabs();
    PRUEBAS.igual(orden.indexOf('reportes'), orden.indexOf('comentarios') + 1, 'y va justo después de Comentarios · ' + orden.join(','));
    await PRUEBAS.esperarA(() => e.pedidos.indexOf('reportes') >= 0, 3000);
    PRUEBAS.cierto(e.pedidos.indexOf('reportes') >= 0, '🔴 se pidió `reportes` al entrar (antes sólo el supervisor lo pedía) · ' + e.pedidos.join(','));
    await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    PRUEBAS.igual((DASH._reportes || []).length, 2, 'y quedaron en el panel');
  } finally { e.fin(); }
});

PRUEBAS.caso('🔴 P075 · la bandeja del médico muestra sólo identificados, aunque llegara un anónimo; la del supervisor sigue con los dos bloques', () => {
  const e = p075cEntrar('medico');
  try {
    DASH._reportesPedidos = true; DASH._reportes = p075cReportes();   // con un anónimo colado
    const html = renderReportesSupervisor();
    PRUEBAS.cierto(html.indexOf(esc(t('rep_identificados', { n: 2 }))) >= 0, 'bloque de identificados (2)');
    PRUEBAS.falso(/rep-block-anon/.test(html), '🔴 sin bloque de anónimos en la vista médica');
    PRUEBAS.cierto(html.indexOf(esc(t('sub_identificados_medico'))) >= 0, 'con la bajada del médico');
    PRUEBAS.cierto(html.indexOf('Ana Su') >= 0 && html.indexOf('Luis Ferrer') >= 0, 'con los nombres');
    const badges = [...html.matchAll(/rep-badge-nuevo">([^<]*)</g)].map(m => m[1]);
    PRUEBAS.cierto(badges.length > 0 && badges.every(b => b === esc(t('rep_nuevo'))), 'R14: la insignia «Nuevo» sale por t() · ' + JSON.stringify(badges));
  } finally { e.fin(); }
  const s = p075cEntrar('supervisor');
  try {
    DASH._reportesPedidos = true; DASH._reportes = p075cReportes();
    const html = renderReportesSupervisor();
    PRUEBAS.cierto(/rep-block-anon/.test(html) && html.indexOf(esc(t('rep_anonimos', { n: 1 }))) >= 0, 'DISCRIMINADOR · el supervisor sigue viendo el bloque de anónimos');
  } finally { s.fin(); }
});

PRUEBAS.caso('🔴 P075 · la ficha médica lleva los autoreportes de la persona en su Historia, con chip', () => {
  const e = p075cEntrar('medico');
  try {
    DASH._reportesPedidos = true; DASH._reportes = p075cReportes();
    DASH.f.per = 'Ana Suárez';
    const html = dashFichaMedica(DASH.registros);
    PRUEBAS.cierto(/fm-sec-t/.test(html), 'guarda: la ficha se pintó');
    PRUEBAS.cierto(html.indexOf(esc(t('fm_autoreporte'))) >= 0, '🔴 la Historia tiene la entrada «Autoreporte»');
    PRUEBAS.cierto(html.indexOf(esc(reporteOpcionLabel('no_dormi'))) >= 0, 'con la opción («no dormí») por su etiqueta');
    PRUEBAS.cierto(html.indexOf('Dormí tres horas') >= 0, 'y el comentario');
    PRUEBAS.cierto(html.indexOf(esc(t('fm_chip_autoreportes', { n: 1 }))) >= 0, 'y el chip de 30 días cuenta 1');
    PRUEBAS.falso(html.indexOf(esc(reporteOpcionLabel('malestar'))) >= 0, 'DISCRIMINADOR · el reporte de Luis no está en la ficha de Ana');
    PRUEBAS.igual(reportesDePersona('Luis Ferrer').length, 1, 'y el de Luis es de Luis');
    PRUEBAS.igual(reportesDePersona('Nadie').length, 0, 'un anónimo no matchea a nadie');
  } finally { e.fin(); }
});

PRUEBAS.caso('P075 · Dirección no tiene la pestaña y el empleado tampoco', () => {
  const e = p075cEntrar('hseq');
  try { PRUEBAS.falso(DASH.tabs.indexOf('reportes') >= 0, 'Dirección: sin pestaña Reportes (K1b)'); }
  finally { e.fin(); }
  const p = p075cEntrar('empleado', null, { rol: 'empleado' });
  try { PRUEBAS.falso(DASH.tabs.indexOf('reportes') >= 0, 'vista personal: sin pestaña'); }
  finally { p.fin(); }
});

/* ── CONTRATO ─────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 CONTRATO P075 · lo que el .gs REAL le manda al médico llena la ficha real', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p075Api();
  const respuesta = api.__leer(P075_MED);
  const e = p075cEntrar('medico', { reportes: respuesta });
  try {
    await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    PRUEBAS.igual((DASH._reportes || []).length, 2, 'guarda: llegaron los dos del .gs');
    DASH.f.per = 'Ana Suárez';
    const html = dashFichaMedica(DASH.registros);
    PRUEBAS.cierto(html.indexOf(esc(t('fm_autoreporte'))) >= 0 && html.indexOf('Dormí tres horas') >= 0,
      '🔴 el reporte que escribió la hoja y leyó el .gs aparece en la Historia de Ana');
    DASH.f.per = '';   // la bandeja es de todos: con una persona elegida filtra sólo la suya
    const bandeja = renderReportesSupervisor();
    PRUEBAS.cierto(bandeja.indexOf('Luis Ferrer') >= 0 && !/rep-block-anon/.test(bandeja), 'y la bandeja lo lista sin anónimos');
  } finally { e.fin(); }
});

/* ── LO QUE ENCONTRÓ EL VERIFICADOR DE P075 ───────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P075 · la ficha se pinta aunque la persona no tenga tests en el período (o nunca): el autoreporte no desaparece al tocarlo', () => {
  const e = p075cEntrar('medico');
  try {
    DASH._reportesPedidos = true; DASH._reportes = p075cReportes();
    /* (a) período «semana» y el último test de Ana fuera del rango: `rows` filtrado llega vacío */
    DASH.f.per = 'Ana Suárez';
    const html = dashFichaMedica([]);   // lo que dashFiltered() devuelve con el período cerrado
    PRUEBAS.cierto(/fm-sec-t/.test(html), '🔴 con cero tests en el rango la ficha igual se pinta (cae a todos sus registros)');
    PRUEBAS.cierto(html.indexOf('Dormí tres horas') >= 0, 'y trae el autoreporte');
    /* (b) alguien que nunca hizo un test pero sí reportó */
    DASH._reportes = [{ id: 'r9', opcion: 'fatigado', identificado: true, persona: 'Marta Nueva', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', comentario: 'sin dormir', creada: Date.now() - 1000 }];
    DASH.f.per = 'Marta Nueva';
    const html2 = dashFichaMedica(DASH.registros);
    PRUEBAS.cierto(html2.indexOf(esc(t('fm_sin_tests'))) >= 0, '🔴 sin ningún test: ficha reducida, con el aviso');
    PRUEBAS.cierto(html2.indexOf(esc(t('fm_autoreporte'))) >= 0 && html2.indexOf('sin dormir') >= 0, 'con la Historia y el autoreporte');
    PRUEBAS.cierto(/fmNota/.test(html2) || html2.indexOf(esc(t('visor_solo_lectura_nota'))) >= 0, 'y la nota clínica');
    /* discriminador: sin tests Y sin reportes, nada */
    DASH.f.per = 'Nadie Sin Nada';
    PRUEBAS.igual(dashFichaMedica(DASH.registros), '', 'sin tests ni reportes no hay ficha (como antes)');
  } finally { e.fin(); }
});

PRUEBAS.caso('🔴 P075 · `DASH.combinada` existe: el médico con la clave ÚNICA ve la bandeja completa y puede editar el plan, como el servidor le permite', () => {
  const e = p075cEntrar('medico', null, { combinada: true });
  try {
    PRUEBAS.igual(DASH.combinada, true, '🔴 onDashData guarda `combinada` (antes nunca se asignaba)');
    DASH._reportesPedidos = true; DASH._reportes = p075cReportes();
    const html = renderReportesSupervisor();
    PRUEBAS.cierto(/rep-block-anon/.test(html), '🔴 combinada: ve también los anónimos, como el servidor le manda (alcance «todo»)');
    PRUEBAS.cierto(cicloPuedeEditarPlan(), 'y `cicloPuedeEditarPlan` la deja editar (leía DASH.combinada desde P057 sin que existiera)');
  } finally { e.fin(); }
  const m = p075cEntrar('medico', null, { combinada: false });
  try {
    PRUEBAS.igual(DASH.combinada, false, 'con clave propia: false');
    PRUEBAS.falso(cicloPuedeEditarPlan(), 'DISCRIMINADOR · el médico con clave propia no edita el plan');
  } finally { m.fin(); }
});

PRUEBAS.caso('P075 · la llegada de `reportes` repinta el panel aunque sea la última respuesta', async () => {
  const oRep = window.dashRepintar; let repintes = 0;
  window.dashRepintar = () => { repintes++; };
  const e = p075cEntrar('medico', { reportes: { ok: true, reportes: p075cReportes().filter(r => r.identificado), alcance: 'identificados' } });
  try {
    await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    PRUEBAS.alMenos(repintes, 1, 'al llegar los reportes se repintó (antes sólo si DASH.tab === «reportes», que nunca lo es)');
  } finally { window.dashRepintar = oRep; e.fin(); }
});

PRUEBAS.caso('P075 · el visor del admin sobre una empresa COMBINADA mirada «como Dirección» no recibe nombres', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p075Api();
  const r = api.__leer(Object.assign({}, P075_ADM, { empresa: '', verEmpresa: 'helitec2', verVista: 'hseq' }));
  PRUEBAS.igual(r.alcance, 'anonimos', '`hseq` manda sobre `combinada` (el visor copia combinada:true)');
  PRUEBAS.cierto((r.reportes || []).every(x => !('persona' in x)), 'sin nombres');
});
