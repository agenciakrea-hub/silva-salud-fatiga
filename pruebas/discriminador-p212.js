/* ── DISCRIMINADOR de P212 · «un verde no vale sin haber visto el rojo» ────────────────────────
   (2026-09-30)

   Carga el `.gs` REAL dos veces —tal cual, y con `gestScope` revertida a devolver `empresaParam`
   crudo para cualquier admin— y corre las mismas afirmaciones. Si la versión revertida también
   pasa, los casos de `casos/p212-el-alcance-del-admin.js` no miden el arreglo.

   ⚠️ Lo importante son las DOS mitades: lo que tiene que cambiar (el admin de fila deja de escribir
   en la ajena) y lo que NO puede cambiar (el maestro `*` sigue escribiendo en todas, y el supervisor
   sigue anclado). Un discriminador que sólo mira la primera mitad no distingue «lo acoté» de «lo
   rompí».

   Desde `silva-salud-fatiga/`:   node pruebas/discriminador-p212.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

/* DOS reversiones independientes: el recorte por lista, y cómo se reconoce al maestro. */
const REV = [
  { nombre: 'A · el recorte contra `acc.empresas`',
    busca: `    for (var i = 0; i < acc.empresas.length; i++) {
      if (norm(acc.empresas[i]) === norm(e)) return String(acc.empresas[i]).trim();
    }`,
    pone:  '    return e;' },
  /* ⚠️ B REVIERTE LA FUENTE, no la guarda de `gestScope`. La primera versión de B revertía «el
     maestro por identidad» — y dejó de discriminar en cuanto se arregló `accesosPartir_`, porque con
     la lista cayendo a `[usuario]` la cuenta de la coma ya nunca tiene lista vacía: el defecto que B
     medía se volvió imposible. El punto que hay que poder revertir es la GARANTÍA de que la lista
     nunca queda vacía, que es de donde colgaba el balde `"undefined"`. */
  { nombre: 'B · `accesosPartir_` nunca devuelve lista vacía',
    busca: `  var lista = raw ? raw.split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
  return lista.length ? lista : [usuario];`,
    pone:  '  return raw ? raw.split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean) : [usuario];' }
];
const falta = REV.filter(r => real.split(r.busca).length - 1 !== 1);
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta.forEach(r => console.log('   · ' + r.nombre));
  process.exit(3);
}
/* ⚠️ C, D y E · TRES GUARDAS QUE NO MEDÍA NADIE. Se descubrió meta-discriminando: al mutarlas, los
   10 casos daban 56/56 y este archivo salía EXIT=0. Una guarda sin quién la mida es una guarda que
   el próximo refactor borra sin que nada se ponga en rojo — y el comentario del `.gs` afirmaba «lo
   cazó el discriminador» sobre una de ellas. */
const REV2 = [
  /* ⚠️ ACTUALIZADO EN P213: esa línea perdió el `|| "Grupo"` final, porque ese default era un balde
     inventado. La guarda que sigue importando es el `|| ""` de adentro, que es lo que evita que
     `String(undefined)` produzca la cadena literal "undefined". */
  { nombre: 'C · el `|| ""` de `gestScope` (sin él, `String(undefined)` = la cadena "undefined")',
    busca: '    if (!acc.empresas || !acc.empresas.length) return String(acc.canonical || "").trim();',
    pone:  '    if (!acc.empresas || !acc.empresas.length) return String(acc.canonical).trim();' },
  { nombre: 'D · la condición DOBLE del maestro (sin `empresas === null`, una lista vacía pasa por maestro)',
    busca: '    if (acc.empresas === null && acc.canonical == null) return e;   // el maestro `*`: administra todas',
    pone:  '    if (acc.canonical == null) return e;' },
  /* ⚠️ NO MEDIBLE DESDE ACÁ, Y SE DICE EN VEZ DE FINGIRLO. La guarda `(acc.empresas || [])` de
     `accionNominaListar` y la de `accionSupervisor` protegen contra `acc.empresas === null`, que NO
     produce el login: lo produce `sesResolver` con la celda `Empresas` de una sesión guardada
     corrupta. Para alcanzarlo hace falta entrar por TOKEN, y el emulador no resuelve el hash de
     `sesEmitir` (`accionNominaListar` responde `ok:false` con y sin la guarda, o sea que la llamada
     nunca llega al código que importa). Queda declarado como hueco conocido de este discriminador:
     las dos guardas están puestas y razonadas, pero NADIE las mide. Si alguna vez se modela el hash
     en el emulador, o se cubre desde la suite del navegador, van acá. */
];
const falta2 = REV2.filter(r => real.split(r.busca).length - 1 !== 1);
if (falta2.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta2.forEach(r => console.log('   · ' + r.nombre));
  process.exit(3);
}
const viejo    = real.split(REV[0].busca).join(REV[0].pone);
const sinFuente = real.split(REV[1].busca).join(REV[1].pone);

const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'clave-maestra', 'admin', '', '', ''],
    ['Grupo Norte', 'clave-gn', 'admin', 'Aerocentro, Consorcio HELITEC', 'med-gn', ''],
    ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', ''],
    ['Coma', 'clave-c', 'admin', ',', '', '']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  /* ⚠️ `SES_HEAD` de verdad (13 columnas, arranca en `Id,HashToken`), no un encabezado inventado:
     con uno que no existe, `sesResolver` no encuentra nada y las guardas del camino del token
     quedan sin medir. */
  'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
                'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
  'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
});
const J = r => JSON.parse(r.getContent());
const gest = id => JSON.stringify({ id: id, tipo: 'restriccion_tarea', persona: 'PEDRO', tarea: 'vuelo', creada: 1 });

function correr(fuente) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(fuente, env, ['gestScope', 'validarAcceso', 'accionGestionGuardar', 'accionNominaListar']);
  const filas = () => env.__libro.getSheetByName('Gestiones').getDataRange().getValues();
  const acc = n => api.validarAcceso(n[0], n[1], 'd');
  const fila = acc(['Grupo Norte', 'clave-gn']), maestro = acc(['*', 'clave-maestra']), sup = acc(['Aeropostal', 'clave-ap']);
  const coma = acc(['Coma', 'clave-c']);   // celda EMPRESAS = "," → lista vacía, pero NO es el maestro
  const o = {};
  /* LO QUE TIENE QUE CAMBIAR */
  o.ajenaRedirige   = api.gestScope(fila, 'Aeroambulancias Silva') === 'Aerocentro';
  o.inexistenteRedirige = api.gestScope(fila, 'Empresa Que No Existe') === 'Aerocentro';
  /* ⚠️ POSITIVA: «¿bajo qué empresa escribe?», no «¿no es la ajena?». La versión negativa pasaba
     mientras esa cuenta escribía bajo la cadena literal `"undefined"`. */
  /* ⚠️ EL VALOR, NO UN BOOLEANO. La versión anterior guardaba `=== 'Coma'`, y con eso las guardas C
     y D quedaban invisibles: al mutarlas el scope pasaba de `"Grupo"` a `"undefined"` (o a la empresa
     ajena), pero las dos cosas son «distinto de Coma» y el booleano daba `false` en ambas. Una
     comprobación que colapsa dos resultados distintos en el mismo valor no puede discriminar entre
     ellos — es el mismo defecto de la afirmación negativa, con otra forma. */
  o.comaScope = api.gestScope(coma, 'Aeroambulancias Silva');
  o.comaEscribeBajoLoSuyo = o.comaScope === 'Coma';
  /* ⚠️ La guarda de `accionNominaListar` protege contra `acc.empresas === null`, y eso NO lo produce
     el login: lo produce `sesResolver` cuando la celda `Empresas` de una sesión guardada está
     corrupta. Medirla con un login normal da verde siempre — por eso pasó desapercibida. Acá se
     planta esa fila y se entra por el TOKEN, que es el camino real. */
  o.grupoNoSaltea   = api.gestScope(fila, 'Grupo') === 'Aerocentro';
  /* LO QUE NO PUEDE CAMBIAR */
  o.propiaOk        = api.gestScope(fila, 'Aerocentro') === 'Aerocentro';
  o.segundaOk       = api.gestScope(fila, 'Consorcio HELITEC') === 'Consorcio HELITEC';
  o.maestroTodas    = ['Aeroambulancias Silva', 'Una Nueva', 'Grupo'].every(e => api.gestScope(maestro, e) === e);
  o.supAnclado      = ['Aeroambulancias Silva', 'Grupo', ''].every(e => api.gestScope(sup, e) === 'Aeropostal');
  /* y en la HOJA, no sólo en el valor devuelto */
  api.accionGestionGuardar({ usuario: 'Grupo Norte', empresa: 'Aeroambulancias Silva', pass: 'med-gn', gestion: gest('g_a') });
  o.nadaBajoLaAjena = !filas().some(f => String(f[0]).indexOf('Aeroambulancias') >= 0);
  api.accionGestionGuardar({ usuario: '*', empresa: 'Aeroambulancias Silva', pass: 'clave-maestra', gestion: gest('g_m') });
  o.maestroSiEscribeAhi = (filas().find(f => String(f[1]) === 'g_m') || [])[0] === 'Aeroambulancias Silva';
  return o;
}

const con = correr(real), sin = correr(viejo), listaVacia = correr(sinFuente);
console.log('CON el arreglo        ·', JSON.stringify(con));
console.log('SIN A (sin recorte)   ·', JSON.stringify(sin));
console.log('SIN B (`accesosPartir_` viejo)·', JSON.stringify(listaVacia));

const cambian   = ['ajenaRedirige', 'inexistenteRedirige', 'nadaBajoLaAjena', 'grupoNoSaltea'];
/* ⚠️ `grupoPasa` estaba acá y se sacó: el arreglo lo cambia A PROPÓSITO («Grupo» ya no saltea el
   candado de un admin con lista, porque ese «cuaderno general» no existe en ninguna parte del
   código). Lo mide `grupoNoSaltea`, del otro lado. */
const noCambian = ['propiaOk', 'segundaOk', 'maestroTodas', 'supAnclado', 'maestroSiEscribeAhi'];
const fallos = [];
cambian.forEach(k => { if (!(con[k] === true && sin[k] === false)) fallos.push('debía cambiar al revertir y no cambió: ' + k); });
noCambian.forEach(k => {
  if (con[k] !== true) fallos.push('tiene que ser true con el arreglo: ' + k);
  if (con[k] !== sin[k]) fallos.push('NO debía cambiar y cambió (el arreglo rompió algo): ' + k);
});
/* B · reconocer al maestro por «lista vacía» tiene que poner en rojo SÓLO la cuenta de la coma */
if (listaVacia.comaEscribeBajoLoSuyo !== false) fallos.push('reversión B · la celda-coma sigue escribiendo bajo lo suyo: no mide la garantía de `accesosPartir_`');
if (listaVacia.maestroTodas !== true) fallos.push('reversión B · rompió al maestro, que no es lo que mide');
['comaEscribeBajoLoSuyo', 'grupoNoSaltea'].forEach(k => { if (con[k] !== true) fallos.push('tiene que ser true con el arreglo: ' + k); });

/* ⚠️ C, D y E se miden CON LA FUENTE REVERTIDA, porque con `accesosPartir_` arreglado el estado que
   protegen no se puede alcanzar: son defensa en profundidad. Medirlas sin revertir B daría verde
   siempre, que es exactamente cómo pasaron desapercibidas. */
const conFuenteRota = REV[1];
REV2.forEach(r => {
  const mutado = real.split(conFuenteRota.busca).join(conFuenteRota.pone).split(r.busca).join(r.pone);
  let o;
  try { o = correr(mutado); } catch (e) { o = { __tiro: e.message }; }
  const base = listaVacia;   // la misma fuente rota, SIN mutar la guarda
  const cambia = o.__tiro || Object.keys(base).some(k => o[k] !== base[k]);
  console.log('   ' + (cambia ? '✅' : '🔴') + ' ' + r.nombre + (o.__tiro ? ' → lanza: ' + o.__tiro : ''));
  if (!cambia) fallos.push('guarda SIN discriminador (mutarla no cambia nada): ' + r.nombre);
});

if (fallos.length) { console.log('🔴 NO DISCRIMINA:'); fallos.forEach(f => console.log('   · ' + f)); process.exit(1); }
console.log('✅ DISCRIMINA · el admin de fila deja de escribir en la ajena, y el maestro y el');
console.log('   supervisor se comportan IGUAL que antes (si cambiaran, sería que lo rompí).');
process.exit(0);
