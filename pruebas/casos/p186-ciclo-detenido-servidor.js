PRUEBAS.grupo('P186 · el ciclo que se detiene solo a las 24 h · servidor');

/* EL PEDIDO, TEXTUAL: «pasado de ciclo operativo, 24h y continua en misma fase se reinicia,
   avisando de excedido por no llenar el resto de campos (o sea que quede registro que se detuvo)».
   Y la aclaración: «queda un marcador que dice 200 horas de tal etapa, y no sé cómo apagarlo».

   Se corre el `.gs` DE VERDAD en el emulador con un `Operacional` de cinco ciclos y se llama a
   `cicloDetenerVencidos()` —la función del disparador— mirando QUÉ filas escribió (R15: la forma
   exacta, el id, la idempotencia) y qué dice `leerDuty` después. */

const P186_AHORA = Date.now();
const p186Hace = h => new Date(P186_AHORA - h * 3600000).toISOString();
const p186Fecha = iso => iso.substring(0, 10);
const P186_PLAN = JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 });

function p186Ev(persona, empresa, evento, iso, plan){
  return [p186Fecha(iso), iso.substring(11, 16), iso, 'op_' + persona.replace(/\s/g, '') + '_' + p186Fecha(iso) + '_' + evento,
          persona, empresa, 'Operaciones', 'Piloto', evento, '', '', plan == null ? P186_PLAN : plan];
}
function p186Operacional(){
  return [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    /* A · se detiene: llegó al aeropuerto hace 25 h y nunca salió. A 25 h la regla VIEJA de
       `dutyDePersona` (abandonado a las 2 × 840 = 28 h del plan estándar) todavía la ve ABIERTA:
       es la franja donde las dos reglas se distinguen, y por eso el discriminador vive acá. */
    p186Ev('Ana Suárez',   'Consorcio HELITEC', 'salida_casa',  p186Hace(26)),
    p186Ev('Ana Suárez',   'Consorcio HELITEC', 'llegada_aero', p186Hace(25)),
    /* B · no: salió de casa hace 2 h, está en camino */
    p186Ev('Luis Ferrer',  'Consorcio HELITEC', 'salida_casa',  p186Hace(2)),
    /* C · no: ciclo completo, aunque sea de hace 30 h */
    p186Ev('Carmen Rojas', 'Consorcio HELITEC', 'salida_casa',  p186Hace(34)),
    p186Ev('Carmen Rojas', 'Consorcio HELITEC', 'llegada_aero', p186Hace(33)),
    p186Ev('Carmen Rojas', 'Consorcio HELITEC', 'salida_aero',  p186Hace(31)),
    p186Ev('Carmen Rojas', 'Consorcio HELITEC', 'llegada_casa', p186Hace(30)),
    /* D · no: ya tiene su `detenido` escrito */
    p186Ev('Pedro Gómez',  'Aeroambulancias Silva', 'salida_casa', p186Hace(50)),
    p186Ev('Pedro Gómez',  'Aeroambulancias Silva', 'detenido',    p186Hace(26)),
    /* E · se detiene también, de otra empresa, en otra fase */
    p186Ev('Rosa Pérez',   'Aeroambulancias Silva', 'salida_casa',  p186Hace(40)),
    p186Ev('Rosa Pérez',   'Aeroambulancias Silva', 'llegada_aero', p186Hace(39)),
    p186Ev('Rosa Pérez',   'Aeroambulancias Silva', 'salida_aero',  p186Hace(38))
  ];
}
function p186Hojas(){
  return {
    'Operacional': p186Operacional(),
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App', 'x', 'y']],
    'Accesos': [['Usuario', 'Contraseña', 'Rol', 'EMPRESAS', 'Contraseña Médica', 'Contraseña HSQ'],
                ['helitec', 'sup', 'supervisor', 'Consorcio HELITEC', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  };
}
function p186Api(fns){
  const env = GS.crearEntorno(p186Hojas());
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
const P186_DESDE_LEJOS = P186_AHORA - 10 * 86400000;   // el corte, diez días atrás: todo entra
const p186Hoja = (api, n) => api.__env.__libro.getSheetByName(n).__volcado();   // las filas tal como quedaron en el libro falso
const p186FilasOp = api => p186Hoja(api, 'Operacional').slice(1);

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · el emulador tiene la hoja y la función existe', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p186Api(['cicloDetenerVencidos', 'leerOperacional']);
  PRUEBAS.igual(typeof api.cicloDetenerVencidos, 'function', 'cicloDetenerVencidos existe en el .gs');
  PRUEBAS.igual(api.leerOperacional(4).length, 12, 'guarda: los 12 eventos de prueba entran en la ventana de 4 días');
  PRUEBAS.cierto(/CICLO_DETENIDO_HORAS = 24/.test(CTX.gs || ''), 'la regla es 24 h, escrita como una constante');
});

PRUEBAS.caso('🔴 la simulación dice qué haría y NO escribe nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['cicloDetenerVencidos']);
  const antes = p186FilasOp(api).length;
  const r = api.cicloDetenerVencidos(true, P186_AHORA, P186_DESDE_LEJOS);
  PRUEBAS.cierto(r.ok && r.simulado, 'ok y simulado');
  PRUEBAS.igual(r.detenidos, 2, '⚠️ dos ciclos a detener: A (25 h en llegada_aero) y E (38 h en salida_aero)');
  PRUEBAS.igual(r.filas.map(f => f.persona + '/' + f.fase).sort(), ['Ana Suárez/llegada_aero', 'Rosa Pérez/salida_aero'], 'y son ésos');
  PRUEBAS.igual(p186FilasOp(api).length, antes, 'la hoja no cambió');
});

PRUEBAS.caso('🔴 con confirmar: escribe UNA fila por ciclo, con la forma exacta (R15), y la bitácora con su umbral', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['cicloDetenerVencidos']);
  const antes = p186FilasOp(api).length;
  const r = api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  PRUEBAS.igual(r.detenidos, 2, 'dos detenidos');
  const filas = p186FilasOp(api);
  PRUEBAS.igual(filas.length, antes + 2, '⚠️ exactamente dos filas nuevas');
  const nuevas = filas.slice(antes);
  const a = nuevas.find(f => f[4] === 'Ana Suárez');
  PRUEBAS.cierto(!!a, 'la de Ana existe');
  if (a){
    const esperadoIso = new Date(new Date(p186Hace(25)).getTime() + 1000).toISOString();
    PRUEBAS.igual(a[8], 'detenido', 'Evento = detenido');
    PRUEBAS.igual(a[2], esperadoIso, '⚠️ ISO = último evento + 1 s: pegado a SU ciclo (no «+24 h», que caía dentro del ciclo siguiente)');
    PRUEBAS.igual(r.filas[0].en, new Date(new Date(p186Hace(25)).getTime() + 24 * 3600000).toISOString(), 'y el informe dice el instante de detención: último + 24 h');
    PRUEBAS.igual(a[0], esperadoIso.substring(0, 10).length === 10 ? a[0] : '?', 'Fecha con forma de fecha');
    PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(a[0]) && /^\d{2}:\d{2}$/.test(a[1]), 'Fecha y Hora con la forma de las demás filas · ' + a[0] + ' ' + a[1]);
    PRUEBAS.igual(a[9], 'llegada_aero', 'Test = la fase en la que quedó');
    PRUEBAS.igual(a[10], '', 'Resultado vacío: no es un test, y un número acá viajaría al médico como resultado');
    PRUEBAS.igual(a[11], P186_PLAN, 'Plan = el del evento inicial, congelado');
    PRUEBAS.cierto(/^det_/.test(a[3]) && /consorcio/.test(a[3]) && /ana/.test(a[3]), 'Id determinista con prefijo det_ · ' + a[3]);
    PRUEBAS.igual([a[5], a[6], a[7]], ['Consorcio HELITEC', 'Operaciones', 'Piloto'], 'empresa, departamento y cargo de la persona');
  }
  const bit = p186Hoja(api, 'Bitácora').slice(1);
  PRUEBAS.igual(bit.length, 2, 'dos entradas de bitácora');
  const json = bit.map(f => f.join(' ')).join('\n');
  PRUEBAS.cierto(/ciclo_detenido/.test(json) && /umbralHoras/.test(json) && /24/.test(json), '⚠️ R3 · con la acción y el umbral vigente escritos');
  PRUEBAS.cierto(/detenidoEn/.test(json) && /ultimoEvento/.test(json), 'y con el instante de detención y el ancla, para poder reconstruirlo');
});

PRUEBAS.caso('🔴 IDEMPOTENTE · la segunda corrida no escribe nada más', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['cicloDetenerVencidos']);
  api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  const n1 = p186FilasOp(api).length, b1 = p186Hoja(api, 'Bitácora').length;
  const r2 = api.cicloDetenerVencidos(false, P186_AHORA + 3600000, P186_DESDE_LEJOS);   // una hora después, como el reloj
  PRUEBAS.igual(r2.detenidos, 0, 'la segunda corrida no encuentra nada que detener: los dos ya tienen su `detenido`');
  PRUEBAS.igual(p186FilasOp(api).length, n1, 'ni una fila más');
  PRUEBAS.igual(p186Hoja(api, 'Bitácora').length, b1, 'ni una entrada más en la bitácora');
});

PRUEBAS.caso('el corte por fecha: un ciclo anterior a CICLO_DETENER_DESDE no se registra (los 92 históricos)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['cicloDetenerVencidos']);
  /* corte hace 20 h: el último evento de A (hace 30 h) y el de E (hace 38 h) quedan ANTES */
  const r = api.cicloDetenerVencidos(true, P186_AHORA, P186_AHORA - 20 * 3600000);
  PRUEBAS.igual(r.detenidos, 0, 'nada: los dos quedan antes del corte');
  /* discriminador: corte hace 35 h → sólo A (hace 30 h) queda después */
  const r2 = api.cicloDetenerVencidos(true, P186_AHORA, P186_AHORA - 35 * 3600000);
  PRUEBAS.igual(r2.filas.map(f => f.persona), ['Ana Suárez'], 'con el corte más atrás entra A y no E');
});

PRUEBAS.caso('🔴 leerDuty entiende el detenido: la jornada queda detenida, sin exceso y sin «está adentro»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['cicloDetenerVencidos', 'leerOperacional', 'leerDuty']);
  const antes = api.leerDuty(api.leerOperacional(3), 3);
  const fA0 = (antes.diario || []).find(f => f.persona === 'Ana Suárez');
  PRUEBAS.cierto(!!fA0 && fA0.abierto === true && !fA0.detenido, 'DISCRIMINADOR · antes del disparador, la jornada de Ana está abierta y no detenida');
  api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  const despues = api.leerDuty(api.leerOperacional(3), 3);
  const fA = (despues.diario || []).find(f => f.persona === 'Ana Suárez');
  PRUEBAS.cierto(!!fA, 'guarda: la jornada de Ana sigue existiendo');
  if (fA){
    PRUEBAS.igual(fA.detenido, true, '⚠️ detenida');
    PRUEBAS.igual(fA.detenidoEn, 'jornada', 'en el tramo que estaba abierto (llegó al aeropuerto y no salió)');
    PRUEBAS.igual(fA.abierto, false, 'y ya no cuenta como «está adentro ahora»');
    PRUEBAS.igual(fA.excesoMin, 0, '⚠️ sin exceso: detenido no es excedido');
    PRUEBAS.igual(fA.jornadaMin, 0, '⚠️ y sin jornada: «deja de contar» — 24 h de jornada inflaban el promedio del médico');
    const tr = (fA.tramos || []).find(t => t.tramo === 'jornada');
    PRUEBAS.cierto(!!tr && tr.detenido === true && tr.abierto === false && tr.exceso === 0, 'el tramo lo dice igual');
    PRUEBAS.cierto((fA.eventos || []).some(e => e.evento === 'detenido'), 'y el evento viaja en el timeline de la jornada');
  }
  const fD = (despues.diario || []).find(f => f.persona === 'Pedro Gómez');
  PRUEBAS.cierto(!!fD && fD.detenido === true && fD.excesoMin === 0, 'el que ya venía detenido también se lee así');
  const fC = (despues.diario || []).find(f => f.persona === 'Carmen Rojas');
  PRUEBAS.cierto(!!fC && !fC.detenido && !fC.abierto, 'un ciclo completo no se toca');
  const fE = (despues.diario || []).find(f => f.persona === 'Rosa Pérez');
  PRUEBAS.cierto(!!fE && fE.detenido === true && fE.detenidoEn === 'traslado_vta' && fE.excesoMin === 0, 'el de 38 h —que la regla vieja ya llamaba abandonado— ahora está detenido, en el traslado de vuelta');
});

PRUEBAS.caso('un evento después del detenido abre un ciclo NUEVO (la persona vuelve a salir al día siguiente)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  hojas['Operacional'].push(p186Ev('Pedro Gómez', 'Aeroambulancias Silva', 'salida_casa', p186Hace(1)));   // D vuelve a salir
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['dutyAgruparCiclos_', 'leerOperacional']);
  const grupos = api.dutyAgruparCiclos_(api.leerOperacional(3)).filter(g => g.evs[0].persona === 'Pedro Gómez');
  PRUEBAS.igual(grupos.length, 2, 'dos ciclos para Pedro: el detenido y el nuevo');
  PRUEBAS.igual(grupos[1].evs.map(e => e.evento), ['salida_casa'], 'el nuevo arranca limpio, sin arrastrar el detenido');
});

PRUEBAS.caso('las tareas de mantenimiento: ciclo_triggers instala/lista/quita y ciclo_detener simula sin confirmar', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186Api(['accionMantenimiento']);
  const tok = (/var MANT_TOKEN = "([^"]+)"/.exec(CTX.gs || '') || [])[1] || '';
  const j = r => JSON.parse(r.getContent());
  const e0 = j(api.accionMantenimiento({ tarea: 'ciclo_triggers', token: tok }));
  PRUEBAS.cierto(e0.ok && Array.isArray(e0.r.estado) && e0.r.estado.length === 0 && e0.r.umbralHoras === 24, 'estado inicial: sin reloj, umbral 24');
  const a = j(api.accionMantenimiento({ tarea: 'ciclo_triggers', token: tok, accion: 'activar' }));
  PRUEBAS.cierto(a.ok && a.r.estado.length === 1 && a.r.estado[0].handler === 'cicloDetenerPorReloj', 'activar instala el reloj');
  const a2 = j(api.accionMantenimiento({ tarea: 'ciclo_triggers', token: tok, accion: 'activar' }));
  PRUEBAS.igual(a2.r.estado.length, 1, 'activar dos veces no duplica');
  const q = j(api.accionMantenimiento({ tarea: 'ciclo_triggers', token: tok, accion: 'desactivar' }));
  PRUEBAS.cierto(q.ok && q.r.quitados === 1 && q.r.estado.length === 0, 'desactivar lo quita');
  const antes = p186FilasOp(api).length;
  const s = j(api.accionMantenimiento({ tarea: 'ciclo_detener', token: tok }));
  PRUEBAS.cierto(s.ok && s.r.simulado === true, 'sin confirmar, simula');
  PRUEBAS.igual(p186FilasOp(api).length, antes, 'y no escribe');
  const sinTok = j(api.accionMantenimiento({ tarea: 'ciclo_detener', token: 'x', confirmar: '1' }));
  PRUEBAS.igual(sinTok.ok, false, 'sin token no');
});

PRUEBAS.caso('🔴 el detenido se pega a SU ciclo aunque caiga fuera del techo (jornada real de 12 h)', () => {
  /* Llegó a las 8, salió a las 20, nunca marcó la llegada a casa: el detenido se escribe a las 20 +
     24 h = 44 h después de salir de casa. El techo del plan estándar es 28 h: sin el arreglo, ese
     evento abría un ciclo fantasma de un solo `detenido` y el ciclo real seguía «abierto». Mis
     primeros escenarios lo esquivaron porque el último evento estaba a 1-2 h del inicio. Lo
     encontró el caso de contrato del cliente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  const h = 47;   // salió de casa hace 47 h
  hojas['Operacional'].push(
    p186Ev('Juan Real', 'Consorcio HELITEC', 'salida_casa',  p186Hace(h)),
    p186Ev('Juan Real', 'Consorcio HELITEC', 'llegada_aero', p186Hace(h - 1)),
    p186Ev('Juan Real', 'Consorcio HELITEC', 'salida_aero',  p186Hace(h - 13)),
    p186Ev('Juan Real', 'Consorcio HELITEC', 'detenido',     p186Hace(h - 13 - 24)));   // 44 h después del inicio
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['dutyAgruparCiclos_', 'leerOperacional', 'leerDuty']);
  const op = api.leerOperacional(3);
  const grupos = api.dutyAgruparCiclos_(op).filter(g => g.evs[0].persona === 'Juan Real');
  PRUEBAS.igual(grupos.length, 1, '⚠️ UN solo ciclo, con su detenido adentro — no un fantasma aparte');
  PRUEBAS.igual(grupos[0] && grupos[0].evs.map(e => e.evento), ['salida_casa', 'llegada_aero', 'salida_aero', 'detenido'], 'los cuatro eventos juntos');
  const f = (api.leerDuty(op, 3).diario || []).find(x => x.persona === 'Juan Real');
  PRUEBAS.cierto(!!f && f.detenido === true && f.detenidoEn === 'traslado_vta' && f.abierto === false && f.excesoMin === 0, 'y la jornada queda detenida en el traslado de vuelta, sin exceso');
});

PRUEBAS.caso('🔴 EL CASO COMÚN · olvidó «llegando a casa» ayer y hoy hizo un ciclo completo: el detenido va al de AYER', () => {
  /* Reproducido por la revisión adversarial con el código real: con el registro en «+24 h», el
     ISO caía dentro del ciclo de hoy, el olvido quedaba abierto para siempre y el ciclo de hoy
     —completo— aparecía detenido. Con el registro en «ancla + 1 s» queda pegado al de ayer. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  const D1 = 38, D2 = 14;   // ayer salió hace 38 h; hoy hace 14 h
  hojas['Operacional'].push(
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'salida_casa',  p186Hace(D1)),
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'llegada_aero', p186Hace(D1 - 1)),
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'salida_aero',  p186Hace(D1 - 13)),   // hace 25 h: nunca llegó a casa
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'salida_casa',  p186Hace(D2)),
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'llegada_aero', p186Hace(D2 - 1)),
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'salida_aero',  p186Hace(D2 - 12)),
    p186Ev('Mario Olvido', 'Consorcio HELITEC', 'llegada_casa', p186Hace(D2 - 13)));
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos', 'leerOperacional', 'leerDuty', 'dutyAgruparCiclos_']);
  const r = api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  const mio = r.filas.filter(f => f.persona === 'Mario Olvido');
  PRUEBAS.igual(mio.length, 1, 'un solo detenido para Mario · ' + JSON.stringify(r.filas.map(f => f.persona)));
  PRUEBAS.igual(mio[0] && mio[0].fase, 'salida_aero', 'en la fase en la que quedó ayer');
  const op = api.leerOperacional(4);
  const grupos = api.dutyAgruparCiclos_(op).filter(g => g.evs[0].persona === 'Mario Olvido');
  PRUEBAS.igual(grupos.length, 2, 'dos ciclos, el de ayer y el de hoy');
  PRUEBAS.igual(grupos[0].evs.map(e => e.evento), ['salida_casa', 'llegada_aero', 'salida_aero', 'detenido'], '⚠️ el detenido está en el de AYER');
  PRUEBAS.igual(grupos[1].evs.map(e => e.evento), ['salida_casa', 'llegada_aero', 'salida_aero', 'llegada_casa'], 'y el de hoy está entero');
  const jor = (api.leerDuty(op, 4).diario || []).filter(f => f.persona === 'Mario Olvido');
  PRUEBAS.igual(jor.map(f => !!f.detenido), [true, false], 'Jornada: ayer detenido, hoy no');
  PRUEBAS.igual(jor.map(f => !!f.abierto), [false, false], 'y ninguno «abierto»');
  /* y la segunda corrida, una hora después, no vuelve a detectarlo (la bitácora no crece) */
  const b1 = p186Hoja({ __env: env }, 'Bitácora').length;
  const r2 = api.cicloDetenerVencidos(false, P186_AHORA + 3600000, P186_DESDE_LEJOS);
  PRUEBAS.igual(r2.filas.filter(f => f.persona === 'Mario Olvido').length, 0, 'la segunda corrida no lo re-detecta');
  PRUEBAS.igual(p186Hoja({ __env: env }, 'Bitácora').length, b1, 'y la bitácora no crece');
});

PRUEBAS.caso('un ciclo TRUNCADO por la ventana no se detiene (no empieza con el evento inicial)', () => {
  /* La lectura acotada puede dejar un ciclo viejo sin su `salida_casa`: sus últimos eventos se
     pegarían al ciclo siguiente y se escribiría un detenido sobre un ciclo completo. Un grupo que
     no empieza con el evento inicial no es un ciclo entero: no se toca. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  hojas['Operacional'].push(
    p186Ev('Noche Truncada', 'Consorcio HELITEC', 'llegada_aero', p186Hace(40)),    // su salida_casa quedó fuera de la ventana
    p186Ev('Noche Truncada', 'Consorcio HELITEC', 'salida_aero',  p186Hace(30)));
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos']);
  const r = api.cicloDetenerVencidos(true, P186_AHORA, P186_DESDE_LEJOS);
  PRUEBAS.igual(r.filas.filter(f => f.persona === 'Noche Truncada').length, 0, 'no se detiene lo que no se ve entero');
  /* ni lo que tiene más de 72 h: eso ya lo derivó el cliente y la ventana no lo garantiza entero */
  const hojas2 = p186Hojas();
  hojas2['Operacional'].push(p186Ev('Muy Viejo', 'Consorcio HELITEC', 'salida_casa', p186Hace(90)));
  const api2 = GS.cargarGs(CTX.gs, GS.crearEntorno(hojas2), ['cicloDetenerVencidos']);
  PRUEBAS.igual(api2.cicloDetenerVencidos(true, P186_AHORA, P186_DESDE_LEJOS).filas.filter(f => f.persona === 'Muy Viejo').length, 0, 'ni con más de 72 h');
});

PRUEBAS.caso('🔴 P186e · EL CASO REAL DEL 15/09 · dos filas del mismo «salida_casa» a 9 ms son UN ciclo y UN detenido', () => {
  /* En producción quedaron dos filas con el mismo `IdEvento` (`…salida_casa#20260915T195001`, ISO
     19:50:01.402Z y 19:50:01.411Z): dos escrituras en el mismo segundo que el upsert no alcanzó a
     juntar. Sin el colapso al leer, la agrupación abría un ciclo de un solo `salida_casa` más el
     real, y el reloj escribía DOS `detenido`. Ahora al leer se aplica la misma regla que al
     escribir: dos ocurrencias del mismo evento a menos de 20 min son una, y gana la más nueva. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  const base = P186_AHORA - 26 * 3600000;   // hace 26 h: el ciclo vence
  const iso = ms => new Date(ms).toISOString();
  hojas['Operacional'].push(
    p186Ev('Doble Toque', 'Empresa De Prueba', 'salida_casa',  iso(base)),
    p186Ev('Doble Toque', 'Empresa De Prueba', 'salida_casa',  iso(base + 9)),          // 9 ms después, mismo IdEvento
    p186Ev('Doble Toque', 'Empresa De Prueba', 'llegada_aero', iso(base + 14)));
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos', 'leerOperacional', 'leerDuty', 'dutyAgruparCiclos_']);
  const op = api.leerOperacional(4);
  const grupos = api.dutyAgruparCiclos_(op).filter(g => g.evs[0].persona === 'Doble Toque');
  PRUEBAS.igual(grupos.length, 1, '🔴 UN ciclo, no un fantasma de un evento más el real');
  PRUEBAS.igual(grupos[0].evs.map(e => e.evento), ['salida_casa', 'llegada_aero'], 'con el salida_casa más nuevo y la llegada');
  PRUEBAS.igual(grupos[0].evs[0].iso, iso(base + 9), 'y gana el más nuevo de los dos, como en la hoja');
  const r = api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  const mios = r.filas.filter(f => f.persona === 'Doble Toque');
  PRUEBAS.igual(mios.length, 1, '🔴 el reloj escribe UN detenido, no dos');
  PRUEBAS.igual(p186FilasOp({ __env: env }).filter(f => f[4] === 'Doble Toque' && f[8] === 'detenido').length, 1, 'y en la hoja queda una fila detenido');
  const jor = (api.leerDuty(api.leerOperacional(4), 4).diario || []).filter(f => f.persona === 'Doble Toque');
  PRUEBAS.igual(jor.length, 1, 'Jornada: una sola jornada, detenida');
  PRUEBAS.igual(jor[0] && !!jor[0].detenido, true, 'detenida');
  /* discriminador: a 25 min son DOS hechos (la persona volvió a salir), como al escribir */
  const hojas2 = p186Hojas();
  hojas2['Operacional'].push(
    p186Ev('Dos Salidas', 'Empresa De Prueba', 'salida_casa',  iso(base)),
    p186Ev('Dos Salidas', 'Empresa De Prueba', 'salida_casa',  iso(base + 25 * 60000)),
    p186Ev('Dos Salidas', 'Empresa De Prueba', 'llegada_aero', iso(base + 26 * 60000)));
  const api2 = GS.cargarGs(CTX.gs, GS.crearEntorno(hojas2), ['leerOperacional', 'dutyAgruparCiclos_']);
  PRUEBAS.igual(api2.dutyAgruparCiclos_(api2.leerOperacional(4)).filter(g => g.evs[0].persona === 'Dos Salidas').length, 2, 'DISCRIMINADOR · a 25 min son dos ciclos');
});

PRUEBAS.caso('🔴 P186e/f · dos `detenido` ya escritos del mismo ciclo (antes del arreglo) no hacen que se vuelva a escribir', () => {
  /* Si el reloj alcanzó a escribir los dos `detenido` antes de publicar el colapso, quedan en la hoja
     con ids distintos (van por ISO con milisegundos). P186f los deja a los dos (`detenido` no entra
     al colapso: ver el caso siguiente), pero el ciclo «ya tiene detenido» —`cicloAnclaDetencion_`
     corta en el primero— y la corrida siguiente no agrega nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  const base = P186_AHORA - 30 * 3600000;
  const iso = ms => new Date(ms).toISOString();
  hojas['Operacional'].push(
    p186Ev('Ya Detenido', 'Empresa De Prueba', 'salida_casa',  iso(base)),
    p186Ev('Ya Detenido', 'Empresa De Prueba', 'salida_casa',  iso(base + 9)),
    p186Ev('Ya Detenido', 'Empresa De Prueba', 'llegada_aero', iso(base + 14)),
    p186Ev('Ya Detenido', 'Empresa De Prueba', 'detenido',     iso(base + 1000)),        // el que escribió por el fantasma
    p186Ev('Ya Detenido', 'Empresa De Prueba', 'detenido',     iso(base + 14 + 1000)));  // el del ciclo real
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos', 'leerOperacional', 'leerDuty', 'dutyAgruparCiclos_']);
  const grupos = api.dutyAgruparCiclos_(api.leerOperacional(4)).filter(g => g.evs[0].persona === 'Ya Detenido');
  PRUEBAS.igual(grupos.length, 1, 'un ciclo');
  PRUEBAS.igual(grupos[0].evs.map(e => e.evento), ['salida_casa', 'llegada_aero', 'detenido', 'detenido'], 'los dos `detenido` quedan (P186f: no se colapsan) y el ciclo es uno');
  const suyas = () => p186FilasOp({ __env: env }).filter(f => f[4] === 'Ya Detenido').length;
  const antes = suyas();
  const r = api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  PRUEBAS.igual(r.filas.filter(f => f.persona === 'Ya Detenido').length, 0, '🔴 y el reloj no vuelve a escribir: el ciclo ya tiene su detenido');
  PRUEBAS.igual(suyas(), antes, 'sus filas quedan igual (las otras personas del CH falso sí se detienen, como siempre)');
  const jor = (api.leerDuty(api.leerOperacional(4), 4).diario || []).filter(f => f.persona === 'Ya Detenido');
  PRUEBAS.igual(jor.length, 1, 'y Jornada muestra una sola, detenida');
});

PRUEBAS.caso('🔴 P186f · dos `detenido` de DOS ciclos distintos a menos de 20 min son dos hechos: el reloj no vuelve a «detener» el primero cada hora', () => {
  /* Lo encontró el verificador de P186e: con `detenido` adentro del colapso, alguien que prueba el
     botón dos veces seguidas (dos ciclos abiertos a 16 min, los dos abandonados) recibe dos
     `detenido` a 16 min → se juntaban → el primer ciclo quedaba sin registro → el reloj lo volvía a
     «detener» en cada corrida: la fila se reescribía con el mismo id (no duplica), pero la bitácora,
     que no se limpia, sumaba una entrada por hora. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p186Hojas();
  const base = P186_AHORA - 30 * 3600000;
  const iso = ms => new Date(ms).toISOString();
  hojas['Operacional'].push(
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'salida_casa',  iso(base)),
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'llegada_aero', iso(base + 10 * 60000)),
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'salida_aero',  iso(base + 15 * 60000)),
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'llegada_aero', iso(base + 31 * 60000)),   // apertura repetida: ciclo nuevo
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'detenido',     iso(base + 15 * 60000 + 1000)),
    p186Ev('Dos Ciclos', 'Empresa De Prueba', 'detenido',     iso(base + 31 * 60000 + 1000)));
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos', 'leerOperacional', 'leerDuty', 'dutyAgruparCiclos_', 'dutyColapsarMismaOcurrencia_']);
  const grupos = api.dutyAgruparCiclos_(api.leerOperacional(4)).filter(g => g.evs[0].persona === 'Dos Ciclos');
  PRUEBAS.igual(grupos.length, 2, 'dos ciclos');
  PRUEBAS.igual(grupos.map(g => g.evs.filter(e => e.evento === 'detenido').length), [1, 1], '🔴 cada uno con SU detenido');
  const suyas = () => p186FilasOp({ __env: env }).filter(f => f[4] === 'Dos Ciclos').length;
  const antes = suyas();
  const r = api.cicloDetenerVencidos(false, P186_AHORA, P186_DESDE_LEJOS);
  PRUEBAS.igual(r.filas.filter(f => f.persona === 'Dos Ciclos').length, 0, '🔴 el reloj no escribe nada: los dos ya tienen su detenido');
  PRUEBAS.igual(suyas(), antes, 'sus filas quedan igual');
  const jor = (api.leerDuty(api.leerOperacional(4), 4).diario || []).filter(f => f.persona === 'Dos Ciclos');
  PRUEBAS.igual(jor.map(f => !!f.detenido), [true, true], 'y Jornada muestra dos jornadas, las dos detenidas');
  /* discriminador directo sobre el colapso: dos `detenido` a 1 s siguen siendo dos; dos `salida_casa` a 1 s, uno */
  const par = t => [{ evento: t, iso: iso(base), persona: 'x' }, { evento: t, iso: iso(base + 1000), persona: 'x' }];
  PRUEBAS.igual(api.dutyColapsarMismaOcurrencia_(par('detenido')).length, 2, '`detenido` no entra al colapso');
  PRUEBAS.igual(api.dutyColapsarMismaOcurrencia_(par('salida_casa')).length, 1, 'DISCRIMINADOR · `salida_casa` sí');
});

PRUEBAS.caso('P186f · un ISO con desplazamiento que ordena por texto antes que uno en Z más viejo no lo pisa', () => {
  /* Toda fila de la app sale de `toISOString()` (Z), pero el CH lo escribe también otra IA y a mano.
     `2026-09-15T23:00:00-04:00` (= 03:00Z del 16) ordena por texto ANTES que `2026-09-16T01:00:00Z`,
     y el resto negativo (−2 h) entraba en la ventana: se juntaban y ganaba la MÁS VIEJA. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno(p186Hojas()), ['dutyColapsarMismaOcurrencia_']);
  const evs = [
    { evento: 'salida_casa', iso: '2026-09-15T23:00:00-04:00', persona: 'x' },   // 03:00Z del 16
    { evento: 'salida_casa', iso: '2026-09-16T01:00:00Z',      persona: 'x' }];  // dos horas ANTES en realidad
  const out = api.dutyColapsarMismaOcurrencia_(evs.slice());
  PRUEBAS.igual(out.length, 2, 'dos hechos a dos horas: no se juntan aunque el texto los ordene al revés');
  const out2 = api.dutyColapsarMismaOcurrencia_([
    { evento: 'salida_casa', iso: '2026-09-16T01:00:00Z',      persona: 'x' },
    { evento: 'salida_casa', iso: '2026-09-16T01:00:09.000Z',  persona: 'x' }]);
  PRUEBAS.igual(out2.length, 1, 'DISCRIMINADOR · a 9 s en Z siguen siendo uno');
});
