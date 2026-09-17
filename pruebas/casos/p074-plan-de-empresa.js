/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P074 · I1-a · EL PLAN DEL CICLO DE LA EMPRESA QUEDA REGISTRADO (2026-09-17)

   `accionCicloConfigGuardar` escribía la jornada de TODA la empresa con un `setValue`, sin leer el
   valor anterior, sin candado, sin bitácora y sin recorte por vista: un servicio médico con clave
   propia o Dirección podían cambiarla con un pedido armado a mano. R3 pide que toda acción quede
   registrada con quién, cuándo y de qué a qué. Ahora el SERVIDOR registra en el mismo pedido
   (es el único que sabe el «antes» de verdad y al que no se le puede saltear), y sólo escriben
   supervisor (o clave combinada) y admin — la misma regla que el plan por persona (H7).
   Decidido por Franco en el panel, 2026-09-17. Plan: docs/specs/p074-plan-de-empresa-con-bitacora.

   Todo entra por el camino real (R17): `accionCicloConfigGuardar(p)` con `Accesos` sembrado, y
   `cicloCfgGuardar(btn)` con el editor generado por `cicloCfgHtml` y `confirm`/`dashRequest`
   espiados. El contrato: la fila que escribe el `.gs` REAL la etiqueta y la muestra el cliente real.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P074_ADMIN = 'admin-p074#';
const P074_CAB_ACCESOS = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P074_BIT_CAB = ['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen',
  'NivelRiesgo', 'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON'];
const P074_PLAN_A = { traslado: 60, jornada: 720, regreso: 60, descanso: 600 };
const P074_PLAN_B = { traslado: 90, jornada: 600, regreso: 60, descanso: 600 };
const P074_PLAN_G = { traslado: 45, jornada: 480, regreso: 45, descanso: 660 };   // la fila general

/* Un CH falso: dos cuentas de HELITEC (una con las tres claves, otra combinada), Silva, el admin.
   `Config Empresa` con una fila GENERAL y una PROPIA escrita con el ALIAS «Helitec» (así se ve que
   el escritor la encuentra igual que el lector). `Bitácora` con el encabezado real. */
function p074Hojas(extra) {
  const base = {
    'Accesos': [P074_CAB_ACCESOS,
      ['*',          P074_ADMIN, 'admin',      '',                           '',        ''],
      ['helitec',    'sup-074',  'supervisor', 'Consorcio HELITEC, Helitec', 'med-074', 'dir-074'],
      ['helitec2',   'comb-074', 'supervisor', 'Consorcio HELITEC, Helitec', '',        ''],
      ['silva',      'sup-sil',  'supervisor', 'Aeroambulancias Silva',      '',        '']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor'],
      ['',        'cicloPlan', JSON.stringify(P074_PLAN_G)],
      ['Helitec', 'cicloPlan', JSON.stringify(P074_PLAN_A)],
      ['Consorcio HELITEC', 'sector', 'aviacion']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono', 'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC', 'Ana Suárez', 'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3']],
    'Bitácora': [P074_BIT_CAB.slice()]
  };
  return Object.assign(base, extra || {});
}
function p074Api(hojas, candado) {
  const env = GS.crearEntorno(hojas || p074Hojas());
  if (candado === false) {
    env.LockService = { getScriptLock: () => ({ tryLock: () => false, waitLock: () => false, releaseLock: () => {}, hasLock: () => false }) };
  }
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloConfigGuardar', 'bitacoraServidor', 'leerConfigEmpresa', 'cicloPlanVigente_', 'obtenerHojaConfig']);
  api.__env = env;
  api.__cfg = () => env.__libro.getSheetByName('Config Empresa').getDataRange().getValues().slice(1);
  api.__planes = () => api.__cfg().filter(f => String(f[1]) === 'cicloPlan');
  api.__bit = () => env.__libro.getSheetByName('Bitácora').getDataRange().getValues().slice(1);
  api.__guardar = (cred, plan, extra) => JSON.parse(api.accionCicloConfigGuardar(Object.assign(
    { dispositivoId: 'tel-074', plan: JSON.stringify(plan), quien: 'Marta Supervisora' }, cred, extra || {})).getContent());
  return api;
}
const P074_SUP  = { usuario: 'helitec',  pass: 'sup-074' };
const P074_MED  = { usuario: 'helitec',  pass: 'med-074' };
const P074_DIR  = { usuario: 'helitec',  pass: 'dir-074' };
const P074_COMB = { usuario: 'helitec2', pass: 'comb-074' };
const P074_ADM  = { usuario: '*',        pass: P074_ADMIN, empresa: 'Consorcio HELITEC' };

/* ── SERVIDOR ─────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P074 · el supervisor guarda: UNA fila propia (la del alias, reescrita) y UNA línea de bitácora con quién, de qué a qué', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api();
  const r = api.__guardar(P074_SUP, P074_PLAN_B);
  PRUEBAS.igual(r.ok, true, 'guardó · ' + JSON.stringify(r).slice(0, 120));
  PRUEBAS.igual(r.actualizado, true, 'actualizó la fila que existía (con el alias «Helitec»)');
  PRUEBAS.igual(r.antes, P074_PLAN_A, 'devuelve el plan anterior');
  PRUEBAS.igual(r.origenAntes, 'propia', 'que era el propio de la empresa');
  PRUEBAS.cierto(!!r.bitacora, 'y el id de la línea de bitácora');
  const planes = api.__planes();
  PRUEBAS.igual(planes.length, 2, '🔴 dos filas de cicloPlan: la general y UNA propia (no se appendeó otra)');
  const propia = planes.find(f => String(f[0]) !== '');
  PRUEBAS.igual(String(propia[0]), 'Consorcio HELITEC', 'la fila queda con el nombre canónico');
  PRUEBAS.igual(JSON.parse(propia[2]), P074_PLAN_B, 'y con el plan nuevo');
  /* Y el lector la lee: escritor y lector derivan igual */
  PRUEBAS.igual(api.leerConfigEmpresa('Consorcio HELITEC').cicloPlan, P074_PLAN_B, 'leerConfigEmpresa devuelve el nuevo');
  const bit = api.__bit();
  PRUEBAS.igual(bit.length, 1, '🔴 UNA línea de bitácora');
  const f = bit[0];
  PRUEBAS.igual(String(f[2]), 'ciclo_plan_guardado', 'Accion');
  PRUEBAS.igual(String(f[3]), 'Consorcio HELITEC', 'Sujeto = la empresa');
  PRUEBAS.igual(String(f[4]), 'helitec', '🔴 Actor = la cuenta del panel (no «sistema»)');
  PRUEBAS.igual(String(f[5]), 'supervisor', 'Rol = la vista');
  PRUEBAS.igual(String(f[6]), 'app', 'Origen');
  const ev = JSON.parse(f[12]);
  PRUEBAS.igual(ev.detalle.antes, P074_PLAN_A, '🔴 JSON: de qué');
  PRUEBAS.igual(ev.detalle.despues, P074_PLAN_B, '🔴 JSON: a qué');
  PRUEBAS.igual(ev.detalle.origenAntes, 'propia', 'JSON: de dónde salía el «antes»');
  PRUEBAS.igual(ev.detalle.quien, 'Marta Supervisora', 'JSON: el nombre del perfil de quien tocó');
  PRUEBAS.igual(ev.actor, 'helitec', 'JSON: actor');
  PRUEBAS.igual(ev.rol, 'supervisor', 'JSON: rol');
  PRUEBAS.cierto(ev.ts > 0 && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(String(f[0])), 'cuándo: ts y Fecha');
  PRUEBAS.igual(String(f[11]), ev.id, 'IdEvento = id del JSON (P102: sin esto la fila era invisible)');
});

PRUEBAS.caso('P074 · sin fila propia el «antes» es la general; sin ninguna, «ninguno»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p074Hojas();
  hojas['Config Empresa'] = [['Empresa', 'Clave', 'Valor'], ['', 'cicloPlan', JSON.stringify(P074_PLAN_G)]];
  const api = p074Api(hojas);
  const r = api.__guardar(P074_SUP, P074_PLAN_B);
  PRUEBAS.igual([r.ok, r.nuevo, r.antes, r.origenAntes], [true, true, P074_PLAN_G, 'general'], 'fila nueva, antes = la general');
  PRUEBAS.igual(api.__planes().length, 2, 'la general sigue y hay una propia nueva');
  PRUEBAS.igual(JSON.parse(api.__bit()[0][12]).detalle.origenAntes, 'general', 'y la bitácora lo dice');
  const hojas2 = p074Hojas();
  hojas2['Config Empresa'] = [['Empresa', 'Clave', 'Valor']];
  const api2 = p074Api(hojas2);
  const r2 = api2.__guardar(P074_SUP, P074_PLAN_B);
  PRUEBAS.igual([r2.ok, r2.antes, r2.origenAntes], [true, null, 'ninguno'], 'sin ninguna: antes null, origen «ninguno»');
  PRUEBAS.igual(JSON.parse(api2.__bit()[0][12]).detalle.origenAntes, 'ninguno', 'y la bitácora lo dice');
});

PRUEBAS.caso('P074 · con dos filas generales el «antes» es la ÚLTIMA, exactamente lo que resuelve leerConfigEmpresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p074Hojas();
  hojas['Config Empresa'] = [['Empresa', 'Clave', 'Valor'], ['', 'cicloPlan', JSON.stringify(P074_PLAN_G)], ['', 'cicloPlan', JSON.stringify(P074_PLAN_B)]];
  const api = p074Api(hojas);
  const lector = api.leerConfigEmpresa('Consorcio HELITEC').cicloPlan;
  PRUEBAS.igual(lector, P074_PLAN_B, 'guarda: el lector toma la última general');
  const r = api.__guardar(P074_SUP, P074_PLAN_A);
  PRUEBAS.igual(r.antes, lector, '🔴 el «antes» registrado es el mismo que resolvía el lector (verificador P074: tomaba la primera)');
});

PRUEBAS.caso('🔴 P074 · Dirección y el servicio médico NO cambian las horas de la empresa; la clave combinada y el admin sí', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api();
  const dir = api.__guardar(P074_DIR, P074_PLAN_B);
  PRUEBAS.igual([dir.ok, dir.motivo], [false, 'solo_lectura'], '🔴 Dirección (ClaveHseq): solo_lectura');
  const med = api.__guardar(P074_MED, P074_PLAN_B);
  PRUEBAS.igual([med.ok, med.motivo], [false, 'solo_lectura'], '🔴 servicio médico con clave propia: solo_lectura');
  PRUEBAS.igual(JSON.parse(api.__planes().find(f => String(f[0]) !== '')[2]), P074_PLAN_A, 'y la hoja no cambió');
  PRUEBAS.igual(api.__bit().length, 0, 'ni hay línea de bitácora (no pasó nada)');
  const comb = api.__guardar(P074_COMB, P074_PLAN_B);
  PRUEBAS.igual(comb.ok, true, 'la clave combinada (única de la empresa) ES la del supervisor: escribe');
  const adm = api.__guardar(P074_ADM, P074_PLAN_A);
  PRUEBAS.igual(adm.ok, true, 'el admin sin visor escribe para la empresa que mira');
  const bit = api.__bit();
  PRUEBAS.igual(bit.map(f => String(f[5])), ['supervisor', 'admin'], 'Rol: combinada como supervisor, admin como admin');
  PRUEBAS.igual(String(bit[1][4]), '*', 'el actor del admin es su cuenta');
  PRUEBAS.igual(JSON.parse(bit[1][12]).detalle.antes, P074_PLAN_B, 'y su «antes» es lo que la combinada acababa de guardar (sale de la hoja, no del cliente)');
  /* el visor del admin sigue sin escribir */
  const vis = api.__guardar(Object.assign({}, P074_ADM, { verEmpresa: 'Consorcio HELITEC', verVista: 'supervisor' }), P074_PLAN_B);
  PRUEBAS.igual([vis.ok, vis.motivo], [false, 'solo_lectura'], 'el visor (P185) sigue en solo lectura');
  /* y el admin con una empresa inventada no crea una fila fantasma */
  const inv = api.__guardar(Object.assign({}, P074_ADM, { empresa: '' }), P074_PLAN_B);
  PRUEBAS.igual([inv.ok, inv.motivo], [false, 'sin_empresa'], 'admin sin empresa: sin_empresa');
  const typo = api.__guardar(Object.assign({}, P074_ADM, { empresa: 'Helitek S.A.' }), P074_PLAN_B);
  PRUEBAS.igual([typo.ok, typo.motivo], [false, 'sin_empresa'], '🔴 admin con una empresa sin cuenta en Accesos: sin_empresa (antes creaba la fila)');
  PRUEBAS.igual(api.__planes().filter(f => /helitek/i.test(String(f[0]))).length, 0, 'y no quedó ninguna fila para el typo');
  const porAlias = api.__guardar(Object.assign({}, P074_ADM, { empresa: 'Helitec' }), P074_PLAN_G);
  PRUEBAS.igual([porAlias.ok, api.__planes().filter(f => String(f[0]) !== '').length], [true, 1], 'y por el alias «Helitec» escribe en la MISMA fila propia');
});

PRUEBAS.caso('P074 · guardar lo MISMO no reescribe ni registra; guardar otra vez registra el «antes» real', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api();
  const r0 = api.__guardar(P074_SUP, P074_PLAN_A);
  PRUEBAS.igual([r0.ok, r0.sinCambio], [true, true], 'el plan vigente, otra vez: sinCambio');
  PRUEBAS.igual(api.__bit().length, 0, 'sin línea de bitácora: guardar lo mismo no es un hecho');
  api.__guardar(P074_SUP, P074_PLAN_B);
  const r2 = api.__guardar(P074_SUP, P074_PLAN_G);
  PRUEBAS.igual(r2.antes, P074_PLAN_B, 'el tercero registra como «antes» el segundo');
  PRUEBAS.igual(api.__bit().length, 2, 'dos hechos, dos líneas');
  PRUEBAS.igual(api.__planes().length, 2, 'y sigue habiendo UNA fila propia');
});

PRUEBAS.caso('P074 · sin candado no se escribe nada (ni la hoja ni la bitácora)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api(null, false);
  const r = api.__guardar(P074_SUP, P074_PLAN_B);
  PRUEBAS.igual([r.ok, r.motivo], [false, 'ocupado'], 'contesta ocupado');
  PRUEBAS.igual(JSON.parse(api.__planes().find(f => String(f[0]) !== '')[2]), P074_PLAN_A, 'la hoja no cambió');
  PRUEBAS.igual(api.__bit().length, 0, 'y no hay línea');
});

PRUEBAS.caso('P074 · bitacoraServidor SIN `quien` sigue escribiendo sistema/sistema/endpoint (los diez llamadores viejos no cambian)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api();
  api.bitacoraServidor('Consorcio HELITEC', 'nomina_sync', 'Ana Suárez', { cambio: 'alta' });
  api.bitacoraServidor('Consorcio HELITEC', 'ciclo_plan_guardado', 'Consorcio HELITEC', {}, { actor: 'helitec', rol: 'supervisor', origen: 'app' });
  const bit = api.__bit();
  PRUEBAS.igual(bit.map(f => [String(f[4]), String(f[5]), String(f[6])]), [['sistema', 'sistema', 'endpoint'], ['helitec', 'supervisor', 'app']],
    'sin quien: sistema; con quien: la persona');
  PRUEBAS.igual(JSON.parse(bit[0][12]).actor, 'sistema', 'y el JSON de la vieja dice sistema');
});

/* ── CLIENTE ──────────────────────────────────────────────────────────────────────────────── */

const P074C_HOY = new Date().toISOString().slice(0, 10);
/* Entra al panel como supervisor de HELITEC con el plan A vigente y un perfil en el dispositivo.
   Devuelve una función que restaura todo. El editor se pinta con el generador REAL en un
   contenedor propio (el panel no está montado en la suite). */
function p074cEntrar(extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage), prevAbierto = CICLO_CFG_ABIERTO;
  setProfile({ nombre: 'Marta Supervisora', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Supervisora' });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: {}, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P074C_HOY }],
    comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [], marca: null, duty: null, ausencias: {},
    config: { cicloPlan: Object.assign({}, P074_PLAN_A) }, visor: null, visorError: null
  }, extra || {});
  /* ⚠️ SIN RED mientras se entra: con credenciales puestas, `onDashData` dispara `gestCanSync()` →
     niveles, reportes, opiniones y casos contra el ENDPOINT REAL, que rechaza la contraseña falsa y
     suma al freno de fuerza bruta de esa cuenta (verificador P074). El usuario, además, es uno que
     no existe en producción. */
  const oFetch = window.fetch, oReloj = window.fetchConReloj;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p074', empresa: 'Consorcio HELITEC', pass: 'sup-074', dispositivoId: 'p074c' }, 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  CICLO_CFG_ABIERTO = true;
  const cont = document.createElement('div'); cont.id = 'p074cEditor';
  cont.innerHTML = cicloCfgHtml(cicloPlanEmpresaCompleto());
  document.body.appendChild(cont);
  return function restaurar(){
    cont.remove();
    CICLO_CFG_ABIERTO = prevAbierto;
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  };
}
function p074cPoner(plan){ Object.keys(plan).forEach(k => { const el = document.getElementById('cicCfg_' + k); if (el) el.value = plan[k]; }); }

PRUEBAS.caso('🔴 P074 · R8 · guardar las horas de la empresa pide confirmación mostrando «de X a Y», con háptico, y manda `quien`', async () => {
  const fin = p074cEntrar();
  const oC = window.confirm, oR = window.dashRequest, oH = window.haptic, oT = window.showToast;
  let pregunta = null, pedido = null, hapticos = 0, toasts = [];
  let responder = false;
  window.confirm = m => { pregunta = String(m); return responder; };
  window.dashRequest = params => { pedido = params; return Promise.resolve({ ok: true, actualizado: true, plan: P074_PLAN_B, antes: P074_PLAN_A, origenAntes: 'propia', bitacora: 'srv_1' }); };
  window.haptic = () => { hapticos++; };
  window.showToast = m => { toasts.push(String(m)); };
  const btn = document.querySelector('#p074cEditor .cic-cfg-ok');
  try {
    PRUEBAS.cierto(!!btn, 'guarda de medibilidad: el editor real está pintado');
    PRUEBAS.igual(Number(document.getElementById('cicCfg_jornada').value), 720, 'y trae el plan de la EMPRESA (12 h)');
    p074cPoner(P074_PLAN_B);
    /* (a) no confirma → no manda */
    cicloCfgGuardar(btn);
    PRUEBAS.cierto(!!pregunta, '🔴 preguntó antes de mandar');
    PRUEBAS.igual(pedido, null, '🔴 sin confirmar, no sale nada');
    PRUEBAS.igual(hapticos, 0, 'ni háptico');
    PRUEBAS.cierto(/1 h 00 min → 1 h 30 min/.test(pregunta) && /12 h 00 min → 10 h 00 min/.test(pregunta),
      '🔴 la pregunta muestra de qué a qué (traslado 1 h → 1 h 30, jornada 12 h → 10 h) · decía «' + pregunta.slice(0, 160) + '»');
    PRUEBAS.igual((pregunta.match(/→/g) || []).length, 2, 'sólo los dos tramos que cambian llevan flecha (regreso y descanso no cambiaron)');
    /* (b) confirma → manda con quien y el plan */
    responder = true; pregunta = null;
    cicloCfgGuardar(btn);
    PRUEBAS.cierto(!!pedido, '🔴 confirmado: el pedido salió');
    PRUEBAS.igual(pedido && pedido.action, 'ciclo_config_guardar', 'la acción');
    PRUEBAS.igual(pedido && JSON.parse(pedido.plan), P074_PLAN_B, 'con el plan tecleado');
    PRUEBAS.igual(pedido && pedido.quien, 'Marta Supervisora', '🔴 y con el nombre del perfil de quien tocó');
    PRUEBAS.igual(pedido && pedido.usuario, 'usuario-p074', 'y la cuenta (dashAuth)');
    PRUEBAS.igual(hapticos, 1, 'háptico al confirmar (R8)');
    await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
    PRUEBAS.igual(toasts[toasts.length - 1], t('ts_ciclo_guardado'), 'y avisa que guardó');
    PRUEBAS.igual(DASH._cfg.cicloPlan, P074_PLAN_B, 'el panel queda con lo que confirmó el servidor');
  } finally { window.confirm = oC; window.dashRequest = oR; window.haptic = oH; window.showToast = oT; fin(); }
});

PRUEBAS.caso('🔴 P074 · «sin cambios» lo decide el SERVIDOR, no el panel: se pregunta y se manda igual; y si guardó sin bitácora, lo dice', async () => {
  /* El «vigente» del panel puede ser viejo (otro supervisor guardó entre medio) o de otra empresa
     (`K_CICLO_PLAN` del perfil del dispositivo). Un toque que quería FIJAR estos números no puede
     perderse en silencio por una comparación local (verificador P074). */
  const fin = p074cEntrar();
  const oC = window.confirm, oR = window.dashRequest, oT = window.showToast;
  let preguntas = [], pedidos = 0, toasts = [], respuesta = { ok: true, sinCambio: true, plan: P074_PLAN_A, antes: P074_PLAN_A, origenAntes: 'propia' };
  window.confirm = m => { preguntas.push(String(m)); return true; };
  window.dashRequest = () => { pedidos++; return Promise.resolve(respuesta); };
  window.showToast = m => { toasts.push(String(m)); };
  const btn = document.querySelector('#p074cEditor .cic-cfg-ok');
  try {
    p074cPoner(P074_PLAN_A);   // lo mismo que el panel cree vigente
    cicloCfgGuardar(btn);
    PRUEBAS.igual([preguntas.length, pedidos], [1, 1], '🔴 pregunta y manda aunque el panel no vea cambios');
    PRUEBAS.cierto(preguntas[0].indexOf(t('cic_cfg_conf_igual')) >= 0, 'y la pregunta dice que este panel no ve cambios · «' + preguntas[0].slice(0, 120) + '»');
    await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
    PRUEBAS.igual(toasts[0], t('ts_ciclo_sin_cambio'), 'el servidor dijo sinCambio → «quedan como estaban»');
    CICLO_CFG_ABIERTO = true;
    document.getElementById('p074cEditor').innerHTML = cicloCfgHtml(cicloPlanEmpresaCompleto());
    p074cPoner(P074_PLAN_B);
    respuesta = { ok: true, actualizado: true, plan: P074_PLAN_B, antes: P074_PLAN_A, origenAntes: 'propia', bitacora: null };
    cicloCfgGuardar(document.querySelector('#p074cEditor .cic-cfg-ok'));
    await PRUEBAS.esperarA(() => toasts.length > 1, 3000);
    PRUEBAS.igual(toasts[1], t('ts_ciclo_guardado_sin_bitacora'), 'bitacora:null → avisa que el registro no se escribió');
  } finally { window.confirm = oC; window.dashRequest = oR; window.showToast = oT; fin(); }
});

PRUEBAS.caso('P074 · el editor de la EMPRESA no muestra la jornada propia del dueño del dispositivo', () => {
  /* `cicloPlan()` sin persona cae en `K_CICLO_PLAN_PROPIO` (la jornada propia que `tareas_mias`
     deja en el teléfono) antes que en la de la empresa: un supervisor con jornada propia veía la
     suya en el editor de la empresa. */
  const fin = p074cEntrar();
  try {
    localStorage.setItem(K_CICLO_PLAN_PROPIO, JSON.stringify({ traslado: 30, jornada: 300, regreso: 30, descanso: 900 }));
    PRUEBAS.igual(cicloPlan().jornada, 300, 'guarda: cicloPlan() sin persona SÍ devuelve la propia (es lo que usaba el editor)');
    PRUEBAS.igual(cicloPlanEmpresaCompleto().jornada, 720, '🔴 cicloPlanEmpresaCompleto devuelve la de la empresa');
    /* el camino real: el render entero del panel, con el editor abierto */
    CICLO_CFG_ABIERTO = true;
    const html = renderCicloOperativo();
    PRUEBAS.cierto(/id="cicCfg_jornada" value="720"/.test(html), '🔴 renderCicloOperativo pinta el editor con la jornada de la EMPRESA (12 h), no la propia (5 h)');
    PRUEBAS.falso(/id="cicCfg_jornada" value="300"/.test(html), 'discriminador: la propia no aparece');
  } finally { fin(); }
});

/* ── CONTRATO ─────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 CONTRATO P074 · la línea que escribe el .gs REAL se etiqueta y Trazabilidad muestra el «de → a»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p074Api();
  api.__guardar(P074_SUP, P074_PLAN_B);
  const ev = JSON.parse(api.__bit()[0][12]);
  PRUEBAS.cierto(accionLabel(ev.accion) !== ev.accion, '🔴 la acción tiene etiqueta (no sale la clave cruda) · ' + accionLabel(ev.accion));
  const cambio = bitCambioDe(ev);
  PRUEBAS.cierto(/1 h 00 min → 1 h 30 min/.test(cambio) && /12 h 00 min → 10 h 00 min/.test(cambio), '🔴 el «de → a» sale del JSON real · ' + cambio);
  PRUEBAS.igual((cambio.match(/→/g) || []).length, 2, 'sólo los dos tramos que cambiaron llevan flecha');
  /* y en la pantalla de Dirección, por el render real, con el evento en el store del panel */
  const fin = p074cEntrar({ vista: 'hseq' });
  try {
    const s = bitStore(); s.items.unshift(ev); bitSaveStore(s);
    const html = renderHseqAuditoria();
    PRUEBAS.cierto(html.indexOf(esc(accionLabel('ciclo_plan_guardado'))) >= 0, 'Trazabilidad muestra la etiqueta');
    PRUEBAS.cierto(html.indexOf('1 h 30 min') >= 0 && html.indexOf('10 h 00 min') >= 0, '🔴 y el cambio');
    PRUEBAS.cierto(html.indexOf('Marta Supervisora') >= 0, 'y quién lo tocó');
    PRUEBAS.cierto(html.indexOf('helitec') >= 0, 'y con qué cuenta (la del .gs: helitec)');
  } finally { fin(); }
});

PRUEBAS.caso('⚠️ CONTRATO P074 · TODA acción que el .gs escribe con bitacoraServidor tiene etiqueta en el cliente, en los dos idiomas (pregunta sobre el texto, a propósito)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const acciones = [...new Set([...CTX.gs.matchAll(/bitacoraServidor\([^,]+,\s*"([a-z_]+)"/g)].map(m => m[1]))];
  PRUEBAS.alMenos(acciones.length, 8, 'guarda de medibilidad: el .gs escribe varias acciones · ' + acciones.join(', '));
  const sinEtiqueta = acciones.filter(a => !HSEQ_ACCION_LABEL[a]);
  PRUEBAS.igual(sinEtiqueta, [], '⚠️ todas tienen etiqueta en HSEQ_ACCION_LABEL');
  const sinTexto = acciones.filter(a => HSEQ_ACCION_LABEL[a]).filter(a =>
    _i18nBuscar('es', 'generico', HSEQ_ACCION_LABEL[a]) == null || _i18nBuscar('en', 'generico', HSEQ_ACCION_LABEL[a]) == null);
  PRUEBAS.igual(sinTexto, [], '⚠️ y la clave existe en es y en');
});
