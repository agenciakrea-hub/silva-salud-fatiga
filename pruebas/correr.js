/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ARRANQUE DE LA SUITE · se ejecuta DENTRO de la app ya cargada           (L2a, 2026-08-27)

   CÓMO SE USA (esto es "el comando"):

       fetch('/pruebas/correr.js').then(r=>r.text()).then(eval)

   Eso descarga este archivo, carga el marco, el emulador, la fuente del endpoint y todos los
   casos, los corre y devuelve el reporte en JSON.

   POR QUÉ CORRE DENTRO DE LA APP Y NO EN UNA PÁGINA APARTE
   Porque la mitad de lo que hay que probar sólo existe en la app viva: que un botón reciba su
   propio toque, que un desplegable no corte contenido con datos reales, que un color tenga
   contraste sobre el fondo que de verdad tiene detrás. Una página de pruebas aislada tendría que
   recrear todo eso, y una recreación que se desincroniza de la app real es peor que nada: da
   verde mientras producción está roja.
   Como efecto secundario, esto resuelve la fricción concreta que motivó L2: el emulador del
   endpoint se perdía en cada `location.reload()` y había que reescribirlo a mano. Ahora se vuelve
   a bajar solo en cada corrida.

   ⚠️ LAS PRUEBAS TOCAN EL ESTADO DE LA APP (localStorage, el perfil, el DOM). Por eso al terminar
   se recarga la página, salvo que se pida lo contrario. Si no, quedaría un perfil de prueba
   guardado en el dispositivo — que en desarrollo confunde y en un teléfono real sería un bug.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

(async function () {
  'use strict';

  const BASE = '/pruebas/';
  /* Se le cuelga la hora a cada pedido para saltar la caché del service worker: sin esto, editar
     un caso y volver a correr te devuelve la versión vieja y jurás que el arreglo no funcionó. */
  const sinCache = u => u + (u.indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now();

  async function bajar(ruta) {
    const r = await fetch(sinCache(BASE + ruta));
    if (!r.ok) throw new Error('no se pudo bajar ' + ruta + ' (HTTP ' + r.status + ')');
    return r.text();
  }

  async function cargarScript(ruta) {
    const src = await bajar(ruta);
    try {
      (0, eval)(src);
    } catch (e) {
      throw new Error('error al cargar ' + ruta + ': ' + e.message);
    }
  }

  const t0 = Date.now();
  const aviso = [];

  try {
    /* 1 · El marco y el emulador. */
    await cargarScript('marco.js');
    await cargarScript('emulador-gs.js');
    PRUEBAS.limpiar();

    /* 2 · La fuente del endpoint.
       El `.gs` vive FUERA de este repo a propósito (trae la clave de Gemini y el repo es
       público), así que no se puede pedir por HTTP desde acá: está fuera de la raíz que sirve el
       servidor. Lo sirve un servidor chiquito aparte —`servir-gs.py`— que expone SÓLO ese archivo
       y en localhost. Si no está levantado, los casos de cliente igual corren y los de servidor
       se saltan con un aviso: media suite es mejor que ninguna. */
    let fuenteGs = null;
    try {
      const r = await fetch('http://127.0.0.1:8929/endpoint?v=' + Date.now());
      if (r.ok) fuenteGs = await r.text();
      else aviso.push('el servidor del .gs respondió HTTP ' + r.status);
    } catch (e) {
      aviso.push('los casos del ENDPOINT se saltaron: no está levantado servir-gs.py ' +
        '(correr: python pruebas/servir-gs.py)');
    }

    /* 3 · Contexto que reciben todos los casos. */
    window.CTX = {
      gs: fuenteGs,
      hayGs: !!fuenteGs,
      /* Deja la app en un estado conocido. Los casos que necesitan otra cosa lo cambian, pero
         arrancar siempre igual es lo que hace que una falla sea reproducible. */
      resetear: function (perfil) {
        localStorage.clear();
        document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
        /* ⚠️ Al arrancar, la app dispara `tareasCargar()` contra el endpoint real y deja
           `TAREAS.cargando = true` hasta que conteste — y eso tarda de 2,5 a 5 segundos. La suite
           entera corre en menos de 1 s, o sea DENTRO de esa ventana: todo lo que dependa de ese
           flag da distinto según lo rápida que esté la red. Ya hizo fallar la prueba de la caché de
           M2, que aislada pasaba. Una prueba que depende de la red es peor que una que falla:
           hace desconfiar de la suite entera. */
        try { if (typeof TAREAS === 'object' && TAREAS) TAREAS.cargando = false; } catch (e) {}
        localStorage.setItem('silva_fatiga_consent_v1', JSON.stringify({ ok: 1 }));
        setProfile(Object.assign({
          nombre: 'Persona De Prueba', cedula: '00000000', empresa: 'Empresa De Prueba',
          departamento: 'Operaciones', cargo: 'Piloto', esPiloto: true
        }, perfil || {}));
        paintProfile();
        renderSections();
      },
      /* Contraste WCAG. Está acá y no en cada caso porque ya lo escribí a mano cuatro veces en
         esta sesión y una de esas veces con un detector que miraba mal el fondo. */
      contraste: function (colorA, colorB) {
        const lum = c => {
          const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
        };
        const rgb = s => (String(s).match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
        const [x, y] = [lum(rgb(colorA)), lum(rgb(colorB))].sort((p, q) => q - p);
        return +((x + 0.05) / (y + 0.05)).toFixed(2);
      },
      /* Resuelve un token (`var(--loquesea)`) al color real que el navegador calcula. */
      token: function (expr) {
        const p = document.createElement('div');
        document.body.appendChild(p);
        p.style.color = expr;
        const v = getComputedStyle(p).color;
        p.remove();
        return v;
      }
    };

    /* 4 · Los casos. La lista es un archivo y no un listado de directorio porque por HTTP no se
       puede listar una carpeta. Agregar un caso = crear el archivo y sumarlo ahí. */
    const lista = JSON.parse(await bajar('casos.json'));
    for (const archivo of lista.casos) {
      if (lista.soloConGs && lista.soloConGs.indexOf(archivo) >= 0 && !fuenteGs) continue;
      await cargarScript('casos/' + archivo);
    }

    /* 5 · Correr. */
    const rep = await PRUEBAS.correr();
    rep.duracionMs = Date.now() - t0;
    rep.avisos = aviso;
    rep.version = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '?';

    console.log('%c' + (rep.ok ? '✅ TODO VERDE' : '❌ HAY FALLAS'),
      'font-weight:bold;font-size:14px;color:' + (rep.ok ? 'green' : 'red'));
    console.log(rep);
    window.__ULTIMO_REPORTE = rep;
    return JSON.stringify(rep, null, 1);

  } catch (e) {
    const err = { ok: false, errorDeArranque: e.message, avisos: aviso };
    console.error('La suite no pudo arrancar:', e);
    window.__ULTIMO_REPORTE = err;
    return JSON.stringify(err, null, 1);
  }
})()
