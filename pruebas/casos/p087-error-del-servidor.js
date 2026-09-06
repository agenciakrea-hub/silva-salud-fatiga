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

function p087Limpiar(){ localStorage.removeItem(P087_K); }
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

PRUEBAS.caso('un rechazo del servidor se RETIENE, no se reintenta 1.440 veces por día', async () => {
  p087Limpiar();
  await p087Enviar('rechazo');
  PRUEBAS.igual(p087Cola()[0].trabado, true,
    'mandar de nuevo lo que el servidor rechaza da el mismo rechazo · se retiene y se avisa');
  /* Y flushPending no lo toca. */
  const o = window.fetch; let llamadas = 0;
  window.fetch = (u, op) => { llamadas++; return p087Fetch('ok')(u, op); };
  try { flushPending(); } finally { window.fetch = o; }
  PRUEBAS.igual(llamadas, 0, 'la cola automática lo saltea');
  PRUEBAS.igual(p087Cola().length, 1, 'pero NO lo borra: sigue guardado y contado');
});

PRUEBAS.caso('el reintento automático se rinde a los 10 intentos, y no antes', async () => {
  p087Limpiar();
  for (let i = 0; i < 9; i++) await p087Enviar('error500');
  PRUEBAS.igual(p087Cola()[0].intentos, 9, 'lleva la cuenta');
  PRUEBAS.igual(!!p087Cola()[0].trabado, false, 'al noveno todavía insiste');
  await p087Enviar('error500');
  PRUEBAS.igual(p087Cola()[0].trabado, true, 'al décimo se rinde y avisa');
  PRUEBAS.igual(p087Cola().length, 1, 'sin duplicar la entrada · se actualiza la misma');
});

PRUEBAS.caso('la persona puede reintentar a mano lo retenido', async () => {
  p087Limpiar();
  await p087Enviar('rechazo');
  PRUEBAS.igual(p087Cola()[0].trabado, true, 'está retenido');
  const o = window.fetch;
  window.fetch = p087Fetch('ok');
  try { colaReintentar(); await new Promise(r => setTimeout(r, 20)); } finally { window.fetch = o; }
  PRUEBAS.igual(p087Cola().length, 0,
    'al tocar el cartel se manda de nuevo, y si esta vez entra, se limpia');
});

PRUEBAS.caso('el cartel no dice "Enviando…" de algo que nadie está enviando', async () => {
  p087Limpiar();
  await p087Enviar('rechazo');
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
