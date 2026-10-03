/* ── P215 · las cinco familias que P214 dejó declaradas ───────────────────────────────────────────
   (2026-10-03) · Todas PREEXISTENTES, todas medidas contra el `.gs` publicado antes de tocar.

     1 · `gestScope` · el sitio 12 y **el que ESCRIBE**: devolvía la variante tal como está tipeada,
         así que un admin de fila escribía gestiones y bitácora bajo la clave de otra empresa.
     2 · LOS CUATRO DE LA PROMESA DE LA LÁMINA · alcance por VISTA dentro de la propia empresa.
     3 · `puedeVerEmpresa` · doble canon: una cuenta veía el padrón de otra y la dueña perdía el suyo.
     4 · `cargoDe` desde `marcarCargosCanon` · importaba el cargo del HOMÓNIMO, y con él su nivel.
     5 · Los diccionarios de alcance eran objetos literales: `Constructor` pasaba por el prototipo.

   ⚠️ R19 · CADA DERECHO QUE SE AFIRMA ACÁ NOMBRA LA FUNCIÓN QUE LO CONCEDE. En P214 escribí cinco
   veces un aserto que bendecía una suposición mía, y dos de ellas DESPUÉS de redactar esa regla. */

PRUEBAS.grupo('P215 · la lámina y el doble canon');

const P215_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P215_HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
const P215_SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];

PRUEBAS.caso('🔴 1 · `gestScope` ESCRIBE bajo el canónico propio, nunca bajo la variante pedida', () => {
  /* EL DERECHO: quién puede escribir bajo qué empresa lo concede `empresasPermitidas_`, que desde
     P214 devuelve UN canónico — la decisión es que una cuenta pertenece a una empresa y la celda
     EMPRESAS son variantes de su nombre. `gestScope` era el único de los doce sitios que no la
     consultaba: resolvía con un bucle sobre las variantes crudas y devolvía la que coincidiera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P215_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['AdmAB', 'clave-ab', 'admin', 'Alfa, Beta', '', ''],
      ['Beta', 'clave-b', 'supervisor', 'Beta', '', ''],
      ['Alfa', 'clave-a', 'supervisor', 'Alfa', '', '']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [P215_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['gestScope', 'ausScope', 'validarAcceso', 'construirAlias']);
  const adm = api.validarAcceso('AdmAB', 'clave-ab', 'd');
  const mae = api.validarAcceso('*', 'clave-maestra', 'd');
  const sup = api.validarAcceso('Beta', 'clave-b', 'd');
  PRUEBAS.igual(adm && adm.rol, 'admin', 'guarda: «admin» tipeado en la columna C DA rol admin');
  /* lo que tiene que cambiar */
  PRUEBAS.falso(String(api.gestScope(adm, 'Beta')).toLowerCase() === 'beta',
    '🔴 pedir una empresa ajena NO devuelve esa empresa como clave de escritura');
  PRUEBAS.igual(String(api.gestScope(adm, 'Beta')).toLowerCase(), 'alfa',
    '🔴 cae a la suya, igual que hace un supervisor');
  /* y las dos derivaciones del alcance coinciden, que era el defecto de fondo */
  PRUEBAS.igual(String(api.gestScope(adm, 'Beta')).toLowerCase(),
    String(api.ausScope(adm, api.construirAlias(), 'Beta')).toLowerCase(),
    '🔴 `gestScope` y `ausScope` dan LO MISMO: eran dos derivaciones que caían distinto');
  /* LO QUE NO PUEDE CAMBIAR */
  PRUEBAS.igual(api.gestScope(mae, 'Beta'), 'Beta', '🔴 NO PUEDE CAMBIAR · el maestro indica cualquiera');
  PRUEBAS.igual(api.gestScope(sup, 'Alfa'), 'Beta', '🔴 NO PUEDE CAMBIAR · el supervisor sigue anclado');
  PRUEBAS.igual(String(api.gestScope(adm, 'Alfa')).toLowerCase(), 'alfa', 'y pedir la suya funciona');
});

/* El fixture de la lámina: una fila con «admin» TIPEADO y otra normal, que es el discriminador. */
function p215Lamina() {
  const env = GS.crearEntorno({
    'Accesos': [P215_CAB,
      ['*', 'km', 'admin', '', '', ''],
      ['Mia', 'kmi', 'admin', 'Mia', 'kmed', 'khseq'],
      ['Sana', 'ks', 'supervisor', 'Sana', 'kmed2', 'khseq2']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Mia', 'ANA MIA', 'V-1', 'Ops', 'Piloto'], ['Sana', 'ZOE SANA', 'V-2', 'Ops', 'Piloto']],
    'Niveles Riesgo': [['Empresa', 'Persona', 'Departamento', 'Cargo', 'Nivel'],
      ['Mia', 'ANA MIA', 'Ops', 'Piloto', '4'], ['Sana', 'ZOE SANA', 'Ops', 'Piloto', '4']],
    'Opiniones': [['ID', 'Empresa', 'Fecha', 'Texto', 'Anonimo'],
      ['o1', 'Mia', P215_HOY, 'texto anonimo de Mia', 'si']],
    'Credenciales': [['Empresa', 'Persona', 'Cedula', 'Hash', 'Sal', 'Estado', 'TS'],
      ['Mia', 'ANA MIA', 'V-1', 'h', 's', 'activa', '1']],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra'],
      [P215_HOY, 'Mia', 'restriccion', 'ANA MIA', 'sup', 'supervisor', 'panel', 'x', '5', '6.9', 'b1', 'h',
       '{"accion":"restriccion","sujeto":"ANA MIA"}']],
    'Sesiones': [P215_SES]
  });
  return GS.cargarGs(CTX.gs, env, ['accionBitacora', 'accionNivelesRiesgo', 'accionOpiniones',
    'accionCredencialReiniciar']);
}

PRUEBAS.caso('🔴 2 · la promesa de la lámina no se saltea escribiendo «admin» en una celda', () => {
  /* EL DERECHO, y de dónde sale cada uno:
     · la bitácora seudonimizada para Dirección la concede `bitacoraParaHseq_`, que `accionBitacora`
       aplica cuando la vista es `hseq`;
     · la tabla de niveles SIN `persona` la concede la bandera `esDireccion` de `nivelesParaAcceso_`;
     · el rechazo del buzón anónimo lo concede el candado de vista de `accionOpiniones`, cuyo propio
       comentario dice que ese canal existe para que nadie lo lea;
     · y el rechazo de `accionCredencialReiniciar` lo concede su candado `sin_permiso`.
     Los cuatro miraban `acc.rol !== "admin"`, y el rol sale de una celda escrita a mano. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p215Lamina();
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return { err: e.message }; } };
  const conNombres = (u, pw, emp) => /ANA MIA/.test(JSON.stringify(
    J(api.accionBitacora({ usuario: u, pass: pw, dispositivoId: 'd', empresa: emp })).eventos || []));
  const conPersona = (u, pw, emp) => /ANA MIA/.test(JSON.stringify(
    J(api.accionNivelesRiesgo({ usuario: u, pass: pw, dispositivoId: 'd', empresa: emp }))));
  const leeBuzon = (u, pw, emp) => !!J(api.accionOpiniones({ usuario: u, pass: pw, dispositivoId: 'd', empresa: emp })).ok;
  const reinicia = (u, pw, emp, c) => J(api.accionCredencialReiniciar({ usuario: u, pass: pw,
    dispositivoId: 'd', empresa: emp, cedula: c, _post: true }));
  /* ⚠️ LA GUARDA: la fila normal TIENE que comportarse como se espera, o los asertos de abajo
     pasarían aunque la acción estuviera rota para todos. */
  PRUEBAS.falso(conNombres('Sana', 'khseq2', 'Sana'), 'guarda: a Dirección normal la bitácora le llega seudonimizada');
  PRUEBAS.falso(leeBuzon('Sana', 'kmed2', 'Sana'), 'guarda: y el médico normal NO lee el buzón anónimo');
  /* lo que tiene que cambiar: la fila con «admin» tipeado se comporta IGUAL que la normal */
  PRUEBAS.falso(conNombres('Mia', 'khseq', 'Mia'),
    '🔴 la bitácora NO le llega con nombres a la Dirección de la fila con «admin»');
  PRUEBAS.falso(conPersona('Mia', 'khseq', 'Mia'),
    '🔴 ni la tabla de niveles con `persona` — las dos mitades del cruce que P207 cerró');
  PRUEBAS.falso(leeBuzon('Mia', 'kmed', 'Mia'),
    '🔴 ni el servicio médico de esa fila lee el BUZÓN ANÓNIMO');
  const r = reinicia('Mia', 'khseq', 'Mia', 'V-1');
  PRUEBAS.igual(r.motivo, 'sin_permiso',
    '🔴 y Dirección NO reinicia la contraseña de una persona · ' + String(r.motivo || r.error || '').slice(0, 30));
});

PRUEBAS.caso('🔴 3 · el padrón del informe no cruza a otra empresa por dos saltos de alias', () => {
  /* EL DERECHO: a quién ve cada cuenta lo concede `empresasPermitidas_` + `puedeVerEmpresa`. El
     defecto no era el candado sino el ESTADO del dato: `construirPadron` ya canoniza la empresa y
     `puedeVerEmpresa` la canonizaba otra vez, y `nominaEmpresaCanon` NO es idempotente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P215_CAB, ['*', 'km', 'admin', '', '', ''],
      ['Otra', 'ko', 'supervisor', 'Otra, Equis', '', ''],
      /* POSTERIOR, así que gana el alias de «Otra» · es lo que hace existir el segundo salto */
      ['Mia', 'kmi', 'supervisor', 'Mia, Otra', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Equis', 'ZOE DE EQUIS', 'V-9001', 'Ops', 'Piloto'],
      ['Mia', 'ANA DE MIA', 'V-1', 'Ops', 'Piloto']],
    'Sesiones': [P215_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionIdentidadesInforme', 'accionNominaListar',
    'construirAlias', 'nominaEmpresaCanon']);
  const al = api.construirAlias();
  const padron = (u, pw) => Number(JSON.parse(api.accionIdentidadesInforme({ usuario: u, pass: pw,
    dispositivoId: 'd' }).getContent()).enPadron || 0);
  const nomina = (u, pw) => (JSON.parse(api.accionNominaListar({ usuario: u, pass: pw,
    dispositivoId: 'd' }).getContent()).nomina || []).length;
  /* la guarda del escenario: sin los dos saltos, este caso no reproduce nada */
  PRUEBAS.igual(api.nominaEmpresaCanon(al, 'Equis'), 'Otra', 'guarda: primer salto · Equis → Otra');
  PRUEBAS.igual(api.nominaEmpresaCanon(al, 'Otra'), 'Mia', 'guarda: segundo salto · Otra → Mia');
  /* el invariante: el padrón y la nómina tienen que decir LO MISMO para cada cuenta */
  PRUEBAS.igual(padron('Mia', 'kmi'), nomina('Mia', 'kmi'),
    '🔴 `Mia`: el padrón y la nómina coinciden (antes 2 contra 1: veía a la persona de Otra)');
  PRUEBAS.igual(padron('Otra', 'ko'), nomina('Otra', 'ko'),
    '🔴 `Otra`: coinciden (antes 0 contra 1: PERDÍA la suya)');
  PRUEBAS.alMenos(nomina('Otra', 'ko'), 1, 'guarda: y «Otra» sí tiene gente, así que el 0 era pérdida');
});

PRUEBAS.caso('🔴 5 · una empresa llamada «Constructor» no pasa por el prototipo del diccionario', () => {
  /* EL DERECHO: el recorte del panel lo concede el `set` que arma la rama supervisor de
     `accionSupervisor` desde `empresasPermitidas_`. Un objeto literal hereda de `Object.prototype`,
     así que `set["constructor"]` es truthy sin que nadie lo haya puesto. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P215_CAB, ['*', 'km', 'admin', '', '', ''],
      ['Mia', 'kmi', 'supervisor', 'Mia', '', ''],
      ['Constructor', 'kc', 'supervisor', 'Constructor', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Mia', 'ANA MIA', 'V-1', 'Ops', 'Piloto'],
      ['Constructor', 'ZOE CONSTRUCTOR', 'V-2', 'Ops', 'Piloto']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [P215_HOY, '08:00', P215_HOY + 'T08:00:00', 'e1', 'ANA MIA', 'Mia', 'Ops', 'Piloto', 'inicio', '', '', ''],
      [P215_HOY, '09:00', P215_HOY + 'T09:00:00', 'e2', 'ZOE CONSTRUCTOR', 'Constructor', 'Ops', 'Piloto', 'inicio', '', '', '']],
    'Sesiones': [P215_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor']);
  const ve = (u, pw) => (JSON.parse(api.accionSupervisor({ usuario: u, pass: pw,
    dispositivoId: 'd' }).getContent()).operacional || []).map(x => String(x.persona));
  /* la guarda: cada una tiene que ver LA SUYA, o el aserto de abajo pasaría por vacío */
  PRUEBAS.cierto(ve('Mia', 'kmi').indexOf('ANA MIA') >= 0, 'guarda: «Mia» ve a su propia persona');
  PRUEBAS.cierto(ve('Constructor', 'kc').indexOf('ZOE CONSTRUCTOR') >= 0, 'guarda: y «Constructor» a la suya');
  PRUEBAS.igual(ve('Mia', 'kmi').indexOf('ZOE CONSTRUCTOR'), -1,
    '🔴 «Mia» NO recibe a la persona de «Constructor» por el prototipo del objeto');
  PRUEBAS.igual(ve('Constructor', 'kc').indexOf('ANA MIA'), -1, 'y al revés tampoco');
});
