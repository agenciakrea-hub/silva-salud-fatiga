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

/* ── LA SALIDA, Y SU LÍMITE ────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ «Continuar, lo corrijo después» aparece para un dato que RRHH puede haber cargado mal', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    p122Abrir(sinCargo);
    PRUEBAS.igual(p122Visible('setupPosponerBtn'), true,
      '⚠️ se ofrece la salida · un dato mal cargado no puede encerrar a nadie afuera de su app');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔴 pero NO se puede posponer el correo ni la cédula', () => {
  /* ⚠️ ESTE LÍMITE NO ESTABA EN EL PLAN: lo puso la medición. `sincronizarRegistro()` arranca con
     `if (!perfil.cedula || !perfil.email) return;`, así que sin esos dos NO se escribe la fila en
     `Registrados Fatiga` — y esa fila es lo que hace que la persona exista para el panel. Posponer
     el correo no es «entrar con un dato menos»: es entrar sin existir, y sin que nadie se entere. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    const sinEmail = Object.assign({}, P122_COMPLETO); delete sinEmail.email;
    p122Abrir(sinEmail);
    PRUEBAS.igual(p122Visible('setupPosponerBtn'), false,
      '🔴 sin correo no se ofrece posponer · sin él la fila no se escribe y la persona no existe para el panel');
    const sinCed = Object.assign({}, P122_COMPLETO); delete sinCed.cedula;
    p122Abrir(sinCed);
    PRUEBAS.igual(p122Visible('setupPosponerBtn'), false, '🔴 ni sin cédula, por lo mismo');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔒 la marca de pospuesto NO le abre la puerta a quien no se identificó', () => {
  /* `avanzarAlta()` consulta `datosPospuestos()` en su PASO 1, que es el que sostiene la puerta.
     Una marca vieja de otra persona en un teléfono compartido no puede saltear el alta entera. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    setProfile(P122_COMPLETO);
    datosPosponer();                                   // queda la marca para esta cédula
    PRUEBAS.igual(datosPospuestos(), true, 'guarda: con identidad completa, la marca vale');
    setProfile({ cedula: '12345678' });                // el siguiente: misma cédula, sin identidad
    PRUEBAS.igual(datosPospuestos(), false,
      '🔒 sin nombre ni empresa la marca NO vale · si no, saltearía el alta entera');
  } finally { p122Cerrar(previo); }
});

PRUEBAS.caso('🔴 quien pospone NO queda en el bucle de vuelta al código', () => {
  /* Es el mismo defecto que P135b cerró en el reingreso, por la misma causa: una salida que no le
     avisa a la puerta. Sin la marca, `avanzarAlta()` ve el perfil incompleto y manda a
     `nominaAbrir()` — o sea al código, otra vez. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    const sinCargo = Object.assign({}, P122_COMPLETO); delete sinCargo.cargo;
    setProfile(sinCargo);
    /* ⚠️ `acceptConsent()` NO ES INERTE: termina llamando a `avanzarAlta()`, y en ese momento el
       perfil está incompleto y la marca todavía no existe, así que abre la nómina. Este caso
       fallaba por eso —medía el overlay que abrió la PREPARACIÓN, no el que abre (o no) lo que se
       está probando—. Por eso los overlays se cierran DESPUÉS de preparar y justo antes de medir. */
    acceptConsent();
    localStorage.setItem(K_TEXTO, '1');
    clvMarcarOfrecida();
    [...document.querySelectorAll('.overlay.show')].forEach(o => o.classList.remove('show'));
    datosPosponer();
    PRUEBAS.igual(perfilCompleto(getProfile()), false, 'guarda: el perfil sigue incompleto');
    PRUEBAS.igual(document.getElementById('nominaOv').classList.contains('show'), false,
      '⚠️ NO se abre el alta otra vez · ése era el bucle');
    /* El discriminador: SIN la marca, el mismo perfil incompleto sí manda de vuelta al alta. Sin
       esto, un `avanzarAlta()` que nunca abriera nada daría verde arriba. */
    [...document.querySelectorAll('.overlay.show')].forEach(o => o.classList.remove('show'));
    try { localStorage.removeItem(K_DATOS_POSP); } catch(e){}
    PRUEBAS.igual(datosPospuestos(), false, 'guarda: la marca se borró');
    avanzarAlta();
    PRUEBAS.igual(document.getElementById('nominaOv').classList.contains('show'), true,
      '⚠️ sin la marca SÍ vuelve al alta · o sea que la marca es lo que cambia el resultado');
  } finally {
    [...document.querySelectorAll('.overlay.show')].forEach(o => o.classList.remove('show'));
    try { syncScrollLock(); } catch(e){}
    try { appRevelar(false); } catch(e){}
    p122Cerrar(previo);
  }
});
