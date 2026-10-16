/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA PISTA «IDIOMA» DEL SPLASH Y LA CREDENCIAL DEL PIE, MEDIDAS CONTRA EL PÍXEL      (P302, 2026-10-16)

       node pruebas/medir-pista-idioma.js [opciones]

   PARA QUÉ. `F007` y `F034` se dieron por buenos dos veces con instrumentos que no veían lo que de
   verdad queda debajo de la pista: el caso de la suite y el auditor comparaban contra el navy del
   overlay (`backgroundColor`, o el primer color que devuelve `elementsFromPoint`), y debajo del texto
   hay otra cosa:
     · en el celular y la tableta, el círculo naranja `.ent-circulos--naranja-navy::after`, un
       pseudoelemento que `elementsFromPoint` no devuelve, y que además deriva con una animación;
     · en escritorio, la mitad derecha del degradé de `.splash-wrap`, que es un `background-image`.
   Esto mide lo que se pinta: un recorte de captura sobre la caja del TEXTO de la pista, en un Chrome
   sin cabeza aparte, con un contexto nuevo y aislado por medición (sin el `localStorage` de nadie y
   sin iniciar sesión). La suite no puede hacerlo: la pestaña de Claude está oculta y sus capturas se
   cuelgan (R11).

   CÓMO MIDE, POR CADA COMBINACIÓN (ancho × tema × movimiento × idioma) y por cada palabra:
     1. La geometría, en la página: la caja del texto de la pista (un `Range` sobre su texto), la del
        chip y la de su texto, el círculo `::after` (centro y radio desde `getComputedStyle(…,'::after')`,
        con su `transform`), y el degradé de `.splash-wrap`.
     2. Dos capturas del MISMO recorte, alineado a píxeles del dispositivo: una con la pista como está
        (A) y otra con su texto transparente (B). B es exactamente lo que queda debajo del texto, píxel
        por píxel. A sirve de guarda: si A y B no difieren, el recorte no tenía texto y no se midió nada.
     3. El contraste WCAG del color del texto contra CADA píxel de B. Se informa el peor, la moda y los
        colores que aparecen. Con un color de texto con alfa, se compone sobre cada fondo.
     4. Con movimiento permitido, el círculo deriva (`entDeriva`): se pausan sus animaciones y se mide
        en reposo, en la deriva máxima y a mitad de camino. Con movimiento reducido no hay animación.
     5. Con movimiento permitido la pista ALTERNA «Idioma» ⇄ «Language»: se espera cada palabra y se
        mide con las dos. Con movimiento reducido queda fija en la del idioma vigente, así que se mide
        «Idioma» con la app en español y «Language» con la app en inglés.
     6. La credencial del pie (`.splash-norma`) se mide igual (sólo el contraste: no tiene chip contra
        el cual centrarse), en cada posición de la deriva. Tenía el mismo defecto que la pista: desde
        900 px cae sobre la mitad `var(--card)` del degradé, con un token pensado para el navy. Si no
        entra en la vista, se la trae con `scrollIntoView` y se devuelve el desplazamiento.

   ⚠️ LO ÚNICO QUE SE PIDE AFUERA SON LECTURAS: el documento y los recursos del sitio público, y la hoja
   de fuentes de Google. Se cortan los pedidos a `script.google.com` (los cuenta: tienen que ser cero)
   y el service worker (se borra
   `navigator.serviceWorker` antes del primer script: sin eso, un worker recién instalado podría
   recargar la página a la versión publicada en medio de una medición con otro documento).

   ⚠️ EL TEMA Y EL IDIOMA ENTRAN POR EL CAMINO REAL: sus claves en el `localStorage` del contexto
   efímero, escritas antes del primer script, que es lo que la app lee al arrancar (`aplicarTema`,
   `idiomaActual`). El contexto se descarta al terminar cada medición.

   ⚠️ NO REEMPLAZA A LA SUITE: los contratos van en `pruebas/casos/` (`f001-f003-reportes-de-franco.js`
   y `p043-idioma-y-etiquetas.js`). Esto es la verdad del píxel contra la que esos casos se calibran.

   Opciones:
     --url URL          el sitio. Def. https://silvasaludfatiga.aeroambulanciasilva.com/
     --doc FUENTE       el documento que se sirve en ese origen: «publicado» (def., no se intercepta),
                        «trabajo» (el index.html de este árbol), una ruta a un archivo, o un commit de git
                        («130bb1a» = la 7.48, «5d03efe^» = la 7.43). Los demás recursos vienen del sitio.
     --anchos LISTA     def. 360,375,390,768,1366. También «WxH» o «WxH@dpr» (p. ej. 1920x1080@1)
     --temas LISTA      def. claro,oscuro
     --mov LISTA        def. reduce,no-preference
     --idiomas LISTA    def. es,en
     --texto N          nivel de letra 0..3 (90/100/118/135 %). Def.: sin elegir (100 %)
     --salida DIR       carpeta para el JSON y los recortes. Def.: una temporal
     --etiqueta TXT     prefijo de los archivos. Def.: sale de --doc
     --chrome RUTA      def. /usr/bin/google-chrome
   Sale 0 si todo se midió y todo pasó; 1 si alguna medición no pasó (contraste < 4,5 contra algún
   píxel del fondo, o el centro de la pista corrido más de 1 px); 3 si algo no se pudo medir.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { spawn, execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

function opciones(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].indexOf('--') === 0) { o[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
  return o;
}
const OPC = opciones(process.argv.slice(2));
const URL_APP = OPC.url || 'https://silvasaludfatiga.aeroambulanciasilva.com/';
const ORIGEN = new URL(URL_APP).origin;
const DOC = OPC.doc || 'publicado';
const ETIQ = (OPC.etiqueta || DOC).replace(/[^\w.-]+/g, '_');
const SALIDA = path.resolve(OPC.salida || fs.mkdtempSync(path.join(os.tmpdir(), 'pista-idioma-')));
const lista = (v, def) => String(v || def).split(',').map(s => s.trim()).filter(Boolean);
/* Los anchos de referencia (los mismos del verificador de la ronda 3): teléfonos con su densidad real,
   la tableta y una computadora con densidad 1, que es donde el texto de 10 px tiene menos píxeles. */
const VENTANA = { 320: [320, 800, 2, true], 360: [360, 800, 2, true], 375: [375, 812, 2, true],
  390: [390, 844, 2, true], 768: [768, 1024, 2, false], 1366: [1366, 768, 1, false], 1920: [1920, 1080, 1, false] };
function ventana(txt) {
  if (VENTANA[txt]) { const [w, h, dpr, mov] = VENTANA[txt]; return { w, h, dpr, movil: mov }; }
  const m = /^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/.exec(txt);
  if (!m) throw new Error('ancho no reconocido: ' + txt);
  const w = +m[1];
  return { w, h: +m[2], dpr: m[3] ? +m[3] : (w < 768 ? 2 : 1), movil: w < 768 };
}
const ANCHOS = lista(OPC.anchos, '360,375,390,768,1366').map(ventana);
const TEMAS = lista(OPC.temas, 'claro,oscuro');
const MOVS = lista(OPC.mov, 'reduce,no-preference');
const IDIOMAS = lista(OPC.idiomas, 'es,en');
const TEXTO = OPC.texto != null ? String(OPC.texto) : null;
const MINIMO = 4.5, TOLERANCIA_CENTRO = 1;
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ── El documento que se sirve ──────────────────────────────────────────────────────────────── */
function documento() {
  if (DOC === 'publicado') return null;
  if (DOC === 'trabajo') return fs.readFileSync(path.join(REPO, 'index.html'));
  if (fs.existsSync(DOC) && fs.statSync(DOC).isFile()) return fs.readFileSync(DOC);
  return execFileSync('git', ['-C', REPO, 'show', DOC + ':index.html'], { maxBuffer: 64 * 1024 * 1024 });
}

/* ── PNG → píxeles, sin librerías (las capturas de Chrome: 8 bits, RGB o RGBA, sin entrelazado) ── */
function leerPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('no es un PNG');
  let p = 8, ancho = 0, alto = 0, prof = 0, tipo = 0, entre = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { ancho = d.readUInt32BE(0); alto = d.readUInt32BE(4); prof = d[8]; tipo = d[9]; entre = d[12]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  if (prof !== 8 || entre !== 0 || (tipo !== 2 && tipo !== 6)) throw new Error('PNG no soportado: prof ' + prof + ' tipo ' + tipo);
  const bpp = tipo === 6 ? 4 : 3, fila = ancho * bpp;
  const crudo = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(alto * fila);
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (fila + 1)], ini = y * (fila + 1) + 1;
    for (let x = 0; x < fila; x++) {
      const a = x >= bpp ? px[y * fila + x - bpp] : 0, b = y > 0 ? px[(y - 1) * fila + x] : 0;
      const c = (x >= bpp && y > 0) ? px[(y - 1) * fila + x - bpp] : 0;
      let v = crudo[ini + x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      px[y * fila + x] = v & 255;
    }
  }
  return { ancho, alto, bpp, px };
}

/* ── Contraste WCAG ──────────────────────────────────────────────────────────────────────────── */
function lumin(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contraste(a, b) { const x = lumin(a), y = lumin(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function rgba(css) {
  const m = String(css).match(/[\d.]+/g) || [];
  return [+m[0] || 0, +m[1] || 0, +m[2] || 0, m.length >= 4 ? +m[3] : 1];
}
const r2 = v => Math.round(v * 100) / 100;

/* El fondo es B entero; la tinta, el píxel de A que más se aleja de B en el mismo lugar. */
function analizar(bufA, bufB, colorTexto) {
  const A = leerPng(bufA), B = leerPng(bufB);
  if (A.ancho !== B.ancho || A.alto !== B.alto) throw new Error('los dos recortes no miden lo mismo');
  const tinta = rgba(colorTexto), hist = new Map();
  let maxDif = -1, tintaPx = null, pxTinta = 0, cmin = Infinity, peor = null;
  for (let i = 0; i < A.ancho * A.alto; i++) {
    const a = A.px.subarray(i * A.bpp, i * A.bpp + 3), b = B.px.subarray(i * B.bpp, i * B.bpp + 3);
    const fondo = [b[0], b[1], b[2]], k = fondo.join(',');
    hist.set(k, (hist.get(k) || 0) + 1);
    const dif = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    if (dif > maxDif) { maxDif = dif; tintaPx = [a[0], a[1], a[2]]; }
    if (dif > 24) pxTinta++;
    const ef = tinta[3] < 1 ? [0, 1, 2].map(j => tinta[3] * tinta[j] + (1 - tinta[3]) * fondo[j]) : tinta;
    const c = contraste(ef, fondo);
    if (c < cmin) { cmin = c; peor = fondo; }
  }
  const total = A.ancho * A.alto;
  const fondos = [...hist.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, n]) => {
    const f = k.split(',').map(Number);
    return { rgb: 'rgb(' + k.replace(/,/g, ', ') + ')', parte: r2(n / total), contraste: r2(contraste(tinta[3] < 1 ? f : tinta, f)) };
  });
  return { px: A.ancho + 'x' + A.alto, px_tinta: pxTinta, tinta_medida: 'rgb(' + tintaPx.join(', ') + ')',
    tinta_declarada: colorTexto, fondo_moda: fondos[0].rgb, contraste_moda: fondos[0].contraste,
    contraste_min: r2(cmin), peor_fondo: 'rgb(' + peor.join(', ') + ')', fondos };
}

/* ── Chrome sin cabeza por CDP, sin librerías (el mismo patrón que banco-sesiones.js) ────────── */
async function abrirChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pista-chrome-'));
  const ch = spawn(OPC.chrome || '/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=0',
    '--user-data-dir=' + dir, '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--disable-background-networking', '--disable-extensions', '--hide-scrollbars', '--mute-audio',
    '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
  const f = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(f); i++) await dormir(100);
  if (!fs.existsSync(f)) throw new Error('Chrome no abrió el puerto de depuración');
  const [puerto, ruta] = fs.readFileSync(f, 'utf8').trim().split('\n');
  const ws = new WebSocket('ws://127.0.0.1:' + puerto + ruta);
  await new Promise((ok, mal) => { ws.addEventListener('open', ok); ws.addEventListener('error', mal); });
  let n = 0;
  const pend = {}, oyentes = new Set();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend[m.id]) { const p = pend[m.id]; delete pend[m.id]; m.error ? p.mal(new Error(m.error.message)) : p.ok(m.result); }
    else if (m.method) oyentes.forEach(fn => { try { fn(m); } catch (e) {} });
  });
  const cdp = (method, params, sessionId) => new Promise((ok, mal) => {
    const i = ++n; pend[i] = { ok, mal };
    ws.send(JSON.stringify({ id: i, method, params: params || {}, sessionId }));
  });
  /* El perfil temporal se borra DESPUÉS de que Chrome termina: borrarlo con el proceso todavía
     escribiendo fallaba en silencio y dejaba un `pista-chrome-*` por corrida en el temporal. */
  return { cdp, oir: fn => { oyentes.add(fn); return () => oyentes.delete(fn); },
    cerrar: () => new Promise(fin => {
      try { ws.close(); } catch (e) {}
      let hecho = false;
      const borrar = () => { if (hecho) return; hecho = true;
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} fin(); };
      if (ch.exitCode != null) return borrar();
      const tope = setTimeout(borrar, 5000);
      ch.once('exit', () => { clearTimeout(tope); setTimeout(borrar, 200); });
      try { ch.kill(); } catch (e) { clearTimeout(tope); borrar(); }
    }) };
}

/* ── Lo que corre ADENTRO de la página ────────────────────────────────────────────────────────── */
function medirEnPagina() {
  const f1 = v => Math.round(v * 10) / 10;
  const R = r => ({ x: f1(r.left), y: f1(r.top), w: f1(r.width), h: f1(r.height), r: f1(r.right), b: f1(r.bottom) });
  const rango = el => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
  const ov = document.getElementById('splashOv');
  const hint = document.getElementById('splashLangHint'), btn = document.getElementById('splashLangBtn');
  const ht = rango(hint), bt = rango(btn), bb = btn.getBoundingClientRect();
  const hs = getComputedStyle(hint);
  const band = document.querySelector('.splash-circ-band');
  const circ = band && band.querySelector('.ent-circulos');
  const cb = circ.getBoundingClientRect(), bandR = band.getBoundingClientRect();
  const disco = (pseudo) => {
    const s = getComputedStyle(circ, pseudo);
    const w = parseFloat(s.width), h = parseFloat(s.height), top = parseFloat(s.top);
    const x0 = s.left === 'auto' ? cb.right - parseFloat(s.right) - w : cb.left + parseFloat(s.left);
    let tx = 0, ty = 0;
    const m = (s.transform || '').match(/matrix\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map(Number); tx = p[4]; ty = p[5]; }
    return { color: s.backgroundColor, cx: f1(x0 + w / 2 + tx), cy: f1(cb.top + top + h / 2 + ty), r: f1(w / 2),
      tx: f1(tx), ty: f1(ty), animacion: s.animationName };
  };
  const after = disco('::after'), before = disco('::before');
  const esq = [[ht.left, ht.top], [ht.right, ht.top], [ht.left, ht.bottom], [ht.right, ht.bottom]];
  const enBanda = (x, y) => x >= bandR.left && x <= bandR.right && y >= bandR.top && y <= bandR.bottom;
  const wrap = document.querySelector('.splash-wrap'), wr = wrap.getBoundingClientRect(), ws = getComputedStyle(wrap);
  const cx = (ht.left + ht.right) / 2;
  return {
    version: (typeof APP_VERSION !== 'undefined') ? APP_VERSION : null,
    dataTema: document.documentElement.getAttribute('data-tema'),
    sinAnimaciones: document.documentElement.classList.contains('sin-animaciones'),
    oculto: document.hidden, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
    splash: ov.classList.contains('show') && getComputedStyle(ov).display !== 'none',
    pista: { texto: hint.textContent, color: hs.color, opacidad: hs.opacity, caja_texto: R(ht),
      fuente: hs.fontSize + ' ' + hs.fontWeight },
    chip: { texto: btn.textContent, caja: R(bb), caja_texto: R(bt) },
    centro: { pista: f1(cx), chip_caja: f1((bb.left + bb.right) / 2), chip_texto: f1((bt.left + bt.right) / 2),
      desvio_caja: f1(cx - (bb.left + bb.right) / 2), desvio_texto: f1(cx - (bt.left + bt.right) / 2) },
    after, before,
    esquinas_en_after: esq.map(([x, y]) => enBanda(x, y) && Math.hypot(x - after.cx, y - after.cy) <= after.r),
    degrade: { imagen: ws.backgroundImage, mitad: f1(wr.left + wr.width / 2),
      lado: ws.backgroundImage === 'none' ? 'sin degradé' : (ht.left >= wr.left + wr.width / 2 ? 'derecha' : (ht.right <= wr.left + wr.width / 2 ? 'izquierda' : 'cruza')) },
    overlay: getComputedStyle(ov).backgroundColor
  };
}

/* La credencial del pie: su caja de texto, su color, si está a la vista y de qué lado del degradé. */
function medirCredencialEnPagina() {
  const f1 = v => Math.round(v * 10) / 10;
  const R = r => ({ x: f1(r.left), y: f1(r.top), w: f1(r.width), h: f1(r.height), r: f1(r.right), b: f1(r.bottom) });
  const n = document.querySelector('#splashOv .splash-norma');
  if (!n) return null;
  const rg = document.createRange(); rg.selectNodeContents(n);
  const t = rg.getBoundingClientRect(), cs = getComputedStyle(n);
  const wrap = document.querySelector('.splash-wrap'), wr = wrap.getBoundingClientRect(), ws = getComputedStyle(wrap);
  const mitad = wr.left + wr.width / 2, band = document.querySelector('.splash-circ-band').getBoundingClientRect();
  return { texto: n.textContent.trim().slice(0, 48), color: cs.color, caja_texto: R(t),
    en_vista: t.width > 0 && t.top >= 0 && t.bottom <= innerHeight && t.left >= 0 && t.right <= innerWidth,
    lado: ws.backgroundImage === 'none' ? 'sin degradé' : (t.left >= mitad ? 'derecha' : (t.right <= mitad ? 'izquierda' : 'cruza')),
    toca_la_banda: !(t.bottom < band.top || t.top > band.bottom || t.right < band.left || t.left > band.right) };
}

/* ── Una medición: un contexto nuevo, se descarta al terminar ─────────────────────────────────── */
async function medirCombinacion(c, docBody, v, tema, mov, idioma) {
  const nombre = [ETIQ, v.w, tema, mov, idioma].join('-');
  const out = { combinacion: { ancho: v.w, alto: v.h, dpr: v.dpr, tema, mov, idioma, texto: TEXTO }, mediciones: [], credencial: [], pedidos: [], cortados: [] };
  const ctx = await c.cdp('Target.createBrowserContext', {});
  const t = await c.cdp('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId });
  const { sessionId: sid } = await c.cdp('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  const sesion = (m, p) => c.cdp(m, p, sid);
  const quitar = c.oir(m => {
    if (m.sessionId !== sid) return;
    if (m.method === 'Network.requestWillBeSent' && !/\.(png|svg|jpe?g|webp|woff2?|mp4|webm|ico)(\?|$)/.test(m.params.request.url))
      out.pedidos.push(m.params.request.method + ' ' + m.params.request.url.slice(0, 120));
    if (m.method !== 'Fetch.requestPaused') return;
    const { requestId, request, resourceType } = m.params;
    let u; try { u = new URL(request.url); } catch (e) { u = null; }
    if (/script\.google\.com/.test(request.url)) { out.cortados.push(request.url.slice(0, 100)); sesion('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {}); return; }
    if (u && /\/sw\.js$/.test(u.pathname)) { sesion('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {}); return; }
    if (docBody && resourceType === 'Document' && u && u.origin === ORIGEN && (u.pathname === '/' || u.pathname === '/index.html')) {
      sesion('Fetch.fulfillRequest', { requestId, responseCode: 200, body: docBody.toString('base64'),
        responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }] }).catch(() => {});
      return;
    }
    sesion('Fetch.continueRequest', { requestId }).catch(() => {});
  });
  const ev = async (expr, tope) => {
    const r = await sesion('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: tope || 20000 });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  const esperar = async (expr, tope) => {
    const t0 = Date.now();
    for (;;) {
      try { const x = await ev(expr, 5000); if (x) return x; } catch (e) {}
      if (Date.now() - t0 > (tope || 30000)) return null;
      await dormir(100);
    }
  };
  const cuadro = () => ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
  /* ⚠️ EL RECORTE DEL TEXTO VA ALINEADO HACIA ADENTRO (`adentro`). Redondeado hacia afuera, la primera
     fila de píxeles cae ARRIBA de la caja del texto, y ahí está el anillo de foco del chip: la app
     enfoca el chip sola al abrir el splash (`ovFocoAbrir`), y medido a 375 en la 7.49 el anillo
     termina en y = 56,0 mientras la caja del texto empieza en 55,8. Esa franja de 0,2 px es el aire
     de arriba de la línea, no tinta: ninguna letra llega ahí, y contarla daría como «fondo del
     texto» un píxel que no está debajo de ninguna letra. El recorte de contexto sí va hacia afuera:
     es para mirarlo. */
  const captura = async (rect, adentro) => {
    const d = v.dpr, abajo = adentro ? Math.ceil : Math.floor, arriba = adentro ? Math.floor : Math.ceil;
    const x0 = abajo(rect.x * d) / d, y0 = abajo(rect.y * d) / d;
    const x1 = arriba((rect.x + rect.w) * d) / d, y1 = arriba((rect.y + rect.h) * d) / d;
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0, scale: 1 };
    const r = await sesion('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
    return { buf: Buffer.from(r.data, 'base64'), clip };
  };
  /* La credencial: mismo método que la pista (con texto / con el texto transparente). Si no está a la
     vista se la trae y después se devuelve el desplazamiento: la pista ya se midió en su lugar. */
  const credencial = async (pos, base) => {
    const leer = () => ev('(' + medirCredencialEnPagina.toString() + ')()');
    let g = await leer(), antes = null;
    if (!g) return { deriva: pos.k, error: 'no hay .splash-norma' };
    if (!g.en_vista) {
      antes = await ev('(() => { const w = document.querySelector(".splash-wrap"), a = w.scrollTop;' +
        ' document.querySelector("#splashOv .splash-norma").scrollIntoView({ block: "nearest" }); return a; })()');
      await cuadro(); g = await leer();
    }
    try {
      if (!g.en_vista) return Object.assign({ deriva: pos.k, error: 'la credencial no entra en la vista' }, g);
      const A = await captura(g.caja_texto, true);
      await ev('(() => { document.querySelector("#splashOv .splash-norma").style.setProperty("color", "transparent", "important"); return true; })()');
      await cuadro();
      const B = await captura(g.caja_texto, true);
      await ev('(() => { document.querySelector("#splashOv .splash-norma").style.removeProperty("color"); return true; })()');
      fs.writeFileSync(path.join(SALIDA, base + '-texto.png'), A.buf);
      fs.writeFileSync(path.join(SALIDA, base + '-fondo.png'), B.buf);
      return Object.assign({ deriva: pos.k, T: pos.T, recorte: A.clip, archivo: base + '-texto.png', desplazada: antes != null }, g,
        { pixel: analizar(A.buf, B.buf, g.color) });
    } finally {
      if (antes != null) { await ev('(() => { document.querySelector(".splash-wrap").scrollTop = ' + antes + '; return true; })()'); await cuadro(); }
    }
  };
  try {
    await sesion('Network.enable');
    await sesion('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    await sesion('Page.enable');
    const previos = { silva_fatiga_tema_v1: tema, silva_fatiga_idioma_v1: idioma };
    if (TEXTO != null) previos.silva_fatiga_texto_v1 = TEXTO;
    await sesion('Page.addScriptToEvaluateOnNewDocument', { source: '(function(){' +
      'try { delete Navigator.prototype.serviceWorker; } catch (e) {}' +
      'try { if (location.origin === ' + JSON.stringify(ORIGEN) + ') { var p = ' + JSON.stringify(previos) + ';' +
      ' Object.keys(p).forEach(function (k) { localStorage.setItem(k, p[k]); }); } } catch (e) {}' +
      '})();' });
    await sesion('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: v.dpr, mobile: v.movil });
    await sesion('Emulation.setTouchEmulationEnabled', v.movil ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await sesion('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: mov },
      { name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
    await sesion('Page.navigate', { url: URL_APP });
    const listo = await esperar('document.readyState === "complete" && !!document.getElementById("splashOv") && ' +
      'document.getElementById("splashOv").classList.contains("show") && typeof APP_VERSION !== "undefined"', 40000);
    if (!listo) throw new Error('el splash no se abrió');
    await ev('document.fonts.ready.then(() => true)');
    await dormir(1500);   // que terminen las entradas (logo, titular) con movimiento permitido

    /* La deriva: se pausan las animaciones de los dos círculos de la banda y se buscan el reposo y
       la deriva máxima leyendo el `transform` del `::after` en doce instantes del ciclo. */
    const derivas = await ev('(() => { const circ = document.querySelector(".splash-circ-band .ent-circulos");' +
      ' const an = document.getAnimations().filter(a => a.effect && a.effect.target === circ);' +
      ' if (!an.length) return [];' +
      ' const dur = Math.max.apply(null, an.map(a => a.effect.getTiming().duration || 0)); const res = [];' +
      ' an.forEach(a => a.pause());' +
      ' for (let k = 0; k < 12; k++) { const T = k * dur / 12; an.forEach(a => { a.currentTime = T; });' +
      '  const m = (getComputedStyle(circ, "::after").transform || "").match(/matrix\\(([^)]+)\\)/);' +
      '  const p = m ? m[1].split(",").map(Number) : [1,0,0,1,0,0]; res.push({ T, tx: p[4], ty: p[5] }); }' +
      ' return res; })()');
    let posiciones = [{ k: 'sin animación', T: null }];
    if (derivas.length) {
      const d = derivas.map(x => Object.assign(x, { n: Math.hypot(x.tx, x.ty) }));
      const reposo = d.reduce((a, b) => b.n < a.n ? b : a), extremo = d.reduce((a, b) => b.n > a.n ? b : a);
      const medio = d.reduce((a, b) => Math.abs(b.n - extremo.n / 2) < Math.abs(a.n - extremo.n / 2) ? b : a);
      posiciones = [{ k: 'reposo', T: reposo.T }, { k: 'deriva máxima', T: extremo.T }, { k: 'mitad', T: medio.T }];
    }
    out.derivas = derivas.map(x => ({ T: Math.round(x.T), tx: r2(x.tx), ty: r2(x.ty) }));
    const palabraDe = l => l === 'en' ? 'Language' : 'Idioma';
    const palabras = mov === 'reduce' ? [palabraDe(idioma)] : [palabraDe(idioma), palabraDe(idioma === 'en' ? 'es' : 'en')];
    for (const palabra of palabras) {
      let hecho = false;
      for (let intento = 0; intento < 3 && !hecho; intento++) {
        const vino = await esperar('document.getElementById("splashLangHint").textContent === ' + JSON.stringify(palabra), 8000);
        if (!vino) throw new Error('la pista no mostró «' + palabra + '»');
        const filas = [], cred = [];
        for (const pos of posiciones) {
          if (pos.T != null) await ev('(() => { const circ = document.querySelector(".splash-circ-band .ent-circulos");' +
            ' document.getAnimations().filter(a => a.effect && a.effect.target === circ).forEach(a => { a.pause(); a.currentTime = ' + pos.T + '; }); return true; })()');
          await cuadro();
          const g = await ev('(' + medirEnPagina.toString() + ')()');
          const A = await captura(g.pista.caja_texto, true);
          await ev('(() => { document.getElementById("splashLangHint").style.setProperty("color", "transparent", "important"); return true; })()');
          await cuadro();
          const B = await captura(g.pista.caja_texto, true);
          await ev('(() => { document.getElementById("splashLangHint").style.removeProperty("color"); return true; })()');
          const base = nombre + '-' + palabra + (pos.T != null ? '-' + pos.k.replace(/\s+/g, '_').replace(/á/g, 'a') : '');
          fs.writeFileSync(path.join(SALIDA, base + '-texto.png'), A.buf);
          fs.writeFileSync(path.join(SALIDA, base + '-fondo.png'), B.buf);
          const px = analizar(A.buf, B.buf, g.pista.color);
          filas.push(Object.assign({ palabra, deriva: pos.k, T: pos.T, recorte: A.clip, archivo: base + '-texto.png' }, g, { pixel: px }));
          if (palabra === palabras[0]) cred.push(await credencial(pos, base.replace('-' + palabra, '-credencial')));
        }
        const sigue = await ev('document.getElementById("splashLangHint").textContent === ' + JSON.stringify(palabra));
        if (!sigue) continue;   // la pista alternó en el medio: se repite esa palabra
        hecho = true;
        out.credencial.push.apply(out.credencial, cred);
        /* Un recorte con el chip y la pista juntos, en reposo, para que se vea el centrado. */
        const g0 = filas[0];
        const x = Math.min(g0.chip.caja.x, g0.pista.caja_texto.x) - 14, y = g0.chip.caja.y - 10;
        const r = Math.max(g0.chip.caja.r, g0.pista.caja_texto.r) + 14, b = g0.pista.caja_texto.b + 12;
        if (posiciones[0].T != null) await ev('(() => { const circ = document.querySelector(".splash-circ-band .ent-circulos");' +
          ' document.getAnimations().filter(a => a.effect && a.effect.target === circ).forEach(a => { a.currentTime = ' + posiciones[0].T + '; }); return true; })()');
        await cuadro();
        const C = await captura({ x: Math.max(0, x), y: Math.max(0, y), w: Math.min(v.w, r) - Math.max(0, x), h: b - Math.max(0, y) });
        fs.writeFileSync(path.join(SALIDA, nombre + '-' + palabra + '-contexto.png'), C.buf);
        out.mediciones.push.apply(out.mediciones, filas);
      }
      if (!hecho) throw new Error('la pista alternó en el medio de las tres capturas, tres veces seguidas');
    }
  } catch (e) {
    out.error = e.message;
  } finally {
    quitar();
    try { await c.cdp('Target.closeTarget', { targetId: t.targetId }); } catch (e) {}
    try { await c.cdp('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId }); } catch (e) {}
  }
  return out;
}

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const docBody = documento();
  const c = await abrirChrome();
  const res = [];
  let mal = 0, sinMedir = 0;
  try {
    for (const v of ANCHOS) for (const tema of TEMAS) for (const mov of MOVS) for (const idioma of IDIOMAS) {
      const r = await medirCombinacion(c, docBody, v, tema, mov, idioma);
      res.push(r);
      if (r.error || !r.mediciones.length) { sinMedir++; console.log('✘ SIN MEDIR', JSON.stringify(r.combinacion), r.error); continue; }
      if (r.cortados.length) { sinMedir++; console.log('✘ hubo pedidos al endpoint', r.cortados); }
      for (const m of r.mediciones) {
        const ok = m.pixel.contraste_min >= MINIMO && Math.abs(m.centro.desvio_caja) <= TOLERANCIA_CENTRO;
        const guarda = m.pixel.px_tinta > 0 && m.splash && m.dataTema === tema;
        if (!guarda) sinMedir++; else if (!ok) mal++;
        console.log([guarda ? (ok ? '✔' : '✘') : '⚠', 'v' + m.version, v.w + 'x' + v.h + '@' + v.dpr, tema, mov, idioma,
          '«' + m.palabra + '»', m.deriva, 'fondo ' + m.pixel.fondo_moda, 'min ' + m.pixel.contraste_min + ':1',
          'moda ' + m.pixel.contraste_moda + ':1', 'centro ' + (m.centro.desvio_caja > 0 ? '+' : '') + m.centro.desvio_caja + ' px',
          'tinta ' + m.pixel.tinta_medida + ' (' + m.pista.color + ')', m.pixel.px_tinta + ' px de tinta'].join(' · '));
      }
      if (!r.credencial.length) { sinMedir++; console.log('✘ la credencial no se midió', JSON.stringify(r.combinacion)); }
      for (const m of r.credencial) {
        if (m.error) { sinMedir++; console.log('⚠ credencial sin medir', JSON.stringify(r.combinacion), m.error); continue; }
        const ok = m.pixel.contraste_min >= MINIMO, guarda = m.pixel.px_tinta > 0;
        if (!guarda) sinMedir++; else if (!ok) mal++;
        console.log([guarda ? (ok ? '✔' : '✘') : '⚠', 'credencial', v.w + 'x' + v.h + '@' + v.dpr, tema, mov, idioma, m.deriva,
          m.lado + (m.desplazada ? ' (traída a la vista)' : ''), 'fondo ' + m.pixel.fondo_moda, 'min ' + m.pixel.contraste_min + ':1',
          'tinta ' + m.pixel.tinta_medida + ' (' + m.color + ')', m.pixel.px_tinta + ' px de tinta'].join(' · '));
      }
    }
  } finally { await c.cerrar(); }
  const informe = { herramienta: 'pruebas/medir-pista-idioma.js', fecha: new Date().toISOString(), url: URL_APP, doc: DOC,
    minimo: MINIMO, tolerancia_centro_px: TOLERANCIA_CENTRO, texto: TEXTO, combinaciones: res };
  fs.writeFileSync(path.join(SALIDA, ETIQ + '.json'), JSON.stringify(informe, null, 1));
  console.log('\n' + (sinMedir ? '⚠ ' + sinMedir + ' sin medir · ' : '') + (mal ? '✘ ' + mal + ' fuera del invariante' : '✔ todo dentro del invariante') +
    ' · salida: ' + path.join(SALIDA, ETIQ + '.json'));
  process.exit(sinMedir ? 3 : (mal ? 1 : 0));
})().catch(e => { console.error('ERROR', e && e.stack || e); process.exit(3); });
