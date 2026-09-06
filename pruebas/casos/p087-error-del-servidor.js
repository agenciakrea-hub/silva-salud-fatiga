PRUEBAS.grupo('P087 · un error del servidor no es un envío exitoso');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `enviarConCola` mandaba TODO con `mode:'no-cors'`. Con eso la respuesta es OPACA: el navegador
   resuelve la promesa igual aunque el servidor conteste 500, se quede sin cuota diaria o devuelva
   `{ok:false}`. El `.catch` sólo se disparaba cuando el pedido no salía del teléfono.

   O sea que el único error que la app sabía manejar era el que MENOS daño hace —la falta de
   señal, que ya estaba resuelta con la cola y con el cartel— y el que sí pierde el dato para
   siempre pasaba en silencio: la persona veía su test enviado, la cola quedaba vacía, y en el CH
   no había nada. En una app de gestión de fatiga eso no es un registro faltante: es un piloto que
   figura como que no reportó.

   ⚠️ LO QUE ESTE ARREGLO NO HACE, y hay que sostenerlo desde acá para que nadie lo "complete" sin
   pensarlo. Sólo el endpoint del CH pasa a leer su respuesta. Los siete tests y el operacional
   viejo van a proyectos de Apps Script DISTINTOS, que no están en este repositorio, y sobre todo
   NO MANDAN `id`: el servidor no puede deduplicar, así que un reintento nuestro escribiría la
   prueba dos veces en la hoja clínica. Y si alguno no tuviera CORS, `fetch` rechazaría y la app
   marcaría como "no enviado" un dato que SÍ llegó — un modo de falla peor que el defecto. Por eso
   hay un caso que comprueba que esos ocho SIGUEN en `no-cors`.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). No se prueba una función auxiliar: se llama a
   `enviarConCola(url)` con `window.fetch` reemplazado por uno que contesta lo que contestaría el
   servidor —200 con `{ok:false}`, 500, HTML de error, o un rechazo de red— y después se mira
   `getPending()`, que es la cola de verdad, y `offPintar()`, que es el cartel de verdad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P087_K = 'silva_fatiga_pending_v1';
const P087_URL = () => SHEETS_DASHBOARD_URL + '?action=operacional_guardar&id=op_ana_2026-09-06_salida_casa';
const P087_AJENO = () => SHEETS_DEPRESION_URL + '?nombre=Ana&s0=1';

function p087Limpiar(){
  localStorage.removeItem(P087_K);
  /* El candado de "en vuelo" no se persiste, pero SÍ sobrevive entre casos: uno que simula un
     fetch que nunca contesta lo deja puesto y el siguiente no manda nada. En la app real eso no
     pasa porque `fetchConReloj` aborta a los 90 s, así que siempre resuelve o rechaza. */
  try { Object.keys(_colaEnVuelo).forEach(k => delete _colaEnVuelo[k]); } catch(e){}
}
function p087Cola(){ try { return JSON.parse(localStorage.getItem(P087_K)) || []; } catch(e){ return []; } }

/* Un `fetch` que contesta como contestaría el servidor. `tipo` decide cuál de los cuatro casos. */
function p087Fetch(tipo){
  return (url, opts) => {
    p087Fetch.ultimo = { url: String(url), mode: opts && opts.mode };
    if (tipo === 'red')      return Promise.reject(new TypeError('Failed to fetch'));
    if (tipo === 'opaca')    return Promise.resolve({ ok:true, status:0, type:'opaque',
                                                     text: () => Promise.resolve('') });
    if (tipo === 'rechazo')  return Promise.resolve({ ok:true, status:200, type:'cors',
                               text: () => Promise.resolve('{"ok":false,"error":"Falta id"}') });
    if (tipo === 'error500') return Promise.resolve({ ok:false, status:500, type:'cors',
                               text: () => Promise.resolve('') });
    if (tipo === 'html')     return Promise.resolve({ ok:true, status:200, type:'cors',
                               text: () => Promise.resolve('<html>Se produjo un error…</html>') });
    return Promise.resolve({ ok:true, status:200, type:'cors',
                             text: () => Promise.resolve('{"ok":true}') });
  };
}

/* ⚠️ NO SE USA `setTimeout` PARA CEDER EL TURNO. Esta pestaña está oculta de forma permanente
   (ver pruebas/LEEME.md) y Chrome estrangula los timers de una pestaña oculta a un mínimo de ~1 s:
   doce vueltas de `setTimeout(r, 5)` tardaban doce segundos y el marco daba el caso por colgado a
   los diez. Las microtareas no se estrangulan, y es todo lo que hace falta para que corran los
   `.then` de una promesa ya resuelta. */
async function p087Tick(n){ for (let i = 0; i < (n || 12); i++) await Promise.resolve(); }

async function p087Enviar(tipo, url){
  const o = window.fetch;
  window.fetch = p087Fetch(tipo);
  try { await enviarConCola(url || P087_URL()); } finally { window.fetch = o; }
}

PRUEBAS.caso('un {ok:false} del servidor NO cuenta como enviado', async () => {
  p087Limpiar();
  await p087Enviar('rechazo');
  const q = p087Cola();
  PRUEBAS.igual(q.length, 1, 'el registro quedó guardado en el teléfono, no se evaporó');
  PRUEBAS.igual(q[0].motivo.indexOf('rechazo:') === 0, true,
    'y se anotó por qué · era ' + q[0].motivo);
});

PRUEBAS.caso('un 500 tampoco, y ese sí se reintenta solo', async () => {
  p087Limpiar();
  await p087Enviar('error500');
  const q = p087Cola();
  PRUEBAS.igual(q.length, 1, 'quedó en la cola');
  PRUEBAS.igual(!!q[0].trabado, false,
    'un 500 pasa solo: se sigue reintentando, no se retiene');
  PRUEBAS.igual(q[0].motivo, 'http_500', 'con el motivo anotado');
});

PRUEBAS.caso('la página HTML de error de Apps Script tampoco', async () => {
  /* Apps Script contesta "se produjo un error en la secuencia de comandos" con estado 200.
     Sin mirar el cuerpo, eso pasaba por un guardado exitoso. */
  p087Limpiar();
  await p087Enviar('html');
  PRUEBAS.igual(p087Cola().length, 1, 'una respuesta que no es JSON es un fallo');
  PRUEBAS.igual(p087Cola()[0].motivo, 'no_json', 'y se distingue del resto');
});

PRUEBAS.caso('una respuesta buena SÍ vacía la cola', async () => {
  /* El discriminador. Sin esto, un arreglo que encolara SIEMPRE daría verde en todos los de
     arriba y rompería la app entera sin que nadie se entere. */
  p087Limpiar();
  await p087Enviar('ok');
  PRUEBAS.igual(p087Cola().length, 0, 'con {ok:true} no queda nada pendiente');
});

PRUEBAS.caso('el fallo de red sigue funcionando como siempre (R7)', async () => {
  p087Limpiar();
  await p087Enviar('red');
  const q = p087Cola();
  PRUEBAS.igual(q.length, 1, 'sin señal, el registro se guarda');
  PRUEBAS.igual(!!q[0].trabado, false, 'y se reintenta solo: es la promesa central de la app');
});

PRUEBAS.caso('un {ok:false} se REINTENTA, no se retiene al primer golpe', async () => {
  /* ⚠️ La primera versión retenía cualquier `{ok:false}` de entrada, con el argumento de que "un
     rechazo del servidor es determinista". Es FALSO para este endpoint: `doGet` envuelve todo en
     un try/catch que devuelve `{ok:false, error:…}`, así que un "Service Spreadsheets timed out"
     o un límite de ejecución —que pasan solos en un minuto— llegan con la misma forma que un
     "Falta id". Con el retén inmediato, un CH pesado durante un minuto dejaba el registro
     esperando a que alguien viera un cartel rojo. */
  p087Limpiar();
  await p087Enviar('rechazo');
  const q = p087Cola();
  PRUEBAS.igual(q.length, 1, 'quedó guardado');
  PRUEBAS.igual(!!q[0].trabado, false,
    'y se sigue reintentando · un ok:false puede ser una excepción transitoria del .gs');
  PRUEBAS.igual(q[0].motivo.indexOf('rechazo:') === 0, true, 'con el motivo anotado');
  p087Limpiar();
});

PRUEBAS.caso('el reintento automático se rinde a los 10 intentos, POR EL LAZO REAL', async () => {
  /* ⚠️ La primera versión de este caso llamaba a `enviarConCola` diez veces a mano y daba verde.
     Con eso no se enteraba de que el lazo de verdad —`flushPending`— vaciaba la cola ANTES de
     mandar, así que `colaGuardar` no encontraba el item previo y `intentos` volvía a 1 en cada
     vuelta: el tope era INALCANZABLE y un envío roto se reintentaba para siempre. Probaba la
     pieza, no el uso (R17). Ahora se dispara `flushPending()`, que es lo que corre cada 60 s. */
  p087Limpiar();
  const o = window.fetch;
  window.fetch = p087Fetch('error500');
  try {
    await enviarConCola(P087_URL());                 // el envío original que falla
    for (let i = 0; i < 12; i++){ flushPending(); await p087Tick(); }
  } finally { window.fetch = o; }
  const q = p087Cola();
  PRUEBAS.igual(q.length, 1, 'sigue habiendo una sola entrada, no doce');
  PRUEBAS.igual(q[0].intentos >= COLA_MAX_INTENTOS, true,
    'el contador SUBE por el lazo real · quedó en ' + q[0].intentos);
  PRUEBAS.igual(q[0].trabado, true, 'y a los 10 se rinde');
  /* Y a partir de ahí deja de gastar pedidos. */
  let mas = 0;
  const o2 = window.fetch;
  window.fetch = (u, op) => { mas++; return p087Fetch('error500')(u, op); };
  try { flushPending(); await p087Tick(); } finally { window.fetch = o2; }
  PRUEBAS.igual(mas, 0, 'y ya no manda más · 1.440 pedidos por día menos');
  p087Limpiar();
});

PRUEBAS.caso('🔴 un registro retenido NO se borra a los 7 días sin haberlo intentado', async () => {
  /* El filtro de edad se aplicaba a todos. Un retenido no se reenvía, así que su `ts` queda
     congelado en la primera falla: a los 7 días exactos una vuelta del timer lo borraba SIN
     HABERLO MANDADO NUNCA, y el cartel desaparecía con él. El piloto vio "guardado" y no quedó
     nada, ni en el teléfono ni en el CH. */
  p087Limpiar();
  const viejo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  localStorage.setItem(P087_K, JSON.stringify([
    { url: P087_URL(), ts: viejo, intentos: 10, motivo: 'http_500', trabado: true }]));
  const o = window.fetch; let envios = 0;
  window.fetch = (u, op) => { envios++; return p087Fetch('error500')(u, op); };
  try { flushPending(); await p087Tick(); } finally { window.fetch = o; }
  PRUEBAS.igual(p087Cola().length, 1,
    'a los 8 días el registro retenido SIGUE guardado · el que espera a una persona espera');
  PRUEBAS.igual(envios, 0, 'y no se manda solo: sigue esperando que la toquen');
  p087Limpiar();
});

PRUEBAS.caso('🔴 tocar "intentar otra vez" el día 8 lo manda, no lo destruye', async () => {
  p087Limpiar();
  const viejo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  localStorage.setItem(P087_K, JSON.stringify([
    { url: P087_URL(), ts: viejo, intentos: 10, motivo: 'http_500', trabado: true }]));
  const o = window.fetch; let envios = 0;
  window.fetch = (u, op) => { envios++; return p087Fetch('ok')(u, op); };
  try { colaReintentar(); await p087Tick(); } finally { window.fetch = o; }
  PRUEBAS.igual(envios, 1, 'se hizo el pedido · antes lo borraba el filtro de edad primero');
  PRUEBAS.igual(p087Cola().length, 0, 'y como entró, se limpia');
});

PRUEBAS.caso('🔴 al cerrar sesión SÍ se intentan los retenidos', async () => {
  /* `cerrarSesion` borra K_PENDING del teléfono a continuación, y la app acaba de prometer
     "Toca Aceptar para intentar enviarlos primero". Si los retenidos quedaban afuera de ese
     último intento, la promesa era falsa y el registro se perdía ahí mismo. */
  p087Limpiar();
  localStorage.setItem(P087_K, JSON.stringify([
    { url: P087_URL(), ts: Date.now(), intentos: 10, motivo: 'http_500', trabado: true }]));
  const o = window.fetch; const vistos = [];
  window.fetch = (u, op) => { vistos.push(op); return new Promise(() => {}); };
  try { flushPending(true); } finally { window.fetch = o; }
  PRUEBAS.igual(vistos.length, 1, 'el retenido se intenta');
  PRUEBAS.igual(vistos[0].keepalive, true, 'con keepalive, o el navegador lo aborta al recargar');
  p087Limpiar();
});

PRUEBAS.caso('🔴 el evento online no manda el registro dos veces', async () => {
  /* `addEventListener('online', flushPending)` le pasaba el Event como `alSalir`: truthy. La cola
     no se limpiaba y 60 s después el timer mandaba lo mismo otra vez. En los ocho webhooks sin
     `id` eso son dos filas de la misma prueba en la hoja clínica. */
  p087Limpiar();
  localStorage.setItem(P087_K, JSON.stringify([{ url: P087_AJENO(), ts: Date.now(), intentos: 0 }]));
  const o = window.fetch; const opts = [];
  window.fetch = (u, op) => { opts.push(op); return p087Fetch('opaca')(u, op); };
  try {
    window.dispatchEvent(new Event('online'));
    await p087Tick(20);
    flushPending();                                   // la vuelta del timer, 60 s después
    await p087Tick(20);
  } finally { window.fetch = o; }
  PRUEBAS.igual(opts.length, 1, 'UN solo envío para un solo registro · eran tres');
  PRUEBAS.igual(p087Cola().length, 0, 'y la cola quedó limpia');
  /* ⚠️ EL DISCRIMINADOR, y no es de adorno: con el listener viejo este caso daba VERDE igual,
     porque el rediseño de "sacar de la cola cuando el servidor confirma" ya elimina el duplicado
     por otra vía. Lo que el Event sigue causando es un `keepalive` en cada reconexión — o sea un
     pedido que el navegador no puede cancelar, en la página bien viva. Se mide eso, que es lo
     único que el listener controla; si no, este caso no probaría nada del listener. */
  PRUEBAS.igual(!opts[0].keepalive, true,
    'y sin keepalive · ese modo es sólo para la salida, no para cada reconexión');
});

PRUEBAS.caso('🔴 dos flush casi juntos no duplican el envío', async () => {
  p087Limpiar();
  localStorage.setItem(P087_K, JSON.stringify([{ url: P087_URL(), ts: Date.now(), intentos: 0 }]));
  const o = window.fetch; let envios = 0;
  window.fetch = (u, op) => { envios++; return new Promise(() => {}); };   // nunca contesta
  try { flushPending(); flushPending(); flushPending(); } finally { window.fetch = o; }
  PRUEBAS.igual(envios, 1, 'el candado de "en vuelo" deja pasar uno solo');
  p087Limpiar();
});

PRUEBAS.caso('🔴 al llegar al tope de 50, lo que se descarta NO son los retenidos', async () => {
  /* `slice(-50)` descartaba los más VIEJOS, y los retenidos son los que quedan al frente. Con el
     endpoint rechazando dos semanas, cada registro nuevo borraba en silencio el retenido más
     viejo — el que el cartel decía estar guardando. */
  p087Limpiar();
  const base = [];
  for (let i = 0; i < 5; i++)
    base.push({ url: 'https://x/viejo' + i, ts: Date.now() - 1000, intentos: 10,
                motivo: 'http_500', trabado: true });
  for (let i = 0; i < 48; i++)
    base.push({ url: 'https://x/nuevo' + i, ts: Date.now(), intentos: 1, motivo: 'red' });
  localStorage.setItem(P087_K, JSON.stringify(base));
  const o = window.fetch; window.fetch = p087Fetch('rechazo');
  try { await enviarConCola(P087_URL()); } finally { window.fetch = o; }
  const q = p087Cola();
  PRUEBAS.igual(q.length <= 50, true, 'la cola respeta el tope · quedaron ' + q.length);
  const trab = q.filter(x => x.trabado).length;
  PRUEBAS.igual(trab, 5, 'los CINCO retenidos siguen ahí · quedaron ' + trab);
  p087Limpiar();
});

/* Deja un registro RETENIDO en la cola, por el camino de los intentos (que es el único que
   retiene ahora). Se arma directo porque llegar ahí por diez vueltas del lazo ya está probado en
   su propio caso, y repetirlo acá sólo haría más lento el archivo. */
function p087Retenido(){
  localStorage.setItem(P087_K, JSON.stringify([
    { url: P087_URL(), ts: Date.now(), intentos: COLA_MAX_INTENTOS, motivo: 'http_500',
      trabado: true }]));
}

PRUEBAS.caso('la persona puede reintentar a mano lo retenido', async () => {
  p087Limpiar(); p087Retenido();
  PRUEBAS.igual(p087Cola()[0].trabado, true, 'está retenido');
  const o = window.fetch;
  window.fetch = p087Fetch('ok');
  try { colaReintentar(); await p087Tick(); } finally { window.fetch = o; }
  PRUEBAS.igual(p087Cola().length, 0,
    'al tocar el cartel se manda de nuevo, y si esta vez entra, se limpia');
});

PRUEBAS.caso('el cartel no dice "Enviando…" de algo que nadie está enviando', async () => {
  p087Limpiar(); p087Retenido();
  const el = document.getElementById('offBar');
  PRUEBAS.igual(!!el, true, 'la barra existe');
  /* `offPintar` se apaga entero en modo demostración —la demo siembra pendientes de mentira—, y
     algún caso anterior deja `DASH.demoMode` puesto. Sin bajarlo, este caso mediría la barra
     apagada y daría un verde falso. */
  const demoAntes = (typeof DASH !== 'undefined' && DASH) ? DASH.demoMode : undefined;
  if (typeof DASH !== 'undefined' && DASH) DASH.demoMode = false;
  offPintar();
  PRUEBAS.igual(el.style.display !== 'none', true, 'se muestra');
  PRUEBAS.igual(/no se pudo enviar/i.test(el.textContent), true,
    'y dice la verdad · decía «' + el.textContent + '»');
  PRUEBAS.igual(el.className.indexOf('off-bar-trabada') >= 0, true, 'con su propio color');
  PRUEBAS.igual(typeof el.onclick === 'function', true, 'y se puede tocar para reintentar');
  PRUEBAS.igual(el.getAttribute('role'), 'button', 'anunciado como botón, no como estado');
  p087Limpiar(); offPintar();
  /* El discriminador: sin retenidos el cartel deja de decirlo. No se mira `display`, porque las
     otras cuatro colas de la app pueden tener pendientes de otros casos y la barra seguiría
     visible con razón. */
  PRUEBAS.igual(/no se pudo enviar|no se pudieron enviar/i.test(el.textContent), false,
    'sin retenidos, el cartel deja de avisarlo · decía «' + el.textContent + '»');
  PRUEBAS.igual(el.className.indexOf('off-bar-trabada') < 0, true, 'y vuelve a su color normal');
  PRUEBAS.igual(el.onclick, null, 'y deja de ser clickeable');
  PRUEBAS.igual(el.getAttribute('role'), 'status',
    'y vuelve a anunciarse como estado, no como un botón que ya no hace nada');
  if (typeof DASH !== 'undefined' && DASH) DASH.demoMode = demoAntes;
});

PRUEBAS.caso('⚠️ los OCHO webhooks ajenos siguen en no-cors, y esto no es un olvido', async () => {
  /* Si alguien los pasa a `cors` sin probarlos, este caso lo frena. Sin `id` no hay deduplicación
     posible: un reintento escribe la prueba dos veces en la hoja clínica. */
  p087Limpiar();
  await p087Enviar('rechazo', P087_AJENO());
  PRUEBAS.igual(p087Fetch.ultimo.mode, 'no-cors',
    'el webhook del test de depresión sigue mandando opaco');
  PRUEBAS.igual(p087Cola().length, 0,
    'y por lo tanto NO se encola por un {ok:false} que no puede leer · comportamiento de antes');
  const o = window.fetch; window.fetch = p087Fetch('red');
  try { await enviarConCola(P087_AJENO()); } finally { window.fetch = o; }
  PRUEBAS.igual(p087Cola().length, 1, 'pero un fallo de RED sí lo sigue encolando (R7)');
  p087Limpiar();
});

PRUEBAS.caso('el endpoint del CH sí manda en modo cors', async () => {
  p087Limpiar();
  await p087Enviar('ok');
  PRUEBAS.igual(p087Fetch.ultimo.mode, 'cors',
    'sin esto, todo lo de arriba es decorativo: la respuesta seguiría siendo opaca');
  p087Limpiar();
});

PRUEBAS.caso('al cerrar sesión sigue mandando con keepalive y sin vaciar la cola', async () => {
  /* No es de este prompt, pero es lo que más fácil se rompe tocando esta función: si `flushPending`
     vaciara la cola al salir, los registros desaparecerían al recargar la página. */
  p087Limpiar();
  localStorage.setItem(P087_K, JSON.stringify([{ url: P087_URL(), ts: Date.now(), intentos: 0 }]));
  const o = window.fetch; let vistos = [];
  window.fetch = (u, op) => { vistos.push(op); return new Promise(() => {}); };
  try { flushPending(true); } finally { window.fetch = o; }
  PRUEBAS.igual(vistos.length, 1, 'salió el envío');
  PRUEBAS.igual(vistos[0].keepalive, true, 'con keepalive, o el navegador lo aborta al recargar');
  PRUEBAS.igual(p087Cola().length, 1, 'y la cola NO se vació');
  p087Limpiar();
});
