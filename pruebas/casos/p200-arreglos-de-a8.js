PRUEBAS.grupo('P200 · los arreglos de A8 que sobrevivieron a la refutación');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   La auditoría de cierre de tanda (P091 · A8) devolvió 44 hallazgos. P200 los pasó por dos
   escépticos independientes cada uno, con lentes distintas: uno rehacía la medición desde cero
   buscando el instrumento que miente, el otro miraba si había una guarda más arriba y si el defecto
   era de esta tanda o preexistente. Un hallazgo caía sólo si LOS DOS lo refutaban.

   De 39 juzgados cayó **uno** (el del calendario, porque ya se había arreglado en P091 — o sea que
   el mecanismo distingue). Este archivo ancla los que se arreglaron después de esa criba.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p200Lum(c){
  const v = (String(c).match(/\d+(\.\d+)?/g) || [0,0,0]).slice(0,3).map(Number)
    .map(x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); });
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
}
/* ⚠️ Resuelve `var(--x)` al color que el navegador computa. Sin esto, comparar dos cadenas `var()`
   da 1:1 para TODO — me pasó midiendo estos mismos chips, y un 1 parejo se lee como «roto» cuando en
   realidad es el medidor que no mide. */
function p200Token(expr){
  const d = document.createElement('div');
  document.body.appendChild(d);
  try { d.style.color = expr; return getComputedStyle(d).color; } finally { d.remove(); }
}
function p200Contraste(a, b){ return CTX.contraste(p200Token(a), p200Token(b)); }

function p200MedirClase(tag, cls){
  const e = document.createElement(tag);
  e.className = cls;
  document.body.appendChild(e);
  try {
    const cs = getComputedStyle(e);
    return { tinta: cs.color, fondo: cs.backgroundColor, contraste: CTX.contraste(cs.color, cs.backgroundColor),
             alto: e.getBoundingClientRect().height };
  } finally { e.remove(); }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   36 · EL CHIP DE LA FICHA MÉDICA SE PINTABA CON EL COLOR DE RELLENO

   `APT_ESTADOS` tiene dos colores por estado: `c` es el RELLENO del semáforo (el punto, la barra),
   pensado para verse como bloque, y `ct` la variante legible como tinta. La ficha escribía la tinta
   del chip con `c`, así que en tema claro seis de los siete estados quedaban entre 2,81 y 3,95:1.
   `ct` existía desde que se creó `APT_ESTADOS` y `aptEstadoInfo` ya lo devolvía: sólo no se usaba.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200 · los siete estados de aptitud pasan 4.5:1 como chip, en los DOS temas', () => {
  ['claro', 'oscuro'].forEach(tema => {
    PRUEBAS.enTema(tema, () => {
      const claves = Object.keys(APT_ESTADOS || {});
      PRUEBAS.alMenos(claves.length, 7, 'guarda: hay siete estados que medir · un cero acá sería un medidor que no mide');
      const malos = [], viejos = [];
      claves.forEach(k => {
        const e = aptEstadoInfo(k);
        if (!e) return;
        const conCt = p200Contraste(e.ct || e.c, e.bg);
        const conC  = p200Contraste(e.c, e.bg);
        if (conCt < 4.5) malos.push(k + ' ' + conCt + ':1');
        if (conC < 4.5) viejos.push(k);
      });
      PRUEBAS.igual(malos, [], '🔴 con `ct` los siete pasan 4.5:1 en tema ' + tema);
      if (tema === 'claro'){
        /* DISCRIMINADOR · con el color viejo, seis de siete fallaban. Si esta cuenta diera 0, el
           medidor no estaría distinguiendo nada y el aserto de arriba no probaría el arreglo. */
        PRUEBAS.alMenos(viejos.length, 5,
          'DISCRIMINADOR · con el color de relleno (`c`) fallaban ' + viejos.length + ' de ' + claves.length + ' en claro: ' + viejos.join(', '));
      }
    });
  });
});

PRUEBAS.caso('⚠️ P200 · y la ficha usa `ct`, no `c` · si alguien lo revierte, esto avisa', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.cierto(/class="fm-chip" style="color:' \+ \(est\.ct \|\| est\.c\)/.test(src),
      '⚠️ el chip se pinta con `est.ct || est.c`');
    PRUEBAS.igual((src.match(/class="fm-chip" style="color:' \+ est\.c\s*\+/g) || []).length, 0,
      'DISCRIMINADOR · y no quedó ninguna copia pintando con el relleno');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   38 y 40 · UN BLANCO ESCRITO A MANO Y UN GRIS AL LÍMITE
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200 · el botón de guardar nota y el «opcional» del formulario pasan en los dos temas', () => {
  ['claro', 'oscuro'].forEach(tema => {
    PRUEBAS.enTema(tema, () => {
      const btn = p200MedirClase('button', 'fm-nota-btn');
      PRUEBAS.alMenos(btn.contraste, 4.5,
        '🔴 «Guardar nota» en ' + tema + ': ' + btn.contraste + ':1 · antes 4,35 en claro y 2,13 en oscuro, con `#fff` escrito a mano');
      PRUEBAS.alMenos(btn.alto, 44, 'y sigue midiendo 44 px de alto');
      const opt = p200MedirClase('span', 'an-opt');
      PRUEBAS.alMenos(opt.contraste, 4.5, '«opcional» en ' + tema + ': ' + opt.contraste + ':1 · antes 4,45, a 0,05 del mínimo');
    });
  });
});

PRUEBAS.caso('⚠️ P200 · R13 · ni el botón ni el chip llevan un color escrito a mano', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('.fm-nota-btn {');
    PRUEBAS.alMenos(i, 0, 'guarda: la regla existe');
    const regla = src.slice(i, src.indexOf('}', i));
    PRUEBAS.igual((regla.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || []), [],
      '⚠️ `.fm-nota-btn` no tiene ni un color literal (R13) · «' + regla.replace(/\s+/g, ' ').slice(0, 120) + '»');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   27 y 28 · DOS OBJETIVOS TÁCTILES POR DEBAJO DE 44

   El «Deshacer» del toast medía 75×25 y es la ÚNICA salida de una acción con consecuencia
   operativa —deshacer una ausencia recién marcada— con cuatro segundos para acertarle. La ✕ del
   detalle del calendario medía 34×34 en los dos lugares donde vive.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200 · el «Deshacer» del toast y la ✕ del calendario llegan a 44 px', () => {
  const btn = p200MedirClase('button', 'toast-btn');
  PRUEBAS.alMenos(btn.alto, 44, '🔴 el botón del toast mide ' + btn.alto + ' px de alto · antes 25');
  const x = p200MedirClase('button', 'cmes-det-x');
  PRUEBAS.alMenos(x.alto, 44, '🔴 la ✕ del detalle del día mide ' + x.alto + ' px · antes 34');
  const flecha = p200MedirClase('button', 'cmes-flecha');
  PRUEBAS.igual(x.alto, flecha.alto,
    'y es del mismo tamaño que la flecha de mes, en la misma tarjeta · no hay razón para que cerrar sea más difícil que navegar');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   42 · «INACTIVO» NO ES «REGISTRÓ SIN MARCAR LA SALIDA DE CASA»

   `cicloEstado` devuelve `inactivo` cuando en lo cargado no está el evento que abre el ciclo. El
   caso más común no es un descuido: es el PRIMER día del período traído, cuya jornada empezó antes
   del corte. Con el rótulo viejo el calendario le atribuía a alguien un olvido que no cometió, y lo
   subía a las fichas de excepción —lo que el médico mira primero— todos los meses.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200 · un ciclo sin su evento de apertura no acusa a nadie, y no sube a las excepciones', () => {
  PRUEBAS.igual(cmesCaso({ estado: 'inactivo' }), 'sin_apertura',
    '🔴 el caso se llama `sin_apertura`, no `parcial`');
  PRUEBAS.igual(cmesCaso(null), 'sin_apertura', 'y sin estado, lo mismo');
  const rotulo = cmesRotulo('sin_apertura');
  PRUEBAS.cierto(!!rotulo && rotulo !== 'cmes_e_sin_apertura', 'tiene rótulo traducido: «' + rotulo + '»');
  PRUEBAS.igual(rotulo.toLowerCase().indexOf('registró'), -1,
    '⚠️ y el rótulo nombra el HECHO, no a la persona · «Registró sin marcar…» acusaba de un olvido que casi nunca ocurrió');

  /* DISCRIMINADOR · el caso sigue existiendo y teniendo color propio; lo que cambió es el rótulo y
     que ya no entra en «necesita una mirada». */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.cierto(/const MIRAR = \['exceso', 'excedido', 'sin_cierre', 'detenido'\]/.test(src),
      '🔴 y `sin_apertura` NO está en la lista de lo que necesita una mirada');
    PRUEBAS.cierto(/\.cmes-c-sin_apertura/.test(src), 'DISCRIMINADOR · pero sigue teniendo su propia regla de color (no quedó sin pintar)');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   44 · DOS CLAVES QUE NACIERON SIN LLAMADOR
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ P200 · la leyenda tiene rótulo y el pie dice de dónde sale el dato', () => {
  const prev = Object.assign({}, localStorage);
  let fuente = '';
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    fuente = src;
    CTX.resetear({ cargo: 'Piloto', esPiloto: true });
    localStorage.setItem(K_CICLO_SRV_PER, JSON.stringify({ dias: 30, desde: null, hasta: null, ts: Date.now() }));
    const cont = document.createElement('div');
    cont.innerHTML = cmesBloqueHtml('mio', cicloYo(), todayStr().slice(0, 7));

    const ley = cont.querySelector('.cmes-leyenda');
    PRUEBAS.cierto(!!ley, 'guarda: la leyenda está');
    PRUEBAS.cierto((ley.textContent || '').indexOf(t('cmes_leyenda')) >= 0,
      '⚠️ y lleva su rótulo («' + t('cmes_leyenda') + '») · la clave existía y no la usaba nadie');

    const pie = cont.querySelector('.cmes-pie');
    PRUEBAS.cierto(pie && (pie.textContent || '').indexOf(t('cmes_fuente_mio')) >= 0,
      '⚠️ y el pie dice de dónde sale el dato · hace falta porque el inicio tiene DOS grillas de días una al lado de la otra, y no se alimentan de lo mismo');

    /* DISCRIMINADOR · en el panel del médico esa línea NO va: no es «tu» actividad, y ahí no hay
       otra grilla con la que confundirla. Se lee del código y no pintando el panel, porque
       `cmesBloqueHtml('panel', …)` necesita un `DASH` armado y este caso es del piloto — montar uno
       a mano para probar una línea de copy sería justo lo que R17 prohíbe. */
    PRUEBAS.cierto(/if \(ambito === 'mio'\) pie\.push\(esc\(t\('cmes_fuente_mio'\)\)\);/.test(fuente),
      'DISCRIMINADOR · y sólo se emite en el ámbito «mio» · en la ficha del médico no aparece');
  }).finally(() => {
    /* R18 · en el `.finally()` de la promesa, nunca en un `finally` sincrónico: ése corre antes que
       el `.then` y deja la basura puesta para la prueba siguiente. */
    try { localStorage.clear(); Object.keys(prev).forEach(k => localStorage.setItem(k, prev[k])); } catch(e){}
    try { renderSections(); } catch(e){}
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   21 · LOS ATRIBUTOS QUE NO SE TRADUCÍAN

   Nueve de los once ojos de contraseña y los dos deslizadores de tamaño de texto tenían el
   `aria-label` escrito en el marcado estático sin `data-i18n-attr`, así que con la app en inglés
   seguían diciendo «Ver contraseña» y «Tamaño del texto». Las claves ya existían en los dos
   diccionarios: lo que faltaba era el atributo que las engancha.

   Por qué no lo cazó nada: el barrido de textos de P191 recorta la fuente desde `const I18N` hacia
   atrás hasta el `<script>`, así que el marcado estático le queda entero afuera.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200 · con la app en inglés, ningún ojo de contraseña ni deslizador queda en español', () => {
  const idioma0 = idiomaActual();
  try {
    const leer = () => ({
      ojos: [...document.querySelectorAll('button.pw-eye')].map(b => b.getAttribute('aria-label')),
      slid: [...document.querySelectorAll('input[type="range"][aria-label]')].map(b => b.getAttribute('aria-label'))
    });
    fijarIdioma('es'); void document.body.offsetHeight;
    const es = leer();
    PRUEBAS.alMenos(es.ojos.length, 11, 'guarda: hay once ojos de contraseña en el documento');
    PRUEBAS.alMenos(es.slid.length, 2, 'guarda: y dos deslizadores de tamaño de texto');

    fijarIdioma('en'); void document.body.offsetHeight;
    const en = leer();
    PRUEBAS.igual(en.ojos.filter(x => x === es.ojos[0]), [],
      '🔴 ninguno de los once quedó en español · antes quedaban nueve');
    PRUEBAS.igual(en.slid.filter(x => x === es.slid[0]), [],
      '🔴 ni los dos deslizadores');
    PRUEBAS.igual([...new Set(en.ojos)], [t('ver_contrasena')], 'y los once dicen lo mismo, que es la clave traducida');

    /* DISCRIMINADOR · volver a español los devuelve · el mecanismo engancha en las dos direcciones,
       no es que se hayan quedado pegados en inglés. */
    fijarIdioma('es'); void document.body.offsetHeight;
    PRUEBAS.igual([...new Set(leer().ojos)], [es.ojos[0]],
      'DISCRIMINADOR · y al volver a español vuelven a decirlo en español');
  } finally {
    try { fijarIdioma(idioma0 || 'es'); } catch(e){}
  }
});
