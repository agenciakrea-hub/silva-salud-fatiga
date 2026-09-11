PRUEBAS.grupo('P175 · cambiar la contraseña propia, el ↺ del ciclo y el historial del alta');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Las tres decisiones que tomó Franco en el panel de P174 (2026-09-11):

   1 · EL ↺ SALE DE LAS TARJETAS DEL CICLO OPERATIVO. Quitaba la marca y nada más: el evento seguía
       en la línea de tiempo, el ciclo seguía «en curso» desde ahí, y la fila de `Operacional` ya
       había salido — el supervisor la veía igual. No se promete deshacer lo que ya viajó.
   2 · CAMBIAR LA CONTRASEÑA PROPIA SABIÉNDOLA. `credencial_cambiar` estaba escrita en el servidor,
       ruteada, y con CERO llamadas del cliente. El único camino era pedirle a un supervisor que la
       reiniciara, o sea contarle a alguien que querés cambiarla.
   3 · LAS ENTRADAS DE HISTORIAL HUÉRFANAS DEL ALTA. Medido por el camino real ANTES de tocar
       (consentimiento → tamaño de texto → contraseña, con el perfil recién escrito):
       **3 `pushState`, 0 `history.back`**. O sea tres toques de «atrás» que no hacen nada al
       terminar el registro. Después del arreglo: **1 push**, que es la que `altaEncadenar`
       documenta y deja a propósito.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P175_CAB_CRED = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso'];
const P175_CAB_NOM  = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];

function p175Env(fns){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [P175_CAB_NOM.slice(),
      ['Consorcio HELITEC','Ana Suárez','V-111','Operaciones','Piloto','F','34','','ana@h.com','Sí','','','4']],
    'Credenciales': [P175_CAB_CRED.slice()],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionCredencialCrear','accionCredencialCambiar','accionLogin'].concat(fns || []));
  api.__env = env;
  api.__json = r => JSON.parse(r.getContent ? r.getContent() : r);
  api.__cred = () => env.__libro.getSheetByName('Credenciales').__volcado();
  api.__crear = pass => api.__json(api.accionCredencialCrear({
    empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez', pass:pass, dispositivoId:'d1', _post:true }));
  api.__login = pass => api.__json(api.accionLogin({
    empresa:'Helitec', cedula:'V-111', pass:pass, dispositivoId:'d2', _post:true }));
  /* R17 · se entra por `manejar`, que es lo que corre doPost. */
  api.__cambiar = (actual, nueva, extra) => api.__json(api.manejar(Object.assign(
    { action:'credencial_cambiar', empresa:'Helitec', cedula:'V-111', pass:actual, pass_nueva:nueva,
      dispositivoId:'d1', _post:true }, extra || {})));
  return api;
}
const p175Sin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };

/* ── 1 · el servidor ─────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 EL CAMINO COMPLETO · Ana cambia su contraseña sabiéndola, y desde ahí entra con la nueva', () => {
  if (p175Sin()) return;
  const api = p175Env();
  PRUEBAS.igual(api.__crear('ClaveVieja1').ok, true, 'precondición · tenía una');
  const hashAntes = String((api.__cred().find(f => String(f[1]).indexOf('111') >= 0) || [])[3] || '');
  PRUEBAS.cierto(!!hashAntes, 'precondición · con hash guardado');

  const r = api.__cambiar('ClaveVieja1', 'ClaveNueva9');
  PRUEBAS.igual(r.ok, true, '🔴 la cambia · ' + (r.error || ''));
  PRUEBAS.igual(r.cambiada, true, 'y lo dice');
  PRUEBAS.igual(api.__login('ClaveVieja1').ok, false, '🔴 la vieja deja de entrar');
  PRUEBAS.igual(api.__login('ClaveNueva9').ok, true, '🔴 y la nueva entra · el camino se cierra');

  const fila = api.__cred().find(f => String(f[1]).indexOf('111') >= 0);
  PRUEBAS.igual(api.__cred().filter(f => String(f[1]).indexOf('111') >= 0).length, 1, '⚠️ sin duplicar la fila');
  PRUEBAS.cierto(String(fila[3] || '') !== hashAntes, 'el hash es otro');
  PRUEBAS.cierto(!!String(fila[4] || ''), '⚠️ y la sal también: reusar la vieja dejaría comparar hashes y saber si cambió de verdad');
});

PRUEBAS.caso('🔒 con la contraseña actual equivocada no cambia nada', () => {
  if (p175Sin()) return;
  const api = p175Env();
  api.__crear('ClaveVieja1');
  const r = api.__cambiar('LaQueNoEs9', 'ClaveNueva9');
  PRUEBAS.igual(r.ok, false, '🔒 no cambia');
  PRUEBAS.igual(r.motivo, 'credenciales', 'y el motivo es de la ACTUAL, no de la nueva · el cliente lo dice así para que no borre y reescriba la de abajo');
  PRUEBAS.igual(api.__login('ClaveVieja1').ok, true, 'EL DISCRIMINADOR · la de siempre sigue funcionando');
});

PRUEBAS.caso('🔒 sólo por POST · esta acción lleva DOS contraseñas en claro', () => {
  if (p175Sin()) return;
  const api = p175Env();
  api.__crear('ClaveVieja1');
  const r = api.__json(api.manejar({ action:'credencial_cambiar', empresa:'Helitec', cedula:'V-111',
                                     pass:'ClaveVieja1', pass_nueva:'ClaveNueva9', dispositivoId:'d1' }));
  PRUEBAS.igual(r.ok, false, '🔒 por GET no entra · en la URL quedarían en los registros de ejecución y en cualquier proxy del camino');
  PRUEBAS.igual(api.__login('ClaveVieja1').ok, true, 'y no cambió nada');
  PRUEBAS.igual(api.__cambiar('ClaveVieja1', 'ClaveNueva9').ok, true, 'EL DISCRIMINADOR · por POST sí');
});

PRUEBAS.caso('⚠️ una contraseña nueva débil se rechaza con su motivo', () => {
  if (p175Sin()) return;
  const api = p175Env();
  api.__crear('ClaveVieja1');
  const corta = api.__cambiar('ClaveVieja1', 'abc');
  PRUEBAS.igual(corta.motivo, 'clave_debil', 'corta → clave_debil');
  const num = api.__cambiar('ClaveVieja1', '123456789');
  PRUEBAS.igual(num.motivo, 'clave_debil', 'sólo números → ídem');
  PRUEBAS.igual(api.__login('ClaveVieja1').ok, true, 'EL DISCRIMINADOR · y la de siempre sigue');
});

/* ── 2 · la pantalla ─────────────────────────────────────────────────────────────────────────── */

function p175Guardar(){
  return { perf: localStorage.getItem(K_PROFILE), ses: localStorage.getItem(K_SES_PERSONA),
           ofr: localStorage.getItem(K_CLV_OFRECIDA), lang: localStorage.getItem(K_LANG),
           modo: (typeof CLV_MODO !== 'undefined' ? CLV_MODO : undefined) };
}
function p175Restaurar(p){
  const set = (k, v) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); };
  set(K_PROFILE, p.perf); set(K_SES_PERSONA, p.ses); set(K_CLV_OFRECIDA, p.ofr); set(K_LANG, p.lang);
  try { CLV_MODO = p.modo; } catch(e){}
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  try { syncScrollLock(); } catch(e){}
}
const P175_PERFIL = { nombre:'Ana Suárez', empresa:'Consorcio HELITEC', cedula:'V-111',
  departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34',
  telefono:'04121112233', email:'ana@h.com', esPiloto:true, id_piloto:'PIL-1' };

PRUEBAS.caso('🔴 «Mi contraseña» con sesión abierta abre CAMBIAR, no un login de la que ya tiene', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    localStorage.setItem(K_SES_PERSONA, JSON.stringify({ token:'sst_x', cedula:'V-111' }));
    miClaveTocar();   // R17 · el punto de entrada real de la fila de «Más»
    PRUEBAS.cierto(document.getElementById('claveOv').classList.contains('show'),
      '🔴 abre la hoja de contraseña · el comentario de `miClaveTocar` decía «lo que necesita es cambiarla» y abría un LOGIN');
    PRUEBAS.falso(document.getElementById('loginOv').classList.contains('show'), 'y no el login');
    PRUEBAS.igual(CLV_MODO, 'cambiar', 'en modo cambio');
    PRUEBAS.falso(document.getElementById('clvActualCampo').hidden, '🔴 con el campo de la contraseña ACTUAL a la vista');
    PRUEBAS.cierto(document.getElementById('clvCodigoCampo').hidden,
      '⚠️ y sin el código de empresa: quien escribe su contraseña actual ya demostró quién es');
    PRUEBAS.cierto((document.getElementById('clvOlvide').textContent || '').length > 20,
      '⚠️ y con la salida para quien no la recuerda: si no, esta pantalla es un callejón para justo esa persona');
  } finally { p175Restaurar(prev); }
});

PRUEBAS.caso('⚠️ las dos reglas que sólo existen al cambiar, y el botón que no se habilita sin ellas', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    clvCambiarAbrir();
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); };
    PRUEBAS.cierto(document.getElementById('clvBtn').disabled, 'con todo vacío, no se puede guardar');
    set('clvActual','ClaveVieja1'); set('clvPass','ClaveVieja1'); set('clvPass2','ClaveVieja1');
    PRUEBAS.cierto(document.getElementById('clvBtn').disabled,
      '⚠️ la nueva igual a la actual NO se acepta · el servidor no lo trata como error, así que sin esto la persona toca guardar y no tiene forma de saber si pasó algo');
    set('clvPass','ClaveNueva9'); set('clvPass2','ClaveNueva9');
    PRUEBAS.falso(document.getElementById('clvBtn').disabled, 'EL DISCRIMINADOR · con las tres bien, se habilita');
    set('clvActual','');
    PRUEBAS.cierto(document.getElementById('clvBtn').disabled, 'y sin la actual, no');
  } finally { p175Restaurar(prev); }
});

PRUEBAS.caso('⚠️ «Cancelar» cierra y no sigue el recorrido del alta', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    lsSet(K_CLV_OFRECIDA, JSON.stringify({}));
    clvCambiarAbrir();
    PRUEBAS.igual(document.getElementById('clvLuego').textContent, t('cancelar'), 'el botón dice «Cancelar», no «Más tarde»');
    clvPosponer();
    PRUEBAS.falso(document.getElementById('claveOv').classList.contains('show'), 'cierra');
    PRUEBAS.igual([...document.querySelectorAll('.overlay.show')].map(o=>o.id), [],
      '⚠️ y NO abre el paso siguiente del alta: este recorrido terminó hace meses');
    PRUEBAS.falso(clvYaOfrecida(),
      '⚠️ ni marca «ya se le ofreció crear una»: cancelar un cambio no dice nada sobre eso');
  } finally { p175Restaurar(prev); }
});

PRUEBAS.caso('⚠️ volver a «crear» repinta la hoja · la misma hoja sirve para las dos cosas', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    clvCambiarAbrir();
    PRUEBAS.igual(document.getElementById('clvTitulo').textContent, t('clv_c_titulo'), 'precondición · está en modo cambio');
    clvAbrir();
    PRUEBAS.igual(CLV_MODO, 'crear', 'vuelve a crear');
    PRUEBAS.igual(document.getElementById('clvTitulo').textContent, t('clv_titulo'), 'y el título lo dice');
    PRUEBAS.igual(document.getElementById('clvBtn').textContent, t('clv_guardar'), 'y el botón también');
    PRUEBAS.cierto(document.getElementById('clvActualCampo').hidden, 'sin el campo de la contraseña actual');
  } finally { p175Restaurar(prev); }
});

PRUEBAS.caso('⚠️ R14 · cambiar de idioma con la hoja abierta no la deja mitad y mitad', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    clvCambiarAbrir();
    localStorage.setItem(K_LANG, 'en'); aplicarIdioma();
    PRUEBAS.igual(CLV_MODO, 'cambiar', 'sigue en modo cambio');
    PRUEBAS.igual(document.getElementById('clvTitulo').textContent, 'Change my password',
      '⚠️ el título se repinta · estos textos NO llevan `data-i18n` porque dependen del modo, así que el barrido no los alcanza');
    PRUEBAS.igual(document.getElementById('clvBtn').textContent, 'Save the new one', 'y el botón');
    PRUEBAS.igual(document.getElementById('clvLuego').textContent, 'Cancel', 'y el de cancelar');
    localStorage.setItem(K_LANG, 'es'); aplicarIdioma();
    PRUEBAS.igual(document.getElementById('clvTitulo').textContent, 'Cambiar mi contraseña', 'y vuelve');
  } finally { p175Restaurar(prev); }
});

PRUEBAS.caso('⚠️ los textos nuevos están en los dos idiomas y en español NEUTRO (R14, R1)', () => {
  const antes = localStorage.getItem(K_LANG);
  const claves = ['clv_actual','clv_c_nueva','clv_c_titulo','clv_c_lead','clv_c_guardar',
                  'clv_c_listo','clv_c_mal','clv_c_sin_red','clv_olvide','clv_r_actual','clv_r_distinta'];
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      claves.forEach(k => PRUEBAS.cierto(t(k) !== k, k + ' en ' + l)); });
    localStorage.setItem(K_LANG, 'es');
    claves.forEach(k => PRUEBAS.falso(/\bvos\b|\btenés\b|\bpodés\b|\bquerés\b|\bescribí\b/i.test(t(k)), 'R1 en ' + k));
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

/* ── 3 · el ↺ del ciclo ──────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el ↺ no aparece en las tarjetas que ya escribieron en el CH, y sí en las demás', () => {
  const prev = p175Guardar();
  try {
    setProfile(P175_PERFIL);
    renderSections();   // R17 · se entra por el render real, no armando una tarjeta a mano
    const mapa = {};
    seccionesApp().forEach(s => (s.items || []).forEach(i => { mapa[i.id] = !!i.operacionalCampo; }));
    const filas = [...document.querySelectorAll('#sections .item')]
      .map(w => ({ id: w.dataset.id, op: !!mapa[w.dataset.id], undo: !!w.querySelector('.undo') }));
    const ciclo = filas.filter(f => f.op), otras = filas.filter(f => !f.op);
    PRUEBAS.alMenos(ciclo.length, 1, 'hay tarjetas de ciclo en pantalla · si esto diera 0, lo de abajo no mediría nada');
    PRUEBAS.alMenos(otras.length, 1, 'y tarjetas que no son de ciclo');
    PRUEBAS.igual(ciclo.filter(f => f.undo).length, 0,
      '🔴 ninguna del ciclo tiene ↺ · quitaba la marca y dejaba el evento en la línea de tiempo y la fila en el CH');
    PRUEBAS.igual(otras.filter(f => f.undo).length, otras.length,
      '🔴 EL DISCRIMINADOR · las demás lo conservan enteras: ahí el ↺ sí deshace todo lo que hizo');
  } finally { p175Restaurar(prev); try { renderSections(); } catch(e){} }
});

/* ── 4 · el historial del alta ───────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 una transición del alta TRASPASA su entrada de historial en vez de apilar otra', () => {
  const prev = p175Guardar();
  const oP = history.pushState.bind(history);
  let pushes = 0;
  history.pushState = function(){ pushes++; return oP.apply(history, arguments); };
  try {
    setProfile(P175_PERFIL);
    try { localStorage.removeItem(K_CONSENT); } catch(e){}
    /* Sin encadenar: `avanzarAlta()` abre el consentimiento y apila su entrada, como siempre. */
    const antes = pushes;
    avanzarAlta();
    const solo = pushes - antes;
    PRUEBAS.igual(solo, 1, 'EL DISCRIMINADOR · abrir una pantalla del alta apila UNA entrada · si diera 0 acá, lo de abajo daría 0 sin probar nada');
    document.getElementById('consent').classList.remove('show');
    /* Encadenando: la pantalla siguiente REUSA esa entrada. */
    const antes2 = pushes;
    altaEncadenar(function(){});
    PRUEBAS.igual(pushes - antes2, 0,
      '🔴 y la siguiente no apila: traspasa la que había · medido por el camino real antes de tocar, ' +
      'el tramo consentimiento → tamaño de texto → contraseña daba 3 `pushState` y 0 `back` — tres ' +
      'toques de «atrás» que no hacen nada al terminar el registro');
  } finally {
    history.pushState = oP;
    p175Restaurar(prev);
    try { localStorage.removeItem(K_CONSENT); } catch(e){}
  }
});

PRUEBAS.caso('🔴 y las cinco transiciones del alta pasan por ahí', () => {
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  /* `saveProfile` es larga: su `finalizar()` cae a ~9.200 caracteres del `function`, así que la
     ventana de 9.000 que usan los otros casos no llegaba. Se mide hasta el fin de la función. */
  const dentro = (fn, re, largo) => { const i = f.indexOf('function ' + fn + '('); return i >= 0 && re.test(f.slice(i, i + (largo || 9000))); };
  [['acceptConsent','el consentimiento'], ['confirmarTamanoTexto','el tamaño de texto'],
   ['clvGuardar','la contraseña creada'], ['rolConfirmar','el rol activado']].forEach(([fn, q]) =>
    PRUEBAS.cierto(dentro(fn, /altaEncadenar\(/), '🔴 ' + q + ' (' + fn + ')'));
  PRUEBAS.cierto(dentro('saveProfile', /altaEncadenar\(/, 14000), '🔴 y el formulario de perfil (saveProfile → finalizar)');
  /* EL DISCRIMINADOR: las dos que ya encadenaban desde P153c siguen encadenando. Si el arreglo
     hubiera reemplazado en vez de sumar, esto lo diría. */
  PRUEBAS.cierto(dentro('clvPosponer', /altaEncadenar\(/), 'EL DISCRIMINADOR · «Más tarde» de la contraseña sigue encadenando');
  PRUEBAS.cierto(dentro('rolPosponer', /altaEncadenar\(/), 'EL DISCRIMINADOR · y «Ahora no» del rol también');
});
