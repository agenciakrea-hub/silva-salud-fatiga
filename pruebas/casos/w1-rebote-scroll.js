
PRUEBAS.grupo('W1 · el rebote feo del scroll no arrastra la navegación');

/* LO QUE SE REPORTÓ: "al llegar al tope con fuerza, la animación saca los botones de abajo de la
   vista". `#bottomNav` es `position:fixed; bottom:0`, y el rebote elástico del DOCUMENTO —lo que
   el celular deja hacer pasado el final del scroll— es lo que lo arrastra: durante ese instante el
   navegador desprende visualmente el elemento fijo del viewport.

   ⚠️ ESTE CASO NO PUEDE REPRODUCIR EL REBOTE, y no hay forma de arreglar eso: el rubber-band de
   iOS/Android es un efecto del MOTOR nativo ante un gesto táctil real, no algo que ocurra en un
   navegador de escritorio con mouse, y mucho menos con la pestaña oculta de este entorno (ver
   LEEME.md). Lo que SÍ se puede comprobar es la causa que se apagó: la propiedad CSS que permite
   ese rebote en el documento. Verificar el efecto final queda para probarlo en un teléfono real. */

PRUEBAS.caso('⚠️ el rebote elástico del documento está apagado', () => {
  /* ⚠️ ANTES ESTE CASO EXIGÍA LA PROPIEDAD TAMBIÉN EN `body`, Y ESO FIJABA UN BUG CRÍTICO.
     `body { overscroll-behavior-y: none }` dejó la app SIN SCROLL CON EL DEDO durante cinco días,
     para todos los usuarios (ver el comentario largo en el CSS de `body`). Este caso lo defendía:
     borrar la línea ponía la prueba en rojo, y la sesión siguiente iba a "arreglar la prueba"
     reponiendo el bug.
     La raíz es R17 en estado puro: comprobaba que la propiedad ESTUVIERA ESCRITA, no que la
     página se pudiera deslizar. Y el propio archivo admitía que no podía reproducir el rebote —
     o sea que no verificaba nada y daba verde igual.
     Ahora se exige sólo en `html`, que es el único que se propaga al viewport. */
  const html = getComputedStyle(document.documentElement).overscrollBehaviorY;
  PRUEBAS.igual(html, 'none', 'el html tiene que tener el rebote apagado');
});

PRUEBAS.caso('⚠️ y el documento SE PUEDE DESLIZAR — la otra mitad, que faltaba', () => {
  /* El caso que habría atrapado el bug de los cinco días. No mira una propiedad: mira la
     condición que hace que el gesto muera.
     El mecanismo: `body { overflow-x: hidden }` hace que el eje Y compute a `auto`, así que
     `body` pasa a ser un contenedor de scroll. Pero el overflow que se propaga al viewport es el
     de `html`, no el de `body` — o sea que `body` queda como un scroller SIN NADA QUE SCROLLEAR.
     Si además tiene `overscroll-behavior-y: none`, tiene PROHIBIDO pasarle el gesto al viewport,
     y el documento no se mueve.
     ⚠️ No se puede medir con la rueda acá (la pestaña está oculta de forma permanente, ver
     LEEME.md), y por eso se mide la CONDICIÓN, que sí es medible y es exactamente la que se dio. */
  CTX.resetear({ esPiloto: true });
  const b = document.body;
  const esScrollerVacio = b.scrollHeight === b.clientHeight;
  const cortaElEncadenado = getComputedStyle(b).overscrollBehaviorY === 'none';
  PRUEBAS.falso(esScrollerVacio && cortaElEncadenado,
    '⚠️ el gesto no puede morir en el body: o tiene a dónde ir, o puede encadenar al viewport');
});

PRUEBAS.caso('el DISCRIMINADOR: la medición de arriba detecta el bug de verdad', () => {
  /* R17: un cero sin discriminador no es un resultado. Se repone la condición exacta que tuvo la
     app cinco días y se confirma que la comprobación cambia de signo. */
  const b = document.body, previo = b.style.overscrollBehaviorY;
  try {
    b.style.overscrollBehaviorY = 'none';
    const roto = (b.scrollHeight === b.clientHeight) && getComputedStyle(b).overscrollBehaviorY === 'none';
    b.style.overscrollBehaviorY = previo || '';
    const sano = (b.scrollHeight === b.clientHeight) && getComputedStyle(b).overscrollBehaviorY === 'none';
    PRUEBAS.cierto(roto, '⚠️ con la propiedad repuesta, la condición se cumple: la prueba SÍ detecta');
    PRUEBAS.falso(sano, 'y sin ella no — o sea que discrimina, no da verde siempre');
  } finally { b.style.overscrollBehaviorY = previo || ''; }
});

PRUEBAS.caso('la barra de navegación sigue fija abajo en cualquier punto del scroll', () => {
  /* No prueba el rebote —no se puede acá—, pero sí la otra mitad de la garantía: que el elemento
     fijo se comporte como fijo en el scroll normal (sin gesto elástico de por medio), en los tres
     puntos que importan: arriba del todo, en el medio, y abajo del todo. */
  CTX.resetear({ esPiloto: true });
  const nav = document.getElementById('bottomNav');
  const alto = innerHeight;
  const puntos = { arriba: 0, medio: Math.round(document.body.scrollHeight / 2), abajo: document.body.scrollHeight };
  const malos = [];
  Object.entries(puntos).forEach(([nombre, y]) => {
    window.scrollTo(0, y);
    const b = Math.round(nav.getBoundingClientRect().bottom);
    if (Math.abs(b - alto) > 1) malos.push(nombre + ': fondo en ' + b + ', viewport en ' + alto);
  });
  window.scrollTo(0, 0);
  PRUEBAS.igual(malos, [], 'la barra tiene que pegar el fondo al borde de la pantalla en los tres puntos');
});

PRUEBAS.caso('⚠️ nada quedó con su propio scroll bloqueado', () => {
  /* P183 · antes contaba `overscroll-behavior` en el CSS como texto. Ahora se lee lo que computa
     el navegador: el documento con el rebote apagado; `body` y los paneles internos (la hoja de
     un overlay, la lista de la nómina) con el suyo libre. Era 2 —html y body— y esa segunda es la
     que dejó la app sin scroll cinco días. */
  const cs = el => el ? getComputedStyle(el).overscrollBehaviorY || getComputedStyle(el).overscrollBehavior : '';
  PRUEBAS.igual(cs(document.documentElement), 'none', '⚠️ el documento tiene el rebote apagado');
  PRUEBAS.cierto(cs(document.body) !== 'none', '⚠️ `body` NO: ahí es donde estuvo cinco días y dejó la app sin scroll (' + cs(document.body) + ')');
  const raiz = document.createElement('div'); raiz.innerHTML = '<div class="overlay"><div class="sheet" id="w1s"></div></div><div class="nom-lista" id="w1l"></div>';
  document.body.appendChild(raiz);
  try {
    ['w1s', 'w1l'].forEach(id => PRUEBAS.cierto(cs(document.getElementById(id)) !== 'none', 'y un panel interno (' + id + ') conserva su propio scroll (' + cs(document.getElementById(id)) + ')'));
  } finally { raiz.remove(); }
});
