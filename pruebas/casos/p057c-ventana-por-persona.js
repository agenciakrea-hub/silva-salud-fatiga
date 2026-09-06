/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P057c · N11 · LA VENTANA DE AGRUPACIÓN, POR PERSONA                             (2026-09-06)

   Tercer y último tramo.

   ⚠️ ESTA CABECERA AFIRMABA QUE EL RIESGO IRREVERSIBLE «YA SE HABÍA CERRADO EN P057a». ERA FALSO,
   y lo encontró una revisión adversarial con los cuatro defectos ya publicados. `enviarOperacional`
   sí pasó a llamar `cicloPlan(cicloYo())`, pero `cicloPlanPersona` lee `DASH.cicloPlanPersona` y en
   el teléfono del empleado `DASH` es `null`: el riesgo se movió del lado de ESCRITURA al de
   LECTURA, no desapareció. Se congelaba la jornada de la empresa igual que antes.
   Peor, quedó no determinista: para alguien que es piloto y además supervisor, el número dependía
   de si había abierto el panel antes de marcar.
   Cerrado de verdad en `p057h-hallazgos.js` (H1), haciendo que `accionTareasMias` —el único canal
   que llega al teléfono del empleado— mande el plan de esa persona.

   Y el caso que debía cuidarlo comprobaba el TEXTO FUENTE:
       PRUEBAS.cierto(/plan:\s*JSON\.stringify\(cicloPlan\(cicloYo\(\)\)/.test(env), ...)
   Verificaba que la línea estuviera escrita, no que el valor resolviera.

   ── LO QUE SÍ FALTABA ───────────────────────────────────────────────────────────────────────
   La VENTANA con la que se agrupan los eventos sueltos en ciclos. Decide dónde corta un ciclo y
   empieza el siguiente: pasado ese tiempo, un evento nuevo abre uno nuevo en vez de sumarse.
   Con la ventana de la empresa:
   · alguien con una jornada MÁS LARGA veía su ciclo partido en dos — el traslado de vuelta caía
     fuera de la ventana y arrancaba un ciclo fantasma sin apertura;
   · alguien con una MÁS CORTA veía dos jornadas distintas pegadas en una sola.
   Ninguna de las dos da error: dan un número creíble y equivocado, que es la peor forma de fallar.

   ── DOS FUENTES DISTINTAS, A PROPÓSITO ──────────────────────────────────────────────────────
   La ventana usa el plan VIGENTE de la persona; el exceso se juzga contra el plan CONGELADO del
   evento. No es inconsistencia: son dos preguntas distintas. «¿Se excedió contra lo que estaba
   pactado ese día?» necesita el congelado y lo responde el servidor. «¿Estos eventos son del mismo
   ciclo?» necesita un número ANTES de haber leído el primer evento del grupo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P057c · la ventana de agrupación por persona');

PRUEBAS.caso('⚠️ la ventana sigue a la jornada de cada persona', () => {
  PRUEBAS.igual(typeof cicloVentanaDe, 'function', 'guarda de medibilidad: la función existe');
  const prev = DASH;
  try {
    const base = cicloPlan();
    const tr = cicloTramos().find(x => x.k === 'jornada') || cicloTramos()[0];
    PRUEBAS.alMenos(base[tr.k] || 0, 1, 'guarda: la empresa tiene jornada · ' + JSON.stringify(base));
    const clave = (typeof dashNorm === 'function') ? dashNorm('Ana Suárez') : 'ana suarez';
    const mapa = {}; mapa[clave] = Object.assign({}, base, { [tr.k]: base[tr.k] + 180 });
    DASH = Object.assign({}, prev || {}, { cicloPlanPersona: mapa });
    const vAna = cicloVentanaDe('Ana Suárez');
    const vOtro = cicloVentanaDe('Luis Ferrer');
    PRUEBAS.alMenos(vOtro, 1, 'guarda de medibilidad: la ventana no es cero · ' + vOtro);
    PRUEBAS.igual(vAna - vOtro, 180 * 60000,
      '⚠️ la ventana de Ana es exactamente 3 h más larga · ' + vAna + ' contra ' + vOtro);
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ los dos bucles de agrupación pasan la persona, no una ventana global', () => {
  /* Los dos ya agrupaban por persona; lo que faltaba era darle a cada grupo SU ventana. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.alMenos(f.length, 100000, 'guarda de medibilidad: se leyó la fuente');
  ['cicloArmar', 'cicloHistorico'].forEach(fn => {
    const cuerpo = (f.match(new RegExp('function ' + fn + '\\([\\s\\S]*?\\n\\}')) || [''])[0];
    PRUEBAS.alMenos(cuerpo.length, 200, 'guarda: se encontró ' + fn);
    PRUEBAS.cierto(/cicloVentanaDe\(nombre\)/.test(cuerpo),
      '⚠️ ' + fn + ' calcula la ventana por persona');
    /* Y la variable global que había quedado sin uso no está: dejarla haría pensar que esta
       función todavía depende del plan de la empresa. */
    PRUEBAS.falso(/const plan = cicloPlan\(\)/.test(cuerpo),
      '⚠️ y ya no queda la variable `plan` sin uso en ' + fn);
  });
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · con la ventana global el caso de arriba se pone rojo', () => {
  /* Sin esto, «la ventana sigue a la persona» podría pasar porque devuelve cualquier cosa. */
  const global = () => cicloTotalMin(cicloPlan()) * 60000;
  PRUEBAS.igual(global(), global(), 'la ventana global es la misma para todos, por definición');
  const prev = DASH;
  try {
    const base = cicloPlan();
    const tr = cicloTramos().find(x => x.k === 'jornada') || cicloTramos()[0];
    const clave = (typeof dashNorm === 'function') ? dashNorm('Ana Suárez') : 'ana suarez';
    const mapa = {}; mapa[clave] = Object.assign({}, base, { [tr.k]: base[tr.k] + 180 });
    DASH = Object.assign({}, prev || {}, { cicloPlanPersona: mapa });
    PRUEBAS.cierto(cicloVentanaDe('Ana Suárez') !== global(),
      '⚠️ la de la persona DIFIERE de la global cuando tiene plan propio · si fueran iguales, el ' +
      'caso de arriba no probaría nada');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ el umbral que se CONGELA lo mide el servidor contra el plan del evento', () => {
  /* Cierra el círculo del prompt. El cliente escribe el plan de la persona con cada evento
     (P057a); el servidor lo lee de ESA fila, no de la configuración vigente. Si el servidor
     usara la configuración actual, bajar la jornada de la empresa marcaría excedidos
     retroactivamente a todos — que es exactamente lo que su propio comentario dice evitar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  PRUEBAS.alMenos(CTX.gs.length, 10000, 'guarda de medibilidad: se leyó el .gs · ' + CTX.gs.length);
  const fn = (CTX.gs.match(/function dutyDePersona\([\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda: se encontró `dutyDePersona`');
  PRUEBAS.cierto(/dutyPlanDeFila\(abre\.plan\)/.test(fn),
    '⚠️ mide contra el plan que viajó con el evento que ABRE la jornada, no contra la config vigente');
  /* Y el cliente escribe ese plan con la persona, que es la otra mitad del contrato (R17). */
  const cli = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const env = (cli.match(/function enviarOperacional\([\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.cierto(/plan:\s*JSON\.stringify\(cicloPlan\(cicloYo\(\)\)/.test(env),
    '⚠️ y el cliente congela el plan de LA PERSONA · las dos mitades del contrato');
});
