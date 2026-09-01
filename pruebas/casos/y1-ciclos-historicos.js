
PRUEBAS.grupo('Y1 · ciclos operativos históricos');

/* ⚠️ LO PRIMERO FUE MEDIR, y la premisa con la que se encaró esto resultó falsa.
   El plan advertía: "pedir todo el historial puede volverse el pedido más pesado de la app". Se
   armó una hoja de un año (73.200 filas) y se contaron las CELDAS que `leerOperacional` leía de
   Sheets según el rango pedido:

       7 días → 805.211 celdas      30 días → 805.211 celdas
      90 días → 805.211 celdas     365 días → 805.211 celdas

   Idénticas. `getDataRange().getValues()` traía la hoja entera y el recorte por fecha pasaba
   después, en memoria. O sea que el pedido pesado YA EXISTÍA y era el de 7 días — el que corre en
   cada carga del panel — y para devolver 1.250 filas leía 805.211 celdas: tiraba el 98,3 %.

   El rango largo no era el problema y acotarlo no era la solución. La solución fue leer desde el
   final de la hoja hacia atrás (crece por append, lo reciente está abajo) y cortar al salir del
   rango. */

/* Una hoja `Operacional` de `dias` días, `personas` personas y 4 eventos por día. */
function y1Hoja(dias, personas){
  const EV = ['salida_casa','llegada_aero','salida_aero','llegada_casa'];
  const filas = [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado']];
  const hoy = new Date();
  for (let d = dias; d >= 0; d--) {
    const dia = new Date(hoy.getTime() - d * 86400000);
    const f = dia.toISOString().slice(0, 10);
    for (let p = 0; p < personas; p++) for (let e = 0; e < EV.length; e++) {
      const t = new Date(dia.getTime() + (5 + e * 4) * 3600000);
      filas.push([f, t.toISOString().slice(11, 16), t.toISOString(), 'id' + d + '_' + p + '_' + e,
        'Persona ' + p, 'Helitec', 'Operaciones', 'Piloto', EV[e], e === 1 ? 'kss' : '', e === 1 ? '4' : '']);
    }
  }
  return filas;
}

/* Prepara el endpoint contra una hoja simulada y cuenta las celdas que llegan a leerse. */
function y1Endpoint(filas){
  const env = GS.crearEntorno({ Operacional: filas });
  const libro = env.SpreadsheetApp.openById('x');
  if (!libro.getSpreadsheetTimeZone) libro.getSpreadsheetTimeZone = () => 'America/Caracas';
  const proto = Object.getPrototypeOf(libro.getSheetByName('Operacional').getDataRange());
  const orig = proto.getValues;
  const contador = { celdas: 0 };
  proto.getValues = function () {
    const v = orig.call(this);
    contador.celdas += v.length * (v[0] ? v[0].length : 0);
    return v;
  };
  const api = GS.cargarGs(CTX.gs, env, ['leerOperacional', 'leerOperacionalCompleto']);
  return { api, contador, restaurar: () => { proto.getValues = orig; } };
}

PRUEBAS.caso('⚠️ la lectura acotada devuelve EXACTAMENTE lo mismo que la que leía todo', () => {
  /* Esta es la comprobación que hace segura la optimización. Una lectura que devuelve DE MENOS es
     invisible en pantalla —se ve como "esa persona no registró"—, que es la peor forma de fallar
     que tiene esta hoja: no da error, da una conclusión equivocada sobre una persona.
     Por eso la versión anterior se conservó con otro nombre en vez de borrarla. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const E = y1Endpoint(y1Hoja(120, 20));
  const distintos = [];
  try {
    [7, 14, 30, 90].forEach(d => {
      const nuevo = E.api.leerOperacional(d);
      const viejo = E.api.leerOperacionalCompleto(d);
      if (JSON.stringify(nuevo) !== JSON.stringify(viejo)) {
        distintos.push(d + ' días: acotada ' + nuevo.length + ' filas vs completa ' + viejo.length);
      }
    });
  } finally { E.restaurar(); }
  PRUEBAS.igual(distintos, [], 'las dos lecturas tienen que coincidir fila por fila, en todo rango');
});

PRUEBAS.caso('⚠️ y lee MUCHO menos: es el pedido de cada carga del panel el que se abarata', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const E = y1Endpoint(y1Hoja(365, 50));
  let acotada = 0, completa = 0;
  try {
    E.contador.celdas = 0; E.api.leerOperacional(7);          acotada = E.contador.celdas;
    E.contador.celdas = 0; E.api.leerOperacionalCompleto(7);  completa = E.contador.celdas;
  } finally { E.restaurar(); }
  const ahorro = 100 - 100 * acotada / completa;
  PRUEBAS.alMenos(ahorro, 80,
    'sobre una hoja de un año, pedir 7 días tiene que leer al menos un 80% menos de celdas ' +
    '(' + completa + ' → ' + acotada + ', ' + ahorro.toFixed(1) + '%)');
});

PRUEBAS.caso('⚠️ el rango por fechas respeta el mes, sin correrse por zona horaria', () => {
  /* CASO BORDE DEL PLAN: el cambio de mes. Y mordió en la primera prueba — pidiendo JUNIO devolvía
     desde el 30 de MAYO. `new Date("2026-06-01")` se parsea como medianoche UTC y `setHours(0,..)`
     la lleva a medianoche de la zona del SERVIDOR; entre esas dos medianoches caen eventos de otro
     día del calendario. Se resolvió comparando la fecha YA FORMATEADA en la zona de la operación,
     como texto — la misma lección de L1. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const E = y1Endpoint(y1Hoja(400, 5));
  let r;
  try {
    const hoy = new Date();
    const mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const desde = mesPasado.toISOString().slice(0, 10);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const hasta = finMes.toISOString().slice(0, 10);
    const filas = E.api.leerOperacional(365, desde, hasta);
    const fechas = [...new Set(filas.map(x => x.fecha))].sort();
    r = { desde, hasta, primera: fechas[0], ultima: fechas[fechas.length - 1] };
  } finally { E.restaurar(); }
  /* Se comparan como TEXTO, no con alMenos/comoMucho: esas dos convierten a numero y una fecha
     ISO da NaN. Las fechas ISO se ordenan bien alfabeticamente, que es justo para lo que sirven. */
  PRUEBAS.cierto(r.primera >= r.desde, 'nada anterior al primer dia del rango (' + r.primera + ' vs ' + r.desde + ')');
  PRUEBAS.cierto(r.ultima <= r.hasta, 'ni posterior al ultimo (' + r.ultima + ' vs ' + r.hasta + ')');
});

PRUEBAS.caso('un período sin datos devuelve vacío, no la hoja entera', () => {
  /* CASO BORDE DEL PLAN: "un rango sin datos tiene que decir 'no hay registros en este período',
     no quedarse vacío". La mitad del servidor es ésta: devolver vacío de verdad y no, por ejemplo,
     ignorar el rango y mandar todo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const E = y1Endpoint(y1Hoja(30, 5));
  let n;
  try { n = E.api.leerOperacional(365, '2019-01-01', '2019-01-31').length; } finally { E.restaurar(); }
  PRUEBAS.igual(n, 0, 'un rango donde no hay nada tiene que dar cero filas');
});

PRUEBAS.caso('una empresa sin historial no rompe nada', () => {
  /* CASO BORDE DEL PLAN. Una hoja recién creada, con encabezado y sin una sola fila. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const soloEncabezado = y1Hoja(0, 0).slice(0, 1);
  const E = y1Endpoint(soloEncabezado);
  let r;
  try { r = { d7: E.api.leerOperacional(7).length, rango: E.api.leerOperacional(90, '2026-01-01', '2026-12-31').length }; }
  finally { E.restaurar(); }
  PRUEBAS.igual(r.d7, 0, 'sin filas, devuelve vacío sin explotar');
  PRUEBAS.igual(r.rango, 0, 'y con rango explícito, igual');
});

PRUEBAS.caso('⚠️ quien entró hace tres días aparece completo, no a medias', () => {
  /* CASO BORDE DEL PLAN: "alguien que entró hace tres días". El riesgo real es la lectura por
     bloques: si cortara al primer evento fuera de rango, una persona con pocos días podría quedar
     partida. Se comprueba que estén sus cuatro eventos de cada día. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const filas = y1Hoja(120, 10);
  const EV = ['salida_casa','llegada_aero','salida_aero','llegada_casa'];
  const hoy = new Date();
  for (let d = 2; d >= 0; d--) {
    const dia = new Date(hoy.getTime() - d * 86400000);
    for (let e = 0; e < EV.length; e++) {
      const t = new Date(dia.getTime() + (6 + e * 3) * 3600000);
      filas.push([dia.toISOString().slice(0,10), t.toISOString().slice(11,16), t.toISOString(),
        'nuevo_' + d + '_' + e, 'Recién Entrado', 'Helitec', 'Operaciones', 'Piloto', EV[e], '', '']);
    }
  }
  const E = y1Endpoint(filas);
  let suyos;
  try { suyos = E.api.leerOperacional(7).filter(o => o.persona === 'Recién Entrado'); }
  finally { E.restaurar(); }
  PRUEBAS.igual(suyos.length, 12, 'sus 3 días × 4 eventos tienen que estar completos');
  PRUEBAS.igual([...new Set(suyos.map(o => o.evento))].sort(), EV.slice().sort(),
    'y los cuatro tipos de evento, ninguno perdido por el corte de bloque');
});

PRUEBAS.caso('⚠️ los ciclos históricos son TODOS, no sólo el último', () => {
  /* `cicloAgruparEventos` devuelve un solo ciclo: el abierto más reciente. Es lo correcto para
     "¿cómo va hoy?", que es la pregunta del supervisor, pero deja sin responder la del servicio
     médico: "¿cómo vinieron las últimas semanas?".
     `cicloAgruparTodos` usa el MISMO motor y devuelve la lista. Se comprueba que el último de la
     lista coincida con lo que devuelve la función de siempre: si se separan, las dos pantallas
     empiezan a contar historias distintas del mismo turno. */
  const EV = ['salida_casa','llegada_aero','salida_aero','llegada_casa'];
  const eventos = [];
  const hoy = Date.now();
  for (let d = 4; d >= 0; d--) for (let e = 0; e < EV.length; e++) {
    eventos.push({ persona:'Ana', departamento:'Operaciones', evento:EV[e],
      iso: new Date(hoy - d * 86400000 + e * 3 * 3600000).toISOString() });
  }
  const ventana = 20 * 3600000;
  const todos = cicloAgruparTodos(eventos, ventana);
  const ultimo = cicloAgruparEventos(eventos, ventana);
  PRUEBAS.igual(todos.length, 5, 'cinco días con su ciclo cada uno');
  PRUEBAS.igual(JSON.stringify(todos[0]), JSON.stringify(ultimo),
    'el primero de la lista (la más nueva) tiene que ser exactamente el que devuelve la función de siempre');
  const t0 = todos.map(c => c.t0);
  PRUEBAS.igual(t0.slice().sort((a,b) => b - a), t0, 'la lista sale del más nuevo al más viejo');
});

PRUEBAS.caso('⚠️ quién puede ver histórico lo decide el servidor, no la pantalla', () => {
  /* Mismo criterio que K1a y K1b: si el dato viaja en la respuesta, viajó — esconderlo en el
     cliente no lo protege de nadie que abra las herramientas del navegador. El endpoint ignora el
     rango pedido por un supervisor y lo dice en `operacionalPeriodo.puedeVerHistorico`; el cliente
     sólo lee esa bandera para no ofrecer un control que no va a funcionar. */
  const fuente = CTX.gs || '';
  if (!fuente) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  PRUEBAS.cierto(/acc\.vista === "medico" \|\| acc\.vista === "hseq"/.test(fuente),
    'el endpoint tiene que decidir por VISTA quién recibe más de 7 días');
  PRUEBAS.cierto(/operacionalPeriodo/.test(fuente),
    'y tiene que devolver el período servido, para que la pantalla no suponga que le dieron lo que pidió');
  PRUEBAS.cierto(/function cicloPuedeHistorico/.test(
    [...document.querySelectorAll('script')].map(s => s.textContent).join('')),
    'y el cliente lo lee de ahí en vez de decidirlo por su cuenta');
});
