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
