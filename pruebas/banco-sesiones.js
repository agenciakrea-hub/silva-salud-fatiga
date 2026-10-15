/* ══════════════════════════════════════════════════════════════════════════════════════════════
   BANCO DE SESIONES · la app VIEJA y la NUEVA contra el `.gs` VIEJO y el NUEVO       (P301, 2026-10-14)

       node pruebas/banco-sesiones.js servir              # levanta el banco y lo deja quieto
       node pruebas/banco-sesiones.js correr [opciones]   # corre el escenario entero, solo

   PARA QUÉ. `P303` tiene que probar las sesiones recordadas EMITIDAS ANTES del arreglo de `P301` —las que
   hoy tienen los teléfonos— con la app y el `.gs` nuevos, sin entrar con ninguna cuenta de producción.
   En producción esas sesiones ya no se pueden fabricar después de publicar. Acá sí: se emiten con la app
   de antes (`git show 130bb1a:…`) contra el `.gs` de antes (la copia guardada en `endpoint/respaldos/`),
   y se pasa a los nuevos SIN PERDER EL ESTADO:
     · el libro del emulador (con `Sesiones` adentro) vive en ESTE proceso, y `GS.cargarGs` carga el otro
       `.gs` sobre el mismo entorno;
     · cada «teléfono» es un PUERTO (= un origen): su `localStorage`, su `dispositivoId` y su service
       worker sobreviven al cambio de versión, porque las dos versiones se sirven desde el mismo origen.
   Y como cada teléfono tiene su service worker de verdad, también mide lo que `P301` dejó abierto: la
   PRIMERA APERTURA después de publicar, cuando el worker viejo sirve la app vieja desde su caché.

   ⚠️ NADA SALE DE ESTA MÁQUINA. A la app se le inyecta, antes de su primer script, un envoltorio de
   `fetch` que manda lo que iba a `SHEETS_DASHBOARD_URL` a este emulador y CORTA cualquier otro pedido a
   `script.google.com` (lo cuenta). Las cuentas son de prueba y existen sólo en el `Accesos` de este
   emulador. El envoltorio existe sólo en lo que sirve este banco: la app publicada no lo tiene.

   ⚠️ EL `.gs` NO SE COPIA AL REPO (es público y el `.gs` trae claves). Se lee de donde está, en memoria.

   ⚠️ NO REEMPLAZA A LA SUITE. Mide un recorrido de punta a punta en un Chrome sin cabeza; los contratos
   finos siguen en `pruebas/casos/`.

   Opciones de `correr`:
     --latencia-gs MS    lo que tarda el endpoint en contestar (Apps Script: 2,5–5 s medidos). Def. 2500
     --latencia-app MS   lo que tarda el hosting en dar `index.html`/`sw.js` (GitHub Pages). Def. 80
     --app-vieja REF     el commit de la app de antes. Def. 130bb1a (la 7.48 publicada al empezar P301)
     --gs-viejo RUTA     el `.gs` de antes. Def. endpoint/respaldos/Código.GS-2026-10-12.1.publicado.antes-de-P301.js
     --gs-nuevo RUTA     el `.gs` nuevo. Def. endpoint/Código.js
     --salida RUTA       además del resumen en pantalla, el informe en JSON
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
'use strict';
global.window = global;   // el emulador se escribió para el navegador
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const { execFileSync, spawn } = require('child_process');

const PR = __dirname + path.sep;
const REPO = path.resolve(PR, '..');
const RAIZ = path.resolve(REPO, '..');

function opciones(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].indexOf('--') === 0) { o[argv[i].slice(2)] = argv[i + 1]; i++; }
    else o._.push(argv[i]);
  }
  return o;
}
const OPC = opciones(process.argv.slice(2));
const MODO = OPC._[0] || 'servir';
const GS_RUTA = {
  viejo: OPC['gs-viejo'] || path.join(RAIZ, 'endpoint', 'respaldos', 'Código.GS-2026-10-12.1.publicado.antes-de-P301.js'),
  nuevo: OPC['gs-nuevo'] || path.join(RAIZ, 'endpoint', 'Código.js')
};
const APP_VIEJA = OPC['app-vieja'] || '130bb1a';
const PUERTO_GS = 8940;
/* Un teléfono por rol de la MISMA empresa: el servidor guarda UNA sesión por cuenta y dispositivo
   (`sesEmitir`), así que dos «recordar» en el mismo teléfono se pisarían (lo arregla P320). */
const TELEFONOS = [
  { id: 'sup-helitec',  puerto: 8941, como: 'HELITEC (tres contraseñas) por Supervisor',      pestana: 'sup',  usuario: 'helitec', pass: 'sup-banco', ranura: 'silva_dash_creds_v1',      debe: 'supervisor' },
  { id: 'med-helitec',  puerto: 8942, como: 'HELITEC por Servicio médico',                    pestana: 'med',  usuario: 'helitec', pass: 'med-banco', ranura: 'silva_dash_creds_med_v1',  debe: 'medico' },
  { id: 'hseq-helitec', puerto: 8943, como: 'HELITEC por Dirección',                          pestana: 'hseq', usuario: 'helitec', pass: 'dir-banco', ranura: 'silva_dash_creds_hseq_v1', debe: 'hseq' },
  { id: 'comb-sup',     puerto: 8944, como: 'SILVA (combinada) por Supervisor · el caso F021', pestana: 'sup',  usuario: 'silva',   pass: 'sil-banco', ranura: 'silva_dash_creds_v1',      debe: 'supervisor' },
  { id: 'comb-med',     puerto: 8945, como: 'SILVA (combinada) por Servicio médico',          pestana: 'med',  usuario: 'silva',   pass: 'sil-banco', ranura: 'silva_dash_creds_med_v1',  debe: 'medico' },
  { id: 'admin',        puerto: 8946, como: 'el administrador (`*`)',                          pestana: 'adm',  usuario: '*',       pass: 'adm-banco#', ranura: 'silva_dash_creds_adm_v1', debe: 'medico' },
  /* El caso que P301 cambia A PROPÓSITO y avisa: entre S4 y P177, «recordar» guardaba SIEMPRE en la
     ranura de supervisor (`dashSaveCreds` de la 6.42). Una combinada que entró por Servicio médico quedó
     con su token ahí, y desde P301 esa ranura pide Supervisor. Se emite con ESA app (`0db0353^`), se
     actualiza a la de antes de P301, y recién ahí se publica. */
  { id: 'comb-med-642', puerto: 8947, como: 'SILVA (combinada) por Servicio médico, recordado con la 6.42 (cae en la ranura de supervisor)',
    pestana: 'med', usuario: 'silva', pass: 'sil-banco', ranura: 'silva_dash_creds_v1', debe: 'supervisor', emiteCon: '64006cb' }
];

/* ── El emulador, con estado que sobrevive al cambio de `.gs` ──────────────────────────────────── */
vm.runInThisContext(fs.readFileSync(PR + 'emulador-gs.js', 'utf8'), { filename: 'emulador-gs.js' });
const HOY = new Date().toISOString().substring(0, 10);
function filaRespuesta(persona, dep, empresa, kss, comentario) {
  const f = new Array(90).fill('');
  f[0] = HOY + ' 08:00:00'; f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = HOY; f[86] = kss;
  if (comentario) f[85] = comentario;
  return f;
}
function hojasDelBanco() {
  return {
    'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
      'Rol (supervisor ve solo su empresa, admin ve todas)',
      'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
      'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'],
      ['*',       'adm-banco#', 'admin',      '',                             '',          ''],
      ['helitec', 'sup-banco',  'supervisor', 'Consorcio HELITEC, Helitec',   'med-banco', 'dir-banco'],
      ['silva',   'sil-banco',  'supervisor', 'Aeroambulancias Silva, Silva', '',          'dir-silva']],
    /* Un comentario clínico por empresa: es lo que NO tiene que llegarle a quien no es servicio médico.
       ⚠️ no puede empezar con «comentario» (`parseComentarios` descarta esas respuestas de relleno). */
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      filaRespuesta('Ana Suárez',  'Operaciones', 'Consorcio HELITEC',     7, 'Ana duerme mal'),
      filaRespuesta('Pedro Gómez', 'Vuelo',       'Aeroambulancias Silva', 5, 'Pedro duerme mal por los turnos')],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono', 'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC',     'Ana Suárez',  'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3'],
      ['Aeroambulancias Silva', 'Pedro Gómez', 'V-33333', 'Vuelo',       'Piloto', 'M', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
}
const ESTADO = { gs: 'viejo', gsVersion: '', latGs: 0, latApp: 0, appDe: {}, pedidos: [] };
const ENV = GS.crearEntorno(hojasDelBanco());
let API = null;
function cargarGs(cual) {
  const fuente = fs.readFileSync(GS_RUTA[cual], 'utf8');
  API = GS.cargarGs(fuente, ENV, ['doPost', 'doGet']);
  ESTADO.gs = cual;
  ESTADO.gsVersion = (fuente.match(/var GS_VERSION = "([^"]+)"/) || [])[1] || '?';
}

/* ── La app, de git o del árbol de trabajo ─────────────────────────────────────────────────────── */
const _git = {};
function archivoDeLaApp(version, rel) {
  if (version === 'nueva') {
    const p = path.join(REPO, rel);
    if (!p.startsWith(REPO + path.sep) || !fs.existsSync(p) || !fs.statSync(p).isFile()) return null;
    return fs.readFileSync(p);
  }
  const k = version + ':' + rel;
  if (!(k in _git)) {
    try { _git[k] = execFileSync('git', ['-C', REPO, 'show', version + ':' + rel], { maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { _git[k] = null; }
  }
  return _git[k];
}
/* El envoltorio que se inyecta ANTES del primer script de la app. Determinista a propósito: si cambiara
   entre dos pedidos de la misma versión, el worker vería «otra versión» donde no la hay. */
function envoltorio(dashUrl) {
  return '<script>/* BANCO P301 · lo inyecta pruebas/banco-sesiones.js; la app publicada no lo tiene */\n' +
  '(function(){var DASH=' + JSON.stringify(dashUrl) + ',EMU="http://127.0.0.1:' + PUERTO_GS + '/exec";\n' +
  'function log(ev){try{var a=JSON.parse(sessionStorage.getItem("__banco")||"[]");ev.t=Date.now();a.push(ev);sessionStorage.setItem("__banco",JSON.stringify(a));}catch(e){}}\n' +
  'window.__bancoLog=log;var v0=null;\n' +
  'log({ev:"carga",controlada:!!(navigator.serviceWorker&&navigator.serviceWorker.controller)});\n' +
  'function envolver(){try{if(window.onDashData&&!window.onDashData.__banco){var o=window.onDashData;var w=function(d,l,p,vista){var v=null;try{v=APP_VERSION;}catch(e){}log({ev:"onDashData",version:v,vista:vista,dvista:d&&d.vista,comentarios:((d&&d.comentarios)||[]).length});return o.apply(this,arguments);};w.__banco=1;window.onDashData=w;}}catch(e){}}\n' +
  'var f0=window.fetch;window.__bancoCortados=0;\n' +
  'window.fetch=function(u,o){var url=String(u&&u.url?u.url:u);\n' +
  ' if(url.indexOf(DASH)===0){var c={};try{c=JSON.parse(String((o&&o.body)||"{}"))||{};}catch(e){}var q={};try{new URL(url).searchParams.forEach(function(v,k){q[k]=v;});}catch(e){}\n' +
  '  var acc=c.action||q.action||"";var ped=("pedida" in c)?c.pedida:(("pedida" in q)?q.pedida:"(ausente)");var v=null;try{v=APP_VERSION;}catch(e){}\n' +
  '  log({ev:"pedido",version:v,accion:acc,pedida:ped});\n' +
  '  return f0.call(window,EMU+url.slice(DASH.length),o).then(function(r){envolver();try{r.clone().json().then(function(d){log({ev:"respuesta",version:v,accion:acc,ok:!!(d&&d.ok),vista:d&&d.vista,comentarios:((d&&d.comentarios)||[]).length});});}catch(e){}return r;});}\n' +
  ' if(/script\\.google\\.com/.test(url)){window.__bancoCortados++;log({ev:"cortado",url:url.slice(0,60)});return new Promise(function(){});}\n' +
  ' return f0.apply(window,arguments);};\n' +
  'if(navigator.serviceWorker){navigator.serviceWorker.addEventListener("message",function(e){var d=e.data||{};var oc=null,en=null;try{oc=appOcupada();en=enviosEnVuelo();}catch(x){}log({ev:"sw-mensaje",tipo:d.tipo,ocupada:oc,enVuelo:en});});\n' +
  ' navigator.serviceWorker.addEventListener("controllerchange",function(){log({ev:"controllerchange"});});}\n' +
  'addEventListener("DOMContentLoaded",function(){var v=null;try{v=APP_VERSION;}catch(e){}log({ev:"app",version:v});envolver();});\n' +
  'addEventListener("pagehide",function(){log({ev:"pagehide"});});})();</script>\n';
}
function indexConEnvoltorio(buf) {
  const html = buf.toString('utf8');
  const dash = (html.match(/const SHEETS_DASHBOARD_URL = '([^']+)'/) || [])[1];
  if (!dash) throw new Error('no encuentro SHEETS_DASHBOARD_URL en el index: sin eso no hay forma de desviar los pedidos');
  const i = html.indexOf('<head>');
  if (i < 0) throw new Error('el index no tiene <head>');
  return Buffer.from(html.slice(0, i + 6) + '\n' + envoltorio(dash) + html.slice(i + 6), 'utf8');
}
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
                '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.md': 'text/plain; charset=utf-8' };
const dormir = ms => new Promise(r => setTimeout(r, ms));

function servirTelefono(tel) {
  return http.createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      if (rel === '' ) rel = 'index.html';
      if (rel.indexOf('..') >= 0) { res.writeHead(400); res.end(); return; }
      const version = ESTADO.appDe[tel.puerto] || APP_VIEJA;
      let cuerpo = archivoDeLaApp(version, rel);
      if (!cuerpo) { res.writeHead(404); res.end(); return; }
      if (rel === 'index.html' || rel === 'sw.js') await dormir(ESTADO.latApp);
      if (rel === 'index.html') cuerpo = indexConEnvoltorio(cuerpo);
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(cuerpo);
    } catch (e) { res.writeHead(500); res.end(String(e && e.message || e)); }
  });
}

function servirEmulador() {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' };
    const jsonOut = (o, st) => { res.writeHead(st || 200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors)); res.end(JSON.stringify(o)); };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    let cuerpo = '';
    await new Promise(r => { req.on('data', d => { cuerpo += d; }); req.on('end', r); });
    const q = {}; u.searchParams.forEach((v, k) => { q[k] = v; });
    try {
      if (u.pathname === '/exec') {
        let p = {}; try { p = cuerpo ? JSON.parse(cuerpo) : {}; } catch (e) {}
        const accion = p.action || q.action || '';
        await dormir(ESTADO.latGs);
        const salida = req.method === 'POST'
          ? API.doPost({ postData: { contents: cuerpo, type: 'text/plain' }, parameter: q })
          : API.doGet({ parameter: q });
        const txt = salida.getContent();
        let d = null; try { d = JSON.parse(txt); } catch (e) {}
        ESTADO.pedidos.push({ t: Date.now(), origen: String(req.headers.origin || ''), gs: ESTADO.gsVersion, accion: accion,
          usuario: String(p.usuario || q.usuario || ''), pedida: ('pedida' in p) ? p.pedida : '(ausente)',
          conToken: /^sst_/.test(String(p.pass || q.pass || '')), ok: !!(d && d.ok), vista: d && d.vista,
          comentarios: d && Array.isArray(d.comentarios) ? d.comentarios.length : null });
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors));
        res.end(txt);
        return;
      }
      if (u.pathname === '/__banco/estado') return jsonOut({ gs: ESTADO.gs, gsVersion: ESTADO.gsVersion, latGs: ESTADO.latGs, latApp: ESTADO.latApp, appDe: ESTADO.appDe, appVieja: APP_VIEJA, pedidos: ESTADO.pedidos.length });
      if (u.pathname === '/__banco/gs') { cargarGs(q.v === 'nuevo' ? 'nuevo' : 'viejo'); return jsonOut({ ok: true, gs: ESTADO.gs, gsVersion: ESTADO.gsVersion }); }
      if (u.pathname === '/__banco/app') { TELEFONOS.forEach(t => { if (!q.puerto || String(t.puerto) === q.puerto) ESTADO.appDe[t.puerto] = q.v || APP_VIEJA; }); return jsonOut({ ok: true, appDe: ESTADO.appDe }); }
      if (u.pathname === '/__banco/latencia') { if (q.gs != null) ESTADO.latGs = +q.gs || 0; if (q.app != null) ESTADO.latApp = +q.app || 0; return jsonOut({ ok: true, latGs: ESTADO.latGs, latApp: ESTADO.latApp }); }
      if (u.pathname === '/__banco/pedidos') return jsonOut(ESTADO.pedidos.slice(-200));
      if (u.pathname === '/__banco/sesiones') {
        const sh = ENV.__libro.getSheetByName('Sesiones');
        const v = sh ? sh.getDataRange().getValues() : [];
        /* el hash del secreto no se muestra: con él no se entra, pero tampoco hace falta para mirar */
        return jsonOut(v.map((f, i) => i === 0 ? f : f.map((c, j) => j === 1 ? '(hash)' : c)));
      }
      jsonOut({ ok: false, error: 'ruta desconocida' }, 404);
    } catch (e) { jsonOut({ ok: false, error: String(e && e.message || e) }, 500); }
  });
}

const _servidores = [];
async function levantar() {
  cargarGs('viejo');
  TELEFONOS.forEach(t => { ESTADO.appDe[t.puerto] = t.emiteCon || APP_VIEJA; });
  const escuchar = (srv, p) => new Promise((ok, mal) => { srv.once('error', mal); srv.listen(p, '127.0.0.1', ok); });
  const e = servirEmulador(); await escuchar(e, PUERTO_GS); _servidores.push(e);
  for (const t of TELEFONOS) { const s = servirTelefono(t); await escuchar(s, t.puerto); _servidores.push(s); }
}

/* ── El escenario, en un Chrome sin cabeza manejado por CDP (sin librerías) ────────────────────── */
async function chrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-sesiones-'));
  const bin = OPC.chrome || '/usr/bin/google-chrome';
  const ch = spawn(bin, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir, '--no-first-run',
    '--no-default-browser-check', '--disable-gpu', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' });
  const f = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(f); i++) await dormir(100);
  if (!fs.existsSync(f)) throw new Error('Chrome no abrió el puerto de depuración');
  const [puerto, ruta] = fs.readFileSync(f, 'utf8').trim().split('\n');
  const ws = new WebSocket('ws://127.0.0.1:' + puerto + ruta);
  await new Promise((ok, mal) => { ws.addEventListener('open', ok); ws.addEventListener('error', mal); });
  let n = 0; const pend = {};
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } });
  const cdp = (method, params, sessionId) => new Promise(ok => { const i = ++n; pend[i] = ok; ws.send(JSON.stringify({ id: i, method: method, params: params || {}, sessionId: sessionId })); });
  return { cdp: cdp, cerrar: () => { try { ws.close(); } catch (e) {} try { ch.kill(); } catch (e) {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} } };
}
/* ⚠️ UNA PESTAÑA POR APERTURA, y se cierra al terminar. La primera versión dejaba abiertas las seis: la
   app vieja de un teléfono que todavía no tocaba seguía viva, un `visibilitychange` le disparaba
   `swReg.update()`, el worker nuevo entraba en segundo plano y esa «primera apertura» ya no era la de la
   app vieja. Medido: con el hosting a 600 ms, tres de los seis teléfonos llegaban a su turno actualizados.
   Una pestaña nueva es además lo que pasa de verdad al tocar el ícono de la PWA. */
async function abrirTelefono(c, tel) {
  const t = await c.cdp('Target.createTarget', { url: 'about:blank' });
  const a = await c.cdp('Target.attachToTarget', { targetId: t.result.targetId, flatten: true });
  return { tel: tel, sid: a.result.sessionId, targetId: t.result.targetId, url: 'http://127.0.0.1:' + tel.puerto + '/' };
}
async function cerrarTelefono(c, f) { try { await c.cdp('Target.closeTarget', { targetId: f.targetId }); } catch (e) {} }
async function enPestanaNueva(c, tel, fn) {
  const f = await abrirTelefono(c, tel);
  try { return await fn(f); } finally { await cerrarTelefono(c, f); }
}
async function evaluar(c, f, expr, tope) {
  const r = await c.cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: tope || 30000 }, f.sid);
  if (r.error) throw new Error(r.error.message);
  if (r.result && r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text);
  return r.result && r.result.result ? r.result.result.value : undefined;
}
async function esperar(c, f, expr, tope) {
  const t0 = Date.now();
  for (;;) {
    try { const v = await evaluar(c, f, expr, 5000); if (v) return v; } catch (e) { /* contexto en cambio: navegación o recarga */ }
    if (Date.now() - t0 > (tope || 20000)) return null;
    await dormir(150);
  }
}
/* «Abrir la app» = una navegación nueva a la raíz, como tocar el ícono de la PWA. */
async function abrirApp(c, f) {
  /* una marca en el documento de ANTES: sin ella, la espera podía contestar con la página vieja en el
     instante entre el `navigate` y el cambio de documento */
  await evaluar(c, f, 'window.__bancoViejo = true').catch(() => {});
  await c.cdp('Page.navigate', { url: f.url }, f.sid);
  return esperar(c, f, '!window.__bancoViejo && document.readyState === "complete" && typeof APP_VERSION !== "undefined" ? APP_VERSION : null', 20000);
}
const LOG = 'JSON.parse(sessionStorage.getItem("__banco") || "[]")';

/* Entrar con la contraseña de PRUEBA y tocar «Sí, recordar», por las funciones de la app (el camino real). */
function exprEntrarYRecordar(tel) {
  if (tel.pestana === 'adm') {
    return '(async () => { splashAbrirPortal(); admGateModo(); document.getElementById("pAdminPass").value = ' + JSON.stringify(tel.pass) + ';' +
      ' portalLoginAdmin(document.querySelector("#adminBox .save-btn"));' +
      ' for (let i = 0; i < 200 && !(DASH && DASH.rol === "admin"); i++) await new Promise(r => setTimeout(r, 50));' +
      ' document.getElementById("pAdminPass").value = "";' +
      ' const c = JSON.parse(localStorage.getItem(' + JSON.stringify(tel.ranura) + ') || "null");' +
      ' const out = { vista: DASH && DASH.vista, rol: DASH && DASH.rol, token: !!(c && c.token) }; closePortal(true); return out; })()';
  }
  return '(async () => { splashPortal(); portalMode(' + JSON.stringify(tel.pestana) + ');' +
    ' document.getElementById("pEmpresa").value = ' + JSON.stringify(tel.usuario) + '; document.getElementById("pPass").value = ' + JSON.stringify(tel.pass) + ';' +
    ' portalLoginSupervisor(document.querySelector("#portalSup .save-btn"));' +
    ' for (let i = 0; i < 300 && !(DASH && DASH.vista); i++) await new Promise(r => setTimeout(r, 50));' +
    ' const vista = DASH && DASH.vista;' +
    ' dashSaveCreds(document.querySelector("#dashRemember .dr-yes"));' +
    ' let c = null; for (let i = 0; i < 200; i++) { c = JSON.parse(localStorage.getItem(' + JSON.stringify(tel.ranura) + ') || "null"); if (c && c.token) break; await new Promise(r => setTimeout(r, 50)); }' +
    ' document.getElementById("pPass").value = ""; closePortal(true);' +
    ' return { vista: vista, token: !!(c && c.token) }; })()';
}
/* Volver a entrar: el arranque ya lo hace solo para supervisor y servicio médico (sin perfil); Dirección
   elige su pestaña y toca «Entrar» sin contraseña (P181), y el administrador toca «Administrador». */
function exprReentrar(tel) {
  if (tel.pestana === 'adm') return 'splashAdmin(), true';
  if (tel.pestana === 'hseq') return 'splashPortal(), portalMode("hseq"), portalLoginSupervisor(document.querySelector("#portalSup .save-btn")), true';
  return 'true';   // lo hizo el arranque
}
async function apertura(c, f, opciones) {
  await evaluar(c, f, 'sessionStorage.removeItem("__banco"), true').catch(() => {});
  const v = await abrirApp(c, f);
  if (!v) return { error: 'la app no cargó' };
  if (opciones && opciones.esperarVersion) {
    /* la primera apertura después de publicar: se espera a que la app NUEVA haya abierto un panel, o al tope */
    await esperar(c, f, LOG + '.some(e => e.ev === "app" && e.version === ' + JSON.stringify(opciones.esperarVersion) + ')', 25000);
  }
  await esperar(c, f, 'document.readyState === "complete" && typeof APP_VERSION !== "undefined"', 10000);
  await evaluar(c, f, exprReentrar(f.tel)).catch(() => {});
  const vista = await esperar(c, f, '(typeof DASH !== "undefined" && DASH && DASH.vista) ? { vista: DASH.vista, rol: DASH.rol, version: APP_VERSION } : null', 15000);
  await dormir(300);
  const log = await evaluar(c, f, LOG).catch(() => []);
  return { vista: vista, log: log };
}
function resumirLog(log) {
  return (log || []).map(e => {
    if (e.ev === 'carga') return 'carga' + (e.controlada ? '(sw)' : '');
    if (e.ev === 'app') return 'app ' + e.version;
    if (e.ev === 'pedido') return 'pide ' + e.accion + (e.accion === 'supervisor' ? ' pedida=' + JSON.stringify(e.pedida) : '');
    if (e.ev === 'respuesta') return 'llega ' + e.accion + (e.accion === 'supervisor' ? ' vista=' + e.vista + ' comentarios=' + e.comentarios : '');
    if (e.ev === 'onDashData') return 'PINTA ' + e.vista + ' (comentarios=' + e.comentarios + ', app ' + e.version + ')';
    if (e.ev === 'sw-mensaje') return 'sw:' + e.tipo + (e.tipo === 'version-nueva' ? ' (ocupada=' + e.ocupada + ', enVuelo=' + e.enVuelo + ')' : '');
    if (e.ev === 'controllerchange') return 'controllerchange';
    if (e.ev === 'pagehide') return 'RECARGA';
    if (e.ev === 'cortado') return 'cortado ' + e.url;
    return e.ev;
  }).filter(x => !/^(pide|llega) (listas|version|tareas_mias|niveles|reportes|opiniones|casos_odoo|ausencias|gestiones|bitacora|nomina_listar|departamentos)/.test(x));
}

async function correr() {
  ESTADO.latGs = +(OPC['latencia-gs'] != null ? OPC['latencia-gs'] : 2500);
  ESTADO.latApp = +(OPC['latencia-app'] != null ? OPC['latencia-app'] : 80);
  await levantar();
  const c = await chrome();
  const informe = { cuando: new Date().toISOString(), appVieja: APP_VIEJA, gsViejo: path.basename(GS_RUTA.viejo), gsNuevo: path.basename(GS_RUTA.nuevo),
                    latGs: ESTADO.latGs, latApp: ESTADO.latApp, telefonos: [] };
  try {
    /* 1 · ANTES: app y `.gs` viejos. Se emite la sesión por el camino real y se vuelve a abrir. */
    const latGs = ESTADO.latGs; ESTADO.latGs = 0;   // emitir rápido; la latencia importa en la apertura
    for (const tel of TELEFONOS) {
      const r = { id: tel.id, como: tel.como, debe: tel.debe, emiteCon: tel.emiteCon || null };
      await enPestanaNueva(c, tel, async f => {
        r.appInstalada = await abrirApp(c, f);
        r.swListo = !!(await esperar(c, f, 'navigator.serviceWorker && navigator.serviceWorker.controller ? true : null', 15000));
        /* ⚠️ Y SE VUELVE A ABRIR antes de entrar: hasta P191 el `controllerchange` recargaba la página sin
           condición (la 6.42 lo hace), y la emisión caía en el medio de esa recarga («splashPortal is not
           defined»). Una segunda apertura arranca ya controlada por el worker y no recarga. */
        await dormir(1500);
        await abrirApp(c, f);
        await esperar(c, f, 'typeof splashPortal === "function" && typeof dashSaveCreds === "function"', 10000);
        r.emision = await evaluar(c, f, exprEntrarYRecordar(f.tel), 40000).catch(e => ({ error: String(e.message || e) }));
      });
      if (tel.emiteCon) {
        /* emitida con una app más vieja: el teléfono se actualiza a la de antes de P301 como lo haría solo */
        ESTADO.appDe[tel.puerto] = APP_VIEJA;
        await dormir(+(OPC['pausa-publicar'] || 8000));
        const vVieja = (archivoDeLaApp(APP_VIEJA, 'index.html').toString('utf8').match(/const APP_VERSION = '([0-9.]+)'/) || [])[1];
        const u = await enPestanaNueva(c, tel, f => apertura(c, f, { esperarVersion: vVieja }));
        r.actualizacion = { aVersion: vVieja, vista: u.vista, secuencia: resumirLog(u.log) };
      }
      const a = await enPestanaNueva(c, tel, f => apertura(c, f));
      r.antes = { gs: ESTADO.gsVersion, vista: a.vista, secuencia: resumirLog(a.log) };
      informe.telefonos.push(r);
    }
    ESTADO.latGs = latGs;

    /* 2 · VENTANA: el endpoint ya publicado (R10: primero el `.gs`) y la app todavía vieja en el hosting. */
    cargarGs('nuevo');
    for (const tel of TELEFONOS) {
      const a = await enPestanaNueva(c, tel, f => apertura(c, f));
      informe.telefonos.find(x => x.id === tel.id).ventana = { gs: ESTADO.gsVersion, vista: a.vista, secuencia: resumirLog(a.log) };
    }

    /* 3 · LA PRIMERA APERTURA después de publicar la app: el worker viejo sirve la vieja desde su caché.
       ⚠️ ANTES, UNA PAUSA. La apertura anterior deja encolada en el navegador la comprobación de `sw.js`
       (`reg.update()` al cargar, más la del propio navegador al navegar), y puede correr DESPUÉS de cerrar
       la pestaña: si el hosting ya sirve la versión nueva, el worker nuevo entra sin ninguna página y esa
       «primera apertura» ya no corre la app vieja. Medido: sin la pausa, los dos últimos teléfonos llegaban
       actualizados. En la realidad la publicación llega horas después de la última apertura. */
    await dormir(+(OPC['pausa-publicar'] || 8000));
    TELEFONOS.forEach(t => { ESTADO.appDe[t.puerto] = 'nueva'; });
    const vNueva = (archivoDeLaApp('nueva', 'index.html').toString('utf8').match(/const APP_VERSION = '([0-9.]+)'/) || [])[1];
    for (const tel of TELEFONOS) {
      const a = await enPestanaNueva(c, tel, f => apertura(c, f, { esperarVersion: vNueva }));
      const viejas = (a.log || []).filter(e => e.version && e.version !== vNueva);
      informe.telefonos.find(x => x.id === tel.id).primera = { vista: a.vista, secuencia: resumirLog(a.log),
        corrioLaVieja: (a.log || []).some(e => e.ev === 'app' && e.version !== vNueva),
        aLaViejaLeLlego: viejas.filter(e => e.ev === 'respuesta' && e.accion === 'supervisor').map(e => ({ vista: e.vista, comentarios: e.comentarios })),
        laViejaPinto: viejas.filter(e => e.ev === 'onDashData').map(e => ({ vista: e.vista, comentarios: e.comentarios })) };
    }

    /* 4 · LA SEGUNDA APERTURA: ya corre la app nueva desde el caché. */
    for (const tel of TELEFONOS) {
      const a = await enPestanaNueva(c, tel, f => apertura(c, f));
      informe.telefonos.find(x => x.id === tel.id).segunda = { vista: a.vista, secuencia: resumirLog(a.log) };
    }
    informe.sesiones = (ENV.__libro.getSheetByName('Sesiones') || { getDataRange: () => ({ getValues: () => [] }) }).getDataRange().getValues().length - 1;
    informe.pedidosAlEndpoint = ESTADO.pedidos.length;
  } finally { c.cerrar(); _servidores.forEach(s => s.close()); }
  return informe;
}

function imprimir(inf) {
  const L = [];
  L.push('BANCO DE SESIONES · app ' + inf.appVieja + ' → árbol de trabajo · ' + inf.gsViejo + ' → ' + inf.gsNuevo);
  L.push('latencia del endpoint ' + inf.latGs + ' ms · del hosting ' + inf.latApp + ' ms · ' + inf.sesiones + ' sesiones en el libro · ' + inf.pedidosAlEndpoint + ' pedidos al emulador');
  inf.telefonos.forEach(t => {
    L.push('');
    L.push('■ ' + t.id + ' · ' + t.como + ' · debe abrir ' + t.debe);
    L.push('  emisión (app ' + (t.emiteCon || inf.appVieja) + ', .gs viejo): ' + JSON.stringify(t.emision) + (t.swListo ? '' : ' · ⚠️ sin service worker'));
    ['actualizacion', 'antes', 'ventana', 'primera', 'segunda'].forEach(k => {
      const x = t[k]; if (!x) return;
      const v = x.vista ? (x.vista.vista + ' (app ' + x.vista.version + ')') : '—';
      const ok = x.vista && x.vista.vista === t.debe ? '✔' : '✘';
      L.push('  ' + k.padEnd(8) + ' ' + ok + ' abre ' + v + (x.gs ? ' · gs ' + x.gs : ''));
      L.push('           ' + x.secuencia.join(' → '));
      if (k === 'primera') L.push('           corrió la app vieja: ' + (x.corrioLaVieja ? 'sí' : 'NO (la apertura no midió el caso)') +
        ' · le llegó: ' + JSON.stringify(x.aLaViejaLeLlego) + ' · pintó: ' + JSON.stringify(x.laViejaPinto));
    });
  });
  return L.join('\n');
}

if (require.main === module) {
  if (MODO === 'servir') {
    levantar().then(() => {
      console.log('Banco de sesiones arriba. Emulador: http://127.0.0.1:' + PUERTO_GS + '/exec (estado: /__banco/estado)');
      TELEFONOS.forEach(t => console.log('  ' + t.id.padEnd(13) + ' http://127.0.0.1:' + t.puerto + '/  · ' + t.como));
      console.log('Cambiar: /__banco/gs?v=nuevo · /__banco/app?v=nueva[&puerto=N] · /__banco/latencia?gs=MS&app=MS');
    }).catch(e => { console.error(e); process.exit(1); });
  } else if (MODO === 'correr') {
    correr().then(inf => {
      console.log(imprimir(inf));
      if (OPC.salida) fs.writeFileSync(OPC.salida, JSON.stringify(inf, null, 1));
      process.exit(0);
    }).catch(e => { console.error('El banco no pudo correr:', e); process.exit(1); });
  } else { console.error('modo desconocido: ' + MODO + ' (servir | correr)'); process.exit(2); }
}
module.exports = { levantar: levantar, cargarGs: cargarGs, ESTADO: ESTADO, ENV: ENV, TELEFONOS: TELEFONOS };
