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

PRUEBAS.grupo('N9 · campos del formulario');

PRUEBAS.caso('⚠️ la flecha del desplegable sigue al tema', async () => {
  /* Estaba dibujada dentro del data-URI con `stroke='%23aab'`: un gris fijo, el mismo en los dos
     temas (R13). Medido, ese gris daba **2.21 sobre el campo claro** — por debajo del mínimo de 3
     que pide un elemento no textual — y 6.84 sobre el oscuro. O sea que el bug estaba en el tema
     por defecto, que es el que ve casi todo el mundo.
     No se puede resolver con `mask` sobre el propio `<select>`: la máscara recorta el elemento
     entero y se lleva puesto el texto de la opción. Por eso el token es la imagen completa, una
     por tema. */
  const lum = c => { const m = (c.match(/[\d.]+/g) || [0,0,0]).map(Number);
    const f = x => { x = x/255; return x <= .03928 ? x/12.92 : Math.pow((x + .055)/1.055, 2.4); };
    return .2126*f(m[0]) + .7152*f(m[1]) + .0722*f(m[2]); };
  const hex = h => { h = h.replace('#',''); if (h.length === 3) h = h.split('').map(c => c+c).join('');
    return 'rgb(' + parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16) + ')'; };
  const ct = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A,B) + .05) / (Math.min(A,B) + .05); };

  const ov = document.getElementById('setup');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const sel = document.querySelector('.field select');
  PRUEBAS.cierto(!!sel, 'tiene que haber al menos un desplegable para medir');

  const tema0 = document.documentElement.getAttribute('data-tema');
  const flojas = [], vistas = new Set();
  /* ⚠️ Cambiar `data-tema` no actualiza `background-image` en el mismo tick: la imagen sale de una
     variable y el navegador la vuelve a resolver recién en el próximo recálculo. Sin forzarlo, los
     dos temas devuelven el MISMO valor y la prueba acusa un bug que no existe — me pasó.
     `void sel.offsetHeight` fuerza el recálculo; la espera le da tiempo a que se aplique. */
  for (const tema of ['claro', 'oscuro']) {
    document.documentElement.setAttribute('data-tema', tema);
    void sel.offsetHeight;
    await new Promise(r => setTimeout(r, 120));
    const cs = getComputedStyle(sel);
    const m = (cs.backgroundImage || '').match(/stroke='%23([0-9a-fA-F]{3,6})'/);
    if (!m){ flojas.push(tema + ': no se encontró la flecha'); return; }
    vistas.add(m[1]);
    const c = ct(hex(m[1]), cs.backgroundColor);
    if (c < 3) flojas.push(tema + ': ' + c.toFixed(2) + ':1');
  }
  if (tema0) document.documentElement.setAttribute('data-tema', tema0);
  if (!yaAbierto) ov.classList.remove('show');

  PRUEBAS.igual(flojas, [], 'la flecha tiene que verse sobre el campo en los dos temas');
  PRUEBAS.igual(vistas.size, 2,
    'y ser DISTINTA en cada tema: si es la misma, vuelve a estar escrita a mano y uno de los dos pierde');
});

PRUEBAS.caso('el campo enfocado se distingue de un vistazo', () => {
  /* ⚠️ No se puede comprobar sobre `:focus` en este entorno: la ventana nunca tiene el foco
     (`document.hasFocus()` da false), así que el selector no engancha aunque `activeElement` sea
     el campo. Se me fue un rato averiguando eso. Se comprueba entonces sobre la regla.
     Por qué importa: son doce campos en un teléfono, y saber en cuál estás parado tiene que
     costar cero. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  PRUEBAS.cierto(/\.field input:focus, \.field select:focus \{[^}]*box-shadow: 0 0 0 3px var\(--orange-bg\)/.test(fuente),
    'el campo enfocado necesita un halo, no sólo un cambio de borde de 1.5 px');
  PRUEBAS.cierto(/\.field:has\(input:focus\) label[^{]*\{[^}]*color: var\(--orange-legible\)/.test(fuente),
    'y su etiqueta acompaña, para no tener que buscar dónde estás parado');
  PRUEBAS.falso(/box-shadow: 0 0 0 3px #[0-9a-f]/i.test(fuente), 'sin colores escritos a mano (R13)');
});

PRUEBAS.grupo('Q1 · mientras carga, no se puede tocar nada');

/* EL RECLAMO, TEXTUAL: "doy a entrar a... y puedo tocar salir, o moverme de supervisor cargando a
   médico y le doy a entrar también".
   Se lo devolví "arreglado" DOS VECES antes de entender por qué se escapaba: `cargaBloquear` existía
   desde M1, pero había que ACORDARSE de llamarlo en cada sitio de red. Medido: se usaba en 2 de 31
   funciones. No era descuido de una persona; era un diseño que dependía de la memoria.
   Por eso el arreglo no fue agregar llamadas sueltas sino `conBloqueo()`, que bloquea en la misma línea
   del pedido — y estas pruebas, que fallan si aparece un sitio nuevo sin bloqueo. */

/* ⚠️ CÓMO SE COMPRUEBA QUE ALGO ESTÁ BLOQUEADO, porque me equivoqué dos veces antes de acertar:
   · `elementFromPoint()` NO sirve: es una consulta geométrica y devuelve el elemento igual, esté
     `inert` o no.
   · `elemento.click()` TAMPOCO: un click programático atraviesa `inert`. Sólo lo frena el input real.
   · Lo que SÍ funciona es el FOCO: `inert` saca a todos los descendientes del alcance del teclado.
     Es además lo que más importa, porque es el agujero que `pointer-events:none` deja abierto. */
function q1Alcanza(el){
  if (!el) return null;
  document.body.focus();
  el.focus();
  return document.activeElement === el;
}

PRUEBAS.caso('⚠️ con el login cargando, nada de la pantalla recibe el foco', () => {
  /* ⚠️ Hay que ABRIR el portal antes de medir: un elemento dentro de un overlay cerrado no es
     enfocable, así que sin esto la comprobación de control daría rojo por el motivo equivocado.
     ⚠️ Y se abre A MANO, no con `splashPortal()`: esa función cambia media app (esconde el splash,
     reordena pestañas, toca el bloqueo de scroll y apila historial) y ese estado se filtra a los
     casos que corren después. Me pasó: rompió CUATRO pruebas ajenas que no tenían nada que ver.
     Un caso toca lo mínimo y devuelve todo como estaba. */
  const ov = document.getElementById('portalOverlay');
  const yaAbierto = ov.classList.contains('show');
  const gateAntes = document.getElementById('portalGate').style.display;
  const supAntes = document.getElementById('portalSup').style.display;
  ov.classList.add('show');
  document.getElementById('portalGate').style.display = '';
  document.getElementById('portalSup').style.display = '';
  const gate = document.getElementById('portalGate');
  const campo = document.getElementById('pEmpresa');
  const cerrar = document.querySelector('#portalGate .portal-x');
  const pestana = document.getElementById('ptabMed');
  PRUEBAS.cierto(!!(gate && campo && cerrar && pestana), 'tienen que existir los controles a probar');

  cargaBloquear(gate, true);
  const bloqueado = { campo: q1Alcanza(campo), cerrar: q1Alcanza(cerrar), pestana: q1Alcanza(pestana) };
  cargaBloquear(gate, false);
  const suelto = { campo: q1Alcanza(campo), cerrar: q1Alcanza(cerrar), pestana: q1Alcanza(pestana) };

  const siguenVivos = Object.keys(bloqueado).filter(k => bloqueado[k]);
  PRUEBAS.igual(siguenVivos, [],
    'con el pedido en vuelo no se puede llegar a cerrar, ni cambiar de pestaña, ni reenviar');

  /* El control que hace que la prueba valga: si sin bloqueo TAMPOCO se llega, la comprobación de
     arriba pasaría por el motivo equivocado y no estaría probando nada. */
  const muertos = Object.keys(suelto).filter(k => !suelto[k]);
  if (!yaAbierto) ov.classList.remove('show');
  document.getElementById('portalGate').style.display = gateAntes;
  document.getElementById('portalSup').style.display = supAntes;
  document.body.focus();
  PRUEBAS.igual(muertos, [],
    'sin bloqueo los mismos controles SÍ reciben foco: si no, la comprobación de arriba no prueba nada');
});

PRUEBAS.caso('⚠️ el bloqueo se suelta también cuando el pedido falla', async () => {
  /* Un bloqueo pegado por un error de red deja la pantalla muerta y sin explicación: peor que no
     bloquear. Es la razón por la que existe `conCarga` en vez de dos llamadas sueltas. */
  const el = document.createElement('div');
  el.innerHTML = '<button>x</button>';
  document.body.appendChild(el);

  await conBloqueo(el, Promise.resolve('bien'));
  PRUEBAS.falso(el.hasAttribute('inert'), 'al terminar bien se libera');

  let tiro = false;
  try { await conBloqueo(el, Promise.reject(new Error('sin red'))); } catch(e){ tiro = true; }
  PRUEBAS.cierto(tiro, 'el error tiene que seguir propagándose: conBloqueo no se lo puede comer');
  PRUEBAS.falso(el.hasAttribute('inert'), 'y al fallar TAMBIÉN se libera');
  PRUEBAS.igual(el.getAttribute('aria-busy'), null, 'sin dejar el aria-busy pegado');
  el.remove();
});

PRUEBAS.caso('⚠️ ninguna acción de red que dispara la persona quedó sin bloquear', () => {
  /* ESTE es el caso que evita que vuelva a pasar. Recorre el código fuente buscando las funciones
     que llaman al servidor y comprueba que las que arranca la persona bloqueen su zona.
     La lista de EXCEPCIONES es explícita a propósito: son las que corren solas en segundo plano y
     que bloquear sería un error (la cola de envíos tiene que poder vaciarse mientras la persona
     usa la app). Si alguien agrega una función de red nueva, o no está acá o tiene que bloquear. */
  const FONDO = [
    'fetchConReloj', 'dashRequest',          // la cañería misma
    'enviarConCola', 'empFlush', 'gestPost', 'gestPush', 'misSincronizar', 'consentSync',
    'flushPending',                          // colas que se vacían solas: bloquear sería el bug
    'dashRefresh', 'tareasCargar', 'tareasFichaCargar', 'empresaPerfilCargar',
    'loadSetupLists', 'nominaAbrir', 'recuperarAbrir', 'dashLoadInformes',
    'validarSupervisorCreds', 'simEntrar', 'sectorRefrescar', 'cicloTick',
    /* S4: cambia la contraseña guardada por un token, sola, después de un auto-login que ya
       funcionó. La persona no la pidió ni sabe que existe — congelarle el panel recién abierto por
       una migración invisible sería justo lo contrario de lo que este caso protege. Y si falla no
       pasa nada: queda como estaba y se reintenta la próxima vez.
       ⚠️ `sesionAvisarCierre` NO está en esta lista y no tiene que estar: no bloquea porque la
       pantalla se está yendo igual (`cerrarSesion` recarga), y no espera respuesta a propósito
       para que cerrar sesión funcione también sin señal. */
    'dashMigrarCredsAToken',
    /* Aparecieron al incluir `async function` en el barrido: corren solas, no las dispara nadie. */
    'sincronizarRegistro',
    /* ⚠️ Y5 · `ausTocar` SÍ la dispara la persona, y aun así no bloquea — es la única de la lista
       con esa forma, y por eso la justificación tiene que ser explícita.
       Es una acción OPTIMISTA: la pantalla ya respondió (la fila se repinta en el acto) y el pedido
       viaja detrás. El supervisor marca a varias personas seguidas, y bloquear la pantalla los 3-5 s
       que tarda el endpoint por CADA una lo haría abandonar a la tercera — y un dato que nadie carga
       es peor que no tenerlo, porque los porcentajes quedan iguales y uno cree que están corregidos.
       Lo que la hace segura no es el bloqueo sino la REVERSIÓN: si el servidor falla, el cambio se
       deshace y se avisa. Hay un caso que lo verifica en `y5-de-guardia.js` ("si el guardado FALLA,
       la pantalla se revierte"). Si esa reversión se rompe, esta excepción deja de ser válida. */
    'ausTocar'
  ];

  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  const lineas = fuente.split('\n');

  // rangos de las funciones declaradas en columna 0
  const rangos = [];
  for (let i = 0; i < lineas.length; i++) {
    /* ⚠️ `async` INCLUIDO. El patrón exigía que la línea empezara con `function`, así que este
       trinquete no veía NINGUNA función declarada `async function` — hoy hay dos y una pide a la
       red. O sea que alcanzaba con escribir `async` adelante para que una acción sin bloqueo
       pasara desapercibida: el mismo defecto que este caso agarró el 2026-09-03, reintroducible
       con una palabra. */
    const m = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(lineas[i]);
    if (!m) continue;
    let prof = 0, j = i;
    while (j < lineas.length) {
      prof += (lineas[j].split('{').length - 1) - (lineas[j].split('}').length - 1);
      j++;
      if (prof <= 0 && j > i) break;
    }
    rangos.push({ nombre: m[1], desde: i, hasta: j });
    i = j - 1;
  }

  const sinBloqueo = [];
  rangos.forEach(r => {
    const cuerpo = lineas.slice(r.desde, r.hasta).join('\n');
    if (!/\b(dashRequest|fetchConReloj)\s*\(/.test(cuerpo)) return;
    if (FONDO.indexOf(r.nombre) >= 0) return;
    if (/\b(conBloqueo|conCarga|cargaBloquear)\s*\(/.test(cuerpo)) return;
    sinBloqueo.push(r.nombre);
  });

  /* ⚠️ GUARDA: el barrido tiene que haber encontrado algo. Si la regex deja de enganchar —o si el
     conteo de llaves se desincroniza y el recorrido salta hasta el final del archivo—, `sinBloqueo`
     queda vacío y el caso da VERDE sin haber mirado una sola función. */
  PRUEBAS.alMenos(rangos.length, 700,
    'el barrido tiene que encontrar las funciones del archivo; si encontró ' + rangos.length +
    ', la detección se rompió y este caso no está midiendo nada');
  PRUEBAS.igual(sinBloqueo, [],
    'estas funciones piden al servidor por una acción de la persona y no bloquean su pantalla: ' +
    'o se envuelven con conBloqueo(), o se agregan a la lista de las que corren en segundo plano');
});
