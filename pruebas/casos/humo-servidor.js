/* Prueba que la vía SERVIDOR funciona: que la suite compila el `.gs` REAL y puede ejecutar sus
   funciones contra un Sheets simulado. No pretende cubrir el endpoint — eso es L2b.

   El caso elegido es el de J3 (`accionTareasMias` devolviendo el plan del ciclo), porque es el
   que verifiqué a mano en esa sesión y el que hoy nadie garantiza que siga funcionando. */

PRUEBAS.grupo('Servidor (el .gs real)');

PRUEBAS.caso('el .gs compila y expone sus funciones', () => {
  PRUEBAS.cierto(CTX.hayGs, 'sin la fuente del endpoint no hay nada que probar acá');
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['accionTareasMias', 'leerConfigEmpresa']);
  PRUEBAS.cierto(typeof api.accionTareasMias === 'function',
    'si esto falla es que renombraron la función y hay pruebas que quedaron apuntando al vacío');
});

PRUEBAS.caso('GS_VERSION está declarada y con el formato acordado', () => {
  /* R9: es la única forma de saber si la copia publicada es la misma que la nuestra, porque el
     .gs no vive en git. Un formato distinto rompe esa comparación. */
  const m = /GS_VERSION\s*=\s*"(\d{4}-\d{2}-\d{2}\.\d+)"/.exec(CTX.gs);
  PRUEBAS.cierto(!!m, 'GS_VERSION tiene que existir y tener formato "AAAA-MM-DD.N" (R9)');
});

PRUEBAS.caso('formatearFecha respeta la zona horaria', () => {
  /* El emulador tiene que ser fiel en esto: L1 (el bug de zona horaria, todavía sin reproducir)
     se va a investigar justamente variando la zona. Un emulador que ignora la zona haría que ese
     bug sea invisible en las pruebas. */
  const d = new Date('2026-08-27T02:30:00Z');
  PRUEBAS.igual(GS.formatearFecha(d, 'America/Caracas', 'yyyy-MM-dd HH:mm'), '2026-08-26 22:30',
    'Caracas es UTC-4: las 02:30 UTC son las 22:30 del día ANTERIOR');
  PRUEBAS.igual(GS.formatearFecha(d, 'UTC', 'yyyy-MM-dd HH:mm'), '2026-08-27 02:30',
    'en UTC la misma marca de tiempo cae otro día — que es exactamente el riesgo de L1');
});

PRUEBAS.caso('la caché del emulador guarda de verdad (no es un stub vacío)', () => {
  /* Importa porque hay lógica que DEPENDE de que la caché funcione: el freno de fuerza bruta del
     login cuenta los intentos ahí. Con un stub que siempre devuelve null, esa lógica nunca se
     probaría y el freno podría estar roto sin que nadie se entere. */
  const env = GS.crearEntorno({});
  const c = env.CacheService.getScriptCache();
  c.put('intentos', '3');
  PRUEBAS.igual(c.get('intentos'), '3', 'sin caché real, el freno de fuerza bruta no se puede probar');
  PRUEBAS.igual(c.get('no-existe'), null, 'y una clave ausente tiene que dar null, no undefined');
});

PRUEBAS.caso('setNumberFormat queda registrado (R15)', () => {
  /* R15: Sheets reinterpreta solo lo que le escribís, y ya rompió tres veces. El emulador
     registra el formato para que L2b pueda comprobar que el endpoint lo aplica en CADA acceso. */
  const env = GS.crearEntorno({ Nomina: [['Nombre', 'Telefono'], ['Ana', '+58412']] });
  const hoja = env.__libro.getSheetByName('Nomina');
  hoja.getRange(2, 2).setNumberFormat('@');
  PRUEBAS.igual(hoja.__formatoDe(2, 2), '@',
    'si el emulador no registrara el formato, una prueba de R15 daría verde sin comprobar nada');
});
