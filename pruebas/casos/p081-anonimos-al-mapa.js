/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P081 · I1-h (hallazgo 11) · LOS REPORTES ANÓNIMOS LLEGAN AL MAPA DE RIESGO DE DIRECCIÓN (2026-09-17)

   `carga_excesiva`, `entorno`, `turno_rotativo` son problemas del diseño del trabajo, no de una
   persona, y morían en la bandeja del supervisor. Desde P075 el servidor le manda a Dirección sólo
   los anónimos y sin nombres; acá Dirección los PIDE y el Mapa de riesgo los cuenta por tipo y por
   área con la regla de `anonN`. Camino real: `onDashData` como Dirección, `renderHseqMrfo()`; contrato
   con la respuesta REAL del `.gs`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P081_HOY = new Date().toISOString().slice(0, 10);
function p081Reportes(){
  const ahora = Date.now();
  return [
    { id: 'a1', opcion: 'carga_excesiva', identificado: false, empresa: 'Consorcio HELITEC', departamento: 'Operaciones',   comentario: '', creada: ahora - 3600000 },
    { id: 'a2', opcion: 'carga_excesiva', identificado: false, empresa: 'Consorcio HELITEC', departamento: 'Operaciones',   comentario: '', creada: ahora - 7200000 },
    { id: 'a3', opcion: 'turno_rotativo', identificado: false, empresa: 'Consorcio HELITEC', departamento: 'Mantenimiento', comentario: '', creada: ahora - 9000000 },
    { id: 'a4', opcion: 'entorno',        identificado: false, empresa: 'Consorcio HELITEC', departamento: 'Operaciones',   comentario: '', creada: ahora - 9500000 }
  ];
}
/* Dirección, sin red, con `anonN` = 3: Operaciones tiene 3 personas (se desglosa), Mantenimiento 1 (no). */
function p081Entrar(respuestas, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  const pedidos = [];
  window.gestPost = body => { pedidos.push(body.action); return Promise.resolve((respuestas || {})[body.action] || { ok: true }); };
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  const reg = (p, dep) => ({ persona: p, empresa: 'Consorcio HELITEC', departamento: dep, cargo: 'Piloto', fecha: P081_HOY, kss: 3 });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'hseq', combinada: false, referencia: {}, metricas: ['kss'],
    registros: [reg('P1', 'Operaciones'), reg('P2', 'Operaciones'), reg('P3', 'Operaciones'), reg('P4', 'Mantenimiento')],
    comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [], marca: null, duty: null, ausencias: {},
    config: { anonN: 3 }, visor: null, visorError: null
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p081', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p081' }, 'hseq');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return { pedidos, fin: function(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {} } };
}
function p081Bloque(html){
  const cont = document.createElement('div'); cont.innerHTML = html;
  return [...cont.querySelectorAll('.dash-block')].find(b => (b.querySelector('.db-title') || {}).textContent.indexOf(t('hseq_senales_t', { n: '' }).replace(/\s*\(\)$/, '')) === 0) || null;
}

PRUEBAS.caso('🔴 P081 · Dirección PIDE los reportes al entrar y el Mapa de riesgo los cuenta por tipo y por área (regla de anonN)', async () => {
  const e = p081Entrar({ reportes: { ok: true, reportes: p081Reportes(), alcance: 'anonimos' } });
  try {
    await PRUEBAS.esperarA(() => e.pedidos.indexOf('reportes') >= 0, 3000);
    PRUEBAS.cierto(e.pedidos.indexOf('reportes') >= 0, '🔴 se pidió `reportes` (antes Dirección no lo pedía)');
    await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    PRUEBAS.igual((DASH._reportes || []).length, 4, 'llegaron los cuatro anónimos');
    const html = renderHseqMrfo(dashFiltered());
    const b = p081Bloque(html);
    PRUEBAS.cierto(!!b, '🔴 el Mapa de riesgo tiene el bloque de señales');
    const titulo = b.querySelector('.db-title').textContent;
    PRUEBAS.igual(titulo, t('hseq_senales_t', { n: 4 }), 'con el total en el título');
    const senales = [...b.querySelectorAll('.hs-senal')].map(x => x.textContent.trim());
    PRUEBAS.cierto(senales.some(x => x === '2 ' + reporteOpcionLabel('carga_excesiva')), '🔴 «2 carga excesiva» · ' + JSON.stringify(senales));
    PRUEBAS.cierto(senales.some(x => x === '1 ' + reporteOpcionLabel('turno_rotativo')) && senales.some(x => x === '1 ' + reporteOpcionLabel('entorno')), 'y las otras dos opciones');
    PRUEBAS.cierto(senales.some(x => x === '3 Operaciones'), '🔴 Operaciones (3 personas ≥ anonN) se desglosa con sus 3');
    PRUEBAS.falso(senales.some(x => /Mantenimiento/.test(x)), '🔴 Mantenimiento (1 persona < anonN) NO se nombra');
    PRUEBAS.cierto(senales.some(x => x === '1 ' + t('hseq_senales_otras')), 'y va a «otras áreas»');
    PRUEBAS.falso(/rep-name|Ana|Luis/.test(b.innerHTML), 'ningún nombre');
  } finally { e.fin(); }
});

PRUEBAS.caso('P081 · un reporte identificado colado NO se cuenta; sin reportes el bloque lo dice; el mapa de siempre sigue', () => {
  const e = p081Entrar();
  try {
    DASH._reportesPedidos = true;
    DASH._reportes = p081Reportes().concat([{ id: 'x1', opcion: 'no_dormi', identificado: true, persona: 'Alguien', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', comentario: '', creada: Date.now() }]);
    const b = p081Bloque(renderHseqMrfo(dashFiltered()));
    PRUEBAS.igual(b.querySelector('.db-title').textContent, t('hseq_senales_t', { n: 4 }), 'cuenta 4, no 5: el identificado no entra');
    PRUEBAS.falso(/Alguien/.test(b.innerHTML), 'y su nombre no aparece');
    DASH._reportes = [];
    const b2 = p081Bloque(renderHseqMrfo(dashFiltered()));
    PRUEBAS.cierto(b2 && b2.textContent.indexOf(t('hseq_senales_vacio')) >= 0, 'sin reportes: «sin reportes anónimos en el período»');
    const html = renderHseqMrfo(dashFiltered());
    PRUEBAS.cierto(html.indexOf(esc(t('db_mapa_area'))) >= 0 && /hs-grid|hs-agregado/.test(html), 'DISCRIMINADOR · el mapa por área de siempre sigue debajo');
  } finally { e.fin(); }
});

PRUEBAS.caso('P081 · el supervisor no ve el bloque de señales (es de Dirección) y la demo de Dirección lo trae', () => {
  const s = (function(){
    const prevDash = DASH;
    const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
    window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
    try {
      onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: ['kss'], registros: [{ persona: 'P1', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P081_HOY, kss: 3 }], comentarios: [], pvt: [], aptitud: [], turnos: [], operacional: [], config: {}, marca: null, duty: null, ausencias: {} },
        'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p081', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p081' }, 'supervisor');
    } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
    return function(){ window.gestPost = oPost; DASH = prevDash; };
  })();
  try { PRUEBAS.igual(hseqSenalesHtml(), '', 'supervisor: nada'); } finally { s(); }
  const d = p081Entrar(null, { demo: true });
  try {
    PRUEBAS.cierto(DASH.demoMode, 'guarda: demo');
    PRUEBAS.cierto(Array.isArray(DASH._reportes) && DASH._reportes.length > 0 && DASH._reportes.every(r => !r.identificado), 'la demo de Dirección trae sólo anónimos');
  } finally { d.fin(); }
});

PRUEBAS.caso('🔴 CONTRATO P081 · lo que el .gs REAL le manda a Dirección alimenta el bloque de señales', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)', 'Rol (supervisor ve solo su empresa, admin ve todas)', 'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)', 'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'],
      ['helitec', 'sup-081', 'supervisor', 'Consorcio HELITEC, Helitec', 'med-081', 'dir-081']],
    'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario'],
      [P081_HOY + 'T06:10:00', 'r1', 'no_dormi',       'true',  'Ana Suárez', 'Consorcio HELITEC', 'Operaciones',   'Piloto', 'Dormí tres horas'],
      [P081_HOY + 'T07:10:00', 'r2', 'carga_excesiva', 'false', '',           'Consorcio HELITEC', 'Operaciones',   '',       'Tres vuelos'],
      [P081_HOY + 'T08:10:00', 'r3', 'turno_rotativo', 'false', '',           'Consorcio HELITEC', 'Mantenimiento', '',       '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono', 'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer']);
  const respuesta = JSON.parse(api.accionReportesLeer({ usuario: 'helitec', pass: 'dir-081', dispositivoId: 'p081' }).getContent());
  PRUEBAS.igual(respuesta.alcance, 'anonimos', 'guarda: el .gs le manda a Dirección los anónimos');
  const e = p081Entrar({ reportes: respuesta });
  try {
    await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    const b = p081Bloque(renderHseqMrfo(dashFiltered()));
    PRUEBAS.cierto(!!b && b.querySelector('.db-title').textContent === t('hseq_senales_t', { n: 2 }), '🔴 dos señales (el identificado ni viajó)');
    const senales = [...b.querySelectorAll('.hs-senal')].map(x => x.textContent.trim());
    PRUEBAS.cierto(senales.some(x => x === '1 ' + reporteOpcionLabel('carga_excesiva')) && senales.some(x => x === '1 ' + reporteOpcionLabel('turno_rotativo')), 'contadas por tipo · ' + JSON.stringify(senales));
    PRUEBAS.falso(/Ana Su|Dormí/.test(b.innerHTML), 'sin rastro del identificado');
  } finally { e.fin(); }
});

PRUEBAS.caso('🔴 P081 · sin tests en el período el mapa está vacío, pero las señales anónimas se ven igual (verificador)', () => {
  const e = p081Entrar(null, { registros: [] });
  try {
    DASH._reportesPedidos = true; DASH._reportes = p081Reportes();
    const html = renderHseqMrfo(dashFiltered());
    const b = p081Bloque(html);
    PRUEBAS.cierto(!!b, '🔴 el bloque de señales está aunque no haya gente con tests');
    PRUEBAS.igual(b.querySelector('.db-title').textContent, t('hseq_senales_t', { n: 4 }), 'con sus cuatro');
    PRUEBAS.cierto(/class="dv"/.test(html), 'y el mapa por área sigue vacío (no hay a quién pintar)');
  } finally { e.fin(); }
});
