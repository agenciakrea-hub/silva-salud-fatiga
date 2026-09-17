PRUEBAS.grupo('P185 · el visor del administrador · cliente');

/* Se entra por `onDashData(payload)` —el único camino real (R17)— con un payload igual al que
   manda `accionSupervisor` en modo visor (lo mide `p185-visor-servidor.js`), y se mira lo que
   la persona ve y puede tocar. `DASH` y `localStorage` se restauran en cada caso (R18). */

const P185C_HOY = new Date().toISOString().substring(0, 10);
function p185cPayload(extra){
  return Object.assign({
    ok:true, rol:'supervisor', vista:'hseq', combinada:false, referencia:{}, metricas:['kss'],
    registros:[{ persona:'P1', empresa:'Consorcio HELITEC', departamento:'Operaciones', cargo:'Piloto', fecha:P185C_HOY }],
    comentarios:[], pvt:[], aptitud:[], operacional:[], turnos:[], config:{}, marca:null,
    duty:null, ausencias:{},
    atajosAdmin:[{ empresa:'Consorcio HELITEC', nombre:'Ana Suárez', cedula:'11111' }],
    visor:{ empresa:'Consorcio HELITEC', vista:'hseq' }, visorError:null,
    cuentas:[{ empresa:'Aeroambulancias Silva', combinada:true, tieneHseq:false },
             { empresa:'Consorcio HELITEC', combinada:false, tieneHseq:true }]
  }, extra || {});
}
function p185cParamsAdmin(extra){
  return Object.assign({ action:'supervisor', usuario:'*', empresa:'*', pass:'x', dispositivoId:'p185c' }, extra || {});
}
/* Entra al visor «HELITEC · Dirección» y devuelve una función que restaura todo. */
function p185cEntrar(payloadExtra, paramsExtra, vista){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const params = p185cParamsAdmin(Object.assign({ verEmpresa:'Consorcio HELITEC', verVista:'hseq' }, paramsExtra || {}));
  onDashData(p185cPayload(payloadExtra), 'Consorcio HELITEC', params, vista || 'hseq');
  return function restaurar(){
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { visorPintar(); } catch(e){}
  };
}

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · el bloque existe en el DOM y las funciones del visor están declaradas', () => {
  PRUEBAS.existe('#visorBloque', 'el bloque del visor está en el HTML');
  ['visorPintar', 'visorCambiar', 'visorParams', 'esAdminSesion', 'visorSoloLectura', 'visorBloquea'].forEach(f =>
    PRUEBAS.igual(typeof window[f], 'function', f + ' declarada'));
});

PRUEBAS.caso('🔴 entrar por onDashData con un payload de visor: DASH lo guarda y el bloque se pinta', () => {
  const fin = p185cEntrar();
  try {
    PRUEBAS.igual(DASH.visor, { empresa:'Consorcio HELITEC', vista:'hseq' }, '`visor` sobrevive a la lista explícita de onDashData');
    PRUEBAS.igual((DASH.cuentas || []).length, 2, '`cuentas` también');
    PRUEBAS.igual(DASH.rol, 'supervisor', 'el rol es el de la cuenta: el panel se comporta como esa persona');
    PRUEBAS.cierto(esAdminSesion(), '⚠️ pero la sesión sigue siendo de admin (`esAdminSesion`), aunque `DASH.rol` no lo diga');
    PRUEBAS.cierto(Array.isArray(DASH.atajosAdmin) && DASH.atajosAdmin.length === 1, 'los atajos «Entrar como…» se guardan también en el visor');
    const b = document.getElementById('visorBloque');
    PRUEBAS.falso(b.hidden, 'el bloque se muestra');
    const selE = document.getElementById('visorEmpresa'), selV = document.getElementById('visorVista');
    PRUEBAS.igual([...selE.options].map(o => o.value), ['', 'Aeroambulancias Silva', 'Consorcio HELITEC'], 'el selector de empresa: «Todas» + las cuentas');
    PRUEBAS.igual(selE.value, 'Consorcio HELITEC', 'con la empresa que se está mirando elegida');
    PRUEBAS.igual(selV.value, 'hseq', 'y la vista');
    PRUEBAS.cierto(/Consorcio HELITEC/.test(document.getElementById('visorViendo').textContent), 'el rótulo dice qué se está viendo');
    PRUEBAS.cierto(document.getElementById('dashScope').textContent.indexOf('Consorcio HELITEC') >= 0, 'y el rótulo del panel también');
  } finally { fin(); }
});

PRUEBAS.caso('DISCRIMINADOR · una sesión de supervisor común NO ve el bloque', () => {
  const prevDash = DASH;
  try {
    onDashData(p185cPayload({ visor:null, cuentas:null, atajosAdmin:null }), 'Consorcio HELITEC',
      { action:'supervisor', usuario:'helitec', empresa:'helitec', pass:'x', dispositivoId:'p185c' }, 'hseq');
    PRUEBAS.falso(esAdminSesion(), 'no es admin');
    PRUEBAS.cierto(document.getElementById('visorBloque').hidden, 'y el bloque está oculto');
    PRUEBAS.falso(visorSoloLectura(), 'y no está en sólo lectura');
  } finally { DASH = prevDash; try { visorPintar(); } catch(e){} }
});

PRUEBAS.caso('el admin en «Todas las empresas · Servicio médico» ve el bloque pero NO está en sólo lectura', () => {
  const prevDash = DASH;
  try {
    onDashData(p185cPayload({ rol:'admin', vista:'medico', visor:null, registros:[
      { persona:'Ana Suárez', empresa:'Consorcio HELITEC', departamento:'Op', cargo:'Piloto', fecha:P185C_HOY },
      { persona:'Pedro Gómez', empresa:'Aeroambulancias Silva', departamento:'Vuelo', cargo:'Piloto', fecha:P185C_HOY }] }),
      'Todas las empresas', p185cParamsAdmin(), 'medico');
    PRUEBAS.cierto(esAdminSesion(), 'es admin');
    PRUEBAS.falso(document.getElementById('visorBloque').hidden, 'el bloque está');
    PRUEBAS.igual(document.getElementById('visorEmpresa').value, '', 'en «Todas»');
    PRUEBAS.falso(visorSoloLectura(), '⚠️ y sigue pudiendo escribir, como hoy: nadie pidió quitárselo');
    PRUEBAS.igual(visorParams('', 'medico'), {}, 'y «Todas · médico» no manda parámetros: es el admin de siempre');
    PRUEBAS.igual(visorParams('', 'hseq'), { verVista:'hseq' }, '«Todas · Dirección» sí manda la vista');
    PRUEBAS.igual(visorParams('Consorcio HELITEC', 'medico'), { verEmpresa:'Consorcio HELITEC', verVista:'medico' }, 'y una empresa manda las dos');
    /* el selector viejo de empresa entre los filtros ya no existe para el admin */
    buildDashFilters();
    PRUEBAS.igual(document.getElementById('dashEmp'), null, 'el `<select id="dashEmp">` viejo se retiró: lo reemplaza el bloque de arriba');
  } finally { DASH = prevDash; try { visorPintar(); } catch(e){} }
});

PRUEBAS.caso('🔴 los parámetros del visor viajan en dashAuth() y en gestAuth() — donde antes se perdían', () => {
  const fin = p185cEntrar();
  try {
    const a = dashAuth({ action:'niveles_riesgo' }), g = gestAuth({ action:'gestiones' });
    PRUEBAS.igual([a.verEmpresa, a.verVista], ['Consorcio HELITEC', 'hseq'], 'dashAuth los lleva');
    PRUEBAS.igual([g.verEmpresa, g.verVista], ['Consorcio HELITEC', 'hseq'], 'gestAuth los lleva');
    PRUEBAS.igual([a.usuario, a.pass], ['*', 'x'], 'con la credencial del admin, no la de la empresa');
  } finally { fin(); }
});

PRUEBAS.caso('DISCRIMINADOR · sin visor, dashAuth() y gestAuth() no llevan los parámetros', () => {
  const prevDash = DASH;
  try {
    onDashData(p185cPayload({ rol:'admin', vista:'medico', visor:null }), 'Todas las empresas', p185cParamsAdmin(), 'medico');
    const a = dashAuth(), g = gestAuth();
    PRUEBAS.cierto(!('verEmpresa' in a) && !('verVista' in a) && !('verEmpresa' in g), 'nada del visor en los pedidos del admin de siempre');
  } finally { DASH = prevDash; try { visorPintar(); } catch(e){} }
});

PRUEBAS.caso('🔴 Informes arma su payload por dashAuth: el visor también llega ahí', () => {
  /* Era una deuda vieja (A15): `dashLoadInformes` armaba su POST a mano y un parámetro nuevo no
     llegaba. Se intercepta `fetchConReloj` y se mira qué body salió. */
  const fin = p185cEntrar();
  const orig = window.fetchConReloj; let body = null;
  window.fetchConReloj = function(url, opts){ try { body = JSON.parse(opts.body); } catch(e){ body = null; }
    return Promise.resolve({ json: () => Promise.resolve({ ok:true, informes:[] }) }); };
  try {
    DASH._informesLoaded = false; DASH._informesLoading = false;
    dashLoadInformes();
    PRUEBAS.cierto(!!body, 'guarda: el pedido salió');
    PRUEBAS.igual(body && body.action, 'informes', 'la acción');
    PRUEBAS.igual(body && [body.verEmpresa, body.verVista], ['Consorcio HELITEC', 'hseq'], '⚠️ con el visor');
    PRUEBAS.cierto(!!(body && body.dispositivoId), 'y con dispositivoId, que antes faltaba');
  } finally { window.fetchConReloj = orig; fin(); }
});

/* ── sólo lectura ────────────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 en el visor nada escribe: cada camino corta ANTES de la red, y avisa', () => {
  const fin = p185cEntrar();
  const origReq = window.dashRequest, origFetch = window.fetchConReloj, origToast = window.showToast;
  let red = 0, toasts = [];
  window.dashRequest = function(){ red++; return Promise.resolve({ ok:true }); };
  window.fetchConReloj = function(){ red++; return Promise.resolve({ json: () => Promise.resolve({ ok:true }) }); };
  window.showToast = function(m){ toasts.push(String(m)); };
  const tiraron = [];
  const probar = (nombre, fn) => { try { fn(); } catch(e){ tiraron.push(nombre + ': ' + e.message); } };
  try {
    PRUEBAS.cierto(visorSoloLectura(), 'guarda: estamos en el visor');
    const el = document.createElement('button'); el.dataset.ced = '11111'; el.dataset.per = 'Ana Suárez';
    probar('ausTocar', () => ausTocar(el));
    probar('credReiniciarTocar', () => credReiniciarTocar(el));
    probar('depEnviar', () => depEnviar({ departamento:'X' }));
    probar('tareaCrear', () => tareaCrear(document.createElement('button')));
    probar('cicloCfgGuardar', () => cicloCfgGuardar(document.createElement('button')));
    probar('cicloPerEnviar', () => cicloPerEnviar(document.createElement('button'), 'Ana Suárez', {}, ''));
    probar('gestNueva', () => gestNueva());
    probar('bitacoraRegistrar', () => bitacoraRegistrar('prueba', 'Ana Suárez', {}));
    probar('simulBloqueaGestion', () => simulBloqueaGestion('x'));
    PRUEBAS.igual(red, 0, '⚠️ ninguna escritura llegó a la red · ' + red);
    PRUEBAS.alMenos(toasts.filter(x => /visor/i.test(x)).length, 6, 'y cada una avisó con el toast del visor · ' + JSON.stringify(toasts).slice(0, 200));
    PRUEBAS.igual(tiraron, [], 'ninguna tiró antes de llegar al candado');
    PRUEBAS.falso(cicloPuedeEditarPlan(), 'y el plan del ciclo no se puede editar (era `true` para el admin)');
    PRUEBAS.cierto(simulBloqueaGestion('x') === true, 'el guardián de las gestiones también corta');
  } finally { window.dashRequest = origReq; window.fetchConReloj = origFetch; window.showToast = origToast; fin(); }
});

PRUEBAS.caso('DISCRIMINADOR · sin visor, el mismo camino NO corta por el visor', () => {
  const prevDash = DASH;
  const origToast = window.showToast; const toasts = [];
  window.showToast = function(m){ toasts.push(String(m)); };
  try {
    onDashData(p185cPayload({ rol:'admin', vista:'medico', visor:null }), 'Todas las empresas', p185cParamsAdmin(), 'medico');
    PRUEBAS.falso(visorBloquea('x'), 'visorBloquea devuelve false');
    PRUEBAS.igual(toasts.filter(x => /visor/i.test(x)).length, 0, 'y no avisa nada');
    PRUEBAS.cierto(cicloPuedeEditarPlan(), 'y el admin de siempre puede editar el plan');
  } finally { window.showToast = origToast; DASH = prevDash; try { visorPintar(); } catch(e){} }
});

PRUEBAS.caso('los controles que escriben no se PINTAN en el visor: aptitud, nómina, ficha, tareas, informe', () => {
  const fin = p185cEntrar({ vista:'medico', visor:{ empresa:'Consorcio HELITEC', vista:'medico' },
    registros:[{ persona:'Ana Suárez', empresa:'Consorcio HELITEC', departamento:'Op', cargo:'Piloto', fecha:P185C_HOY, kss:7 }] }, { verVista:'medico' }, 'medico');
  try {
    DASH.f.per = 'Ana Suárez';   // la ficha médica es de UNA persona: sin esto devuelve vacío y «sin el botón» sería cierto por vacío
    const ficha = (function(){ try { return dashFichaMedica(DASH.registros) || ''; } catch(e){ return 'ERR ' + e.message; } })();
    PRUEBAS.cierto(/fm-sec-t/.test(ficha), 'guarda de medibilidad: la ficha se pintó · ' + ficha.slice(0, 80));
    PRUEBAS.falso(/notaClinicaGuardar\(/.test(ficha), 'sin el botón de guardar nota clínica');
    PRUEBAS.cierto(/no escribe notas|does not write clinical notes/.test(ficha), 'con la nota de sólo lectura en su lugar');
    const tareas = (function(){ try { return tareasFichaHtml(); } catch(e){ return 'ERR ' + e.message; } })();
    PRUEBAS.falso(/tareaCrear\(/.test(tareas), 'sin el formulario de crear tarea');
    const inf = (function(){ try { return renderInforme(DASH.registros) || ''; } catch(e){ return 'ERR ' + e.message; } })();
    PRUEBAS.falso(/dashGenerarInforme\(/.test(inf), 'sin el botón de generar informe');
    PRUEBAS.cierto(/informe-demo-nota/.test(inf), 'con la nota de que el visor no genera');
    const tarjeta = (function(){ try { return aptTarjeta(aptGente(DASH.registros)[0] || { nombre:'Ana Suárez' }, { acciones:true }) || ''; } catch(e){ return 'ERR ' + e.message; } })();
    PRUEBAS.falso(/restAbrir\(|telemSugerirDesde\(/.test(tarjeta), 'la tarjeta de aptitud sin «Restringir» ni «Sugerir telemedicina» · ' + tarjeta.slice(0, 60));
  } finally { fin(); }
});

/* ── cambiar de empresa o rol es una re-entrada completa ─────────────────────────────────── */
PRUEBAS.caso('🔴 visorCambiar(): pide al servidor con verEmpresa/verVista y RE-ENTRA por onDashData (rol y pestañas nuevos)', () => {
  const fin = p185cEntrar();
  const orig = window.dashRequest; let pedido = null;
  window.dashRequest = function(p){ pedido = Object.assign({}, p);
    return Promise.resolve(p185cPayload({ rol:'supervisor', vista:'supervisor', visor:{ empresa:'Aeroambulancias Silva', vista:'supervisor' },
      registros:[{ persona:'Pedro Gómez', empresa:'Aeroambulancias Silva', departamento:'Vuelo', cargo:'Piloto', fecha:P185C_HOY }] })); };
  return (async () => {
    try {
      const tabsAntes = DASH.tabs.slice();
      document.getElementById('visorEmpresa').value = 'Aeroambulancias Silva';
      document.getElementById('visorVista').value = 'supervisor';
      DASH.params.opDias = 90;   // el período no se arrastra a un panel nuevo
      visorCambiar();
      await PRUEBAS.esperarA(() => pedido && DASH && DASH.visor && DASH.visor.empresa === 'Aeroambulancias Silva', 2000);
      PRUEBAS.cierto(!!pedido, 'guarda: el pedido salió');
      PRUEBAS.igual([pedido.verEmpresa, pedido.verVista, pedido.usuario], ['Aeroambulancias Silva', 'supervisor', '*'], 'con la empresa, la vista y la credencial de admin');
      PRUEBAS.igual(pedido.opDias, undefined, 'y sin el período viejo');
      PRUEBAS.igual(DASH.visor, { empresa:'Aeroambulancias Silva', vista:'supervisor' }, 'DASH re-entró con lo nuevo');
      PRUEBAS.igual(DASH.vista, 'supervisor', 'la vista es la nueva');
      PRUEBAS.cierto(DASH.tabs.indexOf('aptitud') >= 0 && JSON.stringify(DASH.tabs) !== JSON.stringify(tabsAntes), '⚠️ las pestañas son las del rol nuevo — un dashRefresh las habría dejado como estaban');
      PRUEBAS.igual(document.getElementById('visorEmpresa').value, 'Aeroambulancias Silva', 'y el selector lo refleja');
    } finally { window.dashRequest = orig; fin(); }
  })();
});

PRUEBAS.caso('una empresa sin cuenta: el servidor responde como admin con visorError y el cliente avisa sin caerse', () => {
  const fin = p185cEntrar();
  const orig = window.dashRequest, origToast = window.showToast; const toasts = [];
  window.showToast = function(m){ toasts.push(String(m)); };
  window.dashRequest = function(){ return Promise.resolve(p185cPayload({ rol:'admin', vista:'medico', visor:null, visorError:'empresa' })); };
  return (async () => {
    try {
      visorCambiar();
      await PRUEBAS.esperarA(() => toasts.length > 0, 2000);
      PRUEBAS.cierto(toasts.some(x => /Accesos/.test(x)), 'avisa que esa empresa no tiene cuenta · ' + JSON.stringify(toasts));
      PRUEBAS.igual(DASH.visor, null, 'y queda como admin');
    } finally { window.dashRequest = orig; window.showToast = origToast; fin(); }
  })();
});

/* ── reglas de la casa ───────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('R14 · los textos del visor están en los dos idiomas', () => {
  const claves = ['visor_t', 'visor_empresa', 'visor_todas', 'visor_vista', 'visor_sup', 'visor_med', 'visor_hseq',
    'visor_viendo', 'visor_viendo_todas', 'visor_guia', 'visor_solo_lectura_nota', 'visor_informe_nota',
    'ts_visor_no_escribe', 'ts_visor_empresa_no'];
  const faltan = [];
  ['es', 'en'].forEach(idioma => claves.forEach(k => {
    const v = _i18nBuscar(idioma, SECTOR_FALLBACK, k);   // el diccionario es idioma × sector; el visor vive en el compartido `_`
    if (!v || v === k) faltan.push(idioma + ':' + k);
  }));
  PRUEBAS.igual(faltan, [], 'sin claves faltantes');
  const es = ['visor_guia', 'visor_viendo', 'visor_t'].map(k => _i18nBuscar('es', SECTOR_FALLBACK, k)).join(' ');
  PRUEBAS.falso(/\b(vos|tenés|podés|querés|elegí)\b/i.test(es), 'R1 · español neutro, sin voseo');
});

PRUEBAS.caso('R13 · el CSS del visor no tiene ningún color escrito a mano', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const bloque = css.match(/\.visor \{[\s\S]*?\.dash-vista \{/);
  PRUEBAS.cierto(!!bloque, 'guarda: se encontró el bloque del visor');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(bloque ? bloque[0] : '#fff'), 'sin #hex ni rgb() sueltos');
  PRUEBAS.alMenos(((bloque ? bloque[0] : '').match(/var\(--/g) || []).length, 12, 'y con tokens');
});

PRUEBAS.caso('R12 · a 375, 768 y 1366 el bloque entra en el ancho y los selectores no se cortan', () => {
  const fin = p185cEntrar();
  try {
    /* 2026-09-17 · el visor arranca plegado (pedido de Franco): los selectores se miden con el cuerpo abierto */
    visorPlegar(true);
    [375, 768, 1366].forEach(w => PRUEBAS.enVentana(w, 812, () => {
      const b = document.getElementById('visorBloque');
      const ov = document.getElementById('portalOverlay'); const tenia = ov.classList.contains('show'); ov.classList.add('show');
      try {
        void b.offsetWidth;
        const rb = b.getBoundingClientRect();
        PRUEBAS.cierto(rb.width > 0 && rb.right <= w + 1, w + ' px · el bloque entra (' + Math.round(rb.width) + ')');
        const s1 = document.getElementById('visorEmpresa').getBoundingClientRect(), s2 = document.getElementById('visorVista').getBoundingClientRect();
        PRUEBAS.cierto(s1.width > 100 && s2.width > 100, w + ' px · los dos selectores se pueden tocar (' + Math.round(s1.width) + ', ' + Math.round(s2.width) + ')');
        PRUEBAS.cierto(s1.height >= 40 && s2.height >= 40, w + ' px · alto de un dedo (≥ 40): ' + Math.round(s1.height));
        if (w <= 420) PRUEBAS.cierto(Math.abs(s1.top - s2.top) > 20, w + ' px · apilados a lo ancho del celular');
        else PRUEBAS.cierto(Math.abs(s1.top - s2.top) < 5, w + ' px · en una fila');
      } finally { if (!tenia) ov.classList.remove('show'); }
    }));
  } finally { fin(); }
});

/* ── lo que encontró la revisión adversarial ─────────────────────────────────────────────── */
PRUEBAS.caso('🔴 una respuesta que llega DESPUÉS de cambiar de panel se descarta: no mezcla dos empresas', () => {
  /* Antes de P185 la única forma de cambiar de empresa era cerrar el portal (`DASH = null`), y
     los `.then` cortaban por `!DASH`. El visor reemplaza `DASH` por el de OTRA empresa sin pasar
     por null: un ↻ lento de HELITEC aterrizaba sobre el DASH de Silva. Cada pedido recuerda para
     qué DASH salió y corta si ya no es el mismo. */
  const fin = p185cEntrar();
  const orig = window.gestPost; let resolver = null;
  window.gestPost = function(){ return new Promise(res => { resolver = res; }); };
  return (async () => {
    try {
      DASH._nivelesPedidos = false; DASH._niveles = null;
      dashCargarNiveles();                       // sale para HELITEC…
      PRUEBAS.cierto(!!resolver, 'guarda: el pedido salió');
      const dashViejo = DASH;
      /* …y en el medio el visor cambia a Silva */
      onDashData(p185cPayload({ visor:{ empresa:'Aeroambulancias Silva', vista:'hseq' },
        registros:[{ persona:'P1', empresa:'Aeroambulancias Silva', departamento:'Vuelo', cargo:'Piloto', fecha:P185C_HOY }] }),
        'Aeroambulancias Silva', p185cParamsAdmin({ verEmpresa:'Aeroambulancias Silva', verVista:'hseq' }), 'hseq');
      PRUEBAS.cierto(DASH !== dashViejo, 'guarda: DASH es otro objeto');
      const nivelesAntes = DASH._niveles;
      resolver({ ok:true, niveles:[{ empresa:'Consorcio HELITEC', departamento:'Operaciones', nivel:4 }], config:{ sector:'helitec-cfg' } });
      await PRUEBAS.esperarA(() => false, 150);   // le da lugar al .then
      PRUEBAS.igual(DASH._niveles, nivelesAntes, '⚠️ los niveles de HELITEC NO entraron al DASH de Silva');
      PRUEBAS.falso(!!(DASH._cfg && DASH._cfg.sector === 'helitec-cfg'), 'ni su config');
    } finally { window.gestPost = orig; fin(); }
  })();
});

PRUEBAS.caso('DISCRIMINADOR · la misma respuesta, sin cambiar de panel, SÍ entra', () => {
  const fin = p185cEntrar();
  const orig = window.gestPost; let resolver = null;
  window.gestPost = function(){ return new Promise(res => { resolver = res; }); };
  return (async () => {
    try {
      DASH._nivelesPedidos = false; DASH._niveles = null;
      dashCargarNiveles();
      resolver({ ok:true, niveles:[{ empresa:'Consorcio HELITEC', departamento:'Operaciones', nivel:4 }], config:{} });
      await PRUEBAS.esperarA(() => Array.isArray(DASH._niveles) && DASH._niveles.length === 1, 1500);
      PRUEBAS.cierto(Array.isArray(DASH._niveles) && DASH._niveles.length === 1, 'los niveles entraron: el corte es por cambio de panel, no por otra cosa');
    } finally { window.gestPost = orig; fin(); }
  })();
});

PRUEBAS.caso('visorCambiar() tampoco arrastra `pedida`, y los controles que quedaban se ocultan', () => {
  const fin = p185cEntrar({ vista:'medico', visor:{ empresa:'Consorcio HELITEC', vista:'medico' } }, { verVista:'medico', pedida:'supervisor' }, 'medico');
  const orig = window.dashRequest; let pedido = null;
  window.dashRequest = function(p){ pedido = Object.assign({}, p); return new Promise(() => {}); };   // nunca resuelve: sólo interesa el pedido
  try {
    document.getElementById('visorVista').value = 'hseq';
    visorCambiar();
    PRUEBAS.cierto(!!pedido, 'guarda: el pedido salió');
    PRUEBAS.igual(pedido.pedida, undefined, '⚠️ sin `pedida`: la vista la elige el visor');
    /* los tres controles del hallazgo 4 */
    const cfg = (function(){ try { return cicloCfgHtml(cicloPlan('')) || ''; } catch(e){ return 'ERR ' + e.message; } })();   // `cicloPlan` siempre devuelve un plan completo (con la forma del sector)
    PRUEBAS.cierto(cfg.length > 20 && !/^ERR/.test(cfg), 'guarda: el resumen de horas se pinta · ' + cfg.slice(0, 50));
    PRUEBAS.falso(/cicloCfgToggle\(/.test(cfg), 'el plan de horas de la empresa se lee sin botón «Editar»');
    /* las gestiones: se siembra una en el almacén LOCAL de esta empresa y se pinta con la función
       real, en el contenedor real — no una tarjeta suelta con una regla copiada */
    const all = gestStoreAll(); const k = gestKey();
    all[k] = { items:[{ id:'g-p185', titulo:'Seguimiento', personas:[], departamento:'', prioridad:'media', estado:'abierta',
                       pin:false, creada:Date.now(), actualizada:Date.now(), detalle:'', seguimientos:[], tareas:[] }], up:{}, del:{} };
    localStorage.setItem(K_GESTIONES, JSON.stringify(all));
    GEST.exp['g-p185'] = true; GEST.filtro = 'all'; GEST.q = '';
    renderGestiones();
    const cont = document.getElementById('gestBody');
    const campos = cont ? [...cont.querySelectorAll('input, textarea')] : [];
    PRUEBAS.alMenos(campos.length, 1, 'guarda: la tarjeta se pintó con sus editores · ' + campos.length);
    PRUEBAS.cierto(campos.length > 0 && campos.every(el => el.disabled), '⚠️ en el visor los editores inline quedan deshabilitados');
  } finally { window.dashRequest = orig; cargaCancelar(); fin(); }
});
