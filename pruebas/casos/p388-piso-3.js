/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P388 · EL PISO DE HSEQ BAJA A 3 Y EL PANEL VACÍO DICE LA CAUSA                       (2026-11-04)
   ADR 019 y las decisiones de Franco del 2026-11-04 (`docs/specs/P388/avance.md`, fuera del repo):
   · el piso con que se SELLA pasa a 3 (`PISO_MIN_HSEQ`), y el mínimo que ACEPTA el lector va en una
     constante aparte (`PISO_LECTOR_HSEQ`), para que volver a sellar con 5 no deje en blanco a nadie;
   · lo ya sellado con 5 no se toca ni se re-sella (R22);
   · los textos dicen 3 sin subir la versión del consentimiento;
   · el panel de HSEQ sin tarjetas dice la causa: sin nómina, sin grupos en el período (y cuál sí tiene),
     o sin ningún grupo todavía. Sin dar nada que la lámina no promete.
   R17: todo entra por el camino real —el sellado (`sellarTotalesHseq_`), `accionSupervisor` con la clave del
   panel de HSEQ y, en el cliente, `onDashData`—, con los ayudantes del mundo de P308 (este archivo va después
   de p308, p309 y p310 en `casos.json`: sus `function` se ven desde acá, sus `const` no).
   R19: el piso de sellado lo da `pisoHseq_` (`PISO_MIN_HSEQ`); lo que acepta el lector, `PISO_LECTOR_HSEQ` en
   `unidadesSelladasHseq_` y en la guarda del estado de `sellarTotalesHseq_`; `sinNomina` lo manda
   `totalesHseqDeEmpresa_` con `cedulasNominaHseq_` (la misma función que cuenta el piso al sellar); la causa
   del panel la deriva `hseqCausaVacio`, y el mínimo del cliente es `hseqPisoMinimo`.
   R21: los pisos se leen del `.gs` REAL; ningún caso escribe el 3. Cada regla tiene su sabotaje y su control.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('P388 · el piso de HSEQ en 3 y la causa del panel vacío');

/* La gente del mundo de P308 que está en la nómina (Pedro Pendiente no: mide antes de entrar). */
const P388_GENTE = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis', 'Alma Única',
                    'Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes', 'Nora Nueva'];
/* El piso de producción hasta P388 (ADR 018): es historia, no un valor que la suite mida contra el `.gs`. */
const P388_ANTES = 5;

/* Un número `var NOMBRE = N;` del `.gs` (el real, o el texto que se pase). */
function p388Num(nombre, texto) {
  const m = new RegExp('\\nvar ' + nombre + ' = (\\d+);').exec(String(texto == null ? CTX.gs : texto) || '');
  return m ? Number(m[1]) : NaN;
}
/* El `.gs` real con el piso de sellado en `n` y, si se pasa, el del lector en `lector`. Las anclas se arman con los
   valores que tiene HOY el archivo, no con un número escrito acá. */
function p388ConPiso(n, lector) {
  const c = [['var PISO_MIN_HSEQ = ' + p388Num('PISO_MIN_HSEQ') + ';', 'var PISO_MIN_HSEQ = ' + n + ';']];
  if (lector != null) c.push(['var PISO_LECTOR_HSEQ = ' + p388Num('PISO_LECTOR_HSEQ') + ';', 'var PISO_LECTOR_HSEQ = ' + lector + ';']);
  return p308Parchar(CTX.gs, c);
}
/* El trazador de P308 (y uno de sus sabotajes, si se pide) sobre OTRO texto del `.gs`. */
function p388ConTraza(texto, sab) {
  const real = CTX.gs;
  try { CTX.gs = texto; return p308Gs(sab); } finally { CTX.gs = real; }
}
/* Un CH de prueba con reloj móvil y el `.gs` intercambiable: `usar(texto)` cambia el código y deja el libro, las
   propiedades y la hoja sellada como estaban (es lo que pasa al publicar una versión nueva del endpoint). */
function p388Mundo(tests, opc) {
  opc = opc || {};
  const reloj = { ms: Date.parse(opc.ahora || '2026-11-03T15:00:00-04:00') }, Real = Date;
  class Movil extends Real {
    constructor(...a) { if (a.length) super(...a); else super(reloj.ms); }
    static now() { return reloj.ms; }
    static [Symbol.hasInstance](x) { return x instanceof Real; }
  }
  const env = GS.crearEntorno(p308Hojas(tests, opc));
  env.Date = Movil;
  const w = { env: env, reloj: reloj, faltan: [] };
  let gs = null;
  w.usar = (texto, sab) => { const t = p388ConTraza(texto, sab); w.faltan = w.faltan.concat(t.faltan); gs = t.gs; return w; };
  w.usar(opc.gs || CTX.gs, opc.sabotaje);
  const api = () => GS.cargarGs(gs, env, ['accionSupervisor', 'sellarTotalesHseq_', 'accionDemo']);
  w.hoja = n => env.SpreadsheetApp.openById('maestro').getSheetByName(n);
  w.pedir = (params, clave) => JSON.parse(api().accionSupervisor(Object.assign({ usuario: 'helitec', pass: clave || 'hseq-308',
    dispositivoId: 'p388' }, params || {})).getContent());
  w.sellar = iso => { if (iso) reloj.ms = Date.parse(iso); return api().sellarTotalesHseq_(reloj.ms); };
  w.sellarYPedir = (iso, params, clave) => { const s = w.sellar(iso); const r = w.pedir(params, clave); r.__sellado = s; return r; };
  w.demo = () => JSON.parse(api().accionDemo({ dispositivoId: 'p388' }).getContent());
  w.agregar = x => w.hoja('Respuestas de formulario 1').appendRow(p308Fila(x));
  w.props = () => env.PropertiesService.getScriptProperties();
  /* las filas selladas de una MÉTRICA (no las de «estado» ni las de «excluidos») */
  w.unidades = () => { const h = w.hoja('Totales HSEQ'); return h ? h.getDataRange().getValues().slice(1)
    .filter(f => ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'].indexOf(String(f[2])) >= 0) : []; };
  return w;
}
function p388Tests(gente, d, h0, v) {
  return gente.map((p, i) => p308Test({ p: p, d: d, h: h0 + ':' + String(10 + i), v: v == null ? 3 + (i % 4) : v }));
}
/* ¿Algún período trae algún total? */
function p388AlgunTotal(T) { return p308Conjuntos(T || {}, '').length > 0; }

/* ══ 1 · Los pisos del `.gs` ════════════════════════════════════════════════════════════════════ */
PRUEBAS.caso('🔴 P388 · los dos pisos del `.gs`: el lector acepta todo lo que el sellado escribe, y ninguno baja de 3', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const regla = texto => {
    const min = p388Num('PISO_MIN_HSEQ', texto), lec = p388Num('PISO_LECTOR_HSEQ', texto);
    return { min: min, lec: lec, acepta: lec <= min, adr: lec >= 3 && min >= 3 };
  };
  const r = regla();
  PRUEBAS.cierto(r.min > 0 && r.lec > 0, 'guarda: los dos pisos están en el `.gs` · ' + JSON.stringify(r));
  /* R19 · `unidadesSelladasHseq_` rechaza una fila con «Piso» menor que PISO_LECTOR_HSEQ: si fuera mayor que el de
     sellado, cada fila nueva se leería como una hoja tocada */
  PRUEBAS.cierto(r.acepta, '🔴 el lector acepta todo lo que el sellado escribe (PISO_LECTOR_HSEQ ≤ PISO_MIN_HSEQ)');
  /* ADR 019, «Bajar el piso por debajo de 3»: con 2 personas, cada una sabe el valor de la otra restando el suyo */
  PRUEBAS.cierto(r.adr, '🔴 ADR 019 · ningún total de menos de 3 personas, ni al sellar ni al leer');
  /* DISCRIMINADORES · la misma regla sobre dos `.gs` que la rompen; y el control, el real, arriba */
  const lectorAlto = p388ConPiso(r.min, r.min + 2), lectorBajo = p388ConPiso(r.min, 2);
  PRUEBAS.igual(lectorAlto.faltan.concat(lectorBajo.faltan), [], 'guarda: los dos sabotajes se aplicaron');
  PRUEBAS.falso(regla(lectorAlto.gs).acepta, '⚠️ discriminador · con el lector por encima del sellado, la regla lo ve');
  PRUEBAS.falso(regla(lectorBajo.gs).adr, '⚠️ discriminador · con el lector en 2, la regla lo ve');
});

/* ══ 2 · El sellado con el piso del `.gs` ════════════════════════════════════════════════════════ */
PRUEBAS.caso('🔴 P388 · con el piso del `.gs`, P personas de la nómina cierran una unidad sellada; P − 1, nada', () => {
  /* R19 · `sellarTotalesHseq_` arma las unidades con `formarUnidadesHseq_(tests, pisoHseq_(anonN), claveDe)`, y la guarda
     del estado escribe el grupo «estado» si su piso es al menos `PISO_LECTOR_HSEQ`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const P = p388Num('PISO_MIN_HSEQ');
  const correr = (tests, gs) => {
    const w = p388Mundo(tests, { gs: gs });
    if (w.faltan.length) return { faltan: w.faltan };
    const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
    return { r: r, unidades: w.unidades().map(f => ({ personas: Number(f[9]), piso: Number(f[10]), tests: Number(f[5]) })) };
  };
  /* todos en 3 (verde con cualquier nivel): el grupo «estado» dice SEGURO con cualquier piso del `.gs` */
  const tests = p388Tests(P388_GENTE.slice(0, P), '2026-11-03', '08', 3);
  const m = correr(tests);
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  PRUEBAS.igual(m.unidades, [{ personas: P, piso: P, tests: P }], '🔴 una unidad, con «Personas» y «Piso» iguales al piso del `.gs` (' + P + ')');
  const T = m.r.totalesHseq || {};
  PRUEBAS.igual([T.piso, ((T.periodos || {}).hoy || {}).metricas.kss.n], [P, P], '🔴 el panel recibe ese piso y el total de hoy, con sus ' + P + ' tests');
  const e = ((T.periodos || {}).hoy || {}).estado || {};
  PRUEBAS.igual([e.etapa, e.personas], ['seguro', P], 'y el grupo «estado» de esa tanda se escribe (la guarda del estado acepta el piso nuevo)');
  const menos = correr(tests.slice(0, P - 1));
  PRUEBAS.igual([menos.unidades.length, p388AlgunTotal(menos.r.totalesHseq)], [0, false], '🔴 con ' + (P - 1) + ' personas, ninguna unidad y ningún total');
  /* DISCRIMINADOR · el mismo CH con un piso más: los mismos P tests ya no cierran nada. Si cerraran, el sellado no estaría
     usando `PISO_MIN_HSEQ`. */
  const v = p388ConPiso(P + 1);
  PRUEBAS.igual(v.faltan, [], 'guarda: el sabotaje del piso se aplicó');
  const s = correr(tests, v.gs);
  PRUEBAS.igual(s.unidades.length, 0, '⚠️ discriminador · con el piso en ' + (P + 1) + ', los mismos ' + P + ' tests no cierran ninguna unidad');
});

/* ══ 3 · Lo ya sellado con 5 sigue, y lo nuevo se sella con el piso nuevo (R22) ═════════════════════ */
/* El paso de producción: el CH tiene unidades de 5 y tests que esperaban (menos de 5 personas). Se publica el `.gs` nuevo
   y la primera corrida sella lo que esperaba, con el piso nuevo. Lo de antes no se toca ni se re-sella. */
function p388Transicion(sabotaje) {
  const P = p388Num('PISO_MIN_HSEQ');
  const antes = p388ConPiso(P388_ANTES);
  if (antes.faltan.length) return { faltan: antes.faltan };
  const cinco = p388Tests(P388_GENTE.slice(0, P388_ANTES), '2026-11-02', '08');                    // una unidad de 5
  const esperan = p388Tests(['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes'].slice(0, P - 1), '2026-11-02', '09');  // P − 1: no llegan a 5
  const nuevo = p308Test({ p: 'Nora Nueva', d: '2026-11-03', h: '09:00', v: 6 });
  const w = p388Mundo(cinco.concat(esperan), { gs: antes.gs, sabotaje: sabotaje });
  if (w.faltan.length) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-02T15:00:00-04:00');
  const fila5 = JSON.stringify((w.unidades()[0] || []).slice(0, 14));
  w.usar(CTX.gs, sabotaje);                                                                       // se publica el `.gs` nuevo
  w.agregar(nuevo);
  const r2 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  const tests = cinco.concat(esperan, [nuevo]);
  const huellas = w.unidades().reduce((a, f) => a.concat(JSON.parse(String(f[18] || '[]'))), []);
  return { P: P, r1: r1, r2: r2, cinco: cinco, esperan: esperan, nuevo: nuevo, fila5Antes: fila5,
           fila5Despues: JSON.stringify((w.unidades()[0] || []).slice(0, 14)), unidades: w.unidades(),
           repetidos: huellas.filter((h, i) => huellas.indexOf(h) !== i), despejable: p308Medir([r1, r2], tests, P).despejable };
}
PRUEBAS.caso('🔴 P388 · R22 · con unidades de 5 ya selladas, el piso nuevo sella sólo lo que esperaba: nada se re-sella ni se despeja', () => {
  /* R19 · lo que no se re-sella lo garantizan las huellas y el tope de `sellarTotalesHseq_` (ADR 018); lo que se lee, las
     dos clases de fila juntas, `unidadesSelladasHseq_` con `PISO_LECTOR_HSEQ`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const m = p388Transicion();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador y el `.gs` de antes');
  if (m.faltan) return;
  /* este caso mide la BAJADA desde el 5 de ADR 018: si el piso del `.gs` vuelve a 5, no mide nada y lo dice */
  PRUEBAS.cierto(m.P < P388_ANTES, 'guarda: el piso del `.gs` (' + m.P + ') es menor que el de antes (' + P388_ANTES + ')');
  PRUEBAS.igual([m.r1.__sellado.nuevas, Number((m.unidades[0] || [])[10])], [1, P388_ANTES], 'guarda: antes se selló una unidad de 5, y lo demás esperaba');
  PRUEBAS.igual(m.fila5Despues, m.fila5Antes, '🔴 R22 · la fila de la unidad de 5 queda igual, celda por celda');
  PRUEBAS.igual([m.r2.__sellado.nuevas, m.r2.__sellado.excluidos, m.r2.__sellado.trabadas], [1, 0, []],
    '🔴 la primera corrida con el piso nuevo sella UNA unidad (lo que esperaba y el test nuevo), sin excluir ni detener nada');
  const nueva = m.unidades[m.unidades.length - 1] || [];
  PRUEBAS.igual([Number(nueva[9]), Number(nueva[10])], [m.P, m.P], 'y la unidad nueva tiene el piso del `.gs`');
  PRUEBAS.igual(JSON.parse(String(nueva[18] || '[]')).sort(), m.esperan.concat([m.nuevo]).map(x => x.id).sort(),
    '🔴 la unidad nueva son exactamente los que esperaban y el nuevo: ninguno de la unidad de 5');
  PRUEBAS.igual(m.repetidos, [], '🔴 ningún test quedó en dos unidades');
  const T = m.r2.totalesHseq || {};
  PRUEBAS.cierto(!T.error && ((T.periodos || {}).todo || {}).metricas.kss.n === P388_ANTES + m.P,
    '🔴 el panel lee las dos clases de fila juntas: «Todo» suma la unidad de 5 y la de ' + m.P + ' · ' + JSON.stringify(T.error || (((T.periodos || {}).todo || {}).metricas || {}).kss && { n: T.periodos.todo.metricas.kss.n }));
  PRUEBAS.igual(m.despejable, [], '🔴 entre el antes y el después no se despeja a nadie (ningún átomo de menos de ' + m.P + ' personas)');
  /* DISCRIMINADOR · rearmar las unidades en cada pedido con el piso de ese momento (la 1.ª versión de P308): el cambio de
     piso corre las fronteras y deja a alguien solo */
  const s = p388Transicion('sinSellar');
  PRUEBAS.igual(s.faltan || [], [], 'guarda: el sabotaje «sin sellar» se aplicó');
  if (!s.faltan) PRUEBAS.alMenos(s.despejable.length, 1, '⚠️ discriminador · rearmando con el piso nuevo en cada pedido, se despeja · ' + s.despejable.join(' / '));
});

/* ══ 4 · Volver a 5 no deja en blanco a nadie ════════════════════════════════════════════════════ */
function p388Vuelta(gsVuelta) {
  const P = p388Num('PISO_MIN_HSEQ');
  const conP = p388Tests(P388_GENTE.slice(0, P), '2026-11-02', '08');
  const w = p388Mundo(conP);
  if (w.faltan.length) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-02T15:00:00-04:00');
  w.usar(gsVuelta);                                                       // alguien vuelve a sellar con 5
  const r2 = w.pedir();
  const cinco = p388Tests(P388_GENTE.slice(P, P + P388_ANTES), '2026-11-03', '08');
  cinco.forEach(x => w.agregar(x));
  const r3 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  return { P: P, r1: r1, r2: r2, r3: r3, pisos: w.unidades().map(f => Number(f[10])),
           despejable: p308Medir([r1, r2, r3].filter(r => r.totalesHseq && r.totalesHseq.periodos), conP.concat(cinco), P).despejable };
}
PRUEBAS.caso('🔴 P388 · volver a sellar con 5 no deja a la empresa sin totales: las filas de 3 se siguen leyendo', () => {
  /* R19 · la guarda del lector (`unidadesSelladasHseq_`) compara contra `PISO_LECTOR_HSEQ`, no contra `PISO_MIN_HSEQ`: con
     una sola constante, cada fila de 3 sería una «hoja tocada» y `totalesHseqDeEmpresa_` no mandaría NINGÚN total. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const vuelta = p388ConPiso(P388_ANTES), unaSola = p388ConPiso(P388_ANTES, P388_ANTES);
  PRUEBAS.igual(vuelta.faltan.concat(unaSola.faltan), [], 'guarda: los dos `.gs` de la vuelta se armaron');
  const m = p388Vuelta(vuelta.gs);
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  PRUEBAS.cierto(m.P < P388_ANTES, 'guarda: el piso del `.gs` (' + m.P + ') es menor que el de la vuelta (' + P388_ANTES + ')');
  const k = r => ((((r.totalesHseq || {}).periodos || {}).todo || {}).metricas || {}).kss;
  PRUEBAS.cierto(!!k(m.r1), 'guarda: antes de la vuelta, la unidad de ' + m.P + ' está a la vista');
  PRUEBAS.cierto(!m.r2.totalesHseq.error && !!k(m.r2) && k(m.r2).n === m.P,
    '🔴 recién vuelto a 5, el panel sigue mostrando la unidad de ' + m.P + ' · ' + JSON.stringify(m.r2.totalesHseq.error || (k(m.r2) && { n: k(m.r2).n })));
  PRUEBAS.igual(m.pisos, [m.P, P388_ANTES], '🔴 y lo nuevo se sella con 5, al lado de lo de antes');
  PRUEBAS.cierto(!!k(m.r3) && k(m.r3).n === m.P + P388_ANTES, 'el panel suma las dos');
  PRUEBAS.igual(m.despejable, [], '🔴 y nada se despeja entre los tres momentos');
  /* DISCRIMINADOR · con UNA sola constante (el lector también en 5), la misma vuelta deja a la empresa en blanco */
  const s = p388Vuelta(unaSola.gs);
  PRUEBAS.igual(s.faltan || [], [], 'guarda: el `.gs` de una sola constante');
  if (!s.faltan) PRUEBAS.igual([(s.r2.totalesHseq || {}).causa, !!(s.r2.totalesHseq || {}).periodos], ['hoja', false],
    '⚠️ discriminador · con una sola constante, las filas de ' + s.P + ' se leen como una hoja tocada y el panel queda sin ningún total');
});

PRUEBAS.caso('🔴 P388 · volver a 5: la guarda del estado acepta lo mismo que el lector, así un grupo de unidades de 3 se sigue escribiendo', () => {
  /* R19 · `sellarTotalesHseq_` no escribe un grupo «estado» con piso menor que `PISO_LECTOR_HSEQ` («un grupo que el lector
     rechazaría no se escribe»). Con el piso de SELLADO en esa guarda, después de volver a 5 la primera corrida que arma la
     historia (la hoja como la dejó P308, sin grupos «estado») descartaría los grupos de las unidades de 3. Con los dos pisos
     en 3 las dos guardas son indistinguibles: sólo se ven distintas con el sellado en 5. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  if (typeof p310HojaP308 !== 'function') {
    PRUEBAS.cierto(false, '⚠️ no está `p310HojaP308` (p310 no corrió antes): esta medición queda SIN MEDIR'); return; }
  const P = p388Num('PISO_MIN_HSEQ');
  const correr = gsVuelta => {
    const w = p388Mundo(p388Tests(P388_GENTE.slice(0, P), '2026-11-02', '08', 3));
    if (w.faltan.length) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    p310HojaP308(w);                                   // sin grupos «estado», sin su tope: la historia por armar
    w.usar(gsVuelta);
    const r = w.sellarYPedir('2026-11-02T15:20:00-04:00');
    return { s: r.__sellado, causa: (r.totalesHseq || {}).causa || '' };
  };
  const vuelta = p388ConPiso(P388_ANTES);
  const guardaConSellado = p308Parchar(vuelta.gs, [['        if (!(e.piso >= PISO_LECTOR_HSEQ) || e.personas < e.piso || coloreados < e.personas) { estadoNoEscritos++; return; }',
    '        if (!(e.piso >= PISO_MIN_HSEQ) || e.personas < e.piso || coloreados < e.personas) { estadoNoEscritos++; return; }']]);
  PRUEBAS.igual(vuelta.faltan.concat(guardaConSellado.faltan), [], 'guarda: el `.gs` de la vuelta y su sabotaje');
  const m = correr(vuelta.gs);
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador');
  if (m.faltan) return;
  PRUEBAS.cierto(P < P388_ANTES, 'guarda: el piso del `.gs` (' + P + ') es menor que el de la vuelta (' + P388_ANTES + ')');
  PRUEBAS.igual([m.s.nuevasEstado, m.s.estadoNoEscritos, m.causa], [1, 0, ''],
    '🔴 con el sellado vuelto a 5, el grupo «estado» de la unidad de ' + P + ' se escribe, y el panel no queda en blanco · ' + JSON.stringify([m.s.nuevasEstado, m.s.estadoNoEscritos]));
  const s = correr(guardaConSellado.gs);
  if (!s.faltan) PRUEBAS.igual([s.s.nuevasEstado, s.s.estadoNoEscritos], [0, 1], '⚠️ discriminador · con el piso de sellado en la guarda del estado, ese grupo se pierde');
});

/* ══ 5 · `sinNomina`: lo que sólo sabe el servidor, con la misma función que cuenta el piso ═════════ */
/* Cuatro nóminas para la misma empresa y los mismos tests (P personas): la normal; ninguna fila; filas sin cédula; filas
   sólo de otra empresa. `sinNomina` tiene que decir exactamente cuándo el sellado no puede formar ninguna unidad. */
function p388Nomina(caso, gs) {
  const P = p388Num('PISO_MIN_HSEQ');
  const tests = p388Tests(P388_GENTE.slice(0, P), '2026-11-03', '08');
  const opc = { gs: gs };
  if (caso === 'ninguna' || caso === 'otraEmpresa') opc.sinNomina = P388_GENTE.concat(['Pedro Pendiente']);
  const w = p388Mundo(tests, opc);
  if (w.faltan.length) return { faltan: w.faltan };
  const h = w.hoja('Nómina');
  if (caso === 'sinCedula') for (let i = 2; i <= h.getLastRow(); i++) h.getRange(i, 3).setValue('');
  if (caso === 'otraEmpresa') P388_GENTE.forEach(n => h.appendRow(p308FilaNomina(n, 'Cardón')));
  const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  return { r: r, T: r.totalesHseq || {}, nuevas: r.__sellado.nuevas };
}
const P388_NOMINAS = ['normal', 'ninguna', 'sinCedula', 'otraEmpresa'];
PRUEBAS.caso('🔴 P388 · `sinNomina` llega exactamente cuando el sellado no puede formar ningún grupo, y sólo como `true`', () => {
  /* R19 · `totalesHseqDeEmpresa_` lo manda con `cedulasNominaHseq_`, la MISMA función con que `sellarTotalesHseq_` arma
     `enNomina` (R21). La lámina de HSEQ no promete cuántos se midieron ni quiénes: sólo viaja `true`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const r = {};
  P388_NOMINAS.forEach(c => { r[c] = p388Nomina(c); });
  PRUEBAS.igual(P388_NOMINAS.filter(c => r[c].faltan), [], 'guarda: los cuatro mundos se armaron');
  if (r.normal.faltan) return;
  PRUEBAS.igual([r.normal.nuevas, r.normal.T.sinNomina], [1, undefined], 'CONTROL · con la nómina cargada se sella, y no viaja `sinNomina`');
  ['ninguna', 'sinCedula', 'otraEmpresa'].forEach(c => {
    PRUEBAS.igual([r[c].nuevas, r[c].T.sinNomina], [0, true], '🔴 ' + c + ' · el sellado no forma ninguna unidad, y el panel recibe `sinNomina: true`');
    PRUEBAS.falso(p388AlgunTotal(r[c].T), c + ' · y ningún total');
  });
  /* R21 · la equivalencia, mundo por mundo: «sin nómina» ⇔ el sellado no pudo formar nada con P personas medidas */
  PRUEBAS.igual(P388_NOMINAS.filter(c => (r[c].T.sinNomina === true) !== (r[c].nuevas === 0)), [],
    '🔴 R21 · `sinNomina` y el sellado dicen lo mismo en los cuatro mundos');
  /* sólo `true`, ningún número ni ningún nombre: la forma de los totales es la de P308 más esa marca */
  const raras = Object.keys(r.ninguna.T).filter(k => ['piso', 'regla', 'hoy', 'umbralEstado', 'corte', 'corteDia', 'periodos',
    'ultimaCorrida', 'detenido', 'sinNomina'].indexOf(k) < 0);
  PRUEBAS.igual([raras, typeof r.ninguna.T.sinNomina], [[], 'boolean'], '🔴 no viaja nada más que la marca, y es un booleano');
  /* DISCRIMINADOR · «sin nómina» derivado de otra forma (las filas de la empresa, con o sin cédula, como `nominaTotal`):
     con filas sin cédula el panel diría que hay nómina mientras el sellado no puede contar a nadie */
  const otra = p308Parchar(CTX.gs, [['    if (cedulasHoy && !Object.keys(cedulasHoy).length) T.sinNomina = true;',
    '    if (!leerNomina().some(function (n) { return norm(nominaEmpresaCanon(construirAlias(), n.empresa)) === norm(empresaCanon); })) T.sinNomina = true;']]);
  PRUEBAS.igual(otra.faltan, [], 'guarda: el sabotaje «otra derivación» se aplicó');
  if (!otra.faltan.length) {
    const s = p388Nomina('sinCedula', otra.gs);
    PRUEBAS.igual([s.nuevas, s.T.sinNomina], [0, undefined], '⚠️ discriminador · con otra derivación, el sellado no forma nada y el panel no dice por qué');
  }
});

PRUEBAS.caso('🔴 P388 · si la nómina no se puede leer, el panel no afirma «sin nómina»', () => {
  /* R19 · `totalesHseqDeEmpresa_`: el `catch` deja `cedulasHoy` en `null`, y `null` no es «ninguna cédula». */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const LEE = '      cedulasHoy = cedulasNominaHseq_(leerNomina(), construirAlias(), norm(empresaCanon));';
  const ROMPE = '      cedulasHoy = cedulasNominaHseq_((function () { throw new Error("nómina ilegible"); })(), construirAlias(), norm(empresaCanon));';
  const ilegible = p308Parchar(CTX.gs, [[LEE, ROMPE]]);
  const abierta = p308Parchar(CTX.gs, [[LEE, ROMPE], ['    } catch (eV) { vigentes = Object.create(null); cedulasHoy = null; }',
                                                      '    } catch (eV) { vigentes = Object.create(null); cedulasHoy = {}; }']]);
  PRUEBAS.igual(ilegible.faltan.concat(abierta.faltan), [], 'guarda: la nómina ilegible y el sabotaje se aplicaron');
  if (ilegible.faltan.length || abierta.faltan.length) return;
  const m = p388Nomina('normal', ilegible.gs);
  PRUEBAS.cierto(!m.T.error && m.T.sinNomina === undefined, '🔴 con la nómina ilegible al leer, no viaja `sinNomina` (no se sabe) · ' + JSON.stringify({ e: m.T.error, s: m.T.sinNomina }));
  const s = p388Nomina('normal', abierta.gs);
  PRUEBAS.igual(s.T.sinNomina, true, '⚠️ discriminador · si el `catch` dejara una lista vacía, diría «sin nómina» sobre una empresa que la tiene');
});

/* ══ 6 · La demostración no cambia (ADR 020) ════════════════════════════════════════════════════ */
PRUEBAS.caso('P388 · la demostración arma sus totales en el momento, con el piso del `.gs` y sin `sinNomina`', () => {
  /* R19 · `accionDemo` → `totalesHseqDemo_` (por nombre, sin nómina del CH: ADR 020). Su panel vacío no puede decir «sin
     nómina»: la demo no la usa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const P = p388Num('PISO_MIN_HSEQ');
  /* ⚠️ P391 · PERSONAJES DEL ELENCO, CON UNA FECHA DEL SEMBRADO. Desde P391 la demostración muestra sólo el elenco
     (`DEMO_ELENCO`) y sólo filas del CH hasta `DEMO_ELENCO_HASTA` (D1). Con la gente de P308 y la fecha de hoy, el filtro
     dejaba la demostración VACÍA y este caso seguía en verde sin medir nada (investigación de P391, §7.2). Por eso las
     guardas de abajo: los tests están, y algún período tiene un total armado con el piso. El día: el último del CH al
     2026-11-03, que el corte deja pasar (inclusive). */
  const ELENCO = ['Ana Suárez', 'Camila Torres', 'Federico Blanco', 'Gabriel Ortiz', 'José Duarte', 'Diego Ramírez', 'Sofía Núñez', 'Valentina Ríos'];
  const gente = ELENCO.slice(0, P + 1);
  const correr = gs => {
    const w = p388Mundo(p388Tests(gente, '2026-08-05', '08').map(x => Object.assign(x, { emp: 'Empresa Demo' })), { gs: gs });
    return w.faltan.length ? { faltan: w.faltan } : w.demo();
  };
  const d = correr();
  PRUEBAS.igual(d.faltan || [], [], 'guarda');
  if (d.faltan) return;
  PRUEBAS.cierto(d.ok && !!(d.totalesHseq && d.totalesHseq.periodos), 'guarda: la demostración trae sus totales');
  PRUEBAS.igual((d.registros || []).length, gente.length, 'guarda: la demostración trae los ' + gente.length + ' tests (vacía, los asertos de abajo no medirían nada)');
  PRUEBAS.cierto(p388AlgunTotal(d.totalesHseq), 'guarda: algún período trae un total armado con el piso (P = ' + P + ', ' + gente.length + ' personas)');
  PRUEBAS.igual([d.totalesHseq.piso, d.totalesHseq.sinNomina], [P, undefined], '🔴 con el piso del `.gs`, y sin `sinNomina`');
  const s = p308Parchar(CTX.gs, [['    T.ultimaCorrida = new Date().toISOString();   // la demostración se arma en el momento: siempre está al día',
    '    T.ultimaCorrida = new Date().toISOString(); T.sinNomina = true;']]);
  PRUEBAS.igual(s.faltan, [], 'guarda: el sabotaje se aplicó');
  if (!s.faltan.length) PRUEBAS.igual(correr(s.gs).totalesHseq.sinNomina, true, '⚠️ discriminador · el caso ve una marca que la demo no debe mandar');
});

/* ══ 7 · El cliente: el piso, el cartel y el aviso de la causa ══════════════════════════════════ */
function p388SinApp() { return !CTX.hayGs || typeof onDashData !== 'function' || typeof hseqCausaVacio !== 'function'; }
/* Los casos del cliente pintan con `p309Pintar`, de p309, que corre antes en `casos.json`. Sin él la medición no se hace, y
   eso es ROJO, no un salteo: con `cierto(true)` el sabotaje M3 quedaba invisible corriendo p388 sin p310 (verificador de
   P388). El precedente es `p385`. */
function p388SinP309() {
  if (typeof p309Pintar === 'function') return false;
  PRUEBAS.cierto(false, '⚠️ no está `p309Pintar` (p309 no corrió antes): esta medición queda SIN MEDIR');
  return true;
}
/* Pinta un payload del servidor real y lee lo que se ve: el cartel (`p310Cartel`), el aviso de la causa del inicio, su
   botón, las tarjetas con número, la línea del corte y la hoja de la semana. `antes` corre con el panel pintado (por
   ejemplo, tocar el botón). El reloj del cierre va «al día» (hace cinco minutos), como en producción: el del emulador queda
   en su fecha y, contra el reloj real, parecería parado (lo mismo que hace P309). `reloj` lo reemplaza (`null`: nunca corrió). */
function p388Ver(payload, f, antes, reloj) {
  const x = p308Limpio(payload);
  if (x.totalesHseq && !x.totalesHseq.error) x.totalesHseq.ultimaCorrida = reloj !== undefined ? reloj : new Date(Date.now() - 5 * 60000).toISOString();
  return p309Pintar(x, f, () => {
    const q = s => document.querySelector(s);
    const leer = () => {
      const aviso = q('#dsec-inicio .hst-causa'), btn = aviso && aviso.querySelector('.hst-causa-ver');
      const sem = document.createElement('div'); sem.innerHTML = hseqSemanaHtml();
      const semAviso = sem.querySelector('.hst-causa');
      return { cartel: p310Cartel().texto, causa: aviso ? aviso.dataset.causa : null,
               aviso: aviso ? (aviso.querySelector('span') || aviso).textContent : '', boton: btn ? btn.textContent : null,
               periodo: DASH.f.period, conNumero: [...document.querySelectorAll('#dsec-inicio .kpi')].filter(k => !k.classList.contains('kpi-bajo-piso')).length,
               bajoPiso: ((q('#dsec-inicio .kpi-bajo-piso .kv') || {}).textContent) || '',
               corte: ((q('#dsec-inicio .kfresco') || {}).textContent) || '', detenido: !!q('#dsec-inicio .hst-detenido'),
               semana: semAviso ? semAviso.dataset.causa : null, semanaBoton: !!sem.querySelector('.hst-causa-ver') };
    };
    const a = leer();
    if (!antes) return a;
    antes();
    return Object.assign(a, { despues: leer() });
  }).extra;
}
/* Un sabotaje del cliente, restaurado en el `finally` (todo es sincrónico). */
function p388ConCausa(falsa, fn) {
  const real = window.hseqCausaVacio;
  try { window.hseqCausaVacio = falsa(real); return fn(); } finally { window.hseqCausaVacio = real; }
}

PRUEBAS.caso('🔴 P388 · el mínimo del cliente es el del lector del `.gs`, y la tarjeta vacía dice el piso que manda el servidor', () => {
  /* R19 · `hseqPiso` (con `hseqPisoMinimo` de respaldo) y `dashKpiCardBajoPiso` (`piso || hseqPiso()`). Hasta P388 el
     cliente forzaba 5: con el servidor en 3, «Todavía no hay un grupo de 5» al lado de totales de 3. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  PRUEBAS.igual(hseqPisoMinimo(), p388Num('PISO_LECTOR_HSEQ'), '🔴 R21 · `hseqPisoMinimo()` es el `PISO_LECTOR_HSEQ` del `.gs`');
  const w = p388Mundo(p388Tests(P388_GENTE.slice(0, P), '2026-11-03', '08'));
  const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  PRUEBAS.igual(r.totalesHseq.piso, P, 'guarda: el servidor real manda su piso');
  const v = p388Ver(r, { period: 'dia' });
  PRUEBAS.igual(v.bajoPiso, t('kpi_bajo_piso', { n: P }), '🔴 la tarjeta de debajo del piso dice el del servidor: «' + t('kpi_bajo_piso', { n: P }) + '»');
  const sinPiso = p309Pintar(p308Limpio(r), { period: 'dia' }, () => dashKpiCardBajoPiso('kss', undefined)).extra;
  PRUEBAS.cierto(sinPiso.indexOf(esc(t('kpi_bajo_piso', { n: P }))) >= 0, '🔴 sin piso en la llamada, `piso || hseqPiso()` usa el del servidor, no un 5');
  /* DISCRIMINADOR · con el mínimo viejo del cliente (5), la misma tarjeta dice 5 al lado de totales de P */
  const real = window.hseqPisoMinimo;
  let s;
  try { window.hseqPisoMinimo = () => P388_ANTES; s = p388Ver(r, { period: 'dia' }); }
  finally { window.hseqPisoMinimo = real; }
  PRUEBAS.igual(s.bajoPiso, t('kpi_bajo_piso', { n: P388_ANTES }), '⚠️ discriminador · con el mínimo en ' + P388_ANTES + ', la tarjeta lo fuerza');
});

PRUEBAS.caso('🔴 P388 · sin nómina, el cartel y el inicio lo dicen; con nómina y sin grupos, lo de siempre', () => {
  /* R19 · `hseqCausaVacio` con `sinNomina` del servidor (`totalesHseqDeEmpresa_`); lo pintan `hseqEstadoPintar` (cartel) y
     `renderHseqInicio` (aviso). R17: el payload es el del `.gs` real sobre un CH sin nómina. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  const sin = p388Nomina('ninguna'), pocos = p388Mundo(p388Tests(P388_GENTE.slice(0, P - 1), '2026-11-03', '08'));
  PRUEBAS.igual(sin.T.sinNomina, true, 'guarda: el servidor real mandó `sinNomina`');
  const v = p388Ver(sin.r);
  PRUEBAS.igual(v.cartel, t('hst_causa_sin_nomina_t'), '🔴 el cartel dice «' + t('hst_causa_sin_nomina_t') + '»');
  PRUEBAS.igual([v.causa, v.aviso, v.boton], ['sin_nomina', t('hst_causa_sin_nomina', { n: P }), null],
    '🔴 y el inicio dice por qué: HSEQ cuenta sólo a la gente de la nómina (sin botón: no hay otro período que mirar)');
  PRUEBAS.igual(v.semana, 'sin_nomina', 'la hoja de la semana dice la misma causa');
  /* CONTROL · con nómina y menos del piso medidos: la causa es otra y el cartel dice lo de siempre */
  const rp = pocos.sellarYPedir('2026-11-03T15:00:00-04:00');
  PRUEBAS.igual(rp.totalesHseq.sinNomina, undefined, 'guarda: con nómina no viaja la marca');
  const c = p388Ver(rp);
  PRUEBAS.igual([c.cartel, c.causa, c.aviso], [t('kpi_bajo_piso', { n: P }), 'sin_grupos', t('hst_causa_sin_grupos', { n: P })],
    'CONTROL · con nómina y sin ningún grupo: «Todavía no hay un grupo de ' + P + '», y que sólo cuenta la gente de la nómina');
  /* DISCRIMINADOR · una derivación que no mira `sinNomina` diría «todavía no hay un grupo» a una empresa que no puede formarlo */
  const s = p388ConCausa(real => (T, per) => real(Object.assign({}, T, { sinNomina: undefined }), per), () => p388Ver(sin.r));
  PRUEBAS.igual([s.cartel, s.causa], [t('kpi_bajo_piso', { n: P }), 'sin_grupos'], '⚠️ discriminador · sin mirar `sinNomina`, el cartel no dice la causa');
});

PRUEBAS.caso('🔴 P388 · nómina con filas y sin cédulas: dice «Nómina sin cédulas», no «sin nómina» al lado del número de la nómina', () => {
  /* R19 · `hseqCausaVacio` separa las dos formas de `sinNomina` con `nominaTotal`, el número de filas de la nómina que el
     servidor ya le manda a HSEQ (`nomTot` en `accionSupervisor`, que no mira la cédula). R21: el aviso no puede decir «no
     tiene nómina» al lado de «12 en la nómina» de la actividad (verificador de P388). R17: los dos payloads son del `.gs`
     real, con el CH sin cédulas y sin nómina. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  const sinCed = p388Nomina('sinCedula'), ninguna = p388Nomina('ninguna');
  PRUEBAS.igual([sinCed.T.sinNomina, (Number(sinCed.r.nominaTotal) || 0) > 0], [true, true],
    'guarda: con filas sin cédula, el servidor manda `sinNomina` y el número de filas de la nómina');
  const v = p388Ver(sinCed.r);
  PRUEBAS.igual(v.cartel, t('hst_causa_sin_cedulas_t'), '🔴 el cartel dice «' + t('hst_causa_sin_cedulas_t') + '»');
  PRUEBAS.igual([v.causa, v.aviso, v.semana], ['sin_cedulas', t('hst_causa_sin_cedulas', { n: P }), 'sin_cedulas'],
    '🔴 el inicio y la hoja de la semana dicen que faltan las cédulas, no la nómina');
  /* CONTROL · sin ninguna fila en la nómina, la causa sigue siendo «sin nómina» */
  PRUEBAS.igual(Number(ninguna.r.nominaTotal) || 0, 0, 'guarda: sin nómina, el número de filas es 0');
  const c = p388Ver(ninguna.r);
  PRUEBAS.igual([c.cartel, c.causa], [t('hst_causa_sin_nomina_t'), 'sin_nomina'],
    'CONTROL · sin filas en la nómina: «' + t('hst_causa_sin_nomina_t') + '»');
  /* DISCRIMINADOR · una derivación que no mira `nominaTotal` le diría «no tiene nómina» a una empresa con filas cargadas */
  const s = p388ConCausa(real => (T, per) => { const x = real(T, per); return x && x.c === 'sin_cedulas' ? { c: 'sin_nomina' } : x; },
    () => p388Ver(sinCed.r));
  PRUEBAS.igual([s.cartel, s.causa], [t('hst_causa_sin_nomina_t'), 'sin_nomina'],
    '⚠️ discriminador · sin mirar `nominaTotal`, diría «' + t('hst_causa_sin_nomina_t') + '»');
});

PRUEBAS.caso('🔴 P388 · semana sin grupos y mes con totales: lo dice, nombra el mes, y el botón lo abre', () => {
  /* R19 · `hseqCausaVacio` busca, entre los períodos MÁS largos que el elegido, el primero con algún total; el botón llama a
     `dashSetPeriod` con su clave. El escenario: la persona que completa el grupo de la semana se mide el fin de semana, y
     el lunes la semana abre vacía con el mes lleno. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  const w = p388Mundo(p388Tests(P388_GENTE.slice(0, P), '2026-11-01', '09'));      // el domingo 1/11; hoy es martes 3/11
  const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  const per = r.totalesHseq.periodos;
  PRUEBAS.cierto(!p388AlgunTotal({ x: per.semana.metricas }) && p388AlgunTotal({ x: per.mes.metricas }), 'guarda: la semana sin totales y el mes con');
  const v = p388Ver(r, null, () => { const b = document.querySelector('#dsec-inicio .hst-causa-ver'); if (b) b.click(); });
  PRUEBAS.igual(v.periodo, 'semana', 'guarda: el panel de HSEQ abre en la semana');
  PRUEBAS.igual(v.cartel, t('hst_causa_otro_t'), '🔴 el cartel dice «' + t('hst_causa_otro_t') + '»');
  PRUEBAS.igual([v.causa, v.aviso], ['otro_periodo', t('hst_causa_otro', { n: P, p: periodoLabel('mes') })], '🔴 y el inicio nombra el período que sí tiene totales');
  PRUEBAS.igual(v.boton, t('hst_causa_ver', { p: periodoLabel('mes') }), '🔴 con un botón para abrirlo');
  PRUEBAS.igual([v.despues.periodo, v.despues.causa], ['mes', null], '🔴 tocarlo abre el mes, y ahí ya no hay aviso');
  PRUEBAS.alMenos(v.despues.conNumero, 1, 'y las tarjetas del mes tienen número');
  PRUEBAS.igual([v.semana, v.semanaBoton], ['otro_periodo', false], 'la hoja de la semana dice la causa, sin el botón (la hoja tapa el panel)');
  /* CONTROL · en «Todo» hay totales: ni aviso ni causa en el cartel */
  const todo = p388Ver(r, { period: 'all' });
  PRUEBAS.igual([todo.causa, todo.cartel === t('hst_causa_otro_t')], [null, false], 'CONTROL · con totales en el período, ningún aviso');
  /* DISCRIMINADOR · una derivación que no mira los otros períodos diría «todavía no hay un grupo» */
  const s = p388ConCausa(real => (T, p) => { const c = real(T, p); return c && c.c === 'otro_periodo' ? { c: 'sin_grupos' } : c; }, () => p388Ver(r));
  PRUEBAS.igual([s.causa, s.boton], ['sin_grupos', null], '⚠️ discriminador · sin mirar los otros períodos, no nombra el mes ni ofrece abrirlo');
});

PRUEBAS.caso('🔴 P388 · con el cierre detenido o el reloj sin correr, el panel vacío no afirma que nadie completó un grupo', () => {
  /* R19 · `hseqCausaVacio` no da causa con `detenido` o sin `hseqRelojAlDia`, la MISMA regla que la línea del corte
     (`hseqTotalesMarco`): ahí puede haber grupos completos que todavía no se cerraron, y «nadie completó un grupo» sería
     una afirmación que nadie midió. Lo dicen el aviso de «detenido» y la línea del corte. «Sin nómina», sí: es cierto con
     o sin reloj. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  const r = p388Mundo(p388Tests(P388_GENTE.slice(0, P), '2026-11-01', '09')).sellarYPedir('2026-11-03T15:00:00-04:00');
  const hace3h = new Date(Date.now() - 3 * 3600e3).toISOString();
  PRUEBAS.igual(p388Ver(r).causa, 'otro_periodo', 'CONTROL · con el reloj al día, la semana vacía tiene su causa');
  const parado = p388Ver(r, null, null, hace3h), nunca = p388Ver(r, null, null, null);
  const avisoParado = t('hst_reloj_parado', { d: '§', h: '§' }).split('§')[0];
  PRUEBAS.igual([parado.causa, parado.cartel, parado.corte.indexOf(avisoParado) >= 0], [null, t('hse_sin_estado'), true],
    '🔴 con el reloj parado hace tres horas, ningún «nadie completó»: el cartel dice «' + t('hse_sin_estado') + '» y el corte, que no se actualiza · «' + parado.corte + '»');
  PRUEBAS.igual([nunca.causa, nunca.corte.indexOf(t('hst_sin_corrida')) >= 0], [null, true], '🔴 sin ninguna corrida, tampoco; el corte dice que no se calcularon');
  const conDet = JSON.parse(JSON.stringify(r));
  conDet.totalesHseq.detenido = { causa: 'hoja_tocada', desde: new Date(Date.now() - 2 * 3600e3).toISOString() };
  const det = p388Ver(conDet);
  PRUEBAS.igual([det.causa, det.detenido], [null, true], '🔴 con el cierre detenido, sin causa propia: lo dice el aviso de «detenido»');
  const sinNom = p388Ver(p388Nomina('ninguna').r, null, null, hace3h);
  PRUEBAS.igual(sinNom.causa, 'sin_nomina', '🔴 «sin nómina» se dice igual con el reloj parado: es cierto con o sin reloj');
  /* DISCRIMINADOR · si la causa no mirara el reloj, con el reloj parado afirmaría que nadie completó un grupo */
  const real = window.hseqRelojAlDia;
  let s;
  try { window.hseqRelojAlDia = () => true; s = p388Ver(r, null, null, hace3h); }
  finally { window.hseqRelojAlDia = real; }
  PRUEBAS.igual(s.causa, 'otro_periodo', '⚠️ discriminador · sin mirar el reloj, el aviso afirma «nadie completó un grupo» con el reloj parado');
});

PRUEBAS.caso('🔴 P388 · una semana que corta el mes: con el mes vacío, se nombra un período MÁS largo, no la semana', () => {
  /* R19 · `hseqCausaVacio` mira sólo los períodos después del elegido en el orden del calendario (hoy, semana, mes, trimestre,
     semestre, año, todo): una semana que corta el mes puede tener grupos que el mes no, y mandarlo «a la semana» desde el
     mes le pediría ir hacia atrás. Hoy es domingo 1/11: la semana es del 26/10 al 1/11. */
  if (p388SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  if (p388SinP309()) return;
  const P = p388Num('PISO_MIN_HSEQ');
  const w = p388Mundo(p388Tests(P388_GENTE.slice(0, P), '2026-10-27', '09'), { ahora: '2026-11-01T15:00:00-04:00' });
  const r = w.sellarYPedir('2026-11-01T15:00:00-04:00');
  const per = r.totalesHseq.periodos;
  PRUEBAS.cierto(p388AlgunTotal({ x: per.semana.metricas }) && !p388AlgunTotal({ x: per.mes.metricas }) && p388AlgunTotal({ x: per.trimestre.metricas }),
    'guarda: la semana con totales, noviembre sin, el trimestre con');
  const v = p388Ver(r, { period: 'mes' });
  PRUEBAS.igual([v.causa, v.boton], ['otro_periodo', t('hst_causa_ver', { p: periodoLabel('trimestre') })], '🔴 desde el mes vacío, nombra el trimestre');
  PRUEBAS.igual(p388Ver(r, { period: 'semana' }).causa, null, 'CONTROL · la semana, que sí tiene totales, no lleva aviso');
  /* DISCRIMINADOR · buscando en TODOS los períodos, el primero con totales sería la semana */
  const s = p388ConCausa(real => (T, p) => {
    const c = real(T, p);
    if (!c || c.c !== 'otro_periodo') return c;
    const otro = ['hoy', 'semana', 'mes', 'trimestre', 'semestre', 'anio', 'todo'].find(x => x !== p && real(T, x) === null);
    return { c: 'otro_periodo', f: ({ todo: 'all' })[otro] || otro };
  }, () => p388Ver(r, { period: 'mes' }));
  PRUEBAS.igual(s.boton, t('hst_causa_ver', { p: periodoLabel('semana') }), '⚠️ discriminador · buscando en todos, mandaría «a la semana»');
});

/* ══ 8 · Los textos ════════════════════════════════════════════════════════════════════════════ */
const P388_CLAVES = ['hst_causa_sin_nomina_t', 'hst_causa_sin_nomina', 'hst_causa_sin_cedulas_t', 'hst_causa_sin_cedulas',
                     'hst_causa_otro_t', 'hst_causa_otro', 'hst_causa_ver', 'hst_causa_sin_grupos'];
/* las promesas de la lámina y de los paneles que nombran el piso con un número fijo (no tienen `{n}`: se leen sin variables) */
const P388_PROMESAS = ['priv_hseq_1', 'car4_hseq_d', 'doc_2_f9h', 'rol_of_guia_hseq', 'pg_hint_hseq', 'pg_desc_hseq'];
/* las que lo dicen con `{n}` (el piso que manda el servidor) */
const P388_CON_N = ['hlp_idc_hseq', 'mov_ayuda_fuente_hseq', 'kpi_bajo_piso', 'kpi_bajo_piso_d', 'hst_sub', 'hsi_sem_sub', 'hsi_guia',
                    'hst_causa_sin_nomina', 'hst_causa_sin_cedulas', 'hst_causa_otro', 'hst_causa_sin_grupos'];
const P388_VOSEO = /(^|[^a-záéíóúüñ])(vos|sos|podés|tenés|querés|sabés|necesitás|debés|hacés|escribí|volvé|entrá|elegí|tocá|mirá|probá|revisá|fijate|acordate|andá|salí|pedí|vení|empezá|esperá|cargá|abrí)(?![a-záéíóúüñ])/i;
const P388_SECTOR = /aeropuerto|piloto|vuelo|tripulaci[oó]n|airport|pilot|flight|crew/i;
/* los números del piso en un texto: «N o más», «N personas o más», «menos de N», «N or more», «fewer than N» */
function p388Numeros(s) {
  const out = [], re = /(\d+) (?:personas |people |measured people )?(?:o m[aá]s|or more)|(?:menos de|fewer than) (\d+)/gi;
  let m;
  while ((m = re.exec(String(s || '')))) out.push(Number(m[1] || m[2]));
  return out;
}
function p388Parrafo(html) {
  const i = String(html).search(/<strong>(Seguridad|Safety) \(HSEQ\)\.<\/strong>/);
  if (i < 0) return '';
  const fin = String(html).indexOf('</p>', i);
  return String(html).slice(i, fin < 0 ? undefined : fin);
}

PRUEBAS.caso('🔴 P388 · las promesas dicen el piso del lector del `.gs`, y los textos con `{n}` no fijan ningún número', () => {
  /* R19 · el piso más bajo que puede tener un total publicado lo fija `PISO_LECTOR_HSEQ` (`unidadesSelladasHseq_` rechaza
     una fila con menos): «3 o más» es cierto aunque una empresa suba su piso con `anonN`, y aunque se vuelva a sellar con 5
     (las filas de 3 se siguen leyendo). Decisión de Franco del 2026-11-04: el texto cambia sin subir la versión del
     consentimiento. */
  if (!CTX.hayGs || typeof _i18nBuscar !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const N = p388Num('PISO_LECTOR_HSEQ');
  const texto = (k, l) => String(_i18nBuscar(l, '', k) || '');
  const malas = [];
  ['es', 'en'].forEach(l => {
    P388_PROMESAS.forEach(k => { const ns = p388Numeros(texto(k, l)); if (!ns.length || ns.some(x => x !== N)) malas.push(k + ' (' + l + '): ' + JSON.stringify(ns)); });
    const par = p388Parrafo(texto('consent_roles_html', l)), ns = p388Numeros(par);
    if (par.length < 40 || !ns.length || ns.some(x => x !== N)) malas.push('consent_roles_html HSEQ (' + l + '): ' + JSON.stringify(ns));
  });
  PRUEBAS.igual(malas, [], '🔴 cada promesa, en los dos idiomas, dice «' + N + ' o más» (el `PISO_LECTOR_HSEQ` del `.gs`) y ningún otro número');
  const conN = [];
  ['es', 'en'].forEach(l => P388_CON_N.forEach(k => { const s = texto(k, l); if (s.indexOf('{n}') < 0 || p388Numeros(s).length) conN.push(k + ' (' + l + ')'); }));
  PRUEBAS.igual(conN, [], '🔴 la ayuda de los indicadores, la de la actividad, las tarjetas y los avisos dicen el piso con `{n}`, sin un número fijo');
  PRUEBAS.cierto(t('mov_ayuda_fuente_hseq', { s: 'x', n: N }).indexOf(N + ' ') >= 0 && t('hlp_idc_hseq', { n: N }).indexOf(N + ' ') >= 0,
    'y al pintarlas con el piso, lo dicen');
  /* DISCRIMINADOR · el texto de la 7.62, que decía 5: el detector lo ve */
  const viejo = 'De tus tests, <b>sólo totales de 5 o más personas medidas</b>: cómo está la organización en cada indicador. Nunca tu resultado, ni con un seudónimo; con menos de 5 personas, nada, ni el color.';
  PRUEBAS.cierto(p388Numeros(viejo).length === 2 && p388Numeros(viejo).every(x => x !== N), '⚠️ discriminador · el `priv_hseq_1` de la 7.62 («5 o más») no pasaría');
});

PRUEBAS.caso('R1 · R14 · los textos de la causa están en los dos idiomas, distintos, en español neutro y sin términos de sector', () => {
  if (typeof t !== 'function' || typeof fijarIdioma !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  const prev = idiomaActual(), es = {}, en = {};
  try {
    fijarIdioma('es'); P388_CLAVES.forEach(k => { es[k] = t(k); });
    fijarIdioma('en'); P388_CLAVES.forEach(k => { en[k] = t(k); });
  } finally { fijarIdioma(prev); }
  P388_CLAVES.forEach(k => {
    PRUEBAS.cierto(!!es[k] && es[k] !== k, k + ' · existe en español · «' + es[k] + '»');
    PRUEBAS.cierto(!!en[k] && en[k] !== k, k + ' · existe en inglés · «' + en[k] + '»');
    PRUEBAS.cierto(es[k] !== en[k], k + ' · y son dos textos, no el español repetido');
    PRUEBAS.falso(P388_VOSEO.test(es[k]), k + ' · en español neutro: los clientes son de Venezuela (R1)');
    PRUEBAS.falso(P388_SECTOR.test(es[k] + ' ' + en[k]), k + ' · sin términos de sector (R14)');
    PRUEBAS.igual((en[k].match(/\{[a-z]\}/g) || []).sort(), (es[k].match(/\{[a-z]\}/g) || []).sort(), k + ' · las mismas variables en los dos idiomas');
  });
  /* DISCRIMINADOR · el detector ve el voseo puesto en el mismo texto, y no confunde el tuteo neutro */
  ['Mirá «Mes»', 'Cargá la nómina', 'Si tenés dudas'].forEach(v =>
    PRUEBAS.cierto(P388_VOSEO.test(es.hst_causa_otro + ' ' + v), 'DISCRIMINADOR · el detector ve «' + v + '»'));
  PRUEBAS.falso(P388_VOSEO.test('Mira «Mes»; carga la nómina si tienes dudas.'), 'DISCRIMINADOR · y no confunde «mira», «carga» ni «tienes»');
});

PRUEBAS.caso('P388 · el HTML de respaldo de «Quién ve qué» y de la lámina dice lo mismo que el diccionario', () => {
  /* El respaldo sólo se ve si el diccionario no llegara (lo reemplaza `i18nBarrer`), pero era un texto anterior a P308: si
     un día se viera, prometería otra cosa. Se lee el `index.html` servido, no el DOM ya traducido. */
  if (typeof _i18nBuscar !== 'function' || typeof fetch !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  return fetch('/index.html?p388=' + Date.now()).then(r => r.text()).then(html => {
    const de = (atr, k, cierre) => { const m = new RegExp(atr + '="' + k + '">([\\s\\S]*?)' + cierre).exec(html); return m ? m[1] : null; };
    const priv1 = de('data-i18n-html', 'priv_hseq_1', '</li>'), priv2 = de('data-i18n-html', 'priv_hseq_2', '</li>'), car4 = de('data-i18n', 'car4_hseq_d', '</span>');
    PRUEBAS.cierto(priv1 !== null && priv2 !== null && car4 !== null, 'guarda: se encontraron los tres respaldos en el HTML servido');
    PRUEBAS.igual([priv1, priv2, car4], [_i18nBuscar('es', '', 'priv_hseq_1'), _i18nBuscar('es', '', 'priv_hseq_2'), _i18nBuscar('es', '', 'car4_hseq_d')],
      '🔴 el respaldo es el texto del diccionario en español');
    PRUEBAS.cierto(p388Numeros(priv1).every(x => x === p388Num('PISO_LECTOR_HSEQ')) && p388Numeros(priv1).length > 0, 'y nombra el piso del lector');
    /* DISCRIMINADOR · el respaldo de la 7.62 (anterior a P308) no habría pasado: la comparación puede fallar */
    PRUEBAS.cierto('Lo mismo que Dirección: cada persona aparece como P1, P2, P3…, <b>sin nombre</b>.' !== _i18nBuscar('es', '', 'priv_hseq_1'),
      '⚠️ discriminador · el respaldo viejo de «Quién ve qué» es distinto del diccionario');
  });
});
