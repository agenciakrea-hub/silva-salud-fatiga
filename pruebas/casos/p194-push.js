PRUEBAS.grupo('P194 (2026-09-21) · notificaciones del sistema por Web Push: contrato .gs ↔ cliente ↔ service worker');

/* Auditoría de uso real #35: con la app cerrada no llegaba nada a nadie. Decisión de Franco: Web Push completo.
   · SERVIDOR (el .gs REAL en el emulador): ES256 (BigInt + RFC 6979) verificado acá con crypto.subtle; `suscripcion_guardar`
     con la identidad de `tareas_mias` y upsert por endpoint; `avisos` por dispositivoId; `pushEnviar` con las cabeceras
     VAPID, 410 → baja; el gancho en `accionTareaGuardar` (sólo nueva) y en `cicloDetenerVencidos`.
   · SERVICE WORKER (sw.js en un `self` de mentira): push vacío → lee la config → pide avisos → una notificación por
     hecho con `tag`; sin avisos o sin red → la genérica; el toque enfoca y manda «abrir».
   · CLIENTE (camino real): el ofrecimiento entra por `mark()` como aviso en «Tus tareas»; `notifActivar` pide el
     permiso con el toque y suscribe con `pushManager` (de mentira) → la cola del empleado lleva la suscripción; la
     configuración queda en IndexedDB en el idioma de la persona y cambia con el idioma; el bloque de Ajustes.
   ⚠️ R18: se restauran `Notification`, `navigator.serviceWorker.ready`, `swReg`, `empEncolar` y la cola en `finally`. */

const P194_HOJAS = () => ({
  'Accesos': [['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
              ['prueba', 'sup-194', 'supervisor', 'Empresa De Prueba', 'med-194', '']],
  'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
             ['Empresa De Prueba', 'Persona De Prueba', 'V-1940001', 'Operaciones', 'Piloto', 'F', '34', '', '', 'Sí', '', '', '4'],
             ['Empresa De Prueba', 'Otra Persona', 'V-1940002', 'Operaciones', 'Piloto', 'M', '40', '', '', 'Sí', '', '', '4']],
  'Tareas': [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle','Vence','Estado','Creada','Actualizada','CreadaPor']],
  'Config Empresa': [['Empresa', 'Clave', 'Valor']],
  'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo','UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON']],
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']]
});
function p194Api(extra, fns, opciones){
  const env = GS.crearEntorno(Object.assign(P194_HOJAS(), extra || {}), opciones || {});
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  api.__hoja = n => { const sh = env.__libro.getSheetByName(n); if (!sh || sh.getLastRow() < 2) return []; return sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues().slice(1); };
  return api;
}
const p194Json = r => JSON.parse(r.getContent ? r.getContent() : r);
const P194_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/p194-endpoint-de-prueba';
const p194Sub = extra => Object.assign({ action: 'suscripcion_guardar', _post: true, endpoint: P194_ENDPOINT, dispositivoId: 'disp-194', persona: 'Persona De Prueba', cedula: 'V-1940001', empresa: 'Empresa De Prueba', p256dh: 'p256', auth: 'auth', idioma: 'en' }, extra || {});
function p194B64uABytes(s){ const t = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4); const bin = atob(t); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
async function p194Verificar(jwt, publicaB64u){
  const [h, p, s] = jwt.split('.');
  const pub = p194B64uABytes(publicaB64u);
  const b64u = a => btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)) }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, p194B64uABytes(s), new TextEncoder().encode(h + '.' + p));
}

PRUEBAS.caso('🔴 P194 · servidor · el JWT VAPID que firma el .gs (ES256 a mano, k determinista) VERIFICA con crypto.subtle; alterado, no; la pública del .gs es la del cliente', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p194Api({}, ['vapidJwt_', 'vapidPublica_', 'es256_', 'b64urlABytes_']);
  const pub = api.vapidPublica_();
  PRUEBAS.igual(pub, vapidPublica(), '🔴 la pública derivada de la privada del .gs es la VAPID_PUBLICA del index (con otra, los pushes se rechazan)');
  const jwt = api.vapidJwt_('https://fcm.googleapis.com', 1800000000);
  const partes = jwt.split('.');
  PRUEBAS.igual(partes.length, 3, 'tres partes');
  PRUEBAS.igual(JSON.parse(atob(partes[0].replace(/-/g, '+').replace(/_/g, '/'))).alg, 'ES256', 'alg ES256');
  const cuerpo = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
  PRUEBAS.igual([cuerpo.aud, cuerpo.exp], ['https://fcm.googleapis.com', 1800000000 + 12 * 3600], 'aud = origen del servicio · exp a 12 h');
  PRUEBAS.cierto(/^(mailto:|https:)/.test(cuerpo.sub), 'sub = un contacto (RFC 8292) · ' + cuerpo.sub);
  PRUEBAS.igual(await p194Verificar(jwt, pub), true, '🔴 la firma verifica con WebCrypto (ECDSA P-256 / SHA-256)');
  PRUEBAS.igual(await p194Verificar(partes[0] + '.' + partes[1] + '.' + partes[2].slice(0, 10) + (partes[2][10] === 'A' ? 'B' : 'A') + partes[2].slice(11), pub), false, 'DISCRIMINADOR · un carácter cambiado en la firma no verifica');
  PRUEBAS.igual(api.vapidJwt_('https://fcm.googleapis.com', 1800000000), jwt, 'determinista (RFC 6979): la misma entrada, la misma firma — sin azar del que Apps Script carece');
  const sw = await (await fetch('/sw.js?v=' + Date.now())).text();
  PRUEBAS.cierto(sw.indexOf("const VAPID_PUBLICA = '" + pub + "'") > 0, 'y sw.js lleva la misma pública (para resuscribirse solo)');
});

PRUEBAS.caso('🔴 P194 · servidor · suscripcion_guardar: identidad contra la nómina (cédula equivocada → no), upsert por endpoint, la demo no; suscripcion_borrar sólo con el mismo dispositivo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p194Api({}, ['accionSuscripcionGuardar', 'accionSuscripcionBorrar']);
  let r = p194Json(api.accionSuscripcionGuardar(p194Sub({ _post: false })));
  PRUEBAS.igual(r.ok, false, 'por GET no (la suscripción no puede quedar en un caché de URL)');
  r = p194Json(api.accionSuscripcionGuardar(p194Sub({ cedula: 'V-9999999' })));
  PRUEBAS.igual(r.ok, false, '🔴 con una cédula que no es la de la persona: rechaza · ' + r.error);
  r = p194Json(api.accionSuscripcionGuardar(p194Sub()));
  PRUEBAS.igual([r.ok, r.nuevo], [true, true], '🔴 con el par nombre + cédula de la nómina: guarda');
  let f = api.__hoja('Suscripciones');
  PRUEBAS.igual(f.length, 1, 'una fila en Suscripciones');
  PRUEBAS.igual([String(f[0][0]), String(f[0][1]), String(f[0][2]), String(f[0][3]), String(f[0][4]), String(f[0][7])], [P194_ENDPOINT, 'disp-194', 'Empresa De Prueba', 'Persona De Prueba', '1940001', 'en'], 'Endpoint · dispositivo · empresa canónica · persona · cédula normalizada · idioma');
  r = p194Json(api.accionSuscripcionGuardar(p194Sub({ idioma: 'es', dispositivoId: 'disp-194' })));
  PRUEBAS.igual([r.ok, r.actualizado, api.__hoja('Suscripciones').length], [true, true, 1], '🔴 reenviar el mismo endpoint ACTUALIZA (R15: upsert, no append) · idioma ahora ' + api.__hoja('Suscripciones')[0][7]);
  r = p194Json(api.accionSuscripcionGuardar(p194Sub({ empresa: 'Empresa Demo' })));
  PRUEBAS.igual(r.ok, false, 'la demostración no se suscribe');
  r = p194Json(api.accionSuscripcionBorrar({ action: 'suscripcion_borrar', _post: true, endpoint: P194_ENDPOINT, dispositivoId: 'otro-disp' }));
  PRUEBAS.igual([r.ok, r.borradas, api.__hoja('Suscripciones').length], [true, 0, 1], '🔴 borrar con OTRO dispositivo no borra (el endpoint solo no es una llave)');
  r = p194Json(api.accionSuscripcionBorrar({ action: 'suscripcion_borrar', _post: true, endpoint: P194_ENDPOINT, dispositivoId: 'disp-194' }));
  PRUEBAS.igual([r.ok, r.borradas, api.__hoja('Suscripciones').length], [true, 1, 0], 'con el mismo dispositivo sí');
});

PRUEBAS.caso('🔴 P194 · servidor · avisos por dispositivoId: tareas pendientes de ESA persona (no de otra) y el ciclo detenido de las últimas 48 h; sin suscripción, nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const ahora = Date.now(), hace = h => new Date(ahora - h * 3600000).toISOString();
  const api = p194Api({
    'Tareas': [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle','Vence','Estado','Creada','Actualizada','CreadaPor'],
      ['Empresa De Prueba', 't1', '1940001', 'Persona De Prueba', 'medico', 'Cita', '', '', 'sin_leer', '01/09/2026 10:00', '01/09/2026 10:00', 'x'],
      ['Empresa De Prueba', 't2', '1940001', 'Persona De Prueba', 'supervisor', 'Otra', '', '', 'hecha', '01/09/2026 10:00', '01/09/2026 10:00', 'x'],
      ['Empresa De Prueba', 't3', '1940002', 'Otra Persona', 'medico', 'De otra', '', '', 'sin_leer', '01/09/2026 10:00', '01/09/2026 10:00', 'x']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [hace(30).slice(0, 10), '10:00', hace(30), 'op1', 'Persona De Prueba', 'Empresa De Prueba', 'Operaciones', 'Piloto', 'salida_casa', '', '', ''],
      [hace(6).slice(0, 10), '10:00', hace(6), 'det_1', 'Persona De Prueba', 'Empresa De Prueba', 'Operaciones', 'Piloto', 'detenido', 'salida_casa', '', ''],
      [hace(5).slice(0, 10), '10:00', hace(5), 'det_2', 'Otra Persona', 'Empresa De Prueba', 'Operaciones', 'Piloto', 'detenido', 'salida_casa', '', '']]
  }, ['accionSuscripcionGuardar', 'accionAvisos']);
  let r = p194Json(api.accionAvisos({ dispositivoId: 'disp-194' }));
  PRUEBAS.igual([r.ok, r.avisos.length, r.sinSuscripcion], [true, 0, true], 'sin suscripción: lista vacía y lo dice');
  p194Json(api.accionSuscripcionGuardar(p194Sub()));
  r = p194Json(api.accionAvisos({ dispositivoId: 'disp-194' }));
  PRUEBAS.igual(r.ok, true, 'ok');
  const tareas = r.avisos.find(a => a.tipo === 'tareas'), det = r.avisos.find(a => a.tipo === 'ciclo_detenido');
  PRUEBAS.cierto(!!tareas && tareas.n === 1, '🔴 UNA tarea pendiente (la hecha no cuenta; la de la otra persona tampoco) · ' + JSON.stringify(tareas));
  PRUEBAS.cierto(!!det && det.desde === hace(6) && /^ciclo_/.test(det.tag), '🔴 el detenido de ESTA persona, de hace 6 h, con su tag · ' + JSON.stringify(det));
  PRUEBAS.igual(r.idioma, 'en', 'y el idioma de la suscripción');
  PRUEBAS.cierto(!JSON.stringify(r).match(/Cita|De otra|Otra Persona/), '🔒 sin títulos de tareas ni nombres de terceros: sólo cuántas y desde cuándo');
});

PRUEBAS.caso('🔴 P194 · servidor · pushEnviar manda un POST vacío con TTL y Authorization vapid al endpoint de la persona; 410 → da de baja; una tarea NUEVA dispara y editarla no', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const respuestas = []; let codigo = 201;
  const api = p194Api({}, ['accionSuscripcionGuardar', 'pushEnviar', 'accionTareaGuardar'], {
    responderFetch: (url, params) => { respuestas.push({ url, params }); return { getResponseCode: () => codigo, getContentText: () => '' }; }
  });
  p194Json(api.accionSuscripcionGuardar(p194Sub()));
  p194Json(api.accionSuscripcionGuardar(p194Sub({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/otro', dispositivoId: 'disp-194b' })));
  let inf = api.pushEnviar('Empresa De Prueba', 'Persona De Prueba', 'V-1940001', 'prueba');
  PRUEBAS.igual([inf.enviados, inf.bajas, inf.fallos, respuestas.length], [2, 0, 0, 2], '🔴 un POST por suscripción de la persona · ' + JSON.stringify(inf.detalle));
  const p = respuestas[0].params;
  PRUEBAS.igual([String(p.method).toLowerCase(), p.payload, p.muteHttpExceptions], ['post', '', true], 'POST vacío, sin lanzar por el código');
  PRUEBAS.cierto(p.headers && /^vapid t=[^,]+, k=/.test(p.headers.Authorization) && Number(p.headers.TTL) > 0, '🔴 Authorization: vapid t=…, k=… y TTL · ' + JSON.stringify(Object.keys(p.headers)));
  const auds = respuestas.map(x => JSON.parse(atob(/t=([^,]+)/.exec(x.params.headers.Authorization)[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aud);
  PRUEBAS.igual(auds.slice().sort(), ['https://fcm.googleapis.com', 'https://updates.push.services.mozilla.com'], '🔴 el aud es el ORIGEN de cada servicio (un token por servicio) · ' + auds.join(' | '));
  PRUEBAS.igual(inf.enviados, 2, 'guarda: dos enviados');
  const f = api.__hoja('Suscripciones');
  PRUEBAS.cierto(f.every(x => String(x[9]) && Number(x[10]) === 0), 'UltimaOk anotada y Fallos en 0');
  codigo = 410;
  inf = api.pushEnviar('Empresa De Prueba', 'Persona De Prueba', 'V-1940001', 'prueba');
  PRUEBAS.igual([inf.bajas, api.__hoja('Suscripciones').length], [2, 0], '🔴 410 (suscripción vencida) → se borran las filas, buscadas por endpoint bajo candado (no por índice)');
  /* cinco fallos que no son 404/410 también dan de baja; menos de cinco, se cuentan */
  p194Json(api.accionSuscripcionGuardar(p194Sub()));
  codigo = 500;
  for (let i = 0; i < 4; i++) api.pushEnviar('Empresa De Prueba', 'Persona De Prueba', 'V-1940001', 'prueba');
  PRUEBAS.igual([api.__hoja('Suscripciones').length, Number(api.__hoja('Suscripciones')[0][10])], [1, 4], 'cuatro 500: la fila sigue, con Fallos = 4');
  api.pushEnviar('Empresa De Prueba', 'Persona De Prueba', 'V-1940001', 'prueba');
  PRUEBAS.igual(api.__hoja('Suscripciones').length, 0, 'al quinto fallo se da de baja');
  /* el gancho: una tarea nueva dispara UN push; editarla, ninguno */
  codigo = 201; respuestas.length = 0;
  p194Json(api.accionSuscripcionGuardar(p194Sub()));
  let r = p194Json(api.accionTareaGuardar({ usuario: 'prueba', empresa: 'Empresa De Prueba', pass: 'med-194', dispositivoId: 'd', tarea: JSON.stringify({ id: 't-194', persona: 'Persona De Prueba', titulo: 'Cita con el servicio médico', cedula: 'V-1940001' }) }));
  PRUEBAS.igual([r.ok, r.nuevo, respuestas.length], [true, true, 1], '🔴 tarea nueva → un push a la persona');
  r = p194Json(api.accionTareaGuardar({ usuario: 'prueba', empresa: 'Empresa De Prueba', pass: 'med-194', dispositivoId: 'd', tarea: JSON.stringify({ id: 't-194', persona: 'Persona De Prueba', titulo: 'Cita (cambiada)', cedula: 'V-1940001' }) }));
  PRUEBAS.igual([r.ok, r.actualizado, respuestas.length], [true, true, 1], 'editarla no vuelve a avisar');
  /* y el reloj que detiene ciclos también llama a pushEnviar (sobre la FUENTE: el camino entero tiene su caso en P186) */
  PRUEBAS.cierto(/bitacoraServidor\(ultimo\.empresa, "ciclo_detenido"[\s\S]{0,400}pushEnviar\(ultimo\.empresa, ultimo\.persona, "", "ciclo_detenido"\)/.test(CTX.gs), 'cicloDetenerVencidos llama a pushEnviar después de registrar el detenido');
  PRUEBAS.cierto(/if \(accion === "suscripcion_guardar"\)|if \(accion === "avisos"\)/.test(CTX.gs) && /GS_VERSION = "2026-09-21\.1"/.test(CTX.gs), 'despacho de las acciones nuevas y GS_VERSION 2026-09-21.1');
});

/* ── el service worker en un `self` de mentira, con el IndexedDB REAL de este origen ── */
async function p194Sw(fetchFalso){
  const src = await (await fetch('/sw.js?v=' + Date.now())).text();
  const oyentes = {}, notis = [], clientes = [], abiertas = [];
  const selfFalso = {
    addEventListener: (k, f) => { oyentes[k] = f; }, skipWaiting: () => Promise.resolve(),
    registration: { showNotification: (t, o) => { notis.push({ titulo: t, o: o }); return Promise.resolve(); }, pushManager: { subscribe: () => Promise.resolve({ endpoint: 'https://x/y', toJSON: () => ({ endpoint: 'https://x/y', keys: { p256dh: 'a', auth: 'b' } }) }) } },
    clients: { matchAll: () => Promise.resolve(clientes), openWindow: u => { abiertas.push(u); return Promise.resolve({ postMessage: m => abiertas.push(m) }); }, claim: () => Promise.resolve() }
  };
  const cachesFalso = { open: () => Promise.resolve({ addAll: () => Promise.resolve(), match: () => Promise.resolve(undefined), put: () => Promise.resolve() }), keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) };
  new Function('self', 'caches', 'fetch', src + '\n;return 0;')(selfFalso, cachesFalso, fetchFalso || (() => Promise.reject(new Error('sin red'))));
  return { oyentes, notis, clientes, abiertas };
}
function p194Config(cfg){
  return new Promise((res, rej) => {
    const req = indexedDB.open('silva-push', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('config', { keyPath: 'clave' }); };
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('config', 'readwrite'); if (cfg) tx.objectStore('config').put(cfg); else tx.objectStore('config').delete('actual'); tx.oncomplete = () => { db.close(); res(true); }; tx.onerror = () => { db.close(); rej(tx.error); }; };
    req.onerror = () => rej(req.error);
  });
}
function p194ConfigLeer(){
  return new Promise((res, rej) => {
    const req = indexedDB.open('silva-push', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('config', { keyPath: 'clave' }); };
    req.onsuccess = () => { const db = req.result; const r = db.transaction('config', 'readonly').objectStore('config').get('actual'); r.onsuccess = () => { db.close(); res(r.result || null); }; r.onerror = () => { db.close(); rej(r.error); }; };
    req.onerror = () => rej(req.error);
  });
}

PRUEBAS.caso('🔴 P194 · service worker · un push vacío lee la config, pide avisos y muestra una notificación por hecho en el idioma guardado; sin red o sin nada → la genérica; el toque enfoca la app y le dice a dónde ir', async () => {
  const pedidos = [];
  let respuesta = { ok: true, avisos: [{ tipo: 'tareas', n: 2, tag: 'tareas' }, { tipo: 'ciclo_detenido', desde: '2026-09-20T10:00:00.000Z', tag: 'ciclo_2026-09-20T10:00:00.000Z' }] };
  const fetchFalso = (url) => { pedidos.push(url); return Promise.resolve({ json: () => Promise.resolve(respuesta) }); };
  try {
    await p194Config({ clave: 'actual', dispositivoId: 'disp-sw-194', idioma: 'en', url: 'https://endpoint.de.prueba/exec', vapid: vapidPublica(), persona: 'P', cedula: 'C', empresa: 'E',
      textos: { titulo: 'Silva Fatiga', tarea_1: 'You have 1 pending task', tarea_n: 'You have {n} pending tasks', ciclo_detenido: 'Your cycle stopped', generico: 'News' } });
    const sw = await p194Sw(fetchFalso);
    PRUEBAS.cierto(typeof sw.oyentes.push === 'function' && typeof sw.oyentes.notificationclick === 'function' && typeof sw.oyentes.pushsubscriptionchange === 'function', 'guarda: el SW escucha push, notificationclick y pushsubscriptionchange');
    let esperado = null;
    sw.oyentes.push({ waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual(pedidos.length, 1, 'un pedido de avisos');
    PRUEBAS.cierto(/action=avisos&dispositivoId=disp-sw-194/.test(pedidos[0]) && pedidos[0].indexOf('https://endpoint.de.prueba/exec?') === 0, '🔴 al endpoint de la config, con el dispositivoId · ' + pedidos[0].slice(0, 80));
    PRUEBAS.igual(sw.notis.length, 2, '🔴 dos notificaciones: tareas y ciclo');
    PRUEBAS.igual(sw.notis[0].o.body, 'You have 2 pending tasks', 'en el idioma guardado, con el número');
    PRUEBAS.igual([sw.notis[0].o.tag, sw.notis[0].o.data.ir, sw.notis[1].o.tag, sw.notis[1].o.data.ir], ['tareas', 'tareas', 'ciclo_2026-09-20T10:00:00.000Z', 'inicio'], 'tags por hecho (un push repetido reemplaza) y destino');
    PRUEBAS.cierto(sw.notis.every(n => n.titulo === 'Silva Fatiga' && /icon-192/.test(n.o.icon)), 'título e ícono');
    /* sin nada pendiente: igual una (Chrome exige mostrar algo por cada push) */
    sw.notis.length = 0; respuesta = { ok: true, avisos: [] };
    sw.oyentes.push({ waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual([sw.notis.length, sw.notis[0] && sw.notis[0].o.body], [1, 'News'], 'sin avisos → la genérica');
    /* sin red: también la genérica, sin lanzar */
    const sw2 = await p194Sw(() => Promise.reject(new Error('sin red')));
    sw2.oyentes.push({ waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual([sw2.notis.length, sw2.notis[0] && sw2.notis[0].o.tag], [1, 'generico'], 'sin red → la genérica');
    /* el toque: con la app abierta la enfoca y le dice a dónde ir; cerrada, la abre */
    const mensajes = []; sw.clientes.push({ focus: () => Promise.resolve(), postMessage: m => mensajes.push(m) });
    sw.oyentes.notificationclick({ notification: { close: () => {}, data: { ir: 'tareas' } }, waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual(JSON.stringify(mensajes), JSON.stringify([{ tipo: 'abrir', ir: 'tareas' }]), '🔴 enfoca la ventana abierta y manda {abrir, ir:tareas}');
    sw.clientes.length = 0;
    sw.oyentes.notificationclick({ notification: { close: () => {}, data: { ir: 'inicio' } }, waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual(sw.abiertas[0], './', 'sin ventana: abre la app');
    /* y sin config (dispositivo no suscripto): la genérica, sin pedir nada */
    await p194Config(null); pedidos.length = 0;
    const sw3 = await p194Sw(fetchFalso);
    sw3.oyentes.push({ waitUntil: p => { esperado = p; } }); await esperado;
    PRUEBAS.igual([pedidos.length, sw3.notis.length], [0, 1], 'sin config no pide nada y muestra la genérica');
  } finally { await p194Config(null); }
});

/* ── el cliente por el camino real, con Notification y pushManager de mentira ── */
function p194Cliente(permiso, paso){
  const oNotif = window.Notification, oReg = swReg, oFetch = window.fetch;
  const oEncolar = window.empEncolar, prevLS = Object.assign({}, localStorage), prevIdioma = idiomaActual();
  const encolados = []; let permisoPedido = 0, suscripciones = 0;
  const subFalsa = { endpoint: 'https://fcm.googleapis.com/fcm/send/cliente-194', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/cliente-194', keys: { p256dh: 'pk', auth: 'au' } }), unsubscribe: () => { suscripcionActual = null; return Promise.resolve(true); } };
  let suscripcionActual = null;
  const regFalso = { pushManager: { getSubscription: () => Promise.resolve(suscripcionActual), subscribe: opts => { suscripciones++; if (!(opts.applicationServerKey instanceof Uint8Array) || opts.applicationServerKey.length !== 65) return Promise.reject(new Error('clave mal')); suscripcionActual = subFalsa; return Promise.resolve(subFalsa); } },
                    showNotification: () => Promise.resolve() };
  const NotifFalsa = function(){}; NotifFalsa.permission = permiso; NotifFalsa.requestPermission = () => { permisoPedido++; NotifFalsa.permission = (permiso === 'default') ? 'granted' : permiso; return Promise.resolve(NotifFalsa.permission); };
  window.Notification = NotifFalsa; swReg = regFalso;
  window.empEncolar = (id, accion, payload) => { encolados.push({ id, accion, payload }); };
  const fetches = []; window.fetch = (u, o) => { fetches.push({ u, o }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }); };
  const estado = { encolados, fetches, permisoPedido: () => permisoPedido, suscripciones: () => suscripciones, reg: regFalso, sub: () => suscripcionActual, fallarSuscribir: v => { regFalso.pushManager.subscribe = () => { suscripciones++; if (v) return Promise.reject(new Error('sin red')); suscripcionActual = subFalsa; return Promise.resolve(subFalsa); }; } };
  return Promise.resolve().then(() => paso(estado)).finally(() => {
    window.Notification = oNotif; swReg = oReg; window.empEncolar = oEncolar; window.fetch = oFetch; fijarIdioma(prevIdioma);
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    return p194Config(null);
  });
}

PRUEBAS.caso('🔴 P194 · cliente · el primer registro del ciclo (mark) ofrece los avisos como aviso en «Tus tareas»; «Activar» pide el permiso con el toque, suscribe con la clave VAPID y manda la suscripción por la cola; la config del SW queda en el idioma de la persona y cambia con él', async () => {
  await p194Cliente('default', async est => {
    CTX.resetear(); localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1');
    PRUEBAS.igual(notifEstado(), 'default', 'guarda: permiso sin decidir');
    PRUEBAS.cierto(notifLocalItems().every(x => x.id !== 'avisos_ofrecer'), 'guarda: todavía no hay ofrecimiento');
    const oToast = window.showToast; window.showToast = () => {};
    try { mark('sen_cansancio'); } finally { window.showToast = oToast; }   // el primer registro, por el camino real
    const it = notifLocalItems().find(x => x.id === 'avisos_ofrecer');
    PRUEBAS.cierto(!!it && it.titulo === t('notif_ofrecer_titulo'), '🔴 mark() dejó el ofrecimiento en Tus tareas · ' + (it && it.titulo));
    tareasPintar();
    const btn = Array.from(document.querySelectorAll('#tareasLista .tar-btn, #tareasOv .tar-btn')).find(b => /notifActivar/.test(b.getAttribute('onclick') || ''));
    PRUEBAS.cierto(!!btn, '🔴 la tarjeta tiene el botón «Activar avisos» · ' + (btn && btn.textContent));
    const ok = await notifActivar(btn);
    PRUEBAS.igual([ok, est.permisoPedido(), est.suscripciones()], [true, 1, 1], '🔴 Activar: pidió el permiso una vez y suscribió una vez');
    PRUEBAS.igual(est.encolados.length, 1, 'una entrada en la cola del empleado');
    const e = est.encolados[0];
    PRUEBAS.igual([e.accion, e.payload.endpoint, e.payload.p256dh, e.payload.auth, e.payload.persona, e.payload.empresa, e.payload.idioma], ['suscripcion_guardar', 'https://fcm.googleapis.com/fcm/send/cliente-194', 'pk', 'au', 'Persona De Prueba', 'Empresa De Prueba', 'es'], '🔴 suscripcion_guardar con endpoint, claves, persona, empresa e idioma (cédula: ' + (e.payload.cedula ? 'sí' : 'no') + ')');
    PRUEBAS.cierto(notifLocalItems().every(x => x.id !== 'avisos_ofrecer'), 'el ofrecimiento se fue de Tus tareas');
    PRUEBAS.cierto(!!localStorage.getItem('silva_fatiga_avisos_ofrecido_v1'), 'y no se vuelve a ofrecer');
    let cfg = await p194ConfigLeer();
    PRUEBAS.cierto(!!cfg && cfg.dispositivoId === dispositivoId() && cfg.url === SHEETS_DASHBOARD_URL && cfg.idioma === 'es' && cfg.textos.tarea_n === t('push_tarea_n'), '🔴 la config del SW quedó en IndexedDB: dispositivo, url, idioma y textos en español');
    fijarIdioma('en');
    await pushRevisar();
    cfg = await p194ConfigLeer();
    PRUEBAS.igual([cfg.idioma, cfg.textos.tarea_1], ['en', 'You have 1 pending task'], '🔴 al cambiar de idioma los textos del SW cambian con él');
    /* Ajustes: activados → Probar y Desactivar */
    fijarIdioma('es'); avisosPintar();
    PRUEBAS.igual(document.getElementById('avisosLbl').textContent, t('avisos_ds_granted'), 'Ajustes dice «Activados»');
    PRUEBAS.cierto(/avisosProbar/.test(document.getElementById('avisosOpts').innerHTML) && /pushDesactivar/.test(document.getElementById('avisosOpts').innerHTML), 'con Probar y Desactivar');
    /* la firma: cambiar el idioma (ya arriba) o la identidad reenvía la suscripción; sin cambios, no */
    await pushRevisar(); await pushRevisar();   // el que disparó fijarIdioma('es') es asíncrono: se deja asentar antes de medir
    const antes = est.encolados.length;
    await pushRevisar();
    PRUEBAS.igual(est.encolados.length, antes, 'pushRevisar sin cambios no reenvía nada');
    setProfile(Object.assign(getProfile(), { cedula: '00000009' }));
    await pushRevisar();
    PRUEBAS.igual([est.encolados.length, est.encolados[est.encolados.length - 1].payload.cedula], [antes + 1, '00000009'], '🔴 cambió la identidad → se reenvía suscripcion_guardar con la nueva (upsert por endpoint)');
    await pushDesactivar();
    PRUEBAS.cierto(est.sub() === null && est.encolados.some(x => x.accion === 'suscripcion_borrar' && x.payload.endpoint === 'https://fcm.googleapis.com/fcm/send/cliente-194'), '🔴 Desactivar: des-suscribe en el navegador y manda suscripcion_borrar con el endpoint');
    PRUEBAS.igual(await p194ConfigLeer(), null, 'y borra la config del SW');
    PRUEBAS.igual(document.getElementById('avisosLbl').textContent, t('avisos_ds_default'), '🔴 y Ajustes vuelve a «Desactivados» con el botón Activar (verificador: antes era una puerta de una sola vía)');
    PRUEBAS.cierto(/notifActivar/.test(document.getElementById('avisosOpts').innerHTML), 'con el botón Activar aunque el permiso siga concedido');
    PRUEBAS.igual(pushActivoLocal(), false, 'la verdad local se apagó');
  });
});

PRUEBAS.caso('P194 · cliente · no se ofrece en el alta (perfil incompleto), ni en la demo, ni dos veces; con el permiso bloqueado Ajustes explica cómo destrabarlo y no ofrece', async () => {
  await p194Cliente('default', async est => {
    CTX.resetear(); localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1');
    setProfile({ nombre: 'Persona De Prueba' });   // alta a medias
    PRUEBAS.igual(notifOfrecerSiCorresponde(), false, 'perfil incompleto: no ofrece');
    CTX.resetear(); localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1');
    PRUEBAS.igual(notifOfrecerSiCorresponde(), true, 'DISCRIMINADOR · con perfil completo sí');
    PRUEBAS.igual(notifOfrecerSiCorresponde(), false, 'y no dos veces (idempotente por id)');
    notifLocalQuitar('avisos_ofrecer'); notifMarcarOfrecido();
    PRUEBAS.igual(notifOfrecerSiCorresponde(), false, 'ya ofrecido: nunca más');
  });
  await p194Cliente('denied', async est => {
    CTX.resetear(); localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1');
    PRUEBAS.igual(notifOfrecerSiCorresponde(), false, 'bloqueado en el navegador: no ofrece');
    avisosPintar();
    PRUEBAS.igual(document.getElementById('avisosLbl').textContent, t('avisos_ds_denied'), 'Ajustes: «Bloqueados en el navegador»');
    PRUEBAS.cierto(document.getElementById('avisosNota').textContent.indexOf(t('avisos_nota_denied')) === 0, 'con la nota de cómo destrabarlo');
    PRUEBAS.igual(document.getElementById('avisosOpts').innerHTML, '', 'y sin botones (el navegador no deja volver a preguntar)');
    const ok = await notifActivar(null);
    PRUEBAS.igual([ok, est.suscripciones()], [false, 0], 'notifActivar con el permiso bloqueado: no suscribe');
  });
  /* sin señal: el navegador no puede suscribir → la tarjeta se QUEDA para reintentar y Ajustes sigue en «Desactivados» */
  await p194Cliente('default', async est => {
    CTX.resetear(); localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1');
    est.fallarSuscribir(true);
    notifOfrecerSiCorresponde();
    const ok = await notifActivar(null);
    PRUEBAS.igual([ok, est.permisoPedido(), pushActivoLocal()], [false, 1, false], '🔴 suscribir falló: no queda «activado»');
    PRUEBAS.cierto(notifLocalItems().some(x => x.id === 'avisos_ofrecer') && !localStorage.getItem('silva_fatiga_avisos_ofrecido_v1'), '🔴 la tarjeta se queda y no se marca «ofrecido»: se puede reintentar (verificador)');
    avisosPintar();
    PRUEBAS.igual(document.getElementById('avisosLbl').textContent, t('avisos_ds_default'), 'Ajustes sigue en «Desactivados» aunque el permiso ya esté concedido');
    est.fallarSuscribir(false);
    PRUEBAS.igual(await notifActivar(null), true, 'DISCRIMINADOR · con red, el reintento activa (sin volver a pedir el permiso: ' + est.permisoPedido() + ' pedido)');
    /* «Entendido» sobre la tarjeta = no, gracias: se va y no vuelve */
    localStorage.removeItem('silva_fatiga_avisos_ofrecido_v1'); pushMarcarActivo(false); notifOfrecerSiCorresponde();
    notifLocalHecha('avisos_ofrecer');
    PRUEBAS.cierto(!notifLocalItems().some(x => x.id === 'avisos_ofrecer') && !!localStorage.getItem('silva_fatiga_avisos_ofrecido_v1'), '«Entendido» quita la tarjeta y marca ofrecido');
    /* cerrar sesión: la fila del servidor se borra con keepalive y lo local se apaga */
    pushMarcarActivo(true); localStorage.setItem('silva_fatiga_push_endpoint_v1', 'https://fcm.googleapis.com/fcm/send/cliente-194');
    est.fetches.length = 0;
    pushCerrarSesion();
    const f = est.fetches.find(x => /suscripcion_borrar/.test(String(x.o && x.o.body)));
    PRUEBAS.cierto(!!f && f.o.keepalive === true && JSON.parse(f.o.body).endpoint === 'https://fcm.googleapis.com/fcm/send/cliente-194', '🔴 cerrar sesión manda suscripcion_borrar con keepalive (sobrevive al reload)');
    PRUEBAS.cierto(sesionClavesBorrar().indexOf('silva_fatiga_push_activo_v1') >= 0 && sesionClavesBorrar().indexOf('silva_fatiga_avisos_ofrecido_v1') >= 0, 'y las claves de avisos están en la lista que cerrar sesión borra (teléfono compartido)');
  });
});
