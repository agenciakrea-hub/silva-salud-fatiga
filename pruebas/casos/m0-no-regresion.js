/* ── M0 · Las cosas que NUNCA se tienen que romper ──────────────────────────────────────────────
   (2026-08-27)

   Estos casos nacen de un reclamo del usuario: que el bloque J–L había roto el WhatsApp de EVA.
   No era así —las 7 funciones que cierran un test están byte a byte idénticas a como estaban en
   4.04— pero el reclamo dejó en evidencia un agujero real: **la suite cubría lo que yo había
   decidido cubrir**, o sea los cambios que hice, y no los caminos de siempre que ningún prompt
   tocó. Justo esos son los que nadie mira hasta que un piloto se queja.

   Lo que hay acá no prueba features nuevas: prueba que lo VIEJO sigue en pie. */

PRUEBAS.grupo('M0 · el canal de WhatsApp sigue existiendo');

PRUEBAS.caso('waUrl arma la URL de EVA con el teléfono correcto', () => {
  /* `EVA_PHONE` y `waUrl` son el canal por el que la empresa recibe los reportes de quien NO es
     piloto. Si alguien los toca sin darse cuenta, los mensajes dejan de llegar y no hay ningún
     error: simplemente nadie recibe nada. */
  const url = waUrl({ id: 'x', label: 'Prueba', msg: 'mensaje de prueba' });
  PRUEBAS.cierto(url.indexOf('584129089379') > 0,
    'es el WhatsApp de EVA: si cambia, los reportes dejan de llegar y nadie se entera');
  PRUEBAS.cierto(/^https:\/\/api\.whatsapp\.com\/send\//.test(url), 'y tiene que seguir siendo un enlace de WhatsApp');
  PRUEBAS.cierto(decodeURIComponent(url).indexOf('mensaje de prueba') > 0, 'con el mensaje adentro');
});

PRUEBAS.caso('las tarjetas SIN test siguen llevando directo a WhatsApp', () => {
  /* Las cuatro del ciclo operativo: dos abren un test antes (llevan `testFlow`) y dos van
     derecho a WhatsApp. Ese reparto es el que el usuario notó que "ya no andaba" — no había
     cambiado, pero conviene que quede fijo. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const href = id => {
    const a = document.querySelector('#sections .item[data-id="' + id + '"] a');
    return a ? a.getAttribute('href') : null;
  };
  PRUEBAS.cierto(/api\.whatsapp\.com/.test(href('op_salir_casa') || ''),
    '"Saliendo de casa" no tiene test: va derecho a WhatsApp');
  PRUEBAS.cierto(/api\.whatsapp\.com/.test(href('op_lleg_casa') || ''),
    '"Llegando a casa" tampoco');
  PRUEBAS.igual(href('op_lleg_aero'), 'javascript:void(0)',
    '"Llegando al aeropuerto" SÍ tiene test: abre el test primero, no WhatsApp');
});

PRUEBAS.caso('la pantalla de inicio sigue teniendo sus 13 tarjetas', () => {
  /* Comparado contra 4.04: 13 tarjetas, mismos ids. Si un cambio de layout hace desaparecer una,
     desaparece un camino entero de registro sin ningún error en consola. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const ids = [...document.querySelectorAll('#sections .item')].map(x => x.dataset.id);
  PRUEBAS.igual(ids.length, 13, 'eran 13 en 4.04 y tienen que seguir siendo 13');
  ['op_salir_casa', 'op_lleg_aero', 'op_salir_aero', 'op_lleg_casa',
    'sen_cansancio', 'sen_estres', 'sen_ansiedad', 'sen_malestar'].forEach(id => {
    PRUEBAS.cierto(ids.indexOf(id) >= 0, 'la tarjeta ' + id + ' tiene que seguir estando');
  });
});

PRUEBAS.grupo('M0 · lo que se escribe en el CH');

PRUEBAS.caso('un evento operacional se envía con todos sus campos', () => {
  /* Lo que la app manda tiene que traer TODO lo que el endpoint espera. Si falta un campo, la
     fila entra igual pero incompleta — y eso no se nota hasta que alguien mira la planilla. */
  CTX.resetear({ nombre: 'Ana Prueba', cargo: 'Piloto', esPiloto: true });
  const pedidos = [];
  const orig = window.fetch;
  window.fetch = function (u) { pedidos.push(String(u)); return new Promise(() => {}); };
  try { enviarOperacional('llegada_aero', 'kss', 4); } finally { window.fetch = orig; }

  const dash = pedidos.find(u => u.indexOf('operacional_guardar') >= 0);
  PRUEBAS.cierto(!!dash, 'tiene que salir el pedido al endpoint del panel');
  const q = Object.fromEntries(new URL(dash).searchParams.entries());
  ['id', 'fecha', 'hora', 'iso', 'persona', 'empresa', 'departamento', 'cargo', 'evento', 'test', 'resultado']
    .forEach(k => PRUEBAS.cierto(k in q, 'el campo "' + k + '" tiene que viajar'));
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(q.fecha), 'la fecha en formato ISO corto, que es con el que se compara después');
  PRUEBAS.cierto(q.id.indexOf(q.fecha) > 0, 'el id lleva la fecha adentro: es lo que hace que reenviar no duplique');
});

PRUEBAS.caso('el evento queda guardado en el dispositivo aunque no haya red', () => {
  /* La app se usa en un hangar. Si el envío falla, el registro NO se puede perder. */
  CTX.resetear({ nombre: 'Ana Prueba', cargo: 'Piloto', esPiloto: true });
  const orig = window.fetch;
  window.fetch = function () { return Promise.reject(new Error('sin red')); };
  try { enviarOperacional('llegada_aero', 'kss', 4); } finally { window.fetch = orig; }
  let guardado = [];
  try { guardado = JSON.parse(localStorage.getItem('silva_fatiga_ciclo_mio_v1') || '[]'); } catch (e) {}
  PRUEBAS.alMenos(guardado.length, 1,
    'sin conexión el evento tiene que quedar en el dispositivo: si no, la persona lo registró y se perdió');
  PRUEBAS.igual(guardado[0].evento, 'llegada_aero', 'con el evento correcto');
});
