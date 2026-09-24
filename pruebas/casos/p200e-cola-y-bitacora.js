PRUEBAS.grupo('P200e · lote 4 de A8: la cola que decía «Enviando» sin enviar, la ausencia sin rastro y el aviso que no se apagaba');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS SEIS HALLAZGOS DE BITÁCORA, COLA Y AVISOS (P091 · A8). Cinco son la misma familia: una
   PROMESA ESCRITA que el mecanismo no cumple.

   #10 · Trazabilidad promete «cada línea guarda con qué umbral se juzgó a esa persona» y el cambio
         de jornada de UNA persona salía sin sujeto y sin umbral, como «Del sistema».
   #11 · el cartel dice «Enviando N registros» con nadie enviando —la bitácora era la única de las
         cinco colas sin reintento— y «cerrar sesión» ofrece «intentar enviarlos primero» y la borra.
   #12 · R3 dice que toda acción con consecuencia queda anotada; marcar a alguien ausente no dejaba
         ninguna línea, y volver a marcar el mismo día borraba quién la había anulado.
   #13 · la pantalla da por hecha una ausencia que una recarga por versión nueva puede abortar.
   #14 · un registro retenido de ayer se borraba porque otro con la misma URL salió hoy.
   #15 · «Tu ciclo se detuvo» se repetía 72 h aunque la persona ya hubiera seguido marcando.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── #10 · el sujeto y el umbral ─────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P200e · cambiar la jornada de una persona deja la línea CON sujeto y con umbral', () => {
  const prevDash = DASH;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    /* Por el camino real: `bitacoraRegistrar` es lo que llama el guardado del plan por persona, y
       el umbral lo resuelve ella sola a partir del sujeto. */
    DASH = { vista:'supervisor', params:{ usuario:'helitec' }, f:{ emp:'Helitec' }, scope:'Helitec',
             registros:[{ persona:'Ana Suárez', departamento:'Operaciones', cargo:'Piloto', empresa:'Helitec' }],
             _niveles:null };
    const ev = bitacoraRegistrar('ciclo_persona_guardado', 'Ana Suárez',
      { persona:'Ana Suárez', empresa:'Helitec', plan:{ jornada:600 } });
    PRUEBAS.cierto(!!ev, 'guarda: el evento se creó');
    PRUEBAS.igual(ev.sujeto, 'Ana Suárez',
      '🔴 el sujeto es la persona · con `\'\'` Trazabilidad decía «Del sistema» y el CSV de auditoría exportaba Sujeto vacío');
    PRUEBAS.cierto(ev.umbral !== null,
      'y el umbral viaja · `bitUmbralDe(sujeto)` no puede resolver sin sujeto, así que faltaba la línea que `hlp_trazabilidad` promete');

    /* El blindaje: aunque el llamador pase `''`, si el detalle declara una persona esa es el sujeto. */
    const ev2 = bitacoraRegistrar('ciclo_persona_quitado', '', { persona:'Ana Suárez', empresa:'Helitec' });
    PRUEBAS.igual(ev2 && ev2.sujeto, 'Ana Suárez',
      '⚠️ y un llamador que pase sujeto vacío con `detalle.persona` queda cubierto igual · se cierra para los futuros, no sólo para el que lo tenía');
    PRUEBAS.cierto(ev2 && ev2.umbral !== null, 'con su umbral');
  } finally { try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('⚠️ P200e · las dos acciones nuevas del servidor tienen etiqueta legible', () => {
  ['ausencia_marcada', 'ausencia_anulada'].forEach(a => {
    PRUEBAS.cierto(!!HSEQ_ACCION_LABEL[a], '⚠️ «' + a + '» tiene clave · sin esto Trazabilidad y el CSV la muestran cruda');
    PRUEBAS.cierto(accionLabel(a) !== a, 'y resuelve a texto · «' + accionLabel(a) + '»');
    ['es','en'].forEach(l => PRUEBAS.cierto(_i18nBuscar(l, sectorActual(), HSEQ_ACCION_LABEL[a]) != null, 'en ' + l));
  });
});

/* ── #11 · la cola de la bitácora ────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P200e · la cola de la bitácora se reintenta sola: `online` y temporizador, como las otras cuatro', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* Sin comentarios: el que explica el defecto nombra las dos cosas. */
    const codigo = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/[^\n]*/gm, ' ');
    PRUEBAS.cierto(/addEventListener\('online',\s*function\(\)\{\s*bitScheduleSync\(\)/.test(codigo),
      '🔴 reintenta al recuperar la señal · era la ÚNICA de las cinco colas sin `online`');
    PRUEBAS.cierto(/setInterval\(function\(\)\{\s*bitPush\(\);\s*\},\s*60000\)/.test(codigo),
      'y cada 60 s, como `empFlush` · el único llamador de `bitPush` era el momento de escribir el evento');
    PRUEBAS.cierto(/flushPending\(true\); empFlush\(true\); gestPush\(true\); bitPush\(true\); casosOdooPush\(true\);/.test(codigo),
      '🔴 y «cerrar sesión» manda las CINCO colas · mandaba tres, y `cerrarSesion()` borra `K_BITACORA` y `K_CASOS_ODOO` un instante después: lo que no salía ahí no salía nunca');
  });
});

PRUEBAS.caso('🔴 P200e · y las cinco salen con `keepalive`: sin él el navegador las aborta en la recarga', () => {
  /* ⚠️ MEDIR QUE SALGA, NO QUE SE LLAME. El caso de arriba comprueba la línea del flush y quedaba
     verde aunque tres de las cinco mandaran sin `keepalive` — o sea aunque la promesa de «intentar
     enviarlos primero» siguiera sin cumplirse para ellas. Lo encontró el verificador. */
  const prevDash = DASH, prevFetch = window.fetchConReloj;
  const vistos = [];
  try {
    CTX.resetear();
    localStorage.clear();
    window.fetchConReloj = (u, o) => { vistos.push(!!(o && o.keepalive)); return Promise.resolve({ ok:true, json: () => Promise.resolve({ ok:true }) }); };
    DASH = { vista:'supervisor', params:{ usuario:'helitec', pass:'x' }, f:{ emp:'Helitec' }, scope:'Helitec', registros:[] };
    bitacoraRegistrar('nota_clinica', 'Ana Suárez', { chars: 5 });
    const antes = vistos.length;
    return Promise.resolve(bitPush(true)).then(() => {
      PRUEBAS.alMenos(vistos.length, antes + 1, 'guarda: la bitácora mandó algo · con cero, lo de abajo no probaría nada');
      PRUEBAS.igual(vistos.slice(antes).filter(x => !x), [],
        '🔴 todo lo que sale en el flush de salida lleva `keepalive` · `cerrarSesion()` hace `location.reload()` sincrónico y borra las colas: sin él el POST se aborta y ya no hay a qué volver');
    });
  } finally { window.fetchConReloj = prevFetch; try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 P200e · un evento que el servidor rechaza diez veces se marca TRABADO y el cartel lo dice', () => {
  const prevDash = DASH, prevPost = window.gestPost;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    DASH = { vista:'supervisor', params:{ usuario:'helitec', pass:'x' }, f:{ emp:'Helitec' }, scope:'Helitec', registros:[] };
    const ev = bitacoraRegistrar('nota_clinica', 'Ana Suárez', { chars: 5 });
    PRUEBAS.igual(bitacoraPendientes(), 1, 'guarda: el evento quedó en la cola');
    PRUEBAS.igual(bitTrabados().length, 0, 'guarda: todavía no está trabado');

    window.gestPost = () => Promise.resolve({ ok:false, error:'no' });   // el servidor rechaza
    let cadena = Promise.resolve();
    for (let i = 0; i < COLA_MAX_INTENTOS; i++) cadena = cadena.then(() => bitPush());
    return cadena.then(() => {
      PRUEBAS.igual(bitTrabados().length, 1,
        '🔴 a los ' + COLA_MAX_INTENTOS + ' intentos queda TRABADO · antes no existía la noción: el cartel decía «Enviando 1 registro» para siempre, sin ofrecer «intentar otra vez»');
      PRUEBAS.igual(bitacoraPendientes(), 1, 'y sigue pendiente: trabado no es borrado (R3)');
      /* El cartel: `offPintar` ahora cuenta estos trabados. */
      offPintar();
      const bar = document.getElementById('offBar');
      PRUEBAS.cierto(bar && bar.className.indexOf('off-bar-trabada') >= 0,
        '🔴 el cartel pasa a «no se pudo enviar» · ' + (bar ? bar.className : 'sin barra'));
      PRUEBAS.cierto(bar && typeof bar.onclick === 'function', 'y se puede tocar para reintentar');
      /* Y un trabado no se reintenta solo, si no el cartel mentiría de nuevo. */
      let mandados = 0;
      window.gestPost = () => { mandados++; return Promise.resolve({ ok:true }); };
      return bitPush().then(() => {
        PRUEBAS.igual(mandados, 0, 'DISCRIMINADOR · un trabado NO se reintenta solo');
        return bitPush(true).then(() => {
          PRUEBAS.alMenos(mandados, 1, '🔴 pero al SALIR sí se manda: es el último intento antes de que `cerrarSesion` borre la cola');
          PRUEBAS.igual(bitacoraPendientes(), 0, 'y salió');
        });
      });
    }).finally(() => { window.gestPost = prevPost; try { DASH = prevDash; localStorage.clear(); } catch(e){} });
  } catch(e){ window.gestPost = prevPost; DASH = prevDash; throw e; }
});

PRUEBAS.caso('⚠️ P200e · tocar el cartel destraba también la bitácora', () => {
  const prevDash = DASH, prevPost = window.gestPost;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    DASH = { vista:'supervisor', params:{ usuario:'helitec', pass:'x' }, f:{ emp:'Helitec' }, scope:'Helitec', registros:[] };
    bitacoraRegistrar('nota_clinica', 'Ana Suárez', { chars: 5 });
    window.gestPost = () => Promise.resolve({ ok:false });
    let cadena = Promise.resolve();
    for (let i = 0; i < COLA_MAX_INTENTOS; i++) cadena = cadena.then(() => bitPush());
    return cadena.then(() => {
      PRUEBAS.igual(bitTrabados().length, 1, 'guarda: trabado');
      window.gestPost = () => Promise.resolve({ ok:true });
      colaReintentar();
      PRUEBAS.igual(bitTrabados().length, 0,
        '⚠️ destrabado · el cartel es UNO solo y ahora cuenta sus trabados: si tocarlo no los rescatara, quedarían con el cartel ya apagado y nadie volvería a mirarlos');
    }).finally(() => { window.gestPost = prevPost; try { DASH = prevDash; localStorage.clear(); } catch(e){} });
  } catch(e){ window.gestPost = prevPost; DASH = prevDash; throw e; }
});

/* ── #13 · los envíos en vuelo que frenan la recarga ─────────────────────────────────────────── */

PRUEBAS.caso('🔴 P200e · una ausencia viajando cuenta como envío en vuelo y frena la recarga por versión nueva', () => {
  const prevDash = DASH;
  try {
    DASH = {};
    PRUEBAS.igual(enviosEnVuelo(), 0, 'guarda: sin nada viajando, cero');
    DASH = { _ausEnVuelo: { 'aus_123_2026-09-24': 1 } };
    PRUEBAS.igual(enviosEnVuelo(), 1,
      '🔴 la ausencia cuenta · antes daba 0: el supervisor tocaba «Marcar ausente», el toast decía «X no se cuenta hoy» y la recarga por versión nueva abortaba el POST en los 0,5–3 s siguientes. No hay cola: no quedaba nada en disco y la pantalla ya lo había dado por hecho');
    DASH = {};
    _bitEnVuelo['b1'] = 1;
    PRUEBAS.igual(enviosEnVuelo(), 1, '🔴 y la bitácora también · `_bitEnVuelo` existía desde antes y tampoco se contaba');
    delete _bitEnVuelo['b1'];
    PRUEBAS.igual(enviosEnVuelo(), 0, 'DISCRIMINADOR · y vuelve a cero al soltarlo');
  } finally { try { DASH = prevDash; } catch(e){} }
});

/* ── #14 · el retenido de ayer y el envío de hoy ─────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P200e · el registro retenido de ayer NO se borra porque el de hoy, con la misma URL, salió bien', () => {
  try {
    localStorage.clear();
    /* La URL del webhook viejo de Operacional no lleva fecha ni hora: es idéntica el lunes y el
       martes. Es el dato que lo hace posible, y está confirmado por el propio proyecto — el
       `redCortada` de la suite lista tres veces el mismo string. */
    const U = 'https://ejemplo/exec?nombre=Persona&empresa=Emp&campo=salida_casa';
    const AYER = Date.now() - 86400000;
    /* ⚠️ `trabado: false`, Y ESO ES EL CASO. La primera versión de este caso lo sembraba TRABADO y
       quedaba verde con el defecto adentro: el arreglo de entonces protegía sólo a los trabados, y
       un item llega a trabado recién con diez fallos —una vuelta por minuto, sólo con la app en
       primer plano—. El estado NORMAL de un item joven es `intentos: 1..3`, que era justo el que
       seguía perdiéndose. Lo encontró el verificador. */
    const idAyer = colaIdDe(U, AYER);
    setPending([{ id: idAyer, url:U, ts: AYER, intentos: 3, motivo:'sin señal' }]);
    PRUEBAS.igual(colaTrabados().length, 0, 'guarda: el del lunes NO está trabado, que es el caso común');

    colaConfirmar(colaIdDe(U));     // el envío de HOY confirma: mismo url, otro día
    PRUEBAS.igual(getPending().length, 1,
      '🔴 el del lunes sigue ahí · antes `colaConfirmar(url)` borraba todos los items con esa URL, el cartel desaparecía y la persona quedaba con la impresión de que salió todo (R7: nunca un «se perdió»)');
    PRUEBAS.cierto(colaIdDe(U) !== idAyer,
      'DISCRIMINADOR · y los dos ids son distintos porque el id lleva el DÍA · si fueran iguales, el de arriba pasaría por casualidad');

    colaConfirmar(idAyer);          // ahora sí, el suyo
    PRUEBAS.igual(getPending().length, 0, 'confirmado POR SU ID, sale');
  } finally { try { localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('⚠️ P200e · los items que ya estaban en el teléfono reciben id sin perderse', () => {
  try {
    localStorage.clear();
    /* Escrito como lo escribía la versión anterior: sin `id`. */
    localStorage.setItem(K_PENDING, JSON.stringify([{ url:'https://ejemplo/a', ts: Date.now(), intentos: 2 }]));
    const q = getPending();
    PRUEBAS.igual(q.length, 1, '⚠️ el item viejo sigue ahí · R7: una migración no puede descartar lo que la persona escribió');
    PRUEBAS.cierto(!!q[0].id, 'y ya tiene id · ' + q[0].id);
    PRUEBAS.igual(q[0].intentos, 2, 'conservando sus intentos');
    PRUEBAS.igual(getPending()[0].id, q[0].id,
      'DISCRIMINADOR · y el id NO cambia entre lecturas · si se asignara en memoria, `colaConfirmar` buscaría uno que `colaGuardar` nunca vio');
  } finally { try { localStorage.clear(); } catch(e){} }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE PASA DEL LADO DEL SERVIDOR (#12 y #15) · contra el `.gs` REAL en el emulador
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P200E_HOY = new Date().toISOString().substring(0, 10);

function p200eHojas(extra){
  return Object.assign({
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['helitec', 'sup-200e', 'empresa', 'Helitec', 'med-200e', 'dir-200e']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo','Sexo','Edad','Telefono','Email','EsPiloto','IdPiloto','Rol','Nivel'],
               ['Helitec', 'Ana Suárez', 'V-11111111', 'Operaciones', 'Piloto', 'F', '35', '', '', 'Sí', '', 'empleado', '3']],
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado','Marcada','MarcadaPor','Anulada','AnuladaPor']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo','UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan']],
    'Respuestas de formulario 1': [new Array(90).fill('b'), new Array(90).fill('p')]
  }, extra || {});
}
function p200eBita(env){
  const sh = env.__libro.getSheetByName('Bitácora');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function p200eAus(env){
  const sh = env.__libro.getSheetByName('Ausencias');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

PRUEBAS.caso('🔴 P200e · marcar y anular una ausencia dejan su línea en la bitácora (R3)', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const env = GS.crearEntorno(p200eHojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionAusenciaGuardar']);
  const base = { usuario:'helitec', pass:'sup-200e', empresa:'Helitec', dispositivoId:'p200e',
                 id:'aus_11111111_' + P200E_HOY, cedula:'V-11111111', persona:'Ana Suárez',
                 desde:P200E_HOY, hasta:P200E_HOY, motivo:'franco' };

  const r1 = JSON.parse(api.accionAusenciaGuardar(Object.assign({}, base, { quien:'Marta Supervisora' })).getContent());
  PRUEBAS.igual(r1.ok, true, 'guarda: se marcó');
  let b = p200eBita(env);
  PRUEBAS.igual(b.length, 1,
    '🔴 marcar deja UNA línea · antes dejaba cero, y marcar a alguien ausente lo saca del denominador de la cobertura de ese día: la app promete en Documentación que «cada acción con consecuencia queda anotada: quién, cuándo, sobre quién»');
  PRUEBAS.igual(String(b[0][2]), 'ausencia_marcada', 'con su acción');
  PRUEBAS.igual(String(b[0][3]), 'Ana Suárez', 'y su sujeto · sin sujeto, Trazabilidad la muestra como «Del sistema»');
  PRUEBAS.igual(String(b[0][4]), 'Marta Supervisora', 'y quién la tomó');

  const r2 = JSON.parse(api.accionAusenciaGuardar(Object.assign({}, base, { anular:'1', quien:'Pedro Supervisor' })).getContent());
  PRUEBAS.igual(r2.anulada, true, 'guarda: se anuló');
  b = p200eBita(env);
  PRUEBAS.igual(b.length, 2, '🔴 y anular deja la suya · «quién la volvió a poner» es la otra mitad de la pregunta que R3 existe para contestar');
  PRUEBAS.igual(String(b[1][2]), 'ausencia_anulada', 'con su acción');
  PRUEBAS.igual(String(b[1][4]), 'Pedro Supervisor', 'y con QUIÉN anuló, que no es quien marcó');
});

PRUEBAS.caso('🔴 P200e · volver a marcar el mismo día no borra quién la había anulado', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const env = GS.crearEntorno(p200eHojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionAusenciaGuardar']);
  const base = { usuario:'helitec', pass:'sup-200e', empresa:'Helitec', dispositivoId:'p200e',
                 id:'aus_11111111_' + P200E_HOY, cedula:'V-11111111', persona:'Ana Suárez',
                 desde:P200E_HOY, hasta:P200E_HOY, motivo:'franco' };
  api.accionAusenciaGuardar(Object.assign({}, base, { quien:'Marta Supervisora' }));
  api.accionAusenciaGuardar(Object.assign({}, base, { anular:'1', quien:'Pedro Supervisor' }));
  const anulada = p200eAus(env)[0];
  PRUEBAS.igual(String(anulada[11]), 'Pedro Supervisor', 'guarda: quedó anotado quién anuló');

  api.accionAusenciaGuardar(Object.assign({}, base, { quien:'Marta Supervisora' }));   // la vuelve a marcar
  const fila = p200eAus(env);
  PRUEBAS.igual(fila.length, 1, 'guarda: sigue siendo UNA fila (mismo id: `aus_<cedula>_<fecha>`)');
  PRUEBAS.igual(String(fila[0][7]), 'vigente', 'y vuelve a estar vigente');
  PRUEBAS.igual(String(fila[0][11]), 'Pedro Supervisor',
    '🔴 y NO se borró quién la anuló · `upsertPorId` reescribe la fila entera, así que el camino que P188/P189 abarató a propósito —sin confirmación, con «Deshacer» de 4 s— borraba el único rastro de la anulación');
  PRUEBAS.cierto(String(fila[0][10]) !== '', 'ni cuándo');
  PRUEBAS.igual(p200eBita(env).length, 3, 'y la bitácora tiene los tres hechos, en orden');
});

PRUEBAS.caso('🔴 P200e · «Tu ciclo se detuvo» deja de avisar cuando la persona siguió marcando', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const ayer = new Date(Date.now() - 20 * 3600000);
  const isoDet = ayer.toISOString();
  const isoPost = new Date(ayer.getTime() + 3600000).toISOString();
  const opFila = (iso, evento) => [iso.substring(0,10), iso.substring(11,16), iso, 'op_' + evento + '_' + iso,
                                   'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', evento, '', '', ''];
  const sus = [['Endpoint','Dispositivo','Empresa','Persona','Cedula','p256dh','auth','Idioma','Creada','UltimaOk','Fallos'],
               ['https://push/x', 'disp-200e', 'Helitec', 'Ana Suárez', 'V-11111111', 'k', 'a', 'es', '', '', 0]];

  /* A · detenido y nada después → avisa */
  let env = GS.crearEntorno(p200eHojas({ 'Suscripciones': sus,
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan'],
                    opFila(isoDet, 'detenido')] }));
  let r = JSON.parse(GS.cargarGs(CTX.gs, env, ['accionAvisos']).accionAvisos({ dispositivoId:'disp-200e' }).getContent());
  PRUEBAS.igual((r.avisos || []).filter(a => a.tipo === 'ciclo_detenido').length, 1,
    'guarda: con el ciclo detenido y nada después, avisa · si esto diera 0 el caso de abajo pasaría por la razón equivocada');

  /* B · el MISMO detenido, pero la persona siguió marcando → ya no avisa */
  env = GS.crearEntorno(p200eHojas({ 'Suscripciones': sus,
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan'],
                    opFila(isoDet, 'detenido'), opFila(isoPost, 'llegada_casa')] }));
  r = JSON.parse(GS.cargarGs(CTX.gs, env, ['accionAvisos']).accionAvisos({ dispositivoId:'disp-200e' }).getContent());
  PRUEBAS.igual((r.avisos || []).filter(a => a.tipo === 'ciclo_detenido').length, 0,
    '🔴 con un evento posterior NO avisa · antes avisaba igual hasta 72 h: al piloto se le detenía un ciclo el lunes y el martes, con el ciclo ya cerrado, cada push de una tarea nueva le traía de arriba «Tu ciclo se detuvo». El «visto» vive en el localStorage del teléfono y nunca sube, así que no había nada que lo apagara');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE ENCONTRÓ EL VERIFICADOR SOBRE ESTE MISMO LOTE

   Los dos críticos los introduje yo, y la raíz era una sola: elegí un id ALEATORIO para los items
   de la cola cuando el id tiene que derivarse del HECHO. Con `día + url`:
   · dos toques del mismo botón el mismo día vuelven a ser UN item (con el id aleatorio eran dos, y
     los ocho webhooks viejos van en `no-cors` sin id, así que el servidor no puede deduplicar:
     rehacer un test sin señal escribía DOS filas en la hoja clínica);
   · y el retenido de ayer no comparte clave con el envío de hoy, que era el defecto original.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200e · dos toques del mismo botón sin señal son UN item, no dos filas en la hoja clínica', () => {
  const prevFetch = window.fetchConReloj;
  try {
    localStorage.clear();
    const U = 'https://ejemplo/exec?nombre=Persona&empresa=Emp&campo=salida_casa';
    window.fetchConReloj = () => Promise.reject(new Error('sin señal'));
    return enviarConCola(U).then(() => enviarConCola(U)).then(() => {
      const q = getPending();
      PRUEBAS.igual(q.length, 1,
        '🔴 UN item · con un id aleatorio por envío eran dos, y al volver la señal salían dos POST al webhook: dos filas para un solo hecho, en hojas que no llevan id y no pueden deduplicar');
      PRUEBAS.igual(q[0].intentos, 2, 'y los intentos se acumulan sobre el mismo item · el tope de 10 vuelve a ser alcanzable');
      PRUEBAS.igual(q[0].id, colaIdDe(U), 'con el id derivado del hecho, no sorteado');
    });
  } finally { window.fetchConReloj = prevFetch; try { localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 P200e · dos envíos de la misma URL en vuelo a la vez no se pisan ni resetean los intentos', () => {
  const prevFetch = window.fetchConReloj;
  try {
    localStorage.clear();
    const U = 'https://ejemplo/exec?nombre=Persona&empresa=Emp&campo=salida_casa';
    /* El caso que el contador `n` de `_colaEnVuelo` habilita: el reintento de la cola y un toque
       nuevo viajando juntos. Antes, el que respondía primero borraba al otro EN VUELO, y el que
       fallaba después se re-insertaba con `intentos: 1` — así nunca llegaba a trabado, nunca lo
       contaba el cartel y nunca salía de ahí. */
    setPending([{ id: colaIdDe(U), url:U, ts: Date.now(), intentos: 4, motivo:'x' }]);
    let n = 0;
    window.fetchConReloj = () => { n++; return n === 1 ? new Promise(r => setTimeout(() => r({ ok:true, text: () => Promise.resolve('{"ok":true}') }), 30))
                                                       : Promise.reject(new Error('sin señal')); };
    const a = enviarConCola(U, false, false, colaIdDe(U));
    const b = enviarConCola(U);
    return Promise.all([a, b]).then(() => {
      const q = getPending();
      PRUEBAS.comoMucho(q.length, 1, 'guarda: no quedan dos items para el mismo hecho');
      if (q.length){
        PRUEBAS.alMenos(q[0].intentos, 5,
          '🔴 si quedó en la cola, sus intentos SIGUIERON subiendo · antes se reseteaban a 1 en cada colisión y el tope era inalcanzable');
      } else {
        PRUEBAS.cierto(true, 'salió: el envío que llegó confirmó el hecho, que es el mismo para los dos');
      }
    });
  } finally { window.fetchConReloj = prevFetch; try { localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 P200e · reenviar la MISMA ausencia no suma una línea más a la bitácora', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const env = GS.crearEntorno(p200eHojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionAusenciaGuardar']);
  const base = { usuario:'helitec', pass:'sup-200e', empresa:'Helitec', dispositivoId:'p200e',
                 id:'aus_11111111_' + P200E_HOY, cedula:'V-11111111', persona:'Ana Suárez',
                 desde:P200E_HOY, hasta:P200E_HOY, motivo:'franco', quien:'Marta Supervisora' };
  api.accionAusenciaGuardar(Object.assign({}, base));
  api.accionAusenciaGuardar(Object.assign({}, base));   // reenvío: el POST llegó y la respuesta se perdió
  api.accionAusenciaGuardar(Object.assign({}, base));
  PRUEBAS.igual(p200eAus(env).length, 1, 'guarda: una sola fila de ausencia');
  PRUEBAS.igual(p200eBita(env).length, 1,
    '🔴 UNA sola línea · `bitacoraServidor` arma su id en el servidor y hace append puro, así que no puede deduplicar sola: cada reenvío dejaba una línea más, para siempre, en el registro que R3 declara inalterable');
  /* Y cambiar algo de verdad SÍ registra: si no, el aserto de arriba se cumpliría no registrando nunca. */
  api.accionAusenciaGuardar(Object.assign({}, base, { motivo:'vacaciones' }));
  PRUEBAS.igual(p200eBita(env).length, 2, 'DISCRIMINADOR · un cambio real sí deja su línea');
});

PRUEBAS.caso('🔴 P200e · anular dos veces conserva a quien anuló primero y no duplica la línea', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const env = GS.crearEntorno(p200eHojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionAusenciaGuardar']);
  const base = { usuario:'helitec', pass:'sup-200e', empresa:'Helitec', dispositivoId:'p200e',
                 id:'aus_11111111_' + P200E_HOY, cedula:'V-11111111', persona:'Ana Suárez',
                 desde:P200E_HOY, hasta:P200E_HOY, motivo:'franco' };
  api.accionAusenciaGuardar(Object.assign({}, base, { quien:'Marta Supervisora' }));
  api.accionAusenciaGuardar(Object.assign({}, base, { anular:'1', quien:'Pedro Supervisor' }));
  const bitaAntes = p200eBita(env).length;
  api.accionAusenciaGuardar(Object.assign({}, base, { anular:'1', quien:'Luis Reenvio' }));
  PRUEBAS.igual(String(p200eAus(env)[0][11]), 'Pedro Supervisor',
    '🔴 quien anuló sigue siendo el primero · el arreglo de #12 cerró esto en la rama de marcar y lo dejó abierto acá: un reenvío sobrescribía `AnuladaPor` con quien reenvió');
  PRUEBAS.igual(p200eBita(env).length, bitaAntes, 'y no se sumó otra línea por el mismo hecho');
});

PRUEBAS.caso('🔴 P200e · ni una fila con hora futura ni una sin evento apagan el aviso del ciclo detenido', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const ayer = new Date(Date.now() - 10 * 3600000);
  const isoDet = ayer.toISOString();
  const opFila = (iso, evento) => [iso.substring(0,10), iso.substring(11,16), iso, 'op_' + evento + '_' + iso,
                                   'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', evento, '', '', ''];
  const sus = [['Endpoint','Dispositivo','Empresa','Persona','Cedula','p256dh','auth','Idioma','Creada','UltimaOk','Fallos'],
               ['https://push/x', 'disp-200e', 'Helitec', 'Ana Suárez', 'V-11111111', 'k', 'a', 'es', '', '', 0]];
  const CAB = ['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan'];
  const avisosCon = filas => {
    const env = GS.crearEntorno(p200eHojas({ 'Suscripciones': sus, 'Operacional': [CAB].concat(filas) }));
    const r = JSON.parse(GS.cargarGs(CTX.gs, env, ['accionAvisos']).accionAvisos({ dispositivoId:'disp-200e' }).getContent());
    return (r.avisos || []).filter(a => a.tipo === 'ciclo_detenido').length;
  };
  /* El ISO lo escribe el DISPOSITIVO: un celular con el reloj adelantado deja una fila en el futuro. */
  const futuro = new Date(Date.now() + 48 * 3600000).toISOString();
  PRUEBAS.igual(avisosCon([opFila(isoDet, 'detenido'), opFila(futuro, 'llegada_casa')]), 1,
    '🔴 una fila con ISO en el futuro no apaga el aviso · si no, a esa persona no le vuelve a llegar «tu ciclo se detuvo» hasta que el reloj real alcance esa fecha');
  PRUEBAS.igual(avisosCon([opFila(isoDet, 'detenido'), opFila(new Date(ayer.getTime() + 3600000).toISOString(), '')]), 1,
    '🔴 y una fila con `Evento` vacío tampoco · una fila sin evento no dice que el ciclo siguió');
  PRUEBAS.igual(avisosCon([opFila(isoDet, 'detenido'), opFila(new Date(ayer.getTime() + 3600000).toISOString(), 'llegada_casa')]), 0,
    'DISCRIMINADOR · y un evento REAL posterior sí lo apaga, que es para lo que se hizo el arreglo');
});
