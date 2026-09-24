PRUEBAS.grupo('P200b · geometría y contraste: siete hallazgos de A8 que pasaron la refutación');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Los siete salieron de la auditoría de cierre de tanda (P091 · A8) y sobrevivieron a dos
   escépticos independientes. Cinco de los seis de geometría venían con la medición del arreglo ya
   hecha por quien los refutó; el de contraste venía SUB-reportado —decía dos familias de fila y son
   seis— y con tres bloqueos que el arreglo propuesto daba por resueltos y no lo estaban.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p200bLum(c){
  const v = (String(c).match(/\d+(\.\d+)?/g) || [0,0,0]).slice(0,3).map(Number)
    .map(x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); });
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
}
/* Resuelve `var(--x)` al color computado. Comparar dos cadenas `var()` da 1:1 para todo. */
function p200bToken(expr){
  const d = document.createElement('div');
  document.body.appendChild(d);
  try { d.style.color = expr; return getComputedStyle(d).color; } finally { d.remove(); }
}
function p200bContraste(a, b){ return CTX.contraste(p200bToken(a), p200bToken(b)); }

function p200bEstilo(tag, cls){
  const e = document.createElement(tag);
  e.className = cls;
  document.body.appendChild(e);
  try {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { alto: r.height, ancho: r.width, wrap: cs.flexWrap, flex: cs.flex,
             ws: cs.whiteSpace, cols: cs.gridTemplateColumns };
  } finally { e.remove(); }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   30 y 34 · DOS BOTONES POR DEBAJO DE 44

   La flecha «atrás» del panel medía 36×36 en todo teléfono y tableta, con sus dos hermanos de la
   misma barra ya en 44. El «‹ Quitar filtro» medía 29 px de alto en TODOS los anchos, escritorio
   incluido. Este proyecto pide 44 en todo botón, que es más estricto que WCAG 2.2.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200b · la flecha «atrás» del panel y «Quitar filtro» llegan a 44 px', () => {
  const back = p200bEstilo('button', 'portal-back');
  PRUEBAS.alMenos(back.alto, 44, '🔴 la flecha «atrás» mide ' + back.alto + ' px de alto · antes 36');
  PRUEBAS.alMenos(back.ancho, 44, 'y ' + back.ancho + ' de ancho · volver es la salida más usada del panel');
  const quitar = p200bEstilo('button', 'ctx-back');
  PRUEBAS.alMenos(quitar.alto, 44, '🔴 «‹ Quitar filtro» mide ' + quitar.alto + ' px de alto · antes 29, en todos los anchos');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   29, 31, 32 y 33 · CUATRO BLOQUES QUE SE SALÍAN DE SU CONTENEDOR

   Los cuatro por la misma causa de fondo: una fila que no podía envolver, o un hijo que no podía
   encogerse. Se miden por la REGLA y no por el bloque pintado, porque cada uno vive en una pantalla
   distinta y montar las cuatro para medir cuatro propiedades sería más frágil que útil.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200b · las cuatro filas que desbordaban ahora pueden envolver o encogerse', () => {
  PRUEBAS.igual(p200bEstilo('div', 'apt-ciclo').wrap, 'wrap',
    '🔴 la tarjeta del ciclo en Aptitud envuelve · el tiempo de jornada se salía del botón y se cortaba contra el borde');
  PRUEBAS.igual(p200bEstilo('div', 'gest-top').wrap, 'wrap',
    '🔴 la cabecera de Nómina/Departamentos/Gestiones envuelve · «Departamentos» quedaba 62 px FUERA de la pantalla a 320 px con letra grande, sin forma de tocarlo');
  const titulo = p200bEstilo('div', 'gest-title');
  PRUEBAS.cierto(/1 1 (96px|6rem)/.test(titulo.flex),
    'y su título tiene piso (' + titulo.flex + ') · con `flex: 1` a secas colapsaba a 0 desde el 118 % de letra');
  const badge = p200bEstilo('span', 'pred-badge');
  PRUEBAS.igual(badge.flex, '0 1 auto',
    '🔴 el badge de «Plan Predictivo» puede encogerse · con `0 0 auto` era él quien empujaba la tarjeta 51 px fuera del contenedor');
  PRUEBAS.igual(badge.ws, 'normal', 'y puede envolver · antes `nowrap`');

  /* `min-width:0` y `auto-fit` no se distinguen midiendo un elemento suelto (el default computado es
     el mismo), así que se leen de la fuente. Es lo honesto: medir algo que no se puede medir y dar
     verde es peor que decir por qué se lee. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const pred = src.slice(src.indexOf('.pred-card {'), src.indexOf('}', src.indexOf('.pred-card {')));
    PRUEBAS.cierto(/min-width\s*:\s*0/.test(pred),
      '🔴 `.pred-card` puede achicarse por debajo de su contenido · «' + pred.replace(/\s+/g,' ').slice(0,90) + '»');
    const tema = src.slice(src.indexOf('.tema-opts {'), src.indexOf('}', src.indexOf('.tema-opts {')));
    PRUEBAS.cierto(/auto-fit/.test(tema),
      '🔴 las opciones de tema se acomodan solas · con tres columnas fijas «Automático» se salía de su tarjeta desde el 118 % de letra');
    PRUEBAS.igual((tema.match(/1fr 1fr 1fr/g) || []).length, 0, 'DISCRIMINADOR · y no quedó la rejilla fija de antes');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   37 · LA HISTORIA DE LA FICHA MÉDICA SE PINTABA CON EL COLOR DE RELLENO

   `.fm-ev-tipo` —el rótulo de cada fila: DETERMINACIÓN, RESTRICCIÓN, NOTA CLÍNICA, AUTOREPORTE,
   TELEMEDICINA— usaba `var(--anc)`, que es el color del PUNTO del semáforo, no el legible como
   tinta. El hallazgo decía dos familias; medidas son seis, con diez variantes entre sub-estados, y
   en tema claro fallaban OCHO, entre 2,81 y 4,28:1.

   El arreglo propuesto daba por resueltas tres cosas que no lo estaban: `--sem-azul-txt` no existía
   (hay dos comentarios en el archivo advirtiéndolo, uno confesando un intento fallido), y ni
   `APT_ANOT_NIVELES_DEF` ni `TELEM_ESTADOS` tenían campo `ct`. Los tres se agregaron.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Las diez variantes que `fmTimeline` puede pintar, leídas de las MISMAS tablas que usa el código.
   Si mañana se agrega un estado, entra solo. */
function p200bFamilias(){
  const out = {};
  ['alto', 'medio', 'ok'].forEach(k => { const i = apAnotInfo(k); out['determinacion_' + k] = i; });
  Object.keys(TELEM_ESTADOS || {}).forEach(k => { out['telem_' + k] = telemInfo(k); });
  out.restriccion = { c: 'var(--sem-azul)',  ct: 'var(--sem-azul-txt)',  bg: 'var(--sem-azul-bg)' };
  out.nota        = { c: 'var(--sem-gris)',  ct: 'var(--sem-gris-txt)',  bg: 'var(--sem-gris-bg)' };
  out.autoreporte = { c: 'var(--sem-ambar)', ct: 'var(--sem-ambar-txt)', bg: 'var(--sem-ambar-bg)' };
  return out;
}

PRUEBAS.caso('🔴 P200b · las diez variantes de la Historia de la ficha pasan 4.5:1, en los DOS temas', () => {
  ['claro', 'oscuro'].forEach(tema => {
    PRUEBAS.enTema(tema, () => {
      const fam = p200bFamilias();
      PRUEBAS.alMenos(Object.keys(fam).length, 10,
        'guarda: hay al menos diez variantes que medir · la lista sale de las tablas del código, no escrita acá');
      const malos = [], viejos = [];
      Object.keys(fam).forEach(k => {
        const x = fam[k];
        if (!x || !x.bg) return;
        const conCt = p200bContraste(x.ct || x.c, x.bg);
        if (conCt < 4.5) malos.push(k + ' ' + conCt);
        if (p200bContraste(x.c, x.bg) < 4.5) viejos.push(k);
      });
      PRUEBAS.igual(malos, [], '🔴 ninguna variante por debajo de 4.5:1 en tema ' + tema);
      if (tema === 'claro'){
        /* DISCRIMINADOR · con el color de relleno fallaban ocho. Si esta cuenta diera 0, el medidor
           no distinguiría nada y el aserto de arriba no probaría el arreglo. */
        PRUEBAS.alMenos(viejos.length, 6,
          'DISCRIMINADOR · con el relleno (`c`) fallaban ' + viejos.length + ' de ' + Object.keys(fam).length + ': ' + viejos.join(', '));
      }
    });
  });
});

PRUEBAS.caso('⚠️ P200b · `--sem-azul-txt` existe en los dos temas y las dos tablas traen `ct`', () => {
  ['claro', 'oscuro'].forEach(tema => {
    PRUEBAS.enTema(tema, () => {
      const v = p200bToken('var(--sem-azul-txt)');
      PRUEBAS.cierto(/^rgb/.test(v) && v !== 'rgb(0, 0, 0)',
        '⚠️ el token resuelve en ' + tema + ' (' + v + ') · un `var()` que no resuelve computa a `inherit` SIN error en consola, que es como este defecto sobrevivió');
      PRUEBAS.alMenos(p200bContraste('var(--sem-azul-txt)', 'var(--sem-azul-bg)'), 4.5,
        'y es legible sobre su fondo en ' + tema);
    });
  });
  /* Las dos tablas que el arreglo propuesto daba por listas y no lo estaban. */
  ['alto', 'medio', 'ok'].forEach(k => {
    PRUEBAS.cierto(!!(apAnotInfo(k) || {}).ct, '⚠️ el nivel de anotación «' + k + '» trae `ct`');
  });
  Object.keys(TELEM_ESTADOS || {}).forEach(k => {
    PRUEBAS.cierto(!!(telemInfo(k) || {}).ct, '⚠️ el estado de telemedicina «' + k + '» trae `ct`');
  });
});

PRUEBAS.caso('⚠️ P200b · la fila de la Historia emite `--anct` y el rótulo lo usa', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.cierto(/class="fm-ev" style="--anc:' \+ e\.c \+ ';--anct:' \+ \(e\.ct \|\| e\.c\)/.test(src),
      '⚠️ el div de cada fila emite el par completo, con respaldo al relleno si falta la tinta');
    PRUEBAS.cierto(/\.fm-ev-tipo \{[^}]*color:var\(--anct, var\(--anc\)\)/.test(src),
      'y el rótulo pinta con la tinta · antes con `var(--anc)`, que es el relleno');
    PRUEBAS.igual((src.match(/\.fm-ev-tipo \{[^}]*color:var\(--anc\)/g) || []).length, 0,
      'DISCRIMINADOR · y no quedó ninguna copia pintando con el relleno');
  });
});
