/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P308 · DE LOS TESTS, HSEQ RECIBE SÓLO TOTALES                                       (2026-10-23)
   Decisión de Franco (2026-10-14, «Tests sólo en totales»): de los tests, HSEQ ve sólo totales de
   grupos de 5 o más personas medidas —el piso, máx(5, anonN)—, y debajo nada, ni el color. El
   servidor los arma en UNIDADES de al menos `piso` personas distintas POR CÉDULA, en el orden de
   llegada, y las SELLA en `Totales HSEQ`: una unidad sellada no se recalcula nunca (ADR 018).

   CÓMO SE MIDE «NO SE PUEDE DESPEJAR». Los casos corren una COPIA del `.gs` real con un TRAZADOR:
   cada fila del CH de prueba lleva un id estable en una columna que el parser no lee, y unas líneas
   agregadas llevan ese id de cada test hasta cada total publicado (`__filas`), pasando por la hoja
   sellada. Con eso cada total es un CONJUNTO de tests, y se arman los ÁTOMOS —los tests que están
   exactamente en los mismos totales, juntando TODOS los pedidos que se comparan—: ninguno puede
   tener de 1 a piso − 1 personas reales. Restar, cruzar o comparar totales nunca separa dos tests del
   mismo átomo. Y todo objeto con un conteo `n` es un total: si no trae traza, el caso lo marca
   (el verificador de P308 metió un total crudo sin traza y la primera versión no lo vio).

   La 1.ª versión de P308 rearmaba las unidades en cada pedido; el verificador mostró que una persona
   que se da de alta, un duplicado borrado o una fila nueva de `Confiabilidad` corrían la frontera, y
   la misma semana, pedida antes y después, daba el valor de UNA persona. Los casos de «dos momentos con
   cambios en filas viejas» existen por eso, y el sabotaje «sin sellar» es su discriminador. La 2.ª guardaba
   sólo un cursor de tiempo por cuenta, y la 3.ª vuelta del verificador mostró que un cambio de CLAVE (otro
   `Usuario`, otra fila en `Accesos`) volvía a sellar desde cero: ahora cada unidad guarda las HUELLAS de sus
   tests y un test se sella una sola vez, en cualquier clave. El sabotaje «sin huellas» es su discriminador. Y la
   4.ª vuelta mostró que las guardas contaban CANTIDADES (filas, huellas ausentes): vaciar una celda de «Huellas»
   o cortar y volver a pegar filas en dos corridas despejaba a una persona sin ningún aviso. Ahora la hoja se
   comprueba por FIRMA DE CONTENIDO por cuenta, y un test con instante anterior a lo ya sellado de su empresa y
   métrica nunca se sella («sin viejos», «sin firmas» y «sin tope guardado» son sus discriminadores).
   R17: todo entra por `accionSupervisor` con la contraseña del panel de HSEQ, y el sellado, por la
   misma función que corre el disparador. R19: lo concede `esPanelHseq_`; lo arma `sellarTotalesHseq_`
   y lo lee `unidadesSelladasHseq_`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('P308 · de los tests, HSEQ recibe sólo totales');

/* El «ahora» por defecto: martes 3 de noviembre de 2026, 15:00 en Caracas. La semana anterior (lunes
   26 de octubre a domingo 1 de noviembre) CORTA el mes: es la situación (b) del plan. */
const P308_AHORA = '2026-11-03T15:00:00-04:00';
const P308_PISO = 5;
/* Doce personas ficticias, todas en la nómina con su cédula. Operaciones tiene seis; el resto, áreas
   chicas: una persona sola con su cargo, un área de dos, y un área de tres. */
const P308_GENTE = {
  'Oscar Uno':    ['Operaciones', 'Piloto'],   'Olga Dos':     ['Operaciones', 'Piloto'],
  'Omar Tres':    ['Operaciones', 'Piloto'],   'Otto Cuatro':  ['Operaciones', 'Técnico'],
  'Oriana Cinco': ['Operaciones', 'Técnico'],  'Orlando Seis': ['Operaciones', 'Técnico'],
  'Alma Única':   ['Administración', 'Presidente'],
  'Lara Legal':   ['Legal', 'Abogado'],        'Leo Legal':    ['Legal', 'Abogado'],
  'Mario Mes':    ['Mantenimiento', 'Mecánico'], 'Marta Mes':  ['Mantenimiento', 'Mecánico'],
  'Nora Nueva':   ['Mantenimiento', 'Mecánico'],
  'Pedro Pendiente': ['Mantenimiento', 'Mecánico']   // mide antes de estar en la nómina (escenario «alta nueva»)
};
const P308_ETIQUETAS = ['Operaciones', 'Administración', 'Legal', 'Mantenimiento', 'Piloto', 'Técnico',
                        'Presidente', 'Abogado', 'Mecánico'];
const P308_COL_ID = 88;   // una columna que `parseRegistros` no lee: el id estable de cada test del CH de prueba

/* Un test: { p, d, h, v } — persona, día, hora de llegada, valor de KSS. El instante va en la marca y en
   la fecha (desde agosto el CH las tiene iguales), como una celda Date de verdad. */
let P308_SEQ = 0;
function p308Test(x) { return Object.assign({ id: 'T' + (++P308_SEQ) }, x); }
function p308Fila(x) {
  const f = new Array(90).fill('');
  const dt = GS.fechaDeCelda(x.d + 'T' + (x.h || '08:00') + ':00');
  f[0] = dt;
  f[1] = x.p;
  f[2] = (P308_GENTE[x.p] || ['Otra'])[0];
  f[72] = x.emp || 'Helitec';
  f[73] = dt;
  f[86] = x.v;
  /* `m`: otra métrica que KSS (columna del primer ítem de su bloque; valores de 0 a 6) */
  if (x.m && x.m !== 'kss') { f[86] = ''; f[{ estres: 3, cansancio: 15, gastro: 24, ansiedad: 36, depresion: 57 }[x.m]] = x.v; }
  f[P308_COL_ID] = x.id;
  return f;
}
function p308FilaNomina(n, empresa) {
  const i = Object.keys(P308_GENTE).indexOf(n);
  return [empresa || 'Helitec', n, 'V-' + (308100 + i), P308_GENTE[n][0], P308_GENTE[n][1], '', '', '', '', 'No', '', 'empleado', '3'];
}
function p308Hojas(tests, opc) {
  opc = opc || {};
  return {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq', 'Clave panel HSEQ'],
                ['helitec', 'sup-308', 'empresa', opc.empresas || 'Helitec', 'med-308', 'dir-308', 'hseq-308']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')].concat(tests.map(p308Fila)),
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono',
                'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel']]
      .concat(Object.keys(P308_GENTE).filter(n => (opc.sinNomina || ['Pedro Pendiente']).indexOf(n) < 0)
        .map(n => p308FilaNomina(n))),
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']].concat(opc.anonN != null ? [['Helitec', 'anonN', String(opc.anonN)]] : []),
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento',
                     'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']].concat(opc.operacional || []),
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']]
      .concat(opc.turnos || []),
    'Confiabilidad': [['Fecha', 'IdRegistro', 'Test', 'Persona', 'Empresa', 'Departamento', 'Score', 'Confiable',
                       'Senales', 'MedianaSeg', 'Preguntas']].concat(opc.confiabilidad || []),
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
}

/* ── El trazador y los sabotajes: reemplazos de texto sobre el `.gs` real ───────────────────────── */
function p308Parchar(gs, cambios) {
  let s = gs || '';
  const faltan = [];
  cambios.forEach(par => {
    const n = s.split(par[0]).length - 1;
    if (n !== 1) faltan.push(String(par[0]).trim().slice(0, 70) + ' ×' + n);
    else s = s.split(par[0]).join(par[1]);
  });
  return { gs: s, faltan: faltan };
}
const P308_TRAZA = [
  ['    out.push(reg);', '    reg.__fila = String(fila[' + P308_COL_ID + '] || r); out.push(reg);'],
  ['  a.suma = Math.round(a.suma * 1000) / 1000;\n  return a;',
   '  a.suma = Math.round(a.suma * 1000) / 1000;\n  a.__filas = u.regs.map(function (r) { return r.__fila; });\n  return a;'],
  /* la traza va en una columna 15, DESPUÉS de las huellas: el rango que se escribe se ensancha en una */
  ['                      un.regs.map(function (r) { return huella(r, m); }).join(",")]);',
   '                      un.regs.map(function (r) { return huella(r, m); }).join(","), JSON.stringify(a.__filas)]);'],
  ['            filas.push([k, etiqueta, HSEQ_EXCLUIDOS, "", "", tramo.length, "", "", "", "", "", "", sellada, tramo.join(",")]);',
   '            filas.push([k, etiqueta, HSEQ_EXCLUIDOS, "", "", tramo.length, "", "", "", "", "", "", sellada, tramo.join(","), "[]"]);'],
  ['      var rango = sh.getRange(ultima + 1, 1, filas.length, TOTALES_HSEQ_HEAD.length);',
   '      var rango = sh.getRange(ultima + 1, 1, filas.length, TOTALES_HSEQ_HEAD.length + 1);'],
  ['                  sellada: Date.parse(String(v[i][12] || "")) || 0 });',
   '                  sellada: Date.parse(String(v[i][12] || "")) || 0, __filas: JSON.parse(String(v[i][14] || "[]")) });'],
  ['    t.n += u.n; t.suma += u.suma; t.pocoConfiables += u.pc;',
   '    t.n += u.n; t.suma += u.suma; t.pocoConfiables += u.pc; (t.__filas = t.__filas || []).push.apply(t.__filas, u.__filas || []);'],
  ['    porK[sk].n += u.n; porK[sk].suma += u.suma;',
   '    porK[sk].n += u.n; porK[sk].suma += u.suma; (porK[sk].__filas = porK[sk].__filas || []).push.apply(porK[sk].__filas, u.__filas || []);'],
  ['  t.serie = claves.map(function (k) { return { k: k, n: porK[k].n, suma: redondo(porK[k].suma) }; });',
   '  t.serie = claves.map(function (k) { return { k: k, n: porK[k].n, suma: redondo(porK[k].suma), __filas: porK[k].__filas }; });']
];
/* Para los sabotajes: los registros resueltos de una empresa (con su traza) y un total crudo de ellos. */
const P308_AYUDA =
  'function p308Regs_(empresaCanon) { var regs = leerDatos(true).registros; var RES = construirResolutor(); RES.aplicar(regs);\n' +
  '  return regs.filter(function (r) { return norm(r.empresa) === norm(empresaCanon); }); }\n' +
  'function p308Crudo_(regs, m, deja) { var t = { n: 0, suma: 0, __filas: [] };\n' +
  '  regs.forEach(function (r) { if (r[m] == null || !deja(r)) return; t.n++; t.suma += Number(r[m]); t.__filas.push(r.__fila); });\n' +
  '  return t; }\n' +
  'function p308SinSellar_(empresaCanon, anonN, piso1) { var regs = p308Regs_(empresaCanon), piso = piso1 ? 1 : pisoHseq_(anonN), out = {};\n' +
  '  METRICAS.forEach(function (m) { var ts = regs.filter(function (r) { return r[m] != null && r[m] !== "" && isFinite(Number(r[m])) && diaPartesHseq_(r.fecha) && norm(r.persona); })\n' +
  '      .sort(function (a, b) { return ((+a.ts) - (+b.ts)) || (a.__orden - b.__orden); });\n' +
  '    out[m] = formarUnidadesHseq_(ts, piso, function (r) { return piso1 ? norm(r.persona) : cedulaNorm(r.cedula); }).unidades\n' +
  '      .map(function (u) { var a = agregarUnidadHseq_(u, m, null); a.sellada = a.hasta; return a; }); });\n' +
  '  return totalesHseq_(out, piso1 ? 5 : piso, Date.now()); }\n';
const P308_FN_LEE = 'function totalesHseqDeEmpresa_(empresaCanon, anonN) {';
const P308_LEE = '    var T = totalesHseq_(U, pisoHseq_(anonN), Date.now());';
/* Un sabotaje que EXTIENDE lo que lee el panel: `extra` es código que recibe `T` (los totales de verdad) y
   `regs` (los registros resueltos de la empresa) y les agrega lo que el servidor real no manda. */
function p308Extiende(extra) {
  return [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
          [P308_LEE, P308_LEE + '\n    var regs = p308Regs_(empresaCanon), hoy = T.hoy;\n' + extra]];
}
const P308_SABOTAJES = {
  /* (1) «sólo tapa la pantalla»: el servidor manda los totales por área; el cliente no los pinta. */
  tapaPantalla: p308Extiende('    T.grupos = {}; regs.forEach(function (r) { var d = r.departamento || "—"; if (!T.grupos[d]) T.grupos[d] = p308Crudo_(regs, "kss", function (x) { return x.departamento === d; }); });'),
  /* (2) «manda los dos totales con su conteo»: el día y el área grande, cada uno con su piso de 5 nombres. */
  dosTotales: p308Extiende('    var dia = p308Crudo_(regs, "kss", function (x) { return x.fecha === hoy; }), area = p308Crudo_(regs, "kss", function (x) { return x.fecha === hoy && x.departamento === "Operaciones"; });\n' +
                           '    T.porArea = { dia: dia.n >= 5 ? dia : null, operaciones: area.n >= 5 ? area : null };'),
  /* (3) «deja el color de un grupo chico» */
  colorChico: p308Extiende('    T.colores = { "Administración": "rojo" };'),
  /* períodos (1) «calcular sobre el rango pedido»: lo inyecta `accionSupervisor`, que es quien ve el rango */
  rangoPedido: [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
    ['  var totalesHseq = esPanelHseq_(acc) ? totalesHseqDeEmpresa_(gestScope(acc, p.empresa), cfgEmpresa.anonN) : null;',
     '  var totalesHseq = esPanelHseq_(acc) ? totalesHseqDeEmpresa_(gestScope(acc, p.empresa), cfgEmpresa.anonN) : null;\n' +
     '  if (totalesHseq && p.opDesde) totalesHseq.rango = p308Crudo_(p308Regs_(gestScope(acc, p.empresa)), "kss", function (x) { return x.fecha >= p.opDesde && x.fecha <= (p.opHasta || "9999"); });']],
  /* períodos (2) «semanas y meses de calendario, cada uno con su piso»: sin unidades (cada test es una), sin sellar */
  cadaUnoSuPiso: [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
    [P308_LEE, '    var T = p308SinSellar_(empresaCanon, anonN, true);']],
  /* períodos (3) «el total de la semana con un día oculto en su serie»: como (2), y además se esconden los días chicos */
  diaOculto: [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
    [P308_LEE, '    var T = p308SinSellar_(empresaCanon, anonN, true);'],
    ['  t.serie = claves.map(function (k) { return { k: k, n: porK[k].n, suma: redondo(porK[k].suma), __filas: porK[k].__filas }; });',
     '  t.serie = claves.map(function (k) { return { k: k, n: porK[k].n, suma: redondo(porK[k].suma), __filas: porK[k].__filas }; }).filter(function (p) { return p.n >= 5; });']],
  /* períodos (4) y los cambios en filas viejas: rearmar en cada pedido, como la 1.ª versión */
  sinSellar: [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
    [P308_LEE, '    var T = p308SinSellar_(empresaCanon, anonN, false);']],
  /* la clave por NOMBRE de la empresa (la 2.ª versión): después de un renombre, el panel pierde lo que ya vio */
  claveNombre: [['    if (!primera[e0]) primera[e0] = nu;', '    if (!primera[e0]) primera[e0] = e0;']],
  /* sin la firma de la hoja: una cuenta tocada se acepta en silencio (no se detiene ni se dice) */
  sinGuarda: [['      trabadas[k] = { causa: "hoja_tocada", hoja: a.n, selladas: c.n };', '      conf[k] = a;']],
  /* sin huellas: lo único que frena un re-sellado es el tope de su empresa, y una empresa NUEVA no tiene tope */
  sinHuellas: [['        var cand = porCuenta[k].regs.filter(function (r) { return valido(r, m) && (forzarViejos[k] || (+r.ts || 0) <= limite) && !selladas[huella(r, m)]; });',
                '        var cand = porCuenta[k].regs.filter(function (r) { return valido(r, m) && (forzarViejos[k] || (+r.ts || 0) <= limite); });']],
  /* sellar también los viejos: una fila reescrita, cortada y vuelta a pegar, o con su huella borrada, se re-sella */
  sinViejos: [['        var viejos = cand.filter(function (r) { return forzarViejos[k] || (+r.ts || 0) <= tope; });\n        var tests = cand.filter(function (r) { return !forzarViejos[k] && (+r.ts || 0) > tope; });',
               '        var viejos = [];\n        var tests = cand;']],
  /* sin la guarda de huellas que desaparecen de golpe: una hora corrida en muchas filas re-sella las que pasan el tope */
  sinGuardaMasiva: [['      else trabadas[k] = { causa: "huellas_desaparecidas", desaparecidas: n - (Number(ausentesAntes[k]) || 0) };', '      else void 0;']],
  /* confirmar lo releído sin compararlo con lo esperado: una edición durante el sellado queda confirmada */
  confirmaLoReleido: [['        if (igual(rl, esperadas[k])) conf[k] = rl; else sinConfirmar.push(k);', '        conf[k] = rl;']],
  /* sin la guarda de la zona del libro */
  sinZona: [['    if (zona && zonaGuardada && zona !== zonaGuardada) {', '    if (false) {']],
  /* el traspaso deja el tope en la clave vieja: otra empresa que recibe ese `Usuario` lo hereda */
  sinBorrarTopeViejo: [['      if (!quedan) delete T["k:" + de];', '']],
  /* el panel sin comparar la firma: una fila agregada a mano a la hoja entra al total */
  sinFirmaAlLeer: [['    if ((conf && !mismo(info.firma, conf) && !mismo(info.firma, pend)) || info.invalida)', '    if (info.invalida)']],
  /* el panel sin rechazar las filas que ningún sellado escribe (menos de 5 personas) */
  sinValidarFilas: [['    if ((conf && !mismo(info.firma, conf) && !mismo(info.firma, pend)) || info.invalida)', '    if (conf && !mismo(info.firma, conf) && !mismo(info.firma, pend))']],
  /* el tope sólo de la hoja, sin el guardado: borrar la última fila sellada lo baja y sus tests se re-sellan */
  sinTopeGuardado: [['        var T = topes[m], tope = Number(T["k:" + k]) || 0;\n        (cuentas.variantesDe[k] || []).forEach(function (x) { var n = norm(x); if (n) tope = Math.max(tope, Number(T["n:" + n]) || 0); });\n        if (!tope) tope = Math.min(hastaHoja[e0 + "|" + m] || 0, ahoraMs);',
                     '        var T = topes[m], tope = Math.min(hastaHoja[e0 + "|" + m] || 0, ahoraMs);']],
  /* el tope sin los nombres de la empresa: un `Usuario` nuevo o una empresa que se separa lo pierden */
  sinTopePorNombre: [['        (cuentas.variantesDe[k] || []).forEach(function (x) { var n = norm(x); if (n) tope = Math.max(tope, Number(T["n:" + n]) || 0); });', '']],
  /* el tope leído sólo de los nombres PROPIOS (la 5.ª versión): una separación «sucia» lo pierde */
  topeSoloPropios: [['        (cuentas.variantesDe[k] || []).forEach(function (x) { var n = norm(x); if (n) tope = Math.max(tope, Number(T["n:" + n]) || 0); });',
                     '        (cuentas.nombresPropios[k] || []).forEach(function (n) { tope = Math.max(tope, Number(T["n:" + n]) || 0); });']],
  /* el «Hasta» de la hoja siempre en el tope y sin acotar (la 5.ª versión): uno editado al futuro lo sube para siempre */
  hastaSinTope: [['      if (ha > ahoraMs) ha = 0;   // ningún sellado escribe un «Hasta» futuro: uno así lo escribió alguien (6.ª vuelta)', ''],
                 ['        if (!tope) tope = Math.min(hastaHoja[e0 + "|" + m] || 0, ahoraMs);', '        tope = Math.max(tope, hastaHoja[e0 + "|" + m] || 0);']],
  /* el reconciliar forzado sólo con lo asentado (la 5.ª versión): una hora corrida al futuro se escapa */
  forzadoConLimite: [['        var cand = porCuenta[k].regs.filter(function (r) { return valido(r, m) && (forzarViejos[k] || (+r.ts || 0) <= limite) && !selladas[huella(r, m)]; });',
                      '        var cand = porCuenta[k].regs.filter(function (r) { return valido(r, m) && (+r.ts || 0) <= limite && !selladas[huella(r, m)]; });']],
  /* forzar aunque haya fechas más allá de la ventana del parser: esos tests se re-sellan cuando les llega la fecha */
  sinFechasFuturas: [['      if (n) { futuras[k] = n; delete forzarViejos[k]; trabadas[k] = { causa: "fechas_futuras", filas: n }; }', '      void n;']],
  /* el traspaso sin la base de huellas ausentes: la clave nueva se detiene sin causa */
  reclaveSinAusentes: [['    aus[a] = (Number(aus[a]) || 0) + (Number(aus[de]) || 0);', '    void 0;']],
  /* el tope mezclando métricas (la 3.ª versión): lo que espera en una métrica lenta queda viejo */
  topeMezclado: [['        var T = topes[m], tope = Number(T["k:" + k]) || 0;',
                  '        var T = topes[m], tope = 0; METRICAS.forEach(function (mm) { tope = Math.max(tope, Number(topes[mm]["k:" + k]) || 0); });']],
  /* sin mirar de qué empresa son las filas de una clave: un `Usuario` reusado se lleva lo ajeno */
  sinAjenas: [['      else if (principal !== duena) ajenas[ck] = 1;', ''],
              ['    if (alias && duenaFilaHseq_(alias, cuentas, v[i][1]) !== propia) return null;', '']],
  /* leer `Confiabilidad` al pedir, en vez de lo sellado: la verificación de «confiabilidad» no tenía discriminador */
  confRelee: [[P308_FN_LEE, P308_AYUDA + P308_FN_LEE],
    [P308_LEE, '    var regs = p308Regs_(empresaCanon), idxR = indiceConfiabilidadHseq_(construirResolutor());\n' +
               '    METRICAS.forEach(function (m) { (U[m] || []).forEach(function (u) { u.pc = 0; u.ev = 0; (u.__filas || []).forEach(function (f) {\n' +
               '      var r = regs.filter(function (x) { return x.__fila === f; })[0]; if (!r) return;\n' +
               '      var c = idxR[confClaveHseq_(r.persona, r.fecha, r.empresa, m)]; if (c !== undefined) { u.ev++; if (c === false) u.pc++; } }); }); });\n' +
               '    var T = totalesHseq_(U, pisoHseq_(anonN), Date.now());']],
  /* sin ambigüedad: con dos cuentas para la misma empresa, la última se queda con la clave */
  sinAmbiguedad: [['    if (primera[e0] && primera[e0] !== nu) ambigua[e0] = 1;\n    if (!primera[e0]) primera[e0] = nu;', '    primera[e0] = nu;']],
  /* el administrador también da clave */
  adminDaClave: [['    if (A.AC.rol >= 0 && String(A.filas[i][A.AC.rol] || "").trim().toLowerCase() === "admin") continue;', '']],
  /* el piso por NOMBRE: las filas inventadas lo completan */
  pisoPorNombre: [['      var claveDe = function (r) { var ced = cedulaNorm(r.cedula); return (ced && enNomina[ced]) ? ced : ""; };',
                   '      var claveDe = function (r) { return norm(r.persona); };']],
  /* hoy (i) «contar las 5 nuevas sólo en la empresa entera»: el total de Legal avanza con las unidades de la empresa */
  hoyPorEmpresa: p308Extiende('    var leg = { n: 0, suma: 0, __filas: [] }; (unidadesSelladasHseq_(claveCuentaHseq_(empresaCanon)).kss || []).forEach(function (u) { if (u.dia !== hoy) return; (u.__filas || []).forEach(function (f) { var r = regs.filter(function (x) { return x.__fila === f; })[0]; if (!r || r.departamento !== "Legal") return; leg.n++; leg.suma += Number(r.kss); leg.__filas.push(f); }); });\n' +
                              '    T.hoyLegal = leg.n ? leg : null;'),
  /* hoy (ii) «publicar el día cerrado con todo lo medido» */
  diaConTodo: p308Extiende('    var ayer = diaFijoMas_(hoy, -1), todo = p308Crudo_(regs, "kss", function (x) { return x.fecha === ayer; });\n' +
                           '    T.ayerConTodo = todo.n ? todo : null;'),
  /* lo que viaja (1) la aptitud por persona, como hasta P307 */
  conAptitud: [['    aptitudPayload = esPanelHseq_(acc) ? null : armado.aptitud;', '    aptitudPayload = armado.aptitud;']],
  /* lo que viaja (2) el color del test del ciclo */
  conNivel: [['                  "test", "resultado", "plan"],', '                  "test", "resultado", "nivel", "plan"],']],
  /* lo que viaja (3) el color del KSS del turno */
  conKssNivel: [['    turnos:      ["persona", "empresa", "departamento", "cargo", "fecha", "hora", "tipo", "carga"]',
                 '    turnos:      ["persona", "empresa", "departamento", "cargo", "fecha", "hora", "tipo", "carga", "kssNivel"]']]
};
function p308Gs(sabotaje) {
  const t = p308Parchar(CTX.gs, P308_TRAZA);
  if (!sabotaje) return t;
  const s = p308Parchar(t.gs, P308_SABOTAJES[sabotaje] || [['§§ sabotaje desconocido §§', '']]);
  return { gs: s.gs, faltan: t.faltan.concat(s.faltan) };
}

/* ── Un CH de prueba con reloj móvil ─────────────────────────────────────────────────────────────
   `mundo.sellarYPedir(iso, params)` corre el sellado A ESA HORA y después el panel, como en producción
   (el disparador sella; el panel sólo lee). Entre dos llamadas se puede tocar la hoja. */
function p308Mundo(tests, opc) {
  opc = opc || {};
  const g = p308Gs(opc.sabotaje);
  if (g.faltan.length) return { faltan: g.faltan };
  const reloj = { ms: Date.parse(opc.ahora || P308_AHORA) }, Real = Date;
  class Movil extends Real {
    constructor(...a) { if (a.length) super(...a); else super(reloj.ms); }
    static now() { return reloj.ms; }
    static [Symbol.hasInstance](x) { return x instanceof Real; }
  }
  const env = GS.crearEntorno(p308Hojas(tests, opc));
  env.Date = Movil;
  /* En producción cada pedido es una ejecución nueva: los cachés por ejecución (`Accesos`, nómina) se
     vacían. Acá se recarga el `.gs` en cada momento, así un cambio en una hoja se ve como allá. */
  const cargar = () => GS.cargarGs(g.gs, env, ['accionSupervisor', 'accionActividad', 'sellarTotalesHseq_', 'accionDemo', 'hseqReclave_']);
  const w = { env, reloj, cargar, api: cargar() };
  w.hoja = n => env.SpreadsheetApp.openById('maestro').getSheetByName(n);
  w.props = () => env.PropertiesService.getScriptProperties();
  w.pedir = (params, clave) => { w.api = cargar(); return JSON.parse(w.api.accionSupervisor(Object.assign({ usuario: 'helitec',
    pass: clave || opc.clave || 'hseq-308', dispositivoId: 'p308' }, params || {})).getContent()); };
  return Object.assign(w, {
    sellarYPedir(iso, params, clave) {
      if (iso) reloj.ms = Date.parse(iso);
      w.api = cargar();
      const s = w.api.sellarTotalesHseq_(reloj.ms);
      const r = w.pedir(params, clave);
      r.__sellado = s;
      return r;
    },
    /* lo que corre `hseq_reconciliar&confirmo=1`: el mismo sellado, con `reconciliar` */
    reconciliar(iso) { if (iso) reloj.ms = Date.parse(iso); w.api = cargar(); return w.api.sellarTotalesHseq_(reloj.ms, true); },
    agregar(x) { w.hoja('Respuestas de formulario 1').appendRow(p308Fila(x)); },
    /* alguien cambia a mano la hora de un test (la marca y la fecha) */
    reescribir(id, d, h) {
      const hj = w.hoja('Respuestas de formulario 1'), v = hj.getDataRange().getValues(), dt = GS.fechaDeCelda(d + 'T' + h + ':00');
      for (let i = 0; i < v.length; i++) if (v[i][P308_COL_ID] === id) { hj.getRange(i + 1, 1).setValue(dt); hj.getRange(i + 1, 74).setValue(dt); return true; }
      return false;
    },
    borrarFilaDeId(id) {
      const h = w.hoja('Respuestas de formulario 1'), v = h.getDataRange().getValues();
      for (let i = 0; i < v.length; i++) if (v[i][P308_COL_ID] === id) { h.deleteRow(i + 1); return true; }
      return false;
    }
  });
}
/* Un pedido suelto: sellar a la hora de `opc.ahora` y pedir. */
function p308Pedir(tests, opc) {
  opc = opc || {};
  const w = p308Mundo(tests, opc);
  if (w.faltan) return { faltan: w.faltan };
  return w.sellarYPedir(null, opc.params);
}

/* ── La medición ─────────────────────────────────────────────────────────────────────────────── */
/* TODO objeto con un conteo `n` numérico es un total publicado: con traza entra en la familia; sin
   traza, va a `sinTraza` y el caso lo marca en rojo (un total crudo sin traza pasaba en verde). */
function p308Conjuntos(obj, ruta, out, sinTraza) {
  out = out || []; ruta = ruta || '';
  if (!obj || typeof obj !== 'object') return out;
  if (typeof obj.n === 'number') {
    if (Array.isArray(obj.__filas)) out.push({ k: ruta, filas: obj.__filas.slice(), n: obj.n, suma: obj.suma, obj: obj });
    else if (sinTraza) sinTraza.push(ruta);
  }
  Object.keys(obj).forEach(k => { if (k !== '__filas') p308Conjuntos(obj[k], ruta + '.' + k, out, sinTraza); });
  return out;
}
/* Personas REALES por id de test: las de la nómina. Un nombre inventado no cuenta como persona. */
function p308PersonaDe(tests) {
  const m = {};
  tests.forEach(x => { m[x.id] = P308_GENTE[x.p] ? x.p : null; });
  return id => m[id] || null;
}
function p308Atomos(conjuntos, personaDe) {
  const vec = {};
  conjuntos.forEach((c, i) => c.filas.forEach(f => { vec[f] = (vec[f] || '') + '|' + i; }));
  const grupos = {};
  Object.keys(vec).forEach(f => { (grupos[vec[f]] = grupos[vec[f]] || []).push(f); });
  return Object.keys(grupos).map(v => ({ filas: grupos[v],
    personas: new Set(grupos[v].map(personaDe).filter(Boolean)).size,
    nombres: Array.from(new Set(grupos[v].map(personaDe).filter(Boolean))) }));
}
/* Lo despejable: átomos de 1 a piso − 1 personas reales, juntando TODOS los pedidos; y los totales sin traza. */
function p308Medir(respuestas, tests, piso) {
  const conj = [], sinTraza = [];
  respuestas.forEach((r, i) => p308Conjuntos(r.totalesHseq, 'r' + i, conj, sinTraza));
  const personaDe = p308PersonaDe(tests);
  const chicos = p308Atomos(conj, personaDe).filter(a => a.personas > 0 && a.personas < (piso || P308_PISO))
    .map(a => a.nombres.join('+') + ' (' + a.filas.length + ' tests)');
  return { conj: conj, sinTraza: sinTraza, despejable: chicos };
}
/* El mismo conjunto de tests publicado en dos momentos tiene que traer LOS MISMOS números: un total que
   cambia sin cambiar de tests (un «poco confiable» nuevo) despeja por la diferencia. */
function p308Movidos(a, b) {
  /* POR RUTA: el mismo total (la semana, el KSS de hoy…) con los mismos tests en los dos momentos tiene que
     traer los mismos números. Por conjunto de tests se quedaba con un objeto solo, y si era un punto de la serie
     (sin `pocoConfiables`) ese campo no se comparaba (verificador, 2.ª vuelta). */
  const firma = c => c.filas.slice().sort().join(',');
  const enB = {};
  p308Conjuntos(b.totalesHseq, '').forEach(c => { enB[c.k] = c; });
  const mal = [];
  p308Conjuntos(a.totalesHseq, '').forEach(c => {
    const cb = enB[c.k];
    if (!cb || firma(cb) !== firma(c)) return;
    const o = cb.obj;
    /* sólo los campos que traen LOS DOS: un punto de la serie con los mismos tests que un total no trae
       `pocoConfiables`, y eso no es un cambio */
    ['n', 'suma', 'pocoConfiables', 'evaluados'].forEach(k => {
      if (!(k in o) || !(k in c.obj)) return;
      if (o[k] !== c.obj[k] && !(o[k] == null && c.obj[k] == null)) mal.push(c.k + '.' + k + ': ' + c.obj[k] + ' → ' + o[k]);
    });
  });
  return Array.from(new Set(mal));
}
/* Lo que la semana ya había publicado y después falta (por ruta de la semana, KSS): un cambio de clave mal
   resuelto no despeja, pero le saca al panel lo que ya vio. */
function p308Falta(a, b) {
  const sem = r => ((((r || {}).totalesHseq || {}).periodos || {}).semana || {}).metricas || {};
  const fb = new Set(((sem(b).kss || {}).__filas) || []);
  return (((sem(a).kss || {}).__filas) || []).filter(f => !fb.has(f));
}
/* La resta del plan, con los números del payload: ningún total ni ninguna resta de dos totales da el
   (conteo, suma) de un grupo chico. */
function p308Restas(respuestas, chicos) {
  const ts = [];
  respuestas.forEach(r => p308Conjuntos(r.totalesHseq, '', ts));
  const hits = [];
  const mira = (n, s, k) => chicos.forEach(c => { if (n === c.n && Math.abs(s - c.suma) < 1e-9) hits.push(k + ' = ' + c.que); });
  ts.forEach(a => {
    mira(a.n, a.suma, a.k);
    ts.forEach(b => { if (a !== b && a.n > b.n) mira(a.n - b.n, a.suma - b.suma, a.k + ' − ' + b.k); });
  });
  return Array.from(new Set(hits));
}
/* Ninguna clave fuera de la forma del total, ningún nombre de grupo ni de persona, ningún color. */
const P308_CLAVES_OK = ['piso', 'regla', 'hoy', 'corte', 'corteDia', 'periodos', 'desde', 'hasta',
  'metricas', 'previo', 'n', 'suma', 'pocoConfiables', 'evaluados', 'serie', 'k', 'error', '__filas', 'ultimaCorrida',
  'detenido', 'causa',
  'semana', 'mes', 'trimestre', 'semestre', 'anio', 'todo',
  'kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'];
function p308Forma(T) {
  const raras = [], visto = new Set();
  const anda = (o, ruta) => {
    if (!o || typeof o !== 'object') {
      if (typeof o === 'string' && (P308_ETIQUETAS.indexOf(o) >= 0 || P308_GENTE[o] || /^(rojo|amarillo|verde|alto|medio|bajo|ok)$/i.test(o)))
        raras.push(ruta + ' = ' + o);
      return;
    }
    Object.keys(o).forEach(k => {
      if (!Array.isArray(o) && P308_CLAVES_OK.indexOf(k) < 0) visto.add(ruta + '.' + k);
      anda(o[k], ruta + '.' + k);
    });
  };
  anda(T, 'totalesHseq');
  return raras.concat([...visto].filter(r => !/\.serie\.\d+\.|\.__filas\./.test(r)));
}

/* ── Situaciones ─────────────────────────────────────────────────────────────────────────────── */
/* Las cuatro del plan: un cargo de una persona (Alma, Presidente), un área de dos (Legal), un cruce
   de dos atributos que da menos de 5 (Operaciones × Técnico: 3) y un día —hoy— con 7 medidos, 6 de
   ellos de Operaciones. */
function p308Cuatro() {
  return [
    { p: 'Lara Legal', d: '2026-11-02', h: '08:00', v: 4 }, { p: 'Leo Legal', d: '2026-11-02', h: '08:10', v: 6 },
    { p: 'Oscar Uno', d: '2026-11-02', h: '08:20', v: 3 },  { p: 'Olga Dos', d: '2026-11-02', h: '08:30', v: 5 },
    { p: 'Oscar Uno', d: '2026-11-03', h: '07:00', v: 7 },  { p: 'Olga Dos', d: '2026-11-03', h: '07:10', v: 2 },
    { p: 'Alma Única', d: '2026-11-03', h: '07:20', v: 9 }, { p: 'Omar Tres', d: '2026-11-03', h: '07:30', v: 5 },
    { p: 'Otto Cuatro', d: '2026-11-03', h: '07:40', v: 8 }, { p: 'Oriana Cinco', d: '2026-11-03', h: '07:50', v: 6 },
    { p: 'Orlando Seis', d: '2026-11-03', h: '08:00', v: 4 }].map(p308Test);
}
const P308_CHICOS = [
  { que: 'Alma sola (cargo y área de una persona)', n: 1, suma: 9 },
  { que: 'Legal (área de dos)', n: 2, suma: 10 },
  { que: 'Operaciones × Técnico (tres)', n: 3, suma: 18 }];
function p308MedirCuatro(sabotaje) {
  const tests = p308Cuatro();
  const r = p308Pedir(tests, { sabotaje: sabotaje });
  if (r.faltan) return { faltan: r.faltan };
  const m = p308Medir([r], tests);
  return { r: r, forma: p308Forma(r.totalesHseq), despejable: m.despejable, sinTraza: m.sinTraza, conj: m.conj,
           restas: p308Restas([r], P308_CHICOS) };
}

PRUEBAS.caso('🔴 P308 · las cuatro situaciones: ningún grupo de menos de 5 se lee ni se despeja, ni su color', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = p308MedirCuatro();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó sobre el `.gs` real');
  if (m.faltan) return;
  PRUEBAS.cierto(m.r.__sellado && m.r.__sellado.ok && m.r.__sellado.nuevas >= 1, 'guarda: el sellado cerró al menos una unidad · ' + JSON.stringify(m.r.__sellado));
  PRUEBAS.alMenos(m.conj.length, 3, 'guarda: hay totales publicados que medir · ' + m.conj.map(c => c.k).join(', '));
  PRUEBAS.igual(m.conj.filter(c => c.filas.length !== c.n).map(c => c.k), [], 'guarda: cada total trae la traza de todos sus tests');
  PRUEBAS.igual(m.sinTraza, [], '🔴 no hay ningún total sin traza (lo que no se puede medir no se publica)');
  const hoyK = ((m.r.totalesHseq.periodos || {}).hoy || {}).metricas || {};
  PRUEBAS.cierto(!!hoyK.kss && hoyK.kss.n === 7, 'guarda: hoy cerró una unidad de 5 personas (7 tests) · ' + JSON.stringify(hoyK.kss && { n: hoyK.kss.n }));
  PRUEBAS.igual(m.forma, [], '🔴 el payload no trae grupos, etiquetas de área o cargo, ni colores');
  PRUEBAS.igual(m.despejable, [], '🔴 ningún átomo de 1 a 4 personas: nada se despeja cruzando, restando ni comparando');
  PRUEBAS.igual(m.restas, [], '🔴 la resta del plan («el día por su conteo menos el área grande por el suyo») no da a nadie');
});

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de las cuatro situaciones: tapar la pantalla, mandar los dos totales, dejar el color', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const tapa = p308MedirCuatro('tapaPantalla');
  PRUEBAS.igual(tapa.faltan || [], [], 'guarda: el sabotaje «tapa la pantalla» se aplicó');
  if (!tapa.faltan) {
    PRUEBAS.alMenos(tapa.forma.length, 1, '⚠️ discriminador 1 · un total por área que el cliente no pinta se ve en el payload');
    PRUEBAS.alMenos(tapa.restas.length, 1, '⚠️ discriminador 1 · y da el valor de un grupo chico · ' + tapa.restas.join(' / '));
  }
  const dos = p308MedirCuatro('dosTotales');
  PRUEBAS.igual(dos.faltan || [], [], 'guarda: el sabotaje «los dos totales» se aplicó');
  if (!dos.faltan) {
    PRUEBAS.alMenos(dos.despejable.length, 1, '⚠️ discriminador 2 · el día (7) y Operaciones (6), cada uno sobre el piso: se despeja · ' + dos.despejable.join(' / '));
    PRUEBAS.cierto(dos.restas.some(x => /Alma/.test(x)), '⚠️ discriminador 2 · y la resta da el valor de Alma · ' + dos.restas.join(' / '));
  }
  const color = p308MedirCuatro('colorChico');
  PRUEBAS.igual(color.faltan || [], [], 'guarda: el sabotaje «el color de un grupo chico» se aplicó');
  if (!color.faltan) PRUEBAS.alMenos(color.forma.length, 1, '⚠️ discriminador 3 · el color de un área de una persona se ve · ' + color.forma.join(', '));
  /* y el instrumento: un total crudo SIN traza (lo que metió el verificador) se marca */
  const sinT = [];
  p308Conjuntos({ periodos: { anio: { previo: { metricas: { kss: { n: 4, suma: 18 } } } } } }, 'x', [], sinT);
  PRUEBAS.igual(sinT.length, 1, '⚠️ discriminador del instrumento · un total sin traza no pasa en silencio');
});

/* ── Los períodos (a)–(d) ──────────────────────────────────────────────────────────────────────── */
/* Unidad 1: Oscar, Olga, Omar (27/10) + Otto, Oriana (29/10). Lo que sigue —Orlando (30/10), Mario y
   Marta el DOMINGO 1/11 (los días del borde de la semana contra el mes), Lara y Leo (2/11)— cierra la
   unidad 2 el lunes. Alma (3/11) espera. */
function p308Periodos() {
  return [
    { p: 'Oscar Uno', d: '2026-10-27', h: '08:00', v: 3 }, { p: 'Olga Dos', d: '2026-10-27', h: '08:10', v: 5 },
    { p: 'Omar Tres', d: '2026-10-27', h: '08:20', v: 4 }, { p: 'Otto Cuatro', d: '2026-10-29', h: '08:00', v: 6 },
    { p: 'Oriana Cinco', d: '2026-10-29', h: '08:10', v: 2 }, { p: 'Orlando Seis', d: '2026-10-30', h: '08:00', v: 7 },
    { p: 'Mario Mes', d: '2026-11-01', h: '08:00', v: 8 }, { p: 'Marta Mes', d: '2026-11-01', h: '08:10', v: 9 },
    { p: 'Lara Legal', d: '2026-11-02', h: '08:00', v: 4 }, { p: 'Leo Legal', d: '2026-11-02', h: '08:10', v: 6 },
    { p: 'Alma Única', d: '2026-11-03', h: '08:00', v: 5 }].map(p308Test);
}
function p308MedirPeriodos(sabotaje) {
  const base = p308Periodos();
  /* (a) dos pedidos cuyos rangos difieren en un día */
  const wa = p308Mundo(base, { sabotaje: sabotaje });
  if (wa.faltan) return { faltan: wa.faltan };
  const a1 = wa.sellarYPedir(null, { opDesde: '2026-10-27', opHasta: '2026-11-02', opDias: 30 });
  const a2 = wa.sellarYPedir(null, { opDesde: '2026-10-28', opHasta: '2026-11-02', opDias: 30 });
  /* (c) una semana con el DOMINGO de 1 medido, contra su serie diaria: la del 2 al 8 de noviembre, mirada el
     mismo domingo a la noche (la serie viaja con el período en curso). Nora mide sola el domingo. */
  const conDomingo = base.concat([
    { p: 'Mario Mes', d: '2026-11-06', h: '08:00', v: 3 }, { p: 'Marta Mes', d: '2026-11-06', h: '08:10', v: 4 },
    { p: 'Lara Legal', d: '2026-11-06', h: '08:20', v: 5 }, { p: 'Nora Nueva', d: '2026-11-08', h: '08:00', v: 9 }].map(p308Test));
  const c = p308Pedir(conDomingo, { sabotaje: sabotaje, ahora: '2026-11-08T20:00:00-04:00' });
  /* (d) la misma semana —la del 26/10 al 1/11— pedida antes y después de que llegue un test atrasado de ese
     domingo: Nora, con fecha 1/11, aparece al final de la hoja. */
  const wd = p308Mundo(base, { sabotaje: sabotaje });
  const d1 = wd.sellarYPedir();
  const tarde = p308Test({ p: 'Nora Nueva', d: '2026-11-01', h: '09:00', v: 7 });
  wd.agregar(tarde);
  const d2 = wd.sellarYPedir('2026-11-03T16:00:00-04:00');
  const conTarde = base.concat([tarde]);
  return {
    a: p308Medir([a1, a2], base).despejable,
    aIgual: JSON.stringify(a1.totalesHseq) === JSON.stringify(a2.totalesHseq),
    b: p308Medir([a1], base).despejable,
    c: p308Medir([c], conDomingo).despejable,
    d: p308Medir([d1, d2], conTarde).despejable,
    dMovidos: p308Movidos(d1, d2),
    a1: a1, sinTraza: [a1, c, d2].map(r => p308Medir([r], conTarde).sinTraza).reduce((s, x) => s.concat(x), [])
  };
}

PRUEBAS.caso('🔴 P308 · los períodos (a)–(d): ninguna resta entre lo que se puede pedir da de 1 a 4 personas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = p308MedirPeriodos();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  const P = (m.a1.totalesHseq || {}).periodos || {};
  PRUEBAS.cierto(!!(P.semana && P.semana.previo && P.semana.previo.metricas.kss), 'guarda: la semana del 26/10 tiene total');
  PRUEBAS.cierto(!!(P.mes && P.mes.previo && P.mes.previo.metricas.kss), 'guarda: octubre tiene total');
  PRUEBAS.cierto(!!(P.mes && P.mes.metricas.kss), 'guarda: noviembre tiene total');
  PRUEBAS.igual(P.semana.desde + '…' + P.semana.hasta, '2026-11-02…2026-11-08', 'la semana es de lunes a domingo, del calendario de Caracas');
  PRUEBAS.igual(m.sinTraza, [], '🔴 ningún total sin traza');
  PRUEBAS.cierto(m.aIgual, '🔴 (a) dos pedidos cuyos rangos difieren en un día devuelven LOS MISMOS totales: el servidor no usa el rango del cliente');
  PRUEBAS.igual(m.a, [], '🔴 (a) nada se despeja entre esos dos pedidos');
  PRUEBAS.igual(m.b, [], '🔴 (b) la semana que corta el mes: Mario y Marta (el domingo del borde) no se despejan');
  PRUEBAS.igual(m.c, [], '🔴 (c) la semana contra su serie por día: Nora (sola el domingo) no se despeja');
  PRUEBAS.igual(m.d, [], '🔴 (d) la misma semana antes y después de un test atrasado: nada se despeja');
  PRUEBAS.igual(m.dMovidos, [], '🔴 (d) y ningún total ya publicado cambia sus números');
  const nov2 = ((P.semana.metricas.kss || {}).serie || []).find(x => x.k === '2026-11-02');
  PRUEBAS.cierto(!!nov2 && nov2.n === 5, 'lo medido el domingo del borde cuenta el lunes, con su unidad · ' + JSON.stringify(nov2 ? { k: nov2.k, n: nov2.n } : null));
});

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de los períodos: rango pedido, sin unidades, día oculto, sin sellar', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r1 = p308MedirPeriodos('rangoPedido');
  PRUEBAS.igual(r1.faltan || [], [], 'guarda: el sabotaje «rango pedido» se aplicó');
  if (!r1.faltan) PRUEBAS.alMenos(r1.a.length, 1, '⚠️ discriminador 1 · con el rango del cliente, (a) despeja · ' + r1.a.join(' / '));
  const r2 = p308MedirPeriodos('cadaUnoSuPiso');
  PRUEBAS.igual(r2.faltan || [], [], 'guarda: el sabotaje «sin unidades» se aplicó');
  if (!r2.faltan) PRUEBAS.alMenos(r2.b.length, 1, '⚠️ discriminador 2 · sin unidades, (b) despeja · ' + r2.b.join(' / '));
  const r3 = p308MedirPeriodos('diaOculto');
  PRUEBAS.igual(r3.faltan || [], [], 'guarda: el sabotaje «día oculto en la serie» se aplicó');
  if (!r3.faltan) PRUEBAS.alMenos(r3.c.length, 1, '⚠️ discriminador 3 · con los días chicos ocultos en la serie y el total a la vista, (c) despeja · ' + r3.c.join(' / '));
  const r4 = p308MedirPeriodos('sinSellar');
  PRUEBAS.igual(r4.faltan || [], [], 'guarda: el sabotaje «sin sellar» se aplicó');
  if (!r4.faltan) PRUEBAS.alMenos(r4.d.length + r4.dMovidos.length, 1, '⚠️ discriminador 4 · rearmando en cada pedido, el test atrasado mueve la semana · ' + r4.d.concat(r4.dMovidos).join(' / '));
});

/* ── Dos momentos con cambios por DETRÁS de las filas (lo que rompió la 1.ª y la 2.ª versión) ───── */
/* Entre el primer pedido y el segundo pasa algo que no es un test nuevo:
   · `altaNueva`: Pedro midió sin estar en la nómina (no completaba el piso) y entra a la nómina;
   · `borrado`: alguien borra un duplicado de la hoja de tests;
   · `confiabilidad`: aparece una fila que marca un test viejo poco confiable;
   · `anonN`: la empresa sube el piso;
   · `renombre`: la celda de `Accesos` pasa de «Helitec Vieja, Helitec» a «Helitec» (el canónico cambia), y a
     la vez Pedro entra a la nómina —sin un cambio de composición, re-sellar daría lo mismo y no se vería nada—;
   · `variante`: la celda suma «Helitec C.A.», el nombre que tenían escrito tres tests que no se sellaban;
   · `borradaSellada`: alguien borra la última fila de `Totales HSEQ`, y además el duplicado de Omar (otra vez:
     sin un cambio de composición, re-sellar daría la misma unidad).
   La misma semana, pedida antes y después, no puede cambiar por nadie. */
function p308BaseViejas() {
  return [
    { p: 'Oscar Uno', d: '2026-11-02', h: '07:00', v: 3 }, { p: 'Pedro Pendiente', d: '2026-11-02', h: '07:05', v: 9 },
    { p: 'Olga Dos', d: '2026-11-02', h: '07:10', v: 5 },
    { p: 'Omar Tres', d: '2026-11-02', h: '07:30', v: 4 }, { p: 'Otto Cuatro', d: '2026-11-02', h: '07:40', v: 6 },
    { p: 'Oriana Cinco', d: '2026-11-02', h: '07:50', v: 2 }, { p: 'Orlando Seis', d: '2026-11-02', h: '08:00', v: 7 },
    { p: 'Omar Tres', d: '2026-11-02', h: '08:05', v: 4 },           // el duplicado que alguien borra después
    { p: 'Alma Única', d: '2026-11-03', h: '07:00', v: 8 }, { p: 'Lara Legal', d: '2026-11-03', h: '07:10', v: 4 },
    { p: 'Leo Legal', d: '2026-11-03', h: '07:20', v: 6 }, { p: 'Mario Mes', d: '2026-11-03', h: '07:30', v: 5 },
    { p: 'Marta Mes', d: '2026-11-03', h: '07:40', v: 3 }, { p: 'Nora Nueva', d: '2026-11-03', h: '07:50', v: 6 },
    { p: 'Oscar Uno', d: '2026-11-03', h: '08:00', v: 2, emp: 'Helitec C.A.' }, { p: 'Olga Dos', d: '2026-11-03', h: '08:10', v: 3, emp: 'Helitec C.A.' },
    { p: 'Omar Tres', d: '2026-11-03', h: '08:20', v: 5, emp: 'Helitec C.A.' }].map(p308Test);
}
function p308Viejas(cambio, sabotaje) {
  const base = p308BaseViejas();
  const w = p308Mundo(base, { sabotaje: sabotaje, empresas: cambio === 'renombre' ? 'Helitec Vieja, Helitec' : 'Helitec' });
  if (w.faltan) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  if (cambio === 'altaNueva') w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
  if (cambio === 'borrado') w.borrarFilaDeId(base[7].id);
  if (cambio === 'confiabilidad') w.hoja('Confiabilidad').appendRow(['2026-11-02', 'conf_x', 'kss', 'Oriana Cinco', 'Helitec', 'Operaciones', 1, 'false', '', '', '']);
  if (cambio === 'anonN') w.hoja('Config Empresa').appendRow(['Helitec', 'anonN', '8']);
  if (cambio === 'renombre') { w.hoja('Accesos').getRange(2, 4).setValue('Helitec'); w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente')); }
  if (cambio === 'variante') w.hoja('Accesos').getRange(2, 4).setValue('Helitec, Helitec C.A.');
  if (cambio === 'borradaSellada') { const h = w.hoja('Totales HSEQ'); h.deleteRow(h.getLastRow()); w.borrarFilaDeId(base[7].id); }
  const r2 = w.sellarYPedir('2026-11-03T16:00:00-04:00');
  const m = p308Medir([r1, r2], base);
  return { r1: r1, r2: r2, despejable: m.despejable, sinTraza: m.sinTraza, movidos: p308Movidos(r1, r2), falta: p308Falta(r1, r2) };
}
const P308_CAMBIOS = ['altaNueva', 'borrado', 'confiabilidad', 'anonN', 'renombre', 'variante', 'borradaSellada'];

PRUEBAS.caso('🔴 P308 · dos momentos con cambios por detrás de las filas: ninguna semana publicada se mueve por nadie', () => {
  /* R19 · lo garantiza que `unidadesSelladasHseq_` lee lo que `sellarTotalesHseq_` escribió una sola vez, por
     la clave estable de la cuenta (`claveCuentaHseq_`, el `Usuario` de `Accesos`), que un test con su huella
     en la hoja no se vuelve a sellar, que un test viejo no se sella nunca (`hseq_hasta`), y que una cuenta cuya
     hoja no tiene la firma que se confirmó no se sella (`hseq_firmas`). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  P308_CAMBIOS.forEach(cambio => {
    const m = p308Viejas(cambio);
    PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó (' + cambio + ')');
    if (m.faltan) return;
    const k1 = ((m.r1.totalesHseq.periodos.semana || {}).metricas || {}).kss;
    PRUEBAS.cierto(!!k1 && k1.n >= 10, 'guarda: la semana tiene dos unidades antes del cambio (' + cambio + ') · ' + JSON.stringify(k1 && { n: k1.n }));
    PRUEBAS.igual(m.sinTraza, [], '🔴 ningún total sin traza (' + cambio + ')');
    if (cambio !== 'borradaSellada') PRUEBAS.igual(m.movidos, [], '🔴 ' + cambio + ' · ningún total ya publicado cambia sus números');
    PRUEBAS.igual(m.despejable, [], '🔴 ' + cambio + ' · nada se despeja entre el antes y el después');
    if (cambio !== 'borradaSellada') PRUEBAS.igual(m.falta, [], '🔴 ' + cambio + ' · la semana sigue teniendo todo lo que ya había publicado');
  });
  /* la fila sellada borrada: no se re-sella nada, el sellado lo dice y el panel lo recibe */
  const b = p308Viejas('borradaSellada');
  if (!b.faltan) {
    PRUEBAS.igual(b.r2.__sellado.trabadas, ['helitec'], '🔴 con una fila sellada borrada esa cuenta no se sella, y el resultado lo dice · ' + JSON.stringify(b.r2.__sellado));
    PRUEBAS.igual((b.r2.totalesHseq.detenido || {}).causa, 'hoja_tocada', '🔴 y el panel lo recibe: no se traba en silencio');
  }
});

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de los cambios por detrás: sin sellar, clave por nombre, sin guarda, confiabilidad al pedir', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* «sin sellar» cuenta por cédula, como el diseño real: lo único que cambia es que rearma en cada pedido. Y
     ANTES del cambio no despeja nada (si lo hiciera, estaría en rojo por otra causa). */
  /* CONTROL: cada sabotaje, SIN ningún cambio en el medio, no despeja nada. Si lo hiciera, su rojo de abajo
     vendría de otra causa (la 1.ª versión de este caso contaba por nombre y estaba en rojo de entrada). */
  ['sinSellar', 'claveNombre', 'sinGuarda', 'confRelee'].forEach(s => {
    const c = p308Viejas('ninguno', s);
    PRUEBAS.igual(c.faltan || [], [], 'guarda: el sabotaje «' + s + '» se aplicó (control)');
    if (!c.faltan) PRUEBAS.igual(c.despejable.concat(c.movidos, c.falta), [], 'control · sin cambios, «' + s + '» no despeja, no mueve ni pierde nada');
  });
  ['altaNueva', 'borrado', 'anonN'].forEach(cambio => {
    const m = p308Viejas(cambio, 'sinSellar');
    PRUEBAS.igual(m.faltan || [], [], 'guarda: el sabotaje «sin sellar» se aplicó (' + cambio + ')');
    if (m.faltan) return;
    PRUEBAS.alMenos(m.movidos.length + m.despejable.length, 1,
      '⚠️ discriminador · sin sellar, «' + cambio + '» mueve un total publicado o despeja · ' + m.movidos.concat(m.despejable).slice(0, 3).join(' / '));
  });
  const ren = p308Viejas('renombre', 'claveNombre');
  PRUEBAS.igual(ren.faltan || [], [], 'guarda: el sabotaje «clave por nombre» se aplicó');
  if (!ren.faltan) PRUEBAS.alMenos(ren.falta.length, 1,
    '⚠️ discriminador · con la clave por nombre, después del renombre la semana pierde lo que ya había publicado (' + ren.falta.length + ' tests)');
  /* Sin la firma, una fila sellada borrada ya no despeja (sus tests quedan viejos por el tope guardado, y eso lo
     discrimina «sin tope guardado»): lo que la firma garantiza es que se DIGA. */
  const bor = p308Viejas('borradaSellada', 'sinGuarda');
  PRUEBAS.igual(bor.faltan || [], [], 'guarda: el sabotaje «sin guarda» se aplicó');
  if (!bor.faltan) PRUEBAS.igual(!!bor.r2.totalesHseq.detenido, false,
    '⚠️ discriminador · sin la firma, la fila sellada borrada pasa en silencio (el panel no dice «detenido»)');
  const cf = p308Viejas('confiabilidad', 'confRelee');
  PRUEBAS.igual(cf.faltan || [], [], 'guarda: el sabotaje «confiabilidad al pedir» se aplicó');
  if (!cf.faltan) PRUEBAS.alMenos(cf.movidos.length, 1,
    '⚠️ discriminador · leyendo `Confiabilidad` al pedir, la fila nueva mueve los «poco confiables» de una semana publicada · ' + cf.movidos.join(' / '));
});

/* ── Lo que rompieron la 3.ª y la 4.ª vuelta: la clave que cambia, la fila reescrita, la hoja tocada ────────
   La 2.ª versión guardaba sólo un cursor de tiempo por cuenta: cualquier cambio de CLAVE volvía a sellar desde
   cero. La 3.ª agregó las huellas, pero sus guardas contaban cantidades (filas, huellas ausentes), y la 4.ª vuelta
   las esquivó: vaciar una celda de «Huellas», o cortar filas de tests y volver a pegarlas en otra corrida,
   despejaba a una persona sin ningún aviso. Ahora:
   · un test VIEJO —instante ≤ el último sellado de su empresa y su métrica (`hseq_hasta`, sólo sube)— nunca se
     sella: va a «excluidos»;
   · la hoja se comprueba por FIRMA DE CONTENIDO, cuenta por cuenta (`hseq_firmas`): una cuenta tocada no se sella
     y su panel lo dice; las demás siguen;
   · una clave con filas de OTRA empresa no se lee ni se sella (`causa: "cuenta"`).
   R19 · lo garantizan `sellarTotalesHseq_` (los viejos, la firma, las ajenas), `cuentasHseq_` (la clave),
   `unidadesSelladasHseq_` (la lectura de una clave ajena) y `hseqReclave_` (sólo filas de la empresa destino).
   · `usuarioCambiado`: el `Usuario` de la cuenta cambia y el panel entra con el nuevo; Pedro entra a la nómina
     (sin un cambio de composición, re-sellar daría las mismas unidades). Después, `hseqReclave_`.
   · `usuarioReusado`: además, OTRA empresa (Heli Cargo) recibe el usuario viejo: su panel no ve lo de Helitec.
   · `otraCuenta`: otra fila, no de administrador, con el mismo primer nombre: ambigua, no se sella y se dice.
   · `filaAdmin`: una fila de administrador con ese primer nombre: no cambia nada.
   · `reescrita`: alguien corre un minuto la hora de un test ya sellado: queda viejo y se excluye, sin detener.
   · `cortarYPegar`: alguien corta las seis filas de la primera unidad (una corrida) y las vuelve a pegar un
     minuto antes (otra corrida): las seis quedan viejas y se excluyen.
   · `huellasVaciadas`: alguien vacía la celda «Huellas» de la primera unidad (y Pedro entra a la nómina): la
     cuenta se detiene; reconciliar la destraba y esos tests quedan viejos.
   · `filaBorrada`: alguien borra la última fila sellada (y el duplicado de Omar): se detiene; reconciliar la
     destraba y los tests de esa fila quedan viejos (el tope guardado no baja).
   · `multimetrica`: dos tests de estrés esperan su grupo mientras KSS sella, y se borra un duplicado: nadie se
     detiene, y cuando miden tres más, el grupo de estrés los lleva a los cinco.
   · `filaAgregada`: alguien agrega a mano una fila a `Totales HSEQ`: la cuenta se detiene y el panel no muestra
     ningún total (antes la fila entraba al total hasta que alguien lo revisara).
   · `propiedadPerdida`: se pierde `hseq_firmas` con la hoja intacta: se detiene y reconciliar lo destraba.
   · `murioAntesDeConfirmar`: la corrida anterior escribió y murió antes de confirmar: la siguiente lo confirma. */
function p308Claves(cambio, sabotaje) {
  const base = p308BaseViejas();
  const extra = [];
  if (cambio === 'multimetrica') extra.push(
    p308Test({ p: 'Oscar Uno', d: '2026-11-02', h: '06:00', v: 2, m: 'estres' }),
    p308Test({ p: 'Olga Dos', d: '2026-11-02', h: '06:10', v: 3, m: 'estres' }));
  const w = p308Mundo(base.concat(extra), { sabotaje: sabotaje });
  if (w.faltan) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  let usuario = 'helitec', clave = null, r3 = null, remedio = null, paso = null, otra = null;
  const nuevos = [];
  if (cambio === 'usuarioCambiado' || cambio === 'usuarioReusado') {
    w.hoja('Accesos').getRange(2, 1).setValue('helitec2'); usuario = 'helitec2';
    w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
  }
  if (cambio === 'usuarioReusado') w.hoja('Accesos').appendRow(['Helitec', 'sup-hc', 'empresa', 'Heli Cargo', 'med-hc', 'dir-hc', 'hseq-hc']);
  if (cambio === 'otraCuenta') w.hoja('Accesos').appendRow(['helitec_b', 'sup-b', 'empresa', 'Helitec', 'med-b', 'dir-b', 'hseq-b']);
  if (cambio === 'filaAdmin') w.hoja('Accesos').appendRow(['rafa', 'adm-b', 'admin', 'Helitec', '', '', '']);
  /* con un test nuevo que completaría un grupo con el reescrito, y con Pedro en la nómina al cortar: sin un cambio
     así, volver a sellar armaría la misma unidad y no se vería nada */
  if (cambio === 'reescrita') {
    w.reescribir(base[2].id, '2026-11-02', '07:11');
    const x = p308Test({ p: 'Lara Legal', d: '2026-11-03', h: '12:00', v: 7 }); nuevos.push(x); w.agregar(x);
  }
  if (cambio === 'cortarYPegar') {
    base.slice(0, 6).forEach(x => w.borrarFilaDeId(x.id));
    w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
  }
  if (cambio === 'huellasVaciadas') {
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) if (String(v[i][3]) === '1') { h.getRange(i + 1, 14).setValue(''); break; }
    w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
  }
  if (cambio === 'filaBorrada') { const h = w.hoja('Totales HSEQ'); h.deleteRow(h.getLastRow()); w.borrarFilaDeId(base[7].id); }
  if (cambio === 'multimetrica') w.borrarFilaDeId(base[7].id);
  /* una fila con la forma de una unidad de verdad (5 personas, piso 5): sólo la firma la delata */
  if (cambio === 'filaAgregada') w.hoja('Totales HSEQ').appendRow(['helitec', 'Helitec', 'kss', '99', '2026-11-03', 5, 25, 0, 0, 5, 5,
    '2026-11-03T12:00:00.000Z', '2026-11-03T19:00:00.000Z', 'abcdabcdabcdabcd']);
  if (cambio === 'propiedadPerdida') w.props().deleteProperty('hseq_firmas');
  /* alguien corre una hora la hora de los 11 tests ya sellados (una edición masiva, o un script) */
  if (cambio === 'horasCorridas') base.slice(0, 11).forEach(x => {
    const [hh, mm] = x.h.split(':').map(Number);
    w.reescribir(x.id, x.d, String(hh + 1).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
  });
  /* el `Usuario` cambia, Pedro entra a la nómina, y alguien borra las filas de la clave vieja (la «limpieza» obvia) */
  if (cambio === 'usuarioYBorradas') {
    w.hoja('Accesos').getRange(2, 1).setValue('helitec2'); usuario = 'helitec2';
    w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente'));
    const h = w.hoja('Totales HSEQ'), v = h.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === 'helitec') h.deleteRow(i + 1);
  }
  /* una edición de «Suma» de una unidad vieja justo mientras corre el sellado (al hacer `flush`) */
  if (cambio === 'edicionDurante') {
    ['Alma Única', 'Lara Legal'].forEach((p, i) => { const x = p308Test({ p: p, d: '2026-11-03', h: '12:1' + i, v: 6 }); nuevos.push(x); w.agregar(x); });
    const flushReal = w.env.SpreadsheetApp.flush; let una = true;
    w.env.SpreadsheetApp.flush = function () {
      if (una) { una = false; const h = w.hoja('Totales HSEQ'); h.getRange(2, 7).setValue(Number(h.getRange(2, 7).getValue()) - 11); }
      return flushReal ? flushReal.apply(this, arguments) : undefined;
    };
  }
  if (cambio === 'zonaCambiada') w.env.SpreadsheetApp.openById('maestro')._zona = 'America/Bogota';
  /* 6.ª vuelta · alguien corre UN DÍA (o cinco) las fechas de los 11 tests sellados: los del 3/11 quedan en el
     futuro, todavía sin asentar al reconciliar (o fuera de la ventana del parser, con instante 0) */
  const masDias = (d, n) => { const x = new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5); return x.toISOString().slice(0, 10); };
  if (cambio === 'futuroYReconciliar') base.slice(0, 11).forEach(x => w.reescribir(x.id, masDias(x.d, 1), x.h));
  /* (y Pedro entra a la nómina: sin un cambio de composición, re-sellar daría las mismas unidades y no se vería) */
  if (cambio === 'futuroLejano') { base.slice(0, 11).forEach(x => w.reescribir(x.id, masDias(x.d, 5), x.h)); w.hoja('Nómina').appendRow(p308FilaNomina('Pedro Pendiente')); }
  /* 6.ª vuelta · alguien escribe 2027 en el «Hasta» de la última unidad (con «sólo aviso» se puede) */
  if (cambio === 'hastaFuturo') { const h = w.hoja('Totales HSEQ'); h.getRange(h.getLastRow(), 12).setValue('2027-11-03T12:00:00.000Z'); }
  /* 6.ª vuelta · se borran 10 tests sellados en dos tandas de 5 (ninguna detiene), después el `Usuario` cambia y se traspasa */
  if (cambio === 'reclaveConAusentes') {
    base.slice(0, 5).forEach(x => w.borrarFilaDeId(x.id));
    w.sellarYPedir('2026-11-03T15:20:00-04:00');
    base.slice(5, 10).forEach(x => w.borrarFilaDeId(x.id));
    w.sellarYPedir('2026-11-03T15:40:00-04:00');
    w.hoja('Accesos').getRange(2, 1).setValue('helitec2'); usuario = 'helitec2';
  }
  if (cambio === 'murioAntesDeConfirmar') {
    const pr = w.props();
    pr.setProperty('hseq_firmas_pendientes', pr.getProperty('hseq_firmas')); pr.setProperty('hseq_firmas', '{}');
  }
  const r2 = w.sellarYPedir('2026-11-03T16:00:00-04:00', { usuario: usuario });
  if (cambio === 'usuarioReusado') otra = w.pedir({ usuario: 'Helitec' }, 'hseq-hc');
  if (cambio === 'cortarYPegar') {
    base.slice(0, 6).forEach(x => {
      const [hh, mm] = x.h.split(':').map(Number), menos = hh * 60 + mm - 1;
      const y = Object.assign({}, x, { h: String(Math.floor(menos / 60)).padStart(2, '0') + ':' + String(menos % 60).padStart(2, '0') });
      w.agregar(y);
    });
    paso = w.sellarYPedir('2026-11-03T16:15:00-04:00', { usuario: usuario });
  }
  if (cambio === 'multimetrica') {
    ['Omar Tres', 'Otto Cuatro', 'Oriana Cinco'].forEach((p, i) => {
      const x = p308Test({ p: p, d: '2026-11-03', h: '16:0' + i, v: 4, m: 'estres' }); nuevos.push(x); w.agregar(x);
    });
    paso = w.sellarYPedir('2026-11-03T16:30:00-04:00', { usuario: usuario });
  }
  if (cambio === 'usuarioCambiado' || cambio === 'usuarioReusado' || cambio === 'reclaveConAusentes') { w.api = w.cargar(); remedio = w.api.hseqReclave_('helitec', 'helitec2'); }
  if (cambio === 'futuroYReconciliar' || cambio === 'futuroLejano' || cambio === 'hastaFuturo') remedio = w.reconciliar('2026-11-03T16:15:00-04:00');
  /* después: llegan seis tests nuevos el 4/11 (para que un «Hasta» futuro se note), y se mira el 9/11 (para que las
     fechas corridas ya sean de hoy o de antes) */
  /* (dos tests nuevos el 4/11: con los tres que se escaparan al futuro, completarían un grupo) */
  if (cambio === 'futuroYReconciliar') ['Mario Mes', 'Marta Mes'].forEach((p, i) => {
    const x = p308Test({ p: p, d: '2026-11-04', h: '10:0' + i, v: 4 }); nuevos.push(x); w.agregar(x);
  });
  if (cambio === 'hastaFuturo') ['Alma Única', 'Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes', 'Nora Nueva'].forEach((p, i) => {
    const x = p308Test({ p: p, d: '2026-11-04', h: '09:0' + i, v: 5 }); nuevos.push(x); w.agregar(x);
  });
  /* después del traspaso, Heli Cargo carga cinco tests suyos de ANTES del último sellado de Helitec: no hereda su tope */
  let heredado = null;
  if (cambio === 'usuarioReusado') {
    ['Lara Legal', 'Leo Legal', 'Mario Mes', 'Marta Mes', 'Nora Nueva'].forEach((p, i) => {
      w.hoja('Nómina').appendRow(p308FilaNomina(p, 'Heli Cargo'));
      const x = p308Test({ p: p, d: '2026-11-02', h: '10:0' + i, v: 9, emp: 'Heli Cargo' }); nuevos.push(x); w.agregar(x);
    });
    w.sellarYPedir('2026-11-03T16:20:00-04:00', { usuario: usuario });
    heredado = w.pedir({ usuario: 'Helitec' }, 'hseq-hc');
  }
  if (cambio === 'horasCorridas') { paso = w.sellarYPedir('2026-11-03T16:10:00-04:00', { usuario: usuario }); remedio = w.reconciliar('2026-11-03T16:15:00-04:00'); }
  if (cambio === 'zonaCambiada') remedio = w.reconciliar('2026-11-03T16:15:00-04:00');
  if (cambio === 'huellasVaciadas' || cambio === 'filaBorrada' || cambio === 'propiedadPerdida') remedio = w.reconciliar('2026-11-03T16:15:00-04:00');
  const cuando3 = cambio === 'futuroLejano' ? '2026-11-09T12:00:00-04:00' : (cambio === 'futuroYReconciliar' || cambio === 'hastaFuturo') ? '2026-11-04T16:00:00-04:00' : '2026-11-03T16:45:00-04:00';
  if (remedio || cambio === 'edicionDurante') r3 = w.sellarYPedir(cuando3, { usuario: usuario });
  const todas = [r1, r2].concat(paso ? [paso] : [], r3 ? [r3] : [], otra && otra.totalesHseq && !otra.totalesHseq.error ? [otra] : []);
  const m = p308Medir(todas, base.concat(extra, nuevos));
  const fin = r3 || paso || r2;
  return { r1: r1, r2: r2, paso: paso, r3: r3, otra: otra, remedio: remedio, heredado: heredado, despejable: m.despejable, sinTraza: m.sinTraza,
           falta: ['filaBorrada', 'usuarioYBorradas', 'edicionDurante', 'futuroLejano', 'hastaFuturo', 'reclaveConAusentes'].indexOf(cambio) >= 0 ? [] : p308Falta(r1, fin),
           hoja: w.hoja('Totales HSEQ').getDataRange().getValues().slice(1) };
}
const P308_CLAVES = ['usuarioCambiado', 'usuarioReusado', 'otraCuenta', 'filaAdmin', 'reescrita', 'cortarYPegar',
                     'huellasVaciadas', 'filaBorrada', 'filaAgregada', 'multimetrica', 'propiedadPerdida', 'murioAntesDeConfirmar',
                     'horasCorridas', 'usuarioYBorradas', 'edicionDurante', 'zonaCambiada',
                     'futuroYReconciliar', 'futuroLejano', 'hastaFuturo', 'reclaveConAusentes'];

PRUEBAS.caso('🔴 P308 · la clave que cambia, la fila reescrita y la hoja tocada: nada se vuelve a sellar, y lo que se traba se dice', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = {};
  P308_CLAVES.forEach(cambio => {
    const m = r[cambio] = p308Claves(cambio);
    PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó (' + cambio + ')');
    if (m.faltan) return;
    const k1 = ((m.r1.totalesHseq.periodos.semana || {}).metricas || {}).kss;
    PRUEBAS.cierto(!!k1 && k1.n >= 10, 'guarda: la semana tiene dos unidades antes del cambio (' + cambio + ') · ' + JSON.stringify(k1 && { n: k1.n }));
    PRUEBAS.igual(m.sinTraza, [], '🔴 ningún total sin traza (' + cambio + ')');
    PRUEBAS.igual(m.despejable, [], '🔴 ' + cambio + ' · nada se despeja entre el antes, el durante y el después');
    if (['otraCuenta', 'filaAgregada'].indexOf(cambio) < 0) PRUEBAS.igual(m.falta, [], '🔴 ' + cambio + ' · al final, la semana sigue teniendo todo lo que ya había publicado');
  });
  const fa = r.filaAgregada;
  if (fa && !fa.faltan) {
    PRUEBAS.igual([(fa.r2.totalesHseq || {}).causa, !!fa.r2.totalesHseq.periodos], ['hoja', false],
      '🔴 con una fila agregada a mano, el panel no muestra ningún total (la fila no entra) · ' + JSON.stringify(fa.r2.totalesHseq).slice(0, 160));
    PRUEBAS.igual((fa.r2.totalesHseq.detenido || {}).causa, 'hoja_tocada', 'y dice que la cuenta está detenida');
  }
  const u = r.usuarioCambiado;
  if (u && !u.faltan) {
    PRUEBAS.cierto(!!(u.remedio && u.remedio.ok && u.remedio.movidas >= 2), '`hseqReclave_` pasa las unidades de la clave vieja · ' + JSON.stringify(u.remedio));
    PRUEBAS.igual(u.r2.__sellado.huerfanas, ['helitec'], 'y antes del traspaso, el sellado informa la clave huérfana');
  }
  const ru = r.usuarioReusado;
  if (ru && !ru.faltan) {
    PRUEBAS.igual((ru.otra && ru.otra.totalesHseq || {}).causa, 'cuenta', '🔴 la empresa que recibe un usuario viejo no ve las unidades de la otra: su panel dice que hay que revisar la cuenta');
    PRUEBAS.igual(ru.r2.__sellado.ajenas, ['helitec'], 'y el sellado informa la clave ajena, sin sellar con ella');
    PRUEBAS.cierto(!!(ru.remedio && ru.remedio.ok && ru.remedio.movidas >= 2), 'y el traspaso mueve lo de Helitec a su clave nueva · ' + JSON.stringify(ru.remedio));
  }
  const o = r.otraCuenta;
  if (o && !o.faltan) {
    PRUEBAS.igual((o.r2.totalesHseq || {}).causa, 'cuenta', '🔴 con dos cuentas para la misma empresa, el panel dice que hay que revisar la cuenta (no «todavía no hay un grupo»)');
    PRUEBAS.igual(o.r2.__sellado.ambiguas, ['Helitec'], 'y el sellado informa la empresa ambigua, sin sellarla');
  }
  const a = r.filaAdmin;
  if (a && !a.faltan) PRUEBAS.cierto(!a.r2.totalesHseq.error, 'una fila de administrador no vuelve ambigua a la empresa');
  const e = r.reescrita;
  if (e && !e.faltan) {
    PRUEBAS.igual([e.r2.__sellado.excluidos, e.r2.__sellado.nuevas, !!e.r2.totalesHseq.detenido], [1, 0, false],
      '🔴 el test reescrito queda viejo: se excluye, no se re-sella, y nadie se detiene · ' + JSON.stringify(e.r2.__sellado));
  }
  const c = r.cortarYPegar;
  if (c && !c.faltan) PRUEBAS.igual([c.paso.__sellado.excluidos, c.paso.__sellado.nuevas], [6, 0],
    '🔴 las seis filas cortadas y vueltas a pegar un minuto antes quedan viejas: se excluyen · ' + JSON.stringify(c.paso.__sellado));
  const hv = r.huellasVaciadas;
  if (hv && !hv.faltan) {
    PRUEBAS.igual((hv.r2.totalesHseq.detenido || {}).causa, 'hoja_tocada', '🔴 con una celda de «Huellas» vaciada, la cuenta se detiene y el panel lo recibe');
    PRUEBAS.cierto(!!(hv.remedio && hv.remedio.ok && hv.remedio.excluidos >= 5 && hv.remedio.nuevas === 0), 'reconciliar la destraba, y los tests sin huella quedan viejos · ' + JSON.stringify(hv.remedio));
  }
  const fb = r.filaBorrada;
  if (fb && !fb.faltan) {
    PRUEBAS.igual((fb.r2.totalesHseq.detenido || {}).causa, 'hoja_tocada', '🔴 con la última fila sellada borrada, la cuenta se detiene');
    PRUEBAS.cierto(!!(fb.remedio && fb.remedio.ok && fb.remedio.nuevas === 0 && fb.remedio.excluidos >= 4), 'y al reconciliar, los tests de esa fila quedan viejos: el tope guardado no bajó · ' + JSON.stringify(fb.remedio));
  }
  const mm = r.multimetrica;
  if (mm && !mm.faltan) {
    PRUEBAS.igual([mm.r2.__sellado.trabadas, mm.r2.__sellado.excluidos], [[], 0], '🔴 un duplicado borrado no detiene a nadie ni excluye lo que espera en otra métrica');
    const es = (((mm.paso.totalesHseq.periodos || {}).todo || {}).metricas || {}).estres;
    PRUEBAS.cierto(!!es && es.n === 5, '🔴 los dos tests de estrés que esperaban entran en su grupo cuando miden tres más · ' + JSON.stringify(es && { n: es.n }));
  }
  const p = r.propiedadPerdida;
  if (p && !p.faltan) {
    PRUEBAS.igual((p.r2.totalesHseq.detenido || {}).causa, 'hoja_tocada', '🔴 sin la firma confirmada, se detiene (no se traba en silencio) y el panel lo recibe');
    PRUEBAS.igual(p.r3 && p.r3.totalesHseq.detenido, undefined, 'y reconciliar lo destraba');
  }
  const d = r.murioAntesDeConfirmar;
  if (d && !d.faltan) PRUEBAS.cierto(!!d.r2.__sellado.ok && !d.r2.totalesHseq.detenido, 'una corrida que murió antes de confirmar no traba la siguiente · ' + JSON.stringify(d.r2.__sellado));
  const hc = r.horasCorridas;
  if (hc && !hc.faltan) {
    PRUEBAS.igual((hc.r2.totalesHseq.detenido || {}).causa, 'huellas_desaparecidas', '🔴 con la hora corrida en 11 tests sellados, la cuenta se detiene y el panel lo recibe · ' + JSON.stringify(hc.r2.__sellado));
    PRUEBAS.igual([hc.paso.__sellado.nuevas, (hc.paso.__sellado.trabadas || []).indexOf('helitec') >= 0], [0, true], 'y sigue detenida en la corrida siguiente, sin sellar nada');
    PRUEBAS.cierto(!!(hc.remedio && hc.remedio.ok && hc.remedio.nuevas === 0 && (hc.remedio.forzadas || []).indexOf('helitec') >= 0),
      'reconciliarla excluye todo lo que tenía sin sellar: ninguna hora corrida se vuelve a sellar · ' + JSON.stringify(hc.remedio));
  }
  const ub = r.usuarioYBorradas;
  if (ub && !ub.faltan) PRUEBAS.igual(ub.r2.__sellado.nuevas, 0, '🔴 con el `Usuario` nuevo y las filas viejas borradas, la clave nueva no vuelve a sellar nada (el tope por nombre de la empresa sobrevive) · ' + JSON.stringify(ub.r2.__sellado));
  const ed = r.edicionDurante;
  if (ed && !ed.faltan) {
    PRUEBAS.igual(ed.r2.__sellado.sinConfirmar, ['helitec'], '🔴 una edición mientras corre el sellado no queda confirmada');
    PRUEBAS.igual((ed.r3.totalesHseq || {}).causa, 'hoja', 'y la corrida siguiente detiene la cuenta: el panel no muestra el número editado');
  }
  const zc = r.zonaCambiada;
  if (zc && !zc.faltan) {
    PRUEBAS.igual([zc.r2.__sellado.ok, zc.r2.__sellado.causa], [false, 'zona_cambiada'], '🔴 con otra zona horaria en el libro no se sella nada');
    PRUEBAS.igual((zc.r2.totalesHseq.detenido || {}).causa, 'zona_cambiada', 'y el panel lo recibe');
    PRUEBAS.igual((zc.remedio || {}).causa, 'zona_cambiada', 'y reconciliar no lo acepta: la salida es volver a poner la zona');
  }
  const fr = r.futuroYReconciliar;
  if (fr && !fr.faltan) {
    PRUEBAS.cierto(!!(fr.remedio && fr.remedio.ok && (fr.remedio.forzadas || []).indexOf('helitec') >= 0), 'guarda: la fecha corrida detuvo la cuenta y se reconcilió forzando · ' + JSON.stringify(fr.remedio));
    PRUEBAS.igual(fr.r3.__sellado.nuevas, 0, '🔴 lo corrido al futuro tampoco se sella cuando le llega la fecha: el reconciliar forzado lo excluyó aunque no estuviera asentado');
  }
  const fl6 = r.futuroLejano;
  if (fl6 && !fl6.faltan) {
    PRUEBAS.igual(((fl6.remedio || {}).fechasFuturas || {}).helitec > 0 && (fl6.remedio.trabadas || []).indexOf('helitec') >= 0, true,
      '🔴 con fechas más allá de la ventana del parser, reconciliar no fuerza: deja la cuenta detenida y dice cuántas · ' + JSON.stringify(fl6.remedio));
    PRUEBAS.igual(fl6.r3.__sellado.nuevas, 0, 'y cuando les llega la fecha, la cuenta sigue detenida: no se sellan');
  }
  const hf6 = r.hastaFuturo;
  if (hf6 && !hf6.faltan) PRUEBAS.alMenos(hf6.r3.__sellado.nuevas, 1, '🔴 un «Hasta» editado al futuro y aceptado al reconciliar no deja a la cuenta sin sellar: los tests nuevos se sellan · ' + JSON.stringify(hf6.r3.__sellado));
  const rc = r.reclaveConAusentes;
  if (rc && !rc.faltan) PRUEBAS.igual(rc.r3.__sellado.trabadas, [], '🔴 el traspaso lleva la base de huellas ausentes: la clave nueva no se detiene sin causa · ' + JSON.stringify(rc.r3.__sellado));
  const he = r.usuarioReusado;
  if (he && !he.faltan) {
    const k = ((((he.heredado || {}).totalesHseq || {}).periodos || {}).todo || {}).metricas;
    PRUEBAS.cierto(!!(k && k.kss && k.kss.n === 5), '🔴 la empresa que recibe un `Usuario` ya traspasado no hereda su tope: sus tests de antes se sellan · ' + JSON.stringify(k && k.kss && { n: k.kss.n }));
  }
});

/* Una cuenta que NUNCA selló (sin firma guardada contra qué comparar) y una fila de un test agregada a mano: la
   rechaza la validación de filas (menos de 5 personas no la escribe ningún sellado). */
function p308FilaSinFirma(sabotaje) {
  const w = p308Mundo(p308Cuatro(), { sabotaje: sabotaje });
  if (w.faltan) return { faltan: w.faltan };
  w.api = w.cargar();
  w.hoja('Totales HSEQ') || w.env.SpreadsheetApp.openById('maestro').insertSheet('Totales HSEQ');
  const h = w.hoja('Totales HSEQ');
  if (!h.getLastRow()) h.appendRow(['Clave', 'Empresa', 'Métrica', 'Unidad', 'Día', 'Tests', 'Suma', 'Poco confiables',
    'Evaluados', 'Personas', 'Piso', 'Hasta', 'Sellada', 'Huellas']);
  h.appendRow(['helitec', 'Helitec', 'kss', '1', '2026-11-03', 1, 9, 0, 0, 1, 5, '2026-11-03T12:00:00.000Z', '2026-11-03T19:00:00.000Z', 'abcdabcdabcdabcd']);
  return { r: w.pedir() };
}

/* La empresa que se separa: los tests de «Helitec C.A.» se sellaron con Helitec (era una variante); después tiene
   su cuenta y su nómina. Lo que impide que la empresa nueva los vuelva a sellar son las huellas, y si alguien
   además BORRA las filas mixtas (`opc.borrar`, 5.ª vuelta), el tope guardado por cada nombre propio de la cuenta
   («helitec c a» se guardó mientras era variante de Helitec). `opc.reclave`: alguien pasa la clave vieja a la
   nueva, y no se mueve nada (las filas son de Helitec por su nombre principal). `opc.filaVieja`: la fila de
   `Accesos` con el usuario «helitec» pasa a ser de C.A. y Helitec estrena otra: el panel de C.A. no ve lo de
   Helitec. Las dos cuentas se miden juntas: los mismos tests en los totales de las dos despejarían a quien quede
   en la diferencia. */
function p308Holding(sabotaje, opc) {
  opc = opc || {};
  const ca = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco'];
  const base = [
    { p: 'Lara Legal', d: '2026-11-02', h: '07:00', v: 4 }, { p: 'Leo Legal', d: '2026-11-02', h: '07:10', v: 6 },
    { p: 'Mario Mes', d: '2026-11-02', h: '07:20', v: 5 }, { p: 'Marta Mes', d: '2026-11-02', h: '07:30', v: 3 }]
    .concat(ca.map((p, i) => ({ p: p, d: '2026-11-02', h: '08:0' + i, v: 2 + i, emp: 'Helitec C.A.' }))).map(p308Test);
  const w = p308Mundo(base, { sabotaje: sabotaje, empresas: 'Helitec, Helitec C.A.' });
  if (w.faltan) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  let usuarioCa = 'hca';
  if (opc.filaVieja) {
    w.hoja('Accesos').getRange(2, 4).setValue('Helitec C.A.'); usuarioCa = 'helitec';
    w.hoja('Accesos').appendRow(['helitec2', 'sup-h2', 'empresa', 'Helitec', 'med-h2', 'dir-h2', 'hseq-h2']);
  } else {
    /* `opc.sucia`: la celda de Helitec queda con «Helitec C.A.» (nadie la limpia), así que el nombre deja de ser propio */
    if (!opc.sucia) w.hoja('Accesos').getRange(2, 4).setValue('Helitec');
    w.hoja('Accesos').appendRow(['hca', 'sup-ca', 'empresa', 'Helitec C.A.', 'med-ca', 'dir-ca', 'hseq-ca']);
  }
  ca.forEach(p => w.hoja('Nómina').appendRow(p308FilaNomina(p, 'Helitec C.A.')));
  if (opc.borrar) { const h = w.hoja('Totales HSEQ'); for (let i = h.getLastRow(); i >= 2; i--) h.deleteRow(i); }
  let reclave = null;
  if (opc.reclave) { w.api = w.cargar(); reclave = w.api.hseqReclave_('helitec', 'hca'); }
  const r2 = w.sellarYPedir('2026-11-03T16:00:00-04:00');
  const nueva = w.pedir({ usuario: usuarioCa }, opc.filaVieja ? 'hseq-308' : 'hseq-ca');
  const todas = [r1, r2].concat(nueva.totalesHseq && !nueva.totalesHseq.error ? [nueva] : []);
  return { r1: r1, r2: r2, nueva: nueva, reclave: reclave, despejable: p308Medir(todas, base).despejable };
}

/* La empresa REASIGNADA a mano: alguien cambia, en la hoja de respuestas, la empresa de cinco tests (uno ya
   sellado con Helitec) a una empresa nueva, con su cuenta y su nómina. Ninguna fila sellada nombra a la empresa
   nueva, así que su tope es 0: lo único que impide volver a sellar el test ya sellado es su HUELLA, que no lleva
   la empresa. Es el discriminador de las huellas. */
function p308Reasignada(sabotaje) {
  const otros = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco'];
  const base = [
    { p: 'Lara Legal', d: '2026-11-02', h: '07:00', v: 4 }, { p: 'Leo Legal', d: '2026-11-02', h: '07:10', v: 6 },
    { p: 'Mario Mes', d: '2026-11-02', h: '07:20', v: 5 }, { p: 'Marta Mes', d: '2026-11-02', h: '07:30', v: 3 }]
    .concat(otros.map((p, i) => ({ p: p, d: '2026-11-02', h: '08:0' + i, v: 2 + i }))).map(p308Test);
  const w = p308Mundo(base, { sabotaje: sabotaje });
  if (w.faltan) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  w.hoja('Accesos').appendRow(['otra', 'sup-o', 'empresa', 'Otra SA', 'med-o', 'dir-o', 'hseq-o']);
  otros.forEach(p => w.hoja('Nómina').appendRow(p308FilaNomina(p, 'Otra SA')));
  const h = w.hoja('Respuestas de formulario 1'), v = h.getDataRange().getValues(), ids = base.slice(4).map(x => x.id);
  for (let i = 0; i < v.length; i++) if (ids.indexOf(v[i][P308_COL_ID]) >= 0) h.getRange(i + 1, 73).setValue('Otra SA');
  const r2 = w.sellarYPedir('2026-11-03T16:00:00-04:00');
  const nueva = w.pedir({ usuario: 'otra' }, 'hseq-o');
  const todas = [r1, r2].concat(nueva.totalesHseq && !nueva.totalesHseq.error ? [nueva] : []);
  return { r1: r1, r2: r2, nueva: nueva, despejable: p308Medir(todas, base).despejable };
}

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de la clave y las reescrituras: sin huellas, sin viejos, sin firma (al sellar y al leer), sin tope guardado, tope mezclado, sin ajenas, sin ambigüedad, el admin con clave', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* CONTROL: cada sabotaje, sin ningún cambio en el medio, no despeja ni pierde nada: su rojo de abajo viene del cambio. */
  ['sinHuellas', 'sinViejos', 'sinGuarda', 'sinFirmaAlLeer', 'sinValidarFilas', 'sinTopeGuardado', 'sinTopePorNombre', 'topeMezclado',
   'sinAjenas', 'sinAmbiguedad', 'adminDaClave', 'sinGuardaMasiva', 'confirmaLoReleido', 'sinZona', 'sinBorrarTopeViejo',
   'topeSoloPropios', 'hastaSinTope', 'forzadoConLimite', 'sinFechasFuturas', 'reclaveSinAusentes'].forEach(s => {
    const c = p308Claves('ninguno', s);
    PRUEBAS.igual(c.faltan || [], [], 'guarda: el sabotaje «' + s + '» se aplicó (control)');
    if (!c.faltan) PRUEBAS.igual(c.despejable.concat(c.falta), [], 'control · sin cambios, «' + s + '» no despeja ni pierde nada');
  });
  const hold = p308Holding();
  PRUEBAS.igual(hold.faltan || [], [], 'guarda: la empresa que se separa');
  if (!hold.faltan) PRUEBAS.igual(hold.despejable, [], '🔴 la empresa que se separa no vuelve a sellar lo que ya selló la otra');
  const hb = p308Holding(null, { borrar: true });
  if (!hb.faltan) {
    PRUEBAS.igual(hb.despejable, [], '🔴 tampoco si alguien además borra las filas mixtas: el tope por nombre de la empresa sobrevive');
    const hbs = p308Holding('sinTopePorNombre', { borrar: true });
    PRUEBAS.alMenos(hbs.despejable.length, 1, '⚠️ discriminador · sin el tope por nombre, la empresa nueva vuelve a sellar las filas borradas y despeja · ' + hbs.despejable.join(' / '));
  }
  const hs = p308Holding(null, { borrar: true, sucia: true });
  if (!hs.faltan) {
    PRUEBAS.igual(hs.despejable, [], '🔴 tampoco con la separación «sucia» (el nombre en las dos celdas): el tope se lee de todos los nombres');
    const hss = p308Holding('topeSoloPropios', { borrar: true, sucia: true });
    PRUEBAS.alMenos(hss.despejable.length, 1, '⚠️ discriminador · leyendo el tope sólo de los nombres propios, la separación sucia re-sella y despeja · ' + hss.despejable.join(' / '));
  }
  const hr = p308Holding(null, { reclave: true });
  if (!hr.faltan) PRUEBAS.igual((hr.reclave || {}).movidas, 0, '🔴 pasar la clave vieja a la empresa separada no mueve nada: las filas son de Helitec por su nombre principal');
  const hf = p308Holding(null, { filaVieja: true });
  if (!hf.faltan) PRUEBAS.igual((hf.nueva.totalesHseq || {}).causa, 'cuenta', '🔴 si la fila vieja de `Accesos` pasa a ser de la empresa separada, su panel no ve lo de Helitec');
  const re = p308Reasignada();
  PRUEBAS.igual(re.faltan || [], [], 'guarda: la empresa reasignada a mano');
  if (!re.faltan) {
    PRUEBAS.cierto(!!(re.r1.totalesHseq.periodos.todo.metricas.kss), 'guarda: antes del cambio, Helitec tiene un grupo sellado');
    PRUEBAS.igual(re.despejable, [], '🔴 un test ya sellado que alguien pasa a otra empresa no se vuelve a sellar allá');
    const sh = p308Reasignada('sinHuellas');
    PRUEBAS.alMenos(sh.despejable.length, 1, '⚠️ discriminador · sin huellas, la empresa nueva vuelve a sellar el test ya sellado y despeja · ' + sh.despejable.join(' / '));
  }
  [['reescrita', 'sinViejos'], ['cortarYPegar', 'sinViejos'], ['huellasVaciadas', 'sinViejos'], ['filaBorrada', 'sinTopeGuardado']].forEach(([cambio, s]) => {
    const x = p308Claves(cambio, s);
    if (!x.faltan) PRUEBAS.alMenos(x.despejable.length, 1, '⚠️ discriminador · «' + s + '» con «' + cambio + '»: se re-sella y despeja · ' + x.despejable.join(' / '));
  });
  const fl = p308Claves('filaAgregada', 'sinFirmaAlLeer');
  if (!fl.faltan) PRUEBAS.cierto(!!fl.r2.totalesHseq.periodos, '⚠️ discriminador · sin comparar la firma al leer, el panel muestra la hoja con la fila agregada a mano');
  const sf = p308FilaSinFirma();
  PRUEBAS.igual(sf.faltan || [], [], 'guarda: la cuenta sin firma');
  if (!sf.faltan) {
    PRUEBAS.igual((sf.r.totalesHseq || {}).causa, 'hoja', '🔴 una cuenta sin firma guardada igual rechaza una fila de un solo test');
    const sv = p308FilaSinFirma('sinValidarFilas');
    PRUEBAS.cierto(!!(sv.r && sv.r.totalesHseq && sv.r.totalesHseq.periodos), '⚠️ discriminador · sin validar las filas, el panel muestra un «total» de una persona');
  }
  const g = p308Claves('huellasVaciadas', 'sinGuarda');
  if (!g.faltan) PRUEBAS.igual(!!g.r2.totalesHseq.detenido, false, '⚠️ discriminador · sin la firma, la celda vaciada pasa en silencio');
  const mz = p308Claves('multimetrica', 'topeMezclado');
  if (!mz.faltan) {
    const es = (((mz.paso.totalesHseq.periodos || {}).todo || {}).metricas || {}).estres;
    PRUEBAS.cierto(!es || es.n !== 5, '⚠️ discriminador · mezclando métricas en el tope, los dos de estrés que esperaban quedan fuera · ' + JSON.stringify(es && { n: es.n }));
  }
  const aj = p308Claves('usuarioReusado', 'sinAjenas');
  if (!aj.faltan) PRUEBAS.cierto(!!(aj.otra && aj.otra.totalesHseq && aj.otra.totalesHseq.periodos && aj.otra.totalesHseq.periodos.todo.metricas.kss),
    '⚠️ discriminador · sin mirar las filas ajenas, la empresa que recibe el usuario viejo ve los totales de la otra');
  const gm = p308Claves('horasCorridas', 'sinGuardaMasiva');
  if (!gm.faltan) PRUEBAS.alMenos(gm.despejable.length, 1, '⚠️ discriminador · sin la guarda de huellas desaparecidas, la hora corrida se re-sella y despeja · ' + gm.despejable.join(' / '));
  const tn = p308Claves('usuarioYBorradas', 'sinTopePorNombre');
  if (!tn.faltan) PRUEBAS.alMenos(tn.despejable.length, 1, '⚠️ discriminador · sin el tope por nombre, la clave nueva vuelve a sellar desde cero y despeja · ' + tn.despejable.join(' / '));
  const cr = p308Claves('edicionDurante', 'confirmaLoReleido');
  if (!cr.faltan) PRUEBAS.cierto(!(cr.r3.totalesHseq || {}).causa, '⚠️ discriminador · confirmando lo releído sin comparar, la edición durante el sellado queda a la vista como sellada');
  const sz = p308Claves('zonaCambiada', 'sinZona');
  if (!sz.faltan) PRUEBAS.cierto(!!sz.r2.__sellado.ok, '⚠️ discriminador · sin la guarda de zona, sella con otra zona horaria');
  const bt = p308Claves('usuarioReusado', 'sinBorrarTopeViejo');
  if (!bt.faltan) {
    const k = ((((bt.heredado || {}).totalesHseq || {}).periodos || {}).todo || {}).metricas;
    PRUEBAS.cierto(!(k && k.kss && k.kss.n === 5), '⚠️ discriminador · si el traspaso deja el tope en la clave vieja, la empresa que la recibe pierde sus tests de antes');
  }
  const fz = p308Claves('futuroYReconciliar', 'forzadoConLimite');
  if (!fz.faltan) PRUEBAS.alMenos(fz.despejable.length, 1, '⚠️ discriminador · forzando sólo lo asentado, lo corrido al futuro se sella después y despeja · ' + fz.despejable.join(' / '));
  const ff = p308Claves('futuroLejano', 'sinFechasFuturas');
  if (!ff.faltan) PRUEBAS.alMenos(ff.despejable.length, 1, '⚠️ discriminador · forzando con fechas fuera de la ventana, se re-sellan cuando les llega la fecha y despejan · ' + ff.despejable.join(' / '));
  const ht = p308Claves('hastaFuturo', 'hastaSinTope');
  if (!ht.faltan) PRUEBAS.igual(ht.r3.__sellado.nuevas, 0, '⚠️ discriminador · con el «Hasta» de la hoja sin acotar, la cuenta deja de sellar en silencio');
  const ra = p308Claves('reclaveConAusentes', 'reclaveSinAusentes');
  if (!ra.faltan) PRUEBAS.alMenos((ra.r3.__sellado.trabadas || []).length, 1, '⚠️ discriminador · sin pasar la base de ausentes, la clave nueva se detiene sin causa');
  const s = p308Claves('otraCuenta', 'sinAmbiguedad');
  if (!s.faltan) PRUEBAS.cierto(!s.r2.totalesHseq.error, '⚠️ discriminador · sin la ambigüedad, la otra cuenta se queda con la clave en silencio');
  const ad = p308Claves('filaAdmin', 'adminDaClave');
  if (!ad.faltan) PRUEBAS.cierto(!!ad.r2.totalesHseq.error, '⚠️ discriminador · si el administrador diera clave, una fila suya trabaría a la empresa');
});

PRUEBAS.caso('🔴 P308 · la huella de un test no cambia: con otra huella, cada test sellado quedaría como nuevo', () => {
  /* R19 · la arma `huellaHseq_` con el instante (`tsDeMarca_`), la persona escrita (`limpiarPersona`) y la
     métrica, y entra por `parseRegistros`, como en el sellado. Los valores se fijaron el 2026-10-23 con este
     mismo `.gs`. ⚠️ SI ESTE CASO SE PONE EN ROJO PORQUE CAMBIÓ UNA DE ESAS FUNCIONES, NO SE ACTUALIZAN LOS
     VALORES: hay que migrar `Totales HSEQ` o dejarle a la huella la derivación vieja. Con otra huella, cada test
     sellado reaparecería como un test viejo sin sellar y quedaría excluido. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({}), ['parseRegistros', 'huellaHseq_']);
  const fila = (marca, fecha, persona) => { const f = new Array(90).fill(''); f[0] = marca; f[1] = persona; f[72] = 'Helitec'; f[73] = fecha; f[86] = 5; return f; };
  const d = s => GS.fechaDeCelda(s);
  const regs = api.parseRegistros([new Array(90).fill('b'), new Array(90).fill('p'),
    fila(d('2026-10-20T08:15:42'), d('2026-10-20T08:15:42'), 'José Pérez · 0414-1234567'),  // celda Date con segundos y un teléfono pegado
    fila(d('2026-10-20T09:00:00'), '20/10/2026', 'MARÍA  López'),                            // la fecha como TEXTO de sólo día (29 filas del CH)
    fila(d('2026-10-20T08:15:42'), d('2026-10-20T08:15:42'), 'Jose Perez'),                  // el mismo test, sin tildes ni teléfono
    fila(d('2026-10-20T08:16:42'), d('2026-10-20T08:16:42'), 'José Pérez')]);                // un minuto después
  const h = regs.map(r => api.huellaHseq_(r, 'kss'));
  PRUEBAS.igual(h.slice(0, 2), ['401c79d89f2949ab', 'd622cbcfb3330818'], '🔴 la huella de dos filas con las formas del CH es la que se fijó');
  PRUEBAS.igual(h[2], h[0], 'la misma persona escrita sin tildes ni teléfono es el mismo test');
  PRUEBAS.cierto(h[3] !== h[0], '⚠️ discriminador · un minuto de diferencia es otro test');
  PRUEBAS.cierto(api.huellaHseq_(regs[0], 'estres') !== h[0], 'y otra métrica, otra huella');
});

/* ── Filas inventadas: no completan el piso ────────────────────────────────────────────────────── */
function p308Relleno(sabotaje) {
  /* Cinco personas reales cierran una unidad; Alma queda sola en el grupo abierto. Después llegan cuatro
     tests a nombres que no existen —los webhooks de los tests no piden credencial—. */
  const base = [
    { p: 'Oscar Uno', d: '2026-11-03', h: '07:00', v: 3 }, { p: 'Olga Dos', d: '2026-11-03', h: '07:10', v: 5 },
    { p: 'Omar Tres', d: '2026-11-03', h: '07:20', v: 4 }, { p: 'Otto Cuatro', d: '2026-11-03', h: '07:30', v: 6 },
    { p: 'Oriana Cinco', d: '2026-11-03', h: '07:40', v: 7 }, { p: 'Alma Única', d: '2026-11-03', h: '08:00', v: 8 }].map(p308Test);
  const w = p308Mundo(base, { sabotaje: sabotaje });
  if (w.faltan) return { faltan: w.faltan };
  const r1 = w.sellarYPedir('2026-11-03T12:00:00-04:00');
  const falsos = ['Relleno Uno', 'Relleno Dos', 'Relleno Tres', 'Relleno Cuatro'].map((p, i) =>
    p308Test({ p: p, d: '2026-11-03', h: '12:0' + i, v: 1 }));
  falsos.forEach(x => w.agregar(x));
  const r2 = w.sellarYPedir('2026-11-03T13:00:00-04:00');
  return { r1: r1, r2: r2, despejable: p308Medir([r1, r2], base.concat(falsos)).despejable };
}
PRUEBAS.caso('🔴 P308 · cuatro filas a nombres inventados no completan el piso ni dejan sola a Alma', () => {
  /* R19 · el piso cuenta CÉDULAS: `formarUnidadesHseq_` con la clave `r.cedula` que pone `RES.aplicar`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = p308Relleno();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  PRUEBAS.igual(m.despejable, [], '🔴 nada se despeja: los nombres inventados no cuentan como personas');
  const n = r => { const k = r.totalesHseq.periodos.hoy.metricas.kss; return k ? k.n : null; };
  PRUEBAS.igual(n(m.r2), n(m.r1), '🔴 «hoy» no cambia: el grupo abierto sigue sin cinco personas reales');
  const s = p308Relleno('pisoPorNombre');
  PRUEBAS.igual(s.faltan || [], [], 'guarda: el sabotaje «piso por nombre» se aplicó');
  if (!s.faltan) PRUEBAS.alMenos(s.despejable.length, 1, '⚠️ discriminador · contando nombres, el relleno deja sola a Alma · ' + s.despejable.join(' / '));
});

/* ── Lo de hoy (i) y (ii) ─────────────────────────────────────────────────────────────────────── */
function p308Hoy() {
  const man = [
    { p: 'Oscar Uno', d: '2026-11-03', h: '07:00', v: 3 }, { p: 'Olga Dos', d: '2026-11-03', h: '07:05', v: 4 },
    { p: 'Omar Tres', d: '2026-11-03', h: '07:10', v: 5 }, { p: 'Otto Cuatro', d: '2026-11-03', h: '07:15', v: 6 },
    { p: 'Leo Legal', d: '2026-11-03', h: '07:20', v: 7 }].map(p308Test);
  const tarde = [
    { p: 'Oriana Cinco', d: '2026-11-03', h: '12:00', v: 2 }, { p: 'Orlando Seis', d: '2026-11-03', h: '12:05', v: 8 },
    { p: 'Alma Única', d: '2026-11-03', h: '12:10', v: 9 }, { p: 'Mario Mes', d: '2026-11-03', h: '12:15', v: 3 },
    { p: 'Lara Legal', d: '2026-11-03', h: '12:20', v: 6 }].map(p308Test);
  const noche = [
    { p: 'Marta Mes', d: '2026-11-03', h: '18:00', v: 5 }, { p: 'Nora Nueva', d: '2026-11-03', h: '18:05', v: 7 },
    { p: 'Oscar Uno', d: '2026-11-03', h: '18:10', v: 4 }].map(p308Test);
  return { man, tarde, noche };
}
function p308MedirHoy(sabotaje) {
  const t = p308Hoy();
  const w = p308Mundo(t.man, { sabotaje: sabotaje });
  if (w.faltan) return { faltan: w.faltan };
  /* (i) dos pedidos de hoy; entre los dos, la empresa sumó 5 medidos y Legal, uno (Lara) */
  const man = w.sellarYPedir('2026-11-03T09:00:00-04:00');
  t.tarde.forEach(x => w.agregar(x));
  const tar = w.sellarYPedir('2026-11-03T13:00:00-04:00');
  /* (ii) el último corte de hoy, 3 medidos más que esperan, y el día pedido al día siguiente */
  t.noche.forEach(x => w.agregar(x));
  const noche = w.sellarYPedir('2026-11-03T19:00:00-04:00');
  const manana = w.sellarYPedir('2026-11-04T09:00:00-04:00');
  const todos = t.man.concat(t.tarde, t.noche);
  return { i: p308Medir([man, tar], todos).despejable, ii: p308Medir([noche, manana], todos).despejable,
           tar: tar, noche: noche, manana: manana };
}

PRUEBAS.caso('🔴 P308 · lo de hoy: avanza de a una unidad entera, y el día que cierra es su último corte', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = p308MedirHoy();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  const hoyTar = m.tar.totalesHseq.periodos.hoy.metricas.kss;
  PRUEBAS.cierto(!!hoyTar && hoyTar.n === 10, 'guarda: a la tarde hoy tiene dos unidades · ' + JSON.stringify(hoyTar && { n: hoyTar.n }));
  PRUEBAS.igual(m.i, [], '🔴 (i) entre dos pedidos de hoy, las 5 nuevas (una de Legal) no despejan a nadie');
  const hoyNoche = m.noche.totalesHseq.periodos.hoy.metricas.kss;
  const ayerManana = m.manana.totalesHseq.periodos.hoy.previo.metricas.kss;
  PRUEBAS.igual(JSON.stringify({ n: ayerManana && ayerManana.n, suma: ayerManana && ayerManana.suma }),
    JSON.stringify({ n: hoyNoche && hoyNoche.n, suma: hoyNoche && hoyNoche.suma }),
    '🔴 (ii) el día pedido al día siguiente es su último corte: los 3 de la noche esperan a la unidad siguiente');
  PRUEBAS.igual(m.ii, [], '🔴 (ii) y nada se despeja entre el corte de la noche y el día siguiente');
});

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de lo de hoy: contar en la empresa entera, y cerrar el día con todo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const s1 = p308MedirHoy('hoyPorEmpresa');
  PRUEBAS.igual(s1.faltan || [], [], 'guarda: el sabotaje «contar en la empresa entera» se aplicó');
  if (!s1.faltan) PRUEBAS.alMenos(s1.i.length, 1, '⚠️ discriminador (i) · el total de Legal avanza con las unidades de la empresa: despeja · ' + s1.i.join(' / '));
  const s2 = p308MedirHoy('diaConTodo');
  PRUEBAS.igual(s2.faltan || [], [], 'guarda: el sabotaje «el día cerrado con todo» se aplicó');
  if (!s2.faltan) PRUEBAS.alMenos(s2.ii.length, 1, '⚠️ discriminador (ii) · el día cerrado con todo lo medido despeja a los 3 de la noche · ' + s2.ii.join(' / '));
});

/* ── Lo que viaja, por lista blanca ─────────────────────────────────────────────────────────────── */
const P308_VIAJA = {
  registros:   ['persona', 'empresa', 'departamento', 'cargo'],
  operacional: ['persona', 'empresa', 'departamento', 'cargo', 'fecha', 'hora', 'iso', 'evento', 'test', 'resultado', 'plan'],
  turnos:      ['persona', 'empresa', 'departamento', 'cargo', 'fecha', 'hora', 'tipo', 'carga']
};
const P308_DE_UN_TEST = ['nivel', 'kssNivel', 'kss', 'metricas', 'pvt', 'auto', 'empeoro', 'persist', 'pocoConfiable',
  'ultimoPocoConfiable', 'confiable', 'dias', 'viejo', 'ultimaFecha', 'ultimaFechaConfiable', 'n',
  'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio', 'perelli', 'score'];
function p308LoQueViaja(sabotaje) {
  const op = [['2026-11-03', '06:00', '2026-11-03T10:00:00.000Z', 'op1', 'Alma Única', 'Helitec', 'Administración',
               'Presidente', 'salida_casa', 'kss', 7, '']];
  const tu = [['2026-11-03', '06:10', 't1', 'checkin', 'Alma Única', 'Helitec', 'Administración', 'Presidente', 7, 4]];
  const w = p308Mundo(p308Cuatro(), { sabotaje: sabotaje, operacional: op, turnos: tu });
  if (w.faltan) return { faltan: w.faltan };
  const r = w.sellarYPedir();
  const fuera = [];
  Object.keys(P308_VIAJA).forEach(col => (r[col] || []).forEach((fila, i) => Object.keys(fila || {}).forEach(k => {
    if (P308_VIAJA[col].indexOf(k) < 0 && k !== '__descartadas') fuera.push(col + '[' + i + '].' + k);
  })));
  const deTest = [];
  ['registros', 'operacional', 'turnos'].forEach(col => (r[col] || []).forEach((fila, i) => P308_DE_UN_TEST.forEach(k => {
    if (fila && k in fila) deTest.push(col + '[' + i + '].' + k);
  })));
  const act = JSON.parse(w.api.accionActividad({ usuario: 'helitec', pass: 'hseq-308', dispositivoId: 'p308', n: 50 }).getContent());
  return { r: r, fuera: fuera, deTest: deTest, aptitud: r.aptitud, act: act };
}

PRUEBAS.caso('🔴 P308 · lo que viaja a HSEQ, por lista blanca: ningún campo de un test pegado a una persona', () => {
  /* R19 · la lista blanca es `CAMPOS_HSEQ` (`anonimizarHseq`), y la aptitud por persona la saca
     `esPanelHseq_` en `accionSupervisor`. `accionActividad` manda el instante y el área de cada test,
     sin resultado ni alias: si algún día llevara uno, el test de una persona volvería por ahí. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = p308LoQueViaja();
  PRUEBAS.igual(m.faltan || [], [], 'guarda: el trazador se aplicó');
  if (m.faltan) return;
  PRUEBAS.alMenos((m.r.operacional || []).length, 1, 'guarda: el ciclo trae una fila con la marca de un test');
  PRUEBAS.alMenos((m.r.turnos || []).length, 1, 'guarda: el turno trae una fila');
  PRUEBAS.alMenos((m.r.registros || []).length, 5, 'guarda: llegan las filas de identidad');
  PRUEBAS.igual(m.aptitud, null, '🔴 la aptitud NO llega por persona');
  PRUEBAS.igual(m.fuera, [], '🔴 cada fila trae sólo las claves permitidas');
  PRUEBAS.igual(m.deTest, [], '🔴 ninguna fila por persona trae un campo que salga de un test');
  PRUEBAS.cierto(m.act && m.act.ok, 'guarda: `accionActividad` contesta al panel de HSEQ');
  const tests = ((m.act && m.act.items) || []).filter(x => x.tipo === 'test');
  PRUEBAS.alMenos(tests.length, 5, 'guarda: la actividad trae los tests');
  PRUEBAS.igual(tests.filter(x => x.persona || Object.keys(x).some(k => ['ts', 'tipo', 'que', 'persona', 'empresa', 'dep'].indexOf(k) < 0))
    .map(x => JSON.stringify(x)), [], '🔴 la actividad: cada test con su instante y su área, sin alias ni resultado');
});

PRUEBAS.caso('🔴 P308 · DISCRIMINADORES de lo que viaja: la aptitud por persona, el color del ciclo, el del turno', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const a = p308LoQueViaja('conAptitud');
  PRUEBAS.igual(a.faltan || [], [], 'guarda: el sabotaje «con aptitud» se aplicó');
  if (!a.faltan) PRUEBAS.alMenos((a.aptitud || []).length, 1, '⚠️ discriminador 1 · la aptitud por persona vuelve a viajar y el caso lo ve');
  const n = p308LoQueViaja('conNivel');
  PRUEBAS.igual(n.faltan || [], [], 'guarda: el sabotaje «con nivel» se aplicó');
  if (!n.faltan) PRUEBAS.alMenos(n.deTest.length, 1, '⚠️ discriminador 2 · el `nivel` en una fila del ciclo · ' + n.deTest.join(', '));
  const k = p308LoQueViaja('conKssNivel');
  PRUEBAS.igual(k.faltan || [], [], 'guarda: el sabotaje «con kssNivel» se aplicó');
  if (!k.faltan) PRUEBAS.alMenos(k.deTest.length, 1, '⚠️ discriminador 3 · el `kssNivel` en el turno · ' + k.deTest.join(', '));
});

/* ── El piso de la empresa: anonN lo sube, nunca lo baja ─────────────────────────────────────── */
PRUEBAS.caso('🔴 P308 · `anonN = 1` con 4 medidos: nada, tampoco el color; y `anonN = 8` sube el piso a 8', () => {
  /* R19 · `pisoHseq_`: máx(5, anonN), leído AL SELLAR. `Config Empresa` acepta `0` como «sin umbral» y una
     empresa puede escribir 1: ninguno de los dos baja el piso de HSEQ. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const cuatro = p308Cuatro().slice(0, 4);   // Lara, Leo, Oscar, Olga: 4 personas
  ['1', '0'].forEach(n => {
    const r = p308Pedir(cuatro, { anonN: n });
    PRUEBAS.igual(r.faltan || [], [], 'guarda: se pidió');
    if (r.faltan) return;
    const T = r.totalesHseq || {};
    PRUEBAS.igual(T.piso, 5, '🔴 con `anonN = ' + n + '` el piso sigue en 5');
    PRUEBAS.igual(p308Conjuntos(T, '').map(c => c.k), [], '🔴 con 4 medidos y `anonN = ' + n + '`, ningún total en ningún período');
  });
  /* Con `anonN = 8` y 9 personas: la unidad cierra al llegar a 8 personas distintas; la novena espera. */
  const nueve = p308Cuatro();
  const r8 = p308Pedir(nueve, { anonN: '8' });
  PRUEBAS.igual((r8.totalesHseq || {}).piso, 8, '`anonN = 8` sube el piso a 8');
  const c8 = p308Conjuntos(r8.totalesHseq, '');
  PRUEBAS.alMenos(c8.length, 1, 'guarda: con 9 medidos hay algo publicado que medir');
  const pers = p308PersonaDe(nueve);
  const pers8 = c => new Set(c.filas.map(pers).filter(Boolean)).size;
  PRUEBAS.igual(c8.filter(c => pers8(c) < 8).map(c => c.k + ' (' + pers8(c) + ')'), [], '🔴 con `anonN = 8`, ningún total de menos de 8 personas');
  PRUEBAS.igual(p308Medir([r8], nueve, 8).despejable, [], '🔴 y nada de menos de 8 se despeja');
  PRUEBAS.alMenos(p308Medir([r8], nueve, 9).despejable.length, 1, '⚠️ discriminador · contra un piso de 9, la unidad de 8 sí aparece');
});

/* ── Dirección: no le llega ningún valor ─────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P308 · Dirección entra con su contraseña y no recibe ningún total (ADR 017)', () => {
  /* El plan: «El caso de P308 entra con la contraseña de Dirección y afirma que no le llega ni un valor».
     R19 · lo decide `esPanelHseq_`: la vista es la misma (`hseq`) y la marca `panel` no. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const w = p308Mundo(p308Cuatro());
  if (w.faltan) { PRUEBAS.igual(w.faltan, [], 'guarda'); return; }
  const h = w.sellarYPedir();
  PRUEBAS.cierto(!!(h.totalesHseq && h.totalesHseq.periodos.hoy.metricas.kss), 'guarda: HSEQ sí tiene un total');
  const d = w.pedir({}, 'dir-308');
  PRUEBAS.igual(d.panel, 'direccion', 'guarda: es Dirección');
  PRUEBAS.igual(d.totalesHseq, null, '🔴 ningún total de los tests le llega a Dirección');
  PRUEBAS.igual(((d.registros || [])[0] || {}).kss, undefined, '🔴 ni un puntaje en sus filas');
  PRUEBAS.igual(w.pedir({}, 'sup-308').totalesHseq, null, 'ni al supervisor');
  PRUEBAS.igual(w.pedir({}, 'med-308').totalesHseq, null, 'ni al servicio médico (ve los registros con sus valores)');
});

/* ── El cliente (R17: por `onDashData`) ─────────────────────────────────────────────────────────── */
function p308Pintar(payload, vista, f) {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    onDashData(payload, 'Helitec', { usuario: 'helitec' }, vista || 'hseq');
    if (f) Object.assign(DASH.f, f);
    const cont = document.createElement('div');
    cont.innerHTML = renderHseqIdc(dashFiltered());
    const mapa = document.createElement('div');
    mapa.innerHTML = renderHseqMrfo(dashFiltered());
    return { cont: cont, mapa: mapa, panel: DASH.panel, aptitud: DASH.aptitud, tot: DASH.totalesHseq };
  } finally { try { DASH = prev; localStorage.clear(); } catch (e) {} }
}
function p308Limpio(r) { const x = JSON.parse(JSON.stringify(r)); delete x.__sellado; return x; }

PRUEBAS.caso('🔴 P308 · la pestaña del panel de HSEQ pinta los totales, y debajo del piso no pinta nada de los tests', () => {
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p308Pedir(p308Cuatro());
  PRUEBAS.igual(r.faltan || [], [], 'guarda: se pidió');
  if (r.faltan) return;
  const v = p308Pintar(p308Limpio(r), 'hseq', { period: 'dia' });
  PRUEBAS.igual(v.panel, 'hseq', 'guarda: es el panel de HSEQ');
  const cards = v.cont.querySelectorAll('.kpi');
  PRUEBAS.igual(cards.length, 7, '⚠️ los siete indicadores');
  const kss = v.cont.querySelector('.kpi[data-m="kss"]');
  const T = r.totalesHseq.periodos.hoy.metricas.kss;
  PRUEBAS.cierto(!!kss && !kss.classList.contains('kpi-bajo-piso'), 'guarda: la tarjeta de KSS tiene total');
  if (kss) PRUEBAS.igual((kss.querySelector('.kv') || {}).textContent, (T.suma / T.n).toFixed(1),
    '⚠️ el número es suma ÷ conteo del servidor: la tarjeta no recalcula');
  const bajos = Array.from(v.cont.querySelectorAll('.kpi-bajo-piso'));
  PRUEBAS.igual(bajos.length, 6, '⚠️ las otras seis dicen «menos de 5 medidos»');
  PRUEBAS.igual(bajos.filter(b => b.classList.contains('over') || b.querySelector('.ktrend, .spark, .kconf') ||
      /\d+[.,]\d/.test((b.querySelector('.kv') || {}).textContent || '')).length, 0,
    '🔴 debajo del piso: ni número, ni color, ni flecha, ni tendencia, ni «poco confiables»');
  PRUEBAS.cierto(bajos.every(b => (b.textContent || '').indexOf(t('kpi_bajo_piso', { n: 5 })) >= 0),
    '⚠️ y dice por qué · ' + (bajos[0] ? bajos[0].textContent : ''));
  PRUEBAS.igual(v.mapa.querySelectorAll('.hs-cell').length, 0, '🔴 el mapa de los tests por área no se pinta en HSEQ');
  PRUEBAS.cierto((v.mapa.textContent || '').indexOf(t('hst_sin_mapa').slice(0, 30)) >= 0, 'y la nota dice por qué');
  /* DISCRIMINADOR · la misma tarjeta, con un total a mano en «hoy» para todos: las siete pintan número. */
  const falso = p308Limpio(r);
  Object.keys(falso.totalesHseq.periodos.hoy.metricas).forEach(m => { falso.totalesHseq.periodos.hoy.metricas[m] = T; });
  const v2 = p308Pintar(falso, 'hseq', { period: 'dia' });
  PRUEBAS.igual(v2.cont.querySelectorAll('.kpi-bajo-piso').length, 0, '⚠️ discriminador · con total, ninguna dice «menos de 5»');
});

PRUEBAS.caso('⚠️ P308 · con un filtro puesto la sección lo dice, y un rango a medida no tiene totales', () => {
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p308Pedir(p308Cuatro());
  if (r.faltan) { PRUEBAS.igual(r.faltan, [], 'guarda'); return; }
  const sinF = p308Pintar(p308Limpio(r), 'hseq', { period: 'dia' });
  const conF = p308Pintar(p308Limpio(r), 'hseq', { period: 'dia', dep: 'Operaciones' });
  const aviso = t('hst_filtro').slice(0, 40);
  PRUEBAS.cierto((sinF.cont.textContent || '').indexOf(aviso) < 0, 'sin filtro no hay aviso');
  PRUEBAS.cierto((conF.cont.textContent || '').indexOf(aviso) >= 0, '⚠️ con «Operaciones» filtrado, la sección dice que los tests son de toda la empresa');
  PRUEBAS.igual(conF.cont.querySelectorAll('.kpi').length, 7, 'y muestra los mismos siete totales de la empresa');
  const rango = p308Pintar(p308Limpio(r), 'hseq', { period: 'custom', desde: '2026-10-01', hasta: '2026-11-03' });
  PRUEBAS.igual(rango.cont.querySelectorAll('.kpi').length, 0, '⚠️ con un rango a medida no se pinta ningún total');
  PRUEBAS.cierto((rango.cont.textContent || '').indexOf(t('hst_rango').slice(0, 30)) >= 0, 'y dice qué elegir');
});

PRUEBAS.caso('⚠️ P308 · Dirección sigue con su pestaña de siempre; un panel de HSEQ sin totales lo dice', () => {
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const w = p308Mundo(p308Cuatro());
  if (w.faltan) { PRUEBAS.igual(w.faltan, [], 'guarda'); return; }
  const h = w.sellarYPedir();
  const v = p308Pintar(p308Limpio(w.pedir({}, 'dir-308')), 'hseq');
  PRUEBAS.igual(v.panel, 'direccion', 'guarda: es Dirección');
  PRUEBAS.igual(v.cont.querySelectorAll('.kpi').length, 0, 'Dirección no ve las tarjetas de los totales');
  PRUEBAS.cierto((v.cont.textContent || '').indexOf(t('db_disp_cognitiva')) >= 0, 'y sigue con «Disponibilidad cognitiva» hasta P313');
  const sin = p308Limpio(h); sin.totalesHseq = null;
  const v2 = p308Pintar(sin, 'hseq');
  PRUEBAS.cierto((v2.cont.textContent || '').indexOf(t('hst_error').slice(0, 25)) >= 0,
    '⚠️ un panel de HSEQ sin totales lo dice (una pestaña en blanco se leería como «no hay tests»)');
  PRUEBAS.igual(v2.cont.querySelectorAll('.hs-duo').length, 0, 'y no cae al IDC por persona, que diría «nadie medido»');
});

PRUEBAS.caso('⚠️ P308 · con el cierre detenido, la sección lo dice arriba de las tarjetas, y sin él no', () => {
  /* R17 · el «detenido» sale del servidor real (la propiedad perdida de `p308Claves`), no de un literal. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const m = p308Claves('propiedadPerdida');
  if (m.faltan) { PRUEBAS.igual(m.faltan, [], 'guarda'); return; }
  PRUEBAS.cierto(!!m.r2.totalesHseq.detenido, 'guarda: el servidor real mandó «detenido»');
  const det = p308Pintar(p308Limpio(m.r2), 'hseq', { period: 'semana' });
  const sin = p308Pintar(p308Limpio(m.r1), 'hseq', { period: 'semana' });
  const aviso = det.cont.querySelector('.hst-detenido');
  PRUEBAS.cierto(!!aviso && (aviso.textContent || '').indexOf(t('hst_detenido_sin').slice(2, 30)) >= 0,
    '⚠️ el aviso dice que el cierre está detenido · ' + (aviso ? aviso.textContent : '(no hay aviso)'));
  PRUEBAS.igual(det.cont.querySelectorAll('.kpi').length, 7, 'y las tarjetas siguen con lo sellado');
  PRUEBAS.igual((det.cont.textContent || '').indexOf(t('hst_sin_corrida')), -1, 'sin el aviso del reloj, que diría lo mismo sin la causa');
  PRUEBAS.igual(sin.cont.querySelectorAll('.hst-detenido').length, 0, '⚠️ discriminador · sin «detenido», no hay aviso');
});

PRUEBAS.caso('⚠️ P308 · si la hoja de la cuenta no es la confirmada, la sección no pinta ningún total y dice por qué', () => {
  /* R17 · la respuesta sale del servidor real (`filaAgregada` de `p308Claves`): `causa: "hoja"`, sin períodos. */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const m = p308Claves('filaAgregada');
  if (m.faltan) { PRUEBAS.igual(m.faltan, [], 'guarda'); return; }
  PRUEBAS.igual((m.r2.totalesHseq || {}).causa, 'hoja', 'guarda: el servidor real no mandó totales');
  const v = p308Pintar(p308Limpio(m.r2), 'hseq', { period: 'semana' });
  PRUEBAS.igual(v.cont.querySelectorAll('.kpi').length, 0, '⚠️ ninguna tarjeta');
  PRUEBAS.cierto((v.cont.textContent || '').indexOf(t('hst_hoja').slice(0, 40)) >= 0, '⚠️ y dice que hay que revisar la hoja, no «toca ↻»');
  const ok = p308Pintar(p308Limpio(m.r1), 'hseq', { period: 'semana' });
  PRUEBAS.igual((ok.cont.textContent || '').indexOf(t('hst_hoja').slice(0, 40)), -1, '⚠️ discriminador · con la hoja confirmada, no lo dice');
});

PRUEBAS.caso('🔴 P308 · la demostración tiene su panel de HSEQ, con sus totales y sin nada por persona; el ↻ no lo pierde', () => {
  /* El plan: «La demostración arma HSEQ con el payload médico: los agregados nuevos le saldrían vacíos, y
     hay que darle los suyos». R19 · los manda `accionDemo` (`totalesHseqDemo_`); el panel lo elige
     `demoPayloadDeVista`, `demoAnonimizarHseq` le saca lo que el servidor real no le manda, y `dashRefresh`
     vuelve a pasar el payload por `demoPayloadDeVista` (si no, el ↻ lo dejaba en Dirección). */
  if (!CTX.hayGs || typeof onDashData !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const tests = p308Cuatro().map(x => Object.assign({}, x, { emp: 'Empresa Demo' }));
  const w = p308Mundo(tests);
  if (w.faltan) { PRUEBAS.igual(w.faltan, [], 'guarda'); return; }
  const d = JSON.parse(w.api.accionDemo({ dispositivoId: 'p308' }).getContent());
  PRUEBAS.cierto(d.ok && !!(d.totalesHseq && d.totalesHseq.periodos), 'guarda: la demostración trae sus totales · ' + JSON.stringify(d.error || ''));
  if (!d.ok) return;
  const prev = DASH, prevReq = window.dashRequest;
  return Promise.resolve().then(() => {
    CTX.resetear(); localStorage.clear();
    onDashData(demoPayloadDeVista(d, 'hseqPanel'), 'Empresa Demo', { action: 'demo' }, 'hseq');
    PRUEBAS.igual(DASH.panel, 'hseq', '⚠️ el quinto botón abre el panel de HSEQ');
    PRUEBAS.igual(demoVistaActual(), 'hseqPanel', 'y el selector lo marca');
    PRUEBAS.igual(DASH.aptitud, null, '🔴 sin aptitud por persona');
    PRUEBAS.igual((DASH.registros || []).filter(x => x.kss !== undefined || x.fecha !== undefined).length, 0,
      '🔴 sin un puntaje ni un día en sus filas, como el servidor real');
    PRUEBAS.igual(DASH.comentarios, [], 'ni comentarios');
    PRUEBAS.cierto(!!(DASH.totalesHseq && DASH.totalesHseq.periodos), '⚠️ con los totales del servidor');
    /* el ↻: llega otra vez el payload de `accionDemo` (sin `panel`) por el camino real del refresco */
    window.dashRequest = () => Promise.resolve(JSON.parse(JSON.stringify(d)));
    return dashRefresh(true);
  }).then(() => {
    PRUEBAS.igual(DASH.panel, 'hseq', '🔴 después del ↻ sigue siendo el panel de HSEQ (no cae a Dirección)');
    PRUEBAS.igual(DASH.aptitud, null, 'y sigue sin aptitud por persona');
    onDashData(demoPayloadDeVista(d, 'hseq'), 'Empresa Demo', { action: 'demo' }, 'hseq');
    PRUEBAS.igual(DASH.panel, 'direccion', 'y el botón de Dirección sigue siendo Dirección');
    PRUEBAS.igual(demoVistaActual(), 'hseq', 'con su marca en el selector');
  }).finally(() => { window.dashRequest = prevReq; try { DASH = prev; localStorage.clear(); } catch (e) {} });
});
