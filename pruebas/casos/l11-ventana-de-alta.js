PRUEBAS.grupo('L11 · la ventana de alta: preparada, probada y APAGADA');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Cierra lo que vio el dueño del producto: sin ninguna credencial se podían listar las empresas
   clientes y, con el nombre de una, pedir su perfil.

   NACE APAGADA A PROPÓSITO. El semáforo de versiones (L10) dice 🔴: la app 6.00 —la que tiene el
   campo del código y la que reporta su versión— recién salió, y de las 7 personas de HELITEC no hay
   dato de ninguna. Encenderla hoy las dejaría afuera. Se enciende con un `config_set` remoto el día
   que el semáforo esté en verde, y se apaga igual: un comando, reversible.

   ── LAS TRES FORMAS DE ROMPER LA APP CERRANDO ESTO MAL ───────────────────────────────────────
   Las encontró la revisión adversarial y las tres están tapadas:
   1 · `empresa_perfil` con `ok:false` rompería `sectorRefrescar()`, que corre en CADA arranque de
       quien YA está registrado. Devuelve un perfil GENÉRICO con `ok:true`.
   2 · `listas` con `{ok:true, empresas:[]}` pasa la guarda `if (d && d.ok)` del cliente y le BORRA
       el caché de empresas al teléfono. Devuelve `ok:false`.
   3 · Cerrar `registro` pierde un alta EN SILENCIO —la persona ve «Listo» y no quedó nada—, así
       que NO se toca.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function l11Env(config){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(config || []),
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"],
               ['Helitec','Ana Suárez','V-1','Op','Piloto','F',35,'+58','a@e.com','Sí','','empleado','2']],
  });
}

PRUEBAS.caso('🔴 APAGADA por defecto · sin la clave nada cambia', () => {
  /* Un cierre que se activa solo por un despliegue es la forma de dejar gente afuera sin decidirlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env(), ['altaEstaAbierta', 'accionNominaEmpresas', 'accionEmpresaPerfil']);
  PRUEBAS.cierto(api.altaEstaAbierta('Helitec'), '⚠️ sin la clave cargada, ABIERTA');
  const emp = JSON.parse(api.accionNominaEmpresas({}).getContent());
  PRUEBAS.cierto(emp.ok, 'guarda de medibilidad: la lista responde como hoy');
  PRUEBAS.alMenos((emp.empresas || []).length, 1, 'y trae la empresa · nada cambió');
});

PRUEBAS.caso('🔴 con la ventana CERRADA no se puede enumerar el padrón de clientes', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env([['Helitec', 'altaAbierta', '0']]),
                          ['altaEstaAbierta', 'accionNominaEmpresas']);
  PRUEBAS.falso(api.altaEstaAbierta('Helitec'), 'guarda: la llave se leyó');
  const r = JSON.parse(api.accionNominaEmpresas({}).getContent());
  PRUEBAS.falso(!!r.ok, '⚠️ la lista de empresas deja de darse');
  PRUEBAS.igual(r.motivo, 'alta_cerrada', 'y dice por qué, para que el cliente pueda ramificar');
  PRUEBAS.falso(/Helitec/.test(JSON.stringify(r)),
    '⚠️ y ningún nombre de empresa se cuela, ni siquiera en el mensaje de error');
});

PRUEBAS.caso('🔴 `listas` responde ok:false · NUNCA una lista vacía con ok:true', () => {
  /* Es la diferencia entre cerrar una puerta y borrarle los datos al teléfono de la persona. Con
     `{ok:true, empresas:[]}` la guarda `if (d && d.ok)` del cliente pasa y pisa el caché. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes leía el bloque de `manejar` con un regex. Ahora se pide `listas` por la puerta
     real con un alta cerrada y con una abierta, y se mira la respuesta. */
  const pedir = (config) => {
    const api = GS.cargarGs(CTX.gs, GS.crearEntorno({
      'Config Empresa': [['Empresa','Clave','Valor']].concat(config),
      'Accesos': [['Usuario','Contraseña','Rol','Empresas','ClaveMedica','ClaveHseq'], ['Helitec','sup001','supervisor','Helitec','','']],
      'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Operaciones','Piloto']],
      'Respuestas de formulario 1': [['A'], ['B']],
    }), ['manejar']);
    return JSON.parse(api.manejar({ action: 'listas' }).getContent());
  };
  const cerrada = pedir([['Helitec', 'altaAbierta', '0']]);
  PRUEBAS.falso(!!cerrada.ok, '⚠️ con un alta cerrada `listas` responde ok:false (' + (cerrada.motivo || 'sin motivo') + ')');
  PRUEBAS.igual(cerrada.motivo, 'alta_cerrada', 'y dice por qué');
  PRUEBAS.falso(Array.isArray(cerrada.empresas) || Array.isArray(cerrada.departamentos), '⚠️ y NO manda una lista vacía · con `{ok:true, …:[]}` la guarda `if (d && d.ok)` del cliente pisaría el caché del teléfono');
  const abierta = pedir([]);
  PRUEBAS.cierto(!!abierta.ok && Array.isArray(abierta.departamentos), 'DISCRIMINADOR · sin alta cerrada responde ok:true con sus listas (' + (abierta.error || 'ok') + ')');
});

PRUEBAS.caso('🔴 `empresa_perfil` cerrado devuelve un perfil GENÉRICO, no un error', () => {
  /* Dos motivos a la vez: (1) un error confirma que la empresa NO existe y un perfil confirma que
     SÍ — la fuga es esa diferencia, y un perfil idéntico para cualquier nombre no dice nada;
     (2) `sectorRefrescar()` llama a esto en cada arranque de quien ya está registrado, y un
     `ok:false` le rompería el sector. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env([['Helitec', 'altaAbierta', '0']]), ['accionEmpresaPerfil']);
  const real = JSON.parse(api.accionEmpresaPerfil({ empresa: 'Helitec' }).getContent());
  PRUEBAS.cierto(real.ok, '⚠️ sigue respondiendo ok:true · si no, se rompe cada arranque');
  PRUEBAS.igual(real.perfil.nombre, '', '⚠️ pero sin el nombre de la empresa');
  PRUEBAS.cierto(real.perfil.pideCodigo,
    'y con `pideCodigo:true`, que es lo único que el cliente necesita para mostrar el campo');

  /* Y el DISCRIMINADOR de la fuga: una empresa inventada tiene que responder IGUAL. Si respondiera
     distinto, seguiría sirviendo para adivinar clientes, que es todo el defecto. */
  const falsa = JSON.parse(api.accionEmpresaPerfil({ empresa: 'Empresa Que No Existe SA' }).getContent());
  PRUEBAS.igual(JSON.stringify(falsa.perfil), JSON.stringify(real.perfil),
    '⚠️ una empresa REAL y una INVENTADA responden idéntico · no se puede adivinar cuál existe');
});

PRUEBAS.caso('⚠️ `registro` NO se cierra · un alta perdida en silencio es peor que la fuga', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba que `accionRegistro` NO mencionara la ventana. Ahora se registra a una
     persona con el alta CERRADA y se mira que la fila quede escrita igual: la persona vería «Listo»
     y, si la ventana la cortara, no quedaría nada. Se cierra el día que se publique un cliente que
     sepa mostrar el rechazo. */
  const env = GS.crearEntorno({
    'Config Empresa': [['Empresa','Clave','Valor'], ['Helitec', 'altaAbierta', '0']],
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','ClaveMedica','ClaveHseq'], ['Helitec','sup001','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Operaciones','Piloto']],
    'Respuestas de formulario 1': [['A'], ['B']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionRegistro', 'manejar']);
  PRUEBAS.igual(JSON.parse(api.manejar({ action: 'listas' }).getContent()).motivo, 'alta_cerrada', 'guarda: en este entorno el alta está cerrada (`listas` lo dice)');
  const r = JSON.parse(api.accionRegistro({ nombre: 'Ana Suárez', cedula: 'V-1', empresa: 'Helitec', departamento: 'Operaciones', dispositivoId: 'd' }).getContent());
  PRUEBAS.cierto(!!r.ok, '⚠️ `registro` NO se cierra: con el alta cerrada el alta queda escrita (' + (r.motivo || r.error || 'ok') + ')');
  const hoja = env.__libro.getSheetByName('Registrados Fatiga');
  const filas = hoja ? hoja.__volcado() : [];
  PRUEBAS.cierto(filas.length >= 2 && filas.slice(1).some(f => f.join('|').indexOf('Ana Su') >= 0), 'y la fila de Ana está en «Registrados Fatiga»: un alta perdida en silencio es peor que la fuga');
});

PRUEBAS.caso('🔴 a la persona se le avisa si alguien le crea la contraseña', () => {
  /* Crear una contraseña es tomar una cuenta. Hasta acá la persona se enteraba el día que intentaba
     entrar y no podía. La revisión adversarial pidió esto ANTES de cualquier cierre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes leía `credAvisarDueno` y buscaba `leerNomina()`, `catch (e) {}` y la llamada.
     Ahora se crea la credencial por la acción real con `MailApp` espiado: el correo tiene que salir
     al de la NÓMINA aunque el POST traiga otro, y si el correo revienta la credencial se crea igual. */
  const armar = (mail) => {
    const env = GS.crearEntorno({
      'Accesos': [['Usuario','Contraseña','Rol','Empresas','ClaveMedica','ClaveHseq'], ['Helitec','sup001','supervisor','Helitec','','']],
      'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada']],
      'Credenciales': [['Empresa','Cédula','Usuario','Hash','Sal','Vueltas','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
      'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad','Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
                 ['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','ana.real@empresa.com','Sí','','empleado','2']],
    });
    env.MailApp = mail;
    return GS.cargarGs(CTX.gs, env, ['accionCredencialCrear']);
  };
  const enviados = [];
  const api = armar({ sendEmail: function (a, asunto, cuerpo) { enviados.push({ a: a, asunto: asunto, cuerpo: cuerpo }); } });
  const r = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-1', pass:'unaClaveLarga1', usuario:'Ana Suárez', dispositivoId:'d', email:'atacante@otro.com', correo:'atacante@otro.com' }).getContent());
  PRUEBAS.cierto(!!r.ok, 'guarda: la credencial se creó (' + (r.error || r.motivo || 'ok') + ')');
  PRUEBAS.igual(enviados.length, 1, '⚠️ a la persona se le avisa: salió UN correo');
  PRUEBAS.igual(enviados[0] && enviados[0].a, 'ana.real@empresa.com', '⚠️ al correo de la NÓMINA, no al que mandó el POST · si no, el atacante elegiría a dónde avisar');
  PRUEBAS.cierto(enviados[0] && /contraseña/i.test(enviados[0].asunto + enviados[0].cuerpo) && !/unaClaveLarga1/.test(enviados[0].cuerpo), 'dice que se creó una contraseña y NO la incluye');
  const api2 = armar({ sendEmail: function () { throw new Error('cuota de correo agotada'); } });
  const r2 = JSON.parse(api2.accionCredencialCrear({ empresa:'Helitec', cedula:'V-1', pass:'unaClaveLarga1', usuario:'Ana Suárez', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(!!r2.ok, '⚠️ y si el correo revienta, la credencial se crea igual (' + (r2.error || r2.motivo || 'ok') + ')');
});
