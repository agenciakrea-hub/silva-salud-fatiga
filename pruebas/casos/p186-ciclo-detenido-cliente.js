PRUEBAS.grupo('P186 · el ciclo que se detiene solo a las 24 h · cliente');

/* La queja, textual: «queda un marcador que dice 200 horas de tal etapa, y no sé cómo apagarlo».
   Se entra por el camino real: los eventos como los deja el servidor en `K_CICLO_SRV`,
   `cicloAgruparEventos` → `cicloEstado` → la tarjeta del piloto (`cicloMiBloque`), y Jornada por
   `onDashData`. `localStorage` y `DASH` se restauran en cada caso (R18). */

const P186C_AHORA = Date.now();
const p186cHace = h => new Date(P186C_AHORA - h * 3600000).toISOString();
const p186cEv = (evento, iso) => ({ evento, iso, persona: 'Yo', departamento: 'Operaciones', empresa: 'Consorcio HELITEC' });
function p186cCiclo(eventos){ return cicloAgruparEventos(eventos, cicloTotalMin(cicloPlan('')) * 60000); }
function p186cConLocal(fn){
  const prev = Object.assign({}, localStorage);
  try { return fn(); }
  finally { try { localStorage.clear(); Object.keys(prev).forEach(k => localStorage.setItem(k, prev[k])); } catch(e){} }
}

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · la regla existe y es 24, en las dos capas', () => {
  PRUEBAS.igual(CICLO_DETENIDO_HORAS, 24, 'el cliente dice 24');
  PRUEBAS.igual(typeof cicloDetenidoEn, 'function', 'la regla está en una función');
  if (CTX.hayGs) PRUEBAS.cierto(/var CICLO_DETENIDO_HORAS = 24;/.test(CTX.gs || ''), 'y el servidor dice 24 (la constante viaja en la fuente)');
});

PRUEBAS.caso('🔴 sin registro, a las 25 h en la misma fase el ciclo está DETENIDO y nada dice «de más»', () => {
  const c = p186cCiclo([p186cEv('salida_casa', p186cHace(26)), p186cEv('llegada_aero', p186cHace(25))]);
  const st = cicloEstado(c, P186C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'detenido', '⚠️ detenido');
  PRUEBAS.igual(st.detenidoEn, new Date(p186cHace(25)).getTime() + 24 * 3600000, 'en el instante exacto: último evento + 24 h');
  PRUEBAS.falso(st.detenidoRegistrado, 'derivado, sin registro del servidor');
  const jor = st.tramos.find(t => t.k === 'jornada');
  PRUEBAS.cierto(!!jor && jor.estado === 'detenido' && jor.excedido === false && jor.delta === null, 'el tramo que estaba abierto queda detenido, sin exceso');
  PRUEBAS.igual(jor && jor.real, 0, 'y no aporta duración: «deja de contar», no se sabe cuánto duró');
  PRUEBAS.falso(st.huboExceso, 'huboExceso es false: detenido no es excedido');
  PRUEBAS.igual(st.activo, st.tramos.indexOf(jor), 'la aguja de la barra apunta al tramo detenido');
});

PRUEBAS.caso('DISCRIMINADOR · a las 23 h sigue en curso y excedido, como siempre', () => {
  const c = p186cCiclo([p186cEv('salida_casa', p186cHace(24)), p186cEv('llegada_aero', p186cHace(23))]);
  const st = cicloEstado(c, P186C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'excedido', 'excedido (la jornada prevista son 12 h y lleva 23)');
  PRUEBAS.igual(st.detenidoEn, null, 'sin instante de detención');
  PRUEBAS.cierto(st.huboExceso, 'y sí hubo exceso');
});

PRUEBAS.caso('un ciclo COMPLETO no se detiene aunque sea viejo, y uno en descanso tampoco', () => {
  const c = p186cCiclo([p186cEv('salida_casa', p186cHace(40)), p186cEv('llegada_aero', p186cHace(39)),
                        p186cEv('salida_aero', p186cHace(30)), p186cEv('llegada_casa', p186cHace(29))]);
  const st = cicloEstado(c, P186C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'completo', 'completo: llegó a casa hace 29 h, el descanso (10 h) ya se cumplió');
  const c2 = p186cCiclo([p186cEv('salida_casa', p186cHace(15)), p186cEv('llegada_aero', p186cHace(14)),
                         p186cEv('salida_aero', p186cHace(3)), p186cEv('llegada_casa', p186cHace(2))]);
  PRUEBAS.igual(cicloEstado(c2, P186C_AHORA, cicloPlan('')).estado, 'descanso', 'llegó a casa hace 2 h: en descanso, no detenido');
});

PRUEBAS.caso('🔴 con el registro del servidor, el instante es EL DEL REGISTRO y el estado dice que está registrado', () => {
  const isoDet = new Date(new Date(p186cHace(30)).getTime() + 1000).toISOString();   // el servidor lo escribe en ancla + 1 s
  const c = p186cCiclo([p186cEv('salida_casa', p186cHace(31)), p186cEv('llegada_aero', p186cHace(30)), p186cEv('detenido', isoDet)]);
  const st = cicloEstado(c, P186C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'detenido', 'detenido');
  PRUEBAS.cierto(st.detenidoRegistrado, '⚠️ registrado');
  PRUEBAS.igual(st.detenidoEn, new Date(p186cHace(30)).getTime() + 24 * 3600000, 'el instante es SIEMPRE ancla + 24 h: el registro confirma el hecho, no mueve la regla');
  /* y con registro, no depende de «ahora»: un reloj atrasado en el teléfono no lo «des-detiene» */
  PRUEBAS.igual(cicloEstado(c, new Date(p186cHace(29)).getTime(), cicloPlan('')).estado, 'detenido', 'registrado = hecho, aunque «ahora» sea antes de las 24 h');
});

PRUEBAS.caso('🔴 CONTRATO · el instante que deriva el cliente es el ISO que escribe el servidor, para los mismos eventos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const iso1 = p186cHace(26), iso2 = p186cHace(25);
  const hoja = [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [iso1.substring(0, 10), iso1.substring(11, 16), iso1, 'op1', 'Yo', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'salida_casa', '', '', ''],
    [iso2.substring(0, 10), iso2.substring(11, 16), iso2, 'op2', 'Yo', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'llegada_aero', '', '', '']];
  const env = GS.crearEntorno({ 'Operacional': hoja, 'Bitácora': [['ID']], 'Accesos': [['Usuario', 'Contraseña', 'Rol', 'EMPRESAS', 'Contraseña Médica', 'Contraseña HSQ']],
                                'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo']], 'Config Empresa': [['Empresa', 'Clave', 'Valor']] });
  const api = GS.cargarGs(CTX.gs, env, ['cicloDetenerVencidos']);
  const r = api.cicloDetenerVencidos(true, P186C_AHORA, P186C_AHORA - 10 * 86400000);
  PRUEBAS.igual(r.detenidos, 1, 'guarda: el servidor detendría este ciclo');
  const stCliente = cicloEstado(p186cCiclo([p186cEv('salida_casa', iso1), p186cEv('llegada_aero', iso2)]), P186C_AHORA, cicloPlan(''));
  PRUEBAS.igual(new Date(r.filas[0].en).getTime(), stCliente.detenidoEn, '⚠️ el mismo instante, al milisegundo');
});

PRUEBAS.caso('un evento después del detenido abre un ciclo NUEVO en el teléfono también (misma regla que el servidor)', () => {
  const isoDet = new Date(new Date(p186cHace(30)).getTime() + 1000).toISOString();
  const evs = [p186cEv('salida_casa', p186cHace(31)), p186cEv('llegada_aero', p186cHace(30)), p186cEv('detenido', isoDet), p186cEv('salida_casa', p186cHace(1))];
  const actual = p186cCiclo(evs);
  PRUEBAS.igual(Object.keys(actual.ev), ['salida_casa'], 'el ciclo actual es el nuevo, limpio');
  const todos = cicloAgruparTodos(evs, cicloTotalMin(cicloPlan('')) * 60000);
  PRUEBAS.igual(todos.length, 2, 'y el histórico tiene los dos');
  /* y si el evento nuevo cae DENTRO de la ventana pero después del detenido, también corta */
  const evs2 = [p186cEv('salida_casa', p186cHace(31)), p186cEv('detenido', new Date(new Date(p186cHace(31)).getTime() + 1000).toISOString()), p186cEv('llegada_aero', p186cHace(1))];
  PRUEBAS.igual(Object.keys(p186cCiclo(evs2).ev), ['llegada_aero'], 'aunque el siguiente no sea el evento inicial: lo que viene tras un detenido es otro ciclo');
});

PRUEBAS.caso('🔴 la tarjeta del piloto: con un ciclo detenido dice «se detuvo», sin «de más», y avisa UNA vez', () => {
  const origToast = window.showToast; const toasts = [];
  window.showToast = m => { toasts.push(String(m)); };
  const prevDash = DASH;
  try {
    p186cConLocal(() => {
      setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(26)), p186cEv('llegada_aero', p186cHace(25))]));
      localStorage.removeItem(K_CICLO_MIO);
      localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
      const html1 = cicloMiBloque();
      PRUEBAS.cierto(/cic-chip-detenido/.test(html1), 'el chip dice detenido');
      PRUEBAS.cierto(/cic-mio-detenido/.test(html1) && /se detuvo a las 24 h/.test(html1), 'y el texto explica por qué');
      PRUEBAS.falso(/Quedó registrado/.test(html1), 'sin registro del servidor NO dice «quedó registrado» (sería falso)');
      PRUEBAS.cierto(/«Saliendo de casa»/.test(html1), 'y el botón que nombra sale de t(), no escrito a mano');
      PRUEBAS.falso(new RegExp(t('cic_de_mas_suf')).test(html1) || /cic-chip-excedido/.test(html1), '⚠️ nada de «de más» ni rojo: era el marcador de 200 horas');
      PRUEBAS.falso(/data-cic-from=|data-cic-needle/.test(html1.split('cic-mio-linea')[1] || ''), 'y nada corre: ni reloj ni aguja en un ciclo detenido');
      /* con registro, sí lo dice */
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(26)), p186cEv('llegada_aero', p186cHace(25)),
        p186cEv('detenido', new Date(new Date(p186cHace(25)).getTime() + 1000).toISOString())]));
      PRUEBAS.cierto(/Quedó registrado/.test(cicloMiBloque()), 'con el registro del servidor sí dice «quedó registrado»');
    });
  } finally { window.showToast = origToast; DASH = prevDash; }
});

PRUEBAS.caso('🔴 el aviso: sale UNA vez, diferido, y también cuando el detenido es el ciclo ANTERIOR (ya salí de nuevo)', () => {
  /* El caso que motivó el prompt: olvidé llegar a casa anoche y hoy ya toqué «Saliendo de casa».
     El vigente es el de hoy; el detenido es el anterior. Mirando sólo el último, no se avisaba nunca. */
  const origToast = window.showToast; const toasts = [];
  window.showToast = m => { toasts.push(String(m)); };
  const prevDash = DASH;
  /* `conOculto(false)`: el aviso no sale con la app oculta —a propósito— y la pestaña de la suite
     siempre lo está (LEEME). Se miente `document.hidden` para probar el camino que la persona ve. */
  return PRUEBAS.conOculto(false, async () => {
    try {
      const prevLS = Object.assign({}, localStorage);
      try {
        setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
        localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(38)), p186cEv('llegada_aero', p186cHace(37)), p186cEv('salida_aero', p186cHace(25)),
                                                          p186cEv('salida_casa', p186cHace(0.5))]));
        localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
        PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'curso', 'guarda: el ciclo vigente es el de hoy, en curso');
        cicloDetenidoRevisar();
        PRUEBAS.igual(toasts.length, 0, 'no sale en el acto: es diferido');
        /* 6 s y no 3: el diferido es de 1,5 s, pero con la pestaña oculta los timers se estrangulan y la
           corrida completa con dos pestañas cargadas lo pasó de 3 s una vez (2026-09-16, rojo de entorno). */
        await PRUEBAS.esperarA(() => toasts.length > 0, 6000);
        PRUEBAS.igual(toasts.filter(x => /24 h/.test(x)).length, 1, '⚠️ avisa del ciclo ANTERIOR, una vez');
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => false, 1800);
        PRUEBAS.igual(toasts.filter(x => /24 h/.test(x)).length, 1, 'y no lo repite');
        /* discriminador: sin ningún detenido, nada */
        localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(0.5))]));
        localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => false, 1800);
        PRUEBAS.igual(toasts.filter(x => /24 h/.test(x)).length, 1, 'un ciclo de media hora no avisa');
      } finally { try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
    } finally { window.showToast = origToast; DASH = prevDash; clearTimeout(_cicDetRevisarT); }
  });
});

PRUEBAS.caso('los mapas de etiquetas y de orden cubren TODOS los estados que cicloEstado puede devolver (análisis estático, a propósito)', () => {
  /* Un estado que falte no rompe: da `undefined` en el chip y `NaN` en el orden, sin excepción.
     Por eso se mira la FORMA del código: cada `const ETIQ = {` y el `ORD`/`n` tienen las seis. */
  const src = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  const estados = ['inactivo', 'curso', 'excedido', 'descanso', 'completo', 'detenido'];
  const mapas = src.match(/const ETIQ = \{[\s\S]*?\};/g) || [];
  PRUEBAS.igual(mapas.length, 3, 'guarda: hay tres ETIQ (piloto, supervisor, pantalla completa)');
  mapas.forEach((m, i) => estados.forEach(e => PRUEBAS.cierto(new RegExp('\\b' + e + ':').test(m), 'ETIQ #' + (i + 1) + ' tiene «' + e + '»')));
  const ord = (src.match(/const ORD = \{[^}]*\}/) || [''])[0], n = (src.match(/const n = \{ curso:0[^}]*\}/) || [''])[0];
  estados.forEach(e => { PRUEBAS.cierto(new RegExp('\\b' + e + ':').test(ord), 'ORD tiene «' + e + '»'); PRUEBAS.cierto(new RegExp('\\b' + e + ':').test(n), 'n{} tiene «' + e + '»'); });
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  ['cic-chip-detenido', 'cic-est-detenido', 'jor-chip-detenido'].forEach(c => PRUEBAS.cierto(new RegExp('\\.' + c + ' \\{').test(css), 'CSS ' + c));
});

PRUEBAS.caso('🔴 Jornada por onDashData: una jornada detenida lleva su chip y no cuenta como abierta ni como exceso', () => {
  const prevDash = DASH;
  try {
    onDashData({ ok: true, rol: 'supervisor', vista: 'hseq', referencia: {}, metricas: [],
      registros: [{ persona: 'P1', empresa: 'Consorcio HELITEC', departamento: 'Op', cargo: 'Piloto', fecha: todayStr() }],
      comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [], config: {}, marca: null, ausencias: {},
      duty: { dias: 7, sinUmbralCongelado: 0, personas: [{ persona: 'P1', empresa: 'Consorcio HELITEC', dias: 1, jornadaMin: 1440, excesoMin: 0, diasConExceso: 0, umbralCongelado: true, promedioJornadaMin: 1440, promedioExcesoMin: 0 }], historico: [],
        diario: [{ persona: 'P1', empresa: 'Consorcio HELITEC', departamento: 'Op', fecha: todayStr(), jornadaMin: 1440, previstoMin: 720, excesoMin: 0,
                   abierto: false, detenido: true, detenidoEn: 'jornada', umbralCongelado: true, tramos: [],
                   eventos: [{ evento: 'llegada_aero', iso: p186cHace(30) }, { evento: 'detenido', iso: p186cHace(6) }] }] }
    }, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'x', dispositivoId: 'p186' }, 'hseq');
    const html = renderJornada();
    PRUEBAS.cierto(/jor-chip-detenido/.test(html), '⚠️ el chip «detenido» está');
    PRUEBAS.falso(new RegExp('>' + t('jor_abierto') + '<').test(html), 'y no el de «en curso»');
    PRUEBAS.cierto(/Se detuvo a las 24 h|Stopped at 24 h/.test(html), 'el evento del timeline se muestra traducido, no como la clave cruda');
    PRUEBAS.falso(/\bdetenido\b(?![^<]*<\/span>)/.test(html.replace(/jor-chip-detenido|cic-chip-detenido/g, '')), 'y la clave «detenido» no aparece suelta en el HTML');
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('R14 · textos en los dos idiomas · R1 · sin voseo', () => {
  const claves = ['cic_e_detenido', 'op_detenido', 'jor_detenido', 'cic_mio_detenido', 'cic_mio_detenido_corto', 'ts_ciclo_detenido',
                  'notif_det_titulo', 'notif_det_detalle', 'notif_entendido', 'tar_lead', 'cic_de_hoy', 'cic_de_ayer', 'cic_del_dia', 'notif_de'];   // P186c
  const faltan = [];
  ['es', 'en'].forEach(i => claves.forEach(k => { const v = _i18nBuscar(i, SECTOR_FALLBACK, k); if (!v || v === k) faltan.push(i + ':' + k); }));
  PRUEBAS.igual(faltan, [], 'sin claves faltantes');
  const es = claves.map(k => _i18nBuscar('es', SECTOR_FALLBACK, k)).join(' ') + _i18nBuscar('es', SECTOR_FALLBACK, 'cic_ayuda');
  PRUEBAS.falso(/\b(vos|tenés|podés|querés|tocá|volvé|empezá)\b/i.test(es), 'español neutro');
  PRUEBAS.cierto(/24 h/.test(_i18nBuscar('es', SECTOR_FALLBACK, 'cic_ayuda')), 'la guía ⓘ del panel explica el detenido');
});

PRUEBAS.caso('R12 · la tarjeta del piloto con el texto de detenido entra a 375 sin desbordar', () => {
  const prevDash = DASH;
  try {
    p186cConLocal(() => {
      setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(26)), p186cEv('llegada_aero', p186cHace(25))]));
      localStorage.setItem(K_CICLO_DETENIDO_VISTO, JSON.stringify([new Date(p186cHace(26)).getTime()]));
      PRUEBAS.enVentana(375, 812, () => {
        const cont = document.createElement('div'); cont.style.cssText = 'position:absolute;left:0;top:0;width:375px';
        cont.innerHTML = cicloMiBloque(); document.body.appendChild(cont);
        try {
          const nota = cont.querySelector('.cic-mio-detenido');
          PRUEBAS.cierto(!!nota, 'guarda: la nota está');
          if (nota){ const r = nota.getBoundingClientRect(); PRUEBAS.cierto(r.width > 0 && r.right <= 376, 'entra en 375 (' + Math.round(r.right) + ')'); }
        } finally { cont.remove(); }
      });
    });
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('🔴 en un ciclo detenido NADA corre: ni la tarjeta del supervisor ni los tramos tienen reloj vivo', () => {
  /* Con datos reales, la tarjeta de «Franco Prueba» decía «Detenido a las 24 h» en el chip y
     «Traslado: 93 h 26 min 21 s» al lado: el `data-cic-from` del tramo seguía corriendo. */
  const prevDash = DASH;
  try {
    onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: [],
      registros: [{ persona: 'Franco Prueba', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: todayStr() }],
      comentarios: [], pvt: [], aptitud: [], config: {}, marca: null, ausencias: {}, duty: null, turnos: [],
      operacional: [{ persona: 'Franco Prueba', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', evento: 'salida_casa', iso: p186cHace(93), fecha: p186cHace(93).substring(0, 10), test: '', resultado: '', plan: '' }],
      operacionalPeriodo: { dias: 7 }
    }, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'x', dispositivoId: 'p186' }, 'supervisor');
    const html = renderCicloOperativo();
    const card = (html.match(/<div class="cic-card cic-est-detenido[\s\S]*?<\/div>\s*<\/div>/) || [html])[0];
    PRUEBAS.cierto(/cic-est-detenido/.test(html), 'guarda: la tarjeta está detenida');
    const cont = document.createElement('div'); cont.innerHTML = html;
    const tarj = cont.querySelector('.cic-card.cic-est-detenido');
    PRUEBAS.cierto(!!tarj, 'guarda: la tarjeta se pintó');
    PRUEBAS.igual(tarj ? tarj.querySelectorAll('[data-cic-from]').length : -1, 0, '⚠️ cero relojes vivos en la tarjeta detenida');
    PRUEBAS.cierto(tarj && !/93 h/.test(tarj.textContent) && /Se detuvo a las 24 h/.test(tarj.textContent), 'y el traslado no dice 93 h: dice que se detuvo');
    PRUEBAS.falso(tarj && /data-cic-needle/.test(tarj.innerHTML), 'ni la aguja «ahora» se dibuja');
    PRUEBAS.cierto(/cic-kpi-det/.test(html) && /<b>1<\/b> detenidos/.test(html), 'y el resumen cuenta 1 detenido (antes la suma de los KPI no daba)');
    PRUEBAS.cierto(tarj && /Se detuvo a las 24 h sin el paso siguiente/.test(tarj.textContent), 'con el detalle del tramo');
    PRUEBAS.cierto(tarj && !!tarj.querySelector('.cic-tr-detenido'), 'y el tramo lleva su clase (ámbar)');
    const exc = cont.querySelectorAll('.cic-est-excedido, .cic-chip-excedido').length;
    PRUEBAS.igual(exc, 0, 'nada en rojo');
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('🔴 la tarjeta del supervisor de un ciclo detenido NO muestra el total del ciclo (y la de uno en curso sí)', () => {
  /* En producción, los dos primeros detenidos reales tenían un solo evento y el resumen decía
     «Traslado: Se detuvo a las 24 h sin el paso siguiente · ciclo 0 min». Era lo registrado de
     verdad (ADR 008: `transcurrido` llega hasta el ancla), pero se leía como un error. Franco
     eligió sacarlo. Se mide el texto que ve el supervisor, entrando por `onDashData`, con dos
     personas en el mismo pedido: una detenida y una en curso, que es el discriminador. */
  const prevDash = DASH;
  try {
    const base = { empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' };
    onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: [],
      registros: [{ persona: 'Olvido Solo', fecha: todayStr(), ...base }, { persona: 'En Curso', fecha: todayStr(), ...base }],
      comentarios: [], pvt: [], aptitud: [], config: {}, marca: null, ausencias: {}, duty: null, turnos: [],
      operacional: [
        { persona: 'Olvido Solo', evento: 'salida_casa', iso: p186cHace(30), fecha: p186cHace(30).substring(0, 10), test: '', resultado: '', plan: '', ...base },
        { persona: 'En Curso', evento: 'salida_casa', iso: p186cHace(0.5), fecha: p186cHace(0.5).substring(0, 10), test: '', resultado: '', plan: '', ...base }
      ],
      operacionalPeriodo: { dias: 7 }
    }, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'x', dispositivoId: 'p186' }, 'supervisor');
    const cont = document.createElement('div'); cont.innerHTML = renderCicloOperativo();
    const det = cont.querySelector('.cic-card.cic-est-detenido');
    const curso = [...cont.querySelectorAll('.cic-card')].find(c => !c.classList.contains('cic-est-detenido') && !c.classList.contains('cic-est-inactivo'));
    PRUEBAS.cierto(!!det && !!curso, 'guarda: hay una tarjeta detenida y una en curso');
    const rDet = det && det.querySelector('.cic-reloj'), rCur = curso && curso.querySelector('.cic-reloj');
    PRUEBAS.cierto(!!rDet && !!rCur, 'guarda: las dos tienen su línea de resumen');
    const lbl = t('cic_ciclo_lbl');
    PRUEBAS.cierto(rDet && /Se detuvo a las 24 h sin el paso siguiente/.test(rDet.textContent), 'la detenida dice que se detuvo');
    PRUEBAS.falso(rDet && new RegExp('\\b' + lbl + '\\b').test(rDet.textContent), '⚠️ y NO lleva «' + lbl + ' …»: un total que no se sabe no se muestra');
    PRUEBAS.falso(rDet && /0 min/.test(rDet.textContent), 'ni «0 min» en ningún lado del resumen');
    PRUEBAS.cierto(rCur && new RegExp('\\b' + lbl + '\\b').test(rCur.textContent), 'DISCRIMINADOR · la que está en curso sí lleva «' + lbl + ' …» con su reloj');
    PRUEBAS.cierto(rCur && rCur.querySelectorAll('[data-cic-from]').length === 2, 'y sus dos relojes vivos siguen ahí');
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('🔴 P186c · el aviso también queda en «Tus tareas»: entrada del sistema, globito, «Entendido», y se borra al cerrar sesión', () => {
  /* Franco, al ver el toast: «que el aviso lo ponga en notificaciones, en el apartado del botón al
     lado de los datos personales». Se entra por el camino real: el ciclo como lo deja el servidor
     en `K_CICLO_SRV` → `cicloDetenidoRevisar()` (diferido, con la app visible) → el almacén local →
     `tareasPintarBadge()` y `tareasPintar()`, que son lo que la persona ve. */
  const origToast = window.showToast; const toasts = [];
  window.showToast = m => { toasts.push(String(m)); };
  /* ⚠️ Las esperas son por una CONDICIÓN OBSERVABLE, no por tiempo: con la pestaña oculta Chrome
     estrangula los timers y una espera de 1,8 s puede volver antes de que el `setTimeout(1500)` de
     `cicloDetenidoRevisar` haya corrido — y entonces «no duplica» y «no deja aviso» pasarían sin que
     el código hubiera corrido (la deuda que P182 sacó de siete casos). Se espía `cicloAgruparTodos`,
     que corre adentro del timer: cada revisión lo llama una vez. */
  const origAgrupar = window.cicloAgruparTodos; let revisiones = 0;
  window.cicloAgruparTodos = function(){ revisiones++; return origAgrupar.apply(this, arguments); };
  const prevDash = DASH, prevLista = TAREAS.lista, prevPend = TAREAS.pendientes;
  return PRUEBAS.conOculto(false, async () => {
    try {
      const prevLS = Object.assign({}, localStorage);
      try {
        setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
        TAREAS.lista = []; TAREAS.pendientes = 0;
        localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(26)), p186cEv('llegada_aero', p186cHace(25.5))]));
        localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_CICLO_DETENIDO_VISTO); localStorage.removeItem(K_NOTIF_LOCAL);
        const t0 = cicloEstado(cicloMio(), Date.now(), cicloPlan('')).inicio;
        PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'detenido', 'guarda: el ciclo está detenido');
        PRUEBAS.igual(notifLocalItems().length, 0, 'guarda: la lista de avisos arranca vacía');
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => revisiones >= 1 && toasts.length > 0, 6000);   // 6 s, ver abajo
        PRUEBAS.igual(revisiones, 1, 'guarda: la revisión diferida corrió una vez');
        const lista = notifLocalLeer();
        PRUEBAS.igual(lista.length, 1, '⚠️ queda UNA entrada en el almacén local');
        PRUEBAS.igual(lista[0] && lista[0].id, 'det_' + t0, 'con el inicio del ciclo como id (el mismo que usa la marca del toast)');
        PRUEBAS.igual(lista[0] && lista[0].estado, 'sin_leer', 'sin leer');
        const badge = document.getElementById('tareasBadge');
        tareasPintarBadge();
        PRUEBAS.cierto(badge && badge.textContent === '1' && badge.style.display !== 'none', 'el globito del inicio dice 1 aunque el servidor no tenga tareas');
        tareasPintar();
        const cont = document.getElementById('tareasLista');
        const item = cont.querySelector('.tar-item');
        PRUEBAS.cierto(!!item, 'guarda: se pintó una tarjeta en «Tus tareas»');
        PRUEBAS.cierto(item && !!item.querySelector('.tar-org-sistema'), 'con el rótulo del sistema');
        PRUEBAS.cierto(item && item.textContent.indexOf(cicloFechaDe(t0) + ' se detuvo a las 24 h') >= 0, 'el título dice la fecha del ciclo, con su preposición, y las 24 h');
        PRUEBAS.cierto(item && item.textContent.indexOf(cicloEventoLabel(cicloEventoInicial())) >= 0, 'y el detalle nombra el primer botón del ciclo');
        const btn = item && item.querySelector('.tar-btn');
        PRUEBAS.cierto(btn && btn.textContent === t('notif_entendido') && /notifLocalHecha/.test(btn.getAttribute('onclick') || ''), 'el botón es «Entendido» y NO manda nada al servidor');
        PRUEBAS.falso(/tareaMarcarHecha/.test(item ? item.innerHTML : 'tareaMarcarHecha'), 'no es «marcar como hecha» del servidor');
        PRUEBAS.cierto(item && item.textContent.indexOf(t('notif_de', { f: t('cic_de_hoy') })) >= 0 && item.textContent.indexOf(t('tar_sin_plazo')) < 0, 'y dice «Aviso de hoy», no «Sin plazo»');
        /* idempotente: otra revisión no duplica */
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => revisiones >= 2, 6000);   // 6 s: el diferido es de 1,5 s, pero con la pestaña oculta y otra pestaña cargada los timers pasan de 3 s (rojo de entorno, 2026-09-17)
        PRUEBAS.igual(revisiones, 2, 'guarda: la segunda revisión corrió de verdad');
        PRUEBAS.igual(notifLocalLeer().length, 1, 'otra revisión no la duplica');
        /* «Entendido» */
        btn.click();
        PRUEBAS.igual(notifLocalLeer()[0].estado, 'hecha', 'tocar «Entendido» la marca como hecha');
        PRUEBAS.cierto(badge.style.display === 'none', 'y el globito se apaga');
        PRUEBAS.cierto(!!cont.querySelector('.tar-item.tar-hecha') && !cont.querySelector('.tar-btn'), 'la tarjeta queda como hecha, sin botón');
        /* privacidad: otra persona en el mismo teléfono no la ve */
        setProfile({ nombre: 'Otra Persona', cedula: '87654321', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'M', edad: '40' });
        PRUEBAS.igual(notifLocalItems().length, 0, 'con otro perfil en el mismo teléfono, los avisos del anterior no se ven');
        PRUEBAS.cierto(sesionClavesBorrar().indexOf(K_NOTIF_LOCAL) >= 0, 'y cerrar sesión borra la clave');
        /* discriminador: sin ciclo detenido, nada */
        setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
        localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
        localStorage.setItem(K_CICLO_SRV, JSON.stringify([p186cEv('salida_casa', p186cHace(0.5))]));
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => revisiones >= 3, 6000);   // 6 s: el diferido es de 1,5 s, pero con la pestaña oculta y otra pestaña cargada los timers pasan de 3 s (rojo de entorno, 2026-09-17)
        PRUEBAS.igual(revisiones, 3, 'guarda: la tercera revisión corrió de verdad');
        PRUEBAS.igual(notifLocalLeer().length, 0, 'DISCRIMINADOR · un ciclo de media hora no deja aviso');
      } finally { try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
    } finally {
      window.showToast = origToast; window.cicloAgruparTodos = origAgrupar; DASH = prevDash; clearTimeout(_cicDetRevisarT);
      TAREAS.lista = prevLista; TAREAS.pendientes = prevPend;
      try { tareasPintarBadge(); } catch(e){}
      try { const c = document.getElementById('tareasLista'); if (c) c.innerHTML = ''; } catch(e){}
    }
  });
});

PRUEBAS.caso('🔴 P186c · «Tu ciclo del ayer» no existe: la fecha lleva SU preposición en el toast, la tarjeta y el aviso', () => {
  /* Con datos reales, el aviso decía «Tu ciclo del ayer se detuvo a las 24 h». `cicloFechaLabel`
     devuelve «hoy», «ayer» o «11/09» y las tres plantillas decían «del {f}». */
  const hoy = Date.now(), ayer = hoy - 86400000, viejo = hoy - 5 * 86400000;
  PRUEBAS.igual(cicloFechaDe(hoy), t('cic_de_hoy'), 'hoy → «de hoy»');
  PRUEBAS.igual(cicloFechaDe(ayer), t('cic_de_ayer'), 'ayer → «de ayer»');
  PRUEBAS.igual(cicloFechaDe(viejo), t('cic_del_dia', { d: cicloFechaLabel(viejo) }), 'más viejo → «del dd/mm»');
  const malo = /\b(del hoy|del ayer|de \d{2}\/\d{2})\b/;
  const frases = [ayer, hoy, viejo].flatMap(ms => [
    t('ts_ciclo_detenido', { f: cicloFechaDe(ms), h: CICLO_DETENIDO_HORAS }),
    t('notif_det_titulo', { f: cicloFechaDe(ms), h: CICLO_DETENIDO_HORAS }),
    t('cic_mio_detenido', { f: cicloFechaDe(ms), h: CICLO_DETENIDO_HORAS, reg: '', primero: 'X' })
  ]);
  PRUEBAS.igual(frases.filter(f => malo.test(f)), [], '⚠️ ninguna frase dice «del ayer», «del hoy» ni «de 11/09»');
  PRUEBAS.cierto(frases.every(f => /Tu ciclo (de hoy|de ayer|del \d{2}\/\d{2}) se detuvo/.test(f)), 'todas empiezan «Tu ciclo de hoy / de ayer / del dd/mm se detuvo»');
  PRUEBAS.cierto(malo.test('Tu ciclo del ayer se detuvo'), 'DISCRIMINADOR · el patrón sí caza la frase mala');
  /* y en inglés tampoco queda «of yesterday» */
  const en = _i18nBuscar('en', SECTOR_FALLBACK, 'ts_ciclo_detenido').replace('{f}', _i18nBuscar('en', SECTOR_FALLBACK, 'cic_de_ayer'));
  PRUEBAS.cierto(/cycle from yesterday stopped/.test(en), 'en inglés: «cycle from yesterday»');
});

PRUEBAS.caso('🔴 P186d · el doble toque («lo volví a tocar porque no estaba seguro») no arma un ciclo fantasma que se «detiene»', () => {
  /* La revisión adversarial de P186c: el servidor colapsa dos envíos del mismo evento a menos de
     20 min en UNA fila (gana el más nuevo); el teléfono guardaba los dos, y con P186 el primero
     quedaba solo en un ciclo de un evento que a las 24 h se detenía — toast, entrada y globito
     falsos, con el ciclo real completo. Se mide por `cicloMioAll` → `cicloAgruparTodos` →
     `cicloEstado` → `cicloDetenidoRevisar`, con la app visible. */
  const origToast = window.showToast; const toasts = []; window.showToast = m => { toasts.push(String(m)); };
  const origAgrupar = window.cicloAgruparTodos; let revisiones = 0;
  window.cicloAgruparTodos = function(){ revisiones++; return origAgrupar.apply(this, arguments); };
  const prevDash = DASH;
  return PRUEBAS.conOculto(false, async () => {
    try {
      const prevLS = Object.assign({}, localStorage);
      try {
        setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
        localStorage.removeItem(K_CICLO_DETENIDO_VISTO); localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_MIO);
        /* ayer: salida 06:00, otra vez 06:03 (doble toque), y el ciclo completo; el servidor sólo tiene la de 06:03 */
        const h = 30;   // hace 30 h = ayer a esta hora
        const local = [p186cEv('salida_casa', p186cHace(h)), p186cEv('salida_casa', p186cHace(h - 0.05)), p186cEv('llegada_aero', p186cHace(h - 1)),
                       p186cEv('salida_aero', p186cHace(h - 10)), p186cEv('llegada_casa', p186cHace(h - 11))];
        localStorage.setItem(K_CICLO_MIO, JSON.stringify(local.map(e => ({ evento: e.evento, iso: e.iso, test: '', resultado: null }))));
        localStorage.setItem(K_CICLO_SRV, JSON.stringify(local.slice(1)));
        const todos = cicloMioAll();
        PRUEBAS.igual(todos.filter(e => e.evento === 'salida_casa').length, 1, '⚠️ dos «Saliendo de casa» a 3 min son UN hecho (la regla del servidor)');
        PRUEBAS.igual(todos.filter(e => e.evento === 'salida_casa')[0].iso, local[1].iso, 'y gana el más nuevo, como en la hoja');
        const ciclos = origAgrupar(todos, cicloTotalMin(cicloPlan('')) * 60000);   // directo, sin contar como revisión
        PRUEBAS.igual(ciclos.length, 1, 'un solo ciclo, no un fantasma más el real');
        PRUEBAS.igual(cicloEstado(ciclos[0], Date.now(), cicloPlan('')).estado, 'completo', 'y está completo');
        cicloDetenidoRevisar();
        await PRUEBAS.esperarA(() => revisiones >= 1, 6000);   // 6 s: el diferido es de 1,5 s, pero con la pestaña oculta y otra pestaña cargada los timers pasan de 3 s (rojo de entorno, 2026-09-17)
        PRUEBAS.igual(revisiones, 1, 'guarda: la revisión corrió');
        PRUEBAS.igual(toasts.filter(x => /24 h/.test(x)).length, 0, 'ningún toast de «se detuvo»');
        PRUEBAS.igual(notifLocalLeer().length, 0, 'ninguna entrada en «Tus tareas»');
        /* discriminador: a 25 min ya son dos hechos (como en el servidor), y el primero sí queda solo */
        const lejos = [p186cEv('salida_casa', p186cHace(h)), p186cEv('salida_casa', p186cHace(h - 0.42))];
        localStorage.setItem(K_CICLO_MIO, JSON.stringify(lejos.map(e => ({ evento: e.evento, iso: e.iso, test: '', resultado: null }))));
        localStorage.setItem(K_CICLO_SRV, JSON.stringify([]));
        PRUEBAS.igual(cicloMioAll().length, 2, 'DISCRIMINADOR · a 25 min son dos eventos');
        /* y el encadenado: 06:00, 06:15, 06:30 → uno solo, el de 06:30 (cada uno a menos de 20 min del anterior) */
        const cadena = [p186cEv('salida_casa', p186cHace(h)), p186cEv('salida_casa', p186cHace(h - 0.25)), p186cEv('salida_casa', p186cHace(h - 0.5))];
        localStorage.setItem(K_CICLO_MIO, JSON.stringify(cadena.map(e => ({ evento: e.evento, iso: e.iso, test: '', resultado: null }))));
        const c = cicloMioAll();
        PRUEBAS.cierto(c.length === 1 && c[0].iso === cadena[2].iso, 'tres toques encadenados a 15 min: uno, el último (como reescribe la hoja)');
      } finally { try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
    } finally { window.showToast = origToast; window.cicloAgruparTodos = origAgrupar; DASH = prevDash; clearTimeout(_cicDetRevisarT); }
  });
});

PRUEBAS.caso('🔴 P186d · en «Tus tareas» lo pendiente va arriba de lo hecho, el aviso más nuevo primero, y los vistos se van a la semana', () => {
  /* R6: ocho avisos ya vistos no pueden tapar una cita del servicio médico. Y dos detenidos de la
     misma revisión: el de ayer arriba del de anteayer. */
  const prevLista = TAREAS.lista, prevPend = TAREAS.pendientes;
  const prevLS = Object.assign({}, localStorage);
  try {
    setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
    const ahora = Date.now(), dia = 86400000;
    const iso = ms => new Date(ms).toISOString();
    /* almacén: tres avisos vistos (uno de hace 10 días), uno sin leer viejo y uno sin leer nuevo, todos «creada» distinta */
    notifLocalGuardar([
      { id: 'det_a', tipo: 'ciclo_detenido', t0: ahora - 2 * dia, estado: 'sin_leer', creada: iso(ahora - dia) },
      { id: 'det_b', tipo: 'ciclo_detenido', t0: ahora - 1 * dia, estado: 'sin_leer', creada: iso(ahora - dia) },
      { id: 'det_c', tipo: 'ciclo_detenido', t0: ahora - 3 * dia, estado: 'hecha',    creada: iso(ahora - 2 * dia) },
      { id: 'det_d', tipo: 'ciclo_detenido', t0: ahora - 12 * dia, estado: 'hecha',   creada: iso(ahora - 10 * dia) }
    ]);
    const items = notifLocalItems();
    PRUEBAS.igual(items.map(x => x.id), ['det_b', 'det_a', 'det_c'], '⚠️ más nuevo primero (misma revisión: gana el ciclo más reciente) y el visto de hace 10 días ya no se pinta');
    PRUEBAS.igual(notifLocalLeer().length, 4, 'pero sigue en el almacén (no se vuelve a avisar)');
    TAREAS.lista = [{ id: 'med-1', titulo: 'Cita de telemedicina', detalle: '', origen: 'medico', estado: 'sin_leer', vence: '' }];
    TAREAS.pendientes = 1;
    tareasPintar();
    const cont = document.getElementById('tareasLista');
    const orden = [...cont.querySelectorAll('.tar-item')].map(el => (el.classList.contains('tar-hecha') ? 'H:' : 'P:') + el.querySelector('.tar-tit').textContent.slice(0, 12));
    PRUEBAS.igual(orden.length, 4, 'guarda: cuatro tarjetas');
    PRUEBAS.cierto(orden[3].startsWith('H:'), '⚠️ la única hecha va ÚLTIMA');
    PRUEBAS.cierto(orden.slice(0, 3).every(o => o.startsWith('P:')), 'y las tres pendientes arriba');
    PRUEBAS.cierto(orden[2] === 'P:Cita de tele', 'la cita del médico está entre las pendientes, no debajo de lo hecho');
    tareasPintarBadge();
    PRUEBAS.igual(document.getElementById('tareasBadge').textContent, '3', 'el globito cuenta 1 del servidor + 2 avisos sin leer (los vistos no)');
  } finally {
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    TAREAS.lista = prevLista; TAREAS.pendientes = prevPend;
    try { tareasPintarBadge(); } catch(e){}
    try { const c = document.getElementById('tareasLista'); if (c) c.innerHTML = ''; } catch(e){}
  }
});

PRUEBAS.caso('🔴 P186e · el panel del supervisor con las dos filas del 15/09 (mismo salida_casa a 9 ms): una tarjeta, sin ciclo fantasma', () => {
  /* Las dos filas reales de `Operacional` con el mismo `IdEvento` llegan al panel en el payload.
     Sin el colapso, `cicloArmar` armaba un ciclo de un solo `salida_casa` (que a las 24 h se
     mostraba «detenido») y otro con el ciclo real. Ahora los tres agrupadores del cliente aplican
     la regla de `cicloMioAll`: por persona y por evento, dos a menos de 20 min son una. */
  const prevDash = DASH;
  const base = Date.now() - 30 * 3600000, iso = ms => new Date(ms).toISOString();
  const ev = (evento, ms) => ({ persona: 'Doble Toque', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', evento, iso: iso(ms), fecha: iso(ms).substring(0, 10), test: '', resultado: '', plan: '' });
  const pintar = (segunda) => {
    onDashData({ ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: [],
      registros: [{ persona: 'Doble Toque', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: todayStr() }],
      comentarios: [], pvt: [], aptitud: [], config: {}, marca: null, ausencias: {}, duty: null, turnos: [],
      operacional: [ev('salida_casa', base), ev('salida_casa', base + segunda), ev('llegada_aero', base + segunda + 5), ev('salida_aero', base + 10 * 3600000), ev('llegada_casa', base + 11 * 3600000)],
      operacionalPeriodo: { dias: 7 }
    }, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'helitec', empresa: 'helitec', pass: 'x', dispositivoId: 'p186e' }, 'supervisor');
    const cont = document.createElement('div'); cont.innerHTML = renderCicloOperativo();
    const todos = cicloAgruparTodos(DASH.operacional, cicloTotalMin(cicloPlan('Doble Toque')) * 60000);
    return { tarjetas: cont.querySelectorAll('.cic-card').length, detenidas: cont.querySelectorAll('.cic-card.cic-est-detenido').length, completas: cont.querySelectorAll('.cic-card.cic-est-completo').length, ciclos: todos.length };
  };
  try {
    const r = pintar(9);
    PRUEBAS.igual(r.tarjetas, 1, 'guarda: una tarjeta para la persona');
    PRUEBAS.igual(r.ciclos, 1, '🔴 el histórico ve UN ciclo (no un fantasma de un evento más el real)');
    PRUEBAS.igual(r.detenidas, 0, '🔴 y nada «detenido»: el ciclo real está completo');
    PRUEBAS.igual(r.completas, 1, 'la tarjeta dice completo');
    const r2 = pintar(25 * 60000);
    PRUEBAS.igual(r2.ciclos, 2, 'DISCRIMINADOR · con la segunda salida 25 min después, son dos ciclos (la persona volvió a salir)');
  } finally { DASH = prevDash; }
});

PRUEBAS.caso('⚠️ CONTRATO P186e · la ventana de «misma ocurrencia» es UN número en las dos capas', () => {
  /* El servidor la usa al escribir y al leer; el teléfono, en sus tres agrupadores. Si una cambia
     y la otra no, vuelve el escritor y el lector derivando distinto. Se lee del `.gs` real. */
  PRUEBAS.igual(CICLO_MISMA_OCURRENCIA_MIN, 20, 'el cliente dice 20');
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs se saltea la otra mitad'); return; }
  const m = /var OP_VENTANA_MISMA_OCURRENCIA_MIN = (\d+);/.exec(CTX.gs);
  PRUEBAS.cierto(!!m, 'guarda: el .gs declara la ventana');
  PRUEBAS.igual(m && Number(m[1]), CICLO_MISMA_OCURRENCIA_MIN, '⚠️ y es el mismo número que el cliente');
  /* y el mismo colapso da lo mismo en las dos capas para los mismos eventos */
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({ 'Config Empresa': [['Empresa','Clave','Valor']] }), ['dutyColapsarMismaOcurrencia_']);
  const base = Date.now() - 3600000, iso = ms => new Date(ms).toISOString();
  const evs = [{ evento: 'salida_casa', iso: iso(base), persona: 'X', empresa: 'E' }, { evento: 'salida_casa', iso: iso(base + 9), persona: 'X', empresa: 'E' }, { evento: 'salida_casa', iso: iso(base + 15 * 60000), persona: 'X', empresa: 'E' }, { evento: 'salida_casa', iso: iso(base + 40 * 60000), persona: 'X', empresa: 'E' }];
  const srv = api.dutyColapsarMismaOcurrencia_(evs.slice()).map(e => e.iso), cli = cicloColapsarMismaOcurrencia(evs.slice(), true).map(e => e.iso);
  PRUEBAS.igual(cli, srv, '⚠️ las dos capas colapsan igual (' + cli.length + ' de 4: encadenado a 15 min, cortado a 40)');
  PRUEBAS.igual(cli, [iso(base + 15 * 60000), iso(base + 40 * 60000)], 'quedan la de +15 (que se llevó a +0 y +9) y la de +40');
  /* P186f · y las dos capas dejan `detenido` afuera del colapso, y no pisan por un ISO con
     desplazamiento que ordena por texto antes que uno en Z más viejo */
  const dets = [{ evento: 'detenido', iso: iso(base), persona: 'X', empresa: 'E' }, { evento: 'detenido', iso: iso(base + 1000), persona: 'X', empresa: 'E' }];
  PRUEBAS.igual(cicloColapsarMismaOcurrencia(dets.slice(), true).length, 2, 'P186f · el cliente deja los dos `detenido`');
  PRUEBAS.igual(api.dutyColapsarMismaOcurrencia_(dets.slice()).length, 2, 'P186f · el servidor también');
  const cruzados = [{ evento: 'salida_casa', iso: '2026-09-15T23:00:00-04:00', persona: 'X', empresa: 'E' }, { evento: 'salida_casa', iso: '2026-09-16T01:00:00Z', persona: 'X', empresa: 'E' }];
  PRUEBAS.igual(cicloColapsarMismaOcurrencia(cruzados.slice(), true).length, 2, 'P186f · el cliente no junta dos hechos a dos horas por el orden del texto');
  PRUEBAS.igual(api.dutyColapsarMismaOcurrencia_(cruzados.slice()).length, 2, 'P186f · el servidor tampoco');
});

PRUEBAS.caso('🔴 P186e · en el propio teléfono, el doble toque colapsa aunque una copia sea local (sin persona) y la otra del servidor (con persona)', () => {
  /* Los eventos de `K_CICLO_MIO` se guardan sin `persona`; los de `K_CICLO_SRV` la traen. Si la
     clave del colapso llevara el nombre, un toque local a 9 ms de su copia del servidor no se
     juntaría y volvería el ciclo fantasma en la tarjeta del piloto. */
  const prevLS = Object.assign({}, localStorage);
  try {
    setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' });
    const base = Date.now() - 30 * 3600000, iso = ms => new Date(ms).toISOString();
    localStorage.setItem(K_CICLO_MIO, JSON.stringify([{ evento: 'salida_casa', iso: iso(base), test: '', resultado: null }]));
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([{ evento: 'salida_casa', iso: iso(base + 9), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC' }, { evento: 'llegada_aero', iso: iso(base + 14), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC' }, { evento: 'salida_aero', iso: iso(base + 10 * 3600000), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC' }, { evento: 'llegada_casa', iso: iso(base + 11 * 3600000), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC' }]));
    const todos = cicloMioAll();
    PRUEBAS.igual(todos.filter(e => e.evento === 'salida_casa').length, 1, '🔴 la copia local (sin persona) y la del servidor (con persona) a 9 ms son UN hecho');
    const ciclos = cicloAgruparTodos(todos, cicloTotalMin(cicloPlan('')) * 60000);
    PRUEBAS.igual(ciclos.length, 1, 'y un solo ciclo');
    PRUEBAS.igual(cicloEstado(ciclos[0], Date.now(), cicloPlan('')).estado, 'completo', 'completo, no un fantasma detenido');
  } finally { try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){} }
});

PRUEBAS.caso('🔴 P186f · en el panel, dos ciclos detenidos a menos de 20 min se muestran los dos detenidos (los `detenido` no se juntan)', () => {
  /* Entra por `cicloAgruparTodos`, el agrupador del histórico del panel, con lo que manda el servidor.
     Sin P186f el primer ciclo perdía su `detenido` y se leía como abandonado en vez de detenido. */
  {
    const base = Date.now() - 30 * 3600000, iso = ms => new Date(ms).toISOString();
    const ev = (evento, ms) => ({ evento, iso: iso(ms), persona: 'Dos Ciclos', empresa: 'Consorcio HELITEC', fecha: iso(ms).slice(0, 10) });
    const duty = [ev('salida_casa', base), ev('llegada_aero', base + 10 * 60000), ev('salida_aero', base + 15 * 60000),
                  ev('detenido', base + 15 * 60000 + 1000), ev('llegada_aero', base + 31 * 60000), ev('detenido', base + 31 * 60000 + 1000)];
    const ciclos = cicloAgruparTodos(duty, cicloTotalMin(cicloPlan('')) * 60000);   // colapsa adentro (P186e)
    PRUEBAS.igual(ciclos.length, 2, 'dos ciclos');
    PRUEBAS.igual(ciclos.map(c => !!c.ev[CICLO_EVENTO_DETENIDO]), [true, true], '🔴 cada uno conserva su `detenido`');
    /* `cicloAgruparTodos` devuelve el más nuevo primero. El segundo ciclo (abierto por la `llegada_aero`
       repetida) no tiene evento inicial y `cicloEstado` lo da «inactivo» por diseño; el que importa
       es el PRIMERO: sin P186f perdía su `detenido` y se leía «abandonado». */
    PRUEBAS.igual(cicloEstado(ciclos[1], Date.now(), cicloPlan('')).estado, 'detenido', '🔴 el primer ciclo se lee «detenido»');
  }
});
