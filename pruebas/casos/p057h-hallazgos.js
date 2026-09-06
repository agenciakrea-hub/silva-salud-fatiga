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
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const fn = (f.match(/function cicloUbicarAguja\(barra\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda de medibilidad: se encontró la función');
  PRUEBAS.falso(/\|\|\s*document;/.test(fn),
    '⚠️ ya no cae a `document` · ahí agarraba el nombre de OTRA persona');
  PRUEBAS.cierto(/cicloYo\(\)/.test(fn),
    '⚠️ sin tarjeta contenedora, la barra es la PROPIA · se usa `cicloYo()`');
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
  PRUEBAS.cierto(/cicloPlanPersonaError/.test(CTX.gs),
    '⚠️ el payload trae un canal de error · como `nominaError`, que este archivo ya tenía');
});

PRUEBAS.caso('🔴 H-bajo · la demostración valida IGUAL que producción', () => {
  /* La demo guardaba el plan crudo mientras el servidor descartaba tres tramos. Yo verifiqué este
     prompt MIRANDO la demostración y los cuatro números aparecían: hice la verificación visual en
     el único camino donde el defecto no existía. Una demo que valida distinto no es una demo. */
  const f = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const fn = (f.match(/function cicloPerEnviar\([\s\S]*?demoMode[\s\S]{0,900}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda de medibilidad: se encontró la rama de demostración');
  PRUEBAS.falso(/mapa\[k\] = JSON\.parse\(cuerpo\.plan\)/.test(fn),
    '⚠️ la demo ya no guarda el plan crudo sin validar');
  PRUEBAS.cierto(/cicloTramos\(\)\.forEach/.test(fn),
    '⚠️ valida tramo por tramo, como el servidor');
});
