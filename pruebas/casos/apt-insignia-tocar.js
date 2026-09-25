PRUEBAS.grupo('R13 · la insignia «se toca» de Aptitud: fondo blanco a mano sobre la tarjeta oscura');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   `.apt-tap` es el circulito con la flecha que marca «este cuadro se toca». Su fondo estaba
   escrito a mano —`rgba(255,255,255,.75)`— y la flecha usaba `var(--ac)`, que es el color de
   RELLENO del estado. En tema oscuro eso es un círculo BLANCO sobre la tarjeta, con una flecha
   amarilla clara encima: medido en el navegador, `rgb(240,192,74)` sobre blanco da 1,7.
   La insignia que existe para decir «esto se toca» era justo la que no se veía. Y además es una
   superficie clara en tema oscuro, que es el otro objetivo de R13 («0 superficies claras»).

   Dos errores en una regla, los dos ya conocidos:
   · color a mano en vez de token (`--sobre-card` está definido en los DOS temas);
   · relleno usado como tinta — lo mismo que I6 encontró en la nota médica y P198 en el veredicto
     del PVT.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function aptTapLum(css){
  const m = String(css || '').trim();
  let r, g, b;
  if (m[0] === '#'){
    const h = m.length === 4 ? m.slice(1).split('').map(c => c + c).join('') : m.slice(1);
    r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); b = parseInt(h.slice(4,6),16);
  } else {
    const n = m.match(/[\d.]+/g); if (!n || n.length < 3) return null;
    r = +n[0]; g = +n[1]; b = +n[2];
  }
  if ([r,g,b].some(v => isNaN(v))) return null;
  const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
}
// Resuelve `var(--x)` contra :root y devuelve el ratio entre dos valores CSS.
function aptTapRatio(a, b){
  const cs = getComputedStyle(document.documentElement);
  const val = v => { const m = String(v||'').match(/^var\((--[a-z0-9-]+)\)$/i);
    return m ? cs.getPropertyValue(m[1]).trim() : String(v||'').trim(); };
  const la = aptTapLum(val(a)), lb = aptTapLum(val(b));
  if (la == null || lb == null) return null;
  return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}

['claro', 'oscuro'].forEach(tema => {
  PRUEBAS.caso('🔴 R13 · la flecha de «se toca» se lee sobre su círculo · tema ' + tema, () => {
    PRUEBAS.enTema(tema, () => {
      /* La tinta sale de `APT_ESTADOS`, que es de donde la saca `aptTarjeta` por `est.ct` (R17: se
         recorre la tabla real, no una lista copiada). Se miden los SIETE estados, no sólo los que
         la demostración pinta. */
      const estados = Object.keys(APT_ESTADOS);
      PRUEBAS.alMenos(estados.length, 5, 'guarda: hay estados que medir');
      estados.forEach(k => {
        const r = aptTapRatio(APT_ESTADOS[k].ct, 'var(--sobre-card)');
        PRUEBAS.cierto(r != null,
          'guarda de medibilidad: `' + APT_ESTADOS[k].ct + '` y `--sobre-card` resuelven en ' + tema +
          ' · un `var()` que no resuelve computa a `inherit` SIN error en consola');
        if (r == null) return;
        PRUEBAS.alMenos(Math.round(r * 100), 450,
          '🔴 ' + k + ' · ' + APT_ESTADOS[k].ct + ' sobre --sobre-card = ' + r.toFixed(2) + ':1');
      });
      /* DISCRIMINADOR · con lo que había antes —relleno sobre blanco fijo— la medición tiene que
         encontrar al menos un estado por debajo de 4,5. Sin esto, los sietes de arriba podrían
         estar pasando porque la función mide mal. */
      const malosAntes = estados.filter(k => {
        const r = aptTapRatio(APT_ESTADOS[k].c, '#ffffff');
        return r != null && r < 4.5;
      });
      PRUEBAS.alMenos(malosAntes.length, 1,
        '⚠️ DISCRIMINADOR · con el relleno sobre el blanco fijo la medición SÍ se pone en rojo · ' + malosAntes.join(', '));
    });
  });
});

PRUEBAS.caso('🔴 R13 · y no queda ningún color escrito a mano en la insignia', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('.apt-tap {');
    PRUEBAS.cierto(i > 0, 'guarda: la regla existe · si alguien la renombra, este caso tiene que caerse, no pasar');
    const regla = src.slice(i, src.indexOf('}', i));
    PRUEBAS.igual(regla.match(/#[0-9a-fA-F]{3,8}|rgba?\(/g), null,
      '🔴 ningún literal de color en `.apt-tap` · el que había era `rgba(255,255,255,.75)`');
    PRUEBAS.cierto(regla.indexOf('var(--sobre-card)') > 0,
      'y usa el token de las superficies que tapan, que está en los dos temas');
    const j = src.indexOf('.apt-tap svg {');
    const svg = src.slice(j, src.indexOf('}', j));
    PRUEBAS.cierto(/var\(--act,\s*var\(--ac\)\)/.test(svg),
      '🔴 y la flecha se pinta con la TINTA del estado, con el relleno sólo como respaldo');
  });
});
