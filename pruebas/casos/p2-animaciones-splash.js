
PRUEBAS.grupo('P2 · las animaciones del splash arrancan al llegar, no antes');

/* LO QUE SE REPORTÓ, textual: "apenas se desliza, antes de ejecutar la animación aparece completa y
   luego arranca de 0". Sólo tenía que pasar lo segundo.

   POR QUÉ PASABA. Hay una decisión de fondo que sigue en pie: el estado EN REPOSO de cada pieza es
   el VISIBLE, y lo que oculta es el `from` del keyframe. Así, si la animación no llega a correr
   —JS caído, movimiento reducido— la pantalla se ve completa igual, en vez de quedar en blanco.
   El problema era CUÁNDO se ponía la clase que dispara: un `setTimeout` de 560 ms. Durante todo el
   deslizamiento la pantalla entrante no tenía animación, o sea que se veía en reposo, o sea
   COMPLETA. Y al cumplirse el temporizador arrancaba de cero. Las dos mitades del reclamo.

   CÓMO SE ARREGLÓ, y por qué así. La espera pasó a ser un `animation-delay` en CSS (`--spl-in`).
   Con `fill: both`, durante el retraso se ve el `from` del propio keyframe. Se evaluó y se descartó
   una segunda clase "preparada" que pusiera cada pieza en su estado inicial: obligaba a repetir el
   `from` de cada keyframe en otro lugar —dos verdades que se desincronizan— y si ese segundo cambio
   de clase se perdía dejaba la pantalla EN BLANCO, justo lo que la decisión de arriba evita.

   ⚠️ CÓMO SE MIDE ACÁ. La pestaña está oculta de forma permanente, así que las animaciones no
   avanzan solas y esperar no sirve de nada. Se usa la API de animaciones: se congela cada una en un
   instante ELEGIDO (`pause()` + `currentTime`) y se lee el estilo calculado. Es determinista y no
   depende del reloj. Y hay que sacar `.sin-animaciones` a mano, porque con esa clase no existe
   ninguna animación que medir. */

const P2_DESLIZ = 560;   // lo que tarda la tira en deslizarse; ninguna animación puede arrancar antes

/* Deja el splash medible y DEVUELVE TODO COMO ESTABA. Se evita llamar a `splashAnimArrancar()` o a
   `splashAnimFrenar()` a propósito: son funciones con estado global y ya rompieron cuatro casos
   ajenos una vez. Acá se toca sólo lo mínimo y se restaura. */
function p2Medir(fn){
  const html = document.documentElement;
  const ov = document.getElementById('splashOv');
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  const eraQuieto = html.classList.contains('sin-animaciones');
  const eraAbierto = ov && ov.classList.contains('show');
  const tenian = slides.map(s => s.classList.contains('spl-activa'));
  if (ov) ov.classList.add('show');
  html.classList.remove('sin-animaciones');
  slides.forEach(s => s.classList.add('spl-activa'));
  void document.body.offsetWidth;                 // que el estilo esté recalculado antes de medir
  try { return fn(slides); }
  finally {
    slides.forEach((s, i) => s.classList.toggle('spl-activa', tenian[i]));
    if (eraQuieto) html.classList.add('sin-animaciones');
    if (ov && !eraAbierto) ov.classList.remove('show');
  }
}

/* Congela todas las animaciones de un elemento en `t` y devuelve su estilo visible. */
function p2Foto(el, t){
  const as = el.getAnimations();
  if (!as.length) return null;
  as.forEach(a => { a.pause(); a.currentTime = t; });
  const cs = getComputedStyle(el);
  return { op: +(+cs.opacity).toFixed(3), tr: cs.transform, dash: cs.strokeDashoffset || '' };
}

PRUEBAS.caso('⚠️ ninguna animación arranca antes de que la pantalla termine de deslizarse', () => {
  /* ESTE es el caso que evita que el defecto vuelva. No mira una regla concreta: recorre TODAS las
     animaciones que hay puestas y falla si alguna empieza durante el deslizamiento. Una animación
     nueva escrita con un retraso suelto —sin contar desde `--spl-in`— cae acá sola. */
  const malas = p2Medir(slides => {
    const out = [];
    slides.forEach((sl, i) => sl.querySelectorAll('.spl-p *').forEach(e => {
      e.getAnimations().forEach(a => {
        const d = a.effect.getTiming().delay;
        if (d < P2_DESLIZ) out.push('n' + (i + 1) + ' · ' + a.animationName + ' arranca a los ' + Math.round(d) + ' ms');
      });
    }));
    return out;
  });
  PRUEBAS.igual(malas, [],
    'una animación que arranca antes de que la pantalla llegue es exactamente el defecto que se ' +
    'reportó: se ve el panel completo y después salta a cero');
});

PRUEBAS.caso('⚠️ durante el deslizamiento se ve el estado INICIAL, no el final', () => {
  /* La comprobación directa de lo que se reportó. Se congela cada pieza a los 200 ms —dentro de la
     espera— y tiene que verse DISTINTA de como se ve terminada. Si las dos fotos dan igual, es que
     durante el deslizamiento ya se está mostrando el resultado. */
  const iguales = p2Medir(slides => {
    const piezas = [
      ['.spl-barras i',  '1 · barra'],
      ['.spl-l-viva',    '2 · línea'],
      ['.spl-l-punto',   '2 · punto'],
      ['.spl-mon span',  '3 · fila'],
      ['.spl-mon u',     '3 · píldora'],
      ['.spl-ojo',       '4 · ficha'],
      ['.spl-ojo i',     '4 · renglón'],
      ['.spl-cola i',    '5 · registro'],
      ['.spl-chip',      'chip']
    ];
    const out = [];
    piezas.forEach(([sel, nom]) => {
      const el = document.querySelector('#splashAnimTrack ' + sel);
      if (!el) { out.push(nom + ': no existe'); return; }
      const enEspera = p2Foto(el, 200);
      const terminada = p2Foto(el, 4000);
      if (!enEspera) { out.push(nom + ': sin animación'); return; }
      if (JSON.stringify(enEspera) === JSON.stringify(terminada)) out.push(nom + ': se ve igual antes y después');
    });
    return out;
  });
  PRUEBAS.igual(iguales, [],
    'mientras la pantalla se desliza cada pieza tiene que estar en su estado inicial; si ya se ve ' +
    'como termina, es el "aparece completa y después arranca de cero" que se reportó');
});

PRUEBAS.caso('⚠️ sin la clase que dispara, la pantalla se ve COMPLETA', () => {
  /* La otra mitad, y la que se rompe sin que nadie la note: la garantía de que ningún panel queda
     en blanco. Vale para movimiento reducido, para el JS caído y para el primer instante de carga.
     Ya pasó una vez: unas reglas de "sin movimiento" quedaron viejas y dos paneles se veían vacíos. */
  const html = document.documentElement;
  const ov = document.getElementById('splashOv');
  const eraQuieto = html.classList.contains('sin-animaciones');
  const eraAbierto = ov.classList.contains('show');
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  const tenian = slides.map(s => s.classList.contains('spl-activa'));

  ov.classList.add('show');
  html.classList.remove('sin-animaciones');
  slides.forEach(s => s.classList.remove('spl-activa'));
  void document.body.offsetWidth;

  const invisibles = [], animando = [];
  slides.forEach((sl, i) => sl.querySelectorAll('.spl-p *').forEach(e => {
    if (parseFloat(getComputedStyle(e).opacity) < 0.2) invisibles.push('n' + (i + 1) + ' ' + (e.className || e.tagName));
    if (e.getAnimations().length) animando.push('n' + (i + 1) + ' ' + (e.className || e.tagName));
  }));

  slides.forEach((s, i) => s.classList.toggle('spl-activa', tenian[i]));
  if (eraQuieto) html.classList.add('sin-animaciones');
  if (!eraAbierto) ov.classList.remove('show');

  PRUEBAS.igual(invisibles, [],
    'en reposo ninguna pieza puede estar oculta: lo que esconde tiene que ser el `from` del ' +
    'keyframe, que sólo rige mientras la animación está puesta');
  PRUEBAS.igual(animando, [],
    'y sin la clase no puede quedar ninguna animación corriendo');
});

PRUEBAS.caso('cada pantalla termina de animarse antes de que llegue la siguiente', () => {
  /* La espera se corrió 560 ms, así que todo terminó más tarde. Si alguna animación se pasa del
     tiempo que dura la pantalla, se corta a la mitad — que es justo lo que se veía "flojo" antes. */
  const cortadas = p2Medir(slides => {
    const out = [];
    slides.forEach((sl, i) => {
      const espera = parseInt(sl.dataset.espera, 10) || 4000;
      let fin = 0;
      sl.querySelectorAll('.spl-p *').forEach(e => e.getAnimations().forEach(a => {
        const t = a.effect.getTiming();
        fin = Math.max(fin, t.delay + t.duration);
      }));
      if (fin > espera) out.push('n' + (i + 1) + ': termina a los ' + Math.round(fin) + ' ms y la pantalla dura ' + espera);
    });
    return out;
  });
  PRUEBAS.igual(cortadas, [], 'una animación que no llega a terminar se ve cortada, no lenta');
});

PRUEBAS.caso('⚠️ el gráfico cede antes que el título, también cuando falta espacio de verdad', () => {
  /* ⚠️ ACÁ ESTUVO EL ERROR MÁS CARO DE ESTE BLOQUE, y es sutil. El gráfico tenía `flex: 1 1 0`, y
     PARECÍA ceder primero: cuando sobraba espacio devolvía lo que había crecido. Pero cuando el
     espacio FALTA, flexbox reparte el recorte en proporción a `shrink × base`, y una base de 0 da
     capacidad de encogerse 0 — o sea que el recorte entero caía sobre el TEXTO, al revés de lo
     decidido. Medido a 375x667 con letra grande: el título quedaba en 6 px de alto, presente para
     el código y vacío para la persona.
     Por eso este caso NO mira la regla CSS: aprieta la tira de verdad y comprueba quién cede. */
  const anim = document.getElementById('splashAnim');
  const ov = document.getElementById('splashOv');
  const eraAbierto = ov.classList.contains('show');
  const alto = anim.style.height;
  ov.classList.add('show');

  const mide = h => {
    anim.style.height = h;
    void document.body.offsetWidth;
    return {
      gr: [...document.querySelectorAll('#splashAnimTrack .spl-p-gr')].map(g => Math.round(g.getBoundingClientRect().height)),
      tit: [...document.querySelectorAll('#splashAnimTrack .spl-p-tx b')].map(b => Math.round(b.getBoundingClientRect().height))
    };
  };
  const holgado = mide('200px');
  const apretado = mide('84px');
  anim.style.height = alto;
  if (!eraAbierto) ov.classList.remove('show');

  PRUEBAS.alMenos(Math.min.apply(null, holgado.gr), 20,
    'con lugar de sobra el gráfico tiene que ocupar espacio: si no, no hay nada que ceder');
  PRUEBAS.comoMucho(Math.max.apply(null, apretado.gr), 2,
    'apretada la tira, el gráfico tiene que haberse ido a cero — es lo primero que cede');
  PRUEBAS.igual(apretado.tit, holgado.tit,
    'y el título tiene que medir lo MISMO apretado que holgado: es el mensaje y es lo último que cede');
});

PRUEBAS.caso('⚠️ con la letra al máximo la tira se va entera, no queda un resto aplastado', () => {
  /* La tira es un ítem flex con `flex-shrink: 1`: cuando el contenido del splash no entra, el
     contenedor la aplasta. Medido a 375x667 en "Grande" quedaba en 37 px —un resto de tarjeta
     recortada, que se ve roto— y en "Muy grande" en 0, y aun así el splash se pasaba 9 px con
     `overflow: hidden`, o sea que el PIE quedaba cortado. Ese pie tiene el acceso de supervisor y
     el de administrador, así que no es un detalle estético.
     Que la tira ceda está bien: es ilustración y el pie es función. Lo que estaba mal era ceder a
     medias. */
  const ov = document.getElementById('splashOv');
  const eraAbierto = ov.classList.contains('show');
  const antes = (typeof nivelTextoActual === 'function') ? nivelTextoActual() : 1;
  ov.classList.add('show');
  fijarTamanoTexto(TEXTO_NIVELES.length - 1);
  void document.body.offsetWidth;

  const anim = document.getElementById('splashAnim');
  const disp = getComputedStyle(anim).display;
  const alto = Math.round(anim.getBoundingClientRect().height);
  const marcada = document.documentElement.classList.contains('texto-maximo');

  fijarTamanoTexto(antes);
  if (!eraAbierto) ov.classList.remove('show');

  PRUEBAS.cierto(marcada, 'el nivel máximo de letra tiene que marcarse en el html para que el CSS pueda reaccionar');
  PRUEBAS.igual(disp, 'none', 'con la letra al máximo la tira no se muestra');
  PRUEBAS.igual(alto, 0, 'y no ocupa alto: un resto de tarjeta recortada se ve peor que nada');
});

PRUEBAS.caso('la animación reinicia aunque la pantalla sea la misma', () => {
  /* Sacar y volver a poner la clase en el mismo fotograma NO reinicia nada: el navegador junta los
     dos cambios de estilo y no ve diferencia. Pasa al volver el movimiento después de estar frenado,
     que es cuando `ir()` se llama con la pantalla que ya estaba. Se comprueba sobre el código porque
     el efecto —que la animación arranque de cero— no se puede observar con la pestaña oculta. */
  const fuente = (typeof splashAnimArrancar === 'function') ? splashAnimArrancar.toString() : '';
  PRUEBAS.cierto(/void track\.offsetWidth/.test(fuente),
    'tiene que forzarse un recálculo entre sacar y poner la clase, o la animación no reinicia');
  PRUEBAS.falso(/timerAnim/.test(fuente),
    'la espera ya no va por temporizador: vive en el CSS, donde no se puede perder');
});
