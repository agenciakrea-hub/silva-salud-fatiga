PRUEBAS.grupo('P195 + P196 (2026-09-21) · el escenario del PVT con tokens fijos · el informe de ejemplo en el idioma de la app');

/* P195 · `.pvt-stage` (#0e2a56), `.pvt-msg`/`.pvt-circle`/`.pvt-demo-tap` (#fff), la demo animada (#13316a/#0a1f40) y
   `pvtFlash` (#e8a400/#38d39f/#fff) eran los últimos colores a mano que dejó el barrido de P191 — no dependen del tema,
   así que el auditor de contraste no los ve. Pasan a tokens con el MISMO valor en los dos temas, sin cambiar un píxel.
   P196 · el texto del informe de ejemplo de la demostración quedaba en español con la app en inglés. */

PRUEBAS.caso('🔴 P195 · el escenario del PVT vale lo mismo en los dos temas y sale de tokens (fondo navy, tinta blanca, verde y ámbar de siempre)', () => {
  const html = document.documentElement, prev = html.getAttribute('data-tema');
  const stage = document.getElementById('pvtStage'), msg = document.getElementById('pvtMsg');
  try {
    ['claro', 'oscuro'].forEach(tema => {
      html.setAttribute('data-tema', tema);
      PRUEBAS.igual(getComputedStyle(stage).backgroundColor, 'rgb(14, 42, 86)', tema + ' · fondo del escenario = #0e2a56 (el de siempre)');
      PRUEBAS.igual(getComputedStyle(stage).backgroundColor, CTX.token('var(--pvt-stage)'), tema + ' · y sale del token --pvt-stage');
      PRUEBAS.igual(getComputedStyle(msg).color, 'rgb(255, 255, 255)', tema + ' · la tinta del mensaje es blanca');
      PRUEBAS.igual(CTX.token('var(--pvt-stage-ok)'), 'rgb(56, 211, 159)', tema + ' · --pvt-stage-ok = #38d39f');
      PRUEBAS.igual(CTX.token('var(--pvt-stage-lento)'), 'rgb(232, 164, 0)', tema + ' · --pvt-stage-lento = #e8a400');
      PRUEBAS.igual(CTX.token('var(--pvt-demo-1)') + ' ' + CTX.token('var(--pvt-demo-2)'), 'rgb(19, 49, 106) rgb(10, 31, 64)', tema + ' · el degradé de la demo animada');
      PRUEBAS.cierto(CTX.contraste('rgb(14, 42, 86)', 'rgb(255, 255, 255)') >= 4.5 && CTX.contraste('rgb(14, 42, 86)', 'rgb(56, 211, 159)') >= 4.5 && CTX.contraste('rgb(14, 42, 86)', 'rgb(232, 164, 0)') >= 4.5, tema + ' · las tres tintas pasan 4,5:1 sobre el navy');
    });
  } finally { if (prev == null) html.removeAttribute('data-tema'); else html.setAttribute('data-tema', prev); }
});

PRUEBAS.caso('🔴 P195 · pvtFlash pinta con el token y al volver SACA el color en línea (manda la regla .pvt-msg); ni un #hex en el PVT', async () => {
  const msg = document.getElementById('pvtMsg'), circ = document.getElementById('pvtCircle');
  const txt = msg.textContent, circDisp = circ.style.display, colorAntes = msg.style.color;
  try {
    pvtFlash('123 ms', 'var(--pvt-stage-ok)');
    PRUEBAS.igual(getComputedStyle(msg).color, 'rgb(56, 211, 159)', '🔴 el mensaje se pinta con --pvt-stage-ok (a tiempo)');
    pvtFlash('456 ms', 'var(--pvt-stage-lento)');
    PRUEBAS.igual(getComputedStyle(msg).color, 'rgb(232, 164, 0)', 'y con --pvt-stage-lento (lapso)');
    /* la vuelta al blanco: 450 ms reales, estrangulados a ~1 s en la pestaña oculta de la suite — se espera la CONDICIÓN, no el reloj */
    await PRUEBAS.esperarA(() => msg.style.color === '', 4000);
    PRUEBAS.igual(msg.style.color, '', '🔴 al volver, el color en línea se saca (antes: style.color = "#fff" a mano)');
    PRUEBAS.igual(getComputedStyle(msg).color, 'rgb(255, 255, 255)', 'y manda la regla .pvt-msg: blanco');
  } finally { msg.textContent = txt; msg.style.color = colorAntes; circ.style.display = circDisp; }
  /* la fuente: el llamador real pasa los tokens, y ninguna regla del PVT ni pvtFlash trae un color a mano */
  const src = await (await fetch('/index.html?v=' + Date.now())).text();
  PRUEBAS.cierto(src.indexOf("pvtFlash(rt + ' ms', rt > PVT_LAPSE_MS ? 'var(--pvt-stage-lento)' : 'var(--pvt-stage-ok)')") > 0, '🔴 pvtTap le pasa los tokens a pvtFlash (no #e8a400 / #38d39f)');
  const reglas = ['.pvt-stage {', '.pvt-msg {', '.pvt-circle {', '.pvt-demo-screen {', '.pvt-demo-wait {', '.pvt-demo-tap {'];
  reglas.forEach(r => {
    const i = src.indexOf('\n  ' + r); const linea = src.slice(i, src.indexOf('}', i));
    PRUEBAS.cierto(i > 0 && !/#[0-9a-fA-F]{3,8}\b/.test(linea), 'sin #hex en ' + r.replace(' {', ''));
  });
  const iF = src.indexOf('\nfunction pvtFlash('); const cuerpo = src.slice(iF, src.indexOf('\nfunction ', iF + 10));
  PRUEBAS.cierto(iF > 0 && !/#[0-9a-fA-F]{3,8}\b/.test(cuerpo), 'sin #hex en pvtFlash');
  /* DISCRIMINADOR · el detector caza un #hex si lo hubiera */
  PRUEBAS.cierto(/#[0-9a-fA-F]{3,8}\b/.test('.pvt-msg { color: #fff; }'), 'DISCRIMINADOR · el detector ve un #fff');
});

PRUEBAS.caso('🔴 P196 · el informe de ejemplo de la demostración se pinta en el idioma de la app (dashInformeCard → dashMdLite)', () => {
  const prev = idiomaActual(), prevDash = DASH;
  try {
    DASH = DASH || { _infExp: {} };
    DASH._infExp = DASH._infExp || {}; DASH._infExp[INFORME_DEMO.id] = true;   // desplegado: se pinta el cuerpo
    fijarIdioma('en');
    const d = document.createElement('div'); d.innerHTML = dashInformeCard(INFORME_DEMO);
    const en = d.textContent;
    PRUEBAS.cierto(en.indexOf('Executive Report on Psychosocial Risk and Fatigue Analysis') >= 0, '🔴 en inglés el título del informe está en inglés');
    PRUEBAS.cierto(en.indexOf('Informe Ejecutivo') < 0 && en.indexOf('Recomendaciones') < 0, 'y no queda español');
    PRUEBAS.cierto(en.indexOf('Share report') >= 0 && en.indexOf('Sample report') >= 0, 'con «Share report» y la fecha «Sample report»');
    fijarIdioma('es');
    d.innerHTML = dashInformeCard(INFORME_DEMO);
    PRUEBAS.cierto(d.textContent.indexOf('Informe Ejecutivo de Análisis de Riesgo Psicosocial y Fatiga') >= 0 && d.textContent.indexOf('Recomendaciones concretas') >= 0, 'DISCRIMINADOR · en español sigue en español');
    PRUEBAS.igual(t('inf_demo_texto').split('\n').length, 28, 'guarda: 28 líneas en es');
    fijarIdioma('en');
    PRUEBAS.igual(t('inf_demo_texto').split('\n').length, 28, 'guarda: 28 líneas en en (misma estructura de markdown)');
  } finally { fijarIdioma(prev); DASH = prevDash; }
});
