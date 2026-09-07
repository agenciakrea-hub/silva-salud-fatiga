
PRUEBAS.grupo('P093a · el rol que manda la nómina tiene que llegar, y no puede borrar el que ya había');

/* ⚠️ DOS DEFECTOS, Y LOS DOS ERAN INVISIBLES PORQUE NADIE FALLABA.

   1 · EL DATO LLEGABA Y SE TIRABA. La columna L de `Nómina` se llama "Rol en la app",
   `leerNomina()` la lee, `accionNominaConfirmar` la devuelve como `rol`, y hasta los datos de
   Helitec ya la tienen escrita. Pero `nominaConfirmar()` arma el perfil con una lista CERRADA de
   campos y `rol` no estaba en ella: el dato viajaba por la red y se perdía sin un error.
   Es la misma forma exacta que se comió `duty` y `ausencias` en `onDashData` (R17), un piso más
   abajo. Por eso este archivo no comprueba que `rol` "funcione": comprueba EL CONTRATO — que lo
   que el .gs manda tenga destino del lado del cliente.

   2 · EL BUG VIVO. `accionRecuperarPerfil` tiene dos ramas: la de `Registrados Fatiga` manda
   `esSupervisor`; la de `Nómina` NO. Y el cliente hacía `esSupervisor: !!q.esSupervisor`, así que
   `undefined` se volvía `false` y pisaba el flag. Cualquier supervisor de una empresa con nómina
   cargada perdía el panel al recuperar su perfil, sin poder deducir por qué. Le pegaba a Helitec. */

function p093Nomina(filas){
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']]
               .concat(filas || []),
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Registrados Fatiga': [['Fecha de registro','Última actualización','Nombre']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
  });
  return GS.cargarGs(CTX.gs, env, ['leerNomina', 'normalizarRolNomina']);
}

/* ⚠️ SE LEEN LOS <script> DE LA APP Y SE SACAN LOS COMENTARIOS. Sin esto, la explicación de este
   mismo archivo haría pasar la prueba: ya pasó dos veces en este proyecto que un hex y una clase
   citados DENTRO de un comentario dieran un falso verde. */
function p093Fuente(){
  return [...document.querySelectorAll('script')].map(x => x.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

PRUEBAS.caso('el conjunto de roles está CERRADO', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = p093Nomina([]);
  const n = api.normalizarRolNomina;
  PRUEBAS.igual(n('Supervisor'),        'supervisor', 'lo escrito tal cual');
  PRUEBAS.igual(n('  JEFE  '),          'supervisor', 'sinónimo, con espacios y en mayúscula');
  PRUEBAS.igual(n('Médico'),            'medico',     'con acento — RRHH lo escribe de las dos formas');
  PRUEBAS.igual(n('Servicio Medico'),   'medico',     'sin acento');
  PRUEBAS.igual(n('Dirección'),         'hseq',       'nadie de RRHH va a escribir "hseq"');
  PRUEBAS.igual(n(''),                  'empleado',   'celda vacía');
  PRUEBAS.igual(n(null),                'empleado',   'celda que no existe');
});

PRUEBAS.caso('⚠️ un pegado con las columnas corridas NO fabrica un supervisor', () => {
  /* En el Excel que se le manda a cada empresa la columna K (ID de piloto) va VACÍA y la L tiene
     el rol. Un pegado que salte la celda vacía corre todo una posición y mete el teléfono en la
     columna del rol. Sin el conjunto cerrado, alguien quedaba propuesto como supervisor porque su
     celular empieza con 5. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const n = p093Nomina([]).normalizarRolNomina;
  ['+584121234567', 'Piloto', 'Sí', '4', 'Operaciones', 'V-12345678', 'ana@correo.com']
    .forEach(basura => PRUEBAS.igual(n(basura), 'empleado', 'cae a empleado: ' + basura));
});

PRUEBAS.caso('leerNomina() entrega el rol ya normalizado', () => {
  /* R17: no se prueba `normalizarRolNomina` suelta, se prueba que el LLAMADOR real la use. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = p093Nomina([
    ['Helitec','Ana Suárez','V-111','Operaciones','Piloto','F','34','+58412','a@x.com','Sí','','Jefe','4'],
    ['Helitec','Luis Ferrer','V-222','Operaciones','Piloto','M','40','+58414','l@x.com','Sí','','','4'],
  ]);
  const filas = api.leerNomina();
  PRUEBAS.igual(filas.length, 2, 'las dos filas');
  PRUEBAS.igual(filas[0].rol, 'supervisor', '"Jefe" llega normalizado, no en crudo');
  PRUEBAS.igual(filas[1].rol, 'empleado',   'la celda vacía cae a empleado');
});

PRUEBAS.caso('⚠️ EL CONTRATO: lo que el .gs manda tiene destino en el cliente', () => {
  /* Este es el caso que habría atrapado el defecto original: la clave que el servidor manda tiene
     que estar NOMBRADA del lado del cliente, o el dato viaja y se tira sin un error.
     ⚠️ P118 · ANTES SE MEDÍA CON UNA REGEX SOBRE EL FUENTE (`/rol:\s*q\.rol/`), y eso ataba el
     caso a UNA FORMA de escribirlo: cuando los cuatro merges se unificaron en `perfilMerge`, esa
     cadena dejó de existir y el caso se puso rojo sin que la propiedad se hubiera roto — de hecho
     quedó mejor protegida. Una regex sobre el fuente mide cómo está escrito, no qué hace. Ahora se
     mide el COMPORTAMIENTO, por la función que usan los cuatro caminos. */
  PRUEBAS.igual(perfilMerge({}, { rol:'supervisor' }).rol, 'supervisor',
    '⚠️ el `rol` que manda el servidor llega al perfil — sin esto el dato viaja y se tira');
  PRUEBAS.igual(perfilMerge({ rol:'supervisor' }, { nombre:'Ana' }).rol, 'supervisor',
    'y no se pierde cuando el servidor no lo manda');
});

PRUEBAS.caso('⚠️ recuperar el perfil NO le borra el panel a un supervisor', () => {
  /* El bug vivo, y le pegó a HELITEC. La rama de Nómina no mandaba `esSupervisor`; que una clave
     NO venga significa "no tengo ese dato", nunca "es falso".
     ⚠️ P118 · se mide el COMPORTAMIENTO y no la cadena `'esSupervisor' in q`: esa forma vivía
     inline en `recuperarConfirmar` y ahora vive en `perfilMerge`, que la comparten los cuatro
     caminos. Medir la forma dejaba el caso en rojo por una mudanza y —peor— lo habría dejado en
     verde si alguien conservaba la cadena en un merge y la perdía en los otros tres. */
  PRUEBAS.igual(perfilMerge({ esSupervisor:true }, { nombre:'Ana' }).esSupervisor, true,
    '⚠️ una clave AUSENTE no apaga el flag · `!!undefined` le sacaba el panel');
  PRUEBAS.igual(perfilMerge({ esSupervisor:true }, { esSupervisor:false }).esSupervisor, false,
    'y un "no" explícito del servidor sí manda — el discriminador');
});

PRUEBAS.caso('el DISCRIMINADOR: estas mediciones se ponen en rojo cuando deben', () => {
  /* R17: un caso que no puede fallar no es una prueba. Se corre la MISMA comprobación contra un
     texto que sí tiene el defecto, y tiene que dar al revés. */
  /* ⚠️ P118 · el discriminador acompañó a la medición: ahora que arriba se mide comportamiento,
     acá se simula el merge VIEJO —el que pisaba a ciegas— y se comprueba que da al revés. Un
     discriminador que siga midiendo texto no discrimina nada de lo que hoy se mide. */
  const mergeViejo = (prev, q) => Object.assign({}, prev, { esSupervisor: !!q.esSupervisor });
  PRUEBAS.igual(mergeViejo({ esSupervisor:true }, { nombre:'Ana' }).esSupervisor, false,
    '⚠️ el merge VIEJO apaga el flag con una clave ausente — el defecto que se arregló');
  PRUEBAS.igual(perfilMerge({ esSupervisor:true }, { nombre:'Ana' }).esSupervisor, true,
    'y el actual no — o sea que la medición discrimina, no da verde siempre');
});
