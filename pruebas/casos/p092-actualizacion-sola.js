
PRUEBAS.grupo('P092 · la app se actualiza sola, sin esperar a que nadie toque nada');

/* ⚠️ EL DEFECTO QUE ESTO FIJA LO REPORTÓ EL DUEÑO DESDE SU CELULAR: quedó pegado en una versión
   vieja y no podía salir. La app NUNCA recargaba sola — mostraba un cartel abajo con un botón
   "Actualizar" y esperaba. Con el scroll trabado no llegaba al cartel, así que no tenía forma de
   actualizar, y tampoco de ver en qué versión estaba.

   La lección es más grande que el cartel: cuando actualizar DEPENDE de que la persona actúe,
   cualquier otro bug de la app se convierte en "no se puede actualizar nunca". Y es justo cuando
   hay un bug cuando más falta hace poder actualizar.

   Había además un agujero de detección: `reg.update()` corría en `load` y en un `setInterval` de
   una hora. En un celular el intervalo se suspende con la app en segundo plano y `load` no vuelve
   a dispararse al traerla al frente desde el conmutador. O sea que en el teléfono —que es donde se
   usa— el chequeo casi no corría. */

PRUEBAS.caso('appOcupada() mira elementos que EXISTEN de verdad', () => {
  /* ⚠️ ESTE ES EL CASO QUE MÁS IMPORTA, y no es una formalidad. Escribir mediciones contra
     selectores inventados ya pasó CINCO veces en este proyecto (`var(--muted)`, `.dash-card`,
     `dash-vacio`…). Un `getElementById` que devuelve null no tira error: `appOcupada()` devolvería
     `false` siempre, la app recargaría en medio de un PVT, y todo se vería funcionando. */
  PRUEBAS.cierto(typeof appOcupada === 'function', 'appOcupada() está declarada');
  PRUEBAS.cierto(typeof versionAplicar === 'function', 'versionAplicar() está declarada');
  PRUEBAS.existe('#pvtRun',      '⚠️ el panel del PVT en curso — si no existe, appOcupada() es ciega');
  PRUEBAS.existe('#testOverlay', '⚠️ el overlay del cuestionario — idem');
});

PRUEBAS.caso('en reposo se puede recargar', () => {
  const pvt = document.getElementById('pvtRun');
  const test = document.getElementById('testOverlay');
  const dPvt = pvt.style.display, tTest = test.classList.contains('show');
  try {
    pvt.style.display = 'none';
    test.classList.remove('show');
    PRUEBAS.falso(appOcupada(), 'sin nada en curso, la actualización entra sola');
  } finally { pvt.style.display = dPvt; if (tTest) test.classList.add('show'); }
});

PRUEBAS.caso('⚠️ con un PVT corriendo NO se recarga', () => {
  /* El PVT mide milisegundos de reacción. Recargar por la mitad tira los 90 segundos de medición,
     y la persona tiene que volver a hacerlo entero.
     ⚠️ SE ABRE EL OVERLAY, NO SÓLO EL `display`. Esta prueba armaba el estado a mano —ponía
     `pvtRun.style.display = ''` y nada más— y pasaba en verde contra una versión de
     `appOcupada()` que miraba sólo eso. Esa laxitud era el bug: `display` computado no hereda el
     `none` del ancestro, así que después de cerrar el PVT con la ✕ la app se declaraba ocupada
     PARA SIEMPRE y la actualización automática quedaba apagada en ese dispositivo. Al endurecer
     la función, la prueba se puso en rojo — que es exactamente lo que tenía que pasar. Ahora
     reproduce lo que hace `openPVT()` + `pvtStart()` de verdad. */
  const ov = document.getElementById('pvtOverlay');
  const pvt = document.getElementById('pvtRun');
  const d = pvt.style.display, tenia = ov.classList.contains('show');
  try {
    ov.classList.add('show');        // openPVT() (index.html:10302)
    pvt.style.display = '';          // pvtStart() (index.html:10329)
    PRUEBAS.cierto(appOcupada(), '⚠️ un PVT en curso frena la recarga');
  } finally { pvt.style.display = d; if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ pero cerrar el PVT con la ✕ NO deja la app ocupada para siempre', () => {
  /* EL BUG QUE ESTO FIJA APAGABA LA ACTUALIZACIÓN AUTOMÁTICA ENTERA. `closePVT()` sacaba la clase
     `show` pero no reponía `display:none` en `#pvtRun` —eso sólo lo hacían `openPVT()` y
     `pvtEnd()`—, así que con el overlay ya cerrado `getComputedStyle(#pvtRun).display` seguía
     diciendo `block`. Le pasaba a cualquiera que abriera el PVT y se arrepintiera. */
  const ov = document.getElementById('pvtOverlay');
  const tenia = ov.classList.contains('show');
  try {
    ov.classList.add('show');
    document.getElementById('pvtRun').style.display = '';
    closePVT();                       // el camino REAL de la ✕
    PRUEBAS.falso(ov.classList.contains('show'), 'el overlay quedó cerrado');
    PRUEBAS.falso(appOcupada(), '⚠️ y la app NO quedó ocupada: la actualización puede volver a correr');
  } finally { if (tenia) ov.classList.add('show'); }
});

PRUEBAS.caso('⚠️ un formulario a medio llenar también frena la recarga', () => {
  /* Antes esto miraba dos pantallas de nueve. Alguien por el sexto campo del alta perdía los seis
     sin aviso, y la opinión anónima ni siquiera se puede reconstruir (R7). */
  const ov = document.getElementById('opinionOv');
  if (!ov){ PRUEBAS.cierto(true, 'sin #opinionOv no aplica'); return; }
  const campo = ov.querySelector('textarea, input:not([type=hidden])');
  if (!campo){ PRUEBAS.cierto(true, 'sin campo de texto no aplica'); return; }
  const tenia = ov.classList.contains('show'), valor = campo.value;
  try {
    ov.classList.add('show'); campo.value = 'algo que la persona ya escribió';
    PRUEBAS.cierto(appOcupada(), '⚠️ hay texto escrito sin enviar: no se recarga');
    campo.value = '';
    PRUEBAS.falso(appOcupada(), 'y con el campo vacío no frena nada — no es un bloqueo permanente');
  } finally { campo.value = valor; if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ con un cuestionario abierto NO se recarga', () => {
  /* Las respuestas viven en el DOM hasta que se envía: recargar las pierde sin aviso. */
  const test = document.getElementById('testOverlay');
  const tenia = test.classList.contains('show');
  const pvt = document.getElementById('pvtRun'), d = pvt.style.display;
  try {
    pvt.style.display = 'none';
    test.classList.add('show');      // así lo abre index.html:11511
    PRUEBAS.cierto(appOcupada(), '⚠️ un test a medio contestar frena la recarga');
  } finally { if (!tenia) test.classList.remove('show'); pvt.style.display = d; }
});

PRUEBAS.caso('el DISCRIMINADOR: la medición se pone en rojo cuando debe', () => {
  /* ⚠️ R17. Un caso que nunca puede fallar no es una prueba, es decoración. Acá se rompe a
     propósito —se le esconde a `appOcupada()` el elemento que mira— y se confirma que el resultado
     cambia. Si esto diera `true` en los dos lados, los tres casos de arriba estarían midiendo aire. */
  const ov = document.getElementById('pvtOverlay');
  const pvt = document.getElementById('pvtRun');
  const d = pvt.style.display, idOrig = pvt.id, tenia = ov.classList.contains('show');
  try {
    ov.classList.add('show');
    pvt.style.display = '';
    const conElemento = appOcupada();
    pvt.id = 'pvtRun__roto__';                       // el selector deja de encontrarlo
    const sinElemento = appOcupada();
    PRUEBAS.cierto(conElemento,  'con el PVT visible: ocupada');
    PRUEBAS.falso(sinElemento,   '⚠️ sin el elemento: NO ocupada — o sea que la medición discrimina');
  } finally { pvt.id = idOrig; pvt.style.display = d; if (!tenia) ov.classList.remove('show'); }
});
