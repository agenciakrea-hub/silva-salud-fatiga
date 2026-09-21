PRUEBAS.grupo('P191 (2026-09-21) · todo texto visible pasa por t() · toast con tokens · una sola recarga por versión');

/* Auditoría de uso real #24 y §3: ~75 textos visibles escritos a mano en el código (en inglés quedaban en español), el
   `.toast` con `#16233d`/`#fff` a mano (R13) y, decisión de Franco al cerrar P193, la SEGUNDA recarga de cada
   actualización (el `controllerchange` del worker nuevo recargaba una app que ya era la nueva).

   El primer caso es el BARRIDO SOBRE LA FUENTE: recorre el <script> grande carácter por carácter (cadenas simples,
   dobles y templates fuera de `${}`; salta comentarios, regex, el diccionario, los argumentos de t()/tCanon()/tTest()
   y las líneas de consola) y marca como visible el texto de elemento (>…<), los atributos que se leen, y las cadenas
   con tilde/ñ, con palabras vacías del español, o «Frase capitalizada de dos+ palabras». Lo que queda tiene que estar
   en la lista de EXENTOS, cada uno con su razón. Y tiene discriminador: se inyecta un literal y tiene que cazarlo.
   ⚠️ R17 en los demás: los textos se miden pintando por el camino real (`onDashData` → `renderPVT`, `aptGente`,
   `dashFichaMedica`, `admEntrar`, `portalLoginSupervisor`) con la app en inglés, nunca leyendo el diccionario. */

function barridoLiterales(src) {
  const a = src.indexOf('const I18N = {'), b = src.indexOf('function t(clave, vars)');
  const iniScript = src.lastIndexOf('<script', a), finScript = src.indexOf('</script>', b);
  const js = src.slice(src.indexOf('>', iniScript) + 1, finScript);
  const offset = src.slice(0, src.indexOf('>', iniScript) + 1).split('\n').length - 1;
  const dicA = js.indexOf('const I18N = {'), dicB = js.indexOf('function t(clave, vars)');
  const hallazgos = []; let cadenas = 0;
  let i = 0, linea = 1, decl = '?';
  const STOP = /\b(el|la|los|las|de|del|un|una|no|sin|con|para|por|que|se|es|en|al|hay|tu|tus|te|este|esta|más|ya|si|todavía|hasta|antes|después|aquí|ahora|nada|otra|otro|cada)\b/;
  const PAL = /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/;
  function visible(t) {
    t = t.replace(/\$\{[^}]*\}/g, ' ').replace(/\\n/g, ' ');
    if (/[<>]/.test(t)) {
      // texto de elemento (>…<) y atributos que se leen (placeholder/title/aria-label/alt)
      const m1 = t.match(/(?:^|>)([^<>]*)(?:<|$)/g) || [];
      for (const seg of m1) { const v = seg.replace(/^>|<$/g, '').replace(/&[a-z]+;/g, ' ').trim(); if (PAL.test(v) && !/^\s*[.#]?[a-z_-]+\s*$/.test(v)) return v; }
      const m2 = /(placeholder|title|aria-label|alt)="([^"]*)"/.exec(t);
      if (m2 && PAL.test(m2[2]) && !(new RegExp('data-i18n-attr="[^"]*' + m2[1] + ':')).test(t)) return m2[2];
      return null;
    }
    t = t.replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length < 4) return null;
    const palabras = (t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/g) || []).length;
    if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) && palabras >= 1) return t;
    const toks = t.split(' ');
    if (toks.some(x => STOP.test(x.toLowerCase()) && /^[a-záéíóúñ]+$/i.test(x)) && palabras >= 2) return t;
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+( [A-Za-záéíóúñ]+){1,}[.:…]?$/.test(t)) return t;   // «Telemedicina realizada»
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}(…|\.\.\.)?$/.test(t)) return t;               // «Cancelar», «Cargando…»
    if (/^(· )?[A-Za-záéíóúñ]{4,}( ·)?$/.test(t) && /·/.test(t)) return t;            // «Gestiones ·», «· sin fecha»
    return null;
  }
  function anotar(texto, ini) {
    cadenas++;
    const pre = js.slice(Math.max(0, ini - 40), ini);
    if (/\b(t|tCanon|tLista|tTest|tSector|tErr)\(\s*$/.test(pre)) return;       // argumento de t()
    if (/\btTest\(\s*'[^']*'\s*,\s*$/.test(pre)) return;                          // canónico de tTest
    const v = visible(texto); if (!v) return;
    const lin = js.slice(js.lastIndexOf('\n', ini) + 1, js.indexOf('\n', ini));
    if (/console\.(log|warn|error|info)/.test(lin)) return;                       // consola: no lo ve nadie
    hallazgos.push({ linea: linea + offset, decl, texto: v });
  }
  const regexAntes = /[(,=:\[!&|?{};]\s*$|\breturn\s*$|\btypeof\s*$/;
  while (i < js.length) {
    const c = js[i];
    if (c === '\n') {
      linea++; i++;
      const m = /^(?:async\s+)?(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/.exec(js.slice(i, i + 80));
      if (m) decl = m[1];
      continue;
    }
    if (i >= dicA && i < dicB) { i++; continue; }
    if (c === '/' && js[i + 1] === '/') { const f = js.indexOf('\n', i); i = f < 0 ? js.length : f; continue; }
    if (c === '/' && js[i + 1] === '*') { const f = js.indexOf('*/', i + 2); const seg = js.slice(i, f + 2); linea += (seg.match(/\n/g) || []).length; i = f + 2; continue; }
    if (c === '/' && regexAntes.test(js.slice(Math.max(0, i - 12), i))) {
      let j = i + 1, cls = false;
      while (j < js.length && (cls || js[j] !== '/') && js[j] !== '\n') { if (js[j] === '\\') j++; else if (js[j] === '[') cls = true; else if (js[j] === ']') cls = false; j++; }
      i = j + 1; continue;
    }
    if (c === '\'' || c === '"') {
      let j = i + 1;
      while (j < js.length && js[j] !== c && js[j] !== '\n') { if (js[j] === '\\') j++; j++; }
      anotar(js.slice(i + 1, j), i); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, prof = 0, ini = i;
      while (j < js.length) {
        if (js[j] === '\\') { j += 2; continue; }
        if (prof === 0 && js[j] === '`') break;
        if (js[j] === '$' && js[j + 1] === '{') { prof++; j += 2; continue; }
        if (prof > 0 && js[j] === '}') { prof--; j++; continue; }
        if (prof > 0 && js[j] === '`') { // template anidado: saltar hasta su cierre
          let k = j + 1; while (k < js.length && js[k] !== '`') { if (js[k] === '\\') k++; k++; } j = k + 1; continue;
        }
        j++;
      }
      const cuerpo = js.slice(i + 1, j);
      // anotar cada tramo fuera de ${}
      let lineaIni = linea;
      const tramos = []; let p = 0, d = 0, tIni = 0;
      for (let k = 0; k < cuerpo.length; k++) {
        if (cuerpo[k] === '$' && cuerpo[k + 1] === '{') { if (d === 0) tramos.push([tIni, k]); d++; k++; continue; }
        if (d > 0 && cuerpo[k] === '}') { d--; if (d === 0) tIni = k + 1; continue; }
      }
      if (d === 0) tramos.push([tIni, cuerpo.length]);
      for (const [x, y] of tramos) { const seg = cuerpo.slice(x, y); linea = lineaIni + (cuerpo.slice(0, x).match(/\n/g) || []).length; anotar(seg, i); }
      linea = lineaIni + (cuerpo.match(/\n/g) || []).length;
      i = j + 1; continue;
    }
    i++;
  }
  return { hallazgos, cadenas };
}
/* Declaraciones de nivel superior cuyas cadenas en español NO se traducen, y por qué. Si aparece una nueva acá sin
   razón, el barrido falla: es el punto. */
const P191_EXENTOS_DECL = {
  // ítems canónicos de los tests: se GUARDAN en el CH en un solo idioma y se pintan con tTest() (ver la nota de C2)
  TEST_DEPRESION: 'canónico', TEST_ESCALA: 'canónico', ESTRES_SINTOMAS: 'canónico', ANSIEDAD_SINTOMAS: 'canónico',
  GASTRO_SINTOMAS: 'canónico', CANSANCIO_SINTOMAS: 'canónico', _CO: 'canónico', _EO: 'canónico', _AO: 'canónico', _GO: 'canónico',
  finalizarEstres: 'canónico (FREQ_LABELS al CH)', finalizarAnsiedad: 'canónico', finalizarGastro: 'canónico', finalizarCansancio: 'canónico',
  finalizarKss: 'canónico', finalizarPerelli: 'canónico', finalizarTest: 'canónico', scorePerelli: 'canónico (calidadOpts)',
  perelliAdvanceGrid: 'canónico (GRID_LABELS al CH)', confCalcular: 'canónico (señales al CH)', sexoOpcion: 'valor guardado en el CH',
  TEXTO_NIVELES: 'respaldo canónico, se pinta con tTest', NIVEL_RIESGO: 'respaldo canónico, se pinta con nivelDesc()',
  capturarDispositivo: 'dato (Escritorio/Otro) al CH', IDIOMAS: '«Español» es el endónimo: se muestra igual en todos los idiomas',
  perelliAdvanceMulti: 'canónico («Otros» es la respuesta que se guarda)', misDatosFilas: 'compara el valor guardado (Masculino/Femenino)',
  hseqExportar: 'cabeceras del CSV: dato', CASOS_ODOO_COLUMNAS: 'a Odoo', dashBuildSummary: 'resumen que viaja al endpoint del informe',
  gestEmpresaActual: '«General» es la clave de respaldo del almacén, no un texto', CICLO_FORMAS: '«Perelli» es el id del test',
  splashLangHintPalabra: 'muestra las dos palabras (Idioma ⇄ Language) a propósito', navAltoSincronizar: 'nombre de tecla', _hapticSwitch: 'nombre de tecla', cicloFullTecla: 'nombre de tecla',
  // WhatsApp: EVA lee el texto para saber qué test iniciar; traducirlo dejaría de matchear (nota en seccionesApp)
  seccionesApp: 'mensaje a EVA', buildMessage: 'mensaje a EVA',
  // lo que viaja a Odoo (P13): otro sistema, un solo idioma
  casosOdooMotivo: 'a Odoo', casosOdooDescarte: 'a Odoo (motivo del descarte, no se pinta)', casosOdooValores: 'a Odoo', casosOdooFila: 'a Odoo',
  // datos de ejemplo (demostración): quedan en español en todos los idiomas (fuera de alcance de P191)
  // ⚠️ los DEPARTAMENTOS de la demo son DATO que agrupa con los registros que manda el servidor (en español): no se traducen
  DEMO_GENTE: 'demo', DEMO_ACTIVOS: 'demo', DEMO_NIVELES: 'demo', DEMO_AUSENTE: 'demo', MOCK_DASH: 'demo',   // INFORME_DEMO ya no: P196
  cicloDemo: 'demo', gestSembrarDemo: 'demo', gestSembrarDemoAnotaciones: 'demo', dashReportesDemo: 'demo', nominaDemo: 'demo',
  dashSembrarComentariosDemo: 'demo', dutyDemo: 'demo', turnosDemo: 'demo', EMPRESA_DEMO_NOMBRE: 'demo (centinela)',
  simEntrar: 'demo (Empresa Demo)', portalVerDemo: 'demo (Empresa Demo)', portalVerDemoEmpleado: 'demo (Empresa Demo)',
  demoClaveEnviar: 'demo (Empresa Demo)', dashRequest: 'mock de la demo (Maria Gonzalez)',
  dashScopeTodas: 'centinela del servidor y de gestKey(): es dato; lo visible sale de dashScopeVisible()'
};
const P191_EXENTOS_TEXTO = { 'Escudo 360 · Silva Salud': 'nombre de marca (alt del escudo)' };

function p191Barrido(src){
  const r = barridoLiterales(src);
  const fuera = r.hallazgos.filter(h => !P191_EXENTOS_DECL[h.decl] && !P191_EXENTOS_TEXTO[h.texto]);
  return { total: r.hallazgos.length, cadenas: r.cadenas, fuera: fuera };
}

PRUEBAS.caso('🔴 P191 · barrido de la FUENTE: ningún texto visible en español fuera de t() (salvo los exentos, cada uno con su razón) · con discriminador', async () => {
  const src = await (await fetch('/index.html?v=' + Date.now())).text();
  const r = p191Barrido(src);
  PRUEBAS.cierto(r.cadenas > 10000, 'guarda del instrumento: leyó ' + r.cadenas + ' cadenas (más de 10.000)');
  PRUEBAS.cierto(r.total > 250, 'guarda del instrumento: marcó ' + r.total + ' literales entre exentos y no (más de 250: los tests y la demo)');
  PRUEBAS.igual(r.fuera.length, 0, '🔴 fuera de los exentos: ' + r.fuera.length + (r.fuera.length ? ' → ' + r.fuera.slice(0, 6).map(h => h.linea + ' ' + h.decl + ' «' + h.texto.slice(0, 50) + '»').join(' · ') : ''));
  /* DISCRIMINADOR · un literal inyectado (texto de elemento, y una cadena suelta con tilde) tiene que aparecer */
  const iny = src.replace('</script>\n</body>', "\nfunction p191Inyectada(){ return '<div>Texto inyectado a mano</div>' + 'Otra más, con tilde' + 'Cancelar' + 'Gestiones · '; }\n</script>\n</body>");
  PRUEBAS.cierto(iny !== src, 'guarda: la inyección entró en la fuente');
  const r2 = p191Barrido(iny);
  PRUEBAS.igual(r2.fuera.length, 4, 'DISCRIMINADOR · los cuatro literales inyectados aparecen fuera de los exentos: texto de elemento, tilde, palabra suelta capitalizada, «Palabra · » (' + r2.fuera.map(h => h.decl).join(',') + ')');
  PRUEBAS.cierto(r2.fuera.every(h => h.decl === 'p191Inyectada'), 'y se atribuyen a la declaración que los contiene');
  /* y un literal DENTRO de t() no cuenta */
  const iny2 = src.replace('</script>\n</body>', "\nfunction p191Inyectada2(){ return t('Texto que pasa por t() con tilde'); }\n</script>\n</body>");
  PRUEBAS.igual(p191Barrido(iny2).fuera.length, 0, 'un literal que es argumento de t() no se marca');
});

/* Panel real por `onDashData` (R17), con la red cortada. Devuelve `fin()` para dejar todo como estaba. */
function p191Panel(vista, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage), prevIdioma = idiomaActual();
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const hoy = new Date().toISOString().slice(0, 10), ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: vista, combinada: false, referencia: { kss: 5 }, metricas: ['kss'],
    registros: [{ persona: 'P1', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', fecha: hoy, kss: 8 }],
    aptitud: [], operacional: [], comentarios: [],
    pvt: [{ persona: 'P1', empresa: 'Empresa De Prueba', departamento: 'Operaciones', fecha: hoy, rt_prom: 450, lapsos: 5 },
          { persona: 'P1', empresa: 'Empresa De Prueba', departamento: 'Operaciones', fecha: ayer, rt_prom: 280, lapsos: 0 }],   // dos fechas: así hay gráfico de evolución (y su leyenda)
    turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null, nominaTotal: 1, nominaSinDato: []
  }, extra || {});
  onDashData(payload, 'Empresa De Prueba', { action: 'supervisor', usuario: 'usuario-p191', empresa: 'Empresa De Prueba', pass: 'x', dispositivoId: 'p191' }, vista);
  /* R18 · la red se restaura en fin(), no acá: onDashData dispara pedidos asíncronos y un `.then` que corra después
     de un `finally` sincrónico pegaría al fetch real (verificador) */
  return function fin(){
    window.fetch = oFetch; window.fetchConReloj = oReloj; window.gestPost = oPost; DASH = prevDash; fijarIdioma(prevIdioma);
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  };
}
function p191Texto(html){ const d = document.createElement('div'); d.innerHTML = html; return d.textContent; }

PRUEBAS.caso('🔴 P191 · PVT del panel en inglés por el camino real (onDashData → renderPVT): título, celdas, veredicto y leyenda salen de t()', () => {
  const fin = p191Panel('supervisor');
  try {
    DASH.f.per = 'P1';
    fijarIdioma('en');
    const en = p191Texto(renderPVT());
    ['Tests of P1', 'RT 450 ms', 'Lapses 5', 'Signs of fatigue', 'Over 400 ms · signs of fatigue', 'Avg. RT', 'With fatigue'].forEach(s =>
      PRUEBAS.cierto(en.indexOf(s) >= 0, '🔴 en inglés dice «' + s + '»'));
    ['Tests de', 'Lapsos', 'Signos de fatiga', 'señales de fatiga', 'RT promedio', 'Con fatiga'].forEach(s =>
      PRUEBAS.cierto(en.indexOf(s) < 0, 'y no queda «' + s + '» en español'));
    fijarIdioma('es');
    const es = p191Texto(renderPVT());
    PRUEBAS.cierto(es.indexOf('Tests de P1') >= 0 && es.indexOf('Signos de fatiga') >= 0 && es.indexOf('Lapsos 5') >= 0, 'DISCRIMINADOR · en español sigue en español');
    fijarIdioma('en');
    DASH.pvt = [];
    PRUEBAS.cierto(p191Texto(renderPVT()).indexOf('There are no Reaction Test (PVT) results') >= 0, 'vacío en inglés: «There are no Reaction Test (PVT) results…»');
  } finally { fin(); }
});

PRUEBAS.caso('🔴 P191 · tarjeta de aptitud y ficha del médico en inglés por el camino real (aptGente / dashFichaMedica / telemInfo)', () => {
  const fin = p191Panel('medico');
  try {
    fijarIdioma('en');
    const p = aptGente(dashFiltered())[0];
    PRUEBAS.cierto(!!p && p.nombre === 'P1', 'guarda: aptGente arma a P1 desde los registros');
    PRUEBAS.igual(aptTextoFecha(p), 'last test today', '🔴 «último test hoy» → «last test today»');
    const tarjeta = p191Texto(aptTarjeta(p));
    PRUEBAS.cierto(tarjeta.indexOf('last test today') >= 0 && tarjeta.indexOf('último test') < 0, 'la tarjeta lo pinta en inglés');
    PRUEBAS.igual(telemInfo('realizada').t, 'Telemedicine done', '🔴 TELEM_ESTADOS resuelve por t(): «Telemedicine done»');
    PRUEBAS.igual(telemInfo('sugerida').corto, 'Suggested', 'y el corto');
    DASH.f.per = 'P1';
    const ficha = p191Texto(dashFichaMedica(dashFiltered()) + dashAnotacionSupervisor(dashFiltered(), true, 'P1'));
    ['1 test', 'ref 5', 'This is how the supervisor sees it'].forEach(s => PRUEBAS.cierto(ficha.indexOf(s) >= 0, '🔴 la ficha dice «' + s + '»'));
    PRUEBAS.cierto(ficha.indexOf('Así lo ve el supervisor') < 0, 'y no queda el espejo en español');
    fijarIdioma('es');
    PRUEBAS.igual(aptTextoFecha(p), 'último test hoy', 'DISCRIMINADOR · en español sigue «último test hoy»');
    PRUEBAS.igual(telemInfo('realizada').t, 'Telemedicina realizada', 'DISCRIMINADOR · «Telemedicina realizada»');
    PRUEBAS.cierto(p191Texto(dashAnotacionSupervisor(dashFiltered(), true, 'P1')).indexOf('Así lo ve el supervisor') >= 0, 'DISCRIMINADOR · el espejo en español');
  } finally { fin(); }
});

PRUEBAS.caso('🔴 P191 · «Todas las empresas» sigue siendo el centinela del servidor y de gestKey() en inglés; lo que se PINTA es «All companies»', () => {
  const fin = p191Panel('medico', { rol: 'admin' });
  try {
    fijarIdioma('en');
    DASH.scope = dashScopeTodas();   // lo que ponen los tres logins del admin (autologin, login, visor)
    PRUEBAS.igual(DASH.scope, 'Todas las empresas', '🔴 DASH.scope es el canónico en español (el .gs lo compara literal; gestKey() lo usa de clave)');
    PRUEBAS.igual(dashScopeVisible(DASH.scope), 'All companies', 'y lo visible es «All companies»');
    const kEn = gestKey();
    fijarIdioma('es');
    PRUEBAS.igual(gestKey(), kEn, '🔴 gestKey() es la misma clave en los dos idiomas (antes el visor volvía con «All companies» de scope)');
    PRUEBAS.igual(dashScopeVisible('Empresa De Prueba'), 'Empresa De Prueba', 'una empresa real se pinta tal cual');
    /* la fuente: ningún login del admin pone la etiqueta traducida como scope */
  } finally { fin(); }
});

PRUEBAS.caso('🔴 P191 · login en inglés por el camino real: admEntrar y portalLoginSupervisor con campos vacíos; «Versión N» sigue al idioma', () => {
  const prevIdioma = idiomaActual(), prevLS = Object.assign({}, localStorage);
  const admPass = document.getElementById('admPass'), admErr = document.getElementById('admErr');
  const pEmp = document.getElementById('pEmpresa'), pPass = document.getElementById('pPass'), pErr = document.getElementById('portalErr');
  const vAdm = admPass.value, vEmp = pEmp.value, vPass = pPass.value;
  try {
    localStorage.clear();
    fijarIdioma('en');
    admPass.value = ''; admEntrar(document.createElement('button'));
    PRUEBAS.igual(admErr.textContent, 'Enter the password.', '🔴 admEntrar vacío: «Enter the password.»');
    pEmp.value = ''; pPass.value = ''; portalLoginSupervisor(document.createElement('button'));
    PRUEBAS.igual(pErr.textContent, 'Fill in user and password.', '🔴 portalLoginSupervisor vacío: «Fill in user and password.»');
    PRUEBAS.igual(document.getElementById('verTag').textContent, 'Version ' + APP_VERSION, '🔴 «Versión N» → «Version ' + APP_VERSION + '» al cambiar de idioma (aplicarIdioma repinta)');
    fijarIdioma('es');
    admErr.textContent = ''; admEntrar(document.createElement('button'));
    PRUEBAS.igual(admErr.textContent, 'Ingresa la contraseña.', 'DISCRIMINADOR · en español «Ingresa la contraseña.»');
    PRUEBAS.igual(document.getElementById('verTag').textContent, 'Versión ' + APP_VERSION, 'DISCRIMINADOR · «Versión N»');
  } finally {
    admPass.value = vAdm; pEmp.value = vEmp; pPass.value = vPass; admErr.textContent = ''; pErr.textContent = '';
    fijarIdioma(prevIdioma);
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
  }
});

PRUEBAS.caso('P191 · R13 · el toast y su tilde salen de tokens (--sobre-claro / --sobre-claro-txt / --sobre-claro-ok), iguales en los dos temas', () => {
  const html = document.documentElement, prev = html.getAttribute('data-tema');
  const toast = document.getElementById('toast');
  try {
    ['claro', 'oscuro'].forEach(tema => {
      html.setAttribute('data-tema', tema);
      const cs = getComputedStyle(toast);
      PRUEBAS.igual(cs.backgroundColor, CTX.token('var(--sobre-claro)'), tema + ' · fondo = --sobre-claro');
      PRUEBAS.igual(cs.color, CTX.token('var(--sobre-claro-txt)'), tema + ' · tinta = --sobre-claro-txt');
      PRUEBAS.igual(CTX.token('var(--sobre-claro-ok)'), 'rgb(56, 211, 159)', tema + ' · --sobre-claro-ok existe y vale el verde de siempre');
      PRUEBAS.cierto(CTX.contraste(cs.backgroundColor, cs.color) >= 4.5, tema + ' · contraste del texto ' + CTX.contraste(cs.backgroundColor, cs.color) + ':1');
    });
  } finally { if (prev == null) html.removeAttribute('data-tema'); else html.setAttribute('data-tema', prev); }
});

/* ── Una sola recarga por versión ── */
/* El sw.js corrido en un `self` de mentira, con un `caches` de mentira: así se prueba el contrato sin instalar nada. */
async function p191SwFalso(indexTexto, capturar){
  const src = await (await fetch('/sw.js?v=' + Date.now())).text();
  const oyentes = {}; const pedidos = [];
  const selfFalso = { addEventListener: (k, f) => { oyentes[k] = f; }, skipWaiting: () => Promise.resolve(), clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]) } };
  const cacheFalso = { addAll: reqs => { pedidos.push.apply(pedidos, reqs); return Promise.resolve(); }, match: () => Promise.resolve(indexTexto == null ? undefined : { text: () => Promise.resolve(indexTexto) }) };
  const cachesFalso = { open: () => Promise.resolve(cacheFalso), keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) };
  const swAppVersionDe = new Function('self', 'caches', src + '\n;return swAppVersionDe;')(selfFalso, cachesFalso);
  return { oyentes: oyentes, pedidos: pedidos, swAppVersionDe: swAppVersionDe, src: src };
}

PRUEBAS.caso('🔴 P191 · contrato sw.js ↔ index.html: el worker lee APP_VERSION de la fuente REAL, contesta «version?» por el puerto, e instala con cache:"reload"', async () => {
  const index = await (await fetch('/index.html?v=' + Date.now())).text();
  const sw = await p191SwFalso(index);
  PRUEBAS.igual(sw.swAppVersionDe(index), APP_VERSION, '🔴 la regex del SW encuentra la APP_VERSION real en la fuente (' + APP_VERSION + ')');
  PRUEBAS.igual(sw.swAppVersionDe("const APP_VERSION = '7.10';"), '7.10', 'y una futura 7.10');
  PRUEBAS.igual(sw.swAppVersionDe('sin versión'), null, 'sin versión → null (la app recarga por defecto)');
  PRUEBAS.cierto(typeof sw.oyentes.message === 'function', 'guarda: el SW escucha «message»');
  let contesto = null; let esperado = null;
  const ev = { data: { tipo: 'version?' }, ports: [{ postMessage: m => { contesto = m; } }], waitUntil: p => { esperado = p; } };
  sw.oyentes.message(ev); await esperado;
  PRUEBAS.cierto(!!contesto && contesto.tipo === 'version' && contesto.app === APP_VERSION, '🔴 contesta por el puerto {tipo:"version", app:"' + APP_VERSION + '"} · ' + JSON.stringify(contesto));
  contesto = null; esperado = null;
  sw.oyentes.message({ data: { tipo: 'otra' }, ports: [{ postMessage: m => { contesto = m; } }], waitUntil: p => { esperado = p; } });
  PRUEBAS.igual(contesto, null, 'otro mensaje: no contesta');
  /* install: cada asset con cache:'reload' (el caché HTTP del hosting, max-age=600, ya no puede meter el index viejo) */
  let instalado = null;
  sw.oyentes.install({ waitUntil: p => { instalado = p; } }); await instalado;
  const app = sw.pedidos.filter(r => /\/index\.html$|\/$/.test(r.url)), resto = sw.pedidos.filter(r => !/\/index\.html$|\/$/.test(r.url));
  PRUEBAS.cierto(sw.pedidos.length >= 6 && sw.pedidos.every(r => r instanceof Request), 'guarda: install pide los ' + sw.pedidos.length + ' assets como Request');
  PRUEBAS.cierto(app.length === 2 && app.every(r => r.cache === 'reload'), '🔴 la app (./ e index.html) se pide con cache:"reload" (salta el caché HTTP de max-age=600)');
  PRUEBAS.cierto(resto.length >= 4 && resto.every(r => r.cache === 'default'), 'y los demás assets como antes (default): con señal débil un ícono que no responda no puede tirar el install entero');
  /* caché sin index (worker recién nacido sin nada): contesta null */
  const sw2 = await p191SwFalso(null);
  contesto = null; esperado = null;
  sw2.oyentes.message({ data: { tipo: 'version?' }, ports: [{ postMessage: m => { contesto = m; } }], waitUntil: p => { esperado = p; } }); await esperado;
  PRUEBAS.cierto(!!contesto && contesto.app === null, 'sin index en el caché contesta app:null');
});

/* Un controlador de mentira puesto como propiedad propia de navigator.serviceWorker (tapa el getter del prototipo);
   contesta por el puerto real del MessageChannel. `app === undefined` = no contesta nunca. */
function p191ConControlador(app, paso){
  const sw = navigator.serviceWorker;
  const falso = app === undefined ? { postMessage: () => {} } : { postMessage: (m, ports) => { if (m && m.tipo === 'version?') ports[0].postMessage({ tipo: 'version', app: app }); } };
  Object.defineProperty(sw, 'controller', { value: falso, configurable: true });
  const oAplicar = window.versionAplicar; let aplicadas = 0; window.versionAplicar = () => { aplicadas++; };
  return paso(() => aplicadas).finally(() => { delete sw.controller; window.versionAplicar = oAplicar; });
}

PRUEBAS.caso('🔴 P191 · al cambiar de controlador: misma versión → NO recarga (era la segunda recarga); más vieja → no; más nueva o sin respuesta → versionAplicar()', async () => {
  PRUEBAS.cierto(!!(navigator.serviceWorker), 'guarda: hay serviceWorker en este navegador');
  await p191ConControlador(APP_VERSION, async aplicadas => {
    const r = await versionAlCambiarControlador();
    PRUEBAS.igual(r, 'ya-es-esta', '🔴 el worker nuevo sirve la MISMA versión que la cargada → «ya-es-esta»');
    PRUEBAS.igual(aplicadas(), 0, 'y versionAplicar no corre (antes: recarga incondicional)');
  });
  await p191ConControlador('6.60', async aplicadas => {
    const r = await versionAlCambiarControlador();
    PRUEBAS.igual(r, 'mas-vieja', 'el worker nace con una copia atrasada → «mas-vieja»: no vuelve atrás');
    PRUEBAS.igual(aplicadas(), 0, 'y no recarga');
  });
  await p191ConControlador('99.0', async aplicadas => {
    const r = await versionAlCambiarControlador();
    PRUEBAS.igual(r, 'aplicar', 'DISCRIMINADOR · una versión más nueva → «aplicar»');
    PRUEBAS.igual(aplicadas(), 1, 'y versionAplicar corre una vez');
  });
  await p191ConControlador(undefined, async aplicadas => {
    const r = await versionAlCambiarControlador(40);
    PRUEBAS.igual(r, 'aplicar', 'DISCRIMINADOR · sin respuesta en el tope → «aplicar» (el default es el de antes)');
    PRUEBAS.igual(aplicadas(), 1, 'y versionAplicar corre');
  });
  PRUEBAS.cierto(versionEsMasNueva('6.70', '6.69') && versionEsMasNueva('7.0', '6.99') && !versionEsMasNueva('6.69', '6.69') && !versionEsMasNueva('6.68', '6.69') && !versionEsMasNueva('x', '6.69'), 'versionEsMasNueva: 6.70>6.69, 7.0>6.99, igual no, menor no, basura no');
  /* y el oyente real de controllerchange usa esta decisión (no se puede disparar un controllerchange en la suite) */
  const src = await (await fetch('/index.html?v=' + Date.now())).text();
  const i = src.indexOf("addEventListener('controllerchange'");
  PRUEBAS.cierto(i > 0 && src.slice(i, i + 1600).indexOf('versionAlCambiarControlador()') > 0, 'el oyente de controllerchange llama a versionAlCambiarControlador()');
  PRUEBAS.cierto(src.slice(i, i + 1600).indexOf('versionAplicar();') < 0, 'y ya no llama a versionAplicar() directo');
  /* verificador: el oyente de `message` (version-nueva) tiene que registrarse ANTES de `load`, no adentro — el SW
     manda el aviso a los ~100 ms y `load` puede llegar a 1,5 s con latencia: el mensaje se perdía */
  const bloque = src.slice(src.indexOf("if ('serviceWorker' in navigator)"));
  const iMsg = bloque.indexOf("addEventListener('message'"), iLoad = bloque.indexOf("addEventListener('load'");
  PRUEBAS.cierto(iMsg > 0 && iLoad > 0 && iMsg < iLoad, '🔴 el oyente de «version-nueva» se registra antes del de load (no adentro)');
});
