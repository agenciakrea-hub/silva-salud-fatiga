/* ── P213 · «Todas las empresas» no es un scope para escribir ────────────────────────────────────
   (2026-09-30 · lo midió el verificador en la ronda 4 de P211 y se decidió en P212)

   El cliente del administrador manda el literal «Todas las empresas» cuando no eligió empresa en el
   filtro: `gestEmpresaActual()` → `DASH.scope` → `dashScopeTodas()`. Y el servidor lo archivaba TAL
   CUAL. Consecuencia medida: una determinación médica firmada quedaba indexada bajo
   `persona|todas las empresas` mientras el teléfono de esa persona la busca por
   `persona|<su empresa>` — **no le llegaba nunca** — y la línea de bitácora del mismo acto se
   archivaba en un balde que ninguna lectura consulta, **append-only, R3, que no se corrige después**.

   ⚠️ NO ES UN CRITERIO NUEVO. `accionTareaGuardar` ya lo tenía escrito para las tareas, con el
   razonamiento entero: «el jefe cree haber asignado y la persona no ve es peor que un error: nadie
   va a buscarla. Se rechaza con un mensaje en vez de escribir una fila que no va a leer nadie».
   `depEmpresaValida()` es la misma función que usan `accionCicloConfigGuardar` y otras cinco, y el
   motivo `sin_empresa` YA tiene su texto traducido en el cliente («Elige primero una empresa en el
   filtro.», en los dos idiomas). P213 lo extiende a lo que faltaba: gestiones, bitácora y casos
   Odoo — y de paso `accionTareaGuardar` deja de tener su propia copia de la regla.

   ⚠️ SOBRE EL ADR 007. Dice «el administrador en "Todas las empresas", sin visor, sigue escribiendo
   lo que hoy escribe», pero esa frase está DENTRO de la regla «el visor no escribe» y sirve para
   delimitar qué le quita P185 al administrador — no para bendecir el scope con el que escribe.
   Aun así se declara explícito, porque es un ADR vigente y la regla del proyecto es decirlo.

   ⚠️ Y `"Grupo"` DEJÓ DE SER EL DEFAULT de `gestScope`, que era la puerta de al lado: pedir empresa
   vacía producía ese literal, y P212 midió que esa cadena no aparece ni una vez en `index.html` ni
   en ningún otro punto del `.gs`. Era un balde inventado. Ahora el scope vacío es vacío, que es lo
   que `depEmpresaValida` rechaza. */

PRUEBAS.grupo('P213 · «Todas las empresas» no es un scope');

const P213_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];

function p213Api() {
  const env = GS.crearEntorno({
    'Accesos': [P213_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['GrupoNorte', 'clave-gn', 'admin', 'Aerocentro', '', ''],
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', '']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
                  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['gestScope', 'depEmpresaValida', 'validarAcceso',
    'accionGestionGuardar', 'accionGestionBorrar', 'accionBitacoraGuardar']);
  api.__env = env;
  return api;
}
const p213J = r => JSON.parse(r.getContent());
const p213Filas = (api, hoja) => api.__env.__libro.getSheetByName(hoja).getDataRange().getValues();
const p213Anot = id => JSON.stringify({ id: id, tipo: 'anotacion_aptitud', persona: 'PEDRO GOMEZ',
  departamento: 'Operaciones', nivel: 'alto', medico: 'Dra. Rivas', creada: 1, vigenciaHasta: 9e15 });
const p213Ev = id => JSON.stringify({ id: id, ts: 1759000000000, accion: 'anotacion_aptitud',
  sujeto: 'PEDRO GOMEZ', actor: 'Dra. Rivas', rol: 'medico', origen: 'panel', umbral: {} });

PRUEBAS.caso('🔴 el administrador SIN empresa en el filtro no archiva una determinación firmada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ «Todas las empresas» es exactamente lo que `gestEmpresaActual()` manda cuando el admin no
     eligió filtro. La fila quedaba indexada bajo `persona|todas las empresas` y el teléfono de esa
     persona la busca por `persona|<su empresa>`: no le llegaba nunca, y nadie se enteraba. */
  const api = p213Api();
  const r = p213J(api.accionGestionGuardar({ usuario: '*', pass: 'clave-maestra',
    empresa: 'Todas las empresas', gestion: p213Anot('g_todas') }));
  PRUEBAS.falso(r.ok, '🔴 se RECHAZA · ' + JSON.stringify(r).slice(0, 80));
  PRUEBAS.igual(r.motivo, 'sin_empresa', '⚠️ con el motivo que el cliente ya sabe traducir («Elige primero una empresa en el filtro.»)');
  PRUEBAS.igual(p213Filas(api, 'Gestiones').length, 1, '🔴 y la hoja queda con sólo el encabezado: ni una fila en el balde');
  /* DISCRIMINADOR · con una empresa de verdad, el mismo admin escribe */
  PRUEBAS.cierto(p213J(api.accionGestionGuardar({ usuario: '*', pass: 'clave-maestra',
    empresa: 'Aeropostal', gestion: p213Anot('g_ok') })).ok, 'DISCRIMINADOR · con empresa elegida SÍ escribe');
  PRUEBAS.igual((p213Filas(api, 'Gestiones').find(f => String(f[1]) === 'g_ok') || [])[0], 'Aeropostal',
    'y queda bajo esa empresa');
});

PRUEBAS.caso('🔴 la BITÁCORA tampoco, y ahí es peor: es append-only (R3)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ Lo que entra mal en esta hoja NO SE CORRIGE NUNCA. Una línea archivada bajo «Todas las
     empresas» es un registro permanente que ninguna lectura consulta, porque todas filtran por una
     empresa concreta. */
  const api = p213Api();
  const r = p213J(api.accionBitacoraGuardar({ usuario: '*', pass: 'clave-maestra',
    empresa: 'Todas las empresas', evento: p213Ev('b_todas') }));
  PRUEBAS.falso(r.ok, '🔴 se RECHAZA antes de escribir · ' + JSON.stringify(r).slice(0, 70));
  PRUEBAS.igual(r.motivo, 'sin_empresa', 'con el mismo motivo');
  PRUEBAS.igual(p213Filas(api, 'Bitácora').length, 1, '🔴 y no quedó NINGUNA línea: en append-only, no escribir es la única defensa');
  /* DISCRIMINADOR · con empresa, la línea entra */
  PRUEBAS.cierto(p213J(api.accionBitacoraGuardar({ usuario: '*', pass: 'clave-maestra',
    empresa: 'Aeropostal', evento: p213Ev('b_ok') })).ok, 'DISCRIMINADOR · con empresa elegida sí se archiva');
  PRUEBAS.alMenos(p213Filas(api, 'Bitácora').length, 2, 'y la línea está');
});

PRUEBAS.caso('🔴 «Grupo» y el pedido VACÍO tampoco pasan: eran la puerta de al lado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ El primer arreglo de P213 cerró «Todas las empresas» y dejó abierta ésta: `gestScope` tenía
     como DEFAULT el literal `"Grupo"`, así que pedir empresa vacía producía ese valor y pasaba la
     guarda. P212 ya había medido que esa cadena no aparece ni una vez en `index.html` ni en ningún
     otro punto del `.gs` — era un balde inventado. Ahora el scope vacío queda vacío. */
  const api = p213Api();
  [['(vacío)', ''], ['comodín', '*']].forEach(par => {
    const r = p213J(api.accionGestionGuardar({ usuario: '*', pass: 'clave-maestra',
      empresa: par[1], gestion: p213Anot('g_' + par[0]) }));
    PRUEBAS.falso(r.ok, '🔴 pedir ' + par[0] + ' se rechaza · ' + (r.motivo || ''));
  });
  PRUEBAS.igual(p213Filas(api, 'Gestiones').length, 1, '🔴 ni una fila bajo un balde');
  /* y `gestScope` ya no INVENTA «Grupo» */
  const m = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(api.gestScope(m, ''), '', '⚠️ el scope vacío es VACÍO, no «Grupo»');
  PRUEBAS.falso(api.depEmpresaValida(''), 'y el vacío no es una empresa válida');
  /* ⚠️ pero «Grupo» como NOMBRE de empresa real sigue siendo legítimo: dejó de ser un balde y pasó
     a ser una cadena como cualquier otra */
  PRUEBAS.cierto(api.depEmpresaValida('Grupo'), '⚠️ y «Grupo» escrito a propósito sigue valiendo: es un nombre, no un balde');
});

PRUEBAS.caso('⚠️ un SUPERVISOR no se ve afectado, mande lo que mande', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ES LA MITAD QUE NO SE PUEDE ROMPER. El scope de un supervisor sale de `acc.canonical`, no de
     lo que manda el cliente, así que ninguna de las guardas nuevas lo alcanza. Si esto se pusiera en
     rojo, P213 habría dejado sin escribir a las 15 cuentas de empresa. */
  const api = p213Api();
  ['', 'Todas las empresas', '*', 'Aeropostal', 'Empresa Ajena'].forEach((e, i) => {
    const r = p213J(api.accionGestionGuardar({ usuario: 'Aeropostal', pass: 'clave-ap', empresa: e, gestion: p213Anot('s' + i) }));
    PRUEBAS.cierto(r.ok, '⚠️ pida «' + (e || '(vacío)') + '», escribe · ' + JSON.stringify(r).slice(0, 40));
  });
  const emps = p213Filas(api, 'Gestiones').slice(1).map(f => String(f[0]));
  PRUEBAS.igual(emps.filter(e => e !== 'Aeropostal').length, 0, '⚠️ y TODAS las filas quedaron bajo su empresa');
  /* y la bitácora igual */
  PRUEBAS.cierto(p213J(api.accionBitacoraGuardar({ usuario: 'Aeropostal', pass: 'clave-ap', empresa: 'Todas las empresas', evento: p213Ev('sb') })).ok,
    '⚠️ y su bitácora también entra');
});

PRUEBAS.caso('⚠️ un admin DE FILA cae a su empresa, no al rechazo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* P212 hace que un admin con lista caiga a SU empresa cuando pide una ajena o no pide nada, así
     que el rechazo de P213 no lo alcanza: tiene canónico. Las dos reglas se componen. */
  const api = p213Api();
  ['', 'Aerocentro', 'Aeroambulancias Silva'].forEach((e, i) => {
    PRUEBAS.cierto(p213J(api.accionGestionGuardar({ usuario: 'GrupoNorte', pass: 'clave-gn', empresa: e, gestion: p213Anot('a' + i) })).ok,
      '⚠️ pida «' + (e || '(vacío)') + '», escribe');
  });
  const emps = p213Filas(api, 'Gestiones').slice(1).map(f => String(f[0]));
  PRUEBAS.igual(emps.filter(e => e !== 'Aerocentro').length, 0, '⚠️ y siempre bajo la SUYA');
});

PRUEBAS.caso('⚠️ el BORRADO tampoco corre sin empresa (informaba `ok` sin borrar nada)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* Sin empresa el `key` no matchea ninguna fila real, así que el bucle no borraba nada y el pedido
     terminaba `ok` — peor que un error, porque nadie lo revisa. */
  const api = p213Api();
  api.accionGestionGuardar({ usuario: '*', pass: 'clave-maestra', empresa: 'Aeropostal', gestion: p213Anot('g_vive') });
  const r = p213J(api.accionGestionBorrar({ usuario: '*', pass: 'clave-maestra', empresa: 'Todas las empresas', id: 'g_vive' }));
  PRUEBAS.falso(r.ok, '⚠️ se rechaza · ' + (r.motivo || ''));
  PRUEBAS.cierto(p213Filas(api, 'Gestiones').some(f => String(f[1]) === 'g_vive'), 'y la fila sigue ahí');
  /* DISCRIMINADOR · con la empresa correcta sí borra */
  PRUEBAS.cierto(p213J(api.accionGestionBorrar({ usuario: '*', pass: 'clave-maestra', empresa: 'Aeropostal', id: 'g_vive' })).ok,
    'DISCRIMINADOR · con empresa elegida sí borra');
  PRUEBAS.falso(p213Filas(api, 'Gestiones').some(f => String(f[1]) === 'g_vive'), 'y la fila se fue');
});

PRUEBAS.caso('⚠️ CONTRATO · `accionTareaGuardar` usa la misma función, no su propia copia', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* Tenía el chequeo escrito a mano —`!scope || scope === "*" || norm(scope) === norm("Todas las
     empresas")`— que es literalmente lo que hace `depEmpresaValida`. Dos derivaciones de la misma
     regla, el bug más repetido de este proyecto, en la función cuyo propio comentario decía «mismo
     criterio que `accionCicloConfigGuardar`» — que sí la usaba. */
  PRUEBAS.falso(CTX.gs.indexOf('if (!scope || scope === "*" || norm(scope) === norm("Todas las empresas")) {') >= 0,
    '⚠️ ya no está la copia a mano en `accionTareaGuardar`');
  /* y las cuatro acciones nuevas la usan */
  ['accionGestionGuardar', 'accionGestionBorrar', 'accionBitacoraGuardar', 'accionCasoOdooGuardar'].forEach(fn => {
    const i = CTX.gs.indexOf('function ' + fn + '(');
    PRUEBAS.cierto(i >= 0, 'guarda: existe ' + fn);
    if (i < 0) return;
    /* ⚠️ hasta la PRÓXIMA función, no una ventana fija: los comentarios de este archivo son largos y
       4000 caracteres no llegaban al cuerpo — el caso daba rojo por la ventana, no por el código. */
    const sig = CTX.gs.indexOf('\nfunction ', i + 1);
    const cuerpo = CTX.gs.slice(i, sig > i ? sig : i + 12000);
    /* ⚠️ `'if (!depEmpresaValida('`, NO el nombre suelto. Buscar el nombre daba VERDE con la guarda
       borrada, porque el COMENTARIO de `accionGestionGuardar` la menciona («`depEmpresaValida` es la
       MISMA función que usan…»). Una de las cuatro pasaba sin código. Lo cazó el verificador. */
    PRUEBAS.cierto(cuerpo.indexOf('if (!depEmpresaValida(') >= 0, '⚠️ ' + fn + ' LLAMA a `depEmpresaValida`, no sólo la nombra');
  });
});
