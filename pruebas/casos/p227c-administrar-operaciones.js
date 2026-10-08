/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P227c · LA UI DE ADMINISTRACIÓN DE OPERACIONES                           (2026-10-08)

   Las tres acciones del endpoint existían desde P226 y ninguna tenía llamador. Esta pantalla es su
   consumidor: crear, editar, cerrar, reabrir, asignar y quitar.

   ⚠️ LO QUE ESTE ARCHIVO DEFIENDE DE VERDAD es el TERCER ESTADO de la respuesta. El ADR 015
   registra que este defecto volvió CUATRO veces: el supervisor tocaba asignar, el servidor
   contestaba algo que sonaba a éxito, y la persona no quedaba asignada. La política que salió de ahí
   es «la respuesta dice qué QUEDÓ», y son tres casos que la UI no puede confundir:
     · `ok:false` + `motivo`                  → se rechazó;
     · `ok:true` + `vigente:true`             → se escribió y cuenta hoy;
     · `ok:true` + `vigente:false` + `motivo` → se escribió y NO cuenta hoy.
   Mostrar el tercero como éxito reintroduce el defecto entero; mostrarlo como error hace que la
   persona reintente algo que ya está escrito en el CH.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p227cHayApp(){
  return typeof opsResultado === 'function' && typeof opsPintar === 'function' &&
         typeof OPSADM === 'object' && OPSADM !== null;
}
/* Monta la hoja con un payload de la forma que manda `action:'operaciones'` y la pinta. Devuelve el
   `#opsBody` ya renderizado. Restaura `OPSADM`, `DASH` y `NOMLIST` al salir. */
function p227cConHoja(estado, fn){
  const prevD = (typeof DASH !== 'undefined') ? DASH : null;
  const prevO = Object.assign({}, OPSADM);
  const prevN = (typeof NOMLIST === 'object' && NOMLIST) ? NOMLIST.datos : null;
  try {
    DASH = Object.assign({ rol:'supervisor', vista:'supervisor', params:{}, f:{ emp:'Empresa Uno' },
                           scope:'Empresa Uno', demoMode:false }, estado.dash || {});
    if (typeof NOMLIST === 'object' && NOMLIST) NOMLIST.datos = estado.nomina || [];
    OPSADM.lista = estado.lista || [];
    OPSADM.empresa = 'Empresa Uno';
    OPSADM.puedeEditar = ('puedeEditar' in estado) ? estado.puedeEditar : true;
    OPSADM.soloAgregados = !!estado.soloAgregados;
    OPSADM.asgError = estado.asgError || null;
    opsPintar();
    return fn(document.getElementById('opsBody'));
  } finally {
    try { DASH = prevD; } catch(e){}
    Object.keys(prevO).forEach(k => { OPSADM[k] = prevO[k]; });
    if (prevN && typeof NOMLIST === 'object' && NOMLIST) NOMLIST.datos = prevN;
  }
}

PRUEBAS.caso('🔴 P227c-1 · los CUATRO estados de la respuesta se dicen distinto, y el tercero no suena a falla', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsResultado`, que mira `d.ok` y `d.vigente` por separado.
     ⚠️ El cuarto caso (sin texto del servidor) existe porque mi primera versión hacía
     `tError(d) || t('ops_no_vigente')`, y `tError()` NUNCA devuelve vacío: sin texto cae en
     `err_generico` = «Algo salió mal». O sea el estado en que el dato SÍ se escribió se anunciaba
     como una falla, y la clave propia era inalcanzable. Lo destapó medir, no leer. */
  const prevToast = window.showToast, prevAcc = window.showToastAccion, prevD = DASH;
  const v = [];
  try {
    DASH = { rol:'supervisor', vista:'supervisor', params:{}, f:{emp:'E'}, scope:'E' };
    window.showToast = function(m){ v.push({ accion:null, txt:String(m) }); };
    window.showToastAccion = function(m, e){ v.push({ accion:String(e), txt:String(m) }); };

    const rechazo = opsResultado({ ok:false, motivo:'persona_sin_nomina',
      error:'Esa persona no está en la nómina de esta empresa.' }, 'ops_asignada');
    const t1 = v.splice(0)[0];
    const exito = opsResultado({ ok:true, vigente:true }, 'ops_asignada', function(){});
    const t2 = v.splice(0)[0];
    const noVig = opsResultado({ ok:true, vigente:false, motivo:'operacion_cerrada',
      error:'La operación está cerrada, así que la persona no cuenta todavía.' }, 'ops_asignada', function(){});
    const t3 = v.splice(0)[0];
    const noVigPelado = opsResultado({ ok:true, vigente:false }, 'ops_asignada', function(){});
    const t4 = v.splice(0)[0];

    PRUEBAS.igual(rechazo, false, '🔴 un rechazo devuelve false · el llamador no limpia el formulario');
    PRUEBAS.igual(exito, true, 'un éxito devuelve true');
    PRUEBAS.igual(noVig, true,
      '🔴 y «se escribió pero no cuenta» TAMBIÉN devuelve true · el dato está en el CH, la hoja se relee');

    PRUEBAS.igual(t2.accion, t('ops_deshacer'), '🔴 sólo el éxito ofrece «Deshacer»');
    PRUEBAS.igual(t1.accion, null, '🔴 un rechazo no ofrece deshacer algo que no se escribió');
    PRUEBAS.igual(t3.accion, null, 'ni el tercer estado, que necesita que la persona LEA el motivo');

    PRUEBAS.igual(new Set([t1.txt, t2.txt, t3.txt, t4.txt]).size, 4,
      '🔴 los cuatro textos son distintos · si dos coinciden, dos estados colapsan en la pantalla · ' +
      JSON.stringify([t1.txt, t2.txt, t3.txt, t4.txt]));
    PRUEBAS.falso(/sali[óo] mal|no se pudo|error|falló/i.test(t4.txt),
      '🔴 el cuarto NO dice que falló · el dato se escribió, y decirlo al revés hace reintentar lo ya guardado · ' +
      JSON.stringify(t4.txt));
    PRUEBAS.igual(t4.txt, t('ops_no_vigente'),
      'y usa la clave propia, que con el `||` de la primera versión era inalcanzable');
  } finally { window.showToast = prevToast; window.showToastAccion = prevAcc; try { DASH = prevD; } catch(e){} }
});

PRUEBAS.caso('🔴 P227c-2 · la hoja pinta las operaciones separadas por estado, con su gente', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo conceden `opsPintar` y `opsSeccion`. Entra por `opsPintar()`, que es lo que llama
     `opsCargar` tras la respuesta del servidor: el payload es el de `action:'operaciones'`. */
  p227cConHoja({
    nomina: [{ nombre:'Ana Suárez', cedula:'V-1' }, { nombre:'Beto Ruiz', cedula:'V-2' }],
    lista: [
      { nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1, gente:[{persona:'Ana Suárez'}] },
      { nombre:'Simulacro Marzo', tipo:'evento', estado:'activo', genteN:0, genteHistN:5, gente:[] },
      { nombre:'Planta Vieja', tipo:'instalacion', estado:'baja', genteN:0, genteHistN:3, gente:[] }]
  }, (body) => {
    const secs = [...body.querySelectorAll('.ops-sec-t')].map(x => x.textContent);
    PRUEBAS.igual(secs.length, 2, '🔴 dos secciones: activas y cerradas · ' + JSON.stringify(secs));
    PRUEBAS.cierto(/2/.test(secs[0]) && /1/.test(secs[1]),
      '🔴 con su conteo · 2 activas y 1 cerrada · ' + JSON.stringify(secs));
    const noms = [...body.querySelectorAll('.ops-nom')].map(x => x.textContent);
    PRUEBAS.igual(noms, ['Cardón IV', 'Simulacro Marzo', 'Planta Vieja'], 'las tres aparecen');
    PRUEBAS.igual([...body.querySelectorAll('.ops-gente li')].map(x => x.textContent.replace('×','')),
      ['Ana Suárez'], '🔴 y la gente de cada una, adentro');
    /* ⚠️ `genteHistN` distingue «nadie hoy» de «nunca nadie», y es lo que P227b midió que faltaba
       en el filtro. Acá se dice, pero sólo en las activas: en una cerrada es ruido. */
    const notas = [...body.querySelectorAll('.ops-nota')].map(x => x.textContent);
    PRUEBAS.igual(notas, [t('ops_sin_vigentes')],
      '🔴 UNA sola nota de «nadie hoy»: la del evento activo · en la cerrada es redundante · ' + JSON.stringify(notas));
    /* DISCRIMINADOR · una operación que nunca tuvo a nadie no lleva LA NOTA DE «nadie hoy».
       ⚠️ Se compara el TEXTO y no se cuentan las `.ops-nota`: con la nómina vacía aparece además la
       de «toda la nómina ya está asignada», que es correcta y hacía fallar al discriminador por el
       motivo equivocado. Un barrido más amplio que su invariante marca lo que está bien. */
    p227cConHoja({ lista: [{ nombre:'Nueva', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }] },
      (b2) => PRUEBAS.falso([...b2.querySelectorAll('.ops-nota')].some(x => x.textContent === t('ops_sin_vigentes')),
        'DISCRIMINADOR · sin gente histórica no sale la nota de «nadie hoy» · «nunca nadie» y «nadie hoy» son distintos'));
  });
});

PRUEBAS.caso('🔒 P227c-3 · sin `puedeEditar` no se ofrece ningún control de escritura', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ `puedeEditar` LO DECIDE EL SERVIDOR y viaja en la respuesta de `action:'operaciones'`
     (ADR 015). El cliente no re-deriva permisos: así es como se le terminan mostrando botones de
     escritura a quien el servidor va a rechazar. El derecho lo concede `opsPintar`, que apaga la
     caja de alta, y `opsSeccion`/`opsGenteHtml`, que no dibujan botones. */
  const lista = [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1,
                   gente:[{persona:'Ana Suárez'}] }];
  const nomina = [{ nombre:'Beto Ruiz', cedula:'V-2' }];
  p227cConHoja({ lista, nomina, puedeEditar: false }, (body) => {
    PRUEBAS.igual(body.querySelectorAll('.ops-btn').length, 0, '🔒 ningún botón de cerrar/reabrir/asignar');
    PRUEBAS.igual(body.querySelectorAll('.ops-x').length, 0, '🔒 ni el × de quitar a alguien');
    PRUEBAS.igual(body.querySelectorAll('.ops-asg select').length, 0, '🔒 ni el selector para asignar');
    const caja = document.getElementById('opsAltaCaja');
    PRUEBAS.igual(caja && caja.style.display, 'none', '🔒 y la caja de alta está apagada');
    PRUEBAS.cierto(body.textContent.indexOf(t('ops_solo_lectura')) >= 0,
      '🔒 y se DICE por qué, en vez de mostrar una pantalla sin controles sin explicación');
  });
  /* DISCRIMINADOR · con `puedeEditar` los controles SÍ están, o el aserto de arriba no mide nada. */
  p227cConHoja({ lista, nomina, puedeEditar: true }, (body) => {
    PRUEBAS.alMenos(body.querySelectorAll('.ops-btn').length, 1, 'DISCRIMINADOR · con permiso hay botones');
    PRUEBAS.alMenos(body.querySelectorAll('.ops-x').length, 1, 'DISCRIMINADOR · y el × de quitar');
    PRUEBAS.alMenos(body.querySelectorAll('.ops-asg select').length, 1, 'DISCRIMINADOR · y el selector');
  });
});

PRUEBAS.caso('🔴 P227c-4 · el selector no ofrece a quien ya está asignado', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsGenteHtml`, que arma `yaEstan` con `dashNorm` — la misma función que
     el cruce de P227b, no una comparación exacta: `registros[].persona` conserva la grafía del
     formulario cuando la identidad no se resolvió al padrón, así que «José Pérez» y «Jose Perez»
     son la misma persona y ofrecerla dos veces crearía una asignación duplicada. */
  p227cConHoja({
    nomina: [{ nombre:'José Pérez', cedula:'V-1' }, { nombre:'Beto Ruiz', cedula:'V-2' }],
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1,
              gente:[{persona:'Jose Perez'}] }]        // ← sin tildes, como lo escribiría el formulario
  }, (body) => {
    const sel = body.querySelector('.ops-asg select');
    PRUEBAS.cierto(!!sel, 'guarda: hay selector');
    const cand = [...sel.options].map(o => o.textContent).filter(x => x !== t('ops_elegir'));
    PRUEBAS.igual(cand, ['Beto Ruiz'],
      '🔴 sólo quien NO está asignado · y «José Pérez» se reconoce aunque la asignación diga «Jose Perez» · ' +
      JSON.stringify(cand));
    PRUEBAS.cierto([...sel.options].some(o => o.getAttribute('data-ced') === 'V-2'),
      '⚠️ y lleva la cédula, que es lo que `operacion_asignar` usa para identificar a la persona');
  });
  /* DISCRIMINADOR · si nadie está asignado, la nómina entera se ofrece. */
  p227cConHoja({
    nomina: [{ nombre:'José Pérez', cedula:'V-1' }, { nombre:'Beto Ruiz', cedula:'V-2' }],
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }]
  }, (body) => {
    const cand = [...body.querySelector('.ops-asg select').options]
      .map(o => o.textContent).filter(x => x !== t('ops_elegir'));
    PRUEBAS.igual(cand.length, 2, 'DISCRIMINADOR · sin nadie asignado se ofrecen las dos');
  });
});

PRUEBAS.caso('🔒 P227c-5 · una hoja de Asignaciones ilegible SE DICE, no se lee como «nadie»', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* La misma lección que `nominaError` y que la tarjeta de P227b: una lista de operaciones sin nadie
     se lee como un dato («no hay asignados») y no como una falla. `opPayloadPara_` manda
     `asignacionesError`; el derecho lo concede `opsPintar`, que lo pinta como aviso. */
  p227cConHoja({
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }],
    asgError: 'boom-asignaciones'
  }, (body) => {
    PRUEBAS.cierto(body.textContent.indexOf(t('ops_asg_error')) >= 0,
      '🔒 el aviso está · sin él, «0 personas» se lee como un hecho y la hoja está rota');
  });
  /* DISCRIMINADOR · sin error no hay aviso, o el aserto pasaría siempre. */
  p227cConHoja({
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }]
  }, (body) => {
    PRUEBAS.falso(body.textContent.indexOf(t('ops_asg_error')) >= 0,
      'DISCRIMINADOR · sin error no se avisa nada');
  });
});

PRUEBAS.caso('🔴 P227c-6 · la hoja existe en el HTML, «atrás» la conoce, y la guía arranca cerrada (R5)', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ Tres cosas que si faltan no rompen nada visible y dejan la pantalla a medias:
     · el overlay tiene que estar ESTÁTICO en el HTML, porque el MutationObserver que sincroniza
       foco e `inert` sólo engancha los `.overlay` presentes al cargar;
     · `silvaAtras` tiene una lista EXPLÍCITA: un overlay que no se nombre se come el toque de
       «atrás» sin hacer nada (su propio comentario lo dice);
     · R5 exige guía por módulo, cerrada por defecto. */
  PRUEBAS.cierto(!!document.getElementById('opsOv'), '🔴 el overlay está en el HTML, no inyectado');
  PRUEBAS.cierto(!!document.getElementById('opsFabBtn'), '🔴 y el botón que lo abre, en la nómina');
  opsPintarAyuda();
  const det = document.querySelector('#opsAyuda details');
  PRUEBAS.cierto(!!det, '🔴 R5 · la guía existe');
  PRUEBAS.falso(det && det.open, '🔴 R5 · y arranca CERRADA');
  PRUEBAS.alMenos((det ? det.textContent.length : 0), 200,
    '⚠️ y dice algo: explica qué es una operación, instalación contra evento, y que cerrar no borra');

  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('function silvaAtras');
    const cuerpo = src.slice(i, src.indexOf('\nfunction ', i + 10));
    PRUEBAS.cierto(/visible\('opsOv'\)/.test(cuerpo),
      '🔴 `silvaAtras` nombra a `opsOv` · su lista es explícita y lo que no se nombra no existe para «atrás»');
    /* ⚠️ Y LA BITÁCORA NO SE ESCRIBE ACÁ. `depEnviar` la escribe en el cliente porque el servidor de
       departamentos no registra; el de operaciones SÍ lo hace en las tres acciones, así que copiar
       eso escribiría cada hecho DOS veces en un log append-only (R3). */
    const j = src.indexOf('function opsEnviar(');
    PRUEBAS.alMenos(j, 0, 'guarda: `opsEnviar` está en el fuente');
    const env = src.slice(j, src.indexOf('\nfunction ', j + 10));
    PRUEBAS.falso(/bitacoraRegistrar\s*\(/.test(env),
      '🔴 `opsEnviar` NO escribe bitácora · el servidor ya la escribe y duplicarla viola R3');
    PRUEBAS.cierto(/bitacoraRegistrar\s*\(/.test(src.slice(src.indexOf('function depEnviar('),
      src.indexOf('\nfunction ', src.indexOf('function depEnviar(') + 10))),
      'DISCRIMINADOR · `depEnviar` SÍ la escribe, o el aserto de arriba no distingue nada');
  });
});

PRUEBAS.caso('🔴 P227c-7 · las claves `ops_` están en los dos idiomas, sin voseo y sin pisar otro prefijo', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ El prefijo se midió ANTES de escribir: `op_` tiene 94 claves (módulo operacional) y `ope_`
     tiene 20 (la tarjeta de P227a). Elegir uno ocupado ya costó una ronda entera en P227a, donde el
     renombre se llevó además una referencia ajena. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const defs = {};
    (src.match(/\b(ops_[a-z0-9_]+|hlp_ops)\s*:\s*'/g) || []).forEach(m => {
      const k = m.split(':')[0].trim(); defs[k] = (defs[k] || 0) + 1;
    });
    const claves = Object.keys(defs);
    PRUEBAS.alMenos(claves.length, 25, 'guarda: el barrido encuentra las claves (halló ' + claves.length + ')');
    PRUEBAS.igual(claves.filter(k => defs[k] !== 2), [],
      '🔴 todas están en los DOS idiomas · una que falte muestra la clave cruda en pantalla');
    /* R1 · español neutro: nunca voseo. Los comentarios pueden ir en rioplatense; esto es lo visible.
       ⚠️ SE MIRA EL VALOR DE CADA CLAVE `ops_`, no un tramo del archivo. Mi primera versión cortaba
       desde `ops_abrir:'Operaciones'` hasta su versión inglesa, y eso se lleva el diccionario español
       ENTERO —miles de claves ajenas y los comentarios del medio, que sí van en rioplatense—. Daba
       rojo por voseo que no era mío. Tercera vez en el día que un barrido más amplio que su
       invariante marca lo correcto. */
    const VOSEO = /\b(ten[ée]s|pod[ée]s|quer[ée]s|escrib[íi]|eleg[íi]|and[áa]|mir[áa]|fijate|sos)\b/i;
    const conVoseo = (src.match(/\b(?:ops_[a-z0-9_]+|hlp_ops)\s*:\s*'(?:[^'\\]|\\.)*'/g) || [])
      .filter(par => VOSEO.test(par));
    PRUEBAS.igual(conVoseo, [],
      '🔴 R1 · español neutro, sin voseo · los clientes son de Venezuela · ' + JSON.stringify(conVoseo.slice(0,2)));
    /* Y que no se haya pisado ninguna clave de los otros dos prefijos. */
    PRUEBAS.igual(claves.filter(k => /^op_|^ope_/.test(k)), [],
      '🔴 ninguna clave nueva cae en `op_` ni en `ope_`, que ya están ocupados');
  });
});
