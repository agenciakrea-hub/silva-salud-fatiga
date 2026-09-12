/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P039 · T5 · DEPARTAMENTOS: DARLOS DE ALTA Y DE BAJA                             (2026-09-06)

   ── POR QUÉ TODO ENTRA POR LA ACCIÓN DEL POST (R17) ─────────────────────────────────────────
   Ni un solo caso llama a `depClave`, `depBuscarFila` ni `depDeEmpresa` directamente, y no es por
   prolijidad: en este proyecto ya se entregaron TRES funciones en verde que no andaban, las tres
   porque la prueba armaba el estado a mano y probaba la pieza en vez del uso. Acá el estado lo
   arma `accionDepartamentoGuardar` de verdad, con contraseña de verdad, y lo lee
   `accionDepartamentos` de verdad. Si mañana alguien cambia cómo se deriva la clave en UN lado, el
   caso «el escritor y el lector agrupan igual» se pone rojo — que es exactamente lo que ninguna de
   las tres suites anteriores podía hacer.
   Y los dos casos de historial entran por `accionSupervisor` y por `manejar({action:'listas'})`,
   que son los llamadores REALES de lo que esta hoja afecta.

   ── LOS TRES CASOS BORDE DEL PLAN, CADA UNO CON SU CASO ──────────────────────────────────────
   1. Dos supervisores a la vez  →  «dos altas simultáneas» y «una fila duplicada por candado
      perdido»: el lector y el escritor tienen que ponerse de acuerdo en CUÁL fila vale.
   2. Sacar un departamento con gente adentro  →  «se niega y dice cuántas» + «con forzar, la
      gente NO se toca».
   3. Volver a darlo de alta  →  «misma fila, sin perder el alta original».

   ── LA TRAMPA QUE MÁS CARO SALÍA, Y QUE ESTÁ CUBIERTA ────────────────────────────────────────
   Una empresa SIN contraseña médica separada recibe `vista:"medico"` con `combinada:true` para su
   ÚNICA contraseña — la del supervisor. Rechazar "medico" a secas habría dejado sin administrar
   sus departamentos a toda empresa que no separó los roles, que hoy son la mayoría. Los dos casos
   («la médica separada NO puede» / «la combinada SÍ puede») son uno el discriminador del otro:
   sin el segundo, el primero pasaría igual con la regla equivocada.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P039 · departamentos: alta, baja lógica y los tres casos borde');

/* ── El CH de prueba ────────────────────────────────────────────────────────────────────────────
   DOS empresas a propósito:
     · `helitec`  → tiene ClaveMedica (col E) y ClaveHseq (col F): sus tres vistas son distintas.
     · `cardon`   → NO tiene ClaveMedica: su única contraseña abre `vista:"medico"` con
                    `combinada:true`. Es la que destapa la trampa de arriba.
   La nómina escribe la empresa como "Helitec" (una VARIANTE), no como la forma canónica
   "Consorcio HELITEC": así el cruce por `nominaEmpresaCanon` queda ejercitado y no supuesto. */
const P039_HOY = new Date().toISOString().substring(0, 10);

function p039Fila(persona, dep, empresa, kss) {
  const f = new Array(90).fill('');
  f[0] = P039_HOY + ' 08:00:00';   // marca temporal
  f[1] = persona;                  // COL_PERSONA = 2
  f[2] = dep;                      // COL_DEPTO   = 3
  f[72] = empresa;                 // COL_EMPRESA = 73
  f[73] = P039_HOY;                // COL_FECHA   = 74
  f[86] = kss;                     // COL_KSS     = 87
  return f;
}

/* ⚠️ P134 · ESTAS LLAMADAS AHORA MANDAN LA EMPRESA, y no es un ajuste de forma: cambió lo que la
   acción promete. `action=listas` devolvía la unión de las áreas de TODOS los clientes —el padrón—
   a cualquiera con la URL. Desde P134 filtra por la empresa que pregunta y sin empresa no devuelve
   nada, así que estos casos, que llamaban `{action:'listas'}` a secas, pasaron a medir una lista
   vacía.
   Lo que vigilan sigue valiendo y de hecho queda MÁS fuerte: «la baja de Cardón no le saca
   Mantenimiento a Consorcio HELITEC» era antes una consecuencia de colapsar todas las empresas en
   una lista; ahora es directamente que cada una ve la suya. */
const P039_EMP = 'Consorcio HELITEC';

function p039Hojas(extra) {
  const h = {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq'],
                ['helitec', 'sup-039', 'empresa', 'Consorcio HELITEC, Helitec', 'med-039', 'dir-039'],
                ['cardon',  'sup-c39', 'empresa', 'Cardón', '', '']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p039Fila('Ana Suárez',  'Operaciones',   'Consorcio HELITEC', 7),
      p039Fila('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC', 3)],
    'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
                'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
               ['Helitec', 'Ana Suárez',   'V-11111', 'Operaciones',   'Piloto',  'F', '40', '', '', 'Sí', '', '', '3'],
               ['Helitec', 'Luis Ferrer',  'V-22222', 'Mantenimiento', 'Técnico', 'M', '35', '', '', 'No', '', '', '2'],
               ['Helitec', 'Carmen Rojas', 'V-33333', 'Operaciones',   'Piloto',  'F', '30', '', '', 'Sí', '', '', '3'],
               ['Cardón',  'Pedro Salas',  'V-44444', 'Planta',        'Operario','M', '45', '', '', 'No', '', '', '4']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Nombre', 'Empresa', 'Departamento', 'Reacciones válidas']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento',
                     'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'IdTurno', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Fecha de registro', 'Última actualización', 'Nombre', 'Email', 'Cédula']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
  Object.keys(extra || {}).forEach(k => { h[k] = extra[k]; });
  return h;
}

/* Abre el endpoint REAL sobre un CH nuevo. Cada caso monta el suyo: una prueba de duplicados no
   puede depender de lo que dejó otra. */
function p039Api(extra) {
  const env = GS.crearEntorno(p039Hojas(extra));
  const api = GS.cargarGs(CTX.gs, env,
    ['accionDepartamentos', 'accionDepartamentoGuardar', 'accionDepartamentoBaja',
     'accionSupervisor', 'manejar']);
  api.__env = env;
  return api;
}

/* El encabezado se LEE del .gs, no se copia acá. Si mañana se agrega una columna, el caso del
   formato la mira también en vez de quedarse comprobando siete columnas de un archivo que ya
   tiene ocho. Mismo criterio que `p051Metricas()`.
   (`cargarGs` sólo puede exportar funciones, así que una constante hay que leerla de la fuente.) */
function p039Head() {
  const m = /var DEP_HEAD\s*=\s*\[([^\]]+)\]/.exec(CTX.gs || '');
  return m ? m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}

const P039_SUP  = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'sup-039', dispositivoId: 'p039' };
const P039_MED  = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'med-039', dispositivoId: 'p039' };
const P039_HSEQ = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'dir-039', dispositivoId: 'p039' };
const P039_CARD = { usuario: 'cardon',  empresa: 'Cardón',            pass: 'sup-c39', dispositivoId: 'p039' };

function p039Con(base, extra) { return Object.assign({}, base, extra || {}); }
function p039Json(salida) { return JSON.parse(salida.getContent()); }

function p039Alta(api, cred, nombre, extra) {
  return p039Json(api.accionDepartamentoGuardar(p039Con(cred, Object.assign({ nombre: nombre }, extra || {}))));
}
function p039Baja(api, cred, nombre, extra) {
  return p039Json(api.accionDepartamentoBaja(p039Con(cred, Object.assign({ nombre: nombre }, extra || {}))));
}
function p039Leer(api, cred) {
  return p039Json(api.accionDepartamentos(p039Con(cred || P039_SUP)));
}
/* Las filas de la hoja `Departamentos` tal como quedaron, sin el encabezado. Es el volcado crudo:
   lo que un humano vería si abriera el CH. */
function p039Filas(api) {
  const sh = api.__env.__libro.getSheetByName('Departamentos');
  if (!sh) return null;
  return sh.__volcado().slice(1).filter(f => String(f[0] || '').trim() !== '');
}
function p039Dep(lista, nombre) {
  return (lista || []).filter(d => String(d.nombre).toLowerCase() === String(nombre).toLowerCase())[0] || null;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   GUARDA DE MEDIBILIDAD
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · las tres acciones contestan y el CH falso tiene gente', () => {
  /* Sin esto, un error de montaje del CH dejaría a TODOS los casos de abajo comprobando sobre
     `{}` — y varios son de la forma "no aparece X", que con un objeto vacío dan verde. Un cero sin
     discriminador no es un resultado (R17). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p039Api();
  const leer = p039Leer(api);
  PRUEBAS.igual(leer.ok, true, '⚠️ `departamentos` no contestó · ' + JSON.stringify(leer.error || ''));
  PRUEBAS.igual(leer.empresa, 'Consorcio HELITEC',
    '⚠️ el alcance tiene que resolverse a la forma CANÓNICA de la empresa, no al usuario');
  PRUEBAS.alMenos((leer.departamentos || []).length, 2,
    '⚠️ la nómina de prueba tiene Operaciones y Mantenimiento: si salen 0, el cruce por empresa ' +
    'no funciona y "el departamento está vacío" sería cierto por vacío en toda la suite');
  PRUEBAS.igual(p039Alta(api, P039_SUP, 'Seguridad Operacional').ok, true, 'y el alta contesta');
  PRUEBAS.igual(p039Baja(api, P039_SUP, 'Seguridad Operacional').ok, true, 'y la baja también');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   R15 · DÓNDE CAE, CON QUÉ FORMATO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ R15 · la hoja se crea con su encabezado y en formato TEXTO, en CADA acceso', () => {
  /* El formato "@" no es cosmético: acá viven dos fechas ISO y el NOMBRE del área. Un
     departamento llamado "Turno 3" se guardaría como el número 3 y dejaría de matchear contra el
     texto de los registros — que es el mismo golpe que ya se pagó con los teléfonos de `Nómina`.
     Se comprueba sobre una fila MUY por debajo de los datos: el endpoint aplica el formato sobre
     `getMaxRows()` justamente para que ya esté puesto cuando más adelante se escriba. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const head = p039Head();
  PRUEBAS.alMenos(head.length, 7,
    '⚠️ GUARDA DE MEDIBILIDAD: no se pudo leer `DEP_HEAD` del .gs. Sin eso las comparaciones de ' +
    'abajo compararían contra un arreglo vacío y pasarían sin mirar nada');
  p039Alta(api, P039_SUP, 'Operaciones');
  const sh = api.__env.__libro.getSheetByName('Departamentos');
  PRUEBAS.cierto(!!sh, '⚠️ la hoja `Departamentos` no se creó');
  if (!sh || !head.length) return;
  PRUEBAS.igual(sh.__volcado()[0], head,
    'el encabezado tiene que ser exactamente DEP_HEAD, leído del .gs y no copiado acá');
  PRUEBAS.igual(sh.__formatoDe(1, 1), '@', 'la celda del encabezado, en texto');
  PRUEBAS.igual(sh.__formatoDe(500, 2), '@',
    '⚠️ y una fila todavía sin escribir: el formato se aplica sobre getMaxRows() para que ya esté ' +
    'cuando alguien agregue un departamento más adelante');
  PRUEBAS.igual(sh.__formatoDe(500, head.length), '@', 'hasta la última columna');
});

PRUEBAS.caso('⚠️ R15 · las 7 columnas dicen quién dio de alta y quién dio de baja', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Franco V.' });
  const fila = (p039Filas(api) || [])[0] || [];
  PRUEBAS.igual([fila[0], fila[1], fila[2]], ['Consorcio HELITEC', 'Seguridad Operacional', 'activo'],
    'empresa canónica, nombre y estado');
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}T/.test(String(fila[3])),
    '⚠️ la fecha de alta va en ISO · quedó: ' + JSON.stringify(fila[3]) +
    ' — una fecha ambigua (04/08 ¿abril u agosto?) ya rompió datos en este proyecto');
  PRUEBAS.igual(fila[4], 'Franco V.', 'y quién lo dio de alta');
  PRUEBAS.igual([fila[5], fila[6]], ['', ''], 'las dos de baja, vacías mientras esté activo');
});

PRUEBAS.caso('⚠️ el EMULADOR respeta los literales del patrón de fecha (lo destapó este prompt)', () => {
  /* No es un caso del endpoint: es un caso de la HERRAMIENTA. Apps Script usa `SimpleDateFormat`,
     donde lo que va entre comillas simples se copia tal cual y las comillas desaparecen. El
     emulador reemplazaba a ciegas y devolvía `2026-09-06'T'12:34:17`: los dos casos de fecha de
     acá arriba se pusieron rojos con el .gs CORRECTO.
     Una herramienta de verificación que miente es peor que no tenerla, y el encabezado del
     emulador advierte del riesgo en la dirección opuesta (fingir de más). Este caso deja la
     dirección que faltaba tapada. */
  const d = new Date('2026-09-06T12:34:17Z');
  PRUEBAS.igual(GS.formatearFecha(d, 'UTC', "yyyy-MM-dd'T'HH:mm:ss"), '2026-09-06T12:34:17',
    "⚠️ el literal 'T' se copia sin las comillas: es el patrón de `formatoIsoLocal_`");
  PRUEBAS.igual(GS.formatearFecha(d, 'UTC', 'dd/MM/yyyy HH:mm'), '06/09/2026 12:34',
    'DISCRIMINADOR: el patrón sin literales, que es el que usan las otras 10 llamadas, no cambió');
  PRUEBAS.igual(GS.formatearFecha(d, 'UTC', 'yyyy-MM-dd'), '2026-09-06', 'ni el de fecha sola');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ALTA · incluido el departamento VACÍO, que antes no tenía dónde guardarse
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ se puede dar de alta un departamento VACÍO, sin una sola persona adentro', () => {
  /* Es la razón de ser de la hoja. Antes la lista de departamentos se DERIVABA de los textos ya
     escritos, así que un área nueva no existía hasta que alguien de ahí contestara un test —
     y para contestar tenía que poder elegirla. El pez que se muerde la cola. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const r = p039Alta(api, P039_SUP, 'Seguridad Operacional');
  PRUEBAS.igual([r.ok, r.nuevo], [true, true], 'el alta responde que es nuevo');
  const d = p039Dep(p039Leer(api).departamentos, 'Seguridad Operacional');
  PRUEBAS.cierto(!!d, '⚠️ y el lector lo devuelve · llegaron: ' +
    (p039Leer(api).departamentos || []).map(x => x.nombre).join(', '));
  if (!d) return;
  PRUEBAS.igual([d.estado, d.origen, d.personas], ['activo', 'hoja', 0],
    'activo, con fila propia y sin nadie asignado todavía');
});

PRUEBAS.caso('⚠️ los que sólo existen en la NÓMINA también se ven, marcados como derivados', () => {
  /* Sin esto el panel arrancaría VACÍO el primer día y quien lo abriera concluiría que sus
     departamentos desaparecieron. Y peor: daría de alta a mano los que ya existen, duplicando
     nombres apenas distintos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const lista = p039Leer(api).departamentos || [];
  const ops = p039Dep(lista, 'Operaciones');
  PRUEBAS.cierto(!!ops, '⚠️ Operaciones está en la nómina de prueba y tiene que aparecer');
  if (!ops) return;
  PRUEBAS.igual([ops.origen, ops.estado, ops.personas], ['nomina', 'activo', 2],
    '⚠️ derivado de la nómina, activo, y con las DOS personas que tiene · si dice 0, el cruce por ' +
    'empresa canónica no funciona y la baja "sin gente" se aceptaría sobre un área llena');
  PRUEBAS.igual((p039Dep(lista, 'Planta') || {}).nombre, undefined,
    '⚠️ y Planta es de Cardón: no puede aparecer en la lista de Helitec');
});

PRUEBAS.caso('⚠️ dos altas iguales dejan UNA fila (upsert, nunca append ciego)', () => {
  /* Un doble toque o un reintento de la cola. R15 lo pide para todo lo que la app pueda reenviar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional');
  const dos = p039Alta(api, P039_SUP, 'Seguridad Operacional');
  PRUEBAS.igual([dos.ok, dos.nuevo, dos.actualizado], [true, undefined, true],
    'la segunda dice que actualizó, no que creó');
  PRUEBAS.igual((p039Filas(api) || []).length, 1,
    '⚠️ tiene que quedar UNA fila · quedaron: ' + JSON.stringify(p039Filas(api)));
});

PRUEBAS.caso('⚠️ EL ESCRITOR Y EL LECTOR AGRUPAN IGUAL: mayúsculas, acentos y espacios no duplican', () => {
  /* El defecto que más veces apareció en la auditoría. Antes de P039 había TRES derivaciones del
     mismo concepto conviviendo: `listaDepartamentos()` deduplicaba por la cadena cruda,
     `nivelRiesgoDeServer()` por `norm()` y `nivelCoincideServer()` por `dashNormServer()`. O sea
     que "Operaciones" y "operaciones " eran dos opciones del combo del alta y una sola regla de
     nivel de riesgo, y nada lo delataba.
     Se entra por el POST cuatro veces con cuatro formas de escribir lo mismo: si el escritor y el
     lector volvieran a derivar distinto, acá quedarían dos o más filas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  ['Operación Aérea', 'operacion aerea', 'OPERACIÓN  AÉREA', '  Operación Aérea  ']
    .forEach(n => p039Alta(api, P039_SUP, n));
  const filas = p039Filas(api) || [];
  PRUEBAS.igual(filas.length, 1,
    '⚠️ las cuatro formas son el MISMO departamento · quedaron ' + filas.length + ' filas: ' +
    JSON.stringify(filas.map(f => f[1])));
  const lista = (p039Leer(api).departamentos || []).filter(d => d.clave.indexOf('operacion aerea') >= 0);
  PRUEBAS.igual(lista.length, 1, '⚠️ y el lector también ve una sola');
  PRUEBAS.igual((lista[0] || {}).nombre, 'Operación Aérea',
    '⚠️ y muestra la ÚLTIMA forma escrita, no una versión aplastada: el nombre lo elige quien ' +
    'administra su área, la normalización es sólo para no duplicar');
});

PRUEBAS.caso('un nombre que se queda sin letras ni números se rechaza, y no deja fila', () => {
  /* "---" o "..." pasan el `trim` pero `depClave()` los deja vacíos: sería una fila que ninguna
     búsqueda puede volver a encontrar, imposible de dar de baja después. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const r = p039Alta(api, P039_SUP, '---');
  PRUEBAS.igual([r.ok, r.motivo], [false, 'nombre_invalido'], 'se rechaza con motivo');
  PRUEBAS.igual((p039Filas(api) || []).length, 0, '⚠️ y no queda ninguna fila escrita');
  const largo = p039Alta(api, P039_SUP, new Array(70).join('x'));
  PRUEBAS.igual([largo.ok, largo.motivo], [false, 'nombre_largo'], 'y un nombre kilométrico también');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   BAJA LÓGICA · nunca un borrado
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ la baja NO borra la fila: la deja con fecha y con quién la hizo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Franco V.' });
  const antes = (p039Filas(api) || [])[0];
  const r = p039Baja(api, P039_SUP, 'Seguridad Operacional', { quien: 'Marta R.' });
  PRUEBAS.igual([r.ok, r.baja], [true, true], 'la baja responde ok');
  const filas = p039Filas(api) || [];
  PRUEBAS.igual(filas.length, 1, '⚠️ la fila sigue estando: es baja LÓGICA, no un borrado');
  const f = filas[0] || [];
  PRUEBAS.igual(f[2], 'baja', 'con el estado en baja');
  PRUEBAS.igual([f[3], f[4]], [antes[3], antes[4]],
    '⚠️ y conservando el alta original: quién y cuándo lo creó no se pierde al darlo de baja');
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}T/.test(String(f[5])), 'la fecha de baja, en ISO · ' + JSON.stringify(f[5]));
  PRUEBAS.igual(f[6], 'Marta R.', 'y quién la hizo, que no es quien lo creó');
});

PRUEBAS.caso('⚠️ EL HISTORIAL DE UN DEPARTAMENTO DADO DE BAJA SE SIGUE LEYENDO', () => {
  /* La mitad del pedido de T5, y la que rompería en silencio: si dar de baja escondiera los
     registros viejos, el panel perdería datos de personas reales sin que nadie lo pidiera.
     Se entra por `accionSupervisor` —el llamador REAL del panel— y no por `leerRegistros`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const conta = () => (p039Json(api.accionSupervisor(P039_SUP)).registros || [])
    .filter(r => String(r.departamento).toLowerCase() === 'operaciones').length;
  const antes = conta();
  PRUEBAS.alMenos(antes, 1,
    '⚠️ DISCRIMINADOR: si antes de la baja ya hubiera 0 registros de Operaciones, el caso de ' +
    'abajo daría verde sin comprobar nada');
  p039Baja(api, P039_SUP, 'Operaciones', { forzar: '1' });
  PRUEBAS.igual(conta(), antes,
    '⚠️ después de la baja tienen que seguir los MISMOS registros · antes ' + antes + ', ahora ' + conta());
});

PRUEBAS.caso('⚠️ un departamento de baja deja de ofrecerse en el alta (action=listas)', () => {
  /* El otro lado de la moneda: el historial se conserva, pero nadie NUEVO puede asignarse ahí.
     Se entra por `manejar({action:'listas'})`, que es la acción real que consume el combo del
     alta, y no por `listaDepartamentos()` a secas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const listas = () => p039Json(api.manejar({ action: 'listas', empresa: P039_EMP })).departamentos || [];
  PRUEBAS.cierto(listas().indexOf('Operaciones') >= 0,
    '⚠️ DISCRIMINADOR: antes de la baja, Operaciones TIENE que estar en el combo · ' + JSON.stringify(listas()));
  p039Baja(api, P039_SUP, 'Operaciones', { forzar: '1' });
  PRUEBAS.igual(listas().indexOf('Operaciones'), -1,
    '⚠️ y después de la baja ya no · quedó: ' + JSON.stringify(listas()));
  PRUEBAS.cierto(listas().indexOf('Mantenimiento') >= 0,
    'y el resto sigue: no se vació la lista entera');
});

PRUEBAS.caso('⚠️ `action=listas` NO escribe en el CH ni crea la hoja (la llama toda la app al abrir)', () => {
  /* `obtenerHojaDepartamentos()` aplica `setNumberFormat("@")`, que es una ESCRITURA. `listas` la
     dispara cada apertura de la app (`loadSetupLists`) y encima va SIN contraseña: leerla con esa
     función sería pagar un viaje de escritura por persona, y dejar que una acción pública cree una
     hoja en el CH. Es el mismo argumento por el que `validarAcceso` no llama a
     `obtenerHojaAccesos`. Acá se comprueba con la hoja AUSENTE, que es el caso del día 1. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();                                    // el CH de prueba NO trae `Departamentos`
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Departamentos'), null,
    '⚠️ GUARDA DE MEDIBILIDAD: el CH de prueba tiene que arrancar SIN la hoja, o el caso no ' +
    'comprueba el camino del día 1');
  const lista = p039Json(api.manejar({ action: 'listas', empresa: P039_EMP })).departamentos || [];
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Departamentos'), null,
    '⚠️ y después de `listas` la hoja SIGUE sin existir: una acción pública no crea hojas');
  PRUEBAS.cierto(lista.indexOf('Operaciones') >= 0,
    'y el combo sigue saliendo de los registros, igual que antes de P039 · ' + JSON.stringify(lista));
});

PRUEBAS.caso('⚠️ un departamento nuevo y VACÍO sí aparece en el combo del alta', () => {
  /* Si no apareciera, dar de alta un área vacía no serviría para nada — nadie podría elegirla. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const listas = () => p039Json(api.manejar({ action: 'listas', empresa: P039_EMP })).departamentos || [];
  PRUEBAS.igual(listas().indexOf('Seguridad Operacional'), -1, 'DISCRIMINADOR: todavía no existe');
  p039Alta(api, P039_SUP, 'Seguridad Operacional');
  PRUEBAS.cierto(listas().indexOf('Seguridad Operacional') >= 0,
    '⚠️ un área recién creada, sin un solo test todavía, tiene que poder elegirse · ' + JSON.stringify(listas()));
});

PRUEBAS.caso('la baja repetida contesta ok pero NO reescribe la fecha ni el autor', () => {
  /* Doble toque o reintento de la cola. Reescribir la fecha cambiaría cuándo ocurrió una baja que
     ya ocurrió — el mismo criterio con el que la bitácora responde ok a un id repetido sin
     volver a escribirlo (R3). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional');
  p039Baja(api, P039_SUP, 'Seguridad Operacional', { quien: 'Marta R.' });
  const primera = (p039Filas(api) || [])[0].slice();
  const otra = p039Baja(api, P039_SUP, 'Seguridad Operacional', { quien: 'OTRA PERSONA' });
  PRUEBAS.igual([otra.ok, otra.yaEstaba], [true, true], 'contesta ok y avisa que ya estaba');
  PRUEBAS.igual((p039Filas(api) || [])[0], primera,
    '⚠️ la fila tiene que quedar BYTE POR BYTE igual · ahora: ' + JSON.stringify((p039Filas(api) || [])[0]));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CASO BORDE 2 · SACAR UN DEPARTAMENTO CON GENTE ADENTRO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ CON GENTE ADENTRO: el servidor SE NIEGA y dice cuántas y quiénes', () => {
  /* A dónde va esa gente es una decisión de la empresa, no del endpoint: mover a las personas de
     área por su cuenta sería editar datos de RRHH sin que nadie lo pidiera. Se niega, se explica,
     y se deja la puerta del `forzar` para quien sepa lo que hace. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const r = p039Baja(api, P039_SUP, 'Operaciones');
  PRUEBAS.igual([r.ok, r.motivo, r.n], [false, 'con_gente', 2],
    '⚠️ Operaciones tiene 2 personas en la nómina de prueba · llegó: ' + JSON.stringify(r));
  PRUEBAS.igual((r.personas || []).sort(), ['Ana Suárez', 'Carmen Rojas'],
    'y dice quiénes, para que el supervisor decida sabiendo a quién afecta');
  PRUEBAS.igual((p039Filas(api) || []).length, 0,
    '⚠️ y NO deja rastro: una negativa no puede escribir media baja');
});

PRUEBAS.caso('⚠️ con forzar SÍ se da de baja, pero la gente NO se toca ni se mueve', () => {
  /* El riesgo real del `forzar` sería que el endpoint "resolviera" el problema reasignando a la
     gente. No lo hace: la nómina queda idéntica y las personas conservan su departamento, así que
     todo su historial sigue cruzando igual. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  /* P172 · se comparan las FILAS DE DATOS: el encabezado gana la columna «Estado» la primera vez
     que el servidor toca la hoja (una celda, sin mover ninguna fila), y eso no es reasignar a nadie. */
  const nomina = () => api.__env.__libro.getSheetByName('Nómina').__volcado().slice(1);
  const antes = JSON.stringify(nomina());
  const r = p039Baja(api, P039_SUP, 'Operaciones', { forzar: '1', quien: 'Marta R.' });
  PRUEBAS.igual([r.ok, r.baja, r.personas, r.forzado], [true, true, 2, true],
    'la baja se acepta y deja dicho cuánta gente había · ' + JSON.stringify(r));
  PRUEBAS.igual(JSON.stringify(nomina()), antes,
    '⚠️ la hoja Nómina tiene que quedar IDÉNTICA: el endpoint no reasigna a nadie');
  const f = (p039Filas(api) || [])[0] || [];
  PRUEBAS.igual([f[1], f[2], f[4]], ['Operaciones', 'baja', ''],
    '⚠️ y la fila se crea en baja con CreadoPor vacío: ese departamento venía de la nómina, ' +
    'no lo dio de alta nadie acá, y no se inventa un autor (mismo criterio que ADR 001 §D5)');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CASO BORDE 3 · VOLVER A DARLO DE ALTA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ VOLVER A DARLO DE ALTA: la misma fila, sin duplicar y sin perder el alta original', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Franco V.' });
  const creado = (p039Filas(api) || [])[0].slice();
  p039Baja(api, P039_SUP, 'Seguridad Operacional', { quien: 'Marta R.' });
  const r = p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Otra Persona' });
  PRUEBAS.igual([r.ok, r.reactivado], [true, true], 'la respuesta distingue reactivar de crear');
  const filas = p039Filas(api) || [];
  PRUEBAS.igual(filas.length, 1, '⚠️ UNA sola fila · quedaron: ' + JSON.stringify(filas));
  const f = filas[0] || [];
  PRUEBAS.igual(f[2], 'activo', 'vuelve a estar activo');
  PRUEBAS.igual([f[3], f[4]], [creado[3], creado[4]],
    '⚠️ y el alta ORIGINAL se conserva: la reactivación no reescribe quién lo creó ni cuándo');
  PRUEBAS.igual([f[5], f[6]], ['', ''], 'y las dos celdas de la baja quedan limpias');
});

PRUEBAS.caso('⚠️ reactivar lo vuelve a poner en el combo del alta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const listas = () => p039Json(api.manejar({ action: 'listas', empresa: P039_EMP })).departamentos || [];
  p039Baja(api, P039_SUP, 'Mantenimiento', { forzar: '1' });
  PRUEBAS.igual(listas().indexOf('Mantenimiento'), -1, 'DISCRIMINADOR: de baja, no está');
  p039Alta(api, P039_SUP, 'Mantenimiento');
  PRUEBAS.cierto(listas().indexOf('Mantenimiento') >= 0,
    '⚠️ reactivado, tiene que volver a ofrecerse · ' + JSON.stringify(listas()));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CASO BORDE 1 · DOS SUPERVISORES A LA VEZ
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ DOS A LA VEZ · si el candado falla y quedan dos filas, escritor y lector eligen la MISMA', () => {
  /* `conCandado()` corre la función IGUAL si no consiguió el candado — a propósito, porque perder
     una escritura es peor que arriesgar una repetida. O sea que una fila duplicada es un
     resultado POSIBLE, no una imposibilidad. Lo que no puede pasar es que el lector muestre una
     fila y el escritor corrija la otra: ahí el supervisor daría de baja un área y la seguiría
     viendo activa para siempre.
     Se simula el peor caso escribiendo la fila repetida a mano en la hoja —que es exactamente lo
     que dejaría un candado perdido— y se comprueba que las dos puntas coinciden. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Primero' });
  const sh = api.__env.__libro.getSheetByName('Departamentos');
  sh.appendRow(['Consorcio HELITEC', 'Seguridad operacional', 'activo',
                '2026-01-01T00:00:00', 'Segundo', '', '']);
  const leido = p039Dep(p039Leer(api).departamentos, 'Seguridad operacional');
  PRUEBAS.cierto(!!leido, '⚠️ el lector colapsa las dos en una · ' +
    JSON.stringify((p039Leer(api).departamentos || []).map(d => d.nombre)));
  PRUEBAS.igual(p039Leer(api).duplicadas, 1,
    '⚠️ y lo DICE en vez de resolverlo en silencio: una fila repetida es la señal de que dos ' +
    'personas escribieron a la vez, y tiene que poder verse');
  p039Baja(api, P039_SUP, 'Seguridad Operacional', { quien: 'Marta R.' });
  const filas = p039Filas(api) || [];
  PRUEBAS.igual(filas.length, 2, 'siguen siendo dos filas: nada se borra');
  PRUEBAS.igual([filas[1][2], filas[0][2]], ['baja', 'activo'],
    '⚠️ y la que el escritor dio de baja es la ÚLTIMA, que es la que el lector muestra · ' +
    JSON.stringify(filas));
  PRUEBAS.igual((p039Dep(p039Leer(api).departamentos, 'Seguridad operacional') || {}).estado, 'baja',
    '⚠️ el resultado de todo esto: quien la dio de baja la ve de baja');
});

PRUEBAS.caso('dos altas idénticas seguidas no crean dos filas', () => {
  /* El caso feliz del mismo escenario: dos supervisores dando de alta lo mismo con segundos de
     diferencia. Con el candado tomado, el segundo encuentra la fila del primero. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, P039_SUP, 'Seguridad Operacional', { quien: 'Primero' });
  p039Alta(api, P039_HSEQ, 'Seguridad Operacional', { quien: 'Segundo' });
  PRUEBAS.igual((p039Filas(api) || []).length, 1, '⚠️ una sola fila');
  PRUEBAS.igual((p039Filas(api) || [])[0][4], 'Primero',
    'y el autor del alta original no lo pisa el segundo');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUIÉN PUEDE ESCRIBIR · el recorte va en el SERVIDOR, no en la pantalla
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ la vista médica SEPARADA puede leer, pero no puede dar de alta ni de baja', () => {
  /* Sacar un área del mapa es una decisión operativa. El servicio médico tiene su propio canal y
     no emite determinaciones operativas (R2, los dos "no apto" que coexisten). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  PRUEBAS.igual(p039Leer(api, P039_MED).ok, true, 'leer sí: son nombres de área, no datos de nadie');
  PRUEBAS.igual(p039Leer(api, P039_MED).puedeEditar, false,
    'y la respuesta se lo dice al cliente, para que ni le muestre el botón');
  const r = p039Alta(api, P039_MED, 'Seguridad Operacional');
  PRUEBAS.igual([r.ok, r.motivo], [false, 'solo_lectura'], '⚠️ el alta se rechaza en el SERVIDOR');
  const b = p039Baja(api, P039_MED, 'Mantenimiento', { forzar: '1' });
  PRUEBAS.igual([b.ok, b.motivo], [false, 'solo_lectura'], 'y la baja también');
  PRUEBAS.igual((p039Filas(api) || []).length, 0, '⚠️ y no quedó ni una fila escrita');
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · una empresa SIN contraseña médica separada SÍ puede', () => {
  /* LA TRAMPA. Cuando la columna E de `Accesos` está vacía, `validarAcceso` devuelve
     `vista:"medico"` con `combinada:true` para la ÚNICA contraseña de la empresa — que es la del
     supervisor. Rechazar "medico" a secas habría dejado sin administrar sus departamentos a toda
     empresa que todavía no separó los roles.
     Sin este caso, el de arriba pasaría igual con la regla equivocada, y el defecto sólo se
     descubriría en producción, con un supervisor real que no puede tocar nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  const leido = p039Leer(api, P039_CARD);
  PRUEBAS.igual([leido.ok, leido.empresa], [true, 'Cardón'], 'entra y ve su empresa');
  PRUEBAS.igual(leido.puedeEditar, true,
    '⚠️ su única contraseña ES la del supervisor, aunque `validarAcceso` la etiquete como médica');
  const r = p039Alta(api, P039_CARD, 'Almacén');
  PRUEBAS.igual([r.ok, r.nuevo], [true, true], '⚠️ y puede dar de alta · ' + JSON.stringify(r));
});

PRUEBAS.caso('⚠️ P085b · el alcance lo decide la CUENTA, nunca el `empresa` del POST', () => {
  /* Un supervisor de A mandando `empresa:"Cardón"` no puede escribir en Cardón. Ya pasó con
     `ausencia_guardar` y con `opiniones`: autenticaban bien, pero autorizaban con un campo que
     manda el cliente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  p039Alta(api, p039Con(P039_SUP, { empresa: 'Cardón' }), 'Almacén');
  const filas = p039Filas(api) || [];
  PRUEBAS.igual(filas.length, 1, 'la escritura ocurre');
  PRUEBAS.igual(filas[0][0], 'Consorcio HELITEC',
    '⚠️ pero bajo la empresa de la CUENTA, no la del POST · quedó: ' + JSON.stringify(filas[0]));
  PRUEBAS.igual(p039Dep(p039Leer(api, P039_CARD).departamentos, 'Almacén'), null,
    '⚠️ y Cardón no lo ve: no se le escribió nada');
});

PRUEBAS.caso('sin contraseña no se lee ni se escribe nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p039Api();
  PRUEBAS.igual(p039Json(api.accionDepartamentos({ usuario: 'helitec', pass: 'no-es' })).ok, false,
    'leer sin contraseña, no');
  PRUEBAS.igual(p039Alta(api, { usuario: 'helitec', pass: '' }, 'Almacén').ok, false, 'escribir tampoco');
  PRUEBAS.igual((p039Filas(api) || []).length, 0, 'y no quedó nada escrito');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL LADO DEL CLIENTE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P039 · departamentos · la pantalla');

/* La fuente de la app, para lo que hay que comprobar leyendo el código y no el DOM. */
function p039Fuente() {
  return [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
}

/* Las claves nuevas de este prompt. Viven acá arriba porque las usan dos casos. */
const P039_CLAVES = ['dep_titulo', 'dep_abrir', 'dep_nuevo_ph', 'dep_agregar', 'dep_activos',
                     'dep_de_baja', 'dep_personas', 'dep_sin_gente', 'dep_baja_btn',
                     'dep_alta_btn', 'dep_vacio', 'dep_conf_baja', 'dep_conf_baja_gente',
                     'dep_conf_alta', 'dep_hecho_alta', 'dep_hecho_baja', 'dep_hecho_react',
                     'dep_error', 'dep_solo_lectura', 'dep_dupes', 'hlp_dep', 'dep_derivado'];

PRUEBAS.caso('⚠️ EL CONTRATO · `depClaveCliente()` da EXACTAMENTE lo mismo que el `norm()` del .gs', () => {
  /* La cuarta derivación del mismo concepto vivía acá: `nominaListPintarDeptos()` agrupaba el
     desplegable de la nómina por la CADENA CRUDA, así que "Operaciones" y "operaciones " eran dos
     opciones ahí y una sola en la pantalla de Departamentos. Se unificó con `depClaveCliente()`.
     Pero escribir dos veces la misma regla —una en el `.gs` y otra en el cliente— es exactamente
     el defecto que se está cerrando. Este caso NO copia la regla: carga el `norm()` REAL del `.gs`
     y compara las dos salidas sobre los casos que más duelen. El día que alguien toque una de las
     dos, esto se pone rojo.
     ⚠️ NO se usa `dashNorm()` en el cliente a propósito: ésa saca acentos pero NO puntuación, así
     que "Operación-Aérea" le da distinto que al servidor. Los tres últimos casos de la lista lo
     comprueban. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({}), ['norm']);
  const casos = ['Operaciones', 'operaciones ', '  OPERACIONES  ', 'Operación Aérea',
                 'operacion aerea', 'Operación-Aérea', 'Mantenimiento / Taller', 'Turno 3',
                 'Área  de   Carga', 'D.I.R.E.C.C.I.Ó.N', '', '---'];
  const distintos = casos.filter(c => api.norm(c) !== depClaveCliente(c))
                         .map(c => JSON.stringify(c) + ' → gs:' + JSON.stringify(api.norm(c)) +
                                   ' cliente:' + JSON.stringify(depClaveCliente(c)));
  PRUEBAS.igual(distintos, [],
    '⚠️ el servidor y el cliente derivan la clave distinto: ' + distintos.join(' · '));
  /* DISCRIMINADOR: `dashNorm` NO sirve para esto, y tiene que verse. Si algún día alguien la usa
     "porque ya existe", este renglón explica por qué no. */
  PRUEBAS.cierto(dashNorm('Operación-Aérea') !== api.norm('Operación-Aérea'),
    '⚠️ si `dashNorm` empezara a coincidir con `norm`, esta comparación deja de discriminar y ' +
    'habría que revisar por qué existen las dos');
  PRUEBAS.igual(depClaveCliente('Operación-Aérea'), depClaveCliente('operacion aerea'),
    'y la regla buena une las dos formas, que es lo que hace que el desplegable no las duplique');
});

PRUEBAS.caso('⚠️ el desplegable de la NÓMINA ya no duplica variantes, y su filtro las incluye', () => {
  /* El síntoma que esto cierra: dos partes de la misma pantalla contando cosas distintas. Se entra
     por las funciones reales de esa pantalla (`nominaListPintarDeptos` / `nominaListFiltrar`), no
     por el helper. */
  const prev = { d: NOMLIST.datos, t: NOMLIST.total, r: NOMLIST.registrados };
  try {
    NOMLIST.datos = [
      { persona: 'Ana Suárez',   empresa: 'H', departamento: 'Operaciones',   registrado: true,  desde: '' },
      { persona: 'Luis Ferrer',  empresa: 'H', departamento: 'operaciones ',  registrado: false, desde: '' },
      { persona: 'Carmen Rojas', empresa: 'H', departamento: 'Mantenimiento', registrado: true,  desde: '' }
    ];
    NOMLIST.total = 3; NOMLIST.registrados = 2;
    nominaListAbrir();
    nominaListPintarDeptos();
    const sel = document.getElementById('nomListDepto');
    const ops = [...sel.options].map(o => o.value);
    PRUEBAS.igual(ops.length, 3,
      '⚠️ "Todos" + Mantenimiento + Operaciones (una sola vez) · salió: ' + JSON.stringify(ops));
    sel.value = 'Operaciones';
    nominaListFiltrar();
    const filas = document.querySelectorAll('#nomListBody .nomlist-row').length;
    PRUEBAS.igual(filas, 2,
      '⚠️ al filtrar por Operaciones tienen que salir LAS DOS personas, incluida la cargada como ' +
      '"operaciones " · salieron ' + filas + '. Un filtro que esconde filas sin decirlo es peor ' +
      'que uno que muestra de más');
  } finally {
    NOMLIST.datos = prev.d; NOMLIST.total = prev.t; NOMLIST.registrados = prev.r;
    try { nominaListCerrar(); } catch (e) {}
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch (e) {}
  }
});

PRUEBAS.caso('⚠️ R1/R14 · las cadenas nuevas existen en los DOS idiomas, de verdad', () => {
  /* ⚠️ NO SE PUEDE COMPROBAR CON `t()`, y la primera versión de este caso lo hacía. `t()` tiene la
     cadena de respaldo de R14 (sector → genérico → español), así que una clave que falta en
     inglés devuelve el texto EN ESPAÑOL: truthy, distinto de la clave, y el caso pasa. Medido:
     borré `dep_vacio` del bloque inglés a propósito y la suite siguió en verde.
     Se pregunta al diccionario directamente, que es donde la ausencia se nota. */
  const sector = sectorActual();
  const falta = { es: [], en: [] };
  ['es', 'en'].forEach(lang => {
    P039_CLAVES.forEach(k => { if (_i18nBuscar(lang, sector, k) == null) falta[lang].push(k); });
  });
  PRUEBAS.igual(falta.es, [], '⚠️ faltan en español: ' + falta.es.join(', '));
  PRUEBAS.igual(falta.en, [], '⚠️ faltan en inglés (y ojo: `t()` las tapa con el español): ' + falta.en.join(', '));
  /* DISCRIMINADOR: el lector tiene que poder devolver null. Si `_i18nBuscar` cambiara y devolviera
     siempre algo, los dos renglones de arriba pasarían para siempre sin mirar nada. */
  PRUEBAS.igual(_i18nBuscar('en', sector, 'clave_que_no_existe_p039'), null,
    '⚠️ el lector del diccionario tiene que devolver null ante una clave inventada');
});

PRUEBAS.caso('⚠️ R1 · español NEUTRO: ni un voseo en los textos nuevos', () => {
  /* Ya lo tuvo que corregir dos veces. El cliente es venezolano: "tú"/"tienes"/"puedes"/"toca".
     ⚠️ La lista es SÓLO de formas inequívocamente rioplatenses. La primera versión incluía
     "tocá|toca" y se puso roja con «no las cambia de área ni TOCA sus datos», que es tercera
     persona y además "toca" es justo el imperativo NEUTRO que el CLAUDE.md pide usar. Una prueba
     que se pone roja porque el texto está bien es peor que no tenerla. */
  const antes = idiomaActual();
  let malas = [];
  try {
    fijarIdioma('es');
    const rioplatense = /\b(pod[eé]s|ten[eé]s|quer[eé]s|sab[eé]s|hac[eé]s|deb[eé]s|eleg[ií]|fijate|acordate|dale|vos)\b/i;
    P039_CLAVES.forEach(k => { const s = String(t(k) || ''); if (rioplatense.test(s)) malas.push(k + ': ' + s); });
    /* DISCRIMINADOR: la lista tiene que poder ponerse roja. Si el día de mañana alguien la vacía
       por accidente, este renglón lo delata. */
    PRUEBAS.cierto(rioplatense.test('Si querés, podés agregarlo vos'),
      '⚠️ la lista de voseo no detecta ni un caso obvio: no está midiendo nada');
  } finally { fijarIdioma(antes); }
  PRUEBAS.igual(malas, [], '⚠️ voseo en: ' + malas.join(' · '));
});

PRUEBAS.caso('⚠️ el overlay nuevo existe y "atrás" lo cierra (si no, es un callejón sin salida)', () => {
  /* `silvaAtras()` tiene una lista EXPLÍCITA: un overlay que no se nombre ahí no existe para el
     botón físico del teléfono. Es el defecto que R1 tuvo que corregir para las cuatro pantallas
     del alta y que P100 volvió a encontrar. */
  PRUEBAS.existe('#depOv', 'la pantalla de departamentos tiene que estar en el DOM');
  PRUEBAS.cierto(/visible\('depOv'\)/.test(p039Fuente()),
    "⚠️ `silvaAtras()` no nombra a `depOv`: el botón atrás del teléfono no lo cerraría nunca");
  PRUEBAS.cierto(typeof depCerrarUI === 'function',
    'y tiene su cierre propio, el que consume el navPush (P048)');
});

/* Espera el `popstate` real, o como mucho `ms`. ⚠️ HACE FALTA DE VERDAD: `navConsumir()` levanta
   un flag que sólo baja cuando llega ese evento (o a los 400 ms, y acá los temporizadores están
   estrangulados a uno por segundo porque la pestaña está oculta). Un bucle sincrónico consume UNA
   entrada y las otras cuatro quedan mudas — la primera versión de este caso daba 5 pushes contra
   1 back y el defecto era de la prueba, no de la app. Es el mismo ayudante que usa P048. */
function p039EsperarTurno(ms) {
  return new Promise(res => {
    let hecho = false;
    const h = () => { if (hecho) return; hecho = true; window.removeEventListener('popstate', h); res(); };
    window.addEventListener('popstate', h);
    setTimeout(h, ms || 60);
  });
}

PRUEBAS.caso('⚠️ P048 · abrir y cerrar por el botón X no deja historial huérfano', async () => {
  /* Cinco ciclos. Sin `navConsumir()`, cada apertura deja una entrada que el botón físico "atrás"
     tiene que comerse antes de hacer algo — la persona toca atrás y la app no responde. */
  /* ⚠️ SE ANCLA EL HISTORIAL ANTES DE CONTAR, y va ANTES de interceptar `pushState` para que
     estas entradas no entren en la cuenta. El historial del navegador es estado GLOBAL que
     comparten los 972 casos de la suite: si el puntero quedó en el borde —porque otro caso
     consumió entradas, o porque cambió cuántos corren antes— un `back()` se va fuera de la app y
     el balance queda descompensado sobre código que funciona bien.
     Ya pasó dos veces hoy, con este caso y con su gemelo de P048. Con seis entradas de colchón
     (una por ciclo más una) el `back()` siempre tiene a dónde volver. */
  /* Y se arranca de un estado limpio: si un caso anterior dejó un overlay abierto, `depAbrir()`
     empuja igual y el balance da 6 pushes contra 5 backs sobre código que funciona bien. Medido. */
  /* ⚠️ P182 · Y SE ESPERA A QUE EL HISTORIAL QUEDE QUIETO ANTES DE TOCARLO. Ésta era la causa
     real de que este caso y sus dos gemelos de P048 fueran intermitentes, con un diagnóstico
     distinto cada vez. `history.back()` no entrega su `popstate` en el acto: lo entrega en una
     tarea posterior, así que el `back()` de otro caso aterriza en el medio de éste, le baja
     `_navConsumiendo` —que es un booleano, no un contador— y hace que el manejador corra
     `silvaAtras()` y vuelva a apilar. Medido con la pila de llamadas de cada push; está escrito
     en detalle arriba de `p048HistorialQuieto`, en `p048-overlays.js`. */
  const quieto = await PRUEBAS.historialQuieto();
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  try { syncScrollLock(); } catch (e) {}
  try { for (let k = 0; k < 6; k++) history.pushState({ p039: k }, ''); } catch (e) {}
  const origPush = history.pushState.bind(history);
  const origBack = history.back.bind(history);
  let pushes = 0, backs = 0, medible = true;
  history.pushState = function () { pushes++; return origPush.apply(history, arguments); };
  history.back = function () { backs++; return origBack.apply(history, arguments); };
  try {
    for (let i = 0; i < 5; i++) {
      depAbrir();
      const ov = document.getElementById('depOv');
      void document.body.offsetWidth;
      const x = document.querySelector('#depOv .gest-back');
      if (!ov || !ov.classList.contains('show') || ov.getBoundingClientRect().width === 0 || !x) { medible = false; break; }
      x.click();
      await p039EsperarTurno(80);
      /* ⚠️ Y se espera a que baje el flag de `navConsumir` antes del ciclo siguiente: mientras está
         puesto, el cierre siguiente NO descarta su entrada — es la red que documenta la propia
         `navConsumir`. Faltaba acá y sí estaba en el gemelo de P048. */
      const _t = Date.now();
      while (typeof _navConsumiendo !== 'undefined' && _navConsumiendo && Date.now() - _t < 900){
        await new Promise(r => setTimeout(r, 30));
      }
    }
  } finally {
    history.pushState = origPush; history.back = origBack;
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch (e) {}
  }
  PRUEBAS.cierto(medible,
    '⚠️ GUARDA DE MEDIBILIDAD: el overlay no llegó a mostrarse con tamaño real, o no está el botón ' +
    'de volver. Sin esto el balance daría 0 = 0 y pasaría sin medir nada');
  PRUEBAS.cierto(quieto,
    '⚠️ GUARDA DE MEDIBILIDAD: el historial tiene que estar quieto antes de contar — con un ' +
    'popstate de otro caso en vuelo, esto mide una carrera y no la app');
  if (!medible || !quieto) return;
  PRUEBAS.alMenos(pushes, 5, 'cinco aperturas, cinco entradas apiladas');
  PRUEBAS.igual(backs, pushes, '⚠️ y cada una consumida: ' + pushes + ' pushes contra ' + backs + ' backs');
});

PRUEBAS.caso('⚠️ R5 · la guía ⓘ está, y cerrada por defecto', () => {
  depAbrir();
  const g = document.querySelector('#depOv details.dash-help');
  PRUEBAS.cierto(!!g, '⚠️ falta la guía ⓘ del módulo (R5: en CADA módulo nuevo)');
  PRUEBAS.falso(g && g.open, 'y tiene que arrancar CERRADA: quien ya sabe no la lee dos veces');
  PRUEBAS.alMenos(g ? (g.querySelector('.dh-body') || {}).textContent.length || 0 : 0, 80,
    'con texto de verdad adentro, no un título suelto');
  try { depCerrarUI(); } catch (e) {}
});

PRUEBAS.caso('⚠️ R13 · ni un color escrito a mano en lo nuevo', () => {
  /* Se mira el CSS de las clases nuevas (`.dep-`) en la hoja de estilo real, no el archivo: lo que
     importa es lo que el navegador aplica. Un `#hex` o un `rgb()` fijo rompe el modo oscuro. */
  const reglas = [];
  for (const hoja of document.styleSheets) {
    let rs = null;
    try { rs = hoja.cssRules; } catch (e) { continue; }
    for (const r of rs || []) {
      if (r.cssText && r.cssText.indexOf('.dep-') >= 0) reglas.push(r.cssText);
      if (r.cssRules) for (const r2 of r.cssRules) if (r2.cssText && r2.cssText.indexOf('.dep-') >= 0) reglas.push(r2.cssText);
    }
  }
  PRUEBAS.alMenos(reglas.length, 3,
    '⚠️ GUARDA DE MEDIBILIDAD: no se encontraron reglas `.dep-` en la hoja de estilo. Con 0 reglas ' +
    'el barrido de abajo daría verde sin mirar nada');
  const fijos = reglas.filter(x => /#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i.test(x));
  PRUEBAS.igual(fijos, [], '⚠️ colores fijos (R13: siempre un token, y en los DOS temas): ' + fijos.join(' · '));
});

/* Contraste EFECTIVO: compone el color del texto contra su fondo usando la opacidad HEREDADA.
   ⚠️ Existe porque `getComputedStyle().color` NO incluye la opacidad de los ancestros, así que un
   auditor de contraste normal da el número de la tinta opaca y no el que se ve. Con eso, una fila
   al 62% medía 15.65:1 cuando en pantalla estaba en 4.53:1. */
function p039Rgb(c){ return String(c).match(/[\d.]+/g).map(Number).slice(0, 3); }
function p039Lum(m){
  const f = m.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
function p039Fondo(el){
  let e = el;
  while (e && e !== document.documentElement) {
    const b = getComputedStyle(e).backgroundColor;
    if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b;
    e = e.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor;
}
function p039Opacidad(el){
  let o = 1, e = el;
  while (e && e !== document.documentElement) { o *= parseFloat(getComputedStyle(e).opacity || '1'); e = e.parentElement; }
  return o;
}
function p039Contraste(el){
  const F = p039Rgb(getComputedStyle(el).color), B = p039Rgb(p039Fondo(el)), a = p039Opacidad(el);
  const C = [0, 1, 2].map(i => a * F[i] + (1 - a) * B[i]);
  const f = p039Lum(C), b = p039Lum(B);
  return Math.round(((Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05)) * 100) / 100;
}

PRUEBAS.caso('⚠️ R13 · todo se lee en los DOS temas, incluido lo que está dado de baja', () => {
  /* Este caso encontró un defecto REAL de este mismo prompt. La primera versión distinguía un
     departamento dado de baja con `opacity:.62`, y medido en la app: el subtítulo y el botón
     "Volver a activar" quedaban en 2.45:1 (claro) y 2.99:1 (oscuro). Un botón que hay que poder
     tocar, ilegible, y sin que ningún auditor de contraste lo viera porque la opacidad no está en
     el `color` calculado. Se cambió por un borde punteado. */
  const temaPrevio = document.documentElement.getAttribute('data-tema');
  const prev = { lista: DEPS.lista, puede: DEPS.puedeEditar, dup: DEPS.duplicadas };
  const malos = [];
  let medidos = 0;
  DEPS.lista = [
    { nombre: 'Operaciones', clave: 'operaciones', estado: 'activo', origen: 'nomina', personas: 12 },
    { nombre: 'Seguridad Operacional', clave: 'so', estado: 'baja', origen: 'hoja', personas: 0 }
  ];
  DEPS.puedeEditar = true; DEPS.duplicadas = 2;
  try {
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      depAbrir(); depPintar();
      void document.body.offsetWidth;
      const ov = document.getElementById('depOv');
      ['.dep-nom', '.dep-sub', '.dep-sec-t', '.dep-btn', '.dep-aviso'].forEach(sel => {
        ov.querySelectorAll(sel).forEach(el => {
          if (!el.getBoundingClientRect().width) return;
          medidos++;
          const c = p039Contraste(el);
          if (c < 4.5) malos.push(tema + ' ' + sel + ' "' + String(el.textContent).slice(0, 24) + '": ' + c);
        });
      });
      try { depCerrarUI(); } catch (e) {}
    });
  } finally {
    DEPS.lista = prev.lista; DEPS.puedeEditar = prev.puede; DEPS.duplicadas = prev.dup;
    if (temaPrevio) document.documentElement.setAttribute('data-tema', temaPrevio);
    else document.documentElement.removeAttribute('data-tema');
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch (e) {}
  }
  PRUEBAS.alMenos(medidos, 16,
    '⚠️ GUARDA DE MEDIBILIDAD: se midieron ' + medidos + ' textos. Con pocos, "todo pasa 4.5" sería ' +
    'cierto por vacío — tienen que estar los dos temas, las dos filas y el aviso');
  PRUEBAS.igual(malos, [], '⚠️ por debajo de 4.5:1 · ' + malos.join(' · '));
});

PRUEBAS.caso('⚠️ R8 · dar de baja pide confirmación y vibra; ninguna de las dos es opcional', () => {
  /* Sacar un área del mapa tiene consecuencia operativa: nadie más se puede asignar ahí. No puede
     ocurrir por un toque accidental en un teléfono. */
  const f = p039Fuente();
  const i = f.indexOf('function depPedirBaja');
  PRUEBAS.alMenos(i, 0, '⚠️ GUARDA: no se encontró `depPedirBaja` en la fuente de la app');
  if (i < 0) return;
  const cuerpo = f.slice(i, i + 2200);
  PRUEBAS.cierto(/confirm\s*\(/.test(cuerpo) || /depConfirmar\s*\(/.test(cuerpo),
    '⚠️ la baja tiene que pasar por una confirmación explícita');
  PRUEBAS.cierto(/haptic\s*\(/.test(cuerpo), '⚠️ y por el háptico (R8)');
});

PRUEBAS.caso('⚠️ R3 · el alta y la baja quedan en la bitácora, con el departamento y la empresa', async () => {
  /* Toda acción se registra. Una baja que no deja rastro es una decisión que dentro de seis meses
     nadie puede explicar.

     ⚠️ A15 · ESTE CASO COMPROBABA EL TEXTO FUENTE (`f.indexOf("bitacoraRegistrar('departamento_alta'")`)
     y por eso no vio el defecto que sí estaba: el servidor tiene DOS respuestas más —`yaEstaba` y
     `actualizado`— que no entraban en ninguna rama y salían sin bitácora, diciendo «agregado».
     El literal estaba en el archivo, así que la prueba pasaba. Ahora se ejercita `depEnviar()` de
     verdad, con las CINCO respuestas posibles, interceptando la red y la bitácora. */
  const reg = [];
  const oFetch = window.fetchConReloj, oBita = window.bitacoraRegistrar, oToast = window.showToast;
  const antesDASH = DASH;
  let respuesta = null;
  try {
    DASH = Object.assign({}, antesDASH || {}, { demoMode:false,
      params:{ usuario:'u', empresa:'Consorcio HELITEC', pass:'p' },
      f: Object.assign({}, (antesDASH && antesDASH.f) || {}, { emp:'Consorcio HELITEC' }) });
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(respuesta) });
    window.bitacoraRegistrar = (accion, _x, det) => { reg.push({ accion, det }); };
    window.showToast = () => {};
    const casos = [
      { r:{ ok:true, nuevo:true },              tipo:'alta',  esperado:'departamento_alta' },
      { r:{ ok:true, actualizado:true },        tipo:'alta',  esperado:'departamento_alta' },
      { r:{ ok:true, reactivado:true },         tipo:'react', esperado:'departamento_reactivado' },
      { r:{ ok:true, baja:true, personas:2, forzado:true }, tipo:'baja', esperado:'departamento_baja' },
      { r:{ ok:true, yaEstaba:true },           tipo:'baja',  esperado:'departamento_baja' }
    ];
    for (const c of casos) {
      reg.length = 0; respuesta = c.r;
      await depEnviar('departamento_guardar', 'Operaciones', {}, c.tipo);
      PRUEBAS.igual(reg.length, 1,
        '⚠️ la respuesta ' + JSON.stringify(c.r) + ' deja EXACTAMENTE una entrada · dejaba cero');
      PRUEBAS.igual(reg[0] && reg[0].accion, c.esperado,
        '⚠️ y es la acción que la persona pidió (' + c.tipo + '), no la que adivina la respuesta');
      PRUEBAS.igual(reg[0] && reg[0].det && reg[0].det.empresa, 'Consorcio HELITEC',
        '⚠️ con la empresa que SE MANDÓ · usaba `DEPS.empresa`, que es la de la última carga');
    }
  } finally {
    window.fetchConReloj = oFetch; window.bitacoraRegistrar = oBita;
    window.showToast = oToast; DASH = antesDASH;
  }
});

PRUEBAS.caso('⚠️ R12 · la pantalla entra en 375, 768 y 1366 sin desbordar a lo ancho', () => {
  /* ⚠️ HAY QUE PINTAR CONTENIDO ANTES DE MEDIR, y la primera versión de este caso no lo hacía.
     En la suite no hay credenciales, así que `depAbrir()` cae en la rama de "faltan credenciales"
     y la hoja queda con UN renglón de texto: medía una pantalla vacía. Medido: le puse
     `min-width:1500px` a `.dep-row` a propósito y el caso siguió en verde.
     Ahora se llena `DEPS` y se llama a `depPintar()` —la función real de dibujo— con nombres
     largos, que es el quinto estado que siempre falta: "con datos larguísimos". */
  const anchos = [375, 768, 1366];
  const desbordes = [];
  let medido = 0, filasVistas = 0;
  const prev = { lista: DEPS.lista, puede: DEPS.puedeEditar, dup: DEPS.duplicadas };
  DEPS.lista = [
    { nombre: 'Operaciones', clave: 'operaciones', estado: 'activo', origen: 'nomina', personas: 12 },
    { nombre: 'Coordinación de Mantenimiento Aeronáutico y Soporte en Tierra', clave: 'x',
      estado: 'activo', origen: 'hoja', personas: 3 },
    { nombre: 'Seguridad Operacional', clave: 'so', estado: 'baja', origen: 'hoja', personas: 0 }
  ];
  DEPS.puedeEditar = true; DEPS.duplicadas = 2;
  try {
    anchos.forEach(w => {
      PRUEBAS.enVentana(w, 800, () => {
        depAbrir();
        depPintar();
        const ov = document.getElementById('depOv');
        /* ⚠️ SE MIDE `.gest-scroll`, NO `.sheet`. Medido el 2026-09-06 en la app real: `.sheet`
           tiene `overflow-x: hidden`, así que su `scrollWidth` SIEMPRE es igual a su `clientWidth`
           y no puede delatar un desborde ni aunque el contenido mida cuatro veces la pantalla. Con
           un `min-width:1500px` puesto a propósito en `.dep-row`, `.sheet` decía 390/390 mientras
           `.gest-scroll` —que es el contenedor con `overflow-x:auto`, el que de verdad scrollea—
           decía 1513 contra 390. La primera versión de este caso medía `.sheet` y daba verde. */
        const sc = ov && ov.querySelector('.gest-scroll');
        if (!sc) return;
        void document.body.offsetWidth;
        if (sc.clientWidth === 0) return;
        if (ov.querySelectorAll('.dep-row').length < 3) return;   // no hay qué desbordar: no cuenta
        medido++; filasVistas += ov.querySelectorAll('.dep-row').length;
        if (sc.scrollWidth > sc.clientWidth + 1) {
          desbordes.push(w + 'px: contenido ' + sc.scrollWidth + ' > caja ' + sc.clientWidth);
        }
        try { depCerrarUI(); } catch (e) {}
      });
    });
  } finally {
    DEPS.lista = prev.lista; DEPS.puedeEditar = prev.puede; DEPS.duplicadas = prev.dup;
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch (e) {}
  }
  PRUEBAS.igual(medido, anchos.length,
    '⚠️ GUARDA DE MEDIBILIDAD: se midieron ' + medido + ' de ' + anchos.length + ' anchos CON filas ' +
    'dibujadas. Con 0, "no hay desbordes" sería cierto por vacío');
  PRUEBAS.alMenos(filasVistas, 9, 'y las tres filas en los tres anchos · vistas: ' + filasVistas);
  PRUEBAS.igual(desbordes, [], '⚠️ desborda a lo ancho en: ' + desbordes.join(' · '));
});

PRUEBAS.caso('⚠️ A4 · el botón sólo aparece para quien puede gestionar, y nunca al empleado', () => {
  /* El recorte de verdad está en el servidor (`puedeEditar`), pero mostrarle a un empleado un
     botón que le va a rebotar es ruido, y a la vista médica separada también. */
  const prev = DASH;
  try {
    ['empleado', 'supervisor', 'hseq', 'medico'].forEach(v => {
      DASH = Object.assign({}, prev || {}, { vista: v, f: (prev && prev.f) || {} });
      depActualizarBoton();
      const b = document.getElementById('depFabBtn');
      const visible = !!(b && b.style.display !== 'none');
      PRUEBAS.igual(visible, v !== 'empleado',
        '⚠️ vista `' + v + '`: el botón ' + (v === 'empleado' ? 'NO puede' : 'tiene que') + ' verse');
    });
  } finally { DASH = prev; try { depActualizarBoton(); } catch (e) {} }
});

/* ── A14 · los tres defectos ALTOS que encontró la revisión adversarial ─────────────────────────
   El `verificador` los reprodujo ejecutando las funciones reales del `.gs` con Node, no leyendo.
   Los tres tenían la MISMA raíz: `listaDepartamentos()` era un TERCER lector que derivaba la
   identidad distinto de `depBuscarFila` y `depDeEmpresa`. Es exactamente el patrón que este bloque
   decía cerrar, entrando por la puerta que nadie miró.

   ⚠️ Y los casos que ya existían no los veían: el que arma el estado duplicado nunca le pregunta
   `action=listas`, y ninguno usa la cuenta `*` porque el CH de prueba no la tiene. */

/* ⚠️ A15 · SE PIDE EXACTAMENTE COMO LO PIDE LA APP: `action=listas` a secas. El intento anterior
   le pasaba `empresa` a mano y con eso tapó el defecto entero — el servidor filtraba por una
   empresa que el llamador REAL no manda nunca (`loadSetupLists` y la pantalla de recuperar cuenta
   corren ANTES de que la persona elija una). R17: la cadena tiene dos eslabones y se probaba el
   segundo. Si alguien vuelve a agregarle un parámetro acá, vuelve el defecto. */
function p039Listas(hojas){
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['manejar']);
  return JSON.parse(api.manejar({ action:'listas', empresa: P039_EMP }).getContent());
}
const P039_DEP_CAB = ['Empresa','Departamento','Estado','Creado','CreadoPor','Baja','BajaPor'];
/* ⚠️ `parseRegistros` arranca en la fila 3 y lee por POSICIÓN FIJA (persona=2, depto=3,
   empresa=73). Un fixture con encabezados legibles se lee como cero registros — y el primer
   intento de estos casos dio verde por eso. Van las dos filas de encabezado y `p039Fila`. */
const P039_CAB1 = new Array(90).fill('bloque'), P039_CAB2 = new Array(90).fill('pregunta');

PRUEBAS.caso('🔴 A14 · una baja sobre una fila DUPLICADA saca el departamento del alta', () => {
  /* Dos supervisores dan de alta lo mismo a la vez y el candado no se consigue: quedan dos filas.
     Uno da de baja → el escritor actualiza la ÚLTIMA → el panel dice "baja"… y la lista del alta
     lo seguía ofreciendo, porque marcaba "vivo" si ALGUNA fila estaba activa. */
  const r = p039Listas({
    'Departamentos': [P039_DEP_CAB.slice(),
      ['Consorcio HELITEC','Seguridad Operacional','activo','','','',''],
      ['Consorcio HELITEC','Seguridad operacional','baja','','','',''],
      ['Consorcio HELITEC','Operaciones','activo','','','','']],
    'Respuestas de formulario 1': [P039_CAB1, P039_CAB2,
      p039Fila('Ana Suárez', 'Operaciones', 'Consorcio HELITEC', 7)]
  });
  PRUEBAS.igual(r.ok, true, 'la acción responde · si no, no se mide nada');
  PRUEBAS.cierto((r.departamentos || []).some(d => /operaciones/i.test(d)),
    'guarda de medibilidad: el activo SÍ llega · sin esto, una lista vacía daría verde sin medir');
  PRUEBAS.falso((r.departamentos || []).some(d => /seguridad/i.test(d)),
    '⚠️ el departamento de baja NO se ofrece en el alta — llegaron ' + JSON.stringify(r.departamentos));
});

PRUEBAS.caso('🔴 A14 · la baja en UNA empresa no se lo saca a otra', () => {
  const r = p039Listas({
    'Departamentos': [P039_DEP_CAB.slice(), ['Cardón','Mantenimiento','baja','','','','']],
    'Respuestas de formulario 1': [P039_CAB1, P039_CAB2,
      p039Fila('Ana Suárez',  'Mantenimiento', 'Consorcio HELITEC', 7),
      p039Fila('Luis Ferrer', 'Operaciones',   'Consorcio HELITEC', 3)]
  });
  PRUEBAS.cierto((r.departamentos || []).length > 0,
    'guarda de medibilidad: llegó alguna opción · con la lista vacía esto pasaría sin medir');
  PRUEBAS.cierto((r.departamentos || []).some(d => /mantenimiento/i.test(d)),
    '⚠️ Consorcio HELITEC conserva Mantenimiento · la baja de Cardón se lo quitaba — ' +
    JSON.stringify(r.departamentos));
});

PRUEBAS.caso('🔴 A14 · una fila con empresa comodín no da de baja el área de nadie', () => {
  /* Lo más destructivo de los tres: el admin sin filtro puesto mandaba `empresa:"*"`, la fila se
     escribía con `Empresa = "*"`, y como la lista no filtraba por empresa **un clic sacaba un área
     del alta de todos los clientes**, sin la confirmación de "tiene gente adentro" —porque
     `depGenteDe("*")` contaba 0— y con el panel de la empresa afectada diciendo que seguía activa. */
  const r = p039Listas({
    'Departamentos': [P039_DEP_CAB.slice(), ['*','Operaciones','baja','','','','']],
    'Respuestas de formulario 1': [P039_CAB1, P039_CAB2,
      p039Fila('Ana Suárez',  'Operaciones',   'Consorcio HELITEC', 7),
      p039Fila('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC', 3)]
  });
  PRUEBAS.cierto((r.departamentos || []).some(d => /operaciones/i.test(d)),
    '⚠️ una fila con empresa "*" no pertenece a nadie y no puede sacar nada — ' +
    JSON.stringify(r.departamentos));
});

PRUEBAS.caso('🔴 A14 · y el servidor ya no acepta escribir con empresa sin resolver', () => {
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['*','claveAdmin','admin','','','']],
    'Departamentos': [P039_DEP_CAB.slice()],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento']],
    'Respuestas de formulario 1': [['A'],['B']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionDepartamentoBaja', 'accionDepartamentoGuardar']);
  const baja = JSON.parse(api.accionDepartamentoBaja(
    { usuario:'*', empresa:'*', pass:'claveAdmin', dispositivoId:'d', nombre:'Operaciones' }).getContent());
  PRUEBAS.igual(baja.ok, false, 'la baja con empresa "*" se rechaza');
  PRUEBAS.igual(baja.motivo, 'sin_empresa', 'con un motivo que el cliente puede distinguir');
  const alta = JSON.parse(api.accionDepartamentoGuardar(
    { usuario:'*', empresa:'*', pass:'claveAdmin', dispositivoId:'d', nombre:'Nuevo' }).getContent());
  PRUEBAS.igual(alta.ok, false, 'y el alta también · escribía filas que no eran de nadie');
  PRUEBAS.igual(env.__libro.getSheetByName('Departamentos').getLastRow(), 1,
    '⚠️ y NO quedó ninguna fila escrita');
});

/* ── A15 · los tres ALTOS que la SEGUNDA revisión adversarial encontró ──────────────────────────
   Los cuatro casos de A14 estaban en verde y dos de estos tres seguían rotos. La razón, en los tres,
   es la misma familia que este archivo dice cerrar:
   · `listaDepartamentos` filtraba por una empresa que el llamador REAL no manda nunca (R17: la
     prueba se la escribía a mano);
   · `depGenteDe` contaba `Nómina` mientras el tablero agrupa `Respuestas de formulario 1`
     (escritor y lector derivando lo mismo distinto, quinta vez en este repo);
   · y `depCargar` mandaba `pass` sin `dispositivoId`, así que el panel entero moría para quien
     tildó "recordar este dispositivo" — que no se ve probando con usuario y contraseña. */

PRUEBAS.caso('🔴 A15 · el que tiene gente MIDIÉNDOSE se administra, aunque no esté en la Nómina', () => {
  /* Una empresa que hace los tests por formulario y todavía no terminó de cargar la nómina tiene
     gente en departamentos que la nómina no conoce. El panel no los mostraba: no se podían
     administrar sin adivinar el nombre. */
  const hojas = p039Hojas({
    'Respuestas de formulario 1': [P039_CAB1, P039_CAB2,
      p039Fila('Ana Suárez',   'Seguridad Operacional', 'Consorcio HELITEC', 7),
      p039Fila('Luis Ferrer',  'Seguridad Operacional', 'Consorcio HELITEC', 3),
      p039Fila('Carmen Rojas', 'Seguridad Operacional', 'Consorcio HELITEC', 5)]
  });
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['accionDepartamentos', 'accionDepartamentoBaja']);
  const cred = { usuario:'helitec', empresa:'Consorcio HELITEC', pass:'sup-039', dispositivoId:'d' };
  const panel = JSON.parse(api.accionDepartamentos(cred).getContent());
  PRUEBAS.igual(panel.ok, true, 'guarda de medibilidad: el panel responde');
  const seg = p039Dep(panel.departamentos, 'Seguridad Operacional');
  PRUEBAS.cierto(!!seg, '⚠️ el área con 3 personas midiéndose APARECE en el panel · llegó: ' +
    JSON.stringify((panel.departamentos || []).map(d => d.nombre)));
  PRUEBAS.igual(seg && seg.personas, 3,
    '⚠️ y dice 3, el MISMO número que Estadísticas · decir 0 son dos números para lo mismo');
  const baja = JSON.parse(api.accionDepartamentoBaja(
    Object.assign({ nombre:'Seguridad Operacional' }, cred)).getContent());
  PRUEBAS.igual([baja.ok, baja.motivo, baja.n], [false, 'con_gente', 3],
    '⚠️ y la baja SE NIEGA, con las 3 · pasaba sin confirmación y con personas:0 en la bitácora');
});

PRUEBAS.caso('🔴 A15 · el panel muere sin `dispositivoId` cuando la sesión está recordada', () => {
  /* `DASH.params.pass` es el TOKEN cuando el dispositivo está recordado, y `sesResolver` rechaza
     un token cuya sesión guardó dispositivo si el pedido no lo trae. El panel quedaba en "Usuario
     o contraseña incorrecta" y —como en el camino de error no corre `depPintar()`— la caja de alta
     seguía visible: se podían AGREGAR áreas que nunca se iban a poder ver ni dar de baja. */
  /* ⚠️ EL TOKEN SE EMITE POR EL CAMINO REAL: entrando con la contraseña y `recordar:'1'`, que es
     lo que hace la app cuando la persona tilda "recordar este dispositivo". Fabricarlo con
     `sesEmitir()` a mano probaría la pieza y no el uso. */
  const env = GS.crearEntorno(p039Hojas({}));
  const api = GS.cargarGs(CTX.gs, env, ['accionDepartamentos', 'accionSupervisor']);
  const login = JSON.parse(api.accionSupervisor({ usuario:'helitec', empresa:'Consorcio HELITEC',
    pass:'sup-039', dispositivoId:'disp-A15', recordar:'1' }).getContent());
  const token = login.sesion;   // así se llama en la respuesta; la guarda de abajo lo delata si cambia
  PRUEBAS.cierto(!!token, 'guarda de medibilidad: el login devolvió un token de sesión · llegó: ' +
    JSON.stringify(Object.keys(login)));
  const base = { usuario:'helitec', empresa:'Consorcio HELITEC', pass:token };
  const sin = JSON.parse(api.accionDepartamentos(base).getContent());
  const con = JSON.parse(api.accionDepartamentos(
    Object.assign({ dispositivoId:'disp-A15' }, base)).getContent());
  PRUEBAS.igual(con.ok, true,
    '⚠️ EL DISCRIMINADOR: con el dispositivo SÍ entra · si esto falla, el caso de abajo no prueba nada');
  PRUEBAS.igual(sin.ok, false,
    'y sin dispositivo el servidor rechaza · por eso el cliente TIENE que mandarlo');
});

PRUEBAS.caso('🔴 A15 · EL CONTRATO · toda credencial del panel sale de `dashAuth`, con dispositivo', () => {
  /* R17 · el defecto no está en el servidor sino en QUIÉN LO LLAMA, así que se mide sobre el
     cliente: ninguna acción con contraseña puede armar el objeto a mano. Ya pasó CINCO veces
     (`nomina_listar`, `tareas_persona`, `tarea_guardar`, `ciclo_config_guardar`, `departamentos`);
     `gestAuth()` era el único que lo hacía bien. */
  const f = p039Fuente();
  PRUEBAS.cierto(/function dashAuth\(/.test(f) && /dispositivoId:\s*dispositivoId\(\)/.test(f),
    'guarda de medibilidad: existe `dashAuth` y mete el dispositivo · sin esto no hay nada que medir');
  const aMano = (f.match(/dashRequest\(\{[^}]*pass\s*:\s*cred\.pass/g) || []);
  PRUEBAS.igual(aMano.length, 0,
    '⚠️ ningún `dashRequest` arma las credenciales a mano · quedaron ' + aMano.length + ': ' +
    JSON.stringify(aMano.map(x => (x.match(/action\s*:\s*'([^']+)'/) || [])[1])));
});

PRUEBAS.caso('🔴 A15 · dos bloqueos anidados no se pisan: el externo no suelta al interno', () => {
  /* `depEnviar()` bloquea la hoja; en su `.then` llama a `depCargar()`, que la vuelve a bloquear —
     y el `soltar()` del externo corre DESPUÉS del handler. Medido: la hoja quedaba tocable durante
     los 2 a 5 s de la relectura, con la fila todavía activa y su botón «Dar de baja» vivo. */
  const el = document.createElement('div');
  document.body.appendChild(el);
  try {
    cargaBloquear(el, true);                       // el externo
    cargaBloquear(el, true);                       // el interno (la relectura)
    PRUEBAS.cierto(el.hasAttribute('inert'), 'guarda de medibilidad: bloquear pone `inert`');
    cargaBloquear(el, false);                      // suelta el EXTERNO
    PRUEBAS.cierto(el.hasAttribute('inert'),
      '⚠️ sigue bloqueada: la relectura todavía está en vuelo · acá se soltaba y quedaba tocable');
    cargaBloquear(el, false);                      // termina la relectura
    PRUEBAS.falso(el.hasAttribute('inert'), 'y recién ahí se suelta');
    PRUEBAS.falso(el.hasAttribute('aria-busy'), 'sin `aria-busy` colgado, que es lo que lee el lector de pantalla');
    cargaBloquear(el, true); cargaBloquear(el, true);
    cargaBloquear(el, 'reset');
    PRUEBAS.falso(el.hasAttribute('inert'),
      '⚠️ y `reset` suelta sin mirar el contador · es de lo que depende `cargaCancelar()` para rescatar una pantalla muerta');
  } finally { el.remove(); }
});

PRUEBAS.caso('🔴 A15 · R3 · dar de baja dos veces deja bitácora de BAJA, no de «agregado»', () => {
  /* El servidor tiene dos respuestas que no entraban en ninguna rama: `actualizado:true` y
     `yaEstaba:true`. Las dos caían al final sin bitácora y con el toast «agregado» — o sea que dar
     de baja dos veces decía «agregado» y no dejaba rastro de ninguna de las dos. */
  const f = p039Fuente();
  PRUEBAS.igual((f.match(/else if \(d\.nuevo\)\s+bitacoraRegistrar/g) || []).length, 0,
    '⚠️ la bitácora ya no se decide por el shape de la respuesta');
  PRUEBAS.cierto(/bitacoraRegistrar\(tipo === 'baja'/.test(f),
    "⚠️ se decide por `tipo`, que lo fija el llamador ('alta' / 'react' / 'baja') y no la red");
  PRUEBAS.cierto(/empresa: cuerpo\.empresa/.test(f),
    '⚠️ y la bitácora usa la empresa que SE MANDÓ, no `DEPS.empresa` · eran dos derivaciones ' +
    'distintas y podían quedar diciendo empresas distintas para el mismo hecho');
});

PRUEBAS.caso('🔴 A15 · cambiar de empresa no deja la lista de la anterior en pantalla', () => {
  /* `DEPS` es global y sobrevivía al cambio de filtro: el encabezado decía «Cardón» y el cuerpo
     listaba las áreas de Consorcio HELITEC, porque el esqueleto sólo se pinta con la lista vacía. */
  /* En la suite no hay sesión, así que `DASH` puede ser null: se arma el mínimo que `depCargar`
     mira, y se restaura entero. Sin `params` cae en la rama de "faltan credenciales", que es
     DESPUÉS del descarte — que es justo lo que se quiere medir. */
  const antesDASH = DASH, antesL = DEPS.lista.slice(), antesE = DEPS.empresa;
  try {
    DEPS.lista = [{ nombre:'Operaciones', clave:'operaciones', estado:'activo', personas:1 }];
    DEPS.empresa = 'Consorcio HELITEC';
    DEPS.puedeEditar = true;
    DASH = Object.assign({}, antesDASH || {}, { demoMode:false,
      f: Object.assign({}, (antesDASH && antesDASH.f) || {}, { emp:'Cardón' }) });
    depCargar();
    PRUEBAS.igual(DEPS.lista.length, 0,
      '⚠️ la lista de la empresa anterior se descarta · si no, se ve el encabezado de una y el cuerpo de otra');
    PRUEBAS.falso(DEPS.puedeEditar,
      '⚠️ y el permiso también, que es lo que decide si se ve la caja de alta');
  } finally { DASH = antesDASH; DEPS.lista = antesL; DEPS.empresa = antesE; }
});
