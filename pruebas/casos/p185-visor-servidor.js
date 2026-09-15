PRUEBAS.grupo('P185 · el visor del administrador · servidor');

/* EL PEDIDO, TEXTUAL: «cambiar de servicio medico a supervisor o otro rol. osea todo rol, de toda
   empresa […] en admin, porque solo ve servicio medico y no puede elegir nada, deberia ser un
   visor que ve todo» · «en admin veo las jornadas de todos pero debe ser de la empresa que elegi».

   CÓMO SE PRUEBA: se corre el `.gs` DE VERDAD en el emulador, con un `Accesos` de tres cuentas
   (la maestra `*`, HELITEC con contraseña médica y HSQ, y otra combinada) y datos de DOS empresas,
   y se entra por `accionSupervisor(p)` con la contraseña de admin más `verEmpresa`/`verVista`.
   Se mira el payload completo: es lo único que el cliente va a recibir (R17).

   ⚠️ Los encabezados de `Accesos` son los REALES del CH (`pruebas/encabezados-ch.json`), no un
   sinónimo: es el pendiente conocido de la suite (seis formas distintas) y acá no se agrava. */

const P185_HOY = new Date().toISOString().substring(0, 10);
const P185_ADMIN = 'admin-p185#';   // con `#`, como la real: viaja en un objeto, nunca concatenada
const P185_CAB_ACCESOS = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];

function p185Fila(persona, dep, empresa, kss, comentario) {
  const f = new Array(90).fill('');
  f[0] = P185_HOY + ' 08:00:00'; f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = P185_HOY; f[86] = kss;
  if (comentario) f[85] = comentario;
  return f;
}

function p185Hojas() {
  return {
    'Accesos': [P185_CAB_ACCESOS,
      ['*',        P185_ADMIN, 'admin',      '',                              '',        ''],
      ['helitec',  'sup-185',  'supervisor', 'Consorcio HELITEC, Helitec',    'med-185', 'dir-185'],
      ['silva',    'sup-sil',  'supervisor', 'Aeroambulancias Silva, Silva',  '',        ''],
      /* P157b · una fila con SÓLO contraseña no es una cuenta: no puede aparecer en la lista */
      ['',         'suelta',   '',           '',                              '',        '']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p185Fila('Ana Suárez',   'Operaciones', 'Consorcio HELITEC',     7, 'Dormí muy mal'),
      p185Fila('Luis Ferrer',  'Operaciones', 'Consorcio HELITEC',     3, ''),
      p185Fila('Pedro Gómez',  'Vuelo',       'Aeroambulancias Silva', 5, 'Todo bien')],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono',
                'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC',     'Ana Suárez',  'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3'],
      ['Consorcio HELITEC',     'Luis Ferrer', 'V-22222', 'Operaciones', 'Piloto', 'M', '35', '', '', 'Si', '', 'empleado', '3'],
      ['Aeroambulancias Silva', 'Pedro Gómez', 'V-33333', 'Vuelo',       'Piloto', 'M', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [P185_HOY, '06:00', P185_HOY + 'T06:00:00.000Z', 'op1', 'Ana Suárez',  'Consorcio HELITEC',     'Operaciones', 'Piloto', 'salida_casa', 'kss', 7, ''],
      [P185_HOY, '06:30', P185_HOY + 'T06:30:00.000Z', 'op2', 'Pedro Gómez', 'Aeroambulancias Silva', 'Vuelo',       'Piloto', 'salida_casa', 'kss', 5, '']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  };
}

let _p185Api = null;
function p185Api(fns) {
  const env = GS.crearEntorno(p185Hojas());
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
const p185J = r => JSON.parse(r.getContent());
const p185Emps = regs => [...new Set((regs || []).map(r => r.empresa))].sort();

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · el admin entra y el CH de prueba tiene dos empresas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185' }));
  PRUEBAS.cierto(r.ok, 'el admin tiene que entrar · ' + (r.error || ''));
  PRUEBAS.igual(r.rol, 'admin', 'y ser admin');
  PRUEBAS.igual(p185Emps(r.registros), ['Aeroambulancias Silva', 'Consorcio HELITEC'],
    'sin visor recibe las DOS empresas — si acá hubiera una sola, lo de abajo no filtraría nada');
});

PRUEBAS.caso('sin parámetros del visor, la respuesta es la de siempre (el cliente 6.48 de Rafael sigue vivo)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185' }));
  PRUEBAS.igual(r.vista, 'medico', 'la vista fija de siempre');
  PRUEBAS.igual(r.visor, null, 'sin visor');
  PRUEBAS.cierto(Array.isArray(r.cuentas), 'pero SÍ trae la lista para el selector: es el admin');
  PRUEBAS.cierto(Array.isArray(r.atajosAdmin), 'y los atajos «Entrar como…», como siempre');
});

PRUEBAS.caso('🔴 «HELITEC · Dirección»: sólo HELITEC, anonimizado, y el payload dice que es el visor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185',
                                         verEmpresa: 'Consorcio HELITEC', verVista: 'hseq' }));
  PRUEBAS.cierto(r.ok, 'entra · ' + (r.error || ''));
  PRUEBAS.igual(r.vista, 'hseq', 'la vista pedida');
  PRUEBAS.igual(r.rol, 'supervisor', 'el rol es el de la CUENTA de HELITEC, no «admin»: así el resto del servidor filtra solo');
  PRUEBAS.igual(p185Emps(r.registros), ['Consorcio HELITEC'],
    '⚠️ ni un registro de la otra empresa — es el pedido «debe ser de la empresa que elegí»');
  PRUEBAS.igual((r.operacional || []).map(o => o.empresa), ['Consorcio HELITEC'].concat(new Array(Math.max(0, (r.operacional || []).length - 1)).fill('Consorcio HELITEC')),
    'el operacional (de donde salen Jornada y Ciclo) también viene sólo de HELITEC');
  const nombres = (r.registros || []).map(x => x.persona);
  PRUEBAS.cierto(nombres.length > 0 && nombres.every(n => /^P\d+$/.test(n)),
    '⚠️ FIEL AL ROL: Dirección ve P1, P2… y el visor ve lo mismo · vio ' + JSON.stringify(nombres));
  PRUEBAS.igual(r.visor, { empresa: 'Consorcio HELITEC', vista: 'hseq' }, 'el payload dice qué está mirando');
  PRUEBAS.cierto(Array.isArray(r.atajosAdmin), 'los atajos siguen viajando: el flotante vive en el visor también');
  PRUEBAS.cierto(Array.isArray(r.cuentas), 'y la lista del selector también');
  PRUEBAS.igual(r.marca !== undefined, true, 'la marca de la empresa viaja (como a la cuenta real)');
});

PRUEBAS.caso('«HELITEC · Servicio médico»: con nombres y comentarios, como el médico de verdad', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185',
                                         verEmpresa: 'helitec', verVista: 'medico' }));
  PRUEBAS.igual(r.vista, 'medico', 'la vista pedida · y la empresa se acepta por el USUARIO de la cuenta, no sólo por el nombre');
  PRUEBAS.igual(p185Emps(r.registros), ['Consorcio HELITEC'], 'sólo HELITEC');
  PRUEBAS.cierto((r.registros || []).some(x => x.persona === 'Ana Suárez'), 'con nombres reales: es lo que ve el médico');
  PRUEBAS.cierto((r.comentarios || []).length >= 1 && r.comentarios.every(c => c.empresa === 'Consorcio HELITEC'),
    'y los comentarios, sólo los de HELITEC · vio ' + JSON.stringify((r.comentarios || []).map(c => c.empresa)));
});

PRUEBAS.caso('«Todas las empresas · Dirección»: sigue viendo todas, pero anonimizado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', verVista: 'hseq' }));
  PRUEBAS.igual(r.rol, 'admin', 'sin empresa elegida sigue siendo admin');
  PRUEBAS.igual(r.vista, 'hseq', 'con la vista pedida');
  PRUEBAS.igual(p185Emps(r.registros).length, 2, 'las dos empresas');
  PRUEBAS.cierto((r.registros || []).every(x => /^P\d+$/.test(x.persona)), 'y sin nombres: el recorte de Dirección aplica igual');
  PRUEBAS.igual(r.visor, { empresa: '', vista: 'hseq' }, 'el payload lo dice');
});

PRUEBAS.caso('una empresa que no existe: sigue como admin y avisa, no inventa ni se cae', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', verEmpresa: 'No Existe SA', verVista: 'hseq' }));
  PRUEBAS.cierto(r.ok, 'responde ok');
  PRUEBAS.igual(r.rol, 'admin', 'como admin');
  PRUEBAS.igual(r.visorError, 'empresa', 'y dice por qué');
  PRUEBAS.igual(r.visor, null, 'sin visor puesto');
  PRUEBAS.igual(p185Emps(r.registros).length, 2, 'con lo de siempre');
});

PRUEBAS.caso('🔴 CANDADO 1 · una cuenta de empresa con `verEmpresa` NO cambia de empresa', () => {
  /* El discriminador de todo el visor: si esto pasara, cualquier supervisor con su contraseña
     podría leer los datos de otra empresa mandando un parámetro. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: 'silva', pass: 'sup-sil', dispositivoId: 'p185',
                                         verEmpresa: 'Consorcio HELITEC', verVista: 'medico' }));
  PRUEBAS.cierto(r.ok, 'entra como Silva');
  PRUEBAS.igual(p185Emps(r.registros), ['Aeroambulancias Silva'], '⚠️ y ve SÓLO la suya, diga lo que diga el parámetro');
  PRUEBAS.igual(r.visor, null, 'sin visor');
  PRUEBAS.igual(r.cuentas, null, 'y sin la lista de cuentas: eso es sólo del admin');
  PRUEBAS.igual(r.atajosAdmin, null, 'ni atajos');
});

PRUEBAS.caso('la lista de cuentas: una por empresa, sin la maestra, sin la fila suelta, y SIN contraseñas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185' }));
  PRUEBAS.igual((r.cuentas || []).map(c => c.empresa), ['Aeroambulancias Silva', 'Consorcio HELITEC'],
    'las dos cuentas, ordenadas, con su nombre canónico');
  PRUEBAS.igual((r.cuentas || []).map(c => [c.combinada, c.tieneHseq]), [[true, false], [false, true]],
    'Silva es combinada y sin HSQ; HELITEC tiene las tres');
  const texto = JSON.stringify(r.cuentas);
  ['admin-p185', 'sup-185', 'med-185', 'dir-185', 'sup-sil', 'suelta'].forEach(c =>
    PRUEBAS.falso(texto.indexOf(c) >= 0, '⚠️ ninguna contraseña viaja en la lista: buscada «' + c + '»'));
});

/* ── CANDADO 2 · el visor no escribe ─────────────────────────────────────────────────────────── */
const P185_ESCRITURAS = [
  ['accionAusenciaGuardar',      { cedula: 'V-11111', desde: P185_HOY, hasta: P185_HOY, motivo: 'vacaciones' }],
  ['accionGestionGuardar',       { gestion: JSON.stringify({ id: 'g1', tipo: 'nota' }) }],
  ['accionGestionBorrar',        { id: 'g1' }],
  ['accionBitacoraGuardar',      { evento: JSON.stringify({ id: 'b1', accion: 'x' }) }],
  ['accionCicloConfigGuardar',   { plan: JSON.stringify({ traslado_ida: 30 }) }],
  ['accionCicloPersonaGuardar',  { persona: 'Ana Suárez', plan: JSON.stringify({ traslado_ida: 30 }) }],
  ['accionDepartamentoGuardar',  { departamento: 'Nuevo', nivel: '3' }],
  ['accionDepartamentoBaja',     { departamento: 'Operaciones' }],
  ['accionTareaGuardar',         { persona: 'Ana Suárez', texto: 'x' }],
  ['accionTareaBorrar',          { id: 't1' }],
  ['accionCredencialReiniciar',  { cedula: 'V-11111', _post: true }],
  ['accionCasoOdooGuardar',      { caso: JSON.stringify({ id: 'c1' }) }],
  ['accionSembrarNivelesDemo',   {}],
  ['generarInforme',             { objetivo: 'x' }]
];

PRUEBAS.caso('🔴 CANDADO 2 · las catorce acciones que escriben responden «solo_lectura» al visor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(P185_ESCRITURAS.map(e => e[0]));
  const base = { usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', empresa: 'Consorcio HELITEC',
                 verEmpresa: 'Consorcio HELITEC', verVista: 'medico', _post: true };
  const mal = [];
  P185_ESCRITURAS.forEach(([fn, extra]) => {
    let r;
    try { r = p185J(api[fn](Object.assign({}, base, extra))); } catch (e) { r = { error: 'TIRÓ: ' + e.message }; }
    if (!(r && r.ok === false && r.motivo === 'solo_lectura')) mal.push(fn + ' → ' + JSON.stringify(r).slice(0, 90));
  });
  PRUEBAS.igual(mal, [], '⚠️ cada una tiene que rechazar con motivo solo_lectura, ANTES de tocar la hoja');
});

PRUEBAS.caso('DISCRIMINADOR del candado 2 · el admin SIN visor sigue escribiendo como hoy', () => {
  /* Franco no pidió quitarle al admin lo que hoy puede hacer en «Todas las empresas»; sólo
     lectura es para el VISOR. Si esto diera solo_lectura, el candado estaría mal puesto. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionCicloConfigGuardar', 'accionTareaGuardar']);
  const r = p185J(api.accionCicloConfigGuardar({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185',
                                                  empresa: 'Consorcio HELITEC', plan: JSON.stringify({ traslado_ida: 30 }), _post: true }));
  PRUEBAS.cierto(r.motivo !== 'solo_lectura', 'sin visor no hay solo_lectura · ' + JSON.stringify(r).slice(0, 80));
});

/* ── CANDADO 3 · el visor no se persiste ─────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 CANDADO 3 · «recordar este dispositivo» en visor guarda la sesión del ADMIN, no la de la empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor', 'sesResolver']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', recordar: '1',
                                         verEmpresa: 'Consorcio HELITEC', verVista: 'hseq' }));
  PRUEBAS.cierto(!!r.sesion, 'guarda de medibilidad: se emitió una sesión');
  if (!r.sesion) return;
  const ses = api.sesResolver(r.sesion, 'p185');
  PRUEBAS.cierto(!!ses, 'y el token resuelve');
  PRUEBAS.igual(ses && ses.rol, 'admin', '⚠️ como ADMIN: el visor es estado del cliente, no de la sesión');
  PRUEBAS.igual(ses && ses.vista, 'medico', 'con la vista base del admin, no la del visor');
});

PRUEBAS.caso('los atajos «Entrar como…» siguen funcionando con los parámetros del visor puestos', () => {
  /* `admin_entrar_como` no pasa por `accesoPanel_` a propósito: trabaja con el admin puro. Pero el
     cliente le manda `dashAuth()`, que en el visor lleva `verEmpresa`/`verVista`: tienen que
     ignorarse, no romperlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionAdminEntrarComo']);
  const r = p185J(api.accionAdminEntrarComo({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185',
                                              verEmpresa: 'Consorcio HELITEC', verVista: 'hseq', cedula: 'V-99999' }));
  PRUEBAS.falso(/Solo el administrador/.test(String(r.error || '')), 'no lo rechaza por «no ser admin» · ' + JSON.stringify(r).slice(0, 90));
});

/* ── la contraseña del administrador, por el endpoint ───────────────────────────────────────── */
PRUEBAS.caso('🔴 `accesos_admin_set` · sólo por POST, con token, escribe la fila `*` en texto y no devuelve la clave', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionMantenimiento', 'validarAcceso']);
  const tok = (/var MANT_TOKEN = "([^"]+)"/.exec(CTX.gs || '') || [])[1] || '';
  PRUEBAS.cierto(!!tok, 'guarda de medibilidad: el token está en la fuente');
  const sinPost = p185J(api.accionMantenimiento({ tarea: 'accesos_admin_set', token: tok, nueva: 'nueva-2026#' }));
  PRUEBAS.igual(sinPost.ok, false, 'por GET no');
  const corta = p185J(api.accionMantenimiento({ tarea: 'accesos_admin_set', token: tok, nueva: 'corta', _post: true }));
  PRUEBAS.igual(corta.ok, false, 'una clave de 5 caracteres no');
  const sinTok = p185J(api.accionMantenimiento({ tarea: 'accesos_admin_set', token: 'x', nueva: 'nueva-2026#', _post: true }));
  PRUEBAS.igual(sinTok.ok, false, 'sin token no');
  const ok = p185J(api.accionMantenimiento({ tarea: 'accesos_admin_set', token: tok, nueva: 'nueva-2026#', _post: true }));
  PRUEBAS.cierto(ok.ok, 'con todo, escribe · ' + (ok.error || ''));
  PRUEBAS.falso(JSON.stringify(ok).indexOf('nueva-2026#') >= 0, '⚠️ y la respuesta NO trae la clave');
  PRUEBAS.cierto(!!api.validarAcceso('*', 'nueva-2026#', 'p185'), '⚠️ la nueva abre');
  PRUEBAS.falso(!!api.validarAcceso('*', P185_ADMIN, 'p185-otro'), 'y la vieja ya no');
});

PRUEBAS.caso('ANÁLISIS ESTÁTICO (a propósito) · ninguna acción del panel llama a `validarAcceso` directo salvo las cuatro conocidas', () => {
  /* Éste sí lee la fuente, y es lo correcto: la pregunta es sobre el CÓDIGO. Una acción nueva que
     escriba `validarAcceso(...)` directo se sale del visor sin error: esa pestaña volvería a mostrar
     «Todas las empresas» en silencio. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const src = (CTX.gs || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const llamadas = [];
  const re = /(?<!function\s)validarAcceso\(([^)]*)\)/g; let m;   // sin la definición
  while ((m = re.exec(src))) {
    const antes = src.slice(0, m.index);
    /* la última función CON NOMBRE antes de la llamada: un `function (x) {` anónimo en el medio
       (callbacks) no cuenta */
    const nombres = antes.match(/function\s+(\w+)\s*\(/g) || [];
    const fn = nombres.length ? nombres[nombres.length - 1].replace(/^function\s+/, '').replace(/\s*\($/, '') : '?';
    llamadas.push(fn);
  }
  const permitidas = ['accionDemo', 'accionAdminEntrarComo', 'accionMedirHash', 'accionSesionCrear', 'accesoPanel_'];
  const fuera = llamadas.filter(f => permitidas.indexOf(f) < 0);
  PRUEBAS.igual(fuera, [], '⚠️ estas funciones llaman a validarAcceso directo y quedan fuera del visor: ' + fuera.join(', '));
  PRUEBAS.alMenos(llamadas.length, 5, 'guarda: la búsqueda encontró las llamadas (si diera 0 no estaría midiendo)');
});

/* ── lo que encontró la revisión adversarial ─────────────────────────────────────────────── */
PRUEBAS.caso('🔴 `pedida` NO pisa la vista del visor en una empresa combinada (hallazgo del verificador)', () => {
  /* El admin que entró por la pestaña Supervisor lleva `pedida:'supervisor'` en todos sus pedidos.
     Silva es combinada (sin contraseña médica), y el override de `pedida` corría DESPUÉS de fabricar
     el acc: «Silva · Dirección» devolvía el panel del supervisor, con nombres, mientras el rótulo
     decía Dirección. Reproducido con este archivo en el emulador antes de arreglarlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor']);
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', pedida: 'supervisor',
                                         verEmpresa: 'Aeroambulancias Silva', verVista: 'hseq' }));
  PRUEBAS.igual(r.vista, 'hseq', '⚠️ la vista es la del visor, no la de `pedida`');
  PRUEBAS.igual(r.visor, { empresa: 'Aeroambulancias Silva', vista: 'hseq' }, 'y el payload lo dice igual');
  PRUEBAS.cierto((r.registros || []).length > 0 && r.registros.every(x => /^P\d+$/.test(x.persona)), 'anonimizado, como Dirección · ' + JSON.stringify((r.registros || []).map(x => x.persona)));
  /* discriminador: SIN visor, `pedida` sigue mandando en una cuenta combinada, como siempre */
  const s = p185J(api.accionSupervisor({ usuario: 'silva', pass: 'sup-sil', dispositivoId: 'p185', pedida: 'medico' }));
  PRUEBAS.igual(s.vista, 'medico', 'la cuenta combinada de Silva sigue eligiendo su vista con `pedida`');
});

PRUEBAS.caso('`accesos_admin_set` cierra las sesiones RECORDADAS del admin: cambiar la clave saca a quien estaba adentro', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p185Api(['accionSupervisor', 'sesResolver', 'accionMantenimiento']);
  const tok = (/var MANT_TOKEN = "([^"]+)"/.exec(CTX.gs || '') || [])[1] || '';
  const r = p185J(api.accionSupervisor({ usuario: '*', pass: P185_ADMIN, dispositivoId: 'p185', recordar: '1' }));
  PRUEBAS.cierto(!!r.sesion && !!api.sesResolver(r.sesion, 'p185'), 'guarda: el admin quedó recordado y el token resuelve');
  const ok = p185J(api.accionMantenimiento({ tarea: 'accesos_admin_set', token: tok, nueva: 'nueva-2026#', _post: true }));
  PRUEBAS.cierto(ok.ok, 'la clave se cambió');
  PRUEBAS.alMenos(ok.r && ok.r.sesionesCerradas, 1, 'y cerró al menos una sesión del admin');
  PRUEBAS.falso(!!api.sesResolver(r.sesion, 'p185'), '⚠️ el token recordado ya no resuelve');
  PRUEBAS.falso(/nueva-2026|largo/.test(JSON.stringify(ok)), 'y la respuesta no trae la clave ni su largo');
});

PRUEBAS.caso('`accesoDeCuenta_` prefiere el nombre canónico o el usuario a una variante compartida', () => {
  /* Si dos filas compartieran una variante en EMPRESAS, elegir la segunda en el selector abría la
     primera. Se busca primero por el canónico (lo que lista el selector) y por el usuario. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p185Hojas();
  hojas['Accesos'].push(['otra', 'sup-otra', 'supervisor', 'Otra Empresa, Helitec', '', '']);   // comparte la variante «Helitec»
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['accesoDeCuenta_']);
  PRUEBAS.igual((api.accesoDeCuenta_('Otra Empresa') || {}).canonical, 'Otra Empresa', 'elegir «Otra Empresa» abre Otra Empresa');
  PRUEBAS.igual((api.accesoDeCuenta_('Consorcio HELITEC') || {}).canonical, 'Consorcio HELITEC', 'elegir HELITEC abre HELITEC');
  PRUEBAS.igual((api.accesoDeCuenta_('helitec') || {}).canonical, 'Consorcio HELITEC', 'y por el usuario también');
  PRUEBAS.igual((api.accesoDeCuenta_('Helitec') || {}).canonical, 'Consorcio HELITEC', 'una variante compartida cae en la primera fila (segunda pasada), documentado');
});
