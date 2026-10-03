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

const REV = [
  { nombre: 'A · `gestScope` vuelve al bucle sobre las variantes CRUDAS (el sitio 12, el que ESCRIBE)',
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
    /* ⚠️ HUECO DECLARADO · su escenario necesita un `acc` con `empresas` cargado y `canonical`
       VACÍO, y eso sólo sale del camino del TOKEN: `validarAcceso` por contraseña siempre pone
       canónico. Montarlo pide una fila de `Sesiones` con hash válido, que el emulador no resuelve
       (mismo límite que P214 ya declaró).
       ⚠️ El verificador SÍ lo midió: con esa fila, `gestScope` devolvía `""` y `nivelesParaAcceso_`
       lo lee como «todas» —1 fila pasaba a 2, la ajena con su nivel—, más la pérdida de la bitácora
       propia y de los umbrales propios. Y es la reversión del defecto que YO introduje en este
       prompt, así que vale tenerla escrita aunque no se pueda medir acá. */
    huecoDeclarado: 'necesita una sesión con `Canonical` vacío; el emulador no resuelve el hash',
    /* ⚠️ Ésta es la reversión del hallazgo que frenó la publicación: sin el fallback, con
       `Canonical` vacío en `Sesiones` el scope queda `""` y `nivelesParaAcceso_` lo lee como
       «todas». No tenía reversión porque el defecto lo introduje yo en este mismo prompt. */
    busca: `    return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();
  }
  return String(acc.canonical || (acc.empresas && acc.empresas[0]) || "").trim();`,
    pone:  `    return String(acc.canonical || "").trim();
  }
  return String(acc.canonical || "").trim();` },
  { nombre: 'I · `marcarCargosCanon` vuelve a `cargoDe` (importa el cargo del HOMÓNIMO)',
    /* ⚠️ ACÁ DECÍA «hueco declarado: `mapaCargos` necesita un encabezado que no vale la pena
       fabricar». Eran once cadenas, y el hueco no era de fixture: la corrección que había era un
       NO-OP, así que la reversión no movía nada porque no había nada que revertir. Declarar un
       hueco de fixture tapó un arreglo que no arreglaba. */
    /* ⚠️ La familia 4 era la ÚNICA corrección de P215 sin nada que la defendiera: el verificador
       midió que dos mutantes que la reintroducen pasaban el discriminador en exit 0. Y su efecto no
       es de privacidad sino clínico: el cargo del homónimo arrastra su NIVEL DE RIESGO, o sea la
       tolerancia operativa de una persona pasa del mínimo al máximo. */
    busca: `    var c = cargoDeCanon(mapa, res.persona, r.empresa || "");   // P159`,
    pone:  `    var c = cargoDeCanon(mapa, res.persona, res.empresa || r.empresa);   // REVERTIDO: la DOBLE` },
  { nombre: 'J · `cargoDeCanon` vuelve a canonizar su propio argumento',
    /* ⚠️ ACÁ DECÍA «hueco declarado: `mapaCargos` necesita un encabezado que no vale la pena
       fabricar». Eran once cadenas, y el hueco no era de fixture: la corrección que había era un
       NO-OP, así que la reversión no movía nada porque no había nada que revertir. Declarar un
       hueco de fixture tapó un arreglo que no arreglaba. */
    busca: `  var e = norm(empCanon || "");`,
    pone:  `  var e = norm(nominaEmpresaCanon(construirAlias(), empCanon || ""));` },
  /* ⚠️ B a E son LAS CUATRO DE LA PROMESA DE LA LÁMINA, y estuvieron perdidas una corrida: al
     reemplazar el bloque de A por su ancla nueva me comí todo lo que había en el medio. El script
     siguió saliendo 0 con siete reversiones en vez de once, o sea informando «todo discrimina»
     sobre una cobertura cuatro reversiones más chica. Lo noté porque el total bajó de 11 a 7 en la
     línea final — por eso ese número se imprime. */
  { nombre: 'B · la BITÁCORA vuelve a `acc.rol` (le llega con nombres a Dirección)',
    busca: `  if (acc.vista === "hseq" && !esAdminMaestro_(acc)) eventos = bitacoraParaHseq_(eventos);`,
    pone:  `  if (acc.vista === "hseq" && acc.rol !== "admin") eventos = bitacoraParaHseq_(eventos);` },
  { nombre: 'C · los NIVELES vuelven a `acc.rol` (la tabla le llega con `persona`)',
    busca: `  var esDireccion = acc.vista === "hseq" && !esAdminMaestro_(acc);`,
    pone:  `  var esDireccion = acc.vista === "hseq" && acc.rol !== "admin";` },
  { nombre: 'D · las OPINIONES vuelven a `acc.rol` (el médico lee el buzón anónimo)',
    busca: `  if (!esAdminMaestro_(acc) && acc.vista !== "supervisor" && acc.vista !== "hseq" && !acc.combinada) {`,
    pone:  `  if (acc.rol !== "admin" && acc.vista !== "supervisor" && acc.vista !== "hseq" && !acc.combinada) {` },
  { nombre: 'E · la CREDENCIAL vuelve a `acc.rol` (Dirección reinicia contraseñas)',
    busca: `  if (acc.vista === "hseq" && !esAdminMaestro_(acc)) {`,
    pone:  `  if (acc.vista === "hseq" && acc.rol !== "admin") {` },
  { nombre: 'F · `puedeVerEmpresa` vuelve a canonizar el dato del PADRÓN (doble canon)',
    busca: `    if (puedeVerEmpresaCanon(R.padron.porCedula[c].empresa)) padronVisible[c] = R.padron.porCedula[c];`,
    pone:  `    if (puedeVerEmpresa(R.padron.porCedula[c].empresa)) padronVisible[c] = R.padron.porCedula[c];` },
  { nombre: 'H · el diccionario de la NÓMINA vuelve a `{}` (otro camino del mismo prototipo)',
    /* ⚠️ Son diccionarios DISTINTOS en acciones distintas: convertir uno no convierte al otro, y
       esto lo encontró la métrica `padronCruzado` cuando el padrón ya estaba sin prototipo y la
       nómina no — dos respuestas incompatibles para la misma cuenta en el mismo prompt. */
    busca: `  if (permitidasN) { set = Object.create(null); permitidasN.forEach(function (x) { set[x] = 1; }); }`,
    pone:  `  if (permitidasN) { set = {}; permitidasN.forEach(function (x) { set[x] = 1; }); }` },
  { nombre: 'G · el diccionario del PANEL vuelve a `{}` (el prototipo deja pasar «Constructor»)',
    busca: `    var set = Object.create(null); permitidasP.forEach(function (x) { set[x] = 1; });`,
    pone:  `    var set = {}; permitidasP.forEach(function (x) { set[x] = 1; });` }
];

const comoLista = r => Array.isArray(r.busca) ? r.busca : [r.busca];
const aplicar = (txt, r) => comoLista(r).reduce((a, b) => a.split(b).join(r.pone), txt);
const falta = REV.filter(r => comoLista(r).some(b => real.split(b).length - 1 !== 1));
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta.forEach(r => console.log('   · ' + r.nombre));
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
  'Respuestas de formulario 1': (function () {
    const cab = new Array(90).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa';
    const f = new Array(90).fill('');
    const d = new Date(), z = n => String(n).padStart(2, '0');
    const dmy = z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear();
    f[0] = dmy; f[1] = 'JOSE RODRIGUEZ'; f[2] = 'Ops'; f[72] = 'Sec C.A.'; f[73] = dmy; f[86] = '5';
    return [cab, cab.slice(), f];
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
  'Credenciales': [['Empresa', 'Persona', 'Cedula', 'Hash', 'Sal', 'Estado', 'TS'],
    ['Mia', 'ANA MIA', 'V-1', 'h', 's', 'activa', '1']],
  'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra'],
    [HOY, 'Mia', 'restriccion', 'ANA MIA', 'sup', 'supervisor', 'panel', 'x', '5', '6.9', 'b1', 'h',
     '{"accion":"restriccion","sujeto":"ANA MIA"}'],
    [HOY, 'Sana', 'restriccion', 'ZOE SANA', 'sup', 'supervisor', 'panel', 'x', '5', '6.9', 'b2', 'h',
     '{"accion":"restriccion","sujeto":"ZOE SANA"}']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  'Sesiones': [SES]
});

function medir(txt) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(txt, env, ['gestScope', 'ausScope', 'validarAcceso', 'construirAlias',
    'accionBitacora', 'accionNivelesRiesgo', 'accionOpiniones', 'accionCredencialReiniciar',
    'accionIdentidadesInforme', 'accionNominaListar', 'accionSupervisor',
    'mapaCargos', 'cargoDeCanon', 'nominaEmpresaCanon']);
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
    constructorVeLaSuya: /CO PERSONA/.test(panel('Constructor', 'kc'))
  };
}

const DEBE = ['escribeAjena', 'bitacoraNombres', 'nivelesPersona', 'medicoLeeBuzon',
              'direccionResetea', 'padronCruzado', 'prototipoPasa', 'prototipoNomina', 'cargoDelHomonimo'];
const NO_PUEDE = ['maestroEscribeLibre', 'supAnclado', 'admEscribeLaSuya', 'scopesCoinciden',
                  'sanaBitSeudo', 'sanaNivSinPersona', 'sanaMedicoSinBuzon', 'otraVeLaSuya',
                  'miaVeLaSuya', 'constructorVeLaSuya', 'sanaVeLaSuya', 'nivelesLlegan', 'supervisorVeBuzon', 'supervisorReinicia'];

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
  if (!reabre.length && !rompe.length) {
    if (r.huecoDeclarado) {
      console.log('   ⚠️ HUECO DECLARADO, no falla: ' + r.huecoDeclarado);
      console.log('      El verificador lo midió entrando por el camino real.');
    } else {
      console.log('   🔴 NO DISCRIMINA: revertir esto no cambia NADA medible.');
      fallo = 1;
    }
  } else {
    if (reabre.length) console.log('   ✅ reabre fuga: ' + reabre.join(', '));
    if (rompe.length)  console.log('   ✅ rompe acceso legítimo: ' + rompe.join(', '));
  }
});

console.log(fallo ? '\n🔴 EL DISCRIMINADOR NO PASA.'
  : `\n✅ ${REV.filter(r => !r.huecoDeclarado).length} de ${REV.length} reversiones discriminan`
    + (REV.some(r => r.huecoDeclarado) ? ` (${REV.filter(r => r.huecoDeclarado).length} huecos declarados)` : '')
    + `, y tal cual está no se rompe ningún acceso legítimo`
    + ` (${DEBE.length} métricas de fuga, ${NO_PUEDE.length} de acceso legítimo).`);
process.exit(fallo);
