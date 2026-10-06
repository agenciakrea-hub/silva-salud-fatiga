
PRUEBAS.grupo('A2c · la tira de presentación del splash');

/* ⚠️ POR QUÉ EXISTE. Franco mandó una captura donde la línea del gráfico "Prevención e Impacto" se
   pintaba naranja hasta cierto punto y el tramo final quedaba GRIS, y donde en computadora —donde
   más espacio hay— no se veían los textos de la tarjeta.
   Las dos auditorías anteriores (A2 y A2b) habían dado 0 hallazgos sobre estas mismas pantallas.
   No las vieron porque miden geometría y contraste de lo que ESTÁ, y ninguno de los dos defectos es
   geometría: uno es un color mal pintado ADENTRO de un SVG, y el otro es contenido que directamente
   NO ESTÁ (display:none). Un auditor que sólo mira lo presente no puede encontrar lo ausente.
   De ahí los dos casos de abajo, que son de una clase nueva: uno cuenta PÍXELES, el otro comprueba
   que algo que debería estar, esté. */

/* Rasteriza el SVG de la línea a un tamaño dado y devuelve cuántos de los puntos muestreados cerca
   del FINAL del trazo salieron naranjas. Es la única forma honesta de comprobarlo: el defecto no
   está en ninguna medida del DOM —la polilínea tiene el tamaño correcto y el `stroke` correcto—,
   está en qué píxeles termina pintando el patrón de guiones. */
function a2cPintadoAlFinal(W, H, dasharray){
  const orig = document.querySelector('.spl-linea svg');
  if (!orig) return Promise.resolve(null);
  const svg = orig.cloneNode(true);
  const viva = svg.querySelector('.spl-l-viva'), fondo = svg.querySelector('.spl-l-fondo');
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  /* El clon no hereda la hoja de estilos, así que los estilos que importan van en línea — incluido
     `non-scaling-stroke`, que es justamente lo que hace que el guion se mida en píxeles. */
  [fondo, viva].forEach(p => {
    p.setAttribute('fill','none'); p.setAttribute('stroke-width','2.5');
    p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round');
    p.setAttribute('vector-effect','non-scaling-stroke');
  });
  fondo.setAttribute('stroke', '#dfe3ea');     // el gris del fondo
  viva.setAttribute('stroke', '#f47a1f');      // el naranja
  viva.setAttribute('stroke-dasharray', dasharray);
  viva.setAttribute('stroke-dashoffset', '0');  // estado FINAL de la animación
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      let ok = 0, tot = 0;
      [W-3, W-10, W-25, W-50, W-90].forEach(px => {
        if (px < 1) return;
        /* ⚠️ EL PÍXEL MÁS OPACO DE LA COLUMNA, NO EL PRIMERO CON ALFA. El primero es el BORDE
           antialiaseado del trazo, donde el color viene mezclado con el fondo: medido, su canal azul
           daba 91–112 contra un umbral de 90, así que el caso se ponía rojo según cómo rasterizara el
           navegador — tres rojos de splash en tres rondas, todos con naranjas de cobertura parcial
           (alfa 52–211). El centro del trazo tiene el color real.
           ⚠️ Esto NO afloja ningún umbral: el discriminador sigue dando 0/5 con una línea gris, porque
           el gris de fondo es (223,227,234) y ninguno de sus píxeles pasa `d[0] > 200 && d[1] < 170`. */
        let hit = null, mejor = -1;
        for (let py = 0; py < H; py++){
          const d = cx.getImageData(px, py, 1, 1).data;
          if (d[3] > 40 && !(d[0] > 245 && d[1] > 245 && d[2] > 245) && d[3] > mejor){
            mejor = d[3]; hit = d;
            if (d[3] === 255) break;      // opaco: no hay nada mejor abajo
          }
        }
        tot++;
        if (hit && hit[0] > 200 && hit[1] < 170 && hit[2] < 90) ok++;
      });
      res({ ok, tot });
    };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
  });
}

/* El mismo cálculo que hace `splMedirTrazo` en la app, replicado acá.
   ⚠️ ESTE COMENTARIO DECÍA «si alguien cambia el de la app y se olvida de este, los números dejan
   de coincidir y el caso lo dice», y era FALSO: los casos de abajo rasterizan con ESTE número y
   nunca comparan contra el que la app escribe en `--spl-traza`. Medido: con la app escribiendo 420
   —el defecto de la captura— los cuatro casos daban verde. Quien compara los dos números es el caso
   «el número que ESCRIBE la app es el que la fórmula espera»; sin él, esta réplica sólo comprueba
   que la fórmula es consistente consigo misma. */
function a2cLargoEsperado(W, H){
  const l = document.querySelector('.spl-l-viva');
  const pts = (l.getAttribute('points')||'').trim().split(/\s+/).map(p => p.split(',').map(Number));
  const sx = W/300, sy = H/100;
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot((pts[i][0]-pts[i-1][0])*sx, (pts[i][1]-pts[i-1][1])*sy);
  return Math.ceil(L + 2);
}

PRUEBAS.caso('⚠️ la línea llega naranja hasta el final, a cualquier tamaño', async () => {
  /* EL DEFECTO DE LA CAPTURA. Había un `stroke-dasharray: 420` escrito a mano; la polilínea usa
     `vector-effect: non-scaling-stroke`, con lo cual el guion se mide en PÍXELES DE PANTALLA y su
     largo crece con el tamaño. Medido a 1366: trazo de 514 px pintando 420 — 94 px de gris.
     Contado con este mismo método, el `420` daba 4/5 a 400 px de ancho y **0/5 a 600**.
     Ahora el largo lo mide `splMedirTrazo()` y se guarda en `--spl-traza`.

     ⚠️ Y NO ALCANZA CON PROBAR UN SOLO TAMAÑO: a 233 px —el ancho que tiene hoy la tarjeta— el
     número viejo TAMBIÉN daba 5/5, porque ahí el trazo mide menos de 420. Un caso a un solo tamaño
     habría dado verde con el bug puesto. Por eso van seis. */
  const tamaños = [[180,90],[233,96],[233,156],[400,120],[600,160],[900,200]];
  const malos = [];
  for (const [W,H] of tamaños){
    const r = await a2cPintadoAlFinal(W, H, a2cLargoEsperado(W,H));
    if (!r) { malos.push(W+'x'+H+': no se pudo rasterizar'); continue; }
    if (r.ok < r.tot) malos.push(W+'x'+H+': sólo ' + r.ok + ' de ' + r.tot + ' puntos naranjas');
  }
  PRUEBAS.igual(malos, [],
    'cerca del final del trazo TODO tiene que ser naranja; lo gris es la línea de fondo asomando');
});

PRUEBAS.caso('🔴 el número que ESCRIBE la app es el que la fórmula espera', async () => {
  /* ⚠️ ESTE CASO FALTABA, Y ES EL QUE DA SENTIDO A TODOS LOS DEMÁS. Los de arriba rasterizan con
     `a2cLargoEsperado`, que **replica** la fórmula de `splMedirTrazo` — nunca comparan contra
     `--spl-traza`, que es lo que la app de verdad escribe. Medido por el verificador: puso
     `splMedirTrazo` a escribir `420px` —el número exacto de la captura que Franco mandó, el defecto
     que este archivo existe para prevenir— y los cuatro casos corrieron **en verde**. */
  const linea = document.querySelector('.spl-l-viva');
  if (!linea) { PRUEBAS.cierto(false, '⚠️ no está `.spl-l-viva`: este contrato queda SIN MEDIR'); return; }
  const svg = linea.ownerSVGElement;
  /* ⚠️ `splMedirTrazo` corta si el rect da 0, y en esta pestaña oculta puede pasar (R11). Se le da
     un tamaño explícito al contenedor, y si aun así no mide, el caso lo DICE en vez de pasar. */
  const cont = svg && svg.parentElement;
  const prev = cont ? cont.getAttribute('style') : null;
  try {
    if (cont) cont.setAttribute('style',
      (prev ? prev + ';' : '') + 'position:fixed;left:0;top:0;width:600px;height:160px;z-index:-1');
    linea.style.removeProperty('--spl-traza');
    splMedirTrazo();
    const escrito = parseFloat(linea.style.getPropertyValue('--spl-traza') || '');
    const r = svg.getBoundingClientRect();
    PRUEBAS.cierto(r.width > 0 && r.height > 0,
      '⚠️ el SVG no tiene tamaño: `splMedirTrazo` corta y este caso NO mide · ' + r.width + 'x' + r.height);
    PRUEBAS.cierto(isFinite(escrito) && escrito > 0,
      '⚠️ la app no escribió `--spl-traza`: el contrato queda SIN MEDIR · ' +
      JSON.stringify(linea.style.getPropertyValue('--spl-traza')));
    if (isFinite(escrito) && escrito > 0 && r.width > 0) {
      const esperado = a2cLargoEsperado(r.width, r.height);
      PRUEBAS.cierto(Math.abs(escrito - esperado) <= 1,
        '⚠️ el número que ESCRIBE la app tiene que ser el que la fórmula espera · app=' + escrito +
        ' fórmula=' + esperado);
      /* ⚠️ Discriminador: el 420 de la captura NO puede pasar por bueno a este tamaño. */
      PRUEBAS.cierto(Math.abs(420 - esperado) > 1,
        '⚠️ discriminador: a ' + Math.round(r.width) + 'px el número viejo (420) difiere de la ' +
        'fórmula (' + esperado + '), así que esta comparación lo cazaría');
    }
  } finally {
    if (cont) { if (prev === null) cont.removeAttribute('style'); else cont.setAttribute('style', prev); }
    try { splMedirTrazo(); } catch (e) {}
  }
});


PRUEBAS.caso('⚠️ y el caso discrimina: con el número viejo tiene que fallar', async () => {
  /* Sin esto, el caso de arriba no vale nada: comprobado en A2b que una prueba de layout puede pasar
     sin medir. Acá se rasteriza a propósito con el `420` de antes y se exige que salga MAL, para que
     quede demostrado que el método detecta el defecto y no sólo describe el estado actual. */
  const r = await a2cPintadoAlFinal(600, 160, 420);
  PRUEBAS.cierto(!!r, 'la rasterización tiene que funcionar');
  if (r) PRUEBAS.cierto(r.ok < r.tot,
    'con el dasharray fijo de 420 a 600px el final NO puede salir todo naranja — si sale, este ' +
    'método dejó de detectar el defecto y el caso de arriba es decorativo (dio ' + r.ok + '/' + r.tot + ')');
});

PRUEBAS.caso('⚠️ en computadora la tarjeta MUESTRA su bajada, no la esconde', () => {
  /* EL SEGUNDO DEFECTO. Había un `@media (max-height:760px)` que ocultaba la bajada y el chip. Se
     escribió para teléfonos de pantalla corta, pero `max-height` SIN `max-width` es una trampa: un
     portátil de 1366x768 deja ~650 px de alto útil, así que la regla se disparaba en toda
     computadora y escondía el texto justo donde más lugar hay.
     Ahora la regla lleva `and (max-width:899px)` y en escritorio la tarjeta se acomoda en grilla
     —texto a la izquierda, gráfico a la derecha— en vez de pelear por el alto.

     ⚠️ Este caso es de una clase que no existía en la suite: no comprueba que algo esté BIEN, sino
     que algo ESTÉ. Las auditorías miden lo que encuentran, así que un elemento en `display:none` no
     les genera ningún hallazgo — desaparece y con él la sospecha. */
  const ov = document.getElementById('splashOv');
  const tenia = ov && ov.classList.contains('show');
  if (ov && !tenia) ov.classList.add('show');
  const malos = [];
  try {
    [[1024,700],[1366,650],[1366,768],[1920,900]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const bajadas = [...document.querySelectorAll('.splash-anim-slide .spl-p-tx span')];
        if (!bajadas.length) { malos.push(w+'x'+h+': no hay láminas para medir'); return; }
        bajadas.forEach((sp, i) => {
          if (getComputedStyle(sp).display === 'none') malos.push(w+'x'+h+': lámina ' + (i+1) + ' con la bajada oculta');
        });
      });
    });
  } finally { if (ov && !tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [], 'ninguna bajada puede estar oculta en pantalla de computadora');
});

PRUEBAS.caso('en teléfono de pantalla corta la bajada SÍ se oculta: la regla sigue sirviendo', () => {
  /* El control del caso anterior. La regla original resuelve algo real —a 375x667 con letra grande,
     la tarjeta no entra— y acotarla no puede haberla desactivado. Si este caso dejara de encontrar
     la bajada oculta, querría decir que se rompió el arreglo del teléfono para arreglar el de la
     computadora, que es el error clásico. */
  const ov = document.getElementById('splashOv');
  const tenia = ov && ov.classList.contains('show');
  if (ov && !tenia) ov.classList.add('show');
  let oculta = null;
  try {
    PRUEBAS.enVentana(375, 660, () => {
      const sp = document.querySelector('.splash-anim-slide .spl-p-tx span');
      oculta = sp ? getComputedStyle(sp).display === 'none' : null;
    });
  } finally { if (ov && !tenia) ov.classList.remove('show'); }
  PRUEBAS.cierto(oculta === true,
    'a 375x660 (teléfono de pantalla corta) la bajada tiene que seguir ocultándose — si no, se ' +
    'desactivó la regla que resolvía que la tarjeta no entrara');
});
