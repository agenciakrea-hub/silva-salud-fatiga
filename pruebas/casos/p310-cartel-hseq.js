/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P310 · EL CARTEL DEL HEADER DE HSEQ Y LA CONFIABILIDAD DEL TEST DE DEPRESIÓN (cliente) (2026-11-01)
   El cartel (filas 5, 6, 7 y 10 de la foto de Rafael) sólo PINTA lo que manda el servidor: la etapa
   (`estadoPeriodoHseq_`, sin cuántos en rojo) y los totales del período (`hseqTotalesMarco`). R17: todo entra
   por `onDashData` con el payload del `.gs` real (`p309Datos`, que usa el mundo de P308; este archivo va
   después de los dos). Para los bordes se cambia un número del payload real, nunca su forma.
   R19: lo pinta `hseqEstadoPintar` (desde `dashUpdateHseqUI`), sólo con `hseqEsPanel()`; el corte de la
   cobertura es `dashCoberturaMinima`, el mismo del IDC; la confiabilidad, `hseqConfiabilidad`.
   C50: el test de depresión guarda su confiabilidad con `confGuardar('depresion', …)` desde `finalizarTest`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('P310 · el cartel de HSEQ y la confiabilidad (cliente)');

function p310Saltea() { return typeof p309Datos !== 'function' || p309Saltea() || typeof hseqEstadoPintar !== 'function'; }
/* Lo que se ve del cartel, leído del DOM. */
function p310Cartel() {
  const q = s => document.querySelector(s);
  const box = q('#dashEstado'), chip = q('#hseqChip'), fila = q('#hseqEstadoFila');
  const pal = box && box.querySelector('.hse-palabra'), esc0 = box && box.querySelector('.hse-escudo');
  const cob = box && box.querySelector('.hse-cob');
  const clase = el => el ? ((el.getAttribute('class') || '').match(/hse-c-(\w+)/) || [])[1] || null : null;
  return {
    fila: !!fila && !fila.hidden, visible: !!box && !box.hidden,
    etapa: pal ? pal.dataset.etapa : null, color: clase(pal) || clase(box && box.querySelector('.hse-sin')), escudo: clase(esc0),
    signo: !box ? null : box.querySelector('.hse-circulo circle[r="1.45"]') ? 'alerta' : box.querySelector('.hse-circulo path[d^="M7.4"]') ? 'tilde' : null,
    signoEscudo: !esc0 ? null : esc0.querySelector('circle') ? 'alerta' : esc0.querySelectorAll('path').length > 1 ? 'tilde' : 'nada',
    texto: box ? box.textContent.replace(/\s+/g, ' ').trim() : '', cob: cob ? cob.textContent : '',
    sub: ((box && box.querySelector('.hse-sub')) || {}).textContent || '', aria: box ? box.getAttribute('aria-label') : '',
    chip: !!chip && !chip.hidden, chipN: ((chip && chip.querySelector('.hsc-n')) || {}).textContent || '',
    glosEnFila: !!(fila && fila.querySelector('#hseqGlosBtn')),
    tamPalabra: pal ? getComputedStyle(pal).fontSize : '', tamCob: cob ? getComputedStyle(cob).fontSize : '',
    conChip: q('#portalDash').classList.contains('con-hseq-chip')
  };
}
/* El payload real de HSEQ con el período con que abre el panel (`semana`, desde P310) cambiado: `est` reemplaza su
   estado, `nom` la nómina. */
function p310Payload(est, nom, umbral) {
  const x = JSON.parse(JSON.stringify(p309Datos().hseq));
  if (est !== undefined) x.totalesHseq.periodos.semana.estado = est;
  if (nom !== undefined) x.nominaTotal = nom;
  if (umbral !== undefined) x.totalesHseq.umbralEstado = umbral;
  return x;
}
function p310Pinta(payload, f) { return p309Pintar(payload, f, p310Cartel).extra; }

PRUEBAS.caso('🔴 P310 · el cartel pinta la etapa del servidor con su color y su signo, y sigue al período del ☰', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const d = p309Datos();
  PRUEBAS.igual(d.faltan || [], [], 'guarda: el payload del .gs real');
  if (d.faltan) return;
  const real = d.hseq.totalesHseq.periodos;
  PRUEBAS.cierto(!!(real.todo.estado && real.semana.estado), 'guarda: el servidor manda el estado de cada período · ' + JSON.stringify(real.todo.estado));
  const c0 = p309Pintar(d.hseq, null, () => Object.assign(p310Cartel(), { periodo: DASH.f.period })).extra;
  PRUEBAS.igual([c0.fila, c0.visible, c0.glosEnFila], [true, true, true], 'en el panel de HSEQ se ve la fila del estado, con el glosario');
  /* R19 · el período con que abre lo pone `onDashData` (`f.period`), sólo para el panel de HSEQ */
  PRUEBAS.igual(c0.periodo, 'semana', '🔴 el panel de HSEQ abre en la semana (decisión de Franco, 2026-11-02)');
  PRUEBAS.igual(c0.etapa, real.semana.estado.etapa, '🔴 la etapa es la que mandó el servidor para el período del ☰, sin recalcularla');
  const cTodo = p310Pinta(d.hseq, { period: 'all' });
  PRUEBAS.igual(cTodo.etapa, real.todo.estado.etapa, '🔴 con «todo» en el ☰, la de todo el historial');
  const pDir = p309Pintar(d.dir, null, () => DASH.f.period).extra;
  PRUEBAS.igual(pDir, 'all', 'Dirección sigue abriendo como siempre');
  const casos = { seguro: ['verde', 'tilde', 'SEGURO', ''], atencion: ['verde', 'tilde', 'SEGURO', 'requiere atención'],
                  levemente: ['ambar', 'alerta', 'LEVEMENTE SEGURO', ''], poco: ['rojo', 'alerta', 'POCO SEGURO', 'requiere acción'] };
  Object.keys(casos).forEach(e => {
    const c = p310Pinta(p310Payload({ etapa: e, personas: 12 }, 12));
    const [col, sig, pal, sub] = casos[e];
    PRUEBAS.igual([c.etapa, c.color, c.escudo, c.signo, c.signoEscudo], [e, col, col, sig, sig], '🔴 ' + e + ': escudo y círculo ' + col + ', con ' + sig);
    PRUEBAS.cierto(c.texto.indexOf(pal) === 0 && c.sub === sub, e + ': dice «' + pal + (sub ? ' · ' + sub : '') + '» · ' + c.texto);
    PRUEBAS.cierto(c.aria.indexOf(pal) >= 0, e + ': el lector de pantalla oye la etapa · ' + c.aria);
  });
});

PRUEBAS.caso('🔴 P310 · con menos del 70 % de la nómina medida se atenúa y dice «N de M medidos» del mismo tamaño; «POCO SEGURO» nunca', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  /* Los bordes del plan: 14 de 20 queda como la foto, 13 de 20 se atenúa; con 13 de 20 y un rojo, «POCO SEGURO» sin
     atenuar. Y el redondeo del IDC: 139 de 200 es 69,5 % → 70 → como la foto. */
  const c14 = p310Pinta(p310Payload({ etapa: 'seguro', personas: 14 }, 20));
  const c13 = p310Pinta(p310Payload({ etapa: 'seguro', personas: 13 }, 20));
  const c13r = p310Pinta(p310Payload({ etapa: 'poco', personas: 13 }, 20));
  const c139 = p310Pinta(p310Payload({ etapa: 'atencion', personas: 139 }, 200));
  const lev = p310Pinta(p310Payload({ etapa: 'levemente', personas: 13 }, 20));
  PRUEBAS.igual([c14.color, c14.cob], ['verde', ''], '🔴 14 de 20 (70 %): como la foto');
  PRUEBAS.igual([c13.color, c13.escudo, c13.cob], ['tenue', 'tenue', '13 de 20 medidos'], '🔴 13 de 20 (65 %): atenuado, con «13 de 20 medidos»');
  PRUEBAS.igual(c13.tamCob, c13.tamPalabra, '🔴 «N de M medidos» del mismo tamaño que la palabra');
  PRUEBAS.igual([lev.color, lev.cob], ['tenue', '13 de 20 medidos'], 'LEVEMENTE SEGURO también se atenúa');
  PRUEBAS.igual([c13r.color, c13r.cob], ['rojo', ''], '🔴 «POCO SEGURO» con 13 de 20: sin atenuar, un rojo es un hecho');
  PRUEBAS.igual([c139.color, c139.cob], ['verde', ''], '🔴 69,5 % redondea a 70, como el IDC');
  const sinNom = p310Pinta(p310Payload({ etapa: 'seguro', personas: 12 }, 0));
  PRUEBAS.igual([sinNom.color, sinNom.cob], ['tenue', '12 medidos'], '🔴 sin nómina legible no se sabe la cobertura: atenuado, con cuántos se midieron (falla cerrado)');
  /* Franco, 2026-11-02: sin cuántos en rojo; aunque un payload viejo los trajera, el cartel no pinta ningún número */
  const conNum = p310Pinta(p310Payload({ etapa: 'poco', personas: 9, rojos: 3 }, 9));
  PRUEBAS.igual([conNum.sub, /\d/.test(conNum.texto)], ['requiere acción', false], '🔴 POCO SEGURO no dice cuántos en rojo');
  /* Discriminador: con el corte en 65, 13 de 20 deja de atenuarse (prueba que el caso mira el corte que usa el cartel) */
  const real = dashCoberturaMinima;
  let d;
  try { window.dashCoberturaMinima = () => 65; d = p310Pinta(p310Payload({ etapa: 'seguro', personas: 13 }, 20)); }
  finally { window.dashCoberturaMinima = real; }
  PRUEBAS.igual(d.color, 'verde', '⚠️ discriminador · con otro corte, el mismo 13 de 20 se ve como la foto');
});

PRUEBAS.caso('🔴 P310 · debajo del piso no hay etapa, ni color, ni cuántos, ni porcentaje', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const x = p310Payload({ etapa: null, causa: 'bajo_piso' });
  /* P388 · sin ningún total en NINGÚN período (la causa es «todavía nadie completó un grupo»), el cartel dice lo de
     siempre; con totales en otro período o sin nómina dice la causa, y eso lo mide `p388-piso-3.js`. Hasta P388 este
     caso vaciaba sólo la semana. El piso, el que mandó el servidor (era 5 escrito acá). */
  Object.keys(x.totalesHseq.periodos).forEach(per => { const met = x.totalesHseq.periodos[per].metricas; Object.keys(met).forEach(m => { met[m] = null; }); });
  /* y el reloj del cierre al día, como en producción: con el reloj parado no se afirma nada de los grupos (P388) */
  x.totalesHseq.ultimaCorrida = new Date(Date.now() - 5 * 60000).toISOString();
  const c = p310Pinta(x), n = x.totalesHseq.piso;
  PRUEBAS.igual([c.visible, c.etapa, c.color, c.signo, c.chip], [true, null, 'tenue', null, false], '🔴 sin grupo: escudo tenue, sin etapa, sin signo y sin chip');
  PRUEBAS.igual(c.texto, t('kpi_bajo_piso', { n: n }), 'dice lo mismo que las tarjetas: «Todavía no hay un grupo de ' + n + '»');
  const conTarjetas = p310Pinta(p310Payload({ etapa: null, causa: 'bajo_piso' }));
  PRUEBAS.igual(conTarjetas.texto, t('hse_sin_estado'), '🔴 con tarjetas con números y sin grupo «estado», no dice «todavía no hay un grupo de N»');
  const p = p310Pinta(p310Payload({ etapa: null, causa: 'sin_calcular' }));
  PRUEBAS.igual([p.etapa, p.texto], [null, t('hse_sin_calcular')], '🔴 antes del primer cálculo (cuenta con grupos de métricas y sin grupos «estado»), lo dice: no «menos del piso»');
  PRUEBAS.cierto(!/\d/.test(c.texto.split(String(n)).join('')), 'ningún número más que el piso');
});

PRUEBAS.caso('🔴 P310 · el chip es la confiabilidad de los tests evaluados del período, y sólo de las métricas que los traen', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  /* R19 · `hseqConfiabilidad`: (Σ evaluados − Σ poco confiables) / Σ evaluados, de las métricas con `evaluados` */
  const x = p310Payload({ etapa: 'seguro', personas: 12 }, 12), met = x.totalesHseq.periodos.semana.metricas;
  const ks = Object.keys(met).filter(m => met[m]);
  PRUEBAS.cierto(ks.length >= 2, 'guarda: hay al menos dos métricas con total');
  met[ks[0]].evaluados = 40; met[ks[0]].pocoConfiables = 3;
  met[ks[1]].evaluados = 10; met[ks[1]].pocoConfiables = 2;
  ks.slice(2).forEach(m => { met[m].evaluados = null; met[m].pocoConfiables = 7; });
  const c = p310Pinta(x);
  PRUEBAS.igual([c.chip, c.chipN, c.conChip], [true, '90.0 %', true], '🔴 (50 − 5) / 50 = 90,0 %: las métricas sin evaluados no cuentan, ni sus poco confiables');
  ks.forEach(m => { met[m].evaluados = null; });
  const s = p310Pinta(x);
  PRUEBAS.igual([s.chip, s.conChip], [false, false], 'sin ningún test evaluado, no hay chip (ni su hueco)');
});

PRUEBAS.caso('🔴 P310 · el cartel no se reescribe si no cambió nada (es una región que el lector de pantalla anuncia)', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  /* R19 · `hseqEstadoPintar` escribe con `poner`, que compara contra lo último escrito (M4 del verificador) */
  const mut = p309Pintar(p310Payload({ etapa: 'atencion', personas: 12 }, 12), null, () => {
    const obs = new MutationObserver(() => {});
    obs.observe(document.getElementById('hseqEstadoFila'), { childList: true, subtree: true, characterData: true, attributes: true });
    renderDash(); renderDash();
    const n = obs.takeRecords().length; obs.disconnect(); return n;
  }).extra;
  PRUEBAS.igual(mut, 0, '🔴 dos repintados sin cambio de datos: ninguna mutación en el cartel ni en el chip');
});

PRUEBAS.caso('🔴 P310 · el cartel es sólo del panel de HSEQ: Dirección no lo ve', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const d = p309Datos();
  const c = p310Pinta(d.dir);
  PRUEBAS.igual([c.fila, c.visible, c.chip], [false, false, false], '🔴 en Dirección no hay estado ni chip (no recibe los totales)');
  const h = p310Pinta(d.hseq);
  PRUEBAS.igual(h.fila, true, 'y en HSEQ, sí (control)');
});

PRUEBAS.caso('P310 · la guía ⓘ explica las cuatro etapas con el umbral que rige', () => {
  if (p310Saltea()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const leer = (umbral) => p309Pintar(p310Payload(undefined, undefined, umbral), null, () => {
    hseqGuiaToggle(); const tx = document.getElementById('hseqGuiaTexto').textContent; hseqGuiaCerrar(); return tx; }).extra;
  const g25 = leer(25), g20 = leer(20);
  PRUEBAS.cierto(g25.indexOf('más del 25 %') >= 0 && g25.indexOf('POCO SEGURO') >= 0 && g25.indexOf('70 %') >= 0, 'la guía nombra las etapas, el 25 % y el 70 %');
  PRUEBAS.cierto(g25.indexOf('personas medidas') >= 0 && g25.indexOf('nunca se atenúa') >= 0 && g25.indexOf('vale para cada uno') >= 0,
    'y dice que POCO SEGURO nunca se atenúa, y cuándo lo de un grupo vale para cada uno');
  PRUEBAS.cierto(g20.indexOf('más del 20 %') >= 0, '🔴 con «umbralEstado = 20», la guía dice 20 %');
  PRUEBAS.cierto(g25.indexOf('semáforo') >= 0 && g25.indexOf('tanda') >= 0, 'y explica que el estado mira cada test (no espera dos seguidos) y cuenta por tanda');
  PRUEBAS.cierto(g25.indexOf('{u}') < 0 && g25.indexOf('{n}') < 0, 'sin marcadores sin reemplazar');
});

PRUEBAS.caso('🔴 P310 · C50 · el test de depresión mide el tiempo de cada respuesta y guarda su confiabilidad, como los otros seis', () => {
  if (typeof abrirTest !== 'function' || typeof finalizarTest !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  /* R19 · lo guarda `confGuardar('depresion', …)` desde `finalizarTest`, con los tiempos de `confPaso(testConf)` */
  const orig = { empEncolar: window.empEncolar, enviarConCola: window.enviarConCola, testCerrarYAvisar: window.testCerrarYAvisar,
                 misGuardarMetricas: window.misGuardarMetricas, getProfile: window.getProfile, navPush: window.navPush, now: Date.now };
  const enc = [];
  let reloj = Date.parse('2026-11-03T15:00:00-04:00'), conf = null;
  try {
    window.empEncolar = (id, accion, payload) => { enc.push({ id: id, accion: accion, payload: payload }); };
    window.enviarConCola = () => {}; window.testCerrarYAvisar = () => {}; window.misGuardarMetricas = () => {}; window.navPush = () => {};
    window.getProfile = () => ({ nombre: 'Ana Prueba', empresa: 'Helitec', departamento: 'Operaciones' });
    Date.now = () => reloj;
    const correr = (pasoMs, valor) => {
      enc.length = 0;
      abrirTest({ id: 'sen_depresion', testFlow: 'depresion' });
      for (let i = 0; i < TEST_DEPRESION.length; i++) { reloj += pasoMs; responderTest(valor(i)); }
      finalizarTest(); cerrarTest();
      return enc.filter(e => e.accion === 'confiabilidad_guardar').map(e => e.payload);
    };
    const apurado = correr(400, () => 0), pausado = correr(6000, i => i % 4);
    PRUEBAS.igual(apurado.length, 1, '🔴 se encola UNA fila de confiabilidad por test de depresión');
    PRUEBAS.igual(apurado[0] && [apurado[0].test, apurado[0].confiable, apurado[0].preguntas], ['depresion', false, TEST_DEPRESION.length],
      '🔴 apurado (0,4 s por respuesta, todas iguales): poco confiable, con las 15 respuestas medidas');
    PRUEBAS.igual(pausado[0] && [pausado[0].confiable, pausado[0].medianaSeg], [true, 6], '🔴 con 6 s por respuesta: confiable');
    PRUEBAS.cierto(!!(pausado[0] && /_depresion$/.test(pausado[0].id)), 'el id es el del test de depresión (uno por persona, día y test)');
    /* «atrás» descarta el tiempo junto con la respuesta (los dos arreglos alineados) */
    abrirTest({ id: 'sen_depresion', testFlow: 'depresion' });
    reloj += 5000; responderTest(1); reloj += 5000; responderTest(2); retrocederTest();
    conf = [testRespuestas.length, testConf && testConf.tiempos.length];
    cerrarTest();
    PRUEBAS.igual(conf, [1, 1], '«atrás» saca la respuesta y su tiempo');
    /* Discriminador: sin la llamada a `confGuardar`, no se encola nada (el caso mira la llamada real) */
    const cg = window.confGuardar;
    let sin;
    try { window.confGuardar = () => null; sin = correr(400, () => 0); } finally { window.confGuardar = cg; }
    PRUEBAS.igual(sin.length, 0, '⚠️ discriminador · sin `confGuardar`, el test de depresión no deja fila');
  } finally {
    Date.now = orig.now;
    Object.keys(orig).forEach(k => { if (k !== 'now') window[k] = orig[k]; });
    try { cerrarTest(); localStorage.removeItem(K_CONFIABILIDAD); } catch (e) {}
  }
});
