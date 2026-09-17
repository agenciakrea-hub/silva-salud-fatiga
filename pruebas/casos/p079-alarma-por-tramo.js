/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P079 · I1-f (hallazgo 9) · SÓLO LA JORNADA PINTA ALARMA; EL DESCANSO PREVIO CORTO SE DICE (2026-09-17)

   Un traslado 4 minutos largo se pintaba con el mismo rojo que una jornada 2 horas excedida: en una
   consola donde el rojo tiene que querer decir «actúa ahora», eso entrena a ignorarlo. Ahora la FORMA
   declara qué tramos alarman (`alarma:true`: la jornada; en campo también el viaje). Los demás muestran
   el número sin color; pasado previsto × 1,5, ámbar («mucho más de lo previsto»). El descanso cumplido
   no es «de más», y el descanso CORTO antes de este ciclo se dice en la tarjeta.
   Camino real: `onDashData` → `renderCicloOperativo()`; `cicloMiBloque()` con el ciclo propio.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P079_AHORA = Date.now();
const p079Hace = min => new Date(P079_AHORA - min * 60000).toISOString();
const P079_PLAN = JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 });
function p079Ev(evento, min, extra){
  return Object.assign({ evento, iso: p079Hace(min), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto',
    fecha: p079Hace(min).slice(0, 10), plan: P079_PLAN, test: '', resultado: null }, extra || {});
}
function p079Entrar(operacional, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: {}, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: p079Hace(60).slice(0, 10), kss: 4 }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null,
    operacional: operacional
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p079', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p079' }, 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { clearTimeout(_cicDetRevisarT); } catch(e){}   // ningún diferido colgado para el caso siguiente
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    try { if (extra && extra.config && extra.config.sector) aplicarIdioma(); } catch(e){} };   // entrar con otro sector repinta la app entera: se vuelve al de siempre (R18, en el DOM)
}
function p079Tarjeta(persona){
  const cont = document.createElement('div'); cont.innerHTML = renderCicloOperativo();
  cont.__kpi = cls => { const e = cont.querySelector('.cic-kpi-' + cls + ' b'); return e ? Number(e.textContent) : null; };
  const card = [...cont.querySelectorAll('.cic-card')].find(c => (c.querySelector('.cic-nom') || {}).textContent === persona) || null;
  if (card) card.__cont = cont;
  return card;
}
const p079Fila = (card, k) => card ? [...card.querySelectorAll('.cic-tramo')].find(x => x.querySelector('.cic-tr-top b').textContent === t(cicloTramos().find(y => y.k === k).corto)) : null;

PRUEBAS.caso('🔴 P079 · un traslado 4 min largo NO es alarma: muestra el número sin rojo, el ciclo sigue «En curso» y no cuenta como pasado de tiempo', () => {
  /* traslado cerrado en 64 min (previsto 60): salió hace 3 h 4 min, llegó hace 3 h; jornada en curso (3 h de 12) */
  const fin = p079Entrar([p079Ev('salida_casa', 244), p079Ev('llegada_aero', 180)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    PRUEBAS.cierto(!!card, 'guarda: la tarjeta');
    const tras = p079Fila(card, 'traslado');
    PRUEBAS.cierto(!!tras && tras.classList.contains('cic-tr-ok') && !tras.classList.contains('cic-tr-exc'), '🔴 el traslado no está en rojo · ' + (tras && tras.className));
    PRUEBAS.cierto(tras.textContent.indexOf(t('cic_de_mas', { d: cicloHM(4) })) >= 0, 'pero el número se dice: «4 min de más» · ' + tras.querySelector('.cic-tr-det').textContent);
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_curso'), '🔴 el ciclo está «En curso», no «Pasado de tiempo»');
    PRUEBAS.igual(card.querySelector('.cic-seg.cic-tras.exc'), null, 'la barra no pinta el traslado en rojo');
    PRUEBAS.igual(card.__cont.__kpi('venc'), 0, 'KPI «pasados de tiempo»: 0');
    const st = cicloEstado(cicloArmar()[dashNorm('Ana Suárez')], Date.now(), cicloPlan('Ana Suárez'));
    PRUEBAS.falso(st.huboExceso, 'huboExceso: false (el exceso es de un tramo sin alarma)');
    PRUEBAS.cierto(st.tramos[0].delta === 4 && st.tramos[0].excedido === false && st.tramos[0].alarma === false, 'el tramo lleva delta 4, excedido false, alarma false');
  } finally { fin(); }
  /* DISCRIMINADOR · la jornada 4 min pasada SÍ: llegó hace 12 h 4 min y sigue adentro */
  const fin2 = p079Entrar([p079Ev('salida_casa', 784), p079Ev('llegada_aero', 724)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    const jor = p079Fila(card, 'jornada');
    PRUEBAS.cierto(!!jor && jor.classList.contains('cic-tr-exc'), 'DISCRIMINADOR · la jornada 4 min pasada está en rojo');
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_exc'), 'y el ciclo dice «Pasado de tiempo»');
    PRUEBAS.cierto(!!card.querySelector('.cic-seg.cic-serv.exc'), 'y la barra pinta la jornada');
    PRUEBAS.igual(card.__cont.__kpi('venc'), 1, 'KPI «pasados de tiempo»: 1');
  } finally { fin2(); }
  /* y la jornada CERRADA 4 min pasada también deja rastro: rojo en el tramo, exceso en el ciclo */
  const fin3 = p079Entrar([p079Ev('salida_casa', 840), p079Ev('llegada_aero', 780), p079Ev('salida_aero', 56)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    PRUEBAS.cierto(p079Fila(card, 'jornada').classList.contains('cic-tr-exc'), 'jornada cerrada en 12 h 04: rojo');
    PRUEBAS.cierto(cicloEstado(cicloArmar()[dashNorm('Ana Suárez')], Date.now(), cicloPlan('Ana Suárez')).huboExceso, 'y huboExceso');
  } finally { fin3(); }
});

PRUEBAS.caso('🔴 P079 · un traslado MUCHO más largo (3 h contra 1 h) se avisa en ámbar, nunca en rojo; en curso, el número corre sin color hasta «sin cierre»', () => {
  const fin = p079Entrar([p079Ev('salida_casa', 240), p079Ev('llegada_aero', 60)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    const tras = p079Fila(card, 'traslado');
    PRUEBAS.cierto(tras.classList.contains('cic-tr-largo') && !tras.classList.contains('cic-tr-exc'), '🔴 ámbar («largo»), no rojo · ' + tras.className);
    PRUEBAS.cierto(tras.textContent.indexOf(t('cic_largo', { d: cicloHM(120) })) >= 0, '«Mucho más de lo previsto: 2 h 00 min de más» · ' + tras.querySelector('.cic-tr-det').textContent);
    PRUEBAS.cierto(!!card.querySelector('.cic-seg.cic-tras.largo') && !card.querySelector('.cic-seg.exc'), 'la barra lo pinta ámbar y nada en rojo');
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_curso'), 'el ciclo sigue «En curso»');
    PRUEBAS.cierto(getComputedStyle(document.documentElement).getPropertyValue('--sem-ambar').trim() !== '', 'guarda: el token del ámbar existe');
  } finally { fin(); }
  /* en curso: traslado de 70 min (previsto 60) → en curso, «10 min de más», sin botón de cerrar */
  const fin2 = p079Entrar([p079Ev('salida_casa', 70)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    const tras = p079Fila(card, 'traslado');
    PRUEBAS.cierto(tras.classList.contains('cic-tr-curso') && !tras.classList.contains('cic-tr-exc'), '🔴 70 min de traslado: en curso, sin rojo · ' + tras.className);
    PRUEBAS.cierto(tras.textContent.indexOf(t('cic_de_mas_suf')) >= 0 && tras.textContent.indexOf(t('cic_excedido')) < 0, 'dice «de más» pero no «Pasado de tiempo» · ' + tras.querySelector('.cic-tr-det').textContent);
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_curso'), 'ciclo «En curso»');
    PRUEBAS.igual(card.querySelector('.apt-act-cerrar'), null, 'sin «Cerrar ciclo»: 10 min de más no es un olvido');
  } finally { fin2(); }
  const fin3 = p079Entrar([p079Ev('salida_casa', 95)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_sin_cierre'), 'DISCRIMINADOR · a 95 min (techo 90) es «Sin marcar la salida»');
    PRUEBAS.cierto(!!card.querySelector('.apt-act-cerrar'), 'y ahí sí se puede cerrar');
  } finally { fin3(); }
});

PRUEBAS.caso('🔴 P079 · el descanso cumplido no es «de más», y el descanso PREVIO corto se dice en la tarjeta y en el bloque de la persona', () => {
  /* ciclo completo: llegó a casa hace 16 h (descanso previsto 10 h) */
  const fin = p079Entrar([p079Ev('salida_casa', 1800), p079Ev('llegada_aero', 1740), p079Ev('salida_aero', 1020), p079Ev('llegada_casa', 960)]);
  try {
    const card = p079Tarjeta('Ana Suárez');
    const desc = p079Fila(card, 'descanso');
    PRUEBAS.cierto(desc.classList.contains('cic-tr-ok') && desc.textContent.indexOf(t('cic_descanso_cumplido')) >= 0, '🔴 «Descanso cumplido», en verde · ' + desc.className);
    PRUEBAS.falso(desc.textContent.indexOf(t('cic_de_mas_suf')) >= 0 || desc.textContent.indexOf(t('cic_excedido')) >= 0, 'sin «de más» ni «Pasado de tiempo»');
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_comp'), 'ciclo «Completo»');
    PRUEBAS.igual(card.querySelector('.cic-desc-previo'), null, 'sin ciclo anterior no hay línea de descanso previo');
  } finally { fin(); }
  /* descanso previo corto: ayer llegó a casa hace 6 h, hoy salió hace 1 h → 5 h de 10 */
  const evs = [p079Ev('salida_casa', 1200), p079Ev('llegada_aero', 1140), p079Ev('salida_aero', 420), p079Ev('llegada_casa', 360), p079Ev('salida_casa', 60)];
  const fin2 = p079Entrar(evs);
  try {
    const c = cicloArmar()[dashNorm('Ana Suárez')];
    PRUEBAS.cierto(!!c && !!c.previo && c.previo.t0 === Date.parse(p079Hace(1200)), 'guarda: el ciclo vigente lleva el anterior (`previo`)');
    const st = cicloEstado(c, Date.now(), cicloPlan('Ana Suárez'));
    PRUEBAS.igual(st.descansoPrevio && [st.descansoPrevio.real, st.descansoPrevio.previsto, st.descansoPrevio.corto], [300, 600, true], '🔴 descanso previo: 5 h de 10, corto');
    const card = p079Tarjeta('Ana Suárez');
    const linea = card.querySelector('.cic-desc-previo');
    PRUEBAS.cierto(!!linea && linea.textContent === t('cic_desc_previo_corto', { r: cicloHM(300), p: cicloHM(600) }), '🔴 la tarjeta lo dice · ' + (linea && linea.textContent));
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_curso'), 'y el ciclo de hoy sigue «En curso» (no es un exceso)');
    /* la persona, en su inicio */
    setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    localStorage.removeItem(K_CICLO_MIO); localStorage.setItem(K_CICLO_SRV, JSON.stringify(evs));   // sólo lo del servidor: un caso anterior puede haber sembrado eventos propios
    const mio = document.createElement('div'); mio.innerHTML = cicloMiBloque();
    PRUEBAS.cierto(!!mio.querySelector('.cic-desc-previo'), 'el bloque de la persona también lo dice');
    try { clearTimeout(_cicDetRevisarT); } catch(e){}   // no dejar el diferido de la revisión colgado para el caso siguiente
  } finally { fin2(); }
  /* DISCRIMINADORES: 11 h de descanso → sin línea; el anterior detenido (sin llegada a casa) → no se sabe */
  const fin3 = p079Entrar([p079Ev('salida_casa', 1560), p079Ev('llegada_aero', 1500), p079Ev('salida_aero', 780), p079Ev('llegada_casa', 720), p079Ev('salida_casa', 60)]);
  try {
    const st = cicloEstado(cicloArmar()[dashNorm('Ana Suárez')], Date.now(), cicloPlan('Ana Suárez'));
    PRUEBAS.cierto(!!st.descansoPrevio && st.descansoPrevio.real === 660 && st.descansoPrevio.corto === false, 'DISCRIMINADOR · 11 h de descanso: no es corto');
    PRUEBAS.igual(p079Tarjeta('Ana Suárez').querySelector('.cic-desc-previo'), null, 'y no hay línea');
  } finally { fin3(); }
  const ancla = Date.parse(p079Hace(1800));
  const fin4 = p079Entrar([p079Ev('salida_casa', 1860), p079Ev('llegada_aero', 1800),
    p079Ev('detenido', 1800, { iso: new Date(ancla + 1000).toISOString(), test: 'llegada_aero' }), p079Ev('salida_casa', 60)]);
  try {
    const st = cicloEstado(cicloArmar()[dashNorm('Ana Suárez')], Date.now(), cicloPlan('Ana Suárez'));
    PRUEBAS.igual(st.descansoPrevio, null, 'DISCRIMINADOR · el anterior quedó detenido sin llegar a casa: no se sabe cuánto descansó, no se inventa');
  } finally { fin4(); }
});

PRUEBAS.caso('P079 · en la forma «campo» el viaje ES el riesgo: el traslado alarma; y el agrupador sigue dando el mismo ciclo (con `previo`)', () => {
  const fin = p079Entrar([p079Ev('salida_casa', 244), p079Ev('llegada_aero', 180)], { config: { sector: 'campo' } });
  try {
    PRUEBAS.igual(sectorActual(), 'campo', 'guarda: rige la forma campo');
    PRUEBAS.cierto(cicloTramos().filter(cicloTramoAlarma).map(x => x.k).join() === 'traslado,jornada,regreso', 'la forma campo alarma en los tres tramos de trabajo');
    const card = p079Tarjeta('Ana Suárez');
    PRUEBAS.cierto(p079Fila(card, 'traslado').classList.contains('cic-tr-exc'), 'el mismo traslado 4 min largo, en campo, sí es rojo');
  } finally { fin(); }
  PRUEBAS.igual(cicloTramos().filter(cicloTramoAlarma).map(x => x.k).join(), 'jornada', 'DISCRIMINADOR · en la forma estándar sólo la jornada');
  /* el agrupador: tres ciclos → el vigente es el más nuevo y `previo` el segundo; el resto igual que `cicloAgruparTodos` */
  const evs = [p079Ev('salida_casa', 4000), p079Ev('llegada_casa', 3500), p079Ev('salida_casa', 2000), p079Ev('llegada_casa', 1500), p079Ev('salida_casa', 30)];
  const ventana = cicloTotalMin(cicloPlan('')) * 60000;
  const uno = cicloAgruparEventos(evs, ventana), todos = cicloAgruparTodos(evs, ventana);
  PRUEBAS.igual(todos.length, 3, 'guarda: tres ciclos');
  PRUEBAS.cierto(uno.t0 === todos[0].t0 && uno.previo && uno.previo.t0 === todos[1].t0 && !uno.previo.previo, 'el vigente es el más nuevo; `previo` es el segundo (y no encadena más)');
  PRUEBAS.igual(cicloAgruparEventos([], ventana), null, 'sin eventos: null, como antes');
});

PRUEBAS.caso('P079 · R13 · lo nuevo se lee en los DOS temas (medido): el segmento «largo» de la barra, la fila ámbar y la línea del descanso previo', () => {
  /* La primera versión pintaba el segmento con ámbar SÓLIDO y tinta ámbar: 1,65:1 en claro y 1,19:1 en oscuro,
     medido con el portal visible. Fondo claro con borde, y se mide cada vez. */
  const cont = document.createElement('div');
  cont.style.cssText = 'position:absolute;left:-9999px;top:0;width:360px;background:var(--bg)';
  cont.innerHTML = '<div class="cic-card"><div class="cic-riel"><div class="cic-barra"><div class="cic-seg cic-tras on largo" style="flex:60 1 0"><span>T</span></div></div></div>' +
    '<div class="cic-tramos"><div class="cic-tramo cic-tr-largo"><span class="cic-tr-val">3 h</span><span class="cic-tr-det">' + esc(t('cic_largo')) + '</span></div></div>' +
    '<div class="cic-desc-previo">x</div></div>';
  document.body.appendChild(cont);
  const fondoDe = el => { let e = el; while (e && e !== document.body){ const bg = getComputedStyle(e).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
  try {
    ['claro', 'oscuro'].forEach(tema => PRUEBAS.enTema(tema, () => {
      [['.cic-seg.largo span', 4.5], ['.cic-tr-largo .cic-tr-det', 4.5], ['.cic-desc-previo', 4.5]].forEach(([sel, min]) => {
        const e = cont.querySelector(sel);
        const r = CTX.contraste(getComputedStyle(e).color, fondoDe(e));
        PRUEBAS.alMenos(r, min, tema + ' · ' + sel + ' contrasta ' + r + ':1');
      });
    }, cont.querySelector('.cic-desc-previo')));
    /* DISCRIMINADOR del instrumento: la tinta ámbar sobre el ámbar sólido NO llega (así se veía el defecto) */
    const seg = cont.querySelector('.cic-seg.largo'); seg.style.background = 'var(--sem-ambar)'; seg.style.boxShadow = 'none';
    const r = CTX.contraste(getComputedStyle(seg.querySelector('span')).color, getComputedStyle(seg).backgroundColor);
    PRUEBAS.cierto(r < 4.5, 'DISCRIMINADOR · tinta ámbar sobre ámbar sólido mide ' + r + ':1 (por eso el fondo es claro con borde)');
  } finally { cont.remove(); }
});

PRUEBAS.caso('P079 · la demostración cuenta la historia donde tiene sentido: Ana (la excedida) descansó poco; Nicolás (el sano) no lleva la línea', () => {
  const evs = cicloDemo();
  const ventana = cicloTotalMin(cicloPlanEmpresaCompleto()) * 60000;
  const ana = cicloAgruparEventos(evs.filter(e => e.persona === 'Ana Suárez'), ventana);
  const nico = cicloAgruparEventos(evs.filter(e => e.persona === 'Nicolás Herrera'), ventana);
  const sA = cicloEstado(ana, Date.now(), cicloPlanEmpresaCompleto()), sN = cicloEstado(nico, Date.now(), cicloPlanEmpresaCompleto());
  PRUEBAS.igual(sA.estado, 'excedido', 'guarda: Ana sigue siendo el ejemplo con problema (14 h adentro de una jornada de 12)');
  PRUEBAS.cierto(!!sA.descansoPrevio && sA.descansoPrevio.corto === true && sA.descansoPrevio.real === 300, 'Ana descansó 5 h antes de salir: la línea va en su tarjeta');
  PRUEBAS.igual(sN.estado, 'curso', 'guarda: Nicolás en curso');
  PRUEBAS.cierto(!!sN.descansoPrevio && sN.descansoPrevio.corto === false, 'Nicolás descansó 12 h: sin línea · ' + JSON.stringify(sN.descansoPrevio));
});

PRUEBAS.caso('P079 · R12 · la tarjeta con traslado largo y descanso previo corto entra a 375 sin desbordar', () => {
  const fin = p079Entrar([p079Ev('salida_casa', 1200), p079Ev('llegada_aero', 1140), p079Ev('salida_aero', 420), p079Ev('llegada_casa', 360), p079Ev('salida_casa', 240), p079Ev('llegada_aero', 60)]);
  try {
    PRUEBAS.enVentana(375, 812, () => {
      const cont = document.createElement('div'); cont.style.cssText = 'position:absolute;left:0;top:0;width:375px';
      cont.innerHTML = renderCicloOperativo(); document.body.appendChild(cont);
      try {
        const card = [...cont.querySelectorAll('.cic-card')].find(c => (c.querySelector('.cic-nom') || {}).textContent === 'Ana Suárez');
        PRUEBAS.cierto(!!card && !!card.querySelector('.cic-tr-largo') && !!card.querySelector('.cic-desc-previo'), 'guarda: la tarjeta tiene el tramo largo y la línea del descanso previo');
        const fuera = [...card.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > 376).map(e => e.className + ' ' + Math.round(e.getBoundingClientRect().right));
        PRUEBAS.igual(fuera, [], 'nada se sale de los 375 px');
        const seg = card.querySelector('.cic-seg.largo');
        PRUEBAS.cierto(!!seg && seg.getBoundingClientRect().width > 8, 'el segmento ámbar de la barra se ve (' + Math.round(seg.getBoundingClientRect().width) + ' px)');
      } finally { cont.remove(); }
    });
  } finally { fin(); }
});
