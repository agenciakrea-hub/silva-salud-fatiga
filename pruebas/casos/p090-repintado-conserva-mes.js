/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 11 · EL REPINTADO NO SE LLEVA EL MES NI EL DÍA ABIERTO (2026-09-22)

   Los dos calendarios se rehacen solos, y por caminos distintos:
     · el del piloto, porque `misSincronizar` trae los ciclos DESPUÉS del primer pintado y
       `renderInicio()` termina en `cicloMiRefrescar()` (index.html:13694);
     · el del panel, porque cualquier dato que llega tarde —reportes, niveles, casos— y el refresco
       automático pasan por `dashRepintar()` (index.html:21472), que rehace `#dashBody` ENTERO.

   ⚠️ Ojo con el porqué, porque el comentario de `index.html:14183` lo atribuye a `cicloRepintar`
   «cada 60 s», y eso no es lo que destruye este bloque: `cicloRepintar` (`:24594`) sólo toca
   `#dsec-ciclo` y `#dsec-jornada`, y la ficha médica vive en `#dashBody` (`:21636`). El plan lo dice
   bien en su §«Dónde se cuelga cada calendario»: la ficha NO está en el tick de 60 s. Quien rehace
   la ficha es `renderDash()`, así que es por ahí que entra este caso.
   Si el mes elegido viviera en una variable local del render, quien se puso a mirar el mes pasado
   se quedaría sin él en el primer refresco —y sin ningún síntoma que lo explique: el bloque se ve
   perfecto, sólo que en otro mes—. Es el mismo defecto que P174 ya cobró con el historial.

   Por eso el estado vive AFUERA del render: `CMES` para el piloto (memoria de la sesión) y
   `DASH._cmesMes`/`_cmesDia`/`_cmesPer` para el panel, que es lo único que `renderDash()` no pisa.

   R17 · se entra por el camino REAL: `misSincronizar()` con el `fetch` estubado —nunca
   `K_CICLO_SRV_PER` escrito y leído por la misma prueba—, `onDashData` + `dashGoPerson`, y la
   navegación se hace TOCANDO los botones que dibuja `cmesBloqueHtml`, no llamando a `cmesMesIr`.
   Un `onclick` dentro de un template literal no es una raíz: si el botón sale disabled o sin
   manejador, tocarlo no hace nada y el caso tiene que verlo.
   R11 · nada de capturas ni de `innerText`: `querySelector` + `textContent`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · el mes y el día abierto sobreviven al repintado (y se resetean al cambiar de persona)');

function p090rcEv(persona, evento, iso){
  return { evento: evento, iso: iso, persona: persona, empresa: 'Consorcio HELITEC',
           departamento: 'Operaciones', cargo: 'Piloto', fecha: iso.slice(0, 10),
           plan: JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 }),
           test: '', resultado: null };
}
/* Las claves salen de `cicloEventos()` (idioma × sector, R14). Las horas en UTC a media
   mañana/tarde: con Caracas (−4) el día operativo es el mismo que `iso.slice(0,10)`, así que el
   recorte por fecha y la casilla hablan del mismo día. */
function p090rcCiclo(persona, f){
  const horas = ['13:00', '14:00', '21:00', '22:00'];
  return cicloEventos().slice(0, horas.length).map(function(e, i){
    return p090rcEv(persona, e.k, f + 'T' + horas[i] + ':00.000Z');
  });
}

const p090rcHoyYm = () => todayStr().slice(0, 7);
const p090rcAntYm = () => fechaMasDias(todayStr().slice(0, 7) + '-01', -1).slice(0, 7);
const p090rcMesVisible = raiz => (document.querySelector(raiz + ' .cmes-mes') || {}).textContent;

/* ── EL PILOTO ────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · piloto · elegir el mes anterior y un día, y `cicloMiRefrescar()` NO se los lleva (el estado vive en `CMES`)', async () => {
  const prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch;
  const antYm = p090rcAntYm(), dia = antYm + '-15';
  try {
    CTX.resetear();                 // perfil piloto + `renderSections()`: el arranque real
    CMES = undefined;               // R18: otro caso pudo dejar un mes elegido; acá se mide desde cero

    /* La cobertura y los ciclos entran por `misSincronizar()` con el `fetch` estubado. Escribir
       `K_CICLO_SRV_PER` a mano y leerlo acá mismo probaría `cmesCobertura`, no que el pedido real
       deje la flecha de «mes anterior» habilitada — que es de lo que depende todo el caso.
       400 días para que el mes anterior SIEMPRE caiga dentro, corra este caso el día que corra. */
    _misSincronizando = false;      // otro caso pudo dejarlo en vuelo
    window.fetch = () => Promise.resolve({ json: () => Promise.resolve({
      ok: true, registros: [], pvt: [], referencia: {}, metricas: [],
      operacional: p090rcCiclo(cicloYo(), dia),
      operacionalPeriodo: { dias: 400, desde: null, hasta: null, puedeVerHistorico: true }
    }) });
    const sincronizo = await misSincronizar();
    PRUEBAS.cierto(sincronizo, 'guarda: la sincronización real corrió (si no, no hay cobertura y el caso no mide nada)');
    PRUEBAS.cierto(!!document.getElementById('cmesMio'), 'guarda: el calendario del inicio está');
    PRUEBAS.igual(p090rcMesVisible('#cmesMio'), cmesMesLabel(p090rcHoyYm()), 'guarda: arranca en el mes de hoy');

    /* Mes anterior TOCANDO la flecha, no llamando a `cmesMesIr`. */
    const flechas = document.querySelectorAll('#cmesMio .cmes-flecha');
    PRUEBAS.igual(flechas.length, 2, 'guarda: las dos flechas están');
    PRUEBAS.falso(flechas[0].disabled, 'guarda: con 400 días de cobertura la flecha «anterior» está habilitada');
    flechas[0].click();
    PRUEBAS.igual(cmesMes('mio'), antYm, 'el mes elegido es el anterior');
    PRUEBAS.igual(p090rcMesVisible('#cmesMio'), cmesMesLabel(antYm), 'y el encabezado lo muestra');

    /* Un día, tocando la casilla. */
    const celda = document.querySelector('#cmesMio .cmes-d[data-f="' + dia + '"]');
    PRUEBAS.cierto(!!celda && !celda.disabled, 'guarda: la casilla del ' + dia + ' existe y se puede tocar');
    celda.click();
    PRUEBAS.igual(cmesDia('mio'), dia, 'el día quedó elegido');
    PRUEBAS.cierto(!!document.querySelector('#cmesMio .cmes-det'), 'guarda: el detalle se abrió');

    /* EL REPINTADO. Se guarda una referencia a un nodo de adentro: si `cicloMiRefrescar` no
       hiciera nada (por ejemplo, si volviera antes por no encontrar `.cic-mio`), todos los
       asertos de abajo pasarían sin haber medido nada. Esto es lo que lo impide. */
    const gridAntes = document.querySelector('#cmesMio .cmes-grid');
    cicloMiRefrescar();
    PRUEBAS.falso(document.contains(gridAntes), 'guarda: el bloque se rehízo de verdad (la grilla vieja ya no está en el documento)');

    PRUEBAS.igual(cmesMes('mio'), antYm, '🔴 después del repintado sigue el MES elegido');
    PRUEBAS.igual(p090rcMesVisible('#cmesMio'), cmesMesLabel(antYm), '🔴 y el encabezado también · antes esto volvía al mes de hoy sin avisar');
    PRUEBAS.igual(cmesDia('mio'), dia, '🔴 y sigue el DÍA elegido');
    PRUEBAS.cierto(!!document.querySelector('#cmesMio .cmes-det'), '🔴 con su detalle todavía abierto');
    PRUEBAS.igual((document.querySelector('#cmesMio .cmes-det-t') || {}).textContent, cmesFechaLarga(dia),
      'y es el detalle de ESE día, no de otro');
    PRUEBAS.cierto(!!document.querySelector('#cmesMio .cmes-d.cmes-sel[data-f="' + dia + '"]'),
      'y la casilla sigue marcada como elegida');

    /* DISCRIMINADOR · se borra el estado que vive AFUERA del render y se repinta igual: si el mes
       no dependiera de `CMES` —si lo guardara una variable local del render, que es el defecto que
       este caso protege— esto no cambiaría nada y los asertos de arriba serían verdes por casualidad. */
    CMES = undefined;
    cmesRepintar('mio', null);
    PRUEBAS.igual(p090rcMesVisible('#cmesMio'), cmesMesLabel(p090rcHoyYm()),
      'DISCRIMINADOR · sin `CMES` el repintado vuelve al mes de hoy · o sea que lo de arriba lo medía');
    PRUEBAS.falso(!!document.querySelector('#cmesMio .cmes-det'), 'DISCRIMINADOR · y el detalle se pierde');
  } finally {
    /* ⚠️ R18 · la limpieza va en el `finally` de la función ASYNC —corre después de los `await`—,
       nunca en un `try/finally` sincrónico alrededor de la promesa: ése corre antes que el `.then`
       y dejaría el `fetch` de este caso puesto para la prueba siguiente. Ya costó cuatro rojos. */
    window.fetch = oFetch;
    CMES = undefined;
    _misSincronizando = false;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { paintProfile(); renderSections(); } catch(e){}
  }
});

/* ── EL PANEL ─────────────────────────────────────────────────────────────────────────────── */

function p090rcEntrarMedico(){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  const hoy = todayStr(), dia = p090rcAntYm() + '-15';
  window.fetch = () => new Promise(() => {});
  window.fetchConReloj = () => new Promise(() => {});
  window.gestPost = () => Promise.resolve({ ok: true });
  const payload = {
    ok: true, rol: 'supervisor', vista: 'medico', combinada: false,
    referencia: { kss: 5 }, metricas: ['kss'],
    registros: [
      { persona: 'Ana Suárez',  empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 4 },
      { persona: 'Luis Ferrer', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 6 }
    ],
    operacional: p090rcCiclo('Ana Suárez', dia).concat(p090rcCiclo('Luis Ferrer', dia)),
    /* 400 días para que el mes anterior entre siempre en la cobertura, corra el día que corra. */
    operacionalPeriodo: { dias: 400, desde: null, hasta: null, puedeVerHistorico: true },
    zonaOp: 'America/Caracas',
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null,
    ausencias: {}, config: {}, visor: null, visorError: null
  };
  try {
    onDashData(payload, 'Consorcio HELITEC',
      { action: 'supervisor', usuario: 'usuario-p090rc', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p090rc' },
      'medico');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){
    window.gestPost = oPost;
    try { stopDashAutoRefresh(); } catch(e){}
    DASH = prevDash;
    /* el panel queda pintado aunque `DASH` vuelva atrás: si no se limpia, el `#cmesPanel` de este
       caso sigue en el documento para el caso siguiente (R18) */
    try { document.getElementById('dashBody').innerHTML = ''; } catch(e){}
    try {
      document.getElementById('portalDash').style.display = 'none';
      document.getElementById('portalGate').style.display = '';
    } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  };
}

PRUEBAS.caso('🔴 P090 · panel · el mes y el día abierto sobreviven a `dashRepintar()` (viven en `DASH`, que es lo único que el repintado no pisa)', () => {
  CTX.resetear();
  CMES = undefined;      // R18 · así el aserto de «el panel no usa CMES» mide algo
  const antYm = p090rcAntYm(), dia = antYm + '-15';
  const fin = p090rcEntrarMedico();
  try {
    dashGoPerson('Ana Suárez');
    PRUEBAS.cierto(!!document.getElementById('cmesPanel'), 'guarda: el calendario está en la ficha de Ana');
    PRUEBAS.igual(p090rcMesVisible('#cmesPanel'), cmesMesLabel(p090rcHoyYm()), 'guarda: arranca en el mes de hoy');
    PRUEBAS.igual(DASH._cmesPer, 'Ana Suárez', 'guarda: el panel anotó de quién es el mes que está mostrando');

    const flechas = document.querySelectorAll('#cmesPanel .cmes-flecha');
    PRUEBAS.igual(flechas.length, 2, 'guarda: las dos flechas están');
    PRUEBAS.falso(flechas[0].disabled, 'guarda: con 400 días de cobertura la flecha «anterior» está habilitada');
    flechas[0].click();
    PRUEBAS.igual(DASH._cmesMes, antYm, 'el mes elegido quedó en `DASH._cmesMes`, no en una variable del render');
    PRUEBAS.igual(p090rcMesVisible('#cmesPanel'), cmesMesLabel(antYm), 'y el encabezado lo muestra');
    /* Los dos ámbitos NO se pisan: el panel guarda en `DASH`, el piloto en `CMES`. Si compartieran
       estado, mover el mes del médico le movería el calendario a la persona en su propio teléfono. */
    PRUEBAS.igual(cmesMes('mio'), p090rcHoyYm(), 'y el ámbito «mio» sigue en el mes de hoy · los dos estados son independientes');

    const celda = document.querySelector('#cmesPanel .cmes-d[data-f="' + dia + '"]');
    PRUEBAS.cierto(!!celda && !celda.disabled, 'guarda: la casilla del ' + dia + ' existe y se puede tocar');
    celda.click();
    PRUEBAS.igual(DASH._cmesDia, dia, 'el día quedó en `DASH._cmesDia`');
    PRUEBAS.cierto(!!document.querySelector('#cmesPanel .cmes-det'), 'guarda: el detalle se abrió');

    /* EL REPINTADO REAL de la ficha: `dashRepintar()` es por donde pasa el refresco automático del
       panel y todo dato que llega tarde (reportes, niveles, casos). Rehace `#dashBody` entero. */
    const panelAntes = document.getElementById('cmesPanel');
    dashRepintar();
    PRUEBAS.falso(document.contains(panelAntes), 'guarda: la ficha se rehízo de verdad (el contenedor viejo ya no está)');

    PRUEBAS.igual(p090rcMesVisible('#cmesPanel'), cmesMesLabel(antYm), '🔴 después del repintado sigue el MES elegido');
    PRUEBAS.igual(cmesDia('panel'), dia, '🔴 y sigue el DÍA elegido');
    PRUEBAS.cierto(!!document.querySelector('#cmesPanel .cmes-det'), '🔴 con su detalle todavía abierto');
    PRUEBAS.igual((document.querySelector('#cmesPanel .cmes-det-t') || {}).textContent, cmesFechaLarga(dia),
      'y es el detalle de ESE día');

    /* DISCRIMINADOR (b) · al cambiar de persona el mes NO se hereda. Mostrarle a otra gente el mes
       que quedó de la anterior es un mes vacío que no es de nadie, y se lee como «no registró». */
    dashGoPerson('Luis Ferrer');
    PRUEBAS.igual(DASH._cmesPer, 'Luis Ferrer', 'guarda: el panel ya sabe que cambió la persona');
    PRUEBAS.igual(DASH._cmesMes, null, '🔴 DISCRIMINADOR · el mes se resetea al cambiar de persona');
    PRUEBAS.igual(DASH._cmesDia, null, 'y el día abierto también');
    PRUEBAS.igual(p090rcMesVisible('#cmesPanel'), cmesMesLabel(p090rcHoyYm()), 'la ficha de Luis abre en el mes de hoy');
    PRUEBAS.falso(!!document.querySelector('#cmesPanel .cmes-det'), 'y sin ningún detalle abierto');

    /* Y volver a Ana tampoco recupera su mes: el reseteo es por cambio de persona, no una caché
       por persona. Afirmarlo deja escrito cuál de las dos cosas es. */
    dashGoPerson('Ana Suárez');
    PRUEBAS.igual(p090rcMesVisible('#cmesPanel'), cmesMesLabel(p090rcHoyYm()), 'volver a Ana abre en el mes de hoy: no hay memoria por persona');
  } finally { fin(); CMES = undefined; }
});
