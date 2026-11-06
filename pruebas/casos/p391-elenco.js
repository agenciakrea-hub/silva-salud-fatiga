PRUEBAS.grupo('P391 · la demostración, sólo con su elenco');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   La demostración pública (`accionDemo`), el «Ver como…» del administrador y la cuenta Empresa Demo
   (`esCuentaDemo_` en `accionSupervisor` y en `accionActividad`) mostraban a cualquiera cuyas filas cayeran en
   «Empresa Demo». Ahora muestran sólo el elenco de la demostración. Decisiones de Franco (2026-11-04):
   · D1 · el nombre Y un corte por fecha (`DEMO_ELENCO_HASTA`): una fila sin día válido no pasa. P393 · el corte queda para los
     tests, el PVT y los comentarios; el ciclo y los turnos de la cuenta van sólo por nombre, para mostrar un ciclo en vivo;
   · D2 · la fila que pasa sale con la grafía del elenco y sin `cedula`;
   · D4 · las otras hojas de la cuenta (bitácora, reportes, nómina, ausencias, gestiones…) quedan fuera;
   · D5 · el panel no avisa: lo descartado se cuenta sólo en `demo_inventario`, sin nombres.

   Los nueve casos son los de §7.1 de `docs/specs/P391/investigacion.md` (fuera del repo). R17: todo entra por
   `doPost` del `.gs` REAL en el emulador. R19: cada caso nombra la función que concede lo que afirma. Cada arreglo
   tiene su sabotaje (un reemplazo de texto sobre `CTX.gs`, con ancla única: si el ancla no está, el caso lo dice) y su
   control. El invariante se busca en el JSON ENTERO de cada respuesta: ningún rastro de los de fuera.

   El repo es PÚBLICO: el CH de prueba lleva sólo nombres del elenco (`DEMO_GENTE`, ya público en la app) y dos
   inventados de fuera. Las contraseñas y la cédula son de prueba. Nada sale de la máquina.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P391_ADMIN = 'adm-391';
const P391_CLAVE_DEMO = 'clave-demo-391';     // la de la demostración pública (`demo_pass`), como en producción
const P391_DEMO = { usuario: 'demo', sup: 'sup-391', dir: 'dir-391', hseq: 'hseq-391' };   // médica vacía: combinada, como en el banco
const P391_RELOJ = '2026-11-04T15:00:00Z';     // miércoles 4, 11:00 en Caracas
const P391_HOY = '2026-11-04';
const P391_CEDULA_HOMONIMO = 'V-39100001';     // de prueba: la de una «persona real» de otra empresa llamada como un personaje

/* El elenco, con su departamento (`DEMO_GENTE` del cliente). */
const P391_DEP = {
  'Ana Suárez': 'Administración', 'Andrés Peña': 'Mantenimiento', 'Camila Torres': 'Administración',
  'Carlos Méndez': 'Operaciones', 'Diego Ramírez': 'Operaciones', 'Federico Blanco': 'Administración',
  'Gabriel Ortiz': 'Administración', 'José Duarte': 'Mantenimiento', 'Julieta Cabrera': 'Tripulación',
  'Lucía Fernández': 'Operaciones', 'Martín Ibáñez': 'Operaciones', 'Nicolás Herrera': 'Tripulación',
  'Paula Giménez': 'Tripulación', 'Ricardo Salcedo': 'Dirección', 'Rocío Vega': 'Mantenimiento',
  'Rodolfo Ruiz': 'Legal', 'Sofía Núñez': 'Operaciones', 'Tomás Aguirre': 'Mantenimiento', 'Valentina Ríos': 'Operaciones'
};
const P391_ELENCO = Object.keys(P391_DEP);
/* Dos personas INVENTADAS de fuera del elenco. */
const P391_FUERA = ['Zulema Foránea', 'Ulrico Forastero'];
const P391_COMENTARIO_ELENCO = 'Dormí poco antes del turno (elenco)';
const P391_COMENTARIO_FUERA = 'Texto libre de fuera P391';
/* Lo que no puede aparecer en NINGÚN payload de la demostración ni de la cuenta, buscado en el JSON entero, sin
   mayúsculas ni tildes: los nombres de fuera (también por partes), su comentario y la cédula del homónimo.
   ⚠️ La cédula, por sus DÍGITOS: `RES` la entrega normalizada (`39100001`, sin la «V-»). Con la marca «v-39100001» el
   sabotaje que la deja viajar daba verde: lo encontró el discriminador de #5 en la primera corrida. */
const P391_CEDULA_DIGITOS = P391_CEDULA_HOMONIMO.replace(/\D/g, '');
const P391_MARCAS = ['zulema', 'ulrico', 'foranea', 'forastero', 'de fuera p391', P391_CEDULA_DIGITOS];

/* El sembrado: un MODELO del CH de Empresa Demo al 2026-11-03 (investigación §1.2), una fila por personaje. Los días
   con personas medidas al final del CH: 5, 8, 3, el ANCLA con 2 (Carlos Méndez y Martín Ibáñez) y la fila suelta del
   5 de agosto (Rodolfo Ruiz, sólo KSS), que el ancla de P387 deja fuera. [día, hora en Caracas, persona, KSS, los
   otros puntajes (null: sólo KSS), comentario libre] */
const P391_SEMBRADO = [
  ['2026-07-13', '09:10', 'Ana Suárez', 3, 1], ['2026-07-13', '09:20', 'Gabriel Ortiz', 4, 2], ['2026-07-13', '09:30', 'Paula Giménez', 4, 2],
  ['2026-07-13', '09:40', 'Rocío Vega', 3, 1], ['2026-07-13', '09:50', 'Tomás Aguirre', 5, 2],
  ['2026-07-14', '08:10', 'Andrés Peña', 4, 2], ['2026-07-14', '08:20', 'Camila Torres', 3, 1], ['2026-07-14', '08:30', 'Diego Ramírez', 5, 2],
  ['2026-07-14', '08:40', 'Federico Blanco', 4, 1], ['2026-07-14', '08:50', 'José Duarte', 3, 2], ['2026-07-14', '09:00', 'Ricardo Salcedo', 4, 2],
  ['2026-07-14', '09:10', 'Sofía Núñez', 3, 1], ['2026-07-14', '09:20', 'Valentina Ríos', 4, 2],
  ['2026-07-15', '10:10', 'Julieta Cabrera', 4, 2], ['2026-07-15', '10:20', 'Lucía Fernández', 3, 1],
  ['2026-07-15', '10:30', 'Nicolás Herrera', 7, 3, P391_COMENTARIO_ELENCO],
  ['2026-07-16', '11:10', 'Carlos Méndez', 8, 3], ['2026-07-16', '11:20', 'Martín Ibáñez', 4, 2],
  ['2026-08-05', '19:45', 'Rodolfo Ruiz', 6, null]
];
const P391_ANCLA = '2026-07-16';
const P391_PVT_SEMBRADO = [['2026-07-13', '09:15', 'Ana Suárez'], ['2026-07-16', '11:15', 'Carlos Méndez'],
                           ['2026-07-16', '11:25', 'Martín Ibáñez'], ['2026-08-05', '19:50', 'Rodolfo Ruiz']];
/* El ciclo del elenco que hay en el CH: los dos eventos de Rodolfo Ruiz del 5 de agosto (entrados por EVA). */
const P391_OP_SEMBRADO = [['2026-08-05', '19:45', 'eva-391-1', 'Rodolfo Ruiz', 'salida_casa', '', ''],
                          ['2026-08-05', '19:46', 'eva-391-2', 'Rodolfo Ruiz', 'llegada_aero', '', '']];

/* Los escenarios de la investigación (§3.1), con las dos personas inventadas */
const P391_I2 = [[P391_HOY, '09:00', 'Zulema Foránea', 5, 2], [P391_HOY, '09:30', 'Ulrico Forastero', 7, 3]];   // dos de fuera, HOY
const P391_PVT_I2 = [[P391_HOY, '09:05', 'Zulema Foránea'], [P391_HOY, '09:35', 'Ulrico Forastero']];
const P391_I3 = [['2026-07-15', '10:40', 'Ulrico Forastero', 4, 2]];                           // una de fuera DENTRO del sembrado
const P391_I4 = [['2026-07-15', '10:50', 'Zulema Foránea', 3, 1, P391_COMENTARIO_FUERA]];      // su comentario, dentro del sembrado
const P391_I1C = [[P391_HOY, '09:00', 'Zulema Foránea', 5, 2, P391_COMENTARIO_FUERA + ' (hoy)']];   // UNA de fuera, hoy, con comentario
const P391_I5 = [[P391_HOY, '09:00', 'Ana Suárez', 5, 2], [P391_HOY, '09:30', 'Carlos Méndez', 9, 5]];   // dos nombres DEL ELENCO, hoy
const P391_I8 = [['2026-07-15', '10:45', 'carlos mendez', 6, 2]];                              // una variante de escritura
const P391_SIN_DIA = ['', '', 'Diego Ramírez', 5, 2];                                          // del elenco, sin día
const P391_OP_I7 = [P391_HOY, '08:00', 'ev-391-1', 'Zulema Foránea', 'llegada_aero', 'kss', 5];   // un evento del ciclo de fuera, hoy
const P391_OP_ELENCO_HOY = [P391_HOY, '08:30', 'ev-391-2', 'Martín Ibáñez', 'llegada_aero', 'kss', 4];
const P391_TURNO_FUERA = [P391_HOY, '07:30', 'tu-391-1', 'checkin', 'Ulrico Forastero', 'Empresa Demo', 'Tripulación', 'Piloto', 6, ''];
/* El mundo de §3.1 #1: I2 + I3 + I4 + I7, y un turno de fuera de hoy */
const P391_MUNDO_FUERA = { tests: P391_I2.concat(P391_I3, P391_I4), pvt: P391_PVT_I2, operacional: [P391_OP_I7], turnos: [P391_TURNO_FUERA] };

/* Una fila de `Respuestas de formulario 1`: COL_PERSONA 2, COL_DEPTO 3, COL_EMPRESA 73, COL_FECHA 74, COL_KSS 87 (1-based),
   el primer ítem de cada bloque, el nivel de Perelli (76) y el comentario de Somnolencia (índice 89 de `COLS_COMENTARIOS`).
   Sin día: la marca y la fecha vacías. */
function p391Fila(x) {
  const f = new Array(90).fill('');
  const dt = x[0] ? GS.fechaDeCelda(x[0] + 'T' + x[1] + ':00') : '';
  f[0] = dt; f[1] = x[2]; f[2] = P391_DEP[x[2]] || 'Operaciones'; f[72] = x[6] || 'Empresa Demo'; f[73] = dt;
  f[86] = x[3];
  if (x[4] != null) { f[3] = x[4]; f[15] = x[4]; f[24] = x[4]; f[36] = x[4]; f[57] = x[4]; f[75] = 2 + x[4]; }
  if (x[5]) f[89] = x[5];
  return f;
}
function p391Pvt(x) {
  return [GS.fechaDeCelda(x[0] + 'T' + x[1] + ':00'), x[2], 'Empresa Demo', P391_DEP[x[2]] || 'Operaciones', 50, 280, 210, 420, 1, 270, 0];
}
function p391Op(x) {
  return [x[0], x[1], GS.fechaDeCelda(x[0] + 'T' + x[1] + ':00').toISOString(), x[2], x[3], 'Empresa Demo',
          P391_DEP[x[3]] || 'Operaciones', '', x[4], x[5], x[6], ''];
}
/* `opc.tests`, `opc.pvt`, `opc.operacional`, `opc.turnos`: filas que se SUMAN al sembrado; `opc.sin`: personajes que
   se sacan del sembrado; `opc.nomina`: filas de `Nómina` (el homónimo). */
function p391Hojas(opc) {
  opc = opc || {};
  const fuera = x => (opc.sin || []).indexOf(x[2]) < 0;
  const tests = P391_SEMBRADO.filter(fuera).concat(opc.tests || []);
  const pvt = P391_PVT_SEMBRADO.filter(fuera).concat(opc.pvt || []);
  return {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq', 'Clave panel HSEQ'],
                ['*', P391_ADMIN, 'admin', '', '', '', ''],
                [P391_DEMO.usuario, P391_DEMO.sup, 'supervisor', 'Empresa Demo', '', P391_DEMO.dir, P391_DEMO.hseq],
                ['helitec', 'sup-h391', 'supervisor', 'Helitec', 'med-h391', 'dir-h391', 'hseq-h391']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')].concat(tests.map(p391Fila)),
    'PVT': [['Fecha', 'Persona', 'Empresa', 'Departamento', 'Validas', 'RT prom', 'RT min', 'RT max', 'Lapsos', 'RT mediana', 'Falsos']]
      .concat(pvt.map(p391Pvt)),
    'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Email',
                '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo']].concat(opc.nomina || []),
    'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['', 'demo_pass', P391_CLAVE_DEMO]],
    /* la escala de Empresa Demo como la deja `sembrarNivelesDemo` en el CH (la misma de P387) */
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel'],
      ['Empresa Demo', 'Administración', '', '', 1], ['Empresa Demo', 'Legal', '', '', 1], ['Empresa Demo', 'Dirección', '', '', 2],
      ['Empresa Demo', 'Operaciones', '', '', 3], ['Empresa Demo', 'Mantenimiento', '', '', 4], ['Empresa Demo', 'Tripulación', '', '', 5],
      ['Empresa Demo', '', '', '', 3]],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']]
      .concat(P391_OP_SEMBRADO.concat(opc.operacional || []).map(p391Op)),
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']].concat(opc.turnos || []),
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor']],
    'Confiabilidad': [['Fecha', 'IdRegistro', 'Test', 'Persona', 'Empresa', 'Departamento', 'Score', 'Confiable', 'Senales', 'MedianaSeg', 'Preguntas']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada', 'Panel']],
    'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario']],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'NivelRiesgo', 'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON']]
  };
}

/* ── Lo que se lee del `.gs` real (R21: el corte y el elenco los decide el `.gs`, no este archivo) ─────────────────── */
function p391Hasta(texto) {
  const m = /\nvar DEMO_ELENCO_HASTA = "([^"]*)";/.exec(String(texto == null ? CTX.gs : texto) || '');
  return m ? m[1] : null;
}
function p391ElencoGs(texto) {
  const m = /\nvar DEMO_ELENCO = (\[[^\]]*\]);/.exec(String(texto == null ? CTX.gs : texto) || '');
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}
function p391GuionGs(texto) {
  const m = /\nvar DEMO_GUION = (\{[^}]*\});/.exec(String(texto == null ? CTX.gs : texto) || '');
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}
function p391Token() { return (/var MANT_TOKEN = "([^"]+)"/.exec(CTX.gs || '') || [])[1] || ''; }

/* ── Los sabotajes: reemplazos de texto sobre el `.gs` real. Cada ancla tiene que estar UNA vez, o el caso lo dice. ── */
const P391_PASO0 = '  regs = demoSoloElenco_(regs); pvts = demoSoloElenco_(pvts);\n';
const P391_AJ_DEMO = '  var aj = demoAjustar(regsD, pvtD);';
const P391_AJ_DEMO_TARDE = '  var aj = demoAjustar(regsD, pvtD); aj.registros = demoSoloElenco_(aj.registros); aj.pvt = demoSoloElenco_(aj.pvt);';
const P391_AJ_CUENTA = '    registros = ajCuenta.registros; pvt = ajCuenta.pvt;\n';
const P391_AJ_CUENTA_TARDE = '    registros = demoSoloElenco_(ajCuenta.registros); pvt = demoSoloElenco_(ajCuenta.pvt);\n';
/* las dos mitades de D2, cada una con su propia ancla: romper una no le saca el sabotaje a la otra */
const P391_GRAFIA = '    r.persona = demoElencoDe_(r.persona, idx);\n';
const P391_SIN_CEDULA = '    delete r.cedula;\n';
function p391Sabotajes() {
  const hasta = 'var DEMO_ELENCO_HASTA = "' + p391Hasta() + '";';
  return {
    /* #1 · sin el paso 0 de `demoAjustar` (los tests y el PVT de la demostración y de la cuenta, como antes de P391) */
    sinFiltroAjuste: [[P391_PASO0, '  void 0;\n']],
    /* #1, #3 · los comentarios de `accionDemo` sin filtrar (la fuga de hoy) */
    sinFiltroComentarios: [['  var comD = demoSoloElenco_(datos.comentarios.filter(function(c){ return setD[norm(c.empresa)]; }));',
                            '  var comD = datos.comentarios.filter(function(c){ return setD[norm(c.empresa)]; });']],
    /* #1, #3 · los comentarios, el ciclo y los turnos de la cuenta sin filtrar */
    sinFiltroCuenta: [['    comentarios = demoSoloElenco_(comentarios);\n    operacional = demoSoloElencoPorNombre_(operacional);\n    turnos = demoSoloElencoPorNombre_(turnos);\n',
                       '    void 0;\n']],
    /* #7 · P393 · el ciclo y los turnos de la cuenta con el corte (lo de P391, que no dejaba mostrar un ciclo en vivo) */
    cicloConCorte: [['    operacional = demoSoloElencoPorNombre_(operacional);\n    turnos = demoSoloElencoPorNombre_(turnos);\n',
                     '    operacional = demoSoloElenco_(operacional);\n    turnos = demoSoloElenco_(turnos);\n']],
    /* #5 · H1 · `RES` toca también a la persona de la cuenta (lo de P391) */
    resEnLaCuenta: [['  var aplicarRES = esCuentaDemo ? RES.aplicarSoloEmpresa : RES.aplicar;', '  var aplicarRES = RES.aplicar;']],
    /* #5 · H1 · lo mismo en el corrimiento de «Actividad reciente» */
    resEnElCorrimiento: [['  RES.aplicarSoloEmpresa(datos.registros); RES.aplicarSoloEmpresa(datos.pvt);', '  RES.aplicar(datos.registros); RES.aplicar(datos.pvt);']],
    /* #2 · el MISMO filtro, pero DESPUÉS de `demoAjustar` (como en `m5-orden.js`), y sin el corte: así lo único que
       cambia es el orden, y el ancla ya se calculó con los de fuera */
    filtroTarde: [[P391_PASO0, '  void 0;\n'], [hasta, 'var DEMO_ELENCO_HASTA = "";'],
                  [P391_AJ_DEMO, P391_AJ_DEMO_TARDE], [P391_AJ_CUENTA, P391_AJ_CUENTA_TARDE]],
    /* #4 · «Actividad reciente» sin el filtro, y sin la grafía del elenco */
    actividadSinFiltro: [['      if (esDemoAct && !demoEsDelElenco_(r, idxElenco)) continue;', '      void 0;']],
    actividadSinGrafia: [['persona: sinNombres ? "" : (esDemoAct ? demoElencoDe_(r.persona, idxElenco) : (r.persona || "")),',
                          'persona: sinNombres ? "" : (r.persona || ""),']],
    /* #4 · el corrimiento de la cuenta falla (`despDemo` queda en null) */
    corrimientoRoto: [['function demoDesplazamientoDeCuenta_(acc, empresaParam, fresh) {\n',
                       'function demoDesplazamientoDeCuenta_(acc, empresaParam, fresh) {\n  throw new Error("sabotaje p391");\n']],
    /* #5 · D2 a medias: no borra la cédula, o no pone la grafía del elenco */
    conCedula: [[P391_SIN_CEDULA, '    void 0;\n']],
    sinGrafia: [[P391_GRAFIA, '    void 0;\n']],
    /* #5, #6 · la comparación EXACTA (la `v1x` de la investigación) en vez de `norm` */
    exacta: [['  var k = norm(limpiarPersona(persona == null ? "" : persona));\n  if (!k) return "";\n  return (idx || demoElencoIndice_())[k] || "";\n',
              '  var s = String(limpiarPersona(persona == null ? "" : persona)).trim();\n  return DEMO_ELENCO.indexOf(s) >= 0 ? s : "";\n']],
    /* #7 · sin el corte (sólo el nombre: la otra salida de D1) */
    sinCorte: [[hasta, 'var DEMO_ELENCO_HASTA = "";']],
    /* #7 · el corte sobre lo YA corrido: el filtro después de `demoAjustar`, con el corte puesto */
    corteDespues: [[P391_PASO0, '  void 0;\n'], [P391_AJ_DEMO, P391_AJ_DEMO_TARDE], [P391_AJ_CUENTA, P391_AJ_CUENTA_TARDE]],
    /* #9 · `demo_inventario` sin contar lo descartado, y sin nombrar al personaje sin filas */
    inventarioSinCuenta: [['      fuera[h[0]]++;\n', '      void 0;\n']],
    inventarioSinElenco: [['    elencoSinFilas: DEMO_ELENCO.filter(function (n) { return !conFilas[n]; }) };', '    elencoSinFilas: [] };']],
    /* #9 · P393 · H5 · sin decir quién tiene filas y no se muestra */
    inventarioSinMostrar: [['    elencoSinMostrar: DEMO_ELENCO.filter(function (n) { return conFilas[n] && !mostrados[n]; }),\n', '    elencoSinMostrar: [],\n']]
  };
}
function p391Parchar(gs, cambios) {
  let s = gs || '';
  const faltan = [];
  (cambios || []).forEach(par => {
    const n = s.split(par[0]).length - 1;
    if (n !== 1) faltan.push(String(par[0]).trim().slice(0, 70) + ' ×' + n);
    else s = s.split(par[0]).join(par[1]);
  });
  return { gs: s, faltan: faltan };
}
/* `sabotaje`: un nombre, o varios en una lista (se aplican en orden). */
function p391Gs(sabotaje) {
  if (!sabotaje) return { gs: CTX.gs, faltan: [] };
  const S = p391Sabotajes(), cambios = [];
  [].concat(sabotaje).forEach(n => { (S[n] || [['§§ sabotaje desconocido: ' + n + ' §§', '']]).forEach(c => cambios.push(c)); });
  return p391Parchar(CTX.gs, cambios);
}

/* El mundo: el `.gs` (con o sin sabotaje) sobre el CH de prueba, con el reloj fijo. */
function p391Mundo(opc) {
  opc = opc || {};
  const g = p391Gs(opc.sabotaje);
  if (g.faltan.length) return { faltan: g.faltan };
  const env = GS.crearEntorno(Object.assign(p391Hojas(opc), opc.hojas || {}));   // `opc.hojas`: hojas que reemplazan a las del CH de prueba
  env.Date = GS.relojFijo(opc.reloj || P391_RELOJ);
  const api = GS.cargarGs(g.gs, env, ['doPost']);
  const w = { env: env };
  w.post = p => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(p) }, parameter: {} }).getContent());
  const ADM = { usuario: '*', pass: P391_ADMIN, dispositivoId: 'p391-a' };
  w.demo = extra => w.post(Object.assign({ action: 'demo', pass: P391_CLAVE_DEMO, dispositivoId: 'p391-d' }, extra || {}));
  w.verComo = extra => w.post(Object.assign({ action: 'demo' }, ADM, extra || {}));
  w.visor = (vista, extra) => w.post(Object.assign({ action: 'supervisor', verEmpresa: 'Empresa Demo', verVista: vista }, ADM, extra || {}));
  w.clave = (pass, extra) => w.post(Object.assign({ action: 'supervisor', usuario: P391_DEMO.usuario, empresa: P391_DEMO.usuario,
                                                    pass: pass, dispositivoId: 'p391-c' }, extra || {}));
  w.adminDemo = () => w.post(Object.assign({ action: 'supervisor', empresa: 'Empresa Demo' }, ADM));
  w.todas = () => w.post(Object.assign({ action: 'supervisor' }, ADM));
  w.actividad = pass => w.post({ action: 'actividad', n: '50', usuario: P391_DEMO.usuario, empresa: P391_DEMO.usuario,
                                 pass: pass, dispositivoId: 'p391-c' });
  w.actividadVisor = vista => w.post(Object.assign({ action: 'actividad', n: '50', verEmpresa: 'Empresa Demo', verVista: vista }, ADM));
  w.inventario = () => w.post({ action: 'mantenimiento', tarea: 'demo_inventario', token: p391Token() });
  return w;
}

/* ── La medición ──────────────────────────────────────────────────────────────────────────────── */
/* El JSON entero, sin mayúsculas ni tildes, y qué marcas de los de fuera aparecen en él. */
function p391Plano(x) { return JSON.stringify(x === undefined ? null : x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function p391DeFuera(x) { const s = p391Plano(x); return P391_MARCAS.filter(m => s.indexOf(m) >= 0); }
/* Sin `ultimaCorrida` (es la hora del pedido) ni `sesion`. */
function p391Limpio(r) {
  const c = JSON.parse(JSON.stringify(r === undefined ? null : r));
  if (c && c.totalesHseq) delete c.totalesHseq.ultimaCorrida;
  if (c) delete c.sesion;
  return c;
}
/* Qué claves de primer nivel difieren entre dos respuestas (vacío: idénticas). */
function p391Dif(a, b) {
  const x = p391Limpio(a) || {}, y = p391Limpio(b) || {};
  return Array.from(new Set(Object.keys(x).concat(Object.keys(y)))).filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])).sort();
}
/* Lo que quedó de la demostración en un payload médico. */
function p391Foto(r) {
  const regs = (r && r.registros) || [];
  const f = regs.map(x => x.fecha).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ''))).sort();
  return { n: regs.length, max: f[f.length - 1] || '', personas: Array.from(new Set(regs.map(x => x.persona))).sort(),
           deHoy: d => Array.from(new Set(regs.filter(x => x.fecha === d).map(x => x.persona))).sort(),
           sinDia: regs.filter(x => !/^\d{4}-\d{2}-\d{2}$/.test(String(x.fecha || ''))).length,
           ts: Array.from(new Set(regs.map(x => +x.ts || 0).filter(Boolean))).sort((a, b) => a - b),
           de: p => regs.filter(x => x.persona === p) };
}
/* El último test de una persona (por fecha y hora). */
function p391Ultimo(r, p) {
  return ((r && r.registros) || []).filter(x => x.persona === p).sort((a, b) => (+b.ts || 0) - (+a.ts || 0))[0] || {};
}
/* Todos los caminos por los que se ve Empresa Demo (investigación, «Lo principal» 1). */
function p391Caminos(w) {
  return {
    'demostración': w.demo(),
    'demostración en inglés': w.demo({ lang: 'en' }),
    '«Ver como…»': w.verComo(),
    'visor · Servicio médico': w.visor('medico'),
    'visor · Supervisor': w.visor('supervisor'),
    'visor · Dirección': w.visor('direccion'),
    'visor · HSEQ': w.visor('hseq'),
    'contraseña de supervisor': w.clave(P391_DEMO.sup),
    'contraseña combinada, pestaña médica': w.clave(P391_DEMO.sup, { pedida: 'medico' }),
    'contraseña de Dirección': w.clave(P391_DEMO.dir),
    'contraseña de HSEQ': w.clave(P391_DEMO.hseq),
    'administrador con Empresa Demo': w.adminDemo(),
    'Actividad reciente (supervisor)': w.actividad(P391_DEMO.sup),
    'Actividad reciente (Dirección)': w.actividad(P391_DEMO.dir)
  };
}
const p391J = x => JSON.stringify(x);
const p391SinCorrida = T => { const c = JSON.parse(JSON.stringify(T || null)); if (c) delete c.ultimaCorrida; return c; };
const p391Tests = r => ((r && r.items) || []).filter(i => i.tipo === 'test');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #1 · LAS FILAS DE FUERA NO CAMBIAN NADA DE LO QUE SE VE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #1 · con filas de fuera (dos hoy, una dentro del sembrado, su comentario, su ciclo y su turno), NINGÚN camino de Empresa Demo cambia: la demostración, «Ver como…», el visor en sus cuatro vistas, las tres contraseñas, el administrador con Empresa Demo y la «Actividad reciente»', () => {
  /* R19 · lo concede `demoSoloElenco_` (decide `demoEsDelElenco_`), llamada desde el paso 0 de `demoAjustar` (los tests y
     el PVT de la demostración, de «Ver como…» y de la cuenta), desde `accionDemo` (los comentarios) y desde el bloque
     `esCuentaDemo` de `accionSupervisor` (comentarios, ciclo y turnos de la cuenta). En «Actividad reciente»,
     `accionActividad` con `esDemoAct`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const medir = sab => {
    const sin = p391Mundo({ sabotaje: sab }), con = p391Mundo(Object.assign({ sabotaje: sab }, P391_MUNDO_FUERA));
    if (sin.faltan || con.faltan) return { faltan: (sin.faltan || []).concat(con.faltan || []) };
    return { sin: p391Caminos(sin), con: p391Caminos(con), todas: con.todas() };
  };
  const ok = medir(null);
  PRUEBAS.igual(ok.faltan, undefined, 'guarda: los mundos se armaron');
  if (ok.faltan) return;
  PRUEBAS.alMenos(p391Foto(ok.con['demostración']).n, 18, 'guarda: la demostración trae el elenco (si viniera vacía, «idéntica» no probaría nada)');
  PRUEBAS.alMenos((ok.con['visor · Servicio médico'].comentarios || []).length, 1, 'guarda: el visor médico trae comentarios del elenco');
  PRUEBAS.alMenos(p391Tests(ok.con['Actividad reciente (supervisor)']).length, 18, 'guarda: «Actividad reciente» trae las pruebas del elenco');
  Object.keys(ok.con).forEach(k => {
    PRUEBAS.igual(ok.con[k].ok, true, 'guarda: ' + k + ' responde · ' + (ok.con[k].error || ok.con[k].motivo || ''));
    PRUEBAS.igual(p391DeFuera(ok.con[k]), [], '🔒 ' + k + ': ningún rastro de los de fuera en el JSON entero');
    PRUEBAS.igual(p391Dif(ok.con[k], ok.sin[k]), [], '🔒 ' + k + ': idéntico, clave por clave, al mismo mundo sin las filas de fuera');
  });
  /* CONTROL · «Todas las empresas» del administrador no se filtra (es el camino de diagnóstico): el mundo SÍ los tiene */
  PRUEBAS.igual(p391DeFuera(ok.todas), ['zulema', 'ulrico', 'foranea', 'forastero', 'de fuera p391'],
    'CONTROL · «Todas las empresas» SÍ trae a los de fuera, con su comentario: el CH de prueba los tiene');
  /* DISCRIMINADORES · cada filtro, sacado de a uno: rojo en lo suyo, y sólo en lo suyo */
  const sAj = medir('sinFiltroAjuste'), sCom = medir('sinFiltroComentarios'), sCta = medir('sinFiltroCuenta');
  PRUEBAS.igual([sAj.faltan, sCom.faltan, sCta.faltan], [undefined, undefined, undefined], 'guarda: los tres sabotajes entraron');
  if (sAj.faltan || sCom.faltan || sCta.faltan) return;
  ['demostración', 'visor · Servicio médico', 'visor · Supervisor'].forEach(k => {
    PRUEBAS.cierto(p391Dif(sAj.con[k], sAj.sin[k]).indexOf('registros') >= 0 && p391DeFuera(sAj.con[k]).length > 0,
      'DISCRIMINADOR · sin el paso 0 de `demoAjustar`, ' + k + ' cambia y los de fuera salen con nombre · ' + p391DeFuera(sAj.con[k]).join(', '));
  });
  PRUEBAS.igual(p391Dif(sCom.con['demostración'], sCom.sin['demostración']), ['comentarios'],
    'DISCRIMINADOR · sin el filtro de `comD`, la demostración cambia en sus comentarios, y sólo ahí');
  PRUEBAS.alMenos(p391DeFuera(sCom.con['demostración']).length, 1, 'DISCRIMINADOR · y el comentario de fuera sale con su nombre');
  PRUEBAS.igual(p391Dif(sCom.con['visor · Servicio médico'], sCom.sin['visor · Servicio médico']), [],
    'CONTROL del sabotaje · la cuenta no cambia: tiene su propio filtro');
  const dCta = p391Dif(sCta.con['visor · Servicio médico'], sCta.sin['visor · Servicio médico']);
  PRUEBAS.cierto(['comentarios', 'operacional', 'turnos'].every(c => dCta.indexOf(c) >= 0),
    'DISCRIMINADOR · sin el filtro de la cuenta, el visor médico cambia en comentarios, ciclo y turnos · ' + dCta.join(', '));
  PRUEBAS.igual(p391Dif(sCta.con['demostración'], sCta.sin['demostración']), [], 'CONTROL del sabotaje · la demostración no cambia');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #2 · EL ANCLA SE CALCULA DESPUÉS DE FILTRAR
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P391 · #2 · con dos de fuera HOY, el ancla sigue siendo el último día del elenco con 2 personas, corrido a hoy: la fila suelta queda fuera y nadie del elenco tiene «dato no reciente»', () => {
  /* R19 · el lugar del filtro: el paso 0 de `demoAjustar`, ANTES de `demoDesplazamiento_` (que elige el ancla) y de
     `demoCorrerFilas_`. «Dato no reciente» lo decide `armarAptitudServer` sobre lo que dejó `demoAjustar`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const medir = (sab, fuera) => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, fuera ? { tests: P391_I2, pvt: P391_PVT_I2 } : {}));
    if (w.faltan) return { faltan: w.faltan };
    return { demo: p391Foto(w.demo()), cuenta: p391Foto(w.visor('medico')), sup: w.visor('supervisor').aptitud || [] };
  };
  const ok = medir(null, true), base = medir(null, false);
  PRUEBAS.igual([ok.faltan, base.faltan], [undefined, undefined], 'guarda: los mundos se armaron');
  if (ok.faltan || base.faltan) return;
  const delAncla = P391_SEMBRADO.filter(x => x[0] === P391_ANCLA).map(x => x[2]).sort();
  [['la demostración', ok.demo], ['la cuenta (visor · Servicio médico)', ok.cuenta]].forEach(([q, f]) => {
    PRUEBAS.igual(f.max, P391_HOY, '🔴 ' + q + ': lo más nuevo es HOY');
    PRUEBAS.igual(f.deHoy(P391_HOY), delAncla, '🔴 ' + q + ': y hoy están las dos del día ancla del elenco (' + delAncla.join(', ') + '), no las de fuera');
    PRUEBAS.igual(f.personas.indexOf('Rodolfo Ruiz'), -1, '🔴 ' + q + ': la fila suelta (una persona, el 5 de agosto) sigue fuera');
    PRUEBAS.igual(f.personas.length, 18, q + ': las 18 del elenco con tests hasta el ancla');
  });
  PRUEBAS.igual(ok.sup.length, 18, 'guarda: el supervisor de la cuenta tiene la aptitud de las 18');
  PRUEBAS.igual(ok.sup.filter(a => a.viejo).map(a => a.nombre), [], '🔴 nadie del elenco con «dato no reciente»');
  PRUEBAS.igual([base.demo.max, base.demo.personas.length, base.sup.filter(a => a.viejo).length], [P391_HOY, 18, 0],
    'CONTROL · sin los de fuera, lo mismo');
  /* DISCRIMINADOR · el MISMO filtro puesto DESPUÉS de `demoAjustar` (sin el corte, para que sólo cambie el orden) */
  const tarde = medir('filtroTarde', true), tardeBase = medir('filtroTarde', false);
  PRUEBAS.igual([tarde.faltan, tardeBase.faltan], [undefined, undefined], 'guarda: el sabotaje entró');
  if (tarde.faltan || tardeBase.faltan) return;
  PRUEBAS.cierto(tarde.demo.max !== P391_HOY && tarde.demo.personas.indexOf('Rodolfo Ruiz') >= 0,
    'DISCRIMINADOR · con el filtro después de `demoAjustar`, el ancla ya se calculó con los de fuera: el elenco queda en sus fechas del CH (lo más nuevo: ' + tarde.demo.max + ') y vuelve la fila suelta');
  PRUEBAS.cierto(tarde.sup.length >= 18 && tarde.sup.every(a => a.viejo), 'DISCRIMINADOR · y todo el elenco queda con «dato no reciente»');
  PRUEBAS.igual(tarde.demo.personas.filter(p => P391_FUERA.indexOf(p) >= 0), [], 'y los de fuera no salen: el filtro tarde esconde los nombres pero no protege el ancla');
  PRUEBAS.igual([tardeBase.demo.max, tardeBase.demo.personas.length], [P391_HOY, 18], 'CONTROL del sabotaje · sin los de fuera, el filtro tarde no se nota: el daño lo hacen ellos');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #3 · EL COMENTARIO DE UNA PERSONA SUELTA, HOY (la fuga viva hasta P391)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #3 · el comentario libre de UNA persona de fuera que contestó hoy no sale ni en la demostración ni en la cuenta; el del elenco, sí', () => {
  /* R19 · los comentarios de la demostración, `comD` de `accionDemo` por `demoSoloElenco_`; los de la cuenta (sólo con la
     vista médica), el bloque `esCuentaDemo` de `accionSupervisor`. Su test no salía ni antes: un día con una sola persona
     nunca es el ancla (P387). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const medir = sab => {
    const w = p391Mundo({ sabotaje: sab, tests: P391_I1C });
    if (w.faltan) return { faltan: w.faltan };
    return { demo: w.demo(), verComo: w.verComo(), visor: w.visor('medico'), clave: w.clave(P391_DEMO.sup, { pedida: 'medico' }) };
  };
  const tiene = (r, txt) => ((r && r.comentarios) || []).some(c => String(c.texto).indexOf(txt) >= 0);
  const ok = medir(null);
  PRUEBAS.igual(ok.faltan, undefined, 'guarda: el mundo se armó');
  if (ok.faltan) return;
  [['la demostración', ok.demo], ['«Ver como…»', ok.verComo], ['el visor · Servicio médico', ok.visor], ['la contraseña combinada, pestaña médica', ok.clave]].forEach(([q, r]) => {
    PRUEBAS.igual(r.vista, 'medico', 'guarda: ' + q + ' es la vista médica (la única que recibe comentarios)');
    PRUEBAS.igual(p391DeFuera(r), [], '🔒 ' + q + ': ni el comentario de fuera ni su nombre, en ninguna parte del JSON');
    PRUEBAS.cierto(tiene(r, P391_COMENTARIO_ELENCO), 'CONTROL · ' + q + ': el comentario del elenco SÍ sale (no se borran todos)');
  });
  const sCom = medir('sinFiltroComentarios'), sCta = medir('sinFiltroCuenta');
  PRUEBAS.igual([sCom.faltan, sCta.faltan], [undefined, undefined], 'guarda: los sabotajes entraron');
  if (sCom.faltan || sCta.faltan) return;
  PRUEBAS.cierto(tiene(sCom.demo, P391_COMENTARIO_FUERA) && p391DeFuera(sCom.demo).indexOf('zulema') >= 0,
    'DISCRIMINADOR · sin el filtro de `comD` (lo de antes de P391), la demostración pública muestra el comentario de fuera, con su nombre');
  PRUEBAS.igual(p391DeFuera(sCom.visor), [], 'CONTROL del sabotaje · la cuenta sigue sin él: su filtro es otro');
  PRUEBAS.cierto(tiene(sCta.visor, P391_COMENTARIO_FUERA) && tiene(sCta.clave, P391_COMENTARIO_FUERA),
    'DISCRIMINADOR · sin el filtro de la cuenta, el visor médico y la contraseña con la pestaña médica lo muestran');
  PRUEBAS.igual(p391DeFuera(sCta.demo), [], 'CONTROL del sabotaje · la demostración sigue sin él');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #4 · «ACTIVIDAD RECIENTE» DE LA CUENTA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #4 · «Actividad reciente» de la cuenta: sin las pruebas de fuera, con la grafía del elenco y con los instantes del panel; con el corrimiento roto, las de fuera tampoco salen', () => {
  /* R19 · `accionActividad`: `esDemoAct` (se decide una vez, sin depender de `despDemo`), `demoEsDelElenco_` y
     `demoElencoDe_`. Los instantes, `demoDesplazamientoDeCuenta_`, que ahora parte de las MISMAS filas que el panel
     (también por `demoSoloElenco_`). Dirección no ve nombres (`sinNombres`), pero cuenta las pruebas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const MUNDO = { tests: P391_I2.concat(P391_I3, P391_I8), pvt: P391_PVT_I2 };
  const medir = (sab, sinFuera) => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, sinFuera ? { tests: P391_I8 } : MUNDO));
    if (w.faltan) return { faltan: w.faltan };
    return { sup: w.actividad(P391_DEMO.sup), dir: w.actividad(P391_DEMO.dir), visor: w.actividadVisor('supervisor'),
             panel: p391Foto(w.visor('medico')) };
  };
  const ok = medir(null), base = medir(null, true);
  PRUEBAS.igual([ok.faltan, base.faltan], [undefined, undefined], 'guarda: los mundos se armaron');
  if (ok.faltan || base.faltan) return;
  [['contraseña de supervisor', ok.sup], ['visor «Empresa Demo · Supervisor»', ok.visor]].forEach(([q, a]) => {
    PRUEBAS.igual([a.ok, a.error], [true, null], 'guarda: ' + q + ' responde, sin error');
    PRUEBAS.alMenos(p391Tests(a).length, 18, 'guarda: ' + q + ' trae las pruebas del elenco');
    PRUEBAS.igual(p391DeFuera(a), [], '🔒 ' + q + ': ningún rastro de los de fuera en el JSON entero');
    PRUEBAS.igual(p391Tests(a).filter(i => P391_ELENCO.indexOf(i.persona) < 0).map(i => i.persona), [],
      '🔒 ' + q + ': cada prueba es de un personaje, con su grafía («carlos mendez» sale como «Carlos Méndez»)');
    PRUEBAS.igual(Array.from(new Set(p391Tests(a).map(i => i.ts))).sort((x, y) => x - y), ok.panel.ts,
      '🔴 ' + q + ': las pruebas con los MISMOS instantes que el panel de la cuenta (R21)');
  });
  PRUEBAS.igual(ok.sup.tests, base.sup.tests, '🔒 cuenta las mismas pruebas que el mundo sin los de fuera');
  PRUEBAS.igual([ok.dir.sinNombres, ok.dir.tests], [true, ok.sup.tests], '🔒 Dirección, sin nombres, cuenta las mismas: tampoco suma las de fuera');
  /* con el corrimiento roto, las pruebas salen con su hora real, pero el filtro no depende de él */
  const roto = medir('corrimientoRoto');
  PRUEBAS.igual(roto.faltan, undefined, 'guarda: el sabotaje entró');
  if (roto.faltan) return;
  PRUEBAS.cierto(/sabotaje p391/.test(String(roto.sup.error || '')), 'guarda: el corrimiento falló de verdad y el error viaja · ' + roto.sup.error);
  PRUEBAS.alMenos(p391Tests(roto.sup).length, 18, 'guarda: con el corrimiento roto siguen llegando las pruebas del elenco');
  PRUEBAS.igual(p391DeFuera(roto.sup), [], '🔒 con el corrimiento roto, las de fuera TAMPOCO salen: el filtro no depende de `despDemo`');
  /* DISCRIMINADORES */
  const sinF = medir('actividadSinFiltro'), sinG = medir('actividadSinGrafia'), rotoSinF = medir(['corrimientoRoto', 'actividadSinFiltro', 'actividadSinGrafia']);
  PRUEBAS.igual([sinF.faltan, sinG.faltan, rotoSinF.faltan], [undefined, undefined, undefined], 'guarda: los sabotajes entraron');
  if (sinF.faltan || sinG.faltan || rotoSinF.faltan) return;
  PRUEBAS.cierto(sinF.sup.tests > ok.sup.tests && p391Tests(sinF.sup).some(i => P391_ELENCO.indexOf(i.persona) < 0),
    'DISCRIMINADOR · sin el filtro, la prueba de fuera DENTRO del sembrado entra a la lista (' + sinF.sup.tests + ' contra ' + ok.sup.tests + ')');
  PRUEBAS.cierto(p391Tests(sinG.sup).some(i => i.persona === 'carlos mendez'), 'DISCRIMINADOR · sin la grafía del elenco, «carlos mendez» sale tal cual');
  PRUEBAS.cierto(p391DeFuera(rotoSinF.sup).indexOf('zulema') >= 0 && p391DeFuera(rotoSinF.sup).indexOf('ulrico') >= 0,
    'DISCRIMINADOR · con el corrimiento roto y sin el filtro (lo de antes de P391), salen todas, también las dos de fuera de hoy');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #5 · LA IDENTIDAD: UN HOMÓNIMO REAL EN EL PADRÓN DE OTRA EMPRESA (D2)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #5 · D2 · con un homónimo de Ana Suárez en la nómina de OTRA empresa, la cuenta trae a Ana con la grafía del elenco y SIN cédula, y sus totales de HSEQ siguen siendo los de la demostración', () => {
  /* R19 · `demoSoloElenco_` (D2): la fila que pasa sale con la grafía de `DEMO_ELENCO` y sin `cedula`. La pertenencia, por `norm`
     (`demoElencoDe_`), con el nombre tal como vino del CH: P393 · H1 · en la cuenta, `RES` toca sólo la empresa
     (`RES.aplicarSoloEmpresa`), porque el padrón es global (`construirPadron`) y le cambiaba el nombre por el del homónimo.
     Los totales de la cuenta, `totalesHseqDemo_` (ADR 020). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const NOM = g => [['Helitec', g, P391_CEDULA_HOMONIMO, 'Operaciones', 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']];
  const medir = (sab, grafia) => {
    const w = p391Mundo({ sabotaje: sab, nomina: grafia ? NOM(grafia) : [] });
    if (w.faltan) return { faltan: w.faltan };
    return { med: w.visor('medico'), sup: w.visor('supervisor'), hseq: w.visor('hseq'), demo: w.demo() };
  };
  const ana = r => ((r && r.registros) || []).filter(x => /su[aá]rez/i.test(String(x.persona)));
  const base = medir(null, null);
  PRUEBAS.igual(base.faltan, undefined, 'guarda: el mundo se armó');
  if (base.faltan) return;
  const nAna = ana(base.med).length;
  PRUEBAS.alMenos(nAna, 1, 'guarda: Ana Suárez tiene tests en la cuenta');
  PRUEBAS.alMenos(Object.keys(((base.hseq.totalesHseq || {}).periodos) || {}).length, 1, 'guarda: hay totales de HSEQ que comparar');
  ['ANA SUAREZ', 'Ana Suárez'].forEach(g => {
    const ok = medir(null, g);
    const a = ana(ok.med);
    PRUEBAS.igual(a.length, nAna, '🔒 homónimo «' + g + '» · la cuenta trae TODAS las filas de Ana');
    PRUEBAS.igual(Array.from(new Set(a.map(x => x.persona))), ['Ana Suárez'], '🔒 homónimo «' + g + '» · con la grafía del elenco');
    PRUEBAS.igual(a.filter(x => 'cedula' in x).length, 0, '🔒 homónimo «' + g + '» · sin `cedula`');
    PRUEBAS.igual(p391DeFuera(ok.med).concat(p391DeFuera(ok.sup)), [], '🔒 homónimo «' + g + '» · la cédula del homónimo no está en ninguna parte del JSON');
    PRUEBAS.cierto((ok.sup.aptitud || []).some(x => x.nombre === 'Ana Suárez'), 'homónimo «' + g + '» · y el supervisor la ve como «Ana Suárez»');
    PRUEBAS.igual(p391J(p391SinCorrida(ok.hseq.totalesHseq)), p391J(p391SinCorrida(ok.demo.totalesHseq)),
      '🔴 R21 · homónimo «' + g + '» · los totales de HSEQ de la cuenta son los de la demostración');
    PRUEBAS.igual(p391Dif(ok.demo, base.demo), [], 'CONTROL · homónimo «' + g + '» · la demostración pública (no pasa por `RES`) no cambia');
  });
  /* P393 · H1 · EL HOMÓNIMO CON OTRA GRAFÍA Y LA MISMA CÉDULA: se registró como «Ana Suárez» y su empresa la cargó como «Ana
     Suárez Gómez». `construirPadron` guarda UN nombre por cédula (la nómina pisa a `Registrados`) y todas las variantes en
     `porNombre`: `RES` encontraba la cédula por «ana suarez» y le ponía «Ana Suárez Gómez», ese `norm` no está en el elenco y
     la fila de la personaje se descartaba. */
  const REG = [['Fecha de registro', 'Fecha y hora', 'Nombre', 'Email', 'Cédula', 'ID Piloto', 'Es piloto', 'Es supervisor', 'Empresa', 'Departamento', 'Cargo', 'Sexo'],
               ['', '', 'Ana Suárez', '', P391_CEDULA_HOMONIMO, '', 'No', 'No', 'Helitec', 'Operaciones', 'Piloto', '']];
  const OPC_H1 = { nomina: NOM('Ana Suárez Gómez'), hojas: { 'Registrados Fatiga': REG } };
  const h1 = sab => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, OPC_H1));
    if (w.faltan) return { faltan: w.faltan };
    return { med: w.visor('medico'), sup: w.visor('supervisor'), hseq: w.visor('hseq'), demo: w.demo(), act: w.actividad(P391_DEMO.sup), todas: w.todas() };
  };
  const conH1 = h1(null), sinH = p391Mundo({});
  PRUEBAS.igual(conH1.faltan, undefined, 'guarda: el mundo del homónimo se armó');
  if (conH1.faltan) return;
  PRUEBAS.cierto((conH1.todas.registros || []).some(x => String(x.persona) === 'Ana Suárez Gómez'),
    'guarda: `RES` funciona en este mundo: «Todas las empresas» le cambia el nombre a la fila de Ana (si no, el caso no mide nada)');
  PRUEBAS.igual(p391Dif(conH1.med, sinH.visor('medico')), [], '🔒 H1 · el visor médico es idéntico, clave por clave, al mundo sin el homónimo');
  PRUEBAS.igual(p391Dif(conH1.sup, sinH.visor('supervisor')), [], '🔒 H1 · el supervisor también');
  PRUEBAS.igual(ana(conH1.med).length, nAna, '🔒 H1 · la cuenta trae a Ana entera');
  PRUEBAS.igual(p391DeFuera(conH1.med).concat(p391DeFuera(conH1.sup)), [], '🔒 H1 · sin la cédula del homónimo');
  PRUEBAS.falso(/gomez|gómez/i.test(p391J(conH1.med) + p391J(conH1.sup)), '🔒 H1 · y sin su apellido en ninguna parte');
  PRUEBAS.igual(p391J(p391SinCorrida(conH1.hseq.totalesHseq)), p391J(p391SinCorrida(conH1.demo.totalesHseq)), '🔴 R21 · H1 · los totales de HSEQ de la cuenta son los de la demostración');
  PRUEBAS.igual(ana(conH1.demo).length, ana(sinH.demo()).length, 'CONTROL · la demostración pública no cambia');
  PRUEBAS.igual(p391Tests(conH1.act).filter(i => i.persona === 'Ana Suárez').length, p391Tests(sinH.actividad(P391_DEMO.sup)).filter(i => i.persona === 'Ana Suárez').length,
    '🔴 R21 · H1 · «Actividad reciente» de la cuenta también la muestra');
  /* El corrimiento de «Actividad reciente»: Ana no es del día ancla; quien mueve el ancla, si desaparece, es Carlos Méndez */
  const NOM_C = g => [['Helitec', g, P391_CEDULA_HOMONIMO, 'Operaciones', 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']];
  const REG_C = [REG[0], ['', '', 'Carlos Méndez', '', P391_CEDULA_HOMONIMO, '', 'No', 'No', 'Helitec', 'Operaciones', 'Piloto', '']];
  const actDe = sab => { const w = p391Mundo({ sabotaje: sab, nomina: NOM_C('Carlos Méndez Rojas'), hojas: { 'Registrados Fatiga': REG_C } }); return w.faltan ? { faltan: w.faltan } : { act: w.actividad(P391_DEMO.sup), panel: p391Foto(w.visor('medico')) }; };
  const aOk = actDe(null);
  PRUEBAS.igual(aOk.faltan, undefined, 'guarda: el mundo del corrimiento se armó');
  if (aOk.faltan) return;
  PRUEBAS.igual(Array.from(new Set(p391Tests(aOk.act).map(i => i.ts))).sort((x, y) => x - y), aOk.panel.ts,
    '🔴 R21 · H1 · con el homónimo de Carlos Méndez (el ancla), «Actividad reciente» tiene los MISMOS instantes que el panel');
  /* DISCRIMINADORES de H1 */
  const res = h1('resEnLaCuenta'), aMal = actDe('resEnElCorrimiento');
  PRUEBAS.igual([res.faltan, aMal.faltan], [undefined, undefined], 'guarda: los dos sabotajes de H1 entraron');
  if (!res.faltan) {
    PRUEBAS.igual(ana(res.med).length, 0, 'DISCRIMINADOR · con `RES` sobre la persona (lo de P391), Ana desaparece del visor médico');
    PRUEBAS.cierto(p391J(p391SinCorrida(res.hseq.totalesHseq)) !== p391J(p391SinCorrida(res.demo.totalesHseq)),
      'DISCRIMINADOR · y los totales de HSEQ de la cuenta dejan de ser los de la demostración (R21)');
  }
  if (!aMal.faltan) PRUEBAS.cierto(p391J(Array.from(new Set(p391Tests(aMal.act).map(i => i.ts))).sort((x, y) => x - y)) !== p391J(aMal.panel.ts),
    'DISCRIMINADOR · con `RES` sobre la persona en el corrimiento, el ancla sale de otras filas y los instantes difieren');
  /* DISCRIMINADORES · D2, con `RES` tocando a la persona como antes de H1 (P393): la grafía y el borrado de la cédula siguen
     siendo la segunda defensa, y sin `resEnLaCuenta` no habría nada que medir (la cuenta ya no recibe la cédula de `RES`). */
  const ced = medir(['conCedula', 'resEnLaCuenta'], 'Ana Suárez'), gra = medir(['sinGrafia', 'resEnLaCuenta'], 'ANA SUAREZ'), exa = medir(['exacta', 'resEnLaCuenta'], 'ANA SUAREZ');
  PRUEBAS.igual([ced.faltan, gra.faltan, exa.faltan], [undefined, undefined, undefined], 'guarda: los sabotajes entraron');
  if (ced.faltan || gra.faltan || exa.faltan) return;
  PRUEBAS.cierto(ana(ced.med).some(x => String(x.cedula || '').replace(/\D/g, '') === P391_CEDULA_DIGITOS) && p391DeFuera(ced.med).indexOf(P391_CEDULA_DIGITOS) >= 0,
    'DISCRIMINADOR · sin borrar `cedula`, a Ana le viaja la cédula del homónimo de otra empresa (lo de antes de P391), y la marca la ve en el JSON');
  PRUEBAS.cierto(ana(gra.med).some(x => x.persona === 'ANA SUAREZ'), 'DISCRIMINADOR · sin la grafía del elenco, Ana sale como «ANA SUAREZ»');
  PRUEBAS.igual(ana(exa.med).length, 0, 'DISCRIMINADOR · con la comparación exacta, Ana desaparece de la cuenta');
  PRUEBAS.cierto(p391J(p391SinCorrida(exa.hseq.totalesHseq)) !== p391J(p391SinCorrida(exa.demo.totalesHseq)),
    'DISCRIMINADOR · y los totales de HSEQ de la cuenta dejan de ser los de la demostración (R21)');
  const soloRes = medir('resEnLaCuenta', 'Ana Suárez');
  PRUEBAS.igual(soloRes.faltan, undefined, 'guarda: el sabotaje entró');
  if (soloRes.faltan) return;
  PRUEBAS.igual(p391DeFuera(soloRes.med), [], 'CONTROL · aunque `RES` volviera a tocar a la persona, D2 no deja viajar la cédula');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #6 · UNA VARIANTE DE ESCRITURA ES EL MISMO PERSONAJE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P391 · #6 · «carlos mendez» (sin mayúsculas ni tildes) cuenta como Carlos Méndez: una persona, con la grafía del elenco, en la demostración y en la cuenta', () => {
  /* R19 · `demoElencoDe_` compara por `norm(limpiarPersona(persona))` —la identidad de `demoDesplazamiento_` y de
     `unidadesDemoHseq_`— y `demoSoloElenco_` le pone la grafía del elenco. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const medir = (sab, variante) => {
    const w = p391Mundo({ sabotaje: sab, tests: variante ? P391_I8 : [] });
    if (w.faltan) return { faltan: w.faltan };
    return { demo: p391Foto(w.demo()), cuenta: p391Foto(w.visor('medico')) };
  };
  const base = medir(null, false), ok = medir(null, true);
  PRUEBAS.igual([base.faltan, ok.faltan], [undefined, undefined], 'guarda: los mundos se armaron');
  if (base.faltan || ok.faltan) return;
  [['la demostración', 'demo'], ['la cuenta (visor · Servicio médico)', 'cuenta']].forEach(([q, k]) => {
    PRUEBAS.alMenos(base[k].de('Carlos Méndez').length, 1, 'guarda: ' + q + ' trae a Carlos Méndez');
    PRUEBAS.igual(ok[k].de('Carlos Méndez').length, base[k].de('Carlos Méndez').length + 1, '🔴 ' + q + ': la variante se suma a Carlos Méndez');
    PRUEBAS.igual(ok[k].personas, base[k].personas, '🔴 ' + q + ': y no aparece una persona más');
  });
  const exa = medir('exacta', true), sinG = medir('sinGrafia', true);
  PRUEBAS.igual([exa.faltan, sinG.faltan], [undefined, undefined], 'guarda: los sabotajes entraron');
  if (exa.faltan || sinG.faltan) return;
  PRUEBAS.igual(exa.demo.de('Carlos Méndez').length, base.demo.de('Carlos Méndez').length, 'DISCRIMINADOR · con la comparación exacta, la variante no cuenta: se pierde');
  PRUEBAS.cierto(sinG.demo.personas.indexOf('carlos mendez') >= 0, 'DISCRIMINADOR · sin la grafía del elenco, sale como una persona más');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #7 · D1 · EL CORTE POR FECHA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #7 · D1 · el corte: dos nombres DEL ELENCO hoy no cambian nada, una fila del elenco sin día válido no pasa, y el corte mira la fecha del CH, no la corrida; P393 · el ciclo y los turnos de un personaje, en vivo, sí llegan a la cuenta', () => {
  /* R19 · `demoEsDelElenco_` con `DEMO_ELENCO_HASTA` (D1, decisión de Franco del 2026-11-04), desde el paso 0 de
     `demoAjustar`: ANTES de correr las fechas. Una fila sin día válido no pasa (falla cerrado). P393 · el corte es de los
     tests, el PVT y los comentarios: el ciclo y los turnos de la cuenta pasan por `demoSoloElencoPorNombre_`, sólo por nombre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const h = p391Hasta();
  const ultimoSembrado = P391_SEMBRADO.map(x => x[0]).sort().pop();
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(String(h)) && h >= ultimoSembrado && h < P391_HOY,
    'guarda: el corte del .gs (' + h + ') cubre el sembrado (' + ultimoSembrado + ') y deja fuera hoy: si no, este caso no mide el corte');
  const MUNDO = { tests: P391_I5.concat([P391_SIN_DIA]) };
  const medir = (sab, conFilas) => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, conFilas ? MUNDO : {}));
    if (w.faltan) return { faltan: w.faltan };
    const demo = w.demo();
    return { demo: demo, foto: p391Foto(demo), verComo: w.verComo(), med: w.visor('medico', { opDias: '120' }), sup: w.visor('supervisor') };
  };
  const ok = medir(null, true), base = medir(null, false);
  PRUEBAS.igual([ok.faltan, base.faltan], [undefined, undefined], 'guarda: los mundos se armaron');
  if (ok.faltan || base.faltan) return;
  [['la demostración', 'demo'], ['«Ver como…»', 'verComo'], ['el visor · Servicio médico (120 días)', 'med'], ['el visor · Supervisor', 'sup']].forEach(([q, k]) => {
    PRUEBAS.igual(p391Dif(ok[k], base[k]), [], '🔒 ' + q + ': idéntico al mismo mundo sin esas filas');
  });
  PRUEBAS.igual(ok.foto.sinDia, 0, '🔒 ninguna fila sin día válido en la demostración');
  PRUEBAS.igual(p391Ultimo(ok.demo, 'Carlos Méndez').kss, 8, '🔒 el «requiere atención» del guion conserva su último test del sembrado (KSS 8), no el de hoy (9)');
  /* P393 · el ciclo y los turnos de un personaje, de HOY, SÍ llegan a la cuenta: se tiene que poder mostrar un ciclo en vivo */
  const TURNO_HOY = [P391_HOY, '08:40', 'tu-391-2', 'checkin', 'Martín Ibáñez', 'Empresa Demo', 'Operaciones', 'Supervisor', 4, ''];
  const vivo = sab => {
    const w = p391Mundo({ sabotaje: sab, operacional: [[P391_HOY, '08:10', 'ev-391-3', 'martin ibanez', 'salida_casa', '', ''], P391_OP_ELENCO_HOY], turnos: [TURNO_HOY] });
    if (w.faltan) return { faltan: w.faltan };
    return { med: w.visor('medico', { opDias: '120' }), demo: w.demo(), sinVivo: p391Mundo({}).demo() };
  };
  const v = vivo(null);
  PRUEBAS.igual(v.faltan, undefined, 'guarda: el mundo del ciclo en vivo se armó');
  if (v.faltan) return;
  const deHoy = r => ((r && r.operacional) || []).filter(o => o.fecha === P391_HOY).map(o => o.persona);
  PRUEBAS.igual(deHoy(v.med), ['Martín Ibáñez', 'Martín Ibáñez'], '🔴 P393 · los eventos de HOY de un personaje llegan a la cuenta, con la grafía del elenco («martin ibanez» también)');
  PRUEBAS.igual(((v.med.turnos) || []).filter(o => o.fecha === P391_HOY).map(o => o.persona), ['Martín Ibáñez'], '🔴 P393 · y su turno');
  PRUEBAS.cierto(((v.med.duty || {}).diario || []).some(o => o.persona === 'Martín Ibáñez' && o.fecha === P391_HOY), '🔴 P393 · y su jornada (`leerDuty`, sobre el mismo `operacional`)');
  PRUEBAS.igual(p391Dif(v.demo, v.sinVivo), [], 'CONTROL · la demostración pública no lee esas hojas: no cambia');
  const vCorte = vivo('cicloConCorte');
  PRUEBAS.igual(vCorte.faltan, undefined, 'guarda: el sabotaje entró');
  if (vCorte.faltan) return;
  PRUEBAS.igual(deHoy(vCorte.med), [], 'DISCRIMINADOR · con el corte en el ciclo (lo de P391), el evento de hoy no llega');
  PRUEBAS.igual(((vCorte.med.turnos) || []).filter(o => o.fecha === P391_HOY).length, 0, 'DISCRIMINADOR · ni el turno');
  /* CONTROL · lo sembrado pasa: los tests y, en el ciclo, los dos eventos de Rodolfo del último día del corte (inclusive) */
  PRUEBAS.igual([base.foto.n, base.foto.personas.length, base.foto.max], [18, 18, P391_HOY], 'CONTROL · las filas del sembrado pasan: 18 tests de 18 personas, al día');
  PRUEBAS.igual((base.med.operacional || []).filter(o => o.persona === 'Rodolfo Ruiz').length, 2,
    'CONTROL · y el ciclo del elenco hasta el corte: los dos eventos de Rodolfo Ruiz del ' + ultimoSembrado + ', el día del corte');
  /* DISCRIMINADORES */
  const sc = medir('sinCorte', true), cd = medir('corteDespues', false);
  PRUEBAS.igual([sc.faltan, cd.faltan], [undefined, undefined], 'guarda: los sabotajes entraron');
  if (sc.faltan || cd.faltan) return;
  PRUEBAS.cierto(p391Dif(sc.demo, base.demo).indexOf('registros') >= 0 && sc.foto.max === P391_HOY && sc.foto.deHoy(P391_HOY).indexOf('Ana Suárez') >= 0,
    'DISCRIMINADOR · sin el corte (sólo el nombre), los dos nombres del elenco de hoy se vuelven el ancla y cambian la demostración');
  PRUEBAS.igual(p391Ultimo(sc.demo, 'Carlos Méndez').kss, 9, 'DISCRIMINADOR · y Carlos Méndez sale con el KSS de hoy (9)');
  PRUEBAS.alMenos(sc.foto.sinDia, 1, 'DISCRIMINADOR · y la fila sin día entra');
  PRUEBAS.igual(cd.foto.n, 0, 'DISCRIMINADOR · el corte aplicado sobre lo YA corrido deja la demostración vacía');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #8 · CONTRATO: EL ELENCO DEL SERVIDOR ES EL DEL CLIENTE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p391NormJs(s) {
  return String(s).toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
/* Las diferencias entre dos listas de nombres: las que faltan en `b`, las que sobran en `b`, y si el orden es el mismo. */
function p391Comparar(a, b) {
  return { faltan: a.filter(x => b.indexOf(x) < 0), sobran: b.filter(x => a.indexOf(x) < 0), mismoOrden: p391J(a) === p391J(b) };
}

PRUEBAS.caso('🔴 P391 · #8 · contrato: `DEMO_ELENCO` del .gs y `DEMO_GENTE` del cliente son el MISMO elenco, en el mismo orden y con la misma grafía', () => {
  /* R19 · no concede nada: ata las dos copias del elenco. Filtra la del servidor (`demoSoloElenco_`); la del cliente siembra
     la nómina, la jornada, los turnos, la ausencia y los reportes de ejemplo antes de cualquier pedido. Es el patrón de
     P197 con las traducciones (`p197TablaGs`). La tercera copia, el CH, la vigila `demo_inventario` (#9). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const gs = p391ElencoGs();
  PRUEBAS.cierto(Array.isArray(gs), 'guarda: `DEMO_ELENCO` se lee del .gs');
  if (!Array.isArray(gs)) return;
  PRUEBAS.igual(gs.length, 19, 'las 19 personas del CH de la demostración');
  PRUEBAS.igual(new Set(gs.map(p391NormJs)).size, gs.length, '🔴 ninguna colisión por `norm`: si no, `demoElencoDe_` le daría a una la grafía de otra');
  PRUEBAS.igual(gs.filter(n => n !== n.normalize('NFC') || n !== n.trim()), [], 'escritas en NFC y sin espacios de más');
  PRUEBAS.igual(Object.keys(p391GuionGs() || { '(no se leyó DEMO_GUION)': 1 }).filter(n => gs.indexOf(n) < 0), [], 'el guion (`DEMO_GUION`) es parte del elenco');
  /* DISCRIMINADOR del comparador: con un nombre de menos en la copia del .gs, lo ve */
  const sinUno = p391Parchar(CTX.gs, [['"Tomás Aguirre", "Valentina Ríos"];', '"Tomás Aguirre"];']]);
  PRUEBAS.igual(sinUno.faltan, [], 'guarda: el sabotaje entró');
  const gsMal = p391ElencoGs(sinUno.gs) || [];
  PRUEBAS.igual(p391Comparar(gsMal, gs), { faltan: [], sobran: ['Valentina Ríos'], mismoOrden: false },
    'DISCRIMINADOR · sacando un nombre de la copia del .gs, el comparador lo ve');
  if (typeof DEMO_GENTE === 'undefined' || !Array.isArray(DEMO_GENTE)) {
    PRUEBAS.cierto(false, '⚠️ no está `DEMO_GENTE` (sin la app): el contrato con el cliente queda SIN MEDIR');
    return;
  }
  const cli = DEMO_GENTE.map(g => g[0]);
  PRUEBAS.igual(p391Comparar(gs, cli), { faltan: [], sobran: [], mismoOrden: true },
    '🔴 el elenco del .gs y el del cliente coinciden, nombre por nombre y en el mismo orden');
  PRUEBAS.igual(p391Comparar(gsMal, cli).sobran, ['Valentina Ríos'], 'DISCRIMINADOR · con un nombre de menos en el .gs, el contrato se pone en rojo');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   #9 · `demo_inventario` CUENTA LO DESCARTADO, SIN NOMBRES (D5)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P391 · #9 · D5 · `demo_inventario` cuenta lo que la demostración descarta —por hoja, por motivo y por día, SIN NOMBRES— y nombra al personaje que se quedó sin filas', () => {
  /* R19 · `demoInventario_` (la tarea `demo_inventario` de `accionMantenimiento`), con `demoEsDelElenco_` y
     `demoElencoDe_`: la MISMA derivación que filtra. Es el único lugar donde se ve lo descartado: el panel no avisa (D5). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const FUERA = { tests: P391_I2.concat(P391_I3, P391_I4, P391_I5, [P391_SIN_DIA]), pvt: P391_PVT_I2 };
  /* lo esperado, contado desde el fixture y no desde el .gs */
  const esElenco = p => P391_ELENCO.indexOf(p) >= 0;
  const dias = {};
  const sumar = d => { const k = d || 'sin día'; dias[k] = (dias[k] || 0) + 1; };
  FUERA.tests.forEach(x => sumar(x[0])); FUERA.pvt.forEach(x => sumar(x[0])); FUERA.tests.filter(x => x[5]).forEach(x => sumar(x[0]));
  const esperado = { tests: FUERA.tests.length, pvt: FUERA.pvt.length, comentarios: FUERA.tests.filter(x => x[5]).length,
                     porNombre: FUERA.tests.filter(x => !esElenco(x[2])).length + FUERA.pvt.filter(x => !esElenco(x[2])).length + FUERA.tests.filter(x => x[5] && !esElenco(x[2])).length,
                     porFecha: FUERA.tests.filter(x => esElenco(x[2])).length + FUERA.pvt.filter(x => esElenco(x[2])).length + FUERA.tests.filter(x => x[5] && esElenco(x[2])).length,
                     dias: dias };
  const medir = (sab, opc) => {
    const w = p391Mundo(Object.assign({ sabotaje: sab }, opc || {}));
    if (w.faltan) return { faltan: w.faltan };
    return w.inventario();
  };
  const ok = medir(null, FUERA), limpio = medir(null, {});
  /* Valentina Ríos, sin sus filas del sembrado y con una de hoy (que no pasa el corte) */
  const sinVale = medir(null, { sin: ['Valentina Ríos'], tests: [[P391_HOY, '10:00', 'Valentina Ríos', 4, 2]] });
  PRUEBAS.igual([ok.faltan, limpio.faltan, sinVale.faltan], [undefined, undefined, undefined], 'guarda: los mundos se armaron');
  if (ok.faltan || limpio.faltan || sinVale.faltan) return;
  PRUEBAS.igual([ok.ok, ok.tarea], [true, 'demo_inventario'], 'guarda: la tarea responde · ' + (ok.error || ''));
  const inv = ok.r || {};
  PRUEBAS.cierto(!!inv.departamentos && !!inv.sinTraduccion, 'guarda: lo de antes (departamentos, cargos, traducciones) sigue');
  PRUEBAS.igual(inv.fueraDelElenco, esperado, '🔒 cuenta cada fila descartada: por hoja, por motivo (nombre o fecha) y por día');
  PRUEBAS.igual(p391DeFuera(ok), [], '🔒 sin un nombre de fuera en toda la respuesta');
  PRUEBAS.cierto(!!inv.fueraDelElenco, 'guarda: la tarea manda `fueraDelElenco`');
  PRUEBAS.igual(P391_ELENCO.filter(n => String(p391J(inv.fueraDelElenco || null)).indexOf(n) >= 0), [], '🔒 ni uno del elenco: lo descartado no lleva nombres');
  PRUEBAS.igual(inv.elencoSinFilas, [], 'con el sembrado entero, ningún personaje sin filas');
  /* P393 · H5 · pero la demostración muestra 18: Rodolfo Ruiz tiene filas y el ancla las deja fuera. R19 · `demoInventario_`
     llama a `demoAjustar`, el lector real. */
  const demoP = p391Mundo({}).demo();
  PRUEBAS.igual(P391_ELENCO.filter(n => (demoP.registros || []).every(r => r.persona !== n)), ['Rodolfo Ruiz'], 'guarda: la demostración no muestra a Rodolfo Ruiz');
  PRUEBAS.igual([(limpio.r || {}).elencoSinFilas, (limpio.r || {}).elencoSinMostrar], [[], ['Rodolfo Ruiz']], '🔒 H5 · lo dice: tiene filas y la demostración no lo muestra');
  PRUEBAS.igual(inv.elencoSinMostrar, ['Rodolfo Ruiz'], '🔒 H5 · también con filas de fuera: ninguna entra en esa lista');
  const sinRodolfo = medir(null, { sin: ['Rodolfo Ruiz'] });
  PRUEBAS.igual([(sinRodolfo.r || {}).elencoSinFilas, (sinRodolfo.r || {}).elencoSinMostrar], [['Rodolfo Ruiz'], []],
    'CONTROL · sin ninguna fila, es `elencoSinFilas` y no `elencoSinMostrar`: son dos cosas distintas');
  PRUEBAS.igual((sinVale.r || {}).elencoSinFilas, ['Valentina Ríos'], '🔒 un personaje sin filas que pasen el filtro (ni test ni PVT del sembrado) se nombra');
  PRUEBAS.igual([((sinVale.r || {}).fueraDelElenco || {}).porFecha, ((sinVale.r || {}).fueraDelElenco || {}).porNombre], [1, 0],
    'y su fila de hoy se cuenta como descartada por la fecha');
  PRUEBAS.igual((limpio.r || {}).fueraDelElenco, { tests: 0, pvt: 0, comentarios: 0, porNombre: 0, porFecha: 0, dias: {} },
    'CONTROL · sin filas de fuera, todo en cero');
  /* DISCRIMINADORES */
  const sinCuenta = medir('inventarioSinCuenta', FUERA), sinElenco = medir('inventarioSinElenco', { sin: ['Valentina Ríos'] });
  PRUEBAS.igual([sinCuenta.faltan, sinElenco.faltan], [undefined, undefined], 'guarda: los sabotajes entraron');
  if (sinCuenta.faltan || sinElenco.faltan) return;
  const fs = (sinCuenta.r || {}).fueraDelElenco || {};
  PRUEBAS.igual([fs.tests, fs.pvt, fs.comentarios], [0, 0, 0], 'DISCRIMINADOR · sin la cuenta, da cero con las filas de fuera puestas');
  PRUEBAS.igual((sinElenco.r || {}).elencoSinFilas, [], 'DISCRIMINADOR · sin `elencoSinFilas`, el personaje sin filas no se nombra');
  const sinMostrar = medir('inventarioSinMostrar', {});
  PRUEBAS.igual(sinMostrar.faltan, undefined, 'guarda: el sabotaje entró');
  PRUEBAS.igual((sinMostrar.r || {}).elencoSinMostrar, [], 'DISCRIMINADOR · sin `elencoSinMostrar`, Rodolfo no se nombra: el aserto de arriba lo ve');
});
