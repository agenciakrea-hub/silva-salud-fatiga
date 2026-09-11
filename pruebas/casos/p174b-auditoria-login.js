PRUEBAS.grupo('P174b · auditoría de login, inicio y contraseñas');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Pedido de Franco (2026-09-11): «revisa más cosas del login, del inicio, contraseñas, demás.
   Audita, porque esas cosas me pasaron porque probé, pero anda a saber qué más hay por ahí».
   Cuatro auditorías en paralelo sobre contraseñas, recorrido de entrada, servidor de autenticación
   y pantalla de inicio. Cada caso de acá es un defecto que se confirmó leyendo el código o
   midiendo en el navegador, y que se arregló en este mismo paso.

   ⚠️ EL MÁS GRAVE ES EL PRIMERO, y era de P174 mismo: el botón para reiniciar la contraseña ya
   estaba, y la persona a la que se la reiniciaban NO TENÍA CÓMO PONER UNA NUEVA en su teléfono.
   La prueba de P174 daba verde porque llamaba `accionCredencialCrear` directo — R17 textual: se
   probó el endpoint, no que el cliente pudiera llegar a él.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P174B_CAB_CRED = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso'];
const P174B_CAB_SES  = ['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada'];
const P174B_CAB_NOM  = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];

function p174bEnv(fns, hojas){
  const env = GS.crearEntorno(Object.assign({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq'],
                ['*','clave-admin','admin','*','','']],
    'Nómina': [P174B_CAB_NOM.slice(),
      ['Consorcio HELITEC','Ana Suárez','V-111','Operaciones','Piloto','F','34','+58 412 1112233','ana@h.com','Sí','','','4'],
      ['Consorcio HELITEC','Beto Pérez','V-222','Operaciones','Piloto','M','40','','','Sí','','','']],
    'Credenciales': [P174B_CAB_CRED.slice()],
    'Sesiones': [P174B_CAB_SES.slice()],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor'], ['Consorcio HELITEC','sector','aviacion']],
    'Ausencias': [['Id','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado','Marcada','MarcadaPor','','']],
    'Gestiones': [['Empresa','ID','Datos (JSON)','Última actualización']],
    'Tareas': [['Empresa','Id','Persona','Titulo','Detalle','Vence','Estado','Creada','Autor','Cerrada','Rol']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  }, hojas || {}));
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionEmpleado','accionCredencialCrear','accionCredencialReiniciar',
    'accionLogin','accionAusencias','accionGestiones','accionTareasPersona','accionPvt',
    'leerConfigEmpresa','accFrenado','accAnotarFallo','accLimpiar','credBuscar','ausScope','construirAlias'].concat(fns || []));
  api.__env = env;
  api.__json = r => JSON.parse(r.getContent ? r.getContent() : r);
  api.__hoja = n => env.__libro.getSheetByName(n).__volcado();
  api.__crearClave = (ced, pass) => api.__json(api.accionCredencialCrear({
    empresa:'Helitec', cedula:ced, persona:'Ana Suárez', pass:pass, dispositivoId:'d1', _post:true }));
  api.__empleado = (ced, pass) => api.__json(api.accionEmpleado({
    empresa:'Helitec', persona:'Ana Suárez', cedula:ced, pass:pass || '', dispositivoId:'d9', _post:true }));
  return api;
}
const p174bSin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };

/* ── 1 · la contraseña reiniciada ────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 EL AGUJERO DE P174 · con la contraseña reiniciada, el servidor NO deja entrar y DICE por qué', () => {
  if (p174bSin()) return;
  const api = p174bEnv();
  PRUEBAS.igual(api.__crearClave('V-111', 'ClaveVieja1').ok, true, 'precondición · Ana tenía contraseña');
  const conClave = api.__empleado('V-111', '');
  PRUEBAS.igual(conClave.motivo, 'necesita_clave', 'EL DISCRIMINADOR · con hash, el candado Z2 pide la contraseña');

  api.__json(api.manejar({ action:'credencial_reiniciar', usuario:'helitec', pass:'clave-sup',
                           cedula:'V-111', dispositivoId:'d-sup', _post:true }));
  const r = api.__empleado('V-111', '');
  PRUEBAS.igual(r.ok, false, '🔴 con el hash vacío TAMPOCO entra · antes el candado se salteaba entero y cualquiera con nombre + cédula leía sus registros');
  PRUEBAS.igual(r.motivo, 'clave_reiniciada', '🔴 y se distingue de «necesita_clave»: no hay contraseña que escribir, hay una que elegir');
});

PRUEBAS.caso('🔴 y el cliente lo atiende: borra la sesión muerta y abre ELEGIR contraseña, no el login', () => {
  const prevSes = localStorage.getItem(K_SES_PERSONA);
  const prevOfr = localStorage.getItem(K_CLV_OFRECIDA);
  const prevPerf = localStorage.getItem(K_PROFILE);
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Consorcio HELITEC', cedula:'V-111', departamento:'Operaciones', cargo:'Piloto' });
    localStorage.setItem(K_SES_PERSONA, JSON.stringify({ token:'ses_x', cedula:'V-111' }));
    lsSet(K_CLV_OFRECIDA, JSON.stringify({ [dashNorm('V-111')]: true }));
    PRUEBAS.cierto(!!sesPersonaGuardada(), 'precondición · hay sesión guardada');
    PRUEBAS.cierto(clvYaOfrecida(), 'precondición · y la marca de «ya se le ofreció»');

    const abrio = clvReiniciadaAtender();
    PRUEBAS.cierto(abrio, '🔴 abre algo · antes no había NINGÚN camino: `avanzarAlta` la saltea con el perfil completo');
    PRUEBAS.cierto(document.getElementById('claveOv').classList.contains('show'),
      '🔴 y es la pantalla de ELEGIR contraseña · «Mi contraseña» mandaba al login de una que ya no existe');
    PRUEBAS.falso(!!sesPersonaGuardada(), '🔴 la sesión muerta se borra: si no, el próximo arranque manda un token que ya no vale');
    PRUEBAS.falso(clvYaOfrecida(), '🔴 y se levanta la marca, sólo la de ESTA cédula (es un mapa por persona)');
  } finally {
    try { document.getElementById('claveOv').classList.remove('show'); } catch(e){}
    try { syncScrollLock(); } catch(e){}
    if (prevSes == null) localStorage.removeItem(K_SES_PERSONA); else localStorage.setItem(K_SES_PERSONA, prevSes);
    if (prevOfr == null) localStorage.removeItem(K_CLV_OFRECIDA); else localStorage.setItem(K_CLV_OFRECIDA, prevOfr);
    if (prevPerf == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, prevPerf);
  }
});

/* ── 2 · los recortes de vista que faltaban ──────────────────────────────────────────────────── */

PRUEBAS.caso('🔒 a Dirección (HSEQ) no le llegan ausencias, gestiones ni tareas de una persona con nombre', () => {
  if (p174bSin()) return;
  const api = p174bEnv();
  const cred = v => ({ usuario:'helitec', pass:v, dispositivoId:'d-h', _post:true });
  ['accionAusencias','accionGestiones'].forEach(fn => {
    const r = api.__json(api[fn](cred('clave-hseq')));
    PRUEBAS.igual(r.ok, false, '🔒 ' + fn + ' corta la vista anonimizada');
    PRUEBAS.igual(r.motivo, 'sin_permiso', '   y lo dice');
  });
  const t = api.__json(api.accionTareasPersona(Object.assign({ persona:'Ana Suárez' }, cred('clave-hseq'))));
  PRUEBAS.igual(t.motivo, 'sin_permiso', '🔒 tareas_persona idem · devolvía título, detalle y autor de las tareas de alguien nombrado');
  /* EL DISCRIMINADOR: el supervisor de la misma empresa SÍ pasa. Sin esto el caso diría «ok» con
     una guarda que rechace a todo el mundo. */
  PRUEBAS.igual(api.__json(api.accionAusencias(cred('clave-sup'))).ok, true, 'EL DISCRIMINADOR · el supervisor sí las ve');
  PRUEBAS.igual(api.__json(api.accionGestiones(cred('clave-sup'))).ok, true, 'EL DISCRIMINADOR · y las gestiones también');
});

PRUEBAS.caso('🔒 el código de registro y el de supervisor NO viajan al panel', () => {
  if (p174bSin()) return;
  const api = p174bEnv(null, { 'Config Empresa': [['Empresa','Clave','Valor'],
    ['Consorcio HELITEC','sector','aviacion'],
    ['Consorcio HELITEC','codigoRegistro','HEL-2026'],
    ['Consorcio HELITEC','codigoSupervisor','SUP-9'],
    ['','demo_pass','abrete']] });
  const cfg = api.leerConfigEmpresa('Consorcio HELITEC');
  PRUEBAS.falso('codigoRegistro' in cfg, '🔒 con el código se llama `nomina_personas`, que NO pide contraseña: la lista de nombres que esta vista tiene prohibida');
  PRUEBAS.falso('codigoSupervisor' in cfg, '🔒 ídem');
  PRUEBAS.falso('demo_pass' in cfg, '🔒 y la clave de la demostración pública tampoco');
  PRUEBAS.cierto('sector' in cfg, 'EL DISCRIMINADOR · lo que sí tiene que llegar, llega');
});

PRUEBAS.caso('⚠️ y la demostración SIGUE pidiendo su clave · el filtro no puede dejarla abierta', () => {
  if (p174bSin()) return;
  const api = p174bEnv(null, { 'Config Empresa': [['Empresa','Clave','Valor'], ['','demo_pass','abrete']] });
  const sin = api.__json(api.manejar({ action:'demo', dispositivoId:'d-demo' }));
  PRUEBAS.igual(sin.ok, false, '⚠️ sin clave no entra · una clave vacía dejaría la demostración ABIERTA, en silencio');
  PRUEBAS.igual(sin.motivo, 'demo_pass', 'y avisa por qué');
  const con = api.__json(api.manejar({ action:'demo', dispositivoId:'d-demo', pass:'abrete' }));
  PRUEBAS.igual(con.ok, true, 'EL DISCRIMINADOR · con la clave correcta sí');
});

/* ── 3 · el freno de intentos ────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔒 rotar el `dispositivoId` ya no da intentos ilimitados · y una clave GLOBAL no frena a todos', () => {
  if (p174bSin()) return;
  const api = p174bEnv();
  const clave = '__persona__Consorcio HELITEC|V-111';      // nombra una cuenta
  for (let i = 0; i < 70; i++) api.accAnotarFallo(clave, 'disp-' + i);
  PRUEBAS.cierto(api.accFrenado(clave, 'disp-nuevo-jamas-visto'),
    '🔒 70 intentos con 70 dispositivos distintos frenan igual · antes: cero frenados (medido en `codFrenado`)');

  /* EL DISCRIMINADOR, y es el que impide que el arreglo sea peor que el agujero: las claves
     compartidas por TODA la base no llevan contador por cuenta. Si lo llevaran, 60 contraseñas mal
     tecleadas por personas distintas dejarían afuera a todo el mundo a la vez. */
  const global = '__empleado__';
  for (let i = 0; i < 70; i++) api.accAnotarFallo(global, 'otro-' + i);
  PRUEBAS.falso(api.accFrenado(global, 'disp-inocente'),
    '🔴 EL DISCRIMINADOR · una clave global NO frena por cuenta: un fallo que CIERRA es tan malo como uno que abre');
  for (let i = 0; i < 6; i++) api.accAnotarFallo(global, 'otro-3');   // el tope por dispositivo es 6
  PRUEBAS.cierto(api.accFrenado(global, 'otro-3'), 'pero el dispositivo que insiste sí queda frenado · el freno de siempre sigue');
});

PRUEBAS.caso('⚠️ acertar limpia los DOS contadores', () => {
  if (p174bSin()) return;
  const api = p174bEnv();
  const clave = '__persona__Consorcio HELITEC|V-222';
  for (let i = 0; i < 70; i++) api.accAnotarFallo(clave, 'd-' + i);
  PRUEBAS.cierto(api.accFrenado(clave, 'd-limpio'), 'precondición · frenado por cuenta');
  api.accLimpiar(clave, 'd-limpio');
  PRUEBAS.falso(api.accFrenado(clave, 'd-limpio'),
    '⚠️ si no, quien se equivoca, acierta y vuelve a equivocarse va acumulando hasta frenarse sin hacer nada raro');
});

/* ── 4 · el texto de la persona no puede entrar como fórmula ─────────────────────────────────── */

PRUEBAS.caso('🔒 un nombre que empieza con «=» entra a la hoja como TEXTO, no como fórmula viva', () => {
  if (p174bSin()) return;
  const api = p174bEnv(['leerPVT']);
  const malicioso = '=IMPORTXML("https://x.tld","//a")';
  api.__json(api.accionPvt({ nombre: malicioso, empresa:'Consorcio HELITEC', validas:'10',
                             rt_prom:'300', dispositivoId:'d-pvt', id:'pvt-1' }));
  const sh = api.__env.__libro.getSheetByName('PVT');
  PRUEBAS.cierto(!!sh, 'se escribió la hoja');
  /* ⚠️ UN SOLO VOLCADO. `__volcado()` devuelve un array NUEVO en cada llamada, así que buscar la
     fila en uno y su índice en otro da -1 · me lo cazó la propia suite. */
  const v = sh.__volcado();
  const idx = v.findIndex(x => String(x[1] || '').indexOf('IMPORTXML') >= 0);
  PRUEBAS.alMenos(idx, 1, 'y la fila está');
  const f = v[idx] || [];
  /* La defensa REAL es `setNumberFormat("@")` sobre el rango antes de `setValues`, que es lo que
     `filaAgregar_` hace y `appendRow` no. Se comprueba el formato, que es el mecanismo. */
  const fila = idx + 1;
  PRUEBAS.igual(sh.__formatoDe(fila, 2), '@',
    '🔒 la celda del nombre quedó en formato TEXTO · con `appendRow` Sheets interpreta el valor como si alguien lo tipeara, y el formato de la celda no lo detiene');
  PRUEBAS.igual(String(f[1]), malicioso, 'y el valor está entero, sin reinterpretar');
});

/* ── 5 · el administrador y el comodín ───────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el administrador sin empresa elegida recibe un motivo que se puede accionar, no una mentira', () => {
  if (p174bSin()) return;
  const api = p174bEnv();
  api.__crearClave('V-111', 'ClaveVieja1');
  const r = api.__json(api.manejar({ action:'credencial_reiniciar', usuario:'*', empresa:'*',
                                     pass:'clave-admin', cedula:'V-111', dispositivoId:'d-adm', _post:true }));
  PRUEBAS.igual(r.motivo, 'falta_empresa',
    '🔴 antes decía «esa persona todavía no creó su contraseña», que es FALSO y manda a mirar al lado equivocado');
  const ok = api.__json(api.manejar({ action:'credencial_reiniciar', usuario:'*', empresa:'Consorcio HELITEC',
                                      pass:'clave-admin', cedula:'V-111', dispositivoId:'d-adm', _post:true }));
  PRUEBAS.igual(ok.ok, true, 'EL DISCRIMINADOR · con la empresa elegida, el administrador sí puede · ' + (ok.error || ''));
});

/* ── 6 · lo del cliente ──────────────────────────────────────────────────────────────────────── */

const p174bFuente = () => [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
const p174bDentro = (fn, re) => { const f = p174bFuente(); const i = f.indexOf('function ' + fn + '('); return i >= 0 && re.test(f.slice(i, i + 9000)); };

PRUEBAS.caso('🔴 la pantalla obligatoria del rol NO se abre sin señal (R7) · sus dos salidas son «activar» y CERRAR SESIÓN', () => {
  PRUEBAS.cierto(p174bDentro('avanzarAlta', /!rolYaOfrecido\(\)[^\n]*offHayConexion\(\)/),
    '🔴 el paso 4 pide conexión · sin esto, en un hangar sin cobertura la app queda tapada y la única salida borra la cola de registros');
  PRUEBAS.cierto(p174bDentro('rolConfirmar', /offHayConexion\(\)/),
    'EL DISCRIMINADOR · el botón sigue teniendo su propia guarda (no se sacó una por la otra)');
});

PRUEBAS.caso('🔴 el botón de reiniciar contraseña no dispara un POST real en la DEMOSTRACIÓN', () => {
  PRUEBAS.cierto(p174bDentro('credReiniciarTocar', /DASH\.demoMode/),
    '🔴 con la nómina de ejemplo el botón se pinta en 19 filas · el toque mandaba `pass` vacío y salía «Usuario o contraseña incorrecta» en medio de la demostración');
  PRUEBAS.cierto(p174bDentro('ausTocar', /DASH\.demoMode/), 'EL DISCRIMINADOR · el botón de al lado, que sirvió de molde, la tiene');
});

PRUEBAS.caso('🔒 los tres POST de `supervisor` que faltaban mandan `dispositivoId`', () => {
  const f = p174bFuente();
  const sinId = (f.match(/action:'supervisor',[^}]{0,240}/g) || []).filter(x => !/dispositivoId/.test(x));
  PRUEBAS.igual(sinId.length, 0,
    '🔒 sin el campo, el freno usa la cadena «sin-id» y el contador es UNO para todos los dispositivos del mundo · seis POST dejaban a una empresa entera sin poder activar su acceso');
});

PRUEBAS.caso('🔴 «cerrar sesión» borra el plan de ciclo PROPIO y la marca de rol ofrecido', () => {
  const l = sesionClavesBorrar();
  PRUEBAS.cierto(l.indexOf(K_CICLO_PLAN_PROPIO) >= 0,
    '🔴 el plan propio quedaba · la persona siguiente del teléfono escribía la jornada ajena en la columna `Plan`, con la que se mide el exceso');
  PRUEBAS.cierto(l.indexOf(K_ROL_OFRECIDO) >= 0,
    '🔴 y la marca del rol · quien volvía a entrar quedaba como empleado, sin que nada le ofreciera su panel (P170b)');
  PRUEBAS.cierto(l.indexOf(K_CLV_OFRECIDA) >= 0, 'EL DISCRIMINADOR · la gemela que ya estaba sigue estando');
});

PRUEBAS.caso('🔴 el reloj del ciclo vuelve a arrancar al traer la app al frente, también para el EMPLEADO', () => {
  const f = p174bFuente();
  const i = f.indexOf("if (document.hidden){ cicloTickStop(); return; }");
  PRUEBAS.cierto(i >= 0, 'el manejador está');
  const tramo = f.slice(i, i + 900);
  PRUEBAS.falso(/if \(!DASH \|\| !document\.getElementById\('dsec-ciclo'\)\) return;/.test(tramo),
    '🔴 sin la guarda de panel · el piloto bloqueaba el teléfono para manejar al aeropuerto y volvía con la aguja clavada y los minutos congelados');
  PRUEBAS.cierto(/cicloTickStart\(\);/.test(tramo), 'y sí lo vuelve a arrancar');
});

PRUEBAS.caso('🔴 la campana no afirma «no tienes tareas» antes de haber preguntado', () => {
  PRUEBAS.cierto(p174bDentro('tareasCargar', /TAREAS\._enVuelo/),
    '🔴 con un pedido en vuelo se devuelve ESE pedido · devolver una promesa resuelta pintaba la lista vacía en el acto');
  PRUEBAS.cierto(/tareasOv[\s\S]{0,80}tareasPintar\(\)/.test(p174bFuente().slice(p174bFuente().indexOf('function tareasCargar('), p174bFuente().indexOf('function tareasCargar(') + 16000)),
    'y al llegar la respuesta se repinta la hoja si está abierta · si no, quedaba «no tienes tareas» sobre una campana con número');
});

PRUEBAS.caso('🔴 el historial de ciclos se dibuja cuando llegan los datos del servidor', () => {
  PRUEBAS.cierto(p174bDentro('cicloMiRefrescar', /cicHist/),
    '🔴 se armaba SÓLO dentro de `renderSections()` · quien cambia de teléfono veía «(0) · Todavía no hay ciclos guardados» toda la sesión, con los datos ya en memoria');
  PRUEBAS.cierto(p174bDentro('cicloMiRefrescar', /\.open/), 'y se conserva desplegado si lo estaba');
});

PRUEBAS.caso('⚠️ R8 · volver a marcar un paso del ciclo ya marcado pide confirmación', () => {
  PRUEBAS.cierto(p174bDentro('buildItem', /operacionalCampo[\s\S]{0,320}confirm\(t\('op_remarcar'\)\)/),
    '⚠️ un segundo toque en «Saliendo de casa» ABRE UN CICLO NUEVO: la llegada desaparece y el reloj de jornada vuelve a cero para quien lleva tres horas');
  PRUEBAS.cierto(p174bDentro('buildItem', /op_remarcar[\s\S]{0,90}preventDefault/),
    'y al cancelar no se abre WhatsApp · el <a> seguía su curso igual');
});

PRUEBAS.caso('🔴 el splash frena su cadena de video en TODAS sus salidas', () => {
  const f = p174bFuente();
  /* Se mira cada sitio que oculta el splash y se exige que las 400 letras de ANTES frenen la tira.
     Contar líneas no serviría: `splashAbrirPortal` y `carruselMostrar` frenan con las dos llamadas
     sueltas y están bien. Lo que estaba mal eran tres sitios que sólo sacaban la clase. */
  const sitios = [];
  let i = 0, aguja = /getElementById\('splashOv'\)\.classList\.remove\('show'\)/g, m;
  while ((m = aguja.exec(f)) !== null) sitios.push(f.slice(Math.max(0, m.index - 400), m.index));
  PRUEBAS.alMenos(sitios.length, 3, 'hay varios sitios que ocultan el splash · si esto diera 0, el caso no mediría nada');
  const sinFrenar = sitios.filter(x => !/splashAnimFrenar\(\)/.test(x)).length;
  PRUEBAS.igual(sinFrenar, 0,
    '🔴 ninguno oculta el splash sin frenar antes · los tres que faltaban dejaban 1,16 MB de clips reproduciéndose debajo de la app hasta recargar');
  PRUEBAS.cierto(p174bDentro('splashCerrarUI', /splashAnimFrenar\(\)[\s\S]{0,120}splashLangHintFrenar\(\)/), 'y frena las dos cosas');
});

PRUEBAS.caso('⚠️ «atrás» conoce las dos guías de instalación', () => {
  const f = p174bFuente();
  const i = f.indexOf('function silvaAtras(');
  const tramo = f.slice(i, i + 6000);
  PRUEBAS.cierto(/visible\('iosModal'\)/.test(tramo) && /visible\('androidModal'\)/.test(tramo),
    '⚠️ esta función tiene una lista EXPLÍCITA: lo que no se nombre no existe para «atrás» · el segundo toque salía de la app con la guía puesta');
});

PRUEBAS.caso('⚠️ el login no muestra «Entrar» habilitado sobre la contraseña que acaba de vaciar', () => {
  PRUEBAS.cierto(p174bDentro('lgnAbrir', /pass\.value = ''[\s\S]{0,420}gateoAplicar\('lgnBtn'\)/),
    '⚠️ asignar `.value` a mano no dispara `input`: el gateo decidía con lo escrito la vez anterior');
});

PRUEBAS.caso('⚠️ R13 · los íconos del inicio no llevan ningún color escrito a mano', () => {
  const f = p174bFuente();
  const i = f.indexOf('function seccionesApp(');
  const tramo = i >= 0 ? f.slice(i, i + 14000) : f;
  PRUEBAS.igual((tramo.match(/icc:'#[0-9a-fA-F]{3,8}'/g) || []), [],
    '⚠️ en oscuro el de la pastilla daba 2,67:1 sobre su propio fondo (el mínimo de un objeto gráfico es 3:1): se calibró mirando el tema claro');
});

PRUEBAS.caso('⚠️ R12 · el desplegable del historial llega a 44 px', () => {
  const el = document.querySelector('.cic-hist-sum');
  if (el){
    PRUEBAS.alMenos(Math.round(el.getBoundingClientRect().height), 44,
      '⚠️ medía 40,4 px · es el desplegable que abre todo el historial operativo y se toca con guantes');
    return;
  }
  /* Sin el bloque en pantalla (no hay ciclo operativo en este estado) se mide la REGLA, que es lo
     que decide la altura. Se busca en las hojas de estilo del documento, no en el texto del
     archivo: así el caso sigue valiendo si la regla se mueve de lugar. */
  let regla = null;
  [...document.styleSheets].forEach(ss => {
    let rs = []; try { rs = [...ss.cssRules]; } catch(e){ rs = []; }
    rs.forEach(r => { if (r.selectorText && r.selectorText.split(',').some(x => x.trim() === '.cic-hist-sum')) regla = r; });
  });
  PRUEBAS.cierto(!!regla, 'la regla `.cic-hist-sum` existe · si no, el caso no estaría midiendo nada');
  PRUEBAS.igual(regla && regla.style.minHeight, '44px',
    '⚠️ medía 40,4 px · es el desplegable que abre todo el historial operativo y se toca con guantes');
});

PRUEBAS.caso('⚠️ la tendencia del inicio se mide con el día de la OPERACIÓN', () => {
  PRUEBAS.cierto(p174bDentro('iniTendencia', /new Date\(todayStr\(\)/),
    '⚠️ con la medianoche del dispositivo y la operación un huso por delante, el registro de hoy daba -1 días y se descartaba');
  PRUEBAS.falso(p174bDentro('iniTendencia', /const hoy = new Date\(\); hoy\.setHours/), 'y ya no queda el cálculo viejo');
});

PRUEBAS.caso('⚠️ la insignia del encabezado se repinta al cambiar de idioma (y de sector, R14)', () => {
  PRUEBAS.cierto(p174bDentro('aplicarIdioma', /paintProfile\(\)/),
    '⚠️ `hhRango`/`hhDoc` no llevan `data-i18n`: los escribe sólo `paintProfile`. Un operario de planta se quedaba con «Piloto» toda la sesión');
});

PRUEBAS.caso('⚠️ el ↺ pasa por `t()` y los textos nuevos están en los dos idiomas (R14, R1)', () => {
  PRUEBAS.cierto(p174bDentro('buildItem', /undo\.title = t\('undo_no_enviado'\)/), '⚠️ era el único texto del botón, escrito a mano en español');
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['clv_reiniciada','cred_reset_empresa','op_remarcar','undo_no_enviado'].forEach(k =>
        PRUEBAS.cierto(t(k) !== k, k + ' en ' + l)); });
    localStorage.setItem(K_LANG, 'es');
    ['clv_reiniciada','cred_reset_empresa','op_remarcar','undo_no_enviado'].forEach(k =>
      PRUEBAS.falso(/\bvos\b|\btenés\b|\bpodés\b|\bquerés\b/i.test(t(k)), 'R1 · español neutro en ' + k));
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});
