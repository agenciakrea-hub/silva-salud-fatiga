PRUEBAS.grupo('P150 · el panel no deja historial huérfano');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P048 arregló esto para la opinión, el test, el ciclo, los departamentos y las tareas. Al PANEL
   —la pantalla más usada de la app— nunca se le aplicó, y lo encontró la auditoría del 2026-09-09.

   `navPush()` apila una entrada cada vez que se abre el panel, para que el botón físico «atrás»
   pueda cerrarlo. Cuando el cierre viene de ese botón, el navegador ya sacó la entrada antes de
   disparar `popstate`. Pero cuando la persona cierra con la ✕, con «Salir» o con la flecha ←, nada
   toca el historial: la entrada queda apilada sin dueño, y el botón físico deja de responder una
   vez por cada entrada huérfana. Tres entradas al panel = cuatro toques de «atrás» para que pase
   algo.

   ⚠️ LO QUE HACE QUE ESTO NO SEA UN `history.back()` A SECAS, y que se verificó antes de tocar:
   `portalAbrirDirecto()` corre en el ARRANQUE cuando el dispositivo tiene credenciales de empresa
   guardadas, y abre el panel SIN `navPush()`. Ahí no hay entrada propia que descartar, y comerse
   una ajena haría que «atrás» saltara dos pantallas. Lo cubre la guarda de `navConsumir()`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Cuenta pushState/back REALES a lo largo de n ciclos abrir/cerrar, entrando por la función de
   apertura de verdad y por el control de cierre del DOM — nunca llamando a la función de cierre a
   mano. Es el mismo instrumento de `p048-overlays.js`.
   ⚠️ La guarda de medibilidad es lo que impide medir ceros: si el overlay no llega a mostrarse con
   ancho real o el control no existe, `medibleOk` da false y el caso falla POR ESO. */
async function p150Ciclo(n, selCierre){
  const origPush = history.pushState.bind(history);
  const origBack = history.back.bind(history);
  let pushes = 0, backs = 0, medibleOk = true, porQue = '';
  history.pushState = function(){ pushes++; return origPush.apply(history, arguments); };
  history.back = function(){ backs++; return origBack.apply(history, arguments); };
  try {
    for (let i = 0; i < n; i++){
      abrirDestinoEstadisticas();
      const ov = document.getElementById('portalOverlay');
      void ov.offsetWidth;
      if (!ov.classList.contains('show') || ov.getBoundingClientRect().width === 0){
        medibleOk = false; porQue = 'el panel no se abrió con ancho real'; break;
      }
      const x = document.querySelector(selCierre);
      if (!x){ medibleOk = false; porQue = 'no existe ' + selCierre; break; }
      x.click();
      await p048EsperarTurno(60);
    }
  } finally {
    history.pushState = origPush;
    history.back = origBack;
    p048LimpiarOverlays();
    try { syncScrollLock(); } catch(e){}
  }
  return { pushes, backs, medibleOk, porQue };
}

PRUEBAS.caso('🔴 abrir y cerrar el panel 5 veces por la ✕ real no deja historial huérfano', async () => {
  const previo = getProfile();
  try {
    /* Sin rol de empresa: `abrirDestinoEstadisticas` va derecho a las estadísticas propias y no
       abre el gate, que es el recorrido más común de las 7 personas. */
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' });
    const r = await p150Ciclo(5, '#portalOverlay .portal-x');
    PRUEBAS.cierto(r.medibleOk, 'guarda de medibilidad: ' + (r.porQue || 'el panel se abre y la ✕ existe'));
    if (!r.medibleOk) return;
    PRUEBAS.igual(r.pushes, 5, 'cada apertura apila su entrada, como siempre — eso no cambió');
    PRUEBAS.igual(r.backs, 5,
      '⚠️ y cada cierre por la ✕ la descarta · antes daba 0 y el botón físico «atrás» del teléfono ' +
      'no respondía una vez por cada entrada que quedó colgada');
    PRUEBAS.igual(r.pushes - r.backs, 0, 'balance neto: nada queda apilado después de los 5 ciclos');
  } finally {
    if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE);
  }
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: sin navConsumir el caso de arriba se cae', async () => {
  /* Sin esto, un arreglo que no hiciera nada daría verde arriba — que es exactamente cómo este
     defecto sobrevivió a P048, que sí lo arregló para otros cinco overlays. */
  const previo = getProfile();
  const orig = window.navConsumir;
  let seLlamo = false;
  try {
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' });
    window.navConsumir = function(){ seLlamo = true; };   // así se comportaba antes: no hace nada
    const r = await p150Ciclo(3, '#portalOverlay .portal-x');
    PRUEBAS.cierto(seLlamo, 'guarda: el cierre por la ✕ SÍ pasa por navConsumir · si no, no se mide nada');
    PRUEBAS.igual(r.backs, 0, '⚠️ con navConsumir anulado no se descarta ninguna · así estaba el panel');
    PRUEBAS.igual(r.pushes, 3, 'y las tres entradas quedaron apiladas');
  } finally {
    window.navConsumir = orig;
    if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE);
  }
});

PRUEBAS.caso('🔒 abrir el panel SIN apilar y cerrarlo no se come una entrada ajena', async () => {
  /* El caso borde que hace que esto no pueda ser un `history.back()` a secas: en el arranque,
     `portalAbrirDirecto()` abre el panel sin `navPush()` cuando hay credenciales de empresa
     guardadas. Comerse una entrada que no es nuestra haría que «atrás» saltara DOS pantallas. */
  const origBack = history.back.bind(history);
  let backs = 0;
  history.back = function(){ backs++; return origBack.apply(history, arguments); };
  try {
    /* Se abre a mano SIN navPush, que es lo que hace `portalAbrirDirecto` por dentro. */
    document.getElementById('portalOverlay').classList.add('show');
    syncScrollLock();
    const ov = document.getElementById('portalOverlay');
    void ov.offsetWidth;
    PRUEBAS.cierto(ov.getBoundingClientRect().width > 0, 'guarda: el panel está abierto de verdad');
    closePortalUI();
    await p048EsperarTurno(60);
    PRUEBAS.igual(backs, 0,
      '🔒 no descarta nada · el estado actual no es suyo y la guarda de navConsumir lo frena');
  } finally {
    history.back = origBack;
    p048LimpiarOverlays();
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('⚠️ `silvaAtras` sigue cerrando el panel SIN consumir · ahí el navegador ya lo hizo', () => {
  /* La otra mitad de la regla. Si `silvaAtras` empezara a consumir, el botón físico descartaría dos
     entradas de un toque: la que el navegador ya sacó y una ajena. Se mide sobre el fuente porque
     lo que se vigila es cuál de las dos funciones se llama, no un efecto. */
  const fuente = silvaAtras.toString().replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, '');
  PRUEBAS.cierto(/closePortal\(\)/.test(fuente),
    '⚠️ el botón físico llama a `closePortal()` pelado');
  PRUEBAS.falso(/closePortalUI\(\)/.test(fuente),
    '⚠️ y NO a `closePortalUI()` · consumir ahí descartaría una entrada de más');
});
