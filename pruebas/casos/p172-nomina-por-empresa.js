PRUEBAS.grupo('P172 · la nómina la edita cada empresa en su propia hoja, y el CH la refleja');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Pedido de Franco (2026-09-10): «cada empresa tiene su hoja, se les comparte sólo esa, y pueden
   editarla; respaldada en el CH: cambian su hoja, se cambia en el CH, y ahí se cambia en la app».
   Decisiones del panel: fila borrada en la hoja de la empresa → «Baja» en el CH (no se borra); la
   tarea que crea la hoja recibe los correos; se copia al editar y cada 5 minutos.

   Todo corre sobre el `.gs` REAL en el emulador, con DOS libros: el CH y la hoja de la empresa
   (`SpreadsheetApp.create`). R17: se entra por `manejar` (el despachador de doGet/doPost) con el
   token de mantenimiento, y por las acciones reales (`accionLogin`, `accionTareasMias`…).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P172_TOKEN = () => (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
const P172_CAB_NOM = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];   // 13: como la hoja real de hoy
const P172_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P172_CAB_CRED = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso'];
const P172_CAB_SES = ['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada'];

/* El CH de prueba: Helitec (dos personas, una sin cédula) y Silva (una), con la hoja de 13
   columnas tal como está en producción hoy (sin «Estado»). */
function p172Env(fns, opciones) {
  const o = opciones || {};
  const env = GS.crearEntorno(Object.assign({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','claveA','supervisor','Consorcio HELITEC, Helitec','',''],
                ['silva','claveS','supervisor','Aeroambulancias Silva, Silva','','']],
    'Nómina': [P172_CAB_NOM.slice(),
      ['Helitec','Ana Suárez','V-111','Operaciones','Piloto','Femenino','34','0412-1112233','ana@h.com','Sí','PIL-1','Empleado','4'],
      ['Helitec','Beto Pérez','','Operaciones','Piloto','Masculino','40','','','Sí','PIL-2','',''],
      ['Silva','Carla Díaz','V-333','Dirección','Gerente','Femenino','45','','carla@s.com','No','','Supervisor','2']],
    'Registrados Fatiga': [P172_CAB_REG.slice()],
    'Credenciales': [P172_CAB_CRED.slice()],
    'Sesiones': [P172_CAB_SES.slice()],
    'Config Empresa': [['Empresa','Clave','Valor'], ['Consorcio HELITEC','codigoRegistro','HEL-2026'],
                       ['Consorcio HELITEC','sector','aviacion']],   // P174 · el discriminador del filtro
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  }, o.hojas || {}));
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionLogin','accionCredencialCrear','accionTareasMias','accionNominaConfirmar',
    'leerNomina','leerConfigEmpresa','valorConfigPropio','registroEnNomina_','nominaSincronizarTodas','nominaSincronizarDesdeEdicion',
    'rolNominaReconocido','normalizarRolNomina','credEnNomina'].concat(fns || []));
  api.__env = env;
  api.__ch = n => env.__libro.getSheetByName(n).__volcado();
  api.__mant = (tarea, extra) => JSON.parse(api.manejar(Object.assign({ action:'mantenimiento', token:P172_TOKEN(), tarea:tarea, _post:true }, extra || {})).getContent());
  api.__crear = (extra) => api.__mant('nomina_hoja_crear', Object.assign({ empresa:'Helitec', confirmar:'1' }, extra || {}));
  api.__hojaEmpresa = () => { const id = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'); return env.__libros[id].getSheetByName('Nómina'); };
  return api;
}
const p172Sin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };

/* ── crear la hoja ───────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ sin `confirmar`, `nomina_hoja_crear` SIMULA: dice qué haría y no crea nada', () => {
  if (p172Sin()) return;
  const api = p172Env();
  const r = api.__mant('nomina_hoja_crear', { empresa:'Helitec', editores:'rrhh@helitec.com' });
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.r.simulado, true, 'simulado');
  PRUEBAS.igual(r.r.empresa, 'Consorcio HELITEC', 'con la empresa canónica');
  PRUEBAS.igual(r.r.sembraria, 2, 'sembraría las dos de Helitec (no la de Silva)');
  PRUEBAS.igual(r.r.compartiria, ['rrhh@helitec.com'], 'y con quién la compartiría');
  PRUEBAS.igual(api.__env.__registro.libros.length, 0, '⚠️ y NO creó ningún libro');
  PRUEBAS.igual(api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'), '', 'ni anotó nada en Config');
});

PRUEBAS.caso('🔴 `nomina_hoja_crear` crea la hoja de la empresa: 12 columnas, sembrada, texto, listas cerradas, compartida, anotada, con disparadores', () => {
  if (p172Sin()) return;
  const api = p172Env();
  const r = api.__crear({ editores:'rrhh@helitec.com; jefe@helitec.com' });
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  const reg = api.__env.__registro;
  PRUEBAS.igual(reg.libros.length, 1, '🔴 un libro nuevo en Drive');
  PRUEBAS.cierto(/Consorcio HELITEC/.test(reg.libros[0].nombre) && /Silva Salud Fatiga/.test(reg.libros[0].nombre), 'con el nombre de la empresa y el del producto');
  const sh = api.__hojaEmpresa();
  const v = sh.__volcado();
  PRUEBAS.igual(v[0], ['Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad','Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
    '🔴 las 12 columnas: sin «Empresa» (la hoja ES la empresa) ni «Estado» (borrar la fila es la baja)');
  PRUEBAS.igual(v.length, 3, 'sembrada con las dos personas de Helitec');
  PRUEBAS.igual(v[1][0], 'Ana Suárez', 'Ana…');
  PRUEBAS.igual(v[2][0], 'Beto Pérez', '…y Beto');
  PRUEBAS.igual(v[1][1], 'V-111', 'con su cédula');
  PRUEBAS.cierto(v.every(f => f[0] !== 'Carla Díaz'), '⚠️ y NADIE de otra empresa');
  PRUEBAS.igual(sh.__formatoDe(2, 7), '@', 'R15 · texto plano (el teléfono con «+» no se vuelve fórmula)');
  PRUEBAS.igual(sh.__formatoDe(150, 2), '@', 'también en las filas vacías de abajo, donde van a escribir');
  const val = (col) => sh.getRange(2, col).getDataValidation();
  PRUEBAS.igual((val(9) && val(9).getCriteriaValues()[0]) || null, ['Sí','No'], '🔴 «¿Es piloto?» es una lista cerrada');
  PRUEBAS.igual((val(11) && val(11).getCriteriaValues()[0]) || null, ['Empleado','Supervisor','Servicio médico','Dirección'], '🔴 «Rol en la app» también');
  PRUEBAS.igual((val(12) && val(12).getCriteriaValues()[0]) || null, ['1','2','3','4','5'], 'y «Nivel de riesgo»');
  PRUEBAS.cierto(!!val(11) && val(11).getAllowInvalid() === false, 'sin permitir valores fuera de la lista');
  PRUEBAS.igual(sh.__protecciones().length, 1, 'el encabezado está protegido');
  PRUEBAS.cierto(sh.__protecciones()[0].isWarningOnly(), 'con aviso (la empresa es dueña de su hoja: se le avisa, no se le prohíbe)');
  PRUEBAS.igual(reg.compartidos.filter(c => c.email).map(c => c.email + ':' + c.rol), ['rrhh@helitec.com:editor','jefe@helitec.com:editor'], '🔴 compartida como EDITOR con los dos correos');
  PRUEBAS.cierto(reg.compartidos.some(c => c.rol === 'editores-no-comparten'), '🔒 y los editores no pueden volver a compartirla');
  PRUEBAS.cierto(reg.compartidos.some(c => c.rol === 'enlace:ANYONE_WITH_LINK:EDIT'), '🔴 y por ENLACE de edición (Franco: «se comparten con link de editor y listo»)');
  PRUEBAS.igual(r.r.porEnlace, true, 'y lo dice');
  PRUEBAS.igual(r.r.compartidos, ['rrhh@helitec.com','jefe@helitec.com'], 'y lo dice');
  PRUEBAS.igual(api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'), reg.libros[0].id, '🔴 el id quedó en Config Empresa');
  PRUEBAS.cierto(/docs\.google\.com/.test(api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaUrl')), 'con su enlace');
  PRUEBAS.cierto(/docs\.google\.com/.test(r.r.url), 'que la tarea devuelve');
  const tr = reg.triggers.map(t => t.getHandlerFunction() + (t.getTriggerSourceId() ? '@' + t.getTriggerSourceId() : ''));
  PRUEBAS.igual(tr.sort(), ['nominaSincronizarDesdeEdicion@' + reg.libros[0].id, 'nominaSincronizarTodas'].sort(), '🔴 dos disparadores: por edición de ESA hoja y por reloj');
  PRUEBAS.igual(reg.triggers.find(t => t.getHandlerFunction() === 'nominaSincronizarTodas').__cadaMin, 5, 'el reloj, cada 5 minutos');
});

PRUEBAS.caso('⚠️ la segunda vez no crea otra: devuelve la que hay', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const r = api.__crear();
  PRUEBAS.igual(r.r.yaExiste, true, 'ya existe');
  PRUEBAS.igual(api.__env.__registro.libros.length, 1, 'un solo libro');
  PRUEBAS.igual(api.__env.__registro.triggers.length, 2, 'y los disparadores no se duplican');
});

PRUEBAS.caso('🔒 el id y el enlace de la hoja NO viajan al panel', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const cfg = api.leerConfigEmpresa('Consorcio HELITEC');
  PRUEBAS.falso('nominaHojaId' in cfg || 'nominaHojaUrl' in cfg || 'nominaSyncUltimo' in cfg || 'nominaSyncError' in cfg,
    '🔒 `leerConfigEmpresa` —lo que va en `config` a supervisor, médico, dirección y demo— no los trae');
  /* P174 · `codigoRegistro` dejó de viajar (se sumó a `CONFIG_SOLO_SERVIDOR`: con él se llama
     `nomina_personas`, que no pide contraseña, y sale la lista de nombres que esta misma vista
     tiene prohibida). El discriminador pasa a una clave que SÍ tiene que llegar al panel. */
  PRUEBAS.falso('codigoRegistro' in cfg, '🔒 P174 · y el código de registro tampoco');
  PRUEBAS.falso('codigoSupervisor' in cfg || 'demo_pass' in cfg, '🔒 P174 · ni el de supervisor ni la clave de la demostración');
  PRUEBAS.cierto('sector' in cfg, 'EL DISCRIMINADOR · las claves de siempre sí viajan');
  PRUEBAS.cierto(!!api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'), 'y el servidor los lee por `valorConfigPropio`');
});

PRUEBAS.caso('⚠️ los valores de la lista de roles son los que el servidor entiende', () => {
  if (p172Sin()) return;
  const api = p172Env();
  ['Empleado','Supervisor','Servicio médico','Dirección'].forEach(v => PRUEBAS.cierto(api.rolNominaReconocido(v), v + ' se reconoce'));
  PRUEBAS.igual(api.normalizarRolNomina('Servicio médico'), 'medico', 'Servicio médico → medico');
  PRUEBAS.igual(api.normalizarRolNomina('Dirección'), 'hseq', 'Dirección → hseq');
});

/* ── el sync ─────────────────────────────────────────────────────────────────────────────── */

/* Deja la hoja de la empresa como la editaría RRHH: teléfono nuevo de Ana, Beto ahora es
   Supervisor, entra Dora (nueva), y Beto… sigue. `quitar` saca a alguien. */
function p172Editar(api, cambios) {
  const sh = api.__hojaEmpresa();
  const v = sh.__volcado();
  const filas = v.slice(1).filter(f => !(cambios.quitar || []).includes(f[0]));
  filas.forEach(f => {
    if (f[0] === 'Ana Suárez' && cambios.telAna) f[6] = cambios.telAna;
    if (f[0] === 'Beto Pérez' && cambios.rolBeto) f[10] = cambios.rolBeto;
    if (f[0] === 'Ana Suárez' && cambios.cedAna !== undefined) f[1] = cambios.cedAna;
  });
  (cambios.agregar || []).forEach(f => filas.push(f));
  sh.clear();
  sh.getRange(1, 1, 1, v[0].length).setValues([v[0]]);
  if (filas.length) sh.getRange(2, 1, filas.length, v[0].length).setValues(filas);
}
const P172_DORA = ['Dora Gil','V-444','Mantenimiento','Técnica','Femenino','29','0414-5556677','dora@h.com','No','','Empleado','3'];

PRUEBAS.caso('⚠️ `nomina_sync` sin confirmar INFORMA qué cambiaría y no toca el CH', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  p172Editar(api, { telAna:'0412-9999999', rolBeto:'Supervisor', agregar:[P172_DORA] });
  const antes = JSON.stringify(api.__ch('Nómina'));
  const r = api.__mant('nomina_sync', { empresa:'Helitec' });
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.r.simulado, true, 'simulado');
  const e = r.r.empresas[0];
  PRUEBAS.igual(e.agregadas, ['Dora Gil'], 'diría que agrega a Dora');
  PRUEBAS.igual(e.actualizadas.map(a => a.nombre + ':' + a.campos.join('+')).sort(), ['Ana Suárez:telefono','Beto Pérez:rol'], 'y qué campo cambia de quién');
  PRUEBAS.igual(e.bajas, [], 'sin bajas');
  PRUEBAS.igual(JSON.stringify(api.__ch('Nómina')), antes, '⚠️ y el CH quedó IGUAL');
});

PRUEBAS.caso('🔴 con confirmar, el CH refleja la hoja: actualiza, agrega y marca «Baja» (no borra)', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  p172Editar(api, { telAna:'0412-9999999', rolBeto:'Supervisor', agregar:[P172_DORA] });
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  const ch = api.__ch('Nómina');
  PRUEBAS.igual(ch[0][13], 'Estado', '🔴 la hoja del CH ganó la columna «Estado» al final (las 13 de antes no se mueven)');
  const ana = ch.find(f => f[1] === 'Ana Suárez'), beto = ch.find(f => f[1] === 'Beto Pérez'), dora = ch.find(f => f[1] === 'Dora Gil');
  PRUEBAS.igual(ana[7], '0412-9999999', '🔴 el teléfono nuevo de Ana está en el CH');
  PRUEBAS.igual(beto[11], 'Supervisor', '🔴 y el rol nuevo de Beto (desde la hoja de la empresa se cambian roles)');
  PRUEBAS.cierto(!!dora, '🔴 Dora entró al CH');
  PRUEBAS.igual(dora[0], 'Consorcio HELITEC', 'con la empresa CANÓNICA en la columna Empresa');
  PRUEBAS.igual(dora[2], 'V-444', 'y su cédula');
  PRUEBAS.igual(String(dora[13] || ''), '', 'activa (Estado vacío)');
  PRUEBAS.cierto(ch.some(f => f[1] === 'Carla Díaz'), '⚠️ y Silva no se tocó');
  PRUEBAS.cierto(/alta 1 · cambios 2 · bajas 0/.test(api.valorConfigPropio('Consorcio HELITEC', 'nominaSyncUltimo')), 'el último sync quedó anotado en Config');
  const bit = api.__ch('Bitácora');
  PRUEBAS.cierto(bit.some(f => f[2] === 'nomina_sync' && f[3] === 'Dora Gil'), 'y cada cambio fue a la bitácora');

  /* Ahora RRHH saca a Beto de su hoja. */
  p172Editar(api, { quitar:['Beto Pérez'] });
  const r2 = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e2 = r2.r.empresas[0];
  PRUEBAS.igual(e2.bajas, ['Beto Pérez'], '🔴 Beto queda de baja');
  const ch2 = api.__ch('Nómina');
  const beto2 = ch2.find(f => f[1] === 'Beto Pérez');
  PRUEBAS.cierto(!!beto2, '🔴 su fila SIGUE en el CH (decisión: marcar, no borrar)');
  PRUEBAS.igual(beto2[13], 'Baja', 'con Estado = Baja');
  PRUEBAS.igual(ch2.length, ch.length, 'ninguna fila se borró');
});

PRUEBAS.caso('🔴 una persona de baja desaparece de la nómina que ve todo el mundo, y vuelve si la empresa la vuelve a cargar', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  p172Editar(api, { quitar:['Ana Suárez'] });
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.falso(api.leerNomina().some(r => r.nombre === 'Ana Suárez'), '🔴 `leerNomina()` no la trae (alta, ¿eres tú?, cobertura, listas…)');
  PRUEBAS.cierto(api.leerNomina(true).some(r => r.nombre === 'Ana Suárez' && r.baja), 'sólo con `incluirBajas`, y marcada');
  PRUEBAS.falso(!!api.registroEnNomina_('V-111', 'Helitec'), '🔴 el alta la rechaza (P165)');
  const conf = JSON.parse(api.accionNominaConfirmar({ empresa:'Helitec', cedula:'V-111', codigo:'HEL-2026', dispositivoId:'d', _post:true }).getContent());
  PRUEBAS.igual(conf.ok, false, '🔴 «¿eres tú?» no la encuentra · ' + (conf.motivo || conf.error || ''));
  PRUEBAS.igual(api.credEnNomina('Consorcio HELITEC', 'V-111').persona, null, '🔴 y no puede crearse contraseña (credEnNomina también la salta)');

  /* RRHH la vuelve a cargar: se reactiva. */
  const sh = api.__hojaEmpresa();
  sh.appendRow(['Ana Suárez','V-111','Operaciones','Piloto','Femenino','34','0412-1112233','ana@h.com','Sí','PIL-1','Empleado','4']);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.igual(r.r.empresas[0].reactivadas, ['Ana Suárez'], '🔴 reactivada');
  PRUEBAS.cierto(api.leerNomina().some(r => r.nombre === 'Ana Suárez'), 'y vuelve a estar en la nómina activa');
  PRUEBAS.igual(api.__ch('Nómina').filter(f => f[1] === 'Ana Suárez').length, 1, 'sin duplicar la fila');
});

PRUEBAS.caso('🔴 con contraseña y todo, una persona de baja NO entra, y sus sesiones se cerraron al darla de baja', () => {
  if (p172Sin()) return;
  const api = p172Env();
  const cr = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez', pass:'miClave123', codigo:'HEL-2026', dispositivoId:'d', _post:true }).getContent());
  PRUEBAS.igual(cr.ok, true, 'precondición · Ana creó su contraseña · ' + (cr.error || cr.motivo || ''));
  const l1 = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123', dispositivoId:'d2', _post:true }).getContent());
  PRUEBAS.igual(l1.ok, true, 'precondición · entra · ' + (l1.error || ''));
  PRUEBAS.cierto(api.__ch('Sesiones').some(f => f[11] === 'activa'), 'con una sesión activa');
  api.__crear();
  p172Editar(api, { quitar:['Ana Suárez'] });
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.falso(api.__ch('Sesiones').some(f => f[11] === 'activa'), '🔴 la baja cerró su sesión (no caducan solas: S4)');
  const l2 = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123', dispositivoId:'d3', _post:true }).getContent());
  PRUEBAS.igual(l2.ok, false, '🔴 y con la contraseña correcta ya no entra');
  PRUEBAS.igual(l2.motivo, 'baja', 'con el motivo dicho (no «contraseña incorrecta»: no tiene nada que corregir)');
  const tm = JSON.parse(api.accionTareasMias({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111', dispositivoId:'d', _post:true }).getContent());
  PRUEBAS.igual(tm.motivo, 'baja', 'y sus tareas dicen «baja» sin consumir el freno');
});

PRUEBAS.caso('⚠️ RED DE SEGURIDAD · con la hoja de la empresa VACÍA no se da de baja a nadie', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const sh = api.__hojaEmpresa(); const cab = sh.__volcado()[0];
  sh.clear(); sh.getRange(1, 1, 1, cab.length).setValues([cab]);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.igual(e.bajas, [], '⚠️ cero bajas');
  PRUEBAS.cierto(/vacia/.test(e.omitido || ''), 'y lo dice');
  PRUEBAS.igual(api.leerNomina().filter(x => /helitec/i.test(x.empresa)).length, 2, 'las dos de Helitec siguen activas');
  PRUEBAS.cierto(/aviso/.test(api.valorConfigPropio('Consorcio HELITEC', 'nominaSyncError')), 'y el aviso quedó en Config');
});

PRUEBAS.caso('⚠️ RED DE SEGURIDAD · sin la columna «Nombre y apellido», el sync se detiene y avisa', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const sh = api.__hojaEmpresa();
  sh.getRange(1, 1).setValue('Persona X');   // alguien renombró el encabezado
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.cierto(/Nombre y apellido/.test(e.error || ''), '⚠️ error explícito');
  PRUEBAS.igual(e.bajas.length + e.agregadas.length + e.actualizadas.length, 0, 'y ningún cambio');
  PRUEBAS.igual(api.leerNomina().filter(x => /helitec/i.test(x.empresa)).length, 2, 'el CH intacto');
});

PRUEBAS.caso('⚠️ la hoja se lee POR ENCABEZADO: columnas reordenadas y «Correo» en vez de «Email» siguen andando', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const sh = api.__hojaEmpresa();
  sh.clear();
  sh.getRange(1, 1, 3, 4).setValues([
    ['Correo', 'Nombre y apellido', 'Cédula', 'Teléfono'],
    ['ana@nuevo.com', 'Ana Suárez', 'V-111', '0412-1112233'],
    ['beto@nuevo.com', 'Beto Pérez', '', '']]);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.cierto(!e.error, 'sin error · ' + (e.error || ''));
  PRUEBAS.cierto(e.actualizadas.some(a => a.nombre === 'Ana Suárez' && a.campos.includes('email')), 'leyó el correo de la columna reordenada');
  PRUEBAS.igual(api.__ch('Nómina').find(f => f[1] === 'Ana Suárez')[8], 'ana@nuevo.com', 'y lo escribió en el CH');
  PRUEBAS.cierto(e.columnasFaltantes.length > 0, 'e informa qué columnas no encontró (las que faltan quedan vacías, no rompen)');
});

PRUEBAS.caso('⚠️ LA CÉDULA ES PEGAJOSA · vacía en la hoja de la empresa, se conserva la del CH', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  p172Editar(api, { cedAna:'' });
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.igual(api.__ch('Nómina').find(f => f[1] === 'Ana Suárez')[2], 'V-111', '⚠️ la cédula del CH sigue: es identidad, no un dato más');
  PRUEBAS.igual(r.r.empresas[0].sinCambios, 2, 'y no cuenta como cambio');
});

PRUEBAS.caso('⚠️ una persona repetida en la hoja de la empresa se informa y no duplica', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  api.__hojaEmpresa().appendRow(['Ana Suárez','V-111','Otro','Otro','','','','','','','','']);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.igual(r.r.empresas[0].duplicadas, ['Ana Suárez'], 'la segunda Ana se informa');
  PRUEBAS.igual(api.__ch('Nómina').filter(f => f[1] === 'Ana Suárez').length, 1, 'y el CH tiene una sola');
});

/* ── los disparadores ────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el disparador por edición sincroniza SÓLO la empresa de esa hoja; el reloj, todas', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  api.__mant('nomina_hoja_crear', { empresa:'Silva', confirmar:'1' });
  const idH = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId');
  const libroH = api.__env.__libros[idH];
  p172Editar(api, { agregar:[P172_DORA] });
  const r = api.nominaSincronizarDesdeEdicion({ source: libroH });
  PRUEBAS.igual(r.ok, true, 'responde');
  PRUEBAS.igual(r.empresas.length, 1, '🔴 una sola empresa');
  PRUEBAS.igual(r.empresas[0].empresa, 'Consorcio HELITEC', 'la de esa hoja');
  PRUEBAS.igual(r.empresas[0].agregadas, ['Dora Gil'], 'y aplicó');
  const r2 = api.nominaSincronizarDesdeEdicion({ source: libroH });
  PRUEBAS.cierto(/reciente/.test(r2.omitido || ''), '⚠️ una segunda edición enseguida NO vuelve a copiar (RRHH tipeando una fila): lo levanta el reloj');
  const rt = api.nominaSincronizarTodas();
  PRUEBAS.igual(rt.empresas.map(e => e.empresa).sort(), ['Aeroambulancias Silva','Consorcio HELITEC'], 'el reloj recorre las dos');
  const est = api.__mant('nomina_triggers', { accion:'estado' });
  PRUEBAS.igual(est.r.estado.filter(t => t.handler === 'nominaSincronizarDesdeEdicion').length, 2, 'estado: un disparador de edición por hoja');
  PRUEBAS.igual(est.r.estado.filter(t => t.handler === 'nominaSincronizarTodas').length, 1, 'y un solo reloj');
  const off = api.__mant('nomina_triggers', { accion:'desactivar' });
  PRUEBAS.igual(off.r.quitados, 3, 'desactivar los quita');
  const on = api.__mant('nomina_triggers', { accion:'activar' });
  PRUEBAS.igual(on.r.estado.length, 3, 'y activar los repone');
});

PRUEBAS.caso('⚠️ `nomina_hoja_info` dice enlace, último sync, activas y bajas', () => {
  if (p172Sin()) return;
  const api = p172Env();
  const r0 = api.__mant('nomina_hoja_info', { empresa:'Helitec' });
  PRUEBAS.igual(r0.r.tieneHoja, false, 'sin hoja todavía');
  api.__crear();
  p172Editar(api, { quitar:['Beto Pérez'] });
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const r = api.__mant('nomina_hoja_info', { empresa:'Helitec' });
  PRUEBAS.igual(r.r.tieneHoja, true, 'con hoja');
  PRUEBAS.igual([r.r.activas, r.r.bajas], [1, 1], 'una activa, una baja');
  PRUEBAS.cierto(/bajas 1/.test(r.r.ultimoSync), 'y el último sync');
  PRUEBAS.cierto(!/V-111|V-333|V-444/.test(JSON.stringify(r)), '🔒 sin una sola cédula en la respuesta');
});

/* ── lo que encontró la revisión adversarial (2026-09-10) ────────────────────────────────── */

PRUEBAS.caso('🔴 REVISIÓN · un homónimo con OTRA cédula es otra persona: no pisa la fila que ya tiene cédula', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  api.__hojaEmpresa().appendRow(['Ana Suárez','V-999','Mantenimiento','Técnica','Femenino','29','','','No','','Empleado','3']);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.igual(e.agregadas, ['Ana Suárez'], '🔴 la segunda Ana se AGREGA como persona nueva');
  const anas = api.__ch('Nómina').filter(f => f[1] === 'Ana Suárez');
  PRUEBAS.igual(anas.map(f => f[2]).sort(), ['V-111','V-999'], '🔴 dos filas, cada una con su cédula · antes el respaldo por nombre le pisaba la cédula a la primera');
  PRUEBAS.igual(anas.find(f => f[2] === 'V-111')[3], 'Operaciones', 'y la primera conserva sus datos');
  const r2 = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.igual(r2.r.empresas[0].actualizadas.length + r2.r.empresas[0].agregadas.length + r2.r.empresas[0].bajas.length, 0, 'y la corrida siguiente no oscila: cero cambios');
});

PRUEBAS.caso('🔴 REVISIÓN · la hoja trae la cédula que al CH le faltaba: se completa esa fila, no se duplica', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  p172Editar(api, {});
  const sh = api.__hojaEmpresa(); const v = sh.__volcado();
  const fBeto = v.findIndex(f => f[0] === 'Beto Pérez') + 1;
  sh.getRange(fBeto, 2).setValue('V-222');
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.igual(e.agregadas, [], 'no agrega');
  PRUEBAS.cierto(e.actualizadas.some(a => a.nombre === 'Beto Pérez' && a.campos.includes('cedula')), '🔴 completa la cédula de Beto');
  PRUEBAS.igual(api.__ch('Nómina').filter(f => f[1] === 'Beto Pérez').length, 1, 'una sola fila de Beto');
});

PRUEBAS.caso('🔴 REVISIÓN · una columna que la empresa borró o renombró NO borra ese dato en el CH', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const sh = api.__hojaEmpresa();
  sh.getRange(1, 11).setValue('Perfil');   // «Rol en la app» → «Perfil»: el sync ya no la encuentra
  const v = sh.__volcado(); const fA = v.findIndex(f => f[0] === 'Ana Suárez') + 1;
  sh.getRange(fA, 7).setValue('0412-0000000');   // y un cambio real en otra columna
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.cierto(e.columnasFaltantes.includes('Rol en la app'), 'informa la columna que no encontró');
  const ana = api.__ch('Nómina').find(f => f[1] === 'Ana Suárez');
  PRUEBAS.igual(ana[11], 'Empleado', '🔴 el rol del CH se conserva · antes quedaba vacío para toda la empresa');
  PRUEBAS.igual(ana[7], '0412-0000000', 'y el cambio de la columna que sí está, entra');
});

PRUEBAS.caso('🔴 REVISIÓN · una fila repetida en el CH marcada «Baja» no bloquea a quien sigue teniendo su fila activa', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__env.__libro.getSheetByName('Nómina').appendRow(['Consorcio HELITEC','Ana Suárez','V-111','Otro','Otro','','','','','','','','']);   // la repetida, con alias distinto
  api.__crear();
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const anas = api.__ch('Nómina').filter(f => f[1] === 'Ana Suárez');
  PRUEBAS.igual(anas.length, 2, 'las dos filas siguen');
  PRUEBAS.cierto(anas.some(f => f[13] === 'Baja') && anas.some(f => !f[13]), 'la repetida quedó de baja, la buena activa');
  const cr = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez', pass:'miClave123', codigo:'HEL-2026', dispositivoId:'d', _post:true }).getContent());
  PRUEBAS.igual(cr.ok, true, 'puede crear su contraseña · ' + (cr.error || cr.motivo || ''));
  const l = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'miClave123', dispositivoId:'d2', _post:true }).getContent());
  PRUEBAS.igual(l.ok, true, '🔴 y entra: una fila duplicada de baja no es una baja');
});

PRUEBAS.caso('⚠️ REVISIÓN · una fila con SÓLO el nombre (alguien tipeando) no entra al CH todavía', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  api.__hojaEmpresa().appendRow(['Pedro Gómez','','','','','','','','','','','']);
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.igual(e.agregadas, [], 'no se agrega');
  PRUEBAS.igual(e.incompletas, ['Pedro Gómez'], 'se informa como incompleta');
  PRUEBAS.falso(api.__ch('Nómina').some(f => f[1] === 'Pedro Gómez'), 'y no queda fila fantasma en el CH');
});

PRUEBAS.caso('⚠️ REVISIÓN · sin la pestaña «Nómina» el sync se detiene y avisa; no lee otra pestaña', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const id = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId');
  const libro = api.__env.__libros[id];
  libro.insertSheet('Borrador').appendRow(['Nombre y apellido','Cédula']);
  libro.getSheetByName('Nómina').setName('Personal 2026');
  const r = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const e = r.r.empresas[0];
  PRUEBAS.cierto(/pestaña/.test(e.error || ''), 'error explícito');
  PRUEBAS.igual(api.leerNomina().filter(x => /helitec/i.test(x.empresa)).length, 2, 'y nadie de baja');
  PRUEBAS.cierto(/pestaña/.test(api.valorConfigPropio('Consorcio HELITEC', 'nominaSyncError')), '⚠️ el error temprano TAMBIÉN queda en Config (antes se perdía)');
});

PRUEBAS.caso('⚠️ REVISIÓN · un nombre que empieza con «=» no llega como fórmula ni al CH ni a la bitácora', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  /* `setValues` y no `appendRow`: la hoja de la empresa está en formato «@», así que el texto queda
     tal cual (el emulador modela que `appendRow` lo volvería `#ERROR!`, que es otro caso). */
  const shX = api.__hojaEmpresa(); shX.getRange(shX.getLastRow() + 1, 1, 1, 12).setValues([['=IMPORTXML("https://x/";"//a")','V-555','Op','Op','','','','','','','','']]);
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const nombres = api.__ch('Nómina').map(f => String(f[1]));
  PRUEBAS.falso(nombres.some(n => /^=/.test(n)), 'en el CH el nombre no empieza con =');
  PRUEBAS.falso(api.__ch('Bitácora').some(f => /^=|#ERROR/.test(String(f[3]))), '⚠️ y la bitácora tampoco (va por filaAgregar_, no appendRow)');
});

PRUEBAS.caso('⚠️ REVISIÓN · `nomina_triggers desactivar` con una empresa sin hoja no quita NADA', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const r = api.__mant('nomina_triggers', { accion:'desactivar', empresa:'Silva' });
  PRUEBAS.igual(r.ok, false, 'rechaza');
  PRUEBAS.igual(api.__env.__registro.triggers.length, 2, 'y los disparadores de Helitec siguen');
  PRUEBAS.cierto(api.__env.__registro.triggers.every(t => t.getHandlerFunction() !== 'nominaSincronizarDesdeEdicion' || t.getEventType() === 'ON_CHANGE'), 'y el de la hoja es por CAMBIO (borrar una fila no dispara onEdit)');
});

PRUEBAS.caso('⚠️ REVISIÓN · el sync no usa el candado global de la app, y dos syncs a la vez no se pisan', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const props = api.__env.PropertiesService.getScriptProperties();
  props.setProperty('nomina_sync_en_curso', String(Date.now()));   // otro sync corriendo
  const r = api.nominaSincronizarTodas();
  PRUEBAS.igual(r.ok, false, 'el segundo espera');
  props.deleteProperty('nomina_sync_en_curso');
  PRUEBAS.igual(api.nominaSincronizarTodas().ok, true, 'y con la bandera libre corre');
  PRUEBAS.falso(/getScriptLock/.test((CTX.gs.match(/function nominaSincronizarTodas[\s\S]*?\n\}/) || [''])[0]), '⚠️ sin getScriptLock: la app no espera al sync para guardar');
});

PRUEBAS.caso('⚠️ la hoja se siembra con los valores EXACTOS de las listas («supervisor» → «Supervisor», «Si» → «Sí»)', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__env.__libro.getSheetByName('Nómina').getRange(2, 10, 1, 3).setValues([['Si', 'PIL-1', 'supervisor']]);   // como está la hoja real de Silva
  api.__crear();
  const v = api.__hojaEmpresa().__volcado();
  const ana = v.find(f => f[0] === 'Ana Suárez');
  PRUEBAS.igual([ana[8], ana[10]], ['Sí', 'Supervisor'], '⚠️ nace válida para su propia lista');
  const r = api.__mant('nomina_sync', { empresa:'Helitec' });
  PRUEBAS.cierto(r.r.empresas[0].actualizadas.some(a => a.nombre === 'Ana Suárez'), 'y el primer sync lo escribe así en el CH (que lo entiende igual)');
});

PRUEBAS.caso('⚠️ `rehacer=1` reemplaza la hoja sólo si no tiene cambios sin copiar; la vieja va a la papelera', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const id1 = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId');
  api.__hojaEmpresa().appendRow(P172_DORA);
  const r0 = api.__crear({ rehacer:'1' });
  PRUEBAS.igual(r0.ok, false, 'con cambios sin copiar, se niega');
  PRUEBAS.igual(api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'), id1, 'y la hoja sigue siendo la misma');
  api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  const r = api.__crear({ rehacer:'1' });
  PRUEBAS.igual(r.ok, true, 'ya copiado, rehace');
  const id2 = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId');
  PRUEBAS.cierto(id2 && id2 !== id1, 'hoja nueva anotada');
  PRUEBAS.cierto((api.__env.__registro.papelera || []).includes(id1), 'la vieja en la papelera');
  PRUEBAS.igual(api.__hojaEmpresa().__volcado().length, 4, 'sembrada con las tres (Dora incluida)');
  PRUEBAS.falso(api.__env.__registro.triggers.some(t => t.getTriggerSourceId() === id1), 'sin disparadores colgados de la vieja');
});

PRUEBAS.caso('⚠️ `nomina_hoja_compartir` vuelve a compartir una hoja existente, y `nomina_hoja_info`/`quien_soy` dicen de quién es y cómo está', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const r = api.__mant('nomina_hoja_compartir', { empresa:'Helitec', editores:'nuevo@helitec.com' });
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.r.compartidos, ['nuevo@helitec.com'], 'agregó el correo');
  PRUEBAS.igual(r.r.drive.acceso, 'ANYONE_WITH_LINK', 'por enlace');
  PRUEBAS.igual(r.r.drive.permiso, 'EDIT', 'de edición');
  const info = api.__mant('nomina_hoja_info', { empresa:'Helitec' });
  PRUEBAS.cierto(!!info.r.drive && /@/.test(info.r.drive.dueno), 'info dice el dueño');
  const q = api.__mant('quien_soy', { hoja: api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId') });
  PRUEBAS.cierto(/@/.test(q.r.efectivo), 'y quien_soy, la cuenta con la que corre el endpoint');
  PRUEBAS.igual(api.__mant('nomina_hoja_compartir', { empresa:'Silva' }).ok, false, 'sin hoja, se niega');
});

PRUEBAS.caso('🔴 P173 · el reloj NO abre la hoja si no cambió desde el último sync (la cola de Apps Script frenaba la app)', () => {
  if (p172Sin()) return;
  const api = p172Env();
  api.__crear();
  const id = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId');
  const libro = api.__env.__libros[id];
  libro.__tocar(1000);
  PRUEBAS.igual(api.nominaSincronizarTodas().empresas[0].omitido, null, 'la primera corrida sí mira la hoja');
  const r2 = api.nominaSincronizarTodas().empresas[0];
  PRUEBAS.cierto(/no cambio/.test(r2.omitido || ''), '🔴 la segunda, sin tocar nada, se saltea · medido en producción: 95 s de cola por corrida completa');
  PRUEBAS.igual(r2.agregadas.length + r2.actualizadas.length + r2.bajas.length, 0, 'y no toca el CH');
  libro.getSheetByName('Nómina').appendRow(P172_DORA);
  libro.__tocar();
  const r3 = api.nominaSincronizarTodas().empresas[0];
  PRUEBAS.igual(r3.agregadas, ['Dora Gil'], '🔴 EL DISCRIMINADOR · si la hoja SÍ cambió, sincroniza igual');
  const r4 = api.__mant('nomina_sync', { empresa:'Helitec' });
  PRUEBAS.igual(r4.r.empresas[0].omitido, null, '⚠️ y la tarea a mano nunca se saltea: informa siempre');
});

PRUEBAS.caso('🔒 la tarea exige el token, como todas', () => {
  if (p172Sin()) return;
  const api = p172Env();
  const r = JSON.parse(api.manejar({ action:'mantenimiento', token:'no', tarea:'nomina_hoja_crear', empresa:'Helitec', confirmar:'1', _post:true }).getContent());
  PRUEBAS.igual(r.ok, false, 'rechazada');
  PRUEBAS.igual(api.__env.__registro.libros.length, 0, 'y no creó nada');
});
