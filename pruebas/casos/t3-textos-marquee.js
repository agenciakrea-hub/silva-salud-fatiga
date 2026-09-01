
PRUEBAS.grupo('T3 · textos que se cortan y no se desplazan');

/* Antes de escribir el mecanismo, se MIDIÓ el panel real (splashVerDemo + demo de supervisor) a
   varios anchos, con el mismo script que usa el auditor. Sólo aparecieron TRES cortes de verdad,
   no cuatro: `#dashScope` (el nombre de la empresa/alcance arriba del panel — coincide con el
   "Empresa Demo · ejemplo" del plan, 140/203 acá contra 137/203 del plan), `#dashUpdated` ("toca ↻
   para actualizar") y `.inf-prev` (el título del informe ejecutivo colapsado — 265/333 acá contra
   280/333 del plan; la diferencia entre las dos medidas es de ancho de pantalla, no del texto).
   No se inventó un cuarto lugar para completar el número: se documenta la diferencia, como ya pasó
   con la premisa de Y1. */

/* ⚠️ Lección de M4, la misma que ya se aplicó en "Anotaciones de servicio médico": PRIMERO se
   intenta que el texto entre (acá: `dash_toca_actualizar` ya se omite entero en modo demo, y el
   preview del informe ya viene recortado a 90 caracteres en `informePreview`) y el desplazamiento
   es lo último — porque un texto en movimiento es más difícil de leer que uno quieto. Por eso
   `dashWireMarquees` sólo agrega `.marquee` cuando, aun con esos recortes, el texto sigue sin
   entrar en su caja. */

PRUEBAS.caso('⚠️ dashSetMq escapa el texto: pasó de textContent a innerHTML y eso es peligroso si se olvida', () => {
  /* Antes de T3, dashScope/dashUpdated se llenaban con `.textContent`, que es inherentemente
     seguro. Envolver el texto en un `<span class="mq-in">` para poder medirlo y deslizarlo obliga
     a pasar por `innerHTML` — y lo que llega ahí (nombre de empresa elegido por un admin, nombre
     de departamento) no es un literal de la app. Si alguna vez alguien saca el `esc()` de acá para
     "simplificar", esto tiene que fallar ruidosamente. */
  const div = document.createElement('div');
  div.id = '__t3_mq_test__';
  document.body.appendChild(div);
  try {
    dashSetMq('__t3_mq_test__', '<img src=x onerror=alert(1)>Empresa "Rara" & Cía');
    const inner = div.querySelector('.mq-in');
    PRUEBAS.cierto(!!inner, 'dashSetMq tiene que envolver el texto en .mq-in');
    PRUEBAS.igual(div.querySelectorAll('img').length, 0, '⚠️ ninguna etiqueta real: tiene que llegar escapada');
    PRUEBAS.cierto(inner.textContent.indexOf('Empresa "Rara" & Cía') >= 0,
      'pero el TEXTO tiene que seguir presente, legible: ' + inner.textContent);
  } finally { div.remove(); }
});

/* #dashScope y #dashUpdated viven adentro de #portalOverlay > .sheet.portal > #portalDash, y los
   dos contenedores de afuera están `display:none` hasta que se abre el panel — con eso oculto,
   TODO el subárbol mide 0 aunque se les fuerce un ancho en línea. Se los destapa un momento (guardando
   y devolviendo el `style` tal cual estaba, no sólo `display`) para poder medir de verdad. */
function t3ConPanelVisible(fn){
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const antes = { ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style') };
  try {
    ovl.style.display = 'block'; dash.style.display = 'flex';
    return fn();
  } finally {
    if (antes.ovl === null) ovl.removeAttribute('style'); else ovl.setAttribute('style', antes.ovl);
    if (antes.dash === null) dash.removeAttribute('style'); else dash.setAttribute('style', antes.dash);
  }
}

PRUEBAS.caso('⚠️ #dashScope se desliza cuando el nombre no entra, y deja de hacerlo si entra', () => {
  /* Usa el elemento REAL (es único en toda la página, vive siempre en el shell de #portalDash,
     esté o no abierto el panel) en vez de duplicar el id: un `#dashScope` repetido rompería
     cualquier otra prueba que corra después y consulte `document.getElementById('dashScope')`. */
  const el = document.getElementById('dashScope');
  PRUEBAS.cierto(!!el, 'tiene que existir #dashScope en el shell del panel');
  const antes = { html: el.innerHTML, cls: el.className, dist: el.style.getPropertyValue('--marquee-dist'), w: el.style.width };
  try {
    t3ConPanelVisible(() => {
      dashSetMq('dashScope', 'Empresa con un nombre bastante largo · ejemplo');
      el.style.width = '90px';                 // fuerza el corte, sin depender del ancho de la ventana
      dashWireMarquees();
      PRUEBAS.cierto(el.classList.contains('marquee'), 'con la caja angosta tiene que activarse el desplazamiento');
      const dist = parseFloat(el.style.getPropertyValue('--marquee-dist'));
      PRUEBAS.cierto(dist < 0, 'la distancia tiene que ser negativa (desliza hacia la izquierda): ' + dist);

      /* No se prueba "agrandar la caja a 600px": `.dash-scope` es un ítem flex sin flex-shrink:0,
         así que el propio contenedor lo puede volver a apretar y el ancho forzado no se sostiene
         —confundiría la prueba, no el mecanismo—. Se prueba lo mismo por el otro lado: un texto
         corto en la MISMA caja angosta tiene que entrar solo, sin necesitar más espacio. */
      el.style.width = '90px';
      dashSetMq('dashScope', 'Y');
      dashWireMarquees();
      PRUEBAS.falso(el.classList.contains('marquee'), 'un texto de una letra entra en 90px sin desplazarse');
    });
  } finally {
    el.innerHTML = antes.html; el.className = antes.cls; el.style.width = antes.w;
    if (antes.dist) el.style.setProperty('--marquee-dist', antes.dist); else el.style.removeProperty('--marquee-dist');
  }
});

PRUEBAS.caso('⚠️ #dashUpdated: mismo mecanismo, y updateDashUpdated() lo dispara solo', () => {
  /* CASO BORDE DEL PLAN: dashRefresh() puede terminar SIN volver a renderizar todo el panel (si no
     hay cambios), así que updateDashUpdated() tiene que disparar la medición por su cuenta y no
     depender del rAF que arma renderDash(). Se comprueba llamando SÓLO a updateDashUpdated().
     El ancho se fuerza bien chico para que el corte se note tanto en modo demo (texto corto, sin
     "toca ↻ para actualizar") como fuera de demo — `DASH_DEMO` es `const` en la app real y no se
     puede pisar desde una prueba, así que esto no depende de en cuál de los dos modos corra. */
  const el = document.getElementById('dashUpdated');
  const antes = { html: el.innerHTML, cls: el.className, w: el.style.width };
  const previoDash = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    t3ConPanelVisible(() => {
      DASH = { updated: Date.now(), f:{}, _cfg:{} };
      el.style.width = '40px';
      updateDashUpdated();
      dashWireMarquees();                       // por si el rAF no llegó a correr en este entorno (R11)
      PRUEBAS.cierto(el.classList.contains('marquee'), 'con 40px, "Actualizado HH:MM:SS..." no puede entrar');
    });
  } finally {
    el.innerHTML = antes.html; el.className = antes.cls; el.style.width = antes.w;
    DASH = previoDash;
  }
});

PRUEBAS.caso('⚠️ el informe ejecutivo colapsado se desliza si su título no entra en la columna', () => {
  /* `.inf-prev` sí se puede duplicar sin riesgo (es una clase, no un id): se arma un fixture propio,
     como en Y6/T1, montado en el documento de verdad (clientWidth da 0 en un nodo desconectado). */
  const caja = document.createElement('div');
  caja.style.width = '150px';
  caja.innerHTML = '<div class="inf-prev"><span class="mq-in">Informe Ejecutivo de Análisis de Riesgo Psicosocial y Fatiga</span></div>';
  document.body.appendChild(caja);
  try {
    const el = caja.querySelector('.inf-prev');
    dashWireMarquees();
    PRUEBAS.cierto(el.classList.contains('marquee'), 'el título del informe es más largo que 150px, tiene que deslizarse');
  } finally { caja.remove(); }
});

PRUEBAS.caso('con la columna ancha, el informe no se desliza (no hay animación de sobra)', () => {
  const caja = document.createElement('div');
  caja.style.width = '900px';
  caja.innerHTML = '<div class="inf-prev"><span class="mq-in">Informe corto</span></div>';
  document.body.appendChild(caja);
  try {
    const el = caja.querySelector('.inf-prev');
    dashWireMarquees();
    PRUEBAS.falso(el.classList.contains('marquee'), 'un título que entra de sobra no tiene que activar nada');
  } finally { caja.remove(); }
});

PRUEBAS.caso('⚠️ ningún color escrito a mano en el bloque del desplazamiento (R13)', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const i = css.indexOf('.mq-in { display');
  const bloque = i >= 0 ? css.slice(i, i + 400) : '';
  PRUEBAS.cierto(bloque.length > 0, 'tiene que encontrarse el bloque CSS del desplazamiento genérico');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}/.test(bloque), 'nada de color en crudo: este bloque no dibuja nada, sólo mueve texto');
});

PRUEBAS.caso('la elipsis de CSS se sacó de los tres elementos: compite con la animación de deslizar', () => {
  /* Si quedara `text-overflow: ellipsis` puesto, el navegador recortaría el texto ANTES de que la
     animación pudiera mostrarlo completo — quedaría "Empresa Dem…" deslizándose sobre sí mismo.
     Ya le había pasado a `.an-res-hasta` (comentario de M4, línea ~3887: "el nombre tenía ellipsis
     puesto — ESE era el bug real"), así que el bloque de los tres elementos nuevos lo evita desde
     el principio en vez de repetir el mismo bug tres veces. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  const faltan = [];
  [
    /\.dash-scope\s*\{[^}]*\}/,
    /\.dash-updated\s*\{[^}]*\}/,
    /\.inf-prev\s*\{[^}]*\}/,
  ].forEach(re => {
    const m = css.match(re);
    if (!m) { faltan.push('no se encontró la regla'); return; }
    if (/text-overflow\s*:\s*ellipsis/.test(m[0])) faltan.push(m[0].slice(0, 60));
  });
  PRUEBAS.igual(faltan, [], 'ninguno de los tres puede tener text-overflow:ellipsis: ' + faltan.join(' | '));
});
