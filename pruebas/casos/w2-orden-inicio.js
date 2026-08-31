
PRUEBAS.grupo('W2 · el test de reacción va arriba de Sensaciones');

/* POR QUÉ: es la única medición del inicio que no depende de lo que la persona responda —mide una
   reacción real, en milisegundos— y puesta primero se toma con la atención más fresca. Sensaciones
   es un cuestionario largo (ocho tarjetas); dejar el PVT para el final significaba tomarlo ya
   cansado de tocar botones, justo el sesgo que se quiere evitar. */

PRUEBAS.caso('⚠️ "Test de Reacción" aparece antes que "Sensaciones Personales"', () => {
  CTX.resetear({ esPiloto: true });
  const titulos = [...document.querySelectorAll('#sections .section .sec-title')].map(e => e.textContent.trim());

  const iReaccion = titulos.findIndex(t => /reacci/i.test(t));
  const iSensaciones = titulos.findIndex(t => /sensaciones/i.test(t));
  PRUEBAS.alMenos(iReaccion, 0, 'la sección de reacción tiene que existir en el inicio');
  PRUEBAS.alMenos(iSensaciones, 0, 'y la de sensaciones también');
  PRUEBAS.cierto(iReaccion < iSensaciones,
    'reacción va antes: ' + JSON.stringify(titulos));
});

PRUEBAS.caso('el orden del DOM es el que ve el teclado: reacción llega primero al tabular', () => {
  /* No hay `tabindex` a mano en estas tarjetas: el recorrido con teclado sigue el orden del DOM,
     así que basta con comprobar el DOM — no hace falta simular Tab. */
  CTX.resetear({ esPiloto: true });
  const enlaces = [...document.querySelectorAll('#sections a.tile, #sections a.rbtn')];
  const iPvt = enlaces.findIndex(a => a.closest('.item')?.dataset.id === 'sen_pvt');
  const iSens = enlaces.findIndex(a => (a.closest('.item')?.dataset.id || '').startsWith('sen_') && a.closest('.item').dataset.id !== 'sen_pvt');
  PRUEBAS.alMenos(iPvt, 0, 'el enlace del PVT tiene que existir');
  PRUEBAS.alMenos(iSens, 0, 'y algún enlace de sensaciones también');
  PRUEBAS.cierto(iPvt < iSens, 'el PVT recibe el foco antes que la primera tarjeta de Sensaciones');
});

PRUEBAS.caso('⚠️ la entrada escalonada no se rompió: sigue un único retraso, no uno por sección', () => {
  /* Antes de reordenar se comprobó que NO existe un retraso escalonado por posición para
     `.section` —las tres comparten el mismo `animation-delay`—, así que mover el bloque en el
     arreglo no podía desincronizar ninguna cuenta de milisegundos. Esto lo deja escrito: si algún
     día se agrega un escalonado por índice, este caso avisa para que se revise el orden a mano. */
  const secciones = [...document.querySelectorAll('#sections .section')];
  PRUEBAS.alMenos(secciones.length, 3, 'tienen que estar las tres secciones del inicio de piloto');
  const retrasos = secciones.map(s => getComputedStyle(s).animationDelay);
  const distintos = new Set(retrasos);
  PRUEBAS.igual(distintos.size, 1,
    'las secciones comparten un solo retraso (' + [...distintos].join(', ') + '): si esto cambia a ' +
    'uno por posición, hay que revisar que el orden de lectura siga siendo el nuevo (reacción, ' +
    'sensaciones) y no el viejo');
});
