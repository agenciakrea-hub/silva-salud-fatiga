/* ══════════════════════════════════════════════════════════════════════════════════════════════
   F087 · F088 · F089 · LA LÍNEA «ACTUALIZADO» Y EL «…» SIN ANIMACIONES (2026-11-02)
   · F087 (app 7.58): la línea «Actualizado 15:37:30 · toca ↻ para actualizar» no entraba en el celular (222 px de
     texto para una caja de 130 a 375) y se deslizaba (T3). La 7.58 omitía la pista antes de deslizar.
   · F089: Franco, al ver eso, «todo debe verse y leer, y pensá que es para gente 40 plus». La omisión se sacó: en el
     celular la línea va en su PROPIA FILA del header, a todo el ancho, en 12,5 px, y si no entra baja de renglón.
     Ya no pasa por el deslizamiento (`dashSetMq`/`dashWireMarquees`).
   · F088: con «reducir movimiento» (`html.sin-animaciones`) lo que se desliza termina en «…» en vez de cortarse.
   Los anchos se miden con `PRUEBAS.enVentana`, que achica el iframe de la suite: así aplican las media queries reales.
   R17: la línea la escribe `updateDashUpdated`, y su única entrada es `DASH.updated`, que `onDashData` pone con
   `Date.now()`: no viene de otra capa. Un caso entra además por `onDashData` con el panel oculto, que es el orden real.
   R19: lo que se ve lo conceden el CSS de F089 (junto a `.dash-updated`) y `updateDashUpdated`; el «…», la regla
   `html.sin-animaciones .marquee .mq-in` de F088.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('F087 · F088 · F089 · la línea «Actualizado» y el «…»');

/* Como `t3ConPanelVisible`: con #portalOverlay y #portalDash en `display:none` todo el subárbol mide 0. Se destapan
   un momento y se devuelve todo tal cual estaba: el `style` de los dos, la línea y el DASH. */
function f089ConPanel(fn) {
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const el = document.getElementById('dashUpdated');
  const antes = { ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style'), txt: el.textContent,
                  cls: el.className, st: el.getAttribute('style'), DASH: (typeof DASH !== 'undefined') ? DASH : null };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    ovl.style.display = 'block'; dash.style.display = 'flex';
    DASH = { updated: Date.now(), f: {}, _cfg: {} };
    return fn(el);
  } finally {
    volver(ovl, antes.ovl); volver(dash, antes.dash);
    el.textContent = antes.txt; el.className = antes.cls; volver(el, antes.st);
    DASH = antes.DASH;
  }
}
/* Lo que se ve de la línea: el texto, sus renglones (cajas del texto en pantalla), si alguna sale de la barra, y su
   lugar respecto del nombre. */
function f089Foto(el) {
  const barra = document.querySelector('#portalDash .dash-top'), rb = barra.getBoundingClientRect(), cb = getComputedStyle(barra);
  const izq = rb.left + parseFloat(cb.paddingLeft), der = rb.right - parseFloat(cb.paddingRight);
  const rg = document.createRange(); rg.selectNodeContents(el);
  const cajas = [...rg.getClientRects()].filter(c => c.width > 0);
  const renglones = new Set(cajas.map(c => Math.round(c.top))).size;
  const re = el.getBoundingClientRect(), rs = document.getElementById('dashScope').getBoundingClientRect();
  return {
    texto: el.textContent, renglones, cajas: cajas.length,
    afuera: cajas.filter(c => c.left < izq - 1 || c.right > der + 1).length,
    abajoDeLaBarra: cajas.filter(c => c.bottom > rb.bottom + 1).length,
    anchoFila: Math.round(re.width), anchoBarra: Math.round(der - izq),
    debajoDelNombre: re.top >= rs.bottom - 1, alLadoDelNombre: re.left >= rs.right - 1,
    letra: parseFloat(getComputedStyle(el).fontSize),
    desliza: el.classList.contains('marquee'), conMqIn: !!el.querySelector('.mq-in')
  };
}
const f089Texto = () => { const d = new Date(DASH.updated), p = n => String(n).padStart(2, '0');
  return t('dash_actualizado', { h: p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) }) +
    (DASH_DEMO ? '' : ' · ' + t('dash_toca_actualizar')); };

PRUEBAS.caso('🔴 F089 · en el celular la línea va entera, quieta y en su propia fila (320, 375, 390, 768)', () => {
  f089ConPanel(el => {
    PRUEBAS.VENTANAS.filter(v => v.w < 900).forEach(v => PRUEBAS.enVentana(v.w, v.h, () => {
      updateDashUpdated();
      const r = f089Foto(el), q = v.w + ' px';
      PRUEBAS.igual(r.texto, f089Texto(), q + ': la línea dice todo, la pista incluida');
      PRUEBAS.falso(r.desliza || r.conMqIn, q + ': no pasa por el deslizamiento de T3');
      PRUEBAS.cierto(r.cajas > 0, q + ': guarda: hay texto en pantalla para medir');
      PRUEBAS.igual(r.afuera, 0, q + ': ningún pedazo del texto sale de la barra');
      PRUEBAS.cierto(r.debajoDelNombre, q + ': va debajo del nombre');
      PRUEBAS.cierto(r.anchoFila >= 0.9 * r.anchoBarra, q + ': en su propia fila, a todo el ancho: ' + r.anchoFila + ' de ' + r.anchoBarra);
      PRUEBAS.cierto(r.letra >= 12, q + ': del tamaño que se lee (40+): ' + r.letra + ' px');
    }));
  });
});

PRUEBAS.caso('🔴 F089 · el header no salta cuando llegan los datos, con letra Normal y «Muy grande» (320, 375) (H4)', () => {
  /* Verificador de F089 (H4 y N4): con `.dash-updated:empty { display:none }` la fila no existía hasta que llegaban
     los datos, y el header crecía 22 px de golpe (53 con letra «Muy grande»); con un espacio duro guardaba UN renglón,
     y con letra grande, donde son dos, saltaba igual 20 px. Ahora guarda el mismo texto, invisible (`data-reserva`). */
  let txt = null; try { txt = localStorage.getItem('silva_fatiga_texto_v1'); } catch (e) {}
  let dosRenglones = false;
  try {
    [[1, 'Normal'], [3, 'Muy grande']].forEach(([nivel, nombre]) => {
      localStorage.setItem('silva_fatiga_texto_v1', String(nivel)); aplicarTamanoTexto();
      f089ConPanel(el => [[320, 640], [375, 812]].forEach(([an, al]) => PRUEBAS.enVentana(an, al, () => {
        const barra = document.querySelector('#portalDash .dash-top');
        /* A medianoche: «00:00:00» es la hora más ancha y es la que usa la reserva. Con cifras más angostas, en
           unos pocos anchos con letra grande la reserva puede guardar un renglón de más que se devuelve al llegar
           los datos: es el límite escrito junto al CSS, y no lo que mide este caso. */
        DASH.updated = new Date(2026, 0, 1, 0, 0, 0).getTime();
        el.textContent = '';
        const vacia = barra.getBoundingClientRect().height;
        updateDashUpdated();
        const llena = barra.getBoundingClientRect().height;
        if (f089Foto(el).renglones >= 2) dosRenglones = true;
        PRUEBAS.cierto(Math.abs(llena - vacia) <= 1, nombre + ' a ' + an + ' px: el header mide lo mismo antes y después (' + Math.round(vacia) + ' → ' + Math.round(llena) + ')');
      })));
    });
    PRUEBAS.cierto(dosRenglones, 'guarda: en alguna combinación la línea ocupa dos renglones (el caso que saltaba)');
  } finally {
    try { if (txt === null) localStorage.removeItem('silva_fatiga_texto_v1'); else localStorage.setItem('silva_fatiga_texto_v1', txt); } catch (e) {}
    aplicarTamanoTexto();
  }
});

PRUEBAS.caso('🔴 F089 · con letra «Muy grande» baja de renglón, pero se ve toda (375)', () => {
  let antes = null;
  try { antes = localStorage.getItem('silva_fatiga_texto_v1'); } catch (e) {}
  try {
    localStorage.setItem('silva_fatiga_texto_v1', '3'); aplicarTamanoTexto();
    f089ConPanel(el => PRUEBAS.enVentana(375, 812, () => {
      updateDashUpdated();
      const r = f089Foto(el);
      PRUEBAS.cierto(r.renglones >= 2, 'guarda: con la letra más grande la línea no entra en un renglón (' + r.renglones + ')');
      PRUEBAS.igual(r.afuera, 0, 'baja de renglón en vez de salirse de la barra');
      PRUEBAS.igual(r.abajoDeLaBarra, 0, 'y la barra crece para que entren los dos renglones');
      PRUEBAS.falso(r.desliza, 'no se desliza');
    }));
  } finally {
    try { if (antes === null) localStorage.removeItem('silva_fatiga_texto_v1'); else localStorage.setItem('silva_fatiga_texto_v1', antes); } catch (e) {}
    aplicarTamanoTexto();
  }
});

PRUEBAS.caso('F089 · en escritorio (1366) sigue al lado del título, entera', () => {
  f089ConPanel(el => PRUEBAS.enVentana(1366, 768, () => {
    updateDashUpdated();
    const r = f089Foto(el);
    PRUEBAS.cierto(r.alLadoDelNombre, 'al lado del título, como antes de F089');
    PRUEBAS.igual(r.afuera, 0, 'entera, dentro de la barra');
    PRUEBAS.igual(r.renglones, 1, 'en un renglón');
  }));
});

PRUEBAS.caso('🔴 F089 · por el orden real: onDashData escribe con el panel oculto y la línea ya queda entera, sin esperar un cuadro', () => {
  /* El orden de producción: `onDashData` llama a `updateDashUpdated` con #portalDash todavía oculto y lo muestra
     después. Con el deslizamiento (T3, F087) la línea dependía del `requestAnimationFrame` que volvía a medir; ahora
     no depende de ninguno: acá los cuadros se capturan y NO se corren. Entra con el payload de HSEQ del `.gs` real
     (`p309Datos`, el mundo de P308; este archivo va después de los dos). */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const gate = document.getElementById('portalGate'), el = document.getElementById('dashUpdated');
  const antes = { ovlCls: ovl.className, ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style'), gate: gate.getAttribute('style'),
                  txt: el.textContent, cls: el.className, st: el.getAttribute('style'), DASH: (typeof DASH !== 'undefined') ? DASH : null };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  const rafOrig = window.requestAnimationFrame, cuadros = [];
  try {
    window.requestAnimationFrame = cb => { cuadros.push(cb); return cuadros.length; };
    CTX.resetear(); localStorage.clear();
    ovl.classList.add('show'); dash.style.display = 'none'; gate.style.display = '';   // la primera entrada: el panel no se ve todavía
    PRUEBAS.enVentana(375, 812, () => {
      onDashData(JSON.parse(JSON.stringify(D.hseq)), 'Helitec', { usuario: 'helitec' }, 'hseq');
      PRUEBAS.igual(dash.style.display, '', 'guarda: onDashData mostró el panel');
      const r = f089Foto(el);
      PRUEBAS.igual(r.texto, f089Texto(), 'la línea dice todo');
      PRUEBAS.igual(r.afuera, 0, 'y entra entera sin que corra ningún cuadro');
      PRUEBAS.cierto(r.anchoFila >= 0.9 * r.anchoBarra, 'en su propia fila: ' + r.anchoFila + ' de ' + r.anchoBarra);
    });
  } finally {
    window.requestAnimationFrame = rafOrig;
    try { dfmClose(); glossClose(); hseqGuiaCerrar(); hseqSemanaCerrar(); } catch (e) {}
    ovl.className = antes.ovlCls; volver(ovl, antes.ovl); volver(dash, antes.dash); volver(gate, antes.gate);
    el.textContent = antes.txt; el.className = antes.cls; volver(el, antes.st);
    try { DASH = antes.DASH; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
});

/* F088 · con y sin `html.sin-animaciones`, devolviendo la clase como estaba (la pestaña oculta de la suite la tiene
   puesta de forma permanente; una visible, no). */
function f088ConAnimaciones(si, fn) {
  const h = document.documentElement, tenia = h.classList.contains('sin-animaciones');
  h.classList.toggle('sin-animaciones', !si);
  try { return fn(); } finally { h.classList.toggle('sin-animaciones', tenia); }
}

PRUEBAS.caso('🔴 F088 · sin animaciones lo que se desliza termina en «…»; con animaciones se desliza como en T3', () => {
  const el = document.getElementById('dashScope');
  const antes = { html: el.innerHTML, cls: el.className, st: el.getAttribute('style') };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    f089ConPanel(() => PRUEBAS.enVentana(375, 812, () => {
      dashSetMq('dashScope', 'Aeroambulancias Silva, C.A.');
      dashWireMarquees();
      const inner = el.querySelector('.mq-in');
      PRUEBAS.cierto(el.classList.contains('marquee'), 'guarda: a 375 px el nombre no entra y se marca para deslizar');
      const sin = f088ConAnimaciones(false, () => {
        const cs = getComputedStyle(inner);
        return { te: cs.textOverflow, ov: cs.overflowX, ancho: inner.clientWidth, todo: inner.scrollWidth, caja: el.clientWidth,
                 alto: el.getBoundingClientRect().height };
      });
      PRUEBAS.igual(sin.te, 'ellipsis', 'sin animaciones, termina en «…»');
      PRUEBAS.igual(sin.ov, 'hidden', 'y el «…» lo pinta el texto que se iba a mover');
      PRUEBAS.cierto(sin.ancho <= sin.caja + 1, 'topado al ancho de la caja: ' + sin.ancho + ' de ' + sin.caja);
      PRUEBAS.cierto(sin.todo > sin.ancho + 2, 'guarda: hay texto de sobra que el «…» reemplaza');
      const con = f088ConAnimaciones(true, () => {
        const cs = getComputedStyle(inner);
        return { te: cs.textOverflow, anim: cs.animationName, alto: el.getBoundingClientRect().height };
      });
      PRUEBAS.cierto(con.te !== 'ellipsis', 'con animaciones no hay «…»: compite con el deslizamiento (T3)');
      PRUEBAS.igual(con.anim, 'anResMarquee', 'y se desliza como siempre');
      /* Verificador de F089 (T1): sin `vertical-align: top`, el inline-block con `overflow` toma su borde de abajo
         como línea de base y la caja crece 22 → 27 px. */
      PRUEBAS.cierto(Math.abs(sin.alto - con.alto) <= 0.5, 'el «…» no cambia el alto de la caja: ' + sin.alto + ' contra ' + con.alto);
    }));
  } finally { el.innerHTML = antes.html; el.className = antes.cls; volver(el, antes.st); }
});

PRUEBAS.caso('🔴 F088 · el título del informe que llega tarde se mide: se desliza, y sin animaciones termina en «…» (H1)', async () => {
  /* Verificador de F089 (H1): el historial de informes llega DESPUÉS del primer pintado, y `dashRepintarInforme`
     dibujaba las tarjetas sin medir; sin `.marquee` el título quedaba cortado en seco (y la regla de F088 no aplica).
     Camino real, con la red controlada como en P190: el médico por `onDashData`, la sección pide el historial y la
     respuesta llega después. El marco se achica a mano porque `PRUEBAS.enVentana` no espera promesas. */
  const marco = window.frameElement, tam = marco ? { w: marco.style.width, h: marco.style.height } : null;
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const antes = { ovlCls: ovl.className, ovl: ovl.getAttribute('style'), dash: dash.getAttribute('style') };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  let responder = null;
  try {
    if (marco) { marco.style.width = '375px'; marco.style.height = '812px'; void document.body.offsetWidth; }
    window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
    ovl.classList.add('show');
    const hoy = new Date().toISOString().slice(0, 10);
    onDashData({ ok: true, rol: 'supervisor', vista: 'medico', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
      registros: [{ persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }],
      aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1 },
      'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-f088', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'f088' }, 'medico');
    window.fetchConReloj = () => new Promise(res => { responder = res; });
    DASH._informesLoaded = false; DASH._informesLoading = false;
    renderDash();   // la sección del informe pide el historial
    PRUEBAS.cierto(typeof responder === 'function' && !!document.getElementById('dsec-informe'), 'guarda: la sección está y el pedido salió');
    if (typeof responder !== 'function') return;
    const titulo = 'Informe Ejecutivo de Análisis de Riesgo Psicosocial y Fatiga del período completo';
    responder({ json: () => Promise.resolve({ ok: true, informes: [{ id: 'f088-1', fecha: hoy, texto: titulo + '\n\nCuerpo.' }], proximo: null }) });
    for (let i = 0; i < 12; i++) await null;
    const prev = document.querySelector('#dsec-informe .inf-prev'), inner = prev && prev.querySelector('.mq-in');
    PRUEBAS.cierto(!!inner, 'guarda: llegó la tarjeta con su título');
    if (!inner) return;
    PRUEBAS.cierto(inner.scrollWidth > prev.clientWidth + 2, 'guarda: a 375 px el título no entra (' + inner.scrollWidth + ' de ' + prev.clientWidth + ')');
    PRUEBAS.cierto(prev.classList.contains('marquee'), 'al llegar se mide: queda marcado para deslizarse');
    PRUEBAS.igual(f088ConAnimaciones(false, () => getComputedStyle(inner).textOverflow), 'ellipsis', 'y sin animaciones termina en «…»');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost;
    if (marco) { marco.style.width = tam.w; marco.style.height = tam.h; void document.body.offsetWidth; }
    ovl.className = antes.ovlCls; volver(ovl, antes.ovl); volver(dash, antes.dash);
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  }
});

/* H3 · abre un desplegable con las transiciones apagadas (en una pestaña visible el alto anima 0,25 s) y lo mide contra
   el piso de la hoja, que recorta con `overflow: hidden`. Pinta el panel real de `p309Datos` con la letra que se pida. */
function f089Piso(el) { const hoja = el.closest('.sheet'); return Math.min(innerHeight, hoja ? hoja.getBoundingClientRect().bottom : innerHeight); }
function f089ConDesplegable(payload, nivel, ancho, alto, fn) {
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const antes = { ovlCls: ovl.className, dash: dash.getAttribute('style'), DASH: (typeof DASH !== 'undefined') ? DASH : null };
  let txt = null; try { txt = localStorage.getItem('silva_fatiga_texto_v1'); } catch (e) {}
  try {
    CTX.resetear(); localStorage.clear();
    localStorage.setItem('silva_fatiga_texto_v1', String(nivel)); aplicarTamanoTexto();
    return PRUEBAS.enVentana(ancho, alto, () => f088ConAnimaciones(false, () => {
      ovl.classList.add('show');
      onDashData(JSON.parse(JSON.stringify(payload)), 'Helitec', { usuario: 'helitec' }, 'hseq');
      return fn();
    }));
  } finally {
    try { dfmClose(); glossClose(); hseqGuiaCerrar(); hseqSemanaCerrar(); } catch (e) {}
    ovl.className = antes.ovlCls; if (antes.dash === null) dash.removeAttribute('style'); else dash.setAttribute('style', antes.dash);
    try { DASH = antes.DASH; dashApplyMarca(null); dashUpdateHseqUI(); } catch (e) {}
    /* El tamaño de letra se devuelve AL FINAL: un `localStorage.clear()` después lo borraba (verificador, N5). */
    try { localStorage.clear(); if (txt !== null) localStorage.setItem('silva_fatiga_texto_v1', txt); } catch (e) {}
    aplicarTamanoTexto();
  }
}

PRUEBAS.caso('🔴 F089 · con el menú abierto, cambiar el período (y el alto del header) no lo saca de la pantalla (N1)', () => {
  /* Verificador de F089 (N1): el menú se queda abierto al elegir período, y en HSEQ el estado global de «Semana» es
     más alto que el de «Rango» (`custom`, que no tiene estado): a 320×568 con letra «Muy grande» el menú pasaba el
     borde 57 px hasta cerrarlo y abrirlo de nuevo. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.hseq, 3, 320, 568, () => {
    dashSetPeriod('custom');   // «Rango»: sin estado global, el header es más bajo
    dfmToggle();
    const panel = document.getElementById('dfmPanel'), barra = document.querySelector('#portalDash .dash-top');
    const alto0 = barra.getBoundingClientRect().height;
    dashSetPeriod('semana');
    const alto1 = barra.getBoundingClientRect().height;
    PRUEBAS.cierto(alto1 > alto0 + 5, 'guarda: el header creció al pasar a «Semana» (' + Math.round(alto0) + ' → ' + Math.round(alto1) + ')');
    PRUEBAS.cierto(panel.classList.contains('open'), 'guarda: el menú sigue abierto');
    PRUEBAS.cierto(panel.getBoundingClientRect().bottom <= f089Piso(panel) + 1, 'el menú sigue terminando antes del borde: ' + Math.round(panel.getBoundingClientRect().bottom) + ' de ' + Math.round(f089Piso(panel)));
  });
});

PRUEBAS.caso('🔴 F089 · volver a entrar con el menú abierto no lo mide con el panel oculto (M1)', () => {
  /* Verificador de F089 (M1): «atrás» (`portalBackToGate`, rama del supervisor y del médico) oculta #portalDash y no
     cierra el menú; al volver a entrar, `onDashData` repinta ANTES de mostrar el panel. Medido ahí, el menú quedaba
     con el alto de la pantalla entera y sin desplazamiento: 48 px cortado a 320×568 con letra «Muy grande». Acá se
     oculta el panel como lo hace esa rama, y se vuelve a entrar por `onDashData`. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.dir, 3, 320, 568, () => {
    dfmToggle();
    const panel = document.getElementById('dfmPanel');
    PRUEBAS.cierto(panel.classList.contains('open') && panel.getBoundingClientRect().bottom <= f089Piso(panel) + 1, 'guarda: abierto y entero');
    document.getElementById('portalDash').style.display = 'none';
    onDashData(JSON.parse(JSON.stringify(D.dir)), 'Helitec', { usuario: 'helitec' }, 'hseq');
    PRUEBAS.cierto(panel.classList.contains('open') && document.getElementById('portalDash').style.display === '', 'guarda: el panel volvió a verse con el menú abierto');
    PRUEBAS.cierto(panel.getBoundingClientRect().bottom <= f089Piso(panel) + 1, 'y el menú sigue terminando antes del borde: ' + Math.round(panel.getBoundingClientRect().bottom) + ' de ' + Math.round(f089Piso(panel)));
  });
});

PRUEBAS.caso('🔴 F089 · al girar el teléfono, el menú abierto vuelve a medir su lugar', () => {
  /* El `resize` real llama a `dashRemedirMarquees`, que mide en el cuadro siguiente: acá ese cuadro se corre al toque
     (la pestaña oculta no lo corre sola) y `_marqueePendiente` se pone en falso, porque un `resize` anterior de la
     suite puede haberlo dejado trabado en verdadero. Sin el ajuste, el menú de pie quedaba 180 px cortado acostado. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.dir, 1, 375, 812, () => {
    dfmToggle();
    const panel = document.getElementById('dfmPanel');
    PRUEBAS.cierto(panel.classList.contains('open'), 'guarda: el menú está abierto');
    PRUEBAS.enVentana(812, 375, () => {
      const raf = window.requestAnimationFrame, pend = window._marqueePendiente;
      try {
        window.requestAnimationFrame = cb => { cb(performance.now()); return 0; };
        window._marqueePendiente = false;
        dashRemedirMarquees();
      } finally { window.requestAnimationFrame = raf; window._marqueePendiente = pend; }
      PRUEBAS.cierto(panel.getBoundingClientRect().bottom <= f089Piso(panel) + 1, 'acostado, el menú termina antes del borde: ' + Math.round(panel.getBoundingClientRect().bottom) + ' de ' + Math.round(f089Piso(panel)));
    });
  });
});

PRUEBAS.caso('F089 · con lugar de sobra el menú no muestra barra de desplazamiento (1366, letra Normal) (N3)', () => {
  /* Verificador de F089 (N3): con `overflow-y: auto` siempre, en escritorio aparecía una barra 6 a 9 cuadros mientras
     el menú se abría, y el contenido se angostaba 15 px. La barra va sólo cuando lo que trae no entra. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.dir, 1, 1366, 768, () => {
    dfmToggle();
    const panel = document.getElementById('dfmPanel'), inner = panel.querySelector('.dfm-panel-inner');
    PRUEBAS.cierto(panel.classList.contains('open') && inner.scrollHeight <= dashAltoHastaElPiso(panel), 'guarda: abierto, y lo que trae entra');
    PRUEBAS.igual(getComputedStyle(inner).overflowY, 'hidden', 'sin barra de desplazamiento');
  });
});

PRUEBAS.caso('F089 · el menú vuelve a abrir desde arriba, no donde quedó desplazado', () => {
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.dir, 3, 320, 568, () => {
    dfmToggle();
    const inner = document.querySelector('#dfmPanel .dfm-panel-inner');
    inner.scrollTop = inner.scrollHeight;
    PRUEBAS.cierto(inner.scrollTop > 0, 'guarda: el menú se pudo desplazar');
    dfmClose(); dfmToggle();
    PRUEBAS.igual(inner.scrollTop, 0, 'al volver a abrir está arriba de todo: se ven las pestañas');
  });
});

PRUEBAS.caso('F089 · el ↻ sin datos nuevos vuelve a medir: updateDashUpdated encola dashWireMarquees (H2)', () => {
  /* Un ↻ sin cambios vuelve a `updateDashUpdated` SIN repintar; ese cuadro es la única medición del camino para lo que
     cambió de ancho por detrás (el nombre tras un logo, la fuente). */
  const raf = window.requestAnimationFrame, cuadros = [];
  const el = document.getElementById('dashUpdated'), antes = el.textContent, prev = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    window.requestAnimationFrame = cb => { cuadros.push(cb); return cuadros.length; };
    DASH = { updated: Date.now(), f: {}, _cfg: {} };
    updateDashUpdated();
    PRUEBAS.cierto(cuadros.indexOf(dashWireMarquees) >= 0, 'encola el barrido que vuelve a medir el nombre y el título del informe');
  } finally { window.requestAnimationFrame = raf; el.textContent = antes; DASH = prev; }
});

PRUEBAS.caso('🔴 F088 · el logo que carga tarde vuelve a medir el nombre de la empresa (H2)', async () => {
  /* Camino real: el logo viaja en la `marca` del payload, `onDashData` → `dashApplyMarca`. El nombre se mide con la caja
     sin logo; cuando el logo llega, la caja se achica y sólo su `onload` vuelve a medir. El `?f088=` evita la caché,
     para que llegue DESPUÉS de la medición, como en la red. */
  const marco = window.frameElement, tam = marco ? { w: marco.style.width, h: marco.style.height } : null;
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  const ovl = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const antes = { ovlCls: ovl.className, dash: dash.getAttribute('style') };
  /* Los cuadros se capturan y NO se corren (verificador, M3): con la pestaña visible, el `requestAnimationFrame` de
     `renderDash` medía igual cuando el logo ya había llegado, y el caso daba verde sin el `onload`. */
  const raf = window.requestAnimationFrame;
  try {
    if (marco) { marco.style.width = '375px'; marco.style.height = '812px'; void document.body.offsetWidth; }
    window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
    window.requestAnimationFrame = () => 0;
    ovl.classList.add('show');
    const hoy = new Date().toISOString().slice(0, 10);
    onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
      registros: [{ persona: 'Persona De Prueba', empresa: 'Helitec Air', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 3 }],
      aptitud: [], operacional: [], comentarios: [], pvt: [], turnos: [], duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1,
      marca: { logo: location.origin + '/icon-192.png?f088=' + Date.now() } },
      'Helitec Air', { action: 'supervisor', usuario: 'usuario-f088', empresa: 'Helitec Air', pass: 'x', dispositivoId: 'f088' }, 'supervisor');
    const sc = document.getElementById('dashScope'), img = document.getElementById('dashBrandLogo');
    PRUEBAS.falso(sc.classList.contains('marquee'), 'guarda: sin el logo todavía, «Helitec Air» entra');
    /* El cartel de abajo lo puede poner también una medición de rebote (una respuesta tardía de otro caso que pasa por
       `dashRepintarInforme`, que mide todo): corriendo la suite entera, sin el `onload` quedaba en verde igual. Esto
       es lo que no depende de que llegue nada: el logo trae quien lo mida al cargar. */
    PRUEBAS.cierto(typeof img.onload === 'function', 'el logo trae quien vuelva a medir el nombre al cargar (`onload`)');
    await new Promise(res => { if (img.complete && img.naturalWidth) res(); else { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); setTimeout(res, 4000); } });
    await null;
    PRUEBAS.cierto(img.naturalWidth > 0 && img.getBoundingClientRect().width > 0, 'guarda: el logo cargó y se ve');
    const inner = sc.querySelector('.mq-in');
    PRUEBAS.cierto(!!inner && inner.scrollWidth > sc.clientWidth + 2, 'guarda: con el logo, el nombre ya no entra (' + (inner && inner.scrollWidth) + ' de ' + sc.clientWidth + ')');
    PRUEBAS.cierto(sc.classList.contains('marquee'), 'al cargar el logo se vuelve a medir: el nombre queda marcado para deslizarse');
  } finally {
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost; window.requestAnimationFrame = raf;
    try { dashApplyMarca(null); } catch (e) {}
    if (marco) { marco.style.width = tam.w; marco.style.height = tam.h; void document.body.offsetWidth; }
    ovl.className = antes.ovlCls; if (antes.dash === null) dash.removeAttribute('style'); else dash.setAttribute('style', antes.dash);
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  }
});

PRUEBAS.caso('🔴 F089 · «Menú y filtros» no pasa el borde: 320×568, letra «Muy grande», Dirección (H3)', () => {
  /* Verificador de F089 (H3): con el header más alto, el menú colgaba 48 px por debajo del borde, sin scroll, y
     Departamento y Empleado no se podían alcanzar. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.dir, 3, 320, 568, () => {
    dfmToggle();
    const panel = document.getElementById('dfmPanel'), inner = panel.querySelector('.dfm-panel-inner');
    const piso = f089Piso(panel), arriba = panel.getBoundingClientRect().top;
    PRUEBAS.cierto(panel.classList.contains('open'), 'guarda: el menú está abierto');
    PRUEBAS.cierto(inner.scrollHeight > piso - arriba, 'guarda: lo que trae no entra entero debajo del header (' + inner.scrollHeight + ' para ' + Math.round(piso - arriba) + ')');
    PRUEBAS.cierto(panel.getBoundingClientRect().bottom <= piso + 1, 'el menú termina antes del borde: ' + Math.round(panel.getBoundingClientRect().bottom) + ' de ' + Math.round(piso));
    inner.scrollTop = inner.scrollHeight;
    const ultimo = document.getElementById('dashPer');
    PRUEBAS.cierto(!!ultimo && ultimo.getBoundingClientRect().bottom <= piso + 1, 'y desplazándolo adentro se llega al último filtro (Empleado)');
  });
});

PRUEBAS.caso('🔴 F089 · el Glosario no pasa el borde: 375×667 (iPhone SE), letra «Muy grande», HSEQ (H3)', () => {
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  f089ConDesplegable(D.hseq, 3, 375, 667, () => {
    glossToggle();
    const panel = document.getElementById('glossPanel'), lista = panel.querySelector('.gloss-panel-scroll');
    const items = lista ? lista.querySelectorAll('.gloss-i') : [];
    PRUEBAS.cierto(panel.classList.contains('open') && items.length > 1 && panel.getBoundingClientRect().height > 0, 'guarda: el Glosario está abierto, en pantalla y con términos');
    if (!items.length) return;
    const piso = f089Piso(panel);
    PRUEBAS.cierto(lista.scrollHeight > lista.clientHeight + 1, 'guarda: la lista no entra entera y se desplaza');
    PRUEBAS.cierto(panel.getBoundingClientRect().bottom <= piso + 1, 'el Glosario termina antes del borde: ' + Math.round(panel.getBoundingClientRect().bottom) + ' de ' + Math.round(piso));
    lista.scrollTop = lista.scrollHeight;
    PRUEBAS.cierto(items[items.length - 1].getBoundingClientRect().bottom <= piso + 1, 'y el último término se puede leer entero');
  });
});

PRUEBAS.caso('🔴 F089 · el chip de confiabilidad de HSEQ no tapa la línea (320, 375) (T2)', () => {
  /* Verificador de F089 (T2): el chip cuelga del borde de abajo del header. Si la línea quedara después de la fila del
     estado (sin su `order: 1`, o sin el `order: 2` del estado), el chip le taparía el final («…para actualizar»). El
     chip aparece sólo con tests evaluados en el período: se cargan como en el caso del chip de P310. */
  if (typeof p309Datos !== 'function' || (typeof p309Saltea === 'function' && p309Saltea())) { PRUEBAS.cierto(true, 'se saltea (sin el mundo de P309)'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  const x = JSON.parse(JSON.stringify(D.hseq));
  const sem = x.totalesHseq && x.totalesHseq.periodos && x.totalesHseq.periodos.semana;
  const ks = sem ? Object.keys(sem.metricas || {}).filter(m => sem.metricas[m]) : [];
  PRUEBAS.cierto(ks.length > 0, 'guarda: la semana trae totales');
  if (!ks.length) return;
  sem.estado = { etapa: 'seguro', personas: 12 }; x.nominaTotal = 12;
  sem.metricas[ks[0]].evaluados = 40; sem.metricas[ks[0]].pocoConfiables = 3;
  [[375, 812], [320, 640]].forEach(([an, al]) => f089ConDesplegable(x, 1, an, al, () => {
    const chip = document.getElementById('hseqChip'), el = document.getElementById('dashUpdated');
    const vis = !!chip && !chip.hidden && chip.getBoundingClientRect().width > 0;
    PRUEBAS.cierto(vis, an + ' px · guarda: el chip de confiabilidad está en pantalla');
    if (!vis) return;
    const rc = chip.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(el);
    const cajas = [...rg.getClientRects()].filter(c => c.width > 0);
    PRUEBAS.cierto(cajas.length > 0, an + ' px · guarda: la línea tiene texto en pantalla');
    const tapadas = cajas.filter(c => c.right > rc.left && c.left < rc.right && c.bottom > rc.top && c.top < rc.bottom);
    PRUEBAS.igual(tapadas.length, 0, an + ' px · el chip no tapa ningún pedazo de la línea');
  }));
});

PRUEBAS.caso('F088 · la regla del «…», dado el `.marquee`: el título del informe y la fecha de las anotaciones', () => {
  /* Esto mide sólo la REGLA de CSS con la marca ya puesta. Que el título real la reciba lo mide el caso H1 de arriba. */
  const caja = document.createElement('div');
  caja.style.cssText = 'position:absolute;left:0;top:0;width:150px;';
  caja.innerHTML = '<div class="inf-prev marquee"><span class="mq-in">Informe Ejecutivo de Análisis de Riesgo Psicosocial y Fatiga</span></div>' +
    '<div class="an-res-hasta marquee" style="max-width:60px"><span class="an-res-hasta-in">Hasta el 13 de noviembre de 2026, 10:45</span></div>';
  document.body.appendChild(caja);
  try {
    const te = sel => getComputedStyle(caja.querySelector(sel)).textOverflow;
    const sin = f088ConAnimaciones(false, () => [te('.inf-prev .mq-in'), te('.an-res-hasta-in')]);
    PRUEBAS.igual(sin, ['ellipsis', 'ellipsis'], 'sin animaciones, los dos terminan en «…»');
    const con = f088ConAnimaciones(true, () => [te('.inf-prev .mq-in'), te('.an-res-hasta-in')]);
    PRUEBAS.falso(con.indexOf('ellipsis') >= 0, 'con animaciones, ninguno');
  } finally { caja.remove(); }
});

PRUEBAS.caso('⚠️ F088 · el «…» no cambia la medición: dashMedirMq da la misma distancia con y sin animaciones', () => {
  /* El «…» va en el hijo que se mueve, con su ancho topado: su `scrollWidth` tiene que seguir midiendo el texto
     ENTERO. Si midiera lo topado, `dashMedirMq` le sacaría el `.marquee` y con animaciones dejaría de deslizarse. */
  const el = document.getElementById('dashScope');
  const antes = { html: el.innerHTML, cls: el.className, st: el.getAttribute('style') };
  const volver = (x, v) => { if (v === null) x.removeAttribute('style'); else x.setAttribute('style', v); };
  try {
    f089ConPanel(() => PRUEBAS.enVentana(375, 812, () => {
      dashSetMq('dashScope', 'Aeroambulancias Silva, C.A.');
      const mide = () => { dashMedirMq(el); dashMedirMq(el); return { marca: el.classList.contains('marquee'), dist: el.style.getPropertyValue('--marquee-dist') }; };
      const con = f088ConAnimaciones(true, mide), sin = f088ConAnimaciones(false, mide);
      PRUEBAS.cierto(con.marca && sin.marca, 'se marca para deslizar en los dos casos, también al volver a medir');
      PRUEBAS.igual(sin.dist, con.dist, 'la misma distancia');
    }));
  } finally { el.innerHTML = antes.html; el.className = antes.cls; volver(el, antes.st); }
});
