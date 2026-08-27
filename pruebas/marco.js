/* ══════════════════════════════════════════════════════════════════════════════════════════════
   MARCO DE PRUEBAS · Silva Salud Fatiga                                            (L2a, 2026-08-27)

   Qué es: lo mínimo para escribir un caso de prueba y que el resultado se entienda sin abrir nada.

   POR QUÉ ASÍ Y NO CON UNA HERRAMIENTA DE VERDAD
   En esta máquina NO hay Node (verificado: `node --version` no existe ni en bash ni en PowerShell),
   así que Jest/Vitest/Playwright quedan descartados. Python sí hay, pero Python no ejecuta
   JavaScript, y TODO lo que hay que probar es JavaScript: la app es un `index.html` con el script
   inline, y el endpoint es un `.gs` que también es JavaScript.
   Queda una sola opción real: correr las pruebas EN EL NAVEGADOR, contra la app de verdad.
   Eso además es una ventaja, no un consuelo: las pruebas que más falta hacen acá (que un botón no
   quede tapado, que un desplegable no corte contenido, que un color tenga contraste) sólo se pueden
   comprobar sobre el DOM real, con medidas reales. Un DOM simulado justamente no las agarraría.
   Ver `LEEME.md`.

   REGLA DE ORO DEL REPORTE: si un caso falla, el reporte tiene que decir **qué esperaba, qué
   obtuvo y por qué importa**, sin que nadie tenga que abrir el código para entenderlo. Un `false`
   suelto no sirve: la mitad de los bugs de esta sesión aparecieron porque una medición mía daba un
   valor raro y hubo que investigar de dónde salía.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const PRUEBAS = {
    _grupo: '(sin grupo)',
    _casos: [],
    _actual: null,
  };

  /* Agrupa los casos que siguen. Es sólo para leer el reporte. */
  PRUEBAS.grupo = function (nombre) {
    PRUEBAS._grupo = String(nombre);
  };

  /* Declara un caso. `fn` puede ser async. NO se corre acá: se junta y se corre todo junto en
     `correr()`, así un caso que explota no impide que corran los demás. */
  PRUEBAS.caso = function (nombre, fn) {
    PRUEBAS._casos.push({ grupo: PRUEBAS._grupo, nombre: String(nombre), fn: fn });
  };

  /* ── Comprobaciones ────────────────────────────────────────────────────────────────────────
     Todas reciben `porque`: la razón por la que el caso existe. Es obligatorio de hecho (si no se
     pasa, el reporte queda cojo). Es lo que hace que dentro de seis meses se entienda si el caso
     sigue teniendo sentido o quedó viejo. */

  function anotar(ok, esperaba, obtuvo, porque) {
    PRUEBAS._actual.comprobaciones.push({ ok: ok, esperaba: esperaba, obtuvo: obtuvo, porque: porque || '' });
    if (!ok) PRUEBAS._actual.ok = false;
  }

  /* Comparación profunda por valor. Se usa JSON y no `===` porque casi todo lo que se compara acá
     son objetos (un plan de ciclo, una respuesta del endpoint) y `===` daría falso siempre. */
  function mismo(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return false;
    try { return JSON.stringify(orden(a)) === JSON.stringify(orden(b)); } catch (e) { return false; }
  }
  /* Ordena las claves para que {a:1,b:2} y {b:2,a:1} se consideren iguales: en un objeto el orden
     de las claves no es información, y sin esto un caso fallaría por algo que no es un error. */
  function orden(v) {
    if (Array.isArray(v)) return v.map(orden);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach(k => { o[k] = orden(v[k]); });
      return o;
    }
    return v;
  }

  PRUEBAS.igual = function (obtuvo, esperaba, porque) {
    anotar(mismo(obtuvo, esperaba), esperaba, obtuvo, porque);
  };

  PRUEBAS.cierto = function (cond, porque) {
    anotar(!!cond, true, !!cond, porque);
  };

  PRUEBAS.falso = function (cond, porque) {
    anotar(!cond, false, !!cond, porque);
  };

  /* Para números que no tienen que ser exactos sino estar por encima de un piso: contraste,
     área de toque, etc. Guarda el número real en el reporte, no sólo si pasó — cuando algo queda
     apenas arriba del mínimo conviene verlo. */
  PRUEBAS.alMenos = function (obtuvo, minimo, porque) {
    const n = Number(obtuvo);
    anotar(isFinite(n) && n >= minimo, '>= ' + minimo, n, porque);
  };

  PRUEBAS.comoMucho = function (obtuvo, maximo, porque) {
    const n = Number(obtuvo);
    anotar(isFinite(n) && n <= maximo, '<= ' + maximo, n, porque);
  };

  /* Para lo que existe o no existe en el DOM. `sel` es un selector; el mensaje sale solo. */
  PRUEBAS.existe = function (sel, porque) {
    anotar(!!document.querySelector(sel), 'existe ' + sel, !!document.querySelector(sel), porque);
  };

  /* ── Correr todo ───────────────────────────────────────────────────────────────────────────
     Devuelve el reporte. Un caso que LANZA no rompe la corrida: se marca como fallado con el
     error como "obtuvo". Eso importa porque un `TypeError` en el caso 2 no debe ocultar que los
     casos 3 a 40 estaban bien. */
  PRUEBAS.correr = async function () {
    for (const c of PRUEBAS._casos) {
      PRUEBAS._actual = { grupo: c.grupo, nombre: c.nombre, ok: true, comprobaciones: [], error: null };
      try {
        await c.fn();
      } catch (e) {
        PRUEBAS._actual.ok = false;
        PRUEBAS._actual.error = (e && e.message) ? e.message : String(e);
      }
      /* Un caso sin ninguna comprobación es un caso que no prueba nada. Pasa si alguien escribe
         el caso y se olvida de comprobar: se marca como falla para que no dé verde en falso. */
      if (!PRUEBAS._actual.comprobaciones.length && !PRUEBAS._actual.error) {
        PRUEBAS._actual.ok = false;
        PRUEBAS._actual.error = 'el caso no comprobó nada (¿falta un PRUEBAS.igual/cierto/...?)';
      }
      c.resultado = PRUEBAS._actual;
    }
    return PRUEBAS.reporte();
  };

  PRUEBAS.reporte = function () {
    const casos = PRUEBAS._casos.map(c => c.resultado).filter(Boolean);
    const fallados = casos.filter(c => !c.ok);
    const fallas = [];
    fallados.forEach(c => {
      if (c.error) {
        fallas.push({ grupo: c.grupo, caso: c.nombre, error: c.error });
        return;
      }
      c.comprobaciones.filter(x => !x.ok).forEach(x => {
        fallas.push({
          grupo: c.grupo, caso: c.nombre,
          esperaba: x.esperaba, obtuvo: x.obtuvo, porque: x.porque
        });
      });
    });
    return {
      ok: fallados.length === 0,
      total: casos.length,
      pasaron: casos.length - fallados.length,
      fallaron: fallados.length,
      /* Cuántas comprobaciones corrieron en total. Sirve para detectar el caso silencioso de
         "todo verde porque en realidad no se ejecutó casi nada" — que ya nos pasó con una suite
         que daba verde sin probar nada (ver la memoria de tests en base limpia). */
      comprobaciones: casos.reduce((n, c) => n + c.comprobaciones.length, 0),
      fallas: fallas,
      /* El detalle por grupo, para ver de un vistazo qué área está roja. */
      porGrupo: (function () {
        const g = {};
        casos.forEach(c => {
          if (!g[c.grupo]) g[c.grupo] = { pasaron: 0, fallaron: 0 };
          g[c.grupo][c.ok ? 'pasaron' : 'fallaron']++;
        });
        return g;
      })()
    };
  };

  /* Se limpia entre corridas: la página no se recarga entre una corrida y otra, así que sin esto
     los casos se irían acumulando y el total mentiría. */
  PRUEBAS.limpiar = function () {
    PRUEBAS._casos = [];
    PRUEBAS._grupo = '(sin grupo)';
    PRUEBAS._actual = null;
  };

  global.PRUEBAS = PRUEBAS;
})(window);
