/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P227a · LA TARJETA POR OPERACIÓN                                       (2026-10-07)

   Lo que Rafael pidió, textual: «los de Cardón 4 deberían tener **un indicador** para yo saber
   **en qué estatus tengo a Cardón 4**». Una tarjeta por operación con su semáforo agregado —el peor
   estado de su gente— y la lista de su gente adentro.

   ⚠️ POR QUÉ NO SE PUEDE ARMAR CON EL PUENTE DE P224. Medido en producción el 2026-10-07: las 7
   personas migradas siguen con `Cargo = "Op. Cardon"` —la migración no toca el cargo, ADR 013— y la
   operación en su hoja se llama **`Cardón IV`**. Son dos nombres para lo mismo: agrupar por el
   puente mostraría el viejo.

   ⚠️ Y POR QUÉ VIAJA EN EL PAYLOAD DEL PANEL Y NO EN UN PEDIDO APARTE. `opPayloadPara_` es la única
   función que decide `gente = esHseq ? [] : lista`, que es la promesa escrita en la lámina: Dirección
   recibe el agregado y no los nombres. Un segundo pedido habría sido un segundo lugar donde esa
   promesa se deriva, y en este repo **se rompió tres veces por exactamente eso**.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P227a-1 · las operaciones llegan en el payload del panel, con su gente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ Entra por `accionSupervisor`, que es el camino real del panel — no por `accionOperaciones`,
     que es el que P226 ya tenía probado. Lo que se mide es que el campo **llegue** y con qué forma:
     R17 por sexta vez en este repo fue un campo que el servidor mandaba y `onDashData` descartaba. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const sup = (typeof p233Sup === 'function') ? p233Sup() : P226_SUP;
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  api.accionOperacionAsignar(p226Con(sup, { operacion: 'Cardón IV', persona: 'Ana Suárez' }));

  const r = JSON.parse(api.accionSupervisor(p226Con(sup, {})).getContent());
  PRUEBAS.igual(r.ok, true, 'el panel responde · ' + JSON.stringify(r.error || ''));
  PRUEBAS.cierto(Array.isArray(r.operaciones),
    '⚠️ el payload trae `operaciones` · ' + JSON.stringify(Object.keys(r).filter(k => /oper/i.test(k))));
  PRUEBAS.igual(r.operacionesError, null,
    '⚠️ y sin error · ' + JSON.stringify(r.operacionesError));
  const op = (r.operaciones || []).filter(o => o && o.nombre === 'Cardón IV')[0];
  PRUEBAS.cierto(!!op, '⚠️ con la operación que se creó · ' +
    JSON.stringify((r.operaciones || []).map(o => o && o.nombre)));
  if (op) {
    PRUEBAS.igual(op.genteN, 1, '⚠️ y su conteo de gente');
    PRUEBAS.igual((op.gente || []).map(g => g.persona), ['Ana Suárez'],
      '⚠️ y los nombres, que el supervisor SÍ puede ver');
  }
});

PRUEBAS.caso('🔒 P227a-2 · Dirección recibe el conteo pero NO los nombres, por el payload del panel', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ LA PROMESA DE LA LÁMINA, POR LA PUERTA NUEVA. P226 ya la defendía en `accionOperaciones`;
     este caso la defiende en el payload del panel, que es la segunda puerta que P227a abre. Sin
     esto, el recorte estaría probado en un camino y no en el otro — que es exactamente cómo se
     rompió tres veces: `accionBitacora` le daba a Dirección los nombres contra la promesa escrita,
     y el candado estaba en la acción de al lado.
     El derecho lo concede `opPayloadPara_` con `o.gente = esHseq ? [] : lista`. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const sup = (typeof p233Sup === 'function') ? p233Sup() : P226_SUP;
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  api.accionOperacionAsignar(p226Con(sup, { operacion: 'Cardón IV', persona: 'Ana Suárez' }));

  /* la cuenta de Dirección del fixture: misma fila, clave HSEQ */
  const fila = (p226Hojas()['Accesos'] || [])[1] || [];
  const dir = { usuario: String(fila[0] || ''), pass: String(fila[5] || ''),
                empresa: String(fila[3] || '').split(',')[0].trim(), dispositivoId: 'p227a' };
  const r = JSON.parse(api.accionSupervisor(p226Con(dir, {})).getContent());
  PRUEBAS.igual(r.ok, true, 'Dirección entra · ' + JSON.stringify(r.error || ''));
  PRUEBAS.igual(r.vista, 'hseq', 'y es la vista de Dirección · ' + JSON.stringify(r.vista));
  const op = (r.operaciones || []).filter(o => o && o.nombre === 'Cardón IV')[0];
  PRUEBAS.cierto(!!op, 'recibe la operación');
  if (op) {
    PRUEBAS.igual(op.genteN, 1, '⚠️ CON el conteo: es un agregado y no identifica a nadie');
    PRUEBAS.igual(op.gente, [], '🔒 y SIN los nombres · ' + JSON.stringify(op.gente));
  }
  /* ⚠️ Y el discriminador que a P226 le faltó: que el nombre no viaje en NINGUNA clave del payload
     de operaciones, no sólo en `gente`. La fuga de la ronda 1 fue `creadaPor` una clave al lado. */
  const crudo = JSON.stringify(r.operaciones || []);
  PRUEBAS.cierto(crudo.indexOf('Ana Suárez') < 0 && crudo.indexOf('Suárez') < 0,
    '🔒 el nombre no aparece en NINGUNA clave del payload de operaciones');
});

PRUEBAS.caso('🔒 P227a-3 · el alcance lo decide la CUENTA, no el pedido', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ EL HUECO QUE ENCONTRÓ EL DISCRIMINADOR. Cambiar `ausScope(acc, alias, p.empresa)` por
     «la empresa que venga en el pedido» dejaba la suite ENTERA en verde — o sea nada defendía que un
     supervisor de una empresa no pueda pedir las operaciones de otra. Es la misma clase de fuga que
     P214 cerró en el visor: un parámetro del cliente decidiendo el alcance.
     El derecho lo concede `ausScope`, que para una cuenta de empresa devuelve SU canónica y descarta
     lo que pida el pedido. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const acc = p226Hojas()['Accesos'] || [];
  const supA = { usuario: String((acc[1] || [])[0] || ''), pass: String((acc[1] || [])[1] || ''),
                 dispositivoId: 'p227a-A' };                        // Consorcio HELITEC
  const supB = { usuario: String((acc[2] || [])[0] || ''), pass: String((acc[2] || [])[1] || ''),
                 dispositivoId: 'p227a-B' };                        // Cardón
  /* B crea una operación en SU empresa */
  api.accionOperacionGuardar(p226Con(supB, { operacion: 'Planta Norte', tipo: 'instalacion' }));
  api.accionOperacionAsignar(p226Con(supB, { operacion: 'Planta Norte', persona: 'Pedro Salas' }));
  /* y A pide el panel diciendo que es de la empresa de B */
  const r = JSON.parse(api.accionSupervisor(p226Con(supA, { empresa: 'Cardón' })).getContent());
  const nombres = (r.operaciones || []).map(o => o && o.nombre);
  PRUEBAS.cierto(nombres.indexOf('Planta Norte') < 0,
    '🔒 A NO recibe la operación de B aunque la pida por parámetro · ' + JSON.stringify(nombres));
  const crudo = JSON.stringify(r.operaciones || []);
  PRUEBAS.cierto(crudo.indexOf('Pedro Salas') < 0,
    '🔒 ni el nombre de su gente, en ninguna clave');
  /* ⚠️ Discriminador: B sí la recibe, o este caso pasaría simplemente porque nadie recibe nada. */
  const rb = JSON.parse(api.accionSupervisor(p226Con(supB, {})).getContent());
  PRUEBAS.cierto((rb.operaciones || []).map(o => o && o.nombre).indexOf('Planta Norte') >= 0,
    '⚠️ discriminador: B sí recibe la suya · ' +
    JSON.stringify((rb.operaciones || []).map(o => o && o.nombre)));
});

PRUEBAS.caso('🔴 P227a-4 · sin empresa concreta el payload DICE por qué, no manda una lista vacía', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ EL OTRO HUECO DEL DISCRIMINADOR: hacer que un fallo mandara `operaciones: []` sin error
     también dejaba todo en verde. Y una lista vacía SE LEE COMO UN DATO —«esta empresa no tiene
     operaciones»— cuando en realidad significa «no te la puedo dar». Este repo ya pagó esa confusión
     dos veces, con `nominaError` y con `asignacionesError`: el 2026-10-04 una lista recortada le
     afirmó a Dirección que toda la nómina estaba medida.
     El caso usa el camino real por el que eso pasa: el administrador en «Todas las empresas», que no
     tiene una empresa concreta sobre la que listar operaciones. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const acc = p226Hojas()['Accesos'] || [];
  const sup = { usuario: String((acc[1] || [])[0] || ''), pass: String((acc[1] || [])[1] || ''),
                dispositivoId: 'p227a-sup' };
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  /* el admin del fixture, sin elegir empresa */
  const adm = { usuario: String((acc[3] || [])[0] || ''), pass: String((acc[3] || [])[1] || ''),
                empresa: '*', dispositivoId: 'p227a-adm' };
  const r = JSON.parse(api.accionSupervisor(p226Con(adm, { empresa: '*' })).getContent());
  PRUEBAS.igual(r.ok, true, 'el admin entra · ' + JSON.stringify(r.error || ''));
  PRUEBAS.igual(r.operaciones, [], 'y no recibe operaciones, que es correcto sin empresa concreta');
  PRUEBAS.igual(r.operacionesError, 'sin_empresa',
    '⚠️ pero el payload DICE por qué: una lista vacía sin razón se lee como «no hay ninguna» · ' +
    JSON.stringify(r.operacionesError));
  /* ⚠️ Discriminador: con una empresa concreta, el mismo admin sí las recibe y sin error. */
  const r2 = JSON.parse(api.accionSupervisor(p226Con(adm, { empresa: 'Consorcio HELITEC' })).getContent());
  PRUEBAS.igual(r2.operacionesError, null,
    '⚠️ discriminador: con empresa concreta no hay error · ' + JSON.stringify(r2.operacionesError));
  PRUEBAS.cierto((r2.operaciones || []).length > 0,
    '⚠️ y sí hay operaciones · ' + JSON.stringify((r2.operaciones || []).map(o => o && o.nombre)));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL CLIENTE · estos necesitan la app cargada, así que en `correr-node.js` se declaran sin medir
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
function p227aHayApp() {
  return typeof onDashData === 'function' && typeof opAgruparGente === 'function' &&
         typeof aptOperacionDe === 'function' && typeof APT_ESTADOS === 'object';
}

PRUEBAS.caso('🔴 P227a-5 · el campo `operaciones` SOBREVIVE de `onDashData` hasta `DASH`', () => {
  if (!p227aHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: SIN MEDIR'); return; }
  /* ⚠️ R17 POR SÉPTIMA VEZ. `dashCamposDelServidor` es una lista EXPLÍCITA: un campo que el servidor
     manda y nadie nombra ahí se descarta en silencio. Ya pasó con `duty`, con `ausencias`, con `demo`
     y con `operacion` —esa última dejó una rama MUERTA tres líneas debajo del comentario que lo
     avisa—. Así que esto no se mide armando `DASH` a mano: se entra por `onDashData`, que es el
     llamador real. */
  const prev = DASH, prevLS = Object.assign({}, localStorage);
  try {
    onDashData({ ok:true, rol:'supervisor', vista:'supervisor', referencia:{kss:5}, metricas:['kss'],
      registros:[{ persona:'Ana Suárez', empresa:'E', departamento:'Operaciones', cargo:'Piloto',
                   fecha:new Date().toISOString().slice(0,10), kss:3 }],
      aptitud:[], operacional:[], comentarios:[], pvt:[], turnos:[], marca:null, config:{},
      operaciones:[{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1,
                     gente:[{ persona:'Ana Suárez' }] }],
      operacionesError:null },
      'E', { action:'supervisor', usuario:'u', empresa:'E', pass:'x', dispositivoId:'p227a' }, 'supervisor');
    PRUEBAS.cierto(Array.isArray(DASH.operaciones),
      '⚠️ `DASH.operaciones` existe · ' + typeof (DASH && DASH.operaciones));
    PRUEBAS.igual((DASH.operaciones || []).map(o => o.nombre), ['Cardón IV'],
      '⚠️ con la operación que mandó el servidor');
    PRUEBAS.igual(DASH.operacionesError, null, 'y su error, que también es una clave de la lista');
    /* ⚠️ Y el uso: el nombre que la pantalla muestra sale de la ENTIDAD, no del puente de P224. */
    PRUEBAS.igual(aptOperacionDe({ nombre:'Ana Suárez', cargo:'Op. Cardon', dep:'Operaciones' }),
      'Cardón IV',
      '⚠️ la entidad manda sobre el puente: en producción el cargo dice «Op. Cardon» y la ' +
      'operación «Cardón IV», y sin esto la pantalla diría los dos');
  } finally {
    DASH = prev;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔴 P227a-6 · el semáforo de la operación es el PEOR de su gente', () => {
  if (!p227aHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: SIN MEDIR'); return; }
  /* ⚠️ SEGUNDA VERSIÓN, y la primera tenía escrito el defecto como si fuera la virtud. Decía: «se
     reusa `APT_ESTADOS[...].orden` —menor es peor— en vez de reescribir el criterio», y reusar esa
     escala era el error: es una escala de ORDEN DE LISTA, donde `sindato` es 6 y `ok` es 5, así que
     el agregado tapaba a quien nunca se midió. Lo midió el verificador el 2026-10-07: dos personas
     `ok` más una `sindato` daban chip VERDE.
     Y este caso no lo vio porque sus dos combinaciones **siempre incluían un estado peor que `ok`**:
     con `pendiente` o `noapto` en el grupo, las dos escalas dan el mismo resultado. El par que
     discrimina es exactamente el que faltaba: `ok` + `sindato`.
     El derecho lo concede `opAgruparGente`, que compara `OP_SEVERIDAD` —una escala propia— y guarda
     el menor. */
  const prev = DASH;
  try {
    DASH = { operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:3,
                             gente:[{persona:'A'},{persona:'B'},{persona:'C'}] }] };
    const filas = opAgruparGente([
      { nombre:'A', estado:'ok' }, { nombre:'B', estado:'pendiente' }, { nombre:'C', estado:'sindato' }]);
    PRUEBAS.igual(filas.length, 1, 'una tarjeta por operación');
    PRUEBAS.igual(filas[0].peorEstado, 'pendiente',
      '⚠️ el peor de ok/pendiente/sindato es `pendiente` · ' + JSON.stringify(filas[0].peorEstado));
    PRUEBAS.igual(filas[0].personas.length, 3, 'y su gente queda adentro');
    /* ⚠️ Discriminador: con `noapto`(0) en el grupo, el peor cambia — si no, el aserto de arriba
       pasaría con cualquier criterio que eligiera «el primero» o «el último». */
    const filas2 = opAgruparGente([
      { nombre:'A', estado:'ok' }, { nombre:'B', estado:'pendiente' }, { nombre:'C', estado:'noapto' }]);
    PRUEBAS.igual(filas2[0].peorEstado, 'noapto',
      '⚠️ discriminador: `noapto` es peor que `pendiente` y el agregado lo refleja');
    /* ⚠️ Y una operación que el servidor manda SIN gente medida aparece igual: «no aparece» se lee
       como «no existe», y la operación recién montada es justo la que más importa. */
    DASH = { operaciones: [{ nombre:'Ev Nuevo', tipo:'evento', estado:'activo', genteN:0, gente:[] }] };
    const vacia = opAgruparGente([]);
    PRUEBAS.igual(vacia.length, 1, '⚠️ una operación sin gente medida igual tiene su tarjeta');
    PRUEBAS.igual(vacia[0].peorEstado, null, 'y sin semáforo inventado');
    PRUEBAS.igual(vacia[0].motivo, 'sin_gente',
      'y marcada como «nadie asignado», que es lo que pide acción acá · no «sin medir»');

    /* ⚠️ EL CASO QUE EL VERIFICADOR TUVO QUE ENCONTRAR, y el único par que separa una escala de
       severidad de la de orden de lista: sin nadie peor que `ok` en el grupo, `APT_ESTADOS.orden`
       elegía `ok`(5) sobre `sindato`(6) y la tarjeta salía VERDE con un tercio de la gente sin
       medir. Es lo contrario de R6 y de lo que Rafael pidió. */
    DASH = { operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:3,
                             gente:[{persona:'A'},{persona:'B'},{persona:'C'}] }] };
    const mix = opAgruparGente([
      { nombre:'A', estado:'ok' }, { nombre:'B', estado:'ok' }, { nombre:'C', estado:'sindato' }]);
    PRUEBAS.igual(mix[0].peorEstado, 'sindato',
      '🔴 dos en condiciones y uno SIN MEDIR no es «en condiciones»: falta el dato y alguien tiene que ir a medir');
    /* Y el otro lado de la escala, para que `sindato` no se vuelva el peor de todos: una alarma
       clínica sigue pesando más que una ausencia de dato. */
    const mix2 = opAgruparGente([
      { nombre:'A', estado:'sindato' }, { nombre:'B', estado:'seguimiento' }, { nombre:'C', estado:'sindato' }]);
    PRUEBAS.igual(mix2[0].peorEstado, 'seguimiento',
      '⚠️ pero `sindato` NO es el peor de todos: un hallazgo real pesa más que un dato que falta');
  } finally { DASH = prev; }
});

PRUEBAS.caso('🔴 P227a-7 · con gente asignada y ninguna medición el chip dice SIN MEDIR', () => {
  if (!p227aHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: SIN MEDIR'); return; }
  /* ⚠️ REESCRITO, y la primera versión violaba R19: afirmaba un derecho que no existe. Decía que
     este payload —`genteN > 0` con `gente: []`— era «el caso de Dirección», y que por eso el chip
     tenía que decir «Sin detalle». Medido por el verificador el 2026-10-07: **Dirección no llega a
     esta pantalla.** `dashTabsFor` le da la pestaña `aptitud` sólo a `vista === 'supervisor'`, y
     `renderOperaciones` se llama desde un único lugar, bajo `tb === 'aptitud'`. Así que el caso
     bendecía una suposición mía y después la defendía: el chip le decía «Sin detalle» al único rol
     que SÍ tiene el detalle.

     Este payload sí le pasa al supervisor, y por la vía más común de todas: alguien asignado que
     todavía no se midió, porque `aptGente` se arma de los REGISTROS (`rows.filter(r => r.persona)`).
     Lo que corresponde decir entonces es «Sin medir», que es exactamente el caso que el encabezado
     de este módulo declara el más importante.
     El derecho lo concede `opAgruparGente`: `personas.length === 0 && genteN > 0` → `motivo`
     `'sin_medir'`, y `renderOperaciones` lo traduce con `ope_sin_medir`. */
  const prev = DASH;
  try {
    DASH = { operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo',
                             genteN:7, genteHistN:7, gente:[] }] };
    const filas = opAgruparGente([]);
    PRUEBAS.igual(filas.length, 1, 'recibe la tarjeta · «no aparece» se leería como «no existe»');
    PRUEBAS.igual(filas[0].genteN, 7, '⚠️ con el conteo, que es un agregado y sí viaja');
    PRUEBAS.igual(filas[0].peorEstado, null, '🔒 y sin semáforo: no se puede saber, no se inventa');
    PRUEBAS.igual(filas[0].motivo, 'sin_medir',
      '🔴 hay 7 asignados y ninguna medición: eso es «sin medir», no «sin detalle»');

    /* ⚠️ EL DISCRIMINADOR · una operación VACÍA tiene que verse distinto, o los dos estados
       colapsan y la tarjeta no dice nada útil en ninguno de los dos. */
    DASH = { operaciones: [{ nombre:'Ev Nuevo', tipo:'evento', estado:'activo', genteN:0, gente:[] }] };
    PRUEBAS.igual(opAgruparGente([])[0].motivo, 'sin_gente',
      'DISCRIMINADOR · sin nadie asignado el motivo es otro: «sin gente», que pide otra acción');

    /* Y el texto llega traducido en los dos idiomas (R1 · español neutro, R14 · todo por `t()`). */
    ['ope_sin_medir', 'ope_sin_gente'].forEach(k => {
      const v = t(k);
      PRUEBAS.cierto(!!v && v !== k, 'falta la traducción de ' + k);
    });
  } finally { DASH = prev; }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE ENCONTRÓ EL VERIFICADOR (2026-10-07), con la suite en 2270/2270 verde

   Seis defectos reales, tres reproducidos ejecutando. Ninguno lo vio la suite, y el bloqueante lo
   introduje YO al extraer `opPayloadPara_` de `accionOperaciones`: el `catch` quedó devolviendo un
   `TextOutput` desde una función cuyo contrato pasó a ser «un objeto de payload». Mover código de
   un lugar a otro cambió el tipo de retorno y nada lo dijo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Rompe una hoja del libro del emulador: `getDataRange` lanza, que es lo que pasa de verdad con una
   cuota agotada, un timeout de Sheets o un rango protegido.
   ⚠️ EL NOMBRE SE LEE DEL `.gs`, no se escribe acá. Mi primera versión decía `'Operaciones'` y la
   hoja se llama **`Operaciones Listadas`**: el sabotaje no saboteaba nada y el caso habría dado
   verde midiendo el camino feliz. Lo cazó la guarda `pudo` —un sabotaje que no saboteaba fue
   exactamente el error de P226— así que devuelve también si encontró la hoja, y el restaurador
   nunca es null para que el `finally` no tape el diagnóstico con otro error. */
function p227aRomperHoja(env, cual, mensaje) {
  const nombre = (typeof p226Hoja === 'function') ? p226Hoja(cual) : cual;
  const sh = env.__libro.getSheetByName(nombre);
  if (!sh) return { pudo: false, hoja: nombre, restaurar: function () {} };
  const previo = sh.getDataRange;
  sh.getDataRange = function () { throw new Error(mensaje); };
  return { pudo: true, hoja: nombre, restaurar: function () { sh.getDataRange = previo; } };
}

PRUEBAS.caso('🔴 P227a-9 · si no se pueden LEER las operaciones, viaja el error y no una lista vacía', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ EL BLOQUEANTE QUE INTRODUJE AL EXTRAER LA FUNCIÓN, y que ningún caso podía ver porque todos
     entran por el camino FELIZ. El `catch` de `opPayloadPara_` hacía `return json(...)`: correcto
     mientras era el retorno del endpoint, incorrecto desde que la función promete un objeto.
     · `accionSupervisor` hacía `(opPayloadPara_(…).operaciones) || []` = `undefined || []`, o sea
       `operaciones: []` con `operacionesError: null`. El supervisor veía el panel SIN tarjeta y sin
       un solo aviso, porque `renderOperaciones` devuelve '' cuando no hay filas.
     · `accionOperaciones` hacía `_op.ok = true` sobre el `TextOutput` y contestaba `ok:true`.
     El derecho lo concede el `catch` de `opPayloadPara_`, que ahora devuelve `operacionesError` en
     el payload, y cada llamador decide cómo contestarlo. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperaciones', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const sup = (typeof p233Sup === 'function') ? p233Sup() : P226_SUP;
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  api.accionOperacionAsignar(p226Con(sup, { operacion: 'Cardón IV', persona: 'Ana Suárez' }));

  /* guarda: con la hoja sana el camino feliz funciona, o el sabotaje de abajo no prueba nada */
  const sano = JSON.parse(api.accionSupervisor(p226Con(sup, {})).getContent());
  PRUEBAS.igual(sano.operacionesError, null, 'guarda: sin sabotaje no hay error');
  PRUEBAS.alMenos((sano.operaciones || []).length, 1, 'guarda: y sí hay operaciones');

  const rot = p227aRomperHoja(env, 'OPERACIONES', 'boom-operaciones');
  PRUEBAS.cierto(rot.pudo, 'guarda: la hoja de operaciones existe y se pudo sabotear · ' + rot.hoja);
  try {
    const r = JSON.parse(api.accionSupervisor(p226Con(sup, {})).getContent());
    PRUEBAS.cierto(!!r.operacionesError,
      '🔴 el panel DICE que no pudo leerlas · antes mandaba `operacionesError: null` con lista vacía, ' +
      'y el supervisor no veía ni la tarjeta ni el aviso · ' + JSON.stringify(r.operacionesError));
    PRUEBAS.cierto(/boom-operaciones/.test(String(r.operacionesError || '')),
      '⚠️ y el texto nombra la causa, no un genérico · ' + JSON.stringify(r.operacionesError));
    PRUEBAS.igual(r.ok, true, 'y el RESTO del panel sigue sirviendo: una hoja rota no tumba la carga');

    /* La otra puerta: la pantalla de administración distingue «no hay» de «no pude leer». */
    const ro = JSON.parse(api.accionOperaciones(p226Con(sup, {})).getContent());
    PRUEBAS.igual(ro.ok, false,
      '🔴 `accionOperaciones` contesta ok:false · antes decía ok:true sin operaciones, porque ' +
      '`_op.ok = true` se asignaba sobre un TextOutput · ' + JSON.stringify(ro).slice(0, 120));
  } finally { rot.restaurar(); }
});

PRUEBAS.caso('🔴 P227a-10 · una hoja de Asignaciones rota NO se lee como «0 personas»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ EL PEOR DE LOS SEIS, porque no se parece a una falla. `opPayloadPara_` tiene su propio
     `catch` para las asignaciones y escribe `asignacionesError` —con un comentario que explica
     justamente por qué: «el único síntoma de que la hoja se rompió es una lista de operaciones SIN
     NADIE, y eso se lee como un dato»—. Pero `accionSupervisor` tomaba sólo `.operaciones` y tiraba
     ese campo, así que la tarjeta dibujaba «Cardón IV · Instalación · 0 personas · Sin medir»: una
     hoja rota presentada como un hecho. El camino viejo (`accionOperaciones`) sí lo informaba; el
     nuevo no. Escritor y lector derivando distinto, el bug más repetido de este repo.
     El derecho lo concede `accionSupervisor`, que funde `operacionesError` y `asignacionesError` en
     el campo que el cliente ya consume, y NO manda filas cuando hay error. */
  const env = GS.crearEntorno(p226Hojas());
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const sup = (typeof p233Sup === 'function') ? p233Sup() : P226_SUP;
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  api.accionOperacionAsignar(p226Con(sup, { operacion: 'Cardón IV', persona: 'Ana Suárez' }));

  const rot = p227aRomperHoja(env, 'ASIGNACIONES', 'boom-asignaciones');
  PRUEBAS.cierto(rot.pudo, 'guarda: la hoja de asignaciones existe y se pudo sabotear · ' + rot.hoja);
  try {
    const r = JSON.parse(api.accionSupervisor(p226Con(sup, {})).getContent());
    PRUEBAS.cierto(!!r.operacionesError,
      '🔴 el error de las ASIGNACIONES también viaja · antes se tiraba y la tarjeta decía ' +
      '«0 personas · Sin medir» · ' + JSON.stringify(r.operacionesError));
    PRUEBAS.cierto(/asignado|boom-asignaciones/i.test(String(r.operacionesError || '')),
      '⚠️ y el texto dice que lo que falta es QUIÉN está asignado · ' + JSON.stringify(r.operacionesError));
    PRUEBAS.igual(r.operaciones, [],
      '⚠️ y NO se mandan filas con conteos en cero: mejor un aviso que números falsos');
  } finally { rot.restaurar(); }
});

PRUEBAS.caso('🔴 P227a-11 · el nombre que viaja es el de la NÓMINA, que es con el que cruza el cliente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (typeof p226Api !== 'function') { PRUEBAS.cierto(false, '⚠️ sin el fixture de P226: SIN MEDIR'); return; }
  /* ⚠️ EL CRUCE QUE FALLABA EN SILENCIO, y la cadena tiene cuatro eslabones, cada uno correcto:
     · la migración de P226 sacó los nombres de `Registrados Fatiga`;
     · `opPersonaEnNomina_` los aceptó comparando por `opClavePersona` = `norm(...)`, o sea SIN
       tildes ni mayúsculas, así que una grafía distinta pasa la validación;
     · `Asignaciones.Persona` quedó entonces con la grafía de Registrados;
     · y el cliente compara contra `aptGente[].nombre`, que sale de `padron.porCedula[ced].nombre`
       —la grafía de la NÓMINA, porque `construirPadron` le da prioridad—.
     Resultado medido: la persona desaparece de la tarjeta, la operación queda en 0 y sin semáforo,
     y la tarjeta de la persona vuelve a decir «Op. Cardon» (el puente) mientras la de la operación
     dice «Cardón IV» — el defecto de los dos nombres que P227a vino a cerrar.
     Se arregla en el SERVIDOR porque el cliente no tiene `norm()` ni `limpiarPersona`, y copiarlas
     sería la segunda derivación del mismo concepto. El derecho lo concede `opPayloadPara_` con su
     mapa `nomPorClave`, armado de una sola lectura de la nómina. */
  const hojas = p226Hojas();
  /* La nómina dice «Ana Suárez»; lo que se va a asignar es «ANA SUAREZ», sin tilde y en mayúsculas.
     Los dos son la misma persona para `opClavePersona`, que es por eso que el alta no rebota. */
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env,
    ['accionSupervisor', 'accionOperacionGuardar', 'accionOperacionAsignar']);
  const sup = (typeof p233Sup === 'function') ? p233Sup() : P226_SUP;
  api.accionOperacionGuardar(p226Con(sup, { operacion: 'Cardón IV', tipo: 'instalacion' }));
  const alta = JSON.parse(api.accionOperacionAsignar(
    p226Con(sup, { operacion: 'Cardón IV', persona: 'ANA SUAREZ' })).getContent());
  PRUEBAS.igual(alta.ok, true,
    'guarda: el alta con otra grafía NO rebota · es justo lo que hace posible el defecto · ' +
    JSON.stringify(alta.motivo || alta.error || ''));

  const r = JSON.parse(api.accionSupervisor(p226Con(sup, {})).getContent());
  const op = (r.operaciones || []).filter(o => o && o.nombre === 'Cardón IV')[0];
  PRUEBAS.cierto(!!op, 'guarda: la operación está en el payload');
  if (op) {
    const nombres = (op.gente || []).map(g => g && g.persona);
    PRUEBAS.igual(nombres, ['Ana Suárez'],
      '🔴 viaja la grafía de la NÓMINA, no la que se escribió al asignar · antes viajaba ' +
      '«ANA SUAREZ» y el cruce exacto del cliente no la encontraba · ' + JSON.stringify(nombres));
    PRUEBAS.cierto((op.gente || []).every(g => g && g.clave),
      '⚠️ y cada persona trae su `clave`, la misma `opClavePersona` con que el servidor dedupa · ' +
      JSON.stringify((op.gente || []).map(g => g && g.clave)));
  }
});

PRUEBAS.caso('🔴 P227a-12 · una persona en DOS operaciones vigentes aparece en las dos', () => {
  if (!p227aHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: SIN MEDIR'); return; }
  /* ⚠️ El índice invertido hacía `idx[persona] = nombreDeOperacion`, un valor y no una lista, así
     que la segunda asignación PISABA la primera y cuál ganaba dependía del orden alfabético con que
     el servidor manda las operaciones. La tarjeta perdedora quedaba en `personas: 0`, sin semáforo
     y con el chip de «sin medir» — indistinguible de una operación donde nadie se midió.
     Dos asignaciones vigentes simultáneas son un estado LEGAL: la clave del upsert de
     `accionOperacionAsignar` es (empresa, operación, persona), o sea por operación.
     El derecho lo concede `aptOperacionIndice`, que acumula en un arreglo, y `opNombresDe`, que lo
     devuelve entero para que `opAgruparGente` meta a la persona en todas sus operaciones. */
  const prev = DASH;
  try {
    DASH = { operaciones: [
      { nombre:'Cardón IV',   tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] },
      { nombre:'Planta Norte', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] }] };
    const ana = { nombre:'Ana Suárez', estado:'pendiente' };
    const filas = opAgruparGente([ana]);
    PRUEBAS.igual(filas.length, 2, 'guarda: las dos tarjetas');
    const porNombre = {};
    filas.forEach(f => { porNombre[f.nombre] = f; });
    PRUEBAS.igual(porNombre['Cardón IV'].personas.length, 1,
      '🔴 Cardón IV la tiene · antes quedaba en 0 porque «Planta Norte» la pisaba por orden alfabético');
    PRUEBAS.igual(porNombre['Planta Norte'].personas.length, 1, 'y Planta Norte también');
    PRUEBAS.igual(porNombre['Cardón IV'].peorEstado, 'pendiente', 'con su semáforo, no sin él');
    PRUEBAS.igual(porNombre['Planta Norte'].peorEstado, 'pendiente', 'las dos');
    PRUEBAS.igual(porNombre['Cardón IV'].motivo, null, 'y ninguna marcada como «sin medir»');

    /* Y la tarjeta de la PERSONA nombra las dos, en orden estable: mostrar una sola sería elegir
       en silencio, y cuál se mostraba dependía del alfabeto. */
    PRUEBAS.igual(aptOperacionDe(ana), 'Cardón IV · Planta Norte',
      '⚠️ y la persona muestra las dos, ordenadas · ' + JSON.stringify(aptOperacionDe(ana)));

    /* DISCRIMINADOR · con UNA sola asignación sigue dando una sola, sin separador colgado. */
    DASH = { operaciones: [
      { nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] }] };
    PRUEBAS.igual(aptOperacionDe(ana), 'Cardón IV',
      'DISCRIMINADOR · con una sola no aparece el « · » ni se repite');
  } finally { DASH = prev; }
});

PRUEBAS.caso('🔴 P227a-8 · ninguna clave `op_`/`ope_` queda SIN USUARIOS (trinquete)', () => {
  /* ⚠️ POR QUÉ EXISTE, y es un defecto que la suite entera en verde no vio. Las 10 claves de esta
     tarjeta nacieron con prefijo `op_` y pisaron las del módulo «Data Operacional», que ya lo usaba
     (`op_titulo` = 'Data Operacional'). Al renombrarlas a `ope_`, el barrido se llevó también una
     referencia AJENA: `title:t('op_titulo')` del módulo operacional pasó a `t('ope_titulo')`, así
     que esa sección del panel quedó titulada **«Operaciones»** — visible, en producción, y con
     `op_titulo` definida y sin un solo usuario. Ningún caso miraba eso: hay contratos que exigen que
     toda clave USADA exista, y ninguno que exija que toda clave DEFINIDA tenga quien la use.

     ⚠️ NO ARREGLA LA DEUDA: hay 19 huérfanas anteriores a P227a (`op_anon_*`, `op_op_*`, …), que son
     de otro prompt. Pone un tope, igual que el trinquete de contraste de A3.

     ⚠️ ALCANCE DECLARADO: mide `op_` y `ope_`, no todos los prefijos del repo. Medido con el criterio
     general —cualquier propiedad con valor de cadena— el repo tiene 530 «huérfanas», casi todas
     propiedades normales que nada tienen que ver con i18n: un tope de 530 se movería con cualquier
     cambio y no sería accionable. Estos dos prefijos son donde el error ocurrió.

     El criterio de «usada» es aparecer entre comillas en cualquier parte del fuente, no sólo dentro
     de `t('…')`: **cubre los ternarios**, que es por donde se escapó el renombre la primera vez
     (seis claves quedaron en `op_` porque estaban en `t(cond ? 'op_a' : 'op_b')`). */
  /* ⚠️ GUARDA PARA EL ARNÉS DE NODE. Este caso necesita el FUENTE de `index.html`, y eso sólo se
     consigue por HTTP: en Node, `fetch('/index.html')` lanza «Failed to parse URL from …» porque no
     hay origen contra el que resolver una ruta relativa. Sin esta guarda el caso se cuenta como
     FALLA PROPIA del runner —lo medí— y una falla propia inventada cuesta una ronda de diagnóstico.
     El texto «SIN MEDIR» es el que `correr-node.js` reconoce para no contarla, igual que hacen los
     contratos que necesitan la app cargada. */
  if (typeof location === 'undefined' || !/^https?:/.test(String((location && location.href) || ''))) {
    PRUEBAS.cierto(false,
      '⚠️ este trinquete necesita el fuente de `index.html` por HTTP: queda SIN MEDIR fuera del navegador');
    return;
  }
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const huerfanas = (texto) => {
      const defs = new Set(), citadas = new Set();
      (texto.match(/^\s*(ope?_[a-z0-9_]+)\s*:\s*'/gm) || []).forEach(m => {
        const k = m.match(/ope?_[a-z0-9_]+/); if (k) defs.add(k[0]);
      });
      (texto.match(/'(ope?_[a-z0-9_]+)'/g) || []).forEach(m => {
        const k = m.match(/ope?_[a-z0-9_]+/); if (k) citadas.add(k[0]);
      });
      return [...defs].filter(k => !citadas.has(k)).sort();
    };
    const hoy = huerfanas(src);
    PRUEBAS.alMenos(hoy.length, 1, 'guarda: el barrido encuentra claves, o no está midiendo el fuente');
    PRUEBAS.comoMucho(hoy.length, 19,
      '🔴 una clave `op_`/`ope_` quedó definida y sin usuarios · casi siempre un renombre que se ' +
      'llevó la referencia de otro módulo · huérfanas: ' + hoy.join(', '));

    /* ⚠️ EL DISCRIMINADOR ES EL DEFECTO REAL, no uno inventado: se reintroduce exactamente el
       renombre que ocurrió y el conteo tiene que subir Y nombrar la clave. Sin esto, el caso daría
       verde igual si el barrido dejara de encontrar referencias. */
    const roto = src.replace("title:t('op_titulo')", "title:t('ope_titulo')");
    PRUEBAS.falso(roto === src, 'guarda: la referencia que se sabotea tiene que existir en el fuente');
    const conElBug = huerfanas(roto);
    PRUEBAS.igual(conElBug.length, hoy.length + 1,
      'DISCRIMINADOR · al pisar la referencia ajena el conteo TIENE que subir, o el caso no mide nada');
    PRUEBAS.cierto(conElBug.indexOf('op_titulo') >= 0 && hoy.indexOf('op_titulo') < 0,
      'DISCRIMINADOR · y tiene que nombrar `op_titulo`, que es la que el renombre dejó sin usuarios');
  });
});
