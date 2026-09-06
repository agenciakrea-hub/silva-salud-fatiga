/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P054 · N8 · LA MINA DEL MENÚ DE FILTROS                                         (2026-09-06)

   ── LO QUE NO ERA EL PROBLEMA ───────────────────────────────────────────────────────────────
   El plan ya lo dejó medido y se confirmó: **el menú NO está desactualizado**. Los chips coinciden
   con las secciones pintadas en las cuatro vistas, y la única sin Jornada es supervisor porque lo
   decide el ENDPOINT por el cortafuegos K1a/K1b, no el menú.

   ── LO QUE SÍ ERA, Y EL CÓDIGO YA LO SABÍA ──────────────────────────────────────────────────
   `dashTabsFor()` decide QUÉ pestañas hay y `dashOrderedTabs()` decidía EN QUÉ ORDEN salen — pero
   la segunda tenía su propia copia de las listas, letra por letra para supervisor y HSEQ. El
   propio archivo lo advertía TRES veces: «va también en `dashOrderedTabs()`, que tiene su PROPIA
   lista y descarta en silencio lo que no esté ahí. Hay que tocar las dos».
   Documentar el cuidado que hay que tener es peor que sacar la necesidad de tenerlo: la
   advertencia sólo sirve si el que agrega la pestaña la lee.

   ── LOS DOS SÍNTOMAS, REPRODUCIDOS CON LAS FUNCIONES REALES ─────────────────────────────────
   1. Agregar una pestaña a `dashTabsFor` y olvidarse de la otra → **desaparecía en silencio en las
      CUATRO vistas**. El plan decía «supervisor y HSEQ»: era peor. Todas partían del orden fijo y
      filtraban contra él, así que lo que no estuviera en el orden no salía nunca.
   2. Que el servidor no mande una que el orden fijo sí lista → **chip sin sección** en supervisor
      y HSEQ, las dos que ni siquiera filtraban.

   ── EL ARREGLO ──────────────────────────────────────────────────────────────────────────────
   Se invirtió la lógica. Antes: «tomo mi orden y me quedo con lo que exista». Ahora: «tomo lo que
   EXISTE (`DASH.tabs`) y lo ordeno», y lo que el orden no conoce va AL FINAL en vez de perderse.
   Estos casos entran por las DOS funciones reales (R17): arman `DASH.tabs` con lo que devuelve
   `dashTabsFor()`, que es exactamente lo que hace `onDashData`, y no con una lista escrita a mano.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P054 · el menú de filtros y las pestañas');

const P054_VISTAS = ['supervisor', 'hseq', 'empleado', 'medico'];

/* Pone `DASH` como lo dejaría `onDashData` para esa vista y devuelve lo que sale del menú.
   `tabs` opcional permite simular que el servidor mandó otra cosa. */
function p054Menu(vista, tabs, extra) {
  const prev = DASH;
  const base = tabs || dashTabsFor('empresa', true, vista);
  try {
    DASH = Object.assign({ vista: vista, rol: 'empresa', tabs: base, f: {}, _cfg: {} }, extra || {});
    return dashOrderedTabs();
  } finally { DASH = prev; }
}

PRUEBAS.caso('⚠️ el menú muestra EXACTAMENTE las pestañas que existen, en las cuatro vistas', () => {
  P054_VISTAS.forEach(v => {
    const hay = dashTabsFor('empresa', true, v);
    /* Guarda de medibilidad: una vista sin pestañas haría pasar todo lo de abajo sin comparar. */
    PRUEBAS.alMenos(hay.length, 2,
      'guarda de medibilidad: ' + v + ' tiene pestañas que ordenar · ' + JSON.stringify(hay));
    const menu = p054Menu(v);
    PRUEBAS.igual(menu.slice().sort(), hay.slice().sort(),
      '⚠️ [' + v + '] ni chip de más ni sección sin chip · menú ' + JSON.stringify(menu) +
      ' contra ' + JSON.stringify(hay));
  });
});

PRUEBAS.caso('⚠️ una pestaña NUEVA aparece sin tocar el orden (la mina)', () => {
  /* El defecto: la próxima pestaña que alguien agregue a `dashTabsFor` desaparecía en silencio.
     Nadie iba a relacionar «agregué la pestaña y no se ve» con una lista en otra función. */
  P054_VISTAS.forEach(v => {
    const hay = dashTabsFor('empresa', true, v);
    const menu = p054Menu(v, hay.concat(['pestanaQueNadieOrdeno']));
    PRUEBAS.cierto(menu.indexOf('pestanaQueNadieOrdeno') >= 0,
      '⚠️ [' + v + '] la pestaña nueva SALE · antes se descartaba sin un solo error · ' + JSON.stringify(menu));
    PRUEBAS.igual(menu[menu.length - 1], 'pestanaQueNadieOrdeno',
      '⚠️ [' + v + '] y sale AL FINAL, que es donde va lo que el orden no conoce');
  });
});

PRUEBAS.caso('⚠️ una pestaña que el servidor NO manda no deja un chip huérfano', () => {
  /* El otro síntoma: supervisor y HSEQ devolvían su lista fija sin mirar `DASH.tabs`, así que
     mostraban un chip para una sección que no se iba a pintar. */
  P054_VISTAS.forEach(v => {
    const hay = dashTabsFor('empresa', true, v);
    const quitada = hay[hay.length - 1];
    const menu = p054Menu(v, hay.slice(0, -1));
    PRUEBAS.falso(menu.indexOf(quitada) >= 0,
      '⚠️ [' + v + '] sin «' + quitada + '» en los datos, no hay chip · ' + JSON.stringify(menu));
  });
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · la lógica vieja se pone roja en los dos síntomas', () => {
  /* Sin esto, los tres casos de arriba podrían estar pasando por una razón equivocada. Se
     reimplementa la regla ANTERIOR —«tomo mi orden y me quedo con lo que exista»— y se comprueba
     que falla donde tiene que fallar. */
  const ordenViejo = ['aptitud', 'reportes', 'ciclo'];
  const vieja = tabs => ordenViejo.filter(t => tabs.indexOf(t) >= 0);
  const conNueva = ['aptitud', 'reportes', 'ciclo', 'pestanaNueva'];
  PRUEBAS.falso(vieja(conNueva).indexOf('pestanaNueva') >= 0,
    'la lógica vieja DESCARTA la pestaña nueva · si esto falla, el caso de la mina no prueba nada');
  const viejaSinFiltrar = () => ordenViejo;            // supervisor ni siquiera filtraba
  PRUEBAS.cierto(viejaSinFiltrar().indexOf('ciclo') >= 0,
    'y sin filtrar deja el chip aunque el dato no esté · el otro síntoma');
});

PRUEBAS.caso('⚠️ con una persona elegida no se ofrecen comparar ni individual', () => {
  /* Regla que ya existía y que el cambio tenía que conservar: mirando a UNA persona, las pestañas
     de comparación no aplican. Se comprueba con el filtro puesto y sin él. */
  const hay = dashTabsFor('empresa', true, 'medico');
  PRUEBAS.cierto(hay.indexOf('comparar') >= 0,
    'guarda de medibilidad: sin persona elegida, comparar existe · ' + JSON.stringify(hay));
  const conPersona = p054Menu('medico', hay, { f: { per: 'Ana Suárez' } });
  PRUEBAS.falso(conPersona.indexOf('comparar') >= 0, '⚠️ con persona elegida, comparar no va');
  PRUEBAS.falso(conPersona.indexOf('individual') >= 0, '⚠️ ni individual');
  const comoEmpleado = p054Menu('medico', hay, { rol: 'empleado' });
  PRUEBAS.falso(comoEmpleado.indexOf('comparar') >= 0, '⚠️ ni desde una cuenta de empleado');
});
