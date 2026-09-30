/* ── DISCRIMINADOR de P213 · «un verde no vale sin haber visto el rojo» ────────────────────────
   (2026-09-30)

   Dos reversiones INDEPENDIENTES, porque son dos defensas distintas y una sola no mide a la otra:
     A · las guardas `depEmpresaValida` de las cuatro acciones que escriben
     B · el default `"Grupo"` de `gestScope`, que era la puerta de al lado (pedir empresa vacía
         producía ese literal y pasaba la guarda A sin problema)

   ⚠️ Y las DOS MITADES: lo que tiene que cambiar (el admin sin filtro deja de escribir) y lo que NO
   puede cambiar (el supervisor escribe siempre, el admin de fila cae a su empresa). Un discriminador
   que sólo mira la primera no distingue «lo cerré» de «dejé sin escribir a las 15 cuentas».

   Desde `silva-salud-fatiga/`:   node pruebas/discriminador-p213.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

const REV = [
  /* ⚠️ LAS CUATRO, UNA POR UNA. La primera versión revertía SÓLO la de `accionGestionGuardar` y el
     mensaje final decía «(y la bitácora también)» — afirmando algo que el script no medía. Con las
     otras tres intactas, `bitacoraTodas` valía `false` en las tres corridas: una comprobación sin
     contraste. Y la guarda que el propio `.gs` llama «LO MÁS GRAVE, porque esta hoja es APPEND-ONLY»
     era justo la que quedaba sin discriminador. Lo cazó el verificador. */
  { nombre: 'A · las guardas `depEmpresaValida` de las CUATRO acciones que escriben',
    busca: [
      'if (!depEmpresaValida(scope)) return json({ ok:false, motivo:"sin_empresa", error:"Elige una empresa en el filtro antes de guardar. Sin empresa, la persona no la recibe." });',
      'if (!depEmpresaValida(scopeB)) return json({ ok:false, motivo:"sin_empresa", error:"Elige una empresa en el filtro antes de borrar." });',
      'if (!depEmpresaValida(scopeBit)) return json({ ok:false, motivo:"sin_empresa", error:"Elige una empresa en el filtro: la bitácora no se puede corregir después." });',
      'if (!depEmpresaValida(scopeCaso)) return json({ ok:false, motivo:"sin_empresa", error:"Elige una empresa en el filtro antes de guardar el caso." });'
    ],
    pone:  '' },
  { nombre: 'B · el default `"Grupo"` de `gestScope` (la puerta de al lado)',
    /* ⚠️ el ancla incluye la línea anterior: `ausScope` tiene la MISMA línea (ya hacía lo correcto
       desde antes, que es otra señal de que éste era el patrón de la casa), así que el texto suelto
       aparece dos veces y el discriminador no podía elegir. */
    busca: `       filtrar por «» devuelven lo mismo — nada. */
    var e = String(empresaParam || "").trim();`,
    // ⚠️ el `pone` CONSERVA el cierre del comentario que el `busca` incluye. La primera versión sólo
    // ponía la línea, y con eso dejaba el bloque de comentario ABIERTO: se tragaba la declaración de
    // `e` y el `.gs` mutado tiraba `ReferenceError`. Un mutante que no compila no mide nada — da
    // «distinto» por la razón equivocada. (Y este comentario va con `//` porque el de bloque se
    // cerraba solo al nombrar la secuencia de cierre.)
    pone:  `       filtrar por «» devuelven lo mismo — nada. */
    var e = String(empresaParam || "Grupo").trim() || "Grupo";` }
];
/* cada `busca` puede ser una cadena o una lista de cadenas: todas tienen que aparecer UNA vez */
const comoLista = r => Array.isArray(r.busca) ? r.busca : [r.busca];
const aplicar = (txt, r) => comoLista(r).reduce((acc, b) => acc.split(b).join(r.pone), txt);
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
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'km', 'admin', '', '', ''],
    ['GN', 'kg', 'admin', 'Aerocentro', '', ''],
    ['Aeropostal', 'ka', 'supervisor', 'Aeropostal', '', '']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
                'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
  'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
});
const J = r => JSON.parse(r.getContent());
const anot = id => JSON.stringify({ id: id, tipo: 'anotacion_aptitud', persona: 'PEDRO', nivel: 'alto', creada: 1 });
const ev = id => JSON.stringify({ id: id, ts: 1759000000000, accion: 'x', sujeto: 'PEDRO', actor: 'a', rol: 'medico', umbral: {} });

function correr(fuente) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(fuente, env, ['accionGestionGuardar', 'accionBitacoraGuardar', 'gestScope', 'validarAcceso']);
  const filas = h => env.__libro.getSheetByName(h).getDataRange().getValues();
  const o = {};
  /* LO QUE TIENE QUE CAMBIAR · el admin sin filtro deja de escribir */
  o.maestroTodas = J(api.accionGestionGuardar({ usuario: '*', pass: 'km', empresa: 'Todas las empresas', gestion: anot('g1') })).ok === true;
  o.maestroVacio = J(api.accionGestionGuardar({ usuario: '*', pass: 'km', empresa: '', gestion: anot('g2') })).ok === true;
  o.bitacoraTodas = J(api.accionBitacoraGuardar({ usuario: '*', pass: 'km', empresa: 'Todas las empresas', evento: ev('b1') })).ok === true;
  /* y en la HOJA, no sólo en la respuesta */
  /* ⚠️ LAS TRES HOJAS. La primera versión sólo miraba `Gestiones`, así que una fila huérfana en la
     BITÁCORA —la append-only, la que no se corrige— no aparecía por ningún lado. */
  const baldeDe = (hoja, col) => filas(hoja).slice(1).map(f => String(f[col]))
    .filter(e => e && e !== 'Aeropostal' && e !== 'Aerocentro');
  o.baldes = baldeDe('Gestiones', 0).concat(baldeDe('Bitácora', 2)).join('|');
  /* LO QUE NO PUEDE CAMBIAR */
  o.maestroConEmpresa = J(api.accionGestionGuardar({ usuario: '*', pass: 'km', empresa: 'Aeropostal', gestion: anot('g3') })).ok === true;
  o.supervisorSiempre = ['', 'Todas las empresas', 'Aeropostal'].every((e, i) =>
    J(api.accionGestionGuardar({ usuario: 'Aeropostal', pass: 'ka', empresa: e, gestion: anot('s' + i) })).ok === true);
  o.adminFilaSiempre = ['', 'Aerocentro', 'Ajena'].every((e, i) =>
    J(api.accionGestionGuardar({ usuario: 'GN', pass: 'kg', empresa: e, gestion: anot('a' + i) })).ok === true);
  o.supervisorBitacora = J(api.accionBitacoraGuardar({ usuario: 'Aeropostal', pass: 'ka', empresa: 'Todas las empresas', evento: ev('b2') })).ok === true;
  return o;
}

const con = correr(real);
const sinA = correr(aplicar(real, REV[0]));
const sinB = correr(aplicar(real, REV[1]));
console.log('CON el arreglo        ·', JSON.stringify(con));
console.log('SIN A (sin la guarda) ·', JSON.stringify(sinA));
console.log('SIN B (default Grupo) ·', JSON.stringify(sinB));

const fallos = [];
/* A · sin la guarda, el admin sin filtro vuelve a escribir y aparece el balde */
if (!(con.maestroTodas === false && sinA.maestroTodas === true)) fallos.push('A no discrimina: `maestroTodas`');
if (!(con.baldes === '' && sinA.baldes !== '')) fallos.push('A no discrimina: quedan filas en un balde (' + sinA.baldes + ')');
/* B · con el default `"Grupo"`, pedir vacío vuelve a pasar */
if (!(con.maestroVacio === false && sinB.maestroVacio === true)) fallos.push('B no discrimina: `maestroVacio` (la puerta de al lado)');
/* lo que NO puede cambiar, en las TRES versiones */
['maestroConEmpresa', 'supervisorSiempre', 'adminFilaSiempre', 'supervisorBitacora'].forEach(k => {
  if (con[k] !== true) fallos.push('🔴 EL ARREGLO ROMPIÓ ALGO: ' + k + ' tiene que ser true');
  if (con[k] !== sinA[k] || con[k] !== sinB[k]) fallos.push('no debía cambiar y cambió: ' + k);
});
/* la bitácora, CON contraste: sin la guarda tiene que volver a archivar */
if (!(con.bitacoraTodas === false && sinA.bitacoraTodas === true)) fallos.push('A no discrimina la BITÁCORA, que es la append-only: ' + JSON.stringify([con.bitacoraTodas, sinA.bitacoraTodas]));

if (fallos.length) { console.log('🔴 NO DISCRIMINA:'); fallos.forEach(f => console.log('   · ' + f)); process.exit(1); }
console.log('✅ DISCRIMINA · el admin sin filtro deja de escribir (y la bitácora también), mientras el');
console.log('   supervisor y el admin de fila escriben IGUAL que antes en las tres versiones.');
process.exit(0);
