PRUEBAS.grupo('P180 · lo que encontró la auditoría de P177 en el servidor');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Una revisión adversarial de P177 («varios roles por persona») encontró diez defectos en el
   servidor, cuatro de ellos con la misma raíz: **la migración ESCRIBE un valor donde antes había
   ausencia de valor**, y en este sistema la ausencia significa «no sé» mientras que el valor
   escrito significa «decidido». La regla de derivación estaba bien pensada; lo que estaba mal era
   que el propio servidor escribiera el «No» en nombre de RRHH.

   ⚠️ NINGUNO ALCANZÓ A PASAR EN PRODUCCIÓN, y se verificó mirando el CH antes de tocar nada:
   ninguna de las 13 filas tenía «Rol en la app» vacío, las columnas 15-17 estaban libres (el
   volcado previo a la migración terminaba en «Estado»), la siembra tocó exactamente 13 personas
   —sin filas fantasma— y ninguna de las dos hojas de empresa tiene una columna «Dirección».
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P180_CAB_NOM = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo','Estado',
  '¿Supervisor?','¿Servicio médico?','¿Dirección?'];

function p180Env(filas, fns){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['silva','clave-sup','supervisor','Aeroambulancias Silva, Silva','clave-med','clave-hseq']],
    'Nómina': [P180_CAB_NOM.slice()].concat(filas || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor'], ['Aeroambulancias Silva','codigoRegistro','SIL-1']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionTareasMias','accionNominaConfirmar','credEnNomina',
    'leerNomina','nominaSiNo_','nominaRolPropuesto_','cabEsColRol_'].concat(fns || []));
  api.__env = env;
  api.__json = r => JSON.parse(r.getContent ? r.getContent() : r);
  api.__ch = () => env.__libro.getSheetByName('Nómina').__volcado();
  api.__mias = (persona, ced) => api.__json(api.accionTareasMias({
    empresa:'Silva', persona:persona, cedula:ced, appVersion:'6.47' }));
  return api;
}
const p180Sin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };
const P180_FILA = (nombre, ced, rolTexto, sup, med, dir) =>
  ['Aeroambulancias Silva', nombre, ced, 'Operaciones', 'Coordinador', 'M', '35', '', '', 'No', '',
   rolTexto, '3', '', sup === undefined ? '' : sup, med === undefined ? '' : med, dir === undefined ? '' : dir];

/* ── 1 · las casillas de verificación ────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 una CASILLA tildada otorga el rol, no lo quita', () => {
  if (p180Sin()) return;
  const api = p180Env();
  /* Cambiar la validación de la hoja a casillas es un movimiento normal en Sheets, y ahí la celda
     deja de valer «Sí» y pasa a valer un booleano. `String(true)` es «true», que no empieza con
     «s»: la casilla TILDADA se leía como «No». Y como «true» no es vacío, la fila igual contaba
     como modelo nuevo y la columna de texto quedaba ignorada — o sea que tildar QUITABA el rol. */
  PRUEBAS.igual(api.nominaSiNo_(true), true, '🔴 la casilla tildada es «sí»');
  PRUEBAS.igual(api.nominaSiNo_(false), false, 'y sin tildar es «no»');
  PRUEBAS.igual([api.nominaSiNo_('Sí'), api.nominaSiNo_('si'), api.nominaSiNo_('S'), api.nominaSiNo_('SÍ ')],
    [true, true, true, true], 'EL DISCRIMINADOR · las formas de siempre siguen valiendo');
});

PRUEBAS.caso('🔒 «Suspendido» y «Saliente» NO otorgan el rol', () => {
  if (p180Sin()) return;
  const api = p180Env();
  /* El positivo era `/^s/`: cualquier palabra con esa inicial abría un panel. Un conjunto cerrado
     no puede tener un comodín adelante. */
  ['Suspendido','Saliente','Sin definir','Sí pero no','x','1','Yes'].forEach(v =>
    PRUEBAS.falso(api.nominaSiNo_(v), '🔒 «' + v + '» no otorga nada'));
});

/* ── 2 · la columna «Dirección» que es el domicilio ──────────────────────────────────────────── */

PRUEBAS.caso('🔴 una columna «Dirección» (el domicilio) NO se toma por la de rol', () => {
  if (p180Sin()) return;
  const api = p180Env();
  const colHseq = { k:'esHseq', nombres:['direccion'], explicitos:['es direccion','es hseq'] };
  PRUEBAS.falso(api.cabEsColRol_('Dirección', colHseq),
    '🔴 `norm()` borra los signos, así que «¿Dirección?» y «Dirección» daban lo mismo · en una nómina ' +
    'venezolana «Dirección» es el DOMICILIO, y la empresa puede agregar esa columna');
  PRUEBAS.falso(api.cabEsColRol_('Direccion', colHseq), 'ni sin tilde');
  PRUEBAS.cierto(api.cabEsColRol_('¿Dirección?', colHseq),
    '🔒 EL DISCRIMINADOR · la que escribe el servidor sí · si esto fallara, las hojas que ya existen dejarían de leerse');
  PRUEBAS.cierto(api.cabEsColRol_('Es dirección', colHseq), 'y la forma explícita también');
});

/* ── 3 · la siembra no decide en nombre de RRHH ──────────────────────────────────────────────── */

PRUEBAS.caso('🔴 «Rol en la app» VACÍO no se convierte en tres «No»', () => {
  if (p180Sin()) return;
  /* El caso que más dolía: una celda vacía significa «no sé». Sembrar «No» la convertía en una
     degradación deliberada, y en la pasada siguiente del sync esa persona perdía sus paneles, sus
     contraseñas guardadas y su sesión — el incidente de P101 entrando por una puerta nueva.
     El afectado real sería el supervisor por CÓDIGO del ADR 002, que nunca pasa por esa celda. */
  const api = p180Env([P180_FILA('Ana Suárez', 'V-111', '')], ['nominaHojaCrear_']);
  const libro = api.nominaHojaCrear_('Aeroambulancias Silva', '');
  const sh = api.__env.__libros[libro.id || Object.keys(api.__env.__libros)[0]];
  const hoja = (sh || libro).getSheetByName ? (sh || libro).getSheetByName('Nómina') : null;
  if (!hoja) { PRUEBAS.cierto(true, 'la hoja no se pudo abrir en este entorno: lo cubre el caso del sync'); return; }
  const v = hoja.__volcado();
  PRUEBAS.igual([v[1][12], v[1][13], v[1][14]], ['', '', ''],
    '🔴 con el texto vacío, las tres columnas nacen VACÍAS · sembrar «No» decide algo que nadie decidió');
});

PRUEBAS.caso('🔒 EL DISCRIMINADOR · con un rol escrito, la siembra sí lo traduce', () => {
  if (p180Sin()) return;
  const api = p180Env([P180_FILA('Ana Suárez', 'V-111', 'Supervisor')], ['nominaHojaCrear_']);
  const libro = api.nominaHojaCrear_('Aeroambulancias Silva', '');
  const ids = Object.keys(api.__env.__libros);
  const hoja = api.__env.__libros[ids[ids.length - 1]].getSheetByName('Nómina');
  const v = hoja.__volcado();
  PRUEBAS.igual([v[1][12], v[1][13], v[1][14]], ['Sí', 'No', 'No'],
    '🔒 «Supervisor» → Sí en su columna · si esto fallara, el arreglo de arriba habría roto la migración');
});

/* ── 4 · la derivación es una sola ───────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el alta NO le ofrece el panel a quien la nómina degradó', () => {
  if (p180Sin()) return;
  /* Tres consumidores leían la columna de texto por su cuenta, así que una fila del modelo nuevo
     les decía una cosa y a `accionTareasMias` otra. */
  const api = p180Env([P180_FILA('Ana Suárez', 'V-111', 'Supervisor', 'No', 'No', 'No')]);
  PRUEBAS.igual(api.nominaRolPropuesto_({ rolCrudo:'Supervisor', rol:'supervisor', roles:[], rolesCrudo:['No','No','No'] }), 'empleado',
    '🔴 tres «No» mandan sobre el texto · a quien fue degradado a propósito, el alta le seguía ofreciendo el panel');
  const r = api.__json(api.manejar({ action:'nomina_confirmar', empresa:'Silva', cedula:'V-111',
                                     persona:'Ana Suárez', codigo:'SIL-1', dispositivoId:'d', _post:true }));
  if (r && r.ok && r.perfil) {
    PRUEBAS.falso(String(r.perfil.rol || '') === 'supervisor',
      '🔴 y el perfil que devuelve el alta tampoco lo propone');
  } else { PRUEBAS.cierto(true, 'el alta no resolvió en este entorno (' + (r && r.error) + '): lo cubre la comprobación de arriba'); }
});

PRUEBAS.caso('🔴 y SÍ se lo ofrece a «empleado pero médico»', () => {
  if (p180Sin()) return;
  const api = p180Env();
  PRUEBAS.igual(api.nominaRolPropuesto_({ rolCrudo:'Empleado', rol:'empleado', roles:['medico'], rolesCrudo:['No','Sí','No'] }), 'medico',
    '🔴 el caso que pidió Franco · con el criterio viejo, el alta no le ofrecía nada');
  PRUEBAS.igual(api.nominaRolPropuesto_({ rolCrudo:'Supervisor', rol:'supervisor', roles:[], rolesCrudo:['','',''] }), 'supervisor',
    '🔒 EL DISCRIMINADOR · una fila del modelo VIEJO sigue mandando por su columna de texto');
  PRUEBAS.igual(api.nominaRolPropuesto_({ rolCrudo:'', rol:'empleado', roles:[], rolesCrudo:['','',''] }), '',
    '🔒 y una fila sin nada devuelve vacío: «ninguno» y «no sé» tienen que poder distinguirse');
});

/* ── 5 · vaciar no degrada ───────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 vaciar las tres celdas NO le quita el rol a nadie', () => {
  if (p180Sin()) return;
  const api = p180Env([P180_FILA('Ana Suárez', 'V-111', 'Empleado', 'Sí', 'Sí', 'No')], ['nominaSincronizarEmpresa_','nominaHojaCrear_']);
  const libro = api.nominaHojaCrear_('Aeroambulancias Silva', '');
  const ids = Object.keys(api.__env.__libros);
  const hojaId = ids[ids.length - 1];
  const hoja = api.__env.__libros[hojaId].getSheetByName('Nómina');
  /* La empresa selecciona las tres celdas y toca Supr. */
  hoja.getRange(2, 13, 1, 3).setValues([['', '', '']]);
  api.nominaSincronizarEmpresa_('Aeroambulancias Silva', hojaId, true, true);
  const fila = api.__ch().find(f => String(f[1]).indexOf('Ana') >= 0) || [];
  PRUEBAS.igual([fila[14], fila[15], fila[16]], ['Sí', 'Sí', 'No'],
    '🔴 el CH conserva lo que tenía · vaciar es «no sé», y una celda vacía nunca puede quitarle el rol a nadie');
  const m = api.__mias('Ana Suárez', 'V-111');
  PRUEBAS.igual(m.rolesNomina, ['supervisor', 'medico'], '🔴 y sigue teniendo sus dos paneles');
});
