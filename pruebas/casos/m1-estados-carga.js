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
  /* Se busca `.sk-wrap`, que es el envoltorio que ponen TODAS las formas de esqueleto, y no `.sk`:
     esa era la clase de los rectángulos genéricos, y tareas pasó a usar la forma `persona` (que
     dibuja `.skc`). Atar la prueba a la clase de UNA forma la hacía fallar por un cambio que en
     pantalla es una mejora. */
  PRUEBAS.alMenos(cont.querySelectorAll('.sk-wrap').length, 1,
    'con la red colgada tiene que verse el esqueleto, no una pantalla en blanco ni un "no hay nada" falso');
  PRUEBAS.alMenos(cont.querySelectorAll('.skc, .sk').length, 1, 'y con piezas adentro, no vacío');
});

PRUEBAS.grupo('N9 · cargador y bloqueo generalizado');

PRUEBAS.caso('el cargador hereda el color, no lo trae escrito', () => {
  /* R13, y además es lo que lo hace servir en todos lados con una sola regla: dentro de un botón
     naranja, sobre una tarjeta clara o sobre el navy del splash. Un color fijo habría necesitado
     una variante por contexto y por tema. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const regla = (fuente.match(/\.cargador i \{[^}]*\}/) || [''])[0];
  PRUEBAS.cierto(/background:\s*currentColor/.test(regla),
    'los cuadraditos toman el color del contexto: ' + regla.slice(0, 90));
  PRUEBAS.falso(/#[0-9a-fA-F]{3,6}/.test(regla), 'y no traen ningún color escrito a mano');
});

PRUEBAS.caso('el cargador se queda quieto sin animaciones, pero sigue estando', () => {
  const d = document.createElement('div');
  d.innerHTML = cargandoHtml('probando');
  document.body.appendChild(d);
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  const pieza = d.querySelector('.cargador i');
  const anim = getComputedStyle(pieza).animationName;
  const op = parseFloat(getComputedStyle(pieza).opacity);
  const alto = d.querySelector('.cargador').getBoundingClientRect().height;
  if (!tenia) document.documentElement.classList.remove('sin-animaciones');
  d.remove();
  PRUEBAS.igual(anim, 'none', 'sin movimiento');
  PRUEBAS.alMenos(op, 0.4, 'pero visible: un cargador en opacidad .3 fija parece apagado');
  PRUEBAS.alMenos(alto, 10, 'y ocupando su lugar');
});

PRUEBAS.caso('los esqueletos tienen la forma de lo que va a llegar', () => {
  /* La diferencia entre "algo está cargando" y "esto es lo que viene y acá va". Si el esqueleto
     no ocupa aproximadamente el lugar del contenido, al llegar salta todo. */
  const d = document.createElement('div');
  d.innerHTML = skeletonHtml('persona', 3);
  document.body.appendChild(d);
  const cajas = d.querySelectorAll('.skc');
  const circulo = d.querySelector('.skc-circulo');
  const alto = cajas[0] ? cajas[0].getBoundingClientRect().height : 0;
  d.remove();
  PRUEBAS.igual(cajas.length, 3, 'una caja por fila pedida');
  PRUEBAS.cierto(!!circulo, 'la forma "persona" tiene su redondel de avatar');
  PRUEBAS.alMenos(alto, 50, 'y la caja ocupa alto real');
});

PRUEBAS.caso('el hueco del gráfico se ve como un gráfico', () => {
  /* Un rectángulo plano dice "algo viene"; unas barras dicen "acá viene un gráfico". */
  const d = document.createElement('div');
  d.innerHTML = dashEsqueleto();
  document.body.appendChild(d);
  const barras = d.querySelectorAll('.dsk-barras > i');
  const distintas = new Set([...barras].map(b => b.getAttribute('style')));
  d.remove();
  PRUEBAS.alMenos(barras.length, 4, 'tiene que haber barras');
  PRUEBAS.alMenos(distintas.size, 3, 'de alto distinto, o se lee como una tabla y no como un gráfico');
});

PRUEBAS.caso('⚠️ el esqueleto no cambia entre pintadas', () => {
  /* Si las alturas salieran de Math.random(), la pantalla temblaría en cada repintado mientras
     espera — y el panel repinta varias veces. Tienen que ser fijas. */
  PRUEBAS.igual(dashEsqueleto(), dashEsqueleto(),
    'dos pintadas seguidas tienen que dar exactamente lo mismo');
});

PRUEBAS.caso('⚠️ conCarga suelta el bloqueo también cuando el pedido falla', async () => {
  /* Es la regla que permite bloquear sin miedo: un bloqueo pegado por un error de red deja la
     pantalla muerta y sin explicación, peor que no bloquear.
     ⚠️ La primera versión de esta prueba guardaba el resultado en una variable desde un `.then`
     suelto y fallaba por carrera de microtareas — no por el código. Con `await` el orden queda
     explícito y la prueba deja de depender de en qué tick corre cada callback. */
  const el = document.createElement('div');
  el.innerHTML = '<button>x</button>';
  document.body.appendChild(el);

  const p1 = conCarga(el, Promise.resolve('bien'));
  PRUEBAS.cierto(el.hasAttribute('inert'), 'mientras corre, la zona queda fuera de alcance');
  await p1;
  PRUEBAS.falso(el.hasAttribute('inert'), 'al terminar bien se libera');

  let tiro = false;
  try { await conCarga(el, Promise.reject(new Error('sin red'))); } catch(e){ tiro = true; }
  PRUEBAS.cierto(tiro, 'el error tiene que seguir propagándose: conCarga no se lo puede comer');
  PRUEBAS.falso(el.hasAttribute('inert'), 'y al fallar TAMBIÉN se libera, o la pantalla queda muerta');
  PRUEBAS.igual(el.getAttribute('aria-busy'), null, 'sin dejar el aria-busy pegado');
  el.remove();
});

PRUEBAS.caso('las pantallas que traen listas quedan bloqueadas mientras cargan', () => {
  /* El reclamo era poder "tocar botones o hacer otras cosas mientras carga". `cargaBloquear`
     existía desde M1 pero se usaba en UN solo lugar de 34 llamadas de red. */
  PRUEBAS.cierto(/conCarga\(/.test(tareasRefrescar.toString()),
    'la hoja de tareas: se podía tocar "Actualizar" tres veces y encimar pedidos');
  PRUEBAS.cierto(/conCarga\(/.test(nominaListCargar.toString()),
    'la nómina: se podía escribir en el buscador y filtrar sobre una lista que no existía todavía');
});
