PRUEBAS.grupo('P105b · los encabezados REALES del CH');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `documentarCH()` dejó SIETE columnas sin nota en la primera corrida contra el CH de producción.
   Buscando por qué aparecieron dos cosas distintas, y conviene separarlas porque una casi me hace
   escribir una mentira en un commit.

   1 · `PVT`: LA COLUMNA DEL ID PUEDE CAER ENCIMA DE LOS DATOS (defecto real, nunca disparado acá)
   `accionPvt` arma una fila de ONCE valores y después hace `fila[colId] = id`, con `colId` sacado
   de dónde esté el encabezado "IdPVT" — o, si no existe, de `cab.length`. En una hoja `PVT` con
   menos de once encabezados —la que crea a mano quien abre un CH para un cliente nuevo— eso pone
   el id DENTRO del bloque de datos, y como `leerPVT()` lee por POSICIÓN (`validas: pInt(f[4])`),
   el número se pierde en el momento de escribirlo y el panel recibe null. Reproducido con el
   emulador antes de arreglarlo: cinco casos de acá se pusieron en rojo.

   ⚠️ EN EL CH DE HELITEC ESTO NO PASÓ, y hay que decirlo porque estuve a punto de afirmar lo
   contrario. La fila 1 de `PVT` es FECHA | NOMBRE | EMPRESA | DEPARTAMENTO | siete celdas VACÍAS |
   IdPVT: el id está en la columna 12, donde corresponde. Lo que había roto era mi instrumento de
   medición — la tarea `encabezados` del mantenimiento remoto hacía `.filter(Boolean)` y colapsaba
   los huecos, así que devolvía cinco nombres seguidos y `IdPVT` parecía estar en la quinta.
   El error se cazó solo: `repararPVT()` fue a mirar la hoja de verdad y dijo "no hay nada que
   reparar". Por eso la tarea `encabezados` ahora devuelve las celdas vacías como vacías.
   La lección no es sobre PVT: **una herramienta de diagnóstico que compacta huecos no informa de
   menos, informa mal**, y es la misma familia del auditor que decía "0 defectos" porque medía
   dentro de un `display:none`.

   2 · `Operacional`: el encabezado `Plan` no existe (real, y sí está pasando ahora)
   La hoja tiene ONCE encabezados, pero `armarFila` escribe DOCE valores desde Y4. El plan
   congelado se guarda en la columna L abajo de una celda de encabezado vacía. El dato está y
   `leerDuty` lo lee bien —va por posición—, pero quien abre la planilla ve una columna anónima
   llena de JSON. Y `obtenerHojaOperacional` sólo escribía los encabezados en la rama de CREACIÓN,
   que es exactamente la lección que ya había dejado el formato de texto tres veces (R15): lo que
   sólo se aplica al crear no protege una hoja que ya existía.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). Las hojas se arman con los encabezados que devolvió el CH,
   no con los que el código cree que tienen, y se llama a `accionPvt(p)` / `obtenerHojaOperacional()`
   —los puntos de entrada de verdad— y se lee con `leerPVT()`, que es la que alimenta el panel.
   Armar la fila a mano habría probado la función y no el llamador.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los encabezados TAL CUAL están hoy en el CH (tarea `encabezados` ya arreglada, 2026-09-06 04:5x).
   `P105B_PVT_REAL` es el caso PELIGROSO —una hoja corta, como la que arma a mano quien abre un CH
   nuevo—, no el de HELITEC; el de HELITEC es `P105B_PVT_HELITEC` y ya está bien. Los dos se prueban:
   el primero para que el defecto no vuelva, el segundo para no romper lo que hoy funciona. */
const P105B_PVT_REAL    = ['FECHA', 'NOMBRE', 'EMPRESA', 'DEPARTAMENTO', 'IdPVT'];
const P105B_PVT_HELITEC = ['FECHA', 'NOMBRE', 'EMPRESA', 'DEPARTAMENTO',
                           '', '', '', '', '', '', '', 'IdPVT'];
const P105B_OP_REAL  = ['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa',
                        'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado'];

function p105bPvtEnv(cab) {
  const env = GS.crearEntorno({ 'PVT': [cab.slice()] });
  const api = GS.cargarGs(CTX.gs, env, ['accionPvt', 'leerPVT', 'obtenerHojaPVT']);
  api.__env = env;
  return api;
}

/* Lo que manda la app: ver `pvtEnviar()` en index.html, que arma el id y los siete números. */
function p105bEnvio(id, validas) {
  return { id: id, nombre: 'Ana Pérez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones',
           validas: validas, rt_prom: 312, rt_min: 240, rt_max: 590, lapsos: 2,
           rt_mediana: 305, falsos: 1 };
}

PRUEBAS.caso('PVT · las reacciones válidas sobreviven al guardado (el id no las pisa)', () => {
  const api = p105bPvtEnv(P105B_PVT_REAL);
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06', 58));
  const filas = api.leerPVT();
  PRUEBAS.igual(filas.length, 1, 'se guardó una fila');
  PRUEBAS.igual(filas[0].validas, 58,
    'validas llega al panel · si es null, el id se escribió encima de la columna de datos');
  PRUEBAS.igual(filas[0].rt_prom, 312, 'el resto de la fila no se corrió de lugar');
  PRUEBAS.igual(filas[0].lapsos, 2, 'lapsos sigue en su posición');
  PRUEBAS.igual(filas[0].falsos, 1, 'salidas en falso sigue en su posición');
});

PRUEBAS.caso('PVT · el id se guarda igual y la deduplicación sigue funcionando', () => {
  const api = p105bPvtEnv(P105B_PVT_REAL);
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06', 58));
  /* El mismo envío otra vez: es lo que hace la cola offline cuando reintenta. */
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06', 58));
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06', 58));
  PRUEBAS.igual(api.leerPVT().length, 1, 'tres envíos del mismo id → una sola fila');
});

PRUEBAS.caso('PVT · dos pruebas distintas de la misma persona son dos filas', () => {
  const api = p105bPvtEnv(P105B_PVT_REAL);
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06_a', 58));
  api.accionPvt(p105bEnvio('pvt_ana_2026-09-06_b', 41));
  const f = api.leerPVT();
  PRUEBAS.igual(f.length, 2, 'dos ids distintos → dos filas');
  PRUEBAS.igual(f.map(x => x.validas).sort((a, b) => a - b).join(','), '41,58',
    'cada fila conserva SU número de reacciones válidas');
});

PRUEBAS.caso('PVT · una hoja nueva se crea con la columna del id DESPUÉS de los datos', () => {
  /* Sin hoja: la crea `obtenerHojaPVT` con los once encabezados. */
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['accionPvt', 'leerPVT']);
  api.accionPvt(p105bEnvio('pvt_nueva_1', 60));
  const sh = env.__libro.getSheetByName('PVT');
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  PRUEBAS.igual(cab.indexOf('IdPVT') >= 11, true,
    'IdPVT queda en la columna 12 o más adelante, nunca dentro de las once de datos · era ' +
    cab.indexOf('IdPVT'));
  PRUEBAS.igual(api.leerPVT()[0].validas, 60, 'y los datos se leen bien');
});

PRUEBAS.caso('PVT · el discriminador: con IdPVT mal ubicado a mano, la prueba tiene que doler', () => {
  /* Se pone IdPVT en la posición 5 igual que en producción y se comprueba que el arreglo NO
     consiste en ignorar el encabezado viejo: el id tiene que seguir guardándose en alguna parte,
     porque si no la deduplicación se cae en silencio y la cola offline llena la hoja. */
  const api = p105bPvtEnv(P105B_PVT_REAL);
  api.accionPvt(p105bEnvio('pvt_disc_1', 58));
  const sh = api.__env.__libro.getSheetByName('PVT');
  const fila = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  PRUEBAS.igual(fila.indexOf('pvt_disc_1') >= 0, true,
    'el id quedó escrito en alguna columna de la fila');
  PRUEBAS.igual(fila.indexOf('pvt_disc_1') >= 11, true,
    'y esa columna está fuera de las once de datos · era ' + fila.indexOf('pvt_disc_1'));
});

PRUEBAS.caso('Operacional · el encabezado Plan se repone aunque la hoja ya exista', () => {
  const env = GS.crearEntorno({ 'Operacional': [P105B_OP_REAL.slice()] });
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaOperacional']);
  const sh = api.obtenerHojaOperacional();
  const cab = sh.getRange(1, 1, 1, Math.max(12, sh.getLastColumn())).getValues()[0].map(String);
  PRUEBAS.igual(cab[11], 'Plan',
    'la columna 12 se llama Plan · el dato ya se escribía ahí desde Y4, sin encabezado');
  PRUEBAS.igual(cab.slice(0, 11).join('|'), P105B_OP_REAL.join('|'),
    'y no se le tocó ningún otro encabezado de los que ya tenía');
});

PRUEBAS.caso('Operacional · reponer el encabezado no pisa un nombre puesto a mano', () => {
  const propio = P105B_OP_REAL.concat(['Plan de ciclo']);
  const env = GS.crearEntorno({ 'Operacional': [propio.slice()] });
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaOperacional']);
  const sh = api.obtenerHojaOperacional();
  const cab = sh.getRange(1, 1, 1, 12).getValues()[0].map(String);
  PRUEBAS.igual(cab[11], 'Plan de ciclo',
    'si la celda ya tiene algo escrito, se respeta · sólo se rellena cuando está vacía');
});

/* Los bloques de CH_DOC no cierran en una línea propia, así que se recortan por dónde arranca el
   bloque siguiente y no con una llave de cierre. */
function p105bBloqueDoc(nombre) {
  const i = CTX.gs.indexOf('\n  "' + nombre + '": {');
  if (i < 0) return '';
  const j = CTX.gs.indexOf('\n\n  "', i + 1);
  return CTX.gs.slice(i, j > i ? j : i + 4000);
}

PRUEBAS.caso('La documentación explica las columnas que EXISTEN, no las que deberían existir', () => {
  const pvt = p105bBloqueDoc('PVT');
  PRUEBAS.igual(pvt.length > 0, true, 'hay un bloque de documentación para PVT');
  ['Nombre', 'Empresa', 'Departamento', 'IdPVT'].forEach(k => {
    PRUEBAS.igual(pvt.indexOf('"' + k + '":') >= 0, true,
      'PVT documenta la columna real ' + k);
  });
  const op = p105bBloqueDoc('Operacional');
  PRUEBAS.igual(op.length > 0, true, 'hay un bloque de documentación para Operacional');
  ['Fecha', 'Hora', 'Persona', 'Cargo'].forEach(k => {
    PRUEBAS.igual(op.indexOf('"' + k + '":') >= 0, true,
      'Operacional documenta la columna real ' + k);
  });
  /* El discriminador: si el recorte agarrara el archivo entero, cualquier nombre daría verde. */
  PRUEBAS.igual(pvt.indexOf('"Motivo":') < 0, true,
    'y el recorte es de PVT y no del archivo entero · Motivo es de Ausencias');
});


/* ── La reparación de lo que ya quedó escrito ─────────────────────────────────────────────────
   `accionPvt` arreglado deja de romper filas nuevas, pero las que ya están tienen el id sentado
   en la columna de `validas`. Esto es lo que las acomoda. Simula por defecto a propósito: es la
   única tarea de mantenimiento que toca datos de personas. */

function p105bConFilas(filas) {
  const env = GS.crearEntorno({ 'PVT': [P105B_PVT_REAL.slice()].concat(filas) });
  const api = GS.cargarGs(CTX.gs, env, ['repararPVT', 'leerPVT']);
  api.__env = env;
  return api;
}

/* Una fila como la escribió la app rota: id en la columna 5, el resto de los números corridos
   ninguno — sólo `validas` se perdió. */
function p105bFilaRota(id, rt) {
  return ['2026-09-01 08:00', 'Ana Pérez', 'Consorcio HELITEC', 'Operaciones',
          id, rt, 240, 590, 2, 305, 1];
}

PRUEBAS.caso('reparar · por defecto SIMULA y no escribe nada', () => {
  const api = p105bConFilas([p105bFilaRota('pvt_ana_1', 312)]);
  const r = api.repararPVT();
  PRUEBAS.igual(r.aplicado, false, 'dice que no aplicó');
  PRUEBAS.igual(r.filasAMover, 1, 'y sí informa cuántas filas movería');
  const sh = api.__env.__libro.getSheetByName('PVT');
  PRUEBAS.igual(String(sh.getRange(2, 5).getValue()), 'pvt_ana_1',
    'la celda sigue exactamente como estaba');
});

PRUEBAS.caso('reparar · con aplicar mueve el id y deja el hueco a la vista', () => {
  const api = p105bConFilas([p105bFilaRota('pvt_ana_1', 312)]);
  api.repararPVT(true);
  const sh = api.__env.__libro.getSheetByName('PVT');
  PRUEBAS.igual(String(sh.getRange(2, 12).getValue()), 'pvt_ana_1', 'el id quedó en la columna 12');
  PRUEBAS.igual(String(sh.getRange(2, 5).getValue() || ''), '',
    'y la columna de validas quedó VACÍA · el número no existe, inventarlo sería peor');
  PRUEBAS.igual(String(sh.getRange(1, 12).getValue()), 'IdPVT', 'el encabezado nuevo está');
  PRUEBAS.igual(api.leerPVT()[0].rt_prom, 312, 'el resto de la fila se lee igual que antes');
});

PRUEBAS.caso('reparar · un número en la columna vieja es un validas de verdad y NO se toca', () => {
  /* Filas anteriores a que la app creara la columna: ahí el 5 es el dato bueno. */
  const api = p105bConFilas([p105bFilaRota('pvt_ana_1', 312), p105bFilaRota(58, 300)]);
  const r = api.repararPVT(true);
  PRUEBAS.igual(r.numerosIntactos, 1, 'contó una celda numérica y la dejó');
  const sh = api.__env.__libro.getSheetByName('PVT');
  PRUEBAS.igual(String(sh.getRange(3, 5).getValue()), '58', 'el validas viejo sigue en su lugar');
  PRUEBAS.igual(String(sh.getRange(3, 12).getValue() || ''), '', 'y no se copió a la columna del id');
});

PRUEBAS.caso('reparar · correrla dos veces deja lo mismo (idempotente)', () => {
  const api = p105bConFilas([p105bFilaRota('pvt_ana_1', 312), p105bFilaRota('pvt_ana_2', 288)]);
  api.repararPVT(true);
  const sh = api.__env.__libro.getSheetByName('PVT');
  const antes = sh.getRange(1, 1, 3, 12).getValues().map(f => f.map(String).join('|')).join('\n');
  const r2 = api.repararPVT(true);
  const despues = sh.getRange(1, 1, 3, 12).getValues().map(f => f.map(String).join('|')).join('\n');
  PRUEBAS.igual(despues, antes, 'la segunda corrida no cambia una sola celda');
  PRUEBAS.igual(r2.filasAMover, 0, 'y ya no encuentra nada que mover');
});

PRUEBAS.caso('reparar · y después de repararla, guardar una prueba nueva funciona', () => {
  /* El camino completo: hoja rota → reparar → la app manda una prueba → el panel la lee bien. */
  const env = GS.crearEntorno({ 'PVT': [P105B_PVT_REAL.slice(), p105bFilaRota('pvt_vieja', 312)] });
  const api = GS.cargarGs(CTX.gs, env, ['repararPVT', 'accionPvt', 'leerPVT']);
  api.repararPVT(true);
  api.accionPvt(p105bEnvio('pvt_nueva', 47));
  const f = api.leerPVT();
  PRUEBAS.igual(f.length, 2, 'quedan las dos filas');
  PRUEBAS.igual(f[1].validas, 47, 'la nueva conserva sus reacciones válidas');
  api.accionPvt(p105bEnvio('pvt_nueva', 47));
  PRUEBAS.igual(api.leerPVT().length, 2, 'y el reintento sigue sin duplicar');
});

PRUEBAS.caso('reparar · una fila vieja NO se reenvía dos veces mientras no se repare', () => {
  /* El puente: mientras la columna vieja siga ahí, la cola offline reintenta pruebas guardadas
     antes del arreglo. Si sólo se mirara la columna nueva, cada una crearía un duplicado. */
  const env = GS.crearEntorno({ 'PVT': [P105B_PVT_REAL.slice(), p105bFilaRota('pvt_ana_1', 312)] });
  const api = GS.cargarGs(CTX.gs, env, ['accionPvt', 'leerPVT']);
  api.accionPvt(p105bEnvio('pvt_ana_1', 58));
  PRUEBAS.igual(api.leerPVT().length, 1,
    'reenviar una prueba de las viejas no agrega una fila');
});

PRUEBAS.caso('PVT · la hoja tal como está HOY en el CH sigue funcionando igual', () => {
  /* No es redundante con los de arriba: aquellos usan una hoja corta para vigilar el defecto.
     Este usa la fila 1 real de HELITEC —con los siete huecos— para que el arreglo no rompa lo
     único que sí está en producción. */
  const api = p105bPvtEnv(P105B_PVT_HELITEC);
  api.accionPvt(p105bEnvio('pvt_helitec_1', 62));
  api.accionPvt(p105bEnvio('pvt_helitec_1', 62));
  const f = api.leerPVT();
  PRUEBAS.igual(f.length, 1, 'el reintento no duplica');
  PRUEBAS.igual(f[0].validas, 62, 'y las reacciones válidas llegan enteras');
  const sh = api.__env.__libro.getSheetByName('PVT');
  PRUEBAS.igual(String(sh.getRange(2, 12).getValue()), 'pvt_helitec_1',
    'el id sigue guardándose en la columna 12, sin moverse de donde ya estaba');
});

PRUEBAS.caso('reparar · sobre la hoja de HELITEC sólo repone encabezados, no toca una fila', () => {
  const env = GS.crearEntorno({ 'PVT': [P105B_PVT_HELITEC.slice(),
    ['2026-09-01 08:00', 'Ana Pérez', 'Consorcio HELITEC', 'Operaciones',
     58, 312, 240, 590, 2, 305, 1, 'pvt_ana_1']] });
  const api = GS.cargarGs(CTX.gs, env, ['repararPVT', 'leerPVT']);
  const r = api.repararPVT(true);
  PRUEBAS.igual(r.colVieja, null, 'no hay columna de id mal ubicada');
  PRUEBAS.igual(r.filasAMover, 0, 'y por lo tanto no mueve ninguna fila');
  PRUEBAS.igual(r.encabezados.join(','),
    'Reacciones válidas,RT promedio (ms),RT mínimo,RT máximo,Lapsos,RT mediano,Salidas en falso',
    'lo único que escribe son los siete encabezados que faltaban');
  const f = api.leerPVT()[0];
  PRUEBAS.igual([f.validas, f.rt_prom, f.lapsos, f.falsos].join(','), '58,312,2,1',
    'la fila de datos quedó exactamente igual');
});

PRUEBAS.caso('el diagnóstico no compacta los huecos · era lo que había mentido', () => {
  /* La tarea `encabezados` hacía `.filter(Boolean)`, así que una fila con celdas vacías en el
     medio se reportaba como si los nombres fueran consecutivos, y una columna de la 12 parecía
     estar en la 5. Sobre ese informe se concluyó que producción estaba perdiendo datos. */
  /* ⚠️ SE SACAN LOS COMENTARIOS ANTES DE MIRAR. La primera versión de este caso se puso en rojo
     por la explicación que el propio arreglo dejó escrita al lado ("SIN `filter(Boolean)`…").
     Es la tercera vez que pasa en esta suite: un nombre citado en un comentario no es código, y
     la salida fácil —empobrecer el comentario— es peor que el problema. */
  const sinComentarios = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const i = CTX.gs.indexOf('if (tarea === "encabezados")');
  const bloque = sinComentarios(CTX.gs.slice(i, CTX.gs.indexOf('hojas: out', i)));
  PRUEBAS.igual(i > 0 && bloque.length > 0, true, 'se encontró el bloque de la tarea');
  PRUEBAS.igual(bloque.indexOf('filter(Boolean)') < 0, true,
    'la tarea encabezados ya no filtra las celdas vacías');
  PRUEBAS.igual(bloque.indexOf('fila.pop()') >= 0, true,
    'y sólo recorta las vacías del FINAL, que son las que no significan nada');
  /* El discriminador: si el recorte de comentarios se comiera el código, todo daría verde. */
  PRUEBAS.igual(bloque.indexOf('getLastColumn') >= 0, true,
    'y el bloque analizado sigue teniendo código adentro');
  /* El otro informe que mentía igual: el que lista los "encabezados reales" cuando una nota no
     encuentra su columna. Es el que se leyó para diagnosticar esto. */
  const j = CTX.gs.indexOf('sinColumna.push(nombre');
  const bloque2 = sinComentarios(CTX.gs.slice(j, j + 400));
  PRUEBAS.igual(bloque2.indexOf('filter(Boolean)') < 0, true,
    'el informe de documentarCH tampoco comprime los huecos');
});
