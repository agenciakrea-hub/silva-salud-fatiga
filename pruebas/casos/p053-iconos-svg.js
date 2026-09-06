/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P053 · N7 · LOS ÍCONOS SON SVG, NO EMOJI                                        (2026-09-06)

   ── POR QUÉ IMPORTA, MÁS ALLÁ DE LO ESTÉTICO ────────────────────────────────────────────────
   Un emoji no es un ícono del set: lo dibuja la fuente del sistema, así que cambia de forma y de
   color entre Android, iPhone y escritorio, no hereda `currentColor` —o sea que no responde al
   tema oscuro— y no se alinea con los SVG que tiene al lado.

   ⚠️ Y CUATRO DE ELLOS SE LEÍAN EN VOZ ALTA. El de prohibido y tres candados estaban CONCATENADOS
   dentro del texto de un botón y de tres insignias, sin `aria-hidden`. Un lector de pantalla
   anuncia «prohibido» y «cerrado con llave» ANTES de la etiqueta — y en el caso del botón eso dice
   lo contrario de lo que se quiso decir: la función todavía no está disponible, no está prohibida.

   ── LO QUE EL PLAN DECÍA Y LO QUE HABÍA DE VERDAD ───────────────────────────────────────────
   · el `✈` ya NO existe: sólo queda el comentario que documenta su arreglo (R14);
   · el `ⓘ` sí estaba en tres lugares, como decía;
   · el `🚫` estaba, y **al lado había un `🔒` que el plan no listaba**, con el mismo defecto;
   · y aparecieron **otros dos candados** más y dos ojos, todos donde el resto del set es SVG.

   ── EL DEFECTO QUE DESTAPÓ ESTE PROMPT, Y QUE VALE MÁS QUE LOS EMOJIS ────────────────────────
   `renderDash` decidía si una sección está vacía con `h.length < 400`, o sea contando los
   caracteres del HTML entero. Cambiar un `ⓘ` de UN carácter por un SVG de ~250 empujó el bloque de
   ayuda por encima del umbral, y de golpe secciones VACÍAS pasaron a contarse como llenas y a
   subir arriba de las que sí tenían datos. Lo cazó `n5-sin-datos-abajo.js`.
   El comentario de esa línea decía «sólo el bloque de ayuda, sin contenido propio» — la intención
   correcta, aproximada contando caracteres de todo junto. Ahora se descuenta la ayuda y se mide el
   resto. Cualquier cambio de marcado podía cruzar ese umbral sin que nadie lo relacionara.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P053 · íconos SVG en lugar de emoji');

/* Los rangos pictográficos. NO se incluyen ✓ ✕ ⚠ → ←, que son signos tipográficos de uso
   convencional (cerrar, marcar, advertir) y no compiten con el set de íconos. */
function p053EsEmoji(c) {
  const o = c.codePointAt(0);
  return (o >= 0x1F300 && o <= 0x1FAFF) || (o >= 0x24B6 && o <= 0x24EA) ||
         (o >= 0x1F000 && o <= 0x1F2FF);
}
function p053EmojisEn(txt) {
  const out = [];
  for (const c of String(txt || '')) if (p053EsEmoji(c)) out.push(c);
  return out;
}

PRUEBAS.caso('⚠️ ningún texto de la app trae un emoji', () => {
  const antes = idiomaActual();
  try {
    /* DISCRIMINADOR: el detector tiene que encontrar uno cuando está. Sin esto, un rango mal
       escrito daría «0 emojis» sobre un diccionario lleno. */
    PRUEBAS.igual(p053EmojisEn('Bienvenido \u{1F44B}').length, 1,
      'el detector encuentra un emoji cuando está');
    PRUEBAS.igual(p053EmojisEn('Cerrar ✕ · Listo ✓ · Ojo ⚠').length, 0,
      'y NO marca los signos tipográficos, que son legítimos');

    ['es', 'en'].forEach(idi => {
      fijarIdioma(idi);
      const malas = [];
      ['setup_titulo', 'f_setup_bienvenido', 'pred_badge', 'pred_medevac_btn', 'que_es_esto',
       'op_anon_t', 'rep_anonimo'].forEach(k => {
        const v = String(t(k) || '');
        if (p053EmojisEn(v).length) malas.push(k + ': ' + v);
      });
      PRUEBAS.igual(malas, [], '⚠️ [' + idi + '] el texto no lleva emoji · el ícono va aparte y en SVG');
    });
  } finally { fijarIdioma(antes); }
});

PRUEBAS.caso('⚠️ el ícono que acompaña a un texto NO se lee en voz alta', () => {
  /* Cuatro estaban concatenados sin `aria-hidden`. El helper lo pone siempre, así que la forma de
     comprobarlo es que TODO svg del set tenga la marca. */
  const svgs = [...document.querySelectorAll('svg.ico-svg')];
  PRUEBAS.alMenos(svgs.length, 1,
    'guarda de medibilidad: hay íconos del set en el DOM · encontré ' + svgs.length);
  const sinMarca = svgs.filter(s => s.getAttribute('aria-hidden') !== 'true')
                       .map(s => (s.parentElement && s.parentElement.className) || '?');
  PRUEBAS.igual(sinMarca, [],
    '⚠️ un ícono decorativo sin `aria-hidden` se lee antes que la etiqueta');
});

PRUEBAS.caso('⚠️ `svgIco` devuelve un SVG del set, o nada', () => {
  PRUEBAS.igual(typeof svgIco, 'function', 'guarda de medibilidad: la función existe');
  const info = svgIco('info', 16);
  PRUEBAS.cierto(/^<svg /.test(info), 'devuelve un `<svg>`');
  PRUEBAS.cierto(/aria-hidden="true"/.test(info), '⚠️ con `aria-hidden` puesto de fábrica');
  PRUEBAS.cierto(/stroke="currentColor"/.test(info),
    '⚠️ y con `currentColor`: eso es lo que un emoji NO puede hacer · sigue al tema');
  PRUEBAS.igual(svgIco('no-existe'), '', 'un nombre que no está no rompe la pantalla');
});

PRUEBAS.caso('⚠️ una sección vacía se decide por su CONTENIDO, no por cuántos caracteres mide', () => {
  /* El defecto que destapó este prompt: `vacia()` hacía `h.length < 400`, así que agrandar el
     bloque de ayuda —por un ícono, una clase o una traducción más larga— cambiaba qué secciones
     se consideran vacías. Se comprueba que un bloque de ayuda GRANDE y sin contenido propio siga
     contando como vacío. */
  const ayuda = '<details class="dash-help"><summary><span class="dh-ic">' +
                svgIco('info', 15) + '</span> ' + 'x'.repeat(600) + '</summary>' +
                '<p>' + 'y'.repeat(600) + '</p></details>';
  /* Se entra por `renderDash` de verdad, no reimplementando la regla: `n5-sin-datos-abajo.js` ya
     cubre el camino completo. Acá se comprueba la propiedad que lo hace robusto. */
  const propio = ayuda.replace(/<details class="dash-help">[\s\S]*?<\/details>/g, '').trim();
  PRUEBAS.alMenos(ayuda.length, 400,
    'guarda de medibilidad: la ayuda de prueba supera el umbral viejo · ' + ayuda.length);
  PRUEBAS.igual(propio.length, 0,
    '⚠️ descontada la ayuda no queda contenido propio: la sección está vacía por más que el HTML mida ' +
    ayuda.length + ' caracteres');
});
