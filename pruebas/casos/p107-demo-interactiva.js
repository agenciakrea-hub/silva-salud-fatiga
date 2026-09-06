
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

/* ── P107 · la cobertura de la demostración ─────────────────────────────────────────────────────
   Medido en la demo real antes de tocar nada: la vista de Dirección decía **100% de cobertura**.
   El endpoint de la demo no manda `nominaTotal` —su payload son registros, PVT, comentarios, marca
   y config, nada más—, así que llegaba 0, el cliente caía al denominador viejo (`cuentan.length`)
   y la cobertura terminaba midiendo "100% de los que ya tenían datos".

   Dos cosas malas a la vez, y la segunda es peor:
   · Un 100% en una demostración de venta juega EN CONTRA. Si ya está todo cubierto, el producto no
     hace falta.
   · Y escondía justamente la función que más se quiere mostrar: la línea de "N personas operando
     sin ninguna medición" no listaba a nadie.

   `nominaDemo()` YA tenía a las dos personas sin registrar —Mariana Cárdenas y Esteban Rivas—:
   existían en el elenco y no llegaban a la cuenta. No se inventó gente nueva. */

function p107Payload(){
  /* El payload que manda `accionDemo` de verdad: se comprobó contra el endpoint publicado
     (`action=demo`, 2026-09-06) y sus claves son exactamente éstas. Si mañana el servidor empieza
     a mandar `nominaTotal`, este caso sigue valiendo: lo que se prueba es que la demo NO dependa
     de que lo mande. */
  const gente = (typeof DEMO_GENTE !== 'undefined') ? DEMO_GENTE : [];
  const regs = gente.map(g => ({ persona: Array.isArray(g) ? g[0] : g.nombre,
    empresa: 'Empresa Demo', departamento: Array.isArray(g) ? g[2] : g.departamento,
    fecha: (typeof todayStr === 'function' ? todayStr() : '2026-09-06'), kss: 4 }));
  return { ok:true, demo:true, rol:'supervisor', vista:'medico',
           referencia:{ kss:6 }, metricas:['kss'], registros:regs, pvt:[], comentarios:null,
           marca:null, config:null };
}

PRUEBAS.caso('⚠️ la demostración NO dice 100% de cobertura', () => {
  const d = p107Payload();
  PRUEBAS.cierto(d.registros.length > 0, 'el elenco de ejemplo tiene gente · si no, no se mide nada');
  const total = demoNominaTotal(d);
  const sin = demoNominaSinDato(d);
  PRUEBAS.alMenos(total, d.registros.length + 1,
    'la nómina de ejemplo es MÁS grande que quienes tienen mediciones · si fueran iguales, la ' +
    'cobertura volvería a dar 100% y no habría nada que mostrar · ' + total +
    ' contra ' + d.registros.length);
  PRUEBAS.alMenos(sin.length, 1,
    'y hay al menos una persona sin ninguna medición, que es lo que el producto sirve para ver');
  PRUEBAS.comoMucho(Math.round(d.registros.length / total * 100), 99,
    'la cobertura de la demostración queda por debajo de 100%');
});

PRUEBAS.caso('los que faltan salen del MISMO elenco, no de una lista aparte', () => {
  /* Si se hubieran inventado nombres nuevos, aparecerían en la línea de "sin medición" y en
     ninguna otra pantalla — el fantasma que este archivo ya cazó una vez con "Luis Ferrer". */
  const d = p107Payload();
  const elenco = new Set(nominaDemo().map(x => x.persona));
  const fuera = demoNominaSinDato(d).filter(n => !elenco.has(n));
  PRUEBAS.igual(fuera, [], '⚠️ nadie sale de la nómina de ejemplo — ' + fuera.join(', '));
});

PRUEBAS.caso('la cuenta se corrige sola si la demo trae datos de alguien más', () => {
  /* No es una lista fija de "los que faltan": se calcula contra los registros que llegaron. El día
     que la demo traiga mediciones de Mariana, deja de figurar sin que nadie edite nada. */
  const d = p107Payload();
  const antes = demoNominaSinDato(d).length;
  PRUEBAS.alMenos(antes, 1, 'hay alguien sin medición para poder mover');
  const quien = demoNominaSinDato(d)[0];
  d.registros = d.registros.concat([{ persona: quien, empresa:'Empresa Demo',
    departamento:'Operaciones', fecha:'2026-09-06', kss:4 }]);
  PRUEBAS.igual(demoNominaSinDato(d).length, antes - 1,
    'al llegar su medición, ' + quien + ' sale de la lista sola');
});

PRUEBAS.caso('el DISCRIMINADOR: fuera de la demo NO se toca nada', () => {
  /* Estas dos funciones son un envoltorio, no una regla nueva. Si se aplicaran a una empresa real,
     le pisarían el denominador con la nómina de ejemplo — 21 personas que no son suyas. */
  const real = { demo:false, nominaTotal:37, nominaSinDato:['Alguien Real'],
                 registros:[{ persona:'Alguien Real' }] };
  PRUEBAS.igual(demoNominaTotal(real), 37, 'una empresa real conserva SU total');
  PRUEBAS.igual(demoNominaSinDato(real), ['Alguien Real'], 'y SU lista de no medidos');
  /* Y un endpoint viejo que no manda el campo sigue cayendo al comportamiento anterior. */
  PRUEBAS.igual(demoNominaTotal({ demo:false }), 0, 'sin el campo, 0 · como antes');
});
