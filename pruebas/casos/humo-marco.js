/* El marco probándose a sí mismo.
   Existe por una razón concreta: en este proyecto ya hubo una suite que **daba verde sin probar
   nada** (está en las notas: cinco tests pasaban en la base de desarrollo sin ejercitar el código).
   Si el marco tiene un error y todo da verde siempre, el resto de la suite es decoración.
   Así que acá se comprueba que el marco sepa DETECTAR una falla, no sólo declararla. */

PRUEBAS.grupo('El marco funciona');

PRUEBAS.caso('igual() compara por valor, no por identidad', () => {
  PRUEBAS.igual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }, 'casi todo lo que se compara son objetos; con === daría falso siempre');
  PRUEBAS.igual({ b: 2, a: 1 }, { a: 1, b: 2 }, 'el orden de las claves no es información: no debe hacer fallar un caso');
});

PRUEBAS.caso('el marco DETECTA una falla (si no, todo da verde en falso)', () => {
  /* Se corre un mini-marco aparte para no ensuciar el reporte real con una falla a propósito. */
  const guardado = { casos: PRUEBAS._casos, actual: PRUEBAS._actual, grupo: PRUEBAS._grupo };
  PRUEBAS._casos = [];
  PRUEBAS._actual = { grupo: 'x', nombre: 'x', ok: true, comprobaciones: [], error: null };
  PRUEBAS.igual(1, 2, 'esto TIENE que fallar');
  const detecto = PRUEBAS._actual.ok === false;
  const detalle = PRUEBAS._actual.comprobaciones[0];
  PRUEBAS._casos = guardado.casos; PRUEBAS._actual = guardado.actual; PRUEBAS._grupo = guardado.grupo;

  PRUEBAS.cierto(detecto, 'un marco que no marca rojo cuando algo está mal no sirve para nada');
  PRUEBAS.igual(detalle.esperaba, 2, 'el reporte tiene que decir qué se esperaba');
  PRUEBAS.igual(detalle.obtuvo, 1, 'y qué se obtuvo — un booleano suelto obliga a abrir el código');
});

PRUEBAS.caso('alMenos() guarda el número real, no sólo si pasó', () => {
  const guardado = PRUEBAS._actual;
  PRUEBAS._actual = { grupo: 'x', nombre: 'x', ok: true, comprobaciones: [], error: null };
  PRUEBAS.alMenos(7.25, 4.5, 'contraste');
  const c = PRUEBAS._actual.comprobaciones[0];
  PRUEBAS._actual = guardado;
  PRUEBAS.igual(c.obtuvo, 7.25, 'cuando algo queda apenas arriba del mínimo hay que poder verlo, no sólo saber que pasó');
});
