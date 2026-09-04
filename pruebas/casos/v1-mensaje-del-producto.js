
PRUEBAS.grupo('V1 · el mensaje: factor humano y modelo predictivo');

/* ⚠️ R2 POR DELANTE DE TODO. Este prompt agrega texto de VENTA a la pantalla que más gente ve, y
   ahí es donde se cuela una promesa que sólo un médico puede firmar. Los casos de abajo empiezan
   por eso y después comprueban que el mensaje esté completo — en ese orden a propósito. */

PRUEBAS.caso('⚠️ R2 · nada del mensaje diagnostica ni declara aptitud', () => {
  const claves = ['spl_p1_t','spl_p1_d','spl_safte_t','spl_safte_d','spl_rt_t','spl_rt_d',
                  'spl_tele_t','spl_tele_d','test_i_kss','test_i_perelli','test_i_bai',
                  'test_i_generico','test_i_para'];
  const malas = ['no apto','apto para','diagnóstic','diagnostic','determina si','evalúa si estás',
                 'te califica','decide si puedes'];
  const encontradas = [];
  claves.forEach(k => {
    const v = String(t(k) || '').toLowerCase();
    malas.forEach(m => { if (v.indexOf(m) >= 0) encontradas.push(k + ' → "' + m + '"'); });
  });
  PRUEBAS.igual(encontradas, [],
    '⚠️ la app nunca declara aptitud ni diagnostica — ' + encontradas.join(', '));
});

PRUEBAS.caso('⚠️ y la telemedicina se SUGIERE, no se indica', () => {
  /* Derivar es un acto médico. Esta lámina la lee alguien que todavía no habló con nadie, y
     prometerle una derivación es prometer algo que la app no puede dar. */
  const v = String(t('spl_tele_d') || '').toLowerCase();
  PRUEBAS.cierto(/sugerir|suggest/.test(v), '⚠️ tiene que decir que se SUGIERE');
  PRUEBAS.cierto(/decide/.test(v), '⚠️ y que la persona decide');
  ['te deriva','se te deriva','indica una consulta','ordena'].forEach(m =>
    PRUEBAS.falso(v.indexOf(m) >= 0, '⚠️ no puede decir "' + m + '"'));
});

PRUEBAS.caso('⚠️ el factor humano se nombra, y va PRIMERO', () => {
  /* Es el marco de todo el producto: dónde está el riesgo. Todo lo demás —el modelo, las escalas,
     el tiempo real— es cómo se vigila eso, y sin esta lámina el resto queda sin sujeto. */
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  PRUEBAS.alMenos(slides.length, 4, 'guarda de medibilidad: tiene que haber láminas');
  const primera = slides[0] && slides[0].querySelector('.spl-p-tx b');
  PRUEBAS.cierto(!!primera && /factor humano|human factor/i.test(primera.textContent || ''),
    '⚠️ la primera lámina tiene que ser el factor humano — dice: ' +
    (primera ? primera.textContent.trim() : 'nada'));
});

PRUEBAS.caso('⚠️ SAFTE sigue segunda, y ahora nombra las TRES patas', () => {
  /* El puesto está tomado por pedido explícito de Franco y esa decisión no se revierte sola: el
     plan pedía "tiempo real en segundo lugar" y se resolvió poniéndola tercera.
     Las tres patas son lo que distingue este modelo de una encuesta: lo que la persona siente, lo
     que se mide, y el modelo que las cruza. */
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  const segunda = slides[1] && slides[1].querySelector('.spl-p-tx b');
  PRUEBAS.cierto(!!segunda && /safte/i.test(segunda.textContent || ''),
    '⚠️ SAFTE va segunda — dice: ' + (segunda ? segunda.textContent.trim() : 'nada'));
  const d = String(t('spl_safte_d') || '').toLowerCase();
  PRUEBAS.cierto(/siente|feels/.test(d), '⚠️ la pata subjetiva: lo que la persona siente');
  /* La pata objetiva se comprueba por sus FUENTES —sueño y reacción— y no por el verbo "medir":
     ese verbo está prohibido en esta lámina por R2, porque el modelo estima la efectividad, no la
     mide. Hay un caso de M5 que lo vigila y tiene razón. */
  PRUEBAS.cierto(/sueño|sleep/.test(d) && /reacci|reaction/.test(d),
    '⚠️ la objetiva: las horas de sueño y el test de reacción');
  PRUEBAS.cierto(/biomatem|biomathemat/.test(d), '⚠️ y la biomatemática, que es la que cruza las dos');
});

PRUEBAS.caso('⚠️ el objetivo es la FRANJA ÓPTIMA, no un puntaje', () => {
  /* Es la diferencia entre un programa de gestión y un examen. Aparece en las dos puntas: en el
     splash, para quien evalúa el producto, y en el test, para quien lo está usando. */
  const enSplash = /franja óptima|optimal range/i.test(String(t('spl_safte_d') || ''));
  const enTest   = /franja óptima|optimal range/i.test(String(t('test_i_para') || ''));
  PRUEBAS.cierto(enSplash, '⚠️ tiene que estar en el splash');
  PRUEBAS.cierto(enTest, '⚠️ y en el test, que es donde la persona duda de para qué es esto');
});

PRUEBAS.caso('⚠️ el tiempo real y la telemedicina están, y entre las primeras', () => {
  /* Nadie mira las nueve láminas: el carrusel corre 28,8 s y la gente toca Ingresar antes. Por eso
     el ORDEN es lo que se fija, no la presencia a secas — una lámina novena es una lámina que no
     existe. */
  const titulos = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide .spl-p-tx b')]
    .map(b => (b.textContent || '').toLowerCase());
  const iRt = titulos.findIndex(x => /tiempo real|live operations/.test(x));
  const iTele = titulos.findIndex(x => /médicos|doctors/.test(x));
  PRUEBAS.alMenos(iRt, 0, '⚠️ falta la lámina de operación en tiempo real');
  PRUEBAS.alMenos(iTele, 0, '⚠️ falta la de telemedicina');
  PRUEBAS.comoMucho(iRt, 3, '⚠️ el tiempo real tiene que estar entre las primeras cuatro');
  PRUEBAS.comoMucho(iTele, 4, '⚠️ y la telemedicina entre las primeras cinco');
});

PRUEBAS.caso('⚠️ la telemedicina nombra a Aeroambulancias Silva', () => {
  /* Pedido explícito del plan: es lo que conecta el programa con la atención médica real y lo que
     separa esto de un tablero. */
  PRUEBAS.cierto(/aeroambulancias silva/i.test(String(t('spl_tele_d') || '')),
    '⚠️ tiene que nombrarla');
});

PRUEBAS.caso('⚠️ cada test dice qué instrumento es, en los siete flujos', () => {
  const sin = [];
  ['perelli','kss','estres','ansiedad','gastro','cansancio', null].forEach(f => {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    try {
      abrirTest({ testFlow: f, id:'x', titulo:'T' });
      const el = document.getElementById('testInstr');
      if (!el || !(el.textContent || '').trim()) sin.push(f || '(genérico)');
    } catch(e){ sin.push((f || '(genérico)') + ' → ' + e.message); }
  });
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  PRUEBAS.igual(sin, [], '⚠️ falta la línea del instrumento en: ' + sin.join(', '));
});

PRUEBAS.caso('⚠️ y NO se afirma "validado internacionalmente" de lo que no se verificó', () => {
  /* KSS, Samn-Perelli y el BAI son escalas publicadas y el splash ya las nombra. De las otras tres
     no verifiqué la procedencia: decirlo igual sería el mismo defecto que X1 vino a evitar, del
     otro lado del producto. El genérico dice para qué sirve y nada más. */
  const gen = String(t('test_i_generico') || '').toLowerCase();
  ['validad','internacional','clínic','publicad'].forEach(p =>
    PRUEBAS.falso(gen.indexOf(p) >= 0,
      '⚠️ el texto genérico no puede afirmar "' + p + '…" — dice: ' + gen));
  PRUEBAS.cierto(/kss/.test(String(t('test_i_kss') || '').toLowerCase()), 'y el de KSS sí lo nombra');
  PRUEBAS.cierto(/perelli/.test(String(t('test_i_perelli') || '').toLowerCase()), 'y el de Samn-Perelli también');
});

PRUEBAS.caso('los textos nuevos están en los dos idiomas y en neutro (R1, R14)', () => {
  ['spl_p1_t','spl_p1_d','spl_rt_t','spl_rt_d','spl_rt_chip','spl_tele_t','spl_tele_d',
   'spl_tele_chip','test_i_kss','test_i_perelli','test_i_bai','test_i_generico','test_i_para'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\bvos\b|tenés|querés|podés|sentís/.test(String(v)), '⚠️ R1: nunca voseo — ' + k);
  });
});
