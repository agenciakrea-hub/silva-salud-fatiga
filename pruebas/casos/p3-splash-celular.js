
PRUEBAS.grupo('P3 · el splash en celular: logo, idioma y aire');

/* LO QUE SE PIDIÓ, en tres partes:
   · intercambiar el logo con el botón ES/EN, "para que el logo quede dentro del círculo naranja";
   · devolverle el tamaño al logo (yo lo había achicado de 96 a 58 px por mi cuenta, sin que nadie
     lo pidiera);
   · "los botones están muy arriba y sueltos": juntarlos. */

/* Devuelve cuánto le sobra al logo para seguir DENTRO del círculo, en píxeles. Negativo = se sale.
   ⚠️ Se miden las CUATRO esquinas y contra los dos extremos de la deriva: el círculo tiene una
   animación de ambiente que lo corre unos píxeles, así que "entra quieto" no alcanza.
   ⚠️ Y se mide la caja de la imagen, no "el logo a ojo": comprobado leyendo los píxeles del
   archivo, la tinta ocupa el 97% de la caja, o sea que la caja ES el logo. */
function p3Margen(){
  const logo = document.querySelector('.splash-logo');
  if (!logo || getComputedStyle(logo).position === 'static') return null;   // en escritorio va en el flujo
  const banda = document.querySelector('.splash-circ-band').getBoundingClientRect();
  const cs = getComputedStyle(document.querySelector('.ent-circulos--naranja-navy'), '::after');
  const dia = parseFloat(cs.width), der = parseFloat(cs.right), arr = parseFloat(cs.top);
  if (!isFinite(dia) || !isFinite(der) || !isFinite(arr)) return null;
  const r = dia / 2, cx = banda.right - der - r, cy = banda.top + arr + r;
  const centros = [[cx, cy], [cx - dia * 0.03, cy + dia * 0.025]];   // quieto y derivado
  const b = logo.getBoundingClientRect();
  const esq = [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]];
  return Math.min.apply(null, centros.map(c => Math.min.apply(null,
    esq.map(e => r - Math.hypot(e[0] - c[0], e[1] - c[1])))));
}

PRUEBAS.caso('⚠️ el logo se lee sobre el fondo, y no choca con nada', () => {
  /* ⚠️ ESTE CASO CAMBIÓ DE INVARIANTE el 2026-09-04. Antes comprobaba que el logo entrara DENTRO del
     círculo naranja, porque vivía ahí. Franco pidió intercambiarlo con el botón de idioma: ahora el
     logo va a la izquierda, sobre el fondo azul, y el naranja se queda a la derecha con el chip de
     idioma encima.
     Lo que hay que vigilar pasó a ser otra cosa: que el logo esté entero en pantalla, que no se
     monte sobre el chip de idioma, y que el chip —que SÍ quedó sobre el naranja— tenga fondo propio,
     porque sin él sería texto naranja sobre naranja. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  try {
    [[320,800],[375,667],[390,844],[768,1024]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const logo = document.querySelector('.splash-logo');
        const lang = document.getElementById('splashLangBtn');
        if (!logo || !lang) { malos.push(w + 'x' + h + ': falta un elemento'); return; }
        const rg = logo.getBoundingClientRect(), rl = lang.getBoundingClientRect();
        if (rg.width < 40) { malos.push(w + 'x' + h + ': el logo mide ' + Math.round(rg.width) + 'px'); return; }
        if (rg.left < -1 || rg.right > w + 1) malos.push(w + 'x' + h + ': el logo se sale de la pantalla');
        if (!(rg.right <= rl.left || rg.left >= rl.right)) malos.push(w + 'x' + h + ': logo e idioma se superponen');
        /* El chip de idioma queda sobre el naranja: necesita fondo propio o no se lee. */
        const bg = getComputedStyle(lang).backgroundColor;
        const m = String(bg).match(/[\d.]+/g) || [];
        const opaco = m.length < 4 || Number(m[3]) > 0.5;
        if (!opaco) malos.push(w + 'x' + h + ': el chip de idioma no tiene fondo propio (queda sobre el naranja)');
      });
    });
  } finally { if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [], 'el logo entero, sin chocar, y el chip legible — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ el logo y el idioma ocupan esquinas opuestas', () => {
  /* ⚠️ SE INVIRTIERON el 2026-09-04, a pedido de Franco: el LOGO va a la izquierda y el idioma a la
     derecha. Antes era al revés y este caso lo fijaba así.
     Lo que hay que vigilar NO es de qué lado está cada uno —eso es una decisión de diseño que puede
     volver a cambiar— sino que estén en esquinas OPUESTAS y que el logo vaya primero. Si se juntan,
     el chip de idioma tapa el logo: es lo que pasa si alguien mueve uno solo de los dos, porque el
     logo vive anclado dentro del círculo naranja y los dos tienen que espejarse juntos. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  try {
    [[320,640],[390,844],[768,1024]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const logo = document.querySelector('.splash-logo');
        const lang = document.getElementById('splashLangBtn');
        if (!logo || !lang) { malos.push(w + ': falta uno de los dos'); return; }
        const rg = logo.getBoundingClientRect(), rl = lang.getBoundingClientRect();
        if (!(rg.width > 0 && rl.width > 0)) { malos.push(w + ': no medibles'); return; }
        if (rg.left >= rl.left) malos.push(w + ': el logo no va primero');
        if (!(rg.right <= rl.left || rg.left >= rl.right)) malos.push(w + ': se superponen');
      });
    });
  } finally { if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [], 'logo a la izquierda, idioma a la derecha, sin tocarse — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ los tres accesos están JUNTO al botón, no sueltos', () => {
  /* El reclamo fue "los botones están muy arriba y sueltos". Medido antes: 54 px entre el botón
     Ingresar y el primer acceso, y 9 entre acceso y acceso.
     ⚠️ Y EL PRIMER INTENTO LOS ALEJÓ. Apreté el relleno del pie y quedaron a 72 px, peor que antes:
     el pie era un bloque hermano y el contenedor reparte el aire con `space-evenly`, así que todo
     lo que se le quitaba por dentro se lo devolvía el reparto por fuera.
     El arreglo fue de ÁRBOL, no de números: el pie pasó a estar adentro del cuerpo, así que cuelga
     del mismo bloque que el titular y el botón y la distancia la fija su propio relleno. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const m = PRUEBAS.enVentana(390, 844, () => {
    const cuerpo = document.querySelector('.splash-cuerpo');
    const pie = document.querySelector('.splash-pie');
    const emp = document.querySelector('.splash-empresa');
    const visible = emp && getComputedStyle(emp).display !== 'none';
    /* Lo que la persona ve arriba de los accesos es el chip de empresa si lo hay, y si no el botón. */
    const arriba = (visible ? emp : document.querySelector('.splash-cta')).getBoundingClientRect();
    const L = [...document.querySelectorAll('.splash-link')];
    return {
      dentroDelCuerpo: cuerpo.contains(pie),
      distancia: Math.round(L[0].getBoundingClientRect().top - arriba.bottom),
      entre: L.slice(1).map((l, i) => Math.round(l.getBoundingClientRect().top - L[i].getBoundingClientRect().bottom)),
      toque: Math.min.apply(null, L.map(l => Math.round(l.getBoundingClientRect().height)))
    };
  });
  if (!yaAbierto) ov.classList.remove('show');

  PRUEBAS.cierto(m.dentroDelCuerpo,
    'el pie tiene que colgar del cuerpo: como bloque hermano, el reparto de aire lo aleja y ' +
    'apretarlo por dentro lo empeora');
  PRUEBAS.comoMucho(m.distancia, 30,
    'los accesos van pegados a lo que tienen arriba (eran 54 px, y un intento los dejó en 72)');
  PRUEBAS.comoMucho(Math.max.apply(null, m.entre), 4,
    'y entre ellos casi no hay hueco: con 44 px de área de toque y 17 de texto, 9 px se ven como 36');
  PRUEBAS.alMenos(m.toque, 44,
    '⚠️ pero el ÁREA DE TOQUE no se toca: 44 px es lo que permite apretarlos parado y con una mano ' +
    '(I2). Lo que se junta es lo que se ve, no lo que se puede tocar');
});

PRUEBAS.caso('el splash no se recorta a ningún tamaño', () => {
  /* El pie tiene el acceso de supervisor y el de administrador. Ya pasó una vez que quedaba abajo
     del borde y parecía no existir; lo reportó el usuario. Al mover el pie de lugar en el árbol hay
     que volver a comprobarlo en todos lados. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const cortados = [];
  for (const v of PRUEBAS.VENTANAS) {
    PRUEBAS.enVentana(v.w, v.h, () => {
      const w = document.querySelector('.splash-wrap');
      const sobra = w.scrollHeight - w.clientHeight;
      if (sobra > 1) cortados.push(v.w + 'x' + v.h + ': ' + sobra + 'px');
      const lim = w.getBoundingClientRect().bottom;
      document.querySelectorAll('.splash-link').forEach(b => {
        if (b.getBoundingClientRect().bottom > lim + 1) cortados.push(v.w + 'x' + v.h + ': ' + b.textContent.trim());
      });
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(cortados, [], 'nada del splash puede quedar abajo del borde, menos los accesos del pie');
});

PRUEBAS.grupo('P3b · la cabecera del inicio: sin solapamiento y simétrica');

/* ⚠️ ESTO LO REPORTÓ FRANCO MIRANDO EL TELÉFONO, no lo encontró ninguna medición. Por eso los casos
   miden GEOMETRÍA y no reglas de CSS: lo que hay que fijar es que dos cajas no se toquen y que dos
   márgenes den igual, no cómo está escrito el estilo que lo consigue. */

PRUEBAS.caso('⚠️ el logo NO se pisa con el titular, en ningún ancho', () => {
  /* Medido antes del arreglo: a 320 px el titular arrancaba 3 px ARRIBA del borde inferior del
     logo, o sea encima. La causa era que el logo medía `min(92px, 24.5vw)` de ancho y el relleno
     que le reservaba lugar era un `104px` fijo, escrito aparte — y el logo es más ALTO que ancho
     (1184x1500), así que a 375 terminaba en 124 contra 104 reservados.
     Ahora los dos salen de las mismas variables y no se pueden desincronizar. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  try {
    for (const v of PRUEBAS.VENTANAS) {
      PRUEBAS.enVentana(v.w, v.h, () => {
        const logo = document.querySelector('.splash-logo'), h1 = document.querySelector('.splash-h1');
        if (!logo || !h1) return;
        const rl = logo.getBoundingClientRect(), rh = h1.getBoundingClientRect();
        const seTocan = !(rl.bottom <= rh.top || rl.right <= rh.left || rl.left >= rh.right);
        if (seTocan) malos.push(v.w + 'x' + v.h + ': se pisan');
        else if (rh.top - rl.bottom < 8) malos.push(v.w + 'x' + v.h + ': quedan a ' + Math.round(rh.top - rl.bottom) + 'px');
      });
    }
  } finally { if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [],
    '⚠️ el logo y el titular necesitan al menos 8 px entre ellos — ' + malos.join(' · '));
});

PRUEBAS.caso('⚠️ el logo y el botón de idioma están a la MISMA distancia de su borde', () => {
  /* Son los dos elementos que ocupan las esquinas superiores. Medido: el logo estaba a 28 px del
     borde izquierdo y el chip a 16 del derecho —y a 768, 48 contra 16—, así que la cabecera se leía
     torcida. Se excluye escritorio a propósito: ahí el logo entra al flujo de la columna izquierda
     y su referencia pasa a ser el titular, no el borde de la ventana. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  try {
    for (const v of PRUEBAS.VENTANAS.filter(x => x.w < 900)) {
      PRUEBAS.enVentana(v.w, v.h, () => {
        const logo = document.querySelector('.splash-logo'), lang = document.getElementById('splashLangBtn');
        if (!logo || !lang) return;
        const rl = logo.getBoundingClientRect(), rg = lang.getBoundingClientRect();
        const izq = Math.round(rl.left), der = Math.round(v.w - rg.right);
        if (izq !== der) malos.push(v.w + 'px: ' + izq + ' izq contra ' + der + ' der');
        if (Math.abs(rl.top - rg.top) > 1)
          malos.push(v.w + 'px: arrancan a distinta altura (' + Math.round(rl.top) + ' y ' + Math.round(rg.top) + ')');
      });
    }
  } finally { if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [], '⚠️ las dos esquinas tienen que ser espejo — ' + malos.join(' · '));
});

PRUEBAS.caso('⚠️ el pie dice SÓLO la línea del programa de gestión', () => {
  /* Franco pidió sacar la aclaración de "no es una certificación": abajo de todo, pegado al margen,
     va una sola línea. Se comprueba que no vuelva a aparecer un segundo párrafo ahí. */
  PRUEBAS.cierto(!!document.querySelector('.splash-norma'), 'la línea de la norma tiene que estar');
  PRUEBAS.falso(!!document.querySelector('.splash-norma-ac'),
    '⚠️ y NO puede haber una segunda línea debajo: se sacó a pedido');
  const txt = (t('splash_norma') || '').toLowerCase();
  PRUEBAS.cierto(/oaci|icao/.test(txt) && /45001/.test(txt), 'y sigue nombrando las dos normas');
});
