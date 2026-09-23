PRUEBAS.grupo('P090 · un día PASADO con exceso: `cicloEstado` dice «completo» y la celda igual tiene que salir roja');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL CASO CENTRAL DE P090, Y POR QUÉ EXISTE

   `cicloEstado` prende la bandera `excedido` SÓLO en la rama del tramo EN CURSO
   (la línea `if (sinCierreTramo) sinCierre = true; else if (excedidoTramo) excedido = true;`).
   Un tramo ya CERRADO que se pasó alimenta otra variable, `cerradoAlgunoDeMas`, y la línea que
   debería juntarlas —`if (estado === 'completo' && cerradoAlgunoDeMas) estado = 'completo';`— es un
   no-op literal: asigna lo mismo que ya vale.

   Consecuencia, y es la decisión más cara del prompt: un ciclo PASADO que se pasó de la jornada
   devuelve `estado: 'completo'`, NO `'excedido'`. Pintar el calendario con la regla ingenua
   (`st.estado === 'excedido'`) deja TODOS los días pasados con exceso en VERDE — justo los días que
   el médico está buscando, en una pantalla que lee como evidencia. La única sobreviviente de las dos
   banderas es `huboExceso`, y es de ahí de donde `cmesCaso` saca el color.

   ⚠️ Las referencias de este archivo van por NOMBRE DE FUNCIÓN y no por `archivo:línea`: `index.html`
   tiene ~33.700 líneas y lo tocan sesiones distintas, así que un número puesto hoy señala otra cosa
   la semana que viene. Un nombre se encuentra con un grep y no envejece.

   POR QUÉ ESTE ARCHIVO AFIRMA LAS DOS COSAS JUNTAS. Comprobar sólo que la celda sale roja no
   protege nada: si mañana alguien «arregla» el motor para que devuelva `excedido`, ese aserto sigue
   verde y nadie se entera de que `cmesCaso` quedó con una rama muerta. Comprobar sólo el motor
   tampoco: verifica la pieza, no el uso. Juntas dicen la verdad completa —«hoy el motor dice
   completo Y el calendario igual lo pinta rojo»— y el día que el motor cambie, el primer aserto se
   pone rojo y avisa en vez de callarse.

   CAMINO REAL (R17). Los eventos entran por `misSincronizar()` con `fetchConReloj` estubado: es esa
   función la que escribe `K_CICLO_SRV` / `K_CICLO_SRV_PER` y después llama a `renderInicio()` →
   `cicloMiRefrescar()` → `cmesRepintar('mio')`. Nunca se escriben esas claves a mano y se leen en la
   misma prueba: eso probaría el lector contra un escritor inventado, que es el error que ya se cobró
   tres funciones entregadas en verde.

   R18 · el stub de red se restaura en el `.finally()` de la promesa de `misSincronizar`, nunca en un
   `finally` sincrónico —que corre ANTES del `.then` y deja el `fetch` de este caso puesto para la
   prueba siguiente (cuatro rojos falsos pagados por eso)—, y el `localStorage` vuelve a como estaba.

   ⚠️ Los ayudantes llevan prefijo `p090e` y están duplicados en `p090-medianoche.js` a propósito:
   con `SOLO_CASOS` se puede correr un archivo suelto, y un ayudante compartido haría que el otro
   archivo no cargue. (Las `const` de un archivo de casos tampoco se ven desde otro; ver LEEME.md.)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Deja la app en estado conocido y devuelve la función que lo desarma. Devuelve una función y no se
   apoya en un `try/finally` sincrónico porque todo lo que sigue es asíncrono. */
function p090eMontar(){
  const prevLS = Object.assign({}, localStorage);
  const est = cmesEstado(), oMes = est.mes, oDia = est.dia;
  const oDash = DASH, oSimul = SIMUL;
  CTX.resetear();
  /* LA ZONA, que es la unidad de medida de una celda. `zonaOperacion()` mira `DASH.zonaOp` PRIMERO,
     así que un payload que dejó otro caso correría todas las fechas de este archivo un día y la
     celda medida sería otra. Con `DASH` en null y sin `K_ZONA_OP` devuelve null y `fechaOpDe` usa la
     zona del equipo, que es la misma con la que `p090eIso` arma los ISO. Los dos formateadores se
     cachean por zona (`_fopZona` / `_hopZona`): sin limpiarlos seguirían con la anterior.
     Es el mismo montaje que ya usa `p167-historial-operacional.js`. */
  DASH = null;
  try { localStorage.removeItem(K_ZONA_OP); } catch(e){}
  _fopZona = null; _hopZona = null;
  /* `misSincronizar` no hace NADA mientras se simula (`if (simulando()) return`), y un caso del
     portal puede haber dejado la simulación puesta: sin esto el caso mediría un calendario vacío. */
  try { SIMUL = null; } catch(e){}
  /* `CMES` es memoria, no localStorage: `CTX.resetear()` no lo toca y el mes que dejó otro caso se
     hereda. Se arranca en el mes de hoy y se devuelve al terminar (R18). */
  cmesMesSet('mio', null); cmesDiaSet('mio', null);
  return function desmontar(){
    DASH = oDash; SIMUL = oSimul; _fopZona = null; _hopZona = null;
    cmesMesSet('mio', oMes); cmesDiaSet('mio', oDia);
    try { localStorage.clear(); Object.keys(prevLS).forEach(function(k){ localStorage.setItem(k, prevLS[k]); }); } catch(e){}
    try { renderSections(); } catch(e){}
  };
}

/* El ISO de un minuto del día `f`, en la hora del EQUIPO (que acá es la de la operación: ver arriba).
   Se construye con el constructor local y no con texto para que un cambio de horario de verano no
   corra la hora: `new Date(a, m, d, h, mi)` fija el reloj de pared, no un desplazamiento. */
function p090eIso(f, min){
  const p = String(f).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2], Math.floor(min / 60), min % 60, 0, 0).toISOString();
}

/* Un ciclo completo en el día `f`, con la jornada durando EXACTAMENTE `jornadaMin`. Los tramos de
   traslado y regreso van en su previsto, así el único hecho que cambia entre los dos sembrados es el
   que se está midiendo. Las duraciones salen del plan real (`cicloPlan`) y no de un 720 escrito a
   mano: si la empresa cambia la jornada, el caso sigue midiendo «una hora más de la prevista». */
function p090eCiclo(f, plan, jornadaMin){
  const sale = 6 * 60;                              // 06:00, con el ciclo entero dentro del día
  const llega = sale + plan.traslado;
  const saleSitio = llega + jornadaMin;
  const llegaCasa = saleSitio + plan.regreso;
  return [
    { evento: 'salida_casa',  iso: p090eIso(f, sale) },
    { evento: 'llegada_aero', iso: p090eIso(f, llega) },
    { evento: 'salida_aero',  iso: p090eIso(f, saleSitio) },
    { evento: 'llegada_casa', iso: p090eIso(f, llegaCasa) }
  ];
}

/* Siembra por el camino REAL. `misSincronizar` es lo que escribe las dos claves y repinta; acá sólo
   se le controla la respuesta del servidor. */
function p090eSembrar(eventos){
  const oReloj = window.fetchConReloj;
  window.fetchConReloj = function(){
    return Promise.resolve({ json: function(){ return Promise.resolve({
      ok: true, registros: [], pvt: [], operacional: eventos,
      operacionalPeriodo: { dias: 30, desde: null, hasta: null } }); } });
  };
  /* otro caso puede haberla dejado en vuelo; acá se mide el sembrado, no la carrera */
  try { _misSincronizando = false; } catch(e){}
  return misSincronizar().finally(function(){ window.fetchConReloj = oReloj; });
}

/* Los ciclos de un día, tal como los deriva el calendario: por `cmesFuente` + `cmesAgruparPorDia`,
   nunca armando el objeto a mano. Devuelve también el plan que `cmesEstadoDia` le pasa a
   `cicloEstado`, para que el caso juzgue con el mismo que usa la pantalla. */
function p090eDelDia(f){
  const fuente = cmesFuente('mio', cicloYo(), f.slice(0, 7));
  return { plan: fuente.plan, ciclos: cmesAgruparPorDia(fuente.ciclos).dias[f] || [] };
}

/* Un día PASADO tal que los `n` días que le siguen también son pasados y caen en el MISMO mes. Sin
   esto, correr la suite los primeros días del mes deja el día sembrado en el mes anterior y su celda
   directamente no existe en la grilla que se está mirando. */
function p090eDiaBase(n){
  for (let k = n + 1; k <= 24; k++){
    const f = fechaMasDias(todayStr(), -k);
    if (fechaMasDias(f, n).slice(0, 7) === f.slice(0, 7)) return f;
  }
  return fechaMasDias(todayStr(), -(n + 1));
}

/* Lleva la grilla al mes de `f` por el mismo camino que la flecha «‹»: su `onclick` llama a
   `cmesMesIr`. */
function p090eIrAlMes(f){
  for (let i = 0; i < 3 && cmesMes('mio') > f.slice(0, 7); i++) cmesMesIr('mio', -1);
  return cmesMes('mio') === f.slice(0, 7);
}

function p090eCelda(f){
  p090eIrAlMes(f);
  const cont = document.getElementById('cmesMio');
  return cont ? cont.querySelector('.cmes-d[data-f="' + f + '"]') : null;
}

PRUEBAS.caso('🔴 P090 · un ciclo pasado que se pasó de la jornada: `cicloEstado` devuelve «completo» (la regla ingenua fallaría) Y la celda sale con `cmes-c-exceso`', function(){
  const fin = p090eMontar();
  const f = p090eDiaBase(1);                 // a dos días o más: el descanso ya superó su previsto
  const plan = cicloPlan(cicloYo());
  return p090eSembrar(p090eCiclo(f, plan, plan.jornada + 60))
    .then(function(ok){
      PRUEBAS.cierto(ok, 'guarda: `misSincronizar` entró y guardó los eventos · sin esto nada de lo de abajo estaría midiendo');
      PRUEBAS.cierto(!!cmesCobertura('mio'), 'guarda: quedó cobertura (si fuera null el mes entero saldría «fuera» y la celda no tendría color)');

      const d = p090eDelDia(f);
      PRUEBAS.igual(d.ciclos.length, 1, 'guarda: los cuatro eventos armaron UN solo ciclo ese día · con dos, mandaría el peor y el caso mediría otra cosa');

      const st = cicloEstado(d.ciclos[0], Date.now(), d.plan);
      PRUEBAS.igual(st.estado, 'completo', '🔴 EL PUNTO · un ciclo PASADO con la jornada por encima de lo previsto devuelve «completo». Si esto se pone rojo es que alguien cambió `cicloEstado`: hay que revisar `cmesCaso` antes de tocar nada más');
      PRUEBAS.falso(st.estado === 'excedido', 'DISCRIMINADOR · la regla ingenua (`st.estado === "excedido"`) NO se cumple: pintar con ella dejaría este día en VERDE, que es el defecto que P090 existe para no cometer');
      PRUEBAS.igual(st.huboExceso, true, 'el exceso sobrevive SÓLO en `huboExceso` (el valor que devuelve `cicloEstado`): la bandera `excedido` del ciclo se prende nada más en la rama del tramo EN CURSO');
      PRUEBAS.igual(cmesCaso(st), 'exceso', '`cmesCaso` traduce ese par —completo + huboExceso— al caso visual «exceso»');

      const cel = p090eCelda(f);
      PRUEBAS.cierto(!!cel, 'la celda de ese día está en la grilla · si falta, la navegación de mes no llegó y el resto no mide');
      PRUEBAS.cierto(cel && cel.classList.contains('cmes-c-exceso'), '🔴 y la celda sale ROJA · es lo que el médico tiene que poder encontrar de un vistazo (R6)');
      PRUEBAS.falso(cel && cel.classList.contains('cmes-c-completo'), 'y NO verde: un día con exceso pintado como jornada completa es una afirmación falsa sobre esa persona');
      PRUEBAS.falso(cel && cel.disabled, 'la celda es tocable: el detalle del día tiene que poder abrirse');
      /* R11 · nada de `innerText`: con la pestaña oculta da falsos negativos. */
      const lbl = cel ? String(cel.getAttribute('aria-label') || '') : '';
      PRUEBAS.cierto(lbl.indexOf(cmesRotulo('exceso')) >= 0, 'el nombre accesible lo dice con palabras («' + cmesRotulo('exceso') + '»): el color solo no alcanza para quien no separa tonos');
      const glifo = cel ? cel.querySelector('.cmes-p') : null;
      PRUEBAS.igual(glifo ? glifo.textContent : null, t('cmes_m_exceso'), 'y lleva la marca de una letra, que es la otra mitad de lo mismo');
      /* R6 · el día que pide una mirada sube a las fichas de arriba, no se queda escondido en la grilla. */
      const cont = document.getElementById('cmesMio');
      PRUEBAS.alMenos(cont ? cont.querySelectorAll('.cmes-ficha.cmes-c-exceso').length : 0, 1, 'y aparece como ficha de excepción arriba de la grilla · si hubiera que barrer 42 casillas para encontrarlo, la pantalla estaría mal diseñada');
    })
    /* DISCRIMINADOR · el MISMO ciclo, una hora más corto. Cambia un solo hecho. */
    .then(function(){ return p090eSembrar(p090eCiclo(f, cicloPlan(cicloYo()), cicloPlan(cicloYo()).jornada - 60)); })
    .then(function(){
      const d2 = p090eDelDia(f);
      PRUEBAS.igual(d2.ciclos.length, 1, 'guarda: el sembrado se reemplazó entero (`misSincronizar` pisa `K_CICLO_SRV`), no se acumuló');
      const st2 = cicloEstado(d2.ciclos[0], Date.now(), d2.plan);
      PRUEBAS.igual(st2.estado, 'completo', 'DISCRIMINADOR · el ciclo sin exceso también devuelve «completo» · el `estado` NO distingue los dos casos, que es exactamente por lo que el color no puede salir de ahí');
      PRUEBAS.igual(st2.huboExceso, false, '... y acá `huboExceso` es false: es la única variable que los separa');
      PRUEBAS.igual(cmesCaso(st2), 'completo', 'así que `cmesCaso` da «completo»');
      const cel2 = p090eCelda(f);
      PRUEBAS.cierto(cel2 && cel2.classList.contains('cmes-c-completo'), 'DISCRIMINADOR · y la misma celda sale VERDE · la prueba distingue los dos casos, no pinta todo de rojo');
      PRUEBAS.falso(cel2 && cel2.classList.contains('cmes-c-exceso'), '... y ya no roja');
      const cont2 = document.getElementById('cmesMio');
      PRUEBAS.igual(cont2 ? cont2.querySelectorAll('.cmes-ficha.cmes-c-exceso').length : -1, 0, 'DISCRIMINADOR · y sin exceso no hay ficha de excepción: el resumen tampoco miente');
    })
    .finally(fin);
});
