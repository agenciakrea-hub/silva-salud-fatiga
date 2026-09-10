PRUEBAS.grupo('P163 · `Identidades` por encabezado, y la fila 1 que se pisaba a sí misma');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Es el patrón de P147 (`Registrados Fatiga`) y P157 (`Accesos`) en la tercera hoja donde muerde,
   con un agravante propio: **el código borraba la evidencia del problema**.

   `Identidades` es la hoja que un humano abre para corregir a mano las variantes de nombre que el
   sistema no pudo resolver — y la mantiene gente que no es del equipo. Si alguien inserta una
   columna antes de C, pasaban tres cosas a la vez:
     (a) `leerOverridesIdentidad` leía `v[i][2]`, que ahora es la columna nueva; `cedulaNorm` le
         saca todo lo no numérico y devuelve '' → TODAS las correcciones manuales dejaban de
         aplicarse EN SILENCIO, y las personas volvían a contarse como varias;
     (b) `obtenerHojaIdentidades` REESCRIBÍA la fila 1 con `IDENT_HEAD`: la planilla volvía a decir
         «Cedula» encima de la columna equivocada, y no quedaba ni rastro de que alguien insertó
         algo. El arreglo automático borraba la única pista;
     (c) `anotarVariantes` seguía apilando filas con el layout viejo, mezclando dos formatos.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): `construirResolutor().resolver(nombre, empresa)`, que es
   lo que el endpoint aplica a todos los arrays que devuelve. Llamar a `leerOverridesIdentidad`
   sola probaría la pieza, no que el llamador reciba lo que necesita.

   ⚠️ Y FALLA CERRADO A PROPÓSITO. Si el mapa no resuelve `Variante` y `Cedula`, no se devuelve
   ningún override. Un override mal leído no deja a alguien sin resolver: le pone la cédula de
   OTRA persona (es exactamente lo que persiguió P152). No aplicar la corrección deja a alguien
   contado como varios — visible y molesto. Aplicarla mal junta datos clínicos de dos personas.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P163_CED = '19283746';
const P163_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P163_CAB_IDENT = ['Variante','Empresa','Cedula','ResueltoPor','Como','Registros','PrimeraVez','UltimaVez'];

function p163Reg(nombre, ced, empresa){
  const f = new Array(P163_CAB_REG.length).fill('');
  f[2] = nombre; f[4] = ced; f[8] = empresa; f[3] = 'x@x.com';
  return f;
}
/* `o.insertar` mete una columna nueva en la posición dada, en el encabezado Y en cada fila —
   que es exactamente lo que hace Sheets cuando alguien inserta una columna a mano. */
function p163Env(fns, o){
  o = o || {};
  let cab = (o.cab || P163_CAB_IDENT).slice();
  let filas = (o.ident || []).map(f => f.slice());
  if (o.insertar !== undefined){
    cab.splice(o.insertar, 0, 'Notas internas');
    filas = filas.map(f => { f.splice(o.insertar, 0, ''); return f; });
  }
  if (o.quitar !== undefined){
    cab.splice(o.quitar, 1);
    filas = filas.map(f => { f.splice(o.quitar, 1); return f; });
  }
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana María Suárez', P163_CED,'Operaciones','Piloto','F','34','','','Sí','','','4']],
    /* La persona escribió su nombre distinto en la app: ésta es la variante que el humano corrige
       a mano en `Identidades`. Sin la corrección, «Ana Suarez» y «Ana María Suárez» son dos. */
    'Registrados Fatiga': [P163_CAB_REG.slice(), p163Reg('Ana María Suárez', P163_CED, 'Consorcio HELITEC')],
    'Identidades': [cab].concat(filas),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
/* La corrección que un humano escribió: «Ana Suarez» (como la tipeó ella) es esta cédula.
   `ResueltoPor` vacío = la máquina la dejó sin resolver y la completó una persona. */
const P163_FILA = () => ['Ana Suarez','Consorcio HELITEC', P163_CED, '', 'pendiente', '4', '', ''];
const p163Hoja = api => api.__env.__libro.getSheetByName('Identidades').getDataRange().getValues();

PRUEBAS.caso('⚠️ DISCRIMINADOR · con la hoja intacta la corrección manual SÍ se aplica', () => {
  /* Sin esto, todo lo de abajo pasaría por la razón equivocada: si la corrección no se aplicara
     nunca, «sigue aplicándose con una columna insertada» daría verde con el arreglo muerto. */
  const api = p163Env(['construirResolutor'], { ident: [P163_FILA()] });
  const r = api.construirResolutor().resolver('Ana Suarez', 'Consorcio HELITEC');
  PRUEBAS.igual(r.cedula, P163_CED, 'la variante resuelve a la cédula que puso el humano');
  PRUEBAS.igual(r.persona, 'Ana María Suárez', 'y al nombre del padrón, no al que se tipeó');
});

PRUEBAS.caso('🔴 con una columna INSERTADA antes de la cédula, la corrección sigue aplicándose', () => {
  /* EL DEFECTO. El índice 2 pasaba a leer la columna nueva vacía, `cedulaNorm` devolvía '' y el
     `continue` de la línea siguiente descartaba la fila. Todas las correcciones manuales, fuera. */
  const api = p163Env(['construirResolutor'], { ident: [P163_FILA()], insertar: 2 });
  const r = api.construirResolutor().resolver('Ana Suarez', 'Consorcio HELITEC');
  PRUEBAS.igual(r.cedula, P163_CED,
    '🔴 la cédula se busca por el encabezado «Cedula», no por estar en la tercera posición');
  PRUEBAS.igual(r.persona, 'Ana María Suárez', 'y la persona sigue siendo UNA, no dos');
});

PRUEBAS.caso('🔴 con una columna insertada al PRINCIPIO, también · la variante se corre igual', () => {
  const api = p163Env(['construirResolutor'], { ident: [P163_FILA()], insertar: 0 });
  const r = api.construirResolutor().resolver('Ana Suarez', 'Consorcio HELITEC');
  PRUEBAS.igual(r.cedula, P163_CED, '🔴 `Variante` también se resuelve por encabezado');
});

PRUEBAS.caso('🔴 LA FILA 1 NO SE PISA · era lo que borraba la evidencia', () => {
  /* EL AGRAVANTE, y el motivo por el que este hallazgo era alto. Con una columna insertada, el
     código reescribía la fila 1 con `IDENT_HEAD`: la planilla volvía a decir «Cedula» sobre la
     columna equivocada, mintiéndole a la persona que la abre para corregir identidades, y nadie
     podía notar que algo se movió. Se entra por `obtenerHojaIdentidades()`, que es quien lo hacía. */
  const api = p163Env(['obtenerHojaIdentidades','identCols','identColsOk'], { ident: [P163_FILA()], insertar: 2 });
  const antes = p163Hoja(api)[0].map(String);
  api.obtenerHojaIdentidades();
  const despues = p163Hoja(api)[0].map(String);
  PRUEBAS.igual(despues, antes,
    '🔴 el encabezado tiene que quedar EXACTAMENTE como lo dejó quien insertó la columna');
  PRUEBAS.cierto(despues.indexOf('Notas internas') >= 0,
    '⚠️ y la columna nueva sigue nombrada: es la pista de que alguien la agregó');
  PRUEBAS.igual(p163Hoja(api).length, 2, 'y ninguna fila de datos se movió');
});

PRUEBAS.caso('⚠️ pero una hoja VACÍA sí recibe su encabezado · el discriminador del anterior', () => {
  /* Si «no pisar nunca» se hubiera implementado como «no escribir nunca», una hoja recién creada
     quedaría sin encabezados y este archivo entero pasaría igual. */
  const api = p163Env(['obtenerHojaIdentidades'], { ident: [], cab: ['','','','','','','',''] });
  api.obtenerHojaIdentidades();
  const cab = p163Hoja(api)[0].map(String);
  PRUEBAS.igual(cab, P163_CAB_IDENT, '⚠️ sin datos, la fila 1 sí se escribe');
});

PRUEBAS.caso('🔒 sin columna `Cedula` no se inventa ningún override · falla CERRADO', () => {
  /* Un override mal leído no deja a alguien sin resolver: le pone la cédula de otra persona.
     Preferimos que la corrección no se aplique —visible, molesto, arreglable— antes que juntar
     los datos clínicos de dos personas, que no se ve. */
  const api = p163Env(['leerOverridesIdentidad','identCols','identColsOk','construirAlias'],
                      { ident: [P163_FILA()], quitar: 2 });
  const o = api.leerOverridesIdentidad({});
  PRUEBAS.igual(Object.keys(o.porNombre || {}).length, 0, '🔒 ningún override por nombre');
  PRUEBAS.igual(Object.keys(o.porNombreEmpresa || {}).length, 0, '🔒 ni por nombre + empresa');
});

PRUEBAS.caso('⚠️ y el problema queda ANOTADO, porque no aplicar una corrección es invisible', () => {
  /* Nadie ve una corrección que no ocurrió. Sin esto, la hoja se rompe y la única señal es que
     una persona vuelve a aparecer duplicada en un panel, semanas después. */
  const api = p163Env(['obtenerHojaIdentidades','identCols','identColsOk','identAnotarProblema',
                       'identLimpiarProblema','mantSalud'], { ident: [P163_FILA()], quitar: 2 });
  api.obtenerHojaIdentidades();
  const s = api.mantSalud();
  PRUEBAS.cierto(!!s.identidadesUltimoError,
    '⚠️ `mantSalud()` tiene que decirlo · viaja en CADA respuesta de mantenimiento');
  PRUEBAS.cierto(String(s.identidadesUltimoError).indexOf('Identidades') >= 0,
    'y nombrar la hoja, para que se sepa dónde mirar');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR del aviso: con la hoja sana no queda ningún error colgado', () => {
  /* Un aviso que está siempre encendido es igual de inútil que uno que no se enciende nunca. */
  const api = p163Env(['obtenerHojaIdentidades','identCols','identColsOk','identAnotarProblema',
                       'identLimpiarProblema','mantSalud'], { ident: [P163_FILA()] });
  api.obtenerHojaIdentidades();
  PRUEBAS.falso(!!api.mantSalud().identidadesUltimoError, '⚠️ con la hoja sana, sin aviso');
});

PRUEBAS.caso('⚠️ el encabezado VIEJO `NombreCanonico` se sigue leyendo', () => {
  /* Esa columna se llamaba así y la reescritura ciega de la fila 1 existía para renombrarla. Al
     sacar la reescritura, una hoja que quedó con el nombre viejo tiene que seguir funcionando —
     si no, el arreglo rompería justo lo que la reescritura protegía.
     Con `ResueltoPor = "exacto"` el override sólo vale con empresa (es la deducción de la máquina,
     no la afirmación de una persona): que valga por nombre+empresa prueba que la columna se leyó. */
  const fila = ['Ana Suarez','Consorcio HELITEC', P163_CED, 'exacto', 'pendiente', '4', '', ''];
  const api = p163Env(['leerOverridesIdentidad','identCols','identColsOk','construirAlias'],
    { ident: [fila], cab: ['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez'] });
  const o = api.leerOverridesIdentidad(api.construirAlias());
  PRUEBAS.igual(Object.keys(o.porNombre || {}).length, 0,
    '⚠️ «exacto» se leyó: por eso NO entra al índice por nombre a secas');
  PRUEBAS.igual(Object.keys(o.porNombreEmpresa || {}).length, 1,
    'y sí al de nombre + empresa, que es donde una deducción de la máquina sí vale');
});

PRUEBAS.caso('🔴 `anotarVariantes` escribe en LAS COLUMNAS, no en las posiciones', () => {
  /* La tercera pata del hallazgo: el escritor volcaba 8 valores en orden fijo, así que sobre una
     hoja con una columna insertada apilaba filas con el layout viejo — dos formatos mezclados en
     la planilla que un humano lee para tomar decisiones sobre identidades de personas. */
  const api = p163Env(['anotarVariantes','obtenerHojaIdentidades','identCols','identColsOk'],
                      { ident: [P163_FILA()], insertar: 1 });   // columna nueva entre Variante y Empresa
  const n = api.anotarVariantes({
    'juan perez': { variante:'Juan Pérez', empresa:'Consorcio HELITEC', cedula:'55555555',
                    como:'exacto', n:3 }
  });
  PRUEBAS.igual(n, 1, 'guarda: se anotó la variante nueva');
  const v = p163Hoja(api);
  const cab = v[0].map(String);
  const nueva = v[v.length - 1];
  PRUEBAS.igual(String(nueva[cab.indexOf('Variante')]), 'Juan Pérez', '🔴 el nombre, bajo «Variante»');
  PRUEBAS.igual(String(nueva[cab.indexOf('Cedula')]), '55555555', '🔴 la cédula, bajo «Cedula»');
  PRUEBAS.igual(String(nueva[cab.indexOf('Empresa')]), 'Consorcio HELITEC', 'la empresa, bajo «Empresa»');
  PRUEBAS.igual(String(nueva[cab.indexOf('Notas internas')]), '',
    '⚠️ y la columna ajena queda VACÍA: no se le escribe encima a lo que puso otro');
  PRUEBAS.igual(nueva.length, cab.length, 'la fila tiene el ancho real de la hoja');
});

PRUEBAS.caso('🔒 con la hoja rota, `anotarVariantes` no escribe nada', () => {
  const api = p163Env(['anotarVariantes','obtenerHojaIdentidades','identCols','identColsOk'],
                      { ident: [P163_FILA()], quitar: 0 });   // sin la columna Variante
  const antes = p163Hoja(api).length;
  const n = api.anotarVariantes({ 'juan perez': { variante:'Juan Pérez', empresa:'X', cedula:'5', como:'exacto', n:1 } });
  PRUEBAS.igual(n, 0, '🔒 no anota');
  PRUEBAS.igual(p163Hoja(api).length, antes,
    '🔒 y no crece la hoja: escribir a ciegas donde un humano corrige identidades es peor que no anotar');
});

/* ⚠️ El caso contra los encabezados REALES del CH vive en `p158-encabezados-reales.js`, que ya
   tiene el helper que baja `encabezados-ch.json`. Se llama «`Identidades`: las ocho columnas
   resuelven con los títulos reales» y es el que avisa si alguien renombra una columna allá. */
