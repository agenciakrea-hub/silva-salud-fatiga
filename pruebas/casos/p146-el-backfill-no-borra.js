PRUEBAS.grupo('P146 · el backfill no borra marcas');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `sincronizarRegistro` manda el perfil ENTERO al CH en cada apertura de la app. Y `accionRegistro`
   escribía `(p.esSupervisor ? "Sí" : "No")`: un perfil que todavía no trae la clave —el de quien
   reinstala y acaba de recuperar sus datos— la evaluaba como falsa y dejaba la celda en "No".
   O sea: **el backfill borraba la marca, y con ella el panel de esa persona.** El comentario de
   `perfilDePersona` describía este agujero para `esSupervisor` desde hace tiempo, del lado del
   lector; nadie lo había cerrado del lado que lo produce.

   `esPiloto` tiene el mismo defecto y ya cobró una vez: en P136 la marca se apagaba por otro
   motivo y el borrado NO se quedaba en el teléfono — se propagaba al CH por esta misma vía.

   La regla, la misma que ya usa el lector: clave AUSENTE = «no sé», no toca la celda. Sólo un
   `true`/`false` explícito escribe. En una fila nueva, ausente deja VACÍO, nunca "No".
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P146_CAB = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P146_I_PIL = 6, P146_I_SUP = 7;

function p146Fila(pil, sup){
  const f = new Array(P146_CAB.length).fill('');
  f[2] = 'Ana Suárez'; f[3] = 'ana@ejemplo.com'; f[4] = 'V-111'; f[5] = 'PIL-004';
  f[P146_I_PIL] = pil === undefined ? 'Sí' : pil;
  f[P146_I_SUP] = sup === undefined ? 'Sí' : sup;
  f[8] = 'Helitec'; f[9] = 'Operaciones'; f[10] = 'Piloto'; f[11] = 'F'; f[12] = '34';
  f[13] = '0412-1112233';
  return f;
}
function p146Env(fns, filas){
  const reg = [P146_CAB.slice()];
  (filas === undefined ? [p146Fila()] : filas).forEach(f => reg.push(f));
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','claveA','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': reg,
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p146Hoja(api){ return api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues(); }
function p146Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
/* El perfil tal como lo manda `sincronizarRegistro` al abrir la app: SIN los booleanos, porque el
   perfil recién repuesto todavía no los tiene. */
function p146Backfill(){
  return { nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com', empresa:'Helitec',
           departamento:'Operaciones', cargo:'Piloto', sexo:'F', edad:'34',
           telefono:'0412-1112233', id_piloto:'PIL-004', dispositivoId:'d1' };
}

PRUEBAS.caso('🔴 el backfill NO borra la marca de supervisor · era el prompt entero', () => {
  const api = p146Env(['accionRegistro']);
  PRUEBAS.igual(String(p146Hoja(api)[1][P146_I_SUP]), 'Sí', 'guarda: arranca marcada');
  const r = p146Json(api.accionRegistro(p146Backfill()));
  PRUEBAS.igual(r.ok, true, 'responde ok · ' + (r.error || ''));
  PRUEBAS.igual(String(p146Hoja(api)[1][P146_I_SUP]), 'Sí',
    '⚠️ sigue marcada · antes quedaba en "No" y esa persona perdía su panel');
});

PRUEBAS.caso('🔴 y tampoco la de piloto · el borrado de P136 se propagaba por acá', () => {
  const api = p146Env(['accionRegistro']);
  api.accionRegistro(p146Backfill());
  PRUEBAS.igual(String(p146Hoja(api)[1][P146_I_PIL]), 'Sí',
    '⚠️ la marca de piloto sobrevive al backfill');
});

PRUEBAS.caso('🔒 pero un `false` EXPLÍCITO sí apaga — el discriminador', () => {
  /* Es la diferencia entre «no sé» y «la persona destildó la casilla». Si esto no apagara, no
     habría forma de quitarle el rol a nadie y el arreglo sería un candado, no una guarda. */
  const api = p146Env(['accionRegistro']);
  const p = p146Backfill(); p.esSupervisor = false; p.esPiloto = false;
  api.accionRegistro(p);
  const v = p146Hoja(api);
  PRUEBAS.igual(String(v[1][P146_I_SUP]), 'No', '🔒 destildar supervisor sí se guarda');
  PRUEBAS.igual(String(v[1][P146_I_PIL]), 'No', '🔒 y destildar piloto también');
});

PRUEBAS.caso('🔒 y un `true` explícito enciende — el otro lado del discriminador', () => {
  const api = p146Env(['accionRegistro'], [p146Fila('No', 'No')]);
  const p = p146Backfill(); p.esSupervisor = true;
  api.accionRegistro(p);
  PRUEBAS.igual(String(p146Hoja(api)[1][P146_I_SUP]), 'Sí', '🔒 marcar la casilla se guarda');
});

PRUEBAS.caso('⚠️ en una fila NUEVA, la clave ausente deja VACÍO, no "No"', () => {
  /* Vacío es lo que `perfilSiNo` lee como «no sé», así que no viaja y no puede apagar nada del
     lado del cliente. Escribir "No" convertiría una ignorancia en una afirmación. */
  const api = p146Env(['accionRegistro'], []);
  const p = p146Backfill(); p.cedula = 'V-999'; p.nombre = 'Persona Nueva';
  api.accionRegistro(p);
  const v = p146Hoja(api);
  PRUEBAS.igual(String(v[1][P146_I_SUP]), '', '⚠️ supervisor queda vacío · "No" sería inventar un dato');
  PRUEBAS.igual(String(v[1][P146_I_PIL]), '', 'y piloto también');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR de la columna: reponer los booleanos no corre nada', () => {
  /* Se escriben por encabezado DESPUÉS del `setValues` posicional. Si el índice saliera mal, el
     valor caería sobre Empresa o Departamento. Se mide contra las columnas vecinas. */
  const api = p146Env(['accionRegistro']);
  api.accionRegistro(p146Backfill());
  const v = p146Hoja(api);
  PRUEBAS.igual(String(v[1][5]), 'PIL-004', 'ID Piloto intacto · está pegado a «Es piloto»');
  PRUEBAS.igual(String(v[1][8]), 'Helitec', 'Empresa intacta · está pegada a «Es supervisor»');
  PRUEBAS.igual(String(v[1][9]), 'Operaciones', 'y Departamento también');
});

PRUEBAS.caso('🔴 el par cerrado: lo que el backfill conserva, `perfilDePersona` lo devuelve', () => {
  /* R17 · el contrato entre las dos puntas, no cada una por separado. De nada sirve conservar la
     celda si el lector no la trae de vuelta. */
  const api = p146Env(['accionRegistro','accionRecuperarPerfil']);
  api.accionRegistro(p146Backfill());
  const r = p146Json(api.accionRecuperarPerfil(
    { empresa:'Helitec', cedula:'V-111', dispositivoId:'d1', _post:true }));
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.perfil.esSupervisor, true, '⚠️ el supervisor recupera su marca después del backfill');
  PRUEBAS.igual(r.perfil.esPiloto, true, 'y el piloto la suya');
});

PRUEBAS.caso('🔴 `colEncabezado_` es UNA sola · escritor y lector ubican la misma columna', () => {
  /* Estaba copiada a mano en dos lugares y hacía falta en un tercero. Con tres copias, el día que
     una se ajuste el escritor guarda en una columna y el lector lee otra — que es el defecto que
     este proyecto viene repitiendo. Se mide sobre el fuente REAL del `.gs`. */
  const src = CTX.gs.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, '');
  const definiciones = (src.match(/function\s+col\w*\s*\(\s*cab\s*,\s*txt\s*,\s*prohibido/g) || []).length;
  PRUEBAS.igual(definiciones, 1, 'una sola definición de la derivación de columna');
  const copias = (src.match(/for \(var e = 0; e < cab\.length; e\+\+\) if \(cab\[e\] === txt\) return e;/g) || []).length;
  PRUEBAS.igual(copias, 1, '⚠️ y un solo cuerpo · antes el mismo bucle estaba escrito tres veces');
});
