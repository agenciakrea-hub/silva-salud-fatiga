/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P076b · EL SELECTOR «EMPLEADO» SE ARMA CON NÓMINA + TESTS + CICLO, Y NO SUELTA A LA PERSONA (2026-09-17)

   Se armaba sólo con los tests del período: quien estaba en el ciclo sin tests no aparecía, y como
   `dashFilterChange` relee el `<select>`, tocar las fechas con esa persona elegida la soltaba en silencio.
   Camino real: `onDashData` → `buildDashFilters()` → `#dashPer`; `dashGoPerson`; `dashSetPeriod` + `dashFilterChange`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

function p076bEntrar(vista, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10);
  const hace = h => new Date(Date.now() - h * 3600000).toISOString();
  const ev = (persona, dep, evento, h) => ({ evento, iso: hace(h), persona, empresa: 'Consorcio HELITEC', departamento: dep, cargo: 'Piloto', fecha: hace(h).slice(0, 10), plan: JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 }), test: '', resultado: null });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: vista || 'supervisor', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    /* Ana: test hoy · Luis: en el ciclo, sin tests · Mario: clasificado por el servidor, sin tests en el período · Zoe: en la nómina, nunca medida */
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 4 }],
    aptitud: [{ nombre: 'Mario Ruiz', dep: 'Operaciones', n: 2, metricas: [{ m: 'kss', nivel: 'ok' }], pvt: null, auto: 'ok', empeoro: false, persist: false, nivel: 3, mrg: { amarillo: 0.85, rojo: 1 }, pocoConfiable: 0, ultimoPocoConfiable: false, dias: 20, viejo: true, ultimaFecha: '', ultimaFechaConfiable: '' }],
    operacional: [ev('Luis Ferrer', 'Mantenimiento', 'salida_casa', 3), ev('Luis Ferrer', 'Mantenimiento', 'llegada_aero', 2)],
    nominaSinDato: ['Zoe Paz'], nominaTotal: 4,
    comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p076b', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p076b' }, vista || 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {} };
}
const p076bOpciones = () => [...document.querySelectorAll('#dashPer option')].map(o => o.value).filter(Boolean);

PRUEBAS.caso('🔴 P076b · el selector «Empleado» lista a quien tiene tests, a quien está en el ciclo sin tests, a quien clasificó el servidor y a la nómina sin medir', () => {
  const fin = p076bEntrar('supervisor');
  try {
    PRUEBAS.igual(p076bOpciones(), ['Ana Suárez', 'Luis Ferrer', 'Mario Ruiz', 'Zoe Paz'], '🔴 los cuatro, ordenados · ' + p076bOpciones().join(' | '));
    /* con filtro por departamento: sólo los que tienen ese departamento (la nómina sin medir no lo trae) */
    DASH.f.dep = 'Operaciones'; buildDashFilters();
    PRUEBAS.igual(p076bOpciones(), ['Ana Suárez', 'Mario Ruiz'], 'Operaciones: Ana y Mario (Luis es de Mantenimiento; Zoe no tiene departamento conocido)');
    DASH.f.dep = 'Mantenimiento'; buildDashFilters();
    PRUEBAS.igual(p076bOpciones(), ['Luis Ferrer'], 'Mantenimiento: Luis, que sólo tiene ciclo');
    DASH.f.dep = ''; buildDashFilters();
    /* DISCRIMINADOR: la lista de antes (sólo tests) tenía a una */
    PRUEBAS.igual(uniqSorted(DASH.registros, 'persona'), ['Ana Suárez'], 'DISCRIMINADOR · con los tests solos, la lista era Ana y nadie más');
  } finally { fin(); }
});

PRUEBAS.caso('🔴 P076b · elegir a alguien del ciclo sin tests y tocar las fechas NO suelta el filtro', () => {
  const fin = p076bEntrar('supervisor');
  try {
    dashGoPerson('Luis Ferrer');
    PRUEBAS.igual(DASH.f.per, 'Luis Ferrer', 'guarda: la persona quedó elegida');
    PRUEBAS.igual(fval('dashPer'), 'Luis Ferrer', '🔴 y el <select> la muestra (tiene su <option>)');
    dashSetPeriod('custom');
    const desde = document.getElementById('dashDesde'); desde.value = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    dashFilterChange();
    PRUEBAS.igual(DASH.f.per, 'Luis Ferrer', '🔴 cambiar las fechas conserva a la persona');
    if (document.getElementById('dashNivel')) { dashFilterChange('nivel'); PRUEBAS.igual(DASH.f.per, 'Luis Ferrer', 'cambiar el nivel también'); }
    /* alguien elegido por otra ruta que no está en ninguna fuente: se conserva igual */
    DASH.f.per = 'Persona Elegida'; buildDashFilters();
    PRUEBAS.cierto(p076bOpciones().indexOf('Persona Elegida') >= 0 && fval('dashPer') === 'Persona Elegida', 'lo elegido siempre está en la lista, venga de donde venga');
    dashFilterChange();
    PRUEBAS.igual(DASH.f.per, 'Persona Elegida', 'y sobrevive a una relectura');
    /* DISCRIMINADOR · sin su <option>, la relectura la suelta: es exactamente el defecto */
    const sel = document.getElementById('dashPer'); [...sel.options].filter(o => o.value === 'Persona Elegida').forEach(o => o.remove());
    dashFilterChange();
    PRUEBAS.igual(DASH.f.per, '', 'DISCRIMINADOR · sin la <option>, `dashFilterChange` la suelta (por eso la lista tiene que tenerla)');
    /* cambiar de departamento sí la suelta, a propósito (cascada de siempre) */
    dashGoPerson('Luis Ferrer'); DASH.f.dep = 'Operaciones'; buildDashFilters(); dashFilterChange('dep');
    PRUEBAS.igual(DASH.f.per, '', 'cambiar el departamento resetea la persona (cascada, como siempre)');
  } finally { fin(); }
});

PRUEBAS.caso('P076b · Dirección no gana nombres por el selector: lista lo anonimizado y la nómina sin medir no viaja', () => {
  const fin = p076bEntrar('hseq', {
    registros: [{ persona: 'P1', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: new Date().toISOString().slice(0, 10), kss: 4 }],
    aptitud: [], operacional: [], nominaSinDato: []
  });
  try {
    PRUEBAS.igual(DASH.vista, 'hseq', 'guarda: Dirección');
    const ops = p076bOpciones();
    PRUEBAS.cierto(ops.length === 0 || ops.every(x => /^P\d+$/.test(x)), 'sólo rótulos anonimizados (o ninguno) · ' + ops.join(','));
  } finally { fin(); }
});

PRUEBAS.caso('P076b · a alguien de la nómina sin tests ni ciclo no se le ofrecen acciones desde Aptitud: no hay con qué resolver su nivel (R3)', () => {
  const fin = p076bEntrar('supervisor');
  try {
    dashGoPerson('Zoe Paz');
    const cont = document.createElement('div'); cont.innerHTML = renderAptitud(dashFiltered());
    PRUEBAS.cierto(cont.textContent.indexOf('Zoe Paz') >= 0 && cont.textContent.indexOf(t('apt_sin_contexto')) >= 0, 'dice quién es y por qué no hay acciones · ' + t('apt_sin_contexto').slice(0, 60));
    PRUEBAS.igual(cont.querySelector('.apt-acciones'), null, 'sin botones de restringir/telemedicina');
    PRUEBAS.falso(personaConContexto('Zoe Paz'), 'guarda: sin contexto');
    /* DISCRIMINADOR · Luis (en el ciclo, con departamento) sí tiene acciones, como desde P076 */
    dashGoPerson('Luis Ferrer');
    const c2 = document.createElement('div'); c2.innerHTML = renderAptitud(dashFiltered());
    PRUEBAS.cierto(personaConContexto('Luis Ferrer') && !!c2.querySelector('.apt-acciones'), 'DISCRIMINADOR · Luis, con ciclo y departamento: con acciones');
    PRUEBAS.cierto(personaConContexto('Mario Ruiz'), 'y Mario, clasificado por el servidor, también tiene contexto');
  } finally { fin(); }
});
