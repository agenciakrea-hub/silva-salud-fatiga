
PRUEBAS.grupo('Q4c · quien SÓLO usa el panel tiene que poder entrar, salir y tabular');

/* ⚠️ DE QUIÉN HABLA ESTO. El servicio médico de la empresa cliente, un director de HSEQ: gente que
   usa el panel y NUNCA se da de alta como empleado. Para ellos `getProfile()` devuelve `null` para
   siempre, así que todo lo que dependa del perfil los deja afuera en silencio. Los tres defectos de
   abajo son de ese tipo, y los tres estaban reportados antes de medirlos. */

function q4cCon(estado, fn){
  const prev = { p: localStorage.getItem(K_PROFILE), c: localStorage.getItem(K_DASH_CREDS),
                 m: localStorage.getItem(K_DASH_CREDS_MED) };
  try {
    if (estado.perfil) localStorage.setItem(K_PROFILE, JSON.stringify(estado.perfil));
    else localStorage.removeItem(K_PROFILE);
    if (estado.creds) localStorage.setItem(K_DASH_CREDS, JSON.stringify(estado.creds));
    else localStorage.removeItem(K_DASH_CREDS);
    localStorage.removeItem(K_DASH_CREDS_MED);
    return fn();
  } finally {
    ['p','c','m'].forEach((k, i) => {
      const key = [K_PROFILE, K_DASH_CREDS, K_DASH_CREDS_MED][i];
      if (prev[k]) localStorage.setItem(key, prev[k]); else localStorage.removeItem(key);
    });
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  }
}

PRUEBAS.caso('⚠️ el auto-login del panel SE LLAMA desde el camino real', () => {
  /* Q4a lo midió: `openPortal()` tenía la lógica completa y CERO usos. El botón Estadísticas iba a
     `openPortalGate()`, que no autologuea, así que el token de S4 no se usaba nunca para entrar.
     ⚠️ Este caso reemplaza al de Q4a que afirmaba el defecto (`usos === 0`), como decía ahí mismo. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const usos = (fuente.match(/[^e]\bopenPortal\s*\(/g) || []).length;
  PRUEBAS.alMenos(usos, 1,
    '⚠️ si esto vuelve a cero, el "Sí, recordar" dejó de recordar otra vez');
  PRUEBAS.cierto(/openPortal\(\);/.test(String(abrirDestinoEstadisticas)),
    '⚠️ y el camino que lo llama tiene que ser el botón Estadísticas, no cualquiera');
});

PRUEBAS.caso('⚠️ y NO exige perfil de empleado: entra con el token, tenga perfil o no', () => {
  /* El defecto reportado: "el «Sí, recordar» no recuerda si la persona entró desde el splash sin
     perfil". La causa era que las dos ramas pedían `p && p.esSupervisor`, y esa persona tiene
     `getProfile() === null` para siempre.
     Lo que autoriza a entrar es el TOKEN —emitido contra la contraseña de la empresa y validado por
     el servidor en cada pedido—, no el perfil. */
  const llamadas = [];
  const orig = portalAutoLoginSupervisor;
  q4cCon({ perfil: null, creds: { usuario:'Helitec', token:'tok-1' } }, () => {
    portalAutoLoginSupervisor = (c, k) => llamadas.push(k);
    try { openPortal(); } finally { portalAutoLoginSupervisor = orig; }
  });
  PRUEBAS.igual(llamadas.length, 1,
    '⚠️ sin perfil de empleado, con token guardado, TIENE que autologuear');
  PRUEBAS.igual(llamadas[0], K_DASH_CREDS, 'y con las credenciales de supervisor');
});

PRUEBAS.caso('⚠️ sin token, cae al formulario de siempre (discriminador)', () => {
  /* El que no guardó nada tiene que ver exactamente lo de antes. Sin este caso, "autologuea" podría
     estar entrando a cualquiera. */
  const llamadas = [];
  const orig = portalAutoLoginSupervisor;
  const r = q4cCon({ perfil: null, creds: null }, () => {
    portalAutoLoginSupervisor = (c, k) => llamadas.push(k);
    try { openPortal(); } finally { portalAutoLoginSupervisor = orig; }
    return document.getElementById('portalGate').style.display !== 'none';
  });
  PRUEBAS.igual(llamadas.length, 0, '⚠️ sin credenciales guardadas NO puede autologuear a nadie');
  PRUEBAS.cierto(r, 'y tiene que mostrar el formulario');
});

PRUEBAS.caso('⚠️ puede RETIRAR su sesión sin entrar a la app', () => {
  /* El único "Cerrar sesión" vive en la pestaña Más, dentro de `#app`, y a esta persona nunca se le
     revela `#app`. Medido: podía guardar su sesión y no tenía ninguna forma de sacarla. En un
     teléfono prestado eso es un token de empresa que se queda ahí. */
  const b = document.querySelector('.portal-olvidar-btn');
  PRUEBAS.cierto(!!b, '⚠️ tiene que existir la salida dentro del portal');
  if (!b) return;
  PRUEBAS.falso(!!b.closest('#app'),
    '⚠️ y NO puede vivir dentro de #app, que es exactamente lo que la hacía inalcanzable');
  PRUEBAS.cierto(/removeItem\(K_DASH_CREDS\)/.test(String(portalOlvidarDispositivo)) &&
                 /removeItem\(K_DASH_CREDS_MED\)/.test(String(portalOlvidarDispositivo)),
    'y tiene que borrar las DOS credenciales de empresa, no una');
  PRUEBAS.falso(/removeItem\(K_PROFILE\)/.test(String(portalOlvidarDispositivo)),
    '⚠️ pero NO el perfil de empleado: quien además es empleado sigue siéndolo');
});

PRUEBAS.caso('⚠️ y esa salida sólo aparece cuando hay algo que retirar', () => {
  /* Un "cerrar sesión" permanente en la puerta hace creer que hay una sesión abierta cuando no la
     hay. */
  const sin = q4cCon({ perfil: null, creds: null }, () => {
    openPortalGate(); return document.getElementById('portalOlvidar').style.display !== 'none'; });
  const con = q4cCon({ perfil: null, creds: { usuario:'Helitec', token:'t' } }, () => {
    openPortalGate(); return document.getElementById('portalOlvidar').style.display !== 'none'; });
  PRUEBAS.falso(sin, '⚠️ sin credenciales guardadas no se ofrece');
  PRUEBAS.cierto(con, '⚠️ con credenciales guardadas sí (discriminador)');
});

PRUEBAS.caso('⚠️ lo que queda TAPADO por otro overlay sale del orden de tabulación', () => {
  /* Medido: con el login de persona abierto encima de la portada, quien navega con teclado tenía
     que pasar por los CINCO controles de la portada antes de llegar al campo de cédula.
     `pointer-events` no cubre el teclado y `display:none` no se puede usar (los overlays se cruzan
     con una transición de opacidad). `inert` es exactamente esto. */
  const splash = document.getElementById('splashOv'), login = document.getElementById('loginOv');
  const previos = { s: splash.className, l: login.className };
  try {
    splash.classList.add('show'); login.classList.add('show');
    sincronizarInert();                       // el observer es asíncrono; acá se fuerza
    PRUEBAS.cierto(splash.hasAttribute('inert'),
      '⚠️ el de abajo tiene que quedar inert, o sus controles siguen tabulándose');
    PRUEBAS.falso(login.hasAttribute('inert'),
      '⚠️ y el de arriba NO — si no, no se puede usar nada (discriminador)');
    /* Y la app de atrás tampoco: primero la dejé afuera suponiendo que algún overlay mostraba
       contenido montado ahí; verificado, los 19 overlays son HERMANOS de `#app`. Sin esto, quien
       abre el login tabula por "Instalar la app" y las tarjetas del inicio antes de llegar al campo. */
    const enfocables = [...document.querySelectorAll('button,input,select,textarea')]
      .filter(e => !e.disabled && e.tabIndex >= 0 && !e.closest('[inert]'))
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    PRUEBAS.igual(enfocables.filter(e => !login.contains(e)).length, 0,
      '⚠️ con un overlay abierto, TODO lo enfocable tiene que estar dentro de él — quedaron ' +
      enfocables.filter(e => !login.contains(e)).slice(0,3)
        .map(e => (e.id || (e.textContent||'').trim().slice(0,18))).join(', '));
  } finally { splash.className = previos.s; login.className = previos.l; sincronizarInert(); }
});

PRUEBAS.caso('⚠️ y lo recupera cuando el de arriba se cierra', () => {
  /* Si el inert no se limpiara, cerrar un modal dejaría la pantalla de abajo muerta al teclado —
     un defecto peor que el original y mucho más difícil de ver. */
  const splash = document.getElementById('splashOv'), login = document.getElementById('loginOv');
  const previos = { s: splash.className, l: login.className };
  try {
    splash.classList.add('show'); login.classList.add('show'); sincronizarInert();
    login.classList.remove('show'); sincronizarInert();
    PRUEBAS.falso(splash.hasAttribute('inert'), '⚠️ el de abajo vuelve a ser usable');
    /* La app sigue inert acá, y está bien: el splash quedó abierto encima. Lo que hay que
       comprobar es que se libere cuando NO queda ningún overlay. */
    PRUEBAS.cierto(document.getElementById('app').hasAttribute('inert'),
      'con el splash todavía abierto, la app sigue tapada');
    splash.classList.remove('show'); sincronizarInert();
    PRUEBAS.falso(document.getElementById('app').hasAttribute('inert'),
      '⚠️ sin ningún overlay abierto, la app vuelve al teclado — si el inert quedara pegado, ' +
      'la pantalla entera quedaría muerta y sería un defecto peor que el original');
    PRUEBAS.falso(document.querySelector('.bottom-nav').hasAttribute('inert'),
      'y la barra inferior también, que es hermana de #app y no hija');
  } finally { splash.className = previos.s; login.className = previos.l; sincronizarInert(); }
});

PRUEBAS.caso('⚠️ con un solo overlay abierto, nadie queda inert', () => {
  const splash = document.getElementById('splashOv');
  const previo = splash.className;
  try {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    splash.classList.add('show'); sincronizarInert();
    PRUEBAS.falso(splash.hasAttribute('inert'), '⚠️ el único abierto tiene que ser usable');
  } finally { splash.className = previo; sincronizarInert(); }
});

PRUEBAS.caso('⚠️ el empleado de Helitec no cambió en nada', () => {
  /* Lo que este prompt NO puede tocar. Helitec está en producción y entra todos los días por acá. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/if \(_complete\)\{?\s*\n?\s*continuarAlta\(\);/.test(fuente),
    '⚠️ con perfil completo el arranque sigue yendo directo a la app');
  PRUEBAS.cierto(/portalAutoLoginEmpleado\(\); return;/.test(String(abrirDestinoEstadisticas)),
    '⚠️ y quien no gestiona sigue entrando derecho a sus propios datos, sin selector');
});

PRUEBAS.caso('los textos de la salida están en los dos idiomas (R14)', () => {
  ['pg_olvidar','pg_olvidar_confirmar','pg_olvidado'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\bvos\b|tenés|querés|podés/.test(String(v)), '⚠️ R1: español neutro, nunca voseo — ' + k);
  });
});
