PRUEBAS.grupo('P192 (2026-09-18) · «atrás» sin huérfanas: el descarte diferido y contado, el reuso de la entrada, el re-arme sólo cuando hace falta, y los diez cierres que no consumían');

/* Auditoría de uso real #25–#27 y #44 (barrido C). Camino real: los abridores de la app, los botones del DOM y el
   `popstate` real (un `history.back()` de verdad hace lo que hace el botón físico). Se mide con espías sobre
   `history.pushState`/`back`/`go` y con `_navPropias` (las entradas propias apiladas).
   ⚠️ R18 · cada caso deja el historial quieto antes de medir y espera los popstates que dispara. */

function p192Espiar(){
  const oP = history.pushState.bind(history), oB = history.back.bind(history), oG = history.go.bind(history);
  const c = { pushes: 0, backs: 0, gos: [] };
  history.pushState = function(){ c.pushes++; return oP.apply(history, arguments); };
  history.back = function(){ c.backs++; return oB.apply(history, arguments); };
  history.go = function(n){ c.gos.push(n); return oG.apply(history, arguments); };
  c.fin = () => { history.pushState = oP; history.back = oB; history.go = oG; };
  return c;
}
function p192EsperarPop(ms){
  return new Promise(res => { let hecho = false; const h = () => { if (hecho) return; hecho = true; window.removeEventListener('popstate', h); res(true); }; window.addEventListener('popstate', h); setTimeout(() => { if (!hecho){ hecho = true; window.removeEventListener('popstate', h); res(false); } }, ms || 700); });
}
async function p192Quieto(){ await PRUEBAS.historialQuieto(90, 1200); }
function p192Limpiar(){ document.querySelectorAll('.overlay.show, .ios-modal.show').forEach(o => o.classList.remove('show')); try { syncScrollLock(); } catch(e){} }

PRUEBAS.caso('🔴 P192 · un cierre por interfaz descarta su entrada y uno por el botón físico NO vuelve a armarla (antes: una huérfana por cada cierre con «atrás»)', async () => {
  await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  try {
    /* por interfaz: la ✕ de la documentación (uno de los diez cierres que no consumían) */
    admAbrirDoc();
    PRUEBAS.igual(c.pushes, 1, 'guarda: abrir apiló');
    PRUEBAS.igual(_navPropias, prop0 + 1, 'y el contador lo anota');
    document.querySelector('#docOverlay .portal-x').click();
    PRUEBAS.igual(c.backs, 0, 'el descarte NO es en el acto: se difiere al final de la tarea');
    await p192EsperarPop(900);
    PRUEBAS.igual(c.backs, 1, '🔴 la ✕ descartó la entrada (antes: no consumía → botón físico mudo una vez)');
    PRUEBAS.igual(_navPropias, prop0, 'y el contador vuelve');
    PRUEBAS.cierto(!document.getElementById('docOverlay').classList.contains('show'), 'cerrada');
    await p192Quieto();
    /* por el botón físico: un history.back() REAL dispara el popstate, silvaAtras cierra, y NO se vuelve a apilar */
    admAbrirDoc(); const pushesAntes = c.pushes;
    history.back(); await p192EsperarPop(900);
    PRUEBAS.cierto(!document.getElementById('docOverlay').classList.contains('show'), 'guarda: «atrás» cerró la documentación');
    PRUEBAS.igual(c.pushes, pushesAntes, '🔴 y NO se vuelve a armar la entrada (antes: `if (silvaAtras()) navPush()` siempre → una huérfana)');
    PRUEBAS.igual(_navPropias, prop0, 'contador en cero');
  } finally { c.fin(); p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🔴 P192 · retroceder DENTRO de una pantalla (pregunta del test) sí vuelve a armar la entrada: el test sigue abierto y necesita que «atrás» lo encuentre', async () => {
  p192Limpiar(); await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  try {
    CTX.resetear();
    try { cerrarTest(); } catch(e){}   // R18 · un test de otro flujo (Perelli) dejado a medias por un caso anterior desvía `retrocederTest`
    abrirTest({ id: 'p192', testFlow: 'kss', label: 'Prueba' });
    PRUEBAS.cierto(perelliState === null && kssState !== null, 'guarda R18: sólo el estado del KSS está vivo');
    PRUEBAS.igual(c.pushes, 1, 'guarda: el test apiló');
    kssAdvance(5);   // primera respuesta: ahora hay una pregunta a la que volver
    PRUEBAS.igual(navPantallasAbiertas().join(','), 'testOverlay', 'guarda R18: sólo el test está abierto (otro overlay colgado de un caso anterior desviaría «atrás») · ' + navPantallasAbiertas().join(','));
    PRUEBAS.cierto(kssState && kssState.stepIdx === 1 && !document.getElementById('testBackBtn').disabled, 'guarda: en la pregunta 2, con «atrás» del test habilitado');
    const pushesAntes = c.pushes;
    history.back(); await p192EsperarPop(900);
    PRUEBAS.cierto(document.getElementById('testOverlay').classList.contains('show'), 'guarda: «atrás» retrocedió de pregunta, el test sigue abierto');
    PRUEBAS.igual(kssState && kssState.stepIdx, 0, 'en la pregunta anterior');
    PRUEBAS.igual(c.pushes, pushesAntes + 1, '🔴 se volvió a armar la entrada (la pantalla sigue abierta)');
    PRUEBAS.igual(_navPropias, prop0 + 1, 'contador: una propia (la del test)');
    /* y el segundo «atrás», en la primera pregunta, cierra el test sin re-armar */
    history.back(); await p192EsperarPop(900);
    PRUEBAS.cierto(!document.getElementById('testOverlay').classList.contains('show'), 'segundo «atrás»: cierra el test');
    PRUEBAS.igual(c.pushes, pushesAntes + 1, 'DISCRIMINADOR · cerrado del todo, sin re-arme');
    PRUEBAS.igual(_navPropias, prop0, 'contador en cero');
  } finally { c.fin(); try { cerrarTest(); } catch(e){} p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🔴 P192 · dos cierres en la misma tarea (atajos del admin + panel) son UN solo go(-2): antes el segundo caía en la ventana de 400 ms y quedaba huérfano', async () => {
  await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  const prevDash = DASH;
  try {
    splashAbrirPortal();                 // el panel apila (P150)
    DASH = { atajosAdmin: [], params: { usuario: '*' } };
    admAtajosAbrir();                    // la hoja apila
    PRUEBAS.igual(c.pushes, 2, 'guarda: dos entradas propias');
    PRUEBAS.igual(_navPropias, prop0 + 2, 'contadas');
    admAtajosCerrarUI(); closePortalUI();   // lo que hace `admAtajoIr` cuando ya es esa persona
    await p192EsperarPop(900);
    PRUEBAS.igual(JSON.stringify(c.gos), '[-2]', '🔴 un solo traversal de dos (go(-2))');
    PRUEBAS.igual(c.backs, 0, 'y ningún back suelto');
    PRUEBAS.igual(_navPropias, prop0, 'contador en cero');
    PRUEBAS.cierto(!document.getElementById('portalOverlay').classList.contains('show') && !document.getElementById('admAtajosOv').classList.contains('show'), 'las dos cerradas');
  } finally { c.fin(); DASH = prevDash; _portalApilo = false; p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🔴 P192 · cerrar y abrir en la misma tarea REUSA la entrada (nada se apila ni se descarta): el carrusel → la nómina, la nómina → el formulario, el alta entera', async () => {
  await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  try {
    privAbrir();                       // una pantalla cualquiera con entrada propia
    PRUEBAS.igual(c.pushes, 1, 'guarda: apiló');
    privCerrarUI(); admAbrirDoc();     // cerrar por interfaz + abrir otra, en la misma tarea
    PRUEBAS.igual(c.pushes, 1, '🔴 la segunda NO apila: reusa la entrada de la primera');
    await p192EsperarPop(300);
    PRUEBAS.igual(c.backs, 0, 'y no se descarta nada (el pendiente se canceló)');
    PRUEBAS.igual(_navPropias, prop0 + 1, 'contador: una propia');
    admCerrarDocUI(); await p192EsperarPop(900);
    PRUEBAS.igual(c.backs, 1, 'DISCRIMINADOR · cerrar sin abrir otra sí descarta');
    PRUEBAS.igual(_navPropias, prop0, 'contador en cero');
    /* el alta: `altaEncadenar` cierra + descarta + avanza; la pantalla siguiente reusa */
    const prevLS = Object.assign({}, localStorage);
    try {
      setProfile({ nombre: 'Persona De Prueba', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34', esPiloto: true, id_piloto: 'P-1', telefono: '+58 000 0000000', email: 'p@prueba.com' });
      try { localStorage.removeItem(K_CONSENT); } catch(e){}
      const p1 = c.pushes;
      avanzarAlta();   // abre el consentimiento y apila
      PRUEBAS.cierto(document.getElementById('consent').classList.contains('show') && c.pushes === p1 + 1, 'guarda: el consentimiento apiló una');
      const s = { items: {} }; CONSENTIMIENTOS.forEach(x => { s.items[x.k] = x.v; }); consentSave(s);   // aceptado → lo siguiente
      document.getElementById('consent').classList.remove('show');
      altaEncadenar(function(){});
      PRUEBAS.igual(c.pushes, p1 + 1, '🔴 encadenar no apila: la siguiente pantalla reusa la entrada');
      await p192EsperarPop(300);
      PRUEBAS.igual(_navPropias, prop0 + (navPantallasAbiertas().length ? 1 : 0), 'y el contador dice una si quedó una pantalla del alta abierta, cero si el alta terminó · abiertas=' + navPantallasAbiertas().join(','));
    } finally {
      try { altaAbandonar(); } catch(e){}
      await p192EsperarPop(500);
      try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    }
  } finally { c.fin(); p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🔴 P192 · la cota: nunca se descarta más de lo que se apiló (un descuento no puede sacar a la persona de la app)', async () => {
  await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias; const st0 = history.state;
  try {
    history.replaceState({ silva: 1 }, '');   // el estado de arriba PARECE nuestro…
    _navPropias = 0;                           // …pero no apilamos nada
    navConsumir(); await p192EsperarPop(300);
    PRUEBAS.igual(c.backs + c.gos.length, 0, '🔴 con el contador en cero no se descarta aunque el estado diga «propio»');
    /* DISCRIMINADOR · con una propia apilada, sí */
    privAbrir(); privCerrarUI(); await p192EsperarPop(900);
    PRUEBAS.igual(c.backs, 1, 'DISCRIMINADOR · con una apilada, un descarte');
  } finally { c.fin(); _navPropias = prop0; try { history.replaceState(st0, ''); } catch(e){} p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🔴 P192 · si silvaAtras apiló por su cuenta (la demo vuelve al gate), el popstate NO apila otra encima: una pantalla, una entrada', async () => {
  await p192Quieto();
  const c = p192Espiar(); const oAtras = window.silvaAtras;
  try {
    window.silvaAtras = function(){ navPush(); return true; };   // lo que hace closePortal en la demo: demoAbrirGate → splashAbrirPortal → navPush
    privAbrir();                                   // algo que sacar con «atrás»
    history.back(); await p192EsperarPop(900);
    PRUEBAS.igual(c.pushes, 2, '🔴 la que apiló el manejador y nada más (antes: dos, la del manejador + el re-arme)');
    window.silvaAtras = oAtras;
    /* DISCRIMINADOR · si el manejador no cierra nada ni apila (retroceso interno), el popstate sí re-arma */
    window.silvaAtras = function(){ return true; };
    history.back(); await p192EsperarPop(900);
    PRUEBAS.igual(c.pushes, 3, 'DISCRIMINADOR · «manejado sin cerrar nada» = re-arme');
  } finally {
    window.silvaAtras = oAtras; c.fin();
    /* R18 · la privacidad quedó abierta con su entrada re-armada: se cierra por interfaz para que la descarte */
    if (document.getElementById('privOv').classList.contains('show')){ privCerrarUI(); await p192EsperarPop(900); }
    p192Limpiar(); await p192Quieto();
  }
});

PRUEBAS.caso('🔴 P192 · los diez cierres por interfaz pasan por navConsumir (y los del botón físico, no)', () => {
  const html = document.documentElement.outerHTML;
  const ui = { 'docOverlay': /admCerrarDocUI\(\)/, 'loginOv': /lgnCerrarUI\(\)/, 'privOv': /privCerrarUI\(\)/, 'recuperarOv': /recuperarCerrarUI\(\)/, 'nominaListOv': /nominaListCerrarUI\(\)/,
               'gestionesOverlay': /closeGestionesUI\(\)/, 'admAtajosOv': /admAtajosCerrarUI\(\)/, 'pvtOverlay': /closePVTUI\(\)/ };
  Object.keys(ui).forEach(id => {
    const ov = document.getElementById(id);
    const botones = [...ov.querySelectorAll('[onclick]')].map(b => b.getAttribute('onclick'));
    PRUEBAS.cierto(botones.some(o => ui[id].test(o)), id + ': su botón de cierre consume · ' + botones.join(' | ').slice(0, 120));
  });
  PRUEBAS.cierto(/restCerrarUI\(\)/.test(restFormHtml.toString()) && /restCerrarUI\(\)/.test(restGuardar.toString()), 'restricción: «Cancelar» y guardar consumen');
  PRUEBAS.cierto(/navConsumir\(\)/.test(mostrarVista.toString()) && /mostrarVista\('inicio', true\)/.test(silvaAtras.toString()), 'Más → Inicio por la barra consume; desde «atrás», no');
  /* los que llama silvaAtras siguen siendo los pelados (el navegador ya sacó la entrada) */
  const src = silvaAtras.toString();
  ['admCerrarDoc()', 'lgnCerrar()', 'privCerrar()', 'recuperarCerrar()', 'nominaListCerrar()', 'closeGestiones()', 'admAtajosCerrar()', 'closePVT()', 'restCerrar()'].forEach(f => {
    PRUEBAS.cierto(src.indexOf(f) >= 0 && src.indexOf(f.replace('()', 'UI()')) < 0, 'silvaAtras llama ' + f + ' pelado');
  });
  /* DISCRIMINADOR del instrumento */
  PRUEBAS.cierto(!/admCerrarDocUI\(\)/.test('onclick="admCerrarDoc()"'), 'DISCRIMINADOR · la expresión distingue el cierre pelado del que consume');
});

PRUEBAS.caso('🟡 P192 · «atrás» en un consentimiento actualizado a alguien registrado NO la manda al splash ni al carrusel: se queda (hay que aceptar); sin perfil completo, abandona el alta', () => {
  const prevLS = Object.assign({}, localStorage);
  try {
    /* sin perfil completo: abandona (como siempre) */
    try { localStorage.removeItem(K_PROFILE); } catch(e){}
    document.getElementById('consent').classList.add('show');
    PRUEBAS.cierto(silvaAtras() === true, 'manejado');
    PRUEBAS.cierto(!document.getElementById('consent').classList.contains('show') && document.getElementById('splashOv').classList.contains('show'), 'sin perfil: abandona el alta y vuelve al splash');
    /* con perfil completo y arranque completo (`_complete`): se queda. `_complete` es una const del arranque: acá se mide la
       rama por su condición (perfilCompleto) y el código que la lee */
    PRUEBAS.cierto(/perfilCompleto\(getProfile\(\)\) && _complete\) return true/.test(silvaAtras.toString()), 'con perfil completo y arranque completo, «atrás» no cierra el consentimiento (queda a la vista hasta aceptar)');
  } finally {
    document.getElementById('consent').classList.remove('show'); document.getElementById('splashOv').classList.remove('show');
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('🟡 P192 · la hoja de contraseña se cierra ANTES de abrir el login (los dos a z-index 1010: se veía la hoja sin error con el login invisible debajo)', async () => {
  const oReloj = window.fetchConReloj, oToast = window.showToast; let responder = null;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.showToast = () => {};
  const clave = document.getElementById('claveOv'), login = document.getElementById('loginOv');
  const btn = document.createElement('button'); document.body.appendChild(btn);
  try {
    clave.classList.add('show');
    clvEntrarConClaveRecien('Empresa De Prueba', '99999999', 'clave-de-prueba', btn);
    responder({ json: () => Promise.resolve({ ok: false, error: 'no' }) });
    for (let i = 0; i < 12; i++) await null;
    PRUEBAS.cierto(login.classList.contains('show'), 'guarda: el login se abrió');
    PRUEBAS.cierto(!clave.classList.contains('show'), '🟡 y la hoja de contraseña ya no está encima');
    PRUEBAS.cierto(Number(getComputedStyle(clave).zIndex) === Number(getComputedStyle(login).zIndex), 'guarda: los dos tienen el mismo z-index (por eso el orden del DOM decidía)');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; btn.remove(); clave.classList.remove('show');
    if (login.classList.contains('show')){ lgnCerrarUI(); await p192EsperarPop(900); } else login.classList.remove('show');   // R18 · el login apiló: se descarta
    try { syncScrollLock(); } catch(e){} await p192Quieto();
  }
});

PRUEBAS.caso('🟡 P192 · departamentos: con un pedido en vuelo para el mismo nombre, un segundo «Agregar» (doble Enter sin `inert`) no manda otro POST', async () => {
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost, oReq = window.dashRequest, oToast = window.showToast, oBit = window.bitacoraRegistrar, oLim = window.listasCacheLimpiar;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10);
  try {
    onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: { kss: 5 }, metricas: ['kss'], registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }], aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1 },
      'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-p192', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'p192' }, 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  const posts = [], resolvers = [];
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body)); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.dashRequest = () => new Promise(() => {}); window.showToast = () => {}; window.bitacoraRegistrar = () => {}; window.listasCacheLimpiar = () => {};
  const inp = document.getElementById('depNuevo'), mas = document.querySelector('#depAltaCaja .gest-quick-btn');
  const lista0 = DEPS.lista.slice(), emp0 = DEPS.empresa, pe0 = DEPS.puedeEditar;
  try {
    DEPS.lista = [{ nombre: 'Operaciones', activo: true }]; DEPS.empresa = 'Empresa De Prueba'; DEPS.puedeEditar = true; DEPS._enVuelo = {};
    inp.value = 'Mantenimiento'; depAgregar(mas);
    inp.value = 'Mantenimiento'; depAgregar(mas);   // el doble Enter
    inp.value = ' mantenimiento '; depAgregar(mas); // y con otra forma del mismo nombre
    PRUEBAS.igual(posts.length, 1, '🟡 un solo POST mientras el primero viaja (antes: dos filas de bitácora, dos «actualizado»)');
    resolvers[0]({ json: () => Promise.resolve({ ok: true, nuevo: true }) }); for (let i = 0; i < 12; i++) await null;
    PRUEBAS.igual(Object.keys(DEPS._enVuelo).length, 0, 'al terminar se suelta el candado');
    inp.value = 'Mantenimiento'; depAgregar(mas);
    PRUEBAS.igual(posts.length, 2, 'DISCRIMINADOR · terminado el primero, el siguiente sí sale');
    resolvers[1]({ json: () => Promise.resolve({ ok: false }) }); for (let i = 0; i < 12; i++) await null;
    /* otro nombre no espera al primero */
    inp.value = 'Logística'; depAgregar(mas); inp.value = 'Compras'; depAgregar(mas);
    PRUEBAS.igual(posts.length, 4, 'nombres distintos viajan en paralelo (el candado es por nombre)');
    resolvers[2]({ json: () => Promise.resolve({ ok: false }) }); resolvers[3]({ json: () => Promise.resolve({ ok: false }) }); for (let i = 0; i < 12; i++) await null;
  } finally {
    window.dashRequest = oReq; window.showToast = oToast; window.bitacoraRegistrar = oBit; window.listasCacheLimpiar = oLim; window.gestPost = oPost; window.fetchConReloj = oReloj;
    DEPS.lista = lista0; DEPS.empresa = emp0; DEPS.puedeEditar = pe0; DEPS.cargando = false; DEPS._enVuelo = {}; if (inp) inp.value = ''; btnSpin(mas, false);
    const b = document.getElementById('depBody'); if (b) b.innerHTML = ''; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔴 P192 · un login exitoso ENCIMA de otra pantalla descarta sólo la suya: la de abajo conserva su entrada (antes: «por cuenta», y el test o el panel de abajo se quedaban sin entrada → «atrás» salía de la app)', async () => {
  p192Limpiar(); await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  try {
    privAbrir();                                  // la pantalla de abajo (un test, el panel, Más…) con su entrada
    lgnAbrir(null, 'Empresa De Prueba', '99999999');   // el login se abre encima (necesita_clave a los 5 s)
    PRUEBAS.igual(_navPropias, prop0 + 2, 'guarda: dos propias');
    /* lo que hace el login exitoso: cerrar el login y, «si estaban», la nómina y el formulario */
    lgnCerrarUI(true); cerrarSiAbierta('nominaOv', nominaCerrar); cerrarSiAbierta('setup', closeSetup);
    await p192EsperarPop(900);
    PRUEBAS.igual(c.backs + c.gos.reduce((a, n) => a + Math.abs(n), 0), 1, '🔴 se descartó UNA (la del login), no dos');
    PRUEBAS.igual(_navPropias, prop0 + 1, 'la pantalla de abajo conserva su entrada');
    PRUEBAS.cierto(document.getElementById('privOv').classList.contains('show') && !document.getElementById('loginOv').classList.contains('show'), 'y sigue abierta, con el login cerrado');
    /* y el camino del admin (login que nunca se abrió): no descarta nada */
    lgnCerrarUI(true); await p192EsperarPop(300);
    PRUEBAS.igual(_navPropias, prop0 + 1, 'con el login cerrado, lgnCerrarUI no descarta (el admin «entra como» sin login)');
    /* DISCRIMINADOR · con la nómina abierta debajo sí se descarta la suya también */
    document.getElementById('nominaOv').classList.add('show'); navPush();
    cerrarSiAbierta('nominaOv', nominaCerrar); await p192EsperarPop(900);
    PRUEBAS.igual(_navPropias, prop0 + 1, 'DISCRIMINADOR · la nómina abierta sí descarta la suya');
  } finally { c.fin(); if (document.getElementById('privOv').classList.contains('show')){ privCerrarUI(); await p192EsperarPop(900); } p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🟢 P192 · «No tengo contraseña» con el formulario abierto debajo: el formulario descarta la suya y la nómina reusa la del login (antes: una huérfana)', async () => {
  p192Limpiar(); await p192Quieto();
  const c = p192Espiar(); const prop0 = _navPropias;
  const oAbrir = window.nominaAbrir; let abrio = 0; window.nominaAbrir = function(){ abrio++; document.getElementById('nominaOv').classList.add('show'); navPush(); };
  try {
    document.getElementById('setup').classList.add('show'); navPush();      // el formulario de revisión, con su entrada (precondición)
    lgnAbrir(null, 'Empresa De Prueba', '99999999');                          // «Ya me había registrado» encima
    PRUEBAS.igual(_navPropias, prop0 + 2, 'guarda: formulario + login');
    lgnSinClave();
    await p192EsperarPop(900);
    PRUEBAS.igual(abrio, 1, 'guarda: abrió la nómina');
    PRUEBAS.igual(_navPropias, prop0 + 1, '🟢 queda UNA: la de la nómina (el formulario descartó la suya; el login se la traspasó a la nómina)');
    PRUEBAS.cierto(!document.getElementById('setup').classList.contains('show') && !document.getElementById('loginOv').classList.contains('show'), 'formulario y login cerrados');
  } finally { window.nominaAbrir = oAbrir; c.fin(); if (document.getElementById('nominaOv').classList.contains('show')){ document.getElementById('nominaOv').classList.remove('show'); navConsumir(); await p192EsperarPop(900); } p192Limpiar(); await p192Quieto(); }
});

PRUEBAS.caso('🟡 P192 · el «Atrás» de la pantalla del consentimiento hace lo mismo que el botón físico (y a la persona registrada no se le muestra)', () => {
  const prevLS = Object.assign({}, localStorage);
  try {
    try { localStorage.removeItem(K_PROFILE); } catch(e){}
    document.getElementById('consent').classList.add('show');
    consentAtras();
    PRUEBAS.cierto(!document.getElementById('consent').classList.contains('show') && document.getElementById('splashOv').classList.contains('show'), 'sin perfil: el botón de la pantalla abandona el alta, igual que el físico');
    PRUEBAS.cierto(/consentAtras\(\)/.test(document.getElementById('consentAtrasBtn').getAttribute('onclick')), 'el botón del HTML pasa por consentAtras');
    PRUEBAS.cierto(/perfilCompleto\(getProfile\(\)\) && _complete\) return;/.test(consentAtras.toString()) && /consentAtrasBtn/.test(consentRender.toString()), 'con perfil completo y arranque completo: no hace nada y el botón se oculta al pintar');
  } finally {
    document.getElementById('consent').classList.remove('show'); document.getElementById('splashOv').classList.remove('show');
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { syncScrollLock(); } catch(e){}
  }
});
