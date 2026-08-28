/* ── M1 · Que la espera se vea y no se pueda romper ─────────────────────────────────────────────
   (2026-08-27)

   El piso de Apps Script es ~1,3 s y el login del supervisor tarda 2,5–5 s (medido contra
   producción). Eso no se puede optimizar. Lo que sí: que durante esos segundos la app no parezca
   rota y no se deje tocar.

   El pedido del usuario fue literal: "imposibilitar tocar botones o hacer otras cosas mientras
   carga… o esqueletos esos que usan las apps caras". */

PRUEBAS.grupo('M1 · esqueletos');

PRUEBAS.caso('el esqueleto ocupa el lugar de lo que va a llegar', () => {
  /* Un spinner dice "esperá"; un esqueleto dice "esto es lo que va a aparecer y dónde". Si no
     tuviera alto, la pantalla seguiría viéndose vacía y no serviría de nada. */
  const d = document.createElement('div');
  d.innerHTML = skeletonHtml('tarjeta', 3);
  document.body.appendChild(d);
  const piezas = d.querySelectorAll('.sk');
  const alto = piezas[0] ? piezas[0].getBoundingClientRect().height : 0;
  const oculto = d.querySelector('.sk-wrap').getAttribute('aria-hidden');
  d.remove();
  PRUEBAS.igual(piezas.length, 3, 'tiene que dibujar las piezas que se le piden');
  PRUEBAS.alMenos(alto, 40, 'y ocupar alto real: un esqueleto de 0 px no comunica nada');
  PRUEBAS.igual(oculto, 'true',
    'para un lector de pantalla es ruido: lo que anuncia la carga es aria-busy, no esto');
});

PRUEBAS.caso('sin animaciones el esqueleto sigue estando', () => {
  /* La app tiene un modo sin animaciones (pestaña oculta o `prefers-reduced-motion`). El brillo
     se apaga, pero el bloque tiene que quedar: es el que dice dónde va a aparecer el contenido. */
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  const d = document.createElement('div');
  d.innerHTML = skeletonHtml('tarjeta', 2);
  document.body.appendChild(d);
  const pieza = d.querySelector('.sk');
  const alto = pieza.getBoundingClientRect().height;
  const brillo = getComputedStyle(pieza, '::after').animationName;
  d.remove();
  if (!tenia) document.documentElement.classList.remove('sin-animaciones');
  PRUEBAS.alMenos(alto, 40, 'el bloque sigue ocupando su lugar');
  PRUEBAS.igual(brillo, 'none', 'pero sin movimiento, respetando el modo que la app ya tenía');
});

PRUEBAS.grupo('M1 · bloqueo durante la carga');

PRUEBAS.caso('mientras carga, no se puede tocar ni tabular a la zona', () => {
  /* ⚠️ Se usa `inert` y no `pointer-events:none` a propósito: `inert` la saca del alcance del
     mouse, del TECLADO y del lector de pantalla a la vez. Con `pointer-events` alguien puede
     seguir tabulando hasta un botón que no ve y activarlo — que es exactamente lo que el usuario
     describe cuando dice que puede tocar otras cosas mientras carga. */
  const gate = document.getElementById('portalGate');
  PRUEBAS.cierto('inert' in HTMLElement.prototype, 'el navegador tiene que soportar inert');
  cargaBloquear(gate, true);
  PRUEBAS.igual(gate.getAttribute('aria-busy'), 'true',
    'aria-busy es lo que le anuncia la carga a quien no ve la pantalla');
  PRUEBAS.cierto(gate.hasAttribute('inert'), 'y inert es lo que impide tocarla de verdad');
  const btn = gate.querySelector('button');
  if (btn){ btn.focus(); PRUEBAS.falso(document.activeElement === btn, 'ni con el teclado se puede llegar a un botón de adentro'); }
  cargaBloquear(gate, false);
  PRUEBAS.falso(gate.hasAttribute('inert'), 'y al terminar se libera');
  PRUEBAS.igual(gate.getAttribute('aria-busy'), null, 'sin dejar el aria-busy pegado');
});

PRUEBAS.caso('⚠️ el bloqueo se levanta TAMBIÉN cuando el pedido falla', () => {
  /* Un bloqueo que queda pegado por un error de red deja la pantalla muerta y sin explicación —
     peor que no bloquear. Se comprueba sobre el código: el `catch` del login tiene que soltarlo. */
  const fuente = portalLoginSupervisor.toString();
  const idxCatch = fuente.indexOf('.catch(');
  PRUEBAS.alMenos(idxCatch, 1, 'el login tiene que tener un catch');
  PRUEBAS.cierto(fuente.slice(idxCatch).indexOf('cargaBloquear') > 0,
    'si el catch no lo libera, un corte de red deja el formulario inutilizable para siempre');
});

PRUEBAS.grupo('M1 · la lista de tareas');

PRUEBAS.caso('no dice "no tienes tareas" antes de haber preguntado', () => {
  /* `tareasAbrir()` llamaba a `tareasPintar()` con la lista todavía vacía, y eso escribe
     "no tienes tareas". O sea que la app afirmaba que no había nada ANTES de ir a preguntar —
     y con un pedido de 4 a 5 segundos, eso es lo primero que alguien lee. */
  const fuente = tareasAbrir.toString();
  PRUEBAS.cierto(/if\s*\(\s*TAREAS\.lista\.length\s*\)\s*tareasPintar\(\)/.test(fuente),
    'sólo se pinta de entrada si HAY algo que pintar; si no, va el esqueleto');
});

PRUEBAS.caso('mientras carga muestra el esqueleto, no un texto', () => {
  CTX.resetear({ nombre: 'Ana Prueba' });
  TAREAS.lista = [];
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});     // la red nunca contesta
  try { tareasRefrescar(); } finally { window.fetch = oFetch; TAREAS.cargando = false; }
  const cont = document.getElementById('tareasLista');
  PRUEBAS.alMenos(cont.querySelectorAll('.sk').length, 1,
    'con la red colgada tiene que verse el esqueleto, no una pantalla en blanco ni un "no hay nada" falso');
});
