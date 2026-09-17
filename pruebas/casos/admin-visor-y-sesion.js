PRUEBAS.grupo('Administrador · visor plegable, volver a todas, esqueleto al cambiar, sesión guardada (2026-09-17)');

/* Pedido de Franco mirando el panel de admin: (1) «cómo vuelvo al panel de todas las empresas»,
   (2) «el visor ocupa mucho espacio, que sea desplegable», (3) «al cambiar de empresa se pone una capa
   gris y nada: debería tener el esqueleto», (4) «si ya puse la contraseña debería guardarse», con la
   pantalla de acceso de uso interno, (5) el texto de la demostración era redundante.
   Camino real: `onDashData` con el payload del admin, `visorCambiar` con `dashRequest` espiado,
   `portalLoginAdmin`, `splashAdmin`, `portalAutoLoginSupervisor`. `DASH`, `localStorage` y los stubs se
   restauran en cada caso (R18). */

const ADMV_HOY = new Date().toISOString().substring(0, 10);
function admvPayload(extra){
  return Object.assign({
    ok:true, rol:'admin', vista:'medico', combinada:false, referencia:{ kss:5 }, metricas:['kss'],
    registros:[{ persona:'Ana Suárez', empresa:'Consorcio HELITEC', departamento:'Operaciones', cargo:'Piloto', fecha:ADMV_HOY, kss:4 }],
    comentarios:[], pvt:[], aptitud:[], operacional:[], turnos:[], config:{}, marca:null, duty:null, ausencias:{},
    atajosAdmin:[], visor:null, visorError:null,
    cuentas:[{ empresa:'Aeroambulancias Silva', combinada:true, tieneHseq:false }, { empresa:'Consorcio HELITEC', combinada:false, tieneHseq:true }]
  }, extra || {});
}
function admvVisorPayload(){
  return admvPayload({ rol:'supervisor', vista:'supervisor', visor:{ empresa:'Consorcio HELITEC', vista:'supervisor' } });
}
/* entra como admin («Todas · Servicio médico») con la red cortada; devuelve la función que restaura */
function admvEntrar(payload, params){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oReq = window.dashRequest, oFetch = window.fetch, oReloj = window.fetchConReloj, oToast = window.showToast;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  const est = { pedidos: [], toasts: [], responder: null };
  window.dashRequest = p => { est.pedidos.push(p); return new Promise(res => { est.responder = res; }); };
  window.showToast = m => { est.toasts.push(String(m)); };
  onDashData(payload || admvPayload(), 'Todas las empresas', params || { action:'supervisor', usuario:'*', empresa:'*', pass:'ses_tok.x', dispositivoId:'admv' }, (payload && payload.vista) || 'medico');
  est.fin = function(){
    window.dashRequest = oReq; window.fetch = oFetch; window.fetchConReloj = oReloj; window.showToast = oToast;
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { visorPintar(); } catch(e){}
  };
  return est;
}
const admvEspera = (fn, ms) => PRUEBAS.esperarA(fn, ms || 3000);

PRUEBAS.caso('🔴 el visor arranca PLEGADO en una línea, dice qué se mira, y recuerda si se dejó abierto', () => {
  try { localStorage.removeItem(K_VISOR_ABIERTO); } catch(e){}   // sin preferencia previa: lo que ve quien entra por primera vez
  const est = admvEntrar();
  try {
    const b = document.getElementById('visorBloque'), cuerpo = document.getElementById('visorCuerpo'), btn = document.getElementById('visorCabBtn');
    PRUEBAS.falso(b.hidden, 'guarda: el bloque se muestra al admin');
    PRUEBAS.cierto(cuerpo.hidden, '🔴 el cuerpo (selectores, guía) arranca plegado');
    PRUEBAS.igual(btn.getAttribute('aria-expanded'), 'false', 'y el botón lo dice');
    PRUEBAS.igual(document.getElementById('visorResumen').textContent, t('visor_todas') + ' · ' + t('visor_med'), 'la línea dice «Todas las empresas · Servicio médico»');
    PRUEBAS.cierto(document.getElementById('visorVolver').hidden, 'en «Todas · Servicio médico» no hay adónde volver');
    visorToggle();
    PRUEBAS.falso(cuerpo.hidden, 'un toque lo abre');
    PRUEBAS.igual(localStorage.getItem(K_VISOR_ABIERTO), '1', 'y se recuerda (preferencia del dispositivo)');
    PRUEBAS.cierto(!!document.getElementById('visorEmpresa').options.length && !!document.getElementById('visorInfoBtn'), 'con los selectores y el ⓘ adentro');
    visorPintar();
    PRUEBAS.falso(cuerpo.hidden, 'repintar respeta lo que se dejó abierto');
    visorToggle();
    PRUEBAS.cierto(cuerpo.hidden && localStorage.getItem(K_VISOR_ABIERTO) === '0', 'otro toque lo pliega');
  } finally { est.fin(); }
});

PRUEBAS.caso('🔴 mirando una empresa aparece «← Todas las empresas»: un toque manda el pedido del admin de siempre (sin verEmpresa ni verVista)', () => {
  const est = admvEntrar(admvVisorPayload(), { action:'supervisor', usuario:'*', empresa:'*', pass:'ses_tok.x', dispositivoId:'admv', verEmpresa:'Consorcio HELITEC', verVista:'supervisor', pedida:'supervisor' });
  try {
    PRUEBAS.igual(document.getElementById('visorResumen').textContent, 'Consorcio HELITEC · ' + t('visor_sup'), 'la línea dice la empresa y la vista');
    const volver = document.getElementById('visorVolver');
    PRUEBAS.falso(volver.hidden, '🔴 el botón de volver está');
    PRUEBAS.igual(volver.textContent, t('visor_volver'), 'con su texto');
    volver.click();
    const p = est.pedidos[est.pedidos.length - 1];
    PRUEBAS.cierto(!!p && !('verEmpresa' in p) && !('verVista' in p) && !('pedida' in p), '🔴 el pedido va sin verEmpresa/verVista/pedida: es «Todas · Servicio médico», el administrador de siempre');
    PRUEBAS.igual(document.getElementById('visorEmpresa').value + '|' + document.getElementById('visorVista').value, '|medico', 'los selectores quedaron en Todas · Servicio médico');
    /* DISCRIMINADOR · «Todas» con otra vista sigue siendo visor (sólo lectura), no el admin */
    PRUEBAS.igual(visorParams('', 'hseq'), { verVista:'hseq' }, 'DISCRIMINADOR · «Todas · Dirección» sí manda verVista');
  } finally { est.fin(); }
});

PRUEBAS.caso('🔴 al cambiar de empresa se ve el ESQUELETO con «Cargando…», no una capa gris; si falla, vuelve el panel de antes', async () => {
  const est = admvEntrar();
  try {
    visorToggle();
    document.getElementById('visorEmpresa').value = 'Consorcio HELITEC';
    document.getElementById('visorVista').value = 'supervisor';
    visorCambiar();
    PRUEBAS.cierto(!!document.querySelector('#dashBody .dsk'), '🔴 mientras viaja el pedido, el cuerpo es el esqueleto');
    PRUEBAS.igual(document.getElementById('dashScope').textContent, t('cargando'), 'y el rótulo dice «Cargando…»');
    PRUEBAS.igual(document.getElementById('visorResumen').textContent, t('cargando'), 'la línea del visor también');
    /* fallo: el panel anterior se vuelve a pintar entero */
    est.responder({ ok:false, error:'Usuario o contraseña incorrecta' });
    await admvEspera(() => !document.querySelector('#dashBody .dsk'));
    PRUEBAS.falso(!!document.querySelector('#dashBody .dsk'), '🔴 tras el fallo no queda el esqueleto');
    PRUEBAS.igual(document.getElementById('dashScope').textContent, 'Todas las empresas', 'el rótulo vuelve');
    PRUEBAS.igual(document.getElementById('visorResumen').textContent, t('visor_todas') + ' · ' + t('visor_med'), 'y la línea del visor');
    PRUEBAS.cierto(est.toasts.length === 1 && /incorrecta/.test(est.toasts[0]), 'con el error en un toast');
    /* éxito: entra el panel nuevo y el visor se pliega solo */
    document.getElementById('visorEmpresa').value = 'Consorcio HELITEC';
    document.getElementById('visorVista').value = 'supervisor';
    visorCambiar();
    est.responder(admvVisorPayload());
    await admvEspera(() => document.getElementById('dashScope').textContent === 'Consorcio HELITEC');
    PRUEBAS.cierto(document.getElementById('visorCuerpo').hidden, 'la acción terminó: el visor vuelve a una línea');
    PRUEBAS.igual(document.getElementById('visorResumen').textContent, 'Consorcio HELITEC · ' + t('visor_sup'), 'que dice lo nuevo');
    PRUEBAS.falso(document.getElementById('visorVolver').hidden, 'y ofrece volver');
  } finally { est.fin(); }
});

PRUEBAS.caso('🔴 la contraseña del administrador se escribe UNA vez: el token queda en el dispositivo y «Administrador» entra directo', async () => {
  const prevLS = Object.assign({}, localStorage), prevDash = DASH;
  const oReq = window.dashRequest, oFetch = window.fetch, oReloj = window.fetchConReloj, oToast = window.showToast;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.showToast = () => {};
  const pedidos = []; let responder = null;
  window.dashRequest = p => { pedidos.push(p); return new Promise(res => { responder = res; }); };
  try {
    localStorage.removeItem(K_DASH_CREDS_ADM);
    PRUEBAS.igual(admSesionGuardada(), null, 'guarda: sin sesión guardada');
    splashAdmin();
    PRUEBAS.igual(document.getElementById('adminBox').style.display, '', 'sin sesión, se muestra la pantalla de administración');
    PRUEBAS.igual(document.querySelector('#portalGate h2').textContent, t('adm_gate_t'), 'con su título («Acceso de administración»), no «Panel de estadísticas»');
    PRUEBAS.cierto(document.getElementById('admGateChip').textContent.indexOf(t('adm_gate_chip')) >= 0 && document.getElementById('admGateVer').textContent === t('adm_gate_ver', { v: APP_VERSION }), 'el chip «Uso interno» y la versión de la app');
    PRUEBAS.igual(document.getElementById('pAdminPass').placeholder, t('adm_gate_ph'), 'y el campo dice «Contraseña», sin jerga');
    PRUEBAS.igual(getComputedStyle(document.querySelector('#portalGate .portal-tabs')).display, 'none', 'sin la tira de pestañas vacía');
    document.getElementById('pAdminPass').value = 'una-clave';
    portalLoginAdmin(document.querySelector('#adminBox .save-btn'));
    const p0 = pedidos[0];
    PRUEBAS.cierto(!!p0 && p0.usuario === '*' && p0.recordar === '1', '🔴 el ingreso pide la sesión al servidor (recordar:1)');
    responder(admvPayload({ sesion:'ses_p1.tok' }));
    await admvEspera(() => !!DASH && DASH.rol === 'admin');
    PRUEBAS.igual(JSON.parse(localStorage.getItem(K_DASH_CREDS_ADM) || 'null'), { usuario:'*', token:'ses_p1.tok' }, '🔴 el token queda guardado (nunca la contraseña)');
    PRUEBAS.cierto(DASH.params.pass === 'ses_p1.tok' && !('recordar' in DASH.params), 'los pedidos que siguen van con el token y sin recordar (no se emite otro en cada cambio)');
    /* reingreso: «Administrador» entra directo, con el token */
    closePortalUI();
    await admvEspera(() => getComputedStyle(document.getElementById('portalOverlay')).display === 'none' || !document.getElementById('portalOverlay').classList.contains('show'), 2500);
    splashAdmin();
    const p1 = pedidos[pedidos.length - 1];
    PRUEBAS.cierto(!!p1 && p1.usuario === '*' && p1.pass === 'ses_p1.tok', '🔴 al volver a tocar «Administrador» el pedido sale solo, con el token');
    PRUEBAS.cierto(!!document.querySelector('#dashBody .dsk'), 'y mientras carga se ve el esqueleto');
    responder(admvPayload());
    await admvEspera(() => document.getElementById('dashScope').textContent === 'Todas las empresas');
    PRUEBAS.cierto(esAdminSesion() && getComputedStyle(document.getElementById('portalGate')).display === 'none', 'entró sin pasar por el gate');
    /* sesión vencida: vuelve a SU pantalla, con el aviso, y ya no hay token */
    closePortalUI();
    await admvEspera(() => !document.getElementById('portalOverlay').classList.contains('show'), 2500);
    splashAdmin();
    responder({ ok:false, error:'Usuario o contraseña incorrecta' });
    await admvEspera(() => document.getElementById('adminErr').textContent !== '');
    PRUEBAS.igual(document.getElementById('adminErr').textContent, t('pg_sesion_terminada'), 'sesión vencida: el aviso está en la pantalla de administración');
    PRUEBAS.igual(document.getElementById('adminBox').style.display, '', 'con el bloque abierto para escribir la contraseña');
    PRUEBAS.igual(admSesionGuardada(), null, 'y el token ya no está');
    /* cerrar sesión y olvidar el dispositivo también la retiran */
    localStorage.setItem(K_DASH_CREDS_ADM, JSON.stringify({ usuario:'*', token:'ses_p2.tok' }));
    PRUEBAS.cierto(sesionClavesBorrar().indexOf(K_DASH_CREDS_ADM) >= 0, '«Cerrar sesión» la borra');
    portalPintarOlvidar();
    PRUEBAS.igual(document.getElementById('portalOlvidar').style.display, '', 'y el gate ofrece «Olvidar este dispositivo»');
  } finally {
    window.dashRequest = oReq; window.fetch = oFetch; window.fetchConReloj = oReloj; window.showToast = oToast;
    try { closePortalUI(); } catch(e){}
    try { portalReponerLoDeEmpresa(); } catch(e){}
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('los textos nuevos están en los dos idiomas, sin voseo, y el de la demostración ya no repite «demostración» cuatro veces', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es', 'en'].forEach(l => {
      localStorage.setItem(K_LANG, l);
      ['adm_gate_t', 'adm_gate_lead', 'adm_gate_chip', 'adm_gate_ver', 'adm_gate_nota', 'adm_gate_tec', 'adm_gate_ph', 'adm_entrar', 'visor_volver', 'visor_volver_aria', 'dc_titulo', 'dc_lead', 'dc_entrar', 'pg_demo_pass_lbl', 'pg_demo_pass_pide']
        .forEach(k => PRUEBAS.cierto(t(k) !== k, k + ' en ' + l));
    });
    localStorage.setItem(K_LANG, 'es');
    const dialogo = [t('dc_titulo'), t('dc_lead'), t('pg_demo_pass_lbl'), t('dc_entrar')].join(' ');
    PRUEBAS.comoMucho((dialogo.match(/demostraci/gi) || []).length, 2, 'el diálogo de la clave nombra «demostración» como mucho dos veces · ' + dialogo);
    PRUEBAS.falso(/\b(vos|tenés|podés|escribí|entrá|mirá)\b/i.test([t('adm_gate_nota'), t('adm_gate_tec'), t('dc_lead'), t('pg_demo_pass_pide')].join(' ')), 'R1 · sin voseo');
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

PRUEBAS.caso('R12 · el visor plegado entra a 375 en una línea sin desbordar; desplegado, tampoco', () => {
  const est = admvEntrar(admvVisorPayload(), { action:'supervisor', usuario:'*', empresa:'*', pass:'ses_tok.x', dispositivoId:'admv', verEmpresa:'Consorcio HELITEC', verVista:'supervisor' });
  try {
    PRUEBAS.enVentana(375, 812, () => {
      const ov = document.getElementById('portalOverlay'), prev = ov.style.display; ov.style.display = 'block';
      try {
        const b = document.getElementById('visorBloque');
        const fuera = el => [...el.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > 376).map(e => e.className);
        PRUEBAS.igual(fuera(b), [], 'plegado: nada se sale de los 375 px');
        PRUEBAS.comoMucho(Math.round(b.getBoundingClientRect().height), 64, 'plegado ocupa una línea (' + Math.round(b.getBoundingClientRect().height) + ' px)');
        visorToggle();
        PRUEBAS.igual(fuera(b), [], 'desplegado: tampoco');
        visorToggle();
      } finally { ov.style.display = prev; }
    });
  } finally { est.fin(); }
});

/* ── lo que encontró la revisión adversarial ─────────────────────────────────────────────── */
PRUEBAS.caso('🔴 «Administrador / Desarrollador» dentro del gate de EMPRESA no retitula la pantalla; sólo el modo administración lo hace', () => {
  const prevLS = Object.assign({}, localStorage), prevDash = DASH;
  try {
    localStorage.removeItem(K_DASH_CREDS_ADM);
    openPortalGate();
    const h2 = document.querySelector('#portalGate h2');
    PRUEBAS.igual(h2.textContent, t('pg_titulo'), 'guarda: el gate de empresa dice «Panel de estadísticas»');
    toggleAdminLogin();
    PRUEBAS.igual(document.getElementById('adminBox').style.display, '', 'el bloque se abre');
    PRUEBAS.igual(h2.textContent, t('pg_titulo'), '🔴 y el título sigue siendo el del panel (las pestañas y el login de empresa siguen a la vista)');
    PRUEBAS.cierto(document.getElementById('admGateChip').textContent.indexOf(t('adm_gate_chip')) >= 0, 'pero el bloque sí lleva el chip «Uso interno»');
    toggleAdminLogin();
    PRUEBAS.igual(document.getElementById('adminBox').style.display, 'none', 'segundo toque: se cierra');
    PRUEBAS.igual(h2.textContent, t('pg_titulo'), 'y el título no cambió');
    /* DISCRIMINADOR · el modo administración (enlace de la portada) sí retitula, y `portalReponerLoDeEmpresa` lo devuelve */
    admGateModo();
    PRUEBAS.igual(h2.textContent, t('adm_gate_t'), 'DISCRIMINADOR · el modo administración retitula');
    portalReponerLoDeEmpresa();
    PRUEBAS.igual(h2.textContent, t('pg_titulo'), 'y al reponer vuelve');
  } finally {
    try { closePortalUI(); } catch(e){}
    try { portalReponerLoDeEmpresa(); } catch(e){}
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔴 sin `sesion` en la respuesta no se guarda NADA; con sesión, el admin tiene dónde cerrarla (en el visor) y cerrarla la retira', async () => {
  const prevLS = Object.assign({}, localStorage), prevDash = DASH;
  const oReq = window.dashRequest, oFetch = window.fetch, oReloj = window.fetchConReloj, oToast = window.showToast, oConfirm = window.confirm;
  const redes = []; window.fetch = (u, o) => { redes.push({ u: String(u), body: o && o.body }); return new Promise(() => {}); }; window.fetchConReloj = () => new Promise(() => {});
  const toasts = []; window.showToast = m => toasts.push(String(m));
  let responder = null; window.dashRequest = () => new Promise(res => { responder = res; });
  try {
    localStorage.removeItem(K_DASH_CREDS_ADM);
    splashAdmin();
    document.getElementById('pAdminPass').value = 'una-clave';
    portalLoginAdmin(document.querySelector('#adminBox .save-btn'));
    responder(admvPayload());   // sin `sesion`: el servidor no pudo emitirla
    await admvEspera(() => !!DASH && DASH.rol === 'admin');
    PRUEBAS.igual(localStorage.getItem(K_DASH_CREDS_ADM), null, '🔴 sin `sesion`, no se guarda nada (ni la contraseña)');
    PRUEBAS.falso(Object.keys(localStorage).some(k => /una-clave/.test(localStorage.getItem(k) || '')), '🔒 la contraseña no está en ningún lado del dispositivo');
    PRUEBAS.cierto(document.getElementById('visorSalir').hidden, 'sin token guardado, el visor no ofrece cerrar la sesión');
    /* con token */
    localStorage.setItem(K_DASH_CREDS_ADM, JSON.stringify({ usuario:'*', token:'ses_p3.tok' }));
    visorPintar();
    const salir = document.getElementById('visorSalir');
    PRUEBAS.falso(salir.hidden, '🔴 con el token guardado, el visor ofrece cerrar la sesión de administrador');
    PRUEBAS.igual(salir.textContent, t('adm_salir'), 'con su texto');
    PRUEBAS.alMenos(Math.round(salir.getBoundingClientRect().height) || 44, 44, 'alto de un dedo');
    window.confirm = () => false; salir.click();
    PRUEBAS.cierto(!!admSesionGuardada(), 'sin confirmar, no pasa nada (R8)');
    window.confirm = () => true; salir.click();
    PRUEBAS.igual(admSesionGuardada(), null, '🔴 confirmado: el token se retira del dispositivo');
    PRUEBAS.cierto(redes.some(r => /sesion_cerrar/.test(r.body || '') && /ses_p3\.tok/.test(r.body || '')), 'y se avisa al servidor para que el token deje de valer también allá');
    PRUEBAS.cierto(toasts.some(m => m === t('adm_salido')), 'con aviso');
    await admvEspera(() => !document.getElementById('portalOverlay').classList.contains('show'), 2500);
    PRUEBAS.falso(document.getElementById('portalOverlay').classList.contains('show'), 'y el panel se cierra');
  } finally {
    window.dashRequest = oReq; window.fetch = oFetch; window.fetchConReloj = oReloj; window.showToast = oToast; window.confirm = oConfirm;
    try { closePortalUI(); } catch(e){}
    try { portalReponerLoDeEmpresa(); } catch(e){}
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});
