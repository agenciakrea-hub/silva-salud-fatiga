PRUEBAS.grupo('P090 · dos jornadas el mismo día en el calendario de la ficha médica');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO                                             (caso 4 del plan de P090)

   P086 arregló el ESCRITOR: dos jornadas el mismo día ya no se pisan en `Operacional`. Lo que
   nadie miraba es qué pasa después con esas dos filas cuando alguien las mira en una PANTALLA.
   El calendario es la primera pantalla que las dibuja, y dibuja UNA casilla por día: si la celda
   mostrara una sola jornada, el arreglo del servidor estaría entregando un dato que el cliente
   vuelve a perder — la variante exacta del defecto que más veces se repitió en este repo
   (escritor y lector derivando distinto).

   Lo que se afirma acá:
     · las dos jornadas caen en UNA casilla, no en dos;
     · esa casilla lleva la marca de cantidad y su `aria-label` dice «2 jornadas»;
     · el detalle del día lista LAS DOS, cada una con su hora de salida de casa (05:00 y 15:00).

   ⚠️ SE ENTRA POR EL CAMINO REAL, LOS CUATRO ESLABONES (R17):
     `accionOperacionalGuardar` (el escritor de verdad, sobre el emulador)
       → `leerOperacionalCompleto()` (el lector de verdad)
       → `onDashData(payload, …)` (la única puerta por la que el panel recibe datos)
       → `dashGoPerson()` (lo que hace el médico al tocar a alguien).
   Nada de `DASH = {…}` ni de filas de `Operacional` escritas a mano: eso prueba la función, no que
   el llamador de verdad le pueda dar lo que pide. Ya se cobró tres funciones entregadas en verde.

   ⚠️ SE REUSAN LOS AYUDANTES DE `p086-jornadas-mismo-dia.js` y no se copian. Son `function`
   declaradas, así que se ven desde acá (las `const` de otro archivo NO: quedan en el ámbito léxico
   de su propio eval). Reusarlas es lo que ata este caso al molde vivo: el día que cambie la forma
   con la que la app guarda una jornada, este caso cambia con ella. Con una copia propia seguiría
   dando verde contra un molde viejo.

   ⚠️ LA ZONA SE FIJA EN `UTC` EN EL PAYLOAD. Una casilla ES un día, así que la zona es la unidad de
   medida de esta pantalla. `p086Iso(hh)` escribe ISO en UTC; con `zonaOp:'UTC'` el día y la hora
   que calcula el lector son los mismos que escribió el escritor, corra donde corra el navegador.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Guarda de dependencia: si alguien renombra los ayudantes de P086, el caso tiene que decir POR QUÉ
   falló en vez de tirar un `ReferenceError` que no explica nada. */
function p090dAyudantes(){
  return typeof p086DosJornadas === 'function' && typeof p086Env === 'function' &&
         typeof p086Iso === 'function' && typeof p086Hoy === 'function';
}

function p090dPayload(operacional){
  return {
    ok: true, rol: 'supervisor', vista: 'medico', combinada: false,
    referencia: { kss: 5 }, metricas: ['kss'],
    /* Con un registro de test, `dashFichaMedica` entra por su rama COMPLETA, que es donde el médico
       mira a alguien que además hace tests. La rama reducida la cubre el caso 10 del plan. */
    registros: [{ persona: 'Ana Suárez', empresa: 'Helitec', departamento: 'Operaciones',
                  cargo: 'Piloto', fecha: p086Hoy(), kss: 4 }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null,
    ausencias: {}, config: {}, visor: null, visorError: null,
    nominaTotal: 1, nominaSinDato: [],
    operacional: operacional,
    /* ⚠️ SIN ESTO EL MES ENTERO SALE `fuera`: `cmesCasoDia` pregunta por la cobertura ANTES que por
       los ciclos, así que la casilla saldría muerta y el caso mediría una celda deshabilitada
       creyendo que mide una jornada. */
    operacionalPeriodo: { dias: 30, desde: null, hasta: null, puedeVerHistorico: true },
    zonaOp: 'UTC'
  };
}

/* Deja el panel abierto en la ficha médica de Ana Suárez, por el camino real. Devuelve la función
   que limpia todo (R18: lo que se ensucia se limpia, y esta prueba es SINCRÓNICA de punta a punta,
   así que un `finally` de bloque alcanza — si disparara una promesa habría que restaurar en el
   `.finally()` de ESA promesa). */
function p090dEntrar(operacional){
  const prevLS = Object.assign({}, localStorage);
  const prevDash = DASH;
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  const prevGate = gate ? gate.style.display : '', prevPanel = panel ? panel.style.display : '';
  CTX.resetear();                       // localStorage limpio: un `cicloPlan` que dejó otro caso cambiaría la ventana de agrupación
  const oFetch = window.fetch, oReloj = window.fetchConReloj;
  window.fetch = () => new Promise(() => {});
  window.fetchConReloj = () => new Promise(() => {});
  try {
    /* Params SIN contraseña: apagan `gestCanSync()` y con eso los pedidos laterales del panel
       (niveles, gestiones, reportes). El candado de red los cortaría igual, pero un caso que no los
       dispara tampoco ensucia el informe de `redCortada`. */
    onDashData(p090dPayload(operacional), 'Helitec',
               { action: 'empleado', empresa: 'Helitec', persona: 'Ana Suárez' }, 'medico');
    dashGoPerson('Ana Suárez');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj;
    stopDashAutoRefresh();              // el panel arranca su refresco de 24 h
    cicloTickStop();                    // y su reloj de 1 s
  }
  return function fin(){
    stopDashAutoRefresh(); cicloTickStop();
    DASH = prevDash;
    if (gate) gate.style.display = prevGate;
    if (panel) panel.style.display = prevPanel;
    /* `#cmesPanel` es un ID: si el bloque se queda en `#dashBody`, el caso siguiente que lo busque
       encuentra el mes de ESTA prueba y mide otra cosa. */
    try { const b = document.getElementById('dashBody'); if (b) b.innerHTML = ''; } catch(e){}
    /* Los formateadores de fecha/hora se cachean POR ZONA. Acá se forzó UTC: se invalidan para que
       el caso siguiente no herede la zona de esta prueba (mismo cuidado que `p169`). */
    try { _fopFmt = null; _fopZona = null; _hopFmt = null; _hopZona = null; } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  };
}

function p090dCeldas(f){ return document.querySelectorAll('#cmesPanel .cmes-d[data-f="' + f + '"]'); }
function p090dDetalle(){ return document.querySelector('#cmesPanel .cmes-det'); }

/* Una sola jornada completa, por el mismo escritor real que `p086DosJornadas`. Es el discriminador:
   sin él, «hay marca de dos» pasaría igual si la marca estuviera SIEMPRE. */
function p090dUnaJornada(){
  const api = p086Env();
  api.__guardar('salida_casa',  p086Iso(5, 0));
  api.__guardar('llegada_aero', p086Iso(6, 0),  { test: 'kss', resultado: '3' });
  api.__guardar('salida_aero',  p086Iso(11, 0), { test: 'perelli', resultado: '4' });
  api.__guardar('llegada_casa', p086Iso(12, 0));
  return api;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · LA CASILLA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ P090 · dos jornadas el mismo día dejan UNA casilla, marcada con «2»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  PRUEBAS.cierto(p090dAyudantes(),
    'guarda: este caso siembra con los ayudantes de p086-jornadas-mismo-dia.js. Si los renombraron, ' +
    'hay que actualizar la siembra, no el calendario');
  if (!p090dAyudantes()) return;

  const api = p086DosJornadas();
  PRUEBAS.igual(api.__filas().length, 8,
    'guarda del ESCRITOR: los ocho eventos tienen que estar en `Operacional`. Si P086 se rompiera, ' +
    'el calendario mediría cuatro filas y no habría nada que dibujar en dos jornadas');

  const filas = api.leerOperacionalCompleto(7);
  PRUEBAS.igual(filas.length, 8,
    'guarda del LECTOR: `leerOperacionalCompleto` las devuelve todas (es el eslabón que alimenta al panel)');

  const fin = p090dEntrar(filas);
  try {
    PRUEBAS.existe('#cmesPanel',
      '⚠️ guarda de medibilidad: el calendario tiene que llegar al DOM de la ficha médica. Sin esto ' +
      'todo lo de abajo mediría el aire, y un cero sin discriminador no es un resultado');
    const hoy = p086Hoy();
    const celdas = p090dCeldas(hoy);
    PRUEBAS.igual(celdas.length, 1,
      '⚠️ UNA sola casilla para el día, no dos: la decisión del dueño es que la celda no se parte ' +
      '(se lista un día por casilla, con el estado más grave y una marca con el número)');
    if (!celdas.length) return;

    const btn = celdas[0];
    const marca = btn.querySelector('.cmes-p2');
    PRUEBAS.cierto(!!marca,
      '⚠️ la casilla lleva la marca de CANTIDAD (`.cmes-p2`). Sin ella, un día con dos jornadas se ve ' +
      'idéntico a un día con una, y el médico concluye que hubo una');
    /* ⚠️ ACTUALIZADO el 2026-09-23. Este aserto exigía que la marca fuera EXACTAMENTE «2», y era
       cierto mientras `descanso` no tenía glifo propio. Después se le dio uno —junto con `cerrado` y
       `curso`, que se veían los tres idénticos a «sin jornada registrada»— y el primer intento hizo
       que el glifo GANARA: la casilla mostraba «~» y el número desaparecía justo en los días con más
       para contar. Ahora van los dos («~2»). Se afirma que el número ESTÁ y que el orden es
       glifo+cantidad, no que el número esté solo. */
    const txtMarca = marca ? marca.textContent : '';
    const casoCel = (String(btn.className).match(/cmes-c-([a-z_]+)/) || [])[1] || '';
    PRUEBAS.cierto(txtMarca.indexOf('2') >= 0,
      '⚠️ y la marca dice cuántas son («' + txtMarca + '» contiene «2»): sin el número, un día con dos ' +
      'jornadas se lee igual que uno con una, y el médico concluye que hubo una');
    PRUEBAS.igual(txtMarca, cmesGlifo(casoCel) + '2',
      'la marca es el glifo del caso MÁS la cantidad, en ese orden · caso de la casilla: «' + casoCel + '»');
    const aria = btn.getAttribute('aria-label') || '';
    PRUEBAS.cierto(aria.indexOf(t('cmes_n_jornadas', { n: 2 })) >= 0,
      '⚠️ y el nombre accesible lo DICE: «' + t('cmes_n_jornadas', { n: 2 }) + '». La marca es de 6 px y ' +
      'aria-hidden; quien usa lector de pantalla sólo tiene esta cadena · aria-label: ' + aria);
  } finally { fin(); }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · EL DETALLE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ P090 · el detalle del día lista LAS DOS jornadas, cada una con su hora de salida de casa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p090dAyudantes()) { PRUEBAS.cierto(false, 'faltan los ayudantes de p086'); return; }

  const api = p086DosJornadas();
  const fin = p090dEntrar(api.leerOperacionalCompleto(7));
  try {
    const hoy = p086Hoy();
    PRUEBAS.igual(p090dCeldas(hoy).length, 1, 'guarda: la casilla del día está');
    /* Por el camino real de la interacción: es lo que corre cuando alguien toca la casilla. */
    cmesSeleccionar('panel', hoy);
    const det = p090dDetalle();
    PRUEBAS.cierto(!!det, 'guarda: tocar la casilla abre el detalle en el lugar (no un overlay: `silvaAtras()` no lo conoce)');
    if (!det) return;

    PRUEBAS.igual(det.querySelectorAll('.cmes-det-ciclo').length, 2,
      '⚠️ el detalle lista DOS jornadas. Es lo único que devuelve el dato que la casilla resume: ' +
      'si acá saliera una, el segundo vuelo del día no existiría en ninguna pantalla');
    PRUEBAS.cierto(det.textContent.indexOf(t('cmes_det_dos', { n: 2 })) >= 0,
      'y lo dice con todas las letras: «' + t('cmes_det_dos', { n: 2 }) + '»');

    /* La hora de apertura de cada ciclo: la PRIMERA fila de cada bloque es `salida_casa`, porque
       `cicloCiclosListaHtml` recorre `cicloEventos()` en su orden canónico. */
    const horas = [...det.querySelectorAll('.cmes-det-ciclo .cic-hist-dia')]
      .map(d => { const h = d.querySelector('.cic-hist-h'); return h ? h.textContent : ''; });
    PRUEBAS.igual(horas, ['05:00', '15:00'],
      '⚠️ las DOS horas de salida de casa, en orden cronológico (la persona lee mañana → tarde). ' +
      'Con la fila pisada de antes de P086 la de la mañana no existía · dio: ' + horas.join(','));
  } finally { fin(); }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   3 · DISCRIMINADOR · que la marca pueda NO estar
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ DISCRIMINADOR · con UNA sola jornada ese día no hay marca de cantidad y el detalle lista un ciclo', () => {
  /* Sin esto, los dos casos de arriba pasarían igual si la marca estuviera SIEMPRE puesta y el
     detalle listara siempre todo lo del día. Un cero sin discriminador no es un resultado, y una
     marca que está siempre tampoco. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p090dAyudantes()) { PRUEBAS.cierto(false, 'faltan los ayudantes de p086'); return; }

  const api = p090dUnaJornada();
  PRUEBAS.igual(api.__filas().length, 4, 'guarda: una jornada son cuatro filas');
  const fin = p090dEntrar(api.leerOperacionalCompleto(7));
  try {
    const hoy = p086Hoy();
    const celdas = p090dCeldas(hoy);
    PRUEBAS.igual(celdas.length, 1, 'guarda: la casilla del día está');
    if (!celdas.length) return;

    const btn = celdas[0];
    PRUEBAS.igual(btn.querySelector('.cmes-p2'), null,
      '⚠️ DISCRIMINADOR: con una sola jornada NO hay marca de cantidad. Si la hubiera, el caso de ' +
      'arriba estaría pasando por una marca que está siempre, no por las dos jornadas');
    const aria = btn.getAttribute('aria-label') || '';
    PRUEBAS.falso(aria.indexOf(t('cmes_n_jornadas', { n: 2 })) >= 0,
      '⚠️ DISCRIMINADOR: y el nombre accesible tampoco dice «2 jornadas» · aria-label: ' + aria);

    cmesSeleccionar('panel', hoy);
    const det = p090dDetalle();
    PRUEBAS.cierto(!!det, 'guarda: el detalle abre igual');
    if (!det) return;
    PRUEBAS.igual(det.querySelectorAll('.cmes-det-ciclo').length, 1,
      '⚠️ DISCRIMINADOR: el detalle lista UN ciclo. El de arriba no puede estar contando bloques que ' +
      'aparecen siempre de a dos');
    PRUEBAS.falso(det.textContent.indexOf(t('cmes_det_dos', { n: 2 })) >= 0,
      'y no anuncia dos jornadas donde hubo una');
    const horas = [...det.querySelectorAll('.cmes-det-ciclo .cic-hist-dia')]
      .map(d => { const h = d.querySelector('.cic-hist-h'); return h ? h.textContent : ''; });
    PRUEBAS.igual(horas, ['05:00'], 'con su única hora de salida de casa · dio: ' + horas.join(','));
  } finally { fin(); }
});
