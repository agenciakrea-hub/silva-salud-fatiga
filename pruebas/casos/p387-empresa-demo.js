PRUEBAS.grupo('P387 · Empresa Demo, como HSEQ, desde el administrador (F095)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Franco (2026-11-03): «empresa demo, que tiene muchos empleados, no se ve en administrador, como hseq
   empresa demo, y ni eso puedo mostrar, arreglalo». Decisión: «Las dos cosas».

   1 · «Ver como…» (Más → Administración) no abría NINGUNA vista: con el panel cerrado `DASH` es `null`, y
       `simEntrar` mandaba la credencial en `undefined` (`dashAuth()` la saca de un panel abierto). Ahora la
       arma `admAuth()` y, sin credencial, no se manda nada. Y separa Dirección y HSEQ como el ojo de la
       demostración (`demoVistaReal`, `demoPayloadDeVista`).
   2 · La cuenta Empresa Demo (el visor «Empresa Demo · X» y sus contraseñas) mostraba los tests de agosto y
       el panel de HSEQ vacío. Ahora pasa por `demoAjustar` y `totalesHseqDemo_` en `accionSupervisor`.
   3 · `demoAjustar` anclaba en la fila más nueva, aunque fuera una suelta, y no corría `ts`: D1 y D2.
   Vuelta 2: D1 con 2 personas (no 3: el guion queda entero), la nómina de la cuenta como la de la demostración
   (D3), y los cuatro hallazgos del verificador (credencial vencida, «Último movimiento» en el futuro, los totales
   en inglés, la barra mientras carga).

   R17: todo entra por el camino real. El servidor, por `doPost` del `.gs` real en el emulador; el cliente,
   por la contraseña de administrador (`admEntrar`) y el botón del rol, con `DASH` en `null` y los pedidos
   enrutados al mismo `.gs`. R19: cada caso nombra la función que concede lo que afirma. Cada arreglo tiene
   su sabotaje (un reemplazo de texto sobre `CTX.gs`, o una función del cliente cambiada en el momento) y su
   control sin sabotaje.

   Contraseñas: de PRUEBA, del CH emulado. Los nombres son los del elenco de la demostración (`DEMO_GENTE`,
   público en la app): así la nómina de ejemplo los reconoce. Nada sale de la máquina.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P387_ADMIN = 'adm-387';
const P387_CLAVE_DEMO = 'clave-demo-387';      // la de la demostración pública (`demo_pass`), como en producción
const P387_DEMO = { usuario: 'demo', sup: 'sup-387', dir: 'dir-387', hseq: 'hseq-387' };   // médica vacía: combinada, como en el banco
const P387_HOY = '2026-11-03';                 // martes
const P387_TEMPRANO = '2026-11-03T14:00:00Z';  // martes, 10:00 en Caracas: el ancla corrida a hoy queda ADELANTE de ahora
const P387_TARDE = '2026-11-04T02:00:00Z';     // martes, 22:00 en Caracas: nada queda adelante
const P387_LUNES = '2026-11-03T02:00:00Z';     // lunes 2, 22:00 en Caracas
const P387_ANCLA = '2026-06-05';               // el último día con 2 personas distintas medidas (D1 = 2)

/* Nombres del elenco de la demostración, con sus departamentos. Ninguno del guion (`DEMO_GUION` cambia los valores
   del último test de cada uno de ellos). */
const P387_GENTE = {
  'Ana Suárez': 'Administración', 'Andrés Peña': 'Mantenimiento', 'Camila Torres': 'Administración',
  'Diego Ramírez': 'Operaciones', 'Federico Blanco': 'Administración', 'Gabriel Ortiz': 'Administración',
  'José Duarte': 'Mantenimiento', 'Julieta Cabrera': 'Tripulación', 'Rodolfo Ruiz': 'Legal'
};
/* [día, hora en Caracas, persona, KSS, los otros (estrés, cansancio, gastro, ansiedad, depresión y el nivel de fatiga), sólo KSS]
   Las unidades de HSEQ (de 5 personas): el 1 de junio cierra una, el 2 otra, y el 3 con el primero del 4 la tercera.
   Las del 4 que quedan y las del 5 no completan otra. */
const P387_TESTS = [
  ['2026-06-01', '08:00', 'Ana Suárez', 3, 1], ['2026-06-01', '08:30', 'Andrés Peña', 4, 2], ['2026-06-01', '09:00', 'Camila Torres', 5, 2],
  ['2026-06-01', '09:30', 'Diego Ramírez', 5, 1], ['2026-06-01', '10:00', 'Federico Blanco', 6, 3],
  /* Julieta (Tripulación, nivel 5) con KSS 6: rojo con su nivel, amarillo con el de por defecto. Es lo que separa el color
     con el departamento en castellano del color con el departamento traducido (hallazgo 3) */
  ['2026-06-02', '08:00', 'Gabriel Ortiz', 4, 2], ['2026-06-02', '08:30', 'José Duarte', 5, 2], ['2026-06-02', '09:00', 'Julieta Cabrera', 6, 1],
  ['2026-06-02', '09:30', 'Ana Suárez', 4, 2], ['2026-06-02', '10:00', 'Andrés Peña', 5, 3],
  ['2026-06-03', '08:00', 'Camila Torres', 4, 2], ['2026-06-03', '08:30', 'Diego Ramírez', 3, 2], ['2026-06-03', '09:00', 'Federico Blanco', 3, 1],
  ['2026-06-03', '09:30', 'Gabriel Ortiz', 6, 3],
  /* tres personas: con el umbral en 3 (lo de la vuelta 1), éste era el ancla */
  ['2026-06-04', '11:00', 'José Duarte', 4, 2], ['2026-06-04', '12:00', 'Julieta Cabrera', 3, 2], ['2026-06-04', '13:00', 'Ana Suárez', 3, 1],
  /* el ANCLA: dos personas, de noche (corridas a hoy, a las 10:00 quedan adelante de ahora) */
  ['2026-06-05', '18:00', 'Andrés Peña', 4, 2], ['2026-06-05', '21:00', 'Camila Torres', 3, 1],
  /* la fila suelta, como la de EVA del CH: una persona, sólo KSS. Queda FUERA (D1) */
  ['2026-06-20', '15:00', 'Rodolfo Ruiz', 6, null, true]
];
/* El instante de un test del fixture: la hora de pared en Caracas (`GS.fechaDeCelda`, P234). */
function p387Instante(d, h) { return GS.fechaDeCelda(d + 'T' + h + ':00').getTime(); }
/* Llena un bloque de ítems (columna 1-based `c1`, `n` ítems de 0 a 6) para que sume `total` (`sumaBloque`). */
function p387Bloque(f, c1, n, total) {
  let resto = total;
  for (let i = 0; i < n && resto > 0; i++) { const v = Math.min(6, resto); f[c1 - 1 + i] = v; resto -= v; }
}
/* Una fila de `Respuestas de formulario 1`: COL_PERSONA 2, COL_DEPTO 3, COL_EMPRESA 73, COL_FECHA 74, COL_KSS 87
   (1-based), el primer ítem de cada bloque (`BLOQUES`) y el nivel de Perelli (`PER_NIVEL` 76): así las siete
   métricas tienen valor y las siete tarjetas pueden tener número. */
function p387Fila(x, emp) {
  const f = new Array(90).fill('');
  const dt = GS.fechaDeCelda(x[0] + 'T' + x[1] + ':00');
  f[0] = dt; f[1] = x[2]; f[2] = P387_GENTE[x[2]] || 'Operaciones'; f[72] = emp || 'Empresa Demo'; f[73] = dt;
  f[86] = x[3];
  if (!x[5]) { f[3] = x[4]; f[15] = x[4]; f[24] = x[4]; f[36] = x[4]; f[57] = x[4]; f[75] = 2 + x[4]; }
  return f;
}
function p387Pvt(d, h, persona, emp) {
  return [GS.fechaDeCelda(d + 'T' + h + ':00'), persona, emp || 'Empresa Demo', P387_GENTE[persona] || 'Operaciones', 50, 280, 210, 420, 1, 270, 0];
}
/* Una empresa real al lado (HELITEC), para el sellador: con cinco personas de su nómina selló algo, y así un
   «Empresa Demo no aparece en Totales HSEQ» no puede pasar porque el sellador no corrió. */
const P387_HELITEC = ['Iván Rey', 'Juana Paz', 'Kevin Toro', 'Laura Mar', 'Mario Sol'];
/* La escala de riesgo de Empresa Demo como la deja `sembrarNivelesDemo` en el CH (medido el 2026-11-03). */
const P387_NIVELES = [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel'],
  ['Empresa Demo', 'Administración', '', '', 1], ['Empresa Demo', 'Legal', '', '', 1], ['Empresa Demo', 'Dirección', '', '', 2],
  ['Empresa Demo', 'Operaciones', '', '', 3], ['Empresa Demo', 'Mantenimiento', '', '', 4], ['Empresa Demo', 'Tripulación', '', '', 5],
  ['Empresa Demo', '', '', '', 3]];

/* Las hojas de siempre; `filas`/`pvt` reemplazan las de Empresa Demo (el caso del guion trae las suyas). */
function p387Hojas(opc) {
  opc = opc || {};
  let filas = [];
  if (opc.filas) filas = opc.filas.slice();
  else P387_TESTS.forEach(x => {
    filas.push(p387Fila(x));
    if (x[0] === '2026-06-02') filas.push(p387Fila(x));   // DUPLICADAS, como 126 de las 127 del CH: `demoAjustar` las deduplica
  });
  P387_HELITEC.forEach((p, i) => filas.push(p387Fila(['2026-06-02', String(8 + i).padStart(2, '0') + ':15', p, 4, 2], 'Helitec')));
  const nomina = [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Email',
                   '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo']];
  P387_HELITEC.forEach((p, i) => nomina.push(['Helitec', p, 'V-38700' + i, 'Operaciones', 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']));
  /* `nominaDemo`: la gente de Empresa Demo EN la nómina. Sin esto el sellador no podría juntar sus grupos ni aunque
     no la salteara (cuenta por cédula de la nómina), y el sabotaje del sellador no discriminaría nada. */
  if (opc.nominaDemo) Object.keys(P387_GENTE).forEach((p, i) =>
    nomina.push(['Empresa Demo', p, 'V-38710' + i, P387_GENTE[p], 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']));
  return {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq', 'Clave panel HSEQ'],
                ['*', P387_ADMIN, 'admin', '', '', '', ''],
                [P387_DEMO.usuario, P387_DEMO.sup, 'supervisor', 'Empresa Demo', '', P387_DEMO.dir, P387_DEMO.hseq],
                ['helitec', 'sup-h387', 'supervisor', 'Helitec', 'med-h387', 'dir-h387', 'hseq-h387']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')].concat(filas),
    'PVT': [['Fecha', 'Persona', 'Empresa', 'Departamento', 'Validas', 'RT prom', 'RT min', 'RT max', 'Lapsos', 'RT mediana', 'Falsos']]
      .concat(opc.pvt || [p387Pvt('2026-06-01', '08:05', 'Ana Suárez'), p387Pvt('2026-06-01', '08:35', 'Andrés Peña'),
                          p387Pvt('2026-06-05', '18:05', 'Andrés Peña'), p387Pvt('2026-06-20', '15:05', 'Rodolfo Ruiz')]),
    'Nómina': nomina,
    /* la demostración pública pide clave, como en producción (`demo_pass`, fila general); `opc.costosDemo`: una fila
       propia de costos para Empresa Demo */
    'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['', 'demo_pass', P387_CLAVE_DEMO]].concat(opc.costosDemo
      ? [['Empresa Demo', 'costos', JSON.stringify({ horaHombre: 99, horaParada: 1, incidenteLeve: 1, incidenteGrave: 1,
           incidenteCatas: 1, primaSeguro: 1, incidentesBase: 1, horasHombre: 1, factorConversion: 0.5 })]] : []),
    'Niveles Riesgo': P387_NIVELES.map(f => f.slice()),
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor']],
    'Confiabilidad': [['Fecha', 'IdRegistro', 'Test', 'Persona', 'Empresa', 'Departamento', 'Score', 'Confiable', 'Senales', 'MedianaSeg', 'Preguntas']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada', 'Panel']],
    'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario']],
    /* una acción REAL de bitácora de la cuenta: es un hecho (R3), «Actividad reciente» no la corre */
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'NivelRiesgo', 'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON'],
                 ['20/10/2026 11:00', 'Empresa Demo', 'acceso_panel_creado', '', 'sistema', '', 'mantenimiento', '', '', '', '', 'ev-p387',
                  JSON.stringify({ ts: Date.parse('2026-10-20T15:00:00Z') })]]
  };
}

/* ── Los sabotajes: reemplazos de texto sobre el `.gs` real. Cada ancla tiene que estar UNA vez, o el caso lo dice. */
const P387_SABOTAJES = {
  /* D1 · anclar en la fecha más nueva, como antes de P387: la fila suelta arrastra la demo */
  anclaEnLaMasNueva: [['var DEMO_ANCLA_MIN_PERSONAS = 2;', 'var DEMO_ANCLA_MIN_PERSONAS = 1;']],
  /* D1 · el umbral de la vuelta 1: el último día del guion (2 personas) queda fuera */
  anclaConTres: [['var DEMO_ANCLA_MIN_PERSONAS = 2;', 'var DEMO_ANCLA_MIN_PERSONAS = 3;']],
  /* D2 · `ts` sin correr (la línea de corte decía agosto) */
  tsSinCorrer: [['    if ((+r.ts || 0) && desp.ms) r.ts = +r.ts + desp.ms;', '    void 0;']],
  /* D2 · sin el exceso: lo corrido a hoy queda adelante de ahora */
  sinExceso: [['  var exceso = (maxTs && maxTs + ms > ahora) ? (maxTs + ms - ahora) : 0;', '  var exceso = 0;']],
  /* D2 · recortar fila por fila: empata instantes */
  recortaFilaPorFila: [['  var exceso = (maxTs && maxTs + ms > ahora) ? (maxTs + ms - ahora) : 0;', '  var exceso = 0;'],
                       ['    if ((+r.ts || 0) && desp.ms) r.ts = +r.ts + desp.ms;', '    if ((+r.ts || 0) && desp.ms) r.ts = Math.min(+r.ts + desp.ms, Date.now());']],
  /* la cuenta sin `demoAjustar` (lo de antes) */
  cuentaSinAjuste: [['  if (esCuentaDemo) {\n    var ajCuenta = demoAjustar(registros, pvt);', '  if (false) {\n    var ajCuenta = demoAjustar(registros, pvt);']],
  /* la cuenta leyendo lo sellado (lo de antes) */
  cuentaLeeSellado: [['    : esCuentaDemo ? totalesHseqDemo_(registros, cfgEmpresa.anonN, cfgEmpresa.umbralEstado)',
                      '    : false ? totalesHseqDemo_(registros, cfgEmpresa.anonN, cfgEmpresa.umbralEstado)']],
  /* la cuenta sin los costos de la demostración */
  cuentaSinCostos: [['  if (esCuentaDemo) cfgEmpresa = demoConfig_(cfgEmpresa);', '  void 0;']],
  /* «Todas las empresas» también corrida */
  todasSeCorre: [['  return !!acc && norm(gestScope(acc, empresaParam)) === norm(EMPRESA_DEMO);',
                  '  return !!acc && (norm(gestScope(acc, empresaParam)) === norm(EMPRESA_DEMO) || acc.rol === "admin");']],
  /* D4 · «Actividad reciente» con la hora real */
  actividadSinCorrer: [['        tsR = r.ts + despDemo.ms;', '        tsR = r.ts;']],
  /* el sellador sin la exclusión de la demostración */
  selladorConDemo: [['      if (!e || e === demo) return;', '      if (!e) return;']],
  /* la aptitud por persona otra vez al panel de HSEQ */
  hseqConAptitud: [['    aptitudPayload = esPanelHseq_(acc) ? null : armado.aptitud;', '    aptitudPayload = armado.aptitud;']],
  /* el recorte por vista apagado (nombres a Dirección y HSEQ) */
  sinRecorte: [['  if (!acc || acc.vista !== "hseq") return d;', '  return d;']],
  /* el bloque P107b otra vez ANIDADO: `demoVerificarNiveles` deja de ser global, como hasta P387 */
  anidada: [['function demoVerificarNiveles(){', 'function p387Envoltorio_(){ return 0;\nfunction demoVerificarNiveles(){'],
            ['  return malas;\n}\n', '  return malas;\n}\n}\n']],
  /* hallazgo 3 · los totales de la demostración DESPUÉS de traducir, como antes de la vuelta 2 */
  traduceAntes: [['  var totalesDemo = totalesHseqDemo_(aj.registros, cfgDemo.anonN, cfgDemo.umbralEstado);', '  var totalesDemo = null;'],
                 ['    config: cfgDemo, lang: langDemo, totalesHseq: totalesDemo });',
                  '    config: cfgDemo, lang: langDemo, totalesHseq: totalesHseqDemo_(aj.registros, cfgDemo.anonN, cfgDemo.umbralEstado) });']],
  /* D3 · la cuenta sin la marca de la nómina de ejemplo: le llega «0 en la nómina», como antes de la vuelta 2 */
  sinNominaDeEjemplo: [['  if (esCuentaDemo) { nomTot = null; nomSinDato = null; nomSinDatoN = null; nomError = ""; }', '  void 0;'],
                       ['    nominaDeEjemplo: esCuentaDemo,', '    nominaDeEjemplo: false,']]
};
function p387Parchar(gs, cambios) {
  let s = gs || '';
  const faltan = [];
  (cambios || []).forEach(par => {
    const n = s.split(par[0]).length - 1;
    if (n !== 1) faltan.push(String(par[0]).trim().slice(0, 70) + ' ×' + n);
    else s = s.split(par[0]).join(par[1]);
  });
  return { gs: s, faltan: faltan };
}
function p387Gs(sabotaje) {
  if (!sabotaje) return { gs: CTX.gs, faltan: [] };
  return p387Parchar(CTX.gs, P387_SABOTAJES[sabotaje] || [['§§ sabotaje desconocido §§', '']]);
}
/* El mundo: el `.gs` (con o sin sabotaje) sobre el CH de prueba, con el reloj fijo si se pide. */
function p387Mundo(opc) {
  opc = opc || {};
  const g = p387Gs(opc.sabotaje);
  if (g.faltan.length) return { faltan: g.faltan };
  const env = GS.crearEntorno(p387Hojas(opc));
  if (opc.reloj) env.Date = GS.relojFijo(opc.reloj);
  const api = GS.cargarGs(g.gs, env, ['doPost', 'accionMantenimiento']);
  const w = { env: env, api: api, faltan: [] };
  w.post = p => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(p) }, parameter: {} }).getContent());
  w.visor = (vista, extra) => w.post(Object.assign({ action: 'supervisor', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-v',
                                                     verEmpresa: 'Empresa Demo', verVista: vista }, extra || {}));
  w.clave = (pass, extra) => w.post(Object.assign({ action: 'supervisor', usuario: P387_DEMO.usuario, empresa: P387_DEMO.usuario,
                                                    pass: pass, dispositivoId: 'p387-c' }, extra || {}));
  w.demo = extra => w.post(Object.assign({ action: 'demo', pass: P387_CLAVE_DEMO, dispositivoId: 'p387-d' }, extra || {}));
  w.hoja = n => env.SpreadsheetApp.openById('maestro').getSheetByName(n);
  w.token = () => (/var MANT_TOKEN = "([^"]+)"/.exec(CTX.gs || '') || [])[1] || '';
  return w;
}
function p387DiaCaracas(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
function p387Dias(a, b) {
  const p = s => String(s).split('-').map(Number), x = p(a), y = p(b);
  return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
}
function p387MasDias(d, n) {
  const p = String(d).split('-').map(Number), x = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return x.toISOString().slice(0, 10);
}
function p387SinCorrida(T) { const c = JSON.parse(JSON.stringify(T || null)); if (c) delete c.ultimaCorrida; return c; }
/* Cuántas de las 7 tarjetas de un período tienen número. */
function p387ConNumero(T, per) {
  const P = (((T || {}).periodos) || {})[per] || {};
  return Object.keys(P.metricas || {}).filter(m => P.metricas[m]).length;
}
/* Lo que quedó de la demostración en un payload médico: qué días, quiénes, y los instantes. */
function p387Foto(r) {
  const regs = (r && r.registros) || [];
  const f = regs.map(x => x.fecha).filter(Boolean).sort();
  return { n: regs.length, max: f[f.length - 1] || '', min: f[0] || '', personas: regs.map(x => x.persona),
           deHoy: hoy => regs.filter(x => x.fecha === hoy).map(x => x.persona).sort(),
           ts: regs.map(x => +x.ts || 0), pvt: (r && r.pvt) || [] };
}
/* Lo que esperaría la especificación (D1 y D2), calculado acá desde el fixture y no desde el `.gs`. */
function p387Esperado(reloj) {
  const ahora = Date.parse(reloj), hoy = p387DiaCaracas(ahora), k = p387Dias(P387_ANCLA, hoy);
  const quedan = P387_TESTS.filter(x => x[0] <= P387_ANCLA);
  const maxTs = Math.max.apply(null, quedan.map(x => p387Instante(x[0], x[1])));
  const exceso = Math.max(0, maxTs + k * 86400000 - ahora);
  return { ahora: ahora, hoy: hoy, k: k, exceso: exceso, quedan: quedan,
           delAncla: P387_TESTS.filter(x => x[0] === P387_ANCLA).map(x => x[2]).sort(),
           ts: quedan.map(x => p387Instante(x[0], x[1]) + k * 86400000 - exceso).sort((a, b) => a - b) };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   D1 · EL ANCLA (2 PERSONAS) Y EL CORTE AL DÍA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P387 · D1 · la demo y la cuenta anclan en el último día con 2 personas: la fila suelta (1 persona) queda FUERA, y el ancla cae HOY', () => {
  /* R19 · lo decide `demoDesplazamiento_` (el ancla, con `DEMO_ANCLA_MIN_PERSONAS`) y lo aplica `demoCorrerFilas_`, desde
     `demoAjustar`: la demostración (`accionDemo`) y la cuenta (`accionSupervisor`, por `esCuentaDemo_`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TARDE, sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    return { demo: p387Foto(w.demo()), cuenta: p387Foto(w.visor('medico')) };
  };
  const ok = medir(null), E = p387Esperado(P387_TARDE);
  PRUEBAS.igual(ok.faltan, undefined, 'guarda: el mundo se armó');
  [['la demostración', ok.demo], ['la cuenta (visor · Servicio médico)', ok.cuenta]].forEach(([q, f]) => {
    PRUEBAS.igual(f.max, E.hoy, '🔴 ' + q + ': lo más nuevo cae HOY en Caracas (' + E.hoy + '), y es el ancla del ' + P387_ANCLA);
    PRUEBAS.igual(f.deHoy(E.hoy), E.delAncla, '🔴 ' + q + ': hoy están las DOS personas del día ancla');
    PRUEBAS.igual(f.personas.filter(p => p === 'Rodolfo Ruiz').length, 0, '🔴 ' + q + ': la fila suelta (una persona, sólo KSS) queda FUERA');
    PRUEBAS.igual(f.n, E.quedan.length, q + ': ' + E.quedan.length + ' tests, deduplicados, hasta el ancla');
    PRUEBAS.igual(f.pvt.filter(x => x.persona === 'Rodolfo Ruiz' || x.fecha > E.hoy).length, 0, '🔴 ' + q + ': y lo mismo con los PVT');
    PRUEBAS.igual(f.pvt.filter(x => x.fecha === E.hoy).map(x => x.persona), ['Andrés Peña'], q + ': el PVT del día ancla, con su test, HOY');
  });
  /* DISCRIMINADOR 1 · anclando en la fecha más nueva (lo de antes de P387), la fila suelta arrastra todo */
  const mal1 = medir('anclaEnLaMasNueva');
  PRUEBAS.igual(mal1.faltan, undefined, 'guarda: el sabotaje entró');
  if (mal1.faltan) return;
  PRUEBAS.alMenos(mal1.demo.personas.filter(p => p === 'Rodolfo Ruiz').length, 1, 'DISCRIMINADOR · con el ancla en lo más nuevo, la fila suelta vuelve');
  /* DISCRIMINADOR 2 · con 3 (la vuelta 1), el día de 2 personas también queda fuera */
  const mal3 = medir('anclaConTres');
  PRUEBAS.igual(mal3.faltan, undefined, 'guarda: el sabotaje entró');
  if (mal3.faltan) return;
  PRUEBAS.cierto(JSON.stringify(mal3.demo.deHoy(E.hoy)) !== JSON.stringify(E.delAncla) && mal3.demo.n < E.quedan.length,
    'DISCRIMINADOR · con el umbral en 3, hoy no están las dos del día ancla (' + mal3.demo.deHoy(E.hoy).join(', ') + ') y faltan tests (' + mal3.demo.n + ')');
});

PRUEBAS.caso('🔴 P387 · la semana del panel de HSEQ completa los días que no son lunes (7 de 7); el lunes, «Mes» la muestra; por la cuenta y por la demostración', () => {
  /* R19 · lo que entra en cada período lo decide `totalesHseq_` con las unidades de `unidadesDemoHseq_`; que esas unidades
     caigan en esta semana lo decide el ancla (`demoDesplazamiento_`). A la cuenta se los da `accionSupervisor` con
     `esCuentaDemo` y `totalesHseqDemo_`. El lunes la semana sólo tiene el día ancla, de 2 personas, que no cierra un
     grupo de 5: es el costo aceptado de D1 = 2 (decisión de Franco). Ojo: un lunes que es día 1 tampoco tiene «Mes». */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const martes = p387Mundo({ reloj: P387_TARDE }), lunes = p387Mundo({ reloj: P387_LUNES });
  const viejo = p387Mundo({ reloj: P387_TARDE, sabotaje: 'anclaEnLaMasNueva' });
  PRUEBAS.igual([martes.faltan, lunes.faltan, viejo.faltan], [[], [], []], 'guarda: los mundos se armaron');
  if (viejo.faltan.length) return;
  [['la demostración', w => w.demo().totalesHseq], ['la cuenta (contraseña de HSEQ)', w => w.clave(P387_DEMO.hseq).totalesHseq]].forEach(([q, pedir]) => {
    const Tm = pedir(martes), Tl = pedir(lunes);
    PRUEBAS.igual(p387ConNumero(Tm, 'semana'), 7, '🔴 ' + q + ', el martes: la semana con número en las 7 tarjetas');
    PRUEBAS.igual(p387ConNumero(Tl, 'mes'), 7, '🔴 ' + q + ', el lunes 2: «Mes» con número en las 7 (la semana: ' + p387ConNumero(Tl, 'semana') + ' de 7)');
    PRUEBAS.cierto(String((Tm || {}).corteDia) >= p387MasDias(P387_HOY, -1), q + ': el último grupo completo es de ayer o de hoy · ' + (Tm || {}).corteDia);
  });
  PRUEBAS.comoMucho(p387ConNumero(viejo.demo().totalesHseq, 'semana'), 1,
    'DISCRIMINADOR · anclando en la fila suelta (lo de antes de P387), la semana del martes tiene una sola tarjeta: la del KSS de esa fila');
});

PRUEBAS.caso('🔴 P387 · D1 · el guion queda entero: nadie del elenco con «dato no reciente», y Carlos Méndez «requiere atención» (con 3, cae)', () => {
  /* R19 · «dato no reciente» lo decide `armarAptitudServer` (más de `APT_DIAS_FRESCO_GS` días desde el último test) sobre
     lo que dejó `demoAjustar`; el nivel de Carlos (`alto`, «requiere atención») lo decide el mismo motor con su historia, que
     el guion (`DEMO_GUION`) deja como está. El fixture es un MODELO del CH de hoy: las 19 personas del elenco con sus días
     de último test medidos el 2026-11-03 (el 16 de julio, 2: Carlos y Martín; el 15, 3; el 14, 8; el 13, 5) y la fila
     suelta del 5 de agosto (Rodolfo Ruiz, sólo KSS). No son las filas del CH: viven fuera del repositorio. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const ELENCO = [
    ['Carlos Méndez', 'Operaciones', ['2026-06-29', '2026-07-06', '2026-07-16']], ['Martín Ibáñez', 'Operaciones', ['2026-07-07', '2026-07-16']],
    ['Lucía Fernández', 'Operaciones', ['2026-07-08', '2026-07-15']], ['Nicolás Herrera', 'Tripulación', ['2026-07-06', '2026-07-15']],
    ['Julieta Cabrera', 'Tripulación', ['2026-07-08', '2026-07-15']], ['Diego Ramírez', 'Operaciones', ['2026-07-07', '2026-07-14']],
    ['Sofía Núñez', 'Operaciones', ['2026-07-07', '2026-07-14']], ['Valentina Ríos', 'Operaciones', ['2026-07-07', '2026-07-14']],
    ['José Duarte', 'Mantenimiento', ['2026-07-07', '2026-07-14']], ['Andrés Peña', 'Mantenimiento', ['2026-07-07', '2026-07-14']],
    ['Camila Torres', 'Administración', ['2026-07-07', '2026-07-14']], ['Federico Blanco', 'Administración', ['2026-07-07', '2026-07-14']],
    ['Ricardo Salcedo', 'Dirección', ['2026-07-07', '2026-07-14']], ['Rocío Vega', 'Mantenimiento', ['2026-07-06', '2026-07-13']],
    ['Tomás Aguirre', 'Mantenimiento', ['2026-07-06', '2026-07-13']], ['Ana Suárez', 'Administración', ['2026-07-06', '2026-07-13']],
    ['Gabriel Ortiz', 'Administración', ['2026-07-06', '2026-07-13']], ['Paula Giménez', 'Tripulación', ['2026-07-06', '2026-07-13']],
    ['Rodolfo Ruiz', 'Legal', ['2026-08-05']]
  ];
  /* la historia de Carlos (KSS, estrés, ansiedad): sube test a test, como en el CH */
  const CARLOS = [[6, 49, 37], [7, 56, 47], [8, 65, 54]];
  const filas = [];
  ELENCO.forEach(([p, dep, dias], i) => dias.forEach((d, j) => {
    const f = new Array(90).fill('');
    const dt = GS.fechaDeCelda(d + 'T' + String(9 + (i % 9)).padStart(2, '0') + ':' + String(10 + j).padStart(2, '0') + ':00');
    f[0] = dt; f[1] = p; f[2] = dep; f[72] = 'Empresa Demo'; f[73] = dt;
    if (p === 'Rodolfo Ruiz') { f[86] = 6; filas.push(f); return; }   // la fila suelta: sólo KSS
    const v = p === 'Carlos Méndez' ? CARLOS[j] : [3, 12, 10];
    f[86] = v[0]; p387Bloque(f, 4, 12, v[1]); p387Bloque(f, 37, 21, v[2]);
    filas.push(f);
  }));
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TARDE, sabotaje: sab, filas: filas, pvt: [] });
    if (w.faltan.length) return { faltan: w.faltan };
    return { sup: w.visor('supervisor').aptitud || [], dir: w.visor('direccion').aptitud || [] };
  };
  const ok = medir(null);
  PRUEBAS.igual(ok.sup.length, 18, 'guarda: las 18 que tienen tests hasta el ancla (Rodolfo sólo tenía la fila suelta)');
  PRUEBAS.igual(ok.sup.filter(a => a.viejo).map(a => a.nombre), [], '🔴 supervisor: nadie con «dato no reciente»');
  PRUEBAS.igual(ok.dir.filter(a => a.viejo).length, 0, '🔴 Dirección: nadie con «dato no reciente»');
  const carlos = ok.sup.filter(a => a.nombre === 'Carlos Méndez')[0] || {};
  PRUEBAS.igual([carlos.auto, carlos.viejo], ['alto', false], '🔴 Carlos Méndez «requiere atención», con su último test de hoy');
  /* DISCRIMINADOR · con el umbral en 3 (la vuelta 1), el 16 de julio queda fuera */
  const mal = medir('anclaConTres');
  PRUEBAS.igual(mal.faltan, undefined, 'guarda: el sabotaje entró');
  if (mal.faltan) return;
  PRUEBAS.igual(mal.sup.filter(a => a.viejo).map(a => a.nombre).sort(), ['Carlos Méndez', 'Martín Ibáñez'],
    'DISCRIMINADOR · con 3, Carlos Méndez y Martín Ibáñez pierden su último test y quedan con «dato no reciente»');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   D2 · `fecha` Y `ts` JUNTOS, POR DÍAS ENTEROS, NUNCA EN EL FUTURO, SIN EMPATAR
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P387 · D2 · pedido a las 22:00: cada `ts` corre los MISMOS días enteros que su `fecha`, y el día de su `ts` es su `fecha`', () => {
  /* R19 · `demoDesplazamiento_` da los días (`dias`) y lo que se corre `ts` (`ms`); los aplica `demoCorrerFilas_`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const E = p387Esperado(P387_TARDE);
  PRUEBAS.igual(E.exceso, 0, 'guarda: a las 22:00 nada queda adelante (el ancla termina a las 21:00)');
  const medir = sab => { const w = p387Mundo({ reloj: P387_TARDE, sabotaje: sab }); return w.faltan.length ? { faltan: w.faltan } : w.visor('medico'); };
  const r = medir(null);
  const f = p387Foto(r);
  PRUEBAS.igual(f.ts.slice().sort((a, b) => a - b), E.ts, '🔴 cada instante = el del CH + ' + E.k + ' días enteros');
  PRUEBAS.igual((r.registros || []).filter(x => p387DiaCaracas(+x.ts) !== x.fecha).map(x => x.persona + ' ' + x.fecha), [],
    '🔴 y el día de cada `ts` en Caracas es su `fecha`: los dos corrieron juntos');
  const mal = p387Foto(medir('tsSinCorrer'));
  PRUEBAS.cierto(mal.ts.every(t => p387DiaCaracas(t) < '2026-07-01'), 'DISCRIMINADOR · sin correr `ts` (lo de antes), los instantes siguen en junio');
});

PRUEBAS.caso('🔴 P387 · D2 · pedido a las 10:00: lo corrido a hoy no queda en el futuro, se le resta el exceso a TODOS y no se empata ningún instante; la línea de corte es reciente', () => {
  /* R19 · el exceso lo calcula `demoDesplazamiento_` y lo resta a todos `demoCorrerFilas_`; la línea de corte
     (`corte`) sale de `totalesHseq_` con esos `ts` (`a.hasta` → `sellada`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const E = p387Esperado(P387_TEMPRANO);
  PRUEBAS.cierto(E.exceso > 0, 'guarda: a las 10:00 el ancla (18:00 y 21:00) corrida a hoy queda adelante · exceso ' + E.exceso / 3600000 + ' h');
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TEMPRANO, sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    const r = w.visor('medico'), d = w.demo();
    return { f: p387Foto(r), demo: p387Foto(d), T: w.clave(P387_DEMO.hseq).totalesHseq };
  };
  const ok = medir(null);
  PRUEBAS.igual(ok.faltan, undefined, 'guarda');
  const distintos = a => new Set(a).size;
  PRUEBAS.comoMucho(Math.max.apply(null, ok.f.ts), E.ahora, '🔴 ningún `ts` queda adelante de ahora');
  PRUEBAS.igual(Math.max.apply(null, ok.f.ts), E.ahora, 'y el más nuevo es exactamente ahora (se restó lo justo)');
  PRUEBAS.igual(ok.f.ts.slice().sort((a, b) => a - b), E.ts, '🔴 a TODOS se les restó el mismo exceso: las distancias entre instantes quedan iguales');
  PRUEBAS.igual(distintos(ok.f.ts), E.quedan.length, '🔴 sin empatar: tantos instantes distintos como tests');
  PRUEBAS.igual(ok.f.max, E.hoy, 'y el día ancla sigue siendo HOY (`fecha` va por días enteros)');
  PRUEBAS.igual(ok.demo.ts.slice().sort((a, b) => a - b), E.ts, 'la demostración pública, igual');
  /* el último grupo completo cierra el día anterior al ancla (el ancla, de 2 personas, no completa uno): ayer */
  const corte = Date.parse((ok.T || {}).corte || '');
  PRUEBAS.cierto(corte > 0 && corte <= E.ahora && p387DiaCaracas(corte) >= p387MasDias(E.hoy, -1),
    '🔴 la línea de corte del panel de HSEQ es de ayer u hoy y no del futuro · ' + (ok.T || {}).corte + ' (antes decía junio/agosto)');
  /* DISCRIMINADORES */
  const sinEx = medir('sinExceso');
  PRUEBAS.cierto(Math.max.apply(null, sinEx.f.ts) > E.ahora, 'DISCRIMINADOR · sin el exceso, lo corrido a hoy queda en el futuro');
  const clamp = medir('recortaFilaPorFila');
  PRUEBAS.cierto(distintos(clamp.f.ts) < E.quedan.length, 'DISCRIMINADOR · recortando fila por fila se EMPATAN instantes (' + distintos(clamp.f.ts) + ' distintos)');
  const sinTs = medir('tsSinCorrer');
  const corteMal = Date.parse((sinTs.T || {}).corte || '');
  PRUEBAS.cierto(!(corteMal > 0 && p387DiaCaracas(corteMal) >= p387MasDias(E.hoy, -1)), 'DISCRIMINADOR · sin correr `ts`, la línea de corte es de junio · ' + (sinTs.T || {}).corte);
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   R21 · LA CUENTA RECIBE LOS MISMOS TOTALES QUE LA DEMOSTRACIÓN, EN LOS DOS IDIOMAS
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P387 · R21 · los `totalesHseq` del visor «Empresa Demo · HSEQ» y de la contraseña de HSEQ son los de `accionDemo`, también en inglés y por «Ver como…»', () => {
  /* R19 · «la cuenta Empresa Demo ve totales en el momento»: lo concede `accionSupervisor` con `esCuentaDemo` y
     `totalesHseqDemo_`, la MISMA función que usa `accionDemo`, sobre las mismas filas ya ajustadas. En inglés, `accionDemo`
     los calcula ANTES de traducir los departamentos (vuelta 2, hallazgo 3): el color de cada test sale del nivel de su
     departamento (`coloresTestsHseq_`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* Con el reloj FIJO, y a las 10:00 (con exceso): el corrimiento resta `ahora − el ts más nuevo`, así que con el
     reloj de verdad dos pedidos seguidos difieren en los milisegundos de su `corte` (medido: 693 contra 711 ms). */
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TEMPRANO, sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    const verComo = lang => p387SinCorrida(w.post({ action: 'demo', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-a', lang: lang }).totalesHseq);
    return { demo: p387SinCorrida(w.demo().totalesHseq), demoEn: p387SinCorrida(w.demo({ lang: 'en' }).totalesHseq),
             visor: p387SinCorrida(w.visor('hseq').totalesHseq), clave: p387SinCorrida(w.clave(P387_DEMO.hseq).totalesHseq),
             verComo: verComo('es'), verComoEn: verComo('en') };
  };
  const ok = medir(null), J = x => JSON.stringify(x);
  PRUEBAS.cierto(!!(ok.demo && ok.demo.periodos), 'guarda: la demostración trae sus totales');
  PRUEBAS.alMenos(p387ConNumero(ok.demo, 'todo'), 2, 'guarda: con números (si los dos vinieran vacíos, «iguales» no probaría nada)');
  PRUEBAS.igual(J(ok.visor), J(ok.demo), '🔴 el visor «Empresa Demo · HSEQ» recibe EXACTAMENTE los totales de la demostración');
  PRUEBAS.igual(J(ok.clave), J(ok.demo), '🔴 la contraseña de HSEQ de la cuenta, también');
  PRUEBAS.igual(J(ok.verComo), J(ok.demo), 'y «Ver como…» (la demo con la credencial del administrador), también');
  PRUEBAS.igual(J(ok.demoEn), J(ok.demo), '🔴 la demostración en inglés da los MISMOS totales que en español');
  PRUEBAS.igual(J(ok.verComoEn), J(ok.visor), '🔴 y «Ver como…» en inglés, los mismos que la cuenta');
  ['cuentaSinAjuste', 'cuentaLeeSellado'].forEach(s => {
    const mal = medir(s);
    PRUEBAS.igual(mal.faltan, undefined, 'guarda: el sabotaje «' + s + '» entró');
    PRUEBAS.cierto(J(mal.visor) !== J(mal.demo), 'DISCRIMINADOR · «' + s + '»: la cuenta deja de recibir los de la demostración');
  });
  const tr = medir('traduceAntes');
  PRUEBAS.igual(tr.faltan, undefined, 'guarda: el sabotaje «traduceAntes» entró');
  PRUEBAS.cierto(J(tr.demoEn) !== J(tr.demo) && J(tr.verComoEn) !== J(tr.visor),
    'DISCRIMINADOR · con los totales calculados después de traducir (lo de antes de la vuelta 2), en inglés el estado sale distinto');
  PRUEBAS.igual(J(tr.demo), J(tr.visor), 'CONTROL del sabotaje · en español sigue igual: lo que cambia es sólo el idioma');
});

PRUEBAS.caso('🔴 P387 · la cuenta Empresa Demo trae los costos de la demostración (la pestaña Costos); una fila propia de costos gana en las dos', () => {
  /* R19 · `demoConfig_`, que llaman `accionDemo` y `accionSupervisor` (con `esCuentaDemo`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const w = p387Mundo();
  const dir = w.visor('direccion'), demo = w.demo();
  PRUEBAS.cierto(!!(dir.config && dir.config.costos), '🔴 el visor «Empresa Demo · Dirección» trae costos');
  PRUEBAS.igual(JSON.stringify((dir.config || {}).costos), JSON.stringify((demo.config || {}).costos), 'y son los de la demostración');
  PRUEBAS.cierto(!!((w.clave(P387_DEMO.dir).config || {}).costos), 'la contraseña de Dirección, también');
  const propia = p387Mundo({ costosDemo: true });
  PRUEBAS.igual([(propia.visor('direccion').config.costos || {}).horaHombre, (propia.demo().config.costos || {}).horaHombre], [99, 99],
    'con una fila propia de costos para Empresa Demo en `Config Empresa`, ESA gana, en la cuenta y en la demostración');
  const mal = p387Mundo({ sabotaje: 'cuentaSinCostos' });
  PRUEBAS.igual(mal.faltan, [], 'guarda');
  PRUEBAS.falso(!!((mal.visor('direccion').config || {}).costos), 'DISCRIMINADOR · sin `demoConfig_` en la cuenta, no hay costos');
});

PRUEBAS.caso('🔴 P387 · D3 · la cuenta Empresa Demo no manda «0 en la nómina»: manda lo mismo que la demostración (ningún número) y la marca `nominaDeEjemplo`', () => {
  /* R19 · lo decide `accionSupervisor` con `esCuentaDemo`; `accionDemo` no manda ningún número de nómina. El cliente usa
     entonces `nominaDemo()` para las dos (`demoNominaDeEjemplo`): ver el caso del cartel, más abajo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const w = p387Mundo();
  const demo = w.demo();
  PRUEBAS.igual(['nominaTotal', 'nominaSinDato', 'nominaSinDatoN'].map(k => demo[k]), [undefined, undefined, undefined],
    'guarda: la demostración no manda ningún número de nómina');
  [['visor HSEQ', w.visor('hseq')], ['visor Dirección', w.visor('direccion')], ['contraseña de supervisor', w.clave(P387_DEMO.sup)]].forEach(([q, r]) => {
    PRUEBAS.igual([r.nominaTotal, r.nominaSinDato, r.nominaSinDatoN, r.nominaDeEjemplo], [null, null, null, true],
      '🔴 ' + q + ': sin números de nómina (`null`, no `0`) y con la marca de la nómina de ejemplo');
  });
  const helitec = w.post({ action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'sup-h387', dispositivoId: 'p387-n' });
  PRUEBAS.igual([helitec.nominaTotal, helitec.nominaDeEjemplo], [5, false], 'CONTROL · una empresa real sigue con su nómina del CH y sin la marca');
  const mal = p387Mundo({ sabotaje: 'sinNominaDeEjemplo' });
  PRUEBAS.igual(mal.faltan, [], 'guarda');
  if (mal.faltan.length) return;
  const m = mal.visor('hseq');
  PRUEBAS.igual([m.nominaTotal, m.nominaDeEjemplo], [0, false], 'DISCRIMINADOR · sin el arreglo, «0 en la nómina» y sin la marca');
});

PRUEBAS.caso('🔒 P387 · «Todas las empresas» NO se corre (Empresa Demo convive con las reales); el administrador con «Empresa Demo» como empresa de trabajo, sí', () => {
  /* R19 · `esCuentaDemo_` mira sólo `gestScope`: con «Todas» devuelve el centinela; con la empresa elegida (P213), el
     canónico de Empresa Demo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TARDE, sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    const todas = w.post({ action: 'supervisor', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-t' });
    const elegida = w.post({ action: 'supervisor', usuario: '*', pass: P387_ADMIN, empresa: 'Empresa Demo', dispositivoId: 'p387-t' });
    const deDemo = r => (r.registros || []).filter(x => x.empresa === 'Empresa Demo');
    return { todas: deDemo(todas), elegida: deDemo(elegida), helitec: (todas.registros || []).filter(x => x.empresa === 'Helitec'),
             todasNom: [todas.nominaTotal, todas.nominaDeEjemplo] };
  };
  const ok = medir(null);
  const filasCh = P387_TESTS.length + P387_TESTS.filter(x => x[0] === '2026-06-02').length;
  PRUEBAS.igual(ok.todas.length, filasCh, '🔒 «Todas las empresas»: las filas de Empresa Demo del CH tal cual, duplicados incluidos');
  PRUEBAS.cierto(ok.todas.every(x => x.fecha < '2026-07-01'), '🔒 y con sus fechas del CH (junio)');
  PRUEBAS.cierto(ok.helitec.length === 5 && ok.helitec.every(x => x.fecha === '2026-06-02'), 'y las de la empresa real, intactas');
  PRUEBAS.igual(ok.todasNom, [5, false], '🔒 y la nómina de todas, la del CH, sin la marca de ejemplo');
  PRUEBAS.igual(p387Foto({ registros: ok.elegida }).max, P387_HOY, 'CONTROL · con «Empresa Demo» como empresa de trabajo, corre');
  const mal = medir('todasSeCorre');
  PRUEBAS.igual(mal.faltan, undefined, 'guarda');
  PRUEBAS.falso(mal.todas.every(x => x.fecha < '2026-07-01'), 'DISCRIMINADOR · si «Todas» también corriera, las fechas cambiarían');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   PRIVACIDAD POR VISTA, CON LOS DATOS DE LA DEMOSTRACIÓN (R19: quién concede cada cosa)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P387_PUNTAJES = ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'];
const p387ConPuntaje = r => ((r && r.registros) || []).some(x => x && P387_PUNTAJES.some(m => x[m] != null && x[m] !== ''));
const p387Opacos = r => ((r && r.registros) || []).length > 0 && r.registros.every(x => /^P\d+$/.test(String(x.persona)));
const p387Reales = r => ((r && r.registros) || []).filter(x => P387_GENTE[x.persona]).length;

PRUEBAS.caso('🔒 P387 · HSEQ (visor y contraseña): totales, sí; aptitud por persona, nombres, puntajes, días y comentarios, no', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const medir = sab => { const w = p387Mundo({ sabotaje: sab }); return w.faltan.length ? null : [['visor', w.visor('hseq')], ['contraseña', w.clave(P387_DEMO.hseq)]]; };
  medir(null).forEach(([q, r]) => {
    PRUEBAS.igual([r.vista, r.panel], ['hseq', 'hseq'], 'guarda: ' + q + ' abre el panel de HSEQ');
    /* R19 · los totales: `esCuentaDemo` + `totalesHseqDemo_` (los da sólo `esPanelHseq_`) */
    PRUEBAS.cierto(!!(r.totalesHseq && r.totalesHseq.periodos), q + ' · recibe los totales');
    /* R19 · sin aptitud: `aptitudPayload = esPanelHseq_(acc) ? null : …` en `accionSupervisor` */
    PRUEBAS.igual(r.aptitud, null, '🔒 ' + q + ' · sin aptitud por persona');
    /* R19 · P1, P2…: el recorte por vista (`anonimizarHseq`, lista blanca); sin puntajes ni días: `armarAptitudServer` */
    PRUEBAS.cierto(p387Opacos(r), '🔒 ' + q + ' · sólo seudónimos (P1, P2…)');
    PRUEBAS.falso(p387ConPuntaje(r), '🔒 ' + q + ' · sin un puntaje');
    PRUEBAS.igual((r.registros || []).filter(x => x.fecha !== undefined).length, 0, '🔒 ' + q + ' · sin un día');
    /* R19 · comentarios sólo con la vista médica (`acc.vista === "medico"`) */
    PRUEBAS.igual(r.comentarios, [], '🔒 ' + q + ' · sin comentarios');
    /* R19 · D3 · y ningún nombre de la nómina: el servidor no manda lista (`null`), y el cliente no la arma con seudónimos */
    PRUEBAS.igual(r.nominaSinDato, null, '🔒 ' + q + ' · sin lista de nombres de la nómina');
  });
  const conApt = medir('hseqConAptitud'), sinRec = medir('sinRecorte');
  PRUEBAS.cierto(Array.isArray(conApt[0][1].aptitud), 'DISCRIMINADOR · sin `esPanelHseq_` en la aptitud, al panel de HSEQ le llega la de cada persona');
  PRUEBAS.alMenos(p387Reales(sinRec[0][1]), 1, 'DISCRIMINADOR · sin el recorte por vista, le llegan nombres');
});

PRUEBAS.caso('🔒 P387 · Dirección (visor y contraseña): sin totales de HSEQ, y la aptitud con seudónimos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const w = p387Mundo();
  [['visor', w.visor('direccion')], ['contraseña', w.clave(P387_DEMO.dir)]].forEach(([q, r]) => {
    PRUEBAS.igual([r.vista, r.panel], ['hseq', 'direccion'], 'guarda: ' + q + ' abre Dirección');
    /* R19 · «Dirección no los ve»: los totales los da sólo `esPanelHseq_` (ADR 017) */
    PRUEBAS.igual(r.totalesHseq, null, '🔒 ' + q + ' · sin los totales de HSEQ');
    PRUEBAS.cierto(p387Opacos(r), '🔒 ' + q + ' · sólo seudónimos');
    /* R19 · la aptitud de Dirección pasa por el mismo recorte (`anonimizarHseq`) */
    PRUEBAS.cierto(Array.isArray(r.aptitud) && r.aptitud.length > 0 && r.aptitud.every(a => /^P\d+$/.test(String(a.nombre))), '🔒 ' + q + ' · su aptitud, con seudónimos');
    PRUEBAS.igual(r.aptitud.filter(a => a.viejo).length, 0, 'y ninguna persona con «dato no reciente»: los datos de la demo están al día');
  });
});

PRUEBAS.caso('🔒 P387 · DISCRIMINADOR de los dos de arriba · supervisor (visor y contraseña) con nombres y sin puntajes; el médico, con nombres, puntajes y días corridos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const w = p387Mundo({ reloj: P387_TARDE });
  [['visor', w.visor('supervisor')], ['contraseña', w.clave(P387_DEMO.sup)]].forEach(([q, r]) => {
    PRUEBAS.igual(r.vista, 'supervisor', 'guarda: ' + q + ' abre Supervisor');
    /* R19 · el supervisor ve nombres: `recortarParaVista_` sólo actúa con la vista `hseq` */
    PRUEBAS.alMenos(p387Reales(r), 5, q + ' · con nombres (si el de arriba diera seudónimos por recortar a todos, este caería)');
    /* R19 · sin puntajes: `armarAptitudServer` (E2a) */
    PRUEBAS.falso(p387ConPuntaje(r), '🔒 ' + q + ' · sin un puntaje');
    PRUEBAS.cierto(Array.isArray(r.aptitud) && r.aptitud.some(a => P387_GENTE[a.nombre]), q + ' · la aptitud, con nombres');
  });
  const med = w.visor('medico');
  PRUEBAS.cierto(p387ConPuntaje(med) && p387Reales(med) > 0, 'el médico (visor): nombres y puntajes');
  PRUEBAS.igual(p387Foto(med).max, P387_HOY, 'y los días, corridos');
  PRUEBAS.igual(w.clave(P387_DEMO.sup, { pedida: 'medico' }).vista, 'medico', 'la cuenta combinada por la pestaña médica abre Servicio médico (P301)');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   R22 · EMPRESA DEMO NUNCA SE SELLA, Y LA CUENTA NO LEE LO SELLADO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P387 · R22 · después de `hseq_sellar`, `Totales HSEQ` no tiene nada de Empresa Demo; y una fila puesta a mano no cambia lo que ve la cuenta', () => {
  /* R19 · la exclusión del sellador (`sellarTotalesHseq_`: «la demostración no se sella»); que la cuenta no lea lo
     sellado lo decide `esCuentaDemo` ANTES de `totalesHseqDeEmpresa_`. Con la gente de Empresa Demo EN la nómina:
     sin eso el sellador no podría sellarla ni aunque no la salteara, y el sabotaje no discriminaría. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const filasDe = (w, e) => {
    const h = w.hoja('Totales HSEQ');
    return h ? h.getDataRange().getValues().slice(1).filter(f => String(f[1]).toLowerCase().indexOf(e) >= 0 || String(f[0]).toLowerCase() === (e === 'demo' ? 'demo' : '§')) : [];
  };
  const medir = sab => {
    const w = p387Mundo({ nominaDemo: true, reloj: P387_TEMPRANO, sabotaje: sab });   // reloj fijo: ver el caso de R21
    if (w.faltan.length) return { faltan: w.faltan };
    const s = JSON.parse(w.api.accionMantenimiento({ tarea: 'hseq_sellar', token: w.token() }).getContent());
    return { w: w, s: s, demo: filasDe(w, 'demo'), helitec: filasDe(w, 'helitec') };
  };
  const ok = medir(null);
  PRUEBAS.cierto(ok.s && ok.s.ok && ok.s.r && ok.s.r.ok !== false, 'guarda: el sellado corrió · ' + JSON.stringify((ok.s || {}).error || (ok.s && ok.s.r && ok.s.r.causa) || ''));
  PRUEBAS.alMenos(ok.helitec.length, 1, 'guarda: selló la empresa real (si no selló nada, «sin Empresa Demo» no probaría nada)');
  PRUEBAS.igual(ok.demo.length, 0, '🔒 ninguna fila de Empresa Demo en `Totales HSEQ`');
  /* la cuenta, antes y después de una fila de Empresa Demo agregada A MANO a la hoja */
  const antes = JSON.stringify(p387SinCorrida(ok.w.clave(P387_DEMO.hseq).totalesHseq));
  const fila = ['demo', 'Empresa Demo', 'kss', 1, P387_HOY, 5, 45, 0, 0, 5, 5, new Date().toISOString(), new Date().toISOString(), 'h1,h2,h3,h4,h5', '', '', '', ''];
  ok.w.hoja('Totales HSEQ').appendRow(fila);
  const despues = JSON.stringify(p387SinCorrida(ok.w.clave(P387_DEMO.hseq).totalesHseq));
  PRUEBAS.igual(despues, antes, '🔒 la cuenta no lee lo sellado: sus totales son los mismos con la fila a mano');
  PRUEBAS.igual(despues, JSON.stringify(p387SinCorrida(ok.w.demo().totalesHseq)), 'y siguen siendo los de la demostración');
  /* DISCRIMINADORES */
  const mal = medir('selladorConDemo');
  PRUEBAS.igual(mal.faltan, undefined, 'guarda');
  PRUEBAS.alMenos(mal.demo.length, 1, 'DISCRIMINADOR · sin la exclusión, el sellador sí sella Empresa Demo');
  const lee = p387Mundo({ nominaDemo: true, reloj: P387_TEMPRANO, sabotaje: 'cuentaLeeSellado' });
  PRUEBAS.igual(lee.faltan, [], 'guarda');
  if (lee.faltan.length) return;
  lee.api.accionMantenimiento({ tarea: 'hseq_sellar', token: lee.token() });
  const leeT = JSON.stringify(p387SinCorrida(lee.clave(P387_DEMO.hseq).totalesHseq));
  PRUEBAS.cierto(leeT !== JSON.stringify(p387SinCorrida(lee.demo().totalesHseq)), 'DISCRIMINADOR · si la cuenta leyera lo sellado, no recibiría los totales de la demostración');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   D4 · «ACTIVIDAD RECIENTE» DE LA CUENTA, CON EL MISMO DESPLAZAMIENTO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P387 · D4 · «Actividad reciente» de la cuenta Empresa Demo pone sus pruebas donde las pone el panel; la bitácora no se corre; HSEQ sigue sin pruebas', () => {
  /* R19 · `accionActividad` con `esCuentaDemo_` y `demoDesplazamientoDeCuenta_` → `demoDesplazamiento_`, la MISMA
     derivación que usa `demoAjustar` para el panel (R21: el mismo corrimiento sale de las mismas filas). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const medir = sab => {
    const w = p387Mundo({ reloj: P387_TEMPRANO, sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    const act = w.post({ action: 'actividad', n: '50', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-a',
                         verEmpresa: 'Empresa Demo', verVista: 'direccion' });
    const actH = w.post({ action: 'actividad', n: '50', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-a',
                          verEmpresa: 'Empresa Demo', verVista: 'hseq' });
    return { act: act, actH: actH, panel: p387Foto(w.visor('medico')) };
  };
  const ok = medir(null), E = p387Esperado(P387_TEMPRANO);
  PRUEBAS.igual(ok.act.ok, true, 'guarda: la actividad responde · ' + (ok.act.error || ''));
  const tsTests = (ok.act.items || []).filter(i => i.tipo === 'test').map(i => i.ts);
  PRUEBAS.alMenos(tsTests.length, E.quedan.length, 'guarda: llegan las pruebas (con sus duplicados del CH)');
  PRUEBAS.igual([...new Set(tsTests)].sort((a, b) => a - b), [...new Set(ok.panel.ts)].sort((a, b) => a - b),
    '🔴 los instantes de las pruebas son los MISMOS que los del panel de la cuenta (y nada de lo que la demostración deja fuera)');
  PRUEBAS.comoMucho(ok.act.ultima, E.ahora, 'y el «último movimiento» no está en el futuro');
  const bit = (ok.act.items || []).filter(i => i.tipo === 'accion');
  PRUEBAS.igual(bit.map(i => i.ts), [Date.parse('2026-10-20T15:00:00Z')], '🔒 la acción de bitácora conserva su hora real: es un hecho (R3)');
  PRUEBAS.igual([ok.actH.tests, (ok.actH.items || []).filter(i => i.tipo === 'test').length], [null, 0], '🔒 al panel de HSEQ no le llega ninguna prueba (P385)');
  const mal = medir('actividadSinCorrer');
  PRUEBAS.igual(mal.faltan, undefined, 'guarda');
  const tsMal = (mal.act.items || []).filter(i => i.tipo === 'test').map(i => i.ts);
  PRUEBAS.cierto(tsMal.every(t => p387DiaCaracas(t) < '2026-07-01'), 'DISCRIMINADOR · sin correr, las pruebas salen con su hora real de junio');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL BLOQUE P107b, A NIVEL GLOBAL
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P387 · `tarea=verificar_niveles` vuelve a andar: el bloque P107b ya no está anidado en `accionDemo`', () => {
  /* R19 · la tarea la concede `accionMantenimiento` → `demoVerificarNiveles`, que tiene que ser global. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const tarea = sab => {
    const w = p387Mundo({ sabotaje: sab });
    if (w.faltan.length) return { faltan: w.faltan };
    return JSON.parse(w.api.accionMantenimiento({ tarea: 'verificar_niveles', token: w.token() }).getContent());
  };
  const ok = tarea(null);
  PRUEBAS.igual([ok.ok, ok.r], [true, []], '🔴 responde, y los niveles de la demo resuelven bien · ' + (ok.error || ''));
  let globales = '';
  try { GS.cargarGs(CTX.gs, GS.crearEntorno({}), ['demoAjustar', 'demoVerificarNiveles', 'demoNivelDe', 'demoDesplazamiento_', 'demoConfig_', 'esCuentaDemo_']); }
  catch (e) { globales = String(e.message || e); }
  PRUEBAS.igual(globales, '', 'y las funciones de la demostración son globales');
  const mal = tarea('anidada');
  PRUEBAS.igual(mal.faltan, undefined, 'guarda: el sabotaje entró');
  PRUEBAS.cierto(mal.ok === false && /demoVerificarNiveles is not defined/.test(String(mal.error || '')),
    'DISCRIMINADOR · anidada otra vez, la tarea falla como hasta P387 · ' + (mal.error || ''));
});

PRUEBAS.caso('🔒 P387 · D5 · la rama `p.demo === "1"` ya no existe: un POST con `demo:"1"` recibe el panel de su propia cuenta', () => {
  /* R19 · ninguna función concede ya «ver la Empresa Demo» desde otra cuenta: la rama se sacó de `accionSupervisor`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  PRUEBAS.igual(CTX.gs.indexOf('if (p.demo === "1")'), -1, 'la rama no está en el `.gs`');
  const w = p387Mundo();
  const r = w.post({ action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'sup-h387', demo: '1', dispositivoId: 'p387-r' });
  PRUEBAS.igual(r.ok, true, 'guarda: responde');
  PRUEBAS.falso(!!r.demo, '🔒 no es la demostración');
  PRUEBAS.igual((r.registros || []).filter(x => x.empresa === 'Empresa Demo' || P387_GENTE[x.persona]).length, 0, '🔒 y no trae nada de Empresa Demo');
  PRUEBAS.alMenos((r.registros || []).length, 1, 'CONTROL · trae lo suyo');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL CLIENTE · «Ver como…» POR EL CAMINO REAL: Más → contraseña → botón, con `DASH` en `null`
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los pedidos del panel, enrutados al `doPost`/`doGet` del `.gs` real (el patrón de `p385Banco`). Lo que no es el
   endpoint del panel no resuelve nunca (candado). `opc.sabotaje`: el `.gs` con un sabotaje; `opc.reloj`: «ahora» fijo
   del lado del servidor. `B.retener`: los pedidos que cumplan quedan en vuelo hasta `B.soltar()`. */
function p387Banco(opc) {
  opc = opc || {};
  const g = p387Gs(opc.sabotaje);
  const env = GS.crearEntorno(p387Hojas(opc));
  if (opc.reloj) env.Date = GS.relojFijo(opc.reloj);
  const api = GS.cargarGs(g.gs, env, ['doPost', 'doGet']);
  const B = { env: env, api: api, faltan: g.faltan, pedidos: [], respuestas: [], toasts: [], retener: null, retenidos: [] };
  const responder = (u, opts) => {
    if (String(u).indexOf(SHEETS_DASHBOARD_URL) !== 0) return new Promise(() => {});
    let salida, cuerpo = {};
    if (opts && String(opts.method || '').toUpperCase() === 'POST') {
      try { cuerpo = JSON.parse(String(opts.body || '{}')); } catch (e) {}
      salida = api.doPost({ postData: { contents: String(opts.body || '') }, parameter: {} });
    } else {
      new URL(String(u)).searchParams.forEach((v, k) => { cuerpo[k] = v; });
      salida = api.doGet({ parameter: cuerpo });
    }
    const txt = salida.getContent();
    let obj = null; try { obj = JSON.parse(txt); } catch (e) {}
    /* la contraseña no se guarda: sólo si vino una de verdad (y no la cadena «undefined») */
    const anotado = Object.assign({}, cuerpo, { pass: (cuerpo.pass && cuerpo.pass !== 'undefined') ? 'con-clave' : String(cuerpo.pass) });
    B.pedidos.push(anotado); B.respuestas.push(obj);
    const r = { ok: true, status: 200, json: () => Promise.resolve(JSON.parse(txt)), text: () => Promise.resolve(txt) };
    if (B.retener && B.retener(cuerpo)) return new Promise(res => { B.retenidos.push(() => res(r)); });
    return Promise.resolve(r);
  };
  B.prev = { fetchConReloj: window.fetchConReloj, fetch: window.fetch, showToast: window.showToast };
  window.fetchConReloj = (u, o) => responder(u && u.url ? u.url : u, o);
  window.fetch = function (u, o) {
    const url = String(u && u.url ? u.url : u);
    if (url.indexOf(SHEETS_DASHBOARD_URL) === 0) return responder(url, o);
    return B.prev.fetch.apply(window, arguments);
  };
  window.showToast = m => { B.toasts.push(String(m)); };
  B.restaurar = () => { window.fetchConReloj = B.prev.fetchConReloj; window.fetch = B.prev.fetch; window.showToast = B.prev.showToast; };
  B.soltar = () => { const r = B.retenidos.splice(0); r.forEach(f => f()); return r.length; };
  B.demos = () => B.pedidos.filter(p => p.action === 'demo');
  return B;
}
/* R18 · el estado de partida y la restauración, en el `.finally()` de la PROMESA. Las funciones que un caso cambia para
   sabotear el cliente vuelven a su lugar acá, pase lo que pase. */
const P387_FUNCS = ['admAuth', 'demoPayloadDeVista', 'admCredencialVencida', 'movDemoInstante', 'simRotulo'];
function p387Correr(fn, opc) {
  const prev = { dash: DASH, demoPayload: DEMO_PAYLOAD, mov: MOV, ls: Object.assign({}, localStorage), funcs: {}, now: Date.now,
                 vista: (document.getElementById('viewMas') || {}).style && document.getElementById('viewMas').style.display !== 'none' ? 'mas' : 'inicio' };
  P387_FUNCS.forEach(k => { prev.funcs[k] = window[k]; });
  let B = null;
  return Promise.resolve()
    .then(() => {
      try { closePortal(true); } catch (e) {}
      CTX.resetear();
      try { sessionStorage.removeItem(K_ADM_OK); } catch (e) {}
      DASH = null; SIMUL = null; ADM_PASS = ''; MOV = undefined;
      B = p387Banco(opc);
      return fn(B);
    })
    .finally(() => {
      Date.now = prev.now;
      P387_FUNCS.forEach(k => { window[k] = prev.funcs[k]; });
      try { if (B) { B.retener = null; B.soltar(); B.restaurar(); } } catch (e) {}
      try { closePortal(true); } catch (e) {}
      try { stopDashAutoRefresh(); cicloTickStop(); dashNivelesFrenar(); } catch (e) {}
      SIMUL = null; try { simPintarBarra(); } catch (e) {}
      DASH = prev.dash; DEMO_PAYLOAD = prev.demoPayload; ADM_PASS = ''; MOV = prev.mov;
      try { sessionStorage.removeItem(K_ADM_OK); } catch (e) {}
      const $ = id => document.getElementById(id);
      if ($('admPanel')) $('admPanel').hidden = true;
      if ($('admBox')) $('admBox').hidden = true;
      if ($('admErr')) $('admErr').textContent = '';
      if ($('admPass')) $('admPass').value = '';
      if ($('admChev')) $('admChev').style.transform = '';
      if ($('admBtn')) $('admBtn').setAttribute('aria-expanded', 'false');
      try { mostrarVista(prev.vista); } catch (e) {}
      try { localStorage.clear(); Object.keys(prev.ls).forEach(k => localStorage.setItem(k, prev.ls[k])); } catch (e) {}
    });
}
/* Más → «Ver como administrador» → contraseña → «Entrar» (`admEntrar`, el botón de verdad). */
async function p387AdmEntrar(clave) {
  mostrarVista('mas');
  const box = document.getElementById('admBox'), panel = document.getElementById('admPanel');
  if (box.hidden && panel.hidden) admToggle();
  document.getElementById('admPass').value = clave || P387_ADMIN;
  admEntrar(document.querySelector('#admBox .save-btn'));
  return PRUEBAS.esperarA(() => !panel.hidden && document.querySelectorAll('#admRoles .adm-rol').length > 0, CARGA_MIN_MS + 3000);
}
/* El botón de un rol en la grilla de «Ver como…». */
function p387Boton(k) {
  return [...document.querySelectorAll('#admRoles .adm-rol')].find(x => String(x.getAttribute('onclick') || '').indexOf("'" + k + "'") >= 0) || null;
}
/* Toca el botón de un rol (el `onclick` real) y espera a que el panel termine de pintar (o `hasta`, si se pasa). */
async function p387TocarRol(k, hasta) {
  const b = p387Boton(k);
  if (!b) return { boton: null };
  const titulo = (b.querySelector('.adm-rol-t') || {}).textContent || '';
  b.click();
  const abrio = await PRUEBAS.esperarA(hasta || (() => !!DASH && !document.querySelector('#dashBody .dsk')), 4000);
  return { boton: b, titulo: titulo, abrio: abrio };
}

PRUEBAS.caso('🔴 P387 · «Ver como…» desde Más, con DASH en null: contraseña de administrador → «HSEQ» abre el panel NUEVO de HSEQ, y el ↻ no lo pierde', () => {
  /* R19 · entrar sin la clave de la demostración lo concede `accionDemo` (`validarAcceso` con la credencial del
     administrador); la credencial la arma `admAuth` (sin panel); el panel nuevo lo elige la marca que pone
     `demoPayloadDeVista`, y `hseqEsPanel` la lee. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  return p387Correr(async B => {
    PRUEBAS.igual(DASH, null, 'guarda: el panel está cerrado, como en Más');
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: la contraseña de administrador entró (`admEntrar`)');
    const t0 = B.demos().length;
    const r = await p387TocarRol('hseqPanel');
    PRUEBAS.cierto(!!r.boton, 'guarda: el botón HSEQ existe');
    PRUEBAS.cierto(r.abrio, '🔴 abrió un panel');
    const p = B.demos()[t0] || {};
    PRUEBAS.cierto(p.usuario === '*' && p.empresa === '*' && p.pass === 'con-clave' && !!p.dispositivoId,
      '🔴 el pedido lleva la credencial del administrador (no «undefined») · ' + JSON.stringify(p));
    PRUEBAS.igual(B.toasts.filter(x => x === t('ts_sim_demo_pass')).length, 0, 'sin «la demostración pide una clave»');
    PRUEBAS.igual([DASH && DASH.vista, DASH && DASH.panel, hseqEsPanel()], ['hseq', 'hseq', true], '🔴 es el panel de HSEQ (marca `panel:"hseq"`)');
    PRUEBAS.igual(vistaLabel('hseq'), t('vista_panel_hseq'), 'el rótulo dice «HSEQ»');
    PRUEBAS.igual(r.titulo, vistaLabel('hseq'), 'y es el mismo texto del botón que se tocó');
    PRUEBAS.igual(demoVistaActual(), 'hseqPanel', 'el ojo lo marca');
    PRUEBAS.igual(SIMUL && SIMUL.vista, 'hseq', 'la simulación es de la vista `hseq`');
    PRUEBAS.igual(DASH.f.period, 'semana', 'abre en la semana');
    /* «todo» y no «semana»: con D1 = 2, un lunes la semana de la demo queda vacía a propósito (lo mide el caso de la semana) */
    PRUEBAS.alMenos(p387ConNumero(DASH.totalesHseq, 'todo'), 2, '🔴 con los totales de la demostración, con números');
    await dashRefresh(true);
    PRUEBAS.igual([DASH && DASH.panel, hseqEsPanel()], ['hseq', true], 'el ↻ no lo pierde (`dashRefresh` vuelve a pasar por `demoPayloadDeVista`)');
  });
});

PRUEBAS.caso('🔴 P387 · «Ver como…» · «Dirección» abre Dirección (no «Dirección / HSEQ»), y los dos sabotajes del cliente ponen los dos casos en rojo', () => {
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  return p387Correr(async B => {
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    const r = await p387TocarRol('hseq');
    PRUEBAS.cierto(r.abrio, 'abrió');
    PRUEBAS.igual([DASH && DASH.vista, DASH && DASH.panel, hseqEsPanel()], ['hseq', 'direccion', false], '🔴 es Dirección, con su marca');
    PRUEBAS.igual(vistaLabel('hseq'), t('vista_direccion'), 'el rótulo dice «Dirección»');
    PRUEBAS.igual(r.titulo, t('vista_direccion'), 'igual que el botón');
    /* DISCRIMINADOR 1 · el armador VIEJO (`dashAuth()` con el panel cerrado): sale «undefined» y no abre nada.
       `admAuth` se cambia en el momento: `simEntrar` la llama por su nombre global. La restaura `p387Correr`. Con la
       vuelta 2 el rechazo hace olvidar la credencial y vuelve a pedir la contraseña: se vuelve a entrar para el 2. */
    const admAuthReal = window.admAuth;
    simSalir(true);
    window.admAuth = extra => dashAuth(extra);
    const n0 = B.demos().length;
    await p387TocarRol('hseqPanel', () => B.demos().length > n0 && !simulando());
    const pv = B.demos()[n0] || {};
    PRUEBAS.cierto(pv.pass === 'undefined' && String(pv.usuario) === 'undefined', 'DISCRIMINADOR · con el armador viejo la credencial sale «undefined» · ' + JSON.stringify(pv));
    PRUEBAS.cierto(!DASH && !document.getElementById('admBox').hidden, 'DISCRIMINADOR · y no se ve ninguna vista: vuelve a pedir la contraseña');
    /* DISCRIMINADOR 2 · con la credencial buena pero sin la marca (`demoPayloadDeVista` que devuelve el payload tal
       cual, como hacía `simEntrar`): no es el panel de HSEQ */
    window.admAuth = admAuthReal;
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: vuelve a entrar el administrador');
    window.demoPayloadDeVista = d => d;
    const r2 = await p387TocarRol('hseqPanel');
    PRUEBAS.cierto(r2.abrio && !!DASH && DASH.panel === null && !hseqEsPanel(), 'DISCRIMINADOR · sin la marca, «HSEQ» abre la demo sin el panel nuevo (lo de antes) · panel ' + (DASH && DASH.panel));
  });
});

PRUEBAS.caso('🔴 P387 · sin credencial (la página se recargó y no hay sesión guardada) NO sale ningún pedido: se vuelve a pedir la contraseña; con la sesión guardada, sí abre', () => {
  /* R19 · `admAuth` devuelve `null` sin `ADM_PASS` ni `admSesionGuardada()`; `simEntrar` no manda nada y llama
     `admPedirClave`. La sesión guardada (el token que emite `accionSupervisor` con `recordar`) es credencial válida:
     la resuelve `validarAcceso`. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  return p387Correr(async B => {
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    /* «recargar»: `ADM_PASS` vive en memoria y se pierde; la marca de `sessionStorage` sobrevive */
    ADM_PASS = '';
    PRUEBAS.cierto(admEsAdmin() && !admSesionGuardada(), 'guarda: la marca sigue y no hay sesión guardada');
    const n0 = B.pedidos.length, h0 = history.length;
    p387Boton('hseqPanel').click();
    PRUEBAS.igual(B.pedidos.length - n0, 0, '🔴 no sale ningún pedido: una credencial que no hay no se prueba contra el freno');
    PRUEBAS.cierto(B.toasts.indexOf(t('ts_sim_reingresar')) >= 0, 'se dice qué hacer · «' + t('ts_sim_reingresar') + '»');
    const $ = id => document.getElementById(id);
    PRUEBAS.igual([$('admBox').hidden, $('admPanel').hidden, $('admErr').textContent], [false, true, t('ts_sim_reingresar')], '🔴 vuelve la caja de la contraseña, con el aviso');
    PRUEBAS.falso(admEsAdmin(), 'y se retira la marca de administrador de esta pestaña');
    PRUEBAS.igual([$('portalOverlay').classList.contains('show'), SIMUL, history.length - h0], [false, null, 0], 'sin abrir nada: ni el panel, ni la simulación, ni una entrada de historial');
    /* CONTROL · con la sesión guardada del administrador (su token, emitido por el `.gs` real), sí abre */
    const disp = dispositivoId();
    const ses = JSON.parse(B.api.doPost({ postData: { contents: JSON.stringify({ action: 'supervisor', usuario: '*', empresa: '*', pass: P387_ADMIN,
      recordar: '1', dispositivoId: disp }) }, parameter: {} }).getContent());
    PRUEBAS.cierto(!!ses.sesion, 'guarda: el servidor emitió la sesión del administrador');
    localStorage.setItem(K_DASH_CREDS_ADM, JSON.stringify({ usuario: '*', token: ses.sesion }));
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: vuelve a entrar');
    ADM_PASS = '';
    const n1 = B.demos().length;
    const r = await p387TocarRol('hseqPanel');
    PRUEBAS.cierto(r.abrio && hseqEsPanel(), 'CONTROL · con la sesión guardada, abre el panel de HSEQ');
    PRUEBAS.igual((B.demos()[n1] || {}).pass, 'con-clave', 'con el token como credencial');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   VUELTA 2 · LOS HALLAZGOS DEL VERIFICADOR Y D3, EN EL CLIENTE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La fila de `Accesos` del administrador, cambiada a mano en el CH emulado (un cambio de contraseña). */
function p387CambiarClaveAdmin(B, nueva) {
  const h = B.env.SpreadsheetApp.openById('maestro').getSheetByName('Accesos'), v = h.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === '*') { h.getRange(i + 1, 2).setValue(nueva); return true; }
  return false;
}
/* La sesión guardada del administrador cerrada en el CH emulado (`Sesiones`, columna «Estado»). */
function p387CerrarSesiones(B) {
  const h = B.env.SpreadsheetApp.openById('maestro').getSheetByName('Sesiones'), v = h.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < v.length; i++) { h.getRange(i + 1, 12).setValue('cerrada'); n++; }
  return n;
}

PRUEBAS.caso('🔴 P387 · hallazgo 1 · «Ver como…» con una contraseña de administrador VIEJA: un solo pedido, y después pide la contraseña (no sigue quemando el freno)', () => {
  /* R19 · lo que se olvida y cuándo lo decide `simEntrar` (`deAdm`, `conToken`) con `admCredencialVencida`; que la
     credencial no sirve lo dice `accionDemo` (`demo_pass_mal`), y el freno que se quemaba es el de `validarAcceso` y el
     de `__demo__`. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const correr = sabotear => p387Correr(async B => {
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    PRUEBAS.cierto(p387CambiarClaveAdmin(B, 'otra-387'), 'guarda: la contraseña del administrador cambió en el CH');
    if (sabotear) window.admCredencialVencida = () => {};
    const n0 = B.demos().length;
    await p387TocarRol('hseqPanel', () => B.demos().length > n0 && !simulando());
    const despues1 = B.demos().length - n0;
    /* el segundo toque: si la pantalla todavía ofrece los roles, se toca; si ya pide la contraseña, se intenta igual */
    const b = p387Boton('hseqPanel');
    if (b && !document.getElementById('admPanel').hidden) b.click(); else simEntrar('hseqPanel');
    await PRUEBAS.esperarA(() => !simulando(), 2000);
    return { primero: despues1, total: B.demos().length - n0, caja: !document.getElementById('admBox').hidden,
             aviso: B.toasts.indexOf(t('ts_sim_reingresar')) >= 0, pass: ADM_PASS };
  });
  return correr(false).then(ok => {
    PRUEBAS.igual(ok.primero, 1, 'guarda: el primer toque mandó el pedido (con la contraseña vieja)');
    PRUEBAS.igual(ok.total, 1, '🔴 UN solo pedido: el segundo toque ya no sale');
    PRUEBAS.cierto(ok.caja && ok.aviso, '🔴 y vuelve a pedir la contraseña, con el aviso');
    PRUEBAS.igual(ok.pass, '', 'la contraseña vieja se olvidó');
    return correr(true);
  }).then(mal => {
    PRUEBAS.alMenos(mal.total, 2, 'DISCRIMINADOR · sin olvidarla, el segundo toque vuelve a mandar la credencial vencida (' + mal.total + ' pedidos)');
  });
});

PRUEBAS.caso('🔴 P387 · hallazgo 1 · «Ver como…» con la sesión guardada CERRADA (después de recargar): un solo pedido, la ranura queda sin el token y se pide la contraseña', () => {
  /* R19 · `admCredencialVencida(conToken)`: la ranura `K_DASH_CREDS_ADM` queda con el usuario y sin el token, como
     cuando vence la sesión del auto-login (`portalAutoLoginSupervisor`); `admSesionGuardada()` deja de devolverla. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const correr = sabotear => p387Correr(async B => {
    const disp = dispositivoId();
    const ses = JSON.parse(B.api.doPost({ postData: { contents: JSON.stringify({ action: 'supervisor', usuario: '*', empresa: '*', pass: P387_ADMIN,
      recordar: '1', dispositivoId: disp }) }, parameter: {} }).getContent());
    localStorage.setItem(K_DASH_CREDS_ADM, JSON.stringify({ usuario: '*', token: ses.sesion }));
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    ADM_PASS = '';                                   // «recargar»: la contraseña en memoria se pierde
    PRUEBAS.cierto(p387CerrarSesiones(B) > 0 && !!admSesionGuardada(), 'guarda: la sesión se cerró en el CH, y el teléfono todavía guarda su token');
    if (sabotear) window.admCredencialVencida = () => {};
    const n0 = B.demos().length;
    await p387TocarRol('hseqPanel', () => B.demos().length > n0 && !simulando());
    const ranura = localStorage.getItem(K_DASH_CREDS_ADM);
    const b = p387Boton('hseqPanel');
    if (b && !document.getElementById('admPanel').hidden) b.click(); else simEntrar('hseqPanel');
    await PRUEBAS.esperarA(() => !simulando(), 2000);
    return { total: B.demos().length - n0, ranura: ranura, caja: !document.getElementById('admBox').hidden };
  });
  return correr(false).then(ok => {
    PRUEBAS.igual(ok.total, 1, '🔴 UN solo pedido con el token cerrado');
    PRUEBAS.igual(ok.ranura, JSON.stringify({ usuario: '*' }), '🔴 la ranura del administrador queda con el usuario y sin el token');
    PRUEBAS.cierto(ok.caja, 'y se pide la contraseña');
    return correr(true);
  }).then(mal => {
    PRUEBAS.alMenos(mal.total, 2, 'DISCRIMINADOR · sin olvidar el token, cada toque lo vuelve a mandar (' + mal.total + ' pedidos)');
  });
});

PRUEBAS.caso('🔴 P387 · hallazgo 2 · a las 09:00 la demostración no dice «Último movimiento: hoy 12:00»: nada en el futuro, ni con el `.gs` publicado (sin `ts` corrido)', () => {
  /* R19 · el instante lo decide `movDemoInstante` (desde `movDemoItems`, que llama `movCargar` en la demostración): el
     `ts` del servidor si cae el mismo día que su `fecha`; si no, el mediodía de la fecha, sin pasar de ahora. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const hoy = p387DiaCaracas(Date.now());
  const nueve = Date.parse(hoy + 'T09:00:00-04:00');
  const ultima = () => { const A = movEstado(); return { ultima: A.ultima, dia: movCuando(A.ultima).dia, hora: movCuando(A.ultima).hora, n: A.total }; };
  const reabrir = () => { MOV = undefined; dashRepintar(); return ultima(); };
  return p387Correr(async B => {
    Date.now = () => nueve;
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    const r = await p387TocarRol('medico');
    PRUEBAS.cierto(r.abrio && DASH.demo && DASH.vista === 'medico', 'guarda: la demostración de Servicio médico, por «Ver como…»');
    MOV = undefined; dashRepintar();
    const ok = ultima();
    PRUEBAS.alMenos(ok.n, 1, 'guarda: la actividad de la demostración tiene pruebas');
    PRUEBAS.comoMucho(ok.ultima, nueve, '🔴 el último movimiento no está en el futuro · ' + ok.dia + ' ' + ok.hora);
    PRUEBAS.igual(ok.dia, t('mov_hoy'), 'y es de hoy');
    /* con el `.gs` publicado antes de P387 (`ts` de agosto, sin correr): el mediodía de la fecha, acotado a ahora */
    const viejo = p387Mundo({ reloj: new Date(nueve).toISOString(), sabotaje: 'tsSinCorrer' });
    PRUEBAS.igual(viejo.faltan, [], 'guarda');
    const d = viejo.post({ action: 'demo', usuario: '*', pass: P387_ADMIN, dispositivoId: 'p387-m' });
    onDashData(d, 'Empresa Demo', { action: 'demo' }, 'medico');
    const conViejo = reabrir();
    PRUEBAS.comoMucho(conViejo.ultima, nueve, '🔴 con el `.gs` publicado, tampoco en el futuro · ' + conViejo.dia + ' ' + conViejo.hora);
    /* DISCRIMINADOR · el mediodía de la fecha a secas (lo de antes) */
    window.movDemoInstante = x => aptFechaMs(x.fecha);
    const mal = reabrir();
    PRUEBAS.cierto(mal.ultima > nueve, 'DISCRIMINADOR · con el mediodía a secas, a las 09:00 dice ' + mal.dia + ' ' + mal.hora + ': en el futuro');
  }, { reloj: new Date(nueve).toISOString() });
});

PRUEBAS.caso('🔴 P387 · hallazgo 4 · mientras carga, la barra de simulación dice «como HSEQ» o «como Dirección», no «como Dirección / HSEQ»', () => {
  /* R19 · el nombre lo decide `simRotulo` (desde `simPintarBarra`) con `SIMUL.clave`, que pone `simEntrar`; con el panel ya
     armado lo dice `vistaLabel` con la marca de `DASH`. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  return p387Correr(async B => {
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador');
    B.retener = c => c.action === 'demo';
    const rotulo = async k => {
      const n0 = B.retenidos.length;
      p387Boton(k).click();
      await PRUEBAS.esperarA(() => B.retenidos.length > n0, 2000);
      const txt = (document.getElementById('simRol') || {}).textContent || '';
      const sinPanel = !DASH;
      B.soltar();
      await PRUEBAS.esperarA(() => !!DASH && !document.querySelector('#dashBody .dsk'), 4000);
      simSalir(true);
      if (document.getElementById('admPanel').hidden) await p387AdmEntrar();
      return { txt: txt, sinPanel: sinPanel };
    };
    const h = await rotulo('hseqPanel'), d = await rotulo('hseq');
    PRUEBAS.cierto(h.sinPanel && d.sinPanel, 'guarda: se leyó mientras cargaba, sin `DASH`');
    PRUEBAS.igual(h.txt, t('sim_como', { rol: t('vista_panel_hseq') }), '🔴 el botón HSEQ: «como HSEQ»');
    PRUEBAS.igual(d.txt, t('sim_como', { rol: t('vista_direccion') }), '🔴 el botón Dirección: «como Dirección»');
    /* DISCRIMINADOR · sin la clave tocada (sólo `vistaLabel`, lo de antes): los dos dicen «Dirección / HSEQ» */
    window.simRotulo = () => vistaLabel(SIMUL.vista) || SIMUL.vista;
    const mal = await rotulo('hseqPanel');
    PRUEBAS.igual(mal.txt, t('sim_como', { rol: t('vista_hseq') }), 'DISCRIMINADOR · con sólo `vistaLabel`, el botón HSEQ decía «' + mal.txt + '»');
    B.retener = null;
  });
});

/* El cartel de estado del panel de HSEQ (`hseqEstadoPintar`, en `#dashEstado`): lo que se lee y su color, en un período. */
function p387Cartel(per) {
  DASH.f.period = per; dashRepintar();
  const box = document.getElementById('dashEstado'), pal = box && box.querySelector('.hse-palabra, .hse-sin');
  return { aria: box ? (box.getAttribute('aria-label') || '') : '', clase: pal ? pal.className : '', oculto: box ? box.hidden : true,
           nomina: [DASH.nominaTotal, DASH.nominaSinDatoN] };
}
/* El administrador por la portada y el visor «Empresa Demo · HSEQ» (sus selectores), como lo hace la persona. */
async function p387VisorHseq() {
  splashAdmin();
  const pass = document.getElementById('pAdminPass');
  pass.value = P387_ADMIN;
  portalLoginAdmin(document.querySelector('#adminBox .save-btn'));
  pass.value = '';
  if (!(await PRUEBAS.esperarA(() => !!DASH && DASH.rol === 'admin' && !document.querySelector('#dashBody .dsk'), 4000))) return false;
  const e = document.getElementById('visorEmpresa'), v = document.getElementById('visorVista');
  if (!e || !v) return false;
  e.value = 'Empresa Demo'; v.value = 'hseq';
  const antes = DASH;
  e.dispatchEvent(new Event('change'));
  return PRUEBAS.esperarA(() => !!DASH && DASH !== antes && !!DASH.visor && DASH.panel === 'hseq' && !document.querySelector('#dashBody .dsk'), 4000);
}

PRUEBAS.caso('🔴 P387 · D3 · el cartel de estado del visor «Empresa Demo · HSEQ» es el mismo que el de «Ver como… HSEQ» (la nómina de ejemplo en los dos)', () => {
  /* R19 · la nómina la decide `demoNominaDeEjemplo` (`dashCamposDelServidor`): la demostración por `d.demo`, la cuenta por
     la marca `nominaDeEjemplo` que manda `accionSupervisor` con `esCuentaDemo`; el cartel lo pinta `hseqEstadoPintar` con
     `DASH.nominaTotal` y el `estado` de los totales (los mismos: R21). Con el reloj del servidor fijo en un martes y la
     «Semana»: su estado es «requiere atención», y ahí el cartel SÍ depende de la nómina (con «poco seguro» no se atenúa
     nunca, así que «Todo», que tiene un rojo, no discrimina: medido). */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const medir = sab => p387Correr(async () => {
    const fallas = [];
    if (!(await p387VisorHseq())) fallas.push('el visor no abrió');
    const visor = fallas.length ? null : p387Cartel('semana');
    try { closePortal(true); } catch (e) {}
    if (!(await p387AdmEntrar())) fallas.push('no entró el administrador por Más');
    const r = await p387TocarRol('hseqPanel');
    if (!r.abrio || !hseqEsPanel()) fallas.push('«Ver como… HSEQ» no abrió el panel de HSEQ');
    const verComo = fallas.length ? null : p387Cartel('semana');
    return { fallas: fallas, visor: visor, verComo: verComo };
  }, { sabotaje: sab, reloj: P387_TARDE });
  return medir(null).then(ok => {
    PRUEBAS.igual(ok.fallas, [], 'guarda: abrieron los dos paneles');
    if (ok.fallas.length) return;
    PRUEBAS.cierto(!ok.visor.oculto && !!ok.visor.aria, 'guarda: el cartel está a la vista · ' + ok.visor.aria);
    PRUEBAS.igual(ok.visor.nomina, ok.verComo.nomina, '🔴 la misma nómina en los dos (total y sin medir): la de ejemplo');
    PRUEBAS.alMenos(Number(ok.visor.nomina[0]) || 0, 1, 'y no es «0 en la nómina»');
    PRUEBAS.igual(ok.visor.aria, ok.verComo.aria, '🔴 el cartel dice lo mismo · ' + ok.verComo.aria);
    PRUEBAS.igual(ok.visor.clase, ok.verComo.clase, '🔴 y con el mismo color');
    return medir('sinNominaDeEjemplo').then(mal => {
      PRUEBAS.igual(mal.fallas, [], 'guarda: abrieron con el sabotaje');
      if (mal.fallas.length) return;
      PRUEBAS.cierto(mal.visor.aria !== mal.verComo.aria, 'DISCRIMINADOR · con «0 en la nómina» el cartel del visor dice otra cosa: «' + mal.visor.aria + '»');
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA GRILLA: tres roles arriba, Dirección y HSEQ juntos abajo · 375, 768 y 1366 (R12), los dos temas (R13)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p387Grilla() {
  const bs = [...document.querySelectorAll('#admRoles .adm-rol')];
  const cont = document.getElementById('admRoles');
  const rc = cont.getBoundingClientRect();
  const cajas = bs.map(b => b.getBoundingClientRect());
  const filas = [];
  cajas.forEach((c, i) => {
    const f = filas.find(x => Math.abs(x.top - c.top) < 2);
    if (f) f.i.push(i); else filas.push({ top: c.top, i: [i] });
  });
  const dentro = cajas.every(c => c.left >= rc.left - 0.5 && c.right <= rc.right + 0.5);
  const sinCorte = bs.every(b => [b, b.querySelector('.adm-rol-t'), b.querySelector('.adm-rol-d')].every(e => e && e.scrollWidth <= e.clientWidth + 1));
  const alto = Math.min.apply(null, cajas.map(c => c.height));
  const letra = Math.min.apply(null, bs.map(b => parseFloat(getComputedStyle(b.querySelector('.adm-rol-d')).fontSize)));
  const contrastes = [];
  bs.forEach(b => {
    const fondo = getComputedStyle(b).backgroundColor;
    ['.adm-rol-t', '.adm-rol-d'].forEach(s => contrastes.push(CTX.contraste(getComputedStyle(b.querySelector(s)).color, fondo)));
  });
  /* Las palabras que no entran enteras en el ancho de su texto: ésas se parten a la mitad (con guion si el motor tiene
     diccionario de español, sin guion si no). `scrollWidth` no las ve: partidas, no desbordan. */
  const vara = document.createElement('span');
  vara.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px';
  document.body.appendChild(vara);
  const partidas = [];
  bs.forEach(b => ['.adm-rol-t', '.adm-rol-d'].forEach(s => {
    const el = b.querySelector(s), caja = el.getBoundingClientRect().width;
    vara.style.font = getComputedStyle(el).font;
    el.textContent.split(/\s+/).filter(Boolean).forEach(p => { vara.textContent = p; if (vara.getBoundingClientRect().width > caja + 0.5) partidas.push(p); });
  }));
  vara.remove();
  return { n: bs.length, filas: filas.map(f => f.i), dentro: dentro, sinCorte: sinCorte, alto: alto, letra: letra, partidas: partidas,
           guion: getComputedStyle(bs[0].querySelector('.adm-rol-d')).hyphens,
           contraste: Math.min.apply(null, contrastes), ancho: rc.width, desborda: document.documentElement.scrollWidth > innerWidth + 1 };
}
const p387TresYDos = g => JSON.stringify(g.filas) === JSON.stringify([[0, 1, 2], [3, 4]]);

PRUEBAS.caso('🔴 P387 · la grilla de «Ver como…»: cinco botones; a 768 y 1366 los tres roles arriba y Dirección y HSEQ juntos abajo, a 375 uno debajo del otro; en los dos temas', () => {
  if (typeof admPintarRoles !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  return p387Correr(async () => {
    PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: entró el administrador (la grilla la pinta `admPintarRoles` al entrar)');
    const titulos = [...document.querySelectorAll('#admRoles .adm-rol-t')].map(e => e.textContent);
    PRUEBAS.igual(titulos, [t('adm_rol_emp_t'), t('rol_supervisor'), t('rol_medico'), t('vista_direccion'), t('vista_panel_hseq')],
      'los cinco, con los títulos del panel (`vistaLabel`) para Dirección y HSEQ');
    const medidas = [];
    [[375, 667], [768, 1024], [1366, 768]].forEach(([w, h]) => ['claro', 'oscuro'].forEach(tema =>
      PRUEBAS.enVentana(w, h, () => PRUEBAS.enTema(tema, () => {
        const g = p387Grilla(); medidas.push(w + ' ' + tema + ' ' + JSON.stringify(g.filas));
        const q = w + ' px, tema ' + tema;
        PRUEBAS.igual(g.n, 5, q + ' · cinco botones');
        /* R19 · lo concede `.adm-roles` (seis columnas) y, por debajo de 430 px, su `@media` de una columna. */
        if (w >= 768) PRUEBAS.cierto(p387TresYDos(g), '🔴 ' + q + ' · tres arriba y dos abajo · filas ' + JSON.stringify(g.filas));
        else PRUEBAS.igual(g.filas, [[0], [1], [2], [3], [4]], '🔴 ' + q + ' · uno debajo del otro, en el orden de la grilla');
        PRUEBAS.cierto(g.dentro && !g.desborda, q + ' · nada se sale del panel ni de la pantalla');
        PRUEBAS.cierto(g.sinCorte, q + ' · ningún texto cortado');
        /* En ningún ancho se parte una palabra: a 375, apilados, «determinaciones» entra entera. */
        PRUEBAS.igual(g.partidas, [], q + ' · ninguna palabra partida');
        PRUEBAS.alMenos(g.alto, 44, q + ' · se puede tocar (44 px)');
        PRUEBAS.alMenos(g.letra, 12, q + ' · la descripción en 12 px o más');
        PRUEBAS.alMenos(g.contraste, 4.5, q + ' · contraste del texto (R13: tokens en los dos temas)');
      }))));
    /* DISCRIMINADOR · con la grilla de antes (dos columnas, cuatro desde 700 px) el quinto queda solo en su fila */
    const viejo = document.createElement('style');
    viejo.textContent = '#admRoles.adm-roles{grid-template-columns:1fr 1fr} #admRoles .adm-rol{grid-column:auto}' +
                        '@media (min-width:700px){#admRoles.adm-roles{grid-template-columns:repeat(4,1fr)}}';
    document.head.appendChild(viejo);
    try {
      PRUEBAS.enVentana(1366, 800, () =>
        PRUEBAS.falso(p387TresYDos(p387Grilla()), 'DISCRIMINADOR · 1366 px con la grilla vieja: ' + JSON.stringify(p387Grilla().filas)));
    } finally { viejo.remove(); }
    /* DISCRIMINADOR · sin el `@media` de una columna, a 375 «determinaciones» vuelve a no entrar y se parte */
    const seis = document.createElement('style');
    seis.textContent = '@media (max-width:429px){#admRoles.adm-roles{grid-template-columns:repeat(6,minmax(0,1fr))}' +
                       '#admRoles .adm-rol{grid-column:span 2}#admRoles .adm-rol.adm-rol--abajo{grid-column:span 3}}';
    document.head.appendChild(seis);
    try {
      PRUEBAS.enVentana(375, 667, () => {
        const g = p387Grilla();
        PRUEBAS.cierto(p387TresYDos(g) && g.partidas.length > 0, 'DISCRIMINADOR · a 375 en seis columnas, tres y dos con palabras partidas: ' + g.partidas.join(', '));
      });
    } finally { seis.remove(); }
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   R1 · R14 · LOS TEXTOS NUEVOS
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P387_VOSEO = /(^|[^a-záéíóúüñ])(vos|sos|podés|tenés|querés|sabés|necesitás|debés|hacés|escribí|volvé|entrá|elegí|tocá|mirá|probá|revisá|fijate|acordate|andá|salí|pedí|vení|empezá|esperá)(?![a-záéíóúüñ])/i;
const P387_CLAVES = ['adm_rol_dir_d', 'adm_rol_hseq_d', 'ts_sim_reingresar'];

PRUEBAS.caso('R1 · R14 · los textos nuevos de P387 están en los dos idiomas, son distintos y en español neutro (con su discriminador)', () => {
  if (typeof t !== 'function' || typeof fijarIdioma !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  const prev = idiomaActual(), es = {}, en = {};
  try {
    fijarIdioma('es'); P387_CLAVES.forEach(k => { es[k] = t(k); });
    fijarIdioma('en'); P387_CLAVES.forEach(k => { en[k] = t(k); });
  } finally { fijarIdioma(prev); }
  P387_CLAVES.forEach(k => {
    PRUEBAS.cierto(!!es[k] && es[k] !== k, k + ' · existe en español · «' + es[k] + '»');
    PRUEBAS.cierto(!!en[k] && en[k] !== k, k + ' · existe en inglés · «' + en[k] + '»');
    PRUEBAS.cierto(es[k] !== en[k], k + ' · y son dos textos, no el español repetido');
    PRUEBAS.falso(P387_VOSEO.test(es[k]), k + ' · en español neutro: los clientes son de Venezuela (R1)');
  });
  /* los textos de §4 de la investigación, letra por letra: es lo que se publica */
  PRUEBAS.igual(es.adm_rol_dir_d, 'Agregados de la organización sin nombres: indicadores, trazabilidad y costos', 'adm_rol_dir_d · el texto decidido');
  PRUEBAS.igual(es.adm_rol_hseq_d, 'Totales de los tests de toda la empresa, sin el resultado de nadie', 'adm_rol_hseq_d · el texto nuevo');
  PRUEBAS.igual(es.ts_sim_reingresar, 'Para ver la app como otro rol, vuelve a escribir la contraseña de administrador.', 'ts_sim_reingresar · el texto decidido');
  PRUEBAS.igual(en.adm_rol_hseq_d, 'Test totals for the whole company, with no one’s individual result', 'adm_rol_hseq_d · en inglés');
  /* DISCRIMINADOR · el detector ve un voseo puesto en el mismo texto, y no confunde el tuteo neutro */
  ['volvé a escribir', 'Escribí la contraseña', 'Si tenés dudas', 'Tocá el botón'].forEach(v =>
    PRUEBAS.cierto(P387_VOSEO.test(es.ts_sim_reingresar + ' ' + v), 'DISCRIMINADOR · el detector ve «' + v + '»'));
  PRUEBAS.falso(P387_VOSEO.test('Vuelve a escribir la contraseña; toca el botón si tienes dudas.'), 'DISCRIMINADOR · y no confunde «vuelve», «toca» ni «tienes» con voseo');
});
