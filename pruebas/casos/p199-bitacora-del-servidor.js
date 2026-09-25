PRUEBAS.grupo('P199 · la bitácora del servidor llega a Dirección: `bitPull()` tenía cero llamadores');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL ÚNICO «ROMPE» DE A8 QUE QUEDABA. `bitPull()` existía desde hacía meses y NO TENÍA LLAMADORES
   —lo decía su propio comentario y lo confirmaba `alcanzabilidad.py`, que lo tenía en su lista de
   funciones muertas—, así que «Trazabilidad», «Intervenciones preventivas» y «Estimación de
   retorno» se alimentaban 100 % de `localStorage`: Dirección entraba desde SU teléfono y veía 0
   intervenciones y $0 de ahorro con la hoja `Bitácora` del CH llena. Y las acciones que escribe el
   SERVIDOR —cerrar un ciclo, la jornada, las credenciales, la nómina, y las ausencias de P200— no
   podían aparecer nunca, porque sólo existen allá.

   Es el patrón de A4: el dato viaja y del otro lado nadie lo recibe. Por eso estos casos entran por
   el camino real —`onDashData` y el pull— y no escribiendo `bitStore()` a mano, que es justo el
   atajo que dejó pasar el defecto: la suite estaba en verde y ningún caso tocaba `bitacoraDe()` con
   datos de servidor.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P199_HOY = new Date().toISOString().substring(0, 10);

/* Un evento tal como llega a DIRECCIÓN, o sea ya pasado por `bitacoraParaHseq_`: sin `actor`, sin
   `detalle` y sin `umbral`. Estubear la respuesta con el evento COMPLETO haría que la pantalla
   pintara cosas que en producción no puede pintar — es el atajo que R17 prohíbe, y me hizo escribir
   un aserto sobre la línea del umbral que el servidor real no manda. */
function p199EvHseq(id, accion, sujeto){
  return { id:id, ts: Date.now(), accion:accion, sujeto:sujeto, rol:'supervisor', origen:'app', app:'6.82' };
}
function p199Ev(id, accion, sujeto, extra){
  return Object.assign({ id:id, ts: Date.now(), empresa:'Helitec', actor:'rafael', rol:'supervisor',
    accion:accion, sujeto:sujeto, detalle:{ persona: sujeto, nota:'texto que no puede viajar' },
    origen:'app', umbral:{ nivel:5, amarillo:1, rojo:2 }, app:'6.80' }, extra || {});
}
function p199Hojas(eventos){
  return {
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['helitec', 'sup-199', 'empresa', 'Helitec', 'med-199', 'dir-199']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo','UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON']]
      .concat((eventos || []).map(e => [P199_HOY, 'Helitec', e.accion, e.sujeto, e.actor, e.rol, e.origen, '', '', '', e.app, e.id, JSON.stringify(e)])),
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo','Sexo','Edad','Telefono','Email','EsPiloto','IdPiloto','Rol','Nivel']],
    'Config Empresa': [['Empresa','Clave','Valor']]
  };
}

/* ── El contrato del servidor ────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P199 · Dirección recibe la bitácora SIN el actor, el detalle ni el umbral', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido (python pruebas/servir-gs.py)'); return; }
  const evs = [p199Ev('b1', 'restriccion_tarea', 'Ana Suárez'), p199Ev('b2', 'ciclo_cerrado', 'Beto Pérez')];
  const env = GS.crearEntorno(p199Hojas(evs));
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacora']);
  const r = JSON.parse(api.accionBitacora({ usuario:'helitec', pass:'dir-199', empresa:'Helitec', dispositivoId:'p199' }).getContent());
  PRUEBAS.igual(r.ok, true, 'guarda: la acción responde');
  PRUEBAS.igual((r.eventos || []).length, 2, 'guarda: llegan los dos eventos · con cero, lo de abajo no probaría nada');

  const e = r.eventos[0];
  /* ⚠️ EL UMBRAL SE INTENTÓ AGREGAR Y SE REVIRTIÓ, y este aserto es el trinquete de esa decisión.
     `hlp_trazabilidad` promete que «cada línea guarda además con qué umbral se juzgó a esa persona en
     ese momento», así que agregarlo parecía obvio. El verificador demostró que REIDENTIFICA:
     `accionNivelesRiesgo` le manda a Dirección la tabla de niveles SIN recortar y esa tabla asigna
     nivel POR NOMBRE, así que un `filter` de un renglón cruza `P1 → nivel 5 → «Ana Suárez»` y con eso
     su historial clínico. Mientras `niveles_riesgo` llegue nominal a `hseq`, el umbral NO puede ir. */
  PRUEBAS.igual(e.umbral, undefined,
    '⚠️ el umbral NO viaja · cruzado con `niveles_riesgo`, que Dirección recibe en la misma sesión y trae `persona` con el nombre real, reidentifica el P-id y expone su historial clínico');
  PRUEBAS.igual(e.actor, undefined,
    '⚠️ y el ACTOR no · es el usuario de la cuenta y puede ser el nombre de una persona; el `rol` ya alcanza para leer la línea');
  PRUEBAS.igual(e.detalle, undefined, '⚠️ ni el detalle, que lleva nombre y texto libre');
  PRUEBAS.cierto(/^P\d+$/.test(String(e.sujeto)), 'y el sujeto va opaco · ' + e.sujeto);
  PRUEBAS.igual(e.rol, 'supervisor', 'con el rol, que es lo que Dirección necesita');
});

PRUEBAS.caso('🔴 P199 · DISCRIMINADOR · el supervisor sigue recibiendo la bitácora completa', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs'); return; }
  const env = GS.crearEntorno(p199Hojas([p199Ev('b1', 'restriccion_tarea', 'Ana Suárez')]));
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacora']);
  const r = JSON.parse(api.accionBitacora({ usuario:'helitec', pass:'sup-199', empresa:'Helitec', dispositivoId:'p199' }).getContent());
  const e = (r.eventos || [])[0];
  PRUEBAS.igual(e && e.sujeto, 'Ana Suárez',
    '🔴 con nombre · si el recorte se aplicara a todos, el caso de arriba pasaría porque se tapa todo, no porque se recorte por rol');
  PRUEBAS.igual(e && e.actor, 'rafael', 'y con actor');
  PRUEBAS.cierto(!!(e && e.detalle), 'y con detalle');
});

/* ── El camino real del cliente ──────────────────────────────────────────────────────────────── */

function p199Payload(vista){
  return { ok:true, rol:'supervisor', vista:vista, referencia:{}, metricas:['kss'],
           registros:[], comentarios:[], pvt:[], aptitud:[], turnos:[], ausencias:{},
           duty:null, operacional:[], operacionalPeriodo:null, config:{ sector:'aviacion' } };
}

PRUEBAS.caso('🔴 P199 · entrar como Dirección PIDE la bitácora del servidor, y como supervisor no', () => {
  const prevDash = DASH, prevPost = window.gestPost;
  const pedidos = [];
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    window.gestPost = (body) => {
      pedidos.push(body && body.action);
      return Promise.resolve({ ok:true, eventos: [p199EvHseq('s1', 'restriccion_tarea', 'P1')] });
    };
    /* Por el camino real: `onDashData` es lo que corre cuando el panel recibe su payload. */
    onDashData(p199Payload('hseq'), 'Helitec', { usuario:'helitec', pass:'dir-199' }, 'hseq');
    return new Promise(r => setTimeout(r, 30)).then(() => {
      PRUEBAS.cierto(pedidos.indexOf('bitacora') >= 0,
        '🔴 se pidió `action:bitacora` · `bitPull()` tenía CERO llamadores, así que las tres pantallas de Dirección se alimentaban sólo del localStorage de ese teléfono');
      pedidos.length = 0;
      CTX.resetear();
      onDashData(p199Payload('supervisor'), 'Helitec', { usuario:'helitec', pass:'sup-199' }, 'supervisor');
      return new Promise(r => setTimeout(r, 30));
    }).then(() => {
      PRUEBAS.igual(pedidos.indexOf('bitacora'), -1,
        'DISCRIMINADOR · como supervisor NO se pide · sus fichas leen `bitacoraDe(persona)`, que es otra pregunta y otro recorte, y ampliarlo sin medir esas pantallas sería cambiar lo que ven sin haberlo mirado');
    });
  } finally { window.gestPost = prevPost; try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 P199 · lo que BAJA del servidor no entra en la cola de subida', () => {
  const prevDash = DASH, prevPost = window.gestPost;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    /* ⚠️ R17 · POR `onDashData`, NO CON `DASH` A MANO. La primera versión armaba el objeto y
       `bitPull` salía por `gestCanSync()`, que exige `DASH.params.pass`: el caso daba rojo por el
       arnés, no por el código. Es el atajo que este proyecto ya se comió tres veces. */
    window.gestPost = () => Promise.resolve({ ok:true, eventos: [p199EvHseq('s1','restriccion_tarea','P1'), p199EvHseq('s2','ciclo_cerrado','P2')] });
    onDashData(p199Payload('hseq'), 'Helitec', { usuario:'helitec', pass:'dir-199' }, 'hseq');
    return bitPull().then(ok => {
      PRUEBAS.igual(ok, true, 'guarda: la bajada salió bien');
      PRUEBAS.igual(bitacoraDe().length, 2, 'guarda: los dos eventos quedaron disponibles para las pantallas');
      PRUEBAS.igual(bitacoraPendientes(), 0,
        '🔴 la cola de subida sigue vacía · `K_BITACORA` es caché Y cola a la vez: si lo bajado entrara en `s.up`, el cliente le reenviaría al servidor lo que el servidor acaba de darle, y con `bitacora_guardar` escribiendo append-only (R3) cada carga del panel dejaría filas nuevas');
    });
  } finally { window.gestPost = prevPost; try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

/* ── Las tres pantallas ──────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P199 · si la bajada falla, las tres pantallas lo dicen en vez de afirmar cero', () => {
  const prevDash = DASH;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    DASH = { vista:'hseq', params:{ usuario:'helitec' }, f:{ emp:'Helitec' }, scope:'Helitec',
             registros:[], _cfg:{}, _bitPedida:true, _bitError:true };
    const aud = renderHseqAuditoria(), inter = renderHseqIntervenciones(), cos = renderHseqCostos([]);
    [['Trazabilidad', aud], ['Intervenciones', inter]].forEach(([q, html]) => {
      PRUEBAS.cierto(html.indexOf(esc(t('dw_bitacora_error'))) >= 0,
        '🔴 ' + q + ' avisa que no se pudo leer · antes decía «no hay acciones registradas» y «0 intervenciones», que son afirmaciones sobre algo que nunca se preguntó');
    });
    PRUEBAS.cierto(cos.indexOf(esc(t('dw_bitacora_error'))) >= 0 || cos.indexOf(esc(t('db_pend_config'))) >= 0,
      '🔴 y «Estimación de retorno» no muestra $0 · la cuenta de intervenciones es el numerador de todo lo que sigue');

    /* Mientras viaja tampoco se afirma nada. */
    DASH._bitError = false;
    PRUEBAS.cierto(renderHseqAuditoria().indexOf(esc(t('tz_cargando'))) >= 0,
      '⚠️ y mientras la respuesta viaja se muestra el cargador, no el estado vacío');
  } finally { try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 P199 · DISCRIMINADOR · con la bitácora del servidor bajada, las intervenciones se cuentan', () => {
  const prevDash = DASH, prevPost = window.gestPost;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    window.gestPost = () => Promise.resolve({ ok:true, eventos: [
      p199EvHseq('s1','restriccion_tarea','P1'), p199EvHseq('s2','restriccion_tarea','P2'), p199EvHseq('s3','determinacion_medica','P1')] });
    onDashData(p199Payload('hseq'), 'Helitec', { usuario:'helitec', pass:'dir-199' }, 'hseq');
    return bitPull().then(() => {
      DASH._bitBajada = true; DASH._bitPedida = true;
      const inter = renderHseqIntervenciones();
      PRUEBAS.cierto(inter.indexOf(esc(t('dw_bitacora_error'))) < 0, 'guarda: ya no muestra el aviso de error');
      PRUEBAS.cierto(/hs-pct-big">3</.test(inter),
        '🔴 cuenta las TRES intervenciones que escribió el servidor · es lo que Dirección veía en cero con la hoja del CH llena');
      const aud = renderHseqAuditoria();
      PRUEBAS.cierto(aud.indexOf('hs-ev') >= 0, 'y Trazabilidad las lista');
      PRUEBAS.igual(aud.indexOf(esc(t('tz_umbral', { n:5, a:1, r:2 }))), -1,
        '⚠️ y SIN la línea del umbral · la pantalla la pinta sólo si el evento lo trae, y para Dirección no viene (ver arriba). `hlp_trazabilidad` promete algo que esta vista no puede cumplir sin reidentificar: queda anotado como deuda, no como arreglo a medias');
    });
  } finally { window.gestPost = prevPost; try { DASH = prevDash; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('⚠️ P199 · `bitPull` salió de la lista de funciones muertas del verificador', () => {
  return fetch('/pruebas/alcanzabilidad.py?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.igual((src.match(/"bitPull"/g) || []).length, 0,
      '⚠️ ya no está excusada · si mañana alguien le saca el llamador, `alcanzabilidad.py` lo marca en vez de justificarlo — que es lo que pasó durante meses');
  }).catch(() => {
    PRUEBAS.cierto(true, 'el servidor de pruebas no expone el .py: se verifica a mano con `python3 pruebas/alcanzabilidad.py`');
  });
});
