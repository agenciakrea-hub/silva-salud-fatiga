/* ── Registro de personas: duplicados y formatos ────────────────────────────────────────────────
   (L2b · migra a la suite lo que se verificó a mano en I8, 2026-08-26)

   LA CADENA QUE HAY QUE PROTEGER, y por qué estos dos temas son en realidad UNO SOLO:
   `accionRegistro` deduplica por CÉDULA. La cédula vive en una celda de Sheets. Sheets
   reinterpreta solo lo que le escriben: una cédula larga se vuelve notación científica y una que
   empieza con cero pierde el cero. Si eso pasa, **la misma persona deja de matchear consigo
   misma**: se le vuelve a pedir el alta y queda duplicada.
   O sea que el bug de formato (R15) y el de duplicados (I8) son el mismo bug visto en dos puntos.
   Por eso van juntos en un archivo: si alguien "limpia" el `setNumberFormat` por considerarlo
   redundante, lo que se rompe es la deduplicación.

   R15 exige aplicar el formato en CADA acceso, no sólo al crear la hoja — porque alguien puede
   editar la planilla a mano y dejarla en formato automático otra vez. */

PRUEBAS.grupo('Servidor · registro de personas');

/* Encabezado real de la hoja, copiado del `.gs`. La cédula es la columna E (la 5). */
const CAB_REG = ['Fecha de registro', 'Última actualización', 'Nombre', 'Email', 'Cédula', 'ID Piloto',
  '¿Piloto?', '¿Supervisor?', 'Empresa', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono',
  'Dispositivo', 'Modelo', 'Sistema', 'Navegador', 'App instalada', 'Idioma', 'Zona horaria',
  'Pantalla', 'User-Agent'];

function entornoRegistro(filas) {
  return GS.crearEntorno({ 'Registrados Fatiga': [CAB_REG].concat(filas || []) });
}
function apiRegistro(env) {
  return GS.cargarGs(CTX.gs, env, ['accionRegistro']);
}
function personaCon(extra) {
  return Object.assign({
    nombre: 'Ana Pérez', email: 'ana@ejemplo.com', cedula: '12345678',
    empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto',
    esPiloto: true, telefono: '+584121234567', dispositivo: {}
  }, extra || {});
}
function filasDe(env) {
  return env.__libro.getSheetByName('Registrados Fatiga').__volcado().slice(1);
}

PRUEBAS.caso('registrar dos veces la misma cédula NO crea una segunda fila', () => {
  /* Éste es el bug de I8 tal cual: la app reenvía el registro (cola sin conexión, doble toque,
     backfill al abrir) y cada reenvío agregaba una fila. */
  const env = entornoRegistro([]);
  const api = apiRegistro(env);
  api.accionRegistro(personaCon());
  PRUEBAS.igual(filasDe(env).length, 1, 'el primer registro tiene que crear la fila');
  api.accionRegistro(personaCon());
  api.accionRegistro(personaCon());
  PRUEBAS.igual(filasDe(env).length, 1,
    'la app REENVÍA el registro (cola sin conexión, doble toque, backfill): sin upsert la persona se duplica');
});

PRUEBAS.caso('al reenviar se conserva la FECHA DE REGISTRO original', () => {
  /* Si se pisara, se perdería cuándo entró realmente cada persona — y esa hoja es el padrón. */
  const env = entornoRegistro([]);
  const api = apiRegistro(env);
  api.accionRegistro(personaCon());
  const original = filasDe(env)[0][0];
  api.accionRegistro(personaCon({ cargo: 'Copiloto' }));
  const despues = filasDe(env)[0];
  PRUEBAS.igual(despues[0], original,
    'la fecha de ALTA no se toca al actualizar: es el dato de cuándo entró la persona');
  PRUEBAS.igual(despues[10], 'Copiloto', 'pero los datos que cambian sí se actualizan');
});

PRUEBAS.caso('la cédula con puntos o guiones se reconoce como la misma persona', () => {
  /* La gente la escribe de varias formas. Si "12.345.678" y "12345678" se tomaran como dos
     personas, tendríamos la misma duplicación por otra puerta. */
  const env = entornoRegistro([]);
  const api = apiRegistro(env);
  api.accionRegistro(personaCon({ cedula: '12345678' }));
  api.accionRegistro(personaCon({ cedula: '12.345.678' }));
  PRUEBAS.igual(filasDe(env).length, 1,
    'la misma cédula escrita distinto es la MISMA persona: si no, se duplica igual que antes');
});

PRUEBAS.caso('dos cédulas distintas sí crean dos filas', () => {
  /* El contrapeso del caso anterior: una deduplicación demasiado agresiva sería peor todavía
     —dos personas pisándose la fila— y un test que sólo mira "no duplica" no lo detectaría. */
  const env = entornoRegistro([]);
  const api = apiRegistro(env);
  api.accionRegistro(personaCon({ cedula: '11111111', nombre: 'Ana Pérez' }));
  api.accionRegistro(personaCon({ cedula: '22222222', nombre: 'Luis Gómez' }));
  PRUEBAS.igual(filasDe(env).length, 2,
    'dos personas distintas NO pueden compartir fila: sería peor que duplicar');
});

PRUEBAS.caso('R15 · la hoja queda en formato TEXTO en cada escritura', () => {
  /* No es cosmético: la columna Cédula es con la que se deduplica. Si Sheets la vuelve número,
     la persona deja de encontrarse a sí misma y se duplica. */
  const env = entornoRegistro([]);
  apiRegistro(env).accionRegistro(personaCon());
  const hoja = env.__libro.getSheetByName('Registrados Fatiga');
  PRUEBAS.igual(hoja.__formatoDe(1, 5), '@',
    'la columna Cédula tiene que ser TEXTO: si Sheets la vuelve número, se rompe la deduplicación');
  PRUEBAS.igual(hoja.__formatoDe(1, 14), '@',
    'y la de Teléfono: un número con "+" delante Sheets lo toma como fórmula y queda #ERROR!');
});

PRUEBAS.caso('R15 · el formato alcanza a filas TODAVÍA VACÍAS', () => {
  /* El `setNumberFormat` se aplica sobre `getMaxRows()` justamente para que el formato ya esté
     puesto cuando más adelante se escriba una fila nueva. Si sólo cubriera las filas con datos,
     la PRÓXIMA persona en registrarse entraría con formato automático y su cédula se deformaría. */
  const env = entornoRegistro([]);
  apiRegistro(env).accionRegistro(personaCon());
  const hoja = env.__libro.getSheetByName('Registrados Fatiga');
  PRUEBAS.igual(hoja.__formatoDe(50, 5), '@',
    'el formato tiene que cubrir las filas vacías de abajo, o la próxima alta entra sin él');
});

PRUEBAS.caso('el teléfono con "+" se guarda tal cual', () => {
  const env = entornoRegistro([]);
  apiRegistro(env).accionRegistro(personaCon({ telefono: '+584121234567' }));
  PRUEBAS.igual(filasDe(env)[0][13], '+584121234567',
    'ya pasó en producción: el "+" hacía que Sheets lo tomara como fórmula y la celda quedaba en #ERROR!');
});
