PRUEBAS.grupo('P418 · en el teléfono todo se lee entero: letra de 12 px para arriba y nada con «…»');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Pedido de Franco (F121b, 2026-11-13; panel del 2026-11-19: «eso es grave»). El barrido de F121
   (iPhones emulados, cuatro tamaños de letra; `docs/specs/P418/`, fuera del repo) encontró con la
   letra Normal 64 textos por debajo de 12 px en las pantallas de la persona —el ciclo de hoy, el
   calendario, la actividad, la barra de abajo, el pie de «Más», el contador de los tests— y
   «Descanso · 10 h» con «…» en la barra del ciclo. Criterio (memoria `silva-usuarios-de-40-para-
   arriba`): 12 px para arriba con la letra Normal, y lo que no entra va en otro renglón, nunca con
   «…». «Grande», para Franco, eran *«textos incompletos porque no entraban»*.

   Se mide la capa a la vista por el camino real (`mostrarVista`, `masAbrir`), con un nombre largo
   como el de una persona de verdad. Cada caso lleva su discriminador: lo mismo, roto a propósito.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const P418_LARGO = { nombre: 'María Alejandra Rodríguez Fernández de los Santos', cargo: 'Administrador',
  departamento: 'Operaciones Aéreas y Mantenimiento', empresa: 'Consorcio HELITEC Venezuela' };

function p418Visible(el) {
  try { if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; } catch (e) {}
  const r = el.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5;
}
/* Los elementos que llevan texto propio (un nodo de texto hijo directo) y se ven. */
function p418ConTexto(raiz) {
  return [...raiz.querySelectorAll('*')].filter(el => !/^(SCRIPT|STYLE|OPTION)$/i.test(el.tagName) &&
    [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && p418Visible(el));
}
function p418Nombre(el) { return (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ' «' + el.textContent.trim().slice(0, 30) + '»'; }
function p418Chicos(raices) {
  const out = [];
  raices.forEach(r => p418ConTexto(r).forEach(el => { const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11.95) out.push(p418Nombre(el) + ' ' + fs.toFixed(1) + 'px'); }));
  return out;
}
function p418Elipsis(raices) {
  const out = [];
  raices.forEach(r => p418ConTexto(r).forEach(el => { const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(p418Nombre(el) + ' le faltan ' + (el.scrollWidth - el.clientWidth) + 'px'); }));
  return out;
}
/* Las pantallas de la persona, por sus botones: el inicio, «Más» con cada desplegable abierto. */
function p418Recorrer(medir) {
  const nav = document.getElementById('bottomNav');
  const res = [];
  mostrarVista('inicio'); res.push(...medir([document.getElementById('viewInicio'), nav]));
  mostrarVista('mas'); res.push(...medir([document.getElementById('viewMas')]));
  ['idiomaCtrl', 'textoCtrl', 'temaCtrl', 'avisosCtrl'].forEach(id => { masAbrir(id); res.push(...medir([document.getElementById(id)])); masCerrar(); });
  mostrarVista('inicio');
  return [...new Set(res)];
}
var _p418SinAnim;
function p418Arrancar(perfil) {
  CTX.resetear(perfil); syncScrollLock();   // ver `f121-hueco-al-pie.js`: resetear no suelta el inert del alta
  _p418SinAnim = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');   // los desplegables abren con transición
}
function p418Limpiar(estilo) {
  try { if (estilo) estilo.remove(); } catch (e) {}
  try { masCerrar(); } catch (e) {}
  try { if (!_p418SinAnim) document.documentElement.classList.remove('sin-animaciones'); } catch (e) {}
  try { mostrarVista('inicio'); window.scrollTo(0, 0); } catch (e) {}
}

PRUEBAS.caso('🔴 con la letra Normal, ningún texto de las pantallas de la persona queda por debajo de 12 px', () => {
  p418Arrancar(P418_LARGO);
  let sabotaje = null;
  try {
    PRUEBAS.igual(getComputedStyle(document.documentElement).fontSize, '16px', 'guarda: la letra es la Normal');
    const n = p418ConTexto(document.getElementById('viewInicio')).length;
    PRUEBAS.alMenos(n, 20, 'guarda: el inicio tiene textos que medir · ' + n);
    PRUEBAS.igual(p418Recorrer(p418Chicos), [], '⚠️ nada por debajo de 12 px · antes eran 64 (el calendario a 9,6, la barra del ciclo a 9,9)');
    /* Discriminador: un texto achicado a propósito tiene que aparecer. */
    sabotaje = document.createElement('style'); sabotaje.textContent = '#verTag { font-size: 9px !important; }';
    document.head.appendChild(sabotaje);
    PRUEBAS.cierto(p418Recorrer(p418Chicos).some(x => /verTag/.test(x)), 'DISCRIMINADOR: la versión a 9 px se ve como chica');
  } finally { p418Limpiar(sabotaje); }
});

PRUEBAS.caso('🔴 con un nombre largo, nada de la persona se corta con «…»', () => {
  p418Arrancar(P418_LARGO);
  let sabotaje = null;
  try {
    PRUEBAS.cierto(/María Alejandra/.test(document.getElementById('hhFull').textContent), 'guarda: el encabezado muestra el nombre largo');
    PRUEBAS.igual(p418Recorrer(p418Elipsis), [], '⚠️ ningún texto con «…» · antes el nombre del encabezado y los tramos del ciclo');
    sabotaje = document.createElement('style');
    sabotaje.textContent = '#hhFull { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }';
    document.head.appendChild(sabotaje);
    PRUEBAS.cierto(p418Recorrer(p418Elipsis).some(x => /hhFull/.test(x)), 'DISCRIMINADOR: el nombre en un renglón con «…» se ve como cortado');
  } finally { p418Limpiar(sabotaje); }
});

PRUEBAS.caso('la barra del ciclo: el rótulo de cada tramo, a 12 px y sin «…» (puede ir en dos renglones)', () => {
  p418Arrancar(P418_LARGO);
  try {
    const spans = [...document.querySelectorAll('#viewInicio .cic-seg span')].filter(p418Visible);
    PRUEBAS.alMenos(spans.length, 2, 'guarda: la barra del ciclo está dibujada con sus tramos · ' + spans.length);
    spans.forEach(s => {
      const cs = getComputedStyle(s);
      PRUEBAS.alMenos(parseFloat(cs.fontSize), 11.95, 'el rótulo «' + s.textContent + '» a 12 px · era 9,9');
      PRUEBAS.cierto(cs.textOverflow !== 'ellipsis', 'y sin «…» · «' + s.textContent + '»');
      PRUEBAS.comoMucho(s.scrollWidth - s.clientWidth, 1, 'y entra a lo ancho · «' + s.textContent + '»');
    });
  } finally { p418Limpiar(null); }
});

/* ── Fase 2 · lo de la persona que el barrido de la fase 1 no alcanzaba ─────────────────────── */

PRUEBAS.caso('🔴 la grilla del Samn-Perelli: los rótulos de la escala a 12 px, enteros y sin pisarse (375, letra Normal y «Muy grande»)', () => {
  /* Iban a .58rem (9,3 px) partidos adentro de columnas de 32 px. El derecho lo da `perelliEscalonarRotulos` (los sube de
     renglón cuando se pisarían) y el CSS de `.rtable-hcell > span` (entero, sin partir). */
  const foto = () => {
    const sp = [...document.querySelectorAll('#testOptions .rtable-hcell > span')], rs = sp.map(s => s.getBoundingClientRect());
    const pisan = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], c = rs[j];
      if (a.left < c.right - .5 && a.right > c.left + .5 && a.top < c.bottom - .5 && a.bottom > c.top + .5) pisan.push(sp[i].textContent + '×' + sp[j].textContent); }
    return { n: sp.length, fs: sp.length ? parseFloat(getComputedStyle(sp[0]).fontSize) : 0, pisan: pisan,
             fuera: rs.filter(x => x.left < -1 || x.right > innerWidth + 1).length };
  };
  const pintar = (nivel, sinEscalonar) => {
    const orig = window.perelliEscalonarRotulos;
    p418Arrancar(P418_LARGO);
    let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
    try {
      fijarTamanoTexto(nivel);
      if (sinEscalonar) window.perelliEscalonarRotulos = function () {};
      return PRUEBAS.enVentana(375, 812, () => {
        const it = seccionesApp().flatMap(s => s.items || []).find(i => i.testFlow === 'perelli');
        abrirTest(it);
        perelliState.stepIdx = PERELLI_STEPS.findIndex(s => s.type === 'rating-grid');
        renderPerelliStep();
        return foto();
      });
    } finally {
      window.perelliEscalonarRotulos = orig;
      try { cerrarTest(); } catch (e) {}
      try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
      aplicarTamanoTexto(); p418Limpiar(null);
    }
  };
  [1, 3].forEach(n => {
    const r = pintar(n, false);
    PRUEBAS.igual(r.n, 5, 'guarda: la grilla está pintada con sus cinco rótulos (letra ' + n + ')');
    PRUEBAS.alMenos(r.fs, n === 1 ? 11.95 : 16, '🔴 a 12 px con la letra Normal (y más con la grande) · ' + r.fs.toFixed(1));
    PRUEBAS.igual(r.pisan, [], '🔴 ninguno pisa al de al lado (letra ' + n + ')');
    PRUEBAS.igual(r.fuera, 0, 'ninguno se sale de la pantalla (letra ' + n + ')');
  });
  /* DISCRIMINADOR: sin el reparto en renglones, se pisan. */
  PRUEBAS.cierto(pintar(3, true).pisan.length > 0, 'DISCRIMINADOR · sin escalonar, los rótulos se pisan');
});

PRUEBAS.caso('el `<small>` sin regla propia no baja de 12 px con la letra Normal', () => {
  /* El derecho lo da la regla `small { font-size: max(.75rem, .83em) }`. Encontrado en el panel: el rol entre paréntesis
     de la bitácora, adentro de un texto de .78rem, daba 10,3 px. */
  const caja = document.createElement('div');
  caja.innerHTML = '<span style="font-size:.78rem">texto <small id="p418Small">(Supervisor)</small></span>';
  document.body.appendChild(caja);
  let sab = null;
  try {
    PRUEBAS.igual(getComputedStyle(document.documentElement).fontSize, '16px', 'guarda: la letra es la Normal');
    const fs = () => parseFloat(getComputedStyle(document.getElementById('p418Small')).fontSize);
    PRUEBAS.alMenos(fs(), 11.95, '🔴 el `<small>` a 12 px · era 10,3');
    sab = document.createElement('style'); sab.textContent = 'small { font-size: smaller !important; }'; document.head.appendChild(sab);
    PRUEBAS.cierto(fs() < 11.95, 'DISCRIMINADOR · con el `smaller` del navegador vuelve a quedar chico · ' + fs().toFixed(1));
  } finally { if (sab) sab.remove(); caja.remove(); }
});

PRUEBAS.caso('🔴 el splash con la letra Normal: la tira, las etiquetas de estado, el monitor y el pie a 12 px para arriba (375×812)', () => {
  /* Las etiquetas («Proyectando», «Analizando») iban a 10,6 px, el monitor de la lámina 6 a 9,6, «Idioma» a 10,6 y la nota
     de la norma a 11,2. El monitor va con tope en px como el resto de la tira (`.spl-mon i/u`): que la lámina no se pase de
     su tarjeta lo cuida `m5-coherencia-visual.js`. */
  const ov = document.getElementById('splashOv');
  const ya = ov.classList.contains('show'), sinAnim = document.documentElement.classList.contains('sin-animaciones');
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  let sab = null;
  /* Sin mirar la opacidad: la tira entra con un fundido que en la pestaña oculta no corre. */
  const textos = () => [...ov.querySelectorAll('*')].filter(el => !/^(SCRIPT|STYLE|OPTION)$/i.test(el.tagName) && !(el instanceof SVGElement) &&
    [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && (() => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return true; } })() &&
    el.getBoundingClientRect().width > 0.5);
  const chicas = () => textos().filter(el => parseFloat(getComputedStyle(el).fontSize) < 11.95).map(el => p418Nombre(el) + ' ' + parseFloat(getComputedStyle(el).fontSize).toFixed(1));
  try {
    document.documentElement.classList.add('sin-animaciones');
    fijarTamanoTexto(1);
    PRUEBAS.enVentana(375, 812, () => {
      ov.classList.add('show'); void document.body.offsetWidth;
      const n = textos().length;
      PRUEBAS.alMenos(n, 15, 'guarda: el splash está pintado con su tira · ' + n);
      PRUEBAS.igual(chicas(), [], '🔴 nada por debajo de 12 px en el splash');
      sab = document.createElement('style'); sab.textContent = '.spl-chip { font-size: 9px !important; }'; document.head.appendChild(sab);
      PRUEBAS.cierto(chicas().some(x => /spl-chip/.test(x)), 'DISCRIMINADOR · una etiqueta de estado a 9 px se ve como chica');
    });
  } finally {
    if (sab) sab.remove();
    if (!ya) ov.classList.remove('show');
    if (!sinAnim) document.documentElement.classList.remove('sin-animaciones');
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto();
  }
});

/* ══ FASE 2b · 320 px: el iPhone con «Zoom de pantalla → Ampliado» (y lo que sólo se ve con letra grande) ══════════ */

PRUEBAS.caso('🔴 el carrusel de bienvenida: en sus cinco láminas «Siguiente» y «Registrarse» entran enteros (375 y 320, letra grande)', () => {
  /* Desde la 2.ª lámina aparece «Atrás» y la fila «Saltar · Atrás · Siguiente» no entraba: con «Muy grande», «Registrarse»
     quedaba 7 px fuera de la pantalla a 375 (SE) y 62 a 320, con el texto cortado; con «Grande» a 320, 3 a 20. El derecho
     lo da `.car-nav { flex-wrap: wrap }` con `.car-sig { flex: 1 1 auto; width: auto }`: si no entra, baja a su renglón.
     Se pasa de lámina como lo hacen los puntos (`CAR_IDX = i; carruselPintar()`), sin `carruselMostrar`, que apila historial. */
  const ov = document.getElementById('carruselOv');
  const ya = ov.classList.contains('show'), idx0 = CAR_IDX, sinAnim = document.documentElement.classList.contains('sin-animaciones');
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  /* Y el TEXTO de cada lámina (verificador de P418): con la barra en dos renglones la lámina pierde 63 px, y como recortaba
     sin dejar desplazar, a 320×520 «Muy grande» la lámina 2 terminaba en «…funcionamiento sin». Lo que pasa por abajo de la
     lámina vale sólo si ella se desplaza (`overflow-y` real); lo que queda arriba de su borde no se alcanza nunca. */
  const textoDe = s => { let top = Infinity, bot = -Infinity; const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) { if (!t.textContent.trim() || getComputedStyle(t.parentElement).display === 'none') continue;
      const rg = document.createRange(); rg.selectNodeContents(t); for (const c of rg.getClientRects()) { if (!c.width) continue; top = Math.min(top, c.top); bot = Math.max(bot, c.bottom); } }
    return { top, bot }; };
  const mirar = () => { const out = [], btn = document.getElementById('carSigBtn'), laminas = [...document.querySelectorAll('#carTrack .car-slide')];
    for (let i = 0; i < 5; i++) { CAR_IDX = i; carruselPintar(); void document.body.offsetWidth;
      const r = btn.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1 || btn.scrollWidth > btn.clientWidth + 1)
        out.push('lámina ' + (i + 1) + ' «' + btn.textContent.trim() + '» ' + Math.round(r.left) + '…' + Math.round(r.right) + ' de ' + innerWidth);
      const s = laminas[i], S = s.getBoundingClientRect(), tx = textoDe(s), baja = /(auto|scroll)/.test(getComputedStyle(s).overflowY);
      if (tx.top < S.top - 1) out.push('lámina ' + (i + 1) + ': texto cortado arriba ' + Math.round(S.top - tx.top) + ' px');
      if (tx.bot > S.bottom + 1 && !baja) out.push('lámina ' + (i + 1) + ': texto cortado abajo ' + Math.round(tx.bot - S.bottom) + ' px, sin poder bajar'); }
    return out; };
  let sab = null;
  try {
    document.documentElement.classList.add('sin-animaciones');
    ov.classList.add('show');
    [[375, 667, 3], [320, 693, 2], [320, 693, 3], [320, 568, 3], [320, 520, 3]].forEach(([w, h, n]) => {   // 320×520: Safari con zoom y sus barras
      fijarTamanoTexto(n);
      PRUEBAS.enVentana(w, h, () => {
        PRUEBAS.cierto(document.getElementById('carSigBtn').getBoundingClientRect().width > 0, 'guarda: a ' + w + '×' + h + ' el carrusel está a la vista');
        PRUEBAS.igual(mirar(), [], '🔴 a ' + w + '×' + h + ' con letra ' + n + ', el botón principal entra entero en las cinco láminas');
      });
    });
    sab = document.createElement('style'); sab.textContent = '.car-nav { flex-wrap: nowrap !important; }'; document.head.appendChild(sab);
    fijarTamanoTexto(3);
    const roto = PRUEBAS.enVentana(375, 667, mirar);
    PRUEBAS.cierto(roto.some(x => /lámina 5 «/.test(x)), 'DISCRIMINADOR · con la barra en un solo renglón, «Registrarse» sale de la pantalla · ' + roto.join(' | '));
    sab.textContent = '.car-slide { overflow-y: hidden !important; }';
    const corto = PRUEBAS.enVentana(320, 520, mirar);
    PRUEBAS.cierto(corto.some(x => /texto cortado/.test(x)), 'DISCRIMINADOR · con las láminas sin desplazar (como en la 7.75), el texto se corta · ' + corto.slice(0, 2).join(' | '));
  } finally {
    if (sab) sab.remove();
    CAR_IDX = idx0; try { carruselPintar(); } catch (e) {}
    if (!ya) ov.classList.remove('show');
    if (!sinAnim) document.documentElement.classList.remove('sin-animaciones');
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock();
  }
});

PRUEBAS.caso('🔴 «Mis datos» a 320 con «Muy grande»: el nombre y la cédula no se apilan letra por letra', () => {
  /* El nombre del dato (`.md-k`) no se achicaba y el valor (`.md-v`) se quedaba con lo que sobraba: 32 px, el nombre de la
     persona de 182 px de alto. El derecho lo da `.md-fila { flex-wrap: wrap }`: si el valor no entra al lado, baja entero al
     renglón de abajo (y `.md-k` puede achicarse partiendo en palabras). Se pinta con `misDatosPintar` (lo que hace `misDatosAbrir`, sin
     su entrada del historial). */
  p418Arrancar(P418_LARGO);
  const ov = document.getElementById('misDatosOv');
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  const apilados = () => [...ov.querySelectorAll('.md-v')].filter(p418Visible).filter(el => { const r = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize);
    return el.textContent.trim().length > 4 && r.width < fs * 2.2 && r.height > fs * 3.2; }).map(el => p418Nombre(el) + ' ' + Math.round(el.getBoundingClientRect().width) + '×' + Math.round(el.getBoundingClientRect().height));
  let sab = null;
  try {
    fijarTamanoTexto(3);
    misDatosPintar(); ov.classList.add('show'); syncScrollLock();
    [[320, 693], [320, 568], [375, 667]].forEach(([w, h]) => PRUEBAS.enVentana(w, h, () => {
      PRUEBAS.alMenos([...ov.querySelectorAll('.md-v')].filter(p418Visible).length, 3, 'guarda: a ' + w + '×' + h + ' la ficha muestra sus datos');
      PRUEBAS.cierto([...ov.querySelectorAll('.md-v')].some(el => /María Alejandra/.test(el.textContent)), 'guarda: con el nombre largo');
      PRUEBAS.igual(apilados(), [], '🔴 a ' + w + '×' + h + ' con «Muy grande», ningún dato se apila letra por letra');
    }));
    // La regla de la 7.75 entera: la fila sin envolver Y el nombre del dato sin achicarse (desde 2b también puede achicarse).
    sab = document.createElement('style'); sab.textContent = '.md-fila { flex-wrap: nowrap !important; } .md-k { flex: 0 0 auto !important; } .md-v { flex: 1 1 auto !important; }'; document.head.appendChild(sab);
    const roto = PRUEBAS.enVentana(320, 693, apilados);
    PRUEBAS.cierto(roto.length > 0, 'DISCRIMINADOR · con la fila sin envolver, el valor se apila · ' + roto.slice(0, 2).join(' | '));
  } finally {
    try { misDatosCerrar(); } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto();
    p418Limpiar(sab);
  }
});
