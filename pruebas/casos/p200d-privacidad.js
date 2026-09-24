PRUEBAS.grupo('P200d · lote 3 de A8: el umbral de anonimato en el SERVIDOR, y la demostración de Dirección que no era la vista de Dirección');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS TRES HALLAZGOS DE PRIVACIDAD DE LA AUDITORÍA DE CIERRE DE TANDA (P091 · A8).

   #2 · `doc_12_p` le promete a quien reporta DOS protecciones, y hace el contraste explícito: «no
        es que se oculte en pantalla, es que el nombre nunca se envía… Hay una segunda protección:
        el departamento sólo se muestra si tiene N personas o más». La primera era de servidor; la
        segunda vivía sólo en `reporteDeptoVisible()` del cliente, así que el payload traía el área
        y el comentario igual. En un área de una persona, el área ES el nombre.
   #4 · la rama `demo` de `accionSupervisor` no anonimizaba: «Ver Empresa Demo» → ojo → «Dirección»
        mostraba nombres donde la vista real da P1/P2.
   #8 · el barrido de contrato del `.gs` cubre 1 de las ~50 respuestas del endpoint.

   ⚠️ SE ENTRA POR LAS ACCIONES, no por las funciones nuevas (R17): lo que importa no es que
   `aplicarUmbralAnon_` sepa contar, sino que el payload que sale por la puerta ya no lleve el dato.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P200D_HOY = new Date().toISOString().substring(0, 10);

/* Una fila de `Respuestas de formulario 1`. Columnas del `.gs`: COL_PERSONA=2, COL_DEPTO=3,
   COL_EMPRESA=73, COL_FECHA=74, COL_KSS=87 (1-based). */
function p200dFila(persona, dep, kss){
  const f = new Array(90).fill('');
  f[0] = P200D_HOY + ' 08:00:00';
  f[1] = persona; f[2] = dep; f[72] = 'Helitec'; f[73] = P200D_HOY; f[86] = kss || 5;
  return f;
}
function p200dReporte(id, ident, persona, dep, comentario){
  return [P200D_HOY + 'T08:00:00.000Z', id, 'cansancio', ident ? 'true' : 'false',
          ident ? persona : '', 'Helitec', dep, ident ? 'Piloto' : '', comentario || ''];
}

/* El CH de prueba. `Operaciones` tiene CINCO personas midiéndose; `Mantenimiento`, UNA.
   `Almacén` es el caso que separa los dos criterios posibles: OCHO en nómina y sólo DOS midiéndose.
   Es el que `depCensoDe` —que suma nómina + registros— habría dejado pasar. */
function p200dHojas(extraConfig){
  const medidos = [
    ['Ana Uno', 'Operaciones'], ['Beto Dos', 'Operaciones'], ['Caro Tres', 'Operaciones'],
    ['Dani Cuatro', 'Operaciones'], ['Eva Cinco', 'Operaciones'],
    ['Sara Sola', 'Mantenimiento'],
    ['Tito Alma', 'Almacén'], ['Uma Alma', 'Almacén']
  ];
  /* ⚠️ UNA CÉDULA DISTINTA POR PERSONA, Y POR ÍNDICE. La primera versión las derivaba de la
     longitud del nombre: «Caro Tres» y «Eva Cinco» miden lo mismo, así que compartían cédula y el
     resolutor de identidad las fusionaba —correctamente— en una sola persona. «Operaciones» contaba
     4 en vez de 5 y el caso feliz se caía por un defecto del DATO DE PRUEBA, no del código. */
  const nomina = medidos.map((m, i) => ['Helitec', m[0], 'V-9000' + (i + 1), m[1], 'Piloto', 'F', '35', '', '', 'No', '', 'empleado', '3']);
  for (let i = 1; i <= 6; i++) nomina.push(['Helitec', 'Nomina Almacen ' + i, 'V-A' + i, 'Almacén', 'Operario', 'M', '30', '', '', 'No', '', 'empleado', '2']);
  return {
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['helitec', 'sup-200d', 'empresa', 'Helitec', 'med-200d', 'dir-200d']],
    'Respuestas de formulario 1': [new Array(90).fill('b'), new Array(90).fill('p')]
      .concat(medidos.map(m => p200dFila(m[0], m[1], 5))),
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo','Sexo','Edad','Telefono','Email','EsPiloto','IdPiloto','Rol','Nivel']].concat(nomina),
    'Reportes': [['Fecha','IdReporte','Opcion','Identificado','Persona','Empresa','Departamento','Cargo','Comentario'],
      p200dReporte('r-ops',  false, '', 'Operaciones',   'Hay mucha carga esta semana'),
      p200dReporte('r-mant', false, '', 'Mantenimiento', 'Solo yo cubro todo el turno de Mantenimiento'),
      p200dReporte('r-alma', false, '', 'Almacén',       'El turno de la noche queda corto'),
      p200dReporte('r-id',   true,  'Ana Uno', 'Operaciones', 'Prefiero decirlo con mi nombre')],
    'Config Empresa': [['Empresa','Clave','Valor']].concat(extraConfig || []),
    'Niveles Riesgo': [['Empresa','Departamento','Cargo','Persona','Nivel']],
    'PVT': [['Fecha','Persona','Empresa','rt_prom','lapsos']],
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan']],
    'Turnos': [['Fecha','Hora','Id','Tipo','Persona','Empresa','Departamento','Cargo','KSS','Carga']],
    'Marca': [['Empresa','Nombre','Color','Logo']],
    'Gestiones': [['Empresa','ID','Datos (JSON)','Última actualización']]
  };
}

/* Corre `reportes` DE VERDAD con la clave que se le pase. Devuelve el payload ya parseado. */
function p200dLeerReportes(clave, extraConfig){
  const env = GS.crearEntorno(p200dHojas(extraConfig));
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer']);
  return JSON.parse(api.accionReportesLeer({ usuario:'helitec', pass:clave, empresa:'Helitec', dispositivoId:'p200d' }).getContent());
}
function p200dDepDe(r, id){
  const x = (r.reportes || []).filter(function(q){ return q.id === id; })[0];
  return x ? x.departamento : '(no vino ese reporte)';
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #2 · EL UMBRAL, DEL LADO DEL SERVIDOR
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200d · el payload de Dirección ya no trae el área de un reporte anónimo de un área chica', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido (python pruebas/servir-gs.py)'); return; }
  const r = p200dLeerReportes('dir-200d');
  PRUEBAS.igual(r.ok, true, 'guarda: la acción responde');
  PRUEBAS.igual(r.alcance, 'anonimos', 'guarda: Dirección sólo recibe los anónimos');
  PRUEBAS.igual((r.reportes || []).length, 3, 'guarda: llegan los tres anónimos y no el identificado');

  PRUEBAS.igual(p200dDepDe(r, 'r-mant'), '',
    '🔴 «Mantenimiento» viene VACÍO · una sola persona se mide ahí, así que el nombre del área es el nombre de la persona — que es literalmente lo que `doc_12_p` promete evitar');
  PRUEBAS.igual(p200dDepDe(r, 'r-ops'), 'Operaciones',
    'y «Operaciones» sí viene: cinco personas medidas, el umbral por defecto es 5 · si esto también viniera vacío, el arreglo estaría tapando todo y no protegiendo nada');
});

PRUEBAS.caso('🔴 P200d · el criterio son las personas MEDIDAS, no las de la nómina', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const r = p200dLeerReportes('dir-200d');
  PRUEBAS.igual(p200dDepDe(r, 'r-alma'), '',
    '🔴 «Almacén» viene vacío · tiene OCHO en la nómina y sólo DOS midiéndose. Quien manda un reporte anónimo es alguien que usa la app, así que el área identifica entre dos. Contando la nómina —que es lo que hace `depCensoDe`— este habría pasado y la fuga seguiría viva');
});

PRUEBAS.caso('🔴 P200d · DISCRIMINADOR · cambiar `anonN` cambia la respuesta (antes era idéntica con 1, 3 y 99)', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  /* Es la medición que destapó el defecto: el auditor corrió la misma lectura con el umbral en 1,
     en 3 y en 99 y la respuesta no cambió nunca, o sea que el servidor jamás consultaba la config.
     Sin este caso, los dos de arriba podrían estar pasando por cualquier otra razón. */
  const abierto = p200dLeerReportes('dir-200d', [['Helitec', 'anonN', '1']]);
  PRUEBAS.igual(p200dDepDe(abierto, 'r-mant'), 'Mantenimiento',
    '🔴 con `anonN = 1` el área de una persona SÍ viaja · el servidor lee la config de la empresa');
  const cerrado = p200dLeerReportes('dir-200d', [['Helitec', 'anonN', '99']]);
  PRUEBAS.igual(p200dDepDe(cerrado, 'r-ops'), '',
    'y con `anonN = 99` no viaja ni «Operaciones» · tres respuestas distintas para el mismo CH');
  PRUEBAS.igual(p200dDepDe(cerrado, 'r-mant'), '', 'ni la otra');
});

PRUEBAS.caso('🔴 P200d · un reporte anónimo es anónimo TAMBIÉN para el supervisor, y el identificado no se toca', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const r = p200dLeerReportes('sup-200d');
  PRUEBAS.igual(r.alcance, 'todo', 'guarda: el supervisor recibe los dos tipos');
  PRUEBAS.igual(p200dDepDe(r, 'r-mant'), '',
    '🔴 el anónimo del área chica tampoco le llega con área · el supervisor ve nombres de su gente todo el día, pero esto es R4: reportar no puede tener consecuencias, y el texto de la promesa no distingue por rol');
  PRUEBAS.igual(p200dDepDe(r, 'r-id'), 'Operaciones',
    'y el IDENTIFICADO conserva la suya · quien firma con su nombre no está pidiendo anonimato, y vaciarle el área le sacaría información útil al supervisor sin proteger a nadie');
  const ident = (r.reportes || []).filter(q => q.id === 'r-id')[0];
  PRUEBAS.igual(ident && ident.persona, 'Ana Uno', 'con su nombre, como antes');
});

PRUEBAS.caso('⚠️ P200d · el comentario viaja entero, y el candado del cliente sigue puesto', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const r = p200dLeerReportes('dir-200d');
  const mant = (r.reportes || []).filter(q => q.id === 'r-mant')[0];
  PRUEBAS.igual(mant && mant.comentario, 'Solo yo cubro todo el turno de Mantenimiento',
    '⚠️ el comentario NO se recorta: es el contenido del reporte, y la promesa escrita es sobre el nombre y el área. Que un texto libre pueda identificar igual en un área de una persona es decisión de Franco, anotada en PENDIENTES_USUARIO.md');
  return fetch('/index.html?v=' + Date.now()).then(rr => rr.text()).then(src => {
    PRUEBAS.cierto(/function reporteDeptoVisible/.test(src),
      '⚠️ y `reporteDeptoVisible` sigue en el cliente · el servidor deja de ser el único candado, pero el cliente tampoco confía');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #4 · LA DEMOSTRACIÓN DE LA VISTA DE DIRECCIÓN TIENE QUE SER LA VISTA DE DIRECCIÓN
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p200dDemo(clave){
  const hojas = p200dHojas();
  /* La Empresa Demo, con sus propias personas: es lo que devuelve la rama `demo`. */
  hojas['Respuestas de formulario 1'] = hojas['Respuestas de formulario 1'].concat([
    (function(){ const f = p200dFila('Ana Demo', 'Operaciones', 6); f[72] = 'Empresa Demo'; return f; })(),
    (function(){ const f = p200dFila('Beto Demo', 'Mantenimiento', 4); f[72] = 'Empresa Demo'; return f; })()
  ]);
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor']);
  return JSON.parse(api.accionSupervisor({ usuario:'helitec', pass:clave, demo:'1', dispositivoId:'p200d' }).getContent());
}

PRUEBAS.caso('🔴 P200d · la demostración «vista como Dirección» llega anonimizada, igual que la vista real', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const r = p200dDemo('dir-200d');
  PRUEBAS.igual(r.ok, true, 'guarda: la rama demo responde');
  PRUEBAS.igual(r.vista, 'hseq', 'guarda: con la clave de Dirección, la demo respeta la vista de la cuenta');
  const personas = (r.registros || []).map(x => x.persona).sort();
  PRUEBAS.alMenos(personas.length, 2, 'guarda: la demo trae registros · con cero, lo de abajo no probaría nada');
  PRUEBAS.igual(personas.filter(p => /Demo/.test(String(p))), [],
    '🔴 ningún nombre real en `registros` · antes venían «Ana Demo» y «Beto Demo», o sea que la demostración de la vista de Dirección no era la vista de Dirección — y es el camino que se usa para explicarle a un cliente qué ve cada rol');
  PRUEBAS.cierto(personas.every(p => /^P\d+$/.test(String(p))),
    'y todos son identificadores opacos (P1, P2…) · ' + personas.join(', '));
  const enAptitud = (r.aptitud || []).map(a => a.nombre);
  PRUEBAS.igual(enAptitud.filter(n => /Demo/.test(String(n))), [], 'tampoco en `aptitud`');
});

PRUEBAS.caso('🔴 P200d · DISCRIMINADOR · la misma demo con la clave de SUPERVISOR sí trae nombres', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const r = p200dDemo('sup-200d');
  PRUEBAS.igual(r.vista, 'supervisor', 'guarda: la demo respeta la vista de la cuenta logueada');
  const personas = (r.registros || []).map(x => x.persona);
  PRUEBAS.alMenos(personas.filter(p => /Demo/.test(String(p))).length, 2,
    '🔴 el supervisor SÍ ve los nombres · si el arreglo hubiera anonimizado todo, este caso estaría en rojo y el de arriba pasaría por la razón equivocada');
});

PRUEBAS.caso('⚠️ P200d · las dos ramas llaman a la MISMA función de recorte, no a una copia', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  /* Sin la DECLARACIÓN, que también empieza por `recortarParaVista_(acc,`: contarla daba 3 y el
     aserto fallaba por una razón que no era el defecto. */
  const soloLlamadas = (CTX.gs.match(/recortarParaVista_\(acc,/g) || []).length
    - (CTX.gs.match(/function recortarParaVista_\(acc,/g) || []).length;
  PRUEBAS.igual(soloLlamadas, 2,
    '⚠️ exactamente dos llamadores: la rama normal y la de la demostración · escribirlo dos veces es el modo de fallar de A13 y de P151, y es lo que dejó la demo sin anonimizar');
  PRUEBAS.igual((CTX.gs.match(/function recortarParaVista_/g) || []).length, 1,
    'DISCRIMINADOR · y hay UNA sola declaración: el conteo de arriba mide llamadas, no definiciones');
  const anon = (CTX.gs.match(/anonimizarHseq\(/g) || []).length
    - (CTX.gs.match(/function anonimizarHseq\(/g) || []).length;
  PRUEBAS.igual(anon, 1,
    'y `anonimizarHseq` tiene UN solo llamador —`recortarParaVista_`— · si apareciera otro, alguien volvió a escribir el recorte a mano en vez de usar la función común');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE ENCONTRÓ EL VERIFICADOR SOBRE ESTE MISMO ARREGLO

   El umbral pasó al servidor y en el camino feliz funcionaba, pero el eslabón que este proyecto ya
   se comió cuatro veces seguía abierto: el servidor contaba sobre `leerRegistros()` CRUDO y el
   cliente cuenta sobre `DASH.registros`, que `accionSupervisor` le manda ya resueltos. Dos
   variantes del mismo nombre eran una persona para la pantalla y DOS para el servidor, así que un
   área de una sola persona con una variante volvía a pasar el umbral — la fuga original, atenuada
   pero viva. Estos casos prueban el CONTRATO entre los dos lados, no cada lado por separado.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Un CH donde UNA persona escribió su nombre de dos formas y la hoja `Identidades` las une por
   cédula, que es el flujo documentado del CH. Para el cliente es una persona; para un servidor que
   no resuelva identidad, dos. */
function p200dHojasVariante(){
  const h = p200dHojas([['Helitec', 'anonN', '2']]);
  h['Respuestas de formulario 1'] = [new Array(90).fill('b'), new Array(90).fill('p'),
    p200dFila('Sara Sola', 'Mantenimiento', 5),
    p200dFila('S. Sola',   'Mantenimiento', 6)];
  h['Nómina'] = [['Empresa','Nombre','Cedula','Departamento','Cargo','Sexo','Edad','Telefono','Email','EsPiloto','IdPiloto','Rol','Nivel'],
                 ['Helitec', 'Sara Sola', 'V-11111111', 'Mantenimiento', 'Técnico', 'F', '35', '', '', 'No', '', 'empleado', '2']];
  h['Identidades'] = [['Variante', 'Empresa', 'Cedula', 'ResueltoPor'],
                      ['S. Sola', 'Helitec', 'V-11111111', 'manual']];
  h['Reportes'] = [['Fecha','IdReporte','Opcion','Identificado','Persona','Empresa','Departamento','Cargo','Comentario'],
                   p200dReporte('r-mant', false, '', 'Mantenimiento', 'Solo yo cubro todo el turno')];
  return h;
}

PRUEBAS.caso('🔴 P200d · CONTRATO · el servidor y el cliente cuentan la MISMA gente: una variante de nombre no abre el umbral', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const env = GS.crearEntorno(p200dHojasVariante());
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer', 'accionSupervisor']);
  const cred = { usuario:'helitec', pass:'dir-200d', empresa:'Helitec', dispositivoId:'p200d' };

  /* Lado SERVIDOR: lo que sale por la puerta. */
  const rep = JSON.parse(api.accionReportesLeer(cred).getContent());
  PRUEBAS.igual(rep.ok, true, 'guarda: la acción responde');

  /* Lado CLIENTE: el MISMO CH, entrando por `onDashData` con el payload real del panel — no un
     `DASH` armado a mano (R17), que es el atajo que dejó pasar este defecto la primera vez. */
  const dash = JSON.parse(api.accionSupervisor(cred).getContent());
  const prev = DASH;
  try {
    onDashData(dash, 'Helitec', { usuario:'helitec', pass:'dir-200d' }, 'hseq');
    const porDepto = personasPorDepto();
    PRUEBAS.igual(porDepto['Mantenimiento'], 1,
      'guarda: para el CLIENTE «Mantenimiento» tiene UNA persona · `accionSupervisor` corre `RES.aplicar()`, así que las dos variantes llegan como la misma');
    PRUEBAS.igual(reporteDeptoVisible('Mantenimiento'), null,
      'guarda: y con `anonN = 2` la pantalla lo esconde');
    PRUEBAS.igual(p200dDepDe(rep, 'r-mant'), '',
      '🔴 el SERVIDOR también lo vacía · antes contaba «Sara Sola» y «S. Sola» como dos personas sobre `leerRegistros()` crudo, mandaba el área de un área de UNA persona, y la pantalla la tapaba: la promesa dice «no es que se oculte en pantalla, es que el nombre nunca se envía»');
  } finally { try { DASH = prev; } catch(e){} }
});

PRUEBAS.caso('🔴 P200d · DISCRIMINADOR del contrato · sin la variante, el área de DOS personas sí pasa con `anonN = 2`', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const h = p200dHojasVariante();
  h['Identidades'] = [['Variante', 'Empresa', 'Cedula', 'ResueltoPor']];   // sin el override: son dos personas de verdad
  h['Nómina'] = h['Nómina'].concat([['Helitec', 'S. Sola', 'V-22222222', 'Mantenimiento', 'Técnico', 'F', '30', '', '', 'No', '', 'empleado', '2']]);
  const env = GS.crearEntorno(h);
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer']);
  const rep = JSON.parse(api.accionReportesLeer({ usuario:'helitec', pass:'dir-200d', empresa:'Helitec', dispositivoId:'p200d' }).getContent());
  PRUEBAS.igual(p200dDepDe(rep, 'r-mant'), 'Mantenimiento',
    '🔴 con DOS personas distintas el área sí viaja · si esto también viniera vacío, el caso de arriba estaría pasando porque el arreglo tapa todo, no porque cuente bien');
});

PRUEBAS.caso('🔴 P200d · CERRADO POR DEFECTO · si el conteo no se puede hacer, no se manda ninguna área', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  /* Sin la hoja de respuestas, `leerDatos()` no puede contar. El comentario del código declara esto
     como protección deliberada y NINGÚN caso lo medía: el verificador invirtió la rama y los tres
     asertos del camino feliz siguieron en verde, porque en aquel CH el conteo sí se podía hacer. */
  const h = p200dHojas([['Helitec', 'anonN', '1']]);   // umbral 1: sin el cierre por defecto, TODO pasaría
  delete h['Respuestas de formulario 1'];
  const env = GS.crearEntorno(h);
  const api = GS.cargarGs(CTX.gs, env, ['accionReportesLeer']);
  const rep = JSON.parse(api.accionReportesLeer({ usuario:'helitec', pass:'dir-200d', empresa:'Helitec', dispositivoId:'p200d' }).getContent());
  PRUEBAS.igual(rep.ok, true, 'guarda: la acción responde igual · una hoja que falta no puede tumbar la bandeja');
  const areas = (rep.reportes || []).map(r => r.departamento);
  PRUEBAS.igual(areas.filter(a => a !== ''), [],
    '🔴 ninguna área viaja · con `anonN = 1` y el conteo roto, sin esta protección saldrían todas: un fallo de lectura no puede publicar justo lo que esta función existe para tapar');
});

PRUEBAS.caso('⚠️ P200d · `anonN = 0` significa lo mismo de los dos lados: sin umbral', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  /* El cliente lee `n >= min`, así que con 0 muestra todo. El servidor descartaba el 0 con un
     `n > 0` y caía al default 5: una empresa que configuró «sin umbral» veía MENOS que una que no
     configuró nada. Es el mismo falsy que ya mordió en `altaAbierta`, en espejo. */
  const rep = p200dLeerReportes('dir-200d', [['Helitec', 'anonN', '0']]);
  PRUEBAS.igual(p200dDepDe(rep, 'r-mant'), 'Mantenimiento',
    '⚠️ con `anonN = 0` el área de una persona viaja · es lo que el cliente pinta, y el servidor tiene que decidir lo mismo');
  const conCinco = p200dLeerReportes('dir-200d');
  PRUEBAS.igual(p200dDepDe(conCinco, 'r-mant'), '', 'DISCRIMINADOR · y sin config, el default 5 la sigue tapando');
});

PRUEBAS.caso('⚠️ P200d · el umbral no mete la lectura más cara del CH en cada arranque de panel', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  /* `dashCargarReportes()` corre en CADA arranque de panel. La primera versión llamaba a
     `leerRegistros()`, que hace `getDataRange()` sobre `Respuestas de formulario 1` —la hoja más
     grande del CH, sin caché y sin acotar columnas: el defecto que E3 arregló—. `leerDatos()` está
     cacheada 180 s y acota a `COLS_UTILES`, y el panel acaba de llenar esa caché. */
  const i = CTX.gs.indexOf('function aplicarUmbralAnon_');
  /* ⚠️ SIN COMENTARIOS: el comentario que explica por qué NO se usa `leerRegistros` la nombra, así
     que contarla a secas daba 1 y el discriminador se autodestruía. Es la segunda vez en dos
     prompts que me pasa lo mismo. */
  const cuerpo = CTX.gs.slice(i, CTX.gs.indexOf('\nfunction ', i + 10))
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  PRUEBAS.cierto(/leerDatos\(\)/.test(cuerpo),
    '⚠️ el umbral lee por la vía cacheada y acotada');
  PRUEBAS.igual((cuerpo.match(/leerRegistros\(/g) || []).length, 0,
    'DISCRIMINADOR · y no queda ninguna llamada a la cruda en el CÓDIGO');
  PRUEBAS.cierto(/leerRegistros/.test(CTX.gs.slice(i, CTX.gs.indexOf('\nfunction ', i + 10))),
    'guarda del discriminador · el comentario que explica por qué sigue nombrándola');
  PRUEBAS.cierto(/construirResolutor\(\)\.aplicar/.test(cuerpo),
    'y resuelve identidad antes de contar, que es lo que hace el panel con los mismos registros');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL AVISO A QUIEN ESCRIBE (decisión de Franco, 2026-09-24)

   El área ya no viaja por debajo del umbral, pero el comentario sí. Recortarlo le sacaría al
   reporte casi todo su valor justo donde más hace falta, así que en vez de recortar se AVISA: R4
   dice que la cultura justa se ve, y se ve donde la persona decide qué contestar.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200d · el reporte ANÓNIMO avisa que el supervisor lee el texto tal cual, y el identificado no', () => {
  const prev = DASH;
  try {
    /* Por el camino real: el HTML lo arma `dashReporteCard()` a partir de la opción elegida. */
    const anon = REPORTE_OPCIONES.filter(o => !o.identificado)[0];
    const ident = REPORTE_OPCIONES.filter(o => o.identificado)[0];
    PRUEBAS.cierto(!!anon && !!ident, 'guarda: hay opciones de los dos tipos · ' + REPORTE_OPCIONES.map(o => o.k).join(', '));

    DASH = { _reporteAbierto: true, _reporteOpcion: anon.k };
    const htmlAnon = dashReporteCard();
    PRUEBAS.cierto(htmlAnon.indexOf('sf-rep-aviso') >= 0,
      '🔴 el anónimo muestra el aviso · el `placeholder` decía algo parecido pero desaparece al escribir la primera letra, que es justo cuando importa');
    PRUEBAS.cierto(htmlAnon.indexOf(esc(t('rep_aviso_texto'))) >= 0, 'con el texto del diccionario, no escrito a mano');

    DASH = { _reporteAbierto: true, _reporteOpcion: ident.k };
    PRUEBAS.igual(dashReporteCard().indexOf('sf-rep-aviso'), -1,
      'DISCRIMINADOR · y el IDENTIFICADO no lo muestra: quien firma con su nombre ya decidió que se sepa, y repetirle la advertencia sería ruido');
  } finally { try { DASH = prev; } catch(e){} }
});

PRUEBAS.caso('⚠️ P200d · el aviso está en los dos idiomas y usa tokens, no colores a mano', () => {
  ['es', 'en'].forEach(l => {
    PRUEBAS.cierto(_i18nBuscar(l, sectorActual(), 'rep_aviso_texto') != null, '⚠️ la clave existe en ' + l);
  });
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const regla = src.slice(src.indexOf('.sf-rep-aviso {'), src.indexOf('}', src.indexOf('.sf-rep-aviso {')));
    PRUEBAS.igual((regla.match(/#[0-9a-fA-F]{3,8}\b/g) || []), [], '⚠️ R13 · sin colores a mano · «' + regla.replace(/\s+/g, ' ').slice(0, 110) + '»');
    PRUEBAS.cierto(/var\(--/.test(regla), 'y con tokens');
  });
});
