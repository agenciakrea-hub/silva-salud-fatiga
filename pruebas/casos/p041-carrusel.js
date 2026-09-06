PRUEBAS.grupo('P041 · el carrusel de entrada');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   R3 pedía tres cosas. Antes de tocar nada se midieron las tres, y **una ya estaba resuelta**:

   1 · 🔴 "Está en rioplatense y tiene que ser español NEUTRO (R1)". **Ya no.** Se midió por `t()`
   sobre las catorce claves del carrusel y hay CERO voseo: lo dejó resuelto el barrido de voseo
   sobre todo `index.html`. El caso de abajo lo sostiene para que no vuelva — es la regla que
   Franco ya tuvo que corregir dos veces, así que vale tener quien la vigile.

   2 · "«Siguiente» descentrado cuando es el único botón". **Era cierto y estaba medido mal de
   diagnóstico**: no es que el botón esté descentrado, es que `.car-atras` usa `visibility:hidden`,
   que esconde el botón pero NO lo saca del reparto. En la primera lámina "Atrás" seguía ocupando
   54 px más 12 de hueco, así que el único botón visible arrancaba después de un vacío y su centro
   quedaba 33 px a la derecha del centro de la barra.

   3 · "Falta decir que el supervisor a cargo te da un código, y explicar el proceso de registro".
   ⚠️ Y el propio plan avisa: *"el texto no puede prometer un código si el código todavía no se
   pide"*. Se verificó en el `.gs`: `pideCodigo` sale de `valorConfigPropio(empresa,
   "codigoRegistro")` — o sea que el código es **opcional por empresa**. Por eso el texto lo nombra
   de forma condicional ("si tu empresa usa un código"), que es verdad en los dos casos.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p041Con(fn){
  const ov = document.getElementById('carruselOv');
  const ya = ov.classList.contains('show');
  const idx = (typeof CAR_IDX !== 'undefined') ? CAR_IDX : 0;
  ov.classList.add('show');
  try { return fn(); }
  finally { CAR_IDX = idx; try { carruselPintar(); } catch(e){} if (!ya) ov.classList.remove('show'); }
}
function p041Nav(){
  const nav = document.querySelector('.car-nav'), sig = document.getElementById('carSigBtn');
  const rn = nav.getBoundingClientRect(), rs = sig.getBoundingClientRect();
  return { desfase: Math.round((rs.left + rs.width / 2) - (rn.left + rn.width / 2)),
           anchoSig: Math.round(rs.width), anchoNav: Math.round(rn.width) };
}

PRUEBAS.caso('⚠️ en la PRIMERA lámina el único botón queda centrado', () => {
  const m = p041Con(() => { CAR_IDX = 0; carruselPintar(); return p041Nav(); });
  PRUEBAS.cierto(m.anchoNav > 0, 'la barra se está midiendo · si mide 0, este caso no dice nada');
  PRUEBAS.comoMucho(Math.abs(m.desfase), 2,
    '"Siguiente" centrado en la barra · estaba 33 px a la derecha porque "Atrás", oculto con ' +
    '`visibility:hidden`, seguía ocupando sus 54 px · desfase ' + m.desfase);
});

PRUEBAS.caso('el DISCRIMINADOR: con "Atrás" visible SÍ se corre, y está bien', () => {
  /* Si el arreglo hubiera centrado el botón SIEMPRE, las láminas con dos botones quedarían mal y
     este caso no lo notaría. Con dos botones, "Siguiente" ocupa la derecha: tiene que estar
     corrido. */
  const m = p041Con(() => { CAR_IDX = 2; carruselPintar(); return p041Nav(); });
  PRUEBAS.alMenos(Math.abs(m.desfase), 10,
    'con "Atrás" a la vista, "Siguiente" ocupa la derecha · desfase ' + m.desfase);
});

PRUEBAS.caso('y el botón único ocupa MÁS ancho, no queda flotando en el hueco', () => {
  const solo = p041Con(() => { CAR_IDX = 0; carruselPintar(); return p041Nav(); });
  const dos  = p041Con(() => { CAR_IDX = 2; carruselPintar(); return p041Nav(); });
  PRUEBAS.alMenos(solo.anchoSig, dos.anchoSig + 20,
    'sin "Atrás" en el reparto, el botón usa el ancho completo · ' + solo.anchoSig +
    ' contra ' + dos.anchoSig);
});

PRUEBAS.caso('la última lámina invita a registrarse, no a seguir', () => {
  /* No es de R3, pero es lo que más fácil se rompe tocando `carruselPintar`. */
  const txt = p041Con(() => { CAR_IDX = CAR_TOTAL - 1; carruselPintar();
    return document.getElementById('carSigBtn').textContent.trim(); });
  PRUEBAS.igual(txt, t('car_registrarse'), 'el último botón dice registrarse');
});

PRUEBAS.caso('🔴 el carrusel NO tiene voseo, en ninguna de sus claves (R1)', () => {
  /* Se entra por `t()` con el idioma fijado, no por la forma interna del diccionario ni por el
     HTML —que es sólo el respaldo si falta la clave—. Es la regla que ya se corrigió dos veces:
     lo que la vigila tiene que mirar lo que la persona lee de verdad. */
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  /* ⚠️ P051 partió `car4_cuerpo` —un párrafo corrido— en el esquema de cuatro filas. Las claves
     nuevas entran ACÁ y no en otro lado: si la lista no las siguiera, el carrusel tendría nueve
     cadenas nuevas sin nadie que les mire el voseo, que es justo la regla que ya se corrigió dos
     veces. (El barrido de todo el diccionario, más abajo, también las cubre; ésta es la que dice
     explícitamente "el carrusel".) */
  const claves = ['car1_tit','car1_cuerpo','car2_tit','car2_cuerpo','car3_tit','car3_cuerpo',
                  'car4_tit','car4_yo_t','car4_yo_d','car4_sup_t','car4_sup_d','car4_med_t',
                  'car4_med_d','car4_dir_t','car4_dir_d','car4_pie',
                  'car5_tit','car5_cuerpo','car_saltar',
                  'car_registrarse','atras','siguiente'];
  /* ⚠️ NO SE USA `\b` AL FINAL, y esto lo cazó el discriminador de abajo. En JavaScript `\b` está
     definido sobre `[A-Za-z0-9_]`, así que una `í` o una `é` NO cuentan como carácter de palabra:
     `/\belegí\b/` no encuentra "elegí" NUNCA. O sea que un detector de voseo escrito con `\b`
     falla justo en las formas acentuadas, que son casi todas las del voseo — y devuelve "0
     defectos" sobre un texto lleno. Se usa una clase negada explícita, con las vocales acentuadas
     y la ñ adentro. */
  const VOSEO = /(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|dale|registrate|anotá|probá|pedí|vení|entrá|salí)(?![a-záéíóúüñ])/i;
  let malos = [];
  try {
    fijarIdioma('es');
    malos = claves.filter(k => VOSEO.test(t(k))).map(k => k + ': «' + t(k) + '»');
  } finally { fijarIdioma(antes); }
  PRUEBAS.igual(malos, [], '⚠️ español NEUTRO en todo el carrusel — ' + malos.join(' | '));
});

PRUEBAS.caso('el DISCRIMINADOR del detector de voseo: reconoce una forma rioplatense', () => {
  /* Sin esto, una regex mal escrita daría "0 defectos" sobre un carrusel lleno de voseo, que es
     el cero sin discriminador de siempre. */
  const VOSEO = /(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|dale|registrate|anotá|probá|pedí|vení|entrá|salí)(?![a-záéíóúüñ])/i;
  PRUEBAS.cierto(VOSEO.test('Elegí tu empresa y registrate'), 'detecta «elegí»');
  PRUEBAS.cierto(VOSEO.test('Vos podés reportar sin conexión'), 'detecta «vos podés»');
  PRUEBAS.falso(VOSEO.test('Eliges tu empresa y te registras'), 'y no marca el neutro');
});

PRUEBAS.caso('⚠️ "Listos para empezar" explica el proceso y NO promete el código', () => {
  /* El plan lo advierte: el texto no puede prometer un código si el código todavía no se pide.
     Se verificó en el `.gs` que `pideCodigo` sale de la clave `codigoRegistro` de cada empresa,
     o sea que es opcional. Prometerlo de forma incondicional sería mandar a alguien a pedirle a su
     supervisor algo que su empresa no usa. */
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  let es = '', en = '';
  try { fijarIdioma('es'); es = t('car5_cuerpo'); fijarIdioma('en'); en = t('car5_cuerpo'); }
  finally { fijarIdioma(antes); }
  PRUEBAS.cierto(/c[óo]digo/i.test(es), 'el texto nombra el código · decía «' + es + '»');
  PRUEBAS.cierto(/supervisor/i.test(es), 'y dice quién lo da');
  PRUEBAS.cierto(/\bsi\b/i.test(es),
    '⚠️ pero CONDICIONAL: el código es opcional por empresa, prometerlo mandaría a pedir algo ' +
    'que su empresa quizá no usa');
  PRUEBAS.cierto(/lista|nombre/i.test(es), 'y explica el proceso, no sólo el resultado');
  PRUEBAS.cierto(/code/i.test(en) && /supervisor/i.test(en), 'lo mismo en inglés · «' + en + '»');
});

PRUEBAS.caso('el texto nuevo no desborda la lámina en un teléfono', () => {
  const m = p041Con(() => PRUEBAS.enVentana(375, 667, () => {
    const sl = document.querySelectorAll('.car-slide')[4];
    const p = sl.querySelector('.car-cuerpo');
    return { corta: p.scrollHeight > p.clientHeight + 1,
             slideCorta: sl.scrollHeight > sl.clientHeight + 1,
             alto: Math.round(p.getBoundingClientRect().height) };
  }));
  PRUEBAS.cierto(m.alto > 0, 'la lámina se está midiendo');
  PRUEBAS.igual(m.corta, false, 'el párrafo no se corta a 375×667');
  PRUEBAS.igual(m.slideCorta, false, 'ni la lámina entera');
});

/* ── R1 sobre TODO el diccionario, no sólo el carrusel ──────────────────────────────────────────
   R3 pedía revisar el carrusel. Al arreglar el detector apareció que el que había estaba ciego a
   las formas acentuadas, así que la pregunta pasó a ser otra: ¿y el resto de la app?
   Medido: 1.937 cadenas del diccionario español, cero voseo. Este caso lo deja vigilado.
   Es la regla que Franco ya tuvo que corregir DOS veces, y la que menos se nota al escribir: una
   línea nueva en rioplatense no rompe nada, no da error, y la lee un piloto en Venezuela. */

const P041_VOSEO = /(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|dale|registrate|anotá|probá|pedí|vení|entrá|salí|revisá|escribí|abrí|cerrá|marcá|cargá|guardá|volvé|seguí|dejá|poné|sacá|usá|buscá|completá|confirmá|esperá|avisá)(?![a-záéíóúüñ])/i;

function p041Barrer(obj){
  const malos = []; let n = 0;
  (function rec(o, ruta){
    if (typeof o === 'string'){
      n++;
      const m = o.match(P041_VOSEO);
      if (m) malos.push(ruta + ': «' + m[2] + '» en «' + o.slice(0, 60) + '»');
      return;
    }
    if (o && typeof o === 'object') Object.keys(o).forEach(k => rec(o[k], ruta ? ruta + '.' + k : k));
  })(obj, '');
  return { malos, n };
}

PRUEBAS.caso('🔴 R1 · CERO voseo en todo el diccionario español', () => {
  const r = p041Barrer(I18N.es);
  /* Guarda de medibilidad: si el diccionario cambia de forma y el barrido no llega a las cadenas,
     `malos` sería [] por no mirar nada. Un cero sin discriminador no es un resultado. */
  PRUEBAS.alMenos(r.n, 1000,
    'el barrido llegó a las cadenas · revisó ' + r.n + ', y eran ~1.937 cuando se escribió esto');
  PRUEBAS.igual(r.malos.slice(0, 8), [],
    '⚠️ español NEUTRO en TODO lo que se lee (R1) · ' + r.malos.length + ' con voseo — ' +
    r.malos.slice(0, 8).join(' | '));
});

PRUEBAS.caso('el DISCRIMINADOR del barrido: encuentra el voseo que le pongas', () => {
  /* ⚠️ El detector anterior usaba `\b` al final y en JavaScript `\b` está definido sobre
     `[A-Za-z0-9_]`: una `í` o una `é` NO cuentan como carácter de palabra, así que
     `/\belegí\b/` NO ENCUENTRA "elegí" nunca. Un detector de voseo con `\b` está ciego justo a
     las formas acentuadas, que son casi todas — y devuelve "0 defectos" sobre un texto lleno.
     Lo cazó este caso, no yo. */
  const r = p041Barrer({ a:'Elegí tu empresa', b:'Vos podés reportar', c:'Registrate acá',
                         d:'Eliges tu empresa y te registras' });
  PRUEBAS.igual(r.malos.length, 3,
    'encuentra las tres formas rioplatenses y deja pasar la neutra — ' + r.malos.join(' | '));
  PRUEBAS.cierto(r.malos.some(x => /eleg/i.test(x)), 'incluida una acentuada al final («elegí»)');
});
