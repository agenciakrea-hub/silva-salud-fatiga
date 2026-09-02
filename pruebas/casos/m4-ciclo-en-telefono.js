/* ── M4 · El bloque del ciclo entra en un teléfono ──────────────────────────────────────────────
   (2026-08-27)

   EL SÍNTOMA que reportó el usuario: "saliendo de ca…", "llegan…" — se veía un tercio del texto.

   LA CAUSA, y era un bug MÍO de J3: la app YA tenía un layout bueno para pantallas chicas (a
   ≤480 px `.cic-tramos` pasa a UNA columna y cada tramo pone el nombre a la izquierda y el valor
   a la derecha). En J3 agregué `.cic-mio-linea .cic-tramos { repeat(2,…) }` **sin media query**, y
   al ser más específica esa regla ganaba en todos los anchos y tapaba la de una columna.
   Medido a 390 px antes del arreglo: dos columnas de 160 px, y adentro el nombre recibía **48 px
   para un texto de 122**.

   No se arregló con un marquee: se dejó de tapar el layout que ya existía y ya estaba probado en
   la tarjeta del supervisor. */

PRUEBAS.grupo('M4 · el ciclo en pantalla chica');

function sembrarCiclo() {
  CTX.resetear({ nombre: 'Ana Prueba', cargo: 'Piloto', esPiloto: true });
  const hace = h => new Date(Date.now() - h * 3600000).toISOString();
  localStorage.setItem('silva_fatiga_ciclo_mio_v1', JSON.stringify([
    { evento: 'salida_casa', iso: hace(3) },
    { evento: 'llegada_aero', iso: hace(2), test: 'kss', resultado: 4 }
  ]));
  renderSections();
}

PRUEBAS.caso('ningún texto del ciclo queda cortado', () => {
  /* El caso que representa el reclamo. Se comparan ancho visible contra ancho real: es la única
     forma de detectar un texto cortado, porque con `text-overflow: ellipsis` la pantalla se ve
     "prolija" y el dato igual no está. */
  sembrarCiclo();
  const cortados = [];
  document.querySelectorAll('.cic-mio-linea .cic-tramo *').forEach(e => {
    if (e.children.length) return;
    const t = (e.textContent || '').trim();
    if (t.length < 4) return;
    if (e.scrollWidth > e.clientWidth + 1) {
      cortados.push((String(e.className).split(' ')[0] || e.tagName) + ': "' + t.slice(0, 26) +
        '" se ve ' + Math.round(e.clientWidth) + ' de ' + e.scrollWidth);
    }
  });
  PRUEBAS.igual(cortados, [],
    'con ellipsis la pantalla se ve prolija y el dato igual no está: la persona no sabe de qué tramo le hablan');
});

PRUEBAS.caso('en teléfono el ciclo va a UNA columna', () => {
  /* Es la regla que J3 tapaba. Se comprueba el resultado, no el CSS: lo que importa es cuántas
     columnas quedan a este ancho. */
  sembrarCiclo();
  const tramos = document.querySelector('.cic-mio-linea .cic-tramos');
  const cols = getComputedStyle(tramos).gridTemplateColumns.trim().split(/\s+/).length;
  PRUEBAS.cierto(window.innerWidth <= 480,
    'este caso vale para pantalla chica; si el panel corre más ancho, la comprobación de abajo no aplica');
  PRUEBAS.igual(cols, 1,
    'con dos columnas de 160 px el nombre del evento se queda con 48 px y se corta');
});

PRUEBAS.caso('el nombre del evento tiene lugar de verdad', () => {
  /* Antes: 48 px para un texto de 122. El número exacto no importa; lo que importa es que el
     espacio asignado alcance para lo que hay que mostrar. */
  sembrarCiclo();
  const top = document.querySelector('.cic-mio-linea .cic-tr-top');
  const desde = document.querySelector('.cic-mio-linea .cic-tr-desde');
  /* +1: `getBoundingClientRect().width` da un valor fraccionario (depende del hinting de fuente del
     sistema operativo) y `scrollWidth` da un entero redondeado — en Windows coincidían, en Linux el
     mismo texto midió 198.5 contra un `scrollWidth` de 199. No es que falte espacio de verdad: es el
     medio píxel de diferencia entre cómo cada SO redondea la misma tipografía. */
  PRUEBAS.alMenos(top.getBoundingClientRect().width + 1, desde.scrollWidth,
    'el espacio del nombre tiene que ser al menos lo que el nombre mide');
});

PRUEBAS.caso('los tiempos no se parten en dos renglones', () => {
  /* "1 h 00" / "min" partido en dos era parte de lo que se veía mal. */
  sembrarCiclo();
  const partidos = [];
  document.querySelectorAll('.cic-mio-linea .cic-tr-val').forEach(v => {
    const lh = parseFloat(getComputedStyle(v).lineHeight);
    const renglones = Math.round(v.getBoundingClientRect().height / lh);
    if (renglones > 1) partidos.push('"' + v.textContent.trim() + '" en ' + renglones + ' renglones');
  });
  PRUEBAS.igual(partidos, [], 'un tiempo partido en dos renglones se lee mal y descuadra la fila');
});

PRUEBAS.caso('no queda ninguna regla del empleado tapando el layout general', () => {
  /* Esta prueba decía otra cosa hasta M5. Verificaba que MI regla de dos columnas estuviera acotada
     con `@media (min-width: 481px)` — o sea, verificaba mi parche.
     En M5 el parche desapareció: `.cic-tramos` pasó a `repeat(auto-fit, minmax(185px, 1fr))`, que
     acomoda las columnas segun el ancho disponible y no necesita ningún caso especial para el
     empleado. Al desaparecer la regla, la prueba falló — correctamente, porque estaba escrita
     contra la implementación y no contra lo que importa.
     Lo que importa es esto: que no exista NINGUNA regla específica de `.cic-mio-linea` pisando las
     columnas, que es lo que causó el bug original. Escrito así, sigue valiendo aunque el layout se
     vuelva a cambiar. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  PRUEBAS.igual((fuente.match(/\.cic-mio-linea\s+\.cic-tramos\s*\{[^}]*grid-template-columns/g) || []).length, 0,
    'una regla propia del empleado sobre las columnas vuelve a ganarle a la general por especificidad');
});

PRUEBAS.caso('las columnas se acomodan solas al ancho', () => {
  /* El reemplazo tiene que servir en los DOS extremos: una sola columna en teléfono y varias en
     pantalla ancha, sin números elegidos a dedo. Acá se comprueba que el ancho real de cada tramo
     alcance para su contenido, que es la condición que el layout tiene que cumplir a cualquier
     ancho. */
  sembrarCiclo();
  const tramos = [...document.querySelectorAll('.cic-mio-linea .cic-tramo')];
  PRUEBAS.alMenos(tramos.length, 1, 'tiene que haber tramos dibujados');
  const angostos = tramos
    .filter(tr => tr.getBoundingClientRect().width < 100)
    .map(tr => Math.round(tr.getBoundingClientRect().width) + ' px');
  PRUEBAS.igual(angostos, [], 'una columna de menos de 100 px no alcanza para el nombre de ningún tramo');
});
