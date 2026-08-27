/* ── Que nada tape la pantalla, y que cada botón reciba SU propio toque ─────────────────────────
   (L2c · automatiza la prueba que agarró el bug que rompió producción)

   EL BUG QUE ORIGINA ESTO
   Un `::after` de `.portal-x` (el botón de cerrar del panel) terminó cubriendo casi toda la
   pantalla. Se veía perfecto: el botón estaba en su esquina, del tamaño correcto, y una captura no
   mostraba nada raro. Pero cualquier toque en cualquier parte del panel caía en ese pseudo-elemento
   invisible y cerraba el panel. Lo descubrió un supervisor usándolo, no nosotros.

   LA TÉCNICA: barrer la pantalla con `elementFromPoint` y contar quién contesta. Un elemento que
   contesta en más del 60 % de los puntos está acaparando la superficie táctil. Es la única forma
   de ver esto: no se ve en el DOM, no se ve en una captura, y sólo aparece al tocar.

   ⚠️ SE PRUEBA A 390 px, el ancho del iframe del panel. Es deliberado: el bug real apareció en un
   teléfono, y es el ancho donde los elementos se superponen más. */

PRUEBAS.grupo('Cliente · superficie táctil');

/* Barre una grilla de puntos y devuelve quién contesta en cada uno. */
function barrer() {
  const W = window.innerWidth, H = window.innerHeight, cuenta = {};
  const pasoX = Math.max(15, Math.floor(W / 22));
  const pasoY = Math.max(15, Math.floor(H / 30));
  let total = 0;
  for (let x = 8; x < W; x += pasoX) {
    for (let y = 8; y < H; y += pasoY) {
      const e = document.elementFromPoint(x, y);
      if (!e) continue;
      const k = e.tagName + '.' + (String(e.className).split(' ')[0] || '');
      cuenta[k] = (cuenta[k] || 0) + 1;
      total++;
    }
  }
  return { cuenta, total };
}

function elMasAcaparador(r) {
  let peor = null;
  Object.keys(r.cuenta).forEach(k => {
    const frac = r.cuenta[k] / r.total;
    if (!peor || frac > peor.frac) peor = { quien: k, frac: +frac.toFixed(3) };
  });
  return peor || { quien: '(nada)', frac: 0 };
}

PRUEBAS.caso('el inicio: ningún elemento acapara la pantalla', () => {
  CTX.resetear();
  window.scrollTo(0, 0);
  const r = barrer();
  const peor = elMasAcaparador(r);
  PRUEBAS.alMenos(r.total, 100,
    'si el barrido midió pocos puntos, la pantalla estaba vacía y el caso no probó nada');
  PRUEBAS.comoMucho(peor.frac, 0.6,
    'un elemento que contesta en más del 60% de los toques está tapando la pantalla: ' +
    'es el bug del ::after de .portal-x, que se veía bien pero se comía todos los toques (acapara: ' + peor.quien + ')');
});

PRUEBAS.caso('los botones del encabezado reciben su propio toque', () => {
  /* J1 juntó los dos botones en un contenedor. Si uno quedara encima del otro, tocar "editar"
     abriría notificaciones — y nadie lo notaría hasta que un piloto se queje. */
  CTX.resetear();
  window.scrollTo(0, 0);
  const botones = [...document.querySelectorAll('.hh-acciones button')];
  PRUEBAS.alMenos(botones.length, 2, 'el encabezado tiene que tener sus dos botones de acción');
  botones.forEach((b, i) => {
    const r = b.getBoundingClientRect();
    const quien = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    PRUEBAS.cierto(quien && b.contains(quien),
      'el botón ' + (i + 1) + ' del encabezado tiene que recibir su propio toque, no el de su vecino');
  });
});

PRUEBAS.caso('los botones cumplen el mínimo de 44 px', () => {
  /* Se usa con guantes, en un hangar, a veces de noche. Un botón chico no es una molestia:
     es un toque que no entra. */
  CTX.resetear();
  window.scrollTo(0, 0);
  const chicos = [];
  document.querySelectorAll('#viewInicio button, #viewInicio a[href]').forEach(b => {
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;          // oculto: no cuenta
    if (r.height < 44 || r.width < 44) {
      chicos.push((String(b.className).split(' ')[0] || b.tagName) +
        ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  });
  PRUEBAS.igual(chicos, [],
    'con guantes y de noche, un objetivo de menos de 44 px es un toque que no entra');
});

PRUEBAS.caso('no hay desborde horizontal', () => {
  /* Un desborde lateral en un teléfono se siente como que la app está rota, y esconde contenido
     a la derecha que nadie va a buscar. */
  CTX.resetear();
  window.scrollTo(0, 0);
  const desbordados = [];
  document.querySelectorAll('#viewInicio *').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > window.innerWidth + 1.5) {
      desbordados.push(String(e.className).split(' ')[0] || e.tagName);
    }
  });
  PRUEBAS.falso(document.documentElement.scrollWidth > window.innerWidth + 1,
    'la página no puede scrollear de costado');
  PRUEBAS.igual([...new Set(desbordados)], [],
    'ningún elemento puede pasarse del borde derecho: esconde contenido que nadie va a buscar');
});
