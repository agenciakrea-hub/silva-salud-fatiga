
PRUEBAS.grupo('S7 · la demostración muestra lo que el producto hace');

/* ⚠️ POR QUÉ IMPORTA. La portada promete modelo SAFTE, escalas validadas y trazabilidad. Si alguien
   entra a la demostración y la pestaña de Jornada dice "todavía no hay jornadas registradas", eso no
   se lee como "la demo está incompleta": se lee como **"el producto no lo hace"**.
   Y había algo peor que faltar: la nómina pintaba un ERROR DE CREDENCIALES, o sea la función rota. */

function s7Demo(fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  const pd = NOMLIST.datos, pt = NOMLIST.total, pc = NOMLIST.cargando;
  try {
    DASH = { vista:'supervisor', demoMode:true, params:{}, f:{}, tab:'jornada',
             duty: dutyDemo(), ausencias: ausenciasDemo(), turnos: turnosDemo() };
    return fn();
  } finally { DASH = prev; NOMLIST.datos = pd; NOMLIST.total = pt; NOMLIST.cargando = pc; }
}

PRUEBAS.caso('⚠️ la pestaña de Jornada NO está vacía en la demostración', () => {
  /* Y4 es lo más nuevo y lo que la portada nombra. Una demo que lo muestra vacío contradice la
     primera pantalla que la persona acaba de leer. */
  const html = s7Demo(() => renderJornada());
  PRUEBAS.falso(/jor_vacio|Todavía no hay jornadas/.test(html),
    '⚠️ no puede caer en el estado vacío: la portada acaba de prometer esta función');
  PRUEBAS.cierto(html.indexOf('jor-tabla') >= 0, 'tiene que haber tabla de datos');
  PRUEBAS.cierto(html.indexOf('jor-kpi') >= 0, 'y los KPIs del acumulado');
});

PRUEBAS.caso('⚠️ y muestra un exceso, que es lo que hay que ver', () => {
  /* Una demo donde nadie se excede muestra la pantalla pero no la FUNCIÓN. Y una donde todos se
     exceden parece una operación en crisis: se muestra el caso, no el desastre. */
  const d = dutyDemo();
  const conExceso = d.diario.filter(f => f.excesoMin > 0);
  PRUEBAS.alMenos(conExceso.length, 1, '⚠️ tiene que haber al menos un exceso o no se ve la función');
  PRUEBAS.comoMucho(conExceso.length, Math.ceil(d.diario.length / 2),
    'pero no la mayoría: la demostración muestra el caso, no una operación en crisis');
  PRUEBAS.cierto(d.diario.some(f => f.abierto),
    'y alguien todavía en jornada, que es el único estado accionable hoy');
  PRUEBAS.igual(d.sinUmbralCongelado, 0,
    'sin filas sin umbral: el aviso de "sin comparar" es una limitación del CH real, no del ejemplo');
});

PRUEBAS.caso('⚠️ los turnos ya no están vacíos: las tarjetas no quedan todas en "pendiente"', () => {
  /* Estaba en `[]` con el comentario "no es el foco de la demostración". El efecto era que TODAS las
     tarjetas quedaban pendientes: la demo mostraba la app como si nadie la usara. */
  const t2 = turnosDemo();
  PRUEBAS.alMenos(t2.length, 3, '⚠️ tiene que haber turnos registrados');
  PRUEBAS.cierto(t2.some(x => x.tipo === 'checkin'), 'con check-in');
  PRUEBAS.cierto(t2.some(x => x.tipo === 'checkout'), 'y alguno cerrado, para que se vea el ciclo completo');
  const hoy = todayStr();
  PRUEBAS.cierto(t2.every(x => x.fecha === hoy),
    'del día de hoy: con fecha vieja, la ventana de 14 h los descarta y volveríamos a cero');
});

PRUEBAS.caso('⚠️ la nómina de la demo muestra datos, no un error de credenciales', () => {
  /* Es el hueco que el plan marcaba. Antes caía en la rama sin credenciales y pintaba
     `tar_err_creds`: quien ve la demostración concluye que la función está ROTA. */
  const fuente = String(nominaListCargar);
  PRUEBAS.cierto(/demoMode/.test(fuente),
    '⚠️ `nominaListCargar` tiene que reconocer la demo ANTES de la rama de credenciales');
  PRUEBAS.cierto(fuente.indexOf('demoMode') < fuente.indexOf('tar_err_creds'),
    'y hacerlo antes, o igual cae en el error');
  const n = nominaDemo();
  PRUEBAS.alMenos(n.length, 4, 'con gente suficiente para que se vea la lista');
  PRUEBAS.cierto(n.some(x => x.registrado) && n.some(x => !x.registrado),
    '⚠️ con los DOS estados: el contraste entre quién ya usa la app y quién no es lo que la pantalla muestra');
  PRUEBAS.cierto(n.every(x => x.cedula && x.departamento),
    'y con cédula y departamento, o los filtros de la pantalla quedan vacíos');
});

/* ════════ EL ELENCO ════════════════════════════════════════════════════════════════════════════
   El defecto que esto fija lo introduje yo el 2026-09-04 y lo encontré comparando con el endpoint:
   los generadores nuevos hablaban de Ana Rivas, Luis Peña y Carlos Mora, y el CH de la demostración
   tiene otras 19 personas. La demo mostraba dos poblaciones que no se conocían entre sí: en el panel
   del día veías a unos, en Jornada a otros, y en la nómina a ninguno de los primeros. */

PRUEBAS.caso('⚠️ jornada, turnos y ausencia hablan de gente que ESTÁ en la nómina', () => {
  const nom = nominaDemo().map(x => dashNorm(x.persona));
  const duty = dutyDemo().personas.map(x => dashNorm(x.persona));
  const turn = turnosDemo().map(x => dashNorm(x.persona));
  const fuera = [...new Set([...duty, ...turn, dashNorm(DEMO_AUSENTE)])].filter(p => nom.indexOf(p) < 0);
  PRUEBAS.igual(fuera, [],
    '⚠️ toda persona con jornada, turno o ausencia tiene que estar en la nómina — ' + fuera.join(', '));
});

PRUEBAS.caso('⚠️ y esa gente es la del CH, no gente inventada', () => {
  /* `DEMO_GENTE` es la copia local del elenco que devuelve `action=demo`, verificada contra el
     endpoint el 2026-09-04. La prueba no sale a la red (no se toca producción): lo que fija es que
     todo lo que la demo muestre salga de esa lista y nadie agregue un nombre suelto al costado. */
  const elenco = DEMO_GENTE.map(q => dashNorm(q[0]));
  PRUEBAS.igual(elenco.length, 19, 'las 19 personas que tiene el CH de la demostración');
  const usados = [...new Set([].concat(
    dutyDemo().personas.map(x => x.persona),
    turnosDemo().map(x => x.persona),
    [DEMO_AUSENTE]
  ).map(dashNorm))];
  const inventados = usados.filter(p => elenco.indexOf(p) < 0);
  PRUEBAS.igual(inventados, [],
    '⚠️ nadie fuera del elenco del CH — ' + inventados.join(', '));
  /* Los pendientes SÍ son nombres nuevos, y tiene que ser así: alguien que todavía no usó la app
     no puede tener mediciones en el CH. Lo que se fija es que sean pocos y sólo pendientes. */
  const extra = nominaDemo().filter(x => elenco.indexOf(dashNorm(x.persona)) < 0);
  PRUEBAS.cierto(extra.every(x => !x.registrado),
    '⚠️ quien no está en el CH sólo puede figurar como PENDIENTE, nunca como dado de alta');
});

PRUEBAS.caso('⚠️ el departamento de cada uno sale de la misma tabla, no escrito dos veces', () => {
  /* Si `dutyDemo` dijera "Operaciones" y la nómina "Tripulación" para la misma persona, los filtros
     por departamento de una pantalla no encontrarían lo que la otra muestra. */
  const dep = {}; nominaDemo().forEach(x => dep[x.persona] = x.departamento);
  const malos = [].concat(dutyDemo().diario, turnosDemo())
    .filter(x => dep[x.persona] && x.departamento !== dep[x.persona])
    .map(x => x.persona + ': ' + x.departamento + ' ≠ ' + dep[x.persona]);
  PRUEBAS.igual(malos, [], '⚠️ mismo departamento en todas las pantallas — ' + malos.join(' · '));
});

PRUEBAS.caso('⚠️ y nada de esto se activa fuera de la demostración', () => {
  /* El discriminador que importa: si estos datos aparecieran en una empresa real, el panel estaría
     mostrando gente inventada mezclada con la de verdad. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const i = fuente.indexOf('DASH.duty = dutyDemo()');
  PRUEBAS.alMenos(i, 0, 'el enganche tiene que existir');
  if (i < 0) return;
  const bloque = fuente.slice(Math.max(0, i - 900), i);
  PRUEBAS.cierto(/if \(DASH\.demoMode\)\{/.test(bloque),
    '⚠️ los datos de ejemplo SÓLO se cargan dentro de la rama de demo');
});
