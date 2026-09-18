PRUEBAS.grupo('P187 · auditoría de uso real (2026-09-17) · lo que se arregló en el mismo prompt');

function p187Hseq(extra, vista){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10);
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'hseq', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'P1', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 8 },
                { persona: 'P2', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }],
    aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null,
    nominaTotal: 4, nominaSinDato: []
  }, extra || {});
  try {
    onDashData(payload, 'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-p187', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'p187' }, vista || 'hseq');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {} };
}

PRUEBAS.caso('🔴 Dirección · «cobertura completa» sólo cuando la NÓMINA está medida entera: con 2 de 4 dice cuántas faltan', () => {
  const fin = p187Hseq();
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderHseqIdc(dashFiltered());
    PRUEBAS.igual(cont.querySelector('.hs-ok'), null, '🔴 con 2 de 4 medidas NO dice «cobertura completa»');
    const alerta = cont.querySelector('.hs-alerta');
    PRUEBAS.cierto(!!alerta && /\b2\b/.test(alerta.textContent), 'dice que faltan 2 (las que no están medidas de la nómina) · ' + (alerta && alerta.textContent.slice(0, 80)));
    PRUEBAS.cierto(cont.textContent.indexOf('50%') >= 0, 'guarda: y el porcentaje de la nómina medida sigue diciendo 50 %');
  } finally { fin(); }
  /* DISCRIMINADOR · nómina 2, medidas 2: completa */
  const fin2 = p187Hseq({ nominaTotal: 2 });
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderHseqIdc(dashFiltered());
    PRUEBAS.cierto(!!cont.querySelector('.hs-ok') && !cont.querySelector('.hs-alerta'), 'DISCRIMINADOR · con la nómina entera medida sí dice «cobertura completa»');
  } finally { fin2(); }
});

PRUEBAS.caso('R1 · los textos visibles en español no llevan «acá» (rioplatense); «de más» sin el «+» redundante', () => {
  /* ⚠️ `I18N.es` NO es un diccionario plano: es `{ _, aviacion, planta, campo, generico }` (idioma × sector,
     R14). La primera versión de este caso iteraba `I18N.es` directo: cinco claves, ninguna cadena, «ninguna
     dice acá» en verde SIN MIRAR NINGÚN TEXTO. Lo delató la guarda de «Aquí», que dio 0 — un cero que no
     era resultado (instrumentos-que-mienten). Se aplanan los cinco sub-diccionarios. */
  const es = {};
  Object.keys(I18N.es).forEach(sec => Object.keys(I18N.es[sec]).forEach(k => { es[sec + '.' + k] = I18N.es[sec][k]; }));
  PRUEBAS.cierto(Object.keys(es).length > 1500, 'guarda: el diccionario aplanado tiene más de 1500 textos (' + Object.keys(es).length + ')');
  /* ⚠️ sin `\b`: en JS el límite de palabra no conoce «á»/«í» (instrumentos-que-mienten, el detector de voseo) */
  const palabra = w => new RegExp('(^|[^A-Za-zÁÉÍÓÚáéíóúñÑ])' + w + '(?![A-Za-zÁÉÍÓÚáéíóúñÑ])');
  const conAca = Object.keys(es).filter(k => typeof es[k] === 'string' && (palabra('[Aa]cá').test(es[k])));
  PRUEBAS.igual(conAca, [], 'ninguna clave del diccionario es dice «acá» (14 decían) · ' + conAca.slice(0, 5).join(','));
  PRUEBAS.cierto(Object.keys(es).filter(k => typeof es[k] === 'string' && palabra('[Aa]quí').test(es[k])).length >= 10, 'guarda: «aquí» existe en al menos 10 textos (se reemplazó, no se borró)');
  PRUEBAS.cierto(palabra('[Aa]cá').test('Acá van los promedios'), 'DISCRIMINADOR del instrumento: la expresión sí encuentra «Acá»');
  PRUEBAS.igual(t('cic_de_mas', { d: '4 min' }), '4 min de más', '«4 min de más», sin «+»');
});

/* ══ Barridos B (completitud) y C (avisos y «atrás») · los arreglos de una línea, cada uno con su caso ══ */

PRUEBAS.caso('🔴 el inicio rederiva su estado con el reloj: el bloque lleva la firma con la que se pintó y el tick lo repinta SÓLO cuando cambia (en curso → detenido)', () => {
  const origToast = window.showToast; window.showToast = () => {};
  const prevLS = Object.assign({}, localStorage);
  /* el panel cerrado deja `#dsec-ciclo` en el DOM sin `DASH`: es el estado real del inicio de un supervisor */
  const prevDash = DASH; DASH = null;
  const hace = h => new Date(Date.now() - h * 3600000).toISOString();
  const ev = (evento, h) => ({ evento, iso: hace(h), persona: 'Yo', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hace(h).slice(0, 10), plan: '', test: '', resultado: null });
  try {
    setProfile({ nombre: 'Yo', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34', esPiloto: true });
    localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([ev('salida_casa', 2), ev('llegada_aero', 1)]));   // en curso
    const f1 = cicloMiFirma();
    PRUEBAS.cierto(/^curso\|/.test(f1), 'guarda: el ciclo está en curso · ' + f1.slice(0, 40));
    renderSections();
    const mio = document.querySelector('#sections .cic-mio');
    PRUEBAS.cierto(!!mio, 'guarda: el bloque del ciclo está pintado');
    PRUEBAS.igual(mio && mio.getAttribute('data-cic-firma'), f1, 'el bloque lleva la firma con la que se pintó');
    /* pasan 48 h con la app a la vista: mismo ciclo, ahora detenido por la regla de las 24 h */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([ev('salida_casa', 50), ev('llegada_aero', 49)]));
    const f2 = cicloMiFirma();
    PRUEBAS.cierto(f2 !== f1 && /^detenido\|/.test(f2), '🔴 la firma cambia al pasar a detenido · ' + f2.slice(0, 40));
    _cicMioUltimaFirma = 0;
    cicloTick();
    const mio2 = document.querySelector('#sections .cic-mio');
    PRUEBAS.igual(mio2 && mio2.getAttribute('data-cic-firma'), f2, '🔴 el tick repintó el bloque con la firma nueva (antes: el chip decía «en curso» a las 30 h hasta tocar un botón)');
    PRUEBAS.cierto(!!(mio2 && mio2.querySelector('.cic-chip-detenido')), 'y el chip dice «detenido»');
    PRUEBAS.cierto(_cicDetRevisarT > 0, 'y dejó armada la revisión del aviso (cicloDetenidoRevisar)');
    /* DISCRIMINADOR · misma firma: el tick no toca el DOM (mismo nodo) */
    _cicMioUltimaFirma = 0;
    cicloTick();
    PRUEBAS.cierto(document.querySelector('#sections .cic-mio') === mio2, 'DISCRIMINADOR · misma firma: el tick no repinta');
    /* y dentro del minuto tampoco mira (una comparación por minuto) */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([ev('salida_casa', 2), ev('llegada_aero', 1)]));
    cicloTick();
    PRUEBAS.cierto(document.querySelector('#sections .cic-mio') === mio2, 'dentro del minuto no vuelve a comparar');
  } finally {
    clearTimeout(_cicDetRevisarT); _cicMioUltimaFirma = 0; window.showToast = origToast; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { refreshStates(); renderSections(); } catch(e){}
  }
});

PRUEBAS.caso('🔴 volver a la vista el MISMO día también revisa el ciclo (antes sólo si cambió el día); con cambio de día, además se piden las tareas', () => {
  const orig = window.cicloDetenidoRevisar; let n = 0; window.cicloDetenidoRevisar = () => { n++; };
  const oTar = window.tareasCargar; let tar = 0; window.tareasCargar = () => { tar++; return Promise.resolve(); };
  const oSw = swReg; swReg = null;
  return PRUEBAS.conOculto(true, async (setOculto) => {
    try {
      document.dispatchEvent(new Event('visibilitychange'));   // se oculta: anota el día
      setOculto(false);
      document.dispatchEvent(new Event('visibilitychange'));   // vuelve, mismo día
      PRUEBAS.igual(n, 1, '🔴 al volver el mismo día se revisa el ciclo (antes: sólo con cambio de día, vía renderInicio)');
      PRUEBAS.igual(tar, 0, 'mismo día: NO se piden las tareas (cuota: igual que el panel)');
      /* cambió el día mientras estaba en segundo plano */
      setOculto(true); document.dispatchEvent(new Event('visibilitychange'));
      _diaPintado = '2000-01-01';
      setOculto(false); document.dispatchEvent(new Event('visibilitychange'));
      PRUEBAS.igual(tar, 1, '🔴 con cambio de día se vuelven a pedir las tareas (antes: sólo al arrancar o al tocar la campana)');
      PRUEBAS.cierto(n >= 2, 'y el ciclo se revisa igual (la propia; y una más por renderInicio si hay perfil — el diferido las funde en una) · ' + n);
    } finally { window.cicloDetenidoRevisar = orig; window.tareasCargar = oTar; swReg = oSw; }
  });
});

PRUEBAS.caso('🟡 «Ver todo el historial» con la sincronización del arranque ocupada: el cargador se queda (antes parpadeaba y un segundo toque duplicaba el pedido de 400 días), y con tope', async () => {
  const oSync = window.misSincronizar, oOff = window.offHayConexion, oToast = window.showToast, oRender = window.renderSections, dias0 = _cicloHistDias;
  let llamadas = 0, resp = false; const toasts = [];
  window.misSincronizar = () => { llamadas++; return Promise.resolve(resp); };
  window.offHayConexion = () => true; window.showToast = m => toasts.push(m); window.renderSections = () => {};
  const btn = document.createElement('button'); btn.textContent = 'Ver todo'; document.body.appendChild(btn);
  const tick = async () => { for (let i = 0; i < 10; i++) await null; };
  try {
    cicloMiHistorialTodo(btn, 24); await tick();
    PRUEBAS.igual(llamadas, 1, 'guarda: pidió una vez');
    PRUEBAS.cierto(btn.disabled && btn.classList.contains('btn-loading'), '🟡 con la sincronización ocupada, el botón sigue cargando (antes se apagaba 1,2 s y quedaba vivo)');
    PRUEBAS.igual(toasts.length, 0, 'y sin toast todavía');
    cicloMiHistorialTodo(btn, 25); await tick();
    PRUEBAS.cierto(!btn.disabled, 'con tope: a las 25 esperas suelta el botón');
    PRUEBAS.igual(toasts, [t('err_generico')], 'y avisa con un texto que NO dice «sin conexión» (hay conexión)');
    /* la señal se fue durante la espera: el reintento entra por la guarda de arriba y el cargador se apaga igual (verificador) */
    btnSpin(btn, true, 'x'); window.offHayConexion = () => false;
    cicloMiHistorialTodo(btn, 1); await tick();
    PRUEBAS.cierto(!btn.disabled, 'sin señal en el reintento: suelta el botón (antes quedaba girando hasta el próximo repintado)');
    PRUEBAS.igual(_cicloHistDias, 0, 'y vuelve a ofrecer «Ver todo el historial»');
    window.offHayConexion = () => true;
    /* DISCRIMINADOR · con respuesta, suelta el botón en el acto */
    resp = true; cicloMiHistorialTodo(btn, 0); await tick();
    PRUEBAS.cierto(!btn.disabled && llamadas === 3, 'DISCRIMINADOR · con respuesta, suelta el botón');
  } finally {
    btn.remove(); window.offHayConexion = oOff; window.showToast = oToast; window.renderSections = oRender; _cicloHistDias = dias0;
    /* el timer de la espera 24→25 (1,2 s) cae en el stub, que ya responde ok; recién después se restaura */
    resp = true; setTimeout(() => { window.misSincronizar = oSync; }, 4000);
  }
});

PRUEBAS.caso('🔴 «atrás» con el login encima de un test cierra el LOGIN; el test tapado no se toca', () => {
  const test = document.getElementById('testOverlay'), login = document.getElementById('loginOv'), rec = document.getElementById('recuperarOv');
  const oRetro = window.retrocederTest, oCerrar = window.cerrarTest, oLgn = window.lgnCerrar, oRec = window.recuperarCerrar;
  let retro = 0, cerr = 0, lgn = 0, recN = 0;
  window.retrocederTest = () => { retro++; }; window.cerrarTest = () => { cerr++; };
  window.lgnCerrar = () => { lgn++; login.classList.remove('show'); };
  window.recuperarCerrar = () => { recN++; rec.classList.remove('show'); };
  try {
    test.classList.add('show'); login.classList.add('show');
    PRUEBAS.cierto(silvaAtras() === true, 'atrás consumido');
    PRUEBAS.igual(lgn, 1, '🔴 cerró el login (z-index 1010: se abrió solo encima del test)');
    PRUEBAS.igual(retro + cerr, 0, '🔴 y NO tocó el test tapado (antes: retrocedía la pregunta sin verse y al segundo toque cerraba el test con las respuestas)');
    /* recuperar encima del login: primero recuperar */
    login.classList.add('show'); rec.classList.add('show');
    silvaAtras();
    PRUEBAS.cierto(recN === 1 && lgn === 1, 'con «recuperar» abierta sobre el login, «atrás» cierra recuperar primero');
    login.classList.remove('show');
    /* DISCRIMINADOR · sin login, «atrás» sí va al test */
    silvaAtras();
    PRUEBAS.igual(retro + cerr, 1, 'DISCRIMINADOR · sin el login, «atrás» actúa sobre el test');
  } finally {
    window.retrocederTest = oRetro; window.cerrarTest = oCerrar; window.lgnCerrar = oLgn; window.recuperarCerrar = oRec;
    test.classList.remove('show'); login.classList.remove('show'); rec.classList.remove('show');
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('🔴 la guía de instalación entra al historial al abrirse y lo descarta al cerrarse por la ✕ (el botón físico no consume)', () => {
  const ov = document.getElementById('androidModal');
  const oPush = window.navPush, oCons = window.navConsumir; let push = 0, cons = 0;
  window.navPush = () => { push++; }; window.navConsumir = () => { cons++; };
  try {
    instalGuiaAbrir('androidModal');
    PRUEBAS.cierto(ov.classList.contains('show'), 'se muestra');
    PRUEBAS.igual(push, 1, '🔴 apiló una entrada (antes: ninguna → en una pestaña del navegador, «atrás» salía de la app con la guía abierta)');
    instalGuiaCerrarUI('androidModal');
    PRUEBAS.cierto(!ov.classList.contains('show'), 'la ✕ la cierra');
    PRUEBAS.igual(cons, 1, '🔴 y descarta la entrada');
    PRUEBAS.cierto(/instalGuiaCerrarUI\('androidModal'\)/.test(ov.querySelector('.x').getAttribute('onclick') || ''), 'la ✕ del HTML va por el camino que consume');
    PRUEBAS.cierto(/instalGuiaCerrarUI\('iosModal'\)/.test(document.querySelector('#iosModal .x').getAttribute('onclick') || ''), 'ídem la de iPhone');
    /* DISCRIMINADOR · el botón físico (silvaAtras) cierra sin consumir: el navegador ya sacó la entrada */
    ov.classList.add('show'); cons = 0;
    silvaAtras();
    PRUEBAS.cierto(!ov.classList.contains('show') && cons === 0, 'DISCRIMINADOR · el botón físico cierra sin consumir');
  } finally { window.navPush = oPush; window.navConsumir = oCons; ov.classList.remove('show'); }
});

PRUEBAS.caso('🔴 «no estás en la nómina» deja un aviso en «Tus tareas» (el toast de 2,6 s se perdía); idempotente; cuando entra en la nómina, se va solo', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oReloj = window.fetchConReloj, oToast = window.showToast, oCap = window.capturarDispositivo;
  let resp = { ok: false, motivo: 'no_en_nomina' }, toasts = 0;
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(resp) });
  window.showToast = () => { toasts++; }; window.capturarDispositivo = () => Promise.resolve({});
  const tick = async () => { for (let i = 0; i < 10; i++) await null; };
  try {
    localStorage.removeItem(K_REG_SIG); localStorage.removeItem(K_NOTIF_LOCAL);
    const perfil = { nombre: 'Persona De Prueba', cedula: '99999999', email: 'p@prueba.com', empresa: 'Empresa De Prueba' };
    await sincronizarRegistro(perfil); await tick();
    PRUEBAS.igual(toasts, 1, 'guarda: el toast de siempre salió (el camino real corrió)');
    const n = notifLocalLeer();
    PRUEBAS.igual(n.length, 1, '🔴 queda un aviso local');
    PRUEBAS.igual(n[0] && n[0].tipo, 'no_en_nomina', 'del tipo no_en_nomina');
    const it = notifLocalItems()[0];
    PRUEBAS.igual(it && it.titulo, t('notif_nom_titulo'), 'con el título del diccionario');
    PRUEBAS.cierto(!!it && it.detalle.length > 20 && it.detalle !== 'notif_nom_detalle', 'y el detalle');
    PRUEBAS.cierto(/nómina/i.test(I18N.es._.notif_nom_titulo) && /roster/i.test(I18N.en._.notif_nom_titulo), 'en los dos idiomas');
    localStorage.removeItem(K_REG_SIG);
    await sincronizarRegistro(perfil); await tick();
    PRUEBAS.igual(notifLocalLeer().length, 1, 'idempotente: la segunda apertura no duplica');
    /* DISCRIMINADOR · entra en la nómina: el servidor dice ok y el aviso se va */
    resp = { ok: true }; localStorage.removeItem(K_REG_SIG);
    await sincronizarRegistro(perfil); await tick();
    PRUEBAS.igual(notifLocalLeer().length, 0, '🔴 registrada: el aviso se va solo');
    PRUEBAS.igual(localStorage.getItem(K_REG_SIG) ? 1 : 0, 1, 'y la firma quedó guardada (registro hecho)');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; window.capturarDispositivo = oCap;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { tareasPintarBadge(); } catch(e){}
  }
});

PRUEBAS.caso('🟡 el recordatorio de «no marcaste la salida» no lo pisa el toast de «se detuvo» en el mismo tick', () => {
  const toasts = []; const origToast = window.showToast; window.showToast = m => toasts.push(m);
  const prevLS = Object.assign({}, localStorage);
  const hace = h => new Date(Date.now() - h * 3600000).toISOString();
  const ev = (evento, h) => ({ evento, iso: hace(h), persona: 'Yo', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hace(h).slice(0, 10), plan: '', test: '', resultado: null });
  return PRUEBAS.conOculto(false, async () => {
    try {
      setProfile({ nombre: 'Yo', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34', esPiloto: true });
      localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
      /* ciclo anterior detenido (hace 50 h) + ciclo actual con la jornada pasada del techo (sin cierre) */
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([ev('salida_casa', 50), ev('llegada_aero', 49), ev('salida_casa', 20), ev('llegada_aero', 19)]));
      const plan = cicloPlan(cicloYo());
      const ciclos = cicloAgruparTodos(cicloMioAll(), cicloTotalMin(plan) * 60000);
      const st0 = cicloEstado(ciclos[0], Date.now(), plan), st1 = cicloEstado(ciclos[1], Date.now(), plan);
      PRUEBAS.cierto(st0.estado === 'sin_cierre' && st1.estado === 'detenido', 'guarda: reciente sin cierre + anterior detenido · ' + st0.estado + '/' + st1.estado);
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(toasts.length, 1, '🟡 UN toast en este tick (antes salían dos y el segundo pisaba al primero a 0 ms)');
      PRUEBAS.cierto(/marc|salida|«/.test(toasts[0] || '') && toasts[0] !== t('ts_ciclo_detenido', { f: cicloFechaDe(st1.inicio), h: CICLO_DETENIDO_HORAS }), 'y es el del recordatorio (el que pide una acción), no el de «se detuvo»');
      PRUEBAS.igual(notifLocalLeer().length, 2, 'las DOS entradas quedan en «Tus tareas» igual');
      /* la próxima revisión avisa el detenido, que no se marcó como visto */
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(toasts.length, 2, 'DISCRIMINADOR · la revisión siguiente sí avisa el «se detuvo» (no quedó marcado como visto)');
    } finally {
      window.showToast = origToast;
      try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
      try { refreshStates(); renderSections(); } catch(e){}
    }
  });
});

PRUEBAS.caso('🟡 al salir de la simulación por un ERROR, el toast del error no lo pisa «saliste de la simulación»', () => {
  const oToast = window.showToast, oClose = window.closePortalUI, oVista = window.mostrarVista; const toasts = [];
  window.showToast = m => toasts.push(m); window.closePortalUI = () => {}; window.mostrarVista = () => {};
  try {
    simSalir(true);
    PRUEBAS.igual(toasts.length, 0, '🟡 salida silenciosa: ningún toast');
    simSalir();
    PRUEBAS.igual(toasts, [t('ts_sim_salida')], 'DISCRIMINADOR · el botón «Salir» sí avisa');
    PRUEBAS.igual((simEntrar.toString().match(/simSalir\(true\)/g) || []).length, 3, 'los tres caminos de error de simEntrar salen en silencio (el toast del error queda)');
  } finally { window.showToast = oToast; window.closePortalUI = oClose; window.mostrarVista = oVista; }
});

PRUEBAS.caso('🟡 marcar una tarea hecha guarda la caché: el próximo arranque no muestra el contador viejo', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oReloj = window.fetchConReloj, oToast = window.showToast, oHap = window.haptic;
  const lista0 = TAREAS.lista, pend0 = TAREAS.pendientes;
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
  window.showToast = () => {}; window.haptic = () => {};
  const tick = async () => { for (let i = 0; i < 10; i++) await null; };
  try {
    setProfile({ nombre: 'Persona De Prueba', cedula: '99999999', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    TAREAS.lista = [{ id: 'T1', estado: 'sin_leer', titulo: 'a' }, { id: 'T2', estado: 'sin_leer', titulo: 'b' }]; TAREAS.pendientes = 2;
    tareasCacheGuardar();
    PRUEBAS.igual(JSON.parse(localStorage.getItem(K_TAREAS_CACHE)).pendientes, 2, 'guarda: la caché arranca en 2');
    tareaMarcarHecha('T1', null); await tick();
    PRUEBAS.igual(TAREAS.pendientes, 1, 'guarda: en memoria quedó 1');
    PRUEBAS.igual(JSON.parse(localStorage.getItem(K_TAREAS_CACHE)).pendientes, 1, '🟡 la caché dice 1 (antes: seguía en 2 hasta la próxima respuesta del servidor, ~5 s después de abrir)');
  } finally {
    window.fetchConReloj = oReloj; window.showToast = oToast; window.haptic = oHap;
    TAREAS.lista = lista0; TAREAS.pendientes = pend0;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { tareasPintarBadge(); } catch(e){}
  }
});

PRUEBAS.caso('🟡 la barra de «versión nueva» queda por encima de los overlays (se muestra justo cuando hay uno abierto)', () => {
  const b = document.createElement('div'); b.className = 'ver-nueva'; document.body.appendChild(b);
  const ov = document.createElement('div'); ov.className = 'overlay show'; document.body.appendChild(ov);
  try {
    const z = Number(getComputedStyle(b).zIndex), zo = Number(getComputedStyle(ov).zIndex);
    PRUEBAS.cierto(zo >= 1000, 'guarda: el overlay mide ' + zo);
    PRUEBAS.cierto(z > zo, '🟡 la barra (' + z + ') está por encima del overlay (' + zo + ') · antes: 60, nacía tapada');
  } finally { b.remove(); ov.remove(); }
});

PRUEBAS.caso('🔴 la leyenda de «Tu actividad» dice «Nada» (la clave act_nada estaba duplicada y ganaba «Todavía no registraste nada»); ninguna clave del diccionario está repetida', async () => {
  PRUEBAS.igual(t('act_nada'), 'Nada', '🔴 act_nada = «Nada»');
  PRUEBAS.cierto(/^Todavía/.test(t('act_vacio')), 'el vacío del mapa vive en act_vacio');
  const leyenda = document.querySelector('.act-leyenda [data-i18n="act_nada"]');
  PRUEBAS.igual(leyenda && leyenda.textContent.trim(), 'Nada', '🔴 y en pantalla la leyenda dice «Nada»');
  PRUEBAS.igual(t('sens_somnol'), 'Somnolencia', 'ortografía: «Somnolencia»');
  PRUEBAS.igual(t('adm_salir'), 'Cerrar sesión de administrador', 'adm_salir: una sola, la del HTML');
  /* el instrumento: claves repetidas dentro del mismo sub-diccionario (idioma × sector) en la FUENTE —
     el objeto literal las deduplica en silencio, así que sólo se ven leyendo el texto */
  const src = await (await fetch('/index.html?v=' + Date.now())).text();
  const dups = fuente => {
    const i = fuente.indexOf('const I18N = {'); const j = fuente.indexOf('\nfunction t(', i);
    const blk = fuente.slice(i, j); const out = {};
    ['es', 'en'].forEach(lang => {
      const a = blk.indexOf('\n  ' + lang + ': {'); const b = lang === 'es' ? blk.indexOf('\n  en: {') : blk.length;
      const sub = blk.slice(a, b);
      const secs = [...sub.matchAll(/\n    ([a-z_]+): \{/g)];
      secs.forEach((m, k) => {
        let body = sub.slice(m.index + m[0].length, k + 1 < secs.length ? secs[k + 1].index : sub.length);
        body = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
          .replace(/'(?:[^'\\\n]|\\.)*'/g, '""').replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/`(?:[^`\\]|\\.)*`/g, '""');
        const seen = {};
        for (const km of body.matchAll(/(?:^|[,{\n])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) seen[km[1]] = (seen[km[1]] || 0) + 1;
        out[lang + '.' + m[1]] = Object.keys(seen).filter(x => seen[x] > 1);
      });
    });
    return out;
  };
  const d = dups(src);
  PRUEBAS.cierto(Object.keys(d).length >= 10, 'guarda: el instrumento ve los 10 sub-diccionarios (' + Object.keys(d).length + ')');
  PRUEBAS.igual(Object.keys(d).filter(k => d[k].length).map(k => k + ':' + d[k].join('/')), [], '🔴 ninguna clave repetida en ningún sub-diccionario (había 4: si, nom_ced_falta, act_nada, adm_salir)');
  /* DISCRIMINADOR · una fuente con una clave repetida */
  const falso = "const I18N = {\n  es: {\n    _: {\n      a:'x', b:'y',\n      a:'z',\n    },\n  },\n  en: {\n    _: {\n      a:'x',\n    },\n  },\n};\nfunction t(){}";
  PRUEBAS.igual(dups(falso)['es._'], ['a'], 'DISCRIMINADOR · el instrumento encuentra una repetida');
});

PRUEBAS.caso('🔴 Jornada sin jornadas: el vacío se VE (no vive dentro del ⓘ plegado); sin permiso, ídem; con datos no hay vacío', () => {
  const hoy = new Date().toISOString().slice(0, 10);
  /* `operacionalPeriodo.puedeVerHistorico` es lo que el servidor manda al médico y a Dirección (P169): con eso hay selector 7/30/90 */
  const fin = p187Hseq({ duty: { dias: 7, diario: [], personas: [], historico: [] }, operacionalPeriodo: { puedeVerHistorico: true, dias: 7 } });
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderJornada();
    PRUEBAS.cierto(!!cont.querySelector('.dv'), '🔴 emite el bloque de vacío');
    PRUEBAS.cierto(cont.textContent.indexOf(t('jor_vacio')) >= 0, 'con el texto a la vista');
    PRUEBAS.igual(cont.querySelector('details.dash-help'), null, 'y sin el ⓘ plegado que lo escondía');
    PRUEBAS.cierto(!!cont.querySelector('.cic-pers .cic-per'), 'guarda: hay selector de período (puede pedir más días)');
    PRUEBAS.cierto(!!cont.querySelector('.dv.dv-fijo') && cont.innerHTML.indexOf('class="dv"') < 0, 'con selector, el vacío es «fijo»: renderDash no la manda abajo (al traer 30 días no salta de lugar)');
  } finally { fin(); }
  const fin2 = p187Hseq({ duty: null });
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderJornada();
    PRUEBAS.cierto(!!cont.querySelector('.dv') && cont.textContent.indexOf(t('jor_sin_permiso')) >= 0, 'sin permiso: también visible');
    PRUEBAS.cierto(cont.innerHTML.indexOf('class="dv"') >= 0 && !cont.querySelector('.dv-fijo'), 'y sin selector sí cuenta como «sin datos» (va abajo)');
  } finally { fin2(); }
  /* DISCRIMINADOR · con una jornada, no hay vacío */
  const fin3 = p187Hseq({ duty: { dias: 7, diario: [{ persona: 'P1', fecha: hoy, jornadaMin: 600, excesoMin: 0, abierto: false, eventos: [] }], personas: [{ persona: 'P1', jornadas: 1, minutos: 600, excesos: 0 }], historico: [] } });
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderJornada();
    PRUEBAS.igual(cont.querySelector('.dv'), null, 'DISCRIMINADOR · con una jornada no emite vacío');
  } finally { fin3(); }
});

PRUEBAS.caso('🔴 la tarjeta de telemedicina del panel personal pasa por t() (una local `t` tapaba la función): existe en los dos idiomas', () => {
  const o = window.telemVigenteDe;
  window.telemVigenteDe = () => ({ id: 'tm1', estado: 'sugerida', sugeridaPor: 'Dra. De Prueba' });
  try {
    const cont = document.createElement('div'); cont.innerHTML = dashTelemedicinaCard([{ persona: 'Persona De Prueba' }]);
    PRUEBAS.cierto(cont.textContent.indexOf(t('tm_sug_t')) >= 0, 'título por el diccionario');
    PRUEBAS.cierto(cont.textContent.indexOf('Dra. De Prueba') >= 0, 'con quién la sugirió');
    const btns = [...cont.querySelectorAll('button')].map(b => b.textContent.trim());
    PRUEBAS.igual(btns, [t('tm_no'), t('tm_si')], 'los dos botones por el diccionario');
    ['tm_hecha_t', 'tm_hecha_x', 'tm_aceptada_t', 'tm_aceptada_x', 'tm_sug_t', 'tm_sug_x1', 'tm_sug_por', 'tm_sug_x2', 'tm_no', 'tm_si'].forEach(k => {
      PRUEBAS.cierto(typeof I18N.es._[k] === 'string' && typeof I18N.en._[k] === 'string' && I18N.es._[k] !== I18N.en._[k], k + ' en es y en, distintos');
    });
    window.telemVigenteDe = () => ({ id: 'tm1', estado: 'aceptada' });
    cont.innerHTML = dashTelemedicinaCard([{ persona: 'Persona De Prueba' }]);
    PRUEBAS.cierto(cont.textContent.indexOf(t('tm_aceptada_x')) >= 0, 'aceptada: texto del diccionario');
    PRUEBAS.cierto(!/const t = telem/.test(dashTelemedicinaCard.toString()), 'DISCRIMINADOR · la local ya no se llama `t`');
  } finally { window.telemVigenteDe = o; }
});

PRUEBAS.caso('🟡 cicloHM/cicloVivo nunca dicen «NaN»; el historial de PVT con una celda vacía dice «—»; sin colores a mano en el PVT', () => {
  PRUEBAS.igual(cicloHM(undefined), '0 min', 'cicloHM(undefined)');
  PRUEBAS.igual(cicloHM('abc'), '0 min', 'cicloHM("abc")');
  PRUEBAS.igual(cicloVivo(undefined), '0 min 00 s', 'cicloVivo(undefined)');
  PRUEBAS.igual(cicloHM(90), '1 h 30 min', 'DISCRIMINADOR · cicloHM(90) sigue bien');
  PRUEBAS.igual(cicloVivo(1.5), '1 min 30 s', 'DISCRIMINADOR · cicloVivo(1.5) sigue bien');
  const src = renderPVT.toString();
  PRUEBAS.cierto(src.indexOf('#eef3ff') < 0 && src.indexOf('var(--chip-bg)') >= 0, 'R13 · el chip del veredicto usa el token (antes #eef3ff, una caja clara en el tema oscuro)');
  PRUEBAS.cierto(/r\.rt_prom == null \? '—'/.test(src) && /r\.lapsos == null \? '—'/.test(src), 'RT/Lapsos nulos → «—» (antes «RT null ms»)');
});

PRUEBAS.caso('🟡 tres estados: los datos ganan al error (un ↻ durante un pedido colgado no deja la pestaña en «no se pudo» toda la sesión)', () => {
  PRUEBAS.igual(cargaEstado(true, [1], true), 'ok', 'con datos y un error viejo → ok');
  PRUEBAS.igual(cargaEstado(true, null, true), 'error', 'sin datos y con error → error');
  PRUEBAS.igual(cargaEstado(true, null, false), 'viajando', 'pedido en vuelo → viajando');
  PRUEBAS.igual(cargaEstado(false, null, false), 'ok', 'DISCRIMINADOR · sin pedido ni datos → ok (vacío legítimo)');
  PRUEBAS.cierto(/_reportesError = false;\s*\/\/ un pedido anterior/.test(dashCargarReportes.toString()) && /_opinionesError = false/.test(dashCargarOpiniones.toString()), 'y la respuesta buena limpia el error viejo');
});

PRUEBAS.caso('🟡 el ↻ manual pide reportes/opiniones con el MISMO gateo por vista que el arranque del panel (nada para el empleado; sin opiniones para el médico)', () => {
  const probar = (vista) => {
    const fin = p187Hseq({}, vista);
    const acciones = [];
    window.gestPost = p => { acciones.push(p && p.action); return Promise.resolve({ ok: true }); };
    try {
      DASH._reportes = null; DASH._opiniones = null;
      dashRecargarPendientes();
      return acciones.slice();
    } finally { fin(); }
  };
  PRUEBAS.igual(probar('hseq').sort(), ['opiniones', 'reportes'], 'Dirección: reportes y opiniones');
  PRUEBAS.igual(probar('medico'), ['reportes'], 'médico: sólo reportes (no tiene buzón de opiniones)');
  PRUEBAS.igual(probar('empleado'), [], '🟡 empleado: nada (antes salían dos POST que el servidor rechazaba, con un repintado cada uno)');
});

PRUEBAS.caso('🟡 al cerrar el panel, el reloj del inicio vuelve a correr (renderDash lo apaga si el panel no tiene pestaña de ciclo)', () => {
  const oToast = window.showToast; window.showToast = () => {};
  try {
    cicloTickStop();
    PRUEBAS.igual(_cicloTimer, null, 'guarda: reloj apagado');
    closePortal();
    PRUEBAS.cierto(_cicloTimer !== null, '🟡 closePortal lo vuelve a prender (antes: congelado hasta un cambio de visibilidad)');
  } finally { window.showToast = oToast; try { syncScrollLock(); } catch(e){} }
});
