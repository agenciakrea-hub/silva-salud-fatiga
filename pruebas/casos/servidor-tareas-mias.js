/* ── `tareas_mias`: el único canal que llega al empleado sin contraseña ─────────────────────────
   (L2b · el caso de J3, más el de I5 que J3 podría haber roto sin que nadie lo note)

   POR QUÉ ESTE ENDPOINT ES ESPECIAL
   El empleado no tiene usuario ni contraseña: se identifica con nombre + cédula contra la nómina.
   Por eso `tareas_mias` terminó siendo el canal por el que le llega TODO lo que necesita saber y
   no puede pedir por otra vía: la determinación médica firmada sobre él (I5) y el plan del ciclo
   de su empresa (J3).
   Eso lo vuelve un cuello de botella: **cada cosa nueva que se le cuelga puede romper la
   anterior**, y las dos son invisibles hasta que alguien mira el teléfono de un piloto. Estos
   casos existen para que ese cuello de botella no se rompa en silencio. */

PRUEBAS.grupo('Servidor · tareas_mias');

const CAB_NOMINA = ['Empresa', 'Nombre', 'Cédula', 'Departamento', 'Cargo', 'Teléfono'];
const CAB_TAREAS = ['Empresa', 'Cédula', 'Persona', 'Título', 'Detalle', 'Estado', 'Creada'];
const CAB_CONFIG = ['Empresa', 'Clave', 'Valor'];

function entornoTareas(config) {
  return GS.crearEntorno({
    'Nómina': [CAB_NOMINA, ['Helitec', 'Ana Pérez', '12345678', 'Operaciones', 'Piloto', '']],
    'Tareas': [CAB_TAREAS],
    'Config Empresa': [CAB_CONFIG].concat(config || [])
  });
}
function pedir(env, extra) {
  const api = GS.cargarGs(CTX.gs, env, ['accionTareasMias']);
  const r = api.accionTareasMias(Object.assign(
    { empresa: 'Helitec', persona: 'Ana Pérez', cedula: '12345678' }, extra || {}));
  return JSON.parse(r.getContent());
}

PRUEBAS.caso('devuelve el plan del ciclo cuando la empresa lo configuró', () => {
  /* J3. Sin esto el empleado cae al default del SECTOR: con una jornada configurada en 8 h, el
     supervisor lo ve excedido a las 8 y él se ve en hora hasta las 12. */
  const plan = { traslado: 45, jornada: 480, regreso: 45, descanso: 600 };
  const env = entornoTareas([['Helitec', 'cicloPlan', JSON.stringify(plan)]]);
  const r = pedir(env);
  PRUEBAS.cierto(r.ok, 'la persona está en la nómina: el pedido tiene que salir bien');
  PRUEBAS.igual(r.cicloPlan, plan,
    'es el canal por el que el empleado se entera de los tramos de SU empresa');
});

PRUEBAS.caso('sin configuración devuelve null, no rompe', () => {
  /* La mayoría de las empresas no van a configurar el ciclo. Ese camino tiene que ser silencioso:
     un error acá le dejaría al empleado la pantalla de inicio sin sus tareas. */
  const env = entornoTareas([]);
  const r = pedir(env);
  PRUEBAS.cierto(r.ok, 'una empresa sin configuración de ciclo tiene que seguir funcionando igual');
  PRUEBAS.igual(r.cicloPlan, null, 'sin config, null — y el cliente cae a su default');
});

PRUEBAS.caso('la determinación médica sigue viajando (I5 no se rompió)', () => {
  /* J3 le agregó un campo a este endpoint. Este caso existe para que agregar el SIGUIENTE no
     tire abajo lo que ya estaba: la determinación es la única forma que tiene el empleado de
     enterarse de lo que el médico firmó sobre él. */
  const env = entornoTareas([]);
  const r = pedir(env);
  PRUEBAS.cierto('determinacion' in r,
    'el campo tiene que seguir presente: es cómo se entera el empleado de lo que firmó el médico');
});

PRUEBAS.caso('una cédula que no coincide con el nombre es rechazada', () => {
  /* Es lo único que separa a una persona de ver los datos de otra por este canal: no hay
     contraseña. Si esto se aflojara, cualquiera con un nombre de la nómina vería sus tareas. */
  const env = entornoTareas([]);
  const r = pedir(env, { cedula: '99999999' });
  PRUEBAS.falso(r.ok,
    'sin contraseña, el par nombre+cédula es la ÚNICA barrera: no puede aceptar una cédula ajena');
});

PRUEBAS.caso('faltando el nombre o la cédula, no responde datos', () => {
  const env = entornoTareas([]);
  PRUEBAS.falso(pedir(env, { persona: '' }).ok, 'sin nombre no se puede identificar a nadie');
  PRUEBAS.falso(pedir(env, { cedula: '' }).ok, 'sin cédula tampoco');
});

PRUEBAS.grupo('Servidor · freno de fuerza bruta');

PRUEBAS.caso('el freno se activa recién al 6.º intento fallido', () => {
  /* El freno vive en la caché. Con un emulador que devolviera siempre null, esta lógica nunca se
     probaría y el freno podría estar desactivado sin que nadie lo note. */
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['accFrenado', 'accAnotarFallo', 'accLimpiar']);
  const K = 'helitec', D = 'dispositivo-1';
  PRUEBAS.falso(api.accFrenado(K, D), 'nadie arranca frenado');
  for (let i = 0; i < 5; i++) api.accAnotarFallo(K, D);
  PRUEBAS.falso(api.accFrenado(K, D),
    'a los 5 intentos todavía no: alguien que se equivoca de contraseña unas veces no es un ataque');
  api.accAnotarFallo(K, D);
  PRUEBAS.cierto(api.accFrenado(K, D), 'al 6.º sí se frena');
});

PRUEBAS.caso('acertar limpia el contador', () => {
  /* Si no, quien se equivocó unas veces y después acertó quedaría viendo "incorrecta" para
     siempre sin haber hecho nada mal. */
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['accFrenado', 'accAnotarFallo', 'accLimpiar']);
  const K = 'helitec', D = 'dispositivo-1';
  for (let i = 0; i < 6; i++) api.accAnotarFallo(K, D);
  PRUEBAS.cierto(api.accFrenado(K, D), 'primero se frena');
  api.accLimpiar(K, D);
  PRUEBAS.falso(api.accFrenado(K, D), 'y al acertar se destraba, sin esperar los 10 minutos');
});

PRUEBAS.caso('frenar un dispositivo no frena a los demás', () => {
  /* Si el freno fuera por empresa y no por dispositivo, seis intentos fallidos de una persona
     dejarían afuera a TODOS los supervisores de esa empresa. Eso es un apagón operativo. */
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['accFrenado', 'accAnotarFallo']);
  for (let i = 0; i < 6; i++) api.accAnotarFallo('helitec', 'dispositivo-1');
  PRUEBAS.cierto(api.accFrenado('helitec', 'dispositivo-1'), 'el que falló, frenado');
  PRUEBAS.falso(api.accFrenado('helitec', 'dispositivo-2'),
    'el freno es POR DISPOSITIVO: si no, un solo atacante dejaría afuera a toda la empresa');
});
