/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 12 · EL CALENDARIO SE TOCA Y ENTRA        (2026-09-22 · reconciliado el 2026-09-23)

   Cuatro anchos (320 / 375 / 768 / 1366) por dos tamaños de letra (100 % y 135 %), en los DOS
   lugares donde el calendario llega al DOM: el inicio del piloto (`#cmesMio`) y la ficha del
   médico (`#cmesPanel`).

   ⚠️ QUÉ AFIRMABA ESTE ARCHIVO ANTES Y POR QUÉ DEJÓ DE SER CIERTO. Tuvo dos versiones, las dos
   pineando un diseño que ya no existe:
     1 · La primera decía que «el piso de 44 px no puede vivir en la casilla porque es cuadrada», y
         lo comprobaba con `aspect-ratio: 1 / 1`. La proporción fija se sacó: imponía 44 px de ANCHO
         además de los de alto.
     2 · La segunda —la que se reconcilia hoy— afirmaba `out.desbordes === []`, o sea «la grilla, la
         semana y la tira de días entran en su ancho, sin scroll lateral». **Eso ya no describe el
         diseño**, y no por un descuido: siete casillas de 44 px con sus seis separaciones de 3 px
         miden 326 px, y 326 no entra en 320 por geometría pura — ni con margen cero ni con padding
         cero. Las opciones eran dos: bajar la casilla (34 px a 320, 18,8 px en la ficha del médico),
         que rompe el piso de 44 y además el mínimo de WCAG 2.2 · 2.5.8; o dejar que la semana se
         desplace de costado dentro de su propio contenedor. **Se eligió desplazar.**

   ⚠️ EL PISO SON 44 PX, NO 24, Y NO ES WCAG. Este proyecto tiene una regla propia, más exigente:
   todo botón mide 44×44, «con guantes y de noche». WCAG 2.2 · 2.5.8 «Target Size (Minimum)» pide
   24×24 y este archivo medía contra ese 24 — el mínimo legal, no el del proyecto. Hoy la casilla
   tiene `min-width: 44px` (index.html:5093) y `min-height: 44px` (index.html:5098) y las ocho
   combinaciones se miden contra 44 en las DOS dimensiones. Arriba de 720 px la media query sube el
   alto a 64 (index.html:5156); se afirma el piso, no el valor exacto, porque 64 también lo cumple.

   ⚠️ CÓMO QUEDÓ EL DESPLAZAMIENTO, QUE ES LO QUE ESTE ARCHIVO AHORA AFIRMA COMO CONTRATO.
   Un ÚNICO `.cmes-scroll` con `overflow-x: auto` (index.html:5079) envuelve **las dos** rejillas:
   la tira de rótulos `.cmes-dias` y la grilla `.cmes-grid` (index.html:14431-14434). Un intento
   anterior puso `overflow-x` en cada una por separado y los rótulos quedaban arriba de la columna
   equivocada — peor que el desborde que se quería arreglar. Por eso el aserto valioso no es «no
   desplaza» sino **«desplazan juntas»**: mismo desplazador, ninguna con `overflow-x` propio, y cada
   rótulo sobre SU columna antes y después de deslizar.
   Y el desborde se afirma como LEY, no como lista de anchos escrita a mano: el desplazamiento
   aparece **exactamente** cuando las siete pistas que el navegador resolvió de verdad, más sus seis
   separaciones, no entran en el contenedor. Las pistas se leen de `grid-template-columns` ya
   resuelto, así que si mañana alguien achica la casilla el número baja solo, la ley sigue valiendo
   y el aserto de 44×44 se pone rojo igual. Encima se pinean los dos extremos MEDIDOS: a 320 px
   desplaza (en los dos lugares y con las dos letras) y a 1366 px no desplaza en ninguna.

   ⚠️ DÓNDE DESPLAZA Y DÓNDE NO — MEDIDO EL 2026-09-23, no supuesto (la ley de arriba lo vuelve a
   medir en cada corrida; esta tabla es para leerla antes de tocar un padding). Las siete columnas
   necesitan 326 px y esto es lo que les queda:

       inicio del piloto        letra 100 %            letra 135 %
         320 px                 273 · desplaza          258 · desplaza
         375 px                 328 · ENTRA (por 2 px)  313 · desplaza
         768 px                 640 · entra             618 · entra
        1366 px                1145 · entra            1113 · entra

       ficha del médico         letra 100 %            letra 135 %
         320 px                 218 · desplaza          189 · desplaza
         375 px                 273 · desplaza          244 · desplaza
         768 px                 629 · entra             587 · entra
        1366 px                1115 · entra            1034 · entra

   Dos cosas que esa tabla dice y conviene no perder:
     · **«A 375 px entra» vale sólo con la letra al 100 %, y por 2 px** (328 contra 326). Con la
       letra al 135 % desplaza. Cualquier retoque del relleno de `.cmes` o de la vista de inicio
       cruza ese umbral en una dirección o en la otra: no es un error, es el contrato funcionando,
       pero hay que volver a medir antes de escribir en un comentario que «entra».
     · La ficha del médico desplaza SIEMPRE por debajo de 720 px: gasta en sus propios contenedores
       102 px a 320/100 % y 131 a 320/135 %.

   ⚠️ LA PÁGINA NO PUEDE DESPLAZAR DE COSTADO, Y MEDIRLO SERÍA UN CERO SIN DISCRIMINADOR.
   `html` y `body` llevan `overflow-x: hidden` (index.html:648 y 663), así que
   `documentElement.scrollWidth` da siempre el ancho de la ventana: un aserto sobre eso pasaría
   aunque medio calendario quedara afuera. El recorte no evita el problema, lo ESCONDE. Lo que sí se
   puede afirmar, y es lo que de verdad no puede pasar, es que ningún pedazo del calendario termine
   fuera de la ventana en un lugar del que no se lo pueda traer: se mide elemento por elemento y no
   cuenta lo que esté dentro de `.cmes-scroll`, porque a eso se llega deslizando. El instrumento
   tiene su discriminador aparte (se planta un elemento ancho y se confirma que lo caza).

   ⚠️ LA MATRIZ TIENE 42 CASILLAS PERO EL MES NO. `cmesCeldaHtml` emite `.cmes-d` SÓLO para los días
   del mes (los de relleno son `.cmes-rel` vacíos, index.html:14285), y `cmesBloqueHtml` PODA las
   filas sin un solo día del mes (index.html:14389: febrero de 28 que arranca en domingo entraba en
   cuatro filas y dejaba dos vacías abajo). Así que un mes tiene 35 o 42 casillas de matriz, 28 a 31
   tocables y 4 a 6 filas, según el mes. Las guardas de cantidad se DERIVAN de `cmesMatriz(ym)` — un
   número escrito a mano (había un `>= 8 × 28`) queda alto o bajo según el mes y no dice nada.

   ⚠️ MEDIR CAMBIANDO `document.body.style.width` NO SIRVE: no activa las media queries, así que
   `@media (min-width: 720px)` sigue puesta y la casilla mide 44×64 a 320 px, que es falso. Se mide
   con `PRUEBAS.enVentana(ancho, alto, fn)`, que le cambia el tamaño al PROPIO iframe.

   ⚠️ NADA DE CAPTURAS (R11): acá `document.hidden` es true permanente, el rasterizador miente y las
   animaciones no corren. Se mide con `getBoundingClientRect` y `getComputedStyle`, y para forzar
   layout va `void document.body.offsetHeight`, nunca `requestAnimationFrame`.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). La cobertura del piloto NO se escribe a mano en
   `K_CICLO_SRV_PER`: se entra por `misSincronizar()` con el `fetch` estubado, que es quien la
   escribe en producción y quien después llama a `renderInicio()` → `cicloMiRefrescar()` →
   `cmesRepintar('mio')`. Sin cobertura el mes entero sale `fuera`, no hay ninguna excepción y por
   lo tanto NO HAY NINGUNA FICHA QUE MEDIR: la prueba habría dado verde midiendo cero. De ahí las
   cuentas EXACTAS de casillas, filas y fichas, que son el discriminador de medibilidad.
   El stub se restaura en el `.finally()` de la promesa, nunca en un `finally` sincrónico (R18).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · caso 12 · toque y ancho: 320 → 1366 px, letra 100 % y 135 %');

/* Los cuatro del plan. 390×844 (el tamaño del iframe) queda cubierto por 375 y 768. */
const P090TA_VENTANAS = [[320, 800], [375, 667], [768, 1024], [1366, 768]];
/* Los índices de `TEXTO_NIVELES`: 1 = 100 % (el recomendado), 3 = 135 % (el máximo). */
const P090TA_NIVELES = [1, 3];
const P090TA_COMBIS = P090TA_VENTANAS.length * P090TA_NIVELES.length;   // 8
/* El piso del proyecto, en las DOS dimensiones: `min-width: 44px` (index.html:5093) y
   `min-height: 44px` (index.html:5098). No es WCAG 2.2 · 2.5.8, que pide 24: es la regla de casa,
   «con guantes y de noche». A 768 y 1366 la media query sube el alto a 64; se afirma el piso. */
const P090TA_TOQUE_MIN = 44;
/* Medio píxel de tolerancia: el redondeo de subpíxel de una grilla de siete columnas devuelve
   43,996 donde la regla dice 44, y eso no es un defecto de toque. */
const P090TA_HOLGURA = 0.5;
/* Un píxel para comparar cajas contra desplazamientos: `scrollWidth` y `clientWidth` vienen
   redondeados a entero y los rectángulos no. */
const P090TA_PX = 1;

/* 30 h atrás: el ciclo queda con un solo evento de apertura y sin cierre, así que a las
   `CICLO_DETENIDO_HORAS` (24) el motor lo da por `detenido` — uno de los cinco casos que
   `cmesResumen` manda a la lista de «mirada», o sea: una ficha para medir.
   Se devuelve el día que la app va a usar de verdad (`fechaOpDe`, la zona de la OPERACIÓN, no la
   del dispositivo: L1), no uno calculado aparte, porque si difirieran mediríamos otra casilla. */
function p090TaEventoDetenido(horas) {
  const t = Date.now() - (horas || 30) * 3600000;
  return { iso: new Date(t).toISOString(), f: fechaOpDe(new Date(t)) };
}

/* Cuántas casillas TOCABLES y cuántas filas tiene de verdad el mes que se está midiendo. Se deriva
   de `cmesMatriz`, que es la misma fuente que usa el dibujo, y NO de un 42 escrito a mano: con la
   poda de filas vacías el número cambia de mes a mes (35 o 42 de matriz, 4 a 6 filas). */
function p090TaEsperado(ym) {
  const m = cmesMatriz(ym);
  let dias = 0, filas = 0;
  for (let i = 0; i < m.length; i += 7) {
    let hay = false;
    for (let j = i; j < i + 7 && j < m.length; j++) if (m[j].delMes) { hay = true; dias++; }
    if (hay) filas++;
  }
  return { dias: dias, filas: filas };
}

/* ── Los instrumentos del desplazamiento ─────────────────────────────────────────────────────── */

/* El desplazador de un elemento: el ancestro MÁS CERCANO que se puede deslizar de costado
   (`overflow-x: auto|scroll`). Se busca hasta `tope` inclusive (el bloque `.cmes`). Lo de afuera no
   cuenta y la diferencia importa: `.dash-scroll` tiene `overflow-x: hidden` (index.html:1275), que
   no desplaza sino que RECORTA — lo que cae ahí no se alcanza de ninguna manera. */
function p090TaDesplazador(el, tope) {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const ox = getComputedStyle(p).overflowX;
    if (ox === 'auto' || ox === 'scroll') return p;
    if (tope && p === tope) return null;
    p = p.parentElement;
  }
  return null;
}

/* Lo que una rejilla de siete columnas NECESITA de ancho: las siete pistas que el navegador resolvió
   de verdad más sus seis separaciones. No es un 326 escrito a mano — se lee de
   `grid-template-columns` YA RESUELTO, así que si alguien cambia el piso de la casilla o el `gap`,
   el número lo sigue solo. Devuelve null si no se pudieron leer las siete pistas: eso es el
   instrumento roto, no un resultado, y tiene su propio aserto. */
function p090TaNecesario(el) {
  const cs = getComputedStyle(el);
  const pistas = String(cs.gridTemplateColumns).trim().split(/\s+/).map(parseFloat);
  if (pistas.length !== 7) return null;
  for (let i = 0; i < 7; i++) if (!isFinite(pistas[i])) return null;
  const gap = parseFloat(cs.columnGap);
  if (!isFinite(gap)) return null;
  let suma = 0;
  for (let i = 0; i < 7; i++) suma += pistas[i];
  return suma + gap * 6;
}

/* Lo que de verdad no puede pasar: que un pedazo del calendario quede FUERA de la ventana en un
   lugar del que no se lo pueda traer. No se mide `documentElement.scrollWidth` porque `html` y
   `body` recortan (index.html:648 y 663) y ese número siempre da el ancho de la ventana.
   No cuenta como falla lo que esté dentro de un desplazador cuya propia caja SÍ entra en la
   ventana: a eso se llega deslizando, y es justamente el diseño elegido. */
function p090TaEscapes(cont) {
  const vw = document.documentElement.clientWidth;
  const malos = [], vistos = {};
  const nodos = [cont].concat([].slice.call(cont.querySelectorAll('*')));
  nodos.forEach(function (e) {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.right <= vw + P090TA_PX) return;
    const sc = p090TaDesplazador(e, cont);
    if (sc && sc.getBoundingClientRect().right <= vw + P090TA_PX) return;
    const k = (String(e.className).split(' ')[0] || e.tagName) + ' llega a ' + r.right.toFixed(0) +
      ' y la ventana mide ' + vw;
    if (!vistos[k]) { vistos[k] = 1; malos.push(k); }
  });
  return malos;
}

/* Cada rótulo de día arriba de SU columna. Es el efecto que el desplazador único tiene que
   garantizar: con `overflow-x` en cada rejilla por separado, deslizar una movía los rótulos y
   dejaba la grilla quieta. Se comparan los CENTROS, que es lo que se ve. */
function p090TaDesalineadas(cont) {
  const rot = cont.querySelectorAll('.cmes-dias span');
  const fila = cont.querySelector('.cmes-fila');
  if (rot.length !== 7 || !fila) return ['no se pudo comparar: ' + rot.length + ' rótulos y ' + (fila ? 1 : 0) + ' filas'];
  const malas = [];
  for (let i = 0; i < 7 && i < fila.children.length; i++) {
    const a = rot[i].getBoundingClientRect(), b = fila.children[i].getBoundingClientRect();
    if (Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)) > P090TA_PX) {
      malas.push('rótulo ' + i + ' centrado en ' + (a.left + a.width / 2).toFixed(0) +
        ' y su columna en ' + (b.left + b.width / 2).toFixed(0));
    }
  }
  return malas;
}

/* ── La medición de un bloque ya pintado ─────────────────────────────────────────────────────── */

/* `cont` es `#cmesMio` o la caja que imita la ficha del médico; `etq` describe la combinación para
   que la falla se lea sola. `esp` es lo que `p090TaEsperado` dijo del mes; `fichasEsp`, cuántas
   excepciones se sembraron. */
function p090TaMedir(cont, etq, anchoVentana, out, esp, fichasEsp) {
  const grid = cont.querySelector('[role="grid"]');
  if (!grid) { out.sinGrilla.push(etq); return; }

  /* GUARDA DE MEDIBILIDAD, y estructural a la vez: la grilla tiene que recibir EXACTAMENTE el
     ancho útil de `.cmes`. Si la cadena de contenedores no se lo diera, todo lo de abajo saldría
     diminuto y pasaría sin decir nada — que es como A4 dio «0 defectos» sin medir.
     Antes acá había un mínimo absoluto de 180 px, y era un número inventado: a 320 px con letra al
     135 % la grilla mide ~165 px de verdad, así que ese piso descartaba en silencio una de las
     ocho combinaciones y la prueba medía siete creyendo que medía ocho. */
  const cs = getComputedStyle(cont);
  const util = cont.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
  const anchoGrilla = grid.getBoundingClientRect().width;
  if (!(util > 0) || Math.abs(anchoGrilla - util) > P090TA_PX) {
    out.anchoRaro.push(etq + ': la grilla mide ' + anchoGrilla.toFixed(1) +
      ' y el ancho útil de su contenedor es ' + util.toFixed(1) + ' · la medición no valdría');
  }

  /* Las casillas. Un solo piso, 44, en las dos dimensiones: `min-width` y `min-height` de `.cmes-d`
     (index.html:5093 y 5098). El ancho tiene regla propia DESDE que se eligió desplazar en vez de
     achicar; antes salía de repartir el contenedor entre siete columnas y era lo que quedaba corto. */
  let minW = Infinity, maxW = 0, minH = Infinity, n = 0;
  cont.querySelectorAll('.cmes-d').forEach(function (d) {
    const r = d.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;   // una casilla sin layout no es una medida
    n++; out.celdas++;
    if (r.width < minW) minW = r.width;
    if (r.width > maxW) maxW = r.width;
    if (r.height < minH) minH = r.height;
    const dim = etq + ' · ' + d.getAttribute('data-f') + ': ' + r.width.toFixed(1) + '×' + r.height.toFixed(1);
    if (r.height + P090TA_HOLGURA < P090TA_TOQUE_MIN) out.bajas.push(dim);
    if (r.width + P090TA_HOLGURA < P090TA_TOQUE_MIN) out.angostas.push(dim);
  });
  if (n) out.tamanos.push(etq + ': ancho ' + minW.toFixed(1) + '–' + maxW.toFixed(1) +
    ' · alto ' + minH.toFixed(1) + ' px');
  /* Cuenta EXACTA, derivada del mes: `.cmes-d` sale sólo para los días del mes. */
  if (n !== esp.dias) out.cuenta.push(etq + ': ' + n + ' casillas medidas, el mes tiene ' + esp.dias + ' días');
  const filas = cont.querySelectorAll('.cmes-fila').length;
  if (filas !== esp.filas) out.cuenta.push(etq + ': ' + filas + ' filas pintadas, el mes ocupa ' + esp.filas);

  /* Las fichas de excepción: 44 px de alto SIEMPRE, y ancho del contenedor mientras la columna
     no se parta en fila (`@media (min-width: 720px)`, index.html:5153-5155). */
  const caja = cont.querySelector('.cmes-fichas');
  const fichas = cont.querySelectorAll('.cmes-ficha');
  if (fichas.length !== fichasEsp) {
    out.sinFichas.push(etq + ': ' + fichas.length + ' fichas, se sembraron ' + fichasEsp + ' excepciones');
  }
  if (fichas.length && !caja) { out.sinFichas.push(etq + ' (fichas sin contenedor .cmes-fichas)'); }
  else if (caja) {
    const rc = caja.getBoundingClientRect();
    fichas.forEach(function (f) {
      const r = f.getBoundingClientRect();
      out.fichas++;
      if (r.height + P090TA_HOLGURA < 44) out.finas.push(etq + ': ficha de ' + r.height.toFixed(1) + ' px de alto');
      /* La ficha NO está adentro de `.cmes-scroll` y no tiene de dónde desplazarse: si se pasa de su
         contenedor, se pierde. Esto no es el desborde de la grilla y nunca lo fue. */
      if (r.width > rc.width + P090TA_PX) out.fichaAncha.push(etq + ': ficha de ' + r.width.toFixed(1) +
        ' en un contenedor de ' + rc.width.toFixed(1));
      if (anchoVentana < 720 && Math.abs(r.width - rc.width) > P090TA_PX) {
        out.anchoParcial.push(etq + ': ficha de ' + r.width.toFixed(1) +
          ' contra un contenedor de ' + rc.width.toFixed(1));
      }
    });
  }

  /* Las flechas del mes: 44×44 declarado, y hay que comprobar el efecto, no la regla. */
  const flechas = cont.querySelectorAll('.cmes-flecha');
  if (flechas.length !== 2) out.sinFlechas.push(etq + ': ' + flechas.length + ' flechas');
  flechas.forEach(function (b) {
    const r = b.getBoundingClientRect();
    out.flechasMedidas++;
    if (r.width + P090TA_HOLGURA < 44 || r.height + P090TA_HOLGURA < 44) {
      out.flechasFinas.push(etq + ': ' + r.width.toFixed(1) + '×' + r.height.toFixed(1));
    }
  });

  /* ── El desplazamiento, que es CONTRATO y no defecto ───────────────────────────────────────
     Acá estaba el aserto que se cayó: «la grilla, cada semana y la tira de días entran en su
     ancho». Siete casillas de 44 con sus separaciones miden 326 px y no entran en 320 de ninguna
     manera; entre romper el piso de 44 y desplazar, se eligió desplazar. Lo que se afirma ahora es
     dónde desplaza y dónde no, y que las dos rejillas lo hagan JUNTAS. */
  const dias = cont.querySelector('.cmes-dias');
  const sc = p090TaDesplazador(grid, cont);
  const scDias = dias ? p090TaDesplazador(dias, cont) : null;
  if (!dias) { out.juntas.push(etq + ': no se emitió la tira de días'); return; }
  if (!sc || !scDias || sc !== scDias) {
    out.juntas.push(etq + ': la grilla desplaza en «' + (sc ? (sc.className || sc.tagName) : 'ninguno') +
      '» y la tira de días en «' + (scDias ? (scDias.className || scDias.tagName) : 'ninguno') +
      '» · tienen que compartir contenedor o los rótulos quedan arriba de la columna equivocada');
    return;
  }
  if (!/(^|\s)cmes-scroll(\s|$)/.test(String(sc.className))) {
    out.juntas.push(etq + ': el desplazador es «' + sc.className + '» y tiene que ser `.cmes-scroll` (index.html:5079)');
  }
  /* Ninguna de las dos rejillas puede desplazar por su cuenta: es exactamente el intento anterior. */
  [].slice.call(cont.querySelectorAll('.cmes-dias, .cmes-grid, .cmes-fila')).forEach(function (e) {
    const ox = getComputedStyle(e).overflowX;
    if (ox !== 'visible') {
      out.juntas.push(etq + ': ' + (String(e.className).split(' ')[0]) + ' tiene desplazamiento propio (overflow-x: ' + ox + ')');
    }
  });

  /* La LEY: hay desplazamiento exactamente cuando las siete pistas resueltas más sus seis
     separaciones no entran en el contenedor. Nada de anchos escritos a mano. */
  const necesario = Math.max(p090TaNecesario(grid.querySelector('.cmes-fila') || grid) || 0,
                             p090TaNecesario(dias) || 0);
  if (!necesario) {
    out.pistas.push(etq + ': no se pudieron leer las siete pistas de la rejilla · sin eso no hay ley que comprobar');
  } else {
    const hay = sc.clientWidth;
    const desplaza = sc.scrollWidth > hay + P090TA_PX;
    const deberia = necesario > hay + P090TA_PX;
    out.despl.push({ w: anchoVentana, etq: etq, si: desplaza, necesario: necesario, hay: hay });
    out.mapa.push(etq + ': ' + (desplaza ? 'desplaza' : 'entra') + ' · necesita ' +
      necesario.toFixed(0) + ' y tiene ' + hay);
    if (desplaza !== deberia) {
      out.desplLey.push(etq + ': ' + (desplaza ? 'desplaza' : 'NO desplaza') + ' pero las siete columnas necesitan ' +
        necesario.toFixed(1) + ' y el contenedor da ' + hay + ' (scrollWidth ' + sc.scrollWidth + ')');
    }
  }

  /* Y el efecto que el desplazador único tiene que garantizar: cada rótulo arriba de SU columna,
     antes y después de deslizar. Deslizar de verdad es lo único que distingue «mismo contenedor»
     de «dos contenedores que hoy están en la misma posición». */
  p090TaDesalineadas(cont).forEach(function (m) { out.desalineadas.push(etq + ' (quieto): ' + m); });
  const antes = sc.scrollLeft, comp = sc.style.scrollBehavior;
  try {
    sc.style.scrollBehavior = 'auto';
    sc.scrollLeft = sc.scrollWidth;          // se clampa solo al máximo
    void document.body.offsetHeight;
    if (sc.scrollLeft > 0) {
      out.deslizadas++;
      p090TaDesalineadas(cont).forEach(function (m) { out.desalineadas.push(etq + ' (deslizado ' + sc.scrollLeft + ' px): ' + m); });
    }
  } finally {
    sc.scrollLeft = antes;
    sc.style.scrollBehavior = comp;
    void document.body.offsetHeight;
  }

  /* Y que nada del calendario termine fuera de la ventana sin desplazador que lo alcance. */
  p090TaEscapes(cont).forEach(function (m) { out.fuera.push(etq + ': ' + m); });
}

function p090TaVacio() {
  return { celdas: 0, fichas: 0, flechasMedidas: 0, deslizadas: 0,
           tamanos: [], bajas: [], angostas: [], cuenta: [], finas: [], anchoParcial: [],
           flechasFinas: [], fichaAncha: [], sinGrilla: [], sinFichas: [], sinFlechas: [],
           anchoRaro: [], despl: [], mapa: [], desplLey: [], juntas: [], desalineadas: [],
           fuera: [], pistas: [] };
}

/* Los dos extremos MEDIDOS, que convierten el desborde en contrato: a 320 px desplaza siempre y a
   1366 px no desplaza nunca. Lo que pasa en el medio lo gobierna la ley de `out.desplLey` — no se
   pinea acá porque depende de cuánto le deje la cadena de contenedores, y eso sí hay que medirlo. */
function p090TaPinesDeExtremo(out, donde) {
  const en = function (w) { return out.despl.filter(function (d) { return d.w === w; }); };
  const angostas = en(320), anchas = en(1366);
  PRUEBAS.igual(angostas.length, P090TA_NIVELES.length,
    'DISCRIMINADOR · las ' + P090TA_NIVELES.length + ' combinaciones de 320 px de ' + donde + ' se midieron');
  PRUEBAS.igual(anchas.length, P090TA_NIVELES.length,
    'DISCRIMINADOR · y las ' + P090TA_NIVELES.length + ' de 1366 px');
  PRUEBAS.igual(angostas.filter(function (d) { return !d.si; }).map(function (d) { return d.etq; }), [],
    'a 320 px la semana SÍ se desplaza, y es lo esperado: siete casillas de 44 con sus separaciones ' +
    'miden 326 y no entran · antes que achicar el objetivo táctil se desliza · MEDIDO: ' +
    angostas.map(function (d) { return d.etq + ' necesita ' + d.necesario.toFixed(0) + ' y tiene ' + d.hay; }).join(' · '));
  PRUEBAS.igual(anchas.filter(function (d) { return d.si; }).map(function (d) { return d.etq; }), [],
    'y a 1366 px no se desplaza nada: ahí sobra lugar y un desplazamiento sería un defecto · MEDIDO: ' +
    anchas.map(function (d) { return d.etq + ' necesita ' + d.necesario.toFixed(0) + ' y tiene ' + d.hay; }).join(' · '));
}

/* Los asertos del desplazamiento, iguales en los dos lugares. */
function p090TaAsertosDeDesplazamiento(out, donde) {
  PRUEBAS.igual(out.pistas, [],
    'DISCRIMINADOR del instrumento · las siete pistas de la rejilla se leyeron en las ' + P090TA_COMBIS +
    ' combinaciones · sin ellas la ley de abajo no compara contra nada');
  PRUEBAS.igual(out.despl.length, P090TA_COMBIS,
    'DISCRIMINADOR · el desplazamiento se midió en las ' + P090TA_COMBIS + ' combinaciones');
  PRUEBAS.igual(out.juntas, [],
    '`.cmes-dias` y `.cmes-grid` desplazan JUNTAS: mismo `.cmes-scroll` (index.html:5079) y ninguna ' +
    'con `overflow-x` propio · con una por separado los rótulos quedan arriba de la columna equivocada');
  PRUEBAS.igual(out.desalineadas, [],
    'y el efecto, no la regla: cada rótulo arriba de SU columna, quieto y deslizado hasta el final');
  PRUEBAS.alMenos(out.deslizadas, 1,
    'DISCRIMINADOR · al menos una de las ' + P090TA_COMBIS + ' combinaciones de ' + donde + ' se deslizó de verdad ' +
    '(scrollLeft > 0) · si ninguna se moviera, la comprobación de alineación no distinguiría un ' +
    'contenedor compartido de dos contenedores quietos en la misma posición');
  PRUEBAS.igual(out.desplLey, [],
    'LEY · hay desplazamiento exactamente cuando las siete pistas resueltas más sus seis separaciones ' +
    'no entran en `.cmes-scroll` · MEDIDO: ' + out.mapa.join(' · '));
  p090TaPinesDeExtremo(out, donde);
  PRUEBAS.igual(out.fuera, [],
    'y nada del calendario queda fuera de la ventana en un lugar del que no se lo pueda traer · ' +
    '`html` y `body` recortan (index.html:648 y 663), así que lo que se pase no desplaza la página: ' +
    'se esconde · lo que está dentro de `.cmes-scroll` no cuenta, a eso se llega deslizando');
}

/* El piloto, por el camino real. Devuelve una promesa con el día sembrado y la foto del
   localStorage para devolverlo como estaba. */
function p090TaSembrarMio() {
  const prevLS = Object.assign({}, localStorage);
  CTX.resetear({ nombre: 'Persona De Prueba', cargo: 'Piloto', esPiloto: true });
  const ev = p090TaEventoDetenido();
  const oFetch = window.fetch;
  window.fetch = function () {
    return Promise.resolve({
      json: function () {
        return Promise.resolve({
          ok: true, rol: 'empleado', registros: [], pvt: [], metricas: [], referencia: null,
          operacional: [{ evento: cicloEventoInicial(), iso: ev.iso, fecha: ev.f, test: '', resultado: null }],
          /* 400 días para que la flecha «‹» quede habilitada y se pueda retroceder al mes del día
             sembrado cuando 30 h atrás cae en el mes anterior (el 1 y el 2 de cada mes). */
          operacionalPeriodo: { dias: 400, desde: null, hasta: null }
        });
      }
    });
  };
  _misSincronizando = false;   // otro caso pudo dejar una sincronización en vuelo
  return misSincronizar()
    .then(function (ok) { return { ok: ok, f: ev.f, prevLS: prevLS }; })
    .finally(function () { window.fetch = oFetch; });   // R18 · en el finally de LA PROMESA
}

/* Deja la app como estaba. `CMES` vive en memoria y NO lo limpia `CTX.resetear`: si esta prueba se
   va al mes anterior, el caso siguiente que pinte el calendario del piloto lo encuentra ahí. */
function p090TaLimpiar(prevLS) {
  try { CMES = null; } catch (e) {}
  try { localStorage.clear(); Object.keys(prevLS).forEach(function (k) { localStorage.setItem(k, prevLS[k]); }); } catch (e) {}
  try { aplicarTamanoTexto(); } catch (e) {}
  try { renderSections(); } catch (e) {}
}

/* ── El piloto ───────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('P090 · piloto: en los cuatro anchos y con letra 100 % y 135 %, la casilla llega a 44×44, la ficha y la flecha a 44, y la semana desplaza dentro de `.cmes-scroll` cuando no entra', function () {
  return p090TaSembrarMio().then(function (s) {
    try {
      PRUEBAS.cierto(s.ok, 'guarda de medibilidad: la sincronización estubada entró · sin ella no hay ' +
        'cobertura, el mes entero sale «fuera» y no habría ninguna ficha que medir');
      const cont = document.getElementById('cmesMio');
      PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM (renderSections lo cuelga al final de Data Operacional)');
      if (!cont) return;

      /* 30 h atrás puede caer en el mes anterior (el 1 y el 2 del mes). Se retrocede por el camino
         real: la flecha «‹», que es lo que toca la persona. */
      if (s.f.slice(0, 7) !== cmesMes('mio')) {
        const ant = cont.querySelectorAll('.cmes-flecha')[0];
        PRUEBAS.falso(ant.disabled, 'guarda: con 400 días de cobertura la flecha ‹ está habilitada');
        ant.click();
      }
      PRUEBAS.igual(cmesMes('mio'), s.f.slice(0, 7),
        'guarda: el mes a la vista es el del día sembrado · sin esto se mediría un mes sin excepciones');

      const esp = p090TaEsperado(cmesMes('mio'));
      const out = p090TaVacio();
      P090TA_NIVELES.forEach(function (nivel) {
        fijarTamanoTexto(nivel);                       // el camino real del deslizador de Ajustes
        P090TA_VENTANAS.forEach(function (wh) {
          PRUEBAS.enVentana(wh[0], wh[1], function (w) {
            /* `enVentana` es SINCRÓNICA (devuelve el iframe a su tamaño en su propio `finally`):
               todo lo que se mida acá adentro tiene que ser sincrónico también. */
            PRUEBAS.sinAnimaciones(function () {
              p090TaMedir(document.getElementById('cmesMio'),
                'mio ' + w + 'px/' + TEXTO_NIVELES[nivel].v + '%', w, out, esp, 1);
            });
          });
        });
      });

      /* DISCRIMINADOR de medibilidad, y EXACTO. Las ocho combinaciones por los días que tiene el
         mes de verdad: `.cmes-d` sale sólo para los días del mes (index.html:14285), así que un
         número escrito a mano queda alto o bajo según el mes. Un cero sin discriminador no es un
         resultado: sin esta cuenta, un calendario que no se pintara daría verde. */
      PRUEBAS.igual(out.celdas, P090TA_COMBIS * esp.dias,
        'DISCRIMINADOR · ' + P090TA_COMBIS + ' combinaciones × ' + esp.dias + ' días de ' + cmesMes('mio') +
        ' (' + esp.filas + ' filas: las que no tienen ni un día del mes se podan)');
      PRUEBAS.igual(out.cuenta, [], 'y en cada combinación salieron todas las casillas y todas las filas del mes');
      PRUEBAS.igual(out.fichas, P090TA_COMBIS,
        'DISCRIMINADOR · una ficha por combinación · el día sembrado queda «detenido» a las ' +
        CICLO_DETENIDO_HORAS + ' h y eso lo manda a la lista de mirada');
      PRUEBAS.igual(out.flechasMedidas, P090TA_COMBIS * 2, 'DISCRIMINADOR · las dos flechas de cada combinación');
      PRUEBAS.igual(out.sinGrilla, [], 'la grilla existe en todas las combinaciones');
      PRUEBAS.igual(out.anchoRaro, [], 'y recibe el ancho útil entero de su contenedor en todas');
      PRUEBAS.igual(out.sinFichas, [], 'y la ficha de la excepción también');
      PRUEBAS.igual(out.sinFlechas, [], 'y las dos flechas de mes');

      /* ⚠️ 2026-09-23 · ACÁ ESTABA LA AFIRMACIÓN VIEJA. Este archivo decía que la casilla «no puede»
         llegar a 44 px porque es cuadrada, y comprobaba `aspect-ratio: 1/1`. La proporción fija se
         sacó porque imponía 44 px de ANCHO a costa de la semana entera; después se decidió al revés:
         44 de ancho SE MANTIENE (`min-width`) y lo que cede es el ancho visible, deslizando. */
      PRUEBAS.igual(out.bajas, [],
        'cada casilla llega a ' + P090TA_TOQUE_MIN + ' px de ALTO en todo ancho y con toda letra · ' +
        'es el piso de `.cmes-d` (index.html:5098), y arriba de 720 px sube a 64');
      PRUEBAS.igual(out.angostas, [],
        'y a ' + P090TA_TOQUE_MIN + ' px de ANCHO · es la regla de casa, más exigente que los 24 de ' +
        'WCAG 2.2 · 2.5.8: todo botón mide 44×44, «con guantes y de noche» (`min-width`, index.html:5093) · ' +
        'MEDIDO: ' + out.tamanos.join(' · '));
      PRUEBAS.igual(out.finas, [],
        'cada ficha de excepción llega a 44 px de alto · es lo que se toca para abrir el día y va ARRIBA de la grilla (R6)');
      PRUEBAS.igual(out.anchoParcial, [],
        'por debajo de 720 px la ficha ocupa el ancho entero de su contenedor (arriba de 720 va en fila, a propósito)');
      PRUEBAS.igual(out.fichaAncha, [],
        'y ninguna ficha se pasa de su contenedor: la ficha NO está dentro de `.cmes-scroll` y no tiene de dónde traerse');
      PRUEBAS.igual(out.flechasFinas, [],
        'las flechas de mes miden 44×44: cambiar de mes es el otro toque del bloque');

      p090TaAsertosDeDesplazamiento(out, 'el inicio del piloto');
    } finally {
      p090TaLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('P090 · el piso de 44 px vive AHORA en la casilla (alto Y ancho), en la ficha y en la flecha, y la casilla ya no es cuadrada', function () {
  /* DISCRIMINADOR del plan, en la versión que se puede correr. El plan proponía «bajar min-height a
     30 px y confirmar rojo»; acá no se puede editar el CSS en caliente sin ensuciar la hoja para
     los casos que siguen, así que se mide el estilo YA RESUELTO por el navegador —que es el efecto
     de la regla, no su texto— y se le ponen al lado dos controles que tienen que dar OTRA cosa.
     Si algún día los controles dieran lo mismo, esta prueba dejó de medir (es la lección de A2 y de Y6). */
  return p090TaSembrarMio().then(function (s) {
    try {
      const cont = document.getElementById('cmesMio');
      if (!cont) { PRUEBAS.cierto(false, 'guarda: no se pintó el calendario del piloto'); return; }
      if (s.f.slice(0, 7) !== cmesMes('mio')) cont.querySelectorAll('.cmes-flecha')[0].click();

      const ficha = document.getElementById('cmesMio').querySelector('.cmes-ficha');
      const flecha = document.getElementById('cmesMio').querySelector('.cmes-flecha');
      const celda = document.getElementById('cmesMio').querySelector('.cmes-d');
      const chip = document.getElementById('cmesMio').querySelector('.cmes-ley-c');
      PRUEBAS.cierto(!!ficha && !!flecha && !!celda && !!chip, 'guarda: están los cuatro elementos que se comparan');
      if (!ficha || !flecha || !celda || !chip) return;

      /* `min-height` computado devuelve el valor especificado y no lo toca `box-sizing`; `height`
         sí (Chrome devuelve la caja de contenido, o sea 42 px con un borde de 1), así que la
         flecha se comprueba por geometría y no por estilo calculado. */
      PRUEBAS.igual(getComputedStyle(ficha).minHeight, '44px',
        'el piso de la ficha viene de la regla · bajarla a 30 px pone en rojo esta comprobación Y la geométrica');
      PRUEBAS.alMenos(flecha.getBoundingClientRect().height, 44, 'y la flecha mide 44 px de alto');
      PRUEBAS.alMenos(flecha.getBoundingClientRect().width, 44, 'y 44 de ancho');

      /* ⚠️ 2026-09-23 · ESTE ASERTO ESTABA AL REVÉS. Decía «CONTROL · la casilla NO tiene ese piso,
         y no puede tenerlo: es cuadrada». Ya lo tiene, y la casilla es justamente lo que se toca
         para abrir un día: el piso tiene que estar ahí. */
      PRUEBAS.igual(getComputedStyle(celda).minHeight, '44px',
        'la casilla TAMBIÉN tiene el piso de 44 px de alto · antes no lo tenía y este archivo ' +
        'afirmaba que no podía tenerlo (index.html:5098)');
      /* Y el de ANCHO, que es la decisión que cerró el tema: siete columnas de 44 miden 326 px y a
         320 no entran, así que la semana se desliza en vez de achicar la casilla. Sacar este
         `min-width` haría entrar la semana a 320 px y rompería el piso de 44 sin que nada se moviera
         de lugar: sería el arreglo que parece bueno y no lo es. */
      PRUEBAS.igual(getComputedStyle(celda).minWidth, '44px',
        'y el piso de 44 px de ANCHO (index.html:5093) · es lo que obliga a `.cmes-scroll` a existir: ' +
        'siete columnas de 44 con sus seis separaciones de 3 px miden 326 px y en 320 no entran');
      PRUEBAS.alMenos(celda.getBoundingClientRect().height, 44 - P090TA_HOLGURA,
        'y el efecto, no la regla: la casilla mide ' + celda.getBoundingClientRect().height.toFixed(1) +
        ' px de alto a ' + Math.round(innerWidth) + ' px de ventana');
      PRUEBAS.alMenos(celda.getBoundingClientRect().width, 44 - P090TA_HOLGURA,
        'y ' + celda.getBoundingClientRect().width.toFixed(1) + ' px de ancho');

      /* CONTROL 1 · algo del MISMO bloque que NO llega a 44 y tampoco es cero. Si un día todo lo que
         se mide diera 44, o todo diera 0, las comprobaciones de arriba dejaron de distinguir y
         este control lo dice. El cuadradito de la leyenda mide 16×16 por regla (index.html:5151). */
      const rc = chip.getBoundingClientRect();
      PRUEBAS.cierto(rc.height > 8 && rc.height < 30,
        'CONTROL · el cuadradito de la leyenda mide ' + rc.height.toFixed(1) + ' px (16 por regla): ni 0 ni 44 · ' +
        'si diera 44 o 0, las medidas de arriba dejaron de medir');

      /* La proporción fija, que era la razón de todo lo que la primera versión de este archivo
         afirmaba, ya no está. */
      const ar = getComputedStyle(celda).aspectRatio;
      PRUEBAS.falso(/^\s*1\s*\/\s*1\s*$/.test(ar),
        'la casilla YA NO es cuadrada (aspect-ratio ' + ar + ') · con `1 / 1` el piso de 44 px de alto ' +
        'le imponía 44 de ancho a la caja entera y el alto no podía crecer con la letra');
      /* CONTROL 2 · que la lectura de `aspect-ratio` distinga de verdad. Un `getComputedStyle().aspectRatio`
         que devolviera cadena vacía haría pasar el aserto de arriba sin haber mirado nada. */
      const sonda = document.createElement('div');
      sonda.style.cssText = 'position:absolute;left:-9999px;width:10px;aspect-ratio:1/1';
      document.body.appendChild(sonda);
      try {
        PRUEBAS.cierto(/^\s*1\s*\/\s*1\s*$/.test(getComputedStyle(sonda).aspectRatio),
          'CONTROL · la misma lectura sobre una sonda con `aspect-ratio:1/1` SÍ da «1 / 1» (dio «' +
          getComputedStyle(sonda).aspectRatio + '»): la comprobación de arriba distingue');
      } finally { sonda.remove(); }
    } finally {
      p090TaLimpiar(s.prevLS);
    }
  });
});

/* ── Los instrumentos del desplazamiento, rotos a propósito ──────────────────────────────────── */

PRUEBAS.caso('P090 · DISCRIMINADORES · el detector de «desplazan juntas» y el de «se fue de la ventana» se ponen en rojo cuando se los rompe a propósito', function () {
  /* Los dos asertos que reemplazaron al viejo `out.desbordes` son asertos de AUSENCIA: una lista
     vacía. Un cero sin discriminador no es un resultado (A4), así que acá se rompe cada cosa a mano
     —una rejilla con `overflow-x` propio, un elemento ancho fuera del desplazador— y se confirma que
     el instrumento la caza. Todo se deshace en el `finally`. */
  return p090TaSembrarMio().then(function (s) {
    try {
      const cont = document.getElementById('cmesMio');
      if (!cont) { PRUEBAS.cierto(false, 'guarda: no se pintó el calendario del piloto'); return; }
      const dias = cont.querySelector('.cmes-dias');
      const grid = cont.querySelector('.cmes-grid');
      const sc = grid ? p090TaDesplazador(grid, cont) : null;
      PRUEBAS.cierto(!!dias && !!grid && !!sc, 'guarda: están la tira de días, la grilla y su desplazador');
      if (!dias || !grid || !sc) return;

      /* Que el desplazador sea `.cmes-scroll` y que sea EL MISMO para las dos. */
      /* Por clase-token y no por igualdad de cadena: sumarle una clase al `<div>` no tendría que
         poner en rojo un aserto que habla del desplazamiento. El valor real va en el mensaje. */
      PRUEBAS.cierto(/(^|\s)cmes-scroll(\s|$)/.test(String(sc.className)),
        'el desplazador de la grilla es `.cmes-scroll` (index.html:5079 · el `<div>` de index.html:14431) · es «' +
        sc.className + '»');
      PRUEBAS.cierto(p090TaDesplazador(dias, cont) === sc,
        'y es el MISMO que el de la tira de días: por eso los rótulos no se despegan de sus columnas');
      PRUEBAS.igual(getComputedStyle(dias).overflowX, 'visible', 'la tira de días no desplaza por su cuenta');
      PRUEBAS.igual(getComputedStyle(grid).overflowX, 'visible', 'ni la grilla');

      /* Por qué no se mide `documentElement.scrollWidth`: el recorte del root lo vuelve un cero. */
      PRUEBAS.igual(getComputedStyle(document.documentElement).overflowX, 'hidden',
        'POR QUÉ no se mide `documentElement.scrollWidth`: `html` recorta de costado (index.html:648), ' +
        'así que siempre da el ancho de la ventana y lo que se pase se ESCONDE en vez de desplazar la ' +
        'página · si algún día deja de recortar, hay que volver a mirar cómo se mide esto');

      /* ROTURA 1 · una rejilla con desplazamiento propio: el intento anterior, el de los rótulos
         arriba de la columna equivocada. */
      /* La cuenta de fichas se LEE del bloque, no se supone: acá no se navegó al mes sembrado y el
         mes a la vista puede no tener ninguna excepción. Lo que se mira es `out.juntas`, pero pasarle
         un número inventado dejaría ruido en el resto del acumulador. */
      const fichasHoy = cont.querySelectorAll('.cmes-ficha').length;
      const out1 = p090TaVacio();
      const previo = dias.style.overflowX;
      try {
        dias.style.overflowX = 'auto';
        void document.body.offsetHeight;
        p090TaMedir(cont, 'rotura1', innerWidth, out1, p090TaEsperado(cmesMes('mio')), fichasHoy);
        PRUEBAS.alMenos(out1.juntas.length, 1,
          'DISCRIMINADOR · con `overflow-x: auto` puesto a mano en la tira de días el detector la caza (dijo: ' +
          (out1.juntas[0] || 'nada') + ')');
      } finally {
        dias.style.overflowX = previo;
        void document.body.offsetHeight;
      }
      const out2 = p090TaVacio();
      p090TaMedir(cont, 'control1', innerWidth, out2, p090TaEsperado(cmesMes('mio')), fichasHoy);
      PRUEBAS.igual(out2.juntas, [], 'CONTROL · deshecha la rotura, el mismo detector vuelve a dar vacío');

      /* ROTURA 2 · algo ancho FUERA del desplazador. Va dentro de `.cmes-res`, que es el bloque de
         la frase y las fichas: ahí no hay de dónde traerlo, y es exactamente el caso que el aserto
         `out.fuera` tiene que cazar. */
      PRUEBAS.igual(p090TaEscapes(cont), [], 'quieto, no se va nada del calendario fuera de la ventana');
      const res = cont.querySelector('.cmes-res');
      PRUEBAS.cierto(!!res, 'guarda: está el bloque de la frase, que es donde se planta el elemento ancho');
      if (!res) return;
      const bicho = document.createElement('div');
      bicho.style.cssText = 'width:4000px;height:2px';
      res.appendChild(bicho);
      try {
        void document.body.offsetHeight;
        PRUEBAS.alMenos(p090TaEscapes(cont).length, 1,
          'DISCRIMINADOR · un elemento de 4000 px plantado FUERA de `.cmes-scroll` se detecta (dijo: ' +
          (p090TaEscapes(cont)[0] || 'nada') + ') · el recorte de `html` lo habría escondido en silencio');
      } finally {
        bicho.remove();
        void document.body.offsetHeight;
      }
      PRUEBAS.igual(p090TaEscapes(cont), [], 'CONTROL · sacado el bicho, vuelve a dar vacío');
    } finally {
      p090TaLimpiar(s.prevLS);
    }
  });
});

/* ── La ficha del médico ─────────────────────────────────────────────────────────────────────── */

/* El panel real vive dentro de `#portalDash`, que arranca en `display:none`: medido ahí adentro
   TODO da 0 y la prueba daría verde sin haber mirado nada. Se arma la cadena mínima de contenedores
   que el calendario tiene en producción —`.dash-scroll > .dash-sec > .dash-block.fm-block`— que es
   lo que decide su ancho (index.html:2458-2461), igual que hacen Y6 y A2 con la lista del ciclo.
   ⚠️ `#dashBody` se vacía mientras dura la medición: `renderDash()` ya dejó ahí un `#cmesPanel` y
   dos elementos con el mismo id harían que `cmesRepintar` tocara el que no se está midiendo. */
function p090TaEnFicha(fn) {
  const cuerpo = document.getElementById('dashBody');
  const oCuerpo = cuerpo ? cuerpo.innerHTML : null;
  if (cuerpo) cuerpo.innerHTML = '';
  const caja = document.createElement('div');
  caja.innerHTML = '<div class="dash-scroll"><section class="dash-sec" data-tab="resumen">' +
                     '<div class="dash-block fm-block" id="__p090ta_fm"></div></section></div>';
  document.body.appendChild(caja);
  try {
    caja.querySelector('#__p090ta_fm').innerHTML = dashFmCalendario();
    return fn(caja);
  } finally {
    caja.remove();
    if (cuerpo) cuerpo.innerHTML = oCuerpo;
  }
}

PRUEBAS.caso('P090 · ficha del médico: las mismas casillas llegan a 44×44, las fichas a 44, y la semana desplaza dentro de `.cmes-scroll`, en los cuatro anchos y con las dos letras', function () {
  /* R17 · se entra por `onDashData(payload, empresa, params, 'medico')` + `dashGoPerson(nombre)`,
     que es el único camino por el que el panel recibe datos en producción. Nunca `DASH = {...}`:
     `onDashData` arma `DASH` con una lista EXPLÍCITA de campos y lo que no esté nombrado se
     descarta en silencio — es el hallazgo A4, que dejó dos prompts «funcionando» en la suite y
     rotos en producción. */
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj;
  window.fetch = function () { return new Promise(function () {}); };
  window.fetchConReloj = function () { return new Promise(function () {}); };
  /* ⚠️ 2026-09-23 · ANTES SE SEMBRABA UN SOLO DÍA y se pedía «al menos 8 fichas» (una por
     combinación). Eso no es una cuenta, es una esperanza: si una combinación se descartaba, el
     número bajaba a 7 y no se sabía cuál. Ahora se siembran TRES excepciones —el máximo que
     `cmesBloqueHtml` muestra (`res.mirada.slice(0, 3)`, index.html:14393)— separadas 48 h para que
     el motor no las funda en un solo ciclo, y se afirma la cuenta EXACTA. */
  const evs = [30, 78, 126].map(function (h) { return p090TaEventoDetenido(h); });
  const quien = 'Ana Suárez';
  const base = { persona: quien, empresa: 'Consorcio HELITEC', departamento: 'Operaciones',
                 cargo: 'Piloto', test: '', resultado: null, plan: '' };
  try {
    onDashData({
      ok: true, rol: 'supervisor', vista: 'medico', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
      registros: [{ persona: quien, empresa: 'Consorcio HELITEC', departamento: 'Operaciones',
                    cargo: 'Piloto', fecha: todayStr(), kss: 4 }],
      comentarios: [], pvt: [], aptitud: [], turnos: [], config: {}, marca: null, duty: null, ausencias: {},
      operacional: evs.map(function (ev) {
        return Object.assign({ evento: cicloEventoInicial(), iso: ev.iso, fecha: ev.f }, base);
      }),
      operacionalPeriodo: { dias: 400, desde: null, hasta: null }
    }, 'Consorcio HELITEC',
       { action: 'supervisor', usuario: 'usuario-p090ta', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p090ta' },
       'medico');
    dashGoPerson(quien);

    PRUEBAS.igual(DASH.vista, 'medico', 'guarda: la vista es la del servicio médico (es la única que emite el calendario)');
    PRUEBAS.igual(DASH.f.per, quien, 'guarda: hay una persona abierta · sin ella `dashFmCalendario` devuelve cadena vacía');
    /* `cmesMes('panel')` resetea el mes al cambiar de persona, así que se lee ANTES de moverlo.
       Mover el mes con `cmesMesSet` es exactamente lo que hace la flecha (`cmesMesIr`): acá no se
       puede tocar el botón porque el bloque que se mide se pinta en una caja aparte. */
    const ym = evs[0].f.slice(0, 7);
    if (ym !== cmesMes('panel')) cmesMesSet('panel', ym);
    PRUEBAS.igual(cmesMes('panel'), ym, 'guarda: el mes a la vista es el del día sembrado');
    /* Sólo cuentan las excepciones que cayeron en el mes a la vista: sembrar hacia atrás puede
       cruzar el borde del mes los primeros días. Se deriva, no se supone. */
    const fichasEsp = Math.min(3, evs.filter(function (e) { return e.f.slice(0, 7) === ym; }).length);
    PRUEBAS.alMenos(fichasEsp, 1, 'guarda de medibilidad: al menos una excepción sembrada cae en el mes a la vista');

    const esp = p090TaEsperado(ym);
    const out = p090TaVacio();
    P090TA_NIVELES.forEach(function (nivel) {
      fijarTamanoTexto(nivel);
      P090TA_VENTANAS.forEach(function (wh) {
        PRUEBAS.enVentana(wh[0], wh[1], function (w) {
          PRUEBAS.sinAnimaciones(function () {
            p090TaEnFicha(function (caja) {
              const cont = caja.querySelector('#cmesPanel');
              if (!cont) { out.sinGrilla.push('panel ' + w + 'px: no se emitió el bloque'); return; }
              p090TaMedir(cont, 'panel ' + w + 'px/' + TEXTO_NIVELES[nivel].v + '%', w, out, esp, fichasEsp);
            });
          });
        });
      });
    });

    PRUEBAS.igual(out.celdas, P090TA_COMBIS * esp.dias,
      'DISCRIMINADOR · ' + P090TA_COMBIS + ' combinaciones × ' + esp.dias + ' días de ' + ym +
      ' · sin esta cuenta una combinación descartada pasaba sin decirlo (era lo que pasaba: medía 7 de 8)');
    PRUEBAS.igual(out.cuenta, [], 'y en cada combinación salieron todas las casillas y todas las filas del mes');
    PRUEBAS.igual(out.fichas, P090TA_COMBIS * fichasEsp,
      'DISCRIMINADOR · ' + fichasEsp + ' fichas de excepción por combinación, las que se sembraron');
    PRUEBAS.igual(out.sinGrilla, [], 'el bloque se emitió en las ocho combinaciones');
    PRUEBAS.igual(out.anchoRaro, [], 'y la grilla recibió el ancho útil entero de su contenedor en todas');
    PRUEBAS.igual(out.sinFichas, [], 'y las fichas de las excepciones están en todas');
    PRUEBAS.igual(out.bajas, [], 'en la ficha del médico la casilla también llega a ' + P090TA_TOQUE_MIN + ' px de alto');
    /* ⚠️ 2026-09-23 · ACÁ HABÍA UN ROJO DEJADO A PROPÓSITO: a 320 px con letra al 135 % la casilla del
       panel medía 17,9–24,4 px de ancho, por debajo hasta de los 24 de WCAG. Se arregló en el CSS, que
       es donde había que arreglarlo: `min-width: 44px` (index.html:5093). Lo que cede ahora no es el
       objetivo táctil sino el ancho visible de la semana, que se desliza. */
    PRUEBAS.igual(out.angostas, [],
      'y a ' + P090TA_TOQUE_MIN + ' px de ancho, la regla de casa (más exigente que los 24 de WCAG 2.2 · 2.5.8) · ' +
      'MEDIDO: ' + out.tamanos.join(' · '));
    PRUEBAS.igual(out.finas, [], 'las fichas de excepción llegan a 44 px de alto');
    PRUEBAS.igual(out.anchoParcial, [], 'por debajo de 720 px ocupan el ancho entero de su contenedor');
    PRUEBAS.igual(out.fichaAncha, [], 'y ninguna ficha se pasa de su contenedor');
    PRUEBAS.igual(out.flechasFinas, [], 'y las flechas de mes miden 44×44');
    PRUEBAS.igual(out.sinFlechas, [], 'y las dos flechas están en las ocho combinaciones');

    /* ⚠️ 2026-09-23 · Y ACÁ ESTABA EL OTRO ROJO: `out.desbordes === []`. La ficha del médico gasta en
       sus propios contenedores 102 px a 320/100 % y 131 a 320/135 %, así que a las siete columnas les
       quedan 218 y 189 (medido) para los 326 que necesitan. No hay arreglo que las haga entrar sin
       romper el piso de 44: el desplazamiento ES el diseño, y acá desplaza también a 375 px. */
    p090TaAsertosDeDesplazamiento(out, 'la ficha del médico');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj;
    DASH = prevDash;
    p090TaLimpiar(prevLS);
  }
});
