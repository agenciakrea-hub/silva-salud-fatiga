/* ── K2 · buscar personas: apóstrofos, guiones y orden ──────────────────────────────────────────
   (2026-08-27)

   El bug: "Luis O'Brien" no aparecía al escribir "obrien". `dashNorm()` saca tildes pero no toca
   la puntuación, así que el nombre quedaba "luis o'brien" y la búsqueda no matcheaba nunca.

   LO QUE MÁS IMPORTA DE ESTE ARCHIVO es el último caso: que **`dashNorm()` siga devolviendo
   exactamente lo mismo**. Esa función genera los ids de upsert del CH y hace el pareo de
   identidad entre hojas. Si alguien, con la mejor intención, decidiera "simplificar" moviendo la
   limpieza de puntuación adentro de `dashNorm` para no tener dos funciones parecidas, **la misma
   persona dejaría de matchear con las filas que ya están escritas en la planilla** y se
   duplicaría. No falla nada visible: se rompe la identidad de los datos, en silencio, hacia
   adelante. Por eso el caso está acá y no en un comentario. */

PRUEBAS.grupo('Cliente · buscar personas (K2)');

PRUEBAS.caso('el bug de I7: "obrien" encuentra a "Luis O\'Brien"', () => {
  PRUEBAS.cierto(buscarCoincide("Luis O'Brien", 'obrien'),
    'es el caso que se reportó: la persona no se encontraba a sí misma en la lista del alta');
  PRUEBAS.cierto(buscarCoincide("Luis O'Brien", "o'brien"),
    'y escribiéndolo con apóstrofo también, obviamente');
  PRUEBAS.cierto(buscarCoincide('Luis O’Brien', 'obrien'),
    'el apóstrofo tipográfico (’) aparece cuando el nombre se copia y pega desde otro lado');
});

PRUEBAS.caso('el guion SEPARA y el apóstrofo UNE', () => {
  /* No es un capricho: es como se teclean esos nombres. Tratarlos igual daría mal uno de los dos. */
  PRUEBAS.cierto(buscarCoincide('María García-López', 'garcia lopez'),
    'quien busca un apellido con guion lo escribe con espacio');
  PRUEBAS.cierto(buscarCoincide('María García-López', 'garcia-lopez'), 'o con el guion, igual');
  PRUEBAS.falso(buscarCoincide('María García-López', 'garcialopez'),
    'pero pegado NO: el guion separa dos apellidos, a diferencia del apóstrofo que une una palabra');
  PRUEBAS.cierto(buscarCoincide('St. John Smith', 'st john'), 'el punto se borra, como el apóstrofo');
});

PRUEBAS.caso('encuentra con el apellido primero', () => {
  PRUEBAS.cierto(buscarCoincide('Ana Pérez', 'perez ana'),
    'la gente escribe el apellido primero tanto como el nombre');
  PRUEBAS.cierto(buscarCoincide('Ana Pérez', '  ANA   perez '),
    'con espacios de más y en mayúsculas también');
});

PRUEBAS.caso('sigue sin encontrar a quien no corresponde', () => {
  /* El contrapeso. Una búsqueda demasiado permisiva es peor que una estricta: en el alta,
     elegir a la persona equivocada de la lista le mete los datos a otro. */
  PRUEBAS.falso(buscarCoincide('Ana Pérez', 'gomez'), 'otra persona no puede aparecer');
  PRUEBAS.falso(buscarCoincide('Luis Gómez', 'obrien'), 'ni por casualidad');
  PRUEBAS.cierto(buscarCoincide('Ana Pérez', ''), 'y con la búsqueda vacía no se filtra nada');
});

PRUEBAS.caso('los tres buscadores usan el mismo criterio', () => {
  /* Eran TRES lugares con el mismo bug (el alta, el equipo y la lista de nómina). Arreglar uno y
     dejar dos habría hecho que el mismo problema se reportara dos veces más adelante. */
  const gente = [
    { nombre: "Luis O'Brien", dep: 'Operaciones' },
    { nombre: 'María García-López', dep: 'Mantenimiento' },
    { nombre: 'Ana Pérez', dep: 'Operaciones' }
  ];
  const porNombre = q => gente.filter(p => buscarCoincide(p.nombre, q)).map(p => p.nombre);
  const porNombreYDep = q => gente.filter(p => buscarCoincide(p.nombre + ' ' + p.dep, q)).map(p => p.nombre);

  PRUEBAS.igual(porNombre('obrien'), ["Luis O'Brien"], 'buscador del alta y lista de nómina');
  PRUEBAS.igual(porNombreYDep('obrien'), ["Luis O'Brien"], 'buscador del equipo');
  PRUEBAS.igual(porNombreYDep('ana operaciones'), ['Ana Pérez'],
    'el del equipo busca sobre nombre y departamento JUNTOS: antes los tokens quedaban repartidos y no encontraba nada');
});

PRUEBAS.caso('⚠️ dashNorm NO cambió: los ids del CH dependen de ella', () => {
  /* Este es el caso que protege la integridad de los datos, no la búsqueda.
     `dashNorm` genera los ids de upsert y el pareo de identidad entre hojas. Si alguien moviera
     la limpieza de puntuación adentro de ella para "no tener dos funciones parecidas", la misma
     persona dejaría de matchear con lo ya escrito en la planilla y se duplicaría — en silencio. */
  PRUEBAS.igual(dashNorm("Luis O'Brien"), "luis o'brien",
    'dashNorm tiene que CONSERVAR el apóstrofo: mover la limpieza acá desaparea lo ya escrito en el CH');
  PRUEBAS.igual(dashNorm('María García-López'), 'maria garcia-lopez',
    'y el guion también');
  PRUEBAS.igual(dashNorm('  NICOLÁS   Herrera '), 'nicolas herrera',
    'lo que sí hace (tildes, mayúsculas, espacios) no se toca');
  PRUEBAS.falso(dashNorm("O'Brien") === buscarNorm("O'Brien"),
    'son dos funciones distintas a propósito: si dieran lo mismo, una de las dos sobra y alguien la va a borrar');
});
