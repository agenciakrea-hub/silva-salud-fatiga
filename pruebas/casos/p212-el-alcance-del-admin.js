/* ── P212 · el alcance de un admin sale de SU lista, no del pedido ───────────────────────────────
   (2026-09-30 · apareció en la cuarta ronda de verificación de P211)

   `gestScope(acc, p.empresa)` devolvía `empresaParam` CRUDO cuando `acc.rol === "admin"`. Y el rol
   se lee de la **columna C de `Accesos`** (`"Rol (supervisor ve solo su empresa, admin ve todas)"`),
   así que bastaba escribir «admin» en una fila cualquiera para que esa cuenta escribiera bajo una
   empresa que no es suya — o bajo una que no existe, y entonces la fila queda huérfana y no la lee
   nadie nunca (R15: un dato que se escribe y nadie lee no está terminado).

   Hasta P211 esa cuenta no escribía NINGUNA gestión (el servidor exigía `vista === "medico"`); desde
   P211 escribe restricciones y telemedicinas, así que la ampliación era nueva.

   ⚠️ MEDIDO CONTRA EL CH ANTES DE TOCAR NADA, y es lo que hizo este cambio chico en vez de grande:
   de las **16 cuentas de `Accesos` en producción, la única con `rol = admin` es el maestro `*`**,
   que tiene `empresas:null` y cae en la rama que no cambió. Ninguna otra lo es. El comportamiento de
   las 16 cuentas vivas es IDÉNTICO, y por eso no hubo que revisar los catorce llamadores de
   `gestScope` uno por uno: ninguno ve un `acc` distinto del que veía ayer.

   ⚠️ R17 · ACÁ NO SE ARMA NINGÚN `acc` A MANO. Las cuentas se declaran como filas de `Accesos` y se
   autentican con `validarAcceso`, que es quien deriva `rol`, `empresas` y `canonical`. Armar el
   `acc` a mano probaría `gestScope` y no que `validarAcceso` le pueda dar lo que pide — que es
   exactamente el defecto que este proyecto ya pagó tres veces. */

PRUEBAS.grupo('P212 · el alcance del admin sale de su lista');

const P212_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];

function p212Api() {
  const env = GS.crearEntorno({
    'Accesos': [P212_CAB,
      /* el MAESTRO: usuario `*`, sin lista de empresas → ve y escribe en todas */
      ['*', 'clave-maestra', 'admin', '', '', ''],
      /* un ADMIN DE FILA: rol admin en la columna C, y una lista de DOS empresas */
      ['Grupo Norte', 'clave-gn', 'admin', 'Aerocentro, Consorcio HELITEC', 'med-gn', ''],
      /* un supervisor normal, para contrastar */
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', '']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['gestScope', 'validarAcceso', 'accionGestionGuardar', 'accionGestiones']);
  api.__env = env;
  return api;
}
const p212Filas = api => api.__env.__libro.getSheetByName('Gestiones').getDataRange().getValues();
const p212J = r => JSON.parse(r.getContent());
const p212Gest = (id, empresa) => JSON.stringify({ id: id, tipo: 'restriccion_tarea', persona: 'PEDRO GOMEZ',
  departamento: 'Operaciones', tarea: 'vuelo nocturno', motivo: 'x', creada: 1, horas: 72, levantada: false });

PRUEBAS.caso('⚠️ la premisa · el rol sale de la columna C de `Accesos`, no de una constante', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p212Api();
  const maestro = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(maestro && maestro.rol, 'admin', 'el maestro `*` entra como admin…');
  PRUEBAS.igual(maestro && maestro.empresas, null, '…y SIN lista de empresas: `null` = todas');
  /* ⚠️ ACÁ ESTÁ LA PUERTA: basta «admin» escrito en la columna C de una fila cualquiera */
  const fila = api.validarAcceso('Grupo Norte', 'clave-gn', 'd');
  PRUEBAS.igual(fila && fila.rol, 'admin', '⚠️ y una FILA con «admin» en la columna C también es admin…');
  PRUEBAS.igual(JSON.stringify(fila && fila.empresas), '["Aerocentro","Consorcio HELITEC"]',
    '…pero SÍ tiene lista: son dos empresas, no todas');
  const sup = api.validarAcceso('Aeropostal', 'clave-ap', 'd');
  PRUEBAS.igual(sup && sup.rol, 'supervisor', 'DISCRIMINADOR · una fila normal es supervisor');
});

PRUEBAS.caso('🔴 un admin DE FILA no puede escribir bajo una empresa que no es suya', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p212Api();
  const acc = api.validarAcceso('Grupo Norte', 'clave-gn', 'd');
  PRUEBAS.cierto(!!acc, 'guarda: entra');
  if (!acc) return;
  /* las SUYAS sí, y con el nombre canónico de la lista */
  PRUEBAS.igual(api.gestScope(acc, 'Aerocentro'), 'Aerocentro', 'su primera empresa, sí');
  PRUEBAS.igual(api.gestScope(acc, 'Consorcio HELITEC'), 'Consorcio HELITEC', 'su segunda, también');
  PRUEBAS.igual(api.gestScope(acc, 'consorcio helitec'), 'Consorcio HELITEC',
    '⚠️ y se compara con `norm()`: «consorcio helitec» resuelve al nombre canónico de SU lista');
  /* 🔴 una AJENA cae a la suya, nunca a la ajena */
  PRUEBAS.igual(api.gestScope(acc, 'Aeroambulancias Silva'), 'Aerocentro',
    '🔴 una empresa AJENA cae a la suya: el dato queda donde tiene derecho');
  PRUEBAS.igual(api.gestScope(acc, 'Empresa Que No Existe'), 'Aerocentro',
    '🔴 y una INEXISTENTE también: sin esto la fila quedaba huérfana y no la leía nadie (R15)');
  /* ⚠️ «Grupo» lo mide su propio caso, más abajo: dejó de saltear el candado cuando se comprobó que
     ese «cuaderno general» no existe en ninguna parte del código. Estas dos líneas afirmaban lo
     contrario y quedaron de la primera versión — dos casos del mismo archivo diciendo cosas
     opuestas, que es peor que no tener ninguno. */
});

PRUEBAS.caso('⚠️ el admin MAESTRO no cambió: sigue escribiendo en cualquier empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ES LA MITAD QUE NO SE PUEDE ROMPER. El maestro `*` administra TODAS las empresas clientes: si
     este cambio lo acotara, el panel del administrador dejaría de ver a sus clientes. `empresas:null`
     es exactamente lo que lo distingue de un admin de fila. */
  const api = p212Api();
  const acc = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.cierto(!!acc, 'guarda: entra');
  if (!acc) return;
  ['Aeroambulancias Silva', 'Aerocentro', 'Una Empresa Nueva', 'Grupo'].forEach(e => {
    PRUEBAS.igual(api.gestScope(acc, e), e, '⚠️ el maestro escribe en «' + e + '» sin recorte');
  });
});

PRUEBAS.caso('🔴 una coma suelta en la celda EMPRESAS no desarma el candado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ LA PRIMERA VERSIÓN RECONOCÍA AL MAESTRO POR «LISTA VACÍA» (`!acc.empresas.length`), y
     `accesosPartir_` hace `filter(Boolean)`: una celda EMPRESAS que fuera sólo `,` o `;` dejaba
     `empresas: []` y esa cuenta quedaba tratada como el administrador maestro — alcance sin recorte.
     Un error de tipeo desarmaba el candado entero. Lo cazó el verificador.
     Ahora el maestro se reconoce por IDENTIDAD: `validarAcceso` le arma un literal
     `{rol:"admin", empresas:null, canonical:null}` al usuario `*`, y `canonical == null` es lo único
     que ninguna otra cuenta tiene, porque `accesosPartir_` devuelve `[usuario]` cuando la celda está
     vacía. */
  const env = GS.crearEntorno({
    'Accesos': [P212_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Coma', 'clave-c', 'admin', ',', '', ''],          // ⚠️ la celda es UNA COMA
      ['PuntoYComa', 'clave-p', 'admin', ' ; ', '', ''],
      ['SinLista', 'clave-s', 'admin', '', '', '']],      // celda vacía → empresas = [usuario]
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['gestScope', 'validarAcceso']);
  [['Coma', 'clave-c'], ['PuntoYComa', 'clave-p']].forEach(c => {
    const acc = api.validarAcceso(c[0], c[1], 'd');
    PRUEBAS.cierto(!!acc, 'guarda: «' + c[0] + '» entra');
    if (!acc) return;
    /* ⚠️ AFIRMACIÓN POSITIVA, «QUÉ ES», NO «QUÉ NO ES». La primera versión de estas líneas decía
       `PRUEBAS.falso(gestScope(...) === 'Aeroambulancias Silva')` y fijaba además `empresas: []` y
       `canonical: undefined` como si fueran lo esperado. Con eso los 10 casos pasaban **mientras esa
       cuenta escribía bajo una empresa llamada literalmente `"undefined"`** —`String(undefined)` es
       truthy— compartiendo balde con cualquier otra que tuviera la misma errata, bitácora incluida.
       Una afirmación negativa pasa con cualquier basura, y dos de mis comprobaciones clavaban el
       estado roto como contrato. Lo cazó el verificador. */
    PRUEBAS.igual(JSON.stringify(acc.empresas), JSON.stringify([c[0]]),
      '🔴 su lista cae al USUARIO: `accesosPartir_` nunca devuelve vacío, ni con una celda `,`');
    PRUEBAS.igual(acc.canonical, c[0], '🔴 y su canónico es una cadena de verdad, no `undefined`');
    PRUEBAS.igual(api.gestScope(acc, 'Aeroambulancias Silva'), c[0],
      '🔴 y escribe bajo SU nombre — no bajo la ajena, y tampoco bajo `"undefined"`');
  });
  /* DISCRIMINADOR · el maestro de verdad sigue sin recorte */
  const m = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(m && m.canonical, null, 'DISCRIMINADOR · el maestro `*` tiene canónico `null`…');
  PRUEBAS.igual(m && m.empresas, null, '…y `empresas` en `null` EXACTO, que es lo que ninguna otra cuenta tiene…');
  PRUEBAS.igual(api.gestScope(m, 'Aeroambulancias Silva'), 'Aeroambulancias Silva', '…y escribe donde pide');
  /* ⚠️ y las dos cuentas con la errata NO comparten balde, que era el daño concreto */
  const a1 = api.validarAcceso('Coma', 'clave-c', 'd'), a2 = api.validarAcceso('PuntoYComa', 'clave-p', 'd');
  PRUEBAS.falso(api.gestScope(a1, 'X') === api.gestScope(a2, 'X'),
    '🔴 y dos cuentas con la misma errata NO caen en el mismo balde: antes las dos iban a «undefined»');
});

PRUEBAS.caso('⚠️ `empresas` nula con canónico cargado no tumba la acción', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* `sesResolver` deriva las dos por separado: `JSON.parse(celda) || null` para `empresas` y
     `String(celda) || null` para `canonical`. Una sesión con la celda `Empresas` corrupta y
     `Canonical` escrito llega con `empresas:null` y canónico puesto — y el bucle lanzaba
     `TypeError`, que tumba la acción entera. Sin lista declarada, el alcance es el canónico. */
  const api = p212Api();
  /* ⚠️ LOS DOS VALORES QUE `sesResolver` PRODUCE DE VERDAD, no uno elegido a mano (R17): con la celda
     `Canonical` escrita da una cadena, y con la celda VACÍA da `null` — y ése es el que la primera
     versión de este caso no probaba, justamente el que generaba el balde `"null"`. */
  const acc = { rol: 'admin', empresas: null, canonical: 'Aerocentro' };
  let r = null, tiro = false;
  try { r = api.gestScope(acc, 'Aeroambulancias Silva'); } catch (e) { tiro = true; }
  PRUEBAS.falso(tiro, '⚠️ no lanza');
  PRUEBAS.igual(r, 'Aerocentro', '…y cae al canónico, nunca a la cadena «null» ni a la ajena');
  /* ⚠️ Y CON LOS DOS EN NULL **ES EL MAESTRO**, por definición: ésa es su firma. La primera versión
     de este caso esperaba que cayera a «Grupo», y esperaba mal — no es un `acc` corrupto, es el
     administrador. `sesResolver` sólo produce las dos nulas a la vez para la sesión del maestro. */
  PRUEBAS.igual(api.gestScope({ rol: 'admin', empresas: null, canonical: null }, 'Aeroambulancias Silva'),
    'Aeroambulancias Silva', '⚠️ con `empresas` Y `canonical` en null es el MAESTRO: escribe donde pide');
});

PRUEBAS.caso('⚠️ «Grupo» ya no saltea el candado de un admin con lista', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* El comentario viejo llamaba a «Grupo» «el cuaderno general» y lo dejaba pasar antes de mirar la
     lista. Medido: esa cadena no aparece ni una vez en `index.html`, ni en ningún otro punto del
     `.gs` fuera de `gestScope`. Ese cuaderno NO EXISTE — nadie lo escribe ni lo lee por la interfaz —
     así que era un balde compartido donde dos admin de empresas distintas se leían las
     determinaciones firmadas del otro. Lo cazó el verificador. */
  const api = p212Api();
  const fila = api.validarAcceso('Grupo Norte', 'clave-gn', 'd');
  PRUEBAS.cierto(!!fila, 'guarda: entra');
  if (!fila) return;
  PRUEBAS.igual(api.gestScope(fila, 'Grupo'), 'Aerocentro',
    '⚠️ un admin CON lista que pide «Grupo» cae a la suya, no al balde');
  PRUEBAS.igual(api.gestScope(fila, ''), 'Aerocentro', 'y sin empresa pedida, igual');
  /* DISCRIMINADOR · el maestro sí lo usa como default, que es el comportamiento de siempre */
  const m = api.validarAcceso('*', 'clave-maestra', 'd');
  PRUEBAS.igual(api.gestScope(m, 'Grupo'), 'Grupo', 'DISCRIMINADOR · el maestro que PIDE «Grupo» recibe «Grupo»: es un nombre como cualquier otro');
  /* ⚠️ ACTUALIZADO EN P213: el default sin empresa YA NO es «Grupo». Era un valor inventado —esa
     cadena no aparece en `index.html` ni en ningún otro punto del `.gs`— y hacía que el admin sin
     filtro escribiera en un balde que ninguna lectura consulta, igual que «Todas las empresas».
     Ahora el scope vacío es vacío, y `depEmpresaValida` lo rechaza. */
  PRUEBAS.igual(api.gestScope(m, ''), '', '⚠️ P213 · y sin empresa pedida el scope queda VACÍO, no «Grupo»');
});

PRUEBAS.caso('🔴 el DIAGNÓSTICO deriva el rol igual que `validarAcceso` (si no, la premisa se mide mal)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ `diagGestionesSupervisor_` informaba `rol` SIN `.toLowerCase()`, mientras `validarAcceso` sí
     lo baja. Una fila con «Admin» o «ADMIN» se informaba como si no fuera admin mientras el servidor
     la trataba como tal — y la premisa de P212 («de 16 cuentas la única admin es `*`») salía de esa
     salida, o sea que podía estar subcontada. El instrumento con el que se mide quién es admin tenía
     que contar igual que la regla viva. Lo cazó el verificador. */
  const env = GS.crearEntorno({
    'Accesos': [P212_CAB,
      ['*', 'k', 'admin', '', '', ''],
      ['Mayus', 'k2', 'Admin', 'Aerocentro', '', ''],
      ['Gritado', 'k3', 'ADMIN', 'Aeropostal', '', ''],
      ['Normal', 'k4', 'supervisor', 'IAIM', '', '']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Token', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado']],
    'Bitácora': [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['diagGestionesSupervisor_', 'validarAcceso']);
  const r = api.diagGestionesSupervisor_();
  const porUsuario = {};
  (r.cuentas || []).forEach(c => { porUsuario[c.usuario] = c; });
  PRUEBAS.igual((porUsuario['Mayus'] || {}).rol, 'admin', '🔴 «Admin» se informa como `admin`…');
  PRUEBAS.igual((porUsuario['Gritado'] || {}).rol, 'admin', '…y «ADMIN» también');
  PRUEBAS.igual((porUsuario['Normal'] || {}).rol, 'supervisor', 'DISCRIMINADOR · y una fila normal sigue siendo supervisor');
  /* y coincide con lo que el servidor hace de verdad */
  PRUEBAS.igual(api.validarAcceso('Mayus', 'k2', 'd').rol, 'admin', '⚠️ que es lo que `validarAcceso` deriva');
  /* la celda EMPRESAS cruda, para que «el maestro tiene empresas:null» sea observable */
  PRUEBAS.igual((porUsuario['Mayus'] || {}).empresasCelda, 'Aerocentro', '⚠️ y ahora se informa la celda EMPRESAS…');
  PRUEBAS.igual((porUsuario['*'] || {}).empresasCelda, '', '…que para el maestro está vacía');
});

PRUEBAS.caso('⚠️ un supervisor sigue anclado a su empresa, mande lo que mande', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p212Api();
  const acc = api.validarAcceso('Aeropostal', 'clave-ap', 'd');
  PRUEBAS.cierto(!!acc, 'guarda: entra');
  if (!acc) return;
  ['Aeroambulancias Silva', 'Grupo', '', 'Aeropostal'].forEach(e => {
    PRUEBAS.igual(api.gestScope(acc, e), 'Aeropostal', 'pida «' + (e || '(vacío)') + '», escribe en la suya');
  });
});

PRUEBAS.caso('🔴 y se ve en la HOJA, no sólo en el valor que devuelve la función', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ R17 · el camino real: `accionGestionGuardar` → `gestScope` → la fila que queda en `Gestiones`.
     Medir sólo lo que devuelve `gestScope` prueba la función, no que la escritura termine donde
     corresponde. */
  const api = p212Api();
  const cred = e => ({ usuario: 'Grupo Norte', empresa: e, pass: 'med-gn' });   // su contraseña MÉDICA: escribe todo
  PRUEBAS.cierto(p212J(api.accionGestionGuardar(Object.assign({ gestion: p212Gest('g_propia') }, cred('Aerocentro')))).ok,
    'guarda: escribe en su propia empresa');
  PRUEBAS.cierto(p212J(api.accionGestionGuardar(Object.assign({ gestion: p212Gest('g_ajena') }, cred('Aeroambulancias Silva')))).ok,
    'y el pedido con empresa ajena NO se rechaza: se REDIRIGE, que es distinto');
  const filas = p212Filas(api);
  const emp = id => (filas.find(f => String(f[1]) === id) || [])[0];
  PRUEBAS.igual(emp('g_propia'), 'Aerocentro', 'la propia quedó en Aerocentro');
  PRUEBAS.igual(emp('g_ajena'), 'Aerocentro', '🔴 y la AJENA también: nunca tocó «Aeroambulancias Silva»');
  PRUEBAS.falso(filas.some(f => String(f[0]).indexOf('Aeroambulancias') >= 0),
    '🔴 no hay UNA SOLA fila bajo la empresa ajena');
  /* DISCRIMINADOR · el maestro sí la escribe donde pide */
  PRUEBAS.cierto(p212J(api.accionGestionGuardar({ usuario: '*', empresa: 'Aeroambulancias Silva', pass: 'clave-maestra', gestion: p212Gest('g_maestro') })).ok,
    'DISCRIMINADOR · el maestro escribe…');
  PRUEBAS.igual((p212Filas(api).find(f => String(f[1]) === 'g_maestro') || [])[0], 'Aeroambulancias Silva',
    '…y la suya SÍ queda bajo la empresa que pidió');
});

PRUEBAS.caso('⚠️ y tampoco LEE la empresa ajena', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* `accionGestiones` filtra por `norm(gestScope(acc, p.empresa))`, así que el mismo recorte vale
     para la lectura: pedir la empresa ajena devuelve lo de la propia, no lo de la ajena. */
  const api = p212Api();
  api.accionGestionGuardar({ usuario: '*', empresa: 'Aeroambulancias Silva', pass: 'clave-maestra', gestion: p212Gest('g_de_silva') });
  api.accionGestionGuardar({ usuario: 'Grupo Norte', empresa: 'Aerocentro', pass: 'med-gn', gestion: p212Gest('g_de_gn') });
  const leidas = (p212J(api.accionGestiones({ usuario: 'Grupo Norte', empresa: 'Aeroambulancias Silva', pass: 'med-gn' })).gestiones || []).map(x => x.id);
  PRUEBAS.falso(leidas.indexOf('g_de_silva') >= 0, '⚠️ pidiendo la ajena NO le llega la gestión de esa empresa');
  PRUEBAS.cierto(leidas.indexOf('g_de_gn') >= 0, 'le llega la suya, que es donde el pedido cayó');
});
