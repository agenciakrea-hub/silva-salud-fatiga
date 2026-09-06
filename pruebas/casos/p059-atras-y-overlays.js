PRUEBAS.grupo('P059 · A7 · el botón "atrás" y los overlays que nadie había contado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   A7 · CIERRE DE TANDA 6b                                                        (2026-09-06)

   ── POR QUÉ ESTE ARCHIVO EXISTE ─────────────────────────────────────────────────────────────
   `silvaAtras()` decide qué hace el botón físico "atrás", y lo hace con una lista EXPLÍCITA de
   overlays. El propio archivo lo advierte tres veces («un overlay que no se nombre acá no existe
   para atrás»). Advertirlo no alcanzó: la auditoría de la tanda 6b encontró DOS overlays vivos
   sin nombrar, y uno era el test de fatiga — la pantalla central de la app.

   ── LOS DOS DEFECTOS, MEDIDOS ───────────────────────────────────────────────────────────────
   · `testOverlay`: `abrirTest()` no apilaba entrada Y no estaba en la lista, así que
     `silvaAtras()` devolvía `false` — que significa «nada que cerrar, que el celular salga de la
     app». El PRIMER toque del botón físico sacaba a la persona de la app con el test a medio
     responder, perdiendo el cronómetro de confiabilidad (`inicioMs`/`tiempos`) entero.
   · `tareasOv`: sí apilaba entrada pero no estaba en la lista, así que el primer toque se tragaba
     en silencio y el segundo salía de la app, con las tareas todavía abiertas encima.
   · Y el desbalance de historial: 5 aperturas y cierres por el botón X dejaban 5 entradas
     huérfanas — el mismo número que P048 midió en X2. El botón físico deja de responder una vez
     por cada una.

   ── QUÉ PRUEBA ESTE ARCHIVO ─────────────────────────────────────────────────────────────────
   No los dos casos puntuales: el CONTRATO. Un overlay nuevo que nazca sin entrar en la lista tiene
   que poner esto en rojo el mismo día, sin que nadie se acuerde de venir a agregarlo.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/* Overlays que a propósito NO están en `silvaAtras()`, con el motivo. Es una lista corta y
   revisada, no una lista negra para bajar el número a cero: cada entrada dice por qué. */
const P059_FUERA_A_PROPOSITO = {
  splashOv: 'es la pantalla de fondo de la entrada, no un overlay que se abra encima: si "atrás" ' +
            'la cerrara no quedaría nada debajo. Ahí SÍ corresponde salir de la app.'
};

function p059Overlays(){
  /* Se descubren del DOM, no de una lista escrita a mano — que es exactamente el modo de fallar
     que este archivo existe para cerrar. Se incluyen los dos que no siguen el patrón de nombre. */
  const porPatron = [...document.querySelectorAll('[id$="Ov"],[id$="Overlay"]')].map(e => e.id);
  const sueltos = ['consent', 'setup'].filter(id => document.getElementById(id));
  return [...new Set(porPatron.concat(sueltos))].sort();
}

function p059Nombrados(){
  return [...new Set((silvaAtras.toString().match(/visible\(['"]([A-Za-z0-9_]+)['"]\)/g) || [])
    .map(s => s.replace(/.*['"]([A-Za-z0-9_]+)['"].*/, '$1')))];
}

PRUEBAS.caso('⚠️ EL CONTRATO · todo overlay del DOM está en la lista de "atrás"', () => {
  const enDom = p059Overlays();
  const nombrados = p059Nombrados();
  /* Guarda de medibilidad: si el descubrimiento devuelve poco, el caso no está midiendo nada y un
     cero no significaría "todo bien". Ya pasó cuatro veces en este repo. */
  PRUEBAS.alMenos(enDom.length, 15, 'guarda: se descubrieron los overlays de la app · ' + enDom.length);
  PRUEBAS.alMenos(nombrados.length, 15, 'guarda: se leyó la lista de silvaAtras · ' + nombrados.length);

  const huerfanos = enDom.filter(id => !nombrados.includes(id) && !P059_FUERA_A_PROPOSITO[id]);
  PRUEBAS.igual(huerfanos.join(', '), '',
    '⚠️ un overlay que no esté acá NO existe para el botón físico: o "atrás" no hace nada, o la ' +
    'app se cierra con él abierto. Si es a propósito, va en P059_FUERA_A_PROPOSITO con el motivo');
});

PRUEBAS.caso('el DISCRIMINADOR: un overlay inventado sin nombrar SÍ se detecta', () => {
  /* Sin esto, el caso de arriba daría verde aunque el descubrimiento estuviera roto. */
  const d = document.createElement('div');
  d.id = 'p059FalsoOv'; d.className = 'overlay';
  document.body.appendChild(d);
  const huerfanos = p059Overlays().filter(id => !p059Nombrados().includes(id) && !P059_FUERA_A_PROPOSITO[id]);
  d.remove();
  PRUEBAS.igual(huerfanos.join(','), 'p059FalsoOv',
    '⚠️ si esto no lo caza, el caso de arriba no mide nada');
});

PRUEBAS.caso('🔴 con el TEST abierto, "atrás" no saca de la app', () => {
  /* R17 · por el camino real: se abre el test como lo abre la persona —`abrirTest(item)` desde la
     lista— y se llama a `silvaAtras()`, que es lo que corre el manejador de `popstate`. */
  CTX.resetear();
  abrirTest({ id: 'p059', testFlow: 'kss', label: 'Prueba' });
  PRUEBAS.cierto(document.getElementById('testOverlay').classList.contains('show'),
    'guarda: el test quedó abierto');
  const cerro = silvaAtras();
  PRUEBAS.cierto(cerro,
    '⚠️ tiene que devolver true · false significa "que el celular salga de la app", y adentro hay ' +
    'un test a medio responder');
  cerrarTest();
});

PRUEBAS.caso('y "atrás" retrocede de PREGUNTA antes de cerrar el test', () => {
  /* Mismo criterio que la nómina. Cerrar de una en la pregunta 8 tiraría las 7 anteriores. */
  CTX.resetear();
  abrirTest({ id: 'p059', testFlow: 'kss', label: 'Prueba' });
  const btn = document.getElementById('testBackBtn');
  PRUEBAS.cierto(!!btn, 'guarda: existe el botón de retroceso del test');
  PRUEBAS.cierto(btn.disabled, 'en la primera pregunta no se puede retroceder');
  silvaAtras();
  PRUEBAS.falso(document.getElementById('testOverlay').classList.contains('show'),
    'así que ahí "atrás" cierra el test');

  /* Y con el botón habilitado, "atrás" tiene que retroceder y NO cerrar. */
  abrirTest({ id: 'p059', testFlow: 'kss', label: 'Prueba' });
  document.getElementById('testBackBtn').disabled = false;
  silvaAtras();
  PRUEBAS.cierto(document.getElementById('testOverlay').classList.contains('show'),
    '⚠️ con pasos atrás disponibles, "atrás" retrocede de pregunta y el test SIGUE abierto');
  cerrarTest();
});

PRUEBAS.caso('🔴 con las TAREAS abiertas, "atrás" las cierra', () => {
  CTX.resetear();
  tareasAbrir();
  PRUEBAS.cierto(document.getElementById('tareasOv').classList.contains('show'), 'guarda: abiertas');
  PRUEBAS.cierto(silvaAtras(), '⚠️ antes devolvía false y el toque se perdía');
  PRUEBAS.falso(document.getElementById('tareasOv').classList.contains('show'), 'y quedan cerradas');
});

PRUEBAS.caso('⚠️ cerrar por la UI descarta la entrada que la apertura apiló', () => {
  /* El desbalance no se ve nunca en pantalla: se acumula. Cada apertura y cierre por el botón X
     deja una entrada sin dueño, y el botón físico "atrás" no responde una vez por cada una.
     Se mide contando llamadas a `navConsumir` — sustituirlo evita navegar de verdad, que en esta
     suite tiraría la página abajo. */
  const real = window.navConsumir;
  let n = 0;
  window.navConsumir = function(){ n++; };
  const mide = (abrir, cerrar) => { n = 0; abrir(); cerrar(); return n; };
  try {
    CTX.resetear();
    PRUEBAS.alMenos(mide(() => opinionAbrir(), () => opinionCerrarUI()), 1,
      'guarda con un caso SANO (X2, arreglado en P048): si esto da 0, la medición no sirve');
    PRUEBAS.alMenos(mide(() => tareasAbrir(), () => tareasCerrarUI()), 1,
      '⚠️ tareas · medido en A7: 5 aperturas dejaban 5 entradas huérfanas');
    PRUEBAS.alMenos(mide(() => { abrirTest({ id:'p059', testFlow:'kss', label:'P' }); }, () => testCerrarUI()), 1,
      '⚠️ el test · "Cancelar" tiene que descartar la entrada que abrirTest apiló');
  } finally {
    window.navConsumir = real;
    try { cerrarTest(); } catch (e) {}
  }
});
