/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CORRER UN ARCHIVO DE CASOS EN NODE, sin navegador                      (2026-10-07)

       node pruebas/correr-node.js [ruta-a-un-.gs-alternativo] [archivo-de-casos]

   Para qué sirve: iterar en ~2 segundos sobre los casos que sólo tocan el ENDPOINT, y correr el
   mismo archivo contra un `.gs` parcheado —un arreglo candidato o un sabotaje— **sin tocar el
   archivo vivo**. Eso es lo que hace posible el discriminador: romper algo a propósito y confirmar
   que se pone en rojo.

   ⚠️ NO REEMPLAZA AL PANEL. Acá no hay app cargada (`CTX.app` queda vacío), así que todo caso que
   mida el CLIENTE —`onDashData`, `ERR_MOTIVO`, el DOM, los temas— se declara SIN MEDIR y aparece
   como falla. Hoy son cuatro: `H9`, `H21`, `R7-8` y la mitad de `R13-1`. Esa es la base: cualquier
   falla ADEMÁS de esas cuatro es real. La verdad sobre la app la dice `pruebas/panel.html`.

   ⚠️ VIVÍA EN EL SCRATCHPAD DE LA SESIÓN, que es `/tmp` y se borra al reiniciar. El 2026-10-07, en
   medio de diagnosticar un error 500 de producción, no estaba y hubo que reescribirlo. Un
   instrumento que depende de un directorio temporal no es un instrumento — el mismo defecto que ya
   había dejado a `herramientas/verificar-adr015.py` sin poder correr.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
global.window = global;
const fs = require('fs'), vm = require('vm'), path = require('path');
const PR = __dirname + '/';
const RAIZ = path.resolve(PR, '../..') + '/';
const GSPATH = process.argv[2] || (RAIZ + 'endpoint/Código.js');
/* ⚠️ varios archivos separados por coma: `p233` reusa el fixture de `p226` en vez de copiarlo, y
   una copia se despega del original. Si falta, el caso lo DICE en vez de pasar en verde. */
const ARCHIVOS = (process.argv[3] || 'casos/p226-la-operacion-como-entidad.js,casos/p233-el-encabezado-que-no-estaba.js').split(',');

vm.runInThisContext(fs.readFileSync(PR + 'marco.js', 'utf8'), { filename: 'marco.js' });
vm.runInThisContext(fs.readFileSync(PR + 'emulador-gs.js', 'utf8'), { filename: 'emulador-gs.js' });
/* ⚠️ `CTX.hayGs` tiene que ser `true` o los casos se saltean con `PRUEBAS.cierto(true)` y dan
   «verde» con una fracción de las comprobaciones. Ya pasó: 90 en vez de 507. */
global.CTX = { gs: fs.readFileSync(GSPATH, 'utf8'), hayGs: true, app: '', sw: '' };
global.document = undefined;
ARCHIVOS.forEach(a => vm.runInThisContext(fs.readFileSync(PR + a.trim(), 'utf8'), { filename: a.trim() }));

const DEL_CLIENTE = ['H9 ', 'H21 ', 'R7-8 '];   // los que no pueden medir sin app

(async () => {
  await PRUEBAS.correr();
  const casos = PRUEBAS._casos.map(c => c.resultado).filter(Boolean);
  let ok = 0, mal = 0, propias = [];
  casos.forEach(c => {
    const malas = (c.comprobaciones || []).filter(x => !x.ok);
    ok += (c.comprobaciones || []).length - malas.length;
    mal += malas.length;
    if (c.ok) return;
    const esDelCliente = DEL_CLIENTE.some(k => c.nombre.indexOf(k) >= 0);
    const reales = malas.filter(m => String(m.porque || '').indexOf('SIN MEDIR') < 0);
    if (esDelCliente || (!reales.length && !c.error)) return;
    propias.push({ n: c.nombre, err: c.error || '',
                   malas: reales.map(m => ({ porque: m.porque, esperaba: m.esperaba, obtuvo: m.obtuvo })) });
  });
  /* P234 · el agrupamiento por causa viene del marco: 35 mensajes idénticos son UN defecto, y sin
     esto se leen como 35. `colgados` > 0 significa que la corrida está sospechada de cascada. */
  const rep = (typeof PRUEBAS.reporte === 'function') ? PRUEBAS.reporte() : {};
  console.log(JSON.stringify({ casos: casos.length, comprobaciones: ok + mal, fallas: mal,
                               fallasPropias: propias.length,
                               colgados: rep.colgados, causasDistintas: rep.causasDistintas,
                               stubsSucios: rep.stubsSucios,
                               causas: (rep.causas || []).slice(0, 6),
                               propias }, null, 1));
  process.exit(propias.length ? 1 : 0);
})();
