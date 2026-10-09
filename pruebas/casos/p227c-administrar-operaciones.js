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
   `#opsBody` ya renderizado. Restaura `OPSADM`, `DASH` y `NOMLIST` al salir.
   ⚠️ `estado.nomina` LLEVA `persona`, NO `nombre`, porque eso es lo que `accionNominaListar` empuja.
   La primera versión de este arnés fabricaba `{nombre:'José Pérez'}` y con eso el caso P227c-4 —el
   que existe PARA medir el cruce de candidatos— daba verde sobre un selector que en producción
   salía SIEMPRE vacío: `operacion_asignar` era inalcanzable en todos los roles. El arnés que
   inventa la forma no prueba que el llamador real pueda dar lo que la función pide (R17), y la
   defensa contra la quinta vez no es este comentario sino `P227c-8`, que deriva la forma del `.gs`. */
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
    nomina: [{ persona:'Ana Suárez', cedula:'V-1' }, { persona:'Beto Ruiz', cedula:'V-2' }],
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
  const nomina = [{ persona:'Beto Ruiz', cedula:'V-2' }];
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
    nomina: [{ persona:'José Pérez', cedula:'V-1' }, { persona:'Beto Ruiz', cedula:'V-2' }],
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
    nomina: [{ persona:'José Pérez', cedula:'V-1' }, { persona:'Beto Ruiz', cedula:'V-2' }],
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

PRUEBAS.caso('🔴 P227c-8 · CONTRATO · el selector come la forma que el SERVIDOR manda, no una inventada', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ESTE ES EL CASO QUE CORTA LA SERIE, y existe porque el defecto ya iba por la CUARTA vez.
     `opsGenteHtml` leía `x.nombre` de `NOMLIST.datos`; `accionNominaListar` empuja `persona`. El
     selector salía siempre vacío con su nota «toda la nómina ya está asignada» y `operacion_asignar`
     no era alcanzable por ningún camino —ni en la demostración—, mientras la suite daba verde porque
     el fixture inventaba la forma. Es textual P154, que existe porque el MISMO `out.push` recortaba
     la cédula y dejó muerta la función Y5 entera.
     ⚠️ Cómo no depende de la forma del código cliente: las claves se LEEN del `.gs` y el fixture se
     arma poniendo un valor en CADA una. Si el cliente lee un campo que el servidor no manda, ese
     campo llega `undefined`, el filtro descarta la fila y no hay candidatos. No mira el fuente del
     cliente, mide el comportamiento. */
  const i = CTX.gs.indexOf('function accionNominaListar(');
  PRUEBAS.alMenos(i, 0, 'guarda: `accionNominaListar` está en el .gs servido');
  const j = CTX.gs.indexOf('out.push({', i);
  const bloque = CTX.gs.slice(j, CTX.gs.indexOf('});', j)).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const claves = (bloque.match(/(\w+)\s*:/g) || []).map(x => x.replace(':', '').trim())
                  .filter(k => k !== 'push');
  PRUEBAS.alMenos(claves.length, 4, 'guarda: se extrajeron las claves del payload · ' + JSON.stringify(claves));
  PRUEBAS.cierto(claves.indexOf('nombre') < 0,
    '🔴 el servidor NO manda `nombre` · si alguna vez lo mandara, este caso hay que revisarlo entero · ' +
    JSON.stringify(claves));

  /* La fila se arma con las claves del SERVIDOR, todas con el mismo valor. */
  const fila = { }; claves.forEach(k => { fila[k] = 'Ana Suárez'; });
  p227cConHoja({
    nomina: [fila],
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }]
  }, (body) => {
    const sel = body.querySelector('.ops-asg select');
    PRUEBAS.cierto(!!sel, 'guarda: hay selector');
    const cand = [...sel.options].map(o => o.textContent).filter(x => x !== t('ops_elegir'));
    PRUEBAS.igual(cand, ['Ana Suárez'],
      '🔴 con la forma REAL del servidor, la persona SE OFRECE · un selector vacío acá significa que ' +
      '`operacion_asignar` no es alcanzable en producción · ' + JSON.stringify(cand));
    PRUEBAS.falso([...body.querySelectorAll('.ops-nota')].some(x => x.textContent === t('ops_sin_candidatos')),
      '🔴 y NO dice «toda la nómina ya está asignada» sobre una operación sin nadie · ' +
      'ése era el síntoma exacto, y se leía como un dato');
  });
  /* DISCRIMINADOR · sin la clave que lleva el nombre, el caso tiene que ponerse en rojo. */
  const mutilada = Object.assign({}, fila); delete mutilada.persona;
  p227cConHoja({
    nomina: [mutilada],
    lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }]
  }, (body) => {
    const cand = [...body.querySelector('.ops-asg select').options]
      .map(o => o.textContent).filter(x => x !== t('ops_elegir'));
    PRUEBAS.igual(cand, [],
      'DISCRIMINADOR · quitando la clave del nombre el selector queda vacío · ' +
      'o el aserto de arriba no mide nada');
  });
});

PRUEBAS.caso('🔴 P227c-9 · una respuesta que NO escribió nada no ofrece «Deshacer»', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsResultado`, leyendo `d.cambio` —que el servidor deriva de la misma
     expresión con la que decide la bitácora (GS 2026-10-09.1)—.
     ⚠️ POR QUÉ IMPORTA, con el escenario medido: A quita a Ana de Cardón IV; la pantalla de B todavía
     la muestra con su ×; B toca × y el servidor contesta `yaEstaba` (no escribe, no deja bitácora);
     B ve «Persona quitada» con «Deshacer» y lo toca → `operacion_asignar` reincorpora a Ana, con su
     `Desde` original perdido y una línea nueva en un log append-only (R3). Un botón rotulado
     «Deshacer», sobre una acción que no hizo nada, revirtiendo lo de otra persona.
     ⚠️ Las tres formas son LAS DEL SERVIDOR, no inventadas: `{quitada,noEstaba}` y
     `{quitada,yaEstaba}` de `accionOperacionAsignar`, y `{repetida:igual}` de su upsert. */
  const prevToast = window.showToast, prevAcc = window.showToastAccion, prevD = DASH;
  const v = [];
  try {
    DASH = { rol:'supervisor', vista:'supervisor', params:{}, f:{emp:'E'}, scope:'E' };
    window.showToast = function(m){ v.push({ accion:null, txt:String(m) }); };
    window.showToastAccion = function(m, e){ v.push({ accion:String(e), txt:String(m) }); };
    const pasar = (d) => { opsResultado(d, 'ops_quitada', function(){}); return v.splice(0)[0]; };

    const noEstaba  = pasar({ ok:true, cambio:false, quitada:true, noEstaba:true });
    const yaEstaba  = pasar({ ok:true, cambio:false, quitada:true, yaEstaba:true });
    const repetida  = pasar({ ok:true, cambio:false, actualizada:false, repetida:true, vigente:true });
    const siCambio  = pasar({ ok:true, cambio:true, quitada:true, filas:1 });

    PRUEBAS.igual([noEstaba.accion, yaEstaba.accion, repetida.accion], [null, null, null],
      '🔴 ninguna de las tres formas no-op ofrece «Deshacer» · deshacer lo que no se hizo escribe un ' +
      'hecho nuevo y revierte lo de otra persona');
    PRUEBAS.igual([noEstaba.txt, yaEstaba.txt, repetida.txt],
      [t('ops_sin_cambio'), t('ops_sin_cambio'), t('ops_sin_cambio')],
      '🔴 y las tres lo DICEN · «Persona quitada» sobre un no-op es una pantalla que miente');
    PRUEBAS.igual(siCambio.accion, t('ops_deshacer'),
      'DISCRIMINADOR · la que SÍ escribió conserva su «Deshacer» · sin esto el caso pasaría quitándolo siempre');
    /* ⚠️ `=== false`, no `!d.cambio`: contra un endpoint anterior a GS 2026-10-09.1 el campo llega
       `undefined` y la pantalla se comporta como antes, en vez de perder el «Deshacer» de los casos
       que sí escribieron. Es lo que permite publicar el endpoint primero y la app después. */
    PRUEBAS.igual(pasar({ ok:true, quitada:true }).accion, t('ops_deshacer'),
      '🔴 sin el campo (endpoint viejo) se comporta como antes · el despliegue no tiene ventana rota');
  } finally { window.showToast = prevToast; window.showToastAccion = prevAcc; try { DASH = prevD; } catch(e){} }
});

PRUEBAS.caso('🔴 P227c-10 · toda clave que la pantalla USA está definida en los dos idiomas', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ Esto cazó `ope_sin_detalle`: P227c escribió su consumidor y NO la clave, así que `t()` caía en
     `if (s == null) s = String(clave)` y la pantalla mostraba el literal `ope_sin_detalle` a
     Dirección. Lo prometía el comentario que la había quitado —«cuando P227c le muestre operaciones
     a Dirección, la clave se crea ahí, con su consumidor»— y P227c cumplió la mitad.
     El trinquete de P227a-8 cuenta HUÉRFANAS (clave sin consumidor); esto es el sentido contrario, y
     es el que deja ver un identificador de código en producción.
     ⚠️ Se barre el cuerpo de las funciones `ops*`, no el archivo: un barrido más amplio que su
     invariante marca lo correcto, y ya pasó tres veces en este prompt. */
  const src = document.documentElement.outerHTML;
  const fuente = (typeof opsGenteHtml === 'function')
    ? [opsGenteHtml, opsPintar, opsSeccion, opsResultado, opsCargar, opsEnviar, opsAbrir,
       opsGuardar, opsPedirAlta, opsPedirBaja, opsAsignar, opsQuitar, opsError, opsLimpiarAlta,
       opsTipoCambio, opsActualizarBoton].map(f => String(f)).join('\n') : '';
  PRUEBAS.alMenos(fuente.length, 2000, 'guarda: se leyeron los cuerpos de las funciones `ops*`');
  /* ⚠️ `matchAll` con el GRUPO, no `match` + `replace`. Mi primera versión hacía
     `.replace(/^.*'/, '')` sobre `t('ops_quitar'`, y `^.*'` es GREEDY: se comía hasta el último
     apóstrofo y dejaba la cadena vacía. Las 19 claves colapsaban en `['']` y `usadas.length` daba 1.
     Lo cazó la guarda `alMenos(usadas.length, 15)`, que es exactamente para lo que está: sin ella
     el caso habría dado verde midiendo una sola clave inventada. */
  const usadas = [...new Set([...fuente.matchAll(/\bt\('([a-z0-9_]+)'/g)].map(m => m[1]))];
  PRUEBAS.alMenos(usadas.length, 15, 'guarda: hay claves que medir · ' + usadas.length);
  const sinTraducir = usadas.filter(k => t(k) === k);
  PRUEBAS.igual(sinTraducir, [],
    '🔴 ninguna clave usada sale sin traducir · `t()` devuelve el literal y eso se VE en pantalla · ' +
    JSON.stringify(sinTraducir));
  /* Y en los DOS idiomas: una clave sólo en español deja el literal para quien usa inglés. */
  const faltaEn = usadas.filter(k => {
    const re = new RegExp('\\b' + k + "\\s*:\\s*'", 'g');
    return (src.match(re) || []).length < 2;
  });
  PRUEBAS.igual(faltaEn, [],
    '🔴 y definida DOS veces · una por idioma · ' + JSON.stringify(faltaEn));
  /* DISCRIMINADOR · una clave que nadie definió tiene que caer. */
  PRUEBAS.igual(t('ops_clave_que_no_existe_jamas'), 'ops_clave_que_no_existe_jamas',
    'DISCRIMINADOR · `t()` de una clave inexistente devuelve el literal · es lo que el filtro detecta');
});

PRUEBAS.caso('🔒 P227c-11 · sin credenciales la caja de alta NO queda a la vista', () => {
  if (!p227cHayApp() || typeof opsMostrarAlta !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no está `opsMostrarAlta`: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsCargar`, que llama `opsMostrarAlta(false)` en los tres caminos que no
     llegan a `opsPintar`. Es lo que `depCargar` ya hacía con su motivo escrito: «dejarlo a la vista
     invita a escribir un nombre y que no pase nada».
     ⚠️ Se llega de verdad: `closePortal()` deja hojas huérfanas sobre el inicio y pone `DASH = null`.
     Con la nómina huérfana arriba, tocar «Operaciones» abre la hoja, el cuerpo dice «faltan
     credenciales» y antes quedaba el campo y el «+» invitando a escribir. */
  const caja = document.getElementById('opsAltaCaja');
  PRUEBAS.cierto(!!caja, 'guarda: la caja existe en el HTML');
  const prevD = DASH, prevF = window.fetchConReloj;
  try {
    window.fetchConReloj = () => new Promise(() => {});      // nada sale a la red
    opsMostrarAlta(true);                                     // se parte de «visible», como tras otra empresa
    PRUEBAS.igual(caja.style.display, '', 'guarda: la caja arranca visible');
    DASH = { rol:'supervisor', vista:'supervisor', params:{}, f:{}, scope:'E', demoMode:false };
    opsCargar();                                              // sin usuario ni clave
    PRUEBAS.igual(caja.style.display, 'none',
      '🔒 sin credenciales la caja se apaga · un campo que no puede guardar nada es una promesa falsa');
    const body = document.getElementById('opsBody');
    PRUEBAS.cierto(body && body.textContent.indexOf(t('tar_err_creds')) >= 0,
      '🔒 y el cuerpo dice por qué');
  } finally { try { DASH = prevD; } catch(e){} window.fetchConReloj = prevF; }
  /* DISCRIMINADOR · con `puedeEditar` la caja SÍ se ve, o el aserto pasaría siempre. */
  p227cConHoja({ lista: [], puedeEditar: true }, () => {
    PRUEBAS.igual(document.getElementById('opsAltaCaja').style.display, '',
      'DISCRIMINADOR · con permiso de escritura la caja se ve');
  });
});
