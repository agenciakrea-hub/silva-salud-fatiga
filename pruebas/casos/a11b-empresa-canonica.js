PRUEBAS.grupo('A11b · la variante del nombre de empresa abría el candado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Una empresa puede tener MÁS DE UN NOMBRE: la columna "Empresas" de `Accesos` acepta una lista
   separada por comas ("Helitec, Consorcio Helitec C.A."), y el primero es el canónico.
   `construirAlias()` mapea todas las variantes al canónico.

   La fila de `Credenciales` se ESCRIBE con la forma canónica (`accionCredencialCrear` la
   canonicaliza). Pero tres puntos la BUSCABAN con `p.empresa` CRUDA — que es lo que la persona
   tenga guardado en su perfil, y `accionRegistro` lo guarda sin canonicalizar. Resultado, para
   alguien cuyo perfil quedó con la variante:

   · `login` → "usuario o contraseña incorrecta" **con la contraseña correcta**, para siempre. Sin
     forma de darse cuenta desde afuera: la clave es la buena y el sistema dice que no.
   · Y peor, en `accionEmpleado`: `credPersonaMigrada` devolvía false, así que **el candado Z2 no
     se aplicaba** — esa persona, y cualquiera que supiera su nombre y su cédula, seguía entrando
     SIN contraseña aunque se hubiera puesto una.

   ⚠️ Un fallo que ABRE en vez de cerrar es el peor modo posible, porque nadie lo reporta: quien
   entra de más no se queja.

   Y un cuarto, distinto pero de la misma familia: para el ADMIN, `acc.canonical` y `acc.empresas`
   son `null`, así que las ausencias se pedían con cadena vacía — que `ausenciasDe` interpreta como
   "sin filtro", o sea TODAS las empresas mezcladas. Como el índice se clavetea también por
   `n:nombre|fecha`, un "José Rodríguez" de vacaciones en un cliente marcaba ausente al "José
   Rodríguez" de otro y lo sacaba del denominador de la cobertura. No es una fuga —el admin ve todo
   igual— es un número mal calculado, que es peor porque nadie lo cuestiona.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): la credencial se CREA por `accionCredencialCrear` y se usa
   por `accionEmpleado` / `accionLogin`, que son los puntos de entrada del POST. Escribir la fila
   de `Credenciales` a mano habría probado la búsqueda, no que el que la escribe y el que la lee
   coincidan — que es justo lo que estaba roto.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La empresa tiene DOS nombres. El canónico es el primero. */
const A11B_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  ['helitec', 'claveA', 'supervisor', 'Helitec, Consorcio Helitec C.A.', '', ''],
  ['*',       'claveAdmin', 'admin',  '',                               '', '']
];
const A11B_NOMINA = [
  ['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
   'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
  ['Helitec', 'Ana Suárez', 'V-111', 'Operaciones', 'Piloto', 'F', '34', '', '', 'Sí', '', '', '4']
];
const A11B_CRED_CAB = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo',
                       'Rol','Estado','Creada','UltimoAcceso'];

function a11bEnv(fns, extra) {
  const env = GS.crearEntorno(Object.assign({
    'Accesos': A11B_ACCESOS.map(f => f.slice()),
    'Nómina':  A11B_NOMINA.map(f => f.slice()),
    'Credenciales': [A11B_CRED_CAB.slice()],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  }, extra || {}));
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  api.__hoja = n => {
    const sh = env.__libro.getSheetByName(n);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues().slice(1);
  };
  return api;
}
function a11bJson(r) { return JSON.parse(r.getContent ? r.getContent() : r); }

PRUEBAS.caso('la credencial se crea con la forma CANÓNICA aunque se pida con la variante', () => {
  const api = a11bEnv(['accionCredencialCrear', 'credBuscar', 'construirAlias']);
  const r = a11bJson(api.accionCredencialCrear({ empresa:'Consorcio Helitec C.A.', cedula:'V-111',
    persona:'Ana Suárez', pass:'miClave123', dispositivoId:'d' }));
  PRUEBAS.igual(r.ok, true, 'se crea · ' + (r.error || ''));
  const f = api.__hoja('Credenciales');
  PRUEBAS.igual(f.length, 1, 'una fila');
  PRUEBAS.igual(String(f[0][0]), 'Helitec',
    'escrita con el nombre canónico · quedó «' + f[0][0] + '»');
});

PRUEBAS.caso('🔒 con la variante, el login ENCUENTRA la credencial', () => {
  const api = a11bEnv(['accionCredencialCrear', 'accionLogin']);
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  /* La persona tiene la variante guardada en su perfil: es lo que manda la app. */
  const r = a11bJson(api.accionLogin({ empresa:'Consorcio Helitec C.A.', cedula:'V-111',
    pass:'miClave123', dispositivoId:'d2' }));
  PRUEBAS.igual(r.ok, true,
    'entra con SU contraseña · antes decía "incorrecta" con la clave correcta, para siempre');
});

PRUEBAS.caso('🔒 y una contraseña equivocada sigue sin entrar', () => {
  /* El discriminador: sin esto, un arreglo que dejara pasar a cualquiera daría verde arriba. */
  const api = a11bEnv(['accionCredencialCrear', 'accionLogin']);
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  const r = a11bJson(api.accionLogin({ empresa:'Consorcio Helitec C.A.', cedula:'V-111',
    pass:'otraCosa', dispositivoId:'d2' }));
  PRUEBAS.igual(r.ok, false, 'la clave mala no abre');
});

PRUEBAS.caso('🔴 el candado Z2 SE APLICA aunque la empresa venga en variante', () => {
  /* ⚠️ SE ENTRA POR `accionEmpleado`, que es el punto de entrada del POST — NO por
     `credPersonaMigrada` con la empresa ya canonicalizada a mano. La primera versión de este caso
     hacía eso y NO discriminaba: con el `.gs` roto seguía dando verde, porque el arreglo que
     faltaba estaba justamente en el llamador. Probar la pieza y no el uso, en el archivo que
     existe para denunciar eso. R17, y van seis.

     Lo que se mide: la persona ya se puso contraseña, así que pedir entrar SIN clave tiene que
     rebotar con `necesita_clave`. Con el bug, `credPersonaMigrada` no encontraba la fila y la app
     la trataba como "todavía no tiene contraseña": entraba de largo. */
  const api = a11bEnv(['accionCredencialCrear', 'accionEmpleado'], {
    'Respuestas de formulario 1': [['A'], ['B']],
    'Registrados Fatiga': [['A', 'Fecha y hora', 'Nombre', 'Email', 'Cedula']]
  });
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });

  /* La app manda la empresa que la persona tiene guardada en su perfil: la VARIANTE. */
  const r = a11bJson(api.accionEmpleado({ persona:'Ana Suárez', cedula:'V-111',
    empresa:'Consorcio Helitec C.A.', dispositivoId:'d2', pass:'' }));
  PRUEBAS.igual(r.ok, false,
    'sin contraseña NO entra · con el bug entraba de largo, y con ella cualquiera que supiera su ' +
    'nombre y su cédula');
  PRUEBAS.igual(r.motivo, 'necesita_clave',
    'y le pide la suya · el candado se aplica · el motivo fue «' + r.motivo + '»');
});

PRUEBAS.caso('y con SU contraseña entra, aunque la empresa venga en variante', () => {
  /* El discriminador del de arriba: si el arreglo simplemente bloqueara todo, este daría rojo. */
  const api = a11bEnv(['accionCredencialCrear', 'accionEmpleado'], {
    'Respuestas de formulario 1': [['A'], ['B']],
    'Registrados Fatiga': [['A', 'Fecha y hora', 'Nombre', 'Email', 'Cedula']]
  });
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
    pass:'miClave123', dispositivoId:'d' });
  const r = a11bJson(api.accionEmpleado({ persona:'Ana Suárez', cedula:'V-111',
    empresa:'Consorcio Helitec C.A.', dispositivoId:'d2', pass:'miClave123' }));
  PRUEBAS.igual(r.ok, true, 'entra con la suya · ' + (r.error || r.motivo || ''));
});

PRUEBAS.caso('el .gs canonicaliza en los tres puntos que buscan credenciales', () => {
  /* Un caso de forma, no de comportamiento: los otros tres cubren el uso, pero si alguien agrega
     un cuarto punto de búsqueda con la empresa cruda, el bug vuelve y no habría quién lo note. */
  const sinComentarios = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const gs = sinComentarios(CTX.gs);
  PRUEBAS.igual(/credPersonaMigrada\(p\.empresa/.test(gs), false,
    'accionEmpleado ya no busca con la empresa cruda');
  PRUEBAS.igual(/credVerificar\(p\.empresa/.test(gs), false,
    'y la verificación tampoco');
  PRUEBAS.igual(/var empCred = nominaEmpresaCanon\(construirAlias\(\)/.test(gs), true,
    'la canoniza una vez y la reusa');
});

PRUEBAS.caso('🔴 el admin no recibe las ausencias de todas las empresas mezcladas', () => {
  /* EL CAMINO REAL: se llama `accionSupervisor` con la cuenta admin y se mira el índice que sale
     en el payload — que es exactamente lo que el cliente usa para descontar gente del denominador
     de la cobertura. */
  const hoy = new Date().toISOString().slice(0, 10);
  const api = a11bEnv(['accionSupervisor'], {
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado',
                   'Marcada','MarcadaPor','Anulada','AnuladaPor'],
                  ['a1', 'Otra Empresa', 'V-999', 'José Rodríguez', hoy, hoy, 'vacaciones',
                   'vigente', '', '', '', '']],
    'Respuestas de formulario 1': [['A'], ['B']]
  });
  const r = a11bJson(api.accionSupervisor({ usuario:'*', empresa:'*', pass:'claveAdmin',
                                            dispositivoId:'d' }));
  PRUEBAS.igual(r.ok, true, 'el panel del admin responde');
  PRUEBAS.igual(Object.keys(r.ausencias || {}).length, 0,
    'sin empresa elegida no cuenta ninguna ausencia · antes traía las de TODAS mezcladas y un ' +
    'homónimo de otro cliente descontaba gente de la cobertura · trajo ' + JSON.stringify(r.ausencias));
});

PRUEBAS.caso('el admin CON empresa elegida sí recibe las de esa empresa', () => {
  /* El discriminador: sin esto, devolver siempre `{}` daría verde arriba y rompería la función. */
  const hoy = new Date().toISOString().slice(0, 10);
  const api = a11bEnv(['accionSupervisor'], {
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado',
                   'Marcada','MarcadaPor','Anulada','AnuladaPor'],
                  ['a1', 'Helitec', 'V-111', 'Ana Suárez', hoy, hoy, 'franco', 'vigente',
                   '', '', '', '']],
    'Respuestas de formulario 1': [['A'], ['B']]
  });
  const r = a11bJson(api.accionSupervisor({ usuario:'*', empresa:'Helitec', pass:'claveAdmin',
                                            dispositivoId:'d' }));
  PRUEBAS.igual(Object.keys(r.ausencias || {}).length > 0, true,
    'con la empresa elegida sí llegan · ' + JSON.stringify(r.ausencias));
});

PRUEBAS.caso('un supervisor sigue recibiendo las suyas, sin cambios', () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const api = a11bEnv(['accionSupervisor'], {
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado',
                   'Marcada','MarcadaPor','Anulada','AnuladaPor'],
                  ['a1', 'Helitec', 'V-111', 'Ana Suárez', hoy, hoy, 'franco', 'vigente',
                   '', '', '', '']],
    'Respuestas de formulario 1': [['A'], ['B']]
  });
  const r = a11bJson(api.accionSupervisor({ usuario:'helitec', empresa:'helitec', pass:'claveA',
                                            dispositivoId:'d' }));
  PRUEBAS.igual(Object.keys(r.ausencias || {}).length > 0, true,
    'el camino del supervisor no se tocó · ' + JSON.stringify(r.ausencias));
});
