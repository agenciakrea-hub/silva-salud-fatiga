
PRUEBAS.grupo('P106 · la demostración se pilotea sin volver a la portada');

/* ⚠️ POR QUÉ EXISTE ESTO. La demo es la herramienta de venta: es lo que se le muestra a un cliente
   antes de que firme. Y pasar de la vista de supervisor a la de médico DELANTE DE ESE CLIENTE
   costaba 4 toques, entre 3,5 y 12 segundos con la pantalla bloqueada, y un viaje de vuelta a la
   portada, perdiendo el contexto en el medio.
   No hacía falta nada de eso: `portalVerDemo` y `portalVerDemoEmpleado` mandan EXACTAMENTE el mismo
   pedido, y la vista de empleado se arma filtrando esa misma respuesta del lado del cliente. El
   payload que ya está en memoria alcanza para las cuatro vistas.
   Medido con el motor nuevo: de 2.800–12.000 ms a 11–28 ms, y de 1 pedido de red por cambio a 0. */

/* ⚠️ ESTE PAYLOAD SE ARMA A MANO, y hay que decirlo: un comentario anterior afirmaba que salía
   "del camino real del emulador" y era falso. Acá está bien que sea a mano —es un molde mínimo
   para ejercitar el recorte y el cambio de vista, no un contrato con el servidor—, pero el
   contrato de verdad lo cubre `a4-contrato-servidor-cliente.js`, que sí lee del `.gs`. */
function p106Payload(){
  const regs = [];
  ['Ana Suárez','Luis Ferrer','Marta Ruiz'].forEach((p, i) => {
    for (let k = 0; k < (3 - i); k++){
      regs.push({ persona: p, empresa: 'Empresa Demo', departamento: 'Operaciones',
                  fecha: '2026-09-0' + (k+1), kss: 4 + k });
    }
  });
  return { ok:true, demo:true, rol:'supervisor', registros: regs, metricas:['kss'],
           referencia:{ kss: 6 }, pvt: [], comentarios: null, operacional: [], turnos: [] };
}

PRUEBAS.caso('las tres piezas del motor existen', () => {
  PRUEBAS.cierto(typeof demoVerVista === 'function',        'demoVerVista()');
  PRUEBAS.cierto(typeof demoRecortarAPersona === 'function','demoRecortarAPersona()');
  PRUEBAS.cierto(typeof demoPersonaEjemplo === 'function',  'demoPersonaEjemplo()');
});

PRUEBAS.caso('⚠️ recortar a una persona NO toca el payload original', () => {
  /* ES EL CASO QUE SOSTIENE TODO. Si el recorte mutara `d`, pasar por la vista personal dejaría la
     demostración encerrada ahí: al volver a supervisor se vería la empresa entera con los datos de
     una sola persona, y nadie entendería por qué. */
  const d = p106Payload();
  const antes = d.registros.length;
  const uno = demoPersonaEjemplo(d);
  const propio = demoRecortarAPersona(d, uno);
  PRUEBAS.igual(d.registros.length, antes, '⚠️ el original queda intacto');
  PRUEBAS.comoMucho(propio.registros.length, antes - 1, 'y el recortado tiene menos');
  PRUEBAS.igual(propio.rol, 'empleado', 'el recortado entra como empleado');
  PRUEBAS.igual(propio.comentarios, null, 'sin comentarios: son de otra vista');
});

PRUEBAS.caso('demoPersonaEjemplo elige siempre a la misma', () => {
  /* Determinista a propósito: dos personas mirando la demo tienen que ver lo mismo. */
  const d = p106Payload();
  PRUEBAS.igual(demoPersonaEjemplo(d), 'Ana Suárez', 'la que más registros tiene');
  PRUEBAS.igual(demoPersonaEjemplo(d), demoPersonaEjemplo(d), 'y no cambia entre llamadas');
});

/* ⚠️ EL PORTAL ABIERTO ES PARTE DEL ESTADO REAL, Y OMITIRLO ESCONDIÓ DOS BUGS CRÍTICOS.
   `CTX.resetear()` le saca `.show` a todos los overlays, así que los casos corrían con el portal
   CERRADO — un estado que producción nunca tiene cuando se mira la demostración. Y justo ese
   detalle es el que decide si `demoBloqueaEscritura()` cancela la siembra de las anotaciones de
   ejemplo: con el portal cerrado la siembra funciona, con el portal abierto (o sea, siempre en la
   vida real) se cancelaba entera y en silencio.
   R17 en el prompt que agregó la función: probar el estado cómodo en vez del estado real. */
/* ⚠️ ENTRAR A LA DEMO ES POR `onDashData`, NO POR `demoVerVista`. Es la distinción que hace el
   arreglo: `demoVerVista` exige estar YA en la demostración (`DASH.demoMode`), justamente para que
   no pueda pisar el panel real de una empresa. Así que la prueba tiene que entrar por donde entra
   la app —`portalVerDemo` llama a `onDashData`— y recién después usar el selector.
   Los primeros casos de este archivo saltaban ese paso y por eso pedían una guarda más laxa de la
   que producción necesita. */
function p106Entrar(vista){
  const g = { d: p106Payload(), params: { action:'demo' }, scope: 'Empresa Demo' };
  DEMO_PAYLOAD = g;
  onDashData(g.d, g.scope, g.params, vista || 'medico');
  return g;
}

function p106ConPortal(fn){
  const ov = document.getElementById('portalOverlay');
  const tenia = ov.classList.contains('show');
  const dashPrev = DASH, payPrev = DEMO_PAYLOAD;
  try { ov.classList.add('show'); return fn(); }
  finally {
    if (!tenia) ov.classList.remove('show');
    DASH = dashPrev; DEMO_PAYLOAD = payPrev;   // no dejarle estado sucio al archivo siguiente
  }
}

PRUEBAS.caso('⚠️ la demo SIEMBRA sus anotaciones de ejemplo con el portal abierto', () => {
  /* EL BUG: las anotaciones médicas de ejemplo se escriben con `gestUpsert()`, que consulta
     `simulBloquea()`. Y al sembrar se cumplen las dos condiciones que bloquean —`DASH.demoMode` ya
     está puesto y el portal está abierto—, así que se cancelaban las tres, con un toast
     "no se guarda nada" encima. La vista de supervisor quedaba sin ninguna indicación médica y la
     del médico con el bloque de anotaciones vacío: el contenido que la demostración existe para
     enseñar. Desde S7 el toast salía además en CADA toque del selector, delante del cliente. */
  p106ConPortal(() => {
    p106Entrar('medico');
    const demoAnots = (typeof gestList === 'function' ? gestList() : [])
      .filter(g => String(g.id||'').indexOf('ademo_') === 0);
    PRUEBAS.alMenos(demoAnots.length, 1,
      '⚠️ con el portal abierto la demo tiene que poder sembrar sus propias anotaciones');
  });
});

PRUEBAS.caso('el DISCRIMINADOR de la siembra: la bandera es lo que la habilita', () => {
  /* Se comprueba que `demoBloqueaEscritura()` cambia de signo según la bandera. Sin esto, el caso
     de arriba podría estar dando verde porque no hay nada que bloquear. */
  p106ConPortal(() => {
    DASH = { demoMode: true };
    PRUEBAS.cierto(demoBloqueaEscritura(), '⚠️ sin la bandera, con el portal abierto SE BLOQUEA');
    let dentro = null;
    demoSembrando(() => { dentro = demoBloqueaEscritura(); });
    PRUEBAS.falso(dentro, 'y con la bandera puesta, no');
    PRUEBAS.cierto(demoBloqueaEscritura(), 'y al salir vuelve a bloquear — la bandera no queda pegada');
  });
});

PRUEBAS.caso('⚠️ fuera de la demostración, demoVerVista NO pisa el panel real', () => {
  /* `portalBackToGate()` no cierra el portal, así que el payload podía sobrevivir y quedar
     disponible para reemplazar el panel de una empresa de verdad por los datos de ejemplo. */
  const dashPrev = DASH, payPrev = DEMO_PAYLOAD;
  try {
    DEMO_PAYLOAD = { d: p106Payload(), params: { action:'demo' }, scope: 'Empresa Demo' };
    DASH = { demoMode: false, vista: 'supervisor', registros: [] };
    PRUEBAS.falso(demoVerVista('medico'), '⚠️ con DASH real devuelve false y no toca nada');
    PRUEBAS.igual(DASH.vista, 'supervisor', 'la vista real quedó como estaba');
  } finally { DASH = dashPrev; DEMO_PAYLOAD = payPrev; }
});

PRUEBAS.caso('⚠️ ir a la vista personal y volver devuelve TODOS los datos', () => {
  /* Se entra por `onDashData`, que es el único camino real (R17): armar `DASH` a mano probaría la
     función y no que el llamador le pueda dar lo que pide. */
  const ov = document.getElementById('portalOverlay'), tenia = ov.classList.contains('show');
  ov.classList.add('show');
  const g = p106Entrar('supervisor');
  const total = g.d.registros.length;
  try {
  PRUEBAS.igual(DASH.registros.length, total, 'supervisor ve todo');
  demoVerVista('empleado');
  PRUEBAS.comoMucho(DASH.registros.length, total - 1, 'la vista personal recorta');
  demoVerVista('supervisor');
  PRUEBAS.igual(DASH.registros.length, total, '⚠️ y al volver están TODOS otra vez');
  PRUEBAS.igual(DEMO_PAYLOAD.d.registros.length, total, 'el payload guardado nunca se tocó');
  } finally { if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ cambiar de vista NO pide nada a la red', () => {
  /* La razón entera del cambio. Si vuelve a pedir, se perdió el punto. */
  const ov = document.getElementById('portalOverlay'), tenia = ov.classList.contains('show');
  ov.classList.add('show');
  p106Entrar('supervisor');
  let pedidos = 0;
  const orig = window.fetch;
  window.fetch = function(){ pedidos++; return orig.apply(this, arguments); };
  try {
    ['supervisor','empleado','hseq','medico'].forEach(v => demoVerVista(v));
  } finally { window.fetch = orig; if (!tenia) ov.classList.remove('show'); }
  PRUEBAS.igual(pedidos, 0, '⚠️ cuatro cambios de vista, cero pedidos');
});

PRUEBAS.caso('cada vista trae SUS pestañas, no las de otra', () => {
  p106Entrar('supervisor');
  PRUEBAS.igual(DASH.tabs, ['aptitud','reportes','ciclo'], 'supervisor');
  demoVerVista('hseq');
  PRUEBAS.cierto(DASH.tabs.indexOf('idc') >= 0, 'dirección tiene su IDC');
  PRUEBAS.falso(DASH.tabs.indexOf('comentarios') >= 0, 'y NO los comentarios, que son clínicos');
});

PRUEBAS.caso('⚠️ la VISTA personal manda sobre el rol', () => {
  /* EL DEFECTO: `dashTabsFor('supervisor', false, 'empleado')` devolvía las OCHO pestañas del
     servicio médico. O sea que elegir "Vista personal" desde una cuenta que no es de empleado
     mostraba el panel médico completo, y era imposible previsualizar lo que ve un piloto — justo
     lo que alguien quiere mostrar en una demostración. Está en DOS lugares con listas propias
     (`dashTabsFor` y `dashOrderedTabs`), y tocar sólo uno deja la pestaña inexistente sin error. */
  const tabs = dashTabsFor('supervisor', false, 'empleado');
  PRUEBAS.igual(tabs, ['resumen','evolucion'], '⚠️ dos pestañas, no las ocho del médico');
  PRUEBAS.falso(tabs.indexOf('gestiones') >= 0, 'nada del registro clínico');
  PRUEBAS.falso(tabs.indexOf('comparar') >= 0, 'ni comparar departamentos');
  PRUEBAS.igual(dashTabsFor('supervisor', true, 'empleado'), ['resumen','evolucion','pvt'],
    'con PVT se suma su pestaña, y sólo esa');
});

PRUEBAS.caso('sin payload guardado, demoVerVista avisa en vez de romper', () => {
  /* Devuelve false para que el llamador pueda caer al camino largo, en vez de dejar la pantalla
     como estaba sin ninguna explicación. */
  const previo = DEMO_PAYLOAD, dashPrev = DASH;
  try {
    DASH = { demoMode: true, vista: 'supervisor' };
    DEMO_PAYLOAD = null;
    PRUEBAS.falso(demoVerVista('supervisor'), 'devuelve false y no lanza');
  } finally { DEMO_PAYLOAD = previo; DASH = dashPrev; }
});

PRUEBAS.caso('el DISCRIMINADOR: estas mediciones detectan de verdad', () => {
  /* R17: un caso que no puede fallar es decoración. Se arma el defecto viejo —un recorte que MUTA
     el payload— y se confirma que la comprobación cambia de signo. */
  const d = p106Payload();
  const total = d.registros.length;
  const recorteMalo = (dd, uno) => { dd.registros = dd.registros.filter(r => r.persona === uno); return dd; };
  recorteMalo(d, demoPersonaEjemplo(d));
  PRUEBAS.cierto(d.registros.length < total, '⚠️ con el recorte destructivo el original SE PIERDE');
  const d2 = p106Payload();
  demoRecortarAPersona(d2, demoPersonaEjemplo(d2));
  PRUEBAS.igual(d2.registros.length, total, 'y con el real no — o sea que la prueba discrimina');
});

/* ── La BARRA. Estaba sin cubrir: los primeros casos probaban el motor y ni tocaban la interfaz
   que lo hace usable, que es exactamente cómo se entregan funciones que no llama nadie. ────── */

PRUEBAS.caso('la barra aparece SÓLO en la demostración', () => {
  p106ConPortal(() => {
    const bar = document.getElementById('demoBar');
    PRUEBAS.cierto(!!bar, 'existe #demoBar');
    DASH = { demoMode: false, vista: 'supervisor' }; DEMO_PAYLOAD = null;
    demoPintarBarra();
    PRUEBAS.igual(bar.style.display, 'none', 'sin demo, oculta');
    p106Entrar('supervisor');
    PRUEBAS.falso(getComputedStyle(bar).display === 'none', '⚠️ en demo, visible');
  });
});

PRUEBAS.caso('los cuatro botones existen y sólo uno queda marcado', () => {
  p106ConPortal(() => {
    p106Entrar('hseq');
    const bs = [...document.querySelectorAll('#dbVistas .db-v')];
    PRUEBAS.igual(bs.length, 4, 'Personal · Supervisor · Médico · Dirección');
    const marcados = bs.filter(b => b.getAttribute('aria-pressed') === 'true');
    PRUEBAS.igual(marcados.length, 1, '⚠️ exactamente uno marcado, nunca dos ni ninguno');
    PRUEBAS.igual(marcados[0].textContent.trim(), t('dv_direccion'), 'y es el de la vista actual');
  });
});

PRUEBAS.caso('⚠️ el área táctil llega a 44 px', () => {
  /* Esta barra se usa en un teléfono sostenido en la mano delante de otra persona: es el peor
     caso para errarle a un botón. */
  p106ConPortal(() => {
    p106Entrar('supervisor');
    const chicos = [...document.querySelectorAll('#dbVistas .db-v')]
      .filter(b => b.getBoundingClientRect().height < 44)
      .map(b => b.textContent.trim() + ': ' + Math.round(b.getBoundingClientRect().height) + 'px');
    PRUEBAS.igual(chicos, [], 'ninguno por debajo de 44 px de alto');
  });
});

PRUEBAS.caso('tocar el botón cambia la vista de verdad', () => {
  /* R17: se toca el BOTÓN, no se llama la función. Es el único camino que tiene una persona. */
  p106ConPortal(() => {
    p106Entrar('supervisor');
    const bs = () => [...document.querySelectorAll('#dbVistas .db-v')];
    bs()[3].click();
    PRUEBAS.igual(DASH.vista, 'hseq', '⚠️ el click llegó hasta el cambio de vista');
    PRUEBAS.igual(bs()[3].getAttribute('aria-pressed'), 'true', 'y la barra se actualizó sola');
  });
});

PRUEBAS.caso('R13 · la barra no tiene ningún color escrito a mano', () => {
  /* `.sim-bar` tenía tres (`#4338ca`, `#3c32b8`, `#fff`). Se comprueba sobre el CSS real, sin
     comentarios: la explicación de este mismo arreglo NOMBRA esos hex, y sin sacarlos la prueba
     fallaría por su propio texto. Ya pasó dos veces en este proyecto. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bloque = (css.match(/\.sim-bar\s*\{[^}]*\}/g) || []).join(' ') +
                 (css.match(/\.db-v[^{]*\{[^}]*\}/g) || []).join(' ');
  const hex = bloque.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  PRUEBAS.igual(hex, [], 'cero hex a mano en .sim-bar y .db-v');
  PRUEBAS.cierto(/var\(--demo-bar\)/.test(bloque), 'y sí los tokens');
});

PRUEBAS.caso('R13 · los tokens nuevos están en LOS DOS temas', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  ['--demo-bar','--demo-bar-2','--demo-chip','--demo-chip-on','--demo-chip-on-txt'].forEach(tok => {
    const n = (css.match(new RegExp(tok.replace(/-/g,'\\-') + '\\s*:', 'g')) || []).length;
    PRUEBAS.alMenos(n, 2, tok + ' definido en claro y en oscuro');
  });
});
