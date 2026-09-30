/* ── P211 · restringir una tarea es autoridad del SUPERVISOR ─────────────────────────────────────
   (2026-09-29 · apareció verificando P209, y es un defecto PREEXISTENTE)

   `restPuede()` en el cliente exige `DASH.vista === 'supervisor'` y el comentario de `restGuardar`
   dice «restringir una tarea es del supervisor». El servidor exigía `acc.vista === "medico"` para
   `gestion_guardar`. Dos derivaciones del mismo rol que no coincidían.

   Funcionaba **por un efecto colateral**: en las cuentas COMBINADAS (sin contraseña médica en
   `Accesos`), `validarAcceso` devuelve `vista:"medico"` y `accionSupervisor` la pisa con la pestaña
   por la que entró, así que el cliente se cree supervisor y el servidor lo ve médico. En las cuentas
   CON contraseña médica separada no hay tal pisada: la restricción se rechazaba SIEMPRE.

   Medido contra el CH el 2026-09-29 (`tarea=gestiones_del_supervisor`): de 16 cuentas la única
   afectada era **Aeroambulancias Silva** — el cliente que va a usar esto con pilotos reales — y no
   había datos perdidos porque la hoja `Gestiones` estaba vacía. Estaba a punto de dispararse.

   ⚠️ Se prueba el CONTRATO con el `.gs` REAL en el emulador (R17): el defecto vivía exactamente en
   la juntura, y probar cada lado por separado no lo veía.

   ── ⚠️ LA PRIMERA VERSIÓN DEL ARREGLO ABRIÓ UN AGUJERO PEOR QUE EL DEFECTO ─────────────────────
   `accionGestionGuardar` validaba el tipo QUE VENÍA EN EL PEDIDO, y el upsert matchea sólo por id.
   `accionGestiones` le entrega al supervisor los ids de las anotaciones de aptitud. Entonces:
   mandar ese id con `tipo:"restriccion_tarea"` REEMPLAZABA una determinación médica firmada, y
   después la fila ya era «suya» y el candado de `accionGestionBorrar` se la dejaba borrar. El
   cuaderno del médico quedaba vacío y la tarjeta volvía al cálculo automático. Lo cazó el
   verificador. Ahora hay UNA SOLA derivación en el `.gs` (`gestTiposDeVista_` y sus dos
   consultoras) y el tipo se lee DE LA FILA también al pisar, dentro del candado.

   ── DISCRIMINADOR de estos casos, corrido el 2026-09-29 ───────────────────────────────────────
   Un verde no vale sin haber visto el rojo. Se cargó el `.gs` real DOS veces en el emulador: una
   tal cual, y otra con `gestTiposDeVista_` devolviendo `[]` para supervisor. Resultado con la
   cuenta `silva` (contraseña médica separada, o sea `vista:"supervisor"` de verdad):

     con el arreglo → restricción ok, telemedicina ok, anotación NO, la lee, la borra,
                      NO puede pisar la determinación, la determinación sigue entera
     revertido      → nada de eso; ni escribe, ni lee, ni borra

   Dos cosas que el medidor se equivocó primero, y valen para el próximo que lo rehaga:
   · `accionGestionBorrar` tenía su PROPIA guarda —un bloque dentro del candado—, y revertir sólo la
     de guardar dejaba el borrado sin medir. Por eso ahora la regla vive en UNA función.
   · el borrado hay que medirlo sobre una fila que EXISTA, y con un id que no dependa de que el
     supervisor haya podido crearla: con el arreglo revertido no guarda nada, y borrar un id
     inexistente responde `ok` por idempotencia. Caí en esa trampa DOS veces en el mismo prompt.
     La fila se planta con el MÉDICO, que puede en las dos versiones. */

PRUEBAS.grupo('P211 · restringir una tarea es del supervisor');

const P211_CAB_ACCESOS = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];

function p211Hojas() {
  return {
    /* dos cuentas a propósito: `silva` CON contraseña médica separada (la que fallaba) y `combi`
       SIN ella (la que funcionaba por el efecto colateral). */
    'Accesos': [P211_CAB_ACCESOS,
      ['silva', 'sup-sil', 'supervisor', 'Aeroambulancias Silva', 'med-sil', 'hseq-sil'],
      ['combi', 'sup-com', 'supervisor', 'Empresa Combinada',     '',        '']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  };
}
function p211Api() {
  const env = GS.crearEntorno(p211Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionGestionGuardar', 'accionGestionBorrar', 'accionGestiones', 'validarAcceso']);
  api.__env = env;
  return api;
}
const p211J = r => JSON.parse(r.getContent());
/* las filas REALES de la hoja en el emulador, como las lee `p102-p103`: `env.__libro`, no `hojas`. */
const p211Filas = api => api.__env.__libro.getSheetByName('Gestiones').getDataRange().getValues();
const p211TipoDe = (api, id) => {
  const f = p211Filas(api).find(x => String(x[1]) === id);
  if (!f) return null;
  try { return String(JSON.parse(f[2]).tipo || ''); } catch (e) { return '?'; }
};
/* credenciales de la cuenta que TIENE contraseña médica separada: la que fallaba */
const p211Sup = extra => Object.assign({ usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'sup-sil' }, extra || {});
const p211Med = extra => Object.assign({ usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'med-sil' }, extra || {});

/* ⚠️ R17 · LOS MISMOS 13 CAMPOS QUE PRODUCE `restGuardar` (index.html), no los 6 que alcanzaban
   para pasar la guarda. La primera versión armaba un objeto corto: probaba la función, no que el
   llamador de verdad le pueda dar lo que pide. Ídem `p211Telem` contra `telemSugerir`. */
const p211Restr = (id, persona) => JSON.stringify({ id: id, tipo: 'restriccion_tarea',
  persona: persona || 'PEDRO GOMEZ', departamento: 'Operaciones', tarea: 'vuelo nocturno',
  mitigacion: 'descanso_extra', motivo: 'dos noches sin dormir', supervisor: 'Luis Pérez',
  creada: 1759100000000, hasta: 1759359200000, horas: 72, levantada: false, escalada: false });
const p211Telem = (id, persona) => JSON.stringify({ id: id, tipo: 'telemedicina',
  persona: persona || 'PEDRO GOMEZ', departamento: 'Operaciones', estado: 'sugerida', motivo: '',
  sugeridaPor: 'Luis Pérez', rolSugiere: 'supervisor', creada: 1759100000000 });
/* ⚠️ Los dos casos del CONTADOR usan `p209Limpio` de `p209-las-colas-no-pierden.js`, que hace el
   snapshot completo del `localStorage` y difiere la restauración un tick (R18). No se duplica acá
   —tiene siete precauciones y duplicarlas es pedir que se desincronicen—, pero la dependencia es
   real: `casos.json` carga p209 ANTES que p211. Si alguien reordena la lista, esto tiene que ponerse
   en ROJO con la razón, no fallar con «p209Limpio is not defined». */
function p211ConLimpio(fn) {
  if (typeof p209Limpio !== 'function') {
    PRUEBAS.cierto(false, '🔴 falta `p209Limpio`: este caso necesita que `p209-las-colas-no-pierden.js` cargue ANTES en `casos.json`');
    return;
  }
  return p209Limpio(fn);
}
const p211Anot = (id, persona) => JSON.stringify({ id: id, tipo: 'anotacion_aptitud',
  persona: persona || 'PEDRO GOMEZ', nivel: 'alto', nota: 'tres mediciones sostenidas',
  medico: 'Dra. Rivas', creada: 1759100000000, vigenciaHasta: 1761692000000 });

PRUEBAS.caso('⚠️ la cuenta con contraseña médica separada entra como SUPERVISOR (la premisa del defecto)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p211Api();
  /* ⚠️ POSICIONAL: `validarAcceso(key, pass, disp)`. La primera versión de este caso le pasaba un
     objeto y devolvía null — y el caso fallaba por eso, no por el código que quería medir. */
  const acc = api.validarAcceso('silva', 'sup-sil', 'disp-p211');
  PRUEBAS.cierto(!!acc, 'guarda: la contraseña de supervisor entra');
  if (!acc) return;
  PRUEBAS.igual(acc.vista, 'supervisor', '⚠️ y su vista es «supervisor», NO «medico»: acá vivía el rechazo');
  PRUEBAS.falso(!!acc.combinada, 'y no es combinada, porque tiene contraseña médica cargada');
  /* DISCRIMINADOR · la cuenta SIN contraseña médica entra como «medico», que es por lo que a ella
     el servidor sí le aceptaba las restricciones */
  const acc2 = api.validarAcceso('combi', 'sup-com', 'disp-p211');
  PRUEBAS.cierto(!!acc2, 'guarda: la combinada también entra');
  if (!acc2) return;
  PRUEBAS.igual(acc2.vista, 'medico', 'DISCRIMINADOR · la cuenta combinada entra como «medico»…');
  PRUEBAS.cierto(acc2.combinada === true, '…y marcada `combinada`, que es lo que hace que funcione por el costado');
});

PRUEBAS.caso('🔴 el supervisor PUEDE guardar una restricción de tarea', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p211Api();
  const r = p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr('g_p211') })));
  PRUEBAS.cierto(r.ok, '🔴 el servidor la acepta · ' + JSON.stringify(r).slice(0, 90));
  const filas = p211Filas(api).filter(f => String(f[1]) === 'g_p211');
  PRUEBAS.igual(filas.length, 1, '🔴 y queda UNA fila en la hoja `Gestiones`: antes no llegaba ninguna');
  PRUEBAS.cierto(String(filas[0][0]).toLowerCase().indexOf('aeroambulancias') >= 0,
    'bajo la empresa que le corresponde · ' + filas[0][0]);
  /* R15 · upsert, nunca append ciego: reenviarla (cola, doble toque) no puede dejar dos filas */
  const r2 = p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr('g_p211') })));
  PRUEBAS.cierto(r2.ok && r2.actualizado === true, 'R15 · el reenvío ACTUALIZA · ' + JSON.stringify(r2).slice(0, 60));
  PRUEBAS.igual(p211Filas(api).filter(f => String(f[1]) === 'g_p211').length, 1, 'y sigue habiendo UNA sola fila');
});

PRUEBAS.caso('🔴 y sugerir telemedicina también es suyo (D5: no requiere aprobación médica)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* `telemSugerirDesde` (index.html) abre con `if (!DASH || (DASH.vista !== 'supervisor' &&
     DASH.vista !== 'medico')) return;` y su comentario cita D5. El servidor se la rechazaba igual:
     era EL MISMO defecto que las restricciones, en el otro tipo, y se encontró midiendo éste. */
  const api = p211Api();
  const r = p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Telem('t_p211') })));
  PRUEBAS.cierto(r.ok, '🔴 el servidor acepta la sugerencia del supervisor · ' + JSON.stringify(r).slice(0, 70));
  PRUEBAS.igual(p211TipoDe(api, 't_p211'), 'telemedicina', 'y queda en la hoja como telemedicina');
  /* y la ve, que es lo que evita que la duplique: `puedeTelem` en el cliente es `!p.telem` */
  const ids = (p211J(api.accionGestiones(p211Sup())).gestiones || []).map(x => x.id);
  PRUEBAS.cierto(ids.indexOf('t_p211') >= 0, '⚠️ y se la devuelve al leer: sin esto la crea y desaparece al reabrir el panel');
});

PRUEBAS.caso('⚠️ y NADA MÁS que eso: la anotación de aptitud y la nota clínica siguen siendo del médico', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p211Api();
  /* DISCRIMINADOR del arreglo: si el chequeo fuera «el supervisor puede escribir gestiones», esto
     pasaría también — y una anotación de aptitud lleva el estado clínico que firma el médico. */
  const r1 = p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Anot('a_p211') })));
  PRUEBAS.falso(r1.ok, '⚠️ una anotación de aptitud del supervisor se RECHAZA · ' + JSON.stringify(r1).slice(0, 70));
    /* ⚠️ `texto:`, que es el campo que escribe `notaClinicaGuardar` (index.html) — decía `nota:` */
  const nota = JSON.stringify({ id: 'n_p211', tipo: 'nota_clinica', persona: 'PEDRO GOMEZ', texto: 'texto clínico', medico: 'Dra. Rivas', creada: 1 });
  PRUEBAS.falso(p211J(api.accionGestionGuardar(p211Sup({ gestion: nota }))).ok, 'y una nota clínica también');
  PRUEBAS.igual(p211Filas(api).length, 1, 'la hoja sigue con sólo el encabezado: no entró ninguna');
  /* y al médico sí se le aceptan las dos */
  PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Med({ gestion: p211Anot('a_p211') }))).ok, 'DISCRIMINADOR · al MÉDICO sí se le acepta la anotación');
});

PRUEBAS.caso('🔴 NO puede PISAR una determinación médica mandando su id con tipo de restricción', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ÉSTE ES EL AGUJERO QUE ABRIÓ LA PRIMERA VERSIÓN DEL ARREGLO, y el caso de arriba no lo veía:
     probaba que no puede crear una anotación NUEVA, no que no puede convertir una que ya existe.
     El upsert matchea SÓLO por id, y `accionGestiones` le da los ids de las anotaciones. */
  const api = p211Api();
  PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Med({ gestion: p211Anot('a_firme') }))).ok,
    'guarda: el médico firma la determinación');
  const ids = (p211J(api.accionGestiones(p211Sup())).gestiones || []).map(x => x.id);
  PRUEBAS.cierto(ids.indexOf('a_firme') >= 0, '⚠️ y el servidor SÍ le da el id al supervisor (es lo que hace posible el ataque)');
  const pisa = p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr('a_firme') })));
  PRUEBAS.falso(pisa.ok, '🔴 pisarla con `tipo:"restriccion_tarea"` se RECHAZA · ' + JSON.stringify(pisa).slice(0, 70));
  PRUEBAS.igual(p211TipoDe(api, 'a_firme'), 'anotacion_aptitud', '🔴 y la fila sigue siendo la anotación: el rechazo no es sólo el mensaje');
  /* y por lo tanto tampoco la puede borrar en un segundo paso, que era el remate */
  PRUEBAS.falso(p211J(api.accionGestionBorrar(p211Sup({ id: 'a_firme' }))).ok, 'y no la puede borrar después');
  PRUEBAS.cierto(p211Filas(api).some(f => String(f[1]) === 'a_firme'), 'sigue en la hoja');
  /* DISCRIMINADOR · la misma operación sobre una restricción SÍ pasa, así que el rechazo es por el
     tipo de la fila y no por haber prohibido actualizar cualquier cosa */
  api.accionGestionGuardar(p211Med({ gestion: p211Restr('r_suya') }));
  PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr('r_suya') }))).ok,
    'DISCRIMINADOR · actualizar una RESTRICCIÓN que ya existe sí se le acepta');
});

PRUEBAS.caso('🔴 y puede LEER la restricción que creó (si no, la crea y desaparece al reabrir)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p211Api();
  api.accionGestionGuardar(p211Sup({ gestion: p211Restr('g_leo') }));
  api.accionGestionGuardar(p211Med({ gestion: JSON.stringify({ id: 'n_leo', tipo: 'nota_clinica', persona: 'PEDRO GOMEZ', texto: 'privada', medico: 'Dra. R', creada: 1 }) }));
  const g = p211J(api.accionGestiones(p211Sup()));
  PRUEBAS.cierto(g.ok, 'guarda: la lectura responde');
  const ids = (g.gestiones || []).map(x => x.id).sort();
  PRUEBAS.cierto(ids.indexOf('g_leo') >= 0, '🔴 le vuelve SU restricción: `gestPull` reemplaza la lista local, así que sin esto desaparecía de su pantalla');
  PRUEBAS.falso(ids.indexOf('n_leo') >= 0, '⚠️ y NO la nota clínica del médico, que es lo que el recorte de E2a protege');
});

PRUEBAS.caso('🔴 el supervisor NO BORRA nada: levantar una restricción es un GUARDADO con `levantada:true`', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ LA PRIMERA VERSIÓN LE DABA `gestion_borrar`, «para que pueda levantar la restricción que él
     mismo puso». Era FALSO: `restLevantar` (index.html) no borra, hace
     `g.levantada = true; gestUpsert(g)` — «el registro de que existió tiene que sobrevivir». El
     verificador revisó los SEIS caminos que pueblan `s.del` y ninguno borra un `restriccion_tarea`
     ni un `telemedicina`: era una capacidad de borrado en el CH sin un solo llamador, sobre una
     premisa que el propio cliente contradice. Este caso fija que no la tiene, y que el camino real
     —guardar la misma gestión con `levantada:true`— sí funciona. */
  const api = p211Api();
  PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr('g_lev') }))).ok, 'guarda: crea la restricción');
  const levantada = JSON.parse(p211Restr('g_lev')); levantada.levantada = true; levantada.levantadaEn = 1759200000000;
  const rl = p211J(api.accionGestionGuardar(p211Sup({ gestion: JSON.stringify(levantada) })));
  PRUEBAS.cierto(rl.ok && rl.actualizado === true, '🔴 LEVANTARLA es un guardado, y se le acepta · ' + JSON.stringify(rl).slice(0, 55));
  const f = p211Filas(api).find(x => String(x[1]) === 'g_lev');
  PRUEBAS.cierto(!!f && JSON.parse(f[2]).levantada === true, 'y la fila queda marcada `levantada`, no borrada (R3: el registro sobrevive)');
  /* 🔴 y BORRAR no se le acepta, ni la suya */
  PRUEBAS.falso(p211J(api.accionGestionBorrar(p211Sup({ id: 'g_lev' }))).ok, '🔴 y `gestion_borrar` se le RECHAZA, incluso sobre su propia restricción');
  PRUEBAS.cierto(p211Filas(api).some(x => String(x[1]) === 'g_lev'), 'la fila sigue ahí');
  /* DISCRIMINADOR · al médico sí se le acepta el borrado, así que el rechazo es por rol */
  PRUEBAS.cierto(p211J(api.accionGestionBorrar(p211Med({ id: 'g_lev' }))).ok, 'DISCRIMINADOR · al MÉDICO sí');
  PRUEBAS.falso(p211Filas(api).some(x => String(x[1]) === 'g_lev'), 'y esa fila sí se fue');
});

PRUEBAS.caso('⚠️ borrado del MÉDICO · responde `ok` con la cuenta, así la cola puede limpiarse', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ `negado` se acumulaba y se contestaba DESPUÉS del bucle, así que un borrado que sí sacó una
     fila podía informarse como falla: el cliente no limpia `s.del[id]`, reintenta hasta
     `COLA_MAX_INTENTOS` y queda trabado sobre algo que ya pasó. Con dos filas del mismo scope+id
     —que es lo que P164 documenta haber producido en producción con `appendRow` y un id `#ERROR!`—
     era alcanzable. Ahora `ok:false` sólo si NO se borró nada. */
  const api = p211Api();
  api.accionGestionGuardar(p211Med({ gestion: p211Restr('g_cnt') }));
  const r = p211J(api.accionGestionBorrar(p211Med({ id: 'g_cnt' })));
  PRUEBAS.cierto(r.ok, 'el médico borra');
  PRUEBAS.igual(r.borradas, 1, '⚠️ y la respuesta dice CUÁNTAS borró, no sólo que salió bien');
  PRUEBAS.igual(r.negadas, 0, 'y cuántas se negaron');
  /* un id que no existe responde ok (idempotencia): la cola tiene que poder limpiarlo */
  const r2 = p211J(api.accionGestionBorrar(p211Med({ id: 'no_existe' })));
  PRUEBAS.cierto(r2.ok, 'y borrar un id inexistente responde ok · ' + JSON.stringify(r2).slice(0, 45));
  PRUEBAS.igual(r2.borradas, 0, 'con 0 borradas, que es la verdad');
});

PRUEBAS.caso('🔴 PRIVACIDAD · ningún campo clínico sale a quien no es médico, de NINGÚN tipo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ E2a REABIERTO POR P211, y lo cazó el verificador. El recorte de `nota` miraba SÓLO
     `anotacion_aptitud`, y la puerta de lectura pasó a dejar entrar dos tipos más: una
     `restriccion_tarea` con un campo `nota` le llegaba al supervisor CON la nota — y antes de P211
     no le llegaba nada. El comentario afirmaba que ese tipo «no lleva nota clínica», que es una
     propiedad del cliente de HOY y no del servidor: la hoja la edita gente a mano y otra IA escribe
     en el CH. Ahora el recorte es por LISTA NEGRA DE CAMPOS sobre todos los tipos. */
  const api = p211Api();
  const conNota = (id, tipo) => JSON.stringify({ id: id, tipo: tipo, persona: 'PEDRO GOMEZ', creada: 1,
    nota: 'HIPERTENSO, medicado', texto: 'texto clínico libre', tarea: 'vuelo nocturno', nivel: 'alto' });
  ['restriccion_tarea', 'telemedicina', 'anotacion_aptitud'].forEach(tipo => {
    api.accionGestionGuardar(p211Med({ gestion: conNota('c_' + tipo, tipo) }));
  });
  const del = (p211J(api.accionGestiones(p211Sup())).gestiones || []);
  PRUEBAS.alMenos(del.length, 3, 'guarda: al supervisor le llegan las tres');
  del.forEach(g => {
    PRUEBAS.igual(g.nota, undefined, '🔴 sin `nota` · ' + g.tipo);
    PRUEBAS.igual(g.texto, undefined, '🔴 sin `texto` · ' + g.tipo);
  });
  /* y lo que SÍ necesita para trabajar sigue llegando */
  const r = del.find(g => g.tipo === 'restriccion_tarea');
  PRUEBAS.igual(r && r.tarea, 'vuelo nocturno', '⚠️ pero la TAREA sí: sin eso la restricción no sirve');
  PRUEBAS.igual((del.find(g => g.tipo === 'anotacion_aptitud') || {}).nivel, 'alto', 'y el NIVEL de aptitud también');
  /* DISCRIMINADOR · al médico le llega todo */
  const dm = (p211J(api.accionGestiones(p211Med())).gestiones || []).find(g => g.tipo === 'restriccion_tarea');
  PRUEBAS.igual(dm && dm.nota, 'HIPERTENSO, medicado', 'DISCRIMINADOR · al MÉDICO sí le llega la nota');
});

PRUEBAS.caso('⚠️ un `tipo` que no es cadena se rechaza al escribir (fila fantasma en el CH)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* `{tipo:["restriccion_tarea"]}` pasaba la guarda —que coacciona con `String()`— y quedaba en la
     hoja como arreglo: invisible para `restTodas()` del cliente, que compara con `===`. Y era la
     mitad del agujero del recorte de `nota`, que comparaba con `===` mientras la puerta coaccionaba.
     ⚠️ LA AUSENCIA DE `tipo` NO ENTRA ACÁ, Y ESTE CASO LA TENÍA: ver el caso de abajo. */
  const api = p211Api();
  const antes = p211Filas(api).length;
  [['arreglo', ['restriccion_tarea']], ['objeto', { t: 1 }], ['número', 7]].forEach(par => {
    PRUEBAS.falso(p211J(api.accionGestionGuardar(p211Med({ gestion: JSON.stringify({ id: 'x_' + par[0], tipo: par[1], persona: 'P', creada: 1 }) }))).ok,
      '⚠️ tipo ' + par[0] + ' se rechaza, incluso al médico');
  });
  PRUEBAS.igual(p211Filas(api).length, antes, 'y la hoja quedó igual: ni una fila fantasma');
});

PRUEBAS.caso('🔴 el CASO DEL CUADERNO no tiene `tipo`, y el médico tiene que poder guardarlo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ÉSTE ES EL 🔴 DE LA RONDA 3, y lo introdujo el arreglo de la ronda 2. El guard pasó a exigir
     `typeof g.tipo === "string" && g.tipo`, y **el caso del cuaderno no tiene `tipo` POR DISEÑO**:
     `gestCasos()` es literalmente «las gestiones cuyo tipo NO es ninguno de los cuatro internos».
     Con eso el médico no podía guardar ni editar un solo caso —ni cerrarlo, ni agregarle un
     seguimiento, ni marcar una tarea—, el contador de retenidos daba 0 porque para el médico la
     lista es `null`, el aviso de cerrar sesión prometía el envío y `cerrarSesion()` borraba la cola.
     ⚠️ Y LA SUITE ESTABA EN VERDE porque el caso de arriba afirmaba que rechazar el tipo ausente era
     correcto: tenía `['ausente', undefined]` en su lista. Un caso que codifica la regresión como
     comportamiento esperado es peor que no tener caso. */
  const api = p211Api();
  /* R17 · el objeto sale de `gestNueva()` REAL, no escrito a mano */
  return p211ConLimpio(() => {
    DASH = { vista: 'medico', combinada: false, f: { emp: '', dep: '', per: '' }, scope: 'Aeroambulancias Silva',
             registros: [], params: { usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'med-sil' }, demoMode: false };
    gestNueva();
    const caso = (gestStore().items || [])[0];
    PRUEBAS.cierto(!!caso, 'guarda: `gestNueva()` dejó el caso local');
    if (!caso) return;
    PRUEBAS.igual(caso.tipo, undefined, '⚠️ y NO tiene `tipo`: así se define un caso del cuaderno');
    PRUEBAS.cierto(gestCasos().some(g => g.id === caso.id), 'y `gestCasos()` lo reconoce como caso');
    const r = p211J(api.accionGestionGuardar(p211Med({ gestion: JSON.stringify(caso) })));
    PRUEBAS.cierto(r.ok, '🔴 el servidor SE LO ACEPTA al médico · ' + JSON.stringify(r).slice(0, 60));
    PRUEBAS.igual(p211Filas(api).filter(f => String(f[1]) === caso.id).length, 1, '🔴 y queda la fila en `Gestiones`');
    /* y EDITARLO también: cerrar el caso, agregar un seguimiento, marcar una tarea */
    const editado = Object.assign({}, caso, { estado: 'cerrada', detalle: 'resuelto', seguimientos: [{ texto: 'x', ts: 1 }] });
    PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Med({ gestion: JSON.stringify(editado) }))).ok,
      '🔴 y puede EDITARLO: cerrarlo, agregar seguimiento, marcar tarea');
    /* DISCRIMINADOR · al SUPERVISOR no se le acepta: `String(undefined || "")` = "" y su lista no lo tiene */
    PRUEBAS.falso(p211J(api.accionGestionGuardar(p211Sup({ gestion: JSON.stringify(caso) }))).ok,
      'DISCRIMINADOR · al SUPERVISOR no: el candado no se aflojó');
    /* y el supervisor tampoco lo LEE */
    PRUEBAS.falso((p211J(api.accionGestiones(p211Sup())).gestiones || []).some(g => g.id === caso.id),
      '⚠️ ni lo recibe al leer: el cuaderno de casos es del médico');
  });
});

PRUEBAS.caso('🔴 PRIVACIDAD · el recorte es LISTA BLANCA por tipo, no lista negra de campos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ LA PRIMERA VERSIÓN FUE LISTA NEGRA (`nota`, `texto`, `diagnostico`…) y dejaba pasar `detalle`,
     `titulo`, `observaciones` y TODO LO ANIDADO — `Object.assign` es superficial, así que
     `detalleClinico.nota` y `seguimientos[i].texto` sobrevivían. Y esos son justo los campos del
     cuaderno de casos. Va contra la decisión de P207, que está escrita en el `GS_VERSION` de esta
     misma versión: «`anonimizarHseq` recorta por lista blanca y no por lista negra». */
  const api = p211Api();
  const sucia = JSON.stringify({ id: 'p_suc', tipo: 'restriccion_tarea', persona: 'PEDRO GOMEZ',
    departamento: 'Operaciones', tarea: 'vuelo nocturno', motivo: 'x', creada: 1, horas: 72,
    nota: 'HIPERTENSO', texto: 'texto clínico', titulo: 'NO APTO por HTA', detalle: 'texto clínico libre',
    observaciones: 'diabético', detalleClinico: { nota: 'anidada', dx: 'apnea' },
    seguimientos: [{ texto: 'la nota va acá' }] });
  api.accionGestionGuardar(p211Med({ gestion: sucia }));
  const g = (p211J(api.accionGestiones(p211Sup())).gestiones || []).find(x => x.id === 'p_suc');
  PRUEBAS.cierto(!!g, 'guarda: al supervisor le llega la restricción');
  if (!g) return;
  ['nota', 'texto', 'titulo', 'detalle', 'observaciones', 'detalleClinico', 'seguimientos'].forEach(c => {
    PRUEBAS.igual(g[c], undefined, '🔴 sin `' + c + '`');
  });
  /* y lo que SÍ necesita para trabajar llega entero */
  PRUEBAS.igual(g.tarea, 'vuelo nocturno', '⚠️ pero la TAREA sí: sin eso la restricción no sirve');
  PRUEBAS.igual(g.horas, 72, 'y las horas');
  PRUEBAS.igual(g.departamento, 'Operaciones', 'y el departamento');
  /* DISCRIMINADOR · al médico le llega todo, incluido lo anidado */
  const dm = (p211J(api.accionGestiones(p211Med())).gestiones || []).find(x => x.id === 'p_suc');
  PRUEBAS.igual(dm && dm.detalleClinico && dm.detalleClinico.nota, 'anidada', 'DISCRIMINADOR · al MÉDICO le llega hasta lo anidado');
});

/* ⚠️ Extrae del FUENTE REAL de una función del cliente los campos que escribe sobre una gestión.
   Tres formas, porque el cliente usa las tres: el literal de `gestUpsert({…})`, las asignaciones
   sueltas `g.campo = …`, y `Object.assign({}, g, { campo: … })`. Se lee con `toString()`, así que es
   el código que está corriendo — no una copia. */
function p211CamposQueEscribe(fn) {
  /* ⚠️ LOS COMENTARIOS SE SACAN PRIMERO. Sin esto el extractor perdía todo campo que viniera después
     de un `// …` —`tarea` en `restGuardar` y `sugeridaPor` en `telemSugerir`, porque el `\s*` de la
     regex no cruza un comentario— y el caso habría dicho «todo bien» sin haberlos mirado nunca. Un
     falso NEGATIVO es mucho peor que el falso positivo que este mismo extractor tuvo antes: el
     positivo se ve en rojo, el negativo se ve en verde. */
  const src = String(fn).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const campos = new Set();
  /* 1 · literal pasado a gestUpsert(...) — se recorta hasta la llave que lo cierra.
     ⚠️ SÓLO SI EL LITERAL ES LO PRIMERO TRAS EL PARÉNTESIS. La primera versión buscaba el siguiente
     `{` del fuente, y con `gestUpsert(copia)` —que no lleva literal— saltaba al objeto de la línea
     de abajo: `bitacoraRegistrar(..., { id, decidio })`. El caso reportó `decidio` como un campo de
     gestión que el `.gs` no devolvía, y no lo es. Un falso positivo, cazado por la suite. */
  let i = src.indexOf('gestUpsert(');
  while (i >= 0) {
    let j = i + 'gestUpsert('.length;
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] !== '{') { i = src.indexOf('gestUpsert(', i + 1); continue; }
    let prof = 0, fin = -1;
    if (j >= 0) {
      for (let k = j; k < src.length; k++) {
        if (src[k] === '{') prof++;
        else if (src[k] === '}') { prof--; if (!prof) { fin = k; break; } }
      }
      if (fin > j) {
        const cuerpo = src.slice(j + 1, fin);
        /* sólo las claves de nivel 0 de ese literal */
        let p2 = 0;
        cuerpo.replace(/([{}[\]()])|(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g, (m, sig, clave) => {
          if (sig) { p2 += (sig === '{' || sig === '[' || sig === '(') ? 1 : -1; }
          else if (!p2 && clave) campos.add(clave);
          return m;
        });
      }
    }
    i = src.indexOf('gestUpsert(', i + 1);
  }
  /* 2 · `g.campo = …` y `copia.campo = …` */
  src.replace(/\b(?:g|copia)\.([A-Za-z_$][\w$]*)\s*=[^=]/g, (m, c) => { campos.add(c); return m; });
  /* 3 · Object.assign({}, g, { campo: … }) */
  src.replace(/Object\.assign\([^)]*\{([^}]*)\}\s*\)/g, (m, cuerpo) => {
    cuerpo.replace(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g, (mm, c) => { campos.add(c); return mm; });
    return m;
  });
  return campos;
}

PRUEBAS.caso('🔴 CONTRATO · la lista blanca del `.gs` cubre lo que los constructores del cliente escriben DE VERDAD', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ LA PRIMERA VERSIÓN DE ESTE CASO ERA UNA TRANSCRIPCIÓN. Su comentario decía que comparaba
     contra «los campos que los constructores del cliente escriben de verdad», y la lista `esperados`
     era un literal copiado a mano del `.gs`: detectaba que alguien SACARA un campo del servidor y era
     ciego a que alguien AGREGARA uno en `index.html` — que es justo la dirección peligrosa, porque
     desde P211 un campo que la lista blanca no tiene se recorta al leer y el round-trip del
     supervisor lo borraría del CH. Lo cazó el verificador. Ahora los campos salen del `toString()`
     de las funciones REALES del cliente.
     Excepciones declaradas: `nota` es deliberado (es el recorte de E2a) y `actualizada` sólo la lee
     el cuaderno de casos —que el supervisor no abre— y `gestUpsert` la repone en cada push. */
  const EXCEPCIONES = { 'anotacion_aptitud': ['nota', 'actualizada'], 'restriccion_tarea': ['actualizada'], 'telemedicina': ['actualizada'] };
  const FUENTES = {
    'restriccion_tarea': [restGuardar, restLevantar],
    'telemedicina':      [telemSugerir, telemCambiarEstado],
    'anotacion_aptitud': [anotGuardar]
  };
  const env = GS.crearEntorno(p211Hojas());
  const gs = GS.cargarGs(CTX.gs, env, ['gestRecortarParaNoMedico_']);
  Object.keys(FUENTES).forEach(tipo => {
    /* qué manda el `.gs`: se pregunta al `.gs` REAL, no se transcribe */
    const sonda = { tipo: tipo }; const TODOS = new Set();
    FUENTES[tipo].forEach(fn => p211CamposQueEscribe(fn).forEach(c => TODOS.add(c)));
    PRUEBAS.alMenos(TODOS.size, 5, 'guarda: se extrajeron los campos de ' + tipo + ' (' + TODOS.size + ')');
    TODOS.forEach(c => { sonda[c] = 'v_' + c; });
    const manda = gs.gestRecortarParaNoMedico_(sonda, tipo);
    PRUEBAS.cierto(!!manda, 'guarda: ' + tipo + ' tiene lista blanca');
    if (!manda) return;
    const faltan = [].concat(Array.from(TODOS)).filter(c => manda[c] === undefined && EXCEPCIONES[tipo].indexOf(c) < 0);
    PRUEBAS.igual(faltan.join(','), '',
      '🔴 ' + tipo + ': el cliente escribe estos campos y el `.gs` NO los devuelve → se recortan al leer y el round-trip los BORRA del CH');
    EXCEPCIONES[tipo].forEach(c => PRUEBAS.igual(manda[c], undefined, '⚠️ y `' + c + '` NO sale, a propósito'));
  });
  /* un tipo sin lista NO se devuelve: falla cerrado y se nota */
  PRUEBAS.igual(gs.gestRecortarParaNoMedico_({ id: 'x', tipo: 'inventado' }, 'inventado'), null,
    '⚠️ un tipo sin lista blanca no se devuelve: falla cerrado');
});

PRUEBAS.caso('⚠️ el default de LECTURA falla cerrado: una vista nueva no lee determinaciones médicas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* La primera versión de `gestPuedeLeerTipo_` devolvía `t === GEST_TIPO_ANOTACION || …` sin mirar
     quién pregunta, así que CUALQUIER vista con lista vacía leía la anotación de aptitud — que lleva
     `persona`, `nivel` y `medico`. Hoy no es alcanzable, pero una vista nueva mañana la leería sin
     que nadie toque una línea. El default de escritura ya fallaba cerrado; el de lectura, no. */
  const env = GS.crearEntorno(p211Hojas());
  const gs = GS.cargarGs(CTX.gs, env, ['gestPuedeLeerTipo_', 'gestPuedeEscribirTipo_']);
  PRUEBAS.cierto(gs.gestPuedeLeerTipo_({ vista: 'supervisor' }, 'anotacion_aptitud'), 'el supervisor SÍ ve el estado de aptitud (lo necesita)');
  ['hseq', 'direccion', 'empleado', 'vista_nueva_de_manana', '', null].forEach(v => {
    PRUEBAS.falso(gs.gestPuedeLeerTipo_({ vista: v }, 'anotacion_aptitud'),
      '⚠️ la vista «' + String(v) + '» NO lee la anotación de aptitud');
    PRUEBAS.falso(gs.gestPuedeEscribirTipo_({ vista: v }, 'restriccion_tarea'), 'ni escribe restricciones');
  });
  PRUEBAS.falso(gs.gestPuedeLeerTipo_(null, 'anotacion_aptitud'), 'y sin acceso, nada');
});

PRUEBAS.caso('🔴 el CONTADOR de retenidos cuenta por TIPO, no por cola', () => {
  /* ⚠️ ÉSTE ES EL PEOR DE LA SEGUNDA RONDA, y lo introdujo el arreglo de P211. `colasRetenidas`
     autorizaba por COLA («esta vista escribe algún tipo») y restaba la partición entera, mientras el
     servidor autoriza ítem por ítem. Escenario medido: el médico deja una `anotacion_aptitud` en la
     cola sin señal, y después entra el SUPERVISOR en el mismo teléfono —misma empresa, misma
     partición—. El contador daba 0, `offPintar` pintaba «Enviando 1 registro…», el aviso de cerrar
     sesión decía «toca Aceptar para intentar enviarlos», el servidor contestaba «No autorizado» y
     `cerrarSesion()` borraba `K_GESTIONES`: **la determinación médica firmada se perdía con la
     promesa en pantalla**. Antes de P211 ese aviso era honesto. */
  return p211ConLimpio(() => {
    DASH = { vista: 'medico', combinada: false, f: { emp: '', dep: '', per: 'ANA' }, scope: 'Consorcio HELITEC',
             registros: [], params: { usuario: 'Consorcio HELITEC', empresa: 'Consorcio HELITEC', pass: 'x' }, demoMode: false };
    gestUpsert({ id: 'a_med', tipo: GEST_TIPO_ANOTACION, persona: 'ANA', nivel: 'alto', creada: Date.now() });
    PRUEBAS.igual(colasRetenidas(), 0, 'guarda: con el panel del MÉDICO no está retenida');
    /* y ahora entra el supervisor en el mismo teléfono: MISMA partición */
    DASH.vista = 'supervisor';
    PRUEBAS.igual(colasRetenidas(), 1, '🔴 con el panel del SUPERVISOR sí está retenida: él no puede mandar una anotación');
    PRUEBAS.igual(colasRetenidas(true), 1, '🔴 y al CERRAR SESIÓN también, que es donde se perdía');
    /* DISCRIMINADOR · su propia restricción, en la misma cola, NO cuenta como retenida */
    gestUpsert({ id: 'r_sup', tipo: GEST_TIPO_RESTRICCION, persona: 'ANA', tarea: 'x', creada: Date.now() });
    PRUEBAS.igual(colasRetenidas(), 1, 'DISCRIMINADOR · sigue en 1: la restricción sí la puede mandar, la anotación no');
    /* y con el panel del médico, las dos salen */
    DASH.vista = 'medico';
    PRUEBAS.igual(colasRetenidas(), 0, 'y con el médico las dos se pueden mandar');
  });
});

PRUEBAS.caso('⚠️ la cuenta COMBINADA manda todo aunque esté en la pestaña de supervisor', () => {
  /* ⚠️ `gestTiposMandables` replica LITERAL la condición del `.gs`: `if (!acc.visor && acc.combinada
     && (p.pedida === "supervisor" || p.pedida === "medico")) acc.vista = p.pedida;`. Para una cuenta
     combinada, `accionGestionGuardar` re-valida y SIEMPRE ve `vista:"medico"`, sin importar la
     pestaña — así que el cartel no puede contar como retenida una anotación que está saliendo bien.
     La primera versión de esta línea no miraba `combinada` (el cartel mentía en ámbar); la segunda
     miraba sólo `combinada`, y con eso una vista HSEQ combinada habría dado «todos los tipos»
     mientras el servidor le rechaza cada uno — el mismo error, en el otro sentido. */
  return p211ConLimpio(() => {
    const armar = (vista, combinada) => { DASH = { vista: vista, combinada: combinada, f: { emp: '', dep: '', per: '' },
      scope: 'X', registros: [], params: { usuario: 'X', empresa: 'X', pass: 'x' }, demoMode: false };
      return JSON.stringify(gestTiposMandables()); };
    PRUEBAS.igual(armar('supervisor', true), 'null', '⚠️ combinada + pestaña supervisor → TODOS: el servidor la ve médica');
    PRUEBAS.igual(armar('medico', true), 'null', 'combinada + pestaña médica → todos');
    PRUEBAS.igual(armar('supervisor', false), '["restriccion_tarea","telemedicina"]',
      'DISCRIMINADOR · NO combinada + supervisor → sólo sus dos tipos');
    PRUEBAS.igual(armar('hseq', true), '[]',
      '⚠️ y combinada + HSEQ → NINGUNO: el `.gs` sólo pisa la vista con supervisor o medico');
    PRUEBAS.igual(armar('hseq', false), '[]', 'HSEQ sin combinar, ninguno');
    PRUEBAS.igual(armar('direccion', true), '[]', 'y Dirección tampoco, aunque venga combinada');
  });
});

PRUEBAS.caso('⚠️ y en el camino de salida la lista sale de QUÉ credencial hay, no del panel', () => {
  /* Sin panel (`DASH = null`) no hay vista que consultar: manda la credencial guardada. La médica
     escribe todos los tipos; la de supervisor, sólo sus dos. */
  return p211ConLimpio(() => {
    DASH = { vista: 'medico', combinada: false, f: { emp: '', dep: '', per: 'ANA' }, scope: 'Consorcio HELITEC',
             registros: [], params: { usuario: 'Consorcio HELITEC', empresa: 'Consorcio HELITEC', pass: 'x' }, demoMode: false };
    gestUpsert({ id: 'a_s', tipo: GEST_TIPO_ANOTACION, persona: 'ANA', creada: Date.now() });
    gestUpsert({ id: 'r_s', tipo: GEST_TIPO_RESTRICCION, persona: 'ANA', tarea: 'x', creada: Date.now() });
    DASH = null;
    try { localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    try { localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok' })); } catch (e) {}
    PRUEBAS.igual(colasRetenidas(true), 1, '⚠️ con la de SUPERVISOR: la restricción sale, la anotación queda retenida');
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tokm' })); } catch (e) {}
    PRUEBAS.igual(colasRetenidas(true), 0, 'DISCRIMINADOR · con la MÉDICA puesta, las dos se pueden mandar');
    PRUEBAS.alMenos(colasRetenidas(), 2, '⚠️ y sin `alSalir` las dos siguen retenidas: esa credencial sólo vale al salir');
  });
});

PRUEBAS.caso('⚠️ HSEQ no escribe gestiones de ningún tipo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ SE AUTENTICA DE VERDAD, con la contraseña de la columna «Contraseña HSQ» (R17). La primera
     versión de este caso mandaba `verVista:'hseq'` con la contraseña de SUPERVISOR: eso no cambia la
     vista del acceso —`validarAcceso` la deriva de QUÉ columna coincide— así que el guardado se
     aceptaba como supervisor y el caso fallaba midiendo otra cosa. Dirección no sale de
     `validarAcceso` en absoluto; su lado está cubierto por el caso del CONTRATO, más abajo. */
  const api = p211Api();
  const hseq = extra => Object.assign({ usuario: 'silva', empresa: 'Aeroambulancias Silva', pass: 'hseq-sil' }, extra || {});
  PRUEBAS.igual(api.validarAcceso('silva', 'hseq-sil', 'd').vista, 'hseq', 'guarda: esa contraseña entra como HSEQ');
  const antes = p211Filas(api).length;
  [['restriccion_tarea', p211Restr], ['telemedicina', p211Telem], ['anotacion_aptitud', p211Anot]].forEach(par => {
    const r = p211J(api.accionGestionGuardar(hseq({ gestion: par[1]('h_' + par[0]) })));
    PRUEBAS.falso(r.ok, '⚠️ HSEQ no puede guardar ' + par[0] + ' · ' + JSON.stringify(r).slice(0, 55));
  });
  PRUEBAS.igual(p211Filas(api).length, antes, '⚠️ y la hoja quedó igual que al empezar');
  /* y tampoco borra la restricción de otro */
  api.accionGestionGuardar(p211Sup({ gestion: p211Restr('g_ajena') }));
  PRUEBAS.falso(p211J(api.accionGestionBorrar(hseq({ id: 'g_ajena' }))).ok, 'ni borra la del supervisor');
  PRUEBAS.cierto(p211Filas(api).some(f => String(f[1]) === 'g_ajena'), 'que sigue en la hoja');
});

PRUEBAS.caso('⚠️ la fila nueva no entra por `appendRow` (P164 · un id con `=` quedaría como fórmula)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* El emulador no modela el parser de Sheets, así que esto se mide sobre el TEXTO del `.gs`: el
     comentario de P164 (líneas ~1979) tiene medido en producción que `appendRow` interpreta los
     valores como si alguien los tipeara y un texto que empieza con `=`, `+` o `-` se guarda como
     fórmula o como `#ERROR!`. Con el id roto el upsert no vuelve a matchear nunca y CADA reenvío de
     la cola appendea otra fila (R15). `g.id` llega del cliente sin validación. */
  PRUEBAS.falso(CTX.gs.indexOf('sh.appendRow([scope, String(g.id), datos, ahora]);') >= 0,
    '⚠️ `accionGestionGuardar` ya no usa `appendRow` para la fila nueva');
  PRUEBAS.cierto(CTX.gs.indexOf('filaAgregar_(sh, [scope, String(g.id), datos, ahora]);') >= 0,
    'usa `filaAgregar_`, que aplica el formato de texto y escribe con `setValues`');
  /* y que siga guardando bien un id con `=`, o sea que el cambio no rompió el camino normal */
  const api = p211Api();
  const raro = '=IMPORTRANGE_NO';
  PRUEBAS.cierto(p211J(api.accionGestionGuardar(p211Sup({ gestion: p211Restr(raro) }))).ok, 'y un id con `=` se sigue guardando');
  PRUEBAS.igual(p211TipoDe(api, raro), 'restriccion_tarea', 'con su tipo intacto');
});

PRUEBAS.caso('🔴 CONTRATO · el cliente y el `.gs` derivan la MISMA lista de tipos por vista', () => {
  /* ⚠️ Éste es el caso que faltaba, y el defecto de P211 es exactamente lo que mide: el cliente
     decidía quién puede restringir con una regla y el servidor con otra. Se comparan las dos
     derivaciones, no cada lado por separado (R17, igual que `a4-contrato-servidor-cliente.js`). */
  PRUEBAS.igual(typeof gestTiposQueEscribe, 'function', 'guarda: el cliente tiene su derivación');
  PRUEBAS.igual(gestTiposQueEscribe('medico'), null, 'el médico escribe TODOS los tipos (null)');
  PRUEBAS.igual(JSON.stringify(gestTiposQueEscribe('supervisor')), '["restriccion_tarea","telemedicina"]',
    '🔴 el supervisor escribe restricción y telemedicina');
  PRUEBAS.igual(JSON.stringify(gestTiposQueEscribe('direccion')), '[]', 'Dirección, ninguno');
  PRUEBAS.igual(JSON.stringify(gestTiposQueEscribe('hseq')), '[]', 'HSEQ, ninguno');
  /* ⚠️ R16 · el cliente usa LITERALES en esa función a propósito (las constantes son `const`
     declaradas ~1000 líneas más abajo y `offPintar` la alcanza en el arranque). Que no se
     desincronicen de las constantes se fija acá: */
  PRUEBAS.igual(gestTiposQueEscribe('supervisor')[0], GEST_TIPO_RESTRICCION, 'y el literal coincide con `GEST_TIPO_RESTRICCION`');
  PRUEBAS.igual(gestTiposQueEscribe('supervisor')[1], GEST_TIPO_TELEMEDICINA, 'y con `GEST_TIPO_TELEMEDICINA`');
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'la mitad del servidor se saltea: no está levantado servir-gs.py'); return; }
  /* y ahora la del `.gs` REAL, cargada del archivo, no transcripta */
  const env = GS.crearEntorno(p211Hojas());
  const gs = GS.cargarGs(CTX.gs, env, ['gestTiposDeVista_']);
  PRUEBAS.igual(gs.gestTiposDeVista_('medico'), null, 'el `.gs`: médico → todos');
  ['supervisor', 'direccion', 'hseq', 'empleado'].forEach(v => {
    PRUEBAS.igual(JSON.stringify(gs.gestTiposDeVista_(v)), JSON.stringify(gestTiposQueEscribe(v)),
      '🔴 los dos lados coinciden para «' + v + '»');
  });
});
