
PRUEBAS.grupo('Y4b · la pantalla de jornada (HSEQ)');

/* La mitad que se ve. El cálculo vive entero en el servidor (`leerDuty`) y esta pantalla NO
   recalcula nada: si recalculara, dos pantallas podrían mostrar números distintos del mismo hecho,
   y este número tiene consecuencias laborales. */

function y4bDuty(){
  return { dias:7, sinUmbralCongelado:1,
    diario:[
      {persona:'Ana Suárez', fecha:'2026-09-01', jornadaMin:810, previstoMin:840, excesoMin:90,  abierto:false, umbralCongelado:true,  tramos:[]},
      {persona:'Beto Pérez', fecha:'2026-09-01', jornadaMin:1200,previstoMin:840, excesoMin:480, abierto:true,  umbralCongelado:true,  tramos:[]},
      {persona:'Ciro Díaz',  fecha:'2026-09-02', jornadaMin:600, previstoMin:840, excesoMin:0,   abierto:false, umbralCongelado:false, tramos:[]}],
    personas:[
      {persona:'Beto Pérez', dias:3, jornadaMin:2400, excesoMin:480, diasConExceso:1, promedioJornadaMin:800, umbralCongelado:true},
      {persona:'Ana Suárez', dias:5, jornadaMin:3600, excesoMin:90,  diasConExceso:1, promedioJornadaMin:720, umbralCongelado:true}],
    historico:[{fecha:'2026-09-01',personas:2,excesoMin:570,conExceso:2},{fecha:'2026-09-02',personas:1,excesoMin:0,conExceso:0}] };
}
function y4bCon(duty, fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  try { DASH = { vista:'hseq', duty: duty }; return fn(); } finally { DASH = prev; }
}
function y4bPintar(duty){
  const cont = document.createElement('div');
  cont.innerHTML = y4bCon(duty, () => renderJornada());
  document.body.appendChild(cont);
  return cont;
}

PRUEBAS.caso('⚠️ "sin permiso" y "sin excesos" NO se ven igual', () => {
  /* El servidor manda `null` cuando el rol no puede ver esto, y un objeto con listas vacías cuando
     no hubo jornadas. Confundirlos haría que un supervisor lea "no hubo excesos" cuando en realidad
     nunca se le mandó el dato — la peor forma de tranquilizar a alguien. */
  const sinPermiso = y4bCon(null, () => renderJornada());
  const vacio = y4bCon({ dias:7, diario:[], personas:[], historico:[], sinUmbralCongelado:0 }, () => renderJornada());
  PRUEBAS.falso(sinPermiso === vacio, '⚠️ los dos estados no pueden producir la misma pantalla');
  PRUEBAS.cierto(sinPermiso.indexOf(t('jor_sin_permiso')) >= 0, 'sin permiso lo dice');
  PRUEBAS.cierto(vacio.indexOf(t('jor_vacio')) >= 0, 'y "sin registros" dice otra cosa');
});

PRUEBAS.caso('⚠️ quien sigue adentro y ya se pasó aparece PRIMERO', () => {
  /* Es lo único accionable hoy: el resto ya ocurrió. Si quedara sepultado al final de una tabla de
     treinta filas, la pantalla informaría sin servir para nada. */
  const c = y4bPintar(y4bDuty());
  try {
    const ahora = c.querySelector('.jor-ahora');
    PRUEBAS.cierto(!!ahora, '⚠️ tiene que existir el bloque de quienes están en jornada excedidos');
    PRUEBAS.cierto((ahora.textContent||'').indexOf('Beto') >= 0, 'con la persona nombrada');
    const tabla = c.querySelector('.jor-tabla');
    PRUEBAS.cierto(ahora.compareDocumentPosition(tabla) & Node.DOCUMENT_POSITION_FOLLOWING,
      'y tiene que ir ANTES de las tablas');
  } finally { c.remove(); }
});

PRUEBAS.caso('⚠️ una jornada sin umbral guardado se marca, no se presenta como "sin exceso"', () => {
  /* Presentar como "sin exceso" algo que no se pudo comparar es afirmar lo que no se midió. */
  const c = y4bPintar(y4bDuty());
  try {
    const aviso = c.querySelector('.dash-aviso');
    PRUEBAS.cierto(!!aviso, '⚠️ tiene que haber aviso cuando hay filas sin umbral');
    /* ⚠️ Se fija la PROPIEDAD, no el carácter. Esto decía `indexOf('1') >= 0`, y al resolver el
       plural —el aviso pasó a decir "Sin límite guardado para ese día" cuando es una sola, en vez de
       "1 jornadas quedaron sin comparar"— se puso en rojo por una mejora. Lo que importa es que el
       aviso explique que ESA jornada no se pudo comparar, no que aparezca el dígito. */
    const tx = (aviso.textContent||'').toLowerCase();
    PRUEBAS.cierto(/sin comparar|no se compara/.test(tx),
      '⚠️ el aviso tiene que decir que no se comparó — decía: ' + tx.slice(0,70));
  } finally { c.remove(); }
});

PRUEBAS.caso('⚠️ y cuando son VARIAS, dice cuántas', () => {
  /* Acá el número sí es imprescindible: "algunas jornadas quedaron sin comparar" no le sirve a
     nadie para saber si es una de treinta o veinte de treinta. */
  const d = y4bDuty(); d.sinUmbralCongelado = 4;
  const c = y4bPintar(d);
  try {
    const aviso = c.querySelector('.dash-aviso');
    PRUEBAS.cierto(!!aviso, 'tiene que haber aviso');
    PRUEBAS.cierto((aviso.textContent||'').indexOf('4') >= 0,
      '⚠️ con varias, el aviso tiene que traer el número — decía: ' + (aviso.textContent||'').slice(0,70));
  } finally { c.remove(); }
});

PRUEBAS.caso('⚠️ R2 · la pantalla SEÑALA, no sanciona', () => {
  /* La app nunca declara incumplimientos. Dice cuánto se midió contra cuánto estaba previsto; la
     lectura la hace una persona, con contexto. Un texto que diga "falta" o "incumplimiento" en una
     pantalla de HSEQ es una acusación automatizada. */
  const c = y4bPintar(y4bDuty());
  try {
    const txt = (c.textContent || '').toLowerCase();
    ['incumplimiento','infracción','falta grave','sanción','violación'].forEach(mala => {
      PRUEBAS.falso(txt.indexOf(mala) >= 0, '⚠️ no puede aparecer "' + mala + '" (R2)');
    });
    PRUEBAS.cierto(txt.indexOf('previsto') >= 0 || txt.indexOf('por encima') >= 0,
      'y sí tiene que decir contra qué se compara');
  } finally { c.remove(); }
});

PRUEBAS.caso('⚠️ las tablas no hacen scrollear la página de costado', () => {
  /* Es el mismo defecto que Y6 corrigió en el panel: una tabla ancha que arrastra el body entero.
     El `overflow-x` va en el contenedor de la tabla, no en la página. */
  const c = y4bPintar(y4bDuty());
  try {
    const wraps = [...c.querySelectorAll('.jor-tabla-wrap')];
    PRUEBAS.alMenos(wraps.length, 1, 'tiene que haber contenedores de tabla');
    wraps.forEach(x => PRUEBAS.igual(getComputedStyle(x).overflowX, 'auto',
      '⚠️ cada tabla scrollea en SU caja'));
  } finally { c.remove(); }
});

PRUEBAS.caso('⚠️ entra en un teléfono angosto sin desbordar', () => {
  const c = y4bPintar(y4bDuty());
  const malos = [];
  try {
    [[320,640],[375,812],[768,1024]].forEach(([w,h]) => {
      PRUEBAS.enVentana(w, h, () => {
        const r = c.getBoundingClientRect();
        if (r.width < 40) { malos.push(w + ': no medible'); return; }
        [...c.querySelectorAll('.jor-kpi, .jor-ahora, .jor-h4')].forEach(e => {
          if (e.getBoundingClientRect().right > w + 1) malos.push(w + ': se sale ' + (e.className||''));
        });
      });
    });
  } finally { c.remove(); }
  PRUEBAS.igual(malos, [], 'nada puede salirse de la pantalla — ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ los minutos se muestran en horas, no en un número crudo', () => {
  /* "810" no le dice nada a nadie a las seis de la mañana. */
  PRUEBAS.igual(jorMin(810), '13 h 30 min', '810 minutos son 13 h 30');
  PRUEBAS.igual(jorMin(60), '1 h', 'y una hora justa no dice "1 h 0 min"');
  PRUEBAS.igual(jorMin(45), '45 min', 'debajo de la hora, minutos');
  PRUEBAS.igual(jorMin(0), '0 min', 'y cero es cero, no vacío');
});

PRUEBAS.caso('la pestaña existe para HSEQ y para servicio médico, no para el supervisor', () => {
  /* Mismo recorte por rol que el resto del ciclo. El servidor ya manda `duty:null` al supervisor;
     esto es que además no le aparezca una pestaña vacía. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/'hseq'\)\s*return\s*\[[^\]]*'jornada'/.test(fuente), 'HSEQ la tiene');
  PRUEBAS.falso(/'supervisor'\)\s*return\s*\[[^\]]*'jornada'/.test(fuente),
    '⚠️ el supervisor NO: el duty time es del servicio médico y de Dirección');
});

PRUEBAS.caso('los textos de la pantalla están en los dos idiomas (R14, R1)', () => {
  ['jor_titulo','jor_lead','jor_vacio','jor_sin_permiso','jor_sin_umbral','jor_k_dias','jor_k_total',
   'jor_k_personas','jor_ahora','jor_por_persona','jor_historico','jor_diario','jor_c_persona',
   'jor_c_dias','jor_c_prom','jor_c_exceso','jor_c_fecha','jor_c_jornada','jor_abierto','tab_jornada']
    .forEach(k => { const v = t(k); PRUEBAS.cierto(!!v && v !== k, 'falta ' + k); });
  PRUEBAS.falso(/\b(tenés|podés|mirá|fijate)\b/i.test(t('jor_lead') + ' ' + t('jor_sin_umbral')),
    'español neutro (R1)');
});

PRUEBAS.grupo('Y4b · quién puede ver la jornada (A4)');

PRUEBAS.caso('⚠️ el servicio médico TIENE la pestaña Jornada', () => {
  /* Y4 la puso sólo en HSEQ, pero el endpoint ya mandaba `duty` también al médico: el dato viajaba
     y se tiraba. Es el hallazgo I1 nº 4 — el médico es el único que firma una determinación por
     fatiga, y las horas de servicio son de las variables más relevantes para esa firma. */
  PRUEBAS.cierto(dashTabsFor('empresa', false, 'medico').indexOf('jornada') >= 0,
    '⚠️ tiene que estar en la lista de pestañas del médico');
});

PRUEBAS.caso('⚠️ y sobrevive a dashOrderedTabs(), que tiene su propia lista', () => {
  /* La trampa que el propio código advierte: `dashOrderedTabs()` filtra contra un orden fijo
     PROPIO, así que una pestaña agregada sólo en `dashTabsFor` se descarta en silencio y la
     pantalla no aparece. Hay que tocar las dos, y esto lo comprueba. */
  const prev = DASH;
  try {
    DASH = { vista:'medico', rol:'empresa', f:{}, tabs: dashTabsFor('empresa', false, 'medico') };
    PRUEBAS.cierto(dashOrderedTabs().indexOf('jornada') >= 0,
      '⚠️ el orden fijo tiene que incluirla, o no se pinta aunque esté en `tabs`');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ el empleado NO la ve, y el supervisor tampoco (discriminador)', () => {
  /* El recorte es del servidor —a esas dos vistas no les manda `duty`—, pero la pantalla no puede
     ofrecer una pestaña que siempre va a estar vacía: se lee como una función rota. */
  PRUEBAS.falso(dashTabsFor('empleado', false, 'empleado').indexOf('jornada') >= 0,
    '⚠️ el empleado no ve horas de terceros');
  PRUEBAS.falso(dashTabsFor('empresa', false, 'supervisor').indexOf('jornada') >= 0,
    '⚠️ el supervisor tampoco: el servidor no le manda `duty` (K1a/K1b)');
});

PRUEBAS.caso('⚠️ ningún número queda sin decir qué es', () => {
  /* Salió MIRANDO la captura, no midiendo: la columna "Días" mostraba "2 2" —los días y, al lado,
     los días con exceso— y el segundo número no lo explicaba nada. Un dato sin etiqueta en la tabla
     que el servicio médico lee para firmar una determinación es peor que no mostrarlo.
     Ahora va en "Por encima", junto al total, donde se lee solo: "+2 h 20 min · 2 días". */
  const fuente = String(renderJornada);
  PRUEBAS.falso(/'<td>' \+ pe\.dias \+ \(pe\.diasConExceso/.test(fuente),
    '⚠️ el chip no puede volver a la columna de días, donde queda sin etiqueta');
  PRUEBAS.cierto(/jor_n_dias/.test(fuente),
    'y el número tiene que venir con su palabra ("2 días"), traducida por t()');
  ['jor_n_dias','jor_n_dias_1'].forEach(k =>
    PRUEBAS.cierto(!!t(k) && t(k) !== k, 'falta la traducción de ' + k));
});

PRUEBAS.caso('⚠️ los plurales se resuelven, no se escriben "persona(s)"', () => {
  /* R1 pide español neutro bien escrito, y "1 persona(s) siguen en jornada" no lo es. La app ya
     resuelve el plural con dos claves en otros seis lugares; acá faltaba. */
  ['jor_ahora','jor_ahora_1','jor_sin_umbral','jor_sin_umbral_1','hs_no_tocaba','hs_no_tocaba_1'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\(s\)/.test(v), '⚠️ ' + k + ' no puede llevar "(s)": ' + v);
  });
  PRUEBAS.cierto(/jor_ahora_1/.test(String(renderJornada)), 'y el llamador tiene que elegir la forma');
});

PRUEBAS.caso('⚠️ y NO dice "de guardia" en ningún texto visible', () => {
  /* El plan lo deja escrito: ese término no existe en el vocabulario del producto, y el commit de
     Y5 dice "se declara la AUSENCIA, no la guardia". Además es terminología de aviación: el
     servicio se está expandiendo a plantas industriales, donde no significa nada (R14). */
  ['hs_no_tocaba','hs_no_tocaba_1','aus_marcar','aus_marcar_corto','aus_quitar','aus_no_guardia'].forEach(k => {
    const v = String(t(k) || '').toLowerCase();
    PRUEBAS.falso(/de guardia|on duty/.test(v), '⚠️ ' + k + ' dice "de guardia": ' + v);
  });
});
