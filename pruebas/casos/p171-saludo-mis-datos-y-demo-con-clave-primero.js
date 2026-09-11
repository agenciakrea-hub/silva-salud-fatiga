PRUEBAS.grupo('P171 · el saludo tras entrar, «Mis datos» de sólo lectura, la clave de la demostración primero y el ojo');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO — lo que Franco encontró probando (2026-09-10)

   · «cuando cierro sesión y vuelvo a entrar no dice hola Franco, dice —; pasa lo mismo cuando entro
     desde admin» → `lgnAplicarEntrada` guardaba el perfil y NO repintaba el inicio. Las dos puertas
     (login y atajo del administrador) terminan ahí.
   · «me deja editar los datos, y dijimos que no pueden editarse: ese panel es sólo para ver los
     datos que quedaron registrados» → `#misDatosOv`, de sólo lectura, desde el encabezado y desde
     Más. `openSetup(true)` (la edición) ya no tiene ningún botón que lo llame.
   · «la contraseña para ver demostración se pide al tocar el botón, no adentro: si es adentro ya
     podrían robar lógica importante» → `splashVerDemo` abre la hoja de la clave sobre el splash; el
     gate se ve sólo con la clave validada y el payload en memoria.
   · «lo de arriba, que puedo cambiar entre supervisor, empleado… que no ocupe en pantalla, sino
     que salga del ojo» → el ojo flotante y su hoja (los casos de la hoja están en p106).

   R17: se entra por las funciones que corren de verdad —`lgnAplicarEntrada`, el botón del
   encabezado, `splashVerDemo`, `demoClaveEnviar` con el `fetch` reemplazado—, no por la pieza.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P171_PERSONA = { nombre:'Ana Suárez P171', cedula:'99171171', empresa:'Empresa P171', departamento:'Operaciones',
                       cargo:'Operadora', sexo:'Femenino', edad:'34', telefono:'04141111111', email:'ana.p171@ejemplo.co', esPiloto:false };

function p171Guardar(){
  const o = {};
  for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
  return { ls:o, fetch: window.fetch, dash: DASH, pay: DEMO_PAYLOAD, solo: PORTAL_SOLO_DEMO };
}
function p171Restaurar(prev){
  localStorage.clear();
  Object.keys(prev.ls).forEach(k => { try { localStorage.setItem(k, prev.ls[k]); } catch(e){} });
  window.fetch = prev.fetch;
  ['misDatosOv','demoClaveOv','demoVistasOv','rolOv','claveOv','consent','textoOverlay','setup','nominaOv','loginOv','portalOverlay','splashOv']
    .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('show'); });
  DASH = prev.dash; DEMO_PAYLOAD = prev.pay;
  try { portalDemoModo(prev.solo); } catch(e){}
  try { ALTA_EN_CURSO = false; _misSincronizando = false; syncScrollLock(); } catch(e){}
  try { paintProfile(); renderSections(); } catch(e){}
}
const p171Abierto = id => { const o = document.getElementById(id); return !!o && o.classList.contains('show'); };

/* ── el saludo ───────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 entrar con contraseña repinta el inicio: «Hola, Ana», no «—»', () => {
  const prev = p171Guardar();
  try {
    localStorage.clear();
    const cons = { items:{} }; CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
    localStorage.setItem(K_CONSENT, JSON.stringify(cons)); localStorage.setItem(K_TEXTO, '1');
    document.getElementById('hhNombre').textContent = '—';
    document.getElementById('hhFull').textContent = '—';   // lo que deja el arranque sin perfil
    window.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve({ ok:true }) });
    lgnAplicarEntrada({ ok:true, sesion:'tok', persona: P171_PERSONA, consentimientos:{} }, P171_PERSONA.cedula, P171_PERSONA.empresa);
    PRUEBAS.igual(document.getElementById('hhNombre').textContent, 'Ana', '🔴 el saludo dice el nombre · antes quedaba el «—» del arranque');
    PRUEBAS.igual(document.getElementById('hhFull').textContent, P171_PERSONA.nombre, 'y la ficha del encabezado, el nombre completo');
    PRUEBAS.igual(document.getElementById('hhEmp').textContent, P171_PERSONA.empresa, 'y la empresa');
  } finally { try { closeSetup(); } catch(e){} p171Restaurar(prev); }
});

PRUEBAS.caso('🔴 y por el atajo del administrador también · «pasa lo mismo cuando entro desde admin»', () => {
  const prev = p171Guardar();
  try {
    localStorage.clear();
    const cons = { items:{} }; CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
    localStorage.setItem(K_CONSENT, JSON.stringify(cons)); localStorage.setItem(K_TEXTO, '1');
    document.getElementById('hhNombre').textContent = '—';
    window.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve({ ok:true }) });
    lgnAplicarEntrada({ ok:true, sesion:'tok', persona: P171_PERSONA, consentimientos:{} }, P171_PERSONA.cedula, P171_PERSONA.empresa, true);
    PRUEBAS.igual(document.getElementById('hhNombre').textContent, 'Ana', '🔴 desde admin, el saludo también');
  } finally { try { closeSetup(); } catch(e){} p171Restaurar(prev); }
});

/* ── «Mis datos», de sólo lectura ────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el botón del encabezado abre «Mis datos», de SÓLO LECTURA, con lo registrado', () => {
  const prev = p171Guardar();
  try {
    setProfile(Object.assign({}, P171_PERSONA, { esPiloto:true, id_piloto:'AN-42', esSupervisor:true }));
    const btn = document.querySelector('#viewInicio .hh-edit:not(.hh-tareas)');
    PRUEBAS.cierto(!!btn, 'guarda: el botón del encabezado existe');
    PRUEBAS.falso(/openSetup\(true\)/.test(btn.getAttribute('onclick') || ''), '🔴 ya no lleva a editar');
    btn.click();                                                          // R17 · el botón real
    PRUEBAS.cierto(p171Abierto('misDatosOv'), '🔴 abre la ficha');
    PRUEBAS.falso(p171Abierto('setup'), 'y NO el formulario');
    const ov = document.getElementById('misDatosOv');
    PRUEBAS.igual(ov.querySelectorAll('input, select, textarea').length, 0, '🔴 sin un solo campo editable: es para VER');
    const filas = [...ov.querySelectorAll('.md-fila')].map(f => f.querySelector('.md-k').textContent + '=' + f.querySelector('.md-v').textContent);
    PRUEBAS.cierto(filas.some(f => f === t('f_nombre') + '=' + P171_PERSONA.nombre), 'con el nombre');
    PRUEBAS.cierto(filas.some(f => f === t('f_cedula') + '=' + P171_PERSONA.cedula), 'la cédula (es la propia persona: entera)');
    PRUEBAS.cierto(filas.some(f => f === t('f_email') + '=' + P171_PERSONA.email), 'el correo');
    PRUEBAS.cierto(filas.some(f => f === t('f_idpiloto') + '=AN-42'), 'el identificador, con el rótulo por sector (R14)');
    PRUEBAS.cierto(filas.some(f => f === t('md_rol') + '=' + t('rol_supervisor')), 'y el acceso al panel que tiene');
    PRUEBAS.cierto(/nómina|roster/i.test(ov.querySelector('.lead').textContent), 'y dice a quién avisar si algo está mal');
  } finally { p171Restaurar(prev); }
});

PRUEBAS.caso('⚠️ una fila sin dato no se pinta, y el botón de Más lleva al mismo lugar', () => {
  const prev = p171Guardar();
  try {
    setProfile(Object.assign({}, P171_PERSONA, { esPiloto:false, id_piloto:'' }));
    misDatosAbrir();
    const ks = [...document.querySelectorAll('#misDatosOv .md-k')].map(k => k.textContent);
    PRUEBAS.falso(ks.indexOf(t('f_idpiloto')) >= 0, 'sin identificador de piloto para quien no es piloto');
    PRUEBAS.falso(ks.indexOf(t('md_rol')) >= 0, 'ni «acceso al panel» para quien no tiene');
    misDatosCerrar();
    const item = [...document.querySelectorAll('#viewMas .mas-item')].find(b => /misDatosAbrir/.test(b.getAttribute('onclick') || ''));
    PRUEBAS.cierto(!!item, '⚠️ la fila de Más apunta a la ficha');
    PRUEBAS.igual(document.querySelectorAll('[onclick*="openSetup(true)"]').length, 0, '🔴 y NINGÚN botón de la app lleva ya a editar los datos');
  } finally { p171Restaurar(prev); }
});

PRUEBAS.caso('⚠️ «atrás» y el botón de cerrar conocen la ficha (R1: sin callejones)', () => {
  const prev = p171Guardar();
  try {
    setProfile(P171_PERSONA);
    misDatosAbrir();
    PRUEBAS.cierto(silvaAtras(), '«atrás» se ocupó');
    PRUEBAS.falso(p171Abierto('misDatosOv'), 'y cerró la ficha');
    misDatosAbrir();
    misDatosCerrarUI();
    PRUEBAS.falso(p171Abierto('misDatosOv'), 'el botón también');
    PRUEBAS.cierto(/navConsumir\(\)/.test(String(misDatosCerrarUI)), '⚠️ y consume su entrada del historial (P048)');
    PRUEBAS.falso(/Editar mis datos|Edit my details/.test(t('setup_lead_confirmar')), 'y el texto del alta ya no manda a «Editar mis datos»');
  } finally { p171Restaurar(prev); }
});

/* ── la clave de la demostración, al tocar el botón ──────────────────────────────────────── */

PRUEBAS.caso('🔴 «Ver una demostración» pide la clave ANTES de mostrar el gate', () => {
  const prev = p171Guardar();
  try {
    DEMO_PAYLOAD = null;
    document.getElementById('splashOv').classList.add('show');
    splashVerDemo();                                                      // R17 · el botón de la portada
    PRUEBAS.cierto(p171Abierto('demoClaveOv'), '🔴 la hoja de la clave');
    PRUEBAS.cierto(p171Abierto('splashOv'), 'sobre el splash, que sigue detrás');
    PRUEBAS.falso(p171Abierto('portalOverlay'), '🔴 y el portal (con las cuatro pestañas descritas) NO se ve');
    const vis = id => { const e = document.getElementById(id); return !!e && e.getBoundingClientRect().width > 0; };
    PRUEBAS.cierto(vis('dcPass'), 'con el campo a la vista');
    PRUEBAS.cierto(silvaAtras(), '«atrás» la conoce');
    PRUEBAS.falso(p171Abierto('demoClaveOv'), 'y la cierra');
  } finally { p171Restaurar(prev); }
});

PRUEBAS.caso('🔴 clave mal → error y la hoja sigue; clave bien → payload en memoria y recién ahí el gate', async () => {
  const prev = p171Guardar();
  const llamadas = [];
  try {
    DEMO_PAYLOAD = null;
    document.getElementById('splashOv').classList.add('show');
    window.fetch = (u, o) => {
      let b = {}; try { b = JSON.parse(o && o.body || '{}'); } catch(e){}
      llamadas.push(b);
      const bien = b.pass === 'clave-p171';
      return Promise.resolve({ ok:true, status:200, type:'cors', json: () => Promise.resolve(
        bien ? Object.assign(p106Payload(), { demo:true }) : { ok:false, motivo:'demo_pass_mal' }) });
    };
    splashVerDemo();
    document.getElementById('dcPass').value = 'otra';
    demoClaveEnviar(document.querySelector('#demoClaveOv .save-btn'));
    for (let i = 0; i < 30; i++) await Promise.resolve();
    PRUEBAS.igual(llamadas.length, 1, 'viajó UN pedido');
    PRUEBAS.igual(llamadas[0].action, 'demo', 'con `action:demo`');
    PRUEBAS.igual(llamadas[0].pass, 'otra', 'y la clave escrita');
    PRUEBAS.cierto(p171Abierto('demoClaveOv'), '🔴 con la clave mal, la hoja sigue');
    PRUEBAS.igual(document.getElementById('dcErr').textContent, t('pg_demo_pass_mal'), 'y lo dice');
    PRUEBAS.falso(!!DEMO_PAYLOAD, 'sin payload guardado');
    PRUEBAS.falso(p171Abierto('portalOverlay'), 'y sin portal');

    document.getElementById('dcPass').value = 'clave-p171';
    demoClaveEnviar(document.querySelector('#demoClaveOv .save-btn'));
    for (let i = 0; i < 30; i++) await Promise.resolve();
    PRUEBAS.falso(p171Abierto('demoClaveOv'), '🔴 con la clave bien, la hoja se cierra');
    PRUEBAS.cierto(!!(DEMO_PAYLOAD && DEMO_PAYLOAD.d && DEMO_PAYLOAD.d.ok), '🔴 y el payload queda en memoria');
    PRUEBAS.cierto(p171Abierto('portalOverlay'), '🔴 recién ahora el gate');
    PRUEBAS.cierto(PORTAL_SOLO_DEMO, 'en modo sólo-demo');
    PRUEBAS.igual(DEMO_PAYLOAD.params.pass, 'clave-p171', 'la clave viaja en los params en memoria (para el refresco), como antes');
    PRUEBAS.falso(Object.keys(localStorage).some(k => /clave-p171/.test(localStorage.getItem(k) || '')), '🔒 y NO se guarda en el dispositivo');

    /* «Ingresar» del gate no viaja: aplica lo guardado. */
    llamadas.length = 0;
    portalMode('sup');
    portalVerDemo(document.getElementById('portalDemoBtn'));
    PRUEBAS.igual(llamadas.length, 0, '🔴 «Ingresar» no pide nada a la red: el payload ya está');
    PRUEBAS.cierto(!!(DASH && DASH.demoMode) && DASH.vista === 'supervisor', 'y el panel quedó en la vista elegida');
    /* Volver al gate (lo que hace la flecha ← para quien tiene perfil de gestión) no tira el
       payload en el portal sólo-demo: la clave ya se validó. La ✕ sí lo tira. */
    openPortalGate();
    PRUEBAS.cierto(!!DEMO_PAYLOAD, '⚠️ volver al gate del portal sólo-demo conserva el payload: no se vuelve a pedir la clave');
    closePortal();
    PRUEBAS.falso(!!DEMO_PAYLOAD, 'la ✕ lo tira: la próxima vez se pide la clave otra vez');
  } finally { try { closePortal(); } catch(e){} p171Restaurar(prev); }
});

PRUEBAS.caso('⚠️ `splashVerDemo` ya no sondea la clave adentro del gate', () => {
  PRUEBAS.falso(/demoSondearClave/.test(String(splashVerDemo)), 'la sonda quedó sin llamador (anotada en alcanzabilidad.py)');
  PRUEBAS.cierto(/demoClaveAbrir\(\)/.test(String(splashVerDemo)), 'y el botón abre la hoja de la clave');
});

PRUEBAS.caso('⚠️ los textos nuevos están en los dos idiomas (R14) y el CSS nuevo sin color a mano (R13)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['md_titulo','md_mas_d','md_lead','md_rol','demo_ojo','demo_ojo_lead','demo_salir','dc_titulo','dc_lead','dc_entrar']
        .forEach(k => PRUEBAS.cierto(t(k) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const i = css.indexOf('.demo-fab {'), j = css.indexOf('.md-v {');
  PRUEBAS.cierto(i > 0 && j > i, 'guarda: se leyó el bloque nuevo');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css.slice(i, j + 200)), '⚠️ ni un color a mano en .demo-fab, .demo-salir, #demoVistasOv y .md-*');
});
