PRUEBAS.grupo('P090 · la cobertura no miente: un día que el servidor nunca mandó no puede decir «sin jornada registrada»');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO  (caso 7 del plan de P090)

   Es el mismo contrato que `p090-cobertura-piloto.js`, del otro lado: ahí la cobertura entra por
   `misSincronizar` y se guarda en el teléfono; acá entra por `onDashData` y vive en `DASH`. Los dos
   lados existen porque los dos pueden romperse solos, y el que se mira en esta pantalla es el del
   MÉDICO, que es quien saca conclusiones sobre otra persona.

   La frase del pie —«Hay datos cargados desde el {f}»— es una afirmación sobre el SERVIDOR, no
   sobre la persona. Si algún día `leerOperacional` cambia su corte y nadie toca esta pantalla, esa
   frase miente y no hay síntoma: el mes se ve igual de lleno. El caso (c) de acá es el ancla — el
   día del corte EXACTO tiene que estar adentro, porque el servidor recorta con `hoy − dias`
   inclusive. Un día de diferencia no rompe nada visible y por eso hay que medirlo.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): `onDashData(payload, empresa, params, vista)`, nunca
   `DASH = {…}`. `onDashData` arma `DASH` con una lista CERRADA de campos y lo que no está nombrado
   ahí se descarta sin error — `operacionalPeriodo` está en esa lista y ésta es la prueba de que
   sigue estándolo. Armar `DASH` a mano es exactamente lo que dejó pasar el defecto de A4.

   ⚠️ Todas las afirmaciones «no hay ninguna casilla X» van acompañadas de una cuenta de casillas
   MEDIDAS. Un cero sin discriminador no es un resultado: ya pasó que un auditor dijera «0 defectos»
   porque medía una sección que tenía un ancestro en `display:none`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P090N_EMP = 'Empresa P090N';
const P090N_PER = 'Luis Cobertura P090';

/* Payload SIN jornadas: lo que se mide es el período, no el contenido. Con `operacional: []` toda
   casilla cubierta cae en «sin jornada registrada» y toda casilla no cubierta en «fuera», que es
   justamente el par que este archivo tiene que poder distinguir. */
function p090nPayload(periodo){
  return {
    ok: true, rol: 'supervisor', vista: 'medico', referencia: {}, metricas: [],
    registros: [{ persona: P090N_PER, empresa: P090N_EMP, departamento: 'Tripulación',
                  cargo: 'Piloto', fecha: todayStr() }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], config: {}, marca: null, niveles: [],
    duty: null, ausencias: {}, nominaTotal: 1, nominaSinDato: [],
    operacional: [],
    operacionalPeriodo: periodo
  };
}

/* Params SIN `pass`: así `gestCanSync()` da false y entrar al panel no dispara los pedidos
   laterales de gestiones, reportes y opiniones, que irían a parar al candado de red del arnés. */
function p090nEntrar(periodo){
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  const prev = { dash: DASH, gate: gate ? gate.style.display : '', panel: panel ? panel.style.display : '' };
  const fetchAntes = window.fetch;
  window.fetch = function(){ return new Promise(function(){}); };
  try {
    onDashData(p090nPayload(periodo), P090N_EMP,
               { action: 'empleado', empresa: P090N_EMP, persona: P090N_PER }, 'medico');
  } finally {
    window.fetch = fetchAntes;   // vuelve al candado de red, nunca al `fetch` pelado
  }
  stopDashAutoRefresh();
  cicloTickStop();
  return prev;
}

function p090nSalir(prev){
  stopDashAutoRefresh(); cicloTickStop();
  DASH = prev.dash;
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  if (gate) gate.style.display = prev.gate;
  if (panel) panel.style.display = prev.panel;
}

/* Un mes dibujado, con sus casillas y su pie. Se lee de un nodo suelto: acá no se mide estilo, se
   miden clases y TEXTO — y el texto se lee con `textContent`, nunca con `innerText`, que en esta
   pestaña (oculta de forma permanente) da falsos negativos (R11). */
function p090nBloque(ym){
  const div = document.createElement('div');
  div.innerHTML = cmesBloqueHtml('panel', P090N_PER, ym);
  const casos = {};
  div.querySelectorAll('.cmes-grid [data-f]').forEach(function(b){
    const m = /cmes-c-([a-z_]+)/.exec(String(b.className || ''));
    casos[b.getAttribute('data-f')] = m ? m[1] : '(sin caso)';
  });
  const pie = div.querySelector('.cmes-pie');
  return { casos: casos, pie: pie ? pie.textContent : '' };
}

/* El caso de UN día, dibujando el mes al que ese día pertenece. Importa que sea así y no «el mes de
   hoy»: `hoy − 8` cae en el mes anterior ocho días de cada mes, y una casilla que no está en la
   grilla no tiene clase que leer — el caso pasaría por no haber medido nada. */
function p090nCasoDe(f){ return p090nBloque(f.slice(0, 7)).casos[f]; }

PRUEBAS.caso('🔴 P090 · con 7 días de cobertura, los días anteriores al corte dicen «no hay datos cargados» y el pie nombra la fecha de corte', function(){
  CTX.resetear();
  const prev = p090nEntrar({ dias: 7, desde: null, hasta: null, puedeVerHistorico: true });
  try {
    const hoy = todayStr();
    const desde = fechaMasDias(hoy, -7);
    const ant = fechaMasDias(hoy, -8);
    PRUEBAS.igual((cmesCobertura('panel') || {}).desde, desde,
      'guarda: `operacionalPeriodo` sobrevivió a `onDashData` (lista CERRADA de campos) y la cobertura arranca donde el servidor dijo');
    const b = p090nBloque(ant.slice(0, 7));
    const fuera = Object.keys(b.casos).filter(function(f){ return f < desde; });
    PRUEBAS.alMenos(Object.keys(b.casos).length, 28,
      'guarda: se midió un mes completo de casillas. Un cero sin discriminador no es un resultado');
    PRUEBAS.alMenos(fuera.length, 1,
      'guarda: hay al menos un día anterior al corte en el mes medido — sin esto las dos afirmaciones de abajo darían verde sobre un conjunto vacío');
    PRUEBAS.igual(b.casos[ant], 'fuera',
      'el día siguiente al corte hacia atrás no llegó en el payload: la app tiene que decir «no hay datos cargados de este día», que es la FALTA de una afirmación');
    PRUEBAS.igual(fuera.filter(function(f){ return b.casos[f] !== 'fuera'; }).length, 0,
      'y lo mismo TODOS: el borde es uno solo y no puede haber islas de color antes del corte');
    PRUEBAS.igual(fuera.filter(function(f){ return b.casos[f] === 'sin_jornada'; }).length, 0,
      '«sin jornada registrada» afirma que la persona no trabajó ese día. Dicho sobre un día que el servidor nunca mandó, es una acusación falsa en la ficha que mira el médico');
    PRUEBAS.cierto(b.pie.indexOf(cmesFechaLarga(desde)) >= 0,
      'el pie NOMBRA la fecha de corte: sin eso, quien mira no tiene cómo saber que el mes está recortado y lee el blanco como ausencia de trabajo (R6)');
    PRUEBAS.falso(b.pie.indexOf(t('cmes_cobertura_no')) >= 0,
      'discriminador del pie: con cobertura conocida no puede aparecer además el texto de «no se sabe» — si los dos se emitieran siempre, el `indexOf` de arriba pasaría sin probar nada');
  } finally { p090nSalir(prev); }
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · con 400 días de cobertura la MISMA casilla pasa a «sin jornada registrada»', function(){
  CTX.resetear();
  const prev = p090nEntrar({ dias: 400, desde: null, hasta: null, puedeVerHistorico: true });
  try {
    const ant = fechaMasDias(todayStr(), -8);
    PRUEBAS.igual((cmesCobertura('panel') || {}).dias, 400,
      'guarda: el período que se está midiendo es el de 400 días, no el de 7 del caso anterior');
    PRUEBAS.igual(p090nCasoDe(ant), 'sin_jornada',
      'discriminador: lo que cambia el color de esa casilla es el PERÍODO DECLARADO, no el almanaque. Si diera «fuera» también acá, el caso de arriba estaría midiendo una constante en vez del contrato con el servidor');
  } finally { p090nSalir(prev); }
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · con `operacionalPeriodo: null` el mes entero sale «fuera» y el pie dice que no se sabe desde cuándo hay datos', function(){
  CTX.resetear();
  const prev = p090nEntrar(null);
  try {
    const hoy = todayStr();
    PRUEBAS.igual(cmesCobertura('panel'), null,
      'guarda: sin período declarado la cobertura es «no se sabe», que se dibuja distinto de «vacío»');
    const b = p090nBloque(hoy.slice(0, 7));
    const pasados = Object.keys(b.casos).filter(function(f){ return f <= hoy; });
    PRUEBAS.alMenos(pasados.length, 1,
      'guarda: se midió al menos una casilla ya transcurrida');
    PRUEBAS.igual(pasados.filter(function(f){ return b.casos[f] !== 'fuera'; }).length, 0,
      'con cobertura desconocida NUNCA se dibuja un mes como si estuviera vacío: un mes que no llegó y un mes sin jornadas se ven iguales, y significan lo contrario');
    PRUEBAS.igual(Object.keys(b.casos).filter(function(f){ return b.casos[f] === 'sin_jornada'; }).length, 0,
      'ni una casilla puede afirmar que la persona no trabajó');
    PRUEBAS.cierto(b.pie.indexOf(t('cmes_cobertura_no')) >= 0,
      'y el pie lo dice con todas las letras. Es lo que pasa cuando todavía no llegó ninguna respuesta, que es el estado de la pantalla durante los primeros segundos');
  } finally { p090nSalir(prev); }
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · el día del corte exacto (hoy − 7 con `dias: 7`) está ADENTRO: dice «sin jornada», no «fuera»', function(){
  CTX.resetear();
  const prev = p090nEntrar({ dias: 7, desde: null, hasta: null, puedeVerHistorico: true });
  try {
    const corte = fechaMasDias(todayStr(), -7);
    PRUEBAS.igual(p090nCasoDe(corte), 'sin_jornada',
      'el servidor recorta con `hoy − dias` INCLUSIVE: ese día sí viajó, así que decir «no hay datos cargados» sobre él sería esconder un día que la app tiene');
    PRUEBAS.falso(p090nCasoDe(corte) === 'fuera',
      'discriminador: si el cliente derivara el corte con `-(dias-1)`, ésta es la única casilla del mes que lo notaría. Es el error de un día que no tiene síntoma visible, y es el que vuelve mentirosa la frase «hay datos cargados desde el {f}» del pie');
  } finally { p090nSalir(prev); }
});
