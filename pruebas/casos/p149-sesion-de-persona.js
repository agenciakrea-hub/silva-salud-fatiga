PRUEBAS.grupo('P149 · una sesión de persona no abre el panel');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Escalada de privilegios real, encontrada por la auditoría del 2026-09-08.

   `accionLogin` le emite a cada persona un token con `usuario = "persona:<empresa>|<cedula>"` y
   `vista:"empleado"`. `validarAcceso` —por donde entran las ~28 acciones del panel— comparaba SÓLO
   que el usuario del token coincidiera con el pedido, y devolvía la sesión. Ninguna acción vuelve a
   mirar `vista`: `accionSupervisor` hace `if (!acc) return error` y sigue de largo.

   O sea: un piloto con su propia contraseña podía postear `action=supervisor` con
   `usuario="persona:<su empresa>|<su cédula>"` y su token —los dos datos de su propio perfil— y
   recibir el panel completo. Y como el recorte de privacidad se aplica con
   `if (acc.vista === "supervisor" || acc.vista === "hseq")`, con `vista:"empleado"` NO CORRÍA:
   volvían los registros y el PVT CRUDOS de toda la empresa.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): el token se pide con `accionLogin`, como lo hace la app, y
   se usa contra `accionSupervisor`, como lo haría quien lo intente. Nada se arma a mano — armar el
   token con `sesEmitir` directo probaría la pieza, no que el llamador de verdad pueda llegar.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P149_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

function p149Env(fns){
  const reg = [P149_CAB_REG.slice()];
  const f = new Array(P149_CAB_REG.length).fill('');
  f[2] = 'Ana Suárez'; f[3] = 'ana@a.com'; f[4] = 'V-111'; f[8] = 'Consorcio HELITEC';
  f[9] = 'Operaciones'; f[10] = 'Piloto';
  reg.push(f);
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-del-panel','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana Suárez','V-111','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': reg,
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Creada','UltimoUso','Estado','PersonaCedula','Extra']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p149Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }

/* Le da a Ana su contraseña propia y devuelve el token que la app le guardaría en el teléfono.
   Entra por `accionCrearClave`/`accionLogin`, que es como pasa de verdad. */
function p149TokenDeAna(api){
  const crear = p149Json(api.accionCredencialCrear({
    empresa:'Consorcio HELITEC', cedula:'V-111', usuario:'Ana Suárez',
    pass:'mi-clave-personal-8', dispositivoId:'tel-ana', _post:true }));
  const login = p149Json(api.accionLogin({
    empresa:'Consorcio HELITEC', cedula:'V-111', pass:'mi-clave-personal-8',
    dispositivoId:'tel-ana', recordar:'1', _post:true }));
  return { crear: crear, login: login, token: login && login.sesion };
}

PRUEBAS.caso('🔒 el token de una persona NO abre `action=supervisor`', () => {
  const api = p149Env(['accionCredencialCrear','accionLogin','accionSupervisor']);
  const t = p149TokenDeAna(api);
  PRUEBAS.igual(t.login && t.login.ok, true, 'guarda: Ana pudo entrar con su contraseña · ' + JSON.stringify(t.login && t.login.error || ''));
  PRUEBAS.cierto(!!t.token, 'guarda: y la app le guardó un token · sin token no hay nada que medir');
  /* Los dos datos que Ana conoce de sí misma. La clave de sesión es
     "persona:" + norm(empresa) + "|" + cedulaNorm(cedula). */
  const usuario = 'persona:' + 'consorcio helitec' + '|' + '111';
  const r = p149Json(api.accionSupervisor({ usuario: usuario, pass: t.token, dispositivoId:'tel-ana' }));
  PRUEBAS.igual(r.ok, false,
    '🔒 el panel la rechaza · antes devolvía los registros CRUDOS de toda la empresa');
  PRUEBAS.igual('registros' in r, false, 'y no viaja ni un registro clínico de nadie');
  PRUEBAS.igual('pvt' in r, false, 'ni el PVT');
});

PRUEBAS.caso('🔒 tampoco puede marcar ausente a un compañero con ese token', () => {
  /* No era sólo leer: `accionAusenciaGuardar` entra por el mismo `validarAcceso` y tampoco mira
     `vista`. Escribir en el CH con una sesión de empleado es peor que leer. */
  const api = p149Env(['accionCredencialCrear','accionLogin','accionAusenciaGuardar']);
  const t = p149TokenDeAna(api);
  const usuario = 'persona:consorcio helitec|111';
  const r = p149Json(api.accionAusenciaGuardar({
    usuario: usuario, pass: t.token, dispositivoId:'tel-ana',
    empresa:'Consorcio HELITEC', cedula:'V-999', persona:'Otro Piloto',
    desde:'2026-09-09', hasta:'2026-09-10', motivo:'franco', _post:true }));
  PRUEBAS.igual(r.ok, false, '🔒 no puede escribir una ausencia de otra persona');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: la contraseña del PANEL sigue entrando', () => {
  /* Sin esto, un arreglo que rompiera `validarAcceso` entero daría verde arriba y habría dejado a
     los supervisores sin panel — que es lo que las 7 personas usan de verdad. */
  const api = p149Env(['accionSupervisor']);
  const r = p149Json(api.accionSupervisor({
    usuario:'helitec', pass:'clave-del-panel', dispositivoId:'tel-sup' }));
  PRUEBAS.igual(r.ok, true, '⚠️ el supervisor entra como siempre · ' + (r.error || ''));
});

PRUEBAS.caso('⚠️ y el panel PROPIO de la persona sigue funcionando', () => {
  /* `accionEmpleado` es lo único a lo que el cliente le manda este token, y NO pasa por
     `validarAcceso`: se autentica con nombre + cédula. Si el arreglo lo hubiera tocado, las 7
     personas se quedaban sin sus propias estadísticas. */
  const api = p149Env(['accionCredencialCrear','accionLogin','accionEmpleado']);
  const t = p149TokenDeAna(api);
  const r = p149Json(api.accionEmpleado({
    persona:'Ana Suárez', cedula:'V-111', empresa:'Consorcio HELITEC',
    pass: t.token, dispositivoId:'tel-ana' }));
  PRUEBAS.igual(r.ok, true, '⚠️ Ana sigue viendo lo suyo · ' + (r.error || ''));
});

PRUEBAS.caso('🔒 el token sigue siendo válido para lo que SÍ es suyo · no se invalidó de más', () => {
  /* El arreglo rechaza la sesión en `validarAcceso`, no la anula. Si hubiera borrado la fila de
     `Sesiones`, el intento fallido le cerraría la sesión propia a la persona — un modo de falla
     nuevo, y encima disparable por cualquiera que conozca su cédula. */
  const api = p149Env(['accionCredencialCrear','accionLogin','accionSupervisor','accionEmpleado']);
  const t = p149TokenDeAna(api);
  const usuario = 'persona:consorcio helitec|111';
  api.accionSupervisor({ usuario: usuario, pass: t.token, dispositivoId:'tel-ana' });   // el intento
  const r = p149Json(api.accionEmpleado({
    persona:'Ana Suárez', cedula:'V-111', empresa:'Consorcio HELITEC',
    pass: t.token, dispositivoId:'tel-ana' }));
  PRUEBAS.igual(r.ok, true, '🔒 después del intento rechazado, su panel propio sigue abriendo');
});
