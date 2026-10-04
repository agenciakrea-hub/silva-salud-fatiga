/* ── `normFecha` y el TIPO de la celda de fecha ─────────────────────────────────────────────────
   (2026-10-03 · reescrito el mismo día, porque la primera versión medía el tipo equivocado)

   ⚠️ ESTE ARCHIVO EXISTE POR UN DIAGNÓSTICO FALSO MÍO, y lo cuenta entero porque la trampa se
   repite.

   LO QUE CREÍ: que el formulario escribía la fecha como TEXTO —`"Sat Oct 03 2026 10:16:12 GMT-0300
   (…)"`—, que `normFecha` la devolvía cruda, y que de ahí el orden por cadena de `aptAutoServer`
   dejaba el «último test» equivocado en 32 de 39 personas. Escribí que afectaba al 91 % de los
   registros y publiqué el arreglo con esos números.

   LO QUE ES: **en producción esa celda es un objeto `Date` de Sheets**, así que la PRIMERA línea de
   `normFecha` (`if (v instanceof Date)`) ya la resolvía. El defecto no existía: medido por el
   verificador en las 8 empresas y 73 personas, **0 diferencias**.

   DE DÓNDE SALIÓ EL ERROR: alimenté el emulador con la salida de `tarea=volcar`, que hace
   `String(celda)`. Un `Date` sale como esa misma cadena larga y **se ve idéntico a un texto**. El
   instrumento borró el tipo y después medí el efecto de su propio borrado.

   CÓMO SE COMPRUEBA EL TIPO, y es barato: los `IdCaso` que `cronCasosOdoo` grabó en `Casos Odoo`
   con el código ANTERIOR dicen `caso_carlos mendez_2026-07-16`. Ese id se arma con `r0.fecha`, o sea
   con la salida de `normFecha`: si la celda hubiera sido texto diría
   `caso_carlos mendez_Wed Jun 17 2026 13:18:00 GMT-0300 (…)`. Nueve de nueve coinciden con `Date`.
   **La planilla guarda la prueba de lo que el código leyó.**

   QUÉ SE PRUEBA ACÁ, entonces:
   1 · que el camino REAL (celda `Date`) funciona, y que la línea que lo hace funcionar es la
       primera — con su propio mutante, porque la primera versión de este archivo no la tocaba y
       habría quedado verde con esa línea borrada.
   2 · que la rama de texto es defensa útil: dos de las cinco hojas con fecha llegan como texto, la
       hoja la editan personas y según el CLAUDE.md también escribe otra IA.
   3 · las dos guardas de esa rama, que la primera versión no tenía.

   ⚠️ R17 · el caso entra por `parseRegistros` con el tipo que produce la hoja, no con el que a mí
   me resulta cómodo. R19 · cada derecho nombra la función que lo concede. */

PRUEBAS.grupo('normFecha · el tipo de la celda de fecha');

/* la forma que `volcar` produce al convertir un `Date` con `String()` — y que yo confundí con el
   contenido real de la celda */
const P215E_TXT = 'Sat Oct 03 2026 10:16:12 GMT-0300 (hora estándar de Argentina)';

/* ⚠️ 130 columnas y DOS filas de encabezado, como la hoja real; `parseRegistros` arranca en r=2 y
   lee por índices fijos (1 nombre, 2 departamento, 72 empresa, 73 fecha, 86 KSS). */
function p215eHoja(valorFecha, kss) {
  const cab = new Array(130).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa'; cab[73] = 'Fecha';
  const f = new Array(130).fill('');
  f[1] = 'ANA PRUEBA'; f[2] = 'Operaciones'; f[72] = 'Alfa'; f[73] = valorFecha; f[86] = String(kss);
  return [cab, cab.slice(), f];
}
const P215E_SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];

PRUEBAS.caso('🔴 el camino REAL: la celda es un `Date` y la resuelve la PRIMERA línea de `normFecha`', () => {
  /* EL DERECHO: la forma canónica de una fecha la fija `normFecha`, y todo el servidor la consume
     como `"yyyy-MM-dd"` — `aptFechaMsServer` la parsea así y `aptAutoServer` la ordena como cadena
     contando con eso. Lo que garantiza que la fecha del formulario llegue en esa forma es
     `if (v instanceof Date)`, la primera línea: Sheets entrega esa celda como objeto.
     ⚠️ Se entra por `parseRegistros` con un `Date` en la celda, que es lo que la hoja produce. La
     primera versión de este caso pasaba una CADENA y por eso bendecía un defecto inexistente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* ⚠️ LA FECHA ES **HOY**, NO UNA FIJA, y esto es el arreglo de un defecto de este mismo caso:
     la primera versión usaba `new Date(2026, 9, 3, ...)` y afirmaba `aptDiasDesdeServer === 0`
     «porque es de hoy en el fixture». Era de hoy **el día que lo escribí**. A la mañana siguiente
     el caso se puso en rojo solo (`esperaba 0, obtuvo 1`), sin que nadie tocara una línea.
     Un caso que depende del reloj no mide el código: mide qué día es. */
  const ahora = new Date();
  const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 10, 16, 12);
  const isoHoy = fecha.getFullYear() + '-' +
    String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
  const env = GS.crearEntorno({ 'Respuestas de formulario 1': p215eHoja(fecha, 5), 'Sesiones': [P215E_SES] });
  const api = GS.cargarGs(CTX.gs, env, ['parseRegistros', 'normFecha', 'aptDiasDesdeServer']);

  PRUEBAS.cierto(env.__libro.getSheetByName('Respuestas de formulario 1')
    .getDataRange().getValues()[2][73] instanceof Date,
    'guarda: la celda del fixture ES un objeto Date, como en producción');

  const regs = api.parseRegistros(env.__libro.getSheetByName('Respuestas de formulario 1').getDataRange().getValues());
  PRUEBAS.igual(regs.length, 1, 'guarda: `parseRegistros` acepta la fila');
  /* LO QUE TIENE QUE CAMBIAR si alguien borra la primera línea */
  PRUEBAS.igual(regs[0].fecha, isoHoy,
    '🔴 la fecha llega normalizada a `yyyy-MM-dd` por el camino real');
  PRUEBAS.igual(api.aptDiasDesdeServer(regs[0].fecha), 0,
    '🔴 y se le pueden contar los días: 0, porque la celda ES de hoy — calculado, no escrito a mano');
});

PRUEBAS.caso('🔴 la rama de TEXTO es defensa: si alguien pega la fecha como cadena, también se normaliza', () => {
  /* EL DERECHO: lo concede la rama `/^\w{3} (\w{3}) (\d{1,2}) (\d{4})/` de `normFecha`.
     ⚠️ NO CIERRA NINGÚN DEFECTO VIVO: en producción esa celda es un `Date` y esta rama es código
     muerto para la hoja del formulario. Se prueba porque dos de las cinco hojas con fecha llegan
     como texto, la hoja la editan personas, y el día que alguien pegue un valor —o que uno de los
     proyectos escritores (`SHEETS_ESTRES_URL`, `SHEETS_DEPRESION_URL`) cambie— esto es lo que evita
     que la fecha vuelva cruda y el orden por cadena se rompa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({ 'Respuestas de formulario 1': p215eHoja(P215E_TXT, 5), 'Sesiones': [P215E_SES] });
  const api = GS.cargarGs(CTX.gs, env, ['parseRegistros', 'normFecha']);
  const v = env.__libro.getSheetByName('Respuestas de formulario 1').getDataRange().getValues();
  PRUEBAS.igual(typeof v[2][73], 'string', 'guarda: acá la celda ES texto, no un Date');

  PRUEBAS.igual(api.parseRegistros(v)[0].fecha, '2026-10-03',
    '🔴 la cadena larga también se normaliza: antes volvía cruda y rompía el orden por cadena');
  /* LO QUE NO PUEDE CAMBIAR · los formatos que ya funcionaban, por sus propias ramas */
  PRUEBAS.igual(api.normFecha('03/10/2026'), '2026-10-03', '🔴 NO PUEDE CAMBIAR · `dd/mm/yyyy` (las filas de 2022)');
  PRUEBAS.igual(api.normFecha('2026-10-03'), '2026-10-03', '🔴 NO PUEDE CAMBIAR · ISO');
  PRUEBAS.igual(api.normFecha('46298'), '2026-10-03', '🔴 NO PUEDE CAMBIAR · el serial de Sheets');
  PRUEBAS.igual(api.normFecha(''), '', '🔴 NO PUEDE CAMBIAR · la vacía sigue vacía');
});

PRUEBAS.caso('🔴 las dos guardas: ni rollover ni abreviaturas en español inventan una fecha', () => {
  /* EL DERECHO, o más bien el freno: lo impone la validación del día contra el largo del mes y la
     tabla `MESES_JS_` dentro de `normFecha`. Las dos las encontró el verificador sobre la primera
     versión de esta rama, que no las tenía.
     · `new Date()` HACE ROLLOVER: `"Mie Feb 30 2026"` salía `2026-03-02`. Una fecha inventada es
       peor que una cruda, porque la cruda se nota en pantalla.
     · V8 LEE LAS ABREVIATURAS EN INGLÉS: `"Mar Ene 05 2026"` salía `2026-03-05` — toma `Mar` como
       marzo e ignora `Ene`. Y los usuarios son de Venezuela (R14), así que una fecha abreviada en
       español es realista, no un caso de laboratorio.
     ⚠️ Y MI PRIMER INTENTO DE GUARDA NO FUNCIONABA: comparé la salida contra
     `Date.parse(elPedido)`, y `Date.parse("2026-02-30")` **también rueda** a marzo, así que la
     diferencia daba cero y el rollover pasaba igual. Medir el rollover con la misma función que
     rueda no distingue nada. Ahora el día se valida con aritmética, antes de tocar `Date`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({ 'Sesiones': [P215E_SES] });
  const api = GS.cargarGs(CTX.gs, env, ['normFecha']);

  /* LO QUE TIENE QUE CAMBIAR · las tres vuelven crudas, no inventadas */
  PRUEBAS.igual(api.normFecha('Mie Feb 30 2026'), 'Mie Feb 30 2026',
    '🔴 ROLLOVER · «Feb 30» no existe: vuelve cruda, no sale `2026-03-02`');
  PRUEBAS.igual(api.normFecha('Sat Feb 30 2026 10:00:00 GMT-0300'), 'Sat Feb 30 2026 10:00:00 GMT-0300',
    '🔴 ROLLOVER · con hora, lo mismo');
  PRUEBAS.igual(api.normFecha('Mar Ene 05 2026'), 'Mar Ene 05 2026',
    '🔴 ESPAÑOL · «Ene» no se lee como marzo: vuelve cruda');
  /* y el 29 de febrero, que SÍ existe en año bisiesto: la guarda no puede ser más estricta que el calendario */
  PRUEBAS.igual(api.normFecha('Sat Feb 29 2024 10:00:00 GMT-0300'), '2024-02-29',
    '🔴 NO PUEDE CAMBIAR · el 29 de febrero de un año bisiesto SÍ se acepta');
  PRUEBAS.igual(api.normFecha('Thu Feb 29 2026 10:00:00 GMT-0300'), 'Thu Feb 29 2026 10:00:00 GMT-0300',
    '🔴 y el 29 de febrero de un año NO bisiesto vuelve crudo');
  /* LO QUE NO PUEDE CAMBIAR · lo que ya volvía crudo sigue volviendo crudo */
  PRUEBAS.igual(api.normFecha('Sat Zzz 03 2026 10:00:00 GMT-0300'), 'Sat Zzz 03 2026 10:00:00 GMT-0300',
    '🔴 NO PUEDE CAMBIAR · un mes impronunciable');
  PRUEBAS.igual(api.normFecha('Xyz Qrs 99 2026'), 'Xyz Qrs 99 2026',
    '🔴 NO PUEDE CAMBIAR · basura con la forma de fecha');
  PRUEBAS.igual(api.normFecha('no es una fecha'), 'no es una fecha',
    '🔴 NO PUEDE CAMBIAR · texto libre');
});
