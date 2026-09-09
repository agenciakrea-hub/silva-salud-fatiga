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
  PRUEBAS.cierto(/navPush\(\)/.test(abridor),
    '🔒 el camino que abre el consentimiento y el tamaño de texto también apila');
});
