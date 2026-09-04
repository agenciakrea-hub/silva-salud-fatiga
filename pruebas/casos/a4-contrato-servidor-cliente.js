
PRUEBAS.grupo('A4 · lo que el servidor manda tiene que sobrevivir del lado del cliente');

/* ⚠️ EL DEFECTO QUE ESTO FIJA SE COMIÓ DOS PROMPTS ENTEROS, LOS DOS EN VERDE.
   `onDashData()` no copia el payload: arma `DASH` con una lista EXPLÍCITA de campos. Todo lo que el
   servidor mande y no esté nombrado ahí se tira sin un error, sin una advertencia, sin nada.
   Así se perdían `duty` (Y4) y `ausencias` (Y5): el .gs los calculaba y los mandaba, y del lado del
   cliente no existían. La pestaña Jornada mostraba su estado vacío SIEMPRE en producción, y la
   cobertura del IDC no descontaba a nadie nunca. Medido, no deducido.

   Ninguna de las suites de Y4 ni de Y5 lo vio, y las dos eran grandes: armaban `DASH` a mano
   (`DASH = { vista:'hseq', duty: dutyDemo() }`) porque es más cómodo, y con eso probaban todo menos
   el único camino por el que el dato llega de verdad.

   Por eso este caso no comprueba `duty` ni `ausencias` por su nombre: compara EL CONTRATO. Lee del
   .gs real qué claves manda la respuesta del panel y verifica que cada una tenga un destino en el
   cliente. Una clave nueva que nadie consuma lo pone en rojo el día que se agrega, no dos prompts
   después. */

/* Las que NO viven en `DASH` a propósito, con dónde se consumen. Cualquier otra que aparezca en el
   .gs y no esté acá es, por definición, un dato que el servidor calcula y el cliente descarta. */
const A4_FUERA_DE_DASH = {
  ok:        'es el sobre, no el contenido',
  rol:       'se guarda como DASH.rol',
  vista:     'se guarda como DASH.vista',
  demo:      'se guarda como DASH.demoMode',
  referencia:'se guarda como DASH.ref',
  metricas:  'se filtra y se guarda como DASH.metrics',
  config:    'se guarda como DASH._cfg',
  niveles:   'se guarda como DASH._niveles',
  sesion:    'lo consume el guardado de sesión (S4), antes de llegar acá',
  zonaOp:    'lo consume zonaOpGuardar() (L1): es del dispositivo, no del panel',
  combinada: 'sólo lo usa el servidor para decidir qué vista abrir'
};

function a4ClavesDelGs(fuente){
  /* El bloque de la rama REAL de `accionSupervisor` — la que usa una empresa con contraseña. Se
     ancla en un texto que aparece UNA sola vez: la rama de demo dice `sesionToken, demo:true,`. */
  const i = fuente.indexOf('sesionToken, referencia:REFERENCIA');
  if (i < 0) return null;
  const ini = fuente.lastIndexOf('json({', i);
  if (ini < 0) return null;
  // recorre balanceando llaves, sin regex: el objeto tiene funciones anónimas adentro
  let nivel = 0, fin = -1;
  for (let k = ini + 5; k < fuente.length; k++){
    const c = fuente[k];
    if (c === '{') nivel++;
    else if (c === '}'){ nivel--; if (nivel === 0){ fin = k; break; } }
  }
  if (fin < 0) return null;
  /* ⚠️ SIN LOS COMENTARIOS. El bloque tiene comentarios largos entre campo y campo, y varios traen
     dos puntos ("Y1: el período que se sirvió DE VERDAD"). Sin sacarlos, el lector devolvía `Y1`,
     `L1` y `seguro` como si fueran campos del servidor. Los strings de este bloque no contienen
     `/*` ni `//`, así que quitarlos a secas es seguro acá. */
  const cuerpo = fuente.slice(ini + 6, fin)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  // claves de PRIMER nivel: las que quedan a profundidad 0 de llaves, corchetes y paréntesis
  const claves = []; let d = 0, tomar = true, tok = '';
  for (let k = 0; k < cuerpo.length; k++){
    const c = cuerpo[k];
    if ('{[('.indexOf(c) >= 0) d++;
    else if ('}])'.indexOf(c) >= 0) d--;
    if (d === 0){
      if (c === ':' && tomar){ const m = tok.match(/([A-Za-z_$][\w$]*)\s*$/); if (m) claves.push(m[1]); tomar = false; tok = ''; }
      else if (c === ','){ tomar = true; tok = ''; }
      else tok += c;
    }
  }
  return claves;
}

PRUEBAS.caso('⚠️ el lector de contrato ENCUENTRA el bloque (si no, todo lo de abajo da verde en falso)', () => {
  /* Guarda de medibilidad. Sin esto, el día que el .gs se reescriba y la búsqueda no enganche, los
     casos de abajo pasarían con una lista vacía y nadie se enteraría. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const claves = a4ClavesDelGs(CTX.gs);
  PRUEBAS.cierto(!!claves, '⚠️ no se encontró la respuesta del panel en el .gs');
  if (!claves) return;
  PRUEBAS.alMenos(claves.length, 12, 'la respuesta del panel tiene bastantes más de 12 campos');
  ['registros','pvt','duty','ausencias','turnos'].forEach(k =>
    PRUEBAS.cierto(claves.indexOf(k) >= 0, 'tiene que leer la clave `' + k + '` — leyó: ' + claves.join(', ')));
});

PRUEBAS.caso('⚠️ ninguna clave que manda el servidor se pierde al armar DASH', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const claves = a4ClavesDelGs(CTX.gs);
  if (!claves) { PRUEBAS.cierto(false, 'sin claves que comparar (ver el caso de arriba)'); return; }

  const prev = DASH;
  try {
    /* Un payload con TODAS las claves del contrato y un valor reconocible en cada una. Pasa por
       `onDashData`, que es el único camino real — no se arma `DASH` a mano, que es exactamente el
       atajo que dejó pasar el defecto. */
    const payload = { ok:true, rol:'empresa', vista:'hseq' };
    claves.forEach(k => { if (!(k in payload)) payload[k] = A4_VALOR[k] !== undefined ? A4_VALOR[k] : { __a4:k }; });
    onDashData(payload, 'Empresa', {}, 'hseq');
    const perdidas = claves.filter(k => !(k in A4_FUERA_DE_DASH) && !(k in DASH));
    PRUEBAS.igual(perdidas, [],
      '⚠️ el servidor las manda y el cliente las tira: ' + perdidas.join(', ') +
      ' — o se guardan en DASH, o se agregan a A4_FUERA_DE_DASH diciendo dónde se consumen');
  } finally { DASH = prev; }
});

/* Valores con la forma que el cliente espera: si a `registros` le llegara un objeto en vez de un
   arreglo, `onDashData` tiraría antes de llegar a lo que se quiere medir. */
const A4_VALOR = {
  referencia:{}, metricas:[], registros:[], comentarios:[], pvt:[], aptitud:[], operacional:[],
  turnos:[], config:{}, marca:null, niveles:[], sesion:'tok', zonaOp:'America/Caracas',
  combinada:false, demo:false,
  duty:{ dias:7, diario:[], personas:[], historico:[], sinUmbralCongelado:0 },
  ausencias:{ 'n:x|2026-01-01':'franco' },
  operacionalPeriodo:{ dias:7, desde:null, hasta:null, puedeVerHistorico:true }
};

PRUEBAS.caso('⚠️ y tampoco se pierden en el REFRESCO, que es otro lugar distinto', () => {
  /* Son DOS los sitios que copian campos del servidor: la carga inicial y el refresco periódico.
     `duty` y `ausencias` faltaban en los dos. Si sólo se arreglara la carga, marcar una ausencia y
     esperar al refresco la borraría de la pantalla. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const i = fuente.indexOf('DASH.turnos = d.turnos || [];   // E2b: idem');
  PRUEBAS.alMenos(i, 0, 'tiene que existir el bloque de refresco');
  if (i < 0) return;
  const bloque = fuente.slice(i, i + 900);
  PRUEBAS.cierto(/DASH\.duty\s*=\s*d\.duty/.test(bloque),
    '⚠️ el refresco tiene que traer `duty`, o la pestaña Jornada se vacía sola al actualizar');
  PRUEBAS.cierto(/d\.ausencias/.test(bloque),
    '⚠️ y `ausencias`, o una ausencia recién marcada desaparece en el siguiente refresco');
});

PRUEBAS.caso('⚠️ con el payload del servidor, Jornada PINTA y la ausencia DESCUENTA', () => {
  /* El de arriba comprueba que el dato sobreviva; éste, que sirva para algo. Es la diferencia entre
     probar la pieza y probar el uso — que es la raíz de los dos defectos de esta tanda. */
  const prev = DASH;
  try {
    onDashData({
      ok:true, rol:'empresa', vista:'hseq', referencia:{}, metricas:[],
      registros:[{ persona:'Ana Suárez', empresa:'E', departamento:'Op', cargo:'Piloto', fecha: todayStr() }],
      comentarios:[], pvt:[], aptitud:null, operacional:[], turnos:[], config:{}, marca:null,
      duty:{ dias:7, sinUmbralCongelado:0, personas:[], historico:[],
             diario:[{ persona:'Ana Suárez', empresa:'E', departamento:'Op', fecha: todayStr(),
                       jornadaMin:800, previstoMin:720, excesoMin:80, abierto:false,
                       umbralCongelado:true, tramos:[] }] },
      ausencias:{ ['n:' + ausNombreClave('Ana Suárez') + '|' + todayStr()]: 'vacaciones' }
    }, 'Empresa', {}, 'hseq');

    PRUEBAS.falso(/jor_vacio|Todavía no hay jornadas/.test(renderJornada()),
      '⚠️ con `duty` en el payload, la pestaña Jornada NO puede mostrar su estado vacío');
    PRUEBAS.cierto(ausenteHoy({ nombre:'Ana Suárez' }),
      '⚠️ y la ausencia que vino del servidor tiene que reconocerse');
    PRUEBAS.falso(ausenteHoy({ nombre:'Otra Persona' }), 'y sólo esa (discriminador)');
  } finally { DASH = prev; }
});
