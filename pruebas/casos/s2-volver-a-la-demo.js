
PRUEBAS.grupo('S2 · entrar a la demo, salir y volver a entrar');

/* ⚠️ EL BUG, REPRODUCIDO PASO A PASO antes de tocar nada:
     1. tocar "Ver demostración con datos simulados"
     2. mientras carga (el endpoint tarda 2,5–5 s), tocar la ✕
     3. volver a abrir el portal e intentar entrar  →  **no pasa nada, nunca más**

   La causa: `closePortal()` llama a `cargaCancelar()`, así que cuando la respuesta llega
   `cargaVigente()` da false y el manejador hace `return`... ANTES de llegar al `btnSpin(btn,false)`
   que devuelve el botón a la vida. El botón queda `disabled` para siempre.

   ⚠️ Y era peor de lo que parece: el texto del botón vuelve solo a la normalidad (lo repinta el
   cambio de idioma / `portalMode`), así que se ve PERFECTAMENTE NORMAL y está muerto. Sin spinner,
   sin mensaje de error, sin ninguna pista. La única salida era recargar la página.

   ⚠️ Y NO SE ARREGLÓ tapándolo. Poner `disabled = false` al abrir el portal habría hecho pasar el
   caso de abajo dejando el mismo agujero en los otros cuatro caminos que usan este mecanismo — y en
   `portalLoginSupervisor` es peor todavía, porque ahí el `return` también saltea
   `cargaBloquear(gate,false)` y el panel de acceso ENTERO queda inerte.
   El arreglo va en el mecanismo: la carga registra qué hay que restaurar y cancelar lo restaura.
   Por eso los casos de acá prueban `cargaIniciar`/`cargaCancelar`, no un botón en particular:
   así cubren los cinco caminos, incluidos los que todavía no existen. */

function s2Pieza(){
  const btn = document.createElement('button'); btn.textContent = 'Entrar';
  const gate = document.createElement('div');
  document.body.appendChild(btn); document.body.appendChild(gate);
  return { btn, gate, limpiar(){ btn.remove(); gate.remove(); } };
}

PRUEBAS.caso('⚠️ cancelar una carga devuelve el botón a la vida', () => {
  /* EL CASO DEL BUG. Sin esto, salir mientras carga deja el botón muerto para siempre. */
  const p = s2Pieza();
  try {
    cargaIniciar({ btn: p.btn, gate: p.gate });
    btnSpin(p.btn, true, 'Abriendo ejemplo…');
    PRUEBAS.cierto(p.btn.disabled, 'mientras carga el botón tiene que estar bloqueado');
    cargaCancelar();
    PRUEBAS.falso(p.btn.disabled,
      '⚠️ al cancelar tiene que volver a funcionar: si queda bloqueado, la persona no puede ' +
      'volver a entrar nunca y no hay ninguna pista de por qué');
    PRUEBAS.igual(p.btn.textContent.trim(), 'Entrar', 'y con su texto original, sin el spinner');
    PRUEBAS.falso(p.btn.classList.contains('btn-loading'), 'ni la clase de "cargando" pegada');
  } finally { p.limpiar(); }
});

PRUEBAS.caso('⚠️ y también desbloquea el panel: ahí el bug era peor', () => {
  /* `portalLoginSupervisor` bloquea el formulario entero con `inert` mientras valida. Si se cancela
     en ese momento, antes quedaba INERTE: ni el botón ni los campos ni el teclado respondían, y no
     se veía nada raro. Es el mismo agujero, con más superficie. */
  const p = s2Pieza();
  try {
    cargaIniciar({ btn: p.btn, gate: p.gate });
    cargaBloquear(p.gate, true);
    PRUEBAS.cierto(p.gate.hasAttribute('inert'), 'mientras valida, el panel está inerte a propósito');
    cargaCancelar();
    PRUEBAS.falso(p.gate.hasAttribute('inert'),
      '⚠️ al cancelar el panel tiene que volver a responder — inerte y sin aviso es una pantalla muerta');
    PRUEBAS.falso(p.gate.hasAttribute('aria-busy'), 'y sin quedar anunciado como ocupado al lector de pantalla');
  } finally { p.limpiar(); }
});

PRUEBAS.caso('⚠️ la respuesta que llega tarde SIGUE descartándose', () => {
  /* El control que impide "arreglar" esto rompiendo lo que ya estaba bien. `cargaVigente` existe
     porque una respuesta vieja que pinta encima de la pantalla actual fue un bug reportado
     ("se rompe todo y se buguea"). Limpiar la UI al cancelar NO puede volver vigente esa respuesta.
     Si este caso se pusiera verde al revés, habríamos cambiado un bug por otro peor. */
  const p = s2Pieza();
  try {
    const carga = cargaIniciar({ btn: p.btn, gate: p.gate });
    cargaCancelar();
    PRUEBAS.falso(cargaVigente(carga),
      'una carga cancelada no puede seguir siendo vigente: su respuesta tiene que descartarse');
  } finally { p.limpiar(); }
});

PRUEBAS.caso('⚠️ el caso discrimina: sin registrar la UI, cancelar no restauraría nada', () => {
  /* Prueba de que los casos de arriba miden el arreglo y no una casualidad. Si `cargaIniciar` se
     llamara sin decir qué restaurar —como estaba antes en los cinco caminos—, el botón quedaría
     bloqueado. Es exactamente el estado viejo, reproducido a propósito. */
  const p = s2Pieza();
  try {
    cargaIniciar();                       // sin `{btn, gate}`: la forma vieja
    btnSpin(p.btn, true, 'Cargando…');
    cargaCancelar();
    PRUEBAS.cierto(p.btn.disabled,
      'sin registrar la UI el botón queda bloqueado — que es el bug. Si esto diera falso, los ' +
      'casos de arriba estarían pasando por otra razón y no por el arreglo');
  } finally { p.limpiar(); }
});

PRUEBAS.caso('cancelar sin nada en vuelo no rompe', () => {
  let exploto = false;
  try { cargaIniciar(); cargaCancelar(); cargaCancelar(); } catch(e){ exploto = true; }
  PRUEBAS.falso(exploto, 'cerrar el portal sin ninguna carga en curso es lo más común de todo');
});

PRUEBAS.caso('⚠️ los cinco caminos registran qué restaurar', () => {
  /* Esto SÍ mira el código fuente, y es a propósito: lo que se vigila es que ningún camino nuevo
     vuelva a llamar `cargaIniciar()` a secas. El comportamiento ya está probado arriba; acá lo que
     importa es que nadie quede afuera del mecanismo, y eso no se puede observar desde el DOM. */
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const sueltas = (js.match(/cargaIniciar\(\s*\)/g) || []).length;
  PRUEBAS.igual(sueltas, 0,
    'ningún camino puede iniciar una carga sin decir qué hay que restaurar si se cancela ' +
    '(encontradas: ' + sueltas + ')');
});
