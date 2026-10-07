/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P227b · EL FILTRO POR OPERACIÓN                                          (2026-10-07)

   La quinta dimensión del alcance. Lo que la hizo barata fue juntar primero los ocho bloques de
   filtrado en `dashEnAlcanceDe`.

   ⚠️ SEGUNDA VERSIÓN DE ESTE ARCHIVO, y la primera no podía ver NINGUNO de los dos bloqueantes que
   encontró el verificador. Los cinco casos armaban `DASH = { operaciones:[…], f:{…, op:''} }` a
   mano, y eso viola R17 textualmente («entrar por el punto de entrada de esa capa:
   `onDashData(payload)`, no `DASH = {…}`»). Tres consecuencias medidas:
     · el literal real de `onDashData` es `f:{period,desde,hasta,emp,dep,per,nivel}` — **sin `op`**,
       o sea en producción `DASH.f.op` arranca `undefined` y ningún caso corría ese estado;
     · ningún caso usaba la forma que `recortarParaVista_` produce para Dirección (`gente: []` con
       `persona:'P1'`), que es exactamente el bloqueante 1;
     · nadie tocaba `dashFilasPrevias`, que es el bloqueante 2.
   Ahora todos entran por `onDashData`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p227bHayApp(){
  return typeof onDashData === 'function' && typeof dashEnAlcanceDe === 'function' &&
         typeof opNombresDe === 'function' && typeof dashFiltrosPuestos === 'function';
}

/* La forma que manda el servidor de verdad. `extra` pisa lo que haga falta. */
function p227bPayload(extra){
  return Object.assign({
    ok:true, rol:'supervisor', vista:'supervisor', referencia:{}, metricas:['kss'],
    registros:[], comentarios:[], pvt:[], aptitud:[], turnos:[], ausencias:{}, duty:null,
    operacional:[], operacionalPeriodo:null, operaciones:[], operacionesError:null,
    config:{ sector:'aviacion' }, marca:null, combinada:false, zonaOp:null,
    nominaTotal:0, nominaSinDato:[], nominaError:null,
    cicloPlanPersona:{}, cicloPlanPersonaError:null, cuentas:null, visor:null,
    visorError:null, atajosAdmin:null
  }, extra || {});
}
function p227bReg(persona, fecha, kss, extra){
  return Object.assign({ persona:persona, empresa:'Empresa Uno', departamento:'Operaciones',
                         cargo:'Piloto', fecha:fecha, kss:kss }, extra || {});
}
/* Entra por el camino REAL y restaura. `DASH` se guarda y se devuelve entero: `onDashData` lo
   REEMPLAZA, así que no alcanza con limpiar `DASH.f`. */
function p227bEntorno(fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  const prevLS = Object.assign({}, localStorage);
  try { return fn(); }
  finally {
    try { DASH = prev; } catch(e){}
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
}

PRUEBAS.caso('🔴 P227b-1 · el filtro por operación recorta, entrando por `onDashData`', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `dashEnAlcanceDe` con `D.op`, que consulta `opNombresDe(x)` — y ésa lee el
     índice de `DASH.operaciones`, o sea la asignación REAL de la hoja, no el campo `Cargo`. */
  p227bEntorno(() => {
    const hoy = todayStr();
    onDashData(p227bPayload({
      registros: [p227bReg('Ana Suárez', hoy, 3), p227bReg('Beto Ruiz', hoy, 4)],
      operaciones: [
        { nombre:'Cardón IV',    tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez', clave:'ana suarez'}] },
        { nombre:'Planta Norte', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Beto Ruiz',  clave:'beto ruiz'}] }]
    }), 'Empresa Uno', {}, 'supervisor');

    /* ⚠️ EL ESTADO INICIAL REAL: `onDashData` no pone `op` en su literal de `f`. */
    PRUEBAS.cierto(!DASH.f.op,
      '⚠️ `DASH.f.op` arranca sin valor · así llega en producción, y el predicado tiene que tolerarlo');
    PRUEBAS.igual(dashFiltered().length, 2, 'guarda: sin filtro están los dos');

    DASH.f.op = 'Cardón IV';
    const soloCardon = dashFiltered().map(r => r.persona);
    PRUEBAS.igual(soloCardon, ['Ana Suárez'],
      '🔴 con «Cardón IV» queda sólo quien está asignado ahí · ' + JSON.stringify(soloCardon));

    DASH.f.op = 'Operación Que No Existe';
    PRUEBAS.igual(dashFiltered().length, 0,
      'DISCRIMINADOR · una operación inexistente no deja pasar a nadie · si diera 2, el filtro se ignora');
  });
});

PRUEBAS.caso('🔴 P227b-2 · a Dirección NO se le ofrece el filtro, porque no podría cruzarlo', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ EL BLOQUEANTE QUE ENCONTRÓ EL VERIFICADOR, y la cadena tiene cuatro eslabones, cada uno
     correcto por separado:
       · `opPayloadPara_` le manda a Dirección la lista de operaciones con su `genteN` pero con
         `gente: []` — la promesa de la lámina: el agregado sí, los nombres no;
       · `recortarParaVista_` además reemplaza cada `persona` por un pseudónimo («P1», «P2»…);
       · con `gente: []` el índice de asignaciones queda VACÍO y `opNombresDe` cae al puente de
         P224, devolviendo el CARGO;
       · el selector sólo ofrece el nombre de la entidad. Nunca coinciden.
     Resultado medido antes del arreglo: Dirección tocaba la única opción disponible y el panel
     entero se iba a cero, con `hseqSenalesHtml` afirmando «Sin reportes anónimos en el período» —
     una afirmación falsa, no un estado vacío.
     El derecho lo concede la guarda `_puedeCruzar` de `buildDashFilters`: si ninguna operación trae
     gente, el selector no se pinta. */
  p227bEntorno(() => {
    const hoy = todayStr();
    onDashData(p227bPayload({
      rol:'supervisor', vista:'hseq',
      registros: [p227bReg('P1', hoy, 3), p227bReg('P2', hoy, 5)],
      operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo',
                      genteN:2, genteHistN:2, gente:[] }]   // ← la forma REAL para hseq
    }), 'Empresa Uno', {}, 'hseq');

    PRUEBAS.igual(DASH.vista, 'hseq', 'guarda: la vista es la de Dirección');
    PRUEBAS.alMenos((DASH.operaciones || []).length, 1,
      'guarda: SÍ recibe la lista de operaciones · el recorte es de `gente`, no de la lista');
    PRUEBAS.igual((DASH.operaciones[0].gente || []).length, 0,
      'guarda: y sin nombres, que es la promesa de la lámina');

    buildDashFilters();
    PRUEBAS.falso(!!document.getElementById('dashOp'),
      '🔴 el selector de operación NO se le pinta · antes sí, y su única opción vaciaba el panel');

    /* ⚠️ Y EL DISCRIMINADOR ES LO QUE DE VERDAD IMPORTA: que su panel no esté vacío. Sin esto el
       caso daría verde con un selector escondido Y un panel roto por otra vía. */
    PRUEBAS.igual(dashFiltered().length, 2,
      '🔴 y su panel sigue mostrando sus dos filas · el bloqueante era que se iban a cero');
  });
});

PRUEBAS.caso('🔴 P227b-3 · la tendencia «vs. período previo» respeta la operación', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  if (typeof dashFilasPrevias !== 'function') { PRUEBAS.cierto(false, '⚠️ no está `dashFilasPrevias`: SIN MEDIR'); return; }
  /* ⚠️ EL SEGUNDO BLOQUEANTE, y es el «noveno sitio» que el refactor existía para evitar: la clave
     de memoización de `dashFilasPrevias` ENUMERABA las dimensiones a mano y no incluía `op`, así
     que al cambiar de operación devolvía las filas del período anterior sin filtrar. La flecha de
     los 7 indicadores comparaba una operación contra toda la empresa.
     El derecho lo concede `dashFiltroClave()`, que deriva de `DASH_DIMS`. */
  p227bEntorno(() => {
    const hoy = todayStr();
    const atras = (n) => { const d = new Date(); d.setDate(d.getDate() - n);
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    onDashData(p227bPayload({
      registros: [p227bReg('Ana Suárez', hoy, 3), p227bReg('Ana Suárez', atras(40), 4),
                  p227bReg('Beto Ruiz',  hoy, 5), p227bReg('Beto Ruiz',  atras(40), 6),
                  p227bReg('Beto Ruiz',  atras(45), 7)],
      operaciones: [
        { nombre:'Cardón IV',    tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] },
        { nombre:'Planta Norte', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Beto Ruiz'}] }]
    }), 'Empresa Uno', {}, 'supervisor');
    DASH.f.period = 'mes';

    if (typeof dashRangoPrevio === 'function' && !dashRangoPrevio()){
      PRUEBAS.cierto(false, '⚠️ sin rango previo este contrato queda SIN MEDIR'); return;
    }
    const sinFiltro = dashFilasPrevias().length;
    PRUEBAS.alMenos(sinFiltro, 1, 'guarda: hay filas en el período previo que medir');

    DASH.f.op = 'Cardón IV';
    const conFiltro = dashFilasPrevias();
    PRUEBAS.falso(conFiltro.length === sinFiltro && sinFiltro > 1,
      '🔴 al filtrar por operación las filas PREVIAS también se recortan · antes la caché devolvía ' +
      'las de todas las operaciones y la tendencia comparaba una contra la empresa entera');
    PRUEBAS.igual(conFiltro.map(r => r.persona).filter(x => x !== 'Ana Suárez'), [],
      '🔴 y sólo quedan las de quien está en esa operación · ' + JSON.stringify(conFiltro.map(r => r.persona)));
  });
});

PRUEBAS.caso('🔴 P227b-4 · con sólo la operación puesta, «atrás» NO cierra el panel', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  if (typeof dashHayFiltro !== 'function') { PRUEBAS.cierto(false, '⚠️ no está `dashHayFiltro`: SIN MEDIR'); return; }
  /* ⚠️ `dashHayFiltro` enumeraba cuatro dimensiones y no conocía `op`. `dashAtras()` la consulta
     para decidir si deshace un filtro o deja seguir a `portalBackToGate()`: con `false`, el panel se
     CERRABA y había que volver a entrar con la contraseña para quitar un filtro. Es palabra por
     palabra el defecto que ese handler se escribió para cerrar.
     El derecho lo concede `dashFiltrosPuestos()`, que deriva de `DASH_DIMS`. */
  p227bEntorno(() => {
    onDashData(p227bPayload({
      registros: [p227bReg('Ana Suárez', todayStr(), 3)],
      operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] }]
    }), 'Empresa Uno', {}, 'supervisor');

    PRUEBAS.falso(dashHayFiltro(), 'guarda: sin nada puesto no hay filtro que deshacer');
    DASH.f.op = 'Cardón IV';
    PRUEBAS.cierto(dashHayFiltro(),
      '🔴 con la operación puesta SÍ hay filtro · si da false, tocar atrás cierra el panel');
    PRUEBAS.igual(dashFiltrosPuestos(), ['op'], 'y la dimensión puesta se nombra · ' + JSON.stringify(dashFiltrosPuestos()));

    /* y se puede quitar: tiene chip con «×» y rama en `dashClear` */
    dashClear('op');
    PRUEBAS.falso(!!DASH.f.op, '🔴 y `dashClear(\'op\')` lo quita · antes no existía esa rama');
  });
});

PRUEBAS.caso('🔴 P227b-5 · el cruce tolera tildes y espacios de más', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ El servidor manda `gente[].persona` con la grafía de la NÓMINA, pero `registros[].persona`
     conserva la del formulario cuando la identidad no se resolvió al padrón — el `.gs` lo dice:
     «si no se resolvió, se DEJA EL QUE ESCRIBIÓ LA PERSONA». Con igualdad exacta, «José Pérez»
     contra «Jose Perez» no cruzaba y los tests de esa persona desaparecían al filtrar.
     El derecho lo concede `aptOperacionIndice`/`opNombresDe` usando `dashNorm`, que es la función
     que el repo YA usa para cruzar nombres (`cicloHistoricoFilas`, `cicloArmar`, el histórico). */
  p227bEntorno(() => {
    const hoy = todayStr();
    onDashData(p227bPayload({
      registros: [p227bReg('José Pérez', hoy, 3), p227bReg('María  López', hoy, 4)],
      operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:2,
                      gente:[{persona:'Jose Perez'}, {persona:'María López'}] }]
    }), 'Empresa Uno', {}, 'supervisor');
    DASH.f.op = 'Cardón IV';
    /* ⚠️ EL ASERTO MIDE EL INVARIANTE, NO LA FORMA, y mi primera versión lo hacía al revés: exigía
       `['José Pérez', 'María  López']` con el espacio doble tal como yo lo había escrito en el
       payload. El camino real lo COLAPSA —`onDashData` pasa los nombres por la resolución de
       identidad antes de guardarlos—, así que el aserto fallaba mientras el cruce funcionaba
       perfectamente. Es R19: «si el aserto afirma la FORMA de un resultado en vez del invariante,
       hay que reescribirlo». El invariante es «los dos entran», no «los dos entran con estos
       caracteres exactos». */
    const quedan = dashFiltered().map(r => dashNorm(r.persona)).sort();
    PRUEBAS.igual(quedan, ['jose perez', 'maria lopez'],
      '🔴 los dos cruzan · uno por el tilde y otro por el espacio doble · ' +
      JSON.stringify(dashFiltered().map(r => r.persona)));

    /* DISCRIMINADOR · alguien que de verdad no está asignado sigue afuera: normalizar no fusiona de más. */
    onDashData(p227bPayload({
      registros: [p227bReg('Zoe Ajena', hoy, 3)],
      operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Jose Perez'}] }]
    }), 'Empresa Uno', {}, 'supervisor');
    DASH.f.op = 'Cardón IV';
    PRUEBAS.igual(dashFiltered().length, 0,
      'DISCRIMINADOR · quien NO está asignado sigue afuera · normalizar no puede fusionar de más');
  });
});

PRUEBAS.caso('🔒 P227b-6 · un reporte ANÓNIMO no se esconde al filtrar por operación (R4)', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ R4 · LA CULTURA JUSTA SE VE, NO SE SUPONE. Un reporte anónimo no trae `persona` ni `cargo`
     en ningún punto del circuito —el servidor sólo agrega el nombre cuando `identificado` es true—,
     así que `opNombresDe` devuelve `[]` y el filtro los escondía TODOS. Para Dirección son los
     únicos reportes que recibe; para el supervisor, elegir una operación le ocultaba el canal
     anónimo sin decírselo, y ese canal es justamente el que R4 promete que existe.
     No se puede saber a qué operación pertenece un anónimo: mostrarlo de más es la falla segura.
     El derecho lo concede la guarda `if (quien && …)` de `dashEnAlcanceDe`. */
  p227bEntorno(() => {
    const anon = { persona:'', empresa:'Empresa Uno', departamento:'Operaciones', cargo:'',
                   identificado:false, creada: Date.now(), texto:'algo del turno' };
    const ident = { persona:'Ana Suárez', empresa:'Empresa Uno', departamento:'Operaciones',
                    cargo:'Piloto', identificado:true, creada: Date.now(), texto:'algo mío' };
    onDashData(p227bPayload({
      operaciones: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, gente:[{persona:'Ana Suárez'}] }]
    }), 'Empresa Uno', {}, 'supervisor');
    DASH.f.op = 'Cardón IV';

    PRUEBAS.cierto(dashEnAlcanceDe(anon, ALC_REPORTES),
      '🔒 el anónimo NO se descarta · esconder el canal anónimo es peor que mostrarlo de más');
    PRUEBAS.cierto(dashEnAlcanceDe(ident, ALC_REPORTES),
      'y el identificado de esa operación tampoco');
    /* DISCRIMINADOR · un identificado de OTRA operación sí se descarta, o el filtro no filtra. */
    const otro = Object.assign({}, ident, { persona:'Zoe Ajena' });
    PRUEBAS.falso(dashEnAlcanceDe(otro, ALC_REPORTES),
      'DISCRIMINADOR · un identificado de otra operación sí se descarta');
  });
});

PRUEBAS.caso('🔴 P227b-7 · ninguna función enumera ALGUNAS dimensiones del alcance y no todas', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ SEGUNDA VERSIÓN, y la primera NO servía para lo que su propio comentario declaraba. Decía ser
     «lo que corta la serie» y eran cuatro regex contra cuatro sitios NOMBRADOS A MANO: un quinto
     enumerador le era invisible. El verificador lo demostró en el acto — había DOS vivos
     (`renderResumen` titulando «todo el grupo» y `renderInforme` titulando «Análisis de <la empresa>»
     con los datos de una operación) y el caso estaba en verde.
     Un candado sobre los sitios conocidos no es el invariante; es la lista de los que ya se
     arreglaron.

     EL INVARIANTE DE VERDAD: una función que mira el alcance mira **todas** las dimensiones, o
     declara acá por qué no. Así un enumerador nuevo —el que alguien escriba mañana sin `op`— cae
     solo, sin que nadie lo nombre antes. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const DIMS = DASH_DIMS.slice();
    PRUEBAS.igual(DIMS.length, 5, 'guarda: hay cinco dimensiones · ' + JSON.stringify(DIMS));

    /* Las parciales DECLARADAS, cada una con su razón. Agregar una acá es una decisión, no un
       descuido: hay que poder escribir por qué esa función no necesita las cinco. */
    const PARCIALES = {
      dashEmpresaAdminCambiar: 'no necesita `op`/`nivel`: `onDashData` reemplaza `DASH.f` entero una línea después',
      dashClearOne:            'no nombra `emp` porque termina delegando en `dashClear(\'emp\')`',
      dashImprimirCabecera:    'MUERTA (alcanzabilidad.py, P144) · si alguien le da llamador, hay que arreglarla',
      dashImprimirPie:         'MUERTA (alcanzabilidad.py, P144) · ídem'
    };

    const enumeradores = (texto) => {
      const re = /^function ([A-Za-z_$][\w$]*)\s*\(/gm, pos = [];
      let m; while ((m = re.exec(texto))) pos.push({ i: m.index, nom: m[1] });
      const out = [];
      pos.forEach((p, k) => {
        const cuerpo = texto.slice(p.i, k + 1 < pos.length ? pos[k + 1].i : texto.length);
        const hay = DIMS.filter(d => new RegExp('DASH\\.f\\.' + d + '\\b').test(cuerpo));
        if (hay.length >= 3) out.push({ nom: p.nom, hay: hay, completa: hay.length === DIMS.length });
      });
      return out;
    };

    const todos = enumeradores(src);
    PRUEBAS.alMenos(todos.length, 5,
      'guarda: el barrido encuentra enumeradores (halló ' + todos.length + ') · si da 0 no está midiendo el fuente');

    const parcialesNoDeclaradas = todos.filter(e => !e.completa && !PARCIALES[e.nom]);
    PRUEBAS.igual(parcialesNoDeclaradas.map(e => e.nom + '[' + e.hay.join(',') + ']'), [],
      '🔴 estas funciones miran ALGUNAS dimensiones del alcance y no todas, sin estar declaradas · ' +
      'casi siempre es una dimensión nueva que no llegó · si es a propósito, va en `PARCIALES` con su razón');

    /* ⚠️ EL DISCRIMINADOR, que la primera versión no tenía: se inyecta un enumerador nuevo —tal como
       lo escribiría alguien que no sabe de `op`— y el caso TIENE que verlo y nombrarlo. */
    const colado = 'function dashRotuloColado(){\n' +
      '  return DASH.f.per || DASH.f.dep || DASH.f.emp || "";\n' + '}\n';
    const roto = src.replace('function dashAlcanceLabel(', colado + 'function dashAlcanceLabel(');
    PRUEBAS.falso(roto === src, 'guarda: el sabotaje tiene que modificar el fuente');
    const colados = enumeradores(roto).filter(e => !e.completa && !PARCIALES[e.nom]).map(e => e.nom);
    PRUEBAS.igual(colados, ['dashRotuloColado'],
      'DISCRIMINADOR · un enumerador nuevo sin `op` tiene que caer solo, SIN que nadie lo nombre antes · ' +
      JSON.stringify(colados));

    /* Y las ramas de `dashClear`, acotadas A SU CUERPO: el patrón anterior barría todo el fuente, y
       `level===\'dep\'`/`\'per\'` también están en `dashDrill`, así que borrar esas ramas de
       `dashClear` pasaba en verde. */
    const iCl = src.indexOf('function dashClear(');
    PRUEBAS.alMenos(iCl, 0, 'guarda: `dashClear` está en el fuente');
    const cuerpoClear = src.slice(iCl, src.indexOf('\nfunction ', iCl + 10));
    ['dep', 'per', 'nivel', 'op'].forEach(k => {
      PRUEBAS.cierto(new RegExp("level==='" + k + "'").test(cuerpoClear),
        '🔴 `dashClear` tiene rama para `' + k + '` EN SU CUERPO · sin ella el chip con «×» no haría nada');
    });

    /* Y la firma de contexto del auto-refresco no se RE-DERIVA de un payload reconstruido: se guarda.
       Las dos versiones anteriores de eso fallaron por alimentar mal un literal de 17 campos. */
    PRUEBAS.cierto(/const ctxAntes = \(DASH && DASH\._ctxSig\) \|\| ''/.test(src),
      '🔴 `ctxAntes` sale de la foto guardada, no de reconstruir el payload anterior a mano');
    PRUEBAS.alMenos((src.match(/DASH\._ctxSig = /g) || []).length, 2,
      '🔴 y la foto se guarda en los DOS caminos que derivan: la primera carga y el refresco');
  });
});

PRUEBAS.caso('🔒 P227b-8 · las asimetrías DELIBERADAS de cada sitio siguen ahí', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El refactor junta los ocho sitios y la tentación es que el predicado aplique siempre las cinco
     dimensiones. Tres sitios se rompen con eso, y el derecho lo conceden las constantes `ALC_*`:
     · `reportesFiltrados` no filtra por `emp` — `accionReportesLeer` ya entrega los de UNA sola
       (`norm(v[i][5]) !== key`). Filtrar de nuevo vaciaría la lista de un admin que cambiara de
       empresa sin que los reportes se recargaran.
     · `cicloPersonas` y `dashBuildSummary` no filtran por `nivel`.
     · `cicloHistoricoFilas` no filtra por `per`: su argumento `personaNorm` lo sustituye. */
  PRUEBAS.falso(!!ALC_REPORTES.emp, '🔒 `ALC_REPORTES` no aplica `emp` · el servidor ya recortó');
  PRUEBAS.falso(!!ALC_REPORTES.nivel, '🔒 ni `nivel`');
  PRUEBAS.falso(!!ALC_SIN_NIVEL.nivel, '🔒 `ALC_SIN_NIVEL` no aplica `nivel`');
  PRUEBAS.falso(!!ALC_SIN_PER.per, '🔒 `ALC_SIN_PER` no aplica `per`');
  PRUEBAS.cierto(!!ALC_SIN_PER.emp && !!ALC_SIN_PER.nivel,
    '🔒 pero sí las otras · omitir una dimensión es la excepción, no la regla');
  /* y las cuatro declaran `op`, o el filtro andaría en unas pestañas y no en otras */
  const sinOp = ['ALC_TODO','ALC_SIN_NIVEL','ALC_REPORTES','ALC_SIN_PER']
    .filter(k => !({ ALC_TODO:ALC_TODO, ALC_SIN_NIVEL:ALC_SIN_NIVEL,
                     ALC_REPORTES:ALC_REPORTES, ALC_SIN_PER:ALC_SIN_PER })[k].op);
  PRUEBAS.igual(sinOp, [], '🔴 las cuatro combinaciones declaran `op` · ' + JSON.stringify(sinOp));

  p227bEntorno(() => {
    onDashData(p227bPayload({}), 'Empresa Uno', {}, 'supervisor');
    DASH.f.emp = 'Empresa A';
    const deOtra = { persona:'Ana Suárez', empresa:'Empresa B', departamento:'Operaciones' };
    PRUEBAS.cierto(dashEnAlcanceDe(deOtra, ALC_REPORTES),
      '🔒 un reporte de otra empresa NO se descarta en el cliente');
    PRUEBAS.falso(dashEnAlcanceDe(deOtra, ALC_TODO),
      'DISCRIMINADOR · y con `ALC_TODO` sí · o el aserto de arriba no probaría nada');
  });
});

PRUEBAS.caso('🔴 P227b-9 · `opNombresDe` acepta `dep` Y `departamento`', () => {
  if (!p227bHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ Usaba sólo `p.dep`. Las personas de `aptGente` traen `dep`; los registros, comentarios y
     filas de `Operacional` —o sea lo que filtra `dashEnAlcanceDe`— traen `departamento`. Con
     `p.dep` undefined, `String(undefined).trim()` da la cadena «undefined», que nunca iguala al
     cargo, así que el puente de P224 se aplicaba SIEMPRE para esas entidades: una persona cuyo
     cargo es igual a su departamento habría entrado en una «operación» con el nombre de su
     departamento. */
  p227bEntorno(() => {
    onDashData(p227bPayload({ operaciones: [] }), 'Empresa Uno', {}, 'supervisor');
    PRUEBAS.igual(opNombresDe({ nombre:'A', cargo:'Operaciones', dep:'Operaciones' }), [],
      'con `dep`: cargo == departamento no es una operación');
    PRUEBAS.igual(opNombresDe({ persona:'A', cargo:'Operaciones', departamento:'Operaciones' }), [],
      '🔴 con `departamento` TAMBIÉN · antes devolvía ["Operaciones"] y el filtro inventaba una operación');
    PRUEBAS.igual(opNombresDe({ nombre:'A', cargo:'Op. Cardon', dep:'Operaciones' }), ['Op. Cardon'],
      'y el puente sí aplica cuando son distintos');
    PRUEBAS.igual(opNombresDe({ persona:'A', cargo:'Op. Cardon', departamento:'Operaciones' }), ['Op. Cardon'],
      'con las dos formas');
  });
});
