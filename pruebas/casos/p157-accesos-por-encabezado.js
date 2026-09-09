PRUEBAS.grupo('P157 · `Accesos` se lee por encabezado y falla cerrado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `Accesos` gobierna quién entra a cada cliente y se leía por índice fijo 0..5, sin mirar nunca la
   fila 1. Mismo patrón que P147, en la hoja donde más caro sale — y el LÉEME de la propia hoja
   invita a editarla.

   La rotura: si alguien inserta una columna a la izquierda de «Contraseña Médica», el índice 4 pasa
   a leer la columna nueva vacía, `pwMed` queda `""`, y `var combinada = (pwMed === "")` hace que
   **toda contraseña de supervisor devuelva `vista:"medico"` con `combinada:true`**. Cada supervisor
   pasa a recibir los comentarios de texto libre y los valores clínicos crudos de su gente. En el
   mismo movimiento el índice 5 lee la vieja contraseña médica y la trata como la de Dirección.

   ⚠️ Y SI FALTA UNA COLUMNA SE FALLA CERRADO. Tratar la que no se encuentra como vacía es
   exactamente lo que convierte al supervisor en médico: sin Usuario, Contraseña o EMPRESAS nadie
   entra. Se rompe el acceso —que se nota y se arregla— en vez de abrirlo de más, que no se nota.

   Los encabezados reales son frases («Usuario (puede ser el que quieras)») y el de Dirección dice
   «Contraseña HSQ», sin la E. Por eso el matcheo va por prefijo normalizado.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los títulos REALES del CH, leídos de la hoja. Si alguien los cambia, esta constante cambia. */
const P157_CAB = ['Usuario (puede ser el que quieras)',
                  'Contraseña (puede ser la que quieras)',
                  'Rol (supervisor ve solo su empresa, admin ve todas)',
                  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
                  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)',
                  'Contraseña HSQ'];

function p157Env(fns, o){
  o = o || {};
  let cab = P157_CAB.slice();
  let fila = ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq'];
  if (o.intrusaAntesDeMedica){          // el escenario que rompía
    cab.splice(4, 0, 'Notas internas');
    fila.splice(4, 0, '');
  }
  if (o.sinEmpresas){ cab.splice(3, 1); fila.splice(3, 1); }
  const env = GS.crearEntorno({
    'Accesos': [cab, fila],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana Suárez','12345678','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 con una columna INSERTADA, el supervisor sigue siendo supervisor', () => {
  /* El defecto: `pwMed` leía la columna nueva vacía y `combinada` daba true, así que la contraseña
     de supervisor devolvía vista médica — comentarios de texto libre y valores clínicos crudos. */
  const api = p157Env(['validarAcceso'], { intrusaAntesDeMedica: true });
  const acc = api.validarAcceso('helitec', 'clave-sup', 'd1');
  PRUEBAS.cierto(!!acc, 'guarda de medibilidad: la contraseña de supervisor sigue entrando');
  if (!acc) return;
  PRUEBAS.igual(acc.vista, 'supervisor',
    '⚠️ vista de SUPERVISOR · antes la columna corrida la convertía en «medico» con combinada:true');
  PRUEBAS.igual(!!acc.combinada, false, 'y sin la marca de vista combinada');
});

PRUEBAS.caso('⚠️ y la contraseña MÉDICA sigue abriendo la vista médica · el discriminador', () => {
  /* Si el arreglo hubiera roto el reconocimiento de la médica, lo de arriba pasaría por la razón
     equivocada — nadie entraría como médico nunca. */
  const api = p157Env(['validarAcceso'], { intrusaAntesDeMedica: true });
  const acc = api.validarAcceso('helitec', 'clave-med', 'd1');
  PRUEBAS.cierto(!!acc, 'la contraseña médica entra');
  if (!acc) return;
  PRUEBAS.igual(acc.vista, 'medico', '⚠️ con su vista, leída de la columna que dice «Médica»');
});

PRUEBAS.caso('🔒 y la de Dirección no se confunde con la médica · «Contraseña HSQ», sin la E', () => {
  const api = p157Env(['validarAcceso'], { intrusaAntesDeMedica: true });
  const acc = api.validarAcceso('helitec', 'clave-hseq', 'd1');
  PRUEBAS.cierto(!!acc, 'la de Dirección entra');
  if (!acc) return;
  PRUEBAS.igual(acc.vista, 'hseq', '🔒 con su propia vista');
});

PRUEBAS.caso('🔴 FALLA CERRADO: sin la columna EMPRESAS no entra nadie', () => {
  /* Tratar una columna que no se encuentra como vacía es lo que convierte al supervisor en médico.
     Romper el acceso se nota y se arregla; abrirlo de más, no. */
  const api = p157Env(['validarAcceso'], { sinEmpresas: true });
  PRUEBAS.igual(api.validarAcceso('helitec', 'clave-sup', 'd1'), null,
    '🔒 devuelve null · sin las tres columnas imprescindibles no se autentica a nadie');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR de todo lo anterior: con la hoja intacta, todo entra', () => {
  const api = p157Env(['validarAcceso','construirAlias','listaEmpresas']);
  const sup = api.validarAcceso('helitec', 'clave-sup', 'd1');
  PRUEBAS.igual(sup && sup.vista, 'supervisor', 'supervisor');
  PRUEBAS.igual((api.validarAcceso('helitec','clave-med','d1') || {}).vista, 'medico', 'médico');
  PRUEBAS.igual((api.validarAcceso('helitec','clave-hseq','d1') || {}).vista, 'hseq', 'Dirección');
  PRUEBAS.igual(api.validarAcceso('helitec', 'la-que-no-es', 'd1'), null, 'y la equivocada no entra');
});

PRUEBAS.caso('⚠️ `construirAlias` y `listaEmpresas` también leen por encabezado', () => {
  /* Si la columna de EMPRESAS se corre, `construirAlias()` devolvía `{}` y TODAS las
     canonicalizaciones de empresa del archivo dejaban de resolver, en silencio. */
  const api = p157Env(['construirAlias','listaEmpresas'], { intrusaAntesDeMedica: true });
  const alias = api.construirAlias();
  PRUEBAS.igual(alias['helitec'], 'Consorcio HELITEC',
    '⚠️ el alias resuelve · con la columna corrida devolvía {} y nada canonizaba');
  const emps = api.listaEmpresas();
  PRUEBAS.cierto(emps.indexOf('Consorcio HELITEC') >= 0,
    'y la lista de empresas sale bien · quedó [' + emps.join(', ') + ']');
});
