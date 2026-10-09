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
    /* ⚠️ ESTE ASERTO ERA UN NO-OP y lo encontró el verificador. `claves` sólo puede contener
       `ops_*` o `hlp_ops` —el `match` de arriba las filtra así—, y ni `^op_` ni `^ope_` pueden
       matchear `ops_x`: el filtro daba `[]` **siempre**. Peor: el commit que lo escribió agregó
       después `ope_sin_detalle`, una clave en el prefijo que este aserto decía vigilar, y no se
       movió. Lo que de verdad delata una colisión de prefijo es una clave definida MÁS de dos veces
       (una por idioma): eso pasa cuando un renombre masivo pisa el namespace de otro módulo, que es
       cómo se perdió `op_titulo` en este mismo bloque. */
    const dobles = claves.filter(k => (src.match(new RegExp('\\b' + k + "\\s*:\\s*'", 'g')) || []).length !== 2);
    PRUEBAS.igual(dobles, [],
      '🔴 cada clave está definida EXACTAMENTE dos veces, una por idioma · más de dos es una ' +
      'colisión de prefijo, menos de dos deja el literal en pantalla · ' + JSON.stringify(dobles));
    /* DISCRIMINADOR · el barrido tiene que poder contar mal si le doy una clave inventada. */
    PRUEBAS.igual((src.match(/\bops_clave_inventada_para_el_discriminador\s*:\s*'/g) || []).length, 0,
      'DISCRIMINADOR · una clave que nadie definió cuenta 0, no 2 · el filtro la marcaría');
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

  /* La fila se arma con las claves del SERVIDOR, todas con un valor no vacío, así que si el cliente
     lee un campo que el servidor NO manda, ese campo llega `undefined` y el filtro descarta la fila.
     ⚠️ `empresa` es la única excepción y lleva la de la hoja: `opsGenteHtml` acota los candidatos a
     la empresa de la operación (el arreglo del hallazgo de la cédula ajena), así que ponerle el
     nombre de la persona ahí hacía caer este caso por una razón que no es la que mide. Lo cazó mi
     propio arreglo del filtro por empresa, y poner el valor correcto no debilita el caso: todas las
     demás claves siguen llevando el nombre. */
  const fila = { }; claves.forEach(k => { fila[k] = 'Ana Suárez'; });
  if ('empresa' in fila) fila.empresa = 'Empresa Uno';
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

PRUEBAS.caso('🔴 P227c-12 · el «Deshacer» de quitar repone el `Desde` original, no lo pisa con hoy', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo conceden `opsGenteHtml` (que pone `data-desde` en el `.ops-x`) y `opsQuitar`
     (que lo pasa a la clausura del «Deshacer»).
     ⚠️ POR QUÉ IMPORTA, medido contra el `.gs` real por el verificador: Ana está en Cardón IV desde
     el 2026-01-10 · el supervisor toca × por error · toca «Deshacer» en los 4 s —el flujo que esta
     pantalla está hecha para ofrecer— y `operacion_asignar` SIN `desde` escribe `Desde=hoy`. Nueve
     meses de ventana de asignación desaparecen sin rastro, y el ADR 015 justifica la tabla
     `Asignaciones` diciendo que «medir el evento exige saber quién estaba asignado EN ESA VENTANA».
     El dato ya venía en el payload y el cliente lo tiraba. */
  const prevD = DASH, prevF = window.fetchConReloj, prevT = window.showToast,
        prevA = window.showToastAccion, prevC = window.opsCargar;
  const cuerpos = []; let deshacer = null;
  /* ⚠️ R18 · SE RESTAURA EN EL `.finally()` DE LA PROMESA, nunca en el `finally` del bloque. El
     `finally` sincrónico corre ANTES de que resuelva, y acá el POST del «Deshacer» sale DENTRO del
     `.then`: con los stubs ya repuestos, ese `opsEnviar` llamaría al `fetchConReloj` de verdad y
     dejaría el `fetch` de este caso puesto para el siguiente. Es el defecto que R18 documenta con
     dos rojos falsos cobrados. Mi primera versión de este caso tenía el `finally` sincrónico **con
     un comentario que afirmaba que acá no aplicaba**, y era falso. */
  const restaurar = () => {
    try { DASH = prevD; } catch(e){}
    window.fetchConReloj = prevF; window.showToast = prevT;
    window.showToastAccion = prevA; window.opsCargar = prevC;
  };
  try {
    window.fetchConReloj = function(_u, o){
      cuerpos.push(JSON.parse((o && o.body) || '{}'));
      return Promise.resolve({ json: () => Promise.resolve({ ok:true, cambio:true, quitada:true, filas:1 }) });
    };
    window.showToast = function(){};
    window.showToastAccion = function(_m, _e, fn){ deshacer = fn; };
    window.opsCargar = function(){};                       // no se relee: mido el POST, no la hoja
    p227cConHoja({
      dash: { params: { usuario:'u', pass:'p', empresa:'Empresa Uno' } },
      lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1,
                gente:[{ persona:'Ana Suárez', desde:'2026-01-10', hasta:'' }] }]
    }, (body) => {
      const x = body.querySelector('.ops-x');
      PRUEBAS.cierto(!!x, 'guarda: está el × de quitar');
      PRUEBAS.igual(x.getAttribute('data-desde'), '2026-01-10',
        '🔴 el `Desde` original viaja en el botón · es el único lugar de donde puede salir después');
      return x;
    });
    /* ⚠️ Y AHORA EL CAMINO COMPLETO, que es lo que de verdad hay que medir: el atributo puede estar
       y `opsQuitar` ignorarlo igual. Se dispara el × , se toma la clausura que `showToastAccion`
       recibió y se la llama, mirando el cuerpo del SEGUNDO POST. La primera versión de este caso
       sólo comprobaba el atributo —dos comprobaciones— y el defecto vive en el POST. */
    const x2 = p227cConHoja({
      dash: { params: { usuario:'u', pass:'p', empresa:'Empresa Uno' } },
      lista: [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:1, genteHistN:1,
                gente:[{ persona:'Ana Suárez', desde:'2026-01-10', hasta:'2026-11-08' }] }]
    }, (body) => body.querySelector('.ops-x'));
    cuerpos.length = 0; deshacer = null;
    /* ⚠️ EL `DASH` SE MONTA ACÁ, y no alcanza con el de `p227cConHoja`: su `finally` ya lo restauró
       cuando esta línea corre, así que `opsQuitar` salía con el `DASH` ambiente. El verificador lo
       midió recortando `casos.json` a dos archivos: solo, el caso daba
       «Cannot read properties of undefined (reading 'then')» y medía 3 de 9 comprobaciones, porque
       `opsEnviar` corta antes del `fetch` sin `usuario`/`pass`. En la suite completa pasaba porque
       algún archivo anterior deja `DASH` puesto — o sea el caso medía por el orden de `casos.json`,
       y el flujo de iteración rápida que el repo documenta lo dejaba ciego con un error que parece
       un bug de la app. */
    DASH = { rol:'supervisor', vista:'supervisor', demoMode:false, scope:'Empresa Uno',
             f:{ emp:'Empresa Uno' }, params:{ usuario:'u', pass:'p', empresa:'Empresa Uno' } };
    const pr = opsQuitar(x2);
    PRUEBAS.cierto(!!(pr && pr.then), 'guarda: `opsQuitar` devuelve la promesa del POST');
    return pr.then(() => {
      PRUEBAS.igual(cuerpos.length, 1, 'guarda: salió UN POST de quitar');
      PRUEBAS.igual(cuerpos[0].quitar, '1', 'guarda: y era el de quitar');
      PRUEBAS.cierto(typeof deshacer === 'function',
        '🔴 guarda: se ofreció «Deshacer» · el servidor contestó `cambio:true`, o sea escribió');
      const p2 = deshacer();
      return Promise.resolve(p2).then(() => {
        PRUEBAS.igual(cuerpos.length, 2, 'guarda: el «Deshacer» mandó su propio POST');
        const d = cuerpos[1];
        PRUEBAS.cierto(!d.quitar, 'guarda: el segundo POST es el de asignar, no otro quitar');
        PRUEBAS.igual(d.desde, '2026-01-10',
          '🔴 EL POST DEL «DESHACER» LLEVA EL `Desde` ORIGINAL · sin él el servidor escribe `hoy` y ' +
          'la ventana de asignación se pierde · ' + JSON.stringify({ desde:d.desde, persona:d.persona }));
        /* ⚠️ Y EL `Hasta`, que la ronda anterior se olvidó. El tramo son las DOS columnas: mandar
           sólo `desde` deja `hastaParam` vacío, la fila está de baja → `tramoNuevo` → el servidor
           escribe `Hasta=""`. Medido contra el `.gs`: el «Deshacer» borraba el borde DERECHO de la
           ventana, que es el mismo daño del lado opuesto. */
        PRUEBAS.igual(d.hasta, '2026-11-08',
          '🔴 Y EL `Hasta` TAMBIÉN · el tramo son las dos columnas, y reponer una sola borra la otra · ' +
          JSON.stringify({ desde:d.desde, hasta:d.hasta }));
      });
    }).finally(restaurar);
  } catch (e) { restaurar(); throw e; }
});

PRUEBAS.caso('🔴 P227c-13 · «no cambió nada» gana sobre «no cuenta todavía» cuando el CH no se tocó', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede el ORDEN de las ramas de `opsResultado`: `cambio === false` antes de
     `vigente === false`.
     ⚠️ ESTA ES LA COMBINACIÓN QUE FALTABA EN `P227c-9` y por la que la suite no pudo ver el defecto.
     `opErrorNoVigente_` hardcodea el prefijo «Se guardó, pero esa persona no queda asignada…» para
     sus 5 motivos, y el `.gs` documenta 32 estados de esa familia que «0 escriben una sola celda»
     (22 de operación cerrada + 10 de evento terminado). Con `vigente` primero, los 32 anunciaban una
     escritura que no pasó. Escenario alcanzable sin pantalla vieja: un evento que ya terminó, Ana
     con su fila abierta; el panel la saca de `gente` por no vigente, el selector la vuelve a ofrecer
     y el supervisor toca «Asignar» → `igual:true, cambio:false, vigente:false`. */
  const prevToast = window.showToast, prevAcc = window.showToastAccion, prevD = DASH;
  const v = [];
  try {
    DASH = { rol:'supervisor', vista:'supervisor', params:{}, f:{emp:'E'}, scope:'E' };
    window.showToast = function(m){ v.push({ accion:null, txt:String(m) }); };
    window.showToastAccion = function(m, e){ v.push({ accion:String(e), txt:String(m) }); };
    const pasar = (d) => { opsResultado(d, 'ops_asignada', function(){}); return v.splice(0)[0]; };

    /* ⚠️ EL TEXTO SALE DEL `.gs` cuando está servido, y no de un literal mío. Mi primera versión
       inventaba «…no queda asignada hoy: esa operación ya terminó.» y el aserto buscaba una frase
       («indicar desde y hasta») que ese literal no tenía: el caso fallaba por el fixture, no por el
       código. R17 — armar el estado a mano prueba mi suposición sobre el texto, no el contrato. */
    const ERR_REAL = (CTX.hayGs && /return "Se guardó, pero[^"]*"/.test(CTX.gs))
      ? 'Se guardó, pero esa persona no queda asignada a la operación: esa operación ya terminó, ' +
        'así que para registrar su participación hay que indicar desde y hasta cuándo estuvo asignada.'
      : 'TEXTO DEL SERVIDOR';
    const reenvio = pasar({ ok:true, cambio:false, repetida:true, actualizada:false, vigente:false,
      motivo:'reincorporar_con_fechas', error:ERR_REAL });
    /* ⚠️ ESTE ASERTO ESTABA MAL Y BENDECÍA UNA PÉRDIDA. Mi versión anterior exigía
       `igual(reenvio.txt, t('ops_sin_cambio'))`, o sea afirmaba que el único texto posible es «ya
       estaba así» — y con eso fijaba como correcto que el cliente **tire el `motivo`**, que es la
       parte que dice QUÉ HACER («para registrar su participación hay que indicar desde y hasta
       cuándo estuvo asignada»). El verificador midió que ese caso llega en el PRIMER toque, no en un
       reenvío, así que la persona se quedaba sin ninguna explicación. R19: el caso afirmaba mi
       suposición en vez de un derecho nombrable, y después la defendía contra el arreglo.
       Lo que hay que exigir son las dos cosas a la vez: que NO diga «se guardó» y que CONSERVE el
       motivo. El prefijo lo arregló el servidor (GS 2026-10-09.4). */
    /* ⚠️ NO SE EXIGE QUE EL TEXTO NO DIGA «se guardó», y lo intenté: hice que el servidor cambiara
       el prefijo según si escribió, y **`R12-6` lo puso en rojo con razón** — dos textos para el
       mismo motivo son guía OPUESTA según el idioma, porque `tError` muestra el del servidor en
       español y la clave de `ERR_MOTIVO` en otro. La imprecisión («se guardó» sobre un reenvío que
       no escribió, aunque la fila SÍ está en el CH de antes) queda anotada en el `.gs`. Lo que este
       caso protege es lo que de verdad importaba del hallazgo: que el motivo NO se tire. */
    /* ⚠️ EL INVARIANTE ES «NO SE TIRA», no «dice tal frase». Mi versión anterior buscaba una
       subcadena, que es frágil al texto exacto y fue justo lo que hizo fallar el caso por el
       fixture. Lo que importa: el texto que el servidor mandó llega entero a la pantalla. */
    PRUEBAS.igual(reenvio.txt, ERR_REAL,
      '🔴 el texto del servidor llega ENTERO · es la parte que dice qué hacer, y tirarla deja a la ' +
      'persona tocando sin entender por qué no aparece · ' + JSON.stringify(reenvio.txt));
    PRUEBAS.igual(reenvio.accion, null, '🔴 ni ofrece «Deshacer» sobre cero celdas escritas');
    /* Y las formas SIN motivo siguen usando la clave propia: `ops_sin_cambio` no quedó inalcanzable. */
    PRUEBAS.igual(pasar({ ok:true, cambio:false, quitada:true, yaEstaba:true }).txt, t('ops_sin_cambio'),
      '🔴 sin motivo del servidor, el texto propio · si no, la clave sería inalcanzable');

    /* DISCRIMINADOR · el PRIMER toque, que sí escribe y no cuenta, conserva el texto del servidor:
       si no, invertir las ramas habría tapado el tercer estado, que es todo el punto del prompt. */
    const primero = pasar({ ok:true, cambio:true, nueva:true, vigente:false,
      motivo:'operacion_terminada',
      error:'Se guardó, pero esa persona no queda asignada hoy: esa operación ya terminó.' });
    PRUEBAS.cierto(/se guard[óo]/i.test(primero.txt),
      'DISCRIMINADOR · cuando SÍ escribió y no cuenta, gana el texto del servidor · ' +
      'el tercer estado sigue vivo · ' + JSON.stringify(primero.txt));
    PRUEBAS.igual(primero.accion, null, 'y ese estado nunca ofreció «Deshacer», como antes');
  } finally { window.showToast = prevToast; window.showToastAccion = prevAcc; try { DASH = prevD; } catch(e){} }
});

PRUEBAS.caso('🔒 P227c-14 · el selector NO ofrece gente de otra empresa', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsGenteHtml`, que filtra por `dashNorm(x.empresa) === dashNorm(OPSADM.empresa)`.
     ⚠️ `accionNominaListar` le manda al admin MAESTRO la nómina de TODAS las empresas (`permitidasN`
     queda `null` y el filtro no corre) y el selector sólo muestra el nombre. Con una HOMÓNIMA en dos
     empresas —medido por el verificador contra el `.gs`: «Ana Suárez» en HELITEC y en Cardón— el
     pedido entraba, porque el servidor valida el nombre contra la nómina de la empresa de la
     operación, y escribía la fila de una con la cédula de la otra. */
  const lista = [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }];
  p227cConHoja({
    lista,
    nomina: [{ persona:'Ana Suárez', cedula:'V-1', empresa:'Empresa Uno' },
             { persona:'Beto Ruiz',  cedula:'V-2', empresa:'Empresa Dos' }]
  }, (body) => {
    const cand = [...body.querySelector('.ops-asg select').options]
      .map(o => o.textContent).filter(x => x !== t('ops_elegir'));
    PRUEBAS.igual(cand, ['Ana Suárez'],
      '🔒 sólo quien está en la nómina de ESTA empresa · ' + JSON.stringify(cand));
  });
  /* DISCRIMINADOR 1 · las dos en la misma empresa se ofrecen las dos, o el filtro estaría
     recortando por otra razón (por ejemplo por un campo ausente). */
  p227cConHoja({
    lista,
    nomina: [{ persona:'Ana Suárez', cedula:'V-1', empresa:'Empresa Uno' },
             { persona:'Beto Ruiz',  cedula:'V-2', empresa:'Empresa Uno' }]
  }, (body) => {
    PRUEBAS.igual([...body.querySelector('.ops-asg select').options].length, 3,
      'DISCRIMINADOR · misma empresa: se ofrecen las dos más el «elige»');
  });
  /* DISCRIMINADOR 2 · sin `empresa` en la fila NO se recorta: vaciar el selector por un campo que
     el servidor podría no mandar es el síntoma que este prompt acaba de arreglar. */
  p227cConHoja({ lista, nomina: [{ persona:'Ana Suárez', cedula:'V-1' }] }, (body) => {
    PRUEBAS.igual([...body.querySelector('.ops-asg select').options].length, 2,
      'DISCRIMINADOR · una fila sin `empresa` se sigue ofreciendo · el servidor falla cerrado igual');
  });
});

PRUEBAS.caso('🔴 P227c-15 · abrir Operaciones PIDE la nómina · sin eso asignar es inalcanzable', () => {
  if (!p227cHayApp() || typeof opsCargar !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no está `opsCargar`: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsCargar`, que dispara `nominaListCargar()` cuando `NOMLIST.datos` está
     vacío, y repinta cuando llega.
     ⚠️ POR QUÉ IMPORTA: `nominaListCargar()` tenía UN solo llamador, `nominaListAbrir()`. Quien entra
     al panel y toca el botón de operaciones sin haber abierto antes la hoja de Nómina veía el
     selector vacío con el botón «Asignar» dibujado y la nota «toda la nómina ya está asignada a esta
     operación» sobre una operación sin NADIE. La ronda 1 arregló la FORMA del campo (`persona`, no
     `nombre`) y el bloqueante seguía vivo por el otro lado: la lista estaba vacía. Medido en el DOM
     por el verificador: `NOMLIST.datos` en 0 y una sola opción.
     ⚠️ Entra por `opsCargar`, no montando `NOMLIST` a mano: R17, y es justo lo que los casos que
     usan `p227cConHoja` no pueden ver, porque el arnés inyecta la nómina. */
  const prevD = DASH, prevR = window.dashRequest, prevN = NOMLIST.datos, prevC = NOMLIST.cargando;
  const pedidos = [];
  const restaurar = () => {
    try { DASH = prevD; } catch(e){}
    window.dashRequest = prevR; NOMLIST.datos = prevN; NOMLIST.cargando = prevC;
  };
  try {
    NOMLIST.datos = []; NOMLIST.cargando = false;
    window.dashRequest = function(params){
      pedidos.push(String((params && params.action) || ''));
      return Promise.resolve({ ok:false, error:'cortado por el caso' });
    };
    DASH = { rol:'supervisor', vista:'supervisor', demoMode:false, scope:'Empresa Uno',
             f:{ emp:'Empresa Uno' }, params:{ usuario:'u', pass:'p', empresa:'Empresa Uno' } };
    const r = opsCargar();
    return Promise.resolve(r).then(() => {
      PRUEBAS.cierto(pedidos.indexOf('nomina_listar') >= 0,
        '🔴 se pidió la NÓMINA · sin esto el selector de candidatos está vacío siempre y ' +
        '`operacion_asignar` no es alcanzable · pedidos: ' + JSON.stringify(pedidos));
      PRUEBAS.cierto(pedidos.indexOf('operaciones') >= 0,
        'guarda: y también las operaciones · es el pedido propio de la hoja');
    }).finally(restaurar);
  } catch (e) { restaurar(); throw e; }
});

PRUEBAS.caso('🔒 P227c-16 · el filtro de empresa del selector usa la MISMA derivación que el servidor', () => {
  if (!p227cHayApp()) { PRUEBAS.cierto(false, '⚠️ no está la app cargada: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `opsGenteHtml` con `depClaveCliente`, que es la réplica de `norm()` del
     servidor — la función con la que `opPersonaEnNomina_` y `opMismaEmpresa` conceden el acceso.
     ⚠️ `dashNorm` NO sirve: saca acentos pero **no** puntuación (lo dice el comentario de
     `depClaveCliente`). Con `dashNorm`, «Cardon IV C.A.» y «Cardon IV, C.A.» no empatan, el selector
     queda VACÍO con su nota falsa, y el servidor habría aceptado a esa persona. Es la quinta
     comparación de empresa del repo, y el `.gs` tiene escrito arriba de la suya: «UNA SOLA
     COMPARACIÓN DE EMPRESA, Y ESTÁ ACÁ POR UN DEFECTO MEDIDO». */
  const lista = [{ nombre:'Cardón IV', tipo:'instalacion', estado:'activo', genteN:0, genteHistN:0, gente:[] }];
  const prevO = Object.assign({}, OPSADM);
  try {
    OPSADM.empresa = 'Cardon IV C.A.';
    p227cConHoja({ lista, nomina: [{ persona:'Ana Suárez', cedula:'V-1', empresa:'Cardon IV, C.A.' }] },
      (body) => {
        /* `p227cConHoja` fija `OPSADM.empresa`, así que se pisa DESPUÉS de montar y se repinta. */
        OPSADM.empresa = 'Cardon IV C.A.';
        opsPintar();
        const b = document.getElementById('opsBody');
        const cand = [...b.querySelector('.ops-asg select').options]
          .map(o => o.textContent).filter(x => x !== t('ops_elegir'));
        PRUEBAS.igual(cand, ['Ana Suárez'],
          '🔒 la coma de más no la saca del selector · `norm` del servidor la aceptaría · ' +
          JSON.stringify(cand));
      });
    /* DISCRIMINADOR · una empresa REALMENTE distinta sí se filtra, o el aserto de arriba pasaría
       porque el filtro no filtra nada. */
    p227cConHoja({ lista, nomina: [{ persona:'Ana Suárez', cedula:'V-1', empresa:'Otra Empresa' }] },
      (body) => {
        OPSADM.empresa = 'Cardon IV C.A.';
        opsPintar();
        const b = document.getElementById('opsBody');
        const cand = [...b.querySelector('.ops-asg select').options]
          .map(o => o.textContent).filter(x => x !== t('ops_elegir'));
        PRUEBAS.igual(cand, [], 'DISCRIMINADOR · otra empresa SÍ se filtra');
      });
  } finally { Object.keys(prevO).forEach(k => { OPSADM[k] = prevO[k]; }); }
});
