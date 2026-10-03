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
    busca: `    var permG = empresasPermitidas_(acc);
    if (permG && permG.indexOf(norm(nominaEmpresaCanon(construirAlias(), e))) < 0) {
      return String(acc.canonical || "").trim();          // no es suya: cae a la propia
    }`,
    pone:  `    for (var iR = 0; iR < acc.empresas.length; iR++) {
      if (norm(acc.empresas[iR]) === norm(e)) return String(acc.empresas[iR]).trim();
    }` },
  { nombre: 'B · la BITÁCORA vuelve a `acc.rol` (le llega con nombres a Dirección)',
    /* ⚠️ Las anclas salen del archivo REAL, no escritas a mano: el `.gs` indenta con DOS
       espacios y la primera versión de este script usó cuatro, así que las cuatro de esta
       familia abortaban con «no encontré los puntos de reversión». Falla cerrado, que es lo
       correcto, pero cuesta una corrida. */
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
    ['Doble', 'kd', 'supervisor', 'Doble, Otra', '', '']],
  'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
    ['Mia', 'ANA MIA', 'V-1', 'Ops', 'Piloto'],
    ['Sana', 'ZOE SANA', 'V-2', 'Ops', 'Piloto'],
    ['Constructor', 'CO PERSONA', 'V-3', 'Ops', 'Piloto'],
    ['Equis', 'EQ PERSONA', 'V-4', 'Ops', 'Piloto'],
    ['Doble', 'DO PERSONA', 'V-5', 'Ops', 'Piloto']],
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [HOY, '08:00', HOY + 'T08:00:00', 'e1', 'ANA MIA', 'Mia', 'Ops', 'Piloto', 'inicio', '', '', ''],
    [HOY, '09:00', HOY + 'T09:00:00', 'e2', 'CO PERSONA', 'Constructor', 'Ops', 'Piloto', 'inicio', '', '', '']],
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
    'accionIdentidadesInforme', 'accionNominaListar', 'accionSupervisor']);
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
    constructorVeLaSuya: /CO PERSONA/.test(panel('Constructor', 'kc'))
  };
}

const DEBE = ['escribeAjena', 'bitacoraNombres', 'nivelesPersona', 'medicoLeeBuzon',
              'direccionResetea', 'padronCruzado', 'prototipoPasa', 'prototipoNomina'];
const NO_PUEDE = ['maestroEscribeLibre', 'supAnclado', 'admEscribeLaSuya', 'scopesCoinciden',
                  'sanaBitSeudo', 'sanaNivSinPersona', 'sanaMedicoSinBuzon', 'otraVeLaSuya',
                  'miaVeLaSuya', 'constructorVeLaSuya', 'sanaVeLaSuya'];

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
    console.log('   🔴 NO DISCRIMINA: revertir esto no cambia NADA medible.');
    fallo = 1;
  } else {
    if (reabre.length) console.log('   ✅ reabre fuga: ' + reabre.join(', '));
    if (rompe.length)  console.log('   ✅ rompe acceso legítimo: ' + rompe.join(', '));
  }
});

console.log(fallo ? '\n🔴 EL DISCRIMINADOR NO PASA.'
  : `\n✅ Las ${REV.length} reversiones discriminan, y tal cual está no se rompe ningún acceso legítimo`
    + ` (${DEBE.length} métricas de fuga, ${NO_PUEDE.length} de acceso legítimo).`);
process.exit(fallo);
