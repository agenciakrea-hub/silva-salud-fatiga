/* ══════════════════════════════════════════════════════════════════════════════════════════════
   F087 · LA LÍNEA «ACTUALIZADO» ENTRA QUIETA EN EL CELULAR (2026-11-02)
   Franco eligió «Arreglarlo ya, aparte» sobre un aviso mío que decía que la línea se cortaba a 375 px. No se
   cortaba: no entraba y se deslizaba (T3). Se corta en seco cuando el teléfono pide «reducir movimiento», porque
   la app apaga todas las animaciones (`html.sin-animaciones`) y T3 le sacó la elipsis a propósito.
   Lo que cambia: `dashMedirMq` omite la `.mq-pista` («· toca ↻ para actualizar») ANTES de deslizar.
   Las cajas son las MEDIDAS en el panel de HSEQ real (`onDashData` + `dashWireMarquees`, DM Sans a 10,24 px):
   75 px a 320, 115 a 360, 130 a 375, 185 a 430 y 485 a 768. El texto entero mide 222; sin la pista, 102.
   R17: la línea la escribe `updateDashUpdated`, que es lo que llama `onDashData`, y su única entrada es
   `DASH.updated`, que el mismo `onDashData` pone con `Date.now()`: no viene de otra capa. Por eso acá se arma sólo
   esa hora y se llama a la función real, nunca a `dashSetMq` con un texto armado a mano.
   R19: la omisión la concede `dashMedirMq` (la clase `.mq-sin-pista`, que el CSS traduce en `display:none`), y qué
   es pista lo marca `updateDashUpdated` con el tercer argumento de `dashSetMq`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('F087 · la línea «Actualizado» en el celular');

/* Como `t3ConPanelVisible`: con #portalOverlay y #portalDash en `display:none` todo el subárbol mide 0. Se destapan
   un momento y se devuelve todo tal cual estaba: el `style` de los dos, la línea entera y el DASH. */
function f087ConPanel(fn) {
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const el = document.getElementById('dashUpdated');
  const antes = { ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style'), html: el.innerHTML,
                  cls: el.className, st: el.getAttribute('style'), DASH: (typeof DASH !== 'undefined') ? DASH : null };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    ovl.style.display = 'block'; dash.style.display = 'flex';
    DASH = { updated: Date.now(), f: {}, _cfg: {} };
    return fn(el);
  } finally {
    volver(ovl, antes.ovl); volver(dash, antes.dash);
    el.innerHTML = antes.html; el.className = antes.cls; volver(el, antes.st);
    DASH = antes.DASH;
  }
}
/* La caja de un ancho de teléfono y la línea escrita por el camino real. */
function f087Pinta(el, caja) { el.style.width = caja + 'px'; updateDashUpdated(); return f087Foto(el); }
function f087Foto(el) {
  const inner = el.querySelector('.mq-in'), pista = el.querySelector('.mq-in > .mq-pista');
  return {
    inner, pista,
    sinPista: el.classList.contains('mq-sin-pista'), desliza: el.classList.contains('marquee'),
    pistaSeVe: !!pista && getComputedStyle(pista).display !== 'none',
    queda: inner ? inner.scrollWidth : 0, caja: el.clientWidth,
    dist: el.style.getPropertyValue('--marquee-dist'),
    texto: inner && inner.firstChild && inner.firstChild.nodeType === 3 ? inner.firstChild.nodeValue : ''
  };
}
const f087Hora = () => { const d = new Date(DASH.updated), p = n => String(n).padStart(2, '0');
  return t('dash_actualizado', { h: p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) }); };

PRUEBAS.caso('🔴 F087 · a 375 px (caja de 130) la línea entra quieta: se omite la pista y no se desliza', () => {
  f087ConPanel(el => {
    const r = f087Pinta(el, 130);
    /* Lo que se VE lo dicen `pistaSeVe` y el ancho de abajo; esto mide otra cosa: que la hora va en su propio nodo y
       la pista no quedó pegada al mismo texto (que es como estaba antes de F087, y entonces no se podía omitir). */
    PRUEBAS.igual(r.texto, f087Hora(), 'la hora va sola en su nodo de texto, sin la pista pegada');
    if (DASH_DEMO) {   // la demostración nunca llevó la pista (T3)
      PRUEBAS.falso(!!r.pista, 'en la demostración no hay pista que omitir');
    } else {
      PRUEBAS.cierto(!!r.pista, 'la pista va en su propio span, que es lo que se puede omitir');
      PRUEBAS.igual(r.pista && r.pista.textContent, ' · ' + t('dash_toca_actualizar'), 'la pista es «· toca ↻ para actualizar»');
      PRUEBAS.cierto(r.sinPista, 'a 130 px el texto entero no entra: la pista se omite');
      PRUEBAS.falso(r.pistaSeVe, 'la pista omitida no se ve (display:none)');
    }
    PRUEBAS.falso(r.desliza, 'sin la pista entra: no hace falta deslizar, ni con «reducir movimiento» queda cortada');
    PRUEBAS.cierto(r.queda <= r.caja + 2, 'lo que queda entra en la caja: ' + r.queda + ' de ' + r.caja);
    PRUEBAS.igual(r.dist, '', 'sin distancia de deslizamiento');
  });
});

PRUEBAS.caso('F087 · con la caja de 768 px (485) la pista se ve entera y nada se desliza', () => {
  f087ConPanel(el => {
    const r = f087Pinta(el, 485);
    PRUEBAS.falso(r.sinPista, 'con espacio, la pista no se omite');
    if (!DASH_DEMO) PRUEBAS.cierto(r.pistaSeVe, 'la pista se ve');
    PRUEBAS.falso(r.desliza, 'entra entera: no se desliza');
    PRUEBAS.cierto(r.queda <= r.caja + 2, 'el texto entero entra: ' + r.queda + ' de ' + r.caja);
  });
});

PRUEBAS.caso('🔴 F087 · al girar el teléfono la pista vuelve, y al volver a girarlo se va (A2)', () => {
  /* Girar no vuelve a escribir la línea: sólo llama a `dashWireMarquees` (desde `dashRemedirMarquees`). Por eso
     `dashMedirMq` tiene que medir ENTERO cada vez y no quedarse con la decisión de la medición anterior. */
  if (DASH_DEMO) { PRUEBAS.cierto(true, 'se saltea en la demostración: no hay pista'); return; }
  f087ConPanel(el => {
    PRUEBAS.cierto(f087Pinta(el, 130).sinPista, 'de pie (130): sin la pista');
    el.style.width = '485px'; dashWireMarquees();
    const ancho = f087Foto(el);
    PRUEBAS.falso(ancho.sinPista, 'acostado (485): la pista vuelve');
    PRUEBAS.cierto(ancho.pistaSeVe, 'y se ve');
    PRUEBAS.falso(ancho.desliza, 'y no se desliza');
    el.style.width = '130px'; dashWireMarquees();
    const otraVez = f087Foto(el);
    PRUEBAS.cierto(otraVez.sinPista, 'de pie otra vez: se omite de nuevo');
    PRUEBAS.falso(otraVez.desliza, 'y sigue quieta');
  });
});

PRUEBAS.caso('🔴 F087 · si sin la pista tampoco entra (320 px, caja de 75) se desliza lo que queda, no el texto entero', () => {
  /* El último recurso sigue siendo deslizar (T3). La distancia tiene que salir del texto SIN la pista: con la del
     texto entero (222 − 75), «Actualizado HH:MM:SS» se iría de la caja y dejaría un hueco vacío en cada vuelta. */
  if (DASH_DEMO) { PRUEBAS.cierto(true, 'se saltea en la demostración: no hay pista'); return; }
  f087ConPanel(el => {
    const r = f087Pinta(el, 75);
    PRUEBAS.cierto(r.sinPista, 'primero se omite la pista');
    /* Verificador de F087 (T2): sin esto, sin la regla CSS el caso quedaba en verde deslizando el texto ENTERO — el
       aserto de la distancia compara contra el mismo estado que midió el código. */
    PRUEBAS.falso(r.pistaSeVe, 'la pista omitida no se ve: lo que se desliza es sólo la hora');
    PRUEBAS.cierto(r.desliza, 'y como así tampoco entra, se desliza');
    PRUEBAS.cierto(r.queda > r.caja + 2, 'guarda: lo que queda no entra en 75 (' + r.queda + ')');
    PRUEBAS.igual(parseFloat(r.dist), -(r.queda - r.caja) - 4, 'la distancia es la del texto sin la pista');
  });
});

PRUEBAS.caso('🔴 F087 · por el orden real: onDashData escribe con el panel oculto, y la pista se omite en el cuadro siguiente', () => {
  /* Verificador de F087 (T1): los casos de arriba destapan el panel ANTES de escribir, y en producción es al revés.
     `onDashData` llama a `updateDashUpdated` con #portalDash todavía oculto —la medición de `dashSetMq` da 0— y lo
     muestra recién después; la omisión la hace el `requestAnimationFrame(dashWireMarquees)` que dejaron encolado
     `renderDash` y `updateDashUpdated`. Acá los cuadros se capturan y se corren a mano, que es lo que la pestaña
     oculta no hace sola. Sin ese cuadro, la línea queda entera y cortada. Entra con el payload de HSEQ del `.gs`
     real (`p309Datos`, el mundo de P308; este archivo va después de los dos). */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const gate = document.getElementById('portalGate'), el = document.getElementById('dashUpdated');
  const antes = { ovlCls: ovl.className, ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style'), gate: gate.getAttribute('style'),
                  html: el.innerHTML, cls: el.className, st: el.getAttribute('style'), DASH: (typeof DASH !== 'undefined') ? DASH : null };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  const rafOrig = window.requestAnimationFrame, cuadros = [];
  try {
    window.requestAnimationFrame = cb => { cuadros.push(cb); return cuadros.length; };
    CTX.resetear(); localStorage.clear();
    ovl.classList.add('show'); dash.style.display = 'none'; gate.style.display = '';   // la primera entrada: el panel no se ve todavía
    el.style.width = '130px';                                                          // la caja de un teléfono de 375 px
    onDashData(JSON.parse(JSON.stringify(D.hseq)), 'Helitec', { usuario: 'helitec' }, 'hseq');
    const recien = f087Foto(el);
    PRUEBAS.igual(dash.style.display, '', 'guarda: onDashData mostró el panel');
    PRUEBAS.falso(recien.sinPista, 'guarda: dashSetMq midió con el panel oculto y todavía no pudo omitir nada');
    PRUEBAS.cierto(cuadros.indexOf(dashWireMarquees) >= 0, 'quedó encolado el cuadro que vuelve a medir (dashWireMarquees)');
    cuadros.splice(0).forEach(cb => { try { cb(performance.now()); } catch (e) {} });   // el cuadro siguiente
    const r = f087Foto(el);
    PRUEBAS.cierto(r.sinPista, 'en el cuadro siguiente la pista se omite');
    PRUEBAS.falso(r.pistaSeVe, 'y no se ve');
    PRUEBAS.falso(r.desliza, 'y la línea queda quieta');
    PRUEBAS.cierto(r.queda <= r.caja + 2, 'lo que queda entra: ' + r.queda + ' de ' + r.caja);
  } finally {
    window.requestAnimationFrame = rafOrig;
    try { dfmClose(); glossClose(); hseqGuiaCerrar(); hseqSemanaCerrar(); } catch (e) {}
    ovl.className = antes.ovlCls; volver(ovl, antes.ovl); volver(dash, antes.dash); volver(gate, antes.gate);
    el.innerHTML = antes.html; el.className = antes.cls; volver(el, antes.st);
    try { DASH = antes.DASH; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
});

PRUEBAS.caso('F087 · un texto sin pista no cambia: #dashScope se desliza como en T3 y nunca lleva .mq-sin-pista', () => {
  const el = document.getElementById('dashScope');
  const antes = { html: el.innerHTML, cls: el.className, st: el.getAttribute('style') };
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const antesP = { ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style') };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    ovl.style.display = 'block'; dash.style.display = 'flex';
    dashSetMq('dashScope', 'Empresa con un nombre bastante largo · ejemplo');
    el.style.width = '90px';
    dashWireMarquees();
    PRUEBAS.cierto(el.classList.contains('marquee'), 'sin pista que omitir, se desliza como antes');
    PRUEBAS.falso(el.classList.contains('mq-sin-pista'), 'y nunca lleva la clase de la omisión');
    PRUEBAS.falso(!!el.querySelector('.mq-pista'), 'dashSetMq sin tercer argumento no arma pista');
  } finally {
    el.innerHTML = antes.html; el.className = antes.cls; volver(el, antes.st);
    volver(ovl, antesP.ovl); volver(dash, antesP.dash);
  }
});

PRUEBAS.caso('⚠️ F087 · la pista también pasa por esc(): llega por innerHTML como el texto', () => {
  const div = document.createElement('div');
  div.id = '__f087_mq_test__';
  document.body.appendChild(div);
  try {
    dashSetMq('__f087_mq_test__', 'Actualizado', '<img src=x onerror=alert(1)> · toca "↻" & más');
    PRUEBAS.igual(div.querySelectorAll('img').length, 0, 'ninguna etiqueta real: la pista tiene que llegar escapada');
    const pista = div.querySelector('.mq-pista');
    PRUEBAS.cierto(!!pista && pista.textContent.indexOf('<img src=x') >= 0, 'pero su texto sigue presente, legible');
  } finally { div.remove(); }
});
