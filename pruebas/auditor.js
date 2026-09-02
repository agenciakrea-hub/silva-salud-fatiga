/* ══════════════════════════════════════════════════════════════════════════════════════════════
   AUDITOR VISUAL · Silva Salud Fatiga                                            (A1, 2026-08-29)

   QUÉ ES: mide contraste, cortes, solapamientos y áreas de toque sobre el DOM real, en los dos
   temas y a los anchos que hagan falta. Es la herramienta de las auditorías de cierre de tanda.

   ⚠️ POR QUÉ ES UN ARCHIVO Y NO UN BLOQUE PARA PEGAR EN LA CONSOLA.
   Hasta ahora vivía como un bloque de código dentro de ESTADO.md, para copiar y pegar. Ese bloque
   quedó DESACTUALIZADO y con dos bugs que hicieron perder media sesión, los dos del mismo tipo:
   el auditor decía "0 problemas" mientras el usuario veía el problema a ojo.

     1) `__fondo` devolvía `null` ante CUALQUIER `background-image`. El fondo del `body` entero es
        un degradado, así que el auditor **salteaba casi toda la app** y reportaba todo en verde.
     2) Saltaba los elementos de tamaño 0, y eso incluye lo que está dentro de un `<details>`
        cerrado. Por eso un "11%" ilegible del panel de HSEQ pasó dos auditorías sin que nadie lo
        viera: estaba colapsado.

   La lección no es de CSS: **una herramienta de verificación que miente es peor que no tenerla**,
   porque su silencio se lee como una garantía. Un bloque para copiar y pegar no se puede arreglar
   una sola vez — se arregla en la copia de alguien y vuelve roto en la siguiente. Acá se arregla
   en un lugar.

   CÓMO SE USA (desde el navegador, con la app cargada):
     const src = await (await fetch('/pruebas/auditor.js')).text(); eval(src);
     AUDITOR.todo();                       // el tema y el ancho que haya puestos
     AUDITOR.barrer(iframe, ventanas);     // los dos temas × los anchos que se le pasen
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const AUDITOR = {};

  /* ── Color ──────────────────────────────────────────────────────────────────────────────── */

  function luminancia(css) {
    const m = String(css).match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number);
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function alfa(css) {
    const m = String(css).match(/[\d.]+/g);
    return (m && m.length >= 4) ? +m[3] : 1;
  }

  /* ⚠️ ACÁ ESTABA EL BUG 1. Un `background-image` no es motivo para rendirse: el fondo de toda la
     app es un degradado, así que rendirse ahí equivale a no auditar nada.
     Se sacan los colores del degradado y se toma el MÁS OSCURO con alfa suficiente — el peor caso
     para un texto claro, que es el que hay que aprobar. Si el degradado no trae ningún color
     usable (una imagen de verdad, por ejemplo), recién ahí se cae al fondo del `body`. */
  /* ⚠️ UN GRADIENTE DIRECCIONAL NO PINTA TODO EL ELEMENTO IGUAL, y tratarlo como un color plano
     inventa defectos que no existen. El splash de escritorio parte la pantalla con
     `linear-gradient(to right, transparent 0 50%, var(--card) 50% 100%)`: navy a la izquierda,
     tarjeta clara a la derecha. Tomando "el color más oscuro con alfa" el auditor concluyó que el
     titular BLANCO de la mitad izquierda estaba sobre `--card` blanco → 1:1, "texto invisible".
     Se ve perfectamente: está sobre el navy de la otra mitad.
     Como no se puede saber qué franja le toca a cada hijo sin resolver el gradiente entero, la
     respuesta honesta es NO MEDIR y decirlo: cae en `sinPoderMedir`, que es información, mientras
     que un 1:1 falso es desinformación. Sólo se resuelven los gradientes que sí cubren parejo
     (los radiales de ambiente del fondo, que no tienen paradas de posición). */
  function esDireccional(bgImage) {
    return /\b(to\s|deg|turn|rad\b)/.test(String(bgImage)) &&
           /\d+%\s*[,)]/.test(String(bgImage));
  }

  function fondoDeGradiente(bgImage) {
    if (esDireccional(bgImage)) return null;
    const colores = String(bgImage).match(/(?:rgba?\([^)]*\)|#[0-9a-f]{3,8})/gi);
    if (!colores) return null;
    let peor = null, peorL = Infinity;
    colores.forEach(c => {
      if (alfa(c) < 0.5) return;            // un color casi transparente no define el fondo
      const l = luminancia(aRgb(c));
      if (l != null && l < peorL) { peorL = l; peor = aRgb(c); }
    });
    return peor;
  }

  /* Los degradados pueden traer `#rrggbb`; `luminancia` espera números sueltos. */
  function aRgb(c) {
    if (/^rgba?\(/i.test(c)) return c;
    const h = c.replace('#', '');
    const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
    const v = parseInt(n, 16);
    return 'rgb(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ')';
  }

  function fondoEfectivo(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        /* ⚠️ UN GRADIENTE DIRECCIONAL CORTA LA BÚSQUEDA. Seguir subiendo hasta el próximo ancestro
           con color no da "un fondo aproximado": da el fondo EQUIVOCADO, y con toda la confianza de
           un número. Pasó con los tres accesos del splash en escritorio: el pie vive sobre la mitad
           clara del gradiente, el auditor siguió subiendo hasta el navy del `body` y reportó
           2.14:1 — "ilegible" — sobre texto que se lee perfecto.
           No poder medir es un resultado; medir mal es una mentira. */
        if (esDireccional(s.backgroundImage)) return null;
        const g = fondoDeGradiente(s.backgroundImage);
        if (g) return g;
      }
      if (alfa(s.backgroundColor) > 0.85) return s.backgroundColor;
      n = n.parentElement;
    }
    const raiz = getComputedStyle(document.documentElement).backgroundColor;
    return alfa(raiz) > 0.85 ? raiz : 'rgb(11,26,58)';   // --navy-deep como último recurso
  }

  function contraste(a, b) {
    const la = luminancia(a), lb = luminancia(b);
    if (la == null || lb == null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* ── Qué se mira ────────────────────────────────────────────────────────────────────────── */

  /* ⚠️ ACÁ ESTABA EL BUG 2. Descartar por tamaño 0 descarta también lo que está adentro de un
     `<details>` cerrado, de una pestaña sin abrir o de un panel plegado — o sea, buena parte de la
     app. Y esas partes se ven perfectamente cuando la persona las abre.
     La solución no es medirlas igual (una caja de 0×0 no tiene contraste que valga), sino ABRIR lo
     que se pueda antes de medir, y decir cuántas cosas quedaron sin mirar. Un auditor tiene que
     saber declarar su propia cobertura: "0 problemas" y "0 problemas en el 40% de la pantalla" son
     resultados distintos. */
  AUDITOR.abrirTodo = function () {
    let abiertos = 0;
    document.querySelectorAll('details:not([open])').forEach(d => { d.open = true; abiertos++; });
    return abiertos;
  };

  function visible(el) {
    const b = el.getBoundingClientRect();
    if (b.width < 8 || b.height < 8) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.1) return false;
    return true;
  }

  function nombre(el) {
    const c = (typeof el.className === 'string' ? el.className : '').split(' ')[0];
    return (el.id ? '#' + el.id : '') + (c ? '.' + c : el.tagName.toLowerCase());
  }

  /* ── 1 · Contraste de texto ─────────────────────────────────────────────────────────────── */

  AUDITOR.contraste = function () {
    const malos = [], sinMedir = [];
    document.querySelectorAll('body *').forEach(el => {
      const propio = [...el.childNodes].filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim()).join('');
      if (!propio) return;
      if (!visible(el)) { sinMedir.push(nombre(el)); return; }
      const cs = getComputedStyle(el);
      const fondo = fondoEfectivo(el);
      if (fondo == null) { sinMedir.push(nombre(el)); return; }   // gradiente direccional: ver arriba
      const r = contraste(cs.color, fondo);
      if (r == null) { sinMedir.push(nombre(el)); return; }
      /* El mínimo de WCAG AA baja a 3:1 para texto grande (>=24px, o >=18.66px en negrita). */
      const px = parseFloat(cs.fontSize), peso = parseInt(cs.fontWeight, 10) || 400;
      const grande = px >= 24 || (px >= 18.66 && peso >= 700);
      const minimo = grande ? 3 : 4.5;
      if (r < minimo) {
        malos.push(nombre(el) + '  ' + r.toFixed(2) + ':1 (mín ' + minimo + ')  "' +
                   propio.slice(0, 26).replace(/\s+/g, ' ') + '"');
      }
    });
    return { malos: [...new Set(malos)], sinMedir: [...new Set(sinMedir)].length };
  };

  /* ── 2 · Superficies claras en tema oscuro ──────────────────────────────────────────────── */

  /* ⚠️ REVISADAS Y DECIDIDAS: superficies que son claras en tema oscuro A PROPÓSITO. No se
     silencian con una lista negra escondida — se listan acá, con su motivo, y el informe dice
     cuántas se dieron por buenas. Un auditor que baja a cero escondiendo cosas es el auditor que
     miente; uno que dice "0 nuevas, 2 revisadas" es información.
     · `.bn-fab`: el disco del botón de estadísticas. Es el destacado de la barra de navegación, el
       mismo patrón que el chip de idioma. Usa `--entrada-chip` / `--entrada-chip-ink`.
     · `.splash-lang`: el chip ES/EN. Se decidió opaco en J7 justamente para que su legibilidad no
       dependa de dónde caiga el círculo naranja que tiene detrás. */
  AUDITOR.CLARAS_A_PROPOSITO = ['bn-fab', 'splash-lang'];

  AUDITOR.superficiesClaras = function () {
    if (document.documentElement.getAttribute('data-tema') !== 'oscuro') return [];
    const malas = [], revisadas = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return;
      if (alfa(cs.backgroundColor) <= 0.5) return;
      const L = luminancia(cs.backgroundColor);
      /* ⚠️ FALSO POSITIVO CONOCIDO, no perseguir: el hueco de la dona usa a propósito el mismo
         color que el fondo de su tarjeta. Está documentado desde la auditoría de 2026-08-06. */
      if (/dona|donut|hueco/i.test(nombre(el))) return;
      /* ⚠️ Y TAMPOCO ES UNA "CAJA BLANCA" UN CHIP DE COLOR SEMÁNTICO. Lo que este chequeo busca es
         una superficie de CONTENIDO que se quedó sin tematizar y queda blanca sobre el tema
         oscuro. Una barrita verde (`#4fd4a0`, L=0.60) o roja (`#ff8a86`, L=0.51) es un color con
         significado, elegido para verse en oscuro — de hecho el token cambia de valor entre temas.
         Se descartan los muy saturados: un blanco o un gris sin tematizar tiene los tres canales
         casi iguales; un color semántico, no. */
      if (L != null && L > 0.5) {
        const m = String(cs.backgroundColor).match(/[\d.]+/g).slice(0, 3).map(Number);
        const saturacion = (Math.max(...m) - Math.min(...m)) / 255;
        if (saturacion > 0.15) return;
        /* ⚠️ DECORACIÓN, no superficie. Misma regla que ya usa el chequeo de cortes: una caja
           `aria-hidden` sin texto no contiene nada que se pueda volver ilegible. Reportaba el
           puntito de "tocá acá" de Aptitud (15×15, blanco al 75%), que es un adorno. */
        if (el.getAttribute('aria-hidden') === 'true' && !el.textContent.trim()) return;
        /* ⚠️ COLOR DE DATO, no de tema. Si el fondo lo escribe el código en el atributo `style`, no
           es una superficie que el tema deba pintar: es una escala o una muestra —una celda de mapa
           de calor, el cuadradito de una leyenda—. Reportaba celdas de `heatColor` con L=0.85/0.90,
           y verificado a mano NO están rotas: `heatColor` fija el color de la celda Y el del número
           juntos, y da 10–13,5:1 en LOS DOS temas.
           Que estén escritos a mano sí es deuda de R13 y está anotado como tal — pero es otra cosa
           que "una caja blanca sin tematizar", que es lo que este chequeo busca. */
        if (el.style && el.style.background) return;
        const nom = nombre(el);
        if (AUDITOR.CLARAS_A_PROPOSITO.some(c => nom.indexOf(c) >= 0)) { revisadas.push(nom); return; }
        malas.push(nom + '  L=' + L.toFixed(2));
      }
    });
    AUDITOR.ultimasRevisadas = [...new Set(revisadas)];
    return [...new Set(malas)];
  };

  /* ── 3 · Cortes: contenido que no entra en su caja y se recorta ─────────────────────────── */

  /* ⚠️ TRES COSAS RECORTAN A PROPÓSITO, y confundirlas con un defecto arruina el informe. Las tres
     salieron de revisar a mano los hallazgos de la primera corrida de A1:
       · un CARRUSEL: la tira del splash y el carrusel de entrada tienen todas sus diapositivas una
         al lado de la otra y muestran una. Reportaban "se pasa 1400px de ancho" — el recorte es el
         mecanismo, no un accidente.
       · un TOAST guardado fuera de vista con `transform: translateY(150%)` hasta que le toca salir
         (`.dash-remember`). Reportaba "se pasa 78px de alto" del panel que lo contiene, con nada
         cortado en realidad.
       · un recorte declarado con `-webkit-line-clamp` o `text-overflow`, donde recortar ES la
         decisión de diseño.
     Se detectan por su FORMA, no por una lista de nombres: un contenedor cuyo hijo se desplaza con
     `transform` es un carrusel o un toast, se llame como se llame. Una lista de nombres envejece y
     deja pasar el siguiente. */
  function recortaAProposito(el) {
    const cs = getComputedStyle(el);
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') return true;
    if (cs.textOverflow === 'ellipsis') return true;
    /* ⚠️ UN CARRUSEL SE RECONOCE POR SU FORMA, no por su transición. Probé con la transición
       (`transition-property: transform` en el hijo) y falla justo acá: el entorno de pruebas corre
       con `.sin-animaciones`, que apaga TODAS las transiciones con `!important`. O sea que el
       detector se apagaba exactamente donde hacía falta.
       La forma no se puede apagar: un solo hijo, mucho más ancho que el contenedor, con varios
       nietos que miden cada uno lo mismo que el contenedor. Eso es una tira de diapositivas y
       ninguna otra cosa. */
    for (const h of el.children) {
      const ch = getComputedStyle(h);
      if (/transform/.test(ch.transitionProperty || '')) return true;
      const t = ch.transform;
      if (t && t !== 'none' && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t)) return true;
    }
    if (el.children.length === 1) {
      const pista = el.children[0];
      /* Contra el ancho de CONTENIDO, no `clientWidth`: clientWidth incluye el padding, y la tira
         del splash tiene padding en escritorio. Con esa diferencia las diapositivas median 55 px
         menos que la "caja" y el detector no las reconocia. Es la misma trampa de la caja de
         padding que ya mordio en P1: aca vuelve, con otro disfraz. */
      const csEl = getComputedStyle(el);
      const anchoCaja = el.clientWidth - parseFloat(csEl.paddingLeft) - parseFloat(csEl.paddingRight);
      if (pista.scrollWidth > anchoCaja * 1.5 && pista.children.length >= 2) {
        const iguales = [...pista.children]
          .filter(n => Math.abs(n.getBoundingClientRect().width - anchoCaja) <= 2).length;
        if (iguales >= 2) return true;
      }
    }
    /* DECORACIÓN que sobresale: los círculos de ambiente son pseudo-elementos más grandes que su
       banda, recortados a propósito para que se vean como un arco. No tienen hijos reales que
       delaten nada, así que se los reconoce por lo que son: una caja `aria-hidden` sin texto. */
    if (el.getAttribute('aria-hidden') === 'true' && !el.textContent.trim()) return true;
    /* TEXTO QUE SE DESLIZA (M4 y T3): el contenido es más ancho que la caja A PROPÓSITO — de eso se
       trata el mecanismo, y la animación lo pasea para que se pueda leer entero.
       ⚠️ Sólo se perdona con la clase `marquee` PUESTA. Que se pase de ancho SIN ella es un corte de
       verdad, y encima uno mudo: estos elementos no llevan `text-overflow: ellipsis` (compite con la
       animación), así que el texto termina y nada avisa que había más. Distinguir los dos casos en
       vez de callar los dos es lo que hizo que la auditoría de A2 encontrara que al rotar el teléfono
       nadie volvía a medir. */
    if (el.classList.contains('marquee')) return true;
    return false;
  }

  AUDITOR.cortes = function () {
    const malos = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      const cs = getComputedStyle(el);
      const recortaY = cs.overflowY === 'hidden' || cs.overflow === 'hidden';
      const recortaX = cs.overflowX === 'hidden' || cs.overflow === 'hidden';
      if (!recortaY && !recortaX) return;
      if (recortaAProposito(el)) return;
      const dy = el.scrollHeight - el.clientHeight;
      const dx = el.scrollWidth - el.clientWidth;
      if (recortaY && dy > 2) malos.push(nombre(el) + '  se pasa ' + dy + 'px de alto');
      if (recortaX && dx > 2) malos.push(nombre(el) + '  se pasa ' + dx + 'px de ancho');
    });
    return [...new Set(malos)];
  };

  /* ── 4 · Solapamientos entre hermanos ───────────────────────────────────────────────────── */

  /* ⚠️ SE COMPARA RENGLÓN CONTRA RENGLÓN, NO LA CAJA ENTERA. Un elemento en línea que envuelve
     ocupa varios renglones, y `getBoundingClientRect()` devuelve UNA caja que los abarca a todos —
     incluido el hueco de la primera línea, donde vive el hermano anterior. Con esa caja, un
     `<b>` que envuelve "se pisa" con el `<b>` de al lado aunque en pantalla no se toquen.
     Medido en A2: `<b>` de 601×41 (dos renglones) contra `<b>` de 159×20 en la primera línea; el
     auditor cantaba 36 solapamientos y ninguno era real. `getClientRects()` da una caja POR
     RENGLÓN, que es lo que de verdad ocupa tinta. Se comparan todas contra todas y se reporta la
     peor: así un solapamiento de verdad —dos bloques del flujo pisándose— sigue saltando. */
  /* Cuánto se pisan DOS BLOQUES PORQUE ALGUIEN LO PIDIÓ. Un margen negativo es una decisión escrita:
     `.dash-help` lleva `margin-top: -.2rem` para meterse debajo del bloque de arriba, y eso daba un
     solapamiento de 3,2 px que rozaba el umbral. Se descuenta lo que el margen negativo explica; lo
     que sobre, si sobra, sigue siendo un hallazgo. Subir el umbral a ciegas habría tapado también
     los solapamientos chicos de verdad. */
  function margenDeliberado(arriba, abajo) {
    const m = parseFloat(getComputedStyle(abajo).marginTop) || 0;
    const n = parseFloat(getComputedStyle(arriba).marginBottom) || 0;
    return Math.max(0, -Math.min(m, 0)) + Math.max(0, -Math.min(n, 0));
  }

  function peorSolape(x, y) {
    const A = [...x.getClientRects()], B = [...y.getClientRects()];
    let peor = null;
    for (const a of A) for (const b of B) {
      const ov = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const oh = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (ov <= 3 || oh <= 3) continue;
      const pedido = margenDeliberado(a.top <= b.top ? x : y, a.top <= b.top ? y : x);
      if (ov - pedido <= 3) continue;
      if (!peor || ov * oh > peor.ov * peor.oh) peor = { ov, oh };
    }
    return peor;
  }

  /* Sólo entre HERMANOS y sólo si ninguno está posicionado a propósito: un elemento absoluto o
     fijo encima de otro casi siempre es intencional (un chip sobre una tarjeta, un overlay). Lo
     que casi nunca es intencional es que dos bloques del flujo normal se pisen. */
  AUDITOR.solapamientos = function () {
    const malos = [];
    const enFlujo = el => {
      const p = getComputedStyle(el).position;
      return p === 'static' || p === 'relative';
    };
    document.querySelectorAll('body *').forEach(padre => {
      /* Adentro de un SVG no hay layout que auditar: un icono ES trazos superpuestos a proposito.
         Sin esto, cada icono de la app reporta un solapamiento falso -medido: dos por pantalla-, y
         un auditor que grita en lo que esta bien entrena a ignorarlo, que es como se pierde el
         hallazgo de verdad. */
      if (padre.closest('svg')) return;
      const hijos = [...padre.children].filter(h => visible(h) && enFlujo(h));
      for (let i = 0; i < hijos.length; i++) {
        for (let j = i + 1; j < hijos.length; j++) {
          const p = peorSolape(hijos[i], hijos[j]);
          if (p) {
            malos.push(nombre(hijos[i]) + ' × ' + nombre(hijos[j]) +
                       '  (' + Math.round(p.oh) + '×' + Math.round(p.ov) + 'px)');
          }
        }
      }
    });
    return [...new Set(malos)];
  };

  /* ── 5 · Áreas de toque ─────────────────────────────────────────────────────────────────── */

  AUDITOR.areasDeToque = function (minimo) {
    minimo = minimo || 44;
    const malos = [];
    document.querySelectorAll('button, a[href], input, select, [role="button"], [onclick]')
      .forEach(el => {
        if (!visible(el)) return;
        const cs = getComputedStyle(el);
        if (cs.pointerEvents === 'none' || el.disabled) return;
        /* ⚠️ Un checkbox mide 17×17 y eso está BIEN si vive dentro de un `<label>`: el label
           entero recibe el toque, así que el área real es la del label. Medirlo suelto reporta un
           defecto donde no lo hay — pasó con "No volver a mostrar esta explicación", cuyo label
           mide 292×44.
           ⚠️ PERO EL LABEL AMPLÍA, NO REEMPLAZA, y equivocarme en esto me costó un falso positivo
           de nueve campos: los del formulario de alta miden 292×48 —correctos— y tienen su etiqueta
           de texto arriba, un `<label for>` de 16 px de alto. Tomando el label EN VEZ del control,
           el auditor reportó nueve campos "de 16 px" que en realidad estaban bien.
           El área que responde al dedo nunca es menor que la del propio control. */
        const suya = el.getBoundingClientRect();
        const etiqueta = el.closest('label') ||
          (el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null);
        const eb = etiqueta ? etiqueta.getBoundingClientRect() : suya;
        const b = { width: Math.max(suya.width, eb.width), height: Math.max(suya.height, eb.height) };
        if (b.height < minimo - 1 || b.width < minimo - 1) {
          malos.push(nombre(el) + '  ' + Math.round(b.width) + '×' + Math.round(b.height) +
                     '  "' + (el.textContent || '').trim().slice(0, 18) + '"');
        }
      });
    return [...new Set(malos)];
  };

  /* ── Todo junto ─────────────────────────────────────────────────────────────────────────── */

  AUDITOR.todo = function () {
    const desplegados = AUDITOR.abrirTodo();
    const c = AUDITOR.contraste();
    return {
      tema: document.documentElement.getAttribute('data-tema') || 'claro',
      ancho: innerWidth, alto: innerHeight,
      desplegados,
      contraste: c.malos,
      sinPoderMedir: c.sinMedir,
      superficiesClarasEnOscuro: AUDITOR.superficiesClaras(),
      clarasRevisadasYAceptadas: AUDITOR.ultimasRevisadas || [],
      cortes: AUDITOR.cortes(),
      solapamientos: AUDITOR.solapamientos(),
      areasDeToque: AUDITOR.areasDeToque()
    };
  };

  /* Recorre los dos temas × los anchos que se le pasen, sobre un iframe que se pueda redimensionar.
     ⚠️ Sin esperas: los temporizadores están estrangulados con la pestaña oculta (ver LEEME.md).
     Forzar el recálculo leyendo una medida alcanza — comprobado. */
  AUDITOR.barrer = function (iframe, ventanas, antesDeMedir) {
    const doc = iframe.contentWindow.document;
    const win = iframe.contentWindow;
    const antes = { w: iframe.style.width, h: iframe.style.height,
                    tema: doc.documentElement.getAttribute('data-tema') };
    const salida = [];
    try {
      for (const [w, h] of ventanas) {
        for (const tema of ['claro', 'oscuro']) {
          iframe.style.width = w + 'px';
          iframe.style.height = h + 'px';
          doc.documentElement.setAttribute('data-tema', tema);
          if (antesDeMedir) antesDeMedir(win, doc);
          void doc.body.offsetWidth;
          salida.push(win.AUDITOR.todo());
        }
      }
    } finally {
      iframe.style.width = antes.w;
      iframe.style.height = antes.h;
      if (antes.tema) doc.documentElement.setAttribute('data-tema', antes.tema);
    }
    return salida;
  };

  global.AUDITOR = AUDITOR;
})(typeof window !== 'undefined' ? window : this);
