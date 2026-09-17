PRUEBAS.grupo('Uso real (2026-09-17) · aviso del ciclo al volver a verse, feedback de «Actualizar», barra de progreso de los tests (P083)');

/* Tres cosas que Franco vio usando la app: el aviso de «ciclo detenido» que llegó recién al tocar un
   botón, «Actualizar» en Tus tareas sin ningún feedback, y la barra de progreso de los tests que no se
   ve. Camino real: `cicloDetenidoRevisarAhora()` con la pestaña oculta y el evento de visibilidad,
   `tareasRefrescar(btn)` con `tareasCargar` espiada, `abrirTest(it)` por cada flujo. */

PRUEBAS.caso('🔴 con la app oculta, la revisión del ciclo detenido no se pierde: corre sola al volver a estar visible', () => {
  const origToast = window.showToast; window.showToast = () => {};
  const prevLS = Object.assign({}, localStorage);
  const hace = h => new Date(Date.now() - h * 3600000).toISOString();
  const ev = (evento, h) => ({ evento, iso: hace(h), persona: 'Yo', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: hace(h).slice(0, 10), plan: '', test: '', resultado: null });
  return PRUEBAS.conOculto(true, async (setOculto) => {
    try {
      setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
      localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([ev('salida_casa', 50), ev('llegada_aero', 49)]));   // detenido por la regla de las 24 h
      PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'detenido', 'guarda: el ciclo está detenido');
      _cicDetAlVolver = false;
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 0, 'oculta: todavía no avisa (nadie lo vería)');
      PRUEBAS.cierto(_cicDetAlVolver === true, '🔴 pero queda anotada para cuando la app vuelva a verse (antes: «hasta el próximo repintado», o sea el próximo botón)');
      /* la app vuelve a estar a la vista */
      setOculto(false);
      document.dispatchEvent(new Event('visibilitychange'));
      clearTimeout(_cicDetRevisarT); cicloDetenidoRevisarAhora();   // el diferido, sin depender del timer (pestaña estrangulada)
      PRUEBAS.igual(notifLocalLeer().length, 1, '🔴 al volver, el aviso queda en «Tus tareas» sin que nadie toque nada');
      PRUEBAS.igual(notifLocalLeer()[0].tipo, 'ciclo_detenido', 'del tipo ciclo_detenido');
      PRUEBAS.cierto(_cicDetAlVolver === false, 'y la anotación se consumió (una sola por vez)');
      /* DISCRIMINADOR · visible desde el principio, avisa en el acto */
      localStorage.removeItem(K_NOTIF_LOCAL);
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 1, 'DISCRIMINADOR · visible: avisa en el acto');
    } finally {
      window.showToast = origToast; _cicDetAlVolver = false;
      try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    }
  });
});

PRUEBAS.caso('🔴 «Actualizar» en Tus tareas muestra el cargador de cuadraditos mientras el pedido viaja, con lista y sin lista', async () => {
  const oCargar = window.tareasCargar, oPintar = window.tareasPintar;
  const prevLista = TAREAS.lista, prevPend = TAREAS.pendientes;
  let resolver = null;
  window.tareasCargar = () => new Promise(res => { resolver = res; });
  window.tareasPintar = () => { const c = document.getElementById('tareasLista'); if (c) c.innerHTML = '<div class="tar-item">x</div>'; };
  const btn = document.querySelector('#tareasOv .nom-pie .nom-link');
  try {
    TAREAS.lista = [{ id: 't1', titulo: 'Cita', detalle: '', origen: 'medico', estado: 'sin_leer', vence: '', creada: '', t0: 0 }];
    document.getElementById('tareasLista').innerHTML = '<div class="tar-item">antes</div>';
    const p = tareasRefrescar(btn);
    PRUEBAS.cierto(!!btn.querySelector('.cargador'), '🔴 el botón lleva el cargador de cuadraditos');
    PRUEBAS.cierto(btn.disabled && btn.textContent.indexOf(t('tar_actualizando')) >= 0, 'deshabilitado y dice «Actualizando…»');
    resolver();
    await p;
    PRUEBAS.igual(btn.querySelector('.cargador'), null, 'al terminar, el botón vuelve a ser «Actualizar»');
    PRUEBAS.cierto(!btn.disabled && btn.textContent === t('tar_actualizar'), 'habilitado y con su texto · ' + btn.textContent);
    /* sin botón (la campana) y con lista: la franja arriba de la lista */
    const p2 = tareasRefrescar();
    const franja = document.querySelector('#tareasLista .tar-cargando .cargador');
    PRUEBAS.cierto(!!franja, '🔴 desde la campana, con la lista ya pintada: la franja con el cargador arriba');
    resolver();
    await p2;
    PRUEBAS.igual(document.querySelector('#tareasLista .tar-cargando'), null, 'y se va al terminar');
    /* sin lista: el esqueleto de siempre */
    TAREAS.lista = []; localStorage.removeItem(K_NOTIF_LOCAL);
    const p3 = tareasRefrescar();
    PRUEBAS.cierto(!!document.querySelector('#tareasLista .sk-wrap'), 'sin nada que mostrar, el esqueleto de filas (como antes)');
    resolver(); await p3;
  } finally {
    window.tareasCargar = oCargar; window.tareasPintar = oPintar;
    TAREAS.lista = prevLista; TAREAS.pendientes = prevPend;
    try { btnSpin(btn, false); } catch(e){}
    try { document.getElementById('tareasLista').innerHTML = ''; } catch(e){}
  }
});

PRUEBAS.caso('🔴 P083 · la barra de progreso de los tests se ve desde la primera pregunta y llega a 100 % en la última, en los siete flujos', () => {
  const prevOv = document.getElementById('testOverlay').classList.contains('show');
  const barra = () => parseFloat(document.getElementById('testProgressBar').style.width) || 0;
  const flujos = [
    ['perelli', () => perelliState, PERELLI_STEPS, renderPerelliStep],
    ['kss', () => kssState, KSS_STEPS, renderKssStep],
    ['estres', () => estresState, ESTRES_STEPS, renderEstresStep],
    ['ansiedad', () => ansiedadState, ANSIEDAD_STEPS, renderAnsiedadStep],
    ['gastro', () => gastroState, GASTRO_STEPS, renderGastroStep],
    ['cansancio', () => cansancioState, CANSANCIO_STEPS, renderCansancioStep]
  ];
  try {
    flujos.forEach(([flow, st, pasos, render]) => {
      abrirTest({ testFlow: flow, id: 'p083-' + flow, nombre: flow });
      const total = pasos.length;
      PRUEBAS.alMenos(total, 2, 'guarda: ' + flow + ' tiene pasos');
      const primera = barra();
      PRUEBAS.cierto(primera > 0 && Math.abs(primera - Math.round(100 / total)) <= 1, '🔴 ' + flow + ' · en la primera pregunta la barra ya se ve (' + primera + ' % de ' + total + ')');
      st().stepIdx = total - 1; render();
      PRUEBAS.igual(barra(), 100, flow + ' · en la última pregunta llega a 100 %');
      try { navConsumir(); } catch(e){}
    });
    /* el flujo genérico (preguntas de TEST_DEPRESION) */
    abrirTest({ testFlow: 'depresion', id: 'p083-dep', nombre: 'dep' });
    const totalD = TEST_DEPRESION.length;
    PRUEBAS.cierto(barra() > 0 && Math.abs(barra() - Math.round(100 / totalD)) <= 1, '🔴 genérico · primera pregunta visible (' + barra() + ' %)');
    testIdx = totalD - 1; renderTestPaso();
    PRUEBAS.igual(barra(), 100, 'genérico · última pregunta 100 %');
    try { navConsumir(); } catch(e){}
    /* y la pista se ve: no es del color de la hoja. Se mide sobre una copia montada fuera de pantalla: el
       overlay puede haber quedado con `display:none` por un caso anterior, y ahí todo mide 0. */
    const sonda = document.createElement('div'); sonda.className = 'sheet'; sonda.style.cssText = 'position:absolute;left:-9999px;top:0;width:320px';
    sonda.innerHTML = '<div class="test-progress"><div class="test-progress-bar" style="width:20%"></div></div>';
    document.body.appendChild(sonda);
    try {
      const pista = getComputedStyle(sonda.querySelector('.test-progress')).backgroundColor;
      const hoja = getComputedStyle(sonda).backgroundColor;
      PRUEBAS.cierto(pista !== hoja && pista !== 'rgba(0, 0, 0, 0)', 'la pista tiene un color distinto de la hoja · ' + pista + ' vs ' + hoja);
      PRUEBAS.alMenos(Math.round(sonda.querySelector('.test-progress').getBoundingClientRect().height), 8, 'y 8 px de alto');
      PRUEBAS.cierto(sonda.querySelector('.test-progress-bar').getBoundingClientRect().width > 50, 'y la barra al 20 % mide algo (' + Math.round(sonda.querySelector('.test-progress-bar').getBoundingClientRect().width) + ' px)');
    } finally { sonda.remove(); }
  } finally {
    document.getElementById('testOverlay').classList.toggle('show', prevOv);
    document.getElementById('testProgressBar').style.width = '0%';
  }
});

PRUEBAS.caso('🔴 el login con la contraseña reiniciada: con perfil abre «elige una nueva»; sin perfil dice el camino (no «incorrecta»)', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oReloj = window.fetchConReloj, oToast = window.showToast, oOff = window.offHayConexion;
  window.showToast = () => {}; window.offHayConexion = () => true;
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: false, motivo: 'clave_reiniciada', error: 'Tu contraseña se reinició. Elige una nueva para continuar.' }) });
  try {
    /* sin perfil (reingreso): se le dice el camino */
    localStorage.removeItem(K_PROFILE);
    PRUEBAS.cierto(lgnAbrir(null, 'Consorcio HELITEC', '111'), 'guarda: el login abre');
    document.getElementById('lgnCed').value = '111'; document.getElementById('lgnPass').value = 'LaNueva9';
    lgnEntrar(document.getElementById('lgnBtn'));
    await PRUEBAS.esperarA(() => document.getElementById('lgnErr').textContent !== '', 3000);
    PRUEBAS.igual(document.getElementById('lgnErr').textContent, t('lgn_reiniciada_sin_perfil'), '🔴 sin perfil: «tu contraseña se reinició… Ingresar con el código y tu cédula», no «incorrecta»');
    PRUEBAS.falso(document.getElementById('claveOv').classList.contains('show'), 'y no abre elegir contraseña (no hay a quién ponérsela)');
    try { lgnCerrar(); } catch(e){}
    /* con el perfil de esa cédula: se abre «elige una nueva» */
    setProfile({ nombre: 'Ana Suárez', cedula: '111', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    PRUEBAS.cierto(lgnAbrir(null, 'Consorcio HELITEC', '111'), 'guarda: el login abre');
    document.getElementById('lgnCed').value = '111'; document.getElementById('lgnPass').value = 'LaNueva9';
    lgnEntrar(document.getElementById('lgnBtn'));
    await PRUEBAS.esperarA(() => document.getElementById('claveOv').classList.contains('show'), 3000);
    PRUEBAS.cierto(document.getElementById('claveOv').classList.contains('show'), '🔴 con perfil: se abre la pantalla de elegir la contraseña nueva');
    PRUEBAS.falso(document.getElementById('loginOv').classList.contains('show'), 'y el login se cierra');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; window.offHayConexion = oOff;
    try { document.getElementById('claveOv').classList.remove('show'); document.getElementById('loginOv').classList.remove('show'); syncScrollLock(); } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

/* ── la demostración, vista en computadora (Franco, 2026-09-17) ───────────────────────────── */
function bugDemoPayload(vista){
  const hoy = new Date().toISOString().slice(0, 10);
  return { ok:true, demo:true, rol:'supervisor', vista: vista || 'supervisor', combinada:true, referencia:{ kss:5 }, metricas:['kss'],
    registros:[{ persona:'Ana Suárez', empresa:'Empresa Demo', departamento:'Administración', cargo:'Piloto', fecha:hoy, kss:6 }],
    comentarios:[], pvt:[], aptitud:[], operacional:[], turnos:[], config:{ persistencia:3, anonN:5 }, marca:null, duty:null, ausencias:{} };
}

PRUEBAS.caso('🔴 en la demostración, la ✕ del panel vuelve al selector de vistas SIN pedir la clave; «Salir de la demostración» sí sale de todo', async () => {
  const prevDash = DASH, prevPayload = DEMO_PAYLOAD, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oToast = window.showToast;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.showToast = () => {};
  try {
    const params = { action:'demo', dispositivoId:'bug', pass:'clave-demo' };
    DEMO_PAYLOAD = { d: bugDemoPayload('supervisor'), params, scope: 'Empresa Demo' };
    onDashData(DEMO_PAYLOAD.d, 'Empresa Demo', params, 'supervisor');
    PRUEBAS.cierto(!!(DASH && DASH.demoMode) && getComputedStyle(document.getElementById('portalDash')).display !== 'none', 'guarda: el panel de la demo está abierto');
    closePortalUI();
    await PRUEBAS.esperarA(() => getComputedStyle(document.getElementById('portalGate')).display !== 'none', 2500);
    PRUEBAS.cierto(document.getElementById('portalOverlay').classList.contains('show') && getComputedStyle(document.getElementById('portalDash')).display === 'none', '🔴 la ✕ cierra el panel y deja el gate de la demostración a la vista');
    PRUEBAS.cierto(PORTAL_SOLO_DEMO && !!DEMO_PAYLOAD && DASH === null, '🔴 en modo demo, con el payload guardado (no se vuelve a pedir la clave)');
    PRUEBAS.falso(document.getElementById('splashOv').classList.contains('show'), 'sin volver a la portada');
    /* de ahí, otra vista entra sin viajar */
    portalMode('med');
    PRUEBAS.cierto(demoAplicarGuardado('medico'), '🔴 «Ver el panel de servicio médico» entra con lo guardado, sin red');
    PRUEBAS.igual(DASH && DASH.vista, 'medico', 'en la vista médica');
    /* «Salir de la demostración»: de todo */
    demoSalirUI();
    await PRUEBAS.esperarA(() => !document.getElementById('portalOverlay').classList.contains('show'), 2500);
    PRUEBAS.cierto(!document.getElementById('portalOverlay').classList.contains('show') && DEMO_PAYLOAD === null && !PORTAL_SOLO_DEMO, 'DISCRIMINADOR · «Salir de la demostración» cierra todo y borra el payload: la próxima vez se pide la clave');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.showToast = oToast;
    try { closePortal(true); } catch(e){}
    try { document.getElementById('splashOv').classList.remove('show'); } catch(e){}
    DEMO_PAYLOAD = prevPayload; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔴 R12 · el gate de la demostración en computadora (1366×768) entra sin scroll, con el botón a la vista, y el logo se ve sobre un disco navy', () => {
  const prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  try {
    PRUEBAS.enVentana(1366, 768, () => {
      demoAbrirGate();
      const gate = document.getElementById('portalGate'), btn = document.getElementById('portalDemoBtn'), logo = document.querySelector('#portalGate .pg-logo');
      PRUEBAS.comoMucho(gate.scrollHeight, gate.clientHeight + 1, '🔴 el gate no scrollea (' + gate.scrollHeight + ' de ' + gate.clientHeight + ')');
      const b = btn.getBoundingClientRect();
      PRUEBAS.cierto(b.top > 0 && b.bottom <= 768, '🔴 «Ver el panel de…» está a la vista sin scrollear (' + Math.round(b.top) + '–' + Math.round(b.bottom) + ')');
      const bg = getComputedStyle(logo).backgroundColor;
      PRUEBAS.cierto(getComputedStyle(logo).display !== 'none' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', '🔴 el logo (escudo blanco) tiene un fondo detrás · ' + bg);
      PRUEBAS.igual(bg, CTX.token('var(--navy)'), 'y es el navy de la marca (token, R13)');
    });
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj;
    try { closePortal(true); } catch(e){}
    try { document.getElementById('splashOv').classList.remove('show'); } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});
