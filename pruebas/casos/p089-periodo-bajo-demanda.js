PRUEBAS.grupo('P089 · el período se pide bajo demanda, no por adelantado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El endpoint manda 7 días de ciclo operativo por default (`var opDias = 7` en el .gs) y sube
   hasta 365 sólo si el pedido trae `opDias`. El cliente NUNCA lo mandaba: `cicloPeriodoSet(id)`
   se limitaba a `CICLO_PERIODO = id; cicloRepintar();`, o sea recorte sobre lo que ya estaba.

   Efecto medido: tocar "30 días" o "90 días" mostraba SIETE, sin ningún aviso. Una pantalla que
   promete tres meses y muestra una semana no se lee como "faltan datos": se lee como "en tres
   meses hubo esto". En una app de gestión de fatiga eso es un director mirando una carga de
   trabajo que no es la que hubo.

   Ahora cada botón dispara su propio pedido CUANDO HACE FALTA, y sólo entonces. Los dos lados
   importan y los dos se comprueban acá:
     · pedir 90 cuando vinieron 7  → sale un pedido con `opDias=90`;
     · volver de 90 a 7            → NO sale ningún pedido (recorte en cliente, instantáneo).
   El segundo es el discriminador: sin él, "pedir siempre" pasaría por arreglo.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). `DASH` no se arma a mano: se construye llamando a
   `onDashData(payload, …)`, que es el único camino por el que el panel recibe datos de verdad —
   el atajo de armarlo a mano es justo lo que dejó pasar el defecto de A4, donde `duty` y
   `ausencias` se descartaban en silencio y dos prompts enteros entregaron funciones que del lado
   del cliente no existían. Y el pedido no se inspecciona sobre una función auxiliar: se reemplaza
   `window.fetch` y se mira lo que de verdad viajó, en la URL o en el cuerpo.

   ⚠️ NO SE USA `setTimeout` PARA CEDER EL TURNO. Esta pestaña está oculta de forma permanente
   (ver pruebas/LEEME.md) y Chrome estrangula sus temporizadores a ~1 s como mínimo: doce vueltas
   de `setTimeout(r, 5)` son doce segundos y el marco da el caso por colgado. Las microtareas no se
   estrangulan y alcanzan para que corran los `.then` de una promesa ya resuelta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P089_MIN = 60000;
const P089_EMP = 'Empresa P089';
const P089_PERSONA = 'Ana Suárez P089';

/* Lo que registra el `fetch` de mentira. Se vacía antes de cada medición. */
const P089_RED = { llamadas: [] };

/* Un evento operacional con la MISMA forma que los que arma el servidor (mismo juego de campos
   que `cicloDemo()`, que es el molde vivo). Si esta forma se desincroniza, `cicloHistorico()`
   filtra todo y el caso mediría una pantalla vacía creyendo que mide un período. */
function p089Ev(evento, msAtras, test, res){
  const p = n => String(n).padStart(2, '0');
  const d = new Date(Date.now() - msAtras);
  return { fecha: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()),
           hora: p(d.getHours()) + ':' + p(d.getMinutes()), iso: d.toISOString(),
           persona: P089_PERSONA, empresa: P089_EMP, departamento: 'Tripulación', cargo: 'Piloto',
           evento: evento, test: test || '', resultado: (res == null ? null : res) };
}

/* Un ciclo por día hacia atrás, `dias` días. Que 90 traiga MÁS filas que 7 es lo que permite
   distinguir "llegó el período nuevo" de "se repintó lo mismo". */
function p089Operacional(dias){
  const out = [];
  for (let i = 0; i < dias; i++){
    const base = (i * 24 * 60 + 6 * 60) * P089_MIN;          // 06:00 de hace `i` días
    out.push(p089Ev('salida_casa', base));
    out.push(p089Ev('llegada_aero', base - 55 * P089_MIN, 'kss', 4));
    out.push(p089Ev('salida_aero', base - 700 * P089_MIN, 'perelli', 5.1));
    out.push(p089Ev('llegada_casa', base - 755 * P089_MIN));
  }
  return out;
}

/* La respuesta del panel, con la forma que manda el .gs. `dias` es lo que el servidor dice haber
   servido DE VERDAD (`operacionalPeriodo.dias`), que no siempre es lo que se pidió. */
function p089Payload(dias, extra){
  return Object.assign({
    ok: true, rol: 'supervisor', vista: 'hseq', referencia: {}, metricas: [],
    registros: [{ persona: P089_PERSONA, empresa: P089_EMP, departamento: 'Tripulación',
                  cargo: 'Piloto', fecha: todayStr() }],
    comentarios: [], pvt: [], aptitud: null, turnos: [], config: {}, marca: null, niveles: [],
    duty: null, ausencias: {}, nominaTotal: 1, nominaSinDato: [],
    operacional: p089Operacional(dias),
    operacionalPeriodo: { dias: dias, desde: null, hasta: null, puedeVerHistorico: true }
  }, extra || {});
}

/* Params SIN contraseña → `dashRequest` sale por GET y `opDias` viaja en la URL. Además apaga
   `gestCanSync()`, así entrar al panel no dispara los pedidos laterales de gestiones/casos y la
   cuenta de llamadas mide sólo lo que este prompt cambia. */
function p089Params(){ return { action: 'empleado', empresa: P089_EMP, persona: P089_PERSONA }; }
/* Params CON contraseña → POST con el JSON entero. Es el camino real del panel de Dirección. */
function p089ParamsPass(){ return { action: 'supervisor', usuario: P089_EMP, empresa: P089_EMP, pass: 'clave-de-prueba' }; }

/* `fetch` de mentira. `resp` puede ser un objeto (la respuesta), una función (url, opts) → objeto,
   la cadena 'falla' (rechazo de red) o `null` (nunca contesta: sirve para mirar el esqueleto). */
function p089Stub(resp){
  return (url, opts) => {
    P089_RED.llamadas.push({ url: String(url), body: (opts && opts.body) || '',
                             metodo: (opts && opts.method) || 'GET' });
    const d = (typeof resp === 'function') ? resp(String(url), opts) : resp;
    if (d === 'falla') return Promise.reject(new TypeError('Failed to fetch'));
    if (d == null) return new Promise(() => {});                  // en vuelo para siempre
    return Promise.resolve({ ok: true, status: 200, type: 'cors', json: () => Promise.resolve(d) });
  };
}

/* Qué `opDias` viajó en una llamada: da igual si fue por la URL (GET) o por el cuerpo (POST). */
function p089OpDias(c){
  if (!c) return null;
  const m = String(c.url).match(/[?&]opDias=(\d+)/);
  if (m) return Number(m[1]);
  try { const b = JSON.parse(c.body || '{}'); return b.opDias != null ? Number(b.opDias) : null; }
  catch (e){ return null; }
}

async function p089Tick(n){ for (let i = 0; i < (n || 24); i++) await Promise.resolve(); }

/* Deja el panel abierto en la vista de Dirección con `dias` días ya traídos, POR EL CAMINO REAL.
   Devuelve lo que hay que restaurar al terminar. */
/* ⚠️ QUÉ VISTA SE USA, Y POR QUÉ IMPORTA (medido el 2026-09-06, no deducido).
   El servidor concede `puedeVerHistorico` a servicio médico, Dirección/HSEQ y admin. Pero HOY el
   selector de período NO LLEGA AL DOM en ninguna de esas tres: en `medico` la sección del ciclo
   ni siquiera entra a `dashOrderedTabs()`, y en `hseq` el render se va por `cicloHseqAgregado()`,
   que no emite `cicloPeriodoHtml()`. La ÚNICA vista donde el control se dibuja es `supervisor`, y
   a un supervisor el servidor nunca le concede el permiso. O sea: el control existe y funciona,
   pero no hay pantalla que lo muestre. Es un defecto ANTERIOR a P089 (viene de Y1) y está
   reportado aparte — acá sólo hay que saberlo para no medir el aire.
   Por eso los casos de COMPORTAMIENTO corren en `hseq`, que es la vista realista de quien ve
   histórico, y los que necesitan tocar el botón EN LA PANTALLA corren en `supervisor`, con el
   permiso forzado: es la única combinación que dibuja el control. */
const P089_VISTA_CON_BOTONES = 'supervisor';

function p089Entrar(dias, params, vista){
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  const prev = { dash: DASH, periodo: CICLO_PERIODO, pidiendo: CICLO_PIDIENDO,
                 gate: gate ? gate.style.display : '', panel: panel ? panel.style.display : '' };
  const fetchAntes = window.fetch;
  window.fetch = p089Stub({ ok: true });     // por si el arranque del panel dispara algo lateral
  try { onDashData(p089Payload(dias), P089_EMP, params || p089Params(), vista || 'hseq'); }
  finally { window.fetch = fetchAntes; }
  stopDashAutoRefresh();                     // el panel arranca su refresco de 24 h: acá sobra
  cicloTickStop();                           // y su reloj de 1 s, que pide al servidor cada minuto
  CICLO_PERIODO = 'hoy';
  CICLO_PIDIENDO = 0;
  P089_RED.llamadas.length = 0;
  return prev;
}

function p089Salir(prev){
  stopDashAutoRefresh(); cicloTickStop();
  CICLO_PIDE_N = (Number(CICLO_PIDE_N) || 0) + 1;   // invalida cualquier pedido que siga en vuelo
  CICLO_PERIODO = prev.periodo;
  CICLO_PIDIENDO = prev.pidiendo;
  /* El caso del esqueleto deja un fetch en vuelo para siempre: sin esto la sección quedaría
     `inert` para los casos que corren después, y medirían una pantalla bloqueada sin saberlo. */
  try { cargaBloquear(document.getElementById('dsec-ciclo'), false); } catch (e){}
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  if (gate) gate.style.display = prev.gate;
  if (panel) panel.style.display = prev.panel;
  DASH = prev.dash;
}

/* Corre `fn` con el `fetch` de mentira puesto y lo devuelve como estaba, pase lo que pase. */
async function p089Con(resp, fn){
  const antes = window.fetch;
  window.fetch = p089Stub(resp);
  try { await fn(); await p089Tick(); } finally { window.fetch = antes; }
}

function p089Sec(){ return document.getElementById('dsec-ciclo'); }
function p089Boton(id){
  const sec = p089Sec();
  return sec ? sec.querySelector('.cic-per[onclick*="\'' + id + '\'"]') : null;
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ el panel DIBUJA los botones de período (si no, todo lo de abajo mide el aire)', () => {
  /* Guarda de medibilidad. Sin esto, el día que la sección deje de pintarse los casos de abajo
     seguirían pasando contra un DOM vacío y nadie se enteraría. Un cero sin discriminador no es
     un resultado (R17). */
  const prev = p089Entrar(7, null, P089_VISTA_CON_BOTONES);
  try {
    PRUEBAS.cierto(!!p089Sec(), 'la sección del ciclo operativo tiene que estar en el panel');
    PRUEBAS.cierto(!!p089Boton('90'), 'y el botón de 90 días · es el que dispara el pedido');
    PRUEBAS.cierto(!!p089Boton('7'), 'y el de 7 días · es el que NO tiene que disparar nada');
    PRUEBAS.igual(cicloDiasTraidos(), 7,
      'y el servidor dijo que sirvió 7 días · es de donde sale la decisión de pedir o no');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('⚠️ DETECTOR DE CAMBIO · en qué vistas llega el selector de período a la pantalla', () => {
  /* Esto NO afirma que el estado actual esté bien: afirma cuál es, para que cambiarlo sea una
     decisión y no un accidente.

     ⚠️ YA HIZO SU TRABAJO, el mismo día que se escribió. La primera versión medía `['supervisor']`
     — y como el servidor NO le concede `puedeVerHistorico` a un supervisor, `cicloPeriodoHtml()`
     le devolvía cadena vacía: los botones de 30 y 90 días no llegaban a NINGUNA pantalla que
     alguien pudiera abrir. P089 era plomería sin grifo. Se agregó `cicloPeriodoHtml()` a la rama
     `hseq` de `renderCicloOperativo` (2026-09-06), que es la única vista que tiene la sección del
     ciclo Y recibe el permiso del servidor, y este caso se puso rojo hasta que se actualizó la
     lista a mano. Que es exactamente para lo que está.

     ⚠️ Que `hseq` esté acá NO viola K1b. Ese cortafuegos es sobre NOMBRES y valores individuales;
     un selector de rango no nombra a nadie. Lo que sigue fuera de la vista de Dirección es
     `cicloCfgHtml`, el EDITOR del plan de ciclo.

     Si esta lista vuelve a cambiar: decidilo y actualizala. No la toques para que pase.
     ⚠️ Y1 tiene sus propios casos de período, pero todos miden `cicloPeriodoHtml()` SUELTA: la
     función devuelve los cuatro botones perfectos y nadie comprobaba que ese HTML llegara a
     alguna parte. Probar la pieza y no el uso (R17), otra vez. */
  const prev = { dash: DASH, periodo: CICLO_PERIODO, pidiendo: CICLO_PIDIENDO };
  const fetchAntes = window.fetch;
  window.fetch = p089Stub({ ok: true });
  const llega = [];
  try {
    ['supervisor', 'medico', 'hseq', 'empleado'].forEach(v => {
      onDashData(p089Payload(7), P089_EMP, p089Params(), v);
      stopDashAutoRefresh(); cicloTickStop();
      const sec = document.getElementById('dsec-ciclo');
      if (sec && sec.querySelectorAll('.cic-per').length) llega.push(v);
    });
  } finally {
    window.fetch = fetchAntes;
    stopDashAutoRefresh(); cicloTickStop();
    DASH = prev.dash; CICLO_PERIODO = prev.periodo; CICLO_PIDIENDO = prev.pidiendo;
  }
  PRUEBAS.igual(llega, ['supervisor', 'hseq'],
    '⚠️ con `puedeVerHistorico` concedido, el selector se dibuja en estas vistas. `hseq` es la ' +
    'única donde SIRVE: al supervisor el servidor no le concede histórico. Si esta lista cambió, ' +
    'el cambio es intencional o es una regresión: decidilo y actualizá el caso');
  PRUEBAS.cierto(!!CTX.hayGs ? /puedeVerHistorico:\s*\(acc\.vista === "medico"/.test(CTX.gs) : true,
    'y el servidor sigue concediéndolo por vista médica/HSEQ/admin, no al supervisor · si esto ' +
    'cambia, la lista de arriba deja de significar lo mismo');
});

PRUEBAS.caso('🔴 tocar 90 días PIDE 90 días · antes filtraba 7 y no avisaba', async () => {
  const prev = p089Entrar(7);
  try {
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    PRUEBAS.igual(P089_RED.llamadas.length, 1,
      'sale UN pedido al servidor · con el código viejo salían cero y la pantalla mentía');
    PRUEBAS.igual(p089OpDias(P089_RED.llamadas[0]), 90,
      'y viaja `opDias=90` · es el parámetro que el .gs ya aceptaba y el cliente nunca mandaba');
    PRUEBAS.igual(cicloDiasTraidos(), 90, 'y al volver, el servidor dice que sirvió 90');
    PRUEBAS.igual(cicloPeriodoActual(), '90', 'y el período queda en 90');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 EL DISCRIMINADOR · volver de 90 a 7 NO pide nada', async () => {
  /* Sin este caso, "pedir siempre" pasaría por arreglo — y sería otro defecto: un rango que ya
     está en memoria no necesita esperar a la red, y una pantalla que tarda un segundo en volver a
     algo que ya tenía se siente rota. Este caso es el que le pone el techo al de arriba. */
  const prev = p089Entrar(90);
  try {
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('7'); });
    PRUEBAS.igual(P089_RED.llamadas.length, 0,
      'cero pedidos · lo de 7 días ya está adentro de lo de 90, es puro recorte en el cliente');
    PRUEBAS.igual(cicloPeriodoActual(), '7', 'y el período cambió igual, instantáneo');

    P089_RED.llamadas.length = 0;
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('30'); });
    PRUEBAS.igual(P089_RED.llamadas.length, 0, '30 sobre 90 traídos tampoco pide');

    P089_RED.llamadas.length = 0;
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('hoy'); });
    PRUEBAS.igual(P089_RED.llamadas.length, 0, '"En curso" nunca pide: es la vista de siempre');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('30 días sobre 7 traídos pide 30, no 90', async () => {
  /* Se pide lo que hace falta, no el máximo. Pedir 90 para mostrar 30 sería volver a pagar por
     adelantado un rango que nadie miró, que es justo lo que P089 saca. */
  const prev = p089Entrar(7);
  try {
    await p089Con(p089Payload(30), () => { cicloPeriodoSet('30'); });
    PRUEBAS.igual(p089OpDias(P089_RED.llamadas[0]), 30, 'viaja 30, no el tope del control');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('con contraseña el pedido va por POST y `opDias` viaja en el CUERPO', async () => {
  /* `dashRequest` manda por POST cuando hay `pass`, para que la clave no quede en los registros de
     Apps Script. Es el camino real del panel de Dirección: si `opDias` sólo se hubiera enganchado
     a la querystring, en producción no habría viajado nunca. */
  const prev = p089Entrar(7, p089ParamsPass());
  try {
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    const c = P089_RED.llamadas.filter(x => p089OpDias(x) === 90)[0];
    PRUEBAS.cierto(!!c, 'salió el pedido con opDias=90');
    if (!c) return;
    PRUEBAS.igual(c.metodo, 'POST', 'por POST, como todo lo que lleva contraseña');
    PRUEBAS.cierto(c.url.indexOf('opDias') < 0, 'y NO en la URL: ahí no va nada de esta sesión');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 mientras el período viaja se ve el esqueleto, y la zona queda fuera de alcance', async () => {
  const prev = p089Entrar(7, null, P089_VISTA_CON_BOTONES);   // la única vista que dibuja el control
  try {
    await p089Con(null, () => { cicloPeriodoSet('90'); });      // un fetch que nunca contesta
    const sec = p089Sec();
    PRUEBAS.cierto(!!sec, 'la sección sigue ahí');
    if (!sec) return;
    PRUEBAS.cierto(sec.innerHTML.indexOf('sk-wrap') >= 0,
      '⚠️ hay esqueleto donde van a ir las tarjetas · sin esto la pantalla se queda quieta y ' +
      'parece que el botón no hizo nada');
    PRUEBAS.cierto(sec.hasAttribute('inert'),
      'y la zona queda fuera del alcance del mouse Y del teclado mientras carga');
    PRUEBAS.igual(sec.getAttribute('aria-busy'), 'true',
      'anunciado como ocupado, para quien no está mirando la pantalla');
    PRUEBAS.cierto(!!sec.querySelector('.cic-cargando[role="status"]'),
      'con su leyenda, que dice cuántos días se están trayendo');
    /* Los botones se siguen dibujando: la persona tiene que ver cuál eligió mientras espera. */
    const b90 = p089Boton('90');
    PRUEBAS.igual(b90 && b90.getAttribute('aria-pressed'), 'true',
      'y el botón que tocó ya figura elegido');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('cuando llega el período, el esqueleto se va y quedan los 90 días', async () => {
  const prev = p089Entrar(7);
  try {
    const antes = (DASH.operacional || []).length;
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    const sec = p089Sec();
    PRUEBAS.alMenos((DASH.operacional || []).length, antes + 1,
      'llegaron eventos que antes no estaban · si no, no se trajo nada');
    PRUEBAS.cierto(sec && sec.innerHTML.indexOf('sk-wrap') < 0, 'el esqueleto se fue');
    PRUEBAS.falso(sec && sec.hasAttribute('inert'),
      '⚠️ y el bloqueo se levantó · un `inert` pegado deja la sección muerta sin explicación');
    PRUEBAS.igual(CICLO_PIDIENDO, 0, 'y no queda ningún pedido marcado como en vuelo');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 si el pedido falla se vuelve al período anterior y se avisa', async () => {
  /* Dejar los botones diciendo "90 días" sobre datos de 7 sería peor que el defecto original: el
     defecto viejo al menos era parejo, éste aparecería sólo cuando se corta la señal. */
  const prev = p089Entrar(7, null, P089_VISTA_CON_BOTONES);
  try {
    cicloPeriodoSet('7');                                        // punto de partida explícito
    document.getElementById('toastMsg').textContent = '';
    await p089Con('falla', () => { cicloPeriodoSet('90'); });
    PRUEBAS.igual(cicloPeriodoActual(), '7',
      '⚠️ vuelve al período que sí tiene datos · nunca queda "90" sobre una semana');
    const b90 = p089Boton('90');
    PRUEBAS.igual(b90 && b90.getAttribute('aria-pressed'), 'false', 'y el botón lo refleja');
    PRUEBAS.cierto(/no se pudo traer|could not be loaded/i.test(document.getElementById('toastMsg').textContent),
      'y se avisa · decía «' + document.getElementById('toastMsg').textContent + '»');
    PRUEBAS.igual(DASH.params.opDias, undefined,
      '⚠️ y `opDias` se saca de los params · si quedara puesto, cada refresco pagaría 90 días ' +
      'que nadie está mirando');
    const sec = p089Sec();
    PRUEBAS.falso(sec && sec.hasAttribute('inert'), 'y la zona se desbloquea también al fallar');
    PRUEBAS.cierto(sec && sec.innerHTML.indexOf('sk-wrap') < 0, 'sin esqueleto pegado');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 un servidor que contesta bien pero NO da el rango tampoco se muestra como 90', async () => {
  /* El .gs ignora `opDias` a quien no puede ver histórico y lo recorta a 365 a todo el mundo. O
     sea que "respuesta correcta" no es lo mismo que "me dieron lo que pedí". Se cree lo que el
     servidor dijo haber servido (`operacionalPeriodo.dias`), no lo que se pidió — que es la misma
     regla que ya seguía `cicloPuedeHistorico()`. */
  const prev = p089Entrar(7);
  try {
    cicloPeriodoSet('7');
    document.getElementById('toastMsg').textContent = '';
    await p089Con(p089Payload(7), () => { cicloPeriodoSet('90'); });   // contesta ok, pero con 7
    PRUEBAS.igual(P089_RED.llamadas.length, 1, 'el pedido salió');
    PRUEBAS.igual(cicloPeriodoActual(), '7',
      '⚠️ no se muestra 90 sobre 7 días · es exactamente el defecto que P089 vino a sacar');
    PRUEBAS.cierto(/no se pudo traer|could not be loaded/i.test(document.getElementById('toastMsg').textContent),
      'y se avisa en vez de mentir en silencio');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 el refresco de cada minuto NO encoge la vista de 90 a 7', async () => {
  /* Mientras la sección del ciclo está en pantalla, `cicloTick` dispara `dashRefresh(false)` cada
     60 s con `DASH.params`. Si esos params no llevaran `opDias`, el refresco volvería con 7 días y
     la vista de 90 se encogería sola, en silencio, un minuto después de haberla pedido: el mismo
     defecto por la puerta de atrás y más difícil de ver, porque hay que esperarlo.
     Por eso `opDias` se guarda en `DASH.params`, y se guarda ANTES de mandar. */
  const prev = p089Entrar(7);
  try {
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    PRUEBAS.igual(DASH.params.opDias, '90', '`opDias` quedó en los params de la sesión');

    /* Un servidor honesto: devuelve tantos días como le pidan. Si el refresco saliera sin
       `opDias`, contestaría 7 y la vista se encogería. */
    P089_RED.llamadas.length = 0;
    const servidor = (url, opts) => {
      const d = p089OpDias({ url: url, body: (opts && opts.body) || '' }) || 7;
      return p089Payload(d);
    };
    await p089Con(servidor, () => dashRefresh(false));
    PRUEBAS.igual(p089OpDias(P089_RED.llamadas[0]), 90,
      '⚠️ el refresco automático también lleva `opDias`');
    PRUEBAS.igual(cicloDiasTraidos(), 90, 'y la vista sigue mostrando 90 días después del refresco');
    PRUEBAS.igual(cicloPeriodoActual(), '90', 'con el botón todavía en 90');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('🔴 A4 · el período nuevo NO se come `duty` ni `ausencias`', async () => {
  /* Vigilancia heredada de A4. Hay DOS lugares que copian campos del servidor a `DASH` con una
     lista explícita —`onDashData` y `dashRefresh`— y en los dos faltaban `duty` y `ausencias`: el
     servidor los mandaba y el cliente los tiraba sin un error. Este prompt entra por `dashRefresh`
     justamente para no abrir un TERCER lugar donde olvidarse de un campo; el caso comprueba que
     esa decisión se sostenga, o sea que cambiar de período traiga el payload COMPLETO y no sólo
     el ciclo operativo. */
  const prev = p089Entrar(7);
  try {
    PRUEBAS.igual(DASH.duty, null, 'se arranca sin jornada cargada');
    const conTodo = p089Payload(90, {
      duty: { dias: 90, sinUmbralCongelado: 0, personas: [], historico: [],
              diario: [{ persona: P089_PERSONA, empresa: P089_EMP, departamento: 'Tripulación',
                         fecha: todayStr(), jornadaMin: 800, previstoMin: 720, excesoMin: 80,
                         abierto: false, umbralCongelado: true, tramos: [] }] },
      ausencias: { ['n:' + ausNombreClave(P089_PERSONA) + '|' + todayStr()]: 'vacaciones' }
    });
    await p089Con(conTodo, () => { cicloPeriodoSet('90'); });
    PRUEBAS.cierto(!!(DASH.duty && DASH.duty.diario && DASH.duty.diario.length),
      '⚠️ `duty` llegó con el período · sin esto la pestaña Jornada se vaciaría al cambiar de rango');
    PRUEBAS.cierto(ausenteHoy({ nombre: P089_PERSONA }),
      '⚠️ y `ausencias` también · la cobertura del IDC dejaría de descontar a quien no está');
    PRUEBAS.falso(/jor_vacio|Todavía no hay jornadas/.test(renderJornada()),
      'y la pestaña Jornada pinta con eso, no muestra su estado vacío');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('cambiar de período no se lleva puestos los filtros ni la pestaña', async () => {
  /* Por esto NO se entra por `onDashData`, que sería el camino más corto: esa función rehace
     `DASH` ENTERO —filtros en `all`, pestaña en la primera, buscador en blanco, scroll arriba—.
     Cambiar el rango de fechas no puede resetear lo que la persona venía mirando. */
  const prev = p089Entrar(7);
  try {
    DASH.f.dep = 'Tripulación';
    DASH.tab = 'ciclo';
    DASH._cicQ = 'ana';
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    PRUEBAS.igual(DASH.f.dep, 'Tripulación', 'el filtro de departamento sobrevive');
    PRUEBAS.igual(DASH.tab, 'ciclo', 'y la pestaña abierta');
    PRUEBAS.igual(DASH._cicQ, 'ana', 'y lo que estaba escrito en el buscador del ciclo');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('dos toques seguidos: gana el último, no el que conteste primero', async () => {
  /* Tocar 30 y enseguida 90 deja dos pedidos en el aire. Si ganara el que llega primero, la
     pantalla terminaría en un período que la persona ya descartó. */
  const prev = p089Entrar(7);
  try {
    const antes = window.fetch;
    /* El primero no contesta nunca; el segundo sí. Es el orden que importa: si la respuesta de 30
       llegara tarde, no puede pisar a la de 90. */
    let n = 0;
    window.fetch = p089Stub((url, opts) => {
      n++;
      return (n === 1) ? null : p089Payload(90);
    });
    try {
      cicloPeriodoSet('30');
      cicloPeriodoSet('90');
      await p089Tick();
    } finally { window.fetch = antes; }
    PRUEBAS.igual(P089_RED.llamadas.length, 2, 'salieron los dos pedidos');
    PRUEBAS.igual(p089OpDias(P089_RED.llamadas[1]), 90, 'el segundo pide 90');
    PRUEBAS.igual(cicloPeriodoActual(), '90', 'y la pantalla termina en 90, el último que se tocó');
    PRUEBAS.igual(CICLO_PIDIENDO, 0, 'sin quedar cargando para siempre');
  } finally { p089Salir(prev); }
});

PRUEBAS.caso('en la demostración no se pide nada: no hay servidor del otro lado', async () => {
  /* La demo arma su propio `DASH.operacional` con `cicloDemo()`. Sin este corte, el botón dejaría
     el esqueleto puesto para siempre esperando una respuesta que no va a llegar. */
  const prev = p089Entrar(7);
  try {
    DASH.demoMode = true;
    await p089Con(p089Payload(90), () => { cicloPeriodoSet('90'); });
    PRUEBAS.igual(P089_RED.llamadas.length, 0, 'cero pedidos en modo demostración');
    PRUEBAS.igual(CICLO_PIDIENDO, 0, 'y no queda nada cargando');
    PRUEBAS.cierto(p089Sec() && p089Sec().innerHTML.indexOf('sk-wrap') < 0, 'sin esqueleto pegado');
  } finally { DASH.demoMode = false; p089Salir(prev); }
});

PRUEBAS.caso('las leyendas nuevas existen en los DOS idiomas (R14)', () => {
  const prev = idiomaActual();
  try {
    ['es', 'en'].forEach(l => {
      fijarIdioma(l);
      ['per_cargando', 'per_no_cargo'].forEach(k => {
        const v = t(k, { n: 90 });
        PRUEBAS.cierto(!!v && v !== k, 'falta `' + k + '` en ' + l + ' · devolvió «' + v + '»');
      });
      PRUEBAS.cierto(t('per_cargando', { n: 90 }).indexOf('90') >= 0,
        'la leyenda dice cuántos días se están trayendo (' + l + ')');
    });
    /* Discriminador del caso: si `t()` devolviera lo mismo en los dos idiomas, lo de arriba
       pasaría con una sola traducción escrita. */
    fijarIdioma('es'); const es = t('per_no_cargo');
    fijarIdioma('en'); const en = t('per_no_cargo');
    PRUEBAS.cierto(es !== en, 'y son dos textos distintos, no el español repetido en inglés');
    /* R1 · español NEUTRO: nada de voseo en lo que ve la persona. */
    fijarIdioma('es');
    PRUEBAS.falso(/\btocá\b|\bpodés\b|\btenés\b|\bmirá\b|\besperá\b|\bvos\b/i.test(t('per_no_cargo') + ' ' + t('per_cargando', { n: 90 })),
      'el aviso va en español neutro · los clientes son de Venezuela');
  } finally { fijarIdioma(prev); }
});

/* ── El grifo ───────────────────────────────────────────────────────────────────────────────────
   Todo lo de arriba prueba la plomería: que tocar 30 o 90 pida el rango, muestre esqueleto y
   vuelva atrás si falla. Estos dos casos prueban lo otro: que exista un botón que un usuario real
   pueda tocar. Sin ellos, P089 podía quedar completo y probado sin que nadie lo pudiera usar —
   que es exactamente el estado en que estaba antes. */

PRUEBAS.caso('Dirección/HSEQ ve los botones de período en su pantalla', () => {
  const prev = { dash: DASH, periodo: CICLO_PERIODO, pidiendo: CICLO_PIDIENDO };
  const fetchAntes = window.fetch;
  window.fetch = p089Stub({ ok: true });
  let botones = [];
  try {
    onDashData(p089Payload(7), P089_EMP, p089Params(), 'hseq');
    stopDashAutoRefresh(); cicloTickStop();
    const sec = document.getElementById('dsec-ciclo');
    botones = sec ? [...sec.querySelectorAll('.cic-per')].map(b => b.textContent.trim()) : [];
  } finally {
    window.fetch = fetchAntes; stopDashAutoRefresh(); cicloTickStop();
    DASH = prev.dash; CICLO_PERIODO = prev.periodo; CICLO_PIDIENDO = prev.pidiendo;
  }
  PRUEBAS.igual(botones.length, 4,
    'los cuatro botones están EN LA PANTALLA de Dirección · había 0 · salieron ' +
    JSON.stringify(botones));
  PRUEBAS.igual(botones.filter(x => /30|90/.test(x)).length, 2,
    'y entre ellos los de 30 y 90 días, que son los que este prompt vino a hacer funcionar');
});

PRUEBAS.caso('K1b sigue en pie: el EDITOR del plan no entra en Dirección', () => {
  /* El discriminador del caso de arriba. Si el arreglo hubiera sido "emitir todo en hseq", este
     se pondría rojo: el selector de rango no nombra a nadie, pero el editor del ciclo es una
     configuración operativa que Dirección no toca. */
  const prev = { dash: DASH, periodo: CICLO_PERIODO, pidiendo: CICLO_PIDIENDO };
  const fetchAntes = window.fetch;
  window.fetch = p089Stub({ ok: true });
  let editor = 1;
  try {
    onDashData(p089Payload(7), P089_EMP, p089Params(), 'hseq');
    stopDashAutoRefresh(); cicloTickStop();
    const sec = document.getElementById('dsec-ciclo');
    editor = sec ? sec.querySelectorAll('.cic-cfg, #cicCfg, [data-cic-cfg]').length : 0;
  } finally {
    window.fetch = fetchAntes; stopDashAutoRefresh(); cicloTickStop();
    DASH = prev.dash; CICLO_PERIODO = prev.periodo; CICLO_PIDIENDO = prev.pidiendo;
  }
  PRUEBAS.igual(editor, 0, 'el editor del plan de ciclo sigue fuera de la vista de Dirección');
});
