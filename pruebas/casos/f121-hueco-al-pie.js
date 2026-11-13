PRUEBAS.grupo('F121a · lo último de cada vista sale de abajo de la barra (la versión de «Más» en el iPhone)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Lo reportó Rafael en su iPhone (2026-11-13): en «Más» no se veía el número de versión con el
   teléfono de pie; acostado, sí. Medido con Chrome emulando iPhones y el área segura REAL por CDP
   (`docs/specs/F121/avance.md`, fuera del repo): la barra inferior mide 81 px más el área segura de
   abajo (34 en un iPhone con barra de inicio), y el disco de estadísticas sobresale ~10 px. Ocupa
   124 px; el hueco al pie de las vistas (`.wrap`) era un `6rem` escrito a mano, 96. La versión va
   centrada, justo debajo del disco.

   ⚠️ ACÁ NO HAY ÁREA SEGURA: `env(safe-area-inset-bottom)` vale 0 en el iframe de la suite, y con
   0 el hueco viejo alcanzaba por 6 px (por eso nadie lo vio). La barra de inicio se simula
   agrandando el relleno de abajo de la barra, que es exactamente lo que hace el `env()` en el
   iPhone (`.bottom-nav` lo suma a su `padding-bottom`), y se mide por el camino real:
   `appRevelar(true)` mide la barra al mostrarla. Lo que esto NO cubre es el `env()` sumado dos
   veces en `.off-bar`: eso sólo se ve con el área segura de verdad y quedó medido por CDP.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

const F121_BARRA_DE_INICIO = 34;   // px · iPhone con barra de inicio, de pie

function f121Simular(px){
  /* Se le suma a la barra lo que le sumaría el `env()` del iPhone, y se vuelve a mostrar: así la
     medición la hace la app, como al arrancar. */
  const nav = document.getElementById('bottomNav');
  nav.style.paddingBottom = px ? 'calc(.5rem + ' + px + 'px)' : '';
  appRevelar(true);
}
function f121AlPie(){
  mostrarVista('mas');
  window.scrollTo(0, document.documentElement.scrollHeight);
  const ver = document.getElementById('verTag').getBoundingClientRect();
  const fab = document.querySelector('.bn-fab').getBoundingClientRect();
  const nav = document.getElementById('bottomNav').getBoundingClientRect();
  const ym = ver.top + ver.height / 2;
  /* La versión es una píldora: el punto se busca sobre la línea media, no en las esquinas (el
     navegador respeta el redondeo al decidir qué hay en un punto). */
  const puntos = [0.2, 0.5, 0.8].map(f => document.elementFromPoint(ver.left + ver.width * f, ym));
  const tapa = puntos.filter(e => e && e.id !== 'verTag').map(e => e.id || e.className || e.tagName);
  /* ⚠️ «nada la tapa» pasaría vacío si el punto devolviera `null`: se exige VER la versión en los tres. */
  const vista = puntos.filter(e => e && e.id === 'verTag').length;
  return { ver, fab, nav, tapa, vista, techo: Math.min(fab.top, nav.top) };
}
/* ⚠️ `CTX.resetear()` cierra las ventanas pero NO suelta lo que dejó el arranque de la app con la
   memoria vacía (el alta): `body.modal-open` y el `inert` de `#app`. Un `#app` inerte no responde a
   `elementFromPoint` (el navegador lo saltea como si tuviera `pointer-events: none`), y el primer
   caso de una corrida limpia leía `<body>` donde estaba la versión. Lo encontró el aserto de abajo
   que exige VER la versión; el anterior («nada la tapa») pasaba en vacío. `syncScrollLock()` es la
   función de la app que recalcula las dos cosas desde las ventanas abiertas. */
function f121Arrancar(){ CTX.resetear(); syncScrollLock(); }
function f121Limpiar(){
  try { document.querySelector('.wrap').style.paddingBottom = ''; } catch (e) {}
  try { empColaSave({}); offPintar(); } catch (e) {}
  try { f121Simular(0); } catch (e) {}
  try { mostrarVista('inicio'); window.scrollTo(0, 0); } catch (e) {}
}

PRUEBAS.caso('🔴 con barra de inicio, la versión de «Más» queda ENTERA por encima del disco', () => {
  f121Arrancar();
  try {
    f121Simular(F121_BARRA_DE_INICIO);
    const navAlto = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-alto')) || 0;
    /* Guarda: si la simulación no agrandó la barra, el caso mediría el escenario que ya andaba. */
    PRUEBAS.alMenos(Math.round(navAlto), 115, 'guarda: la barra mide con la barra de inicio · ' + navAlto + 'px');
    const m = f121AlPie();
    PRUEBAS.alMenos(Math.round(m.ver.height), 10, 'guarda: la versión tiene alto · ' + Math.round(m.ver.height));
    PRUEBAS.comoMucho(Math.round(m.ver.bottom), Math.round(m.techo) - 12,
      '⚠️ el pie de la versión queda al menos 12 px sobre el disco · versión hasta ' + Math.round(m.ver.bottom) +
      ', disco desde ' + Math.round(m.fab.top) + '. Con el `6rem` viejo quedaba debajo');
    PRUEBAS.igual(m.tapa, [], 'y nada la tapa en su línea media');
    PRUEBAS.igual(m.vista, 3, 'y en los tres puntos de su línea media lo que hay es la versión');
  } finally { f121Limpiar(); }
});

PRUEBAS.caso('el DISCRIMINADOR: con el hueco viejo de 6rem, el mismo caso la ve tapada', () => {
  /* Sin esto, el caso de arriba daría verde aunque midiera mal (por ejemplo, si la simulación no
     llegara al CSS). Se pone a mano el valor que había antes del arreglo. */
  f121Arrancar();
  try {
    f121Simular(F121_BARRA_DE_INICIO);
    document.querySelector('.wrap').style.paddingBottom = '6rem';
    const m = f121AlPie();
    PRUEBAS.cierto(m.ver.bottom > m.techo,
      'con 6rem la versión termina debajo del borde del disco · versión hasta ' + Math.round(m.ver.bottom) +
      ', disco desde ' + Math.round(m.fab.top));
  } finally { f121Limpiar(); }
});

PRUEBAS.caso('🔴 con el cartel de envíos a la vista (sin señal, enviando), la versión tampoco queda debajo', () => {
  f121Arrancar();
  try {
    f121Simular(F121_BARRA_DE_INICIO);
    empColaSave({ f121: { accion: 'opinion_guardar', payload: {}, creada: 1 } });
    offPintar();
    const bar = document.getElementById('offBar');
    PRUEBAS.cierto(getComputedStyle(bar).display !== 'none', 'guarda: el cartel está a la vista');
    const offAlto = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--off-alto')) || 0;
    PRUEBAS.alMenos(Math.round(offAlto), 20, '⚠️ el cartel publica su alto · ' + offAlto + 'px');
    const m = f121AlPie();
    const rb = bar.getBoundingClientRect();
    PRUEBAS.comoMucho(Math.round(m.ver.bottom), Math.round(rb.top) - 8,
      '⚠️ la versión termina por encima del cartel · versión hasta ' + Math.round(m.ver.bottom) + ', cartel desde ' + Math.round(rb.top));
    PRUEBAS.igual(m.tapa, [], 'y nada la tapa');
    PRUEBAS.igual(m.vista, 3, 'y en los tres puntos de su línea media lo que hay es la versión');
    /* Discriminador en el mismo estado: sin el alto del cartel, el cartel la tapa. */
    document.documentElement.style.setProperty('--off-alto', '0px');
    const sin = f121AlPie();
    PRUEBAS.cierto(sin.tapa.indexOf('offBar') >= 0 || sin.ver.bottom > rb.top,
      'DISCRIMINADOR: con `--off-alto` en 0, el cartel la tapa · ' + JSON.stringify(sin.tapa));
  } finally { f121Limpiar(); }
});

PRUEBAS.caso('al esconderse el cartel, su alto vuelve a 0 (no deja un hueco de más)', () => {
  f121Arrancar();
  try {
    empColaSave({ f121: { accion: 'opinion_guardar', payload: {}, creada: 1 } });
    offPintar();
    PRUEBAS.alMenos(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--off-alto')) || 0, 20,
      'guarda: con el cartel a la vista el alto se publicó');
    empColaSave({});
    offPintar();
    PRUEBAS.igual(getComputedStyle(document.documentElement).getPropertyValue('--off-alto').trim(), '0px',
      'sin nada pendiente y con señal el cartel se esconde, y el hueco lo sigue');
  } finally { f121Limpiar(); }
});

PRUEBAS.grupo('F121b · los desplegables de «Más» crecen con la letra elegida (nada cortado con «Muy grande»)');

/* El barrido de F121 (iPhones emulados, cuatro tamaños de letra) encontró dos cortes en «Más», los dos por un tope
   en píxeles que no crece con la letra: el bloque de Avisos (`max-height: 260px`) cortaba «Activar avisos» con letra
   Grande y Muy grande, y el control de tamaño le cortaba la punta a la «A» grande con Muy grande. Se entra por el
   camino real: `fijarTamanoTexto` (lo que hace el control) y `masAbrir` (lo que hace tocar el título). */
/* Los desplegables abren con una transición de `max-height`. En la pestaña oculta de la suite la app ya arranca con
   `sin-animaciones` (`index.html`, arriba: «reduce || document.hidden»); en una pestaña visible no, y medir en el
   mismo instante daba el alto del primer fotograma (0). Se usa el mismo mecanismo que «reducir movimiento». */
var _f121bTeniaSinAnim;
function f121bLetra(n){
  _f121bTeniaSinAnim = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  fijarTamanoTexto(n);
}
function f121bLimpiar(){
  try { if (!_f121bTeniaSinAnim) document.documentElement.classList.remove('sin-animaciones'); } catch (e) {}
  try { document.getElementById('avisosBody').style.maxHeight = ''; } catch (e) {}
  try { document.querySelector('#tcSliderWrap .tc-slider').style.marginTop = ''; } catch (e) {}
  try { masCerrar(); } catch (e) {}
  try { localStorage.removeItem('silva_fatiga_texto_v1'); aplicarTamanoTexto(); } catch (e) {}
  try { mostrarVista('inicio'); window.scrollTo(0, 0); } catch (e) {}
}
function f121bPuntaDeLaA(){
  const a = document.querySelector('#tcSliderWrap .tc-a.grande');
  const rg = document.createRange(); rg.selectNodeContents(a);
  return { tinta: rg.getBoundingClientRect().top, caja: document.getElementById('tcSliderWrap').getBoundingClientRect().top };
}

PRUEBAS.caso('🔴 el tope de los desplegables CRECE con la letra, y con «Muy grande» Avisos entra entero', () => {
  /* ⚠️ El invariante es «el tope crece con la letra», no «entra»: el contenido de Avisos depende del navegador (en el
     iPhone emulado medía ~332 px con Muy grande a 375 y se pasaba de 260; en el Chrome de la suite mide ~220 y con 260
     entraba igual). Un tope fijo en píxeles es el defecto, mida lo que mida el contenido acá. */
  f121Arrancar();
  try {
    const b = document.getElementById('avisosBody');
    const tope = () => parseFloat(getComputedStyle(b).maxHeight) || 0;
    f121bLetra(1); mostrarVista('mas'); masAbrir('avisosCtrl');
    const t1 = tope();
    masCerrar(); f121bLetra(3); masAbrir('avisosCtrl');
    const t3 = tope();
    PRUEBAS.alMenos(b.scrollHeight, 60, 'guarda: el bloque tiene contenido · ' + b.scrollHeight + 'px');
    PRUEBAS.alMenos(+(t3 / t1).toFixed(2), 1.3,
      '⚠️ el tope crece con la letra · Normal ' + t1 + 'px, Muy grande ' + t3 + 'px. Con 260 fijos no crecía y cortaba «Activar avisos»');
    PRUEBAS.comoMucho(b.scrollHeight - b.clientHeight, 1,
      'y el contenido entra · contenido ' + b.scrollHeight + ', visible ' + b.clientHeight);
    /* Discriminador: con el tope viejo, fijo, no crece. */
    b.style.maxHeight = '260px';
    const v3 = tope();
    masCerrar(); f121bLetra(1); masAbrir('avisosCtrl');
    const v1 = tope();
    PRUEBAS.igual(v3, v1, 'DISCRIMINADOR: con 260 px fijos el tope es el mismo con las dos letras · ' + v1 + ' y ' + v3);
  } finally { f121bLimpiar(); }
});

PRUEBAS.caso('con letra «Muy grande», a la «A» grande del control de tamaño no se le corta la punta', () => {
  f121Arrancar();
  try {
    f121bLetra(3);
    mostrarVista('mas'); masAbrir('textoCtrl');
    const p = f121bPuntaDeLaA();
    PRUEBAS.cierto(p.tinta >= p.caja - 0.5, 'la letra empieza dentro de la caja que recorta · letra ' + p.tinta.toFixed(1) + ', caja ' + p.caja.toFixed(1));
    /* Discriminador: sin el margen de arriba, la letra asoma por encima del borde y se corta. */
    document.querySelector('#tcSliderWrap .tc-slider').style.marginTop = '0px';
    const q = f121bPuntaDeLaA();
    PRUEBAS.cierto(q.tinta < q.caja - 0.5, 'DISCRIMINADOR: sin el margen, la letra empieza por encima de la caja · ' + q.tinta.toFixed(1) + ' contra ' + q.caja.toFixed(1));
  } finally { f121bLimpiar(); }
});
