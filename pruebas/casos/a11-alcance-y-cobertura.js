PRUEBAS.grupo('A11 · el alcance por empresa, y el cero que parecía un dato');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Una auditoría dirigida del `.gs` (2026-09-06, 05:20) buscando UN patrón: acciones que
   AUTENTICAN bien y después AUTORIZAN con un campo que manda el cliente. De las ~16 candidatas
   por `p.empresa`, ninguna resultó serlo — pero el patrón sobrevivía en dos lugares donde la
   empresa viaja DENTRO de un JSON, así que un grep por `p.empresa` no los encuentra. Más dos
   desajustes entre quien escribe y quien lee.

   1 · `caso_odoo_guardar` PISABA EL CASO DE OTRO CLIENTE. `upsertCasoOdoo` matcheaba sólo por
   `IdCaso`, que es determinístico y público (`caso_<persona>_<fecha>`), y la `Empresa` de la fila
   salía del JSON del cliente. Un médico de la empresa A, con SU contraseña, mandaba el IdCaso de
   un caso de B y le reescribía la fila entera —severidad incluida— en la hoja que Odoo lee para
   abrir tickets. `Procesado` se conserva, así que si Odoo ya lo había tomado, el ticket quedaba
   sin su dato.

   2 · `bitacora_guardar` ESCRIBÍA EN LA BITÁCORA DE OTRO CLIENTE. La columna Empresa salía de
   `ev.empresa`. El LECTOR ya usaba `gestScope`; el escritor no. Y R3 dice que la bitácora nunca se
   edita ni se borra: una línea falsa ahí queda para siempre en el registro que existe justamente
   para tener valor probatorio.

   3 · LA CLAVE DEL ÍNDICE DE ANOTACIONES SE DESINCRONIZÓ. El productor pasó a `nombre|empresa` el
   2026-09-03 y `cronCasosOdoo` se quedó en `nombre`: `anot` era SIEMPRE undefined, así que las dos
   guardas de `casoDePersona` estaban muertas. Un alta de reincorporación firmada por el médico
   (`nivel:"ok"`) no cortaba nada y el cron abría el caso igual, cada quince minutos.

   4 · ⚠️ `alias` NO ESTABA DECLARADO en `accionSupervisor`, y esto lo escribí yo en P096 anoche.
   `nominaEmpresaCanon(alias, …)` tiraba `ReferenceError` en CADA carga del panel, el `catch` lo
   tragaba y `nominaTotal` llegaba siempre en 0. Con 0, el cliente cae al denominador viejo: la
   cobertura volvía a decir "100% de la nómina medida" contando sólo a quien ya tenía tests.
   **P096 nunca funcionó en producción.** El cero parecía un dato.

   5 · LA TAREA QUE EL ADMIN CREA NO LE LLEGABA A NADIE. El cliente manda `empresa: '*'` para el
   admin sin filtro; la fila quedaba con Empresa `"*"`, el panel del admin la mostraba (lee con el
   mismo `"*"`) y el teléfono de la persona la buscaba con SU empresa. Silencioso de los dos lados.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): se llaman las acciones con el payload del POST, y se lee
   la hoja resultante o la función que la consume — no las piezas sueltas.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const A11_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  ['rafael', 'claveA', 'supervisor', 'Consorcio HELITEC', 'medA', ''],
  ['cardon', 'claveB', 'supervisor', 'Cardón',            'medB', ''],
  ['*',      'claveAdmin', 'admin',  '',                  '',     '']
];
const A11_NOMINA = [
  ['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
   'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
  ['Consorcio HELITEC', 'Ana Suárez',  'V-111', 'Operaciones', 'Piloto', 'F', '34', '', '', 'Sí', '', '', '4'],
  ['Consorcio HELITEC', 'Luis Mota',   'V-333', 'Operaciones', 'Piloto', 'M', '41', '', '', 'Sí', '', '', '4'],
  ['Cardón',            'Bruno Lara',  'V-222', 'Planta',      'Operario', 'M', '40', '', '', 'No', '', '', '3']
];
const A11_CASOS_CAB = ['Fecha','Persona','Empresa','Departamento','Cargo','Telefono','Correo',
  'NivelRiesgo','Severidad','Motivo','Indicadores','Confiabilidad','OrigenApp','IdCaso','Procesado','RefOdoo','Valores'];
const A11_BITA_CAB = ['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo',
  'UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON'];

function a11Env(extra, fns) {
  const env = GS.crearEntorno(Object.assign({
    'Accesos': A11_ACCESOS.map(f => f.slice()),
    'Nómina':  A11_NOMINA.map(f => f.slice())
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
function a11Json(r) { return JSON.parse(r.getContent ? r.getContent() : r); }

/* ── 1 · el caso de Odoo ────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔒 un médico no puede pisar el caso de otro cliente', () => {
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice(),
    ['2026-09-04', 'Bruno Lara', 'Cardón', 'Planta', 'Operario', '', '', '3', 'alta',
     'indicadores', 'kss', 'ok', 'app', 'caso_bruno lara_2026-09-04', 'sí', 'ODOO-9', '{}']],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']]
  }, ['accionCasoOdooGuardar', 'upsertCasoOdoo', 'gestScope']);

  api.accionCasoOdooGuardar({ usuario:'rafael', empresa:'rafael', pass:'medA', dispositivoId:'d',
    caso: JSON.stringify({ IdCaso:'caso_bruno lara_2026-09-04', Persona:'Bruno Lara',
      Empresa:'Cardón', Severidad:'', Indicadores:'', Fecha:'2026-09-06' }) });

  const filas = api.__hoja('Casos Odoo');
  const deCardon = filas.filter(f => String(f[2]) === 'Cardón');
  PRUEBAS.igual(deCardon.length, 1, 'la fila de Cardón sigue existiendo');
  PRUEBAS.igual(String(deCardon[0][8]), 'alta',
    'y su SEVERIDAD quedó intacta · la pisaba con vacío, en la hoja que Odoo lee');
  PRUEBAS.igual(String(deCardon[0][15]), 'ODOO-9', 'y su referencia de Odoo también');
});

PRUEBAS.caso('el médico SÍ puede actualizar el caso de su propia empresa', () => {
  /* El discriminador: sin esto, un arreglo que simplemente bloqueara todo daría verde arriba. */
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice(),
    ['2026-09-04', 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto', '', '', '4', 'media',
     'm', 'kss', 'ok', 'app', 'caso_ana suarez_2026-09-04', '', '', '{}']],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']]
  }, ['accionCasoOdooGuardar']);
  const r = a11Json(api.accionCasoOdooGuardar({ usuario:'rafael', empresa:'rafael', pass:'medA',
    dispositivoId:'d', caso: JSON.stringify({ IdCaso:'caso_ana suarez_2026-09-04',
      Persona:'Ana Suárez', Empresa:'Consorcio HELITEC', Severidad:'alta', Fecha:'2026-09-06' }) }));
  PRUEBAS.igual(r.ok, true, 'responde ok');
  PRUEBAS.igual(r.actualizado, true, 'y ACTUALIZA la fila, no crea otra');
  const f = api.__hoja('Casos Odoo');
  PRUEBAS.igual(f.length, 1, 'sigue habiendo una sola fila');
  PRUEBAS.igual(String(f[0][8]), 'alta', 'con la severidad nueva');
});

PRUEBAS.caso('la empresa de la fila la fija la CUENTA, no el JSON', () => {
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice()],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']] },
    ['accionCasoOdooGuardar']);
  api.accionCasoOdooGuardar({ usuario:'rafael', empresa:'rafael', pass:'medA', dispositivoId:'d',
    caso: JSON.stringify({ IdCaso:'caso_x_2026-09-06', Persona:'Ana Suárez',
      Empresa:'Cardón', Severidad:'alta', Fecha:'2026-09-06' }) });
  const f = api.__hoja('Casos Odoo');
  PRUEBAS.igual(f.length, 1, 'se escribió');
  PRUEBAS.igual(String(f[0][2]), 'Consorcio HELITEC',
    'bajo SU empresa, aunque el JSON dijera Cardón · quedó «' + f[0][2] + '»');
});

/* ── 2 · la bitácora ────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔒 un supervisor no puede escribir en la bitácora de otro cliente (R3)', () => {
  const api = a11Env({ 'Bitácora': [A11_BITA_CAB.slice()] },
    ['accionBitacoraGuardar', 'gestScope']);
  api.accionBitacoraGuardar({ usuario:'rafael', empresa:'rafael', pass:'claveA', dispositivoId:'d',
    evento: JSON.stringify({ id:'b1', empresa:'Cardón', accion:'determinacion_medica',
      sujeto:'Bruno Lara', actor:'servicio médico', origen:'panel' }) });
  const f = api.__hoja('Bitácora');
  PRUEBAS.igual(f.length, 1, 'la línea se escribió (la bitácora es append-only, no se rechaza)');
  PRUEBAS.igual(String(f[0][1]), 'Consorcio HELITEC',
    'pero bajo SU empresa · una línea falsa en la de otro NO se puede borrar después (R3) · quedó «'
    + f[0][1] + '»');
  PRUEBAS.igual(String(f[0][3]), 'Bruno Lara', 'el resto del evento se conserva tal cual');
});

/* ── 4 · la cobertura, que nunca funcionó ───────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ nominaTotal llega de verdad · P096 no funcionaba en producción', () => {
  /* EL CAMINO REAL: se llama `accionSupervisor(p)`, que es lo que responde al POST del panel, y se
     mira el payload que sale — no la función que cuenta. Ese payload es lo que el cliente usa
     como denominador de la cobertura. */
  const api = a11Env({
    'Respuestas de formulario 1': [['A'], ['B']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  }, ['accionSupervisor']);
  const r = a11Json(api.accionSupervisor({ usuario:'rafael', empresa:'rafael', pass:'claveA',
                                           dispositivoId:'d' }));
  PRUEBAS.igual(r.ok, true, 'el panel responde');
  PRUEBAS.igual(r.nominaTotal, 2,
    'llegan las DOS personas de la nómina de HELITEC · con el bug llegaba 0 y la cobertura ' +
    'volvía a contar sólo a quien ya tenía tests');
  PRUEBAS.igual(r.nominaError, null,
    'y sin error tragado · era un ReferenceError que el catch escondía');
  PRUEBAS.igual((r.nominaSinDato || []).length, 2,
    'y las dos figuran como nunca medidas · con el bug la lista era siempre vacía');
});

PRUEBAS.caso('el catch de la nómina ya no es mudo', () => {
  /* El discriminador de que el campo sirve: si algo revienta ahí adentro, se ve. */
  PRUEBAS.igual(/nominaError: nomError \|\| null/.test(CTX.gs), true,
    'el payload lleva el motivo del fallo, no sólo un cero');
  PRUEBAS.igual(/nomError = String\(e && e\.message \|\| e\)/.test(CTX.gs), true,
    'y el catch lo guarda en vez de descartarlo');
});

/* ── 5 · la tarea del admin ─────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ la tarea del admin sin empresa se RECHAZA, no se pierde en silencio', () => {
  const api = a11Env({ 'Tareas': [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle',
                                   'Vence','Estado','Creada','Actualizada','CreadaPor']] },
    ['accionTareaGuardar']);
  const r = a11Json(api.accionTareaGuardar({ usuario:'*', empresa:'*', pass:'claveAdmin',
    dispositivoId:'d', tarea: JSON.stringify({ id:'t1', persona:'Ana Suárez',
      titulo:'Descansar 12 horas', cedula:'V-111' }) }));
  PRUEBAS.igual(r.ok, false, 'lo rechaza');
  PRUEBAS.igual(r.motivo, 'sin_empresa', 'con un motivo que el cliente puede distinguir');
  PRUEBAS.igual(api.__hoja('Tareas').length, 0,
    'y NO deja una fila con Empresa "*" que la persona nunca va a recibir');
});

PRUEBAS.caso('el admin CON empresa elegida sí puede asignar', () => {
  const api = a11Env({ 'Tareas': [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle',
                                   'Vence','Estado','Creada','Actualizada','CreadaPor']] },
    ['accionTareaGuardar']);
  const r = a11Json(api.accionTareaGuardar({ usuario:'*', empresa:'Consorcio HELITEC',
    pass:'claveAdmin', dispositivoId:'d', tarea: JSON.stringify({ id:'t1', persona:'Ana Suárez',
      titulo:'Descansar 12 horas', cedula:'V-111' }) }));
  PRUEBAS.igual(r.ok, true, 'la acepta · el discriminador de que no se bloqueó al admin entero');
  const f = api.__hoja('Tareas');
  PRUEBAS.igual(f.length, 1, 'y escribe la fila');
  PRUEBAS.igual(String(f[0][0]), 'Consorcio HELITEC', 'con la empresa que eligió');
});

PRUEBAS.caso('un supervisor no se ve afectado por el corte del admin', () => {
  const api = a11Env({ 'Tareas': [['Empresa','ID','Cedula','Persona','Origen','Titulo','Detalle',
                                   'Vence','Estado','Creada','Actualizada','CreadaPor']] },
    ['accionTareaGuardar']);
  const r = a11Json(api.accionTareaGuardar({ usuario:'rafael', empresa:'rafael', pass:'claveA',
    dispositivoId:'d', tarea: JSON.stringify({ id:'t2', persona:'Ana Suárez',
      titulo:'Revisar descanso', cedula:'V-111' }) }));
  PRUEBAS.igual(r.ok, true, 'el supervisor manda `empresa:<usuario>` y sigue funcionando igual');
  PRUEBAS.igual(String(api.__hoja('Tareas')[0][0]), 'Consorcio HELITEC', 'bajo su empresa');
});

/* ── 3 · la clave del índice de anotaciones ─────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ la clave del índice de anotaciones lleva la empresa', () => {
  /* Este es el único de los cinco que no se puede entrar por su acción: `cronCasosOdoo` lo dispara
     un activador por tiempo que no existe en el emulador. Se comprueba que las DOS puntas usan la
     misma forma de clave, que es la propiedad que se rompió — el productor la cambió el
     2026-09-03 y el consumidor se quedó atrás, y nadie se enteró porque `undefined` no falla:
     simplemente desactiva las dos guardas de `casoDePersona`. */
  const prod = /var k = norm\(limpiarPersona\(g\.persona\)\) \+ "\|" \+ norm\(/.test(CTX.gs);
  PRUEBAS.igual(prod, true, 'el productor indexa por nombre|empresa');
  const cons = /anots\[norm\(limpiarPersona\(per\)\) \+ "\|" \+ norm\(emp\)\]/.test(CTX.gs);
  PRUEBAS.igual(cons, true, 'y el consumidor busca con la misma clave');
  /* El discriminador: que la forma vieja ya no esté. */
  PRUEBAS.igual(/anots\[norm\(limpiarPersona\(per\)\)\]/.test(CTX.gs), false,
    'y la clave vieja sin empresa desapareció · con ella, `anot` era siempre undefined');
});

/* ── A11c · dos ids para el mismo hecho, y una empresa escrita de dos formas ──────────────────── */

PRUEBAS.caso('⚠️ un nombre con apóstrofe NO abre dos casos', () => {
  /* Los dos productores de `IdCaso` normalizan distinto y no se puede unificar ninguno:
     · el cron (servidor) usa `norm()`, que convierte la puntuación en espacios;
     · el panel (cliente) usa `dashNorm()`, que saca acentos pero NO toca la puntuación.
     Para "Luis O'Brien" y la misma fecha, el cron escribe `caso_luis o brien_…` y el panel
     `caso_luis o'brien_…`. Antes eran DOS filas para el mismo hecho, y dos tickets en Odoo.

     ⚠️ `dashNorm` NO SE PUEDE CAMBIAR: el propio index.html avisa que es la que genera los ids de
     upsert del CH, y cambiarla haría que la misma persona dejara de matchear con las filas ya
     escritas. Por eso el arreglo va en la BÚSQUEDA, no en lo que se escribe. */
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice()],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']] },
    ['upsertCasoOdoo', 'casoIdEquiv_']);

  /* Primero el cron, con la forma del servidor. */
  api.upsertCasoOdoo({ IdCaso:"caso_luis o brien_2026-09-04", Persona:"Luis O'Brien",
    Empresa:'Consorcio HELITEC', Severidad:'media', Fecha:'2026-09-04' });
  /* Y después el panel, con la forma del cliente, para el MISMO hecho. */
  const r = api.upsertCasoOdoo({ IdCaso:"caso_luis o'brien_2026-09-04", Persona:"Luis O'Brien",
    Empresa:'Consorcio HELITEC', Severidad:'alta', Fecha:'2026-09-04' });

  PRUEBAS.igual(api.__hoja('Casos Odoo').length, 1,
    'UNA fila para el mismo hecho · eran dos, y dos tickets en Odoo');
  PRUEBAS.igual(r, 'actualizado', 'la segunda ACTUALIZA la primera, no appendea');
  PRUEBAS.igual(String(api.__hoja('Casos Odoo')[0][8]), 'alta', 'con la severidad nueva');
});

PRUEBAS.caso('el DISCRIMINADOR: dos casos DISTINTOS siguen siendo dos', () => {
  /* Si la comparación normalizara de más, dos personas o dos fechas distintas caerían en la misma
     fila y una taparía a la otra — cambiar un bug de duplicado por uno de pérdida. */
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice()],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']] },
    ['upsertCasoOdoo']);
  api.upsertCasoOdoo({ IdCaso:'caso_ana suarez_2026-09-04', Persona:'Ana Suárez',
    Empresa:'Consorcio HELITEC', Severidad:'media', Fecha:'2026-09-04' });
  api.upsertCasoOdoo({ IdCaso:'caso_ana suarez_2026-09-05', Persona:'Ana Suárez',
    Empresa:'Consorcio HELITEC', Severidad:'alta', Fecha:'2026-09-05' });
  api.upsertCasoOdoo({ IdCaso:'caso_luis mota_2026-09-04', Persona:'Luis Mota',
    Empresa:'Consorcio HELITEC', Severidad:'baja', Fecha:'2026-09-04' });
  PRUEBAS.igual(api.__hoja('Casos Odoo').length, 3,
    'otra fecha y otra persona siguen siendo filas propias');
});

PRUEBAS.caso('⚠️ el cron escribe la empresa CANÓNICA, que es por la que filtra el panel', () => {
  /* `leerDatos()` no canonicaliza —`RES.aplicar()` recién corre en `accionSupervisor`—, así que el
     cron escribía el texto CRUDO del CH mientras `casos_odoo_resumen` filtra por `acc.canonical`.
     Con una empresa que tenga más de un nombre, el supervisor no veía los casos que el cron le
     abrió: los dos escritores de la misma hoja usaban formas distintas del mismo nombre. */
  const api = a11Env({ 'Casos Odoo': [A11_CASOS_CAB.slice()],
    'Registrados Fatiga': [['A','Fecha y hora','Nombre','Email','Cedula']] },
    ['casoDePersona', 'upsertCasoOdoo', 'construirAlias', 'nominaEmpresaCanon']);
  const alias = api.construirAlias();
  /* La forma cruda que puede traer `Respuestas de formulario 1`. */
  const cruda = 'consorcio helitec';
  /* La determinación del médico con `nivel:'alto'` fuerza severidad roja y saltea el cálculo por
     indicadores, que depende de la tabla de referencia y del nivel de riesgo. Acá lo que se mide
     es la EMPRESA que queda escrita, no el criterio para abrir el caso: se le da lo mínimo para
     que el caso exista. */
  const caso = api.casoDePersona('Ana Suárez',
    [{ persona:'Ana Suárez', empresa:cruda, departamento:'Operaciones', cargo:'Piloto',
       fecha:'2026-09-06', kss:8 }], null, 4, { nivel:'alto' }, { activo:true });
  /* ⚠️ GUARDA DE MEDIBILIDAD. La primera versión hacía `if (!caso) { cierto(true); return; }` —
     un verde que sólo decía "no medí nada". Con el `.gs` roto ese caso pasaba igual, o sea que no
     discriminaba: exactamente el cero sin discriminador que R17 prohíbe aceptar como resultado. */
  PRUEBAS.cierto(!!caso,
    '⚠️ con estos datos TIENE que abrirse un caso · si no, este caso no está midiendo nada');
  if (!caso) return;
  /* Y se compara contra la constante, no contra `nominaEmpresaCanon(...)`: si se comparara contra
     la función, los dos lados se moverían juntos y la aserción nunca podría fallar. */
  PRUEBAS.igual(caso.Empresa, 'Consorcio HELITEC',
    'la fila lleva la forma canónica, no la cruda · quedó «' + caso.Empresa + '»');
  PRUEBAS.falso(caso.Empresa === cruda,
    'y NO la cruda · el panel filtra por la canónica y no la encontraría');
});
