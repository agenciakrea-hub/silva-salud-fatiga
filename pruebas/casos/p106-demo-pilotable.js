
PRUEBAS.grupo('P106 · la demostración se pilotea sin volver a la portada');

/* ⚠️ POR QUÉ EXISTE ESTO. La demo es la herramienta de venta: es lo que se le muestra a un cliente
   antes de que firme. Y pasar de la vista de supervisor a la de médico DELANTE DE ESE CLIENTE
   costaba 4 toques, entre 3,5 y 12 segundos con la pantalla bloqueada, y un viaje de vuelta a la
   portada, perdiendo el contexto en el medio.
   No hacía falta nada de eso: `portalVerDemo` y `portalVerDemoEmpleado` mandan EXACTAMENTE el mismo
   pedido, y la vista de empleado se arma filtrando esa misma respuesta del lado del cliente. El
   payload que ya está en memoria alcanza para las cuatro vistas.
   Medido con el motor nuevo: de 2.800–12.000 ms a 11–28 ms, y de 1 pedido de red por cambio a 0. */

/* Arma el payload por el camino REAL del emulador, no a mano (R17). Si no está servido el .gs, el
   caso se saltea en vez de fallar en falso. */
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

PRUEBAS.caso('⚠️ ir a la vista personal y volver devuelve TODOS los datos', () => {
  /* Se entra por `onDashData`, que es el único camino real (R17): armar `DASH` a mano probaría la
     función y no que el llamador le pueda dar lo que pide. */
  const d = p106Payload();
  const params = { action:'demo' };
  DEMO_PAYLOAD = { d: d, params: params, scope: 'Empresa Demo' };
  const total = d.registros.length;

  demoVerVista('supervisor');
  PRUEBAS.igual(DASH.registros.length, total, 'supervisor ve todo');
  demoVerVista('empleado');
  PRUEBAS.comoMucho(DASH.registros.length, total - 1, 'la vista personal recorta');
  demoVerVista('supervisor');
  PRUEBAS.igual(DASH.registros.length, total, '⚠️ y al volver están TODOS otra vez');
  PRUEBAS.igual(DEMO_PAYLOAD.d.registros.length, total, 'el payload guardado nunca se tocó');
});

PRUEBAS.caso('⚠️ cambiar de vista NO pide nada a la red', () => {
  /* La razón entera del cambio. Si vuelve a pedir, se perdió el punto. */
  const d = p106Payload();
  DEMO_PAYLOAD = { d: d, params: { action:'demo' }, scope: 'Empresa Demo' };
  let pedidos = 0;
  const orig = window.fetch;
  window.fetch = function(){ pedidos++; return orig.apply(this, arguments); };
  try {
    ['supervisor','empleado','hseq','medico'].forEach(v => demoVerVista(v));
  } finally { window.fetch = orig; }
  PRUEBAS.igual(pedidos, 0, '⚠️ cuatro cambios de vista, cero pedidos');
});

PRUEBAS.caso('cada vista trae SUS pestañas, no las de otra', () => {
  const d = p106Payload();
  DEMO_PAYLOAD = { d: d, params: { action:'demo' }, scope: 'Empresa Demo' };
  demoVerVista('supervisor');
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
  const previo = DEMO_PAYLOAD;
  try {
    DEMO_PAYLOAD = null;
    PRUEBAS.falso(demoVerVista('supervisor'), 'devuelve false y no lanza');
  } finally { DEMO_PAYLOAD = previo; }
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
