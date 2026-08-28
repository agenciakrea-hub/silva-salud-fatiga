/* ── M6 · El piloto también manda el WhatsApp ───────────────────────────────────────────────────
   (decisión del usuario, 2026-08-27)

   Antes había una rama `if (esPiloto)` que se saltaba el WhatsApp, de junio. El problema no era
   la rama en sí, sino que **la app decía otra cosa**: el encabezado de Data Operacional promete
   "avisa por WhatsApp" y las 8 tarjetas de Sensaciones dicen "luego a WhatsApp" — y para un piloto
   las dos cosas eran falsas. Se eligió alinear el comportamiento con lo que el texto promete.

   Estos casos existen porque esto se rompe en silencio: si alguien vuelve a meter una condición,
   o toca el teléfono, no hay ningún error — simplemente los reportes dejan de llegar a EVA y nadie
   se entera hasta que alguien los reclama. Que es exactamente lo que pasó. */

PRUEBAS.grupo('M6 · WhatsApp al terminar un test');

/* La forma real del estado de cada test es { item, answers: [...] }. La primera versión de este
   caso se la inventó (`ratings`, `valor`) y los 6 fallaron con "cannot read 'reduce'" — era la
   prueba la que estaba mal, no el código. */
const FINALES = [
  ['finalizarTest', () => { testItem = { id: 'sen_depresion' }; testRespuestas = ['1', '2', '3', '4', '5', '6', '0', '1', '2']; finalizarTest(); }],
  ['finalizarEstres', () => { estresState = { item: { id: 'sen_estres' }, answers: ['1', '2', '3', '4', '5', '6', '0', '1', '2', '3'] }; finalizarEstres(); }],
  ['finalizarAnsiedad', () => { ansiedadState = { item: { id: 'sen_ansiedad' }, answers: ['1', '2', '3', '0', '1', '2', '3'] }; finalizarAnsiedad(); }],
  ['finalizarGastro', () => { gastroState = { item: { id: 'sen_malestar' }, answers: ['1', '2', '0', '1', '2'] }; finalizarGastro(); }],
  ['finalizarCansancio', () => { cansancioState = { item: { id: 'sen_cansancio' }, answers: ['1', '2', '3', '4', '5'] }; finalizarCansancio(); }],
  ['finalizarPerelli', () => { perelliState = { item: { id: 'sen_fatiga' }, answers: ['Crucero', '3', 'ninguno', '2', '4', 'ninguno', '3', ''] }; finalizarPerelli(); }],
  ['finalizarKss', () => { kssState = { item: { id: 'sen_somnolencia' }, answers: ['Crucero', '4', '7', 'Diurna', ''] }; finalizarKss(); }]
];

function terminarTest(fn, perfilExtra) {
  CTX.resetear(Object.assign({ nombre: 'Ana Prueba', cargo: 'Piloto', esPiloto: true }, perfilExtra || {}));
  const abiertos = [];
  const oOpen = window.open, oFetch = window.fetch;
  window.open = u => { abiertos.push(String(u)); return null; };
  window.fetch = () => new Promise(() => {});   // nada sale a la red
  let error = null;
  try { fn(); } catch (e) { error = e.message; }
  window.open = oOpen; window.fetch = oFetch;
  return { abiertos: abiertos, error: error };
}

PRUEBAS.caso('los 7 tests abren el WhatsApp de EVA siendo piloto', () => {
  const fallan = [];
  FINALES.forEach(([nombre, fn]) => {
    const r = terminarTest(fn);
    if (r.error) { fallan.push(nombre + ' lanzó: ' + r.error); return; }
    if (r.abiertos.length !== 1) { fallan.push(nombre + ' abrió ' + r.abiertos.length + ' ventanas'); return; }
    if (r.abiertos[0].indexOf('584129089379') < 0) fallan.push(nombre + ' no fue al WhatsApp de EVA');
  });
  PRUEBAS.igual(fallan, [],
    'si alguno deja de abrirlo, los reportes de esa persona dejan de llegar y no hay ningún error que lo avise');
});

PRUEBAS.caso('el que NO es piloto sigue igual que siempre', () => {
  /* El contrapeso: el cambio era para sumar a los pilotos, no para alterar a los demás. */
  const r = terminarTest(FINALES[0][1], { esPiloto: false, cargo: 'Camillero' });
  PRUEBAS.igual(r.error, null, 'no puede lanzar');
  PRUEBAS.igual(r.abiertos.length, 1, 'quien no es piloto siempre mandó el WhatsApp, y tiene que seguir haciéndolo');
});

PRUEBAS.caso('el mensaje viaja dentro del enlace', () => {
  /* Abrir WhatsApp sin el reporte adentro sería peor que no abrirlo: la persona creería que lo
     mandó. */
  const r = terminarTest(FINALES[1][1]);   // estrés
  const texto = decodeURIComponent(r.abiertos[0] || '');
  PRUEBAS.cierto(texto.indexOf('Test de Estr') > 0, 'el nombre del test tiene que ir en el mensaje');
  PRUEBAS.alMenos(texto.length, 120, 'y el detalle de las respuestas, no sólo el título');
});

PRUEBAS.caso('la tarjeta queda marcada como hecha', () => {
  /* El WhatsApp es el aviso; la marca es el registro. Si se abriera WhatsApp pero no se marcara,
     la app le volvería a pedir el test a alguien que ya lo hizo. */
  const r = terminarTest(FINALES[4][1]);   // cansancio
  PRUEBAS.igual(r.error, null, 'sin errores');
  let hechos = {};
  try { hechos = JSON.parse(localStorage.getItem('silva_fatiga_reports_v1') || '{}'); } catch (e) {}
  PRUEBAS.cierto('sen_cansancio' in hechos,
    'tiene que quedar registrado además de avisado: si no, la app vuelve a pedir el mismo test');
});

PRUEBAS.caso('ya no queda ninguna rama que saltee el WhatsApp por ser piloto', () => {
  /* Se comprueba sobre el código, no sobre el comportamiento: es lo que evita que alguien
     reintroduzca la condición en UNA sola de las siete y nadie lo note. */
  const fuente = FINALES.map(([n]) => window[n].toString()).join('\n');
  PRUEBAS.falso(/esPiloto/.test(fuente),
    'ninguna de las 7 puede volver a decidir por perfil: la decisión vive en testCerrarYAvisar');
  PRUEBAS.cierto(FINALES.every(([n]) => /testCerrarYAvisar/.test(window[n].toString())),
    'las 7 tienen que pasar por la MISMA función, o vuelven a poder desincronizarse');
});
