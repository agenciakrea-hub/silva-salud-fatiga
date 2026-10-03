/* ── P215 · cuarta ronda · LA RAÍZ del doble canon, y los cuatro sitios que quedaban ────────────
   (2026-10-03)

   P214 y P215 atendieron SIETE sitios donde el endpoint canonizaba dos veces el nombre de empresa.
   La causa era una sola: `construirAliasLeer_` armaba el mapa `variante → canónico` con last-wins
   sobre toda la hoja `Accesos`, así que `nominaEmpresaCanon` NO ERA IDEMPOTENTE — bastaba UNA fila
   cuya celda EMPRESAS listara como variante no-primera el canónico de otra para que
   `canon(canon(x))` cayera en la empresa de quien escribió esa celda.

   La segunda pasada de `construirAliasLeer_` lo cierra en la raíz: el canónico de cada fila se
   mapea a sí mismo y pisa cualquier reclamo ajeno.

   ⚠️ MEDIDO CONTRA PRODUCCIÓN el 2026-10-03, no citado: 16 cuentas, 10 con celda, 15 claves, 0
   claves donde la segunda pasada cambia la respuesta, 0 nombres no idempotentes. O sea que la fila
   de secuestro que estos casos montan HOY NO EXISTE: lo que se prueba acá es que no puede hacer
   daño si alguien la escribe mañana, no un incidente en curso.

   ⚠️ R19 · CADA DERECHO QUE SE AFIRMA NOMBRA LA FUNCIÓN QUE LO CONCEDE. Y acá los asertos están
   escritos como INVARIANTES («lo suyo sí, lo ajeno no»), no como la forma exacta de un resultado:
   el mismo aserto por forma se rompió en las cinco versiones de una función de diez líneas. */

PRUEBAS.grupo('P215 · la raíz del doble canon');

const P215B_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P215B_SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];
const P215B_DMY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); })();
const P215B_HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();

/* ⚠️ LA FILA DE SECUESTRO es la ÚLTIMA, a propósito: `construirAliasLeer_` recorre la hoja en
   orden y el defecto era last-wins, así que si `Hol` estuviera ANTES de `Sec` el reclamo no
   ganaría y el fixture no probaría nada. El orden del fixture ES la precondición. */
const P215B_ACCESOS = () => [P215B_CAB,
  ['*', 'clave-maestra', 'admin', '', '', ''],
  ['Sec', 'clave-sec', 'supervisor', 'Sec, Sec C.A.', '', ''],
  ['Hol', 'clave-hol', 'supervisor', 'Hol, Sec', '', '']];

/* ⚠️ LOS ENCABEZADOS SON LOS REALES, copiados del `.gs`. Inventar el de `Reportes` es lo que hizo
   que mi medición del umbral de anonimato contara CERO en la tercera ronda y diera un verde que no
   valía nada (R17: el fixture tiene que ser la hoja, no mi idea de la hoja). */
const P215B_REP = ['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa',
  'Departamento', 'Cargo', 'Comentario'];

/* El formulario de 90 columnas con DOS filas de encabezado (`parseRegistros` arranca en r=2).
   2 personas en `Sec C.A.`/Ops (debajo del `anonN:5` de Sec → el área se TAPA) y 8 en `Hol`/Ops,
   que es la población que el doble canon hacía contar en su lugar. */
function p215bFormulario() {
  const cab = new Array(90).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa';
  const fila = (nombre, empresa) => { const f = new Array(90).fill('');
    f[0] = P215B_DMY; f[1] = nombre; f[2] = 'Ops'; f[72] = empresa; f[73] = P215B_DMY; f[86] = '5'; return f; };
  const filas = [fila('JOSE RODRIGUEZ', 'Sec C.A.'), fila('SEGUNDA DE SEC', 'Sec C.A.')];
  for (let i = 1; i <= 8; i++) filas.push(fila('HOL PERSONA ' + i, 'Hol'));
  return [cab, cab.slice()].concat(filas);
}

PRUEBAS.caso('🔴 6 · `nominaEmpresaCanon` es IDEMPOTENTE aunque otra fila reclame el canónico propio', () => {
  /* EL DERECHO: a qué empresa pertenece un nombre lo decide `construirAliasLeer_`, que es la única
     autoridad sobre eso en todo el endpoint — de ella sale el mapa que `nominaEmpresaCanon` usa, y
     de `nominaEmpresaCanon` sale la clave con la que doce sitios leen y cinco hojas se escriben.
     La decisión que fija P214: la celda EMPRESAS son VARIANTES DEL NOMBRE DE UNA empresa, así que
     el canónico es la identidad y una variante ajena no puede moverlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({ 'Accesos': P215B_ACCESOS(), 'Sesiones': [P215B_SES] });
  const api = GS.cargarGs(CTX.gs, env, ['construirAlias', 'nominaEmpresaCanon']);
  const alias = api.construirAlias();
  const canon = x => api.nominaEmpresaCanon(alias, x);

  /* guarda: la fila de secuestro está puesta y es la última */
  PRUEBAS.igual(canon('Sec C.A.'), 'Sec', 'guarda: la variante propia resuelve al canónico propio');

  /* LO QUE TIENE QUE CAMBIAR · el canónico de Sec no se lo lleva el reclamo de Hol */
  PRUEBAS.igual(canon('Sec'), 'Sec',
    '🔴 `canon("Sec")` NO cae en Hol, aunque Hol la liste como variante suya');
  PRUEBAS.igual(canon(canon('Sec C.A.')), canon('Sec C.A.'),
    '🔴 IDEMPOTENTE: dos pases dan lo mismo que uno — era el motor de las siete familias');

  /* ⚠️ EL UNIVERSO DE LA CUARTA RONDA ESTABA ELEGIDO —sin querer— PARA NO CONTENER LAS DOS CLASES
     QUE FALLABAN, y el verificador lo nombró: el aserto era cierto y la conclusión del encabezado
     («para todo `x`») no. Ahora lleva los centinelas (`"*"`, `""`, sólo espacios, `"-"`), los
     miembros de `Object.prototype` alcanzables por `norm` y las dos clases de colisión por
     capitalización y puntuación — montadas en los dos casos de abajo, que son filas aparte. */
  const universo = ['Sec', 'Sec C.A.', 'Hol', 'HOL', 'sec c a', 'Otra Que No Existe', '',
    '*', '   ', '-', 'Todas las empresas', 'constructor', 'Constructor', '__proto__', 'toString'];
  const rotos = universo.filter(x => canon(canon(x)) !== canon(x));
  PRUEBAS.igual(rotos.length, 0,
    '🔴 ningún nombre del universo rompe la idempotencia (rotos: ' + JSON.stringify(rotos) + ')');

  /* LO QUE NO PUEDE CAMBIAR · la variante de Hol sigue siendo de Hol, y un nombre desconocido
     sigue devolviéndose tal cual (es lo que permite que una empresa sin fila en Accesos funcione) */
  PRUEBAS.igual(canon('Hol'), 'Hol', '🔴 NO PUEDE CAMBIAR · Hol sigue siendo Hol');
  PRUEBAS.igual(canon('Otra Que No Existe'), 'Otra Que No Existe',
    '🔴 NO PUEDE CAMBIAR · un nombre sin fila se devuelve tal cual, no vacío');
});

PRUEBAS.caso('🔴 7 · el UMBRAL DE ANONIMATO se lee y se cuenta en la empresa propia', () => {
  /* EL DERECHO: la promesa es de `doc_12_p` —«el departamento sólo se muestra si tiene N personas o
     más»— y la concede `aplicarUmbralAnon_`, que la aplica en el SERVIDOR (antes vivía sólo en
     `reporteDeptoVisible()` del cliente y el payload traía el área igual). Quién puede ver qué área
     lo decide esa función leyendo `anonN` de `Config Empresa` y contando con
     `personasPorDeptoServer_` sobre los registros de ESA empresa. Es R4. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': P215B_ACCESOS(), 'Sesiones': [P215B_SES],
    /* `anonN` DISTINTO en las dos: es la única forma de distinguir «leí el mío» de «leí el de al
       lado». Hol con 0 significa «sin umbral», que es el valor que publicaba el área de Sec. */
    'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['Sec', 'anonN', '5'], ['Hol', 'anonN', '0']],
    'Reportes': [P215B_REP, [P215B_DMY, 'r1', 'fatiga', 'false', '', 'Sec', 'Ops', '', 'texto anonimo']],
    'Respuestas de formulario 1': p215bFormulario()
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer']);
  const leer = u => { try {
    return JSON.parse(api.accionReportesLeer({ usuario: u, pass: 'clave-' + u.toLowerCase(),
      dispositivoId: 'd', empresa: u }).getContent());
  } catch (e) { return {}; } };

  const d = leer('Sec');
  const r = (d.reportes || []).filter(x => x.id === 'r1')[0];

  /* guarda: el reporte LLEGA. Sin esta guarda, «el área viene vacía» sería indistinguible de
     «no hay reporte» — y un cero sin discriminador no es un resultado. */
  PRUEBAS.cierto(!!r, 'guarda: el reporte anónimo le llega al supervisor de Sec');

  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(r && r.departamento, '',
    '🔴 el área de 2 personas sale VACÍA: ni se lee el `anonN:0` de Hol ni se cuenta su población');
  /* LO QUE NO PUEDE CAMBIAR · el comentario y el reporte siguen llegando; lo que se tapa es el área */
  PRUEBAS.cierto(!!(r && r.comentario),
    '🔴 NO PUEDE CAMBIAR · el reporte sigue entregándose, con su comentario');
  PRUEBAS.falso(!!(r && r.persona),
    '🔴 NO PUEDE CAMBIAR · y nunca trae persona: eso ya lo garantiza `accionReporteGuardar`');
});

PRUEBAS.caso('🔴 8 · el CÓDIGO DE REGISTRO es el de la empresa propia, no el de la que la reclama', () => {
  /* EL DERECHO: quién puede darse de alta en una empresa lo concede `verificarCodigoEmpresa`, que
     compara contra lo que devuelve `codigoRegistroDe` — y ésa lee SÓLO la fila propia (nunca la
     general, porque un código en la fila general abriría todas las empresas a la vez).
     Dos consecuencias opuestas del mismo defecto, y las dos son falla: se acepta el código ajeno
     (cualquiera entra) y se rechaza el propio (la empresa entera queda sin poder registrar gente). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': P215B_ACCESOS(), 'Sesiones': [P215B_SES],
    'Config Empresa': [['Empresa', 'Clave', 'Valor'],
      ['Sec', 'codigoRegistro', 'SEC-2026'], ['Hol', 'codigoRegistro', 'HOL-2026']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['verificarCodigoEmpresa', 'codigoRegistroDe']);

  /* guarda: las dos empresas TIENEN código y son distintos */
  PRUEBAS.igual(api.codigoRegistroDe('Hol'), 'HOL-2026', 'guarda: Hol tiene su código cargado');

  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(api.codigoRegistroDe('Sec'), 'SEC-2026',
    '🔴 el código de Sec es el de Sec, no el de quien reclama su canónico');
  PRUEBAS.falso(api.verificarCodigoEmpresa('Sec', 'HOL-2026').ok,
    '🔴 el código AJENO se rechaza');
  /* LO QUE NO PUEDE CAMBIAR · y el propio sigue valiendo, que es la otra mitad */
  PRUEBAS.cierto(api.verificarCodigoEmpresa('Sec', 'SEC-2026').ok,
    '🔴 NO PUEDE CAMBIAR · el código PROPIO sigue abriendo el alta');
  PRUEBAS.cierto(api.verificarCodigoEmpresa('Sec', 'SEC-2026').pide,
    '🔴 NO PUEDE CAMBIAR · y la empresa sigue PIDIENDO código: `pide:false` dejaba el alta abierta');
});

PRUEBAS.caso('🔴 9 · el REINICIO DE CONTRASEÑA cierra la sesión de la persona propia', () => {
  /* EL DERECHO: a quién puede reiniciarle la contraseña una cuenta lo concede `ausScope`, y a quién
     le cierra la sesión, `sesCerrarDePersona_` filtrando la columna `Usuario` de `Sesiones`
     (`persona:<empresa>|<cedula>`) por la empresa del scope. Dos personas distintas pueden tener la
     MISMA cédula en dos empresas: la columna Cedula no es única entre clientes.
     ⚠️ Esta función no aparecía en ninguno de los 238 casos de la suite — lo midió el verificador.
     Su defecto hacía DOS daños a la vez: cerraba la sesión ajena y dejaba viva la propia, con la
     contraseña ya borrada, informando `sesionesCerradas: 1`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': P215B_ACCESOS(),
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Sec', 'ANA DE SEC', 'V-1', 'Ops', 'Piloto'], ['Hol', 'ZOE DE HOL', 'V-1', 'Ops', 'Piloto']],
    /* ⚠️ EL ENCABEZADO REAL de `Credenciales` (`CRED_HEAD`, 11 columnas, `Cedula` SEGUNDA y sin
       columna `Persona`). El de 7 que escribí primero hacía que la acción contestara
       `sin_credencial` y el caso medía un RECHAZO, no el cierre de sesión — R17, por tercera vez
       en este prompt, y lo cazó la guarda. Sin la guarda, «la ajena sigue activa» habría dado
       verde sobre una acción que no se ejecutó. */
    'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo', 'Rol',
      'Estado', 'Creada', 'UltimoAcceso'],
      ['Sec', 'V-1', 'ANA DE SEC', 'h', 's', '150', 'PBKDF2', '', 'activa', P215B_HOY, P215B_HOY],
      ['Hol', 'V-1', 'ZOE DE HOL', 'h', 's', '150', 'PBKDF2', '', 'activa', P215B_HOY, P215B_HOY]],
    /* ⚠️ LA CLAVE LA ESCRIBE `sesClavePersona`, y es `"persona:" + norm(empresa) + "|" + cedulaNorm(cedula)`
       — o sea `"persona:sec|V1"`, en minúsculas y sin el guion de la cédula. El `'persona:Sec|V-1'`
       que había acá pasaba porque el consumidor re-normaliza, pero NO es lo que la capa real
       escribe: si `sesCerrarDePersona_` comparara exacto, el caso daría verde con la función rota.
       R17 — el fixture tiene que ser lo que el productor produce, no lo que yo creo que produce. */
    'Sesiones': [P215B_SES,
      ['s1', 'hash-ana', 'persona:sec|V1', 'd1', '', 'empleado', '', 'Sec', '', P215B_HOY, P215B_HOY, 'activa', ''],
      ['s2', 'hash-zoe', 'persona:hol|V1', 'd2', '', 'empleado', '', 'Hol', '', P215B_HOY, P215B_HOY, 'activa', '']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionCredencialReiniciar']);
  let r = {};
  try { r = JSON.parse(api.accionCredencialReiniciar({ usuario: 'Sec', pass: 'clave-sec',
    dispositivoId: 'd', empresa: 'Sec', cedula: 'V-1', _post: true }).getContent()); } catch (e) {}

  /* guarda: el reinicio se ACEPTÓ. Sin esto, «la ajena sigue activa» también sería cierto
     cuando la acción fue rechazada entera, y el caso bendeciría un rechazo. */
  PRUEBAS.cierto(r.ok === true, 'guarda: el supervisor de Sec puede reiniciar a su propia gente');

  const ses = env.__libro.getSheetByName('Sesiones').getDataRange().getValues();
  const estado = u => { for (let i = 1; i < ses.length; i++)
    if (String(ses[i][2]) === u) return String(ses[i][11] || '').toLowerCase(); return '(sin fila)'; };

  /* LO QUE TIENE QUE CAMBIAR · se cierra la PROPIA */
  PRUEBAS.igual(estado('persona:sec|V1'), 'cerrada',
    '🔴 la sesión de la persona de Sec queda CERRADA: su contraseña se acaba de borrar');
  /* LO QUE NO PUEDE CAMBIAR · y la de la otra empresa sigue viva */
  PRUEBAS.igual(estado('persona:hol|V1'), 'activa',
    '🔴 NO PUEDE CAMBIAR · la persona de Hol con la MISMA cédula conserva su sesión');
});

PRUEBAS.caso('🔴 10 · `gestScope` devuelve un canónico TAMBIÉN para el maestro', () => {
  /* EL DERECHO: el alcance de una cuenta lo concede `gestScope`, y su contrato —escrito en
     `aplicarUmbralAnon_`— es «devuelve un canónico». Para `esAdminMaestro_` devolvía el parámetro
     CRUDO del cliente, o sea falso justo para la única cuenta admin que existe en producción.
     No era fuga (el maestro ve todo por definición): era PÉRDIDA SILENCIOSA. Pidiendo su empresa
     por una variante, el filtro `norm(v[i][5]) !== key` de `accionReportesLeer` no encontraba
     ninguna fila y el desglose por área desaparecía sin aviso. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': P215B_ACCESOS(), 'Sesiones': [P215B_SES],
    'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['Sec', 'anonN', '0']],
    'Reportes': [P215B_REP, [P215B_DMY, 'r1', 'fatiga', 'true', 'ANA DE SEC', 'Sec', 'Ops', 'Piloto', 'texto']],
    'Respuestas de formulario 1': p215bFormulario()
  });
  const api = GS.cargarGs(CTX.gs, env, ['gestScope', 'validarAcceso', 'accionReportesLeer']);
  const mae = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(mae && mae.rol, 'admin', 'guarda: el maestro entra con rol admin');

  /* LO QUE TIENE QUE CAMBIAR · pedir por la variante da el canónico */
  PRUEBAS.igual(api.gestScope(mae, 'Sec C.A.'), 'Sec',
    '🔴 el maestro pidiendo «Sec C.A.» obtiene la clave canónica «Sec»');
  const d = (function () { try { return JSON.parse(api.accionReportesLeer({ usuario: '*',
    pass: 'clave-maestra', dispositivoId: 'd', empresa: 'Sec C.A.' }).getContent()); } catch (e) { return {}; } })();
  PRUEBAS.cierto((d.reportes || []).length > 0,
    '🔴 y por eso encuentra los reportes de esa empresa: antes devolvía cero en silencio');

  /* LO QUE NO PUEDE CAMBIAR · sigue pudiendo indicar cualquier empresa, y un canónico no se mueve */
  PRUEBAS.igual(api.gestScope(mae, 'Hol'), 'Hol',
    '🔴 NO PUEDE CAMBIAR · el maestro sigue pudiendo indicar otra empresa');
  PRUEBAS.igual(api.gestScope(mae, 'Sec'), 'Sec',
    '🔴 NO PUEDE CAMBIAR · y pedir el canónico sigue dando el canónico (idempotencia)');
});

PRUEBAS.caso('🔴 11 · un valor CENTINELA no se canoniza, y la celda `"-"` no se vuelve el canónico de todo', () => {
  /* EL DERECHO, o más bien el candado: que el administrador SIN empresa en el filtro no pueda
     escribir lo concede `depEmpresaValida`, llamada desde `accionTareaGuardar`,
     `accionGestionGuardar`, `accionBitacoraGuardar` y `accionCasoOdooGuardar`. Lo que escriben cae
     en `Tareas`, `Gestiones`, `Casos Odoo` y `Bitácora` — y la bitácora es append-only: R3 prohíbe
     corregirla, y el mensaje que rebota lo dice textualmente.

     ⚠️ ESTE CASO EXISTE POR UN DEFECTO QUE INTRODUJE YO, en la cuarta ronda de este mismo prompt.
     `El Marino` y `El Cairo` tienen la celda EMPRESAS en `"-"` en producción, y `norm("-")` es
     `""`: con esa entrada en el mapa, TODO lo que normalizara a vacío se canonizaba a `"-"`. El
     cliente del administrador manda `empresa:"*"` por defecto (`index.html:20285` y `:21286`, más
     `dashAuth()`), y `norm("*")` también es `""`. Cuando hice que `gestScope` canonizara la rama
     del maestro, `gestScope(maestro,"*")` pasó de `"*"` a `"-"` — el canónico de dos empresas
     clientes reales — y `depEmpresaValida("-")` es TRUE: las cuatro escrituras se aceptaban, y la
     cuenta `El Marino` las leía.

     La lección: un valor CENTINELA no se canoniza. `"*"`, `""` y «Todas las empresas» no son
     nombres de empresa, y `norm()` los colapsa todos a la clave vacía. Se cierra en
     `construirAliasLeer_` —una celda que normaliza a vacío no entra al mapa— y no en `gestScope`,
     porque así vale para los ~108 llamadores a la vez. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    /* ⚠️ LAS DOS FILAS SON LAS DE PRODUCCIÓN, con su celda tal cual. Un fixture que no contiene la
       configuración real no mide el sistema real: sin estas dos filas el defecto era invisible
       para las 34 métricas que tenía el discriminador. */
    'Accesos': [P215B_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Sec', 'clave-sec', 'supervisor', 'Sec', '', ''],
      ['Marino', 'clave-mar', 'supervisor', '-', '', ''],
      ['Cairo', 'clave-cai', 'supervisor', '-', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Sec', 'ANA DE SEC', 'V-1', 'Ops', 'Piloto']],
    'Tareas': [['Empresa', 'ID', 'Cedula', 'Persona', 'Origen', 'Titulo', 'Detalle',
      'Vence', 'Estado', 'Creada', 'Actualizada', 'CreadaPor']],
    'Sesiones': [P215B_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['construirAlias', 'nominaEmpresaCanon', 'gestScope',
    'validarAcceso', 'depEmpresaValida', 'accionTareaGuardar']);
  const alias = api.construirAlias();
  const mae = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(mae && mae.rol, 'admin', 'guarda: el maestro entra con rol admin');
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, '-'), '-',
    'guarda: las dos filas con la celda `"-"` están puestas, y `-` sigue siendo `-`');

  /* LO QUE TIENE QUE CAMBIAR · el centinela no se canoniza */
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, '*'), '*',
    '🔴 `canon("*")` sigue siendo `"*"`: la celda `"-"` no se lo lleva');
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, ''), '',
    '🔴 y `canon("")` es `""`, no `"-"`: es lo que esperan todas las guardas `if (!x)`');
  PRUEBAS.igual(api.gestScope(mae, '*'), '*',
    '🔴 el scope del maestro sin filtro es el centinela, no una empresa cliente');
  PRUEBAS.falso(api.depEmpresaValida(api.gestScope(mae, '*')),
    '🔴 y ese scope NO pasa `depEmpresaValida`');

  /* y el efecto, por la acción REAL: la única de las cuatro que viaja por `dashAuth` hoy */
  const guardar = emp => { try { return JSON.parse(api.accionTareaGuardar({ usuario: '*',
    pass: 'clave-maestra', dispositivoId: 'd', empresa: emp, _post: true,
    tarea: JSON.stringify({ id: 't' + emp, persona: 'ANA DE SEC', titulo: 'Revisar descanso' })
  }).getContent()); } catch (e) { return { EX: String(e) }; } };
  PRUEBAS.igual(guardar('*').motivo, 'sin_empresa',
    '🔴 `tarea_guardar` con `empresa:"*"` REBOTA: el maestro tiene que elegir una empresa');
  PRUEBAS.igual(guardar('').motivo, 'sin_empresa', '🔴 y con el filtro vacío también');
  const enHoja = () => env.__libro.getSheetByName('Tareas').getDataRange().getValues().slice(1);
  PRUEBAS.igual(enHoja().length, 0, '🔴 y no quedó NINGUNA fila escrita bajo `"-"`');

  /* LO QUE NO PUEDE CAMBIAR · con una empresa elegida, el maestro sí escribe */
  PRUEBAS.cierto(guardar('Sec').ok === true,
    '🔴 NO PUEDE CAMBIAR · con la empresa elegida el maestro SÍ escribe');
  PRUEBAS.igual(String((enHoja()[0] || [])[0]), 'Sec',
    '🔴 NO PUEDE CAMBIAR · y la fila cae bajo `Sec`, no bajo el centinela');
  PRUEBAS.igual(api.gestScope(api.validarAcceso('Marino', 'clave-mar', 'd'), 'Sec'), '-',
    '🔴 NO PUEDE CAMBIAR · `El Marino` conserva su canónico `-`, con todo lo malo que eso tiene');
});

PRUEBAS.caso('🔴 12 · dos filas que escriben el MISMO canónico distinto no rompen la idempotencia', () => {
  /* EL DERECHO: la identidad de una empresa la fija `construirAliasLeer_`, y la idempotencia de
     `nominaEmpresaCanon` es lo que vuelve inocuo el doble canon en los ~108 llamadores.
     ⚠️ LA CUARTA RONDA AFIRMÓ ESTA IDEMPOTENCIA COMO TEOREMA Y ERA FALSO: `canonicos` era last-wins
     igual que `alias`, así que si dos filas tenían canónicos que `norm` colapsa pero se escriben
     distinto, sólo el ÚLTIMO quedaba punto fijo y el otro se remapeaba. Medido por el verificador:
     `canon("Sec") = "Sec C.A."` y `canon² = "SEC C.A."`.
     Y es más probable que el secuestro contra el que está construido todo este prompt: la fila
     `Aeroambulancias Silva` ya repite su propio canónico dos veces en la celda, y basta una segunda
     cuenta de la misma empresa que lo tipee en mayúsculas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const armar = filas => {
    const env = GS.crearEntorno({ 'Accesos': [P215B_CAB].concat(filas), 'Sesiones': [P215B_SES] });
    const api = GS.cargarGs(CTX.gs, env, ['construirAlias', 'nominaEmpresaCanon']);
    const al = api.construirAlias();
    return x => api.nominaEmpresaCanon(al, x);
  };
  /* capitalización: `norm` colapsa las dos a `"sec c a"` */
  const c1 = armar([['A', 'ka', 'supervisor', 'Sec C.A., Sec', '', ''],
                    ['B', 'kb', 'supervisor', 'SEC C.A.', '', '']]);
  PRUEBAS.igual(c1('Sec C.A.'), c1('SEC C.A.'),
    'guarda: las dos escrituras del mismo nombre resuelven al MISMO canónico');
  PRUEBAS.igual(c1(c1('Sec')), c1('Sec'),
    '🔴 IDEMPOTENTE con capitalización distinta: antes `canon("Sec")` daba una y `canon²` la otra');
  /* puntuación: `norm` manda `-` a espacio */
  const c2 = armar([['A', 'ka', 'supervisor', 'Aero-Silva, Silva', '', ''],
                    ['B', 'kb', 'supervisor', 'Aero Silva', '', '']]);
  PRUEBAS.igual(c2(c2('Silva')), c2('Silva'), '🔴 IDEMPOTENTE con puntuación distinta');
  /* y el nombre que colisiona con `Object.prototype`: la raíz era el único diccionario sin convertir */
  const c3 = armar([['A', 'ka', 'supervisor', 'Alfa', '', '']]);
  PRUEBAS.igual(typeof c3('Constructor'), 'string',
    '🔴 `canon("Constructor")` devuelve una CADENA: con el objeto literal devolvía la función `Object`');
  PRUEBAS.igual(c3('Constructor'), 'Constructor',
    '🔴 y la devuelve tal cual: una empresa sin fila en `Accesos` se canoniza a sí misma');
  /* LO QUE NO PUEDE CAMBIAR · el caso normal sigue resolviendo a la primera variante */
  const c4 = armar([['A', 'ka', 'supervisor', 'Primera, Segunda', '', '']]);
  PRUEBAS.igual(c4('Segunda'), 'Primera',
    '🔴 NO PUEDE CAMBIAR · una variante sigue resolviendo al canónico de SU fila');
  PRUEBAS.igual(c4('Primera'), 'Primera', '🔴 NO PUEDE CAMBIAR · y el canónico a sí mismo');
});
