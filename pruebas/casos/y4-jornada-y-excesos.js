
PRUEBAS.grupo('Y4 · jornada y excesos');

/* ⚠️ EL DISEÑO, y por qué NO se hizo como parecía. El pedido era registrar los excesos de jornada, y
   la forma obvia era escribir una fila "hubo exceso" al cerrar un tramo pasado. Tiene un agujero que
   la vuelve inservible: **el peor exceso es el de quien se pasó y NUNCA marcó la salida**, y ese
   tramo no cierra nunca. Un registro "al cerrar" no lo vería jamás — justo el caso que más importa.
   Acá el exceso se DERIVA de los eventos que `Operacional` ya guarda. No hay cola nueva que se pueda
   perder, no hay nada que editar (R3 se cumple solo), y el tramo abierto se juzga contra ahora. */

function y4Env(operacional){
  const env = GS.crearEntorno({
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan']]
                   .concat(operacional || []),
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'],
                ['Helitec','clave-sup','supervisor','Helitec','clave-med','']],
  });
  return GS.cargarGs(CTX.gs, env, ['leerDuty','dutyDePersona','dutyPlanDeFila']);
}
/* Plan de 12 h de jornada y 1 h de cada traslado, en minutos. */
const Y4_PLAN = JSON.stringify({ traslado_ida:60, jornada:720, traslado_vta:60 });
function y4Ev(persona, fecha, hora, evento, plan){
  const iso = fecha + 'T' + hora + ':00.000Z';
  return [fecha, hora, iso, 'op_' + persona + '_' + fecha + '_' + evento, persona, 'Helitec', 'Op', 'Piloto', evento, '', '', plan === undefined ? Y4_PLAN : plan];
}
/* Lo que `leerOperacional` le entrega a `leerDuty`. */
function y4Filas(arr){
  return arr.map(f => ({ fecha:f[0], hora:f[1], iso:f[2], persona:f[4], empresa:f[5],
                         departamento:f[6], cargo:f[7], evento:f[8], test:f[9], resultado:null, plan:f[11] }));
}

PRUEBAS.caso('⚠️ una jornada dentro del límite NO figura como exceso', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'),
                        y4Ev('Ana Suárez','2026-09-01','17:00','salida_aero') ]);   // 11 h de 12
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 1, 'tiene que haber un día medido');
  PRUEBAS.igual(r.diario[0].jornadaMin, 660, '11 horas de jornada');
  PRUEBAS.igual(r.diario[0].excesoMin, 0, '⚠️ dentro del límite no hay exceso');
});

PRUEBAS.caso('⚠️ una jornada pasada del límite mide el exceso exacto', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'),
                        y4Ev('Ana Suárez','2026-09-01','19:30','salida_aero') ]);   // 13,5 h de 12
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario[0].jornadaMin, 810, '13 h 30 de jornada');
  PRUEBAS.igual(r.diario[0].excesoMin, 90, '⚠️ 90 minutos de exceso, no "hubo exceso"');
});

PRUEBAS.caso('⚠️ EL CASO QUE IMPORTA: quien se pasó y NO marcó la salida, aparece', () => {
  /* Es la razón por la que el exceso se deriva en vez de registrarse al cerrar. Un tramo que nunca
     cierra no dispara ningún "al cerrar", y es justamente la persona por la que hay que preguntar:
     lleva 20 horas sin marcar que se fue. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const hace20h = new Date(Date.now() - 20*3600*1000);
  const iso = hace20h.toISOString();
  const evs = [{ fecha: iso.slice(0,10), hora: iso.slice(11,16), iso: iso, persona:'Beto Pérez',
                 empresa:'Helitec', departamento:'Op', cargo:'Piloto', evento:'llegada_aero',
                 test:'', resultado:null, plan: Y4_PLAN }];
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 1, 'tiene que aparecer aunque el tramo esté abierto');
  PRUEBAS.cierto(r.diario[0].abierto === true, 'y marcado como abierto');
  PRUEBAS.alMenos(r.diario[0].excesoMin, 400,
    '⚠️ 20 h contra un límite de 12 son ~480 min de exceso: si esto diera 0, el que no cerró sería ' +
    'invisible y es justo por quien hay que preguntar (dio ' + r.diario[0].excesoMin + ')');
});

PRUEBAS.caso('⚠️ EL UMBRAL ESTÁ CONGELADO: bajar la jornada NO excede los ciclos pasados', () => {
  /* El problema de fondo que el plan marcaba resolver de entrada. Si el exceso se juzgara contra la
     configuración de HOY, el día que una empresa pase de 12 h a 8 h todos los ciclos anteriores
     quedarían excedidos retroactivamente. Un registro de "se pasó de jornada" tiene consecuencias
     laborales: no puede cambiar porque alguien editó una configuración.
     Acá se comprueba con dos días de la MISMA persona, cada uno con su plan congelado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const plan12 = JSON.stringify({ traslado_ida:60, jornada:720, traslado_vta:60 });
  const plan8  = JSON.stringify({ traslado_ida:60, jornada:480, traslado_vta:60 });
  const evs = y4Filas([
    y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero', plan12),
    y4Ev('Ana Suárez','2026-09-01','17:00','salida_aero',  plan12),   // 11 h con límite 12 → sin exceso
    y4Ev('Ana Suárez','2026-09-02','06:00','llegada_aero', plan8),
    y4Ev('Ana Suárez','2026-09-02','17:00','salida_aero',  plan8),    // 11 h con límite 8 → 3 h de exceso
  ]);
  const r = api.leerDuty(evs, 7);
  const d1 = r.diario.find(f => f.fecha === '2026-09-01');
  const d2 = r.diario.find(f => f.fecha === '2026-09-02');
  PRUEBAS.igual(d1.excesoMin, 0,
    '⚠️ el día que regía el límite de 12 h, once horas NO son exceso — y siguen sin serlo después');
  PRUEBAS.igual(d2.excesoMin, 180,
    'y el día que ya regía el de 8 h, las mismas once horas son 3 h de exceso');
});

PRUEBAS.caso('⚠️ una fila SIN umbral congelado se marca, no se le inventa uno', () => {
  /* Las filas anteriores a este cambio no traen plan. Inventarles el actual sería exactamente el
     re-juzgamiento retroactivo que el caso de arriba previene, pero disimulado. Se marcan y el
     panel las muestra aparte. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero', ''),
                        y4Ev('Ana Suárez','2026-09-01','19:30','salida_aero',  '') ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.cierto(r.diario[0].umbralCongelado === false, '⚠️ tiene que quedar marcada como no congelada');
  PRUEBAS.igual(r.diario[0].excesoMin, 0,
    'y sin umbral no se declara exceso: acusar a alguien con un número que quizás no era el suyo es peor que no decir nada');
  PRUEBAS.alMenos(r.sinUmbralCongelado, 1, 'y el reporte tiene que decir cuántas hay');
});

PRUEBAS.caso('⚠️ el promedio se calcula sobre los días trabajados, no sobre el período', () => {
  /* Una persona que trabajó 2 de 30 días no tiene un promedio de jornada de 45 minutos. Dividir por
     el período en vez de por los días con datos es la forma más común de que un panel mienta hacia
     abajo justo con quien trabaja poco y muy concentrado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([
    y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-01','18:00','salida_aero'),
    y4Ev('Ana Suárez','2026-09-15','06:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-15','18:00','salida_aero'),
  ]);
  const r = api.leerDuty(evs, 30);
  const ana = r.personas.find(x => x.persona === 'Ana Suárez');
  PRUEBAS.igual(ana.dias, 2, 'trabajó dos días');
  PRUEBAS.igual(ana.promedioJornadaMin, 720,
    '⚠️ el promedio es 12 h (los días que trabajó), no 12h×2/30 — dividir por el período miente');
});

PRUEBAS.caso('los cinco cortes que pidió HSEQ están en la respuesta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'),
                        y4Ev('Ana Suárez','2026-09-01','19:30','salida_aero'),
                        y4Ev('Beto Pérez','2026-09-01','07:00','llegada_aero'),
                        y4Ev('Beto Pérez','2026-09-01','16:00','salida_aero') ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.alMenos(r.diario.length, 2,       'diario: una fila por persona y día');
  PRUEBAS.alMenos(r.personas.length, 2,     'individual y acumulado: una por persona');
  PRUEBAS.cierto(r.personas[0].promedioJornadaMin >= 0, 'promedio');
  PRUEBAS.alMenos(r.historico.length, 1,    'histórico: una entrada por día');
  PRUEBAS.igual(r.historico[0].conExceso, 1,
    'y el histórico cuenta a quién se pasó: uno de los dos. ⚠️ Los DOS dejaron el traslado de vuelta ' +
    'sin cerrar (nadie marca que llegó a casa), así que si esto diera 2 sería porque un tramo ' +
    'abandonado se está contando como exceso');
});

PRUEBAS.caso('⚠️ el duty NO viaja para el supervisor: es de servicio médico y HSEQ', () => {
  /* Mismo recorte por rol que el resto del ciclo (K1a/K1b), y del lado del SERVIDOR: si el dato
     viaja en la respuesta, viajó — esconderlo en la pantalla no lo protege de nadie que abra las
     herramientas del navegador. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const bloque = (CTX.gs.match(/duty:[\s\S]{0,220}/) || [''])[0];
  PRUEBAS.cierto(/acc\.vista === "medico"/.test(bloque) && /acc\.vista === "hseq"/.test(bloque) && /acc\.rol === "admin"/.test(bloque),
    '⚠️ el recorte por rol tiene que estar en el .gs, no en el cliente');
  PRUEBAS.cierto(/leerDuty\(operacional, opDias\)/.test(bloque) && /:\s*null/.test(bloque),
    'y para el resto tiene que ir null, no un objeto vacío que parezca "no hubo excesos"');
});

PRUEBAS.caso('⚠️ un tramo ABANDONADO no es un tramo excedido', () => {
  /* Lo encontró esta misma suite. Lo normal es marcar la salida del aeropuerto y NUNCA marcar la
     llegada a casa: la persona ya terminó y la app quedó en el bolsillo. Midiendo ese tramo contra
     ahora sin techo, un día viejo daba 3.316 minutos de "exceso" — 55 horas de traslado. El panel de
     HSEQ se habría llenado de excesos falsos, y de los más alarmantes.
     La distinción no es cosmética: "abandonado" es un problema de REGISTRO, "excedido" es un
     problema LABORAL. Confundirlos le pone a alguien un exceso de 55 horas en su legajo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'),
                        y4Ev('Ana Suárez','2026-09-01','17:00','salida_aero') ]);
  const r = api.leerDuty(evs, 7);
  const vuelta = r.diario[0].tramos.find(t => t.tramo === 'traslado_vta');
  PRUEBAS.cierto(!!vuelta, 'el traslado de vuelta existe: arrancó con la salida del aeropuerto');
  PRUEBAS.cierto(vuelta.abandonado === true, '⚠️ y tiene que quedar marcado como abandonado');
  PRUEBAS.igual(vuelta.exceso, 0, 'sin sumar un solo minuto de exceso');
  PRUEBAS.falso(r.diario[0].abierto,
    'y el día no puede figurar como "está trabajando ahora" por un traslado que nadie cerró');
});

PRUEBAS.caso('⚠️ pero el que SÍ se está pasando ahora sigue contando (el discriminador)', () => {
  /* El control del caso de arriba. Si el techo de "abandonado" se pusiera muy bajo, se llevaría
     puesto el caso por el que existe todo esto: quien lleva 20 horas adentro y no marcó la salida. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const hace20h = new Date(Date.now() - 20*3600*1000).toISOString();
  const evs = [{ fecha:hace20h.slice(0,10), hora:hace20h.slice(11,16), iso:hace20h, persona:'Beto Pérez',
                 empresa:'Helitec', departamento:'Op', cargo:'Piloto', evento:'llegada_aero',
                 test:'', resultado:null, plan: Y4_PLAN }];
  const r = api.leerDuty(evs, 7);
  const jor = r.diario[0].tramos.find(t => t.tramo === 'jornada');
  PRUEBAS.falso(jor.abandonado,
    '⚠️ 20 h dentro de un ciclo de 14 h todavía NO es abandono: el techo son dos ciclos completos');
  PRUEBAS.alMenos(jor.exceso, 400, 'y sigue contando su exceso (dio ' + jor.exceso + ')');
});

PRUEBAS.caso('⚠️ EL TURNO NOCTURNO se mide como UNA jornada, no como dos medias', () => {
  /* ⚠️ ESTE PROYECTO YA SUFRIÓ ESTE ERROR, con otro nombre. El comentario de `turnosHoy` en la app
     lo documenta textual (I4): "los tres registros se guardan con la fecha del día, así que un turno
     de noche (entra 23:00, sale 07:00) queda partido en dos… la tarjeta le volvía a pedir el
     check-in a alguien que ya lo había hecho — la mitad de las noches, en una operación con turnos
     nocturnos."
     Agrupar el duty por `fecha` repite el mismo error en el peor lugar: los turnos nocturnos son
     los de MAYOR riesgo de fatiga, que es el motivo por el que existe este producto. Partido en dos
     días, ninguna de las dos mitades excede nada, y el que trabajó de noche desaparece del panel. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  // Entra el 1 a las 23:00, sale el 2 a las 09:00 → 10 h de jornada, límite 8 → 2 h de exceso.
  const plan8 = JSON.stringify({ traslado_ida:60, jornada:480, traslado_vta:60 });
  const evs = y4Filas([
    ['2026-09-01','23:00','2026-09-01T23:00:00.000Z','op_a','Ana Suárez','Helitec','Op','Piloto','llegada_aero','','',plan8],
    ['2026-09-02','09:00','2026-09-02T09:00:00.000Z','op_b','Ana Suárez','Helitec','Op','Piloto','salida_aero','','',plan8],
  ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 1,
    '⚠️ tiene que ser UNA jornada, no dos medias (dio ' + r.diario.length + ')');
  PRUEBAS.igual(r.diario[0].jornadaMin, 600, 'diez horas de jornada, de punta a punta');
  PRUEBAS.igual(r.diario[0].excesoMin, 120,
    '⚠️ dos horas por encima del límite de ocho. Partido por fecha, cada mitad quedaba por debajo ' +
    'y el turno nocturno —el de mayor riesgo de fatiga— no aparecía nunca');
  PRUEBAS.igual(r.diario[0].fecha, '2026-09-01',
    'y la jornada se atribuye al día en que EMPEZÓ, que es cuando la persona entró a trabajar');
});

PRUEBAS.caso('⚠️ pero dos jornadas separadas siguen siendo dos (el discriminador)', () => {
  /* El control. Si la ventana que junta los eventos fuera demasiado ancha, dos días de trabajo
     normales se fusionarían en una sola jornada monstruosa y todo el mundo aparecería excedido. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([
    y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-01','17:00','salida_aero'),
    y4Ev('Ana Suárez','2026-09-02','06:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-02','17:00','salida_aero'),
  ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 2,
    '⚠️ dos días de trabajo separados por una noche entera son DOS jornadas (dio ' + r.diario.length + ')');
  PRUEBAS.igual(r.diario[0].jornadaMin, 660, 'de once horas cada una');
  PRUEBAS.igual(r.diario[1].jornadaMin, 660, 'no una de veintidós');
});

PRUEBAS.grupo('Y4c · los bordes que quedaron sin cubrir');

PRUEBAS.caso('⚠️ dos jornadas el MISMO día se cuentan como dos', () => {
  /* Un piloto que hace dos rotaciones en el día: entra 05:00, sale 11:00, vuelve a entrar 15:00 y
     sale 21:00. Son 12 h de jornada real. Si se juntaran en una sola —de 05:00 a 21:00— darían 16 h
     y aparecería excedido sin estarlo. Si se contara sólo la primera, se perderían 6 h. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([
    y4Ev('Ana Suárez','2026-09-01','05:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-01','11:00','salida_aero'),
    y4Ev('Ana Suárez','2026-09-01','15:00','llegada_aero'), y4Ev('Ana Suárez','2026-09-01','21:00','salida_aero'),
  ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 2, '⚠️ dos rotaciones son dos jornadas (dio ' + r.diario.length + ')');
  PRUEBAS.igual(r.diario[0].jornadaMin + r.diario[1].jornadaMin, 720,
    'y suman las 12 h reales, ni 16 (fusionadas) ni 6 (perdiendo una)');
});

PRUEBAS.caso('⚠️ un ISO inválido no rompe el cálculo de los demás', () => {
  /* Sheets reinterpreta celdas y este CH lo edita gente a mano. Una fila con la fecha rota no puede
     tumbar el panel entero ni, peor, hacer que el resto de las jornadas desaparezca en silencio. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([
    ['2026-09-01','06:00','no-es-una-fecha','op_x','Ana Suárez','Helitec','Op','Piloto','llegada_aero','','',Y4_PLAN],
    y4Ev('Beto Pérez','2026-09-01','06:00','llegada_aero'), y4Ev('Beto Pérez','2026-09-01','19:30','salida_aero'),
  ]);
  let r = null;
  try { r = api.leerDuty(evs, 7); } catch(e){ PRUEBAS.cierto(false, 'no puede lanzar: ' + e.message); return; }
  PRUEBAS.cierto(!!r, 'tiene que devolver algo');
  const beto = r.diario.find(f => f.persona === 'Beto Pérez');
  PRUEBAS.cierto(!!beto, '⚠️ y la jornada válida de al lado tiene que seguir ahí');
  PRUEBAS.igual(beto.excesoMin, 90, 'con su exceso bien medido');
});

PRUEBAS.caso('⚠️ un plan con un tramo en cero no inventa un exceso infinito', () => {
  /* Si una empresa configura la jornada en 0 —por error de carga, o porque Sheets convirtió el
     valor— cualquier minuto trabajado sería "exceso". Un previsto de 0 significa "no configurado",
     no "no puede trabajar ni un minuto". */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const plan0 = JSON.stringify({ traslado_ida:60, jornada:0, traslado_vta:60 });
  const evs = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero', plan0),
                        y4Ev('Ana Suárez','2026-09-01','18:00','salida_aero',  plan0) ]);
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario[0].excesoMin, 0,
    '⚠️ previsto 0 es "no configurado", no "cero minutos permitidos" — 12 h no pueden dar 720 de exceso');
});

PRUEBAS.caso('⚠️ dos personas con el mismo nombre en empresas distintas no se mezclan', () => {
  /* El mismo problema de identidad que mordió en los ids de upsert, acá. Si se juntaran, la jornada
     de uno se sumaría a la del otro y los dos aparecerían con el doble de horas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const evs = y4Filas([
    y4Ev('José Rodríguez','2026-09-01','06:00','llegada_aero'), y4Ev('José Rodríguez','2026-09-01','17:00','salida_aero'),
  ]).concat(y4Filas([
    y4Ev('José Rodríguez','2026-09-01','06:00','llegada_aero'), y4Ev('José Rodríguez','2026-09-01','17:00','salida_aero'),
  ]).map(f => Object.assign({}, f, { empresa:'Aeroambulancias Silva' })));
  const r = api.leerDuty(evs, 7);
  PRUEBAS.igual(r.diario.length, 2, '⚠️ son dos personas distintas: dos jornadas');
  PRUEBAS.igual(r.personas.length, 2, 'y dos filas en el acumulado');
  r.diario.forEach(f => PRUEBAS.igual(f.jornadaMin, 660, 'cada uno con SUS once horas, no veintidós'));
});

PRUEBAS.caso('⚠️ el orden de las filas no cambia el resultado', () => {
  /* La hoja se lee de atrás para adelante y se invierte; una fila cargada a mano puede quedar fuera
     de orden. El cálculo tiene que ordenar por su cuenta y no confiar en cómo llegó. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y4Env([]);
  const enOrden = y4Filas([ y4Ev('Ana Suárez','2026-09-01','06:00','llegada_aero'),
                            y4Ev('Ana Suárez','2026-09-01','19:30','salida_aero') ]);
  const alReves = enOrden.slice().reverse();
  const a = api.leerDuty(enOrden, 7), b = api.leerDuty(alReves, 7);
  PRUEBAS.igual(b.diario[0].jornadaMin, a.diario[0].jornadaMin, '⚠️ mismo resultado en cualquier orden');
  PRUEBAS.igual(b.diario[0].excesoMin, 90, 'y el exceso correcto, no negativo ni cero');
});
