
PRUEBAS.grupo('Y6 · Data Operacional: por persona y aprovechando el ancho');

/* LO QUE SE MIDIÓ ANTES DE TOCAR NADA, dentro del panel real (no de una página suelta: medido
   fuera de su contenedor la lista se veía bien y el defecto no aparecía):

       1024 px → lista de 423 px, 402 px de vacío al costado
       1366 px → lista de 423 px, 744 px de vacío
       1920 px → lista de 423 px, 1.177 px de vacío
        768 px → lista de 680 px, 0 de vacío

   O sea que **un monitor mostraba menos que una tablet**, y cuanto más grande la pantalla peor se
   veía. La causa: `.dash-sec` reparte a sus hijos con `flex: 1 1 23rem`, pero esa regla los nombra
   uno por uno y el ciclo se sumó después sin entrar en la enumeración — al no matchear nada quedaba
   con el `flex: 0 1 auto` de fábrica, o sea del ancho de su contenido. */

function y6EnPanel(fn){
  /* El ciclo tiene que medirse DENTRO de `.dash-sec`: ahí es donde vive y donde estaba el defecto.
     Se arma el contenedor mínimo y se devuelve todo como estaba. */
  const prev = document.body.getAttribute('data-y6') ? null : document.body.innerHTML;
  const caja = document.createElement('div');
  caja.innerHTML = '<div id="__y6d"><div class="dash-scroll">' +
                   '<section class="dash-sec" id="__y6s" data-tab="ciclo"></section></div></div>';
  document.body.appendChild(caja);
  try {
    caja.querySelector('#__y6s').innerHTML = renderCicloOperativo();
    return fn(caja.querySelector('#__y6s'));
  } finally { caja.remove(); }
}

PRUEBAS.caso('⚠️ la lista usa TODO el ancho de su sección, en toda pantalla', () => {
  const antes = (typeof DASH !== 'undefined' && DASH) ? { op: DASH.operacional, per: DASH.operacionalPeriodo } : null;
  if (!antes) { PRUEBAS.cierto(true, 'sin panel abierto se saltea'); return; }
  DASH.operacional = cicloDemo();
  DASH.operacionalPeriodo = { dias: 30, puedeVerHistorico: true };
  CICLO_PERIODO = 'hoy';

  const angostos = [];
  [[768,1024],[1024,768],[1366,768],[1920,1080]].forEach(([w,h]) => {
    PRUEBAS.enVentana(w, h, () => {
      y6EnPanel(sec => {
        const lista = sec.querySelector('.cic-lista');
        if (!lista) return;
        const vacio = Math.round(sec.getBoundingClientRect().width - lista.getBoundingClientRect().width);
        if (vacio > 4) angostos.push(w + 'px: ' + vacio + ' px de vacío al costado');
      });
    });
  });
  DASH.operacional = antes.op; DASH.operacionalPeriodo = antes.per; CICLO_PERIODO = undefined;
  PRUEBAS.igual(angostos, [],
    'la lista no puede dejar vacío al costado: eran 1.177 px a 1920, y un monitor mostraba menos ' +
    'que una tablet');
});

PRUEBAS.caso('⚠️ las columnas las decide el espacio, no un punto de corte a mano', () => {
  /* ⚠️ NO se busca el TEXTO de la regla en la hoja de estilos. `.cic-lista` aparece en DOS reglas
     —la base y la del layout de escritorio— y un regex se queda con la primera que encuentra, que no
     es la que decide las columnas: esta prueba dio rojo con el código correcto. Es la misma lección
     que ya está anotada en el LEEME y en A1, y volvió a pasar.
     Se mide el estilo CALCULADO —lo que el navegador aplica de verdad— y, sobre todo, el EFECTO:
     que a más ancho entren más columnas. Cualquier implementación que lo cumpla está bien. */
  const antes = (typeof DASH !== 'undefined' && DASH) ? { op: DASH.operacional, per: DASH.operacionalPeriodo } : null;
  if (!antes) { PRUEBAS.cierto(true, 'sin panel abierto se saltea'); return; }
  DASH.operacional = cicloDemo();
  DASH.operacionalPeriodo = { dias: 30, puedeVerHistorico: true };
  CICLO_PERIODO = 'hoy';

  const cols = anchoVp => PRUEBAS.enVentana(anchoVp, 900, () => y6EnPanel(sec => {
    const lista = sec.querySelector('.cic-lista');
    if (!lista) return 0;
    return getComputedStyle(lista).gridTemplateColumns.split(' ').filter(Boolean).length;
  }));
  const angosto = cols(390), ancho = cols(1920);
  DASH.operacional = antes.op; DASH.operacionalPeriodo = antes.per; CICLO_PERIODO = undefined;

  PRUEBAS.igual(angosto, 1, 'en un teléfono, una columna');
  PRUEBAS.alMenos(ancho, 2,
    'y en un monitor, varias (' + ancho + '): las decide el espacio, no un punto de corte a mano');
});

PRUEBAS.caso('en teléfono queda en una sola columna, sin media query', () => {
  const antes = (typeof DASH !== 'undefined' && DASH) ? { op: DASH.operacional, per: DASH.operacionalPeriodo } : null;
  if (!antes) { PRUEBAS.cierto(true, 'sin panel abierto se saltea'); return; }
  DASH.operacional = cicloDemo();
  DASH.operacionalPeriodo = { dias: 30, puedeVerHistorico: true };
  CICLO_PERIODO = 'hoy';
  const cols = PRUEBAS.enVentana(390, 844, () => y6EnPanel(sec => {
    const cards = [...sec.querySelectorAll('.cic-lista > *')];
    if (cards.length < 2) return 1;
    const top = cards[0].getBoundingClientRect().top;
    return cards.filter(c => Math.abs(c.getBoundingClientRect().top - top) < 5).length;
  }));
  DASH.operacional = antes.op; DASH.operacionalPeriodo = antes.per; CICLO_PERIODO = undefined;
  PRUEBAS.igual(cols, 1, 'en un teléfono una sola tarjeta por fila, o no entra nada');
});

PRUEBAS.caso('⚠️ en histórico cada tarjeta dice CUÁNTOS ciclos tiene esa persona', () => {
  /* Sin esto, mirando "30 días" se ve UNA tarjeta por persona y se lee como si hubiera trabajado
     una sola vez en el mes — cuando lo que se muestra es su ciclo más reciente y los otros quedan
     invisibles. Una pantalla que muestra una parte sin decir que es una parte no se ve incompleta:
     se ve equivocada, y nadie sale a buscar lo que no sabe que falta. */
  const antes = (typeof DASH !== 'undefined' && DASH) ? { op: DASH.operacional, per: DASH.operacionalPeriodo } : null;
  if (!antes) { PRUEBAS.cierto(true, 'sin panel abierto se saltea'); return; }

  const base = cicloDemo(), extra = [];
  for (let dia = 1; dia <= 5; dia++) base.forEach(o => {
    const t2 = new Date(new Date(o.iso).getTime() - dia * 86400000);
    extra.push(Object.assign({}, o, { iso: t2.toISOString(), fecha: t2.toISOString().slice(0, 10) }));
  });
  DASH.operacional = base.concat(extra);
  DASH.operacionalPeriodo = { dias: 30, puedeVerHistorico: true };

  CICLO_PERIODO = '30';
  const hist = y6EnPanel(sec => [...sec.querySelectorAll('.cic-cuenta')].map(e => e.textContent));
  CICLO_PERIODO = 'hoy';
  const curso = y6EnPanel(sec => sec.querySelectorAll('.cic-cuenta').length);

  DASH.operacional = antes.op; DASH.operacionalPeriodo = antes.per; CICLO_PERIODO = undefined;

  PRUEBAS.alMenos(hist.length, 1, 'en histórico cada persona tiene que declarar cuántos ciclos trae');
  PRUEBAS.cierto(hist.every(x => /\d/.test(x)), 'y el conteo tiene que ser un número: ' + hist[0]);
  PRUEBAS.igual(curso, 0,
    'pero en "En curso" no va: ahí hay un ciclo por definición y el dato sería ruido');
});
