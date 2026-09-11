PRUEBAS.grupo('P177 · varios roles por persona, y el selector conforme a la nómina');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Pedido de Franco (2026-09-11), textual: «en el sheet debería poder tener varios roles, y cuando
   voy a estadísticas veo los paneles que tenga puesto en el sheet, y de ahí selecciono a cuál
   entro. Si tengo uno, tocar el botón abre directo ese panel; si no, el panel que muestre las
   ventanas que teníamos antes pero conforme a los roles que me pusieron en sheet. Por si alguien es
   supervisor pero médico, o empleado pero médico». Y: «debo poner cada contraseña del rol que me
   pusieron» — el ADR 002 intacto.

   Decisiones del panel: TRES COLUMNAS Sí/No (no una celda con comas), y «se quita lo que ya no
   esté en la lista».

   ⚠️ LA MIGRACIÓN GRADUAL ES LO MÁS DELICADO y por eso tiene sus propios casos: las 13 filas que
   hoy existen NO tienen las columnas nuevas, y tienen que seguir funcionando exactamente igual.
   La regla está en `nominaRolesDe_`: si ninguna de las tres tiene algo ESCRITO, manda «Rol en la
   app»; si alguna tiene algo —«Sí» o «No»— mandan las tres. La distinción vacío/«No» es la misma
   que costó P101.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P177_CAB_NOM_VIEJA = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo','Estado'];
const P177_CAB_NOM = P177_CAB_NOM_VIEJA.concat(['¿Supervisor?','¿Servicio médico?','¿Dirección?']);

/* `filas` son arrays ya armados. Se puede pasar la cabecera vieja (14 columnas) para probar una
   nómina anterior a P177. */
function p177Env(filas, fns, cab){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['silva','clave-sup','supervisor','Aeroambulancias Silva, Silva','clave-med','clave-hseq']],
    'Nómina': [(cab || P177_CAB_NOM).slice()].concat(filas || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Tareas': [['Empresa','Id','Persona','Titulo','Detalle','Vence','Estado','Creada','Autor','Rol']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar','leerNomina','accionTareasMias','credEnNomina'].concat(fns || []));
  api.__env = env;
  api.__json = r => JSON.parse(r.getContent ? r.getContent() : r);
  /* R17 · se entra por `accionTareasMias`, que es el pedido REAL que la app hace en cada arranque
     y el único canal que identifica a una persona sin contraseña. */
  api.__mias = (persona, ced) => api.__json(api.accionTareasMias({
    empresa:'Silva', persona:persona, cedula:ced, appVersion:'6.43' }));
  return api;
}
const p177Sin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };
const P177_FILA = (nombre, ced, rolTexto, sup, med, hseq) =>
  ['Aeroambulancias Silva', nombre, ced, 'Operaciones', 'Coordinador', 'M', '35', '', '', 'No', '', rolTexto, '3', ''].concat(
    (sup === undefined && med === undefined && hseq === undefined) ? [] : [sup || '', med || '', hseq || '']);

/* ── la derivación ───────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 varios roles a la vez · supervisor Y servicio médico', () => {
  if (p177Sin()) return;
  const api = p177Env([P177_FILA('Ana Suárez', 'V-111', 'Empleado', 'Sí', 'Sí', 'No')]);
  const r = api.__mias('Ana Suárez', 'V-111');
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.rolesNomina, ['supervisor','medico'], '🔴 los dos viajan · es el caso que Franco nombró');
  PRUEBAS.igual(r.rolNomina, 'supervisor',
    '⚠️ y el campo viejo sigue viajando con el primero: hay teléfonos que sólo entienden ése');
});

PRUEBAS.caso('🔴 «empleado pero médico» · el otro ejemplo de Franco', () => {
  if (p177Sin()) return;
  const api = p177Env([P177_FILA('Beto Pérez', 'V-222', 'Empleado', 'No', 'Sí', 'No')]);
  const r = api.__mias('Beto Pérez', 'V-222');
  PRUEBAS.igual(r.rolesNomina, ['medico'], '🔴 sólo el médico, aunque la columna de texto diga «Empleado»');
  PRUEBAS.igual(r.rolNomina, 'medico', 'y el campo viejo lo acompaña');
});

PRUEBAS.caso('🔒 MIGRACIÓN · una fila SIN las columnas nuevas se comporta igual que antes', () => {
  if (p177Sin()) return;
  /* La nómina de hoy: 14 columnas, sin las tres nuevas. Son las 13 filas que existen en producción. */
  const api = p177Env([P177_FILA('Carla Díaz', 'V-333', 'Supervisor')], null, P177_CAB_NOM_VIEJA);
  const r = api.__mias('Carla Díaz', 'V-333');
  PRUEBAS.igual(r.rolNomina, 'supervisor', '🔒 «Rol en la app» sigue mandando · las 13 filas de producción entran por acá');
  PRUEBAS.igual(r.rolesNomina, ['supervisor'], 'y la lista lo refleja');
});

PRUEBAS.caso('🔒 MIGRACIÓN · las tres columnas presentes pero VACÍAS tampoco cambian nada', () => {
  if (p177Sin()) return;
  const api = p177Env([P177_FILA('Carla Díaz', 'V-333', 'Supervisor', '', '', '')]);
  const r = api.__mias('Carla Díaz', 'V-333');
  PRUEBAS.igual(r.rolesNomina, ['supervisor'],
    '🔒 vacío NO es «No» · si lo fuera, agregar las columnas al CH le sacaría el panel a los cuatro supervisores de golpe');
});

PRUEBAS.caso('🔴 EL DISCRIMINADOR de esa regla · tres «No» SÍ quitan todo', () => {
  if (p177Sin()) return;
  const api = p177Env([P177_FILA('Carla Díaz', 'V-333', 'Supervisor', 'No', 'No', 'No')]);
  const r = api.__mias('Carla Díaz', 'V-333');
  PRUEBAS.igual(r.rolesNomina, [],
    '🔴 con algo escrito mandan las tres, y «Rol en la app» deja de leerse · si la regla fuera «alguna en Sí», tres No caerían en la rama vieja y le devolverían el supervisor');
  PRUEBAS.igual(r.rolNomina, 'empleado', 'y el campo viejo dice «empleado», que es lo que un cliente viejo lee para quitar');
});

PRUEBAS.caso('⚠️ el rol que se escribe en `Credenciales` sale de la lista, no de la celda de texto', () => {
  if (p177Sin()) return;
  const api = p177Env([P177_FILA('Ana Suárez', 'V-111', 'Empleado', 'No', 'Sí', 'No')]);
  const en = api.credEnNomina('Aeroambulancias Silva', 'V-111');
  PRUEBAS.igual(en.persona.rol, 'medico',
    '⚠️ la celda dice «Empleado» y la lista dice médico: manda la lista');
  PRUEBAS.igual(en.persona.roles, ['medico'], 'y la lista viaja entera');
});

/* ── el cliente ──────────────────────────────────────────────────────────────────────────────── */

const P177_PERFIL = { nombre:'Franco Padron', empresa:'Aeroambulancias Silva', cedula:'11111111',
  departamento:'Operaciones', cargo:'Coordinador', sexo:'Masculino', edad:'35',
  telefono:'04120000000', email:'f@e.com', esPiloto:false };

function p177Guardar(){
  return { perf: localStorage.getItem(K_PROFILE), cs: localStorage.getItem(K_DASH_CREDS),
           cm: localStorage.getItem(K_DASH_CREDS_MED), ch: localStorage.getItem(K_DASH_CREDS_HSEQ),
           dash: (typeof DASH !== 'undefined' ? DASH : null) };
}
function p177Restaurar(p){
  const set = (k, v) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); };
  set(K_PROFILE, p.perf); set(K_DASH_CREDS, p.cs); set(K_DASH_CREDS_MED, p.cm); set(K_DASH_CREDS_HSEQ, p.ch);
  try { DASH = p.dash; } catch(e){}
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  try { syncScrollLock(); } catch(e){}
}
const p177Tabs = () => ({
  emp:  document.getElementById('ptabEmp').style.display !== 'none',
  sup:  document.getElementById('ptabSup').style.display !== 'none',
  med:  document.getElementById('ptabMed').style.display !== 'none',
  hseq: document.getElementById('ptabHseq').style.display !== 'none'
});

PRUEBAS.caso('🔴 el selector muestra SÓLO los paneles de su nómina', () => {
  const prev = p177Guardar();
  try {
    /* R17 · se entra por `openPortalGate()`, que es lo que abre el botón de Estadísticas. */
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor'] }));
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:true, med:false, hseq:false },
      '🔴 puesto como supervisor → Personal y Supervisor · Franco: «pero sólo ver personal y supervisor, ya que estoy puesto como eso»');

    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','medico'] }));
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:true, med:true, hseq:false }, '🔴 supervisor + médico → las dos');

    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['medico'] }));
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:false, med:true, hseq:false }, '🔴 «empleado pero médico» → sólo la médica');

    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','medico','hseq'] }));
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:true, med:true, hseq:true }, 'los tres → las cuatro');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 EL DISCRIMINADOR · sin roles en la nómina no aparece ninguna pestaña de empresa', () => {
  const prev = p177Guardar();
  try {
    setProfile(P177_PERFIL);
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); localStorage.removeItem(K_DASH_CREDS_HSEQ); } catch(e){}
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:false, med:false, hseq:false },
      '🔒 un empleado común ve exactamente lo que veía antes · antes de P177 la pestaña de Dirección quedaba visible para todos');
    PRUEBAS.igual(rolesConPanel(), [], 'y no tiene ningún panel');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 la nómina PROPONE: tener el rol no abre el panel sin su contraseña', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor'] }));
    try { localStorage.removeItem(K_DASH_CREDS); } catch(e){}
    PRUEBAS.falso(rolActivado('supervisor'), '🔒 ADR 002 · sin credencial guardada, el rol no está activado');
    PRUEBAS.igual(rolPropuesto(), 'supervisor', 'y por eso se le ofrece activarlo');
    dashSaveCredsValues('Aeroambulancias Silva', 'x');
    setProfile(Object.assign({}, getProfile(), { esSupervisor:true }));
    PRUEBAS.cierto(rolActivado('supervisor'), 'con la contraseña puesta, sí');
    PRUEBAS.igual(rolPropuesto(), '', 'y deja de ofrecérselo');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔴 con VARIOS roles se ofrece el primero que falte, uno por vez', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','medico'] }));
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch(e){}
    PRUEBAS.igual(rolPropuesto(), 'supervisor', 'primero el supervisor');
    /* R17 · se activa por el camino real, el que usa la pantalla del rol. */
    rolActivarGuardar('supervisor', 'Aeroambulancias Silva', 'clave-sup');
    PRUEBAS.igual(rolPropuesto(), 'medico',
      '🔴 y después el médico · cada uno tiene SU contraseña de empresa, así que pedirlas juntas sería una pantalla que nadie completa');
    rolActivarGuardar('medico', 'Aeroambulancias Silva', 'clave-med');
    PRUEBAS.igual(rolPropuesto(), '', 'con los dos puestos, no queda nada que ofrecer');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 cada rol guarda su contraseña en SU ranura · Dirección ya no pisa la de supervisor', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','hseq'] }));
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_HSEQ); } catch(e){}
    rolActivarGuardar('supervisor', 'Aeroambulancias Silva', 'clave-sup');
    rolActivarGuardar('hseq', 'Aeroambulancias Silva', 'clave-hseq');
    PRUEBAS.igual((dashGetCreds() || {}).pass, 'clave-sup',
      '🔒 la de supervisor sigue en su lugar · antes Dirección la pisaba y le sacaba el panel que acababa de activar');
    PRUEBAS.igual((dashGetCredsHseq() || {}).pass, 'clave-hseq', '🔒 y la de Dirección tiene la suya');
    PRUEBAS.cierto(rolActivado('supervisor') && rolActivado('hseq'), 'los dos quedan activados');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('⚠️ un perfil viejo (un solo `rol`) sigue funcionando sin `rolesNomina`', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rol:'supervisor', rolOrigen:'nomina' }));
    PRUEBAS.igual(rolesDeNomina(), ['supervisor'],
      '⚠️ el respaldo al campo de UN rol · un teléfono que todavía no recibió una respuesta con la lista no puede quedarse sin panel');
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs().sup, true, 'y ve su pestaña');
  } finally { p177Restaurar(prev); }
});

/* ── P178 · la entrada al panel cuando la nómina te dio UN rol ────────────────────────────────── */

/* Franco, entrando a la app con 6.44: «pero si estoy puesto como supervisor en el sheet, ¿por qué
   me pide contraseña en el panel de estadísticas? entro y me pide contraseña».
   La contraseña es a propósito (ADR 002) y no se toca. Lo que estaba mal era el recorrido: el
   selector abría parado en «Mis estadísticas» aunque su único panel de empresa fuera Supervisor,
   el botón decía «Entrar» a secas con el usuario ya sabido, y ninguna pantalla decía POR QUÉ se
   pide una contraseña si el sheet ya lo nombra. */

PRUEBAS.caso('🔴 con UN solo panel, el selector abre en ÉL y no en «Mis estadísticas»', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor'] }));
    try { localStorage.removeItem(K_DASH_CREDS); } catch(e){}
    DASH = null;
    abrirDestinoEstadisticas();   // R17 · el botón de Estadísticas, no `openPortalGate` a mano
    const activa = [...document.querySelectorAll('.ptab')].filter(b => b.classList.contains('active')).map(b => b.id);
    PRUEBAS.igual(activa, ['ptabSup'],
      '🔴 abre en Supervisor · antes abría en «Mis estadísticas» y había que tocar la pestaña ANTES de poder escribir');
    PRUEBAS.cierto(document.getElementById('portalSup').style.display !== 'none', 'con el formulario a la vista');
    PRUEBAS.igual(document.getElementById('pEmpresa').value, P177_PERFIL.empresa, 'y el usuario ya puesto');
    PRUEBAS.cierto((document.querySelector('#portalSup .save-btn').textContent || '').indexOf(P177_PERFIL.empresa) >= 0,
      'y el botón lo nombra: «Entrar a …» en vez de «Entrar» a secas');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 EL DISCRIMINADOR · con VARIOS paneles sigue abriendo en el selector', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','medico'] }));
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch(e){}
    DASH = null;
    abrirDestinoEstadisticas();
    const activa = [...document.querySelectorAll('.ptab')].filter(b => b.classList.contains('active')).map(b => b.id);
    PRUEBAS.igual(activa, ['ptabEmp'],
      '🔒 con dos paneles SÍ hay algo que elegir: se abre el selector, que es lo que Franco pidió');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('⚠️ y se explica POR QUÉ se pide la contraseña, sólo a quien todavía no activó', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor'] }));
    try { localStorage.removeItem(K_DASH_CREDS); } catch(e){}
    DASH = null;
    abrirDestinoEstadisticas();
    const pq = document.getElementById('portalPorQue');
    PRUEBAS.falso(pq.hidden, '⚠️ se ve la explicación · una barrera sin motivo a la vista se lee como un obstáculo');
    PRUEBAS.cierto((pq.textContent || '').length > 40, 'y dice algo');
    /* EL DISCRIMINADOR: a quien ya lo activó no se le explica nada. */
    setProfile(Object.assign({}, getProfile(), { esSupervisor:true }));
    DASH = null;
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    abrirDestinoEstadisticas();
    PRUEBAS.cierto(document.getElementById('portalPorQue').hidden,
      '🔒 y a quien ya lo activó NO · contárselo todos los días sería ruido');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('⚠️ la explicación está en los dos idiomas y en español NEUTRO (R14, R1)', () => {
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      PRUEBAS.cierto(t('pg_porque_clave') !== 'pg_porque_clave', 'pg_porque_clave en ' + l); });
    localStorage.setItem(K_LANG, 'es');
    PRUEBAS.falso(/\bvos\b|\btenés\b|\bpodés\b|\bestás puesto\b/i.test(t('pg_porque_clave')), 'R1 · español neutro');
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

/* ── P179 · lo que encontró la auditoría del propio P177 ──────────────────────────────────────── */

PRUEBAS.caso('🔴 quien tiene SÓLO Dirección no ve la pestaña de Supervisor', () => {
  const prev = p177Guardar();
  try {
    /* ⚠️ EL DEFECTO: `rolActivarGuardar('hseq')` deja `esSupervisor:true` por compatibilidad —84
       lugares del archivo leen ese flag— así que `rolActivado('supervisor')` daba true y la lista
       de paneles sumaba «supervisor» a alguien que en la nómina sólo tiene Dirección.
       Medido antes del arreglo: pestañas [Personal, Supervisor, Dirección]. */
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['hseq'] }));
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_HSEQ); } catch(e){}
    rolActivarGuardar('hseq', 'Aeroambulancias Silva', 'clave-hseq');   // R17 · el camino real
    PRUEBAS.igual(rolesConPanel(), ['hseq'], '🔴 un solo panel: el que dice la nómina');
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:false, med:false, hseq:true },
      '🔴 Personal y Dirección · la de Supervisor NO le corresponde');
    PRUEBAS.cierto(!!(getProfile() || {}).esSupervisor,
      '⚠️ y el flag viejo sigue encendido a propósito: lo leen 84 lugares y apagarlo es otro prompt');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 EL DISCRIMINADOR · quien SÍ tiene los dos los ve a los dos', () => {
  const prev = p177Guardar();
  try {
    setProfile(Object.assign({}, P177_PERFIL, { rolesNomina:['supervisor','hseq'] }));
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_HSEQ); } catch(e){}
    rolActivarGuardar('supervisor', 'Aeroambulancias Silva', 'k1');
    rolActivarGuardar('hseq', 'Aeroambulancias Silva', 'k2');
    PRUEBAS.igual(rolesConPanel(), ['supervisor','hseq'], '🔒 los dos · si el arreglo fuera demasiado amplio, acá perdería uno');
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs(), { emp:true, sup:true, med:false, hseq:true }, 'y las dos pestañas');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('⚠️ un perfil VIEJO sin lista de nómina sigue entrando por sus flags', () => {
  const prev = p177Guardar();
  try {
    /* Quien usa el panel y nunca pasó por la nómina: no tiene `rolesNomina` ni `rol`. Sus flags son
       lo único que hay, y tienen que seguir valiendo — si no, se queda sin panel de un día al otro. */
    setProfile(Object.assign({}, P177_PERFIL, { esSupervisor:true, rol:'', rolesNomina:undefined }));
    PRUEBAS.igual(rolesConPanel(), ['supervisor'], '⚠️ sin lista, manda el flag');
    DASH = null; openPortalGate();
    PRUEBAS.igual(p177Tabs().sup, true, 'y ve su pestaña');
  } finally { p177Restaurar(prev); }
});

PRUEBAS.caso('🔒 «cerrar sesión» se lleva las TRES credenciales de empresa', () => {
  const l = sesionClavesBorrar();
  PRUEBAS.cierto(l.indexOf(K_DASH_CREDS) >= 0 && l.indexOf(K_DASH_CREDS_MED) >= 0,
    'las dos de siempre siguen');
  PRUEBAS.cierto(l.indexOf(K_DASH_CREDS_HSEQ) >= 0,
    '🔒 y la de Dirección, que P177 creó y esta lista no conocía · en un teléfono compartido le quedaba viva a la persona siguiente');
});

PRUEBAS.caso('🔒 y al servidor se le avisa de las tres, para que ningún token quede vivo', () => {
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const i = f.indexOf('function sesionAvisarCierre(');
  const tramo = f.slice(i, i + 900);
  PRUEBAS.cierto(/dashGetCredsHseq\(\)/.test(tramo),
    '🔒 las sesiones no caducan solas: sin avisar, el token de Dirección quedaba vivo en el CH para siempre');
  PRUEBAS.cierto(/dashGetCreds\(\)/.test(tramo) && /dashGetCredsMed\(\)/.test(tramo), 'y las otras dos siguen');
});

PRUEBAS.caso('⚠️ «¿hay sesión de empresa en este teléfono?» cuenta también la de Dirección', () => {
  const prev = p177Guardar();
  try {
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); localStorage.removeItem(K_DASH_CREDS_HSEQ); } catch(e){}
    PRUEBAS.falso(portalTieneSesionDeEmpresa(), 'precondición · sin ninguna guardada');
    dashSaveCredsValuesHseq('Aeroambulancias Silva', 'k');
    PRUEBAS.cierto(portalTieneSesionDeEmpresa(),
      '⚠️ quien sólo tiene el panel de Dirección arrancaba en la portada en vez de su panel: esta función es la que decide ese desvío');
  } finally { p177Restaurar(prev); }
});
