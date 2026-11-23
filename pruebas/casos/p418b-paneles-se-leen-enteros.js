PRUEBAS.grupo('P418 · los paneles se leen enteros en el teléfono: 12 px, sin «…», sin deslizarse ni apilarse');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Pedido de Franco (F121b; panel del 2026-11-19: «eso es grave»). La fase 1 arregló las pantallas
   de la persona (`p418-letra-y-lo-que-no-entra.js`); ésta, los paneles, que es lo que más mira
   Rafael. El barrido de la fase 2 (`docs/specs/P418/`, fuera del repo), con la DEMOSTRACIÓN REAL,
   encontró con la letra Normal 119 textos por debajo de 12 px en el panel médico (los nombres de
   los indicadores de HSEQ a 9,6), el nombre de la empresa y la fecha de las anotaciones
   DESLIZÁNDOSE, 14 reglas con «…» y el resumen del visor con 0 px de ancho.

   Se entra por el camino real: el payload que manda `accionDemo` del `.gs` (el CH de `p391`) →
   `demoPayloadDeVista` → `onDashData`, como el selector de la demostración. Por eso este archivo
   está en `soloConGs` y va después de `p391-elenco.js`, cuyo mundo usa.
   ⚠️ LOS GRÁFICOS SVG NO SE MIDEN ACÁ, Y ES A PROPÓSITO: su letra va en unidades del dibujo
   (`viewBox`) y se ve a 6,7–9,8 px; es la Fase 4 de P418. Estos casos miran sólo el HTML.
   Cada caso lleva su discriminador: lo mismo, roto a propósito con una regla de CSS.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

var P418P_DEMO;
function p418pDemo() {
  if (P418P_DEMO !== undefined) return P418P_DEMO;
  P418P_DEMO = null;
  try {
    if (CTX.hayGs && typeof p391Mundo === 'function') {
      const m = p391Mundo();
      const d = m.faltan ? null : m.demo();
      if (d && d.ok) P418P_DEMO = { d: d, m: m };
    }
  } catch (e) {}
  return P418P_DEMO;
}
function p418pSaltea() {
  if (p418pDemo()) return false;
  PRUEBAS.cierto(false, '⚠️ sin la demostración del `.gs` (falta `p391-elenco.js` o el emulador): estos casos quedan SIN MEDIR');
  return true;
}
function p418pVisible(el) {
  try { if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; } catch (e) {}
  const r = el.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5;
}
function p418pTextos(raiz) {
  return [...raiz.querySelectorAll('*')].filter(el => !(el instanceof SVGElement) && !/^(SCRIPT|STYLE|OPTION)$/i.test(el.tagName) &&
    [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && p418pVisible(el));
}
/* Con el id del ancestro más cercano (dos niveles): `#dashScope > span.mq-in`, no un `span.mq-in` suelto. */
function p418pNombre(el) {
  let cad = ''; for (let p = el.parentElement, i = 0; p && i < 2; p = p.parentElement, i++) { if (p.id) { cad = '#' + p.id + ' > '; break; } }
  return cad + (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '')) +
    ' «' + el.textContent.trim().slice(0, 30) + '»';
}
/* Lo que la ventana de arriba muestra: letra chica, «…», apilado letra por letra y lo que se sale de la pantalla (salvo
   adentro de algo que se desplaza de costado a propósito, o recortado entero por su contenedor). */
function p418pMedir(raiz) {
  const out = { chica: [], elipsis: [], apilado: [], fuera: [] };
  const deslizaX = el => { for (let p = el.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 2) return true; } return false; };
  const recortado = el => { const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const q = p.getBoundingClientRect();
      if (r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom) return true; }
    return false; };
  p418pTextos(raiz).forEach(el => {
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), r = el.getBoundingClientRect(), n = p418pNombre(el);
    if (fs < 11.95) out.chica.push(n + ' ' + fs.toFixed(1) + 'px');
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.elipsis.push(n);
    if (el.textContent.trim().length > 4 && r.width < fs * 2.2 && r.height > fs * 3.2) out.apilado.push(n + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    if ((r.right > innerWidth + 1 || r.left < -1) && !deslizaX(el) && !recortado(el)) out.fuera.push(n + ' ' + Math.round(r.left) + '…' + Math.round(r.right));
  });
  for (const k in out) out[k] = [...new Set(out[k])];
  return out;
}
/* Nombres largos, como los de verdad: personas, departamentos y la empresa. */
function p418pLargo(p) {
  return JSON.parse(JSON.stringify(p)
    .replace(/"(persona|nombre|name)":"([^"]+)"/g, (x, k, v) => '"' + k + '":"' + v + ' Rodríguez Fernández de los Santos"')
    .replace(/"departamento":"([^"]+)"/g, (x, v) => '"departamento":"' + v + ' Aéreas y Mantenimiento de Flota"'));
}
const P418P_EMP_LARGA = 'Consorcio Aeroambulancias HELITEC de Venezuela';
/* Pinta un panel por el camino real, con la letra y el ancho pedidos, y devuelve lo que diga `fn`. Deja todo como estaba. */
function p418pPanel(vista, opc, fn) {
  opc = opc || {};
  const demo = p418pDemo();
  const ovl = document.getElementById('portalOverlay');
  const antes = { ovl: ovl.className, DASH: (typeof DASH !== 'undefined') ? DASH : null,
                  sinAnim: document.documentElement.classList.contains('sin-animaciones') };
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  const estilo = opc.sabotaje ? document.createElement('style') : null;
  try {
    CTX.resetear(); localStorage.clear(); syncScrollLock();
    fijarTamanoTexto(opc.nivel === undefined ? 1 : opc.nivel);
    document.documentElement.classList.add('sin-animaciones');
    return PRUEBAS.enVentana(opc.ancho || 375, opc.alto || 812, () => {
      ovl.classList.add('show'); syncScrollLock();
      if (opc.visor) {
        const pv = demo.m.visor(vista);
        onDashData(opc.largo ? p418pLargo(pv) : pv, opc.largo ? P418P_EMP_LARGA : 'Empresa Demo',
          { action: 'supervisor', usuario: '*', pass: 'x', verEmpresa: 'Empresa Demo', verVista: vista }, vista);
      } else {
        const p = demoPayloadDeVista(JSON.parse(JSON.stringify(demo.d)), vista);
        onDashData(opc.largo ? p418pLargo(p) : p, opc.largo ? P418P_EMP_LARGA : 'Empresa Demo', { action: 'demo' }, demoVistaReal(vista));
      }
      ovl.querySelectorAll('details').forEach(d => { d.open = true; });
      try { dashWireMarquees(); dashWireAnResMarquee(); } catch (e) {}
      if (estilo) { estilo.textContent = opc.sabotaje; document.head.appendChild(estilo); }
      void document.body.offsetWidth;
      return fn(ovl);
    });
  } finally {
    try { if (estilo) estilo.remove(); } catch (e) {}
    try { ovl.className = antes.ovl; } catch (e) {}
    try { if (!antes.sinAnim) document.documentElement.classList.remove('sin-animaciones'); } catch (e) {}
    try { DASH = antes.DASH; } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock();
  }
}
const P418P_VISTAS = ['supervisor', 'medico', 'hseq', 'hseqPanel', 'empleado'];   // Dirección es `hseq`; HSEQ, `hseqPanel` (ADR 017)

PRUEBAS.caso('🔴 con la letra Normal, en los cinco paneles de la demostración ningún texto queda por debajo de 12 px (375)', () => {
  if (p418pSaltea()) return;
  P418P_VISTAS.forEach(v => {
    const r = p418pPanel(v, {}, ovl => ({ n: p418pTextos(ovl).length, secs: ovl.querySelectorAll('[id^="dsec-"]').length, m: p418pMedir(ovl) }));
    PRUEBAS.alMenos(r.n, 30, 'guarda: el panel «' + v + '» está pintado y tiene textos · ' + r.n);
    PRUEBAS.alMenos(r.secs, 2, 'guarda: con sus secciones · ' + r.secs);
    PRUEBAS.igual(r.m.chica, [], '⚠️ «' + v + '»: nada por debajo de 12 px · antes, 119 en el médico y los nombres de los indicadores de HSEQ a 9,6');
  });
  /* DISCRIMINADOR: la insignia del rol, achicada a propósito, tiene que aparecer. */
  const sab = p418pPanel('supervisor', { sabotaje: '#dashVista { font-size: 9px !important; }' }, ovl => p418pMedir(ovl).chica);
  PRUEBAS.cierto(sab.some(x => /dashVista/.test(x)), 'DISCRIMINADOR · la insignia del rol a 9 px se ve como chica');
});

PRUEBAS.caso('🔴 con nombres largos y letra «Muy grande», nada termina en «…», se desliza, se apila ni se sale (375)', () => {
  if (p418pSaltea()) return;
  P418P_VISTAS.forEach(v => {
    const r = p418pPanel(v, { largo: true, nivel: 3 }, ovl => ({ m: p418pMedir(ovl), desliza: [...ovl.querySelectorAll('.marquee')].map(p418pNombre),
      nombre: document.getElementById('dashScope').textContent }));
    PRUEBAS.cierto(/HELITEC/.test(r.nombre), 'guarda: «' + v + '» muestra la empresa de nombre largo · ' + r.nombre.slice(0, 40));
    PRUEBAS.igual(r.m.elipsis, [], '🔴 «' + v + '»: nada con «…»');
    PRUEBAS.igual(r.desliza, [], '🔴 «' + v + '»: nada deslizándose · antes el nombre de la empresa, el informe y la fecha de las anotaciones');
    PRUEBAS.igual(r.m.apilado, [], '«' + v + '»: nada apilado letra por letra');
    PRUEBAS.igual(r.m.fuera, [], '«' + v + '»: nada fuera de la pantalla');
  });
  /* DISCRIMINADOR: el nombre de la empresa en un renglón con «…» tiene que aparecer. */
  const sab = p418pPanel('supervisor', { largo: true, nivel: 3,
    sabotaje: '#dashScope, #dashScope .mq-in { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: block !important; }' },
    ovl => p418pMedir(ovl).elipsis);
  PRUEBAS.cierto(sab.some(x => /dashScope/.test(x)), 'DISCRIMINADOR · el nombre de la empresa con «…» se ve como cortado');
});

PRUEBAS.caso('🔴 en el celular, el nombre de la empresa va en su propia fila, a todo el ancho, debajo de los botones (375)', () => {
  if (p418pSaltea()) return;
  /* El derecho lo da el bloque `max-width: 899.98px`: `.dash-scope-top { order: 1; flex: 1 1 100% }` y el resorte
     `.dash-top::before`. A 1366 sigue al lado del título (CONTROL). */
  const foto = () => { const sc = document.querySelector('#portalDash .dash-scope-top').getBoundingClientRect(),   // la fila: el nombre y la insignia del rol
    btn = document.getElementById('dashRefreshBtn').getBoundingClientRect(), top = document.querySelector('#portalDash .dash-top').getBoundingClientRect();
    return { bajo: sc.top >= btn.bottom - 1, ancho: sc.width / top.width, btnDer: btn.left > top.left + top.width / 2, ok: sc.width > 0 && btn.width > 0 }; };
  const cel = p418pPanel('supervisor', { largo: true }, foto);
  PRUEBAS.cierto(cel.ok, 'guarda: el nombre y el botón de actualizar se ven');
  PRUEBAS.cierto(cel.bajo, '🔴 a 375, el nombre va debajo de los botones');
  PRUEBAS.cierto(cel.ancho > 0.7, 'a todo el ancho · ' + Math.round(cel.ancho * 100) + ' %');
  PRUEBAS.cierto(cel.btnDer, 'y los botones siguen a la derecha');
  const esc = p418pPanel('supervisor', { ancho: 1366, alto: 768 }, foto);
  PRUEBAS.falso(esc.bajo, 'CONTROL · a 1366 el nombre sigue en la fila de los botones');
  /* ⚠️ Y EL NOMBRE, NO SÓLO LA FILA (verificador de P418): la insignia del rol no se achica y, al lado, le dejaba al nombre
     88 a 143 px con letra «Muy grande», que lo partía a mitad de palabra («Aeroambulanc/ias»). Medir la fila lo dejaba
     pasar. El derecho lo da `.dash-scope-top { flex-wrap: wrap }` (la insignia baja). Una palabra partida es una palabra
     cuyo rango ocupa dos renglones. */
  const partidas = () => { const el = document.getElementById('dashScope'), out = [];
    [el, ...el.querySelectorAll('*')].forEach(e => [...e.childNodes].filter(n => n.nodeType === 3).forEach(n => {
      const re = /\S+/g; let m; while ((m = re.exec(n.textContent))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        if (new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size > 1) out.push(m[0]); } }));
    return out; };
  [375, 320].forEach(an => {
    const r = p418pPanel('medico', { largo: true, nivel: 3, ancho: an, alto: an === 320 ? 568 : 812 }, () => ({ p: partidas(), n: document.getElementById('dashScope').textContent }));
    PRUEBAS.cierto(/HELITEC/.test(r.n), 'guarda: a ' + an + ' el nombre es el largo');
    PRUEBAS.igual(r.p, [], '🔴 a ' + an + ' con «Muy grande», ninguna palabra del nombre se parte');
  });
  const sab = p418pPanel('medico', { largo: true, nivel: 3, sabotaje: '#portalDash .dash-scope-top { flex-wrap: nowrap !important; }' }, partidas);
  PRUEBAS.cierto(sab.length > 0, 'DISCRIMINADOR · con la insignia al lado (sin envolver), el nombre se parte · ' + sab.slice(0, 3).join(', '));
});

PRUEBAS.caso('🔴 el visor del administrador: con letra «Muy grande» el resumen se lee, no se apila letra por letra (430)', () => {
  if (p418pSaltea()) return;
  /* Medido en la fase 2: el resumen («Empresa Demo · Servicio médico») iba en un renglón con «…» al lado del título y de
     «← Todas las empresas», con 0 px de ancho; al dejarlo envolver se apiló hasta 598 px de alto. El derecho lo da el
     CSS de `.visor-cab`/`.visor-cab-btn` (envuelven) y `.visor-resumen { flex: 1 1 8rem }`. */
  const r = p418pPanel('medico', { visor: true, nivel: 3, ancho: 430, alto: 932 }, ovl => {
    const res = document.getElementById('visorResumen'), b = res && res.getBoundingClientRect(), fs = res ? parseFloat(getComputedStyle(res).fontSize) : 0;
    const vb = document.getElementById('visorBloque');
    return { hay: !!res && p418pVisible(res), ancho: b ? b.width : 0, fs: fs, apilado: p418pMedir(ovl).apilado,
             visorAlto: vb ? vb.getBoundingClientRect().height : 0, alto: innerHeight };
  });
  PRUEBAS.cierto(r.hay, 'guarda: el visor muestra su resumen');
  PRUEBAS.cierto(r.ancho > r.fs * 6, '🔴 el resumen tiene lugar para leerse · ' + Math.round(r.ancho) + ' px');
  PRUEBAS.igual(r.apilado, [], 'nada apilado');
  PRUEBAS.comoMucho(r.visorAlto, r.alto * 0.25, 'y el visor no se come la pantalla · ' + Math.round(r.visorAlto) + ' px');
  /* DISCRIMINADOR: la cabecera como estaba (sin envolver) apila el resumen. */
  const sab = p418pPanel('medico', { visor: true, nivel: 3, ancho: 430, alto: 932,
    sabotaje: '.visor-cab, .visor-cab-btn { flex-wrap: nowrap !important; } .visor-cab-btn { flex: 1 1 auto !important; } .visor-resumen { flex: 0 1 auto !important; }' },
    ovl => p418pMedir(ovl).apilado);
  PRUEBAS.cierto(sab.some(x => /visorResumen/.test(x)), 'DISCRIMINADOR · sin envolver, el resumen se apila');
});

PRUEBAS.caso('🔴 el botón de gestiones no tapa el final del panel del médico, con letra Normal y «Muy grande» (375)', () => {
  if (p418pSaltea()) return;
  /* Medido en la 7.73: tapaba los últimos 27 px con letra Normal y 39 con «Muy grande». El derecho lo da
     `dashGestFabLugar` (el alto medido del botón en `--gest-fab-alto`) y `#portalDash.con-gest-fab .dash-scroll`. */
  const solapa = ovl => { const sc = document.getElementById('dashScroll'), fab = document.getElementById('gestFab');
    sc.scrollTop = sc.scrollHeight;
    const ult = [...sc.querySelectorAll('*')].filter(p418pVisible).reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), 0);
    const f = fab.getBoundingClientRect(); sc.scrollTop = 0;
    return { visible: f.height > 0, solapa: ult - f.top }; };
  [1, 3].forEach(n => {
    const r = p418pPanel('medico', { nivel: n }, solapa);
    PRUEBAS.cierto(r.visible, 'guarda: con letra ' + n + ' el botón de gestiones está');
    PRUEBAS.comoMucho(r.solapa, 1, '🔴 con letra ' + n + ', lo último del panel queda arriba del botón · se pisan ' + Math.round(r.solapa) + ' px');
  });
  const sab = p418pPanel('medico', { nivel: 3, sabotaje: '#portalDash.con-gest-fab .dash-scroll { padding-bottom: 2.2rem !important; }' }, solapa);
  PRUEBAS.cierto(sab.solapa > 1, 'DISCRIMINADOR · con el margen fijo de antes, el botón tapa el final · ' + Math.round(sab.solapa) + ' px');
});
