
PRUEBAS.grupo('P4 · en computadora la tira va del lado azul');

/* LO QUE SE PIDIÓ: "lo de 'abajo de administrador' era sólo para celular. En computadora va en la
   columna azul, que además hoy tiene 207 px de vacío abajo."
   Medido antes de tocar nada, a 1366x768: `.splash-brand` (la columna azul, con el logo y el
   título) terminaba en y=561 y el fondo de `.splash-wrap` estaba en 768 — 207 px de navy vacío,
   mientras la tira vivía del otro lado, en la columna clara, debajo de Administrador. */

/* Anchos de escritorio a comprobar. 900 es el punto EXACTO donde `@media (min-width:900px)` pasa
   de una columna a dos — el plan lo pidió por nombre, y ahí apareció el hallazgo de abajo. 899 es
   el vecino inmediato en el lado de celular, para comprobar que ahí no cambia nada. */
const P4_ANCHOS = [[899, 700], [900, 700], [900, 660], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]];

PRUEBAS.caso('⚠️ la tira vive en la columna azul, no en la clara, en todo ancho de escritorio', () => {
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  for (const [w, h] of P4_ANCHOS) {
    PRUEBAS.enVentana(w, h, () => {
      const brand = document.querySelector('.splash-brand');
      if (getComputedStyle(brand).display !== 'flex') return;   // por debajo de 900: no aplica
      const tira = document.getElementById('splashAnim');
      const b = tira.getBoundingClientRect();
      if (b.x >= w / 2) malos.push(w + 'x' + h + ': la tira está del lado claro (x=' + Math.round(b.x) + ')');
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(malos, [],
    'en escritorio la columna azul es la del logo y el título: la tira tiene que estar ahí, no del ' +
    'lado de la tarjeta clara donde vivía antes');
});

PRUEBAS.caso('⚠️ la tira queda pegada al bloque de texto, sin el vacío que se reportó', () => {
  /* El reclamo no era sólo "en qué columna": era que esa columna quedaba con 207 px vacíos. Que la
     tira esté del lado azul no alcanza si igual sobra un hueco entre el título y la tira. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const huecos = [];
  for (const [w, h] of [[1024, 768], [1366, 768], [1920, 1080]]) {
    PRUEBAS.enVentana(w, h, () => {
      const brand = document.querySelector('.splash-brand').getBoundingClientRect();
      const tira = document.getElementById('splashAnim').getBoundingClientRect();
      const hueco = Math.round(tira.top - brand.bottom);
      if (Math.abs(hueco) > 4) huecos.push(w + 'x' + h + ': ' + hueco + 'px entre el título y la tira');
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(huecos, [],
    'la tira arranca donde termina el bloque de texto: eran 207 px de navy vacío y pasan a 0');
});

PRUEBAS.caso('⚠️ el splash no se recorta en el punto exacto donde cambia de una columna a dos', () => {
  /* ⚠️ ESTO NO LO PROVOCÓ MOVER LA TIRA: ya pasaba antes, del lado que fuera. `.splash-wrap` traía
     un `padding-top` de 104 px pensado para reservarle lugar al logo y al botón de idioma anclados
     en CELULAR. En escritorio el logo entra al flujo y el botón de idioma es chico, así que ese
     relleno es puro espacio muerto — casi siempre sobra sin que se note, pero a 900x700 (el punto
     que el plan pidió comprobar) empujaba la grilla 8 px más allá del alto disponible y
     `.splash-wrap` los recortaba, porque tiene `overflow:hidden`.
     Se comprobó apagando el relleno con el ancho en 899 (celular, con y sin la tira) y confirmando
     que el recorte desaparecía en los tres casos por igual: no era del lado de la tira, era del
     relleno. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const cortados = [];
  for (const [w, h] of P4_ANCHOS) {
    PRUEBAS.enVentana(w, h, () => {
      const wrap = document.querySelector('.splash-wrap');
      const sobra = wrap.scrollHeight - wrap.clientHeight;
      if (sobra > 1) cortados.push(w + 'x' + h + ': ' + sobra + 'px');
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(cortados, [], 'nada del splash puede quedar recortado, en ningún ancho de escritorio');
});

PRUEBAS.caso('la tira arranca en el mismo borde izquierdo que el título', () => {
  /* Es lo que hacía el selector `.splash-brand .splash-anim-slide` cuando se escribió, pero ya no
     alcanzaba a nada: la tira nunca fue descendiente de `.splash-brand` en el marcado —son
     hermanos dentro de la grilla—, así que esa regla quedó viva en el CSS sin tocar ningún
     elemento real. Quedaba centrada por el `justify-content:center` de base, pensado para el
     celular. Se comprueba con el borde de verdad, no con el selector. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const desalineados = [];
  for (const [w, h] of [[1024, 768], [1366, 768], [1920, 1080]]) {
    PRUEBAS.enVentana(w, h, () => {
      const h1 = document.querySelector('.splash-h1').getBoundingClientRect();
      const tarjeta = document.querySelector('#splashAnimTrack .spl-p');
      if (!tarjeta) return;
      const diff = Math.round(tarjeta.getBoundingClientRect().x - h1.x);
      if (Math.abs(diff) > 2) desalineados.push(w + 'x' + h + ': ' + diff + 'px de diferencia');
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(desalineados, [], 'el borde izquierdo de la tarjeta y el del título tienen que coincidir');
});

PRUEBAS.caso('en celular la tira sigue centrada, abajo de todo: esto era sólo para escritorio', () => {
  /* El pedido fue explícito: "lo de 'abajo de administrador' era SÓLO para celular". Todo lo de
     arriba vive adentro de `@media (min-width:900px)`; este caso comprueba que celular no cambió. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const m = PRUEBAS.enVentana(390, 844, () => {
    const tira = document.getElementById('splashAnim').getBoundingClientRect();
    const pie = document.querySelector('.splash-pie').getBoundingClientRect();
    const wrap = document.querySelector('.splash-wrap');
    return {
      abajoDelPie: tira.top >= pie.bottom - 1,
      centrada: Math.abs((tira.left + tira.right) / 2 - 195) < 10,
      recorte: wrap.scrollHeight - wrap.clientHeight
    };
  });
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.cierto(m.abajoDelPie, 'en celular la tira sigue debajo del pie, incluido Administrador');
  PRUEBAS.cierto(m.centrada, 'y sigue centrada, no pegada a un borde como en escritorio');
  PRUEBAS.comoMucho(m.recorte, 1, 'sin recorte en celular');
});
