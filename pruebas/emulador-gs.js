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
        base64Decode: function (s) { return atob(String(s)); }
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
