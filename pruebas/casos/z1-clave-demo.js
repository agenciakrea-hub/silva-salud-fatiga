
PRUEBAS.grupo('Z1 · clave para la demostración');

/* ⚠️ SE VALIDA EN EL SERVIDOR, y ese es el punto entero del prompt. Si se validara en el navegador,
   la clave estaría escrita en `index.html`, que es un archivo público en un repositorio público:
   sería un cartel, no una cerradura. Por eso estos casos corren contra el `.gs` REAL en el
   emulador, no contra el cliente.

   ⚠️ Y hay que ser honesto con lo que esto protege: cualquiera puede leer el código de la app, así
   que una clave no impide copiar la idea. Lo que evita —y es un objetivo legítimo— es que quien
   pase por ahí recorra el producto y vea la forma de los paneles y los datos de ejemplo. */

function z1Endpoint(configFilas){
  /* `Config Empresa` con la columna Empresa VACÍA son los valores GENERALES. Ahí vive `demo_pass`,
     a propósito: así se cambia la clave sin volver a publicar el endpoint, que es la operación cara
     de este proyecto. */
  const env = GS.crearEntorno({
    'Config Empresa': [['Empresa','Clave','Valor']].concat(configFilas || []),
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionDemo']);
  return { api, env };
}

PRUEBAS.caso('⚠️ sin clave configurada la demo sigue ABIERTA, como hasta hoy', () => {
  /* Es deliberado y es la mitad importante del diseño: publicar el endpoint no puede, por sí solo,
     dejar a nadie afuera. La demo se cierra recién cuando alguien escribe la clave en el CH.
     Si esto fallara, publicar el `.gs` rompería la demostración para todo el mundo sin aviso. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido este caso se saltea'); return; }
  const E = z1Endpoint([]);                       // ninguna fila: demo_pass no existe
  const r = JSON.parse(E.api.accionDemo({}).getContent());
  PRUEBAS.cierto(r.ok, 'sin clave configurada tiene que entregar la demo igual que siempre');
  PRUEBAS.cierto(r.demo === true, 'y marcada como demostración');
});

PRUEBAS.caso('⚠️ con clave configurada, sin clave NO entra', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const E = z1Endpoint([['', 'demo_pass', 'abrete']]);
  const r = JSON.parse(E.api.accionDemo({}).getContent());
  PRUEBAS.falso(r.ok, 'sin clave no se entrega la demostración');
  PRUEBAS.igual(r.motivo, 'demo_pass',
    'y avisa POR QUÉ, para que el cliente sepa que tiene que pedirla — sin esto el cliente tendría ' +
    'que adivinar si el endpoint es viejo o si falta la clave');
  PRUEBAS.falso(!!r.registros, '⚠️ y no puede filtrarse ni un dato de ejemplo en la respuesta');
});

PRUEBAS.caso('⚠️ con la clave correcta entra; con una incorrecta no', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const E = z1Endpoint([['', 'demo_pass', 'abrete']]);
  const mal  = JSON.parse(E.api.accionDemo({ pass:'otra', dispositivoId:'d1' }).getContent());
  const bien = JSON.parse(E.api.accionDemo({ pass:'abrete', dispositivoId:'d2' }).getContent());
  PRUEBAS.falso(mal.ok, 'una clave incorrecta no entra');
  PRUEBAS.falso(!!mal.registros, 'y tampoco devuelve datos');
  PRUEBAS.cierto(bien.ok, 'la correcta sí');
  PRUEBAS.cierto(bien.demo === true, 'y sigue siendo la demostración, no datos reales');
});

PRUEBAS.caso('⚠️ la clave se compara EXACTA: no alcanza con acertarle de cerca', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const E = z1Endpoint([['', 'demo_pass', 'Abrete']]);
  const casos = ['abrete', 'ABRETE', 'Abret', 'Abretee', ''];
  const entraron = casos.filter(c => JSON.parse(E.api.accionDemo({ pass:c, dispositivoId:'dx'+c }).getContent()).ok);
  PRUEBAS.igual(entraron, [], 'ninguna variante puede entrar: ' + entraron.join(', '));
  /* Los espacios de más sí se perdonan: alguien que copia y pega la clave arrastra un espacio y
     eso no es un intento de entrar sin permiso, es un dedo. */
  const conEspacios = JSON.parse(E.api.accionDemo({ pass:'  Abrete  ', dispositivoId:'dz' }).getContent());
  PRUEBAS.cierto(conEspacios.ok, 'pero los espacios sobrantes al copiar y pegar no pueden dejar a nadie afuera');
});

PRUEBAS.caso('⚠️ el freno de fuerza bruta es el que YA existe, y es por dispositivo', () => {
  /* Lo pedía el plan: "comparte el freno de intentos que ya existe". Y por DISPOSITIVO, no global:
     si fuera global, cualquiera podría dejar sin demostración a todo el mundo tirando claves malas.
     Se comprueba que al 7.º intento el MISMO dispositivo ya no entre ni con la clave correcta, y
     que otro dispositivo siga entrando sin problema. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const E = z1Endpoint([['', 'demo_pass', 'abrete']]);
  for (let i = 0; i < 6; i++) E.api.accionDemo({ pass:'mala', dispositivoId:'quemado' });
  const frenado = JSON.parse(E.api.accionDemo({ pass:'abrete', dispositivoId:'quemado' }).getContent());
  const otro    = JSON.parse(E.api.accionDemo({ pass:'abrete', dispositivoId:'limpio'  }).getContent());
  PRUEBAS.falso(frenado.ok,
    '⚠️ tras seis fallos, ese dispositivo no entra ni con la clave correcta');
  PRUEBAS.cierto(otro.ok,
    '⚠️ pero OTRO dispositivo sí: si el freno fuera global, cualquiera dejaría sin demo a todos');
});

PRUEBAS.caso('⚠️ estar frenado se ve IGUAL que errar la clave', () => {
  /* Convención que ya sigue el acceso de supervisor, y no es un detalle: si el freno se anunciara,
     quien está probando claves sabría que llegó al límite y que le conviene esperar o cambiar de
     dispositivo. Se le da exactamente la misma respuesta. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const E = z1Endpoint([['', 'demo_pass', 'abrete']]);
  const primerFallo = JSON.parse(E.api.accionDemo({ pass:'mala', dispositivoId:'d' }).getContent());
  for (let i = 0; i < 8; i++) E.api.accionDemo({ pass:'mala', dispositivoId:'d' });
  const yaFrenado = JSON.parse(E.api.accionDemo({ pass:'mala', dispositivoId:'d' }).getContent());
  PRUEBAS.igual(yaFrenado.motivo, primerFallo.motivo, 'el motivo tiene que ser el mismo');
  PRUEBAS.igual(yaFrenado.error, primerFallo.error, 'y el texto también');
});
