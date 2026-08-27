/* ── Que no quede texto sin traducir, y que el diccionario esté completo ────────────────────────
   (L2c · automatiza el barrido que en I6 hubo que hacer a mano)

   POR QUÉ IMPORTA MÁS DE LO QUE PARECE
   R14 no es una regla de prolijidad: el servicio va a Cardón y a operarios de planta, y el sector
   define la terminología. Un texto escrito a mano en español no sólo se ve mal en inglés — es un
   texto que NO pasó por `t()`, o sea que tampoco cambia por sector. Es el mismo agujero por el que
   se colarían "aeropuerto" o "piloto" en la app de una planta industrial.

   Ya pasó dos veces esta semana: la nota del tema estaba escrita en español dentro del JS y pisaba
   su propio `data-i18n` (J6), y el subtítulo del tema no se repintaba al cambiar de idioma. */

PRUEBAS.grupo('Cliente · idioma');

/* Junta el texto visible de una pantalla. Se usa `textContent` de nodos de texto y no `innerText`
   porque `innerText` da falsos negativos con elementos que el navegador considera no renderizados
   —está anotado en las reglas del proyecto (R11)— y acá justamente se buscan textos escondidos. */
function textosVisibles(raiz) {
  const out = [];
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = it.nextNode())) {
    const t = (n.textContent || '').trim();
    if (t.length < 3) continue;
    const p = n.parentElement;
    if (!p || p.closest('script,style')) continue;
    const r = p.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;    // no está en pantalla
    out.push(t);
  }
  return out;
}

/* Palabras que sólo existen en español. Si aparecen con la app en inglés, hay texto sin traducir.
   Se eligieron palabras cortas y frecuentes, y se comparan con límites de palabra: el bug de
   subcadena del servidor ("rol" dentro de "Control") enseña a no buscar fragmentos sueltos. */
const SOLO_ESPANOL = ['está', 'estás', 'según', 'día', 'días', 'sueño', 'próximo', 'aquí',
  'ahora', 'tienes', 'puedes', 'debes', 'completa', 'registro', 'siguiente', 'guardar', 'cerrar'];

function delatoresEn(textos) {
  const hallados = new Set();
  textos.forEach(t => {
    const bajo = t.toLowerCase();
    SOLO_ESPANOL.forEach(p => {
      if (new RegExp('(?<![\\p{L}])' + p + '(?![\\p{L}])', 'u').test(bajo)) hallados.add(p + ' → "' + t.slice(0, 60) + '"');
    });
  });
  return [...hallados];
}

PRUEBAS.caso('el inicio en inglés no tiene texto en español', () => {
  const previo = idiomaActual();
  CTX.resetear();
  fijarIdioma('en');
  renderInicio();
  const sueltos = delatoresEn(textosVisibles(document.getElementById('viewInicio')));
  fijarIdioma(previo);
  PRUEBAS.igual(sueltos, [],
    'un texto que queda en español no pasó por t(): tampoco va a cambiar por sector, que es el agujero de R14');
});

PRUEBAS.caso('los ajustes en inglés no tienen texto en español', () => {
  /* Es la pantalla donde ya se coló dos veces: la nota del tema estaba escrita a mano en el JS. */
  const previo = idiomaActual();
  CTX.resetear();
  fijarIdioma('en');
  mostrarVista('mas');
  const sueltos = delatoresEn(textosVisibles(document.getElementById('viewMas')));
  fijarIdioma(previo);
  mostrarVista('inicio');
  PRUEBAS.igual(sueltos, [],
    'acá ya se coló dos veces: la nota del tema estaba escrita en español dentro del JS y pisaba su data-i18n');
});

PRUEBAS.caso('cada data-i18n del HTML existe en los dos diccionarios', () => {
  /* Una clave que falta no rompe nada visible: la cadena de respaldo devuelve el español. O sea
     que se ve "bien" en inglés hasta que alguien lee con atención. Por eso hay que comprobarlo. */
  const claves = new Set();
  document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(e => {
    const k = e.getAttribute('data-i18n') || e.getAttribute('data-i18n-html');
    if (k) claves.add(k);
  });
  PRUEBAS.alMenos(claves.size, 20, 'si no se encontraron claves, el caso no está probando nada');

  const previo = idiomaActual();
  const faltan = { es: [], en: [] };
  ['es', 'en'].forEach(lang => {
    fijarIdioma(lang);
    claves.forEach(k => { if (t(k) === k) faltan[lang].push(k); });
  });
  fijarIdioma(previo);

  PRUEBAS.igual(faltan.es, [], 'toda clave usada en el HTML tiene que existir en español');
  PRUEBAS.igual(faltan.en, [],
    'y en inglés: si falta, la cadena de respaldo devuelve el español y nadie se entera');
});

PRUEBAS.caso('cambiar de idioma y volver deja todo como estaba', () => {
  /* Si algo se repintara sólo en un sentido, quedaría mezclado — que es exactamente lo que pasaba
     con el subtítulo del tema (decía "Light" con la app en español). */
  CTX.resetear();
  const previo = idiomaActual();
  fijarIdioma('es');
  const antes = document.getElementById('viewInicio').textContent.replace(/\s+/g, ' ').trim();
  fijarIdioma('en');
  fijarIdioma('es');
  const despues = document.getElementById('viewInicio').textContent.replace(/\s+/g, ' ').trim();
  fijarIdioma(previo);
  PRUEBAS.igual(despues, antes,
    'ir a inglés y volver tiene que dejar la pantalla idéntica; si no, algo se repinta en un solo sentido');
});
