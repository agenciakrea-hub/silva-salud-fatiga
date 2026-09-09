PRUEBAS.grupo('P153 · las pantallas del alta tienen entrada propia');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Seis pantallas figuraban en `silvaAtras()` —o sea, el botón físico «atrás» dice saber cerrarlas—
   y NUNCA apilaban una entrada en el historial: `nominaOv`, `carruselOv`, `consent`,
   `textoOverlay`, `rolOv` y `claveOv`.

   Sobrevivían prestándose la entrada que `openSetup()` dejaba huérfana, y eso es una coincidencia,
   no un diseño. Para dos ya estaba roto: al carrusel y a la nómina se llega ANTES que a
   `openSetup`, así que en un arranque limpio no hay ninguna entrada y el botón físico SALE DE LA
   APP en medio del registro — el `popstate` ni se dispara. Medido antes del arreglo:
   `carruselMostrar()` y `nominaAbrir()` apilaban CERO.

   Es el «callejón sin salida» que R1 creyó cerrar con sólo nombrarlas en `silvaAtras()`: estar en
   la lista no sirve de nada si no hay entrada que el navegador pueda sacar.

   ⚠️ FALTA EL SEGUNDO PASO, y está dicho en `PENDIENTES_USUARIO.md`: los cierres por pantalla
   todavía no consumen su entrada, así que quedan huérfanas (el «atrás» no responde una vez por
   cada una). Eso es molesto; quedarse sin salida era grave. El orden lo exige el propio hallazgo:
   primero entrada propia, recién después cerrar la fuga de `closeSetup()`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Cuenta los `pushState` REALES de una apertura, entrando por la función que la abre de verdad.
   ⚠️ Guarda de medibilidad: si el overlay no llega a mostrarse, `abrio` da false y el caso falla
   por eso — no sigue contando ceros como si el balance diera bien. */
function p153Apila(id, abrir){
  const orig = history.pushState.bind(history);
  let n = 0, abrio = false, err = '';
  history.pushState = function(){ n++; return orig.apply(history, arguments); };
  try {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { abrir(); } catch(e){ err = e.message; }
    const ov = document.getElementById(id);
    abrio = !!(ov && ov.classList.contains('show'));
  } finally {
    history.pushState = orig;
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch(e){}
  }
  return { n, abrio, err };
}

const P153_PERFIL = { nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                      cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' };

PRUEBAS.caso('🔴 el carrusel apila su entrada · a él se llega ANTES que a `openSetup`', () => {
  const previo = getProfile();
  try {
    const r = p153Apila('carruselOv', () => carruselMostrar());
    PRUEBAS.cierto(r.abrio, 'guarda de medibilidad: el carrusel se abrió · ' + (r.err || ''));
    PRUEBAS.igual(r.n, 1,
      '⚠️ apila UNA entrada · antes apilaba cero y en un arranque limpio el «atrás» salía de la app');
  } finally { if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE); }
});

PRUEBAS.caso('🔴 la nómina también · es la otra que ya estaba rota hoy', () => {
  const r = p153Apila('nominaOv', () => nominaAbrir());
  PRUEBAS.cierto(r.abrio, 'guarda de medibilidad: la nómina se abrió · ' + (r.err || ''));
  PRUEBAS.igual(r.n, 1, '⚠️ apila UNA entrada · antes cero');
});

PRUEBAS.caso('⚠️ y las que se abren ENCIMA del alta, que se llevaban la entrada de abajo', () => {
  /* Sin entrada propia, el «atrás» sobre una de éstas consumía la de la pantalla de abajo: cerraba
     dos de un toque, o salía de la app según lo que hubiera apilado antes. */
  const previo = getProfile();
  try {
    setProfile(Object.assign({}, P153_PERFIL, { rol:'medico', rolOrigen:'nomina' }));
    const rol = p153Apila('rolOv', () => rolOfrecerAbrir());
    PRUEBAS.cierto(rol.abrio, 'guarda: el ofrecimiento de rol se abrió · ' + (rol.err || ''));
    PRUEBAS.igual(rol.n, 1, '⚠️ `rolOv` apila la suya');
    const clv = p153Apila('claveOv', () => clvAbrir());
    PRUEBAS.cierto(clv.abrio, 'guarda: la pantalla de contraseña se abrió · ' + (clv.err || ''));
    PRUEBAS.igual(clv.n, 1, '⚠️ `claveOv` apila la suya');
  } finally { if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE); }
});

PRUEBAS.caso('🔒 las seis están en `silvaAtras` · estar en la lista y apilar tienen que ir juntos', () => {
  /* El defecto no era que faltara una u otra cosa: era que estaban DESPAREJAS. Figurar en
     `silvaAtras()` sin apilar es prometer una salida que no existe; apilar sin figurar dejaría una
     entrada que nadie usa. Este caso las ata: si alguien agrega una pantalla a la lista y se olvida
     del `navPush`, o al revés, se pone rojo.
     Se mide sobre el fuente, que es donde vive la relación — no hay un efecto observable que las
     compare sin abrir las seis en orden. */
  const fuente = silvaAtras.toString();
  const seis = ['nominaOv','carruselOv','consent','textoOverlay','rolOv','claveOv'];
  const faltan = seis.filter(id => fuente.indexOf("'" + id + "'") < 0);
  PRUEBAS.igual(faltan.join(', '), '', '🔒 las seis siguen nombradas en silvaAtras()');
  /* Y que cada abridor apile: se comprueba por comportamiento en los casos de arriba para cuatro;
     `consent` y `textoOverlay` los abre `avanzarAlta()`, que encadena varias pantallas y no se
     puede aislar sin armar el estado a mano — se verifican por el fuente de su abridor. */
  const abridor = avanzarAlta.toString().replace(/\/\*[\s\S]*?\*\//g, ' ');
  /* P153c · pasó a `navPushAlta()`, que apila igual salvo cuando la entrada viene traspasada de la
     pantalla anterior. Lo que se vigila sigue siendo lo mismo: que este camino apile. */
  PRUEBAS.cierto(/navPushAlta\(\)/.test(abridor),
    '🔒 el camino que abre el consentimiento y el tamaño de texto también apila');
});

/* ── P153b · EL CIERRE POR PANTALLA DESCARTA SU ENTRADA ────────────────────────────────────── */

/* Balance de un ciclo abrir/cerrar completo, entrando por la función real y por el control real
   del DOM. Mismo instrumento que `p048-overlays.js`. */
async function p153Ciclo(n, abrir, id, selCierre){
  const origPush = history.pushState.bind(history);
  const origBack = history.back.bind(history);
  let pushes = 0, backs = 0, medibleOk = true, porQue = '';
  history.pushState = function(){ pushes++; return origPush.apply(history, arguments); };
  history.back = function(){ backs++; return origBack.apply(history, arguments); };
  try {
    for (let i = 0; i < n; i++){
      try { abrir(); } catch(e){ medibleOk = false; porQue = 'abrir(): ' + e.message; break; }
      const ov = document.getElementById(id);
      void ov.offsetWidth;
      if (!ov.classList.contains('show')){ medibleOk = false; porQue = '#' + id + ' no se abrió'; break; }
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

PRUEBAS.caso('🔴 abrir y cerrar el carrusel 4 veces por su ✕ no deja historial huérfano', async () => {
  const r = await p153Ciclo(4, () => carruselMostrar(), 'carruselOv', '#carruselOv .car-cerrar');
  PRUEBAS.cierto(r.medibleOk, 'guarda de medibilidad: ' + (r.porQue || 'el carrusel se abre y la ✕ existe'));
  if (!r.medibleOk) return;
  PRUEBAS.igual(r.pushes, 4, 'cada apertura apila la suya (P153)');
  PRUEBAS.igual(r.backs, 4, '⚠️ y cada cierre por la ✕ la descarta · antes quedaban las cuatro colgadas');
  PRUEBAS.igual(r.pushes - r.backs, 0, 'balance neto en cero');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: sin navConsumir el balance se rompe', async () => {
  const orig = window.navConsumir;
  let seLlamo = false;
  try {
    window.navConsumir = function(){ seLlamo = true; };   // así estaba antes: no hace nada
    const r = await p153Ciclo(3, () => carruselMostrar(), 'carruselOv', '#carruselOv .car-cerrar');
    PRUEBAS.cierto(seLlamo, 'guarda: la ✕ SÍ pasa por navConsumir · si no, no se mide nada');
    PRUEBAS.igual(r.backs, 0, '⚠️ con navConsumir anulado no se descarta ninguna');
    PRUEBAS.igual(r.pushes, 3, 'y las tres quedaron apiladas');
  } finally { window.navConsumir = orig; }
});

PRUEBAS.caso('⚠️ `silvaAtras` sigue cerrando el carrusel SIN consumir · ahí ya lo hizo el navegador', () => {
  /* La otra mitad de la regla, y la que se rompe más fácil: si `silvaAtras` empezara a consumir,
     el botón físico descartaría dos entradas de un toque — la que el navegador ya sacó y una ajena. */
  const fuente = silvaAtras.toString().replace(/\/\*[\s\S]*?\*\//g, ' ');
  PRUEBAS.cierto(/carruselCerrar\(\)/.test(fuente), '⚠️ el botón físico llama a `carruselCerrar()` pelado');
  PRUEBAS.falso(/carruselCerrarUI\(\)/.test(fuente), '⚠️ y NO a la versión que consume');
});

PRUEBAS.caso('🔴 los cierres que ENCADENAN traspasan su entrada · ni consumen ni apilan de más', () => {
  /* P153b los dejó sin consumir a propósito: `navConsumir()` hace un `history.back()` asíncrono y
     contra el `pushState` sincrónico de la pantalla siguiente terminaba deshaciendo la entrada
     NUEVA. P153c lo resolvió sin tocar el historial: la pantalla que se abre REUSA la entrada de la
     que se cerró. Cero `back()` nuevos, que es lo que hace seguro el arreglo.
     Se mide sobre el fuente porque lo que se vigila es cuál de las dos rutas se usa. */
  const enc = ['clvPosponer','rolPosponer'].filter(n => {
    const f = window[n];
    if (typeof f !== 'function') return false;
    return !/altaEncadenar\(/.test(f.toString());
  });
  PRUEBAS.igual(enc.join(', '), '', '🔴 los dos encadenan por `altaEncadenar()`');
  const conBack = ['clvPosponer','rolPosponer'].filter(n =>
    /navConsumir\(\)/.test(String(window[n] || '').replace(/\/\*[\s\S]*?\*\//g, ' ')));
  PRUEBAS.igual(conBack.join(', '), '',
    '🔒 y ninguno hace un `back()` propio · el riesgo del arreglo era agregar backs, no quitarlos');
});
PRUEBAS.caso('🔴 el recorrido encadenado no acumula entradas · una por pantalla visible', async () => {
  /* El invariante que P153c protege: al pasar de una pantalla del alta a la siguiente, el total de
     entradas propias NO crece. Se mide sobre el camino real —`clvPosponer()`, que es el botón «Más
     tarde»— contando pushState y back de verdad. */
  const previo = { todo: Object.assign({}, localStorage) };
  const origPush = history.pushState.bind(history);
  const origBack = history.back.bind(history);
  let pushes = 0, backs = 0;
  history.pushState = function(){ pushes++; return origPush.apply(history, arguments); };
  history.back = function(){ backs++; return origBack.apply(history, arguments); };
  try {
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' });
    p048LimpiarOverlays();
    /* Se abre la pantalla de la contraseña como la abre el alta, y se toca «Más tarde». */
    const abrio = clvAbrir();
    PRUEBAS.cierto(abrio !== false, 'guarda de medibilidad: la pantalla de contraseña se abrió');
    if (abrio === false) return;
    const trasAbrir = pushes;
    PRUEBAS.igual(trasAbrir, 1, 'guarda: apiló su entrada (P153)');
    clvPosponer();
    await p048EsperarTurno(80);
    const abiertos = document.querySelectorAll('.overlay.show').length;
    const netas = pushes - backs;
    PRUEBAS.alMenos(1, netas, '⚠️ el encadenamiento NO acumula · quedaron ' + netas +
      ' entradas para ' + abiertos + ' overlays abiertos');
  } finally {
    history.pushState = origPush;
    history.back = origBack;
    p048LimpiarOverlays();
    try { localStorage.clear(); Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k])); } catch(e){}
    try { syncScrollLock(); } catch(e){}
  }
});
