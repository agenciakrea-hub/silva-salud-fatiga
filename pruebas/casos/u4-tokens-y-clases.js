
PRUEBAS.grupo('U4 · ningún token ni clase inventada');

/* ⚠️ POR QUÉ EXISTE ESTE GRUPO. Escribí `var(--muted)` en NUEVE reglas y `var(--sem-azul-txt)` en
   una. Ninguno de los dos tokens existe. Y en la segunda anoté al lado una medición de contraste
   —"el token da 6,83 / 7,56"— que no pude haber hecho, porque no había ningún token que medir.
   Cuatro commits seguidos con el mismo patrón: reemplazar un color fijo por un nombre plausible,
   escribir la justificación, y no verificar que el nombre exista.

   ⚠️ Y NO SE VE. Un `var()` que no resuelve NO cae a la regla anterior de la cascada: computa a
   `inherit` y se lleva el color del padre. Resultado real: en la pestaña de jornada, los rótulos,
   las cabeceras de tabla y los datos quedaron todos con la MISMA tinta — la jerarquía tipográfica
   entera, plana, sin un solo error en consola.
   Lo mismo con las clases: `.dash-card` no existía, y como la regla de escritorio que reparte el
   ancho enumera las clases una por una, la pestaña medía 436 px en un monitor de 1366. */

/* Nombres que se pasan por `style` inline desde JS: llevan valores calculados en el momento (el
   color del estado de una gestión, la altura de una barra) y por eso NO se declaran en el CSS.
   ⚠️ CADA UNO DE ESTOS SE VERIFICÓ A MANO, buscando dónde se setea. Esta lista es lo único que
   separa "token inventado" de "variable legítima", así que meter algo acá sin mirar convierte el
   caso en decorativo — que es exactamente el problema que vino a resolver. */
const U4_INLINE = ['--anc','--gpp','--hc','--tc','--spl-traza','--marquee-dist','--cell-color',
                   '--sfc','--bg','--hbg','--w','--col','--d',
                   /* alturas y colores calculados: `style="--h:34%"`, `style="--gse:#...;--gseb:#..."` */
                   '--h','--gse','--gseb','--ab','--ac','--act','--sfbg','--tbg',
                   /* nota médica y evento del formulario: `style="--anc:...;--anct:...;--anbg:..."` */
                   '--anbg','--ansol','--anct'];

PRUEBAS.caso('⚠️ toda variable CSS usada tiene que estar definida', () => {
  /* ⚠️ SE LE PREGUNTA AL NAVEGADOR, NO SE PARSEA EL CSS — y esta es la segunda versión del caso: la
     primera usaba una regex sobre el texto del `<style>` y daba una docena de falsos positivos
     (`--radius-xs`, `--linea`, `--sem-rojo-txt`… todos existen). Una prueba que grita por tokens
     que están es tan inútil como una que no ve los que faltan: en las dos, se aprende a ignorarla.
     `getPropertyValue` resuelve como resuelve el navegador de verdad, incluido el tema activo. */
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const usadas = new Set();
  (css.match(/var\(\s*(--[a-zA-Z0-9-]+)\s*[,)]/g) || []).forEach(m => {
    const n = m.match(/--[a-zA-Z0-9-]+/); if (n) usadas.add(n[0]);
  });
  PRUEBAS.alMenos(usadas.size, 80, 'tiene que encontrar los tokens usados (halló ' + usadas.size + ')');

  /* ⚠️ Una variable puede estar declarada DENTRO de una regla (`.spl-x { --spl-tit: ... }`) y usarse
     sólo ahí: es local y perfectamente válida, pero no resuelve en `:root`. Se la cuenta como
     definida si aparece declarada en cualquier bloque del CSS.
     ⚠️ El `^\s*` del patrón importa: sin él, las declaraciones indentadas —o sea todas— no se
     detectan, y el caso escupe una docena de tokens que sí existen. Me pasó en la primera versión. */
  const declaradas = new Set();
  (css.match(/(^\s*|[;{]\s*)(--[a-zA-Z0-9-]+)\s*:/gm) || []).forEach(m => {
    const n = m.match(/--[a-zA-Z0-9-]+/); if (n) declaradas.add(n[0]);
  });
  PRUEBAS.alMenos(declaradas.size, 100, 'tiene que encontrar las declaraciones (halló ' + declaradas.size + ')');

  const raiz = getComputedStyle(document.documentElement);
  const faltan = [...usadas].filter(v =>
    U4_INLINE.indexOf(v) < 0 && !declaradas.has(v) && !String(raiz.getPropertyValue(v)).trim());
  PRUEBAS.igual(faltan, [],
    '⚠️ un var() que no resuelve computa a `inherit`: se lleva el color del padre EN SILENCIO, sin ' +
    'error en consola. Faltan: ' + faltan.join(', '));

  /* El discriminador: un nombre inventado TIENE que salir en la lista, o el método no discrimina. */
  PRUEBAS.falso(!!String(raiz.getPropertyValue('--token-que-no-existe-jamas')).trim(),
    'un token inventado tiene que resolver vacío, o esta comprobación no vale nada');
});

PRUEBAS.caso('⚠️ todo token de color existe en LOS DOS temas', () => {
  /* R13: un token definido en un solo tema se cae en el otro, sin error. Se comprueba resolviéndolo
     con cada tema puesto, que es lo único exacto. */
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const usadas = new Set();
  (css.match(/var\(\s*(--[a-zA-Z0-9-]+)\s*[,)]/g) || []).forEach(m => {
    const n = m.match(/--[a-zA-Z0-9-]+/); if (n) usadas.add(n[0]);
  });
  /* Las locales (declaradas dentro de una regla) no viven en `:root` y no aplica preguntarles por
     tema: se comprueban las globales, que son las que R13 obliga a tener en los dos. */
  const locales = new Set();
  (css.match(/(^\s*|[;{]\s*)(--[a-zA-Z0-9-]+)\s*:/gm) || []).forEach(m => {
    const n = m.match(/--[a-zA-Z0-9-]+/);
    if (n && !String(getComputedStyle(document.documentElement).getPropertyValue(n[0])).trim()) locales.add(n[0]);
  });
  const previo = document.documentElement.getAttribute('data-tema');
  const rotos = [];
  try {
    ['claro','oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      const raiz = getComputedStyle(document.documentElement);
      [...usadas].forEach(v => {
        if (U4_INLINE.indexOf(v) >= 0 || locales.has(v)) return;
        if (!String(raiz.getPropertyValue(v)).trim()) rotos.push(tema + ': ' + v);
      });
    });
  } finally {
    if (previo) document.documentElement.setAttribute('data-tema', previo);
    else document.documentElement.removeAttribute('data-tema');
  }
  PRUEBAS.igual(rotos, [],
    '⚠️ estos tokens no resuelven en uno de los dos temas — ' + rotos.join(' | '));
});

PRUEBAS.caso('⚠️ las secciones del panel usan las clases que el reparto de ancho conoce', () => {
  /* La regla de escritorio que reparte el ancho enumera las clases UNA POR UNA. Una clase que no
     está en esa lista se queda con `flex: 0 1 auto` y su sección queda comprimida contra el borde,
     con la mitad de la pantalla en blanco. Ya pasó tres veces (Y6, A2, y la pestaña de jornada). */
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const m = css.match(/\.dash-sec\s*>\s*\.dash-block[^{]*\{[^}]*flex:[^}]*\}/);
  PRUEBAS.cierto(!!m, 'tiene que existir la regla que reparte el ancho en escritorio');
  if (!m) return;
  const enumeradas = (m[0].match(/\.dash-sec\s*>\s*\.([a-z0-9-]+)/g) || [])
    .map(x => x.replace(/.*\./, ''));
  PRUEBAS.alMenos(enumeradas.length, 5, 'la lista tiene que tener varias clases');

  /* Qué clases usan de verdad las secciones: el primer elemento que devuelve cada `render*`. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const usadas = new Set();
  (fuente.match(/return\s+'<div class="(dash-[a-z0-9-]+)"/g) || []).forEach(x => {
    const c = x.match(/dash-[a-z0-9-]+/); if (c) usadas.add(c[0]);
  });
  (fuente.match(/=\s*'<div class="(dash-[a-z0-9-]+)"/g) || []).forEach(x => {
    const c = x.match(/dash-[a-z0-9-]+/); if (c) usadas.add(c[0]);
  });
  /* `dash-context` es la barra de contexto (el breadcrumb), no una sección: va arriba de todas y no
     participa del reparto de ancho. Es la única excepción y está acá para que se vea. */
  const NO_SON_SECCION = ['dash-context'];
  const huerfanas = [...usadas].filter(c => enumeradas.indexOf(c) < 0 && NO_SON_SECCION.indexOf(c) < 0);
  PRUEBAS.igual(huerfanas, [],
    '⚠️ estas clases abren una sección del panel y NO están en el reparto de ancho: su pestaña se ' +
    'va a ver comprimida en escritorio — ' + huerfanas.join(', '));
});

PRUEBAS.caso('⚠️ las pantallas de contraseña se abren POR ENCIMA del portal', () => {
  /* Todos los `.overlay` comparten z-index, y con z-index igual gana el que está después en el DOM.
     `#loginOv` y `#claveOv` están ANTES que `#portalOverlay`, y el login se abre justamente cuando
     el portal ya está abierto: quedaba pintado debajo, invisible e intocable. El empleado con
     contraseña propia veía "Cargando…" para siempre y ningún lugar donde escribirla.
     Yo había escrito en un comentario que "se abren por encima". No lo medí. Era falso. */
  const portal = document.getElementById('portalOverlay');
  const malos = [];
  ['loginOv','claveOv'].forEach(id => {
    const ov = document.getElementById(id);
    if (!ov){ malos.push(id + ': no existe'); return; }
    const zi = parseInt(getComputedStyle(ov).zIndex, 10) || 0;
    const zp = parseInt(getComputedStyle(portal).zIndex, 10) || 0;
    if (zi <= zp) malos.push(id + ': z-index ' + zi + ' <= portal ' + zp);
  });
  PRUEBAS.igual(malos, [],
    '⚠️ con z-index igual o menor, el portal los tapa y quedan intocables — ' + malos.join(' | '));

  /* Y la comprobación de verdad: con los dos abiertos, ¿quién recibe el toque? */
  const ov = document.getElementById('loginOv');
  const teniaP = portal.classList.contains('show'), teniaL = ov.classList.contains('show');
  portal.classList.add('show'); ov.classList.add('show');
  try {
    const btn = ov.querySelector('.save-btn');
    if (btn){
      const r = btn.getBoundingClientRect();
      if (r.width > 0 && r.height > 0){
        const enElPunto = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        PRUEBAS.cierto(ov.contains(enElPunto),
          '⚠️ el botón "Entrar" del login tiene que recibir el toque, no el panel de atrás (lo ' +
          'recibe: ' + (enElPunto ? (enElPunto.id || enElPunto.className || enElPunto.tagName) : 'nada') + ')');
      }
    }
  } finally {
    if (!teniaP) portal.classList.remove('show');
    if (!teniaL) ov.classList.remove('show');
  }
});
