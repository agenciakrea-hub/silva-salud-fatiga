
PRUEBAS.grupo('X1 · qué es anónimo y qué no');

/* ⚠️ LO QUE ESTE ARCHIVO VIGILA NO ES UN TEXTO: ES QUE EL TEXTO SIGA SIENDO CIERTO.
   El plan lo pide textual — "si el texto promete más privacidad de la que hay, es peor que no decir
   nada" — y ahí está el riesgo real: la pantalla se escribe una vez y el recorte del servidor lo
   toca cualquier prompt posterior. El día que alguien agregue un campo al payload del supervisor,
   la app va a estar prometiéndole a la gente algo que dejó de cumplir, sin que nadie se entere.
   Por eso los casos de abajo corren el .gs REAL y comparan lo que manda contra lo que la app dice
   que manda. No comprueban la redacción: comprueban el contrato. */

function x1Env(){
  const env = GS.crearEntorno({
    'Respuestas de formulario 1': [
      ['Marca temporal','Fecha','Hora','Cedula','Nombre','Empresa','Departamento','Cargo',
       'kss','estres','ansiedad','fatiga','gastro','depresion','cansancio'],
      ['','2026-09-04','08:00','V-1','Ana Suárez','Helitec','Operaciones','Piloto',
       7, 4, 3, 8, 1, 2, 6]
    ],
    'Niveles de riesgo': [['Empresa','Departamento','Cargo','Persona','Nivel']],
    'Config Empresa':    [['Empresa','Clave','Valor']]
  });
  return GS.cargarGs(CTX.gs, env,
    ['armarAptitudServer','anonimizarHseq','aptAutoServer']);
}

/* La lista de indicadores se lee del .gs, no se copia acá: es el contrato del servidor, y si alguien
   le agrega uno el caso tiene que mirarlo también. `cargarGs` sólo expone funciones, así que una
   variable hay que sacarla del texto. */
function x1Metricas(){
  const m = /var METRICAS\s*=\s*\[([^\]]+)\]/.exec(CTX.gs || '');
  return m ? m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}

PRUEBAS.caso('⚠️ el supervisor NO recibe ni un puntaje — el texto se lo promete a la gente', () => {
  /* `priv_sup_3`: "No recibe los puntajes de tus tests ni tu test de reacción". */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = x1Env();
  const regs = [{ persona:'Ana Suárez', empresa:'Helitec', departamento:'Operaciones', cargo:'Piloto',
                  fecha:'2026-09-04', kss:7, estres:4, ansiedad:3, fatiga:8, gastro:1, depresion:2, cansancio:6 }];
  const armado = api.armarAptitudServer(regs, [], 3);
  PRUEBAS.igual(armado.registros.length, 1, 'guarda de medibilidad: tiene que armar algo');
  const fila = armado.registros[0];
  const mets = x1Metricas();
  PRUEBAS.alMenos(mets.length, 5, 'guarda: tienen que leerse los indicadores del .gs');
  const filtrados = mets.filter(m => fila[m] !== undefined);
  PRUEBAS.igual(filtrados, [],
    '⚠️ ningún puntaje puede sobrevivir al recorte — se colaron: ' + filtrados.join(', ') +
    '. Si esto se pone en rojo, el aviso del test está MINTIENDO y hay que corregir el texto ' +
    'o el recorte, nunca dejarlo pasar');
  PRUEBAS.igual(Object.keys(fila).sort(), ['cargo','departamento','empresa','persona'],
    'y sólo quedan los cuatro campos que el texto nombra');
});

PRUEBAS.caso('⚠️ pero SÍ recibe el nivel de cada indicador — y el texto también lo dice', () => {
  /* `priv_sup_1`: "Si cada indicador está en verde, amarillo o rojo. Incluye ansiedad y ánimo".
     ⚠️ Este caso existe para que el texto no se "mejore" hacia algo más tranquilizador. Decir "tu
     supervisor sólo ve si estás en condiciones" sonaría mejor y sería FALSO: ve el nivel de
     ansiedad y el de depresión, uno por uno. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x1Env();
  const regs = [{ persona:'Ana Suárez', empresa:'Helitec', departamento:'Operaciones', cargo:'Piloto',
                  fecha:'2026-09-04', kss:7, ansiedad:3, depresion:2 }];
  const apt = api.armarAptitudServer(regs, [], 3).aptitud[0];
  PRUEBAS.cierto(!!apt && Array.isArray(apt.metricas), 'la clasificación viaja por indicador');
  const conNivel = (apt.metricas || []).map(x => x.m);
  PRUEBAS.cierto(conNivel.indexOf('ansiedad') >= 0 || conNivel.indexOf('depresion') >= 0,
    '⚠️ el supervisor ve ansiedad/ánimo: el texto TIENE que decirlo — si esto dejara de ser cierto, ' +
    'el aviso se puede suavizar, pero no antes');
  const txt = String(t('priv_sup_1') || '').toLowerCase();
  PRUEBAS.cierto(/ansiedad|anxiety/.test(txt) && /ánimo|animo|mood/.test(txt),
    '⚠️ y el texto los nombra a los dos — decía: ' + txt);
});

PRUEBAS.caso('⚠️ los comentarios NO se le mandan al supervisor', () => {
  /* `priv_sup_4`: "No recibe lo que escribes en los comentarios: el servidor ni se los envía".
     Es la promesa más fuerte de todas —texto libre que la persona escribe— y por eso se comprueba
     sobre el código del endpoint, no sobre una respuesta armada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const i = CTX.gs.indexOf('comentarios = (acc.vista === "medico")');
  PRUEBAS.alMenos(i, 0,
    '⚠️ tiene que existir el recorte de comentarios por vista — si esta línea cambió de forma, ' +
    'HAY QUE LEERLA de nuevo antes de dar el caso por bueno');
  if (i < 0) return;
  const bloque = CTX.gs.slice(i, i + 220);
  PRUEBAS.cierto(/:\s*\[\]/.test(bloque),
    '⚠️ para cualquier vista que no sea la médica tiene que quedar el arreglo VACÍO — ' + bloque.slice(0,120));
});

PRUEBAS.caso('⚠️ HSEQ no recibe nombres: P1, P2, P3…', () => {
  /* `priv_hseq_1`. Es lo que permite que Dirección mire la organización sin mirar a las personas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = x1Env();
  const regs = [{ persona:'Ana Suárez', empresa:'Helitec', departamento:'Op', cargo:'Piloto' },
                { persona:'Luis Ferrer', empresa:'Helitec', departamento:'Op', cargo:'Piloto' }];
  const anon = api.anonimizarHseq(regs, [{ nombre:'Ana Suárez' }, { nombre:'Luis Ferrer' }], [], []);
  const nombres = anon.registros.map(r => r.persona);
  PRUEBAS.igual(nombres, ['P1','P2'], '⚠️ los nombres se reemplazan');
  PRUEBAS.igual(anon.aptitud.map(a => a.nombre), ['P1','P2'], 'y también en la clasificación');
  const crudo = JSON.stringify(anon);
  PRUEBAS.falso(/Ana Suárez|Luis Ferrer/.test(crudo),
    '⚠️ y no puede quedar el nombre real en NINGÚN campo del payload — que se vea o no en pantalla ' +
    'es irrelevante: si viaja, viajó');
});

PRUEBAS.caso('⚠️ el aviso está en los SIETE flujos de test, no en uno', () => {
  /* Son siete `render*Step()` distintos. El aviso vive en el overlay común a propósito: puesto
     adentro de cada flujo serían siete lugares y el octavo nacería sin él. */
  const sinAviso = [];
  ['perelli','kss','estres','ansiedad','gastro','cansancio', null].forEach(f => {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try {
      abrirTest({ testFlow: f, id:'x', titulo:'T' });
      const p = document.querySelector('#testOverlay .test-priv');
      if (!p || p.getBoundingClientRect().height <= 0) sinAviso.push(f || '(genérico)');
    } catch(e){ sinAviso.push((f || '(genérico)') + ' → ' + e.message); }
  });
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  PRUEBAS.igual(sinAviso, [], '⚠️ falta el aviso en: ' + sinAviso.join(', '));
});

PRUEBAS.caso('⚠️ y consultarlo NO pierde las respuestas a medio contestar', () => {
  /* Si abrir "Ver quién ve qué" cerrara el test, nadie lo abriría dos veces — y el aviso pasaría a
     ser un cartel que se ignora, que es justo lo que el plan pide evitar. */
  try {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    abrirTest({ testFlow:'kss', id:'x', titulo:'T' });
    const antes = kssState && kssState.inicioMs;
    privAbrir();
    PRUEBAS.cierto(document.getElementById('testOverlay').classList.contains('show'),
      '⚠️ el test tiene que seguir abierto detrás');
    PRUEBAS.cierto(!!kssState && kssState.inicioMs === antes,
      '⚠️ y su estado intacto: mismas respuestas, mismo cronómetro de confiabilidad');
    privCerrar();
    PRUEBAS.cierto(document.getElementById('testOverlay').classList.contains('show'),
      'y al cerrar la explicación se vuelve al test, no a otro lado');
  } finally { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); }
});

PRUEBAS.caso('⚠️ el marcado de los textos se INTERPRETA, no se muestra crudo', () => {
  /* Salió mirando la captura: los `<b>` aparecían literales — "&lt;b&gt;No recibe&lt;/b&gt; los
     puntajes…". `data-i18n` asigna por `textContent` a propósito, y la app ya tiene
     `data-i18n-html` para las cadenas con marcado, con su nota de seguridad al lado.
     Se comprueba sobre el DOM y no sobre el atributo: lo que importa es que la persona no vea
     etiquetas, sea cual sea el mecanismo que lo consiga. */
  const ov = document.getElementById('privOv');
  const crudos = [...ov.querySelectorAll('[data-i18n], [data-i18n-html]')]
    .filter(e => /<\/?[a-z]/i.test(e.textContent || ''))
    .map(e => (e.getAttribute('data-i18n') || e.getAttribute('data-i18n-html')));
  PRUEBAS.igual(crudos, [],
    '⚠️ estas cadenas muestran sus etiquetas como texto — usan `data-i18n` y llevan marcado: ' +
    crudos.join(', '));
  /* Y el discriminador: que el énfasis EXISTA. Si alguien "arregla" esto sacando los <b>, el caso
     de arriba pasaría igual y se habría perdido lo que hace legible la lista. */
  PRUEBAS.alMenos(ov.querySelectorAll('.priv-bloque b').length, 2,
    '⚠️ los "No recibe" van en negrita: son la parte que la persona necesita leer de un vistazo');
});

PRUEBAS.caso('los textos están en los dos idiomas y en neutro (R1, R14)', () => {
  ['priv_corta','priv_mas','priv_t','priv_intro','priv_sup_t','priv_sup_1','priv_sup_2','priv_sup_3',
   'priv_sup_4','priv_med_t','priv_med_1','priv_med_2','priv_med_3','priv_hseq_t','priv_hseq_1',
   'priv_hseq_2','priv_pie'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\bvos\b|tenés|querés|podés|mirá|fijate/.test(String(v)), '⚠️ R1: nunca voseo — ' + k);
  });
});

PRUEBAS.caso('⚠️ R2 · el aviso no declara a nadie apto ni no apto', () => {
  /* La regla más cara del proyecto. Un texto sobre privacidad es justo donde se cuela un "no apto"
     por descuido, porque habla de lo que el supervisor "ve" de la persona. */
  const todos = ['priv_corta','priv_intro','priv_sup_1','priv_sup_3','priv_med_3','priv_pie']
    .map(k => String(t(k) || '').toLowerCase()).join(' | ');
  ['no apto','no eres apto','inhabilitado','no puedes trabajar'].forEach(mala => {
    PRUEBAS.falso(todos.indexOf(mala) >= 0, '⚠️ no puede aparecer "' + mala + '"');
  });
  PRUEBAS.cierto(/determinación de aptitud|fitness determination/.test(String(t('priv_med_3')||'').toLowerCase()),
    'y sí decir que sólo el servicio médico firma una determinación, que es la doctrina del producto');
});
