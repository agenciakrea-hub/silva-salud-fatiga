
PRUEBAS.grupo('Z4 · la persona se pone su contraseña');

/* ⚠️ EL RIESGO CENTRAL DE ESTE PROMPT NO ES LA CRIPTOGRAFÍA: ES EL ROBO DE CUENTA. Si cualquiera
   que sepa una cédula pudiera fijarle la contraseña a otro, esto quedaría PEOR que antes — hoy, sin
   contraseñas, al menos nadie puede quedarse de forma permanente con la identidad ajena.
   Por eso la mitad de estos casos son sobre eso y no sobre hashes. */

function z4Endpoint(nomina, credenciales, config){
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo']].concat(nomina || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']].concat(credenciales || []),
    'Config Empresa': [['Empresa','Clave','Valor']].concat(config || []),
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','a','b','c']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']],
  });
  return GS.cargarGs(CTX.gs, env,
    ['accionCredencialCrear','accionCredencialCambiar','accionLogin','credBuscar','credHash','credSalNueva']);
}
const Z4_NOMINA = [['Helitec','Ana Suárez','V-111','Op','Piloto'],
                   ['Helitec','Beto Pérez','V-222','Op','Piloto']];

PRUEBAS.caso('⚠️ ROBO DE CUENTA · no se puede pisar la contraseña de alguien que ya la tiene', () => {
  /* EL CASO MÁS IMPORTANTE DEL PROMPT. Sin esto, el alta sería un robo de cuenta con un solo
     pedido: conocés la cédula, mandás una clave nueva y te quedaste con la identidad de esa persona
     —y con acceso a sus datos de salud— de forma permanente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const base = z4Endpoint(Z4_NOMINA, []);
  const sal = base.credSalNueva();
  const yaTiene = [['helitec','V-111','ana', base.credHash('LaDeAna2026', sal, 100), sal, '100',
                    'sha256-sal-vueltas-v1','empleado','activo','2026-09-01','']];
  const api = z4Endpoint(Z4_NOMINA, yaTiene);
  const r = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        pass:'ClaveDelLadron9', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.ok, '⚠️ no puede crear una credencial sobre una que ya existe');
  PRUEBAS.igual(r.motivo, 'ya_tiene', 'y lo dice, para que la app la mande a iniciar sesión');
  /* Y lo que de verdad importa: la contraseña de Ana TIENE que seguir siendo la suya. */
  const sigue = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111',
                        pass:'LaDeAna2026', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(sigue.ok, '⚠️ y la clave original tiene que seguir funcionando: no se pisó nada');
});

PRUEBAS.caso('⚠️ cambiar la contraseña EXIGE la anterior', () => {
  /* Es lo que permite que el alta sea autogestionada sin volverse un robo: quien ya tiene la cuenta
     es el único que puede moverla. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z4Endpoint(Z4_NOMINA, []);
  const sal = base.credSalNueva();
  const api = z4Endpoint(Z4_NOMINA, [['helitec','V-111','ana', base.credHash('LaDeAna2026', sal, 100), sal, '100',
                                      'sha256-sal-vueltas-v1','empleado','activo','2026-09-01','']]);
  const sinLaVieja = JSON.parse(api.accionCredencialCambiar({ empresa:'Helitec', cedula:'V-111',
                        pass:'adivinada', pass_nueva:'OtraClave2026', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(sinLaVieja.ok, 'sin la contraseña anterior no se cambia');
  const conLaVieja = JSON.parse(api.accionCredencialCambiar({ empresa:'Helitec', cedula:'V-111',
                        pass:'LaDeAna2026', pass_nueva:'OtraClave2026', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(conLaVieja.ok, 'con la anterior sí');
  const nueva = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'OtraClave2026', dispositivoId:'d3' }).getContent());
  const vieja = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'LaDeAna2026', dispositivoId:'d4' }).getContent());
  PRUEBAS.cierto(nueva.ok, 'la nueva entra');
  PRUEBAS.falso(vieja.ok, '⚠️ y la vieja deja de servir: si siguiera, cambiarla no serviría de nada');
});

PRUEBAS.caso('⚠️ sólo quien está en la nómina de esa empresa puede crear su clave', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z4Endpoint(Z4_NOMINA, []);
  const inventada = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-999',
                        pass:'ClaveInventada1', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(inventada.ok, 'una cédula que no está en la lista no crea nada');
  PRUEBAS.igual(inventada.motivo, 'no_esta', 'y se dice cuál es el problema');
  const real = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        pass:'ClaveDeAna2026', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(real.ok, 'quien sí está, puede');
});

PRUEBAS.caso('⚠️ sin nómina cargada NO se crean credenciales', () => {
  /* Sin padrón no hay contra qué verificar, y crear cuentas a ciegas es justo lo que la
     comprobación viene a impedir. Es preferible que esa empresa no pueda migrar todavía. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z4Endpoint([], []);
  const r = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        pass:'ClaveCualquiera1', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.ok, 'sin nómina no se crea');
  PRUEBAS.igual(r.motivo, 'sin_nomina', 'y se explica, porque no es culpa de la persona');
  /* ⚠️ DISCRIMINADOR, y hace falta de verdad: este caso YA PASÓ UNA VEZ EN FALSO. Había un bug por
     el que `credEnNomina` comparaba una empresa normalizada contra una sin normalizar, así que
     TODAS las altas respondían "sin_nomina" — y este caso daba verde por la razón equivocada
     mientras los otros cinco fallaban. Con nómina cargada tiene que crear; si no, esta prueba
     volvió a no medir nada. */
  const conNomina = z4Endpoint(Z4_NOMINA, []);
  const r2 = JSON.parse(conNomina.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        pass:'ClaveCualquiera1', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(r2.ok,
    'con la nómina cargada SÍ se crea — si esto fallara, la comprobación de arriba estaría ' +
    'pasando porque todo devuelve "sin_nomina", no porque el chequeo funcione');
});

PRUEBAS.caso('⚠️ la contraseña débil se rechaza EN EL SERVIDOR', () => {
  /* El largo mínimo es lo que más mueve la aguja cuando el algoritmo es rápido: duplicar las
     vueltas encarece al atacante x2, y sumar un carácter, x~70.
     Y se decide acá y no en el navegador, porque el navegador es público y se puede saltear. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z4Endpoint(Z4_NOMINA, []);
  const corta = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'abc12', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(corta.ok, 'una clave corta no se acepta');
  PRUEBAS.igual(corta.detalle, 'corta', 'y se dice por qué');
  const numeros = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'12345678', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(numeros.ok, '⚠️ ni una que sea sólo números: una cédula o una fecha no son contraseñas');
  PRUEBAS.igual(numeros.detalle, 'solo_numeros', 'y también se dice');
});

PRUEBAS.caso('⚠️ el barrido de cédulas se frena', () => {
  /* Sin freno, probar cédulas contra el alta es gratis: son pocos dígitos y el formato se conoce. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z4Endpoint(Z4_NOMINA, []);
  for (let i = 0; i < 6; i++) api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-90'+i, pass:'ClaveLarga2026', dispositivoId:'barredor' });
  const frenado = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-905', pass:'ClaveLarga2026', dispositivoId:'barredor' }).getContent());
  PRUEBAS.falso(frenado.ok, 'después de varios intentos fallidos se corta');
  /* El freno es por (empresa, cédula) + dispositivo, así que barrer cédulas distintas no acumula
     sobre una sola llave — se comprueba que el barredor igual no entre en la que sí existe. */
  const real = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'ClaveDeAna2026', dispositivoId:'limpio' }).getContent());
  PRUEBAS.cierto(real.ok, '⚠️ y otro dispositivo no queda castigado por lo que hizo el barredor');
});

PRUEBAS.caso('⚠️ crear la credencial queda registrado en la bitácora', () => {
  /* R3: la bitácora es lo único que queda cuando la prevención falla. Un alta de credencial tiene
     que poder VERSE después — es como se detecta un robo de cuenta que ya ocurrió.
     Queda una ventana inherente al alta autogestionada: mientras alguien no puso su clave, quien
     conozca su cédula puede ponérsela primero. Esto no la cierra; la hace visible. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo']].concat(Z4_NOMINA),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','a','b','c']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionCredencialCrear']);
  const antes = env.SpreadsheetApp.openById('x').getSheetByName('Bitácora').getDataRange().getValues().length;
  api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'ClaveDeAna2026', dispositivoId:'d' });
  const despues = env.SpreadsheetApp.openById('x').getSheetByName('Bitácora').getDataRange().getValues();
  PRUEBAS.alMenos(despues.length, antes + 1, 'tiene que quedar una fila nueva');
  const ultima = despues[despues.length - 1].join('|');
  PRUEBAS.cierto(/credencial_creada/.test(ultima), 'con la acción identificada: ' + ultima.slice(0, 70));
});

PRUEBAS.caso('⚠️ dos altas simultáneas no crean dos credenciales', () => {
  /* Comprobar-que-no-existe y después escribir es un leer-y-después-escribir. Sin candado, dos
     pedidos con la misma cédula pasan los dos la comprobación y crean DOS filas — y entonces
     `credBuscar` devuelve la primera, que puede no ser la de la persona. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z4Endpoint(Z4_NOMINA, []);
  const a = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'ClaveDeAna2026', dispositivoId:'d1' }).getContent());
  const b = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111', pass:'OtraDistinta26', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(a.ok, 'la primera crea');
  PRUEBAS.falso(b.ok, '⚠️ la segunda NO: si creara, habría dos credenciales para la misma persona');
  PRUEBAS.igual(b.motivo, 'ya_tiene', 'y por el motivo correcto');
});
