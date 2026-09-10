PRUEBAS.grupo('P170 · el supervisor entra con la contraseña de su empresa, y el reingreso sin contraseña propia va por el código');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Franco (2026-09-10), probando su propia alta como supervisor de Aeroambulancias Silva:
     · «si mi empresa me registró como supervisor, ¿por qué me pregunta si soy piloto, supervisor,
       médico?» → los tres banners de rol del formulario de datos eran el mecanismo VIEJO (anterior
       al ADR 002 y al ADR 003). Ahora el formulario no los muestra: el rol lo dijo la nómina.
     · «¿qué es eso de que no ponen contraseña de supervisor e igual pueden acceder? Soy
       supervisor, entro, tengo que tener código de empresa, mi cédula y contraseña de supervisor,
       y ahí entro» → en el ALTA la pantalla del rol ya no tiene «Ahora no»: se escribe la
       contraseña de la empresa o se sale del registro. Desde Más → Tu acceso sigue siendo opcional.
     · «no puse contraseña, me llevó al inicio, cerré sesión y cuando doy a Ingresar me dice "entra
       con tu contraseña", pero yo nunca la puse» → la marca `K_TIENE_CLAVE`: quien nunca creó
       contraseña propia vuelve por el código; quien sí, por el login.

   R17: se entra por `avanzarAlta()`, `openSetup()`, `splashIngresar()` y `silvaAtras()` — los
   caminos que corren de verdad —, nunca llamando a la pieza suelta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p170Guardar(){
  const o = {};
  for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
  return { ls:o, confirm: window.confirm, obligatorio: ROL_OF_OBLIGATORIO };
}
function p170Restaurar(prev){
  localStorage.clear();
  Object.keys(prev.ls).forEach(k => { try { localStorage.setItem(k, prev.ls[k]); } catch(e){} });
  window.confirm = prev.confirm;
  ROL_OF_OBLIGATORIO = prev.obligatorio;
  ['rolOv','claveOv','consent','textoOverlay','nominaOv','setup','loginOv','splashOv','carruselOv'].forEach(id => {
    const e = document.getElementById(id); if (e) e.classList.remove('show');
  });
  try { syncScrollLock(); } catch(e){}
  try { miRolPintar(); } catch(e){}
}
const P170_PERFIL = { nombre:'Ana Suárez P170', cedula:'99170170', empresa:'Empresa P170',
                      departamento:'Operaciones', cargo:'Supervisora', sexo:'Femenino', edad:'34',
                      telefono:'04141111111', email:'ana.p170@ejemplo.co', esPiloto:false };
/* Igual que `p100Preparar`: alguien que acaba de cargar sus datos, con todo lo anterior al rol ya
   resuelto (consentimiento, tamaño de texto, contraseña propia ya ofrecida). */
function p170Preparar(extra){
  const prev = p170Guardar();
  localStorage.clear();
  const cons = { items:{} };
  CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
  localStorage.setItem(K_CONSENT, JSON.stringify(cons));
  localStorage.setItem(K_TEXTO, '1');
  setProfile(Object.assign({}, P170_PERFIL, extra || {}));
  clvMarcarOfrecida();
  return prev;
}
const p170Abierto = id => { const o = document.getElementById(id); return !!o && o.classList.contains('show'); };

/* ── (a) los banners de rol ya no se muestran ────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el formulario de datos NO pregunta si es piloto, supervisor o médico · la nómina ya lo dijo (ADR 003)', () => {
  const prev = p170Guardar();
  try {
    setProfile(Object.assign({}, P170_PERFIL, { esSupervisor:true, rol:'supervisor' }));
    openSetup(false);                                   // R17 · el camino real que pinta el formulario
    const ocultos = ['pilotBanner','supBanner','medBanner','supNotice','fSupPass','medNotice','fMedPass']
      .filter(id => { const e = document.getElementById(id); return e && getComputedStyle(e).display === 'none'; });
    PRUEBAS.igual(ocultos.length, 7, '🔴 los tres banners, sus avisos y sus campos de contraseña de empresa: los siete ocultos · ' +
      'antes «Supervisor» con casilla abría un campo de contraseña que duplicaba al de rolOv');
    /* El discriminador: el estado interno se sigue cargando del perfil, porque `saveProfile` lo
       lee. Si se dejara de cargar, guardar el perfil apagaría el rol de todo el mundo. */
    PRUEBAS.cierto(document.getElementById('inEsSupervisor').checked, 'y la casilla interna sigue reflejando el perfil (saveProfile la lee)');
  } finally { try { closeSetup(); } catch(e){} p170Restaurar(prev); }
});

/* ── (b) en el alta, la contraseña de la empresa es obligatoria ──────────────────────────────── */

PRUEBAS.caso('🔴 en el ALTA la pantalla del rol no ofrece «Ahora no»: dice cómo entrar y ofrece salir del registro', () => {
  const prev = p170Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  try {
    PRUEBAS.falso(_complete, 'precondición · el arnés arranca sin perfil completo');
    avanzarAlta();                                      // R17 · la máquina de estados del alta
    PRUEBAS.cierto(p170Abierto('rolOv'), 'precondición · la pantalla del rol se abrió');
    PRUEBAS.cierto(ROL_OF_OBLIGATORIO === true, '🔴 en el alta es OBLIGATORIA');
    const btn = document.getElementById('rolSalirBtn');
    PRUEBAS.igual(btn.textContent, t('rol_of_salir'), '🔴 el botón de abajo ya no dice «Ahora no»: dice «Salir del registro»');
    const lead = document.getElementById('rolLead').textContent;
    PRUEBAS.igual(lead, t('rol_of_lead_alta', { rol: t('rol_supervisor') }), '🔴 y la bajada explica que se entra con la contraseña de la empresa');
    PRUEBAS.falso(/Ahora no|Not now/.test(lead), 'sin la frase «si no la tienes, toca Ahora no», que fue lo que Franco leyó como «entran igual»');
    PRUEBAS.cierto(lead.indexOf(t('rol_supervisor')) >= 0, 'nombrando el rol concreto');
  } finally { p170Restaurar(prev); }
});

PRUEBAS.caso('🔴 «Salir del registro» pide confirmación (R8) y, si se cancela, la pantalla sigue ahí · nadie entra sin contraseña', () => {
  const prev = p170Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  try {
    avanzarAlta();
    PRUEBAS.cierto(p170Abierto('rolOv'), 'precondición · abierta');
    let preguntas = 0;
    window.confirm = () => { preguntas++; return false; };   // la persona se arrepiente
    rolSalir();
    PRUEBAS.igual(preguntas, 1, '🔴 se preguntó una vez (es cerrar la sesión: R8)');
    PRUEBAS.cierto(p170Abierto('rolOv'), '🔴 y al cancelar la pantalla sigue abierta · no hay atajo hacia adentro');
    PRUEBAS.falso(rolYaOfrecido(), '⚠️ y NO quedó marcada como «ya ofrecida»: el próximo arranque la vuelve a pedir');
    PRUEBAS.cierto(!!getProfile(), 'el perfil sigue (la salida real la hace cerrarSesion, que recarga la página)');
  } finally { p170Restaurar(prev); }
});

PRUEBAS.caso('🔴 el botón «atrás» del teléfono, en el alta, hace lo mismo que «Salir del registro»', () => {
  const prev = p170Preparar({ rol:'medico', rolOrigen:'nomina' });
  try {
    avanzarAlta();
    PRUEBAS.cierto(p170Abierto('rolOv'), 'precondición · abierta (también para el servicio médico)');
    let preguntas = 0;
    window.confirm = () => { preguntas++; return false; };
    PRUEBAS.cierto(silvaAtras(), '«atrás» se ocupó de algo');
    PRUEBAS.igual(preguntas, 1, '🔴 preguntó si salir, en vez de posponer en silencio');
    PRUEBAS.cierto(p170Abierto('rolOv'), 'y al cancelar sigue abierta');
    PRUEBAS.falso(rolYaOfrecido(), 'sin marcar «ya ofrecida»');
  } finally { p170Restaurar(prev); }
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · desde Más → Tu acceso la misma pantalla sigue siendo opcional', () => {
  /* Ahí la persona ya está adentro (entró como corresponde) y sólo vino a activar el panel: no se
     la echa por no tener la contraseña a mano. Es el contrato del ADR 002 que P100 fijó. */
  const prev = p170Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  try {
    miRolPintar(); miRolTocar();
    PRUEBAS.cierto(p170Abierto('rolOv'), 'precondición · abierta desde Más');
    PRUEBAS.falso(!!ROL_OF_OBLIGATORIO, '⚠️ opcional');
    PRUEBAS.igual(document.getElementById('rolSalirBtn').textContent, t('rol_of_luego'), 'el botón dice «Ahora no»');
    PRUEBAS.igual(document.getElementById('rolLead').textContent, t('rol_of_lead', { rol: t('rol_supervisor') }), 'y la bajada es la de siempre');
    let preguntas = 0;
    window.confirm = () => { preguntas++; return true; };
    rolSalir();
    PRUEBAS.igual(preguntas, 0, 'posponer no pregunta nada');
    PRUEBAS.falso(p170Abierto('rolOv'), 'y cierra');
    PRUEBAS.cierto(rolYaOfrecido(), 'marcando la cédula, como siempre');
  } finally { p170Restaurar(prev); }
});

PRUEBAS.caso('🔴 con la contraseña correcta se entra y se sigue al paso de la contraseña PROPIA · el orden que pidió Franco', async () => {
  /* «…contraseña de supervisor, y ahí entro. Y hago mi propia contraseña para cuando cierre
     sesión o quiera entrar en otro dispositivo». Primero la de la empresa, después la propia. */
  const prev = p170Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  const oFetch = window.fetch;
  try {
    localStorage.removeItem(K_CLV_OFRECIDA);   // acá SÍ queremos ver el paso 5
    avanzarAlta();
    PRUEBAS.cierto(p170Abierto('rolOv'), 'precondición · abierta');
    window.fetch = () => Promise.resolve({ ok:true, status:200, type:'cors',
      json: () => Promise.resolve({ ok:true, rol:'supervisor', vista:'supervisor', sesion:'tok-p170' }) });
    document.getElementById('rolPass').value = 'clave-de-empresa';
    rolConfirmar(document.querySelector('#rolOv .save-btn'));
    for (let i = 0; i < 40; i++) await Promise.resolve();
    PRUEBAS.falso(p170Abierto('rolOv'), '🔴 con la contraseña buena la pantalla se cierra');
    PRUEBAS.cierto(!!(getProfile() || {}).esSupervisor, 'y el rol quedó activado');
    PRUEBAS.cierto(p170Abierto('claveOv'), '🔴 y sigue la contraseña propia: «para cuando cierre sesión o entre en otro dispositivo»');
  } finally { window.fetch = oFetch; p170Restaurar(prev); }
});

/* ── (c) reingreso sin contraseña propia ─────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 cerró sesión SIN haber creado contraseña → «Ingresar» va al código, no al login', () => {
  const prev = p170Guardar();
  try {
    localStorage.clear();
    reingresoGuardar('Empresa P170');                   // lo que deja cerrarSesion
    PRUEBAS.falso(tieneClaveGuardada(), 'precondición · sin marca de contraseña');
    splashMostrar();
    splashIngresar();                                   // R17 · el botón de la portada
    PRUEBAS.cierto(p170Abierto('nominaOv'), '🔴 abre el alta por el código · antes abría el login y decía «entra con tu contraseña»');
    PRUEBAS.falso(p170Abierto('loginOv'), 'no el login');
    PRUEBAS.falso(p170Abierto('splashOv'), 'y el splash se fue (no queda tapando el alta)');
  } finally { try { nominaCerrar(); } catch(e){} p170Restaurar(prev); }
});

PRUEBAS.caso('🔴 EL DISCRIMINADOR · cerró sesión CON contraseña propia → «Ingresar» abre el login', () => {
  const prev = p170Guardar();
  try {
    localStorage.clear();
    reingresoGuardar('Empresa P170');
    tieneClaveMarcar(true);
    splashMostrar();
    splashIngresar();
    PRUEBAS.cierto(p170Abierto('loginOv'), '🔴 con la marca, el login: es para quien sí tiene qué escribir');
    PRUEBAS.falso(p170Abierto('nominaOv'), 'y no el alta');
  } finally { try { lgnCerrar(true); } catch(e){} p170Restaurar(prev); }
});

PRUEBAS.caso('⚠️ la marca se pone en las cuatro fuentes y sobrevive a cerrar sesión', () => {
  const prev = p170Guardar();
  try {
    localStorage.clear();
    tieneClaveMarcar(true);
    PRUEBAS.cierto(tieneClaveGuardada(), 'marcar → guardada');
    PRUEBAS.cierto(sesionClavesBorrar().indexOf(K_TIENE_CLAVE) < 0, '⚠️ cerrar sesión NO la borra: es justamente para después de cerrar sesión');
    tieneClaveMarcar(false);
    PRUEBAS.falso(tieneClaveGuardada(), 'desmarcar → sin marca');
    const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    const dentro = (fn, re) => { const i = fuente.indexOf('function ' + fn + '('); return i >= 0 && re.test(fuente.slice(i, i + 9000)); };
    PRUEBAS.cierto(dentro('clvGuardar', /tieneClaveMarcar\(true\)/), 'al crear la contraseña propia');
    PRUEBAS.cierto(dentro('lgnEntrar', /tieneClaveMarcar\(true\)/), 'al entrar con ella');
    PRUEBAS.cierto(dentro('nominaSoyYo', /tieneClaveMarcar\(true\)/), 'y cuando el servidor dice `tieneClave` en «¿eres tú?»');
  } finally { p170Restaurar(prev); }
});

PRUEBAS.caso('⚠️ los textos nuevos están en los dos idiomas (R14)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['rol_of_lead_alta','rol_of_salir'].forEach(k => PRUEBAS.cierto(t(k, { rol:'x' }) !== k, k + ' en ' + l)); });
    localStorage.setItem(K_LANG, 'es');
    PRUEBAS.falso(/\bvos\b|\bvení\b|\btenés\b/i.test(t('rol_of_lead_alta', { rol:'x' })), 'R1 · español neutro');
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

/* ── P170b · el rol sin responder se vuelve a pedir; el atajo del admin no ─────────────────── */

PRUEBAS.caso('🔴 P170b · entrar con contraseña propia (login normal) con rol propuesto sin responder SÍ pide la de empresa · el atajo del admin no', () => {
  /* Las dos puertas aplican la misma entrada (`lgnAplicarEntrada`); la diferencia es la bandera
     `desdeAdmin`. Se prueba el contrato de la función con las dos banderas, y que el atajo real
     pasa `true` (por el fuente: el camino entero lo mide p166). */
  const prev = p170Guardar();
  try {
    const d = { ok:true, sesion:'tok', persona: Object.assign({}, P170_PERFIL, { rol:'supervisor', rolOrigen:'nomina' }), consentimientos:{} };
    const cons = { items:{} }; CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
    const base = () => { localStorage.clear(); localStorage.setItem(K_CONSENT, JSON.stringify(cons)); localStorage.setItem(K_TEXTO, '1'); };
    base();
    lgnAplicarEntrada(d, P170_PERFIL.cedula, P170_PERFIL.empresa);            // login normal
    PRUEBAS.cierto(p170Abierto('rolOv'), '🔴 por el login normal, con rol propuesto y sin responder, se pide la contraseña de empresa');
    PRUEBAS.cierto(ROL_OF_OBLIGATORIO === true, 'obligatoria');
    rolOfrecerCerrar();
    base();
    lgnAplicarEntrada(d, P170_PERFIL.cedula, P170_PERFIL.empresa, true);      // desde admin
    PRUEBAS.falso(p170Abierto('rolOv'), '🔴 EL DISCRIMINADOR · desde el atajo del administrador no se pide');
    PRUEBAS.cierto(rolYaOfrecido(), 'y queda marcada en este dispositivo');
    const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    const i = fuente.indexOf('function admAtajoIr(');
    PRUEBAS.cierto(i > 0 && /lgnAplicarEntrada\([^;]*,\s*true\)/.test(fuente.slice(i, i + 6000)), '⚠️ y `admAtajoIr` de verdad pasa la bandera');
  } finally { p170Restaurar(prev); try { closeSetup(); } catch(e){} }
});
