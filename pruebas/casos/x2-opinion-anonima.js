
PRUEBAS.grupo('X2 · la opinión es anónima de verdad');

/* ⚠️ POR QUÉ ESTE ARCHIVO ES DISTINTO DE LOS DEMÁS. Casi todo lo que la suite vigila, si falla, se
   arregla en el próximo prompt. Esto no: si una opinión se puede atribuir, la persona que la
   escribió ya quedó expuesta, y no hay versión posterior que lo repare. Por eso los casos de abajo
   no comprueban que la función "funcione": comprueban que NO haya nada de más. */

function x2Perfil(fn){
  const prev = localStorage.getItem(K_PROFILE);
  try {
    localStorage.setItem(K_PROFILE, JSON.stringify({
      nombre:'Ana Suárez', cedula:'V-9001', empresa:'Helitec', departamento:'Operaciones',
      cargo:'Piloto', sexo:'F', edad:'38', telefono:'+58 412 5551234', email:'ana@helitec.com',
      esPiloto:true, id_piloto:'P-1' }));
    return fn();
  } finally { if (prev) localStorage.setItem(K_PROFILE, prev); else localStorage.removeItem(K_PROFILE); }
}

/* Intercepta `empEncolar` y devuelve lo que se le pasó, sin llegar a la red ni a la cola real. */
function x2Capturar(texto){
  const orig = empEncolar;
  let visto = null;
  try {
    empEncolar = (id, accion, payload) => { visto = { id, accion, payload }; };
    document.getElementById('opinionOv').classList.add('show');
    document.getElementById('opinionTxt').value = texto;
    opinionEnviar(document.getElementById('opinionBtn'));
  } finally {
    empEncolar = orig;
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  }
  return visto;
}

PRUEBAS.caso('⚠️ el payload NO lleva NADA que identifique a la persona', () => {
  /* Lista blanca, no lista negra: se comprueba que sólo estén los tres campos previstos. Con una
     lista negra, cualquier campo nuevo que alguien agregue mañana pasaría sin sonar — y el que
     agrega un campo siempre cree que el suyo es inofensivo. */
  const visto = x2Perfil(() => x2Capturar('Los turnos de 14 horas no se sostienen.'));
  PRUEBAS.cierto(!!visto, 'guarda de medibilidad: tiene que haberse encolado algo');
  if (!visto) return;
  PRUEBAS.igual(Object.keys(visto.payload).sort(), ['empresa','mes','texto'],
    '⚠️ SÓLO empresa, mes y texto. Cualquier otra clave hay que poder defenderla contra ' +
    '"¿esto, cruzado con lo que el supervisor ya sabe, señala a una persona?"');
  const crudo = JSON.stringify(visto);
  ['Ana Suárez','V-9001','Operaciones','Piloto','ana@helitec.com','+58 412 5551234','P-1']
    .forEach(dato => PRUEBAS.falso(crudo.indexOf(dato) >= 0,
      '⚠️ se filtró "' + dato + '" en el envío'));
});

PRUEBAS.caso('⚠️ tampoco el identificador del teléfono', () => {
  /* Es el filtrado más peligroso porque es estable: no dice el nombre, pero agrupa todas las
     opiniones de la misma persona. Con dos o tres opiniones agrupadas, deducir quién es cuestión
     de leerlas. */
  const visto = x2Perfil(() => x2Capturar('Prueba.'));
  if (!visto) { PRUEBAS.cierto(false, 'no se encoló nada'); return; }
  const id = dispositivoId();
  PRUEBAS.alMenos(id.length, 4, 'guarda: el identificador de dispositivo tiene que existir para poder buscarlo');
  PRUEBAS.falso(JSON.stringify(visto).indexOf(id) >= 0,
    '⚠️ el identificador del dispositivo no puede viajar');
  PRUEBAS.falso(/dispositivoId/.test(String(opinionEnviar)),
    'ni siquiera se lo debe llamar en el envío');
});

PRUEBAS.caso('⚠️ va el MES, nunca la fecha ni la hora', () => {
  /* El plan lo dice con un ejemplo que no admite discusión: en una empresa chica, "Operaciones,
     14:32" ES un nombre. Con el mes, el supervisor no puede cruzar la opinión con quién trabajó
     ese día. */
  const visto = x2Perfil(() => x2Capturar('Prueba.'));
  if (!visto) { PRUEBAS.cierto(false, 'no se encoló nada'); return; }
  PRUEBAS.cierto(/^\d{4}-\d{2}$/.test(visto.payload.mes),
    '⚠️ el mes tiene que ser AAAA-MM y nada más — vino: ' + visto.payload.mes);
  const crudo = JSON.stringify(visto.payload);
  PRUEBAS.falso(/\d{4}-\d{2}-\d{2}/.test(crudo), '⚠️ no puede haber una fecha completa');
  PRUEBAS.falso(/\d{2}:\d{2}/.test(crudo), '⚠️ ni una hora');
  PRUEBAS.falso(/\bts\b|timestamp|Date\.now/.test(crudo), '⚠️ ni una marca de tiempo');
});

PRUEBAS.caso('⚠️ el id es aleatorio, no derivado del dispositivo ni de la hora', () => {
  /* Si el id derivara del dispositivo, dos opiniones de la misma persona compartirían prefijo y se
     podrían agrupar sin saber su nombre — que es exactamente lo que hay que evitar. */
  const a = opinionNuevoId(), b = opinionNuevoId();
  PRUEBAS.falso(a === b, '⚠️ dos ids seguidos no pueden coincidir');
  const id = dispositivoId();
  PRUEBAS.falso(a.indexOf(id) >= 0 || id.indexOf(a.slice(3)) >= 0,
    '⚠️ el id no puede contener el del dispositivo');
  PRUEBAS.falso(/Date\.now|getTime|dispositivoId/.test(String(opinionNuevoId)),
    '⚠️ ni derivarse de la hora ni del dispositivo — es lo que lo volvería un identificador estable');
});

PRUEBAS.caso('⚠️ el aviso de anonimato está ARRIBA del campo, no debajo', () => {
  /* Pedido explícito del plan, y no es de redacción: quien no sabe que es anónimo se autocensura
     ANTES de escribir, así que leerlo después no arregla nada. */
  const ov = document.getElementById('opinionOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    const aviso = ov.querySelector('.op-anon'), campo = document.getElementById('opinionTxt');
    PRUEBAS.cierto(!!aviso && !!campo, 'tienen que existir los dos');
    if (!aviso || !campo) return;
    PRUEBAS.cierto(aviso.getBoundingClientRect().bottom <= campo.getBoundingClientRect().top,
      '⚠️ el aviso va ANTES del campo de texto');
    PRUEBAS.alMenos(aviso.querySelectorAll('li').length, 3,
      '⚠️ y dice QUÉ no se guarda: "es anónimo" a secas no lo cree nadie que haya trabajado en una empresa');
  } finally { if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ el aviso no promete más de lo que el envío cumple', () => {
  /* Mismo criterio que X1: el texto se compara contra lo que se manda de verdad. Si mañana alguien
     agrega el departamento al payload, esta promesa queda mintiendo. */
  const visto = x2Perfil(() => x2Capturar('Prueba.'));
  if (!visto) { PRUEBAS.cierto(false, 'no se encoló nada'); return; }
  const dice = String(t('op_anon_2') || '').toLowerCase();
  if (/departamento|department/.test(dice))
    PRUEBAS.falso('departamento' in visto.payload, '⚠️ el aviso dice que no va el departamento');
  if (/cargo|role/.test(dice))
    PRUEBAS.falso('cargo' in visto.payload, '⚠️ y que no va el cargo');
  const dice3 = String(t('op_anon_3') || '').toLowerCase();
  PRUEBAS.cierto(/mes|month/.test(dice3), 'y el aviso nombra el mes, que es lo único temporal que va');
});

PRUEBAS.caso('⚠️ texto vacío no envía nada, y el largo se corta', () => {
  const vacio = x2Perfil(() => x2Capturar('   '));
  PRUEBAS.igual(vacio, null, '⚠️ un texto en blanco no puede encolarse');
  const largo = x2Perfil(() => x2Capturar('x'.repeat(1500)));
  PRUEBAS.igual(largo, null, '⚠️ y uno de 1500 caracteres se rechaza en el cliente, con su aviso');
});

PRUEBAS.caso('⚠️ el doble toque no genera dos opiniones', () => {
  /* La cola deduplica por id, pero el id se genera en el envío: dos toques generarían dos ids
     distintos y dos opiniones. El candado del botón es lo único que lo evita. */
  PRUEBAS.cierto(/btn\.disabled\)\s*return/.test(String(opinionEnviar)),
    '⚠️ tiene que cortar si el botón ya está bloqueado');
  PRUEBAS.cierto(String(opinionEnviar).indexOf('btn.disabled = true') <
                 String(opinionEnviar).indexOf('empEncolar'),
    '⚠️ y bloquear ANTES de encolar, no después');
});

PRUEBAS.caso('⚠️ va por la cola offline: sin señal no se pierde', () => {
  /* R7. Y `empEncolar` manda exactamente el payload que se le da, sin agregar nada por su cuenta —
     por eso la lista blanca de más arriba es la lista completa de lo que sale del teléfono. */
  /* P183 · antes leía `String(opinionEnviar)` y `String(empFlush)`. Ahora se escribe la opinión y
     se toca «Enviar» con `empEncolar` espiado (tiene que encolarse, no salir por un fetch directo
     que se pierda sin señal); y después se vacía la cola con `fetchConReloj` espiado: el cuerpo de
     `opinion_guardar` NO puede llevar el identificador del dispositivo, y el de cualquier otra
     acción SÍ.
     ⚠️ ESTE CASO ME FRENÓ, Y POR ESO SE AFINA EN VEZ DE AFLOJARSE. En L6 agregué `dispositivoId`
     a TODAS las escrituras de esta cola para poder frenar una inundación, sin mirar que una de
     ellas es el canal anónimo. Un id estable identifica al teléfono, y por lo tanto a la persona,
     aunque el texto no lleve nombre. */
  const oEncolar = window.empEncolar, oFetch = window.fetchConReloj, oNav = history.pushState;
  const prevCola = localStorage.getItem(K_EMP_COLA), prevPerfil = getProfile();
  const encolado = [], posts = [];
  try {
    setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' });
    window.empEncolar = (id, accion, payload) => { encolado.push({ id, accion, payload }); };
    history.pushState = () => {};
    document.getElementById('opinionTxt').value = 'Los turnos de noche seguidos me dejan mal.';
    opinionEnviar(null);
    PRUEBAS.igual(encolado.length, 1, '⚠️ «Enviar» ENCOLA la opinión (R7): sin señal no se pierde');
    PRUEBAS.igual(encolado[0] && encolado[0].accion, 'opinion_guardar', 'con la acción de la opinión');
    PRUEBAS.igual(Object.keys((encolado[0] || {}).payload || {}).sort(), ['empresa', 'mes', 'texto'], 'y el payload lleva SÓLO empresa, mes y texto: ni nombre, ni cédula, ni dispositivo');
    /* ahora la cola de verdad, con dos ítems: la opinión y un reporte cualquiera */
    window.empEncolar = oEncolar;
    localStorage.setItem(K_EMP_COLA, JSON.stringify({
      'op_x2': { accion: 'opinion_guardar', payload: { empresa: 'Consorcio HELITEC', mes: '2026-09', texto: 'hola' }, creada: Date.now() },
      'rep_x2': { accion: 'reporte_guardar', payload: { id: 'rep_x2', opcion: 'cansado', empresa: 'Consorcio HELITEC' }, creada: Date.now() }
    }));
    window.fetchConReloj = (url, opts) => { try { posts.push(JSON.parse(opts.body)); } catch(e){ posts.push({ _crudo: String(opts && opts.body) }); } return new Promise(() => {}); };   // la red no contesta: nada se borra de la cola
    delete _empEnVuelo.op_x2; delete _empEnVuelo.rep_x2;
    empFlush();
    const op = posts.find(b => b.action === 'opinion_guardar'), rep = posts.find(b => b.action === 'reporte_guardar');
    PRUEBAS.cierto(!!op && !!rep, 'guarda: la cola mandó las dos (' + posts.map(b => b.action).join(', ') + ')');
    PRUEBAS.falso(op && ('dispositivoId' in op), '⚠️ la opinión sale SIN `dispositivoId`');
    PRUEBAS.cierto(rep && !!rep.dispositivoId, 'DISCRIMINADOR · el reporte sí lo lleva (es lo que frena una inundación)');
    PRUEBAS.igual(Object.keys(op || {}).sort(), ['action', 'empresa', 'mes', 'texto'], 'y la opinión no lleva ninguna otra cosa');
  } finally {
    window.empEncolar = oEncolar; window.fetchConReloj = oFetch; history.pushState = oNav;
    delete _empEnVuelo.op_x2; delete _empEnVuelo.rep_x2;
    if (prevCola == null) localStorage.removeItem(K_EMP_COLA); else localStorage.setItem(K_EMP_COLA, prevCola);
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    document.getElementById('opinionTxt').value = '';
    try { document.getElementById('opinionOv').classList.remove('show'); } catch(e){}
  }
});

PRUEBAS.caso('los textos están en los dos idiomas y en neutro (R1, R14)', () => {
  ['op_op_titulo','op_op_sub','op_op_label','op_op_desc','op_op_t','op_anon_t','op_anon_1',
   'op_anon_2','op_anon_3','op_op_lbl','op_op_ph','op_op_enviar','op_op_vacia','op_op_larga',
   'op_op_gracias','op_op_pie'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\bvos\b|tenés|querés|podés|escribí/.test(String(v)), '⚠️ R1: nunca voseo — ' + k);
  });
});

PRUEBAS.grupo('X2 · el servidor (R15)');

function x2Env(filas){
  const env = GS.crearEntorno({
    'Opiniones': [['IdOpinion','Empresa','Mes','Texto']].concat(filas || []),
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'],
                ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo'],
               ['Helitec','Ana Suárez','V-1','Op','Piloto']]
  });
  const api = GS.cargarGs(CTX.gs, env,
    ['accionOpinionGuardar','accionOpiniones','obtenerHojaOpiniones']);
  api.filas = () => { const h = env.__libro.getSheetByName('Opiniones'); return h ? h._datos : null; };
  api.__env = env;   // P183 · para mirar formatos y hojas desde los casos
  return api;
}
const x2r = resp => JSON.parse(resp.getContent());

PRUEBAS.caso('⚠️ la hoja tiene CUATRO columnas y ninguna identifica', () => {
  /* Si mañana alguien agrega `Persona` o `Fecha` acá, todo lo demás pasa a ser decorativo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes leía `var OPI_HEAD = […]` en la fuente. Ahora se deja que el servidor CREE la
     hoja (entorno sin `Opiniones`) y escriba una opinión con todo lo identificable a mano en el
     POST: la cabecera y la fila tienen que quedar con cuatro celdas y ninguna que identifique. */
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'], ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Op','Piloto']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionOpinionGuardar']);
  const r = JSON.parse(api.accionOpinionGuardar({ id:'op1', empresa:'Helitec', mes:'2026-09', texto:'una opinión', persona:'Ana Suárez', nombre:'Ana Suárez', cedula:'V-1', dispositivoId:'tel-de-ana', departamento:'Op', cargo:'Piloto', fecha:'2026-09-15', hora:'10:00' }).getContent());
  PRUEBAS.cierto(!!r.ok, 'guarda: la opinión se guardó (' + (r.error || 'ok') + ')');
  const hoja = env.__libro.getSheetByName('Opiniones');
  PRUEBAS.cierto(!!hoja, 'guarda: el servidor creó la hoja');
  const filas = hoja ? hoja.__volcado() : [];
  const cols = (filas[0] || []).map(String).filter(x => x !== '');
  PRUEBAS.igual(cols, ['IdOpinion','Empresa','Mes','Texto'], '⚠️ la cabecera tiene estas cuatro columnas y ninguna más — quedó: ' + cols.join(', '));
  ['Persona','Nombre','Cedula','Departamento','Cargo','Fecha','Hora','Dispositivo'].forEach(mala =>
    PRUEBAS.falso(cols.indexOf(mala) >= 0, '⚠️ no puede existir la columna ' + mala));
  const fila = (filas[1] || []).map(String);
  PRUEBAS.igual(fila.filter(x => x !== '').length, 4, 'y la fila escrita tiene cuatro celdas con dato');
  PRUEBAS.cierto(fila.join('|').indexOf('Ana') < 0 && fila.join('|').indexOf('V-1') < 0 && fila.join('|').indexOf('tel-de-ana') < 0, '⚠️ y ninguna guarda lo identificable que vino en el POST (nombre, cédula, dispositivo)');
});

PRUEBAS.caso('⚠️ guardar NO exige contraseña — un empleado no tiene ninguna', () => {
  /* Su login es nombre + empresa. Si esto pidiera credenciales, la función sería inalcanzable
     justo para quien tiene que usarla. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x2Env();
  const r = x2r(api.accionOpinionGuardar({ id:'op_1', empresa:'Helitec', mes:'2026-09', texto:'Algo' }));
  PRUEBAS.cierto(r.ok, '⚠️ tiene que guardar sin contraseña — respondió: ' + JSON.stringify(r).slice(0,80));
  const filas = api.filas();
  PRUEBAS.igual(filas.length, 2, 'y quedar una fila');
  PRUEBAS.igual(filas[1], ['op_1','Helitec','2026-09','Algo'], 'con exactamente esos cuatro valores');
});

PRUEBAS.caso('⚠️ el mismo envío dos veces NO duplica (la cola reintenta)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x2Env();
  api.accionOpinionGuardar({ id:'op_1', empresa:'Helitec', mes:'2026-09', texto:'Algo' });
  api.accionOpinionGuardar({ id:'op_1', empresa:'Helitec', mes:'2026-09', texto:'Algo' });
  PRUEBAS.igual(api.filas().length, 2, '⚠️ upsert por id, no append ciego (R15)');
});

PRUEBAS.caso('⚠️ una fecha completa en `mes` se rechaza, no se guarda', () => {
  /* Una app vieja o un reloj mal puesto no pueden meter una fecha exacta en esa columna: sería el
     dato que todo el diseño evita, entrando por la puerta de atrás. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x2Env();
  api.accionOpinionGuardar({ id:'op_x', empresa:'Helitec', mes:'2026-09-04', texto:'Algo' });
  const fila = api.filas()[1];
  PRUEBAS.cierto(/^\d{4}-\d{2}$/.test(fila[2]),
    '⚠️ tiene que caer al mes del servidor, no guardar la fecha — guardó: ' + fila[2]);
  PRUEBAS.falso(/\d{4}-\d{2}-\d{2}/.test(String(fila[2])), '⚠️ y no puede quedar el día');
});

PRUEBAS.caso('⚠️ leerlas SÍ exige contraseña, y no devuelve el id', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x2Env([['op_1','Helitec','2026-09','Una'], ['op_2','Helitec','2026-09','Otra']]);
  const sin = x2r(api.accionOpiniones({ usuario:'Helitec', pass:'mala' }));
  PRUEBAS.falso(sin.ok, '⚠️ sin la contraseña correcta no se leen');
  const con = x2r(api.accionOpiniones({ usuario:'Helitec', pass:'clave-sup' }));
  PRUEBAS.cierto(con.ok, 'con la contraseña sí');
  PRUEBAS.igual(con.total, 2, 'y vienen las dos');
  con.opiniones.forEach(o => PRUEBAS.igual(Object.keys(o).sort(), ['mes','texto'],
    '⚠️ sólo mes y texto: el id es lo único que permitiría seguir una opinión entre dos cargas'));
});

PRUEBAS.caso('⚠️ y no se devuelven en el orden en que se escribieron', () => {
  /* El orden de escritura es una marca de tiempo encubierta: con dos opiniones seguidas y sabiendo
     quién entró a la app esa tarde, el orden las ata a personas. Barajar cuesta nada.
     ⚠️ Se comprueba sobre el CÓDIGO y no sobre una corrida: un barajado real puede devolver el
     orden original por azar, y un caso que falla 1 de cada N veces es peor que no tenerlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `Math.random()` en el cuerpo de `accionOpiniones`. Ahora se escriben
     diez opiniones en orden y se piden TRES veces: si alguna vuelta trae un orden distinto del de
     escritura, se barajan. Con diez hay 3.628.800 órdenes posibles: que tres barajados
     devuelvan el original por azar es (1/3.628.800)³ — no es una prueba intermitente. Y si el
     código NO barajara, las tres vueltas serían el orden de escritura, siempre: rojo seguro. */
  const filas = []; for (let i = 0; i < 10; i++) filas.push(['op' + i, 'Helitec', '2026-09', 'texto número ' + i]);
  const api = x2Env(filas);
  const pedir = () => x2r(api.accionOpiniones({ usuario:'Helitec', empresa:'Helitec', pass:'clave-sup', dispositivoId:'d' }));
  const r0 = pedir();
  PRUEBAS.cierto(!!r0.ok, 'guarda: la bandeja responde (' + (r0.error || 'ok') + ')');
  const lista = r0.opiniones || r0.lista || r0.items || [];
  PRUEBAS.igual(lista.length, 10, 'guarda: vuelven las diez');
  const orden = r => (r.opiniones || r.lista || r.items || []).map(x => String(x.texto || x)).join('|');
  const escrito = filas.map(f => f[3]).join('|');
  const vueltas = [orden(r0), orden(pedir()), orden(pedir())];
  PRUEBAS.cierto(vueltas.some(v => v !== escrito), '⚠️ al menos una vuelta NO viene en el orden en que se escribieron: se barajan');
});

PRUEBAS.caso('⚠️ una empresa no ve las opiniones de otra', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x2Env([['op_1','Helitec','2026-09','De Helitec'], ['op_2','Otra SA','2026-09','De la otra']]);
  const r = x2r(api.accionOpiniones({ usuario:'Helitec', pass:'clave-sup' }));
  PRUEBAS.igual(r.total, 1, '⚠️ sólo la suya');
  PRUEBAS.igual(r.opiniones[0].texto, 'De Helitec', 'y es la correcta');
});

PRUEBAS.caso('⚠️ R15 · la hoja se fuerza a TEXTO en cada acceso', () => {
  /* `Mes` es "2026-09" y Sheets lo convierte solo en una fecha si se lo deja. Y un texto que empiece
     con "=" o "+" lo interpretaría como fórmula. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `formatoTextoUnaVez_(` cerca de `obtenerHojaOpiniones`. Ahora se guarda
     una opinión sobre una hoja YA EXISTENTE (la rama que en producción corre siempre: la hoja
     nunca se crea dos veces) y se mira el registro de formatos del emulador: la columna Mes tiene
     que haber quedado como texto. P168: una escritura por hoja y por ejecución. */
  const api = x2Env([]);
  const hoja = () => api.filas && api.filas() ? api : null;
  const r = x2r(api.accionOpinionGuardar({ id:'op-fmt', empresa:'Helitec', mes:'2026-09', texto:'=1+1 no es una fórmula' }));
  PRUEBAS.cierto(!!r.ok, 'guarda: se guardó (' + (r.error || 'ok') + ')');
  const sh = api.__env ? api.__env.__libro.getSheetByName('Opiniones') : null;
  const formatos = sh ? sh._formatos : null;
  PRUEBAS.cierto(!!formatos, 'guarda: el emulador registra formatos');
  const arrobas = Object.keys(formatos || {}).filter(k => formatos[k] === '@');
  PRUEBAS.alMenos(arrobas.length, 4, '⚠️ la hoja se forzó a TEXTO (celdas con "@": ' + arrobas.length + ') — es el defecto que ya rompió los teléfonos con "+" y las fechas');
  const colMes = 3;
  PRUEBAS.cierto(arrobas.some(k => Number(k.split(',')[1]) === colMes), 'y la columna Mes ("2026-09", que Sheets convertiría en fecha) está entre ellas');
  const fila = (api.filas() || [])[1] || [];
  PRUEBAS.igual(String(fila[3]), '=1+1 no es una fórmula', 'y el texto que empieza con "=" quedó como texto, no como fórmula');
});
