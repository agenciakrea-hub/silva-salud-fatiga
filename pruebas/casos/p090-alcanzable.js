/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 10 · EL CALENDARIO LLEGA A TRES CONTEXTOS, Y A NINGUNO MÁS (2026-09-22)

   Un bloque nuevo puede estar perfectamente escrito y no llegar nunca a la pantalla de quien lo
   necesita: es lo que ya pasó con `nominaRetomar()` (P143, viva en el código y muerta en
   producción) y con `duty`/`ausencias` (A4, mandadas por el servidor y descartadas al entrar).
   Acá se mide el ALCANCE, que es otra pregunta que «la función anda»: en qué estados de la app
   aparece el contenedor, y en cuáles NO.

   Los tres contextos son:
     (a) `dashFichaMedica(rows)` · rama COMPLETA  (persona con tests)      → `#cmesPanel`
     (b) `dashFichaMedica(rows)` · rama REDUCIDA  (sin tests, con autoreporte) → `#cmesPanel`
     (c) `renderSections()` → `cicloMiCalendarioBloque()` con `esPiloto:true`  → `#cmesMio`

   La rama (b) es el hueco más caro del prompt y no es hipotética: los ciclos salen de
   `DASH.operacional`, que no tiene NADA que ver con los tests. Un piloto con 30 días de jornadas
   y cero tests cae en la rama reducida, y ahí es justo donde el calendario tiene algo que contar.

   R17 · todo entra por el camino REAL: `onDashData(payload, emp, params, vista)` +
   `dashGoPerson(nombre)` + `renderDash()`, nunca `DASH = {…}` ni `dashFichaMedica()` llamada a
   mano para mirarle el string. Se mide el DOM que quedó pintado, que es lo que la persona ve.
   R11 · nada de `innerText` ni de capturas: `querySelector` + `textContent`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · dónde se cuelga el calendario de jornadas (y dónde NO)');

/* Un evento del ciclo, con la forma que escribe el servidor en `DASH.operacional`.
   Las claves de evento salen de `cicloEventos()` y no escritas a mano: son de idioma × sector
   (R14) y la forma puede declarar otras. Las horas van en UTC a media mañana/tarde a propósito:
   con Caracas (−4) el día operativo coincide con `iso.slice(0,10)`, así que el recorte por fecha
   de `cicloHistoricoFilas` y la casilla que sale de `fechaOpDe` hablan del mismo día. */
function p090alEv(persona, evento, iso){
  return { evento: evento, iso: iso, persona: persona, empresa: 'Consorcio HELITEC',
           departamento: 'Operaciones', cargo: 'Piloto', fecha: iso.slice(0, 10),
           plan: JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 }),
           test: '', resultado: null };
}
function p090alCiclo(persona, f){
  const horas = ['13:00', '14:00', '21:00', '22:00'];
  return cicloEventos().slice(0, horas.length).map(function(e, i){
    return p090alEv(persona, e.k, f + 'T' + horas[i] + ':00.000Z');
  });
}

function p090alPayload(vista, extra){
  const hoy = todayStr();
  return Object.assign({
    ok: true, rol: 'supervisor', vista: vista, combinada: false,
    referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 4 }],
    operacional: p090alCiclo('Ana Suárez', hoy),
    operacionalPeriodo: { dias: 30, desde: null, hasta: null, puedeVerHistorico: true },
    zonaOp: 'America/Caracas',
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null,
    ausencias: {}, config: {}, visor: null, visorError: null
  }, extra || {});
}

/* Entra al panel SIN RED: `gestPost` contesta con `respuestas[action]` (así los reportes pueden
   llegar por su camino de verdad) y `fetch`/`fetchConReloj` quedan colgados mientras dura la
   carga. Devuelve el `fin()` que limpia TODO lo que este caso ensució (R18) — incluido el
   `#dashBody`, que si no queda pintado y su `#cmesPanel` cuenta en el barrido del caso siguiente. */
function p090alEntrar(vista, extra, respuestas){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {});
  window.fetchConReloj = () => new Promise(() => {});
  window.gestPost = body => Promise.resolve((respuestas || {})[body && body.action] || { ok: true });
  try {
    onDashData(p090alPayload(vista, extra), 'Consorcio HELITEC',
      { action: 'supervisor', usuario: 'usuario-p090al', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p090al' },
      vista);
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){
    window.gestPost = oPost;
    try { stopDashAutoRefresh(); } catch(e){}
    DASH = prevDash;
    try { document.getElementById('dashBody').innerHTML = ''; } catch(e){}
    try {
      document.getElementById('portalDash').style.display = 'none';
      document.getElementById('portalGate').style.display = '';
    } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  };
}

const p090alQ = sel => document.querySelector(sel);
const p090alIdsCmes = raiz => [...document.querySelectorAll(raiz + ' .cmes')].map(x => x.id).sort();

/* ── (a) LA RAMA COMPLETA ─────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · (a) vista médico + persona CON tests: el calendario está en la ficha — y sin persona elegida no está', () => {
  CTX.resetear();
  const fin = p090alEntrar('medico');
  try {
    /* NEGATIVA PRIMERO, que es el discriminador de la positiva: recién entrado no hay persona
       elegida, la ficha no se pinta y el calendario no puede estar. Si estuviera acá, el aserto
       de abajo sería verde sin medir nada. */
    PRUEBAS.igual(DASH.f.per, '', 'guarda: se entra sin persona elegida');
    PRUEBAS.falso(!!p090alQ('#cmesPanel'), '🔴 DISCRIMINADOR · sin `DASH.f.per` no hay calendario en el panel');
    PRUEBAS.igual(dashFmCalendario(), '', 'y el enganche devuelve vacío, no un bloque escondido');

    dashGoPerson('Ana Suárez');
    PRUEBAS.igual(DASH.f.per, 'Ana Suárez', 'guarda: la ficha es la de Ana');
    PRUEBAS.cierto(!!p090alQ('#dashBody .fm-block'), 'guarda: la ficha médica se pintó');
    PRUEBAS.cierto(!!p090alQ('#dashBody .fm-lb'), 'guarda: es la rama COMPLETA (tiene la línea base por indicador)');
    PRUEBAS.cierto(!!p090alQ('#cmesPanel'), '🔴 el calendario está en el DOM de la ficha');
    PRUEBAS.cierto(!!p090alQ('.fm-block #cmesPanel'), 'y cuelga DENTRO de la ficha, no suelto en el panel');
    PRUEBAS.cierto(!!p090alQ('#cmesPanel .cmes-grid[role="grid"]'), 'con su grilla dibujada (no un contenedor vacío)');
    PRUEBAS.alMenos(document.querySelectorAll('#cmesPanel .cmes-d').length, 28, 'y con casillas de día adentro');

    /* volver a la lista lo saca: el gate funciona en los DOS sentidos */
    dashClear('per');
    PRUEBAS.falso(!!p090alQ('#cmesPanel'), 'DISCRIMINADOR · al salir de la ficha el calendario se va con ella');
  } finally { fin(); }
});

/* ── (b) LA RAMA REDUCIDA · el hueco más caro ─────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · (b) persona SIN tests y CON autoreporte: la rama REDUCIDA también lo lleva (los ciclos no dependen de los tests)', async () => {
  CTX.resetear();
  /* Los reportes llegan por su camino real: `onDashData` los pide con `gestPost({action:'reportes'})`
     y `dashCargarReportes` los guarda. Escribir `DASH._reportes = [...]` probaría el render, no que
     el panel pueda tener esa persona en pantalla (R17). */
  const reporte = { id: 'r-p090', opcion: 'no_dormi', identificado: true, persona: 'Marta Sin Tests',
                    empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto',
                    comentario: 'Dormí tres horas', creada: Date.now() - 3600000 };
  const fin = p090alEntrar('medico', {
    /* Marta tiene JORNADAS y ningún test: exactamente el caso de un piloto con 30 días de ciclo. */
    operacional: p090alCiclo('Ana Suárez', todayStr()).concat(p090alCiclo('Marta Sin Tests', todayStr()))
  }, { reportes: { ok: true, alcance: 'identificados', reportes: [reporte] } });
  /* ⚠️ R18 · el caso es asíncrono, así que la limpieza va en el `finally` de la FUNCIÓN ASYNC
     (corre después de los `await`), nunca en un `try/finally` sincrónico alrededor de la promesa:
     ése corre antes que el `.then` y deja los stubs de este caso puestos para el siguiente. */
  try {
    const llegaron = await PRUEBAS.esperarA(() => Array.isArray(DASH._reportes) && DASH._reportes.length > 0, 3000);
    PRUEBAS.cierto(llegaron, 'guarda: el autoreporte llegó por `dashCargarReportes`, no escrito a mano');
    PRUEBAS.igual(reportesDePersona('Marta Sin Tests').length, 1, 'guarda: la ficha lo va a encontrar');
    PRUEBAS.igual(DASH.registros.filter(r => r.persona === 'Marta Sin Tests').length, 0, 'guarda: Marta no tiene NINGÚN test');

    dashGoPerson('Marta Sin Tests');
    PRUEBAS.cierto(!!p090alQ('#dashBody .fm-block'), 'guarda: la ficha se pinta igual');
    PRUEBAS.falso(!!p090alQ('#dashBody .fm-lb'), 'guarda: es la rama REDUCIDA (sin línea base por indicador)');
    PRUEBAS.cierto((p090alQ('#dashBody .fm-block .db-sub') || {}).textContent === t('fm_sin_tests'),
      'guarda: con el aviso «sin tests», que es lo que distingue esta rama');
    PRUEBAS.cierto(!!p090alQ('#cmesPanel'), '🔴 el calendario también está acá · es la rama que se olvida, y es donde el piloto sin tests tiene 30 días de jornadas');
    PRUEBAS.cierto(!!p090alQ('.fm-block #cmesPanel'), 'dentro de la ficha reducida');
    PRUEBAS.alMenos(document.querySelectorAll('#cmesPanel .cmes-d').length, 28, 'con sus casillas');

    /* DISCRIMINADOR · la tercera salida de `dashFichaMedica`: sin tests Y sin reportes devuelve ''.
       Ahí no hay ficha, así que tampoco puede haber calendario. */
    dashGoPerson('Nadie Sin Nada');
    PRUEBAS.falso(!!p090alQ('#dashBody .fm-block'), 'DISCRIMINADOR · sin tests ni reportes la ficha no existe');
    PRUEBAS.falso(!!p090alQ('#cmesPanel'), 'DISCRIMINADOR · y sin ficha no hay calendario');
  } finally { fin(); }
});

/* ── (c) EL INICIO DEL PILOTO ─────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · (c) el inicio del piloto lo lleva — y un perfil que NO es piloto no tiene ni sección operacional ni calendario', () => {
  const prevLS = Object.assign({}, localStorage);
  try {
    /* `CTX.resetear()` deja el perfil con `esPiloto:true` y corre `renderSections()`: el camino
       real del arranque, no `cicloMiCalendarioBloque()` llamada a mano. */
    CTX.resetear();
    PRUEBAS.cierto(!!p090alQ('#sections .cic-mio'), 'guarda: la sección operacional se pintó');
    PRUEBAS.cierto(!!p090alQ('#sections #cmesMio'), '🔴 el calendario está en el inicio del piloto');
    PRUEBAS.cierto(!!p090alQ('#sections #cmesMio .cmes-grid[role="grid"]'), 'con su grilla');
    PRUEBAS.alMenos(document.querySelectorAll('#sections #cmesMio .cmes-d').length, 28, 'y con casillas de día');
    /* P090 lo pone ANTES del historial: el resumen primero, la lista después (R6). Se compara la
       posición en el documento, no el orden del string. */
    const cal = p090alQ('#sections #cmesMio'), hist = p090alQ('#sections #cicHist');
    PRUEBAS.cierto(!!hist, 'guarda: el historial de P167 sigue estando');
    PRUEBAS.cierto(!!(cal && hist && (cal.compareDocumentPosition(hist) & Node.DOCUMENT_POSITION_FOLLOWING)),
      'y el calendario va ARRIBA del historial (R6: resumen antes que detalle)');

    /* DISCRIMINADOR · quien no es piloto no tiene Data Operacional, así que tampoco calendario.
       Se afirman las DOS cosas: si sólo se mirara `#cmesMio`, un bloque que desapareciera por
       cualquier otra razón daría el mismo verde. */
    CTX.resetear({ cargo: 'Analista', esPiloto: false });
    PRUEBAS.falso(!!p090alQ('#sections .cic-mio'), 'DISCRIMINADOR · sin `esPiloto` no hay sección operacional');
    PRUEBAS.falso(!!p090alQ('#sections #cmesMio'), 'DISCRIMINADOR · y por lo tanto no hay calendario');
  } finally {
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { paintProfile(); renderSections(); } catch(e){}
  }
});

/* ── LAS NEGATIVAS DE VISTA ───────────────────────────────────────────────────────────────── */

PRUEBAS.caso('P090 · DISCRIMINADOR de vista · supervisor y Dirección NO lo ven, aunque tengan persona elegida', () => {
  ['supervisor', 'hseq'].forEach(function(vista){
    CTX.resetear();
    const fin = p090alEntrar(vista);
    try {
      dashGoPerson('Ana Suárez');
      /* El aserto de la persona es el que impide un verde vacío: si `dashGoPerson` no hubiera
         hecho nada, la ausencia del calendario no probaría que el gate es la VISTA. */
      PRUEBAS.igual(DASH.f.per, 'Ana Suárez', 'guarda: la persona quedó elegida en ' + vista);
      PRUEBAS.igual(DASH.vista, vista, 'guarda: la vista es ' + vista);
      PRUEBAS.falso(!!p090alQ('#cmesPanel'), 'DISCRIMINADOR · en ' + vista + ' el calendario no llega al DOM');
      PRUEBAS.igual(dashFmCalendario(), '', 'y el enganche devuelve vacío en ' + vista);
      PRUEBAS.falso(!!p090alQ('#dashBody .fm-block'), 'guarda: la ficha médica tampoco (es del médico) en ' + vista);
    } finally { fin(); }
  });
});

/* ── Y EN NINGÚN OTRO LADO ────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · la lista es EXACTA: los únicos contenedores `.cmes` del documento son `#cmesMio` (inicio) y `#cmesPanel` (ficha)', () => {
  CTX.resetear();
  PRUEBAS.igual(p090alIdsCmes('#sections'), ['cmesMio'], 'guarda: en el inicio hay UNO, no dos ni cero');
  const fin = p090alEntrar('medico');
  try {
    dashGoPerson('Ana Suárez');
    PRUEBAS.igual(p090alIdsCmes('#dashBody'), ['cmesPanel'], 'en el panel hay UNO · si alguien lo cuelga además del histórico, acá se ve');
    /* El barrido de TODO el documento: con las dos pantallas vivas a la vez tienen que ser
       exactamente estos dos. Un tercer enganche (el bloque histórico del panel, por ejemplo, que
       el plan descartó a propósito porque su único camino vivo mezcla clientes) se vería acá. */
    PRUEBAS.igual([...document.querySelectorAll('.cmes')].map(x => x.id).sort(), ['cmesMio', 'cmesPanel'],
      '🔴 dos contenedores en toda la app, con estos ids exactos');
    /* Y que no haya ninguno anónimo: un `.cmes` sin id no lo podría repintar `cmesRepintar`,
       que busca por `getElementById` — se vería bien y se quedaría con el mes del primer pintado. */
    PRUEBAS.igual([...document.querySelectorAll('.cmes')].filter(x => !x.id).length, 0,
      'ninguno sin id · `cmesRepintar` busca por `getElementById` y uno anónimo nunca se actualizaría');
  } finally { fin(); }
});
