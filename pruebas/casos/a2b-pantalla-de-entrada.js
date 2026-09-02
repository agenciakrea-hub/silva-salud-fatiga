
PRUEBAS.grupo('A2b · la pantalla de entrada en escritorio');

/* ⚠️ POR QUÉ EXISTE ESTE ARCHIVO. El usuario mandó una captura de PRODUCCIÓN a 1366 px con la
   pantalla de entrada rota: media tarjeta de otra lámina asomando pegada al borde izquierdo, y un
   vacío enorme abajo del bloque de botones. A2 había auditado el PANEL —17 pantallas, 204 corridas—
   y dado por cubierto el resto.
   La lección: no alcanza con auditar bien lo que tocaste, porque la gente no entra por donde vos
   trabajaste. Entra por la puerta. */

/* ⚠️ HAY QUE ABRIR EL SPLASH A MANO, y la primera versión de este archivo no lo hacía.
   El splash vive en `#splashOv`, un overlay que sólo se muestra con la clase `.show`. Con la suite
   corriendo ese overlay está cerrado, así que TODO adentro mide 0×0 — y una comprobación del tipo
   "no puede haber más de una lámina visible" sobre elementos de 0×0 encuentra CERO láminas y pasa.
   Los cuatro casos de este archivo daban verde sin medir absolutamente nada.
   Por eso abajo, además de abrirlo, va `a2bMedible()`: si lo que se va a medir no tiene tamaño, el
   caso FALLA en vez de pasar en silencio. Un verde que no midió nada es peor que un rojo. */
function a2bEnSplash(w, h, fn){
  const ov = document.getElementById('splashOv');
  const tenia = ov && ov.classList.contains('show');
  if (ov && !tenia) ov.classList.add('show');
  try {
    return PRUEBAS.enVentana(w, h, () => fn());
  } finally {
    if (ov && !tenia) ov.classList.remove('show');
  }
}

/* Devuelve true sólo si el elemento tiene superficie de verdad. Se usa como guarda para que un
   caso no pueda pasar por no haber podido medir. */
function a2bMedible(el){
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

PRUEBAS.caso('⚠️ el carrusel de presentación muestra UNA lámina, no una y media', () => {
  /* EL DEFECTO DE LA CAPTURA. `.splash-anim` es la caja que recorta la tira (`overflow:hidden`), y
     en escritorio tenía `padding-left` para alinearse con el logo. Pero `overflow` recorta en la
     caja de RELLENO, no en la de contenido: todo lo que se ponga como `padding` queda DENTRO de la
     ventana visible. Las láminas miden el 100% del contenido, así que por esa franja asomaba la
     lámina ANTERIOR.
     Medido a 1366x700 antes del arreglo: ventana 520 px, lámina 459, y 61 px de lámina vecina
     pegados al borde izquierdo — la que muestra "Normal / Elevado / Crítico".
     Se arregló pasando ese corrimiento de `padding` a `margin`, que queda AFUERA del recorte.

     ⚠️ Y SE MIDE CON LA TIRA ADELANTADA. En la lámina 0 no hay vecina a la izquierda, así que el
     defecto NO SE VE: medir siempre en la 0 es medir el único estado donde el bug no existe. Es
     justamente por eso que ninguna auditoría anterior lo había agarrado. */
  const anim = document.getElementById('splashAnim') || document.querySelector('.splash-anim');
  PRUEBAS.cierto(!!anim, 'tiene que existir la tira de presentación');
  const pista = anim && anim.children[0];
  PRUEBAS.cierto(!!pista && pista.children.length >= 2, 'con al menos dos láminas');
  if (!pista || pista.children.length < 2) return;

  const antes = { transform: pista.style.transform, transition: pista.style.transition };
  const malos = [];
  try {
    pista.style.transition = 'none';
    pista.style.transform = 'translateX(-100%)';          // adelantar una lámina
    [[1024,768],[1366,768],[1920,1080]].forEach(([w,h]) => {
      a2bEnSplash(w, h, () => {
        if (!a2bMedible(anim)) { malos.push(w + 'px: la tira mide 0 — no se pudo medir'); return; }
        const caja = anim.getBoundingClientRect();
        const visibles = [...pista.children].filter(d => {
          const r = d.getBoundingClientRect();
          return Math.min(r.right, caja.right) - Math.max(r.left, caja.left) > 4;
        });
        if (visibles.length !== 1) malos.push(w + 'px: se ven ' + visibles.length + ' láminas');
      });
    });
  } finally {
    pista.style.transform = antes.transform; pista.style.transition = antes.transition;
  }
  PRUEBAS.igual(malos, [],
    'dentro de la ventana de recorte puede haber UNA sola lámina — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ la caja que recorta la tira no puede tener relleno lateral', () => {
  /* La causa raíz, vigilada aparte del síntoma. El síntoma de arriba sólo aparece con la tira
     adelantada y en ciertos anchos; la causa se puede comprobar siempre y explica el "por qué".
     Si alguien vuelve a poner `padding` acá para alinear algo, esto lo dice antes de que se vea. */
  const anim = document.getElementById('splashAnim') || document.querySelector('.splash-anim');
  if (!anim) { PRUEBAS.cierto(true, 'sin tira no aplica'); return; }
  const flojos = [];
  [[1024,768],[1366,768],[1920,1080]].forEach(([w,h]) => {
    a2bEnSplash(w, h, () => {
      const cs = getComputedStyle(anim);
      const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
      if (pl > 2 || pr > 2) flojos.push(w + 'px: relleno ' + pl + '/' + pr);
    });
  });
  PRUEBAS.igual(flojos, [],
    'el corrimiento va por `margin`: el relleno queda adentro del recorte y por ahí asoma la ' +
    'lámina de al lado — ' + flojos.join(' | '));
});

PRUEBAS.caso('⚠️ en escritorio el bloque de acciones queda CENTRADO en su panel', () => {
  /* EL SEGUNDO DEFECTO DE LA CAPTURA, y ninguna de las cinco medidas del auditor lo agarraba: un
     bloque con 87 px de aire arriba y 266 abajo no está cortado, ni solapado, ni tiene poco
     contraste. Está mal puesto, y se ve mal.
     La causa: las acciones vivían en la fila 1 de la grilla y el pie en la 2, mientras la fila 3
     —la de la tira— existe SÓLO del lado izquierdo. Esa fila quedaba muerta a la derecha y empujaba
     todo hacia arriba. Se resolvió metiendo la columna derecha en su propia caja (`.splash-der`),
     que ocupa las tres filas y centra lo suyo.
     En una grilla CSS las filas son de toda la grilla, no de una columna: sin esa caja no hay forma
     de que la fila 3 no exista para la derecha. Por eso el arreglo es de marcado y no de CSS solo. */
  const wrap = document.querySelector('.splash-wrap');
  const acc = document.querySelector('.splash-acciones');
  const pie = document.querySelector('.splash-pie');
  if (!wrap || !acc || !pie) { PRUEBAS.cierto(true, 'sin splash no aplica'); return; }
  const malos = [];
  [[1024,768],[1366,768],[1920,1080]].forEach(([w,h]) => {
    a2bEnSplash(w, h, () => {
      if (!a2bMedible(wrap) || !a2bMedible(pie)) { malos.push(w + 'px: el splash mide 0 — no se pudo medir'); return; }
      const rw = wrap.getBoundingClientRect();
      const arriba = Math.round(acc.getBoundingClientRect().top - rw.top);
      const abajo  = Math.round(rw.bottom - pie.getBoundingClientRect().bottom);
      /* Se tolera hasta el doble: un bloque puede respirar distinto arriba que abajo sin que se
         note. Tres veces ya se lee como "quedó pegado arriba", que es lo que se veía. */
      if (Math.max(arriba, abajo) > 40 && Math.max(arriba, abajo) > Math.min(arriba, abajo) * 2){
        malos.push(w + 'px: ' + arriba + ' arriba contra ' + abajo + ' abajo');
      }
    });
  });
  PRUEBAS.igual(malos, [], 'el bloque tiene que quedar centrado — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ y en celular el envoltorio nuevo no existe para el layout', () => {
  /* `.splash-der` se agregó para escritorio. En celular tiene que ser `display:contents`, o sea
     invisible para el layout: si fuera una caja, `.splash-cuerpo` pasaría de repartir el aire entre
     tres hijos (marca, acciones, pie) a repartirlo entre dos, y el splash del teléfono —que es por
     donde entra el piloto— cambiaría sin que nadie lo pidiera. */
  const der = document.querySelector('.splash-der');
  if (!der) { PRUEBAS.cierto(true, 'sin envoltorio no aplica'); return; }
  const malos = [];
  [[320,800],[375,812],[768,1024]].forEach(([w,h]) => {
    a2bEnSplash(w, h, () => {
      const d = getComputedStyle(der).display;
      if (d !== 'contents') malos.push(w + 'px: display ' + d);
    });
  });
  PRUEBAS.igual(malos, [], 'en celular y tablet tiene que ser `contents` — ' + malos.join(' | '));
  PRUEBAS.enVentana(1366, 768, () => {
    PRUEBAS.igual(getComputedStyle(der).display, 'flex',
      'y en escritorio SÍ una caja: si acá también fuera `contents`, la comprobación de arriba no ' +
      'estaría distinguiendo nada');
  });
});
