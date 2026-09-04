
PRUEBAS.grupo('U1 · dos homónimos ya no se pisan el registro');

/* ⚠️ POR QUÉ EXISTE. Los ids de turno, operacional y consentimiento los armaba el cliente con el
   nombre normalizado y nada más (`turno_<nombre>_<fecha>_<tipo>`), y el servidor los buscaba en TODA
   la hoja. Dos "José Rodríguez" —de la misma empresa o de dos clientes distintos— generaban el MISMO
   id, y el `setValues` del upsert le reemplazaba la fila al otro: el check-in del primero
   desaparecía del CH, en el panel figuraba como "no registró hoy", y la aptitud se evaluaba sin ese
   dato. Todos los días, en silencio, y sin pasar por la bitácora.
   Que hay homónimos no es hipótesis: el endpoint mantiene un índice de nombres ambiguos para eso. */

PRUEBAS.caso('⚠️ el id lleva la cédula, así que dos homónimos generan ids DISTINTOS', () => {
  const previo = getProfile();
  try {
    setProfile({ nombre:'José Rodríguez', empresa:'Helitec', cedula:'V-111' });
    const a = turnoHoyId('José Rodríguez', 'checkin');
    setProfile({ nombre:'José Rodríguez', empresa:'Aeroambulancias Silva', cedula:'V-222' });
    const b = turnoHoyId('José Rodríguez', 'checkin');
    PRUEBAS.falso(a === b,
      '⚠️ mismo nombre, cédulas distintas: los ids NO pueden coincidir (' + a + ' / ' + b + ')');

    /* Y el discriminador, que es lo que hace que el caso signifique algo: con el formato VIEJO los
       dos daban lo mismo. Si esta comprobación fallara, el caso de arriba estaría verde por alguna
       otra razón y no por haber arreglado el defecto. */
    PRUEBAS.igual(turnoHoyIdPrevio('José Rodríguez', 'checkin'), turnoHoyIdPrevio('José Rodríguez', 'checkin'),
      'el formato viejo era determinista por nombre…');
    setProfile({ nombre:'José Rodríguez', empresa:'Helitec', cedula:'V-111' });
    const viejoA = turnoHoyIdPrevio('José Rodríguez', 'checkin');
    setProfile({ nombre:'José Rodríguez', empresa:'Aeroambulancias Silva', cedula:'V-222' });
    PRUEBAS.igual(turnoHoyIdPrevio('José Rodríguez', 'checkin'), viejoA,
      '⚠️ …y por eso COLISIONABA: con el id viejo los dos homónimos son indistinguibles');
  } finally { if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} } }
});

PRUEBAS.caso('⚠️ sin cédula el id NO se rompe: cae al nombre, como antes', () => {
  /* Los perfiles anteriores a que la cédula fuera obligatoria no la tienen. Cambiar el id no puede
     dejarlos sin poder registrar: ese caso simplemente sigue sin desambiguar, que es como estaba. */
  const previo = getProfile();
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec' });     // sin cédula
    const id = turnoHoyId('Ana Suárez', 'checkin');
    PRUEBAS.cierto(!!id && id.indexOf('turno_') === 0, 'tiene que seguir generando un id válido: ' + id);
    PRUEBAS.igual(id, turnoHoyIdPrevio('Ana Suárez', 'checkin'),
      'sin cédula, el id nuevo y el viejo son el mismo: nada cambia para quien no la tiene');
  } finally { if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} } }
});

PRUEBAS.caso('⚠️ el check-in de hoy sigue apareciendo tras el cambio de formato', () => {
  /* La trampa de este arreglo. `turnosHoy` lee lo guardado LOCALMENTE por id: si sólo buscara el id
     nuevo, quien hizo su check-in por la mañana abría la app por la tarde y la tarjeta se lo volvía
     a pedir como si no lo hubiera hecho. Es el mismo síntoma que I4 ya había corregido para los
     turnos de noche, reintroducido por otra puerta. */
  const previo = getProfile(), prevTurnos = turnosAll();
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec', cedula:'V-111' });
    const idViejo = turnoHoyIdPrevio('Ana Suárez', 'checkin');
    turnosSave({ [idViejo]: { id:idViejo, tipo:'checkin', fecha:todayStr(), persona:'Ana Suárez', creada:Date.now() } });
    const hoy = turnosHoy('Ana Suárez');
    PRUEBAS.cierto(!!(hoy && hoy.checkin),
      '⚠️ un check-in guardado con el id anterior TIENE que seguir encontrándose');
  } finally {
    turnosSave(prevTurnos);
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  }
});

PRUEBAS.caso('⚠️ y viaja `idPrevio`, para que el servidor actualice la fila en vez de duplicarla', () => {
  /* Sin esto, el día del cambio cada persona duplicaría su check-in en el CH: el servidor no
     encontraría el id nuevo, haría append, y quedarían dos filas del mismo evento —que además
     vuelven a contar en los promedios. */
  const fuente = String(turnoGuardar);
  PRUEBAS.cierto(/idPrevio/.test(fuente),
    '⚠️ el registro de turno tiene que mandar el id anterior junto con el nuevo');
  const fuenteOp = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/action:'operacional_guardar'[\s\S]{0,400}idPrevio/.test(fuenteOp),
    'y el operacional también');
  PRUEBAS.cierto(/consentimiento_guardar'[\s\S]{0,200}idPrevio/.test(fuenteOp),
    'y el consentimiento, que es la evidencia legal de que se informó');
});

PRUEBAS.grupo('U2 · el arranque');

/* ⚠️ HISTORIA, PORQUE EXPLICA POR QUÉ ESTOS CASOS SON COMO SON. Franco reportó que al abrir la app
   "se ponía azul el fondo durante unos segundos, vacío, con el link de la web arriba". Ese link lo
   pinta el navegador —muestra el origen mientras la PWA todavía no pintó nada— y no se puede quitar
   desde la app: lo único que se puede hacer es que la página pinte ANTES.

   Mi primer intento fue poner el logo sobre el fondo. Fue PEOR: el sistema ya muestra su pantalla de
   arranque con el ícono del manifest a su tamaño (grande), y yo volvía a pintarlo a 96 px fijos, con
   un fade de .28 s encima. El logo grande desaparecía y aparecía uno chico. Franco lo describió como
   "el logo se achica o tiene como una animación, tipo horrible" — y tenía razón: agregué dos
   defectos donde no había ninguno.

   Lo que quedó: el pre-arranque tapa el hueco con EL MISMO COLOR y nada más. Un color plano idéntico
   es invisible en la transición; cualquier cosa dibujada encima es un salto. Y el arranque se acortó
   de verdad en el service worker, sirviendo desde el caché al instante. */

PRUEBAS.caso('⚠️ el pre-arranque NO dibuja nada: sólo tapa con el color', () => {
  /* El defecto que Franco reportó. Cualquier cosa dibujada acá —un logo, un texto, un spinner—
     compite con la pantalla de arranque del sistema y se ve como un salto. */
  const pc = document.getElementById('preCarga');
  PRUEBAS.cierto(!!pc, 'tiene que existir el pre-arranque');
  if (!pc) return;
  PRUEBAS.igual(pc.children.length, 0,
    '⚠️ CERO elementos adentro. Con un logo, el del sistema (grande) salta al de acá (chico)');
  PRUEBAS.igual(pc.querySelectorAll('img').length, 0, 'y ninguna imagen');
  PRUEBAS.igual((pc.textContent || '').trim(), '', 'ni texto');
});

PRUEBAS.caso('⚠️ y no se va con una animación', () => {
  /* La otra mitad de lo que se veía mal: el contenedor se desvanecía en .28 s. Un fade sobre una
     pantalla de arranque es exactamente el parpadeo que se vino a sacar. */
  const pc = document.getElementById('preCarga');
  if (!pc) { PRUEBAS.cierto(false, 'no existe'); return; }
  const cs = getComputedStyle(pc);
  PRUEBAS.igual(cs.transitionDuration, '0s',
    '⚠️ sin transición: se apaga con display:none, no con un fade');
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('');
  PRUEBAS.cierto(/body\.listo #preCarga \{ display: none; \}/.test(css),
    'y el apagado es display:none');
});

PRUEBAS.caso('⚠️ su fondo es EXACTAMENTE el del manifest, o se ve un salto de color', () => {
  /* El navegador pinta su pantalla de arranque con `background_color` del manifest. Si el
     pre-arranque usara otro azul, la transición entre las dos sería un parpadeo de color —el mismo
     tipo de detalle que se vino a sacar. */
  const pc = document.getElementById('preCarga');
  if (!pc) { PRUEBAS.cierto(false, 'no existe el pre-arranque'); return; }
  const fondo = getComputedStyle(pc).backgroundColor;
  const m = String(fondo).match(/\d+/g) || [];
  const hex = '#' + m.slice(0,3).map(n => Number(n).toString(16).padStart(2,'0')).join('');
  PRUEBAS.igual(hex, '#0a1f40',
    '⚠️ tiene que coincidir con background_color y theme_color del manifest (dio ' + fondo + ')');
});

PRUEBAS.caso('⚠️ y se apaga cuando la app ya decidió qué mostrar', () => {
  /* Si no se apagara, taparía la app para siempre. Y tiene que apagarse DESPUÉS de que se decida
     entre splash y app, o se vería el estado intermedio que este arreglo vino a esconder. */
  PRUEBAS.cierto(document.body.classList.contains('listo'),
    'al terminar el arranque, el body tiene que quedar marcado como listo');
  const pc = document.getElementById('preCarga');
  /* `display:none` y NO `opacity:0`: con opacidad hay transición, y una transición acá es
     exactamente el parpadeo que Franco reportó. */
  if (pc) PRUEBAS.igual(getComputedStyle(pc).display, 'none', 'y el pre-arranque, fuera de escena');

  /* La red de seguridad: si el script se corta —que en este archivo ya pasó tres veces por orden de
     declaración (R16)— el pre-arranque tiene que apagarse solo igual. Es preferible ver la app rota
     que una pantalla tapada para siempre sin ninguna explicación. */
  /* ⚠️ EL SEGURO YA NO ES UNA ANIMACIÓN, y el cambio fue deliberado: la app apaga TODAS las
     animaciones (`.sin-animaciones`) cuando el sistema pide menos movimiento o la pestaña está
     oculta, así que el apagado automático no corría justo para quien menos margen tiene. Ahora es un
     `setTimeout` en su propio bloque de script. El caso que lo verifica está en U2c. */
  const bloques = [...document.querySelectorAll('script')].map(x => x.textContent);
  PRUEBAS.cierto(bloques.some(b => /setTimeout[\s\S]{0,120}classList\.add\('listo'\)/.test(b)),
    '⚠️ tiene que haber un seguro que destape el pre-arranque si el script principal no llega');
});

PRUEBAS.grupo('U3 · entrar con la contraseña propia (Z2-cliente)');

/* ⚠️ ESTA PANTALLA FALTABA, y su ausencia era el defecto más caro de la auditoría. Z4 publicó la
   pantalla que CREA la credencial sin la que la USA: `action:'login'` no aparecía ni una vez en el
   cliente. Quien aceptaba "Elige tu contraseña" quedaba sin poder ver sus estadísticas, con un
   mensaje del servidor que le decía "inicia sesión con ella" y ningún lugar donde hacerlo. */

PRUEBAS.caso('⚠️ la app YA SABE entrar con contraseña propia', () => {
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/action\s*:\s*'login'/.test(fuente),
    '⚠️ tiene que existir la llamada a `login`: sin ella, el bloque Z2/Z4 entero es decorativo');
  PRUEBAS.cierto(!!document.getElementById('loginOv'), 'y la pantalla donde escribirla');
  PRUEBAS.cierto(typeof lgnAbrir === 'function' && typeof lgnEntrar === 'function', 'y sus funciones');
});

PRUEBAS.caso('⚠️ cuando el servidor pide la contraseña, se abre el login (no un error mudo)', () => {
  /* El enganche. Antes, `necesita_clave` caía en el `return false` de `misSincronizar` y en un
     "Reintentar" que iba a fallar siempre. */
  PRUEBAS.cierto(/necesita_clave/.test(String(misSincronizar)),
    '⚠️ `misSincronizar` tiene que reconocer el motivo, no descartarlo');
  PRUEBAS.cierto(/lgnAbrir/.test(String(misSincronizar)), 'y abrir el login');
  PRUEBAS.cierto(/necesita_clave[\s\S]{0,300}lgnAbrir/.test(String(portalAutoLoginEmpleado)),
    'y el panel del empleado también');
});

PRUEBAS.caso('⚠️ se guarda la SESIÓN, nunca la contraseña', () => {
  const prevSes = localStorage.getItem(K_SES_PERSONA);
  const prevPerfil = getProfile(), prevFetch = window.fetchConReloj;
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec', cedula:'V-111' });
    try { localStorage.removeItem(K_SES_PERSONA); } catch(e){}
    document.getElementById('lgnCed').value = 'V-111';
    document.getElementById('lgnPass').value = 'LaClaveDeAna2026';
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({
      ok:true, sesion:'sst_xyz.elsecreto', persona:{ empresa:'Helitec', cedula:'V-111', rol:'empleado' } }) });
    lgnEntrar(null);
    return new Promise(res => setTimeout(() => {
      const todo = JSON.stringify(localStorage);
      PRUEBAS.cierto(todo.indexOf('sst_xyz.elsecreto') >= 0, 'el token sí se guarda');
      PRUEBAS.falso(todo.indexOf('LaClaveDeAna2026') >= 0,
        '⚠️ la contraseña NO puede quedar en el dispositivo, en ninguna clave');
      res();
    }, 80));
  } finally {
    window.fetchConReloj = prevFetch;
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { prevSes == null ? localStorage.removeItem(K_SES_PERSONA) : localStorage.setItem(K_SES_PERSONA, prevSes); } catch(e){}
    try { document.getElementById('loginOv').classList.remove('show'); } catch(e){}
  }
});

PRUEBAS.caso('⚠️ el token de otra persona no sirve en este perfil', () => {
  /* Si el teléfono cambió de dueño, la sesión de la persona anterior no puede seguir abriendo
     datos de salud. Se compara la cédula además del token. */
  const prevSes = localStorage.getItem(K_SES_PERSONA), prevPerfil = getProfile();
  try {
    localStorage.setItem(K_SES_PERSONA, JSON.stringify({ cedula:'V-111', token:'sst_de-ana.x' }));
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec', cedula:'V-111' });
    PRUEBAS.igual(sesPersonaToken(), 'sst_de-ana.x', 'con su propia cédula, el token viaja');
    setProfile({ nombre:'Beto Pérez', empresa:'Helitec', cedula:'V-222' });
    PRUEBAS.igual(sesPersonaToken(), '', '⚠️ con OTRA cédula, no se manda nada');
  } finally {
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { prevSes == null ? localStorage.removeItem(K_SES_PERSONA) : localStorage.setItem(K_SES_PERSONA, prevSes); } catch(e){}
  }
});

PRUEBAS.caso('⚠️ "atrás" cierra el login, y no el portal que está debajo', () => {
  /* R1: ninguna pantalla sin salida. El login se abre POR ENCIMA del portal, así que si `silvaAtras`
     no lo contemplara, cerraría el portal por debajo y el login quedaría flotando sobre la nada. */
  const ov = document.getElementById('loginOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    const manejo = silvaAtras();
    PRUEBAS.cierto(manejo === true, '"atrás" tiene que hacerse cargo del login');
    PRUEBAS.falso(ov.classList.contains('show'), 'y cerrarlo');
  } finally { if (tenia) ov.classList.add('show'); else ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ el candado del servidor SÓLO puede estar encendido con el login conectado', () => {
  /* La invariante que quedó de la auditoría, ahora del lado correcto: el cliente ya sabe entrar, así
     que el candado TIENE que estar encendido. Si alguien lo apaga sin motivo, esto lo dice. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const encendido = /var\s+Z2_EXIGIR_CLAVE_PROPIA\s*=\s*true/.test(CTX.gs);
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const clienteSabeEntrar = /action\s*:\s*'login'/.test(fuente);
  PRUEBAS.cierto(clienteSabeEntrar, 'el cliente sabe hacer login');
  PRUEBAS.cierto(encendido,
    '⚠️ con el login conectado, el candado tiene que estar encendido: si no, la contraseña que la ' +
    'persona eligió no protege nada y la pantalla que se la pidió le mintió');
});

PRUEBAS.caso('los textos del login están en los dos idiomas (R14, R1)', () => {
  ['lgn_titulo','lgn_lead','lgn_ced','lgn_pass','lgn_entrar','lgn_entrando','lgn_luego','lgn_listo',
   'lgn_faltan','lgn_mal','lgn_sin_red','lgn_olvide','lgn_olvide_d'].forEach(k => {
    const v = t(k); PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
  });
  PRUEBAS.falso(/\b(escribí|podés|tenés|pediles)\b/i.test(t('lgn_lead') + ' ' + t('lgn_olvide_d')),
    'español neutro (R1)');
  /* Y que no prometa una recuperación que no existe: el servidor guarda un hash. */
  PRUEBAS.cierto(/no se puede recuperar|cannot be recovered/i.test(t('lgn_olvide_d')),
    '⚠️ tiene que decir la verdad: la contraseña está cifrada y nadie puede devolverla');
});

PRUEBAS.grupo('U2b · el service worker no puede dejar una versión pegada');

/* El arranque se acortó sirviendo la app desde el caché al instante en vez de esperar a la red. Eso
   es lo que de verdad saca los segundos de pantalla azul —el navegador muestra el link del sitio
   mientras la página no pintó— pero sólo es aceptable si, cuando lo servido NO es lo último, se
   dice. Sin el aviso estaríamos cambiando "arranca lento" por "puede quedar pegada una versión
   vieja", que es el error más caro que tuvo este proyecto. */

PRUEBAS.caso('⚠️ el sw avisa cuando lo que sirvió no es lo último', async () => {
  const r = await fetch('/sw.js').then(x => x.text()).catch(() => '');
  PRUEBAS.alMenos(r.length, 100, 'tiene que poder leerse sw.js');
  PRUEBAS.cierto(/postMessage\(\{\s*tipo:\s*'version-nueva'/.test(r),
    '⚠️ el service worker tiene que avisarle a la app cuando hay versión nueva');
  PRUEBAS.cierto(/nuevo !== textoViejo/.test(r),
    'y sólo cuando de verdad cambió: avisar en cada apertura es un cartel que se aprende a cerrar sin leer');
  PRUEBAS.cierto(/cache\.put\('\.\/index\.html'/.test(r),
    'y la revalidación tiene que guardar la versión nueva, o el aviso no serviría de nada');
});

PRUEBAS.caso('⚠️ la app escucha ese aviso y ofrece actualizar', () => {
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/'version-nueva'/.test(fuente),
    '⚠️ sin esto, el sw avisa al vacío y la versión vieja se queda para siempre');
  PRUEBAS.cierto(typeof versionNuevaAvisar === 'function', 'y existe la función que lo muestra');
});

PRUEBAS.caso('⚠️ pero NO recarga sola', () => {
  /* Alguien puede estar a mitad de un test de reacción de 90 segundos. Recargarle la app debajo le
     hace perder el trabajo — la clase de "mejora" que se paga cara. Decide la persona. */
  const f = String(versionNuevaAvisar);
  PRUEBAS.falso(/^[\s\S]*location\.reload\(\)\s*;/m.test(f.replace(/onclick="[^"]*"/g, '')),
    '⚠️ la recarga sólo puede salir de un botón, nunca automática');
  PRUEBAS.cierto(/onclick="location\.reload\(\)"/.test(f), 'y ese botón tiene que existir');
});

PRUEBAS.caso('⚠️ el aviso no aparece hasta que haga falta, y se puede cerrar', () => {
  PRUEBAS.falso(!!document.getElementById('verNuevaBar'),
    'en una app al día no puede haber ningún cartel');
  const previo = document.getElementById('verNuevaBar');
  if (previo) previo.remove();
  versionNuevaAvisar();
  const b = document.getElementById('verNuevaBar');
  try {
    PRUEBAS.cierto(!!b, 'al llamarlo, aparece');
    versionNuevaAvisar();
    PRUEBAS.igual(document.querySelectorAll('#verNuevaBar').length, 1,
      '⚠️ y no se apila si el aviso llega dos veces');
    const cerrar = b.querySelector('.vn-x');
    PRUEBAS.cierto(!!cerrar, 'tiene que poder cerrarse: no puede tapar la app para siempre');
    PRUEBAS.alMenos(Math.round(b.querySelector('button').getBoundingClientRect().height), 44,
      'y sus botones se tocan con guantes');
  } finally { if (b) b.remove(); }
});

PRUEBAS.caso('los textos del aviso están en los dos idiomas (R14)', () => {
  ['ver_nueva','ver_nueva_btn'].forEach(k => {
    const v = t(k); PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
  });
});

PRUEBAS.grupo('U2c · la barra de versión nueva (defectos de la auditoría)');

/* ⚠️ LOS TRES DEFECTOS DE ESTE COMPONENTE ERAN MÍOS Y DEL MISMO DÍA. Lo agregué sin revisarlo y una
   auditoría los encontró a los diez minutos. Como el service worker manda ese aviso después de cada
   publicación, era lo primero que iba a ver todo el mundo. */

function u2cAbrir(){
  const previo = document.getElementById('verNuevaBar');
  if (previo) previo.remove();
  versionNuevaAvisar();
  return document.getElementById('verNuevaBar');
}

PRUEBAS.caso('⚠️ se lee en tema OSCURO (daba 1,05:1, o sea invisible)', () => {
  /* El defecto: `background: var(--sobre-claro)` con `color: var(--card)`. Los dos son el mismo azul
     oscuro en tema oscuro, así que el texto y la × desaparecían y quedaba un rectángulo con un botón
     naranja flotando. `--sobre-claro` es TINTA para superficies claras; usarlo de fondo con otro
     token oscuro encima es cómo se llega a 1:1. */
  const b = u2cAbrir();
  const rgba = c => { const m = String(c).match(/[\d.]+/g) || [0,0,0,1];
    return { r:+m[0], g:+m[1], b:+m[2], a: m.length > 3 ? +m[3] : 1 }; };
  const lum = c => { const g = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*g(c.r) + 0.7152*g(c.g) + 0.0722*g(c.b); };
  const ratio = (x,y) => { const [h,l] = x > y ? [x,y] : [y,x]; return (h+0.05)/(l+0.05); };
  const previo = document.documentElement.getAttribute('data-tema');
  const flojos = [];
  try {
    ['claro','oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      const cs = getComputedStyle(b), bg = rgba(cs.backgroundColor);
      const rt = ratio(lum(rgba(cs.color)), lum(bg));
      if (rt < 4.5) flojos.push(tema + '/texto: ' + rt.toFixed(2) + ':1');
      const bt = b.querySelector('button'), bs = getComputedStyle(bt);
      const rb = ratio(lum(rgba(bs.color)), lum(rgba(bs.backgroundColor)));
      if (rb < 4.5) flojos.push(tema + '/botón: ' + rb.toFixed(2) + ':1');
    });
  } finally {
    if (previo) document.documentElement.setAttribute('data-tema', previo);
    else document.documentElement.removeAttribute('data-tema');
    b.remove();
  }
  PRUEBAS.igual(flojos, [], 'nada por debajo de 4,5:1 — ' + flojos.join(' | '));
});

PRUEBAS.caso('⚠️ ocupa el ancho de la pantalla, no 207 px', () => {
  /* Un `position:fixed` con `left:50%` y SIN `width` calcula su ancho de ajuste contra lo que queda
     a la derecha: la mitad de la pantalla. La barra medía 207 px en un teléfono, con el mensaje
     partido en seis renglones verticales, y el `max-width` no llegaba a aplicarse nunca. */
  const b = u2cAbrir();
  const malos = [];
  try {
    [[320,640],[375,812],[768,1024]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const r = b.getBoundingClientRect();
        const esperado = Math.min(w - 32, 460);
        if (Math.abs(r.width - esperado) > 4) malos.push(w + ': mide ' + Math.round(r.width) + ', esperaba ~' + esperado);
        /* Alto: una barra de una o dos líneas, no una columna. */
        if (r.height > 90) malos.push(w + ': alto ' + Math.round(r.height) + ' px — el texto se está apilando');
      });
    });
  } finally { b.remove(); }
  PRUEBAS.igual(malos, [], 'el ancho tiene que seguir a la pantalla — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ no se monta sobre el cartel de "recordar dispositivo"', () => {
  /* Estaba a `bottom:5.2rem` con z-index 60, y el cartel de recordar está a 5rem con z-index 5:
     le tapaba los botones. Es el MISMO choque que ya se pagó con `.gest-fab`, y por el que ese
     cartel está justamente a 5rem — esa franja está reservada. */
  const b = u2cAbrir();
  const cartel = document.getElementById('dashRemember');
  const teniaC = cartel && cartel.classList.contains('show');
  if (cartel) cartel.classList.add('show');
  try {
    PRUEBAS.cierto(!!cartel, 'tiene que existir el cartel para comparar');
    if (!cartel) return;
    const rb = b.getBoundingClientRect(), rc = cartel.getBoundingClientRect();
    const seSolapan = !(rb.bottom <= rc.top || rb.top >= rc.bottom);
    PRUEBAS.falso(seSolapan,
      '⚠️ se solapan: barra ' + Math.round(rb.top) + '-' + Math.round(rb.bottom) +
      ', cartel ' + Math.round(rc.top) + '-' + Math.round(rc.bottom));
  } finally { b.remove(); if (cartel && !teniaC) cartel.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ el seguro del pre-arranque NO puede ser una animación', () => {
  /* El apagado automático a los 8 s existe para cuando el script principal se corta — en este
     archivo ya pasó tres veces por orden de declaración. Estaba hecho con `animation`, y la app pone
     `.sin-animaciones` (que hace `animation: none !important`) cuando el sistema pide menos
     movimiento O cuando la pestaña está oculta. O sea que el seguro estaba apagado justo para quien
     menos margen tiene, y el resultado habría sido una pantalla azul lisa para siempre. */
  const html = document.documentElement;
  const tenia = html.classList.contains('sin-animaciones');
  html.classList.add('sin-animaciones');
  try {
    const pc = document.getElementById('preCarga');
    PRUEBAS.cierto(!!pc, 'tiene que existir el pre-arranque');
    if (pc) PRUEBAS.igual(getComputedStyle(pc).animationName, 'none',
      'con `sin-animaciones` no queda ninguna animación de la que depender');
  } finally { if (!tenia) html.classList.remove('sin-animaciones'); }

  /* Y el seguro tiene que existir de verdad, en su propio bloque de script: si estuviera adentro
     del script grande, dependería justo de lo que viene a cubrir. */
  const bloques = [...document.querySelectorAll('script')].map(x => x.textContent);
  const suyo = bloques.filter(b => /setTimeout[\s\S]{0,120}classList\.add\('listo'\)/.test(b));
  PRUEBAS.alMenos(suyo.length, 1, '⚠️ tiene que haber un temporizador que destape el pre-arranque');
  /* Lo que importa no es el largo exacto sino que sea un bloque APARTE del grande: si viviera
     adentro del script principal, se caería con él — justo lo que viene a cubrir. Se compara contra
     el bloque que declara `APP_VERSION`, que es el grande. */
  const grande = bloques.find(b => /const APP_VERSION/.test(b)) || '';
  PRUEBAS.falso(/setTimeout[\s\S]{0,120}classList\.add\('listo'\)/.test(grande),
    '⚠️ el seguro NO puede vivir en el script principal: se caería junto con lo que viene a cubrir');
  PRUEBAS.comoMucho((suyo[0] || '').length, grande.length / 100,
    'y tiene que ser un bloque chico, no otro monolito');
});
