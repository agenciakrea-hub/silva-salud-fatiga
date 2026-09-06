
PRUEBAS.grupo('P086 · dos jornadas el mismo día');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `accionOperacionalGuardar` hacía un upsert PELADO por el id que arma el cliente
   (`op_<clave>_<fecha>_<evento>`), o sea uno por persona por día por evento. Si un piloto hacía
   DOS vuelos el mismo día, su segundo `llegada_aero` REEMPLAZABA la fila del primero: hora, ISO,
   test, resultado y el plan congelado (Y4) desaparecían. Y desde la planilla era invisible — no
   quedaba una fila de más ni un hueco, simplemente el valor viejo ya no estaba, y estas acciones
   no pasan por bitácora.

   Peor que la pérdida: la hoja quedaba INCOHERENTE. Con la fila de la mañana pisada por la de la
   tarde, la secuencia pasaba a ser salida_casa 15:00 → llegada_aero 16:00 → salida_aero 11:00 →
   llegada_casa 12:00, y `leerDuty` mide `fin - ini`: la jornada daba NEGATIVA. Un dato falso, no
   uno faltante.

   ⚠️ LA TENSIÓN QUE HABÍA QUE RESOLVER, porque es lo que esta prueba tiene que sostener de los dos
   lados a la vez. El upsert por id existe A PROPÓSITO: la app tiene cola offline y reintenta cada
   minuto, así que el MISMO evento llega muchas veces y no puede duplicarse (R15). Cambiarlo por un
   append ciego arreglaría las dos jornadas rompiendo los reintentos. Por eso acá hay tanto un caso
   de "las dos jornadas se conservan" como uno de "el mismo hecho reenviado cinco veces sigue
   siendo una sola fila": si alguna vez el arreglo se simplifica de más, uno de los dos se pone en
   rojo.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). Nada de armar filas de `Operacional` a mano y probar
   `leerDuty` con un literal: se llama `accionOperacionalGuardar(p)` —el punto de entrada de
   verdad, el que recibe lo que manda el POST— y después se lee con `leerOperacionalCompleto()` +
   `leerDuty()`, que son las funciones que alimentan el panel. Los dos eslabones de la cadena, no
   uno solo. La lección de las tres funciones que se entregaron en verde y no andaban.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P086_CAB = ['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo',
                  'Evento','Test','Resultado','Plan'];

/* Plan con las claves que entiende `dutyTotalMin` (traslado_ida / jornada / traslado_vta): 12 h de
   jornada y 1 h de cada traslado. Si se usaran otras, el techo daría 0 y los casos medirían otra
   cosa sin avisar. */
const P086_PLAN = JSON.stringify({ traslado_ida: 60, jornada: 720, traslado_vta: 60 });

/* Hoy y las horas del día, TODO en UTC, para que el día de calendario del `fecha` y el del `iso`
   no puedan discrepar según a qué hora se corra la suite. Se usan horas entre 05 y 22, que en UTC
   caen siempre dentro del mismo día. */
function p086Hoy() { return new Date().toISOString().slice(0, 10); }
function p086Iso(hh, mm) {
  const d = new Date();
  d.setUTCHours(hh, mm || 0, 0, 0);
  return d.toISOString();
}

function p086Env() {
  const env = GS.crearEntorno({
    'Operacional': [P086_CAB.slice()],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  });
  /* `leerOperacionalCompleto` pide la zona del libro y el emulador no la tiene (mismo apaño que ya
     hace `y1-ciclos-historicos.js`). Se pone acá y no en el emulador para no tocar infraestructura
     compartida por un caso. */
  if (!env.__libro.getSpreadsheetTimeZone) {
    env.__libro.getSpreadsheetTimeZone = () => 'America/Caracas';
  }
  const api = GS.cargarGs(CTX.gs, env,
    ['accionOperacionalGuardar', 'leerOperacionalCompleto', 'leerDuty', 'upsertPorId',
     'obtenerHojaOperacional']);
  api.__env = env;

  /* EL CAMINO REAL: lo que llega por el POST, tal cual lo arma `enviarOperacional()` en la app.
     `id` con la clave por cédula e `idPrevio` con la vieja por nombre, que es exactamente lo que
     manda la app publicada hoy. */
  api.__guardar = function (evento, iso, extra) {
    const hoy = p086Hoy();
    return JSON.parse(api.accionOperacionalGuardar(Object.assign({
      id:       'op_c111_' + hoy + '_' + evento,
      idPrevio: 'op_ana suarez_' + hoy + '_' + evento,
      fecha: hoy, hora: iso.slice(11, 16), iso: iso, evento: evento,
      persona: 'Ana Suárez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto',
      plan: P086_PLAN
    }, extra || {})).getContent());
  };
  api.__filas = function () {
    return env.__libro.getSheetByName('Operacional').getDataRange().getValues().slice(1);
  };
  /* Las filas de un evento, en el orden en que quedaron en la hoja. Se mira la columna Evento
     (índice 8) y no el IdEvento, porque el id es justamente lo que el arreglo cambia. */
  api.__deEvento = function (evento) {
    return api.__filas().filter(f => String(f[8]) === evento);
  };
  return api;
}

/* La jornada de la mañana y la de la tarde, completas, en ese orden. Devuelve el api ya cargado. */
function p086DosJornadas() {
  const api = p086Env();
  api.__guardar('salida_casa',  p086Iso(5, 0));
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  api.__guardar('salida_aero',  p086Iso(11, 0), { test: 'perelli', resultado: '4' });
  api.__guardar('llegada_casa', p086Iso(12, 0));
  api.__guardar('salida_casa',  p086Iso(15, 0));
  api.__guardar('llegada_aero', p086Iso(16, 0), { test: 'kss', resultado: '8' });
  api.__guardar('salida_aero',  p086Iso(20, 0), { test: 'perelli', resultado: '6' });
  api.__guardar('llegada_casa', p086Iso(21, 0));
  return api;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · LO QUE ESTABA ROTO: dos jornadas el mismo día
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ dos jornadas el mismo día conservan LAS DOS, con sus ocho eventos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = p086DosJornadas();
  PRUEBAS.igual(api.__filas().length, 8,
    '⚠️ ocho eventos registrados tienen que dejar ocho filas. Antes quedaban cuatro: la segunda ' +
    'jornada pisaba a la primera evento por evento');
});

PRUEBAS.caso('⚠️ EL DATO QUE SE PERDÍA: el KSS de la mañana sigue estando', () => {
  /* El caso concreto de la auditoría. `llegada_aero` dispara el test KSS y el resultado viaja
     pegado a la fila del evento: si la fila se pisa, el resultado clínico de la mañana desaparece
     y nadie se entera. Se comprueba que están LOS DOS puntajes, no que haya dos filas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086DosJornadas();
  const llegadas = api.__deEvento('llegada_aero');
  PRUEBAS.igual(llegadas.length, 2, 'dos llegadas al aeropuerto en el día');
  const puntajes = llegadas.map(f => String(f[10])).sort();
  PRUEBAS.igual(puntajes.join(','), '3,8',
    '⚠️ tienen que estar el KSS 3 de la mañana Y el KSS 8 de la tarde (quedó: ' + puntajes.join(',') + ')');
  const horas = llegadas.map(f => String(f[1])).sort();
  PRUEBAS.igual(horas.join(','), '06:00,16:00', '⚠️ y cada uno con su hora, no las dos con la última');
});

PRUEBAS.caso('⚠️ y el plan congelado de cada jornada queda pegado a SU fila (Y4)', () => {
  /* El plan es el umbral contra el que se juzga el exceso, congelado por fila. Si la fila se
     reescribe, se pierde el umbral con el que se juzgó la jornada de la mañana. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const plan12 = JSON.stringify({ traslado_ida: 60, jornada: 720, traslado_vta: 60 });
  const plan8  = JSON.stringify({ traslado_ida: 60, jornada: 480, traslado_vta: 60 });
  api.__guardar('llegada_aero', p086Iso(6, 0),  { plan: plan12 });
  api.__guardar('llegada_aero', p086Iso(16, 0), { plan: plan8 });
  const planes = api.__deEvento('llegada_aero').map(f => String(f[11]));
  PRUEBAS.igual(planes.length, 2, 'dos filas');
  PRUEBAS.cierto(planes.indexOf(plan12) >= 0 && planes.indexOf(plan8) >= 0,
    '⚠️ cada jornada conserva el umbral vigente cuando ocurrió, no el de la última');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · EL OTRO LADO DE LA TENSIÓN: el mismo hecho reenviado NO duplica
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ el MISMO evento reenviado cinco veces sigue siendo UNA fila', () => {
  /* `enviarConCola` congela la URL entera —con su `iso` adentro— en el momento del toque, y la
     reintenta cada minuto hasta que entra. O sea que el reintento llega con el ISO IDÉNTICO, no
     con el de cuando reintentó: es exactamente eso lo que permite distinguirlo de otra jornada.
     Si el arreglo se hiciera con un append ciego, este caso se pondría en rojo con cinco filas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const iso = p086Iso(6, 0);
  const r = [];
  for (let i = 0; i < 5; i++) r.push(api.__guardar('llegada_aero', iso, { test: 'kss', resultado: '3' }));
  PRUEBAS.igual(api.__filas().length, 1, '⚠️ cinco envíos del mismo hecho, una sola fila');
  PRUEBAS.cierto(r[0].nuevo === true, 'el primero es nuevo');
  PRUEBAS.cierto(r[4].actualizado === true, '⚠️ y el quinto contesta "actualizado", no "nuevo"');
});

PRUEBAS.caso('⚠️ el DOBLE TOQUE a tres minutos tampoco duplica', () => {
  /* Sin esto, el arreglo cambiaría un bug de pérdida por uno de basura: `leerDuty` corta un ciclo
     nuevo con cada evento de apertura repetido, así que dos `llegada_aero` a tres minutos le
     dibujarían a la persona una jornada fantasma de dos minutos y otra abierta. Se conserva el
     ÚLTIMO toque, que es lo que ya hacía el upsert viejo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  api.__guardar('llegada_aero', p086Iso(6, 0), { test: 'kss', resultado: '3' });
  api.__guardar('llegada_aero', p086Iso(6, 3), { test: 'kss', resultado: '5' });
  PRUEBAS.igual(api.__filas().length, 1, '⚠️ un retoque a tres minutos es el mismo hecho');
  PRUEBAS.igual(String(api.__filas()[0][10]), '5', 'y queda el último valor');
});

PRUEBAS.caso('⚠️ el reintento de la SEGUNDA jornada tampoco duplica', () => {
  /* El caso que un arreglo a medias deja pasar. La segunda ocurrencia se guarda con un id nuevo
     (`<base>#<marca>`), así que si el servidor sólo mirara el id BASE que manda el cliente, cada
     reintento de la segunda jornada encontraría la fila de la MAÑANA, vería que el ISO no coincide
     y appendearía otra vez. Y otra. Una fila por reintento. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  for (let i = 0; i < 4; i++) api.__guardar('llegada_aero', p086Iso(16, 0), { test: 'kss', resultado: '8' });
  for (let i = 0; i < 3; i++) api.__guardar('llegada_aero', p086Iso(22, 0), { test: 'kss', resultado: '9' });
  PRUEBAS.igual(api.__filas().length, 3,
    '⚠️ tres jornadas con reintentos son tres filas, no una por envío');
  PRUEBAS.igual(api.__deEvento('llegada_aero').map(f => String(f[10])).sort().join(','), '3,8,9',
    'y los tres puntajes distintos siguen ahí');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   3 · COMPATIBILIDAD: la app vieja del celular de alguien no puede romperse
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ APP VIEJA · una fila escrita con el id sin cédula se ACTUALIZA, no se duplica', () => {
  /* El id cambió de `op_<nombre>_…` a `op_c<cédula>_…` y por eso viaja `idPrevio`. Una fila ya
     escrita con el id viejo tiene que seguir encontrándose: si no, el día que se publica esto cada
     persona duplicaría su evento del día. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const hoy = p086Hoy();
  // La app vieja: manda el id por nombre y NO manda `idPrevio`.
  api.accionOperacionalGuardar({
    id: 'op_ana suarez_' + hoy + '_llegada_aero', fecha: hoy, hora: '06:00', iso: p086Iso(6, 0),
    evento: 'llegada_aero', persona: 'Ana Suárez', empresa: 'Helitec', test: 'kss', resultado: '3',
    plan: P086_PLAN
  });
  // La app nueva, el mismo hecho: tiene que caer sobre esa misma fila y migrarle el id.
  const r = api.__guardar('llegada_aero', p086Iso(6, 0), { test: 'kss', resultado: '3' });
  PRUEBAS.cierto(r.actualizado === true, '⚠️ la reconoce como la misma');
  PRUEBAS.igual(api.__filas().length, 1, '⚠️ una sola fila: no se duplicó el día del cambio de id');
  PRUEBAS.igual(String(api.__filas()[0][3]), 'op_c111_' + hoy + '_llegada_aero',
    'y la fila migró al id nuevo');
});

PRUEBAS.caso('⚠️ APP VIEJA · la que sigue mandando el id por nombre TAMBIÉN queda arreglada', () => {
  /* Lo que hace que este arreglo sirva de verdad: no necesita que nadie actualice la app. Un
     celular con la versión de hace un mes manda lo mismo que siempre —incluido el `iso`, que ya
     viajaba— y a partir del momento en que se publica el `.gs` sus dos jornadas se conservan. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const hoy = p086Hoy();
  const viejo = (iso, resultado) => JSON.parse(api.accionOperacionalGuardar({
    id: 'op_ana suarez_' + hoy + '_llegada_aero', fecha: hoy, hora: iso.slice(11, 16), iso: iso,
    evento: 'llegada_aero', persona: 'Ana Suárez', empresa: 'Helitec', test: 'kss',
    resultado: resultado, plan: P086_PLAN
  }).getContent());
  viejo(p086Iso(6, 0), '3');
  viejo(p086Iso(6, 0), '3');    // reintento de la cola
  viejo(p086Iso(16, 0), '8');   // segunda jornada
  PRUEBAS.igual(api.__filas().length, 2,
    '⚠️ dos jornadas y un reintento, desde una app SIN actualizar, dan dos filas');
  PRUEBAS.igual(api.__deEvento('llegada_aero').map(f => String(f[10])).sort().join(','), '3,8',
    'y los dos puntajes se conservan');
});

PRUEBAS.caso('⚠️ APP RARA SIN `iso` · se cae al upsert de antes y no inventa filas', () => {
  /* Sin ISO no hay forma de distinguir un reenvío de una jornada nueva. Se conserva a propósito el
     comportamiento viejo: appendear una fila por cada reintento de una app que no manda `iso`
     sería una regresión invisible. Hoy ninguna versión publicada está en este caso —la columna ISO
     existe desde que se creó la hoja—, pero el cinturón tiene que estar probado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const hoy = p086Hoy();
  const sinIso = () => JSON.parse(api.accionOperacionalGuardar({
    id: 'op_c111_' + hoy + '_llegada_aero', fecha: hoy, hora: '06:00',
    evento: 'llegada_aero', persona: 'Ana Suárez', empresa: 'Helitec', test: 'kss', resultado: '3'
  }).getContent());
  sinIso(); const r = sinIso(); sinIso();
  PRUEBAS.igual(api.__filas().length, 1, '⚠️ tres envíos sin ISO siguen siendo una fila');
  PRUEBAS.cierto(r.sinIso === true, 'y la respuesta dice por qué camino fue');
});

PRUEBAS.caso('⚠️ dos empresas con el mismo nombre de persona siguen sin pisarse', () => {
  /* El recorte por empresa lo cerró la auditoría del 2026-09-03 y no puede haberse perdido al
     reescribir la búsqueda: dos "Ana Suárez" en dos clientes distintos generan el MISMO id. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  api.__guardar('llegada_aero', p086Iso(6, 0), { test: 'kss', resultado: '3' });
  api.__guardar('llegada_aero', p086Iso(6, 0), { test: 'kss', resultado: '9', empresa: 'Cardón' });
  PRUEBAS.igual(api.__filas().length, 2, '⚠️ cada empresa tiene su fila');
  PRUEBAS.igual(api.__deEvento('llegada_aero').map(f => String(f[10])).sort().join(','), '3,9',
    'y ninguna pisó a la otra');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   4 · R15 · QUIÉN LO LEE DESPUÉS — el contrato con el panel, no sólo la hoja
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ el LECTOR REAL ve las dos jornadas, con sus minutos', () => {
  /* R17: la hoja quedando bien no alcanza, porque el eslabón que importa es el que lee. `leerDuty`
     ya sabía cortar dos ciclos en un día —su comentario dice textual "dos `llegada_aero` son dos
     jornadas"—; lo que nunca pudo fue RECIBIRLAS, porque el escritor las destruía antes. Acá se
     entra por `leerOperacionalCompleto()`, que es de donde salen de verdad. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086DosJornadas();
  const duty = api.leerDuty(api.leerOperacionalCompleto(7), 7);
  PRUEBAS.igual(duty.diario.length, 2, '⚠️ el panel tiene que ver DOS ciclos, no uno');
  const jornadas = duty.diario.map(d => d.jornadaMin).sort((a, b) => a - b);
  PRUEBAS.igual(jornadas.join(','), '240,300',
    '⚠️ la de la mañana 06→11 son 300 min y la de la tarde 16→20 son 240 (dio: ' + jornadas.join(',') + ')');
  PRUEBAS.cierto(duty.diario.every(d => d.jornadaMin > 0),
    '⚠️ y ninguna da negativa: con la fila pisada la secuencia quedaba 16:00 → 11:00 y `fin - ini` ' +
    'daba un número negativo, que es peor que un dato faltante porque parece un dato');
  PRUEBAS.igual(duty.sinUmbralCongelado, 0, 'los dos ciclos con su umbral congelado (Y4)');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   5 · DISCRIMINADORES · que la prueba de arriba pueda ponerse en rojo
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ DISCRIMINADOR · el mecanismo viejo SIGUE pisando la fila', () => {
  /* R17: un cero sin discriminador no es un resultado. Los casos de arriba comprueban que ya NO se
     pierde nada, y una prueba así pasa igual de bien si el arnés no está escribiendo nada.
     Acá se rompe a propósito: se llama a `upsertPorId` —que es LITERALMENTE el mecanismo que tenía
     `accionOperacionalGuardar` antes, sin tocar, y que siguen usando Turnos y Consentimientos—
     sobre la MISMA hoja y con el MISMO id. Tiene que pisar la fila y dejar el KSS de la mañana sin
     rastro. Si esto se pusiera en rojo, querría decir que el emulador no está reescribiendo filas
     y que todos los casos de arriba estaban pasando por la razón equivocada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  const hoy = p086Hoy();
  const id = 'op_c111_' + hoy + '_llegada_aero';
  const sh = api.obtenerHojaOperacional();
  const fila = (iso, res) => [hoy, iso.slice(11, 16), iso, id, 'Ana Suárez', 'Helitec',
                              'Operaciones', 'Piloto', 'llegada_aero', 'kss', res, P086_PLAN];

  const a = api.upsertPorId(sh, 4, id, fila(p086Iso(6, 0), '3'), 6, 'Helitec');
  const b = api.upsertPorId(sh, 4, id, fila(p086Iso(16, 0), '8'), 6, 'Helitec');
  PRUEBAS.cierto(a.nuevo === true && b.actualizado === true, 'el segundo cae sobre el primero');
  PRUEBAS.igual(api.__filas().length, 1,
    '⚠️ DISCRIMINADOR: el upsert pelado deja UNA fila donde hubo dos jornadas');
  PRUEBAS.igual(String(api.__filas()[0][10]), '8',
    '⚠️ DISCRIMINADOR: y el KSS 3 de la mañana no está en ningún lado. Este es exactamente el ' +
    'defecto que P086 arregla; si este caso deja de dar 8, la medición dejó de medir');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · el lector distingue un ciclo de dos', () => {
  /* El espejo del anterior, del lado del lector: se comprueba que `leerDuty` NO devuelve siempre
     dos ciclos. Con una sola jornada tiene que devolver uno. Sin esto, el caso de "el panel ve las
     dos jornadas" pasaría aunque el lector partiera cualquier cosa en dos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p086Env();
  api.__guardar('salida_casa',  p086Iso(5, 0));
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  api.__guardar('salida_aero',  p086Iso(11, 0), { test: 'perelli', resultado: '4' });
  api.__guardar('llegada_casa', p086Iso(12, 0));
  const duty = api.leerDuty(api.leerOperacionalCompleto(7), 7);
  PRUEBAS.igual(duty.diario.length, 1,
    '⚠️ DISCRIMINADOR: una sola jornada tiene que dar UN ciclo. Si diera dos, el caso del panel ' +
    'estaría pasando por un lector que parte de más y no por el arreglo');
  PRUEBAS.igual(duty.diario[0].jornadaMin, 300, 'y sus 300 minutos');
});
