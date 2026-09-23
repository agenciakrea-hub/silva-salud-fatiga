PRUEBAS.grupo('P090 · el turno que cruza la medianoche: UNA sola celda, y el día siguiente con la marca de arrastre');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Decisión de Franco (2026-09-22): un ciclo que cruza la medianoche pertenece SÓLO al día en que
   arrancó. Un turno de noche no se parte en dos medias casillas; el detalle muestra las horas
   completas. Eso lo implementa `cmesDiaDe` con `c.t0` —el instante del evento
   que ABRIÓ el ciclo— y NUNCA con `st.inicio`: `cicloEstado` devuelve `inicio:null` para un ciclo
   sin evento de apertura, y fechar la celda con eso haría desaparecer esos
   ciclos del mes sin un error en consola.

   El precio de esa decisión es que el día SIGUIENTE de un turno de noche queda visualmente vacío, y
   una casilla vacía en esta pantalla se lee «no trabajó». Por eso existe `cmesArrastre`,
   que le pone una marca al día siguiente diciendo hasta qué hora llegó la
   jornada anterior.

   ⚠️ Y POR QUÉ `cmesArrastre` USA `cicloUltimoDePersona` Y NO EL MÁXIMO DE `c.ev`. Esa
   función excluye a propósito `detenido` y `cerrado`, que no son eventos de persona: el
   `detenido` lo escribe el reloj del servidor y el `cerrado` lo firma el supervisor, a veces días
   después. Con el máximo ingenuo sobre todo `c.ev`, un `cerrado` escrito tres días más tarde haría
   que un día en que NADIE trabajó dijera «una jornada del día anterior llegó hasta las 12:00». El
   discriminador (b) de este archivo es exactamente ese escenario.

   CAMINO REAL (R17): los eventos entran por `misSincronizar()` con `fetchConReloj` estubado —lo que
   escribe `K_CICLO_SRV` / `K_CICLO_SRV_PER` y después repinta por `renderInicio()` →
   `cicloMiRefrescar()` → `cmesRepintar('mio')`—, nunca escribiendo esas claves a mano.
   R18: el stub se restaura en el `.finally()` de la promesa, y el `localStorage` vuelve a como estaba.

   ⚠️ Los ayudantes llevan prefijo `p090m` y están duplicados en `p090-exceso-no-es-excedido.js` a
   propósito: con `SOLO_CASOS` se puede correr un archivo suelto, y un ayudante compartido haría que
   el otro no cargue (ver LEEME.md).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p090mMontar(){
  const prevLS = Object.assign({}, localStorage);
  const est = cmesEstado(), oMes = est.mes, oDia = est.dia;
  const oDash = DASH, oSimul = SIMUL;
  CTX.resetear();
  /* LA ZONA es la unidad de medida de una celda, y acá además decide de qué lado de la medianoche
     cae cada evento. `zonaOperacion()` mira `DASH.zonaOp` PRIMERO, así que un payload que dejó otro
     caso correría todo un día. Con `DASH` en null y sin `K_ZONA_OP` devuelve null y `fechaOpDe` /
     `horaOpDe` usan la del equipo, que es la misma con la que `p090mIso` arma los ISO. Los dos
     formateadores se cachean por zona: sin limpiar `_fopZona` / `_hopZona` seguirían con la anterior.
     Mismo montaje que `p167-historial-operacional.js`. */
  DASH = null;
  try { localStorage.removeItem(K_ZONA_OP); } catch(e){}
  _fopZona = null; _hopZona = null;
  try { SIMUL = null; } catch(e){}     // `misSincronizar` no hace nada mientras se simula
  cmesMesSet('mio', null); cmesDiaSet('mio', null);   // `CMES` es memoria: `CTX.resetear()` no lo toca
  return function desmontar(){
    DASH = oDash; SIMUL = oSimul; _fopZona = null; _hopZona = null;
    cmesMesSet('mio', oMes); cmesDiaSet('mio', oDia);
    try { localStorage.clear(); Object.keys(prevLS).forEach(function(k){ localStorage.setItem(k, prevLS[k]); }); } catch(e){}
    try { renderSections(); } catch(e){}
  };
}

/* El ISO de un minuto del día `f`, en la hora del EQUIPO. Con el constructor local y no con texto:
   así un cambio de horario de verano no corre la hora de pared, que es la que el caso afirma. */
function p090mIso(f, min){
  const p = String(f).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2], Math.floor(min / 60), min % 60, 0, 0).toISOString();
}

/* El turno de noche: sale de casa a las 22:00 del día `f` y llega a casa a las 10:00 del siguiente.
   La jornada dura 10 h (23:00 → 09:00), por debajo del previsto, para que el único hecho que este
   archivo mide sea el cruce de medianoche y no un exceso. */
function p090mCicloNocturno(f){
  const sig = fechaMasDias(f, 1);
  return [
    { evento: 'salida_casa',  iso: p090mIso(f,   22 * 60) },
    { evento: 'llegada_aero', iso: p090mIso(f,   23 * 60) },
    { evento: 'salida_aero',  iso: p090mIso(sig,  9 * 60) },
    { evento: 'llegada_casa', iso: p090mIso(sig, 10 * 60) }
  ];
}

/* El mismo ciclo pero entero dentro del día: la contraparte del discriminador (a). */
function p090mCicloDiurno(f){
  return [
    { evento: 'salida_casa',  iso: p090mIso(f,  6 * 60) },
    { evento: 'llegada_aero', iso: p090mIso(f,  7 * 60) },
    { evento: 'salida_aero',  iso: p090mIso(f, 17 * 60) },
    { evento: 'llegada_casa', iso: p090mIso(f, 18 * 60) }
  ];
}

function p090mSembrar(eventos){
  const oReloj = window.fetchConReloj;
  window.fetchConReloj = function(){
    return Promise.resolve({ json: function(){ return Promise.resolve({
      ok: true, registros: [], pvt: [], operacional: eventos,
      operacionalPeriodo: { dias: 30, desde: null, hasta: null } }); } });
  };
  try { _misSincronizando = false; } catch(e){}
  return misSincronizar().finally(function(){ window.fetchConReloj = oReloj; });
}

function p090mDelDia(f){
  const fuente = cmesFuente('mio', cicloYo(), f.slice(0, 7));
  return { plan: fuente.plan, ciclos: cmesAgruparPorDia(fuente.ciclos).dias[f] || [] };
}

/* Un día PASADO tal que los `n` días que le siguen también son pasados y caen en el MISMO mes: el
   día del ciclo, el del arrastre y el de después del cierre tienen que entrar todos en una sola
   grilla, corra la suite el día del mes que corra. */
function p090mDiaBase(n){
  for (let k = n + 1; k <= 24; k++){
    const f = fechaMasDias(todayStr(), -k);
    if (fechaMasDias(f, n).slice(0, 7) === f.slice(0, 7)) return f;
  }
  return fechaMasDias(todayStr(), -(n + 1));
}

/* Al mes de `f` por el camino de la flecha «‹» (su `onclick` llama a `cmesMesIr`). */
function p090mIrAlMes(f){
  for (let i = 0; i < 3 && cmesMes('mio') > f.slice(0, 7); i++) cmesMesIr('mio', -1);
  return cmesMes('mio') === f.slice(0, 7);
}
function p090mCelda(f){
  const cont = document.getElementById('cmesMio');
  return cont ? cont.querySelector('.cmes-d[data-f="' + f + '"]') : null;
}
/* «Coloreada» = la celda lleva el caso de un CICLO. Los cuatro casos de DÍA —`sin_jornada`, `fuera`,
   `futuro`, `franco`— son ausencia de jornada y no cuentan: contarlos daría 42 siempre y el aserto
   de «exactamente una» no mediría nada. */
function p090mColoreadas(){
  const cont = document.getElementById('cmesMio');
  if (!cont) return [];
  return [].slice.call(cont.querySelectorAll('.cmes-d')).filter(function(b){
    return /cmes-c-(completo|exceso|excedido|sin_cierre|detenido|parcial|cerrado|curso|descanso)(\s|$)/.test(b.className);
  });
}

PRUEBAS.caso('🔴 P090 · un ciclo 22:00 → 10:00 del día siguiente pinta UNA sola celda (la del día en que arrancó) y deja el día siguiente con la marca de arrastre y su hora', function(){
  const fin = p090mMontar();
  const f = p090mDiaBase(4);
  const sig = fechaMasDias(f, 1);
  const plan = cicloPlan(cicloYo());
  PRUEBAS.alMenos(plan.jornada, 600, 'guarda: la jornada prevista cubre las 10 h de este turno · si bajara, el ciclo pasaría a «exceso» y el caso estaría midiendo otra cosa');
  return p090mSembrar(p090mCicloNocturno(f))
    .then(function(ok){
      PRUEBAS.cierto(ok, 'guarda: `misSincronizar` entró y guardó los eventos · sin esto nada de lo de abajo mide');
      PRUEBAS.cierto(p090mIrAlMes(f), 'guarda: la grilla está en el mes del ciclo (' + f.slice(0, 7) + ')');

      const d = p090mDelDia(f);
      PRUEBAS.igual(d.ciclos.length, 1, 'guarda: los cuatro eventos armaron UN ciclo, y cuelga del día en que arrancó');
      PRUEBAS.igual(p090mDelDia(sig).ciclos.length, 0, '🔴 el día siguiente NO tiene ciclo propio: el turno de noche no se parte en dos medias casillas');
      PRUEBAS.igual(cmesDiaDe(d.ciclos[0]), f, 'y el día del ciclo sale de `c.t0` · con `st.inicio` un ciclo sin evento de apertura valdría null y desaparecería del mes sin un error');

      const coloreadas = p090mColoreadas();
      PRUEBAS.igual(coloreadas.length, 1, '🔴 EXACTAMENTE UNA celda coloreada en todo el mes · dos significaría que el ciclo se contó en los dos días');
      PRUEBAS.igual(coloreadas[0] ? coloreadas[0].getAttribute('data-f') : null, f, 'y es la del día de `salida_casa`');

      const celSig = p090mCelda(sig);
      PRUEBAS.cierto(!!celSig, 'la celda del día siguiente está en la grilla');
      PRUEBAS.cierto(celSig && celSig.classList.contains('cmes-c-sin_jornada'), 'sin jornada propia · que es cierto: ese día no arrancó ninguna');
      PRUEBAS.cierto(celSig && celSig.classList.contains('cmes-arr'), '🔴 pero lleva la marca de ARRASTRE · sin ella, una casilla vacía después de un turno de noche se lee «no trabajó»');
      const lbl = celSig ? String(celSig.getAttribute('aria-label') || '') : '';
      /* R11 · con la pestaña oculta `innerText` da falsos negativos: se lee el atributo. */
      PRUEBAS.cierto(lbl.indexOf(t('cmes_det_arrastre', { h: '10:00' })) >= 0, '🔴 y su nombre accesible dice hasta qué hora llegó: «' + t('cmes_det_arrastre', { h: '10:00' }) + '» · obtuvo: ' + lbl);
      PRUEBAS.cierto(/10:00/.test(lbl), 'la hora es la del ÚLTIMO evento del ciclo (10:00), no la de apertura');

      /* DISCRIMINADOR (a) · el mismo día, un ciclo que empieza y termina dentro de la jornada. */
      return p090mSembrar(p090mCicloDiurno(f));
    })
    .then(function(){
      const d = p090mDelDia(f);
      PRUEBAS.igual(d.ciclos.length, 1, 'guarda: el sembrado se reemplazó entero, no se acumuló');
      PRUEBAS.igual(p090mColoreadas().length, 1, 'DISCRIMINADOR · sigue habiendo una sola celda coloreada, la del mismo día');
      const celSig = p090mCelda(sig);
      PRUEBAS.falso(celSig && celSig.classList.contains('cmes-arr'), 'DISCRIMINADOR · un ciclo que empieza y termina el MISMO día deja el día siguiente SIN marca · si esto pasara igual, la marca no estaría midiendo el cruce de medianoche sino la mera existencia de un ciclo el día anterior');
      const lbl = celSig ? String(celSig.getAttribute('aria-label') || '') : '';
      PRUEBAS.falso(/10:00|18:00/.test(lbl), '... y su nombre accesible tampoco nombra ninguna hora de arrastre');
    })
    .finally(fin);
});

PRUEBAS.caso('🔴 P090 · un `cerrado` del supervisor tres días después NO fabrica arrastre: `cmesArrastre` mide con `cicloUltimoDePersona`, que excluye las paradas', function(){
  const fin = p090mMontar();
  const f = p090mDiaBase(4);
  const sig = fechaMasDias(f, 1);
  const fCerrado = fechaMasDias(f, 3);
  const fDespues = fechaMasDias(f, 4);
  /* El supervisor firma el cierre del ciclo tres días más tarde. Se pega a ESE ciclo aunque caiga
     fuera de la ventana: `cicloAgruparNucleo` no abre ciclo con una parada. */
  const eventos = p090mCicloNocturno(f).concat([{ evento: 'cerrado', iso: p090mIso(fCerrado, 12 * 60) }]);
  return p090mSembrar(eventos)
    .then(function(ok){
      PRUEBAS.cierto(ok, 'guarda: `misSincronizar` entró y guardó los eventos');
      PRUEBAS.cierto(p090mIrAlMes(f), 'guarda: la grilla está en el mes del ciclo');

      const d = p090mDelDia(f);
      PRUEBAS.igual(d.ciclos.length, 1, 'guarda: el `cerrado` se pegó al ciclo del turno de noche, no abrió uno nuevo');
      const c = d.ciclos[0];
      PRUEBAS.cierto(!!(c.ev && c.ev.cerrado), 'guarda: el ciclo TIENE el evento `cerrado` · sin él este caso no discriminaría nada');
      PRUEBAS.igual(cicloEstado(c, Date.now(), d.plan).estado, 'cerrado', 'guarda: y el motor lo reconoce como cerrado por el supervisor');

      /* EL MECANISMO, medido: el último evento DE PERSONA sigue siendo la llegada a casa. */
      const tCasa = Date.parse(c.ev.llegada_casa.iso);
      PRUEBAS.igual(cicloUltimoDePersona(c), tCasa, '🔴 `cicloUltimoDePersona` devuelve la llegada a casa (10:00 del día siguiente), NO el `cerrado`: las paradas no son eventos de persona');
      const todos = Object.keys(c.ev).map(function(k){ return Date.parse(c.ev[k].iso); });
      const maxIngenuo = Math.max.apply(null, todos);
      PRUEBAS.igual(fechaOpDe(new Date(maxIngenuo)), fCerrado, 'guarda: el máximo INGENUO sobre todo `c.ev` sí es el `cerrado`, tres días después · es lo que haría un arrastre falso');

      const celSig = p090mCelda(sig);
      PRUEBAS.cierto(celSig && celSig.classList.contains('cmes-arr'), 'el día siguiente al turno CONSERVA su arrastre: el cierre del supervisor no se lo saca');
      PRUEBAS.cierto(celSig && String(celSig.getAttribute('aria-label') || '').indexOf('10:00') >= 0, '... y sigue diciendo 10:00, no 12:00');

      const celDespues = p090mCelda(fDespues);
      PRUEBAS.cierto(!!celDespues, 'guarda: la celda del día siguiente al `cerrado` (' + fDespues + ') existe y es pasada · si no existiera, el aserto de abajo daría verde sin mirar nada');
      PRUEBAS.falso(celDespues && celDespues.classList.contains('cmes-arr'), '🔴 DISCRIMINADOR · el día siguiente al `cerrado` NO lleva arrastre · con el máximo sobre todo `c.ev`, un día en que nadie trabajó diría «una jornada del día anterior llegó hasta las 12:00»');
      PRUEBAS.falso(celDespues && /12:00/.test(String(celDespues.getAttribute('aria-label') || '')), '... y su nombre accesible tampoco nombra la hora del cierre');

      PRUEBAS.igual(p090mColoreadas().length, 1, 'y sigue habiendo UNA sola celda con jornada: el `cerrado` es parte del mismo ciclo, no un día de trabajo nuevo');
    })
    .finally(fin);
});
