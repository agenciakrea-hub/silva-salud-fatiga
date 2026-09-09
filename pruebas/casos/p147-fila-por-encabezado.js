PRUEBAS.grupo('P147 · la fila se escribe por encabezado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `accionRegistro` armaba 23 valores en un orden fijo y los volcaba con `setValues`. Los
   encabezados REALES de `Registrados Fatiga` no son los del array del código —la hoja la creó una
   persona antes de que el endpoint la tocara— y coincidían POR CASUALIDAD. Cualquiera que
   insertara una columna en el medio corría los datos de las 16 personas que ya están, en silencio.

   P131 y P146 rodearon esta causa dos veces: el primero puso la columna del servicio médico al
   final para no correr nada, el segundo repuso los booleanos por encabezado DESPUÉS del volcado.
   Acá se arregla de raíz: la fila se arma en el orden real de la hoja.

   Los tres casos que importan y que antes no se podían escribir:
   · una columna insertada EN EL MEDIO no corre nada;
   · una columna que el código no conoce conserva su valor en vez de quedar pisada;
   · las columnas reordenadas siguen recibiendo su propio dato.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los encabezados REALES del CH, leídos de la hoja. Si alguien los renombra, esta constante cambia
   con ellos — y `mapa_registrados` en el endpoint dice qué campo se quedó sin columna. */
const P147_CAB = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

function p147Env(fns, cab){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','claveA','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': [(cab || P147_CAB).slice()],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p147Hoja(api){ return api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues(); }
function p147Col(v, titulo){ return v[0].findIndex(c => String(c || '') === titulo); }
function p147Persona(extra){
  return Object.assign({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
    empresa:'Consorcio HELITEC', departamento:'Operaciones', cargo:'Piloto', sexo:'F', edad:'34',
    telefono:'0412-1112233', id_piloto:'PIL-004', esPiloto:true, esSupervisor:true,
    dispositivoId:'d1', dispositivo:{ dispositivo:'Android', modelo:'A54', sistema:'Android 14',
      navegador:'Chrome', instalada:'Sí', idioma:'es', zona:'America/Caracas', pantalla:'1080x2340',
      ua:'Mozilla/5.0' } }, extra || {});
}

PRUEBAS.caso('cada dato cae en SU columna, leyendo el encabezado', () => {
  const api = p147Env(['accionRegistro']);
  api.accionRegistro(p147Persona());
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][p147Col(v,'Nombre')]), 'Ana Suárez', 'Nombre');
  PRUEBAS.igual(String(v[1][p147Col(v,'Cédula')]), 'V-111', 'Cédula');
  PRUEBAS.igual(String(v[1][p147Col(v,'Empresa')]), 'Consorcio HELITEC', 'Empresa');
  PRUEBAS.igual(String(v[1][p147Col(v,'Teléfono')]), '0412-1112233', 'Teléfono');
  PRUEBAS.igual(String(v[1][p147Col(v,'Es piloto')]), 'Sí', 'la marca de piloto');
  PRUEBAS.igual(String(v[1][p147Col(v,'ID Piloto')]), 'PIL-004', 'y su identificador, que es otra columna');
  PRUEBAS.igual(String(v[1][p147Col(v,'UA')]), 'Mozilla/5.0', 'y los datos del dispositivo, al final');
});

PRUEBAS.caso('🔴 una columna INSERTADA EN EL MEDIO no corre nada · era el bug', () => {
  /* El escenario real: alguien agrega «Observaciones» entre Email y Cédula desde la planilla. Con
     la escritura por posición, la cédula pasaba a caer en Observaciones, la empresa en el
     departamento, y así hasta el final — en las 16 filas que ya hay, sin un solo error. */
  const cab = P147_CAB.slice();
  cab.splice(4, 0, 'Observaciones');            // entre Email (4) y Cédula
  const api = p147Env(['accionRegistro'], cab);
  api.accionRegistro(p147Persona());
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][p147Col(v,'Cédula')]), 'V-111',
    '⚠️ la cédula sigue en su columna · por posición habría caído en «Observaciones»');
  PRUEBAS.igual(String(v[1][p147Col(v,'Empresa')]), 'Consorcio HELITEC', 'y la empresa en la suya');
  PRUEBAS.igual(String(v[1][p147Col(v,'Departamento')]), 'Operaciones', 'y el departamento');
  PRUEBAS.igual(String(v[1][p147Col(v,'UA')]), 'Mozilla/5.0', 'hasta la última');
});

PRUEBAS.caso('🔒 y una columna DESCONOCIDA conserva su valor · no se pisa lo que no sabemos', () => {
  /* Si el escritor rellenara con vacío todo lo que no mapea, actualizar el perfil de alguien le
     borraría las notas que RRHH lleva a mano en su fila. */
  const cab = P147_CAB.concat(['Notas de RRHH']);
  const api = p147Env(['accionRegistro'], cab);
  api.accionRegistro(p147Persona());
  const sh = api.__env.__libro.getSheetByName('Registrados Fatiga');
  const cNota = cab.length;                                  // 1-based: la última
  sh.getRange(2, cNota).setValue('revisar visa');
  api.accionRegistro(p147Persona({ cargo:'Instructor' }));    // vuelve a guardar
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][cNota - 1]), 'revisar visa',
    '🔒 la nota de RRHH sobrevive · el escritor sólo toca las columnas que conoce');
  PRUEBAS.igual(String(v[1][p147Col(v,'Cargo')]), 'Instructor', 'y el dato que sí cambió, cambió');
});

PRUEBAS.caso('⚠️ columnas REORDENADAS: cada dato sigue al suyo', () => {
  /* El discriminador del caso de arriba con otra forma de romper: si alguien mueve Empresa antes
     que Nombre, la escritura por posición los intercambia sin decir nada. */
  const cab = P147_CAB.slice();
  const emp = cab.splice(8, 1)[0];             // Empresa
  cab.splice(2, 0, emp);                        // ahora va antes que Nombre
  const api = p147Env(['accionRegistro'], cab);
  api.accionRegistro(p147Persona());
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][p147Col(v,'Empresa')]), 'Consorcio HELITEC', '⚠️ la empresa, en su columna nueva');
  PRUEBAS.igual(String(v[1][p147Col(v,'Nombre')]), 'Ana Suárez', 'y el nombre en la suya');
});

PRUEBAS.caso('🔴 el tri-estado, ahora para TODOS los campos · el backfill no borra nada', () => {
  /* P146 lo cerró para los tres booleanos. Los textos tenían el mismo agujero: un perfil recién
     repuesto que no trae la clave escribía "" sobre el dato bueno. */
  const api = p147Env(['accionRegistro']);
  api.accionRegistro(p147Persona());
  // Vuelve a abrir la app con un perfil al que le faltan claves.
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
                       empresa:'Consorcio HELITEC', dispositivoId:'d1' });
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][p147Col(v,'Teléfono')]), '0412-1112233',
    '⚠️ el teléfono sobrevive · antes se escribía "" encima');
  PRUEBAS.igual(String(v[1][p147Col(v,'Cargo')]), 'Piloto', 'y el cargo');
  PRUEBAS.igual(String(v[1][p147Col(v,'Es supervisor')]), 'Sí', 'y la marca de supervisor (P146)');
  PRUEBAS.igual(String(v[1][p147Col(v,'UA')]), 'Mozilla/5.0', 'y lo del dispositivo, que tampoco viajó');
});

PRUEBAS.caso('🔒 pero un valor VACÍO explícito sí borra — el discriminador', () => {
  /* Es la diferencia entre «no sé» y «lo borré a propósito». Sin esto nadie podría vaciar un campo
     y el arreglo sería un candado. */
  const api = p147Env(['accionRegistro']);
  api.accionRegistro(p147Persona());
  api.accionRegistro(p147Persona({ telefono:'' }));
  const v = p147Hoja(api);
  PRUEBAS.igual(String(v[1][p147Col(v,'Teléfono')]), '', '🔒 la cadena vacía sí se escribe');
});

PRUEBAS.caso('⚠️ la fecha de REGISTRO original se conserva; la de actualización se mueve', () => {
  /* La columna A del CH real no tiene título —lleva un texto de descripción— así que es el único
     campo que se resuelve por posición histórica. Es justo el que más duele perder: es la
     antigüedad de la persona en el sistema. */
  const api = p147Env(['accionRegistro']);
  api.accionRegistro(p147Persona());
  const v1 = p147Hoja(api);
  const primera = String(v1[1][0]);
  PRUEBAS.cierto(primera.length > 5, 'guarda: quedó una fecha de registro · «' + primera + '»');
  api.accionRegistro(p147Persona({ cargo:'Instructor' }));
  const v2 = p147Hoja(api);
  PRUEBAS.igual(String(v2[1][0]), primera,
    '⚠️ la fecha de registro NO se pisa al actualizar · es la antigüedad de esa persona');
  PRUEBAS.cierto(String(v2[1][1]).length > 5, 'y «Fecha y hora» sí lleva la actualización');
});

PRUEBAS.caso('🔴 el par cerrado: lo que se escribe es lo que `perfilDePersona` devuelve', () => {
  /* R17 · el contrato entre las dos puntas. Que la fila quede linda no sirve si el lector no la
     entiende: los dos resuelven la columna con la MISMA `colEncabezado_` desde P146. */
  const cab = P147_CAB.slice();
  cab.splice(4, 0, 'Observaciones');            // con la hoja movida, que es el caso difícil
  const api = p147Env(['accionRegistro','accionRecuperarPerfil'], cab);
  api.accionRegistro(p147Persona());
  const r = JSON.parse(api.accionRecuperarPerfil(
    { empresa:'Consorcio HELITEC', cedula:'V-111', dispositivoId:'d1', _post:true }).getContent());
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.perfil.telefono, '0412-1112233', 'el teléfono vuelve');
  PRUEBAS.igual(r.perfil.esSupervisor, true, 'y la marca de supervisor');
  PRUEBAS.igual(r.perfil.id_piloto, 'PIL-004', 'y el ID de piloto, que es la columna vecina de la marca');
});
