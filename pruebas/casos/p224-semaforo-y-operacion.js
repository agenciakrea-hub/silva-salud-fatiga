PRUEBAS.grupo('P224 · el semáforo de la tarjeta y la operación visible');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Feedback de Rafael (2026-10-04), señalando con un círculo los ocho chips de una tarjeta:
   **«debería ser un tráfico, es más fácil de gestionar»**, y antes: «esta vista hay que mejorarla,
   está confusa».
   Tenía razón y el número lo dice: con 18 personas en pantalla, ocho chips por tarjeta son **144
   chips** que hay que leer para encontrar el que importa — lo contrario de R6 (el panel muestra lo
   que necesita acción, no todo lo que hay).

   Y la segunda mitad: «**como supervisor no sé qué tarea u operación estoy viendo**… Adelis es de
   Cardón». Esa dimensión NO existe en el modelo, pero la están metiendo en el campo `Cargo`:
   medido en `Registrados Fatiga`, **7 personas tienen el «cargo» `Op. Cardon`**. Mostrarlo es un
   puente hasta el bloque Q del plan.

   ⚠️ R19 · el derecho que se afirma y quién lo concede: la frase la arma `aptSemaforoLinea(p)` a
   partir de `p.metricas` y `p.pvt` — los mismos datos de siempre, sólo resumidos, sin inventar
   ninguno. El cargo lo concede `aptAutoServer` (que ahora lo incluye) y lo propaga
   `aptResolverFinal`, cuya lista explícita lo descartaba.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p224P(extra){
  return Object.assign({
    nombre:'ANA PRUEBA', dep:'Operaciones', cargo:'Op. Cardon', n:3,
    metricas:[{m:'kss',nivel:'ok'},{m:'estres',nivel:'ok'},{m:'ansiedad',nivel:'ok'}],
    pvt:null, auto:'ok', empeoro:false, persist:null, nivel:3,
    pocoConfiable:0, ultimoPocoConfiable:false, dias:1, viejo:false,
    ultimaFecha:'2026-10-03', estado:'ok'
  }, extra || {});
}
const P224_TXT = h => { const d = document.createElement('div'); d.innerHTML = h;
  return d.textContent.replace(/\s+/g,' ').trim(); };

PRUEBAS.caso('🔴 la tarjeta dice UNA frase, no ocho chips: qué está por encima y qué está en rango', () => {
  /* LO QUE TIENE QUE CAMBIAR · la frase nombra lo que pide acción, no lo que está bien */
  const alto = P224_TXT(aptSemaforoLinea(p224P({
    metricas:[{m:'kss',nivel:'ok'},{m:'estres',nivel:'alto'},{m:'ansiedad',nivel:'ok'}] })));
  PRUEBAS.cierto(/estr/i.test(alto), '🔴 nombra el indicador que está por encima · ' + alto);
  PRUEBAS.falso(/kss|somnolencia/i.test(alto),
    '🔴 y NO nombra los que están bien: eso es lo que hace que haya que leer 144 chips');

  const dos = P224_TXT(aptSemaforoLinea(p224P({
    metricas:[{m:'kss',nivel:'alto'},{m:'estres',nivel:'alto'},{m:'ansiedad',nivel:'ok'}] })));
  PRUEBAS.cierto(/2/.test(dos), '🔴 con dos por encima dice cuántos · ' + dos);

  /* El caso bueno TAMBIÉN se dice: si no, «todo en rango» y «no se midió» se ven igual. */
  const ok = P224_TXT(aptSemaforoLinea(p224P()));
  PRUEBAS.cierto(/3/.test(ok), '🔴 con todo en rango dice cuántos indicadores son · ' + ok);
  PRUEBAS.falso(/por encima|cerca del/i.test(ok), '🔴 y no insinúa que haya algo mal');

  const sin = P224_TXT(aptSemaforoLinea(p224P({ metricas:[{m:'kss',nivel:'sin'}], pvt:null })));
  PRUEBAS.cierto(sin.length > 0 && !/^0/.test(sin),
    '🔴 sin indicadores medidos lo dice, no queda en blanco · ' + sin);

  /* ⚠️ `medio` sólo cuando NO hay ninguno `alto`: lo urgente manda. */
  const mezcla = P224_TXT(aptSemaforoLinea(p224P({
    metricas:[{m:'kss',nivel:'medio'},{m:'estres',nivel:'alto'}] })));
  PRUEBAS.cierto(/por encima/i.test(mezcla) && !/cerca del/i.test(mezcla),
    '🔴 con uno alto y uno medio manda el alto: lo urgente primero · ' + mezcla);
});

PRUEBAS.caso('🔴 la tarjeta dice de qué OPERACIÓN es la persona, y los ocho quedan PLEGADOS', () => {
  /* EL DERECHO: `aptResolverFinal` propaga `cargo`, que es lo único que hoy dice de qué operación
     es alguien. ⚠️ Su lista de campos es EXPLÍCITA y lo descartaba: medido contra el CH, el payload
     traía `cargo` en 17 de 18 personas y al cliente llegaban 0. Es el defecto de R17 (`duty`,
     `ausencias`, `demo`) por cuarta vez. */
  const html = aptTarjeta(p224P(), {});
  PRUEBAS.cierto(html.indexOf('Op. Cardon') >= 0,
    '🔴 la operación aparece en la tarjeta: sin esto el supervisor no sabe qué está viendo');
  /* LO QUE NO PUEDE CAMBIAR · el departamento sigue estando */
  PRUEBAS.cierto(html.indexOf('Operaciones') >= 0, '🔴 NO PUEDE CAMBIAR · el departamento sigue');
  /* Y no se repite cuando cargo y departamento son lo mismo. */
  const igual = aptTarjeta(p224P({ cargo:'Operaciones' }), {});
  const caja = document.createElement('div'); caja.innerHTML = igual;
  const linea = (caja.querySelector('.apt-dep') || {}).textContent || '';
  PRUEBAS.igual((linea.match(/Operaciones/g) || []).length, 1,
    '🔴 si el cargo es igual al departamento no se escribe dos veces · ' + linea.slice(0,50));

  /* LOS OCHO, PLEGADOS. ⚠️ Esto se mide EN EL DOM y no en la cadena: el `<details>` cerrado NO los
     ocultaba —`.apt-boxes` trae `display:flex` propio y gana— así que los 126 chips seguían
     visibles y el cambio entero era cosmético. Un `indexOf` sobre el HTML habría pasado igual. */
  const cont = document.createElement('div');
  cont.style.cssText = 'position:fixed;left:-9999px;top:0;width:390px';
  cont.innerHTML = aptTarjeta(p224P(), {});
  document.body.appendChild(cont);
  try {
    const det = cont.querySelector('.apt-det');
    PRUEBAS.cierto(!!det, 'guarda: hay un bloque plegable');
    PRUEBAS.falso(det.open, '🔴 arranca CERRADO: quien barre 18 tarjetas no abre ninguna');
    const boxes = Array.from(cont.querySelectorAll('.apt-box'));
    PRUEBAS.alMenos(boxes.length, 3, 'guarda: los chips siguen en el DOM, no se borraron');
    PRUEBAS.igual(boxes.filter(e => e.offsetParent !== null).length, 0,
      '🔴 y NINGUNO se ve con el detalle cerrado');
    /* DISCRIMINADOR · al abrirlo tienen que aparecer: si no, estarían ocultos por otra razón */
    det.open = true;
    PRUEBAS.alMenos(cont.querySelectorAll('.apt-box').length, 3, 'guarda: siguen ahí');
    PRUEBAS.cierto(Array.from(cont.querySelectorAll('.apt-box')).some(e => e.offsetParent !== null),
      '🔴 DISCRIMINADOR · al abrir el detalle los chips SÍ aparecen');
    /* El control es la línea entera, y mide 44 px: es un objetivo táctil, no un enlace chico. */
    const sum = cont.querySelector('.apt-det > summary');
    PRUEBAS.cierto(!!sum.querySelector('.apt-sem'),
      '🔴 la línea del semáforo ESTÁ DENTRO del control: separarlas costaba una línea por tarjeta');
    PRUEBAS.cierto(!!sum.getAttribute('aria-label'),
      '🔴 y el control dice qué hace para un lector de pantalla, que sólo oiría el estado');
  } finally { cont.remove(); }
});
