/* ── La fecha del formulario · `normFecha` y el orden de los tests ──────────────────────────────
   (2026-10-03)

   NACE DEL INCIDENTE «cargaron información de hoy y no se ve». Encontrado a la tercera revisión,
   después de dos diagnósticos parciales.

   El formulario escribe la fecha en el formato largo de JavaScript —`"Sat Oct 03 2026 10:16:12
   GMT-0300 (hora estándar de Argentina)"`— y `normFecha` no lo reconocía: sus ramas cubren objetos
   `Date`, números de serie de Sheets y cadenas con `/ - .`. Devolvía **la cadena cruda**. De ahí
   salían dos daños:

   1 · `aptAutoServer` ordena los tests con `(a.fecha < b.fecha) ? 1 : -1` — comparación de
       CADENAS. Sobre `"yyyy-MM-dd"` es correcta; sobre esta forma ordena **alfabéticamente por el
       día de la semana**: `Wed` > `Tue` > `Thu` > `Sun` > `Sat` > `Mon` > `Fri`. Medido contra el
       CH real: **32 de 39 personas (82%)** tenían el «último test» equivocado, y con él su
       aptitud. Rafael Silva mostraba el del 12 de agosto cuando el último era del 25 de septiembre.
   2 · `aptDiasDesdeServer` devolvía `null`, así que `viejo = (dias != null && dias > 7)` era
       **siempre false**: nadie se marcaba como «medición vencida». Había personas con 37 y con 106
       días sin medir que el panel no señalaba.

   ⚠️ ALCANCE: **411 de 452 registros (91%)** llegaban sin normalizar — 103 de 103 en Aeroambulancias
   Silva, 253 de 253 en Empresa Demo, 6 de 12 en Consorcio HELITEC.

   ⚠️ Y EL ESCRITOR NO ES NUESTRO ENDPOINT. La app no manda fecha en los tests; la escribe el
   proyecto Apps Script que recibe cada uno (`SHEETS_ESTRES_URL`, `SHEETS_DEPRESION_URL`), que son
   proyectos distintos. Por eso el arreglo va en la LECTURA: es reversible y cubre lo ya escrito.

   ⚠️ R19 · cada derecho que se afirma acá nombra la función que lo concede. */

PRUEBAS.grupo('la fecha del formulario · normFecha y el orden de los tests');

/* ⚠️ LOS FORMATOS REALES, copiados del CH. El primero es el que el formulario escribe hoy; el
   segundo es el de las filas de 2022, que `normFecha` siempre entendió. R17. */
const P215E_JS  = 'Sat Oct 03 2026 10:16:12 GMT-0300 (hora estándar de Argentina)';
const P215E_JS2 = 'Thu Sep 24 2026 17:20:12 GMT-0300 (hora estándar de Argentina)';
const P215E_JS3 = 'Wed Sep 30 2026 12:24:28 GMT-0300 (hora estándar de Argentina)';

PRUEBAS.caso('🔴 `normFecha` entiende el formato largo de JavaScript', () => {
  /* EL DERECHO: la forma canónica de una fecha la fija `normFecha`, y todo el servidor la consume
     como `"yyyy-MM-dd"` — `aptFechaMsServer` la parsea así y `aptAutoServer` la ordena como cadena
     contando con eso. Una fecha que no pase por `normFecha` rompe las dos cosas a la vez. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
      'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['normFecha', 'aptDiasDesdeServer']);

  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(api.normFecha(P215E_JS), '2026-10-03',
    '🔴 la cadena larga de JS se normaliza a `yyyy-MM-dd`: antes volvía CRUDA');
  PRUEBAS.cierto(api.aptDiasDesdeServer(api.normFecha(P215E_JS)) !== null,
    '🔴 y ahora se le pueden contar los días: antes daba `null` y nadie se marcaba como vencido');

  /* LO QUE NO PUEDE CAMBIAR · los formatos que ya funcionaban */
  PRUEBAS.igual(api.normFecha('03/10/2026'), '2026-10-03', '🔴 NO PUEDE CAMBIAR · `dd/mm/yyyy`');
  PRUEBAS.igual(api.normFecha('2026-10-03'), '2026-10-03', '🔴 NO PUEDE CAMBIAR · ISO');
  PRUEBAS.igual(api.normFecha(''), '', '🔴 NO PUEDE CAMBIAR · la vacía sigue vacía');
  PRUEBAS.igual(api.normFecha('no es una fecha'), 'no es una fecha',
    '🔴 NO PUEDE CAMBIAR · lo que no es fecha se devuelve tal cual, sin inventar un día');
  /* ⚠️ EL BORDE QUE PROTEGE EL `isNaN`, y mi primera versión no lo medía: una cadena que SÍ matchea
     el regex (`\w{3} \w{3} \d{1,2} \d{4}`) pero que `new Date()` no puede parsear. Sin el `isNaN`,
     `Utilities.formatDate` recibiría un `Invalid Date` — y una fecha inventada es peor que una
     fecha cruda, porque la cruda al menos se nota. El mutante que le saca el `isNaN` pasaba en
     verde hasta que agregué esto. */
  PRUEBAS.igual(api.normFecha('Xyz Qrs 99 2026'), 'Xyz Qrs 99 2026',
    '🔴 NO PUEDE CAMBIAR · una cadena con la FORMA de fecha pero inválida vuelve cruda, no inventada');
});

PRUEBAS.caso('🔴 el ORDEN de los tests es por fecha real, no alfabético por día de la semana', () => {
  /* EL DERECHO: cuál es «el último test» de una persona lo decide `aptAutoServer`, que ordena
     `regs` y toma `rs[0]`. De ahí salen `ultimaFecha`, `dias`, las métricas que el panel muestra y
     el estado automático. Su orden es una comparación de CADENAS, y eso es correcto **sólo si**
     todas las fechas pasaron por `normFecha` — que es justo lo que no pasaba.
     ⚠️ Se mide por `aptAutoServer`, no comparando cadenas a mano: el defecto era que la función
     real recibía fechas que no venían de `normFecha`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
      'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['normFecha', 'aptAutoServer']);

  /* los tres tests de una persona, con las fechas pasadas por `normFecha` como hace `parseRegistros` */
  const reg = (f, kss) => ({ persona: 'ANA', fecha: api.normFecha(f), kss: kss,
    estres: null, ansiedad: null, gastro: null, depresion: null, cansancio: null, fatiga: null });
  /* ⚠️ EL ORDEN DE ENTRADA ES EL DE LA HOJA (viejo → nuevo), que es como llegan de
     `parseRegistros`. Si el caso los pasara ya ordenados, no mediría el orden. */
  const regs = [reg(P215E_JS2, 3), reg(P215E_JS3, 5), reg(P215E_JS, 9)];

  PRUEBAS.igual(regs[0].fecha, '2026-09-24', 'guarda: el primero de la hoja es el del 24 de septiembre');
  PRUEBAS.igual(regs[2].fecha, '2026-10-03', 'guarda: y el último, el de hoy');
  /* ⚠️ Y la guarda que importa: sin normalizar, el orden por cadena los pone al revés. Es el
     escenario exacto del defecto, y si algún día `normFecha` deja de convertir, esto lo delata. */
  const crudas = [P215E_JS2, P215E_JS3, P215E_JS].slice().sort((a, b) => (a < b) ? 1 : -1);
  PRUEBAS.igual(crudas[0].slice(0, 15), 'Wed Sep 30 2026',
    'guarda: SIN normalizar, el orden alfabético pone primero al del 30 de septiembre');

  const a = api.aptAutoServer('ANA', regs, [], 3, null, null);
  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(a.ultimaFecha, '2026-10-03',
    '🔴 `aptAutoServer` toma el test de HOY como el último, no el del 30 de septiembre');
  PRUEBAS.igual(a.dias, 0, '🔴 y cuenta 0 días: antes `dias` venía en `null`');
  PRUEBAS.falso(a.viejo, '🔴 y no lo marca como viejo, porque es de hoy');
});

PRUEBAS.caso('🔴 una medición VIEJA sí se marca como vieja', () => {
  /* EL DERECHO: `viejo` lo decide `aptAutoServer` con `dias > APT_DIAS_FRESCO_GS` (7).
     ⚠️ Esta es la otra mitad, y es la que estaba rota en silencio: con `dias` en `null`, la
     expresión `(dias != null && dias > 7)` era SIEMPRE false, así que el panel no marcaba a nadie.
     Medido contra el CH real: había una persona con 106 días sin medir y otra con 37, y ninguna
     aparecía señalada. Un indicador que nunca se enciende se ve igual que «todos al día». */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
      'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['normFecha', 'aptAutoServer']);
  /* una fecha de hace 40 días, construida desde hoy para que el caso no caduque */
  const d = new Date(Date.now() - 40 * 86400000);
  const DIAS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const z = n => String(n).padStart(2, '0');
  const larga = DIAS[d.getDay()] + ' ' + MES[d.getMonth()] + ' ' + z(d.getDate()) + ' ' + d.getFullYear()
    + ' 10:00:00 GMT-0300 (hora estándar de Argentina)';

  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(api.normFecha(larga)),
    'guarda: la fecha de hace 40 días, en formato largo, se normaliza');
  const a = api.aptAutoServer('ANA', [{ persona: 'ANA', fecha: api.normFecha(larga), kss: 3,
    estres: null, ansiedad: null, gastro: null, depresion: null, cansancio: null, fatiga: null }], [], 3, null, null);
  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.alMenos(a.dias, 39, '🔴 cuenta ~40 días: antes `dias` era `null`');
  PRUEBAS.cierto(a.viejo === true,
    '🔴 y la marca como VIEJA: con `dias` en null, `viejo` era siempre false y nadie se señalaba');
});
