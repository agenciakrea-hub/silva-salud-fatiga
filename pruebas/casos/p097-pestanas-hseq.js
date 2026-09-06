/* ── P097 · Predictivo sale de la barra, Costos entra sólo con datos cargados ────────────────────
   (2026-09-06)

   LA AUDITORÍA (2026-09-04): de las 8 pestañas de Dirección/HSEQ, 2 no servían para trabajar
   ningún día. Predictivo emite 6.213 caracteres de material de venta con TODOS los valores en
   "—" (PRED_ITEMS). Costos dice "Faltan 9 de 9 datos" salvo que la empresa los tenga cargados —
   y ninguna los tenía. Un cuarto de la barra del director, siempre vacío.

   EL ARREGLO: Predictivo se saca SIEMPRE de la barra (sigue vivo como bloque plegado al final de
   la vista, ver n5-sin-datos-abajo.js). Costos entra sólo si `cfg('costos')` resuelve a un objeto
   con AL MENOS un campo cargado.

   POR QUÉ ESTE CASO EXISTE APARTE DE MIRAR EL CÓDIGO: dashTabsFor() y dashOrderedTabs() son DOS
   listas separadas para la vista hseq — el propio archivo lo advierte varias veces ("tocá las
   dos, si no la pestaña queda inexistente sin ningún error"). Y hay una segunda trampa, más fina,
   que sólo aparece si se prueba por el camino real (R17): dashTabsFor() se llama desde
   onDashData() ANTES de que DASH._cfg quede seteado con el payload que acaba de llegar, así que
   leer cfg('costos') ahí adentro daría la config de la empresa ANTERIOR (o ninguna, en la primera
   carga de la sesión). Por eso dashTabsFor recibe un 4° parámetro explícito (`costosCfg`) en vez
   de leer cfg() siempre — y por eso el último grupo de casos entra por onDashData(), no arma DASH
   a mano: es la única manera de agarrar ese timing si algún día se rompe. */

PRUEBAS.grupo('P097 · dashTabsFor/dashOrderedTabs en Dirección/HSEQ');

// Un objeto de costos "de verdad": varios campos cargados, como quedaría tras configurar la
// empresa en la hoja Config Empresa. No hacen falta los 9 para que la pestaña sea útil.
const P097_COSTOS_OK = {
  horaHombre: 45, horaParada: 1800, incidenteLeve: 600, incidenteGrave: 25000,
  incidenteCatas: 800000, primaSeguro: 120000, incidentesBase: 4, horasHombre: 250000,
  factorConversion: 0.35
};

PRUEBAS.caso('predictivo nunca es una pestaña de Dirección/HSEQ', () => {
  const sinCostos = dashTabsFor('empresa', false, 'hseq');
  const conCostos = dashTabsFor('empresa', false, 'hseq', P097_COSTOS_OK);
  PRUEBAS.falso(sinCostos.indexOf('predictivo') >= 0,
    '⚠️ predictivo tiene que estar afuera de la barra: es material de venta con todos los valores en "—"');
  PRUEBAS.falso(conCostos.indexOf('predictivo') >= 0,
    '⚠️ y sigue afuera incluso con costos configurados — se sacó siempre, no según ninguna config');
});

PRUEBAS.caso('costos no aparece si la empresa no lo configuró', () => {
  PRUEBAS.falso(dashTabsFor('empresa', false, 'hseq').indexOf('costos') >= 0,
    'sin 4° argumento (nadie llamó con datos) la pestaña no puede aparecer');
  PRUEBAS.falso(dashTabsFor('empresa', false, 'hseq', null).indexOf('costos') >= 0,
    'null es "pendiente de configurar" (CFG_DEFAULT.costos) — nunca la pestaña');
  PRUEBAS.falso(dashTabsFor('empresa', false, 'hseq', {}).indexOf('costos') >= 0,
    '⚠️ un objeto VACÍO tampoco cuenta: es el mismo "Faltan 9 de 9" que hoy — hace falta al menos un dato adentro');
  PRUEBAS.falso(dashTabsFor('empresa', false, 'hseq', { horaHombre: null, horaParada: '' }).indexOf('costos') >= 0,
    '⚠️ ni un objeto con las claves presentes pero todas vacías/null');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR: con costos configurados, la pestaña SÍ aparece', () => {
  /* Sin este caso, los dos de arriba podrían pasar aunque `costos` hubiera quedado afuera de la
     lista PARA SIEMPRE (un `hseq.push('costos')` borrado por error también los dejaría en verde).
     Éste es el que demuestra que la condición hace algo, no que el código esté simplemente roto
     de un lado que los otros casos no miran. */
  const tabs = dashTabsFor('empresa', false, 'hseq', P097_COSTOS_OK);
  PRUEBAS.cierto(tabs.indexOf('costos') >= 0,
    '⚠️ con datos reales cargados, "costos" tiene que estar en la lista — si esto falla en rojo, la condición no está midiendo nada');
  // Y con UN solo campo cargado (una empresa a mitad de camino de configurarse) también entra.
  const parcial = dashTabsFor('empresa', false, 'hseq', { factorConversion: 0.2 });
  PRUEBAS.cierto(parcial.indexOf('costos') >= 0,
    'no hace falta tener los 9 campos: uno solo ya es "la empresa lo está configurando"');
});

PRUEBAS.caso('el resto de las pestañas de hseq no se mueve', () => {
  const tabs = dashTabsFor('empresa', false, 'hseq', P097_COSTOS_OK);
  ['idc', 'mrfo', 'intervenciones', 'auditoria', 'ciclo', 'jornada'].forEach(k =>
    PRUEBAS.cierto(tabs.indexOf(k) >= 0, '⚠️ "' + k + '" tiene que seguir estando — este prompt no las toca'));
});

PRUEBAS.grupo('P097 · dashOrderedTabs() no se desincroniza de dashTabsFor (la trampa que el archivo advierte)');

/* ⚠️ P054 CAMBIÓ LO QUE ESTO MIDE, y el caso estaba apoyado en el defecto. Cuando se escribió,
   `dashOrderedTabs()` tenía su PROPIA copia de la lista de hseq y lo que no estuviera en las dos se
   descartaba en silencio; el caso fijaba el contrato «que no se desincronicen».
   Desde P054 hay UNA sola lista de disponibilidad (`dashTabsFor` → `DASH.tabs`) y `dashOrderedTabs`
   sólo ORDENA lo que recibe. O sea que ya no puede haber dos listas que difieran — pero sí puede
   romperse el orden, y eso es lo que estos casos siguen cuidando.

   ⚠️ Y POR ESO HAY QUE PONER `tabs`: la versión anterior armaba `DASH` sin ese campo y funcionaba
   igual, porque la rama de hseq devolvía su lista fija sin mirarlo. Con la lógica nueva eso da `[]`.
   Es R17 en su forma más incómoda: la prueba pasaba GRACIAS al defecto. Ahora se arma `DASH` como
   lo arma `onDashData` — con `tabs` salido de `dashTabsFor` — que es el único estado que existe en
   producción. */
function p097OrderedParaCfg(costosCfg){
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  const tabs = dashTabsFor('empresa', false, 'hseq', costosCfg);
  DASH = { vista: 'hseq', rol: 'empresa', f: {}, tabs: tabs,
           _cfg: costosCfg != null ? { costos: costosCfg } : null };
  const orden = dashOrderedTabs();
  DASH = previo;
  return orden;
}

PRUEBAS.caso('sin costos configurados, las dos listas coinciden', () => {
  const deTabsFor = dashTabsFor('empresa', false, 'hseq', null);
  const deOrdered = p097OrderedParaCfg(null);
  PRUEBAS.igual(deOrdered, deTabsFor,
    '⚠️ dashOrderedTabs() y dashTabsFor() tienen que devolver EXACTAMENTE lo mismo para hseq sin costos');
  PRUEBAS.falso(deOrdered.indexOf('predictivo') >= 0, 'ninguna de las dos puede traer predictivo');
  PRUEBAS.falso(deOrdered.indexOf('costos') >= 0, 'ni costos sin configurar');
});

PRUEBAS.caso('con costos configurados, las dos listas coinciden', () => {
  const deTabsFor = dashTabsFor('empresa', false, 'hseq', P097_COSTOS_OK);
  const deOrdered = p097OrderedParaCfg(P097_COSTOS_OK);
  PRUEBAS.igual(deOrdered, deTabsFor,
    '⚠️ y también tienen que coincidir CON costos — si una lista se actualiza y la otra no, esto se pone en rojo');
  PRUEBAS.cierto(deOrdered.indexOf('costos') >= 0, 'las dos tienen que traer costos esta vez');
});

PRUEBAS.grupo('P097 · por el camino real: onDashData() con el payload que manda el endpoint');

/* R17: las pruebas de arriba llaman a dashTabsFor() directo, que es correcto para lo que miden,
   pero dashTabsFor() tiene una trampa de ORDEN que sólo aparece entrando por onDashData() de
   verdad: se llama ANTES de que DASH._cfg quede al día con el payload que acaba de llegar (ver el
   comentario largo en onDashData). Si algún día alguien "simplifica" el código y vuelve a leer
   cfg('costos') ahí adentro en vez de recibir el parámetro, este caso es el que se entera: entra
   como la PRIMERA carga de la sesión (DASH no existe todavía), que es el peor caso posible. */
function p097PayloadHseq(costos){
  return {
    ok: true, rol: 'empresa', vista: 'hseq', referencia: {}, metricas: [],
    registros: [{ persona: 'Marta Ríos', empresa: 'E', departamento: 'Op', cargo: 'Piloto',
                  fecha: todayStr(), kss: 5 }],
    comentarios: [], pvt: [], aptitud: [], operacional: [], turnos: [], marca: null,
    duty: null, ausencias: {},
    config: (costos != null) ? { persistencia: 3, anonN: 5, costos: costos } : { persistencia: 3, anonN: 5 }
  };
}

PRUEBAS.caso('primera carga de la sesión (sin DASH previo): sin costos, la pestaña no aparece', () => {
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = undefined;   // simula la primera carga real: todavía no hay ningún panel abierto
  onDashData(p097PayloadHseq(null), 'Empresa Demo', {}, 'hseq');
  const tabs = DASH.tabs.slice();
  const enPantalla = [...document.querySelectorAll('#dashBody .dash-sec')].map(s => s.dataset.tab);
  DASH = previo;
  PRUEBAS.falso(tabs.indexOf('costos') >= 0, 'DASH.tabs no puede traer costos sin configuración');
  PRUEBAS.falso(enPantalla.indexOf('costos') >= 0,
    '⚠️ y tampoco tiene que haber una sección .dash-sec de costos pintada en el DOM');
});

PRUEBAS.caso('⚠️ primera carga de la sesión CON costos ya cargados: la pestaña SÍ aparece', () => {
  /* Éste es el caso que agarra el bug de timing: si dashTabsFor leyera cfg('costos') en vez del
     parámetro, acá DASH todavía no existe → cfg() cae al default (null) → la pestaña NO
     aparecería aunque el payload la traiga configurada. Es la primera empresa que un admin abre
     en toda la sesión, y ya tiene los costos cargados: tiene que verlos desde el primer render. */
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = undefined;
  onDashData(p097PayloadHseq(P097_COSTOS_OK), 'Empresa Con Costos', {}, 'hseq');
  const tabs = DASH.tabs.slice();
  const enPantalla = [...document.querySelectorAll('#dashBody .dash-sec')].map(s => s.dataset.tab);
  DASH = previo;
  PRUEBAS.cierto(tabs.indexOf('costos') >= 0,
    '⚠️ DASH.tabs tiene que traer costos ya en la primera carga — si esto falla, volvió el bug de timing');
  PRUEBAS.cierto(enPantalla.indexOf('costos') >= 0,
    '⚠️ y tiene que existir la sección pintada en el DOM, no sólo en la lista');
});

PRUEBAS.caso('cambiar de empresa (DASH ya existía, con OTRA config) no arrastra la config vieja', () => {
  /* El otro lado de la misma trampa: si dashTabsFor cayera al fallback cfg('costos') en vez de
     usar el parámetro del payload nuevo, un admin que pasa de una empresa CON costos a otra SIN
     costos vería la pestaña sobrevivir con datos de la empresa anterior. */
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = undefined;
  onDashData(p097PayloadHseq(P097_COSTOS_OK), 'Empresa Con Costos', {}, 'hseq');
  PRUEBAS.cierto(DASH.tabs.indexOf('costos') >= 0, 'guarda: la primera empresa tiene que traer costos');
  onDashData(p097PayloadHseq(null), 'Empresa Sin Costos', {}, 'hseq');
  const tabs = DASH.tabs.slice();
  const enPantalla = [...document.querySelectorAll('#dashBody .dash-sec')].map(s => s.dataset.tab);
  DASH = previo;
  PRUEBAS.falso(tabs.indexOf('costos') >= 0,
    '⚠️ la empresa nueva no configuró costos: no puede heredar la pestaña de la que se dejó de mirar');
  PRUEBAS.falso(enPantalla.indexOf('costos') >= 0, 'ni la sección pintada en el DOM');
});
