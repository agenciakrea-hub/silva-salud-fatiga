PRUEBAS.grupo('P156 · los lectores de Registrados, por encabezado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P147 arregló que `accionRegistro` ESCRIBIERA por encabezado y dejó **seis lectores** de la misma
   hoja con los índices a mano. Media reforma: si alguien inserta una columna —y la hoja la mantiene
   gente de afuera del equipo, que es el escenario entero de P147— el escritor sigue poniendo cada
   dato en su lugar y los lectores empiezan a leer el de al lado.

   Lo que rompía:
   · El **dedup** de `accionRegistro` leía `getRange(2, 3, n-1, 7)` con Nombre/Cédula/Empresa fijos.
     Con una columna corrida, `cedulaNorm("PIL-004")` da "004", ninguna fila coincide, y CADA
     apertura de la app agrega una fila por persona — `sincronizarRegistro` manda el perfil en cada
     arranque. Las 16 personas reales se multiplican en silencio.
   · `mapaPerfil` leía cargo/mail/tel por índice: con una columna corrida, la EDAD terminaba en la
     columna Teléfono de `Casos Odoo`, que es la hoja que Odoo lee para llamar a la persona.
   · `construirPadron` leía cédula/nombre/empresa por índice, y de ahí sale TODA la identidad.

   ⚠️ Uno de los seis lo escribí en `P155`, un día antes — el mismo defecto que este prompt cierra.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P156_CAB = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

/* Construye la hoja con una columna INSERTADA en el medio, que es el escenario que rompía. Los
   datos van en la columna que dice su encabezado, no en la posición que el código esperaba. */
function p156Hoja(conIntrusa){
  const cab = P156_CAB.slice();
  if (conIntrusa) cab.splice(4, 0, 'Observaciones');     // entre Email y Cédula
  const idx = t => cab.indexOf(t);
  const fila = (nombre, ced, emp, cargo, tel, mail) => {
    const f = new Array(cab.length).fill('');
    f[idx('Nombre')] = nombre; f[idx('Cédula')] = ced; f[idx('Empresa')] = emp;
    f[idx('Cargo')] = cargo; f[idx('Teléfono')] = tel; f[idx('Email')] = mail;
    f[idx('ID Piloto')] = 'PIL-004'; f[idx('Edad')] = '34';
    f[0] = '01/09/2026 08:00';
    if (conIntrusa) f[idx('Observaciones')] = 'nota de RRHH';
    return f;
  };
  return [cab, fila('Ana Suárez','12345678','Consorcio HELITEC','Piloto','0412-1112233','ana@x.com')];
}

function p156Env(fns, conIntrusa){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': p156Hoja(conIntrusa),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p156Filas(api){ return api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues(); }

PRUEBAS.caso('🔴 con una columna INSERTADA, el dedup sigue encontrando a la persona', () => {
  /* El defecto: la fila no coincidía, y `sincronizarRegistro` manda el perfil en CADA apertura de
     la app. Una fila nueva por arranque, por persona, en silencio. */
  const api = p156Env(['accionRegistro'], true);
  PRUEBAS.igual(p156Filas(api).length, 2, 'guarda: arranca con una sola fila de datos');
  for (let i = 0; i < 3; i++){
    api.accionRegistro({ nombre:'Ana Suárez', cedula:'12345678', email:'ana@x.com',
                         empresa:'Consorcio HELITEC', departamento:'Ops', cargo:'Piloto',
                         dispositivoId:'d1' });
  }
  PRUEBAS.igual(p156Filas(api).length, 2,
    '⚠️ sigue habiendo UNA fila después de tres aperturas · antes se agregaba una por vez');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: sin la columna intrusa también, obviamente', () => {
  /* Si el arreglo hubiera roto el dedup en el caso normal, lo de arriba pasaría igual por otra
     razón y no nos enteraríamos. */
  const api = p156Env(['accionRegistro'], false);
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'12345678', email:'ana@x.com',
                       empresa:'Consorcio HELITEC', dispositivoId:'d1' });
  PRUEBAS.igual(p156Filas(api).length, 2, '⚠️ una sola fila con la hoja sin tocar');
});

PRUEBAS.caso('🔴 `mapaPerfil` lee el TELÉFONO, no la edad, con la columna corrida', () => {
  /* Con índices fijos y una columna insertada, el teléfono que viajaba a `Casos Odoo` era en
     realidad la edad — y esa es la hoja que Odoo lee para llamar a la persona. */
  const api = p156Env(['mapaPerfil'], true);
  const m = api.mapaPerfil();
  const p = m[Object.keys(m)[0]] || {};
  PRUEBAS.igual(p.tel, '0412-1112233', '⚠️ el teléfono es el teléfono');
  PRUEBAS.igual(p.mail, 'ana@x.com', 'y el correo, el correo');
  PRUEBAS.igual(p.cargo, 'Piloto', 'y el cargo');
});

PRUEBAS.caso('🔴 `construirPadron` arma la identidad con la cédula, no con el ID de piloto', () => {
  /* De acá sale toda la identidad del sistema. Con la columna corrida, `cedulaNorm("PIL-004")`
     devolvía "004" y el padrón entero quedaba mal armado. */
  const api = p156Env(['construirPadron','construirAlias'], true);
  const padron = api.construirPadron(api.construirAlias());
  PRUEBAS.cierto(!!padron.porCedula['12345678'],
    '⚠️ la persona está indexada por SU cédula · quedó [' + Object.keys(padron.porCedula).join(', ') + ']');
  PRUEBAS.igual(padron.porCedula['12345678'].nombre, 'Ana Suárez', 'con su nombre');
  PRUEBAS.igual(!!padron.porCedula['004'], false, '🔒 y NO indexada por el ID de piloto');
});

PRUEBAS.caso('🔒 una columna que el código no conoce no se pierde ni estorba', () => {
  /* La contracara de P147: el escritor conserva lo que no mapea. Acá se verifica que el LECTOR
     tampoco se confunda con ella. */
  const api = p156Env(['accionRegistro'], true);
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'12345678', email:'ana@x.com',
                       empresa:'Consorcio HELITEC', cargo:'Instructor', dispositivoId:'d1' });
  const v = p156Filas(api);
  const cObs = v[0].indexOf('Observaciones');
  PRUEBAS.igual(String(v[1][cObs]), 'nota de RRHH', '🔒 la nota de RRHH sobrevive');
  PRUEBAS.igual(String(v[1][v[0].indexOf('Cargo')]), 'Instructor', 'y el dato que cambió, cambió');
});
