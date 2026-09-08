PRUEBAS.grupo('P118 · una sola derivación del perfil');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El perfil se derivaba en CINCO lugares con reglas distintas. Lo que rompía no era la duplicación:
   eran las DIFERENCIAS, y cada una le pega a una persona real.

   · `accionRecuperarPerfil` tenía dos ramas con claves DISJUNTAS — Nómina mandaba `rol` y no
     `esSupervisor`; Registrados mandaba `esSupervisor` y no `rol`.
   · La precedencia era de HOJA ENTERA: si la fila estaba en Nómina, ganaba con todo, así que una
     celda vacía ahí BORRABA el dato cargado en `Registrados Fatiga`.
   · `normalizarRolNomina` convierte la celda en blanco en "empleado", y el cliente hacía
     `q.rol || prev.rol` — como "empleado" es truthy, un supervisor de una empresa con la columna
     "Rol en la app" sin llenar PERDÍA el rol al recuperar su perfil.
   · Y lo borrado no se quedaba en el teléfono: `sincronizarRegistro` manda el perfil entero de
     vuelta al CH.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). Las acciones se llaman como las llama el POST —
   `accionRecuperarPerfil(p)` y `accionLogin(p)`— y NUNCA se arma la respuesta a mano ni se llama
   `perfilDePersona` con un objeto inventado. Probar el derivador aislado habría probado la pieza;
   lo que estaba roto era que el llamador tomaba una rama u otra.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P118_CAB_NOM = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];
/* ⚠️ ESTOS SON LOS ENCABEZADOS REALES DEL CH, LEÍDOS DE LA HOJA, y la diferencia importa.
   Antes acá estaba el array que escribe `accionRegistro` —«¿Piloto?», «¿Supervisor?», «Fecha de
   registro»— y la hoja NO se llama así: la creó una persona antes de que el endpoint la tocara una
   sola vez, y sus títulos nunca fueron ésos. La columna de la marca se llama **«Es piloto»**.
   Esa diferencia dejó pasar un arreglo entero: el primer intento de cerrar el bug de `col("piloto")`
   fue «probar la coincidencia exacta primero», que contra estos encabezados NO encuentra nada
   —`norm("Es piloto")` es "es piloto", no "piloto"— así que seguía cayendo en la columna del
   identificador. La prueba daba verde porque medía contra encabezados que no existen.
   Si alguien renombra las columnas del CH, esta constante tiene que cambiar con ellas. */
const P118_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P118_CAB_CRED = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo',
  'Rol','Estado','Creada','UltimoAcceso'];
const P118_ACCESOS = [
  ['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
  ['helitec','claveA','supervisor','Helitec','','']
];

/* Ana está en las DOS hojas. En Nómina RRHH dejó el teléfono y el rol VACÍOS; en Registrados ella
   misma cargó su teléfono y quedó marcada como supervisora. Es el caso de HELITEC. */
function p118Env(fns, opciones) {
  const o = opciones || {};
  const nom = [P118_CAB_NOM.slice()];
  if (o.enNomina !== false) {
    nom.push(['Helitec','Ana Suárez','V-111','Operaciones', o.cargoNom === undefined ? 'Piloto' : o.cargoNom,
              'F','34', o.telNom || '', '', o.pilotoNom === undefined ? 'Sí' : o.pilotoNom,
              '', o.rolNom || '', '4']);
  }
  const reg = [P118_CAB_REG.slice()];
  if (o.enRegistrados !== false) {
    const f = new Array(P118_CAB_REG.length).fill('');
    f[2] = 'Ana Suárez'; f[3] = 'ana@ejemplo.com'; f[4] = 'V-111';
    /* ⚠️ EL ID DE PILOTO SE CARGA, Y ESO NO ES DECORACIÓN. Esta fila lo dejaba VACÍO, y por eso
       ninguna prueba cazó el bug de `col("piloto")`: con la celda en blanco el error no se ve. Un
       piloto real SIEMPRE tiene ID —el cliente lo exige (`if (esPiloto && !id_piloto) ok=false`)—
       así que la fila de prueba sin ID era una fila que no existe en producción. */
    f[5] = o.idPilotoReg === undefined ? 'PIL-004' : o.idPilotoReg;
    f[6] = o.pilotoReg === undefined ? 'Sí' : o.pilotoReg;
    f[7] = o.supReg === undefined ? 'Sí' : o.supReg;
    f[8] = 'Helitec'; f[9] = 'Operaciones'; f[10] = 'Piloto'; f[11] = 'F'; f[12] = '34';
    f[13] = o.telReg === undefined ? '0412-1112233' : o.telReg;
    reg.push(f);
  }
  const env = GS.crearEntorno(Object.assign({
    'Accesos': P118_ACCESOS.map(f => f.slice()),
    'Nómina': nom,
    'Registrados Fatiga': reg,
    'Credenciales': [P118_CAB_CRED.slice()],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Consentimientos': o.consent || [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  }, o.hojas || {}));
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p118Json(r) { return JSON.parse(r.getContent ? r.getContent() : r); }
function p118Recuperar(api, extra) {
  return p118Json(api.accionRecuperarPerfil(Object.assign(
    { empresa:'Helitec', cedula:'V-111', dispositivoId:'d1', _post:true }, extra || {})));
}

/* ── 1 · EL MERGE POR CAMPO, que es el corazón del prompt ─────────────────────────────────── */

PRUEBAS.caso('⚠️ el teléfono de Registrados sobrevive a la celda vacía de Nómina', () => {
  /* Antes: la fila estaba en Nómina, así que ganaba ENTERA y el teléfono volvía como ''. El
     cliente lo escribía con `q.telefono || ''` y `sincronizarRegistro` lo mandaba al CH: se
     BORRABA el teléfono de la persona porque RRHH no lo cargó. */
  const api = p118Env(['accionRecuperarPerfil'], { telNom:'' });
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.perfil.telefono, '0412-1112233',
    '⚠️ el dato que Nómina no tiene lo pone Registrados · antes volvía vacío y borraba el del teléfono');
});

PRUEBAS.caso('⚠️ y donde Nómina SÍ tiene dato, Nómina gana', () => {
  /* El discriminador del caso de arriba: si el merge diera vuelta la precedencia, este falla. */
  const api = p118Env(['accionRecuperarPerfil'], { telNom:'0424-9998877' });
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.perfil.telefono, '0424-9998877',
    '⚠️ RRHH es el techo: donde cargó el dato, manda · quedó «' + r.perfil.telefono + '»');
});

PRUEBAS.caso('🔴 `esSupervisor` VIAJA aunque la persona esté en Nómina', () => {
  /* El bug que el cliente documentaba como «BUG VIVO, Y LE PEGA A HELITEC HOY» y parcheaba con
     `('esSupervisor' in q)`. Ese parche sólo servía si había perfil previo que preservar — o sea
     que NO servía en el caso para el que la pantalla existe: quien reinstala. */
  const api = p118Env(['accionRecuperarPerfil']);
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.perfil.esSupervisor, true,
    '⚠️ la única fuente de este flag en el servidor es la columna H de Registrados, y la rama de Nómina la tapaba');
});

PRUEBAS.caso('🔴 y un "No" explícito sigue siendo `false` — el discriminador del flag', () => {
  const api = p118Env(['accionRecuperarPerfil'], { supReg:'No' });
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.perfil.esSupervisor, false, 'un "No" escrito es un no');
});

/* ── 2 · LO QUE NO SE SABE NO SE MANDA ────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 con "Rol en la app" VACÍA, el rol NO viaja', () => {
  /* `normalizarRolNomina` convierte la celda en blanco en "empleado". Mandarlo hacía que el
     cliente —`q.rol || prev.rol`, y "empleado" es truthy— DEGRADARA al supervisor que funciona
     por casilla. `leerNomina` ya guardaba `rolCrudo` para distinguirlo, y nadie lo usaba. */
  const api = p118Env(['accionRecuperarPerfil'], { rolNom:'' });
  const r = p118Recuperar(api);
  PRUEBAS.igual('rol' in r.perfil, false,
    '⚠️ la clave está AUSENTE, no vacía · una clave ausente el cliente la conserva; una presente la pisa');
});

PRUEBAS.caso('🔴 y con la columna llena SÍ viaja — el discriminador', () => {
  const api = p118Env(['accionRecuperarPerfil'], { rolNom:'Supervisor' });
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.perfil.rol, 'supervisor', 'normalizado desde lo que escribió RRHH');
  PRUEBAS.igual(r.perfil.rolOrigen, 'nomina', 'y dice de dónde salió');
});

PRUEBAS.caso('⚠️ una celda "¿Es piloto?" vacía en las dos hojas no manda `esPiloto`', () => {
  const api = p118Env(['accionRecuperarPerfil'], { pilotoNom:'', enRegistrados:false });
  const r = p118Recuperar(api);
  PRUEBAS.igual('esPiloto' in r.perfil, false,
    '⚠️ vacío es "no sé", no "no" · mandarlo apagaría la marca de un piloto');
});

/* ── 3 · LAS DOS PUERTAS DERIVAN IGUAL ────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 `login` repone el perfil TAMBIÉN de quien no está en Nómina', () => {
  /* La tercera derivación: `accionLogin` leía Nómina por su cuenta y NO caía a Registrados, así
     que quien se dio de alta antes de que RRHH cargara la nómina entraba con su contraseña
     correcta y no recibía un solo campo. */
  /* ⚠️ LA CREDENCIAL SE CREA POR EL CAMINO REAL, Y ESE CAMINO EXIGE ESTAR EN LA NÓMINA
     (`accionCredencialCrear` corta con `sin_nomina`/`no_esta`). Así que el escenario no se arma
     poniendo `enNomina:false` desde el principio — eso probaría algo que no puede pasar. Se arma
     como pasa de verdad: la persona se dio de alta con su fila cargada, y DESPUÉS RRHH le borra
     la fila de la Nómina, que es una hoja que edita a mano. */
  const api = p118Env(['accionCredencialCrear','accionLogin']);
  const c = p118Json(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
    persona:'Ana Suárez', pass:'miClave123', dispositivoId:'d' }));
  PRUEBAS.igual(c.ok, true, 'se crea la credencial · ' + (c.error || ''));
  const shNom = api.__env.__libro.getSheetByName('Nómina');
  shNom.getRange(2, 1, 1, P118_CAB_NOM.length).setValues([P118_CAB_NOM.map(() => '')]);
  const r = p118Json(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123',
                                       dispositivoId:'d2' }));
  PRUEBAS.igual(r.ok, true, 'entra · ' + (r.error || ''));
  PRUEBAS.igual(r.persona.telefono, '0412-1112233',
    '⚠️ trae sus datos desde Registrados · antes el `extra` quedaba {} y volvía sin un solo campo');
  PRUEBAS.igual(r.persona.esSupervisor, true, 'y su flag de supervisora');
});

PRUEBAS.caso('🔴 el rol se REFRESCA desde la Nómina al entrar con contraseña', () => {
  /* Decidido por Franco el 2026-09-07. El rol de la credencial era una FOTO del día que se creó la
     contraseña: `credEnNomina` lee la columna L una vez y la congela. RRHH asciende a alguien y
     `login` seguía devolviendo lo viejo mientras `recuperar_perfil` devolvía lo nuevo.
     Se entra por el camino real: la credencial se crea con la columna VACÍA (así queda "empleado"
     congelado) y recién después RRHH escribe "Supervisor" en la hoja. */
  const api = p118Env(['accionCredencialCrear','accionLogin'], { rolNom:'' });
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  const sh = api.__env.__libro.getSheetByName('Nómina');
  sh.getRange(2, 12, 1, 1).setValues([['Supervisor']]);   // RRHH la asciende DESPUÉS
  const r = p118Json(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123',
                                       dispositivoId:'d2' }));
  PRUEBAS.igual(r.ok, true, 'entra · ' + (r.error || ''));
  PRUEBAS.igual(r.persona.rol, 'supervisor',
    '⚠️ el ascenso se refleja · antes devolvía la foto congelada en `Credenciales`');
  PRUEBAS.igual(r.persona.rolOrigen, 'nomina', 'y dice de dónde salió');
});

PRUEBAS.caso('🔒 pero una celda VACÍA no degrada al que ya tenía rol — el discriminador', () => {
  /* El riesgo de refrescar es que un borrado accidental en la hoja le saque el rol a alguien. Lo
     contiene la regla de P118: la celda vacía no viaja, así que gana el de la credencial. */
  const api = p118Env(['accionCredencialCrear','accionLogin'], { rolNom:'Supervisor' });
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  const sh = api.__env.__libro.getSheetByName('Nómina');
  sh.getRange(2, 12, 1, 1).setValues([['']]);   // alguien vacía la celda sin querer
  const r = p118Json(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123',
                                       dispositivoId:'d2' }));
  PRUEBAS.igual(r.persona.rol, 'supervisor',
    '🔒 conserva el de la credencial · un borrado accidental no le saca el panel a nadie');
  PRUEBAS.igual('rolOrigen' in r.persona, false,
    '⚠️ y NO dice "nomina" sobre un rol que no salió de ahí · `rolOfrecerPintar` lo lee para elegir qué frase escribe');
});

PRUEBAS.caso('🔒 `recuperar_perfil` NO responde por GET', () => {
  /* Devuelve el perfil completo de una persona real en el cuerpo, y las respuestas GET se cachean:
     es la misma razón por la que `codigo_empresa` es sólo-POST desde P116. El cliente ya postea. */
  const api = p118Env(['accionRecuperarPerfil']);
  const sinPost = p118Json(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                                                       dispositivoId:'d1' }));
  PRUEBAS.igual(sinPost.ok, false, '🔒 sin `_post` no responde');
  const conPost = p118Recuperar(api, { _post:true });
  PRUEBAS.igual(conPost.ok, true,
    'y con POST sí — el discriminador: si cortara siempre, la pantalla real quedaría muerta');
});

PRUEBAS.caso('🔴 `login` devuelve los consentimientos ya firmados', () => {
  /* `cerrarSesion()` borra la clave del teléfono. Sin esto, quien vuelve con su contraseña
     correcta firma otra vez los cinco bloques que ya están en el CH con fecha y versión. */
  const api = p118Env(['accionCredencialCrear','accionLogin'], { consent: [
    ['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion'],
    ['01/01/2026','c1','Ana Suárez','Helitec','V-111','{"datos":3,"fatiga":2}','6.00']
  ]});
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  const r = p118Json(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123',
                                       dispositivoId:'d2' }));
  PRUEBAS.igual(r.consentimientos && r.consentimientos.datos, 3,
    '⚠️ la versión más alta que firmó · antes `login` no los devolvía y sólo los reponía la pantalla que el plan quiere jubilar');
});

/* ── 4 · EL RESPALDO CIEGO DE LOS CONSENTIMIENTOS ─────────────────────────────────────────── */

PRUEBAS.caso('🔒 una fila con cédula Y nombre vacíos no le entrega consentimientos a nadie', () => {
  /* El cliente NO manda `persona` en este pedido, así que `nomNorm` llega SIEMPRE vacío. Con el
     respaldo a secas (`norm(fila) === nomNorm`), vacío coincidía con vacío: cualquier fila vieja
     sin cédula ni nombre se le devolvía a TODO el mundo. */
  const api = p118Env(['accionRecuperarPerfil'], { consent: [
    ['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion'],
    ['01/01/2026','c9','','','','{"ajeno":9}','6.00']
  ]});
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.ok, true, 'responde');
  PRUEBAS.igual(r.consentimientos.ajeno, undefined,
    '🔒 comparar vacío con vacío no identifica a nadie · esa fila es de otra persona');
});

/* ── 5 · EL CONTRATO: lo que manda el servidor tiene destino en el cliente ─────────────────── */

PRUEBAS.caso('⚠️ CONTRATO · toda clave que manda el servidor la nombra el merge del cliente', () => {
  /* R17 · el patrón que ya se comió `rol`, `rolOrigen`, `duty` y `ausencias`: el dato viaja, el
     cliente arma el objeto con una lista y la clave se pierde sin un error ni una advertencia.
     Se mide contra la respuesta REAL de la acción real, no contra una lista escrita a mano. */
  const api = p118Env(['accionRecuperarPerfil'], { rolNom:'Supervisor' });
  const r = p118Recuperar(api);
  /* Los casos corren DENTRO del iframe de la app, así que estas dos son las listas de verdad
     que usa `perfilMerge` — no una copia escrita acá que podría quedar vieja. */
  const texto = (typeof PERFIL_TEXTO !== 'undefined') ? PERFIL_TEXTO : [];
  const bool  = (typeof PERFIL_BOOL  !== 'undefined') ? PERFIL_BOOL  : [];
  PRUEBAS.cierto(texto.length > 0 && bool.length > 0,
    'guarda: las dos listas del cliente son visibles desde acá (si no, el caso no mide nada)');
  /* `nivel` no tiene consumidor en el cliente todavía y es sabido: se nombra para que el día que
     lo tenga, agregarlo a la lista sea el paso obvio. */
  const sinDestino = Object.keys(r.perfil)
    .filter(k => texto.indexOf(k) < 0 && bool.indexOf(k) < 0 && k !== 'nivel');
  PRUEBAS.igual(sinDestino, [],
    '⚠️ claves que el servidor manda y ningún merge del cliente nombra — se pierden en silencio: ' + sinDestino.join(', '));
});


/* ── 6 · EL MERGE DEL CLIENTE ──────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ `perfilMerge` no pisa con una clave AUSENTE', () => {
  const prev = { nombre:'Ana Suárez', telefono:'0412-1112233', esSupervisor:true, esPiloto:true, rol:'supervisor' };
  const nuevo = perfilMerge(prev, { nombre:'Ana Suárez' });   // el servidor sólo sabe el nombre
  PRUEBAS.igual(nuevo.telefono, '0412-1112233', 'el teléfono sigue');
  PRUEBAS.igual(nuevo.esSupervisor, true, '⚠️ el flag sigue · `!!undefined` lo apagaba');
  PRUEBAS.igual(nuevo.rol, 'supervisor', 'el rol sigue');
});

PRUEBAS.caso('⚠️ ni con una cadena VACÍA', () => {
  /* La forma vieja era `telefono: q.telefono || ''`, que borra. Y quince líneas después
     `sincronizarRegistro` manda el perfil entero al CH: el borrado se escribe. */
  const nuevo = perfilMerge({ telefono:'0412-1112233', cargo:'Piloto' }, { telefono:'', cargo:'' });
  PRUEBAS.igual(nuevo.telefono, '0412-1112233', '⚠️ una celda vacía no borra un dato cargado');
  PRUEBAS.igual(nuevo.cargo, 'Piloto', 'idem el cargo');
});

PRUEBAS.caso('⚠️ pero un `false` EXPLÍCITO sí apaga — el discriminador del merge', () => {
  /* Sin esto, un merge que ignorara todos los booleanos daría verde en los dos casos de arriba. */
  const nuevo = perfilMerge({ esSupervisor:true, esPiloto:true }, { esSupervisor:false });
  PRUEBAS.igual(nuevo.esSupervisor, false, 'el "No" del servidor manda');
  PRUEBAS.igual(nuevo.esPiloto, true, 'y no toca lo que no nombró');
});

PRUEBAS.caso('⚠️ los CUATRO caminos usan el mismo merge, no dos reglas opuestas', () => {
  /* `nominaSoyYo` y `nominaConfirmar` consumen la MISMA respuesta de la MISMA acción y la
     mergeaban distinto: los dos caminos del alta están vivos, así que la misma persona quedaba
     con un perfil distinto según por dónde entró. Se mide sobre el fuente porque lo que hay que
     impedir es que alguien vuelva a escribir la forma vieja al lado. */
  /* ⚠️ SE MIDE CÓDIGO, NO PROSA — y este caso ya se apagó a sí mismo dos veces. El comentario que
     explica el defecto CONTIENE el patrón del defecto, así que contarlo sobre el fuente crudo daba
     2 donde el código tiene 0. Filtrar por "líneas que empiezan con asterisco" no alcanzó: la
     prosa de un bloque de comentario no siempre arranca así, y una de las dos ocurrencias tenía
     el patrón partido en dos renglones. Se sacan los bloques de comentario ENTEROS, como ya hacen a11b y
     p057a. Es la tercera vez en este repo que documentar un arreglo apaga la prueba del arreglo. */
  const sinComentarios = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fuente = sinComentarios([...document.querySelectorAll('script')].map(x => x.textContent).join('\n'));
  const viejos = (fuente.match(/esPiloto:\s*!!q\.esPiloto/g) || []).length;
  PRUEBAS.igual(viejos, 0,
    '⚠️ quedan ' + viejos + ' merges con la forma que pisa · el comentario que la denuncia estaba UNA LÍNEA arriba de una de ellas');
  PRUEBAS.alMenos((fuente.match(/perfilMerge\s*\(/g) || []).length, 5,
    '⚠️ los cuatro llamadores más la declaración');
});

PRUEBAS.caso('⚠️ el callback del login se captura ANTES de que `lgnCerrar` lo anule', () => {
  /* `lgnCerrar()` hace `_lgnPendiente = null` en su última línea, y `lgnEntrar` lo leía DESPUÉS:
     `seguir` era null SIEMPRE, así que lo que la persona estaba intentando hacer cuando se le
     pidió la contraseña no ocurría nunca. Silencioso: no hay error, sólo no pasa.

     ⚠️ SE MIDE EL COMPORTAMIENTO, no el orden de dos cadenas en el fuente. Se arma el estado por
     el camino real (`lgnAbrir` con un callback, que es como lo llaman los 3 llamadores) y se
     comprueba que capturar-y-después-cerrar conserva la función. La primera versión de este caso
     medía índices de texto y se equivocaba de signo. */
  const previo = getProfile();
  try {
    let corrio = false;
    lgnAbrir(() => { corrio = true; });
    PRUEBAS.igual(typeof _lgnPendiente, 'function', 'guarda: `lgnAbrir` guardó el callback');
    /* El orden que ahora tiene `lgnEntrar`: capturar, después cerrar. */
    const seguir = _lgnPendiente;
    lgnCerrar();
    PRUEBAS.igual(typeof seguir, 'function',
      '⚠️ sobrevive al cierre · con el orden viejo (cerrar y después leer) acá había `null`');
    if (typeof seguir === 'function') seguir();
    PRUEBAS.cierto(corrio, 'y corre');
    /* El discriminador: con el orden viejo, lo capturado es null. */
    lgnAbrir(() => {});
    lgnCerrar();
    const tarde = _lgnPendiente;
    PRUEBAS.igual(tarde, null,
      '⚠️ y el caso discrimina: leído DESPUÉS de cerrar, es null — que es lo que pasaba');
  } finally {
    try { lgnCerrar(); } catch(e){}
    if (previo) setProfile(previo);
  }
});


/* ── EL BUG DEL PILOTO, QUE ENCONTRÓ LA AUDITORÍA DE P136 ──────────────────────────────────── */

PRUEBAS.caso('🔴 un piloto con ID cargado NO pierde su marca de piloto', () => {
  /* ⚠️ ESTE BUG LO INTRODUJO P118 Y VIVIÓ DOS DÍAS EN PRODUCCIÓN. `col(txt)` devolvía la PRIMERA
     columna cuyo encabezado normalizado CONTIENE el texto, y `norm("ID Piloto")` es "id piloto",
     que contiene "piloto". Como esa columna está ANTES que «¿Piloto?» en la hoja, `col("piloto")`
     devolvía la del ID: `esPilotoCrudo` leía "PIL-004", `perfilSiNo` veía algo no vacío que no
     empieza con "s" y devolvía `false`.
     Lo que ve la persona: al reinstalar o cambiar de teléfono desaparece la sección Data
     Operacional entera, el botón deja de decir «Registrar» y la insignia dice «Personal» en vez de
     «Piloto». Y quince líneas después `sincronizarRegistro` manda el perfil al CH, que escribe
     «No» en la columna «¿Piloto?»: el borrado no se queda en el teléfono, se propaga a la hoja.
     ⚠️ POR ESO EL ARREGLO DE CÓDIGO NO ALCANZA: a quien ya pasó por acá, la columna quedó en «No»
     y después del fix se lee como un «no» legítimo. Hay que reparar esas filas en el CH. */
  const api = p118Env(['accionRecuperarPerfil'], { pilotoNom: '' });   // la Nómina no lo corrige
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.ok, true, 'guarda: responde · ' + (r.error || ''));
  PRUEBAS.igual(r.perfil.esPiloto, true,
    '🔴 sigue siendo piloto · antes leía "PIL-004" de la columna del ID y devolvía false');
  PRUEBAS.igual(r.perfil.id_piloto, 'PIL-004',
    'y su identificador viaja bien — el discriminador: si las dos columnas se leyeran igual, una de las dos estaría mal');
});

PRUEBAS.caso('🔴 y un "No" explícito con ID cargado sigue siendo NO', () => {
  /* El otro lado del mismo error: con `indexOf`, un ID que empezara con "s" ("SILVA-01") daba
     `esPiloto:true` aunque la celda dijera "No". Se mide con la celda en "No" y un ID que empieza
     con "s": si se leyera la columna equivocada, esto daría true. */
  const api = p118Env(['accionRecuperarPerfil'],
    { pilotoNom: '', pilotoReg: 'No', idPilotoReg: 'SILVA-01' });
  const r = p118Recuperar(api);
  PRUEBAS.igual(r.perfil.esPiloto, false,
    '🔴 el "No" de la columna correcta manda · antes un ID que empezaba con "s" lo daba vuelta');
});
