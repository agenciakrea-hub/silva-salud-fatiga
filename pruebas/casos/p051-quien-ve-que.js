/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P051 · LA LÁMINA "QUIÉN VE QUÉ" DEL CARRUSEL                                    (2026-09-06)

   ⚠️ ESTO NO VIGILA UN TEXTO: VIGILA QUE EL TEXTO SIGA SIENDO CIERTO.
   La lámina 4 dejó de ser un párrafo corrido y pasó a ser un esquema de filas —una por rol— con lo
   que recibe cada uno. Desde P307 (2026-10-21) son SEIS: cada persona, supervisión, servicio médico,
   HSEQ, Dirección y la administración de la plataforma. Se lee justo antes de que
   la persona decida si contesta la verdad, así que una línea que prometa más privacidad de la que
   hay es peor que no decir nada (R4).

   ── LA DIFERENCIA CON X1, Y ES DELIBERADA ───────────────────────────────────────────────────
   `x1-quien-ve-que.js` prueba los HELPERS del recorte (`armarAptitudServer`, `anonimizarHseq`) con
   los datos armados a mano. Eso comprueba la pieza, no el uso: si mañana `accionSupervisor` deja
   de llamar a uno de esos helpers, o llama a uno y no al otro, o agrega un campo DESPUÉS del
   recorte, X1 sigue en verde y la fuga existe. Es exactamente la forma en que ya se perdieron
   `duty`, `ausencias` y `ausenteHoy` (R17).
   Acá se entra por `accionSupervisor(p)` y `accionEmpleado(p)` DE VERDAD, con las tres contraseñas
   de la hoja `Accesos`, y se mira la respuesta completa que sale por el cable. Es más caro de
   montar y es la única forma de que una fuga nueva se ponga roja.

   ── P307 · LA REGLA DE ESTE PROMPT: SÓLO LO QUE HOY ES CIERTO, O LO QUE ANUNCIA ACCESO ──────
   HSEQ y Dirección reciben hoy EXACTAMENTE lo mismo (ADR 017; medido el 2026-10-21). Los textos los
   distinguen por lo que ANUNCIAN —HSEQ va a ver valores del grupo (`P308`) y su nombre en la forma 008
   (`P331`)—, que se puede decir antes de darlo. Lo que RESTRINGE —«de tus tests, HSEQ ve sólo totales
   de 5 o más»— lo escribe `P308` en la misma versión en que el servidor lo cumple: el caso «LA
   RESTRICCIÓN DE P308 TODAVÍA NO SE ESCRIBE» de abajo se pone en rojo si alguien la adelanta.

   ── POR QUÉ LA FILA DE DIRECCIÓN NO PROMETÍA ANONIMATO (hasta A13) ─────────────────────────
   Medido corriendo el endpoint el 2026-09-06: la respuesta de la vista `hseq` reemplaza el nombre
   por P1/P2 en `registros`, `aptitud`, `operacional` y `turnos`, pero TODAVÍA se le escapan tres
   identificadores por otras puertas — la cédula en `operacional[]`/`turnos[]`, la nómina entera
   por nombre en `nominaSinDato`, y nombre+cédula en las claves de `ausencias`. Mientras eso siga
   así, escribir «sin tu nombre» en la lámina sería mentir.
   El caso «EL CANDADO» de abajo es lo que sostiene esa decisión en el tiempo: si alguien escribe
   la promesa sin haber cerrado antes la fuga, se pone rojo. Y cuando la fuga se cierre, dice en su
   mensaje que el texto ya se puede reforzar — que es la otra mitad del trabajo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · el contrato con el servidor');

/* Las cadenas de la lámina. Vive acá arriba porque la usan cinco casos. */
const P051_CLAVES = ['car4_tit', 'car4_yo_t', 'car4_yo_d', 'car4_sup_t', 'car4_sup_d',
                     'car4_med_t', 'car4_med_d', 'car4_dir_t', 'car4_dir_d', 'car4_hseq_t', 'car4_hseq_d',
                     'car4_adm_t', 'car4_adm_d', 'car4_pie'];
/* P307 · TODAS las que dicen quién ve qué, no sólo la lámina: el plan lo pide así, porque una promesa
   corregida en un lugar y vieja en otro sigue siendo una promesa falsa. */
const P051_PROMESA_CLAVES = P051_CLAVES.concat([
  'priv_corta', 'priv_intro', 'priv_sup_1', 'priv_sup_2', 'priv_sup_3', 'priv_sup_4', 'priv_sup_5', 'priv_sup_6',
  'priv_med_1', 'priv_med_2', 'priv_med_3', 'priv_med_4',
  'priv_dir_t', 'priv_dir_1', 'priv_dir_2', 'priv_dir_3', 'priv_dir_4',
  'priv_hseq_t', 'priv_hseq_1', 'priv_hseq_2', 'priv_hseq_3', 'priv_adm_t', 'priv_adm_1', 'priv_pie',
  'consent_roles_html', 'pg_hint_hseq', 'pg_desc_hseq', 'pg_desc_med', 'rol_of_guia_hseq', 'hlp_idc',
  'cic_hseq_d', 'cic_hseq_exc',
  'doc_2_p', 'doc_2_p2', 'doc_2_f2d', 'doc_2_f6', 'doc_2_f6a', 'doc_2_f6b', 'doc_2_f7', 'doc_2_f7b', 'doc_2_f8',
  'doc_c_hseq', 'doc_c_admin']);
/* Las que prometen algo de HSEQ o de Dirección (las que mira el candado). */
const P051_PROMESA_HSEQ_DIR = ['car4_hseq_d', 'car4_dir_d', 'priv_hseq_1', 'priv_dir_1', 'priv_dir_2',
                               'consent_roles_html', 'pg_hint_hseq', 'pg_desc_hseq', 'rol_of_guia_hseq'];

function p051Texto(clave, lang) {
  const antes = idiomaActual();
  try { fijarIdioma(lang || 'es'); return String(t(clave) || ''); }
  finally { fijarIdioma(antes); }
}

/* ── El CH de prueba ────────────────────────────────────────────────────────────────────────────
   Una empresa, tres personas: dos con tests y una que sólo está en la nómina. Alcanza para que
   cada afirmación de la lámina tenga algo que comprobar y para que el recorte tenga algo que
   recortar. Las columnas salen de las constantes del `.gs` (COL_PERSONA=2, COL_DEPTO=3,
   COL_EMPRESA=73, COL_FECHA=74, COL_KSS=87 — todas 1-based; COLS_COMENTARIOS son 0-based y el de
   Fatiga es el 85). */
const P051_HOY = new Date().toISOString().substring(0, 10);

function p051Fila(persona, dep, empresa, kss, comentario) {
  const f = new Array(90).fill('');
  f[0] = P051_HOY + ' 08:00:00';   // marca temporal
  f[1] = persona;                  // COL_PERSONA
  f[2] = dep;                      // COL_DEPTO
  f[72] = empresa;                 // COL_EMPRESA
  f[73] = P051_HOY;                // COL_FECHA
  f[86] = kss;                     // COL_KSS
  if (comentario) f[85] = comentario;
  return f;
}

function p051Hojas() {
  return {
    /* `ClaveHseq` es la de Dirección (la «Contraseña HSQ» de antes de P306: `accCols` la toma por
       «hs»); `Clave panel HSEQ`, la del panel de HSEQ. Y el administrador, que la lámina nombra desde P307. */
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq', 'Clave panel HSEQ'],
                ['*', 'adm-051', 'admin', '', '', '', ''],
                ['helitec', 'sup-051', 'empresa', 'Helitec', 'med-051', 'dir-051', 'hseq-051']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p051Fila('Ana Suárez', 'Operaciones', 'Helitec', 7, 'Dormí muy mal, tengo un problema en casa'),
      p051Fila('Luis Ferrer', 'Mantenimiento', 'Helitec', 3, '')],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono',
                'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
               ['Helitec', 'Ana Suárez',   'V-11111', 'Operaciones',   'Piloto',  'F', '40', '', '', 'Si', '', 'empleado', '3'],
               ['Helitec', 'Luis Ferrer',  'V-22222', 'Mantenimiento', 'Técnico', 'M', '35', '', '', 'No', '', 'empleado', '2'],
               ['Helitec', 'Carmen Rojas', 'V-33333', 'Operaciones',   'Piloto',  'F', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    /* P307 · dos personas en el ciclo, y la de Luis PRIMERO: si el ciclo numerara sus alias por su cuenta
       (P1 = el primero que aparece), el «ese alias» de `priv_dir_1` sería falso y el caso lo ve. */
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento',
                     'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
                    [P051_HOY, '05:00', P051_HOY + 'T05:00:00.000Z', 'op0', 'Luis Ferrer', 'Helitec',
                     'Mantenimiento', 'Técnico', 'salida_casa', 'kss', 3, ''],
                    [P051_HOY, '06:00', P051_HOY + 'T06:00:00.000Z', 'op1', 'Ana Suárez', 'Helitec',
                     'Operaciones', 'Piloto', 'salida_casa', 'kss', 7, '']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga'],
               [P051_HOY, '06:10', 't1', 'checkin', 'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', 7, 4]],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor'],
                  ['a1', 'Helitec', 'V-33333', 'Carmen Rojas', P051_HOY, P051_HOY, 'vacaciones', 'vigente', '', 'sup']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
}

/* Corre el endpoint DE VERDAD y devuelve las respuestas, una por rol. Se arma una sola vez por caso
   (no una por rol) para no leer el `.gs` de 390 KB varias veces.
   ⚠️ P307 · `direccion` y `hseq` son DOS respuestas: entran con contraseñas distintas y sólo las separa
   la marca `panel` (ADR 017). Hasta P306 la clave `hseq` de acá era la de Dirección. */
function p051Respuestas() {
  const env = GS.crearEntorno(p051Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'accionEmpleado']);
  const como = clave => JSON.parse(
    api.accionSupervisor({ usuario: 'helitec', pass: clave, dispositivoId: 'p051' }).getContent());
  return {
    yo: JSON.parse(api.accionEmpleado({ persona: 'Ana Suárez', empresa: 'Helitec',
                                        cedula: 'V-11111', dispositivoId: 'p051' }).getContent()),
    supervisor: como('sup-051'),
    medico: como('med-051'),
    direccion: como('dir-051'),
    hseq: como('hseq-051'),
    admin: JSON.parse(api.accionSupervisor({ usuario: '*', pass: 'adm-051', dispositivoId: 'p051',
                                              empresa: 'Helitec' }).getContent())
  };
}

/* Los indicadores se leen del `.gs`, no se copian: si mañana agregan uno, este archivo lo mira
   también. Mismo criterio que X1. */
function p051Metricas() {
  const m = /var METRICAS\s*=\s*\[([^\]]+)\]/.exec(CTX.gs || '');
  return m ? m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · el endpoint contesta las seis vistas', () => {
  /* Sin esto, cualquier error de montaje del CH falso dejaría a los casos de abajo comprobando
     sobre `undefined` — y varios de ellos son "no aparece X", que con un objeto vacío dan verde.
     Un cero sin discriminador no es un resultado (R17). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const r = p051Respuestas();
  PRUEBAS.igual([r.yo.ok, r.supervisor.ok, r.medico.ok, r.direccion.ok, r.hseq.ok, r.admin.ok],
    [true, true, true, true, true, true],
    '⚠️ alguna de las seis llamadas falló · ' + JSON.stringify({
      yo: r.yo.error || r.yo.motivo, sup: r.supervisor.error, med: r.medico.error,
      dir: r.direccion.error, hseq: r.hseq.error, adm: r.admin.error }));
  PRUEBAS.igual([r.supervisor.vista, r.medico.vista, r.direccion.vista, r.hseq.vista],
    ['supervisor', 'medico', 'hseq', 'hseq'],
    'y cada contraseña tiene que abrir SU vista: si dos abren la misma, el resto no compara nada');
  PRUEBAS.igual([r.direccion.panel, r.hseq.panel, r.admin.rol], ['direccion', 'hseq', 'admin'],
    '⚠️ y Dirección y HSEQ, que comparten la vista, se distinguen por la marca (ADR 017)');
  PRUEBAS.alMenos((r.medico.registros || []).length, 1,
    'el CH de prueba tiene que traer registros, o "no hay puntajes" sería cierto por vacío');
  PRUEBAS.alMenos(p051Metricas().length, 5, 'y los indicadores tienen que leerse del .gs');
});

PRUEBAS.caso('⚠️ FILA "TÚ" · tus resultados completos, con los puntajes, y 30 días de historial', () => {
  /* `car4_yo_d`. Es la única fila que promete MÁS y no menos, así que se rompe al revés: si el
     endpoint dejara de mandarle sus valores a la persona, la lámina prometería algo que la app no
     entrega, y ya pasó — hasta Y1 su ciclo vivía sólo en el teléfono. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const mio = (r.yo.registros || [])[0] || {};
  const conValor = mets.filter(m => mio[m] != null);
  PRUEBAS.alMenos(conValor.length, 1,
    '⚠️ la persona tiene que recibir SUS puntajes · llegó: ' + JSON.stringify(mio));
  PRUEBAS.igual((r.yo.operacionalPeriodo || {}).dias, 30,
    '⚠️ el texto dice "tu historial de 30 días" · si el endpoint cambia el período, cambia el texto');
  const evento = (r.yo.operacional || [])[0] || {};
  PRUEBAS.cierto(evento.resultado != null,
    'y sus propios eventos del ciclo le llegan con el valor, no con el semáforo · ' + JSON.stringify(evento));
});

PRUEBAS.caso('⚠️ FILA "SUPERVISOR" · ni un puntaje, ni un comentario', () => {
  /* `car4_sup_d`: "Ningún puntaje y ningún comentario". Es la promesa más fuerte de la lámina.
     Se mira la RESPUESTA ENTERA, no un campo: si un puntaje se cuela por `operacional`, por
     `turnos` o por un campo nuevo, la promesa está rota igual (K1a se abrió por esa puerta). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const fila = (r.supervisor.registros || [])[0] || {};
  PRUEBAS.igual(mets.filter(m => fila[m] !== undefined), [],
    '⚠️ ningún indicador puede sobrevivir en `registros` · ' + JSON.stringify(fila));
  PRUEBAS.igual(r.supervisor.pvt, [], '⚠️ ni el test de reacción');
  PRUEBAS.igual(r.supervisor.comentarios, [],
    '⚠️ ni una línea de lo que la persona escribió: el servidor ni se los manda');
  const conResultado = (r.supervisor.operacional || []).filter(o => o.resultado !== undefined);
  PRUEBAS.igual(conResultado, [],
    '⚠️ y el ciclo viaja con el NIVEL, nunca con el puntaje (K1a) · ' + JSON.stringify(conResultado));
  const conKss = (r.supervisor.turnos || []).filter(o => o.kss !== undefined);
  PRUEBAS.igual(conKss, [], '⚠️ ni el KSS del turno · ' + JSON.stringify(conKss));
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR de la fila anterior: el médico SÍ recibe todo eso', () => {
  /* Sin esto, un CH de prueba mal armado —una fila que no parsea, una empresa que no cruza— daría
     "no hay puntajes" para TODOS los roles y el caso de arriba pasaría sin comprobar nada. Con
     esto, "el supervisor no los tiene" sólo puede significar que se los recortaron. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const fila = (r.medico.registros || [])[0] || {};
  PRUEBAS.alMenos(mets.filter(m => fila[m] != null).length, 1,
    '⚠️ el servicio médico recibe los valores crudos · ' + JSON.stringify(fila));
  PRUEBAS.alMenos((r.medico.comentarios || []).length, 1,
    '⚠️ y los comentarios: `car4_med_d` se los promete a la persona');
  const conResultado = (r.medico.operacional || []).filter(o => o.resultado != null);
  PRUEBAS.alMenos(conResultado.length, 1, 'y el ciclo con el puntaje, que es lo que él necesita');
});

/* Lo que `car4_dir_d`, `car4_hseq_d`, `priv_dir_*` y `priv_hseq_1` prometen de las dos vistas, contra
   SU respuesta. Las dos mitades importan:
     · la primera es el aviso incómodo —ven el nivel de ansiedad y el de ánimo, uno por uno, de cada
       persona con seudónimo— y está a propósito, por el mismo motivo por el que X1 lo dice:
       suavizarlo sería falso;
     · la segunda es la promesa —ni puntajes, ni el test de reacción, ni comentarios—, y se comprueba
       igual que la del supervisor. */
function p051SinValoresYMismoSemaforo(r, cual, nombre) {
  const resp = r[cual], mets = p051Metricas();
  const fila = (resp.registros || [])[0] || {};
  PRUEBAS.igual(mets.filter(m => fila[m] !== undefined), [],
    '⚠️ ningún indicador en `registros` de ' + nombre + ' · ' + JSON.stringify(fila));
  PRUEBAS.igual(resp.pvt, [], '⚠️ ni el test de reacción (' + nombre + ')');
  PRUEBAS.igual(resp.comentarios, [], '⚠️ ni los comentarios (' + nombre + ')');
  PRUEBAS.igual((resp.operacional || []).filter(o => o.resultado !== undefined), [],
    '⚠️ ni un puntaje en el ciclo (' + nombre + ')');
  PRUEBAS.igual((resp.turnos || []).filter(o => o.kss !== undefined), [], '⚠️ ni el KSS del turno (' + nombre + ')');
  /* P307 · `priv_dir_1`: «el nivel de cada indicador, tu ciclo, tu jornada y la carga de trabajo que
     declaras, sin tu nombre: cada persona aparece como P1, P2… con su departamento». Se comprueba que
     llega —si un día dejara de llegar, el texto diría de más— y que es EL MISMO alias en todas las
     colecciones: se cruza por departamento, que es lo único que distingue a dos alias sin nombre. */
  const depDe = {};
  (resp.aptitud || []).forEach(a => { depDe[a.nombre] = a.dep; });
  const ciclo = (resp.operacional || []);
  PRUEBAS.alMenos(ciclo.length, 2, 'guarda: el ciclo trae a las dos personas del CH de prueba (' + nombre + ')');
  PRUEBAS.igual(ciclo.filter(o => !/^P\d+$/.test(o.persona || '') || !o.fecha || depDe[o.persona] !== o.departamento)
    .map(o => o.persona + '·' + o.departamento), [],
    '⚠️ el ciclo llega por persona, con el día y con EL MISMO alias que su semáforo (' + nombre + ')');
  const turnos = (resp.turnos || []);
  PRUEBAS.cierto(turnos.length > 0 && turnos.every(o => /^P\d+$/.test(o.persona || '') && !!o.fecha && o.carga != null),
    '⚠️ la carga que declara cada persona le llega, por alias y con el día (' + nombre + ') · ' + JSON.stringify(turnos[0] || {}));
  const jornada = ((resp.duty || {}).diario || []);
  PRUEBAS.cierto(jornada.length > 0 && jornada.every(o => /^P\d+$/.test(o.persona || '') && !!o.fecha),
    '⚠️ y la jornada (`duty`), por alias y con el día (' + nombre + ')');
  /* "Lo mismo que el supervisor": se compara nivel por nivel, no la cantidad de filas. Si un día se
     le recortara también el nivel, el texto pasaría a decir de más. */
  const niveles = x => (x.aptitud || []).map(a => (a.metricas || []).map(m => m.m + '=' + m.nivel).join(','));
  PRUEBAS.alMenos(niveles(r.supervisor).length, 1, 'guarda: el supervisor tiene que traer aptitud');
  PRUEBAS.igual(niveles(resp), niveles(r.supervisor),
    '⚠️ ' + nombre + ' recibe EL MISMO semáforo por indicador que el supervisor · sup: ' +
    JSON.stringify(niveles(r.supervisor)) + ' · ' + nombre + ': ' + JSON.stringify(niveles(resp)));
}

PRUEBAS.caso('⚠️ FILA "DIRECCIÓN" · ni puntajes ni comentarios, y el MISMO semáforo que el supervisor', () => {
  /* R19 · lo concede `accionSupervisor` con la contraseña de Dirección (`validarAcceso` → vista `hseq`
     sin marca), y lo recorta `anonimizarHseq`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  p051SinValoresYMismoSemaforo(p051Respuestas(), 'direccion', 'Dirección');
});

PRUEBAS.caso('⚠️ FILA "HSEQ" · hoy recibe lo mismo que Dirección', () => {
  /* R19 · `accionSupervisor` con la contraseña del panel de HSEQ (`validarAcceso` → `panel:"hseq"`).
     `car4_hseq_d` y `priv_hseq_2` ANUNCIAN «valores del grupo»: eso lo da `P308`, y anunciar acceso
     antes de darlo está permitido; lo que no se puede es prometer una restricción antes de cumplirla.
     `priv_hseq_1` es de HOY: «lo mismo que Dirección». */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  p051SinValoresYMismoSemaforo(r, 'hseq', 'HSEQ');
  /* Hoy Dirección y HSEQ reciben lo mismo (ADR 017): si eso cambia —`P308`—, este caso lo ve y los
     textos de los dos se tienen que revisar. */
  const sinMarca = x => JSON.stringify(Object.assign({}, x, { panel: null }));
  PRUEBAS.igual(sinMarca(r.hseq) === sinMarca(r.direccion), true,
    '⚠️ HSEQ y Dirección reciben lo mismo HOY · si dejan de hacerlo, los textos que los igualan dejan de ser ciertos');
});

PRUEBAS.caso('⚠️ FILA "ADMINISTRACIÓN" · todo, con nombre', () => {
  /* R19 · `validarAcceso` le da a la fila `*` el rol `admin`, y `accionSupervisor` le entrega la vista
     médica de la empresa que elige, sin recorte. `car4_adm_d`, `priv_adm_1` y el consentimiento lo
     dicen: si un día se le recortara algo, la promesa diría de más; si nadie lo dijera, de menos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  PRUEBAS.alMenos(p051FugasEn(r.admin).length, 3, '⚠️ con nombre: le llegan nombres y cédulas');
  const fila = (r.admin.registros || [])[0] || {};
  PRUEBAS.alMenos(mets.filter(m => fila[m] != null).length, 1, '⚠️ y los valores · ' + JSON.stringify(fila));
  PRUEBAS.alMenos((r.admin.comentarios || []).length, 1, '⚠️ y los comentarios');
});

/* ── EL CANDADO ────────────────────────────────────────────────────────────────────────────────
   Busca cualquier identificador real de las personas de prueba en el JSON que sale para Dirección.
   Se busca por PEDAZOS (nombre, apellido, cédula sin prefijo) y sobre el JSON entero: un campo
   nuevo que se olviden de anonimizar cae acá aunque nadie lo nombre. */
const P051_IDENTIFICADORES = ['Ana', 'Suárez', 'Suarez', 'Luis', 'Ferrer', 'Carmen', 'Rojas',
                              '11111', '22222', '33333'];
function p051FugasEn(objeto) {
  const texto = JSON.stringify(objeto || {});
  return P051_IDENTIFICADORES.filter(x => texto.indexOf(x) >= 0);
}
/* Palabras con las que se escribiría la promesa de anonimato, en los dos idiomas. */
const P051_PROMESA = /sin (tu |el )?nombre|an[óo]nim|\bP1\b|without (your |the )?name|anonym/i;

PRUEBAS.caso('🔴 EL CANDADO · ni Dirección ni HSEQ prometen anonimato mientras su payload lo rompa', () => {
  /* ⚠️ ESTE ES EL CASO POR EL QUE EXISTE EL ARCHIVO.
     La versión honesta de la lámina sería «y sin tu nombre: apareces como P1, P2…», que es lo que
     `anonimizarHseq` hace con `registros`, `aptitud`, `operacional` y `turnos`. Medido el
     2026-09-06 corriendo `accionSupervisor`, esa frase HOY sería falsa: en la misma respuesta
     viajan la cédula (en `operacional[]` y `turnos[]`, que `anonimizarHseq` no toca), la nómina
     entera por nombre en `nominaSinDato` —el bloque se calcula DESPUÉS de anonimizar, así que
     ningún nombre cruza y caen todos— y nombre+cédula en las claves de `ausencias`.
     Así que la regla que este caso sostiene es una sola: **la promesa y la fuga no pueden convivir**.
     · Si alguien cierra la fuga en el `.gs`, el caso pasa igual y el mensaje dice que el texto ya
       se puede reforzar.
     · Si alguien escribe la promesa sin cerrarla, se pone rojo.
     Lo que NO hace es fallar hoy: la fuga es un cambio de seguridad del endpoint y lo decide
     Franco, no esta suite. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  /* P307 · las dos vistas, y TODAS las cadenas que prometen algo de ellas, no sólo la de la lámina. */
  const fugas = p051FugasEn(r.direccion).concat(p051FugasEn(r.hseq));
  const prometen = P051_PROMESA_HSEQ_DIR.filter(k =>
    P051_PROMESA.test(p051Texto(k, 'es') + ' ' + p051Texto(k, 'en')));

  if (fugas.length) {
    PRUEBAS.igual(prometen, [],
      '🔴 el payload de Dirección o de HSEQ todavía lleva identificadores (' + fugas.join(', ') + '), ' +
      'así que ninguna cadena puede prometer anonimato');
  } else {
    PRUEBAS.alMenos(prometen.length, 2,
      '✔ la fuga está cerrada y las cadenas lo dicen («sin nombres», «P1, P2…») · si dejaran de decirlo, ' +
      'la persona perdería lo que necesita leer: ' + prometen.join(', '));
  }
  /* Y que el buscador de fugas encuentre algo cuando lo hay: sin esto, el día que `p051FugasEn`
     se rompa (un JSON.stringify que falla, una lista vacía) la rama de arriba diría "fuga cerrada"
     sin haber mirado nada. */
  PRUEBAS.igual(p051FugasEn({ x: 'Ana Suárez', y: { z: 'V-11111' } }).sort(),
    ['11111', 'Ana', 'Suárez'].sort(),
    '⚠️ discriminador: el buscador de fugas tiene que encontrar un nombre y una cédula puestos a mano');
  PRUEBAS.igual(p051FugasEn({ persona: 'P1', dep: 'Operaciones' }), [],
    'y no marcar un payload ya anonimizado');
});

PRUEBAS.caso('el DISCRIMINADOR del detector de promesa: reconoce cómo se escribiría', () => {
  /* El candado de arriba se apoya en una expresión regular. Si estuviera mal escrita diría
     "no promete nada" sobre un texto que promete, y el candado quedaría abierto sin que se note. */
  ['Ve todo sin tu nombre', 'Los datos le llegan anónimos', 'Apareces como P1, P2, P3…',
   'They see it without your name', 'Fully anonymised'].forEach(s =>
    PRUEBAS.cierto(P051_PROMESA.test(s), 'tiene que detectar «' + s + '»'));
  ['El mismo semáforo por indicador que tu supervisor. Tampoco puntajes ni comentarios.',
   'The same per-indicator status your supervisor sees. No scores and no comments either.']
    .forEach(s => PRUEBAS.falso(P051_PROMESA.test(s), 'y no marcar el texto vigente: «' + s + '»'));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · la pantalla');

/* Abre el carrusel en la lámina 4 y lo deja como estaba. Mismo patrón que `p041Con`. */
function p051Con(fn) {
  const ov = document.getElementById('carruselOv');
  const ya = ov.classList.contains('show');
  const idx = (typeof CAR_IDX !== 'undefined') ? CAR_IDX : 0;
  ov.classList.add('show');
  if (typeof CAR_IDX !== 'undefined') { CAR_IDX = 3; try { carruselPintar(); } catch (e) {} }
  void document.body.offsetWidth;
  try { return fn(document.querySelector('.car-slide--esquema')); }
  finally {
    CAR_IDX = idx; try { carruselPintar(); } catch (e) {}
    if (!ya) ov.classList.remove('show');
  }
}

PRUEBAS.caso('son SEIS filas, una por rol, y las seis se están midiendo', () => {
  const m = p051Con(sl => {
    if (!sl) return null;
    const filas = [...sl.querySelectorAll('.car-quien li')];
    return {
      n: filas.length,
      altos: filas.map(li => Math.round(li.getBoundingClientRect().height)),
      roles: filas.map(li => (li.querySelector('.cq-rol') || {}).textContent || ''),
      hayParrafo: !!sl.querySelector('.car-cuerpo')
    };
  });
  PRUEBAS.cierto(!!m, '⚠️ no existe la lámina del esquema (`.car-slide--esquema`)');
  if (!m) return;
  PRUEBAS.igual(m.n, 6, 'seis filas: cada persona, supervisión, servicio médico, Dirección, HSEQ y administración');
  PRUEBAS.igual(m.altos.filter(h => h <= 0), [],
    '⚠️ una fila que mide 0 no se ve · alturas: ' + m.altos.join(', '));
  PRUEBAS.igual(m.roles, [t('car4_yo_t'), t('car4_sup_t'), t('car4_med_t'), t('car4_dir_t'), t('car4_hseq_t'), t('car4_adm_t')],
    'y los seis rótulos salen de `t()`, en ese orden (HSEQ después de Dirección: su fila dice «lo mismo que Dirección»)');
  PRUEBAS.falso(m.hayParrafo,
    'el párrafo corrido se fue: si conviven, quedan dos textos diciendo lo mismo y uno se queda viejo');
});

/* Mide dónde arranca y dónde termina el contenido de la lámina, en coordenadas del contenido
   (no de la pantalla): sumar `scrollTop` es lo que hace que el número no dependa de dónde esté
   parado el scroll. Se ignoran los hijos de alto 0 — el ícono se esconde con la letra grande y en
   pantalla baja, y contarlo hacía que "el contenido arranca en 0" pareciera un recorte. */
function p051Extension(sl) {
  const rs = sl.getBoundingClientRect();
  const vis = [...sl.children].filter(e => e.getBoundingClientRect().height > 0);
  if (!vis.length) return null;
  const tops = vis.map(e => e.getBoundingClientRect().top - rs.top + sl.scrollTop);
  const bots = vis.map(e => e.getBoundingClientRect().bottom - rs.top + sl.scrollTop);
  return { arriba: Math.round(Math.min(...tops)), fondo: Math.round(Math.max(...bots)),
           client: sl.clientHeight,
           scrollea: ['auto', 'scroll'].indexOf(getComputedStyle(sl).overflowY) >= 0 };
}

PRUEBAS.caso('⚠️ el esquema ENTRA en la lámina a los cinco tamaños de referencia', () => {
  /* `.car-viewport` tiene `overflow:hidden`, así que lo que no entra desaparece SIN barra que lo
     delate — en la pantalla donde se hace una promesa de privacidad. Con la letra en su tamaño
     normal el esquema tiene que ENTRAR, no scrollear: el scroll es la red de abajo para la letra
     grande, no el comportamiento esperado.
     ⚠️ `scrollHeight` NO sirve para detectar el recorte: crece con el contenido aunque el
     `overflow` sea `hidden`, así que compararse contra él da verde siempre. Se compara contra
     `clientHeight`, que es lo que de verdad se ve. */
  const malos = [];
  PRUEBAS.VENTANAS.forEach(v => {
    const m = PRUEBAS.enVentana(v.w, v.h, () => p051Con(sl => sl ? p051Extension(sl) : null));
    if (!m) { malos.push(v.w + 'x' + v.h + ': no se encontró la lámina'); return; }
    if (m.arriba < -1) malos.push(v.w + 'x' + v.h + ': arranca ' + m.arriba + ' px por encima del borde');
    if (m.fondo > m.client + 1) malos.push(v.w + 'x' + v.h + ': se pasa ' + (m.fondo - m.client) + ' px por abajo');
  });
  PRUEBAS.igual(malos, [],
    '⚠️ seis filas ocupan más que un párrafo · ' + malos.join(' | '));

  /* DISCRIMINADOR: se hincha el texto a propósito y la misma medición tiene que ver el desborde.
     Sin esto, la comprobación de arriba daría verde midiendo cualquier cosa — ya pasó cuatro veces
     en este proyecto. */
  /* ⚠️ EL TAMAÑO SE FUERZA EN CADA RENGLÓN, no en el `<ul>`. Primero lo puse en el `<ul>` y el
     discriminador daba FALSO: `.cq-rol` y `.cq-ve` declaran su propio `font-size` en `rem`, así
     que la cascada nunca les llegaba y el texto no crecía ni un píxel. O sea que el discriminador
     estaba tan roto como lo que venía a detectar — y sin él, el caso de arriba habría quedado como
     un verde sin medición. */
  const roto = p051Con(sl => {
    const tx = [...sl.querySelectorAll('.cq-rol, .cq-ve')];
    const antes = tx.map(e => e.style.fontSize);
    tx.forEach(e => { e.style.fontSize = '40px'; });
    void document.body.offsetWidth;
    const m = p051Extension(sl);
    tx.forEach((e, i) => { e.style.fontSize = antes[i]; });
    void document.body.offsetWidth;
    return m.fondo > m.client + 1;
  });
  PRUEBAS.cierto(roto,
    '⚠️ discriminador: con el texto a 40 px la medición TIENE que ver el desborde · ' +
    'si no lo ve, el caso de arriba no está midiendo nada');
});

PRUEBAS.caso('⚠️ y con la letra al MÁXIMO no se pierde ni una línea: se puede llegar scrolleando', () => {
  /* Con la letra en "Muy grande" (135 %) no hay forma de que cuatro filas entren en una lámina de
     teléfono, y encogerlas hasta que entren sería la decisión equivocada: quien sube la letra está
     pidiendo lugar para LEER. Lo que no puede pasar es que el texto quede recortado en silencio.
     Se comprueban las dos condiciones que hacen que TODO sea alcanzable: que la lámina scrollee y
     que el contenido no arranque por encima del origen del scroll — que es el defecto clásico de
     un flex centrado que desborda, y por el que la regla usa `safe center`. */
  const previo = document.documentElement.style.fontSize;
  const malos = [];
  try {
    document.documentElement.style.fontSize = '135%';
    document.documentElement.classList.add('texto-grande', 'texto-maximo');
    [[375, 667], [360, 640], [320, 800]].forEach(([w, h]) => {
      const m = PRUEBAS.enVentana(w, h, () => p051Con(sl => sl ? p051Extension(sl) : null));
      if (!m) { malos.push(w + 'x' + h + ': no se encontró la lámina'); return; }
      if (m.arriba < -1) malos.push(w + 'x' + h + ': arranca ' + m.arriba + ' px por encima del origen — no hay forma de subir');
      if (m.fondo > m.client + 1 && !m.scrollea) malos.push(w + 'x' + h + ': se pasa ' + (m.fondo - m.client) + ' px y la lámina no scrollea');
    });
  } finally {
    document.documentElement.style.fontSize = previo;
    document.documentElement.classList.remove('texto-grande', 'texto-maximo');
    void document.body.offsetWidth;
  }
  PRUEBAS.igual(malos, [], '⚠️ con la letra al máximo hay texto fuera de alcance · ' + malos.join(' | '));
});

PRUEBAS.caso('R13 · ningún color escrito a mano en el esquema', () => {
  /* Se mira la hoja de estilo, no el color calculado: un `#fff` y un `var(--card)` computan igual
     en tema claro, así que medir el resultado no distingue el defecto que R13 prohíbe. */
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const bloques = css.split(/(?=\n\s*[.#@])/)
    .filter(b => /\.(car-quien|cq-rol|cq-ve|car-pie|car-slide--esquema)\b/.test(b));
  PRUEBAS.alMenos(bloques.length, 4,
    'guarda: tienen que encontrarse las reglas del esquema · encontradas ' + bloques.length);
  const aMano = bloques.filter(b => /:\s*(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(b.replace(/\/\*[\s\S]*?\*\//g, '')));
  PRUEBAS.igual(aMano.map(b => b.trim().split('\n')[0].trim()), [],
    '⚠️ R13: siempre un token, y si falta se agrega en los DOS temas a la vez');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS TEXTOS
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · los textos');

PRUEBAS.caso('R14 · las cadenas de quién ve qué existen en español y en inglés', () => {
  const previo = idiomaActual();
  const faltan = { es: [], en: [] };
  try {
    ['es', 'en'].forEach(l => { fijarIdioma(l); P051_PROMESA_CLAVES.forEach(k => { if (t(k) === k) faltan[l].push(k); }); });
  } finally { fijarIdioma(previo); }
  PRUEBAS.igual(faltan.es, [], 'falta en español');
  PRUEBAS.igual(faltan.en, [],
    'falta en inglés · la cadena de respaldo devolvería el español y nadie se entera');
});

PRUEBAS.caso('R1 · español NEUTRO, y R14 · sin ningún término de sector', () => {
  /* R14: la app va a Cardón y a operarios de planta. Una lámina que hable de vuelos o de
     tripulación deja de ser cierta ahí, y no hay `if` por empresa que lo arregle. */
  const VOSEO = /(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|registrate|anotá|probá|pedí|vení|entrá|salí|revisá|escribí)(?![a-záéíóúüñ])/i;
  const SECTOR = /aeropuerto|piloto|vuelo|tripulaci[óo]n|hangar|aeronave|airport|flight|crew/i;
  const conVoseo = [], conSector = [];
  P051_PROMESA_CLAVES.forEach(k => {
    const es = p051Texto(k, 'es'), en = p051Texto(k, 'en');
    if (VOSEO.test(es)) conVoseo.push(k + ': «' + es + '»');
    if (SECTOR.test(es) || SECTOR.test(en)) conSector.push(k);
  });
  PRUEBAS.igual(conVoseo, [], '⚠️ R1 · nunca voseo · ' + conVoseo.join(' | '));
  PRUEBAS.igual(conSector, [], '⚠️ R14 · término de sector escrito a mano en ' + conSector.join(', '));
  /* Discriminadores: los dos detectores tienen que encontrar lo que buscan. */
  PRUEBAS.cierto(VOSEO.test('Vos podés ver tus resultados'), 'discriminador del detector de voseo');
  PRUEBAS.cierto(SECTOR.test('Tu supervisor de vuelo'), 'discriminador del detector de sector');
});

PRUEBAS.caso('🔴 R2 · la lámina no declara a nadie apto ni no apto', () => {
  /* La regla más cara del proyecto, y una pantalla que explica lo que el supervisor "ve" de la
     persona es justo donde se cuela un "no apto" por descuido. */
  const todo = P051_PROMESA_CLAVES.map(k => p051Texto(k, 'es') + ' ' + p051Texto(k, 'en')).join(' | ').toLowerCase();
  ['no apto', 'apto para trabajar', 'inhabilitado', 'no puedes trabajar', 'unfit', 'not fit']
    .forEach(mala => PRUEBAS.falso(todo.indexOf(mala) >= 0, '⚠️ no puede aparecer «' + mala + '»'));
  PRUEBAS.cierto(/determinaci[óo]n de aptitud/i.test(p051Texto('car4_med_d', 'es')),
    '⚠️ y sí decir que sólo el servicio médico firma una determinación: es la doctrina del producto');
  PRUEBAS.cierto(/fitness determination/i.test(p051Texto('car4_med_d', 'en')),
    'lo mismo en inglés · «' + p051Texto('car4_med_d', 'en') + '»');
});

PRUEBAS.caso('⚠️ la fila del supervisor NO se suaviza: nombra el semáforo por indicador', () => {
  /* El riesgo real de esta lámina no es que mienta prometiendo de menos: es que "mejore" hacia
     algo más tranquilizador. "Tu supervisor sólo ve si estás en condiciones" suena mejor y es
     FALSO — ve el nivel de cada indicador, ansiedad y ánimo incluidos. Es la misma advertencia que
     X1 dejó escrita, y acá se sostiene contra el texto de la lámina. */
  const es = p051Texto('car4_sup_d', 'es'), en = p051Texto('car4_sup_d', 'en');
  PRUEBAS.cierto(/indicador/i.test(es) && /indicator/i.test(en),
    '⚠️ tiene que decir que ve CADA indicador, no un estado global · «' + es + '»');
  /* "semáforo" dice la misma granularidad que enumerar los tres colores, y en menos palabras —
     Franco pidió textos profesionales, no una explicación. Lo que este caso impide sigue siendo lo
     mismo: que se suavice a un estado global ("sólo ve si estás en condiciones"). */
  PRUEBAS.cierto(/sem[aá]foro|verde|amarillo|rojo/i.test(es) && /flag|green|amber|red/i.test(en),
    'y con qué granularidad · «' + en + '»');
  PRUEBAS.cierto(/nombre/i.test(es) && /name/i.test(en),
    '⚠️ y que ve tu NOMBRE: es lo que lo separa de Dirección, y esconderlo sería lo contrario de R4');
});

/* ── A13 · las TRES fugas que destapó este prompt, ya cerradas ─────────────────────────────────
   Escribir la lámina "Quién ve qué" obligó a verificar cada línea contra el servidor. Ahí apareció
   que el cortafuegos de Dirección estaba abierto por tres puertas distintas, y que el caso que lo
   vigilaba (`k1b-cortafuegos-hseq.js`) no las veía porque arma su payload A MANO y nunca pasa por
   `accionSupervisor` — R17 otra vez, en el caso que existe justamente para esto.

   1 · `nominaSinDato` viajaba con **la nómina entera, con nombre y apellido**. Y era doble daño:
       el bloque se calcula DESPUÉS de anonimizar, así que comparaba los nombres de la nómina
       contra `P1`, `P2`… — ninguno matcheaba, todos caían en "nunca medidos", y el panel de
       Dirección imprime hasta cuatro de esos nombres en pantalla. Fuga Y número falso.
   2 · La **cédula** sobrevivía en `operacional` y `turnos`: `copiarCon` copiaba todas las claves y
       sólo reemplazaba el nombre. Una cédula al lado de "P1" anula la anonimización entera.
   3 · Las **claves** del índice de ausencias son `cedula|fecha` y `n:nombre|fecha`: el dato está
       en la clave, no en el valor.

   Se entra por `accionSupervisor(p)` con la contraseña de Dirección y se mira el JSON completo,
   que es lo único que prueba que la fuga está cerrada. */

PRUEBAS.caso('🔴 A13 · el payload de Dirección y el de HSEQ no llevan NINGÚN nombre de la nómina', () => {
  const rr = p051Respuestas();
  ['direccion', 'hseq'].forEach(cual => {
    const r = rr[cual];
    PRUEBAS.igual(r.ok, true, 'el panel responde (' + cual + ') · si no, este caso no mide nada');
    PRUEBAS.alMenos(Number(r.nominaTotal) || 0, 1,
      'y el CONTEO sí llega (' + cual + ') · es su indicador de cobertura y no identifica a nadie');
    PRUEBAS.igual(r.nominaSinDato, [],
      '⚠️ pero la LISTA de nombres no (' + cual + ') · viajaba entera y el panel imprime hasta 4 en pantalla');
  });
});

PRUEBAS.caso('🔴 A13 · ninguna cédula sobrevive a la anonimización', () => {
  const rr = p051Respuestas();
  const conCedula = [];
  ['direccion', 'hseq'].forEach(cual => ['registros', 'aptitud', 'operacional', 'turnos', 'pvt'].forEach(k => {
    (rr[cual][k] || []).forEach((f, i) => {
      if (f && (f.cedula != null && String(f.cedula) !== '')) conCedula.push(cual + '.' + k + '[' + i + ']=' + f.cedula);
    });
  }));
  PRUEBAS.igual(conCedula, [],
    '⚠️ una cédula al lado de "P1" anula la anonimización entera — ' + conCedula.join(', '));
});

PRUEBAS.caso('🔴 A13 · las claves de ausencias tampoco entregan cédulas ni nombres', () => {
  const rr = p051Respuestas();
  ['direccion', 'hseq'].forEach(cual => PRUEBAS.igual(Object.keys(rr[cual].ausencias || {}), [],
    '⚠️ el dato está en la CLAVE (`cedula|fecha`, `n:nombre|fecha`), no en el valor (' + cual + ') — ' +
    Object.keys(rr[cual].ausencias || {}).join(', ')));
});

PRUEBAS.caso('el DISCRIMINADOR: al supervisor SÍ le llega todo eso', () => {
  /* Sin esto, un arreglo que vaciara los campos para todo el mundo daría verde en los tres de
     arriba y le rompería el panel al supervisor, que necesita los nombres para asignar tareas. */
  const r = p051Respuestas().supervisor;
  PRUEBAS.igual(r.ok, true, 'el supervisor entra');
  PRUEBAS.alMenos((r.nominaSinDato || []).length, 1,
    'y SÍ recibe la lista de quiénes no se midieron · es su trabajo');
  const hayNombreReal = (r.registros || []).some(x => x.persona && !/^P\d+$/.test(x.persona));
  PRUEBAS.igual(hayNombreReal, true, 'con nombres de verdad, no P1/P2');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P307 · LA LISTA COMPLETA, EN TODOS LOS LUGARES DONDE SE PROMETE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P307 · los seis que reciben algo están en los cuatro lugares que prometen ser la lista completa', () => {
  /* `priv_pie` y el consentimiento (`consent_datos_html`: «sólo acceden […] las personas autorizadas
     que se detallan») prometen que la lista está completa. Hasta P307 faltaban HSEQ como rol propio y
     la administración de la plataforma, que ve todo. Se mira el TEXTO de cada lugar, en los dos idiomas. */
  ['es', 'en'].forEach(l => {
    const consent = p051Texto('consent_roles_html', l);
    /* el rótulo de cada rol abre su párrafo: «<p…><strong>Supervisión.</strong>»; una frase en negrita
       en el medio del párrafo («En ningún caso…») no es un rol, y contarla daba seis */
    const n = (consent.match(/<p class="consent-text"><strong>[^<]+\.<\/strong>/g) || []).length;
    PRUEBAS.igual(n, 5, '⚠️ el consentimiento (' + l + ') nombra cinco roles: supervisión, servicio médico, HSEQ, Dirección y administración · ' + n);
    PRUEBAS.cierto(/HSEQ/.test(consent), 'y HSEQ es uno (' + l + ')');
  });
  const priv = document.getElementById('privOv');
  PRUEBAS.cierto(!!priv, 'guarda: existe «Quién ve qué»');
  if (priv) PRUEBAS.igual(['priv_sup_t', 'priv_med_t', 'priv_hseq_t', 'priv_dir_t', 'priv_adm_t']
      .filter(k => !priv.querySelector('[data-i18n="' + k + '"]')), [],
    '⚠️ «Quién ve qué» tiene un bloque por cada uno');
  /* La documentación la arma `admRenderDoc` y devuelve el HTML: se mira lo que devuelve, y si no
     devuelve nada el caso falla (no se saltea en silencio). */
  let doc = '';
  try { doc = String(admRenderDoc() || ''); } catch (e) { doc = ''; }
  PRUEBAS.alMenos(doc.length, 1000, 'guarda: la documentación se arma (si no, lo de abajo no mide nada)');
  PRUEBAS.cierto(doc.indexOf('<th>' + t('doc_c_hseq') + '</th>') >= 0 && doc.indexOf('<th>' + t('doc_c_admin') + '</th>') >= 0,
    '⚠️ y la tabla de quién ve qué tiene la columna de HSEQ y la de la administración');
});

PRUEBAS.caso('🔴 P307 · LA RESTRICCIÓN DE P308 TODAVÍA NO SE ESCRIBE: hoy HSEQ recibe el semáforo de cada persona', () => {
  /* El plan (sección de P307, «Quién escribe esa parte»): lo que la lámina RESTRINGE —«de tus tests,
     HSEQ ve sólo totales de 5 o más»— lo escribe y lo publica `P308`, en la misma versión que cambia el
     payload. Escrito antes, alguien que se registra en el medio lee algo falso justo donde decide si
     contesta la verdad (R4). Cuando `P308` cambie el payload, este caso se da vuelta: pasa a exigirlo. */
  /* El verificador de P307 encontró que la primera versión no veía 8 de 10 redacciones equivalentes, y que
     miraba sólo una lista fija de claves. Ahora mira TODAS las del diccionario que nombran a HSEQ o a
     Dirección, en los dos idiomas. */
  const RESTRICCION = /(s[oó]lo|[uú]nicamente) (como |los |sus )?(totales|promedios|agregados)|only (as )?(totals|averages|aggregates)|(5|cinco) (personas )?o m[aá]s|al menos (5|cinco)|menos de (5|cinco)|a partir de (5|cinco)|m[ií]nimo (de )?(5|cinco)|(five|5) (people )?or more|at least (5|five)|fewer than (5|five)|less than (5|five)|minimum of (5|five)/i;
  const MENCIONA = /HSEQ|Direcci[oó]n|Management|seguridad|safety/i;
  const texto = (k, l) => { try { return String(_i18nBuscar(l, '', k) || ''); } catch (e) { return ''; } };
  PRUEBAS.cierto(texto('car4_tit', 'es').length > 3 && texto('car4_tit', 'en').length > 3,
    'guarda: el lector de textos devuelve texto de verdad (si `_i18nBuscar` cambiara, todo daría vacío y verde)');
  /* las claves del bloque general Y las de cada sector: una restricción escrita sólo para un sector también cuenta */
  const claves = new Set();
  ['es', 'en'].forEach(l => Object.keys(I18N[l] || {}).forEach(b => Object.keys(I18N[l][b] || {}).forEach(k => claves.add(k))));
  PRUEBAS.alMenos(claves.size, 1000, 'guarda: se leen las claves del diccionario · ' + claves.size);
  const textoTodo = (k, l) => { const L = I18N[l] || {}; return Object.keys(L).map(b => (L[b] && L[b][k] != null) ? String(L[b][k]) : '').join(' '); };
  /* ⚠️ Por mención Y por prefijo: una línea de la lista de Dirección («Mira cómo está la organización…») no
     nombra a Dirección —lo hace el título de su bloque— y con sólo la mención se escapaba (lo mostró el
     discriminador de esta misma guarda). */
  const PREFIJO = /^(priv_|car4_|consent_|doc_2_|doc_c_|rol_of_|pg_hint_|pg_desc_|cic_hseq_|hlp_idc)/;
  const adelantadas = [...claves].filter(k => { const tx = textoTodo(k, 'es') + ' ' + textoTodo(k, 'en');
    return (MENCIONA.test(tx) || PREFIJO.test(k)) && RESTRICCION.test(tx); });
  PRUEBAS.igual(adelantadas, [], '🔴 ninguna cadena dice todavía que HSEQ ve sólo totales · ' + adelantadas.join(', '));
  ['De tus tests, HSEQ ve sólo totales de 5 o más', 'HSEQ ve cinco o más', 'al menos 5 personas', 'nunca grupos de menos de 5',
   'únicamente como totales', 'only totals of five or more', 'never groups of fewer than 5',
   'grupos de 5 personas o más', 'groups of 5 people or more', 'sólo promedios', 'sólo agregados', 'a partir de 5', 'mínimo de 5'].forEach(x =>
    PRUEBAS.cierto(RESTRICCION.test(x), 'discriminador: el detector reconoce «' + x + '»'));
  if (CTX.hayGs) {
    const r = p051Respuestas();
    PRUEBAS.alMenos((r.hseq.aptitud || []).length, 1,
      'y es cierto que todavía no: HSEQ recibe el semáforo de cada persona (P1, P2…) · cuando deje de recibirlo, es `P308`');
  }
});

/* Un nombre escrito distinto que en la nómina («L. Ferrer» por «Luis Ferrer»): es lo que hace que
   `identidades_informe` tenga algo que contar. Sin esto el barrido de abajo no mediría esa puerta. */
function p051HojasConVariante() {
  const h = p051Hojas();
  h['Respuestas de formulario 1'].push(p051Fila('L. Ferrer', 'Mantenimiento', 'Helitec', 3, ''));
  return h;
}
/* P307 · y con datos CON NOMBRE en todas las colecciones que una acción del panel puede devolver: con
   hojas vacías, Dirección recibía listas vacías y el barrido daba verde sin medir (lo mostró el
   verificador saboteando la bitácora y los reportes: el caso seguía en verde). Las fugas de A8 y P091
   fueron justo en la bitácora. Lo armó el verificador; la opinión no nombra a nadie a propósito: es texto
   anónimo que escribe la persona (la hoja no tiene autor), así que un nombre ahí no sería una fuga del
   sistema sino lo que alguien eligió escribir. */
function p051HojasRicas() {
  const h = p051HojasConVariante();
  const ev = (id, acc, sujeto, detalle) => [P051_HOY + ' 10:00', 'Helitec', acc, sujeto, 'Dra. Carmen Rojas', 'medico', 'app', '', '', '', '7.54', id,
    JSON.stringify({ id, ts: Date.now(), empresa: 'Helitec', actor: 'Dra. Carmen Rojas', rol: 'medico', accion: acc, sujeto, detalle, origen: 'app', umbral: { nivel: 3, amarillo: .85, rojo: 1 }, app: '7.54' })];
  h['Bitácora'] = [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo','UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON'],
    ev('b1', 'determinacion_medica', 'Ana Suárez', { persona: 'Ana Suárez', cedula: 'V-11111', decidio: 'no_apto', motivo: 'ansiedad alta' }),
    ev('b2', 'nota_clinica', 'Luis Ferrer', { persona: 'Luis Ferrer', chars: 120 }),
    ev('b3', 'telemedicina_rechazada', 'Ana Suárez', { persona: 'Ana Suárez' }),
    ev('b4', 'caso_odoo', 'Ana Suárez', { persona: 'Ana Suárez' })];
  h['Reportes'] = [['Fecha','IdReporte','Opcion','Identificado','Persona','Empresa','Departamento','Cargo','Comentario'],
    [P051_HOY + 'T09:00:00', 'r1', 'no_dormi', 'true', 'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', 'Ana: dormí 3 h'],
    [P051_HOY + 'T09:05:00', 'r2', 'entorno', 'false', '', 'Helitec', 'Operaciones', '', 'ruido en el taller']];
  h['Niveles Riesgo'].push(['Helitec', 'Operaciones', 'Piloto', 'Ana Suárez', '5']);
  h['Gestiones'].push(['Helitec', 'g1', JSON.stringify({ id: 'g1', tipo: 'anotacion_aptitud', persona: 'Ana Suárez', nivel: 'no_apto', nota: 'Luis Ferrer refiere…', medico: 'Dra. Carmen Rojas' }), P051_HOY]);
  h['Tareas'] = [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle','Vence','Estado','Creada','Actualizada','CreadaPor'],
    ['Helitec', 't1', 'V-11111', 'Ana Suárez', 'supervisor', 'Descanso', 'Ana debe descansar', P051_HOY, 'pendiente', P051_HOY, P051_HOY, 'sup']];
  h['Operaciones Listadas'] = [['Empresa','Operacion','Tipo','Inicio','Fin','Estado','Creada','CreadaPor','Baja','BajaPor'],
    ['Helitec', 'Op Norte', 'campo', P051_HOY, P051_HOY, 'activa', P051_HOY, 'sup', '', '']];
  h['Asignaciones'] = [['Empresa','Operacion','Persona','Cedula','Desde','Hasta','Estado','Creada','CreadaPor','Baja','BajaPor'],
    ['Helitec', 'Op Norte', 'Ana Suárez', 'V-11111', P051_HOY, P051_HOY, 'activa', P051_HOY, 'sup', '', '']];
  h['Opiniones'] = [['IdOpinion', 'Empresa', 'Mes', 'Texto'], ['o1', 'Helitec', P051_HOY.substring(0, 7), 'Hay mucho ruido en el taller']];
  h['Casos Odoo'] = [['Fecha','Persona','Empresa','Departamento','Cargo','Telefono','Correo','NivelRiesgo','Severidad','Motivo','Indicadores','Confiabilidad','OrigenApp','IdCaso','Procesado','RefOdoo','Valores'],
    [P051_HOY, 'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', '', '', '5', 'alta', 'x', 'ansiedad', '', '7.54', 'c1', '', '', '']];
  h['Ciclo Persona'] = [['Empresa', 'Persona', 'Plan', 'Actualizado', 'ActualizadoPor'], ['Helitec', 'Ana Suárez', '{"x":1}', P051_HOY, 'sup']];
  return h;
}

PRUEBAS.caso('🔴 P307 · NINGUNA acción del panel le da un nombre o una cédula a Dirección ni a HSEQ', () => {
  /* R19 · las acciones salen del ruteo del .gs real (`accion === "x") return f(p)`) y se toman las que
     piden credencial de panel (`accesoPanel_`/`validarAcceso` en su cuerpo). Se llama a CADA una con la
     contraseña de Dirección y con la de HSEQ, y se busca cualquier nombre o cédula en lo que devuelve.
     El candado de arriba miraba sólo `accionSupervisor`; por `identidades_informe` salían nombres y
     cédulas (lo encontró el verificador de P307, armando el pedido a mano). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const rutas = [...CTX.gs.matchAll(/accion === "([a-z_0-9]+)"\)\s*return (\w+)\(p\)/g)].map(m => ({ a: m[1], f: m[2] }));
  const usaPanel = f => { const i = CTX.gs.indexOf('function ' + f + '('); return i >= 0 && /accesoPanel_\(p\)|validarAcceso\(/.test(CTX.gs.slice(i, i + 1500)); };
  const panel = rutas.filter(r => usaPanel(r.f));
  PRUEBAS.alMenos(panel.length, 20, 'guarda: el barrido encuentra las acciones del panel · ' + panel.length);
  PRUEBAS.cierto(panel.some(r => r.a === 'identidades_informe') && panel.some(r => r.a === 'supervisor'),
    'guarda: y entre ellas, la del panel y la que daba nombres');
  /* Devuelve, por acción, qué identificadores aparecieron en lo que contestó. */
  const conQue = clave => {
    const env = GS.crearEntorno(p051HojasRicas());
    const api = GS.cargarGs(CTX.gs, env, [...new Set(panel.map(r => r.f))]);
    const out = {};
    panel.forEach(r => {
      let txt = '';
      try { const o = api[r.f]({ usuario: 'helitec', pass: clave, dispositivoId: 'p051', empresa: 'Helitec', _post: true });
            txt = o && o.getContent ? o.getContent() : JSON.stringify(o); } catch (e) { txt = ''; }
      const f = P051_IDENTIFICADORES.filter(x => txt.indexOf(x) >= 0);
      if (f.length) out[r.a] = f.join(',');
    });
    return out;
  };
  PRUEBAS.igual(conQue('dir-051'), {}, '🔴 Dirección: ninguna acción le da un nombre o una cédula');
  PRUEBAS.igual(conQue('hseq-051'), {}, '🔴 HSEQ: ninguna acción le da un nombre o una cédula');
  /* DISCRIMINADOR, ACCIÓN POR ACCIÓN: con la contraseña del supervisor, que sí ve nombres, cada acción que
     devuelve datos de personas los trae. Si una deja de traerlos, el CH de prueba perdió esos datos y el
     verde de arriba sobre esa acción no mediría nada. */
  const sup = conQue('sup-051');
  PRUEBAS.igual(['supervisor', 'bitacora', 'actividad', 'reportes', 'nomina_listar', 'operaciones', 'identidades_informe',
                 'ausencias', 'casos_odoo_resumen'].filter(a => !sup[a]), [],
    'discriminador: con la del supervisor, cada una de esas acciones SÍ trae nombres · ' + JSON.stringify(sup));
  /* Y que Dirección y HSEQ no se enteren de que se abrió un caso (`ACT_OCULTAS_HSEQ_GS`, en `actividad` y en
     `bitacoraParaHseq_`): `caso_odoo` llega con alias, así que el barrido de nombres no lo vería. */
  const accionesBitacora = clave => {
    const api = GS.cargarGs(CTX.gs, GS.crearEntorno(p051HojasRicas()), ['accionBitacora']);
    const r = JSON.parse(api.accionBitacora({ usuario: 'helitec', pass: clave, dispositivoId: 'p051', empresa: 'Helitec', _post: true }).getContent());
    return (r.eventos || []).map(e => e.accion);
  };
  PRUEBAS.igual(['dir-051', 'hseq-051'].map(c => accionesBitacora(c).indexOf('caso_odoo') >= 0), [false, false],
    '🔴 ni Dirección ni HSEQ reciben en la bitácora que se abrió un caso');
  PRUEBAS.cierto(accionesBitacora('sup-051').indexOf('caso_odoo') >= 0,
    'discriminador: el supervisor sí lo recibe (el CH de prueba tiene el evento)');
});

PRUEBAS.caso('🔴 P307 · las cuentas combinadas y Gemini se dicen donde la persona decide, y son ciertos', () => {
  /* Medido en producción el 2026-10-21: 7 de las 8 empresas usan UNA contraseña para supervisión y servicio
     médico, y quien la tiene ve lo médico (`validarAcceso`: médica vacía → `combinada`). Y el informe del
     médico le manda a Gemini (Google) valores y comentarios con nombre (`generarInforme` → `llamarGemini`).
     La lista promete estar completa (`priv_pie`, `consent_datos_html`): las dos cosas se dicen en la lámina,
     en «Quién ve qué» y en el consentimiento. Y se comprueba que siguen siendo CIERTAS: si un día dejan de
     serlo, el texto diría de más y este caso lo ve. */
  ['es', 'en'].forEach(l => {
    const un = l === 'es' ? /una sola contrase[nñ]a/i : /single password/i;
    PRUEBAS.cierto(un.test(p051Texto('car4_pie', l)) && un.test(p051Texto('priv_sup_6', l)) && un.test(p051Texto('consent_roles_html', l)),
      '⚠️ las cuentas combinadas se dicen en la lámina, en «Quién ve qué» y en el consentimiento (' + l + ')');
    PRUEBAS.cierto(/Gemini/.test(p051Texto('priv_med_4', l)) && /Gemini/.test(p051Texto('consent_roles_html', l)),
      '⚠️ y Gemini, en «Quién ve qué» y en el consentimiento (' + l + ')');
  });
  const pie = document.querySelector('.car-slide--esquema [data-i18n="car4_pie"]');
  PRUEBAS.cierto(!!pie, '⚠️ el pie de la lámina existe en la pantalla');
  if (!CTX.hayGs) return;
  /* ¿Siguen siendo ciertas? Una empresa sin contraseña médica: con la de supervisión, la persona elige la
     pestaña al entrar (`accionSupervisor`, `p.pedida`), y la de Servicio médico le da todo lo médico.
     Sin pestaña, el servidor abre la que menos muestra (P301) — por eso se pide la médica. */
  const conPestana = (medica, pedida) => {
    const h = p051Hojas();
    h['Accesos'][2][4] = medica;
    const api = GS.cargarGs(CTX.gs, GS.crearEntorno(h), ['accionSupervisor']);
    const r = JSON.parse(api.accionSupervisor({ usuario: 'helitec', pass: 'sup-051', dispositivoId: 'p051', pedida: pedida }).getContent());
    const fila = (r.registros || [])[0] || {};
    return p051Metricas().filter(m => fila[m] != null).length;
  };
  PRUEBAS.alMenos(conPestana('', 'medico'), 1,
    '⚠️ en una cuenta combinada, la contraseña de supervisión abre lo médico: «quien la tiene ve las dos cosas» es cierto');
  PRUEBAS.igual(conPestana('med-051', 'medico'), 0,
    'discriminador: con contraseña médica aparte, la de supervisión NO abre lo médico aunque pida esa pestaña');
  PRUEBAS.cierto(/generativelanguage\.googleapis\.com/.test(CTX.gs) && /function generarInforme/.test(CTX.gs),
    '⚠️ y el informe del médico llama a Gemini: si un día deja de hacerlo, el texto sobra');
});
