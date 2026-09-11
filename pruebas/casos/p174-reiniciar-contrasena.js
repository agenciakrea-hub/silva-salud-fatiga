PRUEBAS.grupo('P174 · el supervisor reinicia la contraseña de quien la olvidó');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   ⚠️ LA APP LO PROMETÍA Y NO EXISTÍA. «Olvidé mi contraseña» dice, en los dos idiomas: «pídele a
   tu supervisor o al servicio médico que la reinicie». El reinicio existía SÓLO como tarea de
   mantenimiento, con un token que tiene una sola persona: quien olvidaba su contraseña quedaba
   afuera de sus propios datos hasta que alguien nos escribiera. Salió en la auditoría del
   2026-09-11, con el texto en la mano.

   Ahora es una acción del panel (`credencial_reiniciar`) y un botón en la lista de personal.
   Lo que este archivo fija:
   · quién puede (supervisor y servicio médico de ESA empresa, con su contraseña de empresa; y el
     administrador). Dirección/HSEQ NO: su vista va anonimizada (K1b), no opera sobre personas;
   · la empresa sale de la CUENTA, no del POST: con la contraseña de una no se toca a la otra;
   · qué hace: vacía hash y sal, la fila QUEDA (R3), se cierran las sesiones de esa persona, y
     nadie llega a saber ninguna contraseña (no se genera ninguna provisoria);
   · después del reinicio, la persona puede crear una nueva y entrar con ella.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P174_CAB_CRED = ['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso'];
const P174_CAB_SES  = ['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada'];
const P174_CAB_NOM  = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];

/* Dos empresas con su contraseña, y Ana (de Helitec) con contraseña propia ya creada. */
function p174Env(fns){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq'],
                ['otra','clave-otra','supervisor','Otra Empresa SA','','']],
    'Nómina': [P174_CAB_NOM.slice(),
      ['Consorcio HELITEC','Ana Suárez','V-111','Operaciones','Piloto','F','34','','ana@h.com','Sí','','','4'],
      ['Consorcio HELITEC','Beto Pérez','V-222','Operaciones','Piloto','M','40','','','Sí','','',''],
      ['Otra Empresa SA','Carla Díaz','V-333','Dirección','Gerente','F','45','','','No','','','2']],
    'Credenciales': [P174_CAB_CRED.slice()],
    'Sesiones': [P174_CAB_SES.slice()],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionCredencialReiniciar','accionCredencialCrear',
    'accionLogin','credBuscar'].concat(fns || []));
  api.__env = env;
  api.__cred = () => env.__libro.getSheetByName('Credenciales').__volcado();
  api.__ses = () => env.__libro.getSheetByName('Sesiones').__volcado();
  api.__json = r => JSON.parse(r.getContent ? r.getContent() : r);
  /* R17 · se entra por `manejar`, que es lo que corre doPost. */
  api.__reiniciar = (extra) => api.__json(api.manejar(Object.assign(
    { action:'credencial_reiniciar', usuario:'helitec', pass:'clave-sup', cedula:'V-111', dispositivoId:'d-sup', _post:true }, extra || {})));
  api.__crearClave = (ced, pass) => api.__json(api.accionCredencialCrear({
    empresa:'Helitec', cedula:ced, persona:'Ana Suárez', pass:pass, dispositivoId:'d1', _post:true }));
  api.__login = (ced, pass) => api.__json(api.accionLogin({
    empresa:'Helitec', cedula:ced, pass:pass, dispositivoId:'d2', _post:true }));
  return api;
}
const p174Sin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };

PRUEBAS.caso('🔴 EL CAMINO COMPLETO · Ana olvida su contraseña, el supervisor la reinicia, y Ana elige una nueva y entra', () => {
  if (p174Sin()) return;
  const api = p174Env();
  PRUEBAS.igual(api.__crearClave('V-111', 'ClaveVieja1').ok, true, 'precondición · Ana tenía contraseña');
  PRUEBAS.igual(api.__login('V-111', 'ClaveVieja1').ok, true, 'precondición · y entraba con ella');
  const antes = api.__cred().find(f => String(f[1]).indexOf('111') >= 0);
  PRUEBAS.cierto(!!antes[3] && !!antes[4], 'precondición · hay hash y sal guardados');

  const r = api.__reiniciar();
  PRUEBAS.igual(r.ok, true, '🔴 el supervisor puede reiniciarla · ' + (r.error || ''));
  PRUEBAS.igual(r.reiniciada, true, 'lo dice');
  const fila = api.__cred().find(f => String(f[1]).indexOf('111') >= 0);
  PRUEBAS.cierto(!!fila, '🔴 la FILA QUEDA (R3: no se borra nada)');
  PRUEBAS.igual([String(fila[3] || ''), String(fila[4] || '')], ['', ''], '🔴 sin hash ni sal');
  PRUEBAS.igual(String(fila[2] || ''), String(antes[2] || ''), 'conservando quién es y cuándo se creó');

  PRUEBAS.igual(api.__login('V-111', 'ClaveVieja1').ok, false, '🔴 la contraseña vieja ya no entra');
  PRUEBAS.igual(api.__crearClave('V-111', 'ClaveNueva9').ok, true, '🔴 y Ana puede crear una nueva');
  PRUEBAS.igual(api.__login('V-111', 'ClaveNueva9').ok, true, '🔴 y entra con ella · el camino se cierra');
  PRUEBAS.igual(api.__cred().filter(f => String(f[1]).indexOf('111') >= 0).length, 1, '⚠️ sin duplicar la fila');
});

PRUEBAS.caso('🔴 el reinicio cierra las sesiones de esa persona · si no, el teléfono que ya estaba adentro sigue adentro', () => {
  if (p174Sin()) return;
  const api = p174Env();
  api.__crearClave('V-111', 'ClaveVieja1');
  api.__login('V-111', 'ClaveVieja1');
  PRUEBAS.cierto(api.__ses().some(f => String(f[11]) === 'activa'), 'precondición · quedó una sesión activa');
  const r = api.__reiniciar();
  PRUEBAS.alMenos(r.sesionesCerradas, 1, '🔴 se cerró al menos una');
  PRUEBAS.falso(api.__ses().some(f => String(f[11]) === 'activa'), '🔴 y no queda ninguna activa · las sesiones no caducan solas (S4)');
});

PRUEBAS.caso('🔒 con la contraseña de UNA empresa no se reinicia a alguien de OTRA', () => {
  if (p174Sin()) return;
  const api = p174Env();
  /* Carla es de «Otra Empresa SA». El supervisor de Helitec manda su cédula y, de yapa, miente la
     empresa en el POST: la empresa sale de la CUENTA (`ausScope`), así que no la encuentra. */
  api.__json(api.accionCredencialCrear({ empresa:'Otra Empresa SA', cedula:'V-333', persona:'Carla Díaz', pass:'ClaveCarla1', dispositivoId:'d9', _post:true }));
  const antes = JSON.stringify(api.__cred());
  const r = api.__reiniciar({ cedula:'V-333', empresa:'Otra Empresa SA' });
  PRUEBAS.igual(r.ok, false, '🔒 no la toca');
  PRUEBAS.igual(r.motivo, 'sin_credencial', 'para su empresa esa persona no existe');
  PRUEBAS.igual(JSON.stringify(api.__cred()), antes, '🔒 y la credencial de Carla quedó intacta');
});

PRUEBAS.caso('🔒 sin contraseña de empresa no se reinicia nada, y Dirección/HSEQ tampoco puede', () => {
  if (p174Sin()) return;
  const api = p174Env();
  api.__crearClave('V-111', 'ClaveVieja1');
  const antes = JSON.stringify(api.__cred());
  PRUEBAS.igual(api.__reiniciar({ pass:'la-que-se-me-ocurre' }).motivo, 'credenciales', '🔒 con una contraseña inventada, no');
  PRUEBAS.igual(api.__reiniciar({ pass:'' }).motivo, 'credenciales', '🔒 sin contraseña, tampoco');
  const h = api.__reiniciar({ pass:'clave-hseq' });
  PRUEBAS.igual(h.ok, false, '🔒 Dirección/HSEQ entra al panel pero NO puede reiniciar');
  PRUEBAS.igual(h.motivo, 'sin_permiso', 'con el motivo dicho: su vista va anonimizada, no opera sobre personas (K1b)');
  const m = api.__reiniciar({ pass:'clave-med' });
  PRUEBAS.igual(m.ok, true, '⚠️ EL DISCRIMINADOR · el servicio médico SÍ puede · ' + (m.error || ''));
  PRUEBAS.igual(JSON.stringify(api.__cred()) === antes, false, 'y de verdad reinició (si no, los tres «no» de arriba pasarían por nada)');
});

PRUEBAS.caso('⚠️ sólo por POST · por la URL no se reinicia la contraseña de nadie', () => {
  if (p174Sin()) return;
  const api = p174Env();
  api.__crearClave('V-111', 'ClaveVieja1');
  const r = api.__json(api.manejar({ action:'credencial_reiniciar', usuario:'helitec', pass:'clave-sup', cedula:'V-111', dispositivoId:'d' }));
  PRUEBAS.igual(r.ok, false, '⚠️ por GET no · la contraseña de empresa quedaría en los registros de la URL');
  PRUEBAS.igual(api.__login('V-111', 'ClaveVieja1').ok, true, 'y la contraseña sigue sirviendo');
});

PRUEBAS.caso('⚠️ a quien nunca creó contraseña se le dice eso, no un error', () => {
  if (p174Sin()) return;
  const api = p174Env();
  const r = api.__reiniciar({ cedula:'V-222' });   // Beto está en la nómina pero nunca entró
  PRUEBAS.igual(r.ok, false, 'no hay nada que reiniciar');
  PRUEBAS.igual(r.motivo, 'sin_credencial', '⚠️ con su propio motivo, para que el cliente lo explique en vez de decir «falló»');
});

PRUEBAS.caso('⚠️ queda en la bitácora quién lo hizo y sobre quién · nunca la contraseña', () => {
  if (p174Sin()) return;
  const api = p174Env();
  api.__crearClave('V-111', 'ClaveVieja1');
  api.__reiniciar();
  const bit = api.__env.__libro.getSheetByName('Bitácora');
  const filas = bit ? bit.__volcado() : [];
  const ev = filas.find(f => String(f[2]) === 'credencial_reiniciada');
  PRUEBAS.cierto(!!ev, '⚠️ el evento está (R3: append-only)');
  PRUEBAS.cierto(/panel/.test(JSON.stringify(ev)), 'dice que salió del panel, no de mantenimiento');
  PRUEBAS.falso(/ClaveVieja1/.test(JSON.stringify(filas)), '🔒 y NINGUNA contraseña quedó escrita');
});

/* ── el cliente ──────────────────────────────────────────────────────────────────────────── */

/* Pinta la lista como la ve el supervisor. ⚠️ LIMPIA EL BUSCADOR Y EL DESPLEGABLE DE
   DEPARTAMENTO, y abre el overlay: `nominaListFiltrar` filtra por esos dos controles, así que un
   caso anterior que dejó texto ahí deja la lista en CERO filas —y las medidas de toque dan 0 si
   la hoja está cerrada. Las dos cosas hicieron fallar la primera versión de estos casos. */
function p174Pintar(gente){
  const prev = { dash: DASH, datos: NOMLIST.datos, total: NOMLIST.total, reg: NOMLIST.registrados,
                 q: (document.getElementById('nomListSearch') || {}).value,
                 dep: (document.getElementById('nomListDepto') || {}).value,
                 confirm: window.confirm, fetch: window.fetch, fetchR: window.fetchConReloj };
  const ov = document.getElementById('nominaListOv');
  prev.tenia = ov && ov.classList.contains('show');
  const q = document.getElementById('nomListSearch'); if (q) q.value = '';
  const dep = document.getElementById('nomListDepto'); if (dep) dep.value = '';
  DASH = { params: { action:'supervisor', usuario:'helitec', pass:'clave-sup' }, vista:'supervisor', rol:'supervisor', ausencias:{}, f:{} };
  NOMLIST.datos = gente; NOMLIST.total = gente.length;
  NOMLIST.registrados = gente.filter(x => x.registrado).length;
  if (ov) ov.classList.add('show');
  nominaListFiltrar();
  return { restaurar(){
    window.confirm = prev.confirm; window.fetch = prev.fetch; window.fetchConReloj = prev.fetchR;
    DASH = prev.dash; NOMLIST.datos = prev.datos; NOMLIST.total = prev.total; NOMLIST.registrados = prev.reg;
    if (q) q.value = prev.q || ''; if (dep) dep.value = prev.dep || '';
    if (ov && !prev.tenia) ov.classList.remove('show');
    try { nominaListFiltrar(); } catch(e){}
  } };
}

PRUEBAS.caso('🔴 el botón está en la fila de cada persona registrada de la nómina, y pide confirmación (R8)', () => {
  const h = p174Pintar([
    { persona:'Ana Suárez', cedula:'V-111', departamento:'Op', cargo:'Piloto', registrado:true, desde:'2026-08-01' },
    { persona:'Beto Pérez', cedula:'V-222', departamento:'Op', cargo:'Piloto', registrado:false },
    { persona:'Sin Cédula', cedula:'', departamento:'Op', cargo:'Piloto', registrado:true }
  ]);
  try {
    const btns = [...document.querySelectorAll('#nomListBody .nomlist-pass')];
    PRUEBAS.igual(btns.length, 1, '🔴 sólo en la fila de quien YA se registró y tiene cédula');
    PRUEBAS.igual(btns[0].getAttribute('data-ced'), 'V-111', 'con su cédula en `data-`, no dentro del onclick');
    PRUEBAS.alMenos(Math.round(btns[0].getBoundingClientRect().height), 44, 'y se toca con el dedo (R12)');
    let preguntas = 0;
    window.confirm = () => { preguntas++; return false; };   // la persona se arrepiente
    let mando = false;
    window.fetch = () => { mando = true; return Promise.resolve({ json: () => Promise.resolve({ ok:true }) }); };
    btns[0].click();
    PRUEBAS.igual(preguntas, 1, '🔴 R8 · pregunta antes (deja a alguien sin poder entrar hasta que elija otra)');
    PRUEBAS.falso(mando, '🔴 y al cancelar NO manda nada');
  } finally { h.restaurar(); }
});

PRUEBAS.caso('⚠️ al confirmar manda `credencial_reiniciar` con la credencial del panel, por POST', () => {
  const h = p174Pintar([{ persona:'Ana Suárez', cedula:'V-111', departamento:'Op', cargo:'Piloto', registrado:true }]);
  try {
    window.confirm = () => true;
    let cuerpo = null, metodo = '';
    window.fetchConReloj = (url, opts) => { metodo = (opts && opts.method) || 'GET';
      try { cuerpo = JSON.parse(opts.body); } catch(e){}
      return Promise.resolve({ json: () => Promise.resolve({ ok:true, reiniciada:true }) }); };
    document.querySelector('#nomListBody .nomlist-pass').click();
    PRUEBAS.igual(metodo, 'POST', '⚠️ por POST: la contraseña de empresa no va en la URL');
    PRUEBAS.igual(cuerpo && cuerpo.action, 'credencial_reiniciar', 'la acción');
    PRUEBAS.igual(cuerpo && cuerpo.cedula, 'V-111', 'la persona');
    PRUEBAS.cierto(!!(cuerpo && cuerpo.pass), 'y la credencial del panel (dashAuth), no una escrita a mano');
  } finally { h.restaurar(); }
});

PRUEBAS.caso('⚠️ el texto de «Olvidé mi contraseña» ahora nombra algo que EXISTE, en los dos idiomas (R14)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['cred_reset_btn','cred_reset_confirmar','cred_reset_listo','cred_reset_sin','cred_reset_no','cred_reset_yendo']
        .forEach(k => PRUEBAS.cierto(t(k, { q:'X' }) !== k, k + ' en ' + l));
    });
    localStorage.setItem(K_LANG, 'es');
    const txt = t('lgn_olvide_d');
    PRUEBAS.cierto(/panel|lista de personal/i.test(txt), '⚠️ dice DÓNDE se hace · antes mandaba a pedir algo que no existía');
    PRUEBAS.falso(/\bvos\b|\btenés\b|\bpodés\b/i.test(txt), 'R1 · español neutro');
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});
