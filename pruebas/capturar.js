/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CAPTURAR · sacarle una foto a la app para poder MIRARLA           (M5, 2026-08-27)

   Se carga en la app y deja `capturar(selector, nombre)`. Manda el PNG a `servir-captura.py`
   (puerto 8930), que lo guarda en `pruebas/_capturas/`.

   POR QUÉ EXISTE: la herramienta de captura del entorno sólo funciona si el panel del navegador
   está VISIBLE en la pantalla de quien mira, y en sesión headless no lo está (R11 del proyecto).
   Sin esto, todo se verifica midiendo y NADA se verifica mirando.

   ⚠️ LO QUE NO ES: no es una captura fiel. Dos límites concretos, los dos descubiertos usándola:
   · **No carga la tipografía de la app** (DM Sans): usa una de respaldo más ancha, así que parte
     más texto que la app real. Medido en M4: la captura mostraba "1 h 00 / min" en dos renglones
     cuando en la app va en uno. **Para decidir si algo entra por pocos píxeles, mandan las
     mediciones, no la imagen.**
     ⚠️ Esto se agravaba solo: al copiar `height` en píxeles fijos, el texto crecía con la fuente
     ancha pero la caja NO, así que salía cortado. En M5 me hizo reportar tres bugs que no existían
     (la tarjeta "Tu estado hoy" recortada, "Tu ciclo de hoy" encimado con "En curso", el título de
     actividad encimado con su bajada); medidos en la app, los tres estaban perfectos — la tarjeta
     crece de 72 a 143 px sola. Una herramienta que inventa bugs es peor que no tener herramienta.
     Por eso el alto ahora se copia como `min-height`: la caja puede crecer con la fuente de
     respaldo en vez de recortar. El ancho sí se copia exacto, porque de él dependen las columnas.
     Queda entonces así: **lo vertical es confiable, lo horizontal justo sigue sin serlo.**
   · No dibuja `backdrop-filter` ni filtros, y los degradados de ancestros lejanos hay que
     resolverlos a mano (por eso el fondo se busca subiendo hasta el primer opaco: pintar el de
     `body` daba títulos "ilegibles" que en la app tienen 16.37:1).
   Sirve muy bien para composición, jerarquía, espaciado, alineación, simetría y color.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* Se copian los estilos CALCULADOS uno por uno. Inyectar el `<style>` crudo en el SVG rompe el
     XML y no carga nada (probado). Esta lista es lo visual; agregar más sólo agranda el SVG. */
  const PROPS = ['display', 'position', 'top', 'left', 'right', 'bottom', 'width',
    'min-width', 'max-width', 'max-height', 'margin', 'padding', 'border',
    'border-radius', 'background-color', 'background-image', 'color', 'font-family', 'font-size',
    'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'text-overflow', 'white-space', 'overflow', 'opacity', 'box-shadow', 'flex', 'flex-direction',
    'flex-wrap', 'align-items', 'justify-content', 'gap', 'grid-template-columns', 'grid-column',
    'grid-area', 'box-sizing', 'vertical-align', 'list-style', 'transform', 'z-index',
    'border-color', 'border-width', 'border-style'];

  /* `none` es el valor por defecto de casi todo, salvo acá: si se descarta `display:none`, los
     elementos OCULTOS aparecen en la captura. Me pasó: el globito de notificaciones se veía con
     un "0" que en la app no está. */
  const CONSERVAR_NONE = { display: 1, 'text-overflow': 1 };

  /* El fondo del lienzo NO puede salir de `body`. Si la zona está sobre un fondo que viene de un
     ancestro lejano, pintar el de `body` da una imagen que MIENTE — con eso casi reporto como bug
     unos títulos blancos que en la app tienen 16.37:1 de contraste. */
  function fondoEfectivo(el) {
    let n = el;
    while (n) {
      const b = getComputedStyle(n).backgroundColor;
      if (b && !/rgba\(0, 0, 0, 0\)/.test(b) && b !== 'transparent') return b;
      n = n.parentElement;
    }
    return getComputedStyle(document.documentElement).backgroundColor || '#ffffff';
  }

  global.capturar = function (selector, nombre) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return Promise.resolve('no existe: ' + selector);
    const r = el.getBoundingClientRect();
    const w = Math.ceil(r.width), h = Math.ceil(r.height);
    if (!w || !h) return Promise.resolve('sin tamaño: ' + selector);

    const orig = [el].concat([].slice.call(el.querySelectorAll('*')));
    const clone = el.cloneNode(true);
    const cop = [clone].concat([].slice.call(clone.querySelectorAll('*')));
    for (let i = 0; i < orig.length && i < cop.length; i++) {
      const cs = getComputedStyle(orig[i]);
      let s = '';
      for (let j = 0; j < PROPS.length; j++) {
        const p = PROPS[j], v = cs.getPropertyValue(p);
        if (!v || v === 'normal') continue;
        if (v === 'none' && !CONSERVAR_NONE[p]) continue;
        s += p + ':' + v + ';';
      }
      /* ⚠️ El alto va como `min-height`, nunca como `height`. Con `height` fijo, cualquier texto que
         la fuente de respaldo agrande queda recortado y la imagen muestra un bug inventado. Con
         `min-height` la caja crece igual que en la app. Para un alto de verdad fijo (los íconos de
         42x42) da lo mismo: el SVG de adentro no lo empuja.
         ⚠️⚠️ Va AL FINAL de la cadena, no renombrando la propiedad donde estaba. `min-height` ya
         viene en PROPS unas posiciones más abajo, así que un renombre en el lugar dejaba DOS
         declaraciones y ganaba la de después (`min-height: 0px`): todo se aplastaba a cero. Con
         eso las 91 celdas del mapa de actividad desaparecieron de la captura y casi reporto como
         bug de la app algo que había roto yo en la herramienta. En CSS gana la última. */
      const alto = cs.getPropertyValue('height');
      if (alto && alto !== 'auto') s += 'min-height:' + alto + ';';
      cop[i].setAttribute('style', s);
      cop[i].removeAttribute('class');          // todo va inline: la clase ya no aporta
    }

    const html = new XMLSerializer().serializeToString(clone);
    const fondo = fondoEfectivo(el);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml">' + html + '</div>' +
      '</foreignObject></svg>';

    return new Promise(function (res) {
      const img = new Image();
      img.onload = function () {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        let d;
        try { d = cv.toDataURL('image/png'); }
        catch (e) { return res('canvas bloqueado: ' + e.message); }
        fetch('http://127.0.0.1:8930/captura', { method: 'POST', body: nombre + '\n' + d })
          .then(function (x) { return x.json(); })
          .then(function (j) { res(JSON.stringify({ archivo: j.archivo, w: w, h: h })); })
          .catch(function (e) { res('no se pudo enviar (¿está corriendo servir-captura.py?): ' + e.message); });
      };
      /* Si el SVG no carga suele ser XML mal formado por algo que quedó en el HTML clonado. */
      img.onerror = function () { res('el svg no cargó (' + Math.round(svg.length / 1024) + ' KB)'); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  };
})(window);
