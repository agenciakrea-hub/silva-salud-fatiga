PRUEBAS.grupo('Demo · los datos de ejemplo tienen que seguir vivos después de una hora de demostración');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   TRES DEFECTOS DE LA MISMA FAMILIA, los tres encontrados por el verificador: un arreglo que sólo
   funciona sobre un `localStorage` limpio, o sobre un panel recién abierto, no está arreglado.

   1 · LA BITÁCORA NO SE RE-SEMBRABA EL MISMO DÍA. La guarda miraba `e.dia === hoy` y nada más, así
       que cualquier dispositivo que ya hubiera abierto la demostración hoy se quedaba con lo que
       sembró la versión ANTERIOR. Lo grave no es sólo que el arreglo no llegue: es que verificar el
       deploy el mismo día devuelve «no cambió nada» y el diagnóstico obvio —service worker,
       Pages— es el equivocado.
   2 · LAS GESTIONES SIN `lang` SE DABAN POR BUENAS. `g.lang && g.lang !== lang` es falso cuando el
       campo no existe, que es el caso de TODO lo sembrado antes de que el campo existiera. El
       cuaderno seguía en español con la app en inglés, en cualquier equipo que ya vio la demo.
   3 · LOS TURNOS SE ARMABAN UNA VEZ Y LA VENTANA DE 14 h SEGUÍA CORRIENDO. `cicloTurnoDe()` evalúa
       `Date.now() - TURNO_VENTANA_MS` en CADA repintado, y el reloj del ciclo repinta cada 60 s
       también en demostración. El check-in de la jornada excedida nace a 800 min de ahora: a 40
       minutos del borde. Con el panel abierto, los chips se apagaban de a uno — y quedaban
       tarjetas con «Carga» y «Check-out» encendidos y el check-in apagado, que se lee como «marcó
       la carga pero nunca entró». Una demostración dura más de 40 minutos.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function vivosPayload(){
  return { ok:true, rol:'supervisor', vista:'supervisor', referencia:{}, metricas:['kss'], demo:true,
    registros: [ { persona:'Ana Suárez', cedula:'V-9001', departamento:'Operaciones', empresa:'Empresa Demo', kss:5 },
                 { persona:'Beto Pérez', cedula:'V-9002', departamento:'Operaciones', empresa:'Empresa Demo', kss:3 },
                 { persona:'Caro Díaz',  cedula:'V-9003', departamento:'Operaciones', empresa:'Empresa Demo', kss:4 },
                 { persona:'Dora Lima',  cedula:'V-9004', departamento:'Operaciones', empresa:'Empresa Demo', kss:2 },
                 { persona:'Eva Mora',   cedula:'V-9005', departamento:'Operaciones', empresa:'Empresa Demo', kss:6 } ],
    comentarios: [], pvt: [], aptitud: [], turnos: [], ausencias: {}, duty: null,
    operacional: [], operacionalPeriodo: null, config: { sector:'aviacion' } };
}

PRUEBAS.caso('🔴 Demo · la bitácora se vuelve a sembrar cuando cambia la versión, no sólo el día', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    const p = vivosPayload();
    onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    const sembrados = () => bitacoraDe().filter(e => /^bdemo/.test(String(e.id||'')));
    PRUEBAS.alMenos(sembrados().length, 20, 'guarda: se sembró · con cero esto no probaría nada');

    /* Se marca lo sembrado como si lo hubiera escrito una versión anterior, MISMO DÍA. Es el
       estado real de cualquier equipo que ya abrió la demostración hoy. */
    const st = bitStore();
    st.items.forEach(e => { if (/^bdemo/.test(String(e.id||''))) e.app = '6.00'; });
    bitSaveStore(st);
    onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    PRUEBAS.igual(Array.from(new Set(sembrados().map(e => e.app))), [APP_VERSION],
      '🔴 se re-sembró con la versión de hoy · con la guarda vieja seguirían en 6.00 y el arreglo del guion no llegaría nunca');

    /* DISCRIMINADOR al revés: con la versión YA al día no puede re-sembrar, o cada repintado
       pisaría lo que el presentador tocó en vivo. */
    const antes = sembrados().map(e => e.ts).join(',');
    onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    PRUEBAS.igual(sembrados().map(e => e.ts).join(','), antes,
      '⚠️ y sigue siendo idempotente cuando no cambió nada');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Demo · un cuaderno de gestiones SIN `lang` cuenta como de otro idioma', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    const p = vivosPayload();
    onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico');
    demoSembrando(gestSembrarDemo);
    const casos = () => gestCasos().filter(g => /^gdemo/.test(g.id));
    PRUEBAS.alMenos(casos().length, 3, 'guarda: hay casos sembrados');

    /* El estado real de un equipo que ya vio la demostración con una versión anterior: sin `lang`
       y con los textos de entonces. */
    const gs = gestStore();
    gs.items.forEach(g => { if (/^gdemo/.test(g.id)){ delete g.lang; g.titulo = 'DE ANTES ' + g.titulo; } });
    gestSaveStore(gs);
    demoSembrando(gestSembrarDemo);
    PRUEBAS.igual(casos().filter(g => /^DE ANTES/.test(g.titulo)), [],
      '🔴 se re-sembraron · con `g.lang && …` los viejos se daban por buenos y el cuaderno quedaba en el idioma de entonces');
    PRUEBAS.cierto(casos().every(g => g.lang === idiomaActual()),
      'y quedan marcados con el idioma, para no volver a re-sembrar sin motivo · ' +
      casos().map(g => g.lang).join(', '));
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Demo · después de una hora de panel abierto los tres siguen teniendo su check-in', () => {
  const prev = DASH, real = Date.now;
  try {
    CTX.resetear(); localStorage.clear();
    const p = vivosPayload();
    const conCheckin = () => DEMO_ACTIVOS.filter(n => { const t = cicloTurnoDe(n); return !!(t && t.checkin); }).length;
    /* Los minutos del reloj del ciclo: repinta cada 60 s mientras el panel está abierto. */
    [45, 60, 90, 300].forEach(min => {
      onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
      const t0 = real();
      Date.now = () => t0 + min * 60000;
      /* DISCRIMINADOR · sin regenerar —que es lo que hacía antes— la ventana de 14 h ya los
         descartó. Si esto diera 3, la comprobación de abajo no estaría midiendo nada. */
      const viejo = conCheckin();
      cicloRepintar();
      PRUEBAS.igual(conCheckin(), DEMO_ACTIVOS.length,
        '🔴 +' + min + ' min · los tres conservan su check-in · antes quedaban ' + viejo + ' de ' + DEMO_ACTIVOS.length);
      if (min >= 60){
        PRUEBAS.cierto(viejo < DEMO_ACTIVOS.length,
          '⚠️ DISCRIMINADOR · a +' + min + ' min, sin regenerar, la ventana SÍ los descarta (' + viejo + ')');
      }
      Date.now = real;
    });
  } finally { Date.now = real; try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('⚠️ Demo · Ciclo, Jornada y el chip del turno cuentan la MISMA hora para la jornada abierta', () => {
  const real = Date.now;
  try {
    const base = new Date(); base.setHours(10, 0, 0, 0);
    Date.now = () => base.getTime();
    const ahora = base.getTime();
    /* La llegada al lugar de trabajo, vista desde las tres funciones que la dibujan. */
    const ciclo = cicloDemo().filter(e => e.persona === DEMO_ACTIVOS[1] && e.evento === 'llegada_aero')
      .map(e => Math.round((ahora - new Date(e.iso).getTime()) / 60000)).sort((a,b) => a - b)[0];
    const abierta = (dutyDemo().diario || []).filter(f => f.abierto)[0];
    const jornada = abierta ? abierta.jornadaMin : null;
    const chip = turnosDemo().filter(r => r.persona === DEMO_ACTIVOS[1] && r.tipo === 'checkin')
      .map(r => Math.round((ahora - new Date(r.fecha + 'T' + r.hora + ':00').getTime()) / 60000))[0];
    PRUEBAS.cierto(ciclo != null && jornada != null && chip != null,
      'guarda de medibilidad: las tres funciones devolvieron algo · ' + [ciclo, jornada, chip].join(' / '));
    PRUEBAS.igual(ciclo, jornada,
      '⚠️ Ciclo y Jornada dicen lo mismo · daban 836 y 800: 36 minutos de diferencia entre dos pestañas que cuentan la misma operación');
    PRUEBAS.alMenos(2, Math.abs(chip - jornada),
      '⚠️ y el chip del turno también (±1 min por el redondeo del reloj) · ' + chip + ' vs ' + jornada);
  } finally { Date.now = real; }
});
