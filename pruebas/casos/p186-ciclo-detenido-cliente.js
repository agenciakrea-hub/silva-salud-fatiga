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
        await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
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
  const claves = ['cic_e_detenido', 'op_detenido', 'jor_detenido', 'cic_mio_detenido', 'cic_mio_detenido_corto', 'ts_ciclo_detenido'];
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
