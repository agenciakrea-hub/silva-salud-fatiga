PRUEBAS.grupo('P045 · Q3 · «enviando registro»: el cartel que no se iba y le tapaba el botón');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Lo reportó Franco usando la app: mandó una opinión, el cartel dijo «Enviando 1 registro…» y
   **nunca se fue**; encima se superponía con el botón de estadísticas.

   ── 1 · EL CARTEL INFINITO ──────────────────────────────────────────────────────────────────
   La app tiene cinco colas. La del empleado (`empCola`, por donde va la opinión) borraba el item
   SÓLO cuando el servidor contestaba `ok`; cualquier otra respuesta lo dejaba en la cola tal cual,
   sin marca de nada y sin contar el intento. Y como `offPendientes()` suma `empPendientes()`, la
   pantalla decía «Enviando…» para siempre.
   Peor: el comentario del `.catch` afirmaba que se reintentaba «cada 1 min, mismo timer que
   flushPending». Era FALSO — ese `setInterval` llama a `flushPending()`, que no toca esta cola.
   Con conexión estable y una respuesta sin `ok`, nada volvía a intentarlo hasta recargar la app.
   (Sí existía el listener de `online`; lo que faltaba era el temporizador y el tope.)
   Ahora cuenta intentos y a los `COLA_MAX_INTENTOS` se rinde y AVISA, con el mismo criterio que la
   otra cola: un registro que no se puede enviar no es un registro que se está enviando, y esa
   diferencia es lo único que le permite a la persona hacer algo.

   ── 2 · LA SUPERPOSICIÓN ────────────────────────────────────────────────────────────────────
   `.off-bar` se posicionaba con `bottom: calc(64px + safe-area)`, un número escrito a mano que no
   coincidía con nada: la barra de navegación no tiene alto fijo y mide 81 px, y encima el disco de
   estadísticas tiene `margin-top:-24px` y sobresale. Medido a 375 y 768: **1462 px² de solape**, y
   con `z-index:901` contra 900 no sólo lo tapaba, lo volvía intocable en esa zona.

   ── 3 · LA ANIMACIÓN ────────────────────────────────────────────────────────────────────────
   Tres puntos que laten escalonados (1,2 s, delays 0 / .2 / .4), en CSS: la app es un archivo
   único que tiene que andar sin señal (R7), y un `import` desde un CDN es justo lo que no carga
   cuando no hay red — que es cuándo este cartel se ve.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function p045Encolar(){
  empColaSave({ p045: { accion: 'opinion_guardar', payload: {}, creada: 1 } });
  offPintar();
}
function p045Limpiar(){ try { empColaSave({}); offPintar(); } catch (e) {} }

PRUEBAS.caso('🔴 el cartel de envío NO tapa el botón de estadísticas', () => {
  CTX.resetear();
  const nav = document.getElementById('bottomNav');
  const previo = nav ? nav.style.display : null;
  try {
    if (nav) nav.style.display = '';
    p045Encolar();
    const bar = document.getElementById('offBar'), fab = document.querySelector('.bn-fab');
    PRUEBAS.cierto(!!bar && !!fab, 'guarda de medibilidad: están el cartel y el disco');
    if (!bar || !fab) return;
    const rb = bar.getBoundingClientRect(), rf = fab.getBoundingClientRect();
    /* Guarda: si alguno midiera 0×0 el solape daría 0 sin haber medido nada — el cero de un
       elemento invisible se ve igual que el cero de un defecto arreglado. */
    PRUEBAS.alMenos(Math.round(rb.height), 8, 'guarda: el cartel tiene alto · ' + Math.round(rb.height));
    PRUEBAS.alMenos(Math.round(rf.height), 8, 'guarda: el disco tiene alto · ' + Math.round(rf.height));
    const x = Math.max(0, Math.min(rb.right, rf.right) - Math.max(rb.left, rf.left));
    const y = Math.max(0, Math.min(rb.bottom, rf.bottom) - Math.max(rb.top, rf.top));
    PRUEBAS.igual(Math.round(x * y), 0,
      '⚠️ solape 0 · antes 1462 px², y con z-index 901 sobre 900 lo volvía intocable');
  } finally { if (nav && previo !== null) nav.style.display = previo; p045Limpiar(); }
});

PRUEBAS.caso('⚠️ y se posiciona contra el alto REAL de la barra, no contra un número a mano', () => {
  CTX.resetear();
  const nav = document.getElementById('bottomNav');
  const previo = nav ? nav.style.display : null;
  try {
    if (nav) nav.style.display = '';
    navAltoSincronizar();
    const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-alto').trim();
    PRUEBAS.falso(v === '', '⚠️ `--nav-alto` se publica · sin esto el cartel cae en el respaldo de 64px');
    const alto = parseFloat(v) || 0;
    PRUEBAS.alMenos(alto, 65,
      '⚠️ y es MAYOR que los 64 px que estaban escritos a mano · midió ' + v + '. El disco sobresale ' +
      'de la barra por su `margin-top:-24px`, y ese saliente es lo que el número viejo no contaba');
  } finally { if (nav && previo !== null) nav.style.display = previo; }
});

PRUEBAS.caso('🔴 un envío que falla se RINDE y avisa · no dice «Enviando…» para siempre', () => {
  /* R17 · por el camino real: se encola como lo hace `opinionEnviar` y se le hacen fallar los
     intentos con la misma función que usa el `.catch` de `empFlush`. */
  CTX.resetear();
  try {
    p045Encolar();
    const bar = document.getElementById('offBar');
    PRUEBAS.cierto(/enviando/i.test(bar.textContent || ''),
      'guarda: con un pendiente el cartel dice que está enviando · ' + (bar.textContent||'').slice(0,30));

    for (let i = 0; i < COLA_MAX_INTENTOS; i++) empFallo('p045', empColaAll());

    PRUEBAS.igual(empTrabados().length, 1,
      '⚠️ a los ' + COLA_MAX_INTENTOS + ' intentos deja de reintentarse · antes no se contaban');
    offPintar();
    PRUEBAS.cierto(/off-bar-trabada/.test(bar.className),
      '⚠️ y el cartel lo DICE · ' + bar.className);
    PRUEBAS.igual(bar.getAttribute('role'), 'button',
      'y se puede tocar para reintentar, también con teclado');
    PRUEBAS.falso(/enviando/i.test(bar.textContent || ''),
      '⚠️ ya no afirma que lo está enviando · ' + (bar.textContent||'').slice(0, 46));
  } finally { p045Limpiar(); }
});

PRUEBAS.caso('el DISCRIMINADOR: con menos intentos que el tope NO se rinde', () => {
  /* Sin esto, el caso de arriba daría verde aunque `empTrabados()` devolviera siempre 1. */
  CTX.resetear();
  try {
    p045Encolar();
    for (let i = 0; i < COLA_MAX_INTENTOS - 1; i++) empFallo('p045', empColaAll());
    PRUEBAS.igual(empTrabados().length, 0,
      '⚠️ con ' + (COLA_MAX_INTENTOS - 1) + ' intentos sigue reintentando · un fallo transitorio ' +
      'tiene que poder pasar solo, sin molestar a nadie');
  } finally { p045Limpiar(); }
});

PRUEBAS.caso('⚠️ tocar el cartel destraba las DOS colas, no una', () => {
  /* El cartel es uno solo y cuenta las cinco colas. Si el reintento destrabara sólo la mitad, la
     otra se quedaría trabada con el cartel ya apagado, y nadie volvería a mirarla. */
  CTX.resetear();
  try {
    p045Encolar();
    for (let i = 0; i < COLA_MAX_INTENTOS; i++) empFallo('p045', empColaAll());
    PRUEBAS.igual(empTrabados().length, 1, 'guarda: quedó trabado antes de reintentar');
    colaReintentar();
    PRUEBAS.igual(empTrabados().length, 0, '⚠️ el reintento manual alcanza a la cola del empleado');
  } finally { p045Limpiar(); }
});

PRUEBAS.caso('⚠️ «enviando» se mueve · un cartel quieto no se distingue de uno colgado', () => {
  CTX.resetear();
  try {
    p045Encolar();
    const dots = [...document.querySelectorAll('.off-dot')];
    PRUEBAS.igual(dots.length, 3, 'los tres puntos están en el cartel');
    /* ⚠️ Acá la pestaña está oculta de forma permanente, así que la app pone `.sin-animaciones` y
       `animation-name` computa `none` (ver LEEME). Medir eso y concluir «no anima» sería un falso
       positivo: se saca la clase para leer la declaración, y se devuelve. */
    const raiz = document.documentElement;
    const tenia = raiz.classList.contains('sin-animaciones');
    raiz.classList.remove('sin-animaciones');
    void document.body.offsetWidth;
    const decl = dots.map(d => {
      const cs = getComputedStyle(d);
      return { nombre: cs.animationName, dur: cs.animationDuration, delay: cs.animationDelay, iter: cs.animationIterationCount };
    });
    if (tenia) raiz.classList.add('sin-animaciones');

    PRUEBAS.cierto(decl.every(d => d.nombre && d.nombre !== 'none'),
      'guarda de medibilidad: la animación está declarada · ' + JSON.stringify(decl[0]));
    PRUEBAS.cierto(decl.every(d => d.iter === 'infinite'),
      '⚠️ late mientras dure el envío, no una vez');
    const delays = decl.map(d => parseFloat(d.delay) || 0);
    PRUEBAS.igual(delays.length, 3, 'guarda: se leyeron los tres');
    PRUEBAS.cierto(delays[0] < delays[1] && delays[1] < delays[2],
      '⚠️ escalonados, que es lo que hace la ola · ' + JSON.stringify(delays));
  } finally { p045Limpiar(); }
});

PRUEBAS.caso('⚠️ y con la animación apagada los puntos SIGUEN viéndose', () => {
  /* La regla de oro de esta app: el estado en reposo es visible. Un `from` en opacidad 0 con
     `fill:both` deja el elemento invisible para siempre cuando la animación no corre — y no corre
     con moción reducida, con la pestaña en segundo plano, ni en este entorno. */
  CTX.resetear();
  try {
    p045Encolar();
    const raiz = document.documentElement;
    const tenia = raiz.classList.contains('sin-animaciones');
    raiz.classList.add('sin-animaciones');
    void document.body.offsetWidth;
    const d = document.querySelector('.off-dot');
    PRUEBAS.cierto(!!d, 'guarda: hay un punto que medir');
    if (d) {
      const cs = getComputedStyle(d), b = d.getBoundingClientRect();
      PRUEBAS.alMenos(Math.round(parseFloat(cs.opacity) * 100), 30,
        '⚠️ se ve sin animación · opacidad ' + cs.opacity);
      PRUEBAS.alMenos(Math.round(b.width), 1, 'y tiene tamaño · ' + Math.round(b.width * 10) / 10 + 'px');
    }
    if (!tenia) raiz.classList.remove('sin-animaciones');
  } finally { p045Limpiar(); }
});
