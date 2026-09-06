PRUEBAS.grupo('P049 · el panel entra UNA vez, aunque las respuestas lleguen de a tres');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Abrir el panel dispara VARIOS pedidos independientes al servidor y cada respuesta terminaba en
   un `renderDash()` completo — que rehace `#dashBody.innerHTML` entero y, de paso, vuelve a armar
   la animación de ENTRADA de todos los bloques. O sea: el panel se veía "entrar" tres o cuatro
   veces seguidas, en el primer segundo, sin que hubiera pasado nada.

   MEDIDO ANTES DE TOCAR NADA, entrando por `onDashData()` con `window.fetch` reemplazado (R17),
   contando llamadas a `renderDash` y de dónde venían:

     ┌──────────────────┬─────────┬────────────────────────────────────────────────────────────┐
     │ vista            │ renders │ quién los disparaba                                        │
     ├──────────────────┼─────────┼────────────────────────────────────────────────────────────┤
     │ servicio médico  │    3    │ sync (onDashData) + (niveles_riesgo | gestiones) + casos   │
     │ supervisor       │    4    │ los 3 de arriba + el gestPull propio de renderAptitud()    │
     │ Dirección/HSEQ   │    2    │ sync + niveles_riesgo                                      │
     │ personal         │    2    │ sync + niveles_riesgo                                      │
     └──────────────────┴─────────┴────────────────────────────────────────────────────────────┘

   Los CUATRO rearmaban la animación (`.anim-target` sobre todos los bloques): 16 bloques en la
   vista del médico, 9 en HSEQ, 3 en la del supervisor — medidos en el DOM, tres y cuatro veces
   seguidos. El número del plan (3 y 4) era exacto: no había envejecido.

   ⚠️ LO QUE EL ARREGLO **NO** HACE, y este archivo lo sostiene con casos propios:

   1. NO cambia cuántas veces se PIDEN los datos. Son pedidos distintos y cada uno trae algo que
      el panel necesita: niveles de riesgo, anotaciones del servicio médico, casos del puente de
      telemedicina, bandeja de reportes. Sacar uno cambiaría qué se ve, y eso no es una decisión
      de rendimiento. Hay un grupo entero acá abajo que comprueba que los TRES conjuntos siguen
      en pantalla al final de la cascada — la lección de A4, donde `onDashData` armaba `DASH` con
      una lista cerrada de campos y se comió `duty` y `ausencias` sin un solo error en consola.

   2. NO coalesce con `requestAnimationFrame`. El plan lo sugería y sería un bug: con la app en
      segundo plano —o en esta misma pestaña de pruebas, oculta de forma permanente (ver
      `pruebas/LEEME.md`)— rAF no dispara NUNCA, así que el repintado quedaría pendiente para
      siempre y el dato recién llegado no se pintaría. Hay un caso que lo fija: con rAF muerto,
      los niveles de riesgo tienen que llegar igual a la pantalla.

   CÓMO SE MIDE LA ANIMACIÓN ACÁ, que es la parte no obvia
   `dashWireAnimaciones()` no marca nada en el acto: difiere el trabajo a `requestAnimationFrame`
   y a dos `setTimeout`. En esta pestaña rAF nunca dispara y los timers están estrangulados a ~1 s,
   así que esperar no sirve. Lo que se hace es ejecutar rAF EN LÍNEA mientras dura la medición
   (`fn(0)` en el acto) y contar cuántos `.anim-target` quedan en el DOM después de CADA render.
   Con eso la medición es del DOM real, no del flag interno, y es determinista.
   ⚠️ Y hace falta que `#dashScroll` tenga alto real: `dashWireAnimaciones` se va sin hacer nada
   si `clientHeight` es 0. Por eso el arnés abre el overlay y fuerza el recálculo antes de medir,
   y por eso `altoScroll` es una de las guardas de medibilidad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Cede el turno SIN timers. Chrome estrangula los `setTimeout` de una pestaña oculta a ~1 s, así
   que doce esperas de 5 ms tardan doce segundos (ver `p087Tick` en p087-error-del-servidor.js).
   Las microtareas no se estrangulan y alcanzan para que corran los `.then` de las cascadas. */
async function p049Tick(n){ for (let i = 0; i < (n || 60); i++) await Promise.resolve(); }

const P049_K_GEST = 'silva_fatiga_gestiones_v2';
/* Marcas que sólo pueden haber llegado por su cascada: si aparecen en `#dashBody`, ESE pedido
   llegó Y se pintó. No son texto decorativo — son la prueba de que el dato sobrevivió. */
const P049_MARCA_GEST  = 'MARCA-GESTIONES-P049';
const P049_MARCA_CASOS = 'MARCA-CASOS-P049';

function p049Payload(vista, rol, niveles){
  const hoy = todayStr();
  return {
    ok: true, rol: rol, referencia: { kss: { amarillo: 6, rojo: 8 } }, metricas: ['kss'],
    registros: [
      { persona:'Marta Rios', empresa:'Empresa P049', departamento:'Operaciones', cargo:'Piloto',  fecha:hoy, kss:5 },
      { persona:'Luis Pena',  empresa:'Empresa P049', departamento:'Operaciones', cargo:'Piloto',  fecha:hoy, kss:7 },
      { persona:'Ana Gil',    empresa:'Empresa P049', departamento:'Mantenimiento', cargo:'Tecnico', fecha:hoy, kss:3 }
    ],
    comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [],
    marca: null, duty: null, ausencias: {}, demo: false,
    /* Sin `niveles` el arranque toma la rama `dashCargarNiveles()`; con `niveles` toma la de
       `gestPull()`. Son EXCLUYENTES (un `else if`), y por eso el médico da 3 en los dos casos
       pero con una segunda cascada distinta. Las dos se prueban acá abajo. */
    niveles: niveles,
    config: { persistencia: 3, anonN: 5 }
  };
}

/* Lo que contestaría el endpoint para cada acción de la cascada. `datos` decide si esa cascada
   trae algo o vuelve vacía — así el mismo arnés sirve para medir la animación (con listas vacías)
   y para comprobar que no se pierde nada (con datos de verdad). */
function p049Respuesta(action, datos){
  datos = datos || {};
  if (action === 'gestiones')           return { ok:true, gestiones: datos.gestiones || [] };
  if (action === 'casos_odoo_resumen')  return { ok:true, casos:     datos.casos     || [] };
  if (action === 'niveles_riesgo')      return { ok:true, niveles:   datos.niveles   || [] };
  if (action === 'reportes')            return { ok:true, reportes:  [] };
  return { ok:false };                  // 'informes' y cualquier otra: no es lo que se mide acá
}
function p049Sobre(r){
  return { ok:true, status:200, type:'cors',
           json: () => Promise.resolve(r), text: () => Promise.resolve(JSON.stringify(r)) };
}
/* `cola` opcional: si viene, las respuestas quedan RETENIDAS hasta que alguien las suelte. Es lo
   que permite scrollear entre el primer render y los repintados tardíos. */
function p049Fetch(datos, cola){
  return function(url, o){
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch(e){}
    const r = p049Respuesta(b.action, datos);
    if (!cola) return Promise.resolve(p049Sobre(r));
    return new Promise(resolve => cola.push(() => resolve(p049Sobre(r))));
  };
}

/* Datos "de verdad" para las tres cascadas, cada uno con su marca rastreable en pantalla. */
function p049DatosCompletos(){
  const ahora = Date.now();
  return {
    gestiones: [{ id:'p049_anot_1', tipo:'anotacion_aptitud', persona:'Marta Rios', nivel:'medio',
                  nota:P049_MARCA_GEST, medico:'Servicio medico', creada:ahora - 1000,
                  vigenciaHasta:ahora + 86400000 }],
    casos:     [{ persona:'Luis Pena', fecha:todayStr(), tests:P049_MARCA_CASOS }],
    niveles:   [{ departamento:'Operaciones', nivel:5 }, { departamento:'Mantenimiento', nivel:2 }]
  };
}

/* ── EL ARNÉS ──────────────────────────────────────────────────────────────────────────────────
   Abre el panel por el camino real (`onDashData`) y deja correr las cascadas con `fetch`
   reemplazado. Devuelve, por cada `renderDash` que ocurrió, cuántos bloques quedaron marcados
   para animar — más las guardas de medibilidad y lo que quedó en pantalla al final.
   Restaura TODO: DASH, el overlay, `.sin-animaciones`, rAF, fetch, renderDash y el almacén de
   gestiones que `gestPull()` escribe en localStorage. */
async function p049Abrir(vista, rol, op){
  op = op || {};
  const previo = DASH;
  const ov = document.getElementById('portalOverlay');
  const eraShow = ov.classList.contains('show');
  const eraSinAnim = document.documentElement.classList.contains('sin-animaciones');
  const origRaf = window.requestAnimationFrame, origFetch = window.fetch, origRender = renderDash;

  ov.classList.add('show');
  document.documentElement.classList.remove('sin-animaciones');
  void document.body.offsetWidth;                 // sin esto `#dashScroll` mide 0 y no se anima nada
  // rAF EN LÍNEA para poder medir (ver el comentario largo de arriba). `rafMuerto` hace lo
  // contrario a propósito: reproduce la app en segundo plano, donde rAF no llega nunca.
  window.requestAnimationFrame = op.rafMuerto
    ? function(){ return 0; }
    : function(fn){ try { fn(0); } catch(e){} return 0; };

  const animados = [];                            // .anim-target en el DOM DESPUÉS de cada render
  renderDash = function(){
    const r = origRender.apply(this, arguments);
    animados.push(document.querySelectorAll('#dashBody .anim-target').length);
    return r;
  };
  const cola = op.retener ? [] : null;
  window.fetch = p049Fetch(op.datos, cola);

  let altoScroll = 0, bloques = 0, entreMedio = null;
  try {
    DASH = null;                                  // primera carga de la sesión: el peor caso
    onDashData(p049Payload(vista, rol, op.niveles), 'Empresa P049',
               { usuario:'sup', empresa:'Empresa P049', pass:'clave' }, vista);
    altoScroll = document.getElementById('dashScroll').clientHeight;
    bloques = document.querySelectorAll('#dashBody .dash-block').length;
    if (typeof op.entre === 'function') entreMedio = op.entre();   // corre con el panel ya pintado
    if (cola){ const c = cola.slice(); cola.length = 0; c.forEach(f => f()); }
    await p049Tick(60);
    if (cola && cola.length){ const c = cola.slice(); cola.length = 0; c.forEach(f => f()); await p049Tick(60); }
  } finally {
    window.requestAnimationFrame = origRaf; window.fetch = origFetch; renderDash = origRender;
  }

  const cuerpo = document.getElementById('dashBody').innerHTML;
  const res = {
    vista: vista,
    renders: animados.length,
    animados: animados,                           // [16, 0, 0] = una sola entrada
    rearman: animados.filter(n => n > 0).length,
    altoScroll: altoScroll,
    bloques: bloques,
    hayNivel: !!document.getElementById('dashNivel'),
    hayGest:  cuerpo.indexOf(P049_MARCA_GEST) >= 0,
    hayCasos: cuerpo.indexOf(P049_MARCA_CASOS) >= 0,
    /* La vista del médico no pinta la NOTA de la anotación en la cola de trabajo (esa sólo sale
       en la ficha, con una persona elegida): pinta un renglón con la determinación y su vigencia.
       `.an-res-hasta` existe únicamente para quien TIENE una anotación vigente, así que sirve de
       marca igual de específica. Medido: 1 con la anotación, 0 sin ella. */
    anotMedico: document.querySelectorAll('#dashBody .an-res-hasta').length,
    tab: DASH && DASH.tab,
    skipColgado: !!(DASH && DASH._skipAnim),
    scrollTop: document.getElementById('dashScroll').scrollTop,
    tabsLeft: document.getElementById('dashTabs').scrollLeft,
    entre: entreMedio
  };

  try { stopDashAutoRefresh(); } catch(e){}
  DASH = previo;
  if (!eraShow) ov.classList.remove('show');
  if (eraSinAnim) document.documentElement.classList.add('sin-animaciones');
  localStorage.removeItem(P049_K_GEST);           // gestPull() deja las anotaciones acá
  try { gestAnotCacheClear(); } catch(e){}
  return res;
}

/* Guardas de medibilidad, todas juntas: sin esto un arreglo que dejara el panel en blanco daría
   verde por no medir nada. Ya pasó cuatro veces en este proyecto. */
function p049Medible(r, minRenders){
  PRUEBAS.alMenos(r.altoScroll, 1,
    'guarda de medibilidad: `#dashScroll` tiene que tener alto real — con clientHeight 0, ' +
    'dashWireAnimaciones() se va sin marcar nada y todos los conteos darían 0 sin haber probado nada');
  PRUEBAS.alMenos(r.bloques, 1,
    'guarda: el panel tiene que haber pintado bloques de verdad');
  PRUEBAS.alMenos(r.renders, minRenders,
    'guarda: las cascadas asíncronas tienen que haber corrido de verdad · si esto baja, no se está ' +
    'midiendo el defecto sino un panel que se pinta una sola vez porque nadie le contestó');
  PRUEBAS.alMenos(r.animados[0] || 0, 1,
    'guarda: el PRIMER render sí tiene que armar la animación de entrada — si diera 0, los ceros ' +
    'de los repintados siguientes no significarían nada');
  return r.altoScroll > 0 && r.bloques > 0 && r.renders >= minRenders && (r.animados[0] || 0) > 0;
}

PRUEBAS.caso('⚠️ servicio médico: llegan 3 respuestas y el panel entra UNA sola vez', async () => {
  const r = await p049Abrir('medico', 'empresa', {});
  if (!p049Medible(r, 2)) return;
  PRUEBAS.igual(r.renders, 3,
    'siguen siendo 3 pedidos con 3 repintados: este prompt NO cambia cuántas veces se piden los ' +
    'datos, sólo cuántas veces el panel se vuelve a presentar · animados = ' + JSON.stringify(r.animados));
  PRUEBAS.igual(r.rearman, 1,
    '⚠️ y UNO solo rearma la animación de entrada. Antes eran los 3: el panel se veía entrar tres ' +
    'veces en el primer segundo, con 16 bloques desapareciendo y reapareciendo cada vez');
});

PRUEBAS.caso('⚠️ servicio médico con los niveles ya en el payload (la otra rama): también una sola vez', async () => {
  /* La cascada de niveles y la de gestiones son EXCLUYENTES en onDashData (un `else if`). Sin
     este caso, la mitad del defecto quedaría sin cubrir: el número total es el mismo (3) pero el
     segundo repintado lo dispara otra función. */
  const r = await p049Abrir('medico', 'empresa', { niveles: [{ departamento:'Operaciones', nivel:5 }] });
  if (!p049Medible(r, 2)) return;
  PRUEBAS.igual(r.rearman, 1,
    'la rama de gestiones tiene que estar tan cubierta como la de niveles · animados = ' + JSON.stringify(r.animados));
});

PRUEBAS.caso('⚠️ supervisor: son 4 respuestas (una la dispara renderAptitud) y entra UNA sola vez', async () => {
  /* El supervisor tiene una cascada más que nadie, y es la más fácil de pasar por alto: la
     dispara `renderAptitud()` DESDE ADENTRO del primer render, no `onDashData`. */
  const r = await p049Abrir('supervisor', 'supervisor', {});
  if (!p049Medible(r, 3)) return;
  PRUEBAS.igual(r.renders, 4, 'las 4 respuestas siguen llegando y repintando · animados = ' + JSON.stringify(r.animados));
  PRUEBAS.igual(r.rearman, 1,
    '⚠️ pero una sola animación de entrada. La cuarta es la de renderAptitud(): si alguien la ' +
    'deja repintando a secas, este caso se pone rojo');
});

PRUEBAS.caso('Dirección/HSEQ y personal: dos respuestas, una sola entrada', async () => {
  const h = await p049Abrir('hseq', 'empresa', {});
  if (p049Medible(h, 2)){
    PRUEBAS.igual(h.rearman, 1, 'HSEQ tiene 9 bloques: verlos entrar dos veces es igual de molesto · ' + JSON.stringify(h.animados));
  }
  const e = await p049Abrir('empleado', 'empleado', {});
  if (p049Medible(e, 2)){
    PRUEBAS.igual(e.rearman, 1, 'la vista de la persona también pasa por la cascada de niveles');
  }
});

PRUEBAS.caso('⚠️ DISCRIMINADOR: sin dashRepintar(), las cuatro vistas vuelven a animarse de más', async () => {
  /* Se anula el arreglo tal como estaba ANTES del prompt —repintar a secas, sin marcar
     `_skipAnim`— y se mide con el MISMO arnés. Si esto diera verde, los casos de arriba no
     estarían midiendo nada. Los números que salen acá son exactamente los que reportó el plan. */
  const orig = dashRepintar;
  let seUso = false;
  dashRepintar = function(){ seUso = true; if (DASH) renderDash(); };
  let med, sup, hseq;
  try {
    med  = await p049Abrir('medico', 'empresa', {});
    sup  = await p049Abrir('supervisor', 'supervisor', {});
    hseq = await p049Abrir('hseq', 'empresa', {});
  } finally { dashRepintar = orig; }

  PRUEBAS.cierto(seUso, 'confirma que el mono-parche se usó de verdad — si no, el discriminador no discrimina nada');
  PRUEBAS.igual(med.rearman, 3,
    '⚠️ así se veía el servicio médico antes de P049: los 3 repintados rearmaban la entrada · ' + JSON.stringify(med.animados));
  PRUEBAS.igual(sup.rearman, 4,
    '⚠️ y el supervisor, 4 · ' + JSON.stringify(sup.animados));
  PRUEBAS.igual(hseq.rearman, 2,
    '⚠️ y Dirección/HSEQ, 2 · ' + JSON.stringify(hseq.animados));
});

PRUEBAS.caso('el flag no queda pegado: el próximo render SÍ vuelve a animar', async () => {
  /* `_skipAnim` es de un solo uso y lo consume `dashWireAnimaciones()`. Si quedara puesto al
     terminar la cascada, se comería la animación del PRÓXIMO render legítimo —cambiar de empresa,
     por ejemplo— y el defecto sería el inverso: un panel que nunca entra. */
  const r = await p049Abrir('supervisor', 'supervisor', {});
  if (!p049Medible(r, 3)) return;
  PRUEBAS.falso(r.skipColgado,
    '⚠️ al terminar la cascada, `DASH._skipAnim` tiene que estar consumido. Si quedara en true, ' +
    'la siguiente carga del panel no se animaría y nadie sabría por qué');
});

PRUEBAS.grupo('P049 · no se perdió ningún dato: las tres cascadas siguen en pantalla');

/* La lección de A4: `onDashData` armaba `DASH` con una lista CERRADA de campos y se comió `duty` y
   `ausencias` sin un error en consola, con las dos suites en verde porque armaban `DASH` a mano.
   Acá se entra por el camino real y se busca en el DOM la marca de cada cascada:
   · niveles_riesgo     → aparece el selector `#dashNivel` (sólo existe si hay niveles cargados)
   · gestiones          → la nota de la anotación médica, en la tarjeta de la persona
   · casos_odoo_resumen → el banner "Se inició una consulta de telemedicina", con el test que lo abrió */

PRUEBAS.caso('⚠️ supervisor: los tres conjuntos de datos están en pantalla al final de la cascada', async () => {
  const r = await p049Abrir('supervisor', 'supervisor', { datos: p049DatosCompletos() });
  if (!p049Medible(r, 3)) return;
  PRUEBAS.cierto(r.hayNivel,
    '⚠️ los niveles de riesgo llegaron y se pintaron: sin ellos no existe el filtro por nivel ' +
    'y el semáforo del supervisor juzga a un piloto con el criterio de una recepción');
  PRUEBAS.cierto(r.hayGest,
    '⚠️ la anotación del servicio médico llegó y se pintó en la tarjeta de la persona');
  PRUEBAS.cierto(r.hayCasos,
    '⚠️ y el caso del puente de telemedicina también. Son tres pedidos distintos: si el arreglo ' +
    'de la animación se llevara puesto uno de los repintados, ESTE dato desaparecería de la ' +
    'pantalla sin un solo error en consola (es exactamente lo que pasó en A4)');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR: si una cascada vuelve vacía, su marca NO aparece', async () => {
  /* Sin esto, el caso de arriba podría estar buscando algo que aparece siempre. Se corre la misma
     medición con las tres respuestas vacías: las tres marcas tienen que desaparecer. */
  const r = await p049Abrir('supervisor', 'supervisor', {});
  if (!p049Medible(r, 3)) return;
  PRUEBAS.falso(r.hayNivel, 'sin niveles cargados no puede existir el selector de nivel');
  PRUEBAS.falso(r.hayGest,  'sin anotaciones no puede aparecer la nota del servicio médico');
  PRUEBAS.falso(r.hayCasos, 'sin casos no puede aparecer el banner de telemedicina');
});

PRUEBAS.caso('⚠️ servicio médico: la anotación también sobrevive por su propio camino', async () => {
  /* La vista del médico toma la rama de gestiones sólo si los niveles YA vienen en el payload
     (las dos ramas son excluyentes en onDashData). Se le dan, y así se ejercita la cascada que le
     corresponde, que es distinta de la del caso de arriba.
     ⚠️ Acá NO se busca `P049_MARCA_GEST`: la cola de trabajo del médico muestra la determinación
     y su vigencia, no la nota (la nota sale en la ficha, con una persona ya elegida). Y tampoco
     se busca la marca de los casos: `casosOdooBloque()` sólo pinta si la empresa encendió el
     puente a mano (`CASOS_ODOO_DEFAULTS.activo` arranca en false a propósito), así que exigirlo
     acá sería una prueba de la configuración, no del repintado. */
  const datos = p049DatosCompletos();
  const r = await p049Abrir('medico', 'empresa', { datos: datos, niveles: datos.niveles });
  if (!p049Medible(r, 2)) return;
  PRUEBAS.igual(r.anotMedico, 1,
    '⚠️ la determinación del servicio médico tiene que quedar en pantalla después del repintado ' +
    'tardío · medido: 1 con la anotación cargada, 0 sin ella (ver el discriminador de abajo)');
  PRUEBAS.igual(r.rearman, 1, 'y con datos de verdad el panel sigue entrando una sola vez');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR: sin la anotación, el renglón del médico no aparece', async () => {
  const r = await p049Abrir('medico', 'empresa', { niveles: [{ departamento:'Operaciones', nivel:5 }] });
  if (!p049Medible(r, 2)) return;
  PRUEBAS.igual(r.anotMedico, 0,
    'confirma que `.an-res-hasta` mide la anotación y no algo que está siempre — sin este caso, ' +
    'el de arriba podría estar contando un elemento que aparece igual');
});

PRUEBAS.grupo('P049 · con la app en segundo plano el dato tiene que llegar igual');

PRUEBAS.caso('⚠️ con requestAnimationFrame MUERTO, los niveles igual llegan a la pantalla', async () => {
  /* ⚠️ ESTE CASO EXISTE PARA QUE NADIE "MEJORE" ESTO CON rAF. El plan sugería coalescer los
     repintados con `requestAnimationFrame`; sería un bug de verdad: con la pestaña oculta o la
     app en segundo plano rAF no dispara NUNCA (ver pruebas/LEEME.md), así que el repintado
     quedaría encolado para siempre y el dato recién llegado no se pintaría jamás.
     Acá rAF se reemplaza por uno que no llama nunca a su callback — que es el estado REAL de esta
     pestaña— y se comprueba que los niveles igual aparecen en pantalla. Si alguien mete un rAF en
     el camino del repintado, este caso se pone rojo. */
  const r = await p049Abrir('supervisor', 'supervisor', { datos: p049DatosCompletos(), rafMuerto: true });
  PRUEBAS.alMenos(r.renders, 3,
    'guarda de medibilidad: las cascadas tienen que haber repintado igual, sin rAF de por medio');
  PRUEBAS.cierto(r.hayNivel,
    '⚠️ el selector de nivel tiene que estar: es la prueba de que la respuesta de niveles_riesgo ' +
    'se pintó sin depender de un cuadro de animación que nunca llega');
  PRUEBAS.cierto(r.hayCasos,
    'y el caso de telemedicina también — es la cascada que llega última');
  PRUEBAS.igual(r.animados.filter(n => n > 0).length, 0,
    'con rAF muerto no se marca NADA para animar (dashWireAnimaciones difiere todo a rAF): es la ' +
    'confirmación de que el rAF falso de los otros casos es lo que hace medible la animación');
});

PRUEBAS.grupo('P049 · el scroll y la pestaña activa no saltan con los repintados tardíos');

PRUEBAS.caso('⚠️ scrollear entre el primer render y las respuestas no pierde el lugar', async () => {
  /* Las respuestas se RETIENEN hasta que el arnés las suelta: así se puede scrollear en el medio,
     que es el momento en que un repintado tardío haría daño de verdad — la persona ya está
     leyendo. Se mueven las dos barras: la vertical del contenido y la horizontal de las pestañas
     (que `buildDashTabs()` rehace por completo en cada render). */
  let puesto = null;
  const r = await p049Abrir('hseq', 'empresa', {
    retener: true,
    entre: function(){
      const sc = document.getElementById('dashScroll'), bar = document.getElementById('dashTabs');
      sc.scrollTop = 380;
      bar.scrollLeft = 120;
      puesto = { top: sc.scrollTop, left: bar.scrollLeft, tab: DASH.tab, alto: sc.scrollHeight, ancho: bar.scrollWidth };
      return puesto;
    }
  });
  PRUEBAS.cierto(!!r.entre, 'guarda: el gancho tiene que haber corrido con el panel ya pintado');
  if (!r.entre) return;
  PRUEBAS.alMenos(r.entre.top, 1,
    'guarda de medibilidad: el contenido tiene que ser más alto que la ventana para poder scrollear ' +
    '· si esto da 0 no se está probando nada (scrollHeight = ' + r.entre.alto + ')');
  PRUEBAS.alMenos(r.entre.left, 1,
    'guarda: la fila de pestañas tiene que desbordar para que su scroll signifique algo ' +
    '(scrollWidth = ' + r.entre.ancho + ')');
  PRUEBAS.alMenos(r.renders, 2, 'guarda: tiene que haber habido al menos un repintado DESPUÉS del scroll');
  if (!r.entre.top || !r.entre.left) return;
  PRUEBAS.igual(r.scrollTop, r.entre.top,
    '⚠️ el repintado rehace `#dashBody.innerHTML` entero: si el navegador recorta el scroll ' +
    'mientras el cuerpo está vacío, la persona pierde el renglón que estaba leyendo');
  PRUEBAS.igual(r.tabsLeft, r.entre.left,
    '⚠️ y `buildDashTabs()` rehace la fila de pestañas en CADA render: su desplazamiento ' +
    'horizontal tampoco puede volver a cero');
  PRUEBAS.igual(r.tab, r.entre.tab, 'la pestaña activa no cambia sola por un repintado');
});
