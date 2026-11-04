/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P310 · EL ESTADO GLOBAL DE HSEQ (servidor)                                          (2026-11-01)
   Decisiones de Franco: cuatro etapas (2026-10-13), el 25 % con «al menos dos» (2026-10-13), sólo
   totales de 5 o más (2026-10-14), «Por persona, en grupos» (2026-11-01), y tras dos vueltas del
   verificador (2026-11-02) «cada test por su valor», «una vez por tanda» y el umbral de 20 a 100: los
   grupos «estado» son las unidades de las métricas que se sellaron juntas (misma corrida, mismo día),
   todos sus tests tienen color —por su propio valor—, cada persona cuenta una vez por grupo con su
   peor test, y los colores se SUMAN entre grupos (ADR 018).
   R17: todo entra por el sellado real (`sellarTotalesHseq_`) y por `accionSupervisor` con la clave del
   panel de HSEQ, sobre el mundo de prueba de P308 (usa sus ayudantes: este archivo va después).
   R19: la etapa la decide `estadoPeriodoHseq_`; el color de cada test, `coloresTestsHseq_` (con
   `colorValorHseq_` y `nivelRiesgoDeServer`); el grupo lo arma `gruposEstadoHseq_` y lo lee
   `unidadesSelladasHseq_`; la firma de cada fila, `hashFilaHseq_`; el umbral, `umbralEstadoHseq_`.
   Cada regla tiene su sabotaje sobre el `.gs` real, que la pone en rojo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('P310 · el estado global de HSEQ (servidor)');

function p310T(p, d, h, v, m) { return p308Test({ p: p, d: d, h: h, v: v, m: m }); }
/* El mundo de P308 sobre el `.gs` real o sobre una copia saboteada: `p308Mundo` parcha sobre `CTX.gs`, que se
   devuelve en el `finally` (el mundo ya cargó su copia y la recarga de ahí). */
function p310Mundo(tests, opc, sab) {
  if (!sab) return p308Mundo(tests, opc);
  const real = CTX.gs, s = p308Parchar(real, sab);
  if (s.faltan.length) return { faltan: s.faltan };
  try { CTX.gs = s.gs; return p308Mundo(tests, opc); } finally { CTX.gs = real; }
}
/* Funciones sueltas del `.gs` real (o de una copia saboteada), sin mundo. */
function p310Api(sab, nombres) {
  const s = sab ? p308Parchar(CTX.gs, sab) : { gs: CTX.gs, faltan: [] };
  if (s.faltan.length) return { faltan: s.faltan };
  return GS.cargarGs(s.gs, GS.crearEntorno(p308Hojas([])), nombres);
}
/* Un grupo «estado» sintético, con una huella distinta por persona con color. */
function p310U(v, a, r, pref) {
  return { verdes: v, amarillos: a, rojos: r, ids: Array.from({ length: v + a + r }, (_, i) => (pref || 'p') + i) };
}
const P310_VERDES = ['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes', 'Nora Nueva'];
const P310_REGLA = '(am >= 2 && 100 * am > U * medidos)';

PRUEBAS.caso('🔴 P310 · las cuatro etapas, con el borde exacto del umbral y «al menos dos»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · la etapa la decide `estadoPeriodoHseq_`; el umbral, `umbralEstadoHseq_` */
  const api = p310Api(null, ['estadoPeriodoHseq_', 'umbralEstadoHseq_']);
  PRUEBAS.cierto(!api.faltan && typeof api.estadoPeriodoHseq_ === 'function', 'guarda: las funciones del .gs real');
  if (api.faltan) return;
  const et = (A, us, piso, U) => A.estadoPeriodoHseq_(us, piso == null ? 5 : piso, U);
  PRUEBAS.igual(et(api, [p310U(15, 5, 0)]).etapa, 'atencion', '🔴 5 de 20 en amarillo: «SEGURO · requiere atención» (justo en el umbral, sigue)');
  PRUEBAS.igual(et(api, [p310U(14, 6, 0)]).etapa, 'levemente', '🔴 6 de 20: «LEVEMENTE SEGURO»');
  PRUEBAS.igual(et(api, [p310U(6, 2, 0)]).etapa, 'atencion', '🔴 2 de 8: sigue');
  PRUEBAS.igual(et(api, [p310U(3, 1, 0)], 1).etapa, 'atencion', '🔴 1 de 4 (sin piso): sigue');
  PRUEBAS.igual(et(api, [p310U(2, 1, 0)], 1).etapa, 'atencion', '🔴 1 de 3 (sin piso): una sola persona no alcanza');
  PRUEBAS.igual(et(api, [p310U(15, 5, 0)], 5, 20).etapa, 'levemente', '🔴 con el umbral en 20 %, 5 de 20 pasa (con 25 % no)');
  PRUEBAS.igual(et(api, [p310U(15, 5, 0)], 5, 10).etapa, 'atencion', '🔴 un umbral de 10 % no vale (mínimo 20): rige el 25 y 5 de 20 sigue');
  const poco = et(api, [p310U(19, 0, 1)]);
  PRUEBAS.igual([poco.etapa, 'rojos' in poco, poco.personas], ['poco', false, 20], '🔴 uno en rojo basta: «POCO SEGURO», con la cobertura y SIN cuántos en rojo');
  const seg = et(api, [p310U(20, 0, 0)]);
  PRUEBAS.igual([seg.etapa, 'rojos' in seg], ['seguro', false], '🔴 todos en verde: «SEGURO», sin rojos');
  const vacio = et(api, []), pocos = et(api, [p310U(2, 1, 1)]);
  PRUEBAS.igual(vacio, { etapa: null, causa: 'bajo_piso' }, '🔴 sin grupos: nada, sólo la causa');
  PRUEBAS.igual(pocos, { etapa: null, causa: 'bajo_piso' }, '🔴 con menos de 5 personas con color: ni la etapa ni cuántos en rojo, aunque haya uno');
  const dos = et(api, [p310U(5, 0, 0, 'a'), p310U(4, 1, 0, 'a')]);
  PRUEBAS.igual([dos.etapa, dos.personas], ['atencion', 5], 'la misma gente en dos grupos: los colores se suman (1 de 10) y la cobertura cuenta personas distintas (5)');
  PRUEBAS.igual(['', '0', 'abc', '101', null, '10', '19', '20', ' 30 ', 25.4].map(x => api.umbralEstadoHseq_(x)), [25, 25, 25, 25, 25, 25, 25, 20, 30, 25],
    '🔴 el umbral: entero de 20 a 100 (decisión de Franco, 2026-11-02); si no, el 25');
  /* Discriminadores: con `≥` en vez de `>`, 5 de 20 y 2 de 8 pasan; sin «al menos dos», 1 de 3 y 1 de 5 (al 10 %) pasan */
  const mayIg = p310Api([[P310_REGLA, '(am >= 2 && 100 * am >= U * medidos)']], ['estadoPeriodoHseq_']);
  const sinDos = p310Api([[P310_REGLA, '(100 * am > U * medidos)']], ['estadoPeriodoHseq_']);
  PRUEBAS.igual(mayIg.faltan || [], [], 'guarda: el sabotaje «≥» se aplicó');
  PRUEBAS.igual(sinDos.faltan || [], [], 'guarda: el sabotaje «sin al menos dos» se aplicó');
  if (mayIg.faltan || sinDos.faltan) return;
  PRUEBAS.igual([et(mayIg, [p310U(15, 5, 0)]).etapa, et(mayIg, [p310U(6, 2, 0)]).etapa], ['levemente', 'levemente'],
    '⚠️ discriminador · con «≥», 5 de 20 y 2 de 8 cambian de etapa');
  PRUEBAS.igual(et(sinDos, [p310U(2, 1, 0)], 1).etapa, 'levemente', '⚠️ discriminador · sin «al menos dos», una sola persona cambia de etapa');
});

PRUEBAS.caso('🔴 P310 · el estado del panel sale de grupos «estado» sellados: cada test por su valor, con la tolerancia de su persona', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · lo manda `accionSupervisor` con el panel de HSEQ (`esPanelHseq_`), lo arma `totalesHseq_` con
     `estadoPeriodoHseq_` sobre lo que leyó `unidadesSelladasHseq_`; el color, `coloresTestsHseq_` */
  const hoy = r => r.totalesHseq && r.totalesHseq.periodos && r.totalesHseq.periodos.hoy && r.totalesHseq.periodos.hoy.estado;
  const verdes = P310_VERDES.map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3));
  const e1 = hoy(p308Pedir(verdes));
  PRUEBAS.igual(e1, { etapa: 'seguro', personas: 5 }, '🔴 cinco en verde hoy: «SEGURO», 5 personas, nada más');
  /* Oscar: 8 ayer y 8 hoy, los dos sobre el corte (6): rojo. Con un solo 8, amarillo (`casoNivelMetrica`). */
  const conRojo = () => [p310T('Oscar Uno', '2026-11-02', '08:00', 8)].concat(['Oscar Uno'].concat(P310_VERDES.slice(0, 4))
    .map((p, i) => p310T(p, '2026-11-03', '08:0' + i, p === 'Oscar Uno' ? 8 : 3)));
  const e2 = hoy(p308Pedir(conRojo()));
  PRUEBAS.igual([e2 && e2.etapa, !!e2 && 'rojos' in e2], ['poco', false], '🔴 sobre el corte: «POCO SEGURO», sin cuántos');
  const unSolo = ['Oscar Uno'].concat(P310_VERDES.slice(0, 4)).map((p, i) => p310T(p, '2026-11-03', '08:0' + i, p === 'Oscar Uno' ? 8 : 3));
  PRUEBAS.igual((hoy(p308Pedir(unSolo)) || {}).etapa, 'poco', '🔴 un 8 suelto ya es rojo en el estado (cada test por su valor; el semáforo del supervisor espera dos seguidos)');
  /* La tolerancia de SU nivel: 6 dos veces es rojo con nivel 5 (corte 0,85 × 6 = 5,1) y amarillo con el 3 (corte 6, y el
     amarillo desde 5,1). El KSS es entero: un 5,5 llega como 5. */
  const cincoCinco = () => [p310T('Oscar Uno', '2026-11-02', '08:00', 6)].concat(['Oscar Uno'].concat(P310_VERDES.slice(0, 4))
    .map((p, i) => p310T(p, '2026-11-03', '08:0' + i, p === 'Oscar Uno' ? 6 : 3)));
  const conNivel = (sab) => {
    const w = p310Mundo(cincoCinco(), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.hoja('Niveles Riesgo').appendRow(['Helitec', '', '', 'Oscar Uno', '5']);
    return hoy(w.sellarYPedir()) || {};
  };
  PRUEBAS.igual((hoy(p308Pedir(cincoCinco())) || {}).etapa, 'atencion', 'con el nivel 3 (sin regla), 6 dos veces es amarillo');
  PRUEBAS.igual(conNivel().etapa, 'poco', '🔴 con el nivel 5 de su persona, el mismo 6 dos veces es rojo');
  /* Discriminadores: sin el nivel de la persona, y con el rojo del semáforo (un valor suelto nunca es rojo) */
  const sinNivel = conNivel([['margenDe(nivelRiesgoDeServer(filasNivel || [], r0.persona, r0.departamento, r0.empresa, r0.cargo))', 'margenDe(3)']]);
  PRUEBAS.igual(sinNivel.faltan || sinNivel.etapa, 'atencion', '⚠️ discriminador · sin la tolerancia de su nivel, deja de ser rojo');
  const wSemaforo = p310Mundo(unSolo, {}, [['        col[m] = colorValorHseq_(Number(r[m]), REFERENCIA[m], mrg);', '        col[m] = Math.min(1, colorValorHseq_(Number(r[m]), REFERENCIA[m], mrg));']]);
  PRUEBAS.igual(wSemaforo.faltan || (hoy(wSemaforo.sellarYPedir()) || {}).etapa, 'atencion', '⚠️ discriminador · si un valor suelto no puede ser rojo, el 8 de Oscar queda en amarillo');
  /* Dirección no recibe el estado: los totales son sólo del panel de HSEQ (`esPanelHseq_`) */
  const wd = p308Mundo(verdes);
  wd.sellarYPedir();
  PRUEBAS.cierto(!wd.pedir({}, 'dir-308').totalesHseq, '🔴 Dirección no recibe ni el estado ni los totales');
});

PRUEBAS.caso('🔴 P310 · un test nuevo no mueve el estado: avanza de a un grupo entero de 5', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · los grupos los forma `formarUnidadesHseq_` con el piso, y el panel lee sólo lo sellado */
  const correr = (sab) => {
    const w = p310Mundo(P310_VERDES.map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    const est = r => ((((r.totalesHseq || {}).periodos || {}).hoy || {}).estado || {});
    const a = est(w.sellarYPedir('2026-11-03T15:00:00-04:00'));
    w.agregar(p310T('Oscar Uno', '2026-11-03', '15:05', 8));
    const b = est(w.sellarYPedir('2026-11-03T15:30:00-04:00'));
    ['Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco'].forEach((p, i) => w.agregar(p310T(p, '2026-11-03', '15:4' + i, 3)));
    const c = est(w.sellarYPedir('2026-11-03T16:10:00-04:00'));
    return { a: a, b: b, c: c };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.a.etapa, m.a.personas], ['seguro', 5], 'antes: el primer grupo, todo verde');
  PRUEBAS.igual([m.b.etapa, m.b.personas], ['seguro', 5], '🔴 con un solo test nuevo en amarillo, el estado no se mueve: ese test espera su grupo');
  PRUEBAS.igual([m.c.etapa, m.c.personas], ['poco', 10], '🔴 cuando se completa el grupo de 5, entra entero (el 8 de Oscar ya es rojo), 10 personas');
  /* Discriminador: sin piso en NINGUNA capa —unidades de una persona, grupos «estado» de una persona con color y sin las
     guardas del lector que rechazan filas por debajo de su piso— el test nuevo mueve el estado solo */
  const s = correr([['        formarUnidadesHseq_(tests, piso, claveDe).unidades.forEach(function (un) {',
                     '        formarUnidadesHseq_(tests, 1, claveDe).unidades.forEach(function (un) {'],
                    ['    if (info && (pisoF < PISO_MIN_HSEQ || pers < pisoF || (Number(v[i][5]) || 0) < pers)) info.invalida = true;',
                     '    if (false) info.invalida = true;'],
                    ['      if (info && (ve + am + ro < pisoF || ve + am + ro < pers || ids.length !== pers)) info.invalida = true;',
                     '      if (false) info.invalida = true;'],
                    ['        if (!(e.piso >= PISO_MIN_HSEQ) || e.personas < e.piso || coloreados < e.personas) { estadoNoEscritos++; return; }', '        void coloreados;']]);
  PRUEBAS.igual(s.faltan || s.b.etapa, 'poco', '⚠️ discriminador · sin el piso en ninguna capa, un solo test (el 8 de Oscar) cambia el estado');
});

PRUEBAS.caso('🔴 P310 · las filas que ya sellaba P308 no cambian de firma, y la hoja de 14 columnas se migra sin detener a nadie', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · la firma de una fila la calcula `hashFilaHseq_` (la usan `firmasHseq_` y `unidadesSelladasHseq_`); la
     forma de P308 era el hash de las 14 celdas unidas por U+0001 (`hashHseq_`, `celdaHseq_`) */
  const api = p310Api(null, ['hashFilaHseq_', 'hashHseq_', 'celdaHseq_', 'xorHseq_']);
  if (api.faltan) { PRUEBAS.igual(api.faltan, [], 'guarda'); return; }
  const fila = ['helitec', 'Helitec', 'kss', '3', '2026-11-03', 5, 15, 0, 5, 5, 5, '2026-11-03T12:04:00.000Z', '2026-11-03T19:00:00.000Z', 'aaaa,bbbb'];
  const vieja = api.hashHseq_(fila.map(c => api.celdaHseq_(c)).join('\u0001'));
  PRUEBAS.igual(api.hashFilaHseq_(fila.concat(['', '', '', ''])), vieja, '🔴 una fila de P308 (columnas nuevas vacías) firma igual que antes');
  PRUEBAS.igual(api.hashFilaHseq_(fila), vieja, 'y con sólo 14 celdas también');
  PRUEBAS.cierto(api.hashFilaHseq_(fila.concat([5, 0, 0, 'x'])) !== vieja, 'una fila «estado» firma también sus columnas nuevas');
  /* De punta a punta: una hoja como la dejó P308 (14 columnas, sólo métricas, firmas confirmadas con la fórmula vieja,
     sin tope de «estado») y el sellado de P310 encima. */
  const migrar = (sab) => {
    const w = p310Mundo(P310_VERDES.concat(['Oscar Uno']).map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-03T15:00:00-04:00');
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    const viejas = v.slice(1).filter(f => String(f[2]) !== 'estado').map(f => f.slice(0, 14));
    while (h.getLastRow() > 0) h.deleteRow(h.getLastRow());
    h.appendRow(v[0].slice(0, 14));
    viejas.forEach(f => h.appendRow(f));
    const firmas = {};
    viejas.forEach(f => {
      const k = String(f[0]).trim().toLowerCase(), o = firmas[k] || (firmas[k] = { n: 0, d: '0000000000000000' });
      o.n++; o.d = api.xorHseq_(o.d, api.hashHseq_(f.map(c => api.celdaHseq_(c)).join('\u0001')));
    });
    w.props().setProperty('hseq_firmas', JSON.stringify(firmas));
    w.props().deleteProperty('hseq_tope_estado');
    const r = w.sellarYPedir('2026-11-03T15:20:00-04:00');
    return { r: r, titulos: w.hoja('Totales HSEQ').getRange(1, 15, 1, 4).getValues()[0] };
  };
  const m = migrar();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual(m.r.__sellado.trabadas, [], '🔴 ninguna cuenta queda detenida por «hoja tocada» al agregar las columnas');
  PRUEBAS.cierto(m.r.__sellado.nuevasEstado >= 1 && m.r.__sellado.nuevas === 0, '🔴 se sellan los grupos «estado» de lo ya medido, y ninguno de las métricas se re-sella · ' + JSON.stringify([m.r.__sellado.nuevas, m.r.__sellado.nuevasEstado]));
  PRUEBAS.igual((m.r.totalesHseq.periodos.hoy.estado || {}).etapa, 'seguro', 'y el panel ya tiene el estado');
  PRUEBAS.igual(m.titulos, ['Verdes', 'Amarillos', 'Rojos', 'Personas id'], 'las columnas nuevas llevan su título');
  const s = migrar([['  return hashHseq_(extra.join("").trim() ? s + "\\u0002" + extra.join("\\u0001") : s);', '  return hashHseq_(s + "\\u0002" + extra.join("\\u0001"));']]);
  PRUEBAS.igual(s.faltan || [], [], 'guarda: el sabotaje del hash se aplicó');
  if (!s.faltan) PRUEBAS.alMenos((s.r.__sellado.trabadas || []).length, 1, '⚠️ discriminador · si las columnas vacías entran al hash, todas las cuentas se detienen al migrar');
});

PRUEBAS.caso('🔴 P310 · una fila «estado» editada a mano detiene la cuenta, aunque los números cuadren', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · lo detiene la firma por cuenta (`firmasHseq_` al sellar, `totalesHseqDeEmpresa_` al leer), que cubre las
     columnas nuevas con `hashFilaHseq_`. «Verdes 5 → 4, Rojos 0 → 1» deja la suma y las huellas como estaban: sólo la
     firma la ve. */
  const correr = (sab) => {
    const w = p310Mundo(P310_VERDES.map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-03T15:00:00-04:00');
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) if (String(v[i][2]) === 'estado') { h.getRange(i + 1, 15).setValue(4); h.getRange(i + 1, 17).setValue(1); break; }
    return w.pedir();
  };
  const r = correr();
  PRUEBAS.igual(r.faltan || [], [], 'guarda');
  if (r.faltan) return;
  PRUEBAS.igual([r.totalesHseq.causa, !!r.totalesHseq.periodos], ['hoja', false], '🔴 el panel no muestra NINGÚN total ni estado: dice que hay que revisar la hoja');
  const s = correr([['  return hashHseq_(extra.join("").trim() ? s + "\\u0002" + extra.join("\\u0001") : s);', '  return hashHseq_(s);']]);
  PRUEBAS.igual(s.faltan || ((s.totalesHseq.periodos || {}).hoy || {}).estado.etapa, 'poco', '⚠️ discriminador · si la firma no mira las columnas nuevas, el rojo inventado se publica');
});

PRUEBAS.caso('🔴 P310 · el umbral es por empresa (`umbralEstado`, de 20 a 100), y viaja para que la guía diga el que rige', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · lo lee `accionSupervisor` de `cfgEmpresa` (clave canónica por `MANT_CONFIG_OK`) y lo aplica `estadoPeriodoHseq_`.
     Dos tandas de 10 (lunes y martes), 2 y 3 en amarillo (KSS 6): la semana tiene 5 de 20. */
  const diez = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis', 'Alma Única', 'Lara Legal', 'Leo Legal', 'Mario Mes'];
  const tanda = (d, amarillos) => diez.map((p, i) => p310T(p, d, '08:' + String(10 + i), i < amarillos ? 6 : 3));
  const correr = (umbral, sab) => {
    const w = p310Mundo(tanda('2026-11-02', 2).concat(tanda('2026-11-03', 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    if (umbral != null) w.hoja('Config Empresa').appendRow(['Helitec', 'umbralEstado', umbral]);
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
    return { etapa: ((r.totalesHseq.periodos.semana || {}).estado || {}).etapa, umbral: r.totalesHseq.umbralEstado };
  };
  PRUEBAS.igual(correr(null), { etapa: 'atencion', umbral: 25 }, 'por defecto, 25 %: 5 de 20 en amarillo sigue en «requiere atención»');
  PRUEBAS.igual(correr('20'), { etapa: 'levemente', umbral: 20 }, '🔴 con «umbralEstado = 20» en Config Empresa, 5 de 20 pasa a «LEVEMENTE SEGURO»');
  PRUEBAS.igual(correr('15'), { etapa: 'atencion', umbral: 25 }, '🔴 un umbral menor a 20 no vale: rige el 25');
  /* P387 · el ancla es la línea del camino sellado: desde P387 la sentencia tiene también el de la cuenta Empresa Demo
     (`totalesHseqDemo_`), con los mismos dos argumentos. */
  const s = correr('20', [['    : totalesHseqDeEmpresa_(gestScope(acc, p.empresa), cfgEmpresa.anonN, cfgEmpresa.umbralEstado);',
                           '    : totalesHseqDeEmpresa_(gestScope(acc, p.empresa), cfgEmpresa.anonN);']]);
  PRUEBAS.igual(s.faltan || s.etapa, 'atencion', '⚠️ discriminador · si el panel no pasa el umbral de la empresa, rige el 25');
});

PRUEBAS.caso('P310 · la demostración trae el estado con la misma función, y sus registros no llevan campos internos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · lo arma `totalesHseqDemo_` → `unidadesDemoHseq_` (grupos por nombre, sobre COPIAS) → `estadoPeriodoHseq_` */
  const tests = P310_VERDES.concat(['Oscar Uno']).map((p, i) => Object.assign(p310T(p, '2026-11-03', '08:0' + i, 3), { emp: 'Empresa Demo' }));
  const w = p308Mundo(tests);
  if (w.faltan) { PRUEBAS.igual(w.faltan, [], 'guarda'); return; }
  const d = JSON.parse(w.api.accionDemo({ dispositivoId: 'p310' }).getContent());
  PRUEBAS.cierto(d.ok && !!(d.totalesHseq && d.totalesHseq.periodos), 'guarda: la demostración trae sus totales');
  if (!d.ok) return;
  const pers = Object.keys(d.totalesHseq.periodos).map(k => d.totalesHseq.periodos[k].estado);
  PRUEBAS.cierto(pers.every(e => e && (e.etapa === null ? !!e.causa : ['seguro', 'atencion', 'levemente', 'poco'].indexOf(e.etapa) >= 0)),
    '🔴 cada período de la demo trae su estado (o la causa) · ' + JSON.stringify(pers.slice(0, 2)));
  PRUEBAS.igual(d.totalesHseq.umbralEstado, 25, 'y el umbral que rige');
  const internos = (d.registros || []).filter(r => '__colorHseq' in r || '__orden' in r).length;
  PRUEBAS.igual(internos, 0, '🔴 los registros que viajan en la demo no llevan los campos internos del cálculo');
});

/* ── Lo que encontró el verificador en la ronda 1 (2026-11-01): los grupos «estado» formados con tests sueltos ─────── */
/* (los `const` de P308 no se ven desde acá: cada archivo de casos se evalúa con su propio ámbito) */
const P310_METRICAS = ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'];
const P310_CONF = (p, d) => [d, 'c-' + p, 'kss', p, 'Helitec', 'Operaciones', 20, 'false', 'respuestas apuradas', 1, 9];

PRUEBAS.caso('🔴 P310 · B1 · un día poco confiable no saca a nadie del grupo de colores: el rojo no queda solo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `coloresTestsHseq_` colorea TODOS los tests, también los de un día poco confiable, y `gruposEstadoHseq_` cuenta a
     todas las personas del grupo. El escenario del verificador (ronda 1): el martes cuatro con el día poco confiable y
     Oscar con 8. Si sólo Oscar tuviera color, el grupo diría el color de UNA persona. */
  const lunes = [p310T('Oscar Uno', '2026-11-02', '08:00', 8)].concat(['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes']
    .map((p, i) => p310T(p, '2026-11-02', '08:0' + (i + 1), 3)));
  const martesGente = ['Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco'];
  const martes = martesGente.map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)).concat([p310T('Oscar Uno', '2026-11-03', '08:04', 8)]);
  const correr = (pocoConfiables, sab) => {
    const w = p310Mundo(lunes.concat(martes), { confiabilidad: pocoConfiables ? martesGente.map(p => P310_CONF(p, '2026-11-03')) : [] }, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    w.sellarYPedir('2026-11-03T15:00:00-04:00');
    const filas = w.hoja('Totales HSEQ').getDataRange().getValues().slice(1).filter(f => String(f[2]) === 'estado' && String(f[4]) === '2026-11-03');
    return filas.map(f => ({ verdes: Number(f[14]), amarillos: Number(f[15]), rojos: Number(f[16]), personas: Number(f[9]) }));
  };
  const m = correr(true), c = correr(false);
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual(m, [{ verdes: 4, amarillos: 0, rojos: 1, personas: 5 }], '🔴 con cuatro días poco confiables, el grupo del martes tiene a los cinco con color: el rojo es uno de cinco');
  PRUEBAS.igual(c, m, 'CONTROL: con los cuatro confiables, el mismo grupo');
  const s = correr(true, [['      var r = x.r, col = {};', '      var r = x.r, col = {}; if (r.confiable === false) { r.__colorHseq = col; return; }'],
                          ['        var c = (x.r.__colorHseq && typeof x.r.__colorHseq[x.m] === "number") ? x.r.__colorHseq[x.m] : 0;\n        peor[quien]',
                           '        var c = (x.r.__colorHseq && typeof x.r.__colorHseq[x.m] === "number") ? x.r.__colorHseq[x.m] : -1;\n        if (c < 0) return;\n        peor[quien]'],
                          ['        if (!(e.piso >= PISO_MIN_HSEQ) || e.personas < e.piso || coloreados < e.personas) { estadoNoEscritos++; return; }', '        void coloreados;']]);
  PRUEBAS.igual(s.faltan || s.map(x => x.verdes + x.amarillos + x.rojos), [1], '⚠️ discriminador · si un día poco confiable deja sin color, el grupo del martes queda con el color de Oscar solo');
});

PRUEBAS.caso('🔴 P310 · B2 · la cobertura cuenta a quien participó, con color o sin él: no dice quién tuvo el día poco confiable', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `gruposEstadoHseq_` guarda en `ids` a TODAS las personas de la nómina del grupo; `estadoPeriodoHseq_` cuenta las
     distintas. Escenario: el martes Olga (nueva en la semana) y los mismos de siempre; si su día fue poco confiable o no,
     la semana termina con la misma cobertura. */
  const lunes = P310_VERDES.map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 3));
  const martes = ['Olga Dos', 'Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes', 'Nora Nueva', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis']
    .map((p, i) => p310T(p, '2026-11-03', '09:' + String(10 + i), 3));
  const correr = (olgaMal, sab) => {
    const w = p310Mundo(lunes.concat(martes), { confiabilidad: olgaMal ? [P310_CONF('Olga Dos', '2026-11-03')] : [] }, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    return ((((w.sellarYPedir('2026-11-03T15:00:00-04:00').totalesHseq || {}).periodos || {}).semana || {}).estado || {});
  };
  const mal = correr(true), bien = correr(false);
  PRUEBAS.igual(mal.faltan || [], [], 'guarda');
  if (mal.faltan) return;
  PRUEBAS.igual([mal.personas, bien.personas], [10, 10], '🔴 la semana cuenta 10 personas (5 del lunes y 5 nuevas del martes) tenga Olga el día poco confiable o no');
  const s1 = correr(true, [['        if (ced) nomina[ced] = 1;', '        if (ced && x.r.confiable !== false) nomina[ced] = 1;']]);
  PRUEBAS.igual(s1.faltan || s1.personas, 9, '⚠️ discriminador · si la cobertura cuenta sólo a quien respondió con calma, el día de Olga se ve (9 contra 10)');
});

PRUEBAS.caso('🔴 P310 · I2 · cada suma queda ENTERA dentro de un grupo de colores: un verde no despeja a la quinta persona', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `sellarTotalesHseq_` arma los grupos «estado» con `gruposEstadoHseq_` sobre las unidades de las métricas
     (`u:` + el hash de sus huellas), nunca con tests sueltos. El escenario del verificador: el lunes Lara, Leo, Mario y
     Marta hacen KSS 5, Nora estrés y Oscar KSS 9. La unidad de KSS (los cuatro y Oscar) suma 29: si un grupo «estado»
     dijera que los cuatro están en verde (KSS ≤ 5), 29 − 4 × 5 despejaría el 9 de Oscar. */
  const tests = ['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes'].map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 5))
    .concat([p310T('Nora Nueva', '2026-11-02', '08:04', 2, 'estres'), p310T('Oscar Uno', '2026-11-02', '09:00', 9)]);
  const w = p310Mundo(tests, { ahora: '2026-11-02T15:00:00-04:00' });
  if (w.faltan) { PRUEBAS.igual(w.faltan, [], 'guarda'); return; }
  const r = w.sellarYPedir('2026-11-02T15:00:00-04:00');
  const kss = r.totalesHseq.periodos.hoy.metricas.kss, est = r.totalesHseq.periodos.hoy.estado || {};
  PRUEBAS.igual(kss && [kss.n, kss.suma], [5, 29], 'guarda: la unidad de KSS de los cuatro y Oscar');
  PRUEBAS.cierto(est.etapa !== 'seguro', '🔴 el grupo de colores es ESA unidad: no puede decir «todos en verde» (Oscar 9 es amarillo) · ' + JSON.stringify(est));
  /* y la forma, en la hoja: cada fila «estado» cubre unidades enteras de las métricas, cada una en un solo grupo */
  const v = w.hoja('Totales HSEQ').getDataRange().getValues().slice(1);
  const api = p310Api(null, ['hashHseq_']);
  const unidades = new Set(v.filter(f => P310_METRICAS.indexOf(String(f[2])) >= 0).map(f => 'u:' + api.hashHseq_(String(f[13]))));
  const cubiertas = v.filter(f => String(f[2]) === 'estado').flatMap(f => String(f[13]).split(',').filter(Boolean));
  PRUEBAS.cierto(cubiertas.length > 0 && cubiertas.every(x => unidades.has(x)), '🔴 cada fila «estado» lista unidades de las métricas, no tests');
  PRUEBAS.igual(cubiertas.length, new Set(cubiertas).size, 'ninguna unidad en dos grupos');
});

/* ── Lo que encontró el verificador en la ronda 2 (2026-11-02) ──────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P310 · N1 · el color de un test no depende de la historia: marcar poco confiable el día anterior de otros no cambia nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `coloresTestsHseq_` colorea con `colorValorHseq_(valor, …)`, sin el anterior. El ataque del verificador: por
     `confiabilidad_guardar` (sin credencial), el lunes de los otros cuatro queda poco confiable; con el rojo del semáforo
     (dos seguidos), sólo Alma podía estar en rojo el martes y la etapa decía su estado. */
  const lunes = [p310T('Alma Única', '2026-11-02', '08:00', 8), p310T('Lara Legal', '2026-11-02', '08:01', 8)]
    .concat(['Leo Legal', 'Mario Mes', 'Marta Mes'].map((p, i) => p310T(p, '2026-11-02', '08:0' + (i + 2), 3)));
  const otros = ['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes'];
  const correr = (alma, ataque) => {
    const martes = [p310T('Alma Única', '2026-11-03', '08:00', alma)].concat(otros.map((p, i) => p310T(p, '2026-11-03', '08:0' + (i + 1), 3)));
    const w = p310Mundo(lunes.concat(martes), { confiabilidad: ataque ? otros.map(p => P310_CONF(p, '2026-11-02')) : [] });
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    return (w.sellarYPedir('2026-11-03T15:00:00-04:00').totalesHseq.periodos.hoy || {}).estado || {};
  };
  const r = [correr(8, false), correr(8, true), correr(3, false), correr(3, true)];
  PRUEBAS.igual(r[0].faltan || [], [], 'guarda');
  if (r[0].faltan) return;
  PRUEBAS.igual(r[1], r[0], '🔴 con Alma en 8, el ataque no cambia el estado del martes');
  PRUEBAS.igual(r[3], r[2], '🔴 con Alma en 3, tampoco');
  PRUEBAS.igual([r[0].etapa, r[2].etapa], ['poco', 'seguro'], 'y el estado del martes es el de su grupo: un test en rojo, o ninguno');
});

PRUEBAS.caso('🔴 P310 · H1 · una unidad con tanda en el futuro no se agrupa: el estado no se congela', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `sellarTotalesHseq_` filtra las candidatas con `u.tanda <= ahoraMs`. El escenario: una hoja como la dejó P308 (sin
     grupos «estado»), con la «Sellada» de una unidad editada a 2027 y aceptada al reconciliar. La primera corrida de P310
     no tiene que subir el tope de «estado» a 2027: la tanda siguiente tiene que tener su grupo. */
  const api = p310Api(null, ['hashHseq_', 'celdaHseq_', 'xorHseq_']);
  const correr = (sab) => {
    const base = P310_VERDES.map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 3))
      .concat(['Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis'].map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)));
    const w = p310Mundo(base, {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    const viejas = v.slice(1).filter(f => String(f[2]) !== 'estado').map(f => f.slice(0, 14));
    viejas.forEach(f => { if (String(f[2]) === 'kss') f[12] = '2027-11-03T12:00:00.000Z'; });
    while (h.getLastRow() > 0) h.deleteRow(h.getLastRow());
    h.appendRow(v[0].slice(0, 14));
    viejas.forEach(f => h.appendRow(f));
    const firmas = {};
    viejas.forEach(f => { const k = String(f[0]).trim().toLowerCase(), o = firmas[k] || (firmas[k] = { n: 0, d: '0000000000000000' });
      o.n++; o.d = api.xorHseq_(o.d, api.hashHseq_(f.map(c => api.celdaHseq_(c)).join('\u0001'))); });
    w.props().setProperty('hseq_firmas', JSON.stringify(firmas));
    w.props().deleteProperty('hseq_tope_estado');
    const primera = w.sellarYPedir('2026-11-02T15:20:00-04:00').__sellado;
    const martes = w.sellarYPedir('2026-11-03T15:00:00-04:00');
    return { primera: primera, martes: martes.__sellado, est: (martes.totalesHseq.periodos.hoy || {}).estado || {} };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.primera.trabadas, m.primera.nuevasEstado], [[], 0], 'la primera corrida no agrupa la unidad con «Sellada» futura (era la única)');
  PRUEBAS.igual([m.martes.nuevasEstado, m.est.etapa], [1, 'seguro'], '🔴 la tanda del martes tiene su grupo: el estado sigue andando');
  const s = correr([['u.completa && u.tanda > topeE && u.tanda <= ahoraMs;', 'u.completa && u.tanda > topeE;']]);
  PRUEBAS.igual(s.faltan || s.martes.nuevasEstado, 0, '⚠️ discriminador · si se agrupa la unidad de 2027, el tope de «estado» queda en 2027 y el martes no tiene grupo');
});

PRUEBAS.caso('🔴 P310 · T1 · una fila «estado» borrada y reconciliada no vuelve a armarse con otras fronteras', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `sellarTotalesHseq_`: sólo se agrupan unidades de una tanda posterior al tope de «estado» (que sólo sube). Sin eso,
     sus unidades entrarían en otro grupo, con otras compañeras, y la resta entre los dos estados las separaría. */
  const correr = (sab) => {
    const w = p310Mundo(P310_VERDES.map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-03T15:00:00-04:00');
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][2]) === 'estado') h.deleteRow(i + 1);
    const rec = w.reconciliar('2026-11-03T15:20:00-04:00');
    return { rec: rec, estados: w.hoja('Totales HSEQ').getDataRange().getValues().slice(1).filter(f => String(f[2]) === 'estado').length };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.rec.ok, m.rec.nuevasEstado, m.estados], [true, 0, 0], '🔴 al reconciliar, la unidad no se vuelve a agrupar');
  const s = correr([['u.completa && u.tanda > topeE && u.tanda <= ahoraMs;', 'u.completa && u.tanda <= ahoraMs;']]);
  PRUEBAS.igual(s.faltan || [], [], 'guarda: el sabotaje del tope se aplicó');
  if (!s.faltan) PRUEBAS.alMenos(s.rec.nuevasEstado, 1, '⚠️ discriminador · sin el tope, la unidad se agrupa de nuevo');
});

/* ── Lo que encontró el verificador en la ronda 3 (2026-11-02) ──────────────────────────────────────────────── */
/* La hoja como la dejó P308 (sin filas «estado», 14 columnas, firmas con la fórmula vieja, sin tope de «estado»). */
function p310HojaP308(w, edita) {
  const api = p310Api(null, ['hashHseq_', 'celdaHseq_', 'xorHseq_']);
  const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
  const viejas = v.slice(1).filter(f => String(f[2]) !== 'estado').map(f => f.slice(0, 14));
  if (edita) viejas.forEach(edita);
  while (h.getLastRow() > 0) h.deleteRow(h.getLastRow());
  h.appendRow(v[0].slice(0, 14));
  viejas.forEach(f => h.appendRow(f));
  const firmas = {};
  viejas.forEach(f => { const k = String(f[0]).trim().toLowerCase(), o = firmas[k] || (firmas[k] = { n: 0, d: '0000000000000000' });
    o.n++; o.d = api.xorHseq_(o.d, api.hashHseq_(f.map(c => api.celdaHseq_(c)).join('\u0001'))); });
  w.props().setProperty('hseq_firmas', JSON.stringify(firmas));
  w.props().deleteProperty('hseq_tope_estado');
}

PRUEBAS.caso('🔴 P310 · A · la primera corrida no deja a HSEQ sin totales aunque desde P308 haya cambiado la nómina, la hoja o el piso', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `sellarTotalesHseq_`: sólo agrupa unidades completas (`u.completa`), con el piso de sus unidades (`e.piso`), y no
     escribe un grupo que el lector (`unidadesSelladasHseq_`) rechazaría. Tres cosas que pueden pasar entre el sellado de
     P308 y la primera corrida de P310: alguien sale de la nómina, se borra un test sellado, sube `anonN`. */
  const correr = (cambio, sab) => {
    const tests = P310_VERDES.map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 3));
    const w = p310Mundo(tests, {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    p310HojaP308(w);
    if (cambio === 'salio') { const h = w.hoja('Nómina'), v = h.getDataRange().getValues();
      for (let i = v.length - 1; i >= 1; i--) if (v[i][1] === 'Lara Legal') { h.deleteRow(i + 1); break; } }
    if (cambio === 'borrado') w.borrarFilaDeId(tests[0].id);
    if (cambio === 'anonN') w.hoja('Config Empresa').appendRow(['Helitec', 'anonN', '6']);
    const r = w.sellarYPedir('2026-11-02T15:20:00-04:00');
    const estados = w.hoja('Totales HSEQ').getDataRange().getValues().slice(1).filter(f => String(f[2]) === 'estado')
      .map(f => ({ personas: Number(f[9]), piso: Number(f[10]), colores: Number(f[14]) + Number(f[15]) + Number(f[16]) }));
    return { totales: !!(r.totalesHseq && r.totalesHseq.periodos), causa: (r.totalesHseq || {}).causa || '', estados: estados, s: r.__sellado };
  };
  ['salio', 'borrado', 'anonN'].forEach(c => {
    const m = correr(c);
    PRUEBAS.igual(m.faltan || [], [], 'guarda · ' + c);
    if (m.faltan) return;
    PRUEBAS.igual([m.totales, m.causa], [true, ''], '🔴 ' + c + ': HSEQ sigue viendo sus totales (ningún falso «hoja tocada»)');
    PRUEBAS.cierto(m.estados.every(e => e.piso >= 5 && e.personas >= e.piso && e.colores >= e.personas),
      c + ': ningún grupo escrito que el lector rechazaría · ' + JSON.stringify(m.estados));
  });
  /* Discriminador: sin las cuatro guardas (unidad completa, participantes por la cédula del test, piso de sus unidades, no
     escribir lo inválido), cada cambio deja a HSEQ sin ningún total */
  const sab = [['!cubiertas[u.id] && u.completa && u.tanda > topeE', '!cubiertas[u.id] && u.tanda > topeE'],
               ['gruposEstadoHseq_(pendientes, claveE)', 'gruposEstadoHseq_(pendientes, claveDe)'],
               ['        if (!(e.piso >= PISO_MIN_HSEQ) || e.personas < e.piso || coloreados < e.personas) { estadoNoEscritos++; return; }', '        void coloreados;'],
               ['e.personas, e.piso, new Date(e.tanda).toISOString(),', 'e.personas, piso, new Date(e.tanda).toISOString(),']];
  ['salio', 'borrado', 'anonN'].forEach(c => {
    const s = correr(c, sab);
    PRUEBAS.igual(s.faltan || [], [], 'guarda: el sabotaje se aplicó · ' + c);
    if (!s.faltan) PRUEBAS.igual(s.causa, 'hoja', '⚠️ discriminador · ' + c + ': sin las guardas, el grupo inválido le saca a HSEQ todos sus totales');
  });
});

PRUEBAS.caso('🔴 P310 · B · una unidad que cierra tarde con tests viejos entra igual a su grupo: el estado no se pierde un rojo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · el tope de «estado» va por TANDA (`u.tanda > topeE`). El escenario del verificador: el lunes Pedro (todavía fuera
     de la nómina) mide KSS 8 con cuatro compañeros; la unidad no cierra (4 de 5). El martes otra tanda de estrés sube el
     tope. Pedro entra a la nómina y la unidad del lunes cierra con tests del lunes. */
  const lunes = ['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes'].map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 3))
    .concat([p310T('Pedro Pendiente', '2026-11-02', '08:04', 8)]);
  const martes = ['Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis'].map((p, i) => p310T(p, '2026-11-03', '08:0' + i, 6, 'estres'));
  const correr = (sab) => {
    const w = p310Mundo(lunes.concat(martes), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    w.sellarYPedir('2026-11-03T15:00:00-04:00');
    w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
    const r = w.sellarYPedir('2026-11-03T16:00:00-04:00');
    const P = r.totalesHseq.periodos.semana;
    return { etapa: (P.estado || {}).etapa, kss: P.metricas.kss && P.metricas.kss.n };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.kss, m.etapa], [5, 'poco'], '🔴 la tarjeta suma la unidad del lunes, y el estado también ve el 8 de Pedro');
  const s = correr([['piso: Number(f[10]) || 0, num:', 'piso: Number(f[10]) || 0, hasta: Date.parse(String(f[11] || "")) || 0, num:'],
                    ['!cubiertas[u.id] && u.completa && u.tanda > topeE', '!cubiertas[u.id] && u.completa && u.hasta > topeE']]);
  PRUEBAS.igual(s.faltan || s.etapa, 'seguro', '⚠️ discriminador · con el tope por `hasta`, la unidad del lunes queda afuera y el estado dice SEGURO');
});

/* ── Lo que encontró el verificador en la ronda 4 (2026-11-02) ──────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P310 · la cobertura del cartel cuenta sólo a quien está HOY en la nómina de la empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `totalesHseqDeEmpresa_` filtra los `ids` de los grupos con la nómina vigente; el cliente divide por `nominaTotal`.
     El escenario del verificador: miden 8 de la nómina (12) y 3 de afuera, homónimos de la nómina de otra empresa (el
     resolutor les da su cédula por el nombre). La cobertura real es 8 de 12. */
  const N = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis', 'Lara Legal', 'Leo Legal'];
  const X = ['Ximena Externa', 'Xavier Externo', 'Xiomara Externa'];
  const correr = (sab) => {
    const tests = [];
    N.slice(0, 5).forEach((p, i) => tests.push(p310T(p, '2026-11-03', '07:0' + i, 3)));
    X.forEach((p, i) => tests.push(p310T(p, '2026-11-03', '06:5' + i, 3)));
    N.slice(3, 8).forEach((p, i) => tests.push(p310T(p, '2026-11-03', '07:2' + i, 2, 'estres')));
    const w = p310Mundo(tests, {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    X.forEach((p, i) => w.hoja('Nómina').appendRow(['Cardón', p, 'V-99900' + i, 'Planta', 'Operario', '', '', '', '', 'No', '', 'empleado', '3']));
    const r = w.sellarYPedir('2026-11-03T15:00:00-04:00');
    return { personas: ((r.totalesHseq.periodos.hoy || {}).estado || {}).personas, nomina: r.nominaTotal };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.personas, m.nomina], [8, 12], '🔴 8 de 12 medidos: las 3 de afuera no cuentan (y el cartel se atenúa)');
  const s = correr([['    (U[ESTADO_HSEQ] || []).forEach(function (g) { g.ids = g.ids.filter(function (h) { return vigentes[h]; }); });', '    void vigentes;']]);
  PRUEBAS.igual(s.faltan || s.personas, 11, '⚠️ discriminador · sin el filtro, las de afuera suben la cobertura a 11 de 12 y el cartel no se atenúa');
});

PRUEBAS.caso('🔴 P310 · una unidad con un test borrado no entra al estado: sus colores no pueden cubrir menos que su suma', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `sellarTotalesHseq_` agrupa sólo unidades completas (`u.completa`). El escenario del verificador: una unidad de 6
     tests (Oscar dos veces: 9 y 5) suma 34; si se borra el 9 y el grupo se arma con los 5 que quedan, todos verdes,
     «SEGURO» y la suma de la tarjeta dan 34 − 5 × 5 = 9: el test borrado, exacto. */
  const tests = [p310T('Oscar Uno', '2026-11-02', '08:00', 9), p310T('Oscar Uno', '2026-11-02', '08:01', 5)]
    .concat(['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes'].map((p, i) => p310T(p, '2026-11-02', '08:0' + (i + 2), 5)));
  const correr = (sab) => {
    const w = p310Mundo(tests, {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    p310HojaP308(w);
    w.borrarFilaDeId(tests[0].id);
    const r = w.sellarYPedir('2026-11-02T15:20:00-04:00');
    const P = r.totalesHseq.periodos.hoy || {};
    return { etapa: (P.estado || {}).etapa || null, kss: P.metricas && P.metricas.kss && [P.metricas.kss.n, P.metricas.kss.suma],
             incompletas: r.__sellado.estadoIncompletas };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual(m.kss, [6, 34], 'guarda: la tarjeta sigue con la unidad sellada (6 tests, suma 34)');
  PRUEBAS.igual([m.etapa, m.incompletas], [null, 1], '🔴 el estado no la cubre (y el sellado lo informa)');
  const s = correr([['completa: hs.length > 0 && tests.length === hs.length, tests: tests });', 'completa: hs.length > 0, tests: tests });']]);
  PRUEBAS.igual(s.faltan || s.etapa, 'seguro', '⚠️ discriminador · sin la guarda, «SEGURO» con la suma 34 despeja el 9 borrado');
});

PRUEBAS.caso('🔴 P310 · los participantes del grupo salen de la cédula de sus tests: quien salió de la nómina no hace perder el grupo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  /* R19 · `claveE` (la cédula del test) arma los participantes de los grupos de la historia, no la nómina de hoy. */
  const correr = (sab) => {
    const w = p310Mundo(P310_VERDES.map((p, i) => p310T(p, '2026-11-02', '08:0' + i, 3)), {}, sab);
    if (w.faltan) return { faltan: w.faltan };
    w.sellarYPedir('2026-11-02T15:00:00-04:00');
    p310HojaP308(w);
    const h = w.hoja('Nómina'), v = h.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (v[i][1] === 'Lara Legal') { h.deleteRow(i + 1); break; }
    const r = w.sellarYPedir('2026-11-02T15:20:00-04:00');
    return { escritos: r.__sellado.nuevasEstado, noEscritos: r.__sellado.estadoNoEscritos };
  };
  const m = correr();
  PRUEBAS.igual(m.faltan || [], [], 'guarda');
  if (m.faltan) return;
  PRUEBAS.igual([m.escritos, m.noEscritos], [1, 0], '🔴 el grupo de la historia se escribe aunque Lara ya no esté en la nómina');
  const s = correr([['      var claveE = function (r) { return cedulaNorm(r.cedula) || ""; };', '      var claveE = claveDe;']]);
  PRUEBAS.igual(s.faltan || [s.escritos, s.noEscritos], [0, 1], '⚠️ discriminador · con la nómina de hoy, el grupo queda con 4 y no se escribe');
});
