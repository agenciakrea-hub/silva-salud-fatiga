/* ── DIFERENCIAL CONTRA PRODUCCIÓN · qué cambia un arreglo sobre los datos REALES ───────────────
   (2026-10-03, decisión de Franco al cerrar P215)

   POR QUÉ EXISTE. En P214 y P215, **cuatro rondas consecutivas** terminaron igual: el arreglo de
   cada ronda introdujo el defecto más grave de la siguiente. Los cuatro eran del mismo tipo — una
   función de permisos o de identidad que se cambia midiéndola contra un fixture que yo construí, y
   el fixture no contenía la configuración que existe de verdad. El más caro:

     · P215 cuarta ronda · hice que `gestScope` canonizara la empresa pedida también para el
       administrador maestro. El cliente manda `empresa:"*"` por defecto, `norm("*")` es `""`, y dos
       cuentas de producción tenían la celda EMPRESAS en `"-"`, cuyo `norm` **también es `""`**. Así
       que `gestScope(maestro,"*")` pasó de `"*"` a `"-"`: el canónico de dos empresas clientes. Las
       CUATRO escrituras que rebotaban con `sin_empresa` se aceptaron, bitácora append-only incluida.
       Mi fixture no tenía ninguna celda que normalizara a vacío, así que las 34 métricas del
       discriminador lo daban por bueno.

   Este script hace la pregunta que faltaba: **con el `Accesos` REAL, ¿qué respuestas cambia mi
   arreglo, y cuántas de ésas ABREN algo?** La segunda mitad es la que importa: un cambio que sólo
   cierra es seguro de publicar; uno que abre, no, y la diferencia no se ve contando diferencias.

   CÓMO SE USA, antes de tocar nada:

       cp "<ruta>/endpoint/Código.js" /tmp/.../gs-antes.js     # la copia de ANTES
       … hacer el arreglo …
       node pruebas/diferencial-produccion.js /tmp/.../gs-antes.js

   Sin argumento usa `ANTES` de la variable de entorno `GS_ANTES`. Sale 0 si ninguna diferencia
   abre algo, 1 si alguna lo hace, 3 si no pudo medir.

   🔒 SOBRE EL TOKEN. Este archivo vive en el repo PÚBLICO y el `MANT_TOKEN` no. Se lee del `.gs`,
   que vive fuera, igual que hacen `doble-canon.js` y `discriminador-p215.js`, y **nunca se imprime**
   — ni en el log de error. La única llamada a producción es `tarea=gestiones_del_supervisor`, que es
   de SÓLO LECTURA; si no hay red, el script cae al `Accesos` cacheado y lo dice.
   ⚠️ Y no se usa `tarea=volcar` para esto: su regex de columnas sensibles incluye «usuario», y el
   encabezado de la columna de empresas dice «la lista de empresas que usuario ve», así que la
   enmascara. Dos prompts declararon premisas «medidas» con esa tarea y ninguna lo estaba. */

const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

/* ⚠️ EL SEGUNDO ARGUMENTO EXISTE PARA PODER DISCRIMINAR ESTE SCRIPT, y la primera versión no lo
   tenía. Sin él, el AHORA siempre era el `.gs` real — y para comprobar que el instrumento caza un
   cambio que ABRE hay que poner el mutante del lado del AHORA, no del ANTES. Pasándolo como ANTES,
   la diferencia va de abierto a cerrado y el script informa «0 que abren»: correcto, y sin medir
   nada. Me pasó en el primer intento. Un medidor sin forma de ponerlo en rojo es un medidor en el
   que no hay que confiar.
       node pruebas/diferencial-produccion.js <antes.gs> [ahora.gs] */
const GS_AHORA = process.argv[3] || path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
const GS_ANTES = process.argv[2] || process.env.GS_ANTES || '';
if (!fs.existsSync(GS_AHORA)) { console.log('🔴 no encuentro el `.gs` en ' + GS_AHORA); process.exit(3); }
if (!GS_ANTES || !fs.existsSync(GS_ANTES)) {
  console.log('🔴 falta la copia de ANTES. Uso:  node pruebas/diferencial-produccion.js <ruta al .gs previo>');
  console.log('   (o la variable de entorno GS_ANTES). Sin un ANTES no hay diferencial.');
  process.exit(3);
}
const AHORA = fs.readFileSync(GS_AHORA, 'utf8');
const ANTES = fs.readFileSync(GS_ANTES, 'utf8');

/* ── el `Accesos` de producción ─────────────────────────────────────────────────────────────── */
const CACHE = path.join(require('os').tmpdir(), 'silva-accesos-produccion.json');
function traerAccesos() {
  try {
    /* el token vive en el `.gs` (fuera del repo); el id de implementación vive en `index.html`, que
       SÍ es público — lo dice el CLAUDE.md del proyecto. Buscarlo en el `.gs` era el error de la
       primera versión de este script: ahí no está, y el fallo decía «no pude traer» sin decir por
       qué. Un instrumento que no sabe nombrar lo que le falta obliga a adivinar. */
    /* del `.gs` REAL, no del que se pasó como AHORA: ése puede ser un mutante sin token */
    const vivo = fs.readFileSync(path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs'), 'utf8');
    const tok = (vivo.match(/MANT_TOKEN\s*=\s*"([^"]+)"/) || [])[1];
    if (!tok) throw new Error('el `.gs` no tiene `MANT_TOKEN`');
    const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    /* ⚠️ POR LA CONSTANTE, NO POR EL PRIMER MATCH. `index.html` tiene TRES implementaciones:
       `SHEETS_DASHBOARD_URL` es ésta, y `SHEETS_ESTRES_URL` / `SHEETS_DEPRESION_URL` son proyectos
       Apps Script DISTINTOS (los endpoints de los tests). Un regex suelto acertaba por el orden del
       archivo, y eso es casualidad: el día que alguien mueva la constante, este script mediría
       contra el proyecto equivocado y lo diría todo verde. */
    const url = (idx.match(/SHEETS_DASHBOARD_URL\s*=\s*'[^']*macros\/s\/([A-Za-z0-9_-]{40,})\/exec/) || [])[1];
    if (!url) throw new Error('no encontré `SHEETS_DASHBOARD_URL` en `index.html`');
    const txt = execFileSync('curl', ['-sL', '--max-time', '40', '--get',
      '--data-urlencode', 'action=mantenimiento',
      '--data-urlencode', 'token=' + tok,
      '--data-urlencode', 'tarea=gestiones_del_supervisor',
      '--data-urlencode', 'v=' + process.pid,
      'https://script.google.com/macros/s/' + url + '/exec'], { encoding: 'utf8', maxBuffer: 1 << 24 });
    const d = JSON.parse(txt);
    if (!d.ok || !d.r || !d.r.cuentas) throw new Error('la respuesta no trae cuentas');
    fs.writeFileSync(CACHE, JSON.stringify(d.r.cuentas));
    return { cuentas: d.r.cuentas, fuente: 'producción, ahora' };
  } catch (e) {
    /* ⚠️ el mensaje de `e` puede llevar la URL con el token, así que se recorta a la primera
       línea y se le saca cualquier cosa que parezca una credencial antes de imprimirlo. Pero SE
       IMPRIME: la primera versión sólo decía «no pude traer» y me hizo adivinar por qué. */
    const motivo = String(e && e.message || e).split('\n')[0].replace(/[A-Za-z0-9_-]{25,}/g, '…').slice(0, 160);
    if (fs.existsSync(CACHE)) return { cuentas: JSON.parse(fs.readFileSync(CACHE, 'utf8')),
      fuente: 'CACHÉ local — no se pudo consultar producción: ' + motivo };
    console.log('\u{1F534} no pude traer el `Accesos` de producción ni hay caché: ' + motivo);
    console.log('   Sin datos reales no mido: el objetivo de este script es justamente no medir contra un fixture.');
    process.exit(3);
  }
}
const { cuentas, fuente } = traerAccesos();
console.log('`Accesos` de ' + fuente + ' · ' + cuentas.length + ' cuentas');

const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
/* la contraseña se inventa: lo que se mide es el ALCANCE, no la autenticación */
const FILAS = cuentas.map((c, i) => [String(c.usuario || ''), 'k' + i, String(c.rol || ''),
  String(c.empresasCelda || ''), '', '']);
const SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];

/* ⚠️ EL UNIVERSO LLEVA LOS CENTINELAS, y eso es la lección de P215: `"*"` es lo que el cliente del
   administrador manda POR DEFECTO, `""` es el filtro limpio, y los tres —más cualquier celda de
   puros símbolos— colapsan a la misma clave bajo `norm()`. Más los miembros de `Object.prototype`
   que `norm` deja pasar, y las variantes de cada celda. */
const nombres = new Set(['', '*', '   ', '-', '.', 'Todas las empresas', 'Constructor', 'constructor', '__proto__']);
FILAS.forEach(f => String(f[3]).split(/[,;]/).forEach(x => { if (x.trim()) nombres.add(x.trim()); }));
const UNIVERSO = [...nombres];
console.log('universo de nombres: ' + UNIVERSO.length + ' (incluye los centinelas y `Object.prototype`)');

/* ── las sondas ─────────────────────────────────────────────────────────────────────────────── */
function medir(txt) {
  const env = GS.crearEntorno({ 'Accesos': [CAB].concat(FILAS), 'Sesiones': [SES] });
  const api = GS.cargarGs(txt, env, ['construirAlias', 'nominaEmpresaCanon', 'gestScope', 'ausScope',
    'validarAcceso', 'depEmpresaValida', 'cfgEmpresaCanon', 'empresasPermitidas_', 'esAdminMaestro_']);
  const alias = api.construirAlias();
  const o = {};
  const str = x => { try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (e) { return '(?)'; } };
  UNIVERSO.forEach(x => {
    o['canon|' + x] = str(api.nominaEmpresaCanon(alias, x));
    o['cfgCanon|' + x] = str(api.cfgEmpresaCanon(x, alias));
    o['valida|' + x] = str(api.depEmpresaValida(x));
  });
  FILAS.forEach(f => {
    let acc = null;
    try { acc = api.validarAcceso(f[0], f[1], 'd'); } catch (e) {}
    o['acc|' + f[0]] = acc ? str({ rol: acc.rol, emps: acc.empresas, canon: acc.canonical }) : 'null';
    if (!acc) return;
    o['permitidas|' + f[0]] = str(api.empresasPermitidas_(acc));
    o['maestro|' + f[0]] = str(api.esAdminMaestro_(acc));
    UNIVERSO.forEach(x => {
      o['gest|' + f[0] + '|' + x] = str(api.gestScope(acc, x));
      o['aus|' + f[0] + '|' + x] = str(api.ausScope(acc, alias, x));
    });
  });
  return o;
}

let a, b;
try { a = medir(ANTES); } catch (e) { console.log('🔴 el `.gs` de ANTES no corre: ' + e.message); process.exit(3); }
try { b = medir(AHORA); } catch (e) { console.log('🔴 el `.gs` de AHORA no corre: ' + e.message); process.exit(3); }

const claves = [...new Set([...Object.keys(a), ...Object.keys(b)])];
const dif = claves.filter(k => a[k] !== b[k]);
console.log('\nsondas: ' + claves.length + ' · DIFERENCIAS: ' + dif.length);
if (dif.length) {
  const porTipo = {};
  dif.forEach(k => { const t = k.split('|')[0]; porTipo[t] = (porTipo[t] || 0) + 1; });
  console.log('por tipo: ' + JSON.stringify(porTipo) + '\n');
  dif.slice(0, 60).forEach(k => console.log('   ' + k.padEnd(50) + ' ' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k])));
  if (dif.length > 60) console.log('   … y ' + (dif.length - 60) + ' más');
}

/* ⚠️ LA PREGUNTA QUE IMPORTA NO ES CUÁNTAS DIFIEREN: ES CUÁNTAS ABREN ALGO. Un cambio que sólo
   cierra es seguro de publicar (una guarda `if (!x)` que empieza a rechazar no expone nada); uno
   que abre, no. En P215 el diferencial dio 10 diferencias y 0 que abrían — y las 10 eran el
   centinela volviendo a ser el centinela. */
const abre = dif.filter(k => {
  if (k.startsWith('valida|')) return a[k] === 'false' && b[k] === 'true';
  if (k.startsWith('maestro|')) return a[k] === 'false' && b[k] === 'true';
  if (k.startsWith('permitidas|')) return a[k] !== 'null' && b[k] === 'null';   // null = TODAS
  return !String(a[k]).trim() && String(b[k]).trim();                           // scope vacío → con valor
});
console.log('\n' + (abre.length ? '🔴' : '✅') + ' diferencias que ABREN algo: ' + abre.length);
abre.forEach(k => console.log('   🔴 ' + k + '  ' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k])));
if (!abre.length && dif.length) {
  console.log('   Las ' + dif.length + ' diferencias cierran o reetiquetan, ninguna amplía alcance.');
  console.log('   ⚠️ Eso NO dice que el cambio sea correcto: dice que no abre nada en ESTAS sondas.');
  console.log('      Lo que no cubre: las ESCRITURAS (qué fila cae en qué hoja) y las acciones');
  console.log('      completas. Para eso está `pruebas/discriminador-p215.js`, que entra por ellas.');
}
process.exit(abre.length ? 1 : 0);
