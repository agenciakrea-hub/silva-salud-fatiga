
PRUEBAS.grupo('P104 · tres hojas del CH que guardaban mal y nadie lo notaba');

/* Los tres tienen el mismo perfil: escriben algo distinto de lo que su lector espera, y el
   síntoma no se parece a un error.
   · `Casos Odoo` — el `setNumberFormat("@")` estaba DENTRO de dos `if`, así que sólo corría al
     crear la hoja o al migrarle una columna: nunca para una hoja que ya existía y estaba
     completa, o sea el 100% de los accesos reales. Es la hoja que Odoo usa para deduplicar.
   · `Informes` — la columna Fecha está forzada a texto y se le escribía un objeto `Date`. Al leer,
     `Number("Sat Sep 05 2026…")` da NaN, la guarda lo descarta, y el LÍMITE DE UN INFORME POR DÍA
     dejaba de funcionar. Un informe de más no parece un error.
   · `Identidades` — la columna se llamaba `NombreCanonico` y guardaba "manual"/"exacto". Es la
     hoja que un humano abre para corregir identidades a mano. */

function p104Env(extra){
  return GS.crearEntorno(Object.assign({
    'Informes':    [["Empresa","Fecha","Informe","ID"]],
    'Casos Odoo':  [["Fecha","Persona","Empresa","Departamento","Cargo","Telefono","Correo","NivelRiesgo",
                     "Severidad","Motivo","Indicadores","Confiabilidad","OrigenApp","IdCaso","Procesado","RefOdoo","Valores"]],
    'Identidades': [["Variante","Empresa","Cedula","NombreCanonico","Como","Registros","PrimeraVez","UltimaVez"],
                    ["ana suarez","Helitec","V-1","exacto","exacto","3","01/09/2026 10:00","01/09/2026 10:00"]],
  }, extra || {}));
}

/* ══════════ Casos Odoo ══════════ */

PRUEBAS.caso('⚠️ Casos Odoo recibe el formato texto AUNQUE la hoja ya exista', () => {
  /* El caso que faltaba. La hoja del arnés ya existe y ya tiene sus 17 columnas — o sea que entra
     por el camino que ANTES no aplicaba nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const env = p104Env();
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaCasosOdoo']);
  api.obtenerHojaCasosOdoo();
  const hoja = env.__libro.getSheetByName('Casos Odoo');
  PRUEBAS.igual(hoja.__formatoDe(2, 1), '@', '⚠️ la columna Fecha, que es con la que Odoo deduplica');
  PRUEBAS.igual(hoja.__formatoDe(2, 6), '@', 'y la del Teléfono, que puede empezar con +');
});

PRUEBAS.caso('el DISCRIMINADOR: el emulador SÍ registra los formatos', () => {
  /* Sin esto, el caso de arriba daría verde aunque el endpoint no aplicara nada: una hoja recién
     creada devuelve null y `igual(null, '@')` fallaría — pero si el emulador ignorara
     `setNumberFormat`, TODO daría null y el caso fallaría por la razón equivocada. */
  const env = p104Env();
  const hoja = env.__libro.getSheetByName('Casos Odoo');
  PRUEBAS.igual(hoja.__formatoDe(2, 1), null, 'antes de tocarla, sin formato');
  hoja.getRange(2, 1).setNumberFormat('@');
  PRUEBAS.igual(hoja.__formatoDe(2, 1), '@', 'y después sí — o sea que la medición discrimina');
});

/* ══════════ Informes ══════════ */

PRUEBAS.caso('⚠️ EL CONTRATO: un informe escrito se puede volver a encontrar', () => {
  /* R17. Los dos lados existían: la escritura ponía la fila y la lectura recorría la hoja. Lo que
     nadie probó es que la fecha sobreviviera al viaje. No sobrevivía, y el efecto era que el
     límite de un informe por día dejaba de aplicarse. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p104Env();
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaInformes', 'ultimoInforme', 'formatoIsoLocal_']);
  const sh = api.obtenerHojaInformes();
  /* Se escribe EXACTAMENTE como lo hace `generarInforme`: con `formatoIsoLocal_`. */
  sh.appendRow(['helitec', api.formatoIsoLocal_(Date.now()), 'texto del informe', 'INF_1']);
  const u = api.ultimoInforme(sh, 'helitec');
  PRUEBAS.cierto(!!u, '⚠️ el informe recién escrito TIENE que encontrarse');
  if (!u) return;
  PRUEBAS.alMenos(u.ts, 1, 'y con una fecha usable, que es lo que sostiene el límite diario');
  PRUEBAS.igual(u.texto, 'texto del informe', 'y su texto');
});

PRUEBAS.caso('el DISCRIMINADOR: la fecha vieja (un Date) SÍ se perdía', () => {
  /* Se escribe la fila como la escribía el código viejo —un objeto Date en una columna de texto,
     que Sheets guarda como "Sat Sep…"— y se confirma que la lectura no la encuentra o le da una
     fecha inservible. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p104Env();
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaInformes', 'ultimoInforme']);
  const sh = api.obtenerHojaInformes();
  sh.appendRow(['helitec', String(new Date()), 'informe viejo', 'INF_0']);
  const u = api.ultimoInforme(sh, 'helitec');
  /* Lo que se comprueba es el MECANISMO del defecto: el código viejo hacía `Number(celda)` sobre
     ese texto, y eso da NaN. La guarda `if (ts && …)` lo descartaba, `best` quedaba null, y el
     límite de un informe por día dejaba de aplicarse.
     ⚠️ NO se afirma que la fila vieja se rescate. Lo probé y NO se rescata: `fechaReporteAEpoch_`
     no reconoce el formato largo de `String(new Date())`. El arreglo previene lo que venga, no
     repara lo escrito — y las filas viejas del historial no se reescriben porque son evidencia.
     Escribirlo acá para no volver a suponerlo. */
  PRUEBAS.cierto(isNaN(Number(String(new Date()))),
    '⚠️ Number() sobre esa fecha da NaN — así se perdía el límite diario');
  /* Y se deja anotado el comportamiento REAL con una fila vieja, medido, sea cual sea: si mañana
     alguien mejora `fechaReporteAEpoch_` para reconocer ese formato, este caso lo va a decir. */
  PRUEBAS.cierto(u === null || (u && typeof u.ts === 'number'),
    'con una fila vieja devuelve null o una fecha usable, nunca algo a medias — hoy: ' +
    (u === null ? 'null (no la rescata)' : 'ts=' + u.ts));
});

PRUEBAS.caso('⚠️ dos informes el mismo día: el segundo encuentra al primero', () => {
  /* Es el efecto que importa: sin fecha legible, el segundo pedido no ve al primero y se genera
     un informe de más — que además cuesta una llamada a la IA. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p104Env();
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaInformes', 'ultimoInforme', 'formatoIsoLocal_']);
  const sh = api.obtenerHojaInformes();
  sh.appendRow(['helitec', api.formatoIsoLocal_(Date.now() - 3600000), 'primero', 'INF_1']);
  const u = api.ultimoInforme(sh, 'helitec');
  PRUEBAS.cierto(!!u && u.ts > 0, '⚠️ el de hace una hora se encuentra: el límite puede aplicarse');
});

/* ══════════ Identidades ══════════ */

PRUEBAS.caso('⚠️ la columna dice lo que de verdad guarda', () => {
  /* Es la hoja que un humano abre para corregir identidades de personas a mano. Un encabezado que
     miente ahí es peor que en cualquier otra. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const fuente = CTX.gs.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  PRUEBAS.falso(/["']NombreCanonico["']/.test(fuente),
    '⚠️ ya no se llama NombreCanonico: nunca guardó un nombre');
  PRUEBAS.cierto(/["']ResueltoPor["']/.test(fuente), 'ahora dice cómo se resolvió, que es lo que hay ahí');
});

PRUEBAS.caso('⚠️ y el encabezado se corrige en la hoja que YA existe', () => {
  /* La rama `if (!sh)` no corre para una hoja existente, así que sin esto el renombre no llegaría
     nunca a la planilla de producción — que es la única que un humano abre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p104Env();
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaIdentidades']);
  api.obtenerHojaIdentidades();
  const cab = env.__libro.getSheetByName('Identidades').getDataRange().getValues()[0];
  PRUEBAS.igual(cab[3], 'ResueltoPor', '⚠️ el encabezado viejo se reemplazó');
  const fila = env.__libro.getSheetByName('Identidades').getDataRange().getValues()[1];
  PRUEBAS.igual(fila[0], 'ana suarez', 'y ningún dato se movió');
  PRUEBAS.igual(fila[2], 'V-1', 'la cédula sigue en su lugar');
});
