
PRUEBAS.grupo('S6 · la flecha deshace el filtro, no te saca');

/* El problema original, en palabras del dueño: el jefe filtraba por una persona, tocaba atrás para
   volver a la lista, y en vez de eso el panel se cerraba y lo sacaba de supervisor — tenía que
   volver a escribir la contraseña de la empresa.
   Estaba resuelto para tres filtros (persona, departamento, empresa) y **faltaban cuatro**: nivel de
   riesgo, período, el buscador de aptitud y el filtro por estado. Con cualquiera de esos puesto, el
   defecto seguía vivo tal cual. */

function s6Con(f, extra, fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    DASH = Object.assign({ rol:'supervisor', vista:'supervisor', tab:'resumen',
                           f: Object.assign({ emp:'', dep:'', per:'', nivel:'', desde:'', hasta:'' }, f || {}) },
                         extra || {});
    return fn();
  } finally { DASH = prev; }
}

PRUEBAS.caso('⚠️ TODOS los filtros cuentan como "algo que deshacer"', () => {
  /* Si `dashHayFiltro` no lo ve, `portalBackToGate` cierra la sesión. Cada uno de estos se pone
     desde una pantalla distinta del panel, así que cualquiera de los cuatro que faltaban dejaba el
     defecto vivo para quien usara esa pantalla. */
  const casos = [
    ['persona',            { per:'Ana Suárez' }, null],
    ['departamento',       { dep:'Operaciones' }, null],
    ['nivel de riesgo',    { nivel:3 }, null],
    ['período (desde)',    { desde:'2026-09-01' }, null],
    ['período (hasta)',    { hasta:'2026-09-30' }, null],
    ['buscador de aptitud',{}, { _aptQ:'suárez' }],
    ['filtro de aptitud',  {}, { _aptFiltro:'alto' }],
    ['sólo con anotación', {}, { _aptSoloAnot:true }],
  ];
  const ciegos = [];
  casos.forEach(([nombre, f, extra]) => {
    if (!s6Con(f, extra, () => dashHayFiltro())) ciegos.push(nombre);
  });
  PRUEBAS.igual(ciegos, [],
    '⚠️ con estos filtros puestos, "atrás" saca del panel en vez de deshacerlos: ' + ciegos.join(', '));
});

PRUEBAS.caso('⚠️ y el caso discrimina: SIN ningún filtro, atrás sí puede salir', () => {
  /* El control. Si `dashHayFiltro` devolviera true siempre, el caso de arriba pasaría igual y la
     flecha nunca podría cerrar el panel — quedaría atrapada. */
  PRUEBAS.falso(s6Con({}, {}, () => dashHayFiltro()),
    'sin nada puesto no hay nada que deshacer, y ahí sí corresponde salir');
  PRUEBAS.falso(s6Con({ emp:'Helitec' }, {}, () => dashHayFiltro()),
    'y la empresa de un supervisor no es un filtro: es su alcance, no algo que él puso');
  PRUEBAS.cierto(s6Con({ emp:'Helitec' }, { rol:'admin' }, () => dashHayFiltro()),
    'pero para el admin sí, porque él eligió esa empresa entre varias');
});

/* ⚠️ `dashClearOne` repinta el panel, y repintar necesita MUCHO más estado del que hace falta para
   probar la lógica de qué se deshace primero. Se neutraliza el repintado: lo que importa acá es el
   orden, y el repintado ya tiene sus propios casos. */
function s6SinPintar(fn){
  const bf = window.buildDashFilters, rd = window.renderDash, bt = window.buildDashTabs;
  window.buildDashFilters = () => {}; window.renderDash = () => {}; window.buildDashTabs = () => {};
  try { return fn(); }
  finally { window.buildDashFilters = bf; window.renderDash = rd; window.buildDashTabs = bt; }
}

PRUEBAS.caso('⚠️ se deshace de a uno, del más específico al más general', () => {
  /* "Atrás" tiene que deshacer lo ÚLTIMO que la persona hizo, no barrer todo de un saque. Con
     empresa + depto + persona puestos, tres toques tienen que dejar tres estados distintos, no
     mandar directo al selector. */
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    DASH = { rol:'admin', vista:'medico', tab:'resumen',
             f:{ emp:'Helitec', dep:'Operaciones', per:'Ana Suárez', nivel:'', desde:'', hasta:'' } };
    s6SinPintar(dashClearOne);
    PRUEBAS.igual(DASH.f.per, '', 'el primer toque suelta la persona…');
    PRUEBAS.igual(DASH.f.dep, 'Operaciones', '…y deja el departamento');
    s6SinPintar(dashClearOne);
    PRUEBAS.igual(DASH.f.dep, '', 'el segundo suelta el departamento…');
    PRUEBAS.igual(DASH.f.emp, 'Helitec', '…y deja la empresa');
    PRUEBAS.cierto(dashHayFiltro(), 'y todavía hay algo que deshacer: no corresponde salir');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ el buscador de aptitud se suelta ANTES que el filtro de empresa', () => {
  /* Es lo más fino y lo último que se toca. Si se soltara la empresa primero, un toque de "atrás"
     mientras se busca a alguien tiraría todo el recorrido de golpe. */
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    DASH = { rol:'admin', vista:'medico', tab:'aptitud', _aptQ:'suárez',
             f:{ emp:'Helitec', dep:'', per:'', nivel:'', desde:'', hasta:'' } };
    s6SinPintar(dashClearOne);
    PRUEBAS.igual(DASH._aptQ, '', 'primero se limpia la búsqueda…');
    PRUEBAS.igual(DASH.f.emp, 'Helitec', '…y la empresa sigue puesta');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ "atrás" del teléfono usa el mismo camino que la flecha', () => {
  /* Dos caminos distintos para el mismo gesto es cómo se llega a que uno de los dos se olvide. */
  PRUEBAS.cierto(/dashAtras\(\)/.test(String(silvaAtras)),
    'el botón físico tiene que pasar por dashAtras, no cerrar el portal por su cuenta');
  PRUEBAS.cierto(/dashAtras\(\)/.test(String(portalBackToGate)),
    'y la flecha de la pantalla, también');
});
