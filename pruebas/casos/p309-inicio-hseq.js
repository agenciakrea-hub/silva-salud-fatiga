PRUEBAS.grupo('P309 · El inicio de HSEQ como la foto');

/* P309 · el panel de HSEQ abre como la foto de Rafael (inventario de 38 filas en `PLAN_TANDA_F.md`) y con las
   decisiones de Franco del 2026-10-31: el inicio arriba y las demás secciones debajo, en la misma página; «Ver
   reporte semanal ›» abre una hoja con la semana; «Lo que viene» al final, plegado.

   TODO ENTRA POR EL CAMINO REAL (R17): el `.gs` emulado sella los grupos y arma el payload con la contraseña del panel
   de HSEQ o la de Dirección (`p308Mundo`), `onDashData` lo recibe y `renderDash` pinta `#dashBody` y el header. Nada
   de `DASH = {…}`: los números que se afirman se leen del payload del servidor (R21), no de una cuenta propia.
   Usa los ayudantes de `p308-totales-hseq.js`, que corre antes (casos.json). */

const P309_ORDEN = ['fatiga', 'kss', 'cansancio', 'estres', 'ansiedad', 'depresion', 'gastro'];
let P309_DATOS;
/* Un CH de prueba con la semana del 2 al 8 de noviembre de 2026 (P308_AHORA es el martes 3) y la anterior:
   · KSS: los once de `p308Cuatro` esta semana, y cinco el 28/10 (la semana anterior, para la flecha);
   · estrés: cinco personas esta semana y cinco el 29/10 → un grupo por semana (pilar 2, con su tendencia);
   · ansiedad: tres → debajo del piso (pilar 2);
   · gastro: cinco → un grupo (pilar 3);
   · fatiga, cansancio y depresión: nadie → debajo del piso (fatiga es la del arco, en el pilar 1). */
function p309Datos() {
  if (P309_DATOS) return P309_DATOS;
  const tests = p308Cuatro().concat([
    { p: 'Lara Legal', d: '2026-10-28', h: '08:00', v: 3 }, { p: 'Leo Legal', d: '2026-10-28', h: '08:10', v: 3 },
    { p: 'Mario Mes', d: '2026-10-28', h: '08:20', v: 3 }, { p: 'Marta Mes', d: '2026-10-28', h: '08:30', v: 3 },
    { p: 'Nora Nueva', d: '2026-10-28', h: '08:40', v: 3 },
    { p: 'Otto Cuatro', d: '2026-10-29', h: '09:00', v: 6, m: 'estres' }, { p: 'Oriana Cinco', d: '2026-10-29', h: '09:10', v: 6, m: 'estres' },
    { p: 'Orlando Seis', d: '2026-10-29', h: '09:20', v: 6, m: 'estres' }, { p: 'Mario Mes', d: '2026-10-29', h: '09:30', v: 6, m: 'estres' },
    { p: 'Marta Mes', d: '2026-10-29', h: '09:40', v: 6, m: 'estres' },
    { p: 'Otto Cuatro', d: '2026-11-03', h: '09:00', v: 2, m: 'estres' }, { p: 'Oriana Cinco', d: '2026-11-03', h: '09:10', v: 3, m: 'estres' },
    { p: 'Orlando Seis', d: '2026-11-03', h: '09:20', v: 4, m: 'estres' }, { p: 'Mario Mes', d: '2026-11-03', h: '09:30', v: 5, m: 'estres' },
    { p: 'Marta Mes', d: '2026-11-03', h: '09:40', v: 6, m: 'estres' },
    { p: 'Lara Legal', d: '2026-11-03', h: '10:00', v: 2, m: 'ansiedad' }, { p: 'Leo Legal', d: '2026-11-03', h: '10:10', v: 3, m: 'ansiedad' },
    { p: 'Nora Nueva', d: '2026-11-03', h: '10:20', v: 4, m: 'ansiedad' },
    { p: 'Oscar Uno', d: '2026-11-02', h: '11:00', v: 1, m: 'gastro' }, { p: 'Olga Dos', d: '2026-11-02', h: '11:10', v: 2, m: 'gastro' },
    { p: 'Omar Tres', d: '2026-11-03', h: '11:20', v: 3, m: 'gastro' }, { p: 'Otto Cuatro', d: '2026-11-03', h: '11:30', v: 1, m: 'gastro' },
    { p: 'Alma Única', d: '2026-11-03', h: '11:40', v: 2, m: 'gastro' }
  ].map(p308Test));
  const w = p308Mundo(tests);
  if (w.faltan) return { faltan: w.faltan };
  P309_DATOS = { hseq: p308Limpio(w.sellarYPedir()), dir: p308Limpio(w.pedir({}, 'dir-308')) };
  return P309_DATOS;
}
function p309Saltea() { return !CTX.hayGs || typeof onDashData !== 'function' || typeof renderHseqInicio !== 'function'; }

/* Lo que se ve, leído del DOM que pintó `renderDash`. */
function p309Foto() {
  const q = s => document.querySelector(s);
  const tarjeta = k => {
    const arco = k.querySelector('.kpi-arco-valor'), sp = k.querySelector('svg.spark');
    const linea = sp && sp.querySelector('path[stroke]');
    return {
      m: k.dataset.m, over: k.classList.contains('over'), bajo: k.classList.contains('kpi-bajo-piso'),
      kv: (k.querySelector('.kv') || {}).textContent || '', arco: !!k.querySelector('.kpi-arco'),
      arcoColor: arco ? arco.getAttribute('stroke') : null, spark: !!sp, sparkAlta: !!k.querySelector('.spark-alta'),
      sparkColor: linea ? linea.getAttribute('stroke') : null, sparkRef: !!(sp && sp.querySelector('line[stroke-dasharray]')),
      kref: (k.querySelector('.kref') || {}).textContent || '', ktrend: (k.querySelector('.ktrend') || {}).textContent || '',
      kconf: !!k.querySelector('.kconf'), desc: (k.querySelector('.kpi-desc') || {}).textContent || '',
      titulo: (k.querySelector('.km') || {}).textContent || ''
    };
  };
  const ini = q('#dsec-inicio'), mov = q('#movHueco'), prim = q('#dashBody .dash-sec');
  const sigue = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
  return {
    secs: [...document.querySelectorAll('#dashBody .dash-sec')].map(s => s.dataset.tab),
    movDebajoDelInicio: sigue(ini, mov), movArribaDeTodo: sigue(mov, prim),
    pilares: [...document.querySelectorAll('#dsec-inicio .hsi-pilar')].map(p => ({
      id: p.dataset.pilar, titulo: (p.querySelector('.hsi-pt') || {}).textContent || '',
      ms: [...p.querySelectorAll('.kpi')].map(k => k.dataset.m) })),
    tarjetas: [...document.querySelectorAll('#dsec-inicio .kpi')].reduce((o, k) => { o[k.dataset.m] = tarjeta(k); return o; }, {}),
    cab: (q('#dsec-inicio .hsi-cab') || {}).textContent || '',
    kfresco: (q('#dsec-inicio .kfresco') || {}).textContent || '', detenido: !!q('#dsec-inicio .hst-detenido'),
    mapaTxt: (q('#dsec-mrfo') || {}).textContent || '',
    htmlInicio: ini ? ini.innerHTML : '', txtInicio: ini ? ini.textContent : '',
    menu: !q('#hseqMenuBtn').hidden, glos: !q('#hseqGlosBtn').hidden, bar: !q('#hseqBar').hidden,
    glosViejo: q('#glossToggle').style.display !== 'none',
    iniTxt: q('#dashIni').textContent, iniVisible: !q('#dashIni').hidden,
    back: q('#portalBackBtn').style.display !== 'none', volver: !q('#dfmVolverBtn').hidden,
    conBar: q('#portalDash').classList.contains('con-hseq-bar'), guiaCerrada: q('#hseqGuia').hidden,
    queVieneUltimo: !!(q('#dashBody .hseq-que-viene') && q('#dashBody').lastElementChild === q('#dashBody .hseq-que-viene')),
    queVieneCerrado: !!(q('#dashBody .hseq-que-viene') && !q('#dashBody .hseq-que-viene').open)
  };
}
/* Pinta un payload por `onDashData` (que llama a `renderDash`), corre `extra` con el panel en pantalla y devuelve lo
   que se vio. R18: `DASH`, la marca y lo de afuera de `#dashBody` vuelven a como estaban en el `finally`. */
function p309Pintar(payload, f, extra) {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    onDashData(JSON.parse(JSON.stringify(payload)), 'Helitec', { usuario: 'helitec' }, 'hseq');
    if (f) { Object.assign(DASH.f, f); renderDash(); }
    const foto = p309Foto();
    if (extra) foto.extra = extra();
    return foto;
  } finally {
    try { dfmClose(); glossClose(); hseqGuiaCerrar(); hseqSemanaCerrar(); } catch (e) {}
    try { DASH = prev; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
}
const p309Media = x => (x && x.n > 0) ? x.suma / x.n : null;
function p309Columnas(v) {
  const r = /^repeat\((\d+)/.exec(String(v || '').trim());
  if (r) return Number(r[1]);
  let prof = 0, n = 0, en = false;
  for (const ch of String(v || '').trim()) {
    if (ch === '(') prof++; else if (ch === ')') prof--;
    if (ch === ' ' && prof === 0) en = false; else if (!en) { en = true; n++; }
  }
  return n;
}

/* ── 1 · El orden: el inicio arriba, «Actividad reciente» debajo, «Lo que viene» al final ──────────────────── */
PRUEBAS.caso('🔴 P309 · en el panel de HSEQ el inicio es la primera sección y la actividad va debajo de los pilares', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  PRUEBAS.igual(D.hseq.panel, 'hseq', 'guarda: la contraseña es la del panel de HSEQ');
  PRUEBAS.igual(D.dir.panel, 'direccion', 'guarda: la otra es la de Dirección');
  /* R19 · el derecho a `inicio` lo concede `dashTabsFor(…, panel)` con `panel === 'hseq'`; la marca la pone el
     servidor (`panelDe_`) y la copia `dashCamposDelServidor`. */
  const h = p309Pintar(D.hseq);
  PRUEBAS.igual(h.secs[0], 'inicio', '🔴 la primera sección del panel de HSEQ es el inicio · ' + h.secs.join(' · '));
  PRUEBAS.falso(h.secs.indexOf('idc') >= 0, '🔴 y `idc` no está: pintaría los mismos totales dos veces');
  PRUEBAS.cierto(h.movDebajoDelInicio, '🔴 «Actividad reciente» va DEBAJO de los pilares (decisión de Franco)');
  PRUEBAS.cierto(h.queVieneUltimo && h.queVieneCerrado, '«Lo que viene» sigue al final y plegado (decisión de Franco)');
  /* ⚠️ discriminador · el mismo CH con la contraseña de Dirección: nada cambia ahí hasta P313 (ADR 017). */
  const d = p309Pintar(D.dir);
  PRUEBAS.falso(d.secs.indexOf('inicio') >= 0, '⚠️ discriminador · Dirección no tiene inicio · ' + d.secs.join(' · '));
  PRUEBAS.igual(d.secs[0], 'idc', 'Dirección sigue abriendo con su pestaña de siempre');
  PRUEBAS.cierto(d.movArribaDeTodo, '⚠️ y en Dirección la actividad sigue ARRIBA de todo, como la pidió en P223');
  /* El mapa de riesgo le dice a HSEQ dónde están sus totales: con el nombre de la sección que existe (verificador). */
  PRUEBAS.cierto(h.mapaTxt.indexOf(t('hst_sin_mapa', { s: tabLabel('inicio') })) >= 0 && h.mapaTxt.indexOf(t('tab_idc')) < 0,
    '🔴 el mapa manda a «' + tabLabel('inicio') + '», no a una sección que el panel de HSEQ ya no tiene');
});

/* ── 2 · Los tres pilares de la foto ─────────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · tres pilares, en el orden y con las métricas de la foto, títulos por t()', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const h = p309Pintar(D.hseq);
  PRUEBAS.igual(h.pilares.map(p => p.id), ['hsi_p1', 'hsi_p2', 'hsi_p3'], '🔴 los tres pilares, en su orden');
  PRUEBAS.igual(h.pilares.map(p => p.titulo), [t('hsi_p1'), t('hsi_p2'), t('hsi_p3')], 'R14 · los títulos salen de t()');
  PRUEBAS.igual(h.pilares.map(p => p.ms.join(',')), ['fatiga,kss,cansancio', 'estres,ansiedad,depresion', 'gastro'],
    '🔴 fatiga · somnolencia · cansancio; estrés · ansiedad · depresión; gastro sola (filas 15, 23 y 29)');
  PRUEBAS.igual(h.tarjetas.gastro.titulo, t('hsi_gastro'), 'la ancha se llama «Métricas gastrointestinales» (fila 30)');
  /* R13 · ni un color escrito a mano: el arco y las tendencias van por token. */
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(h.htmlInicio), 'R13 · el inicio no trae colores a mano');
  /* Las columnas, leídas del estilo computado: con layout son pistas medidas («98px 98px 98px»); sin layout (un
     ancestro oculto), la declaración («repeat(3, minmax(0px, 1fr))»). Se cuentan las dos formas. */
  const g = p309Pintar(D.hseq, null, () => [...document.querySelectorAll('#dsec-inicio .hsi-fila')]
    .map(f => p309Columnas(getComputedStyle(f).gridTemplateColumns))).extra;
  PRUEBAS.igual(g, [3, 3, 1], '🔴 fila de tres en los pilares 1 y 2 (fila 22: no 2 + 1), una ancha en el 3');
});

/* ── 3 · Cada número es el total del servidor; el semáforo es el de la tarjeta ───────────────────────────── */
PRUEBAS.caso('🔴 P309 · cada número del inicio es el total del servidor, y el arco y la tendencia siguen el semáforo', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const ref = D.hseq.referencia, verde = 'var(--sem-verde-int)', rojo = 'var(--sem-rojo-alt)';
  /* La semana: cada métrica con un grupo cerrado (un punto: sin línea) y la anterior para la flecha. */
  const h = p309Pintar(D.hseq, { period: 'semana' });
  const P = D.hseq.totalesHseq.periodos.semana;
  const conDato = P309_ORDEN.filter(m => p309Media(P.metricas[m]) != null);
  PRUEBAS.cierto(['kss', 'estres', 'gastro'].every(m => conDato.indexOf(m) >= 0),
    'guarda: KSS, estrés y gastro con grupo cerrado esta semana · ' + conDato.join(','));
  conDato.forEach(m => {
    const a = p309Media(P.metricas[m]), c = h.tarjetas[m];
    /* R21 · el número sale del lector real: el total que mandó el servidor para ese período */
    PRUEBAS.igual(c.kv, a.toFixed(1), '🔴 ' + m + ' muestra el promedio de la semana del servidor');
    PRUEBAS.igual(c.over, a > ref[m], m + ' · la tarjeta en rojo sólo si el promedio supera la referencia');
  });
  const k = h.tarjetas.kss;
  PRUEBAS.cierto(k.arco, '🔴 KSS lleva el medidor de arco (fila 16)');
  PRUEBAS.igual(k.arcoColor, k.over ? rojo : verde, 'el arco, del color del semáforo');
  PRUEBAS.igual(k.kref, '', '🔴 el pilar 1 no lleva «% bajo ref» (fila 16)');
  PRUEBAS.igual(k.desc, t('hsi_d_kss'), 'la descripción del factor, por t() (fila 18)');
  PRUEBAS.cierto(/[▲▼=]/.test(k.ktrend), 'la flecha contra la semana anterior (la línea ▲/▼ se mantiene)');
  PRUEBAS.falso(h.tarjetas.estres.arco, 'el pilar 2 no lleva arco: número grande (fila 24)');
  PRUEBAS.cierto(h.tarjetas.estres.kref.length > 0, '🔴 el pilar 2 sí lleva «% bajo ref» (fila 26)');
  PRUEBAS.cierto(h.tarjetas.gastro.sparkAlta, '🔴 la tarjeta ancha lleva el gráfico grande (fila 32)');

  /* La tendencia, en «Todo el historial» (lo que ve al abrir): KSS y estrés tienen dos semanas cerradas. */
  const todo = p309Pintar(D.hseq), Pt = D.hseq.totalesHseq.periodos.todo;
  const serieKss = (Pt.metricas.kss.serie || []).filter(x => x && x.n > 0).map(p309Media);
  PRUEBAS.cierto(serieKss.length >= 2 && serieKss[serieKss.length - 1] > serieKss[0] &&
    p309Media(Pt.metricas.kss) <= ref.kss, 'guarda: la serie de KSS SUBE y el promedio queda bajo la referencia · ' +
    serieKss.map(x => x.toFixed(2)).join(' → '));
  PRUEBAS.cierto(todo.tarjetas.kss.spark && todo.tarjetas.estres.spark, 'guarda: KSS y estrés dibujan su tendencia');
  P309_ORDEN.filter(m => p309Media(Pt.metricas[m]) != null).forEach(m => {
    const c = todo.tarjetas[m];
    PRUEBAS.igual(c.kv, p309Media(Pt.metricas[m]).toFixed(1), m + ' · en «Todo el historial», el total de todo el historial');
    if (c.spark) PRUEBAS.igual(c.sparkColor, c.over ? rojo : verde,
      '🔴 ' + m + ' · la tendencia tiene el color del semáforo, no el de la pendiente (fila 17)');
  });
  PRUEBAS.igual(todo.tarjetas.kss.sparkColor, verde, '🔴 KSS sube pero está bajo la referencia: su tendencia es VERDE (en la foto las tres suben y son verdes)');
  PRUEBAS.cierto(dashSpark(serieKss, ref.kss).indexOf(rojo) >= 0,
    '⚠️ discriminador · la MISMA serie con la regla de siempre (sin `op`) sale roja: en «Tus promedios» sigue así');
  PRUEBAS.falso(todo.tarjetas.kss.sparkRef, '🔴 en el pilar 1, sin la referencia punteada (fila 17)');
  PRUEBAS.cierto(todo.tarjetas.estres.sparkRef, '⚠️ discriminador · en el pilar 2 la referencia punteada sigue (fila 25)');

  /* ⚠️ discriminador · el MISMO payload con la referencia de KSS por debajo del promedio: la tarjeta, el arco y la
     tendencia pasan a rojo juntos. Si el color saliera de otro lado, uno de los tres se quedaría verde. */
  const conRefBaja = Object.assign({}, D.hseq, { referencia: Object.assign({}, ref, { kss: 0.5 }) });
  const r = p309Pintar(conRefBaja).tarjetas.kss;
  PRUEBAS.cierto(r.over, '⚠️ discriminador · con la referencia abajo, KSS en rojo');
  PRUEBAS.igual(r.arcoColor, rojo, '⚠️ y el arco también');
  PRUEBAS.igual(r.sparkColor, rojo, '⚠️ y la tendencia también');
});

/* ── 4 · Debajo del piso, nada de los tests ──────────────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · debajo de 5 medidos la tarjeta del inicio no pinta nada de los tests, tampoco el color', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const h = p309Pintar(D.hseq, { period: 'semana' });
  const P = D.hseq.totalesHseq.periodos.semana;
  const bajo = P309_ORDEN.filter(m => p309Media(P.metricas[m]) == null);
  PRUEBAS.cierto(bajo.indexOf('ansiedad') >= 0 && bajo.indexOf('fatiga') >= 0,
    'guarda: ansiedad (tres personas) y fatiga (nadie) quedan debajo del piso · ' + bajo.join(','));
  bajo.forEach(m => {
    const c = h.tarjetas[m];
    PRUEBAS.cierto(c.bajo, '🔴 ' + m + ' · la tarjeta de debajo del piso');
    PRUEBAS.falso(c.over || c.arco || c.spark || !!c.ktrend || c.kconf,
      '🔴 ' + m + ' · sin color, sin arco, sin tendencia, sin flecha y sin «poco confiables»');
    PRUEBAS.igual(c.kv, t('kpi_bajo_piso', { n: 5 }), m + ' · dice que todavía no hay un grupo');
    PRUEBAS.igual(c.kref, t('hsi_bajo_piso_d', { n: 5 }), m + ' · con la razón corta (la larga, en la guía ⓘ)');
  });
  /* ⚠️ discriminador · una métrica CON su grupo completo (estrés) sí muestra su número */
  PRUEBAS.cierto(h.tarjetas.estres && !h.tarjetas.estres.bajo, '⚠️ discriminador · estrés, con su grupo, sí pinta');
});

/* ── 5 · La tarjeta: la divisoria sólo antes del aviso ───────────────────────────────────────────────────── */
PRUEBAS.caso('P309 · en el pilar 1 la divisoria va antes de «poco confiables», y sin aviso no hay divisoria', () => {
  if (typeof dashKpiCardHtml !== 'function') { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El número de poco confiables lo manda el servidor por total (`pocoConfiables`) y llega igual que desde P308; acá
     se mide sólo la forma de la tarjeta con y sin aviso. */
  const prev = DASH;
  try {
    DASH = Object.assign({}, prev || {}, { ref: { kss: 6 } });
    const op = hseqPilares()[0].op;
    const con = dashKpiCardHtml('kss', 4, null, [], 2, op), sin = dashKpiCardHtml('kss', 4, null, [], 0, op);
    PRUEBAS.cierto(con.indexOf('kpi-div') >= 0 && con.indexOf('kpi-div') < con.indexOf('kconf'), 'la divisoria, antes del aviso (fila 19)');
    PRUEBAS.falso(sin.indexOf('kpi-div') >= 0, '⚠️ sin aviso no queda una raya suelta');
  } finally { DASH = prev; }
});

/* ── 6 · El header: ☰, el ← adentro, las iniciales y el glosario ────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · el ☰ abre y CIERRA el menú, y el ← va adentro con la misma regla', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const h = p309Pintar(D.hseq, { dep: 'Operaciones' }, () => {
    const btn = document.getElementById('hseqMenuBtn'), panel = document.getElementById('dfmPanel');
    const out = {};
    dfmClose();
    btn.click(); out.abre = panel.classList.contains('open');
    out.aria = btn.getAttribute('aria-expanded');
    btn.click(); out.cierra = !panel.classList.contains('open');
    /* ⚠️ discriminador · con el oyente de antes (sin la excepción del ☰), el segundo toque NO cierra: lo cierra el
       oyente en captura y el `onclick` lo vuelve a abrir. */
    btn.click();
    const viejo = e => { const w = document.querySelector('.dfm-wrap'); if (w && !w.contains(e.target)) dfmClose(); };
    document.addEventListener('click', viejo, true);
    try { btn.click(); out.viejoNoCierra = panel.classList.contains('open'); }
    finally { document.removeEventListener('click', viejo, true); dfmClose(); }
    /* El ← de adentro: con un filtro puesto, deshace el filtro (`portalBackToGate` → `dashAtras`), como el del header. */
    document.getElementById('dfmVolverBtn').click();
    out.filtroDeshecho = DASH && DASH.f && DASH.f.dep === '';
    return out;
  });
  PRUEBAS.cierto(h.menu, '🔴 el ☰ está en el header del panel de HSEQ (fila 2)');
  PRUEBAS.cierto(h.extra.abre && h.extra.aria === 'true', 'el ☰ abre el menú y lo anuncia');
  PRUEBAS.cierto(h.extra.cierra, '🔴 y el segundo toque lo CIERRA');
  PRUEBAS.cierto(h.extra.viejoNoCierra, '⚠️ discriminador · con el oyente de antes, el segundo toque no cerraba');
  PRUEBAS.falso(h.back, '🔴 con un filtro puesto, el ← NO está en el header de HSEQ…');
  PRUEBAS.cierto(h.volver, '🔴 …está adentro del menú');
  PRUEBAS.cierto(h.extra.filtroDeshecho, '🔴 y hace lo mismo: deshace el filtro, sin cerrar el panel');
  const d = p309Pintar(D.dir, { dep: 'Operaciones' });
  PRUEBAS.cierto(d.back && !d.volver, '⚠️ discriminador · en Dirección el ← sigue en el header y el de adentro no está');
  PRUEBAS.falso(d.menu || d.glos || d.bar || d.conBar, 'en Dirección no hay ☰, ni glosario en el header, ni botonera');
});

PRUEBAS.caso('🔴 P309 · las iniciales de la cuenta en un círculo, y con logo, el logo', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  PRUEBAS.igual(hseqIniciales('Aeroambulancias Silva, C.A.'), 'AS', 'sin la forma societaria');
  PRUEBAS.igual(hseqIniciales('Transporte de Carga del Sur'), 'TC', 'sin artículos');
  PRUEBAS.igual(hseqIniciales('Helitec'), 'H', 'una palabra, una inicial');
  PRUEBAS.igual(hseqIniciales(''), '', 'sin nombre, nada');
  /* R21 · el nombre de las iniciales es el mismo que el del header (`dashNombreCuenta`) */
  const h = p309Pintar(D.hseq);
  PRUEBAS.cierto(h.iniVisible && h.iniTxt === 'H', '🔴 sin marca, las iniciales del alcance · «' + h.iniTxt + '»');
  const conNombre = p309Pintar(Object.assign({}, D.hseq, { marca: { nombre: 'Aeroambulancias Silva, C.A.' } }));
  PRUEBAS.igual(conNombre.iniTxt, 'AS', 'con marca sin logo, las del nombre de la marca');
  const conLogo = p309Pintar(Object.assign({}, D.hseq, { marca: { nombre: 'Aeroambulancias Silva, C.A.', logo: location.origin + '/logo.png' } }));
  PRUEBAS.falso(conLogo.iniVisible, '🔴 con logo, el logo: las iniciales no se suman');
  PRUEBAS.falso(p309Pintar(D.dir).iniVisible, '⚠️ discriminador · Dirección no las tiene');
});

PRUEBAS.caso('🔴 P309 · el glosario va en el header de HSEQ, abre y cierra, y no explica el PVT', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const h = p309Pintar(D.hseq, null, () => {
    const btn = document.getElementById('hseqGlosBtn'), panel = document.getElementById('glossPanel');
    glossClose();
    btn.click(); const abre = panel.classList.contains('open');
    const textos = document.getElementById('glossPanelBody').textContent;
    btn.click(); const cierra = !panel.classList.contains('open');
    return { abre: abre, cierra: cierra, pvt: textos.indexOf(t('gl_pvt_t')) >= 0, kss: textos.indexOf(t('gl_kss_t')) >= 0 };
  });
  PRUEBAS.cierto(h.glos && !h.glosViejo, '🔴 el glosario está en el header (fila 9), no en la barra que quedó detrás del ☰');
  PRUEBAS.cierto(h.extra.abre && h.extra.cierra, '🔴 abre y cierra con el mismo botón');
  PRUEBAS.cierto(h.extra.kss, 'explica los indicadores que HSEQ ve');
  PRUEBAS.falso(h.extra.pvt, 'y no el PVT, que no está entre sus totales');
  /* ⚠️ discriminador · fuera del panel de HSEQ el glosario sigue completo */
  const prev = DASH;
  try { DASH = null; PRUEBAS.cierto(glossItems().some(i => i[0] === t('gl_pvt_t')), '⚠️ discriminador · el glosario de siempre trae el PVT'); }
  finally { DASH = prev; }
});

/* ── 7 · La botonera: ⌂, «Ver reporte semanal ›» y ⓘ ─────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · la botonera: ⌂ vuelve arriba, ⓘ es la guía (cerrada por defecto) y sólo en HSEQ', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const h = p309Pintar(D.hseq, null, () => {
    const out = {}, s = document.getElementById('dashScroll');
    let pedido = null;
    s.scrollTo = o => { pedido = o; };
    try {
      dfmToggle(); hseqGuiaToggle();
      out.guiaAbierta = !document.getElementById('hseqGuia').hidden;
      out.guiaAria = document.getElementById('hseqInfoBtn').getAttribute('aria-expanded');
      out.guiaTexto = document.getElementById('hseqGuiaTexto').innerHTML.length;
      document.querySelector('#hseqBar .hseq-bar-ini').click();
      out.top = pedido && pedido.top;
      out.cerroMenu = !document.getElementById('dfmPanel').classList.contains('open');
      out.cerroGuia = document.getElementById('hseqGuia').hidden;
    } finally { delete s.scrollTo; clearTimeout(dashScrollTo._t); _dashSpyLock = 0; }   // R18 · el ⌂ deja armado el freno del marcador
    return out;
  });
  PRUEBAS.cierto(h.bar && h.conBar, '🔴 la botonera está en el panel de HSEQ (filas 35 a 38)');
  PRUEBAS.cierto(h.guiaCerrada, 'R5 · la guía arranca cerrada');
  PRUEBAS.cierto(h.extra.guiaAbierta && h.extra.guiaAria === 'true' && h.extra.guiaTexto > 200, 'la ⓘ abre la guía de HSEQ, con texto');
  PRUEBAS.igual(h.extra.top, 0, '🔴 el ⌂ vuelve arriba de todo, donde abre el panel');
  PRUEBAS.cierto(h.extra.cerroMenu && h.extra.cerroGuia, 'y cierra el menú y la guía que estuvieran abiertos');
});

PRUEBAS.caso('🔴 P309 · «Ver reporte semanal ›» abre la semana del servidor contra la anterior, y «atrás» la cierra', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const P = D.hseq.totalesHseq.periodos.semana;
  const prevS = (P.previo && P.previo.metricas) || {};
  PRUEBAS.cierto(p309Media(prevS.kss) != null, 'guarda: la semana anterior tiene KSS cerrado (para medir la flecha)');
  const np = window.navPush, nc = window.navConsumir;
  let h;
  window.navPush = () => {}; window.navConsumir = () => {};
  try {
    /* El inicio en «Todo el historial» (lo que ve al abrir): la hoja es de la SEMANA igual, no del filtro. */
    h = p309Pintar(D.hseq, null, () => {
      document.querySelector('#hseqBar .hseq-bar-sem').click();
      const ov = document.getElementById('hseqSemanaOv');
      const out = { abierta: ov.classList.contains('show') };
      out.filas = [...document.querySelectorAll('#hseqSemanaCuerpo .hsem-fila')].map(f => ({
        m: f.dataset.m, v: (f.querySelector('.hsem-v') || {}).textContent || '', bajo: !!f.querySelector('.hsem-bajo'),
        tr: (f.querySelector('.ktrend') || {}).textContent || '', over: !!f.querySelector('.hsem-over') }));
      out.pie = document.getElementById('hseqSemanaCuerpo').textContent.indexOf(t('hsi_sem_pie')) >= 0;
      out.atras = silvaAtras();
      out.cerrada = !ov.classList.contains('show');
      return out;
    });
  } finally { window.navPush = np; window.navConsumir = nc; }
  const x = h.extra;
  PRUEBAS.cierto(x.abierta, '🔴 el botón abre la hoja');
  PRUEBAS.igual(x.filas.map(f => f.m), P309_ORDEN, 'los siete, en el orden de los pilares');
  x.filas.forEach(f => {
    const a = p309Media(P.metricas[f.m]);
    if (a == null) {
      PRUEBAS.cierto(f.bajo && !f.tr, '🔴 ' + f.m + ' · debajo del piso, ni número ni flecha');
      return;
    }
    PRUEBAS.igual(f.v, a.toFixed(1), '🔴 ' + f.m + ' · el total de la SEMANA del servidor');
    PRUEBAS.igual(f.over, a > D.hseq.referencia[f.m], f.m + ' · el rojo es el mismo semáforo de la tarjeta');
    /* La flecha esperada, escrita acá y no pedida a `dashVariacionHtml`: si esa función se rompe, esto lo ve. */
    const pv = p309Media(prevS[f.m]);
    const pct = (pv == null || !(Math.abs(pv) > 0.01)) ? null : Math.round((a - pv) / Math.abs(pv) * 100);
    const esperado = pct == null ? '' : pct === 0 ? '= ' + t('kpi_igual') : (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '%';
    PRUEBAS.igual(f.tr, esperado, f.m + ' · la flecha compara contra la semana ANTERIOR del servidor');
  });
  PRUEBAS.cierto(x.filas.some(f => /[▲▼=]/.test(f.tr)), 'guarda: al menos una flecha medida');
  /* ⚠️ discriminador · «Todo el historial» y la semana no dan lo mismo: si la hoja leyera el período del filtro, se
     vería acá. */
  const todo = D.hseq.totalesHseq.periodos.todo;
  PRUEBAS.cierto(P309_ORDEN.some(m => p309Media(todo.metricas[m]) != null &&
    (p309Media(todo.metricas[m]) || 0).toFixed(1) !== (p309Media(P.metricas[m]) == null ? '' : p309Media(P.metricas[m]).toFixed(1))),
    '⚠️ discriminador · el total de todo el historial difiere del de la semana en alguna métrica');
  PRUEBAS.cierto(x.pie, 'avisa que el cierre semanal completo llega más adelante (P329)');
  PRUEBAS.cierto(x.atras && x.cerrada, '🔴 el «atrás» del teléfono cierra la hoja (silvaAtras la conoce)');
});

/* ── 8 · Sin totales o con un rango a medida, se dice ────────────────────────────────────────────────────── */
PRUEBAS.caso('P309 · sin totales el inicio dice por qué, y con un rango a medida también', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const c = p309Pintar(Object.assign({}, D.hseq, { totalesHseq: { error: true, causa: 'cuenta' } }));
  PRUEBAS.igual(c.secs[0], 'inicio', 'el inicio sigue arriba aunque no tenga totales');
  PRUEBAS.cierto(c.txtInicio.indexOf(t('hst_cuenta')) >= 0 && c.pilares.length === 0, 'sin cuenta única: lo dice, sin pilares');
  const r = p309Pintar(D.hseq, { period: 'rango' });
  PRUEBAS.cierto(r.txtInicio.indexOf(t('hst_rango')) >= 0 && r.pilares.length === 0, 'con un rango a medida: lo dice, sin pilares');
  const s = p309Pintar(D.hseq, { period: 'semana' });
  PRUEBAS.igual(s.cab, t('hst_per_semana', { d: dashFechaLinda(D.hseq.totalesHseq.periodos.semana.desde),
    h: dashFechaLinda(D.hseq.totalesHseq.periodos.semana.hasta) }), 'el período se nombra con sus fechas (la semana del calendario)');
});

/* ── 9 · El corte y el reloj del cierre (verificador, hallazgo 1) ─────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · el inicio dice de cuándo es el corte, y avisa si el reloj del cierre no corrió o se paró', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const conT = cambios => Object.assign({}, D.hseq, { totalesHseq: Object.assign({}, D.hseq.totalesHseq, cambios) });
  /* El reloj «al día» se fija acá, a cinco minutos: el del emulador queda en `P308_AHORA` y, contra el reloj real, desde
     el 3/11 ya parecería parado y el control mentiría (verificador, 2.ª vuelta). Los textos esperados se arman CON el
     panel en pantalla: la hora es la de la operación. */
  const reciente = new Date(Date.now() - 5 * 60000), corte = new Date(D.hseq.totalesHseq.corte);
  const esperar = u => () => ({ corte: t('hst_corte', { d: dashFechaLinda(fechaOpDe(corte)), h: horaOpDe(corte) }),
                               parado: t('hst_reloj_parado', { d: dashFechaLinda(fechaOpDe(u)), h: horaOpDe(u) }) });
  PRUEBAS.cierto(!isNaN(corte), 'guarda: el servidor mandó la hora del último grupo cerrado');
  const base = p309Pintar(conT({ ultimaCorrida: reciente.toISOString() }), null, esperar(reciente));
  PRUEBAS.cierto(base.kfresco.indexOf(base.extra.corte) >= 0, '🔴 el inicio dice de cuándo es el último grupo cerrado · «' + base.kfresco + '»');
  PRUEBAS.cierto(base.kfresco.indexOf(t('hst_sin_corrida')) < 0 && base.kfresco.indexOf(base.extra.parado) < 0,
    '⚠️ control · con el reloj al día, no avisa nada · «' + base.kfresco + '»');
  const sin = p309Pintar(conT({ ultimaCorrida: null }));
  PRUEBAS.cierto(sin.kfresco.indexOf(t('hst_sin_corrida')) >= 0, '🔴 sin una corrida del reloj, lo dice');
  const u = new Date(Date.now() - 3 * 3600e3);
  const parado = p309Pintar(conT({ ultimaCorrida: u.toISOString() }), null, esperar(u));
  PRUEBAS.cierto(parado.kfresco.indexOf(parado.extra.parado) >= 0, '🔴 con el reloj parado hace tres horas, lo dice · «' + parado.kfresco + '»');
  const det = p309Pintar(conT({ detenido: { causa: 'hoja', desde: u.toISOString() }, ultimaCorrida: reciente.toISOString() }));
  PRUEBAS.cierto(det.detenido && !base.detenido, '🔴 con el cierre detenido, el aviso va arriba de los pilares (y sin él, no)');
});

/* ── 10 · El «atrás» del teléfono (fila 2 del inventario) ─────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P309 · el «atrás» del teléfono funciona igual en el panel de HSEQ: primero deshace el filtro', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  /* R19 · lo decide `silvaAtras` (rama `portalOverlay` → `dashAtras`): P309 no la toca, y este caso mide que el panel
     nuevo no cambió lo que hace. Dirección es la comparación. */
  const np = window.navPush, nc = window.navConsumir, prev = DASH, res = {};
  const splashAntes = document.getElementById('splashOv').classList.contains('show');
  let demoAntes; try { demoAntes = DEMO_PAYLOAD; } catch (e) {}
  window.navPush = () => {}; window.navConsumir = () => {};
  try {
    [['hseq', D.hseq], ['dir', D.dir]].forEach(([k, pl]) => {
      CTX.resetear(); localStorage.clear();
      splashAbrirPortal();
      onDashData(JSON.parse(JSON.stringify(pl)), 'Helitec', { usuario: 'helitec' }, 'hseq');
      DASH.f.dep = 'Operaciones'; renderDash();
      const ov = document.getElementById('portalOverlay');
      const abierto = ov.classList.contains('show') && document.getElementById('portalDash').style.display !== 'none';
      const r = silvaAtras();
      res[k] = { abierto: abierto, r: r, dep: DASH && DASH.f ? DASH.f.dep : null, sigue: ov.classList.contains('show') };
    });
  } finally {
    try { closePortal(true); } catch (e) {}
    /* R18 · lo que `closePortal` deja distinto de como estaba: el splash a la vista y la demo olvidada (verificador). */
    try { if (!splashAntes) { splashAnimFrenar(); splashLangHintFrenar(); document.getElementById('splashOv').classList.remove('show'); syncScrollLock(); } } catch (e) {}
    try { DEMO_PAYLOAD = demoAntes; } catch (e) {}
    window.navPush = np; window.navConsumir = nc;
    try { DASH = prev; dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
  PRUEBAS.cierto(res.hseq.abierto, 'guarda: el portal abierto con el panel de HSEQ a la vista');
  PRUEBAS.cierto(res.hseq.r === true && res.hseq.dep === '' && res.hseq.sigue,
    '🔴 en el panel de HSEQ, «atrás» deshace el filtro y no cierra el panel · ' + JSON.stringify(res.hseq));
  PRUEBAS.igual(res.hseq, res.dir, '⚠️ y hace exactamente lo mismo que en Dirección');
});

/* ── 11 · El ↻ cuando cambia la marca del panel (verificador, hallazgos 4 y 6) ───────────────────────────── */
PRUEBAS.caso('🔴 P309 · si un ↻ trae otra marca de panel u otra marca de empresa, el header y las pestañas la siguen', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const prev = DASH, dr = window.dashRequest, rep0 = window.dashRepintar, res = {};
  const inicial = Object.assign(JSON.parse(JSON.stringify(D.hseq)),
    { marca: { nombre: 'Helitec Viejo', logo: location.origin + '/logo.png', color: '#123456' } });
  const leer = () => {
    const portal = document.querySelector('#portalOverlay .sheet.portal'), lg = document.getElementById('dashBrandLogo');
    return { tabs: (DASH.tabs || []).slice(), panel: DASH.panel, vista: (document.getElementById('dashVista') || {}).textContent || '',
             nombre: document.getElementById('dashScope').textContent, logo: lg.style.display !== 'none',
             color: portal ? portal.style.getPropertyValue('--orange').trim() : null, bar: !document.getElementById('hseqBar').hidden };
  };
  /* A · los MISMOS datos con otra marca de panel y de empresa: el ↻ corta por «sin cambios de datos» y sólo repinta, que
     es la rama donde estaba el defecto (verificador, 2.ª vuelta). B · datos de Dirección: la rama que repinta todo. */
  const igual = Object.assign(JSON.parse(JSON.stringify(D.hseq)), { panel: 'direccion', marca: { nombre: 'Consorcio Helitec' } });
  const otro = Object.assign(JSON.parse(JSON.stringify(D.dir)), { marca: { nombre: 'Consorcio Helitec' } });
  const correr = (pl, k) => {
    CTX.resetear(); localStorage.clear();
    onDashData(JSON.parse(JSON.stringify(inicial)), 'Helitec', { usuario: 'helitec' }, 'hseq');
    res[k + '0'] = leer();
    const mio = DASH; let repintes = 0;
    window.dashRepintar = function () { repintes++; return rep0.apply(this, arguments); };
    window.dashRequest = () => Promise.resolve(JSON.parse(JSON.stringify(pl)));
    return dashRefresh(false).then(() => { res[k] = Object.assign(leer(), { mismo: DASH === mio, repintes: repintes }); });
  };
  /* R18 · la restauración va en el `.finally()` de la promesa, no en el del bloque */
  return correr(igual, 'A').then(() => correr(otro, 'B')).then(() => {
    const a0 = res.A0;
    PRUEBAS.cierto(a0.tabs.indexOf('inicio') >= 0 && a0.logo && a0.color === '#123456' && a0.vista === t('vista_panel_hseq'),
      'guarda: arrancó en el panel de HSEQ, con el logo y el color de la marca vieja · ' + JSON.stringify(a0));
    PRUEBAS.cierto(res.A.repintes > 0 && res.B.repintes === 0, 'guarda: A cortó por «sin cambios de datos» y B repintó todo');
    ['A', 'B'].forEach(k => {
      const x = res[k];
      PRUEBAS.cierto(x.mismo && x.panel === 'direccion', k + ' · guarda: el ↻ trajo la marca de Dirección');
      PRUEBAS.falso(x.tabs.indexOf('inicio') >= 0, '🔴 ' + k + ' · las pestañas se recalcularon: sin inicio · ' + x.tabs.join(','));
      PRUEBAS.cierto(x.tabs.indexOf('idc') >= 0, k + ' · y con la de Dirección');
      PRUEBAS.igual(x.vista, t('vista_direccion'), '🔴 ' + k + ' · la insignia dice el panel nuevo');
      PRUEBAS.igual(x.nombre, 'Consorcio Helitec', '🔴 ' + k + ' · el nombre de arriba sigue a la marca nueva');
      PRUEBAS.cierto(!x.logo && !x.color, '🔴 ' + k + ' · sin el logo ni el color de la marca vieja · ' + JSON.stringify({ logo: x.logo, color: x.color }));
      PRUEBAS.falso(x.bar, k + ' · y sin la botonera de HSEQ');
    });
  }).finally(() => {
    window.dashRequest = dr; window.dashRepintar = rep0;
    try { DASH = prev; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  });
});

/* ── 12 · El ⌂ del administrador y el ojo de la demo con la botonera (verificador, hallazgo 3) ─────────────── */
PRUEBAS.caso('P309 · con la botonera, el ⌂ del administrador cambia de ícono, y los flotantes quedan debajo de la guía', () => {
  if (p309Saltea()) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const D = p309Datos(); if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda'); return; }
  const leer = () => {
    const fab = document.getElementById('admFab'), demo = document.getElementById('demoFab'), bar = document.getElementById('hseqBar');
    return { zFab: Number(getComputedStyle(fab).zIndex), zDemo: demo ? Number(getComputedStyle(demo).zIndex) : null,
             zBar: Number(getComputedStyle(bar).zIndex),
             casa: getComputedStyle(fab.querySelector('.adm-fab-casa')).display, gente: getComputedStyle(fab.querySelector('.adm-fab-gente')).display,
             aria: fab.getAttribute('aria-label') };
  };
  const h = p309Pintar(D.hseq, null, leer).extra, d = p309Pintar(D.dir, null, leer).extra;
  PRUEBAS.cierto(h.zFab < h.zBar && (h.zDemo == null || h.zDemo < h.zBar), '🔴 la guía ⓘ queda encima de los flotantes · ' + JSON.stringify(h));
  PRUEBAS.cierto(h.casa === 'none' && h.gente !== 'none', '🔴 el del administrador ya no es otra casa');
  PRUEBAS.cierto(d.casa !== 'none' && d.gente === 'none', '⚠️ discriminador · sin la botonera (Dirección), la casa de siempre');
  PRUEBAS.igual(h.aria, t('adm_fab_personas'), '🔴 y su nombre accesible tampoco es otro «inicio» (verificador, 2.ª vuelta)');
  PRUEBAS.igual(d.aria, t('adm_ir_inicio'), '⚠️ discriminador · sin la botonera, el nombre de siempre');
});
