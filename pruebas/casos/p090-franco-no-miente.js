/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 8 · EL DÍA DE FRANCO SE DIBUJA COMO FRANCO, Y SÓLO DONDE SE SABE (2026-09-22)

   R4 no es un adorno acá: una casilla vacía tiene tres explicaciones distintas —cubierta y sin
   jornada, fuera de lo que se pidió, y ausencia aprobada— y pintar cualquiera de ellas como si
   fuera «no reportó» es una afirmación falsa sobre una persona en una pantalla que un médico lee
   como evidencia. `cmesCasoDia` (`index.html:14155`) es la única función que decide, y el orden de
   sus cuatro `if` ES la regla: futuro → fuera de cobertura → lo que registró → franco → sin jornada.

   LAS AUSENCIAS SÓLO EXISTEN EN EL PANEL. El teléfono del piloto nunca las recibe, así que en el
   ámbito `'mio'` el mismo día NO puede decir «No le correspondía trabajar»: diría algo que la app
   no sabe. Por eso el `if` lleva `ambito === 'panel'` adentro.

   CAMINO REAL (R17), y acá pesa más que en ningún otro caso: `DASH.ausencias = {…}` a mano es
   EXACTAMENTE lo que ocultó el hallazgo A4 —el servidor mandaba `duty` y `ausencias`, la lista
   explícita de `onDashData` no los nombraba, y dos prompts enteros pasaron su suite en verde
   entregando funciones que del lado del cliente no existían—. Acá el índice entra por
   `onDashData(payload, empresa, params, 'medico')` y la persona se elige con `dashGoPerson`.

   LA CLAVE DEL ÍNDICE, leída del código y no recordada: `ausentePersonaEse` (`index.html:22732`)
   busca `'n:' + ausNombreClave(nombre) + '|' + fecha`. ⚠️ Es `ausNombreClave`, NO `dashNorm`:
   `ausNombreClave` replica el `norm()` del endpoint (que es quien arma la clave, `Código.js:1369`)
   y saca la puntuación; `dashNorm` la deja. Para "Luis O'Brien" las dos dan distinto. Acá la clave
   se escribe con el literal `'n:persona de prueba|…'` a propósito: si se armara llamando a la
   misma función que después la lee, la prueba sería una tautología.

   R11 · nada de `innerText`: `classList`, `getAttribute('aria-label')` y `textContent`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · calendario de jornadas: el día de franco no se lee como «no reportó»');

const P090FR_PER = 'Persona De Prueba';
const P090FR_EMP = 'Empresa De Prueba';
/* El nombre normalizado ESCRITO A MANO. Es lo que el endpoint pone en la clave; si algún día
   `ausNombreClave` y el `norm()` del .gs se separan, el caso se pone rojo, que es lo que se quiere. */
const P090FR_CLAVE = 'persona de prueba';
/* Los casos que el calendario considera «hay que mirar esto»: los que pintan rojo o ámbar. Es la
   MISMA lista que `cmesResumen` usa para las fichas de excepción (`index.html:14166`). */
const P090FR_ALARMA = ['exceso', 'excedido', 'sin_cierre', 'detenido', 'parcial'];

function p090frEv(evento, horasAtras){
  const iso = new Date(Date.now() - horasAtras * 3600000).toISOString();
  return { evento: evento, iso: iso, persona: P090FR_PER, empresa: P090FR_EMP,
           departamento: 'Operaciones', cargo: 'Piloto', fecha: iso.slice(0, 10),
           plan: JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 }),
           test: '', resultado: null };
}

/* Entra al panel como servicio médico y abre la ficha de la persona. `ausencias` es el índice tal
   como lo manda el servidor; puede ser una función `(dia) => índice`, porque el día sólo se conoce
   una vez limpiado el `DASH` que dejó el caso anterior (ver abajo). Devuelve `{ dia, fin }`. */
function p090frEntrar(ausencias, extra){
  const prevLS = Object.assign({}, localStorage);
  const prevDash = DASH;
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  /* Se limpia ANTES de calcular el día: `todayStr()` pasa por `zonaOperacion()`, que lee
     `DASH.zonaOp` primero. Con el DASH que dejó otro caso, el día de la ausencia y el día que
     dibuja la grilla podrían no ser el mismo y el caso fallaría por el entorno, no por el código. */
  DASH = null;
  CTX.resetear();
  const dia = fechaMasDias(todayStr(), -3);     // pasado y cubierto: ni `futuro` ni `fuera`
  const hoy = todayStr();
  window.gestPost = () => Promise.resolve({ ok: true });
  window.fetch = () => new Promise(() => {});
  window.fetchConReloj = () => new Promise(() => {});
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'medico', combinada: false,
    referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: P090FR_PER, empresa: P090FR_EMP, departamento: 'Operaciones',
                  cargo: 'Piloto', fecha: hoy, kss: 4 }],
    /* Sin un solo evento operacional: así todo día pasado y cubierto queda vacío, y lo único que
       puede pintar una casilla es la ausencia. Es el escenario que R4 protege. */
    operacional: [],
    operacionalPeriodo: { dias: 400, desde: null, hasta: null },
    ausencias: (typeof ausencias === 'function') ? ausencias(dia) : ausencias,
    comentarios: [], pvt: [], aptitud: [], turnos: [], duty: null, marca: null,
    config: {}, visor: null, visorError: null
  }, extra || {});
  onDashData(payload, P090FR_EMP, { action: 'supervisor', usuario: 'usuario-p090fr',
    empresa: P090FR_EMP, pass: 'x', dispositivoId: 'p090fr' }, 'medico');
  dashGoPerson(P090FR_PER);
  /* El mes se fija DESPUÉS de `dashGoPerson`: `cmesMes('panel')` resetea el mes al cambiar de
     persona (si no, la ficha de alguien se abriría en el mes que quedó de la anterior). */
  cmesMesSet('panel', dia.slice(0, 7)); cmesDiaSet('panel', null);
  cmesRepintar('panel', null);
  return { dia: dia, fin: function(){
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost;
    DASH = prevDash;
    try { cmesMesSet('mio', null); cmesDiaSet('mio', null); } catch(e){}
    try { document.getElementById('dashBody').innerHTML = ''; } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { renderSections(); } catch(e){}
  } };
}

function p090frCelda(cont, f){ return document.querySelector('#' + cont + ' .cmes-d[data-f="' + f + '"]'); }
function p090frCeldas(cont){ return [...document.querySelectorAll('#' + cont + ' .cmes-d')]; }
function p090frPie(cont){
  const el = document.querySelector('#' + cont + ' .cmes-pie');
  return el ? el.textContent : '';
}
function p090frConAlarma(cont){
  return p090frCeldas(cont).filter(b => P090FR_ALARMA.some(c => b.classList.contains('cmes-c-' + c)));
}

/* ── 1 · LO QUE AFIRMA EL CASO ──────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · un día con ausencia aprobada dice «No le correspondía trabajar», no «sin jornada»', () => {
  /* La clave del índice se arma con el día que va a dibujar la grilla, no con uno calculado antes
     de limpiar el `DASH` del caso anterior: `todayStr()` pasa por `zonaOperacion()`. */
  const e2 = p090frEntrar(dia => ({ ['n:' + P090FR_CLAVE + '|' + dia]: 'franco' }));
  try {
    /* Guarda del CAMINO: que el índice haya sobrevivido a la lista explícita de `onDashData`. Sin
       esta línea, todo lo de abajo podría estar midiendo un payload que se tiró al entrar (A4). */
    PRUEBAS.cierto(ausentePersonaEse(P090FR_PER, e2.dia),
      '🔴 guarda A4 · la ausencia llegó viva hasta `ausentePersonaEse` por `onDashData`, sin tocar `DASH.ausencias` a mano');
    PRUEBAS.existe('#cmesPanel', 'guarda: el calendario está en la ficha del servicio médico');

    const cel = p090frCelda('cmesPanel', e2.dia);
    PRUEBAS.cierto(!!cel, 'guarda: la casilla del ' + e2.dia + ' existe en la grilla');
    PRUEBAS.cierto(cel.classList.contains('cmes-c-franco'),
      '🔴 la casilla lleva el caso `franco` · clases: ' + cel.className);
    PRUEBAS.falso(cel.classList.contains('cmes-c-sin_jornada'),
      'y NO «sin jornada registrada»: la app sabe por qué está vacía y lo dice');
    PRUEBAS.cierto((cel.getAttribute('aria-label') || '').indexOf(t('cmes_e_franco')) >= 0,
      '🔴 y su nombre accesible lo dice con todas las letras · ' + cel.getAttribute('aria-label'));
    const marca = cel.querySelector('.cmes-p');
    PRUEBAS.cierto(!!marca && marca.textContent === t('cmes_m_franco'),
      'con la marca de franco, por `t()` y no escrita a mano (R14) · ' + (marca ? marca.textContent : '(sin marca)'));

    /* R6 · un franco no es una excepción que mirar: no puede entrar a las fichas de arriba */
    PRUEBAS.igual(p090frConAlarma('cmesPanel').map(b => b.getAttribute('data-f')), [],
      '🔴 ninguna casilla del mes queda en rojo ni en ámbar: un mes sin jornadas no acusa a nadie');

    /* ⚠️ LO QUE ESTE ASERTO DICE Y NO PUDE CONFIRMAR CORRIENDO: con el índice cargado, el pie NO
       tiene que advertir «no hay ausencias cargadas» — esa línea existe para que el médico sepa
       que una casilla vacía puede ser un descanso, y con las ausencias a la vista sobra. */
    PRUEBAS.falso(p090frPie('cmesPanel').indexOf(t('cmes_sin_ausencias')) >= 0,
      '🔴 con ausencias cargadas el pie NO advierte «no hay ausencias cargadas» · ' + p090frPie('cmesPanel'));
  } finally { e2.fin(); }
});

/* ── 2 · DISCRIMINADOR (a) · SIN EL ÍNDICE, EL MISMO DÍA CAMBIA ─────────────────────────────── */

PRUEBAS.caso('🔴 DISCRIMINADOR P090 · con `ausencias:{}` el MISMO día pasa a «sin jornada» y el pie lo advierte', () => {
  const e = p090frEntrar({});
  try {
    PRUEBAS.falso(ausentePersonaEse(P090FR_PER, e.dia), 'guarda: sin índice, nadie está ausente');
    const cel = p090frCelda('cmesPanel', e.dia);
    PRUEBAS.cierto(!!cel, 'guarda: la casilla del ' + e.dia + ' existe');
    PRUEBAS.cierto(cel.classList.contains('cmes-c-sin_jornada'),
      '🔴 DISCRIMINADOR · el mismo día, sin el índice, es «sin jornada registrada» · ' + cel.className);
    PRUEBAS.falso((cel.getAttribute('aria-label') || '').indexOf(t('cmes_e_franco')) >= 0,
      'y no afirma un franco que nadie cargó');
    PRUEBAS.cierto(p090frPie('cmesPanel').indexOf(t('cmes_sin_ausencias')) >= 0,
      '🔴 y el pie advierte que sin ausencias cargadas una casilla vacía puede ser un descanso (R2) · ' + p090frPie('cmesPanel'));
    /* la otra mitad del discriminador: tampoco acá se pinta nada en rojo por falta de dato */
    PRUEBAS.igual(p090frConAlarma('cmesPanel').map(b => b.getAttribute('data-f')), [],
      '🔴 ninguna casilla en rojo ni en ámbar tampoco sin el índice: la ausencia de dato nunca se pinta');
    PRUEBAS.alMenos(p090frCeldas('cmesPanel').length, 28,
      'guarda: se midieron las casillas del mes (un cero sin discriminador no es un resultado)');
  } finally { e.fin(); }
});

/* ── 3 · CONTROL POSITIVO DEL MEDIDOR DE ALARMA ─────────────────────────────────────────────── */

PRUEBAS.caso('🔴 DISCRIMINADOR P090 · el medidor de «rojo o ámbar» SÍ encuentra una casilla cuando la hay (si no, los dos ceros de arriba no prueban nada)', () => {
  /* Una jornada abierta y abandonada hace tres días: `cicloAnclaDetencion` la ancla en su último
     evento y a las `CICLO_DETENIDO_HORAS` el ciclo queda `detenido`. Es un hecho REGISTRADO, no
     una falta de dato: por eso sí puede pintar. */
  const ev = p090frEv('salida_casa', 72);
  const e = p090frEntrar({}, { operacional: [ev] });
  try {
    const conAlarma = p090frConAlarma('cmesPanel');
    PRUEBAS.alMenos(conAlarma.length, 1,
      '🔴 con un ciclo abandonado el mes SÍ tiene una casilla que mirar: el selector de arriba mide algo · ' +
      conAlarma.map(b => b.getAttribute('data-f') + ' ' + b.className).join(' | '));
    /* El día esperado sale de la MISMA derivación que usa el dibujo (`cmesDiaDeEvento`), no de una
       resta de días aparte: la fecha de la casilla es la del LECTOR y el `fecha` de la fila es la
       del EMISOR, y ahí es donde los dos se pelean (es lo que dice el comentario de `cmesFuente`). */
    const cel = p090frCelda('cmesPanel', cmesDiaDeEvento(ev));
    PRUEBAS.cierto(!!cel && P090FR_ALARMA.some(c => cel.classList.contains('cmes-c-' + c)),
      'y es la del día en que arrancó (' + cmesDiaDeEvento(ev) + ') · ' + (cel ? cel.className : '(sin casilla)'));
  } finally { e.fin(); }
});

/* ── 4 · DISCRIMINADOR (c) · EN EL TELÉFONO DEL PILOTO, NUNCA ───────────────────────────────── */

PRUEBAS.caso('🔴 P090 · en el calendario del piloto (`mio`) ese mismo día NUNCA dice «No le correspondía trabajar»', () => {
  const prevLS = Object.assign({}, localStorage);
  const prevDash = DASH;
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  DASH = null; SIMUL = null; _misSincronizando = false;
  CTX.resetear();
  const dia = fechaMasDias(todayStr(), -3);
  const hoy = todayStr();
  cmesMesSet('mio', dia.slice(0, 7)); cmesDiaSet('mio', null);
  window.gestPost = () => Promise.resolve({ ok: true });
  window.fetch = () => new Promise(() => {});
  /* La cobertura del piloto la escribe SÓLO `misSincronizar` en `K_CICLO_SRV_PER`. Sin ella el mes
     entero saldría `fuera` y el caso pasaría en verde sin haber mirado un solo día (R17). */
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({
    ok: true, registros: [], pvt: [], metricas: [], referencia: {},
    operacional: [], operacionalPeriodo: { dias: 400, desde: null, hasta: null } }) });
  return misSincronizar().then(ok => {
    PRUEBAS.igual(ok, true, 'guarda: el canal del piloto contestó y dejó su cobertura');
    PRUEBAS.cierto(!!cmesCobertura('mio'),
      'guarda: `cmesCobertura("mio")` ya no es null, así que los días del mes NO son todos `fuera`');
    /* recién ahora entra el panel, con el índice de ausencias vivo */
    window.fetchConReloj = () => new Promise(() => {});
    onDashData({ ok: true, rol: 'supervisor', vista: 'medico', combinada: false,
      referencia: { kss: 5 }, metricas: ['kss'],
      registros: [{ persona: P090FR_PER, empresa: P090FR_EMP, departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 4 }],
      operacional: [], operacionalPeriodo: { dias: 400, desde: null, hasta: null },
      ausencias: { ['n:' + P090FR_CLAVE + '|' + dia]: 'franco' },
      comentarios: [], pvt: [], aptitud: [], turnos: [], duty: null, marca: null,
      config: {}, visor: null, visorError: null },
      P090FR_EMP, { action: 'supervisor', usuario: 'usuario-p090fr', empresa: P090FR_EMP, pass: 'x', dispositivoId: 'p090fr' }, 'medico');
    /* el bloque del piloto se repinta por su función de siempre, la que llama `cicloMiRefrescar` */
    cmesRepintar('mio', null);

    PRUEBAS.cierto(ausentePersonaEse(P090FR_PER, dia),
      '🔴 guarda · la ausencia ESTÁ al alcance en este mismo instante: lo de abajo es una decisión, no un dato que faltaba');
    const cel = p090frCelda('cmesMio', dia);
    PRUEBAS.cierto(!!cel, 'guarda: la casilla del ' + dia + ' existe en el calendario del piloto');
    PRUEBAS.cierto(cel.classList.contains('cmes-c-sin_jornada'),
      '🔴 en `mio` el día es «sin jornada registrada» · ' + cel.className);
    PRUEBAS.falso(cel.classList.contains('cmes-c-franco'),
      '🔴 y NUNCA `franco`: las ausencias sólo llegan al panel, así que el teléfono no puede afirmarlas');
    PRUEBAS.falso((cel.getAttribute('aria-label') || '').indexOf(t('cmes_e_franco')) >= 0,
      'tampoco en el nombre accesible · ' + cel.getAttribute('aria-label'));
    PRUEBAS.falso(p090frPie('cmesMio').indexOf(t('cmes_sin_ausencias')) >= 0,
      'y el pie del piloto no habla de ausencias: es una advertencia para el médico, no para él · ' + p090frPie('cmesMio'));
    PRUEBAS.igual(p090frConAlarma('cmesMio').map(b => b.getAttribute('data-f')), [],
      'ninguna casilla del mes en rojo ni en ámbar por falta de dato, tampoco de este lado');
  }).finally(() => {
    /* R18 · en el `.finally()` DE LA PROMESA. Con un `finally` sincrónico esto correría antes que
       el `.then` y la prueba siguiente arrancaría con este `fetchConReloj` puesto. */
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost;
    DASH = prevDash;
    try { cmesMesSet('mio', null); cmesDiaSet('mio', null); } catch(e){}
    try { document.getElementById('dashBody').innerHTML = ''; } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { renderSections(); } catch(e){}
  });
});
