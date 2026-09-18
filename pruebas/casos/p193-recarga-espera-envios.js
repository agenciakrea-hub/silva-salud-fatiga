PRUEBAS.grupo('P193 (2026-09-18) · la actualización de versión espera los envíos en vuelo (no aborta un test que está viajando)');

/* Auditoría de uso real #33: `versionAplicar` recargaba sin mirar la red. Un primer envío abortado por la recarga no
   corre su `.catch` (no queda ni en el CH ni en el teléfono); un reintento `no-cors` abortado que sí llegó se reenvía
   (fila duplicada en la hoja clínica). Camino real: `enviarConCola` con la red controlable, `versionAplicar()`,
   `versionEsperaTick()` (lo que corre el temporizador) y el botón de la barra; `versionRecargar` espiada. */

function p193Tick(){ return (async () => { for (let i = 0; i < 12; i++) await null; })(); }
/* R18 · en la suite, los envíos que el candado de red cortó quedan «en vuelo» para siempre (sus marcas nunca se
   sueltan): se limpian los tres candados antes de medir, y se dejan limpios al salir */
function p193Limpiar(){
  const b = document.getElementById('verNuevaBar'); if (b) b.remove();
  if (versionEspera){ clearInterval(versionEspera); versionEspera = null; }
  _versionRecargaPedida = 0;
  [_colaEnVuelo, _empEnVuelo, _gestEnVuelo].forEach(m => { Object.keys(m).forEach(k => { delete m[k]; }); });
}

PRUEBAS.caso('🔴 P193 · un envío en vuelo cuenta (también el PRIMERO, no sólo los reintentos): enviosEnVuelo lo ve mientras viaja y deja de verlo al confirmarse', async () => {
  const oReloj = window.fetchConReloj; let responder = null;
  window.fetchConReloj = () => new Promise(res => { responder = res; });
  const prevLS = Object.assign({}, localStorage);
  try {
    p193Limpiar();
    PRUEBAS.igual(enviosEnVuelo(), 0, 'guarda: nada en vuelo');
    const url = 'https://script.google.com/macros/s/p193-prueba/exec?test=kss&p=1';
    const p = enviarConCola(url);   // un test que sale por primera vez (no está en la cola)
    PRUEBAS.igual(enviosEnVuelo(), 1, '🔴 el primer envío cuenta como «en vuelo» (antes: sólo los reintentos de flushPending)');
    PRUEBAS.igual(getPending().length, 0, 'guarda: y no está en la cola (es el primero)');
    responder({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p; await p193Tick();
    PRUEBAS.igual(enviosEnVuelo(), 0, 'confirmado: ya no está en vuelo');
  } finally { window.fetchConReloj = oReloj; p193Limpiar(); try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
});

PRUEBAS.caso('🔴 P193 · con un envío en vuelo, la versión nueva NO recarga: avisa con la barra («Enviando 1 registro…») y recarga sola cuando el envío termina', async () => {
  const oReloj = window.fetchConReloj, oRec = window.versionRecargar; let responder = null, recargas = 0;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.versionRecargar = () => { recargas++; };
  const test = document.getElementById('testOverlay');
  try {
    p193Limpiar(); test.classList.remove('show');
    PRUEBAS.cierto(!appOcupada(), 'guarda: la app no está ocupada por una pantalla (si lo estuviera, esperaría por eso y no por la red)');
    const p = enviarConCola('https://script.google.com/macros/s/p193-prueba/exec?test=estres&p=1');
    versionAplicar();   // llega el mensaje «version-nueva» del service worker en medio del envío
    PRUEBAS.igual(recargas, 0, '🔴 no recarga con el envío en vuelo (antes: location.reload() en el acto → envío abortado)');
    const bar = document.getElementById('verNuevaBar');
    PRUEBAS.cierto(!!bar, 'la barra de versión nueva aparece');
    PRUEBAS.igual(bar.querySelector('#verNuevaTx').textContent, t('ver_nueva_enviando_1'), 'y dice por qué espera · ' + t('ver_nueva_enviando_1'));
    PRUEBAS.cierto(!!versionEspera, 'y el temporizador de reintento está armado');
    versionEsperaTick();
    PRUEBAS.igual(recargas, 0, 'un tick con el envío todavía en vuelo: sigue sin recargar');
    responder({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p; await p193Tick();
    versionEsperaTick();
    PRUEBAS.igual(recargas, 1, '🔴 terminado el envío, el siguiente tick recarga');
    PRUEBAS.igual(versionEspera, null, 'y el temporizador se apaga');
    PRUEBAS.cierto(typeof I18N.en._.ver_nueva_enviando_1 === 'string' && /\{n\}/.test(I18N.es._.ver_nueva_enviando_n) && /\{n\}/.test(I18N.en._.ver_nueva_enviando_n), 'textos en es y en, singular y plural (como el cartel offline)');
  } finally { window.fetchConReloj = oReloj; window.versionRecargar = oRec; p193Limpiar(); }
});

PRUEBAS.caso('P193 · sin nada en vuelo ni ocupado, recarga en el acto; con un test abierto, espera por la pantalla (como antes)', () => {
  const oRec = window.versionRecargar; let recargas = 0; window.versionRecargar = () => { recargas++; };
  const test = document.getElementById('testOverlay');
  try {
    p193Limpiar(); test.classList.remove('show');
    versionAplicar();
    PRUEBAS.igual(recargas, 1, 'DISCRIMINADOR · libre: recarga en el acto');
    PRUEBAS.igual(document.getElementById('verNuevaBar'), null, 'sin barra');
    /* ocupada por una pantalla: la barra dice «hay una versión nueva» (no «enviando») */
    test.classList.add('show');
    versionAplicar();
    PRUEBAS.igual(recargas, 1, 'con un test abierto no recarga');
    PRUEBAS.igual(document.getElementById('verNuevaTx').textContent, t('ver_nueva'), 'y la barra dice «hay una versión nueva»');
    test.classList.remove('show');
    versionEsperaTick();
    PRUEBAS.igual(recargas, 2, 'cerrado el test, el tick recarga');
  } finally { window.versionRecargar = oRec; test.classList.remove('show'); p193Limpiar(); try { syncScrollLock(); } catch(e){} }
});

PRUEBAS.caso('🟡 P193 · el botón «Actualizar» de la barra tampoco aborta un envío: muestra el cargador y recarga cuando el envío termina', async () => {
  const oReloj = window.fetchConReloj, oRec = window.versionRecargar; let responder = null, recargas = 0;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.versionRecargar = () => { recargas++; };
  try {
    p193Limpiar();
    const p = enviarConCola('https://script.google.com/macros/s/p193-prueba/exec?test=kss&p=2');
    versionNuevaAvisar();
    const btn = document.getElementById('verNuevaBtn');
    PRUEBAS.cierto(!!btn && /versionRecargarAhora/.test(btn.getAttribute('onclick')), 'guarda: el botón pasa por versionRecargarAhora (antes: location.reload() a secas)');
    btn.click();
    PRUEBAS.igual(recargas, 0, '🟡 con el envío en vuelo, no recarga');
    PRUEBAS.cierto(btn.classList.contains('btn-loading'), 'y el botón muestra el cargador');
    responder({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p; await p193Tick();
    versionRecargarCuandoLibre();   // lo que corre el temporizador de 500 ms
    PRUEBAS.igual(recargas, 1, 'terminado el envío, recarga');
    /* DISCRIMINADOR · sin envío en vuelo, el botón recarga en el acto */
    p193Limpiar(); versionNuevaAvisar();
    document.getElementById('verNuevaBtn').click();
    PRUEBAS.igual(recargas, 2, 'DISCRIMINADOR · libre: recarga en el acto');
  } finally { window.fetchConReloj = oReloj; window.versionRecargar = oRec; p193Limpiar(); }
});

PRUEBAS.caso('P193 · la marca se suelta también cuando el envío FALLA (queda en la cola para reintentar, pero ya no está «en vuelo»)', async () => {
  const oReloj = window.fetchConReloj; let rechazar = null;
  window.fetchConReloj = () => new Promise((res, rej) => { rechazar = rej; });
  const prevLS = Object.assign({}, localStorage);
  try {
    p193Limpiar();
    const url = 'https://script.google.com/macros/s/p193-prueba/exec?test=kss&p=3';
    const p = enviarConCola(url);
    PRUEBAS.igual(enviosEnVuelo(), 1, 'guarda: en vuelo');
    rechazar(new TypeError('Failed to fetch')); await p; await p193Tick();
    PRUEBAS.igual(enviosEnVuelo(), 0, 'falló: ya no está en vuelo');
    PRUEBAS.cierto(getPending().some(x => x && x.url === url), 'y quedó en la cola para reintentar (R7)');
  } finally { window.fetchConReloj = oReloj; p193Limpiar(); try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
});

PRUEBAS.caso('🟢 P193 · dos envíos con la MISMA url (el operacional no lleva hora: «salida de casa» de ayer en la cola y la de hoy) no se pisan la marca: el primero en terminar no libera al segundo', async () => {
  const oReloj = window.fetchConReloj; const resolvers = [];
  window.fetchConReloj = () => new Promise(res => { resolvers.push(res); });
  const prevLS = Object.assign({}, localStorage);
  try {
    p193Limpiar();
    const url = 'https://script.google.com/macros/s/p193-prueba/exec?campo=salida_casa&p=1';
    const p1 = enviarConCola(url); const p2 = enviarConCola(url);
    PRUEBAS.igual(enviosEnVuelo(), 2, 'dos en vuelo con la misma url');
    resolvers[0]({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p1; await p193Tick();
    PRUEBAS.igual(enviosEnVuelo(), 1, '🟢 terminado el primero, el segundo SIGUE en vuelo (antes: booleano → 0)');
    resolvers[1]({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p2; await p193Tick();
    PRUEBAS.igual(enviosEnVuelo(), 0, 'y al terminar el segundo, cero');
    /* un candado colgado (más viejo que el reloj de la red) no cuenta */
    colaMarcarVuelo(url); _colaEnVuelo[url].desde = Date.now() - ENVIO_VUELO_MAX_MS - 1000;
    PRUEBAS.igual(enviosEnVuelo(), 0, 'una marca más vieja que el reloj de la red no es un envío: no frena la actualización');
    PRUEBAS.cierto(ENVIO_VUELO_MAX_MS > 90000, 'guarda: el tope de la marca supera el reloj de fetchConReloj (90 s)');
  } finally { window.fetchConReloj = oReloj; p193Limpiar(); try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
});

PRUEBAS.caso('🟡 P193 · el botón «Actualizar» que quedó esperando vuelve a preguntar si hay algo escrito antes de recargar (verificador): la opinión que se abrió mientras tanto no se pierde', async () => {
  const oReloj = window.fetchConReloj, oRec = window.versionRecargar; let responder = null, recargas = 0;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.versionRecargar = () => { recargas++; };
  const op = document.getElementById('opinionOv'), ta = op.querySelector('textarea');
  try {
    p193Limpiar();
    const p = enviarConCola('https://script.google.com/macros/s/p193-prueba/exec?test=kss&p=4');
    versionNuevaAvisar(); document.getElementById('verNuevaBtn').click();
    PRUEBAS.igual(recargas, 0, 'guarda: esperando el envío');
    /* mientras espera, la persona abre la opinión anónima y escribe */
    op.classList.add('show'); if (ta) ta.value = 'algo que no se puede reconstruir';
    responder({ ok: true, type: 'opaque', text: () => Promise.resolve('') }); await p; await p193Tick();
    versionRecargarCuandoLibre();
    PRUEBAS.igual(recargas, 0, '🟡 terminado el envío, NO recarga: hay algo escrito (antes se lo llevaba puesto)');
    if (ta) ta.value = ''; op.classList.remove('show');
    versionRecargarCuandoLibre();
    PRUEBAS.igual(recargas, 1, 'cerrada la opinión, recarga');
  } finally { window.fetchConReloj = oReloj; window.versionRecargar = oRec; if (ta) ta.value = ''; op.classList.remove('show'); p193Limpiar(); try { syncScrollLock(); } catch(e){} }
});
