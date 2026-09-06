
PRUEBAS.grupo('P107 · la demostración se puede TOCAR, y nada sale al CH');

/* Pedido del dueño, textual: "que él pueda tocar e interactuar, y en vivo mostrarlo, para que no
   sea sólo «miren, el botón está, no podemos probarlo, pero funciona»".
   Antes la barra prometía "puedes tocar todo" y era mentira: restringir una tarea abría el
   formulario, pedía confirmación, y después `gestUpsert` cancelaba la escritura. Diecinueve
   botones que no hacían nada.

   ⚠️ ESTE ARCHIVO EXISTE SOBRE TODO POR LA MITAD DE SEGURIDAD. Abrir la escritura en la demo sólo
   es aceptable porque hay cinco capas debajo, y cualquiera de las cinco se puede deshacer sin
   querer. Los casos de contención van PRIMERO a propósito. */

/* ⚠️ SACA LOS COMENTARIOS ANTES DE BUSCAR, y devuelve el cuerpo entero contando llaves.
   Dos errores que este archivo cometió en su primera versión, y que ya habían pasado dos veces
   antes en este proyecto:
   · cortar el cuerpo a N caracteres: los comentarios largos empujan la línea que se busca fuera
     del corte, y la prueba falla contra código que SÍ está;
   · buscar sobre el texto con comentarios: la explicación de un arreglo NOMBRA lo que el arreglo
     evita ("no se marca `s.up[id]`"), así que el caso se pone en rojo por su propia documentación.
   Un caso que falla por cómo está escrito el comentario no está midiendo el código. */
function p107Cuerpo(nombre){
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  const i = fuente.indexOf('function ' + nombre + '(');
  if (i < 0) return null;
  let j = fuente.indexOf('{', i), n = 0, k = j;
  for (; k < fuente.length; k++){
    if (fuente[k] === '{') n++;
    else if (fuente[k] === '}'){ n--; if (!n) break; }
  }
  return fuente.slice(j, k + 1).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function p107Demo(fn){
  const ov = document.getElementById('portalOverlay');
  const tenia = ov.classList.contains('show');
  const dashPrev = DASH, payPrev = DEMO_PAYLOAD, simPrev = SIMUL;
  try {
    ov.classList.add('show');
    DASH = { demoMode: true, vista: 'hseq', registros: [{ persona:'Ana Suárez', empresa:'Empresa Demo' }],
             params: { action:'demo' }, f:{}, tabs:[] };
    SIMUL = null;
    return fn();
  } finally {
    if (!tenia) ov.classList.remove('show');
    DASH = dashPrev; DEMO_PAYLOAD = payPrev; SIMUL = simPrev;
  }
}

/* ══════════ CONTENCIÓN ══════════ */

PRUEBAS.caso('🔴 la cola del EMPLEADO sigue cerrada en la demostración', () => {
  /* EL AGUJERO QUE HABÍA. `empFlush()` miraba `simulando()` —la simulación de rol— y NO
     `demoMode`. Es la ÚNICA cola de la app que escribe SIN contraseña: del lado del servidor,
     `registro`, `reporte_guardar`, `turno_guardar`, `operacional_guardar`,
     `confiabilidad_guardar`, `consentimiento_guardar`, `opinion_guardar` y `tarea_estado` no
     piden credencial. Un envío desde la demo dejaría filas con `Empresa = "Empresa Demo"` en las
     hojas reales de un cliente. */
  const cuerpo = p107Cuerpo('empFlush');
  PRUEBAS.cierto(!!cuerpo, 'existe empFlush');
  if (!cuerpo) return;
  PRUEBAS.cierto(/demoBloqueaEscritura\(\)/.test(cuerpo),
    '🔴 empFlush TIENE que consultar demoBloqueaEscritura(): es la única cola sin contraseña');
});

PRUEBAS.caso('🔴 escribir como EMPLEADO sigue bloqueado en la demo', () => {
  /* Registrar un test o un turno desde la demostración no aporta nada a la venta, y es justo el
     canal peligroso. Se comprueba el comportamiento, no el texto del código. */
  p107Demo(() => {
    PRUEBAS.cierto(demoBloqueaEscritura(),
      '🔴 con la demo abierta, la escritura de empleado se bloquea');
  });
});

PRUEBAS.caso('🔴 lo sembrado por la demo NO sube al CH ni desde una cuenta real', () => {
  /* El agujero del administrador, que existía desde antes: un admin (usuario `*`) entra con su
     contraseña —`demoMode:false`— y filtra por "Empresa Demo". Ahí `gestCanSync()` da true y la
     cola subiría las gestiones `gdemo*` y las anotaciones `ademo_*` del ejemplo al CH real. */
  PRUEBAS.cierto(typeof demoEsIdSembrado === 'function', 'existe el filtro por id');
  ['gdemo1', 'ademo_ana', 'bdemo7'].forEach(id =>
    PRUEBAS.cierto(demoEsIdSembrado(id), 'se filtra ' + id));
  ['g1abc', 'aus_123', 'INF_9'].forEach(id =>
    PRUEBAS.falso(demoEsIdSembrado(id), 'y NO se filtra lo real: ' + id));
});

PRUEBAS.caso('🔴 marcar una ausencia en la demo no manda nada a la red', () => {
  const cuerpo = p107Cuerpo('ausTocar');
  PRUEBAS.cierto(!!cuerpo, 'existe ausTocar');
  if (!cuerpo) return;
  const j = cuerpo.indexOf("action:'ausencia_guardar'");
  PRUEBAS.alMenos(j, 0, 'y arma el POST en algún lado');
  PRUEBAS.cierto(j > 0 && /DASH\.demoMode/.test(cuerpo.slice(0, j)),
    '🔴 la rama de demo tiene que cortar ANTES de armar el POST');
});

/* ══════════ LO QUE SÍ SE PUEDE TOCAR ══════════ */

PRUEBAS.caso('⚠️ restringir una tarea SE APLICA y se ve', () => {
  p107Demo(() => {
    PRUEBAS.falso(simulBloqueaGestion('guardar'),
      '⚠️ en la demo, la escritura de gestión NO se bloquea: se aplica en memoria');
  });
});

PRUEBAS.caso('pero simulando un rol sigue bloqueado', () => {
  /* Mirar la app de otra persona y escribir sería escribir en su nombre. */
  const ov = document.getElementById('portalOverlay');
  const tenia = ov.classList.contains('show');
  const dashPrev = DASH, simPrev = SIMUL;
  try {
    ov.classList.add('show');
    DASH = { demoMode: true, vista: 'medico' };
    SIMUL = { vista: 'medico', rol: 'supervisor' };
    PRUEBAS.cierto(simulBloqueaGestion('guardar'),
      '⚠️ con SIMUL puesto se bloquea igual, aunque sea la demo');
  } finally { if (!tenia) ov.classList.remove('show'); DASH = dashPrev; SIMUL = simPrev; }
});

PRUEBAS.caso('el DISCRIMINADOR: los dos guards NO son el mismo', () => {
  /* R17: si `simulBloqueaGestion` fuera un alias de `simulBloquea`, todos los casos de arriba
     darían verde igual y no se estaría probando nada. Se confirma que dan DISTINTO en demo. */
  p107Demo(() => {
    const gestion = simulBloqueaGestion('x');
    const empleado = demoBloqueaEscritura();
    PRUEBAS.falso(gestion,  'gestión: pasa');
    PRUEBAS.cierto(empleado, 'empleado: se bloquea');
    PRUEBAS.cierto(gestion !== empleado, '⚠️ dan distinto — o sea que son dos guards de verdad');
  });
});

/* ══════════ LOS BLOQUES QUE ESTABAN EN CERO ══════════ */

PRUEBAS.caso('⚠️ la demostración siembra su bitácora', () => {
  /* "Intervenciones preventivas", "Telemedicina" y "Trazabilidad" eran 592 px de ceros en la vista
     de Dirección — la pantalla que se le muestra a quien firma. Y el texto de ayuda de ese bloque
     dice "que este número sea alto es una buena señal". */
  PRUEBAS.cierto(typeof bitacoraSembrarDemo === 'function', 'existe bitacoraSembrarDemo()');
});

PRUEBAS.caso('⚠️ lo sembrado en la bitácora NO queda en cola de subida', () => {
  /* El cinturón es `demoEsIdSembrado`; esto es el tirante. Un evento en `up` es un evento que la
     app va a intentar subir en cuanto encuentre credenciales. */
  const cuerpo = p107Cuerpo('bitacoraSembrarDemo');
  if (!cuerpo){ PRUEBAS.cierto(false, 'no existe la función'); return; }
  PRUEBAS.falso(/s\.up\[/.test(cuerpo), '⚠️ no marca nada para subir');
  PRUEBAS.cierto(/'bdemo'/.test(cuerpo) || /"bdemo"/.test(cuerpo), 'y usa el prefijo que se filtra');
});

/* ══════════ EL ELENCO ══════════ */

PRUEBAS.caso('⚠️ un solo elenco: nadie aparece en una pantalla y no en la de al lado', () => {
  /* "Luis Ferrer" existía SÓLO en `cicloDemo()`: no estaba en `DEMO_GENTE`, ni en el CH, ni en la
     nómina, ni en aptitud. La prueba de S7 que compara elencos no cubría `cicloDemo`, así que el
     fantasma pasaba en verde — R17 exacto: la prueba mide las piezas para las que se escribió. */
  if (typeof DEMO_GENTE === 'undefined' || typeof cicloDemo !== 'function'){
    PRUEBAS.cierto(false, 'faltan DEMO_GENTE o cicloDemo'); return;
  }
  const elenco = new Set(DEMO_GENTE.map(g => Array.isArray(g) ? g[0] : g.nombre));
  const fantasmas = [...new Set(cicloDemo().map(e => e.persona))].filter(p => p && !elenco.has(p));
  PRUEBAS.igual(fantasmas, [], '⚠️ en el ciclo aparece gente que no está en la nómina de ejemplo');
});

PRUEBAS.caso('⚠️ y nadie tiene dos departamentos', () => {
  /* Ana Suárez estaba en 'Operaciones' en el ciclo y en 'Administración' en todo lo demás:
     filtrar por departamento encontraba cosas distintas en dos pestañas de la misma pantalla. */
  if (typeof DEMO_GENTE === 'undefined' || typeof cicloDemo !== 'function'){
    PRUEBAS.cierto(false, 'faltan DEMO_GENTE o cicloDemo'); return;
  }
  const depto = {};
  DEMO_GENTE.forEach(g => { const a = Array.isArray(g) ? g : [g.nombre, 0, g.departamento]; depto[a[0]] = a[2]; });
  const cruzados = [...new Set(cicloDemo()
    .filter(e => depto[e.persona] && e.departamento && depto[e.persona] !== e.departamento)
    .map(e => e.persona + ': ' + e.departamento + ' vs ' + depto[e.persona]))];
  PRUEBAS.igual(cruzados, [], '⚠️ el departamento tiene que ser el mismo en todas las pantallas');
});

PRUEBAS.caso('la nómina de ejemplo se puede abrir', () => {
  /* `nominaDemo()` tiene 21 personas escritas desde S7 y el botón que abre esa pantalla estaba
     escondido en modo demo: código que anda y que nadie podía alcanzar. */
  const cuerpo = p107Cuerpo('dashUpdateNomFab');
  if (!cuerpo){ PRUEBAS.cierto(false, 'no existe dashUpdateNomFab'); return; }
  PRUEBAS.falso(/!DASH\.demoMode/.test(cuerpo), '⚠️ ya no se esconde el botón en la demostración');
});

/* ══════════ LA LIMPIEZA ══════════ */

PRUEBAS.caso('⚠️ al salir se borra lo que la demostración escribió', () => {
  /* Desde que la demo puede escribir, esto dejó de ser cosmético: sin la limpieza, la segunda
     demostración arranca con las restricciones que se aplicaron en la primera, delante de otro
     cliente. */
  const cuerpo = p107Cuerpo('closePortal');
  if (!cuerpo){ PRUEBAS.cierto(false, 'no existe closePortal'); return; }
  PRUEBAS.cierto(/_eraDemo/.test(cuerpo), 'se recuerda si era demo ANTES de perder DASH');
  PRUEBAS.cierto(/gestSaveStoreAll|bitSaveStoreAll/.test(cuerpo), 'y se limpia el almacén de esa empresa');
});

PRUEBAS.caso('el DISCRIMINADOR del helper: ignora comentarios y no corta el cuerpo', () => {
  /* Sin esto, los cinco casos de arriba podrían estar dando verde por leer mal el archivo. */
  const c = p107Cuerpo('empFlush');
  PRUEBAS.cierto(!!c && c.length > 200, 'devuelve un cuerpo con sustancia, no un recorte');
  PRUEBAS.falso(/\/\*/.test(c), 'y sin comentarios adentro');
  PRUEBAS.igual(p107Cuerpo('estaFuncionNoExisteEnNingunLado__'), null, 'y avisa cuando no existe');
});
