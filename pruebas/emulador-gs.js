/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EMULADOR DE APPS SCRIPT · para probar el endpoint sin publicarlo      (L2a, 2026-08-27)

   QUÉ RESUELVE
   El endpoint es un `.gs` que corre en los servidores de Google. No podemos publicarlo nosotros
   (lo pega Franco a mano) y no hay entorno de pruebas. Así que la única forma de probarlo antes de
   entregarlo es correr su código de verdad contra un Sheets simulado.
   Esto ya existía a medias: lo armé a mano en I8/E2a/E2b y con él salió solo el
   `"Sat Dec 30 1899 07:30:00"` que estaba pasando en producción. El problema era que vivía en la
   consola del navegador y **se perdía en cada recarga de la página** — lo tuve que reescribir
   media docena de veces en una sola sesión. Por eso ahora es un archivo.

   QUÉ SE EMULA (medido sobre el `.gs`, no supuesto — salió de contar los usos reales):
     Utilities.formatDate ×19 · Session.getScriptTimeZone ×15 · CacheService.getScriptCache ×9
     Logger.log ×3 · LockService.getScriptLock ×2 · UrlFetchApp.fetch ×1
     SpreadsheetApp.openById ×1 · PropertiesService ×1 · DriveApp ×1 · ContentService ×1

   ⚠️ LO QUE **NO** HACE, a propósito:
   No intenta ser Google Sheets. Es una simulación honesta de la parte que el endpoint usa
   (leer/escribir rangos, formatos de celda, la caché). Si una prueba necesita algo que no está
   emulado, la prueba tiene que fallar con un error claro y no devolver un valor inventado — un
   emulador que finge de más da verde donde producción da rojo, que es peor que no tener nada.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

/* ── SHA-256 síncrono, para `Utilities.computeDigest` ─────────────────────────────────────────
   Implementación estándar (FIPS 180-4). Está acá y no en una librería porque este proyecto no usa
   empaquetador ni dependencias (ver la regla del repo), y porque son 40 líneas verificables.
   ⚠️ Se autocomprueba contra los vectores oficiales al cargar el archivo: si algo estuviera mal,
   la suite falla de entrada en vez de dar hashes plausibles pero incorrectos. */
function sha256Bytes(texto) {
  var K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  /* El texto se pasa a bytes UTF-8: una "ñ" son DOS bytes, y hashear sus code units daría otro
     resultado que el de Apps Script. Es el error silencioso más fácil de cometer acá. */
  var bytes = [], i, c;
  var utf8 = unescape(encodeURIComponent(texto));
  for (i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff);
  var largoBits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (i = 7; i >= 0; i--) bytes.push(Math.floor(largoBits / Math.pow(2, i * 8)) & 0xff);

  var rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
  var w = new Array(64);
  for (var pos = 0; pos < bytes.length; pos += 64) {
    for (i = 0; i < 16; i++) {
      w[i] = (bytes[pos+i*4] << 24) | (bytes[pos+i*4+1] << 16) | (bytes[pos+i*4+2] << 8) | bytes[pos+i*4+3];
    }
    for (i = 16; i < 64; i++) {
      var s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      var s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    var a=H[0],b=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (i = 0; i < 64; i++) {
      var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      var maj = (a & b) ^ (a & cc) ^ (b & cc);
      var t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=cc; cc=b; b=a; a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+cc)|0; H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  /* Bytes CON SIGNO, como los devuelve Apps Script. */
  var out = [];
  for (i = 0; i < 8; i++) {
    for (var j = 3; j >= 0; j--) {
      var byte = (H[i] >>> (j * 8)) & 0xff;
      out.push(byte > 127 ? byte - 256 : byte);
    }
  }
  return out;
}
function __digestHex(bytes) {
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}
/* Vectores oficiales de FIPS 180-4. Si esto no coincide, el emulador miente y hay que saberlo YA. */
(function __digestAutoprueba() {
  var casos = [
    ['',    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad']
  ];
  casos.forEach(function (c) {
    var dio = __digestHex(sha256Bytes(c[0]));
    if (dio !== c[1]) {
      throw new Error('SHA-256 del emulador INCORRECTO para "' + c[0] + '": ' + dio + ' != ' + c[1]);
    }
  });
})();


  /* ── Hoja simulada ──────────────────────────────────────────────────────────────────────────
     `datos` es una matriz de filas. `formatos` guarda el formato de número por celda, porque eso
     NO es un detalle: R15 existe porque Sheets reinterpreta solo lo que le escribís, y ya rompió
     tres veces (teléfonos con `+`, Fecha y Hora). Si el emulador ignorara el formato, justamente
     esas pruebas darían verde en falso. */
  function HojaFalsa(nombre, datos) {
    this._nombre = nombre;
    this._datos = (datos || []).map(f => f.slice());
    this._formatos = {};
  }
  HojaFalsa.prototype.getName = function () { return this._nombre; };
  HojaFalsa.prototype.getLastRow = function () { return this._datos.length; };
  HojaFalsa.prototype.getLastColumn = function () {
    return this._datos.reduce((m, f) => Math.max(m, f.length), 0);
  };
  HojaFalsa.prototype.getDataRange = function () {
    return new RangoFalso(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  };
  HojaFalsa.prototype.getRange = function (fila, col, nFilas, nCols) {
    return new RangoFalso(this, fila, col, nFilas || 1, nCols || 1);
  };
  HojaFalsa.prototype.appendRow = function (fila) {
    this._datos.push(fila.slice());
    return this;
  };
  /* Sheets siempre tiene filas de sobra debajo de los datos, y el endpoint las usa: aplica
     `setNumberFormat("@")` sobre `getMaxRows()` justamente para que el formato ya esté puesto
     cuando MÁS ADELANTE se escriba una fila nueva (R15). Si acá devolviera sólo las filas con
     datos, una prueba de formato daría verde sin cubrir el caso que importa. */
  HojaFalsa.prototype.getMaxRows = function () { return Math.max(this._datos.length + 100, 1000); };
  HojaFalsa.prototype.getMaxColumns = function () { return Math.max(this.getLastColumn() + 10, 26); };
  HojaFalsa.prototype.setFrozenRows = function () { return this; };
  HojaFalsa.prototype.getFrozenRows = function () { return 1; };
  HojaFalsa.prototype.insertSheet = function () { return this; };
  HojaFalsa.prototype.deleteRow = function (n) { this._datos.splice(n - 1, 1); return this; };
  HojaFalsa.prototype.clear = function () { this._datos = []; return this; };
  /* Espejo de lo que quedó en la hoja, para que un caso pueda comprobar qué se escribió. */
  HojaFalsa.prototype.__volcado = function () { return this._datos.map(f => f.slice()); };
  HojaFalsa.prototype.__formatoDe = function (fila, col) { return this._formatos[fila + ',' + col] || null; };

  function RangoFalso(hoja, fila, col, nFilas, nCols) {
    this._h = hoja; this._f = fila; this._c = col; this._nf = nFilas; this._nc = nCols;
  }
  RangoFalso.prototype.getValues = function () {
    const out = [];
    for (let i = 0; i < this._nf; i++) {
      const fila = this._h._datos[this._f - 1 + i] || [];
      const r = [];
      for (let j = 0; j < this._nc; j++) r.push(fila[this._c - 1 + j] === undefined ? '' : fila[this._c - 1 + j]);
      out.push(r);
    }
    return out;
  };
  RangoFalso.prototype.getValue = function () { return this.getValues()[0][0]; };
  RangoFalso.prototype.setValues = function (vals) {
    for (let i = 0; i < vals.length; i++) {
      const fi = this._f - 1 + i;
      if (!this._h._datos[fi]) this._h._datos[fi] = [];
      for (let j = 0; j < vals[i].length; j++) this._h._datos[fi][this._c - 1 + j] = vals[i][j];
    }
    return this;
  };
  RangoFalso.prototype.setValue = function (v) { return this.setValues([[v]]); };
  /* R15: se registra de verdad. Un caso puede comprobar que se llamó `setNumberFormat("@")` en la
     columna del teléfono — que es exactamente el arreglo que hubo que hacer y que nadie garantiza
     que siga puesto después del próximo cambio. */
  RangoFalso.prototype.setNumberFormat = function (fmt) {
    for (let i = 0; i < this._nf; i++)
      for (let j = 0; j < this._nc; j++)
        this._h._formatos[(this._f + i) + ',' + (this._c + j)] = fmt;
    return this;
  };
  RangoFalso.prototype.setNumberFormats = function (fmts) {
    for (let i = 0; i < fmts.length; i++)
      for (let j = 0; j < fmts[i].length; j++)
        this._h._formatos[(this._f + i) + ',' + (this._c + j)] = fmts[i][j];
    return this;
  };
  RangoFalso.prototype.setFontWeight = function () { return this; };
  RangoFalso.prototype.setBackground = function () { return this; };
  RangoFalso.prototype.getNumberFormat = function () { return this._h.__formatoDe(this._f, this._c) || 'General'; };

  function LibroFalso(hojas) {
    this._hojas = {};
    Object.keys(hojas || {}).forEach(n => { this._hojas[n] = new HojaFalsa(n, hojas[n]); });
  }
  LibroFalso.prototype.getSheetByName = function (n) { return this._hojas[n] || null; };
  LibroFalso.prototype.getSheets = function () { return Object.keys(this._hojas).map(n => this._hojas[n]); };
  LibroFalso.prototype.insertSheet = function (n) {
    this._hojas[n] = new HojaFalsa(n, []);
    return this._hojas[n];
  };

  /* ── El entorno completo ────────────────────────────────────────────────────────────────────
     `hojas` es un objeto {nombreDeHoja: [[fila],[fila]]}. Lo arma cada caso con los datos que
     necesita, así una prueba de duplicados no depende de los datos de otra. */
  function crearEntorno(hojas, opciones) {
    opciones = opciones || {};
    const cache = {};
    const registro = { logs: [], fetches: [] };

    const env = {
      /* — Sheets — */
      SpreadsheetApp: {
        openById: function () { return env.__libro; },
        getActiveSpreadsheet: function () { return env.__libro; },
        flush: function () {}
      },
      __libro: new LibroFalso(hojas),

      /* — Caché: implementación real en memoria, no un stub que devuelve null.
           Importa porque hay lógica que DEPENDE de que la caché funcione (el freno de fuerza
           bruta del login cuenta intentos ahí). Con un stub vacío, esa lógica nunca se probaría. */
      CacheService: {
        getScriptCache: function () {
          return {
            get: k => (k in cache ? cache[k] : null),
            put: (k, v) => { cache[k] = String(v); },
            remove: k => { delete cache[k]; },
            getAll: ks => { const o = {}; (ks || []).forEach(k => { if (k in cache) o[k] = cache[k]; }); return o; },
            putAll: o => { Object.keys(o || {}).forEach(k => { cache[k] = String(o[k]); }); }
          };
        }
      },

      /* — Candado: siempre se consigue. El endpoint lo usa para no pisar escrituras; probar la
           contención real no se puede en un solo hilo, así que se emula el camino feliz. */
      LockService: {
        getScriptLock: function () {
          return { tryLock: () => true, waitLock: () => true, releaseLock: () => {}, hasLock: () => true };
        }
      },

      /* — Fecha/hora: el uso más frecuente del `.gs` (19 llamadas). Se implementa de verdad
           porque L1 (el bug de zona horaria, todavía sin reproducir) va a necesitar exactamente
           esto: poder fijar la zona y ver qué escribe el endpoint. */
      Utilities: {
        formatDate: function (fecha, zona, patron) { return formatearFecha(fecha, zona, patron); },
        sleep: function () {},
        getUuid: function () { return 'uuid-de-prueba-' + (++env.__uuid); },
        base64Encode: function (s) { return btoa(unescape(encodeURIComponent(String(s)))); },
        base64Decode: function (s) { return atob(String(s)); },
        /* ⚠️ SHA-256 DE VERDAD, no un doble. Hace falta desde Z0/Z2: sin esto, todo lo que toque
           contraseñas queda sin poder probarse y volvemos a "debería funcionar".
           Se implementa el algoritmo real y no un valor inventado a propósito: un doble haría pasar
           igual una prueba aunque el `.gs` hasheara mal, o aunque tratara mal el UTF-8 de una ñ.
           La implementación se verifica contra los vectores conocidos (ver `__digestAutoprueba`),
           así que no hay que confiar en que la escribí bien: se comprueba sola al cargar.
           ⚠️ `crypto.subtle` NO sirve acá: es asíncrono y el `.gs` es todo síncrono.
           Devuelve bytes CON SIGNO (-128..127), que es la forma exacta en que Apps Script los
           entrega: si devolviera 0..255, el código del endpoint que los convierte a hexadecimal
           daría distinto en las pruebas que en producción, y la prueba mentiría. */
        DigestAlgorithm: { SHA_256: 'SHA_256', MD5: 'MD5', SHA_1: 'SHA_1' },
        computeDigest: function (algoritmo, texto) {
          if (String(algoritmo) !== 'SHA_256') {
            throw new Error('El emulador sólo implementa SHA_256 (pedido: ' + algoritmo + ')');
          }
          return sha256Bytes(String(texto));
        }
      },
      __uuid: 0,

      Session: {
        getScriptTimeZone: function () { return opciones.zona || 'America/Caracas'; },
        getActiveUser: function () { return { getEmail: () => opciones.email || 'prueba@ejemplo.com' }; }
      },

      Logger: { log: function () { registro.logs.push([].slice.call(arguments).join(' ')); } },

      PropertiesService: {
        getScriptProperties: function () {
          const p = opciones.propiedades || {};
          return { getProperty: k => (k in p ? p[k] : null), setProperty: (k, v) => { p[k] = String(v); } };
        }
      },

      /* — Red: NO sale a internet. Devuelve lo que el caso configure; si el caso no configuró
           nada, LANZA. Es a propósito: una prueba que dispara una llamada de red inesperada tiene
           que gritarlo, no seguir con una respuesta vacía. La única llamada real del endpoint es
           a Gemini, y no queremos ni gastarla ni depender de ella. */
      UrlFetchApp: {
        fetch: function (url, params) {
          registro.fetches.push({ url: url, params: params });
          if (typeof opciones.responderFetch === 'function') return opciones.responderFetch(url, params);
          throw new Error('UrlFetchApp.fetch no esperado en esta prueba: ' + url +
            ' — si el caso lo necesita, pasale `responderFetch` en las opciones.');
        }
      },

      DriveApp: {
        getFileById: function () {
          throw new Error('DriveApp no está emulado: si una prueba lo necesita, hay que emularlo ' +
            'a propósito en vez de devolver algo inventado.');
        }
      },

      ContentService: {
        MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
        createTextOutput: function (txt) {
          const o = { __texto: String(txt == null ? '' : txt), __mime: null };
          o.setMimeType = function (m) { o.__mime = m; return o; };
          o.getContent = function () { return o.__texto; };
          return o;
        }
      },

      __registro: registro,
      __cache: cache
    };

    return env;
  }

  /* Implementación de `Utilities.formatDate` para los patrones que el endpoint usa.
     Se resuelve con `Intl` y no a mano porque la zona horaria es justo lo que hay que poder
     variar (L1), y hacer aritmética de husos a mano es la forma más rápida de escribir un
     emulador que miente. */
  function formatearFecha(fecha, zona, patron) {
    const d = (fecha instanceof Date) ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '';
    const p = {};
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(d);
    partes.forEach(x => { p[x.type] = x.value; });
    if (p.hour === '24') p.hour = '00';
    return String(patron)
      .replace(/yyyy/g, p.year).replace(/MM/g, p.month).replace(/dd/g, p.day)
      .replace(/HH/g, p.hour).replace(/mm/g, p.minute).replace(/ss/g, p.second);
  }

  /* ── Cargar el `.gs` de verdad ──────────────────────────────────────────────────────────────
     Se le pega una cola `return {fn1, fn2, ...}` y se lo mete en un `new Function` con el entorno
     como parámetros. Así corre EL CÓDIGO REAL del endpoint, no una copia: si alguien edita el
     `.gs`, la prueba prueba lo editado.
     `nombres` es la lista de funciones que el caso quiere usar. Si una no existe en el `.gs`, el
     error dice cuál — que es la señal de que la renombraron y la prueba quedó vieja. */
  function cargarGs(fuente, env, nombres) {
    const claves = Object.keys(env).filter(k => k.indexOf('__') !== 0);
    const cola = '\nreturn {' + nombres.map(n => n + ': (typeof ' + n + ' === "function" ? ' + n + ' : undefined)').join(', ') + '};';
    let fabrica;
    try {
      fabrica = new Function(claves.join(','), fuente + cola);
    } catch (e) {
      throw new Error('el .gs no compila: ' + e.message);
    }
    const api = fabrica.apply(null, claves.map(k => env[k]));
    const faltan = nombres.filter(n => typeof api[n] !== 'function');
    if (faltan.length) {
      throw new Error('el .gs no tiene estas funciones (¿las renombraron?): ' + faltan.join(', '));
    }
    return api;
  }

  global.GS = {
    crearEntorno: crearEntorno,
    cargarGs: cargarGs,
    formatearFecha: formatearFecha,
    HojaFalsa: HojaFalsa
  };
})(window);
