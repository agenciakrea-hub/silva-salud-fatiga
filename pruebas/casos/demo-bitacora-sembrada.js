PRUEBAS.grupo('Demo · la trazabilidad sembrada: el tiempo hacia adelante, el rol que corresponde, y Dirección sin nombres');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   TRES DEFECTOS EN LA MISMA FUNCIÓN, TODOS VISIBLES EN LA PANTALLA QUE SE LE MUESTRA A QUIEN FIRMA.

   1 · EL TIEMPO CORRÍA AL REVÉS. El tercer número del guion es el momento en la historia, pero se
       usaba como «hace N días», que va hacia atrás: la restricción de la persona 1 se ponía HOY y
       se levantaba HACE DOS DÍAS; el médico daba el alta seis días ANTES de firmar la
       determinación; el embudo de telemedicina se leía realizada → aceptada → sugerida. Con la
       fecha de cada línea a la vista.
   2 · LAS 26 ENTRADAS DECÍAN «Servicio médico», incluidas las seis restricciones de tarea, que son
       la decisión del SUPERVISOR y el ejemplo vivo de los dos «no apto» que no se pisan.
   3 · Y EL ROL SE PINTABA CRUDO: «(medico)», «(hseq)», sin tilde, en Trazabilidad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* El orden en que cada cosa TIENE que pasar. Dos acciones del mismo grupo con el mismo número no
   se comparan; lo que se exige es que ninguna con número menor ocurra después de una con mayor. */
const BIT_ORDEN = { restriccion_tarea:0, restriccion_levantada:1,
                    determinacion_medica:0, alta_reincorporacion:1,
                    telemedicina_sugerida:0, telemedicina_aceptada:1, telemedicina_rechazada:1,
                    telemedicina_realizada:2 };

// Desórdenes en una lista de eventos, agrupando por persona y ordenando por tiempo real.
function bitDesordenes(ev, signo){
  const por = {};
  ev.forEach(e => { (por[e.sujeto] = por[e.sujeto] || []).push([signo * e.ts, e.accion]); });
  const malos = [];
  Object.keys(por).forEach(k => {
    const l = por[k].slice().sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < l.length; i++){
      if (BIT_ORDEN[l[i][1]] < BIT_ORDEN[l[i-1][1]]) malos.push(k + ': ' + l[i-1][1] + ' → ' + l[i][1]);
    }
  });
  return malos;
}

/* ⚠️ Se entra por `onDashData` con `demo:true`, que es el camino REAL de la demostración
   (`action:'demo'` → `accionDemo` → `onDashData`). La siembra corre adentro; armar el almacén a
   mano probaría el lector y no que el escritor le da lo que pide (R17). */
function bitDemoPayload(){
  return { ok:true, rol:'supervisor', vista:'hseq', referencia:{}, metricas:['kss'], demo:true,
    registros: [ { persona:'Ana Suárez', cedula:'V-9001', departamento:'Operaciones', empresa:'Empresa Demo', kss:5 } ],
    comentarios: [], pvt: [], aptitud: [], turnos: [], ausencias: {}, duty: null,
    operacional: [], operacionalPeriodo: null, config: { sector:'aviacion' } };
}
function bitSembrados(){ return bitacoraDe().filter(e => String(e.id||'').indexOf('bdemo') === 0); }

PRUEBAS.caso('🔴 Demo · la historia corre hacia adelante: se restringe y DESPUÉS se levanta', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    onDashData(bitDemoPayload(), 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    const ev = bitSembrados();
    PRUEBAS.alMenos(ev.length, 20, 'guarda: la bitácora se sembró · con cero esto no probaría nada');
    PRUEBAS.igual(bitDesordenes(ev, 1), [],
      '🔴 ninguna secuencia al revés · levantar antes de restringir, o el alta antes de la determinación, se lee en la fecha de cada línea');
    /* DISCRIMINADOR · con el eje invertido —que es exactamente el defecto— esto tiene que
       encontrar desórdenes. Un cero sin discriminador no es un resultado. */
    PRUEBAS.alMenos(bitDesordenes(ev, -1).length, 5,
      '⚠️ DISCRIMINADOR · con el tiempo invertido la medición SÍ se pone en rojo');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Demo · restringir una tarea es del SUPERVISOR, no del servicio médico', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    onDashData(bitDemoPayload(), 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    const ev = bitSembrados();
    const rolDe = a => Array.from(new Set(ev.filter(e => e.accion === a).map(e => e.rol)));
    PRUEBAS.igual(rolDe('restriccion_tarea'), ['supervisor'],
      '🔴 la restricción operativa la firma el supervisor · atribuirla al médico enseña el modelo equivocado de los dos «no apto»');
    PRUEBAS.igual(rolDe('restriccion_levantada'), ['supervisor'], 'y levantarla también');
    PRUEBAS.igual(rolDe('determinacion_medica'), ['medico'], 'la determinación ocupacional sí es del médico');
    PRUEBAS.igual(rolDe('alta_reincorporacion'), ['medico'], 'y el alta también');
    PRUEBAS.igual(rolDe('telemedicina_aceptada'), ['empleado'], 'aceptar la consulta la decide la persona');
    PRUEBAS.alMenos(Array.from(new Set(ev.map(e => e.rol))).length, 3,
      '⚠️ y hay más de un rol en juego · con uno solo, las tres comprobaciones de arriba pasarían por casualidad');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Trazabilidad · el rol se muestra con su nombre, no con la clave interna', () => {
  PRUEBAS.igual(bitRolLabel('medico'), t('rol_medico'), '🔴 «medico» → «Servicio médico»');
  PRUEBAS.igual(bitRolLabel('supervisor'), t('rol_supervisor'), 'y «supervisor» → su etiqueta');
  PRUEBAS.igual(bitRolLabel('hseq'), t('vista_hseq'), 'y «hseq» → «Dirección / HSEQ»');
  PRUEBAS.igual(bitRolLabel('empleado'), t('rol_empleado'), 'y «empleado» → su etiqueta');
  /* ⚠️ NO se reusa `rolNombre()`: cae a «Supervisor» para cualquier valor desconocido, y acá el rol
     viene de eventos guardados hace meses, de versiones que ya no existen. */
  PRUEBAS.igual(bitRolLabel('inventado_2019'), 'inventado_2019',
    '⚠️ un rol que no se reconoce se muestra tal cual · decir «Supervisor» sobre una acción que no fue suya es peor que una palabra fea');
  PRUEBAS.igual(bitRolLabel(''), '', 'y sin rol no inventa ninguno');
});

PRUEBAS.caso('🔴 Demo · Dirección lee la trazabilidad sin nombres, y el supervisor NO los pierde', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    const payload = bitDemoPayload();
    const mirar = () => { const e = hseqEventos().filter(x => String(x.id||'').indexOf('bdemo') === 0);
      return { suj: Array.from(new Set(e.map(x => x.sujeto))), act: Array.from(new Set(e.map(x => x.actor))) }; };

    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'hseq');
    const h1 = mirar();
    PRUEBAS.alMenos(h1.suj.length, 5, 'guarda: hay sujetos que mirar');
    PRUEBAS.cierto(h1.suj.every(x => /^P\d+$/.test(String(x))),
      '🔴 Dirección ve «P1, P2…» · mismo recorte que `bitacoraParaHseq_` del servidor · ' + h1.suj.slice(0,4).join(', '));
    PRUEBAS.igual(h1.act, [''], 'y sin actor · el servidor tampoco lo manda');

    /* ⚠️ EL ALMACÉN NO SE TOCA. La primera versión guardaba la bitácora ya anonimizada y rompía
       dos cosas: `bitacoraSembrarDemo()` es idempotente POR DÍA, así que al volver a supervisor no
       re-sembraba y los nombres no volvían nunca; y cada vuelta a Dirección re-anonimizaba lo ya
       anonimizado, con los pseudónimos escalando P1…P19, P20…P38, sin techo. */
    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    const s1 = mirar();
    PRUEBAS.cierto(s1.suj.some(x => /[a-záéíóúñ]/i.test(String(x)) && !/^P\d+$/.test(String(x))),
      '🔴 el supervisor sigue viendo nombres · ' + s1.suj.slice(0,3).join(', '));

    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'hseq');
    const h2 = mirar();
    PRUEBAS.igual(h2.suj.slice().sort(), h1.suj.slice().sort(),
      '🔴 y al volver a Dirección los pseudónimos son LOS MISMOS · si escalaran, la segunda vuelta daría P20, P21…');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});
