
PRUEBAS.grupo('Q4d · cierre de la tanda del inicio');

/* Lo que este archivo fija salió de VERIFICAR la tanda, no de construirla: son dos defectos que
   Q4b y Q4c dejaron y que sólo aparecen si se recorre la app entera después de tocarla. */

PRUEBAS.caso('⚠️ "Administrador" muestra SÓLO lo de administrador', () => {
  /* El defecto que encontró esta verificación: `splashAdmin()` pasaba por `splashPortal()`, que
     destapa las tres pestañas de credencial y el login de usuario/contraseña de empresa. O sea que
     la puerta que Q4b sacó de la portada seguía ahí UN TOQUE MÁS ABAJO y con la etiqueta
     equivocada — quien buscaba "Soy supervisor" lo encontraba adentro de "Administrador".
     Y el admin no las necesita: entra con `usuario:'*'` y acceso total. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  try {
    ov.classList.add('show');
    splashAdmin();
    const vis = id => { const e = document.getElementById(id); if (!e) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    PRUEBAS.igual(['ptabSup','ptabMed','ptabHseq'].filter(vis), [],
      '⚠️ ninguna pestaña de credencial: es la puerta que Q4b cerró');
    PRUEBAS.falso(vis('portalCreds'),
      '⚠️ ni el login de empresa — un supervisor podría entrar por acá y la reforma quedaría a medias');
    PRUEBAS.cierto(vis('pAdminPass'), 'y sí el campo de administrador, que es a lo que se vino');
  } finally { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
              if (tenia) ov.classList.add('show'); }
});

PRUEBAS.caso('⚠️ y los caminos legítimos las REPONEN', () => {
  /* Si sólo se ocultaran, quedarían escondidas para siempre en ese dispositivo: quien tocó
     Administrador por curiosidad y después vino a entrar de verdad no encontraría cómo. */
  try {
    document.getElementById('splashOv').classList.add('show');
    splashAdmin();                                     // las esconde
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    document.getElementById('splashOv').classList.add('show');
    nominaSoyGestor();                                 // y este las tiene que reponer
    const vis = id => { const e = document.getElementById(id); if (!e) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    PRUEBAS.igual(['ptabSup','ptabMed','ptabHseq'].filter(vis).length, 3,
      '⚠️ las tres vuelven por el camino del alta');
    PRUEBAS.cierto(vis('portalCreds'), 'y el login de empresa también');
    PRUEBAS.falso(vis('pAdminPass'), 'y el de administrador se guarda (discriminador)');
  } finally { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); }
});

PRUEBAS.caso('⚠️ con la sesión vencida, el gate conserva el USUARIO', () => {
  /* El otro defecto de la verificación. El mensaje dice "escribe tu contraseña para entrar de
     nuevo", pero se borraba la credencial entera y los DOS campos quedaban vacíos: prometía un paso
     y hacían falta dos. Se ve más desde Q4b, porque ahora el arranque lleva a esta persona derecho
     al panel y el vencimiento es lo primero que ve al abrir la app.
     Lo que caduca es el TOKEN, no el nombre de usuario. */
  const fuente = String(portalAutoLoginSupervisor);
  PRUEBAS.cierto(/JSON\.stringify\(\{ usuario: c\.usuario \}\)/.test(fuente),
    '⚠️ al vencer tiene que guardar el usuario SOLO, sin token ni contraseña');
  PRUEBAS.falso(/removeItem\(credKey\);\s*\n\s*openPortalGate/.test(fuente),
    'y no borrarlo todo antes de repintar el gate');
});

PRUEBAS.caso('⚠️ y lo que queda guardado NO puede volver a entrar solo', () => {
  /* El discriminador que importa: si `{usuario}` sin token autorizara, una sesión vencida seguiría
     abriendo el panel — sería peor que el defecto original. */
  const prev = localStorage.getItem(K_DASH_CREDS);
  try {
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec' }));
    PRUEBAS.falso(portalTieneSesionDeEmpresa(),
      '⚠️ un usuario sin token ni contraseña no es una sesión: la próxima apertura vuelve a la portada');
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'t' }));
    PRUEBAS.cierto(portalTieneSesionDeEmpresa(), 'y con token sí (discriminador)');
  } finally { if (prev) localStorage.setItem(K_DASH_CREDS, prev); else localStorage.removeItem(K_DASH_CREDS); }
});

PRUEBAS.caso('⚠️ el prefill del gate no exige perfil de empleado', () => {
  /* Mismo defecto que Q4c arregló en `openPortal`, un piso más abajo: `puedeEmpresa` es
     `perfil.esSupervisor || perfil.esServicioMedico`, y quien sólo usa el panel tiene el perfil en
     `null` para siempre. Precargar un nombre de usuario no autoriza nada. */
  const prev = { p: localStorage.getItem(K_PROFILE), c: localStorage.getItem(K_DASH_CREDS) };
  try {
    localStorage.removeItem(K_PROFILE);
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'t' }));
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    document.getElementById('portalOverlay').classList.add('show');
    openPortalGate(); portalMode('sup');
    PRUEBAS.igual(document.getElementById('pEmpresa').value, 'Helitec',
      '⚠️ sin perfil de empleado, el usuario guardado tiene que precargarse igual');
    PRUEBAS.igual(document.getElementById('pPass').value, '',
      'y la contraseña NO: eso sí autorizaría (S4 dejó de guardarla a propósito)');
  } finally {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    if (prev.p) localStorage.setItem(K_PROFILE, prev.p); else localStorage.removeItem(K_PROFILE);
    if (prev.c) localStorage.setItem(K_DASH_CREDS, prev.c); else localStorage.removeItem(K_DASH_CREDS);
  }
});

PRUEBAS.caso('⚠️ el botón atrás vuelve a la portada desde los tres caminos nuevos', () => {
  /* Ninguno de los tres existía antes de esta tanda: saltar la presentación, "Vengo a ver el panel"
     y el arranque directo. Un camino nuevo que no maneje el botón físico deja a la persona
     saliéndose de la app sin querer, y en un teléfono eso se paga caro. */
  const ab = () => [...document.querySelectorAll('.overlay.show')].map(o => o.id);
  const malos = [];
  const caminos = {
    'carrusel':  () => { splashMostrar(); splashIngresar(); },
    'alta tras saltar': () => { splashMostrar(); splashIngresar(); carruselTerminar(); },
    'gate por "vengo a ver el panel"': () => { splashMostrar(); splashIngresar(); carruselTerminar(); nominaSoyGestor(); }
  };
  try {
    for (const [nombre, ir] of Object.entries(caminos)){
      document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
      ir();
      const antes = ab();
      silvaAtras();
      const despues = ab();
      if (despues.join() !== 'splashOv')
        malos.push(nombre + ': de ' + antes.join('+') + ' fue a ' + (despues.join('+') || 'NADA'));
    }
  } finally { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); }
  PRUEBAS.igual(malos, [],
    '⚠️ atrás tiene que volver a la portada, nunca dejar la pantalla vacía — ' + malos.join(' · '));
});

PRUEBAS.caso('⚠️ ninguna función del inicio quedó sin usar después de la reforma', () => {
  /* Es el patrón que se comió cuatro funciones en esta misma semana (R17): algo bien escrito que
     nadie llama. Sacar un enlace de la portada es exactamente la clase de cambio que lo produce. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const html = document.documentElement.outerHTML;
  const muertas = ['splashIngresar','splashVerDemo','splashAdmin','splashPortal','nominaSoyGestor',
                   'portalTieneSesionDeEmpresa','portalAbrirDirecto','portalReponerLoDeEmpresa',
                   'portalOlvidarDispositivo','carruselTerminar'].filter(f => {
    const re = new RegExp('\\b' + f + '\\s*\\(', 'g');
    const total = ((fuente + html).match(re) || []).length;
    const decl  = ((fuente + html).match(new RegExp('function\\s+' + f + '\\s*\\(', 'g')) || []).length;
    return (total - decl) < 1;
  });
  PRUEBAS.igual(muertas, [],
    '⚠️ escritas y sin llamar desde ningún lado — ' + muertas.join(', '));
});

PRUEBAS.caso('⚠️ los enlaces del pie del alta entran en UNA línea cada uno', () => {
  /* Lo encontré MIRANDO la captura, no midiendo — el auditor no lo marcó y tenía razón: el texto se
     veía entero, sólo envuelto. Este pie tenía dos enlaces y entraban en una fila; Q4b le agregó el
     tercero y con `row` + `nowrap` los tres se comprimieron: a 320 px quedaban en 54, 84 y 79 px de
     ancho, con 5, 4 y SEIS renglones cada uno.
     Se fija la propiedad —cada enlace ocupa su renglón y su alto es el de una línea de toque— y no
     la regla de CSS que hoy lo consigue. */
  const ov = document.getElementById('nominaOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const malos = [];
  try {
    for (const v of PRUEBAS.VENTANAS) {
      PRUEBAS.enVentana(v.w, v.h, () => {
        const pie = document.querySelector('#nominaOv .nom-pie');
        if (!pie) return;
        const links = [...pie.querySelectorAll('.nom-link')].filter(e => e.getBoundingClientRect().height > 0);
        if (links.length < 3) { malos.push(v.w + 'px: sólo ' + links.length + ' enlaces medibles'); return; }
        links.forEach(e => {
          const r = e.getBoundingClientRect();
          /* Más de 56 px de alto = el texto envolvió dentro de un control de 44. */
          if (r.height > 56) malos.push(v.w + 'px "' + (e.textContent||'').trim().slice(0,18) + '": ' + Math.round(r.height) + 'px de alto');
        });
        /* Y que no compartan renglón: apilados, cada uno arranca más abajo que el anterior. */
        for (let i = 1; i < links.length; i++){
          const a = links[i-1].getBoundingClientRect(), b = links[i].getBoundingClientRect();
          if (b.top < a.bottom - 2) malos.push(v.w + 'px: dos enlaces en el mismo renglón');
        }
      });
    }
  } finally { if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(malos, [], '⚠️ un enlace por renglón, sin envolver — ' + malos.join(' · '));
});
