
PRUEBAS.grupo('S4b · recordar el dispositivo, del lado de la app');

/* La mitad de cliente de S4. Lo que se comprueba acá es LO QUE QUEDA EN EL TELÉFONO, que es donde
   estaba el problema: hasta la 4.79 "recordar" guardaba `{usuario, pass}` — la contraseña de la
   empresa, en claro, leíble por cualquiera con el teléfono desbloqueado o por cualquier script que
   corriera en la página. */

function s4bCon(fn){
  const prevSup = localStorage.getItem(K_DASH_CREDS);
  const prevMed = localStorage.getItem(K_DASH_CREDS_MED);
  const prevFetch = window.fetchConReloj, prevPlano = window.fetch;
  const prevPend = DASH_PENDING_CREDS;
  try { return fn(); }
  finally {
    window.fetchConReloj = prevFetch; window.fetch = prevPlano;
    DASH_PENDING_CREDS = prevPend;
    const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e){} };
    set(K_DASH_CREDS, prevSup); set(K_DASH_CREDS_MED, prevMed);
    const ov = document.getElementById('dashRemember'); if (ov) ov.classList.remove('show');
  }
}

PRUEBAS.caso('⚠️ recordar el dispositivo NO deja la contraseña en el teléfono', async () => {
  /* EL CASO DEL PROMPT. Si esto fallara, todo S4 sería decorativo: habríamos agregado un token y
     dejado la contraseña donde estaba. */
  const r = await s4bCon(async () => {
    try { localStorage.removeItem(K_DASH_CREDS); } catch(e){}
    DASH_PENDING_CREDS = { usuario:'Helitec', pass:'LaClaveDeLaEmpresa' };
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:true, sesion:'sst_abc.secreto123' }) });
    dashSaveCreds(null);
    await new Promise(r => setTimeout(r, 60));
    return { guardado: localStorage.getItem(K_DASH_CREDS) || '', todo: JSON.stringify(localStorage) };
  });
  PRUEBAS.cierto(r.guardado.indexOf('sst_abc.secreto123') >= 0, 'el token sí se guarda: ' + r.guardado);
  PRUEBAS.falso(r.guardado.indexOf('LaClaveDeLaEmpresa') >= 0,
    '⚠️ la contraseña NO puede quedar en la entrada de credenciales');
  PRUEBAS.falso(r.todo.indexOf('LaClaveDeLaEmpresa') >= 0,
    '⚠️ ni en NINGUNA otra clave del almacenamiento — se buscó en todo el localStorage');
});

PRUEBAS.caso('⚠️ y el caso discrimina: con el mecanismo viejo tiene que fallar', () => {
  /* Sin esto, el caso de arriba pasaría igual si `dashSaveCreds` no guardara NADA. Acá se reproduce
     a mano lo que hacía la versión vieja y se exige que la misma comprobación lo agarre. */
  const viejo = JSON.stringify({ usuario:'Helitec', pass:'LaClaveDeLaEmpresa' });
  PRUEBAS.cierto(viejo.indexOf('LaClaveDeLaEmpresa') >= 0,
    'la forma vieja SÍ traía la contraseña: si esta comprobación no la viera, el caso de arriba no ' +
    'estaría midiendo nada');
});

PRUEBAS.caso('⚠️ sin conexión no se guarda nada ni se promete nada', () => {
  const r = s4bCon(() => {
    try { localStorage.removeItem(K_DASH_CREDS); } catch(e){}
    DASH_PENDING_CREDS = { usuario:'Helitec', pass:'LaClaveDeLaEmpresa' };
    const prev = window.offHayConexion;
    let pidio = false;
    window.offHayConexion = () => false;
    window.fetchConReloj = () => { pidio = true; return Promise.resolve({ json:() => Promise.resolve({ok:true}) }); };
    try { dashSaveCreds(null); } finally { window.offHayConexion = prev; }
    return { pidio, guardado: localStorage.getItem(K_DASH_CREDS) };
  });
  PRUEBAS.falso(r.pidio, 'sin conexión no se intenta pedir el token');
  PRUEBAS.igual(r.guardado, null, '⚠️ y no queda nada a medias guardado en el dispositivo');
});

PRUEBAS.caso('⚠️ el auto-login manda el TOKEN, no la contraseña', async () => {
  const enviado = await s4bCon(async () => {
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'sst_zzz.elsecreto' }));
    let visto = null;
    window.fetchConReloj = function(url, opt){
      visto = String(url) + '|' + String((opt && opt.body) || '');
      return Promise.resolve({ json:() => Promise.resolve({ ok:true, rol:'supervisor', vista:'supervisor', registros:[] }) });
    };
    portalAutoLoginSupervisor({ usuario:'Helitec', token:'sst_zzz.elsecreto' }, K_DASH_CREDS);
    await new Promise(r => setTimeout(r, 80));
    return visto;
  });
  PRUEBAS.cierto(!!enviado, 'tiene que haber salido un pedido');
  PRUEBAS.cierto(String(enviado).indexOf('sst_zzz.elsecreto') >= 0,
    '⚠️ el token tiene que viajar en el lugar donde antes iba la contraseña');
});

PRUEBAS.caso('⚠️ cerrar sesión avisa al servidor, con el token puesto', async () => {
  /* ⚠️ Se prueba `sesionAvisarCierre()` y NO `cerrarSesion()`, y no es por comodidad: `cerrarSesion`
     termina en `location.reload()`, y `reload` no se puede reemplazar en un navegador moderno
     (`Object.defineProperty` sobre `location` no toma). Mi primera versión de este caso llamaba a
     `cerrarSesion` creyendo que había neutralizado la recarga: recargó la app de verdad a mitad de
     la suite y se llevó puesta la corrida entera, sin dejar ni el reporte de lo que ya había
     pasado. Por eso el envío vive en su propia función. */
  const r = await s4bCon(async () => {
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'sst_ccc.cerrame' }));
    let cuerpo = '';
    window.fetch = function(url, opt){ cuerpo += String((opt && opt.body) || ''); return Promise.resolve({ json:()=>Promise.resolve({ok:true}) }); };
    sesionAvisarCierre();
    await new Promise(r => setTimeout(r, 40));
    return cuerpo;
  });
  PRUEBAS.cierto(r.indexOf('sesion_cerrar') >= 0, 'tiene que pedirle al servidor que la anule');
  PRUEBAS.cierto(r.indexOf('sst_ccc.cerrame') >= 0, '⚠️ y con el token puesto, o no anula nada');
});

PRUEBAS.caso('⚠️ sin token guardado no se le pide nada a nadie', () => {
  /* El discriminador del caso de arriba: si mandara siempre, estaría verde por mandar y no por
     mandar lo correcto — y le estaría contando al CH que alguien cerró una sesión que no existe. */
  const pidio = s4bCon(() => {
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch(e){}
    let n = 0;
    window.fetch = function(){ n++; return Promise.resolve({ json:()=>Promise.resolve({ok:true}) }); };
    sesionAvisarCierre();
    return n;
  });
  PRUEBAS.igual(pidio, 0, 'un empleado sin panel no tiene ninguna sesión que cerrar en el servidor');
});

PRUEBAS.caso('⚠️ el pedido de cierre sobrevive a la recarga (keepalive)', () => {
  /* `cerrarSesion` recarga la página inmediatamente después de mandar el aviso. Sin `keepalive`,
     el navegador ABORTA el pedido al recargar y la sesión no se cierra nunca del lado del CH — y
     como no caduca, queda viva para siempre. Es un detalle de una palabra que decide si "cerrar
     sesión" cierra algo o no. */
  PRUEBAS.cierto(/keepalive\s*:\s*true/.test(String(sesionAvisarCierre)),
    '⚠️ el pedido de cierre tiene que ir con keepalive:true, o la recarga lo aborta');
  /* Y el orden, que es lo único que hace que esto sirva: borrado primero el token, ya no hay con
     qué pedir que lo anulen y la sesión queda viva en el servidor PARA SIEMPRE, porque no caduca. */
  const f = String(cerrarSesion);
  PRUEBAS.cierto(f.indexOf('sesionAvisarCierre') >= 0 &&
                 f.indexOf('sesionAvisarCierre') < f.indexOf('sesionClavesBorrar'),
    '⚠️ el aviso tiene que ir ANTES de borrar las claves');
});

PRUEBAS.caso('⚠️ quien tenía la contraseña guardada se pasa a token solo', () => {
  /* La migración. Nadie tiene que hacer nada, y sobre todo: no puede haber un día en que la app
     "deje de recordar" y le pida la contraseña a un supervisor que no la tiene a mano. */
  const fuente = String(portalAutoLoginSupervisor);
  PRUEBAS.cierto(/c\.token\s*\|\|\s*c\.pass/.test(fuente),
    'el auto-login tiene que aceptar todavía la contraseña vieja, o los dispositivos ya guardados quedan afuera');
  PRUEBAS.cierto(/dashMigrarCredsAToken/.test(fuente),
    '⚠️ y en cuanto entra con ella, tiene que cambiarla por un token');
  PRUEBAS.cierto(typeof dashMigrarCredsAToken === 'function', 'la migración tiene que existir');
});

PRUEBAS.caso('⚠️ el gestor de contraseñas del sistema puede ofrecerse: hay <form> y autocomplete', () => {
  /* El plan pide "ofrecer primero el gestor del sistema". Los `autocomplete` ya estaban desde la
     auditoría del 2026-08-26, pero por sí solos no alcanzan: el navegador y el celular ofrecen
     guardar cuando ven ENVIARSE un formulario con usuario y contraseña. Sin `<form>` la app era el
     único lugar donde se podía recordar — y recordaba guardando la contraseña en claro. */
  const form = document.getElementById('portalCreds');
  PRUEBAS.cierto(!!form && form.tagName === 'FORM',
    'los campos tienen que estar en un <form>, no en un div (es ' + (form ? form.tagName : 'nada') + ')');
  PRUEBAS.igual(document.getElementById('pEmpresa').getAttribute('autocomplete'), 'username',
    'el usuario tiene que declararse como tal');
  PRUEBAS.igual(document.getElementById('pPass').getAttribute('autocomplete'), 'current-password',
    'y la contraseña también, o el gestor no la ofrece nunca');
  const enviar = form && form.querySelector('.save-btn');
  PRUEBAS.igual(enviar && enviar.getAttribute('type'), 'submit',
    'y el botón tiene que ENVIAR el formulario: un onclick suelto no dispara al gestor');
});

PRUEBAS.caso('el cartel no promete guardar la contraseña, porque ya no la guarda (R1, R14)', () => {
  /* El texto decía literalmente "¿Recordar usuario y contraseña en este dispositivo?" y era cierto.
     Dejarlo ahora sería mentir sobre lo que queda en el teléfono. */
  ['pg_recordar_q','pg_recordar_si','pg_recordar_no','pg_recordar_d','pg_sesion_terminada',
   'ts_recordar_sin_red','ts_recordar_error'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta la traducción de ' + k);
  });
  PRUEBAS.falso(/contrase/i.test(t('pg_recordar_q')),
    '⚠️ la pregunta no puede seguir diciendo que guarda la contraseña');
  PRUEBAS.cierto(/contrase/i.test(t('pg_recordar_d')),
    'pero la bajada SÍ tiene que aclarar que NO se guarda: "' + t('pg_recordar_d') + '"');
  PRUEBAS.falso(/\b(querés|podés|tenés|tu clave quedó)\b/i.test(
    t('pg_recordar_q') + ' ' + t('pg_recordar_d') + ' ' + t('pg_sesion_terminada')),
    'español neutro, sin voseo (R1)');
});

PRUEBAS.caso('⚠️ el cartel se lee: los cuatro textos por encima de 4,5:1, en los dos temas', () => {
  /* Medido acá mismo al construirlo: el botón "Sí, recordar" usaba `--orange` (el naranja de marca)
     con texto blanco y daba 2,75:1 — el botón principal del cartel, por debajo del mínimo. Se pasó
     a `--orange-legible`, que existe justo para esto.
     ⚠️ Y el fondo hay que COMPONERLO: `.dr-no` tiene `rgba(255,255,255,.14)`, así que leer su
     `backgroundColor` como si fuera opaco da 1,00:1 y manda a arreglar algo que está bien. Me pasó
     en la primera medición de este mismo cartel. */
  const rgba = c => { const m = String(c).match(/[\d.]+/g) || [0,0,0,0];
    return { r:+m[0], g:+m[1], b:+m[2], a: m.length > 3 ? +m[3] : 1 }; };
  const sobre = (fg, bg) => ({ r:fg.r*fg.a+bg.r*(1-fg.a), g:fg.g*fg.a+bg.g*(1-fg.a), b:fg.b*fg.a+bg.b*(1-fg.a), a:1 });
  const lum = c => { const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };

  const cartel = document.getElementById('dashRemember');
  PRUEBAS.cierto(!!cartel, 'tiene que existir el cartel para medirlo');
  if (!cartel) return;
  const ov = document.getElementById('portalOverlay');
  const ovTenia = ov && ov.classList.contains('show');
  if (ov) ov.classList.add('show');
  cartel.classList.add('show');
  const previo = document.documentElement.getAttribute('data-tema');
  const flojos = [];
  try {
    ['claro','oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      const fondoCartel = rgba(getComputedStyle(cartel).backgroundColor);
      [['título','#dashRemember span'], ['bajada','.dr-d'], ['sí','.dr-yes'], ['no','.dr-no']]
        .forEach(([qué, sel]) => {
          const el = document.querySelector(sel);
          if (!el){ flojos.push(tema + '/' + qué + ': no existe'); return; }
          const cs = getComputedStyle(el);
          const bg = sobre(rgba(cs.backgroundColor), fondoCartel);
          let fg = sobre(rgba(cs.color), bg);
          const op = parseFloat(cs.opacity);
          if (op < 1) fg = sobre({ r:fg.r, g:fg.g, b:fg.b, a:op }, bg);
          const r = ratio(lum(fg), lum(bg));
          if (r < 4.5) flojos.push(tema + '/' + qué + ': ' + r.toFixed(2) + ':1');
        });
    });
  } finally {
    if (previo) document.documentElement.setAttribute('data-tema', previo);
    else document.documentElement.removeAttribute('data-tema');
    cartel.classList.remove('show');
    if (ov && !ovTenia) ov.classList.remove('show');
  }
  PRUEBAS.igual(flojos, [], 'ningún texto del cartel puede quedar bajo 4,5:1 — ' + flojos.join(' | '));
});

PRUEBAS.caso('⚠️ y el cartel entra en un teléfono angosto, sin cortar la explicación', () => {
  /* La bajada es la línea que dice que la contraseña NO se guarda. Si se corta o se sale, la
     persona decide sin saber qué queda en su teléfono, que es exactamente lo que S4 vino a
     ordenar. Se mide a 320 px, que es lo más angosto que soporta la app. */
  /* ⚠️ El cartel vive DENTRO del overlay del portal, que está cerrado durante la suite. Sin abrirlo,
     todo mide 0x0 y el caso pasa sin haber visto nada — el mismo agujero que ya me mordió en A2b
     con el splash. Por eso además hay una guarda: si mide cero, esto FALLA. */
  const ov = document.getElementById('portalOverlay');
  const dash = document.getElementById('portalDash');
  const ovTenia = ov && ov.classList.contains('show');
  const dashTenia = dash && dash.style.display;
  if (ov) ov.classList.add('show');
  if (dash) dash.style.display = '';
  const cartel = document.getElementById('dashRemember');
  const tenia = cartel.classList.contains('show');
  cartel.classList.add('show');
  const malos = [];
  try {
    [[320,640],[375,812],[768,1024]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const d = document.querySelector('.dr-d');
        if (!d){ malos.push(w + ': no hay bajada'); return; }
        const r = d.getBoundingClientRect();
        if (r.width < 40 || r.height < 8) malos.push(w + ': la bajada mide ' + Math.round(r.width) + 'x' + Math.round(r.height));
        if (d.scrollWidth > d.clientWidth + 2) malos.push(w + ': la bajada se corta a lo ancho');
        const c = cartel.getBoundingClientRect();
        if (c.left < -1 || c.right > w + 1) malos.push(w + ': el cartel se sale de la pantalla');
      });
    });
  } finally {
    if (!tenia) cartel.classList.remove('show');
    if (ov && !ovTenia) ov.classList.remove('show');
    if (dash) dash.style.display = dashTenia;
  }
  PRUEBAS.igual(malos, [], 'el cartel tiene que entrar entero — ' + malos.join(' | '));
});
