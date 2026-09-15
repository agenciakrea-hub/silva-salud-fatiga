PRUEBAS.grupo('P059b · A7 · lo que encontró la revisión adversarial de la tanda 6b');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Seis defectos, todos vivos en producción, dos de ellos introducidos por mí en esta misma tanda.
   El más grave no es un error de programación: la app le PROMETÍA a la persona algo que no
   cumplía, en la pantalla donde decide si contesta la verdad (R4).
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function p059bEnv(){
  return GS.crearEntorno({
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Helitec', 'sup001', 'supervisor', 'Helitec', 'med002', 'dir003']],
    'Sesiones': [["Id","HashToken","Usuario","Dispositivo","Rol","Vista","Empresas","Canonical",
                  "Combinada","Creada","UltimoUso","Estado","Cerrada"]],
    /* ⚠️ EL ENCABEZADO EXACTO DE `NOMINA_HEAD`, no uno tecleado de memoria. La primera versión de
       este entorno ponía Cédula en la columna 2 y el nombre en la 3 —al revés— y el endpoint
       devolvía `persona: "V-1"`. El caso principal igual pasaba: era el DISCRIMINADOR el que se
       caía, que es justo su trabajo. Un encabezado inventado hace que la prueba mida otra hoja. */
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"],
               ['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','a@e.com','Sí','','empleado','2'],
               ['Helitec','Luis Pena','V-2','Mantenimiento','Técnico','M',40,'+58124','l@e.com','No','','empleado','2']],
    'Departamentos': [["Empresa","Departamento","Estado","Actualizado","ActualizadoPor"]],
    /* `accionNominaListar` lee esta hoja para la fecha de alta. Sin ella el DISCRIMINADOR daba
       `ok:false` para el supervisor también, y entonces el caso no habría probado nada: un rechazo
       para todo el mundo se ve igual que un rechazo por la vista. */
    'Registrados Fatiga': [["Fecha","Cédula","Persona","Empresa","Departamento","Cargo"],
                           ['01/09/2026 08:00','V-1','Ana Suárez','Helitec','Operaciones','Piloto']],
    'Ciclo Persona': [["Empresa","Persona","Plan","Actualizado","ActualizadoPor"]],
  });
}

PRUEBAS.caso('🔴 la app promete que Dirección no ve nombres · y la NÓMINA se los daba', () => {
  /* La lámina del carrusel dice «Semáforo por indicador, sin nombres ni valores». Con una
     credencial `ClaveHseq` el botón «Nómina» estaba a la vista y `accionNominaListar` no miraba
     `acc.vista`: devolvía nombre, apellido, departamento y cargo de toda la empresa.
     R4 es exactamente esto: la promesa se hace donde la persona decide si contesta la verdad. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, p059bEnv(), ['accionNominaListar']);
  const pedir = pass => JSON.parse(api.accionNominaListar({
    usuario:'Helitec', pass, dispositivoId:'d', empresa:'Helitec' }).getContent());

  const dir = pedir('dir003');
  PRUEBAS.falso(!!dir.ok, '⚠️ Dirección NO recibe la nómina');
  PRUEBAS.falso(/Ana Suárez|Luis Pena/.test(JSON.stringify(dir)),
    '⚠️ y ningún nombre se cuela en la respuesta, ni en un mensaje de error');

  /* DISCRIMINADOR: sin esto el caso daría verde si la acción fallara para todo el mundo. */
  const sup = pedir('sup001');
  PRUEBAS.cierto(!!sup.ok, 'el DISCRIMINADOR: el supervisor SÍ la recibe · ' + JSON.stringify(sup).slice(0,90));
  PRUEBAS.cierto(/Ana Suárez/.test(JSON.stringify(sup)),
    'y con los nombres · o sea que el rechazo de arriba es por la vista, no porque nada funcione');
});

PRUEBAS.caso('🔴 y la BAJA de un departamento devolvía la lista de personas del área', () => {
  /* `depPuedeEscribir` deja pasar `hseq` —para los departamentos ese criterio es correcto— pero la
     respuesta `con_gente` lleva `personas: [...]` con los nombres, y el cliente los imprime tal
     cual en el confirm(). Dos toques desde el panel de Dirección. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, p059bEnv(), ['accionDepartamentoBaja']);
  const pedir = pass => JSON.parse(api.accionDepartamentoBaja({
    usuario:'Helitec', pass, dispositivoId:'d', empresa:'Helitec',
    departamento:'Operaciones' }).getContent());

  const dir = pedir('dir003');
  PRUEBAS.falso(!!dir.ok, '⚠️ Dirección no da de baja un área');
  PRUEBAS.falso(/Ana Suárez/.test(JSON.stringify(dir)),
    '⚠️ y sobre todo NO recibe los nombres de quienes están en ella');
  PRUEBAS.cierto(pedir('sup001') !== null, 'el DISCRIMINADOR: el supervisor sí llega a la acción');
});

PRUEBAS.caso('🔴 el plan PROPIO no viaja por el campo que el cliente lee como "de la empresa"', () => {
  /* Lo introduje yo al arreglar H1. `CFG_DEFAULT` no trae `cicloPlan`, así que en una empresa que
     nunca tocó «Guardar para toda la empresa» —el estado por defecto— la jornada propia de quien
     abría el panel pasaba a ser la de TODOS, y prellenaba el editor de empresa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `cicloPlanPropio` en el cuerpo de `accionTareasMias`. Ahora se siembra la
     jornada de la empresa (12 h) y la propia de Ana (10 h) y se pide `tareas_mias`: la de la
     empresa tiene que llegar por `cicloPlan` y la de Ana por `cicloPlanPropio`, sin pisarse. */
  const pedir = (conPropio) => {
    const env = GS.crearEntorno({
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'], ['Helitec','clave-sup','supervisor','Helitec','clave-med','clave-dir']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Op','Piloto']],
    'Config Empresa': [['Empresa','Clave','Valor'], ['Helitec','cicloPlan','{"traslado":60,"jornada":720,"regreso":60,"descanso":600}']],
    'Respuestas de formulario 1': [['A'], ['B']],
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan']],
    'Ciclo Persona': [['Empresa','Persona','Plan','Actualizado','ActualizadoPor']].concat(conPropio ? [['Helitec','Ana Suárez','{"traslado":60,"jornada":600,"regreso":60,"descanso":600}','2026-09-01','x']] : []),
  });
    const api = GS.cargarGs(CTX.gs, env, ['accionTareasMias']);
    return JSON.parse(api.accionTareasMias({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-1', dispositivoId:'d' }).getContent());
  };
  const con = pedir(true);
  PRUEBAS.cierto(!!con.ok, 'guarda: responde (' + (con.error || 'ok') + ')');
  PRUEBAS.igual(con.cicloPlan && con.cicloPlan.jornada, 720, '⚠️ `cicloPlan` es el de la EMPRESA (12 h): la jornada propia NO lo pisa');
  PRUEBAS.igual(con.cicloPlanPropio && con.cicloPlanPropio.jornada, 600, '⚠️ y la propia viaja por SU campo (10 h)');
  const sin = pedir(false);
  PRUEBAS.igual(sin.cicloPlan && sin.cicloPlan.jornada, 720, 'DISCRIMINADOR · sin jornada propia, la de la empresa sigue igual');
  PRUEBAS.cierto(sin.cicloPlanPropio == null, 'y `cicloPlanPropio` va vacío');
  /* Y el cliente los guarda en claves distintas. */
  PRUEBAS.cierto(typeof cicloPlanPropioGuardado === 'function', 'el cliente tiene su lector propio');
  PRUEBAS.falso(K_CICLO_PLAN === K_CICLO_PLAN_PROPIO,
    '⚠️ dos claves de localStorage distintas · compartirla era todo el defecto');
});

PRUEBAS.caso('🟡 el exceso de TRASLADO llega al reporte del médico', () => {
  /* H2 vio que las claves del plan no son las de `DUTY_TRAMOS` y arregló el ESCRITOR. El LECTOR se
     quedó igual: `plan["traslado_ida"]` daba `undefined` → `previsto = 0` → y como la guarda del
     exceso es `previsto > 0`, el exceso de traslado daba SIEMPRE 0. La pestaña Ciclo lo pintaba en
     rojo y la pestaña Jornada en 0, sobre el mismo turno. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `planK:"traslado"` en `DUTY_TRAMOS`. Ahora se mide una jornada con un
     traslado de ida de 2 h contra un plan de 1 h escrito con las claves del PLAN (`traslado`,
     `jornada`, `regreso`): el exceso del traslado tiene que llegar al reporte. Con el lector
     leyendo `plan["traslado_ida"]`, daba siempre 0. */
  const plan = '{"traslado":60,"jornada":720,"regreso":60,"descanso":600}';
  const fila = (hora, evento) => { const iso = '2026-09-10T' + hora + ':00.000Z'; return { fecha: '2026-09-10', hora: hora, iso: iso, persona: 'Ana Suárez', empresa: 'Helitec', departamento: 'Op', cargo: 'Piloto', evento: evento, test: '', resultado: null, plan: plan }; };
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({ 'Config Empresa': [['Empresa','Clave','Valor']] }), ['leerDuty']);
  const r = api.leerDuty([fila('06:00', 'salida_casa'), fila('08:00', 'llegada_aero'), fila('16:00', 'salida_aero'), fila('17:00', 'llegada_casa')], 7);
  PRUEBAS.igual(r.diario.length, 1, 'guarda: una jornada medida');
  const ida = (r.diario[0].tramos || []).find(t => t.tramo === 'traslado_ida') || {};
  PRUEBAS.igual(ida.previsto, 60, '⚠️ el tramo de ida lee su previsto con la clave del PLAN (`traslado` → 60)');
  PRUEBAS.igual(ida.real, 120, 'y midió 2 h reales');
  PRUEBAS.igual(ida.exceso, 60, '⚠️ 60 min de exceso de TRASLADO: llega al reporte del médico');
  PRUEBAS.igual(r.diario[0].excesoMin, 60, 'y suma al exceso del día (la jornada de 8 h no aporta)');
});

PRUEBAS.caso('🔴 tocar el nombre de una tarjeta abre la ficha de ESA persona', () => {
  /* El `onclick` indexaba `DASH._cicNames` (armado con la lista COMPLETA) con el índice de
     `activosMostrados` (sin inactivos y recortado). Con una sola persona en gris antes en el
     orden, tocar el nombre de Luis abría la ficha de Ana. No hacía falta buscar ni recortar:
     bastaba con que alguien no hubiera tocado un botón, que es el caso más común. */
  const hoy = todayStr();
  onDashData({
    ok:true, rol:'empresa', referencia:{ kss:{ amarillo:6, rojo:8 } }, metricas:['kss'],
    registros: [
      { persona:'Ana Gil',   empresa:'E', departamento:'Operaciones', cargo:'C', fecha:hoy, kss:3 },
      { persona:'Luis Pena', empresa:'E', departamento:'Operaciones', cargo:'C', fecha:hoy, kss:7 },
      { persona:'Marta Rios',empresa:'E', departamento:'Operaciones', cargo:'C', fecha:hoy, kss:5 }
    ],
    /* ⚠️ SIN EVENTOS NO HAY TARJETAS. Una persona que sólo está en `registros` entra al ciclo con
       `ciclo:null` → estado `inactivo` → va a los "grises", que se dibujan plegados y no como
       `.cic-card`. La primera versión de este caso pasaba `operacional: []` y medía sobre CERO
       tarjetas; la guarda de medibilidad lo puso en rojo en vez de dar un verde falso.
       `cicloDemo()` es el mismo generador determinista que usa la demostración de la app. */
    comentarios:[], pvt:[], aptitud:[], operacional: cicloDemo(), turnos:[],
    marca:null, duty:null, ausencias:{}, demo:false, config:{ persistencia:3, anonN:5 }
  }, 'E', {}, 'supervisor');

  const tmp = document.createElement('div');
  tmp.innerHTML = renderCicloOperativo();
  const cards = [...tmp.querySelectorAll('.cic-card')];
  PRUEBAS.alMenos(cards.length, 1, 'guarda de medibilidad: se dibujó al menos una tarjeta');

  let desalineadas = 0;
  cards.forEach(c => {
    const nom = c.querySelector('.cic-nom');
    const head = c.querySelector('.cic-head');
    if (!nom || !head) return;
    const arg = (head.getAttribute('onclick') || '');
    /* La invariante: el nombre que se ve y el que se abre son el mismo. Con el índice no se podía
       comprobar sin reproducir toda la aritmética; con el nombre adentro, se lee. */
    if (arg.indexOf(nom.textContent.trim()) === -1) desalineadas++;
  });
  PRUEBAS.igual(desalineadas, 0,
    '⚠️ cada tarjeta abre a la persona que muestra · ' + cards.length + ' tarjetas revisadas');
  PRUEBAS.falso(/_cicNames\[/.test(renderCicloOperativo()),
    '⚠️ y ya no se indexa una lista con el índice de otra');
});

PRUEBAS.caso('🟡 "ver en pantalla completa" abre la gente que se está viendo', () => {
  /* `DASH._cicFilas` se asignaba ANTES de aplicar la búsqueda, así que el modo pantalla completa
     abría a la primera de la lista entera y el contador decía "1 / 8" con una tarjeta a la vista. */
  const src = renderCicloOperativo.toString();
  const iFilas = src.indexOf('_cicFilas =');
  const iVis = src.indexOf('const visibles =');
  PRUEBAS.alMenos(iFilas, 1, 'guarda: se encontró la asignación');
  PRUEBAS.alMenos(iVis, 1, 'guarda: se encontró el filtro de búsqueda');
  PRUEBAS.cierto(iFilas > iVis,
    '⚠️ se guardan DESPUÉS de filtrar · antes se guardaba la lista sin filtrar');
  PRUEBAS.cierto(/_cicFilas = visibles/.test(src),
    '⚠️ y se guardan las visibles, no todas');
});

PRUEBAS.caso('🟡 la barra del ciclo rotula con el mismo plan con el que juzga', () => {
  /* H3 congela el plan al abrir el ciclo, pero `cicloTramosHtml` volvía a derivar el previsto del
     plan VIGENTE. Medido: jornada congelada en 12 h, la persona 8 h adentro, el supervisor la baja
     a 5 h desde esa misma tarjeta → «Quedan 0 min de 5 h», en azul y sin marca de excedido. */
  const src = cicloTramosHtml.toString();
  PRUEBAS.cierto(/tra\.previsto/.test(src),
    '⚠️ el previsto sale del tramo ya calculado, que es el congelado');
  PRUEBAS.falso(/const previsto = plan\[tr\.k\];/.test(src),
    '⚠️ y no se vuelve a derivar del plan de ahora');
});

PRUEBAS.caso('🟡 si las jornadas por persona no se pueden leer, la pantalla lo dice', () => {
  /* H8 agregó el canal de error en el `.gs` y `onDashData` lo guardaba en `DASH`, donde moría.
     Sin aviso, todas las jornadas propias desaparecen y cada persona vuelve a medirse contra la de
     la empresa: se ve idéntico a «nadie tiene jornada propia». */
  const hoy = todayStr();
  const payload = {
    ok:true, rol:'empresa', referencia:{ kss:{ amarillo:6, rojo:8 } }, metricas:['kss'],
    registros: [{ persona:'Ana Gil', empresa:'E', departamento:'Op', cargo:'C', fecha:hoy, kss:3 }],
    comentarios:[], pvt:[], aptitud:[], operacional:[], turnos:[],
    marca:null, duty:null, ausencias:{}, demo:false, config:{ persistencia:3, anonN:5 }
  };
  onDashData(Object.assign({}, payload, { cicloPlanPersonaError: 'no se pudo abrir la hoja' }),
             'E', {}, 'supervisor');
  const conError = renderCicloOperativo();
  PRUEBAS.cierto(conError.indexOf(t('cic_sin_jornadas')) !== -1,
    '⚠️ el aviso llega a la pantalla · antes viajaba y se tiraba');

  /* DISCRIMINADOR: sin error, no debe aparecer. Un aviso permanente no es un aviso. */
  onDashData(payload, 'E', {}, 'supervisor');
  PRUEBAS.igual(renderCicloOperativo().indexOf(t('cic_sin_jornadas')), -1,
    'y sin error no se muestra nada');
});
