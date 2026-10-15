PRUEBAS.grupo('P301 · las ausencias: sólo supervisor y servicio médico escriben, y el autor es la cuenta');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P301 · DOS FUGAS VIVAS, EN UN SOLO PROMPT (decisión de Franco: «como primer prompt del plan»)

   1 · `ausencia_guardar` sólo frenaba al visor. Con la ClaveHseq, un POST directo marcaba y anulaba
       ausencias —saca a la persona del denominador de la cobertura de ese día— y dejaba línea en la
       bitácora, que R3 declara append-only. Y el autor de esa línea salía de `p.quien`, un campo que
       escribe el teléfono.
   2 · `F021` · la sesión recordada de una cuenta COMBINADA (sin contraseña médica en `Accesos`) abría
       siempre Servicio médico, aunque la persona hubiera entrado por Supervisor: el auto-login no
       mandaba `pedida`. Medido: alguien que en la nómina es sólo supervisor veía comentarios y puntajes.

   CÓMO SE PRUEBA (R17): el servidor, por `accionAusenciaGuardar` del `.gs` REAL en el emulador; el
   cliente, por el camino entero —el login con contraseña, «Sí, recordar» (`dashSaveCreds`, el escritor
   real de la ranura) y el auto-login del arranque (`portalAbrirDirecto` → `openPortal`)—, con los
   pedidos de la app desviados al `.gs` real en el emulador. Ningún token ni ranura se escribe a mano.

   ⚠️ CADA DISCRIMINADOR SABOTEA EL `.gs` POR TEXTO. Si alguien cambia la línea que se sabotea, el
   sabotaje no encuentra qué romper y el caso lo DICE en rojo, en vez de pasar sin medir nada.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P301_HOY = new Date().toISOString().substring(0, 10);
/* Los encabezados REALES del CH (`pruebas/encabezados-ch.json`), no un sinónimo. */
const P301_CAB_ACCESOS = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
/* Cuentas de PRUEBA, sólo de este emulador. HELITEC tiene las tres contraseñas separadas; SILVA es
   COMBINADA (sin contraseña médica): una sola clave abre Supervisor y Servicio médico. */
const P301_ADMIN = 'adm-p301#';

function p301Fila(persona, dep, empresa, kss, comentario) {
  const f = new Array(90).fill('');
  f[0] = P301_HOY + ' 08:00:00'; f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = P301_HOY; f[86] = kss;
  if (comentario) f[85] = comentario;
  return f;
}
/* ⚠️ `Ausencias`, `Bitácora` y `Sesiones` NO se declaran: el `.gs` las crea con su propio encabezado
   (`AUS_HEAD`, `BITACORA_HEAD`, `SES_HEAD`). Uno a mano puede poner las columnas en otro orden y
   entonces un rechazo vendría de la hoja mal formada y no del candado que se quiere medir. */
function p301Hojas() {
  return {
    'Accesos': [P301_CAB_ACCESOS,
      ['*',       P301_ADMIN, 'admin',      '',                             '',        ''],
      ['helitec', 'sup-301',  'supervisor', 'Consorcio HELITEC, Helitec',   'med-301', 'dir-301'],
      ['silva',   'sil-301',  'supervisor', 'Aeroambulancias Silva, Silva', '',        'dir-sil']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p301Fila('Ana Suárez',  'Operaciones', 'Consorcio HELITEC',     7, 'Dormí muy mal'),
      /* ⚠️ el texto NO puede empezar con «comentario»: `parseComentarios` descarta esas respuestas de
         relleno, y con «Comentario clínico…» el médico no recibía nada y el caso medía un vacío */
      p301Fila('Pedro Gómez', 'Vuelo',       'Aeroambulancias Silva', 5, 'Pedro duerme mal por los turnos')],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono',
                'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
      ['Consorcio HELITEC',     'Ana Suárez',  'V-11111', 'Operaciones', 'Piloto', 'F', '40', '', '', 'Si', '', 'empleado', '3'],
      ['Aeroambulancias Silva', 'Pedro Gómez', 'V-33333', 'Vuelo',       'Piloto', 'M', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
}
function p301Api(fns, fuente) {
  const env = GS.crearEntorno(p301Hojas());
  const api = GS.cargarGs(fuente || CTX.gs, env, fns);
  api.__env = env;
  return api;
}
const p301J = r => JSON.parse(r.getContent());
function p301Datos(api, hoja) {
  const sh = api.__env.__libro.getSheetByName(hoja);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
const p301N = (api, hoja) => p301Datos(api, hoja).length;
/* El pedido de ausencia tal cual lo arma `ausEnviar` en el cliente (usuario, empresa, pass, id, cédula,
   persona, desde/hasta, motivo y `quien` = el nombre del perfil del teléfono). */
function p301Aus(cred, extra) {
  return Object.assign({ dispositivoId: 'disp-p301', id: 'aus_11111_' + P301_HOY, cedula: 'V-11111',
                         persona: 'Ana Suárez', desde: P301_HOY, hasta: P301_HOY, motivo: 'franco',
                         quien: 'Marta Supervisora' }, cred, extra || {});
}
const P301_SUP  = { usuario: 'helitec', empresa: 'helitec', pass: 'sup-301' };
const P301_MED  = { usuario: 'helitec', empresa: 'helitec', pass: 'med-301' };
const P301_HSEQ = { usuario: 'helitec', empresa: 'helitec', pass: 'dir-301' };
const P301_COMB = { usuario: 'silva',   empresa: 'silva',   pass: 'sil-301' };
const P301_ADM  = { usuario: '*', pass: P301_ADMIN, empresa: 'Consorcio HELITEC' };

/* Sabotajes del `.gs` para los discriminadores. Devuelven null si no encuentran lo que rompen. */
function p301GsSinCandado() {
  const a = 'if (vistaAus !== "supervisor" && vistaAus !== "medico") {';
  return CTX.gs.indexOf(a) >= 0 ? CTX.gs.replace(a, 'if (false) {') : null;
}
/* El `actor` de antes de P301: lo que mandara el teléfono en `quien`. */
const P301_LINEA_ACTOR = 'var actorAus = String((acc.porSesion && acc.usuario) || p.usuario || p.empresa || "").trim().slice(0, 80);';
function p301GsActorViejo() {
  return CTX.gs.indexOf(P301_LINEA_ACTOR) >= 0 ? CTX.gs.replace(P301_LINEA_ACTOR, 'var actorAus = String(p.quien || acc.canonical || "");') : null;
}
function p301GsVisorQueEscribe() {
  const i = CTX.gs.indexOf('function accionAusenciaGuardar(p)');
  const a = 'if (acc.soloLectura) return visorNoEscribe_(acc);';
  const j = i >= 0 ? CTX.gs.indexOf(a, i) : -1;
  return j >= 0 ? CTX.gs.slice(0, j) + 'if (false) {}' + CTX.gs.slice(j + a.length) : null;
}
/* El sabotaje del verificador de P301: la MISMA lista blanca, pero debajo del constructor de la hoja.
   Sigue contestando `sin_permiso`; lo que cambia es que antes de contestar ya creó y formateó
   `Ausencias` en el CH. */
function p301GsCandadoTarde() {
  const bloque = 'var vistaAus = String(acc.vista || "");\n  if (vistaAus !== "supervisor" && vistaAus !== "medico") {\n' +
                 '    return json({ ok:false, motivo:"sin_permiso", error:"Esta vista no puede marcar ni anular ausencias." });\n  }';
  const i = CTX.gs.indexOf(bloque), ctor = 'var sh = obtenerHojaAusencias();';
  const f = CTX.gs.indexOf('function accionAusenciaGuardar(p)');
  if (i < 0 || f < 0) return null;
  const sinBloque = CTX.gs.slice(0, i) + CTX.gs.slice(i + bloque.length);
  const j = sinBloque.indexOf(ctor, f);
  return j >= 0 ? sinBloque.slice(0, j + ctor.length) + '\n  ' + bloque + sinBloque.slice(j + ctor.length) : null;
}
/* El `actor` de antes de la segunda vuelta: lo que mande el POST, también con token. */
function p301GsActorDelPost() {
  return CTX.gs.indexOf(P301_LINEA_ACTOR) >= 0 ? CTX.gs.replace(P301_LINEA_ACTOR, 'var actorAus = String(p.usuario || p.empresa || "").trim().slice(0, 80);') : null;
}
/* «Supervisor si no sabe», apagado: la combinada sin pestaña vuelve a abrir Servicio médico. */
const P301_REGLA = '} else {\n      /* 🔒 P301 · «SUPERVISOR SI NO SABE»';
function p301GsSinSupervisorPorDefecto() {
  return CTX.gs.indexOf(P301_REGLA) >= 0 ? CTX.gs.replace(P301_REGLA, '} else if (false) {\n      /* 🔒 P301 · «SUPERVISOR SI NO SABE»') : null;
}
/* La regla como quedó en la segunda vuelta: sólo para sesiones (S2 de la segunda pasada del verificador). */
function p301GsSoloConSesion() {
  return CTX.gs.indexOf(P301_REGLA) >= 0 ? CTX.gs.replace(P301_REGLA, '} else if (acc.porSesion) {\n      /* 🔒 P301 · «SUPERVISOR SI NO SABE»') : null;
}
/* Los puntajes de los tests en lo que llegó: la vista de supervisor manda una fila por persona sin
   valores (E2a), la médica manda los registros crudos. */
const P301_METRICAS = ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'];
const p301ConPuntajes = resp => ((resp && resp.registros) || []).some(r => r && P301_METRICAS.some(m => r[m] != null && r[m] !== ''));

PRUEBAS.caso('🔒 P301 · HSEQ no marca ni anula ausencias: ni con su contraseña ni con su sesión recordada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido (servir-gs.py)'); return; }
  const api = p301Api(['accionAusenciaGuardar', 'accionSesionCrear']);
  /* Una ausencia REAL, marcada por el supervisor: así el «anular» de HSEQ tiene algo de verdad que tocar. */
  const base = p301J(api.accionAusenciaGuardar(p301Aus(P301_SUP)));
  PRUEBAS.igual(base.ok, true, 'guarda: el supervisor la marcó · ' + (base.error || ''));
  const filasAntes = p301Datos(api, 'Ausencias'), bitAntes = p301N(api, 'Bitácora');
  PRUEBAS.igual(filasAntes.length, 1, 'guarda: hay UNA ausencia vigente en la hoja');

  /* La sesión recordada de Dirección, emitida por el escritor real (`accionSesionCrear`). */
  const ses = p301J(api.accionSesionCrear({ usuario: 'helitec', pass: 'dir-301', dispositivoId: 'disp-hseq' }));
  PRUEBAS.cierto(ses.ok && /^sst_/.test(ses.sesion || ''), 'guarda: Dirección tiene su sesión recordada · ' + (ses.error || ''));
  PRUEBAS.igual(ses.vista, 'hseq', 'guarda: y es una sesión de la vista hseq');
  const HSEQ_SES = { usuario: 'helitec', empresa: 'helitec', pass: ses.sesion, dispositivoId: 'disp-hseq' };

  const intentos = [
    ['marcar, con contraseña',                 p301Aus(P301_HSEQ, { id: 'aus_hseq_1' })],
    ['anular la del supervisor, con contraseña', p301Aus(P301_HSEQ, { anular: '1' })],
    ['marcar, con su sesión recordada',        p301Aus(HSEQ_SES, { id: 'aus_hseq_2' })],
    ['anular, con su sesión recordada',        p301Aus(HSEQ_SES, { anular: '1' })],
    /* Las dos sondas que no escriben en ningún caso: sin el candado contestan `anulada:false` y
       `motivo_invalido`, o sea DICEN que la acción está abierta para esta vista. */
    ['sonda · anular un id que no existe',     p301Aus(P301_HSEQ, { id: 'no-existe-p301', anular: '1' })],
    ['sonda · marcar con un motivo inválido',  p301Aus(P301_HSEQ, { id: 'aus_hseq_3', motivo: 'x' })]
  ];
  intentos.forEach(([nombre, pedido]) => {
    const r = p301J(api.accionAusenciaGuardar(pedido));
    PRUEBAS.igual(r.ok, false, '🔒 HSEQ · ' + nombre + ' · se rechaza');
    PRUEBAS.igual(r.motivo, 'sin_permiso', '  y con `sin_permiso`, el motivo que el cliente ya traduce · llegó ' + JSON.stringify(r.motivo || r.error));
  });
  const filasDespues = p301Datos(api, 'Ausencias');
  PRUEBAS.igual(filasDespues.length, 1, '🔒 ni una fila nueva en `Ausencias`');
  PRUEBAS.igual(String(filasDespues[0][7]), 'vigente', '🔒 y la del supervisor sigue VIGENTE: HSEQ no la anuló');
  PRUEBAS.igual(String(filasDespues[0][11] || ''), '', '  ni quedó un `AnuladaPor`');
  PRUEBAS.igual(p301N(api, 'Bitácora'), bitAntes, '🔒 ni una línea en la bitácora, que es append-only (R3): una línea falsa no se puede corregir después');

  /* DISCRIMINADOR · el mismo `.gs` sin la lista blanca: HSEQ escribe, y las sondas lo delatan. */
  const roto = p301GsSinCandado();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré el candado para sabotearlo (si cambió de forma, este caso no mide nada)');
  if (!roto) return;
  const api2 = p301Api(['accionAusenciaGuardar'], roto);
  const r2 = p301J(api2.accionAusenciaGuardar(p301Aus(P301_HSEQ, { id: 'aus_hseq_1' })));
  PRUEBAS.igual(r2.ok, true, 'DISCRIMINADOR · sin la lista blanca, HSEQ SÍ escribe · es la fuga que este caso vigila');
  PRUEBAS.igual(p301N(api2, 'Bitácora'), 1, 'DISCRIMINADOR · y deja su línea en la bitácora');
  PRUEBAS.igual(p301J(api2.accionAusenciaGuardar(p301Aus(P301_HSEQ, { id: 'no-existe-p301', anular: '1' }))).anulada, false,
    'DISCRIMINADOR · y la sonda del id inexistente contesta `anulada:false`, no `sin_permiso`');
  PRUEBAS.igual(p301J(api2.accionAusenciaGuardar(p301Aus(P301_HSEQ, { id: 'aus_hseq_3', motivo: 'x' }))).motivo, 'motivo_invalido',
    'DISCRIMINADOR · y la del motivo inválido, `motivo_invalido`');
});

PRUEBAS.caso('🔒 P301 · una vista que no es supervisor ni servicio médico tampoco escribe (la de Dirección de P306, u otra futura)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* ⚠️ Hoy NINGÚN escritor produce una vista así: la crea P306. Por eso la sesión se siembra con
     `sesEmitir`, el escritor real de `Sesiones` (no una fila a mano), y se entra por la acción real:
     `validarAcceso` → `sesResolver` devuelve la `Vista` guardada TAL CUAL, así que una cadena nueva
     llega hasta acá sin que nada la frene. Con una lista NEGRA (`acc.vista === "hseq"`, como la
     lectura) esta vista escribiría; con la blanca, no. */
  const api = p301Api(['accionAusenciaGuardar', 'sesEmitir']);
  ['direccion', 'empleado_jefe', ''].forEach(vista => {
    const disp = 'disp-' + (vista || 'vacia');
    const tok = api.sesEmitir('helitec', disp, { rol: 'supervisor', vista: vista || 'x', empresas: ['Consorcio HELITEC'], canonical: 'Consorcio HELITEC' });
    PRUEBAS.cierto(/^sst_/.test(tok), 'guarda: la sesión de la vista «' + (vista || 'x') + '» existe');
    const r = p301J(api.accionAusenciaGuardar(p301Aus({ usuario: 'helitec', empresa: 'helitec', pass: tok, dispositivoId: disp }, { id: 'aus_' + disp })));
    PRUEBAS.igual(r.motivo, 'sin_permiso', '🔒 la vista «' + (vista || 'x') + '» recibe `sin_permiso` · llegó ' + JSON.stringify(r.motivo || r.error || r.ok));
  });
  PRUEBAS.igual(p301N(api, 'Ausencias'), 0, '🔒 y no quedó ninguna fila');
  PRUEBAS.igual(p301N(api, 'Bitácora'), 0, '🔒 ni línea de bitácora');
  /* ⚠️ «ANTES DE TOCAR NINGUNA HOJA» se mide así, no contando filas: `p301N` da 0 tanto si la hoja no
     existe como si quedó creada y vacía. El libro arranca SIN `Ausencias` ni `Bitácora` a propósito
     (ver `p301Hojas`): si el candado corriera después del constructor, el rechazo igual dejaría la hoja
     creada y formateada en el CH. Lo encontró el verificador de P301 moviendo el candado. */
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Ausencias'), null, '🔒 la hoja `Ausencias` ni siquiera se creó: el candado va antes del constructor');
  PRUEBAS.igual(api.__env.__libro.getSheetByName('Bitácora'), null, '🔒 ni la `Bitácora`');
  /* y lo mismo con la contraseña de Dirección, sobre un libro nuevo */
  const apiH = p301Api(['accionAusenciaGuardar']);
  PRUEBAS.igual(p301J(apiH.accionAusenciaGuardar(p301Aus(P301_HSEQ))).motivo, 'sin_permiso', 'guarda: HSEQ rechazada en un libro sin `Ausencias`');
  PRUEBAS.igual(apiH.__env.__libro.getSheetByName('Ausencias'), null, '🔒 y tampoco le crea la hoja');

  /* DISCRIMINADOR del verificador · la lista blanca DEBAJO del constructor: sigue diciendo
     `sin_permiso`, pero la hoja ya quedó creada. */
  const tarde = p301GsCandadoTarde();
  PRUEBAS.cierto(!!tarde, 'DISCRIMINADOR · pude mover el candado debajo del constructor');
  if (tarde) {
    const apiT = p301Api(['accionAusenciaGuardar'], tarde);
    PRUEBAS.igual(p301J(apiT.accionAusenciaGuardar(p301Aus(P301_HSEQ))).motivo, 'sin_permiso', 'DISCRIMINADOR · guarda: con el candado tarde igual contesta `sin_permiso`');
    PRUEBAS.cierto(apiT.__env.__libro.getSheetByName('Ausencias') !== null,
      'DISCRIMINADOR · y la hoja SÍ queda creada: el aserto de arriba es el que lo ve, contar filas no lo veía');
  }

  const roto = p301GsSinCandado();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré el candado para sabotearlo');
  if (!roto) return;
  const api2 = p301Api(['accionAusenciaGuardar', 'sesEmitir'], roto);
  const tok2 = api2.sesEmitir('helitec', 'disp-d', { rol: 'supervisor', vista: 'direccion', empresas: ['Consorcio HELITEC'], canonical: 'Consorcio HELITEC' });
  PRUEBAS.igual(p301J(api2.accionAusenciaGuardar(p301Aus({ usuario: 'helitec', empresa: 'helitec', pass: tok2, dispositivoId: 'disp-d' }))).ok, true,
    'DISCRIMINADOR · sin la lista blanca, la vista futura SÍ escribe · una lista negra la habría dejado abierta');
});

PRUEBAS.caso('🔒 P301 · el visor del administrador sigue sin escribir, mire con la vista que mire', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const api = p301Api(['accionAusenciaGuardar']);
  ['supervisor', 'medico', 'hseq'].forEach(v => {
    const r = p301J(api.accionAusenciaGuardar(p301Aus({ usuario: '*', pass: P301_ADMIN, verEmpresa: 'helitec', verVista: v, empresa: 'Consorcio HELITEC' })));
    PRUEBAS.igual(r.motivo, 'solo_lectura',
      '🔒 visor · ' + v + ' · `solo_lectura`, su propia respuesta (ADR 007: el visor mira, no escribe), antes que la lista blanca · llegó ' + JSON.stringify(r.motivo || r.error));
  });
  PRUEBAS.igual(p301N(api, 'Ausencias'), 0, '🔒 sin filas');
  PRUEBAS.igual(p301N(api, 'Bitácora'), 0, '🔒 sin bitácora');

  /* DISCRIMINADOR · sin el freno del visor EN ESTA ACCIÓN, el visor «supervisor» escribe: lo que lo
     para es `soloLectura`, no la lista blanca (que deja pasar supervisor). */
  const roto = p301GsVisorQueEscribe();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré el freno del visor de esta acción');
  if (!roto) return;
  const api2 = p301Api(['accionAusenciaGuardar'], roto);
  const r2 = p301J(api2.accionAusenciaGuardar(p301Aus({ usuario: '*', pass: P301_ADMIN, verEmpresa: 'helitec', verVista: 'supervisor', empresa: 'Consorcio HELITEC' })));
  PRUEBAS.igual(r2.ok, true, 'DISCRIMINADOR · sin `soloLectura`, el visor escribiría · ' + JSON.stringify(r2.motivo || r2.error || ''));
});

PRUEBAS.caso('✅ P301 · supervisor, servicio médico, la combinada y el administrador SÍ escriben, con contraseña y con sesión recordada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* R19 · QUIÉN CONCEDE CADA DERECHO. `accionAusenciaGuardar` deja pasar `vista` "supervisor" o
     "medico", y esa vista la pone `validarAcceso`: la contraseña de supervisor con médica separada da
     `vista:"supervisor"`; la médica, `vista:"medico"`; la combinada, `vista:"medico"` con
     `combinada:true` (su única clave); el administrador `*`, `{rol:"admin", vista:"medico"}`. Con
     sesión, `sesResolver` devuelve la vista con la que `sesEmitir` la guardó: la misma. Se afirma
     PRIMERO lo que tiene que seguir andando, y recién después lo que se rechaza (arriba). */
  const quienes = [
    ['supervisor (contraseña de supervisor)', P301_SUP,  'Ana Suárez',  'V-11111'],
    ['servicio médico (contraseña médica)',   P301_MED,  'Ana Suárez',  'V-11111'],
    ['la combinada (su única clave)',         P301_COMB, 'Pedro Gómez', 'V-33333'],
    ['el administrador',                      P301_ADM,  'Ana Suárez',  'V-11111']
  ];
  quienes.forEach(([nombre, cred, persona, ced]) => {
    const api = p301Api(['accionAusenciaGuardar', 'accionSesionCrear']);
    const r = p301J(api.accionAusenciaGuardar(p301Aus(cred, { persona: persona, cedula: ced, id: 'aus_' + ced })));
    PRUEBAS.igual(r.ok, true, '✅ ' + nombre + ' · marca · ' + (r.error || r.motivo || ''));
    PRUEBAS.igual(p301N(api, 'Ausencias'), 1, '  y la fila quedó');
    PRUEBAS.igual(p301N(api, 'Bitácora'), 1, '  con su línea de bitácora');
    const a = p301J(api.accionAusenciaGuardar(p301Aus(cred, { persona: persona, cedula: ced, id: 'aus_' + ced, anular: '1' })));
    PRUEBAS.igual(a.anulada, true, '✅ ' + nombre + ' · anula · ' + (a.error || a.motivo || ''));
    /* Y por la sesión recordada, que es como entra quien tocó «Sí, recordar» (el administrador la
       recibe por `recordar:'1'` en `accionSupervisor`; acá alcanza con el emisor común). */
    const ses = p301J(api.accionSesionCrear(Object.assign({ dispositivoId: 'disp-ses' }, cred)));
    PRUEBAS.cierto(ses.ok && /^sst_/.test(ses.sesion || ''), '  guarda: hay sesión recordada · ' + (ses.error || ''));
    const s = p301J(api.accionAusenciaGuardar(p301Aus(Object.assign({}, cred, { pass: ses.sesion, dispositivoId: 'disp-ses' }),
      { persona: persona, cedula: ced, id: 'aus_' + ced + '_ses' })));
    PRUEBAS.igual(s.ok, true, '✅ ' + nombre + ' · con sesión recordada también · ' + (s.error || s.motivo || ''));
  });
});

PRUEBAS.caso('✍ P301 · el autor de la línea es la cuenta que autenticó, y el nombre del perfil queda como declarado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const api = p301Api(['accionAusenciaGuardar', 'accionSesionCrear', 'accionBitacora']);
  const lineas = () => p301Datos(api, 'Bitácora').map(f => ({ actor: String(f[4]), accion: String(f[2]), ev: JSON.parse(String(f[12] || '{}')) }));

  p301J(api.accionAusenciaGuardar(p301Aus(P301_SUP, { quien: 'Marta Supervisora' })));
  p301J(api.accionAusenciaGuardar(p301Aus(P301_SUP, { anular: '1', quien: 'Pedro Supervisor' })));
  /* Un teléfono que declara ser OTRA cuenta no cambia el autor: el autor no sale del POST. */
  p301J(api.accionAusenciaGuardar(p301Aus(P301_SUP, { id: 'aus_otro', quien: 'silva' })));
  const ses = p301J(api.accionSesionCrear({ usuario: 'helitec', pass: 'sup-301', dispositivoId: 'disp-ses' }));
  p301J(api.accionAusenciaGuardar(p301Aus({ usuario: 'helitec', empresa: 'helitec', pass: ses.sesion, dispositivoId: 'disp-ses' },
    { id: 'aus_ses', quien: 'Luis Por Sesion' })));
  p301J(api.accionAusenciaGuardar(p301Aus(P301_ADM, { id: 'aus_adm', quien: '' })));

  const L = lineas();
  PRUEBAS.igual(L.length, 5, 'guarda: cinco hechos, cinco líneas');
  PRUEBAS.igual(L.map(l => l.actor), ['helitec', 'helitec', 'helitec', 'helitec', '*'],
    '✍ el `actor` es SIEMPRE la cuenta que autenticó (`p.usuario || p.empresa`, como `accionCicloCerrar`) · con contraseña, con sesión, y aunque el teléfono declare otra cuenta');
  PRUEBAS.igual(L.map(l => (l.ev.detalle || {}).quien), ['Marta Supervisora', 'Pedro Supervisor', 'silva', 'Luis Por Sesion', ''],
    '✍ y el nombre que mandó el teléfono queda como DECLARADO en `detalle.quien` · la cuenta es de la empresa, y ese nombre es el único dato de qué persona tocó');
  PRUEBAS.igual(L.map(l => l.accion), ['ausencia_marcada', 'ausencia_anulada', 'ausencia_marcada', 'ausencia_marcada', 'ausencia_marcada'], 'guarda: las acciones');
  const fila = p301Datos(api, 'Ausencias').find(f => String(f[0]) === 'aus_11111_' + P301_HOY);
  PRUEBAS.igual(String(fila[9]), 'Marta Supervisora', '✍ `MarcadaPor` no cambió: sigue siendo el nombre declarado');
  PRUEBAS.igual(String(fila[11]), 'Pedro Supervisor', '✍ ni `AnuladaPor`');

  /* A Dirección no le llega ni el autor ni el nombre: `bitacoraParaHseq_` no manda `actor` ni `detalle`. */
  const dir = p301J(api.accionBitacora({ usuario: 'helitec', empresa: 'helitec', pass: 'dir-301', dispositivoId: 'disp-dir' }));
  PRUEBAS.igual(dir.ok, true, 'guarda: Dirección lee su bitácora · ' + (dir.error || ''));
  PRUEBAS.alMenos((dir.eventos || []).length, 1, 'guarda: y hay eventos que mirar');
  const txt = JSON.stringify(dir);
  ['Marta Supervisora', 'Pedro Supervisor', 'Luis Por Sesion', 'Ana Suárez', '"actor"', '"detalle"'].forEach(x =>
    PRUEBAS.igual(txt.indexOf(x), -1, '🔒 a Dirección no le llega ' + x));

  /* DISCRIMINADOR · con el autor de antes (`p.quien`), la columna dice lo que mande el teléfono. */
  const roto = p301GsActorViejo();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré la línea del actor');
  if (!roto) return;
  const api2 = p301Api(['accionAusenciaGuardar'], roto);
  p301J(api2.accionAusenciaGuardar(p301Aus(P301_SUP, { quien: 'silva' })));
  PRUEBAS.igual(String(p301Datos(api2, 'Bitácora')[0][4]), 'silva',
    'DISCRIMINADOR · con el actor de antes, un teléfono de HELITEC firma como «silva»: la bitácora decía lo que le mandaran');
});

PRUEBAS.caso('✍ P301 · con el token del administrador el autor es `*`, aunque el POST mande un «usuario» de pura puntuación', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* R19 · el derecho a escribir lo concede `validarAcceso` por su rama de token: la sesión del `*`
     (emitida con la contraseña de administrador por `accionSesionCrear`). Esa rama compara
     `norm(ses.usuario) === norm(key)`, y `norm` deja «*», « » y «-» en "": por eso el token entra con
     esos `usuario`. Lo que se afirma acá es QUIÉN queda escrito: el usuario de la sesión. */
  const api = p301Api(['accionAusenciaGuardar', 'accionSesionCrear']);
  const ses = p301J(api.accionSesionCrear({ usuario: '*', pass: P301_ADMIN, dispositivoId: 'disp-adm' }));
  PRUEBAS.cierto(ses.ok && /^sst_/.test(ses.sesion || ''), 'guarda: el administrador tiene su sesión recordada · ' + (ses.error || ''));
  [' ', '-', '*'].forEach((u, k) => {
    const r = p301J(api.accionAusenciaGuardar(p301Aus({ usuario: u, empresa: 'Consorcio HELITEC', pass: ses.sesion, dispositivoId: 'disp-adm' },
      { id: 'aus_adm_' + k, quien: '' })));
    PRUEBAS.igual(r.ok, true, 'guarda: con `usuario:' + JSON.stringify(u) + '` el token entra (es la rama de token de `validarAcceso`)');
  });
  PRUEBAS.igual(p301Datos(api, 'Bitácora').map(f => String(f[4])), ['*', '*', '*'],
    '✍ las tres líneas firmadas por `*`, la cuenta de la sesión · antes, con «usuario» « », la línea decía «sistema» (el respaldo de `bitacoraServidor`) y con «-», «-»: un acto del administrador disfrazado de automático en un registro append-only (R3)');

  const roto = p301GsActorDelPost();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré la línea del actor');
  if (!roto) return;
  const api2 = p301Api(['accionAusenciaGuardar', 'accionSesionCrear'], roto);
  const ses2 = p301J(api2.accionSesionCrear({ usuario: '*', pass: P301_ADMIN, dispositivoId: 'disp-adm' }));
  [' ', '-'].forEach((u, k) => api2.accionAusenciaGuardar(p301Aus({ usuario: u, empresa: 'Consorcio HELITEC', pass: ses2.sesion, dispositivoId: 'disp-adm' }, { id: 'aus_adm_' + k, quien: '' })));
  PRUEBAS.igual(p301Datos(api2, 'Bitácora').map(f => String(f[4])), ['sistema', '-'],
    'DISCRIMINADOR · con el actor tomado del POST, las líneas dicen «sistema» y «-»');
});

PRUEBAS.caso('🔒 P301 · «Supervisor si no sabe»: la sesión de una combinada sin pestaña abre Supervisor, y nada más cambia', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* Decisión de Franco (2026-10-14). R19 · lo concede `accionSupervisor`: en una cuenta combinada
     (`validarAcceso` → `combinada:true`), con una pestaña válida aplica `pedida`; SIN pestaña válida,
     Supervisor, con sesión (`acc.porSesion`, que pone `sesResolver`) y también con contraseña (S2 de la
     verificación de P301). La app vieja (≤ 7.48) es la que entra así: su auto-login no manda `pedida`. Se entra por `accionSupervisor` con tokens emitidos por
     `accionSesionCrear`, el escritor real. */
  const api = p301Api(['accionSupervisor', 'accionSesionCrear', 'accionAusenciaGuardar']);
  const tok = (usuario, pass, disp) => p301J(api.accionSesionCrear({ usuario: usuario, pass: pass, dispositivoId: disp })).sesion;
  const tC = tok('silva', 'sil-301', 'dC'), tM = tok('helitec', 'med-301', 'dM'), tA = tok('*', P301_ADMIN, 'dA');
  PRUEBAS.cierto([tC, tM, tA].every(x => /^sst_/.test(x || '')), 'guarda: las tres sesiones existen');
  const panel = extra => p301J(api.accionSupervisor(Object.assign({ usuario: 'silva', empresa: 'silva', pass: tC, dispositivoId: 'dC' }, extra || {})));

  const vieja = panel();   // el pedido de la app vieja: sin `pedida`
  PRUEBAS.igual(vieja.vista, 'supervisor', '🔒 la sesión de la combinada SIN `pedida` abre Supervisor');
  PRUEBAS.igual(JSON.stringify(vieja.comentarios || []), '[]', '🔒 sin comentarios clínicos');
  PRUEBAS.falso(p301ConPuntajes(vieja), '🔒 y sin puntajes: una fila por persona, sin valores de tests');
  PRUEBAS.igual((vieja.pvt || []).length, 0, '🔒 ni PVT');
  PRUEBAS.igual(panel({ pedida: '' }).vista, 'supervisor', '🔒 con `pedida` vacía tampoco sabe: Supervisor');

  const med = panel({ pedida: 'medico' });   // la app nueva desde la ranura médica
  PRUEBAS.igual(med.vista, 'medico', '✅ con `pedida:"medico"` sigue abriendo Servicio médico');
  PRUEBAS.cierto(p301Comentarios(med).indexOf('duerme mal') >= 0 && p301ConPuntajes(med), '✅ con sus comentarios y sus puntajes');
  PRUEBAS.igual(panel({ pedida: 'supervisor' }).vista, 'supervisor', '✅ y con `pedida:"supervisor"`, Supervisor');

  /* S2 (tercera vuelta) · CON CONTRASEÑA tampoco sabe: así entraba Dirección (`pedida:""`). */
  const conClave = extra => p301J(api.accionSupervisor(Object.assign({ usuario: 'silva', empresa: 'silva', pass: 'sil-301', dispositivoId: 'dX' }, extra || {})));
  ['(sin pedida)', ''].forEach(ped => {
    const r = conClave(ped === '(sin pedida)' ? {} : { pedida: ped });
    PRUEBAS.igual(r.vista, 'supervisor', '🔒 con CONTRASEÑA y `pedida` ' + JSON.stringify(ped) + ' la combinada abre Supervisor (antes, Servicio médico)');
    PRUEBAS.falso(p301ConPuntajes(r) || p301Comentarios(r).indexOf('duerme mal') >= 0, '🔒 sin comentarios ni puntajes');
  });
  /* Lo que NO cambia: el login por cada pestaña, las cuentas no combinadas, el administrador, el visor
     y la demo. R19: con pestaña válida la aplica `accionSupervisor`; sin combinada, la vista es la de la
     contraseña (`validarAcceso`). */
  PRUEBAS.igual(conClave({ pedida: 'supervisor' }).vista, 'supervisor', '✅ login de la combinada por la pestaña Supervisor: Supervisor');
  const medClave = conClave({ pedida: 'medico' });
  PRUEBAS.cierto(medClave.vista === 'medico' && p301ConPuntajes(medClave), '✅ y por la pestaña Servicio médico: Servicio médico, con sus puntajes (el médico de una combinada con la app nueva)');
  [['sup-301', 'supervisor', 'supervisor'], ['med-301', 'medico', 'medico'], ['dir-301', '', 'hseq'], ['med-301', undefined, 'medico']].forEach(([pass, ped, vista]) => {
    const pp = { usuario: 'helitec', empresa: 'helitec', pass: pass, dispositivoId: 'dH' };
    if (ped !== undefined) pp.pedida = ped;
    PRUEBAS.igual(p301J(api.accionSupervisor(pp)).vista, vista,
      '✅ HELITEC (no combinada), contraseña de ' + vista + (ped === undefined ? ' sin `pedida`' : ' por su pestaña') + ': ' + vista);
  });
  PRUEBAS.igual(p301J(api.accionSupervisor({ usuario: 'helitec', empresa: 'helitec', pass: tM, dispositivoId: 'dM' })).vista, 'medico',
    '✅ una cuenta NO combinada sigue con la vista de su contraseña (la médica de HELITEC abre médico sin `pedida`)');
  PRUEBAS.igual(p301J(api.accionSupervisor({ usuario: '*', pass: P301_ADMIN, dispositivoId: 'dA2' })).vista, 'medico', '✅ el administrador con su contraseña, como siempre');
  const apiDemo = p301Api(['accionDemo']), apiDemoAntes = p301Api(['accionDemo'], p301GsSoloConSesion() || CTX.gs);
  const demo = p301J(apiDemo.accionDemo({ action: 'demo', dispositivoId: 'dD' })), demoAntes = p301J(apiDemoAntes.accionDemo({ action: 'demo', dispositivoId: 'dD' }));
  PRUEBAS.igual([demo.ok, demo.vista, Object.keys(demo).sort().join(',')], [demoAntes.ok, demoAntes.vista, Object.keys(demoAntes).sort().join(',')],
    '✅ la demostración (`accionDemo`) contesta lo mismo que antes de la tercera vuelta');
  const adm = p301J(api.accionSupervisor({ usuario: '*', pass: tA, dispositivoId: 'dA' }));
  PRUEBAS.igual([adm.rol, adm.vista], ['admin', 'medico'], '✅ el administrador entra como siempre');
  PRUEBAS.igual(p301J(api.accionSupervisor({ usuario: '*', pass: tA, dispositivoId: 'dA', verEmpresa: 'silva', verVista: 'medico' })).vista, 'medico',
    '✅ y el visor mira con la vista que eligió, aunque la cuenta mirada sea combinada');
  /* La fila de `Sesiones` no cambia, y fuera de `accionSupervisor` la combinada sigue siendo médica. */
  const fila = api.__env.__libro.getSheetByName('Sesiones').getDataRange().getValues().find(f => String(f[3]) === 'dC');
  PRUEBAS.igual([String(fila[5]), String(fila[8])], ['medico', '1'], '✅ la sesión guardada sigue diciendo `medico`, combinada');
  p301J(api.accionAusenciaGuardar(p301Aus({ usuario: 'silva', empresa: 'silva', pass: tC, dispositivoId: 'dC' }, { id: 'aus_c', cedula: 'V-33333', persona: 'Pedro Gómez' })));
  PRUEBAS.igual(String(p301Datos(api, 'Bitácora')[0][5]), 'medico', '✅ y fuera de `accionSupervisor` el servidor la sigue viendo médica (la línea de la ausencia firma con rol `medico`)');

  /* DISCRIMINADOR · sin la regla, el pedido de la app vieja abre Servicio médico con todo. */
  const roto = p301GsSinSupervisorPorDefecto();
  PRUEBAS.cierto(!!roto, 'DISCRIMINADOR · encontré la regla');
  if (!roto) return;
  const api2 = p301Api(['accionSupervisor', 'accionSesionCrear'], roto);
  const t2 = p301J(api2.accionSesionCrear({ usuario: 'silva', pass: 'sil-301', dispositivoId: 'dC' })).sesion;
  const r2 = p301J(api2.accionSupervisor({ usuario: 'silva', empresa: 'silva', pass: t2, dispositivoId: 'dC' }));
  PRUEBAS.igual(r2.vista, 'medico', 'DISCRIMINADOR · sin la regla, la sesión sin `pedida` abre Servicio médico');
  PRUEBAS.cierto(p301Comentarios(r2).indexOf('duerme mal') >= 0 && p301ConPuntajes(r2), 'DISCRIMINADOR · con comentarios y puntajes');
  /* DISCRIMINADOR de S2 · con la regla de la segunda vuelta (sólo sesiones), la CONTRASEÑA sin pestaña
     vuelve a abrir Servicio médico. */
  const soloSes = p301GsSoloConSesion();
  PRUEBAS.cierto(!!soloSes, 'DISCRIMINADOR · pude volver la regla a «sólo sesiones»');
  if (soloSes) {
    const r3 = p301J(p301Api(['accionSupervisor'], soloSes).accionSupervisor({ usuario: 'silva', empresa: 'silva', pass: 'sil-301', dispositivoId: 'dX', pedida: '' }));
    PRUEBAS.igual(r3.vista, 'medico', 'DISCRIMINADOR · con la regla sólo para sesiones, la contraseña con `pedida:""` abría Servicio médico');
  }
});

PRUEBAS.caso('📏 P301 · la medición del «-» trae su control positivo, y el control discrimina', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* La tarea `medir_appendrow_guion` corre en Sheets de verdad; acá se corre en el emulador, que modela
     `=` y `+` por `appendRow` (P164) y NO el «-» (medido en Sheets real: no se convierte; decisión de
     P301). O sea: en el emulador los controles TIENEN que salir convertidos y los hashes no. Si los
     controles no se convierten, la medición no distingue, y la tarea lo tiene que decir. */
  const tok = (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
  PRUEBAS.cierto(!!tok, 'guarda: la tarea de mantenimiento tiene su llave');
  const correr = () => {
    const api = p301Api(['accionMantenimiento']);
    return p301J(api.accionMantenimiento({ action: 'mantenimiento', tarea: 'medir_appendrow_guion', token: tok, _post: true }));
  };
  const r = correr();
  PRUEBAS.igual(r.ok, true, 'la tarea corre · ' + (r.error || ''));
  const ctl = (r.r && r.r.controles) || [];
  PRUEBAS.igual(ctl.map(c => c.control), ['+58 412 0000000', '=1+1'], 'trae los dos controles, en la misma columna que los hashes');
  ctl.forEach(c => {
    PRUEBAS.igual(c.appendRow.convertido, true, '📏 «' + c.control + '» por `appendRow` se CONVIERTE · ' + JSON.stringify(c.appendRow));
    /* ⚠️ Por `filaAgregar_` (`setValues` sobre un rango `@`) NO se afirma el resultado: el emulador nunca
       convierte por `setValues`, y si Sheets convierte un «=» por ese camino no está medido. Lo dirá la
       corrida de la tarea en producción; acá sólo se exige que la tarea lo INFORME. */
    PRUEBAS.igual(typeof c.filaAgregar.convertido, 'boolean', '📏 y por `filaAgregar_` también dice si se convirtió');
  });
  PRUEBAS.igual(r.r && r.r.discrimina, true, '📏 `discrimina` es true: el instrumento ve una conversión cuando la hay');
  PRUEBAS.alMenos(((r.r && r.r.casos) || []).filter(c => c.empiezaConGuion).length, 1, 'guarda: hay hashes con «-»');
  ((r.r && r.r.casos) || []).forEach(c => PRUEBAS.cierto(c.appendRow.convertido === false,
    'cada hash tiene su `convertido` (en el emulador, false: no modela el «-») · ' + c.inicio));

  /* DISCRIMINADOR · con un `appendRow` que no convierte nada, los controles no se convierten y la
     tarea tiene que decir que la medición NO distingue. */
  const orig = GS.HojaFalsa.prototype.appendRow;
  try {
    GS.HojaFalsa.prototype.appendRow = function (fila) { this._datos.push(fila.slice()); return this; };
    const r2 = correr();
    PRUEBAS.igual(r2.r && r2.r.discrimina, false, 'DISCRIMINADOR · si `appendRow` no convierte ni el control, `discrimina` es false');
    PRUEBAS.cierto(/no distingue/.test(String(r2.r && r2.r.lectura)), 'DISCRIMINADOR · y la lectura lo dice con palabras');
  } finally { GS.HojaFalsa.prototype.appendRow = orig; }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   F021 · EL CLIENTE, POR EL CAMINO ENTERO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
PRUEBAS.grupo('P301 · F021 · la sesión recordada abre el panel de la pestaña por la que se entró');

/* Desvía los pedidos de la app al `.gs` real en el emulador: lo que va a `SHEETS_DASHBOARD_URL` entra
   por `doPost`/`doGet`, como en Apps Script; cualquier otro webhook queda cortado (nunca resuelve),
   como el candado de red. Registra pedidos y respuestas: lo que importa es lo que LLEGÓ al teléfono. */
function p301Banco() {
  let api = p301Api(['doPost', 'doGet']);
  const env = api.__env;
  const reg = { pedidos: [], respuestas: [] };
  const responder = (u, opts) => {
    if (String(u).indexOf(SHEETS_DASHBOARD_URL) !== 0) return new Promise(() => {});
    let salida;
    if (opts && String(opts.method || '').toUpperCase() === 'POST') {
      let cuerpo = {}; try { cuerpo = JSON.parse(String(opts.body || '{}')); } catch (e) {}
      reg.pedidos.push(cuerpo);
      salida = api.doPost({ postData: { contents: String(opts.body || '') }, parameter: {} });
    } else {
      const q = {}; new URL(String(u)).searchParams.forEach((v, k) => { q[k] = v; });
      reg.pedidos.push(q);
      salida = api.doGet({ parameter: q });
    }
    const txt = salida.getContent();
    let obj = null; try { obj = JSON.parse(txt); } catch (e) {}
    reg.respuestas.push(obj);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(txt)), text: () => Promise.resolve(txt) });
  };
  const prev = { fetchConReloj: window.fetchConReloj, fetch: window.fetch, showToast: window.showToast };
  window.fetchConReloj = (u, o) => responder(u && u.url ? u.url : u, o);
  window.fetch = (u, o) => {
    const url = String(u && u.url ? u.url : u);
    if (url.indexOf(SHEETS_DASHBOARD_URL) === 0) return responder(url, o);
    return prev.fetch.apply(window, arguments);
  };
  window.showToast = () => {};
  return {
    reg: reg,
    /* otro `.gs` sobre el MISMO libro (con `Sesiones` adentro), como hace P303 al pasar de versión */
    cargar(fuente) { api = GS.cargarGs(fuente, env, ['doPost', 'doGet']); api.__env = env; },
    restaurar() { window.fetchConReloj = prev.fetchConReloj; window.fetch = prev.fetch; window.showToast = prev.showToast; },
    /* el último pedido `action=supervisor` y su respuesta */
    ultimoPanel() {
      for (let i = reg.pedidos.length - 1; i >= 0; i--)
        if (reg.pedidos[i].action === 'supervisor') return { pedido: reg.pedidos[i], resp: reg.respuestas[i] || {} };
      return { pedido: {}, resp: {} };
    }
  };
}
/* El estado de partida de cada caso de cliente. ⚠️ `DASH = null` NO ES OPCIONAL: `CTX.resetear()` no lo
   toca, y en la corrida completa otro caso lo deja puesto. La primera versión esperaba «entró» con
   `DASH && DASH.vista`, que se cumplía AL INSTANTE con el panel ajeno: «recordar» salía antes de que
   terminara el login de verdad, no guardaba nada, y el caso se colgaba a los 10 s contaminando al
   siguiente. Aislado pasaba; en la corrida completa, no (R18). */
function p301Partida(perfil) {
  try { closePortal(true); } catch (e) {}
  CTX.resetear(perfil);
  if (!perfil) localStorage.clear();      // quien usa SÓLO el panel: sin perfil de empleado
  DASH = null;
}
/* El panel que abrió ESTE pedido, no uno que quedó de antes: se reconoce por la credencial que viaja. */
const p301PanelDe = pred => () => !!(DASH && DASH.vista && DASH.params && pred(String(DASH.params.pass || '')));
/* Lo que el teléfono hace de verdad: abrir el login de empresa por la portada («Soy supervisor»), elegir
   la pestaña, escribir usuario y contraseña de PRUEBA, entrar, y tocar «Sí, recordar». */
async function p301EntrarYRecordar(pestana, usuario, pass, claveRanura) {
  DASH = null;
  splashPortal();
  portalMode(pestana);
  document.getElementById('pEmpresa').value = usuario;
  document.getElementById('pPass').value = pass;
  portalLoginSupervisor(document.querySelector('#portalSup .save-btn'));
  const entro = await PRUEBAS.esperarA(p301PanelDe(x => x === pass), CARGA_MIN_MS + 2500);
  const vista = entro ? DASH.vista : null;
  let recordo = false;
  if (entro) {
    dashSaveCreds(document.querySelector('#dashRemember .dr-yes'));
    recordo = await PRUEBAS.esperarA(() => { try { const c = JSON.parse(localStorage.getItem(claveRanura) || 'null'); return !!(c && c.token); } catch (e) { return false; } }, 2500);
  }
  document.getElementById('pPass').value = '';
  closePortal(true);
  return { entro: entro, vista: vista, recordo: recordo };
}
async function p301AutoLogin(abrir) {
  DASH = null;
  abrir();
  const listo = await PRUEBAS.esperarA(p301PanelDe(x => /^sst_/.test(x)), 2500);
  return { listo: listo, vista: listo ? DASH.vista : null };
}
const p301Comentarios = resp => JSON.stringify((resp && resp.comentarios) || []);

PRUEBAS.caso('🔒 F021 · la combinada que entró por Supervisor y tocó «recordar» vuelve a Supervisor (sin perfil, por el arranque)', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  const prevReq = window.dashRequest;
  try {
    p301Partida();
    const e = await p301EntrarYRecordar('sup', 'silva', 'sil-301', K_DASH_CREDS);
    PRUEBAS.cierto(e.entro, 'guarda: entró con la contraseña');
    PRUEBAS.igual(e.vista, 'supervisor', 'guarda: por la pestaña Supervisor el login abre Supervisor (pedida del login con contraseña)');
    PRUEBAS.cierto(e.recordo, 'guarda: «Sí, recordar» guardó el token en la ranura de SUPERVISOR (`rolCredClave(DASH.vista)`)');
    if (!e.recordo) return;               // sin sesión recordada, lo de abajo no mide nada
    PRUEBAS.igual(localStorage.getItem(K_DASH_CREDS_MED), null, 'guarda: y la ranura médica está vacía');
    PRUEBAS.cierto(portalTieneSesionDeEmpresa(), 'guarda: el arranque ve la sesión (es la condición de `portalAbrirDirecto`)');

    /* R19 · el derecho a abrir Supervisor lo conceden DOS funciones juntas: `portalPedidaDeRanura`
       (cliente: ranura de supervisor → `pedida:'supervisor'`) y `accionSupervisor` (servidor: en una
       combinada, `acc.vista = p.pedida`). La sesión guardada dice `medico`: sin las dos, abre médico. */
    const a = await p301AutoLogin(portalAbrirDirecto);
    const u = b.ultimoPanel();
    PRUEBAS.cierto(/^sst_/.test(String(u.pedido.pass || '')), 'guarda: el auto-login entró con el TOKEN, no con la contraseña');
    PRUEBAS.igual(u.pedido.pedida, 'supervisor', '🔒 el auto-login manda `pedida:"supervisor"`: sale de la ranura, como `PORTAL_VISTA` en el login');
    PRUEBAS.igual(u.resp.vista, 'supervisor', '🔒 y el servidor contesta la vista de Supervisor');
    PRUEBAS.igual(a.vista, 'supervisor', '🔒 F021 · abre SUPERVISOR, la pestaña por la que entró');
    PRUEBAS.igual(p301Comentarios(u.resp).indexOf('duerme mal'), -1,
      '🔒 y al teléfono NO le llegó ningún comentario clínico · la promesa no es «no se muestra», es «no viaja»');

    /* LA APP VIEJA · la misma sesión y el mismo teléfono, con el pedido de la 7.48 (su auto-login no
       mandaba `pedida`: es el que sale en la primera apertura después de publicar, mientras el service
       worker sirve la copia vieja). Con «Supervisor si no sabe» (`accionSupervisor`, decisión de
       Franco) también le llega Supervisor, sin comentarios ni puntajes. */
    closePortal(true);
    window.dashRequest = p => { const q = Object.assign({}, p); delete q.pedida; return prevReq(q); };
    const d = await p301AutoLogin(portalAbrirDirecto);
    const u2 = b.ultimoPanel();
    PRUEBAS.igual(u2.pedido.pedida, undefined, 'guarda: el pedido salió sin `pedida`, como el de la 7.48');
    PRUEBAS.igual(d.vista, 'supervisor', '🔒 la app vieja, sin `pedida`, TAMBIÉN abre Supervisor');
    PRUEBAS.igual(p301Comentarios(u2.resp).indexOf('duerme mal'), -1, '🔒 sin comentarios clínicos');
    PRUEBAS.falso(p301ConPuntajes(u2.resp), '🔒 y sin puntajes');

    /* DISCRIMINADOR · el mismo pedido viejo contra el `.gs` SIN «Supervisor si no sabe», sobre el
       mismo libro: abre Servicio médico y le llega el comentario. Es F021 en la primera apertura. */
    const sinRegla = p301GsSinSupervisorPorDefecto();
    PRUEBAS.cierto(!!sinRegla, 'DISCRIMINADOR · encontré la regla');
    if (sinRegla) {
      closePortal(true);
      b.cargar(sinRegla);
      const d2 = await p301AutoLogin(portalAbrirDirecto);
      const u3 = b.ultimoPanel();
      PRUEBAS.igual(d2.vista, 'medico', 'DISCRIMINADOR · sin la regla, la app vieja abre SERVICIO MÉDICO: F021');
      PRUEBAS.cierto(p301Comentarios(u3.resp).indexOf('duerme mal') >= 0 && p301ConPuntajes(u3.resp), 'DISCRIMINADOR · con comentarios y puntajes');
    }
  } finally {
    window.dashRequest = prevReq;
    try { closePortal(true); } catch (e) {}
    b.restaurar();
    try { localStorage.clear(); } catch (e) {}
  }
  await p301SinCredenciales();   // 🧹 R18 · S1
});

PRUEBAS.caso('✅ F021 · la combinada que entró por Servicio médico y tocó «recordar» vuelve a Servicio médico', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  const prevReq = window.dashRequest;
  try {
    p301Partida();
    const e = await p301EntrarYRecordar('med', 'silva', 'sil-301', K_DASH_CREDS_MED);
    PRUEBAS.igual(e.vista, 'medico', 'guarda: por la pestaña Servicio médico el login abre Servicio médico');
    PRUEBAS.cierto(e.recordo, 'guarda: el token quedó en la ranura MÉDICA');
    if (!e.recordo) return;
    PRUEBAS.igual(localStorage.getItem(K_DASH_CREDS), null, 'guarda: y la de supervisor, vacía');
    /* R19 · `portalPedidaDeRanura` (ranura médica → 'medico') y `accionSupervisor` (combinada → la vista
       pedida). Lo que se afirma es que el arreglo NO le saca a nadie lo que tenía. */
    const a = await p301AutoLogin(portalAbrirDirecto);
    const u = b.ultimoPanel();
    PRUEBAS.igual(u.pedido.pedida, 'medico', '✅ manda `pedida:"medico"`');
    PRUEBAS.igual(a.vista, 'medico', '✅ abre Servicio médico, como antes');
    PRUEBAS.cierto(p301Comentarios(u.resp).indexOf('duerme mal') >= 0, '✅ con los comentarios, que son suyos');

    /* DISCRIMINADOR del arreglo de CLIENTE · sin `pedida` (el pedido de la 7.48) la ranura médica cae
       en Supervisor por «Supervisor si no sabe»: es `portalPedidaDeRanura` la que le devuelve Servicio
       médico. Es también el costo decidido: el médico de una combinada que todavía corre la app vieja
       ve Supervisor hasta que le llega la nueva. */
    closePortal(true);
    window.dashRequest = p => { const q = Object.assign({}, p); delete q.pedida; return prevReq(q); };
    const d = await p301AutoLogin(portalAbrirDirecto);
    PRUEBAS.igual(d.vista, 'supervisor', 'DISCRIMINADOR · sin `pedida`, la ranura médica de una combinada abre Supervisor');
  } finally {
    window.dashRequest = prevReq;
    try { closePortal(true); } catch (e) {}
    b.restaurar();
    try { localStorage.clear(); } catch (e) {}
  }
  await p301SinCredenciales();   // 🧹 R18 · S1
});

PRUEBAS.caso('🔒 F021 · con perfil «sólo supervisor» en la nómina: Estadísticas abre Supervisor, no Servicio médico', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  try {
    /* El caso literal de F021: la nómina dice que es SÓLO supervisor. El perfil es la precondición (lo
       escribe el servidor al registrarse); lo que se prueba entra por el camino real: el gate que abre
       `openPortal` con un solo panel, el login, «recordar» y la siguiente entrada por `openPortal`. */
    p301Partida({ empresa: 'Aeroambulancias Silva', rolesNomina: ['supervisor'], esSupervisor: true });
    PRUEBAS.igual(rolesConPanel(getProfile()), ['supervisor'], 'guarda: para la app, su único panel es Supervisor');
    document.getElementById('portalOverlay').classList.add('show');
    openPortal();                        // sin sesión: abre el gate en su única pestaña
    PRUEBAS.igual(PORTAL_VISTA, 'supervisor', 'guarda: el gate quedó en la pestaña Supervisor');
    document.getElementById('pEmpresa').value = 'silva';
    document.getElementById('pPass').value = 'sil-301';
    portalLoginSupervisor(document.querySelector('#portalSup .save-btn'));
    const entro = await PRUEBAS.esperarA(p301PanelDe(x => x === 'sil-301'), CARGA_MIN_MS + 2500);
    PRUEBAS.cierto(entro, 'guarda: entró');
    if (!entro) return;
    dashSaveCreds(document.querySelector('#dashRemember .dr-yes'));
    const recordo = await PRUEBAS.esperarA(() => !!(dashGetCreds() || {}).token, 2500);
    PRUEBAS.cierto(recordo, 'guarda: recordó en la ranura de supervisor');
    document.getElementById('pPass').value = '';
    closePortal(true);
    if (!recordo) return;
    const a = await p301AutoLogin(() => { document.getElementById('portalOverlay').classList.add('show'); openPortal(); });
    const u = b.ultimoPanel();
    PRUEBAS.igual(u.pedido.pedida, 'supervisor', '🔒 `openPortal` con un solo panel entra por su ranura, y la ranura manda `pedida`');
    PRUEBAS.igual(a.vista, 'supervisor', '🔒 F021 · abre Supervisor: «se le abre Servicio médico con comentarios y puntajes» ya no pasa');
    PRUEBAS.igual(p301Comentarios(u.resp).indexOf('duerme mal'), -1, '🔒 y no le llega ningún comentario clínico');
  } finally {
    try { closePortal(true); } catch (e) {}
    b.restaurar();
    try { localStorage.clear(); } catch (e) {}
  }
  await p301SinCredenciales();   // 🧹 R18 · S1
});

PRUEBAS.caso('✅ F021 · las ranuras de Dirección y del administrador no cambian: abren lo de siempre', async () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  try {
    p301Partida();
    /* Dirección · la contraseña HSEQ de HELITEC (cuenta con las tres separadas). R19: la vista la
       concede `validarAcceso` (rama de `ClaveHseq` → `vista:"hseq"`); `pedida` no la toca porque el
       servidor sólo la mira en una combinada, y la ranura de Dirección manda ''. */
    const e = await p301EntrarYRecordar('hseq', 'helitec', 'dir-301', K_DASH_CREDS_HSEQ);
    PRUEBAS.igual(e.vista, 'hseq', 'guarda: el login de Dirección abre Dirección');
    PRUEBAS.cierto(e.recordo, 'guarda: y recordó en la ranura de Dirección');
    if (!e.recordo) return;
    /* sin perfil, `openPortal` no entra solo con la de Dirección: se elige la pestaña y se toca «Entrar»
       sin contraseña, que entra con el token (P181) */
    splashPortal(); portalMode('hseq');
    const a = await p301AutoLogin(() => portalLoginSupervisor(document.querySelector('#portalSup .save-btn')));
    const u = b.ultimoPanel();
    /* el invariante, no la forma: la ranura de Dirección no pide una vista que una combinada pueda adoptar */
    PRUEBAS.igual(['supervisor', 'medico'].indexOf(u.pedido.pedida), -1,
      '✅ la ranura de Dirección no pide Supervisor ni Servicio médico (manda ' + JSON.stringify(u.pedido.pedida) + ', como su login)');
    PRUEBAS.igual(a.vista, 'hseq', '✅ y abre Dirección');
    closePortal(true);

    /* El administrador · `portalLoginAdmin` guarda su token solo (S4, `recordar:'1'`), y `splashAdmin`
       vuelve a entrar con él. R19: `validarAcceso` da `{rol:"admin", vista:"medico"}` al `*`. */
    DASH = null;
    splashAbrirPortal(); admGateModo();
    document.getElementById('pAdminPass').value = P301_ADMIN;
    portalLoginAdmin(document.querySelector('#adminBox .save-btn') || null);
    const entroAdm = await PRUEBAS.esperarA(() => !!(DASH && DASH.rol === 'admin'), 2500);
    PRUEBAS.cierto(entroAdm, 'guarda: el administrador entró');
    if (!entroAdm) return;
    PRUEBAS.cierto(!!(dashGetCredsAdm() || {}).token, 'guarda: y quedó su sesión guardada');
    document.getElementById('pAdminPass').value = '';
    closePortal(true);
    const ad = await p301AutoLogin(splashAdmin);
    const ua = b.ultimoPanel();
    PRUEBAS.igual(['supervisor', 'medico'].indexOf(ua.pedido.pedida), -1,
      '✅ la ranura del administrador no pide ninguna vista (manda ' + JSON.stringify(ua.pedido.pedida) + '; el servidor sólo la mira en una combinada)');
    PRUEBAS.igual(ad.vista, 'medico', '✅ y el administrador entra como siempre');
    PRUEBAS.igual(DASH && DASH.rol, 'admin', '✅ con su rol');
  } finally {
    try { document.getElementById('pAdminPass').value = ''; } catch (e) {}
    try { closePortal(true); } catch (e) {}
    try { portalReponerLoDeEmpresa(); } catch (e) {}
    b.restaurar();
    try { localStorage.clear(); } catch (e) {}
  }
  await p301SinCredenciales();   // 🧹 R18 · S1
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   VERIFICAR LA CONTRASEÑA DEL ROL (hallazgo 3 del verificador de P301)
   `validarSupervisorCreds` es la comprobación del formulario de perfil y de la pantalla que ofrece el
   rol. Sólo mira `d.ok`, pero el servidor le contesta el panel ENTERO: sin `pedida`, a una combinada le
   viajaba la vista médica con comentarios y puntajes. Se entra por la pantalla real (`avanzarAlta` abre
   el ofrecimiento, se escribe la contraseña, `rolConfirmar`), con el pedido desviado al `.gs` real.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
/* Quien acaba de cargar sus datos y la nómina le propone un rol: consentimiento firmado, tamaño de
   texto elegido, la contraseña propia ya ofrecida, y el perfil completo. La empresa del perfil es el
   USUARIO de la cuenta, porque `rolConfirmar` valida con `p.empresa`. */
function p301PrepararAlta(rol) {
  try { closePortal(true); } catch (e) {}
  localStorage.clear();
  const cons = { items: {} };
  CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
  localStorage.setItem(K_CONSENT, JSON.stringify(cons));
  localStorage.setItem(K_TEXTO, '1');
  setProfile({ nombre: 'Persona P301', cedula: 'V-301301', empresa: 'silva', departamento: 'Operaciones', cargo: 'Operadora',
               sexo: 'Femenino', edad: '34', telefono: '04141111111', email: 'p301@ejemplo.co', esPiloto: false,
               rol: rol, rolOrigen: 'nomina' });
  clvMarcarOfrecida();
  DASH = null;
}
function p301CerrarAlta() {
  ['rolOv', 'claveOv', 'consent', 'textoOverlay', 'nominaOv', 'setup'].forEach(id => { const o = document.getElementById(id); if (o) o.classList.remove('show'); });
  try { document.getElementById('rolPass').value = ''; } catch (e) {}
  try { syncScrollLock(); } catch (e) {}
}

/* Abre el ofrecimiento del rol por la pantalla real, escribe la contraseña y toca «Activar», y espera a
   que `rolConfirmar` TERMINE: la pantalla cerrada (activó) o el error escrito (rechazó).
   ⚠️ S1 de la segunda pasada del verificador: la versión anterior esperaba sólo a que SALIERA el pedido.
   Con el banco del caso eso es sincrónico, así que `esperarA` volvía sin ceder el turno, el caso limpiaba
   el `localStorage`, y RECIÉN DESPUÉS corría `rolActivarGuardar`, que dejaba guardada la contraseña de
   prueba. El siguiente arranque de la app local la mandaba al endpoint de producción. */
async function p301ConfirmarRol(b, rol, pass) {
  p301PrepararAlta(rol);
  avanzarAlta();
  const ov = document.getElementById('rolOv'), err = document.getElementById('rolErr');
  const abierta = !!ov && ov.classList.contains('show');
  document.getElementById('rolPass').value = pass;
  const antes = b.reg.pedidos.length;
  rolConfirmar(document.querySelector('#rolOv .save-btn'));
  const termino = await PRUEBAS.esperarA(() => !ov.classList.contains('show') || (err.textContent || '').length > 0, 2500);
  return { abierta: abierta, termino: termino, pedido: b.reg.pedidos[antes] || {}, resp: b.reg.respuestas[antes] || {},
           activado: !ov.classList.contains('show'), error: err.textContent || '' };
}
/* Lo que haya quedado encolado corre antes de la próxima vuelta de la cola de tareas: se cede UNA y
   después se buscan credenciales o tokens guardados. Es el aserto que S1 no tenía. */
async function p301CredencialesQueQuedan() {
  await new Promise(r => setTimeout(r, 0));
  return Object.keys(localStorage).filter(k => /creds|sesion|token/i.test(k) ||
    /sil-301|dir-sil|sup-301|med-301|dir-301|adm-p301|sst_/.test(String(localStorage.getItem(k) || '')));
}
/* R18 · la limpieza en el `.finally()` de la promesa del caso; después, la comprobación. */
function p301Cerrar(b) {
  return function () { p301CerrarAlta(); try { closePortal(true); } catch (e) {} b.restaurar(); try { localStorage.clear(); } catch (e) {} };
}
async function p301SinCredenciales() {
  PRUEBAS.igual(await p301CredencialesQueQuedan(), [], '🧹 R18 · el caso no deja ninguna credencial ni token guardado después de limpiar (S1)');
}

PRUEBAS.caso('🔒 P301 · verificar la contraseña de Supervisor no le trae a una combinada la vista médica', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  return (async () => {
    /* R19 · `validarSupervisorCreds` manda la pestaña del rol que se verifica, y `accionSupervisor`
       la aplica en una combinada. */
    for (const caso of [{ rol: 'supervisor', vista: 'supervisor', clinico: false }, { rol: 'medico', vista: 'medico', clinico: true }]) {
      const r = await p301ConfirmarRol(b, caso.rol, 'sil-301');
      PRUEBAS.cierto(r.abierta, 'guarda: la pantalla que ofrece el rol «' + caso.rol + '» estaba abierta');
      PRUEBAS.cierto(r.termino, 'guarda: `rolConfirmar` terminó (activó o rechazó)');
      PRUEBAS.igual(r.pedido.action, 'supervisor', 'guarda: es la validación de siempre (`action:supervisor`)');
      PRUEBAS.igual(r.pedido.pedida, caso.rol, '🔒 «' + caso.rol + '» · manda `pedida:"' + caso.rol + '"`, la pestaña del rol que se ofrece');
      PRUEBAS.igual(r.resp.vista, caso.vista, '🔒 y le llega la vista de ese rol');
      PRUEBAS.igual(p301Comentarios(r.resp).indexOf('duerme mal') >= 0, caso.clinico,
        caso.clinico ? '✅ al rol médico le llegan sus comentarios' : '🔒 al de Supervisor no le viaja ningún comentario clínico');
      PRUEBAS.igual(p301ConPuntajes(r.resp), caso.clinico, caso.clinico ? '✅ y sus puntajes' : '🔒 ni ningún puntaje');
      PRUEBAS.cierto(r.activado, '✅ y el rol se activó: la contraseña abre la vista de ESE rol');
      p301CerrarAlta();
    }
    /* DISCRIMINADOR · el pedido de la 7.48 (sin `pedida`) contra el `.gs` de la segunda vuelta («Supervisor
       si no sabe» sólo para sesiones), sobre el mismo libro: la verificación traía la vista médica entera.
       Con el `.gs` de ahora el servidor ya lo cubre también con contraseña (S2): por eso se carga el de antes. */
    const antes = p301GsSoloConSesion();
    PRUEBAS.cierto(!!antes, 'DISCRIMINADOR · pude volver la regla a «sólo sesiones»');
    if (!antes) return;
    b.cargar(antes);
    const conPedida = window.fetchConReloj;
    window.fetchConReloj = (u, o) => {
      try { if (o && o.body) { const c = JSON.parse(String(o.body)); delete c.pedida; o = Object.assign({}, o, { body: JSON.stringify(c) }); } } catch (e) {}
      return conPedida(u, o);
    };
    const viejo = await p301ConfirmarRol(b, 'supervisor', 'sil-301');
    PRUEBAS.cierto(viejo.termino, 'DISCRIMINADOR · guarda: `rolConfirmar` terminó');
    PRUEBAS.igual(viejo.pedido.pedida, undefined, 'DISCRIMINADOR · guarda: salió sin `pedida`');
    PRUEBAS.igual(viejo.resp.vista, 'medico', 'DISCRIMINADOR · sin `pedida`, verificar la contraseña de Supervisor traía la vista médica');
    PRUEBAS.cierto(p301Comentarios(viejo.resp).indexOf('duerme mal') >= 0 && p301ConPuntajes(viejo.resp), 'DISCRIMINADOR · con comentarios y puntajes');
    PRUEBAS.falso(viejo.activado, 'DISCRIMINADOR · y el candado de vista de `rolConfirmar` no lo activa: abre Servicio médico, no Supervisor');
  })().finally(p301Cerrar(b)).then(p301SinCredenciales);
});

PRUEBAS.caso('🔒 P301 · S2 · Dirección de una combinada no activa su rol con la contraseña de supervisor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  return (async () => {
    /* S2 de la segunda pasada del verificador. R19 · el candado lo pone `rolConfirmar`, que llama a
       `validarSupervisorCreds(…, rol, true)`: la vista que contesta el servidor tiene que ser la del rol,
       con el mismo criterio y los mismos textos que el candado del login (`PORTAL_VISTA === 'hseq'`). */
    const mal = await p301ConfirmarRol(b, 'hseq', 'sil-301');
    PRUEBAS.cierto(mal.abierta && mal.termino, 'guarda: se ofreció el rol de Dirección y `rolConfirmar` terminó');
    PRUEBAS.igual(mal.pedido.pedida, 'supervisor', 'guarda: la verificación de Dirección pide Supervisor (la vista que menos trae)');
    PRUEBAS.igual(mal.resp.vista, 'supervisor', 'guarda: la contraseña de la combinada sirve, pero abre Supervisor');
    PRUEBAS.falso(mal.activado, '🔒 el rol de Dirección NO se activa con una contraseña que abre otro panel');
    PRUEBAS.igual(mal.error, t('adm_no_hseq'), '🔒 y dice por qué, con el texto del candado del login');
    PRUEBAS.igual(localStorage.getItem(K_DASH_CREDS_HSEQ), null, '🔒 y la ranura de Dirección queda vacía: no hay primera entrada que abra Servicio médico');
    PRUEBAS.falso(((getProfile() || {}).rolesActivados || []).indexOf('hseq') >= 0, '🔒 ni el perfil queda con Dirección activada');
    /* DISCRIMINADOR · sin exigir la vista, esa misma contraseña pasaba la verificación */
    PRUEBAS.igual(await validarSupervisorCreds('silva', 'sil-301', 'hseq'), 'ok', 'DISCRIMINADOR · sin el candado de vista, la contraseña de supervisor pasaba como la de Dirección');
    p301CerrarAlta();
    /* ✅ con la contraseña de Dirección, sí */
    const bien = await p301ConfirmarRol(b, 'hseq', 'dir-sil');
    PRUEBAS.igual(bien.resp.vista, 'hseq', '✅ la contraseña de Dirección abre Dirección');
    PRUEBAS.cierto(bien.activado, '✅ y activa el rol');
    PRUEBAS.igual((JSON.parse(localStorage.getItem(K_DASH_CREDS_HSEQ) || 'null') || {}).usuario, 'silva', '✅ con la cuenta en la ranura de Dirección');
  })().finally(p301Cerrar(b)).then(p301SinCredenciales);
});

PRUEBAS.caso('🔒 P301 · S2 · elegir Dirección en el login y escribir la contraseña de una combinada ya no hace viajar la vista médica', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const b = p301Banco();
  const entrarPorDireccion = async () => {
    DASH = null;
    const errEl = document.getElementById('portalErr'); errEl.textContent = '';
    splashPortal(); portalMode('hseq');
    document.getElementById('pEmpresa').value = 'silva'; document.getElementById('pPass').value = 'sil-301';
    portalLoginSupervisor(document.querySelector('#portalSup .save-btn'));
    const termino = await PRUEBAS.esperarA(() => (errEl.textContent || '').length > 0 || !!(DASH && DASH.vista), CARGA_MIN_MS + 2500);
    document.getElementById('pPass').value = '';
    return { termino: termino, u: b.ultimoPanel(), error: errEl.textContent || '', abrio: !!(DASH && DASH.vista) };
  };
  return (async () => {
    p301Partida();
    /* R19 · lo concede `accionSupervisor`: una combinada sin pestaña válida —la de Dirección manda
       `pedida:""`— abre Supervisor también con contraseña. El cliente la rechazaba igual (candado del
       login), pero la vista médica ya había viajado. */
    const r = await entrarPorDireccion();
    PRUEBAS.cierto(r.termino, 'guarda: el login contestó');
    PRUEBAS.igual(r.u.pedido.pedida, '', 'guarda: la pestaña Dirección del login manda `pedida:""`');
    PRUEBAS.igual(r.u.resp.vista, 'supervisor', '🔒 el servidor contesta Supervisor, no Servicio médico');
    PRUEBAS.falso(p301ConPuntajes(r.u.resp) || p301Comentarios(r.u.resp).indexOf('duerme mal') >= 0, '🔒 y no viaja ningún comentario ni puntaje');
    PRUEBAS.igual(r.error, t('adm_no_hseq'), '✅ y el login lo rechaza como siempre: no es la contraseña de Dirección');
    PRUEBAS.falso(r.abrio, '✅ sin abrir ningún panel');
    /* DISCRIMINADOR · con la regla de la segunda vuelta (sólo sesiones), sobre el mismo libro, la misma
       entrada recibía Servicio médico con comentarios y puntajes, aunque después se rechazara. */
    const antes = p301GsSoloConSesion();
    PRUEBAS.cierto(!!antes, 'DISCRIMINADOR · pude volver la regla a «sólo sesiones»');
    if (!antes) return;
    try { closePortal(true); } catch (e) {}
    b.cargar(antes);
    const v = await entrarPorDireccion();
    PRUEBAS.igual(v.u.resp.vista, 'medico', 'DISCRIMINADOR · con la regla sólo para sesiones, viajaba Servicio médico');
    PRUEBAS.cierto(p301ConPuntajes(v.u.resp) && p301Comentarios(v.u.resp).indexOf('duerme mal') >= 0, 'DISCRIMINADOR · con comentarios y puntajes');
  })().finally(p301Cerrar(b)).then(p301SinCredenciales);
});
