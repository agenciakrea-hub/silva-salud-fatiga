/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P052 · N6 · UN SOLO LENGUAJE PARA «LO QUE HAY QUE TOCAR AHORA»                  (2026-09-06)

   ── QUÉ ESTABA MAL, Y POR QUÉ NO ERA ESTÉTICO ───────────────────────────────────────────────
   La misma acción tenía CUATRO apariencias: `.ent-btn--solid` (degradado + halo `color-mix`),
   `.ini-ahora` (`--orange-txt` + halo `rgba(184,80,10,.3)` escrito a mano), `.gest-fab-main`
   (`--orange-txt` + `--shadow-md`) y el «Siguiente» del carrusel, que hereda del primero.

   Lo grave no era el aspecto:
   1. **`--orange-txt` es el token de TINTA.** Su gemelo `--orange-solido` lleva escrito «éste NO
      cambia a propósito: es fondo, no tinta». Usar la tinta como fondo significa que el día que
      alguien ajuste el naranja del TEXTO para ganar contraste en oscuro —que es justamente para lo
      que ese token existe— van a cambiar de color los botones principales sin que nadie lo pida.
      Hoy los dos valen `#b8500a`, así que el defecto es silencioso: está esperando el primer
      ajuste de contraste.
   2. **Dos sombras eran halos escritos a mano** (R13), y una repetía `#b8500a` dentro de un
      `rgba()`: el mismo color del token, copiado a mano y ya imposible de mantener sincronizado.
   3. **Tres respuestas distintas al mismo gesto** (`scale(.96)`, `.985`, `.98`).

   ── LO QUE SE UNIFICÓ Y LO QUE NO ───────────────────────────────────────────────────────────
   Se unificó el SIGNIFICADO: fondo, tinta, sombra y respuesta al tacto. NO la geometría, porque
   son formas distintas por función distinta — una píldora ancha en la portada, una tarjeta con
   ícono en el inicio, un botón de barra en gestión. Unificar el radio habría empeorado los tres.

   ── EL DATO QUE HABÍA QUE MEDIR ANTES DE TOCAR ──────────────────────────────────────────────
   El degradado de `.ent-btn--solid` estaba defendido por un comentario de I6: el naranja anterior
   daba 2.14:1 con blanco y por eso se había pasado a «dos tonos que AMBOS pasan». Aplanar sin
   medir habría sido volver atrás a ciegas. Medido: `--orange-solido` da **5.01:1**, contra 4.64 y
   4.62 de los dos extremos del degradado. El cambio GANA contraste, no lo pierde — y eso es lo
   que este archivo comprueba, para que nadie tenga que confiar en el número escrito acá.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P052 · un solo lenguaje para el botón principal');

/* Las cuatro que cumplen el rol. Si mañana aparece una quinta, va acá. */
const P052_SEL = ['.splash-cta', '.car-sig', '.gest-fab-main', '.ini-ahora'];

function p052Lum(css) {
  const m = String(css).match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const f = x => { x = +x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
}
function p052Contraste(a, b) {
  const la = p052Lum(a), lb = p052Lum(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/* Crea el elemento si no está en el DOM: `.ini-ahora` sólo existe con datos de inicio, y una
   prueba que se saltea el elemento que falta es una prueba que no mide. */
function p052Con(sel, fn) {
  let el = document.querySelector(sel), creado = false;
  if (!el) {
    el = document.createElement(sel === '.gest-fab-main' ? 'button' : 'button');
    el.className = sel.slice(1);
    if (sel === '.splash-cta' || sel === '.car-sig') el.classList.add('ent-btn', 'ent-btn--solid');
    el.textContent = 'x';
    document.body.appendChild(el);
    creado = true;
  }
  try { return fn(el); } finally { if (creado) el.remove(); }
}

PRUEBAS.caso('⚠️ las cuatro comparten fondo, tinta y sombra, en los DOS temas', () => {
  const antes = document.documentElement.getAttribute('data-tema');
  try {
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      const vistos = P052_SEL.map(sel => p052Con(sel, el => {
        const c = getComputedStyle(el);
        return { sel, fondo: c.backgroundColor, tinta: c.color, sombra: c.boxShadow, img: c.backgroundImage };
      }));
      /* Guarda de medibilidad: sin fondo resuelto no hay nada que comparar y todo daría igual. */
      PRUEBAS.cierto(vistos.every(v => /rgb/.test(v.fondo)),
        'guarda de medibilidad [' + tema + ']: los cuatro resuelven un fondo · ' +
        JSON.stringify(vistos.map(v => v.sel + '=' + v.fondo)));
      const fondos  = [...new Set(vistos.map(v => v.fondo))];
      const tintas  = [...new Set(vistos.map(v => v.tinta))];
      const sombras = [...new Set(vistos.map(v => v.sombra))];
      PRUEBAS.igual(fondos.length, 1,
        '⚠️ [' + tema + '] un solo fondo para la misma acción · ' + JSON.stringify(fondos));
      PRUEBAS.igual(tintas.length, 1,
        '⚠️ [' + tema + '] una sola tinta · ' + JSON.stringify(tintas));
      PRUEBAS.igual(sombras.length, 1,
        '⚠️ [' + tema + '] una sola sombra · eran dos halos escritos a mano (R13) · ' + JSON.stringify(sombras));
      PRUEBAS.igual(vistos.filter(v => v.img !== 'none').map(v => v.sel), [],
        '⚠️ [' + tema + '] ninguna usa degradado · el de `.ent-btn--solid` contrastaba PEOR que el plano');
    });
  } finally {
    if (antes) document.documentElement.setAttribute('data-tema', antes);
    else document.documentElement.removeAttribute('data-tema');
    void document.body.offsetWidth;
  }
});

PRUEBAS.caso('⚠️ el fondo sale de `--orange-solido`, NO del token de tinta', () => {
  /* El defecto silencioso: hoy `--orange-txt` y `--orange-solido` valen lo mismo, así que mirar el
     color no distingue cuál se usó. Se comparan contra los DOS tokens y se exige que, si algún día
     se separan, el botón siga el de FONDO. */
  const cs = getComputedStyle(document.documentElement);
  const solido = cs.getPropertyValue('--orange-solido').trim();
  const tinta  = cs.getPropertyValue('--orange-txt').trim();
  PRUEBAS.cierto(!!solido, 'guarda de medibilidad: `--orange-solido` existe · leí «' + solido + '»');
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  /* Se mira la FUENTE porque el color computado no dice de qué token vino. */
  const conTinta = P052_SEL.map(s => s.slice(1)).filter(cls =>
    new RegExp('\\.' + cls + '\\b[^{]*\\{[^}]*background:\\s*var\\(--orange-txt\\)').test(f));
  PRUEBAS.igual(conTinta, [],
    '⚠️ estas usan el token de TINTA como fondo: el día que se ajuste el naranja del texto para ' +
    'contraste en oscuro, cambian de color sin que nadie lo pida');
});

PRUEBAS.caso('⚠️ el texto se lee sobre el botón, en los dos temas (≥4.5:1)', () => {
  const antes = document.documentElement.getAttribute('data-tema');
  try {
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      P052_SEL.forEach(sel => p052Con(sel, el => {
        const c = getComputedStyle(el);
        const r = p052Contraste(c.color, c.backgroundColor);
        PRUEBAS.cierto(r !== null, 'guarda: se pudo medir ' + sel + ' en ' + tema);
        PRUEBAS.cierto(r >= 4.5,
          '⚠️ [' + tema + '] ' + sel + ' da ' + (r || 0).toFixed(2) + ':1 · el degradado que se ' +
          'reemplazó daba 4.62, y el naranja de antes 2.14 con sol de frente');
      }));
    });
  } finally {
    if (antes) document.documentElement.setAttribute('data-tema', antes);
    else document.documentElement.removeAttribute('data-tema');
    void document.body.offsetWidth;
  }
});

PRUEBAS.caso('⚠️ el estado «al día» NO se disfraza de acción', () => {
  /* `.ini-listo` comparte la clase `.ini-ahora` pero es un `<div>` verde que no hace nada. Si el
     rol lo alcanzara, quedaría naranja y con sombra de botón: invitaría a tocar algo inerte. */
  const div = document.createElement('div');
  div.className = 'ini-ahora ini-listo';
  document.body.appendChild(div);
  try {
    void document.body.offsetWidth;
    const c = getComputedStyle(div);
    const solido = getComputedStyle(document.documentElement).getPropertyValue('--orange-solido').trim();
    PRUEBAS.cierto(/rgb/.test(c.backgroundColor), 'guarda de medibilidad: resolvió un fondo');
    PRUEBAS.falso(c.backgroundColor.indexOf('184, 80, 10') >= 0,
      '⚠️ el estado «al día» no puede tener el fondo de la acción principal (' + solido + ') · llegó ' + c.backgroundColor);
    PRUEBAS.igual(c.cursor, 'default', '⚠️ y no invita a tocarlo');
  } finally { div.remove(); }
});

PRUEBAS.caso('⚠️ tocar el botón principal se siente IGUAL en las tres pantallas', () => {
  /* Eran `scale(.96)`, `.985` y `.98`: el mismo gesto con tres respuestas distintas y ninguna
     razón.

     ⚠️ ESTE CASO MEDÍA EL TEXTO DEL CSS Y POR ESO NO VIO EL DEFECTO QUE QUEDÓ VIVO. Su regex
     anclaba en los nombres de las clases, y la regla que de verdad GANABA —`.ent-btn:active`, con
     la misma especificidad y más abajo en la hoja— no contiene ninguno de esos nombres: quedaba
     fuera del match y el caso veía una sola escala mientras el botón sólido respondía distinto de
     los otros dos. Lo encontró la revisión de la tanda 6b, un prompt después.
     **Una regex sobre el fuente no puede resolver una cascada.** Ahora se le pregunta al navegador
     qué regla le aplica a cada elemento (`p112EscalaActiva`, en `p112-lenguaje-boton-principal.js`),
     que además no necesita provocar `:active` — el impedimento que este caso citaba del `LEEME`.
     El medidor vive en un solo lugar a propósito: dos criterios sobre lo mismo terminan siendo dos
     criterios distintos. */
  if (typeof p112EscalaActiva !== 'function') {
    PRUEBAS.cierto(false, 'falta `p112EscalaActiva`: sin el medidor común esto no mide la cascada');
    return;
  }
  CTX.resetear();
  const medidas = ['.ent-btn--solid', '.ini-ahora', '.gest-fab-main']
    .map(sel => ({ sel, escala: p112EscalaActiva(sel) }))
    .filter(x => x.escala);
  PRUEBAS.alMenos(medidas.length, 2,
    'guarda de medibilidad: al menos dos están en el DOM · ' + JSON.stringify(medidas));
  PRUEBAS.igual([...new Set(medidas.map(x => x.escala))].length, 1,
    '⚠️ una sola escala para el mismo gesto · ' + JSON.stringify(medidas));
});
