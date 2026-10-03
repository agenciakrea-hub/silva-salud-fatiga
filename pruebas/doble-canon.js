/* ── DETECTOR DE DOBLE CANON · mide en EJECUCIÓN, no por lectura ──────────────────────────────────
   (2026-10-03, P215)

   `nominaEmpresaCanon(alias, x)` **NO ES IDEMPOTENTE**: `construirAliasLeer_` recorre todas las filas
   de `Accesos` y gana la última, así que si una fila lista el canónico de otra como variante
   no-primera, `canon(canon(x)) !== canon(x)`. Canonizar dos veces el mismo dato manda ese nombre a
   la empresa del secuestrador.

   Eso ya costó caro en P214: `enSet` canonizaba un dato que `RES.aplicar()` había canonizado una
   línea antes, y el panel del supervisor quedaba VACÍO mientras el mismo payload le imprimía los
   nombres de su gente como «nunca medidos». Hay 108 llamadas a esta función en el archivo y **por
   lectura no se ve cuáles reciben un dato ya canonizado**: hay que medirlo corriendo.

   CÓMO FUNCIONA. Se envuelve `nominaEmpresaCanon` para que su salida salga TEÑIDA con un sufijo de
   caracteres que `norm()` colapsa a nada (puntuación), así que el valor teñido se comporta igual que
   el limpio en toda comparación normalizada. Cuando un valor teñido vuelve a ENTRAR a la función, se
   anota el par (línea que lo produjo → línea que lo consume), con la pila de llamadas.

   ⚠️ EL DISCRIMINADOR DEL PROPIO DETECTOR: antes de creerle a un hallazgo hay que confirmar que la
   tinta no cambia ninguna respuesta. Si con la tinta puesta alguna acción contesta distinto, el
   instrumento está alterando lo que mide y sus hallazgos no valen. Eso se comprueba abajo y se
   informa en cada corrida.

   Desde `silva-salud-fatiga/`:   node pruebas/doble-canon.js
   Sale 0 siempre: es un informe, no una prueba. Lo que importa es la tabla. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

/* ⚠️ LA TINTA ES CONSTANTE y de PURA PUNTUACIÓN, y las dos cosas importan.
   · Pura puntuación porque `norm()` reemplaza todo lo que no sea `[a-z0-9 ]` por espacio y después
     colapsa y trima, así que el valor teñido normaliza EXACTAMENTE igual que el limpio. Si la tinta
     llevara el número de línea, ese dígito sobreviviría a `norm()` y el instrumento cambiaría lo
     que mide — que es justo lo que su propio discriminador no deja pasar.
   · Constante porque el ORIGEN no se codifica en el valor: se guarda aparte, en `__ORIGEN`. */
const TINTA = ' ..--..';
const RE_TINTA = /(\s\.\.--\.\.)+$/;

/* Se instrumenta el archivo: cada llamada a `nominaEmpresaCanon(` pasa a `__nec(<línea>,` */
function instrumentar(txt) {
  const lineas = txt.split('\n');
  let n = 0;
  for (let i = 0; i < lineas.length; i++) {
    if (i === 0) continue;                                   // el changelog gigante
    if (lineas[i].indexOf('nominaEmpresaCanon(') < 0) continue;
    if (/function nominaEmpresaCanon/.test(lineas[i])) continue;
    lineas[i] = lineas[i].replace(/nominaEmpresaCanon\(/g, () => { n++; return '__nec(' + (i + 1) + ', '; });
  }
  const prologo = `
var __PARES = {}, __ORIGEN = {}, __TOTAL = 0;
var __RE_TINTA = ${RE_TINTA.toString()};
function __nec(__ln, alias, raw) {
  __TOTAL++;
  var ent = String(raw == null ? "" : raw);
  var limpio = ent.replace(__RE_TINTA, '');
  if (__RE_TINTA.test(ent)) {
    /* el valor que entra YA salió de esta función: doble canon */
    var orig = __ORIGEN[limpio] || '?';
    var k = orig + '\u2192' + __ln;
    __PARES[k] = (__PARES[k] || 0) + 1;
  }
  var out = String(nominaEmpresaCanon(alias, limpio) || "");
  /* ⚠️ EL VACÍO NO SE TIÑE. La tinta volvía no-vacío un resultado vacío, y hay guardas que
     preguntan exactamente por eso —el índice de ausencias hace \`if (!empAus) return {}\`— así que
     el maestro sin empresa pasaba a recibir el índice completo. El instrumento cambiaba lo que
     medía, y su propio discriminador lo cazó: por eso está. */
  if (!out) return out;
  __ORIGEN[out] = __ln;
  return out + ${JSON.stringify(TINTA)};
}
function __dump() { return { pares: __PARES, total: __TOTAL }; }
`;
  return { txt: prologo + lineas.join('\n'), reemplazos: n };
}

const INS = instrumentar(real);
console.log('── DETECTOR DE DOBLE CANON ──');
console.log('llamadas instrumentadas: ' + INS.reemplazos + ' (de ' + (real.split('nominaEmpresaCanon(').length - 1) + ' apariciones)');

const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();

/* ⚠️ EL FIXTURE LLEVA EL SECUESTRO montado: `Holding` lista el canónico de `Alfa` como variante
   no-primera. Sin eso, `canon(canon(x)) === canon(x)` y el doble canon no se distingue del simple —
   el detector lo encontraría igual (la tinta no depende del secuestro) pero no se vería su efecto. */
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'km', 'admin', '', '', ''],
    ['Alfa', 'ka', 'supervisor', 'Alfa, Alfa C.A.', 'kam', ''],
    ['Beta', 'kb', 'supervisor', 'Beta', '', ''],
    ['Holding', 'kh', 'supervisor', 'Holding, Alfa', '', '']],
  'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
    ['Alfa', 'ANA ALFA', 'V-1', 'Operaciones', 'Piloto'],
    ['Alfa C.A.', 'LUIS ALFA', 'V-2', 'Operaciones', 'Comandante'],
    ['Beta', 'ZOE BETA', 'V-3', 'Mantenimiento', 'Tecnico'],
    ['Holding', 'HUGO HOL', 'V-9', 'Operaciones', 'Piloto']],
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [HOY, '08:00', HOY + 'T08:00:00', 'e1', 'ANA ALFA', 'Alfa', 'Operaciones', 'Piloto', 'inicio', '', '', ''],
    [HOY, '09:00', HOY + 'T09:00:00', 'e2', 'LUIS ALFA', 'Alfa C.A.', 'Operaciones', 'Comandante', 'inicio', '', '', ''],
    [HOY, '10:00', HOY + 'T10:00:00', 'e3', 'ZOE BETA', 'Beta', 'Mantenimiento', 'Tecnico', 'inicio', '', '', '']],
  'Ausencias': [['IdAusencia', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor', 'Anulada', 'AnuladaPor'],
    ['a1', 'Alfa', 'V-1', 'ANA ALFA', HOY, HOY, 'franco', 'vigente', '', '', '', '']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  'Config Empresa': [['Empresa', 'Clave', 'Valor']],
  'Identidades': [['Empresa', 'Persona', 'Cedula', 'Variantes']],
  'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
  'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra']]
});

/* Los pedidos que se ejercitan. Se buscan los caminos que devuelven DATOS DE PERSONAS. */
const PEDIDOS = [
  ['supervisor · panel',        { action: 'supervisor', usuario: 'Alfa', pass: 'ka' }],
  ['supervisor · panel+empresa',{ action: 'supervisor', usuario: 'Alfa', pass: 'ka', empresa: 'Alfa' }],
  ['maestro · panel',           { action: 'supervisor', usuario: '*', pass: 'km' }],
  ['maestro · panel+empresa',   { action: 'supervisor', usuario: '*', pass: 'km', empresa: 'Alfa' }],
  ['médico · panel',            { action: 'supervisor', usuario: 'Alfa', pass: 'kam' }],
  ['nómina',                    { action: 'nomina_listar', usuario: 'Alfa', pass: 'ka' }],
  ['ausencias',                 { action: 'ausencias', usuario: 'Alfa', pass: 'ka', empresa: 'Alfa' }],
  ['identidades',               { action: 'identidades_informe', usuario: 'Alfa', pass: 'ka' }],
  ['gestiones',                 { action: 'gestiones', usuario: 'Alfa', pass: 'kam', empresa: 'Alfa' }],
  ['bitácora',                  { action: 'bitacora', usuario: 'Alfa', pass: 'kam', empresa: 'Alfa' }],
  ['niveles',                   { action: 'niveles_riesgo', usuario: 'Alfa', pass: 'kam', empresa: 'Alfa' }],
  ['departamentos',             { action: 'departamentos', usuario: 'Alfa', pass: 'ka', empresa: 'Alfa' }]
];

function corrida(txt, conTinta) {
  const env = GS.crearEntorno(HOJAS());
  /* ⚠️ `__dump` se PIDE a `cargarGs`: `__PARES` vive en el scope del `.gs` cargado, no en el mío.
     La primera versión los leía con `typeof __PARES !== 'undefined'` desde acá y siempre daba 0 —
     un contador que informa cero sin haber contado nada. */
  const api = GS.cargarGs(txt, env, conTinta ? ['doGet', '__dump'] : ['doGet']);
  const salidas = {};
  PEDIDOS.forEach(([et, p]) => {
    try {
      const r = api.doGet({ parameter: Object.assign({ dispositivoId: 'd' }, p) });
      let s = r.getContent();
      /* la tinta se saca de la salida ANTES de comparar: lo que se compara es el contenido */
      if (conTinta) s = s.split(TINTA).join('');
      salidas[et] = s;
    } catch (e) { salidas[et] = 'ERROR:' + e.message; }
  });
  const d = conTinta && api.__dump ? api.__dump() : { pares: {}, total: 0 };
  return { salidas, pares: d.pares, total: d.total };
}

/* 1 · DISCRIMINADOR DEL DETECTOR: la tinta no puede cambiar ninguna respuesta */
const limpia = corrida(real, false);
const teñida = corrida(INS.txt, true);
const difieren = Object.keys(limpia.salidas).filter(k => limpia.salidas[k] !== teñida.salidas[k]);
console.log('\n── discriminador del instrumento ──');
console.log('   pedidos medidos: ' + PEDIDOS.length);
if (difieren.length) {
  console.log('   🔴 LA TINTA CAMBIA ' + difieren.length + ' RESPUESTA(S): ' + difieren.join(', '));
  console.log('      El detector altera lo que mide. Sus hallazgos NO valen hasta arreglarlo.');
  difieren.forEach(k => {
    const a = limpia.salidas[k], b = teñida.salidas[k];
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    console.log('      · ' + k + ' · difieren en el carácter ' + i);
    console.log('        limpia: …' + JSON.stringify(a.slice(Math.max(0, i - 50), i + 60)));
    console.log('        teñida: …' + JSON.stringify(b.slice(Math.max(0, i - 50), i + 60)));
  });
} else {
  console.log('   ✅ ninguna respuesta cambia con la tinta puesta: el detector no altera lo que mide');
}

/* 2 · LOS PARES ENCONTRADOS */
const pares = Object.entries(teñida.pares).sort((a, b) => b[1] - a[1]);
console.log('\n── pares de DOBLE CANON (línea que produce → línea que consume) ──');
console.log('   llamadas totales en la corrida: ' + teñida.total);
if (!pares.length) console.log('   (ninguno)');
const lineasGs = real.split('\n');
pares.forEach(([k, n]) => {
  const [a, b] = k.split('→');
  const ctx = (ln) => { const l = lineasGs[Number(ln) - 1]; return l ? l.trim().slice(0, 74) : '?'; };
  console.log(`\n   ${k}   ×${n}`);
  console.log(`      produce L${a}: ${ctx(a)}`);
  console.log(`      consume L${b}: ${ctx(b)}`);
});
/* 3 · LO QUE ESTE DETECTOR **NO** CUBRE, declarado para que su silencio no se lea como «no hay más» */
console.log('\n── límites de cobertura (declarados, no descubiertos) ──');
console.log('   · `marcarCargosCanon` NO se ejercita acá. Sólo actúa sobre registros SIN cargo');
console.log('     (`if (r.cargo) return`), y esos vienen de `Respuestas de formulario 1`, que tiene');
console.log('     ~90 columnas con dos filas de encabezado. El verificador de P214 SÍ lo midió a mano:');
console.log('     canoniza TRES veces y con eso importa el cargo del homónimo de otra empresa, que');
console.log('     arrastra su nivel de riesgo. Está declarado en el plan como parte de P215.');
console.log('   · Los pedidos son ' + PEDIDOS.length + ': los que devuelven datos de personas. Las acciones de');
console.log('     ESCRITURA no se ejercitan, así que un doble canon en una clave de escritura no');
console.log('     aparecería acá.');
console.log('   · Un par sólo se ve si la corrida LLEGA a esa línea. Cobertura, no exhaustividad.');
console.log('   · ⚠️ EL ORIGEN SE ATRIBUYE POR VALOR, y eso puede equivocarse: `__ORIGEN` guarda la');
console.log('     última línea que produjo cada cadena, así que si dos lugares producen el mismo');
console.log('     nombre de empresa, el par informado puede nombrar al productor equivocado. El par');
console.log('     `10087→10153` quedó SIN EXPLICAR por esto: la línea que consume lee de la hoja');
console.log('     `Identidades`, que en este fixture está vacía, así que no debería ejecutarse. El');
console.log('     número de CONSUMOS es confiable; el de ORIGEN, no siempre. Para decidir si un par');
console.log('     es un defecto hay que medirlo con el escenario de secuestro montado, como se hizo');
console.log('     con `puedeVerEmpresa` — no alcanza con que aparezca acá.');

console.log('\n⚠️ Un par NO es automáticamente un defecto: lo es cuando el segundo pase puede caer en');
console.log('   otra empresa, o sea cuando alguna fila de `Accesos` lista el canónico de otra como');
console.log('   variante no-primera. Cada uno hay que medirlo con ese escenario montado.');
