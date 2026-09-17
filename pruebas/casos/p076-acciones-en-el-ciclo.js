/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P076 · I1-c (hallazgo 2) · LA TARJETA DEL CICLO LLEVA LAS ACCIONES DEL SUPERVISOR (2026-09-17)

   La tarjeta tenía UNA interacción: saltar a Aptitud, donde la persona podía no estar (Aptitud se arma
   con los TESTS; el ciclo, con los eventos). Ahora la tarjeta lleva «Restringir tarea» / «Levantar
   restricción» y «Sugerir telemedicina» —las mismas funciones, por `aptAccionesHtml`—, `restAbrir`
   ya no tira si la persona no tiene tests, y Aptitud con una persona elegida y sin tests muestra un
   bloque con su nombre y las acciones en vez del vacío genérico. Camino real (R17): `onDashData`,
   `renderCicloOperativo()`, `restAbrir` → `restGuardar` → `restLevantar`, `renderAptitud()`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P076_HOY = new Date().toISOString().slice(0, 10);
function p076Ev(evento, minAtras, persona){
  const iso = new Date(Date.now() - minAtras * 60000).toISOString();
  return { evento, iso, persona: persona || 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: iso.slice(0, 10) };
}
/* Entra al panel SIN RED. `conTests`: si Ana tiene un test en el período o no (el hallazgo es «no»). */
function p076Entrar(vista, opts){
  opts = opts || {};
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {});
  window.gestPost = () => Promise.resolve({ ok: true });
  const registros = [{ persona: 'Luis Ferrer', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P076_HOY, kss: 3 }];
  if (opts.conTests) registros.push({ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: P076_HOY, kss: 7 });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: vista, combinada: false, referencia: {}, metricas: ['kss'],
    registros: registros, comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null, ausencias: {},
    operacional: [p076Ev('salida_casa', 600), p076Ev('llegada_aero', 540)],   // Ana: en jornada desde hace 9 h
    config: {}, visor: null, visorError: null
  }, opts.extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', Object.assign({ action: 'supervisor', usuario: 'usuario-p076', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p076' }, opts.params || {}), vista);
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){
    window.gestPost = oPost; DASH = prevDash;
    try { document.getElementById('restrOverlay').classList.remove('show'); } catch (e) {}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    try { if (typeof _restCache !== 'undefined') _restCache = null; } catch (e) {}
    /* `restGuardar` arma `_gestSyncT`/`_bitSyncT` (700/900 ms): sin apagarlos, dispararían gestPush/bitPush
       con el DASH que quede después (verificador). */
    try { clearTimeout(_gestSyncT); clearTimeout(_bitSyncT); } catch (e) {}
  };
}
function p076Tarjeta(html, persona){
  const cont = document.createElement('div'); cont.innerHTML = html;
  return [...cont.querySelectorAll('.cic-card')].find(c => (c.querySelector('.cic-nom') || {}).textContent === persona) || null;
}

PRUEBAS.caso('🔴 P076 · la tarjeta del ciclo del supervisor lleva «Restringir tarea» y «Sugerir telemedicina», por t()', () => {
  const fin = p076Entrar('supervisor');
  try {
    const card = p076Tarjeta(renderCicloOperativo(), 'Ana Suárez');
    PRUEBAS.cierto(!!card, 'guarda: la tarjeta de Ana está (tiene ciclo en curso y NINGÚN test)');
    const acc = card && card.querySelector('.apt-acciones');
    PRUEBAS.cierto(!!acc, '🔴 la tarjeta lleva la fila de acciones');
    const textos = acc ? [...acc.querySelectorAll('button')].map(b => b.textContent) : [];
    PRUEBAS.igual(textos, [t('apt_act_restringir'), t('apt_act_telem')], 'con los dos botones, por t() (antes estaban a mano en Aptitud)');
    PRUEBAS.cierto(/restAbrir\(/.test(acc.innerHTML) && /telemSugerirDesde\(/.test(acc.innerHTML), 'y llaman a las funciones que ya existían');
  } finally { fin(); }
});

PRUEBAS.caso('P076 · médico, Dirección y el visor NO ven acciones en el ciclo (discriminador)', () => {
  const med = p076Entrar('medico');
  try { PRUEBAS.igual((p076Tarjeta(renderCicloOperativo(), 'Ana Suárez') || { querySelector: () => null }).querySelector('.apt-acciones'), null, 'médico: sin acciones (restringir es del supervisor)'); }
  finally { med(); }
  const vis = p076Entrar('supervisor', { extra: { rol: 'admin', visor: { empresa: 'Consorcio HELITEC', vista: 'supervisor' } }, params: { usuario: '*', verEmpresa: 'Consorcio HELITEC', verVista: 'supervisor' } });
  try {
    PRUEBAS.cierto(visorSoloLectura(), 'guarda: estamos en el visor');
    PRUEBAS.igual((p076Tarjeta(renderCicloOperativo(), 'Ana Suárez') || { querySelector: () => null }).querySelector('.apt-acciones'), null, 'visor: sin acciones');
  } finally { vis(); }
});

PRUEBAS.caso('🔴 P076 · restringir desde el ciclo a alguien SIN tests: el formulario abre (antes tiraba), guarda por el camino real y la tarjeta pasa a «Levantar»', () => {
  const fin = p076Entrar('supervisor');
  const oC = window.confirm, oH = window.haptic, oT = window.showToast;
  window.confirm = () => true; window.haptic = () => {}; window.showToast = () => {};
  try {
    let tiro = null;
    try { restAbrir('Ana Suárez'); } catch (e) { tiro = e.message; }
    PRUEBAS.igual(tiro, null, '🔴 restAbrir no tira aunque Ana no tenga tests (hacía p.nivel con p undefined)');
    const ov = document.getElementById('restrOverlay');
    PRUEBAS.cierto(ov && ov.classList.contains('show'), 'el overlay se abrió');
    PRUEBAS.cierto(/Ana Su/.test(document.getElementById('restrBody').textContent), 'con su nombre');
    PRUEBAS.cierto(document.getElementById('restrBody').textContent.indexOf('Operaciones') >= 0, 'y su departamento, sacado del ciclo (no hay test de dónde sacarlo)');
    document.getElementById('restrTarea').value = 'Vuelo nocturno';
    restGuardar();
    const r = restVigentesDe('Ana Suárez')[0];
    PRUEBAS.cierto(!!r && r.tarea === 'Vuelo nocturno', '🔴 la restricción quedó guardada por restGuardar()');
    PRUEBAS.igual(r && r.departamento, 'Operaciones', 'con el departamento del ciclo');
    PRUEBAS.cierto(bitacoraDe('Ana Suárez', 'restriccion_tarea').length >= 1, 'y en la bitácora (R3)');
    const card = p076Tarjeta(renderCicloOperativo(), 'Ana Suárez');
    const textos = [...card.querySelector('.apt-acciones').querySelectorAll('button')].map(b => b.textContent);
    PRUEBAS.igual(textos[0], t('apt_act_levantar'), '🔴 la tarjeta pasa a «Levantar restricción»');
    restLevantar(r.id);
    PRUEBAS.igual(restVigentesDe('Ana Suárez').length, 0, 'y levantar la levanta (con su confirm)');
    PRUEBAS.igual([...p076Tarjeta(renderCicloOperativo(), 'Ana Suárez').querySelector('.apt-acciones').querySelectorAll('button')][0].textContent, t('apt_act_restringir'), 'vuelve a «Restringir»');
  } finally { window.confirm = oC; window.haptic = oH; window.showToast = oT; fin(); }
});

PRUEBAS.caso('🔴 P076 · Aptitud con una persona elegida y SIN tests ya no es un vacío: nombre, motivo y acciones', () => {
  const fin = p076Entrar('supervisor');
  try {
    DASH.f.per = 'Ana Suárez';
    const html = renderAptitud(dashFiltered());
    PRUEBAS.cierto(html.indexOf('Ana Su') >= 0, '🔴 dice de quién se trata');
    PRUEBAS.cierto(html.indexOf(esc(t('apt_sin_tests_periodo'))) >= 0, 'y por qué no hay ficha');
    PRUEBAS.cierto(/apt-acciones/.test(html) && html.indexOf(esc(t('apt_act_restringir'))) >= 0, '🔴 con las acciones');
    PRUEBAS.falso(/dash-vacio|vac_personas/.test(html) && html.indexOf(esc(t('apt_sin_tests_periodo'))) < 0, 'sin el vacío genérico');
    /* discriminador: con tests, la ficha de siempre */
    DASH.f.per = 'Luis Ferrer';
    const h2 = renderAptitud(dashFiltered());
    PRUEBAS.cierto(/apt-card/.test(h2) && h2.indexOf(esc(t('apt_sin_tests_periodo'))) < 0, 'con tests se muestra la ficha de Aptitud de siempre');
  } finally { fin(); }
});

PRUEBAS.caso('P076 · con tests, la tarjeta de Aptitud sigue teniendo sus acciones (misma función) y la telemedicina confirma por t()', () => {
  const fin = p076Entrar('supervisor', { conTests: true });
  const oC = window.confirm, oH = window.haptic, oT = window.showToast; let pregunta = null;
  window.confirm = m => { pregunta = String(m); return false; }; window.haptic = () => {}; window.showToast = () => {};
  try {
    DASH.f.per = 'Ana Suárez';
    const html = renderAptitud(dashFiltered());
    PRUEBAS.cierto(/apt-card/.test(html) && html.indexOf(esc(t('apt_act_restringir'))) >= 0 && html.indexOf(esc(t('apt_act_telem'))) >= 0, 'la tarjeta de Aptitud lleva los botones por t()');
    telemSugerirDesde('Ana Suárez');
    PRUEBAS.igual(pregunta, t('telem_sugerir_q', { p: 'Ana Suárez' }), 'la confirmación sale de t() (estaba a mano)');
    PRUEBAS.igual(telemVigenteDe('Ana Suárez'), null, 'y sin confirmar no se sugiere');
  } finally { window.confirm = oC; window.haptic = oH; window.showToast = oT; fin(); }
});

/* ── LO QUE ENCONTRÓ EL VERIFICADOR DE P076 ───────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P076 · restringir desde el ciclo usa el nivel de riesgo REAL de la persona (tope y umbral de la bitácora), no el default', () => {
  /* Ana no tiene tests en el período pero su departamento es nivel 5 en «Niveles Riesgo»: el tope de horas y
     el umbral que queda en la bitácora tienen que ser los de nivel 5, no los de nivel 3. */
  const fin = p076Entrar('supervisor', { extra: { niveles: [
    { empresa: '', departamento: 'Operaciones', cargo: '', persona: '', nivel: 5 },
    { empresa: '', departamento: '', cargo: '', persona: '', nivel: 3 }] } });
  const oC = window.confirm, oH = window.haptic, oT = window.showToast;
  window.confirm = () => true; window.haptic = () => {}; window.showToast = () => {};
  try {
    PRUEBAS.igual(nivelRiesgoDe('Ana Suárez', 'Operaciones', 'Consorcio HELITEC', 'Piloto'), 5, 'guarda: por departamento, Ana es nivel 5');
    PRUEBAS.igual(personaNivelDe('Ana Suárez'), 5, '🔴 el nivel de Ana se resuelve por su contexto del ciclo');
    restAbrir('Ana Suárez');
    const cuerpo = document.getElementById('restrBody').textContent;
    PRUEBAS.cierto(cuerpo.indexOf(t('riesgo_n', { n: nivelLabel(5) })) >= 0, '🔴 el formulario dice nivel 5 (antes: el default) · ' + cuerpo.slice(0, 120));
    PRUEBAS.igual(RESTR.horas, restDuracionesPara(5)[0], 'y las duraciones son las del nivel 5');
    PRUEBAS.cierto(restDuracionesPara(5).every(h => h <= nivelInfo(5).maxRestrH), 'ninguna pasa el tope del nivel 5');
    document.getElementById('restrTarea').value = 'Vuelo nocturno';
    restGuardar();
    const ev = bitacoraDe('Ana Suárez', 'restriccion_tarea')[0];
    PRUEBAS.cierto(!!ev && ev.umbral && ev.umbral.nivel === 5, '🔴 la bitácora registra el umbral del nivel 5 (R3) · ' + JSON.stringify(ev && ev.umbral));
    const r = restVigentesDe('Ana Suárez')[0];
    PRUEBAS.cierto(!!r && r.horas <= nivelInfo(5).maxRestrH, 'y la restricción no pasa el tope');
    /* discriminador: sin la fila de nivel 5, cae al default */
  } finally { window.confirm = oC; window.haptic = oH; window.showToast = oT; fin(); }
  const fin2 = p076Entrar('supervisor');
  try { PRUEBAS.igual(personaNivelDe('Ana Suárez'), NIVEL_DEFAULT, 'DISCRIMINADOR · sin filas de nivel, el default'); }
  finally { fin2(); }
});

PRUEBAS.caso('P076 · sobre un último test poco confiable la tarjeta del ciclo NO ofrece telemedicina (lo que promete la ayuda de Aptitud)', () => {
  const fin = p076Entrar('supervisor', { extra: { aptitud: [{ nombre: 'Ana Suárez', dep: 'Operaciones', n: 1, nivel: 3, ultimoPocoConfiable: true, pocoConfiable: 1, auto: 'ok' }] } });
  try {
    const card = p076Tarjeta(renderCicloOperativo(), 'Ana Suárez');
    const textos = [...card.querySelector('.apt-acciones').querySelectorAll('button')].map(b => b.textContent);
    PRUEBAS.igual(textos, [t('apt_act_restringir')], 'sólo «Restringir»: sin el botón de telemedicina');
  } finally { fin(); }
  const fin2 = p076Entrar('supervisor');
  try {
    const textos = [...p076Tarjeta(renderCicloOperativo(), 'Ana Suárez').querySelector('.apt-acciones').querySelectorAll('button')].map(b => b.textContent);
    PRUEBAS.igual(textos.length, 2, 'DISCRIMINADOR · sin ese dato, los dos botones');
  } finally { fin2(); }
});

PRUEBAS.caso('P076 · la telemedicina sugerida desde el ciclo guarda el departamento del ciclo; el contexto de la bitácora también cae al ciclo', () => {
  const fin = p076Entrar('supervisor');
  const oC = window.confirm, oH = window.haptic, oT = window.showToast;
  window.confirm = () => true; window.haptic = () => {}; window.showToast = () => {};
  try {
    PRUEBAS.igual(bitContextoDe('Ana Suárez').dep, 'Operaciones', 'bitContextoDe sin tests: el departamento del ciclo');
    telemSugerirDesde('Ana Suárez');
    const tm = telemVigenteDe('Ana Suárez');
    PRUEBAS.cierto(!!tm && tm.departamento === 'Operaciones', 'la telemedicina lleva el departamento del ciclo · ' + JSON.stringify(tm && tm.departamento));
  } finally { window.confirm = oC; window.haptic = oH; window.showToast = oT; fin(); }
});
