PRUEBAS.grupo('P166 · el reingreso: se entra con código, se vuelve con contraseña');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Lógica de Franco, textual (2026-09-10): «se ingresa con código; la contraseña es por si cierran
   sesión o inician en otro celular». Eso deja sin lugar a `recuperar_perfil` —empresa + cédula,
   SIN contraseña, devolvía nombre, teléfono, correo y cargo— y descubre un hueco peor: quien ya
   tenía contraseña y cambiaba de celular rehacía el alta ENTERA por el código y terminaba en
   «Crear mi contraseña», que le contestaba «ya tienes» sin ningún botón para entrar.

   Lo que hay ahora, del lado del servidor:
   · `recuperar_perfil` responde `camino_cerrado`. La función se conserva inactiva.
   · `nomina_confirmar` dice `tieneClave` en el «¿eres tú?»: si esa cédula ya tiene contraseña, el
     cliente abre el login en vez de seguir con el alta. Un booleano, nada más.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p166Env(credenciales, config){
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Helitec','Ana Suárez','V-111','Operaciones','Piloto','F','34','','','Sí','','','4'],
               ['Helitec','Beto Pérez','V-222','Operaciones','Piloto','M','40','','','Sí','','','3']],
    'Accesos': [['Usuario','Contraseña','Rol','Empresas'], ['helitec','c1','supervisor','Consorcio HELITEC, Helitec']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']].concat(credenciales || []),
    'Config Empresa': [['Empresa','Clave','Valor']].concat(config || []),
    'Registrados Fatiga': [['Nota','Fecha y hora','Nombre','Email','Cédula','ID Piloto','Es piloto','Es supervisor','Empresa']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','a','b','c']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']],
  });
  return GS.cargarGs(CTX.gs, env, ['manejar','accionNominaConfirmar','accionRecuperarPerfil','credBuscar','credPersonaMigrada','credHash','credSalNueva']);
}
const p166r = r => JSON.parse(r.getContent());

PRUEBAS.caso('🔴 `recuperar_perfil` ya no responde · por el DESPACHADOR, no por la función', () => {
  /* R17 · se entra por `manejar`, que es lo que corre doGet/doPost. Las pruebas viejas de
     recuperar_perfil entraban por la función directa y seguirían en verde probando código muerto. */
  const api = p166Env();
  const r = p166r(api.manejar({ action:'recuperar_perfil', empresa:'Helitec', cedula:'V-111', dispositivoId:'d', _post:true }));
  PRUEBAS.igual(r.ok, false, '🔴 no devuelve nada');
  PRUEBAS.igual(r.motivo, 'camino_cerrado', 'y dice por qué, para que un cliente viejo sepa qué hacer');
  PRUEBAS.falso(!!(r.perfil || r.consentimientos), '🔒 ni perfil ni consentimientos: nada personal viaja');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · la función sigue existiendo, inactiva · el código se guarda, no se borra', () => {
  const api = p166Env();
  PRUEBAS.cierto(typeof api.accionRecuperarPerfil === 'function', 'sigue declarada');
  /* Y sigue funcionando si alguien la llamara a mano: lo que la cierra es el despachador. */
  const r = p166r(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d', _post:true }));
  PRUEBAS.cierto(r.ok === false || r.ok === true, 'responde algo coherente (nadie la enruta)');
});

PRUEBAS.caso('🔴 `nomina_confirmar` dice `tieneClave:false` a quien no creó contraseña', () => {
  const api = p166Env();
  const r = p166r(api.accionNominaConfirmar({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d', _post:true }));
  PRUEBAS.cierto(r.ok && r.perfil, 'guarda: el perfil llega · ' + JSON.stringify(r).slice(0,120));
  PRUEBAS.igual(r.perfil.tieneClave, false, '🔴 sin credencial, false · el alta sigue como siempre');
});

PRUEBAS.caso('🔴 y `tieneClave:true` a quien SÍ la tiene · es lo que manda al login en vez del alta', () => {
  const base = p166Env();
  const sal = base.credSalNueva();
  /* La empresa va CANÓNICA en Credenciales, como la escribe `accionCredencialCrear`: `credBuscar`
     compara `norm(celda)` contra `norm(empresaCanon)`, sin canonizar la celda. */
  const cred = [['Consorcio HELITEC','V-111','ana', base.credHash('LaDeAna2026', sal, 100), sal, '100',
                 'sha256-sal-vueltas-v1','empleado','activo','2026-09-01','']];
  const api = p166Env(cred);
  const r = p166r(api.accionNominaConfirmar({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d', _post:true }));
  PRUEBAS.cierto(r.ok && r.perfil, 'guarda: el perfil llega');
  PRUEBAS.igual(r.perfil.tieneClave, true, '🔴 con credencial activa, true');
  const claves = Object.keys(r.perfil);
  ['hash','sal','usuario','estado','vueltas','iteraciones'].forEach(k =>
    PRUEBAS.falso(claves.indexOf(k) >= 0, '🔒 no viaja «' + k + '»: un booleano y nada más'));
  /* Beto no tiene credencial: la de Ana no se le contagia. */
  const b = p166r(api.accionNominaConfirmar({ empresa:'Helitec', cedula:'V-222', dispositivoId:'d', _post:true }));
  PRUEBAS.igual(b.perfil && b.perfil.tieneClave, false, '⚠️ y es POR cédula: la de al lado sigue en false');
});

PRUEBAS.caso('🔒 una credencial INACTIVA cuenta como «no tiene»', () => {
  /* Si la cuenta se dio de baja, mandarla al login la deja afuera: el login rechaza inactivas.
     Tiene que seguir el alta, que le va a decir «ya tienes» → y ahí es otro problema, anotado. */
  const base = p166Env();
  const sal = base.credSalNueva();
  const cred = [['Consorcio HELITEC','V-111','ana', base.credHash('LaDeAna2026', sal, 100), sal, '100',
                 'sha256-sal-vueltas-v1','empleado','baja','2026-09-01','']];
  const api = p166Env(cred);
  const r = p166r(api.accionNominaConfirmar({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d', _post:true }));
  PRUEBAS.igual(r.perfil && r.perfil.tieneClave, false, '🔒 estado «baja» no es una contraseña usable');
});

/* ── EL CLIENTE · por el camino real ─────────────────────────────────────────────────────── */

function p166Limpio(fn){
  /* Guarda y repone todo lo que estos casos tocan: overlays, NOM, perfil, splash. */
  const ids = ['nominaOv','loginOv','setup','splashOv','claveOv'];
  const antes = { show: ids.map(id => document.getElementById(id).classList.contains('show')),
                  nom: { empresa: NOM.empresa, cedula: NOM.cedula, perfilPersona: NOM.perfilPersona, paso: NOM.paso },
                  perfil: localStorage.getItem(K_PROFILE), pend: _lgnPendiente, emp: _lgnEmpresa };
  try { return fn(); }
  finally {
    ids.forEach((id, i) => document.getElementById(id).classList.toggle('show', antes.show[i]));
    NOM.empresa = antes.nom.empresa; NOM.cedula = antes.nom.cedula; NOM.perfilPersona = antes.nom.perfilPersona;
    if (antes.perfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, antes.perfil);
    _lgnPendiente = antes.pend; _lgnEmpresa = antes.emp;
    try { syncScrollLock(); } catch (e) {}
  }
}
const p166Abierto = id => document.getElementById(id).classList.contains('show');

PRUEBAS.caso('🔴 «Sí, soy yo» con `tieneClave` abre el LOGIN con empresa y cédula puestas, y no guarda perfil', () => {
  /* El reingreso de verdad: la persona cambió de celular, escribió el código y su cédula, el
     servidor dijo que ya tiene contraseña. Antes seguía al alta y terminaba en un callejón. */
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE);
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = 'Empresa Demo'; NOM.cedula = '99999999';
    NOM.perfilPersona = { nombre:'Persona De Prueba', cedula:'99999999', empresa:'Empresa Demo', tieneClave:true };
    nominaSoyYo();
    PRUEBAS.cierto(p166Abierto('loginOv'), '🔴 se abre el login');
    PRUEBAS.falso(p166Abierto('setup'), '⚠️ y NO el formulario de datos: esto no es un alta');
    PRUEBAS.igual(document.getElementById('lgnEmpresa').textContent, 'Empresa Demo', 'con la empresa del código');
    PRUEBAS.igual(document.getElementById('lgnCed').value, '99999999', 'y la cédula ya puesta');
    PRUEBAS.igual(getProfile(), null, '🔒 sin guardar perfil: lo repone `login` cuando la contraseña sea correcta');
    PRUEBAS.cierto(p166Abierto('nominaOv'), 'y el «¿eres tú?» sigue debajo, para «Ahora no»');
  });
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · sin `tieneClave` sigue al alta como siempre', () => {
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE);
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = 'Empresa Demo'; NOM.cedula = '99999999';
    NOM.perfilPersona = { nombre:'Persona De Prueba', cedula:'99999999', empresa:'Empresa Demo', tieneClave:false };
    nominaSoyYo();
    PRUEBAS.falso(p166Abierto('loginOv'), 'no abre el login');
    PRUEBAS.cierto(p166Abierto('setup'), '⚠️ abre el formulario: alta normal');
    PRUEBAS.cierto(!!getProfile() && getProfile().nombre === 'Persona De Prueba', 'y guarda el perfil de la nómina');
  });
});

PRUEBAS.caso('🔴 «Ya me había registrado» abre el login con la empresa que ya se sabe · no «Recuperar mis datos»', () => {
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE);
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = 'Empresa Demo'; NOM.cedula = '';
    const r = lgnAbrirDesdeAlta();
    PRUEBAS.cierto(r === true && p166Abierto('loginOv'), '🔴 abre el login');
    PRUEBAS.falso(p166Abierto('recuperarOv'), '🔒 y NUNCA «Recuperar mis datos», que devolvía el perfil sin contraseña');
    PRUEBAS.igual(document.getElementById('lgnEmpresa').textContent, 'Empresa Demo', 'con la empresa del código');
    PRUEBAS.cierto(getComputedStyle(document.getElementById('lgnSinClave')).display !== 'none',
      '⚠️ y con la salida «No tengo contraseña»: quien nunca la creó vuelve por el código');
  });
});

PRUEBAS.caso('⚠️ sin empresa conocida, «Ya me había registrado» dice que escriba el código primero', () => {
  /* Dispositivo nuevo, paso del código, «Mi empresa no me dio código» → «Ya me había registrado».
     No hay empresa en ningún lado y el servidor no puede buscar una credencial sin ella. */
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE); localStorage.removeItem(K_REINGRESO);
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = ''; NOM.cedula = '';
    nominaEl('nomCodErr').textContent = '';
    const r = lgnAbrirDesdeAlta();
    PRUEBAS.igual(r, false, 'no abre');
    PRUEBAS.falso(p166Abierto('loginOv'), 'el login no se abre sin empresa');
    PRUEBAS.igual(nominaEl('nomCodErr').textContent, t('lgn_sin_empresa'), '⚠️ y lo dice donde está la persona');
  });
});

PRUEBAS.caso('🔴 «Ahora no» encima del alta vuelve al alta, no al splash · P135 al revés', () => {
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE);
    document.getElementById('splashOv').classList.remove('show');
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = 'Empresa Demo';
    lgnAbrirDesdeAlta();
    lgnCerrar();
    PRUEBAS.falso(p166Abierto('loginOv'), 'el login se cerró');
    PRUEBAS.cierto(p166Abierto('nominaOv'), '🔴 el alta sigue ahí');
    PRUEBAS.falso(p166Abierto('splashOv'), '🔴 y el splash NO se le puso encima');
  });
});

PRUEBAS.caso('⚠️ «No tengo contraseña» vuelve al paso del código', () => {
  p166Limpio(() => {
    localStorage.removeItem(K_PROFILE);
    document.getElementById('nominaOv').classList.add('show');
    NOM.empresa = 'Empresa Demo';
    lgnAbrirDesdeAlta();
    lgnSinClave();
    PRUEBAS.falso(p166Abierto('loginOv'), 'cierra el login');
    PRUEBAS.cierto(p166Abierto('nominaOv'), 'sigue en el alta');
    PRUEBAS.igual(NOM.paso, 'codigo', '⚠️ en el paso del código, que es por donde se vuelve');
  });
});

PRUEBAS.caso('🔴 «Crear mi contraseña» con «ya tienes» abre el login · era un callejón', () => {
  /* Sin `p166Limpio`: `clvGuardar` es asíncrono y el `finally` de aquél restauraba el perfil ANTES
     de que el `.then` leyera la cédula — el caso medía el perfil de la suite, no el suyo. */
  const oFetch = window.fetch, oPerfil = localStorage.getItem(K_PROFILE);
  setProfile({ nombre:'Persona De Prueba', cedula:'99999999', empresa:'Empresa Demo' });
  document.getElementById('claveOv').classList.add('show');
  document.getElementById('clvPass').value = 'Clave-larga-1!'; document.getElementById('clvPass2').value = 'Clave-larga-1!';
  window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'ya_tiene', error:'Esta persona ya tiene contraseña.' }) });
  clvGuardar(document.getElementById('clvBtn'));
  return new Promise(r => setTimeout(r, 80)).then(() => {
    try {
      PRUEBAS.cierto(p166Abierto('loginOv'), '🔴 se abre el login con lo que ya se sabe');
      PRUEBAS.igual(document.getElementById('lgnCed').value, '99999999', 'con la cédula puesta');
    } finally {
      window.fetch = oFetch;
      document.getElementById('loginOv').classList.remove('show'); document.getElementById('claveOv').classList.remove('show');
      document.getElementById('clvPass').value = ''; document.getElementById('clvPass2').value = '';
      try { btnSpin(document.getElementById('clvBtn'), false); cargaBloquear(document.querySelector('#claveOv .sheet'), 'reset'); } catch (e) {}
      if (oPerfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, oPerfil);
      try { syncScrollLock(); } catch (e) {}
    }
  });
});

PRUEBAS.caso('⚠️ ningún onclick lleva ya a «Recuperar mis datos»', () => {
  const html = document.documentElement.outerHTML;
  const m = html.match(/onclick="recuperarAbrir\(\)"/g) || [];
  PRUEBAS.igual(m.length, 0, '🔒 cero botones a recuperarAbrir · los tres pasaron a lgnAbrirDesdeAlta');
  PRUEBAS.igual((html.match(/onclick="lgnAbrirDesdeAlta\(\)"/g) || []).length, 3, 'y son exactamente tres');
});

PRUEBAS.caso('⚠️ los textos nuevos están en los dos idiomas (R14)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['lgn_sin_clave','lgn_sin_empresa'].forEach(k => PRUEBAS.cierto(t(k) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

/* ── EL FLOTANTE DEL ADMINISTRADOR ───────────────────────────────────────────────────────── */

function p166Payload(rol, extra){
  return Object.assign({ ok:true, rol:rol, vista:'medico', registros:[], comentarios:[], pvt:[],
    referencia:{ kss:6 }, metricas:['kss'], config:{}, marca:null,
    atajosAdmin:[{ empresa:'Aeroambulancias Silva', nombre:"Franco D'Prueba", cedula:'12345678' },
                 { empresa:'Aeroambulancias Silva', nombre:'Rafael Prueba', cedula:'87654321' }] }, extra || {});
}
function p166ConDash(rol, fn){
  const antes = (typeof DASH !== 'undefined') ? DASH : undefined;
  const ov = document.getElementById('portalOverlay'), tenia = ov.classList.contains('show');
  const dash = document.getElementById('portalDash'), dAntes = dash.style.display;
  try {
    ov.classList.add('show'); dash.style.display = '';
    onDashData(p166Payload(rol), 'Todas las empresas', { action:'supervisor', usuario:'*', empresa:'*', pass:'x' }, 'medico');
    return fn();
  } finally {
    DASH = antes; dash.style.display = dAntes; if (!tenia) ov.classList.remove('show');
    document.getElementById('admAtajosOv').classList.remove('show');
    try { dashUpdateAdmFab(); } catch (e) {}
    try { syncScrollLock(); } catch (e) {}
  }
}
const p166Vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };

PRUEBAS.caso('🔴 con sesión de ADMINISTRADOR el flotante aparece y guarda los atajos', () => {
  /* Entra por `onDashData`, que es lo que corre con la respuesta real del panel (R17). */
  p166ConDash('admin', () => {
    PRUEBAS.cierto(Array.isArray(DASH.atajosAdmin) && DASH.atajosAdmin.length === 2, 'los atajos quedan en DASH');
    PRUEBAS.cierto(p166Vis('admFab'), '🔴 el flotante se ve');
    PRUEBAS.cierto(document.getElementById('portalDash').classList.contains('con-adm-fab'),
      'y el de gestiones le deja lugar (clase en #portalDash)');
  });
});

PRUEBAS.caso('🔒 DISCRIMINADOR · con rol supervisor, el mismo payload NO deja atajos ni flotante', () => {
  /* Si un payload trajera los atajos con otro rol —por un error del servidor o a mano—, el cliente
     los descarta igual. Y sin esto, lo de arriba pasaría por la razón equivocada. */
  p166ConDash('supervisor', () => {
    PRUEBAS.igual(DASH.atajosAdmin, null, '🔒 no se guardan');
    PRUEBAS.falso(p166Vis('admFab'), '🔒 y el flotante no aparece');
    PRUEBAS.falso(document.getElementById('portalDash').classList.contains('con-adm-fab'), 'ni la clase');
  });
});

PRUEBAS.caso('⚠️ la hoja lista a cada persona, y un apóstrofo en el nombre no rompe el botón', () => {
  p166ConDash('admin', () => {
    admAtajosAbrir();
    PRUEBAS.cierto(document.getElementById('admAtajosOv').classList.contains('show'), 'se abre la hoja');
    const btns = [...document.querySelectorAll('#admAtajosLista .adm-atajo')];
    PRUEBAS.igual(btns.length, 2, 'dos atajos, dos botones');
    PRUEBAS.cierto(/Franco D'Prueba/.test(btns[0].textContent), "⚠️ el nombre con apóstrofo se pinta entero");
    PRUEBAS.igual(btns[0].getAttribute('onclick'), 'admAtajoIr(0)', 'y el onclick va por índice, no con el nombre adentro');
    PRUEBAS.falso(/12345678/.test(document.getElementById('admAtajosLista').innerHTML), '🔒 la cédula no se pinta');
    admAtajosCerrar();
  });
});

PRUEBAS.caso('🔴 sin perfil, el atajo entra DIRECTO con la credencial de administrador · sin pedirle contraseña a la persona', () => {
  /* ⚠️ QUÉ CAMBIÓ (P166b, 2026-09-10). La primera versión abría el login y le pedía la contraseña
     a Rafael, que nunca creó una. Franco: «desde admin no hay necesidad de poner contraseña, pues
     ya es admin». Ahora el atajo manda `admin_entrar_como` con la credencial de admin (dashAuth)
     y aplica lo que vuelve con lo mismo que usa el login normal. R17: se espía el POST real.
     ⚠️ LA RESTAURACIÓN VA AL FINAL DE LA PROMESA, no en un `finally` sincrónico: `lgnAplicarEntrada`
     escribe el perfil en el `.then` del fetch, 120 ms después — un `finally` que corre antes deja
     a «Rafael Prueba» en el localStorage de TODA la suite (pasó: 11 casos de P100 en rojo). */
  const oPerfil = localStorage.getItem(K_PROFILE), oSes = localStorage.getItem(K_SES_PERSONA);
  const splash = document.getElementById('splashOv'), sTenia = splash.classList.contains('show');
  const oFetch = window.fetch; let cuerpo = null;
  const restaurar = () => {
    window.fetch = oFetch;
    document.getElementById('loginOv').classList.remove('show'); splash.classList.toggle('show', sTenia);
    ['consent','textoOverlay','claveOv','rolOv','setup','nominaOv','portalOverlay','admAtajosOv'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('show'); });
    if (oPerfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, oPerfil);
    if (oSes == null) localStorage.removeItem(K_SES_PERSONA); else localStorage.setItem(K_SES_PERSONA, oSes);
    try { ALTA_EN_CURSO = false; _misSincronizando = false; syncScrollLock(); } catch (e) {}
  };
  window.fetch = function (u, o) { try { const b = JSON.parse(o.body); if (b.action === 'admin_entrar_como') cuerpo = b; } catch (e) {}
    return Promise.resolve({ json: () => Promise.resolve(cuerpo && cuerpo.action === 'admin_entrar_como'
      ? { ok:true, sesion:'sst_prueba', persona:{ nombre:'Rafael Prueba', cedula:'87654321', empresa:'Aeroambulancias Silva', departamento:'Op', cargo:'Presidente', sexo:'M', edad:'50', telefono:'0414', email:'r@s.com', esPiloto:true, id_piloto:'R1' }, consentimientos:{} }
      : { ok:false }) }); };
  localStorage.removeItem(K_PROFILE); localStorage.removeItem(K_SES_PERSONA);
  p166ConDash('admin', () => { admAtajosAbrir(); admAtajoIr(1); });
  return new Promise(r => setTimeout(r, 150)).then(() => {
    PRUEBAS.cierto(!!cuerpo && cuerpo.action === 'admin_entrar_como', '🔴 sale `admin_entrar_como`, no `login`');
    PRUEBAS.igual(cuerpo && cuerpo.cedula, '87654321', 'con la cédula del atajo');
    PRUEBAS.cierto(!!(cuerpo && cuerpo.usuario === '*' && cuerpo.pass), '🔒 y con la credencial de ADMIN (dashAuth), no una contraseña de la persona');
    PRUEBAS.falso(document.getElementById('loginOv').classList.contains('show'), '🔴 no abre el login');
    PRUEBAS.igual((getProfile() || {}).nombre, 'Rafael Prueba', '🔴 y aplicó la persona que devolvió el servidor');
    PRUEBAS.cierto(!!localStorage.getItem(K_SES_PERSONA), 'con su sesión guardada');
  }).finally(restaurar);
});

PRUEBAS.caso('🔒 adentro como OTRA persona, el atajo no mezcla perfiles: pide cerrar sesión', () => {
  const oPerfil = localStorage.getItem(K_PROFILE);
  const oConfirm = window.confirm;
  try {
    setProfile({ nombre:'Otra Persona', cedula:'11112222', empresa:'Consorcio HELITEC', departamento:'Op', cargo:'Piloto',
                 sexo:'Masculino', edad:'30', telefono:'0412', email:'o@o.com', esPiloto:true, id_piloto:'X' });
    PRUEBAS.cierto(perfilCompleto(getProfile()), 'guarda: el perfil de prueba es completo');
    window.confirm = () => false;   // «cancelar» en el diálogo de cerrar sesión (R8)
    p166ConDash('admin', () => {
      admAtajosAbrir(); admAtajoIr(0);
      PRUEBAS.falso(document.getElementById('loginOv').classList.contains('show'), '🔒 NO abre el login sobre otro perfil');
      PRUEBAS.igual((getProfile() || {}).nombre, 'Otra Persona', '🔒 y el perfil de la otra persona sigue intacto');
    });
  } finally {
    window.confirm = oConfirm;
    if (oPerfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, oPerfil);
  }
});

PRUEBAS.caso('⚠️ el botón físico «atrás» conoce la hoja de atajos', () => {
  p166ConDash('admin', () => {
    admAtajosAbrir();
    const r = silvaAtras();
    PRUEBAS.cierto(r === true, 'la consume');
    PRUEBAS.falso(document.getElementById('admAtajosOv').classList.contains('show'), 'y la cierra');
  });
});

PRUEBAS.caso('⚠️ los textos del flotante están en los dos idiomas (R14) y sin color a mano (R13)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['adm_ir_inicio','adm_atajos_lead','adm_entrar_como','adm_atajo_otra'].forEach(k =>
        PRUEBAS.cierto(t(k, { nombre:'x' }) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const bloque = css.slice(css.indexOf('.adm-fab {'), css.indexOf('.adm-atajo:active'));
  PRUEBAS.cierto(bloque.length > 100, 'guarda: se leyó el CSS del flotante');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(bloque), '⚠️ ni un color a mano en el CSS nuevo');
});
