/* ══════════════════════════════════════════════════════════════════════════════════════════════
   F091 · EN EL IPHONE, LA ✕ DEL PANEL NO RESPONDÍA (2026-11-03)
   Franco: «en iphone la barra de arriba tosquea los botones, osea rafael no puede darla ala x tiene que girar el
   celiular» y «osea esta roto, no puede darle a la X ni salir».
   La causa: la app pide ocupar también la franja de la barra del sistema (`viewport-fit=cover` con la barra
   translúcida). El cuerpo de la página lo compensa, pero las capas fijas (`.overlay`, `inset: 0`) no: a pantalla
   completa el panel arrancaba en el borde de arriba, su barra quedaba debajo de la hora y la batería, e iOS se
   queda con los toques de esa franja. Acostado, el iPhone esconde la barra y la ✕ volvía a responder.
   Chrome no tiene esa barra: `env(safe-area-inset-top)` vale 0. Por eso el alto vive en el token
   `--area-segura-arriba`, y estos casos SIMULAN el iPhone poniéndole 47 px (de pie, un iPhone con isla o muesca
   tiene entre 47 y 59). R19: lo concede el CSS de F091 (la capa deja ese alto arriba y la hoja lo descuenta).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('F091 · la barra del sistema del iPhone no tapa los botones');

const F091_BARRA = 47;
/* Las hojas entran con una animación (`.sheet`: de `translateY(20px)` a 0 en 0,28 s). Con la pestaña visible, medir
   apenas se abren da la hoja a mitad de camino, 20 px más abajo; la suite, oculta, ya corre con las animaciones
   apagadas (`html.sin-animaciones`). Se mide siempre así: la posición FINAL de la hoja. */
function f091SinAnimar(fn) {
  const h = document.documentElement, tenia = h.classList.contains('sin-animaciones');
  h.classList.add('sin-animaciones');
  try { return fn(); } finally { if (!tenia) h.classList.remove('sin-animaciones'); }
}
function f091ConIphone(fn) {
  const h = document.documentElement, antes = h.style.getPropertyValue('--area-segura-arriba');
  h.style.setProperty('--area-segura-arriba', F091_BARRA + 'px');
  try { return fn(); }
  finally { if (antes) h.style.setProperty('--area-segura-arriba', antes); else h.style.removeProperty('--area-segura-arriba'); }
}
/* El panel abierto en la puerta (la ✕ de la entrada) o en el panel (la ✕ de su barra), devolviendo todo como estaba. */
function f091ConPortal(modo, fn) {
  const ovl = document.getElementById('portalOverlay'), gate = document.getElementById('portalGate'), dash = document.getElementById('portalDash');
  const antes = { cls: ovl.className, gate: gate.getAttribute('style'), dash: dash.getAttribute('style') };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    ovl.classList.add('show');
    gate.style.display = modo === 'puerta' ? '' : 'none';
    dash.style.display = modo === 'panel' ? 'flex' : 'none';
    return f091SinAnimar(fn);
  } finally { ovl.className = antes.cls; volver(gate, antes.gate); volver(dash, antes.dash); }
}
const f091Caja = sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };

PRUEBAS.caso('🔴 F091 · iPhone de pie: la ✕ de la puerta del panel queda debajo de la barra del sistema', () => {
  PRUEBAS.enVentana(375, 812, () => f091ConIphone(() => f091ConPortal('puerta', () => {
    const x = f091Caja('#portalGate .portal-x'), hoja = f091Caja('.sheet.portal');
    PRUEBAS.cierto(!!x && x.width > 0, 'guarda: la ✕ de la puerta está en pantalla');
    if (!x) return;
    PRUEBAS.cierto(x.top >= F091_BARRA, 'la ✕ empieza debajo de la barra: ' + Math.round(x.top) + ' ≥ ' + F091_BARRA);
    PRUEBAS.cierto(hoja.top >= F091_BARRA - 1, 'la hoja del panel arranca debajo de la barra: ' + Math.round(hoja.top));
    PRUEBAS.cierto(hoja.bottom <= innerHeight + 1, 'y descuenta su alto: no se sale por abajo (' + Math.round(hoja.bottom) + ' de ' + innerHeight + ')');
  })));
});

PRUEBAS.caso('🔴 F091 · iPhone de pie: la ✕ del panel abierto también queda debajo de la barra', () => {
  PRUEBAS.enVentana(375, 812, () => f091ConIphone(() => f091ConPortal('panel', () => {
    const x = f091Caja('#portalDash .dash-top .portal-x'), barra = f091Caja('#portalDash .dash-top');
    PRUEBAS.cierto(!!x && x.width > 0, 'guarda: la ✕ del panel está en pantalla');
    if (!x) return;
    PRUEBAS.cierto(x.top >= F091_BARRA, 'la ✕ empieza debajo de la barra del sistema: ' + Math.round(x.top) + ' ≥ ' + F091_BARRA);
    PRUEBAS.cierto(barra.top >= F091_BARRA - 1, 'la barra del panel también: ' + Math.round(barra.top));
  })));
});

PRUEBAS.caso('🔴 F091 · iPad acostado (el panel a pantalla completa en escritorio): ídem', () => {
  PRUEBAS.enVentana(1024, 768, () => f091ConIphone(() => f091ConPortal('panel', () => {
    const hoja = f091Caja('.sheet.portal');
    PRUEBAS.cierto(hoja.top >= F091_BARRA - 1, 'la hoja arranca debajo de la barra: ' + Math.round(hoja.top));
    PRUEBAS.cierto(hoja.bottom <= innerHeight + 1, 'y no se sale por abajo (' + Math.round(hoja.bottom) + ' de ' + innerHeight + ')');
  })));
});

PRUEBAS.caso('🔴 F091 · Gestiones, que ocupa la pantalla entera, también arranca debajo de la barra', () => {
  const ov = document.getElementById('gestionesOverlay');
  PRUEBAS.cierto(!!ov, 'guarda: la capa de Gestiones existe');
  if (!ov) return;
  const antes = ov.className;
  try {
    PRUEBAS.enVentana(375, 812, () => f091ConIphone(() => f091SinAnimar(() => {
      ov.classList.add('show');
      const hoja = f091Caja('#gestionesOverlay .gest-sheet');
      PRUEBAS.cierto(!!hoja && hoja.height > 0, 'guarda: la hoja de Gestiones está en pantalla');
      if (!hoja) return;
      PRUEBAS.cierto(hoja.top >= F091_BARRA - 1, 'arranca debajo de la barra: ' + Math.round(hoja.top));
      PRUEBAS.cierto(hoja.bottom <= innerHeight + 1, 'y no se sale por abajo (' + Math.round(hoja.bottom) + ' de ' + innerHeight + ')');
    })));
  } finally { ov.className = antes; }
});

/* Mide la CAPA, no una ✕: que el `padding` deje lugar no garantiza que la ✕ lo use (la ✕ es absoluta). Las ✕ reales
   las mide el caso de arriba; el verificador marcó que con el título viejo este caso prometía más de lo que medía. */
PRUEBAS.caso('F091 · la capa de las hojas (.overlay) deja arriba, como mínimo, el alto de la barra', () => {
  const d = document.createElement('div');
  d.className = 'overlay';
  document.body.appendChild(d);
  try {
    const sin = parseFloat(getComputedStyle(d).paddingTop);
    const con = f091ConIphone(() => parseFloat(getComputedStyle(d).paddingTop));
    PRUEBAS.cierto(Math.abs(sin - parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.2) <= 1, 'sin barra, el aire de siempre (1,2rem): ' + sin);
    PRUEBAS.igual(con, F091_BARRA, 'con la barra del iPhone, deja su alto entero');
  } finally { d.remove(); }
});

/* El verificador de F091 encontró cinco ✕ más debajo de la barra: cuatro hojas (Opinión, Quién ve qué, Mis datos, el
   ciclo en grande) con «reducir movimiento» —la ✕ es absoluta y su referencia era la hoja sólo por el `transform` de la
   animación—, y la ventana de la documentación, siempre. R19: lo conceden `.sheet { position: relative }` y
   `.doc-win { top: var(--area-segura-arriba) }`. Se recorren TODAS las capas con ✕, así una hoja nueva entra sola. */
PRUEBAS.caso('🔴 F091 · iPhone de pie y sin animaciones: ninguna ✕ de capa queda debajo de la barra', () => {
  const medidas = [];
  PRUEBAS.enVentana(375, 812, () => f091ConIphone(() => f091SinAnimar(() => {
    document.querySelectorAll('.overlay').forEach(ov => {
      if (!ov.querySelector('.portal-x')) return;
      const antes = ov.className;
      try {
        ov.classList.add('show');
        ov.querySelectorAll('.portal-x').forEach(x => {
          const c = x.getBoundingClientRect();
          if (c.width > 0 && c.height > 0) medidas.push({ id: ov.id, top: c.top });
        });
      } finally { ov.className = antes; }
    });
  })));
  const ids = new Set(medidas.map(m => m.id));
  PRUEBAS.cierto(['opinionOv', 'privOv', 'misDatosOv', 'cicFullOv', 'docOverlay'].every(id => ids.has(id)),
    'guarda: se midieron las cinco que encontró el verificador (medidas: ' + [...ids].join(', ') + ')');
  const debajo = medidas.filter(m => m.top < F091_BARRA);
  PRUEBAS.cierto(debajo.length === 0, 'ninguna ✕ empieza debajo de la barra (' + medidas.length + ' medidas): ' +
    (debajo.map(m => m.id + ' a ' + Math.round(m.top)).join(', ') || 'ninguna'));
});

/* Hallazgo 4 del verificador: `calc(100dvh - var(...))` en un navegador sin `dvh` (iOS 15.0 a 15.3, Chrome < 108) se
   acepta al leer el CSS —con `var()` adentro, todavía no se puede validar— y se invalida al calcular: el alto queda en
   `auto`, la hoja crece con el contenido y la ✕ se va de la pantalla. Un `100dvh` a secas se descarta al leer y gana la
   línea de antes. Este Chrome SÍ tiene `dvh`, así que el síntoma no se reproduce acá: se mide la condición, en todo el
   CSS de la app. */
PRUEBAS.caso('F091 · ningún alto con dvh y var() queda sin su @supports', () => {
  const sueltas = [];
  const recorrer = (reglas, cubierta) => {
    for (const r of reglas) {
      if (r instanceof CSSStyleRule) {
        if (cubierta) continue;
        for (let i = 0; i < r.style.length; i++) {
          const v = r.style.getPropertyValue(r.style[i]);
          if (/dvh/.test(v) && /var\(/.test(v)) sueltas.push(r.selectorText + ' { ' + r.style[i] + ' }');
        }
      } else if (r.cssRules) {
        recorrer(r.cssRules, cubierta || (r instanceof CSSSupportsRule && /dvh/.test(r.conditionText)));
      }
    }
  };
  let leidas = 0;
  for (const h of document.styleSheets) { try { recorrer(h.cssRules, false); leidas++; } catch (e) { /* hoja ajena */ } }
  PRUEBAS.cierto(leidas > 0, 'guarda: se leyó al menos una hoja de estilos');
  PRUEBAS.igual(sueltas.length, 0, 'sin su @supports: ' + (sueltas.join(' · ') || 'ninguna'));
});

PRUEBAS.caso('F091 · sin barra del sistema (Chrome, Android, escritorio) el panel queda como antes', () => {
  /* El control de los casos de arriba: con el token en su valor de siempre (`env()` vale 0 fuera del iPhone), la hoja
     ocupa la pantalla entera y la ✕ queda a 1rem del borde, como en la 7.59. */
  PRUEBAS.enVentana(375, 812, () => f091ConPortal('puerta', () => {
    const hoja = f091Caja('.sheet.portal'), x = f091Caja('#portalGate .portal-x');
    PRUEBAS.cierto(Math.abs(hoja.top) <= 1 && Math.abs(hoja.height - innerHeight) <= 1, 'la hoja ocupa la pantalla entera: ' + Math.round(hoja.top) + ' · ' + Math.round(hoja.height) + ' de ' + innerHeight);
    PRUEBAS.cierto(x.top < F091_BARRA, 'y la ✕ está donde estaba: ' + Math.round(x.top));
  }));
});
