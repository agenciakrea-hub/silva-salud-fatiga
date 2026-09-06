
PRUEBAS.grupo('P110 · las láminas del inicio: que se lean enteras y se sepa dónde estás');

/* Tres cosas que reportó el dueño mirando la app:
   · "lo de SAFTE no se lee, se corta y dice «el objetivo es…»" — la bajada tiene
     `-webkit-line-clamp:3` y ese texto medía 217 caracteres: entraba a la mitad.
   · los textos no le gustaban: "la persona decide si la acepta", "cada quien ve lo suyo" —
     poco serios para algo que se le muestra a un cliente.
   · faltaban puntitos de posición: sin ellos la tira parece que no termina nunca. */

/* ⚠️ A6b · EL CLAMP YA NO ES UN SOLO NÚMERO. Desde P046 vale 5 a ≤360 px, y desde A6b también en
   escritorio (≥900). Esta constante declaraba 4 a secas: hoy no falla sólo porque `p110EnSplash`
   mide a 375×812, el único ancho donde sigue siendo 4 — la prueba se apoyaba justo en el punto
   donde su propia constante todavía era cierta. Medir a 320, que es el paso siguiente y obvio,
   la habría puesto roja sobre código correcto.
   Se LEE del CSS vigente en vez de declararla, que es lo único que no se desincroniza. */
function p110MaxLineas() {
  const sp = document.querySelector('.spl-p-tx span');
  const n = sp && parseInt(getComputedStyle(sp).webkitLineClamp, 10);
  return (n && !isNaN(n)) ? n : 4;
}

/* ⚠️ EL ANCHO SALE DE LA TARJETA, NO DEL SPAN. Las láminas que no están a la vista miden 0 de
   ancho (el track está desplazado), así que medir sobre el span da basura: la primera versión de
   esta prueba calculó 22 líneas para un texto de 131 caracteres. Un ancho de 0 no es un resultado. */
function p110Ancho(){
  const p = document.querySelector('.spl-p');
  if (!p) return 0;
  const cs = getComputedStyle(p);
  return p.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
}

function p110Lineas(txt, ancho, ref){
  const cs = getComputedStyle(ref);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + ancho + 'px;font:' + cs.font +
                    ';line-height:' + cs.lineHeight + ';white-space:normal';
  d.textContent = txt;
  document.body.appendChild(d);
  const n = d.getBoundingClientRect().height / lh;
  d.remove();
  return n;
}

/* ⚠️ EL SPLASH ES UN OVERLAY: sin `.show` no tiene layout y todo mide 0 o negativo. La primera
   versión de este archivo medía sin abrirlo y calculaba "22 líneas" para un texto de 131
   caracteres. Se abre igual que en `a2c-tira-splash.js`, y se mide dentro de `PRUEBAS.enVentana`
   para que el ancho sea el de un teléfono real y no el que tenga el arnés. */
function p110EnSplash(fn){
  const ov = document.getElementById('splashOv');
  const tenia = ov && ov.classList.contains('show');
  if (ov && !tenia) ov.classList.add('show');
  try { PRUEBAS.enVentana(375, 812, fn); }
  finally { if (ov && !tenia) ov.classList.remove('show'); }
}

PRUEBAS.caso('⚠️ ninguna bajada se corta', () => { p110EnSplash(() => {
  const ancho = p110Ancho();
  if (ancho < 50){ PRUEBAS.cierto(false, '⚠️ la tira no está medible (ancho ' + Math.round(ancho) + '): revisar a mano'); return; }
  const ref = document.querySelector('.spl-p-tx span');
  const largos = [...document.querySelectorAll('.spl-p-tx span')]
    .map(e => ({ t: e.textContent.trim(), n: p110Lineas(e.textContent.trim(), ancho, ref) }))
    .filter(x => x.n > p110MaxLineas() + 0.05)
    .map(x => x.t.slice(0, 40) + '… (' + Math.round(x.n * 10) / 10 + ' líneas)');
  PRUEBAS.igual(largos, [], '⚠️ pasado el tope, el texto se corta a la mitad de una frase');
}); });

PRUEBAS.caso('el DISCRIMINADOR: la medición detecta un texto largo', () => { p110EnSplash(() => {
  /* R17: sin esto, un ancho mal calculado daría "0 textos largos" y parecería que está todo bien.
     Se mide el texto original de SAFTE —217 caracteres, el que el dueño vio cortado— y tiene que
     dar por encima del tope. */
  const ancho = p110Ancho();
  if (ancho < 50){ PRUEBAS.cierto(false, 'la tira no está medible'); return; }
  const ref = document.querySelector('.spl-p-tx span');
  const viejo = 'Estima la efectividad cruzando tres cosas: lo que la persona siente, sus horas de ' +
                'sueño y su test de reacción, y un modelo biomatemático. El objetivo es mantenerla ' +
                'en su franja óptima. Con wearable, la precisión sube.';
  PRUEBAS.cierto(p110Lineas(viejo, ancho, ref) > p110MaxLineas(),
    '⚠️ el texto viejo de SAFTE habría fallado — o sea que la prueba discrimina');
}); });

PRUEBAS.caso('⚠️ hay un puntito por lámina', () => {
  const slides = document.querySelectorAll('#splashAnimTrack .splash-anim-slide');
  const dots = document.getElementById('splashAnimDots');
  PRUEBAS.cierto(!!dots, 'existe el contenedor de puntitos');
  if (!dots) return;
  PRUEBAS.alMenos(slides.length, 2, 'hay láminas que contar');
  PRUEBAS.igual(dots.children.length, slides.length,
    '⚠️ se generan desde las láminas: agregar una no obliga a acordarse de tocar esto');
});

PRUEBAS.caso('el puntito activo se distingue por FORMA, no sólo por color', () => { p110EnSplash(() => {
  /* Depender del matiz deja afuera a quien no lo distingue bien, y a cualquiera mirando la
     pantalla de reojo desde lejos. */
  const dots = [...(document.getElementById('splashAnimDots') || {children:[]}).children];
  if (dots.length < 2){ PRUEBAS.cierto(false, 'sin puntitos que comparar'); return; }
  const prev = dots.findIndex(d => d.classList.contains('on'));
  try {
    dots.forEach(d => d.classList.remove('on'));
    dots[0].classList.add('on');
    /* `getBoundingClientRect`, NO `getComputedStyle().width`: acá el computado devolvió "5px" para
       un punto que medía 16 de verdad. El rect es lo que el navegador dibujó. */
    const anchoOn = dots[0].getBoundingClientRect().width;
    const anchoOff = dots[1].getBoundingClientRect().width;
    PRUEBAS.alMenos(Math.round(anchoOn), Math.round(anchoOff) + 4,
      '⚠️ el activo tiene que ser visiblemente más ancho');
  } finally { dots.forEach((d,k) => d.classList.toggle('on', k === prev)); }
}); });

PRUEBAS.caso('⚠️ los textos que el dueño rechazó no volvieron', () => {
  /* Se comprueba sobre el DICCIONARIO, no sobre el DOM: el DOM sólo tiene el idioma activo, y
     estos textos se cambiaron en los dos. */
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  [['La persona decide si la acepta', 'suena a trámite, no a producto'],
   ['Cada quien ve lo suyo',          'suena a reparto, no a arquitectura de privacidad'],
   ['Everyone sees their own',        'lo mismo en inglés'],
   ['With doctors behind it',         'traducción literal que no se dice así']
  ].forEach(([mal, porque]) => {
    PRUEBAS.falso(fuente.indexOf(mal) >= 0, '⚠️ no vuelve «' + mal + '»: ' + porque);
  });
});

PRUEBAS.caso('R13 · los puntitos usan tokens, en los dos temas', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bloque = (css.match(/\.spl-dot[^{]*\{[^}]*\}/g) || []).join(' ');
  PRUEBAS.igual(bloque.match(/#[0-9a-fA-F]{3,8}\b/g) || [], [], 'cero hex a mano');
  ['--spl-dot', '--spl-dot-on'].forEach(tok => {
    const n = (css.match(new RegExp(tok.replace(/-/g, '\\-') + '\\s*:', 'g')) || []).length;
    PRUEBAS.alMenos(n, 2, tok + ' definido en claro y en oscuro');
  });
});
