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
  return p202Fuente('/pruebas/auditar-panel.html').then(src => {
    PRUEBAS.cierto(/async function autodiagnostico\(/.test(src),
      '🔴 tiene que existir el autodiagnóstico · sin él, «0 hallazgos» y «no miré nada» son lo mismo');
    /* Que exista no alcanza: tiene que CORRER ANTES del recorrido y ABORTAR si falla. */
    const iAuto = src.indexOf('await autodiagnostico(win)');
    const iBucle = src.indexOf('for (const p of lista)');
    PRUEBAS.cierto(iAuto > 0 && iBucle > 0 && iAuto < iBucle,
      '🔴 y correr ANTES de recorrer las pantallas · después no sirve de nada');
    const bloque = src.slice(iAuto, iBucle);
    PRUEBAS.cierto(/if \(fallos\.length\)/.test(bloque) && /return;/.test(bloque),
      '🔴 y CORTAR cuando no mide · informar igual es exactamente el defecto #39');
    /* Las cuatro familias que el auditor promete buscar. Si mañana se agrega una quinta y el
       autodiagnóstico no la cubre, este caso no lo ve — pero si se BORRA una de éstas, sí. */
    ['contraste', 'superficiesClarasEnOscuro', 'areasDeToque', 'cortes'].forEach(f =>
      PRUEBAS.cierto(src.indexOf('r.' + f) > 0,
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
  return p202Fuente('/pruebas/auditar-panel.html').then(src => {
    PRUEBAS.cierto(/ad-sup/.test(src),
      '⚠️ la superficie clara se planta por hoja de estilo y se busca por su nombre');
    PRUEBAS.igual(src.match(/if \(!\(r\.\w+ \|\| \[\]\)\.length\)/g), null,
      '⚠️ y ninguna familia se comprueba por `.length` · con eso pasa aunque el auditor esté roto');
    PRUEBAS.cierto(/se pasa \\d\+px/.test(src),
      '⚠️ el corte también se busca por su forma');
  });
});
