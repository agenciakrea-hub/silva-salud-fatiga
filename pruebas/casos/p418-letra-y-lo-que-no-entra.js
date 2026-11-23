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
