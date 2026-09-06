PRUEBAS.grupo('P095 · la portada: los dos accesos del pie');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ ESTE ARCHIVO SE REESCRIBIÓ ENTERO EL 2026-09-06, DESPUÉS DE QUE FRANCO MIRARA LA PANTALLA.

   `P095` había convertido los dos accesos del pie en una "lista rotulada": cada uno en su fila,
   con un rótulo arriba ("OTRAS FORMAS DE ENTRAR") y una línea explicando qué hace. Franco lo
   rechazó viéndolo, con estas palabras:

     *"no me gusta, me gustaba como estaba antes, directamente los dos botones, además le metiste
      ese texto que yo no pedí, sácalo"*

   Y tenía razón en las dos cosas: el texto explicativo no estaba en el pedido —el prompt decía
   "lista rotulada", que interpreté como "con explicación", y era una interpretación mía— y la
   pantalla de entrada de una app se juzga mirándola, no midiéndola.

   👉 **NO VOLVER A PROPONER LA LISTA.** Es una decisión tomada mirando el resultado.

   LO QUE SÍ SE CONSERVA de aquel trabajo, y por eso este archivo sigue existiendo: dos defectos
   MEDIDOS que no tienen nada que ver con cómo se ven los accesos, y que revertir a ciegas habría
   devuelto a producción.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p095Con(fn) {
  const ov = document.getElementById('splashOv');
  const ya = ov.classList.contains('show');
  ov.classList.add('show');
  try { return fn(); } finally { if (!ya) ov.classList.remove('show'); }
}

PRUEBAS.caso('los dos accesos van DIRECTOS, sin rótulo ni explicación', () => {
  p095Con(() => {
    const links = [...document.querySelectorAll('.splash-link')];
    PRUEBAS.igual(links.length, 2, 'están los dos botones y nada más');
    PRUEBAS.igual(document.querySelectorAll('.splash-op').length, 0,
      '⚠️ la lista rotulada no volvió · Franco la rechazó mirándola');
    PRUEBAS.igual(document.querySelectorAll('.splash-otras-t, #splashOtrasT').length, 0,
      'y tampoco el rótulo "Otras formas de entrar"');
    /* Cada botón dice su nombre y NADA más: sin la línea de apoyo que se había agregado. */
    links.forEach((b, i) => {
      const txt = b.textContent.trim();
      PRUEBAS.cierto(txt.length > 0, 'el acceso ' + (i + 1) + ' tiene texto');
      PRUEBAS.comoMucho(txt.length, 40,
        '⚠️ y es sólo su nombre, sin explicación debajo · decía «' + txt + '»');
    });
  });
});

PRUEBAS.caso('el texto que Franco mandó sacar no está en ningún idioma', () => {
  /* Se mira el DICCIONARIO y no el DOM: el DOM sólo tiene el idioma activo, y las tres claves se
     habían agregado en los dos. Si alguien las repone, este caso lo dice. */
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  const vivas = [];
  try {
    ['es', 'en'].forEach(l => {
      fijarIdioma(l);
      ['splash_otras', 'splash_demo_d', 'splash_admin_d'].forEach(k => {
        const v = t(k);
        if (v && v !== k) vivas.push(l + '/' + k + ': «' + v + '»');
      });
    });
  } finally { fijarIdioma(antes); }
  PRUEBAS.igual(vivas, [], '⚠️ las tres claves de la explicación se fueron — ' + vivas.join(' | '));
});

PRUEBAS.caso('⚠️ SE CONSERVA · en escritorio el separador no se apila solo en un renglón', () => {
  /* El defecto real que P095 sí arregló, y que revertir a ciegas habría devuelto: la regla
     `.splash-pie > * { width: min(340px,100%) }` se le aplicaba TAMBIÉN al `<span>` del `·`, y con
     `flex-wrap` los tres terminaban en renglones de 277 px mientras el botón principal medía 138.
     El punto quedaba SOLO, centrado, en un renglón propio de 277×17 px — un separador que ocupa un
     renglón ya no separa nada. */
  /* ⚠️ NO se compara el `top` de las tres cajas. El `·` lleva `align-self:center` y su caja es
     mucho más baja que la de un botón de 44 px, así que su `top` es ~13 px distinto AUNQUE esté
     en la misma línea. Medirlo así daba "2 renglones" sobre una pantalla correcta — otro
     instrumento que miente. Lo que de verdad importa es que el separador quede ENTRE los dos y
     que mida lo que mide un punto. */
  const m = p095Con(() => PRUEBAS.enVentana(1366, 768, () => {
    const links = [...document.querySelectorAll('.splash-link')];
    const sep = document.querySelector('.splash-pie-sep');
    if (links.length < 2 || !sep) return null;
    const r = links.map(x => x.getBoundingClientRect());
    const rs = sep.getBoundingClientRect();
    const cen = x => Math.round(x.top + x.height / 2);
    return { mismaLinea: Math.abs(cen(r[0]) - cen(r[1])) <= 2,
             sepEnMedio: rs.left >= r[0].right - 4 && rs.right <= r[1].left + 4,
             sepAlineado: Math.abs(cen(rs) - cen(r[0])) <= 8,
             anchoSep: Math.round(rs.width), anchoLink: Math.round(r[0].width) };
  }));
  PRUEBAS.cierto(!!m, 'los dos accesos y el separador existen · si no, no se está midiendo nada');
  PRUEBAS.igual(m.mismaLinea, true, '⚠️ los dos accesos en la MISMA línea · eran tres renglones');
  PRUEBAS.igual(m.sepEnMedio, true, 'y el separador entre los dos, que es su único trabajo');
  PRUEBAS.igual(m.sepAlineado, true, 'alineado con ellos, no en un renglón propio');
  PRUEBAS.comoMucho(m.anchoSep, 40,
    '⚠️ y mide lo que mide un punto, no 277 px · midió ' + m.anchoSep);
});

PRUEBAS.caso('⚠️ SE CONSERVA · el anillo de foco llega al 3:1 en los DOS temas', () => {
  /* WCAG 2.2 SC 1.4.11 pide 3:1 para un indicador no textual. La regla global usa `--orange-txt`,
     que sobre el navy de esta pantalla daba 2,82:1 en tema claro y 3,46:1 en oscuro: el defecto
     existía en UN solo tema, que es lo que sólo se ve mirando los dos (R13).

     ⚠️ SE LEE LA REGLA CSS, no `getComputedStyle` del elemento: acá la pestaña está oculta y
     `:focus-visible` no engancha nunca, así que el `outline-color` computado es el negro por
     defecto y daba 1,48:1 — un rojo falso sobre un anillo que en la realidad nunca se dibuja de
     ese color. Medir el elemento sería medir el estado equivocado. */
  function reglaOutline(){
    for (const ss of document.styleSheets){
      let reglas; try { reglas = ss.cssRules; } catch(e){ continue; }
      for (const r of reglas){
        if (!r.selectorText || r.selectorText.indexOf('.splash-link:focus-visible') < 0) continue;
        const c = r.style.getPropertyValue('outline');
        if (c) return c;
      }
    }
    return '';
  }
  const decl = reglaOutline();
  PRUEBAS.cierto(decl.length > 0, 'la regla del anillo existe · si no, este caso no mide nada');
  PRUEBAS.falso(/--orange-txt/.test(decl),
    '⚠️ el anillo NO usa `--orange-txt`, que sobre el navy da 2,82:1 en claro · decía «' + decl + '»');

  const tok = (decl.match(/var\((--[\w-]+)\)/) || [])[1];
  PRUEBAS.cierto(!!tok, 'y el color sale de un token (R13) · decía «' + decl + '»');
  const antes = document.documentElement.getAttribute('data-tema');
  const malos = [];
  const hex2rgb = h => { const x = h.replace('#','');
    const n = x.length === 3 ? x.split('').map(c => c + c).join('') : x;
    return 'rgb(' + [0,2,4].map(i => parseInt(n.substr(i,2),16)).join(', ') + ')'; };
  p095Con(() => {
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      const cs = getComputedStyle(document.documentElement);
      const r = CTX.contraste(hex2rgb(cs.getPropertyValue(tok).trim()),
                              hex2rgb(cs.getPropertyValue('--navy').trim()));
      if (!(r >= 3)) malos.push(tema + ': ' + r + ':1');
    });
  });
  if (antes) document.documentElement.setAttribute('data-tema', antes);
  else document.documentElement.removeAttribute('data-tema');
  PRUEBAS.igual(malos, [], 'pasa 3:1 sobre el navy en los dos temas — ' + malos.join(' | '));
});

PRUEBAS.caso('el área táctil de los accesos no se sacrificó al volver atrás', () => {
  /* I2: son los caminos secundarios de la PRIMERA pantalla y se tocan parados, con una mano. */
  const m = p095Con(() => PRUEBAS.enVentana(375, 812, () => {
    const links = [...document.querySelectorAll('.splash-link')];
    if (!links.length) return null;
    const r = links.map(x => x.getBoundingClientRect());
    return { alto: Math.min(...r.map(x => Math.round(x.height))),
             desborda: Math.round(Math.max(...r.map(x => x.right)) - innerWidth) };
  }));
  PRUEBAS.cierto(!!m, 'los accesos existen y se miden');
  PRUEBAS.alMenos(m.alto, 44, 'cada acceso llega a 44 px de alto (I2)');
  PRUEBAS.comoMucho(m.desborda, 0, 'sin desbordar el ancho de la pantalla');
});
