/* ── El personal ve su etapa operacional SIEMPRE, y la rampa de color de los tests (K4) ─────────
   (2026-08-27)

   DOS COSAS QUE COMPARTEN EL MISMO RIESGO: son detalles que no rompen nada al romperse. Si la
   línea de tiempo vuelve a aparecer sólo después del primer evento, o si un color de texto vuelve
   a quedar en 1.7:1, no hay error en consola ni pantalla en blanco — simplemente alguien no
   encuentra algo, o no puede leerlo. Por eso van acá. */

PRUEBAS.grupo('Cliente · el ciclo se ve desde el principio');

PRUEBAS.caso('sin registrar nada, la línea igual se muestra, apagada', () => {
  /* El pedido: "que el personal vea etapa operacional siempre... que esté gris y apagado cuando
     no se tocó nada, para que vean que está eso". Antes aparecía recién con el primer evento, así
     que quien todavía no la había usado no sabía que existía. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const linea = document.querySelector('.cic-mio-linea');
  PRUEBAS.cierto(!!linea, 'la línea tiene que estar aunque no haya ningún evento registrado');
  PRUEBAS.cierto(linea && linea.classList.contains('cic-mio-off'),
    'y tiene que estar apagada, para que se lea como "esto va a pasar" y no como "esto está pasando"');
  PRUEBAS.igual(document.querySelectorAll('.cic-mio .cic-tramo').length, 4,
    'con los cuatro tramos a la vista: es lo que le muestra a la persona el recorrido completo del día');
  PRUEBAS.cierto(!!document.querySelector('.cic-mio-nota'),
    'y la nota que explica que se va a ir completando sola');
});

PRUEBAS.caso('al registrar el primer evento, se enciende', () => {
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const apagada = () => {
    const l = document.querySelector('.cic-mio-linea');
    return !!(l && l.classList.contains('cic-mio-off'));
  };
  PRUEBAS.cierto(apagada(), 'arranca apagada');
  // El camino real: la tarjeta llama a las dos.
  enviarOperacional('salida_casa');
  mark('op_salir_casa');
  PRUEBAS.falso(apagada(),
    'tras el primer evento tiene que encenderse, o la persona no vería que su registro sirvió de algo');
  PRUEBAS.falso(!!document.querySelector('.cic-mio-nota'),
    'y la nota de "todavía no registraste nada" se va');
});

PRUEBAS.caso('los tramos avanzan a medida que se registra', () => {
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const clases = () => [...document.querySelectorAll('.cic-mio .cic-tramo')]
    .map(x => x.className.replace('cic-tramo cic-tr-', ''));
  PRUEBAS.igual(clases(), ['futuro', 'futuro', 'futuro', 'futuro'], 'todo por venir');
  enviarOperacional('salida_casa'); mark('op_salir_casa');
  PRUEBAS.igual(clases()[0], 'curso', 'el primer tramo pasa a en curso');
  enviarOperacional('llegada_aero', 'kss', 3); mark('op_lleg_aero');
  PRUEBAS.igual(clases().slice(0, 2), ['ok', 'curso'],
    'y al llegar, el primero se cierra y arranca el segundo');
});

PRUEBAS.grupo('Cliente · rampa de color de los tests (K4)');

PRUEBAS.caso('la tinta del encabezado se lee en los dos temas', () => {
  /* El bug real de K4: el encabezado de la grilla de Perelli usaba los colores de RELLENO como
     color de texto, y el amarillo daba 1.70:1 en tema claro. Misma trampa que dejó anotada I6:
     los colores de relleno no sirven como tinta. */
  const temaPrevio = temaGuardado();
  const flojos = [];
  ['claro', 'oscuro'].forEach(tema => {
    fijarTema(tema);
    for (let i = 1; i <= 5; i++) {
      const r = CTX.contraste(CTX.token('var(--sev-txt-' + i + ')'), CTX.token('var(--card)'));
      if (r < 4.5) flojos.push(tema + ' --sev-txt-' + i + ' = ' + r);
    }
  });
  fijarTema(temaPrevio || 'claro');
  PRUEBAS.igual(flojos, [],
    'el encabezado de la grilla es texto de 0.58rem: por debajo de 4.5 no se lee');
});

PRUEBAS.caso('las rampas resuelven a un color real', () => {
  /* Si alguien borra o renombra un token, `var(--sev-fill-3)` no resuelve y el puntito queda
     negro o transparente. No lanza ningún error: simplemente se ve mal. */
  const sinResolver = [];
  [['TEST_COLORES', TEST_COLORES], ['_EC', _EC], ['_AC', _AC], ['_GC', _GC]].forEach(([nombre, arr]) => {
    arr.forEach((c, i) => {
      const v = CTX.token(c);
      if (!v || v === 'rgb(0, 0, 0)' || v === 'rgba(0, 0, 0, 0)') sinResolver.push(nombre + '[' + i + ']');
    });
  });
  PRUEBAS.igual(sinResolver, [],
    'un token que no resuelve deja el puntito negro y no da ningún error: sólo se ve mal');
});

PRUEBAS.caso('no quedan colores escritos a mano en las rampas (R13)', () => {
  /* R13: ni en CSS ni dentro de un gráfico. Si vuelve a aparecer un hex acá, ese color queda
     igual en los dos temas por accidente, no por decisión. */
  const aMano = [];
  [['TEST_COLORES', TEST_COLORES], ['_EC', _EC], ['_AC', _AC], ['_GC', _GC]].forEach(([nombre, arr]) => {
    arr.forEach((c, i) => { if (/^#|^rgb/.test(String(c))) aMano.push(nombre + '[' + i + '] = ' + c); });
  });
  PRUEBAS.igual(aMano, [],
    'todo color va por token, para que exista en los dos temas por decisión y no por accidente');
});
