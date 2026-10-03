/* ── DISCRIMINADOR de P214 · «un verde no vale sin haber visto el rojo» ────────────────────────
   (2026-10-02)

   P214 cerró NUEVE lugares con una sola regla (`esAdminMaestro_`). Eso hace que un discriminador
   ingenuo sea engañoso en los dos sentidos: revertir sólo el helper tumba todo a la vez y no dice
   qué lugar mide cada caso; revertir sólo un lugar deja los otros ocho tapando el defecto.
   Por eso van SEIS reversiones independientes:

     A · `esAdminMaestro_` vuelve a ser `acc.rol === "admin"` — la raíz. Debe caer TODO.
     B · `accionSupervisor` vuelve a filtrar sólo con empresa concreta — el panel entero.
     C · `accesoPanel_` pierde la guarda de la lista — el visor sobre empresa ajena.
     D · `ausScope` pierde la suya — ausencias, opiniones, credenciales (9 llamadores).
     E · el índice de ausencias de `accionSupervisor` — el dato va en la CLAVE (A13).
     F · `accionIdentidadesInforme` — el padrón del CH entero.

   ⚠️ E y F NO ESTABAN en la primera versión, y el verificador midió que esos dos arreglos no los
   vigilaba NADA: ni este script ni los casos. Y cuando los agregué, mis dos métricas nuevas daban
   `false` incluso para el maestro —el índice de ausencias vuelve `{}` sin `p.empresa`, y el informe
   cuenta `enPadron`, no `candidatos`— así que no medían nada. Lo cazaron las guardas de
   `NO_PUEDE`, que es para lo que están.

   ⚠️ Y LAS DOS MITADES de cada una: lo que TIENE que cambiar (el admin de fila deja de ver lo
   ajeno) y lo que NO PUEDE cambiar (el maestro ve todo, el supervisor ve lo suyo). Un
   discriminador que sólo mira la primera no distingue «lo cerré» de «dejé a todos sin acceso».

   ⚠️ HUECO DECLARADO · la reversión **I** (`accionIdentidadesInforme` vuelve a su derivación
   propia) no discrimina con ningún fixture de este script, y no es que la corrección esté de más:
   su efecto sólo se ve cuando `acc.empresas` llega NULO con `acc.canonical` cargado, que es el
   estado de una sesión con la celda `Empresas` de `Sesiones` corrupta. Montarlo requiere emitir un
   token válido y después editar esa fila, y el emulador no resuelve el hash de `sesEmitir`. El
   verificador SÍ lo midió a mano en la segunda ronda (el mismo `acc` daba respuestas incompatibles
   entre `accionSupervisor` y esta acción). Queda escrito acá en vez de borrado: un hueco declarado
   se puede cerrar, uno ignorado se descubre cuando alguien revierte la línea.

   ⚠️ Los nombres de las reversiones NO llevan 🔴: ese emoji marca fallas en la salida, y ponerlo en
   un nombre hace que cualquier `grep` de fallas —incluido el mío, durante media hora— cuente como
   error una reversión que estaba discriminando perfectamente. Para ver el detalle de una reversión
   concreta: `DEPURAR=1 node pruebas/discriminador-p214.js`.

   Desde `silva-salud-fatiga/`:   node pruebas/discriminador-p214.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

const REV = [
  { nombre: 'A · `esAdminMaestro_` vuelve a ser `acc.rol === "admin"` (la raíz de las nueve)',
    busca: '  return !!acc && acc.rol === "admin" && acc.empresas === null && acc.canonical == null;',
    pone:  '  return !!acc && acc.rol === "admin";' },
  { nombre: 'B · `accionSupervisor` vuelve a filtrar sólo con empresa concreta (el panel entero)',
    busca: `    var permitidasS = empresasPermitidas_(acc);          // \`null\` sólo para el maestro`,
    pone:  `    var permitidasS = null;   // REVERTIDO` },
  { nombre: 'C2 · el candado del visor vuelve a aceptar CUALQUIER variante (la fuga de la ronda 4)',
    /* ⚠️ Ésta es la reversión que no existía, y por eso el defecto pudo entrar: mutar el candado a
       esta forma no movía ni un caso ni una métrica. La cuarta ronda lo midió explícitamente.
       Va en PAR con C3 porque el recorte de `out.canonical` la ataja: son las dos mitades del mismo
       defecto y cada una cubre a la otra. Revertir el par entero demuestra que la redundancia es
       real — y es la redundancia lo que faltaba en la ronda 4, donde sólo existía una. */
    pares: ['C3 ·'],
    busca: `  return permitidas.indexOf(norm((emps || [])[0] || "")) >= 0;`,
    pone:  `  for (var iV = 0; iV < (emps || []).length; iV++) {
    if (permitidas.indexOf(norm(emps[iV])) >= 0) return true;
  }
  return false;` },
  { nombre: 'C3 · el recorte deja de mirar `out.canonical` (la otra mitad del mismo defecto)',
    busca: `      if (out.canonical && permitidasV.indexOf(norm(out.canonical)) < 0) {
        acc.visorError = "empresa"; return acc;
      }`,
    pone:  `      // REVERTIDO`,
    pares: ['C2 ·'] },
  { nombre: 'C · `accesoPanel_` pierde la guarda de la lista Y el recorte (el visor sobre empresa ajena)',
    /* ⚠️ Se revierte junto con H a propósito: el recorte de `out.empresas` también rechaza cuando
       ninguna variante es propia, así que sacar sólo este candado no cambia nada medible — las dos
       defensas se cubren. Revertir el par demuestra que la redundancia es real y que el par
       completo sí hace falta. */
    /* ⚠️ Va con H y con L: desde que el panel filtra por canon PROPIO, un canónico ajeno adoptado
       por el visor ya no sirve de nada — las tres defensas se cubren, que es lo que se buscaba. */
    pares: ['H ·', 'L ·'],
    /* ⚠️ CUARTA versión de este ancla. Cada vez que el candado se reescribió, el ancla vieja hizo
       abortar el script — que es lo correcto: falla cerrado en vez de informar un verde sobre una
       reversión que nunca se aplicó. Es la única razón por la que esto no pasó inadvertido. */
    busca: `    if (!filaEsPermitida_((cta.empresas && cta.empresas.length) ? cta.empresas : [cta.canonical || ve],
                          permitidasV)) {
      acc.visorError = "empresa"; return acc;
    }`,
    pone:  `    // REVERTIDO: sin candado` },
  { nombre: 'G · ENSANCHA · `empresasPermitidas_` canonicaliza contra el mapa GLOBAL (la fuga de la ronda 3)',
    busca: `  var k = norm(acc.canonical || (acc.empresas && acc.empresas[0]) || "");
  if (k) out.push(k);`,
    pone:  `  var lista = (acc.empresas && acc.empresas.length) ? acc.empresas : [acc.canonical];
  for (var iR = 0; iR < lista.length; iR++) {
    var kR = norm(nominaEmpresaCanon(construirAlias(), lista[iR] || ""));
    if (kR && out.indexOf(kR) < 0) out.push(kR);
  }
  var k = norm(acc.canonical || "");
  if (k && out.indexOf(k) < 0) out.push(k);` },
  { nombre: 'K2 · ENSANCHA · `empresasPermitidas_` agrega las variantes CRUDAS (ensancha por el canónico ajeno)',
    busca: `  var k = norm(acc.canonical || (acc.empresas && acc.empresas[0]) || "");
  if (k) out.push(k);
  return out;`,
    pone:  `  var lista2 = (acc.empresas && acc.empresas.length) ? acc.empresas : [];
  for (var iC = 0; iC < lista2.length; iC++) {
    var kC = norm(lista2[iC] || ""); if (kC && out.indexOf(kC) < 0) out.push(kC);
  }
  var k = norm(acc.canonical || (acc.empresas && acc.empresas[0]) || "");
  if (k && out.indexOf(k) < 0) out.push(k);
  return out;` },
  { nombre: 'H · el VISOR adopta la lista entera de la fila destino',
    pares: ['L ·'],
    busca: `        out.empresas = recortadas.length ? recortadas : [out.canonical];`,
    pone:  `        out.empresas = out.empresas;   // REVERTIDO` },
  { nombre: 'I2 · el recorte del visor deja el alcance VACÍO (pérdida silenciosa)',
    pares: ['L ·'],
    busca: `        out.empresas = recortadas.length ? recortadas : [out.canonical];`,
    pone:  `        out.empresas = [];   // REVERTIDO` },
  { nombre: 'J · `filaEsPermitida_` deja pasar cualquier fila (el selector y el visor sin candado)',
    busca: `  if (!permitidas) return true;                                      // el maestro: sin recorte`,
    pone:  `  return true;   // REVERTIDO
  if (!permitidas) return true;` },
  { nombre: 'K3 · `empresasPermitidas_` deja entrar la clave VACÍA (haría pasar filas sin empresa)',
    /* se revierte con J, que es lo único que mira esa clave: `filaEsPermitida_` */
    pares: ['J ·'],
    busca: `  var k = norm(acc.canonical || (acc.empresas && acc.empresas[0]) || "");
  if (k) out.push(k);`,
    pone:  `  var k = norm(acc.canonical || (acc.empresas && acc.empresas[0]) || "");
  out.push(k);` },
  { nombre: 'E · el ÍNDICE DE AUSENCIAS pierde la guarda (el dato está en la CLAVE, A13)',
    busca: `        if (acc.rol === "admin" && !esAdminMaestro_(acc)
            && empresasPermitidas_(acc).indexOf(norm(empAus)) < 0) {
          empAus = (acc.canonical || (acc.empresas && acc.empresas[0]) || "");
        }`,
    pone:  `        // REVERTIDO` },
  { nombre: 'F · `accionIdentidadesInforme` deja de distinguir al maestro (el padrón del CH entero)',
    /* ⚠️ Tercer ancla de esta reversión: cambió cuando la acción pasó a usar `empresasPermitidas_`.
       Un ancla vieja hace abortar el script, que es lo correcto — falla cerrado en vez de informar
       un verde sobre una reversión que nunca se aplicó. Ya me pasó dos veces en este prompt. */
    busca: '  var permitidasI = empresasPermitidas_(acc);',
    pone:  '  var permitidasI = (acc.rol === "admin") ? null : empresasPermitidas_(acc);' },
  { nombre: 'D · `ausScope` pierde la suya (ausencias, opiniones, credenciales: 9 llamadores)',
    busca: `    if (!esAdminMaestro_(acc)) {
      var canonE = nominaEmpresaCanon(alias, e);`,
    pone:  `    if (false) {
      var canonE = nominaEmpresaCanon(alias, e);` },
  { nombre: 'N · DOBLE CANON en la rama supervisor (vacía el panel de su propia gente)',
    /* ⚠️ El defecto que la sexta ronda frenó, y que ningún instrumento distinguía: ni uno de 1111
       casos ni una de 16 reversiones cambiaba entre la línea con el bug y la arreglada. */
    busca: `    var enSet = function (e) { return !!set[norm(e)]; };`,
    pone:  `    var enSet = function (e) { return !!set[norm(nominaEmpresaCanon(RES.alias, e))]; };` },
  { nombre: 'O · DOBLE CANON en la rama admin (lo mismo, para un admin de fila)',
    busca: `      var n = norm(e);
      if (empAdm) return n === empAdm;`,
    pone:  `      var n = norm(nominaEmpresaCanon(RES.alias, e));
      if (empAdm) return n === empAdm;` },
  { nombre: 'P · `ausScope` vuelve a canonizar sus dos salidas (el canónico del secuestrador)',
    /* ⚠️ El cierre de `ausScope` tampoco tenía instrumento: revertirlo no ponía nada en rojo.
       Y hay que revertir LAS DOS salidas: la primera versión de esta reversión tocaba sólo el
       fallback de la rama admin, y la métrica mide un SUPERVISOR, que sale por el `return` final. */
    // ⚠️ Un solo ancla, con el cierre del comentario de arriba como contexto: la cadena del `return`
    // final es SUBCADENA de la del fallback de la rama admin (difieren sólo en la indentación), así
    // que declarar las dos hacía que el script contara dos apariciones de una y abortara.
    // (Este comentario va con `//` porque el de bloque se cerraba solo al nombrar la secuencia de
    //  cierre — el mismo error que este archivo ya documentó en el `pone` de la reversión B.)
    busca: `     correcto es seguir escribiendo bajo el MÍO, no bajo el de ella. */
  return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();`,
    pone:  `     REVERTIDO */
  return nominaEmpresaCanon(alias, acc.canonical || (acc.empresas && acc.empresas[0]) || "");` },
  { nombre: 'L · el PANEL del supervisor vuelve a filtrar por variantes CRUDAS (la fuga del supervisor común)',
    /* ⚠️ La fuga más fácil de alcanzar de todo P214 —una celda con dos nombres, sin rol admin, sin
       visor, sin secuestro de alias— y no tenía reversión porque se cerró en la quinta ronda. */
    /* el ancla cambió al arreglar el doble canon: `enSet` ya no canoniza */
    busca: `    var permitidasP = empresasPermitidas_(acc) || [];
    var set = {}; permitidasP.forEach(function (x) { set[x] = 1; });`,
    pone:  `    var set = {}; (acc.empresas || []).forEach(function(x){ set[norm(x)] = 1; });` },
  { nombre: 'M · `nominaSinDato` vuelve a «el canon de mi canónico» (el canal que seguía entregando ajenos)',
    /* ⚠️ ACÁ DECÍA «hueco declarado: no se puede montar el escenario». ERA FALSO en las dos mitades,
       y el verificador lo probó: lo montó en el mismo emulador con cuatro filas, y además midió que
       el cierre se nota **incluso sin ninguna fila secuestradora**. Declarar un hueco que no existe
       es peor que no declararlo: deja la defensa sin red con una excusa escrita. El fixture ahora
       trae la fila `Holding`, que reclama el canónico de `Aeropostal`. */
    busca: `          var permS = empresasPermitidas_(acc) || [];
          if (permS.indexOf(norm(nominaEmpresaCanon(alias, r.empresa))) < 0) return;`,
    pone:  `          if (norm(nominaEmpresaCanon(alias, r.empresa)) !== norm(nominaEmpresaCanon(alias, acc.canonical || ""))) return;` },

];

/* ⚠️ `pares`: una reversión puede declarar OTRAS que hay que revertir con ella. Hace falta porque
   P214 dejó defensas redundantes a propósito —el candado del visor y el recorte de su lista se
   cubren uno al otro— y revertir una sola no cambia nada medible: el script informaba «NO
   DISCRIMINA» sobre defensas que SÍ sirven, sólo que no solas. Revertir el par entero es la forma
   correcta de medir defensa en profundidad, y de paso prueba que la redundancia es real. */
const comoLista = r => Array.isArray(r.busca) ? r.busca : [r.busca];
const paresDe = r => (r.pares || []).map(n => REV.find(x => x.nombre.indexOf(n) === 0)).filter(Boolean);
const aplicarUna = (txt, r) => comoLista(r).reduce((acc, b) => acc.split(b).join(r.pone), txt);
const aplicar = (txt, r) => paresDe(r).reduce((acc, p) => aplicarUna(acc, p), aplicarUna(txt, r));
const falta = REV.filter(r => comoLista(r).some(b => real.split(b).length - 1 !== 1));
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta.forEach(r => console.log('   · ' + r.nombre));
  process.exit(3);
}

const HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'km', 'admin', '', '', ''],                       // el maestro
    ['Grupo Norte', 'kgn', 'admin', 'Aerocentro', '', ''],   // admin DE FILA
    ['Aeropostal', 'kap', 'supervisor', 'Aeropostal', '', ''],
    /* ⚠️ UN SUPERVISOR MULTI-VARIANTE, que es la forma REAL de 3 de las 16 cuentas de producción
       (IAIM, Consorcio HELITEC y Aeroambulancias Silva, ésta con cinco). Sin esta fila, la
       reversión que devuelve un solo canónico no rompe nada medible y pasa por buena. */
    ['Multi', 'kmu', 'supervisor', 'Multisur, Multi Sur C.A.', '', ''],
    /* ⚠️ Y ESTA FILA ES LA QUE HACE EXISTIR EL ESCENARIO. `construirAliasLeer_` recorre todas las
       filas y GANA LA ÚLTIMA, así que al venir después redefine `alias["multi sur c.a."]` a su
       propio canónico y el canon de esa variante se sale de la celda de `Multi`. Sin esta fila, el
       canon de cualquier variante es `emps[0]` y la reversión «un solo canónico» pasa por buena:
       la primera versión de este fixture no la tenía y las cuatro reversiones nuevas salían
       «NO DISCRIMINA» — no porque las defensas estuvieran de más, sino porque el escenario no
       estaba montado. */
    ['Sur', 'ksu', 'supervisor', 'Multi Sur C.A.', '', ''],
    /* ⚠️ Un ADMIN que nombra sólo la PRIMERA variante de la fila `Multi`. Es el escenario del
       hallazgo crítico: pide el visor sobre una empresa que sí es suya, y la fila destino cubre una
       variante más. Sin esta cuenta, la reversión H no tiene nada que romper. */
    ['AdmMulti', 'kad', 'admin', 'Multisur', '', ''],
    /* ⚠️ Y un admin que nombra su empresa por la SEGUNDA variante de la fila `Multi`, que es lo que
       hace falta para que la reversión J tenga algo que romper: con el recorte mirando sólo
       `emps[0]`, el selector esconde su propia empresa. */
    ['AdmSeg', 'kas', 'admin', 'Multi Sur C.A.', '', ''],
    /* ⚠️ UNA FILA QUE RECLAMA EL CANÓNICO DE OTRA COMO VARIANTE NO-PRIMERA. Es un escenario
       DISTINTO del secuestro de una variante, y el que hacía falta para dos cosas que no tenían
       instrumento: el DOBLE CANON —`enSet`/`enAlcance` canonizando un dato que `RES.aplicar` ya
       canonizó, que vaciaba el panel del supervisor— y el cierre de `nominaSinDato`, cuyo hueco
       declaré imposible de montar y el verificador montó con cuatro filas. */
    /* ⚠️ Reclama a `Secuestrada`, una cuenta DEDICADA a esto. La primera versión le hacía reclamar
       `Aeropostal`, que cuatro métricas viejas usaban como «la empresa ajena indiscutida», y el
       fixture nuevo las contaminó: `supVeLoSuyo`, `apPierdeSuPanel` y las dos del maestro se
       pusieron en rojo con razón —por la decisión de diseño, `Holding` se había quedado con ese
       nombre— pero midiendo otra cosa que la que decían. Un fixture que le cambia el significado a
       una métrica existente es tan peligroso como una métrica mal escrita. */
    /* ⚠️ CON DOS VARIANTES, y eso es lo que hace visible el doble canon. Con una sola, la cuenta
       pierde su gente en las dos versiones —su canónico está secuestrado y el alias se la da a
       `Holding`, que es el comportamiento diseñado— así que la métrica no discriminaba y además
       afirmaba un derecho inexistente: la CUARTA vez en este prompt que escribo eso, y ésta la
       escribí DESPUÉS de redactar R19 sobre exactamente esto.
       Con la segunda variante sí: `Secuestrada C.A.` canoniza a `Secuestrada` —su propia celda la
       declara primera— y eso SÍ está en su alcance. Con el doble canon, el segundo pase manda ese
       nombre a `Holding` y la fila desaparece. */
    ['Secuestrada', 'ksq', 'supervisor', 'Secuestrada, Secuestrada C.A.', '', ''],
    ['Holding', 'kho', 'supervisor', 'Holding, Secuestrada', '', ''],
    /* ⚠️ Un ADMIN de fila con la MISMA forma que `Secuestrada` (dos variantes y el canónico
       secuestrado por `Holding2`): la rama admin del panel tiene su propio `enAlcance`, y sin una
       cuenta así el doble canon de esa rama no tenía escenario. */
    ['AdmSec', 'kad2', 'admin', 'AdmSec, AdmSec C.A.', '', ''],
    ['Holding2', 'kho2', 'supervisor', 'Holding2, AdmSec', '', '']],
  'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
    ['Aerocentro', 'ANA SUAREZ', 'V-111', 'Operaciones', 'Piloto'],
    ['Aeropostal', 'PEDRO GOMEZ', 'V-222', 'Mantenimiento', 'Tecnico'],
    /* etiquetada con la SEGUNDA variante de `Multi`, que `Sur` RECLAMA en una fila posterior: por
       el mapa global de alias esta fila es de `Sur`, no de `Multi`. Es la que delata el
       ensanchamiento si `empresasPermitidas_` vuelve a canonicalizar contra ese mapa. */
    ['Multi Sur C.A.', 'ZOE SUR', 'V-333', 'Operaciones', 'Piloto'],
    /* ⚠️ Y una persona de `Multisur` a secas, que es lo que le corresponde a `Multi` y a `AdmMulti`.
       Sin esta fila su visor no traía a NADIE y la guarda `visorAbreYTrae` pedía algo imposible:
       daba rojo en la línea base y tapaba el resultado de las dos reversiones del recorte. */
    ['Multisur', 'ANA PRIMERA', 'V-444', 'Operaciones', 'Piloto'],
    ['Secuestrada C.A.', 'SOL SECUESTRADA', 'V-555', 'Operaciones', 'Piloto'],
    ['AdmSec C.A.', 'RAI ADMSEC', 'V-666', 'Operaciones', 'Piloto'],
    ['Holding', 'HOL PERSONA', 'V-777', 'Operaciones', 'Piloto']],
  /* ⚠️ `Operacional` CON FILAS DE LAS DOS EMPRESAS, y es lo que hacía falta para medir la fuga más
     grande. La primera versión de este discriminador no tenía ninguna métrica sobre el panel de
     `accionSupervisor`, así que la reversión B salía «NO DISCRIMINA» — no porque la defensa
     estuviera de más, sino porque el medidor no miraba ahí. Un medidor que no mide lo que dice es
     el defecto que este proyecto ya pagó varias veces.
     Se mide por `operacional` y no por `registros` porque `Respuestas de formulario 1` tiene ~90
     columnas con dos filas de encabezado, y el MISMO `enAlcance` filtra los cuatro conjuntos. */
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [HOY, '08:00', HOY + 'T08:00:00', 'e1', 'ANA SUAREZ', 'Aerocentro', 'Operaciones', 'Piloto', 'inicio', '', '', ''],
    [HOY, '09:00', HOY + 'T09:00:00', 'e2', 'PEDRO GOMEZ', 'Aeropostal', 'Mantenimiento', 'Tecnico', 'inicio', '', '', ''],
    /* las dos variantes de `Multi`, para que el recorte de `out.empresas` tenga algo que recortar */
    [HOY, '10:00', HOY + 'T10:00:00', 'e3', 'ANA PRIMERA', 'Multisur', 'Ops', 'Piloto', 'inicio', '', '', ''],
    [HOY, '11:00', HOY + 'T11:00:00', 'e4', 'ZOE SUR', 'Multi Sur C.A.', 'Ops', 'Piloto', 'inicio', '', '', ''],
    [HOY, '12:00', HOY + 'T12:00:00', 'e5', 'SOL SECUESTRADA', 'Secuestrada C.A.', 'Ops', 'Piloto', 'inicio', '', '', ''],
    [HOY, '13:00', HOY + 'T13:00:00', 'e6', 'RAI ADMSEC', 'AdmSec C.A.', 'Ops', 'Piloto', 'inicio', '', '', '']],
  /* `AUS_HEAD` real: 12 columnas, `Cedula` antes de `Persona`, la 8ª es `Estado` = «vigente». */
  'Ausencias': [['IdAusencia', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor', 'Anulada', 'AnuladaPor'],
    ['a1', 'Aeropostal', 'V-222', 'PEDRO GOMEZ', HOY, HOY, 'franco', 'vigente', '', '', '', ''],
    ['a2', 'Aerocentro', 'V-111', 'ANA SUAREZ', HOY, HOY, 'franco', 'vigente', '', '', '', '']],
  'Config Empresa': [['Empresa', 'Clave', 'Valor']],
  /* `SES_HEAD` real: 13 columnas, `HashToken` segunda. El fixture de 11 dejaba todo corrido. */
  'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
  'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra']]
});

/* Lo que se mide en cada corrida. Cada clave es un HECHO observable, no una opinión. */
function medir(txt) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(txt, env, ['validarAcceso', 'accesoPanel_', 'ausScope', 'construirAlias',
    'accionNominaListar', 'cuentasPanel_', 'empresasPermitidas_', 'accionSupervisor',
    'accionIdentidadesInforme']);
  const alias = api.construirAlias();
  const deFila = api.validarAcceso('Grupo Norte', 'kgn', 'd');
  const maestro = api.validarAcceso('*', 'km', 'd');
  const sup = api.validarAcceso('Aeropostal', 'kap', 'd');
  const nom = (u, p) => { try {
    const d = JSON.parse(api.accionNominaListar({ usuario: u, pass: p, dispositivoId: 'd' }).getContent());
    return (d.nomina || []).map(x => String(x.persona));
  } catch (e) { return ['ERROR:' + e.message]; } };
  const visor = (u, p, ve) => { try {
    const a = api.accesoPanel_({ usuario: u, pass: p, dispositivoId: 'd', verEmpresa: ve, verVista: 'medico' });
    return !!(a && a.visor) && !(a && a.visorError);
  } catch (e) { return 'ERROR'; } };
  /* EL HALLAZGO CRÍTICO DE LA RONDA 2: entrar por el visor a una empresa propia cuya fila cubre más
     variantes, y ver si el panel trae a la persona etiquetada con la variante que NO es suya. Se
     entra por `accesoPanel_` y después por `accionSupervisor`, que es el camino real. */
  const visorPanel = (u, pw, ve) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd',
      verEmpresa: ve, verVista: 'medico' }).getContent());
    /* ⚠️ `accionSupervisor` NO tiene clave `nomina` —las que hay son `nominaTotal`,
       `nominaSinDato` y `nominaError`— así que el `(d.nomina || [])` de la versión anterior era
       resto muerto y la mitad de esta métrica no leía nada. `nominaSinDato` SÍ trae nombres, y es
       por donde el defecto de la ronda 4 entregaba los de la otra empresa. */
    return (d.operacional || []).map(x => String(x.persona || '')).join(' | ')
      + ' | SINDATO:' + JSON.stringify(d.nominaSinDato || [])
      + ' | REG:' + JSON.stringify((d.registros || []).map(x => String(x.persona || ''))).slice(0, 160);
  } catch (e) { return 'ERROR:' + e.message; } };
  const visorNomina = (u, pw, ve) => { try {
    const d = JSON.parse(api.accionNominaListar({ usuario: u, pass: pw, dispositivoId: 'd',
      verEmpresa: ve, verVista: 'medico' }).getContent());
    return (d.nomina || []).map(x => String(x.persona || '')).join(' | ');
  } catch (e) { return 'ERROR'; } };
  /* ⚠️ LA MÉTRICA QUE FALTABA, y sin la cual las dos direcciones del candado del visor eran
     indistinguibles: mutarlo no ponía en rojo ni uno de 1611 casos ni una de 26 métricas. El par
     que la dispara ya estaba en el fixture y el script nunca lo probaba: `AdmSeg` —cuya celda
     declara la SEGUNDA variante de la fila `Multi`— pidiendo el visor sobre `Multisur`, que es el
     canónico de esa fila y NO el suyo. Se mide por `accionNominaListar` y por `nominaSinDato`.
     ⚠️ Decía «y las ausencias (con cédula y motivo)» y el cuerpo NO las lee: un comentario de
     instrumento afirmando un canal que no mide, que es la clase de defecto que este prompt
     documentó en cuatro rondas. El canal de ausencias bajo el visor queda SIN medir acá; el
     verificador sí lo midió a mano en la quinta ronda. */
  const visorFuga = () => { try {
    const a = api.accesoPanel_({ usuario: 'AdmSeg', pass: 'kas', dispositivoId: 'd',
      verEmpresa: 'Multisur', verVista: 'medico' });
    if (!a || !a.visor || a.visorError) return '';                   // no abre: no hay fuga
    const n = JSON.parse(api.accionNominaListar({ usuario: 'AdmSeg', pass: 'kas', dispositivoId: 'd',
      verEmpresa: 'Multisur', verVista: 'medico' }).getContent());
    const p = JSON.parse(api.accionSupervisor({ usuario: 'AdmSeg', pass: 'kas', dispositivoId: 'd',
      verEmpresa: 'Multisur', verVista: 'medico' }).getContent());
    return (n.nomina || []).map(x => String(x.persona)).join('|')
      + '|' + JSON.stringify(p.nominaSinDato || []);
  } catch (e) { return 'ERROR:' + e.message; } };
  const sinDatoDe = (u, pw) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd' }).getContent());
    return JSON.stringify(d.nominaSinDato || []);
  } catch (e) { return 'ERROR'; } };
  const cuentasDe = (acc) => { try {
    return api.cuentasPanel_(api.empresasPermitidas_(acc)).map(x => String(x.empresa));
  } catch (e) { return ['ERROR']; } };
  /* LA MÉTRICA DE LA FUGA MÁS GRANDE: qué personas trae el panel en `operacional`. Se entra por
     `accionSupervisor`, que es la acción real, y SIN mandar `empresa` — que es justo el estado en
     que la rama vieja no filtraba nada. */
  const panelPersonas = (u, pw) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd' }).getContent());
    return (d.operacional || []).map(x => String(x.persona || ''));
  } catch (e) { return ['ERROR:' + e.message]; } };
  /* el ÍNDICE de ausencias: el dato va en la CLAVE (`cedula|fecha`, `n:nombre|fecha`), así que
     ninguna anonimización lo tapa — es lo que advierte A13 en el propio `.gs`.
     ⚠️ HAY QUE PEDIR LA EMPRESA. Sin `p.empresa` el índice vuelve `{}` para CUALQUIER admin
     —`if (!empAus …) return {}`, preexistente y correcto—, así que medirlo sin empresa daba
     `false` para todos y mis dos guardas lo cazaron como «se rompió un acceso legítimo». No se
     había roto nada: la métrica no medía. */
  const ausIndice = (u, pw, emp) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd',
      empresa: emp }).getContent());
    return Object.keys(d.ausencias || {}).join(' | ');
  } catch (e) { return 'ERROR'; } };
  /* el informe de identidades: se mide por `enPadron` y `alcance`, no por `candidatos`, que vienen
     vacíos sin filas en `Respuestas de formulario 1` (90 columnas, dos encabezados: no vale
     fabricarlas para esto). `enPadron` cuenta las personas del padrón RECORTADO. */
  const padron = (u, pw) => { try {
    const d = JSON.parse(api.accionIdentidadesInforme({ usuario: u, pass: pw, dispositivoId: 'd' }).getContent());
    return { n: Number(d.enPadron || 0), alcance: String(d.alcance || '') };
  } catch (e) { return { n: -1, alcance: 'ERROR' }; } };
  return {
    /* LO QUE TIENE QUE CAMBIAR */
    filaVeNominaAjena:   nom('Grupo Norte', 'kgn').indexOf('PEDRO GOMEZ') >= 0,
    filaAbreVisorAjeno:  visor('Grupo Norte', 'kgn', 'Aeropostal'),
    filaAusenciaAjena:   String(api.ausScope(deFila, alias, 'Aeropostal')).toLowerCase().indexOf('aeropostal') === 0,
    filaVeCuentasAjenas: cuentasDe(deFila).indexOf('Aeropostal') >= 0,
    filaVePanelAjeno:    panelPersonas('Grupo Norte', 'kgn').indexOf('PEDRO GOMEZ') >= 0,
    filaVeAusenciaAjena: /222|pedro/i.test(ausIndice('Grupo Norte', 'kgn', 'Aeropostal')),
    filaVePadronAjeno:   padron('Grupo Norte', 'kgn').n > 1,
    /* el crítico: por el visor, la lista adoptada de la fila destino no puede ampliar el alcance */
    /* ⚠️ Buscaba `LUIS ROJAS`, el nombre que esa fila tenía ANTES de renombrarse a `ZOE SUR` al
       montar el escenario del ensanchamiento. Una métrica que busca un nombre inexistente da
       `false` siempre y pasa por buena: es el mismo defecto que este archivo ya documentó dos
       veces. */
    /* ⚠️ SE MIDE POR EL PANEL, NO POR LA NÓMINA. Con el alcance derivado del CANÓNICO,
       `out.empresas` ya no influye en `empresasPermitidas_` —y por lo tanto no en la nómina—, pero
       la rama supervisor de `accionSupervisor` arma su `set` con `acc.empresas` CRUDO, así que ahí
       sí. Medir la nómina dejaba las dos reversiones del recorte sin red: no porque el recorte esté
       de más, sino porque el camino medido no lo usa. */
    visorAmpliaAlcance:  /ZOE SUR/.test(visorPanel('AdmMulti', 'kad', 'Multisur')),
    /* el canónico AJENO adoptado por el visor: `ANA PRIMERA` es de `Multisur`, no de `AdmSeg` */
    visorAdoptaAjeno:    /ANA PRIMERA/.test(visorFuga()),
    /* ⚠️ LA MÉTRICA DEL ENSANCHAMIENTO, que es la que faltaba y por la que pasó la fuga de la
       ronda 3. `Sur` reclama la variante «Multi Sur C.A.», así que `alias` la mapea a SU canónico;
       si `empresasPermitidas_` canonicaliza las variantes de `Multi` contra ese mapa global, el
       canónico de `Sur` entra en el alcance de `Multi` y le llegan las personas de `Sur`.
       El verificador midió que NINGÚN instrumento distinguía esto — ni los casos ni este script. */
    multiVeGenteDeSur:   nom('Multi', 'kmu').indexOf('ZOE SUR') >= 0,
    /* ⚠️ EL PANEL y `nominaSinDato` del supervisor multi-variante: los dos canales que P214 dejó
       abiertos hasta la quinta ronda, y que ningún instrumento miraba. El panel es el ANCHO
       —registros, PVT, operacional, turnos, comentarios libres— y `nominaSinDato` entrega nombres
       por un camino que se calcula aparte del filtro. */
    multiPanelAjeno:     /ZOE SUR/.test(panelPersonas('Multi', 'kmu').join('|')),
    /* el secuestrado NO puede quedarse sin panel: es la pérdida que el doble canon producía */
    apPierdeSuPanel:     panelPersonas('Secuestrada', 'ksq').length === 0,
    /* ni su `ausScope` puede apuntar al secuestrador */
    apAusScopeAjeno:     /holding/i.test(String(api.ausScope(api.validarAcceso('Secuestrada', 'ksq', 'd'), alias, 'Secuestrada'))),
    /* el doble canon en la rama ADMIN: el admin de fila con su canónico secuestrado */
    admSecPierdeSuPanel: panelPersonas('AdmSec', 'kad2').length === 0,
    /* y `nominaSinDato` del secuestrado: no puede traer a la gente del secuestrador */
    secSinDatoAjeno:     /HOL |HOLDING/i.test(sinDatoDe('Secuestrada', 'ksq')),
    multiSinDatoAjeno:   /ZOE SUR/.test(sinDatoDe('Multi', 'kmu')),
    /* LO QUE **NO** PUEDE CAMBIAR */
    maestroVeTodaLaNomina: (() => { const l = nom('*', 'km'); return l.indexOf('PEDRO GOMEZ') >= 0 && l.indexOf('ANA SUAREZ') >= 0; })(),
    maestroAbreVisor:      visor('*', 'km', 'Aeropostal'),
    maestroAusenciaLibre:  api.ausScope(maestro, alias, 'Aeropostal') === 'Aeropostal',
    maestroVeTodasCuentas: cuentasDe(maestro).indexOf('Aeropostal') >= 0,
    filaVeLaSuya:          nom('Grupo Norte', 'kgn').indexOf('ANA SUAREZ') >= 0,
    filaAbreVisorPropio:   visor('Grupo Norte', 'kgn', 'Aerocentro'),
    supVeLoSuyo:           nom('Aeropostal', 'kap').indexOf('PEDRO GOMEZ') >= 0,
    supNoVeLoAjeno:        nom('Aeropostal', 'kap').indexOf('ANA SUAREZ') < 0,
    supAnclado:            api.ausScope(sup, alias, 'Aerocentro') === 'Aeropostal',
    /* ⚠️ ACÁ VIVÍA UNA MÉTRICA CONTRADICTORIA CON `multiVeGenteDeSur`, y las dos miraban LA MISMA
       FILA: `multiVeSuSegundaVariante` afirmaba que `Multi` tiene derecho a la fila etiquetada
       «Multi Sur C.A.» porque su celda declara esa variante, y `multiVeGenteDeSur` que no la tiene
       porque `Sur` reclamó el alias. El script informaba las dos en rojo a la vez.
       La contradicción ERA la pregunta de fondo sin responder, y la respuesta es: **la autoridad es
       `nominaEmpresaCanon`**. Si otra fila se quedó con el canon de una variante, la fila de datos
       es de ella. `multiVeSuSegundaVariante` venía de la premisa falsa de la ronda 2 («la versión
       de un solo canónico les quita nómina»), que después se midió en 0 diferencias sobre 541
       claves. Se borra en vez de corregirse: afirmaba un derecho que no existe.
       Lo que SÍ queda medido es que un supervisor ve a su gente por cualquier variante que NADIE
       le dispute — eso es `supVeLoSuyo` y el caso `MULTI-VARIANTE` de la suite. */
    multiNoVeLoAjeno:         nom('Multi', 'kmu').indexOf('PEDRO GOMEZ') < 0,
    /* la guarda del crítico: el visor TIENE que abrir y traer lo propio, o `visorAmpliaAlcance:false`
       pasaría por vacío */
    /* ⚠️ EL `|| … === ''` ESTABA MAL Y LO MARCÓ EL VERIFICADOR: aceptaba la respuesta VACÍA, así
       que un recorte que dejara el alcance en `[]` —pérdida silenciosa de todo el visor— pasaba
       inadvertido. Una guarda que admite el vacío no es una guarda. */
    /* ⚠️ Mira `operacional` ESPECÍFICAMENTE, no la cadena entera de `visorPanel`: `nominaSinDato`
       se calcula por otro camino y no pasa por el recorte de `out.empresas`, así que su presencia
       hacía pasar la guarda aunque el panel viniera vacío — y entonces la reversión que deja el
       alcance en `[]` (pérdida silenciosa de todo el panel del visor) no se notaba. */
    visorAbreYTrae:           /^ANA PRIMERA/.test(visorPanel('AdmMulti', 'kad', 'Multisur')),
    /* el selector no puede esconderle su PROPIA empresa a quien la nombra por una variante que no
       es la primera de la fila: es lo que rompía el recorte por `emps[0]` */
    /* ⚠️ «¿hay ALGUNA opción?» no servía: la fila vecina `Sur` la aporta igual con las dos
       versiones. Lo que distingue es si el selector ofrece la fila `Multi`, que lista la variante
       de esta cuenta en SEGUNDO lugar — con el recorte por `emps[0]` esa fila desaparece. */
    /* ⚠️ TERCERA MÉTRICA MÍA QUE AFIRMABA UN DERECHO INEXISTENTE. Decía que `AdmSeg` debe ver
       «Multisur» en su selector porque la fila de esa empresa declara su variante. Falso por la
       misma decisión que fija todo lo demás: el canónico de esa fila es «Multisur» y el de `AdmSeg`
       no, así que son empresas distintas. Y era justamente la métrica que hacía parecer correcto
       ensanchar el candado del visor. Lo que SÍ tiene que ver es su propia fila. */
    segVeSuEmpresaEnSelector:  cuentasDe(api.validarAcceso('AdmSeg', 'kas', 'd')).indexOf('Multi Sur C.A.') >= 0,
    /* y las dos guardas que hacen valer la métrica nueva: si el panel viniera vacío para todos,
       `filaVePanelAjeno:false` no mediría nada */
    maestroVePanelEntero:  (() => { const l = panelPersonas('*', 'km');
                              return l.indexOf('PEDRO GOMEZ') >= 0 && l.indexOf('ANA SUAREZ') >= 0; })(),
    filaVePanelPropio:     panelPersonas('Grupo Norte', 'kgn').indexOf('ANA SUAREZ') >= 0,
    /* y las guardas de las dos métricas nuevas: sin esto, un informe o un índice vacío para TODOS
       haría pasar `filaVe…Ajeno:false` sin medir nada */
    maestroVeAusenciaAjena: /222|pedro/i.test(ausIndice('*', 'km', 'Aeropostal')),
    maestroVePadronAjeno:   padron('*', 'km').n > 1,
    filaVePadronPropio:     padron('Grupo Norte', 'kgn').n === 1
  };
}

const DEBE_CAMBIAR = ['filaVeNominaAjena', 'filaAbreVisorAjeno', 'filaAusenciaAjena', 'filaVeCuentasAjenas',
                      'filaVePanelAjeno', 'filaVeAusenciaAjena', 'filaVePadronAjeno',
                      'visorAmpliaAlcance', 'multiVeGenteDeSur', 'visorAdoptaAjeno',
                      'multiPanelAjeno', 'multiSinDatoAjeno', 'apPierdeSuPanel', 'apAusScopeAjeno',
                      'admSecPierdeSuPanel', 'secSinDatoAjeno'];
const NO_PUEDE     = ['maestroVeTodaLaNomina', 'maestroAbreVisor', 'maestroAusenciaLibre', 'maestroVeTodasCuentas',
                      'filaVeLaSuya', 'filaAbreVisorPropio', 'supVeLoSuyo', 'supNoVeLoAjeno', 'supAnclado',
                      'maestroVePanelEntero', 'filaVePanelPropio',
                      'maestroVeAusenciaAjena', 'maestroVePadronAjeno', 'filaVePadronPropio',
                      'multiNoVeLoAjeno', 'visorAbreYTrae',
                      'segVeSuEmpresaEnSelector'];

let base;
try { base = medir(real); } catch (e) { console.log('🔴 no pude medir el `.gs` tal cual: ' + e.message); process.exit(3); }
console.log('── TAL CUAL ESTÁ (lo que P214 dejó) ──');
DEBE_CAMBIAR.forEach(k => console.log(`   ${base[k] ? '🔴' : '✅'} ${k} = ${base[k]}   (se espera false)`));
NO_PUEDE.forEach(k    => console.log(`   ${base[k] ? '✅' : '🔴'} ${k} = ${base[k]}   (se espera true)`));

let fallo = 0;
if (DEBE_CAMBIAR.some(k => base[k])) { console.log('\n🔴 con el `.gs` TAL CUAL, un admin de fila sigue viendo algo ajeno.'); fallo = 1; }
if (NO_PUEDE.some(k => !base[k]))    { console.log('\n🔴 con el `.gs` TAL CUAL, se rompió un acceso LEGÍTIMO.'); fallo = 1; }

REV.forEach(r => {
  console.log('\n── REVERTIDO · ' + r.nombre + ' ──');
  let m;
  try { m = medir(aplicar(real, r));
    if (process.env.DEPURAR && /^G |^K2 /.test(r.nombre)) {
      console.log('   [dep] aplicó?', aplicar(real, r) !== real, '· multiVeGenteDeSur=', m.multiVeGenteDeSur);
    } }
  catch (e) { console.log('   🔴 el mutante no corre (' + e.message + '): no mide nada'); fallo = 1; return; }
  const reabre = DEBE_CAMBIAR.filter(k => m[k]);
  const rompe  = NO_PUEDE.filter(k => !m[k]);
  DEBE_CAMBIAR.forEach(k => { if (m[k] !== base[k]) console.log(`   ⚡ ${k}: ${base[k]} → ${m[k]}`); });
  NO_PUEDE.forEach(k => { if (m[k] !== base[k]) console.log(`   ⚡ ${k}: ${base[k]} → ${m[k]}`); });
  /* ⚠️ ROMPER UN ACCESO LEGÍTIMO TAMBIÉN DISCRIMINA, y la primera versión de este script no lo
     contaba: sólo miraba `DEBE_CAMBIAR`, así que informaba «NO DISCRIMINA» sobre cuatro defensas
     cuyo daño al revertirlas es PÉRDIDA DE FUNCIÓN y no fuga —por ejemplo, devolver un solo
     canónico le quita la nómina a tres supervisores reales—. Un medidor que reconoce una sola forma
     de daño declara inútil la defensa contra la otra. */
  if (!reabre.length && !rompe.length) {
    if (r.huecoDeclarado) {
      console.log('   ⚠️ HUECO DECLARADO, no falla: ' + r.huecoDeclarado);
      console.log('      El verificador lo midió a mano; acá no se puede montar el escenario.');
    } else {
      console.log('   🔴 NO DISCRIMINA: revertir esto no cambia NADA medible. Las defensas vecinas lo');
      console.log('      tapan, la reversión no es la correcta, o el fixture no monta el escenario.');
      fallo = 1;
    }
  } else {
    if (reabre.length) console.log('   ✅ reabre fuga: ' + reabre.join(', '));
    if (rompe.length)  console.log('   ✅ rompe acceso legítimo: ' + rompe.join(', '));
  }
});

console.log(fallo ? '\n🔴 EL DISCRIMINADOR NO PASA.'
  : '\n✅ ' + REV.filter(r => !r.huecoDeclarado).length + ' de ' + REV.length + ' reversiones discriminan'
    + (REV.some(r => r.huecoDeclarado) ? ' (' + REV.filter(r => r.huecoDeclarado).length + ' hueco declarado)' : '')
    + ', y tal cual está no se rompe ningún acceso legítimo'
    + ' (' + DEBE_CAMBIAR.length + ' métricas de fuga, ' + NO_PUEDE.length + ' de acceso legítimo).');
process.exit(fallo);
