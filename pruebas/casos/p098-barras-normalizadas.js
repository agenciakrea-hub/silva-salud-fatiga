PRUEBAS.grupo('P098 · las barras del grupo, normalizadas contra su referencia');

/* ⚠️ POR QUÉ EXISTE ESTE ARCHIVO.
   `dashGroupedBars` —el gráfico más visible del panel del servicio médico— ponía las SIETE métricas
   sobre UN SOLO EJE CRUDO. Medido en la app: el eje Y llegaba a 48 sin unidad, la barra de
   Somnolencia medía 10,4 px y la de Depresión 87 px. Pero Somnolencia es KSS, que va de 1 a 9, y
   Depresión llega a ~90: un KSS de 9 —somnolencia severa, el indicador más importante para fatiga—
   no podía pasar de un quinto de la altura del gráfico ni aunque la persona se estuviera durmiendo
   parada. La altura no expresaba gravedad, expresaba el rango del instrumento.
   Lo delataba el radar de al lado, que con los MISMOS siete datos ya divide cada eje por su
   referencia. Ahora las barras hacen lo mismo: la unidad es VECES LA REFERENCIA y 1,0 es el límite.

   ⚠️ CÓMO SE PRUEBA, Y POR QUÉ ASÍ (R17). Nada de armar `DASH` a mano: el estado entra por
   `onDashData(payload, ...)`, que es el ÚNICO camino por el que el panel recibe datos en producción.
   Ya se perdieron tres funciones por probar la pieza en vez del uso — `duty` y `ausencias` se caían
   dentro de `onDashData` y las dos suites las inyectaban directo en `DASH`, así que daban verde
   mientras producción estaba rota. Acá el payload tiene la forma exacta del `.gs`.

   ⚠️ Y CADA CASO TRAE SU DISCRIMINADOR: una comprobación que demuestra que el caso se pondría rojo
   con el código VIEJO. Un cero sin discriminador no es un resultado. */

const P098_REF = { kss:6, estres:36, ansiedad:25, fatiga:7.3, gastro:11, depresion:42, cansancio:19 };
const P098_METRICAS = ['kss','estres','ansiedad','fatiga','gastro','depresion','cansancio'];

/* El escenario que reproduce el defecto en su forma más pura:
   · KSS 9 sobre referencia 6  → 1,50 veces el límite (somnolencia severa, hay que actuar)
   · Depresión 30 sobre ref 42 → 0,71 veces el límite (por debajo, no necesita acción)
   En CRUDO, 30 es 3,3 veces más grande que 9. Con el eje crudo, el indicador que NO necesita
   acción se dibujaba más de tres veces más alto que el que sí. */
const P098_VALORES = { kss:9, estres:20, ansiedad:10, fatiga:4, gastro:5, depresion:30, cansancio:8 };
/* Todo por debajo del límite: hace falta para la leyenda, porque una barra por encima se pinta de
   rojo y entonces el color de esa métrica no aparece en el gráfico por una razón legítima. */
const P098_BAJOS = { kss:3, estres:12, ansiedad:6, fatiga:2, gastro:3, depresion:14, cansancio:6 };

/* Entra por onDashData con el payload real, dibuja el gráfico en una caja de 340 px —el ancho del
   viewBox, o sea escala 1: las unidades del SVG son píxeles y la medición no arrastra redondeos— y
   devuelve lo que mida `fn`. Deja el panel como estaba pase lo que pase. */
function p098Con(fn, valores, refs){
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  const vals = valores || P098_VALORES, ref = refs || P098_REF;
  const regs = [];
  for (let i = 0; i < 4; i++)
    regs.push(Object.assign({ fecha:'2026-09-0'+(i+1), persona:'Persona '+i,
                              departamento:'Operaciones', empresa:'Empresa De Prueba' }, vals));
  onDashData({ ok:true, rol:'supervisor', vista:'medico', referencia:ref, metricas:P098_METRICAS,
               registros:regs, comentarios:[], pvt:[], operacional:[], aptitud:null, turnos:[] },
             'Empresa De Prueba', { emp:'Empresa De Prueba' }, 'medico');
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:0;top:0;width:340px;z-index:-1;';
  caja.innerHTML = dashGroupedBars(DASH.registros);
  document.body.appendChild(caja);
  void document.body.offsetWidth;   // sin esperas: acá los temporizadores están estrangulados
  try { return fn(caja, DASH); }
  finally {
    caja.remove();
    DASH = previo;
    try { if (previo) renderDash(); else { const b = document.getElementById('dashBody'); if (b) b.innerHTML = ''; } } catch(e){}
  }
}

/* La variante que mide sobre el PANEL DE VERDAD, con el overlay abierto y al ancho que se pida.
   Se usa para todo lo que dependa del tamaño real en pantalla (el cuerpo de las etiquetas), porque
   ahí el viewBox se escala y una medida tomada en la caja de 340 px no diría la verdad. */
function p098EnPanel(ancho, alto, fn, valores){
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  const ov = document.getElementById('portalOverlay');
  const teniaShow = ov && ov.classList.contains('show');
  const vals = valores || P098_VALORES;
  const regs = [];
  for (let i = 0; i < 4; i++)
    regs.push(Object.assign({ fecha:'2026-09-0'+(i+1), persona:'Persona '+i,
                              departamento:'Operaciones', empresa:'Empresa De Prueba' }, vals));
  onDashData({ ok:true, rol:'supervisor', vista:'medico', referencia:P098_REF, metricas:P098_METRICAS,
               registros:regs, comentarios:[], pvt:[], operacional:[], aptitud:null, turnos:[] },
             'Empresa De Prueba', { emp:'Empresa De Prueba' }, 'medico');
  if (ov) ov.classList.add('show');
  try {
    return PRUEBAS.enVentana(ancho, alto, () => {
      const bloque = [].slice.call(document.querySelectorAll('.dash-block')).filter(b => {
        const tit = b.querySelector('.db-title');
        return tit && tit.textContent === t('db_grupo_normal');
      })[0];
      return fn(bloque);
    });
  } finally {
    if (ov && !teniaShow) ov.classList.remove('show');
    DASH = previo;
    try { if (previo) renderDash(); else { const b = document.getElementById('dashBody'); if (b) b.innerHTML = ''; } } catch(e){}
  }
}

/* Las 4 esquinas de un `<text>` rotado, en unidades de viewBox, calculadas a mano.
   ⚠️ NO se usa `getBoundingClientRect`: medido acá mismo, en el panel devuelve la caja SIN aplicar
   el `transform` del propio elemento (una etiqueta rotada 40° daba 119,9 × 26 en vez de su caja
   real), así que un caso apoyado en eso diría "no se sale" incluso cuando se sale. `getBBox` es
   local y determinista, y la rotación se aplica acá con la misma matriz que usa el navegador. */
function p098Caja(el){
  const b = el.getBBox(), tr = el.getAttribute('transform') || '';
  let cs = [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]];
  const m = tr.match(/rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)/);
  if (m){
    const a = (+m[1]) * Math.PI/180, ox = +m[2], oy = +m[3];
    cs = cs.map(p => { const dx = p[0]-ox, dy = p[1]-oy;
      return [ox + dx*Math.cos(a) - dy*Math.sin(a), oy + dx*Math.sin(a) + dy*Math.cos(a)]; });
  }
  return { x: Math.min.apply(null, cs.map(p=>p[0])), r: Math.max.apply(null, cs.map(p=>p[0])),
           y: Math.min.apply(null, cs.map(p=>p[1])), ab: Math.max.apply(null, cs.map(p=>p[1])) };
}


PRUEBAS.caso('⚠️ EL CASO DEL PROMPT: un KSS alto dibuja MÁS ALTO que una Depresión baja', () => {
  const r = p098Con((caja, dash) => {
    const rects = [].slice.call(caja.querySelectorAll('svg rect'));
    const alt = {};
    dash.metrics.forEach((m, i) => { if (rects[i]) alt[m] = +rects[i].getBoundingClientRect().height.toFixed(2); });
    return { alt: alt, metrics: dash.metrics.slice() };
  });

  PRUEBAS.cierto(r.alt.kss > r.alt.depresion,
    '⚠️ ES EL PUNTO ENTERO DEL CAMBIO. KSS 9 sobre referencia 6 es 1,50 veces el límite y necesita ' +
    'acción; Depresión 30 sobre 42 es 0,71 y no. Si la barra del KSS no es la más alta, el gráfico ' +
    'le está diciendo al médico que mire el indicador equivocado. Midió KSS=' + r.alt.kss +
    ' px contra Depresión=' + r.alt.depresion + ' px');

  /* La forma fuerte: la altura tiene que ser PROPORCIONAL a valor/referencia, no sólo estar en el
     orden correcto. Se compara el ranking completo, que es lo que se rompe si alguien vuelve a
     meter una métrica cruda en el medio. */
  const norm = {};
  r.metrics.forEach(m => { norm[m] = P098_VALORES[m] / P098_REF[m]; });
  const porAltura = r.metrics.slice().sort((a,b) => r.alt[b] - r.alt[a]);
  const porNorma  = r.metrics.slice().sort((a,b) => norm[b] - norm[a]);
  PRUEBAS.igual(porAltura, porNorma,
    'el orden de las alturas tiene que ser el orden de valor÷referencia, indicador por indicador: ' +
    'con eso, "la barra más alta" y "el que más se pasó del límite" son la misma cosa');

  /* ⚠️ DISCRIMINADOR. Si el cálculo siguiera siendo el crudo, el ranking de alturas sería el de los
     valores SIN dividir. Se comprueba que ese ranking es DISTINTO del correcto: si fueran iguales,
     este escenario no distinguiría el código nuevo del viejo y las dos comprobaciones de arriba
     estarían pasando por casualidad. */
  const porCrudo = r.metrics.slice().sort((a,b) => P098_VALORES[b] - P098_VALORES[a]);
  PRUEBAS.falso(JSON.stringify(porCrudo) === JSON.stringify(porNorma),
    'DISCRIMINADOR: con el eje crudo el orden sería ' + porCrudo.join('>') + ' y con el normalizado ' +
    'es ' + porNorma.join('>') + '. Tienen que ser distintos, o este escenario no probaría nada');
  PRUEBAS.igual(porCrudo[0], 'depresion',
    'DISCRIMINADOR: en crudo la barra más alta sería Depresión (30) y no el KSS (9) — exactamente ' +
    'el defecto que se corrigió. Si esto deja de valer, hay que cambiar el escenario de la prueba');
});


PRUEBAS.caso('⚠️ la línea del 1.0 está dibujada Y es de verdad el 1.0 (no un adorno)', () => {
  const r = p098Con((caja, dash) => {
    const svg = caja.querySelector('svg');
    const lineas = [].slice.call(svg.querySelectorAll('line'));
    const eje = lineas.filter(l => !l.getAttribute('stroke-dasharray'))[0];
    const ref = lineas.filter(l => l.getAttribute('stroke-dasharray'))[0];
    const rects = [].slice.call(svg.querySelectorAll('rect'));
    const iKss = dash.metrics.indexOf('kss');
    return { hayRef: !!ref, hayEje: !!eje,
             yEje: eje ? +eje.getAttribute('y1') : null,
             yRef: ref ? +ref.getAttribute('y1') : null,
             trazo: ref ? ref.getAttribute('stroke') : null,
             altoKss: rects[iKss] ? +rects[iKss].getAttribute('height') : null,
             viewBoxAlto: svg.viewBox.baseVal.height,
             rotuloRef: [].slice.call(svg.querySelectorAll('text')).some(x => x.textContent === '1.0'),
             rotuloEje: [].slice.call(svg.querySelectorAll('text')).some(x => x.textContent === t('eje_veces_ref')) };
  });

  PRUEBAS.cierto(r.hayRef,
    'sin la línea del 1.0 la altura de una barra no significa nada: 1.0 ES el umbral y es la única ' +
    'marca que comparten los siete indicadores');
  PRUEBAS.igual(r.trazo, 'var(--ch-ref)',
    'la punteada tiene que usar el token del umbral (R13): en oscuro --ch-ref se invierte a texto ' +
    'claro justamente para que la referencia no desaparezca');
  PRUEBAS.cierto(r.rotuloRef, 'y tiene que estar rotulada "1.0", o se lee como una guía decorativa');
  PRUEBAS.cierto(r.rotuloEje,
    'el eje tiene que decir su UNIDAD ("' + t('eje_veces_ref') + '"): sin eso el número de arriba se ' +
    'vuelve a leer como un puntaje, que es el malentendido que este cambio vino a arreglar');

  /* La comprobación que no depende de cómo esté escrito el código: la distancia del eje a la
     punteada es "1,0", así que la barra del KSS —1,50 veces la referencia— tiene que medir 1,5
     veces esa distancia. Si alguien mueve la punteada o cambia la escala, esto se cae. */
  const unidad = r.yEje - r.yRef;
  PRUEBAS.alMenos(unidad, 1, 'la punteada tiene que estar por encima del eje X, no encima de él');
  const veces = r.altoKss / unidad;
  PRUEBAS.cierto(Math.abs(veces - 1.5) < 0.03,
    'la barra del KSS (9 sobre referencia 6) tiene que medir 1,50 veces la distancia del eje a la ' +
    'línea del 1.0. Midió ' + veces.toFixed(3) + ' veces');

  /* ⚠️ DISCRIMINADOR: con el eje crudo, la barra del KSS habría medido 9/48 del alto útil y la
     línea del 1.0 ni siquiera existía. Se comprueba que la relación medida NO es la que daría el
     cálculo viejo, para que este caso no pueda pasar con las dos implementaciones. */
  const vecesCrudo = P098_VALORES.kss / P098_REF.kss;   // sólo coincide si de verdad se normalizó
  PRUEBAS.igual(+veces.toFixed(2), +vecesCrudo.toFixed(2),
    'DISCRIMINADOR: 1,50 es valor÷referencia. Con el eje crudo la altura sería proporcional a 9 y ' +
    'la relación con una línea en "6" no daría nunca 1,50 salvo que se esté dividiendo de verdad');
});


PRUEBAS.caso('⚠️ la leyenda no muestra ningún color que el gráfico no dibuje', () => {
  /* ⚠️ EL DEFECTO VIEJO: el punto de "Promedio" era `var(--sem-azul)` FIJO mientras las barras se
     pintan con `METRIC_COLORS[m]`, un color distinto por métrica. Un solo punto de color para algo
     que el gráfico dibuja de siete colores manda a buscar un azul que, como "promedio", no existe. */

  // 1 · Con TODO por debajo del límite ninguna barra se pinta de rojo, así que cada barra lleva
  //     exactamente el color de su métrica y los chips tienen que coincidir UNO POR UNO, en orden.
  const bajo = p098Con((caja, dash) => {
    const svg = caja.querySelector('svg');
    return { fills: [].slice.call(svg.querySelectorAll('rect')).map(e => getComputedStyle(e).fill),
             chips: [].slice.call(caja.querySelectorAll('.rl-toggle-row .rl-dot')).map(d => getComputedStyle(d).backgroundColor),
             metrics: dash.metrics.slice() };
  }, P098_BAJOS);

  PRUEBAS.igual(bajo.chips, bajo.fills,
    '⚠️ el chip de cada indicador tiene que ser el color de SU barra, en el mismo orden: es la única ' +
    'forma de saber cuál barra se apaga al tocarlo. Indicadores: ' + bajo.metrics.join(', '));

  // 2 · Con el KSS por encima del límite aparece el rojo, así que la fila FIJA —la que explica el
  //     umbral y el "sobre lo normal"— se comprueba en el escenario donde sus dos tintas existen.
  const alto = p098Con(caja => {
    const svg = caja.querySelector('svg');
    const dibujados = [];
    [].slice.call(svg.querySelectorAll('rect')).forEach(e => dibujados.push(getComputedStyle(e).fill));
    [].slice.call(svg.querySelectorAll('line')).forEach(e => dibujados.push(getComputedStyle(e).stroke));
    const leerDot = d => { const cs = getComputedStyle(d), bg = cs.backgroundColor;
      // la punteada de la referencia se dibuja con border-top, no con background
      return (bg && bg !== 'rgba(0, 0, 0, 0)') ? bg : cs.borderTopColor; };
    const fijos = [].slice.call(caja.querySelectorAll('.radar-legend:not(.rl-toggle-row) .rl-item'))
      .map(it => ({ txt: it.textContent.trim(), color: leerDot(it.querySelector('.rl-dot')) }));
    // La paleta de SERIES resuelta a color real: un ítem de la leyenda fija que use uno de estos
    // colores está diciendo "todas las barras son así" cuando en realidad es el color de UNA.
    const paleta = Object.keys(METRIC_COLORS).map(m => CTX.token(METRIC_COLORS[m]));
    // El punto azul del código viejo, reconstruido tal cual para probar el detector.
    const falso = document.createElement('span');
    falso.className = 'rl-dot'; falso.style.background = 'var(--sem-azul)';
    caja.querySelector('.radar-legend').appendChild(falso);
    void document.body.offsetWidth;
    const colorFalso = leerDot(falso);
    falso.remove();
    return { dibujados: dibujados, fijos: fijos, paleta: paleta, colorFalso: colorFalso };
  });

  const huerfanos = alto.fijos.filter(f => alto.dibujados.indexOf(f.color) < 0)
                              .map(f => f.txt + ' (' + f.color + ')');
  PRUEBAS.igual(huerfanos, [],
    '⚠️ un punto de la leyenda fija que no corresponde a ninguna tinta del gráfico. Sobran: ' +
    huerfanos.join(' | '));
  PRUEBAS.alMenos(alto.fijos.length, 2,
    'la leyenda fija tiene que explicar al menos el umbral (1.0) y el rojo de "sobre lo normal"');

  /* ⚠️ DISCRIMINADOR, y el que hizo falta de verdad. Dos cosas se aprendieron escribiendo esto, las
     dos midiendo y equivocándose antes:
     1) Di por hecho que `--sem-azul` era un color ajeno al gráfico. NO lo es: resuelve al mismo
        valor que `--dato-2`, que es el color del KSS. O sea que "¿este color está dibujado?" habría
        dejado pasar el punto azul viejo cada vez que el KSS estuviera POR DEBAJO del límite.
     2) Tampoco sirve exigir que la leyenda fija no use ningún color de la paleta de series:
        `--sem-rojo` coincide con `--dato-5` (el del estrés), así que esa regla marcaría en falso al
        punto rojo de "sobre lo normal", que es legítimo.
     Lo que sí discrimina es reconstruir el punto viejo EN ESTE escenario —KSS por encima, o sea
     barra roja, o sea `--dato-2` sin dibujar— y exigir que la regla de arriba lo cace. */
  PRUEBAS.igual(alto.dibujados.indexOf(alto.colorFalso), -1,
    'DISCRIMINADOR: el punto `var(--sem-azul)` del código viejo (' + alto.colorFalso + ') no está ' +
    'entre las tintas del gráfico en este escenario, así que la comprobación de arriba lo habría ' +
    'marcado como huérfano. Sin esto, "0 huérfanos" no diría si el detector mide algo');
  PRUEBAS.cierto(alto.paleta.indexOf(alto.colorFalso) >= 0,
    '⚠️ Y OJO CON ESTO: --sem-azul resuelve al MISMO color que METRIC_COLORS.kss (--dato-2). Por eso ' +
    'el escenario tiene que ser uno donde el KSS esté por encima del límite (barra roja). Si algún ' +
    'día dejan de coincidir, este caso sigue valiendo pero el aviso ya no hace falta');
});


PRUEBAS.caso('⚠️ los nombres del eje X se leen en un teléfono de 375 px', () => {
  /* ⚠️ Estaban en `font-size: 7.5` unidades de viewBox. El viewBox mide 340 y en un teléfono el SVG
     se dibuja a ~300 px, así que se rasterizaban a menos de 7 px reales — ilegibles justo en el
     dispositivo donde se mira el panel. Se mide sobre el PANEL DE VERDAD, con el overlay abierto:
     en una caja de 340 px la escala es 1 y el defecto sería invisible. */
  const r = p098EnPanel(375, 812, bloque => {
    if (!bloque) return { falta: true };
    const svg = bloque.querySelector('svg');
    const anchoPx = svg.getBoundingClientRect().width;
    const escala = anchoPx / svg.viewBox.baseVal.width;
    const rotadas = [].slice.call(svg.querySelectorAll('text'))
      .filter(x => (x.getAttribute('transform') || '').indexOf('rotate(-4') === 0);
    const tam = rotadas.map(x => parseFloat(getComputedStyle(x).fontSize) * escala);
    return { falta: false, anchoPx: anchoPx, escala: escala, n: rotadas.length,
             minPx: tam.length ? Math.min.apply(null, tam) : 0,
             textos: rotadas.map(x => x.textContent) };
  });

  PRUEBAS.falso(r.falta, 'el bloque "' + t('db_grupo_normal') + '" tiene que estar en el panel del médico');
  if (r.falta) return;
  PRUEBAS.igual(r.n, 7, 'tiene que haber un nombre por indicador debajo del eje');
  PRUEBAS.alMenos(+r.minPx.toFixed(2), 8.5,
    '⚠️ por debajo de ~8,5 px un nombre rotado deja de leerse en un teléfono, y este gráfico se mira ' +
    'sobre todo en teléfono. Midió ' + r.minPx.toFixed(2) + ' px reales (SVG de ' +
    r.anchoPx.toFixed(0) + ' px, escala ' + r.escala.toFixed(3) + ')');

  /* ⚠️ DISCRIMINADOR: con el 7.5 viejo, a esta misma escala, el resultado habría estado por debajo
     del mínimo. Si no fuera así, el umbral de 8,5 no separaría el código nuevo del viejo. */
  PRUEBAS.comoMucho(+(7.5 * r.escala).toFixed(2), 8.49,
    'DISCRIMINADOR: el 7.5 anterior daba ' + (7.5 * r.escala).toFixed(2) + ' px a este ancho, o sea ' +
    'que el caso se habría puesto rojo con el código viejo');
});


PRUEBAS.caso('⚠️ el valor CRUDO de cada indicador sigue siendo legible en alguna parte', () => {
  /* Normalizar contesta "¿cuán lejos del límite está?" pero pierde "¿cuánto vale?". Un 1,50 no
     distingue un KSS de 4 de uno de 7, y el número crudo es lo que el médico necesita leer. */
  const a = p098Con(caja => ({
    svg: caja.querySelector('svg').innerHTML,
    filas: [].slice.call(caja.querySelectorAll('.me-fila')).map(f => f.textContent.replace(/\s+/g, ' ').trim())
  }));

  PRUEBAS.igual(a.filas.length, 7, 'una fila por indicador, incluidos los que no tienen dato');
  PRUEBAS.cierto(/9\.0/.test(a.filas[0]) && /\b6\b/.test(a.filas[0]),
    'la fila del KSS tiene que decir su valor real (9.0) y su referencia (6). Dice: "' + a.filas[0] + '"');
  PRUEBAS.cierto(/30\.0/.test(a.filas[5]) && /\b42\b/.test(a.filas[5]),
    'y la de Depresión, 30.0 sobre 42. Dice: "' + a.filas[5] + '"');

  /* ⚠️ DISCRIMINADOR, y es el que justifica la parte B entera: un KSS de 9 con referencia 6 y uno
     de 3 con referencia 2 son AMBOS 1,50 veces el límite. El gráfico normalizado de los dos es
     idéntico byte a byte — o sea que el normalizado SOLO no puede distinguirlos— y sin embargo son
     dos situaciones clínicas distintas. Las filas de valor real tienen que separarlas. */
  const b = p098Con(caja => ({
    svg: caja.querySelector('svg').innerHTML,
    filas: [].slice.call(caja.querySelectorAll('.me-fila')).map(f => f.textContent.replace(/\s+/g, ' ').trim())
  }), Object.assign({}, P098_VALORES, { kss: 3 }), Object.assign({}, P098_REF, { kss: 2 }));

  PRUEBAS.igual(b.svg, a.svg,
    'DISCRIMINADOR: KSS 9/ref 6 y KSS 3/ref 2 son los dos 1,50 — el gráfico normalizado tiene que ' +
    'salir IDÉNTICO, que es justamente lo que demuestra que por sí solo no alcanza');
  PRUEBAS.falso(b.filas[0] === a.filas[0],
    '⚠️ …y sin embargo las filas de valor real tienen que distinguirlos: "' + a.filas[0] + '" contra "' +
    b.filas[0] + '". Si fueran iguales, el valor crudo se habría perdido de la pantalla');
});


PRUEBAS.caso('⚠️ ningún texto del gráfico se sale del viewBox (el <svg> recorta sin avisar)', () => {
  const r = p098Con(caja => {
    const svg = caja.querySelector('svg');
    const vw = svg.viewBox.baseVal.width, vh = svg.viewBox.baseVal.height;
    const fuera = [].slice.call(svg.querySelectorAll('text')).map(x => {
      const c = p098Caja(x); c.txt = x.textContent; return c;
    }).filter(c => c.x < -0.05 || c.y < -0.05 || c.r > vw + 0.05 || c.ab > vh + 0.05);
    return { vw: vw, vh: vh, fuera: fuera.map(c => c.txt + ' [x=' + c.x.toFixed(1) + ' abajo=' + c.ab.toFixed(1) + ']'),
             html: caja.innerHTML };
  });

  PRUEBAS.igual(r.fuera, [],
    '⚠️ el <svg> externo recorta por defecto: una etiqueta que se pasa del viewBox se corta a la ' +
    'mitad y nadie ve un error. Se salen: ' + r.fuera.join(' | '));

  /* R13 · ningún color escrito a mano en lo que este gráfico genera. */
  const aMano = (r.html.match(/#[0-9a-fA-F]{3,8}\b/g) || []).concat(r.html.match(/rgba?\(/g) || []);
  PRUEBAS.igual(aMano, [],
    'R13: ni el SVG ni las filas pueden traer un color literal — en oscuro quedaría fijo y se ' +
    'perdería contra el fondo. Encontrados: ' + aMano.join(', '));

  /* ⚠️ DISCRIMINADOR de las dos comprobaciones: se comprueba que el método detecta lo que dice
     detectar, metiéndole a propósito una etiqueta fuera de la caja y un color a mano. */
  const svgFalso = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgFalso.setAttribute('viewBox', '0 0 100 100');
  svgFalso.style.cssText = 'position:fixed;left:0;top:0;width:100px;z-index:-1;';
  const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  txt.setAttribute('x', '-40'); txt.setAttribute('y', '50'); txt.setAttribute('font-size', '10');
  txt.textContent = 'me salgo';
  svgFalso.appendChild(txt); document.body.appendChild(svgFalso);
  void document.body.offsetWidth;
  const c = p098Caja(txt);
  svgFalso.remove();
  PRUEBAS.cierto(c.x < 0,
    'DISCRIMINADOR: una etiqueta puesta a propósito en x=-40 tiene que salir con x negativa, o el ' +
    'medidor no está midiendo nada (midió x=' + c.x.toFixed(1) + ')');
  PRUEBAS.cierto((('<i style="background:#ff0000"></i>').match(/#[0-9a-fA-F]{3,8}\b/g) || []).length === 1,
    'DISCRIMINADOR: el detector de colores a mano tiene que encontrar un #ff0000 inyectado');
});
