/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P057 · LOS OCHO HALLAZGOS DE LA REVISIÓN ADVERSARIAL                            (2026-09-06)

   ⚠️ POR QUÉ ESTE ARCHIVO EXISTE, Y ES LO MÁS IMPORTANTE QUE TIENE.
   Las tres suites que escribí para P057a/b/c estaban en VERDE mientras cuatro defectos ALTOS
   estaban vivos en producción. De sus doce casos, once armaban el estado a mano
   (`DASH = Object.assign(...)`) o afirmaban sobre el TEXTO FUENTE con una regex. El único que
   entraba por el camino real —el contrato `cipClave` contra `dashNorm`— fue el único que encontró
   algo. Es literalmente `MEMORY.md → silva-probar-el-uso-no-la-pieza`, cometido por mí, en el
   prompt cuyo riesgo declarado era un dato irreversible.

   El caso más caro fue éste, en `p057c`:
       PRUEBAS.cierto(/plan:\s*JSON\.stringify\(cicloPlan\(cicloYo\(\)\)/.test(env), ...)
   Comprueba que la línea ESTÁ ESCRITA. No que el valor resuelva. Y no resolvía: en el teléfono del
   empleado `DASH` es `null`, así que `cicloPlanPersona` devolvía `null` y se congelaba la jornada
   de la empresa igual que antes. La prueba pasaba porque el texto coincidía.

   Todo lo de acá abajo entra por el comportamiento.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P057 · los hallazgos de la revisión');

PRUEBAS.caso('🔴 H4 · un nombre con `&quot;` NO puede ejecutar código (seguridad)', () => {
  /* `pe.persona` sale de la columna `Persona` de `Operacional`, que la escribe el propio empleado
     con el nombre de su perfil. O sea que cualquier empleado podía ejecutar código en la sesión
     del supervisor, que tiene sus credenciales en memoria y los datos clínicos de toda la empresa.
     El escape viejo cubría `"` pero no `&`: al parsear el HTML, un `&quot;` del propio nombre se
     decodificaba a comilla y cerraba el literal. */
  PRUEBAS.igual(typeof argAttr, 'function', 'guarda de medibilidad: existe el escape');
  const malo = 'Ana&quot;);window.__XSS_P057__=1;//';
  delete window.__XSS_P057__;
  const host = document.createElement('div');
  host.innerHTML = '<button onclick="void(' + argAttr(malo) + ')">x</button>';
  document.body.appendChild(host);
  try {
    host.querySelector('button').click();
    PRUEBAS.falso(!!window.__XSS_P057__,
      '⚠️ el nombre NO se ejecuta como código · el atributo quedó: ' +
      (host.querySelector('button').getAttribute('onclick') || '').slice(0, 90));
    /* DISCRIMINADOR: el escape VIEJO sí lo deja pasar. Sin esto, el caso podría estar pasando
       porque el navegador no ejecuta `onclick` en este contexto. */
    const viejo = JSON.stringify(malo).replace(/"/g, '&quot;');
    const host2 = document.createElement('div');
    host2.innerHTML = '<button onclick="void(' + viejo + ')">x</button>';
    document.body.appendChild(host2);
    try {
      host2.querySelector('button').click();
      PRUEBAS.cierto(!!window.__XSS_P057__,
        '⚠️ y el escape VIEJO sí ejecuta · si esto falla, el caso de arriba no prueba nada');
    } finally { host2.remove(); delete window.__XSS_P057__; }
  } finally { host.remove(); delete window.__XSS_P057__; }
});

PRUEBAS.caso('🔴 H4b · un nombre normal sigue funcionando después del escape', () => {
  /* Un escape que rompe los nombres con apóstrofo sería peor que el defecto: O'Brien existe. */
  const host = document.createElement('div');
  window.__P057_OK__ = null;
  host.innerHTML = '<button onclick="window.__P057_OK__=' + argAttr("Luis O'Brien") + '">x</button>';
  document.body.appendChild(host);
  try {
    host.querySelector('button').click();
    PRUEBAS.igual(window.__P057_OK__, "Luis O'Brien",
      '⚠️ el nombre llega ENTERO al manejador · ' + JSON.stringify(window.__P057_OK__));
  } finally { host.remove(); delete window.__P057_OK__; }
});

PRUEBAS.caso('🔴 H2 · los CUATRO tramos sobreviven al servidor, o no se guarda ninguno', () => {
  /* `cipPlanValido` validaba contra `DUTY_TRAMOS` (`traslado_ida/jornada/traslado_vta`), y el
     cliente manda `traslado/jornada/regreso/descanso`. Sólo sobrevivía `jornada` — la única clave
     común — y el servidor respondía `ok:true`. El supervisor tecleaba cuatro números, veía
     «Guardado», y tres desaparecían.
     Mi prueba anterior usaba `{jornada: 480}`: la ÚNICA clave con la que el defecto no se nota. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const env = GS.crearEntorno({ 'Accesos': [['Usuario','Clave','Rol','Empresas']] });
  const api = GS.cargarGs(CTX.gs, env, ['cipPlanValido']);
  /* Las claves REALES del cliente, sacadas de la forma vigente y no escritas a mano: si mañana un
     sector agrega un tramo, este caso lo ejercita solo. */
  const plan = {};
  cicloTramos().forEach((tr, i) => { plan[tr.k] = 60 + i * 30; });
  PRUEBAS.alMenos(Object.keys(plan).length, 2,
    'guarda de medibilidad: la forma trae varios tramos · ' + JSON.stringify(plan));
  const out = api.cipPlanValido(plan);
  PRUEBAS.cierto(!!out, '⚠️ un plan completo se acepta · llegó ' + JSON.stringify(out));
  PRUEBAS.igual(Object.keys(out || {}).sort(), Object.keys(plan).sort(),
    '⚠️ y sobreviven TODOS los tramos, no sólo `jornada` · ' + JSON.stringify(out));
  Object.keys(plan).forEach(k => {
    PRUEBAS.igual(out[k], plan[k], '⚠️ con su valor · ' + k);
  });
  /* Y un plan PARCIAL se rechaza entero (H6): si faltara un tramo, `cicloPlan` lo completaría con
     el default del SECTOR en vez del de la empresa — ni el de la persona ni el de su empresa. */
  const parcial = { jornada: 480 };
  PRUEBAS.igual(api.cipPlanValido(parcial), null,
    '⚠️ un plan PARCIAL se rechaza · completarlo con el default del sector saltearía al de la empresa');
});

PRUEBAS.caso('🔴 H3 · bajarle la jornada a alguien NO lo marca excedido hacia atrás', () => {
  /* El cliente juzgaba con el plan VIGENTE y el servidor con el CONGELADO del evento: con eventos
     escritos contra 720, ponerle 300 hacía que la pestaña Ciclo dijera «7 h de más» en rojo
     mientras la pestaña Jornada decía `excesoMin: 0`. Dos pantallas de la misma app con veredictos
     opuestos sobre un hecho con consecuencia laboral. */
  PRUEBAS.igual(typeof cicloEstado, 'function', 'guarda de medibilidad: existe `cicloEstado`');
  const TR = cicloTramos();
  const trJ = TR.find(x => x.k === 'jornada') || TR[1] || TR[0];
  const base = cicloPlan();
  /* Un ciclo con su plan CONGELADO en el evento de apertura, como lo escribe `enviarOperacional`. */
  const congelado = {}; TR.forEach(tr => { congelado[tr.k] = base[tr.k]; });
  const t0 = Date.now() - (base[trJ.k] + 30) * 60000;
  const ev = {};
  ev[cicloEventoInicial()] = { iso: new Date(t0).toISOString(), plan: JSON.stringify(congelado) };
  const ciclo = { ev: ev, t0: t0 };
  /* Ahora se le baja la jornada a la mitad, como haría un supervisor hoy. */
  const bajado = Object.assign({}, base); bajado[trJ.k] = Math.max(5, Math.round(base[trJ.k] / 2));
  const st = cicloEstado(ciclo, Date.now(), bajado);
  const tramo = (st.tramos || []).find(x => x.k === trJ.k);
  PRUEBAS.cierto(!!tramo, 'guarda de medibilidad: se armó el tramo de jornada');
  PRUEBAS.igual(tramo && tramo.previsto, congelado[trJ.k],
    '⚠️ el previsto es el CONGELADO (' + congelado[trJ.k] + '), no el nuevo (' + bajado[trJ.k] + ') · ' +
    'si no, bajarle la jornada a alguien lo marca excedido retroactivamente');
});

PRUEBAS.caso('🔴 H5 · la aguja del bloque PROPIO usa la jornada propia, no la del primero de la lista', () => {
  /* Regresión que introduje en P057a: `cont = document` agarraba el primer `.cic-nom` del
     documento. El bloque del piloto no tiene `.cic-card` ni `#cicFullCuerpo` como ancestro. */
  /* P183 · antes leía el cuerpo de `cicloUbicarAguja`. Ahora se arma el escenario: una tarjeta
     del panel de OTRA persona (con jornada corta) antes en el documento, y la barra PROPIA suelta
     (sin `.cic-card`), con la jornada propia larga. La aguja tiene que ubicarse con la propia. */
  const prevLS = Object.assign({}, localStorage), prevDash = DASH;
  const raiz = document.createElement('div'); raiz.style.cssText = 'position:absolute;left:0;top:0;width:400px;';
  try {
    CTX.resetear({ nombre: 'Zoe Propia', esPiloto: true });
    cicloPlanPropioGuardar({ traslado: 60, jornada: 600, regreso: 60, descanso: 600 });
    DASH = { vista: 'supervisor', cicloPlanPersona: { [dashNorm('Ana Otra')]: { traslado: 60, jornada: 300, regreso: 60, descanso: 600 } } };
    const seg = k => '<span data-seg="' + k + '" style="display:inline-block;width:100px;height:4px"></span>';
    raiz.innerHTML = '<div class="cic-card"><div class="cic-nom">Ana Otra</div></div>' +
      '<div id="p057hBarra" style="position:relative;width:400px;white-space:nowrap">' + cicloTramos().map(tr => seg(tr.k)).join('') + '<i class="cic-now" data-cic-needle="' + (Date.now() - 90 * 60000) + '" style="position:absolute;left:0"></i></div>';
    document.body.appendChild(raiz);
    const barra = document.getElementById('p057hBarra');
    cicloUbicarAguja(barra);
    const x = parseFloat(barra.querySelector('.cic-now').style.left);
    /* 90 min desde el inicio: 60 de traslado y 30 adentro de la jornada · propia (600) → 100 + 100·30/600 = 105 · la de Ana (300) → 110 */
    PRUEBAS.cierto(Math.abs(x - 105) < 1, '🔴 la aguja del bloque PROPIO usa la jornada propia (quedó en ' + x + ' px; con la de la primera tarjeta del panel daría 110)');
    /* discriminador: la misma barra ADENTRO de la tarjeta de Ana se ubica con la de Ana */
    raiz.querySelector('.cic-card').appendChild(barra);
    cicloUbicarAguja(barra);
    PRUEBAS.cierto(Math.abs(parseFloat(barra.querySelector('.cic-now').style.left) - 110) < 1, 'DISCRIMINADOR · dentro de la tarjeta de Ana, la aguja va con la jornada de Ana (110 px)');
  } finally {
    raiz.remove(); DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔴 H7 · Dirección/HSEQ no puede ESCRIBIR la jornada de una persona', () => {
  /* El cortafuegos K1b funcionaba en lectura pero no en escritura: una credencial de Dirección
     entraba y dejaba una fila con el ALIAS anonimizado como clave, que ningún lector matchea.
     `depPuedeEscribir` deja pasar `hseq` porque para los DEPARTAMENTOS es correcto; para una
     decisión sobre un individuo, no. */
  /* ⚠️ ESTE CASO EMPEZÓ MIDIENDO EL TEXTO FUENTE y se rompió solo: el regex cortaba en la primera
     aparición de `depPuedeEscribir`, que pasó a estar dentro del comentario que escribí ARRIBA de
     la guarda para explicarla. O sea que documentar el arreglo apagó la prueba del arreglo. Ahora
     entra por el camino real (R17): se llama a la acción con una credencial de Dirección y se mira
     si escribió. Eso no lo puede romper un comentario. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  /* Col B = supervisor, col E = médica, col F = HSEQ (P102/P103). */
  const env = GS.crearEntorno({
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Helitec', 'sup001', 'supervisor', 'Helitec', 'med002', 'dir003']],
    'Sesiones': [["Id","HashToken","Usuario","Dispositivo","Rol","Vista","Empresas","Canonical",
                  "Combinada","Creada","UltimoUso","Estado","Cerrada"]],
    'Ciclo Persona': [["Empresa","Persona","Plan","Actualizado","ActualizadoPor"]],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloPersonaGuardar', 'cicloPlanPersonaDe']);
  const plan = JSON.stringify({ traslado: 60, jornada: 480, regreso: 60, descanso: 600 });
  const pedir = (pass) => JSON.parse(api.accionCicloPersonaGuardar({
    usuario: 'Helitec', pass, dispositivoId: 'd', empresa: 'Helitec',
    persona: 'Ana Suárez', plan
  }).getContent());

  const dir = pedir('dir003');
  PRUEBAS.falso(!!dir.ok, '⚠️ Dirección/HSEQ NO puede escribir la jornada de una persona');
  PRUEBAS.igual(dir.motivo, 'solo_lectura', 'y se le dice por qué, no un error genérico');
  PRUEBAS.igual(Object.keys(api.cicloPlanPersonaDe('Helitec') || {}).length, 0,
    '⚠️ y NO quedó una fila escrita · el defecto dejaba basura con el alias anonimizado de clave');

  /* El DISCRIMINADOR. Sin esto el caso daría verde si la acción rechazara a TODO el mundo —
     por una hoja que falta, una empresa inválida o un plan mal armado. */
  const sup = pedir('sup001');
  PRUEBAS.cierto(!!sup.ok, 'el DISCRIMINADOR: el supervisor SÍ escribe · ' + JSON.stringify(sup));
  PRUEBAS.igual(Object.keys(api.cicloPlanPersonaDe('Helitec') || {}).length, 1,
    'y su fila sí queda · o sea que el rechazo de arriba es por la vista, no porque nada funcione');
});

PRUEBAS.caso('🔴 H8 · si la hoja no se puede leer, el panel se entera', () => {
  /* El `catch` devolvía `{}` en silencio: renombrar la pestaña hacía desaparecer TODAS las
     jornadas propias sin un error, y todo el mundo volvía a medirse contra la de la empresa. Se ve
     exactamente igual que «nadie tiene jornada propia». */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  /* P183 · antes buscaba `cicloPlanPersonaError` en la fuente. Ahora se rompe la hoja `Ciclo
     Persona` del entorno (su lectura lanza) y se pide el panel: llega igual, con el motivo. */
  const armar = () => GS.crearEntorno({
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'], ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Op','Piloto']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [['A'], ['B']],
    'Operacional': [['Fecha','Hora','ISO','IdEvento','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado','Plan']],
    'Ciclo Persona': [['Empresa','Persona','Plan','Actualizado','ActualizadoPor'], ['Helitec','Ana Suárez','{"traslado":60,"jornada":600,"regreso":60,"descanso":600}','2026-09-01','x']],
  });
  const pedir = (romper) => {
    const env = armar();
    if (romper) env.__libro.getSheetByName('Ciclo Persona').getDataRange = function () { throw new Error('la pestaña no se puede leer'); };
    const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor']);
    return JSON.parse(api.accionSupervisor({ usuario:'Helitec', empresa:'Helitec', pass:'clave-sup', dispositivoId:'d' }).getContent());
  };
  const roto = pedir(true), sano = pedir(false);
  PRUEBAS.cierto(!!roto.ok, 'guarda: con la hoja rota el panel llega igual (' + (roto.error || 'ok') + ')');
  PRUEBAS.cierto(/no se puede leer/.test(String(roto.cicloPlanPersonaError || '')), '🔴 y el payload trae el MOTIVO en `cicloPlanPersonaError` · antes el catch devolvía {} en silencio y «nadie tiene jornada propia» se veía igual que «la pestaña no se pudo leer»');
  PRUEBAS.igual(Object.keys(roto.cicloPlanPersona || {}).length, 0, 'con el mapa vacío');
  PRUEBAS.igual(sano.cicloPlanPersonaError, null, 'DISCRIMINADOR · con la hoja sana, null');
  PRUEBAS.igual(Object.keys(sano.cicloPlanPersona || {}), ['ana suarez'], 'y el mapa con la persona');
});

PRUEBAS.caso('🔴 H-bajo · la demostración valida IGUAL que producción', () => {
  /* La demo guardaba el plan crudo mientras el servidor descartaba tres tramos. Yo verifiqué este
     prompt MIRANDO la demostración y los cuatro números aparecían: hice la verificación visual en
     el único camino donde el defecto no existía. Una demo que valida distinto no es una demo. */
  /* P183 · antes leía la rama de demostración de `cicloPerEnviar`. Ahora se guarda una jornada
     propia EN LA DEMO con un tramo inválido (jornada 0) y otro fuera de rango (2000): tiene que
     rechazarse, igual que en el servidor; con valores válidos, se guarda limpia. */
  const prevDash = DASH, oToast = window.showToast, oRepintar = window.cicloRepintar;
  const err = document.getElementById('cicPerErr');
  try {
    window.showToast = () => {}; window.cicloRepintar = () => {};
    DASH = { demoMode: true, vista: 'supervisor', cicloPlanPersona: {} };
    cicloPerEnviar(null, 'Ana Demo', { plan: JSON.stringify({ traslado: 60, jornada: 0, regreso: 60, descanso: 600 }) }, 'ok');
    PRUEBAS.igual(Object.keys(DASH.cicloPlanPersona).length, 0, '🔴 la demo NO guarda un plan con jornada 0: valida tramo por tramo, como el servidor');
    PRUEBAS.cierto(!err || err.textContent === t('cic_cfg_err'), 'y dice que está mal (si el editor está pintado)');
    cicloPerEnviar(null, 'Ana Demo', { plan: JSON.stringify({ traslado: 60, jornada: 2000, regreso: 60, descanso: 600 }) }, 'ok');
    PRUEBAS.igual(Object.keys(DASH.cicloPlanPersona).length, 0, 'ni uno con 2000 minutos de jornada (tope 1440, el del servidor)');
    if (err) err.textContent = '';
    cicloPerEnviar(null, 'Ana Demo', { plan: JSON.stringify({ traslado: 60, jornada: 600, regreso: 60, descanso: 600, basura: 'x' }) }, 'ok');
    const g = DASH.cicloPlanPersona[dashNorm('Ana Demo')];
    PRUEBAS.cierto(!!g && g.jornada === 600 && !('basura' in g), 'DISCRIMINADOR · uno válido se guarda, limpio (sin claves de más)');
  } finally { DASH = prevDash; window.showToast = oToast; window.cicloRepintar = oRepintar; if (err) err.textContent = ''; try { CICLO_PER_ABIERTO = ''; } catch(e){} }
});
