PRUEBAS.grupo('P131 · el servicio médico, con camino de vuelta');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `esServicioMedico` tenía CERO apariciones en las 8.096 líneas del servidor. Vivía sólo en el
   `localStorage` del teléfono, y su única entrada era la casilla de «Editar mis datos» —que para
   verla ya hay que tener el perfil—. O sea: quien cerraba sesión lo perdía y no había forma de
   reponerlo, porque `cerrarSesion()` borra `K_PROFILE` y el perfil que devuelve el servidor no
   traía la clave. El médico quedaba sin su panel y sin nadie a quien pedírselo.

   ⚠️ LA COLUMNA VA AL FINAL DE LA HOJA, Y NO ES UN DETALLE. `accionRegistro` escribe la fila POR
   POSICIÓN, y los encabezados REALES de `Registrados Fatiga` no son los del array del código: la
   columna A es un texto de descripción y no existe «Última actualización». Meter la columna al
   lado de «Es supervisor» habría corrido Empresa, Departamento y Cargo una posición en las 16
   filas que ya hay. Acá se prueba con los encabezados reales, no con los del array.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los mismos encabezados REALES que usa p118, leídos del CH. Si alguien los renombra, las dos
   constantes tienen que cambiar juntas. */
const P131_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P131_CAB_NOM = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'];

function p131Fila(extra){
  const f = new Array(P131_CAB_REG.length).fill('');
  f[2] = 'Ana Suárez'; f[3] = 'ana@ejemplo.com'; f[4] = 'V-111'; f[5] = 'PIL-004';
  f[6] = 'Sí'; f[7] = 'No'; f[8] = 'Helitec'; f[9] = 'Operaciones'; f[10] = 'Piloto';
  f[11] = 'F'; f[12] = '34'; f[13] = '0412-1112233';
  return Object.assign(f, extra || {});
}
function p131Env(fns, o){
  o = o || {};
  const reg = [ (o.cabReg || P131_CAB_REG).slice() ];
  if (o.filas !== false) reg.push(o.fila || p131Fila());
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','claveA','supervisor','Helitec','','']],
    'Nómina': [P131_CAB_NOM.slice(), ['Helitec','Ana Suárez','V-111','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': reg,
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p131Hoja(api){ return api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues(); }
function p131ColMed(v){
  for (let i = 0; i < v[0].length; i++){
    const c = String(v[0][i] || '').toLowerCase();
    if (c.indexOf('médico') >= 0 || c.indexOf('medico') >= 0) return i;
  }
  return -1;
}
function p131Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }

/* ── EL ESCRITOR ───────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 `accionRegistro` guarda el servicio médico · antes el servidor lo tiraba', () => {
  const api = p131Env(['accionRegistro']);
  const antes = p131Hoja(api);
  PRUEBAS.igual(p131ColMed(antes), -1, 'guarda: la hoja arranca SIN esa columna, como el CH real');
  const r = p131Json(api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
    empresa:'Helitec', esPiloto:true, esSupervisor:false, esServicioMedico:true, dispositivoId:'d1' }));
  PRUEBAS.igual(r.ok, true, 'responde ok · ' + (r.error || ''));
  const v = p131Hoja(api);
  const c = p131ColMed(v);
  PRUEBAS.cierto(c >= 0, '⚠️ la columna se crea sola si falta · el CH no la tiene todavía');
  PRUEBAS.igual(c, P131_CAB_REG.length, '🔒 y va AL FINAL · en el medio correría 16 filas de datos reales');
  PRUEBAS.igual(String(v[1][c]), 'Sí', 'con el valor de esta persona');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR: sin la columna, las demás no se corren', () => {
  /* Si la columna se insertara en el medio, Empresa pasaría a Departamento y así todo. Se mide
     contra la fila que YA estaba, no contra la que se acaba de escribir. */
  const api = p131Env(['accionRegistro']);
  api.accionRegistro({ nombre:'Otra Persona', cedula:'V-999', email:'o@o.com', empresa:'Helitec',
                       esServicioMedico:true, dispositivoId:'d1' });
  const v = p131Hoja(api);
  PRUEBAS.igual(String(v[1][8]), 'Helitec', 'la empresa de Ana sigue en su columna');
  PRUEBAS.igual(String(v[1][9]), 'Operaciones', 'y su departamento también');
  PRUEBAS.igual(String(v[1][13]), '0412-1112233', 'y su teléfono · un corrimiento lo habría movido');
});

PRUEBAS.caso('🔴 si la clave NO viaja, la celda NO se toca · el tri-estado del escritor', () => {
  /* `sincronizarRegistro` manda el perfil entero en CADA apertura. Sin esta guarda, el primer
     arranque de alguien cuyo perfil todavía no trae la clave escribiría "No" y borraría el dato
     — el mismo defecto que ya tiene `esSupervisor`, pero acá gobierna el acceso al panel médico. */
  const api = p131Env(['accionRegistro']);
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
                       empresa:'Helitec', esServicioMedico:true, dispositivoId:'d1' });
  const c = p131ColMed(p131Hoja(api));
  PRUEBAS.igual(String(p131Hoja(api)[1][c]), 'Sí', 'guarda: quedó marcada');
  // Ahora vuelve a abrir la app con un perfil que NO trae la clave.
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
                       empresa:'Helitec', dispositivoId:'d1' });
  PRUEBAS.igual(String(p131Hoja(api)[1][c]), 'Sí',
    '⚠️ la clave ausente NO apaga la marca · undefined ≠ false');
});

PRUEBAS.caso('🔒 pero un `false` EXPLÍCITO sí la apaga — el discriminador', () => {
  /* Es la diferencia entre «no sé» y «la persona destildó la casilla». Si esto no apagara, no
     habría forma de quitarle el rol a nadie. */
  const api = p131Env(['accionRegistro']);
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
                       empresa:'Helitec', esServicioMedico:true, dispositivoId:'d1' });
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@ejemplo.com',
                       empresa:'Helitec', esServicioMedico:false, dispositivoId:'d1' });
  const c = p131ColMed(p131Hoja(api));
  PRUEBAS.igual(String(p131Hoja(api)[1][c]), 'No', '🔒 destildar la casilla sí se guarda');
});

/* ── EL LECTOR, Y EL CAMINO DE VUELTA ──────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el médico que cerró sesión RECUPERA su rol · era el prompt entero', () => {
  /* Se entra por `accionRecuperarPerfil`, que es lo que llama el cliente cuando alguien vuelve sin
     perfil. Antes esa respuesta no traía la clave y la persona quedaba sin su panel. */
  const cab = P131_CAB_REG.concat(['¿Servicio médico?']);
  const fila = p131Fila(); fila[P131_CAB_REG.length] = 'Sí';
  const api = p131Env(['accionRecuperarPerfil'], { cabReg: cab, fila: fila });
  const r = p131Json(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d1', _post:true }));
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  PRUEBAS.igual(r.perfil.esServicioMedico, true,
    '⚠️ el flag vuelve del servidor · antes vivía SÓLO en el localStorage que cerrar sesión borra');
});

PRUEBAS.caso('⚠️ la celda VACÍA no viaja · no puede apagar lo que el teléfono ya sabe', () => {
  /* La regla del tri-estado, del lado del lector: vacía = «no sé». Si viajara como `false`,
     `perfilMerge` lo copiaría (`if (k in dato)`) y le apagaría el rol a un médico cuya columna
     RRHH todavía no llenó. */
  const cab = P131_CAB_REG.concat(['¿Servicio médico?']);
  const fila = p131Fila(); fila[P131_CAB_REG.length] = '';
  const api = p131Env(['accionRecuperarPerfil'], { cabReg: cab, fila: fila });
  const r = p131Json(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d1', _post:true }));
  PRUEBAS.igual('esServicioMedico' in r.perfil, false,
    '⚠️ la clave NO está en la respuesta · vacía significa «no sé», nunca «no»');
});

PRUEBAS.caso('🔒 y un "No" explícito SÍ viaja — el discriminador del lector', () => {
  const cab = P131_CAB_REG.concat(['¿Servicio médico?']);
  const fila = p131Fila(); fila[P131_CAB_REG.length] = 'No';
  const api = p131Env(['accionRecuperarPerfil'], { cabReg: cab, fila: fila });
  const r = p131Json(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111', dispositivoId:'d1', _post:true }));
  PRUEBAS.igual(r.perfil.esServicioMedico, false, '🔒 el "No" cargado a mano sí apaga');
});

/* ── EL CONTRATO CON EL CLIENTE ────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el par cerrado: lo que el servidor manda, el cliente lo aplica', () => {
  /* R17 · el contrato entre los dos lados, no cada lado por separado. `perfilMerge` es el único
     merge del cliente desde P118; si alguien sacara `esServicioMedico` de `PERFIL_BOOL`, el
     servidor seguiría mandando la clave y nadie la guardaría. */
  const conMarca = perfilMerge({ nombre:'Ana', esServicioMedico:false }, { esServicioMedico:true });
  PRUEBAS.igual(conMarca.esServicioMedico, true, 'el cliente aplica el true que llega');
  const sinClave = perfilMerge({ nombre:'Ana', esServicioMedico:true }, { nombre:'Ana' });
  PRUEBAS.igual(sinClave.esServicioMedico, true,
    '⚠️ y una respuesta SIN la clave no lo apaga · las dos puntas usan la misma regla');
});

/* ── (b) · EL ROL QUE CARGA LA NÓMINA, Y LA CONTRASEÑA UNA SOLA VEZ ────────────────────────── */

PRUEBAS.caso('🔴 aceptar el rol propuesto por la Nómina SINCRONIZA la marca al CH', async () => {
  /* La decisión de Franco: «se carga en la nómina, y debe poner la contraseña médica una vez».
     El flujo ya existía; lo que faltaba es que la marca sobreviva. `saveProfile` —el otro camino
     que enciende el flag— sincroniza desde siempre; `rolActivarGuardar` no, y hasta P131 daba
     igual porque el servidor tiraba el dato. Ahora quien acepta y cierra sesión antes de volver a
     abrir la app perdería la marca.
     ⚠️ SE ENTRA POR `rolConfirmar()`, que es el botón que toca la persona, y se mide QUÉ SALE POR
     EL CABLE — no que la función interna se haya llamado. */
  const previo = Object.assign({}, localStorage);
  const prevFetch = fetchConReloj, prevVal = window.validarSupervisorCreds,
        prevConn = window.offHayConexion, prevAv = window.avanzarAlta, prevToast = window.showToast;
  const enviados = [];
  try {
    setProfile({ nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Ops', cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412',
                 email:'ana@a.com', rol:'medico', rolOrigen:'nomina' });
    try { localStorage.removeItem(K_REG_SIG); } catch(e){}
    window.validarSupervisorCreds = () => Promise.resolve('ok');
    window.offHayConexion = () => true;
    window.avanzarAlta = () => {};
    window.showToast = () => {};
    fetchConReloj = (u, o) => {
      try { enviados.push(JSON.parse(o.body)); } catch(e){}
      return Promise.resolve({ json: () => Promise.resolve({ ok:true }) });
    };
    PRUEBAS.igual(rolPropuesto(getProfile()), 'medico',
      'guarda: con «medico» en la Nómina y sin la marca puesta, hay algo que ofrecer');
    PRUEBAS.igual(rolOfrecerAbrir(), true, 'guarda: el ofrecimiento se abre');
    document.getElementById('rolPass').value = 'clave-medica';
    rolConfirmar(document.querySelector('#rolForm .save-btn'));
    await new Promise(r => setTimeout(r, 120));
    PRUEBAS.igual(!!(getProfile() || {}).esServicioMedico, true, 'guarda: la marca queda puesta');
    const reg = enviados.filter(e => e && e.action === 'registro');
    PRUEBAS.alMenos(reg.length, 1,
      '⚠️ el registro VIAJA al aceptar · antes esperaba al próximo arranque y cerrar sesión lo perdía');
    PRUEBAS.igual(reg[reg.length - 1].esServicioMedico, true,
      'y lleva la marca adentro, que es lo que el CH guarda desde P131');
  } finally {
    fetchConReloj = prevFetch;
    window.validarSupervisorCreds = prevVal; window.offHayConexion = prevConn;
    window.avanzarAlta = prevAv; window.showToast = prevToast;
    try { rolOfrecerCerrar(); } catch(e){}
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('🔒 y con la contraseña MAL no se guarda nada — el discriminador', async () => {
  /* «Una vez» no es «sin verificar»: si el servidor rechaza la contraseña, ni la marca ni el POST.
     Sin este caso, un arreglo que sincronizara antes de validar daría verde arriba. */
  const previo = Object.assign({}, localStorage);
  const prevFetch = fetchConReloj, prevVal = window.validarSupervisorCreds,
        prevConn = window.offHayConexion, prevToast = window.showToast;
  const enviados = [];
  try {
    setProfile({ nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Ops', cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412',
                 email:'ana@a.com', rol:'medico', rolOrigen:'nomina' });
    window.validarSupervisorCreds = () => Promise.resolve('bad');
    window.offHayConexion = () => true;
    window.showToast = () => {};
    fetchConReloj = (u, o) => { try { enviados.push(JSON.parse(o.body)); } catch(e){}
      return Promise.resolve({ json: () => Promise.resolve({ ok:true }) }); };
    rolOfrecerAbrir();
    document.getElementById('rolPass').value = 'la-que-no-es';
    rolConfirmar(document.querySelector('#rolForm .save-btn'));
    await new Promise(r => setTimeout(r, 120));
    PRUEBAS.igual(!!(getProfile() || {}).esServicioMedico, false,
      '🔒 la contraseña equivocada no enciende la marca');
    PRUEBAS.igual(enviados.filter(e => e && e.action === 'registro').length, 0,
      '🔒 y no se manda nada al CH');
  } finally {
    fetchConReloj = prevFetch;
    window.validarSupervisorCreds = prevVal; window.offHayConexion = prevConn; window.showToast = prevToast;
    try { rolOfrecerCerrar(); } catch(e){}
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
    try { syncScrollLock(); } catch(e){}
  }
});
