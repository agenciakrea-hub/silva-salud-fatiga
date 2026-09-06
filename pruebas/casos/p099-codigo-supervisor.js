
PRUEBAS.grupo('P099 · el código de supervisor: propone un rol, y nunca bloquea el alta');

/* Lo que resuelve: hoy quien se da de alta desde la nómina queda como empleado, y para llegar al
   panel tiene que ir a editar su perfil, marcar una casilla y escribir una contraseña que alguien
   le pasó por fuera de la app. El ADR 002 decidió que el rol se PROPONE (nómina o código) y se
   CONFIRMA (contraseña de empresa, lo único que autoriza). La nómina ya propone —columna L— pero
   hay que cargarla; el código funciona desde el primer día.

   ⚠️ LA DIFERENCIA QUE ESTE ARCHIVO PROTEGE: el código de EMPRESA rechaza el pedido entero si está
   mal, y así tiene que ser — es el que decide si la persona puede ver la lista de nombres. El de
   SUPERVISOR no puede hacer eso: es opcional, y un código equivocado no puede impedirle a alguien
   registrarse. Si alguna vez pasa por `puertaCodigo`, se rompe esa garantía sin que nada avise. */

function p099Env(config, nomina){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(config || []),
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
              .concat(nomina || [['Helitec','Ana Suárez','V-111','Op','Piloto','F','34','','','Sí','','','4']]),
    'Registrados Fatiga': [["Fecha de registro","Última actualización","Nombre"]],
    'Identidades': [["Variante","Empresa","Cedula","ResueltoPor","Como","Registros","PrimeraVez","UltimaVez"]],
    'Accesos': [["Usuario","Contraseña","Rol","Empresas"]],
  });
}

PRUEBAS.caso('con el código correcto, se propone supervisor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111',
    codigoSup:'JEFE-2026', dispositivoId:'d1' }).getContent());
  PRUEBAS.cierto(r.ok, 'el alta funciona');
  PRUEBAS.igual(r.perfil.rol, 'supervisor', '⚠️ el código propone el rol');
  PRUEBAS.igual(r.perfil.rolOrigen, 'codigo', 'y se dice de dónde salió, para que la pantalla no mienta');
});

PRUEBAS.caso('⚠️ con el código EQUIVOCADO, el alta sigue funcionando igual', () => {
  /* EL CASO QUE MÁS IMPORTA. Si esto falla, un código mal tipeado deja a alguien sin poder
     registrarse — y esa persona no necesitaba el código para nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111',
    codigoSup:'CUALQUIER-COSA', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(r.ok, '⚠️ el alta NO se bloquea por un código de supervisor mal escrito');
  PRUEBAS.falso(r.perfil.rol === 'supervisor', 'y no se propone nada');
  PRUEBAS.igual(r.perfil.rolOrigen, '', 'ni se dice que vino de un código');
});

PRUEBAS.caso('sin código, el alta es exactamente la de siempre', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111', dispositivoId:'d3' }).getContent());
  PRUEBAS.cierto(r.ok, 'entra igual');
  PRUEBAS.igual(r.perfil.rolOrigen, '', 'sin proponer nada');
});

PRUEBAS.caso('⚠️ la NÓMINA le gana al código', () => {
  /* La nómina la carga RRHH y es la fuente de verdad de la empresa; el código es el atajo para
     cuando esa columna todavía no está llena. Si la nómina ya dice algo, ese vale. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026']],
    [['Helitec','Ana Suárez','V-111','Op','Piloto','F','34','','','Sí','','Médico','4']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111',
    codigoSup:'JEFE-2026', dispositivoId:'d4' }).getContent());
  PRUEBAS.igual(r.perfil.rol, 'medico', '⚠️ manda lo que dice la nómina');
  PRUEBAS.igual(r.perfil.rolOrigen, 'nomina', 'y se dice que vino de ahí');
});

PRUEBAS.caso('el valor del código NUNCA viaja al navegador', () => {
  /* `index.html` es público. Lo que viaja es un booleano: si la empresa tiene código o no. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026']]);
  const api = GS.cargarGs(CTX.gs, env, ['perfilPublicoEmpresa']);
  const perfil = api.perfilPublicoEmpresa('Helitec');
  PRUEBAS.igual(perfil.tieneCodigoSup, true, 'se dice que la empresa tiene uno');
  PRUEBAS.falso(JSON.stringify(perfil).indexOf('JEFE-2026') >= 0,
    '⚠️ pero el valor NO está en ninguna parte de la respuesta');
});

PRUEBAS.caso('una empresa sin código de supervisor no propone nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar', 'perfilPublicoEmpresa']);
  PRUEBAS.igual(api.perfilPublicoEmpresa('Helitec').tieneCodigoSup, false, 'la pantalla no muestra el campo');
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111',
    codigoSup:'LO-QUE-SEA', dispositivoId:'d5' }).getContent());
  PRUEBAS.cierto(r.ok, 'y aunque manden cualquier cosa, el alta funciona');
  PRUEBAS.igual(r.perfil.rolOrigen, '', 'sin proponer nada');
});

PRUEBAS.caso('⚠️ el freno del código de supervisor NO quema el del alta', () => {
  /* Si compartieran contador, alguien probando códigos de supervisor dejaría a esa persona sin
     poder registrarse durante diez minutos por algo que ni siquiera necesitaba. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p099Env([['Helitec','codigoSupervisor','JEFE-2026'],
                       ['Helitec','codigoRegistro','ALTA-99']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaConfirmar', 'codFrenado', 'codSupFrenado']);
  for (let i = 0; i < 8; i++){
    api.accionNominaConfirmar({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111',
      codigo:'ALTA-99', codigoSup:'MAL-' + i, dispositivoId:'dQ' });
  }
  PRUEBAS.cierto(api.codSupFrenado('Helitec', 'dQ'), 'el contador del código de supervisor se llenó');
  PRUEBAS.falso(api.codFrenado('Helitec', 'dQ'),
    '⚠️ pero el del alta quedó intacto: esa persona se puede seguir registrando');
});

PRUEBAS.caso('el DISCRIMINADOR: son dos contadores distintos de verdad', () => {
  /* Si `codSupClave` devolviera lo mismo que `codClaveDispositivo`, el caso de arriba daría verde
     sólo porque ninguno se llenó. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, p099Env([]), ['codSupClave', 'codClaveDispositivo']);
  PRUEBAS.falso(api.codSupClave('Helitec', 'd1') === api.codClaveDispositivo('Helitec', 'd1'),
    '⚠️ las claves de caché son distintas');
});

PRUEBAS.caso('⚠️ un código suelto NO puede proponer médico ni dirección', () => {
  /* Son las dos vistas con datos clínicos. Para ésas, la propuesta tiene que venir de la nómina,
     que la carga RRHH — no de un código que puede circular por WhatsApp. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, p099Env([['Helitec','codigoSupervisor','X']]), ['rolPorCodigoSupervisor']);
  PRUEBAS.igual(api.rolPorCodigoSupervisor('Helitec', 'X', 'd9'), 'supervisor',
    '⚠️ lo máximo que propone un código es supervisor');
});

PRUEBAS.caso('el campo del alta está y es opcional', () => {
  /* R14: por `t()`. Y plegado, para no agregarle un paso mental al empleado común. */
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  PRUEBAS.existe('#nomCodigoSup', 'el campo existe');
  PRUEBAS.existe('#nomSupBloque', 'y su bloque, que se muestra sólo si la empresa tiene código');
  PRUEBAS.cierto(/codigoSup:/.test(fuente), 'y se manda en el alta');
  const inp = document.getElementById('nomCodigoSup');
  PRUEBAS.falso(!!(inp && inp.required), '⚠️ no es obligatorio');
  PRUEBAS.igual(document.getElementById('nomSupBloque').style.display, 'none',
    'arranca oculto: sólo aparece si la empresa tiene código cargado');
});
