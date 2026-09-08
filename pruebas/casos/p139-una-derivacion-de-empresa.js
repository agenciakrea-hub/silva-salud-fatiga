PRUEBAS.grupo('P139 · una sola derivación del nombre de empresa');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El nombre de empresa se derivaba por DOS caminos que nunca se compararon — el bug más repetido
   de este proyecto, y esta vez tuvo el alta MUERTA para el único cliente en producción:

   · `listaEmpresas()` devolvía la columna **A** de `Accesos`, que NO es el nombre de la empresa:
     es el USUARIO con el que entra al panel. Para HELITEC daba «Helitec».
   · El alta guarda la CANÓNICA que arma `nominaEmpresaCanon()` — el primer alias de la columna
     **D** — que para HELITEC es «Consorcio HELITEC».

   `saveProfile` compara las dos con `dashNorm` y no coincidían, así que rechazaba SIEMPRE. Y el
   rechazo se escribía en el campo de empresa, que el modo «datos faltantes» esconde: se tocaba
   «Guardar y continuar» y no pasaba nada, sin un solo mensaje.

   ⚠️ EL CASO QUE HABRÍA CAZADO ESTO no es «la lista tiene N empresas»: es que lo que una punta
   PRODUCE esté en lo que la otra ACEPTA. Eso es lo que se mide acá.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La hoja `Accesos` con su forma real: A = usuario del panel, D = alias, el primero es el canónico. */
const P139_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  ['helitec', 'clave', 'supervisor', 'Consorcio HELITEC, Helitec, Consorcio Helitec C.A.', '', ''],
  /* Una fila con la columna D VACÍA: su nombre sólo existe en la A. */
  ['El Cairo', 'clave', 'supervisor', '', '', ''],
  /* Y el comodín del administrador, que no es una empresa. */
  ['*', 'claveAdmin', 'admin', '', '', '']
];

function p139Api(fns){
  const env = GS.crearEntorno({
    'Accesos': P139_ACCESOS.map(f => f.slice()),
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Departamentos': [['Empresa','Departamento','Estado']]
  });
  return GS.cargarGs(CTX.gs, env, fns);
}

PRUEBAS.caso('🔴 CONTRATO · la empresa que el alta GUARDA está en la lista contra la que se VALIDA', () => {
  /* Éste es el caso. Las dos derivaciones tienen que dar lo mismo, y se comparan entre sí — no
     contra una lista escrita a mano, que es lo que dejó pasar el bug. */
  const api = p139Api(['listaEmpresas', 'construirAlias', 'nominaEmpresaCanon']);
  const lista = api.listaEmpresas();
  const alias = api.construirAlias();
  /* Lo que el alta guarda cuando la persona llega por cualquiera de los alias. */
  const canonica = api.nominaEmpresaCanon(alias, 'Helitec');
  PRUEBAS.igual(canonica, 'Consorcio HELITEC',
    'guarda: la canónica es el PRIMER alias de la columna D');
  PRUEBAS.cierto(lista.indexOf(canonica) >= 0,
    '🔴 la canónica está en la lista de validación · antes NO estaba y `saveProfile` rechazaba siempre');
});

PRUEBAS.caso('⚠️ y ninguna forma que hoy funciona se queda afuera', () => {
  /* El discriminador del arreglo. La primera versión devolvía SÓLO el canónico de la columna D, y
     medido contra producción eso dejó afuera a tres clientes cuyo nombre de siempre vive en la
     columna A: cambiaba un alta muerta por otra. La lista es permisiva a propósito — lo que decide
     de qué empresa es alguien es el código y la nómina, no este arreglo de nombres. */
  const api = p139Api(['listaEmpresas']);
  const lista = api.listaEmpresas();
  /* El usuario del panel, tal como está escrito en la columna A de la fila de prueba. */
  PRUEBAS.cierto(lista.indexOf('helitec') >= 0,
    '⚠️ el usuario del panel sigue aceptándose · es el nombre que muchos ya tienen guardado');
  /* Y también el segundo alias de la columna D: cualquier forma que hoy funcione sigue valiendo. */
  PRUEBAS.cierto(lista.indexOf('Consorcio HELITEC') >= 0, 'y la canónica');
  PRUEBAS.cierto(lista.indexOf('El Cairo') >= 0,
    '⚠️ y una empresa SIN la columna D no desaparece · si no, quien la tipee queda rechazado');
});

PRUEBAS.caso('🔒 el comodín del administrador NO es una empresa', () => {
  const api = p139Api(['listaEmpresas']);
  PRUEBAS.igual(api.listaEmpresas().indexOf('*'), -1, '🔒 el `*` del admin no entra en la lista');
});

PRUEBAS.caso('⚠️ las entradas que no son un nombre se descartan', () => {
  /* La columna trae marcadores como «-» y «.» — medidos en producción. Colarlos en la lista de
     empresas no ayuda a nadie: ni se pueden elegir ni se pueden tipear con sentido. */
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['-', 'c', 'supervisor', '-', '', ''],
                ['.', 'c', 'supervisor', '.', '', ''],
                ['real', 'c', 'supervisor', 'Empresa Real', '', '']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Departamentos': [['Empresa','Departamento','Estado']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['listaEmpresas']);
  const lista = api.listaEmpresas();
  /* ⚠️ «real» también entra, y está bien: es el usuario de la columna A y la lista es la UNIÓN de
     las dos columnas. Lo que se mide acá es que «-» y «.» NO entren. */
  PRUEBAS.igual(lista.sort(), ['Empresa Real', 'real'],
    '⚠️ sólo lo que tiene al menos una letra · «-» y «.» no son empresas');
});
