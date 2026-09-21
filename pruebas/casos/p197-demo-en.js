PRUEBAS.grupo('P197 (2026-09-21) · la demostración en inglés desde el servidor: departamentos y cargos traducidos por tabla, sin partir grupos');

/* Decisión de Franco al cerrar P196: los departamentos de la demo son DATO que agrupa (los registros los manda el
   servidor; el cliente siembra ciclo, jornada, turnos, nómina, reportes y niveles con los mismos nombres). Se traducen
   en el SERVIDOR (`action=demo` + `lang`, tabla `DEMO_TRADUCCIONES`) y lo sembrado se traduce con la MISMA tabla del
   cliente (`demoTablaEn()`, fuera del diccionario por R14), sólo cuando el servidor confirmó (`d.lang === 'en'`).
   Contrato: las dos tablas son iguales par por par. Camino real: `accionDemo` en el emulador con una hoja de respuestas de la Empresa Demo; `onDashData`
   con ese payload; `demoIdiomaCambio` con `dashRequest` de mentira. */

/* La tabla del .gs, leída de la FUENTE (como a4): si alguien la edita de un solo lado, esto falla. */
function p197TablaGs(){
  const i = CTX.gs.indexOf('var DEMO_TRADUCCIONES = {'); const j = CTX.gs.indexOf('function demoTraducirValor_', i);
  const src = CTX.gs.slice(i, j);
  return new Function(src + '\nreturn DEMO_TRADUCCIONES;')();
}
function p197Hoja(filas){
  const cab = new Array(90).fill(''); cab[0] = 'Marca temporal'; cab[1] = 'Nombre'; cab[2] = 'Departamento'; cab[72] = 'Empresa'; cab[73] = 'Fecha'; cab[86] = 'KSS';
  const hoy = new Date().toISOString().slice(0, 10);
  // el .gs lee desde la fila 3 (dos filas de encabezado en la hoja real): se agrega una segunda fila de cabecera
  return [cab, cab.slice()].concat(filas.map(f => { const r = new Array(90).fill(''); r[0] = hoy + ' 10:00:00'; r[1] = f[0]; r[2] = f[1]; r[72] = 'Empresa Demo'; r[73] = hoy; r[86] = f[2] || 5; return r; }));
}

PRUEBAS.caso('🔴 P197 · contrato: la tabla DEMO_TRADUCCIONES del .gs y demoTablaEn() del cliente son la MISMA tabla (los dos lados, par por par)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const tabla = p197TablaGs().en, cli = demoTablaEn();
  const dif = [];
  ['departamento', 'cargo'].forEach(campo => {
    Object.keys(tabla[campo]).forEach(k => { if (cli[campo][k] !== tabla[campo][k]) dif.push(campo + '/' + k + ': cliente ' + cli[campo][k] + ' ≠ .gs ' + tabla[campo][k]); });
    Object.keys(cli[campo]).forEach(k => { if (!(k in tabla[campo])) dif.push(campo + '/' + k + ': sólo en el cliente'); });
  });
  PRUEBAS.igual(dif.length, 0, '🔴 las dos tablas coinciden par por par · ' + dif.join(' | '));
  PRUEBAS.cierto(Object.keys(tabla.departamento).length >= 6 && ['administracion', 'mantenimiento', 'operaciones', 'tripulacion', 'direccion', 'legal'].every(k => tabla.departamento[k]), 'los seis departamentos reales de la Empresa Demo (inventario del 2026-09-21) tienen traducción');
  const prevDash = DASH;
  try {
    DASH = { _demoLang: 'es' };
    PRUEBAS.igual(demoDep('Tripulación'), 'Tripulación', 'DISCRIMINADOR · sin confirmación del servidor, demoDep deja el nombre');
    DASH = { _demoLang: 'en' };
    PRUEBAS.igual([demoDep('Tripulación'), demoDep('tripulación'), demoCargo('Despachante'), demoDep('Área Nueva')], ['Crew', 'Crew', 'Dispatcher', 'Área Nueva'], 'con confirmación: traduce (sin importar mayúsculas/tildes) y deja lo que no conoce');
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('🔴 P197 · servidor: action=demo con lang=en devuelve los registros de la Empresa Demo con el departamento traducido; sin lang (endpoint viejo/cliente viejo) en español; un cliente real nunca', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'Respuestas de formulario 1': p197Hoja([['Nicolás Herrera', 'Tripulación', 6], ['Ana Suárez', 'Administración', 4], ['Diego Ramírez', 'Operaciones', 5], ['Ricardo Salcedo', 'Dirección', 3]])
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionDemo', 'demoTraducir_', 'demoInventario_']);
  const en = JSON.parse(api.accionDemo({ lang: 'en', dispositivoId: 'p197' }).getContent());
  PRUEBAS.cierto(en.ok && en.demo === true && en.lang === 'en', 'guarda: la demo contesta y dice lang=en · ' + JSON.stringify({ ok: en.ok, lang: en.lang, n: (en.registros || []).length }));
  const deps = Array.from(new Set((en.registros || []).map(r => r.departamento))).sort();
  PRUEBAS.igual(deps.join('|'), ['Administration', 'Crew', 'Management', 'Operations'].join('|'), '🔴 los departamentos llegan traducidos · ' + deps.join('|'));
  PRUEBAS.cierto((en.registros || []).every(r => r.empresa === 'Empresa Demo'), 'la empresa sigue siendo Empresa Demo (no se traduce: es el alcance)');
  const es = JSON.parse(api.accionDemo({ dispositivoId: 'p197' }).getContent());
  PRUEBAS.igual(Array.from(new Set((es.registros || []).map(r => r.departamento))).sort().join('|'), ['Administración', 'Dirección', 'Operaciones', 'Tripulación'].join('|'), 'DISCRIMINADOR · sin lang, en español · lang=' + es.lang);
  const otro = JSON.parse(api.accionDemo({ lang: 'fr', dispositivoId: 'p197' }).getContent());
  PRUEBAS.igual(otro.lang, 'es', 'un idioma sin tabla cae a español');
  /* demoTraducir_ deja pasar lo que no conoce y cuenta cuántos quedaron sin traducir */
  const filas = [{ departamento: 'Tripulación', cargo: 'Piloto' }, { departamento: 'Área Nueva', cargo: '' }];
  const sin = api.demoTraducir_('en', [filas]);
  PRUEBAS.igual([filas[0].departamento, filas[0].cargo, filas[1].departamento, sin], ['Crew', 'Pilot', 'Área Nueva', 1], 'traduce lo que conoce, deja lo que no, y lo cuenta');
  const inv = api.demoInventario_();
  PRUEBAS.cierto(inv.departamentos['Tripulación'] === 1 && inv.sinTraduccion.departamentos.length === 0, 'demo_inventario: cuenta por departamento y no encuentra faltantes · ' + JSON.stringify(inv.sinTraduccion));
  const gsv = (/GS_VERSION = "([0-9.-]+)"/.exec(CTX.gs) || [])[1] || '';
  PRUEBAS.cierto(/if \(accion === "demo"\)/.test(CTX.gs) && gsv >= '2026-09-21.2', 'GS_VERSION ≥ 2026-09-21.2 · ' + gsv);
});

/* Payload de demo como el que manda el servidor, ya traducido (o no) */
function p197Payload(lang){
  const hoy = new Date().toISOString().slice(0, 10);
  const dep = n => lang === 'en' ? ({ 'Tripulación': 'Crew', 'Administración': 'Administration', 'Operaciones': 'Operations', 'Mantenimiento': 'Maintenance' })[n] : n;
  const regs = [['Nicolás Herrera', 'Tripulación', 6], ['Ana Suárez', 'Administración', 4], ['Diego Ramírez', 'Operaciones', 5], ['Andrés Peña', 'Mantenimiento', 3]]
    .map(f => ({ persona: f[0], empresa: 'Empresa Demo', departamento: dep(f[1]), cargo: '', fecha: hoy, kss: f[2] }));
  const d = { ok: true, rol: 'supervisor', vista: 'medico', demo: true, referencia: { kss: 5 }, metricas: ['kss'], registros: regs, comentarios: [], pvt: [], marca: null, config: {} };
  if (lang) d.lang = lang;
  return d;
}
function p197Entrar(d, vista){
  const prevDash = DASH, prevPayload = DEMO_PAYLOAD, prevLS = Object.assign({}, localStorage), prevIdioma = idiomaActual();
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost, oReq = window.dashRequest;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  /* R18 · un cambio de idioma con la demo abierta dispara dashRequest: con el fetch cortado, conBloqueo('#portalDash') quedaba
     colgado para el resto de la corrida (verificador). Se rechaza en el acto: demoIdiomaCambio suelta el bloqueo en su catch. */
  window.dashRequest = () => Promise.reject(new Error('sin red'));
  const params = { action: 'demo', dispositivoId: 'p197', lang: idiomaActual() };
  DEMO_PAYLOAD = { d: d, params: params, scope: 'Empresa Demo', lang: idiomaActual() };
  onDashData(d, 'Empresa Demo', params, vista || 'supervisor');
  return function fin(){
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost; window.dashRequest = oReq; DASH = prevDash; DEMO_PAYLOAD = prevPayload; fijarIdioma(prevIdioma);
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  };
}
function p197Deps(){
  const out = new Set();
  (DASH.registros || []).forEach(r => out.add(r.departamento));
  (DASH.operacional || []).forEach(r => r.departamento && out.add(r.departamento));
  (DASH.turnos || []).forEach(r => r.departamento && out.add(r.departamento));
  (DASH._reportes || []).forEach(r => r.departamento && out.add(r.departamento));
  (DASH._niveles || []).forEach(r => r.departamento && out.add(r.departamento));
  ((DASH.duty && DASH.duty.personas) || []).forEach(r => r.departamento && out.add(r.departamento));
  nominaDemo().forEach(r => r.departamento && out.add(r.departamento));
  return Array.from(out).sort();
}

PRUEBAS.caso('🔴 P197 · cliente: con el payload en inglés (lang=en) TODO lo sembrado cae en los mismos grupos que los registros; sin lang (endpoint viejo) todo queda en español aunque la app esté en inglés', async () => {
  const prevIdioma = idiomaActual();
  fijarIdioma('en');
  let fin = p197Entrar(p197Payload('en'), 'supervisor');
  try {
    PRUEBAS.igual(DASH._demoLang, 'en', 'guarda: el servidor confirmó en');
    const deps = p197Deps();
    PRUEBAS.cierto(deps.length > 0 && deps.every(x => !/[áéíóú]/.test(x) && !/^(Tripulación|Administración|Operaciones|Mantenimiento|Dirección)$/.test(x)), '🔴 ningún departamento en español entre registros, ciclo, turnos, reportes, niveles, jornada y nómina · ' + deps.join('|'));
    PRUEBAS.cierto(deps.indexOf('Crew') >= 0 && deps.indexOf('Operations') >= 0 && deps.indexOf('Maintenance') >= 0, 'y están los traducidos · ' + deps.join('|'));
    const grupos = Object.keys(dashGroup(dashFiltered().concat(DASH.operacional.map(r => ({ departamento: r.departamento }))), 'departamento'));
    PRUEBAS.cierto(grupos.every(g => !/Tripulaci/.test(g)) && grupos.some(g => g === 'Crew'), '🔴 al agrupar por departamento hay UN «Crew», no «Tripulación» + «Crew» · ' + grupos.join('|'));
    PRUEBAS.igual(nominaDemo().find(x => x.persona === 'Mariana Cárdenas').cargo, 'Dispatcher', 'los cargos sembrados también (Despachante → Dispatcher)');
    PRUEBAS.igual(demoAplicarGuardado('supervisor'), true, 'guarda: el payload guardado en este idioma se aplica');
    fijarIdioma('es');
    PRUEBAS.igual(demoAplicarGuardado('supervisor'), false, '🔴 el payload guardado en OTRO idioma no se aplica (se pide de nuevo al servidor)');
    fijarIdioma('en');
  } finally { fin(); }
  /* endpoint viejo: el payload no trae lang → nada se traduce, ni siquiera con la app en inglés */
  fijarIdioma('en');
  fin = p197Entrar(p197Payload(null), 'supervisor');
  try {
    PRUEBAS.igual(DASH._demoLang, 'es', 'sin lang del servidor: no confirmado');
    const deps = p197Deps();
    PRUEBAS.cierto(deps.indexOf('Tripulación') >= 0 && deps.every(x => x !== 'Crew'), 'DISCRIMINADOR · todo en español, nada partido · ' + deps.join('|'));
  } finally { fin(); fijarIdioma(prevIdioma); }
  await new Promise(r => setTimeout(r, 0));
  const cuerpo = document.querySelector('#portalDash');
  PRUEBAS.cierto(!cuerpo || !cuerpo.inert, 'R18 · el cuerpo del panel no quedó inerte por un pedido de idioma que nunca resuelve (verificador)');
});

PRUEBAS.caso('🔴 P197 · cambiar de idioma con la demo abierta la vuelve a pedir con el idioma nuevo, purga lo sembrado en local y vuelve a entrar con la misma vista; sin red, queda como estaba', async () => {
  const prevIdioma = idiomaActual();
  fijarIdioma('es');
  const fin = p197Entrar(p197Payload(null), 'supervisor');
  const oReq = window.dashRequest; let pedidos = [];
  try {
    demoSembrando(gestSembrarDemo);
    PRUEBAS.cierto(gestList().some(g => /^gdemo/.test(String(g.id || ''))), 'guarda: hay gestiones sembradas (gdemo*) con el departamento en español');
    window.dashRequest = params => { pedidos.push(params); return Promise.resolve(p197Payload('en')); };
    fijarIdioma('en');   // aplicarIdioma → demoIdiomaCambio()
    await new Promise(r => setTimeout(r, 0)); await null; await null;
    for (let i = 0; i < 20 && !(DASH && DASH._demoLang === 'en'); i++) await new Promise(r => setTimeout(r, 25));
    PRUEBAS.igual(pedidos.length, 1, '🔴 un pedido nuevo al servidor');
    PRUEBAS.cierto(!!pedidos[0] && pedidos[0].action === 'demo' && pedidos[0].lang === 'en', 'action=demo con lang=en · ' + JSON.stringify(pedidos[0]));
    PRUEBAS.igual([DASH._demoLang, DASH.vista, DEMO_PAYLOAD.lang], ['en', 'supervisor', 'en'], '🔴 volvió a entrar con la misma vista y el payload guardado ya es el inglés');
    PRUEBAS.cierto(p197Deps().indexOf('Crew') >= 0 && p197Deps().indexOf('Tripulación') < 0, 'y los grupos son los ingleses');
    const gdemo = gestList().filter(g => /^gdemo/.test(String(g.id || '')));
    PRUEBAS.cierto(gdemo.length === 0 || gdemo.every(g => g.departamento !== 'Tripulación' && g.departamento !== 'Operaciones'), 'lo sembrado en español se purgó (se vuelve a sembrar en inglés al abrir el cuaderno) · ' + gdemo.map(g => g.departamento).join('|'));
    /* sin red: no pasa nada */
    window.dashRequest = () => Promise.reject(new Error('sin red'));
    const r = await (function(){ fijarIdioma('es'); return demoIdiomaCambio(); })();
    PRUEBAS.igual(r, false, 'sin red: demoIdiomaCambio devuelve false');
    PRUEBAS.igual(DASH._demoLang, 'en', 'y la demo queda como estaba (en inglés), sin partir grupos');
  } finally { window.dashRequest = oReq; fin(); fijarIdioma(prevIdioma); }
});

PRUEBAS.caso('🔴 P197 · carrera es→en→es: la respuesta vieja se descarta, se guarda el idioma que VIAJÓ y se vuelve a pedir el último; la pestaña y el filtro sobreviven al reingreso', async () => {
  const prevIdioma = idiomaActual();
  fijarIdioma('es');
  const fin = p197Entrar(p197Payload(null), 'supervisor');
  const oReq = window.dashRequest; const pendientes = [];
  try {
    window.dashRequest = params => new Promise(res => { pendientes.push({ params, res }); });
    DASH.tab = 'aptitud'; DASH.f.dep = 'Tripulación';
    fijarIdioma('en');                     // pedido A (lang=en), queda en vuelo
    await new Promise(r => setTimeout(r, 0));
    fijarIdioma('es');                     // la app vuelve a español antes de que llegue A
    await new Promise(r => setTimeout(r, 0));
    PRUEBAS.igual(pendientes.length, 1, 'guarda: un pedido en vuelo (en), el segundo cambio no pide porque el payload guardado sigue en es');
    pendientes[0].res(p197Payload('en'));   // llega A, tarde
    await new Promise(r => setTimeout(r, 30));
    PRUEBAS.cierto(pendientes.length === 2 && pendientes[1].params.lang === 'es', '🔴 A se aplica con lang=en y, como la app ya está en es, se pide de nuevo en es (antes: quedaba en inglés bajo una interfaz en español y nadie volvía a pedir)');
    PRUEBAS.igual(DEMO_PAYLOAD.lang, 'en', 'el payload guardado dice el idioma que VIAJÓ (en), no el de la app al llegar');
    pendientes[1].res(p197Payload(null));   // llega B (es)
    await new Promise(r => setTimeout(r, 30));
    PRUEBAS.igual([DASH._demoLang, DEMO_PAYLOAD.lang, pendientes.length], ['es', 'es', 2], '🔴 termina en español, coherente con la interfaz, sin más pedidos');
    PRUEBAS.igual([DASH.tab, DASH.f.dep], ['aptitud', 'Tripulación'], 'la pestaña y el filtro de departamento sobreviven (el filtro, en el idioma vigente)');
    /* una respuesta VIEJA que llega después de una nueva se descarta */
    fijarIdioma('en'); await new Promise(r => setTimeout(r, 0));
    const a = pendientes[pendientes.length - 1];
    a.res(p197Payload('en')); await new Promise(r => setTimeout(r, 30));
    PRUEBAS.igual([DASH._demoLang, DASH.f.dep], ['en', 'Crew'], 'y al pasar a inglés el filtro «Tripulación» pasa a «Crew» (si no, filtraría vacío)');
  } finally { window.dashRequest = oReq; fin(); fijarIdioma(prevIdioma); }
});
