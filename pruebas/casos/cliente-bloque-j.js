/* ── Los seis bugs de la auditoría del bloque J, como regresión fija ────────────────────────────
   (L2c · 2026-08-27)

   TODOS ESTOS SE ROMPIERON DE VERDAD, esta semana, y los seis los introduje yo. Los encontré
   auditando a mano después de que el usuario desconfiara de lo rápido que había ido. Ese hallazgo
   a mano no vuelve a correr solo — por eso están acá.

   El patrón que comparten es el que hace que la suite valga: **algo que verifiqué una vez y que un
   cambio posterior puede romper sin que se note**. Ninguno da error en consola; todos se ven bien
   en una captura; los seis sólo aparecen si alguien mira el número correcto. */

PRUEBAS.grupo('Cliente · regresiones del bloque J');

PRUEBAS.caso('J3 · el plan del ciclo es el mismo para el empleado y para el supervisor', () => {
  /* Compartí el MOTOR del ciclo pero no la CONFIGURACIÓN: `cfg()` lee de `DASH._cfg` y el
     empleado no tiene `DASH`. Con una jornada configurada en 8 h, el supervisor lo veía excedido
     a las 8 y él se veía en hora hasta las 12. */
  CTX.resetear();
  const configurado = { traslado: 45, jornada: 480, regreso: 45, descanso: 600 };
  const previo = (typeof DASH !== 'undefined') ? DASH : null;

  DASH = { _cfg: { cicloPlan: configurado } };
  const supervisor = cicloPlan();
  DASH = null;
  cicloPlanGuardar(configurado);
  const empleado = cicloPlan();
  DASH = previo;

  PRUEBAS.igual(empleado, supervisor,
    'dos versiones del mismo turno: uno ve a la persona excedida y la otra se ve en hora');
});

PRUEBAS.caso('J3 · completar un evento actualiza "lo que te toca ahora"', () => {
  /* El bloque se movió a #sections y quedó fuera del alcance de renderInicio(), que es lo que
     llama mark(). La persona completaba un paso y la app le seguía pidiendo el mismo. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const leer = () => (document.querySelector('.cic-mio .ini-ahora-t') || {}).textContent || '';
  const pasos = [leer()];
  ['op_salir_casa', 'op_lleg_aero', 'op_salir_aero'].forEach(id => { mark(id); pasos.push(leer()); });

  PRUEBAS.cierto(pasos[0], 'un piloto tiene que ver el bloque del ciclo');
  PRUEBAS.igual(new Set(pasos).size, pasos.length,
    'cada evento completado tiene que pedir el SIGUIENTE paso; si se repite, la app pide dos veces lo mismo');
});

PRUEBAS.caso('J2 · el desplegable no corta contenido, ni con todas las métricas', async () => {
  /* Puse `max-height: 240px` afirmando que "el contenido está acotado y alcanza". Medido en el
     peor caso real: 984 px. Todo lo que pasaba de 240 quedaba cortado, sin scroll ni aviso. */
  CTX.resetear();
  const viejo = new Date(Date.now() - 30 * 86400000);
  const f = viejo.getFullYear() + '-' + String(viejo.getMonth() + 1).padStart(2, '0') + '-' + String(viejo.getDate()).padStart(2, '0');
  const mdPrevio = window.misDatos, ctxPrevio = window.misCtx;
  window.misDatos = () => ({ registros: [{ fecha: f, kss: 8, estres: 60, ansiedad: 30, fatiga: 9, gastro: 14, depresion: 50, cansancio: 25, confiable: true }], pvt: [] });
  window.misCtx = () => ({ metrics: ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'],
    ref: { kss: 6, estres: 36, ansiedad: 25, fatiga: 7.3, gastro: 11, depresion: 42, cansancio: 19 }, emp: 'E' });

  localStorage.setItem('silva_fatiga_ini_estado_abierto_v1', '1');
  renderInicio();
  const b = document.getElementById('iniEstBody');
  /* ⚠️ HAY QUE ESPERAR. El `max-height` no se aplica en el mismo tick que `renderInicio()`: se
     calcula desde `scrollHeight` un instante después, para que la apertura pueda animarse desde 0.
     Medido: justo después del render el max-height es 0px y el alto visible 15; a los ~400 ms es
     218 y coincide con el contenido.
     Esta prueba pasaba POR SUERTE DE TIEMPOS y empezó a fallar cuando otros casos corrieron antes y
     movieron el reloj. Una prueba que depende de la velocidad de la máquina es peor que una que
     falla: hace desconfiar de toda la suite. */
  await new Promise(r => setTimeout(r, 450));
  const visible = b.getBoundingClientRect().height, real = b.scrollHeight;
  window.misDatos = mdPrevio; window.misCtx = ctxPrevio;

  PRUEBAS.alMenos(real, 100, 'con las 7 métricas el contenido tiene que ser grande, o el caso no prueba nada');
  PRUEBAS.cierto(visible + 1 >= real,
    'el contenedor es overflow:hidden: lo que no entra se pierde sin scroll ni aviso ' +
    '(visible ' + Math.round(visible) + ' vs contenido ' + real + ')');
});

PRUEBAS.caso('J2 · sigue sin cortar al cambiar el ancho', () => {
  /* La altura se fija en píxeles al abrir; al rotar el teléfono el contenido reflowea y la cota
     queda vieja. Medido: de 320 a 240 px se perdían 128 px. */
  CTX.resetear();
  localStorage.setItem('silva_fatiga_ini_estado_abierto_v1', '1');
  renderInicio();
  const b = document.getElementById('iniEstBody');
  /* Se dispara el mismo evento que dispara una rotación. Si el listener no estuviera, la cota
     quedaría con el valor viejo. */
  window.dispatchEvent(new Event('resize'));
  PRUEBAS.igual(b.style.maxHeight, b.scrollHeight + 'px',
    'al rotar el teléfono la altura tiene que volver a medirse, o el contenido queda cortado');
});

PRUEBAS.caso('J6 · el subtítulo y la nota de Apariencia siguen el idioma', () => {
  /* `aplicarIdioma()` no repintaba el control del tema: con la app en inglés decía "Oscuro" y en
     español "Light". Era cosmético mientras el bloque estaba abierto; al colapsarlo en J6, ese
     subtítulo pasó a ser LO ÚNICO que dice qué está elegido. */
  CTX.resetear();
  const idiomaPrevio = idiomaActual(), temaPrevio = temaGuardado();
  const leer = () => ({
    sub: (document.getElementById('temaLbl') || {}).textContent || '',
    nota: (document.getElementById('temaNota') || {}).textContent || ''
  });

  fijarTema('oscuro'); fijarIdioma('es');
  const es = leer();
  fijarIdioma('en');
  const en = leer();
  fijarIdioma(idiomaPrevio); fijarTema(temaPrevio || 'claro');

  PRUEBAS.falso(es.sub === en.sub,
    'el subtítulo tiene que cambiar de idioma: colapsado es lo único que indica qué tema está puesto');
  PRUEBAS.falso(es.nota === en.nota,
    'la nota también: estaba escrita en español a mano en el JS y pisaba su data-i18n (R14)');
});

PRUEBAS.caso('J5 · los bloques del inicio quedan visibles sin animaciones', () => {
  /* Los animé desde `opacity:0`. La clase `.sin-animaciones` (pestaña oculta o menos movimiento)
     fuerza el estado final visible SÓLO sobre una lista de selectores, y `.view` no alcanza para
     sus descendientes. Sin sumarlos, quedarían invisibles PARA SIEMPRE. */
  CTX.resetear();
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  renderInicio();
  const invisibles = [];
  ['.ini-firmada', '.ini-estado', '.ini-ahora', '.ini-tiras'].forEach(sel => {
    const e = document.querySelector('#inicio ' + sel);
    if (e && parseFloat(getComputedStyle(e).opacity) < 0.99) invisibles.push(sel);
  });
  if (!tenia) document.documentElement.classList.remove('sin-animaciones');

  PRUEBAS.igual(invisibles, [],
    'con la pestaña en segundo plano el reloj de animaciones no avanza: lo que arranque en opacity:0 ' +
    'y no esté forzado a visible se queda invisible para siempre');
});

PRUEBAS.caso('J5 · la animación de entrada no se repite en cada toque', () => {
  /* `renderInicio()` rehace el HTML en cada `mark()`. Sin la bandera de primera pintada, los
     bloques volverían a animarse en cada evento completado: peor que no animarlos. */
  CTX.resetear();
  const cont = document.getElementById('inicio');
  renderInicio();
  const tras2 = cont.classList.contains('ini-entra');
  renderInicio();
  const tras3 = cont.classList.contains('ini-entra');
  PRUEBAS.falso(tras2 || tras3,
    'después de la primera pintada no puede volver a animarse: parpadearía en cada toque');
});
