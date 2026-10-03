/* ── DISCRIMINADOR de P215 · «un verde no vale sin haber visto el rojo» ─────────────────────────
   (2026-10-03)

   Cinco familias independientes, cada una con su reversión. Y las DOS MITADES de cada una: lo que
   tiene que cambiar (la fuga se cierra) y lo que NO puede cambiar (la cuenta legítima sigue viendo
   lo suyo). Un discriminador que sólo mira la primera no distingue «lo cerré» de «dejé a todos sin
   acceso» — eso costó siete rondas en P214.

   ⚠️ Los nombres de las reversiones NO llevan 🔴: ese emoji marca fallas en la salida, y ponerlo en
   un nombre hace que cualquier `grep` de fallas cuente como error una reversión que discrimina.

   Desde `silva-salud-fatiga/`:   node pruebas/discriminador-p215.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });
const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

/* ⚠️ CUARTA RONDA · UNA REVERSIÓN PUEDE NECESITAR VARIOS PARES, y el motivo es de diseño:
   `construirAliasLeer_` ahora vuelve `nominaEmpresaCanon` IDEMPOTENTE, así que la raíz sola cierra
   todas las fugas de doble canon — y cada arreglo quirúrgico, revertido solo, no cambia nada
   medible. Si los dejara así, el script diría «no discrimina» sobre siete arreglos correctos, o
   peor: alguien los borraría por «muertos». Y declararlos «hueco» sería el error que la familia 4
   ya cobró en este mismo prompt.
   La forma honesta: `L` revierte la RAÍZ sola y tiene que reabrir TODAS las fugas de doble canon
   —eso es lo que prueba que la raíz es la causa—, y cada quirúrgico se mide como
   `raíz + quirúrgico`, que es su escenario real: la segunda línea existe para cuando la primera
   falle. El par de la raíz se agrega solo con `conRaiz: true`. */
const PAR_RAIZ = {
  busca: `  for (var c in canonicos) alias[c] = canonicos[c];\n`,
  pone:  `  // REVERTIDO: el canonico NO gana, el mapa vuelve a ser last-wins sobre toda la hoja\n` };
const pares = r => (r.conRaiz ? [PAR_RAIZ] : []).concat(
  r.pares || (Array.isArray(r.busca) ? r.busca.map(b => ({ busca: b, pone: r.pone })) : [{ busca: r.busca, pone: r.pone }]));
const aplicar = (txt, r) => pares(r).reduce((a, x) => a.split(x.busca).join(x.pone), txt);
const REV = [
  { nombre: 'A · `gestScope` vuelve al bucle sobre las variantes CRUDAS (el sitio 12, el que ESCRIBE)',
    mide: ['escribeAjena'],
    /* ⚠️ Cuarta versión de este ancla: apuntaba al guard `permG`, que resultó código muerto y se
       borró. Ahora apunta al `return` incondicional, que es el mecanismo real. */
    busca: `    return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();
  }
  return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();`,
    pone:  `    for (var iR = 0; iR < acc.empresas.length; iR++) {
      if (norm(acc.empresas[iR]) === norm(e)) return String(acc.empresas[iR]).trim();
    }
    return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();
  }
  return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();` },
  { nombre: 'K · `gestScope` pierde el fallback `|| acc.empresas[0]` (AGREGA acceso: niveles de todas)',
    mide: ['nivelesDeTodas', 'nivelesPropiosConToken'],
    /* ⚠️ ESTO ESTUVO DECLARADO COMO «HUECO DE FIXTURE» Y NO LO ERA. Decía «el emulador no resuelve
       el hash»: sí lo resuelve — se emite un token DE VERDAD con `accionSesionCrear` y después se
       editan las columnas 7 y 8 de la fila de `Sesiones`, que es exactamente el escenario (esa hoja
       la edita gente, y `sesResolver` la lee por ÍNDICE FIJO, así que una columna insertada antes de
       la H también deja `Canonical` vacío).
       Es el SEGUNDO hueco falso de este prompt —el primero fue la familia 4, donde la explicación
       tapó un arreglo que no arreglaba— y los dos salieron de dar por imposible lo que no había
       intentado. La regla que queda: antes de escribir «hueco declarado», intentarlo una vez.
       El defecto que mide: sin el fallback, el scope queda `""` y `nivelesParaAcceso_` hace
       `var todas = !scope || …` — devuelve la escala de TODAS las empresas, con `persona`. Y lo
       introduje yo en la primera versión de P215. */
    busca: `    return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();
  }
  return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();`,
    pone:  `    return String(acc.canonical || "").trim();
  }
  return String(acc.canonical || "").trim();` },
  { nombre: 'I · `marcarCargosCanon` vuelve a `cargoDe` (importa el cargo del HOMÓNIMO)',
    mide: ['cargoDelHomonimo'],
    /* ⚠️ ACÁ DECÍA «hueco declarado: `mapaCargos` necesita un encabezado que no vale la pena
       fabricar». Eran once cadenas, y el hueco no era de fixture: la corrección que había era un
       NO-OP, así que la reversión no movía nada porque no había nada que revertir. Declarar un
       hueco de fixture tapó un arreglo que no arreglaba. */
    /* ⚠️ La familia 4 era la ÚNICA corrección de P215 sin nada que la defendiera: el verificador
       midió que dos mutantes que la reintroducen pasaban el discriminador en exit 0. Y su efecto no
       es de privacidad sino clínico: el cargo del homónimo arrastra su NIVEL DE RIESGO, o sea la
       tolerancia operativa de una persona pasa del mínimo al máximo. */
    /* ⚠️ CUARTA RONDA · TRES PARES, porque el arreglo de verdad fue SACAR `RES.resolver` entero:
       `10-03.3` dejó de usar `res.empresa` pero seguía LLAMANDO a `resolver`, que canoniza su
       argumento adentro. Revertir sólo la línea del cargo no reproducía el defecto. */
    conRaiz: true,
    pares: [
      { busca: `function marcarCargosCanon(registros) {`,
        pone:  `function marcarCargosCanon(registros, RES) {` },
      { busca: `  marcarCargosCanon(registros);\n`,
        pone:  `  marcarCargosCanon(registros, RES);\n` },
      { busca: `    var c = cargoDeCanon(mapa, r.persona, r.empresa || "");   // P159`,
        pone:  `    var res = RES.resolver(r.persona, r.empresa);\n    var c = cargoDeCanon(mapa, res.persona, res.empresa || r.empresa);   // REVERTIDO` }] },
  { nombre: 'J · `cargoDeCanon` vuelve a canonizar su propio argumento',
    mide: ['cargoDelHomonimo'],
    /* ⚠️ ACÁ DECÍA «hueco declarado: `mapaCargos` necesita un encabezado que no vale la pena
       fabricar». Eran once cadenas, y el hueco no era de fixture: la corrección que había era un
       NO-OP, así que la reversión no movía nada porque no había nada que revertir. Declarar un
       hueco de fixture tapó un arreglo que no arreglaba. */
    conRaiz: true,
    busca: `  var e = norm(empCanon || "");`,
    pone:  `  var e = norm(nominaEmpresaCanon(construirAlias(), empCanon || ""));` },
  /* ⚠️ B a E son LAS CUATRO DE LA PROMESA DE LA LÁMINA, y estuvieron perdidas una corrida: al
     reemplazar el bloque de A por su ancla nueva me comí todo lo que había en el medio. El script
     siguió saliendo 0 con siete reversiones en vez de once, o sea informando «todo discrimina»
     sobre una cobertura cuatro reversiones más chica. Lo noté porque el total bajó de 11 a 7 en la
     línea final — por eso ese número se imprime. */
  { nombre: 'B · la BITÁCORA vuelve a `acc.rol` (le llega con nombres a Dirección)',
    mide: ['bitacoraNombres'],
    busca: `  if (acc.vista === "hseq" && !esAdminMaestro_(acc)) eventos = bitacoraParaHseq_(eventos);`,
    pone:  `  if (acc.vista === "hseq" && acc.rol !== "admin") eventos = bitacoraParaHseq_(eventos);` },
  { nombre: 'C · los NIVELES vuelven a `acc.rol` (la tabla le llega con `persona`)',
    mide: ['nivelesPersona'],
    busca: `  var esDireccion = acc.vista === "hseq" && !esAdminMaestro_(acc);`,
    pone:  `  var esDireccion = acc.vista === "hseq" && acc.rol !== "admin";` },
  { nombre: 'D · las OPINIONES vuelven a `acc.rol` (el médico lee el buzón anónimo)',
    mide: ['medicoLeeBuzon'],
    busca: `  if (!esAdminMaestro_(acc) && acc.vista !== "supervisor" && acc.vista !== "hseq" && !acc.combinada) {`,
    pone:  `  if (acc.rol !== "admin" && acc.vista !== "supervisor" && acc.vista !== "hseq" && !acc.combinada) {` },
  { nombre: 'E · la CREDENCIAL vuelve a `acc.rol` (Dirección reinicia contraseñas)',
    mide: ['direccionResetea'],
    busca: `  if (acc.vista === "hseq" && !esAdminMaestro_(acc)) {`,
    pone:  `  if (acc.vista === "hseq" && acc.rol !== "admin") {` },
  { nombre: 'F · `puedeVerEmpresa` vuelve a canonizar el dato del PADRÓN (doble canon)',
    mide: ['padronCruzado'],
    conRaiz: true,
    busca: `    if (puedeVerEmpresaCanon(R.padron.porCedula[c].empresa)) padronVisible[c] = R.padron.porCedula[c];`,
    pone:  `    if (puedeVerEmpresa(R.padron.porCedula[c].empresa)) padronVisible[c] = R.padron.porCedula[c];` },
  { nombre: 'H · el diccionario de la NÓMINA vuelve a `{}` (otro camino del mismo prototipo)',
    mide: ['prototipoNomina'],
    /* ⚠️ Son diccionarios DISTINTOS en acciones distintas: convertir uno no convierte al otro, y
       esto lo encontró la métrica `padronCruzado` cuando el padrón ya estaba sin prototipo y la
       nómina no — dos respuestas incompatibles para la misma cuenta en el mismo prompt. */
    busca: `  if (permitidasN) { set = Object.create(null); permitidasN.forEach(function (x) { set[x] = 1; }); }`,
    pone:  `  if (permitidasN) { set = {}; permitidasN.forEach(function (x) { set[x] = 1; }); }` },
  { nombre: 'G · el diccionario del PANEL vuelve a `{}` (el prototipo deja pasar «Constructor»)',
    mide: ['prototipoPasa'],
    busca: `    var set = Object.create(null); permitidasP.forEach(function (x) { set[x] = 1; });`,
    pone:  `    var set = {}; permitidasP.forEach(function (x) { set[x] = 1; });` },

  /* ══ CUARTA RONDA · LA RAÍZ Y LOS CUATRO SITIOS QUE SEGUÍAN VIVOS ═════════════════════════ */
  { nombre: 'L · LA RAÍZ · `construirAliasLeer_` vuelve a last-wins (`canon` deja de ser idempotente)',
    mide: ['codigoAjenoVale', 'zonaPropia'],
    /* ⚠️ ÉSTA ES LA MEDICIÓN QUE IMPORTA. Si revertir sólo la raíz reabre varias fugas a la vez,
       queda probado que las siete familias de P214 y P215 son SÍNTOMAS de una sola causa — y que
       atenderlas sitio por sitio era necesario pero no suficiente. Si NO reabre ninguna, entonces
       los quirúrgicos son la única defensa y esta raíz no hace lo que dice. */
    busca: PAR_RAIZ.busca, pone: PAR_RAIZ.pone },
  { nombre: 'M · raíz + el UMBRAL DE ANONIMATO vuelve a `leerConfigEmpresa` (lee `anonN` de la ajena)',
    mide: ['umbralAjeno'],
    conRaiz: true,
    busca: `    var n = Math.round(Number(leerConfigEmpresaCanon(empresaCanon).anonN));`,
    pone:  `    var n = Math.round(Number(leerConfigEmpresa(empresaCanon).anonN));` },
  { nombre: 'M2 · raíz + el CONTEO del umbral vuelve a canonizar (cuenta la población de la ajena)',
    mide: ['umbralAjeno'],
    conRaiz: true,
    busca: `    var alias = construirAlias(), emp = norm(empresaCanon || "");`,
    pone:  `    var alias = construirAlias(), emp = norm(nominaEmpresaCanon(construirAlias(), empresaCanon || ""));` },
  { nombre: 'N · raíz + `codigoRegistroDe` vuelve a `valorConfigPropio` (el código de la ajena)',
    mide: ['codigoAjenoVale'],
    /* ⚠️ Esta puerta CONTESTA PRIMERO: el bucle canonicalizador de abajo —que `10-03.3` arregló—
       es sólo la rama de respaldo, así que la familia 2 seguía abierta por la línea de arriba.
       ⚠️ REDUNDANTE MEDIDO, no hueco, y la distinción importa: con la raíz revertida la fuga del
       código se abre IGUAL —lo muestra `L`— porque el desvío no entra por el argumento sino por la
       COLUMNA `Empresa` de `Config Empresa`, que canonizar SÍ es correcto. O sea: este quirúrgico
       no protege nada que la raíz no proteja. Se conserva porque el cambio es correcto y
       consistente con los otros ocho, no porque tenga red propia. Lo contrario —dejarlo contado
       como «discrimina» porque alguna otra métrica se movió— es un instrumento que miente, y es
       justo lo que el campo `mide` vino a cerrar. */
    redundantePor: 'L (la raíz cubre esta fuga sola)',
    conRaiz: true,
    busca: `  var directo = String(valorConfigPropioCanon(empresaCanon, "codigoRegistro") || "").trim();`,
    pone:  `  var directo = String(valorConfigPropio(empresaCanon, "codigoRegistro") || "").trim();` },
  { nombre: 'O · raíz + `pushEnviarCanon` vuelve al doble pase (el aviso va a la empresa ajena)',
    mide: ['pushAlaAjena', 'pushAlaPropia'],
    conRaiz: true,
    busca: `    var subs = suscripcionesDe_(empCanon, persona, cedula);`,
    pone:  `    var subs = suscripcionesDe_(nominaEmpresaCanon(construirAlias(), empCanon || ""), persona, cedula);` },
  { nombre: 'R · raíz + la CONFIG DEL PANEL vuelve a `leerConfigEmpresa` (zona horaria y sector ajenos)',
    mide: ['zonaAjena'],
    conRaiz: true,
    busca: `  var cfgEmpresa = leerConfigEmpresaCanon(gestScope(acc, p.empresa));`,
    pone:  `  var cfgEmpresa = leerConfigEmpresa(gestScope(acc, p.empresa));` },
  { nombre: 'P · la rama del MAESTRO de `gestScope` vuelve al parámetro CRUDO',
    mide: ['maestroVeReporte'],
    /* ⚠️ NO lleva `conRaiz`: este defecto no es de canonización sino de CONTRATO — la función
       prometía devolver siempre un canónico y para la única cuenta admin de producción devolvía el
       crudo. Falla cerrada: pérdida silenciosa, no fuga. */
    busca: `    if (esAdminMaestro_(acc)) return nominaEmpresaCanon(construirAlias(), e);   // el maestro \`*\`: administra todas`,
    pone:  `    if (esAdminMaestro_(acc)) return e;   // REVERTIDO: el crudo` }
];

const falta = REV.filter(r => pares(r).some(x => real.split(x.busca).length - 1 !== 1));
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta.forEach(r => pares(r).filter(x => real.split(x.busca).length - 1 !== 1)
    .forEach(x => console.log('   · ' + r.nombre + '\n       ancla (' + (real.split(x.busca).length - 1)
      + ' veces): ' + JSON.stringify(x.busca.slice(0, 90)))));
  process.exit(3);
}

const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
const SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];
/* ⚠️ LOS ENCABEZADOS REALES, copiados del `.gs` (`SUSCRIPCIONES_HEAD`, `IDENT_HEAD`, y el
   `appendRow` de `obtenerHojaReportes`). Inventarlos es lo que hizo que mi medición del umbral de
   anonimato contara cero en 10-03.3 — R17: el fixture tiene que ser la hoja, no mi idea de la hoja. */
const SUS = ['Endpoint', 'DispositivoId', 'Empresa', 'Persona', 'Cedula', 'P256dh', 'Auth', 'Idioma',
  'Creada', 'UltimaOk', 'Fallos'];
const IDENT = ['Variante', 'Empresa', 'Cedula', 'ResueltoPor', 'Como', 'Registros', 'PrimeraVez', 'UltimaVez'];
const DMY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); })();

/* Un solo fixture para las cinco familias. Lleva, a propósito:
   · `AdmAB`  · «admin» TIPEADO, con una variante que es el nombre de otra empresa (familia 1)
   · `Mia`    · «admin» tipeado y sus claves HSEQ y médica (familias 2)
   · `Sana`   · la misma forma SIN «admin»: es el discriminador de todo lo de la vista
   · `Otra`/`Doble` · los dos saltos de alias (familia 3)
   · `Constructor` · el nombre que colisiona con `Object.prototype` (familia 5) */
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'km', 'admin', '', '', ''],
    ['AdmAB', 'kab', 'admin', 'Alfa, Beta', '', ''],
    ['Beta', 'kb', 'supervisor', 'Beta', '', ''],
    ['Alfa', 'ka', 'supervisor', 'Alfa', '', ''],
    ['Mia', 'kmi', 'admin', 'Mia', 'kmed', 'khseq'],
    ['Sana', 'ks', 'supervisor', 'Sana', 'kmed2', 'khseq2'],
    ['Constructor', 'kc', 'supervisor', 'Constructor', '', ''],
    ['Otra', 'ko', 'supervisor', 'Otra, Equis', '', ''],
    ['Doble', 'kd', 'supervisor', 'Doble, Otra', '', ''],
    /* ⚠️ El escenario de la familia 4: `Hol` reclama el canónico de `Sec` como variante
       no-primera, y hay un HOMÓNIMO en las dos empresas con cargos distintos. */
    ['Sec', 'ksec', 'supervisor', 'Sec, Sec C.A.', '', ''],
    ['Hol', 'khol', 'supervisor', 'Hol, Sec', '', '']],
  'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
    ['Mia', 'ANA MIA', 'V-1', 'Ops', 'Piloto'],
    ['Sana', 'ZOE SANA', 'V-2', 'Ops', 'Piloto'],
    ['Constructor', 'CO PERSONA', 'V-3', 'Ops', 'Piloto'],
    ['Equis', 'EQ PERSONA', 'V-4', 'Ops', 'Piloto'],
    ['Doble', 'DO PERSONA', 'V-5', 'Ops', 'Piloto']],
  /* ⚠️ EL ENCABEZADO REAL de `Registrados Fatiga`, 11 columnas. El de 5 que había antes hacía que
     `regResolverColumnas_` —que procesa ~12 definiciones EN ORDEN y cae a posiciones fijas cuando no
     encuentra el encabezado— devolviera un mapa vacío, y por eso declaré un hueco que NO existía.
     El cargo del homónimo está SÓLO en la empresa ajena: así `marcarCargos` (que usa la empresa
     cruda) no lo encuentra y `marcarCargosCanon` sí corre, que es la condición para que la familia 4
     actúe. */
  'Registrados Fatiga': [['Fecha de registro', 'Fecha y hora', 'Nombre', 'Email', 'Cedula', 'ID Piloto',
      'Piloto', 'Supervisor', 'Empresa', 'Departamento', 'Cargo'],
    ['x', 'x', 'JOSE RODRIGUEZ', 'b@b', 'V-71', '', 'Si', 'No', 'Hol', 'Ops', 'Comandante']],
  /* el formulario: 90 columnas y DOS filas de encabezado (`parseRegistros` arranca en r=2) */
  /* ⚠️ CUARTA RONDA · Y CON SU POBLACIÓN: `aplicarUmbralAnon_` cuenta personas por área sobre
     ESTOS registros (no sobre la nómina), así que el fixture lleva 2 en `Sec C.A.`/Ops —debajo del
     `anonN` de 5 que tiene Sec, o sea que el área se TAPA— y 8 en `Hol`/Ops, que es la población
     que el doble canon hacía contar en su lugar. Sin estas filas la función medía cero y el verde
     no valía nada: es la misma trampa que el verificador encontró en mi medición de 10-03.3. */
  'Respuestas de formulario 1': (function () {
    const cab = new Array(90).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa';
    const d = new Date(), z = n => String(n).padStart(2, '0');
    const dmy = z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear();
    const fila = (nombre, empresa) => { const f = new Array(90).fill('');
      f[0] = dmy; f[1] = nombre; f[2] = 'Ops'; f[72] = empresa; f[73] = dmy; f[86] = '5'; return f; };
    const filas = [fila('JOSE RODRIGUEZ', 'Sec C.A.'), fila('SEGUNDA DE SEC', 'Sec C.A.')];
    for (let i = 1; i <= 8; i++) filas.push(fila('HOL PERSONA ' + i, 'Hol'));
    return [cab, cab.slice()].concat(filas);
  })(),
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [HOY, '08:00', HOY + 'T08:00:00', 'e1', 'ANA MIA', 'Mia', 'Ops', 'Piloto', 'inicio', '', '', ''],
    [HOY, '09:00', HOY + 'T09:00:00', 'e2', 'CO PERSONA', 'Constructor', 'Ops', 'Piloto', 'inicio', '', '', ''],
    /* SIN cargo en la fila: es la única forma de que `marcarCargosCanon` actúe */
    [HOY, '10:00', HOY + 'T10:00:00', 'e3', 'JOSE RODRIGUEZ', 'Sec C.A.', 'Ops', '', 'inicio', '', '', '']],
  'Niveles Riesgo': [['Empresa', 'Persona', 'Departamento', 'Cargo', 'Nivel'],
    ['Mia', 'ANA MIA', 'Ops', 'Piloto', '4'], ['Sana', 'ZOE SANA', 'Ops', 'Piloto', '4']],
  'Opiniones': [['ID', 'Empresa', 'Fecha', 'Texto', 'Anonimo'],
    ['o1', 'Mia', HOY, 'texto anonimo', 'si'], ['o2', 'Sana', HOY, 'texto anonimo', 'si']],
  /* ⚠️ EL ENCABEZADO REAL (`CRED_HEAD`): 11 columnas, `Cedula` SEGUNDA, sin `Persona`. El de 7
     que tenía antes hacía que `accionCredencialReiniciar` contestara `sin_credencial`, y las dos
     métricas de credencial medían `motivo !== 'sin_permiso'` — o sea, daban el resultado correcto
     por la razón equivocada: medían el permiso sobre una hoja mal formada. */
  'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo', 'Rol',
      'Estado', 'Creada', 'UltimoAcceso'],
    ['Mia', 'V-1', 'ANA MIA', 'h', 's', '150', 'PBKDF2', '', 'activa', HOY, HOY],
    ['Sana', 'V-2', 'ZOE SANA', 'h', 's', '150', 'PBKDF2', '', 'activa', HOY, HOY]],
  'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra'],
    [HOY, 'Mia', 'restriccion', 'ANA MIA', 'sup', 'supervisor', 'panel', 'x', '5', '6.9', 'b1', 'h',
     '{"accion":"restriccion","sujeto":"ANA MIA"}'],
    [HOY, 'Sana', 'restriccion', 'ZOE SANA', 'sup', 'supervisor', 'panel', 'x', '5', '6.9', 'b2', 'h',
     '{"accion":"restriccion","sujeto":"ZOE SANA"}']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  'Sesiones': [SES],
  /* ⚠️ CUARTA RONDA · `anonN` y `codigoRegistro` DISTINTOS en las dos empresas: es la única forma
     de distinguir «leí el mío» de «leí el de al lado». Hol con `anonN:0` —«sin umbral»— y Sec con
     5; y `zonaHoraria`, que define qué día es «hoy» para el ciclo. */
  'Config Empresa': [['Empresa', 'Clave', 'Valor'],
    ['Sec', 'anonN', '5'],               ['Hol', 'anonN', '0'],
    ['Sec', 'codigoRegistro', 'SEC-2026'], ['Hol', 'codigoRegistro', 'HOL-2026'],
    ['Sec', 'zonaHoraria', 'America/Caracas'], ['Hol', 'zonaHoraria', 'Asia/Tokyo']],
  'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario'],
    [DMY, 'r1', 'fatiga', 'false', '', 'Sec', 'Ops', '', 'texto anonimo']],
  'Suscripciones': [SUS,
    ['https://push.test/SEC', 'dSec', 'Sec', 'JOSE RODRIGUEZ', '', 'p', 'a', 'es', HOY, HOY, 0],
    ['https://push.test/HOL', 'dHol', 'Hol', 'JOSE RODRIGUEZ', '', 'p', 'a', 'es', HOY, HOY, 0]],
  'Identidades': [IDENT]
});

function medir(txt) {
  /* ⚠️ `responderFetch`: el emulador LANZA si una prueba dispara red sin configurarla, a propósito.
     Acá hace falta porque el push sale por `UrlFetchApp.fetch`, y lo que se mide es A QUÉ ENDPOINT
     va — cada suscripción del fixture tiene una URL que dice de qué empresa es. */
  const env = GS.crearEntorno(HOJAS(), { responderFetch: () => ({
    getResponseCode: () => 201, getContentText: () => '' }) });
  const api = GS.cargarGs(txt, env, ['gestScope', 'ausScope', 'validarAcceso', 'construirAlias',
    'accionBitacora', 'accionNivelesRiesgo', 'accionOpiniones', 'accionCredencialReiniciar',
    'accionIdentidadesInforme', 'accionNominaListar', 'accionSupervisor',
    'mapaCargos', 'cargoDeCanon', 'nominaEmpresaCanon',
    'accionReportesLeer', 'verificarCodigoEmpresa', 'pushEnviarCanon', 'accionSesionCrear']);
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };
  const alias = api.construirAlias();
  const adm = api.validarAcceso('AdmAB', 'kab', 'd');
  const mae = api.validarAcceso('*', 'km', 'd');
  const sup = api.validarAcceso('Beta', 'kb', 'd');
  const bitCon = (u, pw, e) => /ANA MIA|ZOE SANA/.test(JSON.stringify(
    J(api.accionBitacora({ usuario: u, pass: pw, dispositivoId: 'd', empresa: e })).eventos || []));
  const nivCon = (u, pw, e) => /ANA MIA|ZOE SANA/.test(JSON.stringify(
    J(api.accionNivelesRiesgo({ usuario: u, pass: pw, dispositivoId: 'd', empresa: e }))));
  const opiOk = (u, pw, e) => !!J(api.accionOpiniones({ usuario: u, pass: pw, dispositivoId: 'd', empresa: e })).ok;
  const creOk = (u, pw, e, c) => J(api.accionCredencialReiniciar({ usuario: u, pass: pw,
    dispositivoId: 'd', empresa: e, cedula: c, _post: true })).motivo !== 'sin_permiso';
  const padron = (u, pw) => Number(J(api.accionIdentidadesInforme({ usuario: u, pass: pw, dispositivoId: 'd' })).enPadron || 0);
  const nomina = (u, pw) => (J(api.accionNominaListar({ usuario: u, pass: pw, dispositivoId: 'd' })).nomina || []).length;
  const panel = (u, pw) => (J(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd' })).operacional || [])
    .map(x => String(x.persona)).join('|');
  /* Emite un token REAL y después deja `Canonical` vacío con `Empresas` cargado — el estado que
     `validarAcceso` por contraseña nunca produce y que `sesResolver` sí, leyendo por índice fijo. */
  const tokenConCanonicalVacio = (usuario, clave) => {
    let tk = null;
    try { const r = J(api.accionSesionCrear({ usuario: usuario, pass: clave, dispositivoId: 'd', _post: true }));
          tk = r.sesion || r.token || null; } catch (e) { return null; }
    if (!tk) return null;
    const sh = env.__libro.getSheetByName('Sesiones');
    if (sh.getDataRange().getValues().length < 2) return null;
    sh.getRange(2, 7).setValue('["' + usuario + '"]');   // Empresas, cargado
    sh.getRange(2, 8).setValue('');                      // Canonical, VACÍO
    return tk;
  };
  return {
    /* ── LO QUE TIENE QUE CAMBIAR ── */
    escribeAjena:    String(api.gestScope(adm, 'Beta')).toLowerCase() === 'beta',
    bitacoraNombres: bitCon('Mia', 'khseq', 'Mia'),
    nivelesPersona:  nivCon('Mia', 'khseq', 'Mia'),
    medicoLeeBuzon:  opiOk('Mia', 'kmed', 'Mia'),
    direccionResetea: creOk('Mia', 'khseq', 'Mia', 'V-1'),
    padronCruzado:   padron('Doble', 'kd') !== nomina('Doble', 'kd'),
    /* ⚠️ UN SUPERVISOR, no un admin: la rama admin de `accionSupervisor` filtra con `enAlcance` y
       la supervisor con `enSet`, y el diccionario que esta reversión toca es el de la segunda. La
       primera versión medía `Mia`, que tiene «admin» tipeado, así que revertir no movía nada. */
    prototipoPasa:   /CO PERSONA/.test(panel('Sana', 'ks')),
    /* y el mismo prototipo por el camino de la NÓMINA, que es otro diccionario */
    /* ⚠️ LA FAMILIA 4, MEDIDA POR EL CAMINO REAL (`accionSupervisor`), que es lo que faltaba. La
       versión anterior la medía llamando a `cargoDeCanon` suelto y declaraba un hueco falso: el
       arreglo que tenía era un NO-OP, porque la canonización que hace el daño está dentro de
       `RES.resolver` y no en la que se había sacado. `RES.aplicar` corre una línea antes del
       llamador, así que `r.empresa` ya viene canonizada UNA vez y `res.empresa` lleva DOS. */
    cargoDelHomonimo: (function () { try {
      const d = J(api.accionSupervisor({ usuario: 'Sec', pass: 'ksec', dispositivoId: 'd' }));
      const r = (d.registros || []).filter(function (x) { return String(x.persona) === 'JOSE RODRIGUEZ'; })[0];
      return !!r && String(r.cargo || '') === 'Comandante';     // el cargo de la OTRA empresa
    } catch (e) { return false; } })(),
    prototipoNomina: (function () { try {
      return (J(api.accionNominaListar({ usuario: 'Sana', pass: 'ks', dispositivoId: 'd' })).nomina || [])
        .some(function (x) { return String(x.persona) === 'CO PERSONA'; });
    } catch (e) { return false; } })(),
    /* ── LO QUE **NO** PUEDE CAMBIAR ── */
    maestroEscribeLibre: api.gestScope(mae, 'Beta') === 'Beta',
    supAnclado:          api.gestScope(sup, 'Alfa') === 'Beta',
    admEscribeLaSuya:    String(api.gestScope(adm, 'Alfa')).toLowerCase() === 'alfa',
    scopesCoinciden:     String(api.gestScope(adm, 'Beta')).toLowerCase()
                           === String(api.ausScope(adm, alias, 'Beta')).toLowerCase(),
    sanaBitSeudo:        !bitCon('Sana', 'khseq2', 'Sana'),
    sanaNivSinPersona:   !nivCon('Sana', 'khseq2', 'Sana'),
    sanaMedicoSinBuzon:  !opiOk('Sana', 'kmed2', 'Sana'),
    otraVeLaSuya:        nomina('Otra', 'ko') >= 1,
    miaVeLaSuya:         /ANA MIA/.test(panel('Mia', 'kmi')),
    sanaVeLaSuya:        (J(api.accionNominaListar({ usuario: 'Sana', pass: 'ks', dispositivoId: 'd' })).nomina || [])
                           .some(function (x) { return String(x.persona) === 'ZOE SANA'; }),
    /* ⚠️ LOS TRES ASERTOS POSITIVOS DE LA FAMILIA 2, que faltaban. El verificador midió que de los
       cuatro, sólo la bitácora tenía uno: romper `nivelesParaAcceso_` para que devuelva `[]`, o
       negarle la bandeja al supervisor, o negarle el reinicio al supervisor, **pasaban el
       discriminador en verde**. «Lo cerré» era indistinguible de «dejé a todos sin acceso», que es
       exactamente lo que el encabezado de este archivo advierte en sus primeras líneas. */
    /* ⚠️ CON LA CLAVE DE SUPERVISOR, no la de HSEQ. La primera versión medía con `khseq2` y daba
       `niveles: []` — que es lo CORRECTO: a Dirección la tabla nominal no le llega, ésa es la
       promesa de la lámina. O sea mi aserto «positivo» afirmaba un derecho que no existe, por sexta
       vez en este prompt. Quien tiene que recibirlos es el supervisor. */
    nivelesLlegan:       (J(api.accionNivelesRiesgo({ usuario: 'Sana', pass: 'ks',
                           dispositivoId: 'd', empresa: 'Sana' })).niveles || []).length > 0,
    supervisorVeBuzon:   !!J(api.accionOpiniones({ usuario: 'Sana', pass: 'ks', dispositivoId: 'd', empresa: 'Sana' })).ok,
    supervisorReinicia:  J(api.accionCredencialReiniciar({ usuario: 'Sana', pass: 'ks',
                           dispositivoId: 'd', empresa: 'Sana', cedula: 'V-2', _post: true })).motivo !== 'sin_permiso',
    constructorVeLaSuya: /CO PERSONA/.test(panel('Constructor', 'kc')),

    /* ══ CUARTA RONDA · LOS CUATRO SITIOS QUE EL VERIFICADOR ENCONTRÓ VIVOS ═══════════════════
       Cada uno con SUS DOS MITADES, porque «se cerró» y «dejé de leer cualquier cosa» se ven igual
       desde una sola métrica — el error que el encabezado de este archivo advierte. */

    /* ⚠️ EL UMBRAL DE ANONIMATO, por `accionReportesLeer`, que es el camino real. `Sec/Ops` tiene
       2 personas y Sec configuró `anonN:5`, así que el área TIENE que salir vacía. Con el doble
       canon se leía el `anonN:0` de Hol («sin umbral») y/o se contaba su población de 8: el área
       salía publicada con su nombre, a un supervisor común, contra la promesa escrita de
       `doc_12_p`. Es R4. */
    umbralAjeno: (function () { try {
      const d = J(api.accionReportesLeer({ usuario: 'Sec', pass: 'ksec', dispositivoId: 'd', empresa: 'Sec' }));
      const r = (d.reportes || []).filter(x => x.id === 'r1')[0];
      return !!r && String(r.departamento || '') === 'Ops';      // el área de 2 personas, publicada
    } catch (e) { return false; } })(),

    /* ⚠️ EL CÓDIGO DE REGISTRO. Las dos empresas tienen código y son distintos, así que leer el
       de al lado tiene DOS consecuencias opuestas y las dos son defecto: se acepta el ajeno (fuga)
       y se rechaza el propio (la empresa entera sin poder darse de alta). */
    codigoAjenoVale: (function () { try {
      return api.verificarCodigoEmpresa('Sec', 'HOL-2026').ok === true;
    } catch (e) { return false; } })(),

    /* ⚠️ EL PUSH. `accionTareaGuardar` llama con el `scope` que `gestScope` ya canonizó; el
       doble pase lo mandaba a la empresa ajena, así que la persona de Sec no recibía el aviso de
       SU tarea y la de Hol sí — y con un 410 del servicio le borraba la suscripción. Se mide por
       DÓNDE salió el fetch, que es el hecho observable. */
    pushAlaAjena: (function () { try {
      const sup = api.validarAcceso('Sec', 'ksec', 'd');
      api.pushEnviarCanon(api.gestScope(sup, 'Sec'), 'JOSE RODRIGUEZ', '', 'tarea');
      return (env.__registro.fetches || []).some(f => /\/HOL$/.test(String(f.url)));
    } catch (e) { return false; } })(),

    /* ⚠️ LA CONFIG DEL PANEL. `zonaHoraria` define qué día es «hoy» para el ciclo operativo;
       leîda de la empresa ajena, el check-in de un piloto queda guardado bajo otra fecha. */
    zonaAjena: (function () { try {
      const d = J(api.accionSupervisor({ usuario: 'Sec', pass: 'ksec', dispositivoId: 'd', empresa: 'Sec' }));
      return String((d.config || {}).zonaHoraria || '') === 'Asia/Tokyo';
    } catch (e) { return false; } })(),

    /* ── y las mitades que NO pueden cambiar ── */
    umbralPropioTapa: (function () { try {
      const d = J(api.accionReportesLeer({ usuario: 'Sec', pass: 'ksec', dispositivoId: 'd', empresa: 'Sec' }));
      const r = (d.reportes || []).filter(x => x.id === 'r1')[0];
      return !!r && String(r.departamento || '') === '';         // el reporte LLEGA, sin el área
    } catch (e) { return false; } })(),
    codigoPropioVale: (function () { try {
      return api.verificarCodigoEmpresa('Sec', 'SEC-2026').ok === true;
    } catch (e) { return false; } })(),
    pushAlaPropia: (function () { try {
      const sup = api.validarAcceso('Sec', 'ksec', 'd');
      api.pushEnviarCanon(api.gestScope(sup, 'Sec'), 'JOSE RODRIGUEZ', '', 'tarea');
      return (env.__registro.fetches || []).some(f => /\/SEC$/.test(String(f.url)));
    } catch (e) { return false; } })(),
    zonaPropia: (function () { try {
      const d = J(api.accionSupervisor({ usuario: 'Sec', pass: 'ksec', dispositivoId: 'd', empresa: 'Sec' }));
      return String((d.config || {}).zonaHoraria || '') === 'America/Caracas';
    } catch (e) { return false; } })(),
    /* ⚠️ EL MAESTRO PIDIENDO POR LA VARIANTE. `gestScope` devolvía `"Sec C.A."` crudo y la columna
       Empresa del reporte dice `Sec`: el desglose desaparecía sin que nadie se enterara. Falla
       cerrada — pérdida, no fuga, y por eso va de este lado. */
    /* ⚠️ EL CAMINO DEL TOKEN, que es el único que produce `empresas` cargado con `canonical`
       VACÍO. Se emite el token de verdad y DESPUÉS se edita la fila —no se fabrica el `acc`—, que
       es R17: el estado lo produce la capa real (`accionSesionCrear` + `sesResolver`). */
    nivelesDeTodas: (function () { try {
      const t = tokenConCanonicalVacio('Sana', 'ks');
      if (!t) return false;
      return (J(api.accionNivelesRiesgo({ usuario: 'Sana', pass: t, dispositivoId: 'd', empresa: 'Sana' })).niveles || []).length > 1;
    } catch (e) { return false; } })(),
    nivelesPropiosConToken: (function () { try {
      const t = tokenConCanonicalVacio('Sana', 'ks');
      if (!t) return false;
      const n = J(api.accionNivelesRiesgo({ usuario: 'Sana', pass: t, dispositivoId: 'd', empresa: 'Sana' })).niveles || [];
      return n.length === 1 && /ZOE SANA/.test(JSON.stringify(n));   // la suya, y sólo la suya
    } catch (e) { return false; } })(),
    maestroVeReporte: (function () { try {
      const d = J(api.accionReportesLeer({ usuario: '*', pass: 'km', dispositivoId: 'd', empresa: 'Sec C.A.' }));
      return (d.reportes || []).length > 0;
    } catch (e) { return false; } })()
  };
}

const DEBE = ['escribeAjena', 'bitacoraNombres', 'nivelesPersona', 'medicoLeeBuzon',
              'direccionResetea', 'padronCruzado', 'prototipoPasa', 'prototipoNomina', 'cargoDelHomonimo',
              'umbralAjeno', 'codigoAjenoVale', 'pushAlaAjena', 'zonaAjena', 'nivelesDeTodas'];
const NO_PUEDE = ['maestroEscribeLibre', 'supAnclado', 'admEscribeLaSuya', 'scopesCoinciden',
                  'sanaBitSeudo', 'sanaNivSinPersona', 'sanaMedicoSinBuzon', 'otraVeLaSuya',
                  'miaVeLaSuya', 'constructorVeLaSuya', 'sanaVeLaSuya', 'nivelesLlegan', 'supervisorVeBuzon', 'supervisorReinicia',
                  'umbralPropioTapa', 'codigoPropioVale', 'pushAlaPropia', 'zonaPropia', 'maestroVeReporte',
                  'nivelesPropiosConToken'];

let base;
try { base = medir(real); } catch (e) { console.log('🔴 no pude medir el `.gs` tal cual: ' + e.message); process.exit(3); }
console.log('── TAL CUAL ESTÁ (lo que P215 dejó) ──');
DEBE.forEach(k => console.log(`   ${base[k] ? '🔴' : '✅'} ${k} = ${base[k]}   (se espera false)`));
NO_PUEDE.forEach(k => console.log(`   ${base[k] ? '✅' : '🔴'} ${k} = ${base[k]}   (se espera true)`));

let fallo = 0;
if (DEBE.some(k => base[k]))      { console.log('\n🔴 con el `.gs` TAL CUAL queda una fuga abierta.'); fallo = 1; }
if (NO_PUEDE.some(k => !base[k])) { console.log('\n🔴 con el `.gs` TAL CUAL se rompió un acceso LEGÍTIMO.'); fallo = 1; }

REV.forEach(r => {
  console.log('\n── REVERTIDO · ' + r.nombre + ' ──');
  let m;
  try { m = medir(aplicar(real, r)); }
  catch (e) { console.log('   🔴 el mutante no corre (' + e.message + '): no mide nada'); fallo = 1; return; }
  const reabre = DEBE.filter(k => m[k]);
  const rompe  = NO_PUEDE.filter(k => !m[k]);
  DEBE.forEach(k => { if (m[k] !== base[k]) console.log(`   ⚡ ${k}: ${base[k]} → ${m[k]}`); });
  NO_PUEDE.forEach(k => { if (m[k] !== base[k]) console.log(`   ⚡ ${k}: ${base[k]} → ${m[k]}`); });
  /* ⚠️ CUARTA RONDA · «ALGO SE MOVIÓ» NO ES «ESTO DISCRIMINA». Una reversión que declara `mide`
     tiene que mover ESA métrica. Sin esto, cada mutante con `conRaiz` pasaba en verde porque la
     raíz revertida mueve `zonaPropia` — y `N`, que no protege nada por su cuenta, se contaba como
     cubierto. Es la misma forma de instrumento que miente que ya costó cuatro medidores en este
     proyecto: el medidor daba un resultado, pero sobre otra cosa. */
  const suyas = (r.mide || []).filter(k => m[k] !== base[k]);
  const noMideLoSuyo = (r.mide || []).length > 0 && !suyas.length;
  if (noMideLoSuyo) {
    if (r.redundantePor) {
      console.log('   ⚠️ REDUNDANTE MEDIDO (no hueco): no mueve ' + r.mide.join('/')
        + ' — ya lo cubre ' + r.redundantePor);
    } else {
      console.log('   🔴 NO MIDE LO SUYO: cambió otra cosa, pero ' + r.mide.join('/') + ' no se movió.');
      fallo = 1;
    }
  } else if (!reabre.length && !rompe.length) {
    if (r.huecoDeclarado) {
      console.log('   ⚠️ HUECO DECLARADO, no falla: ' + r.huecoDeclarado);
      console.log('      El verificador lo midió entrando por el camino real.');
    } else {
      console.log('   🔴 NO DISCRIMINA: revertir esto no cambia NADA medible.');
      fallo = 1;
    }
  } else {
    if (suyas.length)  console.log('   ✅ mueve LO SUYO: ' + suyas.join(', '));
    if (reabre.length) console.log('   ✅ reabre fuga: ' + reabre.join(', '));
    if (rompe.length)  console.log('   ✅ rompe acceso legítimo: ' + rompe.join(', '));
  }
});

const aparte = REV.filter(r => r.huecoDeclarado || r.redundantePor).length;
console.log(fallo ? '\n🔴 EL DISCRIMINADOR NO PASA.'
  : `\n✅ ${REV.length - aparte} de ${REV.length} reversiones discriminan MOVIENDO LO SUYO`
    + (aparte ? ` (${REV.filter(r => r.huecoDeclarado).length} hueco declarado, `
       + `${REV.filter(r => r.redundantePor).length} redundante medido)` : '')
    + `, y tal cual está no se rompe ningún acceso legítimo`
    + ` (${DEBE.length} métricas de fuga, ${NO_PUEDE.length} de acceso legítimo).`);
process.exit(fallo);
