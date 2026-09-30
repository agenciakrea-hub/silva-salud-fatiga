/* ── DISCRIMINADOR de P211 · «un verde no vale sin haber visto el rojo» ────────────────────────
   (2026-09-30)

   Los 19 casos de `casos/p211-restringir-es-del-supervisor.js` están en verde. Esto prueba que ese
   verde SIGNIFICA algo: carga el `.gs` REAL dos veces —tal cual, y con `gestTiposDeVista_` revertida
   a la regla vieja (`[]` para supervisor)— y corre las mismas afirmaciones contra las dos. Si la
   versión revertida también pasa, los casos no miden el arreglo.

   ⚠️ ALCANCE: mide el `.gs`, no `index.html`. El arreglo del contador del cliente
   (`gestTiposMandables`) NO tiene discriminador acá — lo cubre la suite, en el caso «la cuenta
   COMBINADA manda todo aunque esté en la pestaña de supervisor». Un verde de este archivo no
   significa «P211 está bien», significa «lo que depende del `.gs` está medido».

   ⚠️ VIVE ACÁ Y NO EN `/tmp` A PROPÓSITO. Se escribió tres veces en el mismo prompt porque el
   directorio temporal se limpia entre tandas, y reescribirlo cuesta más que las dos veces que cazó
   un error: la primera versión no revertía la guarda de `accionGestionBorrar` —que era un bloque
   aparte— y medía el borrado sin querer; la segunda medía el borrado sobre un id que el supervisor
   no había podido crear, y borrar un id inexistente responde `ok` por idempotencia.

   Cómo se corre, desde `silva-salud-fatiga/`:
       node pruebas/discriminador-p211.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir (no encontró el `.gs` o su punto de reversión). */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;

const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

/* el `.gs` vive FUERA del repo público (trae la API key de Gemini) */
const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) {
  console.log('🔴 no encuentro el `.gs` en ' + GS_PATH + ' — sin él esto no puede medir nada');
  process.exit(3);
}
const real = fs.readFileSync(GS_PATH, 'utf8');

/* DOS reversiones INDEPENDIENTES, porque son dos defensas distintas y una sola no mide a la otra.
   ⚠️ La primera versión sólo revertía `gestTiposDeVista_`, y quedaba VERDE con la nota clínica
   filtrada al supervisor: agregar `"nota"` a la lista blanca no la ponía en rojo. Lo cazó el
   verificador. */
const REV = [
  { nombre: 'A · gestTiposDeVista_ (quién escribe qué tipo)',
    busca: '  if (vista === "supervisor") return [GEST_TIPO_RESTRICCION, GEST_TIPO_TELEMEDICINA];',
    pone:  '  if (vista === "supervisor") return [];' },
  { nombre: 'B · la lista blanca de la anotación (el recorte de E2a)',
    busca: '"anotacion_aptitud": ["id","tipo","persona","departamento","nivel","medico","creada","vigenciaHasta"]',
    pone:  '"anotacion_aptitud": ["id","tipo","persona","departamento","nivel","medico","creada","vigenciaHasta","nota"]' }
];
const falta = REV.filter(r => real.split(r.busca).length - 1 !== 1);
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: el discriminador no puede medir.');
  falta.forEach(r => console.log('   · ' + r.nombre));
  console.log('   (si el código cambió de forma, actualizá el arreglo REV de este archivo)');
  process.exit(3);
}
const viejo   = real.split(REV[0].busca).join(REV[0].pone);
const conNota = real.split(REV[1].busca).join(REV[1].pone);

const HOJAS = () => ({
  'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
    'Rol (supervisor ve solo su empresa, admin ve todas)',
    'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
    'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'],
    ['silva', 'sup-sil', 'supervisor', 'Aeroambulancias Silva', 'med-sil', 'hseq-sil']],
  'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
  'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
  'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
});
const sup = { usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'sup-sil' };
const med = { usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'med-sil' };
const J = r => JSON.parse(r.getContent());
const mk = (id, tipo, extra) => JSON.stringify(Object.assign({ id: id, tipo: tipo, persona: 'PEDRO GOMEZ', creada: 1 }, extra || {}));
/* la forma EXACTA de `gestNueva()` en index.html: un caso del cuaderno NO tiene `tipo` */
const CASO = { id: 'g_caso', titulo: '', personas: [], departamento: '', prioridad: 'media', estado: 'abierta',
  pin: false, creada: 1, actualizada: 1, detalle: '', seguimientos: [], tareas: [] };

function correr(fuente) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(fuente, env, ['accionGestionGuardar', 'accionGestionBorrar', 'accionGestiones']);
  const filas = () => env.__libro.getSheetByName('Gestiones').getDataRange().getValues();
  const o = {};
  o.restr = J(api.accionGestionGuardar(Object.assign({ gestion: mk('g_r', 'restriccion_tarea') }, sup))).ok === true;
  o.telem = J(api.accionGestionGuardar(Object.assign({ gestion: mk('g_t', 'telemedicina') }, sup))).ok === true;
  o.anot  = J(api.accionGestionGuardar(Object.assign({ gestion: mk('g_a', 'anotacion_aptitud') }, sup))).ok === true;   // NO debe
  /* ⚠️ la fila que se lee la planta el MÉDICO. Con la reversión A el supervisor no logra crear
     `g_r`, así que medir la lectura sobre ella cambiaba por DOS causas a la vez — la misma trampa
     que el encabezado documenta para el borrado. */
  api.accionGestionGuardar(Object.assign({ gestion: mk('g_leer', 'restriccion_tarea') }, med));
  o.lee   = (J(api.accionGestiones(Object.assign({}, sup))).gestiones || []).map(x => x.id).indexOf('g_leer') >= 0;

  /* ⚠️ LEVANTAR es un GUARDADO, no un borrado: `restLevantar` del cliente marca `levantada:true`.
     El supervisor NO tiene `gestion_borrar`, y eso también se mide. */
  api.accionGestionGuardar(Object.assign({ gestion: mk('g_pl', 'restriccion_tarea') }, med));
  o.levanta = J(api.accionGestionGuardar(Object.assign({ gestion: mk('g_pl', 'restriccion_tarea', { levantada: true }) }, sup))).ok === true;
  o.noBorra = J(api.accionGestionBorrar(Object.assign({ id: 'g_pl' }, sup))).ok === false
              && filas().some(f => String(f[1]) === 'g_pl');

  /* el agujero de la ronda 1: pisar una determinación médica mandando su id con tipo de restricción */
  api.accionGestionGuardar(Object.assign({ gestion: mk('a_1', 'anotacion_aptitud', { nivel: 'alto', nota: 'clínica', medico: 'Dra. X' }) }, med));
  o.pisa = J(api.accionGestionGuardar(Object.assign({ gestion: mk('a_1', 'restriccion_tarea') }, sup))).ok === true;
  o.determinacionSigue = filas().some(f => String(f[1]) === 'a_1' && String(f[2]).indexOf('anotacion_aptitud') >= 0);

  /* el 🔴 de la ronda 3: el caso del cuaderno no tiene `tipo`, y el médico tiene que poder guardarlo */
  o.caso = J(api.accionGestionGuardar(Object.assign({ gestion: JSON.stringify(CASO) }, med))).ok === true;
  o.casoEdita = J(api.accionGestionGuardar(Object.assign({ gestion: JSON.stringify(Object.assign({}, CASO, { estado: 'cerrada' })) }, med))).ok === true;
  o.casoNoSup = J(api.accionGestionGuardar(Object.assign({ gestion: JSON.stringify(CASO) }, sup))).ok === false;
  o.tipoRaro = J(api.accionGestionGuardar(Object.assign({ gestion: JSON.stringify({ id: 'g_raro', tipo: ['restriccion_tarea'], persona: 'P' }) }, med))).ok === false;

  /* el ⚠️ de la ronda 3: lista blanca, y lo anidado también se recorta */
  api.accionGestionGuardar(Object.assign({ gestion: mk('g_suc', 'restriccion_tarea', {
    tarea: 'vuelo nocturno', nota: 'HIPERTENSO', detalle: 'clínico', titulo: 'NO APTO',
    detalleClinico: { nota: 'anidada' }, seguimientos: [{ texto: 'x' }] }) }, med));
  const gs = (J(api.accionGestiones(Object.assign({}, sup))).gestiones || []).find(x => x.id === 'g_suc');
  o.recorta = !!gs && ['nota', 'detalle', 'titulo', 'detalleClinico', 'seguimientos'].every(c => gs[c] === undefined);
  o.conservaLoUtil = !!gs && gs.tarea === 'vuelo nocturno';
  /* el recorte de E2a sobre la ANOTACIÓN, que es lo que mide la reversión B */
  api.accionGestionGuardar(Object.assign({ gestion: mk('a_n', 'anotacion_aptitud', { nivel: 'alto', nota: 'HIPERTENSO', medico: 'Dra. X' }) }, med));
  const ga = (J(api.accionGestiones(Object.assign({}, sup))).gestiones || []).find(x => x.id === 'a_n');
  o.anotSinNota = !!ga && ga.nota === undefined;
  o.anotConNivel = !!ga && ga.nivel === 'alto';   // lo que el supervisor SÍ necesita

  /* P164 · la fila nueva no puede entrar por `appendRow` */
  o.sinAppendRow = real.indexOf('sh.appendRow([scope, String(g.id), datos, ahora]);') < 0;
  return o;
}

const con = correr(real), sin = correr(viejo), notaSuelta = correr(conNota);
console.log('CON el arreglo         ·', JSON.stringify(con));
console.log('SIN A (quién escribe)  ·', JSON.stringify(sin));
console.log('SIN B (recorte de nota)·', JSON.stringify(notaSuelta));

/* Qué tiene que cambiar al revertir (es lo que los casos miden) y qué NO (lo que no depende de
   `gestTiposDeVista_`, y por eso vale igual en las dos: si cambiara, el discriminador estaría
   midiendo otra cosa). */
const cambian = ['restr', 'telem', 'lee', 'levanta'];
const noCambian = ['anot', 'noBorra', 'pisa', 'determinacionSigue', 'caso', 'casoEdita', 'casoNoSup', 'tipoRaro', 'sinAppendRow'];
const fallos = [];
cambian.forEach(k => { if (!(con[k] === true && sin[k] === false)) fallos.push('debía cambiar y no cambió: ' + k); });
noCambian.forEach(k => { if (con[k] !== sin[k]) fallos.push('no debía cambiar y cambió: ' + k); });
['anot', 'pisa'].forEach(k => { if (con[k] !== false) fallos.push('tiene que ser false con el arreglo: ' + k); });
['caso', 'casoEdita', 'casoNoSup', 'tipoRaro', 'noBorra', 'determinacionSigue', 'recorta', 'conservaLoUtil', 'sinAppendRow']
  .forEach(k => { if (con[k] !== true) fallos.push('tiene que ser true con el arreglo: ' + k); });
if (con.recorta !== true || sin.recorta !== false) {
  /* el recorte SÍ cambia al revertir, porque sin el arreglo el supervisor no recibe la fila */
  if (!(con.recorta === true && sin.recorta === false)) fallos.push('el recorte no discrimina');
}

/* B · revertir la lista blanca tiene que poner en rojo el recorte de la anotación, y NADA MÁS */
if (notaSuelta.anotSinNota !== false) fallos.push('reversión B · la nota clínica sigue recortada: el discriminador no mide el recorte');
if (notaSuelta.anotConNivel !== true) fallos.push('reversión B · rompió algo más que el recorte');
if (con.anotSinNota !== true) fallos.push('tiene que ser true con el arreglo: anotSinNota');
if (con.anotConNivel !== true) fallos.push('tiene que ser true con el arreglo: anotConNivel');

if (fallos.length) {
  console.log('🔴 NO DISCRIMINA:');
  fallos.forEach(f => console.log('   · ' + f));
  process.exit(1);
}
console.log('✅ DISCRIMINA · lo que depende de `gestTiposDeVista_` cambia al revertir, y lo que no,');
console.log('   se mantiene igual en las dos versiones (si cambiara, estaría midiendo otra cosa).');
process.exit(0);
