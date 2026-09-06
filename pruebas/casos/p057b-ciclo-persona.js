/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P057b · N11 · LA JORNADA DE UNA PERSONA                                         (2026-09-06)

   Segundo de los tres tramos. P057a preparó el camino sin escribir nada; acá aparecen la hoja
   `Ciclo Persona`, las acciones del endpoint y el editor. El tercero —el umbral congelado y las
   ventanas de agrupación— sigue pendiente, y es el que tiene el dato irreversible.

   ── POR QUÉ HOJA APARTE Y NO `Config Empresa` ───────────────────────────────────────────────
   `Config Empresa` se lee ENTERA con `leerConfigEmpresa()` y su contenido viaja en la respuesta.
   Una fila por persona ahí pondría el padrón de nombres en un payload que también recibe
   Dirección/HSEQ — justo la vista que no puede ver nombres (K1b).

   ⚠️ Y POR EL MISMO MOTIVO EL MAPA NO VIAJA A HSEQ: sus claves SON nombres. Es el modo de fallar
   de A13, donde tres campos se recortaban y otros tres viajaban con nombres porque nadie los había
   mirado. El recorte va en el SERVIDOR: si el dato viaja en la respuesta, viajó.

   ── LO QUE SE VERIFICÓ MIRANDO ──────────────────────────────────────────────────────────────
   Con la demostración abierta, subiendo la jornada de Ana Suárez de 12 h a 14 h: su barra pasó a
   «Jornada · 14 h», su botón a «Jornada propia», la otra persona quedó en 12 h — y la tarjeta de
   Ana dejó de estar en rojo, porque sus 13 h 56 min ya no exceden. Eso último es la evidencia de
   que `cicloEstado` usa el plan de la persona, que es el llamador que la prueba de P057a encontró.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P057b · la jornada de una persona');

function p057bCon(mapa, fn) {
  const prev = DASH;
  try {
    DASH = Object.assign({}, prev || {}, { cicloPlanPersona: mapa || null });
    return fn();
  } finally { DASH = prev; }
}
function p057bClave(p) {
  return (typeof dashNorm === 'function') ? dashNorm(p) : String(p).trim().toLowerCase();
}

PRUEBAS.caso('⚠️ el plan de una persona manda sobre el de la empresa, y sólo para ella', () => {
  const base = cicloPlan();
  const tr = cicloTramos().find(x => x.k === 'jornada') || cicloTramos()[0];
  PRUEBAS.alMenos(base[tr.k] || 0, 1,
    'guarda de medibilidad: la empresa tiene una jornada · ' + JSON.stringify(base));
  const mapa = {}; mapa[p057bClave('Ana Suárez')] = Object.assign({}, base, { [tr.k]: base[tr.k] + 120 });
  p057bCon(mapa, () => {
    PRUEBAS.igual(cicloPlan('Ana Suárez')[tr.k], base[tr.k] + 120, '⚠️ Ana usa la suya');
    PRUEBAS.igual(cicloPlan('Luis Ferrer')[tr.k], base[tr.k], '⚠️ y el resto la de la empresa');
  });
});

PRUEBAS.caso('⚠️ quien decide si alguien está EXCEDIDO usa el plan de esa persona', () => {
  /* El llamador que se me había pasado en P057a y que encontró la prueba de aquel prompt.
     `cicloEstado` alimenta el chip de la tarjeta, los contadores de arriba y el color del borde:
     con el plan de la empresa, alguien con jornada propia más larga aparecería pasado de tiempo
     sin estarlo. Verificado mirando: al subir la jornada de Ana su tarjeta dejó de estar en rojo. */
  PRUEBAS.igual(typeof cicloEstado, 'function', 'guarda de medibilidad: la función existe');
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const cuerpo = (f.match(/function renderCicloOperativo\(\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cuerpo.length, 400, 'guarda: se encontró la función');
  PRUEBAS.cierto(/cicloEstado\(p\.ciclo, ahora, cicloPlan\(p\.persona\)\)/.test(cuerpo),
    '⚠️ `cicloEstado` recibe el plan de LA persona · si vuelve a `plan` a secas, alguien con jornada ' +
    'propia aparece excedido sin estarlo');
});

PRUEBAS.caso('⚠️ el mapa de jornadas NO viaja a Dirección/HSEQ (K1b)', () => {
  /* Sus claves son nombres. Se comprueba sobre el `.gs` REAL, que es donde vive el recorte —
     esconderlo en la pantalla no lo protege de nadie que abra las herramientas del navegador. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const gs = CTX.gs;
  PRUEBAS.alMenos(gs.length, 10000, 'guarda de medibilidad: se leyó el .gs · ' + gs.length);
  const bloque = (gs.match(/var planPorPersona = \{\}[\s\S]{0,700}/) || [''])[0];
  PRUEBAS.alMenos(bloque.length, 50, 'guarda: se encontró el armado del campo');
  PRUEBAS.cierto(/acc\.vista\s*!==\s*"hseq"/.test(bloque),
    '⚠️ el mapa se llena SÓLO si la vista no es hseq · ' + bloque.replace(/\s+/g, ' ').slice(0, 130));
});

PRUEBAS.caso('⚠️ el servidor y el cliente coinciden en QUIÉN puede cambiar la jornada', () => {
  /* Si el cliente dijera que sí y el servidor que no, la persona vería un formulario que siempre
     falla. Es un contrato entre dos lados, así que se prueba el contrato (R17). */
  PRUEBAS.igual(typeof cicloPuedeEditarPlan, 'function', 'guarda de medibilidad: existe en el cliente');
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador no se compara con el servidor'); return; }
  PRUEBAS.cierto(/function depPuedeEscribir\(acc\)/.test(CTX.gs),
    'guarda: el servidor tiene su regla');
  const srv = (CTX.gs.match(/function depPuedeEscribir\(acc\)[\s\S]*?\n\}/) || [''])[0];
  const cli = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n')
    .match(/function cicloPuedeEditarPlan\(\)[\s\S]*?\n\}/)[0];
  /* Las dos tienen que decir lo mismo: admin sí; médico sólo si su contraseña es la combinada. */
  ['admin', 'medico', 'combinada'].forEach(k => {
    PRUEBAS.cierto(srv.indexOf(k) >= 0 && cli.indexOf(k) >= 0,
      '⚠️ los dos lados nombran «' + k + '» · servidor:' + (srv.indexOf(k) >= 0) +
      ' cliente:' + (cli.indexOf(k) >= 0));
  });
});

PRUEBAS.caso('⚠️ EL CONTRATO · el servidor y el cliente derivan la MISMA clave de persona', () => {
  /* ⚠️ ESTE CASO ENCONTRÓ UN DEFECTO REAL, y es el bug nº1 de este repo: un escritor y un lector
     que derivan el mismo dato distinto. `cipClave` del servidor usaba `norm()`, que además de
     acentos reemplaza la PUNTUACIÓN por espacio; el cliente usa `dashNorm()`, que no la toca:

       "Luis O'Brien"  →  servidor «luis o brien»   ·  cliente «luis o'brien»

     El plan de cualquiera con apóstrofo, guión o punto en el nombre se guardaba bajo una clave que
     el cliente nunca iba a buscar. La persona configuraba su jornada, el servidor la guardaba, y
     su ciclo se seguía midiendo contra la de la empresa SIN UN SOLO ERROR en ningún lado.
     Ya había pasado igual con el `IdCaso` de Odoo, con este mismo apellido de ejemplo.
     Se arregló del lado del SERVIDOR porque `dashNorm` genera los ids de upsert del CH: cambiarla
     dejaría de parear filas ya escritas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede comparar'); return; }
  const env = GS.crearEntorno({ 'Accesos': [['Usuario','Clave','Rol','Empresas']] });
  const api = GS.cargarGs(CTX.gs, env, ['cipClave']);
  /* Nombres con lo que de verdad aparece en una nómina: apóstrofo, guión, punto y acentos. */
  const NOMBRES = ["Luis O'Brien", 'Ana Suárez', 'Núñez-Vega', 'J. Pérez', 'MARÍA  DEL  CARMEN'];
  /* DISCRIMINADOR: la comparación tiene que poder fallar. Si `dashNorm` no existiera, todo daría
     `undefined === undefined` y el caso pasaría sin comparar nada. */
  PRUEBAS.igual(typeof dashNorm, 'function', 'guarda de medibilidad: `dashNorm` existe en el cliente');
  PRUEBAS.cierto(dashNorm("Luis O'Brien") !== dashNorm('Luis OBrien'),
    'guarda: `dashNorm` distingue los nombres de prueba entre sí');
  const distintos = NOMBRES.filter(n => api.cipClave(n) !== dashNorm(n))
    .map(n => n + ': srv «' + api.cipClave(n) + '» ≠ cli «' + dashNorm(n) + '»');
  PRUEBAS.igual(distintos, [],
    '⚠️ los dos lados tienen que dar la MISMA clave · si divergen, el plan se guarda donde nadie lo busca');
});

PRUEBAS.caso('⚠️ un plan con basura NO se guarda a medias', () => {
  /* Un plan incompleto haría que la persona se mida contra una jornada que nadie configuró, y peor:
     en P057c ese número se congela. Se comprueba la validación del servidor. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador no se puede medir'); return; }
  const env = GS.crearEntorno({ 'Accesos': [['Usuario','Clave','Rol','Empresas']] });
  const api = GS.cargarGs(CTX.gs, env, ['cipPlanValido']);
  PRUEBAS.igual(api.cipPlanValido(null), null, 'null no es un plan');
  PRUEBAS.igual(api.cipPlanValido({}), null, 'un objeto vacío tampoco');
  /* ⚠️ ESTE CASO USABA `{ jornada: 480 }` Y PASABA — con la única clave que el defecto H2 no
     rompía. El servidor validaba contra `DUTY_TRAMOS`, cuyas claves son otras, así que de los
     cuatro tramos tecleados sólo sobrevivía `jornada`… que es justo la que yo había elegido para
     probar. Ahora se arma el plan desde la forma vigente, no a mano. */
  const completo = {};
  cicloTramos().forEach((tr, i) => { completo[tr.k] = 60 + i * 30; });
  PRUEBAS.igual(api.cipPlanValido(Object.assign({}, completo, { jornada: -5 })), null, '⚠️ ni minutos negativos');
  PRUEBAS.igual(api.cipPlanValido(Object.assign({}, completo, { jornada: 99999 })), null, '⚠️ ni más de un día');
  PRUEBAS.igual(api.cipPlanValido(Object.assign({}, completo, { jornada: 'ocho horas' })), null, '⚠️ ni texto');
  const ok = api.cipPlanValido(Object.assign({}, completo, { inventado: 999 }));
  PRUEBAS.cierto(!!ok, 'un plan COMPLETO sí se acepta · ' + JSON.stringify(ok));
  PRUEBAS.igual(ok && ok.jornada, completo.jornada, 'con su valor');
  PRUEBAS.falso(!!(ok && ok.inventado),
    '⚠️ y un tramo que la forma no declara se descarta, no se cuela a la hoja');
  PRUEBAS.igual(api.cipPlanValido({ jornada: 480 }), null,
    '⚠️ y un plan PARCIAL se rechaza entero (H6) · completarlo con el default del sector saltearía ' +
    'el de la empresa');
});
