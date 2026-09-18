PRUEBAS.grupo('P188 + P189 (2026-09-18) · el toast que un cambio de app corta vuelve al frente; tareas al volver si pasó 1 h; ausencias con háptico, candado, cola y «Deshacer»');

/* Decisiones de Franco (panel del 2026-09-17): «Reporte registrado» diferido al volver de WhatsApp (como el aviso del
   ciclo); tareas releídas al volver a la vista si pasó más de una hora desde el último pedido; `ausTocar` sin diálogo
   pero con háptico, candado por persona (el segundo toque espera al primero) y «Deshacer» 4 s en el toast.
   Camino real: `showToast` + el manejador de `visibilitychange` (con `document.hidden` simulado por `conOculto`),
   `tareasCargar` con la red espiada, `ausTocar(btn)` con `fetchConReloj` controlable y `onDashData` como supervisor. */

function p188Tick(){ return (async () => { for (let i = 0; i < 10; i++) await null; })(); }

PRUEBAS.caso('🔴 P188 · un toast vivo cuando la app se oculta vuelve a mostrarse al volver (antes: «Reporte registrado» nunca se veía en celular, WhatsApp lo tapaba)', () => {
  const oSw = swReg; swReg = null;
  const toast = document.getElementById('toast'), msg = document.getElementById('toastMsg');
  return PRUEBAS.conOculto(false, async (setOculto) => {
    try {
      showToast('P188 prueba · 10:15');
      PRUEBAS.cierto(toast.classList.contains('show'), 'guarda: el toast está a la vista');
      /* la tarjeta abre WhatsApp: la app se oculta con el toast recién nacido */
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      hideToast();   // lo que el navegador hace de hecho al irse (y lo que hacía el manejador al volver)
      PRUEBAS.cierto(!toast.classList.contains('show'), 'guarda: oculta, el toast no está');
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(toast.classList.contains('show') && msg.textContent === 'P188 prueba · 10:15', '🔴 al volver, el toast se repone con el mismo texto');
      PRUEBAS.igual(_toastPendiente, null, 'y el pendiente se consumió (una sola reposición)');
      /* DISCRIMINADOR · un toast que ya EXPIRÓ antes de ocultarse no vuelve */
      hideToast();
      showToast('P188 viejo'); hideToast();   // expiró (el timer lo cerró)
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(!toast.classList.contains('show'), 'DISCRIMINADOR · un toast ya cerrado no vuelve al frente');
      /* y uno que la persona TOCÓ para cerrarlo tampoco */
      showToast('P188 tocado'); toast.click();
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(!toast.classList.contains('show'), 'el que la persona cerró con un toque tampoco vuelve');
    } finally { hideToast(); _toastPendiente = null; swReg = oSw; }
  });
});

PRUEBAS.caso('🔴 P188 · el camino REAL: mark() muestra el toast y la tarjeta abre WhatsApp en el mismo toque; al volver, se ve', () => {
  const oSw = swReg; swReg = null;
  /* R18 · el manejador de visibilidad también pide tareas y revisa el ciclo: se estuban para que este caso no deje red ni timers */
  const oTar = window.tareasCargar, oRev = window.cicloDetenidoRevisar, pedidoEn0 = TAREAS.pedidoEn;
  window.tareasCargar = () => Promise.resolve(); window.cicloDetenidoRevisar = () => {}; TAREAS.pedidoEn = Date.now();
  const prevLS = Object.assign({}, localStorage);
  const toast = document.getElementById('toast'), msg = document.getElementById('toastMsg');
  return PRUEBAS.conOculto(false, async (setOculto) => {
    try {
      setProfile({ nombre: 'Persona De Prueba', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
      localStorage.removeItem(K_REPORTS);
      mark('p188_prueba');
      const hora = (getReports()['p188_prueba'] || {}).time || '';
      PRUEBAS.cierto(!!hora && msg.textContent.indexOf(hora) >= 0, 'guarda: mark() mostró «Reporte registrado · ' + hora + '»');
      setOculto(true); document.dispatchEvent(new Event('visibilitychange')); hideToast();
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(toast.classList.contains('show') && msg.textContent === t('ts_reporte_registrado', { h: hora }), '🔴 de vuelta de WhatsApp, «Reporte registrado · hh:mm» está a la vista');
    } finally {
      hideToast(); _toastPendiente = null; swReg = oSw; window.tareasCargar = oTar; window.cicloDetenidoRevisar = oRev; TAREAS.pedidoEn = pedidoEn0;
      try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
      try { refreshStates(); renderInicio(); } catch(e){}
    }
  });
});

PRUEBAS.caso('🟡 P188 · lo que se repone es LO ÚLTIMO que se dijo: un toast nuevo (p. ej. un error llegado con la app oculta) invalida el pendiente; y pasados 15 min no se repone nada', () => {
  const oSw = swReg; swReg = null;
  const toast = document.getElementById('toast'), msg = document.getElementById('toastMsg');
  return PRUEBAS.conOculto(false, async (setOculto) => {
    try {
      showToastAccion('optimista · Deshacer', 'Deshacer', () => {}, 4000);
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(!!_toastPendiente && _toastPendiente.msg === 'optimista · Deshacer', 'guarda: el optimista quedó pendiente');
      showToast('No se pudo guardar');   // el servidor falló mientras la app estaba oculta
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(toast.classList.contains('show') && msg.textContent === 'No se pudo guardar', '🟡 al volver se ve el ERROR, no la foto de antes del resultado (verificador)');
      PRUEBAS.igual(toast.querySelector('.toast-btn'), null, 'y sin el «Deshacer» del toast viejo');
      /* con la app a la vista, un toast nuevo también borra el pendiente (no hay nada que reponer después) */
      hideToast(); showToast('a'); setOculto(true); document.dispatchEvent(new Event('visibilitychange')); setOculto(false);
      showToast('b');
      PRUEBAS.igual(_toastPendiente, null, 'DISCRIMINADOR · un toast nuevo a la vista deja sin pendiente');
      /* el tope: 16 minutos en segundo plano → noticia vieja */
      hideToast(); showToast('viejo'); setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      _toastPendiente.ocultoEn = Date.now() - 16 * 60000;
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.cierto(!toast.classList.contains('show'), 'pasados 15 min en segundo plano no se repone (TOAST_REPONER_MAX_MS = ' + TOAST_REPONER_MAX_MS + ')');
    } finally { hideToast(); _toastPendiente = null; swReg = oSw; }
  });
});

PRUEBAS.caso('🔴 P188 · tareas: al volver a la vista se vuelven a pedir si pasó más de 1 h desde el último pedido (y no antes)', () => {
  const oTar = window.tareasCargar; let n = 0; window.tareasCargar = () => { n++; return Promise.resolve(); };
  const oRev = window.cicloDetenidoRevisar; window.cicloDetenidoRevisar = () => {};
  const oSw = swReg; swReg = null; const pedidoEn0 = TAREAS.pedidoEn;
  return PRUEBAS.conOculto(true, async (setOculto) => {
    try {
      /* hace 10 minutos: no se pide */
      TAREAS.pedidoEn = Date.now() - 10 * 60000;
      document.dispatchEvent(new Event('visibilitychange'));   // se oculta (anota el día)
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.igual(n, 0, 'hace 10 min: NO se pide (cuota)');
      /* hace 2 horas: se pide */
      TAREAS.pedidoEn = Date.now() - 2 * 3600000;
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.igual(n, 1, '🔴 hace 2 h: se vuelve a pedir al volver a la vista (antes: sólo al arrancar, al tocar la campana o con cambio de día)');
      /* DISCRIMINADOR · justo por debajo del umbral, no */
      TAREAS.pedidoEn = Date.now() - (TAREAS_RELECTURA_MS - 60000);
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.igual(n, 1, 'DISCRIMINADOR · a 59 min todavía no');
      PRUEBAS.igual(TAREAS_RELECTURA_MS, 3600000, 'el umbral es una hora');
    } finally { window.tareasCargar = oTar; window.cicloDetenidoRevisar = oRev; swReg = oSw; TAREAS.pedidoEn = pedidoEn0; }
  });
});

PRUEBAS.caso('P188 · `tareasCargar` anota cuándo DISPARÓ el pedido (`pedidoEn`), también si el servidor no contesta bien', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oReloj = window.fetchConReloj, oToast = window.showToast, pedidoEn0 = TAREAS.pedidoEn, lista0 = TAREAS.lista, pend0 = TAREAS.pendientes;
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: false }) });
  window.showToast = () => {};
  try {
    setProfile({ nombre: 'Persona De Prueba', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    TAREAS.pedidoEn = 0; TAREAS.cargando = false; TAREAS._enVuelo = null;
    const antes = Date.now();
    await tareasCargar(); await p188Tick();
    PRUEBAS.cierto(TAREAS.pedidoEn >= antes, 'pedidoEn quedó anotado al disparar · ' + (TAREAS.pedidoEn - antes) + ' ms');
    PRUEBAS.igual(TAREAS.cargando, false, 'guarda: el pedido terminó');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; TAREAS.pedidoEn = pedidoEn0; TAREAS.lista = lista0; TAREAS.pendientes = pend0; TAREAS.cargando = false; TAREAS._enVuelo = null;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { tareasPintarBadge(); } catch(e){}
  }
});

/* ── P189 ── */
function p189Sup(){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10);
  const payload = { ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }],
    aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1 };
  try {
    onDashData(payload, 'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-p189', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'p189' }, 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} };
}

PRUEBAS.caso('🔴 P189 · dos toques rápidos: UN solo pedido en vuelo; el segundo espera y sale después contra el estado real (anular); háptico en cada toque', async () => {
  const fin = p189Sup();
  const oReloj = window.fetchConReloj, oOff = window.offHayConexion, oToast = window.showToast, oHap = window.haptic;
  const posts = [], resolvers = [], toasts = []; let vibraciones = 0;
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body)); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.offHayConexion = () => true; window.showToast = m => toasts.push(String(m)); window.haptic = () => { vibraciones++; };
  const btn = document.createElement('button'); btn.setAttribute('data-ced', 'V-99999999'); btn.setAttribute('data-per', 'Persona De Prueba');
  const hoy = todayStr(), kCed = '99999999|' + hoy;
  try {
    ausTocar(btn);
    PRUEBAS.igual(posts.length, 1, 'primer toque: un POST');
    PRUEBAS.cierto(posts[0].action === 'ausencia_guardar' && !posts[0].anular, 'y es marcar');
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'pintado en el acto (optimista, como siempre)');
    PRUEBAS.igual(vibraciones, 1, 'R8 · háptico al marcar');
    ausTocar(btn);   // el segundo toque, con el primero en vuelo
    PRUEBAS.igual(posts.length, 1, '🔴 con el primero en vuelo, el segundo NO sale en paralelo (antes: guardar y anular viajaban juntos)');
    PRUEBAS.cierto(!DASH.ausencias[kCed], 'y la pantalla muestra el último toque (presente): nada de esperar mirando lo contrario');
    PRUEBAS.igual(vibraciones, 2, 'háptico también en el segundo toque');
    resolvers[0]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 2, '🔴 resuelto el primero, sale el segundo');
    PRUEBAS.igual(posts[1].anular, '1', 'y es ANULAR: el servidor se pone al día con lo que la pantalla ya muestra');
    PRUEBAS.cierto(!DASH.ausencias[kCed], 'la pantalla sigue en presente');
    resolvers[1]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(Object.keys(DASH._ausEnVuelo || {}).length, 0, 'sin candado colgado al terminar');
    /* DISCRIMINADOR · un solo toque → un solo POST aunque el primero resuelva */
    ausTocar(btn); resolvers[2]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 3, 'DISCRIMINADOR · sin segundo toque no hay segundo POST');
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'guarda: marcada');
    /* ESTADO DESEADO · tres toques rápidos (quitar, marcar, quitar): lo último que quiso ver es «presente», que es lo que
       el pedido en vuelo logra → no sale nada más */
    ausTocar(btn); ausTocar(btn); ausTocar(btn);
    PRUEBAS.igual(posts.length, 4, 'un pedido en vuelo (quitar)');
    PRUEBAS.cierto(!DASH.ausencias[kCed], 'la pantalla muestra el tercer toque: presente');
    resolvers[3]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 4, 'lo logrado (presente) es lo deseado: no sale nada más');
    /* con el índice PISADO (acá a mano: por el camino real `ausReaplicarLocales` lo protege, ver el caso del refresco),
       el toque se calcula sobre una fila vieja: lo que manda es el estado DESEADO, no la fila (verificador A2) */
    ausTocar(btn);   // marcar → en vuelo (pantalla: ausente)
    DASH.ausencias = {};   // la fila vuelve a «presente» por fuera
    ausTocar(btn);   // el supervisor, viendo «presente», vuelve a tocar «marcar» → quiere ausente
    resolvers[4]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 5, '🔴 lo logrado (ausente) es lo deseado: NO sale un «anular» (contando toques salía y el CH quedaba presente)');
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'y la fila dice ausente');
    /* si el primero FALLA con toques encolados: la pantalla vuelve a lo que el servidor tiene, se avisa y lo encolado se DESCARTA */
    ausTocar(btn);   // quitar (está ausente) → en vuelo
    ausTocar(btn);   // marcar, encolado (pantalla: ausente)
    resolvers[5]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 6, '🔴 el primero falló y el encolado NO se rehace (verificador: rehacía la acción fallida y tapaba el error)');
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'la pantalla quedó como el servidor: ausente');
    PRUEBAS.cierto(/no se pudo/i.test(toasts[toasts.length - 1] || ''), 'y lo ÚLTIMO que se dijo es el error (no lo tapó el toast del encolado) · ' + JSON.stringify(toasts.slice(-2)));
    PRUEBAS.igual(Object.keys(DASH._ausPendiente || {}).length, 0, 'sin cola colgada');
    /* cerrar el panel con un pedido en vuelo (verificador A1): el error se avisa igual, y un «Deshacer» encolado sale igual */
    ausTocar(btn);   // quitar → en vuelo
    ausTocar(btn);   // marcar, encolado
    const dashAbierto = DASH; DASH = null;   // ✕ del panel (closePortal hace DASH = null)
    resolvers[6]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.igual(posts.length, 8, '🟡 con el panel cerrado, el toque encolado sale igual (antes se perdía: CH al revés del último toque)');
    PRUEBAS.cierto(!posts[7].anular, 'y es marcar (lo deseado)');
    const nToasts = toasts.length;
    resolvers[7]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p188Tick();
    PRUEBAS.cierto(toasts.length === nToasts + 1 && /no se pudo/i.test(toasts[toasts.length - 1]), '🟡 y con el panel cerrado el error se avisa igual (antes: mudo)');
    DASH = dashAbierto;
  } finally { window.fetchConReloj = oReloj; window.offHayConexion = oOff; window.showToast = oToast; window.haptic = oHap; hideToast(); fin(); }
});

PRUEBAS.caso('🔴 P189 · «Deshacer» en el toast (4 s): manda el toque contrario; el toast lleva el botón por t()', async () => {
  const fin = p189Sup();
  const oReloj = window.fetchConReloj, oOff = window.offHayConexion, oHap = window.haptic;
  const posts = [], resolvers = [];
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body)); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.offHayConexion = () => true; window.haptic = () => {};
  const btn = document.createElement('button'); btn.setAttribute('data-ced', 'V-99999999'); btn.setAttribute('data-per', 'Persona De Prueba');
  const toast = document.getElementById('toast');
  try {
    ausTocar(btn);
    PRUEBAS.cierto(toast.classList.contains('show'), 'el toast sale con el toque (optimista, como la fila)');
    PRUEBAS.igual(document.getElementById('toastMsg').textContent, t('aus_puesta', { p: 'Persona De Prueba' }), 'con el texto de «no se cuenta hoy»');
    const b = toast.querySelector('.toast-btn');
    PRUEBAS.cierto(!!b && b.textContent === t('aus_deshacer'), '🔴 y el botón «Deshacer» del diccionario');
    PRUEBAS.igual(_toastVivo && _toastVivo.ms, 4000, 'dura 4 s (no los 2,6 de siempre)');
    PRUEBAS.cierto(typeof I18N.es._.aus_deshacer === 'string' && typeof I18N.en._.aus_deshacer === 'string', 'aus_deshacer en es y en');
    PRUEBAS.cierto(getComputedStyle(b).textDecorationLine.indexOf('underline') >= 0, 'guarda R13 · el botón tiene su estilo (subrayado), sin colores a mano');
    resolvers[0]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    b.click();   // Deshacer
    PRUEBAS.igual(posts.length, 2, '🔴 el toque en Deshacer manda el toque contrario');
    PRUEBAS.igual(posts[1].anular, '1', 'anular');
    PRUEBAS.igual(document.getElementById('toastMsg').textContent, t('aus_quitada', { p: 'Persona De Prueba' }), 'y el toast ahora dice «vuelve a contarse» (con su propio Deshacer: se puede volver a marcar)');
    PRUEBAS.cierto(!!toast.querySelector('.toast-btn') && toast.querySelector('.toast-btn') !== b, 'con un botón nuevo (el anterior se fue)');
    resolvers[1]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    /* DISCRIMINADOR · tocar el toast (no el botón) sólo lo cierra */
    ausTocar(btn); toast.click();
    PRUEBAS.igual(posts.length, 3, 'DISCRIMINADOR · tocar el cuerpo del toast no deshace nada');
    resolvers[2]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    /* el día viaja con el toque: marcada a las 23:59, «Deshacer» pasada la medianoche deshace LA DE AYER (verificador) */
    ausTocar(btn, '2026-01-01');
    PRUEBAS.igual(posts[3].desde, '2026-01-01', 'guarda: se marcó para ese día');
    resolvers[3]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    toast.querySelector('.toast-btn').click();
    PRUEBAS.cierto(posts[4].anular === '1' && posts[4].desde === '2026-01-01', 'Deshacer anula la del MISMO día, no marca una de hoy');
    resolvers[4]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    /* y sólo sobre el mismo panel: si DASH cambió (visor, «entrar como»), el botón no hace nada */
    ausTocar(btn); resolvers[5]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    const b5 = toast.querySelector('.toast-btn'); const dashViejo = DASH; DASH = Object.assign({}, dashViejo);
    b5.click(); DASH = dashViejo;
    PRUEBAS.igual(posts.length, 6, 'con otro panel puesto, «Deshacer» no manda nada');
  } finally { window.fetchConReloj = oReloj; window.offHayConexion = oOff; window.haptic = oHap; hideToast(); _toastPendiente = null; fin(); }
});

PRUEBAS.caso('P188/P189 · un toast con botón que se corta al cambiar de app vuelve CON su botón; y un toast nuevo saca el botón viejo', () => {
  const oSw = swReg; swReg = null;
  const toast = document.getElementById('toast');
  return PRUEBAS.conOculto(false, async (setOculto) => {
    let hecho = 0;
    try {
      showToastAccion('P189 con botón', 'Acción', () => { hecho++; }, 4000);
      setOculto(true); document.dispatchEvent(new Event('visibilitychange')); hideToast();
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      const b = toast.querySelector('.toast-btn');
      PRUEBAS.cierto(toast.classList.contains('show') && !!b, 'repuesto con su botón');
      b.click();
      PRUEBAS.igual(hecho, 1, 'y el botón repuesto sigue haciendo lo suyo');
      showToastAccion('otro', 'X', () => {}, 1000); showToast('sin botón');
      PRUEBAS.igual(toast.querySelector('.toast-btn'), null, 'DISCRIMINADOR · un toast nuevo sin acción no arrastra el botón del anterior');
    } finally { hideToast(); _toastPendiente = null; swReg = oSw; }
  });
});

PRUEBAS.caso('P188 · el toast usa el ancho que el texto pide (hasta el 90 %), no la mitad del viewport: en un celular «Reporte registrado» iba en dos líneas', () => {
  const toast = document.getElementById('toast');
  try {
    showToast(t('reg_no_en_nomina'));   // el texto más largo que se muestra como toast
    const w = toast.getBoundingClientRect().width, vw = innerWidth;
    PRUEBAS.cierto(w > vw / 2 + 8, 'con un texto largo, el toast pasa de la mitad del viewport (antes quedaba clavado en ~50 %: shrink-to-fit con left:50 %) · ' + Math.round(w) + ' de ' + vw);
    PRUEBAS.cierto(w <= vw * 0.9 + 1, 'y no pasa del 90 % (max-width)');
    PRUEBAS.igual(getComputedStyle(toast).width !== '', true, 'guarda: medible');
    /* DISCRIMINADOR · sin `width:max-content` el ancho queda en ~la mitad */
    const st = document.createElement('style'); st.textContent = '#toast{width:auto!important}'; document.head.appendChild(st);
    const w2 = toast.getBoundingClientRect().width; st.remove();
    PRUEBAS.cierto(w2 <= vw / 2 + 8, 'DISCRIMINADOR · con width:auto vuelve a quedar en la mitad · ' + Math.round(w2));
  } finally { hideToast(); _toastPendiente = null; }
});

PRUEBAS.caso('🟡 P189 · un refresco del panel en medio del vuelo reemplaza DASH.ausencias: al resolver, la fila vuelve a lo que el servidor tiene (no queda pisada hasta el refresco siguiente)', async () => {
  const fin = p189Sup();
  const oReloj = window.fetchConReloj, oOff = window.offHayConexion, oToast = window.showToast, oHap = window.haptic;
  const resolvers = [];
  window.fetchConReloj = () => new Promise(res => { resolvers.push(res); });
  window.offHayConexion = () => true; window.showToast = () => {}; window.haptic = () => {};
  const btn = document.createElement('button'); btn.setAttribute('data-ced', 'V-99999999'); btn.setAttribute('data-per', 'Persona De Prueba');
  const hoy = todayStr(), kCed = '99999999|' + hoy;
  try {
    ausTocar(btn);
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'guarda: pintada ausente, pedido en vuelo');
    /* el refresco de cada minuto trae el índice del servidor de ANTES del pedido (vacío) y reemplaza el objeto */
    DASH.ausencias = {};
    PRUEBAS.cierto(!DASH.ausencias[kCed], 'guarda: el refresco la pisó (presente)');
    resolvers[0]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.cierto(!!DASH.ausencias[kCed], '🟡 al resolver ok, la fila vuelve a lo que el servidor tiene: ausente (antes: pisada hasta el próximo refresco)');
    /* y al FALLAR, lo mismo pero hacia el otro lado: pinta sobre el índice ACTUAL, no sobre el capturado */
    ausTocar(btn);   // quitar → en vuelo (pantalla: presente)
    DASH.ausencias = { [kCed]: 'franco', ['n:' + ausNombreClave('Persona De Prueba') + '|' + hoy]: 'franco' };   // refresco: el servidor todavía la tiene
    resolvers[1]({ json: () => Promise.resolve({ ok: false }) }); await p188Tick();
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'falló el quitar: la fila muestra lo del servidor (ausente) sobre el índice nuevo');
    /* DISCRIMINADOR · sin refresco en medio, nada cambia respecto de lo pintado */
    ausTocar(btn); const antes = DASH.ausencias; resolvers[2]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.cierto(DASH.ausencias === antes && !DASH.ausencias[kCed], 'DISCRIMINADOR · mismo índice, quitada y sigue quitada');
    /* y el GET que aterriza DESPUÉS del ok, por el camino real: `dashRefresh` reemplaza `DASH.ausencias` con la foto de antes */
    ausTocar(btn); resolvers[3]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.cierto(!!DASH.ausencias[kCed], 'guarda: marcada y confirmada por el servidor');
    const oReq = window.dashRequest;
    const hoyF = new Date().toISOString().slice(0, 10);
    let vez = 0;   // cada respuesta trae un registro más: `changed` es cierto y el refresco reemplaza el índice
    window.dashRequest = () => { vez++; return Promise.resolve({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: { kss: 5 }, metricas: ['kss'],
      registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoyF, kss: 3 }]
        .concat(Array.from({ length: vez }, (_, i) => ({ persona: 'Otra Persona ' + i, empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoyF, kss: 4 }))),
      comentarios: [], pvt: [], aptitud: [], turnos: [], operacional: [], duty: null, ausencias: {}, config: {}, nominaTotal: 2 }); };
    try {
      const ok = await dashRefresh(false);
      PRUEBAS.cierto(ok === true, 'guarda: el refresco corrió y aplicó cambios');
      PRUEBAS.cierto(!!DASH.ausencias[kCed], '🟡 la ausencia recién confirmada sobrevive al índice viejo del refresco (antes: la fila volvía a presente con la ausencia ya en el CH)');
      /* DISCRIMINADOR · una escritura local de hace 4 min ya no manda: el índice del servidor es más nuevo */
      DASH._ausLocal['aus_99999999_' + hoy].en = Date.now() - 4 * 60000;
      await dashRefresh(false);
      PRUEBAS.cierto(!DASH.ausencias[kCed], 'DISCRIMINADOR · pasados 3 min, el índice del servidor manda (AUS_LOCAL_MS = ' + AUS_LOCAL_MS + ')');
      PRUEBAS.cierto(AUS_LOCAL_MS > DASH_TIMEOUT_MS, 'guarda: la memoria local dura más que el reloj más largo del panel (' + AUS_LOCAL_MS + ' > ' + DASH_TIMEOUT_MS + '): una foto no puede aterrizar más vieja que eso');
      /* y un cambio de OTRO supervisor llega aunque no cambie nada más: `ausencias` entra en la firma (verificador A4) */
      DASH._ausLocal = {};
      const otro = { ['11111111|' + hoy]: 'franco' };
      const vezAntes = vez; window.dashRequest = () => Promise.resolve({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: { kss: 5 }, metricas: ['kss'],
        registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoyF, kss: 3 }]
          .concat(Array.from({ length: vezAntes }, (_, i) => ({ persona: 'Otra Persona ' + i, empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoyF, kss: 4 }))),
        comentarios: [], pvt: [], aptitud: [], turnos: [], operacional: [], duty: null, ausencias: otro, config: {}, nominaTotal: 2 });
      await dashRefresh(false);
      PRUEBAS.cierto(!!DASH.ausencias['11111111|' + hoy], '🟡 la ausencia que marcó otro supervisor se ve en el próximo refresco aunque no haya cambiado nada más (antes: recién con el próximo evento de ciclo o test)');
    } finally { window.dashRequest = oReq; }
  } finally { window.fetchConReloj = oReloj; window.offHayConexion = oOff; window.showToast = oToast; window.haptic = oHap; hideToast(); _toastPendiente = null; fin(); }
});

PRUEBAS.caso('🟡 P189 · «Deshacer» sin panel no actúa a ciegas: cerrar el panel se lleva el toast; y Deshacer lleva su destino (si otro ya lo dejó así, no invierte)', async () => {
  const fin = p189Sup();
  const oReloj = window.fetchConReloj, oOff = window.offHayConexion, oHap = window.haptic;
  const posts = [], resolvers = [];
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body)); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.offHayConexion = () => true; window.haptic = () => {};
  const btn = document.createElement('button'); btn.setAttribute('data-ced', 'V-99999999'); btn.setAttribute('data-per', 'Persona De Prueba');
  const toast = document.getElementById('toast'), hoy = todayStr(), kCed = '99999999|' + hoy;
  try {
    ausTocar(btn); resolvers[0]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    PRUEBAS.cierto(toast.classList.contains('show') && !!toast.querySelector('.toast-btn'), 'guarda: toast con Deshacer a la vista');
    closePortal();
    PRUEBAS.cierto(!toast.classList.contains('show') && !toast.querySelector('.toast-btn'), '🟡 cerrar el panel se lleva el toast (antes quedaba un «Deshacer» sobre el inicio que no hacía nada)');
    PRUEBAS.igual(_toastPendiente, null, 'y sin pendiente que reponer');
    /* Deshacer con destino: marca, otro supervisor la quita por fuera, Deshacer no vuelve a marcar */
    const fin2 = p189Sup();
    try {
      ausTocar(btn); resolvers[1]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
      const b = toast.querySelector('.toast-btn');
      ausPintar(DASH.ausencias, [kCed, 'n:' + ausNombreClave('Persona De Prueba') + '|' + hoy], false);   // otro la dejó presente
      b.click();
      PRUEBAS.igual(posts.length, 2, '🟢 Deshacer quería «presente» y ya está: no vuelve a marcar (antes: toggle → marcaba)');
      /* DISCRIMINADOR · con la fila todavía ausente, Deshacer sí quita */
      ausTocar(btn); resolvers[2]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
      toast.querySelector('.toast-btn').click();
      PRUEBAS.cierto(posts.length === 4 && posts[3].anular === '1', 'DISCRIMINADOR · con la fila ausente, Deshacer manda anular');
      resolvers[3]({ json: () => Promise.resolve({ ok: true }) }); await p188Tick();
    } finally { fin2(); }
  } finally { window.fetchConReloj = oReloj; window.offHayConexion = oOff; window.haptic = oHap; hideToast(); _toastPendiente = null; fin(); }
});
