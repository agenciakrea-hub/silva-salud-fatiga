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
   Los gráficos SVG tienen sus propios casos, al final (Fase 4): su letra va en unidades del dibujo
   (`viewBox`), así que se mide con la escala del dibujo en pantalla (`getScreenCTM`), y lo que se
   pisa, con el rectángulo GIRADO de cada texto. Los demás casos miran sólo el HTML.
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
        let p = demoPayloadDeVista(JSON.parse(JSON.stringify(demo.d)), vista);
        if (opc.transformar) p = opc.transformar(p);   // fase 4: las fechas repartidas, un PVT de un solo día
        onDashData(opc.largo ? p418pLargo(p) : p, opc.largo ? P418P_EMP_LARGA : 'Empresa Demo', { action: 'demo' }, demoVistaReal(vista));
      }
      if (opc.despues) opc.despues();
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

/* ══ FASE 4 · LOS GRÁFICOS SVG ══════════════════════════════════════════════════════════════════
   Los ocho gráficos del panel médico y de «Mis estadísticas» se veían a 5,4–7,7 px en un teléfono
   (la letra en unidades de un `viewBox` de 280–340 que el CSS estira al ancho de la tarjeta), la
   letra elegida no los movía y «Somnolencia», girado, se cortaba. El derecho lo dan `grafLetraAjustar`
   (la letra a 12 px con la escala real del dibujo, y el `viewBox` agrandado hasta que entre todo),
   `dashGraf`/`dashGrafAjustar` (rearmar con el ancho real) y el lugar que cada constructor calcula
   con `grafNec`. 320 px es un iPhone 12–16 con el «Zoom de pantalla» en «Ampliado». */
function p418pMeses(pl) {   // las mismas filas, con las fechas repartidas en ~3 meses: la evolución pide dos o más
  const hoy = Date.now();
  (pl.registros || []).forEach((r, i) => { const dd = new Date(hoy - (i * 6 % 90) * 86400000);
    if (r.fecha) r.fecha = dd.toISOString().slice(0, 10);
    if (r.ts != null) r.ts = (typeof r.ts === 'number') ? dd.getTime() : dd.toISOString(); });
  return pl;
}
const P418P_MESES = { transformar: p418pMeses, despues: () => { DASH.pickEvo = 'kss'; renderDash(); } };
function p418pGraficos(raiz) {
  const svgs = [...raiz.querySelectorAll('svg')].filter(s => s.querySelector('text') && s.getBoundingClientRect().width > 20);
  const out = { graficos: svgs.length, textos: 0, chica: [], pisan: [], fuera: [] };
  // ¿Se pisan? Con el rectángulo GIRADO de cada texto (su caja por su matriz) y 1 px de aire: la caja sin girar que encierra
  // a un rótulo a 40° se cruza con la del vecino aunque las letras no se toquen. Separación por ejes.
  const poli = t => { const bb = t.getBBox(), m = t.getScreenCTM(); if (!m) return null;
    return [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x + bb.width, bb.y + bb.height], [bb.x, bb.y + bb.height]]
      .map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); };
  const separa = (P, Q) => { for (const S of [P, Q]) for (let i = 0; i < 4; i++) { const [x1, y1] = S[i], [x2, y2] = S[(i + 1) % 4];
    const nx = y2 - y1, ny = x1 - x2, L = Math.hypot(nx, ny) || 1, pr = A => A.map(([x, y]) => x * nx + y * ny), a = pr(P), c = pr(Q);
    if (Math.min(...a) >= Math.max(...c) + L || Math.min(...c) >= Math.max(...a) + L) return true; } return false; };   // ≥ 1 px
  svgs.forEach(s => {
    const R = s.getBoundingClientRect(), sec = s.closest('[id^="dsec-"]'), donde = sec ? sec.id.slice(5) : '?';
    const ts = [...s.querySelectorAll('text')].filter(t => t.getBoundingClientRect().width > 0);
    out.textos += ts.length;
    ts.forEach(t => {
      const m = t.getScreenCTM(), px = parseFloat(getComputedStyle(t).fontSize) * (m ? Math.hypot(m.c, m.d) : 1), q = t.getBoundingClientRect();
      if (px < 11.95) out.chica.push(donde + ' «' + t.textContent.slice(0, 16) + '» ' + px.toFixed(1) + 'px');
      if (q.left < R.left - 1 || q.right > R.right + 1 || q.top < R.top - 1 || q.bottom > R.bottom + 1) out.fuera.push(donde + ' «' + t.textContent.slice(0, 16) + '»');
    });
    const ps = ts.map(poli);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++)
      if (ps[i] && ps[j] && !separa(ps[i], ps[j])) out.pisan.push(donde + ' «' + ts[i].textContent.slice(0, 14) + '» × «' + ts[j].textContent.slice(0, 14) + '»');
  });
  return out;
}

PRUEBAS.caso('🔴 los gráficos del médico y de «Mis estadísticas» se leen: 12 px, nada pisado ni cortado (375 Normal y «Muy grande»; 320, el iPhone con zoom)', () => {
  if (p418pSaltea()) return;
  /* Con nombres largos (`p418pLargo`, departamentos de cuarenta letras) el diagrama de cajas no los puede girar: los pone en
     una clave de texto debajo y numera las cajas (`dashBoxPlot`). Girados, el ajuste agrandaba el dibujo sin terminar y las
     cajas quedaban de 27 px (verificador de P418). */
  [['medico', 375, 812, 1], ['medico', 375, 812, 3], ['empleado', 375, 812, 3], ['medico', 320, 693, 3], ['empleado', 320, 693, 2],
   ['medico', 375, 812, 3, true], ['medico', 320, 693, 3, true]].forEach(([v, an, al, n, largo]) => {
    const r = p418pPanel(v, Object.assign({ ancho: an, alto: al, nivel: n, largo: !!largo }, P418P_MESES), ovl => {
      const out = p418pGraficos(ovl), sec = document.getElementById('dsec-comparar');
      out.clave = sec ? sec.querySelectorAll('.radar-legend .rl-item b').length : 0;
      return out; });
    const q = '«' + v + '» a ' + an + ' con letra ' + n + (largo ? ', nombres largos' : '');
    if (largo) PRUEBAS.alMenos(r.clave, 2, 'con nombres largos, las cajas llevan su clave numerada · ' + r.clave);
    PRUEBAS.alMenos(r.graficos, v === 'medico' ? 9 : 3, 'guarda: ' + q + ' tiene sus gráficos (barras, radar, cajas, dispersión, líneas, PVT) · ' + r.graficos);
    PRUEBAS.alMenos(r.textos, v === 'medico' ? 60 : 20, 'guarda: y sus textos · ' + r.textos);
    PRUEBAS.igual(r.chica, [], '🔴 ' + q + ': ningún texto de un gráfico por debajo de 12 px · antes, 5,4 a 7,7 px');
    PRUEBAS.igual(r.pisan, [], '🔴 ' + q + ': ningún texto pisa a otro');
    PRUEBAS.igual(r.fuera, [], '🔴 ' + q + ': ninguno sale del dibujo (el SVG recorta) · antes, «Somnolencia» girado');
  });
  /* DISCRIMINADORES (la medición, no el arreglo): la letra fija de antes da chicas; una letra enorme, pisados y cortados. */
  const chica = p418pPanel('medico', P418P_MESES, ovl => { const st = document.createElement('style');
    st.textContent = '#portalDash svg text { font-size: 8.5px !important; }'; document.head.appendChild(st);
    try { return p418pGraficos(ovl); } finally { st.remove(); } });
  PRUEBAS.alMenos(chica.chica.length, 30, 'DISCRIMINADOR · con la letra en 8,5 del dibujo, los textos se ven chicos · ' + chica.chica.length);
  const enorme = p418pPanel('medico', P418P_MESES, ovl => { const st = document.createElement('style');
    st.textContent = '#portalDash svg text { font-size: 40px !important; }'; document.head.appendChild(st);
    try { return p418pGraficos(ovl); } finally { st.remove(); } });
  PRUEBAS.alMenos(enorme.pisan.length, 5, 'DISCRIMINADOR · con letra enorme se ven pisados · ' + enorme.pisan.length);
  PRUEBAS.alMenos(enorme.fuera.length, 5, 'DISCRIMINADOR · y cortados · ' + enorme.fuera.length);
});

/* Como `p418pPanel`, pero devuelve una promesa y mide el panel como lo ve la persona: `dashWireAnimaciones` pone
   `.anim-target` en los bloques DESPUÉS de pintar (en el próximo cuadro, o a los 150 y 600 ms), y la regla de «Reducir
   movimiento» engancha recién ahí. Medido de corrido, el caso de abajo pasaba con la regla rota: lo mostró su discriminador.
   Restaura en el `.finally()` de la promesa (R18), no en el del bloque. */
function p418pPanelAnimado(vista, opc, fn) {
  opc = opc || {};
  const demo = p418pDemo(), ovl = document.getElementById('portalOverlay'), marco = window.frameElement;
  const antes = { ovl: ovl.className, DASH: (typeof DASH !== 'undefined') ? DASH : null,
                  sinAnim: document.documentElement.classList.contains('sin-animaciones'),
                  w: marco ? marco.style.width : '', h: marco ? marco.style.height : '' };
  let txt = null; try { txt = localStorage.getItem(K_TEXTO); } catch (e) {}
  const estilo = opc.sabotaje ? document.createElement('style') : null;
  return new Promise((res, rej) => {
    CTX.resetear(); localStorage.clear(); syncScrollLock();
    fijarTamanoTexto(opc.nivel === undefined ? 1 : opc.nivel);
    document.documentElement.classList.add('sin-animaciones');
    if (marco) { marco.style.width = (opc.ancho || 375) + 'px'; marco.style.height = (opc.alto || 812) + 'px'; }
    void document.body.offsetWidth;
    ovl.classList.add('show'); syncScrollLock();
    onDashData(demoPayloadDeVista(JSON.parse(JSON.stringify(demo.d)), vista), 'Empresa Demo', { action: 'demo' }, demoVistaReal(vista));
    if (estilo) { estilo.textContent = opc.sabotaje; document.head.appendChild(estilo); }
    const t0 = Date.now();
    (function espera() {
      const hay = !!document.querySelector('#dashScroll .anim-target');
      if (!hay && Date.now() - t0 < 3000) { setTimeout(espera, 50); return; }
      try { void document.body.offsetWidth; res({ anim: hay, r: fn(ovl) }); } catch (e) { rej(e); }
    })();
  }).finally(() => {
    try { if (estilo) estilo.remove(); } catch (e) {}
    try { ovl.className = antes.ovl; } catch (e) {}
    try { if (!antes.sinAnim) document.documentElement.classList.remove('sin-animaciones'); } catch (e) {}
    try { DASH = antes.DASH; } catch (e) {}
    try { localStorage.clear(); if (txt !== null) localStorage.setItem(K_TEXTO, txt); } catch (e) {}
    try { if (marco) { marco.style.width = antes.w; marco.style.height = antes.h; void document.body.offsetWidth; } } catch (e) {}
    aplicarTamanoTexto(); syncScrollLock();
  });
}

PRUEBAS.caso('🔴 al girar el teléfono sin repintar, los gráficos se rearman con el ancho nuevo: nada pisado ni cortado', () => {
  if (p418pSaltea()) return;
  /* Al girar, la app NO repinta el panel: `resize` → `dashRemedirMarquees` (en el próximo cuadro) y el observador del panel
     llaman a `dashGrafAjustar`, que rearma con el ancho real los gráficos registrados con `dashGraf` y sólo agranda la letra
     de los demás. La línea mensual no estaba registrada: pintada acostada y vista parada, su primera fecha pisaba el «0»
     (verificador de P418). Acá se llama a `dashGrafAjustar` directo porque con la pestaña oculta ese cuadro no llega. */
  const girar = ovl => { const marco = window.frameElement;
    if (marco) { marco.style.width = '375px'; marco.style.height = '812px'; }
    void document.body.offsetWidth; dashGrafAjustar(); void document.body.offsetWidth;
    return Object.assign(p418pGraficos(ovl), { ancho: innerWidth }); };
  const acostado = Object.assign({ ancho: 812, alto: 375, nivel: 3 }, P418P_MESES);   // con «Muy grande» la letra casi se duplica al girar
  const r = p418pPanel('medico', acostado, girar);
  PRUEBAS.cierto(!window.frameElement || r.ancho === 375, 'guarda: la ventana quedó parada (375) · ' + r.ancho);
  PRUEBAS.alMenos(r.graficos, 9, 'guarda: los nueve gráficos · ' + r.graficos);
  PRUEBAS.igual(r.chica, [], '🔴 al girar, nada por debajo de 12 px');
  PRUEBAS.igual(r.pisan, [], '🔴 al girar, nada pisado · antes, la primera fecha de la línea mensual con el «0»');
  PRUEBAS.igual(r.fuera, [], '🔴 al girar, nada cortado');
  /* DISCRIMINADOR: un `dashGraf` que no registra deja todo como se armó acostado. */
  const orig = window.dashGraf;
  let sab;
  try { window.dashGraf = function (fn, args) { return fn.apply(null, args); }; sab = p418pPanel('medico', acostado, girar); }
  finally { window.dashGraf = orig; }
  PRUEBAS.alMenos(sab.pisan.length + sab.fuera.length, 1, 'DISCRIMINADOR · sin rearmar, al girar algo se pisa o se corta · ' + sab.pisan.concat(sab.fuera).slice(0, 3).join(' | '));
});

PRUEBAS.caso('🔴 con «Reducir movimiento» los rótulos girados de los gráficos siguen girados (antes quedaban derechos y encimados)', () => {
  if (p418pSaltea()) return;
  /* `sin-animaciones` se pone con «Reducir movimiento» del teléfono o con la pestaña oculta al cargar (el script del
     principio de `index.html`), y los dos ayudantes pintan con ella. En un SVG la propiedad `transform` de CSS le gana al
     ATRIBUTO, y `.anim-target *` con `transform: none` enderezaba los rótulos de las barras, de las cajas y los títulos de
     los ejes. El derecho lo da `.anim-target *:not(svg *)`, con una regla aparte para `svg *` que no toca `transform`. */
  const girados = ovl => [...ovl.querySelectorAll('svg text[transform*="rotate(-"]')].filter(t => t.getBoundingClientRect().width > 0)
    .map(t => { const m = t.getScreenCTM(); return Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI); });
  const fmt = a => a.map(x => Math.round(x)).join(', ');
  return p418pPanelAnimado('medico', {}, ovl => ({ a: girados(ovl), sin: document.documentElement.classList.contains('sin-animaciones') }))
    .then(r => {
      PRUEBAS.cierto(r.anim, 'guarda: el panel quedó como lo ve la persona (los bloques con `.anim-target`)');
      PRUEBAS.cierto(r.r.sin, 'guarda: pintado con `sin-animaciones`, el estado de quien pidió «Reducir movimiento»');
      PRUEBAS.alMenos(r.r.a.length, 6, 'guarda: el panel tiene rótulos girados (barras, cajas, títulos de los ejes) · ' + r.r.a.length);
      PRUEBAS.igual(r.r.a.filter(x => x < 20).map(x => Math.round(x)), [], '🔴 todos se ven girados · ' + fmt(r.r.a));
      return p418pPanelAnimado('medico', { sabotaje: 'html.sin-animaciones .anim-target * { transform: none !important; }' },
        ovl => ({ a: girados(ovl), m: p418pGraficos(ovl) }));
    })
    .then(sab => {
      PRUEBAS.cierto(sab.anim && sab.r.a.length > 0 && sab.r.a.every(x => x < 1), 'DISCRIMINADOR · con la regla de antes, quedan derechos · ' + fmt(sab.r.a));
      PRUEBAS.alMenos(sab.r.m.pisan.length, 3, 'DISCRIMINADOR · y encimados · ' + sab.r.m.pisan.slice(0, 3).join(' | '));
    });
});

PRUEBAS.caso('el PVT con un solo día no muestra «Cómo evolucionó la reacción» vacío (el gráfico ahora pasa por `dashGraf`)', () => {
  if (p418pSaltea()) return;
  /* `renderPVT` muestra ese bloque sólo `if (grafico)`, y `dashPvtEvolucion` devuelve '' con menos de dos días. Desde
     P418 el gráfico pasa por `dashGraf` (lo registra para rearmarlo con el ancho real): si envolviera también el vacío, el
     bloque saldría con su título y sin gráfico. */
  const titulo = t('db_evo_reaccion'), resumen = t('db_resumen_reaccion');
  const unDia = pl => { const f0 = (pl.pvt || [])[0] && pl.pvt[0].fecha; (pl.pvt || []).forEach(r => { r.fecha = f0; }); return pl; };
  const mira = ovl => { const tit = [...ovl.querySelectorAll('.db-title')].map(x => x.textContent.trim());
    return { evo: tit.includes(titulo), pvt: tit.includes(resumen), svg: !!ovl.querySelector('#dsec-pvt svg.linechart') }; };   // la ⓘ también es un `svg`
  const uno = p418pPanel('medico', { transformar: unDia }, mira);
  PRUEBAS.cierto(uno.pvt, 'guarda: la sección de reacción está pintada, con sus datos');
  PRUEBAS.falso(uno.evo, '🔴 con un solo día, no hay bloque de evolución');
  const varios = p418pPanel('medico', {}, mira);
  PRUEBAS.cierto(varios.evo && varios.svg, 'CONTROL · con varios días, el bloque está y tiene su gráfico');
  /* DISCRIMINADOR: `dashGraf` sin la guarda del vacío. */
  const orig = window.dashGraf;
  let sab;
  try {
    window.dashGraf = function (fn, args) { return '<div class="graf">' + fn.apply(null, args) + '</div>'; };
    sab = p418pPanel('medico', { transformar: unDia }, mira);
  } finally { window.dashGraf = orig; }
  PRUEBAS.cierto(sab.evo && !sab.svg, 'DISCRIMINADOR · si `dashGraf` envuelve el vacío, sale el título sin gráfico');
});
