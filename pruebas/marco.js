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

  /* ── Medir a OTRO tamaño de pantalla ───────────────────────────────────────────────────────
     ⚠️ POR QUÉ EXISTE ESTO, que es el agujero más caro que tuvo la suite.
     La app corre en un iframe de 390x844 FIJO, así que TODA la suite media siempre a ese tamaño.
     Los defectos que sólo aparecen en otro tamaño eran invisibles acá y sólo salían si a alguien
     se le ocurría ir a mirarlos a mano. Y pasó exactamente eso: el arreglo de P1 tocó una regla
     base, midió a dos anchos —los dos con más de 760 px de alto— y dio el trabajo por terminado.
     La rama de "pantalla baja" del CSS, que redeclara varias de esas mismas propiedades, siguió
     con los DOS errores originales. Se descubrió a mano, midiendo a 375x667, y para entonces ya
     estaba pusheado como resuelto.
     Que un arreglo tape un agujero y deje el de al lado abierto no es distracción: es que nada lo
     comprobaba. Con esto, un caso puede recorrer los tamaños de verdad.

     Se le cambia el tamaño al PROPIO iframe, así que las media queries responden como en un
     teléfono real — no es una simulación. Y se devuelve como estaba pase lo que pase.

     ⚠️ SIN ESPERAS, Y NO ES UNA OPTIMIZACIÓN: es lo único que funciona acá.
     La primera versión esperaba 120 ms después de redimensionar, "para que el navegador rehiciera
     el layout". Con la pestaña oculta —que acá lo está siempre— el navegador ESTRANGULA los
     temporizadores: primero a uno por segundo y, pasados unos minutos, a uno por MINUTO. La suite
     quedó clavada media hora en un solo caso.
     Leer una medida (`offsetWidth`) obliga al navegador a recalcular estilo y layout en el acto,
     que es justo lo que se necesitaba. Comprobado midiendo las dos formas en tres tamaños por dos
     tamaños de letra: los doce resultados, idénticos.
     REGLA GENERAL PARA ESTA SUITE: nada de `setTimeout` para "esperar a que se acomode". Forzar el
     recálculo y medir. */
  PRUEBAS.enVentana = function (ancho, alto, fn) {
    const marco = window.frameElement;
    /* Sin iframe (alguien corriendo la suite a mano en la app) se mide al tamaño que haya, en vez
       de fallar: es preferible una comprobación menos exigente que una falla que no es del código. */
    if (!marco) return fn(innerWidth, innerHeight);
    const antes = { w: marco.style.width, h: marco.style.height };
    marco.style.width = ancho + 'px';
    marco.style.height = alto + 'px';
    void document.body.offsetWidth;
    try { return fn(innerWidth, innerHeight); }
    finally {
      marco.style.width = antes.w;
      marco.style.height = antes.h;
      void document.body.offsetWidth;
    }
  };

  /* Los tamaños de referencia del proyecto (R12) más los dos que hicieron falta para encontrar
     defectos reales: 320 de ancho, que es el teléfono más angosto que sigue en uso, y 375x667, que
     es el que entra en la rama de pantalla baja del CSS y ninguna prueba miraba. */
  PRUEBAS.VENTANAS = [
    { w: 320,  h: 800, q: 'teléfono angosto' },
    { w: 375,  h: 667, q: 'teléfono bajo (rama de pantalla baja)' },
    { w: 390,  h: 844, q: 'teléfono típico' },
    { w: 768,  h: 1024, q: 'tableta' },
    { w: 1366, h: 768, q: 'computadora' }
  ];

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
      /* TODOS los casos, no sólo los que fallaron: es lo que le permite al panel mostrar la lista
         completa con su tilde o su cruz. Ver la lista entera importa — si un caso desaparece
         porque alguien lo borró sin querer, en un reporte que sólo lista fallas no se nota. */
      detalle: casos,
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
