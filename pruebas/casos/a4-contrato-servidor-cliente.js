
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
  zonaOp:    'P090 · se guarda como DASH.zonaOp (onDashData) y lo lee zonaOperacion(); antes sólo lo consumía zonaOpGuardar() en el canal de tareas (L1)',
  combinada: 'se guarda como DASH.combinada (P075: lo leen cicloPuedeEditarPlan y la bandeja del médico)'
};

/* ⚠️ UN SOLO ESCÁNER PARA TODO, y por qué. Antes había tres pasadas que contaban llaves con
   criterios distintos: la que busca dónde cierra el objeto, una regex que borraba comentarios, y la
   que extrae las claves. Cada una se podía romper por su lado, y se rompieron las tres:
   · un `}` dentro de un string cerraba el objeto antes de tiempo y el lector seguía leyendo la
     función siguiente — así `ultimoEvento`, que vive en `bitacoraServidor`, apareció como campo de
     la respuesta del panel (hallazgo #8 de A8);
   · la regex de comentarios se come el resto de la línea al ver el `//` de una URL (`"https://x"`),
     y lo que sigue desaparece en silencio;
   · una expresión regular con una comilla adentro (`/"/g`) abría un string que no cerraba nunca.
   Este recorrido entiende las cuatro cosas —string, plantilla, comentario y literal de expresión
   regular— y devuelve el texto ya limpio, para que las dos pasadas de arriba y de abajo trabajen
   sobre lo mismo. Cada uno de esos tres huecos tiene su caso al final del archivo: hoy el `.gs` no
   los dispara, así que se prueban con fragmentos inventados. Esperar a que el `.gs` los vuelva a
   disparar es esperar a que el instrumento mienta sin que nadie lo note. */
function a4Escanear(txt, desde, alCerrarNivel0){
  let nivel = 0, k = desde, limpio = '';
  const ultimoSignificativo = () => { for (let i = limpio.length - 1; i >= 0; i--){
    const c = limpio[i]; if (c !== ' ' && c !== '\n' && c !== '\t') return c; } return ''; };
  while (k < txt.length){
    const c = txt[k], sig = txt[k+1];
    if (c === '/' && sig === '*'){ const f = txt.indexOf('*/', k + 2); k = f < 0 ? txt.length : f + 2; limpio += ' '; continue; }
    if (c === '/' && sig === '/'){ const f = txt.indexOf('\n', k); k = f < 0 ? txt.length : f + 1; limpio += ' '; continue; }
    if (c === '"' || c === "'" || c === '`'){
      const q = c; k++;
      while (k < txt.length && txt[k] !== q){ if (txt[k] === '\\') k++; k++; }
      k++; limpio += ' '; continue;      // el literal cuenta como separador, nunca como nombre
    }
    /* Una `/` empieza una expresión regular cuando lo anterior no puede terminar un valor. Es la
       heurística estándar y alcanza para este archivo; una división siempre viene después de un
       nombre, un número o un paréntesis que cierra. */
    if (c === '/' && '([,=:!&|?{};+-*%<>~^'.indexOf(ultimoSignificativo()) >= 0){
      k++;
      while (k < txt.length && txt[k] !== '/'){ if (txt[k] === '\\') k++; if (txt[k] === '[') { while (k < txt.length && txt[k] !== ']'){ if (txt[k] === '\\') k++; k++; } } k++; }
      k++;
      while (k < txt.length && /[a-z]/.test(txt[k])) k++;   // las banderas: g, i, m…
      limpio += ' '; continue;
    }
    if (c === '{') nivel++;
    else if (c === '}'){ nivel--; if (nivel === 0 && alCerrarNivel0) return { fin: k, limpio }; }
    limpio += c;
    k++;
  }
  return { fin: -1, limpio };
}

function a4ClavesDelGs(fuente){
  /* El bloque de la rama REAL de `accionSupervisor` — la que usa una empresa con contraseña. Se
     ancla en un texto que aparece UNA sola vez: la rama de demo dice `sesionToken, demo:true,`. */
  const i = fuente.indexOf('sesionToken, referencia:REFERENCIA');
  if (i < 0) return null;
  const ini = fuente.lastIndexOf('json({', i);
  if (ini < 0) return null;
  const r = a4Escanear(fuente, ini + 5, true);
  if (r.fin < 0) return null;
  /* `limpio` arranca en `ini + 5`, o sea incluye el `{` de apertura: se saltea. */
  const cuerpo = r.limpio.slice(1);

  // claves de PRIMER nivel: las que quedan a profundidad 0 de llaves, corchetes y paréntesis
  const claves = []; let d = 0, tomar = true, tok = '';
  for (let kc = 0; kc < cuerpo.length; kc++){
    const c = cuerpo[kc];
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

/* El mismo lector, expuesto para que un caso lo pueda correr sobre un fragmento inventado. Sin
   esto sólo se puede probar contra el `.gs` de hoy — que es justo el que NO tiene el problema. */
function a4ClavesDeFragmento(fragmento){
  return a4ClavesDelGs('function x(){ return json({ ok:true, sesionToken, referencia:REFERENCIA, ' +
                       fragmento + ' }); }');
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
  /* P183 · antes leía el bloque de `dashRefresh` en la fuente. Ahora se REFRESCA de verdad con el
     servidor espiado devolviendo `duty` y `ausencias`, y se mira que queden en `DASH`. Restaura en
     el `.finally()` de la promesa (R18). */
  const oReq = window.dashRequest, prevDash = DASH;
  onDashData({ ok: true, rol: 'supervisor', vista: 'medico', referencia: {}, metricas: [], registros: [], comentarios: [], pvt: [], aptitud: [], config: {}, marca: null, ausencias: {}, duty: null, turnos: [], operacional: [] },
    'Helitec', { action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'x', dispositivoId: 'a4' }, 'medico');
  const mio = DASH;
  const dutyNuevo = { diario: [{ persona: 'Ana', fecha: '2026-09-15', jornadaMin: 700, excesoMin: 0, tramos: [] }], resumen: [] };
  const ausNuevas = { ['12345678|' + todayStr()]: 'franco' };
  window.dashRequest = () => Promise.resolve({ ok: true, rol: 'supervisor', vista: 'medico', referencia: { kss: 6 }, metricas: [], registros: [{ persona: 'Ana', empresa: 'Helitec', fecha: '2026-09-15', kss: 3 }], comentarios: [], pvt: [], aptitud: [], config: {}, marca: null, duty: dutyNuevo, ausencias: ausNuevas, turnos: [], operacional: [] });
  return dashRefresh(false).then(() => {
    PRUEBAS.cierto(DASH === mio, 'guarda: el refresco aplicó sobre el mismo panel');
    PRUEBAS.cierto(!!DASH.duty && DASH.duty.diario && DASH.duty.diario.length === 1, '⚠️ el refresco trae `duty`, o la pestaña Jornada se vacía sola al actualizar');
    PRUEBAS.igual(DASH.ausencias, ausNuevas, '⚠️ y `ausencias`, o una ausencia recién marcada desaparece en el siguiente refresco');
  }).finally(() => { window.dashRequest = oReq; DASH = prevDash; });
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

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P202 · EL LECTOR DE CONTRATO TIENE QUE SOBREVIVIR A UN STRING TRAICIONERO

   Hallazgo #8 de A8: el lector marcaba `ultimoEvento` —que vive dentro de `bitacoraServidor`, en
   otra función— como campo de la respuesta del panel. La causa es que contaba llaves, corchetes y
   paréntesis SIN mirar si estaban dentro de comillas. Un paréntesis desbalanceado adentro de un
   string descuadra la profundidad, y a partir de ahí el lector o se come claves (descuadre
   positivo: las que vienen después no se verifican NUNCA) o se lleva claves de la función de al
   lado (descuadre negativo).

   Hoy el `.gs` tiene exactamente uno de esos strings —`" || norm(empAus) === norm("`— pero cae
   dentro de una función anidada y no altera el resultado. O sea: **el defecto está latente**. Estos
   casos lo prueban con fragmentos inventados, que es la única forma de vigilar algo que hoy no se
   manifiesta: esperar a que el `.gs` vuelva a poner un string así a nivel cero es esperar a que el
   instrumento vuelva a mentir sin que nadie lo note.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P202 · un paréntesis dentro de un string no se come las claves que vienen después', () => {
  /* El string trae DOS `(` y UN `)`: con el conteo ingenuo la profundidad queda en +1 y todo lo de
     abajo desaparece. Es la forma exacta que tiene hoy el `.gs`. */
  const claves = a4ClavesDeFragmento(
    'antes:1, raro: (x === " || norm(empAus) === norm(" ? 1 : 2), despues:2, ultima:3');
  PRUEBAS.cierto(!!claves, 'guarda: el lector encontró el bloque del fragmento');
  ['antes', 'raro', 'despues', 'ultima'].forEach(k =>
    PRUEBAS.cierto((claves || []).indexOf(k) >= 0,
      '🔴 `' + k + '` tiene que estar · leyó: ' + (claves || []).join(', ')));
});

PRUEBAS.caso('🔴 P202 · una llave dentro de un string no se lleva claves de la función de al lado', () => {
  /* El caso inverso, que es cómo apareció `ultimoEvento`: el string cierra una llave de más, el
     lector cree que el objeto terminó antes y sigue leyendo lo que hay después. */
  const claves = a4ClavesDeFragmento('uno:1, texto:"}", dos:2') || [];
  PRUEBAS.cierto(claves.indexOf('dos') >= 0,
    '🔴 `dos` viene después de un string con `}` y tiene que leerse · leyó: ' + claves.join(', '));
  PRUEBAS.igual(claves.filter(k => k === 'texto').length, 1, 'y `texto` se lee una sola vez');
});

PRUEBAS.caso('⚠️ P202 · DISCRIMINADOR · el lector NO inventa claves de adentro de objetos anidados', () => {
  /* Si el lector dejara de distinguir la profundidad, este caso se pondría en rojo: `adentro` y
     `hondo` son claves de segundo y tercer nivel, y el contrato es sólo el primero. Sin esta
     comprobación, «saltar los strings» podría arreglarse de una forma que rompa lo otro. */
  const claves = a4ClavesDeFragmento('nivel1: { adentro: 1, mas: { hondo: 2 } }, otra: 3') || [];
  PRUEBAS.cierto(claves.indexOf('nivel1') >= 0 && claves.indexOf('otra') >= 0,
    '⚠️ las de primer nivel sí · leyó: ' + claves.join(', '));
  PRUEBAS.igual(claves.filter(k => k === 'adentro' || k === 'hondo'), [],
    '⚠️ y ninguna de adentro · si aparecieran, el contrato exigiría destinos para campos que no existen');
});

PRUEBAS.caso('🔴 P202 · una expresión regular con comilla adentro no deja al lector en `null`', () => {
  /* Regresión que introdujo el primer arreglo y cazó el verificador: al saltar strings sin entender
     literales de expresión regular, la `"` de adentro de `/"/g` abría un string que no cerraba
     nunca y la profundidad no volvía a cero. Fallaba ruidosa —el caso guarda se ponía en rojo— pero
     con el mensaje equivocado: «no se encontró la respuesta del panel», que manda a buscar un
     bloque renombrado. */
  const claves = a4ClavesDeFragmento('antes:1, raro: String(v).replace(/"/g, ""), despues:2');
  PRUEBAS.cierto(!!claves, '🔴 el lector no devuelve `null` · una regex no es un string sin cerrar');
  ['antes', 'raro', 'despues'].forEach(k =>
    PRUEBAS.cierto((claves || []).indexOf(k) >= 0,
      '🔴 `' + k + '` tiene que estar · leyó: ' + (claves || []).join(', ')));
});

PRUEBAS.caso('🔴 P202 · una URL dentro de un string no se come el resto de la línea', () => {
  /* Hueco PRE-EXISTENTE, no regresión: el despojo de comentarios era una regex que corría antes del
     recorrido, así que el `//` de `"https://x"` se llevaba lo que venía después. Es silencioso —las
     claves perdidas simplemente no se verifican— y es exactamente la familia de defecto que P202
     dice cerrar. Hoy las últimas dos claves del contrato son `operacionalPeriodo` y `zonaOp`: eran
     las que estaban en la zona de riesgo. */
  const claves = a4ClavesDeFragmento('antes:1, url:"https://x.com/a", despues:2') || [];
  PRUEBAS.cierto(claves.indexOf('despues') >= 0,
    '🔴 `despues` viene después de una URL con `//` y tiene que leerse · leyó: ' + claves.join(', '));
});

PRUEBAS.caso('⚠️ P202 · GUARDA · el lector sigue devolviendo el contrato completo del .gs real', () => {
  /* Todos los casos de arriba corren sobre fragmentos inventados. Éste es el que ata el arreglo al
     archivo de verdad: si endurecer el escáner hubiera hecho perder una clave real, acá se ve. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const claves = a4ClavesDelGs(CTX.gs) || [];
  PRUEBAS.alMenos(claves.length, 28,
    '⚠️ el contrato tiene al menos las 28 claves que tenía antes del cambio · leyó ' + claves.length);
  ['registros','pvt','duty','ausencias','turnos','operacionalPeriodo','zonaOp'].forEach(k =>
    PRUEBAS.cierto(claves.indexOf(k) >= 0,
      '⚠️ `' + k + '` sigue estando · las dos últimas son las que el hueco de la URL se comía'));
});
