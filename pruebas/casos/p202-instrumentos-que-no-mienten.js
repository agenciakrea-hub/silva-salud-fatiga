PRUEBAS.grupo('P202 · los dos instrumentos que informaban sin medir');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Los dos hallazgos que quedaban de A8 son de la misma clase: **medidores que pueden decir “0
   defectos” sin haber medido nada**, que es la peor forma de fallar de una herramienta de
   verificación — su silencio se lee como una garantía.

   · #39 · `auditar-panel.html` informaba «0 hallazgos» con el panel sin pintar. Y además llevaba
     roto desde Z1: la demostración pasó a pedir clave, el botón dejaba el panel en el formulario
     de contraseña, y el sondeo se agotaba con un «la demostración no cargó» que no decía nada.
   · #8 · el lector de contrato de `a4-contrato-servidor-cliente.js` contaba llaves y paréntesis
     sin mirar si estaban dentro de comillas, y llegó a marcar `ultimoEvento` —que vive en
     `bitacoraServidor`— como campo de la respuesta del panel.

   Este archivo vigila que los dos sigan teniendo con qué darse cuenta. El lector de contrato se
   prueba de verdad en `a4-contrato-servidor-cliente.js`, con fragmentos traicioneros; acá se
   comprueba lo que no se puede ejecutar desde la suite: que el auditor del panel conserve su
   autodiagnóstico y su recuento de cobertura.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p202Fuente(ruta){
  return fetch(ruta + '?v=' + Date.now()).then(r => r.text());
}

PRUEBAS.caso('🔴 P202 · el auditor del panel se niega a informar si no detecta los defectos plantados', () => {
  /* ⚠️ P206 movió el autodiagnóstico a `auditor.js`: tres copias del mismo discriminador se
     desincronizan y la vieja miente. Lo que este caso vigila sigue siendo lo mismo —que exista, que
     corra ANTES del recorrido y que ABORTE— pero cada cosa donde vive ahora. */
  return Promise.all([p202Fuente('/pruebas/auditor.js'), p202Fuente('/pruebas/auditar-panel.html')])
    .then(([aud, src]) => {
    PRUEBAS.cierto(/AUDITOR\.autodiagnostico = function/.test(aud),
      '🔴 tiene que existir el autodiagnóstico · sin él, «0 hallazgos» y «no miré nada» son lo mismo');
    const iAuto = src.indexOf('AUDITOR.autodiagnostico(');
    const iBucle = src.indexOf('for (const p of lista)');
    PRUEBAS.cierto(iAuto > 0 && iBucle > 0 && iAuto < iBucle,
      '🔴 y correr ANTES de recorrer las pantallas · después no sirve de nada');
    const bloque = src.slice(iAuto, iBucle);
    PRUEBAS.cierto(/if \(fallos\.length\)/.test(bloque) && /return;/.test(bloque),
      '🔴 y CORTAR cuando no mide · informar igual es exactamente el defecto #39');
    /* Las cuatro familias que el auditor promete buscar. Si mañana se agrega una quinta y el
       autodiagnóstico no la cubre, este caso no lo ve — pero si se BORRA una de éstas, sí. */
    ['contraste', 'superficiesClarasEnOscuro', 'areasDeToque', 'cortes'].forEach(f =>
      PRUEBAS.cierto(aud.indexOf('r.' + f) > 0,
        '🔴 el autodiagnóstico comprueba la familia `' + f + '`'));
  });
});

PRUEBAS.caso('🔴 P202 · una corrida que no midió ningún texto no cuenta como limpia', () => {
  return Promise.all([p202Fuente('/pruebas/auditor.js'), p202Fuente('/pruebas/auditar-panel.html')])
    .then(([aud, panel]) => {
      /* `medidos` es la guarda de medibilidad del auditor: cuántos textos se pudieron medir DE
         VERDAD. Cero defectos sobre cero medidos es un error del instrumento, no un resultado. */
      PRUEBAS.cierto(/medidos\+\+/.test(aud), '🔴 `AUDITOR.contraste` cuenta lo que midió');
      PRUEBAS.cierto(/medidos: c\.medidos/.test(aud), '🔴 y `AUDITOR.todo` lo expone');
      PRUEBAS.cierto(/noMedidas\.push/.test(panel) && /!r\.medidos/.test(panel),
        '🔴 y el auditor del panel anota las corridas que no midieron nada');
      PRUEBAS.cierto(/NO MIDIERON NADA/.test(panel),
        '🔴 y lo dice ARRIBA del informe · abajo no lo lee nadie');
    });
});

PRUEBAS.caso('⚠️ P202 · el auditor sabe decir que la demostración pide clave', () => {
  return p202Fuente('/pruebas/auditar-panel.html').then(src => {
    /* Llevaba roto desde Z1 y el síntoma era «la demostración no cargó», que no permite darse
       cuenta. Un instrumento que no puede explicar por qué no midió es un instrumento que miente
       por omisión. */
    PRUEBAS.cierto(/pide clave/.test(src),
      '⚠️ el mensaje nombra la causa real · antes decía sólo «no cargó»');
    PRUEBAS.cierto(/un informe vacío no significa que la app esté bien/.test(src),
      '⚠️ y avisa que el vacío NO es una garantía');
    PRUEBAS.cierto(/id="clave"/.test(src),
      '⚠️ y hay dónde ponerla · si no, el arreglo sería sólo un mensaje más lindo');
  });
});

PRUEBAS.caso('🔴 P202 · el auditor exige que el PANEL esté en pantalla, no sólo que el auditor funcione', () => {
  /* ⚠️ EL AGUJERO QUE DEJÓ LA PRIMERA VERSIÓN, y que midió el verificador: `abrirDemo` entraba por
     el camino de Z1 (`#pDemoPass` + `#portalDemoBtn`), pero desde P171 `splashVerDemo()` abre la
     HOJA DE LA CLAVE (`#demoClaveOv`), no el portal. Los dos elementos viejos viven dentro de
     `#portalOverlay`, que seguía oculto; `portalVerDemo` corría igual y `onDashData` llenaba `DASH`,
     así que el sondeo de `DASH.registros` daba OK con el panel en `display:none`. Resultado medido:
     108 corridas midiendo el splash y la hoja de la clave, 42 textos medidos —la guarda de
     cobertura no disparaba porque contaba el DOCUMENTO— e informe «limpio» con el sello
     «autodiagnóstico OK» adelante. El #39 vuelto a abrir y peor, porque ahora venía firmado.
     El autodiagnóstico mide al AUDITOR; esto mide que la PANTALLA auditada esté en pantalla. */
  return p202Fuente('/pruebas/auditar-panel.html').then(src => {
    PRUEBAS.cierto(/function panelEnPantalla\(/.test(src),
      '🔴 tiene que existir la comprobación del rectángulo del panel');
    PRUEBAS.cierto(/!r\.medidos \|\| !panelEnPantalla\(win\)/.test(src),
      '🔴 y la guarda por corrida tiene que mirarla · `medidos` solo cuenta el documento entero');
    PRUEBAS.cierto(/demoClaveEnviar/.test(src) && /dcPass/.test(src),
      '🔴 y se entra por el camino REAL de P171 · `#pDemoPass` y `#portalDemoBtn` están dentro del portal cerrado');
    PRUEBAS.cierto(/portalOverlay.*classList\.contains\('show'\)/.test(src),
      '🔴 y se comprueba que el portal se abrió antes de dar la demostración por buena');
  });
});

PRUEBAS.caso('⚠️ P202 · las plantas del autodiagnóstico se buscan por su FORMA, no por `.length`', () => {
  /* Dos de las cuatro se comprobaban con `.length`, y eso las volvía no-ops: la app real ya devuelve
     una superficie clara en oscuro (`#dcPassinput`), así que ese chequeo pasaba aunque
     `superficiesClaras` estuviera rota. Y la planta de superficie llevaba `background` inline, que
     `superficiesClaras` saltea a propósito — o sea que esa familia NO se estaba probando. */
  return p202Fuente('/pruebas/auditor.js').then(src => {
    PRUEBAS.cierto(/ad-sup/.test(src),
      '⚠️ la superficie clara se planta por hoja de estilo y se busca por su nombre');
    PRUEBAS.igual(src.match(/if \(!\(r\.\w+ \|\| \[\]\)\.length\)/g), null,
      '⚠️ y ninguna familia se comprueba por `.length` · con eso pasa aunque el auditor esté roto');
    PRUEBAS.cierto(/__ad_corte__/.test(src),
      '⚠️ y el corte por el ID de su planta · el mensaje «se pasa Npx» lo emite CUALQUIER corte de la pantalla auditada, así que buscar por ahí era un `.length` disfrazado');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P206 · LAS TRES HERRAMIENTAS, CON LAS MISMAS DOS GUARDAS Y UNA SOLA IMPLEMENTACIÓN

   P202 arregló `auditar-panel.html` y dejó las otras dos con el mismo agujero: `auditar-login.html`
   tenía guarda de cobertura pero no autodiagnóstico, y `auditar-entrada.html` no tenía ninguna de
   las dos. Son dos preguntas distintas —«¿está la pantalla delante?» y «¿el auditor sabe medirla?»—
   y hacen falta las dos: el del panel las tenía separadas y aun así entregó un informe de la
   pantalla equivocada, firmado con «autodiagnóstico OK».

   ⚠️ EL AUTODIAGNÓSTICO VIVE EN `auditor.js`, NO EN CADA HERRAMIENTA. Tres copias del mismo
   discriminador se desincronizan, y la que quede vieja es la que va a mentir — que es exactamente
   la clase de defecto que P202 vino a cerrar.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P206 · el autodiagnóstico es UNO solo y vive en el auditor', () => {
  return Promise.all([
    p202Fuente('/pruebas/auditor.js'),
    p202Fuente('/pruebas/auditar-panel.html'),
    p202Fuente('/pruebas/auditar-login.html'),
    p202Fuente('/pruebas/auditar-entrada.html')
  ]).then(([aud, panel, login, entrada]) => {
    PRUEBAS.cierto(/AUDITOR\.autodiagnostico = function/.test(aud),
      '🔴 vive en `auditor.js` · tres copias se desincronizan y la vieja miente');
    [['panel', panel], ['login', login], ['entrada', entrada]].forEach(([n, src]) => {
      PRUEBAS.cierto(/AUDITOR\.autodiagnostico\(/.test(src),
        '🔴 `auditar-' + n + '.html` lo usa');
      PRUEBAS.cierto(/EL AUDITOR NO MIDE/.test(src),
        '🔴 y ABORTA cuando falla · informar igual es el defecto #39');
    });
    /* Y ninguna se quedó con su propia copia, que es como vuelven a separarse. */
    [['panel', panel], ['login', login], ['entrada', entrada]].forEach(([n, src]) =>
      PRUEBAS.igual(src.match(/function autodiagnostico\(/g), null,
        '⚠️ `auditar-' + n + '.html` no tiene copia propia'));
  });
});

PRUEBAS.caso('🔴 P206 · las tres miden la cobertura sobre lo que dicen auditar', () => {
  return Promise.all([
    p202Fuente('/pruebas/auditar-panel.html'),
    p202Fuente('/pruebas/auditar-login.html'),
    p202Fuente('/pruebas/auditar-entrada.html')
  ]).then(([panel, login, entrada]) => {
    /* Cada una sobre SU objeto: el panel por el rectángulo de `#dashScroll`, las otras dos porque
       el overlay que abrieron esté visible. Medir el documento entero fue el agujero del panel: el
       splash tiene 42 textos y la guarda no disparaba nunca. */
    PRUEBAS.cierto(/panelEnPantalla\(win\)/.test(panel), '🔴 el del panel mira el rectángulo del panel');
    PRUEBAS.cierto(/vacias\.push/.test(login), '🔴 el del login anota las pantallas que no se abrieron');
    PRUEBAS.cierto(/vacias\.push/.test(entrada), '🔴 y el de entrada también · no tenía ninguna guarda');
  });
});

PRUEBAS.caso('⚠️ P206 · la pantalla de entrada se llama por lo que de verdad mide', () => {
  return p202Fuente('/pruebas/auditar-entrada.html').then(src => {
    /* Se llamaba `portal-demo` y auditaba la hoja de la clave: desde P171 `splashVerDemo()` sin
       payload abre `#demoClaveOv`, no el gate. Un informe que nombra mal lo que mide manda a
       arreglar la pantalla equivocada, y deja la nombrada sin auditar nunca. */
    PRUEBAS.igual(src.match(/nombre: 'portal-demo'/g), null,
      '⚠️ ya no dice «portal-demo» · eso no es lo que abre `splashVerDemo()` desde P171');
    PRUEBAS.cierto(/nombre: 'demo-clave'/.test(src),
      '⚠️ se llama por lo que es · la hoja de la clave');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL CASO QUE FALTABA: EJECUTAR EL AUTODIAGNÓSTICO, NO LEERLO

   Los casos de arriba son regex sobre el fuente, y el verificador lo midió: reemplazando el cuerpo
   entero de `AUDITOR.autodiagnostico` por `return [];` los tres siguen en verde — el nombre sigue
   ahí, las tres herramientas lo siguen llamando, y el mensaje de aborto sigue escrito. Verifican
   que el MECANISMO esté, no que FUNCIONE. Para el instrumento que existe justamente para no
   mentir, eso no alcanza.
   ⚠️ Se carga `auditor.js` EN ESTA página (el mismo patrón que `p111-contraste-panel.js`), se le
   rompe una familia a propósito, y se exige que se dé cuenta. Restaurar va en el `.finally()` de la
   promesa, nunca en el `finally` del bloque: R18 se cobró cuatro rojos falsos por eso.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
let P202_AUD = null;
function p202Auditor(){
  if (P202_AUD !== null) return Promise.resolve(P202_AUD);
  return new Promise(res => {
    const el = document.createElement('script');
    let listo = false;
    const fin = () => { if (listo) return; listo = true;
      res(P202_AUD = (typeof AUDITOR !== 'undefined' && AUDITOR.autodiagnostico) ? AUDITOR : null); };
    el.onload = fin; el.onerror = fin;
    setTimeout(fin, 5000);
    el.src = '/pruebas/auditor.js?v=' + Date.now();
    document.head.appendChild(el);
  });
}

PRUEBAS.caso('🔴 P206 · el autodiagnóstico SE EJECUTA y se da cuenta cuando el auditor no mide', () => {
  return p202Auditor().then(AUD => {
    PRUEBAS.cierto(!!AUD, 'guarda: `auditor.js` se cargó · sin esto el caso no prueba nada');
    if (!AUD) return;
    /* Se corre sobre un documento propio para no ensuciar la suite: `autodiagnostico` planta un
       `div`, cambia `data-tema` y abre los `<details>` de lo que tenga delante. */
    const host = document.createElement('div');
    document.body.appendChild(host);
    const originales = {};
    return Promise.resolve().then(() => {
      /* 1 · con el auditor sano no se queja de nada. */
      const sano = AUD.autodiagnostico();
      PRUEBAS.igual(sano, [],
        '🔴 con el auditor sano no falta ninguna familia · si acá fallara, el instrumento abortaría toda auditoría para siempre');

      /* 2 · DISCRIMINADOR · se rompe cada familia por separado y tiene que nombrarla. */
      const familias = {
        contraste:         () => ({ malos: [], sinMedir: 0, medidos: 40 }),
        superficiesClaras: () => [],
        areasDeToque:      () => [],
        cortes:            () => []
      };
      Object.keys(familias).forEach(k => {
        originales[k] = AUD[k];
        AUD[k] = familias[k];
        const faltan = AUD.autodiagnostico();
        AUD[k] = originales[k];
        PRUEBAS.alMenos(faltan.length, 1,
          '🔴 con `' + k + '` rota el autodiagnóstico lo dice · leyó: ' + JSON.stringify(faltan));
      });

      /* 3 · Y el caso extremo: un auditor que no mide NADA tiene que nombrarlo, no quedarse mudo. */
      originales.todo = AUD.todo;
      AUD.todo = () => ({ medidos: 0, contraste: [], superficiesClarasEnOscuro: [],
                          areasDeToque: [], cortes: [] });
      const mudo = AUD.autodiagnostico();
      AUD.todo = originales.todo;
      PRUEBAS.cierto(mudo.some(x => /medidos/.test(String(x))),
        '🔴 y dice explícitamente que no midió ni un texto · ' + JSON.stringify(mudo).slice(0, 120));
    }).finally(() => {
      /* R18 · restaurar en el `.finally()` de la promesa, no en el del bloque. */
      Object.keys(originales).forEach(k => { AUD[k] = originales[k]; });
      host.remove();
      try { document.documentElement.removeAttribute('data-tema'); } catch(e){}
    });
  });
});
