/* ── P214 · el rol sale de una celda que se escribe a mano ────────────────────────────────────────
   (2026-10-02)

   `acc.rol === "admin"` NO alcanza para decidir nada que exponga datos de otra empresa. El rol se
   lee de la **columna C de `Accesos`** (`"Rol (supervisor ve solo su empresa, admin ve todas)"`),
   que la edita gente de la empresa: basta escribir «admin» en una fila cualquiera. El maestro
   legítimo es el usuario `*`, y `validarAcceso` le arma un literal propio
   —`{rol:"admin", empresas:null, canonical:null}`— ignorando a propósito su columna EMPRESAS.

   P212 cerró esta errata SÓLO para `gestScope` y dejó la deuda escrita con nombre en su propio
   comentario. P214 la cierra en las tres superficies que faltaban, y la peor no era la nómina:

     1 · EL VISOR (`accesoPanel_`) · un admin de fila pedía `verEmpresa` de cualquier empresa y el
         servidor le fabricaba su `acc`: panel completo, con registros, métricas de salud, PVT,
         comentarios y turnos. La nómina da nombre y cédula; esto da datos clínicos.
     2 · LA LISTA DE EMPRESAS CLIENTES (`cuentasPanel_`) · más `atajosAdmin`, que trae NOMBRE Y
         CÉDULA de personas.
     3 · LA NÓMINA (`accionNominaListar` y el diagnóstico de unificación).

   ⚠️ MEDIDO CONTRA EL CH ANTES DE TOCAR: de las 16 cuentas en producción la ÚNICA con rol admin es
   el maestro `*`. Las otras 15 son 8 `supervisor`, 5 con el rol VACÍO —que `validarAcceso` cae a
   `supervisor`— y 2 con `-`, que no es admin por ninguna comparación. Ninguna cuenta viva cambia de
   comportamiento.

   ⚠️ R17 · ACÁ NO SE ARMA NINGÚN `acc` A MANO. Las cuentas se declaran como filas de `Accesos` y se
   autentican con `validarAcceso`, que es quien deriva `rol`, `empresas` y `canonical`. Armar el
   `acc` a mano probaría el candado y no que `validarAcceso` le pueda dar lo que pide — el defecto
   que este proyecto ya pagó tres veces. */

PRUEBAS.grupo('P214 · el rol y la nómina');

/* La fecha de HOY en ISO: `ausenciasDe` expande el rango a días sueltos y el panel pregunta por el
   día de hoy, así que una fecha fija dejaría el índice vacío mañana. */
const P214_HOY = (function () { const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();

const P214_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];

function p214Api(fns) {
  const env = GS.crearEntorno({
    'Accesos': [P214_CAB,
      /* el MAESTRO: usuario `*`, sin lista → ve todo */
      ['*', 'clave-maestra', 'admin', '', '', ''],
      /* un ADMIN DE FILA con DOS empresas: el caso que importa */
      ['Grupo Norte', 'clave-gn', 'admin', 'Aerocentro, Consorcio HELITEC', '', ''],
      /* una empresa AJENA al admin de fila */
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', ''],
      /* y otra, para que la lista de cuentas tenga más de una afuera */
      ['Cardon', 'clave-cd', 'supervisor', 'Cardon', '', '']],
    /* ⚠️ `SES_HEAD` REAL, 13 columnas con `HashToken` en la segunda (ver la nota de abajo). */
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('⚠️ la premisa · el rol sale de la columna C, y `esAdminMaestro_` distingue al maestro del admin de fila', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`: no se midió nada'); return; }
  const api = p214Api(['validarAcceso', 'esAdminMaestro_', 'empresasPermitidas_']);
  /* ⚠️ los dos `acc` salen de `validarAcceso`, no de un literal */
  const maestro = api.validarAcceso('*', 'clave-maestra', 'd1');
  const deFila  = api.validarAcceso('Grupo Norte', 'clave-gn', 'd2');
  const sup     = api.validarAcceso('Aeropostal', 'clave-ap', 'd3');
  PRUEBAS.igual(maestro && maestro.rol, 'admin', 'guarda: el maestro entra como admin…');
  PRUEBAS.igual(maestro && maestro.empresas, null, '…y sin lista de empresas (`null` = todas)');
  PRUEBAS.igual(deFila && deFila.rol, 'admin', '🔴 LA PREMISA · «admin» escrito en una fila DA rol admin…');
  PRUEBAS.igual(JSON.stringify(deFila && deFila.empresas), JSON.stringify(['Aerocentro', 'Consorcio HELITEC']),
    '…pero CON lista propia, que es lo que lo distingue');
  PRUEBAS.cierto(!!(deFila && deFila.canonical), '…y con canónico cargado, que el maestro no tiene');
  /* el candado */
  PRUEBAS.cierto(api.esAdminMaestro_(maestro), '🔴 `esAdminMaestro_` reconoce al maestro');
  PRUEBAS.falso(api.esAdminMaestro_(deFila), '🔴 y NO al admin de fila');
  PRUEBAS.falso(api.esAdminMaestro_(sup), 'ni al supervisor');
  PRUEBAS.falso(api.esAdminMaestro_(null), 'ni a un `acc` nulo: no lanza, devuelve false');
  PRUEBAS.falso(api.esAdminMaestro_(undefined), 'ni a `undefined` — es lo que llega como `acc.base` sin visor');
  /* y el alcance que se deriva de ese `acc`
     ⚠️ ESTE ASERTO AFIRMABA EL MODELO VIEJO. Decía «el admin de fila queda con sus DOS empresas, no
     con una», y era un caso **bendiciendo un diseño equivocado**: la columna EMPRESAS son VARIANTES
     DE UNA MISMA EMPRESA, no una lista de empresas distintas (lo dicen `construirAliasLeer_`, el
     comentario de `nominaEmpresaCanon` y el `r.empresa = acc.canonical` de `accionSupervisor`). Lo
     midió el verificador: con la celda leída como lista, el admin perdía su propia empresa en
     cuanto otra fila ganaba el alias. Ahora el alcance es UN canónico. */
  /* ⚠️ ESTE ASERTO SE ESCRIBIÓ MAL TRES VECES, una por cada versión de `empresasPermitidas_`, y
     siempre por la misma razón: afirmaba **la forma del resultado** («la lista cruda», «UN
     canónico») en vez del INVARIANTE. Un caso así no verifica nada — bendice la implementación del
     día, y cuando la implementación cambia hay que reescribirlo, que es justo lo que no debería
     pasar. El invariante es: toda variante que la celda declare está dentro, y nada ajeno. */
  PRUEBAS.igual(api.empresasPermitidas_(maestro), null, '🔴 el maestro no se filtra (`null` = todas)');
  const permFila = api.empresasPermitidas_(deFila) || [];
  PRUEBAS.cierto(permFila.indexOf('aerocentro') >= 0,
    '🔴 el alcance del admin de fila CONTIENE la variante que declara su celda');
  PRUEBAS.igual(permFila.indexOf('aeropostal'), -1, '🔴 y NO contiene una empresa ajena');
  PRUEBAS.cierto((api.empresasPermitidas_(sup) || []).indexOf('aeropostal') >= 0,
    'y un supervisor, el suyo');
  /* y el invariante que las tres versiones tenían que cumplir y sólo cumple la tercera: TODAS las
     variantes de una celda multi-variante — la forma real de 3 de las 16 cuentas de producción */
  PRUEBAS.cierto(api.esAdminMaestro_(maestro), 'guarda: el maestro sigue siendo maestro');
});

PRUEBAS.caso('🔴 EL VISOR · un admin de fila no puede mirar una empresa ajena', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214Api(['accesoPanel_', 'validarAcceso']);
  /* ⚠️ se entra por `accesoPanel_`, que es por donde entra el panel de verdad */
  const ajena = api.accesoPanel_({ usuario: 'Grupo Norte', pass: 'clave-gn', dispositivoId: 'd',
    verEmpresa: 'Aeropostal', verVista: 'medico' });
  PRUEBAS.igual(ajena && ajena.visorError, 'empresa', '🔴 pedir una empresa AJENA da `visorError`');
  PRUEBAS.falso(!!(ajena && ajena.visor), '🔴 y NO se abre el visor');
  PRUEBAS.falso(String(ajena && ajena.canonical || '').toLowerCase().indexOf('aeropostal') === 0,
    '🔴 el `acc` NO quedó apuntando a la empresa ajena');
  /* DISCRIMINADOR · una empresa de SU lista sí se abre: el rechazo es por el permiso, no por el camino */
  const propia = api.accesoPanel_({ usuario: 'Grupo Norte', pass: 'clave-gn', dispositivoId: 'd',
    verEmpresa: 'Consorcio HELITEC', verVista: 'medico' });
  PRUEBAS.cierto(!!(propia && propia.visor), 'DISCRIMINADOR · una empresa de SU lista SÍ abre el visor…');
  PRUEBAS.igual(propia && propia.visorError, undefined, '…sin error');
  PRUEBAS.cierto(!!(propia && propia.soloLectura), '…y en sólo lectura (ADR 007: el visor no escribe)');
  /* LO QUE NO PUEDE CAMBIAR · el maestro sigue mirando cualquier empresa */
  const delMaestro = api.accesoPanel_({ usuario: '*', pass: 'clave-maestra', dispositivoId: 'd',
    verEmpresa: 'Aeropostal', verVista: 'medico' });
  PRUEBAS.cierto(!!(delMaestro && delMaestro.visor), '🔴 NO PUEDE CAMBIAR · el maestro sigue mirando cualquier empresa');
  PRUEBAS.igual(delMaestro && delMaestro.visorError, undefined, '…sin error');
});

PRUEBAS.caso('🔴 EL VISOR · mirar con otra vista no amplía el alcance', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214Api(['accesoPanel_', 'validarAcceso', 'esAdminMaestro_', 'gestScope']);
  /* sólo `verVista`, sin empresa: la rama que fabricaba el literal del maestro */
  const porVista = api.accesoPanel_({ usuario: 'Grupo Norte', pass: 'clave-gn', dispositivoId: 'd',
    verVista: 'hseq' });
  PRUEBAS.cierto(!!(porVista && porVista.visor), 'guarda: el visor por vista se abre (es legítimo)');
  PRUEBAS.falso(api.esAdminMaestro_(porVista),
    '🔴 y la sesión resultante NO pasa por maestro: antes fabricaba `{empresas:null, canonical:null}`');
  PRUEBAS.cierto(!!(porVista && porVista.canonical), '🔴 conserva su canónico…');
  PRUEBAS.igual(JSON.stringify(porVista && porVista.empresas), JSON.stringify(['Aerocentro', 'Consorcio HELITEC']),
    '…y su lista de empresas');
  /* la consecuencia medible: `gestScope` ya no le da una empresa ajena */
  PRUEBAS.falso(api.gestScope(porVista, 'Aeropostal').toLowerCase() === 'aeropostal',
    '🔴 y `gestScope` ya no le devuelve la empresa ajena que pide');
  /* LO QUE NO PUEDE CAMBIAR · el maestro por vista queda idéntico */
  const maestroPorVista = api.accesoPanel_({ usuario: '*', pass: 'clave-maestra', dispositivoId: 'd',
    verVista: 'hseq' });
  PRUEBAS.cierto(api.esAdminMaestro_(maestroPorVista),
    '🔴 NO PUEDE CAMBIAR · el maestro mirando por vista SIGUE siendo maestro');
  PRUEBAS.igual(api.gestScope(maestroPorVista, 'Aeropostal'), 'Aeropostal',
    '…y sigue pudiendo indicar cualquier empresa');
});

PRUEBAS.caso('🔴 LA LISTA DE EMPRESAS CLIENTES · un admin de fila sólo recibe las suyas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214Api(['cuentasPanel_', 'empresasPermitidas_', 'validarAcceso']);
  const deFila = api.validarAcceso('Grupo Norte', 'clave-gn', 'd');
  const nombres = l => (l || []).map(x => String(x.empresa));
  /* el maestro: sin recorte */
  const todas = nombres(api.cuentasPanel_(null));
  PRUEBAS.alMenos(todas.length, 3, 'guarda: hay al menos tres empresas en la hoja');
  PRUEBAS.cierto(todas.indexOf('Aeropostal') >= 0, 'guarda: y «Aeropostal» es una de ellas');
  /* el admin de fila: sólo las suyas */
  const suyas = nombres(api.cuentasPanel_(api.empresasPermitidas_(deFila)));
  PRUEBAS.igual(suyas.indexOf('Aeropostal'), -1, '🔴 NO recibe «Aeropostal», que no es suya');
  PRUEBAS.igual(suyas.indexOf('Cardon'), -1, '🔴 ni «Cardon»');
  PRUEBAS.cierto(suyas.indexOf('Aerocentro') >= 0, '🔴 y SÍ recibe «Aerocentro», que es suya…');
  PRUEBAS.igual(suyas.length, 1, '…una sola fila, porque sus dos empresas son variantes de la MISMA fila');
});

PRUEBAS.caso('🔴 LA NÓMINA · un admin de fila sólo ve a su gente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P214_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Grupo Norte', 'clave-gn', 'admin', 'Aerocentro, Consorcio HELITEC', '', ''],
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Aerocentro', 'ANA SUAREZ', 'V-111', 'Operaciones', 'Piloto'],
      ['Aeropostal', 'PEDRO GOMEZ', 'V-222', 'Mantenimiento', 'Tecnico']],
    /* ⚠️ `SES_HEAD` REAL, 13 columnas con `HashToken` en la segunda. Los fixtures que escribí
       primero tenían 11 y todo corrido un lugar: `Estado` caía donde el código lee `UltimoUso`.
       Hoy ningún caso de P214 pasa por el token, pero un fixture corrido hace que cualquier aserto
       que alguien agregue después pase por vacío sin avisar. Lo midió el verificador. */
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaListar', 'validarAcceso']);
  /* ⚠️ LA CLAVE ES `nomina`, verificado corriendo la acción — no `filas` ni `r`, que es lo que
     supuse primero. Con la clave equivocada la lista venía SIEMPRE vacía, y entonces el aserto
     «no ve a la persona ajena» pasaba por vacío: una afirmación negativa sobre una lista vacía
     pasa con cualquier basura. Por eso abajo va la guarda de que la lista NO esté vacía. */
  const nombres = r => { const d = JSON.parse(r.getContent());
    return d.ok === false ? ('🔴 ' + (d.error || d.motivo)) : (d.nomina || []).map(x => String(x.persona)); };
  const suyos = nombres(api.accionNominaListar({ usuario: 'Grupo Norte', pass: 'clave-gn', dispositivoId: 'd' }));
  if (typeof suyos === 'string') { PRUEBAS.cierto(false, 'la acción no devolvió filas: ' + suyos); return; }
  /* ⚠️ LA GUARDA QUE HACE VALER EL ASERTO DE ABAJO: si la lista viniera vacía, «no ve al ajeno»
     pasaría sin medir nada. Me pasó con la clave equivocada del payload. */
  PRUEBAS.alMenos(suyos.length, 1, 'guarda: la lista NO está vacía, así que el aserto de abajo mide algo');
  PRUEBAS.igual(suyos.indexOf('PEDRO GOMEZ'), -1, '🔴 el admin de fila NO ve a la persona de la empresa ajena');
  PRUEBAS.cierto(suyos.indexOf('ANA SUAREZ') >= 0, '🔴 y SÍ ve a la de su propia empresa');
  /* LO QUE NO PUEDE CAMBIAR · el maestro ve a los dos */
  const delMaestro = nombres(api.accionNominaListar({ usuario: '*', pass: 'clave-maestra', dispositivoId: 'd' }));
  PRUEBAS.cierto(Array.isArray(delMaestro) && delMaestro.indexOf('PEDRO GOMEZ') >= 0 && delMaestro.indexOf('ANA SUAREZ') >= 0,
    '🔴 NO PUEDE CAMBIAR · el maestro sigue viendo a todos');
  /* y el supervisor, igual que siempre */
  const delSup = nombres(api.accionNominaListar({ usuario: 'Aeropostal', pass: 'clave-ap', dispositivoId: 'd' }));
  PRUEBAS.cierto(Array.isArray(delSup) && delSup.indexOf('PEDRO GOMEZ') >= 0, 'el supervisor ve su gente…');
  PRUEBAS.igual(Array.isArray(delSup) ? delSup.indexOf('ANA SUAREZ') : 0, -1, '…y sólo la suya');
});

/* ── Las cinco superficies que el BARRIDO encontró después, y que son peores ──────────────────────
   Un subagente recorrió las ~30 derivaciones de «es admin» del `.gs` y EJECUTÓ el caso con «admin»
   escrito en la columna C. Encontró cinco más, y una de ellas es mayor que todas las de arriba:
   `accionSupervisor` devolvía el PANEL ENTERO. Y dejó anotado por qué cerrar sólo `accesoPanel_`
   no alcanzaba: el visor con sólo `verVista` devuelve `rol:"admin"` legítimamente, y
   `accionSupervisor` lo trataba como global sin mirar `acc.empresas`. */

function p214ApiPanel(fns) {
  const env = GS.crearEntorno({
    'Accesos': [P214_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Grupo Norte', 'clave-gn', 'admin', 'Aerocentro', '', ''],
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', '']],
    'Respuestas de formulario 1': [['Fecha', 'Hora', 'Empresa', 'Nombre', 'KSS', 'Estres']],
    /* ⚠️ `Operacional` CON FILAS DE LAS DOS EMPRESAS, y es lo que faltaba para medir la fuga más
       grande. El caso de abajo medía `cuentas` y `atajosAdmin` —que es otra defensa— y los cinco
       conjuntos del panel venían VACÍOS, así que la reversión de `accionSupervisor` no la cazaba
       ningún caso de la suite: la única red era el discriminador, que es un script de una corrida.
       Lo midió el verificador. Se mide por `operacional` y no por `registros` porque
       `Respuestas de formulario 1` tiene ~90 columnas con dos filas de encabezado, y el MISMO
       `enAlcance` filtra los cuatro conjuntos. */
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [P214_HOY, '08:00', P214_HOY + 'T08:00:00', 'e1', 'ANA SUAREZ', 'Aerocentro', 'Operaciones', 'Piloto', 'inicio', '', '', ''],
      [P214_HOY, '09:00', P214_HOY + 'T09:00:00', 'e2', 'PEDRO GOMEZ', 'Aeropostal', 'Mantenimiento', 'Tecnico', 'inicio', '', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Aerocentro', 'ANA SUAREZ', 'V-111', 'Operaciones', 'Piloto'],
      ['Aeropostal', 'PEDRO GOMEZ', 'V-222', 'Mantenimiento', 'Tecnico']],
    /* ⚠️ `AUS_HEAD` REAL, 12 columnas: `Cedula` va ANTES de `Persona` y la 8ª es `Estado`, que
       `ausenciasDe` exige igual a «vigente». Mi primer fixture las tenía cruzadas y ponía `'x'` en
       la columna que el código lee como estado, así que la fila se descartaba como anulada y el
       índice salía vacío para todos — cualquier aserto ahí pasaba por vacío. Lo midió el
       verificador. */
    'Ausencias': [['IdAusencia', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor', 'Anulada', 'AnuladaPor'],
      ['a1', 'Aeropostal', 'V-222', 'PEDRO GOMEZ', P214_HOY, P214_HOY, 'franco', 'vigente', '', '', '', ''],
      ['a2', 'Aerocentro', 'V-111', 'ANA SUAREZ', P214_HOY, P214_HOY, 'franco', 'vigente', '', '', '', '']],
    /* ⚠️ La hoja de configuración es «Config Empresa» (`HOJA_CONFIG`), verificado en el `.gs`. Mi
       primer fixture declaró «Configuracion» y `atajosAdminLeer_` devolvía `[]`: el atajo no
       existía y el caso se rechazaba por eso, no por el candado. */
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    /* ⚠️ `SES_HEAD` REAL, 13 columnas con `HashToken` en la segunda. Los fixtures que escribí
       primero tenían 11 y todo corrido un lugar: `Estado` caía donde el código lee `UltimoUso`.
       Hoy ningún caso de P214 pasa por el token, pero un fixture corrido hace que cualquier aserto
       que alguien agregue después pase por vacío sin avisar. Lo midió el verificador. */
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra']]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 AUSENCIAS · `ausScope` no le da una empresa ajena a un admin de fila (9 llamadores)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214Api(['ausScope', 'validarAcceso', 'construirAlias', 'esAdminMaestro_']);
  const deFila  = api.validarAcceso('Grupo Norte', 'clave-gn', 'd');
  const maestro = api.validarAcceso('*', 'clave-maestra', 'd');
  const alias = api.construirAlias();
  /* pide una empresa que NO es suya */
  const ajena = api.ausScope(deFila, alias, 'Aeropostal');
  PRUEBAS.falso(String(ajena).toLowerCase().indexOf('aeropostal') === 0,
    '🔴 pedir «Aeropostal» NO devuelve «Aeropostal»…');
  PRUEBAS.cierto(String(ajena).toLowerCase().indexOf('aerocentro') === 0,
    '…cae a la SUYA, que es lo que hace un supervisor');
  /* DISCRIMINADOR · una empresa suya sí se la da */
  PRUEBAS.cierto(String(api.ausScope(deFila, alias, 'Aerocentro')).toLowerCase().indexOf('aerocentro') === 0,
    'DISCRIMINADOR · una empresa SUYA sí se la devuelve');
  /* LO QUE NO PUEDE CAMBIAR */
  PRUEBAS.igual(api.ausScope(maestro, alias, 'Aeropostal'), 'Aeropostal',
    '🔴 NO PUEDE CAMBIAR · el maestro sigue pudiendo indicar cualquier empresa');
  PRUEBAS.igual(api.ausScope(maestro, alias, ''), '',
    '…y sin empresa sigue devolviendo vacío (P213: `depEmpresaValida`)');
  const sup = api.validarAcceso('Aeropostal', 'clave-ap', 'd');
  PRUEBAS.igual(api.ausScope(sup, alias, 'Aerocentro'), 'Aeropostal',
    '🔴 NO PUEDE CAMBIAR · el supervisor sigue anclado a la suya, pida lo que pida');
});

PRUEBAS.caso('🔴 EL PANEL ENTERO · `accionSupervisor` recorta por la lista de un admin de fila', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214ApiPanel(['accionSupervisor', 'validarAcceso']);
  const pedir = (usuario, pass, extra) => {
    const d = JSON.parse(api.accionSupervisor(Object.assign(
      { usuario: usuario, pass: pass, dispositivoId: 'd' }, extra || {})).getContent());
    return d;
  };
  /* ⚠️ LA FUGA SE MIDE POR `cuentas`, que es lo que esta acción sí devuelve con este fixture
     mínimo: `registros` sale de `Respuestas de formulario 1`, que acá está vacía a propósito para
     no tener que fabricar un formulario entero. Lo que importa es que el admin de fila NO reciba
     el inventario de empresas ajenas. */
  const deFila = pedir('Grupo Norte', 'clave-gn');
  PRUEBAS.cierto(deFila.ok, 'guarda: la acción responde ok para el admin de fila');
  /* ── LA FUGA MÁS GRANDE, medida sobre el panel de verdad ───────────────────────────────────── */
  const personas = d => (d.operacional || []).map(x => String(x.persona || ''));
  const delMaestroPanel = personas(pedir('*', 'clave-maestra'));
  /* ⚠️ LA GUARDA QUE HACE VALER EL ASERTO: si el panel viniera vacío para todos, «no ve al ajeno»
     pasaría sin medir nada. Es exactamente lo que pasaba antes de agregar `Operacional`. */
  PRUEBAS.alMenos(delMaestroPanel.length, 2, 'guarda: el panel del maestro trae a las DOS personas');
  PRUEBAS.cierto(delMaestroPanel.indexOf('PEDRO GOMEZ') >= 0 && delMaestroPanel.indexOf('ANA SUAREZ') >= 0,
    '🔴 NO PUEDE CAMBIAR · el maestro sigue viendo el panel entero');
  const panelDeFila = personas(deFila);
  PRUEBAS.igual(panelDeFila.indexOf('PEDRO GOMEZ'), -1,
    '🔴 el admin de fila NO recibe en el panel a la persona de la empresa ajena');
  PRUEBAS.cierto(panelDeFila.indexOf('ANA SUAREZ') >= 0, '🔴 y SÍ a la de su propia empresa');
  /* ── y el índice de AUSENCIAS, que no tenía ningún instrumento ───────────────────────────────
     ⚠️ HAY QUE PEDIR LA EMPRESA: sin `p.empresa` el índice vuelve `{}` para CUALQUIER admin
     (`if (!empAus …) return {}`, preexistente y correcto), así que medirlo sin empresa daba vacío
     para todos y no medía nada. */
  const clavesAus = (u, pw) => Object.keys((pedir(u, pw, { empresa: 'Aeropostal' }) || {}).ausencias || {}).join(' | ');
  PRUEBAS.cierto(/222|pedro/i.test(clavesAus('*', 'clave-maestra')),
    'guarda: el maestro pidiendo esa empresa SÍ recibe la ausencia en el índice');
  PRUEBAS.falso(/222|pedro/i.test(clavesAus('Grupo Norte', 'clave-gn')),
    '🔴 el admin de fila NO, pida lo que pida · y acá el dato está en la CLAVE (`cedula|fecha`), que ninguna anonimización tapa (A13)');
  const empsDeFila = (deFila.cuentas || []).map(x => String(x.empresa));
  PRUEBAS.igual(empsDeFila.indexOf('Aeropostal'), -1, '🔴 el admin de fila NO recibe la empresa ajena en `cuentas`');
  PRUEBAS.igual(deFila.atajosAdmin, null, '🔴 ni los atajos, que traen NOMBRE Y CÉDULA de personas');
  /* LO QUE NO PUEDE CAMBIAR · el maestro recibe todo */
  const maestro = pedir('*', 'clave-maestra');
  PRUEBAS.cierto(maestro.ok, 'guarda: y la acción responde ok para el maestro');
  const empsMaestro = (maestro.cuentas || []).map(x => String(x.empresa));
  PRUEBAS.cierto(empsMaestro.indexOf('Aeropostal') >= 0,
    '🔴 NO PUEDE CAMBIAR · el maestro sigue recibiendo todas las empresas');
  PRUEBAS.alMenos(empsMaestro.length, 2, '…las dos');
  /* y un supervisor nunca recibió nada de esto */
  const sup = pedir('Aeropostal', 'clave-ap');
  PRUEBAS.igual(sup.cuentas, null, 'el supervisor sigue sin recibir `cuentas`');
});

PRUEBAS.caso('🔴 ENTRAR COMO · un admin de fila no entra como una persona de otra empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214ApiPanel(['accionAdminEntrarComo', 'validarAcceso']);
  /* el atajo apunta a una persona de «Aeropostal», que NO es del admin de fila */
  const cfg = api.__env.__libro.getSheetByName('Config Empresa');
  cfg.appendRow(['', 'atajos_admin', JSON.stringify([{ empresa: 'Aeropostal', nombre: 'PEDRO GOMEZ', cedula: 'V-222' }])]);
  /* ⚠️ `_post: true` NO ES DECORATIVO. `accionAdminEntrarComo` arranca con
     `if (!p._post) return json({error:"Metodo no permitido."})`, así que sin esto el pedido se
     rechazaba ANTES de llegar a cualquier candado de rol — y mis dos primeros asertos
     (`falso(r.ok)`) pasaban por eso. Un verde que no ejercita lo que dice medir. */
  const pedir = (usuario, pass) => JSON.parse(api.accionAdminEntrarComo({ usuario: usuario, pass: pass,
    dispositivoId: 'd', cedula: 'V-222', _post: true }).getContent());
  /* la guarda que lo hace valer: el atajo TIENE que estar cargado */
  PRUEBAS.alMenos(api.__env.__libro.getSheetByName('Config Empresa').getDataRange().getValues().length, 2,
    'guarda: el atajo quedó escrito en la hoja');
  const r = pedir('Grupo Norte', 'clave-gn');
  PRUEBAS.falso(r.ok, '🔴 se rechaza · ' + String(r.motivo || r.error || '').slice(0, 40));
  PRUEBAS.falso(/metodo no permitido/i.test(String(r.error || '')),
    '🔴 y NO por «Metodo no permitido»: el caso llega de verdad al candado');
  PRUEBAS.igual(r.motivo, 'sin_atajo',
    '🔴 y con el MISMO motivo que si el atajo no existiera: un motivo propio confirmaría que esa cédula está en la lista');
  PRUEBAS.igual(JSON.stringify(r).indexOf('PEDRO'), -1, '🔴 y la respuesta no nombra a la persona');
  /* DISCRIMINADOR · el maestro sí puede, así que el rechazo es por el permiso y no porque el atajo esté roto */
  const delMaestro = pedir('*', 'clave-maestra');
  PRUEBAS.falso(delMaestro.motivo === 'sin_atajo',
    'DISCRIMINADOR · al maestro NO se le rechaza por el atajo (llega más adentro) · ' + String(delMaestro.motivo || 'ok'));
});

PRUEBAS.caso('🔴 EL PLAN DE HORAS · un admin de fila no escribe la config de otra empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214ApiPanel(['accionCicloConfigGuardar', 'validarAcceso']);
  const filasCfg = () => { const sh = api.__env.__libro.getSheetByName('Config Empresa');
    return sh ? sh.getDataRange().getValues().length : 0; };
  /* ⚠️ EL PAYLOAD ES `plan`, un JSON con las cuatro claves de `CICLO_PLAN_CLAVES` y cada tramo
     entre 5 y 1440 minutos. Mi primera versión mandaba `horas:'8'` y la acción cortaba en
     «Cada tramo va entre 5 y 1440 minutos» — otra vez un rechazo que no era el candado. */
  const plan = JSON.stringify({ traslado: 60, jornada: 480, regreso: 60, descanso: 600 });
  const guardar = (empresa) => JSON.parse(api.accionCicloConfigGuardar({ usuario: 'Grupo Norte',
    pass: 'clave-gn', dispositivoId: 'd', empresa: empresa, plan: plan, quien: 'x' }).getContent());
  const antes = filasCfg();
  const r = guardar('Aeropostal');
  PRUEBAS.falso(r.ok, '🔴 se rechaza escribir bajo la empresa ajena · ' + String(r.motivo || r.error || '').slice(0, 40));
  PRUEBAS.igual(r.motivo, 'sin_empresa', '…con el motivo que el cliente ya sabe traducir');
  PRUEBAS.igual(filasCfg(), antes, '🔴 y NO quedó ninguna fila escrita en `Config Empresa`');
  /* DISCRIMINADOR · con la empresa SUYA el candado de P214 no corta. Sin esto, un rechazo por
     cualquier otra razón (el plan mal armado, la vista, el POST) se leería como éxito del candado. */
  const propia = guardar('Aerocentro');
  PRUEBAS.falso(propia.motivo === 'sin_empresa',
    'DISCRIMINADOR · con su PROPIA empresa el candado no corta · ' + String(propia.motivo || propia.error || 'ok').slice(0, 44));
});

PRUEBAS.caso('🔴 EL PADRÓN · el informe de identidades no le da el CH entero a un admin de fila', () => {
  /* ⚠️ ESTE ARREGLO NO TENÍA NINGÚN INSTRUMENTO: no estaba en el discriminador (sus cuatro
     reversiones son otras) ni en los nueve casos. Lo midió el verificador. `accionIdentidadesInforme`
     devuelve `candidatos` con cédula y nombre en limpio, `sinResolver` con empresa y los nombres
     ambiguos — el padrón de TODO el CH cuando `permitidas` quedaba en `null`. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p214ApiPanel(['accionIdentidadesInforme', 'validarAcceso']);
  const pedir = (u, pw) => JSON.parse(api.accionIdentidadesInforme({ usuario: u, pass: pw,
    dispositivoId: 'd' }).getContent());
  /* ⚠️ SE MIDE POR `enPadron`, no por buscar el nombre en el JSON: `candidatos` y `sinResolver`
     vienen vacíos sin filas en `Respuestas de formulario 1` —90 columnas y dos filas de encabezado,
     no vale fabricarlas para esto— así que buscar «PEDRO» en el texto daba `false` para todos y no
     medía nada. `enPadron` cuenta las personas del padrón YA recortado. */
  const delMaestro = pedir('*', 'clave-maestra');
  PRUEBAS.cierto(delMaestro.ok, 'guarda: la acción responde ok para el maestro');
  PRUEBAS.igual(Number(delMaestro.enPadron || 0), 2,
    'guarda: el padrón del maestro trae a las DOS personas — sin esto, el aserto de abajo no mide nada');
  const deFila = pedir('Grupo Norte', 'clave-gn');
  PRUEBAS.cierto(deFila.ok, 'guarda: y también para el admin de fila');
  PRUEBAS.igual(Number(deFila.enPadron || 0), 1,
    '🔴 pero el del admin de fila trae UNA: la persona de la otra empresa no está');
  PRUEBAS.falso(String(deFila.alcance || '') === 'todas', '🔴 y su alcance ya no dice «todas»');
});

PRUEBAS.caso('🔴 MULTI-VARIANTE · el supervisor ve su gente por cualquier variante que nadie le dispute', () => {
  /* ⚠️ ESTA ES LA FORMA REAL DE PRODUCCIÓN, medida el 2026-10-02 con
     `tarea=gestiones_del_supervisor` (la única que devuelve `empresasCelda` CRUDA — `tarea=volcar`
     la ENMASCARA, porque su regex de columnas sensibles incluye «usuario» y el encabezado de
     EMPRESAS dice «la lista de empresas que USUARIO ve»):
       · IAIM                   → 2 variantes
       · Consorcio HELITEC      → 3
       · Aeroambulancias Silva  → 5 («Aeroambulancias Silva», «Aer. silva», «Silva», «… C.A.»)

     ⚠️ Y ESTE CASO AFIRMABA UN DERECHO QUE NO EXISTE. Decía que el supervisor ve la persona
     etiquetada con su segunda variante **incluso cuando otra fila reclama esa variante**, y eso es
     falso por diseño: la autoridad sobre a qué empresa pertenece una etiqueta es
     `nominaEmpresaCanon`, y `construirAliasLeer_` se la da a la ÚLTIMA fila que la nombre. Si otra
     fila se la quedó, la persona es de ella. La afirmación venía de una premisa que después se
     midió falsa (que acotar por el canónico «le quitaba nómina a tres supervisores reales»: 0
     diferencias sobre 541 claves con las celdas reales), y la misma afirmación vivía como métrica
     en el discriminador, donde se contradecía con otra métrica sobre LA MISMA FILA.
     Las dos mitades correctas están abajo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const armar = (filas) => {
    const env = GS.crearEntorno({
      'Accesos': [P214_CAB, ['*', 'clave-maestra', 'admin', '', '', '']].concat(filas),
      'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
        ['Multisur', 'ANA PRIMERA', 'V-111', 'Operaciones', 'Piloto'],
        ['Multi Sur C.A.', 'LUIS SEGUNDA', 'V-222', 'Operaciones', 'Piloto']],
      'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
    });
    const api = GS.cargarGs(CTX.gs, env, ['accionNominaListar', 'validarAcceso', 'construirAlias',
      'nominaEmpresaCanon']);
    api.nom = (u, pw) => ((JSON.parse(api.accionNominaListar({ usuario: u, pass: pw,
      dispositivoId: 'd' }).getContent()).nomina) || []).map(x => String(x.persona));
    return api;
  };

  /* ── MITAD 1 · nadie le disputa las variantes: ve a TODA su gente ───────────────────────────── */
  const solo = armar([['Multi', 'clave-mu', 'supervisor', 'Multisur, Multi Sur C.A.', '', '']]);
  PRUEBAS.igual(solo.nominaEmpresaCanon(solo.construirAlias(), 'Multi Sur C.A.'), 'Multisur',
    'guarda: sin disputa, el canon de la segunda variante ES su canónico');
  const todos = solo.nom('Multi', 'clave-mu');
  PRUEBAS.cierto(todos.indexOf('ANA PRIMERA') >= 0, '🔴 ve a la de su PRIMERA variante…');
  PRUEBAS.cierto(todos.indexOf('LUIS SEGUNDA') >= 0, '🔴 …y a la de la SEGUNDA, que también es suya');
  PRUEBAS.igual(todos.length, 2, '🔴 las dos: toda su gente');

  /* ── MITAD 2 · otra fila RECLAMA la segunda variante: esa persona ya no es suya ──────────────── */
  const conDisputa = armar([
    ['Multi', 'clave-mu', 'supervisor', 'Multisur, Multi Sur C.A.', '', ''],
    /* posterior, así que `construirAliasLeer_` le da el canon de esa variante */
    ['Sur', 'clave-su', 'supervisor', 'Multi Sur C.A.', '', '']]);
  PRUEBAS.igual(conDisputa.nominaEmpresaCanon(conDisputa.construirAlias(), 'Multi Sur C.A.'), 'Multi Sur C.A.',
    'guarda: con disputa, el canon de esa variante pasó a la otra fila — el escenario está montado');
  const conD = conDisputa.nom('Multi', 'clave-mu');
  PRUEBAS.cierto(conD.indexOf('ANA PRIMERA') >= 0, '🔴 sigue viendo la suya indiscutida…');
  PRUEBAS.igual(conD.indexOf('LUIS SEGUNDA'), -1,
    '🔴 …y NO la disputada: el alias se la dio a la otra fila, así que es de ella');
  PRUEBAS.cierto(conDisputa.nom('Sur', 'clave-su').indexOf('LUIS SEGUNDA') >= 0,
    '🔴 y la otra fila SÍ la ve: la persona no se pierde, cambia de dueño');
  /* LO QUE NO PUEDE CAMBIAR · el maestro ve a las dos en los dos escenarios */
  PRUEBAS.igual(solo.nom('*', 'clave-maestra').length, 2, '🔴 NO PUEDE CAMBIAR · el maestro ve a las dos');
  PRUEBAS.igual(conDisputa.nom('*', 'clave-maestra').length, 2, '…con disputa también');
});

PRUEBAS.caso('🔴 COHERENCIA · toda empresa que el selector ofrece, el visor la abre', () => {
  /* ⚠️ ESTE ERA EL HUECO QUE QUEDABA, y el verificador lo midió deshaciendo la delegación: con
     `cuentasEnPermitidas_` preguntando distinto que `filaEsPermitida_`, el selector le ofrecía a una
     cuenta una empresa que el visor después rechazaba con «esa empresa no existe» — y el
     discriminador seguía en verde, porque su métrica sólo mira si la cuenta ve SU empresa, y por
     construcción no puede ver una oferta de MÁS.
     La afirmación que P214 escribió —«angostar acá angosta los dos a la vez y no puede volver a
     pasar que uno ofrezca lo que el otro rechaza»— no tenía instrumento. Éste es. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P214_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      /* un admin que nombra su empresa por la SEGUNDA variante de otra fila: el caso que rompía */
      ['AdmSeg', 'clave-as', 'admin', 'Multi Sur C.A.', '', ''],
      ['Multi', 'clave-mu', 'supervisor', 'Multisur, Multi Sur C.A.', '', ''],
      ['Sur', 'clave-su', 'supervisor', 'Multi Sur C.A.', '', ''],
      ['Aeropostal', 'clave-ap', 'supervisor', 'Aeropostal', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Multisur', 'ANA PRIMERA', 'V-111', 'Operaciones', 'Piloto'],
      ['Multi Sur C.A.', 'LUIS SEGUNDA', 'V-222', 'Operaciones', 'Piloto']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['cuentasPanel_', 'empresasPermitidas_', 'validarAcceso',
    'accesoPanel_']);
  /* para cada cuenta de admin, el selector y el visor tienen que coincidir EMPRESA POR EMPRESA */
  [['AdmSeg', 'clave-as'], ['*', 'clave-maestra']].forEach(([u, pw]) => {
    const acc = api.validarAcceso(u, pw, 'd');
    const ofrecidas = api.cuentasPanel_(api.empresasPermitidas_(acc)).map(x => String(x.empresa));
    PRUEBAS.alMenos(ofrecidas.length, 1, 'guarda · ' + u + ': el selector ofrece al menos una empresa');
    ofrecidas.forEach(emp => {
      const a = api.accesoPanel_({ usuario: u, pass: pw, dispositivoId: 'd',
        verEmpresa: emp, verVista: 'medico' });
      PRUEBAS.cierto(!!(a && a.visor) && !a.visorError,
        '🔴 ' + u + ' · el selector ofrece «' + emp + '» y el visor LA ABRE' +
        (a && a.visorError ? ' (dio ' + a.visorError + ')' : ''));
    });
  });
  /* DISCRIMINADOR · y el visor NO abre una que el selector no ofrece */
  const accAS = api.validarAcceso('AdmSeg', 'clave-as', 'd');
  const ofrecidasAS = api.cuentasPanel_(api.empresasPermitidas_(accAS)).map(x => String(x.empresa));
  PRUEBAS.igual(ofrecidasAS.indexOf('Aeropostal'), -1, 'guarda: «Aeropostal» no está ofrecida');
  const ajena = api.accesoPanel_({ usuario: 'AdmSeg', pass: 'clave-as', dispositivoId: 'd',
    verEmpresa: 'Aeropostal', verVista: 'medico' });
  PRUEBAS.igual(ajena && ajena.visorError, 'empresa',
    'DISCRIMINADOR · y una que NO ofrece, el visor la rechaza');
});

PRUEBAS.caso('🔴 LA RAMA SUPERVISOR · su panel trae su gente, y sólo su gente', () => {
  /* ⚠️ LOS DOCE CASOS ANTERIORES NO TOCABAN ESTA RAMA. El verificador lo midió: revertir el filtro
     del panel del supervisor —la fuga TITULAR de P214, la que alcanza un supervisor común con una
     celda de dos nombres— dejaba los doce en verde, porque el caso «EL PANEL ENTERO» entra por la
     rama ADMIN. Son dos ramas distintas de `accionSupervisor` con dos filtros distintos.

     Y se mide también la otra dirección, que es la que frenó la publicación en la sexta ronda: el
     filtro canonizaba un dato que `RES.aplicar()` ya había canonizado, y como `nominaEmpresaCanon`
     NO es idempotente, con una fila que liste el canónico de otra como variante no-primera el panel
     del supervisor quedaba **vacío** —registros, PVT, operacional, turnos y comentarios— mientras
     `nominaSinDato`, que canoniza una sola vez, le imprimía los nombres de su propia gente como
     «nunca medidos». El cero sin discriminador de P096, por otra puerta. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const HOY2 = P214_HOY;
  const env = GS.crearEntorno({
    'Accesos': [P214_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Silva', 'clave-si', 'supervisor', 'Silva, Aer. silva', '', ''],
      /* la fila que reclama el CANÓNICO de la de arriba como variante NO-primera */
      ['Grupo', 'clave-gr', 'supervisor', 'Grupo, Silva', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
      ['Aer. silva', 'ANA SILVA', 'V-1', 'Operaciones', 'Piloto'],
      ['Grupo', 'LUIS GRUPO', 'V-9', 'Operaciones', 'Piloto']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [HOY2, '08:00', HOY2 + 'T08:00:00', 'e1', 'ANA SILVA', 'Aer. silva', 'Ops', 'Piloto', 'inicio', '', '', ''],
      [HOY2, '09:00', HOY2 + 'T09:00:00', 'e2', 'LUIS GRUPO', 'Grupo', 'Ops', 'Piloto', 'inicio', '', '', '']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'validarAcceso', 'construirAlias',
    'nominaEmpresaCanon']);
  const panel = (u, pw) => { const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw,
    dispositivoId: 'd' }).getContent());
    return { gente: (d.operacional || []).map(x => String(x.persona)), sinDato: d.nominaSinDato || [] }; };
  /* ⚠️ CUARTA RONDA DE P215 · ESTA GUARDA AFIRMABA EL DEFECTO COMO PRECONDICIÓN, y la raíz la
     volvió IMPOSIBLE DE MONTAR. Decía que el canónico de una fila podía ser secuestrado por otra que
     lo listara como variante — cierto mientras `construirAliasLeer_` era last-wins sobre toda la
     hoja. Ahora el canónico de cada fila se mapea a sí mismo y pisa cualquier reclamo ajeno, así
     que el escenario no existe más.
     NO se cambió el valor esperado para que diera verde: se cambió lo que la guarda AFIRMA, porque
     lo que afirmaba dejó de ser verdad del sistema. Y hay que decir la consecuencia: sin ese
     escenario, este caso ya no distingue si lo que lo protege es el quirúrgico o la raíz — esa red
     vive en `pruebas/discriminador-p215.js`, que mide cada quirúrgico con la raíz REVERTIDA. */
  const alias = api.construirAlias();
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, 'Silva'), 'Silva',
    'guarda: el intento de secuestro de `Grupo` NO prospera — el canónico propio gana');
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, 'Aer. silva'), 'Silva',
    'guarda: y la variante indiscutida de `Silva` sigue apuntando a `Silva`');
  PRUEBAS.igual(api.nominaEmpresaCanon(alias, 'Grupo'), 'Grupo',
    'guarda: y `Grupo` conserva el suyo: la regla no le quita nada a quien lo reclamó');

  const silva = panel('Silva', 'clave-si');
  /* ── la dirección que frenó la sexta ronda: NO puede quedarse sin su gente ─────────────────── */
  PRUEBAS.alMenos(silva.gente.length, 1,
    '🔴 el supervisor NO se queda con el panel vacío (el doble canon lo vaciaba)');
  PRUEBAS.cierto(silva.gente.indexOf('ANA SILVA') >= 0, '🔴 y ve a su propia persona');
  /* ⚠️ ESTE ASERTO DECÍA `sinDato === '[]'`, afirmando que un evento operacional cuenta como
     «medido». NO lo verifiqué, y es falso: «medido» sale de `Respuestas de formulario 1`, que este
     fixture no tiene. Quinta vez en este prompt que escribo un aserto afirmando algo cuyo origen en
     el código no busqué — exactamente lo que R19 previene, y esta vez después de redactarla.
     Lo que P214 cierra en este canal es que NO aparezca gente ajena; cuántos de los propios están
     sin medir depende del fixture y no es lo que se está probando. */
  PRUEBAS.igual(silva.sinDato.indexOf('LUIS GRUPO'), -1,
    '🔴 y `nominaSinDato` tampoco nombra a la persona de la otra empresa');
  /* ── la fuga titular: NO puede ver la del otro ─────────────────────────────────────────────── */
  PRUEBAS.igual(silva.gente.indexOf('LUIS GRUPO'), -1, '🔴 y NO ve a la persona de la otra empresa');
  /* ── LO QUE NO PUEDE CAMBIAR ───────────────────────────────────────────────────────────────── */
  const grupo = panel('Grupo', 'clave-gr');
  PRUEBAS.cierto(grupo.gente.indexOf('LUIS GRUPO') >= 0, '🔴 el otro supervisor ve la suya…');
  PRUEBAS.igual(grupo.gente.indexOf('ANA SILVA'), -1, '…y no la de Silva');
  const maestro = panel('*', 'clave-maestra');
  PRUEBAS.igual(maestro.gente.length, 2, '🔴 NO PUEDE CAMBIAR · el maestro ve a las dos');
});
