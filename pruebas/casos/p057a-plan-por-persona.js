/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P057a · N11 · EL CAMINO PARA EL PLAN POR PERSONA                                (2026-09-06)

   ── POR QUÉ ESTE PROMPT SE PARTIÓ EN TRES ───────────────────────────────────────────────────
   `enviarOperacional()` escribe `plan: JSON.stringify(cicloPlan())` con CADA evento, y ese número
   queda CONGELADO en la hoja `Operacional`. El endpoint lo defiende con todas las letras: «el día
   que una empresa baje la jornada de 12 h a 8 h todos los ciclos pasados quedarían excedidos
   retroactivamente. Un registro de "se pasó de jornada" tiene consecuencias laborales: no puede
   cambiar porque alguien editó una configuración».
   Si ese número se escribe con la jornada de la EMPRESA cuando la persona tiene la suya, queda mal
   escrito para siempre. Por eso el paso 1 —éste— NO ESCRIBE NADA: sólo prepara el camino, y se
   puede publicar sin riesgo porque mientras no exista un plan por persona todo devuelve lo mismo.

   ── LO QUE SE MIDIÓ Y NO COINCIDÍA CON EL PLAN ──────────────────────────────────────────────
   La fila decía «tres lugares llaman a `cicloPlan()` sin argumento». Son **DIEZ**, y en dos grupos:
   · EMPLEADO (4): `cicloMioGuardar`, `enviarOperacional`, `cicloMiBloque`, `cicloMio` — su propio
     ciclo. Todos pasan `cicloYo()`.
   · PANEL (6): `cicloArmar`, `cicloHistorico`, `cicloPromedios`, `cicloUbicarAguja`,
     `renderCicloOperativo`, `cicloFullPintar` — el de OTRAS personas.
   De los seis del panel, tres se conectaron ahora (los que tienen la persona a mano) y tres
   necesitan cambio de LÓGICA, no de firma: `cicloArmar` y `cicloHistorico` usan el plan para la
   VENTANA con la que agrupan eventos sueltos en ciclos, y eso se hace sobre todas las filas de una
   vez; hacerlo por persona es agrupar primero y aplicar a cada grupo su ventana. Va en P057c.
   `cicloPromedios` se queda con el de la empresa a propósito: un promedio del grupo contra planes
   distintos no significaría nada.

   ── LO QUE ESTE ARCHIVO SOSTIENE ────────────────────────────────────────────────────────────
   1. Que P057a NO cambió el comportamiento (misma jornada que antes, para todos).
   2. Que el camino está listo: en cuanto haya un plan por persona, lo toman los que deben.
   3. Que el campo nuevo NO se descarta en `onDashData` — la lista explícita que ya se comió
      `duty` y `ausencias` en el hallazgo A4.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P057a · el camino para el plan por persona');

PRUEBAS.caso('⚠️ sin plan por persona, TODO devuelve lo mismo que antes', () => {
  /* La propiedad que hace publicable este paso: si esto falla, el cambio no es inocuo. */
  PRUEBAS.igual(typeof cicloPlan, 'function', 'guarda de medibilidad: la función existe');
  const prev = DASH;
  try {
    DASH = Object.assign({}, prev || {}, { cicloPlanPersona: null });
    const sinNadie = cicloPlan();
    const conAlguien = cicloPlan('Ana Suárez');
    PRUEBAS.alMenos(Object.keys(sinNadie).length, 1,
      'guarda de medibilidad: el plan trae tramos · ' + JSON.stringify(sinNadie));
    PRUEBAS.igual(conAlguien, sinNadie,
      '⚠️ pasar una persona NO cambia nada mientras no haya plan propio · ' +
      JSON.stringify(sinNadie) + ' contra ' + JSON.stringify(conAlguien));
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ CON plan por persona, esa persona usa el suyo y el resto el de la empresa', () => {
  /* El discriminador del caso anterior: si `cicloPlanPersona` no se leyera, los dos serían iguales
     y el de arriba pasaría por la razón equivocada. */
  const prev = DASH;
  try {
    const base = cicloPlan();
    const trJornada = cicloTramos().find(x => x.k === 'jornada') || cicloTramos()[0];
    const propio = {}; propio[trJornada.k] = (base[trJornada.k] || 720) + 120;
    const clave = (typeof dashNorm === 'function') ? dashNorm('Ana Suárez') : 'ana suárez';
    const mapa = {}; mapa[clave] = propio;
    DASH = Object.assign({}, prev || {}, { cicloPlanPersona: mapa });
    const deAna = cicloPlan('Ana Suárez');
    const deOtro = cicloPlan('Luis Ferrer');
    PRUEBAS.igual(deAna[trJornada.k], base[trJornada.k] + 120,
      '⚠️ Ana usa SU jornada · ' + deAna[trJornada.k] + ' contra ' + base[trJornada.k]);
    PRUEBAS.igual(deOtro[trJornada.k], base[trJornada.k],
      '⚠️ y quien no tiene plan propio sigue con el de la empresa');
    PRUEBAS.igual(cicloPlan()[trJornada.k], base[trJornada.k],
      '⚠️ y sin persona, el de la empresa');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ el que CONGELA el umbral pasa la persona (la línea irreversible)', () => {
  /* No se puede ejecutar `enviarOperacional` sin mandar datos, así que se comprueba sobre la
     fuente: es la única línea del archivo cuyo error no se corrige después. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.alMenos(f.length, 100000, 'guarda de medibilidad: se leyó la fuente · ' + f.length);
  const cuerpo = (f.match(/function enviarOperacional\([\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cuerpo.length, 200, 'guarda: se encontró la función · ' + cuerpo.length);
  PRUEBAS.cierto(/plan:\s*JSON\.stringify\(cicloPlan\(cicloYo\(\)\)/.test(cuerpo),
    '⚠️ el umbral que se congela lleva la persona · si vuelve a `cicloPlan()` a secas, el día que ' +
    'haya planes propios se escribe la jornada de la empresa en un dato que NO se corrige');
});

PRUEBAS.caso('⚠️ los diez llamadores están conectados o documentados, ninguno olvidado', () => {
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  /* Se cuentan las llamadas REALES, sin comentarios: un `cicloPlan()` citado dentro de un `/* *​/`
     no es una llamada, y contarlo daría un falso rojo eterno. */
  const sinComentarios = f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const sinArg = (sinComentarios.match(/cicloPlan\(\)/g) || []).length;
  const conArg = (sinComentarios.match(/cicloPlan\([^)]+\)/g) || [])
    .filter(x => !/cicloPlanEmpresa|cicloPlanPersona|cicloPlanGuardar/.test(x)).length;
  PRUEBAS.alMenos(conArg, 3,
    '⚠️ hay llamadas que pasan la persona · encontré ' + conArg);
  /* ⚠️ QUEDAN EXACTAMENTE DOS SIN PERSONA, y los dos están decididos:
       1. `cicloPromedios`        · el promedio es del GRUPO; contra planes distintos no diría nada
       2. `renderCicloOperativo`  · alimenta el EDITOR del plan de empresa y los promedios
     Si aparece un tercero, alguien agregó un llamador sin decidir de quién es el plan — que es
     exactamente como se pierde este arreglo.

     ⚠️ Este número se movió DOS VECES y las dos por algo real:
     · empezó en 3 y dio 4, porque me había salteado `cicloEstado(p.ciclo, ahora, plan)` — LA línea
       que decide quién está excedido. El caso lo encontró;
     · y bajó a 2 en P057c, cuando las dos ventanas de agrupación pasaron a calcularse por persona
       y las variables `plan` de `cicloArmar` y `cicloHistorico` quedaron sin uso y se sacaron. */
  PRUEBAS.igual(sinArg, 2,
    '⚠️ quedan exactamente 2 sin persona, los dos decididos a propósito · encontré ' + sinArg);
});

PRUEBAS.caso('⚠️ `onDashData` NO descarta el campo nuevo (el hallazgo A4)', () => {
  /* `onDashData` arma `DASH` nombrando campos uno por uno. Un campo que el endpoint mande y que no
     esté en esa lista se descarta EN SILENCIO: ya pasó con `duty` y `ausencias`, y dos prompts
     enteros pasaron sus pruebas y no funcionaron en producción. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const cuerpo = (f.match(/function onDashData\([\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cuerpo.length, 400, 'guarda de medibilidad: se encontró `onDashData`');
  PRUEBAS.cierto(/cicloPlanPersona:\s*d\.cicloPlanPersona/.test(cuerpo),
    '⚠️ el campo está nombrado en la lista explícita · sin esto, el servidor lo manda en P057b y el ' +
    'cliente lo tira sin un solo error');
});
