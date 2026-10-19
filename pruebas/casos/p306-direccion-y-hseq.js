PRUEBAS.grupo('P306 · Dirección y HSEQ, separados');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Hasta P306 había un solo panel, «Dirección / HSEQ», y lo abría la «Contraseña HSQ» de `Accesos`.
   Decisiones de Franco (2026-10-19): esa contraseña abre **Dirección**; HSEQ estrena la suya; Rafael
   ve todo; Dirección pierde P1, P2… recién en P313 (ADR 017).

   El diseño: los dos entran con la vista `hseq` —todo lo que hoy se le niega a `hseq` vale para los
   dos— y los separa la marca `panel:"hseq"`. R19 · los derechos los conceden:
   · `validarAcceso` (qué contraseña da qué) y `accCols` (qué columna es cuál);
   · `esPanelHseq_` (la única pregunta «¿es HSEQ y no Dirección?») y `panelDe_` (lo que se le dice
     a la app);
   · `sesEmitir`/`sesResolver` (la columna «Panel» de `Sesiones`);
   · `accesoPanel_` (el visor del administrador);
   · en la app, `dashCamposDelServidor` y `vistaLabel`.

   R17 · se entra por `accionSupervisor` y `accionSesionCrear`, como entra la app. El CH de prueba es
   propio (`p306Hojas`), el mismo CH chico de P185, con la columna nueva de `Accesos` cuando hace falta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P306_CAB_HSEQ = 'Contraseña panel HSEQ';
const P306_ADMIN = 'admin-p306#';
/* El CH de prueba, PROPIO: en el panel cada archivo de casos corre aislado y no ve las constantes de
   otro (la primera versión usaba las de P185 y en el navegador daba «no está definida»). Es el mismo
   CH chico de P185: dos empresas, tres personas, `Accesos` con los títulos reales. */
function p306Fila(persona, dep, empresa, kss) {
  const f = new Array(90).fill('');
  f[0] = '2026-10-19 10:00'; f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = '2026-10-19'; f[86] = kss;
  return f;
}
/* `cabDir`: el título de la columna de Dirección (el de producción por defecto); `hseq`: la contraseña
   del panel de HSEQ, o null para un `Accesos` sin la columna nueva (como está hoy el CH). */
function p306Hojas(opc) {
  opc = opc || {};
  const cab = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
    'Rol (supervisor ve solo su empresa, admin ve todas)',
    'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
    'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', opc.cabDir || 'Contraseña HSQ'];
  const conHseq = opc.hseq !== null;
  if (conHseq) cab.push(P306_CAB_HSEQ);
  const f = (...a) => conHseq ? a : a.slice(0, 6);
  return {
    'Accesos': [cab,
      f('*',       P306_ADMIN, 'admin',      '',                             '',        '',        ''),
      f('helitec', 'sup-306',  'supervisor', 'Consorcio HELITEC, Helitec',   'med-306', opc.dir || 'dir-306', opc.hseq || 'hseq-306'),
      f('silva',   'sup-sil',  'supervisor', 'Aeroambulancias Silva, Silva', '',        '',        '')],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p306Fila('Ana Suárez', 'Operaciones', 'Consorcio HELITEC', 7),
      p306Fila('Luis Ferrer', 'Operaciones', 'Consorcio HELITEC', 3),
      p306Fila('Pedro Gómez', 'Vuelo', 'Aeroambulancias Silva', 5)],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono', 'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC',     'Ana Suárez',  'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3'],
      ['Consorcio HELITEC',     'Luis Ferrer', 'V-22222', 'Operaciones', 'Piloto', 'M', '35', '', '', 'Si', '', 'empleado', '3'],
      ['Aeroambulancias Silva', 'Pedro Gómez', 'V-33333', 'Vuelo',       'Piloto', 'M', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  };
}
function p306Api(opc, fns) {
  const env = GS.crearEntorno(p306Hojas(opc));
  const api = GS.cargarGs(CTX.gs, env, fns || ['accionSupervisor', 'accionSesionCrear', 'validarAcceso', 'esPanelHseq_']);
  api.__env = env;
  return api;
}
const p306J = r => JSON.parse(r.getContent());
const p306Panel = (api, pass, extra) =>
  p306J(api.accionSupervisor(Object.assign({ usuario: 'helitec', pass: pass, dispositivoId: 'p306' }, extra || {})));

PRUEBAS.caso('🔴 la contraseña de hoy abre Dirección y la nueva abre HSEQ', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306Api({});
  const dir = p306Panel(api, 'dir-306'), hs = p306Panel(api, 'hseq-306');
  PRUEBAS.cierto(dir.ok && hs.ok, 'guarda: las dos contraseñas entran');
  PRUEBAS.igual([dir.vista, dir.panel], ['hseq', 'direccion'],
    '🔴 la «Contraseña HSQ» de hoy es Dirección (vista `hseq`, sin la marca)');
  PRUEBAS.igual([hs.vista, hs.panel], ['hseq', 'hseq'], '🔴 la nueva es el panel de HSEQ');
  PRUEBAS.igual([api.esPanelHseq_(api.validarAcceso('helitec', 'dir-306', 'p306')),
                 api.esPanelHseq_(api.validarAcceso('helitec', 'hseq-306', 'p306'))], [false, true],
    '🔴 `esPanelHseq_`, la pregunta por la que P308 va a abrir los valores, separa a los dos');
  PRUEBAS.igual(p306Panel(api, 'sup-306').panel, '', 'y fuera de `hseq` no hay panel que nombrar');
});

PRUEBAS.caso('🔴 sin la columna nueva, con el título renombrado, o con la misma contraseña en las dos: Dirección', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* Hoy el CH no tiene la columna nueva: nadie puede quedar en HSEQ por el orden del despliegue. */
  PRUEBAS.igual(p306Panel(p306Api({ hseq: null }), 'dir-306').panel, 'direccion', '🔴 `Accesos` como está hoy en producción');
  PRUEBAS.igual(p306Panel(p306Api({ cabDir: 'Contraseña Dirección' }), 'dir-306').panel, 'direccion',
    'con el título nuevo que le pone `accesos_columnas_p306`');
  /* Las pruebas viejas llaman así a la columna de Dirección: tienen que seguir siendo Dirección. */
  ['Contraseña HSEQ', 'ClaveHseq', 'PassHseq'].forEach(cab =>
    PRUEBAS.igual(p306Panel(p306Api({ cabDir: cab, hseq: null }), 'dir-306').panel, 'direccion', 'el título «' + cab + '» es Dirección'));
  PRUEBAS.igual(p306Panel(p306Api({ dir: 'misma-306', hseq: 'misma-306' }), 'misma-306').panel, 'direccion',
    '🔴 la misma contraseña en las dos columnas entra a la que ve menos');
});

PRUEBAS.caso('🔴 la sesión recordada guarda la marca, y una de antes de P306 es Dirección', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306Api({});
  const s = p306J(api.accionSesionCrear({ usuario: 'helitec', pass: 'hseq-306', dispositivoId: 'p306' }));
  PRUEBAS.cierto(!!s.ok && !!s.sesion, 'guarda: la sesión se emite');
  PRUEBAS.igual(s.panel, 'hseq', 'y la respuesta dice el panel');
  PRUEBAS.igual(p306Panel(api, s.sesion).panel, 'hseq', '🔴 entrando con el token, sigue siendo HSEQ');
  /* Una fila de antes de P306 no tiene la columna «Panel»: se borra la celda y se vuelve a entrar. */
  const sh = api.__env.__libro.getSheetByName('Sesiones');
  const v = sh.getDataRange().getValues();
  const iPanel = v[0].indexOf('Panel');
  PRUEBAS.cierto(iPanel >= 0, 'guarda: la hoja de sesiones tiene la columna «Panel»');
  sh.getRange(2, iPanel + 1).setValue('');
  PRUEBAS.igual(p306Panel(api, s.sesion).panel, 'direccion',
    '🔴 una sesión sin la marca —todas las de antes de P306— entra como Dirección');
});

PRUEBAS.caso('🔴 el visor del administrador mira como Dirección o como HSEQ', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306Api({});
  const ver = vv => p306J(api.accionSupervisor({ usuario: '*', pass: P306_ADMIN, dispositivoId: 'p306',
    verEmpresa: 'Consorcio HELITEC', verVista: vv }));
  const d = ver('direccion'), h = ver('hseq');
  PRUEBAS.igual([d.vista, d.panel, d.visor && d.visor.vista], ['hseq', 'direccion', 'direccion'],
    '🔴 «Dirección»: la vista `hseq` sin la marca, y el visor lo dice');
  PRUEBAS.igual([h.vista, h.panel, h.visor && h.visor.vista], ['hseq', 'hseq', 'hseq'], '🔴 «HSEQ»: con la marca');
});

PRUEBAS.caso('🔴 una app vieja recibe una vista que conoce (R3r3-09)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* La app de antes de P306 —y la que sirve el service worker en la primera apertura— no manda nada
     nuevo. Con una vista desconocida, su `dashTabsFor` le armaba las pestañas del servicio médico. */
  const api = p306Api({});
  ['dir-306', 'hseq-306'].forEach(pass =>
    PRUEBAS.igual(p306Panel(api, pass).vista, 'hseq', '🔴 «' + pass + '» llega como `hseq`, que la app vieja ya conoce'));
});

PRUEBAS.caso('🔴 «¿HSEQ?» de la nómina da el panel, y no duplica el de «¿Dirección?»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `nominaRolesDe_`, por el lector real de la nómina del CH (`leerNomina`). */
  const cab = ['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Email',
    '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo', 'Estado',
    '¿Supervisor?', '¿Servicio médico?', '¿Dirección?', '¿HSEQ?'];
  const fila = (nom, ced, roles) => ['Consorcio HELITEC', nom, ced, 'HSEQ', 'Analista', '', '', '', '', 'No', '', 'Empleado', '3', ''].concat(roles);
  const env = GS.crearEntorno({ 'Nómina': [cab,
    fila('Solo Hseq',   'V-1', ['No', 'No', 'No', 'Sí']),
    fila('Los dos',     'V-2', ['No', 'No', 'Sí', 'Sí']),
    fila('Sólo Dir',    'V-3', ['No', 'No', 'Sí', '']),
    fila('Nada',        'V-4', ['No', 'No', 'No', 'No'])] });
  const api = GS.cargarGs(CTX.gs, env, ['leerNomina']);
  const roles = {}; api.leerNomina().forEach(r => { roles[r.nombre] = r.roles; });
  PRUEBAS.igual(roles['Solo Hseq'], ['hseq'], '🔴 «¿HSEQ?» sola da el panel `hseq`');
  PRUEBAS.igual(roles['Los dos'], ['hseq'], '🔴 las dos en Sí dan el panel UNA vez');
  PRUEBAS.igual(roles['Sólo Dir'], ['hseq'], '«¿Dirección?» sigue dando el mismo panel');
  PRUEBAS.igual(roles['Nada'], [], 'y «No» en las cuatro, ninguno');
});

PRUEBAS.caso('🔴 la app nombra el panel por la marca del servidor', () => {
  if (typeof dashCamposDelServidor !== 'function' || typeof vistaLabel !== 'function') {
    PRUEBAS.cierto(false, '🔴 se necesita la app cargada'); return;
  }
  /* R17 · el campo entra por `dashCamposDelServidor`, el mismo puente que usan el arranque y el
     refresco; un campo que no se nombra ahí se pierde (P227a). */
  PRUEBAS.igual(dashCamposDelServidor({ panel: 'direccion' }).panel, 'direccion', '🔴 la marca llega al panel');
  PRUEBAS.igual(dashCamposDelServidor({ panel: 'otra' }).panel, null, 'y algo que no es una de las dos no entra');
  const prev = DASH;
  try {
    DASH = Object.assign({}, prev || {}, { panel: 'direccion' });
    PRUEBAS.igual(vistaLabel('hseq'), t('vista_direccion'), '🔴 con la contraseña de hoy, el panel se llama «Dirección»');
    DASH = Object.assign({}, prev || {}, { panel: 'hseq' });
    PRUEBAS.igual(vistaLabel('hseq'), t('vista_panel_hseq'), '🔴 con la nueva, «HSEQ»');
    DASH = Object.assign({}, prev || {}, { panel: null });
    PRUEBAS.igual(vistaLabel('hseq'), t('vista_hseq'), 'con un servidor viejo, el nombre de siempre');
    PRUEBAS.igual(vistaLabel('medico'), t('vista_medico'), 'y las otras vistas no cambian');
  } finally { DASH = prev; }
  PRUEBAS.igual([visorVistaTxt('direccion'), visorVistaTxt('hseq')], [t('visor_direccion'), t('visor_hseq')],
    'el visor nombra las dos opciones por separado');
  PRUEBAS.cierto(t('vista_direccion') !== t('vista_panel_hseq'), 'guarda: los dos nombres son distintos');
});

/* ── la nómina y las tareas: lo que el verificador de P306 encontró sin cubrir ─────────────────────
   El CH de estos casos está como el de producción ANTES de P306: la nómina con las tres columnas de
   rol de P177 (17 columnas) y `Accesos` con la «Contraseña HSQ». El emulador valida las medidas de
   `setValues` como Sheets (desde P306): sin eso, la tarea de títulos que metía 4 valores en 3
   columnas pasaba en verde. */
const P306_TOKEN = () => (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
const P306_CAB_NOM17 = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad','Teléfono','Email',
  '¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo','Estado','¿Supervisor?','¿Servicio médico?','¿Dirección?'];
function p306NomApi(filasExtra) {
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSQ'],
                ['helitec','claveA','supervisor','Consorcio HELITEC, Helitec','','dirA']],
    'Nómina': [P306_CAB_NOM17.slice(),
      ['Consorcio HELITEC','Ana Suárez','V-111','Dirección','Gerente','Femenino','34','','','No','','Empleado','4','','Sí','No','Sí'],
      ['Consorcio HELITEC','Beto Pérez','V-222','Operaciones','Piloto','Masculino','40','','','Sí','PIL-2','Empleado','3','','No','No','No']]
      .concat(filasExtra || []),
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor'], ['Consorcio HELITEC','codigoRegistro','HEL-2026']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar', 'leerNomina', 'valorConfigPropio']);
  api.__env = env;
  api.__mant = (tarea, extra) => JSON.parse(api.manejar(Object.assign({ action:'mantenimiento', token:P306_TOKEN(), tarea:tarea, _post:true }, extra || {})).getContent());
  api.__hojaEmpresa = () => { const id = api.valorConfigPropio('Consorcio HELITEC', 'nominaHojaId'); return id ? env.__libros[id].getSheetByName('Nómina') : null; };
  return api;
}
const p306Col = (v, cab) => v[0].indexOf(cab);

PRUEBAS.caso('🔴 «¿HSEQ?» nace vacía al crear la hoja de una empresa, aunque la persona sea de Dirección', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `nominaHojaCrear_` siembra las cuatro desde las columnas escritas del CH. */
  const api = p306NomApi([['Consorcio HELITEC','Caro Ruiz','V-333','HSEQ','Analista','Femenino','30','','','No','','Empleado','3','','No','No','No']]);
  // Caro es SÓLO HSEQ: se le escribe la columna 18 a mano, como quedaría después de P306
  const ch = api.__env.__libro.getSheetByName('Nómina');
  ch.getRange(1, 18).setValue('¿HSEQ?'); ch.getRange(4, 18).setValue('Sí');
  const r = api.__mant('nomina_hoja_crear', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.cierto(r.ok, 'guarda: la hoja se crea · ' + (r.error || ''));
  const v = api.__hojaEmpresa().__volcado();
  const cD = p306Col(v, '¿Dirección?'), cH = p306Col(v, '¿HSEQ?');
  const de = n => v.find(f => f[0] === n) || [];
  PRUEBAS.igual([de('Ana Suárez')[cD], de('Ana Suárez')[cH]], ['Sí', ''], '🔴 Ana es de Dirección: «¿HSEQ?» vacía, no «Sí»');
  PRUEBAS.igual([de('Caro Ruiz')[cD], de('Caro Ruiz')[cH]], ['No', 'Sí'],
    '🔴 Caro es sólo HSEQ: «¿Dirección?» queda «No» — sembrada desde el rol `hseq` quedaba «Sí»');
});

PRUEBAS.caso('🔴 `nomina_roles_columnas` agrega «¿HSEQ?» al CH y a la hoja de la empresa, vacía', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306NomApi();
  api.__mant('nomina_hoja_crear', { empresa:'Helitec', confirmar:'1' });
  // la hoja de la empresa como era antes de P306: sin la columna 16
  const sh = api.__hojaEmpresa(); const v0 = sh.__volcado();
  sh.clear(); sh.getRange(1, 1, v0.length, 15).setValues(v0.map(f => f.slice(0, 15)));
  const r = api.__mant('nomina_roles_columnas', { confirmar:'1' });
  PRUEBAS.cierto(r.ok, '🔴 la tarea termina bien · ' + (r.error || '') + ' — con el rango de 3 columnas, Sheets lanzaba');
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Nómina').__volcado()[0][17], '¿HSEQ?', '🔴 el CH tiene el título en la columna 18');
  const v = sh.__volcado(), cH = p306Col(v, '¿HSEQ?');
  PRUEBAS.cierto(cH >= 0, 'la hoja de la empresa tiene «¿HSEQ?»');
  PRUEBAS.igual(v.slice(1).map(f => f[cH]), ['', ''], '🔴 y nace vacía para todos, también para Ana, que es de Dirección');
});

PRUEBAS.caso('🔴 `nomina_rol_set` marca «¿HSEQ?» de una persona en su hoja, y el sync la lleva al CH', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306NomApi();
  api.__mant('nomina_hoja_crear', { empresa:'Helitec', confirmar:'1' });
  const sim = api.__mant('nomina_rol_set', { empresa:'Helitec', nombre:'Ana Suárez', rol:'esHseqPanel', valor:'Sí' });
  PRUEBAS.igual([sim.ok, sim.r && sim.r.simulado], [true, true], 'sin confirmar, simula');
  const r = api.__mant('nomina_rol_set', { empresa:'Helitec', nombre:'Ana Suárez', rol:'esHseqPanel', valor:'Sí', confirmar:'1' });
  PRUEBAS.cierto(r.ok, 'la escribe · ' + (r.error || ''));
  const v = api.__hojaEmpresa().__volcado();
  PRUEBAS.igual(v.find(f => f[0] === 'Ana Suárez')[p306Col(v, '¿HSEQ?')], 'Sí', '🔴 en la hoja de SU empresa, que es la dueña del dato');
  PRUEBAS.igual(v.find(f => f[0] === 'Beto Pérez')[p306Col(v, '¿HSEQ?')], '', 'y a nadie más');
  const s = api.__mant('nomina_sync', { empresa:'Helitec', confirmar:'1' });
  PRUEBAS.cierto(s.ok, 'guarda: el sync corre · ' + (s.error || ''));
  const ana = api.leerNomina().find(x => x.nombre === 'Ana Suárez') || {};
  PRUEBAS.igual(ana.rolesCrudo && ana.rolesCrudo[3], 'Sí', '🔴 el CH la tiene en la columna 18');
  PRUEBAS.igual(ana.roles, ['supervisor', 'hseq'], 'y sus paneles no cambian: «¿HSEQ?» da el mismo `hseq` que «¿Dirección?»');
  const no = api.__mant('nomina_rol_set', { empresa:'Helitec', nombre:'Nadie', rol:'esHseqPanel', valor:'Sí', confirmar:'1' });
  PRUEBAS.falso(no.ok, 'una persona que no está no se inventa');
});

PRUEBAS.caso('🔴 algo que no es Sí o No en «¿HSEQ?» no le cambia los roles a nadie', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `nominaRolesDe_` → `nominaCeldaRolR_`. Una fila del modelo viejo (las tres de P177 vacías,
     manda «Rol en la app») con una nota en la columna 18: antes pasaba al modelo nuevo con `roles: []`
     y la app le sacaba el panel y la sesión a un supervisor. */
  const api = p306NomApi([['Consorcio HELITEC','Dora Gil','V-444','Operaciones','Supervisora','Femenino','29','','','No','','Supervisor','3','','','','', 'revisar']]);
  const dora = api.leerNomina().find(x => x.nombre === 'Dora Gil') || {};
  PRUEBAS.igual(dora.roles, ['supervisor'], '🔴 sigue siendo supervisora: una nota en la columna 18 no es un rol');
  const api2 = p306NomApi([['Consorcio HELITEC','Dora Gil','V-444','Operaciones','Supervisora','Femenino','29','','','No','','Supervisor','3','','','','', 'Sí']]);
  PRUEBAS.igual((api2.leerNomina().find(x => x.nombre === 'Dora Gil') || {}).roles, ['hseq'],
    'y un «Sí» en la columna 18 sí la pasa al modelo nuevo, con su panel de HSEQ (las otras tres, vacías)');
});

PRUEBAS.caso('🔴 `accesos_columnas_p306` renombra la de Dirección, agrega la de HSEQ vacía y el título de Sesiones', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p306NomApi();
  const acc = () => api.__env.__libro.getSheetByName('Accesos').__volcado();
  const sim = api.__mant('accesos_columnas_p306', {});
  PRUEBAS.igual(acc()[0][5], 'Contraseña HSQ', 'sin confirmar, no toca nada');
  const r = api.__mant('accesos_columnas_p306', { confirmar:'1' });
  PRUEBAS.cierto(r.ok, 'la tarea termina · ' + (r.error || ''));
  const cab = acc()[0];
  PRUEBAS.igual([cab[5], cab[6]], ['Contraseña Dirección', 'Contraseña panel HSEQ'], '🔴 los dos títulos');
  PRUEBAS.igual(acc()[1][5], 'dirA', '🔴 y la contraseña de Dirección no se tocó');
  PRUEBAS.igual(acc()[1][6] || '', '', 'la de HSEQ, vacía: la elige Franco');
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Sesiones').__volcado()[0][13], 'Panel', 'y `Sesiones` tiene el título «Panel»');
  const otra = api.__mant('accesos_columnas_p306', { confirmar:'1' });
  PRUEBAS.igual(otra.r && otra.r.cambios, ['nada: ya estaba todo'], 'la segunda vez no hace nada');
  PRUEBAS.cierto(JSON.stringify(sim).indexOf('dirA') < 0 && JSON.stringify(r).indexOf('dirA') < 0, 'y nunca devuelve una contraseña');
});
