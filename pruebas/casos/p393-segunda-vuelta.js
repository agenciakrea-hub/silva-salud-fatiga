PRUEBAS.grupo('P393 · la demostración y el visor, segunda vuelta');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   · F096 · el panel de HSEQ abre en el primer período con totales (`hseqPeriodoDeApertura`), y su pestaña Ciclo dice
     cuántos de cuántos reportaron hoy (`cicloReportoHoy`, la misma cuenta que `lst_reportaron`).
   · Los hallazgos del verificador de P393: `limpiar` (H1 y H2), «reportaron hoy» con ciclos viejos (H3), la marca de «atrás» que
     quedaba pegada (H4) y el ↻ después de un error de totales (H5).
   · Los hallazgos de los verificadores de P391 (H1 a H5, y su D3) y de P386 (H2, H3, H6 y D5 en la demostración).

   Cada caso entra por el camino real (R17): `doPost`/`accionSupervisor` del `.gs` real en el emulador, `onDashData` con ese
   payload, los chips y los selectores de verdad. Cada uno dice qué función concede lo que afirma (R19), tiene su control y
   su discriminador. Lo que un caso cambia vuelve en el `finally` si es sincrónico, o en el `.finally()` de la promesa (R18).

   AYUDANTES DE OTROS ARCHIVOS (por eso va al final de `casos.json` y en `soloConGs`): `p308Limpio`, `p309Pintar`,
   `p310Cartel`, `p388Mundo`, `p388Tests`, `p388Ver`, `p388Num`, `p386Cambiar`, `p386Sabotear`, `p386Volver`, `p386Correr`,
   `p386Atras`, `p386Periodo`, `p386Panel`, `p385EntrarAdmin`, `p385Visor`, `p385Trabajar`, `p385Hasta`, `p385SinEsqueleto`,
   `p391Mundo`, `p391Dif`, `p391DeFuera`, `p391Foto`, `p391Hojas`, `p391Token`. Son funciones declaradas: se ven desde
   acá (sus `const`, no).

   ⚠️ EL REPO ES PÚBLICO: sólo nombres del elenco y de los CH de prueba de P308 y P391, todos inventados.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La gente de la nómina del mundo de P308 (`P388_GENTE` es `const` de otro archivo). */
const P393_GENTE = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis', 'Alma Única'];
function p393SinApp() { return !CTX.hayGs || typeof onDashData !== 'function' || typeof p388Ver !== 'function'; }

/* ═════ F096-1 · el período con que abre el panel de HSEQ ════════════════════════════════════════════════════════════ */

/* El payload del `.gs` real: el piso de personas el día `dia`, sellado el martes 3/11 (`p388Mundo`). `menos` deja el
   grupo debajo del piso. */
function p393Hseq(dia, menos) {
  const P = p388Num('PISO_MIN_HSEQ');
  return p388Mundo(p388Tests(P393_GENTE.slice(0, P - (menos || 0)), dia, '09')).sellarYPedir('2026-11-03T15:00:00-04:00');
}
/* Qué períodos traen algún total, leído del payload (no de la función que se está probando). */
function p393ConTotal(r) {
  const per = (r.totalesHseq && r.totalesHseq.periodos) || {};
  return Object.keys(per).filter(p => Object.keys(per[p].metricas || {}).some(m => ((per[p].metricas[m] || {}).n || 0) > 0)).sort();
}

PRUEBAS.caso('🔴 F096 · el panel de HSEQ abre en el primer período con totales, con tarjetas con número: semana, mes, trimestre, semestre, año o todo', () => {
  /* R19 · lo concede `hseqPeriodoDeApertura`, que llama `dashPeriodoPorDefecto` desde `onDashData`, con los totales que
     acaban de llegar. `p388Ver` entra por `onDashData` con el payload del `.gs` real y lee las tarjetas del DOM. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const CASOS = [
    ['2026-11-03', 'semana', ['anio', 'hoy', 'mes', 'semana', 'semestre', 'todo', 'trimestre']],   // P310: la semana tiene: Semana
    ['2026-11-01', 'mes', ['anio', 'mes', 'semestre', 'todo', 'trimestre']],                       // el domingo de la semana pasada
    ['2026-10-15', 'trimestre', ['anio', 'semestre', 'todo', 'trimestre']],
    ['2026-08-10', 'semestre', ['anio', 'semestre', 'todo']],
    ['2026-03-10', 'anio', ['anio', 'todo']],
    ['2025-06-10', 'all', ['todo']]
  ];
  CASOS.forEach(([dia, abre, conTotal]) => {
    const r = p393Hseq(dia);
    PRUEBAS.igual(p393ConTotal(r), conTotal, 'guarda · con tests del ' + dia + ', los períodos con totales son los que se quiere medir');
    const v = p388Ver(r);
    PRUEBAS.igual(v.periodo, abre, '🔴 con totales desde «' + abre + '» abre ahí');
    PRUEBAS.alMenos(v.conNumero, 1, '🔴 y con tarjetas con número, no «Todavía no hay un grupo» (' + abre + ')');
    PRUEBAS.igual(v.causa, null, 'sin aviso de causa: el período que abrió tiene totales (' + abre + ')');
  });
});

PRUEBAS.caso('🔴 F096 · sin ningún total, abre en «Semana» y dice su causa', () => {
  /* R19 · `hseqPeriodoDeApertura` cae a `semana`; la causa la dice `hseqCausaVacio`. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p393Hseq('2026-11-03', 1);
  PRUEBAS.igual(p393ConTotal(r), [], 'guarda: debajo del piso, ningún período tiene totales');
  const v = p388Ver(r);
  PRUEBAS.igual([v.periodo, v.conNumero], ['semana', 0], '🔴 abre en «Semana», sin tarjetas con número');
  PRUEBAS.igual(v.causa, 'sin_grupos', '🔴 y dice la causa');
  /* un panel sin totales (el servidor falló o es un servidor viejo) tampoco rompe */
  const sinT = JSON.parse(JSON.stringify(r)); sinT.totalesHseq = { error: 'x' };
  PRUEBAS.igual(p388Ver(sinT).periodo, 'semana', 'con los totales en error, también en «Semana»');
});

PRUEBAS.caso('🔴 F096 · nunca abre en «Hoy»: con totales sólo en el día, abre en «Semana»', () => {
  /* R19 · `hseqPrimerPeriodoConTotal`, que usa `hseqPeriodoDeApertura`, saca `hoy` de la lista. Con datos de verdad no se puede dar (hoy ⊂ semana): se arma un
     payload del `.gs` real con los demás períodos vaciados, para que el discriminador tenga qué medir. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = JSON.parse(JSON.stringify(p393Hseq('2026-11-03')));
  Object.keys(r.totalesHseq.periodos).filter(p => p !== 'hoy').forEach(p => { r.totalesHseq.periodos[p].metricas = {}; });
  PRUEBAS.igual(p393ConTotal(r), ['hoy'], 'guarda: sólo el día tiene totales');
  PRUEBAS.igual(p388Ver(r).periodo, 'semana', '🔴 abre en «Semana»');
  try {
    p386Sabotear('hseqPrimerPeriodoConTotal', [[".filter(p => p !== 'hoy')", '']]);
    PRUEBAS.igual(p388Ver(r).periodo, 'dia', '⚠️ discriminador · sin sacar «hoy» de la lista, abriría en el día');
  } finally { p386Volver(); }
});

PRUEBAS.caso('🔴 F096 · un período abierto así NO cuenta como elegido: de ahí, Dirección abre en «Todo»; y el aviso y su botón siguen para quien elige un período vacío', () => {
  /* R19 · `periodoElegido` lo pone sólo `dashSetPeriod`; `dashFiltrosDelPanelNuevo` decide con la marca. El aviso, `hseqCausaVacio`. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p393Hseq('2026-11-01');
  const leido = {};
  const v = p388Ver(r, null, () => {
    leido.periodo = DASH.f.period; leido.marca = !!DASH.f.periodoElegido; leido.fIni = dashFiltrosDelPanelNuevo('');
  });
  PRUEBAS.igual([leido.periodo, leido.marca], ['mes', false], '🔴 abrió en «Mes», sin la marca de elegido');
  PRUEBAS.falso('period' in leido.fIni, '🔴 y no viaja al panel siguiente · ' + JSON.stringify(leido.fIni));
  PRUEBAS.igual(v.causa, null, 'CONTROL · en el período que abrió, ningún aviso');
  /* la persona elige la semana, vacía, por su chip */
  const e = p388Ver(r, { chip: 'semana' }, () => { leido.fIniSem = dashFiltrosDelPanelNuevo(''); });
  PRUEBAS.igual([e.periodo, e.causa, e.boton], ['semana', 'otro_periodo', t('hst_causa_ver', { p: periodoLabel('mes') })],
    '🔴 eligiendo la semana vacía, el aviso `otro_periodo` y su botón siguen');
  PRUEBAS.igual([leido.fIniSem.period, leido.fIniSem.periodoElegido], ['semana', true], '🔴 y eso sí viaja al panel siguiente');
});

PRUEBAS.caso('🔴 F096 · R21 · la apertura y la causa leen la MISMA lista de períodos y el mismo predicado de la tarjeta', () => {
  /* R19 · `hseqPeriodosTotales` y `hseqPeriodoTieneTotal` (con `hseqTieneTotal`), de `hseqPeriodoDeApertura` y `hseqCausaVacio`. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p393Hseq('2026-08-10');
  const v = p388Ver(r), e = p388Ver(r, { chip: 'semana' });
  PRUEBAS.igual([v.periodo, e.boton], ['semestre', t('hst_causa_ver', { p: periodoLabel('semestre') })], 'CONTROL · abre en el semestre, y desde la semana vacía nombra el semestre');
  /* DISCRIMINADOR · sin «semestre» en la lista, cambian LAS DOS: si una tuviera su copia, seguiría diciendo lo de antes */
  try {
    p386Cambiar('hseqPeriodosTotales', () => ['hoy', 'semana', 'mes', 'trimestre', 'anio', 'todo']);
    const s = p388Ver(r), es = p388Ver(r, { chip: 'semana' });
    PRUEBAS.igual([s.periodo, es.boton], ['anio', t('hst_causa_ver', { p: periodoLabel('anio') })], '⚠️ discriminador · la lista sin el semestre mueve la apertura y la causa a la vez');
  } finally { p386Volver(); }
  /* DISCRIMINADOR · con otro predicado de «tiene total», también las dos */
  try {
    p386Cambiar('hseqTieneTotal', () => false);
    const s = p388Ver(r), es = p388Ver(r, { chip: 'semana' });
    PRUEBAS.igual([s.periodo, es.causa], ['semana', 'sin_grupos'], '⚠️ discriminador · sin totales según la tarjeta, abre en la semana y la causa dice que no hay grupos');
  } finally { p386Volver(); }
});

PRUEBAS.caso('⚠️ F096 · DISCRIMINADOR · con el período fijo en `semana` (la 7.64), un HSEQ con datos en el mes abre con las siete tarjetas vacías', () => {
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p393Hseq('2026-11-01');
  try {
    p386Cambiar('hseqPeriodoDeApertura', () => 'semana');
    const v = p388Ver(r);
    PRUEBAS.igual([v.periodo, v.conNumero, v.causa], ['semana', 0, 'otro_periodo'], '⚠️ discriminador · abre en la semana, sin un número, y el caso de arriba lo ve');
  } finally { p386Volver(); }
});

PRUEBAS.caso('🔴 F096 · la demostración de HSEQ: el lunes, con la semana sin grupo, abre en «Mes»; el miércoles, en «Semana»', () => {
  /* R19 · `onDashData` con el payload de `accionDemo` (`demoPayloadDeVista`), con los totales de `totalesHseqDemo_`. ADR 020:
     «los lunes, la semana de HSEQ de la demo arranca vacía» (lo que cae en «hoy» son las 2 personas del ancla). En el CH de
     P391 los grupos de tres cierran justo en el ancla (18 tests): sin Ana quedan 17, y los dos del ancla no cierran grupo. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const lunes = p391Mundo({ reloj: '2026-11-09T14:00:00Z', sin: ['Ana Suárez'] }).demo();
  const mie = p391Mundo({ sin: ['Ana Suárez'] }).demo();
  const ver = d => p309Pintar(demoPayloadDeVista(d, 'hseqPanel'), null, () => ({ periodo: DASH.f.period, panel: DASH.panel, demo: DASH.demoMode })).extra;
  PRUEBAS.igual(p393ConTotal(lunes).indexOf('semana'), -1, 'guarda: el lunes la semana de la demostración no tiene totales');
  PRUEBAS.cierto(p393ConTotal(lunes).indexOf('mes') >= 0, 'guarda: y el mes sí');
  PRUEBAS.igual(ver(lunes), { periodo: 'mes', panel: 'hseq', demo: true }, '🔴 el lunes abre en «Mes»');
  PRUEBAS.cierto(p393ConTotal(mie).indexOf('semana') >= 0, 'guarda: el miércoles la semana tiene totales');
  PRUEBAS.igual(ver(mie), { periodo: 'semana', panel: 'hseq', demo: true }, 'CONTROL · el miércoles, en «Semana» (P310)');
});

PRUEBAS.caso('🔴 P393 · verificador H5 · abierto con los totales en error, el ↻ que los trae abre en el primer período con totales', () => {
  /* R19 · `dashRefresh`, que vuelve a decidir con `hseqPeriodoDeApertura` sólo si el panel no tenía ningún total y nadie eligió
     período. La pantalla misma manda a tocar ↻, y ahí quedaba el síntoma de F096: «Semana», sin números. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const conMes = p393Hseq('2026-11-01'), conSemana = p393Hseq('2026-11-03'), sinNada = p393Hseq('2026-11-03', 1);
  const pinta = x => { const c = p308Limpio(x); if (c.totalesHseq && !c.totalesHseq.error) c.totalesHseq.ultimaCorrida = new Date(Date.now() - 5 * 60000).toISOString(); return c; };
  const conError = x => { const c = JSON.parse(JSON.stringify(x)); c.totalesHseq = { error: 'x' }; return c; };
  const abrir = p => { CTX.resetear(); localStorage.clear(); onDashData(pinta(p), 'Helitec', { usuario: 'helitec' }, 'hseq'); };
  const foto = () => ({ per: DASH.f.period, elegido: !!DASH.f.periodoElegido,
    conNumero: Array.from(document.querySelectorAll('#dsec-inicio .kpi')).filter(k => !k.classList.contains('kpi-bajo-piso')).length });
  const refrescar = p => { window.dashRequest = () => Promise.resolve(pinta(p)); return dashRefresh(true); };
  const prev = DASH, prevReq = window.dashRequest;
  return (async () => {
    abrir(conError(conMes));
    PRUEBAS.igual(foto().per, 'semana', 'guarda: con los totales en error abre en «Semana»');
    PRUEBAS.igual(await refrescar(conMes), true, 'guarda: el ↻ contestó');
    let f = foto();
    PRUEBAS.igual([f.per, f.elegido], ['mes', false], '🔴 el ↻ lo lleva a «Mes», y no cuenta como elegido');
    PRUEBAS.alMenos(f.conNumero, 1, '🔴 con tarjetas con número: los datos de los registros no cambiaron, y aun así repintó');
    /* lo mismo si no había ningún total, sin error: el cierre de grupos corrió mientras estaba abierto */
    abrir(sinNada);
    PRUEBAS.igual(foto().per, 'semana', 'guarda: sin ningún total abre en «Semana»');
    await refrescar(conMes);
    PRUEBAS.igual(foto().per, 'mes', '🔴 sin ningún total antes, también');
    /* CONTROLES · error otra vez: no se mueve ni rompe */
    abrir(conError(conMes));
    await refrescar(conError(conMes));
    PRUEBAS.igual(foto().per, 'semana', 'CONTROL · si el ↻ vuelve a traer error, sigue en «Semana»');
    /* lo que la persona eligió no se pisa */
    abrir(conError(conMes));
    dashSetPeriod('trimestre');
    await refrescar(conMes);
    PRUEBAS.igual([foto().per, foto().elegido], ['trimestre', true], 'CONTROL · lo elegido no se pisa, aunque lleguen los totales');
    /* con totales, el período no se mueve debajo de quien lo está mirando */
    abrir(conMes);
    PRUEBAS.igual(foto().per, 'mes', 'guarda: abrió en «Mes»');
    await refrescar(conSemana);
    PRUEBAS.igual(foto().per, 'mes', 'CONTROL · con algún total ya a la vista, un ↻ no lo mueve');
    /* DISCRIMINADOR · sin volver a decidir (la 7.65 antes de esto) */
    p386Sabotear('dashRefresh', [["if (hseqEstabaSinTotales && DASH.panel === 'hseq' && hseqPrimerPeriodoConTotal(DASH.totalesHseq)){", 'if (false){']]);
    abrir(conError(conMes));
    await refrescar(conMes);
    f = foto();
    PRUEBAS.igual([f.per, f.conNumero], ['semana', 0], '⚠️ discriminador · sin volver a decidir queda en «Semana» sin números: el aserto de arriba lo ve');
  })().finally(() => {
    p386Volver();
    window.dashRequest = prevReq;
    try { DASH = prev; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  });
});

/* ═════ F096-2 · la pestaña Ciclo de HSEQ dice cuántos de cuántos ════════════════════════════════════════════════════ */

/* Cinco personas con tests hoy y dos con un evento del ciclo hace 20 minutos, con el reloj del servidor en AHORA (el ciclo
   lo evalúa el cliente con el reloj de verdad). */
function p393MundoCiclo() {
  const ahora = new Date(), hace = new Date(ahora.getTime() - 20 * 60000);
  const dia = fechaOpDe(ahora);
  const op = (p, id) => [fechaOpDe(hace), horaOpDe(hace), hace.toISOString(), id, p, 'Helitec', 'Operaciones', 'Piloto', 'salida_casa', '', '', ''];
  const tests = P393_GENTE.slice(0, 5).map((p, i) => p308Test({ p: p, d: dia, h: '00:' + String(10 + i), v: 3 }));
  return p388Mundo(tests, { ahora: ahora.toISOString(), operacional: [op('Oscar Uno', 'op393-1'), op('Olga Dos', 'op393-2')] });
}
/* Pinta el payload por `onDashData` en la vista dada y lee la pestaña Ciclo del DOM. */
function p393Ciclo(payload, vista, periodo) {
  const prev = DASH, prevPer = CICLO_PERIODO;
  try {
    CTX.resetear(); localStorage.clear();
    onDashData(JSON.parse(JSON.stringify(payload)), 'Helitec', { usuario: 'helitec' }, vista);
    if (periodo) { CICLO_PERIODO = periodo; renderDash(); }
    const s = document.getElementById('dsec-ciclo');
    if (!s) return { sinSeccion: true };
    const num = sel => Number((s.querySelector(sel) || {}).textContent) || 0;
    return { linea: ((s.querySelector('.dash-block .db-sub') || {}).textContent) || '', reportaron: ((s.querySelector('.cic-grises-n') || {}).textContent) || '',
             sin: num('.cic-kpi-sin b'), curso: num('.cic-kpi-curso b'), tarjetas: s.querySelectorAll('.cic-card').length };
  } finally {
    CICLO_PERIODO = prevPer;
    try { DASH = prev; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
}

PRUEBAS.caso('🔴 F096 · Ciclo de HSEQ dice «2 de 5 personas reportaron hoy», la misma cuenta que «2 de 5 reportaron hoy» del supervisor, y cierra con «3 sin iniciar»', () => {
  /* R19 · lo concede `cicloHseqAgregado` con `cicloReportoHoy`, el mismo predicado con que `renderCicloOperativo` cuenta
     `lst_reportaron` (R21). Decía «5 personas con ciclo registrado hoy» al lado de «0 en curso… 5 sin iniciar». */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const w = p393MundoCiclo();
  const hseq = p393Ciclo(w.sellarYPedir(null, {}, 'hseq-308'), 'hseq');
  const sup = p393Ciclo(w.pedir({}, 'sup-308'), 'supervisor');
  PRUEBAS.falso(!!hseq.sinSeccion || !!sup.sinSeccion, 'guarda: los dos paneles tienen la pestaña Ciclo');
  PRUEBAS.igual([hseq.curso, hseq.sin], [2, 3], 'guarda: dos en curso, tres sin iniciar');
  PRUEBAS.igual(hseq.linea, t('cic_hseq_d', { a: 2, n: 5 }), '🔴 HSEQ dice cuántos de cuántos');
  PRUEBAS.igual(sup.reportaron, t('lst_reportaron', { a: 2, n: 5 }), '🔴 R21 · con los mismos dos números que el supervisor');
  /* nadie reportó: el caso que midió Franco («20 con ciclo registrado» y «20 sin iniciar») */
  const nadie = JSON.parse(JSON.stringify(w.pedir({}, 'hseq-308'))); nadie.operacional = [];
  const n = p393Ciclo(nadie, 'hseq');
  if (!n.sinSeccion) PRUEBAS.igual(n.linea, t('cic_hseq_d', { a: 0, n: 5 }), '🔴 sin reportes dice «0 de 5», no «5 con ciclo registrado»');
  /* con el período a la vista: en 30 días, «hoy» sería falso */
  const per = p393Ciclo(w.pedir({ opDias: '30' }, 'hseq-308'), 'hseq', '30');
  PRUEBAS.igual(per.linea, t('cic_hseq_d_per', { a: 2, n: 5, d: 30 }), '🔴 mirando 30 días, dice «en los últimos 30 días» y no «hoy»');
  /* DISCRIMINADOR · contando a todos, como antes */
  try {
    p386Cambiar('cicloReportoHoy', () => true);
    PRUEBAS.igual(p393Ciclo(w.pedir({}, 'hseq-308'), 'hseq').linea, t('cic_hseq_d', { a: 5, n: 5 }), '⚠️ discriminador · contando a todos dice «5 de 5» con «3 sin iniciar» al lado: el caso lo ve');
  } finally { p386Volver(); }
});

/* Cinco personas con tests hoy; los eventos del ciclo, los que diga el caso: `[persona, evento, días atrás, minutos]`. */
function p393MundoCicloCon(evs) {
  const ahora = new Date();
  const fila = (e, i) => { const d = new Date(ahora.getTime() - e[2] * 86400000 + e[3] * 60000);
    return [fechaOpDe(d), horaOpDe(d), d.toISOString(), 'op393v-' + i, e[0], 'Helitec', 'Operaciones', 'Piloto', e[1], '', '', '']; };
  const dia = fechaOpDe(ahora);
  const tests = P393_GENTE.slice(0, 5).map((p, i) => p308Test({ p: p, d: dia, h: '00:' + String(10 + i), v: 3 }));
  return p388Mundo(tests, { ahora: ahora.toISOString(), operacional: evs.map(fila) });
}

PRUEBAS.caso('🔴 P393 · verificador H3 · «reportaron hoy» es de hoy: un ciclo de hace 6 días y otro de hace 3 dicen «0 de 5» en los dos paneles, y siguen con su tarjeta', () => {
  /* R19 · `cicloReportoHoy`, que cuentan `cicloHseqAgregado` y `renderCicloOperativo`. Las tarjetas siguen con `cicloReporto`:
     `cicloArmar` no filtra por fecha, a propósito, para que el supervisor pueda cerrar un ciclo viejo. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const VIEJOS = [['Oscar Uno', 'salida_casa', 6, 0], ['Oscar Uno', 'llegada_aero', 6, 55], ['Oscar Uno', 'salida_aero', 6, 600], ['Oscar Uno', 'llegada_casa', 6, 650],
                  ['Olga Dos', 'salida_casa', 3, 0]];
  const w = p393MundoCicloCon(VIEJOS);
  const hseq = p393Ciclo(w.sellarYPedir(null, {}, 'hseq-308'), 'hseq');
  const sup = p393Ciclo(w.pedir({}, 'sup-308'), 'supervisor');
  PRUEBAS.falso(!!hseq.sinSeccion || !!sup.sinSeccion, 'guarda: los dos paneles tienen la pestaña Ciclo');
  PRUEBAS.igual(hseq.linea, t('cic_hseq_d', { a: 0, n: 5 }), '🔴 HSEQ: nadie tocó nada hoy');
  PRUEBAS.igual(sup.reportaron, t('lst_reportaron', { a: 0, n: 5 }), '🔴 R21 · el supervisor, con los mismos números');
  PRUEBAS.igual(sup.tarjetas, 2, '🔴 los dos ciclos viejos siguen con su tarjeta: el supervisor los tiene que poder cerrar');
  /* con uno de hoy */
  const w2 = p393MundoCicloCon(VIEJOS.concat([['Omar Tres', 'salida_casa', 0, -20]]));
  PRUEBAS.igual(p393Ciclo(w2.sellarYPedir(null, {}, 'hseq-308'), 'hseq').linea, t('cic_hseq_d', { a: 1, n: 5 }), '🔴 con uno de hoy, «1 de 5»');
  const sup2 = p393Ciclo(w2.pedir({}, 'sup-308'), 'supervisor');
  PRUEBAS.igual([sup2.reportaron, sup2.tarjetas], [t('lst_reportaron', { a: 1, n: 5 }), 3], '🔴 R21 · en los dos, y con las tres tarjetas');
  /* mirando un período, la pregunta es otra: en 30 días sí reportaron */
  PRUEBAS.igual(p393Ciclo(w.pedir({ opDias: '30' }, 'hseq-308'), 'hseq', '30').linea, t('cic_hseq_d_per', { a: 2, n: 5, d: 30 }), 'CONTROL · en los últimos 30 días, los dos cuentan');
  /* DISCRIMINADOR · con la cuenta de la tarjeta (la 7.65 antes de esto) */
  try {
    p386Cambiar('cicloReportoHoy', cicloReporto);
    PRUEBAS.igual(p393Ciclo(w.sellarYPedir(null, {}, 'hseq-308'), 'hseq').linea, t('cic_hseq_d', { a: 2, n: 5 }), '⚠️ discriminador · con la cuenta de la tarjeta dice «2 de 5 reportaron hoy» sin que nadie tocara nada: el aserto de arriba lo ve');
    PRUEBAS.igual(p393Ciclo(w.pedir({}, 'sup-308'), 'supervisor').reportaron, t('lst_reportaron', { a: 2, n: 5 }), '⚠️ discriminador · y el supervisor igual');
  } finally { p386Volver(); }
});

PRUEBAS.caso('P393 · verificador H3 · `cicloReportoHoy`, por estado y por fecha: el borde del día es el de la zona de la operación', () => {
  /* R19 · `cicloReportoHoy` lee `st.estado` y `st.eventos[k].iso`, lo que devuelve `cicloEstado` (lo prueba el caso de arriba por el camino
     real). Esta tabla mide lo que el reloj de verdad no deja armar, a cualquier hora: un tramo abierto desde anoche, y los dos lados de la medianoche. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const ahora = new Date(), hoy = fechaOpDe(ahora);
  let d = new Date(ahora.getTime());
  for (let i = 0; i < 1500 && fechaOpDe(d) === hoy; i++) d = new Date(d.getTime() - 60000);   // con tope: un `fechaOpDe` simulado colgaría la suite entera
  PRUEBAS.cierto(fechaOpDe(d) !== hoy, 'guarda: encontró el último minuto de ayer');
  const finDeAyer = d, inicioDeHoy = new Date(d.getTime() + 60000), hace6 = new Date(ahora.getTime() - 6 * 86400000);
  const f = (estado, cuando) => ({ st: { estado: estado, eventos: cuando ? { salida_casa: { iso: cuando.toISOString() } } : {} } });
  [
    ['inactivo', ahora, false, 'sin el evento inicial no tiene ciclo, aunque haya tocado otro botón hoy'],
    ['inactivo', null, false, 'no tocó nada'],
    ['curso', finDeAyer, true, 'un tramo abierto desde anoche: está trabajando ahora'],
    ['excedido', finDeAyer, true, 'lo mismo, pasado de tiempo'],
    ['descanso', ahora, true, 'llegó a su casa hoy'],
    ['descanso', finDeAyer, false, 'llegó a su casa ayer'],
    ['sin_cierre', ahora, true, 'tocó algo hoy y no marcó la salida'],
    ['sin_cierre', finDeAyer, false, 'lo último fue de ayer'],
    ['completo', inicioDeHoy, true, 'el primer minuto de hoy, en la zona de la operación'],
    ['completo', finDeAyer, false, 'el último minuto de ayer, en la zona de la operación, aunque en UTC ya sea otro día'],
    ['completo', hace6, false, 'hace seis días'],
    ['detenido', hace6, false, 'hace seis días, detenido'],
    ['cerrado', finDeAyer, false, 'lo cerró el supervisor, y su último botón fue de ayer']
  ].forEach(c => PRUEBAS.igual(cicloReportoHoy(f(c[0], c[1])), c[2], c[0] + ' · ' + c[3]));
  PRUEBAS.falso(cicloReportoHoy({ st: { estado: 'completo', eventos: { x: { iso: 'no es una fecha' } } } }), 'una fecha rota no cuenta');
});

PRUEBAS.caso('F096 · R14 · R1 · los textos de Ciclo de HSEQ, en español neutro y en inglés, sin voseo ni términos de sector', () => {
  const prev = idiomaActual();
  try {
    fijarIdioma('es');
    const es = [t('cic_hseq_d', { a: 1, n: 2 }), t('cic_hseq_d_per', { a: 1, n: 2, d: 30 })];
    fijarIdioma('en');
    const en = [t('cic_hseq_d', { a: 1, n: 2 }), t('cic_hseq_d_per', { a: 1, n: 2, d: 30 })];
    PRUEBAS.igual(es, ['1 de 2 personas reportaron hoy.', '1 de 2 personas reportaron en los últimos 30 días.'], 'en español');
    PRUEBAS.igual(en, ['1 of 2 people reported today.', '1 of 2 people reported in the last 30 days.'], 'en inglés');
    const SECTOR = /piloto|vuelo|tripulaci|aeropuerto|pilot|flight|crew|airport/i;
    PRUEBAS.igual(es.concat(en).filter(x => SECTOR.test(x)), [], 'R14 · sin términos de sector');
  } finally { fijarIdioma(prev); }
});

/* ═════ El corte, por los caminos que no son el panel: H3, H4 ════════════════════════════════════════════════════════ */

/* Las contraseñas de relleno de `p391Hojas` (sus `const` no se ven desde acá). */
const P393_CTA = { usuario: 'demo', empresa: 'demo', pass: 'sup-391', dispositivoId: 'p393-c' };
const P393_ADM = { usuario: '*', pass: 'adm-391', dispositivoId: 'p393-a' };
const P393_HELITEC = { usuario: 'helitec', empresa: 'helitec', pass: 'sup-h391', dispositivoId: 'p393-h' };
/* Una fila de la nómina, inventada. */
function p393Nom(empresa, nombre, cedula, dep) { return [empresa, nombre, cedula, dep, 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']; }
/* La hoja de departamentos tal como está, para afirmar que algo no escribió. */
function p393Filas(w, hoja) { const h = w.env.SpreadsheetApp.openById('maestro').getSheetByName(hoja); return h ? JSON.stringify(h.getDataRange().getValues()) : ''; }

PRUEBAS.caso('🔒 P393 · H3 · `departamento_baja`: a la cuenta Empresa Demo le nombra sólo al elenco, sigue frenando la baja, y a las demás empresas no les cambia nada', () => {
  /* R19 · lo concede `depGenteDe` con `soloElenco`, que le pasa `accionDepartamentoBaja` con `esCuentaDemo_`. El censo
     (`depCensoDe`) suma la nómina y las filas crudas de tests: ahí pueden estar los de fuera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OPC = {
    tests: [['2026-07-15', '10:40', 'Zulema Foránea', 4, 2], ['2026-07-15', '10:41', 'Rosa Real', 4, 2, '', 'Helitec']],
    nomina: [p393Nom('Empresa Demo', 'Ulrico Forastero', 'V-39100002', 'Zona Sola')]
  };
  const medir = sab => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, OPC));
    if (w.faltan) return { faltan: w.faltan };
    const antes = p393Filas(w, 'Departamentos');
    const baja = (cuenta, nombre, extra) => w.post(Object.assign({ action: 'departamento_baja', nombre: nombre }, cuenta, extra || {}));
    const r = { ops: baja(P393_CTA, 'Operaciones'), sola: baja(P393_CTA, 'Zona Sola') };
    r.sinEscribir = p393Filas(w, 'Departamentos') === antes;
    r.helitec = baja(P393_HELITEC, 'Operaciones');
    r.sola2 = baja(P393_CTA, 'Zona Sola', { forzar: '1' });
    return r;
  };
  const ok = medir(null);
  PRUEBAS.igual(ok.faltan, undefined, 'guarda: el mundo se armó');
  if (ok.faltan) return;
  PRUEBAS.igual([ok.ops.ok, ok.ops.motivo], [false, 'con_gente'], '🔒 la baja se frena: tiene gente');
  PRUEBAS.igual(p391DeFuera(ok.ops), [], '🔒 sin un nombre de fuera en toda la respuesta');
  PRUEBAS.alMenos((ok.ops.personas || []).length, 1, 'CONTROL · el elenco del área sí se nombra');
  PRUEBAS.cierto((ok.ops.personas || []).indexOf('Carlos Méndez') >= 0, 'CONTROL · por ejemplo, Carlos Méndez');
  PRUEBAS.alMenos(ok.ops.n, (ok.ops.personas || []).length + 1, 'y `n` sigue contando a todos: es el número que frena la baja y el de la pantalla de departamentos');
  /* un área con sólo gente de fuera: no la nombra, y la baja se sigue frenando */
  PRUEBAS.igual([ok.sola.ok, ok.sola.motivo, ok.sola.n, ok.sola.personas], [false, 'con_gente', 1, []], '🔒 un área con sólo gente de fuera: no la nombra, y se frena igual');
  PRUEBAS.cierto(ok.sinEscribir, 'guarda: sin `forzar` no escribió nada');
  PRUEBAS.igual([ok.sola2.ok, ok.sola2.baja, ok.sola2.forzado], [true, true, true], 'y con `forzar`, se da de baja, como siempre');
  PRUEBAS.cierto((ok.helitec.personas || []).indexOf('Rosa Real') >= 0, 'CONTROL · a otra empresa no se le filtra nada: HELITEC ve a la suya');
  /* DISCRIMINADORES */
  const NOFILTRA = [['var gente = depGenteDe(empCanon, clave, esCuentaDemo_(acc, p.empresa));', 'var gente = depGenteDe(empCanon, clave, false);']];
  const BAJA_N = [['return { n: nombres.length, quienes: (soloElenco ? demoNombresDelElenco_(nombres) : nombres).slice(0, 8) };',
                   'var vis = soloElenco ? demoNombresDelElenco_(nombres) : nombres; return { n: vis.length, quienes: vis.slice(0, 8) };']];
  const conGs = (cambios, fn) => {
    const g = p391Parchar(CTX.gs, cambios);
    PRUEBAS.igual(g.faltan, [], 'guarda: el sabotaje entró');
    if (g.faltan.length) return;
    const real = CTX.gs;
    try { CTX.gs = g.gs; fn(medir(null)); } finally { CTX.gs = real; }
  };
  conGs(NOFILTRA, s => PRUEBAS.cierto(p391DeFuera(s.ops).indexOf('zulema') >= 0, 'DISCRIMINADOR · sin el filtro, la respuesta trae a Zulema (lo de antes de P393)'));
  conGs(BAJA_N, s => PRUEBAS.igual(s.sola.ok, true, 'DISCRIMINADOR · contando sólo al elenco, un área con gente de fuera se da de baja sin preguntar: por eso `n` no se filtra'));
});

PRUEBAS.caso('🔒 P393 · H3 · `identidades_informe`: a la cuenta Empresa Demo, sólo nombres del elenco; al administrador, todo', () => {
  /* R19 · `accionIdentidadesInforme` con `soloElencoI` y `nombreVisibleI`, en la entrada (`R.vistas` nace limpio) y en el padrón.
     El maestro no entra: `permitidasI` es nulo. Dirección y HSEQ siguen sin permiso (P307). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OPC = {
    tests: [['2026-07-15', '10:40', 'Ulrico Forastero', 4, 2], ['2026-07-15', '10:41', 'Rosa Real', 4, 2, '', 'Helitec']],
    pvt: [['2026-11-04', '09:05', 'Zulema Foránea']],
    /* un candidato: «Zulema Foránea» se parece a este de su padrón, que lleva cédula; y dos cédulas con un mismo nombre, para
       `nombresAmbiguos` */
    nomina: [p393Nom('Empresa Demo', 'Zulema Foránea Díaz', 'V-39100003', 'Operaciones'), p393Nom('Empresa Demo', 'Ulrico Forastero Paz', 'V-39100004', 'Operaciones'),
             p393Nom('Empresa Demo', 'Ulrico Forastero Paz', 'V-39100005', 'Operaciones')]
  };
  const medir = cambios => {
    const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
    if (g.faltan.length) return { faltan: g.faltan };
    const real = CTX.gs;
    try {
      CTX.gs = g.gs;
      const w = p391Mundo(OPC);
      const inf = (cuenta, extra) => w.post(Object.assign({ action: 'identidades_informe' }, cuenta, extra || {}));
      return { cuenta: inf(P393_CTA), medica: inf(P393_CTA, { pedida: 'medico' }), visor: inf(P393_ADM, { verEmpresa: 'Empresa Demo', verVista: 'supervisor' }),
               dir: inf(Object.assign({}, P393_CTA, { pass: 'dir-391' })), maestro: inf(P393_ADM), maestroDemo: inf(P393_ADM, { empresa: 'Empresa Demo' }), helitec: inf(P393_HELITEC) };
    } finally { CTX.gs = real; }
  };
  const ok = medir();
  PRUEBAS.igual(ok.faltan, undefined, 'guarda: el mundo se armó');
  if (ok.faltan) return;
  [['con la contraseña', ok.cuenta], ['por la pestaña médica', ok.medica], ['por el visor', ok.visor]].forEach(([q, r]) => {
    PRUEBAS.igual(r.ok, true, 'guarda: ' + q + ' responde · ' + (r.error || ''));
    PRUEBAS.igual(p391DeFuera(r), [], '🔒 ' + q + ': sin un nombre de fuera en toda la respuesta');
    PRUEBAS.falso(/39100003/.test(JSON.stringify(r)), '🔒 ' + q + ': ni la cédula de su padrón');
    PRUEBAS.igual([r.enPadron, r.nombresAmbiguos, r.candidatos], [0, [], []], '🔒 ' + q + ': de su padrón no da nada: todos son de fuera');
    PRUEBAS.alMenos((r.sinResolver || []).length, 1, 'CONTROL · ' + q + ': el elenco sigue en el informe');
  });
  PRUEBAS.igual(ok.dir.motivo, 'sin_permiso', 'Dirección sigue sin permiso (P307)');
  /* CONTROL · el administrador sigue viendo todo: es su diagnóstico */
  PRUEBAS.cierto(p391DeFuera(ok.maestro).indexOf('ulrico') >= 0 && p391DeFuera(ok.maestro).indexOf('zulema') >= 0, 'CONTROL · el administrador ve a los de fuera');
  PRUEBAS.cierto(p391DeFuera(ok.maestroDemo).indexOf('ulrico') >= 0, 'CONTROL · también con «Empresa Demo» en el pedido: no es la cuenta');
  PRUEBAS.cierto((ok.helitec.sinResolver || []).some(x => x.variante === 'Rosa Real'), 'CONTROL · a otra empresa no se le filtra nada');
  /* DISCRIMINADORES */
  const SIN = medir([['var soloElencoI = !!permitidasI && esCuentaDemo_(acc, p.empresa);', 'var soloElencoI = false;']]);
  PRUEBAS.igual(SIN.faltan, undefined, 'guarda: el sabotaje entró');
  if (!SIN.faltan) {
    PRUEBAS.alMenos(p391DeFuera(SIN.cuenta).length, 1, 'DISCRIMINADOR · sin el filtro, la cuenta recibe a los de fuera (lo de antes de P393)');
    PRUEBAS.cierto(/39100003/.test(JSON.stringify(SIN.cuenta)), 'DISCRIMINADOR · y en `candidatos`, una cédula de su padrón');
  }
  const PAD = medir([['if (puedeVerEmpresaCanon(R.padron.porCedula[c].empresa) && nombreVisibleI(R.padron.porCedula[c].nombre)) padronVisible[c]', 'if (puedeVerEmpresaCanon(R.padron.porCedula[c].empresa)) padronVisible[c]']]);
  PRUEBAS.igual(PAD.faltan, undefined, 'guarda: el sabotaje entró');
  if (!PAD.faltan) PRUEBAS.alMenos(p391DeFuera(PAD.cuenta).length, 1, 'DISCRIMINADOR · sin filtrar el padrón, `nombresAmbiguos` nombra a uno de fuera, aunque los tests estén filtrados');
});

PRUEBAS.caso('🔒 P393 · H4 · una fecha con forma válida y día imposible no pasa el corte: ni en la demostración ni en la cuenta, y `demo_inventario` la cuenta como «sin día»', () => {
  /* R19 · `demoDiaValido_`, que usa `demoEsDelElenco_` en el paso 0 de `demoAjustar`. La primera mitad es la guarda de
     `leerTurnos`; la segunda, porque `Date.parse` rueda un día que el mes no tiene (`2026-02-30` → 2 de marzo). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const IMPOSIBLES = ['2026-08-00', '2026-00-15', '2026-13-01', '2026-02-30', '2026-04-31'];
  /* La celda de texto, escrita a mano en el CH: `p391Fila` arma celdas Date, que no pueden ser imposibles. */
  const conFila = (w, texto, persona) => {
    const f = p391Fila(['2026-07-15', '10:40', persona || 'Diego Ramírez', 9, 5]);
    f[0] = texto; f[73] = texto;
    w.env.SpreadsheetApp.openById('maestro').getSheetByName('Respuestas de formulario 1').appendRow(f);
  };
  const medir = (cambios, texto) => {
    const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
    if (g.faltan.length) return { faltan: g.faltan };
    const real = CTX.gs;
    try {
      CTX.gs = g.gs;
      const w = p391Mundo({});
      if (texto) conFila(w, texto);
      return { demo: w.demo(), med: w.visor('medico'), inv: w.inventario() };
    } finally { CTX.gs = real; }
  };
  const base = medir();
  IMPOSIBLES.forEach(d => {
    const r = medir(null, d);
    PRUEBAS.igual(p391Dif(r.demo, base.demo), [], '🔒 «' + d + '» · la demostración, idéntica al mundo sin esa fila');
    PRUEBAS.igual(p391Dif(r.med, base.med), [], '🔒 «' + d + '» · el visor médico también');
    const fu = (r.inv.r || {}).fueraDelElenco || {};
    PRUEBAS.igual([fu.tests, fu.porFecha, (fu.dias || {})['sin día']], [1, 1, 1], '🔒 «' + d + '» · `demo_inventario` la cuenta, sin día');
  });
  /* CONTROL · un día que existe, dentro del corte, pasa */
  const vale = medir(null, '2026-02-28');
  PRUEBAS.igual(p391Foto(vale.demo).de('Diego Ramírez').length, p391Foto(base.demo).de('Diego Ramírez').length + 1, 'CONTROL · «2026-02-28» pasa: el filtro no se lleva lo que sí es un día');
  /* DISCRIMINADORES */
  const FORMA = [['  if (DEMO_ELENCO_HASTA) return demoDiaValido_(fila.fecha) && String(fila.fecha) <= DEMO_ELENCO_HASTA;', '  if (DEMO_ELENCO_HASTA) return !!diaPartesHseq_(fila.fecha) && String(fila.fecha) <= DEMO_ELENCO_HASTA;']];
  const f0 = medir(FORMA, '2026-00-15');
  PRUEBAS.igual(f0.faltan, undefined, 'guarda: el sabotaje entró');
  if (!f0.faltan) PRUEBAS.cierto(p391Foto(f0.demo).de('Diego Ramírez').length > p391Foto(base.demo).de('Diego Ramírez').length, 'DISCRIMINADOR · mirando sólo la forma (P391), «2026-00-15» pasa el corte y sale con una fecha inventada (el ancla deja fuera lo posterior: por eso no «2026-08-00»)');
  const SOLO_PARSE = [['  return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDate() === p[2];', '  return true;']];
  const s30 = medir(SOLO_PARSE, '2026-02-30'), s0 = medir(SOLO_PARSE, '2026-00-15');
  PRUEBAS.igual([s30.faltan, s0.faltan], [undefined, undefined], 'guarda: el sabotaje entró');
  if (!s30.faltan) {
    PRUEBAS.cierto(p391Foto(s30.demo).de('Diego Ramírez').length > p391Foto(base.demo).de('Diego Ramírez').length, 'DISCRIMINADOR · sólo con la guarda de `leerTurnos`, «2026-02-30» pasa: `Date.parse` lo rueda a marzo');
    PRUEBAS.igual(p391Dif(s0.demo, base.demo), [], 'DISCRIMINADOR · y «2026-00-15» no: ésa sí la frena');
  }
});

/* ═════ D3 de P391 · `estado` y `limpiar` del alta de prueba ═════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P393 · D3 · `prueba_alta`: `estado` ve y `limpiar` borra los tests y el PVT de la persona de prueba (nombre exacto Y Empresa Demo), una sola vez, sin tocar a nadie más; corrida dos veces no hace nada', () => {
  /* R19 · `mantPruebaAlta` con `pruebaAltaColsPersona_` y `pruebaAltaFilasDeLaPersona_`: las columnas de `parseRegistros` y
     `leerPVT`. R15: en qué hoja cae (esas dos), quién lo lee (`leerDatos`, por caché: `cacheClear`), qué pasa si corre dos veces. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const CED = '99999999', NOMBRE = 'Persona De Prueba';
  const OPC = {
    tests: [
      ['2026-07-15', '10:40', NOMBRE, 4, 2],                                        // SÍ
      ['2026-07-15', '10:41', NOMBRE, 4, 2, '', 'Helitec'],                         // otra empresa: NO
      ['2026-07-15', '10:42', 'persona de prueba', 4, 2],                           // otra grafía: NO
      ['2026-07-15', '10:43', NOMBRE + ' · 0412-5551234', 4, 2],                    // con el teléfono pegado (`limpiarPersona`): SÍ
      ['2026-07-15', '10:44', NOMBRE, 4, 2, 'Mi cedula es ' + CED],                 // con la cédula Y el nombre: SÍ, por el nombre
      ['2026-07-15', '10:45', 'Diego Ramírez', 3, 1]                                // la fila de abajo, que un segundo `deleteRow` se llevaría
    ],
    pvt: [['2026-07-15', '10:46', NOMBRE], ['2026-07-15', '10:47', 'Lucía Fernández']]
  };
  const SI_TESTS = 3, SI_PVT = 1;
  const mundo = cambios => {
    const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
    if (g.faltan.length) return { faltan: g.faltan };
    const real = CTX.gs;
    CTX.gs = g.gs;
    let w;
    try { w = p391Mundo(OPC); } finally { CTX.gs = real; }
    const hoja = n => w.env.SpreadsheetApp.openById('maestro').getSheetByName(n);
    const pvtH = hoja('PVT');
    pvtH.appendRow(p391Pvt(['2026-07-15', '10:48', NOMBRE]).map((c, i) => (i === 2 ? 'Helitec' : c)));   // su PVT en otra empresa: NO
    w.alta = (paso, extra) => w.post(Object.assign({ action: 'mantenimiento', tarea: 'prueba_alta', paso: paso, token: p391Token() }, extra || {}));
    /* las personas de cada hoja, sin los encabezados */
    w.tests = () => hoja('Respuestas de formulario 1').getDataRange().getValues().slice(2).map(f => f[1] + '|' + f[72]);
    w.pvts = () => hoja('PVT').getDataRange().getValues().slice(1).map(f => f[1] + '|' + f[2]);
    return w;
  };
  const w = mundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const nT = w.tests().length, nP = w.pvts().length;
  const quedan = lista => lista.filter(x => x.indexOf(NOMBRE) === 0);
  w.inventario();   // llena la caché de `leerDatos`
  const est = w.alta('estado');
  PRUEBAS.igual(est.ok, true, 'guarda: `estado` responde · ' + (est.error || ''));
  const e = est.r || {};
  PRUEBAS.igual((e.filasPorHoja['Respuestas de formulario 1'] || []).length, SI_TESTS, '🔴 `estado` ve sus tests: los que antes no veía, y una vez cada uno');
  PRUEBAS.igual((e.filasPorHoja['PVT'] || []).length, SI_PVT, '🔴 y su PVT');
  PRUEBAS.igual((e.porNombre.filas['Respuestas de formulario 1'] || []).length, SI_TESTS, 'y dice cuáles encontró por el nombre');
  PRUEBAS.igual([w.tests().length, w.pvts().length], [nT, nP], '`estado` no borra nada');
  /* sin `confirmar`, simula */
  const sim = w.alta('limpiar');
  PRUEBAS.igual([sim.r.simulado, w.tests().length, w.pvts().length], [true, nT, nP], '`limpiar` sin `confirmar` no borra nada');
  /* con `confirmar` */
  const antesInv = (w.inventario().r || {}).fueraDelElenco || {};
  PRUEBAS.alMenos(antesInv.tests, SI_TESTS, 'guarda: `demo_inventario` cuenta sus tests como descartados');
  const lim = w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual(lim.ok, true, 'guarda: `limpiar` responde · ' + (lim.error || ''));
  PRUEBAS.igual(w.tests().length, nT - SI_TESTS, '🔴 borró sus tests, ni uno más');
  PRUEBAS.igual(w.pvts().length, nP - SI_PVT, '🔴 y su PVT, ni uno más');
  PRUEBAS.igual(quedan(w.tests()).sort(), [NOMBRE + '|Helitec'].sort(), '🔴 queda sólo el suyo en otra empresa: otra empresa no se toca');
  PRUEBAS.cierto(w.tests().indexOf('persona de prueba|Empresa Demo') >= 0, '🔴 otra grafía no se toca: falla cerrado');
  const diegos = lista => lista.filter(x => x === 'Diego Ramírez|Empresa Demo').length;   // el del sembrado y el de la fila de abajo
  PRUEBAS.igual(diegos(w.tests()), 2, '🔴 la fila de abajo de la que tenía la cédula y el nombre sigue ahí');
  PRUEBAS.igual(quedan(w.pvts()), [NOMBRE + '|Helitec'], '🔴 lo mismo en el PVT');
  PRUEBAS.cierto(w.pvts().indexOf('Lucía Fernández|Empresa Demo') >= 0, 'CONTROL · el PVT del elenco sigue');
  /* quién lo lee después: `leerDatos`, por caché */
  const despInv = (w.inventario().r || {}).fueraDelElenco || {};
  PRUEBAS.igual(despInv.tests, antesInv.tests - SI_TESTS, '🔴 R21 · `leerDatos` no sirve las filas borradas de la caché: `demo_inventario` ya no las cuenta');
  /* dos veces */
  const t1 = p393Filas(w, 'Respuestas de formulario 1'), p1 = p393Filas(w, 'PVT');
  const lim2 = w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([lim2.ok, Object.keys(lim2.r.borradas).filter(k => (lim2.r.borradas[k] || []).length)], [true, []], '🔴 R15 · corrida dos veces, no encuentra nada');
  PRUEBAS.igual([p393Filas(w, 'Respuestas de formulario 1') === t1, p393Filas(w, 'PVT') === p1], [true, true], '🔴 R15 · y no toca nada');
  /* DISCRIMINADORES */
  const sab = (cambios, fn) => { const s = mundo(cambios); PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró'); if (!s.faltan) fn(s); };
  sab([['    var filasP = colsP ? pruebaAltaFilasDeLaPersona_(sh, colsP) : [];', '    var filasP = [];']], s => {
    PRUEBAS.igual((s.alta('estado').r.filasPorHoja['PVT'] || []).length, 0, 'DISCRIMINADOR · sin buscar por el nombre (lo de antes), `estado` no ve su PVT');
    s.alta('limpiar', { confirmar: '1' });
    PRUEBAS.igual(s.tests().length, nT, 'DISCRIMINADOR · y `limpiar` no borra ninguno de sus tests');
  });
  sab([['\n    && String(fila[cols.empresa] == null ? "" : fila[cols.empresa]).trim() === EMPRESA_DEMO;', ';']], s => {
    s.alta('limpiar', { confirmar: '1' });
    PRUEBAS.igual(quedan(s.tests()), [], 'DISCRIMINADOR · mirando sólo el nombre, se lleva también el de otra empresa');
  });
  sab([['      cacheClear();   // P393', '      void 0;   // P393']], s => {
    s.inventario();
    const a = (s.inventario().r || {}).fueraDelElenco || {};
    s.alta('limpiar', { confirmar: '1' });
    PRUEBAS.igual(((s.inventario().r || {}).fueraDelElenco || {}).tests, a.tests, 'DISCRIMINADOR · sin olvidar la caché, `leerDatos` sigue sirviendo las filas borradas');
  });
});

/* ═════ Verificador de P393, H1 y H2 · `limpiar` no puede llevarse a una persona real ════════════════════════════════ */

/* El mundo de `prueba_alta`, con el `.gs` real o saboteado. */
function p393MundoAlta(opc, cambios) {
  const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
  if (g.faltan.length) return { faltan: g.faltan };
  const real = CTX.gs;
  CTX.gs = g.gs;
  let w;
  try { w = p391Mundo(JSON.parse(JSON.stringify(opc))); } finally { CTX.gs = real; }
  w.hoja = n => w.env.SpreadsheetApp.openById('maestro').getSheetByName(n);
  w.alta = (paso, extra) => w.post(Object.assign({ action: 'mantenimiento', tarea: 'prueba_alta', paso: paso, token: p391Token() }, extra || {}));
  w.tests = () => w.hoja('Respuestas de formulario 1').getDataRange().getValues().slice(2).map(f => String(f[1]));
  return w;
}
/* Sin esto, `pruebaAltaFilaSigue_` da por buena cualquier fila de los tests y el PVT. Deja el `getRange`: la interferencia entra ahí. */
const P393_SIN_CONTROL = ['if (cols) return pruebaAltaFilaEsDeLaPersona_(fila, cols);', 'if (cols) return true;'];

PRUEBAS.caso('🔴 P393 · verificador H2 · en los tests y el PVT, `limpiar` sólo mira nombre y empresa: una persona real con «99999999» pegado al nombre o «99999998» en un comentario no se va', () => {
  /* R19 · `mantPruebaAlta`: en esas dos hojas no corre `pruebaAltaFilasCon` (`colsP`), porque no tienen columna de cédula y un acierto ahí
     es siempre falso. En las demás sigue buscando por cédula, y una fila con las dos entra una vez (`pruebaAltaSinRepetir_`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const RAW = 'Respuestas de formulario 1', NOMBRE = 'Persona De Prueba';
  const OPC = { tests: [
    ['2026-07-15', '10:40', 'Juan Real · 99999999', 4, 2, '', 'Helitec'],
    ['2026-07-15', '10:41', 'Luz Real', 4, 2, 'Mi cédula es 99999998, no la recuerdo', 'Helitec'],
    ['2026-07-15', '10:42', 'Otro Real · 0412-99999999', 4, 2, '', 'Helitec'],
    ['2026-07-15', '10:43', NOMBRE, 4, 2]
  ], pvt: [] };
  const armar = cambios => {
    const w = p393MundoAlta(OPC, cambios);
    if (w.faltan) return w;
    w.hoja('PVT').appendRow(p391Pvt(['2026-07-15', '10:44', 'Juan Real · 99999999']).map((c, i) => (i === 2 ? 'Helitec' : c)));
    const fNom = (nombre, ced, nota) => ['Empresa Demo', nombre, ced, 'Operaciones', 'Piloto', '', '', '', nota || '', 'Si', '', '', '3'];
    w.hoja('Nómina').appendRow(fNom(NOMBRE, '99999999', 'y la ajena 99999998'));   // las dos cédulas en una fila
    w.hoja('Nómina').appendRow(fNom('Debajo Real', '12345678'));                   // la fila de abajo, que un segundo `deleteRow` se llevaría
    w.reales = () => w.tests().filter(p => /Real/.test(p)).length;
    w.nomina = () => w.hoja('Nómina').getDataRange().getValues().slice(1).map(f => String(f[1]));
    return w;
  };
  const w = armar();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const est = w.alta('estado').r;
  PRUEBAS.igual(est.filasPorHoja[RAW].length, 1, '🔴 `estado` ve sólo la fila de la persona de prueba');
  PRUEBAS.igual(est.filasPorHoja['PVT'], [], '🔴 y en el PVT, ninguna');
  PRUEBAS.igual(est.filasPorHoja['Nómina'].length, 1, 'CONTROL · en las otras hojas sigue buscando por cédula, y la fila con las dos entra una vez');
  const lim = w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([lim.ok, lim.r.saltadas], [true, {}], 'guarda: `limpiar` responde y no saltea nada');
  PRUEBAS.igual(w.reales(), 3, '🔴 las tres personas reales siguen');
  PRUEBAS.igual(w.tests().filter(p => p === NOMBRE), [], 'CONTROL · y la de prueba se fue');
  PRUEBAS.cierto(w.hoja('PVT').getDataRange().getValues().some(f => String(f[1]) === 'Juan Real · 99999999'), '🔴 y el PVT de la persona real sigue');
  PRUEBAS.igual([w.nomina().indexOf(NOMBRE), w.nomina().indexOf('Debajo Real') >= 0], [-1, true], 'CONTROL · en la nómina se fue la de prueba, y la de abajo sigue');
  /* DISCRIMINADORES */
  const CON_CED = ['var filasA = colsP ? [] : pruebaAltaFilasCon(sh, PRUEBA_ALTA_CED), filasB = colsP ? [] : pruebaAltaFilasCon(sh, PRUEBA_ALTA_CED_AJENA);',
                   'var filasA = pruebaAltaFilasCon(sh, PRUEBA_ALTA_CED), filasB = pruebaAltaFilasCon(sh, PRUEBA_ALTA_CED_AJENA);'];
  const REPITE = ['estado[HOJAS[h]] = pruebaAltaSinRepetir_(filasA.concat(filasB, filasP));',
                  'estado[HOJAS[h]] = filasA.concat(filasB, filasP).sort(function (a, b) { return a - b; });'];
  const SIN_CONTROL_CED = ['return pruebaAltaFilaTieneCedula_(fila, PRUEBA_ALTA_CED) || pruebaAltaFilaTieneCedula_(fila, PRUEBA_ALTA_CED_AJENA);', 'return true;'];
  const s1 = armar([CON_CED]);
  PRUEBAS.igual(s1.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s1.faltan) PRUEBAS.igual(s1.alta('estado').r.filasPorHoja[RAW].length, 4, '⚠️ discriminador · buscando por cédula también acá (lo de antes), `estado` lista a las tres personas reales');
  const s2 = armar([CON_CED, P393_SIN_CONTROL]);
  PRUEBAS.igual(s2.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s2.faltan) { s2.alta('limpiar', { confirmar: '1' }); PRUEBAS.igual(s2.reales(), 0, '⚠️ discriminador · y `limpiar`, sin el control de antes de borrar, se las lleva'); }
  const s3 = armar([REPITE]);
  PRUEBAS.igual(s3.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s3.faltan) PRUEBAS.igual(s3.alta('estado').r.filasPorHoja['Nómina'].length, 2, '⚠️ discriminador · sin `pruebaAltaSinRepetir_`, la fila con las dos cédulas entra dos veces');
  const s4 = armar([REPITE, SIN_CONTROL_CED]);
  PRUEBAS.igual(s4.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s4.faltan) { s4.alta('limpiar', { confirmar: '1' }); PRUEBAS.igual(s4.nomina().indexOf('Debajo Real'), -1, '⚠️ discriminador · y, sin el control, el segundo `deleteRow` se lleva la fila de abajo'); }
});

PRUEBAS.caso('🔴 P393 · verificador H1 · `limpiar` vuelve a mirar cada fila antes de borrarla: si alguien borró una en el medio, o corre otra limpieza, no se lleva a nadie y lo dice', () => {
  /* R19 · `pruebaAltaFilaSigue_`, justo antes de cada `deleteRow`. La interferencia entra en el primer control: la lista ya está leída y
     todavía no se borró nada. El resto, una persona borrando a mano entre ese control y el borrado, no lo cierra ningún candado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const RAW = 'Respuestas de formulario 1', NOMBRE = 'Persona De Prueba', REALES = ['Rosa Real', 'Pedro Real', 'Marta Real', 'Jose Real'];
  const fila = (h, p, e) => ['2026-07-15', h, p, 4, 2, '', e];
  const OPC = { tests: [fila('10:40', NOMBRE), fila('10:41', 'Rosa Real', 'Helitec'), fila('10:42', NOMBRE), fila('10:43', 'Pedro Real', 'Helitec'),
                        fila('10:44', 'Marta Real', 'Helitec'), fila('10:45', 'Jose Real', 'Helitec')] };
  const correr = (modo, cambios) => {
    const w = p393MundoAlta(OPC, cambios);
    if (w.faltan) return w;
    const raw = w.hoja(RAW), orig = raw.getRange;
    let entro = false;
    raw.getRange = function (a, b, c, d) {
      if (!entro && c === 1) {
        entro = true;
        if (modo === 'otro') raw.deleteRow(3);
        if (modo === 'otra-corrida') w.alta('limpiar', { confirmar: '1' });
      }
      return orig.call(raw, a, b, c, d);
    };
    const r = w.alta('limpiar', { confirmar: '1' });
    return { w: w, r: r, entro: entro, perdidas: REALES.filter(p => w.tests().indexOf(p) < 0), deLaPrueba: w.tests().filter(p => p === NOMBRE).length };
  };
  const sola = correr('sola');
  PRUEBAS.igual([sola.r.ok, sola.perdidas, sola.deLaPrueba, sola.r.r.saltadas], [true, [], 0, {}], 'CONTROL · sola: borra las dos de prueba, sin saltear nada');
  PRUEBAS.igual((sola.r.r.borradas[RAW] || []).length, 2, 'CONTROL · y las informa');
  PRUEBAS.cierto(/Bitacora/.test(sola.r.r.aviso), 'CONTROL · con el aviso de siempre');
  const otro = correr('otro');
  PRUEBAS.cierto(otro.entro, 'guarda: la interferencia entró');
  PRUEBAS.igual(otro.perdidas, [], '🔴 alguien borró una fila en el medio: no se lleva a nadie');
  PRUEBAS.igual([(otro.r.r.saltadas[RAW] || []).length, (otro.r.r.borradas[RAW] || []).length], [2, 0], '🔴 los números quedaron corridos: saltea las dos y lo dice');
  PRUEBAS.cierto(/salteadas/.test(otro.r.r.aviso), '🔴 y el aviso lo dice');
  const otra = otro.w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([otra.ok, otro.w.tests().filter(p => p === NOMBRE).length, REALES.filter(p => otro.w.tests().indexOf(p) < 0)], [true, 0, []], '🔴 corrida otra vez, termina el trabajo');
  const dos = correr('otra-corrida');
  PRUEBAS.igual([dos.entro, dos.perdidas, dos.deLaPrueba], [true, [], 0], '🔴 dos corridas a la vez, si el candado no las frena: no se lleva a nadie, y las de prueba se fueron');
  PRUEBAS.igual((dos.r.r.saltadas[RAW] || []).length, 2, '🔴 y la segunda dice que no encontró lo que había leído');
  /* el último renglón: al correrse, su número cae fuera de la hoja, y en Sheets `getRange` tiraría */
  const w3 = p393MundoAlta({ tests: [fila('10:40', 'Rosa Real', 'Helitec'), fila('10:41', NOMBRE)] });
  const raw3 = w3.hoja(RAW), orig3 = raw3.getRange;
  let entro3 = false;
  raw3.getRange = function (a, b, c, d) {
    if (!entro3 && c === 1) { entro3 = true; raw3.deleteRow(3); PRUEBAS.cierto(a > raw3.getLastRow(), 'guarda: su número cayó fuera de la hoja'); }
    return orig3.call(raw3, a, b, c, d);
  };
  const r3 = w3.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([r3.ok, (r3.r.saltadas[RAW] || []).length], [true, 1], 'CONTROL · con el número fuera de la hoja, saltea sin romper');
  /* DISCRIMINADORES · sin el control (la 7.65 antes de esto) */
  [['otro', 'alguien borró una fila'], ['otra-corrida', 'dos corridas']].forEach(c => {
    const s = correr(c[0], [P393_SIN_CONTROL]);
    PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
    if (!s.faltan) PRUEBAS.alMenos(s.perdidas.length, 1, '⚠️ discriminador · ' + c[1] + ', sin el control: se lleva a ' + s.perdidas.join(' y '));
  });
});

PRUEBAS.caso('🔴 P393 · verificador H1 · dos `limpiar confirmar=1` no corren juntos: con el candado tomado no borra nada; simular y `estado` no lo piden', () => {
  /* R19 · `mantPruebaAlta` toma `LockService.getUserLock`, el del sellado, y no el del script, que lo espera cada guardado de la app. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OPC = { tests: [['2026-07-15', '10:40', 'Persona De Prueba', 4, 2]] };
  const armar = cambios => {
    const w = p393MundoAlta(OPC, cambios);
    if (w.faltan) return w;
    w.lock = { pedidos: 0, soltados: 0, libre: false };
    w.env.LockService.getUserLock = () => ({ tryLock: () => { w.lock.pedidos++; return w.lock.libre; }, releaseLock: () => { w.lock.soltados++; } });
    return w;
  };
  const w = armar();
  const n0 = w.tests().length;
  const r = w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([r.ok, w.tests().length, w.lock.pedidos], [false, n0, 1], '🔴 con el candado tomado, no borra nada');
  PRUEBAS.cierto(/ocupado/.test(r.error || ''), '🔴 y dice por qué · ' + r.error);
  PRUEBAS.igual([w.alta('limpiar').ok, w.alta('estado').ok, w.lock.pedidos], [true, true, 1], 'CONTROL · simular y `estado` no piden candado');
  w.lock.libre = true;
  const r2 = w.alta('limpiar', { confirmar: '1' });
  PRUEBAS.igual([r2.ok, w.tests().length, w.lock.pedidos, w.lock.soltados], [true, n0 - 1, 2, 1], 'CONTROL · libre, lo pide, borra y lo suelta');
  /* DISCRIMINADOR */
  const s = armar([['if (!lock.tryLock(30000)) return { error: "ocupado: hay otra limpieza corriendo, no se borro nada" };', '']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) { const n = s.tests().length; s.alta('limpiar', { confirmar: '1' }); PRUEBAS.igual(s.tests().length, n - 1, '⚠️ discriminador · sin mirar el candado, borra igual: el aserto de arriba lo ve'); }
});

/* ═════ H2 de P386 · el período con una marca real de «elegido» ══════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P393 · H2 de P386 · lo que la persona tocó se conserva, también si coincide con el de por defecto del panel', () => p386Correr(async () => {
  /* R19 · `periodoElegido` lo pone `dashSetPeriod` (el chip y «Ver «Mes»»), lo lee `dashFiltrosDelPanelNuevo` y viaja en
     `fInicial` (`visorCambiar`, `dashEmpresaAdminCambiar`). Los cuatro escenarios del verificador de P386. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  const H = 'Consorcio HELITEC', S = 'Aeroambulancias Silva';
  /* Dirección, «Semana» → HSEQ → Dirección */
  PRUEBAS.cierto(await p385Visor(H, 'direccion') && p386Periodo('semana'), 'guarda: Dirección con «Semana», por el chip');
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ');
  PRUEBAS.igual(DASH.f.period, 'semana', 'en HSEQ, «Semana»');
  PRUEBAS.cierto(await p385Visor(H, 'direccion'), 'guarda: de vuelta en Dirección');
  PRUEBAS.igual(DASH.f.period, 'semana', '🔴 Dirección, «Semana» → HSEQ → Dirección: sigue en «Semana» (en la 7.64, «Todo»)');
  /* Dirección, «Mes» y después «Todo» → HSEQ */
  PRUEBAS.cierto(p386Periodo('mes') && p386Periodo('all'), 'guarda: «Mes» y después «Todo»');
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ');
  PRUEBAS.igual(DASH.f.period, 'all', '🔴 Dirección, «Mes» y después «Todo» → HSEQ: en «Todo» (en la 7.64, «Semana»)');
  /* HSEQ, «Mes» y después «Semana» → Dirección */
  PRUEBAS.cierto(p386Periodo('mes') && p386Periodo('semana'), 'guarda: «Mes» y después «Semana»');
  PRUEBAS.cierto(await p385Visor(H, 'direccion'), 'guarda: Dirección');
  PRUEBAS.igual(DASH.f.period, 'semana', '🔴 HSEQ, «Mes» y después «Semana» → Dirección: en «Semana» (en la 7.64, «Todo»)');
  /* Servicio médico sobre HELITEC, «Semana» → HSEQ → «Trabajar sobre» Silva */
  PRUEBAS.cierto(await p385Visor(H, 'medico') && p386Periodo('semana'), 'guarda: Servicio médico con «Semana»');
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ');
  PRUEBAS.cierto(await p385Trabajar(S), 'guarda: «Trabajar sobre» = Silva');
  PRUEBAS.igual(DASH.f.period, 'semana', '🔴 y por «Trabajar sobre», también (en la 7.64, «Todo»)');
}));

PRUEBAS.caso('🔴 P393 · H2 de P386 · sin tocar nada, cada panel abre en el suyo; y el período que «atrás» suelta deja de contar como elegido', () => p386Correr(async () => {
  /* R19 · `onDashData` con `dashPeriodoPorDefecto`, sin marca; la saca `dashClearOne` al soltar las fechas de «Personalizado». */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  const H = 'Consorcio HELITEC';
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ, sin tocar nada');
  const abre = DASH.f.period;
  PRUEBAS.igual([abre, !!DASH.f.periodoElegido], [hseqPeriodoDeApertura(DASH.totalesHseq), false], '🔴 HSEQ abre en el suyo (P310, F096), sin la marca');
  PRUEBAS.cierto(await p385Visor(H, 'direccion'), 'guarda: Dirección');
  PRUEBAS.igual([DASH.f.period, !!DASH.f.periodoElegido], ['all', false], '🔴 Dirección abre en «Todo»');
  /* «Personalizado» con una fecha, y «atrás» la suelta */
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(20)), 'guarda: «Personalizado» con una fecha');
  PRUEBAS.igual(DASH.f.periodoElegido, true, 'guarda: eso es elegir');
  PRUEBAS.igual(dashFiltrosDelPanelNuevo('').period, 'custom', 'CONTROL · y antes de soltarlo, viaja');
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && !DASH.f.desde, 'guarda: «atrás» soltó la fecha');
  PRUEBAS.igual(DASH.f.periodoElegido, false, '🔴 lo soltó: deja de contar como elegido');
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ');
  PRUEBAS.igual([DASH.f.period, DASH.f.desde], [abre, ''], '🔴 y el panel nuevo abre en el suyo, sin fechas');
}));

PRUEBAS.caso('🔴 P393 · H2 de P386 · el botón «Ver «Mes»» es tocar el período: marca, y viaja', () => {
  /* R19 · el botón de `hseqCausaHtml` llama a `dashSetPeriod`. El estado de partida (período vacío sin marca) es el de un panel
     que abrió en la semana con totales y un ↻ que ya no se los trae; acá se pone a mano para no depender del reloj. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const leido = {};
  const v = p388Ver(p393Hseq('2026-11-01'), { period: 'semana' }, () => {
    leido.antes = !!DASH.f.periodoElegido;
    const b = document.querySelector('#dsec-inicio .hst-causa-ver'); leido.hayBoton = !!b;
    if (b) b.click();
    leido.despues = !!DASH.f.periodoElegido; leido.fIni = dashFiltrosDelPanelNuevo('');
  });
  PRUEBAS.igual([leido.antes, leido.hayBoton], [false, true], 'guarda: sin la marca, con el botón');
  PRUEBAS.igual([v.despues.periodo, leido.despues], ['mes', true], '🔴 tocarlo abre el mes y marca');
  PRUEBAS.igual([leido.fIni.period, leido.fIni.periodoElegido], ['mes', true], '🔴 y viaja al panel siguiente');
});

PRUEBAS.caso('⚠️ P393 · H2 de P386 · DISCRIMINADORES · comparando contra el de por defecto (la 7.64), «Semana» elegida se pierde; sin que viaje la marca, se pierde a la segunda vuelta; sin soltarla, «atrás» no suelta', () => p386Correr(async () => {
  const H = 'Consorcio HELITEC';
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  /* la regla vieja */
  p386Cambiar('dashFiltrosDelPanelNuevo', function (emp) {
    const f = (DASH && DASH.f) || {}, out = { emp: String(emp || '') }, def = DASH.panel === 'hseq' ? 'semana' : 'all';
    if (f.period && f.period !== def) { out.period = f.period; if (f.period === 'custom') { out.desde = f.desde || ''; out.hasta = f.hasta || ''; } }
    return out;
  });
  PRUEBAS.cierto(await p385Visor(H, 'direccion') && p386Periodo('semana'), 'guarda: Dirección con «Semana»');
  PRUEBAS.cierto(await p385Visor(H, 'hseq') && await p385Visor(H, 'direccion'), 'guarda: HSEQ y de vuelta');
  PRUEBAS.igual(DASH.f.period, 'all', '⚠️ discriminador · con la regla de la 7.64 vuelve a «Todo»: el caso de arriba lo ve');
  p386Volver();
  /* sin que la marca viaje */
  p386Sabotear('dashFiltrosDelPanelNuevo', [['out.period = f.period; out.periodoElegido = true;', 'out.period = f.period;']]);
  PRUEBAS.cierto(p386Periodo('semana'), 'guarda: «Semana»');
  PRUEBAS.cierto(await p385Visor(H, 'hseq'), 'guarda: HSEQ');
  PRUEBAS.igual(DASH.f.period, 'semana', 'guarda: el primer salto viaja');
  PRUEBAS.cierto(await p385Visor(H, 'direccion'), 'guarda: Dirección');
  PRUEBAS.igual(DASH.f.period, 'all', '⚠️ discriminador · sin la marca en `fInicial`, a la segunda vuelta se olvida');
  p386Volver();
  /* sin que «atrás» la saque */
  p386Sabotear('dashClearOne', [["DASH.f.desde = ''; DASH.f.hasta = ''; DASH.f.periodoElegido = false;", "DASH.f.desde = ''; DASH.f.hasta = '';"]]);
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(20)), 'guarda: «Personalizado» con una fecha');
  await p386Atras();
  PRUEBAS.igual(dashFiltrosDelPanelNuevo('').period, 'custom', '⚠️ discriminador · sin soltar la marca, «Personalizado» sin fechas seguiría viajando');
}));

/* ═════ H3 de P386 · «atrás» con el pedido fallando ══════════════════════════════════════════════════════════════════ */

/* El pedido falla: la red caída (`red`) o la sesión rechazada (`sesion`). `B.restaurar` lo devuelve al terminar el caso. */
function p393Falla(modo) {
  window.fetchConReloj = modo === 'red'
    ? () => Promise.reject(new TypeError('Failed to fetch'))
    : () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: false, error: 'Usuario o contraseña incorrecta' }), text: () => Promise.resolve('{"ok":false,"error":"Usuario o contraseña incorrecta"}') });
}
/* «Atrás» y espera a que termine lo que disparó (un aviso nuevo y el panel sin esqueleto), si no cerró. */
async function p393AtrasFallando(B) {
  const n = B.toasts.length;
  const a = await p386Atras();
  if (!a.cerro) { await PRUEBAS.esperarA(() => B.toasts.length > n, CARGA_MIN_MS + 3000); await PRUEBAS.esperarA(() => p385SinEsqueleto() && !document.getElementById('dashScroll').hasAttribute('inert'), CARGA_MIN_MS + 3000); }
  return { a: a, avisos: B.toasts.slice(n) };
}

['red', 'sesion'].forEach(modo => {
  PRUEBAS.caso('🔴 P393 · H3 de P386 · visor con ' + (modo === 'red' ? 'la red caída' : 'la sesión rechazada') + ': el primer «atrás» intenta volver a «Todas» y avisa; el siguiente cierra', () => p386Correr(async B => {
    /* R19 · `dashAtras` con `_volverFallo`, que pone `visorCambiar` al fallar un intento de `visorVolverTodas`. */
    PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
    PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
    const visor = DASH, n0 = B.pedidos.length;
    p393Falla(modo);
    const uno = await p393AtrasFallando(B);
    PRUEBAS.igual([uno.a.consumio, uno.a.cerro, DASH === visor], [true, false, true], '🔴 el primer «atrás» se consume en el intento, y el panel sigue');
    PRUEBAS.alMenos(uno.avisos.length, 1, 'y avisa · ' + uno.avisos.join(' | '));
    PRUEBAS.igual(p386$('visorEmpresa').value, 'Consorcio HELITEC', 'y el selector vuelve al panel que sigue abierto');
    PRUEBAS.cierto(p386Flecha(), 'y la ← sigue, para cerrar');
    const dos = await p386Atras();
    PRUEBAS.igual(dos.cerro, true, '🔴 el segundo «atrás» cierra: no se queda reintentando');
    PRUEBAS.igual(p386Pedidos(B, n0).length, 0, 'guarda: ninguno de estos llegó al servidor del banco');
  }));
});

PRUEBAS.caso('🔴 P393 · H3 de P386 · un éxito limpia eso: volvió la red, y «atrás» vuelve a «Todas» en vez de cerrar', () => p386Correr(async B => {
  /* R19 · la marca vive en `DASH`: un panel nuevo nace sin ella; `dashRefresh` la limpia cuando el servidor contesta. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor');
  const bien = window.fetchConReloj;
  p393Falla('red');
  await p393AtrasFallando(B);
  PRUEBAS.cierto(!!DASH._volverFallo, 'guarda: falló un intento');
  window.fetchConReloj = bien;
  await dashRefresh(true);
  PRUEBAS.falso(!!DASH._volverFallo, '🔴 el ↻ que contesta limpia la marca');
  const visor = DASH;
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && !a.cerro && await p385Hasta(() => DASH !== visor && p386EnCasa() && p385SinEsqueleto()), '🔴 y «atrás» vuelve a «Todas»');
  /* cambiar de panel por el visor también: un panel nuevo nace sin la marca */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor otra vez');
  p393Falla('red');
  await p393AtrasFallando(B);
  window.fetchConReloj = bien;
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'supervisor'), 'guarda: otro panel por el visor');
  PRUEBAS.falso(!!DASH._volverFallo, '🔴 un panel nuevo nace sin la marca');
}));

PRUEBAS.caso('🔴 P393 · H3 de P386 · «Trabajar sobre» con el pedido fallando: el mismo camino. Los otros filtros se sueltan primero, y la ✕ sigue cerrando', () => p386Correr(async B => {
  /* R19 · `dashAtras` con `dashSoloQuedaEmpresa`; `_volverFallo` lo pone `dashEmpresaAdminCambiar` al fallar soltar la empresa. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  p393Falla('red');
  const uno = await p393AtrasFallando(B);
  PRUEBAS.igual([uno.a.consumio, uno.a.cerro, DASH.f.emp, !!DASH._volverFallo], [true, false, 'Consorcio HELITEC', true], '🔴 el primer «atrás» intenta soltar la empresa, y falla');
  /* con otro filtro puesto, ése se suelta primero: no pide nada */
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Operaciones'), 'guarda: Departamento = Operaciones');
  const dep = await p386Atras();
  PRUEBAS.igual([dep.consumio, dep.cerro, DASH.f.dep], [true, false, ''], '🔴 con un departamento puesto, «atrás» lo suelta: los filtros no le piden nada al servidor');
  const dos = await p386Atras();
  PRUEBAS.igual(dos.cerro, true, '🔴 y el siguiente cierra');
}));

PRUEBAS.caso('⚠️ P393 · H3 de P386 · DISCRIMINADOR · sin la marca (la 7.64), con la red caída «atrás» reintenta y no cierra nunca', () => p386Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor');
  p386Sabotear('dashAtras', [['if (L && !L.enCasa && !fallo){', 'if (L && !L.enCasa){']]);
  p393Falla('red');
  const uno = await p393AtrasFallando(B), dos = await p393AtrasFallando(B), tres = await p393AtrasFallando(B);
  PRUEBAS.igual([uno.a.cerro, dos.a.cerro, tres.a.cerro], [false, false, false], '⚠️ discriminador · tres «atrás», tres intentos y nunca cierra: los casos de arriba lo ven');
}));

PRUEBAS.caso('🔴 P393 · verificador H4 · la marca vence: pasado el medio minuto, con la red de vuelta, «atrás» vuelve a «Todas» en vez de cerrar', () => p386Correr(async B => {
  /* R19 · `dashAtras` mira cuánto hace de `_volverFallo`. Sin pestaña Ciclo no hay tick que corra `dashRefresh`: si no venciera, una caída
     breve cerraba el panel diez minutos después (verificador de P393). Se corre la marca, y nada más: lo que se simula es el tiempo. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor');
  const bien = window.fetchConReloj, visor = DASH;
  p393Falla('red');
  await p393AtrasFallando(B);
  PRUEBAS.cierto(!!DASH._volverFallo, 'guarda: falló un intento');
  window.fetchConReloj = bien;
  DASH._volverFallo -= 31000;
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && !a.cerro && await p385Hasta(() => DASH !== visor && p386EnCasa() && p385SinEsqueleto()), '🔴 a los 31 segundos no cierra: vuelve a «Todas»');
}));

PRUEBAS.caso('⚠️ P393 · verificador H4 · DISCRIMINADOR · con la marca sin vencimiento (la 7.65), diez minutos después «atrás» cierra el panel', () => p386Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor');
  p386Sabotear('dashAtras', [[' && Date.now() - DASH._volverFallo < 30000', '']]);
  const bien = window.fetchConReloj;
  p393Falla('red');
  await p393AtrasFallando(B);
  window.fetchConReloj = bien;
  DASH._volverFallo -= 600000;
  PRUEBAS.igual((await p386Atras()).cerro, true, '⚠️ discriminador · cierra: el aserto de arriba lo ve');
}));

/* ═════ H6 de P386 · en la demostración, el repintado no vuelve a poner los nombres ══════════════════════════════════ */

/* Los nombres de las listas que `cicloRepintar` regenera (y las de los registros). */
function p393NombresDemo() {
  const de = (l, k) => (l || []).map(x => x && x[k || 'persona']).filter(Boolean);
  return Array.from(new Set([].concat(de(DASH.operacional), de(DASH.turnos), de((DASH.duty || {}).diario), de((DASH.duty || {}).personas), de(DASH.registros))));
}
const P393_ES_P = /^P\d+$/;
async function p393DemoEn(k) {
  PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró al «Ver como…»');
  const b = p387Boton(k), antes = DASH;
  PRUEBAS.cierto(!!b, 'guarda: está el botón de ' + k);
  if (!b) return false;
  b.click();
  return p385Hasta(() => !!DASH && DASH !== antes && DASH.demoMode && p385SinEsqueleto());
}

['hseq', 'hseqPanel'].forEach(k => {
  PRUEBAS.caso('🔴 P393 · H6 de P386 · demostración, ' + (k === 'hseq' ? 'Dirección' : 'HSEQ') + ': tras el repintado de cada minuto, las listas siguen con los MISMOS seudónimos, y con P# puesto Jornada lo encuentra', () => p386Correr387(async () => {
    /* R19 · `cicloRepintar` → `demoSembrarVivo` → `demoAnonimizarHseq`, con el mapa de la carga (`DASH._demoPids`). */
    PRUEBAS.cierto(await p393DemoEn(k), 'guarda: abrió la demostración');
    PRUEBAS.igual(DASH.vista, 'hseq', 'guarda: la vista es la de Dirección y HSEQ');
    const n0 = p393NombresDemo();
    PRUEBAS.igual(n0.filter(n => !P393_ES_P.test(n)), [], 'CONTROL · el primer pintado, sin nombres');
    const duty0 = ((DASH.duty || {}).personas || []).map(p => p.persona).sort(), reg0 = (DASH.registros || []).map(r => r.persona).join();
    PRUEBAS.alMenos(duty0.length, 3, 'guarda: la jornada de ejemplo tiene a sus tres');
    cicloRepintar();   // lo que hace `cicloTick` cada 60 s
    PRUEBAS.igual(p393NombresDemo().filter(n => !P393_ES_P.test(n)), [], '🔴 después del repintado, tampoco');
    PRUEBAS.igual(((DASH.duty || {}).personas || []).map(p => p.persona).sort(), duty0, '🔴 con los MISMOS seudónimos: no un número nuevo cada vez');
    PRUEBAS.igual((DASH.registros || []).map(r => r.persona).join(), reg0, 'y los registros no cambian');
    cicloRepintar();
    PRUEBAS.igual(((DASH.duty || {}).personas || []).map(p => p.persona).sort(), duty0, '🔴 tampoco a la segunda');
    /* lo que se ve: la Jornada con un seudónimo puesto */
    const conDuty = duty0[0];
    PRUEBAS.cierto(p385Filtrar('dashPer', conDuty), 'guarda: «Empleado» = ' + conDuty);
    cicloRepintar();
    const j = p386Jornada();
    PRUEBAS.falso(!!j.vacio, '🔴 con ' + conDuty + ' puesto, no dice «Nadie del filtro tiene jornadas»');
    PRUEBAS.igual(j.porPersona, [conDuty], '🔴 lista su fila');
  }));
});

PRUEBAS.caso('🔴 P393 · H6 de P386 · demostración, Dirección: el ↻ tampoco vuelve a poner los nombres, ni deja la jornada vacía', () => p386Correr387(async () => {
  /* R19 · `dashRefresh`: en la demostración no pisa `duty` y termina en `demoSembrarVivo`. Lo medí en la 7.65 sin esto: con el
     ↻, `registros` volvía con «Ana Suárez» y Jornada decía «Esta información es del servicio médico y de Dirección / HSEQ». */
  PRUEBAS.cierto(await p393DemoEn('hseq'), 'guarda: abrió la demostración');
  const duty0 = ((DASH.duty || {}).personas || []).map(p => p.persona).sort();
  const sig0 = DASH.rawSig;
  /* el ↻ con la respuesta idéntica: acá se mide la guarda de `duty`, que va antes del corte por `changed`. Por el camino «hubo
     cambios» `demoSembrarVivo` la vuelve a llenar con cualquier guarda (verificador de P393, H6). Y ese camino es el de todos los
     días: el `ts` de la demo lleva los milisegundos del pedido, así que dos respuestas seguidas nunca son iguales (medido). */
  const pedirDeVerdad = window.dashRequest;
  let capturada = null;
  p386Cambiar('dashRequest', p => pedirDeVerdad(p).then(d => { capturada = JSON.stringify(d); return d; }));
  PRUEBAS.igual(await dashRefresh(true), true, 'guarda: el ↻ contestó');
  p386Volver();
  PRUEBAS.cierto(!!capturada, 'guarda: quedó la respuesta del servidor');
  p386Cambiar('dashRequest', () => Promise.resolve(JSON.parse(capturada)));
  const firma = DASH.rawSig;
  PRUEBAS.igual(await dashRefresh(true), true, 'guarda: el ↻ contestó, con lo mismo');
  PRUEBAS.cierto(DASH.rawSig === firma, 'guarda: sin cambios de datos');
  PRUEBAS.igual(((DASH.duty || {}).personas || []).map(p => p.persona).sort(), duty0, '🔴 el ↻ sin cambios no borra la jornada');
  p386Sabotear('dashRefresh', [['if (!DASH.demoMode) DASH.duty = d.duty || null;', 'DASH.duty = d.duty || null;']]);
  await dashRefresh(true);
  PRUEBAS.cierto(DASH.rawSig === firma, 'guarda: sigue sin cambios de datos');
  PRUEBAS.igual(((DASH.duty || {}).personas || []).length, 0, '⚠️ discriminador · sin la guarda, el ↻ la borra: el aserto de arriba lo ve');
  p386Volver();
  DASH.duty = null;
  demoSembrarVivo();
  /* el servidor contesta algo distinto: si no, `dashRefresh` no repinta y esto no mediría nada */
  DASH.rawSig = sig0 + 'x';
  PRUEBAS.igual(await dashRefresh(true), true, 'guarda: el ↻ contestó');
  PRUEBAS.igual(p393NombresDemo().filter(n => !P393_ES_P.test(n)), [], '🔴 después del ↻, sin nombres');
  PRUEBAS.igual(((DASH.duty || {}).personas || []).map(p => p.persona).sort(), duty0, '🔴 con la jornada y los MISMOS seudónimos');
  PRUEBAS.falso(!!p386Jornada().vacio, 'y Jornada no dice que nadie tiene jornadas');
  PRUEBAS.alMenos((DASH.operacional || []).length, 1, '🔴 y el ciclo sigue');
  /* DISCRIMINADOR · sin volver a sembrar (la 7.65 antes de esto) */
  p386Sabotear('dashRefresh', [['if (DASH.demoMode) { try { demoSembrarVivo(); } catch(e){} }', '']]);
  DASH.rawSig = sig0 + 'y';
  await dashRefresh(true);
  PRUEBAS.alMenos(p393NombresDemo().filter(n => !P393_ES_P.test(n)).length, 1, '⚠️ discriminador · sin volver a sembrar, vuelven los nombres: el aserto de arriba lo ve');
}));

PRUEBAS.caso('🔴 P393 · H6 de P386 · demostración, Supervisor: el repintado deja los nombres; y en inglés el ciclo sigue traducido', () => p386Correr387(async () => {
  /* CONTROL · la vista que sí ve nombres. R19 · `demoSembrarVivo` anonimiza sólo con `DASH.vista === 'hseq'`, y traduce con
     `demoTraducirLista`, el mismo camino del primer pintado (el repintado no traducía). */
  PRUEBAS.cierto(await p393DemoEn('supervisor'), 'guarda: abrió la demostración');
  cicloRepintar();
  PRUEBAS.cierto(((DASH.duty || {}).personas || []).every(p => !P393_ES_P.test(p.persona)), 'CONTROL · Supervisor sigue con nombres');
  /* el idioma: `_demoLang` lo pone `onDashData` con lo que confirmó el servidor */
  const prev = DASH._demoLang;
  try {
    DASH._demoLang = 'en';
    cicloRepintar();
    const deps = Array.from(new Set((DASH.operacional || []).map(o => o.departamento)));
    PRUEBAS.igual(deps.filter(d => ['Tripulación', 'Administración', 'Operaciones'].indexOf(d) >= 0), [], '🔴 el repintado traduce lo que regenera: «Crew», no «Tripulación»');
  } finally { DASH._demoLang = prev; }
}));

PRUEBAS.caso('⚠️ P393 · H6 de P386 · DISCRIMINADORES · sin anonimizar en el repintado vuelven los nombres; con un mapa nuevo cada vez, Jornada dice «nadie»', () => p386Correr387(async () => {
  PRUEBAS.cierto(await p393DemoEn('hseq'), 'guarda: abrió la demostración');
  const duty0 = ((DASH.duty || {}).personas || []).map(p => p.persona).sort();
  p386Sabotear('demoSembrarVivo', [["if (DASH.vista === 'hseq') demoAnonimizarHseq();", '']]);
  cicloRepintar();
  PRUEBAS.alMenos(p393NombresDemo().filter(n => !P393_ES_P.test(n)).length, 3, '⚠️ discriminador · sin anonimizar, vuelven los nombres (la 7.64): los casos de arriba lo ven');
  p386Volver();
  p386Sabotear('demoAnonimizarHseq', [['const mapa = DASH._demoPids || (DASH._demoPids = {});', 'const mapa = {};']]);
  cicloRepintar();
  PRUEBAS.cierto(p385Filtrar('dashPer', duty0[0]), 'guarda: «Empleado» = ' + duty0[0]);
  cicloRepintar();
  PRUEBAS.igual(p386Jornada().vacio, t('jor_filtro_vacio'), '⚠️ discriminador · con un mapa nuevo en cada corrida, los seudónimos dejan de coincidir y dice «nadie»');
}));

/* ═════ D5 en la demostración · `cicloDemo()` y `dutyDemo()` tienen a las mismas personas ════════════════════════════ */

PRUEBAS.caso('🔴 P393 · D5 en la demo · el ciclo, la jornada y los turnos de ejemplo hablan de las mismas personas, con los mismos instantes y el departamento y el cargo de la nómina', () => {
  /* R19 · `cicloDemo()` (los eventos de Martín Ibáñez), contra `dutyDemo()` y `turnosDemo()`: `jorAlcance` arma su conjunto con
     las filas del ciclo. En producción `duty` sale del mismo `operacional`: acá se sostiene a mano, y esto lo vigila. */
  const c = () => Array.from(new Set(cicloDemo().map(e => e.persona))).sort();
  PRUEBAS.igual(c(), dutyDemo().personas.map(p => p.persona).sort(), '🔴 el ciclo y la jornada, las mismas personas');
  PRUEBAS.igual(c(), Array.from(new Set(turnosDemo().map(x => x.persona))).sort(), '🔴 y los turnos');
  PRUEBAS.igual(c(), DEMO_ACTIVOS.slice().sort(), 'son las de `DEMO_ACTIVOS`');
  /* los instantes: a ±1 min, por el redondeo del reloj entre una llamada y otra */
  const real = Date.now;
  try {
    const base = new Date(); base.setHours(16, 0, 0, 0);
    Date.now = () => base.getTime();
    const M = 'Martín Ibáñez';
    const min = iso => Math.round((base.getTime() - new Date(iso).getTime()) / 60000);
    const ci = {}; cicloDemo().filter(e => e.persona === M).forEach(e => { ci[e.evento] = min(e.iso); });
    const fila = dutyDemo().diario.filter(f => f.persona === M && f.fecha === todayStr())[0];
    PRUEBAS.cierto(!!fila, 'guarda: su jornada de hoy');
    const du = {}; fila.eventos.forEach(e => { du[e.evento] = min(e.iso); });
    PRUEBAS.igual(ci, du, '🔴 los cuatro eventos de hoy, los mismos instantes en Ciclo y en Jornada');
    const tu = {}; turnosDemo().filter(x => x.persona === M).forEach(x => { tu[x.tipo] = Math.round((base.getTime() - new Date(x.fecha + 'T' + x.hora + ':00').getTime()) / 60000); });
    PRUEBAS.igual([tu.checkin - ci.llegada_aero, tu.checkout - ci.salida_aero].map(Math.abs).every(x => x <= 1), true, '🔴 y el check-in y el check-out, los de su llegada y su salida · ' + JSON.stringify([tu, ci]));
    const ev = cicloDemo().filter(e => e.persona === M)[0], g = DEMO_GENTE.filter(x => x[0] === M)[0];
    PRUEBAS.igual([ev.departamento, ev.cargo], [g[2], g[3]], '🔴 con el departamento y el cargo de la nómina');
  } finally { Date.now = real; }
});

PRUEBAS.caso('🔴 P393 · D5 en la demo · con «Empleado = Martín Ibáñez», Jornada lista su fila y Ciclo lo tiene (decía «Nadie del filtro tiene jornadas»)', () => p386Correr387(async () => {
  /* R19 · `jorAlcance` con las filas de `DASH.operacional`, que en la demostración arma `cicloDemo()`. */
  PRUEBAS.cierto(await p393DemoEn('medico'), 'guarda: abrió la demostración');
  const M = 'Martín Ibáñez';
  PRUEBAS.cierto(p385Filtrar('dashPer', M), 'guarda: «Empleado» = ' + M);
  const j = p386Jornada();
  PRUEBAS.falso(!!j.vacio, '🔴 no dice que nadie tiene jornadas');
  PRUEBAS.igual(j.porPersona, [M], '🔴 lista su fila');
  /* DISCRIMINADOR · sin sus eventos en el ciclo (la 7.64) */
  const real = window.cicloDemo;
  try {
    p386Cambiar('cicloDemo', () => real().filter(e => e.persona !== M));
    DASH.operacional = cicloDemo();
    renderDash();
    PRUEBAS.igual(p386Jornada().vacio, t('jor_filtro_vacio'), '⚠️ discriminador · sin sus eventos, dice «nadie»: el aserto de arriba lo ve');
  } finally { p386Volver(); }
}));

/* ═════ R12 · R13 · lo nuevo en pantalla ═════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('F096 · R12 · R13 · la línea de Ciclo de HSEQ, de hoy y de un período, se lee a 375, 768 y 1366 px en los dos temas: 12 px o más, 4,5:1 o más, sin salirse', () => p386Correr(async () => {
  /* R19 · `cicloHseqAgregado`. Por la entrada real: el visor y, para el período, el botón de 30 días (`cicloPeriodoSet`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  const linea = () => document.querySelector('#dsec-ciclo .dash-block .db-sub');
  const hoy = linea();
  PRUEBAS.cierto(!!hoy, 'guarda: está la línea');
  if (!hoy) return;
  /* la cuenta, leída de lo que se ve al lado: los que no están «sin iniciar» */
  const sin = Number((document.querySelector('#dsec-ciclo .cic-kpi-sin b') || {}).textContent) || 0;
  const numeros = (p385Txt(hoy).match(/\d+/g) || []).map(Number);
  PRUEBAS.igual(numeros.length, 2, 'guarda: dice dos números · ' + p385Txt(hoy));
  PRUEBAS.igual(numeros[1] - numeros[0], sin, '🔴 por el camino real, cuántos de cuántos cierra con «sin iniciar»');
  PRUEBAS.igual(p386Legible('cic_hseq_d', hoy), [], 'R12 · R13 · la línea de hoy');
  /* 30 días, por el botón */
  const b = [...document.querySelectorAll('#dsec-ciclo button')].find(x => /cicloPeriodoSet\('30'\)/.test(x.getAttribute('onclick') || ''));
  PRUEBAS.cierto(!!b, 'guarda: está el botón de 30 días');
  if (!b) return;
  b.click();
  PRUEBAS.cierto(await PRUEBAS.esperarA(() => !CICLO_PIDIENDO && !!linea() && !document.getElementById('dsec-ciclo').hasAttribute('inert'), CARGA_MIN_MS + 3000), 'guarda: llegaron los 30 días');
  const per = linea();
  PRUEBAS.cierto(/30/.test(p385Txt(per)) && p385Txt(per).indexOf(t('cic_hseq_d', { a: 0, n: 0 }).split(' ').pop()) < 0, '🔴 dice el período, no «hoy» · ' + p385Txt(per));
  PRUEBAS.igual(p386Legible('cic_hseq_d_per', per), [], 'R12 · R13 · la línea del período');
}));
