
PRUEBAS.grupo('S5 · código de empresa: a quién se le pide y a quién no');

/* El código existe para que un desconocido no se dé de alta con el nombre de otro. La pregunta del
   prompt es a quién se le pide, y la decisión de Franco fue: **a quien ya estaba registrado, no**.
   Ése es el camino de quien reinstala la app o cambia de teléfono — y hasta acá se lo trataba como
   un alta nueva, pidiéndole un código que probablemente nunca le dieron (se entrega una vez, al
   entrar). Era la única forma en que un piloto actual de Helitec se topaba con esto. */

function s5Endpoint(registrados, config, nomina){
  const env = GS.crearEntorno({
    'Registrados Fatiga': [['Fecha','Nombre','Cedula','Empresa','Departamento','Cargo']].concat(registrados || []),
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo']].concat(nomina || [['Helitec','Ana Suárez','V-111','Op','Piloto']]),
    'Config Empresa': [['Empresa','Clave','Valor']].concat(config || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','a','b','c']],
  });
  return GS.cargarGs(CTX.gs, env, ['accionRecuperarPerfil','yaEstabaRegistrado','accionCredencialCrear']);
}
const S5_CODIGO = [['Helitec','codigoRegistro','SILVA2026']];
const S5_YA = [['2026-08-01','Ana Suárez','V-111','Helitec','Op','Piloto']];

PRUEBAS.caso('⚠️ quien YA estaba registrado recupera su perfil SIN código', () => {
  /* EL CASO DEL PROMPT. Reinstalar la app no puede dejar trabado a un piloto por un código que le
     dieron una vez, hace meses, y que no tiene por qué recordar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = s5Endpoint(S5_YA, S5_CODIGO);
  const r = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.motivo === 'codigo_invalido', '⚠️ no se le puede pedir el código: ya estaba registrada');
  PRUEBAS.cierto(r.ok, 'y tiene que recuperar su perfil');
});

PRUEBAS.caso('⚠️ y el caso discrimina: a quien NO estaba, sí se le pide', () => {
  /* Sin este control, el de arriba pasaría igual aunque hubiéramos desactivado el código para
     todos — que sería quitar la única barrera que impide darse de alta con el nombre de otro. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint([], S5_CODIGO);        // nadie registrado todavía
  const r = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.ok, 'a un alta nueva sí se le pide');
  PRUEBAS.igual(r.motivo, 'codigo_invalido', 'con el motivo correcto');
});

PRUEBAS.caso('⚠️ la exención NO alcanza a una cédula ajena', () => {
  /* Estar registrado exime a ESA persona, no a cualquiera que escriba esa empresa. Si la exención
     fuera por empresa, bastaría con que UNA persona se hubiera registrado para abrirle la puerta a
     todo el mundo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint(S5_YA, S5_CODIGO);
  const r = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-999',
                        persona:'Otro Cualquiera', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.ok, 'otra cédula no queda exenta por lo que hizo Ana');
  PRUEBAS.igual(r.motivo, 'codigo_invalido', 'a esa sí se le pide el código');
});

PRUEBAS.caso('⚠️ quien ya tiene perfil completo NO ve nada nuevo', () => {
  /* CASO BORDE DEL PLAN, textual: "quien ya tiene perfil completo no ve nada nuevo. Esto se prueba
     explícitamente". Se comprueba desde el servidor: la respuesta que recibe es la de siempre, sin
     ningún pedido de código intercalado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint(S5_YA, S5_CODIGO);
  const r = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', dispositivoId:'d' }).getContent());
  PRUEBAS.cierto(r.ok, 'la respuesta es la normal');
  PRUEBAS.cierto(!!r.perfil, 'con su perfil adentro');
  PRUEBAS.falso(!!r.pideCodigo, 'y sin pedirle nada nuevo');
});

PRUEBAS.caso('una empresa SIN código configurado sigue abierta para todos', () => {
  /* El código es opcional por empresa. Si no lo cargaron, no puede aparecer una barrera nueva de
     la nada: eso dejaría trabadas a las empresas que todavía no lo configuraron. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint([], []);               // sin fila codigoRegistro
  const r = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(r.motivo === 'codigo_invalido', 'sin código configurado no se pide ninguno');
});

PRUEBAS.caso('⚠️ el código sigue pidiéndose para CREAR una contraseña', () => {
  /* La exención es para recuperar el perfil de quien ya estaba, no para crear credenciales. Crear
     una contraseña es justamente el momento en que alguien se queda con una identidad de forma
     permanente (Z4): ahí la barrera tiene que seguir. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint(S5_YA, S5_CODIGO);
  const sinCodigo = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        pass:'ClaveDeAna2026', dispositivoId:'d' }).getContent());
  PRUEBAS.falso(sinCodigo.ok, '⚠️ sin el código no se crea la credencial, aunque ya estuviera registrada');
  const conCodigo = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-111',
                        codigo:'SILVA2026', pass:'ClaveDeAna2026', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(conCodigo.ok, 'con el código sí');
});

PRUEBAS.caso('⚠️ el código equivocado se frena, y por empresa+dispositivo', () => {
  /* "Código equivocado tres veces seguidas: mismo freno que ya existe" (caso borde del plan). El
     freno ya existía; se comprueba que la exención nueva no lo haya salteado. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = s5Endpoint([], S5_CODIGO);
  for (let i = 0; i < 6; i++) {
    api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111', persona:'Ana Suárez',
                                codigo:'MAL'+i, dispositivoId:'quemado' });
  }
  const frenado = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', codigo:'SILVA2026', dispositivoId:'quemado' }).getContent());
  PRUEBAS.igual(frenado.motivo, 'codigo_frenado', 'tras varios intentos se corta, aun con el código bueno');
  const otro = JSON.parse(api.accionRecuperarPerfil({ empresa:'Helitec', cedula:'V-111',
                        persona:'Ana Suárez', codigo:'SILVA2026', dispositivoId:'limpio' }).getContent());
  PRUEBAS.cierto(otro.ok, '⚠️ y otro dispositivo no queda castigado');
});

PRUEBAS.caso('la columna de la cédula se busca por ENCABEZADO, no por posición', () => {
  /* `Registrados Fatiga` creció por agregados y su orden de columnas ya cambió antes. Fijar un
     índice acá sería atarse a un orden que va a volver a moverse — y el síntoma sería que a los
     registrados se les empiece a pedir el código otra vez, sin que nadie toque esta función. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    // mismas columnas, OTRO orden
    'Registrados Fatiga': [['Empresa','Cedula','Fecha','Nombre'],
                           ['Helitec','V-111','2026-08-01','Ana Suárez']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo'],['Helitec','Ana Suárez','V-111','Op','Piloto']],
    'Config Empresa': [['Empresa','Clave','Valor']].concat(S5_CODIGO),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','a','b','c']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['yaEstabaRegistrado']);
  PRUEBAS.cierto(api.yaEstabaRegistrado('Helitec','V-111'),
    'con las columnas en otro orden tiene que seguir reconociéndola');
});
