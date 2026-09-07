PRUEBAS.grupo('P112 · A7-c · el botón principal tenía tres respuestas al mismo gesto');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P052 se propuso «un solo lenguaje para el botón principal» y unificó fondo, tinta y sombra.
   Quedaron tres cosas vivas, y las tres las encontró la revisión de la tanda 6b:

   · `.ent-btn:active` (.96) y `.accion-principal:active` (.97) tienen la MISMA especificidad
     (0,2,0) y la primera va DESPUÉS, así que le ganaba: el botón sólido de la entrada respondía
     con .96 mientras `.ini-ahora` y `.gest-fab-main` respondían con .97. La tercera respuesta al
     mismo gesto seguía ahí, dentro del prompt que existía para cerrarla.
   · `.ini-ahora` pasó de 16 px de radio a 28 al tomar `--radius-lg`, aunque el commit de P052 dice
     que «la geometría de cada uno se respeta». `--radius-lg` estaba declarado y SIN CONSUMIDORES
     desde antes; P052 fue el primer commit que lo usó, en una pantalla que su propio comentario no
     cubría. Se sacó el token: uno declarado y sin usar invita a engancharlo en el primer sitio que
     se cruce, que es exactamente lo que pasó.
   · El comentario decía «las cuatro que cumplen el rol» y son tres: `.accion-principal` no está
     aplicada a ningún elemento. Se deja como nombre del rol —un botón nuevo entra al lenguaje
     tomando la clase— pero contarla hacía creer que el inventario estaba completo.

   ── POR QUÉ LA PRUEBA DE P052 NO LO VIO ─────────────────────────────────────────────────────
   `p052-accion-principal.js` usa una regex anclada en los nombres
   (`splash-cta|car-sig|gest-fab-main|ini-ahora|ent-btn--solid|accion-principal`), y la regla que
   de verdad GANA —`.ent-btn:active`— no contiene ninguno de esos nombres: quedaba fuera del match
   y el caso veía una sola escala. Medir el texto fuente no puede resolver una cascada; hay que
   preguntarle al navegador cuál regla se aplica. Eso es lo que hace este archivo.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/* Recorre las hojas de estilo y devuelve la ÚLTIMA regla `:active` que le aplica al elemento — que
   con especificidades iguales es la que gana. No mira el CSS como texto: mira qué le toca a este
   elemento, que es lo único que la persona percibe al tocarlo. */
function p112EscalaActiva(sel){
  const el = document.querySelector(sel);
  if (!el) return null;
  let ganadora = null;
  for (const hoja of document.styleSheets) {
    let reglas; try { reglas = hoja.cssRules; } catch (e) { continue; }
    for (const rg of reglas) {
      if (!rg.selectorText || !/:active/.test(rg.selectorText)) continue;
      if (!rg.style || !rg.style.transform) continue;
      rg.selectorText.split(',').map(x => x.trim()).forEach(p => {
        const base = p.replace(/:active/g, '');
        try { if (el.matches(base)) ganadora = rg.style.transform; } catch (e) {}
      });
    }
  }
  return ganadora;
}

const P112_PRINCIPALES = ['.ent-btn--solid', '.ini-ahora', '.gest-fab-main'];

PRUEBAS.caso('⚠️ las tres apariencias del botón principal responden IGUAL al tacto', () => {
  CTX.resetear();
  const vistos = P112_PRINCIPALES.map(s => ({ sel: s, escala: p112EscalaActiva(s) }));
  const medidos = vistos.filter(v => v.escala);
  /* Guarda de medibilidad: si ninguno está en el DOM esto daría verde sin haber medido nada. */
  PRUEBAS.alMenos(medidos.length, 2,
    'guarda: al menos dos de las tres están en el DOM · ' + JSON.stringify(vistos));
  const distintas = [...new Set(medidos.map(v => v.escala))];
  PRUEBAS.igual(distintas.length, 1,
    '⚠️ una sola respuesta al mismo gesto · ' + JSON.stringify(medidos));
});

PRUEBAS.caso('el DISCRIMINADOR: si una vuelve a pisar a las otras, se detecta', () => {
  /* Sin esto, el caso de arriba daría verde aunque `p112EscalaActiva` devolviera siempre lo mismo
     (o null). Se reintroduce el defecto EXACTO que había: una regla con la misma especificidad,
     al final de la hoja, que le gana al lenguaje común. */
  CTX.resetear();
  const antes = p112EscalaActiva('.ent-btn--solid');
  const st = document.createElement('style');
  st.textContent = '.ent-btn:active { transform: scale(.90); }';
  document.head.appendChild(st);
  const durante = p112EscalaActiva('.ent-btn--solid');
  st.remove();
  const despues = p112EscalaActiva('.ent-btn--solid');
  PRUEBAS.falso(antes === durante,
    '⚠️ el medidor tiene que ver el cambio · si no, el caso de arriba no mide nada');
  PRUEBAS.igual(antes, despues, 'y el estado vuelve a como estaba');
});

PRUEBAS.caso('el botón secundario conserva SU respuesta · no se uniformó de más', () => {
  /* El arreglo fue `:not(.ent-btn--solid)`, no borrar la regla. El fantasma y el resto de los
     `.ent-btn` no son la acción principal y su .96 es deliberado: si esto se pone en verde porque
     todo quedó igual, el lenguaje dejó de distinguir principal de secundario. */
  CTX.resetear();
  const fantasma = p112EscalaActiva('.ent-btn--fantasma');
  if (!fantasma) { PRUEBAS.cierto(true, 'el secundario no está en esta pantalla: no se puede medir'); return; }
  PRUEBAS.falso(fantasma === p112EscalaActiva('.ent-btn--solid'),
    '⚠️ el secundario responde distinto del principal · ' + fantasma);
});

PRUEBAS.caso('⚠️ la geometría de la tarjeta del inicio es la del sistema', () => {
  /* P052 dijo respetar la geometría y le cambió el radio de 16 px a 28. */
  CTX.resetear();
  const el = document.querySelector('.ini-ahora');
  PRUEBAS.cierto(!!el, 'guarda: la tarjeta «lo que te toca ahora» está en el inicio');
  if (!el) return;
  const radio = parseFloat(getComputedStyle(el).borderRadius) || 0;
  const sistema = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 0;
  PRUEBAS.alMenos(sistema, 1, 'guarda: `--radius` resuelve · un var() roto computa a inherit sin error');
  PRUEBAS.igual(radio, sistema,
    '⚠️ usa el radio del sistema (' + sistema + 'px), no uno propio · antes 16 px a mano, luego 28');
});

PRUEBAS.caso('⚠️ no queda un token de radio declarado y sin consumidores', () => {
  /* `--radius-lg` existió sin que nadie lo usara hasta que P052 lo enganchó en el primer lugar que
     se cruzó, cambiando una geometría de paso. Un token muerto no es neutral. */
  const v = getComputedStyle(document.documentElement).getPropertyValue('--radius-lg').trim();
  PRUEBAS.igual(v, '',
    '⚠️ `--radius-lg` se sacó · si vuelve a hacer falta, se declara junto con su consumidor');
});
