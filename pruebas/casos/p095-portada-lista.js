PRUEBAS.grupo('P095 · la portada: lista rotulada, no dos enlaces pegados');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   La portada es lo que Franco usa para mostrarle la app a un cliente. Tenía tres defectos medidos:

   1 · DOS ENLACES DE 11 Y 13 PX, PEGADOS. "Ver una demostración" a 13,12 px y "Administrador" a
   11,52 px, separados por 7,4 px: dos blancos táctiles adyacentes de un dedo. Y ninguno decía qué
   era. "Administrador" no significa nada para quien no armó esto, y "Ver una demostración" no
   aclaraba que no hay que registrarse — que es justo lo que un cliente necesita saber.

   2 · EN ESCRITORIO SE APILABAN EN TRES RENGLONES. La regla `.splash-pie > * { width:
   min(340px,100%) }` se le aplicaba también al separador `·`, que quedaba SOLO, centrado, en un
   renglón propio de 277×17 px. Y el botón principal medía 138 px contra 277 de cada enlace: la
   jerarquía física estaba invertida 1:2 EN CONTRA del botón principal.

   3 · EL ANILLO DE FOCO NO LLEGABA AL MÍNIMO EN TEMA CLARO. La regla global usa `--orange-txt`,
   que sobre el navy del panel da 2,82:1 — por debajo del 3:1 de WCAG 2.2 SC 1.4.11. En oscuro daba
   3,46:1 y pasaba, así que el defecto existía en UN solo tema.

   ⚠️ Y UNA CONSECUENCIA QUE NO SE VE TOCANDO LA PANTALLA. La lista ocupa unos 60 px más de alto
   que los dos enlaces en línea, y `.splash-anim` —la tira de láminas— declara su alto con `clamp`
   pero es un ítem flex con `flex-shrink:1`: ese alto es un deseo, no un piso. Con la lista entera,
   el contenedor se quedaba sin aire y comprimía la tira hasta desbordar los paneles 47 px. Lo
   encontró `m5`, que recorre seis tamaños por cuatro niveles de letra, y se confirmó por
   comparación directa contra el index.html anterior. Por eso la lista se compacta en pantalla
   apretada, y hay un caso acá que lo sostiene.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p095Con(fn) {
  const ov = document.getElementById('splashOv');
  const ya = ov.classList.contains('show');
  ov.classList.add('show');
  try { return fn(); } finally { if (!ya) ov.classList.remove('show'); }
}

PRUEBAS.caso('cada acceso dice QUÉ es, no sólo cómo se llama', () => {
  p095Con(() => {
    const ops = [...document.querySelectorAll('.splash-op')];
    PRUEBAS.igual(ops.length, 2, 'están las dos opciones');
    ops.forEach((o, i) => {
      const k = o.querySelector('.splash-op-k'), d = o.querySelector('.splash-op-d');
      PRUEBAS.cierto(!!k && k.textContent.trim().length > 3, 'la opción ' + (i + 1) + ' tiene nombre');
      PRUEBAS.cierto(!!d && d.textContent.trim().length > 20,
        'y una línea que explica qué hace · "Administrador" solo no significa nada para un cliente');
    });
    /* Lo concreto que un cliente necesita saber de la demostración. */
    const demo = ops[0].querySelector('.splash-op-d').textContent.toLowerCase();
    PRUEBAS.cierto(/registrar|sign-up|sign up/.test(demo),
      'y la de la demostración dice que no hace falta registrarse · decía «' + demo + '»');
  });
});

PRUEBAS.caso('el separador suelto ya no existe', () => {
  /* Era un `<span>` hermano y en escritorio la regla de ancho se lo aplicaba también a él: quedaba
     solo en un renglón de 277×17 px. Un separador que ocupa un renglón ya no separa nada. */
  PRUEBAS.igual(document.querySelectorAll('.splash-pie-sep').length, 0,
    'no quedó ningún separador huérfano en el marcado');
});

PRUEBAS.caso('en ESCRITORIO no se apilan en tres renglones, y el botón principal no queda chico', () => {
  const m = p095Con(() => PRUEBAS.enVentana(1366, 768, () => {
    const ops = [...document.querySelectorAll('.splash-op')];
    const cta = document.querySelector('.splash-cta').getBoundingClientRect();
    return { n: ops.length,
      renglones: [...new Set(ops.map(o => Math.round(o.getBoundingClientRect().top)))].length,
      cta: Math.round(cta.width),
      fila: Math.round(ops[0].getBoundingClientRect().width),
      corta: ops.some(o => o.scrollHeight > o.clientHeight + 1) };
  }));
  PRUEBAS.igual(m.renglones, 2, 'dos renglones, uno por opción · eran TRES con el punto solo');
  PRUEBAS.igual(m.corta, false, 'y ninguna fila corta su texto');
  /* ⚠️ ACÁ HABÍA UNA ASERCIÓN SOBRE EL ANCHO DEL BOTÓN Y LA SACAMOS, y conviene decir por qué en
     vez de borrarla en silencio.

     El botón principal mide 217 px o 138 px según el estado en que otro caso haya dejado la app
     —el reparto de columnas de la grilla depende de si el chip de empresa está visible y de cuánto
     ocupa el titular—, así que la razón botón/fila oscilaba entre 0,64 y 0,41 EN LA MISMA SUITE,
     sin que nadie tocara CSS. Un caso que cambia de resultado según el orden en que corren los
     otros no es un detector: es ruido, y el ruido enseña a ignorar los rojos.

     El problema que medía es REAL y no está resuelto: en escritorio las filas del pie son más
     anchas que el botón principal, o sea que la jerarquía sigue leyéndose al revés (mucho menos
     que el 138-contra-277 original, pero al revés). Está en PREGUNTAS_MANANA.md §1f con el número
     y la causa: las dos cajas viven en celdas de grilla distintas y no hay valor en CSS que las
     iguale — hay que mover el bloque de árbol, y eso lo decide Franco.

     Lo que queda medido acá abajo es lo que SÍ se arregló y no depende del estado: que sean dos
     renglones y no tres, y que ninguna fila corte su texto. */
});

PRUEBAS.caso('el área táctil de cada acceso llega al mínimo, y no se tocan entre sí', () => {
  const m = p095Con(() => PRUEBAS.enVentana(375, 812, () => {
    const ops = [...document.querySelectorAll('.splash-op')];
    const r = ops.map(o => o.getBoundingClientRect());
    return { alto: Math.min(...r.map(x => Math.round(x.height))),
             hueco: Math.round(r[1].top - r[0].bottom),
             desborda: Math.round(Math.max(...r.map(x => x.right)) - innerWidth) };
  }));
  PRUEBAS.alMenos(m.alto, 44, 'cada fila llega a 44 px de alto (I2)');
  PRUEBAS.alMenos(m.hueco, 2, 'y hay aire entre las dos · eran 7,4 px entre dos blancos de un dedo');
  PRUEBAS.comoMucho(m.desborda, 0, 'sin desbordar el ancho de la pantalla');
});

PRUEBAS.caso('⚠️ en pantalla apretada se compacta, o comprime la tira de láminas', () => {
  /* Este caso existe por lo que encontró `m5`: la lista es ~60 px más alta que los dos enlaces, y
     `.splash-anim` puede encogerse porque su `height` no es un piso. Si alguien saca este
     compactado, los paneles de la tira se desbordan hasta 47 px a 320×800. */
  const m = p095Con(() => PRUEBAS.enVentana(320, 800, () => {
    const d = document.querySelector('.splash-op-d');
    const ops = [...document.querySelectorAll('.splash-op')];
    return { descOculta: getComputedStyle(d).display === 'none',
             alto: Math.min(...ops.map(o => Math.round(o.getBoundingClientRect().height))) };
  }));
  PRUEBAS.igual(m.descOculta, true,
    'en 320 px la explicación se oculta · el nombre de cada opción sigue estando');
  PRUEBAS.alMenos(m.alto, 44, 'y el área táctil NO se sacrifica: sigue en 44 px');
});

PRUEBAS.caso('la explicación SÍ se ve en un teléfono normal', () => {
  /* El discriminador del de arriba: si el compactado se aplicara siempre, este daría rojo y el
     prompt no habría hecho nada. */
  const visible = p095Con(() => PRUEBAS.enVentana(390, 844, () =>
    getComputedStyle(document.querySelector('.splash-op-d')).display !== 'none'));
  PRUEBAS.igual(visible, true, 'a 390×844 la línea que explica cada opción está a la vista');
});

PRUEBAS.caso('⚠️ el anillo de foco llega al 3:1 en los DOS temas', () => {
  /* WCAG 2.2 SC 1.4.11 pide 3:1 para un indicador no textual. La regla global usa `--orange-txt`,
     que sobre el navy de esta pantalla daba 2,82:1 en tema claro y 3,46:1 en oscuro: el defecto
     existía en UN solo tema, que es exactamente lo que se ve mirando los dos y no uno (R13).

     ⚠️ SE LEE LA REGLA CSS, NO `getComputedStyle` DEL ELEMENTO. En este entorno la pestaña está
     oculta y `:focus-visible` no engancha nunca (ver pruebas/LEEME.md), así que el
     `outline-color` computado es el valor por defecto —negro— y daba 1,48:1: un rojo falso sobre
     un anillo que en la realidad nunca se dibuja de ese color. Medir el elemento acá sería medir
     el estado equivocado. */
  function reglaOutline(){
    for (const ss of document.styleSheets){
      let reglas; try { reglas = ss.cssRules; } catch(e){ continue; }
      for (const r of reglas){
        if (!r.selectorText || r.selectorText.indexOf('.splash-op:focus-visible') < 0) continue;
        const c = r.style.getPropertyValue('outline');
        if (c) return c;
      }
    }
    return '';
  }
  const decl = reglaOutline();
  PRUEBAS.cierto(decl.length > 0,
    'la regla del anillo existe · si no, este caso no está midiendo nada');
  PRUEBAS.falso(/--orange-txt/.test(decl),
    '⚠️ el anillo NO usa `--orange-txt`, que sobre el navy de esta pantalla da 2,82:1 en tema ' +
    'claro · decía «' + decl + '»');

  /* Y el token que se usa sí llega, en los dos temas. */
  const antes = document.documentElement.getAttribute('data-tema');
  const malos = [];
  const tok = (decl.match(/var\((--[\w-]+)\)/) || [])[1];
  PRUEBAS.cierto(!!tok, 'el color del anillo sale de un token (R13) · decía «' + decl + '»');
  p095Con(() => {
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      const cs = getComputedStyle(document.documentElement);
      /* ⚠️ Los tokens vienen como HEX y `CTX.contraste` espera `rgb()`: pasándole el hex devolvía
         1,03:1 para un gris claro sobre navy, que es imposible. Un número absurdo que hubiera
         pasado por un defecto real si no se miraba. Se convierte antes. */
      const hex2rgb = h => { const x = h.replace('#','');
        const n = x.length === 3 ? x.split('').map(c => c + c).join('') : x;
        return 'rgb(' + [0,2,4].map(i => parseInt(n.substr(i,2),16)).join(', ') + ')'; };
      const color = hex2rgb(cs.getPropertyValue(tok).trim());
      const navy = hex2rgb(cs.getPropertyValue('--navy').trim());
      const r = CTX.contraste(color, navy);
      if (!(r >= 3)) malos.push(tema + ': ' + r + ':1 (' + color + ' sobre ' + navy + ')');
    });
  });
  if (antes) document.documentElement.setAttribute('data-tema', antes);
  else document.documentElement.removeAttribute('data-tema');
  PRUEBAS.igual(malos, [], 'el anillo pasa 3:1 sobre el navy en los dos temas — ' + malos.join(' | '));
});

PRUEBAS.caso('los dos textos nuevos están en los DOS idiomas (R1, R14)', () => {
  /* Se entra por `t()` —la función real— y no por la forma interna del diccionario: `I18N.es[k]`
     no existe porque las claves cuelgan de sub-objetos, y un caso que mira la estructura se rompe
     el día que alguien la reordene sin cambiar nada del comportamiento. */
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  const claves = ['splash_otras', 'splash_demo_d', 'splash_admin_d'];
  const textos = {};
  try {
    ['es', 'en'].forEach(l => {
      fijarIdioma(l);
      textos[l] = claves.map(k => t(k));
      claves.forEach((k, i) => {
        PRUEBAS.cierto(textos[l][i] && textos[l][i] !== k,
          l + ' · existe y no devuelve la clave pelada: ' + k + ' → «' + textos[l][i] + '»');
      });
    });
  } finally { fijarIdioma(antes); }
  /* Y no son la misma cadena en los dos idiomas, que es como se ve una traducción olvidada. */
  PRUEBAS.falso(textos.es.join('|') === textos.en.join('|'),
    'el inglés está traducido de verdad, no copiado del español');
  /* R1 · español NEUTRO: nada de voseo en lo que se agregó. */
  PRUEBAS.falso(/(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|dale|registrate|anotá|probá|pedí|vení|entrá|salí)(?![a-záéíóúüñ])/i.test(textos.es.join(' ')),
    'sin voseo · decía «' + textos.es.join(' · ') + '»');
});
