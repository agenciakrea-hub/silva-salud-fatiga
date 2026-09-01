
PRUEBAS.grupo('A1 · lo que encontró la auditoría de cierre de la tanda 1');

/* De dónde salieron estos casos: la auditoría de A1 corrió el auditor visual sobre 15 pantallas ×
   6 anchos × 2 temas (180 combinaciones). Encontró dos defectos reales; el resto fueron falsos
   positivos del propio auditor, que quedaron arreglados en `pruebas/auditor.js`.

   ⚠️ LOS DOS APARECIERON EN PANTALLAS QUE HABÍA QUE ABRIR. Con el inicio a la vista y todo lo
   demás cerrado, la auditoría daba limpio — y ese "limpio" cubría el 40% de la app. Los 113
   elementos que el auditor no podía medir eran, casi todos, texto adentro de overlays cerrados. */

PRUEBAS.caso('⚠️ el acceso de administrador se puede tocar con el dedo', () => {
  /* Medía 183×16. Es un `<button>` de verdad, en el portal, y se toca parado y con una sola mano
     igual que los enlaces del splash — a los que ya se les había dado 44 px en I2. El criterio
     estaba tomado; faltaba aplicarlo acá. */
  const ov = document.getElementById('portalOverlay');
  const antes = ov.classList.contains('show');
  ov.classList.add('show');
  void document.body.offsetWidth;
  const b = document.querySelector('.admin-toggle');
  const alto = b ? Math.round(b.getBoundingClientRect().height) : 0;
  if (!antes) ov.classList.remove('show');
  PRUEBAS.alMenos(alto, 44, 'el acceso de administrador tiene que llegar a 44 px de alto');
});

PRUEBAS.caso('⚠️ las pestañas del portal se pueden tocar con el dedo', () => {
  /* Medían 133×34, y se ven en TABLET — que se toca con el dedo igual que un teléfono, no es una
     pantalla de mouse sólo porque sea ancha. Ese fue el razonamiento que faltaba: el ancho de la
     ventana no dice con qué se apunta. */
  const ov = document.getElementById('portalOverlay');
  const antes = ov.classList.contains('show');
  ov.classList.add('show');
  const bajos = PRUEBAS.enVentana(768, 1024, () => {
    void document.body.offsetWidth;
    return [...document.querySelectorAll('.ptab')]
      .filter(t => t.getBoundingClientRect().height > 0)
      .map(t => ({ q: t.id, h: Math.round(t.getBoundingClientRect().height) }))
      .filter(x => x.h < 44);
  });
  if (!antes) ov.classList.remove('show');
  PRUEBAS.igual(bajos, [], 'ninguna pestaña del portal puede quedar abajo de 44 px en tablet');
});

PRUEBAS.caso('⚠️ el disco del botón de estadísticas sale de un token, no de un color a mano', () => {
  /* R13. Tenía `#ffffff` y `#fff` escritos a mano — los encontró el auditor como "superficie clara
     en tema oscuro". El hallazgo era medio cierto: el disco ES blanco a propósito (es el destacado
     de la barra, el mismo patrón que el chip de idioma), pero estaba escrito a mano.
     Pasa a `--entrada-chip` / `--entrada-chip-ink`, que existen para exactamente eso y ya los usa
     el chip de idioma. Hoy no cambia un píxel; mañana el brillo del disco en oscuro se ajusta en un
     solo lugar para los dos, en vez de en dos reglas que nadie relaciona. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const bloque = (css.match(/\.bn-center \.bn-fab \{[^}]*\}/) || [''])[0];
  const activo = (css.match(/\.bn-item\.bn-center\.active \.bn-fab \{[^}]*\}/) || [''])[0];
  PRUEBAS.cierto(bloque.length > 0, 'tiene que existir la regla del disco');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}/.test(bloque + activo),
    'ningún color escrito a mano en el disco (R13): ' + (bloque + activo).slice(0, 120));
  PRUEBAS.cierto(/var\(--entrada-chip\)/.test(bloque),
    'el fondo sale del token del chip opaco, el mismo que usa el botón de idioma');
});

PRUEBAS.caso('⚠️ ningún control queda abajo del área de toque, en las pantallas que hay que abrir', () => {
  /* ESTE es el caso que evita que vuelva a pasar lo de fondo: los dos defectos de A1 estaban en
     pantallas cerradas, así que una auditoría hecha sobre el inicio no los veía. Acá se abren y se
     miden.
     ⚠️ El área que responde al dedo NUNCA es menor que la del propio control. Medir el `<label>`
     EN VEZ del control da falsos positivos: los nueve campos del alta miden 292×48 y su etiqueta de
     texto, 16 — tomando la etiqueta, el auditor reportó nueve campos rotos que estaban bien. */
  const PANTALLAS = ['#portalOverlay', '#setup', '#recuperarOv', '#nominaOv', '#pvtOverlay', '#tareasOv'];
  const chicos = [];
  PANTALLAS.forEach(sel => {
    const ov = document.querySelector(sel);
    if (!ov) return;
    const antes = ov.classList.contains('show');
    ov.classList.add('show');
    void document.body.offsetWidth;
    ov.querySelectorAll('button, a[href], input, select, [role="button"]').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || el.disabled) return;
      const suya = el.getBoundingClientRect();
      if (suya.width < 8 || suya.height < 8) return;          // no se ve: no se toca
      const et = el.closest('label') ||
        (el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null);
      const eb = et ? et.getBoundingClientRect() : suya;
      const alto = Math.max(suya.height, eb.height);
      if (alto < 43) chicos.push(sel + ' ' + (el.id || el.className || el.tagName) + ': ' + Math.round(alto) + 'px');
    });
    if (!antes) ov.classList.remove('show');
  });
  PRUEBAS.igual(chicos, [],
    'todo lo que se toca llega a 44 px de alto, también en las pantallas que hay que abrir para verlas');
});
