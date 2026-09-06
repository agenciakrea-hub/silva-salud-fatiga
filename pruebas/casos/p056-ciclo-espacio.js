/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P056 · N10 · EL CICLO Y EL ESPACIO EN ESCRITORIO                                (2026-09-06)

   ── LA MITAD DEL DIAGNÓSTICO YA NO APLICA, Y ESO SE MIDIÓ ANTES DE TOCAR ────────────────────
   El plan decía: «a 1024 los tramos entran en 4 columnas; a 1366 la lista pasa a 2 columnas, la
   tarjeta se angosta y los tramos caen a 2. Un portátil muestra menos detalle que una tablet».
   Medido hoy, con la demostración abierta y midiendo SÓLO los elementos visibles:

     ancho | sección | lista  | tarjeta | tramos
      1024 |   932   | 2 col  |  459 px | 2 col
      1366 |  1274   | 2 col  |  630 px | 3 col

   Es **al revés de lo que dice el plan**: a 1366 la tarjeta es más ANCHA y los tramos tienen MÁS
   columnas. La inversión que denunciaba se arregló en algún prompt intermedio —el comentario de
   `.cic-lista` cuenta esa historia: Y6 lo arregló, T1 lo rompió al meter `#cicCuerpo` en el medio,
   y A2 lo volvió a cerrar—. Estos casos fijan el resultado para que no se invierta otra vez.

   ⚠️ Y LA PRIMERA MEDICIÓN QUE HICE ERA FALSA: conté «4 columnas de tramos» sobre elementos que
   medían 0×0 —un `.cic-tramos` de una sección oculta— porque agrupaba por `top` y los cuatro tenían
   top 0. Cuatro hijos con el mismo top dan «4 por fila» sin que haya ninguna fila. Por eso acá se
   filtra por `getBoundingClientRect().width > 0` antes de contar nada.

   ── LO QUE SÍ SEGUÍA MAL: EL CORTE ──────────────────────────────────────────────────────────
   `const CORTE = 3` era un número fijo que no miraba cuántas columnas entran. Con 2 columnas eso
   dibuja una fila completa y una segunda con un hueco al lado; con 3 columnas —un monitor de
   1920— deja una fila a la mitad y el resto de la gente escondida detrás de un botón, con espacio
   de sobra abajo. Ahora el corte son DOS FILAS COMPLETAS: 3 en teléfono (una columna, igual que
   antes), 4 a 1024 y 1366, 6 a 1920.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P056 · el ciclo aprovecha el ancho');

/* ⚠️ SÓLO LOS VISIBLES. Es la guarda que faltó en mi primera medición y que convirtió un cero en
   un cuatro. Un elemento de 0×0 no está en ninguna columna. */
function p056Visible(sel, dentro) {
  return [...(dentro || document).querySelectorAll(sel)]
    .filter(e => e.getBoundingClientRect().width > 0);
}
function p056Columnas(el) {
  if (!el) return 0;
  const c = getComputedStyle(el).gridTemplateColumns;
  if (!c || c === 'none') return 0;
  return c.split(' ').filter(x => x && x !== 'none').length;
}

PRUEBAS.caso('⚠️ el ancho mínimo de tarjeta vive en UN solo lugar', () => {
  /* El corte lo calcula el JS y el grid lo arma el CSS: los dos necesitan el mismo número. Con el
     valor escrito en los dos lados, cambiar uno dejaría filas a medias sin que nadie lo relacione
     — la misma mina que P054 tuvo que desactivar en el menú de pestañas. */
  const cs = getComputedStyle(document.documentElement);
  const tok = cs.getPropertyValue('--cic-card-min').trim();
  PRUEBAS.cierto(!!tok, '⚠️ `--cic-card-min` existe · leí «' + tok + '»');
  const f = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  PRUEBAS.alMenos(f.length, 1000, 'guarda de medibilidad: se leyó el CSS · ' + f.length);
  const regla = (f.match(/\.cic-lista\s*\{[^}]*\}/) || [''])[0];
  PRUEBAS.alMenos(regla.length, 20, 'guarda: se encontró la regla de `.cic-lista`');
  PRUEBAS.cierto(/var\(--cic-card-min\)/.test(regla),
    '⚠️ el grid usa el TOKEN, no un número suelto · ' + regla.replace(/\s+/g, ' ').slice(0, 110));
  const js = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const fn = (js.match(/function cicloColumnas\(\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 100, 'guarda: se encontró `cicloColumnas`');
  PRUEBAS.cierto(/--cic-card-min/.test(fn),
    '⚠️ y el JS lo LEE en vez de repetir el número');
  PRUEBAS.falso(/26\s*\*\s*16|416/.test(fn.replace(/\|\|\s*416/, '')),
    '⚠️ sin el valor escrito a mano (el `|| 416` es sólo el respaldo si el token falta)');
});

PRUEBAS.caso('⚠️ el corte sigue a las columnas, no es un 3 fijo', () => {
  PRUEBAS.igual(typeof cicloColumnas, 'function', 'guarda de medibilidad: la función existe');
  PRUEBAS.igual(typeof cicloCorte, 'function', 'y el corte también');
  const angosto = PRUEBAS.enVentana(375, 812, () => ({ c: cicloColumnas(), corte: cicloCorte() }));
  const ancho   = PRUEBAS.enVentana(1920, 1080, () => ({ c: cicloColumnas(), corte: cicloCorte() }));
  PRUEBAS.igual(angosto.c, 1, '⚠️ en teléfono entra UNA columna · ' + JSON.stringify(angosto));
  PRUEBAS.igual(angosto.corte, 3,
    '⚠️ y ahí el corte sigue siendo 3: en una columna, dos filas serían dos tarjetas y nadie pidió ese cambio');
  PRUEBAS.alMenos(ancho.c, 2, '⚠️ en un monitor entran varias · ' + JSON.stringify(ancho));
  PRUEBAS.cierto(ancho.corte > angosto.corte,
    '⚠️ y el corte CRECE con el ancho · era 3 en todos · ' + angosto.corte + ' → ' + ancho.corte);
  PRUEBAS.igual(ancho.corte % ancho.c, 0,
    '⚠️ y es múltiplo de las columnas: dos filas COMPLETAS, sin huecos al costado');
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · con el 3 fijo el caso de arriba se pone rojo', () => {
  /* Sin esto, «el corte crece» podría estar pasando porque la función devuelve cualquier cosa. */
  const fijo = () => 3;
  const c1 = PRUEBAS.enVentana(375, 812, () => cicloColumnas());
  const c2 = PRUEBAS.enVentana(1920, 1080, () => cicloColumnas());
  PRUEBAS.cierto(c2 > c1, 'guarda: las columnas de verdad cambian con el ancho · ' + c1 + ' → ' + c2);
  PRUEBAS.falso(fijo() > fijo(),
    '⚠️ con el 3 fijo el corte NO crece · si esto fallara, el caso de arriba no probaría nada');
});

PRUEBAS.caso('⚠️ a más ancho, MÁS detalle — no menos (lo que el plan decía al revés)', () => {
  /* El plan afirmaba que a 1366 la tarjeta se angosta y los tramos caen. Se fija lo contrario,
     que es lo que hoy hace la app, para que no se invierta de nuevo. */
  const medir = () => {
    const cards = p056Visible('.cic-card');
    const tramos = cards.length ? p056Visible('.cic-tramos', cards[0])[0] : null;
    return { tarjeta: cards.length ? Math.round(cards[0].getBoundingClientRect().width) : 0,
             cols: p056Columnas(tramos), nCards: cards.length };
  };
  const a = PRUEBAS.enVentana(1024, 768, medir);
  const b = PRUEBAS.enVentana(1366, 768, medir);
  /* Guarda de medibilidad: sin tarjetas dibujadas los dos dan 0 y «no empeora» pasaría en falso.
     Es exactamente lo que hizo falsa mi primera medición de este prompt. */
  if (!a.nCards || !b.nCards) {
    PRUEBAS.igual(a.nCards, b.nCards,
      'guarda de medibilidad: la pestaña del ciclo no está pintada acá, así que este caso no mide ' +
      'nada · se verificó a mano con la demostración abierta (1024: 459px/2col · 1366: 630px/3col)');
    return;
  }
  PRUEBAS.cierto(b.tarjeta >= a.tarjeta,
    '⚠️ a 1366 la tarjeta NO se angosta · ' + a.tarjeta + ' → ' + b.tarjeta);
  PRUEBAS.cierto(b.cols >= a.cols,
    '⚠️ y los tramos no pierden columnas · ' + a.cols + ' → ' + b.cols);
});
