/* ── L3 · el buscador del panel no rehace todo, y sigue mostrando lo mismo ──────────────────────
   (2026-08-27)

   MEDIDO ANTES DE OPTIMIZAR, porque el plan asumía que era grave sin saber cuánto:
     10 personas → 2.0 ms por tecla · 50 → 8.3 · 150 → 29.1 · 300 → 61.4
   Y el costo NO era el cálculo: con 300 personas, resolver el estado de todas tardaba 2.4 ms de
   los 63.6. El resto era construir 19.373 nodos de DOM que no cambiaban.

   EL CASO MÁS IMPORTANTE DE ESTE ARCHIVO no es el de velocidad: es el que compara el HTML del
   camino rápido contra el del render completo. Una optimización que muestra algo distinto de lo
   que mostraría el camino lento es peor que la lentitud — y esa diferencia no daría ningún error,
   sólo una lista equivocada en la pantalla de un supervisor. */

PRUEBAS.grupo('L3 · buscador del panel');

function panelCon(n) {
  const hoy = todayStr(), regs = [];
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < 4; d++) {
      regs.push({
        persona: 'Persona Prueba ' + (i + 1), empresa: 'Helitec', departamento: 'Dep' + (i % 5),
        cargo: 'Piloto', fecha: fechaMasDias(hoy, -d), kss: 3 + (i % 6), estres: 20 + (i % 40),
        fatiga: 3 + (i % 7), confiable: true
      });
    }
  }
  DASH = {
    vista: 'supervisor', rol: 'empresa', empresa: 'Helitec', tabs: ['aptitud'], tab: 'aptitud',
    f: {}, _cfg: {}, referencia: { kss: 6, estres: 36, ansiedad: 25, fatiga: 7.3, gastro: 11, depresion: 42, cansancio: 19 },
    metricas: ['kss', 'estres', 'fatiga'], config: {}, marca: null,
    registros: regs, comentarios: [], pvt: [], aptitud: null, operacional: [], turnos: []
  };
  buildDashTabs(); buildDashFilters(); renderDash();
}

PRUEBAS.caso('el camino rápido muestra EXACTAMENTE lo mismo que el completo', () => {
  /* Se compara el HTML byte a byte, no la cantidad de tarjetas: una diferencia en el orden, en un
     chip o en una acción no cambiaría el conteo y pasaría igual. */
  panelCon(60);
  const diferencias = [];
  ['persona prueba 7', 'dep2', 'zzz', ''].forEach(q => {
    aptBuscar(q);
    const rapidoHtml = document.getElementById('aptTarjetas').innerHTML;
    const rapidoCuenta = (document.getElementById('aptCuenta') || {}).textContent;
    DASH._aptQ = q; renderDash();                       // el camino lento, el de siempre
    const completoHtml = document.getElementById('aptTarjetas').innerHTML;
    const completoCuenta = (document.getElementById('aptCuenta') || {}).textContent;
    if (rapidoHtml !== completoHtml) diferencias.push('html con "' + (q || '(vacío)') + '"');
    if (rapidoCuenta !== completoCuenta) diferencias.push('contador con "' + (q || '(vacío)') + '"');
  });
  DASH = null;
  PRUEBAS.igual(diferencias, [],
    'si los dos caminos difieren, el supervisor ve una lista que no es la que el panel calcularía');
});

PRUEBAS.caso('escribir no destruye el campo de búsqueda', () => {
  /* Antes el input se rehacía en cada tecla, y por eso existía un parche que guardaba la posición
     del cursor y devolvía el foco — sin él "sólo se podría escribir una letra por vez", según el
     comentario que había. Si alguien vuelve a hacer que la búsqueda repinte todo, esto lo agarra. */
  panelCon(20);
  const antes = document.getElementById('aptBuscar');
  antes.value = 'persona'; antes.setSelectionRange(3, 3);
  aptBuscar('persona');
  const despues = document.getElementById('aptBuscar');
  const cursor = despues ? despues.selectionStart : null;
  DASH = null;
  PRUEBAS.cierto(antes === despues,
    'tiene que ser el MISMO nodo: si se recrea, se pierde el cursor y escribir se vuelve imposible');
  PRUEBAS.igual(cursor, 3, 'y la posición del cursor queda donde estaba');
});

PRUEBAS.caso('el botón de limpiar existe siempre y se muestra según haga falta', () => {
  /* Antes se agregaba al HTML sólo cuando había texto. Como la búsqueda ya no redibuja el
     buscador, si no estuviera desde el principio no aparecería nunca. */
  panelCon(20);
  aptBuscar('');
  const x = document.querySelector('.apt-buscar-x');
  PRUEBAS.cierto(!!x, 'tiene que estar en el DOM aunque no haya texto');
  PRUEBAS.igual(x.style.display, 'none', 'oculto mientras la búsqueda está vacía');
  aptBuscar('persona');
  PRUEBAS.falso(x.style.display === 'none', 'y visible cuando hay algo que limpiar');
  aptBuscar('');
  const todas = document.querySelectorAll('#aptTarjetas .apt-card').length;
  DASH = null;
  PRUEBAS.igual(todas, 20, 'al limpiar tiene que volver la lista completa');
});

PRUEBAS.caso('sin el contenedor cae al render completo, no deja la pantalla vieja', () => {
  /* Puede pasar si el panel todavía no se pintó. Es el camino lento, pero correcto: mostrar datos
     desactualizados sería peor que tardar. */
  panelCon(10);
  const cont = document.getElementById('aptTarjetas');
  cont.parentNode.removeChild(cont);
  aptBuscar('persona prueba 3');
  const rearmado = document.getElementById('aptTarjetas');
  const n = rearmado ? rearmado.querySelectorAll('.apt-card').length : -1;
  DASH = null;
  PRUEBAS.cierto(!!rearmado, 'el render completo tiene que reponer el contenedor');
  PRUEBAS.alMenos(n, 1, 'y con la búsqueda aplicada, no vacío');
});

PRUEBAS.grupo('L3 · el reloj del ciclo');

PRUEBAS.caso('se apaga con la app en segundo plano', () => {
  /* El tick cuesta 0.02 ms y no molesta; lo que cuesta es lo que dispara: `dashRefresh()` cada
     60 s mientras la sección esté en el DOM. Un supervisor con el panel abierto todo el turno son
     unos 480 pedidos al endpoint sin nadie mirando — y el refresco general de la app es diario a
     propósito, justamente por la cuota del endpoint. */
  panelCon(10);
  DASH.tab = 'ciclo'; DASH.tabs = ['ciclo']; buildDashTabs(); renderDash();
  cicloTickStart();
  PRUEBAS.cierto(!!_cicloTimer, 'con la sección en pantalla, el reloj corre');
  document.dispatchEvent(new Event('visibilitychange'));   // en este entorno el documento está oculto
  PRUEBAS.falso(!!_cicloTimer,
    'oculto tiene que apagarse: si no, sigue pidiendo datos cada minuto con el teléfono guardado');
  cicloTickStop();
  DASH = null;
});

PRUEBAS.caso('se apaga solo si no queda NADA vivo en pantalla', () => {
  /* Ya existía y conviene que siga: es lo que evita que el reloj quede corriendo para siempre
     después de cambiar de pestaña.
     ⚠️ La condición CAMBIÓ en Y2 y el cambio es a propósito. Antes alcanzaba con que desapareciera
     la sección del panel; ahora el mismo reloj también mueve el bloque del inicio del empleado
     (`.cic-mio`), que antes quedaba congelado. Así que para que se apague tienen que faltar LOS DOS.
     Si esta prueba sólo saca la sección del panel, el reloj sigue vivo con razón. */
  panelCon(10);
  DASH.tab = 'ciclo'; DASH.tabs = ['ciclo']; buildDashTabs(); renderDash();
  const sec = document.getElementById('dsec-ciclo');
  const padre = sec.parentNode;
  padre.removeChild(sec);
  const mio = document.querySelector('.cic-mio');
  const padreMio = mio ? mio.parentNode : null;
  if (mio) padreMio.removeChild(mio);
  cicloTickStart();
  cicloTick();
  const vivo = !!_cicloTimer;
  padre.appendChild(sec);
  if (mio) padreMio.appendChild(mio);
  cicloTickStop(); DASH = null;
  PRUEBAS.falso(vivo, 'sin panel NI bloque de inicio no hay nada que actualizar: el reloj se apaga');
});
