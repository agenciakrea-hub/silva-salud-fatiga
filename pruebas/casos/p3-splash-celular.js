
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

PRUEBAS.caso('⚠️ el logo entra en el círculo naranja, en todo teléfono', () => {
  /* ⚠️ POR QUÉ ESTO NO ERA OBVIO, y por qué se comprueba a varios tamaños en vez de a uno:
     el RADIO del círculo va con el ANCHO de pantalla (56% del ancho) y su recorte de arriba va con
     el ALTO (la banda mide `min(46vh,360px)` y el círculo se sube un 20% de eso). En un teléfono
     angosto y alto las dos cosas se pelean: el círculo queda chico Y muy subido, así que del naranja
     se ve poco. Con el logo puesto a ojo a 390x844 —donde sobraban 3 px— a 320x800 se salía 11.
     El tamaño del círculo se subió a 62% SÓLO en el splash de teléfono justamente para que el logo
     entrara sin tener que achicarlo a 66 px, que era la alternativa. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [], medidos = [];
  for (const v of PRUEBAS.VENTANAS) {
    PRUEBAS.enVentana(v.w, v.h, () => {
      const m = p3Margen();
      if (m === null) return;                       // escritorio: el logo va en el flujo
      medidos.push(v.w + 'x' + v.h + ': ' + Math.round(m));
      if (m < 4) malos.push(v.w + 'x' + v.h + ': ' + Math.round(m) + 'px');
    });
  }
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.alMenos(medidos.length, 3, 'control: tiene que haber medido en varios tamaños de teléfono');
  PRUEBAS.igual(malos, [],
    'el logo tiene que quedar dentro del círculo naranja con margen, contando la deriva: si asoma ' +
    'por una esquina queda medio sobre el naranja y medio sobre el navy, que es lo que se pidió evitar');
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
