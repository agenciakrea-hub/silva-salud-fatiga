
PRUEBAS.grupo('Z4b · la pantalla para elegir contraseña');

/* ⚠️ ES OPCIONAL A PROPÓSITO, y no es una concesión: la migración (ADR 001, D3) se apoya en que
   nadie quede afuera un solo día. Quien la pospone sigue entrando como siempre; quien la pone, desde
   ese momento entra sólo con ella. Obligarla dejaría trabado a cualquiera que no pueda completarla
   en ese instante — y acá "ese instante" puede ser un hangar sin señal. */

function z4bCon(perfil, fn){
  const previo = getProfile();
  try {
    if (perfil) setProfile(perfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    return fn();
  } finally {
    const ov = document.getElementById('claveOv'); if (ov) ov.classList.remove('show');
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  }
}
const Z4B_PERFIL = { nombre:'Ana Suárez', cedula:'V-111', empresa:'Helitec', departamento:'Op',
                     cargo:'Piloto', sexo:'F', edad:'34', telefono:'04141111111', email:'a@b.co' };

PRUEBAS.caso('⚠️ el botón sólo se habilita con las TRES reglas cumplidas', () => {
  /* Las tres son las que exige el servidor (Z4). Acá se avisan antes de tocar el botón; el servidor
     las vuelve a validar igual, porque este archivo es público y cualquier regla escrita en él se
     puede saltear. Esto es cortesía, no barrera. */
  const r = z4bCon(Z4B_PERFIL, () => {
    clvAbrir();
    const P = document.getElementById('clvPass'), P2 = document.getElementById('clvPass2');
    const btn = document.getElementById('clvBtn');
    const probar = (a, b) => { P.value = a; P2.value = b; clvValidar(); return !btn.disabled; };
    return {
      vacio:        probar('', ''),
      corta:        probar('abc12', 'abc12'),
      soloNumeros:  probar('12345678', '12345678'),
      noCoinciden:  probar('ClaveLarga1', 'ClaveLarga2'),
      buena:        probar('ClaveLarga1', 'ClaveLarga1')
    };
  });
  PRUEBAS.falso(r.vacio, 'vacía no habilita');
  PRUEBAS.falso(r.corta, 'menos de 8 caracteres tampoco');
  PRUEBAS.falso(r.soloNumeros, '⚠️ ni sólo números: una cédula o una fecha no son contraseñas');
  PRUEBAS.falso(r.noCoinciden, 'ni si las dos veces no coinciden');
  PRUEBAS.cierto(r.buena, 'con las tres cumplidas, sí');
});

PRUEBAS.caso('⚠️ cada regla se marca sola, y con símbolo además de color', () => {
  /* El color solo deja afuera a quien no lo distingue, y lo que se comunica acá es "todavía te falta
     ESTO". Se comprueba que el estado de cada regla sea independiente: si todas cambiaran juntas,
     la persona no sabría cuál corregir. */
  const r = z4bCon(Z4B_PERFIL, () => {
    clvAbrir();
    document.getElementById('clvPass').value = '12345678';     // largo ok, sólo números
    document.getElementById('clvPass2').value = '12345678';
    clvValidar();
    return [...document.querySelectorAll('.clv-regla')].map(e => ({
      estado: e.className.replace('clv-regla', '').trim(),
      simbolo: (e.textContent || '').trim().charAt(0)
    }));
  });
  PRUEBAS.igual(r.length, 3, 'tienen que ser tres reglas');
  PRUEBAS.igual(r[0].estado, 'ok',  'el largo está bien');
  PRUEBAS.igual(r[1].estado, 'mal', '⚠️ pero "sólo números" no, y tiene que marcarse SOLA');
  PRUEBAS.igual(r[2].estado, 'ok',  'y coinciden');
  PRUEBAS.cierto(r[0].simbolo === '✓' && r[1].simbolo === '·',
    'cada regla lleva su símbolo: con el color solo, quien no lo distingue no sabe qué corregir');
});

PRUEBAS.caso('⚠️ los textos de las reglas se leen en los dos temas', () => {
  /* Lo detecté midiendo esta misma pantalla recién hecha: el verde que había puesto
     (`--sem-verde-int`) daba 4,35:1 sobre la tarjeta blanca — por debajo del mínimo de 4,5. Se pasó
     a `--sem-verde-txt`, que existe justamente para texto. */
  const malos = z4bCon(Z4B_PERFIL, () => {
    clvAbrir();
    document.getElementById('clvPass').value = 'ClaveLarga1';
    document.getElementById('clvPass2').value = 'ClaveLarga1';
    clvValidar();
    const lum = c => { const m = String(c).match(/[\d.]+/g); if (!m) return null;
      const [r,g,b] = m.slice(0,3).map(Number);
      const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b); };
    const fondo = el => { let n = el;
      while (n && n !== document.documentElement){
        const c = getComputedStyle(n).backgroundColor;
        const m = String(c).match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) return c;
        n = n.parentElement; }
      return 'rgb(255,255,255)'; };
    const previo = document.documentElement.getAttribute('data-tema');
    const flojos = [];
    try {
      ['claro','oscuro'].forEach(tema => {
        document.documentElement.setAttribute('data-tema', tema);
        void document.body.offsetWidth;
        document.querySelectorAll('.clv-regla').forEach(e => {
          const a = lum(getComputedStyle(e).color), b = lum(fondo(e));
          if (a == null || b == null) return;
          const [hi, lo] = a > b ? [a, b] : [b, a];
          const r = (hi + 0.05) / (lo + 0.05);
          if (r < 4.5) flojos.push(tema + ': ' + r.toFixed(2) + ':1');
        });
      });
    } finally {
      if (previo) document.documentElement.setAttribute('data-tema', previo);
      else document.documentElement.removeAttribute('data-tema');
    }
    return flojos;
  });
  PRUEBAS.igual(malos, [], 'ninguna regla puede quedar bajo 4,5:1 — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ sin perfil no se abre: no hay a quién ponerle una contraseña', () => {
  const abrio = z4bCon(null, () => clvAbrir());
  PRUEBAS.falso(abrio, 'sin cédula ni empresa no tiene sentido pedir una contraseña');
});

PRUEBAS.caso('⚠️ SIN SEÑAL no se encola la contraseña', () => {
  /* DECISIÓN, y el plan la dejaba abierta. Encolarla significaría guardar la contraseña en texto
     plano en el dispositivo para mandarla después — exactamente el problema que todo este bloque
     viene a resolver. Se pospone el paso y se avisa por qué. */
  const r = z4bCon(Z4B_PERFIL, () => {
    clvAbrir();
    document.getElementById('clvPass').value = 'ClaveLarga1';
    document.getElementById('clvPass2').value = 'ClaveLarga1';
    clvValidar();
    const of = window.offHayConexion, oc = window.fetchConReloj;
    let mandó = false;
    window.offHayConexion = () => false;
    window.fetchConReloj = () => { mandó = true; return Promise.resolve({ json:() => Promise.resolve({ok:true}) }); };
    try { clvGuardar(document.getElementById('clvBtn')); }
    finally { window.offHayConexion = of; window.fetchConReloj = oc; }
    return { mandó, aviso: (document.getElementById('clvErr').textContent || '').slice(0, 40),
             quedoEnLocalStorage: JSON.stringify(localStorage).indexOf('ClaveLarga1') >= 0 };
  });
  PRUEBAS.falso(r.mandó, 'sin conexión no se intenta mandar');
  PRUEBAS.cierto(r.aviso.length > 10, 'y se explica por qué: "' + r.aviso + '"');
  PRUEBAS.falso(r.quedoEnLocalStorage,
    '⚠️ y sobre todo: la contraseña NO puede quedar guardada en el dispositivo, ni para reintentar');
});

PRUEBAS.caso('⚠️ posponer no vuelve a interrumpir, y es por PERSONA', () => {
  /* Si volviera a aparecer en cada arranque sería un cartel que se aprende a cerrar sin leer. Y se
     recuerda por cédula: si el teléfono lo usa otra persona, a ella sí hay que ofrecerle. */
  const previo = getProfile();
  const guardado = localStorage.getItem(K_CLV_OFRECIDA);
  try {
    try { localStorage.removeItem(K_CLV_OFRECIDA); } catch(e){}
    setProfile(Z4B_PERFIL);
    PRUEBAS.falso(clvYaOfrecida(), 'a alguien nuevo todavía no se le ofreció');
    clvMarcarOfrecida();
    PRUEBAS.cierto(clvYaOfrecida(), 'después de decidir, no se vuelve a preguntar');
    setProfile(Object.assign({}, Z4B_PERFIL, { cedula:'V-999', nombre:'Otra Persona' }));
    PRUEBAS.falso(clvYaOfrecida(),
      '⚠️ pero a OTRA persona en el mismo teléfono sí hay que ofrecerle: se recuerda por cédula');
  } finally {
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    if (guardado != null) localStorage.setItem(K_CLV_OFRECIDA, guardado);
    else { try { localStorage.removeItem(K_CLV_OFRECIDA); } catch(e){} }
  }
});

PRUEBAS.caso('los textos de la pantalla pasan por t(), en los dos idiomas (R14)', () => {
  const faltan = [];
  ['clv_titulo','clv_lead','clv_pass','clv_pass2','clv_r_largo','clv_r_numeros','clv_r_iguales',
   'clv_guardar','clv_luego','clv_listo','clv_error','clv_sin_red']
    .forEach(k => { const v = t(k); if (!v || v === k) faltan.push(k); });
  PRUEBAS.igual(faltan, [], 'toda clave nueva tiene que resolver a texto de verdad');
  PRUEBAS.falso(/\b(tenés|podés|elegí|repetí|vas a entrar con tu)\b/i.test(
    t('clv_titulo') + ' ' + t('clv_lead') + ' ' + t('clv_luego')), 'sin voseo: español neutro (R1)');
});

/* ── P173 · el POST se corta en la red pero el servidor SÍ creó la contraseña ────────────────
   Reportado por Franco (Victoria, 2026-09-11): «pongo mi contraseña, da error, reintentá; y la
   que supuestamente no se pudo guardar me dejó entrar». Medido contra producción:
   `credencial_crear` tarda ~9 s, y en un celular la conexión se cae antes de que llegue la
   respuesta. Ahora el cliente reintenta, y si el reintento dice `ya_tiene`, entra con la
   contraseña recién tipeada (transparente).

   ⚠️ EL ARNÉS RESTAURA EN `.finally()` DE LA PROMESA, no en un `try/finally` sincrónico. La
   primera versión de estos tres casos restauraba los stubs antes de que corriera el reintento
   —que espera 1,2 s— y los tres daban rojo por el caso, no por el código. Es la misma trampa
   anotada en MISTAKES el 2026-09-10. */

function z4bAsync(fn){
  const previo = getProfile();
  const of = window.offHayConexion, oc = window.fetchConReloj;
  const ol = window.lgnAplicarEntrada, oa = window.lgnAbrir, ot = window.showToast;
  const marca = localStorage.getItem(K_TIENE_CLAVE);
  setProfile(Z4B_PERFIL);
  clvAbrir();
  document.getElementById('clvPass').value = 'ClaveLarga1';
  document.getElementById('clvPass2').value = 'ClaveLarga1';
  clvValidar();
  window.offHayConexion = () => true;
  window.showToast = () => {};
  return Promise.resolve(fn()).finally(() => {
    window.offHayConexion = of; window.fetchConReloj = oc;
    window.lgnAplicarEntrada = ol; window.lgnAbrir = oa; window.showToast = ot;
    const ov = document.getElementById('claveOv'); if (ov) ov.classList.remove('show');
    const lo = document.getElementById('loginOv'); if (lo) lo.classList.remove('show');
    if (marca == null) { try { localStorage.removeItem(K_TIENE_CLAVE); } catch(e){} } else localStorage.setItem(K_TIENE_CLAVE, marca);
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { syncScrollLock(); } catch(e){}
  });
}
const z4bEsperar = ms => new Promise(r => setTimeout(r, ms));

PRUEBAS.caso('🔴 P173 · el primer POST falla en la red, el reintento crea y la persona entra', () => {
  return z4bAsync(() => {
    let intentos = 0;
    window.fetchConReloj = () => { intentos++;
      if (intentos === 1) return Promise.reject(new TypeError('Failed to fetch'));   // la red se cae
      return Promise.resolve({ json: () => Promise.resolve({ ok:true, creada:true }) });   // el reintento sí llega
    };
    clvGuardar(document.getElementById('clvBtn'));
    return z4bEsperar(1800).then(() => {   // más que el delay de 1200 ms del reintento
      PRUEBAS.igual(intentos, 2, '🔴 reintentó una vez tras el fallo de red · antes mostraba «reintentá» y la contraseña ya estaba creada');
      PRUEBAS.igual(document.getElementById('clvErr').textContent || '', '', 'y NO mostró error: el segundo intento entró');
      PRUEBAS.falso(document.getElementById('claveOv').classList.contains('show'), 'la pantalla se cerró');
      PRUEBAS.cierto(tieneClaveGuardada(), 'y quedó marcado que tiene contraseña');
    });
  });
});

PRUEBAS.caso('🔴 P173 · con `ya_tiene` entra con la contraseña recién tipeada, sin abrir el login', () => {
  return z4bAsync(() => {
    const acciones = [];
    window.fetchConReloj = (url, opts) => { let b = {}; try { b = JSON.parse(opts.body); } catch(e){}
      acciones.push(b.action);
      if (b.action === 'credencial_crear') return Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'ya_tiene', error:'ya tiene' }) });
      if (b.action === 'login') return Promise.resolve({ json: () => Promise.resolve({ ok:true, sesion:'tok', persona: Z4B_PERFIL, consentimientos:{} }) });
      return Promise.resolve({ json: () => Promise.resolve({ ok:false }) });
    };
    let aplico = false, abrioLogin = false;
    window.lgnAplicarEntrada = () => { aplico = true; };
    window.lgnAbrir = () => { abrioLogin = true; return true; };
    clvGuardar(document.getElementById('clvBtn'));
    return z4bEsperar(400).then(() => {
      PRUEBAS.igual(acciones, ['credencial_crear', 'login'], '🔴 tras `ya_tiene` intentó `login` con la clave que acaba de tipear');
      PRUEBAS.cierto(aplico, 'entró: aplicó la sesión');
      PRUEBAS.falso(abrioLogin, '⚠️ y NO abrió el login manual · fue transparente, que es el punto');
    });
  });
});

PRUEBAS.caso('⚠️ P173 · EL DISCRIMINADOR · si esa contraseña NO entra (la de antes era otra), se abre el login', () => {
  return z4bAsync(() => {
    window.fetchConReloj = (url, opts) => { let b = {}; try { b = JSON.parse(opts.body); } catch(e){}
      if (b.action === 'credencial_crear') return Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'ya_tiene' }) });
      return Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'credenciales' }) });   // la que existía era otra
    };
    let abrioLogin = false;
    window.lgnAbrir = () => { abrioLogin = true; return true; };
    clvGuardar(document.getElementById('clvBtn'));
    return z4bEsperar(400).then(() => PRUEBAS.cierto(abrioLogin, '⚠️ el login manual, para que escriba la que sí es'));
  });
});
