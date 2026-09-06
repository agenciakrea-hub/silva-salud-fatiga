PRUEBAS.grupo('P042 · "Retomamos donde ibas"');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   R4 decía sólo "funciona raro. Primero REPRODUCIR cuándo aparece y qué hace; después decidir si
   se arregla o se saca. No lo toco a ciegas."

   Se reprodujo en el recorrido real, cronometrado:
     ·     1 ms → se pinta el paso de EMPRESA. La lista está a la vista y se puede tocar.
     · 3.353 ms → sale el toast "Retomamos donde ibas"… **todavía en el paso de empresa**.
     · 6.524 ms → recién ahí salta al paso de PERSONA.

   O sea tres cosas mal a la vez, y ninguna es el mensaje en sí:

   1 · **El aviso llegaba 3,2 segundos antes del cambio, y en la pantalla anterior.** Anunciaba
       algo que todavía no había pasado.
   2 · **Durante 6,5 segundos la pantalla de empresas es interactiva.** Quien eligiera otra empresa
       en ese rato veía cómo la app se la cambiaba sola por la de ayer, sin avisar.
   3 · **Ni el toast ni la pantalla decían QUÉ se retomó.** "Retomamos donde ibas" no dice dónde:
       quien probó con otra empresa el día anterior no tenía forma de notar que estaba mirando la
       lista equivocada.

   Se arregló, no se sacó: retomar un alta a medio hacer es útil — vence a las 24 h y ya descarta
   sola una empresa que salió de la nómina. Lo que estaba mal era CUÁNDO y CON QUÉ avisa.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p042Estado(fn){
  const prev = { emp:NOM.empresa, per:NOM.persona, perfiles:NOM.perfiles, ret:NOM._retomando,
                 paso:NOM.paso, cod:NOM.codigo, pide:NOM.pideCodigo };
  const g = localStorage.getItem(K_ALTA_PROGRESO);
  try { return fn(); }
  finally {
    NOM.empresa=prev.emp; NOM.persona=prev.per; NOM.perfiles=prev.perfiles;
    NOM._retomando=prev.ret; NOM.paso=prev.paso; NOM.codigo=prev.cod; NOM.pideCodigo=prev.pide;
    if (g === null) localStorage.removeItem(K_ALTA_PROGRESO); else localStorage.setItem(K_ALTA_PROGRESO, g);
  }
}
function p042Progreso(empresa, extra){
  localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify(Object.assign(
    { empresa:empresa, codigo:'', persona:'', pideCodigo:false, perfil:null, ts:Date.now() }, extra||{})));
}

PRUEBAS.caso('⚠️ si la persona YA eligió una empresa, no se le cambia', () => {
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC');
    NOM.perfiles = { 'Consorcio HELITEC': null, 'Otra Empresa': null };
    NOM.empresa = 'Otra Empresa';              // lo que acaba de tocar, mientras cargaba la lista
    const o = window.showToast; let toast = null; window.showToast = m => { toast = String(m); };
    try { nominaRetomar(); } finally { window.showToast = o; }
    return { empresa: NOM.empresa, toast: toast };
  });
  PRUEBAS.igual(r.empresa, 'Otra Empresa',
    '⚠️ manda lo que la persona eligió · la app se la cambiaba sola por la de ayer, sin avisar');
  PRUEBAS.igual(r.toast, null, 'y no avisa de un cambio que no hizo');
});

PRUEBAS.caso('el DISCRIMINADOR: sin elección previa SÍ retoma', () => {
  /* Sin esto, un arreglo que apagara el retomar entero daría verde arriba y habría sacado una
     función útil en vez de arreglarla. */
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC');
    NOM.perfiles = { 'Consorcio HELITEC': null };
    NOM.empresa = ''; NOM.persona = ''; NOM._retomando = '';
    const o = window.nominaCargarPersonas; let pidio = false;
    window.nominaCargarPersonas = () => { pidio = true; };
    try { nominaRetomar(); } finally { window.nominaCargarPersonas = o; }
    return { empresa: NOM.empresa, pidio: pidio, aviso: NOM._retomando };
  });
  PRUEBAS.igual(r.empresa, 'Consorcio HELITEC', 'toma la empresa guardada');
  PRUEBAS.igual(r.pidio, true, 'y salta a la lista de personas');
  PRUEBAS.igual(r.aviso, 'Consorcio HELITEC', 'dejando el aviso listo, con el nombre adentro');
});

PRUEBAS.caso('⚠️ el aviso sale EN la pantalla nueva, no en la anterior', () => {
  /* Salía 3,2 s antes del cambio. Ahora lo consume `nominaPaso()`, así que no puede adelantarse:
     si el paso no cambia, no hay aviso. */
  const r = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; const vistos = [];
    window.showToast = m => vistos.push({ msg: String(m), paso: NOM.paso });
    try {
      nominaPaso('empresa');                    // la pantalla anterior: NO tiene que avisar
      const enEmpresa = vistos.length;
      nominaPaso('persona');                    // la pantalla a la que se salta: acá sí
      return { enEmpresa: enEmpresa, vistos: vistos };
    } finally { window.showToast = o; }
  });
  PRUEBAS.igual(r.enEmpresa, 0, '⚠️ en el paso de empresa NO avisa · ahí es donde salía antes');
  PRUEBAS.igual(r.vistos.length, 1, 'avisa una sola vez');
  PRUEBAS.igual(r.vistos[0].paso, 'persona', 'y en la pantalla nueva');
});

PRUEBAS.caso('⚠️ el aviso dice QUÉ empresa se retomó', () => {
  const r = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; let msg = '';
    window.showToast = m => { msg = String(m); };
    try { nominaPaso('persona'); } finally { window.showToast = o; }
    return msg;
  });
  PRUEBAS.cierto(r.indexOf('Consorcio HELITEC') >= 0,
    '⚠️ el nombre está en el aviso · "Retomamos donde ibas" a secas no dice DÓNDE · decía «' + r + '»');
});

PRUEBAS.caso('no se repite: se avisa una vez y se consume', () => {
  const n = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; let c = 0; window.showToast = () => c++;
    try { nominaPaso('persona'); nominaPaso('cedula'); nominaPaso('persona'); }
    finally { window.showToast = o; }
    return c;
  });
  PRUEBAS.igual(n, 1, 'un solo aviso aunque se navegue entre pasos');
});

PRUEBAS.caso('un alta guardada de una empresa que ya no está se descarta', () => {
  /* Comportamiento que YA existía y que no se tocó. Está acá porque es lo que más fácil se rompe
     al meter mano en esta función: sin él, alguien queda atrapado en un paso de una empresa que
     no existe. */
  const r = p042Estado(() => {
    p042Progreso('Empresa Que Se Fue');
    NOM.perfiles = { 'Consorcio HELITEC': null };
    NOM.empresa = ''; NOM._retomando = '';
    nominaRetomar();
    return { empresa: NOM.empresa, quedo: localStorage.getItem(K_ALTA_PROGRESO) };
  });
  PRUEBAS.igual(r.empresa, '', 'no retoma una empresa que salió de la nómina');
  PRUEBAS.igual(r.quedo, null, 'y borra el progreso en vez de dejarlo colgado');
});

PRUEBAS.caso('un alta de hace más de 24 h se descarta', () => {
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC', { ts: Date.now() - 25 * 3600000 });
    NOM.perfiles = { 'Consorcio HELITEC': null };
    NOM.empresa = ''; NOM._retomando = '';
    nominaRetomar();
    return NOM.empresa;
  });
  PRUEBAS.igual(r, '', 'lo de anteayer no se retoma · vence a las 24 h');
});

PRUEBAS.caso('los dos idiomas llevan el hueco del nombre', () => {
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  const t2 = {};
  try { ['es','en'].forEach(l => { fijarIdioma(l); t2[l] = t('nom_retomamos', { e: 'ACME' }); }); }
  finally { fijarIdioma(antes); }
  PRUEBAS.cierto(t2.es.indexOf('ACME') >= 0, 'español: «' + t2.es + '»');
  PRUEBAS.cierto(t2.en.indexOf('ACME') >= 0, 'inglés: «' + t2.en + '»');
  PRUEBAS.falso(/\{e\}/.test(t2.es + t2.en), 'y el hueco se reemplaza, no queda a la vista');
});
