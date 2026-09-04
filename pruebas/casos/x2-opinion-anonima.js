
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
  PRUEBAS.cierto(/empEncolar\(/.test(String(opinionEnviar)),
    '⚠️ tiene que encolarse, no hacer un fetch directo que se pierda sin señal');
  PRUEBAS.falso(/dispositivoId/.test(String(empFlush)),
    '⚠️ y la cola no puede agregar el identificador del dispositivo al mandar');
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
  return api;
}
const x2r = resp => JSON.parse(resp.getContent());

PRUEBAS.caso('⚠️ la hoja tiene CUATRO columnas y ninguna identifica', () => {
  /* Si mañana alguien agrega `Persona` o `Fecha` acá, todo lo demás pasa a ser decorativo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const m = /var OPI_HEAD\s*=\s*\[([^\]]+)\]/.exec(CTX.gs);
  PRUEBAS.cierto(!!m, 'guarda: tiene que existir la cabecera de la hoja en el .gs');
  if (!m) return;
  const cols = m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, ''));
  PRUEBAS.igual(cols, ['IdOpinion','Empresa','Mes','Texto'],
    '⚠️ estas cuatro y ninguna más — leyó: ' + cols.join(', '));
  ['Persona','Nombre','Cedula','Departamento','Cargo','Fecha','Hora','Dispositivo'].forEach(mala =>
    PRUEBAS.falso(cols.indexOf(mala) >= 0, '⚠️ no puede existir la columna ' + mala));
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
  const i = CTX.gs.indexOf('function accionOpiniones');
  PRUEBAS.alMenos(i, 0, 'guarda: tiene que existir la función');
  if (i < 0) return;
  const cuerpo = CTX.gs.slice(i, i + 1400);
  PRUEBAS.cierto(/Math\.random\(\)/.test(cuerpo),
    '⚠️ tiene que barajarlas antes de devolverlas');
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
  const i = CTX.gs.indexOf('function obtenerHojaOpiniones');
  PRUEBAS.alMenos(i, 0, 'guarda: tiene que existir');
  if (i < 0) return;
  PRUEBAS.cierto(/setNumberFormat\("@"\)/.test(CTX.gs.slice(i, i + 900)),
    '⚠️ falta el formato texto — es el defecto que ya rompió los teléfonos con "+" y las fechas');
});
