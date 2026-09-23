/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 6 · UNA FECHA QUE SHEETS REINTERPRETÓ NO SE UBICA EN NINGÚN DÍA (2026-09-22)

   El escritor SIEMPRE manda `new Date().toISOString()` (`cicloMioGuardar`), así que todo lo que
   vuelve del CH sin forma ISO volvió reinterpretado por la hoja (R15). `cmesInstanteDe`
   (`index.html:13997`) tiene DOS guardas y la que importa es la primera: la forma.

   ⚠️ POR QUÉ `isFinite` NO ALCANZA, que es la razón de existir de este archivo:
   `Date.parse('9/12/2026 18:52:00')` devuelve un número PERFECTO (1.789.249.920.000 en la máquina
   donde se corrió el discriminador en Node, con TZ America/Buenos_Aires; el valor exacto depende de
   la zona del equipo porque la cadena no trae huso). O sea: una guarda que sólo mirara
   `isFinite(Date.parse(o.iso))` dejaría pasar el evento y lo pintaría en la casilla del 12 de
   septiembre — un día en que esa persona puede no haber trabajado. Una casilla de color sobre un
   día equivocado es una afirmación falsa sobre una persona, en una pantalla que un médico lee como
   evidencia (R4). El evento NO se descarta en silencio: se cuenta y se declara en el pie.

   CAMINO REAL (R17): el evento entra por `misSincronizar()` con el `fetch` estubado —que es quien
   escribe `K_CICLO_SRV` y `K_CICLO_SRV_PER`—, y la pantalla se repinta sola por
   `renderInicio() → cicloMiRefrescar() → cmesRepintar('mio')`. Nunca se escribe `K_CICLO_SRV` a
   mano para leerlo dos líneas más abajo: eso probaría el `JSON.parse`, no la cadena.

   DISCRIMINADOR (el tercer caso de este archivo): el MISMO instante escrito con forma ISO SÍ pinta
   la casilla y NO suma al pie. Sin eso, «no hay ninguna casilla pintada» podría ser cierto porque
   la medición no mide nada — que es exactamente lo que ya pasó en A4.

   R11 · nada se verifica con `innerText` (da falsos negativos con la pestaña oculta): se lee
   `textContent`, `classList` y los atributos.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · calendario de jornadas: la fecha ilegible se declara, no se dibuja');

/* La forma exacta que devuelve la hoja cuando reinterpretó la celda (R15, el mismo síntoma que ya
   se cobró los teléfonos con `+` en `Nómina` y `Fecha`/`Hora` en `Operacional`). */
const P090FI_MALO = '9/12/2026 18:52:00';
/* Cobertura ancha a propósito: el corte del servidor es `hoy − dias` y con 400 días septiembre de
   2026 sigue cubierto aunque la suite se corra meses después. Si el día quedara FUERA de la
   cobertura, la casilla saldría `cmes-c-fuera` y el caso mediría otra cosa sin avisar. */
const P090FI_DIAS = 400;

function p090fiEvento(iso){
  return { evento: 'salida_casa', iso: iso, persona: 'Persona De Prueba',
           empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto',
           test: '', resultado: null };
}

/* Deja la app como el teléfono de un piloto —sin panel detrás— y estuba la red. Devuelve la
   función que restaura TODO. */
function p090fiPreparar(){
  const prevLS = Object.assign({}, localStorage);
  const prevDash = DASH;
  const oReloj = window.fetchConReloj, oFetch = window.fetch, oPost = window.gestPost;
  /* El calendario del piloto no tiene panel detrás: así `zonaOperacion()` y `cmesCobertura('mio')`
     salen de su propio dispositivo y no de lo que dejó puesto el caso anterior (R18). No es armar
     estado a mano: es el valor inicial de la app (`index.html:18425`, `let DASH = null`). Va ANTES
     de `resetear()`, que ya repinta las secciones y las repintaría con el panel de otro caso. */
  DASH = null;
  SIMUL = null;                 // en simulación `misSincronizar` devuelve false sin tocar nada
  _misSincronizando = false;    // otro caso pudo dejar una sincronización «en vuelo»
  CTX.resetear();
  window.gestPost = () => Promise.resolve({ ok: true });
  window.fetch = () => new Promise(() => {});
  return function restaurar(){
    window.fetchConReloj = oReloj; window.fetch = oFetch; window.gestPost = oPost;
    DASH = prevDash;
    try { cmesMesSet('mio', null); cmesDiaSet('mio', null); } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    try { renderSections(); } catch(e){}
  };
}

/* La respuesta del canal del piloto (`action=empleado`), con lo mínimo que `misSincronizar`
   consume. `operacionalPeriodo.desde` viene NULL en este canal —lo dice el comentario de
   `index.html:14947`—, así que la cobertura se deriva con `hoy − dias`. */
function p090fiStubRed(operacional){
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({
    ok: true, registros: [], pvt: [], metricas: [], referencia: {},
    operacional: operacional,
    operacionalPeriodo: { dias: P090FI_DIAS, desde: null, hasta: null }
  }) });
}

const P090FI_CON_JORNADA = ['completo', 'exceso', 'excedido', 'sin_cierre', 'detenido',
                            'cerrado', 'curso', 'descanso', 'parcial'];
function p090fiCeldas(){ return [...document.querySelectorAll('#cmesMio .cmes-d')]; }
function p090fiCaso(b){
  const c = P090FI_CON_JORNADA.concat(['sin_jornada', 'fuera', 'futuro', 'franco'])
    .find(x => b.classList.contains('cmes-c-' + x));
  return c || '(ninguno)';
}
function p090fiPie(){
  const el = document.querySelector('#cmesMio .cmes-pie');
  return el ? el.textContent : '';
}

/* ── 1 · LA GUARDA, MEDIDA SOBRE LA FUNCIÓN ─────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · `isFinite(Date.parse())` NO alcanza: la cadena de Sheets da un número perfecto al día equivocado, y `cmesInstanteDe` igual la rechaza', () => {
  const t = Date.parse(P090FI_MALO);
  /* Esto es el discriminador de la guarda: si esta línea fuera falsa, la forma no haría falta. */
  PRUEBAS.cierto(isFinite(t), '🔴 `Date.parse(' + P090FI_MALO + ')` es FINITO (' + t + '): una guarda de sólo `isFinite` habría dejado pasar el evento');
  PRUEBAS.igual(new Date(t).getUTCFullYear(), 2026, 'y cae en 2026 (no es una fecha absurda que salte a la vista)');
  PRUEBAS.igual(fechaOpDe(new Date(t)).slice(0, 7), '2026-09', '🔴 con `isFinite` solo, el evento se habría ubicado en SEPTIEMBRE · ' + fechaOpDe(new Date(t)));
  /* La guarda real */
  PRUEBAS.igual(cmesInstanteDe({ iso: P090FI_MALO }), null, '🔴 `cmesInstanteDe` lo rechaza por FORMA (`/^\\d{4}-\\d{2}-\\d{2}T/`), no por `isFinite`');
  PRUEBAS.igual(cmesDiaDeEvento({ evento: 'salida_casa', iso: P090FI_MALO }), null, 'y por lo tanto no tiene día');
  /* y el mismo INSTANTE con forma ISO sí se acepta: la guarda mira la forma, no descarta por las dudas */
  const iso = new Date(t).toISOString();
  PRUEBAS.igual(cmesInstanteDe({ iso: iso }), t, 'DISCRIMINADOR · el mismo instante con forma ISO SÍ se acepta (la guarda no descarta de más)');
  PRUEBAS.igual(cmesDiaDeEvento({ evento: 'salida_casa', iso: iso }), fechaOpDe(new Date(t)), 'y se ubica en el día que corresponde');
});

/* ── 2 · LA PANTALLA, POR EL CAMINO REAL ────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P090 · un evento con fecha ilegible no pinta NINGUNA casilla y el pie declara 1 registro', () => {
  const restaurar = p090fiPreparar();
  const diaFalso = fechaOpDe(new Date(Date.parse(P090FI_MALO)));   // donde HABRÍA caído
  /* El mes se elige ANTES de sincronizar: `cicloMiRefrescar` repinta con `cmesMes('mio')`, así que
     si el mes quedara en el de hoy y la suite se corriera en octubre, la casilla ni existiría y el
     caso pasaría en verde sin haber mirado nada. */
  cmesMesSet('mio', diaFalso.slice(0, 7)); cmesDiaSet('mio', null);
  p090fiStubRed([p090fiEvento(P090FI_MALO)]);
  return misSincronizar().then(ok => {
    PRUEBAS.igual(ok, true, 'guarda: la sincronización del canal del piloto contestó bien');
    PRUEBAS.igual((JSON.parse(localStorage.getItem(K_CICLO_SRV)) || []).length, 1,
      'guarda: el evento ilegible SÍ quedó guardado (no se filtra al entrar, se filtra al dibujar)');
    PRUEBAS.existe('#cmesMio', 'guarda: el calendario del piloto se repintó solo (misSincronizar → renderInicio → cicloMiRefrescar)');

    const celdas = p090fiCeldas();
    PRUEBAS.alMenos(celdas.length, 28, 'guarda: hay casillas que mirar (un cero sin discriminador no es un resultado)');

    /* (a) ninguna fecha rota en el DOM */
    const fechas = celdas.map(b => b.getAttribute('data-f'));
    PRUEBAS.igual(fechas.filter(f => !/^\d{4}-\d{2}-\d{2}$/.test(String(f))), [],
      '🔴 toda casilla tiene un `data-f` con forma de fecha: ninguna con NaN · ' + fechas.length + ' medidas');
    const txt = document.getElementById('cmesMio').textContent;
    PRUEBAS.falso(/NaN/.test(txt), 'y en ningún rótulo del bloque aparece «NaN» (el mes, la fecha larga, el detalle)');

    /* (b) ninguna casilla pintada como jornada, y en particular la del día donde habría caído */
    const conJornada = celdas.filter(b => P090FI_CON_JORNADA.some(c => b.classList.contains('cmes-c-' + c)));
    PRUEBAS.igual(conJornada.map(b => b.getAttribute('data-f')), [],
      '🔴 ninguna casilla del mes tiene jornada: el evento ilegible no inventó un día');
    const cel = document.querySelector('#cmesMio .cmes-d[data-f="' + diaFalso + '"]');
    PRUEBAS.cierto(!!cel, 'guarda: la casilla del ' + diaFalso + ' existe en la grilla (si no, no habría nada que medir)');
    PRUEBAS.igual(p090fiCaso(cel), 'sin_jornada',
      '🔴 el ' + diaFalso + ' queda «sin jornada registrada», no pintado: cubierto y vacío, que es lo único que se sabe');
    PRUEBAS.falso((cel.getAttribute('aria-label') || '').indexOf(t('cmes_e_detenido', { h: CICLO_DETENIDO_HORAS })) >= 0,
      'y su nombre accesible tampoco afirma nada sobre una jornada');

    /* (c) el pie lo declara: el evento no desaparece en silencio */
    PRUEBAS.cierto(p090fiPie().indexOf(t('cmes_ilegibles_1', { n: 1 })) >= 0,
      '🔴 el pie declara 1 registro con fecha ilegible (R2: la app no esconde lo que no pudo ubicar) · ' + p090fiPie());
  }).finally(() => {
    /* R18 · la restauración va en el `.finally()` DE ESTA PROMESA. En un `finally` sincrónico
       correría antes que el `.then` y la prueba siguiente arrancaría con este `fetchConReloj`
       puesto: son cuatro rojos falsos ya pagados. */
    restaurar();
  });
});

PRUEBAS.caso('🔴 DISCRIMINADOR P090 · el MISMO instante con forma ISO sí pinta su casilla y el pie no habla de ilegibles', () => {
  const restaurar = p090fiPreparar();
  const t0 = Date.parse(P090FI_MALO);
  const diaFalso = fechaOpDe(new Date(t0));
  cmesMesSet('mio', diaFalso.slice(0, 7)); cmesDiaSet('mio', null);
  p090fiStubRed([p090fiEvento(new Date(t0).toISOString())]);
  return misSincronizar().then(ok => {
    PRUEBAS.igual(ok, true, 'guarda: sincronizó');
    const cel = document.querySelector('#cmesMio .cmes-d[data-f="' + diaFalso + '"]');
    PRUEBAS.cierto(!!cel, 'guarda: la casilla del ' + diaFalso + ' existe');
    PRUEBAS.cierto(P090FI_CON_JORNADA.indexOf(p090fiCaso(cel)) >= 0,
      '🔴 DISCRIMINADOR · con la fecha bien escrita la casilla SÍ se pinta (caso «' + p090fiCaso(cel) + '»): la medición de arriba mide algo');
    PRUEBAS.cierto(!!cel.querySelector('.cmes-p'),
      'y lleva su marca visible (si esto fallara, el «0 casillas pintadas» del caso anterior no probaría nada)');
    PRUEBAS.falso(p090fiPie().indexOf(t('cmes_ilegibles_1', { n: 1 })) >= 0,
      '🔴 y el pie NO habla de registros ilegibles: la línea del pie aparece por el evento roto, no siempre · ' + p090fiPie());
  }).finally(() => { restaurar(); });
});

PRUEBAS.caso('P090 · con un evento bueno y uno ilegible el mismo día, se dibuja el bueno y el pie cuenta el otro', () => {
  const restaurar = p090fiPreparar();
  const t0 = Date.parse(P090FI_MALO);
  const diaFalso = fechaOpDe(new Date(t0));
  cmesMesSet('mio', diaFalso.slice(0, 7)); cmesDiaSet('mio', null);
  /* El bueno va tres horas antes: más de `CICLO_MISMA_OCURRENCIA_MIN` (20 min), así que
     `cicloColapsarMismaOcurrencia` NO los funde y los dos llegan enteros a `cmesFuente`. */
  p090fiStubRed([p090fiEvento(new Date(t0 - 3 * 3600000).toISOString()), p090fiEvento(P090FI_MALO)]);
  return misSincronizar().then(ok => {
    PRUEBAS.igual(ok, true, 'guarda: sincronizó');
    PRUEBAS.igual((JSON.parse(localStorage.getItem(K_CICLO_SRV)) || []).length, 2, 'guarda: los dos eventos quedaron guardados');
    const celdas = p090fiCeldas();
    const conJornada = celdas.filter(b => P090FI_CON_JORNADA.some(c => b.classList.contains('cmes-c-' + c)));
    PRUEBAS.igual(conJornada.map(b => b.getAttribute('data-f')), [fechaOpDe(new Date(t0 - 3 * 3600000))],
      'una sola casilla pintada, la del evento legible: el ilegible no agrega un día ni duplica el suyo');
    PRUEBAS.cierto(p090fiPie().indexOf(t('cmes_ilegibles_1', { n: 1 })) >= 0,
      'y el pie sigue declarando 1 ilegible (se cuenta aunque haya datos buenos al lado) · ' + p090fiPie());
  }).finally(() => { restaurar(); });
});
