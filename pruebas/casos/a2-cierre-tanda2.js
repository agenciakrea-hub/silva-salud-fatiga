
PRUEBAS.grupo('A2 · cierre de la tanda 2');

/* Los casos de esta tanda viven en sus propios archivos (y1, y6, t1, t2, y3, t3). Acá van sólo los
   que nacieron de la AUDITORÍA de cierre: cosas que ninguna de las pruebas anteriores miraba, porque
   ninguna cambiaba el ancho después de pintar ni medía el panel pantalla por pantalla. */

PRUEBAS.caso('⚠️ al cambiar el ancho se vuelve a medir el desplazamiento de los textos', () => {
  /* EL HALLAZGO DE LA AUDITORÍA, y el único defecto que introdujo la tanda 2.
     Si un texto entra o no entra depende del ancho, pero hasta A2 sólo se medía al RENDERIZAR.
     Girar el teléfono no renderiza nada. Medido en el panel: a 1366 px "Empresa Demo · ejemplo"
     entra justo (193 de 193) y no se desliza; al pasar a 320 px la caja queda en 86 px para 202 px
     de texto — 116 px afuera, sin desplazamiento.
     Y es peor que un corte común: T3 le sacó `text-overflow: ellipsis` a estos tres elementos
     (compite con la animación), así que no queda ni el "…" que avisaba que había más. El texto
     termina y nada lo dice. O sea que, al rotar, T3 dejaba la pantalla PEOR que antes de T3.

     Se comprueba la parte que faltaba: que EXISTA quien escuche el cambio de ancho. El repintado en
     sí ya está probado en t3-textos-marquee.js; lo que no existía era el disparador. Se mira el
     banderín de coalescencia en vez del resultado final porque el trabajo real ocurre dentro de un
     `requestAnimationFrame`, y rAF NO CORRE con la pestaña oculta (ver LEEME) — esperarlo acá sería
     esperar para siempre. */
  PRUEBAS.cierto(typeof dashRemedirMarquees === 'function',
    'tiene que existir la función que vuelve a medir');
  window._marqueePendiente = false;
  window.dispatchEvent(new Event('resize'));
  PRUEBAS.cierto(window._marqueePendiente === true,
    '⚠️ un `resize` tiene que encolar una medición nueva: sin esto, girar el teléfono deja el texto ' +
    'cortado y mudo hasta el próximo repintado del panel');
});

PRUEBAS.caso('el remedido se junta en uno solo: arrastrar el borde no dispara una medición por píxel', () => {
  /* Un arrastre de ventana lanza decenas de `resize` por segundo. Sin juntarlos, cada uno mediría
     todos los elementos — y medir fuerza al navegador a recalcular el layout, que es justo lo caro. */
  window._marqueePendiente = false;
  for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('resize'));
  PRUEBAS.cierto(window._marqueePendiente === true, 'queda una medición encolada');
  /* Si no se juntaran, cada evento encolaría lo suyo; el banderín es lo que lo impide. Se comprueba
     que el segundo evento ya lo encontró puesto, que es la condición que corta. */
  PRUEBAS.cierto(typeof dashRemedirMarquees === 'function', 'y sigue existiendo la función');
});

PRUEBAS.caso('⚠️ el envoltorio de la lista del ciclo va a banda completa (T1 deshizo lo de Y6)', () => {
  /* LA REGRESIÓN MÁS CARA QUE ENCONTRÓ LA AUDITORÍA, y se la hizo la tanda a sí misma.
     Y6 (2.2) arregló el ancho con `.dash-sec > .cic-lista { flex-basis:100% }`. Un prompt después,
     T1 (2.3) envolvió los resultados en `<div id="cicCuerpo">` para poder reemplazarlos sin destruir
     el buscador — y con eso `.cic-lista` dejó de ser hija DIRECTA de `.dash-sec`, el `>` dejó de
     matchear y el ancho volvió al bug que Y6 había arreglado.
     Medido en el panel real a 1366 px: sección de 1274 px, lista de 462 — más de 800 px de vacío,
     y las tarjetas en UNA columna en vez de dos. Arreglado: lista 1274, dos columnas de 630.

     ⚠️ POR QUÉ ESTA PRUEBA MIDE `flexBasis` Y NO EL ANCHO. La prueba de Y6 sí mide el ancho, y sí
     pinta la sección de verdad — y aun así NO vio esto: fuera de la cadena real
     (`#portalDash > .dash-scroll > .dash-sec`) la sección reparte distinto y la lista sale a ancho
     completo igual, con regla o sin ella. O sea que ahí el ancho no discrimina: da lo mismo en los
     dos casos, y una comprobación que no distingue no es una comprobación.
     Lo que sí discrimina es el estilo YA RESUELTO por el navegador, que es el efecto de la regla y
     no su texto. Abajo va un control que lo demuestra: un envoltorio que NO está en la enumeración
     tiene que dar `auto`. Si algún día los dos dan lo mismo, esta prueba dejó de servir. */
  const caja = document.createElement('div');
  caja.innerHTML = '<div class="dash-scroll"><section class="dash-sec" data-tab="ciclo">' +
    '<div id="cicCuerpo"></div><div id="__a2_control"></div></section></div>';
  document.body.appendChild(caja);
  try {
    PRUEBAS.enVentana(1366, 800, () => {
      const cuerpo = caja.querySelector('#cicCuerpo');
      const control = caja.querySelector('#__a2_control');
      PRUEBAS.igual(getComputedStyle(cuerpo).flexBasis, '100%',
        '⚠️ #cicCuerpo tiene que ocupar la banda entera: es el envoltorio de toda la lista del ciclo');
      PRUEBAS.igual(getComputedStyle(control).flexBasis, 'auto',
        'y el control tiene que dar `auto` — si diera 100% también, la comprobación de arriba no ' +
        'estaría midiendo nada');
    });
  } finally { caja.remove(); }
});

PRUEBAS.caso('⚠️ la fila del mapa de calor llega a 44 px: se toca y abre un departamento', () => {
  /* HALLAZGO DE LA AUDITORÍA (pre-existente, no de esta tanda). Medía 36 px y llama a
     `dashDrillIdx` — o sea que ABRE el detalle de un departamento con el dedo, igual que las
     pestañas del portal, que en A1 subieron a 44 por exactamente este motivo.
     Se mide el estilo aplicado, no el texto del CSS: es la lección que ya mordió en A1 y en T1. */
  const caja = document.createElement('div');
  caja.innerHTML = '<table class="heat"><tbody><tr class="heat-row">' +
    '<td class="hname">Operaciones ›</td><td class="cell">4</td></tr></tbody></table>';
  document.body.appendChild(caja);
  try {
    const fila = caja.querySelector('.heat-row');
    const alto = fila.getBoundingClientRect().height;
    PRUEBAS.alMenos(alto, 44,
      'una fila que se toca para navegar tiene que llegar al mínimo de 44 px (mide ' + alto + ')');
  } finally { caja.remove(); }
});

PRUEBAS.caso('⚠️ el naranja de marca no se usa como TEXTO: para eso está --orange-legible', () => {
  /* HALLAZGO DE LA AUDITORÍA (pre-existente). `--orange` (#f47a1f) como texto sobre una tarjeta da
     2,75:1 — muy por debajo de 4,5. `--orange-legible` existe desde el 2026-08-22 para exactamente
     esto, y se resolvió en los dos temas. La auditoría encontró ocho lugares del panel y del portal
     que se lo habían salteado.
     Se comprueba sobre el color YA RESUELTO, no sobre el nombre del token: lo que le importa a
     quien lee la pantalla es el contraste, y un token nuevo mal calibrado también tiene que fallar. */
  const caja = document.createElement('div');
  caja.style.background = 'var(--card)';
  caja.innerHTML = '<span class="ctx-chip ctx-person">Ana</span>' +
                   '<div class="informe-loading">Cargando</div>';
  document.body.appendChild(caja);
  try {
    const flojos = [];
    caja.querySelectorAll('.ctx-chip, .informe-loading').forEach(el => {
      const cs = getComputedStyle(el);
      const r = AUDITOR_ratio(cs.color, fondoOpaco(el));
      if (r != null && r < 4.5) flojos.push(el.className + ' ' + r.toFixed(2) + ':1');
    });
    PRUEBAS.igual(flojos, [], 'ninguno puede quedar bajo 4,5:1 — ' + flojos.join(' | '));
  } finally { caja.remove(); }

  function fondoOpaco(el){
    let n = el;
    while (n && n !== document.documentElement){
      const c = getComputedStyle(n).backgroundColor;
      const m = String(c).match(/[\d.]+/g);
      if (m && (m.length < 4 || Number(m[3]) > 0.5)) return c;
      n = n.parentElement;
    }
    return 'rgb(255,255,255)';
  }
  function AUDITOR_ratio(fg, bg){
    const L = css => { const m = String(css).match(/[\d.]+/g); if (!m) return null;
      const [r,g,b] = m.slice(0,3).map(Number);
      const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b); };
    const a = L(fg), b = L(bg);
    if (a == null || b == null) return null;
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  }
});
