PRUEBAS.grupo('P090 · jornadas fundidas y registros sueltos, y el doble toque que NO es una pérdida');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO                                             (caso 5 del plan de P090)

   DOS PÉRDIDAS QUE NO SON LA MISMA COSA, y confundirlas es lo que este archivo existe para impedir.

   1 · EL MOTOR PISA, Y ESO SÍ ES UNA PÉRDIDA.
       `cicloAgruparNucleo` sólo abre ciclo con el evento inicial (`salida_casa`). Dos jornadas
       seguidas SIN volver a casa quedan fundidas en un solo ciclo, y adentro `actual.ev[evento] = o`
       se queda con el MÁS NUEVO: el segundo `llegada_aero` reemplaza al primero. El residuo de P086
       del lado del cliente. Esos registros existen en la hoja y no están en ninguna jornada: son
       los SUELTOS, y el detalle del día tiene que listarlos con su hora y explicar por qué.

   2 · EL COLAPSO DESCARTA, Y ESO **NO** ES UNA PÉRDIDA.
       `cicloColapsarMismaOcurrencia` junta a propósito dos ocurrencias del mismo evento a menos de
       20 minutos: es el doble toque legítimo («lo volví a tocar porque no estaba seguro») y el
       reintento de la cola, o sea lo NORMAL con R7. Están documentados dos casos reales de
       producción: P186d (dos `salida_casa` a 3 minutos) y P186e (dos filas a 9 ms, el 2026-09-15).

   POR ESO `cmesSueltosPorDia` SE COMPARA CONTRA LA LISTA COLAPSADA Y NUNCA CONTRA LA CRUDA. Contra
   la cruda, cada doble toque legítimo habría pintado «hay más registros que jornadas» en un día
   sano: una acusación FALSA de perder datos, en la pantalla de la persona, en una app de fatiga.
   El segundo caso de este archivo es exactamente eso, y es el que más importa: si alguien cambia la
   fuente de `sueltos` por la lista cruda, se pone rojo.

   ⚠️ SE ENTRA POR EL CAMINO REAL, LOS CUATRO ESLABONES (R17): `accionOperacionalGuardar` (escritor
   de verdad, sobre el emulador) → `leerOperacionalCompleto()` → `onDashData(payload, …)` →
   `dashGoPerson()`. Nada de `DASH = {…}`.

   ⚠️ CÓMO SE PRODUCE EL DOBLE TOQUE A 3 MINUTOS, que es lo único que no sale directo del escritor.
   `accionOperacionalGuardar` junta en UNA fila dos envíos del mismo evento a menos de 20 minutos
   cuando comparten familia de id (P086 ya lo prueba). Las dos filas de producción aparecieron por
   una carrera que un emulador de un solo hilo no puede reproducir. Lo que sí se puede es producir
   el MISMO resultado en la hoja —dos filas del mismo evento, la misma persona, a 3 minutos— por el
   escritor REAL, mandando el segundo envío con otra familia de id (un teléfono con otra cédula
   cargada). La precondición se AFIRMA antes de medir nada: si la hoja no queda con dos filas, el
   discriminador no está discriminando.

   ⚠️ ZONA FIJADA EN `UTC` en el payload: una casilla ES un día y la hora del suelto se muestra en la
   zona de la operación, así que el caso no puede depender de dónde corra el navegador.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Guarda de dependencia: los ayudantes de siembra son los de P086 (funciones declaradas, visibles
   desde acá; las `const` de otro archivo no lo son). Si los renombran, el caso tiene que decir POR
   QUÉ falló en vez de tirar un `ReferenceError`. */
function p090fAyudantes(){
  return typeof p086Env === 'function' && typeof p086Iso === 'function' && typeof p086Hoy === 'function';
}

function p090fPayload(operacional){
  return {
    ok: true, rol: 'supervisor', vista: 'medico', combinada: false,
    referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Helitec', departamento: 'Operaciones',
                  cargo: 'Piloto', fecha: p086Hoy(), kss: 4 }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null,
    ausencias: {}, config: {}, visor: null, visorError: null,
    nominaTotal: 1, nominaSinDato: [],
    operacional: operacional,
    /* Sin cobertura el mes entero sale `fuera` (`cmesCasoDia` pregunta por ella ANTES que por los
       ciclos) y el caso mediría una casilla muerta. */
    operacionalPeriodo: { dias: 30, desde: null, hasta: null, puedeVerHistorico: true },
    zonaOp: 'UTC'
  };
}

/* Deja el panel abierto en la ficha médica de Ana Suárez, por el camino real, y devuelve la función
   que limpia (R18). Esta prueba es SINCRÓNICA de punta a punta: un `finally` de bloque alcanza. Si
   alguna vez disparara una promesa, la restauración tendría que ir en el `.finally()` DE ESA
   PROMESA — el `finally` sincrónico corre antes que el `.then` y deja el `fetch` de este caso
   puesto para la prueba siguiente (ya costó cuatro rojos falsos). */
function p090fEntrar(operacional){
  const prevLS = Object.assign({}, localStorage);
  const prevDash = DASH;
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  const prevGate = gate ? gate.style.display : '', prevPanel = panel ? panel.style.display : '';
  CTX.resetear();                       // sin esto, un `cicloPlan` que dejó otro caso cambia la ventana de agrupación
  const oFetch = window.fetch, oReloj = window.fetchConReloj;
  window.fetch = () => new Promise(() => {});
  window.fetchConReloj = () => new Promise(() => {});
  try {
    /* Params SIN contraseña: apagan `gestCanSync()` y con eso los pedidos laterales del panel. */
    onDashData(p090fPayload(operacional), 'Helitec',
               { action: 'empleado', empresa: 'Helitec', persona: 'Ana Suárez' }, 'medico');
    dashGoPerson('Ana Suárez');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj;
    stopDashAutoRefresh(); cicloTickStop();
  }
  return function fin(){
    stopDashAutoRefresh(); cicloTickStop();
    DASH = prevDash;
    if (gate) gate.style.display = prevGate;
    if (panel) panel.style.display = prevPanel;
    try { const b = document.getElementById('dashBody'); if (b) b.innerHTML = ''; } catch(e){}
    try { _fopFmt = null; _fopZona = null; _hopFmt = null; _hopZona = null; } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  };
}

function p090fCeldas(f){ return document.querySelectorAll('#cmesPanel .cmes-d[data-f="' + f + '"]'); }
function p090fDetalle(){ return document.querySelector('#cmesPanel .cmes-det'); }

/* DOS JORNADAS SEGUIDAS SIN VOLVER A CASA: sale de casa una vez y hace dos vueltas al sitio. Seis
   eventos, un solo `salida_casa`. Es la forma que el motor funde. */
function p090fSinVolverACasa(){
  const api = p086Env();
  api.__guardar('salida_casa',  p086Iso(5, 0));
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  api.__guardar('salida_aero',  p086Iso(11, 0), { test: 'perelli', resultado: '4' });
  api.__guardar('llegada_aero', p086Iso(16, 0), { test: 'kss', resultado: '8' });    // pisa al de las 06:00
  api.__guardar('salida_aero',  p086Iso(20, 0), { test: 'perelli', resultado: '6' }); // pisa al de las 11:00
  api.__guardar('llegada_casa', p086Iso(21, 0));
  return api;
}

/* EL DOBLE TOQUE LEGÍTIMO (P186d): una jornada normal y completa, con el `salida_casa` tocado dos
   veces a 3 minutos. El segundo envío va con otra familia de id para que el escritor real deje las
   DOS filas (ver el encabezado). */
function p090fDobleToque(){
  const api = p086Env();
  const hoy = p086Hoy();
  api.__guardar('salida_casa',  p086Iso(5, 0));
  api.__guardar('salida_casa',  p086Iso(5, 3),
                { id: 'op_c222_' + hoy + '_salida_casa', idPrevio: '' });
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  api.__guardar('salida_aero',  p086Iso(11, 0), { test: 'perelli', resultado: '4' });
  api.__guardar('llegada_casa', p086Iso(12, 0));
  return api;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · LO QUE EL MOTOR PISA SÍ SE DECLARA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ P090 · dos jornadas SIN volver a casa se funden en una, y el detalle declara los registros que quedaron afuera', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  PRUEBAS.cierto(p090fAyudantes(),
    'guarda: la siembra usa los ayudantes de p086-jornadas-mismo-dia.js. Si los renombraron, se ' +
    'actualiza la siembra, no el calendario');
  if (!p090fAyudantes()) return;

  const api = p090fSinVolverACasa();
  PRUEBAS.igual(api.__filas().length, 6,
    'guarda del ESCRITOR: los seis eventos están en `Operacional`. El servidor NO pierde nada (P086); ' +
    'lo que se mide acá es qué hace el cliente con esas seis filas');

  const fin = p090fEntrar(api.leerOperacionalCompleto(7));
  try {
    PRUEBAS.existe('#cmesPanel',
      '⚠️ guarda de medibilidad: el calendario tiene que llegar al DOM de la ficha médica; si no, ' +
      'todo lo de abajo mide el aire');
    const hoy = p086Hoy();
    const celdas = p090fCeldas(hoy);
    PRUEBAS.igual(celdas.length, 1, 'guarda: una casilla para el día');
    if (!celdas.length) return;

    /* La fusión, medida sobre la derivación real y no sobre un literal. */
    const fuente = cmesFuente('panel', 'Ana Suárez', cmesMes('panel'));
    PRUEBAS.igual(fuente.colapsados.length, 6,
      'guarda: el motor VIO los seis registros (ninguno cae por el colapso: están a horas de distancia)');
    PRUEBAS.igual(fuente.ciclos.length, 1,
      '⚠️ y los funde en UN solo ciclo, porque sólo `salida_casa` abre jornada. El motor no se toca ' +
      'en este prompt: lo que cambia es que ahora se DICE');
    PRUEBAS.igual(celdas[0].querySelector('.cmes-p2'), null,
      'por eso la casilla no lleva marca de cantidad: para el motor es una sola jornada');

    cmesSeleccionar('panel', hoy);
    const det = p090fDetalle();
    PRUEBAS.cierto(!!det, 'guarda: tocar la casilla abre el detalle en el lugar');
    if (!det) return;

    const bloque = det.querySelector('.cmes-det-sueltos');
    PRUEBAS.cierto(!!bloque,
      '⚠️ el detalle declara los registros que quedaron afuera de la jornada. Sin esto, el KSS de las ' +
      '06:00 y la salida de las 11:00 existen en el CH y NO están en ninguna pantalla');
    if (!bloque) return;
    PRUEBAS.cierto(bloque.textContent.indexOf(t('cmes_det_sueltos', { n: 2 })) >= 0,
      '⚠️ y dice cuántos son: «' + t('cmes_det_sueltos', { n: 2 }) + '» (son el `llegada_aero` de las ' +
      '06:00 y el `salida_aero` de las 11:00, que el segundo par reemplazó en memoria)');
    PRUEBAS.cierto(bloque.textContent.indexOf(t('cmes_det_por_que')) >= 0,
      'con la explicación de por qué pasa, no sólo el número: un contador sin causa se lee como un error de la app');

    const sueltos = [...bloque.querySelectorAll('.cmes-suelto')].map(s => s.textContent);
    PRUEBAS.igual(sueltos.length, 2, 'los dos, listados uno por uno · ' + sueltos.join(' | '));
    PRUEBAS.cierto(sueltos.some(s => s.indexOf('06:00') >= 0) && sueltos.some(s => s.indexOf('11:00') >= 0),
      '⚠️ CADA UNO CON SU HORA (06:00 y 11:00), en la zona de la operación. Sin la hora no se puede ' +
      'cruzar con la planilla, que es para lo único que sirve declararlos · ' + sueltos.join(' | '));
    PRUEBAS.igual(det.querySelectorAll('.cmes-det-ciclo').length, 1,
      'y la jornada sigue siendo una: los sueltos se suman, no inventan un ciclo');
  } finally { fin(); }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · EL DISCRIMINADOR QUE MÁS IMPORTA · el doble toque legítimo NO es una pérdida
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ DISCRIMINADOR · dos `salida_casa` a 3 minutos (P186d) dejan los sueltos VACÍOS: el doble toque no es una acusación', () => {
  /* El caso real de producción. Si `cmesSueltosPorDia` comparara contra la lista CRUDA en vez de la
     colapsada, este día —una jornada completa y sana— diría «1 registro no quedó dentro de ninguna
     jornada». Esa frase, en la pantalla de la persona, es una acusación falsa de que la app perdió
     su dato, y pasaría con CADA doble toque y con cada reintento de la cola (R7), o sea todos los
     días. Es lo más caro que puede salir mal en esta pantalla. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p090fAyudantes()) { PRUEBAS.cierto(false, 'faltan los ayudantes de p086'); return; }

  const api = p090fDobleToque();
  PRUEBAS.igual(api.__deEvento('salida_casa').length, 2,
    '⚠️ PRECONDICIÓN DEL DISCRIMINADOR: la hoja tiene que quedar con DOS `salida_casa` a 3 minutos. ' +
    'Si quedara una sola, el caso estaría midiendo un día normal y daría verde sin discriminar nada');
  PRUEBAS.igual(api.__filas().length, 5, 'y cinco filas en total: la jornada completa más el retoque');

  const fin = p090fEntrar(api.leerOperacionalCompleto(7));
  try {
    PRUEBAS.existe('#cmesPanel', 'guarda de medibilidad: el calendario está en el DOM');
    const hoy = p086Hoy();
    PRUEBAS.igual(p090fCeldas(hoy).length, 1, 'guarda: una casilla para el día');

    cmesSeleccionar('panel', hoy);
    const det = p090fDetalle();
    PRUEBAS.cierto(!!det, 'guarda: el detalle abre');
    if (!det) return;

    PRUEBAS.igual(det.querySelector('.cmes-det-sueltos'), null,
      '⚠️ EL ASERTO CENTRAL: un doble toque legítimo NO deja ningún registro suelto. La pantalla no ' +
      'puede acusar a la app de perder un dato cada vez que alguien toca dos veces el mismo botón');
    PRUEBAS.igual(det.querySelectorAll('.cmes-det-ciclo').length, 1,
      'y sigue habiendo UNA jornada, no una fantasma de un solo evento (es el defecto que arregló P186d)');

    /* Y ahora el contrafáctico, sobre la derivación REAL, para que este cero no sea un cero vacío:
       con la lista COLAPSADA no hay sueltos; con la CRUDA —que es lo que el servidor mandó y lo que
       una implementación distraída usaría— aparece uno. Si las dos dieran lo mismo, esta prueba no
       estaría midiendo la decisión que protege. */
    const fuente = cmesFuente('panel', 'Ana Suárez', cmesMes('panel'));
    const crudas = (DASH.operacional || []).slice().sort((a, b) => new Date(a.iso) - new Date(b.iso));
    PRUEBAS.igual(crudas.length, 5, 'guarda: al cliente le llegaron las cinco filas crudas');
    PRUEBAS.igual(fuente.colapsados.length, 4,
      'el motor ve CUATRO: los dos `salida_casa` a 3 minutos son un solo hecho y gana el más nuevo');
    PRUEBAS.igual((cmesSueltosPorDia(fuente.colapsados, fuente.ciclos)[hoy] || []).length, 0,
      '⚠️ contra la lista COLAPSADA (lo que hace la app): cero sueltos');
    PRUEBAS.igual((cmesSueltosPorDia(crudas, fuente.ciclos)[hoy] || []).length, 1,
      '⚠️ DISCRIMINADOR: contra la lista CRUDA aparecería UN suelto —el `salida_casa` de las 05:00 que ' +
      'el colapso descartó a propósito—. Este número prueba que el aserto de arriba no es un cero ' +
      'vacío: si alguien cambia la fuente de `sueltos` por la cruda, el detalle vuelve a acusar');
  } finally { fin(); }
});
