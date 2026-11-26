PRUEBAS.grupo('P394b · la contraseña propia se pide al abrir y se exige desde una fecha');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P394b · LA PUERTA QUE QUEDABA DE `empleado` (F098; ADR 021, decisión 2; ADR 023)

   Decisiones de Franco (panel del 2026-11-25): «Pedirla al abrir, con plazo», «14 días», «No pedir el código» (confirmado con
   «Sin código, como elegí» después de ver el riesgo) y «Cada vez que abre la app».
   · `empleado`, a quien está en una nómina activa y no creó su contraseña: hasta `claveExigidaDesde` responde como siempre y
     avisa `clave: { falta, exigidaDesde }`; desde ese día, `crear_clave` sin datos. Quien la tiene, igual que antes.
   · `credencial_crear` ya no pide el código de la empresa; a cambio, el nombre que manda la app tiene que ser el de esa persona
     (el de la nómina o el registrado para esa cédula), con la misma respuesta que `no_esta`, y hay un freno por dispositivo.

   Cada caso entra por el `.gs` REAL en el emulador (R17), dice qué función concede o niega (R19) y tiene su discriminador: el
   mismo pedido con el `.gs` parchado de vuelta.
   AYUDANTES DE OTROS ARCHIVOS (por eso va después de `p394a` en `casos.json` y en `soloConGs`): `p391Hojas`, `p391Parchar`,
   `p394aReg`, `p394aNomina` (funciones: se ven desde acá; los `const` no).
   ⚠️ EL REPO ES PÚBLICO: nombres, cédulas y códigos inventados.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los encabezados de `Registrados Fatiga` como los crea `accionRegistro`. Copia de `P394A_REG_CAB`: un `const` de otro archivo de
   casos no se ve desde acá (cada archivo se evalúa aparte; las funciones declaradas, como `p394aReg`, sí). */
const P394B_REG_CAB = ['Fecha de registro', 'Última actualización', 'Nombre', 'Email', 'Cédula', 'ID Piloto', '¿Piloto?', '¿Supervisor?',
  'Empresa', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Dispositivo', 'Modelo', 'Sistema', 'Navegador', 'App instalada',
  'Idioma', 'Zona horaria', 'Pantalla', 'User-Agent', '¿Servicio médico?'];
const P394B_COD = 'COD-394B';
const P394B = { rosa: ['Rosa Mena', '12345678'], luis: ['Luis Conclave', '23456789'], otra: ['Otra Grafia Perez', '34567890'],
                afuera: ['Ines Otra', '77778888'], sincod: ['Pedro Sincodigo', '55556666'] };

/* El CH de prueba:
   · Helitec, con código y nómina: Rosa (dada de alta, sin contraseña, con un test), Luis (dado de alta, va a crear la suya) y
     alguien que se dio de alta con su nombre escrito de otra forma («Otra Grafia» en `Registrados`, «Otra Grafia Perez» en la
     nómina);
   · «Sin Codigo SA», con nómina y sin código;
   · «Otra SA», sin nómina: una persona dada de alta con un test.
   `fecha` va a la fila GENERAL de `Config Empresa` (`claveExigidaDesde`); el reloj, el 2026-11-25 a las 11:00 de Caracas. */
function p394bMundo(fecha, cambios, mas) {
  mas = mas || {};   // { tests, nomina, registrados, hojas }: filas extra para un caso (verificador de P394b)
  const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
  if (g.faltan.length) return { faltan: g.faltan };
  /* Un test con empresa `null` queda con la celda de empresa VACÍA de verdad (`p391Fila` pone «Empresa Demo» si viene vacía): son las
     filas viejas, sin empresa, que `esMio` toma por la cédula. */
  const testsTodos = [['2026-11-20', '10:41', 'Rosa Mena', 6, 2, '', 'Helitec'], ['2026-11-20', '10:42', 'Luis Conclave', 5, 2, '', 'Helitec'],
            ['2026-11-20', '10:43', 'Ines Otra', 5, 2, '', 'Otra SA']].concat(mas.tests || []);
  const opc = {
    tests: testsTodos.map(t => t[6] === null ? t.slice(0, 6).concat(['']) : t),
    nomina: [p394aNomina('Helitec', ...P394B.rosa), p394aNomina('Helitec', ...P394B.luis), p394aNomina('Helitec', ...P394B.otra),
             p394aNomina('Sin Codigo SA', ...P394B.sincod)].concat(mas.nomina || [])
  };
  const config = [['Empresa', 'Clave', 'Valor'], ['Helitec', 'codigoRegistro', P394B_COD]];
  if (fecha !== undefined) config.push(['', 'claveExigidaDesde', fecha]);
  const hojas = Object.assign(p391Hojas(opc), {
    'Registrados Fatiga': [P394B_REG_CAB, p394aReg(...P394B.rosa, 'Helitec'), p394aReg(...P394B.luis, 'Helitec'),
                           p394aReg('Otra Grafia', P394B.otra[1], 'Helitec'), p394aReg(...P394B.afuera, 'Otra SA')].concat(mas.registrados || []),
    'Config Empresa': config,
    'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo', 'Rol', 'Estado', 'Creada', 'UltimoAcceso']]
  }, mas.hojas || {});
  const resp = hojas['Respuestas de formulario 1'], nSemb = resp.length - opc.tests.length;
  testsTodos.forEach((t, i) => { if (t[6] === null) resp[nSemb + i][72] = ''; });
  const env = GS.crearEntorno(hojas);
  env.Date = GS.relojFijo('2026-11-25T15:00:00Z');
  const a = GS.cargarGs(g.gs, env, ['accionEmpleado', 'accionCredencialCrear', 'accionLogin', 'mantConfigValorMal_']);
  let n = 0;
  /* Un dispositivo por pedido, salvo que el caso diga cuál: el freno por dispositivo se prueba aparte. */
  const pedir = (fn, x) => JSON.parse(a[fn](Object.assign({ dispositivoId: 'p394b-' + (++n) }, x)).getContent());
  const hoja = nombre => env.SpreadsheetApp.openById('maestro').getSheetByName(nombre);
  return {
    faltan: undefined,
    emp: x => pedir('accionEmpleado', x), cred: x => pedir('accionCredencialCrear', x), login: x => pedir('accionLogin', x),
    api: a, filasDe: nombre => hoja(nombre).getDataRange().getValues().slice(1),
    credenciales: ced => hoja('Credenciales').getDataRange().getValues().slice(1).filter(r => String(r[1]).replace(/\D/g, '') === ced).length
  };
}
const p394bEmp = (w, [persona, cedula], empresa) => w.emp({ persona, cedula, empresa: empresa || 'Helitec' });
const p394bVe = r => [r.ok, (r.registros || []).length];

/* Los parches que deshacen cada cosa de este prompt. Cada texto tiene que aparecer UNA vez (`p391Parchar` lo dice si no). */
const P394B_SIN_EXIGIR = [['      var yaExigida = !!desdeClave && hoyFijo_() >= desdeClave;', '      var yaExigida = false;']];
const P394B_SIN_NOMBRE = [['  if (!idOk) {', '  if (false) {']];
/* `credNombreDeLaPersona_` sin `Registrados` / sin `Identidades`: los nombres de esa persona en esa empresa, de a uno. */
const P394B_SIN_REGISTRADOS = [['  if (enRegistrados) return true;', '  if (false) return true;']];
const P394B_SIN_IDENTIDADES = [['  return ov.porNombreEmpresa[n + "|" + emp] === c || ov.porNombreSinEmpresa[n] === c;', '  return false;']];
/* Verificador de P394b (dos vueltas) · la puerta por la cédula; la contraseña donde están los datos; la baja de esa empresa. */
const P394B_SIN_CEDULA_EN_OTRA = [['    if (!primera) primera = canon;', '']];                 // `credNominaDeCedula_` sólo con la empresa del pedido
const P394B_SIN_EMPRESA_VACIA = [['    if (!norm(empCred)) return json(empleadoVacio_());', '']];   // sin empresa, como antes: el filtro no recorta
/* La contraseña buscada en la empresa de la NÓMINA de esa cédula: la primera versión del arreglo (abría los datos de quien se cambió). */
const P394B_CRED_DE_LA_NOMINA = [['    try { credFila = credBuscar(empCred, cedPedida); } catch (e) { credFila = null; }',
  '    try { credFila = credBuscar(credNominaDeCedula_(empCred, cedPedida).empresa || empCred, cedPedida); } catch (e) { credFila = null; }']];
/* El login con la empresa de la nómina cuando la del pedido no está en `Accesos` (la segunda versión): las lecturas decían si la cédula
   estaba en una nómina (tercera vuelta, hallazgo 5). */
const P394B_LOGIN_POR_NOMINA = [['  var frenoKey = "__persona__" + empresa + "|" + cedula;',
  '  try { if (!construirAlias()[norm(empresa)]) { var ncX = credNominaDeCedula_(empresa, cedula); if (ncX.empresa) { credBuscar(ncX.empresa, cedula); empresa = ncX.empresa; } } } catch (eX) {}\n  var frenoKey = "__persona__" + empresa + "|" + cedula;']];
const P394B_SIN_BAJA = [['      } else if (yaExigida && (bajaPedida || (nomCed.baja && !regConEmpresa_(empCred, cedPedida)))) {', '      } else if (false) {']];
const P394B_BAJA_CUALQUIERA = [['      } else if (yaExigida && (bajaPedida || (nomCed.baja && !regConEmpresa_(empCred, cedPedida)))) {', '      } else if (yaExigida && (bajaPedida || nomCed.baja)) {']];
/* Cuarta vuelta · `porNombre` (que trae las variantes de cualquier empresa) en vez de las sin empresa; y sin el filtro de filas sin empresa. */
const P394B_IDENT_CUALQUIER_EMPRESA = [['  return ov.porNombreEmpresa[n + "|" + emp] === c || ov.porNombreSinEmpresa[n] === c;',
  '  return ov.porNombreEmpresa[n + "|" + emp] === c || ov.porNombre[n] === c;']];
const P394B_SIN_SOLO_CON_EMPRESA = [['    if (soloConEmpresa && !String(r.empresa == null ? "" : r.empresa).trim()) return false;   // P394b · ver `soloConEmpresa`', '']];
/* La puerta antes que la baja de la empresa del pedido (la versión que dejaba en círculo a quien se cambió: tercera vuelta, 3). */
const P394B_PUERTA_ANTES_QUE_BAJA = [['      var bajaPedida = !activaPedida && nominaPersonaDeBaja_(empCred, cedPedida);', '      var bajaPedida = false;']];
/* El nombre por el índice global del padrón (la 2ª versión del arreglo): con una fila de otra nómina, la cuenta de otra. */
const P394B_NOMBRE_POR_PADRON = [['  try { idOk = credNombreDeLaPersona_(empCanon, ced, usuario); } catch (eId) { idOk = false; }',
  '  try { var qP = construirResolutor().resolver(usuario, ""); idOk = !!(qP && qP.cedula) && cedulaNorm(qP.cedula) === ced; } catch (eId) { idOk = false; }']];
/* El freno con la empresa en la clave (como antes): 60 fallos con una empresa inventada frenaban sólo las cédulas que están. */
const P394B_FRENO_CON_EMPRESA = [['  var freno = "__altacred__|" + ced;', '  var freno = "__altacred__" + empCanon + "|" + ced;']];
/* La identidad SÓLO para las cédulas que están: es el orden que dejaba medir por el tiempo qué cédulas están (hallazgo 6). */
const P394B_IDENTIDAD_PEREZOSA = [['  try { idOk = credNombreDeLaPersona_(empCanon, ced, usuario); } catch (eId) { idOk = false; }',
  '  try { idOk = credEnNomina(empCanon, ced).persona ? credNombreDeLaPersona_(empCanon, ced, usuario) : false; } catch (eId) { idOk = false; }']];
const P394B_CON_CODIGO = [['  var debil = credClaveDebil(clave);', '  var puerta = puertaCodigo(empCanon, p);\n  if (puerta) return puerta;\n  var debil = credClaveDebil(clave);']];
const P394B_SIN_FRENO_DISP = [[' || accFrenado("__altacred__", p.dispositivoId)', '']];
const P394B_SIN_RECOMPONER = [['  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \\d{2} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT[+-]\\d{4}/.test(v)) {', '  if (false) {']];

PRUEBAS.caso('🔒 P394b · `empleado` avisa que falta la contraseña y, desde la fecha, no entrega los resultados sin ella', () => {
  /* R19 · lo que lo NIEGA: `accionEmpleado`, el bloque de `credFila` vacío con `credEnNomina` y `claveExigidaDesde_`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const antes = p394bMundo('2026-12-09');
  PRUEBAS.igual(antes.faltan, undefined, 'guarda: el mundo se armó');
  if (antes.faltan) return;
  const a = p394bEmp(antes, P394B.rosa);
  PRUEBAS.igual(p394bVe(a), [true, 1], 'antes de la fecha ve sus resultados con su cédula, como siempre');
  PRUEBAS.igual(a.clave, { falta: true, exigidaDesde: '2026-12-09' }, '🔒 y el servidor avisa que falta la contraseña, con la fecha');
  const ya = p394bMundo('2026-11-25');
  const b = p394bEmp(ya, P394B.rosa);
  PRUEBAS.igual([b.ok, b.motivo, b.exigidaDesde, 'registros' in b], [false, 'crear_clave', '2026-11-25', false],
    '🔒 desde la fecha (el mismo día incluido, en Caracas), sin contraseña no recibe nada y se le pide crearla');
  /* DISCRIMINADOR · sin la exigencia, la cédula sola seguía abriendo sus resultados */
  const s = p394bMundo('2026-11-25', P394B_SIN_EXIGIR);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.igual(p394bVe(p394bEmp(s, P394B.rosa)), [true, 1], '⚠️ discriminador · así los leía cualquiera con su cédula');
});

PRUEBAS.caso('P394b · sin fecha, o con una fecha que no es fecha, no se le cierra nada a nadie (sólo se avisa)', () => {
  /* La fecha vacía o mal escrita es «no se exige» (`claveExigidaDesde_`): un valor raro no puede dejar a nadie sin sus datos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  [undefined, '', '09/12/2026', '2026-02-31', 'mañana'].forEach(f => {
    const w = p394bMundo(f);
    if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
    const r = p394bEmp(w, P394B.rosa);
    PRUEBAS.igual([p394bVe(r), r.clave], [[true, 1], { falta: true, exigidaDesde: '' }], 'con la fecha ' + JSON.stringify(f) + ': ve sus resultados y se le avisa sin fecha');
  });
});

PRUEBAS.caso('🔒 P394b · una fecha escrita a mano en la planilla (que Sheets vuelve fecha) se reconoce igual (R15)', () => {
  /* R19 · lo que lo CONCEDE: `claveExigidaDesde_`, que recompone el texto de un `Date` al día del libro. `config_set` la escribe como
     texto; una edición a mano la convierte, y sin esto la puerta quedaba abierta sin que nadie lo notara. La celda lleva lo que trae
     `getValues` de una fecha: la medianoche del libro (Caracas en el emulador). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const dic9 = new Date('2026-12-09T04:00:00Z'), nov25 = new Date('2026-11-25T04:00:00Z');
  const w = p394bMundo(dic9);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(p394bEmp(w, P394B.rosa).clave, { falta: true, exigidaDesde: '2026-12-09' }, 'el 9 de diciembre como fecha de Sheets se lee 2026-12-09');
  const x = p394bMundo(nov25);
  PRUEBAS.igual(p394bEmp(x, P394B.rosa).motivo, 'crear_clave', '🔒 y desde ese día se exige: el formato de la celda no deja la puerta abierta');
  const s = p394bMundo(nov25, P394B_SIN_RECOMPONER);
  if (!s.faltan) PRUEBAS.igual(p394bVe(p394bEmp(s, P394B.rosa)), [true, 1], '⚠️ discriminador · sin recomponerla, la fecha no se reconocía y entregaba los resultados');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('P394b · la fecha no le cambia nada a quien ya tiene contraseña, ni a quien está en una empresa sin nómina', () => {
  /* R19 · `accionEmpleado`: con fila en `Credenciales` decide el bloque Z2 (arriba del de P394b); sin nómina, `credEnNomina` no
     devuelve persona y la puerta queda como estaba (no tendría cómo crearla: `credencial_crear` exige la nómina). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394bMundo('2026-11-25');
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const [luis, cedL] = P394B.luis;
  const c = w.cred({ empresa: 'Helitec', cedula: cedL, usuario: luis, pass: 'ClaveLarga2026' });
  PRUEBAS.igual(c.ok, true, 'guarda: Luis creó la suya');
  const r = p394bEmp(w, P394B.luis);
  PRUEBAS.igual([r.ok, r.motivo, 'clave' in r], [false, 'necesita_clave', false], 'con contraseña, sin ella no entra (como antes de P394b) y no se le pide crearla');
  const o = p394bEmp(w, P394B.afuera, 'Otra SA');
  PRUEBAS.igual([p394bVe(o), 'clave' in o], [[true, 1], false], 'sin nómina, ve lo suyo como antes y no se le pide nada que no podría crear');
});

PRUEBAS.caso('🔒 P394b · `credencial_crear` no pide el código, pero sí el nombre de esa persona, y contesta igual que a una cédula que no está', () => {
  /* R19 · lo que lo CONCEDE: `accionCredencialCrear` sin `puertaCodigo` (decisión de Franco, ADR 023). Lo que lo NIEGA: el nombre
     que no es el de esa persona en esa empresa (`credNombreDeLaPersona_`: su fila de la nómina, `Registrados` o una variante de
     `Identidades` de esa empresa). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394bMundo('2026-12-09');
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const [rosa, cedR] = P394B.rosa;
  const mal = w.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Atacante Uno', pass: 'ClaveLarga2026' });
  const noEsta = w.cred({ empresa: 'Helitec', cedula: '10101010', usuario: 'Atacante Uno', pass: 'ClaveLarga2026' });
  PRUEBAS.igual([mal.ok, mal.motivo], [false, 'no_esta'], '🔒 con su cédula y otro nombre, no se crea');
  PRUEBAS.igual([mal.ok, mal.motivo, mal.error], [noEsta.ok, noEsta.motivo, noEsta.error], '🔒 y la respuesta es la misma que la de una cédula que no está (sin oráculo)');
  PRUEBAS.igual(w.credenciales(cedR), 0, 'y no queda ninguna fila');
  const bien = w.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'rosa  MENA', pass: 'ClaveLarga2026' });
  PRUEBAS.igual([bien.ok, w.credenciales(cedR)], [true, 1], '🔒 sin el código y con su nombre (otra grafía), se crea');
  const [, cedO] = P394B.otra;
  PRUEBAS.igual(w.cred({ empresa: 'Helitec', cedula: cedO, usuario: 'Otra Grafia', pass: 'ClaveLarga2026' }).ok, true,
    'con el nombre con el que se dio de alta (distinto del de la nómina), también: si no, desde la fecha se quedaba sin salida');
  PRUEBAS.igual(w.cred({ empresa: 'Sin Codigo SA', cedula: P394B.sincod[1], usuario: P394B.sincod[0], pass: 'ClaveLarga2026' }).ok, true,
    'en una empresa con nómina y sin código, también (el código ya no se pide en ninguna)');
  PRUEBAS.igual(w.cred({ empresa: 'Otra SA', cedula: P394B.afuera[1], usuario: P394B.afuera[0], pass: 'ClaveLarga2026' }).motivo, 'sin_nomina',
    'sin nómina, dice eso: no hay contra qué crearla');
  /* DISCRIMINADORES · (1) sin el nombre, la cédula sola tomaba la cuenta; (2) sin el nombre registrado, quien se dio de alta con
     otra grafía no podía crearla; (3) con el código de antes, no se creaba sin mandarlo. */
  const s1 = p394bMundo('2026-12-09', P394B_SIN_NOMBRE);
  if (!s1.faltan) PRUEBAS.igual(s1.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Atacante Uno', pass: 'ClaveLarga2026' }).ok, true,
    '⚠️ discriminador · sin el nombre, con la cédula de otra persona se le creaba la contraseña');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje del nombre entró');
  const s2 = p394bMundo('2026-12-09', P394B_SIN_REGISTRADOS);
  if (!s2.faltan) PRUEBAS.igual(s2.cred({ empresa: 'Helitec', cedula: cedO, usuario: 'Otra Grafia', pass: 'ClaveLarga2026' }).motivo, 'no_esta',
    '⚠️ discriminador · sin `Registrados`, quien se dio de alta con otra grafía quedaba afuera');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje de `Registrados` entró');
  const s3 = p394bMundo('2026-12-09', P394B_CON_CODIGO);
  if (!s3.faltan) PRUEBAS.igual(s3.cred({ empresa: 'Helitec', cedula: cedR, usuario: rosa, pass: 'ClaveLarga2026' }).motivo, 'codigo_invalido',
    '⚠️ discriminador · con el código de antes, sin mandarlo no se creaba');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje del código entró');
});

PRUEBAS.caso('🔒 P394b · desde un mismo teléfono no se pueden probar cédulas sin límite: el freno es también por dispositivo', () => {
  /* R19 · lo que lo NIEGA: `accFrenado("__altacred__", dispositivoId)` en `accionCredencialCrear`, con el tope de siempre
     (`ACC_MAX_DISPOSITIVO`, 6 fallos). Antes el freno era sólo por cédula: cada cédula nueva empezaba de cero. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const probar = w => { let ultima;
    for (let i = 0; i < 8; i++) ultima = w.cred({ empresa: 'Helitec', cedula: String(90000000 + i), usuario: 'Atacante Uno', pass: 'ClaveLarga2026', dispositivoId: 'un-telefono' });
    return ultima; };
  const w = p394bMundo('2026-12-09');
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(probar(w).motivo, 'frenado', '🔒 después de 6 cédulas que no están, el teléfono queda frenado');
  const s = p394bMundo('2026-12-09', P394B_SIN_FRENO_DISP);
  if (!s.faltan) PRUEBAS.igual(probar(s).motivo, 'no_esta', '⚠️ discriminador · con el freno sólo por cédula, se podía seguir probando');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

/* ══ VERIFICADOR DE P394b (2026-11-25) · lo que encontró antes de publicar, reproducido y cerrado ══════════════════════════════ */

PRUEBAS.caso('🔒 P394b · sin empresa, con «-» o con una variante sin alias, la puerta también se cierra (hallazgo 1)', () => {
  /* R19 · lo que lo NIEGA: `accionEmpleado` no entrega nada sin empresa, y con una que no está en `Accesos` decide la puerta por la
     CÉDULA (`credNominaDeCedula_`: activa en alguna nómina). Antes, sin empresa o con una variante, `credEnNomina` no la encontraba y
     salían los resultados con nombre y cédula, pasada la fecha. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const mas = { tests: [['2026-11-21', '10:41', 'Rosa Mena', 7, 3, '', 'Helitec Venezuela'], ['2026-11-22', '10:41', 'Rosa Mena', 5, 1, '', '']] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const [rosa, cedR] = P394B.rosa;
  const vistos = {};
  [undefined, '', ' ', '-', 'Helitec Venezuela', 'Otra SA'].forEach(e => {
    const r = w.emp({ persona: rosa, cedula: cedR, empresa: e });
    vistos[JSON.stringify(e)] = [r.ok, r.motivo || '', (r.registros || []).length];
  });
  PRUEBAS.cierto(Object.keys(vistos).every(k => vistos[k][2] === 0), '🔒 pasada la fecha, ninguna de estas formas de empresa abre los resultados: ' + JSON.stringify(vistos));
  PRUEBAS.igual(['undefined', '""', '" "', '"-"'].map(k => vistos[k][1]), ['', '', '', ''], 'sin empresa, nada (como sin padrón)');
  PRUEBAS.igual(['"Helitec Venezuela"', '"Otra SA"'].map(k => vistos[k][1]), ['crear_clave', 'crear_clave'], 'con una fuera de `Accesos`, se le exige como en la suya');
  /* Quien ya la tiene: con una variante en el pedido, nada sin ella (pasada la fecha). */
  const [luis, cedL] = P394B.luis;
  PRUEBAS.igual(w.cred({ empresa: 'Helitec', cedula: cedL, usuario: luis, pass: 'ClaveLarga2026' }).ok, true, 'precondición · Luis creó la suya');
  PRUEBAS.igual((w.emp({ persona: luis, cedula: cedL, empresa: 'Helitec Venezuela' }).registros || []).length, 0,
    '🔒 con una variante sin alias, sin su contraseña no salen sus datos');
  /* DISCRIMINADORES · (1) sin el corte de la empresa vacía, salían los resultados de todas las empresas; (2) con la puerta sólo por la
     nómina de la empresa del pedido, una variante los abría. */
  /* (1) va con el mundo de ANTES de la fecha: después, la puerta de empresa fuera de `Accesos` también la cierra; antes, el corte es lo
     único que impide que sin empresa salgan las de todas. */
  const sinCorteAntes = p394bMundo('2026-12-09', P394B_SIN_EMPRESA_VACIA, mas), conCorteAntes = p394bMundo('2026-12-09', null, mas);
  if (!sinCorteAntes.faltan) {
    PRUEBAS.igual(p394bVe(conCorteAntes.emp({ persona: rosa, cedula: cedR })), [true, 0], 'antes de la fecha, sin empresa tampoco sale nada');
    PRUEBAS.igual(p394bVe(sinCorteAntes.emp({ persona: rosa, cedula: cedR })), [true, 3],
      '⚠️ discriminador · sin el corte, sin empresa salían los 3 registros de Rosa, de todas las empresas');
  }
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
  const s2 = p394bMundo('2026-11-25', P394B_SIN_CEDULA_EN_OTRA, mas);
  if (!s2.faltan) PRUEBAS.igual(p394bVe(s2.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec Venezuela' })), [true, 1],
    '⚠️ discriminador · con la puerta sólo por la nómina del pedido, la variante abría lo guardado con ella');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · quien `empleado` reconoce por un override de `Identidades` puede crear su contraseña (hallazgo 2, R21)', () => {
  /* R19 · lo que lo CONCEDE: `credNombreDeLaPersona_` acepta las variantes que `Identidades` une a esa cédula EN ESA EMPRESA. Antes
     aceptaba sólo el nombre de la nómina o el de `Registrados`: a «Rosita Mena» `empleado` le exigía la contraseña y acá no la podía
     crear, nunca. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const ident = { hojas: { 'Identidades': [['Variante', 'Empresa', 'Cedula', 'ResueltoPor', 'Como', 'Registros', 'PrimeraVez', 'UltimaVez'],
                                            ['Rosita Mena', 'Helitec', P394B.rosa[1], 'manual', '', '', '', '']] } };
  const w = p394bMundo('2026-11-25', null, ident);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(w.emp({ persona: 'Rosita Mena', cedula: P394B.rosa[1], empresa: 'Helitec' }).motivo, 'crear_clave',
    'precondición · `empleado` la reconoce por el override y le exige la contraseña');
  PRUEBAS.igual(w.cred({ empresa: 'Helitec', cedula: P394B.rosa[1], usuario: 'Rosita Mena', pass: 'ClaveLarga2026' }).ok, true,
    '🔒 y con ese mismo nombre la puede crear: el que crea acepta lo que el que lee reconoce');
  /* DISCRIMINADOR · sin `Identidades`, el escritor no la reconoce y la deja sin salida. */
  const s = p394bMundo('2026-11-25', P394B_SIN_IDENTIDADES, ident);
  if (!s.faltan) PRUEBAS.igual(s.cred({ empresa: 'Helitec', cedula: P394B.rosa[1], usuario: 'Rosita Mena', pass: 'ClaveLarga2026' }).motivo, 'no_esta',
    '⚠️ discriminador · sin `Identidades`, «Rosita Mena» no podía crearla');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

/* ⚠️ P394b (tercera vuelta del verificador) · ACÁ HABÍA UN CASO, «con una variante de la empresa en el perfil, la contraseña se crea en
   la de la nómina y se entra con ella». Lo que afirmaba lo saqué: las tres versiones que mapeaban la empresa del pedido a otra (la de la
   nómina, cualquiera, la «de los datos») abrieron cosas distintas. Hoy la contraseña se busca, se crea y se verifica en la empresa del
   PEDIDO, y quien tiene en el perfil una empresa que no está en `Accesos` no puede crearla desde la app (medido el 2026-11-25: como
   mucho 1 de las 29 personas de las nóminas). Va al panel de Franco. */

PRUEBAS.caso('🔒 P394b · `credencial_crear` hace el mismo trabajo con una cédula ausente que con una presente y otro nombre (hallazgo 6)', () => {
  /* R19 · lo que lo NIEGA: `accionCredencialCrear` mira la identidad ANTES que la cédula. Antes, la rama de la cédula presente leía
     además `Registrados` entera: sin el código, el tiempo de la respuesta decía qué cédulas están en la nómina. Se cuentan las
     lecturas de cada hoja (`getDataRange`) en un mundo nuevo para cada pedido. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const orig = GS.HojaFalsa.prototype.getDataRange;
  const medir = (cambios, ced) => {
    const w = p394bMundo('2026-12-09', cambios);
    if (w.faltan) return null;
    const lecturas = {};
    GS.HojaFalsa.prototype.getDataRange = function () { const n = this.getName(); lecturas[n] = (lecturas[n] || 0) + 1; return orig.apply(this, arguments); };
    try { const r = w.cred({ empresa: 'Helitec', cedula: ced, usuario: 'Atacante Uno', pass: 'ClaveLarga2026' });
          return [r.motivo, r.error, Object.keys(lecturas).sort().map(k => k + '×' + lecturas[k]).join(',')]; }   // cuántas veces, no sólo cuáles
    finally { GS.HojaFalsa.prototype.getDataRange = orig; }
  };
  try {
    const ausente = medir(null, '10101010'), presente = medir(null, P394B.rosa[1]);
    PRUEBAS.igual(presente, ausente, '🔒 mismo motivo, mismo texto y las mismas hojas leídas: ' + JSON.stringify(ausente));
    /* DISCRIMINADOR · con la identidad sólo para las cédulas que están, las lecturas difieren. */
    const a2 = medir(P394B_IDENTIDAD_PEREZOSA, '10101010'), p2 = medir(P394B_IDENTIDAD_PEREZOSA, P394B.rosa[1]);
    if (a2 && p2) PRUEBAS.cierto(a2[2] !== p2[2], '⚠️ discriminador · con la identidad perezosa, el trabajo delataba la cédula: ' + a2[2] + ' contra ' + p2[2]);
    else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
  } finally { GS.HojaFalsa.prototype.getDataRange = orig; }
});

PRUEBAS.caso('🔒 P394b · desde la fecha, quien está dado de baja recibe `baja`, no sus resultados (hallazgo 8; default a confirmar)', () => {
  /* R19 · lo que lo NIEGA: la rama de la baja de `accionEmpleado` (P172: «la baja cierra la puerta», como el login y `tareas_mias`), con
     la baja de la empresa de los datos. Antes de la fecha, como siempre. Decisión pendiente de Franco: va al panel. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const baja = ['Baja Persona', '45454545'];
  const mas = { nomina: [p394aNomina('Helitec', ...baja).concat(['Baja'])], registrados: [p394aReg(...baja, 'Helitec')],
                tests: [['2026-11-20', '10:44', 'Baja Persona', 5, 2, '', 'Helitec']] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const r = w.emp({ persona: baja[0], cedula: baja[1], empresa: 'Helitec' });
  PRUEBAS.igual([r.ok, r.motivo, 'registros' in r], [false, 'baja', false], '🔒 pasada la fecha, sin datos y con el motivo');
  const antes = p394bMundo('2026-12-09', null, mas);
  PRUEBAS.igual(p394bVe(antes.emp({ persona: baja[0], cedula: baja[1], empresa: 'Helitec' })), [true, 1], 'antes de la fecha, como siempre');
  /* DISCRIMINADOR · sin la rama de la baja, pasada la fecha seguía recibiendo sus resultados. */
  const s = p394bMundo('2026-11-25', P394B_SIN_BAJA, mas);
  if (!s.faltan) PRUEBAS.igual(p394bVe(s.emp({ persona: baja[0], cedula: baja[1], empresa: 'Helitec' })), [true, 1],
    '⚠️ discriminador · sin esa rama, la baja era la única puerta abierta de la nómina');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('P394b · `config_set` no guarda una `claveExigidaDesde` mal escrita', () => {
  /* `mantConfigValorMal_`, la que llama la tarea `config_set`. Una fecha mal escrita se lee como vacía y no cierra nada: sin esto,
     «2026-12-9» quedaba escrito y nadie lo notaba (verificador de P394b). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394bMundo('');
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const mal = v => !!w.api.mantConfigValorMal_('claveExigidaDesde', v);
  PRUEBAS.igual(['2026-12-9', '2026-02-31', '09/12/2026', '2026-12-09T00:00'].map(mal), [true, true, true, true], 'las mal escritas se rechazan');
  PRUEBAS.igual(['2026-12-09', '', '  '].map(mal), [false, false, false], 'la buena y la vacía (que apaga la exigencia) se aceptan');
  PRUEBAS.igual(mal.call(null, 'cualquier cosa') && !w.api.mantConfigValorMal_('altaAbierta', 'cualquier cosa'), true, 'y sólo mira esa clave');
  /* Segunda vuelta del verificador, 5 · con una empresa respondía `ok` y nadie la leía: `claveExigidaDesde_` lee sólo la general. */
  PRUEBAS.igual([!!w.api.mantConfigValorMal_('claveExigidaDesde', '2026-12-09', 'Helitec'), !!w.api.mantConfigValorMal_('claveExigidaDesde', '2026-12-09', '')],
    [true, false], 'y va SÓLO en la fila general: con una empresa, se rechaza');
});

/* ══ SEGUNDA VUELTA DEL VERIFICADOR (2026-11-25) · lo que rompían los arreglos de la primera ══════════════════════════════════ */
const P394B_CRED_CAB = ['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo', 'Rol', 'Estado', 'Creada', 'UltimoAcceso'];

PRUEBAS.caso('🔒 P394b · la contraseña se pide donde están los datos que se entregan: quien se cambió de empresa no queda abierto (2ª vuelta, 1)', () => {
  /* R19 · lo que lo NIEGA: `accionEmpleado` busca la credencial en la empresa del PEDIDO, la misma que recorta los datos. La primera
     versión del arreglo la buscaba en la empresa de la NÓMINA: a Pedro, con su contraseña en Helitec, dado de baja ahí y cargado activo
     en Nueva SA, se le leían los registros de Helitec sin ella. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const C = '45454545', P = 'Pedro Movido';
  const tests = [['2026-11-18', '10:41', P, 6, 2, '', 'Helitec'], ['2026-11-21', '10:41', P, 4, 1, '', 'Nueva SA']];
  const registrados = [p394aReg(P, C, 'Helitec')];
  const w1 = p394bMundo('2026-12-09', null, { tests, registrados, nomina: [p394aNomina('Helitec', P, C)] });
  if (w1.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(w1.cred({ empresa: 'Helitec', cedula: C, usuario: P, pass: 'LaDePedro2026' }).ok, true, 'precondición · activo en Helitec, creó la suya');
  const credFilas = w1.filasDe('Credenciales');
  /* Después Helitec lo dio de baja (P172) y Nueva SA lo cargó activo; su contraseña sigue en Helitec. */
  const fase2 = cambios => p394bMundo('2026-12-09', cambios, { tests, registrados,
    nomina: [p394aNomina('Helitec', P, C).concat(['Baja']), p394aNomina('Nueva SA', P, C)], hojas: { 'Credenciales': [P394B_CRED_CAB].concat(credFilas) } });
  const r = fase2(null).emp({ persona: P, cedula: C, empresa: 'Helitec' });
  PRUEBAS.igual([r.ok, r.motivo, (r.registros || []).length], [false, 'necesita_clave', 0], '🔒 con la empresa vieja, sin su contraseña no salen sus registros');
  /* DISCRIMINADOR · con la contraseña buscada en la empresa de la nómina (la primera versión del arreglo), salían. */
  const s = fase2(P394B_CRED_DE_LA_NOMINA);
  if (!s.faltan) { const x = s.emp({ persona: P, cedula: C, empresa: 'Helitec' });
    PRUEBAS.cierto(x.ok === true && (x.registros || []).length > 0, '⚠️ discriminador · buscada en la empresa de la nómina, salían sin ella: ' + JSON.stringify([x.ok, x.motivo])); }
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · un nombre de OTRA nómina con la misma cédula no le crea la contraseña a la dueña (2ª vuelta, 2)', () => {
  /* R19 · lo que lo NIEGA: `credNombreDeLaPersona_` acepta los nombres de esa cédula EN ESA EMPRESA, no el índice global del padrón.
     La segunda versión del arreglo usaba el resolutor, cuyo índice por nombre no mira la empresa (`P417`): con una fila de otra nómina
     con la cédula de Rosa, el nombre que eligiera quien la escribió le creaba la contraseña a Rosa y se quedaba con su cuenta. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const [rosa, cedR] = P394B.rosa;
  const mas = { nomina: [p394aNomina('Otra Nomina SA', 'Bruno Infiltrado', cedR)] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  w.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Bruno Infiltrado', pass: 'ClaveLarga2026' });
  const deHelitec = w.filasDe('Credenciales').filter(f => String(f[0]) === 'Helitec' && String(f[1]).replace(/\D/g, '') === cedR).length;
  PRUEBAS.igual(deHelitec, 0, '🔒 no queda ninguna contraseña de Helitec para la cédula de Rosa');
  PRUEBAS.igual(w.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec' }).motivo, 'crear_clave', 'y a Rosa se le sigue pidiendo crear la suya (no le piden la de otro)');
  /* DISCRIMINADOR · con el nombre por el padrón (la segunda versión), se creaba en Helitec y Rosa quedaba con `necesita_clave`. */
  const s = p394bMundo('2026-11-25', P394B_NOMBRE_POR_PADRON, mas);
  if (!s.faltan) { s.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Bruno Infiltrado', pass: 'ClaveLarga2026' });
    PRUEBAS.igual(s.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec' }).motivo, 'necesita_clave', '⚠️ discriminador · por el padrón, la cuenta de Rosa quedaba tomada'); }
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('P394b · la baja de OTRA empresa no le cierra los datos a quien se cambió (2ª vuelta, 3)', () => {
  /* R19 · lo que lo CONCEDE: la baja se mira en la empresa del pedido, y la de otra nómina sólo si la persona nunca se registró con la
     del pedido (`regConEmpresa_`: una empresa inventada). La primera versión miraba cualquier empresa: a Pedro, dado de baja en Helitec
     y hoy registrado en «Otra SA» (que no está en `Accesos` en este mundo), le contestaba `baja` y no le daba nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const C = '45454545', P = 'Pedro Movido';
  const mas = { nomina: [p394aNomina('Helitec', P, C).concat(['Baja'])], registrados: [p394aReg(P, C, 'Otra SA')],
                tests: [['2026-11-20', '10:44', P, 5, 2, '', 'Otra SA']] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(p394bVe(w.emp({ persona: P, cedula: C, empresa: 'Otra SA' })), [true, 1], 'pasada la fecha, recibe lo de su empresa actual');
  const s = p394bMundo('2026-11-25', P394B_BAJA_CUALQUIERA, mas);
  if (!s.faltan) PRUEBAS.igual(s.emp({ persona: P, cedula: C, empresa: 'Otra SA' }).motivo, 'baja', '⚠️ discriminador · con la baja de cualquier empresa, se quedaba sin nada');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · el freno de `credencial_crear` no dice qué cédulas están en una nómina (2ª vuelta, 4)', () => {
  /* R19 · lo que lo NIEGA: la clave del freno es la cédula sola (`__altacred__|` + cédula). Con la empresa en la clave (y la empresa
     resuelta por la nómina, en la segunda versión) 60 fallos frenaban la cédula sólo si estaba en una nómina, y una sonda con otra
     empresa inventada lo decía; y aun sin eso, cambiar el nombre de la empresa daba un contador nuevo para seguir probando nombres. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const probar = (cambios, ced) => {
    const w = p394bMundo('2026-12-09', cambios);
    if (w.faltan) return null;
    for (let i = 0; i < 60; i++) w.cred({ empresa: 'Basura Uno', cedula: ced, usuario: 'Nadie ' + i, pass: 'ClaveLarga2026', dispositivoId: 'disp-' + (i % 12) });
    return w.cred({ empresa: 'Basura Dos', cedula: ced, usuario: 'Nadie X', pass: 'ClaveLarga2026', dispositivoId: 'sonda' }).motivo;
  };
  const enNomina = probar(null, P394B.rosa[1]), fuera = probar(null, '10101010');
  PRUEBAS.igual([enNomina, fuera], ['frenado', 'frenado'], '🔒 la sonda (con OTRA empresa) queda frenada, esté o no la cédula: sin oráculo y sin contador nuevo');
  const sEn = probar(P394B_FRENO_CON_EMPRESA, P394B.rosa[1]);
  if (sEn) PRUEBAS.cierto(sEn !== 'frenado', '⚠️ discriminador · con la empresa en la clave, otra empresa daba un contador nuevo: ' + sEn);
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

/* ══ TERCERA VUELTA DEL VERIFICADOR (2026-11-25) · la contraseña siempre en la empresa del pedido ════════════════════════════ */

PRUEBAS.caso('🔒 P394b · con una empresa fuera de `Accesos`, quien tiene su contraseña ahí y se cambió de empresa no queda abierto (3ª vuelta, 1)', () => {
  /* R19 · lo que lo NIEGA: la contraseña se busca en la empresa del pedido. La segunda versión, con una empresa fuera de `Accesos` (como
     El Marino en producción), la buscaba en la de la nómina donde la cédula está activa: a Pedro, con su contraseña en El Marino y hoy
     activo en Nueva SA, se le leían sus tests de El Marino sin ella. Era una regresión contra la GS publicada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const C = '45454545', P = 'Pedro Movido';
  const tests = [['2026-11-18', '10:41', P, 6, 2, '', 'El Marino'], ['2026-11-19', '10:41', P, 7, 3, '', 'El Marino']];
  const registrados = [p394aReg(P, C, 'El Marino')];
  const w1 = p394bMundo('2026-12-09', null, { tests, registrados, nomina: [p394aNomina('El Marino', P, C)] });
  if (w1.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(w1.cred({ empresa: 'El Marino', cedula: C, usuario: P, pass: 'LaDePedro2026' }).ok, true, 'precondición · creó la suya en El Marino');
  const credFilas = w1.filasDe('Credenciales');
  const fase2 = cambios => p394bMundo('2026-12-09', cambios, { tests, registrados,
    nomina: [p394aNomina('El Marino', P, C).concat(['Baja']), p394aNomina('Nueva SA', P, C)], hojas: { 'Credenciales': [P394B_CRED_CAB].concat(credFilas) } });
  const r = fase2(null).emp({ persona: P, cedula: C, empresa: 'El Marino' });
  PRUEBAS.igual([r.ok, r.motivo, (r.registros || []).length], [false, 'necesita_clave', 0], '🔒 sin su contraseña, nada de El Marino');
  const s = fase2(P394B_CRED_DE_LA_NOMINA);
  if (!s.faltan) PRUEBAS.cierto((s.emp({ persona: P, cedula: C, empresa: 'El Marino' }).registros || []).length > 0,
    '⚠️ discriminador · buscada en la empresa de la nómina, salían sus tests sin ella');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · con «-», la credencial de OTRA nómina con la misma cédula no abre los datos de nadie (3ª vuelta, 2)', () => {
  /* R19 · lo que lo NIEGA: sin empresa, `empleado` no entrega nada. Con «-» el filtro no recorta por empresa, y una credencial creada
     en otra nómina que tuviera la cédula de Rosa (otra persona, `P417`) abría los tests de Rosa de Helitec. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const [rosa, cedR] = P394B.rosa;
  const mas = { nomina: [p394aNomina('Otra Nomina SA', 'Bruno Infiltrado', cedR)], registrados: [p394aReg('Bruno Infiltrado', cedR, 'Otra Nomina SA')] };
  const armar = cambios => {
    const w = p394bMundo('2026-11-25', cambios, mas);
    if (w.faltan) return null;
    w.cred({ empresa: 'Otra Nomina SA', cedula: cedR, usuario: 'Bruno Infiltrado', pass: 'ClaveDelOtro2026' });
    const lg = w.login({ empresa: 'Otra Nomina SA', cedula: cedR, pass: 'ClaveDelOtro2026', _post: true, dispositivoId: 'otro' });
    return { w, ses: lg.sesion };
  };
  const a = armar(null);
  if (!a) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.cierto(!!a.ses, 'precondición · el de la otra nómina creó la suya y entró');
  const conGuion = a.w.emp({ persona: rosa, cedula: cedR, empresa: '-', pass: a.ses, dispositivoId: 'otro' });
  PRUEBAS.igual((conGuion.registros || []).length, 0, '🔒 con «-» y su sesión, nada de Rosa');
  const conGuionClave = a.w.emp({ persona: rosa, cedula: cedR, empresa: '-', pass: 'ClaveDelOtro2026', dispositivoId: 'otro' });
  PRUEBAS.igual((conGuionClave.registros || []).length, 0, '🔒 ni con su contraseña');
  PRUEBAS.igual(a.w.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec' }).motivo, 'crear_clave', 'y a Rosa se le sigue pidiendo crear la suya');
  const s = armar(P394B_SIN_EMPRESA_VACIA);
  if (s) PRUEBAS.cierto((s.w.emp({ persona: rosa, cedula: cedR, empresa: '-', pass: 'ClaveDelOtro2026', dispositivoId: 'otro' }).registros || []).length > 0,
    '⚠️ discriminador · sin el corte de la empresa vacía, la contraseña de otra nómina abría los tests de Rosa (con «-», `credVerificar` busca en cualquiera)');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('P394b · de baja en la empresa del pedido y activa en otra: se le dice `baja`, no se le pide algo que no puede hacer (3ª vuelta, 3)', () => {
  /* R19 · lo que lo CONCEDE: `accionEmpleado` mira la baja de la empresa del pedido ANTES que las otras nóminas. Con la puerta primero,
     a quien tenía «El Marino» (fuera de `Accesos`) en el perfil, dado de baja ahí y activo en Nueva SA, se le pedía crearla en cada
     apertura y `credencial_crear` contestaba `no_esta`, para siempre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const C = '45454545', P = 'Pedro Movido';
  const mas = { tests: [['2026-11-20', '10:44', P, 5, 2, '', 'El Marino']], registrados: [p394aReg(P, C, 'El Marino')],
                nomina: [p394aNomina('El Marino', P, C).concat(['Baja']), p394aNomina('Nueva SA', P, C)] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  const r = w.emp({ persona: P, cedula: C, empresa: 'El Marino' });
  PRUEBAS.igual([r.ok, r.motivo], [false, 'baja'], 'pasada la fecha, `baja`: es lo que puede resolver (con su empresa actual)');
  const antes = p394bMundo('2026-12-09', null, mas);
  PRUEBAS.igual('clave' in antes.emp({ persona: P, cedula: C, empresa: 'El Marino' }), false, 'y antes de la fecha no se le pide crearla');
  const s = p394bMundo('2026-11-25', P394B_PUERTA_ANTES_QUE_BAJA, mas);
  if (!s.faltan) PRUEBAS.igual(s.emp({ persona: P, cedula: C, empresa: 'El Marino' }).motivo, 'crear_clave',
    '⚠️ discriminador · con la puerta primero, se le pedía crearla y no podía');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · de baja en todas sus nóminas, una empresa inventada no abre sus resultados (3ª vuelta, 4)', () => {
  /* R19 · lo que lo NIEGA: con una empresa que no está en `Accesos` y con la que la persona nunca se registró (`regConEmpresa_`), la
     baja de cualquier nómina. Con «Basura Inventada» salía su test sin empresa, pasada la fecha. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const baja = ['Baja Persona', '45454545'];
  /* Un test guardado con una variante («Helitec Venezuela») con la que NO se registró: es lo que una empresa inventada puede abrir. */
  const mas = { nomina: [p394aNomina('Helitec', ...baja).concat(['Baja'])], registrados: [p394aReg(...baja, 'Helitec')],
                tests: [['2026-11-20', '10:44', 'Baja Persona', 5, 2, '', 'Helitec Venezuela']] };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(w.emp({ persona: baja[0], cedula: baja[1], empresa: 'Basura Inventada' }).motivo, 'baja', '🔒 con una empresa inventada, `baja`');
  PRUEBAS.igual(w.emp({ persona: baja[0], cedula: baja[1], empresa: 'Helitec Venezuela' }).motivo, 'baja', '🔒 y con una variante con la que nunca se registró, también');
  const s = p394bMundo('2026-11-25', P394B_SIN_BAJA, mas);
  if (!s.faltan) PRUEBAS.cierto((s.emp({ persona: baja[0], cedula: baja[1], empresa: 'Helitec Venezuela' }).registros || []).length > 0,
    '⚠️ discriminador · sin esa rama, la variante abría lo guardado con ella');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · el login lee lo mismo esté o no la cédula en una nómina (3ª vuelta, 5)', () => {
  /* R19 · lo que lo NIEGA: `accionLogin` busca en la empresa del pedido, como la GS publicada. La segunda versión, con una empresa fuera
     de `Accesos`, la buscaba en la de la nómina: la cantidad de lecturas de `Credenciales` decía si la cédula estaba en alguna. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const orig = GS.HojaFalsa.prototype.getDataRange;
  const medir = (cambios, ced) => {
    const w = p394bMundo('2026-12-09', cambios);
    if (w.faltan) return null;
    const lecturas = {};
    GS.HojaFalsa.prototype.getDataRange = function () { const n = this.getName(); lecturas[n] = (lecturas[n] || 0) + 1; return orig.apply(this, arguments); };
    try { const r = w.login({ empresa: 'Basura 7', cedula: ced, pass: 'NoEsLaSuya2026', _post: true, dispositivoId: 'sonda' });
          return [r.motivo, Object.keys(lecturas).sort().map(k => k + '×' + lecturas[k]).join(',')]; }
    finally { GS.HojaFalsa.prototype.getDataRange = orig; }
  };
  try {
    PRUEBAS.igual(medir(null, P394B.rosa[1]), medir(null, '10101010'), '🔒 mismo motivo y mismas lecturas');
    const a = medir(P394B_LOGIN_POR_NOMINA, P394B.rosa[1]), b = medir(P394B_LOGIN_POR_NOMINA, '10101010');
    if (a && b) PRUEBAS.cierto(a[1] !== b[1], '⚠️ discriminador · con el login por la nómina, las lecturas lo decían: ' + a[1] + ' contra ' + b[1]);
    else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
  } finally { GS.HojaFalsa.prototype.getDataRange = orig; }
});

/* ══ CUARTA VUELTA DEL VERIFICADOR (2026-11-26) ═════════════════════════════════════════════════════════════════════════════════ */
const P394B_IDENT_CAB = ['Variante', 'Empresa', 'Cedula', 'ResueltoPor', 'Como', 'Registros', 'PrimeraVez', 'UltimaVez'];

PRUEBAS.caso('🔒 P394b · una variante de `Identidades` afirmada para OTRA empresa no crea la contraseña de la dueña (4ª vuelta, 1)', () => {
  /* R19 · lo que lo NIEGA: `credNombreDeLaPersona_` acepta de `Identidades` sólo las variantes de ESA empresa o las afirmadas SIN
     empresa (`porNombreSinEmpresa`). Con `porNombre`, que trae también las de otras empresas, una fila manual «Bruno Infiltrado | Otra
     Nomina SA | la cédula de Rosa» le creaba la contraseña de Helitec a Bruno, que entraba y leía los tests de Rosa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const [rosa, cedR] = P394B.rosa;
  const mas = { nomina: [p394aNomina('Otra Nomina SA', 'Bruno Infiltrado', cedR)],
                hojas: { 'Identidades': [P394B_IDENT_CAB, ['Bruno Infiltrado', 'Otra Nomina SA', cedR, 'manual', '', '', '', '']] } };
  const deHelitec = w => w.filasDe('Credenciales').filter(f => String(f[0]) === 'Helitec' && String(f[1]).replace(/\D/g, '') === cedR).length;
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  PRUEBAS.igual(w.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Bruno Infiltrado', pass: 'ClaveLarga2026' }).motivo, 'no_esta', '🔒 con la variante de otra empresa, no se crea');
  PRUEBAS.igual([deHelitec(w), w.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec' }).motivo], [0, 'crear_clave'], 'y a Rosa se le sigue pidiendo crear la suya');
  /* CONTROL · una afirmación humana SIN empresa (una variante del nombre de Rosa) sí sirve: el lector también la reconoce. */
  const w2 = p394bMundo('2026-11-25', null, { hojas: { 'Identidades': [P394B_IDENT_CAB, ['Rosita Mena', '', cedR, 'manual', '', '', '', '']] } });
  if (!w2.faltan) PRUEBAS.igual(w2.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Rosita Mena', pass: 'ClaveLarga2026' }).ok, true, 'CONTROL · sin empresa, la variante afirmada a mano crea la suya');
  /* DISCRIMINADOR · con `porNombre`, Bruno la creaba. */
  const s = p394bMundo('2026-11-25', P394B_IDENT_CUALQUIER_EMPRESA, mas);
  if (!s.faltan) { s.cred({ empresa: 'Helitec', cedula: cedR, usuario: 'Bruno Infiltrado', pass: 'ClaveLarga2026' });
    PRUEBAS.igual(deHelitec(s), 1, '⚠️ discriminador · con `porNombre`, la variante de otra empresa le creaba a Bruno la contraseña de Helitec'); }
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});

PRUEBAS.caso('🔒 P394b · con una empresa de `Accesos` que no la lista, no salen las filas sin empresa (4ª vuelta, 2)', () => {
  /* R19 · lo que lo NIEGA: `soloConEmpresa` en `accionEmpleado` (con una empresa de `Accesos` que no la lista y la cédula activa en
     otra nómina, `esMio` no toma las filas sin empresa). Antes, con nombre, cédula y CUALQUIER otra empresa de `Accesos`, salían las
     filas viejas sin empresa: también las de quien tiene contraseña. Igual que en la GS publicada: no era regresión, pero hacía falsa la
     promesa de la ADR 023. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const [rosa, cedR] = P394B.rosa, [luis, cedL] = P394B.luis;
  const accesos = p391Hojas({ tests: [] })['Accesos'].concat([['clinica', 'sup-cn', 'supervisor', 'Clinica Norte', '', '', '']]);
  const mas = { tests: [['2026-11-21', '10:41', rosa, 7, 3, '', null], ['2026-11-21', '10:42', luis, 7, 3, '', null]], hojas: { 'Accesos': accesos } };
  const w = p394bMundo('2026-11-25', null, mas);
  if (w.faltan) { PRUEBAS.cierto(false, 'guarda: el mundo se armó'); return; }
  w.cred({ empresa: 'Helitec', cedula: cedL, usuario: luis, pass: 'ClaveLarga2026' });
  const rClin = w.emp({ persona: rosa, cedula: cedR, empresa: 'Clinica Norte' }), lClin = w.emp({ persona: luis, cedula: cedL, empresa: 'Clinica Norte' });
  PRUEBAS.igual([(rClin.registros || []).length, (lClin.registros || []).length], [0, 0], '🔒 con otra empresa de `Accesos`, ni la fila sin empresa de Rosa ni la de Luis');
  /* CONTROL · con su empresa, antes de la fecha, Rosa sigue viendo también su fila sin empresa: el filtro no le saca nada a ella. */
  const antes = p394bMundo('2026-12-09', null, mas);
  if (!antes.faltan) PRUEBAS.igual(p394bVe(antes.emp({ persona: rosa, cedula: cedR, empresa: 'Helitec' })), [true, 2], 'CONTROL · con Helitec, sus dos filas');
  const s = p394bMundo('2026-11-25', P394B_SIN_SOLO_CON_EMPRESA, mas);
  if (!s.faltan) PRUEBAS.igual((s.emp({ persona: rosa, cedula: cedR, empresa: 'Clinica Norte' }).registros || []).length, 1,
    '⚠️ discriminador · sin el filtro, con otra empresa de `Accesos` salía su fila sin empresa');
  else PRUEBAS.cierto(false, 'guarda: el sabotaje entró');
});
