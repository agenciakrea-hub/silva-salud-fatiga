/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P078 · I1-e (hallazgo 8) · APTITUD Y CICLO SE CRUZAN (2026-09-17)

   La tarjeta del ciclo muestra el semáforo de la persona (con gestiones, o la clasificación del
   servidor si no tiene tests en el período) y la tarjeta de Aptitud muestra su ciclo de hoy con lo
   que lleva; la ficha médica, las horas del período (Y4). Sin pedir nada nuevo. Camino real: `onDashData`
   con tests + eventos de ciclo, `renderCicloOperativo()`, `renderAptitud()`, `dashFichaMedica()`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P078_HOY = new Date().toISOString().slice(0, 10);
const p078Hace = h => new Date(Date.now() - h * 3600000).toISOString();
function p078Ev(persona, evento, h){
  return { evento, iso: p078Hace(h), persona, empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: p078Hace(h).slice(0, 10), plan: JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 }), test: '', resultado: null };
}
function p078Entrar(vista, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: vista, combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    /* Ana: test alto hoy (pendiente de revisión); Luis: sin tests en el período pero clasificado por el servidor */
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P078_HOY, kss: 9 }],
    /* la clasificación del servidor (E2a), con la forma completa que `aptPersona` consume */
    aptitud: [{ nombre: 'Ana Suárez', dep: 'Operaciones', n: 1, metricas: [{ m: 'kss', nivel: 'alto' }], pvt: null, auto: 'alto', empeoro: false, persist: false, nivel: 3, mrg: { amarillo: 0.85, rojo: 1 }, pocoConfiable: 0, ultimoPocoConfiable: false, dias: 0, viejo: false, ultimaFecha: P078_HOY, ultimaFechaConfiable: P078_HOY },
              { nombre: 'Luis Ferrer', dep: 'Operaciones', n: 3, metricas: [{ m: 'kss', nivel: 'ok' }], pvt: null, auto: 'ok', empeoro: false, persist: false, nivel: 3, mrg: { amarillo: 0.85, rojo: 1 }, pocoConfiable: 0, ultimoPocoConfiable: false, dias: 12, viejo: false, ultimaFecha: P078_HOY, ultimaFechaConfiable: P078_HOY }],
    operacional: [p078Ev('Ana Suárez', 'salida_casa', 10), p078Ev('Ana Suárez', 'llegada_aero', 9),
                  p078Ev('Luis Ferrer', 'salida_casa', 3), p078Ev('Luis Ferrer', 'llegada_aero', 2)],
    comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p078', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p078' }, vista);
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {} };
}
function p078Card(html, sel, persona, nomSel){
  const cont = document.createElement('div'); cont.innerHTML = html;
  return [...cont.querySelectorAll(sel)].find(c => (c.querySelector(nomSel) || {}).textContent === persona) || null;
}

PRUEBAS.caso('🔴 P078 · la tarjeta del ciclo muestra el semáforo de la persona: con tests (con gestiones) y sin tests (clasificación del servidor)', () => {
  const fin = p078Entrar('supervisor');
  try {
    const html = renderCicloOperativo();
    const ana = p078Card(html, '.cic-card', 'Ana Suárez', '.cic-nom');
    PRUEBAS.cierto(!!ana && !!ana.querySelector('.cic-apt'), '🔴 la tarjeta de Ana lleva el chip de aptitud');
    PRUEBAS.cierto(ana.querySelector('.cic-apt').textContent.indexOf(aptEstadoInfo('pendiente').t) >= 0, 'Ana: «pendiente de revisión» (su KSS 9 contra referencia 5) · ' + ana.querySelector('.cic-apt').textContent);
    const luis = p078Card(html, '.cic-card', 'Luis Ferrer', '.cic-nom');
    PRUEBAS.cierto(!!luis && luis.querySelector('.cic-apt') && luis.querySelector('.cic-apt').textContent.indexOf(aptEstadoInfo('ok').t) >= 0, '🔴 Luis sin tests en el período: el estado del servidor (en condiciones)');
    PRUEBAS.igual(aptEstadoDePersona('Nadie'), 'sindato', 'alguien sin nada: sin dato');
    PRUEBAS.igual(aptEstadoDePersona('Luis Ferrer'), 'ok', 'Luis (auto «ok» del servidor, sin tests en el período) → en condiciones');
    /* con una restricción vigente el estado cambia por gestiones y la tarjeta del ciclo lo refleja */
    const oC = window.confirm, oH = window.haptic, oT = window.showToast; window.confirm = () => true; window.haptic = () => {}; window.showToast = () => {};
    try {
      restAbrir('Ana Suárez'); document.getElementById('restrTarea').value = 'Vuelo'; restGuardar();
      const ana2 = p078Card(renderCicloOperativo(), '.cic-card', 'Ana Suárez', '.cic-nom');
      PRUEBAS.cierto(ana2.querySelector('.cic-apt').textContent.indexOf(aptEstadoInfo(aptGente(dashFiltered()).find(x => x.nombre === 'Ana Suárez').estado).t) >= 0, 'y sigue a `aptGente` (con la restricción puesta)');
    } finally { window.confirm = oC; window.haptic = oH; window.showToast = oT; try { clearTimeout(_gestSyncT); clearTimeout(_bitSyncT); } catch(e){} }
  } finally { fin(); }
});

PRUEBAS.caso('🔴 P078 · la tarjeta de Aptitud muestra el ciclo de hoy con lo que lleva, y lleva a la pestaña Ciclo', () => {
  const fin = p078Entrar('supervisor');
  try {
    DASH.f.per = 'Ana Suárez';
    const html = renderAptitud(dashFiltered());
    const cont = document.createElement('div'); cont.innerHTML = html;
    const linea = cont.querySelector('.apt-ciclo');
    PRUEBAS.cierto(!!linea, '🔴 la tarjeta de Aptitud de Ana lleva la línea del ciclo');
    PRUEBAS.cierto(linea.classList.contains('apt-ciclo-curso') && linea.querySelector('.cic-chip').textContent === t('cic_e_curso'), 'en curso (9 h de una jornada de 12)');
    PRUEBAS.cierto(/8 h|9 h/.test(linea.querySelector('.apt-ciclo-lleva').textContent) && linea.querySelector('.apt-ciclo-lleva').textContent.indexOf('12 h') >= 0, 'con lo que lleva y lo previsto · ' + linea.querySelector('.apt-ciclo-lleva').textContent);
    PRUEBAS.cierto(/dashScrollTo\('ciclo'\)/.test(linea.getAttribute('onclick')), 'y tocarla va a la pestaña Ciclo');
  } finally { fin(); }
  /* sin ciclo hoy: sin línea */
  const fin2 = p078Entrar('supervisor', { operacional: [] });
  try {
    DASH.f.per = 'Ana Suárez';
    PRUEBAS.igual(aptCicloLineaHtml('Ana Suárez'), '', 'DISCRIMINADOR · sin eventos de ciclo no hay línea');
  } finally { fin2(); }
});

PRUEBAS.caso('P078 · Dirección no ve el semáforo por persona; el médico ve las horas del período en la ficha', () => {
  const d = p078Entrar('hseq');
  try { PRUEBAS.igual(cicloAptitudChipHtml('Ana Suárez'), '', 'Dirección: sin chip (K1b)'); }
  finally { d(); }
  const m = p078Entrar('medico', { duty: { diario: [], historico: [], personas: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', dias: 3, jornadaMin: 2300, excesoMin: 140, diasConExceso: 2, umbralCongelado: true, promedioJornadaMin: 767 }] } });
  try {
    DASH.f.per = 'Ana Suárez';
    const html = dashFichaMedica(DASH.registros);
    PRUEBAS.cierto(html.indexOf(esc(t('fm_chip_jornada', { h: jorMin(2300), e: jorMin(140), n: 3 }))) >= 0, 'la ficha médica lleva el chip de jornada del período · ' + t('fm_chip_jornada', { h: jorMin(2300), e: jorMin(140), n: 3 }));
    PRUEBAS.igual(cicloAptitudChipHtml('Ana Suárez'), '', 'el médico no tiene tarjetas de ciclo: sin chip');
  } finally { m(); }
});

/* ── LO QUE ENCONTRÓ LA REVISIÓN ADVERSARIAL DE P078 ──────────────────────────────────────── */
PRUEBAS.caso('🔴 P078 · el CSS de la línea del ciclo, del chip de aptitud y del chip de jornada APLICA (medido, no leído)', () => {
  /* La primera versión dejó las reglas ADENTRO del bloque `.apt-restr { … }`: con CSS Nesting el navegador
     las leía como `.apt-restr .apt-ciclo` y el botón salía con el estilo nativo. El caso de arriba miraba el
     HTML, así que no lo vio (R17: un cero sin discriminador no es un resultado). Acá se monta y se mide. */
  const cont = document.createElement('div');
  cont.style.cssText = 'position:absolute;left:-9999px;top:0;width:320px';
  cont.innerHTML = '<div class="apt-card"><button type="button" class="apt-ciclo apt-ciclo-curso"><span class="cic-chip cic-chip-curso">x</span><span class="apt-ciclo-lleva">y <b>1 h</b></span></button></div>' +
    '<div class="cic-card"><span class="cic-apt" style="--anc:red;--anct:red;--anbg:pink">z</span></div>' +
    '<div class="fm-chips"><span class="fm-chip fm-chip-jornada">j</span><span class="fm-chip fm-chip-jornada-exc">e</span></div>';
  document.body.appendChild(cont);
  try {
    const cs = sel => getComputedStyle(cont.querySelector(sel));
    PRUEBAS.igual(cs('.apt-ciclo').display, 'flex', '🔴 .apt-ciclo es flex (no el botón nativo)');
    PRUEBAS.cierto(cont.querySelector('.apt-ciclo').getBoundingClientRect().width > 250, 'y ocupa el ancho de la tarjeta (width:100 %) · ' + Math.round(cont.querySelector('.apt-ciclo').getBoundingClientRect().width));
    PRUEBAS.igual(cs('.cic-apt').display, 'inline-flex', '🔴 .cic-apt es inline-flex');
    PRUEBAS.igual(cs('.cic-apt').borderRadius, '999px', 'redondeado como chip');
    PRUEBAS.igual(cs('.cic-apt').backgroundColor, 'rgb(255, 192, 203)', 'con el fondo del semáforo (--anbg)');
    const fondo = cs('.fm-chip-jornada').backgroundColor, fondoExc = cs('.fm-chip-jornada-exc').backgroundColor;
    PRUEBAS.cierto(fondo !== 'rgba(0, 0, 0, 0)' && fondo !== 'transparent', 'el chip de jornada del médico tiene fondo · ' + fondo);
    PRUEBAS.cierto(fondoExc !== 'rgba(0, 0, 0, 0)' && fondoExc !== fondo, 'y con exceso, otro · ' + fondoExc);
    /* DISCRIMINADOR: la misma regla anidada adentro de `.apt-restr` NO aplica (así se vería el defecto) */
    const st = document.createElement('style'); st.textContent = '.apt-restr { color:red; .p078-anidado { display:flex; } }';
    document.head.appendChild(st);
    const prueba = document.createElement('button'); prueba.className = 'p078-anidado'; cont.appendChild(prueba);
    try { PRUEBAS.cierto(getComputedStyle(prueba).display !== 'flex', 'DISCRIMINADOR · una regla anidada en `.apt-restr` no alcanza a un botón que no está adentro'); }
    finally { st.remove(); }
  } finally { cont.remove(); }
});

PRUEBAS.caso('P078 · la línea del ciclo sólo donde existe la pestaña Ciclo: el administrador en la vista médica no la ve', () => {
  const m = p078Entrar('medico', { rol: 'admin' });
  try {
    DASH.f.per = 'Ana Suárez';
    PRUEBAS.igual(DASH.rol, 'admin', 'guarda: admin en vista médica');
    PRUEBAS.igual(aptCicloLineaHtml('Ana Suárez'), '', 'sin línea: `dashScrollTo(\'ciclo\')` no tendría adónde ir');
    PRUEBAS.igual(cicloAptitudChipHtml('Ana Suárez'), '', 'ni chip');
  } finally { m(); }
  const s = p078Entrar('supervisor', { rol: 'admin' });
  try {
    DASH.f.per = 'Ana Suárez';
    PRUEBAS.cierto(aptCicloLineaHtml('Ana Suárez').indexOf('apt-ciclo') >= 0, 'DISCRIMINADOR · el mismo admin en la vista de supervisor sí la ve');
  } finally { s(); }
});
