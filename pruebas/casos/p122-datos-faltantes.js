PRUEBAS.grupo('P122 · datos faltantes: una derivación, dos consumidores');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El pedido del dueño, textual: «de la nómina que cargamos, si faltan datos, los pide como datos
   faltantes, porque hay que tener todo sin falta, mail número, etc».

   Para pedir SÓLO lo que falta hay que saber QUÉ falta, y eso ya lo sabía `setupFormOk()` — pero
   en forma de once `return false` seguidos, que contestan «no» sin decir de qué. Escribir una
   segunda lista al lado habría sido el bug más repetido de este repo: dos derivaciones del mismo
   dato que se separan con el primer cambio. Por eso `setupCamposFaltantes()` es la única, y
   `setupFormOk()` pasó a ser su consumidor.

   ⚠️ LOS CAMPOS SE ESCONDEN, NO SE REMUEVEN. `_sv()` lee `el.value`: un campo removido devuelve
   cadena vacía y `setupFormOk()` cortaría con el botón en gris y sin motivo visible — que es
   exactamente el defecto que ya pasó con las contraseñas de supervisor.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P122_COMPLETO = { nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                        departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34',
                        telefono:'04121112233', email:'ana@ejemplo.com' };
const P122_CAMPOS = ['fName','fCed','fEmp','fDep','fCargo','fSexo','fEdad','fTelefono','fEmail'];

function p122Abrir(perfil, editando){
  localStorage.clear();
  SETUP_LISTS.empresas = ['Consorcio HELITEC'];
  SETUP_LISTS_LOADED = true;
  setProfile(perfil);
  openSetup(!!editando);
}
function p122Visible(id){
  const e = document.getElementById(id);
  return !!e && e.getBoundingClientRect().height > 0;
}
function p122Cerrar(previo){
  try { closeSetup(); } catch(e){}
  try {
    localStorage.clear();
    Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
  } catch(e){}
}

/* ── UNA SOLA DERIVACIÓN ───────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ `setupFormOk()` y `setupCamposFaltantes()` NO pueden discrepar', () => {
  /* Es la propiedad entera del prompt. Si algún día alguien vuelve a escribir los once `return
     false` al lado de la lista, este caso se pone rojo apenas las dos se separen en UN campo. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinEmail = Object.assign({}, P122_COMPLETO); delete sinEmail.email;
    p122Abrir(sinEmail);
    PRUEBAS.igual(setupFormOk(), setupCamposFaltantes().length === 0,
      '⚠️ con un campo faltando, las dos dicen lo mismo');
    PRUEBAS.igual(setupCamposFaltantes().map(f => f.campo), ['inEmail'],
      'y la lista dice CUÁL falta, que es lo que `setupFormOk()` no podía decir');
    p122Abrir(P122_COMPLETO);
    PRUEBAS.igual(setupFormOk(), true, 'con todo completo, el formulario está bien');
    PRUEBAS.igual(setupCamposFaltantes().length, 0, 'y no falta nada — el discriminador del par');
  } finally { p122Cerrar(previo); }
});

/* ── EL MODO «FALTANTES» ───────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 con la nómina cargada se piden SÓLO los campos que faltan', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinContacto = Object.assign({}, P122_COMPLETO);
    delete sinContacto.telefono; delete sinContacto.email;
    p122Abrir(sinContacto);
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible), ['fTelefono','fEmail'],
      '⚠️ dos campos a la vista en vez de nueve · es el pedido del dueño');
    PRUEBAS.cierto(document.getElementById('setupLead').textContent.length > 20,
      'y el encabezado explica por qué se ve medio formulario · si no, la pantalla parece rota');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔴 el valor de un campo ESCONDIDO se sigue leyendo — por eso no se remueve', () => {
  /* La razón concreta de esconder en vez de remover. `_sv()` lee `el.value`: removido devolvería
     cadena vacía, `setupFormOk()` daría false y el botón quedaría gris sin decir por qué. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    p122Abrir(sinCargo);
    PRUEBAS.igual(p122Visible('fEmail'), false, 'guarda: el correo está escondido (ya era válido)');
    PRUEBAS.igual(_sv('inEmail'), 'ana@ejemplo.com',
      '⚠️ y su valor se sigue leyendo · removerlo dejaría el botón en gris sin motivo visible');
    document.getElementById('inCargo').value = 'Piloto';
    PRUEBAS.igual(setupFormOk(), true,
      '⚠️ completando lo que falta, el formulario queda OK con ocho campos escondidos');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔴 «Editar mis datos» muestra TODO — el modo devuelve lo que escondió', () => {
  /* ⚠️ ESTA ERA UNA REGRESIÓN DE LA PRIMERA VERSIÓN, cazada midiendo: la función sólo sabía
     esconder. El `#setup` es UNO y vive en el DOM todo el tiempo, así que lo escondido en el alta
     seguía escondido al abrir a editar: la persona iba a corregir su teléfono y le faltaban ocho
     campos. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    p122Abrir(sinCargo);
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible).length, 1, 'guarda: el alta escondió ocho');
    closeSetup();
    openSetup(true);                                  // «Editar mis datos», el camino real
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible).length, 9,
      '⚠️ al editar están los NUEVE · si no, se corrige a ciegas');
    PRUEBAS.igual(p122Visible('setupPosponerBtn'), false,
      'y no se ofrece posponer: no hay alta que terminar');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('⚠️ y si en la segunda apertura falta OTRO campo, el de antes reaparece', () => {
  /* La otra cara de lo mismo: esconder sin devolver dejaba escondido justo el campo que había que
     pedir. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    p122Abrir(sinCargo);
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible), ['fCargo'], 'guarda: primero falta el cargo');
    closeSetup();
    const sinDep = Object.assign({}, P122_COMPLETO); delete sinDep.departamento;
    p122Abrir(sinDep);
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible), ['fDep'],
      '⚠️ ahora se pide el departamento y el cargo volvió a esconderse');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('⚠️ a quien se da de alta a MANO se le muestra el formulario entero', () => {
  /* El discriminador del modo: sin identidad previa no hay «parte» que falte, falta todo. Si el
     modo se activara igual, escondería los campos que la persona todavía no llenó. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    p122Abrir({});
    PRUEBAS.igual(P122_CAMPOS.filter(p122Visible).length, 9,
      '⚠️ los nueve a la vista · el modo sólo se activa con identidad ya resuelta');
    PRUEBAS.igual(document.getElementById('setupTitle').textContent, t('setup_titulo'),
      'y el título es el de siempre, no el de «falta muy poco»');
  } finally { p122Cerrar(previo); }
});

/* ── LA SALIDA QUE SE SACÓ, Y POR QUÉ NO PUEDE VOLVER SOLA ─────────────────────────────────── */

PRUEBAS.caso('🔒 «Continuar, lo corrijo después» NO existe · dejaba gente invisible para el panel', () => {
  /* P122 la puso porque el plan la pedía: «un dato mal cargado no puede encerrar a nadie afuera de
     su app». La auditoría de P136 midió qué pasaba DESPUÉS de tocarla, y eran dos cosas graves:

     · La fila NUNCA se escribía en `Registrados Fatiga`. `saveProfile()` es el único camino que
       llama a `sincronizarRegistro()`, y posponer no pasaba por ahí. La persona entraba a la app,
       reportaba fatiga y hacía tests, pero para el supervisor y para el médico NO EXISTÍA. En una
       app de gestión de fatiga eso no es un dato faltante: es un agujero operativo.
     · Y cada vez que abría la app volvía al splash, porque el arranque decide con `_complete`
       (`perfilCompleto()` calculado al cargar). Con el perfil incompleto la mandaba a la portada,
       al carrusel de cinco láminas y al alta otra vez. Todos los días.

     ⚠️ Y EL MOTIVO POR EL QUE SE PUSO YA NO EXISTE: en el modo «faltantes» lo que se muestra es
     exactamente lo que falta, y esos campos son EDITABLES. La persona escribe su teléfono o
     corrige su cargo y sigue. No hay nadie encerrado, así que no hay de qué escapar.

     Este caso no vigila el botón: vigila que no vuelva SIN SUS DOS MITADES. Si alguien lo reabre,
     tiene que escribir la fila igual y avisarle al arranque que esa persona ya entró. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    p122Abrir(sinCargo);
    PRUEBAS.igual(p122Visible('setupPosponerBtn'), false,
      '🔒 no hay salida que saltee el guardado · quien la reabra tiene que escribir la fila igual');
    PRUEBAS.igual(typeof window.datosPosponer, 'undefined',
      '🔒 y la función tampoco está · si vuelve, este caso avisa antes de que llegue a producción');
    /* El discriminador de que el caso mide algo: el campo que falta SÍ está a la vista y se puede
       completar, que es lo que hace innecesaria la salida. */
    PRUEBAS.igual(p122Visible('fCargo'), true,
      '⚠️ y el campo que falta está a la vista y es editable · por eso nadie queda encerrado');
    const inp = document.getElementById('inCargo');
    PRUEBAS.igual(!!inp && !inp.readOnly && !inp.disabled, true,
      'editable de verdad, no sólo visible');
  } finally { p122Cerrar(previo); }
});


/* ── EL ALTA MUERTA · lo encontró la refutación de P138 ────────────────────────────────────── */

PRUEBAS.caso('🔴 el alta por NÓMINA se puede guardar aunque la empresa no esté en `action=listas`', () => {
  /* ⚠️ ESTO TENÍA EL ALTA MUERTA PARA EL ÚNICO CLIENTE EN PRODUCCIÓN, y son dos derivaciones
     distintas del nombre de empresa — el bug más repetido de este repo:
     · `action=listas` devuelve la columna A de `Accesos` → «Helitec».
     · el alta guarda la CANÓNICA (primer alias de la columna D) → «Consorcio HELITEC».
     Medido en vivo el 2026-09-08. `dashNorm` de las dos no coincide, así que la validación fallaba
     SIEMPRE, y el rechazo se escribía en `#fEmp`, que el modo «faltantes» tiene escondido: se
     tocaba «Guardar y continuar» y no pasaba nada, sin un solo mensaje. Y `saveProfile()` es el
     único camino que escribe la fila en `Registrados Fatiga`.
     La regla: lo que no tipeó la persona no se valida contra la lista. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    /* La lista oficial dice «Helitec»; el perfil trae la canónica, como la manda el servidor. */
    SETUP_LISTS.empresas = ['Helitec'];
    SETUP_LISTS_LOADED = true;
    setProfile(Object.assign({}, P122_COMPLETO, { empresa: 'Consorcio HELITEC' }));
    openSetup(false);
    PRUEBAS.igual(document.getElementById('inEmp').readOnly, true,
      'guarda: la empresa vino resuelta por la nómina, así que está de sólo lectura');
    PRUEBAS.igual(setupCamposFaltantes().length, 0, 'guarda: no falta ningún dato');
    /* El camino real: el botón que toca la persona. */
    document.querySelector('#setup .save-btn').click();
    PRUEBAS.igual(document.getElementById('setup').classList.contains('show'), false,
      '⚠️ el formulario se cierra · antes el botón no hacía NADA y no decía nada');
    PRUEBAS.igual(document.getElementById('fEmp').classList.contains('invalid'), false,
      'y la empresa no se marca inválida · no la escribió la persona y no la puede corregir');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('⚠️ pero lo que SÍ tipeó la persona se sigue validando — el discriminador', () => {
  /* Sin esto, el arreglo de arriba dejaría pasar cualquier texto libre como empresa, que es el
     bug que la validación existe para evitar («Aer. silva», «Silva C.A.®» ensuciando el CH). */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Helitec'];
    SETUP_LISTS_LOADED = true;
    setProfile({});                                  // alta a mano: sin identidad previa
    openSetup(false);
    PRUEBAS.igual(document.getElementById('inEmp').readOnly, false,
      'guarda: sin empresa resuelta, el campo es editable');
    document.getElementById('inName').value = 'Ana Suárez';
    document.getElementById('inCed').value = '12345678';
    document.getElementById('inEmp').value = 'Empresa Inventada S.A.';
    document.getElementById('inDep').value = 'Operaciones';
    document.getElementById('inCargo').value = 'Piloto';
    document.getElementById('inSexo').value = 'Femenino';
    document.getElementById('inEdad').value = '34';
    document.getElementById('inTelefono').value = '04121112233';
    document.getElementById('inEmail').value = 'ana@ejemplo.com';
    saveProfile();
    PRUEBAS.igual(document.getElementById('fEmp').classList.contains('invalid'), true,
      '⚠️ una empresa tipeada que no está en la lista SÍ se rechaza');
    PRUEBAS.igual(document.getElementById('setup').classList.contains('show'), true,
      'y el formulario NO se cierra');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔴 un error sobre un campo escondido lo REVELA · el botón no puede quedar mudo', () => {
  /* La regla general que faltaba: el modo «faltantes» esconde los campos válidos, así que un
     rechazo sobre uno de ellos dejaba el mensaje escrito donde nadie lo ve, y el
     `scrollIntoView` sobre un `display:none` no hace nada. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = []; SETUP_LISTS_LOADED = true;
    setProfile(P122_COMPLETO);
    openSetup(false);
    const fTel = document.getElementById('fTelefono');
    PRUEBAS.igual(fTel.style.display, 'none', 'guarda: el teléfono está escondido por ser válido');
    PRUEBAS.igual(fTel.getAttribute('data-oculto-faltantes'), '1', 'guarda: con la marca del modo');
    /* Se lo invalida a mano —como haría cualquier rama de rechazo— y se guarda. */
    document.getElementById('inTelefono').value = '123';      // deja de ser válido
    saveProfile();
    PRUEBAS.igual(document.getElementById('fTelefono').style.display, '',
      '⚠️ el campo que falla se REVELA · antes el error quedaba escrito en un div invisible');
  } finally { p122Cerrar(previo); }
});
