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
  const texto = p043Etiqueta(
    () => document.getElementById('portalDemoBtn'),
    (btn) => portalVerDemo(btn),
    () => {}
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
      cicloCfgGuardar(btn);
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
  PRUEBAS.cierto(/splashLangHintFrenar\(\)[\s\S]*splashLangHintArrancar\(\)/.test(splashMostrar.toString()),
    'splashMostrar() tiene que frenar antes de arrancar — si no, dos aperturas seguidas del splash dejarían DOS cadenas vivas');
  PRUEBAS.cierto(/splashLangHintFrenar\(\)/.test(splashAbrirPortal.toString()),
    'splashAbrirPortal() tiene que frenarla: es uno de los caminos por los que el splash se oculta de verdad');
  PRUEBAS.cierto(/splashLangHintFrenar\(\)/.test(carruselMostrar.toString()),
    'carruselMostrar() también: si no, tocar "Ingresar" dejaría la cadena corriendo detrás del carrusel');
});

PRUEBAS.caso('⚠️ la guarda de quieto revisa las DOS condiciones — el sistema Y el interruptor propio de la app', () => {
  /* No se puede emular prefers-reduced-motion en esta pestaña (ver LEEME.md), así que se comprueba
     sobre el CÓDIGO que las dos condiciones están, en vez de sólo una — que es exactamente el tipo
     de regresión que colaría "quedó fijo con el interruptor de la app pero sigue parpadeando si el
     SISTEMA pide movimiento reducido", o viceversa. */
  const fuente = splashLangHintQuieto.toString();
  PRUEBAS.cierto(/prefers-reduced-motion/.test(fuente), 'tiene que consultar el media query del SISTEMA');
  PRUEBAS.cierto(/sin-animaciones/.test(fuente), 'Y el interruptor propio de la app (html.sin-animaciones)');
});

PRUEBAS.caso('⚠️ la pista se re-arma sola si el movimiento se habilita mientras estaba quieta (MutationObserver)', () => {
  /* Mismo motivo que splashAnimArrancar (N10): si la pestaña carga oculta, `.sin-animaciones` se
     pone SOLA al arranque, y sin esto la pista quedaría fija para siempre aunque el movimiento ya
     estuviera permitido — el mismo síntoma que el usuario reportó para la tira del splash. */
  const fuente = splashLangHintArrancar.toString();
  PRUEBAS.cierto(/MutationObserver/.test(fuente), 'algo tiene que re-armarla sola');
  PRUEBAS.cierto(/est\.parado = true/.test(fuente), 'y marcarse como parada, no abandonada, cuando se congela');
  PRUEBAS.cierto(/_splLangHint !== est/.test(fuente),
    'y comprobar identidad contra el estado global en cada paso, para que una cadena vieja no siga viva por error');
});

PRUEBAS.caso('el estado global se declara SIN asignar (R16): "= null" pisaría lo que ya arrancó', () => {
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  PRUEBAS.cierto(/^var _splLangHint;\s*$/m.test(fuente),
    'declarada sin valor: con "= null" más abajo en el archivo, esa línea pisaría el estado que splashLangHintArrancar() ya hubiera guardado');
  PRUEBAS.falso(/^var _splLangHint\s*=/m.test(fuente), 'y no puede volver a llevar asignación');
});

PRUEBAS.caso('⚠️ el color de la pista pasa 4,5:1 en los DOS temas, sobre el navy del splash y sobre la tarjeta clara de escritorio', () => {
  const ov = document.getElementById('splashOv');
  const teniaOv = ov.classList.contains('show');
  const temaPrevio = temaGuardado();
  ov.classList.add('show');
  const hint = document.getElementById('splashLangHint');
  const resultados = {};
  try {
    ['claro', 'oscuro'].forEach(tema => {
      fijarTema(tema);
      PRUEBAS.enVentana(390, 844, () => {
        const color = getComputedStyle(hint).color;
        const navy = getComputedStyle(ov).backgroundColor;
        resultados['navy-' + tema] = CTX.contraste(color, navy);
      });
      PRUEBAS.enVentana(1366, 800, () => {
        const color = getComputedStyle(hint).color;
        const card = CTX.token('var(--card)');
        resultados['card-' + tema] = CTX.contraste(color, card);
      });
    });
  } finally {
    if (!teniaOv) ov.classList.remove('show');
    if (temaPrevio) fijarTema(temaPrevio);
    else { try { localStorage.removeItem(K_TEMA); } catch (e) {} aplicarTema(); }
  }
  PRUEBAS.alMenos(resultados['navy-claro'], 4.5, 'navy · tema claro: ' + resultados['navy-claro'] + ':1 (usa --entrada-tenue, invariante entre temas)');
  PRUEBAS.alMenos(resultados['navy-oscuro'], 4.5, 'navy · tema oscuro: ' + resultados['navy-oscuro'] + ':1');
  PRUEBAS.alMenos(resultados['card-claro'], 4.5, 'tarjeta de escritorio (≥900px) · tema claro: ' + resultados['card-claro'] + ':1 (usa --text-muted, theme-aware)');
  PRUEBAS.alMenos(resultados['card-oscuro'], 4.5, 'tarjeta de escritorio (≥900px) · tema oscuro: ' + resultados['card-oscuro'] + ':1');
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
