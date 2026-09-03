
PRUEBAS.grupo('S4 · la sesión recordada en el dispositivo');

/* Lo que se venía haciendo era guardar la CONTRASEÑA de empresa en texto plano en el dispositivo y
   remandarla en cada pedido. Ahora el servidor emite un token, el dispositivo guarda el token, y la
   contraseña no queda en ningún lado.

   ⚠️ NO CADUCA, y es una decisión, no un olvido: "la sesión se guarda hasta que la persona cierre
   sesión, nada de que se cierre solo" (Franco, 2026-09-03). Hay un caso más abajo que lo fija, para
   que nadie agregue una caducidad "por prolijidad" sin darse cuenta de que rompe el pedido. */

function s4Endpoint(sesiones, accesos, operacional){
  const env = GS.crearEntorno({
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical',
                  'Combinada','Creada','UltimoUso','Estado','Cerrada']].concat(sesiones || []),
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq']].concat(
                accesos || [['Helitec','clave-sup','supervisor','Helitec','clave-med','']]),
    'Operacional': [['Fecha','Hora','ISO','Turno','Persona','Empresa','Departamento','Cargo','Evento','Test','Resultado']]
                   .concat(operacional || []),
    'Config Empresa': [['Empresa','Clave','Valor']],
  });
  const api = GS.cargarGs(CTX.gs, env,
    ['sesEmitir','sesResolver','sesCerrar','sesEsToken','sesPartir','sesHash','validarAcceso',
     'accionSesionCerrar','esFilaSueltaDePrueba','leerOperacional','leerOperacionalCompleto']);
  /* ⚠️ El emulador COPIA las filas al crear la hoja (`HojaFalsa` hace `.map(f => f.slice())`), así
     que mirar el array que se le pasó no sirve: se queda como estaba y una prueba que lo lea da
     verde sin haber visto nada de lo que el `.gs` escribió. Hay que ir por el libro. */
  api.filas = function(nombre){
    const h = env.__libro.getSheetByName(nombre);
    return h ? h._datos : null;
  };
  return api;
}

PRUEBAS.caso('⚠️ el token abre lo mismo que la contraseña, con los MISMOS permisos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = s4Endpoint([]);
  const conClave = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  PRUEBAS.cierto(!!conClave, 'la contraseña tiene que seguir funcionando igual que antes');

  const token = api.sesEmitir('Helitec', 'disp-1', conClave);
  PRUEBAS.cierto(/^sst_/.test(token), 'el token tiene que llevar su prefijo: ' + String(token).slice(0, 12));

  const conToken = api.validarAcceso('Helitec', token, 'disp-1');
  PRUEBAS.cierto(!!conToken, 'y el token tiene que abrir');
  PRUEBAS.igual(conToken.rol, conClave.rol, 'mismo rol');
  PRUEBAS.igual(conToken.vista, conClave.vista, 'misma vista');
  PRUEBAS.igual(conToken.empresas, conClave.empresas, 'y exactamente las mismas empresas, ni una más');
});

PRUEBAS.caso('⚠️ la contraseña NO queda escrita en la hoja de sesiones', () => {
  /* El punto entero de S4. Si la contraseña apareciera acá, habríamos cambiado un lugar donde
     estaba en claro por otro, y encima uno que abre gente a mano. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  const hoja = JSON.stringify(api.filas('Sesiones'));
  PRUEBAS.falso(hoja.indexOf('clave-sup') >= 0, '⚠️ la contraseña no puede estar en la hoja');
  PRUEBAS.falso(hoja.indexOf(token) >= 0,
    '⚠️ ni el token entero: se guarda su hash, así que leer la planilla no alcanza para entrar');
  PRUEBAS.cierto(hoja.indexOf(api.sesPartir(token).id) >= 0,
    'el id sí está (es público, sirve para encontrar la fila sin hashear contra todas)');
});

PRUEBAS.caso('⚠️ el token de un dispositivo NO sirve en otro', () => {
  /* Un token vive en el `localStorage`, a la vista de cualquiera que abra las herramientas del
     navegador. Sin esta atadura, copiarlo a otro teléfono daría acceso completo — y a diferencia de
     la contraseña, el token no hay que pedírselo a nadie. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', token, 'disp-1'), 'en su dispositivo, sí');
  PRUEBAS.falso(!!api.validarAcceso('Helitec', token, 'disp-2'), '⚠️ en otro, no');
});

PRUEBAS.caso('⚠️ el token de una cuenta no abre otra', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([], [['Helitec','clave-sup','supervisor','Helitec','',''],
                              ['Cardón','otra-clave','supervisor','Cardón','','']]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  PRUEBAS.falso(!!api.validarAcceso('Cardón', token, 'disp-1'),
    'con el token de Helitec no se puede entrar a Cardón, ni desde el mismo dispositivo');
});

PRUEBAS.caso('⚠️ cerrar sesión anula el token en el SERVIDOR, no sólo en el teléfono', () => {
  /* Es la diferencia entera con guardar la contraseña: una contraseña de empresa no se puede
     anular sin cambiársela a todos. Un token sí. Si esto fallara, "cerrar sesión" sería nada más
     que borrar del dispositivo, y el token seguiría abriendo desde cualquier copia. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', token, 'disp-1'), 'antes de cerrar, abre');
  PRUEBAS.cierto(api.sesCerrar(token, 'disp-1'), 'cerrar tiene que reportar que cerró algo');
  PRUEBAS.falso(!!api.validarAcceso('Helitec', token, 'disp-1'), '⚠️ después de cerrar, NO abre');
  /* Y no se reabre: una sesión cerrada está cerrada, no "inactiva". */
  PRUEBAS.falso(!!api.sesResolver(token, 'disp-1'), 'ni resolviéndolo directo');
});

PRUEBAS.caso('cerrar dos veces responde ok, sin romper nada (R15)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  api.sesCerrar(token, 'disp-1');
  const fechaPrimerCierre = api.filas('Sesiones')[1][12];
  const r = JSON.parse(api.accionSesionCerrar({ token: token, dispositivoId: 'disp-1' }).getContent());
  PRUEBAS.cierto(r.ok, 'la app cierra y borra el token pase lo que pase: un error acá sólo asusta');
  PRUEBAS.falso(r.cerrada, 'pero dice la verdad sobre si esta vez cerró algo');
  /* Y lo que de verdad importa del segundo cierre: que no pise la fecha del primero. Esa fecha es
     lo único que dice hasta cuándo estuvo viva la sesión, y es el dato que uno iría a buscar si
     hubiera que reconstruir quién tuvo acceso y hasta cuándo. */
  PRUEBAS.igual(api.filas('Sesiones')[1][12], fechaPrimerCierre,
    '⚠️ la fecha del cierre real no se puede pisar con la de un reintento');
});

PRUEBAS.caso('⚠️ volver a entrar reemplaza la fila, no agrega una nueva (R15: upsert)', () => {
  /* Sin esto la hoja sumaría un renglón por cada login y en un año serían miles de sesiones
     muertas, que además hay que recorrer en CADA pedido. Y tiene un segundo efecto, el correcto:
     volver a entrar invalida el token anterior de ese mismo dispositivo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const t1 = api.sesEmitir('Helitec', 'disp-1', acc);
  const t2 = api.sesEmitir('Helitec', 'disp-1', acc);
  const filas = api.filas('Sesiones').length - 1;
  PRUEBAS.igual(filas, 1, 'una fila por dispositivo, no una por login (quedaron ' + filas + ')');
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', t2, 'disp-1'), 'el token nuevo abre');
  PRUEBAS.falso(!!api.validarAcceso('Helitec', t1, 'disp-1'), 'y el viejo dejó de abrir');
});

PRUEBAS.caso('⚠️ dos dispositivos distintos conviven: el teléfono compartido del plan', () => {
  /* Caso borde que el plan marca explícitamente. Cerrar sesión en uno no puede sacar al otro. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const tA = api.sesEmitir('Helitec', 'disp-A', acc);
  const tB = api.sesEmitir('Helitec', 'disp-B', acc);
  api.sesCerrar(tA, 'disp-A');
  PRUEBAS.falso(!!api.validarAcceso('Helitec', tA, 'disp-A'), 'el que cerró, salió');
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', tB, 'disp-B'), '⚠️ y el otro sigue adentro');
});

PRUEBAS.caso('⚠️ un token inválido NO anota fallo en el freno de fuerza bruta', () => {
  /* Si lo anotara, el auto-login de una sesión ya cerrada iría sumando fallos solo, al abrir la
     app, hasta dejar al dispositivo sin poder entrar NI con la contraseña correcta — un bloqueo
     que la persona no provocó y que no podría explicarse. Un token viejo no es alguien probando
     claves: es una sesión que se terminó. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  for (let i = 0; i < 12; i++) api.validarAcceso('Helitec', 'sst_muerto.viejo', 'disp-1');
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', 'clave-sup', 'disp-1'),
    '⚠️ después de 12 tokens muertos, la contraseña correcta TIENE que seguir entrando');
});

PRUEBAS.caso('⚠️ un token roto o inventado no abre nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  const id = api.sesPartir(token).id;
  [ 'sst_inventado.total', 'sst_' + id + '.secreto-equivocado', 'sst_', 'sst_sinpunto',
    token.slice(0, -4), token + 'xx', '' ]
    .forEach(malo => {
      PRUEBAS.falso(!!api.validarAcceso('Helitec', malo, 'disp-1'), 'no puede abrir: "' + String(malo).slice(0, 24) + '"');
    });
  /* Y el control, que es lo que hace que la lista de arriba signifique algo: el bueno SÍ abre. */
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', token, 'disp-1'),
    'el token correcto tiene que seguir abriendo, o esta prueba estaría pasando por la razón equivocada');
});

PRUEBAS.caso('⚠️ LA SESIÓN NO CADUCA: es un pedido explícito, no un descuido', () => {
  /* "La sesión se guarda hasta que la persona cierre sesión, nada de que se cierre solo o algo así
     raro" (Franco, 2026-09-03). Este caso existe para que agregar una caducidad "por prolijidad"
     ponga la suite en rojo y obligue a una conversación, en vez de aparecer un día como pilotos
     que tienen que volver a escribir la contraseña sin que nadie sepa por qué.
     Se prueba con una sesión creada hace dos años: si algún día alguien mete un vencimiento, por
     largo que sea, esto lo agarra. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  const acc = api.validarAcceso('Helitec', 'clave-sup', 'disp-1');
  const token = api.sesEmitir('Helitec', 'disp-1', acc);
  const hojas = api.filas('Sesiones');
  const viejo = new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString();
  hojas[1][9] = viejo;    // Creada
  hojas[1][10] = viejo;   // UltimoUso
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', token, 'disp-1'),
    '⚠️ una sesión de hace DOS AÑOS, sin usar, tiene que seguir abriendo: fue el pedido');
});

PRUEBAS.grupo('S4 · la fila de prueba que ensuciaba los promedios');

PRUEBAS.caso('⚠️ la fila suelta de prueba deja de contar, sin tocar producción', () => {
  /* La escribí yo el 2026-08-27 verificando el camino de escritura (M0) y quedó contando como un
     registro real. Se filtra al LEER, que es la convención que ya usa el .gs para
     `PRUEBA DE CONEXION`: la planilla no se toca. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  PRUEBAS.cierto(api.esFilaSueltaDePrueba('Nicolás Herrera', '2026-08-27', 'llegada_aero', 'kss', '4'),
    'la fila exacta que escribí tiene que quedar afuera');
  PRUEBAS.cierto(api.esFilaSueltaDePrueba('nicolas herrera', '2026-08-27', 'llegada_aero', 'kss', 4),
    'y sin depender de acentos, mayúsculas ni de que el resultado venga como número');
});

PRUEBAS.caso('⚠️ pero una persona REAL con ese nombre no queda invisible', () => {
  /* Es la razón por la que se filtra la fila y no el nombre. Meter "nicolas herrera" en
     `PERSONAS_DE_PRUEBA` habría sido más corto y es exactamente el error contra el que advierte el
     comentario de esa lista: esconder a alguien de verdad sin que nadie se entere. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s4Endpoint([]);
  PRUEBAS.falso(api.esFilaSueltaDePrueba('Nicolás Herrera', '2026-09-03', 'llegada_aero', 'kss', '4'),
    '⚠️ otro día: entra');
  PRUEBAS.falso(api.esFilaSueltaDePrueba('Nicolás Herrera', '2026-08-27', 'salida_aero', 'kss', '4'),
    'otro evento, el mismo día: entra');
  PRUEBAS.falso(api.esFilaSueltaDePrueba('Nicolás Herrera', '2026-08-27', 'llegada_aero', 'kss', '7'),
    'otro resultado: entra');
  PRUEBAS.falso(api.esFilaSueltaDePrueba('Nicolás Herrero', '2026-08-27', 'llegada_aero', 'kss', '4'),
    'y un apellido parecido tampoco alcanza');
});
