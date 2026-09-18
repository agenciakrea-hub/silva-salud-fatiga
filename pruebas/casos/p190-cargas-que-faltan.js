PRUEBAS.grupo('P190 (2026-09-18) · las cargas que faltan: departamentos con cargador, franja en las relecturas, «entrar como» con cargador, informe sin congelar el panel, #offBar sobre los overlays, «Actualizando…» en el inicio');

/* Auditoría de uso real (barrido A): la suite garantizaba sólo el bloqueo (la atenuación), que Franco no cuenta
   como feedback. Camino real en cada caso: el botón/función que la persona toca, con la red controlable. */

function p190Tick(){ return (async () => { for (let i = 0; i < 12; i++) await null; })(); }
function p190Sup(vista, rol){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10);
  const payload = { ok: true, rol: rol || 'supervisor', vista: vista || 'supervisor', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }],
    aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1,
    atajosAdmin: [{ empresa: 'Empresa De Prueba', nombre: 'Persona De Prueba', cedula: '99999999' }] };
  try {
    onDashData(payload, 'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-p190', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'p190' }, vista || 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} };
}

PRUEBAS.caso('P190 · btnSpin sin rótulo: `labelOn === false` deja sólo el cargador (para el «+» de departamentos)', () => {
  const b = document.createElement('button'); b.textContent = '+'; document.body.appendChild(b);
  try {
    btnSpin(b, true, false);
    PRUEBAS.cierto(!!b.querySelector('.cargador.cargador--solo') && b.textContent.trim() === '', 'sólo el cargador, sin «Cargando…» al lado');
    btnSpin(b, false);
    PRUEBAS.igual(b.textContent, '+', 'y vuelve el «+»');
    /* DISCRIMINADOR · con rótulo (o sin pasar nada) sí hay texto */
    btnSpin(b, true); PRUEBAS.cierto(b.textContent.indexOf(t('cargando')) >= 0 && !b.querySelector('.cargador--solo'), 'DISCRIMINADOR · sin `false` sale el rótulo de siempre');
    btnSpin(b, false);
  } finally { b.remove(); }
});

PRUEBAS.caso('🟡 P190 · relectura de la NÓMINA: la lista se queda y arriba aparece la franja con el cargador (antes: sólo atenuación; el esqueleto era sólo la primera vez)', async () => {
  const fin = p190Sup();
  const oReq = window.dashRequest; let responder = null;
  window.dashRequest = () => new Promise(res => { responder = res; });
  const body = document.getElementById('nomListBody');
  const datos0 = NOMLIST.datos.slice(), total0 = NOMLIST.total, reg0 = NOMLIST.registrados;
  try {
    NOMLIST.datos = [{ persona: 'Persona De Prueba', cedula: 'V-99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', registrado: true }];
    nominaListFiltrar();
    PRUEBAS.cierto(body.children.length > 0 && !body.querySelector('.sk-wrap'), 'guarda: hay lista pintada (no esqueleto)');
    nominaListCargar();
    PRUEBAS.cierto(!!body.querySelector('.tar-cargando .cargador'), '🟡 relectura: la franja con el cargador arriba de la lista');
    PRUEBAS.cierto(!body.querySelector('.sk-wrap'), 'y la lista vieja sigue a la vista (no se reemplazó por el esqueleto)');
    nominaListCargar();   // NOMLIST.cargando: no duplica la franja
    PRUEBAS.igual(body.querySelectorAll('.tar-cargando').length, 1, 'una sola franja aunque se vuelva a pedir');
    responder({ ok: true, nomina: NOMLIST.datos, total: 1, registrados: 1 }); await p190Tick();
    PRUEBAS.igual(body.querySelector('.tar-cargando'), null, 'al llegar, la franja se va');
    /* DISCRIMINADOR · primera carga (lista vacía): el esqueleto, no la franja */
    NOMLIST.datos = []; body.innerHTML = '';
    nominaListCargar();
    PRUEBAS.cierto(!!body.querySelector('.sk-wrap') && !body.querySelector('.tar-cargando'), 'DISCRIMINADOR · sin lista previa, el esqueleto de siempre');
    responder({ ok: false, error: 'x' }); await p190Tick();
  } finally { window.dashRequest = oReq; NOMLIST.datos = datos0; NOMLIST.total = total0; NOMLIST.registrados = reg0; NOMLIST.cargando = false; if (body) body.innerHTML = ''; fin(); }
});

PRUEBAS.caso('🟡 P190 · departamentos: el botón que disparó muestra el cargador; «Agregar» vacía el campo SÓLO si salió bien; la relectura muestra la franja', async () => {
  const fin = p190Sup();
  const oReloj = window.fetchConReloj, oReq = window.dashRequest, oToast = window.showToast, oBit = window.bitacoraRegistrar, oLim = window.listasCacheLimpiar;
  const resolvers = []; let relecturas = 0;
  window.fetchConReloj = () => new Promise(res => { resolvers.push(res); });
  window.dashRequest = () => { relecturas++; return new Promise(() => {}); };
  window.showToast = () => {}; window.bitacoraRegistrar = () => {}; window.listasCacheLimpiar = () => {};
  const inp = document.getElementById('depNuevo'), mas = document.querySelector('#depAltaCaja .gest-quick-btn'), body = document.getElementById('depBody');
  const lista0 = DEPS.lista.slice(), emp0 = DEPS.empresa, pe0 = DEPS.puedeEditar;
  try {
    DEPS.lista = [{ nombre: 'Operaciones', activo: true }]; DEPS.empresa = 'Empresa De Prueba'; DEPS.puedeEditar = true; body.innerHTML = '<div>lista</div>';
    inp.value = 'Mantenimiento';
    depAgregar(mas);
    PRUEBAS.cierto(mas.classList.contains('btn-loading') && !!mas.querySelector('.cargador--solo'), '🟡 el «+» muestra el cargador (sin rótulo) mientras viaja');
    PRUEBAS.igual(inp.value, 'Mantenimiento', 'y lo escrito sigue en el campo (antes se vaciaba en el acto)');
    resolvers[0]({ json: () => Promise.resolve({ ok: true, nuevo: true }) }); await p190Tick();
    PRUEBAS.igual(inp.value, '', 'salió bien: el campo se vacía');
    PRUEBAS.cierto(!mas.classList.contains('btn-loading') && mas.textContent.trim() === '+', 'y el «+» vuelve');
    PRUEBAS.cierto(relecturas >= 1 && !!body.querySelector('.tar-cargando'), 'la relectura muestra la franja sobre la lista');
    /* falla: el campo conserva lo escrito y el botón vuelve */
    inp.value = 'Logística';
    depAgregar(mas);
    resolvers[1]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p190Tick();
    PRUEBAS.igual(inp.value, 'Logística', 'falló: lo escrito NO se pierde');
    PRUEBAS.cierto(!mas.classList.contains('btn-loading'), 'y el botón vuelve igual');
    /* baja: el botón de la fila con «Guardando…» */
    const oConfirm = window.confirm; window.confirm = () => true;
    try {
      const fila = document.createElement('button'); fila.setAttribute('data-dep', 'Operaciones'); fila.textContent = 'Dar de baja'; document.body.appendChild(fila);
      depPedirBaja(fila);
      PRUEBAS.cierto(fila.classList.contains('btn-loading') && fila.textContent.indexOf(t('guardando')) >= 0, 'dar de baja: el botón de la fila gira con «Guardando…»');
      resolvers[2]({ json: () => Promise.resolve({ ok: true, baja: true }) }); await p190Tick();
      PRUEBAS.cierto(!fila.classList.contains('btn-loading'), 'y vuelve al terminar');
      fila.remove();
    } finally { window.confirm = oConfirm; }
  } finally {
    window.fetchConReloj = oReloj; window.dashRequest = oReq; window.showToast = oToast; window.bitacoraRegistrar = oBit; window.listasCacheLimpiar = oLim;
    DEPS.lista = lista0; DEPS.empresa = emp0; DEPS.puedeEditar = pe0; DEPS.cargando = false; if (inp) inp.value = ''; if (body) body.innerHTML = ''; btnSpin(mas, false); fin();
  }
});

PRUEBAS.caso('🟡 P190 · «Entrar como X»: el cuerpo del panel muestra el cargador con el nombre; si falla, el panel vuelve y se dice por qué', async () => {
  const fin = p190Sup('supervisor', 'admin');   // los atajos sólo se guardan con rol admin (ADR 007)
  const oReloj = window.fetchConReloj, oToast = window.showToast, oNav = window.navConsumir, oCerrar = window.admAtajosCerrar, oRep = window.dashRepintar;
  const resolvers = [], toasts = []; let repintes = 0;
  window.fetchConReloj = () => new Promise(res => { resolvers.push(res); });
  window.showToast = m => toasts.push(String(m)); window.navConsumir = () => {}; window.admAtajosCerrar = () => {}; window.dashRepintar = () => { repintes++; };
  const prevLS = Object.assign({}, localStorage);
  const cuerpo = document.getElementById('dashBody');
  try {
    try { cargaBloquear(document.getElementById('portalDash'), 'reset'); } catch(e){}   // R18 · un bloqueo colgado por un caso anterior (fetch cortado por el candado) no es de este caso
    try { localStorage.removeItem(K_PROFILE); } catch(e){}   // sin perfil: entra directo (P166b)
    admAtajoIr(0);
    PRUEBAS.cierto(document.getElementById('dashScroll').hasAttribute('inert'), 'guarda: la zona quedó bloqueada mientras viaja');
    const caja = cuerpo.querySelector('.cargando-caja');
    PRUEBAS.cierto(!!caja && caja.textContent.indexOf('Persona De Prueba') >= 0, '🟡 el panel muestra el cargador con «Entrando como Persona De Prueba…» (antes: toast de 2,6 s y panel gris)');
    PRUEBAS.igual(toasts.length, 0, 'sin toast (el cargador ya lo dice)');
    await p190Tick(); const rep0 = repintes;   // los pedidos laterales del panel (gestiones, casos) también repintan: se cuenta desde acá
    resolvers[0]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p190Tick();
    PRUEBAS.cierto(repintes > rep0, 'falló: el panel vuelve (dashRepintar) · ' + rep0 + ' → ' + repintes);
    PRUEBAS.cierto(/no se pudo/i.test(toasts[toasts.length - 1] || ''), 'y se dice por qué');
    PRUEBAS.cierto(cuerpo.getAttribute('aria-busy') !== 'true' && !document.getElementById('dashScroll').hasAttribute('inert'), 'y la zona se liberó');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; window.navConsumir = oNav; window.admAtajosCerrar = oCerrar; window.dashRepintar = oRep;
    try { cargaBloquear(document.getElementById('portalDash'), 'reset'); } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    fin();
  }
});

PRUEBAS.caso('🟡 P190 · el informe IA bloquea SÓLO su sección, no el panel entero; el cargador dice cuánto suele tardar', async () => {
  const fin = p190Sup('medico');
  const oReloj = window.fetchConReloj, oToast = window.showToast; const resolvers = [];
  window.fetchConReloj = () => new Promise(res => { resolvers.push(res); });
  window.showToast = () => {};
  try {
    DASH._informesLoaded = true; DASH._informesProximo = null;
    renderDash();
    const sec = document.getElementById('dsec-informe'), scroll = document.getElementById('dashScroll');
    PRUEBAS.cierto(!!sec && !!document.getElementById('informeBtn'), 'guarda: la sección del informe y su botón están');
    dashGenerarInforme();
    PRUEBAS.cierto(sec.hasAttribute('inert') && sec.getAttribute('aria-busy') === 'true', '🟡 la sección del informe queda bloqueada…');
    PRUEBAS.cierto(!scroll.hasAttribute('inert'), '…y el resto del panel NO (antes: 40-90 s con todo inerte)');
    const out = document.getElementById('informeOut');
    PRUEBAS.cierto(!!out.querySelector('.cargando-caja') && out.textContent.indexOf(t('inf_tarda')) >= 0, 'el cargador dice cuánto suele tardar · ' + t('inf_tarda'));
    PRUEBAS.cierto(/minuto|minute/i.test(t('inf_tarda')) && typeof I18N.en._.inf_tarda === 'string', 'texto en es y en');
    resolvers[0]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p190Tick();
    PRUEBAS.cierto(!sec.hasAttribute('inert'), 'al fallar se libera');
  } finally { window.fetchConReloj = oReloj; window.showToast = oToast; try { startDashAutoRefresh(); stopDashAutoRefresh(); } catch(e){} fin(); }
});

PRUEBAS.caso('🟡 P190 · #offBar («Enviando N registros…») queda por encima del panel y las hojas, y se esconde durante un test o el PVT', () => {
  const bar = document.getElementById('offBar'), test = document.getElementById('testOverlay'), pvt = document.getElementById('pvtOverlay');
  const ov = document.createElement('div'); ov.className = 'overlay show'; document.body.appendChild(ov);
  const disp0 = bar.style.display;
  try {
    bar.style.display = 'block';
    const z = Number(getComputedStyle(bar).zIndex), zo = Number(getComputedStyle(ov).zIndex);
    PRUEBAS.cierto(z > zo, '🟡 la barra (' + z + ') está por encima del overlay (' + zo + ') · antes: 901, debajo de todo');
    PRUEBAS.cierto(z < 1010 && z < 1100, 'y por debajo de las pantallas de contraseña (1010) y del toast (1100)');
    test.classList.add('show');
    PRUEBAS.igual(getComputedStyle(bar).display, 'none', 'con un test abierto, la barra se esconde (no tapa las respuestas)');
    test.classList.remove('show'); pvt.classList.add('show');
    PRUEBAS.igual(getComputedStyle(bar).display, 'none', 'ídem con el PVT');
    pvt.classList.remove('show');
    PRUEBAS.igual(getComputedStyle(bar).display, 'block', 'DISCRIMINADOR · sin test ni PVT, se ve');
  } finally { ov.remove(); test.classList.remove('show'); pvt.classList.remove('show'); bar.style.display = disp0; try { syncScrollLock(); } catch(e){} }
});

PRUEBAS.caso('🟡 P190 · el inicio dice «Actualizando…» mientras sincroniza con el servidor (antes el semáforo cambiaba solo, sin explicación)', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oReloj = window.fetchConReloj, oToast = window.showToast; let responder = null;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.showToast = () => {};
  try {
    setProfile({ nombre: 'Persona De Prueba', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    _misSincronizando = false; iniSyncPintar(false);
    renderInicio();
    const pill = document.getElementById('iniSync');
    PRUEBAS.cierto(!!pill && pill.hidden, 'guarda: la píldora existe en la cabecera de «Tu estado hoy», oculta');
    PRUEBAS.cierto(!!pill.closest('.ini-est-head'), 'y vive en la cabecera (a la vista aunque el bloque esté plegado)');
    PRUEBAS.cierto(!simulando() && !_misSincronizando && window.misSincronizar.toString().indexOf('fetchConReloj') >= 0, 'guarda: misSincronizar es la real y puede salir (R18: ningún caso anterior la dejó estubada)');
    const p = misSincronizar();
    PRUEBAS.cierto(typeof responder === 'function', 'guarda: el pedido salió');
    PRUEBAS.cierto(!document.getElementById('iniSync').hidden, '🟡 con el pedido en vuelo, «Actualizando…» se ve');
    PRUEBAS.igual(document.getElementById('iniSync').textContent.trim(), t('ini_sincronizando'), 'con el texto del diccionario');
    PRUEBAS.cierto(!!document.getElementById('iniSync').querySelector('.cargador'), 'y el cargador chico');
    renderInicio();   // un repintado en medio la conserva
    PRUEBAS.cierto(!document.getElementById('iniSync').hidden, 'un repintado en medio la conserva');
    responder({ json: () => Promise.resolve({ ok: false }) }); await p; await p190Tick();
    PRUEBAS.cierto(document.getElementById('iniSync').hidden, 'al terminar (bien o mal) se oculta');
    PRUEBAS.cierto(typeof I18N.en._.ini_sincronizando === 'string', 'texto en en');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; _misSincronizando = false; iniSyncPintar(false);
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { refreshStates(); renderInicio(); } catch(e){}
  }
});

PRUEBAS.caso('🟡 P190 · el informe en vuelo sobrevive a un renderDash() en el medio: el botón vuelve a nacer apagado y no sale un segundo POST (verificador)', async () => {
  const fin = p190Sup('medico');
  const oReloj = window.fetchConReloj, oToast = window.showToast; const resolvers = [], posts = [];
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body).action); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.showToast = () => {};
  try {
    DASH._informesLoaded = true; DASH._informesProximo = null;
    renderDash();
    dashGenerarInforme();
    PRUEBAS.igual(posts.filter(a => a === 'informe').length, 1, 'guarda: un POST informe en vuelo');
    renderDash();   // cambio de indicador / período / ↻ con datos nuevos en medio de los 40-90 s
    const btn = document.getElementById('informeBtn'), out = document.getElementById('informeOut');
    PRUEBAS.cierto(!!btn && btn.disabled && btn.classList.contains('btn-loading'), '🟡 tras el repintado, el botón nace apagado y con el cargador (antes: verde y tocable)');
    PRUEBAS.cierto(!!out && !!out.querySelector('.cargando-caja'), 'y la caja sigue diciendo que se está generando');
    dashGenerarInforme();   // un toque más (o un onclick que sobrevivió)
    PRUEBAS.igual(posts.filter(a => a === 'informe').length, 1, '🟡 no sale un segundo POST mientras el primero viaja');
    resolvers[0]({ json: () => Promise.resolve({ ok: false, error: 'No se pudo (prueba)' }) }); await p190Tick();
    PRUEBAS.cierto(DASH._informeEnVuelo === false, 'al terminar se suelta la bandera');
    const btn2 = document.getElementById('informeBtn'), out2 = document.getElementById('informeOut');
    PRUEBAS.cierto(!!btn2 && !btn2.disabled, 'y el botón (el NUEVO, por id) vuelve');
    PRUEBAS.cierto(!!out2 && /no se pudo/i.test(out2.textContent), 'y el error se ve en la caja nueva, no en un nodo desprendido');
    /* DISCRIMINADOR · con la bandera suelta, sí sale otro POST */
    dashGenerarInforme();
    PRUEBAS.igual(posts.filter(a => a === 'informe').length, 2, 'DISCRIMINADOR · terminado el primero, el siguiente sí sale');
    resolvers[1]({ json: () => Promise.resolve({ ok: false }) }); await p190Tick();
  } finally { window.fetchConReloj = oReloj; window.showToast = oToast; if (DASH) DASH._informeEnVuelo = false; try { stopDashAutoRefresh(); } catch(e){} fin(); }
});

PRUEBAS.caso('🟡 P190 · dar de baja un área CON gente: el cargador del botón dura hasta el pedido forzado (la recursión se devuelve); y en la demo «Agregar» vacía el campo', async () => {
  const fin = p190Sup();
  const oReloj = window.fetchConReloj, oReq = window.dashRequest, oToast = window.showToast, oBit = window.bitacoraRegistrar, oLim = window.listasCacheLimpiar, oConfirm = window.confirm;
  const resolvers = [], posts = [];
  window.fetchConReloj = (u, o) => { try { posts.push(JSON.parse(o.body)); } catch(e){} return new Promise(res => { resolvers.push(res); }); };
  window.dashRequest = () => new Promise(() => {}); window.showToast = () => {}; window.bitacoraRegistrar = () => {}; window.listasCacheLimpiar = () => {}; window.confirm = () => true;
  const lista0 = DEPS.lista.slice(), emp0 = DEPS.empresa, pe0 = DEPS.puedeEditar;
  const fila = document.createElement('button'); fila.setAttribute('data-dep', 'Operaciones'); fila.textContent = 'Dar de baja'; document.body.appendChild(fila);
  const inp = document.getElementById('depNuevo');
  try {
    DEPS.lista = [{ nombre: 'Operaciones', activo: true }]; DEPS.empresa = 'Empresa De Prueba'; DEPS.puedeEditar = true;
    depPedirBaja(fila);
    PRUEBAS.cierto(fila.classList.contains('btn-loading'), 'guarda: gira con el primer pedido');
    resolvers[0]({ json: () => Promise.resolve({ ok: false, motivo: 'con_gente', n: 2, personas: ['A', 'B'] }) }); await p190Tick();
    PRUEBAS.igual(posts.length, 2, 'con gente: confirmó y salió el pedido forzado');
    PRUEBAS.igual(posts[1].forzar, '1', 'con forzar');
    PRUEBAS.cierto(fila.classList.contains('btn-loading'), '🟡 y el botón SIGUE girando mientras el forzado viaja (antes se apagaba entre los dos)');
    resolvers[1]({ json: () => Promise.resolve({ ok: true, baja: true }) }); await p190Tick();
    PRUEBAS.cierto(!fila.classList.contains('btn-loading'), 'y vuelve al terminar el forzado');
    /* demo: «aplicado en el ejemplo» y el campo se vacía, como siempre */
    DASH.demoMode = true; inp.value = 'Mantenimiento';
    depAgregar(document.querySelector('#depAltaCaja .gest-quick-btn')); await p190Tick();
    PRUEBAS.igual(posts.length, 2, 'demo: no sale nada a la red');
    PRUEBAS.igual(inp.value, '', 'demo: el campo se vacía (se aplicó en el ejemplo)');
  } finally {
    fila.remove(); window.fetchConReloj = oReloj; window.dashRequest = oReq; window.showToast = oToast; window.bitacoraRegistrar = oBit; window.listasCacheLimpiar = oLim; window.confirm = oConfirm;
    DEPS.lista = lista0; DEPS.empresa = emp0; DEPS.puedeEditar = pe0; DEPS.cargando = false; if (inp) inp.value = ''; const b = document.getElementById('depBody'); if (b) b.innerHTML = ''; fin();
  }
});

PRUEBAS.caso('🟡 P190 · «Cargando informes previos…» se va cuando llega la respuesta (repinta SU sección, aunque la pestaña «activa» sea otra), sin rehacer el panel entero', async () => {
  const fin = p190Sup('medico');
  const oReloj = window.fetchConReloj, oRep = window.dashRepintar; let responder = null, repintes = 0;
  window.fetchConReloj = () => new Promise(res => { responder = res; }); window.dashRepintar = () => { repintes++; };
  try {
    DASH._informesLoaded = false; DASH._informesLoading = false; DASH.tab = 'resumen';
    renderDash();   // el médico tiene la sección del informe; al no estar cargado, renderInforme dispara dashLoadInformes
    const sec = document.getElementById('dsec-informe');
    PRUEBAS.cierto(!!sec && DASH._informesLoading === true && typeof responder === 'function', 'guarda: la sección está y el pedido salió');
    PRUEBAS.cierto(sec.textContent.indexOf(t('inf_cargando')) >= 0, 'guarda: dice «Cargando informes previos…»');
    /* otra sección bloqueada mientras tanto (un período viajando): NO tiene que perder su bloqueo por esta respuesta */
    const otra = [...document.querySelectorAll('#dashBody section')].find(x => x !== sec); if (otra) cargaBloquear(otra, true);
    await p190Tick(); const r0 = repintes;
    responder({ json: () => Promise.resolve({ ok: true, informes: [], proximo: null }) }); await p190Tick();
    const sec2 = document.getElementById('dsec-informe');
    PRUEBAS.cierto(DASH._informesLoaded === true && sec2 === sec && sec2.textContent.indexOf(t('inf_cargando')) < 0, '🟡 al llegar, la sección del informe se repinta en su lugar y deja de decir «Cargando…» (antes: quedaba latiendo)');
    PRUEBAS.igual(repintes, r0, 'sin rehacer el panel entero (dashRepintar no corre por esto)');
    if (otra){ PRUEBAS.cierto(otra.hasAttribute('inert') && otra.isConnected, 'y la otra sección sigue bloqueada y en su lugar'); cargaBloquear(otra, false); }
  } finally { window.fetchConReloj = oReloj; window.dashRepintar = oRep; fin(); }
});
