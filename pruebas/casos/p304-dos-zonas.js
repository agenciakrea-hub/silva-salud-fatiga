PRUEBAS.grupo('P304 · el emulador modela dos zonas horarias');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   En producción el script corre en Buenos Aires (`appsscript.json`, UTC-3) y el CH está en Caracas
   (UTC-4). El emulador fijaba las dos al mismo valor —`opciones.zona` movía las dos juntas—, así
   que toda medición de un cambio de zona daba «0 diferencias» sin medir nada: un cero sin
   discriminador. Eso bloqueaba `P305` (las fechas en Caracas): no se podía escribir un solo caso.

   Desde P304, `GS.crearEntorno(hojas, { zonaScript, zonaLibro })` las separa. R19 · lo conceden
   `zonaDelScript_` y `zonaDelLibro_` de `pruebas/emulador-gs.js`, que leen `Session.getScriptTimeZone`
   y `getSpreadsheetTimeZone` del libro. `zona` sola sigue moviendo las dos, como antes.

   El caso entra por el `.gs` REAL (R17): `abrirMaestro()` es la puerta por la que el endpoint abre
   el CH. No afirma nada de `normFecha` ni de ninguna función de fechas del endpoint: eso es de
   `P305`, y un caso acá que lo afirmara bendeciría el defecto que `P305` viene a sacar.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* 2026-10-20 03:30 UTC = 23:30 del 19 en Caracas y 00:30 del 20 en Buenos Aires: un instante de borde. */
const P304_BORDE = '2026-10-20T03:30:00Z';
const P304_BA = 'America/Argentina/Buenos_Aires', P304_CCS = 'America/Caracas';

function p304Dias(opciones) {
  const env = GS.crearEntorno({ 'Config Empresa': [['Empresa', 'Clave', 'Valor']] }, opciones);
  const sonda = '\nfunction p304Sonda(iso) {\n' +
    '  var d = new Date(iso), libro = abrirMaestro();\n' +
    '  var zs = Session.getScriptTimeZone(), zl = libro.getSpreadsheetTimeZone();\n' +
    '  return { zonaScript: zs, zonaLibro: zl,\n' +
    '           diaScript: Utilities.formatDate(d, zs, "yyyy-MM-dd"), diaLibro: Utilities.formatDate(d, zl, "yyyy-MM-dd") };\n' +
    '}\n';
  const api = GS.cargarGs(CTX.gs + sonda, env, ['p304Sonda']);
  return api.p304Sonda(P304_BORDE);
}

PRUEBAS.caso('🔴 con zonas distintas, el script y el libro dan días distintos para un instante de borde', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const r = p304Dias({ zonaScript: P304_BA, zonaLibro: P304_CCS });
  PRUEBAS.igual(r.zonaScript, P304_BA, 'la zona del script es la que se pidió');
  PRUEBAS.igual(r.zonaLibro, P304_CCS, 'la zona del libro (el CH, por abrirMaestro) es la que se pidió');
  PRUEBAS.igual(r.diaScript, '2026-10-20', 'en Buenos Aires el instante ya es el 20');
  PRUEBAS.igual(r.diaLibro, '2026-10-19', 'en Caracas todavía es el 19');
});

PRUEBAS.caso('🔴 DISCRIMINADOR · con una sola zona (lo de antes de P304) los dos días coinciden', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* Si este caso diera días distintos, el de arriba no probaría nada: la diferencia vendría de otro
     lado y no de las dos zonas. Y si el emulador volviera a fijar las dos al mismo valor, el de
     arriba se pondría en rojo. */
  const una = p304Dias({ zona: P304_CCS });
  PRUEBAS.igual([una.zonaScript, una.zonaLibro], [P304_CCS, P304_CCS], '`zona` sola mueve las dos, como antes');
  PRUEBAS.igual(una.diaScript, una.diaLibro, 'con una sola zona no hay diferencia que medir');
  /* P305 · sin opciones, las de PRODUCCIÓN: el script en Buenos Aires y el libro en Caracas. Hasta
     P305 el libro caía en la del script (BA/BA): con el endpoint fechando en Caracas, eso armaba celdas
     `Date` a la medianoche de Buenos Aires, que en el CH real no existen. */
  const def = p304Dias({});
  PRUEBAS.igual([def.zonaScript, def.zonaLibro], [P304_BA, P304_CCS], 'sin opciones, las de producción: script en Buenos Aires, libro en Caracas');
});
