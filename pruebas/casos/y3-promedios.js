
PRUEBAS.grupo('Y3 · promedios de duración');

/* ⚠️ ESTE ES EL PROMPT DE MÁS RIESGO DEL PLAN, y el riesgo no se ve en pantalla.
   **Un promedio de puntajes ES un puntaje.** Si el agregado incluyera resultados de tests,
   reabriría exactamente la fuga que E2a y K1a cerraron. Lo que se promedia acá son DURACIONES —
   dato operativo, no clínico: cuánto tardó un traslado habla del entorno y del turno, no del
   estado de salud de nadie. Es el mismo criterio por el que hoy `carga` no se recorta y
   `resultado` sí.

   Y la protección NO se agregó en el cliente: ya estaba en el endpoint, y esto se apoya en ella.
   Los casos de abajo existen para que se rompan RUIDOSAMENTE si alguien la afloja. */

const Y3_PLAN = { traslado:60, jornada:720, regreso:60, descanso:600 };

function y3Ciclo(offDias, trasladoMin, cerrarHasta){
  const t0 = Date.now() - offDias * 86400000;
  const ev = { salida_casa:  { iso: new Date(t0).toISOString(), evento:'salida_casa' } };
  if (cerrarHasta >= 1) ev.llegada_aero = { iso: new Date(t0 + trasladoMin*60000).toISOString(), evento:'llegada_aero' };
  if (cerrarHasta >= 2) ev.salida_aero  = { iso: new Date(t0 + (trasladoMin+720)*60000).toISOString(), evento:'salida_aero' };
  if (cerrarHasta >= 3) ev.llegada_casa = { iso: new Date(t0 + (trasladoMin+780)*60000).toISOString(), evento:'llegada_casa' };
  return { persona:'X', departamento:'Op', ev:ev, t0:t0 };
}

function y3Con(vista, fn){
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = { vista:vista, rol:'empresa', f:{}, _cfg:{ cicloPlan: Y3_PLAN } };
  try { return fn(); } finally { DASH = previo; }
}

PRUEBAS.caso('⚠️ el supervisor NO ve promedios; el médico sí, y Dirección sólo el del grupo', () => {
  /* El recorte que pide el plan, con la distinción que importa: el promedio GENERAL es un agregado
     de la organización —el contrato de Dirección— mientras que uno POR PERSONA re-identifica: con
     pocas personas por área el número dice quién es aunque el nombre no esté. */
  const r = {};
  ['supervisor','medico','hseq'].forEach(v => {
    r[v] = y3Con(v, () => ({ general: cicloVePromedios(), persona: cicloVePromedioPersona() }));
  });
  PRUEBAS.falso(r.supervisor.general, 'el supervisor no ve promedios: su pantalla es "qué pasa ahora"');
  PRUEBAS.falso(r.supervisor.persona, 'ni los individuales');
  PRUEBAS.cierto(r.medico.general, 'el servicio médico ve el general');
  PRUEBAS.cierto(r.medico.persona, 'y el individual');
  PRUEBAS.cierto(r.hseq.general, 'Dirección ve el general: es un agregado de la organización');
  PRUEBAS.falso(r.hseq.persona,
    '⚠️ pero NO el individual: con pocas personas por área un promedio individual re-identifica');
});

PRUEBAS.caso('⚠️ SE PROMEDIAN TIEMPOS, NUNCA PUNTAJES: la fuga de E2a/K1a sigue cerrada', () => {
  /* EL CASO MÁS IMPORTANTE DE TODO EL PROMPT. Si algún día alguien agrega "promedio de KSS" a esta
     tira, el número que aparecería en la pantalla de Dirección sería un puntaje clínico agregado —
     exactamente lo que dos prompts anteriores se dedicaron a sacar del payload.
     Se comprueba de dos maneras: que lo que se calcula sean minutos de tramos, y que el endpoint
     siga sin mandar `resultado` a quien no le corresponde (si el dato no viaja, el promedio no se
     puede calcular ni desde la consola del navegador). */
  const filas = y3Con('medico', () => cicloPromedios({ x: [y3Ciclo(1, 60, 3), y3Ciclo(2, 70, 3)] }, Y3_PLAN));
  const claves = cicloTramos().map(tr => tr.k);
  PRUEBAS.igual(filas.map(f => f.k), claves,
    'las filas del promedio son los TRAMOS del ciclo, no métricas de test');
  const metricas = ['kss','estres','ansiedad','fatiga','gastro','depresion','cansancio'];
  PRUEBAS.igual(filas.filter(f => metricas.indexOf(f.k) >= 0), [],
    '⚠️ ninguna fila puede ser una métrica clínica: un promedio de puntajes ES un puntaje');

  if (CTX.hayGs){
    const fuente = CTX.gs;
    const rec = (fuente.match(/function recortarCicloServer[\s\S]*?\n\}/) || [''])[0];
    PRUEBAS.cierto(/k !== "resultado"/.test(rec),
      '⚠️ y el endpoint tiene que seguir sacando `resultado` para supervisor y Dirección: es lo que ' +
      'hace que un promedio de puntajes no se pueda calcular aunque alguien quisiera');
    PRUEBAS.cierto(/vista === "supervisor" \|\| acc\.vista === "hseq"/.test(fuente) ||
                   /acc\.vista === "supervisor"/.test(fuente),
      'aplicado a esas dos vistas');
  } else {
    PRUEBAS.cierto(true, 'sin el .gs servido, la mitad de servidor de este caso se saltea');
  }
});

PRUEBAS.caso('⚠️ un valor absurdo no distorsiona el promedio, y se dice cuántos quedaron afuera', () => {
  /* CASO BORDE DEL PLAN: "un valor absurdo (14 h de traslado porque se olvidó de tocar el botón)
     lo distorsiona todo". Con promedio simple, UN olvido entre diez traslados de una hora los
     convierte en 2 h 18 de promedio — y el número miente sin que nadie lo note.
     No se descartan en silencio: se cuentan y se dicen, porque "3 registros quedaron afuera por
     durar demasiado" es justamente lo que el supervisor querría saber. */
  const normales = []; for (let i = 0; i < 9; i++) normales.push(y3Ciclo(i + 2, 60, 3));
  const conOlvido = normales.concat([y3Ciclo(1, 840, 3)]);   // 14 h de "traslado"
  const r = y3Con('medico', () => ({
    sin: cicloPromedios({ x: normales }, Y3_PLAN)[0],
    con: cicloPromedios({ x: conOlvido }, Y3_PLAN)[0]
  }));
  PRUEBAS.igual(r.con.promedio, r.sin.promedio,
    'el promedio no puede moverse por un olvido (' + r.sin.promedio + ' vs ' + r.con.promedio + ' min)');
  PRUEBAS.igual(r.con.fuera, 1, 'y el descartado se cuenta, para poder decirlo en pantalla');
  PRUEBAS.igual(r.con.n, 9, 'sobre los nueve que sí valen');
});

PRUEBAS.caso('⚠️ un tramo en curso no cuenta: todavía no duró lo que muestra', () => {
  /* CASO BORDE DEL PLAN. Un tramo abierto lleva N minutos, no duró N minutos. Meterlo en el
     promedio lo tira sistemáticamente hacia abajo — y encima cambiaría solo con el reloj, así que
     el mismo período daría números distintos según cuándo se mire. */
  const iJornada = cicloTramos().findIndex(tr => tr.k === 'jornada');
  const cerrados = []; for (let i = 0; i < 5; i++) cerrados.push(y3Ciclo(i + 2, 60, 2));
  const r = y3Con('medico', () => ({
    solo: cicloPromedios({ x: cerrados }, Y3_PLAN)[iJornada],
    conAbierto: cicloPromedios({ x: cerrados.concat([y3Ciclo(0, 60, 1)]) }, Y3_PLAN)[iJornada]
  }));
  PRUEBAS.igual(r.conAbierto.n, r.solo.n,
    'el ciclo con la jornada abierta no puede sumar al conteo (' + r.solo.n + ' vs ' + r.conAbierto.n + ')');
  PRUEBAS.igual(r.conAbierto.promedio, r.solo.promedio, 'ni mover el promedio');
});

PRUEBAS.caso('⚠️ siempre se dice de cuántos registros sale el promedio', () => {
  /* CASO BORDE DEL PLAN: "un promedio con dos mediciones no es un promedio — hay que mostrar de
     cuántas sale".
     Y el `n` va SIEMPRE, no sólo cuando es bajo: si apareciera únicamente con pocos datos, su
     ausencia se leería como "acá hay muchos" sin que nadie lo haya dicho nunca. */
  const html = y3Con('medico', () =>
    cicloPromediosHtml({ x: [y3Ciclo(1, 60, 3), y3Ciclo(2, 80, 3)] }, Y3_PLAN, 'X'));
  const caja = document.createElement('div'); caja.innerHTML = html;
  const enes = [...caja.querySelectorAll('.prm-n')].map(e => e.textContent);
  const celdas = caja.querySelectorAll('.prm-cel').length;
  PRUEBAS.alMenos(celdas, 1, 'tiene que dibujarse alguna celda');
  PRUEBAS.igual(enes.length, celdas, 'cada celda dice de cuántos registros sale');
  PRUEBAS.cierto(enes.every(x => /\d/.test(x)), 'con el número a la vista: ' + (enes[0] || ''));
  PRUEBAS.alMenos(caja.querySelectorAll('.prm-flojo').length, 1,
    'y con dos registros la celda se marca como floja: dos mediciones no son un promedio');
});

PRUEBAS.caso('⚠️ los textos de los promedios pasan por t(), en los dos idiomas', () => {
  const faltan = [];
  ['prm_titulo','prm_de_n','prm_de_1','prm_previsto','prm_pocos','prm_fuera_1','prm_fuera_n',
   'prm_persona','prm_ayuda'].forEach(k => { const v = t(k); if (!v || v === k) faltan.push(k); });
  PRUEBAS.igual(faltan, [], 'toda clave de promedios tiene que resolver a texto de verdad (R14)');
});
