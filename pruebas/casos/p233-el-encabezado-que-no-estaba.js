/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P233 · EL ENCABEZADO QUE NO ESTABA                                      (2026-10-07)

   LO ENCONTRÓ PRODUCCIÓN, NO LAS 14 RONDAS DE P226. Al verificar el estado del CH después de la
   migración apareció que la hoja `Asignaciones` tenía los datos de **Oscar Martinez en la fila 1**,
   donde va el encabezado. Y todos los lectores del endpoint recorren `for (i = 1; ...)`, así que esa
   fila **no se lee nunca**: el servidor había contestado `ok:true` y el panel contaba 0.

   LA CAUSA, medida: **22 de los 25 `obtenerHoja*` escriben el encabezado SÓLO dentro del
   `if (!sh)`**, o sea sólo cuando crean la hoja. Si la hoja ya existe vacía —la crea otra IA (el CH
   no es nuestro solo), una tarea de mantenimiento, o alguien a mano— nadie le pone encabezado y la
   primera escritura cae en la fila 1.

   POR QUÉ NINGÚN CASO LO VIO: los 109 de P226 arrancan con la hoja **inexistente**, que es el único
   estado donde el constructor sí escribe el encabezado. El estado «existe y está vacía» no se
   montaba en ninguna parte.

   ⚠️ Y EL ARREGLO OBVIO BORRA DATOS. `obtenerHojaIdentidades` —uno de los 2 que lo hacen bien— usa
   `getLastRow() <= 1`, y con UNA fila de datos eso da 1: escribiría el encabezado **encima** de
   Oscar Martinez. Al lado hay un comentario de P163 diciendo que reescribir la fila 1 ya «BORRABA LA
   EVIDENCIA» una vez. Por eso el encabezado se INSERTA arriba, nunca se sobrescribe.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ Reusa el fixture de P226 en vez de copiarlo: una copia se despega cuando el original cambia, y
   este archivo necesita exactamente las mismas cuentas y nómina para poder asignar. Si no está
   cargado, lo DICE en vez de pasar en verde. */
function p233Hay() {
  return typeof p226Api === 'function' && typeof p226Hoja === 'function' &&
         typeof p226Hojas === 'function' && typeof p226Alta === 'function';
}
/* ⚠️ `p233Sup()` ES UNA `const` Y NO CRUZA ARCHIVOS EN EL NAVEGADOR. En Node los casos corrieron en
   verde porque `vm.runInThisContext` comparte el scope léxico entre scripts; el panel evalúa cada
   archivo de casos aparte, así que `function p226Api` —que se iza— sí se ve y `const p233Sup()` no.
   Resultado: **3 casos daban verde en Node y `p233Sup() is not defined` en el navegador**, que es el
   instrumento que manda.
   La cuenta se deriva del MISMO fixture en vez de copiarla: una copia se despega cuando el fixture
   cambie, y este archivo necesita exactamente ese supervisor para poder escribir. */
function p233Sup() {
  if (typeof P226_SUP !== 'undefined') return P226_SUP;
  const fila = (p226Hojas()['Accesos'] || [])[1] || [];
  return { usuario: String(fila[0] || ''), pass: String(fila[1] || ''),
           empresa: String(fila[3] || '').split(',')[0].trim(), dispositivoId: 'p233' };
}
function p233Fila1(api, hojaCual) {
  const sh = api.__env.__libro.getSheetByName(p226Hoja(hojaCual));
  if (!sh) return null;
  const v = sh.getDataRange().getValues();
  return { filas: v.length, primera: v[0] || [], todas: v };
}

PRUEBAS.caso('🔴 P233-1 · una hoja que ya existe VACÍA recibe su encabezado, y la persona se ve', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL ESTADO QUE PASÓ EN PRODUCCIÓN. `Asignaciones` existía vacía, y medido en el emulador:
     `asignar` contestaba `ok:true, vigente:true` y el lector contaba **0**. Es el defecto raíz de
     P226 —escritor y lector que derivan distinto— por una puerta que ningún caso tocaba.
     El derecho lo concede `obtenerHojaAsignaciones`, que es quien tiene que asegurar el encabezado. */
  const api = p226Api();
  api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));        // existe, vacía, sin encabezado
  p226Alta(api, p233Sup(), 'Cardón IV');
  const r = p226Asignar(api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  PRUEBAS.igual(r.ok, true, 'el alta de la asignación entra');

  const h = p233Fila1(api, 'ASIGNACIONES');
  PRUEBAS.igual(String(h.primera[0]), 'Empresa',
    '⚠️ la fila 1 es el ENCABEZADO, no el dato · ' + JSON.stringify(h.primera.slice(0, 3)));
  PRUEBAS.igual(h.filas, 2, 'y la fila del dato quedó abajo · filas=' + h.filas);

  /* ⚠️ El invariante que de verdad importa: lo que el servidor contesta y lo que el lector ve. */
  const gente = (p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).map(g => g.persona);
  PRUEBAS.igual(!!r.vigente, gente.indexOf('Ana Suárez') >= 0,
    '⚠️ `vigente` coincide con estar en `gente` (en producción daba true contra 0)');
  PRUEBAS.igual(gente.length, 1, '⚠️ el panel cuenta la persona · gente=' + JSON.stringify(gente));
});

PRUEBAS.caso('🔴 P233-2 · un DATO en la fila 1 no se sobrescribe: el encabezado se INSERTA arriba', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL ESTADO REAL DEL CH AL 2026-10-07: una sola fila, la de Oscar Martinez, sin encabezado.
     Acá es donde el arreglo obvio destruye: `getLastRow()` devuelve 1, y escribir la fila 1 borraría
     la asignación. P163 ya lo documentó como pérdida de evidencia. */
  const DATO = ['Consorcio HELITEC', 'Cardón IV', 'Oscar Martinez', 'V-11111',
                '2026-10-06', '', 'activo', '2026-10-06T20:05:08', '', '', ''];
  const api = p226Api();
  const sh = api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh.appendRow(DATO.slice());
  p226Alta(api, p233Sup(), 'Cardón IV');

  /* ⚠️ MI PRIMERA VERSIÓN DISPARABA UNA LECTURA Y ESTABA MAL. Este repo tiene escrito
     «H8 · LEER NO CREA NI FORMATEA» y `accionOperaciones` lo respeta a propósito —el verificador de
     P226 lo midió—, así que una lectura NUNCA va a arreglar el encabezado. El camino real por el que
     esto se arregla es una ESCRITURA, y el caso tiene que entrar por ahí (R17). El límite que eso
     deja —el dato sigue invisible hasta la próxima escritura— está medido en `P233-5`. */
  p226Asignar(api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  const h = p233Fila1(api, 'ASIGNACIONES');
  PRUEBAS.igual(String(h.primera[0]), 'Empresa', '⚠️ la fila 1 pasó a ser el encabezado');
  PRUEBAS.igual(h.filas, 3, 'encabezado + el dato viejo + el nuevo · filas=' + h.filas);
  const oscar = h.todas.filter(f => String(f[2]) === 'Oscar Martinez')[0];
  PRUEBAS.cierto(!!oscar, '⚠️ EL DATO NO SE PERDIÓ: sigue estando');
  if (oscar) {
    PRUEBAS.igual(String(oscar[7]), '2026-10-06T20:05:08',
      '⚠️ ni se le tocó el sello `Creada`, que es lo que diría cuándo pasó de verdad');
    PRUEBAS.igual(String(oscar[4]), '2026-10-06', '⚠️ ni su `Desde`');
  }
  /* ⚠️ Y ahora el lector lo VE, que es el punto de todo esto. */
  const gente = (p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).map(g => g.persona);
  PRUEBAS.cierto(gente.indexOf('Oscar Martinez') >= 0,
    '⚠️ y el panel cuenta a quien estaba invisible · gente=' + JSON.stringify(gente));
});

PRUEBAS.caso('🔴 P233-3 · un encabezado RENOMBRADO o corrido NO se toca (P163)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL BORDE QUE P163 PAGÓ. Si alguien inserta una columna a mano, la fila 1 queda diciendo los
     nombres viejos sobre columnas corridas. Reescribirla con el `HEAD` canónico **borra la
     evidencia**: la planilla vuelve a parecer correcta y nadie puede notar que algo se movió.
     La regla: si la fila 1 **parece un encabezado** —alguna de sus celdas es exactamente un nombre
     de columna— se deja como está, aunque no coincida entera. Sólo se inserta cuando NINGUNA lo es,
     que es la firma de un dato. */
  const CORRIDO = ['Empresa', 'ColumnaNueva', 'Operacion', 'Persona', 'Cedula',
                   'Desde', 'Hasta', 'Estado', 'Creada', 'CreadaPor', 'Baja'];
  const api = p226Api();
  const sh = api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh.appendRow(CORRIDO.slice());
  p226Leer(api);
  const h = p233Fila1(api, 'ASIGNACIONES');
  PRUEBAS.igual(h.filas, 1, '⚠️ no se insertó nada: sigue habiendo UNA fila');
  PRUEBAS.igual(h.primera.map(String).join('|'), CORRIDO.join('|'),
    '⚠️ y la fila 1 quedó TAL CUAL, con la columna de más y los nombres donde estaban');
});

PRUEBAS.caso('🔴 P233-4 · los 25 constructores de hoja aseguran su encabezado, no sólo al crear', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ EL BARRIDO DE FORMA, porque el de comportamiento no alcanza: probar las 25 hojas por su
     camino real serían 25 fixtures, y el defecto es idéntico en todas. Acá se mide que ninguna
     escriba el encabezado **sólo** dentro del `if (!sh)`.
     Medido antes del arreglo: 22 de 25 lo hacían así. Los 2 que estaban bien —`CasosOdoo` e
     `Identidades`— son de donde sale el patrón. `Accesos` no crea la hoja y queda fuera.
     ⚠️ Con su guarda contra sí mismo: si el barrido deja de encontrar constructores, lo dice. */
  const sinComentarios = CTX.gs.replace(/\/\*[\s\S]*?\*\//g, '')
                               .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  const cuerpos = {};
  const re = /function (obtenerHoja[A-Za-z]*)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(sinComentarios))) {
    let i = m.index + m[0].length, prof = 1;
    while (i < sinComentarios.length && prof) {
      if (sinComentarios[i] === '{') prof++;
      else if (sinComentarios[i] === '}') prof--;
      i++;
    }
    cuerpos[m[1]] = sinComentarios.slice(m.index + m[0].length, i - 1);
  }
  const nombres = Object.keys(cuerpos);
  PRUEBAS.cierto(nombres.length >= 20,
    '⚠️ el barrido encontró ' + nombres.length + ' constructores: con menos de 20 no está leyendo ' +
    'el endpoint y este caso NO mide nada');

  /* ⚠️ RONDA 2 · EL BARRIDO ERA CIEGO PARA 6 DE LOS 24, y entre ellos `Suscripciones`, una de las
     dos hojas que de verdad se dañaron. El regex pedía que el `}` del `if (!sh)` estuviera en su
     propia línea; para los constructores escritos en UNA línea —`if (!sh) { … sh.appendRow(X); … }`—
     el `exec` daba `null`, `fuera` quedaba siendo el cuerpo entero, y el `appendRow` que está DENTRO
     de la rama satisfacía la condición. O sea: era ciego justo en la forma que vino a cazar.
     Medido: quitarle el helper a `Gestiones`, `Operaciones Listadas`, `Tareas`, `Informes` o
     `Suscripciones` dejaba este caso en verde.
     Ahora no se busca «¿escribe fuera del if?» sino lo único que importa y no depende de la forma:
     **¿nombra `asegurarEncabezado_`?** Un constructor que crea hoja y no lo nombra no asegura nada. */
  const malos = [], sinAsegurar = [];
  nombres.forEach(n => {
    const c = cuerpos[n];
    if (c.indexOf('insertSheet') < 0) return;                 // no crea: no le toca encabezado
    if (c.indexOf('asegurarEncabezado_') < 0) { malos.push(n); return; }
    /* ⚠️ Y que esté ANTES de cualquier escritura de la fila 1: los dos constructores que el primer
       comentario de P233 llamó «los que lo hacen bien» sobrescribían la fila 1 ARRIBA del helper, así
       que el helper no evitaba nada y el dato se borraba. El orden es el arreglo. */
    const iAseg = c.indexOf('asegurarEncabezado_');
    const re1 = /getRange\(\s*1\s*,\s*1\s*,\s*1\s*,[^)]*\)\s*\.setValues|appendRow/g;
    let m2;
    while ((m2 = re1.exec(c))) {
      if (m2.index > iAseg) continue;                          // después del helper: está bien
      const antes = c.slice(0, m2.index);
      /* una escritura dentro del `if (!sh)` es la creación y no pisa nada: se reconoce porque la
         llave de ese `if` todavía está abierta en ese punto */
      const abiertas = (antes.match(/if\s*\(\s*!\s*sh\s*\)/g) || []).length;
      if (!abiertas) { sinAsegurar.push(n + ' (escribe la fila 1 antes del helper)'); break; }
      const desdeIf = antes.slice(antes.lastIndexOf('if (!sh)'));
      const prof = (desdeIf.match(/\{/g) || []).length - (desdeIf.match(/\}/g) || []).length;
      if (prof <= 0) { sinAsegurar.push(n + ' (escribe la fila 1 antes del helper)'); break; }
    }
  });
  PRUEBAS.igual(sinAsegurar, [],
    '⚠️ estos escriben la fila 1 ANTES de que el helper decida si es un dato: el helper no evita ' +
    'nada y el dato se borra');
  PRUEBAS.igual(malos, [],
    '⚠️ estos escriben el encabezado SÓLO cuando crean la hoja: si ya existe vacía, la primera ' +
    'fila de datos cae donde va el encabezado y ningún lector la ve');
});

PRUEBAS.caso('🔴 P233-5 · una LECTURA no arregla el encabezado, y eso es a propósito (H8)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL LÍMITE DEL ARREGLO, MEDIDO EN VEZ DE DESCUBIERTO DESPUÉS. `asegurarEncabezado_` vive en los
     `obtenerHoja*`, y este repo tiene escrito «H8 · LEER NO CREA NI FORMATEA»: `accionOperaciones` no
     pasa por ningún constructor, justamente para que consultar el panel no escriba en el CH.
     Consecuencia que hay que saber: una hoja con un dato en la fila 1 **sigue perdiéndolo hasta la
     próxima ESCRITURA**, y `Consentimientos` es una escritura por persona, así que puede quedar meses
     dañada. Por eso existe `tarea=encabezado_arreglar` en el endpoint, que recorre las 24 hojas con
     constructor y las repara reusando este mismo helper.
     ⚠️ Acá decía que las dos hojas de producción «se arreglaron a mano con
     `herramientas/arreglar-encabezados-p233.py`». **Ese archivo nunca existió**: lo escribí en el
     comentario antes de decidir cómo se iba a hacer, y quedó afirmando un arreglo con una herramienta
     inventada. Es el mismo patrón que esta serie ya documentó dos veces —un comentario que dice
     «medido» y no se midió—, y lo encontró el verificador, no yo.
     Si algún día esto cambia —si una lectura empieza a tocar hojas— este caso se pone rojo y hay que
     decidirlo a propósito, no descubrirlo. */
  const api = p226Api();
  const sh = api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh.appendRow(['Consorcio HELITEC', 'Cardón IV', 'Oscar Martinez', '', '2026-10-06', '', 'activo',
                '2026-10-06T20:05:08', '', '', '']);
  const antes = p233Fila1(api, 'ASIGNACIONES');
  p226Leer(api);                                     // la lectura del panel, el camino real
  const desp = p233Fila1(api, 'ASIGNACIONES');
  PRUEBAS.igual(desp.filas, antes.filas,
    '⚠️ la lectura no agregó ni quitó filas (H8: leer no crea ni formatea)');
  PRUEBAS.igual(desp.primera.map(String).join('|'), antes.primera.map(String).join('|'),
    '⚠️ ni tocó la fila 1');
});

PRUEBAS.caso('🔴 P233-6 · un dato que CONTIENE un nombre de columna sigue siendo un dato', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ ESTE ES EL ESTADO REAL DE `Suscripciones` EN PRODUCCIÓN, y el hueco que encontró el
     discriminador: su fila 1 dice «Empresa De Prueba» y «Persona De Prueba», que **contienen**
     «Empresa» y «Persona», dos nombres de columna. Si `asegurarEncabezado_` comparara por substring,
     esa fila se leería como encabezado y la hoja no se arreglaría nunca — la suscripción seguiría
     invisible, sin recibir avisos y duplicándose en cada reenvío.
     Medido: sabotear la comparación a substring deja la suite ENTERA en verde, así que sin este caso
     el `norm(t)` exacto no está defendido por nada.
     El derecho lo concede `asegurarEncabezado_`, que compara `esNombre[norm(t)]` — igualdad exacta
     sobre la celda completa, no inclusión. */
  const DATO = ['Empresa De Prueba', 'Cardón IV', 'Persona De Prueba', '', '2026-10-06', '',
                'activo', '2026-10-06T20:05:08', '', '', ''];
  const api = p226Api();
  const sh = api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh.appendRow(DATO.slice());
  p226Alta(api, p233Sup(), 'Cardón IV');
  p226Asignar(api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });

  const h = p233Fila1(api, 'ASIGNACIONES');
  PRUEBAS.igual(String(h.primera[0]), 'Empresa',
    '⚠️ «Empresa De Prueba» NO es «Empresa»: la fila 1 era un dato y el encabezado se insertó · ' +
    JSON.stringify(h.primera.slice(0, 3)));
  const viejo = h.todas.filter(f => String(f[2]) === 'Persona De Prueba')[0];
  PRUEBAS.cierto(!!viejo, '⚠️ y el dato que contenía los nombres de columna no se perdió');
  if (viejo) PRUEBAS.igual(String(viejo[7]), '2026-10-06T20:05:08', '⚠️ con su sello intacto');
  /* ⚠️ Discriminador del propio caso: una fila que SÍ es el encabezado tiene que seguir intocada,
     o este aserto pasaría simplemente porque el helper inserta siempre. */
  const api2 = p226Api();
  const sh2 = api2.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh2.appendRow(['Empresa', 'Operacion', 'Persona', 'Cedula', 'Desde', 'Hasta', 'Estado',
                 'Creada', 'CreadaPor', 'Baja', 'BajaPor']);
  p226Alta(api2, p233Sup(), 'Cardón IV');
  p226Asignar(api2, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  const h2 = p233Fila1(api2, 'ASIGNACIONES');
  PRUEBAS.igual(h2.filas, 2,
    '⚠️ discriminador: con el encabezado correcto no se inserta nada · filas=' + h2.filas);
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   RONDA 2 · LOS DOS QUE «LO HACÍAN BIEN» ERAN LOS QUE DESTRUÍAN
   ══════════════════════════════════════════════════════════════════════════════════════════════
   El comentario de P233 nombraba `obtenerHojaIdentidades` y `obtenerHojaCasosOdoo` como los 2 de 25
   que aseguraban su encabezado, y los usaba de modelo. Medido por el verificador: los dos
   **sobrescriben la fila 1**, y lo hacen ANTES de que corra `asegurarEncabezado_` —13 líneas antes en
   un caso—, así que el helper no evita nada. Con un dato en la fila 1, el dato se BORRA. Es
   irreversible, y en `Identidades` además `identLimpiarProblema()` apaga la bandera: `mantSalud()`
   dice que la hoja está sana.
   Y un tercero peor, porque no se puede reparar después: el bloque P172 de `obtenerHojaNomina`
   escribe «Estado» en la celda (1,14) sin preguntar si la fila 1 es un encabezado o un dato. Después
   de eso el helper reconoce esa celda, cree que es un encabezado, y la hoja queda sin encabezado
   PARA SIEMPRE: la persona de la fila 1 no cuenta en cobertura, no se puede asignar y no se puede
   dar de alta. Un solo pedido de la app deja la hoja así.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p233ConDato(cual, dato, extra) {
  /* monta la hoja `cual` con UN dato en la fila 1 y sin encabezado, y devuelve el api */
  const api = p226Api(extra);
  const sh = api.__env.__libro.getSheetByName(p226Hoja(cual)) ||
             api.__env.__libro.insertSheet(p226Hoja(cual));
  const v = sh.getDataRange().getValues();
  if (v.length && String(v[0][0] || '').trim()) sh.deleteRow(1);   // saca el encabezado del fixture
  sh.insertRowBefore(1);
  sh.getRange(1, 1, 1, dato.length).setValues([dato]);
  return { api: api, sh: sh };
}

PRUEBAS.caso('🔴 P233-7 · `Identidades` con un dato en la fila 1 NO lo pierde', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ `if (sh.getLastRow() <= 1) setValues([IDENT_HEAD])`: con UNA fila de datos, `getLastRow()` da
     1 y la condición se cumple. El dato —una corrección manual de identidad, lo que P163 llama «la
     evidencia»— se reemplaza por el encabezado. Y `identLimpiarProblema()` borra la bandera, así que
     `mantSalud()` no dice nada. El derecho lo concede `asegurarEncabezado_`, que tiene que correr
     ANTES de cualquier escritura de la fila 1. */
  const DATO = ['Ana Suarez 0412', 'Consorcio HELITEC', 'V-11111', 'Rafael', 'cedula', '7',
                '2026-09-01', '2026-10-06'];
  /* ⚠️ Se llama al CONSTRUCTOR, no a una acción. `obtenerHojaIdentidades` lo disparan
     `leerOverridesIdentidad` y `anotarVariantes`, que el api de este arnés no expone — y lo que falla
     es el constructor mismo, así que su camino real es ser llamado. No se arma ningún estado a mano:
     la hoja se monta con el dato y el resto lo hace la función de verdad (R17). */
  const env = GS.crearEntorno(p226Hojas({ 'Identidades': [DATO.slice()] }));
  const api = GS.cargarGs(CTX.gs, env, ['obtenerHojaIdentidades']);
  const sh = env.__libro.getSheetByName(p226Hoja('IDENTIDADES'));
  api.obtenerHojaIdentidades();
  const v = sh.getDataRange().getValues();
  const sigue = v.filter(f => String(f[0]) === 'Ana Suarez 0412')[0];
  PRUEBAS.cierto(!!sigue,
    '⚠️ la corrección de identidad NO se borró · fila 1 = ' + JSON.stringify((v[0] || []).slice(0, 3)));
  PRUEBAS.igual(String((v[0] || [])[0]), 'Variante', '⚠️ y la fila 1 pasó a ser el encabezado');
});

PRUEBAS.caso('🔴 P233-8 · `Casos Odoo` con un dato en la fila 1 NO lo pierde', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ La rama `else if (sh.getLastColumn() < CASOS_ODOO_HEAD.length)` existe para migrar la columna
     `Valores`, y corre antes del helper. Un caso nuevo deja `Procesado`/`RefOdoo`/`Valores` vacías,
     así que `getLastColumn()` da 14 contra 17 y la condición se cumple: el caso clínico de la fila 1
     se reemplaza por el encabezado. Es la hoja con la que Odoo deduplica, así que ese caso no se
     procesa nunca y no hay de dónde recuperarlo. */
  const DATO = ['2026-10-06', 'Oscar Martinez', 'Consorcio HELITEC', 'Operaciones', 'Piloto',
                'kss', '7', 'alta', 'abierto', '', '', '', '', 'CASO-1'];
  const m = p233ConDato('CASOS_ODOO', DATO, { 'Casos Odoo': [DATO.slice()] });
  p226Leer(m.api);
  p226Asignar(m.api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  const v = m.sh.getDataRange().getValues();
  PRUEBAS.cierto(v.filter(f => String(f[13]) === 'CASO-1').length > 0,
    '⚠️ el caso clínico NO se borró · fila 1 = ' + JSON.stringify((v[0] || []).slice(0, 3)));
});

PRUEBAS.caso('🔴 P233-9 · `Nómina` con un dato en la fila 1 se puede REPARAR', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL PEOR DE LOS TRES, porque no se puede deshacer por la API. El bloque P172 escribe «Estado»
     en la celda (1,14) cuando está vacía, **sin preguntar si la fila 1 es un encabezado o un dato**,
     y corre antes del helper. Después de eso el helper ve una celda reconocida, cree que es un
     encabezado y no lo arregla; y la tarea de reparación tampoco. La persona de la fila 1 queda
     invisible para todo el sistema: medido, `asignar` contestaba `persona_sin_nomina`.
     Un solo pedido de la app deja la hoja así. El arreglo es de orden: el helper va ANTES del P172. */
  const PERSONA = ['Helitec', 'Ana Suárez', 'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '',
                   'Sí', '', '', '3'];
  const api = p226Api({ 'Nómina': [PERSONA.slice()] });   // sin encabezado, la persona en la fila 1
  p226Alta(api, p233Sup(), 'Cardón IV');
  const r = p226Asignar(api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('NOMINA'));
  const v = sh.getDataRange().getValues();
  PRUEBAS.igual(String((v[0] || [])[0]), 'Empresa',
    '⚠️ la fila 1 de `Nómina` es el encabezado · ' + JSON.stringify((v[0] || []).slice(0, 3)));
  PRUEBAS.cierto(v.filter(f => String(f[1]) === 'Ana Suárez').length > 0,
    '⚠️ y la persona sigue estando');
  PRUEBAS.igual(r.ok, true,
    '⚠️ y se la puede asignar: estaba invisible para todo el sistema · ' + JSON.stringify(r.motivo || ''));
});

PRUEBAS.caso('🔴 P233-10 · un Estado que SE LLAMA igual que una columna no hace pasar el dato por encabezado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  if (!p233Hay()) { PRUEBAS.cierto(false, '⚠️ no está el fixture de P226: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL DEFECTO QUE P233 VINO A CERRAR, DECLARADO SANO. El criterio era «alguna celda es
     exactamente un nombre de columna» —umbral 1— y hay valores de dato que lo son en su propia hoja:
     `Estado = "baja"` iguala la columna `"Baja"` de `Asignaciones`, `Operaciones Listadas` y
     `Departamentos`; `"anulada"` iguala `"Anulada"` de `Ausencias`; `"cerrada"` iguala `"Cerrada"` de
     `Sesiones`; y en `Nómina` el rol `"Supervisor"` iguala `"¿Supervisor?"`.
     Medido: con la asignación de Oscar Martinez ya QUITADA —un toque de «quitar» alcanza— la tarea de
     reparación informaba «encabezado · reconoce 1 de 11» y la hoja no se arreglaba nunca.
     El criterio pasa a ser de MAYORÍA: `reconocidas * 2 >= conContenido`. Verificado contra los 18
     encabezados reales del CH (`pruebas/encabezados-ch.json`): los 18 siguen clasificando como
     encabezado, incluidos `Nómina` con 13 de 17 y `PVT` con 10 de 11. */
  const QUITADA = ['Consorcio HELITEC', 'Cardón IV', 'Oscar Martinez', '', '2026-10-06',
                   '2026-10-06', 'baja', '2026-10-06T20:05:08', '', '2026-10-06T21:00:00', 'rafael'];
  const api = p226Api();
  const sh = api.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh.appendRow(QUITADA.slice());
  p226Alta(api, p233Sup(), 'Cardón IV');
  p226Asignar(api, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  const v = sh.getDataRange().getValues();
  PRUEBAS.igual(String((v[0] || [])[0]), 'Empresa',
    '⚠️ «baja» en la columna Estado no convierte la fila en encabezado · ' +
    JSON.stringify((v[0] || []).slice(0, 3)));
  PRUEBAS.cierto(v.filter(f => String(f[2]) === 'Oscar Martinez').length > 0,
    '⚠️ y el histórico de quien fue quitado sigue estando');
  /* ⚠️ Discriminador: un encabezado al que le falta UNA columna sigue siendo encabezado. */
  const api2 = p226Api();
  const sh2 = api2.__env.__libro.insertSheet(p226Hoja('ASIGNACIONES'));
  sh2.appendRow(['Empresa', 'Operacion', 'Persona', 'Cedula', 'Desde', 'Hasta', 'Estado',
                 'Creada', 'CreadaPor', 'Baja', 'ColumnaRara']);
  p226Alta(api2, p233Sup(), 'Cardón IV');
  p226Asignar(api2, p233Sup(), 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-5) });
  PRUEBAS.igual(api2.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES')).getDataRange().getValues().length, 2,
    '⚠️ discriminador: 10 de 11 nombres sigue siendo un encabezado, no se inserta nada');
});
