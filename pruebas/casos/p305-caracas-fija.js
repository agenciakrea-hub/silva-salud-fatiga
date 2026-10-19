PRUEBAS.grupo('P305 · las fechas en Caracas, fija para todo');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Decisión de Franco (2026-10-12): «Caracas fija para todo». El script corre en Buenos Aires
   (`appsscript.json`, UTC−3) y el CH y los teléfonos en Caracas (UTC−4): todo lo que pasaba entre
   las 23:00 y las 24:00 de Caracas el servidor lo fechaba al día siguiente.

   R19 · el derecho «este día es el de Caracas» lo conceden `ZONA_FECHAS_GS` y sus funciones del
   `.gs` (`diaFijo_`, `hoyFijo_`, `diaFijoMas_`, `inicioDiaFijo_`, `instanteDePared_`,
   `diaDeSerial_`). Cada caso nombra cuál usa.

   LA APP NO CAMBIA: toma la zona que le manda el servidor (`zonaOp`, P090/P186), y ahora el servidor
   manda siempre Caracas (`zonaOperacionServer`, caso de «hoy» más abajo). El último escalón de
   `zonaOperacion()` —la zona del teléfono, cuando todavía no habló con el servidor— se dejó como
   estaba, a propósito: la demostración arma sus horas con el reloj del teléfono y siete casos (P090,
   P167, P169, Demo) lo midieron al probar Caracas ahí: en una computadora fuera de Venezuela la
   demostración mostraba eventos corridos una hora.

   R17 · los casos entran por el camino real: `parseRegistros` con la celda como la entrega Sheets,
   `leerTurnos`/`leerOperacional` con la hoja, `accionPvt` escribiendo y `leerPVT` leyendo.
   Todos corren con las zonas de PRODUCCIÓN, separadas (P304): script en Buenos Aires, libro en
   Caracas. Con una sola zona el cambio no se vería.

   EL RELOJ. «Hoy» depende de la hora, así que los casos que lo miden fijan `Date` SÓLO dentro del
   `.gs` cargado (`env.Date = GS.relojFijo(…)`: `cargarGs` pasa cada clave del entorno como variable
   del archivo). El `Date` global de la suite no se toca, así que no hay nada que restaurar (R18).

   ⚠️ LO QUE ESTOS DISCRIMINADORES NO CUBREN (lo midió el verificador de P305): el código VIEJO usaba
   `getDate()`, `setHours()` y `new Date(a, m, d)`, que en el emulador corren en la zona del HOST, no
   en la del script (P161). En esta máquina el host está en Buenos Aires —la zona del script en
   producción— y los casos se ponen en rojo con el `.gs` de antes; en un host en Caracas, los de los
   cortes y los días desde el último test quedarían verdes con el código viejo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* 2026-10-20 03:30 UTC = 23:30 del 19 en Caracas y 00:30 del 20 en Buenos Aires: el instante de borde. */
const P305_BORDE = '2026-10-20T03:30:00Z';
const P305_BA = 'America/Argentina/Buenos_Aires', P305_CCS = 'America/Caracas';
const P305_PROD = { zonaScript: P305_BA, zonaLibro: P305_CCS };


/* La hoja de tests como la real: 130 columnas, DOS filas de encabezado (ver p215e). */
function p305HojaTests(valorFecha) {
  const cab = new Array(130).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa'; cab[73] = 'Fecha';
  const f = new Array(130).fill('');
  f[0] = valorFecha; f[1] = 'Carla Rivas'; f[2] = 'Operaciones'; f[72] = 'Alfa'; f[73] = valorFecha; f[86] = '5';
  return [cab, cab.slice(), f];
}
function p305Registro(valorFecha, opciones) {
  const env = GS.crearEntorno({ 'Respuestas de formulario 1': p305HojaTests(valorFecha) }, opciones || P305_PROD);
  const api = GS.cargarGs(CTX.gs, env, ['parseRegistros']);
  const regs = api.parseRegistros(env.__libro.getSheetByName('Respuestas de formulario 1').getDataRange().getValues());
  return regs[0] || null;
}

PRUEBAS.caso('🔴 la fecha de un test hecho a las 23:30 de Caracas es la de ESE día, no la del siguiente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `normFecha` → `diaFijo_` (`ZONA_FECHAS_GS`). La celda llega como `Date`, como en producción. */
  const r = p305Registro(new Date(P305_BORDE));
  PRUEBAS.cierto(!!r, 'guarda: `parseRegistros` acepta la fila');
  PRUEBAS.igual(r && r.fecha, '2026-10-19',
    '🔴 23:30 del 19 en Caracas es el 19 — con la zona del script (Buenos Aires) salía el 20');
  PRUEBAS.igual(r && r.ts, Date.parse(P305_BORDE),
    'y el instante no cambia: lo que cambia es sólo de qué día se dice');
  /* No depende de dónde corra el script ni de cómo esté configurado el libro: la zona es FIJA. */
  const r2 = p305Registro(new Date(P305_BORDE), { zona: P305_BA });
  PRUEBAS.igual(r2 && r2.fecha, '2026-10-19',
    '🔴 aunque el script Y el libro estuvieran en Buenos Aires: Caracas es fija, no la del libro');
  const r3 = p305Registro(new Date('2026-10-19T15:00:00Z'));
  PRUEBAS.igual(r3 && r3.fecha, '2026-10-19', 'control: a media tarde las dos zonas dan el mismo día');
});

PRUEBAS.caso('🔴 los números de serie se leen por días enteros: el de las 23:45 no se pasa al día siguiente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `normFecha` → `diaDeSerial_`. 46314 = 19/10/2026. Medido en Apps Script de verdad
     (`medir_fechas_tests`): con la base `new Date(1899, 11, 30)` de antes, 46314.99 salía el 20. */
  PRUEBAS.igual((p305Registro(46314) || {}).fecha, '2026-10-19', 'el serial del día entero');
  PRUEBAS.igual((p305Registro(46314.5) || {}).fecha, '2026-10-19', 'el del mediodía');
  PRUEBAS.igual((p305Registro(46314.99) || {}).fecha, '2026-10-19',
    '🔴 el de las 23:45 — con la base de 1899 y la zona del script salía el 20');
  PRUEBAS.igual((p305Registro('46314.99') || {}).fecha, '2026-10-19', '🔴 y el mismo serial escrito como texto');
  /* `tsDeMarca_` (el instante para «Actividad reciente»): el serial es una hora de PARED del libro.
     46314.5 = 19/10 a las 12:00 en Caracas = 16:00 UTC. Tomado como UTC daba las 08:00 en pantalla. */
  PRUEBAS.igual((p305Registro(46314.5) || {}).ts, Date.UTC(2026, 9, 19, 16, 0, 0),
    '🔴 el instante del serial es las 12:00 de Caracas, no las 12:00 UTC');
});

/* El servidor con el reloj fijo en el borde, y lo que haga falta en sus hojas. */
function p305Servidor(hojas, nombres) {
  const env = GS.crearEntorno(Object.assign({ 'Config Empresa': [['Empresa', 'Clave', 'Valor']] }, hojas || {}), P305_PROD);
  env.Date = GS.relojFijo(P305_BORDE);
  return { env: env, api: GS.cargarGs(CTX.gs, env, nombres) };
}

PRUEBAS.caso('🔴 «hoy», a las 23:30 de Caracas, sigue siendo hoy: los días desde el último test y el día de operaciones', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const { api } = p305Servidor({ 'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['Alfa', 'zonaHoraria', 'Asia/Tokyo']] },
    ['aptDiasDesdeServer', 'opHoy_', 'zonaOperacionServer']);
  /* R19 · `aptDiasDesdeServer` → `aptDiaMsServer` → `diaFijo_`. */
  PRUEBAS.igual(api.aptDiasDesdeServer('2026-10-19'), 0,
    '🔴 un test de hoy tiene 0 días — con la zona del script ya era «mañana» y daba 1');
  PRUEBAS.igual(api.aptDiasDesdeServer('2026-10-12'), 7, 'y uno de hace una semana, 7');
  /* R19 · `opHoy_` → `hoyFijo_`. */
  PRUEBAS.igual(api.opHoy_('Alfa'), '2026-10-19', '🔴 el «hoy» de operaciones es el 19');
  /* R19 · `zonaOperacionServer` → `ZONA_FECHAS_GS`. Franco eligió la fija sobre la de cada empresa:
     una fila `zonaHoraria` propia ya no cambia nada (hoy el CH no tiene ninguna; medido). */
  PRUEBAS.igual(api.zonaOperacionServer('Alfa'), P305_CCS,
    '🔴 la zona que viaja a la app es Caracas, aunque la empresa tenga otra cargada');
  PRUEBAS.igual(api.zonaOperacionServer(''), P305_CCS, 'y sin empresa también (antes: vacío, y el teléfono usaba la suya)');
});

PRUEBAS.caso('🔴 «los últimos N días» cortan en la medianoche de Caracas, no en la del script', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* Hoy es el 19 en Caracas (el 20 en Buenos Aires). */
  const turnos = [['Fecha', 'Hora', 'IdTurno', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga'],
    ['2026-10-16', '08:00', 't1', 'checkin', 'Carla Rivas', 'Alfa', 'Operaciones', 'Piloto', '3', ''],
    ['2026-10-17', '08:00', 't2', 'checkin', 'Carla Rivas', 'Alfa', 'Operaciones', 'Piloto', '3', ''],
    /* dos fechas con la forma pero imposibles: antes las descartaba el NaN de `new Date(…)` */
    ['2026-10-32', '08:00', 't3', 'checkin', 'Carla Rivas', 'Alfa', 'Operaciones', 'Piloto', '3', ''],
    ['2026-13-01', '08:00', 't4', 'checkin', 'Carla Rivas', 'Alfa', 'Operaciones', 'Piloto', '3', '']];
  const fila = (iso, id) => ['', '', iso, id, 'Carla Rivas', 'Alfa', 'Operaciones', 'Piloto', 'check_in', '', '', ''];
  const oper = [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    fila('2026-10-12T03:30:00.000Z', 'e1'),     // 23:30 del 11 en Caracas: afuera
    fila('2026-10-12T04:30:00.000Z', 'e2')];    // 00:30 del 12 en Caracas: adentro
  const { api } = p305Servidor({ 'Turnos': turnos, 'Operacional': oper },
    ['leerTurnos', 'leerOperacional', 'leerOperacionalCompleto']);
  /* Guardas: con una ventana ancha entran las dos filas de cada hoja. Si no, el corte de abajo
     estaría midiendo una fila que el lector descarta por otra razón. */
  PRUEBAS.igual(api.leerTurnos(30).map(t => t.fecha).join(','), '2026-10-16,2026-10-17',
    'guarda: `leerTurnos` lee las dos filas reales, y las dos fechas imposibles NO pasan (antes, `new Date` daba NaN)');
  PRUEBAS.igual(api.leerOperacional(30).length, 2, 'guarda: `leerOperacional` lee las dos filas');
  PRUEBAS.igual(api.leerOperacionalCompleto(30).length, 2, 'guarda: `leerOperacionalCompleto` lee las dos filas');
  /* R19 · `leerTurnos` → `diaFijoMas_(hoyFijo_(), -dias)`. */
  PRUEBAS.igual(api.leerTurnos(2).map(t => t.fecha).join(','), '2026-10-17',
    '🔴 dos días desde el 19 de Caracas: entra el 17 — con el «hoy» del script (el 20) quedaba afuera');
  /* R19 · `leerOperacional` y `leerOperacionalCompleto` → `inicioDiaFijo_`. */
  PRUEBAS.igual(api.leerOperacional(7).map(e => e.iso).join(','), '2026-10-12T04:30:00.000Z',
    '🔴 siete días desde el 19: entra lo del 12 a las 00:30 de Caracas y no lo del 11 a las 23:30');
  PRUEBAS.igual(api.leerOperacionalCompleto(7).map(e => e.iso).join(','), '2026-10-12T04:30:00.000Z',
    '🔴 y la lectura completa corta en el mismo lugar (las dos se comparan en otras pruebas)');
});

PRUEBAS.caso('🔴 el PVT se guarda con la fecha de Caracas, escrita, y el panel la lee de ese día', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const { env, api } = p305Servidor({}, ['accionPvt', 'leerPVT']);
  /* R17 · el escritor real (`accionPvt`) y el lector real (`leerPVT`), en la misma hoja. */
  api.accionPvt({ nombre: 'Carla Rivas', empresa: 'Alfa', departamento: 'Operaciones', validas: 20, rt_prom: 300,
    rt_min: 250, rt_max: 400, lapsos: 0, rt_mediana: 290, falsos: 0, id: 'pvt_p305_1' });
  const v = env.__libro.getSheetByName('PVT').getDataRange().getValues();
  PRUEBAS.igual(String(v[v.length - 1][0]), '19/10/2026 23:30:00',
    '🔴 la celda dice la hora de Caracas, como texto: antes era un `Date` que Sheets convertía a su manera');
  const pvt = api.leerPVT();
  PRUEBAS.igual(pvt.length && pvt[pvt.length - 1].fecha, '2026-10-19', '🔴 y el panel lo cuenta el 19');
});

PRUEBAS.caso('🔴 el historial de informes muestra el día y la hora de Caracas, también en las filas viejas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `listarInformes` → `fechaReporteAEpoch_` (`inicioDiaFijo_` para las filas que no son ISO) y
     el formato con `zonaFechas_()`. R17 · el lector real, sobre la hoja `Informes` del entorno.
     Las tres filas de producción tienen la forma vieja «5/9/2026 10:16:12» (medido el 2026-10-19). */
  const { env, api } = p305Servidor({ 'Informes': [['Empresa', 'Fecha', 'Informe', 'ID'],
    ['alfa', '5/9/2026 10:16:12', 'viejo', 'i1'],
    /* un sello ISO de `formatoIsoLocal_`, que va en la zona del script: 00:30 de Buenos Aires = 23:30 de Caracas */
    ['alfa', '2026-10-19T00:30:00', 'nuevo', 'i2']] }, ['listarInformes']);
  const l = api.listarInformes(env.__libro.getSheetByName('Informes'), 'alfa', 10);
  const de = id => (l.find(x => x.id === id) || {}).fecha;
  PRUEBAS.igual(de('i1'), '05/09/2026 00:00',
    '🔴 la fila vieja es del 5 de septiembre — armada a la medianoche del script, se veía «04/09/2026 23:00»');
  PRUEBAS.igual(de('i2'), '18/10/2026 23:30',
    '🔴 el sello del script se muestra en Caracas: 23:30 del 18, no «19/10/2026 00:30»');
});

PRUEBAS.caso('🔴 una tarea que vence hoy no figura vencida a las 23:30 de Caracas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `tareaEstadoVigente` → `inicioDiaFijo_(diaFijoMas_(vence, 1))`. */
  const { api } = p305Servidor({}, ['tareaEstadoVigente']);
  PRUEBAS.igual(api.tareaEstadoVigente('sin_leer', '2026-10-19'), 'sin_leer',
    '🔴 vence el 19 y son las 23:30 del 19: todavía no — con la zona del script ya era «vencida»');
  PRUEBAS.igual(api.tareaEstadoVigente('sin_leer', '2026-10-18'), 'vencida', 'la de ayer, sí');
  PRUEBAS.igual(api.tareaEstadoVigente('hecha', '2026-10-18'), 'hecha', 'y la hecha no vence');
  PRUEBAS.igual(api.tareaEstadoVigente('leida', 'no-es-fecha'), 'leida', 'una fecha ilegible no la vence');
});

PRUEBAS.caso('🔴 la bitácora escribe la hora de Caracas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `bitacoraServidor` → `Utilities.formatDate(ahora, zonaFechas_(), …)`. Es la columna que lee
     quien abre el CH; los sellos legibles de las otras hojas se escriben igual. */
  const { env, api } = p305Servidor({}, ['bitacoraServidor']);
  api.bitacoraServidor('Alfa', 'prueba_p305', 'Carla Rivas', {}, { actor: 'p305', rol: '', origen: 'prueba' });
  const v = env.__libro.getSheetByName('Bitácora').getDataRange().getValues();
  PRUEBAS.igual(String(v[v.length - 1][0]), '19/10/2026 23:30',
    '🔴 la columna Fecha dice las 23:30 del 19 — con la zona del script decía «20/10/2026 00:30»');
});

PRUEBAS.caso('🔴 un día sin hora queda al mediodía de Caracas, y un serial del último segundo no se pasa de día', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `tsDeMarca_` → `instanteDePared_`. El panel imprime la hora siempre: con el mediodía del
     script, «Actividad reciente» mostraba 11:00. */
  PRUEBAS.igual((p305Registro('19/10/2026') || {}).ts, Date.UTC(2026, 9, 19, 16, 0, 0),
    '🔴 «19/10/2026» sin hora = 12:00 de Caracas (16:00 UTC)');
  /* `instanteDePared_` no suma dos veces los milisegundos: 46314.999994 = 23:59:59.48 del 19 */
  const r = p305Registro(46314.999994) || {};
  PRUEBAS.igual(r.fecha, '2026-10-19', 'el día del serial es el 19');
  PRUEBAS.igual(new Date(r.ts).toLocaleDateString('en-CA', { timeZone: P305_CCS }), '2026-10-19',
    '🔴 y su instante también cae el 19 en Caracas — con la fracción sumada dos veces, a las 00:00 del 20');
});
