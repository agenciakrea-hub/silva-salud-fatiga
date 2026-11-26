PRUEBAS.grupo('P394b · la app pide crear la contraseña al abrir');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P394b · LA APP PIDE LA CONTRASEÑA (F098; ADR 023). Los casos del servidor están en `p394b-la-contrasena-se-exige.js`.

   Decisiones de Franco (panel del 2026-11-25): «Pedirla al abrir, con plazo», «14 días», «No pedir el código» y «Cada vez que
   abre la app». Lo que tiene que pasar en la app:
   · la sincronización (`misSincronizar`, el camino real del arranque) recibe `clave: { falta, exigidaDesde }` y abre la hoja de
     crear la contraseña, con la fecha y sin el campo del código; «Más tarde» la cierra hasta la próxima apertura;
   · pasada la fecha, `crear_clave`: abre la hoja con otra explicación y no toca lo que el teléfono ya tiene;
   · sin señal, encima de otra ventana o con la sesión de ESTA persona, no se abre;
   · al crearla desde ahí, entra con ella en el acto (sin volver a pedirla en el login).
   Cada caso entra por `misSincronizar` con el `fetchConReloj` simulado (R17) y restaura DESPUÉS de esperar la promesa (R18; la
   nota de `a3ConRespuesta` cuenta por qué un `try/finally` sin esperar no sirve). Cada uno tiene su discriminador.
   ⚠️ EL REPO ES PÚBLICO: nombres y cédulas inventados.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P394B_APP = { nombre: 'Rosa Mena', cedula: '12345678', empresa: 'Helitec' };
const P394B_APP_OK = (extra) => Object.assign({ ok: true, registros: [], pvt: [], referencia: {}, metricas: [] }, extra || {});
const P394B_APP_FALTA = { falta: true, exigidaDesde: '2026-12-09' };

/* Estado conocido. `CTX.resetear` cierra los `.overlay` pero no las `.ios-modal` ni las marcas de la apertura, que son de este
   prompt: sin esto, el caso que sigue a uno que la abrió no la vería abrirse. */
function p394bAppPreparar(perfil) {
  CTX.resetear(Object.assign({}, P394B_APP, perfil || {}));
  document.querySelectorAll('.ios-modal.show').forEach(o => o.classList.remove('show'));
  try { _clvPedidaApertura = false; CLV_MODO_PEDIR = ''; _clvPedirF = null; ALTA_EN_CURSO = false; } catch (e) {}
  try { _misCedulaPedida = false; _misCedulaIntentos = 0; _misSincronizando = false; _misSincEnVuelo = null; } catch (e) {}
  try { syncScrollLock(); } catch (e) {}
}
const p394bClaveAbierta = () => document.getElementById('claveOv').classList.contains('show');
const p394bLead = () => (document.getElementById('clvLead') || {}).textContent || '';

/* Una sincronización por el camino real, con la respuesta del servidor que se le pase (o una función que la arme por pedido).
   Devuelve lo que la app mandó. */
async function p394bSincronizar(respuesta) {
  const prevFetch = window.fetchConReloj;
  const pedidos = [];
  try {
    window.fetchConReloj = (url, opc) => {
      const body = (opc && opc.body) ? JSON.parse(opc.body) : null;
      pedidos.push({ url: String(url), body });
      const r = typeof respuesta === 'function' ? respuesta(String(url), body) : respuesta;
      return Promise.resolve({ json: () => Promise.resolve(r) });
    };
    await misSincronizar();
  } finally {
    window.fetchConReloj = prevFetch;
    try { _misSincronizando = false; _misSincEnVuelo = null; } catch (e) {}
  }
  return pedidos;
}
/* Cierra la hoja por el camino de la persona (consume su entrada del historial: la suite tiene un tope de 50). */
function p394bCerrar() {
  try {
    if (!p394bClaveAbierta()) return;
    if (CLV_MODO_PEDIR) clvPosponer();
    else { document.getElementById('claveOv').classList.remove('show'); syncScrollLock(); }
  } catch (e) {}
}
const p394bEsperar = async (cond, ms) => { const fin = Date.now() + (ms || 2000); while (!cond() && Date.now() < fin) await new Promise(r => setTimeout(r, 20)); return cond(); };

PRUEBAS.caso('🔒 P394b · al sincronizar, a quien le falta la contraseña se le pide crearla, con la fecha y sin el código', async () => {
  /* Lo concede `clvPedirSiFalta` (llamada desde `misSincronizar` con lo que dijo el servidor). */
  p394bAppPreparar();
  try {
    /* La empresa PIDE el código (como Silva y HELITEC, medido con `empresa_perfil` el 2026-11-25): sin esto, el campo estaría
       escondido de todos modos y el aserto de abajo no diría nada. */
    localStorage.setItem(K_EMPRESA_PERFIL, JSON.stringify({ empresa: P394B_APP.empresa, pideCodigo: true }));
    const pedidos = await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.cierto(pedidos.length >= 1 && /action=empleado/.test(pedidos[0].url), 'precondición · la app le preguntó a `empleado`');
    PRUEBAS.cierto(p394bClaveAbierta(), '🔒 con `clave.falta`, la hoja de crear la contraseña se abre sola');
    PRUEBAS.igual(CLV_MODO_PEDIR, 'pedir', 'y es el aviso de cada apertura, no el paso del alta');
    PRUEBAS.cierto(p394bLead().indexOf('9 de diciembre') >= 0, 'dice desde cuándo la va a necesitar: «' + p394bLead() + '»');
    PRUEBAS.cierto(document.getElementById('clvCodigoCampo').hidden, 'sin el campo del código (decisión de Franco: «No pedir el código»)');
    PRUEBAS.cierto(!!clvFaltaDe(P394B_APP.cedula), 'y queda anotado para la próxima apertura');
  } finally { p394bCerrar(); }
  /* DISCRIMINADOR · la misma sincronización sin `clave`: no se abre nada y la marca se borra. */
  p394bAppPreparar();
  try {
    try { clvFaltaRecordar(P394B_APP_FALTA, P394B_APP.cedula); } catch (e) {}
    await p394bSincronizar(P394B_APP_OK());
    PRUEBAS.falso(p394bClaveAbierta(), 'DISCRIMINADOR · sin `clave` en la respuesta, no se pide nada');
    PRUEBAS.igual(clvFaltaDe(P394B_APP.cedula), null, 'DISCRIMINADOR · y la marca vieja se borra: el servidor es el que sabe');
  } finally { p394bCerrar(); }
});

PRUEBAS.caso('P394b · «Más tarde» la cierra, no vuelve en la misma apertura, y sí al volver a la app después de un rato', async () => {
  /* «Cada vez que abre la app»: en una PWA, volver del fondo sin recargar también es abrirla. Lo concede el `visibilitychange` de
     P394b (`CLV_APERTURA_MIN`), que le vuelve a preguntar al servidor. Se despacha el evento de verdad (como `p174b`): la pestaña
     de la suite está oculta para siempre, así que `document.hidden` se reemplaza mientras dura el caso. */
  p394bAppPreparar();
  const html = document.documentElement, teniaSinAnim = html.classList.contains('sin-animaciones');
  let oculto = true;
  const prevSync = window.misSincronizar;
  let syncs = [];
  try {
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.cierto(p394bClaveAbierta(), 'precondición · se abrió');
    document.getElementById('clvLuego').click();
    PRUEBAS.falso(p394bClaveAbierta(), '«Más tarde» la cierra');
    PRUEBAS.igual(CLV_MODO_PEDIR, '', 'y sale del modo del aviso');
    PRUEBAS.igual(document.querySelectorAll('.overlay.show').length, 0, 'y no abre el paso siguiente de un alta que terminó hace meses');
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.falso(p394bClaveAbierta(), 'otra sincronización en la misma apertura no la vuelve a abrir');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculto });
    window.misSincronizar = function () { const pr = prevSync.apply(this, arguments); syncs.push(pr); return pr; };
    const prevFetch = window.fetchConReloj;
    try {
      window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(P394B_APP_OK({ clave: P394B_APP_FALTA })) });
      /* DISCRIMINADOR · cinco minutos en el fondo no son otra apertura. */
      oculto = true; document.dispatchEvent(new Event('visibilitychange'));
      _clvOcultaDesde = Date.now() - 5 * 60000;
      oculto = false; document.dispatchEvent(new Event('visibilitychange'));
      await Promise.all(syncs);
      PRUEBAS.igual([syncs.length, p394bClaveAbierta()], [0, false], 'DISCRIMINADOR · volver a los 5 minutos no pregunta ni la abre');
      /* Once minutos: sí. */
      oculto = true; document.dispatchEvent(new Event('visibilitychange'));
      _clvOcultaDesde = Date.now() - 11 * 60000;
      oculto = false; document.dispatchEvent(new Event('visibilitychange'));
      await Promise.all(syncs);
      PRUEBAS.igual(syncs.length, 1, 'volver a los 11 minutos le vuelve a preguntar al servidor (no a la marca guardada: R21)');
      PRUEBAS.cierto(p394bClaveAbierta(), 'y la vuelve a pedir: «Cada vez que abre la app»');
    } finally { window.fetchConReloj = prevFetch; try { _misSincronizando = false; _misSincEnVuelo = null; } catch (e) {} }
  } finally {
    window.misSincronizar = prevSync;
    delete document.hidden;
    try { cicloTickStop(); } catch (e) {}
    if (teniaSinAnim) html.classList.add('sin-animaciones');
    p394bCerrar();
  }
});

PRUEBAS.caso('🔒 P394b · pasada la fecha, la app abre la hoja, dice por qué no trae datos y no borra lo del teléfono', async () => {
  /* `crear_clave` lo atiende `misSincronizar` ANTES del `return false` que protege lo local (A3). */
  p394bAppPreparar();
  const local = { registros: [{ fecha: '2026-11-20', hora: '10:41', kss: 6 }], pvt: [], ref: null, metrics: MIS_METRICAS_DEF, actualizado: 1234 };
  try {
    misDatosSave(local);
    await p394bSincronizar({ ok: false, motivo: 'crear_clave', exigidaDesde: '2026-11-25', error: 'Para ver tus resultados necesitas crear tu contraseña.' });
    PRUEBAS.cierto(p394bClaveAbierta(), '🔒 con `crear_clave` se abre la hoja de crearla');
    PRUEBAS.igual([CLV_MODO_PEDIR, p394bLead()], ['exigida', t('clv_exigida_lead')], 'y explica que la necesita para ver sus resultados');
    PRUEBAS.igual([misDatos().registros.length, misDatos().actualizado], [1, 1234], 'lo que el teléfono ya tenía queda como estaba');
    PRUEBAS.igual(document.getElementById('miClaveDs').textContent, t('mi_clave_d_falta'), '«Mi contraseña», en «Más», dice que falta');
  } finally { p394bCerrar(); }
  /* DISCRIMINADOR · un fallo cualquiera (sin motivo) no abre nada ni cambia «Mi contraseña». */
  p394bAppPreparar();
  try {
    await p394bSincronizar({ ok: false, error: 'Sin conexión' });
    PRUEBAS.falso(p394bClaveAbierta(), 'DISCRIMINADOR · un fallo de red no la abre');
    try { miClavePintar(); } catch (e) {}
    PRUEBAS.igual(document.getElementById('miClaveDs').textContent, t('mi_clave_d'), 'DISCRIMINADOR · y «Mi contraseña» dice lo de siempre');
  } finally { p394bCerrar(); }
});

PRUEBAS.caso('P394b · sin señal no se pide (R7), ni encima de otra ventana', async () => {
  p394bAppPreparar();
  const prevOff = window.offHayConexion;
  try {
    window.offHayConexion = () => false;
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.falso(p394bClaveAbierta(), 'sin conexión no se abre: crearla necesita el servidor');
  } finally { window.offHayConexion = prevOff; try { offPintar(); } catch (e) {} p394bCerrar(); }
  p394bAppPreparar();
  const test = document.getElementById('testOverlay');
  try {
    test.classList.add('show');   // la persona abrió la app para hacer el test: la respuesta llega con el cuestionario abierto
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.falso(p394bClaveAbierta(), 'con el cuestionario abierto no se le apila encima');
    /* ⚠️ VERIFICADOR DE P394b, HALLAZGO 3 · y al cerrarlo se pide, SIN otra sincronización: en la app no hay otra. La primera versión
       de este caso llamaba a mano a una segunda sincronización y por eso pasaba (R17). Se cierra por el camino real, `cerrarTest`,
       que no pasa por `syncScrollLock`. Lo concede `clvPedirEsperar`. */
    cerrarTest();
    await p394bEsperar(() => p394bClaveAbierta(), 3500);
    PRUEBAS.cierto(p394bClaveAbierta(), '🔒 cerrado el cuestionario, se pide sola (sin otra sincronización)');
  } finally { test.classList.remove('show'); p394bCerrar(); try { clearInterval(_clvPedirEspera); _clvPedirEspera = 0; } catch (e) {} }
});

PRUEBAS.caso('P394b · con la sesión de ESTA persona no se pide; con la de otra persona guardada en el teléfono, sí', async () => {
  /* `clvPedirSiFalta` mira `sesPersonaToken(p)`, que compara la cédula (P166). La primera versión miraba `sesPersonaGuardada()`:
     en un teléfono compartido, la sesión de otra persona le escondía el aviso a la nueva. */
  p394bAppPreparar();
  try {
    localStorage.setItem(K_SES_PERSONA, JSON.stringify({ cedula: P394B_APP.cedula, token: 'tok-p394b-propia' }));
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.falso(p394bClaveAbierta(), 'con su sesión abierta, ya la tiene: no se le pide');
  } finally { p394bCerrar(); }
  p394bAppPreparar();
  try {
    localStorage.setItem(K_SES_PERSONA, JSON.stringify({ cedula: '99999999', token: 'tok-p394b-ajena' }));
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.cierto(p394bClaveAbierta(), 'DISCRIMINADOR · con la sesión de OTRA cédula guardada, a ésta sí se le pide');
  } finally { p394bCerrar(); }
});

PRUEBAS.caso('🔒 P394b · al crearla desde el aviso entra con ella en el acto, manda su nombre y la marca se borra', async () => {
  /* `clvGuardar` en modo aviso → `clvEntrarConClaveRecien` (P173). Sin eso, la sincronización siguiente recibía `necesita_clave`
     y abría el login: a quien acababa de crearla se le pedía escribirla otra vez. El nombre viaja porque el servidor, sin el
     código, exige el de esa persona (`accionCredencialCrear`, P394b). */
  const respuestas = (crear) => (url, body) => {
    if (body && body.action === 'credencial_crear') return crear;
    if (body && body.action === 'login') return { ok: true, sesion: 'tok-p394b-nueva', persona: { cedula: P394B_APP.cedula } };
    return { ok: false };
  };
  const llenar = () => { ['clvPass', 'clvPass2'].forEach(id => { const el = document.getElementById(id); el.value = 'Prueba-394b'; el.dispatchEvent(new Event('input')); }); };
  const prevFetch = window.fetchConReloj;
  p394bAppPreparar();
  try {
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.cierto(p394bClaveAbierta(), 'precondición · el aviso está abierto');
    llenar();
    const pedidos = [];
    window.fetchConReloj = (url, opc) => {
      const body = (opc && opc.body) ? JSON.parse(opc.body) : null; pedidos.push(body);
      return Promise.resolve({ json: () => Promise.resolve(respuestas({ ok: true })(String(url), body)) });
    };
    clvGuardar(document.getElementById('clvBtn'));
    await p394bEsperar(() => pedidos.some(b => b && b.action === 'login') && !p394bClaveAbierta());
    const crear = pedidos.filter(b => b && b.action === 'credencial_crear')[0] || {};
    const login = pedidos.filter(b => b && b.action === 'login')[0] || {};
    PRUEBAS.igual([crear.usuario, crear.cedula], [P394B_APP.nombre, P394B_APP.cedula], 'pide crearla con su nombre y su cédula');
    PRUEBAS.igual(login.pass, 'Prueba-394b', '🔒 y entra con la que acaba de escribir');
    PRUEBAS.falso(p394bClaveAbierta(), 'la hoja se cierra');
    PRUEBAS.igual((JSON.parse(localStorage.getItem(K_SES_PERSONA)) || {}).token, 'tok-p394b-nueva', 'queda con su sesión en este teléfono');
    PRUEBAS.igual([clvFaltaDe(P394B_APP.cedula), CLV_MODO_PEDIR], [null, ''], 'y la marca se borra');
  } finally { window.fetchConReloj = prevFetch; p394bCerrar(); try { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); syncScrollLock(); } catch (e) {} }
  /* DISCRIMINADOR · si el servidor no la crea, no hay login, la marca sigue y la persona ve el motivo. */
  p394bAppPreparar();
  try {
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    llenar();
    const pedidos = [];
    window.fetchConReloj = (url, opc) => {
      const body = (opc && opc.body) ? JSON.parse(opc.body) : null; pedidos.push(body);
      return Promise.resolve({ json: () => Promise.resolve(respuestas({ ok: false, motivo: 'no_esta', error: 'Tu cédula no está en la nómina de tu empresa.' })(String(url), body)) });
    };
    clvGuardar(document.getElementById('clvBtn'));
    await p394bEsperar(() => !!document.getElementById('clvErr').textContent);
    PRUEBAS.igual(pedidos.filter(b => b && b.action === 'login').length, 0, 'DISCRIMINADOR · sin `ok`, no intenta entrar');
    PRUEBAS.cierto(p394bClaveAbierta() && !!clvFaltaDe(P394B_APP.cedula), 'DISCRIMINADOR · la hoja sigue abierta y la marca también');
  } finally { window.fetchConReloj = prevFetch; p394bCerrar(); }
});

PRUEBAS.caso('P394b · cambiar de idioma con el aviso abierto no lo devuelve al texto del alta', async () => {
  /* `aplicarIdioma` repinta la hoja con `clvPintarModo(CLV_MODO)`, que en el modo del aviso pone la bajada con la fecha. */
  p394bAppPreparar();
  const idioma = idiomaActual();
  try {
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    fijarIdioma('en');
    PRUEBAS.cierto(p394bLead().indexOf('December 9') >= 0, 'en inglés dice la fecha en inglés: «' + p394bLead() + '»');
    fijarIdioma('es');
    PRUEBAS.cierto(p394bLead().indexOf('9 de diciembre') >= 0, 'y de vuelta en español, igual');
    /* DISCRIMINADOR · fuera del modo del aviso, la misma hoja vuelve a la bajada del alta. */
    CLV_MODO_PEDIR = '';
    fijarIdioma('es');
    PRUEBAS.igual(p394bLead(), t('clv_lead'), 'DISCRIMINADOR · sin el modo del aviso, la bajada es la del alta');
    CLV_MODO_PEDIR = 'pedir';
  } finally { fijarIdioma(idioma); p394bCerrar(); }
});

PRUEBAS.caso('P394b · el nombre del alta por nómina es de sólo lectura; en el alta a mano se escribe', () => {
  /* Lo fija `setupNombreFijar`, que llama `openSetup` con el mismo criterio que `setupModoFaltantes` (perfil con nombre, cédula y
     empresa: vino de la nómina). ADR 021, actualización del 2026-11-12: el CH guarda el de la nómina aunque se escriba otro. */
  p394bAppPreparar();
  try {
    openSetup(false);
    const inp = document.getElementById('inName'), nota = document.getElementById('inNameNota');
    PRUEBAS.cierto(inp.readOnly, 'con el perfil de la nómina, el nombre no se edita');
    PRUEBAS.cierto(!!nota && !nota.hidden && nota.textContent === t('f_nombre_fijo'), 'y dice por qué, y a quién avisarle');
  } finally { try { document.getElementById('setup').classList.remove('show'); syncScrollLock(); } catch (e) {} }
  /* DISCRIMINADOR · el alta a mano (sin cédula de la nómina) sigue escribiéndose. */
  p394bAppPreparar({ nombre: '', cedula: '', empresa: '' });
  try {
    try { localStorage.removeItem(K_PROFILE); } catch (e) {}
    openSetup(false);
    const inp = document.getElementById('inName'), nota = document.getElementById('inNameNota');
    PRUEBAS.falso(inp.readOnly, 'DISCRIMINADOR · en el alta a mano el nombre se escribe');
    PRUEBAS.cierto(!nota || nota.hidden, 'DISCRIMINADOR · y sin la nota');
  } finally { try { document.getElementById('setup').classList.remove('show'); syncScrollLock(); } catch (e) {} }
});

PRUEBAS.caso('P394b · si la hoja la abre otro camino (el alta, «Mi contraseña»), deja de ser el aviso', async () => {
  /* En el alta, esta hoja es un PASO: «Más tarde» encadena el siguiente (`altaEncadenar`). Si el modo del aviso quedaba puesto
     (el aviso terminó por un camino que no lo apaga), «Más tarde» cerraba sin encadenar y el alta quedaba trabada. Lo apaga
     `clvAbrir` (y `clvCambiarAbrir`). */
  p394bAppPreparar();
  try {
    await p394bSincronizar(P394B_APP_OK({ clave: P394B_APP_FALTA }));
    PRUEBAS.igual(CLV_MODO_PEDIR, 'pedir', 'precondición · el aviso está abierto');
    document.getElementById('claveOv').classList.remove('show');   // se cerró por otro lado, sin «Más tarde»
    clvAbrir();
    PRUEBAS.igual([p394bClaveAbierta(), CLV_MODO_PEDIR, p394bLead()], [true, '', t('clv_lead')], 'abierta por el alta, es el paso del alta');
  } finally { try { document.getElementById('claveOv').classList.remove('show'); syncScrollLock(); navConsumir(); } catch (e) {} }
});

PRUEBAS.caso('🔒 P394b · «Mis estadísticas» pasada la fecha: el motivo a la vista, la hoja encima, y al crearla se vuelve a cargar (hallazgo 4)', async () => {
  /* `portalAutoLoginEmpleado` con `crear_clave`. Antes era un callejón: el error y un «Reintentar» que repetía el mismo pedido. */
  p394bAppPreparar();
  const prevFetch = window.fetchConReloj, prevPortal = window.portalAutoLoginEmpleado;
  const ov = document.getElementById('portalOverlay');
  let recargas = 0;
  const responder = body => {
    if (body && body.action === 'credencial_crear') return { ok: true };
    if (body && body.action === 'login') return { ok: true, sesion: 'tok-p394b-panel', persona: { cedula: P394B_APP.cedula } };
    if (body && body.action === 'empleado' && body.pass) return P394B_APP_OK();   // ya con la sesión: sus datos
    return { ok: false, motivo: 'crear_clave', exigidaDesde: '2026-11-25', error: 'Para ver tus resultados necesitas crear tu contraseña.' };
  };
  try {
    window.fetchConReloj = (url, opc) => {
      let body = (opc && opc.body) ? JSON.parse(opc.body) : null;
      if (!body) { try { body = Object.fromEntries(new URL(String(url)).searchParams); } catch (e) { body = null; } }
      return Promise.resolve({ json: () => Promise.resolve(responder(body)) });
    };
    /* El espía va ANTES de abrir: la rama guarda `portalAutoLoginEmpleado` como lo que hay que hacer después. */
    window.portalAutoLoginEmpleado = function () { recargas++; return prevPortal.apply(this, arguments); };
    ov.classList.add('show');
    portalAutoLoginEmpleado();
    await p394bEsperar(() => p394bClaveAbierta());
    PRUEBAS.cierto(p394bClaveAbierta(), '🔒 se abre la hoja de crearla, encima de «Mis estadísticas»');
    PRUEBAS.igual(CLV_MODO_PEDIR, 'exigida', 'con la explicación de que la necesita');
    PRUEBAS.cierto(ov.textContent.indexOf('Para ver tus resultados necesitas crear tu contraseña') >= 0, 'y detrás queda el motivo a la vista');
    ['clvPass', 'clvPass2'].forEach(id => { const el = document.getElementById(id); el.value = 'Prueba-394b'; el.dispatchEvent(new Event('input')); });
    clvGuardar(document.getElementById('clvBtn'));
    await p394bEsperar(() => recargas >= 2 && !p394bClaveAbierta());
    PRUEBAS.igual(recargas, 2, '🔒 al crearla entra con ella y «Mis estadísticas» se vuelve a cargar, ya con la sesión');
  } finally {
    window.fetchConReloj = prevFetch; window.portalAutoLoginEmpleado = prevPortal;
    p394bCerrar(); ov.classList.remove('show'); try { syncScrollLock(); } catch (e) {}
  }
  /* DISCRIMINADOR · un fallo cualquiera (sin motivo) no abre la hoja. */
  p394bAppPreparar();
  try {
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: false, error: 'Sin conexión' }) });
    ov.classList.add('show');
    portalAutoLoginEmpleado();
    await new Promise(r => setTimeout(r, 300));
    PRUEBAS.falso(p394bClaveAbierta(), 'DISCRIMINADOR · sin `crear_clave`, el error de siempre y nada encima');
  } finally { window.fetchConReloj = prevFetch; p394bCerrar(); ov.classList.remove('show'); try { syncScrollLock(); } catch (e) {} }
});

PRUEBAS.caso('P394b · «Ver todo el historial» con `crear_clave` pregunta UNA vez, no 26 (hallazgo 5)', async () => {
  /* `cicloMiHistorialTodo` reintentaba 25 veces cualquier `false` (P187). Lo que el servidor ya contestó no cambia esperando.
     El discriminador es el sabotaje que saca el corte (corredor de sabotajes de P394b): vuelve a pedir cada 1,2 s. */
  p394bAppPreparar();
  const prevFetch = window.fetchConReloj, prevToast = window.showToast;
  let pedidos = 0; const avisos = [];
  try {
    window.fetchConReloj = () => { pedidos++; return Promise.resolve({ json: () => Promise.resolve({ ok: false, motivo: 'crear_clave', exigidaDesde: '2026-11-25', error: 'Para ver tus resultados necesitas crear tu contraseña.' }) }); };
    window.showToast = m => { avisos.push(String(m)); };
    _clvPedidaApertura = true;   // ya se le pidió en esta apertura: lo que se mide es el reintento, no la hoja
    cicloMiHistorialTodo(document.createElement('button'));
    await new Promise(r => setTimeout(r, 3200));
    PRUEBAS.igual(pedidos, 1, '🔒 una sola pregunta al servidor');
    PRUEBAS.cierto(avisos.indexOf(t('err_m_crear_clave')) >= 0, 'y dice por qué: ' + JSON.stringify(avisos));
  } finally {
    window.fetchConReloj = prevFetch; window.showToast = prevToast;
    try { _cicloHistDias = 0; _misSincronizando = false; _misSincEnVuelo = null; _misUltimoMotivo = ''; } catch (e) {}
    p394bCerrar();
  }
});

/* ══ SEGUNDA VUELTA DEL VERIFICADOR (2026-11-25) ══════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('P394b · un motivo viejo no corta «Ver todo el historial» si el pedido no salió (2ª vuelta, 6)', async () => {
  /* `cicloMiHistorialTodo` borra `_misUltimoMotivo` antes de pedir: con una sincronización en vuelo, `misSincronizar` devuelve `false`
     sin preguntar nada, y el `crear_clave` de la anterior (ya resuelto) cortaba con un aviso falso y el toque se perdía. */
  p394bAppPreparar();
  const prevFetch = window.fetchConReloj, prevToast = window.showToast;
  const dias = []; const avisos = [];
  try {
    window.fetchConReloj = url => { const m = /[?&]dias=(\d+)/.exec(String(url)); dias.push(m ? +m[1] : 0); return Promise.resolve({ json: () => Promise.resolve(P394B_APP_OK()) }); };
    window.showToast = m => { avisos.push(String(m)); };
    _misUltimoMotivo = 'crear_clave';                       // lo dejó el arranque; la persona ya creó su contraseña
    _misSincronizando = true; _misSincEnVuelo = null;       // y la sincronización que siguió al login todavía viaja
    cicloMiHistorialTodo(document.createElement('button'));
    await new Promise(r => setTimeout(r, 200));
    _misSincronizando = false;                              // llegó: el reintento de P187 ya puede preguntar
    await p394bEsperar(() => dias.indexOf(400) >= 0, 2500);
    PRUEBAS.cierto(dias.indexOf(400) >= 0, 'pide el año: ' + JSON.stringify(dias));
    PRUEBAS.igual(avisos.indexOf(t('err_m_crear_clave')), -1, 'y no dice que le falta la contraseña');
  } finally {
    window.fetchConReloj = prevFetch; window.showToast = prevToast;
    try { _cicloHistDias = 0; _misSincronizando = false; _misSincEnVuelo = null; _misUltimoMotivo = ''; } catch (e) {}
    await new Promise(r => setTimeout(r, 50));
    p394bCerrar();
  }
});

PRUEBAS.caso('P394b · desde «Mis estadísticas», si la respuesta del alta se perdió (`ya_tiene`), igual se vuelve a cargar (2ª vuelta, 7)', async () => {
  /* El caso de P173: el primer pedido la crea, la respuesta se pierde y el reintento trae `ya_tiene`. Entra con la que escribió
     (`clvEntrarConClaveRecien`) y lo que pidió la pantalla viaja igual que con `ok`. */
  p394bAppPreparar();
  const prevFetch = window.fetchConReloj, prevPortal = window.portalAutoLoginEmpleado;
  const ov = document.getElementById('portalOverlay');
  let recargas = 0;
  const responder = body => {
    if (body && body.action === 'credencial_crear') return { ok: false, motivo: 'ya_tiene', error: 'Esta persona ya tiene contraseña. Inicia sesión con ella.' };
    if (body && body.action === 'login') return { ok: true, sesion: 'tok-p394b-ya', persona: { cedula: P394B_APP.cedula } };
    if (body && body.action === 'empleado' && body.pass) return P394B_APP_OK();
    return { ok: false, motivo: 'crear_clave', exigidaDesde: '2026-11-25', error: 'Para ver tus resultados necesitas crear tu contraseña.' };
  };
  try {
    window.fetchConReloj = (url, opc) => {
      let body = (opc && opc.body) ? JSON.parse(opc.body) : null;
      if (!body) { try { body = Object.fromEntries(new URL(String(url)).searchParams); } catch (e) { body = null; } }
      return Promise.resolve({ json: () => Promise.resolve(responder(body)) });
    };
    window.portalAutoLoginEmpleado = function () { recargas++; return prevPortal.apply(this, arguments); };
    ov.classList.add('show');
    portalAutoLoginEmpleado();
    await p394bEsperar(() => p394bClaveAbierta());
    ['clvPass', 'clvPass2'].forEach(id => { const el = document.getElementById(id); el.value = 'Prueba-394b'; el.dispatchEvent(new Event('input')); });
    clvGuardar(document.getElementById('clvBtn'));
    await p394bEsperar(() => recargas >= 2 && !p394bClaveAbierta());
    PRUEBAS.igual(recargas, 2, 'entra con la que escribió y «Mis estadísticas» se vuelve a cargar');
    PRUEBAS.igual(_clvPedirDespues, null, 'y no queda nada pendiente para la próxima vez');
  } finally {
    window.fetchConReloj = prevFetch; window.portalAutoLoginEmpleado = prevPortal;
    p394bCerrar(); ov.classList.remove('show'); try { syncScrollLock(); } catch (e) {}
  }
});

PRUEBAS.caso('P394b · «Ver todo el historial» con `baja` también pregunta una vez (2ª vuelta, 8)', async () => {
  /* `baja` es una respuesta nueva de `empleado` (desde la fecha) y, como las de la contraseña, no cambia esperando. */
  p394bAppPreparar();
  const prevFetch = window.fetchConReloj, prevToast = window.showToast;
  let pedidos = 0; const avisos = [];
  try {
    window.fetchConReloj = () => { pedidos++; return Promise.resolve({ json: () => Promise.resolve({ ok: false, motivo: 'baja', error: 'Tu empresa te dio de baja en la nómina. Consulta con tu supervisor.' }) }); };
    window.showToast = m => { avisos.push(String(m)); };
    cicloMiHistorialTodo(document.createElement('button'));
    await new Promise(r => setTimeout(r, 3200));
    PRUEBAS.igual(pedidos, 1, 'una sola pregunta al servidor');
    PRUEBAS.cierto(avisos.indexOf(t('err_m_baja')) >= 0, 'y dice por qué: ' + JSON.stringify(avisos));
  } finally {
    window.fetchConReloj = prevFetch; window.showToast = prevToast;
    try { _cicloHistDias = 0; _misSincronizando = false; _misSincEnVuelo = null; _misUltimoMotivo = ''; } catch (e) {}
    p394bCerrar();
  }
});
