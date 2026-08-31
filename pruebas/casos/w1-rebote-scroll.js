
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
  const html = getComputedStyle(document.documentElement).overscrollBehaviorY;
  const body = getComputedStyle(document.body).overscrollBehaviorY;
  /* Se comprueba en los dos: el "scrolling element" real —a quién le hace caso el navegador—
     cambia según el motor, así que la regla está repetida a propósito en el CSS. */
  PRUEBAS.igual(html, 'none', 'el html tiene que tener el rebote apagado');
  PRUEBAS.igual(body, 'none', 'y el body también, por si el motor usa éste como scrolling element');
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
  /* Apagar el rebote del DOCUMENTO no tiene que apagar el de los paneles internos (el buscador de
     nómina, el cuerpo de un documento largo, las tarjetas de un overlay): esos siguen necesitando
     poder scrollear sin que el rebote del documento se les escape encima. Se comprueba que la
     propiedad nueva NO se coló en ninguna de esas reglas por un copiar y pegar de más. */
  /* Se sacan los comentarios ANTES de contar: el propio comentario que explica la decisión
     menciona "overscroll-behavior" como texto, y sin esto la cuenta se infla contra algo que no
     es una regla. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const total = (fuente.match(/overscroll-behavior/g) || []).length;
  PRUEBAS.igual(total, 2,
    'sólo html y body tocan esta propiedad; si aparece un tercer lugar hay que revisar a mano que ' +
    'no bloquee un scroll interno sin querer');
});
