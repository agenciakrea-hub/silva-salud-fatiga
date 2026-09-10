PRUEBAS.grupo('P169 · el historial operativo para el servicio médico y Dirección/HSEQ: cada botón con su hora');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Franco (2026-09-10): «era sobre todo para médico y HSEQ que vean el historial operativo, como
   ya habíamos pactado». Lo que había:
     · el servicio médico NO tiene pestaña de ciclo (`dashTabsFor`) y su pestaña «Jornada» mostraba
       siempre 7 días, sin botones de período: no había forma de pedir más;
     · «Jornada» decía «9 h 40 min» por fila y nada más: a qué hora salió de casa, llegó, se fue y
       volvió no se veía en ninguna pantalla de gestión («no se entiende cuándo le dio a cada botón
       en el histórico»);
     · en la pestaña de ciclo, en histórico, cada persona mostraba SÓLO su ciclo más reciente.
   Ahora: `leerDuty` manda `eventos` en cada fila (los mismos con los que midió esa jornada, no una
   segunda agrupación), «Jornada» los pinta con el rótulo del sector y la hora de la operación, tiene
   el selector 7/30/90 (con `exacto`: no recorta en cliente, pide al servidor), y en la pestaña de
   ciclo, en histórico, cada tarjeta lista todos sus ciclos con la misma lista que ve el piloto.

   R17: el panel se arma con `onDashData(payload)`; el pedido se mira reemplazando `window.fetch`.
   Se reusan los ayudantes de P089 (`p089Payload`, `p089Stub`, `p089Con`, `p089Entrar`…).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── el servidor ─────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 `leerDuty` manda en cada jornada los eventos con los que la midió · en orden, con su ISO', () => {
  const api = y4Env([]);
  const filas = y4Filas([
    y4Ev('Ana', '2026-09-01', '06:10', 'salida_casa'),
    y4Ev('Ana', '2026-09-01', '07:05', 'llegada_aero'),
    y4Ev('Ana', '2026-09-01', '15:40', 'salida_aero'),
    y4Ev('Ana', '2026-09-01', '16:30', 'llegada_casa'),
  ]);
  const d = api.leerDuty(filas, 7);
  PRUEBAS.igual(d.diario.length, 1, 'una jornada');
  const evs = d.diario[0].eventos;
  PRUEBAS.cierto(Array.isArray(evs), '🔴 la fila trae `eventos`');
  PRUEBAS.igual(evs.map(e => e.evento), ['salida_casa','llegada_aero','salida_aero','llegada_casa'], 'los cuatro, en el orden en que pasaron');
  PRUEBAS.igual(evs.map(e => e.iso), filas.map(f => f.iso), 'con el ISO exacto de cada uno');
  PRUEBAS.igual(Object.keys(evs[0]).sort(), ['evento','iso'], '⚠️ y nada más: ni nombre ni cédula viajan por acá (a HSEQ le llega anonimizada la fila)');
});

PRUEBAS.caso('⚠️ un turno de NOCHE lleva sus eventos en UNA fila, aunque crucen la medianoche', () => {
  /* Es la razón de no agrupar por fecha en el cliente: ya mordió una vez (ver `leerDuty`). */
  const api = y4Env([]);
  const d = api.leerDuty(y4Filas([
    y4Ev('Ana', '2026-09-01', '22:30', 'salida_casa'),
    y4Ev('Ana', '2026-09-01', '23:10', 'llegada_aero'),
    y4Ev('Ana', '2026-09-02', '07:00', 'salida_aero'),
    y4Ev('Ana', '2026-09-02', '07:45', 'llegada_casa'),
  ]), 7);
  PRUEBAS.igual(d.diario.length, 1, 'una sola jornada');
  PRUEBAS.igual(d.diario[0].fecha, '2026-09-01', 'atribuida al día en que empezó');
  PRUEBAS.igual(d.diario[0].eventos.length, 4, '⚠️ con los cuatro botones, los dos del día siguiente incluidos');
});

/* ── la hora en la zona de la operación ──────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 `horaOpDe` muestra la hora de la OPERACIÓN, no la del dispositivo', () => {
  const previa = localStorage.getItem(K_ZONA_OP);
  const dashPrev = DASH;
  try {
    DASH = null;                                          // que `cfg('zonaOp')` no interfiera
    zonaOpGuardar('America/Caracas');
    PRUEBAS.igual(horaOpDe(new Date('2026-09-01T10:10:00Z')), '06:10', '🔴 10:10Z en Caracas (UTC−4) es 06:10');
    PRUEBAS.igual(horaOpDe(new Date('2026-09-01T03:05:00Z')), '23:05', 'y de noche cruza de día sin inventar «24:05»');
    localStorage.removeItem(K_ZONA_OP);
    const d = new Date('2026-09-01T10:10:00Z');
    const local = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    PRUEBAS.igual(horaOpDe(d), local, 'EL DISCRIMINADOR · sin zona conocida, la del dispositivo (como `fechaOpDe`)');
  } finally {
    if (previa == null) localStorage.removeItem(K_ZONA_OP); else localStorage.setItem(K_ZONA_OP, previa);
    _hopZona = null; _hopFmt = null;                      // que el cache no arrastre la zona de prueba
    DASH = dashPrev;
  }
});

/* ── la pestaña Jornada ──────────────────────────────────────────────────────────────────── */

/* ⚠️ Las `const` de P089 (`P089_EMP`, `P089_RED`…) viven en el ámbito léxico de SU eval y no se
   ven desde acá; sus FUNCIONES sí (`p089Entrar`, `p089Payload`, `p089Salir`, `p089OpDias`…). Lo
   que hace falta de los datos se lee por las funciones, y el `fetch` de mentira es propio. */
const P169_EMP = () => p089Params().empresa;
const P169_RED = { llamadas: [] };
function p169Stub(resp){
  return (url, opts) => {
    P169_RED.llamadas.push({ url: String(url), body: (opts && opts.body) || '', metodo: (opts && opts.method) || 'GET' });
    if (resp == null) return new Promise(() => {});                  // en vuelo para siempre
    return Promise.resolve({ ok: true, status: 200, type: 'cors', json: () => Promise.resolve(resp) });
  };
}
async function p169Con(resp, fn){
  const antes = window.fetch;
  window.fetch = p169Stub(resp);
  P169_RED.llamadas.length = 0;
  try { await fn(); await p089Tick(); } finally { window.fetch = antes; }
}

const P169_DUTY = () => ({ dias:7, sinUmbralCongelado:0,
  diario:[
    { persona:'Ana Suárez', fecha:'2026-09-01', jornadaMin:515, previstoMin:720, excesoMin:0, abierto:false, umbralCongelado:true, tramos:[],
      eventos:[ { evento:'salida_casa', iso:'2026-09-01T10:10:00Z' }, { evento:'llegada_aero', iso:'2026-09-01T11:05:00Z' },
                { evento:'salida_aero', iso:'2026-09-01T19:40:00Z' }, { evento:'llegada_casa', iso:'2026-09-01T20:30:00Z' } ] },
    { persona:'Beto Pérez', fecha:'2026-09-01', jornadaMin:400, previstoMin:720, excesoMin:0, abierto:false, umbralCongelado:true, tramos:[] } ],
  personas:[ { persona:'Ana Suárez', dias:1, jornadaMin:515, excesoMin:0, diasConExceso:0, promedioJornadaMin:515, umbralCongelado:true } ],
  historico:[ { fecha:'2026-09-01', personas:2, excesoMin:0, conExceso:0 } ] });

function p169Jornada(duty, vista, extra){
  /* Por el camino real: `onDashData` arma DASH y pinta las secciones; se lee `#dsec-jornada`. */
  const prev = p089Entrar(7, undefined, vista || 'medico');
  const fetchAntes = window.fetch;
  window.fetch = p169Stub({ ok:true });
  try {
    onDashData(p089Payload(7, Object.assign({ duty: duty, vista: vista || 'medico' }, extra || {})), P169_EMP(), p089Params(), vista || 'medico');
    stopDashAutoRefresh(); cicloTickStop();
  } finally { window.fetch = fetchAntes; }
  P169_RED.llamadas.length = 0;
  return prev;
}

PRUEBAS.caso('🔴 en «Jornada» cada fila dice QUÉ botón se tocó y A QUÉ HORA · rótulos del sector, hora de la operación', () => {
  const previa = localStorage.getItem(K_ZONA_OP);
  let prev;
  try {
    zonaOpGuardar('America/Caracas'); _hopZona = null;
    prev = p169Jornada(P169_DUTY(), 'medico');
    const sec = document.getElementById('dsec-jornada');
    PRUEBAS.cierto(!!sec, 'precondición · el servicio médico tiene la pestaña de jornada');
    const filas = [...sec.querySelectorAll('.jor-tabla')].pop().querySelectorAll('tbody tr');
    PRUEBAS.igual(filas.length, 2, 'dos jornadas en el detalle');
    const ana = [...filas].find(tr => /Ana/.test(tr.textContent));
    const evs = [...ana.querySelectorAll('.jor-ev')];
    PRUEBAS.igual(evs.length, 4, '🔴 los cuatro botones de Ana');
    PRUEBAS.igual(evs.map(e => e.querySelector('.jor-ev-h').textContent), ['06:10','07:05','15:40','16:30'],
      '🔴 con la hora de la operación (Caracas), no la del dispositivo');
    PRUEBAS.igual(evs.map(e => e.querySelector('.jor-ev-k').textContent), cicloEventos().map(e => t(e.lbl)),
      '⚠️ y los rótulos salen de t() por sector (R14), no escritos a mano');
    const beto = [...filas].find(tr => /Beto/.test(tr.textContent));
    PRUEBAS.igual(beto.querySelector('.jor-evs').textContent, '—', 'EL DISCRIMINADOR · una fila vieja sin `eventos` muestra un guion, no inventa horas');
    const enc = [...sec.querySelectorAll('.jor-tabla')].pop().querySelectorAll('thead th');
    PRUEBAS.cierto([...enc].some(th => th.textContent === t('jor_c_botones')), 'con su encabezado');
  } finally {
    if (previa == null) localStorage.removeItem(K_ZONA_OP); else localStorage.setItem(K_ZONA_OP, previa);
    _hopZona = null; _hopFmt = null;
    if (prev) p089Salir(prev);
  }
});

PRUEBAS.caso('🔴 el servicio médico tiene los botones de período EN «Jornada» · antes veía 7 días sin poder pedir más', () => {
  const prev = p169Jornada(P169_DUTY(), 'medico');
  try {
    const sec = document.getElementById('dsec-jornada');
    const botones = [...sec.querySelectorAll('.cic-per')];
    PRUEBAS.igual(botones.map(b => b.textContent), [t('per_7dias'), t('per_30dias'), t('per_90dias')],
      '🔴 7, 30 y 90 · sin «En curso», que acá no significa nada');
    PRUEBAS.igual(botones.filter(b => b.classList.contains('on')).map(b => b.textContent), [t('per_7dias')],
      'con 7 encendido: el default `hoy` también son 7 días');
    PRUEBAS.cierto(botones.every(b => /cicloPeriodoSet\('\d+', true\)/.test(b.getAttribute('onclick'))),
      '⚠️ y piden con `exacto`: Jornada no recorta en cliente (su cálculo vive en el servidor)');
    PRUEBAS.falso(!!document.getElementById('dsec-ciclo'), 'precondición · el médico sigue SIN pestaña de ciclo: ésta es su única puerta al histórico');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · sin `puedeVerHistorico` no hay botones, y en la demostración tampoco', () => {
  let prev = p169Jornada(P169_DUTY(), 'medico', { operacionalPeriodo: { dias:7, desde:null, hasta:null, puedeVerHistorico:false } });
  try {
    PRUEBAS.igual(document.getElementById('dsec-jornada').querySelectorAll('.cic-per').length, 0, 'sin permiso del servidor, sin botones');
  } finally { p089Salir(prev); }
  const dashPrev = DASH;
  try {
    DASH = { vista:'medico', duty: P169_DUTY(), demoMode:true, operacionalPeriodo:{ dias:7, puedeVerHistorico:true } };
    PRUEBAS.falso(/cic-per\b/.test(renderJornada()), 'en la demostración no se ofrecen: no hay a quién pedirle más días');
  } finally { DASH = dashPrev; }
});

PRUEBAS.caso('🔴 tocar «30 días» desde Jornada PIDE 30 al servidor y la pestaña se repinta con lo que vino', async () => {
  const prev = p169Jornada(P169_DUTY(), 'medico');
  try {
    const resp30 = p089Payload(30, { vista:'medico', duty: Object.assign(P169_DUTY(), { dias:30 }) });
    await p169Con(resp30, () => { cicloPeriodoSet('30', true); });
    PRUEBAS.igual(P169_RED.llamadas.length, 1, 'sale UN pedido');
    PRUEBAS.igual(p089OpDias(P169_RED.llamadas[0]), 30, '🔴 con `opDias=30`');
    const sec = document.getElementById('dsec-jornada');
    PRUEBAS.cierto(sec.textContent.indexOf(t('jor_lead', { dias:30 })) >= 0, '🔴 y Jornada dice «últimos 30 días»');
    PRUEBAS.igual([...sec.querySelectorAll('.cic-per.on')].map(b => b.textContent), [t('per_30dias')], 'con 30 encendido');
    PRUEBAS.falso(!!sec.querySelector('.cic-cargando'), 'y sin el aviso de carga');
    PRUEBAS.falso(sec.hasAttribute('inert'), 'ni bloqueada');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 con `exacto`, volver de 90 a 30 SÍ pide · el ciclo recorta en cliente, Jornada no puede', async () => {
  const prev = p169Jornada(Object.assign(P169_DUTY(), { dias:90 }), 'hseq',
                           { operacionalPeriodo: { dias:90, desde:null, hasta:null, puedeVerHistorico:true } });
  try {
    PRUEBAS.igual(cicloDiasTraidos(), 90, 'precondición · vinieron 90');
    await p169Con(p089Payload(30, { duty: Object.assign(P169_DUTY(), { dias:30 }) }), () => { cicloPeriodoSet('30', true); });
    PRUEBAS.igual(P169_RED.llamadas.length, 1, '🔴 pide igual: 30 días de jornada no son «los 90 recortados»');
    PRUEBAS.igual(p089OpDias(P169_RED.llamadas[0]), 30, 'con `opDias=30`');
    P169_RED.llamadas.length = 0;
    await p169Con(p089Payload(30), () => { cicloPeriodoSet('30', true); });
    PRUEBAS.igual(P169_RED.llamadas.length, 0, 'EL DISCRIMINADOR · si el servidor ya sirvió exactamente 30, no se pide de nuevo');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 `duty` se copia aunque la lista de eventos no haya cambiado · si no, Jornada decía «7 días» con 30 encendido', async () => {
  const prev = p169Jornada(P169_DUTY(), 'medico');
  try {
    /* Misma `operacional` (la firma no cambia), pero el servidor dice que sirvió 30 días. */
    const igual = p089Payload(7, { vista:'medico', duty: Object.assign(P169_DUTY(), { dias:30 }),
                                   operacionalPeriodo: { dias:30, desde:null, hasta:null, puedeVerHistorico:true } });
    await p169Con(igual, () => { cicloPeriodoSet('30', true); });
    PRUEBAS.igual(DASH.duty && DASH.duty.dias, 30, '🔴 `DASH.duty` es el del período nuevo');
    PRUEBAS.cierto(document.getElementById('dsec-jornada').textContent.indexOf(t('jor_lead', { dias:30 })) >= 0, 'y la pestaña lo dice');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('⚠️ mientras el período viaja, Jornada avisa y queda fuera de alcance', async () => {
  const prev = p169Jornada(P169_DUTY(), 'medico');
  try {
    await p169Con(null, () => { cicloPeriodoSet('90', true); });   // en vuelo para siempre
    const sec = document.getElementById('dsec-jornada');
    PRUEBAS.cierto(!!sec.querySelector('.cic-cargando'), 'el aviso «trayendo 90 días»');
    PRUEBAS.cierto(sec.hasAttribute('inert'), '⚠️ y la sección bloqueada (la de ciclo no existe para el médico: se bloquea la que hay)');
  } finally {
    try { cargaBloquear(document.getElementById('dsec-jornada'), 'reset'); } catch (e) {}
    p089Salir(prev);
  }
});

/* ── la pestaña de ciclo, en histórico ───────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 en histórico, la tarjeta de cada persona lista TODOS sus ciclos del período · antes sólo el más reciente', () => {
  /* Se dibuja en la vista con tarjetas por persona y permiso de histórico (admin; el arnés lo
     fuerza en `supervisor`, como P089). HSEQ no tiene tarjetas: su historial es «Jornada». */
  const prev = p089Entrar(30, undefined, 'supervisor');
  try {
    CICLO_PERIODO = '30'; cicloRepintar();
    const sec = document.getElementById('dsec-ciclo');
    const det = sec.querySelector('.cic-card .cic-hist-panel, .cic-hist-panel');
    PRUEBAS.cierto(!!det, '🔴 la tarjeta tiene el bloque de historial');
    PRUEBAS.falso(det.open, 'plegado (R6)');
    const dias = det.querySelectorAll('.cic-hist-dia');
    PRUEBAS.igual(dias.length, 30, '🔴 los 30 ciclos del período, no uno');
    /* El ciclo de HOY del molde de P089 tiene dos botones en el futuro (`p089Operacional` los arma
       hacia atrás desde las 06:00); se mide uno cerrado, el de ayer. */
    PRUEBAS.igual(dias[1].querySelectorAll('.cic-hist-ev').length, 4, 'cada uno con sus cuatro botones y su hora');
    PRUEBAS.cierto(det.querySelector('.cic-hist-sum').textContent.indexOf('30') >= 0, 'y el título cuenta');
    CICLO_PERIODO = 'hoy'; cicloRepintar();
    PRUEBAS.falso(!!sec.querySelector('.cic-hist-panel'), 'EL DISCRIMINADOR · en «En curso» no aparece: es la vista de siempre');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('⚠️ `cicloRepintar` repinta Jornada aunque no exista la sección de ciclo', () => {
  const prev = p169Jornada(P169_DUTY(), 'medico');
  try {
    const sec = document.getElementById('dsec-jornada');
    sec.innerHTML = '<i id="p169-marca"></i>';
    cicloRepintar();
    PRUEBAS.falso(!!document.getElementById('p169-marca'), '⚠️ se volvió a pintar');
    PRUEBAS.cierto(sec.querySelectorAll('.jor-tabla').length >= 1, 'con la tabla de siempre');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('⚠️ la demostración muestra la función: sus jornadas traen los botones con su hora', () => {
  const d = dutyDemo();
  const cerradas = d.diario.filter(f => !f.abierto), abiertas = d.diario.filter(f => f.abierto);
  PRUEBAS.cierto(cerradas.every(f => f.eventos && f.eventos.length === 4), 'las jornadas cerradas con cuatro botones');
  PRUEBAS.cierto(abiertas.every(f => f.eventos && f.eventos.length === 2), 'y la abierta con dos: todavía no salió');
  PRUEBAS.igual(cerradas[0].eventos.map(e => e.evento), cicloEventos().map(e => e.k), 'con los eventos del sector, en orden');
});

PRUEBAS.caso('⚠️ CSS sin color a mano (R13) y textos en los dos idiomas (R14)', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const i = css.indexOf('.jor-evs {');
  PRUEBAS.cierto(i > 0, 'guarda: se leyó el CSS');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css.slice(i, i + 400)), '⚠️ ni un color a mano');
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['jor_diario_lead','jor_c_botones','cic_hist_ver'].forEach(k => PRUEBAS.cierto(t(k, { n:3 }) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});
