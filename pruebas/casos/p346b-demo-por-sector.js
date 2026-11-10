/* ══ P346b · F116 · F117 · «ASÍ VE LA APP LA PERSONA»: LA DEMOSTRACIÓN DEL INICIO POR SECTOR (2026-11-10) ══════════════
   Rafael quiere mostrar cómo cambian los botones según la categoría de la empresa sin tocar ninguna empresa real. Desde la
   casita (⌂) del administrador se elige un sector y se ve el inicio de una persona de ese sector, armado con las MISMAS
   piezas que el teléfono (`seccionesApp(sector)` → `seccionArmar` → `buildItem`). Estos casos prueban:
   · la entrada en la casita, con los cuatro sectores (R19: el derecho a verla es de `admAtajosAbrir`, que sólo pinta el
     botón `#admFab` del administrador);
   · el contrato con el inicio de verdad (R21): lo que muestra la demostración es lo que dibuja `renderSections` para
     alguien de ese sector;
   · que no se registra ni se envía nada, que no cambia el sector de la app y que al salir no queda nada;
   · que el atrás físico la cierra (`silvaAtras`), y los textos (R1, R14, R5). */

function p346bDash() {
  return { rol: 'admin', vista: 'medico', f: { emp: '' }, atajosAdmin: [{ nombre: 'Persona Uno', cedula: '1', empresa: 'Empresa X' }] };
}
/* Las tarjetas que se ven, en orden: título, descripción e ícono. Sirve igual para el inicio y para la demostración. */
function p346bTarjetas(raiz) {
  return Array.from(raiz.querySelectorAll('.item')).map(it => ({
    tt: ((it.querySelector('.tt') || {}).textContent || '').trim(),
    ds: ((it.querySelector('.ds') || {}).textContent || '').trim(),
    ic: ((it.querySelector('.ic svg') || {}).innerHTML || '').replace(/\s+/g, ' ').trim()
  }));
}
/* Abre y cierra sin dejar historial (R18) */
function p346bSinHistorial(fn) {
  const oPush = history.pushState, oNav = window.navConsumir;
  history.pushState = () => {}; window.navConsumir = () => {};
  try { return fn(); } finally { history.pushState = oPush; window.navConsumir = oNav; }
}

PRUEBAS.caso('🔴 P346b · la casita del administrador ofrece la demostración por sector, arriba de los atajos de personas', () => {
  if (typeof demoAppPintarEntrada !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  const prevD = DASH;
  try {
    DASH = p346bDash();
    p346bSinHistorial(() => admAtajosAbrir());
    const botones = Array.from(document.querySelectorAll('#admAtajosDemo .adm-demo-sec'));
    PRUEBAS.igual(botones.map(b => b.textContent.trim()), demoAppSectores().map(cfgSectorNombre), '🔴 un botón por sector, con el nombre que usa la configuración');
    PRUEBAS.igual(demoAppSectores().slice().sort(), ['aviacion', 'campo', 'generico', 'planta'], 'los cuatro sectores que conoce la app');
    PRUEBAS.igual(demoAppSectores()[demoAppSectores().length - 1], 'generico', 'el general, al final');
    /* el navegador serializa `<path/>` como `<path></path>`: se comparan las dos cosas pasadas por el mismo serializador */
    const svgNorm = h => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = h; return s.innerHTML; };
    PRUEBAS.cierto(botones.every((b, i) => (b.querySelector('svg') || {}).innerHTML === svgNorm(cicloItemIcono(demoAppSectores()[i], 'llegada_aero'))),
      'cada botón lleva el ícono del sitio de su sector');
    PRUEBAS.cierto(document.querySelectorAll('#admAtajosLista .adm-atajo').length === 1, 'los atajos de personas siguen, debajo');
    const demo = document.getElementById('admAtajosDemo'), lista = document.getElementById('admAtajosLista');
    PRUEBAS.cierto(!!(demo.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING), 'la demostración va arriba: no toca a nadie');
  } finally { try { admAtajosCerrar(); } catch (e) {} DASH = prevD; }
});

PRUEBAS.caso('🔴 P346b · la demostración muestra EXACTAMENTE el inicio que dibuja el teléfono de alguien de ese sector (R21)', () => {
  if (typeof demoAppAbrir !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  /* R21 · el lector real es `renderSections()` con un perfil de ese sector; la demostración no puede decir otra cosa. */
  const g = { perfil: getProfile(), sec: localStorage.getItem(K_SECTOR) };
  try {
    demoAppSectores().forEach(s => {
      setProfile({ nombre: 'Prueba P346b', empresa: 'Empresa X', esPiloto: true, sector: s });
      localStorage.setItem(K_SECTOR, s);
      renderSections();
      const inicio = p346bTarjetas(document.getElementById('sections'));
      /* DISCRIMINADOR · la demostración se abre con la app en OTRO sector: si usara el vigente en vez del elegido,
         mostraría el inicio de ese otro y el aserto de abajo se pondría rojo */
      const otro = s === 'aviacion' ? 'planta' : 'aviacion';
      setProfile({ nombre: 'Prueba P346b', empresa: 'Empresa X', esPiloto: true, sector: otro });
      localStorage.setItem(K_SECTOR, otro);
      p346bSinHistorial(() => demoAppAbrir(s));
      const demo = p346bTarjetas(document.getElementById('demoAppCuerpo'));
      PRUEBAS.alMenos(inicio.length, 10, s + ' · guarda: el inicio de verdad tiene sus tarjetas');
      PRUEBAS.igual(demo, inicio, '🔴 ' + s + ' · la demostración y el inicio son iguales: títulos, descripciones e íconos');
      PRUEBAS.igual(((document.querySelector('#demoAppCuerpo .demo-app-rol b') || {}).textContent || ''), tSector(s, 'rol_aviacion'),
        s + ' · el nombre de la gente es el del banner de rol de ese sector');
      demoAppCerrar();
    });
  } finally {
    try { demoAppCerrar(); } catch (e) {}
    if (g.perfil) setProfile(g.perfil); else localStorage.removeItem(K_PROFILE);
    if (g.sec == null) localStorage.removeItem(K_SECTOR); else localStorage.setItem(K_SECTOR, g.sec);
    try { renderSections(); } catch (e) {}
  }
});

PRUEBAS.caso('🔴 P346b · en la demostración ningún botón registra, envía ni abre nada', () => {
  if (typeof demoAppAbrir !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  const nombres = ['enviarOperacional', 'mark', 'abrirTest', 'openPVT', 'opinionAbrir', 'fetch', 'fetchConReloj', 'dashRequest', 'open'];
  const orig = {}, llamadas = [];
  nombres.forEach(n => { orig[n] = window[n]; window[n] = function () { llamadas.push(n); return Promise.resolve({ ok: true }); }; });
  const foto = JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
  const oToast = window.showToast; let toast = '';
  window.showToast = m => { toast = String(m); };
  try {
    p346bSinHistorial(() => demoAppAbrir('planta'));
    const cuerpo = document.getElementById('demoAppCuerpo');
    const tocables = Array.from(cuerpo.querySelectorAll('a, button'));
    PRUEBAS.alMenos(tocables.length, 10, 'guarda: hay botones para tocar');
    tocables.forEach(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    PRUEBAS.igual(llamadas, [], '🔴 tocar todo no registra, no envía y no abre nada');
    PRUEBAS.igual(JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), foto, '🔴 ni escribe en el teléfono');
    PRUEBAS.igual(toast, '', '🔴 sin toast: tapaba «Salir de la demostración» y se comía el primer toque (verificador, F117)');
    PRUEBAS.cierto(document.querySelector('#demoAppOv .demo-app-aviso').classList.contains('resalta'), 'el aviso de la hoja se resalta');
    PRUEBAS.igual(document.getElementById('demoAppVivo').textContent, t('dapp_toque'), 'y el lector de pantalla oye por qué');
    /* el centro de «Salir» tiene que ser el botón mismo, no algo encima */
    const salir = document.querySelector('#demoAppOv .demo-app-salir'), rs = salir.getBoundingClientRect();
    const arriba = document.elementFromPoint(rs.left + rs.width / 2, rs.top + rs.height / 2);
    PRUEBAS.cierto(rs.width > 0 && !!arriba && (arriba === salir || salir.contains(arriba)), '🔴 después de tocar una tarjeta, «Salir» queda libre (encima: ' + (arriba && (arriba.id || arriba.className)) + ')');
    PRUEBAS.igual(cuerpo.querySelectorAll('a[href]').length, 0, 'sin enlaces (WhatsApp no se abre ni con el botón del medio)');
    PRUEBAS.igual(cuerpo.querySelectorAll('[data-id]').length, 0, '🔴 sin `data-id`: las copias no chocan con el inicio de verdad');
  } finally {
    nombres.forEach(n => { window[n] = orig[n]; });
    window.showToast = oToast;
    try { demoAppCerrar(); } catch (e) {}
  }
});

PRUEBAS.caso('🔴 P346b · cambiar de sector en la demostración no cambia el de la app ni el perfil, y al salir no queda nada', () => {
  if (typeof demoAppAbrir !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  const antes = { sec: sectorActual(), k: localStorage.getItem(K_SECTOR), perfil: JSON.stringify(getProfile()) };
  try {
    p346bSinHistorial(() => demoAppAbrir('campo'));
    PRUEBAS.cierto(p346bTarjetas(document.getElementById('demoAppCuerpo')).some(c => /sitio de trabajo/i.test(c.tt)), 'guarda: abrió en campo');
    demoAppSector('planta');
    PRUEBAS.cierto(p346bTarjetas(document.getElementById('demoAppCuerpo')).some(c => /planta/i.test(c.tt)), 'cambia de sector con un toque');
    PRUEBAS.igual(document.activeElement, document.querySelector('#demoAppSectores .demo-app-sec.on'), 'el foco queda en el sector elegido (verificador: se perdía al rearmar)');
    PRUEBAS.igual(document.querySelectorAll('#demoAppSectores .demo-app-sec.on').length, 1, 'un solo sector marcado');
    PRUEBAS.igual((document.querySelector('#demoAppSectores [aria-checked="true"]') || {}).textContent, cfgSectorNombre('planta'), 'y es el elegido');
    PRUEBAS.igual([sectorActual(), localStorage.getItem(K_SECTOR), JSON.stringify(getProfile())], [antes.sec, antes.k, antes.perfil],
      '🔴 el sector de la app, el guardado y el perfil, intactos');
    p346bSinHistorial(() => demoAppCerrarUI());
    PRUEBAS.falso(document.getElementById('demoAppOv').classList.contains('show'), '«Salir de la demostración» la cierra');
    PRUEBAS.igual(document.getElementById('demoAppCuerpo').innerHTML, '', 'y no queda nada armado');
    PRUEBAS.igual(typeof DEMO_APP_SECTOR, 'undefined', 'ni el sector elegido');
  } finally { try { demoAppCerrar(); } catch (e) {} }
});

PRUEBAS.caso('P346b · el atrás del teléfono cierra la demostración, y la guía ⓘ está cerrada (R5)', () => {
  if (typeof demoAppAbrir !== 'function' || typeof silvaAtras !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  try {
    p346bSinHistorial(() => demoAppAbrir('aviacion'));
    const guia = document.querySelector('#demoAppAyuda details');
    PRUEBAS.cierto(!!guia && !guia.open, 'R5 · la guía ⓘ, cerrada por defecto');
    PRUEBAS.igual(silvaAtras(), true, 'el atrás la toma');
    PRUEBAS.falso(document.getElementById('demoAppOv').classList.contains('show'), 'y la cierra');
  } finally { try { demoAppCerrar(); } catch (e) {} }
});

PRUEBAS.caso('P346b · sin sector, el inicio sale igual que antes (`seccionesApp()` = el sector vigente)', () => {
  if (typeof seccionesApp !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app'); return; }
  const forma = secs => JSON.stringify(secs.map(s => [s.id, s.title, s.sub, s.items.map(it => [it.id, it.label, it.desc, it.icon, it.msg || ''])]));
  PRUEBAS.igual(forma(seccionesApp()), forma(seccionesApp(sectorActual())), 'sin argumento resuelve con el sector vigente, por el mismo camino');
  const otro = sectorActual() === 'planta' ? 'aviacion' : 'planta';
  PRUEBAS.cierto(forma(seccionesApp(otro)) !== forma(seccionesApp()), 'DISCRIMINADOR · con otro sector, cambia');
});

PRUEBAS.caso('R1 · R14 · los textos de la demostración: en los dos idiomas, neutros y sin términos de sector', () => {
  ['dapp_titulo', 'dapp_aviso', 'dapp_salir', 'dapp_toque', 'dapp_rol', 'dapp_entrar_t', 'dapp_entrar_d', 'hlp_demo_app'].forEach(k => {
    const es = _i18nBuscar('es', '', k), en = _i18nBuscar('en', '', k);
    PRUEBAS.cierto(es != null && en != null, k + ' existe en español y en inglés');
    PRUEBAS.falso(/\b(tocá|elegí|mirá|podés|tenés|querés|sabés|salí)\b/i.test(es || ''), k + ' · R1 · sin voseo');
    PRUEBAS.falso(/aeropuerto|piloto|vuelo|tripulaci/i.test(es || ''), k + ' · R14 · sin términos de sector escritos a mano');
  });
});

PRUEBAS.caso('🔴 P346b · la casita aparece para cualquier administrador, aunque no tenga atajos de personas (verificador)', () => {
  if (typeof dashUpdateAdmFab !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  /* R19 · el derecho a ver la casita lo da `dashUpdateAdmFab` con `esAdminSesion()`; antes además pedía atajos, y un
     administrador sin atajos no podía llegar a la demostración */
  const prevD = DASH, fab = document.getElementById('admFab');
  try {
    DASH = Object.assign(p346bDash(), { atajosAdmin: [] });
    dashUpdateAdmFab();
    PRUEBAS.igual(fab.style.display, '', '🔴 sin atajos, la casita igual se ve');
    p346bSinHistorial(() => admAtajosAbrir());
    PRUEBAS.igual(document.querySelectorAll('#admAtajosDemo .adm-demo-sec').length, demoAppSectores().length, 'y adentro está la demostración');
    PRUEBAS.cierto(document.querySelector('#admAtajosOv .adm-atajos-lead').hidden, 'sin atajos, no se explica lo que no hay');
    admAtajosCerrar();
    DASH = Object.assign(p346bDash(), { demoMode: true });
    dashUpdateAdmFab();
    PRUEBAS.igual(fab.style.display, 'none', 'en la demostración de los paneles, no (como antes)');
    DASH = Object.assign(p346bDash(), { rol: 'supervisor' });
    dashUpdateAdmFab();
    PRUEBAS.igual(fab.style.display, 'none', '🔴 un supervisor no la ve');
  } finally { try { admAtajosCerrar(); } catch (e) {} DASH = prevD; try { dashUpdateAdmFab(); } catch (e) {} }
});

PRUEBAS.caso('🔴 P346b · con la demostración abierta, ningún toast tapa «Salir de la demostración» (verificador; la suite lo vio con un toast de otro caso)', () => {
  if (typeof demoAppAbrir !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.68)'); return; }
  const encima = () => {
    const salir = document.querySelector('#demoAppOv .demo-app-salir'), rs = salir.getBoundingClientRect();
    const el = document.elementFromPoint(rs.left + rs.width / 2, rs.top + rs.height / 2);
    return { libre: !!el && (el === salir || salir.contains(el)), quien: el ? (el.id || String(el.className)) : '(nada)' };
  };
  const estilo = document.createElement('style');
  /* el toast y la hoja entran con transiciones (el toast desde fuera de la pantalla, la hoja subiendo 20 px): recién
     abiertos, la medida da posiciones que no son las de verdad y no vería nada (lo mostró el discriminador). Sin
     transiciones, se mide donde quedan. */
  const quieto = document.createElement('style');
  quieto.textContent = '.toast, .sheet { transition: none !important; }';
  document.head.appendChild(quieto);
  try {
    p346bSinHistorial(() => demoAppAbrir('planta'));
    showToast('Un aviso de otro lado');
    const a = encima();
    PRUEBAS.cierto(a.libre, '🔴 un toast de otro lado no tapa la salida (encima: ' + a.quien + ')');
    /* DISCRIMINADOR · con el toast forzado a su lugar de siempre, la medida tiene que ver que tapa */
    estilo.textContent = 'body:has(#demoAppOv.show) .toast { bottom: 1.4rem !important; }';
    document.head.appendChild(estilo);
    const b = encima();
    PRUEBAS.falso(b.libre, 'DISCRIMINADOR · en su lugar de siempre el toast tapa «Salir»: la medida lo ve (encima: ' + b.quien + ')');
  } finally { estilo.remove(); try { hideToast(); } catch (e) {} quieto.remove(); try { demoAppCerrar(); } catch (e) {} }
});

PRUEBAS.caso('🔴 P346b · en el panel de HSEQ, el botón de personas se llama por lo que abre: la demostración, haya o no atajos (F117)', () => {
  if (typeof dashUpdateHseqUI !== 'function' || typeof demoAppPintarEntrada !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.69)'); return; }
  /* R19 · el nombre lo pone `dashUpdateHseqUI` cuando `hseqEsPanel()` (vista y panel de HSEQ: ahí el flotante lleva el ícono
     de personas para no ser otra casa al lado del ⌂ de la botonera, P309). La hoja la pinta `admAtajosPintar`. P346b le
     sumó la demostración a esa hoja, y a un administrador sin atajos es lo ÚNICO que le muestra: el nombre viejo,
     «Entrar como otra persona», prometía algo que no estaba. */
  const prevD = DASH, fab = document.getElementById('admFab');
  try {
    DASH = Object.assign(p346bDash(), { vista: 'hseq', panel: 'hseq', atajosAdmin: [] });
    dashUpdateHseqUI(); dashUpdateAdmFab();
    const nombre = fab.getAttribute('aria-label') || '';
    p346bSinHistorial(() => admAtajosAbrir());
    PRUEBAS.igual(document.querySelectorAll('#admAtajosLista .adm-atajo').length, 0, 'guarda: sin atajos de personas');
    PRUEBAS.igual(document.querySelectorAll('#admAtajosDemo .adm-demo-sec').length, demoAppSectores().length, 'guarda: la hoja tiene la demostración');
    const entrar = t('adm_entrar_como', { nombre: '' }).trim();   // «Entrar como», lo que dice cada atajo
    PRUEBAS.falso(nombre.toLowerCase().indexOf(entrar.toLowerCase()) >= 0,
      '🔴 el nombre no promete «' + entrar + '» cuando la hoja no lo tiene · «' + nombre + '»');
    PRUEBAS.falso(/inicio/i.test(nombre), 'y sigue sin ser otro «inicio» al lado del ⌂ de la botonera (P309) · «' + nombre + '»');
    PRUEBAS.igual(nombre, t('adm_fab_personas'), 'es el nombre del flotante con la botonera');
    /* y la hoja se llama por lo mismo: el título no promete una navegación («Ir al inicio») ni a alguien («Entrar como»),
       y el nombre del botón lo contiene (verificador de 7.69: el botón y la hoja se llamaban distinto) */
    const titulo = ((document.querySelector('#admAtajosOv h2') || {}).textContent || '').trim();
    PRUEBAS.cierto(!!titulo && nombre.toLowerCase().indexOf(titulo.toLowerCase()) >= 0,
      '🔴 el botón («' + nombre + '») se llama por la hoja que abre («' + titulo + '»)');
    PRUEBAS.falso(titulo.toLowerCase().indexOf(entrar.toLowerCase()) >= 0 || /inicio/i.test(titulo),
      'el título de la hoja es cierto sin atajos: no dice «' + entrar + '» ni «inicio» · «' + titulo + '»');
  } finally { try { admAtajosCerrar(); } catch (e) {} DASH = prevD; try { dashUpdateHseqUI(); dashUpdateAdmFab(); } catch (e) {} }
});
