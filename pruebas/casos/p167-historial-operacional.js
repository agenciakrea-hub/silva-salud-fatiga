PRUEBAS.grupo('P167 · el historial de mis ciclos, y el histórico de EVA en Operacional');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Franco (2026-09-10): «uno no sólo podría ver la data operacional actual y el gráfico, sino ver
   además las viejas datas operacionales… no se entiende cuándo le dio a cada botón en el
   histórico». El inicio mostraba SÓLO el ciclo de hoy. Ahora, debajo, un bloque plegado con un
   ciclo por día: cada botón que tocó y a qué hora, más la duración. Mismo motor que el panel
   (`cicloAgruparTodos`), para que un turno cuente la misma historia en las dos pantallas.
   El histórico viejo (junio–agosto) vivía en otro sheet (las respuestas de EVA) y se importó a
   `Operacional` con `importar_eva`, en la zona horaria del sheet de origen.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p167Con(eventos, fn){
  const oPerfil = localStorage.getItem(K_PROFILE), oSrv = localStorage.getItem(K_CICLO_SRV), oMio = localStorage.getItem(K_CICLO_MIO);
  const oDias = _cicloHistDias;
  /* P169 · las horas se muestran en la zona de la OPERACIÓN (`horaOpDe`). Los ISO de este archivo
     se arman con la hora del DISPOSITIVO (`setHours`), así que acá se quita la zona guardada para
     que las dos coincidan; la zona en sí la mide p169-*.js. */
  const oZona = localStorage.getItem(K_ZONA_OP), oDash = DASH;
  try {
    localStorage.removeItem(K_ZONA_OP); DASH = null; _hopZona = null; _fopZona = null;
    setProfile({ nombre:'Persona De Prueba', cedula:'99999999', empresa:'Empresa Demo', departamento:'Op', cargo:'Piloto',
                 sexo:'F', edad:'30', telefono:'0412', email:'p@e.com', esPiloto:true, id_piloto:'X' });
    localStorage.setItem(K_CICLO_SRV, JSON.stringify(eventos)); localStorage.removeItem(K_CICLO_MIO);
    _cicloHistDias = 0;
    renderSections();              // R17 · el camino real que pinta el inicio
    return fn(document.getElementById('cicHist'));
  } finally {
    if (oPerfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, oPerfil);
    if (oSrv == null) localStorage.removeItem(K_CICLO_SRV); else localStorage.setItem(K_CICLO_SRV, oSrv);
    if (oMio == null) localStorage.removeItem(K_CICLO_MIO); else localStorage.setItem(K_CICLO_MIO, oMio);
    if (oZona == null) localStorage.removeItem(K_ZONA_OP); else localStorage.setItem(K_ZONA_OP, oZona);
    DASH = oDash; _hopZona = null; _fopZona = null;
    _cicloHistDias = oDias;
    try { renderSections(); } catch (e) {}
  }
}
const p167Iso = (diasAtras, h, m) => { const d = new Date(); d.setDate(d.getDate() - diasAtras); d.setHours(h, m, 0, 0); return d.toISOString(); };
const P167_DOS_DIAS = [
  { evento:'salida_casa', iso:p167Iso(2, 6, 10) }, { evento:'llegada_aero', iso:p167Iso(2, 7, 5) },
  { evento:'salida_aero', iso:p167Iso(2, 15, 40) }, { evento:'llegada_casa', iso:p167Iso(2, 16, 30) },
  { evento:'salida_casa', iso:p167Iso(1, 5, 50) }, { evento:'llegada_aero', iso:p167Iso(1, 6, 45) },
];

PRUEBAS.caso('🔴 el inicio muestra el historial: un ciclo por día, cada botón con su hora', () => {
  p167Con(P167_DOS_DIAS, det => {
    PRUEBAS.cierto(!!det, '🔴 el bloque existe en la sección operacional');
    PRUEBAS.falso(det.open, 'y arranca PLEGADO (R6): abierto taparía los botones de hoy');
    const dias = [...det.querySelectorAll('.cic-hist-dia')];
    PRUEBAS.igual(dias.length, 2, 'dos días, dos ciclos');
    const evs = dias.map(x => [...x.querySelectorAll('.cic-hist-ev')].length);
    PRUEBAS.igual(evs, [2, 4], '⚠️ el más reciente ARRIBA (2 botones), el completo abajo (4)');
    const horas = [...dias[1].querySelectorAll('.cic-hist-h')].map(h => h.textContent);
    PRUEBAS.igual(horas, ['06:10', '07:05', '15:40', '16:30'], '🔴 cada botón con la hora en que se tocó, en el orden del ciclo');
    PRUEBAS.cierto(/10 h 20 min/.test(dias[1].textContent), 'y la duración del ciclo completo');
    PRUEBAS.falso(!!dias[0].querySelector('.cic-hist-dur'), 'el ciclo a medias no tiene duración: no se inventa');
    PRUEBAS.cierto(/\(2\)/.test(det.querySelector('.cic-hist-sum').textContent), 'el título cuenta los ciclos');
  });
});

PRUEBAS.caso('⚠️ las etiquetas salen de t() por sector, no escritas a mano (R14)', () => {
  p167Con(P167_DOS_DIAS, det => {
    const ks = [...det.querySelectorAll('.cic-hist-k')].map(k => k.textContent);
    const esperadas = cicloEventos().map(e => t(e.lbl));
    PRUEBAS.igual(ks.slice(2), esperadas, '⚠️ los cuatro rótulos son EXACTAMENTE los del ciclo de la app');
  });
});

PRUEBAS.caso('⚠️ sin ciclos, el bloque lo dice en vez de quedar vacío', () => {
  p167Con([], det => {
    PRUEBAS.cierto(!!det, 'el bloque está igual');
    PRUEBAS.igual(det.querySelectorAll('.cic-hist-dia').length, 0, 'sin tarjetas');
    PRUEBAS.cierto([...det.querySelectorAll('.cic-hist-lead')].some(x => x.textContent === t('cic_hist_vacio')), 'con el texto de vacío');
  });
});

PRUEBAS.caso('🔴 «Ver todo el historial» pide el año al servidor · por el camino real', () => {
  /* R17 · se espía la URL que sale: `misSincronizar(400)` tiene que mandar `dias=400`. */
  const oFetch = window.fetch;
  let url = '';
  window.fetch = function (u) { url = String(u); return Promise.resolve({ json: () => Promise.resolve({ ok:true, registros:[], pvt:[], operacional:[] }) }); };
  try {
    return p167Con(P167_DOS_DIAS, det => {
      const btn = det.querySelector('.cic-hist-mas');
      PRUEBAS.cierto(!!btn, 'el botón está mientras no se pidió todo');
      _misSincronizando = false;   // otro caso puede haberlo dejado en vuelo: acá se mide el pedido, no la carrera
      cicloMiHistorialTodo(btn);
      return new Promise(r => setTimeout(r, 60)).then(() => {
        PRUEBAS.cierto(/action=empleado/.test(url), 'pide `empleado`');
        PRUEBAS.cierto(/dias=400/.test(url), '🔴 con dias=400 · el arranque sigue trayendo 30');
      });
    });
  } finally { window.fetch = oFetch; }
});

PRUEBAS.caso('⚠️ el arranque NO manda `dias`: sigue trayendo 30 como siempre', () => {
  const oFetch = window.fetch; let url = '';
  window.fetch = function (u) { url = String(u); return Promise.resolve({ json: () => Promise.resolve({ ok:false }) }); };
  const oPerfil = localStorage.getItem(K_PROFILE);
  try {
    setProfile({ nombre:'Persona De Prueba', cedula:'99999999', empresa:'Empresa Demo' });
    _misSincronizando = false;
    return misSincronizar().then(() => {
      PRUEBAS.cierto(/action=empleado/.test(url), 'guarda: salió el pedido');
      PRUEBAS.falso(/dias=/.test(url), '⚠️ sin `dias`: el servidor aplica su 30 de siempre');
    });
  } finally {
    window.fetch = oFetch;
    if (oPerfil == null) localStorage.removeItem(K_PROFILE); else localStorage.setItem(K_PROFILE, oPerfil);
  }
});

PRUEBAS.caso('⚠️ CSS sin color a mano (R13) y textos en los dos idiomas (R14)', () => {
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const bloque = css.slice(css.indexOf('.cic-hist {'), css.indexOf('.cic-hist-mas {') + 300);
  PRUEBAS.cierto(bloque.length > 200, 'guarda: se leyó el CSS');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(bloque), '⚠️ ni un color a mano');
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      ['cic_hist_titulo','cic_hist_lead','cic_hist_vacio','cic_hist_hoy','cic_hist_dur','cic_hist_todo'].forEach(k =>
        PRUEBAS.cierto(t(k, { n:1, h:1, m:2 }) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});

/* ── el servidor ─────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ `empleado` acepta `dias` con tope, y sin él sigue en 30 · sobre la fuente', () => {
  const gs = CTX.gs;
  const i = gs.indexOf('function accionEmpleado(');
  const fin = gs.indexOf('\n}', i);
  const cuerpo = gs.slice(i, fin > 0 ? fin + 2 : i + 6000);
  PRUEBAS.cierto(/Number\(p\.dias\)/.test(cuerpo), 'lee `p.dias`');
  PRUEBAS.cierto(/Math\.min\(400/.test(cuerpo), '⚠️ con tope 400: nadie pide diez años de hoja');
  PRUEBAS.cierto(/\|\| 30/.test(cuerpo), 'y 30 por defecto');
  PRUEBAS.falso(/leerOperacional\(30\)/.test(cuerpo), 'el 30 fijo ya no está escrito a mano');
});
