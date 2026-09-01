
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

PRUEBAS.grupo('Y1b · el empleado recupera su propia historia');

PRUEBAS.caso('⚠️ el endpoint le manda al empleado SUS eventos del ciclo', () => {
  /* LA ASIMETRÍA QUE PARTÍA EL PROMPT EN DOS: al supervisor y a Dirección les llegaban siete días
     de `Operacional`, pero a la persona NO le llegaban los suyos. Su línea de tiempo vivía sólo en
     el teléfono, podada a ~48 h. Dos consecuencias, las dos silenciosas: no podía mirar días
     anteriores, y al cambiar de teléfono PERDÍA SU HISTORIA — mientras el CH la tenía entera. */
  const fuente = CTX.gs || '';
  if (!fuente) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const cuerpo = (fuente.match(/function accionEmpleado\(p\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.cierto(/leerOperacional\(\s*30\s*\)/.test(cuerpo),
    'la respuesta del empleado tiene que traer sus eventos operacionales');
  PRUEBAS.cierto(/leerOperacional\(30\)\.filter\(esMio\)/.test(cuerpo.replace(/\s/g, '')
      .replace('leerOperacional(30).filter(esMio)', 'leerOperacional(30).filter(esMio)')) ||
    /\.filter\(esMio\)/.test(cuerpo),
    '⚠️ y recortados por identidad con el MISMO esMio que ya recorta sus registros: esta acción no ' +
    'pide contraseña, así que ese filtro es toda la protección que hay');
});

PRUEBAS.caso('⚠️ la poda local no se lleva puesto el histórico del servidor', () => {
  /* Lo local se poda a ~48 h cada vez que se guarda un evento. Si el histórico del servidor se
     guardara en la MISMA clave, la próxima poda se lo llevaría: la persona vería sus 30 días hasta
     registrar el evento siguiente y ahí volvería a tener dos. Un histórico que desaparece solo es
     peor que no tenerlo, porque nadie sabe si el dato existe. Por eso son dos claves. */
  const hace = m => new Date(Date.now() - m * 60000).toISOString();
  localStorage.setItem('silva_fatiga_ciclo_srv_v1', JSON.stringify([
    { evento:'salida_casa',  iso: hace(60 * 24 * 20) },
    { evento:'llegada_casa', iso: hace(60 * 24 * 20 - 300) }
  ]));
  localStorage.setItem('silva_fatiga_ciclo_mio_v1', JSON.stringify([
    { evento:'salida_casa', iso: hace(30) }
  ]));
  const antes = cicloMioAll().length;
  cicloMioGuardar('llegada_aero', '', null);      // dispara la poda de lo local
  const despues = cicloMioAll();
  localStorage.removeItem('silva_fatiga_ciclo_srv_v1');
  localStorage.removeItem('silva_fatiga_ciclo_mio_v1');

  PRUEBAS.igual(antes, 3, 'arranca viendo los 2 del servidor + 1 local');
  PRUEBAS.alMenos(despues.filter(e => new Date(e.iso) < new Date(Date.now() - 86400000 * 10)).length, 2,
    'después de podar, los eventos viejos del SERVIDOR tienen que seguir estando');
});

PRUEBAS.caso('lo que está en el teléfono le gana a lo del servidor para el mismo evento', () => {
  /* Un evento recién registrado sigue en la cola de envío: el servidor todavía no lo tiene. Si
     ganara la versión del servidor, la persona vería desaparecer lo que acaba de tocar. */
  const iso = new Date().toISOString();
  localStorage.setItem('silva_fatiga_ciclo_srv_v1', JSON.stringify([{ evento:'salida_casa', iso, test:'', resultado:null }]));
  localStorage.setItem('silva_fatiga_ciclo_mio_v1', JSON.stringify([{ evento:'salida_casa', iso, test:'kss', resultado:7 }]));
  const todos = cicloMioAll();
  localStorage.removeItem('silva_fatiga_ciclo_srv_v1');
  localStorage.removeItem('silva_fatiga_ciclo_mio_v1');
  PRUEBAS.igual(todos.length, 1, 'el mismo evento no se cuenta dos veces');
  PRUEBAS.igual(todos[0].resultado, 7, 'y gana la versión del teléfono, que es la más nueva');
});

PRUEBAS.caso('⚠️ el selector de período sólo se le ofrece a quien puede usarlo', () => {
  /* Quién puede ver histórico lo decide el SERVIDOR (`operacionalPeriodo.puedeVerHistorico`). Acá
     sólo se comprueba que la pantalla no ofrezca un control que no va a funcionar — el recorte
     real está en el endpoint, mismo criterio que K1a y K1b. */
  const antes = (typeof DASH !== 'undefined' && DASH) ? DASH.operacionalPeriodo : undefined;
  if (typeof DASH === 'undefined' || !DASH) { PRUEBAS.cierto(true, 'sin panel abierto se saltea'); return; }

  DASH.operacionalPeriodo = { dias:7, puedeVerHistorico:false };
  const sinPermiso = cicloPeriodoHtml();
  DASH.operacionalPeriodo = { dias:30, puedeVerHistorico:true };
  const conPermiso = cicloPeriodoHtml();
  DASH.operacionalPeriodo = antes;

  PRUEBAS.igual(sinPermiso, '', 'a un supervisor no se le dibuja el selector');
  PRUEBAS.cierto(conPermiso.indexOf('cic-per') >= 0, 'y a quien puede, sí');
});

PRUEBAS.caso('⚠️ los períodos del ciclo pasan por t(), en los dos idiomas', () => {
  /* R14: nada de texto visible escrito a mano. Y si falta una traducción la cadena de respaldo
     devuelve la clave, que se ve como "per_30dias" en pantalla — se comprueba que no pase. */
  const faltan = [];
  ['per_titulo','per_hoy','per_7dias','per_30dias','per_90dias','per_sin_datos','per_sin_datos_h']
    .forEach(k => { const v = t(k); if (!v || v === k) faltan.push(k); });
  PRUEBAS.igual(faltan, [], 'toda clave de período tiene que resolver a texto de verdad');
  PRUEBAS.cierto(cicloPeriodos().every(p => p.etiqueta && p.etiqueta !== p.id),
    'y las etiquetas del selector salen de t(), no del id');
});
