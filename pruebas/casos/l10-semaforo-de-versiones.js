PRUEBAS.grupo('L10 · el semáforo de versiones: apretar una defensa sin dejar a nadie afuera');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE. Exigir el código de empresa deja trabado a quien todavía no recibió la app con
   el campo donde escribirlo (L9). Una PWA cacheada puede tardar días en actualizarse, y hasta acá
   la única forma de saberlo era esperar a que alguien se quejara — o sea, enterarse por la persona
   que ya quedó afuera.

   Medido el 2026-09-07: al momento de escribir esto, el dominio todavía servía la 5.98 aunque la
   5.99 ya estaba pusheada. Cargar el código ese día habría trabado a las 7.

   La versión viaja en `tareas_mias`, que corre en CADA apertura de la app, y se guarda en
   `PropertiesService` — NO en el CH: es telemetría operativa, no un dato de la persona, y una hoja
   nueva en el sheet maestro la leen también otras herramientas.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 "5.100" es MAYOR que "5.99" · comparar versiones como texto miente', () => {
  /* Es el defecto que haría que el semáforo diga verde cuando debía decir rojo. Como texto,
     "5.100" < "5.99" porque el '1' viene antes que el '9'. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({}), ['verAlMenos']);
  const casos = [
    ['5.100', '5.99',  true,  'la trampa: como texto diría que no'],
    ['5.99',  '5.100', false, 'y al revés'],
    ['6.00',  '5.99',  true,  'mayor mayor'],
    ['5.99',  '5.99',  true,  'iguales alcanza'],
    ['5.98',  '5.99',  false, 'una menos no alcanza'],
    ['6.0',   '5.99',  true,  'con distinta cantidad de partes'],
    ['5.9',   '5.10',  false, '5.9 es MENOR que 5.10'],
  ];
  casos.forEach(([tiene, min, esperado, porque]) => {
    PRUEBAS.igual(api.verAlMenos(tiene, min), esperado,
      '⚠️ «' + tiene + '» >= «' + min + '» debe ser ' + esperado + ' · ' + porque);
  });
});

PRUEBAS.caso('⚠️ el cliente manda su versión en el pedido que corre en cada apertura', () => {
  /* Sin esto no hay nada que contar. `tareasCargar` es la única llamada que ocurre siempre. */
  const src = String(tareasCargar);
  PRUEBAS.alMenos(src.length, 200, 'guarda de medibilidad: se leyó la función');
  PRUEBAS.cierto(/appVersion=/.test(src), '⚠️ la versión viaja en el pedido');
  PRUEBAS.cierto(/APP_VERSION/.test(src), 'y es la de verdad, no una escrita a mano');
});

PRUEBAS.caso('🔴 el semáforo dice VERDE sólo si nadie falta y de nadie falta el dato', () => {
  /* Una persona de la que no sabemos nada es exactamente la que puede quedar trabada: contarla
     como "lista" es lo que convertiría este semáforo en un adorno. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const nomina = [
    ['Helitec','Ana Suárez','V-1','Op','Piloto','F',35,'+58','a@e.com','Sí','','empleado','2'],
    ['Helitec','Luis Pena','V-2','Op','Piloto','M',40,'+58','l@e.com','Sí','','empleado','2'],
  ];
  const env = GS.crearEntorno({
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
               .concat(nomina),
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionTareasMias', 'accionMantenimiento', 'verAnotar']);
  const leer = (min) => {
    const t = (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
    return JSON.parse(api.accionMantenimiento({
      token: t, tarea: 'versiones', empresa: 'Helitec', minima: min }).getContent());
  };

  /* Nadie reportó todavía: de las dos no se sabe nada. */
  let r = leer('5.99');
  PRUEBAS.cierto(r.ok, 'guarda de medibilidad: la tarea responde · ' + JSON.stringify(r).slice(0,90));
  PRUEBAS.igual(r.versiones.enNomina, 2, 'guarda: ve a las dos personas de la nómina');
  PRUEBAS.igual(r.versiones.sinDatoTodavia, 2, 'de las dos no hay dato');
  PRUEBAS.falso(r.versiones.sePuedeApretar,
    '⚠️ ROJO · sin datos NO se puede apretar · quien no reportó es quien puede quedar trabado');

  /* Una reporta una versión vieja. */
  api.verAnotar('Helitec', 'V-1', '5.98');
  r = leer('5.99');
  PRUEBAS.igual(r.versiones.sinDatoTodavia, 1, 'ahora falta el dato de una sola');
  PRUEBAS.falso(r.versiones.sePuedeApretar, '⚠️ sigue ROJO: una vieja y una sin dato');

  /* Las dos, y una con versión MAYOR. */
  api.verAnotar('Helitec', 'V-1', '5.99');
  api.verAnotar('Helitec', 'V-2', '5.100');
  r = leer('5.99');
  PRUEBAS.igual(r.versiones.sinDatoTodavia, 0, 'ya no falta el dato de nadie');
  PRUEBAS.igual(r.versiones.faltan, 0, 'y ninguna está atrasada · incluida la 5.100');
  PRUEBAS.cierto(r.versiones.sePuedeApretar,
    '⚠️ VERDE · recién acá se puede cargar el código sin dejar a nadie afuera');
});

PRUEBAS.caso('el DISCRIMINADOR: con una atrasada vuelve a ROJO', () => {
  /* Sin esto, los verdes de arriba podrían venir de un semáforo que siempre dice que sí. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"],
               ['Helitec','Ana Suárez','V-1','Op','Piloto','F',35,'+58','a@e.com','Sí','','empleado','2'],
               ['Helitec','Luis Pena','V-2','Op','Piloto','M',40,'+58','l@e.com','Sí','','empleado','2']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionMantenimiento', 'verAnotar']);
  const t = (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
  api.verAnotar('Helitec', 'V-1', '6.00');
  api.verAnotar('Helitec', 'V-2', '5.98');       // ← una se quedó atrás
  const r = JSON.parse(api.accionMantenimiento({
    token: t, tarea: 'versiones', empresa: 'Helitec', minima: '5.99' }).getContent());
  PRUEBAS.igual(r.versiones.faltan, 1, '⚠️ cuenta la que falta');
  PRUEBAS.falso(r.versiones.sePuedeApretar, '⚠️ y NO deja apretar · el semáforo mide de verdad');
  PRUEBAS.cierto((r.versiones.cedulasQueFaltan || []).join(' ').indexOf('***') >= 0,
    'y la cédula va enmascarada · un diagnóstico no tiene por qué leerse como una lista');
});

PRUEBAS.caso('⚠️ anotar la versión nunca puede romper el pedido de la persona', () => {
  /* Es telemetría: si falla, falla en silencio. Lo que no puede pasar es que alguien no vea sus
     tareas porque no se pudo guardar un dato de diagnóstico. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function verAnotar[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 60, 'guarda: se encontró la función');
  PRUEBAS.cierto(/catch \(e\) \{\}/.test(fn), '⚠️ el fallo se traga · es telemetría, no el pedido');
  PRUEBAS.cierto(/if \(!v \|\| v\.length > 20\) return/.test(fn),
    'y una versión vacía o absurda no se guarda · no se inventa un dato');
});
