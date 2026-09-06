/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P046 · A6 · LAS LÁMINAS DEL SPLASH SE LEEN ENTERAS                              (2026-09-06)

   ── POR QUÉ ESTE ARCHIVO EXISTE ─────────────────────────────────────────────────────────────
   `m5-coherencia-visual.js` ya comprueba que el texto de SAFTE nombre el wearable. Estaba en
   verde. Y el wearable NO SE VEÍA: la prueba hace `t('spl_safte_d')`, o sea lee el DICCIONARIO,
   y el `-webkit-line-clamp` cortaba la última línea en pantalla. El texto existía en el archivo
   y no existía para la persona.

   Es R17 con la cara de siempre: se probó la cadena, no lo que la cadena produce. La diferencia
   acá es que el eslabón que fallaba no era otra capa de código sino **el layout**, que ninguna
   prueba miraba.

   ── QUÉ SE PERDÍA, EXACTAMENTE ──────────────────────────────────────────────────────────────
   · «Modelo predictivo SAFTE»        perdía «Con wearable, más precisión.»
   · «Médicos detrás de cada alerta»  perdía «la persona.», dejando «Siempre decide…»
   El segundo importa más de lo que parece: la frase truncada dice lo CONTRARIO. Sin sujeto,
   «Siempre decide…» se lee como que decide el sistema — y el punto entero de R2 y R4 es que la
   decisión es de la persona y la aptitud la firma el médico.
   Medido en 320, 1366 y 1920. En 375, 390 y 768 entraba bien, que es por qué nadie lo vio.

   ── CÓMO SE MIDE, Y POR QUÉ ASÍ ─────────────────────────────────────────────────────────────
   Se mide LA TINTA, con un `Range`: `scrollHeight` no sirve —con `line-clamp` devuelve exactamente
   `clientHeight`, o sea que el navegador dice que todo entra— y `innerText` tampoco, porque
   devuelve el texto completo esté o no visible (R11 ya lo advierte para otra cosa).
   `getClientRects()` da una caja por renglón e incluye los que el clamp esconde: comparando cada
   renglón contra la caja del elemento se sabe cuáles quedaron afuera.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P046 · A6 · las láminas del splash se leen enteras');

/* ⚠️ A6b · LA REJILLA NO PUEDE SER LA QUE DEFINIÓ EL ARREGLO. La primera versión usaba los seis
   anchos del cierre de tanda —320/375/390/768/1366/1920— y el arreglo se eligió midiendo en ellos:
   o sea que se midió el arreglo en los anchos que el arreglo arregla. El primer ancho de escritorio
   de esa lista es 1366 y el defecto moría en 1074, así que la banda 900–1073 quedó viva y con ella
   la lámina médica leyéndose «…Siempre decid…» en un iPad apaisado.
   Lo que se agrega, y por qué cada uno:
   · 900  → el primer píxel del layout de escritorio, donde el defecto era peor.
   · 1024 → iPad apaisado y portátil viejo, el caso más común de la banda.
   · los altos 650 y 768 → el chip pisaba la última línea por debajo de ~700 px de alto útil, y
     ninguno de los altos anteriores bajaba de 800. Un portátil de 1366×768 deja ~650 útiles.
   Regla para el que venga: si un arreglo se decide midiendo, la prueba mide MÁS de lo que se midió
   para decidirlo, no lo mismo. */
const P046_ANCHOS = [[320,800],[375,667],[375,812],[390,844],[768,1024],
                     [900,650],[900,800],[1024,650],[1024,768],[1366,650],[1366,768],[1920,1080]];

/* Renglones que quedan FUERA de la caja de su elemento. Devuelve también qué texto se pierde, que
   es lo único que permite decidir si el recorte importa o no. */
function p046Recorte(doc, span) {
  const rb = span.getBoundingClientRect();
  if (!rb.width) return null;
  const rg = doc.createRange();
  rg.selectNodeContents(span);
  const cajas = [...rg.getClientRects()].filter(c => c.width);
  const fuera = cajas.filter(c => c.bottom > rb.bottom + 1).length;
  if (!fuera) return null;
  /* Se busca el primer carácter que cae fuera, para poder DECIR qué se pierde en vez de sólo
     contar renglones. Un "pierde 1 línea" no deja decidir; "pierde «la persona.»" sí. */
  const nodo = span.firstChild;
  const txt = nodo && nodo.nodeType === 3 ? nodo.textContent : '';
  let corte = txt.length;
  for (let i = 0; i < txt.length; i++) {
    const r2 = doc.createRange();
    r2.setStart(nodo, i); r2.setEnd(nodo, i + 1);
    if (r2.getBoundingClientRect().bottom > rb.bottom + 1) { corte = i; break; }
  }
  return { lineasFuera: fuera, sePierde: txt.slice(corte).trim() };
}

/* ⚠️ SE MIDE CON `PRUEBAS.enVentana`, NO CON UN IFRAME PROPIO. El primer intento creaba su
   iframe y medía en `onload`: daba CERO láminas en los seis anchos, porque la tira se construye
   después de cargar y `onload` llega antes. La guarda de medibilidad lo cazó — sin ella el caso
   habría dado verde sin mirar una sola lámina, que es exactamente el defecto que vino a cerrar.
   `enVentana` redimensiona el iframe donde la suite YA tiene la app viva y construida. */
/* ⚠️ EL SPLASH TIENE QUE ESTAR ABIERTO, Y ESTO TAMBIÉN LO ENCONTRÓ EL DISCRIMINADOR. Con el
   overlay cerrado las láminas existen en el DOM pero miden 0×0, así que `p046Recorte` devuelve
   null para todas y el caso principal daba VERDE sin haber medido nada. La primera guarda contaba
   `querySelectorAll(...).length` — que cuenta elementos, no elementos VISIBLES— y no lo vio.
   Se deja como estaba al terminar: otros casos de la suite dependen del estado del overlay. */
function p046ConSplash(fn) {
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov && ov.classList.contains('show');
  if (ov && !yaAbierto) ov.classList.add('show');
  void document.body.offsetWidth;
  try { return fn(); }
  finally { if (ov && !yaAbierto) ov.classList.remove('show'); void document.body.offsetWidth; }
}

function p046PorAncho(fn) {
  return p046ConSplash(() => {
    const salida = {};
    P046_ANCHOS.forEach(([w, h]) => { salida[w] = PRUEBAS.enVentana(w, h, () => fn(document)); });
    return salida;
  });
}

/* Láminas que de verdad ocupan lugar. Es lo que hace medible al resto. */
function p046Visibles(d) {
  return [...d.querySelectorAll('.spl-p-tx span')].filter(e => e.getBoundingClientRect().width > 0).length;
}

function p046Perdidas(d) {
  const out = [];
  d.querySelectorAll('.spl-p-tx').forEach(tx => {
    const span = tx.querySelector('span');
    if (!span) return;
    const r = p046Recorte(d, span);
    const b = tx.querySelector('b');
    if (r) out.push(((b && b.textContent) || '?').slice(0, 30) + ' → pierde "' + r.sePierde + '"');
  });
  return out;
}

PRUEBAS.caso('⚠️ ninguna lámina del splash pierde texto, en los SEIS anchos', () => {
  const vistas = p046PorAncho(p046Visibles);
  PRUEBAS.alMenos(Math.min(...Object.values(vistas)), 5,
    '⚠️ guarda de medibilidad: en cada ancho hay láminas que medir · si esto falla, los ceros de ' +
    'abajo no significan nada · vistas: ' + JSON.stringify(vistas));

  const porAncho = p046PorAncho(p046Perdidas);
  Object.keys(porAncho).forEach(w => {
    PRUEBAS.igual(porAncho[w], [],
      '⚠️ a ' + w + 'px se lee todo · «Con wearable, más precisión.» y «la persona.» son las dos ' +
      'que se perdían, y la segunda invierte el sentido de la frase');
  });
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · con la columna angosta el caso de arriba se pone rojo', () => {
  /* Sin esto, «0 láminas cortadas» podría ser que el medidor no mide. Se vuelve a poner el layout
     de columnas iguales que tenía el defecto y se comprueba que la medición LO ENCUENTRA.

     ⚠️ SE MIDE A 900, NO A 1366, y el cambio lo obligó el arreglo mismo. Este discriminador nació
     midiendo a 1366; cuando A6b sumó el `line-clamp: 5`, revertir SÓLO la columna dejó de perder
     texto a 1366 y el discriminador se puso rojo sobre código correcto — o sea que dejó de
     discriminar sin avisar de qué. Medido revirtiendo únicamente la columna: el defecto aparece de
     900 a 1024 y muere en 1100. A 900 es donde esa mitad del arreglo de verdad manda. */
  const st = document.createElement('style');
  st.textContent = '@media (min-width:900px){ .spl-p { grid-template-columns: 1fr 1fr !important; } }';
  document.head.appendChild(st);
  let con, medibles;
  try {
    con = p046ConSplash(() => PRUEBAS.enVentana(900, 800, () => {
      medibles = p046Visibles(document);
      return p046Perdidas(document);
    }));
  } finally { st.remove(); void document.body.offsetWidth; }
  PRUEBAS.alMenos(medibles, 5,
    '⚠️ guarda de medibilidad DEL discriminador: había láminas visibles a 900 · vistas: ' + medibles);
  PRUEBAS.alMenos(con.length, 1,
    '⚠️ con las columnas iguales TIENE que encontrar recorte · si da 0, el medidor no mide y el ' +
    'caso de arriba es decorativo · encontró: ' + JSON.stringify(con));
});

PRUEBAS.caso('⚠️ EL SEGUNDO DISCRIMINADOR · sin el clamp de 5 el caso también se pone rojo', () => {
  /* El primer discriminador sólo cubría la mitad del arreglo (el ancho de la columna). Si alguien
     borraba el `-webkit-line-clamp: 5`, el caso 1 se ponía rojo igual —lo comprobé— pero por
     accidente: no había nada que lo declarara, así que nadie iba a notar si esa cobertura se
     perdía. Acá se declara. */
  const st = document.createElement('style');
  st.textContent = '.spl-p-tx span { -webkit-line-clamp: 4 !important; }';
  document.head.appendChild(st);
  let con;
  try { con = p046ConSplash(() => PRUEBAS.enVentana(900, 800, () => p046Perdidas(document))); }
  finally { st.remove(); void document.body.offsetWidth; }
  PRUEBAS.alMenos(con.length, 1,
    '⚠️ con el clamp en 4 TIENE que encontrar recorte a 900px · si da 0, esa mitad del arreglo no ' +
    'la vigila nadie · encontró: ' + JSON.stringify(con));
});

PRUEBAS.caso('⚠️ el chip no se monta sobre la última línea del texto', () => {
  /* Lo reportó el auditor como «.spl-p-tx × .spl-chip (123×4px)», que suena a nada. Mirándolo a
     escala, el borde del chip cruzaba POR ENCIMA de la base de la última línea: «Aeroambulancias
     Silva» con una raya atravesándolo. Medir dio el dato; mirar dio la gravedad. */
  const porAncho = p046PorAncho(d => {
    const out = [];
    d.querySelectorAll('.spl-p').forEach(p => {
      const tx = p.querySelector('.spl-p-tx'), chip = p.querySelector('.spl-chip');
      if (!tx || !chip) return;
      const a = tx.getBoundingClientRect(), b = chip.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (h > 0) out.push(((p.querySelector('b') || {}).textContent || '?').slice(0, 26) + ' ' + Math.round(h) + 'px');
    });
    return out;
  });
  Object.keys(porAncho).forEach(w => {
    PRUEBAS.igual(porAncho[w], [], '⚠️ a ' + w + 'px el chip no pisa el texto');
  });
});
