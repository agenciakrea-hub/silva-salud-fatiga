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

  /* 0 · CANDADO DE RED (P183r, 2026-09-17). Ningún pedido de la suite llega al endpoint REAL.
     Lo encontró el verificador de P074: un caso que entra por `onDashData` con credenciales dispara
     `gestCanSync()` → niveles, reportes, opiniones, casos… contra `SHEETS_DASHBOARD_URL`, el
     servidor rechaza la contraseña falsa y SUMA AL FRENO DE FUERZA BRUTA de esa cuenta (60 fallos en
     10 min la frenan). Con el usuario de una empresa real, tres corridas seguidas dejaban al
     supervisor sin poder entrar.
     Todo `fetch` a `script.google.com` (los diez webhooks de Apps Script viven ahí) se corta con una
     promesa que no se resuelve nunca —lo mismo que ya hacía `p043SinRed`— y se cuenta: el reporte y
     el panel dicen cuántos hubo y a dónde iban, así el caso que los provoca se puede arreglar. Un
     caso que quiera otra respuesta stubea `window.fetch` como siempre; al restaurarlo vuelve a este
     candado, no al `fetch` pelado.
     ⚠️ Lo que pasa ANTES de evaluar este archivo (el arranque de la app en el iframe) no lo cubre:
     por eso el arnés limpia `localStorage` antes de cargar (sin perfil no hay `tareas_mias`). */
  if (!window.__redCandado) {
    const fetchReal = window.fetch;
    const cortada = window.__redCortada = { n: 0, urls: [] };
    const esReal = u => /script\.google\.com/.test(String(u && u.url ? u.url : u));
    window.__redCandado = function (url, opts) {
      if (esReal(url)) {
        cortada.n++;
        let s = String(url && url.url ? url.url : url).replace(/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/, '<endpoint>');
        /* Los pedidos del panel van por POST con el cuerpo en JSON: sin mirar `action` y `usuario`
           la lista sería veinte «<endpoint>» iguales y no diría qué caso los provoca. La contraseña
           no se anota nunca. */
        try {
          const cuerpo = opts && opts.body ? String(opts.body) : '';
          const o = cuerpo ? (cuerpo.charAt(0) === '{' ? JSON.parse(cuerpo) : Object.fromEntries(new URLSearchParams(cuerpo))) : null;
          if (o) s += ' POST action=' + (o.action || '?') + (o.usuario ? ' usuario=' + String(o.usuario).slice(0, 24) : '');
        } catch (e) {}
        if (cortada.urls.length < 40) cortada.urls.push(s.replace(/([?&])(pass|sesion)=[^&]*/g, '$1$2=…').slice(0, 160));
        return new Promise(function () {});
      }
      return fetchReal.apply(window, arguments);
    };
    window.fetch = window.__redCandado;
  }

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
        /* ⚠️ La app de atrás ahora arranca OCULTA si no hay perfil completo (N11: si no, se veía
           asomar por detrás de los overlays en cada transición). El arnés simula a alguien YA
           registrado, así que tiene que revelarla — sin esto todo se mide en 0 y media suite da
           rojo por una razón que no existe en la app real. */
        try { appRevelar(true); } catch(e){}
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
    const salteados = [];
    /* P185 · `window.SOLO_CASOS = ['x.js']` en el iframe ANTES de evaluar esto corre sólo esos
       archivos — para trabajar un caso sin esperar los 170. Los demás cuentan como salteados, así
       que la corrida sale INCOMPLETA y no puede pasar por verde: es una herramienta de desarrollo,
       no una forma de correr la suite. */
    const solo = Array.isArray(window.SOLO_CASOS) ? window.SOLO_CASOS : null;
    for (const archivo of lista.casos) {
      if (solo && solo.indexOf(archivo) < 0) { salteados.push(archivo); continue; }
      if (lista.soloConGs && lista.soloConGs.indexOf(archivo) >= 0 && !fuenteGs) { salteados.push(archivo); continue; }
      await cargarScript('casos/' + archivo);
    }

    /* 5 · Correr. */
    const rep = await PRUEBAS.correr();
    rep.duracionMs = Date.now() - t0;
    /* P183r · lo que el candado cortó. No pone la corrida en rojo —el candado está para eso—, pero
       se avisa: cada pedido cortado es un caso que hoy golpearía producción si el candado no estuviera. */
    rep.redCortada = { n: window.__redCortada.n, urls: window.__redCortada.urls.slice() };
    if (window.__redCortada.n) {
      /* resumido por acción y cuenta: «action=supervisor usuario=* ×12», para saber a qué cuenta le
         estaría sumando fallos cada corrida si el candado no estuviera */
      const porClave = {};
      window.__redCortada.urls.forEach(u => { const k = u.replace(/^<endpoint>\??[^ ]*/, '').trim() || u.slice(0, 60); porClave[k] = (porClave[k] || 0) + 1; });
      aviso.push('el candado de red cortó ' + window.__redCortada.n + ' pedido(s) al endpoint real · ' +
        Object.keys(porClave).map(k => k + ' ×' + porClave[k]).join(' · ') +
        ' · algún caso entra por onDashData con credenciales y sin stubear la red (ver rep.redCortada)');
    }
    rep.avisos = aviso;
    rep.version = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '?';
    /* ⚠️ UNA CORRIDA INCOMPLETA NO ES UNA CORRIDA VERDE. Sin el emulador del endpoint levantado se
       saltean 17 archivos —unos 130 casos, más de un tercio del total—, y hasta acá el reporte
       seguía diciendo `ok:true` y el panel titulaba "Todo verde": alguien podía romper el login o
       las sesiones enteras y ver un verde impecable.
       Peor: el caso que debía sonar la alarma (`humo-servidor.js`, que comprueba `CTX.hayGs`) está
       él mismo en la lista de los que no se cargan sin `.gs` — una alarma que se apaga sola cuando
       se cumple su condición.
       Ahora el reporte lo dice y `ok` pasa a false. Correr la suite completa exige `PRUEBAS.sh`. */
    rep.salteados = salteados;
    if (salteados.length) {
      rep.incompleta = true;
      rep.ok = false;
      rep.motivoIncompleta = 'No corrió el emulador del endpoint (servir-gs.py en 8929): se saltearon ' +
        salteados.length + ' archivos de casos. Levantalo con `bash pruebas/PRUEBAS.sh`.';
    }

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
