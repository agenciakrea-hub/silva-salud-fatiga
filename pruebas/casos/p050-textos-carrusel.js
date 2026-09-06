/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P050 · N4 · LOS TEXTOS DEL CARRUSEL DE BIENVENIDA                               (2026-09-06)

   ── LOS DOS QUE MANDABA SACAR EL PLAN, Y POR QUÉ NO ERAN CAPRICHO ───────────────────────────
   1. **El roadmap de las pulseras.** La lámina 3 decía «Estamos sumando pulseras y relojes que
      miden sueño y frecuencia cardíaca». Le anunciaba a un empleado una función que no existe, y
      —peor— en una aplicación que le da su empresa, «vamos a medirte el sueño» se lee como
      vigilancia. Eso es exactamente lo que hace que alguien no conteste la verdad en el KSS, que
      es el dato del que depende todo lo demás (R4).
   2. **«En menos de un minuto quedas dentro».** El inventario de Q4a midió el alta de un empleado
      nuevo: 11 acciones, y 7 después de la puerta única de Q4b. Prometer un tiempo que la propia
      medición desmiente es la clase de frase que hace desconfiar del resto de la pantalla.

   ── LO QUE ENTRÓ EN LUGAR DEL ROADMAP, Y POR QUÉ ES VERIFICABLE ──────────────────────────────
   «La aplicación no usa ubicación, micrófono ni sensores del teléfono». No es una promesa: es una
   propiedad del código, y este archivo la comprueba contra la fuente. Dice lo contrario de lo que
   se leía antes y ataca la misma desconfianza, pero con algo que se puede sostener.

   ── EL DEFECTO QUE APARECIÓ MIENTRAS SE HACÍA ────────────────────────────────────────────────
   El HTML inline y el diccionario tenían textos DISTINTOS para las mismas claves: el HTML se había
   quedado con la versión vieja. El inline es lo que se ve hasta que corre `aplicarIdioma()`, así
   que la pantalla podía mostrar el roadmap por un instante —o para siempre, si esa función falla—
   después de haberlo sacado del diccionario. Un texto en dos lugares diverge; el caso de abajo
   falla si vuelven a separarse.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P050 · los textos del carrusel de bienvenida');

const P050_CLAVES = ['car1_tit','car1_cuerpo','car2_tit','car2_cuerpo','car3_tit','car3_cuerpo',
                     'car4_tit','car5_tit','car5_cuerpo'];

function p050Fuente() {
  return [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
}

PRUEBAS.caso('⚠️ ninguna lámina anuncia una función que todavía no existe', () => {
  const antes = idiomaActual();
  try {
    ['es','en'].forEach(idi => {
      fijarIdioma(idi);
      const todo = P050_CLAVES.map(k => String(t(k) || '')).join(' ').toLowerCase();
      /* DISCRIMINADOR: la lista tiene que poder ponerse roja. Si alguien la vacía por accidente,
         este renglón lo delata antes de que el caso pase en falso. */
      PRUEBAS.cierto(/pulsera|wristband/.test('con pulseras y relojes'),
        'guarda: el detector encuentra la palabra cuando está');
      ['pulsera','reloj inteligente','wearable','wristband','smartwatch',
       'estamos sumando','todavía no está activo','coming soon','planned integration']
        .forEach(mala => {
          PRUEBAS.falso(todo.indexOf(mala) >= 0,
            '⚠️ [' + idi + '] «' + mala + '» le anuncia al empleado algo que no puede usar, y en una ' +
            'app de su empresa se lee como vigilancia');
        });
    });
  } finally { fijarIdioma(antes); }
});

PRUEBAS.caso('⚠️ ninguna lámina promete un tiempo que la medición desmiente', () => {
  const antes = idiomaActual();
  try {
    ['es','en'].forEach(idi => {
      fijarIdioma(idi);
      const todo = P050_CLAVES.map(k => String(t(k) || '')).join(' ').toLowerCase();
      PRUEBAS.falso(/menos de un minuto|en un minuto|under a minute|in seconds flat|al instante/.test(todo),
        '⚠️ [' + idi + '] el alta son 7 acciones medidas (11 antes de Q4b): no se promete un tiempo');
    });
  } finally { fijarIdioma(antes); }
});

PRUEBAS.caso('⚠️ «no usa ubicación ni micrófono» es CIERTO, no una promesa', () => {
  /* El texto nuevo afirma una propiedad del código. Si mañana alguien agrega geolocalización, el
     texto pasa a ser mentira — y esta es la única forma de que se entere alguien. */
  const f = p050Fuente();
  const apis = ['geolocation', 'getUserMedia', 'navigator.contacts', 'navigator.bluetooth',
                'DeviceMotionEvent', 'DeviceOrientationEvent'];
  const usadas = apis.filter(a => f.indexOf(a) >= 0);
  /* Guarda de medibilidad: si la fuente no se leyó, `usadas` sale vacío por la razón equivocada. */
  PRUEBAS.alMenos(f.length, 100000,
    'guarda de medibilidad: se leyó la fuente de verdad · largo ' + f.length);
  PRUEBAS.igual(usadas, [],
    '⚠️ la lámina 3 afirma que la app no usa estos sensores. Si se agrega alguno, hay que cambiar ' +
    'el texto ANTES: quedaría diciendo una mentira en la pantalla que más se mira');
});

PRUEBAS.caso('⚠️ el HTML inline dice lo MISMO que el diccionario español', () => {
  /* El inline es lo que se ve hasta que corre `aplicarIdioma()`. Cuando divergen, la pantalla
     muestra la versión vieja por un instante — o para siempre si esa función falla. Pasó: el
     diccionario ya no tenía el roadmap de las pulseras y el HTML sí. */
  const antes = idiomaActual();
  try {
    fijarIdioma('es');
    const distintos = [];
    document.querySelectorAll('#carOv [data-i18n], .car-slide [data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (!/^car/.test(k)) return;
      const dic = String(t(k) || '').trim();
      const html = (el.textContent || '').trim();
      if (dic && html && dic !== html) distintos.push(k + ': html «' + html.slice(0,40) + '…» ≠ dic «' + dic.slice(0,40) + '…»');
    });
    /* Guarda de medibilidad: sin elementos que comparar, el caso pasaría sin haber mirado nada. */
    const cuantos = [...document.querySelectorAll('.car-slide [data-i18n]')].filter(e => /^car/.test(e.getAttribute('data-i18n'))).length;
    PRUEBAS.alMenos(cuantos, 5, 'guarda de medibilidad: hay claves `car*` en el HTML · encontré ' + cuantos);
    PRUEBAS.igual(distintos, [], '⚠️ el texto vive en dos lugares y se separaron');
  } finally { fijarIdioma(antes); }
});

PRUEBAS.caso('⚠️ R1 · español NEUTRO en los textos nuevos, y las dos versiones existen', () => {
  const antes = idiomaActual();
  try {
    fijarIdioma('es');
    const rioplatense = /\b(pod[eé]s|ten[eé]s|quer[eé]s|sab[eé]s|hac[eé]s|deb[eé]s|eleg[ií]|fijate|acordate|vos)\b/i;
    PRUEBAS.cierto(rioplatense.test('Si querés, podés elegirlo vos'),
      'DISCRIMINADOR: el detector encuentra el voseo cuando está');
    const malas = P050_CLAVES.filter(k => rioplatense.test(String(t(k) || '')));
    PRUEBAS.igual(malas, [], '⚠️ el cliente es venezolano: tú o impersonal, nunca voseo');
    fijarIdioma('en');
    const faltan = P050_CLAVES.filter(k => !String(t(k) || '').trim());
    PRUEBAS.igual(faltan, [], '⚠️ R14 · las claves nuevas existen también en inglés');
  } finally { fijarIdioma(antes); }
});
