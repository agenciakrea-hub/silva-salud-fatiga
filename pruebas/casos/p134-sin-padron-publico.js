PRUEBAS.grupo('P134 · `listas` deja de publicar el padrón');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `?action=listas` respondía a cualquiera con la URL —que está en el `index.html` del repo
   público— con las 11 empresas clientes y los 14 departamentos, sin una sola credencial. Y la lista
   de empresas era la unión de la columna A de `Accesos` con la canónica de la D: la columna A es el
   USUARIO del panel de cada cliente, o sea la mitad del par usuario/contraseña.

   ⚠️ POR QUÉ NO ALCANZABA CON SACARLA DEL CLIENTE. P132 ya había quitado el desplegable y P137 el
   pedido desde «Ya me había registrado»; la acción seguía respondiendo igual. Y quedaba un
   consumidor de verdad: `saveProfile` validaba el nombre de empresa contra esa lista, y esa
   validación existía porque **el servidor guardaba la empresa CRUDA** — así se coló «Consorcio
   Helitec» junto a «Helitec» en una prueba en vivo. El cierre real fue mover eso al servidor:
   `accionRegistro` canoniza al escribir, y entonces nadie necesita ver el padrón.

   La premisa que caducó: `listaDepartamentos()` no recibía empresa porque «los dos llamadores
   corren ANTES de que la persona elija empresa» (A15). Dejó de ser cierto cuando P124 hizo que el
   alta arranque por el código y el servidor diga de qué empresa es.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P134_CAB_DEP = ['Empresa','Departamento','Estado','Actualizado'];

function p134Env(fns, o){
  o = o || {};
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                /* ⚠️ LA COLUMNA D LLEVA LAS VARIANTES, separadas por coma, y la PRIMERA es la
                   canónica: así es la fila real de HELITEC en el CH. `construirAlias` mapea cada
                   variante a la primera, y de ahí sale la canonización. Con una sola entrada el
                   alias no conoce «helitec» y el caso medía un entorno que no existe. */
                ['helitec','claveA','supervisor','Consorcio HELITEC, Helitec','',''],
                ['cardon','claveB','supervisor','Cardón','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana Suárez','V-111','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Departamentos': o.deps || [P134_CAB_DEP.slice(),
      ['Consorcio HELITEC','Operaciones','activo','2026-01-01'],
      ['Consorcio HELITEC','Mantenimiento','activo','2026-01-01'],
      ['Cardón','Planta','activo','2026-01-01'],
      ['Cardón','Laboratorio','activo','2026-01-01']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    /* `listaDepartamentos` cruza la hoja `Departamentos` con los REGISTROS —un área existe para una
       empresa si alguien de ahí se está midiendo en ella— así que sin esta hoja la acción tira.
       Va con sus dos filas de encabezado y ninguna medición: acá las áreas salen de `Departamentos`. */
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p134Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
function p134Listas(api, empresa){
  return p134Json(api.manejar(Object.assign({ action:'listas' }, empresa ? { empresa: empresa } : {})));
}

PRUEBAS.caso('🔴 `listas` NO devuelve la lista de empresas · era el padrón de clientes', () => {
  const api = p134Env(['manejar']);
  const r = p134Listas(api, 'Consorcio HELITEC');
  PRUEBAS.igual(r.ok, true, 'responde ok · ' + (r.error || ''));
  PRUEBAS.igual('empresas' in r, false,
    '⚠️ la clave `empresas` no está en la respuesta · devolvía 11 nombres de clientes sin credencial');
});

PRUEBAS.caso('🔴 sin empresa no devuelve NADA · quien no dice quién es, no recibe el padrón', () => {
  const api = p134Env(['manejar']);
  const r = p134Listas(api);
  PRUEBAS.igual(r.ok, true, 'sigue respondiendo ok · no confirma ni niega nada');
  PRUEBAS.igual((r.departamentos || []).length, 0,
    '⚠️ cero departamentos · antes devolvía la unión de las áreas de todos los clientes');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR: CON empresa sí devuelve sus áreas', () => {
  /* Sin esto, un arreglo que rompiera la acción entera daría verde arriba y habría dejado el alta
     sin sugerencias de departamento sin que nadie lo note. */
  const api = p134Env(['manejar']);
  const r = p134Listas(api, 'Consorcio HELITEC');
  const d = r.departamentos || [];
  PRUEBAS.alMenos(d.length, 1, 'devuelve algo · quedó [' + d.join(', ') + ']');
  PRUEBAS.cierto(d.indexOf('Operaciones') >= 0, 'con las áreas de esa empresa');
});

PRUEBAS.caso('🔴 y NO devuelve las de OTRA empresa · el filtro es real, no decorativo', () => {
  /* Devolver las áreas de todos los clientes a quien pregunta por uno es publicar el padrón por la
     otra puerta. «Planta» y «Laboratorio» son de Cardón. */
  const api = p134Env(['manejar']);
  const d = p134Listas(api, 'Consorcio HELITEC').departamentos || [];
  PRUEBAS.igual(d.indexOf('Planta'), -1, '⚠️ no ve «Planta», que es de Cardón · quedó [' + d.join(', ') + ']');
  PRUEBAS.igual(d.indexOf('Laboratorio'), -1, 'ni «Laboratorio»');
  const d2 = p134Listas(api, 'Cardón').departamentos || [];
  PRUEBAS.cierto(d2.indexOf('Planta') >= 0, 'y Cardón sí ve las suyas · quedó [' + d2.join(', ') + ']');
  PRUEBAS.igual(d2.indexOf('Operaciones'), -1, 'sin ver las de HELITEC');
});

PRUEBAS.caso('🔴 el REEMPLAZO: `accionRegistro` canoniza la empresa · es lo que hace innecesario el padrón', () => {
  /* La validación del cliente contra la lista existía SÓLO por esto. Se entra por la acción real y
     se mide lo que quedó escrito en la hoja, no lo que la función devuelve. */
  const api = p134Env(['accionRegistro']);
  api.accionRegistro({ nombre:'Ana Suárez', cedula:'V-111', email:'ana@a.com',
                       empresa:'helitec', departamento:'Operaciones', dispositivoId:'d1' });
  const v = api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues();
  PRUEBAS.igual(String(v[1][8]), 'Consorcio HELITEC',
    '⚠️ se guarda la canónica · antes «helitec» y «Consorcio HELITEC» convivían como dos empresas');
});

PRUEBAS.caso('🔒 pero una empresa DESCONOCIDA entra igual — el discriminador', () => {
  /* `nominaEmpresaCanon` devuelve el nombre tal cual si no conoce el alias. Si canonizar se
     convirtiera en rechazar, un cliente nuevo no podría darse de alta. */
  const api = p134Env(['accionRegistro']);
  api.accionRegistro({ nombre:'Nueva Persona', cedula:'V-777', email:'n@n.com',
                       empresa:'Empresa Que Recién Llega', dispositivoId:'d1' });
  const v = api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues();
  PRUEBAS.igual(String(v[1][8]), 'Empresa Que Recién Llega', '🔒 el cliente nuevo se guarda como escribió');
});

/* ── EL CLIENTE ────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el cliente MANDA la empresa · sin eso la respuesta viene vacía', async () => {
  /* R17 · el contrato entre las dos puntas. El servidor ahora exige la empresa para devolver algo;
     si el cliente no la mandara, el combo del alta se quedaría sin sugerencias para siempre y nada
     lo avisaría. Se mide la URL que sale, no que la variable esté seteada. */
  const previo = Object.assign({}, localStorage);
  const prevFetch = fetchConReloj, prevLoaded = SETUP_LISTS_LOADED, prevEmp = SETUP_LISTS_EMP;
  const urls = [];
  try {
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' });
    SETUP_LISTS_LOADED = false; SETUP_LISTS_EMP = undefined; SETUP_LISTS.departamentos = [];
    localStorage.removeItem(K_LISTAS_CACHE);
    fetchConReloj = (u) => { urls.push(String(u));
      return Promise.resolve({ json: () => Promise.resolve({ ok:true, departamentos:['Operaciones'] }) }); };
    loadSetupLists();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.alMenos(urls.length, 1, 'guarda: salió el pedido');
    PRUEBAS.cierto(urls[0].indexOf('empresa=' + encodeURIComponent('Consorcio HELITEC')) > 0,
      '⚠️ la empresa viaja en la URL · sin ella el servidor no devuelve nada · fue «' + urls[0].slice(-70) + '»');
  } finally {
    fetchConReloj = prevFetch; SETUP_LISTS_LOADED = prevLoaded; SETUP_LISTS_EMP = prevEmp;
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔒 la caché de OTRA empresa no se aplica · teléfono compartido', () => {
  /* Los departamentos ahora son de una empresa. Aplicar los del alta anterior ofrecería áreas que
     en la nueva no existen — y en un hangar el teléfono se presta. */
  const previo = Object.assign({}, localStorage);
  const prevEmp = SETUP_LISTS_EMP;
  try {
    localStorage.setItem(K_LISTAS_CACHE, JSON.stringify(
      { empresa:'Cardón', empresas:[], departamentos:['Planta','Laboratorio'] }));
    SETUP_LISTS.departamentos = [];
    SETUP_LISTS_EMP = 'Consorcio HELITEC';
    PRUEBAS.igual(listasCacheAplicar(), false, '🔒 no se aplica la de otra empresa');
    PRUEBAS.igual(SETUP_LISTS.departamentos.length, 0, 'y no quedó nada pegado');
    SETUP_LISTS_EMP = 'Cardón';
    PRUEBAS.igual(listasCacheAplicar(), true, 'el discriminador: la de la MISMA empresa sí se aplica');
    PRUEBAS.igual(SETUP_LISTS.departamentos.join(','), 'Planta,Laboratorio', 'con sus áreas');
  } finally {
    SETUP_LISTS_EMP = prevEmp; SETUP_LISTS.departamentos = [];
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
  }
});
