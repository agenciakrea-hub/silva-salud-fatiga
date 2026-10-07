/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P234 · EL MARCO NO PUEDE MENTIR                                        (2026-10-07)

   Decidido antes de P227, que es el prompt más caro del bloque: hoy **no se puede confiar en la
   suite para verificarlo**. Dos corridas del 2026-10-07 dieron **74 casos en rojo con cero
   defectos**, y la lectura costó media hora porque el reporte listaba 74 líneas sin decir que 50
   eran la misma cosa:

     · 25 casos: «el caso no terminó en 10 s y se dio por colgado» — la máquina estaba cargada;
     · 25 casos: el mismo `r.text is not a function` — **cascada**: el caso que muere por el tope
       nunca llega a su `finally`, deja su `fetch` falso puesto, y lo heredan todos los que siguen.

   Lo que P234 cambia en `pruebas/marco.js`:
     1. los stubs se restauran **entre caso y caso**, igual que el `sincronizarInert` y por la misma
        razón escrita ahí: puesto en cada caso, el próximo que alguien escriba nace con el problema;
     2. si un caso PASÓ y dejó un stub puesto, eso es una falla con su nombre (R18), porque un caso
        que ensucia es un defecto del caso;
     3. el reporte agrupa por CAUSA y marca cuántos casos se colgaron, para que una cascada se lea
        como una.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ DOS DE LOS TRES NECESITAN LA APP CARGADA. `pruebas/correr-node.js` corre el marco y el
   emulador sin navegador, así que los globals de la app —`showToast`, `dashRequest`, `haptic`…— no
   existen ahí: sólo `fetch`, que lo trae Node. Un caso que no puede medir lo DICE en vez de fallar,
   que es lo que hace el resto del repo (H9, H21, R7-8). La verdad sobre la app la dice el panel. */
function p234HayApp() {
  return typeof showToast === 'function' && typeof dashRequest === 'function';
}

PRUEBAS.caso('🔴 P234-1 · la lista de stubeables cubre lo que los casos de verdad stubean', () => {
  if (!p234HayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ La lista sale de MEDIR, no de adivinar, y si se despega no protege nada. Acá se compara
     contra lo que los archivos de casos realmente hacen. No se puede leer el directorio desde el
     navegador, así que se mide sobre la app cargada: todo nombre de la lista tiene que EXISTIR como
     global, porque un nombre mal escrito nunca se va a restaurar y nadie se enteraría. */
  const lista = PRUEBAS._stubeables || [];
  PRUEBAS.cierto(lista.length >= 10,
    '⚠️ la lista tiene ' + lista.length + ' nombres: con menos de 10 no está cubriendo nada');
  const noExisten = lista.filter(k => typeof window[k] === 'undefined');
  PRUEBAS.igual(noExisten, [],
    '⚠️ estos nombres de la lista no existen como global: un nombre mal escrito nunca se restaura');
  /* los cuatro que los casos stubean más, medidos el 2026-10-07 */
  ['fetch', 'fetchConReloj', 'showToast', 'dashRequest'].forEach(k => {
    PRUEBAS.cierto(lista.indexOf(k) >= 0, '⚠️ `' + k + '` tiene que estar en la lista');
  });
});

PRUEBAS.caso('🔴 P234-2 · la foto DETECTA un stub cambiado, y restaurar lo devuelve', () => {
  /* ⚠️ El mecanismo entero depende de que comparar la foto contra el estado actual note la
     diferencia. Si `stubsFoto` guardara una copia por valor en vez de la referencia, o si
     `stubsRestaurar` comparara mal, el marco restauraría sin detectar y el aviso de R18 no saldría
     nunca — un instrumento que no puede fallar.
     Este caso ensucia Y restaura él mismo, como R18 manda: no se apoya en la red de abajo. */
  const foto = PRUEBAS._stubsFoto();
  const original = window.fetch;
  let sucios = [];
  try {
    window.fetch = function () { return Promise.resolve({ ok: true }); };
    PRUEBAS.cierto(window.fetch !== foto.fetch, 'con el stub puesto, difiere de la foto');
    sucios = PRUEBAS._stubsRestaurar(foto);
    PRUEBAS.cierto(sucios.indexOf('fetch') >= 0,
      '⚠️ y restaurar DICE que `fetch` estaba sucio · ' + JSON.stringify(sucios));
    PRUEBAS.igual(window.fetch, original, '⚠️ y lo devolvió al original');
  } finally {
    window.fetch = original;
  }
  /* ⚠️ Discriminador: sin ensuciar nada, restaurar no puede reportar nada sucio — si no, el aviso
     saldría siempre y dejaría de significar algo. */
  PRUEBAS.igual(PRUEBAS._stubsRestaurar(PRUEBAS._stubsFoto()), [],
    '⚠️ discriminador: con todo limpio, no reporta nada sucio');
});

PRUEBAS.caso('🔴 P234-3 · este caso arranca con los stubs LIMPIOS (detecta cascada ajena)', () => {
  if (!p234HayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL CASO QUE HABRÍA CAZADO LA CASCADA. Los 25 `r.text is not a function` del 2026-10-07 eran
     casos que heredaron el `fetch` falso de uno que murió por el tope. Si el marco está haciendo su
     trabajo, todo caso arranca con los globals que la app tenía antes del primer caso.

     ⚠️ SEGUNDA VERSIÓN, y la primera estaba mal por una suposición MÍA que no medí. Preguntaba por
     `fn.name`, con este razonamiento escrito: «los reemplazos de los casos son flechas anónimas, los
     de la app tienen nombre». Medido el 2026-10-07, el proxy miente en los dos sentidos:
     · `window.fetch` del PANEL es anónimo y no lo dejó ningún caso — es el guardián que corta los
       pedidos al endpoint de producción. O sea daba FALSO POSITIVO en toda corrida con app.
     · un stub escrito `function x(){}` tiene nombre, así que lo habría dejado pasar: falso negativo.
     El mismo comentario afirmaba que comparar contra una foto «sería tautológico». También falso:
     la foto la toma `PRUEBAS.correr` ANTES del primer caso, así que preguntarle responde exactamente
     «¿alguien cambió esto desde el arranque?». Tautológico sería que el caso tomara su propia foto. */
  const foto = PRUEBAS._stubsLimpio;
  if (!foto) { PRUEBAS.cierto(false, '⚠️ el marco no expuso la foto del arranque: este contrato queda SIN MEDIR'); return; }
  const lista = (PRUEBAS._stubeables || []).filter(k => typeof window[k] === 'function');
  PRUEBAS.alMenos(lista.length, 8,
    '⚠️ se midieron ' + lista.length + ' globals: con menos de 8 este caso no mide nada');
  /* ⚠️ QUÉ MIDE ESTO DE VERDAD, dicho con precisión porque el verificador tuvo razón al señalarlo:
     `PRUEBAS.correr` llama `stubsRestaurar(limpio)` INCONDICIONALMENTE después de cada caso, así
     que ninguna contaminación sincrónica puede sobrevivir hasta acá: con el marco entero, esta
     lista es `[]` por construcción y el aserto no puede ponerse en rojo por la cascada que el
     comentario de arriba describe. Esa cascada hoy la caza `marco.js` sobre el caso CULPABLE, que
     es donde corresponde.
     Lo que este aserto sí defiende es el marco mismo: si alguien saca o condiciona esa restauración
     —por rendimiento, por un `if` nuevo, por una excepción que se trague el paso—, los casos vuelven
     a heredarse los stubs y esto se pone en rojo. Es una red sobre el instrumento, no una medición
     de la app, y el discriminador de abajo es lo que prueba que la comparación funciona. */
  const cambiados = lista.filter(k => window[k] !== foto[k]);
  PRUEBAS.igual(cambiados, [],
    '⚠️ estos globals NO son los que había antes del primer caso · si esto falla, lo que se rompió ' +
    'es la restauración del marco, porque `PRUEBAS.correr` la corre tras CADA caso');

  /* ⚠️ EL DISCRIMINADOR, Y POR QUÉ SE RESTAURA EN EL ACTO: si el caso no puede ponerse en rojo, su
     verde no dice nada. Se pisa un global, se comprueba que la comparación lo ve, y se devuelve
     enseguida — si quedara puesto, el propio marco lo reportaría como stub sucio y el caso fallaría
     por su discriminador en vez de por lo que mide.
     Se usa una función CON NOMBRE a propósito: es justo lo que la primera versión dejaba pasar. */
  const prev = window.haptic;
  let visto = [];
  try {
    window.haptic = function elDiscriminadorDeP234(){};
    visto = lista.filter(k => window[k] !== foto[k]);
  } finally { window.haptic = prev; }
  PRUEBAS.cierto(visto.indexOf('haptic') >= 0,
    '⚠️ al pisar un global a propósito la comparación TIENE que verlo, o este caso no mide nada');
  PRUEBAS.igual(lista.filter(k => window[k] !== foto[k]), [],
    'y el discriminador se deshace solo: no deja el global pisado para el caso siguiente');
});
