PRUEBAS.grupo('R14b · las etiquetas de carga pasan por t(), no quedan fijas en español');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   DOS prompts chicos de texto/i18n, juntos porque los dos tocan lo mismo (el diccionario y la
   pantalla de entrada):

   R14b · el informe decía CINCO llamadas a `btnSpin(btn, true, '…')` con la etiqueta en español
   escrita a mano en vez de `t('clave')`: "Confirmando…", "Verificando…", "Entrando…" (×2),
   "Abriendo ejemplo…". Al buscar TODAS las llamadas con `grep -n "btnSpin("` antes de tocar nada
   apareció una SEXTA que el informe no traía: `cicloCfgGuardar()` (guardar las horas del ciclo,
   dentro del panel del supervisor) tenía `btnSpin(btn, true, 'Guardando…')` — con la clave
   `guardando` ya existiendo en el diccionario y ya usada por otros seis botones. Las seis quedan
   cubiertas acá, no sólo las cinco reportadas.

   P043 · el botón de idioma del splash ("ES"/"EN", arriba a la derecha) no decía qué hacía. Ahora
   tiene debajo una pista suave que alterna "Idioma" ⇄ "Language" en bucle — las dos traducciones
   de la MISMA clave del diccionario (`idioma`), no un texto propio. Con movimiento reducido (el
   del sistema O `html.sin-animaciones`, el interruptor propio de la app) queda FIJA mostrando la
   palabra del idioma vigente.

   ⚠️ R17 EN LOS DOS BLOQUES:
   · Las etiquetas se comprueban disparando la función REAL (`nominaConfirmar()`,
     `admEntrar(btn)`, etc.) con la app en inglés y leyendo lo que queda en el botón — nunca
     comparando cadenas del diccionario entre sí, que es lo que dejaría pasar un `btnSpin` que
     ignora `t()` y por casualidad muestra algo parecido.
   · La pista de idioma se prueba llamando a `splashLangHintArrancar()`/`Frenar()`, que son las
     mismas funciones que cuelgan de `splashMostrar()` — la conexión con el arranque real se
     comprueba aparte, leyendo el código fuente de `splashMostrar`, para no depender de abrir el
     splash completo (con sus animaciones y su overlay) en cada caso.

   ⚠️ TRAMPA DEL ENTORNO (ver pruebas/LEEME.md): la pestaña de pruebas está oculta de forma
   permanente, así que `requestAnimationFrame` no dispara nunca y `setTimeout` real queda
   estrangulado. La alternancia de la pista se prueba con RELOJ FALSO (mismo patrón que
   `p044-cargadores.js`), nunca esperando de verdad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Corre `paso()` con `window.fetch` reemplazado por uno que NUNCA resuelve. Sólo interesa el
   pintado SINCRÓNICO que hace `btnSpin(btn, true, etiqueta)` — pasa antes de que cualquier
   respuesta pueda llegar —, así que no hace falta simular ninguna. Se restaura pase lo que pase. */
function p043SinRed(paso) {
  const oFetch = window.fetch;
  window.fetch = function () { return new Promise(function () {}); };
  try { return paso(); }
  finally { window.fetch = oFetch; }
}

/* Cada caso deja la app EXACTAMENTE como la encontró: idioma, overlays, campos y el botón mismo
   (un `btnSpin(btn, true, …)` sin su `false` deja el botón deshabilitado para el resto de la
   suite). `armar()` prepara el escenario mínimo y devuelve el botón; `desarmar()` lo deshace. */
function p043Etiqueta(armar, disparar, desarmar) {
  const previo = idiomaActual();
  let btn = null;
  let texto = null;
  try {
    fijarIdioma('en');
    btn = armar();
    p043SinRed(() => disparar(btn));
    texto = btn.textContent;
  } finally {
    if (btn) btnSpin(btn, false);
    desarmar();
    fijarIdioma(previo);
  }
  return texto;
}

PRUEBAS.caso('"Confirmar y entrar" (alta de nómina): sale de t(\'nom_confirmando\')', () => {
  const ov = document.getElementById('nominaOv');
  const p1 = document.getElementById('nomPaso1'), p3 = document.getElementById('nomPaso3');
  const teniaOv = ov.classList.contains('show');
  const p1Antes = p1.style.display, p3Antes = p3.style.display;
  const texto = p043Etiqueta(
    () => {
      ov.classList.add('show'); p1.style.display = 'none'; p3.style.display = '';
      nominaEl('nomCedula').value = '12345678';
      return nominaEl('nomBtnConfirmar');
    },
    () => nominaConfirmar(),
    () => {
      p1.style.display = p1Antes; p3.style.display = p3Antes;
      if (!teniaOv) ov.classList.remove('show');
    }
  );
  PRUEBAS.igual(texto, 'Confirming…',
    'estaba fijo en "Confirmando…" sin importar el idioma; con la app en inglés eso se leía en ' +
    'español. Ahora sale de t(\'nom_confirmando\') — clave nueva, junto a nom_cedula_btn');
});

PRUEBAS.caso('acceso de administrador: sale de t(\'adm_verificando\')', () => {
  const texto = p043Etiqueta(
    () => { document.getElementById('admPass').value = 'clave-de-prueba'; return document.querySelector('#admBox .save-btn'); },
    (btn) => admEntrar(btn),
    () => { document.getElementById('admPass').value = ''; }
  );
  PRUEBAS.igual(texto, 'Verifying…',
    'estaba fijo en "Verificando…". Clave nueva adm_verificando, junto a adm_pass en el diccionario');
});

PRUEBAS.caso('portal · "Entrar" (supervisor/servicio médico): sale de t(\'lgn_entrando\'), la clave que YA existía', () => {
  const texto = p043Etiqueta(
    () => {
      document.getElementById('pEmpresa').value = 'empresatest';
      document.getElementById('pPass').value = 'clave-de-prueba';
      return document.querySelector('#portalSup .save-btn');
    },
    (btn) => portalLoginSupervisor(btn),
    () => { document.getElementById('pEmpresa').value = ''; document.getElementById('pPass').value = ''; }
  );
  PRUEBAS.igual(texto, 'Signing in…',
    'estaba fijo en "Entrando…" aunque la clave lgn_entrando (usada por el login de personal, ' +
    'lgnEntrar()) ya resolvía exactamente ese texto — el patrón correcto ya estaba, sólo no se usaba acá');
});

PRUEBAS.caso('portal · "Ver demostración con datos simulados": sale de t(\'pg_demo_abriendo\')', () => {
  /* P171 · con un payload de la demostración en memoria, «Ingresar» no viaja y el botón no gira:
     acá se mide la etiqueta del CAMINO CON RED, así que se parte sin payload. */
  const payPrev = DEMO_PAYLOAD; DEMO_PAYLOAD = null;
  const texto = p043Etiqueta(
    () => document.getElementById('portalDemoBtn'),
    (btn) => portalVerDemo(btn),
    () => { DEMO_PAYLOAD = payPrev; }
  );
  PRUEBAS.igual(texto, 'Opening example…',
    'estaba fijo en "Abriendo ejemplo…". Clave nueva pg_demo_abriendo, junto a pg_demo_pass_mal');
});

PRUEBAS.caso('portal · "Entrar como administrador": sale de t(\'lgn_entrando\')', () => {
  const texto = p043Etiqueta(
    () => { document.getElementById('pAdminPass').value = 'clave-de-prueba'; return document.querySelector('#adminBox .save-btn'); },
    (btn) => portalLoginAdmin(btn),
    () => { document.getElementById('pAdminPass').value = ''; }
  );
  PRUEBAS.igual(texto, 'Signing in…', 'era la segunda de las dos "Entrando…" fijas que reportó el informe');
});

PRUEBAS.caso('⚠️ ciclo operativo · "Guardar para toda la empresa": SEXTA llamada, no estaba en el informe', () => {
  /* No hace falta armar el panel del supervisor a mano (R17): se entra por onDashData(), el único
     camino real por el que el panel recibe datos — igual que hacen A4 y P089. `window.fetch` se
     reemplaza ANTES de llamar, porque con credenciales presentes gestCanSync() dispara pedidos
     laterales (niveles/gestiones) que acá no vienen al caso y no tienen por qué golpear una red
     de verdad. Los campos de horas salen PRECARGADOS con valores válidos (60/720/60/600), así que
     no hace falta escribir nada para llegar al btnSpin. */
  const dashPrevio = (typeof DASH !== 'undefined') ? DASH : null;
  const abiertoPrevio = (typeof CICLO_CFG_ABIERTO !== 'undefined') ? CICLO_CFG_ABIERTO : false;
  const previo = idiomaActual();
  let texto = null;
  try {
    fijarIdioma('en');
    p043SinRed(() => {
      const payload = { ok: true, rol: 'supervisor', metricas: ['kss'],
        registros: [{ persona: 'Persona P043', empresa: 'Empresa P043', departamento: 'Operaciones', cargo: 'Piloto', kss: 4 }],
        operacional: [] };
      onDashData(payload, 'Empresa P043', { usuario: 'usuario-p043', pass: 'clave-p043' }, 'supervisor');
      if (!CICLO_CFG_ABIERTO) cicloCfgToggle();   // abre el editor: es acá donde viven los cicCfg_*
      const btn = document.querySelector('.cic-cfg-ok');
      /* P074 · guardar lo mismo ya no manda nada, y guardar algo distinto pide confirmación (R8):
         se cambia un tramo y se contesta que sí, para llegar al `btnSpin` que este caso mide. */
      const jor = document.getElementById('cicCfg_jornada'); if (jor) jor.value = Number(jor.value) + 5;
      const oC = window.confirm; window.confirm = () => true;
      try { cicloCfgGuardar(btn); } finally { window.confirm = oC; }
      texto = btn.textContent;
      btnSpin(btn, false);
    });
  } finally {
    try { if (CICLO_CFG_ABIERTO) cicloCfgToggle(); } catch (e) {}
    CICLO_CFG_ABIERTO = abiertoPrevio;
    DASH = dashPrevio;
    fijarIdioma(previo);
  }
  PRUEBAS.igual(texto, 'Saving…',
    'estaba fijo en "Guardando…" pese a que la clave guardando YA existe y ya la usan otros seis ' +
    'botones del archivo — es la llamada que el informe no traía. Se reutiliza esa clave, no se crea una nueva');
});

PRUEBAS.caso('⚠️ no queda ningún btnSpin(…, true, …) con una etiqueta en español escrita a mano', () => {
  /* Discriminador permanente: no protege sólo a los seis de arriba, protege contra el PRÓXIMO
     btnSpin(btn, true, 'texto') que alguien agregue sin pasar por t(). btnSpin(btn, false) no
     lleva tercer argumento y no matchea; btnSpin(btn, true, t('clave')) tampoco, porque el tercer
     argumento no es una cadena literal entre comillas. */
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  const literales = fuente.match(/btnSpin\([^,]+,\s*true\s*,\s*['"][^'"]*['"]\s*\)/g) || [];
  PRUEBAS.igual(literales, [],
    'cada btnSpin(btn, true, …) tiene que recibir t(\'clave\'), no un texto fijo: en inglés se ' +
    'seguiría viendo en español (R14). Encontrados: ' + JSON.stringify(literales));
});


PRUEBAS.grupo('P043 · la pista de idioma en el splash ("Idioma" ⇄ "Language")');

/* Reloj falso: mismo patrón que `p044RelojFalso` en p044-cargadores.js (nombre distinto para no
   chocar — todos los casos comparten el mismo scope global). Reemplaza setTimeout/clearTimeout
   por una cola que sólo avanza cuando el caso lo pide, así la alternancia se prueba sin esperar de
   verdad (acá los temporizadores reales quedan estrangulados con la pestaña oculta). */
function p043RelojFalso() {
  const setTimeoutOriginal = window.setTimeout, clearTimeoutOriginal = window.clearTimeout;
  let ahora = 0, nextId = 1;
  const pendientes = [];
  window.setTimeout = function (fn, ms) {
    const id = nextId++;
    pendientes.push({ id: id, fn: fn, cuando: ahora + (ms || 0) });
    return id;
  };
  window.clearTimeout = function (id) {
    const i = pendientes.findIndex(p => p.id === id);
    if (i >= 0) pendientes.splice(i, 1);
  };
  return {
    avanzar: function (ms) {
      ahora += ms;
      let corrio = true;
      while (corrio) {
        corrio = false;
        for (let i = 0; i < pendientes.length; i++) {
          if (pendientes[i].cuando <= ahora) {
            const p = pendientes.splice(i, 1)[0];
            p.fn();
            corrio = true;
            break;
          }
        }
      }
    },
    restaurar: function () { window.setTimeout = setTimeoutOriginal; window.clearTimeout = clearTimeoutOriginal; }
  };
}

/* Deja la pista en un estado conocido y la devuelve como la encontró: frena cualquier cadena
   viva, corre `fn(hint)`, y siempre frena + restaura idioma/clase al salir — incluso si `fn` tira.
   ⚠️ ES `async` Y EL `await` DE ABAJO NO ES COSMÉTICO (mismo motivo que `p044ConAlta` en
   p044-cargadores.js): si `fn` fuera async y esto no la esperara, el `finally` restauraría el
   idioma y la clase A MITAD de `fn`, justo antes de que pueda leer el efecto que vino a medir. */
async function p043ConPista(sinAnimacionesQueda, idioma, fn) {
  const html = document.documentElement;
  const teniaSinAnim = html.classList.contains('sin-animaciones');
  const idiomaPrevio = idiomaActual();
  splashLangHintFrenar();
  html.classList.toggle('sin-animaciones', !!sinAnimacionesQueda);
  fijarIdioma(idioma);
  const hint = document.getElementById('splashLangHint');
  try { return await fn(hint); }
  finally {
    splashLangHintFrenar();
    html.classList.toggle('sin-animaciones', teniaSinAnim);
    fijarIdioma(idiomaPrevio);
  }
}
/* Cede el turno a los microtasks ya resueltos (el callback de un MutationObserver se encola como
   microtask, no corre sincrónico) sin usar un temporizador — mismo motivo que `p044Tick`: con la
   pestaña oculta un `setTimeout` corto puede tardar segundos de verdad. */
async function p043Tick(n) { for (let i = 0; i < (n || 10); i++) await Promise.resolve(); }

PRUEBAS.caso('⚠️ guarda de medibilidad: el elemento existe y mide algo real cuando el splash está abierto', () => {
  /* Sin esto, un caso que sólo mira `.textContent` daría verde aunque la pista estuviera
     `display:none` o colapsada a 0×0 — ya pasó cuatro veces en esta suite (ver LEEME.md). */
  const ov = document.getElementById('splashOv');
  const teniaOv = ov.classList.contains('show');
  ov.classList.add('show');
  let r;
  try {
    const hint = document.getElementById('splashLangHint');
    PRUEBAS.cierto(!!hint, 'el elemento #splashLangHint tiene que existir en el marcado');
    r = hint.getBoundingClientRect();
  } finally { if (!teniaOv) ov.classList.remove('show'); }
  PRUEBAS.alMenos(r.width, 1, 'ancho real: si mide 0, ningún otro caso de este bloque prueba nada');
  PRUEBAS.alMenos(r.height, 1, 'alto real, mismo motivo');
});

PRUEBAS.caso('⚠️ arranca mostrando la palabra del idioma vigente, sin alternar todavía', async () => {
  const t1 = await p043ConPista(false, 'es', (hint) => { splashLangHintArrancar(); return hint.textContent; });
  const t2 = await p043ConPista(false, 'en', (hint) => { splashLangHintArrancar(); return hint.textContent; });
  PRUEBAS.igual(t1, 'Idioma', 'con la app en español, el primer pintado es "Idioma"');
  PRUEBAS.igual(t2, 'Language', 'con la app en inglés, el primer pintado es "Language" — no arranca siempre en el mismo idioma');
});

PRUEBAS.caso('⚠️ con movimiento permitido, alterna "Idioma" ⇄ "Language" con una pausa legible — es un BUCLE', async () => {
  const reloj = p043RelojFalso();
  let inicial, segundo, tercero, cuarto;
  try {
    await p043ConPista(false, 'es', (hint) => {
      splashLangHintArrancar();
      inicial = hint.textContent;
      reloj.avanzar(2200); segundo = hint.textContent;
      reloj.avanzar(2200); tercero = hint.textContent;
      reloj.avanzar(2200); cuarto = hint.textContent;
    });
  } finally { reloj.restaurar(); }
  PRUEBAS.igual(inicial, 'Idioma', 'primer pintado: el idioma vigente');
  PRUEBAS.igual(segundo, 'Language', 'después de la pausa, la otra palabra');
  PRUEBAS.igual(tercero, 'Idioma', '⚠️ discriminador de "bucle": vuelve a la primera — si sólo alternara una vez, acá quedaría en "Language"');
  PRUEBAS.igual(cuarto, 'Language', 'y sigue: tercera vuelta, no se apaga sola');
});

PRUEBAS.caso('⚠️ con movimiento reducido (html.sin-animaciones) queda FIJA en el idioma vigente, nunca alterna', async () => {
  const reloj = p043RelojFalso();
  let t0, t1, t2, t3;
  try {
    await p043ConPista(true, 'en', (hint) => {
      splashLangHintArrancar();
      t0 = hint.textContent;
      reloj.avanzar(2200); t1 = hint.textContent;
      reloj.avanzar(2200); t2 = hint.textContent;
      reloj.avanzar(60000); t3 = hint.textContent;   // mucho después: no es "alterna lento", es que no alterna
    });
  } finally { reloj.restaurar(); }
  PRUEBAS.igual(t0, 'Language', 'con la app en inglés y movimiento reducido, muestra "Language"');
  PRUEBAS.igual(t1, 'Language', 'sigue igual pasada la pausa en la que, animada, ya habría alternado');
  PRUEBAS.igual(t2, 'Language', 'y sigue');
  PRUEBAS.igual(t3, 'Language', 'y sigue mucho después: nunca alterna con movimiento reducido');
});

PRUEBAS.caso('⚠️ congelada, cambiar de idioma la actualiza AL TOQUE (splashLangHintResync, colgado de aplicarIdioma)', async () => {
  /* Este caso encontró un bug real: `est.parado` sólo pasaba a `true` cuando corría el PRIMER
     `ciclo()`, 2200 ms después de arrancar. Cambiar de idioma en ESE hueco (como acá, que arma y
     cambia en el mismo instante) no se reflejaba — a mano nunca se veía porque entre una llamada y
     otra pasaban varios segundos reales y el tick ya había corrido. El arreglo decide "quieto" de
     entrada, no en el primer tick. */
  const resultado = await p043ConPista(true, 'es', (hint) => {
    splashLangHintArrancar();
    const antes = hint.textContent;
    fijarIdioma('en');   // dispara aplicarIdioma(), que llama a splashLangHintResync()
    const despues = hint.textContent;
    return { antes: antes, despues: despues };
  });
  PRUEBAS.igual(resultado.antes, 'Idioma', 'arranca fija en el idioma vigente (español)');
  PRUEBAS.igual(resultado.despues, 'Language',
    'y cambia SOLA al tocar el chip ES/EN — sin este enganche, quedaría diciendo "Idioma" con la app ya en inglés');
});

PRUEBAS.caso('⚠️ si arranca quieta, el observer queda armado igual: habilitar el movimiento después la retoma', async () => {
  /* Compañero del caso anterior: mismo arreglo, otro ángulo. `splashLangHintArrancar()` tenía un
     `return` temprano cuando arrancaba quieta, y ese `return` se llevaba puesto el registro del
     MutationObserver de más abajo — la pista quedaba congelada PARA SIEMPRE, sin nadie escuchando
     si el movimiento se habilitaba después. Se comprueba sacando `.sin-animaciones` después de
     arrancar y viendo que la pista reacciona SOLA (nadie vuelve a llamar a splashLangHintArrancar). */
  const resultado = await p043ConPista(true, 'es', async (hint) => {
    splashLangHintArrancar();
    const antes = hint.textContent;
    document.documentElement.classList.remove('sin-animaciones');   // dispara el MutationObserver
    await p043Tick();   // el callback del observer se encola como microtask, no corre sincrónico
    const despues = hint.textContent;
    document.documentElement.classList.add('sin-animaciones');      // vuelve a dejarla quieta antes del finally
    return { antes: antes, despues: despues };
  });
  PRUEBAS.igual(resultado.antes, 'Idioma', 'arranca quieta, mostrando el idioma vigente');
  PRUEBAS.igual(resultado.despues, 'Language',
    '⚠️ si el observer no se hubiera registrado (por el `return` temprano), esto seguiría diciendo "Idioma"');
});

PRUEBAS.caso('la pista NUNCA queda alternando de fondo: splashMostrar/splashAbrirPortal/carruselMostrar frenan la cadena vieja', () => {
  /* Fuente, no ejecución: entrar de verdad a splashMostrar() dispara animaciones y toca el overlay
     completo, que no es lo que este caso quiere medir. Se comprueba que las tres funciones que
     ocultan o reabren el splash LLAMEN a splashLangHintFrenar() — mismo criterio que ya usa este
     archivo para _splAnim/splashAnimFrenar (ver m5-coherencia-visual.js). */
  /* P183 · antes leía `.toString()` de las tres. Ahora se llaman con los frenos y el arranque
     espiados (el arranque espiado no dispara nada: no se anima nada de verdad) y se mira el orden. */
  const oFrenar = window.splashLangHintFrenar, oArrancar = window.splashLangHintArrancar, oAnimF = window.splashAnimFrenar, oAnimA = window.splashAnimArrancar, oNav = window.navConsumir, oPush = history.pushState;
  const orden = [];
  try {
    window.splashLangHintFrenar = () => { orden.push('frenar'); }; window.splashLangHintArrancar = () => { orden.push('arrancar'); };
    window.splashAnimFrenar = () => {}; window.splashAnimArrancar = () => {}; window.navConsumir = () => {}; history.pushState = () => {};
    splashMostrar();
    PRUEBAS.cierto(orden.indexOf('frenar') >= 0 && orden.indexOf('arrancar') > orden.indexOf('frenar'), 'splashMostrar() frena ANTES de arrancar — si no, dos aperturas seguidas dejarían DOS cadenas vivas (' + orden.join('→') + ')');
    orden.length = 0; splashAbrirPortal();
    PRUEBAS.cierto(orden.indexOf('frenar') >= 0, 'splashAbrirPortal() la frena: es uno de los caminos por los que el splash se oculta de verdad');
    orden.length = 0; carruselMostrar();
    PRUEBAS.cierto(orden.indexOf('frenar') >= 0, 'carruselMostrar() también: si no, tocar «Ingresar» dejaría la cadena corriendo detrás del carrusel');
  } finally {
    window.splashLangHintFrenar = oFrenar; window.splashLangHintArrancar = oArrancar; window.splashAnimFrenar = oAnimF; window.splashAnimArrancar = oAnimA; window.navConsumir = oNav; history.pushState = oPush;
    ['splashOv', 'portalOverlay', 'carruselOv'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('show'); });
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('⚠️ la guarda de quieto revisa las DOS condiciones — el sistema Y el interruptor propio de la app', () => {
  /* No se puede emular prefers-reduced-motion en esta pestaña (ver LEEME.md), así que se comprueba
     sobre el CÓDIGO que las dos condiciones están, en vez de sólo una — que es exactamente el tipo
     de regresión que colaría "quedó fijo con el interruptor de la app pero sigue parpadeando si el
     SISTEMA pide movimiento reducido", o viceversa. */
  /* P183 · antes leía `.toString()`. No se puede emular prefers-reduced-motion en esta pestaña
     (LEEME), pero sí se puede reemplazar `matchMedia` por uno que diga que el SISTEMA lo pide: la
     guarda tiene que responder a cada una de las dos condiciones por separado. */
  const oMM = window.matchMedia, html = document.documentElement, tenia = html.classList.contains('sin-animaciones');
  try {
    window.matchMedia = q => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
    html.classList.remove('sin-animaciones');
    PRUEBAS.igual(splashLangHintQuieto(), false, 'guarda: sin ninguna de las dos, no está quieta');
    html.classList.add('sin-animaciones');
    PRUEBAS.igual(splashLangHintQuieto(), true, 'con el interruptor propio de la app (html.sin-animaciones) queda quieta');
    html.classList.remove('sin-animaciones');
    window.matchMedia = q => ({ matches: /prefers-reduced-motion/.test(q), media: q, addEventListener: () => {}, removeEventListener: () => {} });
    PRUEBAS.igual(splashLangHintQuieto(), true, 'y con el SISTEMA pidiendo movimiento reducido, también — las dos condiciones, cada una sola');
  } finally { window.matchMedia = oMM; if (tenia) html.classList.add('sin-animaciones'); else html.classList.remove('sin-animaciones'); }
});

PRUEBAS.caso('⚠️ la pista se re-arma sola si el movimiento se habilita mientras estaba quieta (MutationObserver)', () => {
  /* Mismo motivo que splashAnimArrancar (N10): si la pestaña carga oculta, `.sin-animaciones` se
     pone SOLA al arranque, y sin esto la pista quedaría fija para siempre aunque el movimiento ya
     estuviera permitido — el mismo síntoma que el usuario reportó para la tira del splash. */
  /* P183 · antes leía `.toString()`. Ahora se arranca la pista con el movimiento apagado (queda
     parada), se habilita el movimiento cambiando la clase del `<html>`, y se espera a que la pista
     cambie de palabra sola: eso es el observer. Se espera una condición observable, no tiempo. */
  const html = document.documentElement, tenia = html.classList.contains('sin-animaciones'), oMM = window.matchMedia;
  const el = document.getElementById('splashLangHint');
  return (async () => {
    try {
      window.matchMedia = q => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
      splashLangHintFrenar();
      html.classList.add('sin-animaciones');
      splashLangHintArrancar();
      PRUEBAS.cierto(!!_splLangHint && _splLangHint.parado === true, 'guarda: con el movimiento apagado la pista arranca PARADA, no abandonada');
      const antes = el.dataset.muestra;
      html.classList.remove('sin-animaciones');
      const cambio = await PRUEBAS.esperarA(() => el.dataset.muestra !== antes, 2500);
      PRUEBAS.cierto(cambio, '⚠️ al habilitar el movimiento, la pista se re-arma sola y cambia de palabra (' + antes + ' → ' + el.dataset.muestra + ')');
      PRUEBAS.cierto(_splLangHint && _splLangHint.parado === false, 'y ya no está parada');
      /* discriminador: una cadena vieja no sigue viva — frenar y arrancar de nuevo deja UNA */
      const vieja = _splLangHint; splashLangHintFrenar(); splashLangHintArrancar();
      PRUEBAS.cierto(vieja.vivo === false && _splLangHint !== vieja, 'una cadena frenada queda muerta y la nueva es otra');
    } finally {
      splashLangHintFrenar(); window.matchMedia = oMM;
      if (tenia) html.classList.add('sin-animaciones'); else html.classList.remove('sin-animaciones');
    }
  })();
});

PRUEBAS.caso('el estado global se declara SIN asignar (R16): "= null" pisaría lo que ya arrancó', () => {
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  PRUEBAS.cierto(/^var _splLangHint;\s*$/m.test(fuente),
    'declarada sin valor: con "= null" más abajo en el archivo, esa línea pisaría el estado que splashLangHintArrancar() ya hubiera guardado');
  PRUEBAS.falso(/^var _splLangHint\s*=/m.test(fuente), 'y no puede volver a llevar asignación');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P302 · LO QUE LA GEOMETRÍA PONE DEBAJO DE LA PISTA, Y DÓNDE QUEDA RESPECTO DEL CHIP
   Lo usan este archivo y `f001-f003-reportes-de-franco.js`. Son `function` a propósito: las `const`
   de un archivo de casos no se ven desde otro (LEEME, «Cómo agregar un caso»).

   ⚠️ POR QUÉ NO `backgroundColor` NI `elementsFromPoint`. Con eso se dieron por buenos `F007` y `F034`,
   dos veces: debajo de la pista hay un `::after` (que `elementsFromPoint` no devuelve) o un degradé
   (que es `background-image`, no `backgroundColor`), y los dos instrumentos caían en el navy del
   overlay, que no se ve ahí en ningún ancho. Acá se arma la pila de lo que pinta en cada punto de la
   caja del texto, de arriba hacia abajo, cada capa con su color y su caja:
     1. el fondo propio de la pista y el de sus envoltorios, si alguno lo tuviera;
     2. los círculos de la banda (`::after` arriba de `::before`, por su `z-index`), recortados por la
        banda y en TODA su deriva. La deriva sale de la hoja de estilos —las reglas que le ponen una
        animación al pseudoelemento y sus `@keyframes`—, no del estado del momento: en esta pestaña
        oculta `.sin-animaciones` la apaga, y quien tiene movimiento SÍ la ve;
     3. el degradé de `.splash-wrap`, evaluado en esa x, y su `background-color`;
     4. el fondo del overlay, que es lo último.
   Una capa que tapa el punto SIEMPRE corta la pila. Una que lo tapa A VECES (un círculo que al derivar
   entra y sale de él) suma su color y deja ver la de abajo: la pista tiene que leerse sobre las dos.
   El píxel de verdad está en `pruebas/medir-pista-idioma.js` (la suite no rasteriza, R11); este
   modelo se calibró contra él en P302 (`docs/specs/P302/`, fuera del repo).
   ⚠️ Lo que el modelo no conoce no se adivina: otro elemento que pinte en ese punto, un degradé que no
   sabe leer o una capa con transparencia parcial van a `sinModelar`, y el caso se pone rojo por eso.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
function p043Rgba(css) {
  const m = String(css).match(/[\d.]+/g) || [];
  return [+m[0] || 0, +m[1] || 0, +m[2] || 0, m.length >= 4 ? +m[3] : 1];
}
function p043RgbTexto(c) { return 'rgb(' + c.slice(0, 3).map(v => Math.round(v)).join(', ') + ')'; }

/* Las reglas de estilo de un texto CSS, a cualquier profundidad (adentro de `@media` también), como
   { sel, decl }. Sin comentarios y saltando las cadenas, para que una llave adentro de un texto no
   desarme el recorrido. */
function p043CssReglas(texto) {
  const s = String(texto).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = [], pila = [];
  let ini = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'") { const j = s.indexOf(ch, i + 1); i = j < 0 ? s.length : j; continue; }
    if (ch === '{') { pila.push({ pre: s.slice(ini, i).trim(), desde: i + 1 }); ini = i + 1; }
    else if (ch === '}') { const b = pila.pop(); if (b && b.pre && b.pre[0] !== '@') out.push({ sel: b.pre, decl: s.slice(b.desde, i) }); ini = i + 1; }
    else if (ch === ';') ini = i + 1;
  }
  return out;
}
/* Las animaciones que alguna regla le pone a `el::<nombre>` y los traslados de sus `@keyframes`, sin
   resolver todavía los porcentajes (dependen del tamaño del pseudoelemento en cada ancho).
   ⚠️ EL NOMBRE DE LA ANIMACIÓN SE LEE DEL TEXTO DE LA HOJA, NO DEL CSSOM, y no por gusto. La regla es
   `animation: entDeriva var(--dur-deriva) …` y la sigue un `animation-delay` en el mismo bloque: con un
   `var()` adentro, Chrome guarda los largos de `animation` como «pendientes de sustitución» y el CSSOM
   los devuelve VACÍOS (`animation-name: ;`, medido en P302). Y el estilo calculado tampoco sirve: acá
   la apagan `.sin-animaciones` y, en una máquina con movimiento reducido, la propia media query. Los
   `@keyframes` sí se leen del CSSOM: no llevan `var()`. */
function p043DerivaReglas(el, nombre) {
  const fin = new RegExp('::?' + nombre + '$');
  const kf = {};
  const recorrer = (reglas, f) => { for (const r of reglas) { f(r); if (r.cssRules && !(r instanceof CSSKeyframesRule)) recorrer(r.cssRules, f); } };
  for (const s of document.styleSheets) {
    try { recorrer(s.cssRules, r => { if (r instanceof CSSKeyframesRule) kf[r.name] = r; }); } catch (e) {}
  }
  const nombres = new Set();
  [...document.querySelectorAll('style')].forEach(st => p043CssReglas(st.textContent).forEach(r => {
    const decls = (r.decl.match(/(^|;)\s*animation(-name)?\s*:[^;]*/g) || []).join(' ');
    if (!decls) return;
    r.sel.split(',').forEach(sel => {
      sel = sel.trim();
      if (!fin.test(sel)) return;
      let ok = false;
      try { ok = el.matches(sel.replace(fin, '') || '*'); } catch (e) { ok = false; }
      if (!ok) return;
      decls.split(/[\s,:;]+/).forEach(t => { if (kf[t]) nombres.add(t); });
    });
  }));
  const caminos = [];
  nombres.forEach(n => {
    const pasos = [];
    for (const k of kf[n].cssRules) {
      const tr = { transform: (k.style.getPropertyValue('transform') || '').trim(), translate: (k.style.getPropertyValue('translate') || '').trim() };
      k.keyText.split(',').forEach(x => { x = x.trim(); pasos.push({ en: x === 'from' ? 0 : x === 'to' ? 100 : parseFloat(x), tr }); });
    }
    pasos.sort((a, b) => a.en - b.en);
    caminos.push({ nombre: n, pasos });
  });
  return { nombres: [...nombres], caminos };
}
/* Un traslado de keyframe, en px. `null` si es una transformación que este modelo no sabe recorrer. */
function p043Traslado(tr, w, h) {
  const px = (s, base) => /%$/.test(s) ? parseFloat(s) / 100 * base : parseFloat(s);
  let v = [0, 0];
  if (tr.transform && tr.transform !== 'none') {
    const m = /^translate\(\s*(-?[\d.]+(?:px|%)?)\s*(?:,\s*(-?[\d.]+(?:px|%)?)\s*)?\)$/.exec(tr.transform);
    const mx = /^translateX\(\s*(-?[\d.]+(?:px|%)?)\s*\)$/.exec(tr.transform);
    const my = /^translateY\(\s*(-?[\d.]+(?:px|%)?)\s*\)$/.exec(tr.transform);
    if (m) v = [px(m[1], w), m[2] ? px(m[2], h) : 0];
    else if (mx) v = [px(mx[1], w), 0];
    else if (my) v = [0, px(my[1], h)];
    else return null;
  }
  if (tr.translate && tr.translate !== 'none') {
    const p = tr.translate.split(/\s+/);
    v = [v[0] + px(p[0], w), v[1] + (p[1] ? px(p[1], h) : 0)];
  }
  return v;
}
/* ¿El disco de radio `r`, cuyo centro recorre las polilíneas `caminos`, tapa el punto `p`?
   La distancia de un punto fijo a un centro que se mueve en línea recta es convexa: la mayor está en
   un vértice y la menor puede caer en el medio de un tramo. */
function p043Cubre(p, caminos, r, clip) {
  if (p[0] < clip.left || p[0] > clip.right || p[1] < clip.top || p[1] > clip.bottom) return 'nunca';
  let max = 0, min = Infinity;
  caminos.forEach(c => {
    c.forEach(v => { max = Math.max(max, Math.hypot(p[0] - v[0], p[1] - v[1])); });
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[Math.min(i + 1, c.length - 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
      min = Math.min(min, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
    }
  });
  return max <= r ? 'siempre' : (min <= r ? 'a veces' : 'nunca');
}
/* Los colores de un `linear-gradient` horizontal o vertical en el punto `p` de la caja `rect`.
   Devuelve una lista (en un corte duro, los dos colores) o `null` si no lo sabe leer. */
function p043ColoresDelDegrade(img, rect, p) {
  const m = /^linear-gradient\((.*)\)$/.exec(String(img).trim());
  if (!m) return null;
  const partes = [];
  let prof = 0, cur = '';
  for (const ch of m[1]) {
    if (ch === '(') prof++;
    if (ch === ')') prof--;
    if (ch === ',' && !prof) { partes.push(cur.trim()); cur = ''; } else cur += ch;
  }
  partes.push(cur.trim());
  let dir = 'to bottom';
  if (/^(to\s|-?[\d.]+deg$)/.test(partes[0])) dir = partes.shift();
  const ang = ({ 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 })[dir];
  const grados = ang != null ? ang : (/deg$/.test(dir) ? ((parseFloat(dir) % 360) + 360) % 360 : NaN);
  if (!(grados % 90 === 0)) return null;
  const horiz = grados % 180 === 90, largo = horiz ? rect.width : rect.height;
  let pos = horiz ? p[0] - rect.left : p[1] - rect.top;
  if (grados === 270 || grados === 0) pos = largo - pos;
  const paradas = [];
  for (const s of partes) {
    const c = /^(rgba?\([^)]*\)|transparent)\s*(.*)$/.exec(s);
    if (!c) return null;
    const color = c[1] === 'transparent' ? 'rgba(0, 0, 0, 0)' : c[1];
    const ps = c[2].split(/\s+/).filter(Boolean).map(x => /%$/.test(x) ? parseFloat(x) / 100 * largo : (/px$/.test(x) ? parseFloat(x) : NaN));
    if (ps.some(isNaN)) return null;
    if (!ps.length) paradas.push({ color, en: null });
    ps.forEach(x => paradas.push({ color, en: x }));
  }
  if (paradas.length < 2) return null;
  if (paradas[0].en == null) paradas[0].en = 0;
  if (paradas[paradas.length - 1].en == null) paradas[paradas.length - 1].en = largo;
  let ult = paradas[0].en;
  paradas.forEach(q => { if (q.en != null) { q.en = Math.max(q.en, ult); ult = q.en; } });
  for (let i = 1; i < paradas.length; i++) {
    if (paradas[i].en != null) continue;
    let j = i; while (paradas[j].en == null) j++;
    const a = paradas[i - 1].en, b = paradas[j].en;
    for (let k = i; k < j; k++) paradas[k].en = a + (b - a) * (k - i + 1) / (j - i + 1);
  }
  if (pos <= paradas[0].en) return [p043Rgba(paradas[0].color)];
  if (pos >= paradas[paradas.length - 1].en) return [p043Rgba(paradas[paradas.length - 1].color)];
  const res = [];
  for (let i = 0; i < paradas.length - 1; i++) {
    const a = paradas[i], b = paradas[i + 1];
    if (pos < a.en || pos > b.en) continue;
    if (b.en === a.en) { res.push(p043Rgba(a.color), p043Rgba(b.color)); continue; }
    const t = (pos - a.en) / (b.en - a.en), ca = p043Rgba(a.color), cb = p043Rgba(b.color);
    res.push(ca.map((v, j) => v + (cb[j] - v) * t));
  }
  return res;
}

/* Lo que la geometría pone debajo de la caja del TEXTO de `nodo` (un elemento del splash, TAL COMO
   ESTÁ AHORA: ancho, tema e idioma los pone quien llama). Devuelve el peor contraste contra cada capa
   posible, las capas vistas y lo que no se pudo modelar. `reglas` es la deriva leída una vez
   (`p043DerivaReglas`). Lo usan la pista del idioma y la credencial del pie. */
function p043FondosBajo(nodo, reglas) {
  const ov = document.getElementById('splashOv'), wrap = ov.querySelector('.splash-wrap');
  const band = ov.querySelector('.splash-circ-band'), circ = band && band.querySelector('.ent-circulos');
  const out = { sinModelar: [], capas: {}, min: Infinity, peor: '', puntos: 0 };
  if (!nodo) { out.sinModelar.push('no está el elemento a medir'); return out; }
  const rg = document.createRange(); rg.selectNodeContents(nodo);
  const t = rg.getBoundingClientRect();
  out.caja = { x: Math.round(t.left), y: Math.round(t.top), r: Math.round(t.right), b: Math.round(t.bottom) };
  if (!(t.width > 0 && t.height > 0) || !ov.classList.contains('show')) { out.sinModelar.push('el texto no mide nada'); return out; }
  if (!wrap || !band || !circ) { out.sinModelar.push('falta la banda de círculos o `.splash-wrap`'); return out; }
  const hs = getComputedStyle(nodo), tinta = p043Rgba(hs.color);
  out.color = hs.color;
  if (tinta[3] < 0.99 || +hs.opacity < 0.99) out.sinModelar.push('el texto tiene transparencia: ' + hs.color + ' · opacidad ' + hs.opacity);
  /* 1 · el elemento y sus envoltorios hasta `.splash-wrap` */
  const propias = [];
  for (let el = nodo; el && el !== wrap; el = el.parentElement) propias.push(el);
  /* 2 · los círculos, en toda su deriva */
  const cb = circ.getBoundingClientRect(), clip = band.getBoundingClientRect();
  const circulos = ['after', 'before'].map(n => {
    const cs = getComputedStyle(circ, '::' + n);
    if (cs.content === 'none' || cs.display === 'none') return null;
    const w = parseFloat(cs.width), h = parseFloat(cs.height);
    const x0 = cs.left === 'auto' ? cb.right - parseFloat(cs.right) - w : cb.left + parseFloat(cs.left);
    const c0 = [x0 + w / 2, cb.top + parseFloat(cs.top) + h / 2];
    const capa = '.ent-circulos::' + n;
    if (!(Math.abs(w - h) < 0.5 && cs.borderTopLeftRadius === '50%')) out.sinModelar.push(capa + ' no es un círculo');
    if (+cs.opacity < 0.99) out.sinModelar.push(capa + ' tiene opacidad ' + cs.opacity);
    const caminos = [[c0]];
    (reglas[n] ? reglas[n].caminos : []).forEach(cam => {
      const vs = cam.pasos.map(q => p043Traslado(q.tr, w, h));
      if (vs.some(v => v == null)) { out.sinModelar.push(capa + ': la animación «' + cam.nombre + '» no es un traslado'); return; }
      if (!cam.pasos.length || cam.pasos[0].en > 0) vs.unshift([0, 0]);
      if (!cam.pasos.length || cam.pasos[cam.pasos.length - 1].en < 100) vs.push([0, 0]);
      caminos.push(vs.map(v => [c0[0] + v[0], c0[1] + v[1]]));
    });
    return { capa, z: parseInt(cs.zIndex, 10) || 0, color: p043Rgba(cs.backgroundColor), r: w / 2, caminos };
  }).filter(Boolean).sort((a, c) => c.z - a.z);
  /* 3 y 4 · el degradé de `.splash-wrap`, su color, y el overlay */
  const wr = wrap.getBoundingClientRect(), ws = getComputedStyle(wrap), os = getComputedStyle(ov);
  /* ⚠️ Lo que pinta y el modelo NO conoce: cualquier otro elemento del splash con fondo, o una imagen,
     cuya caja contenga el punto. Se excluyen sólo el elemento, sus ancestros y la banda (que se modelan). */
  const ajenos = [...ov.querySelectorAll('*')].filter(el => {
    if (el.contains(nodo) || el === band || band.contains(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility !== 'visible' || +cs.opacity === 0) return false;
    return p043Rgba(cs.backgroundColor)[3] > 0.01 || cs.backgroundImage !== 'none' || /^(IMG|CANVAS|VIDEO|svg)$/i.test(el.tagName);
  }).map(el => ({ el, r: el.getBoundingClientRect() })).filter(x => x.r.width > 0 && x.r.height > 0);
  const xs = [t.left + 0.5, t.left + t.width / 4, (t.left + t.right) / 2, t.left + 3 * t.width / 4, t.right - 0.5];
  const ys = [t.top + 0.5, (t.top + t.bottom) / 2, t.bottom - 0.5];
  xs.forEach(x => ys.forEach(y => {
    const p = [x, y], vistas = [];
    ajenos.forEach(a => { if (x >= a.r.left && x <= a.r.right && y >= a.r.top && y <= a.r.bottom)
      out.sinModelar.push('pinta debajo y el modelo no lo conoce: ' + a.el.tagName.toLowerCase() + (a.el.id ? '#' + a.el.id : '') + '.' + [...a.el.classList].join('.')); });
    /* Agrega la capa si pinta el punto; devuelve true si lo tapa SIEMPRE (la pila se corta ahí). */
    const capa = (nombre, c, cubre) => {
      if (cubre === 'nunca' || c[3] <= 0.01) return false;
      if (c[3] < 0.99) { out.sinModelar.push(nombre + ' es semitransparente (' + p043RgbTexto(c) + ' alfa ' + c[3] + ')'); return true; }
      vistas.push(nombre + ' ' + p043RgbTexto(c));
      return cubre === 'siempre';
    };
    let tapado = false;
    for (const el of propias) {
      if (tapado) break;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const dentro = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      if (cs.backgroundImage !== 'none' && dentro) { out.sinModelar.push((el === nodo ? 'el elemento' : 'un envoltorio') + ' tiene imagen de fondo'); tapado = true; break; }
      tapado = capa(el === nodo ? 'fondo propio' : 'fondo de ' + el.className, p043Rgba(cs.backgroundColor), dentro ? 'siempre' : 'nunca');
    }
    for (const c of circulos) { if (tapado) break; tapado = capa(c.capa, c.color, p043Cubre(p, c.caminos, c.r, clip)); }
    if (!tapado && ws.backgroundImage !== 'none') {
      const cols = p043ColoresDelDegrade(ws.backgroundImage, wr, p);
      if (!cols) { out.sinModelar.push('el degradé de .splash-wrap no se sabe leer: ' + ws.backgroundImage); tapado = true; }
      else {
        let todos = cols.length > 0;
        cols.forEach(c => { if (!capa('degradé de .splash-wrap', c, 'siempre')) todos = false; });
        tapado = todos;
      }
    }
    if (!tapado) tapado = capa('fondo de .splash-wrap', p043Rgba(ws.backgroundColor), 'siempre');
    if (!tapado) tapado = capa('fondo del overlay', p043Rgba(os.backgroundColor), 'siempre');
    if (!tapado) out.sinModelar.push('en (' + Math.round(x) + ', ' + Math.round(y) + ') ninguna capa tapa del todo');
    vistas.forEach(v => {
      const col = v.slice(v.lastIndexOf('rgb('));
      const c = CTX.contraste(hs.color, col);
      out.capas[v] = c;
      if (c < out.min) { out.min = c; out.peor = v; }
    });
    out.puntos++;
  }));
  out.sinModelar = [...new Set(out.sinModelar)];
  out.circulos = circulos; out.clip = clip;   // para el discriminador de la deriva
  return out;
}
/* La pista: lo de abajo (`p043FondosBajo`) y el desvío de su centro respecto del centro del chip. */
function p043PistaMedir(reglas) {
  const hint = document.getElementById('splashLangHint'), btn = document.getElementById('splashLangBtn');
  const out = Object.assign({ palabra: hint.textContent, chip: btn.textContent }, p043FondosBajo(hint, reglas));
  const rg = document.createRange(); rg.selectNodeContents(hint);
  const t = rg.getBoundingClientRect(), b = btn.getBoundingClientRect();
  if (!(b.width > 0)) { out.sinModelar.push('el chip no mide nada'); return out; }
  if (t.width > 0) out.dx = +(((t.left + t.right) / 2) - ((b.left + b.right) / 2)).toFixed(1);
  return out;
}

/* Recorre las cuatro cosas que la persona puede ver: el chip en «ES» y en «EN», y debajo de cada uno
   las DOS palabras, porque la pista alterna. Entra por las funciones reales: `splashCambiarIdioma()`
   (lo que hace tocar el chip: cambia el idioma y reescribe el «ES»/«EN»), `splashLangHintArrancar()`
   y su temporizador, con el reloj falso de este archivo (`p043RelojFalso`). */
function p043PistaEstados(fn) {
  const html = document.documentElement, hint = document.getElementById('splashLangHint');
  const teniaSinAnim = html.classList.contains('sin-animaciones'), idiomaPrevio = idiomaActual(), oMM = window.matchMedia;
  try {
    ['es', 'en'].forEach(idioma => {
      fijarIdioma(idioma === 'es' ? 'en' : 'es');
      splashCambiarIdioma();
      const reloj = p043RelojFalso();
      try {
        splashLangHintFrenar();
        window.matchMedia = q => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
        html.classList.remove('sin-animaciones');
        splashLangHintArrancar();                 // la primera palabra: la del idioma vigente
        const primera = hint.textContent;
        fn(idioma, primera);
        for (let i = 0; i < 100 && hint.textContent === primera; i++) reloj.avanzar(100);
        fn(idioma, hint.textContent);             // la otra palabra, bajo el MISMO chip
      } finally { splashLangHintFrenar(); reloj.restaurar(); window.matchMedia = oMM; }
    });
  } finally {
    html.classList.toggle('sin-animaciones', teniaSinAnim);
    fijarIdioma(idiomaPrevio);
  }
}

/* Abre el splash, mide cada estado de la pista en cada ancho y cada tema, y deja todo como estaba. */
function p043PistaRecorrer(ventanas, temas) {
  const ov = document.getElementById('splashOv'), btn = document.getElementById('splashLangBtn');
  const circ = ov.querySelector('.splash-circ-band .ent-circulos');
  const teniaOv = ov.classList.contains('show'), chipPrevio = btn.textContent;
  const reglas = circ ? { after: p043DerivaReglas(circ, 'after'), before: p043DerivaReglas(circ, 'before') } : {};
  const filas = [];
  ov.classList.add('show');
  try {
    p043PistaEstados((idioma, palabra) => {
      temas.forEach(tema => PRUEBAS.enTema(tema, () => ventanas.forEach(([w, h]) => PRUEBAS.enVentana(w, h, () =>
        PRUEBAS.sinAnimaciones(() => filas.push(Object.assign({ ancho: w, alto: h, tema, idioma, esperada: palabra },
          p043PistaMedir(reglas))))))));
    });
  } finally {
    if (!teniaOv) ov.classList.remove('show');
    btn.textContent = chipPrevio;
  }
  filas.deriva = (reglas.after && reglas.after.nombres) || [];
  return filas;
}
function p043PistaFila(f) {
  return f.ancho + '×' + f.alto + ' ' + f.tema + (f.letra ? ' letra ' + f.letra : '') + ' «' + f.chip + '»/«' + f.palabra + '»: ' +
    (isFinite(f.min) ? f.min + ':1 sobre ' + f.peor : 'sin medir') + ' · centro ' + (f.dx > 0 ? '+' : '') + f.dx + ' px';
}

PRUEBAS.caso('⚠️ P302 · la pista pasa 4,5:1 contra TODO lo que la geometría le pone debajo —el círculo con su deriva y el degradé de escritorio—, en todos los anchos, los dos temas, las dos palabras y con la letra más grande', () => {
  /* ⚠️ ESTE CASO DABA VERDE CON LA PISTA ILEGIBLE. Medía el fondo del teléfono con el `backgroundColor`
     del overlay, y el de escritorio caminando `elementsFromPoint` hasta el primer `backgroundColor` que
     no fuera transparente. Las dos lecturas caían en el navy (`#0e2a56`), y con `--entrada-tenue` eso
     daba 6,76. Medido contra el píxel en la 7.49 publicada (`pruebas/medir-pista-idioma.js`): debajo
     de 900 px la pista estaba sobre el círculo naranja → **1,02:1**; desde 900 px, en tema claro,
     sobre el blanco del degradé de `.splash-wrap` → **2,09:1**. Lo que el caso no veía era justo lo
     que está debajo: un pseudoelemento y un `background-image`.
     ⚠️ QUÉ REGLAS CONCEDEN LO QUE SE AFIRMA (R19), en `index.html`:
       · sobre el naranja: `.splash-lang-hint { … color: var(--entrada-chip-ink) }` (la regla base);
       · sobre la tarjeta de escritorio: `.splash-lang-hint { color: var(--text-muted) }` dentro de
         `@media (min-width: 900px)`, que sigue al tema.
     Se afirma el INVARIANTE (4,5:1 contra cada capa posible), no esos tokens: si mañana la pista lleva
     fondo propio, el caso mide contra ese fondo y sigue valiendo.
     Los anchos son los de referencia (`PRUEBAS.VENTANAS`) más el borde exacto del escritorio (900) y
     uno ancho (1920). La letra más grande (135 %) baja y ensancha la pista: también tiene que leerse. */
  const VENT = PRUEBAS.VENTANAS.map(v => [v.w, v.h]).concat([[900, 700], [1920, 1080]]);
  let nivelPrevio = null;
  try { nivelPrevio = localStorage.getItem(K_TEXTO); } catch (e) {}
  let filas = [], deriva = [];
  try {
    [1, 3].forEach(nivel => {
      fijarTamanoTexto(nivel);
      const r = p043PistaRecorrer(VENT, ['claro', 'oscuro']);
      deriva = r.deriva;
      filas = filas.concat(r.map(f => Object.assign(f, { letra: nivel === 3 ? 'máxima' : 'normal' })));
    });
  } finally {
    if (nivelPrevio == null) { try { localStorage.removeItem(K_TEXTO); } catch (e) {} aplicarTamanoTexto(); }
    else fijarTamanoTexto(nivelPrevio);
  }
  PRUEBAS.igual(filas.length, VENT.length * 2 * 4 * 2,
    'guarda: ' + VENT.length + ' anchos × 2 temas × 4 estados (chip ES y EN, con las dos palabras) × 2 tamaños de letra');
  PRUEBAS.cierto(filas.some(f => f.palabra === 'Idioma') && filas.some(f => f.palabra === 'Language'),
    'guarda: se midió con las DOS palabras · si la pista no alternó, la mitad de las filas mide una sola');
  PRUEBAS.cierto(deriva.length > 0,
    'guarda: el modelo encontró la animación de deriva del círculo en la hoja de estilos · si no, mide el círculo quieto');
  PRUEBAS.igual(filas.filter(f => f.sinModelar.length).map(f => p043PistaFila(f) + ' · ' + f.sinModelar.join(' | ')), [],
    '⚠️ nada pinta debajo de la pista que el modelo no conozca · si algo aparece acá, el contraste de abajo no vale');
  PRUEBAS.igual(filas.filter(f => !(f.min >= 4.5)).map(p043PistaFila), [],
    '⚠️ 4,5:1 o más contra cada capa que la geometría le pone debajo · peor: ' +
    p043PistaFila(filas.reduce((a, f) => (f.min < a.min ? f : a), filas[0] || { min: Infinity })));
  /* DISCRIMINADORES · el modelo tiene que VER las dos superficies que los instrumentos de antes no veían. */
  const forzar = (color, ventanas, temas) => {
    const st = document.createElement('style');
    st.textContent = '#splashOv .splash-lang-hint { color: ' + color + ' !important; }';
    document.head.appendChild(st);
    try { return p043PistaRecorrer(ventanas, temas); } finally { st.remove(); }
  };
  /* 1 · el token de antes, `--entrada-tenue`: pasa sobre el navy (6,76) y por eso los casos viejos daban
     verde. Tiene que dar rojo sobre el naranja (teléfono) y sobre el blanco del degradé (escritorio). */
  const tenue = forzar('var(--entrada-tenue)', [[375, 812], [1366, 768]], ['claro']);
  [375, 1366].forEach(w => {
    const fw = tenue.filter(f => f.ancho === w);
    PRUEBAS.cierto(fw.length > 0 && fw.every(f => f.min < 4.5),
      'DISCRIMINADOR · con `--entrada-tenue` a ' + w + ' px en claro NO llega a 4,5:1 · ' + fw.map(f => f.min + ' sobre ' + f.peor).join(' | '));
  });
  /* 2 · la tinta del teléfono en escritorio oscuro: navy sobre la tarjeta oscura. Si el modelo leyera el
     degradé de un solo tema (o el overlay), esto daría verde. */
  const navy = forzar('var(--entrada-chip-ink)', [[1366, 768]], ['oscuro']);
  PRUEBAS.cierto(navy.length > 0 && navy.every(f => f.min < 4.5),
    'DISCRIMINADOR · la tinta del teléfono sobre la tarjeta OSCURA de escritorio no llega a 4,5:1 · ' + navy.map(f => f.min + ' sobre ' + f.peor).join(' | '));
  /* 3 · la deriva se MODELA, no sólo se encuentra. A 375 la deriva lleva el círculo a la izquierda y
     abajo, así que un punto justo afuera de su borde de abajo a la izquierda queda tapado sólo en parte
     del ciclo: tiene que dar «a veces». Con el círculo quieto daría «nunca», y la pista podría estar
     sobre dos fondos sin que el caso lo viera. */
  const ov = document.getElementById('splashOv'), teniaOv = ov.classList.contains('show');
  const circ = ov.querySelector('.splash-circ-band .ent-circulos');
  ov.classList.add('show');
  let deriva3 = null;
  try {
    deriva3 = PRUEBAS.enVentana(375, 812, () => PRUEBAS.sinAnimaciones(() => {
      const m = p043PistaMedir({ after: p043DerivaReglas(circ, 'after'), before: p043DerivaReglas(circ, 'before') });
      const c = (m.circulos || []).filter(x => x.capa === '.ent-circulos::after')[0];
      if (!c || c.caminos.length < 2) return { error: 'sin camino de deriva para el ::after' };
      const c0 = c.caminos[0][0];
      const d = c.caminos[1].reduce((a, v) => (Math.hypot(v[0] - c0[0], v[1] - c0[1]) > Math.hypot(a[0] - c0[0], a[1] - c0[1]) ? v : a), c0);
      const n = Math.hypot(d[0] - c0[0], d[1] - c0[1]);
      if (!(n > 1)) return { error: 'la deriva mide ' + n + ' px' };
      const p = [c0[0] + (d[0] - c0[0]) / n * (c.r + 2), c0[1] + (d[1] - c0[1]) / n * (c.r + 2)];
      return { n: +n.toFixed(2), conDeriva: p043Cubre(p, c.caminos, c.r, m.clip), quieto: p043Cubre(p, [[c0]], c.r, m.clip), p: p.map(v => +v.toFixed(1)) };
    }));
  } finally { if (!teniaOv) ov.classList.remove('show'); }
  PRUEBAS.cierto(deriva3 && deriva3.conDeriva === 'a veces' && deriva3.quieto === 'nunca',
    'DISCRIMINADOR · a 375, un punto 2 px afuera del borde del círculo, del lado hacia donde deriva, queda tapado «a veces» (quieto: «nunca») · ' + JSON.stringify(deriva3));
});

PRUEBAS.caso('el aria-label del botón de idioma también pasa por t()', () => {
  /* Lo encontró el agente de P043 mirando alrededor y lo dejó anotado en vez de tocarlo. Es una
     línea, y sin ella el único texto que un lector de pantalla lee de ese botón está en español
     fijo — o sea que quien navega la app en inglés escucha "Cambiar idioma" en el único control
     que sirve justamente para no tener que leer español (R14). */
  const btn = document.getElementById('splashLangBtn');
  PRUEBAS.cierto(!!btn, 'el botón existe · si no, este caso no mide nada');
  PRUEBAS.cierto((btn.getAttribute('data-i18n-attr') || '').indexOf('aria-label:') >= 0,
    'lleva el marcador que el barrido de idioma entiende · decía «' +
    btn.getAttribute('data-i18n-attr') + '»');
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  const leidos = {};
  try {
    ['es', 'en'].forEach(l => { fijarIdioma(l); leidos[l] = btn.getAttribute('aria-label'); });
  } finally { fijarIdioma(antes); }
  PRUEBAS.cierto(!!leidos.es && !!leidos.en, 'tiene etiqueta en los dos idiomas');
  PRUEBAS.falso(leidos.es === leidos.en,
    '⚠️ y CAMBIA con el idioma · estaba fijo en español · es «' + leidos.es + '» / en «' +
    leidos.en + '»');
});


PRUEBAS.grupo('P302 · la credencial del pie del splash, sobre el fondo que de verdad tiene');

/* Mide la credencial en cada ancho, tema, idioma y tamaño de letra, con el mismo modelo que la pista
   (`p043FondosBajo`), y deja todo como estaba. El idioma entra por `fijarIdioma` (el texto cambia de largo
   y de renglones) y la letra por `fijarTamanoTexto`: con «Muy grande» la tira se esconde y la grilla de
   escritorio se reacomoda, que es justo lo que movía la credencial de columna. */
function p043NormaRecorrer(ventanas, temas, letras) {
  const ov = document.getElementById('splashOv'), norma = ov.querySelector('.splash-norma');
  const circ = ov.querySelector('.splash-circ-band .ent-circulos');
  const teniaOv = ov.classList.contains('show'), idiomaPrevio = idiomaActual();
  let letraPrevia = null;
  try { letraPrevia = localStorage.getItem(K_TEXTO); } catch (e) {}
  const reglas = circ ? { after: p043DerivaReglas(circ, 'after'), before: p043DerivaReglas(circ, 'before') } : {};
  const filas = [];
  ov.classList.add('show');
  try {
    (letras || [1]).forEach(letra => {
      fijarTamanoTexto(letra);
      ['es', 'en'].forEach(idioma => {
        fijarIdioma(idioma);
        temas.forEach(tema => PRUEBAS.enTema(tema, () => ventanas.forEach(([w, h]) => PRUEBAS.enVentana(w, h, () =>
          PRUEBAS.sinAnimaciones(() => {
            const wr = ov.querySelector('.splash-wrap').getBoundingClientRect(), nr = norma.getBoundingClientRect();
            filas.push(Object.assign({ ancho: w, alto: h, tema, idioma, letra: letra === 3 ? 'máxima' : 'normal',
              lado: nr.left >= wr.left + wr.width / 2 ? 'derecha' : (nr.right <= wr.left + wr.width / 2 ? 'izquierda' : 'cruza') },
              p043FondosBajo(norma, reglas)));
          })))));
      });
    });
  } finally {
    fijarIdioma(idiomaPrevio);
    if (letraPrevia == null) { try { localStorage.removeItem(K_TEXTO); } catch (e) {} aplicarTamanoTexto(); }
    else fijarTamanoTexto(letraPrevia);
    if (!teniaOv) ov.classList.remove('show');
  }
  return filas;
}
function p043NormaFila(f) {
  return f.ancho + '×' + f.alto + ' ' + f.tema + ' ' + f.idioma + ' letra ' + f.letra + ' (' + f.lado + '): ' +
    (isFinite(f.min) ? f.min + ':1 sobre ' + f.peor : 'sin medir');
}

PRUEBAS.caso('⚠️ P302 · la credencial del pie pasa 4,5:1 contra lo que la geometría le pone debajo —el navy en el teléfono, la tarjeta del degradé en escritorio—, en los dos temas, los dos idiomas y con la letra más grande', () => {
  /* ⚠️ POR QUÉ EXISTE. Apareció revisando las pantallas vecinas de la pista del idioma (P302): la
     credencial («Programa de gestión de fatiga ajustado a los lineamientos de la OACI…») usaba
     `--entrada-tenue`, un token pensado para el navy, y desde 900 px la grilla la pone en la columna
     DERECHA, sobre la mitad `var(--card)` del degradé de `.splash-wrap`. Medido contra el píxel en la
     7.49 (`pruebas/medir-pista-idioma.js`): **2,09:1** sobre el blanco del tema claro. Ningún caso lo
     veía, y el auditor no mide texto sobre un degradé direccional: lo cuenta «sin medir».
     ⚠️ Y CON LA LETRA «MUY GRANDE» SE MOVÍA DE COLUMNA. `html.texto-maximo .splash-anim { display:none }`
     libera la celda de la tira, los puntitos suben a ella y la colocación automática de la grilla
     pasaba la credencial a la columna IZQUIERDA, sobre el navy: con el color de escritorio,
     `--text-muted`, ahí da 2,80:1 (medido contra el píxel). Por eso se mide también con esa letra.
     ⚠️ QUÉ REGLAS CONCEDEN LO QUE SE AFIRMA (R19), en `index.html`:
       · debajo de 900 px, sobre el navy del overlay: el `color:var(--entrada-tenue)` de la regla base
         `.splash-norma`;
       · desde 900 px, sobre la mitad `var(--card)` del degradé: `.splash-norma { grid-column: 2;
         color: var(--text-muted) }` dentro de `@media (min-width: 900px)`. El `grid-column: 2` es lo
         que la deja siempre de ese lado, con cualquier letra; el color sigue al tema.
     Se afirma el INVARIANTE (4,5:1 contra cada capa que la geometría pone debajo de la caja del texto),
     no esos tokens ni la columna. El modelo es el de la pista (`p043FondosBajo`, explicado arriba). */
  if (typeof p043FondosBajo !== 'function') { PRUEBAS.cierto(false, '⚠️ falta `p043FondosBajo`: este contrato queda SIN MEDIR'); return; }
  const VENT = [[375, 812], [768, 1024], [1366, 768]];
  const filas = p043NormaRecorrer(VENT, ['claro', 'oscuro'], [1, 3]);
  PRUEBAS.igual(filas.length, VENT.length * 2 * 2 * 2, 'guarda: 3 anchos × 2 temas × 2 idiomas × 2 tamaños de letra · ' + filas.length);
  PRUEBAS.igual(filas.filter(f => f.sinModelar.length).map(f => p043NormaFila(f) + ' · ' + f.sinModelar.join(' | ')), [],
    '⚠️ nada pinta debajo de la credencial que el modelo no conozca · si algo aparece acá, el contraste no vale');
  PRUEBAS.igual(filas.filter(f => !(f.min >= 4.5)).map(p043NormaFila), [],
    '⚠️ 4,5:1 o más contra cada capa que la geometría le pone debajo · peor: ' +
    p043NormaFila(filas.reduce((a, f) => (f.min < a.min ? f : a), filas[0] || { min: Infinity })));
  /* DISCRIMINADOR · las reglas de la 7.49: la credencial con `--entrada-tenue` en todos los anchos. Tiene
     que dar ROJO a 1366 en claro (sobre el blanco del degradé) y seguir en VERDE a 375 (sobre el navy):
     si diera rojo en los dos, el modelo no estaría distinguiendo los fondos, sólo el color. */
  const forzar = (css, ventanas, letras) => {
    const st = document.createElement('style');
    st.textContent = '#splashOv .splash-norma { ' + css + ' }';
    document.head.appendChild(st);
    try { return p043NormaRecorrer(ventanas, ['claro'], letras); } finally { st.remove(); }
  };
  /* 1 · la regla de la 7.49: `--entrada-tenue` en todos los anchos y la columna que diera la grilla. */
  const viejas = forzar('color: var(--entrada-tenue) !important; grid-column: auto !important;', [[375, 812], [1366, 768]], [1]);
  const de = w => viejas.filter(f => f.ancho === w);
  PRUEBAS.cierto(de(1366).length === 2 && de(1366).every(f => f.min < 4.5),
    'DISCRIMINADOR · con la regla de la 7.49, a 1366 en claro NO llega a 4,5:1 · ' + de(1366).map(p043NormaFila).join(' | '));
  PRUEBAS.cierto(de(375).length === 2 && de(375).every(f => f.min >= 4.5),
    'DISCRIMINADOR · y a 375 sí pasa, porque ahí debajo está el navy · ' + de(375).map(p043NormaFila).join(' | '));
  /* 2 · el color de escritorio SIN la columna fija: con la letra «Muy grande» la grilla la pasa al navy. */
  const sueltas = forzar('grid-column: auto !important;', [[1366, 768]], [3]);
  PRUEBAS.cierto(sueltas.length === 2 && sueltas.every(f => f.min < 4.5 && f.lado === 'izquierda'),
    'DISCRIMINADOR · sin `grid-column: 2`, con la letra máxima a 1366 en claro cae a la izquierda y NO llega a 4,5:1 · ' + sueltas.map(p043NormaFila).join(' | '));
});
