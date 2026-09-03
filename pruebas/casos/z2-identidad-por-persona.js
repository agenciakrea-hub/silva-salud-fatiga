
PRUEBAS.grupo('Z2 · identidad por persona');

/* El diseño y el porqué están en `docs/adr/001-identidad-por-persona.md` (fuera del repo público).
   Acá se comprueba lo que ese diseño promete, contra el `.gs` REAL en el emulador.

   ⚠️ Estas pruebas sólo son posibles porque el emulador ahora tiene `computeDigest` de verdad
   (SHA-256, verificado contra los vectores oficiales de FIPS 180-4 al cargar). Antes de esto,
   cualquier cosa que tocara contraseñas era interminable de verificar. */

function z2Endpoint(credenciales, config){
  const env = GS.crearEntorno({
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']].concat(credenciales || []),
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo'],
               ['Helitec','Ana Suárez','V-111','Op','Piloto']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS'],
                                   ['2026-09-01','Ana Suárez','Helitec','7']],
    'Config Empresa': [['Empresa','Clave','Valor']].concat(config || []),
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
  });
  return GS.cargarGs(CTX.gs, env,
    ['accionLogin','accionTieneClave','accionEmpleado','credHash','credSalNueva','credIguales','credBuscar']);
}

/* Arma una fila de credenciales con el hash BIEN calculado, usando las mismas funciones del `.gs`.
   Se hace así y no con un hash escrito a mano para que la prueba no dependa de que yo copie bien
   un valor: si el algoritmo del endpoint cambia, esto lo sigue. */
function z2Fila(api, empresa, cedula, clave, rol, vueltas){
  const sal = api.credSalNueva();
  const n = vueltas || 100;
  return [empresa, cedula, 'ana', api.credHash(clave, sal, n), sal, String(n),
          'sha256-sal-vueltas-v1', rol || 'empleado', 'activo', '2026-09-01', ''];
}

PRUEBAS.caso('⚠️ la contraseña NUNCA se guarda: lo que queda es un hash con sal', () => {
  /* Lo que había antes era texto plano comparado con `===`. Si esta comprobación fallara, todo el
     prompt sería decorativo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = z2Endpoint([]);
  const sal = api.credSalNueva();
  const h = api.credHash('MiClaveSecreta', sal, 100);
  PRUEBAS.falso(h.indexOf('MiClaveSecreta') >= 0, '⚠️ la clave no puede aparecer dentro del hash');
  PRUEBAS.falso(h === 'MiClaveSecreta', 'ni ser la clave misma');
  PRUEBAS.alMenos(h.length, 32, 'y tiene que tener cuerpo de hash');
});

PRUEBAS.caso('⚠️ dos personas con la MISMA clave tienen hashes distintos', () => {
  /* Para eso está la sal. Sin ella, ver dos hashes iguales en la hoja delata que dos personas
     eligieron la misma contraseña — y que romper una rompe las dos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z2Endpoint([]);
  const a = api.credHash('123456', api.credSalNueva(), 100);
  const b = api.credHash('123456', api.credSalNueva(), 100);
  PRUEBAS.falso(a === b, 'con sales distintas, la misma clave no puede dar el mismo hash');
  /* Y el control: con la MISMA sal tiene que dar lo mismo, o no se podría verificar nada. */
  const sal = api.credSalNueva();
  PRUEBAS.igual(api.credHash('123456', sal, 100), api.credHash('123456', sal, 100),
    'con la misma sal tiene que ser determinista: si no, nadie podría entrar nunca');
});

PRUEBAS.caso('⚠️ entrar con la clave correcta sí; con una incorrecta no', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z2Endpoint([]);
  const fila = z2Fila(api, 'Helitec', 'V-111', 'ClaveDeAna', 'supervisor');
  const api2 = z2Endpoint([fila]);
  const bien = JSON.parse(api2.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'ClaveDeAna', dispositivoId:'d1' }).getContent());
  const mal  = JSON.parse(api2.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'otra',       dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(bien.ok, 'con su clave entra');
  PRUEBAS.falso(mal.ok, 'con otra no');
});

PRUEBAS.caso('⚠️ el ROL sale de la fila de la persona, no de qué clave acertó', () => {
  /* Es el cambio de modelo. Antes, un supervisor y el servicio médico compartiendo el usuario de
     la empresa eran indistinguibles: el rol lo decidía cuál de las tres claves coincidía. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z2Endpoint([]);
  const api = z2Endpoint([ z2Fila(base, 'Helitec', 'V-111', 'clave1', 'medico') ]);
  const r = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'clave1', dispositivoId:'d' }).getContent());
  PRUEBAS.cierto(r.ok, 'entra');
  PRUEBAS.igual(r.persona.rol, 'medico', 'y el rol es el de SU fila');
});

PRUEBAS.caso('⚠️ la respuesta NO devuelve el hash, ni la sal, ni las vueltas', () => {
  /* Son los materiales con los que se probarían claves fuera de línea. Que el login "funcione" no
     alcanza: importa qué se lleva el navegador. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z2Endpoint([]);
  const api = z2Endpoint([ z2Fila(base, 'Helitec', 'V-111', 'clave1', 'empleado') ]);
  const crudo = api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'clave1', dispositivoId:'d' }).getContent();
  const r = JSON.parse(crudo);
  PRUEBAS.cierto(r.ok, 'entra');
  ['hash','sal','vueltas','Sal','Hash'].forEach(k => {
    PRUEBAS.falso(crudo.indexOf('"' + k + '"') >= 0, 'la respuesta no puede traer "' + k + '"');
  });
});

PRUEBAS.caso('⚠️ probar claves se frena, y frenar a una persona no frena a otra', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z2Endpoint([]);
  const api = z2Endpoint([ z2Fila(base, 'Helitec', 'V-111', 'clave1', 'empleado'),
                           z2Fila(base, 'Helitec', 'V-222', 'clave2', 'empleado') ]);
  for (let i = 0; i < 6; i++) api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'x'+i, dispositivoId:'dd' });
  const frenada = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'clave1', dispositivoId:'dd' }).getContent());
  const otra    = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-222', pass:'clave2', dispositivoId:'dd' }).getContent());
  PRUEBAS.falso(frenada.ok, 'tras seis fallos no entra ni con la clave correcta');
  PRUEBAS.cierto(otra.ok,
    '⚠️ pero otra persona en el mismo dispositivo sí: si el freno fuera por dispositivo a secas, ' +
    'quemar los intentos de uno dejaría afuera a su compañero');
});

PRUEBAS.caso('⚠️ MIGRACIÓN · sin credenciales, todo sigue exactamente como antes', () => {
  /* La mitad más importante del prompt. Publicar esto NO puede cambiarle nada a nadie: mientras la
     hoja `Credenciales` esté vacía —que es como va a estar el día que se publique— la app tiene que
     comportarse igual que hoy. Si esto fallara, publicar Z2 dejaría a la empresa entera afuera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z2Endpoint([]);                                    // nadie migrado
  const r = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec',
                                            cedula:'V-111', dispositivoId:'d' }).getContent());
  PRUEBAS.cierto(r.ok, '⚠️ sin fila de credenciales, la persona entra como siempre');
  const t = JSON.parse(api.accionTieneClave({ empresa:'Helitec', cedula:'V-111' }).getContent());
  PRUEBAS.falso(t.migrada, 'y el cliente puede preguntarlo antes de pedirle una clave que no tiene');
});

PRUEBAS.caso('⚠️ EL CANDADO DE Z2 SÓLO PUEDE ENCENDERSE CUANDO LA APP TENGA DÓNDE PEDIR LA CLAVE', () => {
  /* ⚠️ ESTE CASO REEMPLAZA A DOS QUE COMPROBABAN LO CONTRARIO, y el cambio es deliberado.
     Z2 hizo que `accionEmpleado` exigiera la clave propia a toda persona con fila en
     `Credenciales`. La auditoría del 2026-09-03 encontró que **la app no tiene dónde escribirla**:
     `action:'login'` aparece 0 veces en el cliente, `necesita_clave` 0 veces, y ninguna de las tres
     llamadas a `action=empleado` manda `pass`. Z4 publicó la pantalla que CREA la credencial sin la
     pantalla que la USA.
     Consecuencia real: quien aceptaba "Elige tu contraseña" —que le promete "desde ahora entras con
     tu cédula y esta contraseña"— quedaba sin ver sus estadísticas NUNCA MÁS, y encima cada arranque
     sumaba un fallo en un freno que es por DISPOSITIVO, dejando trabado también a cualquier otro
     empleado del mismo teléfono.
     Así que el candado se apagó (`Z2_EXIGIR_CLAVE_PROPIA = false`) y este caso fija la invariante
     que importa: **el servidor no puede exigir una credencial que el cliente no sabe mandar.**
     El día que se conecte el login, este caso se pone en verde solo y hay que volver a escribir los
     dos casos de migración que estaban acá. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const encendido = /var\s+Z2_EXIGIR_CLAVE_PROPIA\s*=\s*true/.test(CTX.gs);
  const fuenteCliente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const clienteSabeEntrar = /action\s*:\s*['"]login['"]/.test(fuenteCliente);

  PRUEBAS.cierto(/Z2_EXIGIR_CLAVE_PROPIA/.test(CTX.gs),
    'el interruptor tiene que existir: es lo que documenta que esto está a medio conectar');
  PRUEBAS.falso(encendido && !clienteSabeEntrar,
    '⚠️ el candado está ENCENDIDO y la app no tiene pantalla de login: quien ponga su contraseña ' +
    'va a quedar sin poder ver sus datos. O se conecta el login, o se apaga el candado');

  /* Y el control, para que este caso no quede verde por la razón equivocada el día que alguien
     borre el interruptor entero: si el cliente ya sabe entrar, el candado TIENE que encenderse. */
  PRUEBAS.falso(clienteSabeEntrar && !encendido,
    'si la app ya sabe hacer login por persona, el candado tiene que volver a estar encendido');
});

PRUEBAS.caso('la comparación de hashes es en tiempo constante', () => {
  /* Con `===`, el tiempo depende de cuántos caracteres coinciden al principio, y eso alcanza para
     ir adivinando un hash de a un carácter. Se comprueba el comportamiento, no el reloj: medir
     microsegundos en un navegador sería ruido. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z2Endpoint([]);
  PRUEBAS.cierto(api.credIguales('abc','abc'), 'iguales dan true');
  PRUEBAS.falso(api.credIguales('abc','abd'), 'distintos dan false');
  PRUEBAS.falso(api.credIguales('abc','abcd'), 'largos distintos dan false');
  PRUEBAS.falso(api.credIguales('','x'), 'y el vacío no coincide con nada');
});

PRUEBAS.caso('⚠️ las vueltas se guardan POR FILA: subirlas no invalida las que ya existen', () => {
  /* El número de vueltas va a subir cuando se mida el costo real en Apps Script. Si estuviera fijo
     en el código, subirlo dejaría afuera a todo el que ya tenía contraseña — habría que resetearlas
     todas. Guardándolo en la fila, cada quien se verifica con las suyas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z2Endpoint([]);
  const api = z2Endpoint([ z2Fila(base, 'Helitec', 'V-111', 'clave1', 'empleado', 50),
                           z2Fila(base, 'Helitec', 'V-222', 'clave2', 'empleado', 300) ]);
  const a = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-111', pass:'clave1', dispositivoId:'x' }).getContent());
  const b = JSON.parse(api.accionLogin({ empresa:'Helitec', cedula:'V-222', pass:'clave2', dispositivoId:'y' }).getContent());
  PRUEBAS.cierto(a.ok, 'la de 50 vueltas entra');
  PRUEBAS.cierto(b.ok, 'y la de 300 también, con el mismo código');
});

PRUEBAS.caso('⚠️ "¿tiene clave?" no filtra si esa persona existe', () => {
  /* Si respondiera distinto para una cédula que existe y una que no, sería una forma barata de
     averiguar quién trabaja en una empresa probando cédulas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const base = z2Endpoint([]);
  const api = z2Endpoint([ z2Fila(base, 'Helitec', 'V-111', 'clave1', 'empleado') ]);
  const existeSinClave = JSON.parse(api.accionTieneClave({ empresa:'Helitec', cedula:'V-999' }).getContent());
  const noExiste       = JSON.parse(api.accionTieneClave({ empresa:'Helitec', cedula:'V-000' }).getContent());
  PRUEBAS.igual(Object.keys(existeSinClave).sort(), Object.keys(noExiste).sort(),
    'la respuesta tiene que tener la MISMA forma para una cédula que existe y una que no');
  PRUEBAS.igual(existeSinClave.migrada, noExiste.migrada, 'y el mismo valor');
});
