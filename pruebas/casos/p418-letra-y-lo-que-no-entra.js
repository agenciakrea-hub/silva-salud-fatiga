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

/* ── Fase 3 · el cartel de envíos con una ventana abierta ─────────────────────────────────────── */

PRUEBAS.caso('🔴 con una ventana abierta, el cartel de envíos va al borde de abajo y la ventana le deja su lugar: una de cada familia (375×667 y 320×568, letra Normal y «Muy grande»)', () => {
  /* Medido en la 7.77 (`docs/specs/P418/instrumento/medir-cartel-todas.js`, fuera del repo, las 32 ventanas en 7 tamaños):
     el cartel flotaba a la altura de la barra de abajo —que la ventana tapa— y tapaba algo en 27: «Enviar» de la opinión,
     «Siguiente» del carrusel, el último paso de las guías de instalación, la documentación, el panel. Lo que da el derecho:
     `body.modal-open .off-bar` (el cartel al borde) y, con `body.off-visible` —lo pone `offAltoPublicar`, que corre desde
     `offPintar` y `syncScrollLock`—, UNA REGLA POR FAMILIA de ventana que le descuenta `--off-reserva` (R24: el inventario
     de las siete familias está en `docs/specs/P418/plan.md` 3.2). Se abre una de cada familia y se mide su SUPERFICIE (lo
     que dibuja: la hoja, la tarjeta, la documentación), que tiene que terminar arriba del cartel. Las de pantalla completa,
     además, siguen llenando lo que queda —el borrador del 2026-11-23 achicaba la de la demostración—; la de contraseña,
     que va POR ENCIMA del cartel, no se corre (dejaba una franja vacía); y con el test abierto el cartel se esconde y nada
     reserva. El cartel se prende por su camino real: un envío trabado en la cola (rojo, dos o tres renglones).
     Se abren con su clase y `syncScrollLock`, sin los `abrir` que apilan historial (la suite tiene tope de 50 entradas). */
  const SUP = { opinionOv: '#opinionOv > .sheet', nominaListOv: '#nominaListOv > .gest-sheet', portalOverlay: '#portalOverlay > .sheet.portal',
                carruselOv: '#carruselOv > .car-wrap', docOverlay: '#docOverlay > .doc-win', iosModal: '#iosModal > .ios-card', claveOv: '#claveOv > .sheet' };
  const LLENAN = ['nominaListOv', 'portalOverlay', 'carruselOv', 'docOverlay'];   // a 375 y 320 son de pantalla completa
  const RESERVAN = ['opinionOv', 'nominaListOv', 'portalOverlay', 'carruselOv', 'docOverlay', 'iosModal'];
  const idx0 = CAR_IDX;
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  const cartel = on => { empColaSave(on ? { p418: { accion: 'opinion_guardar', payload: {}, creada: 1, trabado: true } } : {}); offPintar(); };
  const abrir = id => { document.getElementById(id).classList.add('show'); if (id === 'carruselOv') { CAR_IDX = 1; carruselPintar(); } syncScrollLock(); };
  const cerrar = id => { document.getElementById(id).classList.remove('show'); syncScrollLock(); };
  const medir = id => {
    abrir(id); cartel(false); void document.body.offsetWidth;
    const s = document.querySelector(SUP[id]), sin = s.getBoundingClientRect();
    cartel(true); void document.body.offsetWidth;
    const ob = document.getElementById('offBar'), b = ob.getBoundingClientRect(), con = s.getBoundingClientRect();
    const r = { id, cartel: getComputedStyle(ob).display !== 'none' && b.height > 0, alBorde: Math.round(innerHeight - b.bottom),
                hueco: Math.round(b.top - con.bottom), arriba: Math.round(con.top - sin.top), subio: Math.round(sin.bottom - con.bottom) };
    cartel(false); cerrar(id);
    return r;
  };
  const todas = () => Object.keys(SUP).map(medir);
  let sab = null;
  try {
    p418Arrancar();
    [[375, 667], [320, 568]].forEach(([w, h]) => [1, 3].forEach(n => {
      fijarTamanoTexto(n);
      PRUEBAS.enVentana(w, h, () => {
        const rs = todas(), tag = w + '×' + h + ' letra ' + n;
        PRUEBAS.cierto(rs.every(r => r.cartel), 'guarda: a ' + tag + ' el cartel está a la vista con cada ventana');
        rs.filter(r => r.id !== 'claveOv').forEach(r => PRUEBAS.comoMucho(r.alBorde, 12, 'a ' + tag + ', con #' + r.id + ' abierta el cartel va al borde de abajo · a ' + r.alBorde + ' px (antes ~99)'));
        RESERVAN.forEach(id => { const r = rs.find(x => x.id === id);
          PRUEBAS.cierto(r.hueco >= 7, '🔴 a ' + tag + ', #' + id + ' termina arriba del cartel · hueco ' + r.hueco + ' px (antes, el cartel la pisaba)'); });
        LLENAN.forEach(id => { const r = rs.find(x => x.id === id);
          PRUEBAS.cierto(r.arriba === 0 && Math.abs(r.hueco - 8) <= 1.5, '🔴 a ' + tag + ', #' + id + ' sigue llenando la pantalla · arriba se movió ' + r.arriba + ', hueco ' + r.hueco); });
        const c = rs.find(x => x.id === 'claveOv');
        PRUEBAS.igual(c.subio, 0, '🔴 a ' + tag + ', la de contraseña (por encima del cartel) no se corre · ' + c.subio + ' px');
      });
    }));
    /* Con el test abierto el cartel se esconde (`body:has(#testOverlay.show)`) y `syncScrollLock` lo publica: nada reserva. */
    fijarTamanoTexto(1);
    PRUEBAS.enVentana(375, 667, () => {
      cartel(true); abrir('opinionOv'); abrir('testOverlay');
      const ob = document.getElementById('offBar');
      PRUEBAS.cierto(getComputedStyle(ob).display === 'none' && !document.body.classList.contains('off-visible'),
        '🔴 con el test abierto el cartel se esconde y ninguna ventana le reserva lugar');
      cerrar('testOverlay'); cerrar('opinionOv'); cartel(false);
    });
    /* DISCRIMINADORES: (1) sin la reserva, las seis familias quedan bajo el cartel; (2) si la de contraseña reservara, se
       correría (la franja); (3) una hoja de pantalla completa con tope de más deja de llenar. */
    sab = document.createElement('style'); document.head.appendChild(sab);
    fijarTamanoTexto(1);
    sab.textContent = ':root { --off-reserva: 0px !important; }';
    const d1 = PRUEBAS.enVentana(375, 667, todas);
    PRUEBAS.igual(RESERVAN.filter(id => d1.find(x => x.id === id).hueco < 7), RESERVAN, 'DISCRIMINADOR · sin la reserva, las seis familias quedan bajo el cartel');
    sab.textContent = 'body.modal-open.off-visible #claveOv.show { padding-bottom: var(--off-reserva) !important; }';
    const d2 = PRUEBAS.enVentana(375, 667, () => medir('claveOv'));
    PRUEBAS.cierto(d2.subio > 0, 'DISCRIMINADOR · si la de contraseña reservara, se correría · ' + d2.subio + ' px');
    sab.textContent = 'body.modal-open.off-visible .gest-overlay.show > .gest-sheet { max-height: min(80vh, 100%) !important; }';
    const d3 = PRUEBAS.enVentana(375, 667, () => medir('nominaListOv'));
    PRUEBAS.cierto(d3.arriba !== 0 || Math.abs(d3.hueco - 8) > 1.5, 'DISCRIMINADOR · con un tope de más, la de pantalla completa deja de llenar · arriba ' + d3.arriba + ', hueco ' + d3.hueco);
  } finally {
    try { if (sab) sab.remove(); } catch (e) {}
    try { Object.keys(SUP).concat('testOverlay').forEach(id => document.getElementById(id).classList.remove('show')); } catch (e) {}
    try { CAR_IDX = idx0; carruselPintar(); } catch (e) {}
    try { empColaSave({}); offPintar(); } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock(); p418Limpiar(null);
  }
});

/* ── Fase 3 · lo que encontró el verificador: el aviso, la barra de versión y la demostración, con el cartel a la vista ─────────── */

function p418Cartel(on) { empColaSave(on ? { p418: { accion: 'opinion_guardar', payload: {}, creada: 1, trabado: true } } : {}); offPintar(); }

PRUEBAS.caso('🔴 con una ventana abierta y el cartel de envíos a la vista, el aviso («Deshacer») va ARRIBA del cartel y no lo tapa (375×667 y 393×852, letra Normal y «Muy grande»)', () => {
  /* El aviso (`.toast`, z 1100) se ubica a 1.4rem del borde; con el cartel ahora al borde le caía encima: 45–90 % del cartel
     durante los 4 s de «Deshacer» (verificador de la fase 3). El derecho lo da `body.modal-open.off-visible .toast { bottom:
     calc(var(--off-reserva) + .6rem) }`. Sin ventana abierta el cartel va sobre la barra y el aviso no lo toca (regla aparte). */
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  let sab = null;
  const medir = (id) => {
    document.getElementById(id).classList.add('show'); syncScrollLock(); p418Cartel(true); void document.body.offsetWidth;
    showToastAccion('Ausencia marcada para hoy', 'Deshacer', () => {}, 8000); void document.body.offsetWidth;
    const ob = document.getElementById('offBar'), b = ob.getBoundingClientRect(), tq = document.getElementById('toast').getBoundingClientRect();
    const alto = Math.max(0, Math.min(b.bottom, tq.bottom) - Math.max(b.top, tq.top)), ancho = Math.max(0, Math.min(b.right, tq.right) - Math.max(b.left, tq.left));
    const c = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2);
    const r = { cartel: getComputedStyle(ob).display !== 'none' && b.height > 0, solape: Math.round(alto * (ancho > 0 ? 1 : 0)), enElCentro: c ? (c.closest('#toast') ? 'aviso' : c.closest('#offBar') ? 'cartel' : (c.id || c.className)) : null };
    hideToast(); document.getElementById(id).classList.remove('show'); syncScrollLock(); p418Cartel(false);
    return r;
  };
  try {
    p418Arrancar();
    [[375, 667], [393, 852]].forEach(([w, h]) => [1, 3].forEach(n => { fijarTamanoTexto(n);
      PRUEBAS.enVentana(w, h, () => ['opinionOv', 'portalOverlay'].forEach(id => { const r = medir(id), tag = w + '×' + h + ' letra ' + n + ' con #' + id;
        PRUEBAS.cierto(r.cartel, 'guarda: a ' + tag + ' el cartel está a la vista');
        PRUEBAS.igual(r.solape, 0, '🔴 a ' + tag + ', el aviso no se superpone con el cartel · ' + r.solape + ' px');
        PRUEBAS.igual(r.enElCentro, 'cartel', 'y en el centro del cartel lo que se toca es el cartel · ' + r.enElCentro); })); }));
    sab = document.createElement('style'); sab.textContent = 'body.modal-open.off-visible .toast { bottom: 1.4rem !important; }'; document.head.appendChild(sab);
    fijarTamanoTexto(3);
    const d = PRUEBAS.enVentana(375, 667, () => medir('opinionOv'));
    PRUEBAS.cierto(d.solape > 0 || d.enElCentro === 'aviso', 'DISCRIMINADOR · con el aviso a 1.4rem del borde, le cae encima al cartel · ' + d.solape + ' px, en su centro: ' + d.enElCentro);
  } finally {
    try { if (sab) sab.remove(); } catch (e) {}
    try { hideToast(); ['opinionOv', 'portalOverlay'].forEach(id => document.getElementById(id).classList.remove('show')); p418Cartel(false); } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock(); p418Limpiar(null);
  }
});

PRUEBAS.caso('🔴 la barra de «versión nueva» no tapa la pregunta de «¿recordar este dispositivo?» cuando el cartel de envíos aparece DESPUÉS de ubicarla (375×667, 393×852)', () => {
  /* P392 ubica la barra arriba de la pregunta de recordar, pero sólo cuando cambia la clase de esa caja o del portal, o al girar.
     El cartel de envíos, que ahora sube esa pregunta con su reserva, no dispara nada de eso: con la barra ya puesta la tapaba
     entera (34 de 34 px a 375×667; verificador de la fase 3). El derecho: `offAltoPublicar` llama `versionBarraUbicar` cuando
     el alto del cartel cambia. Dos órdenes: barra puesta sin cartel y el cartel aparece (el que falló), y cartel primero. */
  const po = document.getElementById('portalOverlay'), dr = document.getElementById('dashRemember');
  const original = versionBarraUbicar;
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  const medir = (orden, sabotaje) => {
    p418Cartel(false);
    if (orden === 'B') p418Cartel(true);
    po.classList.add('show'); syncScrollLock(); dr.classList.add('show');
    versionNuevaAvisar(); void document.body.offsetWidth;   // la barra queda bien ubicada al crearla: lo que se mide es lo que pasa DESPUÉS
    if (sabotaje) window.versionBarraUbicar = function () {};
    if (orden === 'A') { p418Cartel(true); void document.body.offsetWidth; }
    const vb = document.getElementById('verNuevaBar'), a = vb.getBoundingClientRect(), q = dr.querySelector('span').getBoundingClientRect();
    const tapa = Math.max(0, Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top));
    const c = document.elementFromPoint(q.left + 6, q.top + q.height / 2);
    const r = { barra: vb.getBoundingClientRect().height > 0, tapa: Math.round(tapa), enLaPregunta: c ? (c.closest('#verNuevaBar') ? 'barra' : c.closest('#dashRemember') ? 'recordar' : (c.id || c.className)) : null };
    try { vb.remove(); } catch (e) {} dr.classList.remove('show'); po.classList.remove('show'); syncScrollLock(); p418Cartel(false);
    return r;
  };
  try {
    p418Arrancar();
    [[375, 667], [393, 852]].forEach(([w, h]) => [1, 3].forEach(n => { fijarTamanoTexto(n);
      PRUEBAS.enVentana(w, h, () => ['A', 'B'].forEach(o => { const r = medir(o), tag = w + '×' + h + ' letra ' + n + ' orden ' + o;
        PRUEBAS.cierto(r.barra, 'guarda: a ' + tag + ' la barra de versión está a la vista');
        PRUEBAS.igual(r.tapa, 0, '🔴 a ' + tag + ', la barra no tapa la pregunta · ' + r.tapa + ' px');
        PRUEBAS.igual(r.enLaPregunta, 'recordar', 'y sobre la pregunta lo que se toca es la pregunta · ' + r.enLaPregunta); })); }));
    fijarTamanoTexto(1);   // DISCRIMINADOR: ubicada la barra, el cartel no la vuelve a ubicar (como en la primera 7.78)
    const d = PRUEBAS.enVentana(375, 667, () => medir('A', true));
    PRUEBAS.cierto(d.tapa > 0, 'DISCRIMINADOR · si el cartel no hace volver a ubicar la barra, tapa la pregunta · ' + d.tapa + ' px');
  } finally {
    window.versionBarraUbicar = original;
    try { const vb = document.getElementById('verNuevaBar'); if (vb) vb.remove(); dr.classList.remove('show'); po.classList.remove('show'); p418Cartel(false); } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock(); p418Limpiar(null);
  }
});

PRUEBAS.caso('🔴 «La app de la persona» acostada con letra grande y el cartel de envíos: «Salir de la demostración» se alcanza desplazando la hoja', () => {
  /* El cartel le saca su lugar a la hoja, y la hoja recortaba (`overflow: hidden`): acostado con letra Grande o Muy grande
     «Salir» quedaba debajo del borde, sin forma de llegar (a 667×375 con «Grande»: 48 de 48 px en la 7.77, 0 en la primera 7.78;
     verificador de la fase 3). El derecho lo da `.demo-app-sheet { overflow-y: auto }`: lo que no entra se alcanza desplazando.
     La ✕ de arriba queda como salida en todo caso. Se abre sin `demoAppAbrir`, que apila historial. */
  const ov = document.getElementById('demoAppOv');
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  let sab = null;
  const medir = () => {
    DEMO_APP_SECTOR = 'general'; demoAppPintar(); ov.classList.add('show'); syncScrollLock(); p418Cartel(true); void document.body.offsetWidth;
    const hoja = ov.querySelector('.demo-app-sheet'), salir = ov.querySelector('.demo-app-salir'), ob = document.getElementById('offBar');
    const visto = () => { const H = hoja.getBoundingClientRect(), q = salir.getBoundingClientRect(), c = ob.getBoundingClientRect(), cartel = getComputedStyle(ob).display !== 'none' && c.height > 0;
      return Math.max(0, Math.round(Math.min(q.bottom, H.bottom, innerHeight, cartel ? c.top : 1e9) - Math.max(q.top, H.top, 0))); };
    const r = { cartel: getComputedStyle(ob).display !== 'none', alto: Math.round(salir.getBoundingClientRect().height), alInicio: visto(),
                /* «se puede desplazar» es lo que la PERSONA puede hacer con el dedo: `overflow-y` auto o scroll. Con `hidden`,
                   `scrollTop = …` igual mueve la hoja por código, así que mirar sólo dónde queda «Salir» no discrimina. */
                desplazable: /(auto|scroll)/.test(getComputedStyle(hoja).overflowY) || hoja.scrollHeight <= hoja.clientHeight + 1 };
    hoja.scrollTop = hoja.scrollHeight; void document.body.offsetWidth; r.alFinal = visto();
    hoja.scrollTop = 0; demoAppCerrar(); p418Cartel(false);
    return r;
  };
  try {
    p418Arrancar();
    [[667, 375, 2], [667, 375, 3], [568, 320, 2], [568, 320, 3], [852, 393, 3]].forEach(([w, h, n]) => { fijarTamanoTexto(n);
      const r = PRUEBAS.enVentana(w, h, medir), tag = w + '×' + h + ' letra ' + n;
      PRUEBAS.cierto(r.cartel, 'guarda: a ' + tag + ' el cartel está a la vista');
      PRUEBAS.cierto(r.desplazable && r.alFinal >= r.alto - 1, '🔴 a ' + tag + ', «Salir de la demostración» se alcanza y se ve entero al desplazar la hoja · desplazable ' + r.desplazable + ', ' + r.alFinal + ' de ' + r.alto + ' px (al inicio, ' + r.alInicio + ')'); });
    sab = document.createElement('style'); sab.textContent = '.demo-app-sheet { overflow-y: hidden !important; }'; document.head.appendChild(sab);
    fijarTamanoTexto(3);
    const d = PRUEBAS.enVentana(667, 375, medir);
    PRUEBAS.cierto(!d.desplazable, 'DISCRIMINADOR · con la hoja recortada (como en la primera 7.78) la persona no puede desplazarla y «Salir» no se alcanza · desplazable ' + d.desplazable);
  } finally {
    try { if (sab) sab.remove(); } catch (e) {}
    try { demoAppCerrar(); p418Cartel(false); } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock(); p418Limpiar(null);
  }
});
