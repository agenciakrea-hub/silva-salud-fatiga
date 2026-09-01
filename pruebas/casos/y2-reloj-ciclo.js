
PRUEBAS.grupo('Y2 · el reloj del ciclo, también en el inicio');

/* LO QUE SE REPORTÓ, y eran tres cosas del mismo problema:
   · "no se actualiza en inicio el tiempo de cada ciclo"
   · "el palito de ciclo no se mueve de etapa"
   · "que cuente segundo por segundo, para que entiendan que pasa el tiempo"
   La causa era una sola: `cicloTick` empezaba con `getElementById('dsec-ciclo')` y se apagaba solo
   si esa sección del PANEL no estaba en pantalla. En el inicio del empleado no hay panel, así que
   nunca corría: los minutos sólo cambiaban cuando algo repintaba, y la aguja se quedaba con el
   `left:0` del CSS. Quien llevaba seis horas de jornada veía el palito al principio de la barra. */

function y2Sembrar(minDesdeInicio, minDesdeLlegada){
  CTX.resetear({ nombre: 'Ana Prueba', cargo: 'Piloto', esPiloto: true });
  const hace = m => new Date(Date.now() - m * 60000).toISOString();
  localStorage.setItem('silva_fatiga_ciclo_mio_v1', JSON.stringify([
    { evento: 'salida_casa', iso: hace(minDesdeInicio) },
    { evento: 'llegada_aero', iso: hace(minDesdeLlegada), test: 'kss', resultado: 4 }
  ]));
  renderSections();
  /* ⚠️ La aguja la coloca `cicloMiArrancarReloj` desde un `requestAnimationFrame`, con un
     `setTimeout` de 80 ms de respaldo. Acá no sirve ninguno de los dos: con la pestaña oculta el rAF
     NO DISPARA NUNCA y los temporizadores están estrangulados. Se la coloca a mano para poder
     medirla; en un navegador de verdad esto ya pasó solo. */
  if (typeof cicloUbicarAgujas === 'function') cicloUbicarAgujas();
}

PRUEBAS.caso('⚠️ el reloj corre en el inicio, no sólo en el panel', () => {
  /* ⚠️ ESTE CASO NO ESPERA TIEMPO REAL, y no es por rapidez.
     La primera versión esperaba 1400 ms y comparaba el texto antes y después. Con la pestaña oculta
     —que acá lo está siempre— el navegador estrangula los temporizadores: primero a uno por segundo
     y después a uno por MINUTO. Así, la espera y el intervalo del reloj caen en el mismo tic
     estrangulado y el orden entre los dos es azar: el caso pasaba o fallaba según hacía cuánto que
     la pestaña estaba oculta. Un caso que falla por el entorno es peor que no tenerlo, porque manda
     a buscar un bug que no existe — y me mandó.
     Se parte en las dos cosas que de verdad importan, las dos sin esperar:
       1) que quede un reloj ARMADO, porque si no nada va a actualizarse nunca;
       2) que un tic CAMBIE el número, que es lo que se ve. El tic se dispara a mano. */
  y2Sembrar(137, 77);
  const vivos = [...document.querySelectorAll('#sections .cic-mio [data-cic-from]')];
  PRUEBAS.alMenos(vivos.length, 1, 'el bloque del inicio tiene que traer algún contador vivo');
  PRUEBAS.cierto(_cicloTimer !== null,
    'al pintar el inicio el reloj tiene que quedar en marcha, sin depender de que haya panel abierto');

  const antes = vivos.map(e => e.textContent.trim());
  /* Se corre el arranque del ciclo un minuto y medio más atrás: para la app es exactamente lo mismo
     que si hubiera pasado ese tiempo, pero pasa en el acto. */
  const guard = JSON.parse(localStorage.getItem('silva_fatiga_ciclo_mio_v1'));
  guard.forEach(e => { e.iso = new Date(new Date(e.iso).getTime() - 90000).toISOString(); });
  localStorage.setItem('silva_fatiga_ciclo_mio_v1', JSON.stringify(guard));
  /* ⚠️ `data-cic-from` guarda MILISEGUNDOS, no una fecha ISO. Escribirle un ISO lo rompe con
     "Invalid time value" — probado. */
  document.querySelectorAll('#sections .cic-mio [data-cic-from]').forEach(e => {
    e.dataset.cicFrom = String(Number(e.dataset.cicFrom) - 90000);
  });
  cicloTick();
  const despues = vivos.map(e => e.textContent.trim());
  PRUEBAS.falso(JSON.stringify(antes) === JSON.stringify(despues),
    'un tic tiene que cambiar el número: era el reclamo textual, "no se actualiza en inicio"');
});

PRUEBAS.caso('⚠️ cuenta segundo a segundo, también pasada la hora', () => {
  /* La primera versión ocultaba los segundos arriba de una hora para ahorrar ancho. Estaba mal: con
     una jornada de doce horas el número no se movía NUNCA, que es lo contrario de lo que se pidió.
     El ancho se resolvió midiendo (entra hasta en 320 px), no recortando el dato. */
  PRUEBAS.cierto(/\d+ s$/.test(cicloVivo(5)), 'debajo de la hora muestra segundos: ' + cicloVivo(5));
  PRUEBAS.cierto(/\d+ s$/.test(cicloVivo(137)), 'y por encima de la hora TAMBIÉN: ' + cicloVivo(137));
  PRUEBAS.falso(cicloVivo(137.0) === cicloVivo(137.5),
    'dos momentos separados por medio minuto no pueden verse iguales');
});

PRUEBAS.caso('⚠️ la aguja del inicio se ubica, no queda clavada en el origen', async () => {
  /* `cicloUbicarAgujas()` sólo se llamaba desde el panel. En el inicio la aguja se quedaba con su
     `left:0`, así que señalaba el principio de la barra sin importar cuánto llevara la persona. */
  y2Sembrar(137, 77);
  /* ⚠️ Hay que esperar: la aguja se calcula midiendo el ancho REAL de cada segmento, y recién
     pintado el bloque esos anchos son cero, así que se ubica en el cuadro siguiente. Medir en el
     mismo tick da 0 px y acusa el bug que justamente se acaba de arreglar.
     ⚠️⚠️ Y se espera con `setTimeout`, NO con `requestAnimationFrame`: acá la pestaña está oculta de
     forma permanente y rAF no dispara nunca, así que el `await` no resuelve y la suite se cuelga
     entera. Me pasó, con esta misma prueba, teniéndolo ya escrito en el LEEME. */
  await new Promise(r => setTimeout(r, 120));
  const aguja = document.querySelector('#sections .cic-mio .cic-now');
  PRUEBAS.cierto(!!aguja, 'la barra del inicio tiene que traer su aguja');
  const izq = parseFloat(aguja.style.left || '0');
  PRUEBAS.alMenos(izq, 1,
    'con más de dos horas de ciclo la aguja no puede estar en el origen (quedó en ' + izq + 'px)');

  const barra = aguja.closest('.cic-barra');
  PRUEBAS.comoMucho(izq, barra.offsetWidth,
    'y tampoco puede salirse de la barra');
});

PRUEBAS.caso('la aguja avanza con el tiempo', () => {
  /* Tampoco espera tiempo real: se siembran dos ciclos con distinto tiempo transcurrido, que es lo
     mismo que mirar el mismo ciclo en dos momentos. Ver el caso de arriba para por que esperar no
     sirve aca. */
  y2Sembrar(137, 77);
  const a = parseFloat(document.querySelector('#sections .cic-mio .cic-now').style.left || '0');
  y2Sembrar(197, 137);
  const b = parseFloat(document.querySelector('#sections .cic-mio .cic-now').style.left || '0');
  PRUEBAS.alMenos(b, a, 'la aguja avanza, nunca retrocede');
  PRUEBAS.falso(a === b, 'y se mueve de verdad: si no, "no se mueve de etapa" sigue siendo cierto');
});

PRUEBAS.caso('⚠️ el inicio NO dispara pedidos al servidor cada minuto', async () => {
  /* El reloj del panel pide datos cada 60 s porque los eventos nuevos llegan por ahí. El inicio no
     lo necesita: sus eventos son locales. Si el reloj compartido arrastrara ese pedido, un teléfono
     con el inicio abierto un turno entero serían ~480 pedidos contra la cuota del endpoint.
     Se comprueba sobre el código porque esperar 60 s en una prueba no es opción. */
  const fuente = cicloTick.toString();
  PRUEBAS.cierto(/if \(sec && DASH && !DASH\.demoMode/.test(fuente),
    'el pedido de cada minuto tiene que estar condicionado a que exista la sección del PANEL');
  /* ⚠️ ANTES ESTO EXIGÍA LA LÍNEA LETRA POR LETRA (`if (sec && DASH && ahora - ...`) y se puso roja
     cuando T1 le agregó una condición más —que no repinte mientras alguien escribe en el buscador—.
     O sea: falló por una MEJORA, el síntoma clásico de una prueba atada a cómo está escrito algo.
     Lo que importa es que el repintado dependa de que exista la sección del PANEL, no la forma
     exacta de la condición. */
  PRUEBAS.cierto(/_cicloUltimoRender > 60000/.test(fuente) && /\bsec &&/.test(fuente),
    'y el repintado de cada minuto también: el inicio se repinta por su cuenta');
});

PRUEBAS.caso('el reloj se apaga solo cuando no queda nada vivo', () => {
  /* Antes esto dependía de que alguien llamara a `cicloTickStop()` desde el lugar correcto; ahora el
     propio tick se apaga si no hay ni panel ni bloque de inicio en pantalla. */
  const fuente = cicloTick.toString();
  PRUEBAS.cierto(/if \(!sec && !mio\)\{ cicloTickStop\(\); return; \}/.test(fuente),
    'sin nada que actualizar, el intervalo tiene que apagarse solo y no quedar corriendo');
});
