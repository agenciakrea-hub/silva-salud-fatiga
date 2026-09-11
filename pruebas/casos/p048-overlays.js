PRUEBAS.grupo('P048 · El historial huérfano al cerrar overlays');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El plan traía dos cosas separadas para el mismo síntoma ("parpadeo al abrir/cerrar overlays"):

   PARTE A · EL HISTORIAL HUÉRFANO (defecto real).
   `opinionAbrir()` llama a `navPush()` — apila una entrada de historial para que el botón físico
   "atrás" del teléfono pueda cerrar el overlay (`silvaAtras()` lo consume desde `popstate`). Pero
   cerrar por el botón X, por "Cancelar" o al guardar —el camino que usa casi todo el mundo, casi
   siempre— NUNCA tocaba el historial: en todo el archivo, `history.back()`/`history.go()` no se
   llamaban ni una vez. Medido ANTES de tocar nada, por el camino real (botón X del DOM, 5 ciclos):

       5 aperturas → 5 `history.pushState` → **0 `history.back`** → 5 entradas huérfanas

   Efecto en un teléfono real: la persona toca "atrás" y la app no responde, una vez por cada
   entrada huérfana, antes de que el botón empiece a hacer algo.

   ⚠️ Y NO ES SÓLO OPINIÓN. El mismo patrón se midió también en `privOv` (3 ciclos → 3 pushes, 0
   backs) y en `docOverlay` (3 ciclos → 3 pushes, 0 backs) por el camino real. Revisando el resto
   del archivo: hay 15 sitios que llaman a `navPush()` al abrir, sobre 13 overlays/vistas
   distintos, y NINGUNO de los `cerrar*()` correspondientes tocaba el historial — el desbalance es
   sistémico, no un descuido puntual de X2. Este prompt arregla y prueba UNO (`opinionOv`, el que
   pedía el plan) y deja el resto como deuda declarada, no corregida acá — arreglarlos todos de un
   saque, sin revisar cada uno, es exactamente lo que el plan pidió no hacer. `tareasOv` además
   tiene un problema aparte y peor: ni siquiera está en la lista de `silvaAtras()`, así que el
   botón físico no lo cierra NUNCA, ni una vez — no es este defecto, es otro.

   El arreglo (`navConsumir()`, declarado junto a `navPush()`) NO se agrega dentro de `cerrarX()` a
   secas, porque esa función la llama también `silvaAtras()` (el camino del botón físico, que ya
   consumió su propia entrada solo). Meterlo ahí habría consumido DOS entradas por cada toque de
   "atrás". Por eso hay una función nueva, `opinionCerrarUI()`, que es la que cuelga del botón X y
   de guardar; `silvaAtras()` sigue llamando a `opinionCerrar()` a secas.

   Y `navConsumir()` no hace `history.back()` a ciegas: si hubiera OTRO overlay abierto por debajo
   (por ejemplo, "Panel de estadísticas" con "Documentación" encima), un `back()` suelto dispararía
   `popstate`, que correría `silvaAtras()`, que cerraría TAMBIÉN el de abajo — algo que la persona
   no tocó. El flag `_navConsumiendo` existe para que ese `popstate` puntual no dispare
   `silvaAtras()`. Hay un caso abajo que reproduce el bug SIN el flag para probar que hacía falta.

   PARTE B · EL VELO (era diseño, con default).
   Medido con `getAnimations()` congelado (la pestaña de pruebas está siempre oculta — ver LEEME):
   `backdrop-filter: blur(6px)` vivía en `.overlay` sin condición, así que durante los 220 ms
   enteros del cierre seguía en blur(6px) mientras la opacidad ya iba bajando (1 → 0.59 a los 55 ms
   → 0.20 a los 110 ms → 0.04 a los 165 ms). Animar opacity sobre una capa con backdrop-filter
   encendido es lo caro de recomponer cuadro a cuadro, y es lo que se leía como parpadeo/tirón.
   Se movió `backdrop-filter` a `.overlay.show` (no está en `transition`, así que no se anima: pasa
   a "none" en el mismo instante en que arranca el cierre). La duración y la curva de opacidad NO
   se tocaron — siguen en 220 ms, `ease` — así que el ritmo del velo es el mismo; lo que cambió es
   que ya no hay blur detrás mientras se apaga.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Espera el `popstate` real, o como mucho `ms` — red de seguridad para cuando no hay nada que
   consumir (no dispara ninguno) y el caso no se quede colgado. */
function p048EsperarTurno(ms){
  return new Promise(res => {
    let hecho = false;
    const h = () => { if (hecho) return; hecho = true; window.removeEventListener('popstate', h); res(); };
    window.addEventListener('popstate', h);
    setTimeout(h, ms || 60);
  });
}
/* ⚠️ P177 · Y ADEMÁS SE ESPERA A QUE BAJE `_navConsumiendo`, que es lo que este caso medía sin
   saberlo. `navConsumir()` deja ese flag en `true` durante 400 ms y, mientras está puesto, el
   siguiente cierre por interfaz NO descarta su entrada — a propósito, es la red que documenta
   `navConsumir`. El caso esperaba 60 ms entre ciclos y aun así pasaba, porque la pestaña de pruebas
   estaba oculta y Chrome estrangulaba los timers a ~1 s: esos «60 ms» eran mil.
   Cuando el entorno dejó de estrangularlos, los 60 ms pasaron a ser 60 de verdad, el segundo ciclo
   empezó dentro de la ventana del primero, y el balance dio 6 pushes contra 5 backs — un rojo que
   no es de la app. Ahora se espera al flag real con un tope, así el caso mide lo mismo con los
   timers estrangulados y sin estrangular. */
async function p048EsperarLibre(tope){
  const t0 = Date.now();
  while (typeof _navConsumiendo !== 'undefined' && _navConsumiendo && Date.now() - t0 < (tope || 900)){
    await new Promise(r => setTimeout(r, 30));
  }
}

function p048LimpiarOverlays(){
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
}

/* Corre N ciclos abrir/cerrar de la opinión por el CAMINO REAL: la función real de apertura y el
   botón X real del DOM (no la función de cierre llamada a mano). Cuenta pushState/back reales.
   ⚠️ Guarda de medibilidad: si el overlay no llega a mostrarse con tamaño real, o el botón X no
   existe, `medibleOk` da false y el caso que lo use tiene que fallar por eso, no seguir midiendo
   ceros como si el balance diera bien. */
async function p048CicloOpinion(n){
  const origPush = history.pushState.bind(history);
  const origBack = history.back.bind(history);
  let pushes = 0, backs = 0, medibleOk = true;
  history.pushState = function(){ pushes++; return origPush.apply(history, arguments); };
  history.back = function(){ backs++; return origBack.apply(history, arguments); };
  try {
    for (let i = 0; i < n; i++){
      opinionAbrir();
      const ov = document.getElementById('opinionOv');
      void ov.offsetWidth;
      const rect = ov.getBoundingClientRect();
      const x = document.querySelector('#opinionOv .portal-x');
      if (!ov.classList.contains('show') || rect.width === 0 || !x){ medibleOk = false; break; }
      x.click();
      await p048EsperarTurno(60);
      await p048EsperarLibre();      // P177 · el flag de 400 ms de `navConsumir` tiene que haber bajado
    }
  } finally {
    history.pushState = origPush;
    history.back = origBack;
    p048LimpiarOverlays();
  }
  return { pushes: pushes, backs: backs, medibleOk: medibleOk };
}

PRUEBAS.caso('⚠️ abrir y cerrar la opinión 5 veces por el botón X real no deja historial huérfano', async () => {
  const r = await p048CicloOpinion(5);
  PRUEBAS.cierto(r.medibleOk,
    'guarda de medibilidad: el overlay tiene que abrirse de verdad (con ancho > 0) y el botón X ' +
    'tiene que existir en el DOM; si no, lo de abajo mediría ceros sin haber probado nada');
  if (!r.medibleOk) return;
  PRUEBAS.igual(r.pushes, 5, 'cada apertura real apila su entrada, como siempre — esto no cambió');
  PRUEBAS.igual(r.backs, 5,
    '⚠️ y cada cierre por el botón X tiene que descartarla. Antes del arreglo esto daba 0: la ' +
    'entrada quedaba huérfana y el botón físico "atrás" del teléfono no respondía la próxima vez');
  PRUEBAS.igual(r.pushes - r.backs, 0, 'balance neto: nada queda apilado de más después de los 5 ciclos');
});

PRUEBAS.caso('⚠️ discriminador: sin navConsumir() el caso de arriba se cae', async () => {
  /* Reproduce el bug de origen anulando el arreglo, no reescribiendo la medición. Si esto diera
     verde, el caso de arriba no estaría midiendo lo que dice medir. */
  const orig = window.navConsumir;
  let seLlamo = false;
  window.navConsumir = function(){ seLlamo = true; };   // no hace nada: así se comportaba antes
  let r;
  try { r = await p048CicloOpinion(5); } finally { window.navConsumir = orig; }
  PRUEBAS.cierto(r.medibleOk, 'guarda de medibilidad');
  if (!r.medibleOk) return;
  PRUEBAS.cierto(seLlamo, 'confirma que el mono-parche se usó de verdad — si no, el discriminador no discrimina nada');
  PRUEBAS.igual(r.backs, 0, '⚠️ con navConsumir() anulado, NINGÚN cierre por UI consume su entrada: así se veía antes de este prompt');
  PRUEBAS.igual(r.pushes - r.backs, 5, 'y quedan las 5 entradas huérfanas de siempre');
});

PRUEBAS.caso('⚠️ cerrar la opinión por UI no cierra un overlay abierto por debajo', async () => {
  /* El caso que justifica el flag `_navConsumiendo`: opinión abierta ENCIMA del panel de
     estadísticas, cerrada por su botón X. El panel, que la persona no tocó, tiene que seguir ahí. */
  /* ⚠️ SE ANCLA EL HISTORIAL ANTES DE MEDIR, y esto no es un apaño: el historial del navegador es
     estado GLOBAL que comparten los 933 casos de la suite, y este caso hace un `back()` de verdad.
     Si el puntero quedó en el borde —porque otro caso consumió entradas, o porque cambió cuántos
     casos corren antes— el `back()` se va fuera de la app y el overlay de abajo se cierra por una
     razón que no tiene nada que ver con lo que este caso vigila.
     Pasó el 2026-09-06: revertir la lista rotulada de P095 quitó 3 casos, el orden se corrió, y
     este empezó a fallar sobre una app que funciona bien (verificado a mano por el camino real:
     la opinión cierra, el portal sigue abierto, el historial queda en 50 → 50).
     Con dos entradas propias de colchón, el `back()` siempre tiene a dónde volver dentro de la
     app y el caso mide lo que dice medir. */
  try { history.pushState({ p048: 1 }, ''); history.pushState({ p048: 2 }, ''); } catch(e){}
  abrirDestinoEstadisticas();
  await new Promise(r => setTimeout(r, 20));
  const portalAntes = document.getElementById('portalOverlay').classList.contains('show');
  opinionAbrir();
  await new Promise(r => setTimeout(r, 20));
  const opinionAntes = document.getElementById('opinionOv').classList.contains('show');
  const x = document.querySelector('#opinionOv .portal-x');
  let opinionCerrado = false, portalSigueAbierto = false;
  if (x){
    x.click();
    await p048EsperarTurno(100);
    opinionCerrado = !document.getElementById('opinionOv').classList.contains('show');
    portalSigueAbierto = document.getElementById('portalOverlay').classList.contains('show');
  }
  try { closePortal(); } catch(e){}
  p048LimpiarOverlays();

  PRUEBAS.cierto(portalAntes, 'guarda de medibilidad: el panel tenía que estar realmente abierto para que esto signifique algo');
  PRUEBAS.cierto(opinionAntes, 'guarda de medibilidad: y la opinión, encima de él');
  PRUEBAS.cierto(!!x, 'guarda de medibilidad: el botón X tiene que existir');
  if (!portalAntes || !opinionAntes || !x) return;
  PRUEBAS.cierto(opinionCerrado, 'la opinión se cierra con su propio botón');
  PRUEBAS.cierto(portalSigueAbierto,
    '⚠️ y el panel de estadísticas, que la persona NO tocó, tiene que seguir abierto — si el ' +
    'back() de navConsumir() disparara silvaAtras() sin el flag, se llevaría puesto también a éste');
});

PRUEBAS.caso('⚠️ discriminador: un history.back() liso (sin el flag) SÍ arrastra al overlay de abajo', async () => {
  /* Reproduce a propósito lo que `_navConsumiendo` evita: un back() que no avisa que es "propio"
     deja que popstate corra silvaAtras() normal, y silvaAtras() cierra lo primero que encuentra
     visible en su lista — que en este momento es el panel de estadísticas. */
  abrirDestinoEstadisticas();
  await new Promise(r => setTimeout(r, 20));
  opinionAbrir();
  await new Promise(r => setTimeout(r, 20));
  document.getElementById('opinionOv').classList.remove('show');   // cierre "pelado", sin navConsumir()
  history.back();                                                   // como si no existiera el flag de protección
  await p048EsperarTurno(100);
  const portalSigueAbierto = document.getElementById('portalOverlay').classList.contains('show');
  try { closePortal(); } catch(e){}
  p048LimpiarOverlays();
  PRUEBAS.falso(portalSigueAbierto,
    'este es el discriminador del caso de arriba: sin el flag, el popstate de un back() cualquiera ' +
    'corre silvaAtras() y se lleva puesto lo que hay debajo — confirma que la protección hace falta');
});

PRUEBAS.caso('el botón físico sigue cerrando la opinión en un solo toque', async () => {
  opinionAbrir();
  await new Promise(r => setTimeout(r, 20));
  const abiertoAntes = document.getElementById('opinionOv').classList.contains('show');
  history.back();   // simula el botón físico "atrás" del teléfono
  await p048EsperarTurno(100);
  const cerradoDespues = !document.getElementById('opinionOv').classList.contains('show');
  p048LimpiarOverlays();
  PRUEBAS.cierto(abiertoAntes, 'guarda de medibilidad');
  if (!abiertoAntes) return;
  PRUEBAS.cierto(cerradoDespues, 'un solo "atrás" tiene que bastar — el arreglo de arriba no puede romper esto');
});

PRUEBAS.grupo('P048 · El velo del overlay al cerrar (no se anima con blur puesto)');

/* Congela el cierre de `id` (abierto con `abrirFn`) y devuelve muestras de opacity/backdrop-filter
   en varios instantes exactos. Técnica de LEEME.md: la pestaña de pruebas está siempre oculta, así
   que hay que sacar `.sin-animaciones`, forzar el recálculo y CONGELAR con getAnimations() — nunca
   esperar con un timer, porque acá nada avanza solo. */
function p048CongelarCierre(id, abrirFn){
  document.documentElement.classList.remove('sin-animaciones');
  const ov = document.getElementById(id);
  abrirFn();
  void ov.offsetWidth;
  let anims = ov.getAnimations();
  anims.forEach(a => { a.pause(); a.currentTime = a.effect.getTiming().duration; });   // fin de la apertura
  void ov.offsetWidth;
  const abierto = { opacity: getComputedStyle(ov).opacity, backdrop: getComputedStyle(ov).backdropFilter,
                     display: getComputedStyle(ov).display };

  ov.classList.remove('show');
  void ov.offsetWidth;
  anims = ov.getAnimations();
  const timing = anims.map(a => ({ prop: a.transitionProperty || '(?)', dur: a.effect.getTiming().duration }));
  const muestra = ms => {
    anims.forEach(a => { a.pause(); a.currentTime = ms; });
    void ov.offsetWidth;
    const cs = getComputedStyle(ov);
    return { ms: ms, opacity: parseFloat(cs.opacity), backdrop: cs.backdropFilter, display: cs.display };
  };
  const puntos = [0, 110, 219, 220].map(muestra);

  anims.forEach(a => { try { a.cancel(); } catch(e){} });
  ov.classList.remove('show');
  document.documentElement.classList.add('sin-animaciones');
  return { abierto: abierto, timing: timing, puntos: puntos };
}

PRUEBAS.caso('⚠️ al cerrar, el desenfoque desaparece ENSEGUIDA — no se anima junto con la opacidad', () => {
  const r = p048CongelarCierre('opinionOv', opinionAbrir);
  PRUEBAS.cierto(r.abierto.opacity === '1' && r.abierto.backdrop.indexOf('blur') >= 0,
    'guarda de medibilidad: abierto tiene que verse borroso de verdad — si no, la medición de abajo no prueba nada');
  if (r.abierto.opacity !== '1') return;
  const t0 = r.puntos[0];
  PRUEBAS.igual(t0.backdrop, 'none',
    '⚠️ apenas arranca el cierre (0 ms), sin blur — es lo caro de recomponer cuadro a cuadro y lo ' +
    'que se leía como parpadeo. Antes se medía blur(6px) sostenido los 220 ms enteros del cierre');
  PRUEBAS.cierto(t0.opacity > 0.9,
    'y en ese mismo instante el velo TODAVÍA se ve — sólo que sin blur detrás, no es un salto a vacío');
  const t220 = r.puntos[3];
  PRUEBAS.igual(t220.display, 'none', 'al terminar la transición desaparece del todo, sin quedar pintado invisible por encima de la app');
});

PRUEBAS.caso('la duración y la curva de la opacidad no cambiaron: el arreglo no toca el ritmo del velo', () => {
  const r = p048CongelarCierre('opinionOv', opinionAbrir);
  const op = r.timing.find(t => t.prop === 'opacity');
  PRUEBAS.cierto(!!op, 'guarda: tiene que existir una transición de opacity para poder medir su duración');
  if (!op) return;
  PRUEBAS.igual(op.dur, 220, 'sigue en 220 ms — lo que se sacó fue el blur, no el ritmo del apagado');
  const t110 = r.puntos[1];
  PRUEBAS.cierto(t110.opacity > 0.1 && t110.opacity < 0.3,
    'a mitad de camino (110 ms) la opacidad sigue en la misma curva de siempre (≈0.20), sin acelerarse ni frenarse');
});

PRUEBAS.caso('⚠️ discriminador: reproducimos el bug viejo (blur fijo en .overlay) y el caso de arriba se cae', () => {
  /* No se toca el arreglo: se agrega una regla que pisa exactamente lo que había antes de este
     prompt (blur incondicional en `.overlay`) y se mide con la MISMA función. Si esto diera
     "none" en vez de "blur", el caso de arriba no estaría discriminando nada. */
  const estilo = document.createElement('style');
  estilo.textContent = '.overlay { backdrop-filter: blur(6px) !important; }';
  document.head.appendChild(estilo);
  let r;
  try { r = p048CongelarCierre('opinionOv', opinionAbrir); }
  finally { estilo.remove(); }
  const t0 = r.puntos[0];
  PRUEBAS.cierto(t0.backdrop.indexOf('blur') >= 0,
    '⚠️ con el blur fijo en .overlay (como estaba antes), a los 0 ms del cierre TODAVÍA se ve borroso');
});

PRUEBAS.caso('con movimiento reducido (o pestaña oculta), el overlay no queda en un estado intermedio', () => {
  /* `.sin-animaciones` es la misma clase que cubre prefers-reduced-motion Y la pestaña oculta
     (ver boot, arriba del archivo). Acá SIEMPRE está puesta durante la suite — es el estado real
     de este entorno, no una simulación. */
  document.documentElement.classList.add('sin-animaciones');
  const ov = document.getElementById('opinionOv');
  opinionAbrir();
  void ov.offsetWidth;
  const abierto = { opacity: getComputedStyle(ov).opacity, display: getComputedStyle(ov).display,
                     rectW: ov.getBoundingClientRect().width };
  const animsAbrir = ov.getAnimations();
  opinionCerrar();
  void ov.offsetWidth;
  /* ⚠️ NO se compara `opacity` acá: hay una regla previa, ajena a este prompt, que fuerza
     `html.sin-animaciones .overlay { opacity: 1 !important; }` — pensada para que el contenido
     que entra animado desde opacity:0 no quede invisible para siempre con el reloj de animación
     congelado (J5). Esa regla no distingue "abierto" de "cerrado": un `.overlay` cerrado también
     computa opacity:1 bajo `.sin-animaciones`, y no es un bug — `display:none` ya lo saca del
     todo del render, así que la opacidad forzada no se ve ni ocupa nada. Lo que hay que medir es
     visibilidad real: `display`, `offsetParent` (null si no se renderiza) y el tamaño en pantalla. */
  const cerrado = { display: getComputedStyle(ov).display, offsetParent: ov.offsetParent,
                     rectW: ov.getBoundingClientRect().width, rectH: ov.getBoundingClientRect().height };
  const animsCerrar = ov.getAnimations();
  p048LimpiarOverlays();

  PRUEBAS.cierto(abierto.display === 'flex' && abierto.rectW > 0, 'abierto se ve entero, con tamaño real, sin animación de por medio');
  PRUEBAS.igual(animsAbrir.length, 0, 'sin movimiento no tiene que haber ninguna transición armada al abrir');
  PRUEBAS.cierto(cerrado.display === 'none' && cerrado.offsetParent === null && cerrado.rectW === 0 && cerrado.rectH === 0,
    'y cerrado desaparece del todo en el mismo instante — nunca a mitad de camino (ni visible ni ocupando lugar)');
  PRUEBAS.igual(animsCerrar.length, 0, 'ni al cerrar: `transition: none !important` de .sin-animaciones cubre también lo que se tocó acá');
});
