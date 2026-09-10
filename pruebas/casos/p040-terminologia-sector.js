PRUEBAS.grupo('P040 · terminología por sector (R14)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   R14: ningún término de sector se escribe a mano. Todo texto visible pasa por `t()`, que resuelve
   por **idioma × sector**, con la cadena sector específico → sector genérico → bloque común.

   P040 era un prompt de VERIFICACIÓN. Lo que se midió antes de tocar nada, y lo que salió:

   1 · El sector SÍ se fija desde el CH y SÍ se actualiza sin reinstalar — por los dos caminos
       (`sectorRefrescar()` al arrancar y `onDashData` al abrir el panel). Verificado sobre el DOM,
       no sobre la función: con el servidor diciendo `planta`, la pantalla pasó de "Llegando al
       aeropuerto" a "Llegando a la planta".
       ⚠️ Pero el camino del PANEL tenía un agujero: `sectorActual()` mira `DASH._cfg.sector`
       PRIMERO, así que al abrir una empresa de otro sector el sector cambiaba de golpe y lo que ya
       estaba pintado afuera del panel NO se repintaba. Medido: `t('op_lleg_sitio')` devolvía
       "Llegando al sitio de trabajo" mientras `#sections` seguía diciendo "Llegando al aeropuerto".
       Las dos pantallas a la vez, cada una en un vocabulario. Arreglado en `onDashData`.

   2 · El barrido por PALABRAS encontró dos cosas que sí eran defectos, y las dos vivían en el
       bloque COMPARTIDO (`_`) — el que leen todos los sectores:
       · `spl_p5_d` decía "En el hangar o en la planta". Una planta y una cuadrilla de campo leían
         "hangar" en la pantalla de entrada. Se movió la versión aeronáutica al bloque `aviacion`.
       · el comentario del primer reporte de ejemplo decía "Vuelo largo ayer" escrito a mano,
         mientras sus dos hermanos ya pasaban por `t()`.

   3 · ⚠️ Y una que un barrido por palabras NO PUEDE encontrar: el banner de rol tenía un **✈**
       escrito en el marcado, justo encima de una etiqueta que sí cambia por sector. A una planta
       la app le dibujaba un avión al lado de "Personal operativo". No es una palabra: no la caza
       ningún grep. Por eso hay un caso que mira el ícono, y no sólo el texto.

   4 · La cadena de respaldo: 18.810 combinaciones (1.883 claves × 2 idiomas × 5 sectores, uno de
       ellos inventado a propósito para ejercitar la degradación). Cero vacías, cero `undefined`,
       cero claves peladas. Los 101 nombres de pregunta de los tests que sólo existen en inglés no
       son un hueco: se consumen con `tTest(clave, canónico)` y el canónico es el array en español.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los términos que R14 nombra, más `hangar`, que es el que estaba suelto de verdad.
   ⚠️ NO SE USA `\b`: en JavaScript `\b` está definido sobre `[A-Za-z0-9_]`, así que una `ó` o una
   `í` no cuentan como carácter de palabra y el detector se queda ciego justo en las formas
   acentuadas. Es el mismo error que ya cazó el discriminador de P041. Se usa clase negada. */
const P040_AV = /(^|[^a-záéíóúüñ])(aeropuertos?|pilot[oa]s?|pilots?|vuelos?|tripulaci[oó]n|tripulantes?|aeronaves?|despegues?|aterrizajes?|cabinas?|hangar(es)?|airports?|flights?|crews?|aircrafts?|cockpits?)(?![a-záéíóúüñ])/i;

/* La ÚNICA excepción, y va nombrada una por una a propósito: una lista que crece sin explicación
   convierte esta prueba en decoración.

   · `en.campo.pf_func_3` = "Coordination with the crew". En español el bloque `campo` dice
     "Coordinación con la cuadrilla" — o sea que el término se eligió aposta para NO ser de
     aviación, y "crew" es su traducción correcta al inglés (cuadrilla de perforación, de línea).
     No se cambió porque cambiarlo sería empeorar el inglés para pasar una prueba.
     ⚠️ Y NO se puede tocar el lado español de `pf_func_*` sin pensarlo: esas opciones viajan al CH
     por `tCanon()`, o sea que reescribir el texto en español PARTE EN DOS la columna histórica de
     esa empresa. Está anotado para que el próximo no lo descubra rompiéndolo. */
const P040_PERDONADAS = { 'en/campo/pf_func_3': 'ver la nota de arriba: "crew" traduce "cuadrilla", no "tripulación"' };

/* ── Estado: se guarda y se devuelve entero ────────────────────────────────────────────────────
   `sectorActual()` tiene TRES fuentes y las mira en orden: `DASH._cfg.sector`, el perfil, y
   `K_SECTOR`. Fijar sólo una y medir es la trampa: si `DASH` quedó sucio de un caso anterior, el
   barrido mide el sector equivocado y devuelve verde sin haber probado lo que dice. */
function p040Guardar(){
  return {
    lang: localStorage.getItem(K_LANG),
    sec: localStorage.getItem(K_SECTOR),
    perfil: getProfile(),
    dash: (typeof DASH !== 'undefined') ? DASH : null,
    cfgSector: (typeof DASH !== 'undefined' && DASH && DASH._cfg) ? DASH._cfg.sector : undefined,
    fetchConReloj: window.fetchConReloj,
    fetch: window.fetch
  };
}
function p040Restaurar(g){
  if (g.lang == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, g.lang);
  if (g.sec == null) localStorage.removeItem(K_SECTOR); else localStorage.setItem(K_SECTOR, g.sec);
  if (g.perfil) setProfile(g.perfil);
  window.fetchConReloj = g.fetchConReloj;
  window.fetch = g.fetch;
  try { if (typeof DASH !== 'undefined') DASH = g.dash; } catch(e){}
  try { if (g.cfgSector !== undefined && DASH && DASH._cfg) DASH._cfg.sector = g.cfgSector; } catch(e){}
  try { stopDashAutoRefresh(); } catch(e){}
  try { aplicarIdioma(); } catch(e){}
}
/* Fija idioma y sector por donde los fija la app de verdad: `fijarIdioma()` es el control de
   Ajustes, y `sectorRecordar()` es lo que llama `empresaPerfilGuardar()` cuando contesta el CH.
   Las otras dos fuentes se apagan a mano, porque si no ganan ellas y el barrido mide otra cosa. */
function p040Fijar(lang, sector){
  try { if (typeof DASH !== 'undefined' && DASH && DASH._cfg) delete DASH._cfg.sector; } catch(e){}
  const p = getProfile();
  if (p && p.sector){ const q = Object.assign({}, p); delete q.sector; setProfile(q); }
  localStorage.setItem(K_SECTOR, '');   // que no gane un valor viejo antes de escribir el nuevo
  sectorRecordar(sector);
  fijarIdioma(lang);
  return { lang: idiomaActual(), sector: sectorActual() };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · EL SECTOR SALE DEL CH Y SE APLICA SIN REINSTALAR
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ cambiar el sector en el CH cambia lo que se LEE, sin reinstalar', async () => {
  /* R17: no se comprueba que `sectorActual()` devuelva la cadena correcta — eso probaría la
     pieza. Se entra por `sectorRefrescar()`, que es lo que corre en el arranque, con el fetch
     contestando lo que contestaría el endpoint, y se mira el TEXTO DE LA PANTALLA. */
  const g = p040Guardar();
  try {
    setProfile(Object.assign({}, g.perfil || {}, { empresa:'Helitec', sector:'aviacion' }));
    sectorRecordar('aviacion');
    try { if (typeof DASH !== 'undefined' && DASH && DASH._cfg) delete DASH._cfg.sector; } catch(e){}
    fijarIdioma('es');
    renderSections();
    const antes = document.getElementById('sections').innerText;
    const rolAntes = document.querySelector('#pilotBanner strong').textContent;

    let pidio = '';
    window.fetchConReloj = function(u){ pidio = String(u);
      return Promise.resolve({ json: () => Promise.resolve(
        { ok:true, perfil:{ empresa:'Helitec', nombre:'Helitec', color:'', logo:'', sector:'planta' } }) }); };
    sectorRefrescar();
    /* Microtareas, NUNCA setTimeout: con la pestaña oculta el navegador estrangula los
       temporizadores a uno por segundo y la suite se cuelga (ver LEEME.md). */
    for (let i = 0; i < 24; i++) await Promise.resolve();

    const despues = document.getElementById('sections').innerText;
    const rolDespues = document.querySelector('#pilotBanner strong').textContent;

    PRUEBAS.alMenos(antes.length, 60, 'el inicio se está midiendo · si mide 0 este caso no dice nada');
    PRUEBAS.cierto(/empresa_perfil/.test(pidio),
      'se le pregunta al CH por el perfil de la empresa · pidió «' + pidio.slice(0, 90) + '»');
    PRUEBAS.igual(sectorActual(), 'planta', 'el sector que contestó el servidor es el que rige');
    PRUEBAS.igual((getProfile()||{}).sector, 'planta', 'y queda guardado en el perfil del dispositivo');
    PRUEBAS.igual(localStorage.getItem(K_SECTOR), 'planta', 'y en su clave propia, que es la que lee el primer pintado');
    PRUEBAS.cierto(/aeropuerto/i.test(antes), 'antes la pantalla decía «aeropuerto» (era una empresa aérea)');
    PRUEBAS.falso(/aeropuerto/i.test(despues),
      '⚠️ y DESPUÉS ya no · si esto falla, cambiar el sector en el CH no cambia lo que ve su gente');
    PRUEBAS.cierto(/planta/i.test(despues), 'la pantalla habla de la planta · «' + despues.slice(0, 90).replace(/\n/g,' · ') + '»');
    PRUEBAS.igual(rolAntes, 'Personal de aviación', 'el banner de rol arrancaba en aviación');
    PRUEBAS.igual(rolDespues, 'Personal operativo', 'y quedó en el término de planta');
  } finally { p040Restaurar(g); }
});

PRUEBAS.caso('el DISCRIMINADOR: si el CH NO tiene sector cargado, no se pisa nada', async () => {
  /* El endpoint devuelve `sector:""` a propósito cuando `Config Empresa` no lo tiene (está
     documentado en `perfilPublicoEmpresa`). Ese vacío ya causó una regresión real: cuando devolvía
     "generico", el servidor le afirmaba "generico" a Helitec en CADA arranque y sus pilotos
     pasaban a leer "Llegando al trabajo". Este caso es el que se pondría rojo si volviera. */
  const g = p040Guardar();
  try {
    setProfile(Object.assign({}, g.perfil || {}, { empresa:'Helitec', sector:'aviacion' }));
    sectorRecordar('aviacion');
    try { if (typeof DASH !== 'undefined' && DASH && DASH._cfg) delete DASH._cfg.sector; } catch(e){}
    fijarIdioma('es');
    renderSections();
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(
      { ok:true, perfil:{ empresa:'Helitec', nombre:'Helitec', sector:'' } }) });
    sectorRefrescar();
    for (let i = 0; i < 24; i++) await Promise.resolve();
    PRUEBAS.igual(sectorActual(), 'aviacion',
      '⚠️ un sector vacío NO pisa el que ya había · si lo pisa, una empresa sin configurar pierde su terminología');
    PRUEBAS.cierto(/aeropuerto/i.test(document.getElementById('sections').innerText),
      'y la pantalla sigue en su vocabulario');
  } finally { p040Restaurar(g); }
});

PRUEBAS.caso('⚠️ abrir el panel de otra empresa repinta TAMBIÉN el inicio', () => {
  /* R17 · se entra por `onDashData`, que es el único camino real, y no armando `DASH` a mano:
     ese objeto es una lista CERRADA de campos y ya se comió `duty` y `ausencias` enteros.
     El defecto que este caso vigila: `sectorActual()` mira `DASH._cfg.sector` PRIMERO, así que el
     sector cambiaba en el instante en que se reemplazaba `DASH` — pero el inicio ya pintado se
     quedaba con la terminología vieja. Las dos pantallas a la vez, cada una en su vocabulario. */
  const g = p040Guardar();
  window.fetch = () => new Promise(() => {});   // que no salga a la red al pintar el panel
  try {
    DASH = null;
    setProfile(Object.assign({}, g.perfil || {}, { empresa:'Helitec', sector:'aviacion', esPiloto:true }));
    sectorRecordar('aviacion');
    fijarIdioma('es');
    renderSections();
    const antes = document.getElementById('sections').innerText;
    onDashData({ ok:true, rol:'supervisor', referencia:{ kss:6 }, metricas:['kss'],
      registros:[{ persona:'Ana', empresa:'Helitec', departamento:'Op', fecha:'2026-09-06', kss:4 }],
      config:{ sector:'campo' } }, 'Helitec', {}, 'hseq');
    const despues = document.getElementById('sections').innerText;

    PRUEBAS.alMenos(antes.length, 60, 'el inicio se está midiendo');
    PRUEBAS.igual((DASH._cfg || {}).sector, 'campo',
      '⚠️ `config` sobrevive a la lista cerrada de campos de onDashData · si se descarta, el sector del CH no llega nunca');
    PRUEBAS.igual(sectorActual(), 'campo', 'y es el que rige mientras el panel está abierto');
    PRUEBAS.cierto(/aeropuerto/i.test(antes), 'antes el inicio decía «aeropuerto»');
    PRUEBAS.falso(/aeropuerto/i.test(despues),
      '⚠️ y ya no · si falla, el panel habla de un sector y el inicio de otro, en la misma sesión');
    PRUEBAS.igual(despues.indexOf(t('op_lleg_sitio')) >= 0, true,
      'el inicio dice lo que t() resuelve para el sector vigente · «' + t('op_lleg_sitio') + '»');
  } finally { p040Restaurar(g); }
});

PRUEBAS.caso('el CH es la fuente: el endpoint lee `sector` de Config Empresa y devuelve vacío si falta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  /* R17 · el contrato entre los dos lados, no cada lado por su cuenta: lo que el `.gs` MANDA
     contra lo que el cliente CONSUME. Se lee del `.gs` real, no de una copia. */
  const gs = CTX.gs;
  const i = gs.indexOf('function perfilPublicoEmpresa');
  PRUEBAS.alMenos(i, 0, 'el endpoint tiene `perfilPublicoEmpresa` · si no, esta prueba mide aire');
  const cuerpo = gs.slice(i, i + 2000);
  PRUEBAS.cierto(/sector:\s*String\(cfg\.sector/.test(cuerpo),
    'el perfil público incluye `sector`, y sale de la config de la empresa');
  PRUEBAS.cierto(/leerConfigEmpresa\(/.test(cuerpo),
    'y esa config es la hoja `Config Empresa`, no un valor escrito en el código');
  PRUEBAS.cierto(/cfg\.sector\s*==\s*null\s*\?\s*""/.test(cuerpo),
    '⚠️ y sin configurar devuelve VACÍO, no "generico" · devolver "generico" ya hizo que el ' +
    'servidor le afirmara ese sector a Helitec en cada arranque y sus pilotos leyeran "trabajo" ' +
    'en vez de "aeropuerto"');
  PRUEBAS.cierto(/accion === "empresa_perfil"/.test(gs),
    'y la acción existe y no pide contraseña: el alta ocurre antes de tener credenciales');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · NINGÚN TÉRMINO DE SECTOR ESCRITO A MANO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Barre los valores RESUELTOS, no la forma interna del diccionario. Es la diferencia que importa:
   una clave con "piloto" en el bloque compartido está bien si TODOS los sectores la tapan, y está
   mal si alguno la deja pasar. Lo único que se puede medir de verdad es lo que `t()` devuelve. */
function p040BarrerTerminos(sectores, idiomas){
  const claves = {};
  ['es','en'].forEach(l => Object.keys(I18N[l]).forEach(s =>
    Object.keys(I18N[l][s]).forEach(k => { claves[k] = 1; })));
  const K = Object.keys(claves);
  const malos = []; let n = 0, fallosDeFijado = 0;
  idiomas.forEach(l => sectores.forEach(s => {
    const puesto = p040Fijar(l, s);
    if (puesto.lang !== l || puesto.sector !== s){ fallosDeFijado++; return; }
    K.forEach(k => {
      n++;
      const v = String(t(k));
      const m = v.match(P040_AV);
      if (!m) return;
      const id = l + '/' + s + '/' + k;
      if (P040_PERDONADAS[id]) return;
      malos.push(id + ': «' + m[2] + '» en «' + v.slice(0, 60) + '»');
    });
  }));
  return { malos, n, claves: K.length, fallosDeFijado };
}

PRUEBAS.caso('🔴 ningún sector NO aeronáutico lee un término de aviación', () => {
  const g = p040Guardar();
  let r;
  try { r = p040BarrerTerminos(['planta','campo','generico'], ['es','en']); }
  finally { p040Restaurar(g); }
  /* Guarda de medibilidad: si el diccionario cambia de forma, o si fijar el sector deja de
     funcionar, `malos` daría [] por no haber mirado nada. Un cero sin medición no es un cero. */
  PRUEBAS.igual(r.fallosDeFijado, 0,
    '⚠️ el idioma y el sector se fijaron por el camino real en las ' + (3*2) + ' combinaciones · ' +
    'si esto falla, el barrido midió el sector equivocado y su cero no vale nada');
  PRUEBAS.alMenos(r.n, 9000,
    'el barrido llegó a las cadenas · revisó ' + r.n + ' (eran 11.298 cuando se escribió esto)');
  PRUEBAS.igual(r.malos.slice(0, 8), [],
    '⚠️ R14 · ' + r.malos.length + ' términos de aviación en un sector que no es de aviación — ' +
    r.malos.slice(0, 8).join(' | '));
});

PRUEBAS.caso('el DISCRIMINADOR del barrido: encuentra el término que le pongas', () => {
  /* Sin esto, una regex mal escrita —o un barrido que no llega a las claves— diría "0 defectos"
     sobre un diccionario lleno. Se meten cuatro a propósito, uno de ellos acentuado y otro en
     inglés, y se comprueba que los cuatro salgan y que el neutro no. */
  const g = p040Guardar();
  let r;
  try {
    I18N.es.planta.__p040_1 = 'Llegando al aeropuerto';
    I18N.es.planta.__p040_2 = 'Coordinación con la tripulación';
    I18N.en.generico.__p040_3 = 'Talk to the pilot before the flight';
    I18N.es.campo.__p040_4 = 'Se guarda en el hangar';
    I18N.es.planta.__p040_ok = 'Llegando a la planta';
    r = p040BarrerTerminos(['planta','campo','generico'], ['es','en']);
  } finally {
    delete I18N.es.planta.__p040_1; delete I18N.es.planta.__p040_2;
    delete I18N.en.generico.__p040_3; delete I18N.es.campo.__p040_4;
    delete I18N.es.planta.__p040_ok;
    p040Restaurar(g);
  }
  const dice = k => r.malos.some(x => x.indexOf(k) >= 0);
  PRUEBAS.cierto(dice('__p040_1'), 'caza «aeropuerto»');
  PRUEBAS.cierto(dice('__p040_2'), 'caza «tripulación», con acento (por eso no se usa \\b)');
  PRUEBAS.cierto(dice('__p040_3'), 'caza «pilot» y «flight» en inglés');
  PRUEBAS.cierto(dice('__p040_4'), 'caza «hangar», que es el que estaba suelto de verdad');
  PRUEBAS.falso(dice('__p040_ok'), 'y deja pasar el texto neutro');
});

PRUEBAS.caso('⚠️ el ÍCONO del banner de rol también cambia por sector', () => {
  /* Esto es lo que ningún barrido por palabras encuentra: el banner tenía un ✈ escrito a mano en
     el marcado, encima de una etiqueta que SÍ cambia por sector. A una planta la app le dibujaba
     un avión al lado de "Personal operativo". Un dibujo no es una palabra: sólo se ve mirando. */
  const g = p040Guardar();
  const med = {};
  try {
    const ov = document.getElementById('setup');
    const tenia = ov && ov.classList.contains('show');
    if (ov && !tenia) ov.classList.add('show');
    /* P170 / ADR 003 · los banners de rol quedaron OCULTOS en el formulario (el rol lo dice la
       nómina; `openSetup` los apaga). Para medir el ícono se muestra el banner sólo acá: lo que
       este caso vigila —que el dibujo dependa del sector— sigue valiendo para el día que se reuse. */
    const ban = document.getElementById('pilotBanner');
    const banDisp = ban ? ban.style.display : '';
    if (ban) ban.style.display = '';
    try {
      ['aviacion','planta','campo','generico','sector_que_no_existe'].forEach(s => {
        p040Fijar('es', s);
        const cont = document.getElementById('rolIcono');
        const svg = cont && cont.querySelector('svg');
        const r = svg ? svg.getBoundingClientRect() : null;
        med[s] = { html: cont ? cont.innerHTML : '', rol: document.querySelector('#pilotBanner strong').textContent,
                   w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
                   formas: svg ? svg.querySelectorAll('path,rect,circle').length : 0 };
      });
    } finally { if (ban) ban.style.display = banDisp; if (ov && !tenia) ov.classList.remove('show'); }
  } finally { p040Restaurar(g); }

  PRUEBAS.alMenos(med.aviacion.w, 16, 'el ícono se está midiendo · con el overlay cerrado mide 0 y el caso no diría nada');
  PRUEBAS.falso(/✈|🛩|🛫|🛬|🚁/.test(med.planta.html + med.campo.html + med.generico.html),
    '⚠️ ningún sector fuera de aviación muestra un avión');
  PRUEBAS.cierto(med.aviacion.html !== med.planta.html,
    'y el de aviación sigue siendo distinto del de planta · si son iguales, el ícono dejó de depender del sector');
  PRUEBAS.igual(med.planta.html, med.campo.html, 'planta y campo comparten el casco: es el mismo trabajo');
  PRUEBAS.igual(med.sector_que_no_existe.html, med.generico.html,
    '⚠️ un sector desconocido cae al neutro, igual que el motor de textos · nunca vacío');
  ['aviacion','planta','campo','generico','sector_que_no_existe'].forEach(s => {
    PRUEBAS.alMenos(med[s].formas, 1, 'el ícono de ' + s + ' dibuja algo (no es un SVG vacío)');
    PRUEBAS.igual([med[s].w, med[s].h], [22, 22], 'y mide lo mismo que los otros dos banners · ' + s);
  });
  PRUEBAS.igual(med.planta.rol, 'Personal operativo', 'el texto del banner ya era por sector; ahora el dibujo lo acompaña');
});

PRUEBAS.caso('la pantalla de inicio, ya pintada, no habla de aviación en una planta', () => {
  /* El barrido de arriba mira el diccionario resuelto. Éste mira lo que quedó EN EL DOM, que es lo
     único que la persona lee de verdad. Los dos hacen falta: una clave puede estar bien y el
     repintado no llegar (que es justo el defecto que se arregló en `onDashData`). */
  const g = p040Guardar();
  let txt = '';
  try {
    setProfile(Object.assign({}, g.perfil || {}, { empresa:'X', esPiloto:true }));
    p040Fijar('es', 'planta');
    renderSections();
    txt = document.getElementById('sections').innerText;
  } finally { p040Restaurar(g); }
  PRUEBAS.alMenos(txt.length, 60, 'el inicio se está midiendo');
  const m = txt.match(P040_AV);
  PRUEBAS.igual(m ? m[2] : '', '',
    '⚠️ nada de aviación en la pantalla de una planta · apareció «' + (m ? m[2] : '') + '»');
});

PRUEBAS.caso('la lámina de "funciona sin señal" nombra el hangar SÓLO en aviación', () => {
  const g = p040Guardar();
  const v = {};
  try {
    ['aviacion','planta','generico'].forEach(s => { p040Fijar('es', s); v[s] = t('spl_p5_d'); });
    p040Fijar('en', 'planta'); v.en_planta = t('spl_p5_d');
    p040Fijar('en', 'aviacion'); v.en_aviacion = t('spl_p5_d');
  } finally { p040Restaurar(g); }
  PRUEBAS.cierto(/hangar/i.test(v.aviacion), 'una aérea la sigue leyendo igual que hasta hoy · «' + v.aviacion + '»');
  PRUEBAS.falso(P040_AV.test(v.generico),
    '⚠️ y una empresa sin sector cargado no · este texto vivía en el bloque COMPARTIDO, o sea que ' +
    'lo leía todo el mundo · «' + v.generico + '»');
  PRUEBAS.falso(P040_AV.test(v.planta), 'ni una planta · «' + v.planta + '»');
  PRUEBAS.falso(P040_AV.test(v.en_planta), 'ni en inglés · «' + v.en_planta + '»');
  PRUEBAS.cierto(/hangar/i.test(v.en_aviacion),
    'y los dos idiomas dicen lo MISMO en aviación · antes el inglés decía otra cosa · «' + v.en_aviacion + '»');
});

PRUEBAS.caso('⚠️ los ejemplos de la demostración: se entra por quien los ARMA, no por el diccionario', () => {
  /* ⚠️ ESTE CASO NACIÓ DE UN AGUJERO PROPIO. La primera versión comprobaba `t('demo_com_0')` — o
     sea el diccionario. Se rompió el arreglo a propósito (se volvió a escribir "Vuelo largo ayer"
     a mano en `dashReportesDemo`) y la prueba SIGUIÓ EN VERDE: la clave existía igual, y nadie
     miraba si el llamador la usaba. Es exactamente R17, cometido acá mismo.
     Ahora se entra por `dashReportesDemo()` y `gestSembrarDemo()`, que son quienes producen esos
     textos, y se mira lo que devuelven. */
  const g = p040Guardar();
  const gestAntes = localStorage.getItem(K_GESTIONES);
  let coments = [], casos = [];
  window.fetch = () => new Promise(() => {});   // que el panel no salga a la red al pintarse
  try {
    setProfile(Object.assign({}, g.perfil || {}, { empresa:'P040 SA' }));
    p040Fijar('es', 'planta');
    coments = dashReportesDemo().map(r => String(r.comentario || ''));

    /* ⚠️ EL `DASH` NO SE ARMA A MANO (R17). `gestSembrarDemo` lee `DASH.registros`, pero
       `gestEmpresaActual()` —tres funciones más abajo, en la misma cadena— lee `DASH.f.emp`. Un
       literal con sólo `registros` revienta ahí, y uno con los dos campos probaría que la función
       sabe leer lo que YO le puse, no lo que el panel le da. Se entra por `onDashData`. */
    localStorage.removeItem(K_GESTIONES);
    onDashData({ ok:true, rol:'supervisor', referencia:{ kss:6 }, metricas:['kss'],
      registros:['Ana','Beto','Caro','Dani','Eva'].map(p => (
        { persona:p, empresa:'P040 SA', departamento:'Op', fecha:'2026-09-06', kss:4 })),
      config:{ sector:'planta' } }, 'P040 SA', {}, 'supervisor');
    gestSembrarDemo();
    casos = gestCasos().filter(x => /^gdemo/.test(x.id)).map(x =>
      [x.titulo, x.detalle, (x.tareas||[]).map(t2 => t2.t).join(' '),
       (x.seguimientos||[]).map(s => s.texto).join(' ')].join(' '));
  } finally {
    if (gestAntes == null) localStorage.removeItem(K_GESTIONES); else localStorage.setItem(K_GESTIONES, gestAntes);
    p040Restaurar(g);
  }

  PRUEBAS.alMenos(coments.length, 3, 'la bandeja de ejemplo se está armando · si viene vacía, este caso no dice nada');
  PRUEBAS.alMenos(casos.length, 4, 'el cuaderno de ejemplo se está sembrando · ' + casos.length + ' casos');
  const malCom = coments.filter(c => P040_AV.test(c));
  PRUEBAS.igual(malCom, [],
    '⚠️ ningún comentario de ejemplo nombra un término de aviación en una planta · uno decía ' +
    '"Vuelo largo ayer" escrito a mano, mientras sus dos hermanos ya pasaban por t()');
  const malCasos = casos.filter(c => P040_AV.test(c)).map(c => (c.match(P040_AV)||[])[2] + ' → ' + c.slice(0, 50));
  PRUEBAS.igual(malCasos, [],
    '⚠️ ni el cuaderno de gestiones · decía "Se conversó con el piloto" y "Hablar con el piloto" — ' +
    malCasos.join(' | '));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   3 · LA CADENA DE RESPALDO NUNCA DEJA UN HUECO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los 101 nombres de pregunta que sólo existen en inglés NO son un hueco: el español vive en los
   arrays canónicos (`TEST_DEPRESION`, `ESTRES_STEPS`…) y se consume con `tTest(clave, canónico)`.
   Este mapa se arma LEYENDO ESOS ARRAYS, que es lo que hace el `render*` de verdad (R17): armarlo
   a mano probaría que la función sabe elegir, no que el llamador le pueda dar lo que pide. */
function p040Canonicos(){
  const c = {};
  const put = (pref, arr, campo) => arr.forEach((x, i) => { c[pref + i] = campo ? x[campo] : x; });
  put('dep_q', TEST_DEPRESION); put('dep_e', TEST_ESCALA);
  put('str_q', ESTRES_STEPS, 'question');    ESTRES_STEPS[0].options.forEach((o,i) => { c['str_e'+i] = o; });
  put('anx_q', ANSIEDAD_STEPS, 'question');  ANSIEDAD_STEPS[0].options.forEach((o,i) => { c['anx_e'+i] = o; });
  put('gas_q', GASTRO_STEPS, 'question');    GASTRO_STEPS[0].options.forEach((o,i) => { c['gas_e'+i] = o; });
  put('mbi_q', CANSANCIO_STEPS, 'question'); CANSANCIO_STEPS[0].options.forEach((o,i) => { c['mbi_e'+i] = o; });
  TEXTO_NIVELES.forEach((x, i) => { c['tam_' + i] = x.k; });
  return c;
}

function p040BarrerHuecos(){
  const canon = p040Canonicos();
  const claves = {};
  ['es','en'].forEach(l => Object.keys(I18N[l]).forEach(s =>
    Object.keys(I18N[l][s]).forEach(k => { claves[k] = 1; })));
  const K = Object.keys(claves);
  /* El quinto sector NO existe: está para ejercitar la degradación (sector desconocido → genérico
     → bloque común). Es el caso real de una empresa con el sector mal escrito en el CH. */
  const sectores = ['aviacion','planta','campo','generico','sector_que_no_existe'];
  const idiomas = ['es','en'];
  const vacias = [], peladas = [], sinRespaldo = [];
  let n = 0, fallosDeFijado = 0;
  idiomas.forEach(l => sectores.forEach(s => {
    const puesto = p040Fijar(l, s);
    if (puesto.lang !== l || puesto.sector !== s){ fallosDeFijado++; return; }
    K.forEach(k => {
      n++;
      const v = (canon[k] !== undefined) ? tTest(k, canon[k]) : t(k);
      if (v == null || String(v).trim() === '') vacias.push(l + '/' + s + '/' + k);
      else if (v === k) (canon[k] !== undefined ? sinRespaldo : peladas).push(l + '/' + s + '/' + k);
    });
  }));
  return { vacias, peladas, sinRespaldo, n, claves: K.length, fallosDeFijado,
           sectores: sectores.length, idiomas: idiomas.length, conCanon: Object.keys(canon).length };
}

PRUEBAS.caso('🔴 idioma × sector × clave: ninguna combinación queda vacía ni muestra la clave', () => {
  const g = p040Guardar();
  let r;
  try { r = p040BarrerHuecos(); } finally { p040Restaurar(g); }

  PRUEBAS.igual(r.fallosDeFijado, 0,
    '⚠️ las 10 combinaciones de idioma × sector se fijaron por el camino real · si falla, el ' +
    'barrido midió siempre el mismo estado y su cero es un cero de no haber medido');
  PRUEBAS.alMenos(r.n, 15000,
    'el barrido llegó a las combinaciones · probó ' + r.n + ' (' + r.claves + ' claves × ' +
    r.idiomas + ' idiomas × ' + r.sectores + ' sectores, uno inventado a propósito)');
  PRUEBAS.alMenos(r.conCanon, 90,
    'y los ' + r.conCanon + ' nombres de pregunta de los tests se resolvieron por `tTest` con su ' +
    'array canónico, que es como los consume el render de verdad');
  PRUEBAS.igual(r.vacias.slice(0, 6), [],
    '⚠️ ' + r.vacias.length + ' combinaciones devuelven vacío o undefined — ' + r.vacias.slice(0, 6).join(' | '));
  PRUEBAS.igual(r.peladas.slice(0, 6), [],
    '⚠️ ' + r.peladas.length + ' devuelven la CLAVE PELADA en pantalla (tipo «op_lleg_sitio») — ' +
    r.peladas.slice(0, 6).join(' | '));
  PRUEBAS.igual(r.sinRespaldo.slice(0, 6), [],
    '⚠️ ' + r.sinRespaldo.length + ' preguntas de test sin respaldo en español — ' + r.sinRespaldo.slice(0, 6).join(' | '));
});

PRUEBAS.caso('el DISCRIMINADOR del barrido de huecos: las tres formas de hueco se ven', () => {
  /* Tres roturas a propósito, una por cada cosa que el barrido dice vigilar. Sin esto, un barrido
     que no recorra nada devolvería los mismos tres ceros y parecería igual de sano. */
  const g = p040Guardar();
  let r;
  const guardaDep = TEST_DEPRESION[0], guardaEsc = TEST_ESCALA[0];
  try {
    I18N.es._.__p040_vacia = '';                    // hueco de verdad: cadena vacía
    I18N.en.aviacion.__p040_solo_en = 'Only here';  // existe en inglés y no en español → clave pelada en es
    TEST_DEPRESION[0] = '';                         // pregunta de test cuyo respaldo español quedó vacío
    TEST_ESCALA[0] = 'dep_e0';                      // y una cuyo respaldo es la clave misma
    r = p040BarrerHuecos();
  } finally {
    TEST_DEPRESION[0] = guardaDep; TEST_ESCALA[0] = guardaEsc;
    delete I18N.es._.__p040_vacia; delete I18N.en.aviacion.__p040_solo_en;
    p040Restaurar(g);
  }
  PRUEBAS.cierto(r.vacias.some(x => /__p040_vacia/.test(x)),
    've la cadena vacía · ' + r.vacias.slice(0, 3).join(' | '));
  PRUEBAS.cierto(r.peladas.some(x => /__p040_solo_en/.test(x) && /^es\//.test(x)),
    've la clave que sólo existe en inglés y en español saldría pelada · ' + r.peladas.slice(0, 3).join(' | '));
  PRUEBAS.cierto(r.vacias.some(x => /dep_q0/.test(x)),
    'y ve la pregunta de test cuyo respaldo en español se vació · ' + r.vacias.filter(x=>/dep_q0/.test(x)).slice(0,2).join(' | '));
  PRUEBAS.cierto(r.sinRespaldo.some(x => /dep_e0/.test(x)),
    'y la que se quedó con la clave como respaldo, que en pantalla saldría «dep_e0» · ' +
    r.sinRespaldo.slice(0, 3).join(' | '));
});
