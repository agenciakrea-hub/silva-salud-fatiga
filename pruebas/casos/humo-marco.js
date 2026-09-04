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

PRUEBAS.caso('⚠️ un caso que nunca termina se reporta como falla, no cuelga la suite', async () => {
  /* EL DISCRIMINADOR DEL TOPE. Sin esta comprobación, el tope que agregué en `correr()` es una
     intención: nadie sabría si de verdad corta. Acá se le da una promesa que NO resuelve nunca —
     exactamente la forma del cuelgue real (un `throw` adentro de un setTimeout deja al `await`
     esperando un `resolve()` que ya no va a llegar) — y se exige que rechace.
     El 2026-09-03 esto colgó la suite entera dos veces: el panel se quedaba en "corriendo…" y se
     perdía el reporte de los 300 casos que YA habían pasado. */
  let corto = false, mensaje = '';
  try {
    await PRUEBAS._conTope(new Promise(() => {}), 60);
    corto = false;
  } catch (e) { corto = true; mensaje = e.message; }
  PRUEBAS.cierto(corto, 'una promesa que no resuelve nunca tiene que cortarse sola');
  PRUEBAS.cierto(/colgado/.test(mensaje),
    'y el mensaje tiene que decir por qué, para no mandar a buscar un bug de la app: "' + mensaje.slice(0, 70) + '"');

  /* Y el control: el tope no puede matar a un caso que sí termina. */
  let ok = false;
  try { ok = await PRUEBAS._conTope(new Promise(r => setTimeout(() => r(true), 10)), 300); }
  catch (e) { ok = false; }
  PRUEBAS.cierto(ok, 'un caso normal, que termina a tiempo, no lo puede tocar el tope');
});

PRUEBAS.caso('⚠️ igual() NO puede dar por iguales dos elementos del DOM distintos', () => {
  /* EL DISCRIMINADOR DE UN DEFECTO QUE VACIABA CINCO CASOS. `mismo()` caía al comparador profundo
     con cualquier par de objetos, y un elemento del DOM tiene todas sus propiedades en el
     prototipo: `Object.keys(el)` es `[]`, así que dos elementos cualesquiera serializaban a "{}" y
     daban iguales. Las cinco comprobaciones del atrapado de foco de L4 —todas de la forma
     `PRUEBAS.igual(document.activeElement, otroElemento)`— pasaban aunque se sacara el manejador
     de Tab del overlay entero.
     Se comprueba con el resultado del reporte, no llamando a la comparación interna: lo que
     importa es que un caso escrito así se ponga en ROJO. */
  const a = document.createElement('div'), b = document.createElement('div');
  const antes = PRUEBAS._actual.comprobaciones.length;
  PRUEBAS.igual(a, b, '(comprobación interna: dos divs distintos)');
  const anotada = PRUEBAS._actual.comprobaciones[antes];
  PRUEBAS._actual.comprobaciones.splice(antes, 1);          // se saca: era para inspeccionarla
  PRUEBAS._actual.ok = PRUEBAS._actual.comprobaciones.every(c => c.ok);
  PRUEBAS.falso(anotada.ok,
    '⚠️ dos elementos distintos NO son iguales; si esto pasa, todo assert de foco es decorativo');

  /* Y los controles, para que el arreglo no rompa lo que sí tenía que funcionar. */
  PRUEBAS.igual({ a:1, b:[2,3] }, { b:[2,3], a:1 }, 'los objetos planos se siguen comparando por valor');
  PRUEBAS.igual([1,2,3], [1,2,3], 'y los arrays');
  const uno = document.createElement('span');
  PRUEBAS.igual(uno, uno, 'y el MISMO elemento sigue siendo igual a sí mismo');
});
