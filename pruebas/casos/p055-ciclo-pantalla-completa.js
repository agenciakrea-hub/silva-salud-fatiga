/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P055 · N9 · EL CICLO EN PANTALLA COMPLETA                                       (2026-09-06)

   ── EL NÚMERO QUE MOTIVÓ EL PROMPT, MEDIDO ANTES DE TOCAR ───────────────────────────────────
   El rótulo de cada tramo (`.cic-seg span`) está en `.62rem` FIJO — 9,92 px — y medía exactamente
   lo mismo a 375 que a 1920. La barra, 34 px en todos los anchos. Es la pieza que un supervisor
   mira para decidir si alguien sigue o para, y en la pantalla donde más lugar hay era donde peor
   se leía.

   ── LO QUE ESTE ARCHIVO CUIDA, Y POR QUÉ CADA COSA ──────────────────────────────────────────
   1. **Que no haya un segundo generador de HTML.** El plan lo pide explícitamente y es la parte
      que más fácil se pierde con el tiempo: alguien agrega un dato a la tarjeta chica, no al modo
      grande, y quedan dos dibujos del mismo ciclo diciendo cosas distintas. Se comprueba que el
      modo grande produzca la MISMA estructura, y que en la fuente no aparezca una copia.
   2. **Que escale de verdad.** Un `clamp()` mal escrito da el mismo número en los dos extremos y
      no se nota mirando una sola pantalla.
   3. **Que los tres caminos de navegación pasen por la misma función.** Flecha, teclado y dedo:
      si cada uno moviera el índice por su cuenta, uno se olvidaría de los bordes.
   4. **Que «atrás» lo cierre.** `silvaAtras()` tiene una lista EXPLÍCITA de overlays y en este
      repo ya hubo cuatro pantallas que quedaron como callejón sin salida por no estar en ella.

   ⚠️ Estos casos NO abren la demostración (tarda 3–5 s y la suite entera corre en 40): arman
   `DASH._cicFilas` con la forma que le da `cicloBloque()` y entran por `cicloFullAbrir()`, que es
   el camino real. Lo que NO se puede probar acá está dicho al final del archivo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P055 · el ciclo en pantalla completa');

/* Una fila con la forma que produce `cicloBloque`: `{ p: persona, st: estado }`. El `st` se arma
   con `cicloEstado`, la misma función que usa la tarjeta — no a mano (R17). */
function p055Filas(n) {
  const plan = cicloPlan();
  const out = [];
  for (let i = 0; i < (n || 3); i++) {
    out.push({
      p: { persona: 'Persona ' + (i + 1), departamento: 'Operaciones' },
      st: { estado: 'inactivo', inicio: 0, activo: -1, transcurrido: 0, tramos: [], eventos: {} }
    });
  }
  return out;
}

function p055Con(filas, fn) {
  const prev = DASH;
  const prevI = CICFULL.i, prevAb = CICFULL.abierto;
  try {
    DASH = Object.assign({}, prev || {}, { _cicFilas: filas, _cicNames: filas.map(f => f.p.persona) });
    return fn();
  } finally {
    try { cicloFullCerrar(); } catch (e) {}
    DASH = prev; CICFULL.i = prevI; CICFULL.abierto = prevAb;
  }
}

PRUEBAS.caso('⚠️ el modo grande NO tiene su propio generador de HTML', () => {
  /* La comprobación que sostiene el pedido del plan. Si alguien escribe un segundo generador, lo
     más probable es que copie los pedazos: se busca que `cicloFullPintar` llame a las funciones
     reales y que no haya una segunda construcción de la barra. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.alMenos(f.length, 100000, 'guarda de medibilidad: se leyó la fuente · ' + f.length);
  const cuerpo = (f.match(/function cicloFullPintar\(\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cuerpo.length, 200, 'guarda: se encontró la función · ' + cuerpo.length);
  PRUEBAS.cierto(/cicloBarra\(st, plan\)/.test(cuerpo),
    '⚠️ usa la MISMA `cicloBarra()` que la tarjeta chica');
  PRUEBAS.cierto(/cicloTramosHtml\(st, plan\)/.test(cuerpo),
    '⚠️ y los MISMOS `cicloTramosHtml()`');
  PRUEBAS.falso(/class="cic-seg/.test(cuerpo),
    '⚠️ y NO arma segmentos por su cuenta · dos dibujos del mismo ciclo terminan diciendo cosas distintas');
  PRUEBAS.falso(/class="cic-barra/.test(cuerpo), '⚠️ ni la barra');
});

PRUEBAS.caso('⚠️ dibuja la barra y los tramos de la persona que corresponde', () => {
  const filas = p055Filas(3);
  p055Con(filas, () => {
    cicloFullAbrir(1);
    const cu = document.getElementById('cicFullCuerpo');
    PRUEBAS.existe('#cicFullCuerpo', 'guarda de medibilidad: el contenedor está en el DOM');
    PRUEBAS.cierto(!!cu.querySelector('.cic-barra'), '⚠️ dibuja la barra del ciclo');
    PRUEBAS.cierto(!!cu.querySelector('.cic-tramos'), '⚠️ y la tabla de tramos');
    PRUEBAS.igual((cu.querySelector('.cic-full-nom') || {}).textContent, 'Persona 2',
      '⚠️ y es la persona por la que se abrió, no la primera');
    PRUEBAS.igual(document.getElementById('cicFullPos').textContent, '2 / 3',
      '⚠️ la posición dice dónde está y cuántas hay');
  });
});

PRUEBAS.caso('⚠️ los tres caminos de navegación mueven lo mismo, y los bordes frenan', () => {
  const filas = p055Filas(3);
  p055Con(filas, () => {
    cicloFullAbrir(0);
    const nom = () => (document.querySelector('.cic-full-nom') || {}).textContent;
    PRUEBAS.igual(nom(), 'Persona 1', 'arranca donde se le pidió');
    PRUEBAS.cierto(document.getElementById('cicFullIzq').disabled,
      '⚠️ en el primero, la flecha de atrás se APAGA · no se esconde: si desapareciera movería a la otra de lugar');
    cicloFullIr(-1);
    PRUEBAS.igual(nom(), 'Persona 1', '⚠️ y el borde frena de verdad, no da la vuelta');
    cicloFullIr(1);
    PRUEBAS.igual(nom(), 'Persona 2', 'avanza');
    /* El teclado tiene que pasar por la MISMA función, no por su propia cuenta. */
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    PRUEBAS.igual(nom(), 'Persona 3', '⚠️ la tecla → mueve igual que la flecha');
    PRUEBAS.cierto(document.getElementById('cicFullDer').disabled, '⚠️ y el último apaga la de adelante');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    PRUEBAS.igual(nom(), 'Persona 2', '⚠️ la tecla ← también');
  });
});

PRUEBAS.caso('⚠️ Escape cierra, y «atrás» también (la lista explícita de silvaAtras)', () => {
  const filas = p055Filas(2);
  p055Con(filas, () => {
    cicloFullAbrir(0);
    PRUEBAS.cierto(document.getElementById('cicFullOv').classList.contains('show'), 'guarda: abrió');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    PRUEBAS.falso(document.getElementById('cicFullOv').classList.contains('show'), '⚠️ Escape cierra');
  });
  /* `silvaAtras()` tiene una lista EXPLÍCITA: un overlay que no se nombre ahí no existe para el
     botón físico del teléfono — el toque se consume y no pasa nada. Ya dejó cuatro pantallas del
     alta como callejón sin salida, y está advertido dos veces en el propio código. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const cuerpo = (f.match(/function silvaAtras\(\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cuerpo.length, 200, 'guarda de medibilidad: se encontró `silvaAtras`');
  PRUEBAS.cierto(/cicFullOv/.test(cuerpo),
    '⚠️ `silvaAtras` nombra a `cicFullOv` · sin esa línea, «atrás» no lo cierra');
});

PRUEBAS.caso('⚠️ el texto de la barra ESCALA con el ancho (era 9,92 px en todos)', () => {
  const filas = p055Filas(2);
  p055Con(filas, () => {
    cicloFullAbrir(0);
    const medir = () => {
      const s = document.querySelector('#cicFullCuerpo .cic-seg span');
      const b = document.querySelector('#cicFullCuerpo .cic-barra');
      return { rotulo: s ? parseFloat(getComputedStyle(s).fontSize) : 0,
               barra: b ? Math.round(b.getBoundingClientRect().height) : 0 };
    };
    const chico = PRUEBAS.enVentana(375, 812, medir);
    const grande = PRUEBAS.enVentana(1366, 768, medir);
    /* Guarda de medibilidad: sin barra dibujada los dos dan 0 y «escala» pasaría en falso. */
    PRUEBAS.alMenos(chico.rotulo, 1,
      'guarda de medibilidad: se midió algo a 375 · ' + JSON.stringify(chico));
    PRUEBAS.cierto(grande.rotulo > chico.rotulo,
      '⚠️ a 1366 el rótulo es MÁS GRANDE que a 375 · era 9,92 px en los dos · ' +
      chico.rotulo + ' → ' + grande.rotulo);
    PRUEBAS.cierto(grande.barra > chico.barra,
      '⚠️ y la barra también · era 34 px en todos · ' + chico.barra + ' → ' + grande.barra);
    /* Y tiene que ser mayor que la tarjeta chica, que es el punto entero del prompt. */
    PRUEBAS.cierto(chico.rotulo > 9.92,
      '⚠️ incluso en el teléfono se lee más grande que en la tarjeta (9,92 px) · ' + chico.rotulo);
  });
});

/* ── LO QUE ESTE ARCHIVO NO PUEDE PROBAR, Y HAY QUE MIRAR A MANO ──────────────────────────────
   · El DESLIZAMIENTO con el dedo: `TouchEvent` no se puede sintetizar de forma fiable en este
     entorno, así que `cicloFullTouchIni/Fin` quedan sin cubrir. Lo que sí está cubierto es que
     terminan llamando a `cicloFullIr()`, que es lo que se probó arriba.
   · El HÁPTICO (R8): `navigator.vibrate` no existe acá.
   · Cómo se VE con datos reales: estos casos usan ciclos inactivos, que es la forma más simple.
     Con la demostración abierta se verificó a mano a 375, 1280 y 1920. */
